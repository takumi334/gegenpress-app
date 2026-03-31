import "server-only";

import { fdFetch } from "@/lib/fd";
import { getSiteUrl } from "@/lib/publicSiteUrl";
import { LEAGUES, type LeagueId } from "@/lib/leagues";
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

type TeamsRes = {
  teams?: Array<{ id?: number; name?: string }>;
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
  teams: TeamsRes["teams"];
  news: NewsRes["items"];
  competitionName: string;
  fetchedAt: number;
  source: "fd" | "apisports" | "empty";
};

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

const LEAGUE_ORDER: LeagueId[] = ["PL", "PD", "SA", "BL1", "FL1", "DED", "PPL"];
const TTL_MS = 24 * 60 * 60 * 1000;
const STAGGER_MS = 5000;

const snapshotCache = new Map<LeagueId, LeagueSnapshot>();
const inflight = new Map<LeagueId, Promise<void>>();
let batchRefreshing = false;

function leagueName(code: LeagueId): string {
  return LEAGUES.find((l) => l.id === code)?.name ?? code;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hasAnyLeagueData(
  standings: StandingRow[],
  fixtures: FixturesRes["matches"],
  teams: TeamsRes["teams"]
): boolean {
  return standings.length > 0 || (fixtures?.length ?? 0) > 0 || (teams?.length ?? 0) > 0;
}

async function safeFdFetch<T>(path: string): Promise<T | null> {
  try {
    return await fdFetch<T>(path, { next: { revalidate: 86400 } });
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
      next: { revalidate: 86400 },
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
    const res = await fetch(url, { next: { revalidate: 1800 } });
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

  const [standingsFd, fixturesFd, teamsFd, news] = await Promise.all([
    safeFdFetch<StandingsRes>(`/competitions/${competitionId}/standings`),
    safeFdFetch<FixturesRes>(`/competitions/${competitionId}/matches?status=SCHEDULED&limit=8`),
    safeFdFetch<TeamsRes>(`/competitions/${competitionId}/teams`),
    safeNewsFetch(name),
  ]);

  const tableFd = Array.isArray(standingsFd?.standings)
    ? (standingsFd.standings.find((s) => s?.type === "TOTAL")?.table ?? [])
    : [];
  const fixturesFromFd = Array.isArray(fixturesFd?.matches) ? fixturesFd.matches : [];
  const teamsFromFd = Array.isArray(teamsFd?.teams) ? teamsFd.teams : [];

  if (hasAnyLeagueData(tableFd, fixturesFromFd, teamsFromFd)) {
    return {
      standings: tableFd,
      fixtures: fixturesFromFd,
      teams: teamsFromFd,
      news,
      competitionName: standingsFd?.competition?.name || name,
      fetchedAt: Date.now(),
      source: "fd",
    };
  }

  const apiLeague = APISPORTS_LEAGUE_ID[code];
  const [standingsApi, fixturesApi, teamsApi] = await Promise.all([
    safeApiSportsFetch(`/standings?league=${apiLeague}&season=${APISPORTS_SEASON}`),
    safeApiSportsFetch(`/fixtures?league=${apiLeague}&season=${APISPORTS_SEASON}&next=8`),
    safeApiSportsFetch(`/teams?league=${apiLeague}&season=${APISPORTS_SEASON}`),
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

  const teamsResponse = Array.isArray(teamsApi?.response) ? teamsApi.response : [];
  const teams: TeamsRes["teams"] = teamsResponse.map((t) => ({
    id: Number((t as { team?: { id?: unknown } })?.team?.id ?? 0) || undefined,
    name: String((t as { team?: { name?: unknown } })?.team?.name ?? ""),
  }));

  if (hasAnyLeagueData(standings, fixtures, teams)) {
    return {
      standings,
      fixtures,
      teams,
      news,
      competitionName: String(standingsResponse[0]?.league?.name ?? name),
      fetchedAt: Date.now(),
      source: "apisports",
    };
  }

  return {
    standings: [],
    fixtures: [],
    teams: [],
    news,
    competitionName: name,
    fetchedAt: Date.now(),
    source: "empty",
  };
}

async function refreshLeague(code: LeagueId): Promise<void> {
  const current = snapshotCache.get(code);
  if (current && Date.now() - current.fetchedAt < TTL_MS) return;
  if (inflight.has(code)) return inflight.get(code);

  const job = (async () => {
    try {
      const next = await fetchOneLeague(code);
      const hasData = hasAnyLeagueData(next.standings, next.fixtures, next.teams);
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

function startBatchRefresh(): void {
  if (batchRefreshing) return;
  batchRefreshing = true;
  void (async () => {
    try {
      for (let i = 0; i < LEAGUE_ORDER.length; i += 1) {
        const code = LEAGUE_ORDER[i];
        await refreshLeague(code);
        if (i < LEAGUE_ORDER.length - 1) {
          await sleep(STAGGER_MS);
        }
      }
    } finally {
      batchRefreshing = false;
    }
  })();
}

export async function getLeagueSnapshot(code: LeagueId): Promise<LeagueSnapshot> {
  const cached = snapshotCache.get(code);
  const fresh = cached && Date.now() - cached.fetchedAt < TTL_MS;
  if (fresh) return cached;

  // まず全体リフレッシュをバックグラウンド起動（固定順 + stagger + 同一リーグ再取得抑止）
  startBatchRefresh();

  // 既存成功キャッシュがあれば 429時 fallback として即返す
  if (cached) return cached;

  // 初回だけ対象リーグを同期取得（表示壊れ防止）
  await refreshLeague(code);
  return (
    snapshotCache.get(code) ?? {
      standings: [],
      fixtures: [],
      teams: [],
      news: [],
      competitionName: leagueName(code),
      fetchedAt: Date.now(),
      source: "empty",
    }
  );
}
