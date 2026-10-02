import "server-only";

import { ACTIVE_LEAGUES } from "@/lib/leagues";
import { prisma, withPrismaRetry } from "@/lib/prisma";
import type { TeamPredictPayload } from "@/lib/predictFixtureCompute";

type CachedTeam = {
  id?: number;
  name?: string;
  crest?: string | null;
};

type CachedScore = {
  winner?: string | null;
  fullTime?: { home?: number | null; away?: number | null };
};

export type CachedMatch = {
  id?: number;
  utcDate?: string;
  venue?: string | null;
  status?: string;
  homeTeam?: CachedTeam;
  awayTeam?: CachedTeam;
  score?: CachedScore;
};

type CachedStanding = {
  team?: CachedTeam;
  playedGames?: number;
  goalsFor?: number;
  goalsAgainst?: number;
};

export type LeagueSnapshot = {
  standings?: CachedStanding[];
  fixtures?: CachedMatch[];
  source?: string;
  fetchedAt?: number;
};

type TeamPageCache = {
  recentMatches?: CachedMatch[];
};

type TeamPageSnapshotRow = {
  cache_key: string;
  payload: TeamPageCache;
};

type SnapshotRow = {
  cache_key: string;
  payload: LeagueSnapshot;
  fetched_at: Date;
  expires_at: Date;
};

type SplitStats = {
  H_for: number;
  H_ag: number;
  A_for: number;
  A_ag: number;
};

const PRIOR = { for: 1.45, ag: 1.45, weight: 5 };

async function readLeagueSnapshots(): Promise<SnapshotRow[]> {
  try {
    const rows = await withPrismaRetry("cached prediction league snapshots", () =>
      prisma.$queryRaw<SnapshotRow[]>`
        SELECT cache_key, payload, fetched_at, expires_at
        FROM football_data_cache
        WHERE cache_kind = 'league_snapshot'
        ORDER BY fetched_at DESC
      `
    );
    const activeKeys = new Set(ACTIVE_LEAGUES.map((code) => `league_snapshot:${code}`));
    return rows.filter((row) => activeKeys.has(row.cache_key));
  } catch (error) {
    console.warn("[cachedPrediction] league cache read failed", error);
    return [];
  }
}

function isTeam(match: CachedMatch, teamId: number): boolean {
  return match.homeTeam?.id === teamId || match.awayTeam?.id === teamId;
}

function isUpcoming(match: CachedMatch, now: number): boolean {
  const kickoff = match.utcDate ? new Date(match.utcDate).getTime() : Number.NaN;
  return (
    Number.isFinite(kickoff) &&
    kickoff > now &&
    match.status !== "FINISHED" &&
    match.status !== "CANCELLED"
  );
}

function findSnapshotAndFixture(
  rows: SnapshotRow[],
  teamId: number
): { snapshot: LeagueSnapshot; fixture: CachedMatch } | null {
  const now = Date.now();
  const candidates = rows.flatMap(({ payload }) =>
    (Array.isArray(payload.fixtures) ? payload.fixtures : [])
      .filter((match) => isTeam(match, teamId) && isUpcoming(match, now))
      .map((fixture) => ({ snapshot: payload, fixture }))
  );
  candidates.sort(
    (a, b) =>
      new Date(a.fixture.utcDate ?? 0).getTime() -
      new Date(b.fixture.utcDate ?? 0).getTime()
  );
  return candidates[0] ?? null;
}

function expWeight(daysAgo: number, halfLifeDays = 120): number {
  return Math.exp((-Math.log(2) * daysAgo) / halfLifeDays);
}

function weightedStatsFromMatches(
  teamId: number,
  matches: CachedMatch[],
  now: number,
): SplitStats | null {
  const acc = {
    H: { for: 0, ag: 0, w: 0 },
    A: { for: 0, ag: 0, w: 0 },
  };
  for (const match of matches) {
    if (match.status !== "FINISHED" || !isTeam(match, teamId)) continue;
    const home = match.score?.fullTime?.home;
    const away = match.score?.fullTime?.away;
    if (typeof home !== "number" || typeof away !== "number") continue;
    const kickoff = match.utcDate ? new Date(match.utcDate).getTime() : now;
    const weight = expWeight(Math.max(0, (now - kickoff) / 86_400_000));
    const atHome = match.homeTeam?.id === teamId;
    const bucket = atHome ? acc.H : acc.A;
    bucket.for += weight * (atHome ? home : away);
    bucket.ag += weight * (atHome ? away : home);
    bucket.w += weight;
  }

  if (acc.H.w + acc.A.w === 0) return null;
  return {
    H_for: (acc.H.for + PRIOR.weight * PRIOR.for) / (acc.H.w + PRIOR.weight),
    H_ag: (acc.H.ag + PRIOR.weight * PRIOR.ag) / (acc.H.w + PRIOR.weight),
    A_for: (acc.A.for + PRIOR.weight * PRIOR.for) / (acc.A.w + PRIOR.weight),
    A_ag: (acc.A.ag + PRIOR.weight * PRIOR.ag) / (acc.A.w + PRIOR.weight),
  };
}

