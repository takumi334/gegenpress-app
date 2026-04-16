/**
 * 試合予想の DB キャッシュ + 期限切れ時の stale 返却 / バックグラウンド更新。
 * Hobby でも cron 不要（読み取り時に期限切れなら非同期で 1 回だけ再取得を試みる）。
 */
import "server-only";

import { prisma, withPrismaRetry } from "@/lib/prisma";
import {
  computeTeamPredict,
  fetchNextFixtureForTeam,
  type FixtureInput,
  type TeamPredictPayload,
} from "@/lib/predictFixtureCompute";
import { ensureScheduledPostsForNextFixture } from "@/lib/server/scheduler";

/** デフォルト 24 時間。無料枠の日次上限を考慮し長めに。環境変数で上書き可。 */
const TTL_MS =
  Math.max(1, Number(process.env.PREDICT_CACHE_TTL_HOURS ?? 24)) * 3600 * 1000;

/** 「次の試合なし」キャッシュは短め（キックオフ前に試合が付く可能性） */
const EMPTY_TTL_MS = Math.max(
  1,
  Number(process.env.PREDICT_CACHE_EMPTY_TTL_HOURS ?? 3)
) * 3600 * 1000;

function cacheId(teamId: string) {
  return `team:${teamId}`;
}

async function persistOk(
  teamId: string,
  payload: TeamPredictPayload,
  fetchedAt: Date,
  expiresAt: Date
) {
  const id = cacheId(teamId);
  const matchId =
    typeof payload.fixture?.id === "number" ? payload.fixture.id : null;
  await withPrismaRetry("PredictionCache.upsert OK", () =>
    prisma.predictionCache.upsert({
      where: { id },
      create: {
        id,
        teamId: Number(teamId),
        matchId,
        homeTeamId: null,
        awayTeamId: null,
        payload: payload as object,
        fetchedAt,
        expiresAt,
        status: "OK",
        errorNote: null,
      },
      update: {
        teamId: Number(teamId),
        matchId,
        payload: payload as object,
        fetchedAt,
        expiresAt,
        status: "OK",
        errorNote: null,
      },
    })
  );
}

async function persistEmpty(teamId: string, message: string) {
  const id = cacheId(teamId);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + EMPTY_TTL_MS);
  const payload = { message };
  await withPrismaRetry("PredictionCache.upsert EMPTY", () =>
    prisma.predictionCache.upsert({
      where: { id },
      create: {
        id,
        teamId: Number(teamId),
        matchId: null,
        homeTeamId: null,
        awayTeamId: null,
        payload: payload as object,
        fetchedAt: now,
        expiresAt,
        status: "EMPTY",
        errorNote: null,
      },
      update: {
        payload: payload as object,
        fetchedAt: now,
        expiresAt,
        status: "EMPTY",
        errorNote: null,
      },
    })
  );
}

/** 非同期再計算（レスポンス返却後に実行。サーバレスでは完了しない場合あり） */
export function schedulePredictionRefresh(teamId: string): void {
  void (async () => {
    try {
      await refreshPredictionFromFd(teamId);
    } catch (e) {
      console.warn("[predictCache] background refresh failed", teamId, e);
    }
  })();
}

async function refreshPredictionFromFd(teamId: string): Promise<void> {
  const fixture = await fetchNextFixtureForTeam(teamId);
  const result = await computeTeamPredict(teamId, fixture);
  const now = new Date();

  if (result.kind === "ok") {
    const expiresAt = new Date(now.getTime() + TTL_MS);
    await persistOk(teamId, result.payload, now, expiresAt);
    try {
      const f = result.payload.fixture;
      await ensureScheduledPostsForNextFixture(Number(teamId), {
        fixtureId: f?.id ?? null,
        utcDate: f?.utcDate ?? "",
        homeName: f?.teams?.home?.name ?? "Home",
        awayName: f?.teams?.away?.name ?? "Away",
      });
    } catch (e) {
      console.error("[predictCache] ensureScheduledPostsForNextFixture", e);
    }
    return;
  }

  if (result.kind === "no_fixture") {
    await persistEmpty(teamId, result.payload.message);
  }
}

export type PredictJsonResponse = Record<string, unknown>;

