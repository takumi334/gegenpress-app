import "server-only";

import { fdFetch } from "@/lib/fd";
import { getSiteUrl } from "@/lib/publicSiteUrl";
import { ACTIVE_LEAGUES, LEAGUES, type LeagueId } from "@/lib/leagues";
import { COMPETITIONS } from "@/lib/footballData.constant";

type StandingRow = {
  position?: number;
  team?: { id?: number; name?: string; crest?: string | null };
  points?: number;
  goalDifference?: number;
};

type FixturesRes = {
  matches?: Array<{
    id?: number;
    utcDate?: string;
    homeTeam?: { name?: string };
    awayTeam?: { name?: string };
    status?: string;
  }>;
};

type StandingsRes = {
  competition?: { id?: number; name?: string };
  standings?: Array<{ type?: "TOTAL"; table?: StandingRow[] }>;
};

type NewsRes = {
  items?: Array<{ title?: string; link?: string }>;
};

export type LeagueSnapshot = {
  standings: StandingRow[];
  fixtures: FixturesRes["matches"];
  news: NewsRes["items"];
  competitionName: string;
  fetchedAt: number;
  source: "fd" | "apisports" | "empty";
};

const ACTIVE_LEAGUE_SET = new Set<LeagueId>(ACTIVE_LEAGUES);

const APISPORTS_SEASON = "2024";
const APISPORTS_LEAGUE_ID: Record<LeagueId, string> = {
  PL: "39",
  PD: "140",
  SA: "135",
  BL1: "78",
  FL1: "61",
  DED: "88",
  PPL: "94",
};

const TTL_MS = 24 * 60 * 60 * 1000;

const snapshotCache = new Map<LeagueId, LeagueSnapshot>();
const inflight = new Map<LeagueId, Promise<void>>();

function leagueName(code: LeagueId): string {
  return LEAGUES.find((l) => l.id === code)?.name ?? code;
}

function hasAnyLeagueData(
  standings: StandingRow[],
  fixtures: FixturesRes["matches"]
): boolean {
  return standings.length > 0 || (fixtures?.length ?? 0) > 0;
}

function snapshotHasData(snapshot: LeagueSnapshot | undefined): boolean {
  if (!snapshot) return false;
  return hasAnyLeagueData(snapshot.standings, snapshot.fixtures);
}

async function safeFdFetch<T>(path: string): Promise<T | null> {
  try {
    return await fdFetch<T>(path, { cache: "no-store" });
  } catch {
    return null;
  }
}

