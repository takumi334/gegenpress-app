/**
 * 試合スレッド自動生成
 * - PRE_MATCH: 試合開始 60 分前
 * - LIVE_MATCH: 試合開始時
 * - POST_MATCH: 試合終了後
 *
 * cron 5 分ごとに実行。既存スレッド（matchId + threadType）があれば重複作成しない。
 */

import { prisma, withPrismaRetry } from "@/lib/prisma";
import { createThread } from "@/lib/boardApi";
import { fetchMatchesForDateRange, type MatchLite } from "@/lib/footballData";

const THREAD_TYPE = {
  PRE_MATCH: "PRE_MATCH",
  LIVE_MATCH: "LIVE_MATCH",
  POST_MATCH: "POST_MATCH",
} as const;

/** 日本時間でフォーマット */
function formatKickoffJst(utcDate: string): string {
  const d = new Date(utcDate);
  return d.toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatKickoffUtc(utcDate: string): string {
  const d = new Date(utcDate);
  return d.toISOString().replace("T", " ").slice(0, 16);
}

function buildPreMatchBody(match: MatchLite): string {
  const utcStr = formatKickoffUtc(match.utcDate);
  const jstStr = formatKickoffJst(match.utcDate);
  return `---
大会: ${match.competitionName}
開始: ${utcStr} UTC（${jstStr} JST）

対戦:
${match.homeTeamName} vs ${match.awayTeamName}

予想スタメン・試合展開予想を書き込んでください。
---`;
}

function buildPreMatchTitle(match: MatchLite): string {
  return `【試合1時間前】${match.homeTeamName} vs ${match.awayTeamName}｜予想スタメン・試合展開予想`;
}

function buildLiveMatchBody(match: MatchLite): string {
  const jstStr = formatKickoffJst(match.utcDate);
  return `---
大会: ${match.competitionName}
開始: ${jstStr} JST

対戦:
${match.homeTeamName} vs ${match.awayTeamName}

試合中のメモ・気づきを書き込んでください。
---`;
}

function buildLiveMatchTitle(match: MatchLite): string {
  return `【試合中】${match.homeTeamName} vs ${match.awayTeamName}`;
}

function buildPostMatchBody(match: MatchLite): string {
  return `---
大会: ${match.competitionName}

対戦:
${match.homeTeamName} vs ${match.awayTeamName}

試合後の感想・分析を書き込んでください。
---`;
}

function buildPostMatchTitle(match: MatchLite): string {
  return `【試合後】${match.homeTeamName} vs ${match.awayTeamName}`;
}

/** 対象大会コードを env から取得 */
export function getTargetCompetitions(): string[] {
  const raw = process.env.FOOTBALL_TARGET_COMPETITIONS ?? "";
  return raw
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
}

/** 指定試合・種別のスレッドが既に存在するか */
async function existsThread(matchId: number, threadType: string): Promise<boolean> {
  const t = await withPrismaRetry("autoCreateMatchThreads findThread", () =>
    prisma.thread.findFirst({
      where: { matchId, threadType },
      select: { id: true },
    })
  );
  if (t) return true;
  // 後方互換: 旧 AutoThreadJob で PRE_MATCH が作成済みの場合はスキップ
  if (threadType === THREAD_TYPE.PRE_MATCH) {
    const job = await withPrismaRetry("autoCreateMatchThreads findJob", () =>
      prisma.autoThreadJob.findUnique({
        where: { externalMatchId: matchId },
        select: { id: true },
      })
    );
    return job != null;
  }
  return false;
}

/**
 * 指定時刻 now を基準に、各タイミングでスレッドを自動作成する。
 * - PRE_MATCH: キックオフ 50〜65 分前（cron 5 分間隔を考慮）
 * - LIVE_MATCH: キックオフ -10〜+10 分
 * - POST_MATCH: status=FINISHED の試合
 */
export async function runAutoCreateMatchThreads(now: Date): Promise<{
  createdCount: number;
  skippedCount: number;
  failedCount: number;
  matches: Array<{
    matchId: number;
    threadType: string;
    status: "CREATED" | "SKIPPED" | "FAILED";
    threadId?: number;
  }>;
}> {
  const competitions = getTargetCompetitions();
  if (competitions.length === 0) {
    return { createdCount: 0, skippedCount: 0, failedCount: 0, matches: [] };
  }

  // 過去2時間〜未来3時間の試合を取得（POST_MATCH 用に終了試合も含む）
  const from = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const to = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const dateFrom = from.toISOString().slice(0, 10);
  const dateTo = to.toISOString().slice(0, 10);

  const allMatches = await fetchMatchesForDateRange({
    dateFrom,
    dateTo,
    competitions,
  });

  const result: Array<{
    matchId: number;
    threadType: string;
    status: "CREATED" | "SKIPPED" | "FAILED";
    threadId?: number;
  }> = [];
  let createdCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  const tryCreate = async (
    match: MatchLite,
    threadType: string,
    title: string,
    body: string
  ): Promise<boolean> => {
    const exists = await existsThread(match.id, threadType);
    if (exists) {
      result.push({ matchId: match.id, threadType, status: "SKIPPED" });
      skippedCount++;
      return false;
    }

    try {
      const thread = await withPrismaRetry("autoCreateMatchThreads createThread", () =>
        createThread(match.homeTeamId, title, body, threadType, match.id)
      );
      result.push({ matchId: match.id, threadType, status: "CREATED", threadId: thread.id });
      createdCount++;
      return true;
    } catch (e) {
      console.error("[autoCreateMatchThreads] failed", match.id, threadType, e);
      result.push({ matchId: match.id, threadType, status: "FAILED" });
      failedCount++;
      return false;
    }
  };

  for (const match of allMatches) {
    const kickoff = new Date(match.utcDate).getTime();
    const nowMs = now.getTime();
    const diffMin = (kickoff - nowMs) / (60 * 1000);

    // PRE_MATCH: 50〜65 分前
    if (diffMin >= 50 && diffMin <= 65) {
      await tryCreate(
        match,
        THREAD_TYPE.PRE_MATCH,
        buildPreMatchTitle(match),
        buildPreMatchBody(match)
      );
    }

    // LIVE_MATCH: -10〜+10 分
    if (diffMin >= -10 && diffMin <= 10) {
      await tryCreate(
        match,
        THREAD_TYPE.LIVE_MATCH,
        buildLiveMatchTitle(match),
        buildLiveMatchBody(match)
      );
    }

    // POST_MATCH: status が FINISHED
    const status = (match.status ?? "").toUpperCase();
    if (status === "FINISHED") {
      await tryCreate(
        match,
        THREAD_TYPE.POST_MATCH,
        buildPostMatchTitle(match),
        buildPostMatchBody(match)
      );
    }
  }

  return {
    createdCount,
    skippedCount,
    failedCount,
    matches: result,
  };
}