/**
 * キャッシュ優先で予想 JSON を組み立てる（ルート・SSR・cron から利用）。
 */
export async function getPredictJsonForTeam(
  teamId: string,
  fixtureFromCaller?: FixtureInput | null
): Promise<{ json: PredictJsonResponse; status: number }> {
  const id = cacheId(teamId);
  const now = new Date();

  let row: Awaited<ReturnType<typeof prisma.predictionCache.findUnique>> = null;
  try {
    row = await withPrismaRetry("PredictionCache.findUnique", () =>
      prisma.predictionCache.findUnique({ where: { id } })
    );
  } catch (e) {
    console.warn("[predictCache] DB read failed, will try live compute", e);
  }

  const freshEnough = row && row.expiresAt > now;

  if (freshEnough && row!.status === "OK") {
    const p = row!.payload as Record<string, unknown>;
    return {
      json: {
        ...p,
        meta: {
          source: "cache",
          fetchedAt: row!.fetchedAt.toISOString(),
          expiresAt: row!.expiresAt.toISOString(),
        },
      },
      status: 200,
    };
  }

  if (freshEnough && row!.status === "EMPTY") {
    const p = row!.payload as Record<string, unknown>;
    return {
      json: {
        ...p,
        meta: {
          source: "cache",
          fetchedAt: row!.fetchedAt.toISOString(),
          expiresAt: row!.expiresAt.toISOString(),
        },
      },
      status: 200,
    };
  }

  const staleOk =
    row && row.status === "OK" && row.payload != null
      ? (row.payload as Record<string, unknown>)
      : null;

  const staleEmpty =
    row && row.status === "EMPTY" && row.payload != null
      ? (row.payload as Record<string, unknown>)
      : null;

  if (staleOk) {
    schedulePredictionRefresh(teamId);
    return {
      json: {
        ...staleOk,
        meta: {
          source: "stale",
          fetchedAt: row!.fetchedAt.toISOString(),
          expiresAt: row!.expiresAt.toISOString(),
        },
      },
      status: 200,
    };
  }

  if (staleEmpty) {
    schedulePredictionRefresh(teamId);
    return {
      json: {
        ...staleEmpty,
        meta: {
          source: "stale",
          fetchedAt: row!.fetchedAt.toISOString(),
          expiresAt: row!.expiresAt.toISOString(),
        },
      },
      status: 200,
    };
  }

  const fixture = fixtureFromCaller === undefined
    ? await fetchNextFixtureForTeam(teamId)
    : fixtureFromCaller;
  const live = await computeTeamPredict(teamId, fixture);

  if (live.kind === "ok") {
    const expiresAt = new Date(now.getTime() + TTL_MS);
    await persistOk(teamId, live.payload, now, expiresAt).catch((e) =>
      console.warn("[predictCache] persistOk failed", e)
    );
    try {
      const f = live.payload.fixture;
      await ensureScheduledPostsForNextFixture(Number(teamId), {
        fixtureId: f?.id ?? null,
        utcDate: f?.utcDate ?? "",
        homeName: f?.teams?.home?.name ?? "Home",
        awayName: f?.teams?.away?.name ?? "Away",
      });
    } catch (e) {
      console.error("[predictCache] ensureScheduledPostsForNextFixture", e);
    }
    return {
      json: {
        ...live.payload,
        meta: {
          source: "fresh",
          fetchedAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
        },
      },
      status: 200,
    };
  }

  if (live.kind === "no_fixture") {
    await persistEmpty(teamId, live.payload.message).catch((e) =>
      console.warn("[predictCache] persistEmpty failed", e)
    );
    return {
      json: {
        ...live.payload,
        meta: { source: "fresh", fetchedAt: now.toISOString() },
      },
      status: 200,
    };
  }

  if (live.rateLimited) {
    return {
      json: {
        message:
          "直近のデータを取得できませんでした（API 制限）。しばらくしてから「予想」タブを開き直してください。",
        meta: { source: "preparing", reason: "rate_limited" },
      },
      status: 200,
    };
  }

  return {
    json: {
      message: "データ準備中です。しばらくしてから再度お試しください。",
      meta: { source: "preparing", error: live.message },
    },
    status: 200,
  };
}