function statsFromStanding(row: CachedStanding | undefined): SplitStats {
  const played = Math.max(0, Number(row?.playedGames ?? 0));
  const goalsFor = Math.max(0, Number(row?.goalsFor ?? 0));
  const goalsAgainst = Math.max(0, Number(row?.goalsAgainst ?? 0));
  const forRate = (goalsFor + PRIOR.weight * PRIOR.for) / (played + PRIOR.weight);
  const againstRate =
    (goalsAgainst + PRIOR.weight * PRIOR.ag) / (played + PRIOR.weight);
  return { H_for: forRate, H_ag: againstRate, A_for: forRate, A_ag: againstRate };
}

function poissonP(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let probability = Math.exp(-lambda);
  for (let i = 1; i <= k; i += 1) probability *= lambda / i;
  return probability;
}

function summarize(homeXg: number, awayXg: number, maxGoals = 6) {
  let home = 0;
  let draw = 0;
  let away = 0;
  const scores: Array<{ h: number; a: number; p: number }> = [];

  for (let h = 0; h <= maxGoals; h += 1) {
    for (let a = 0; a <= maxGoals; a += 1) {
      const p = poissonP(h, homeXg) * poissonP(a, awayXg);
      if (h > a) home += p;
      else if (h === a) draw += p;
      else away += p;
      scores.push({ h, a, p });
    }
  }
  scores.sort((left, right) => right.p - left.p);
  return { winProb: { home, draw, away }, topScores: scores.slice(0, 10) };
}

function leagueAverage(table: CachedStanding[]): number {
  const totalGoals = table.reduce((sum, row) => sum + Number(row.goalsFor ?? 0), 0);
  const totalGames = table.reduce((sum, row) => sum + Number(row.playedGames ?? 0), 0);
  return totalGames > 0 ? totalGoals / totalGames : 1.45;
}

async function readTeamPageMatches(
  teamIds: Set<number>,
): Promise<Map<number, CachedMatch[]>> {
  const matchesByTeam = new Map<number, CachedMatch[]>();
  if (teamIds.size === 0) return matchesByTeam;

  try {
    const rows = await withPrismaRetry("cached prediction team page snapshots", () =>
      prisma.$queryRaw<TeamPageSnapshotRow[]>`
        SELECT cache_key, payload
        FROM football_data_cache
        WHERE cache_kind = 'team_page'
      `
    );
    for (const row of rows) {
      const match = /^team_page:(\d+)$/.exec(row.cache_key);
      const teamId = match ? Number(match[1]) : 0;
      if (!teamIds.has(teamId)) continue;
      matchesByTeam.set(
        teamId,
        Array.isArray(row.payload?.recentMatches) ? row.payload.recentMatches : [],
      );
    }
  } catch (error) {
    console.warn("[cachedPrediction] team page cache read failed", error);
  }
  return matchesByTeam;
}

export function calculatePredictionFromStoredFixture(
  snapshot: LeagueSnapshot,
  fixture: CachedMatch,
  matchesByTeam: Map<number, CachedMatch[]>,
): TeamPredictPayload | null {
  const homeId = Number(fixture.homeTeam?.id ?? 0);
  const awayId = Number(fixture.awayTeam?.id ?? 0);
  if (!homeId || !awayId) return null;

  const table = Array.isArray(snapshot.standings) ? snapshot.standings : [];
  const homeRow = table.find((row) => row.team?.id === homeId);
  const awayRow = table.find((row) => row.team?.id === awayId);
  const referenceTime =
    typeof snapshot.fetchedAt === "number" && Number.isFinite(snapshot.fetchedAt)
      ? snapshot.fetchedAt
      : Date.now();
  const homeStats =
    weightedStatsFromMatches(homeId, matchesByTeam.get(homeId) ?? [], referenceTime) ??
    statsFromStanding(homeRow);
  const awayStats =
    weightedStatsFromMatches(awayId, matchesByTeam.get(awayId) ?? [], referenceTime) ??
    statsFromStanding(awayRow);
  const average = leagueAverage(table);
  const homeXg = (homeStats.H_for * awayStats.A_ag * 1.1) / average;
  const awayXg = (awayStats.A_for * homeStats.H_ag) / average;
  const summary = summarize(homeXg, awayXg);

  return {
    fixture: {
      id: fixture.id ?? null,
      utcDate: fixture.utcDate ?? null,
      venue: fixture.venue ?? null,
      status: fixture.status ?? null,
      teams: {
        home: {
          id: homeId,
          name: fixture.homeTeam?.name ?? null,
          logo: fixture.homeTeam?.crest ?? null,
        },
        away: {
          id: awayId,
          name: fixture.awayTeam?.name ?? null,
          logo: fixture.awayTeam?.crest ?? null,
        },
      },
    },
    xg: { home: homeXg, away: awayXg },
    winProb: summary.winProb,
    topScores: summary.topScores,
  };
}

export async function buildPredictionFromStoredData(
  teamId: number
): Promise<TeamPredictPayload | null> {
  const rows = await readLeagueSnapshots();
  const selected = findSnapshotAndFixture(rows, teamId);
  if (!selected) return null;

  const { snapshot, fixture } = selected;
  const homeId = Number(fixture.homeTeam?.id ?? 0);
  const awayId = Number(fixture.awayTeam?.id ?? 0);
  if (!homeId || !awayId) return null;
  const matchesByTeam = await readTeamPageMatches(new Set([homeId, awayId]));
  return calculatePredictionFromStoredFixture(snapshot, fixture, matchesByTeam);
}