async function safeApiSportsFetch(path: string): Promise<Record<string, unknown> | null> {
  const host = process.env.APISPORTS_HOST ?? "";
  const key = process.env.APISPORTS_KEY ?? "";
  if (!host || !key) return null;
  try {
    const res = await fetch(`https://${host}${path}`, {
      headers: { "x-apisports-key": key },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function safeNewsFetch(q: string): Promise<NewsRes["items"]> {
  try {
    const url = `${getSiteUrl()}/api/news?q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const json = (await res.json()) as NewsRes;
    return Array.isArray(json?.items) ? json.items : [];
  } catch {
    return [];
  }
}

async function fetchOneLeague(code: LeagueId): Promise<LeagueSnapshot> {
  const competitionId = COMPETITIONS[code];
  const name = leagueName(code);

  if (!ACTIVE_LEAGUE_SET.has(code)) {
    const snapshot: LeagueSnapshot = {
      standings: [],
      fixtures: [],
      news: [],
      competitionName: name,
      fetchedAt: Date.now(),
      source: "empty",
    };
    if (process.env.NODE_ENV !== "production") {
      console.log({ league: code, standings: 0, fixtures: 0, teams: 0 });
    }
    return snapshot;
  }

  const [standingsFd, fixturesFd, news] = await Promise.all([
    safeFdFetch<StandingsRes>(`/competitions/${competitionId}/standings`),
    safeFdFetch<FixturesRes>(`/competitions/${competitionId}/matches?status=SCHEDULED&limit=8`),
    safeNewsFetch(name),
  ]);

  const tableFd = Array.isArray(standingsFd?.standings)
    ? (standingsFd.standings.find((s) => s?.type === "TOTAL")?.table ?? [])
    : [];
  const fixturesFromFd = Array.isArray(fixturesFd?.matches) ? fixturesFd.matches : [];

  if (process.env.NODE_ENV !== "production") {
    console.log(`[leagueSnapshot][${code}] raw fd`, {
      competitionName: standingsFd?.competition?.name ?? null,
      standingsCount: tableFd.length,
      fixturesCount: fixturesFromFd.length,
    });
  }

  if (hasAnyLeagueData(tableFd, fixturesFromFd)) {
    const snapshot: LeagueSnapshot = {
      standings: tableFd,
      fixtures: fixturesFromFd,
      news,
      competitionName: standingsFd?.competition?.name || name,
      fetchedAt: Date.now(),
      source: "fd",
    };
    if (process.env.NODE_ENV !== "production") {
      console.log({
        league: code,
        standings: snapshot.standings.length,
        fixtures: snapshot.fixtures?.length ?? 0,
        teams: 0,
      });
      console.log(`[leagueSnapshot][${code}] normalized`, {
        source: snapshot.source,
        competitionName: snapshot.competitionName,
        standingsCount: snapshot.standings.length,
        fixturesCount: snapshot.fixtures?.length ?? 0,
        teamsCount: 0,
      });
    }
    return snapshot;
  }

  const apiLeague = APISPORTS_LEAGUE_ID[code];
  const [standingsApi, fixturesApi] = await Promise.all([
    safeApiSportsFetch(`/standings?league=${apiLeague}&season=${APISPORTS_SEASON}`),
    safeApiSportsFetch(`/fixtures?league=${apiLeague}&season=${APISPORTS_SEASON}&next=8`),
  ]);

  const standingsResponse = Array.isArray(standingsApi?.response) ? standingsApi.response : [];
  const apiTable = Array.isArray(standingsResponse[0]?.league?.standings?.[0])
    ? standingsResponse[0].league.standings[0]
    : [];
  const standings: StandingRow[] = apiTable.map((row: Record<string, unknown>) => ({
    position: Number(row?.rank ?? 0) || undefined,
    team: {
      id: Number((row?.team as Record<string, unknown> | undefined)?.id ?? 0) || undefined,
      name: String((row?.team as Record<string, unknown> | undefined)?.name ?? ""),
      crest: null,
    },
    points: Number(row?.points ?? 0) || undefined,
    goalDifference: Number(row?.goalsDiff ?? 0) || undefined,
  }));

  const fixturesResponse = Array.isArray(fixturesApi?.response) ? fixturesApi.response : [];
  const fixtures: FixturesRes["matches"] = fixturesResponse.map((m: Record<string, unknown>) => ({
    id: Number((m?.fixture as Record<string, unknown> | undefined)?.id ?? 0) || undefined,
    utcDate: String((m?.fixture as Record<string, unknown> | undefined)?.date ?? ""),
    homeTeam: { name: String((m?.teams as Record<string, Record<string, unknown>> | undefined)?.home?.name ?? "") },
    awayTeam: { name: String((m?.teams as Record<string, Record<string, unknown>> | undefined)?.away?.name ?? "") },
    status: String((m?.fixture as Record<string, Record<string, unknown>> | undefined)?.status?.short ?? "SCHEDULED"),
  }));

  if (process.env.NODE_ENV !== "production") {
    console.log(`[leagueSnapshot][${code}] raw apisports`, {
      standingsCount: standings.length,
      fixturesCount: fixtures.length,
    });
  }

  if (hasAnyLeagueData(standings, fixtures)) {
    const snapshot: LeagueSnapshot = {
      standings,
      fixtures,
      news,
      competitionName: String(standingsResponse[0]?.league?.name ?? name),
      fetchedAt: Date.now(),
      source: "apisports",
    };
    if (process.env.NODE_ENV !== "production") {
      console.log({
        league: code,
        standings: snapshot.standings.length,
        fixtures: snapshot.fixtures?.length ?? 0,
        teams: 0,
      });
      console.log(`[leagueSnapshot][${code}] normalized`, {
        source: snapshot.source,
        competitionName: snapshot.competitionName,
        standingsCount: snapshot.standings.length,
        fixturesCount: snapshot.fixtures?.length ?? 0,
        teamsCount: 0,
      });
    }
    return snapshot;
  }

  const snapshot: LeagueSnapshot = {
    standings: [],
    fixtures: [],
    news,
    competitionName: name,
    fetchedAt: Date.now(),
    source: "empty",
  };
  if (process.env.NODE_ENV !== "production") {
    console.log({ league: code, standings: 0, fixtures: 0, teams: 0 });
    console.log(`[leagueSnapshot][${code}] normalized`, {
      source: snapshot.source,
      competitionName: snapshot.competitionName,
      standingsCount: 0,
      fixturesCount: 0,
      teamsCount: 0,
    });
  }
  return snapshot;
}

async function refreshLeague(code: LeagueId): Promise<void> {
  const current = snapshotCache.get(code);
  if (current && snapshotHasData(current) && Date.now() - current.fetchedAt < TTL_MS) return;
  if (inflight.has(code)) return inflight.get(code);

  const job = (async () => {
    try {
      const next = await fetchOneLeague(code);
      const hasData = hasAnyLeagueData(next.standings, next.fixtures);
      if (hasData || !current) {
        snapshotCache.set(code, next);
      }
      // 429/emptyなどでデータが取れない時は前回成功スナップショットを維持
    } finally {
      inflight.delete(code);
    }
  })();

  inflight.set(code, job);
  await job;
}

export async function getLeagueSnapshot(code: LeagueId): Promise<LeagueSnapshot> {
  const cached = snapshotCache.get(code);
  const fresh = cached && snapshotHasData(cached) && Date.now() - cached.fetchedAt < TTL_MS;
  if (fresh) return cached;

  // 既存成功キャッシュがあれば 429時 fallback として即返す
  if (cached && snapshotHasData(cached)) return cached;

  // 対象リーグのみ同期取得（他リーグ背景更新でレートを消費しない）
  await refreshLeague(code);
  return (
    snapshotCache.get(code) ?? {
      standings: [],
      fixtures: [],
      news: [],
      competitionName: leagueName(code),
      fetchedAt: Date.now(),
      source: "empty",
    }
  );
}
