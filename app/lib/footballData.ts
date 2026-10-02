/**
 * 試合スレッド自動生成用の保存済みリーグ試合データ読み取り。
 * キャッシュ不足・DB障害時も外部APIにはフォールバックしない。
 */
import "server-only";
import { Prisma } from "@prisma/client";
import { ACTIVE_LEAGUES, LEAGUES } from "@/lib/leagues";
import { prisma, withPrismaRetry } from "@/lib/prisma";

/** v4 API の試合レスポンスの生型（必要な項目のみ） */
export type FootballDataMatchRaw = {
  id: number;
  utcDate: string;
  status: string;
  competition?: { id: number; code: string; name: string };
  homeTeam?: { id: number; name: string };
  awayTeam?: { id: number; name: string };
};

/** アプリ内で使いやすい形に整形した試合 */
export type MatchLite = {
  id: number;
  utcDate: string;
  status: string;
  competitionCode: string;
  competitionName: string;
  homeTeamId: number;
  homeTeamName: string;
  awayTeamId: number;
  awayTeamName: string;
};

function toMatchLite(m: FootballDataMatchRaw): MatchLite {
  return {
    id: m.id,
    utcDate: m.utcDate,
    status: m.status ?? "",
    competitionCode: m.competition?.code ?? "",
    competitionName: m.competition?.name ?? "",
    homeTeamId: m.homeTeam?.id ?? 0,
    homeTeamName: m.homeTeam?.name ?? "Home",
    awayTeamId: m.awayTeam?.id ?? 0,
    awayTeamName: m.awayTeam?.name ?? "Away",
  };
}

type SnapshotRow = {
  cache_key: string;
  payload: { source?: string; fixtures?: FootballDataMatchRaw[] } | null;
};

/**
 * 指定したUTC日付範囲（両端を含む）・有効大会の保存済み試合を返す。
 * 期限切れの正常スナップショットも利用するが、取得・更新は開始しない。
 */
export async function fetchMatchesForDateRange(params: {
  dateFrom: string; // YYYY-MM-DD
  dateTo: string;   // YYYY-MM-DD
  competitions: string[]; // 大会コードの配列 e.g. ["PL", "CL"]
}): Promise<MatchLite[]> {
  const { dateFrom, dateTo, competitions } = params;
  const from = Date.parse(`${dateFrom}T00:00:00Z`);
  const to = Date.parse(`${dateTo}T00:00:00Z`);
  if (!Number.isFinite(from) || !Number.isFinite(to) || from > to) return [];
  const keys = ACTIVE_LEAGUES
    .filter((code) => competitions.includes(code))
    .map((code) => `league_snapshot:${code}`);
  if (keys.length === 0) return [];

  try {
    const rows = await withPrismaRetry("auto match threads read league snapshots", () =>
      prisma.$queryRaw<SnapshotRow[]>(Prisma.sql`
        SELECT cache_key, payload FROM football_data_cache
        WHERE cache_kind = 'league_snapshot'
          AND cache_key IN (${Prisma.join(keys)})
      `)
    );
    const matches = new Map<number, MatchLite>();
    for (const row of rows) {
      if (!keys.includes(row.cache_key) || row.payload?.source !== "fd") continue;
      const code = row.cache_key.slice("league_snapshot:".length);
      for (const match of Array.isArray(row.payload.fixtures) ? row.payload.fixtures : []) {
        // Only football-data IDs with known teams are safe for thread creation.
        // Other providers and incomplete cached fixtures must not create team 0 posts.
        if (!match || !Number.isInteger(match.id) || match.id <= 0 ||
            !Number.isInteger(match.homeTeam?.id) || (match.homeTeam?.id ?? 0) <= 0 ||
            !Number.isInteger(match.awayTeam?.id) || (match.awayTeam?.id ?? 0) <= 0 ||
            typeof match.utcDate !== "string") continue;
        const kickoff = Date.parse(match.utcDate);
        if (!Number.isFinite(kickoff) || kickoff < from || kickoff >= to + 86_400_000) continue;
        if (match.competition?.code && match.competition.code !== code) continue;
        matches.set(match.id, {
          ...toMatchLite(match),
          competitionCode: code,
          competitionName: match.competition?.name || LEAGUES.find((league) => league.id === code)?.name || code,
        });
      }
    }
    return [...matches.values()].sort((a, b) => Date.parse(a.utcDate) - Date.parse(b.utcDate));
  } catch (e) {
    console.error("[footballData] stored matches unavailable; skipping auto generation", e);
    return [];
  }
}
