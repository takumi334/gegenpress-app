import "server-only";

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
const FOOTBALL_DATA_BASE = (process.env.FD_BASE ?? "https://api.football-data.org/v4").replace(/\/$/, "");
const FOOTBALL_DATA_KEY = process.env.FOOTBALL_DATA_API_KEY ?? "";
const LEAGUE_REVALIDATE_SECONDS = 5 * 60;
const FD_TIMEOUT_MS = 10_000;
const INVESTIGATION_LEAGUES = new Set<LeagueId>(["PL", "SA", "BL1"]);
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

function logLeagueFetchFailure(
  provider: "fd" | "apisports" | "news",
  leagueCode: LeagueId,
  path: string,
  detail?: string,
) {
  console.warn(`[leagueSnapshot][${leagueCode}] ${provider} fetch failed`, {
    path,
    detail: detail ?? null,
  });
}

function summarizeText(text: string, limit = 240): string {
  return text.replace(/\s+/g, " ").trim().slice(0, limit);
}

function summarizeFdPayload(path: string, payload: unknown): string {
  const data = payload as {
    competition?: { name?: string };
    standings?: Array<{ table?: unknown[] }>;
    matches?: unknown[];
    count?: number;
    message?: string;
  };
  if (path.includes("/standings")) {
    const table =
      Array.isArray(data?.standings) && Array.isArray(data.standings[0]?.table)
        ? data.standings[0]?.table?.length ?? 0
        : 0;
    return `competition=${data?.competition?.name ?? "unknown"}, table=${table}`;
  }
  if (path.includes("/matches")) {
    const matches = Array.isArray(data?.matches) ? data.matches.length : Number(data?.count ?? 0);
    return `matches=${matches}`;
  }
  if (typeof data?.message === "string") return `message=${summarizeText(data.message, 120)}`;
  return "payload=ok";
}

type FdFailureCode =
  | "NONE"
  | "MISSING_KEY"
  | "HTTP_429"
  | "HTTP_401"
  | "HTTP_403"
  | "HTTP_500"
  | "HTTP_OTHER"
  | "TIMEOUT"
  | "EMPTY_BODY"
  | "JSON_PARSE_ERROR"
  | "FETCH_EXCEPTION";

type FdDataKind = "standings" | "fixtures" | "other";

function resolveFdDataKind(path: string): FdDataKind {
  if (path.includes("/standings")) return "standings";
  if (path.includes("/matches")) return "fixtures";
  return "other";
}

function resolveHttpFailureCode(status: number): FdFailureCode {
  if (status === 429) return "HTTP_429";
  if (status === 401) return "HTTP_401";
  if (status === 403) return "HTTP_403";
  if (status >= 500) return "HTTP_500";
  return "HTTP_OTHER";
}

function logFdOutcome(params: {
  leagueCode: LeagueId;
  endpoint: string;
  dataKind: FdDataKind;
  status: number | null;
  failureCode: FdFailureCode;
  failureLayer: "api" | "app";
  responseSummary: string | null;
  errorMessage: string | null;
}) {
  const payload = {
    leagueCode: params.leagueCode,
    endpoint: params.endpoint,
    dataKind: params.dataKind,
    status: params.status,
    failureCode: params.failureCode,
    failureLayer: params.failureLayer,
    responseSummary: params.responseSummary,
    errorMessage: params.errorMessage,
  };
  if (params.failureCode === "NONE") {
    console.info("[leagueSnapshot][fd] request ok", payload);
    return;
  }
  const monitored = INVESTIGATION_LEAGUES.has(params.leagueCode);
  const level = monitored ? console.error : console.warn;
  level("[leagueSnapshot][fd] request failed", payload);
}

async function safeFdFetch<T>(leagueCode: LeagueId, path: string): Promise<T | null> {
  const endpoint = `football-data${path}`;
  const dataKind = resolveFdDataKind(path);
  if (!FOOTBALL_DATA_KEY) {
    logFdOutcome({
      leagueCode,
      endpoint,
      dataKind,
      status: null,
      failureCode: "MISSING_KEY",
      failureLayer: "app",
      responseSummary: null,
      errorMessage: "missing FOOTBALL_DATA_API_KEY",
    });
    return null;
  }

  const url = `${FOOTBALL_DATA_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FD_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "X-Auth-Token": FOOTBALL_DATA_KEY },
      next: { revalidate: LEAGUE_REVALIDATE_SECONDS, tags: [`league:${leagueCode}`] },
      signal: controller.signal,
    });
    const bodyText = await res.text().catch(() => "");
    if (!res.ok) {
      logFdOutcome({
        leagueCode,
        endpoint,
        dataKind,
        status: res.status,
        failureCode: resolveHttpFailureCode(res.status),
        failureLayer: "api",
        responseSummary: summarizeText(bodyText),
        errorMessage: `HTTP ${res.status} ${res.statusText}`,
      });
      return null;
    }

    if (!bodyText.trim()) {
      logFdOutcome({
        leagueCode,
        endpoint,
        dataKind,
        status: res.status,
        failureCode: "EMPTY_BODY",
        failureLayer: "api",
        responseSummary: "",
        errorMessage: "empty response body",
      });
      return null;
    }

    let json: T;
    try {
      json = JSON.parse(bodyText) as T;
    } catch (parseError) {
      logFdOutcome({
        leagueCode,
        endpoint,
        dataKind,
        status: res.status,
        failureCode: "JSON_PARSE_ERROR",
        failureLayer: "api",
        responseSummary: summarizeText(bodyText),
        errorMessage: parseError instanceof Error ? parseError.message : String(parseError),
      });
      return null;
    }
    logFdOutcome({
      leagueCode,
      endpoint,
      dataKind,
      status: res.status,
      failureCode: "NONE",
      failureLayer: "api",
      responseSummary: summarizeFdPayload(path, json),
      errorMessage: null,
    });
    return json;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isTimeout =
      (error instanceof DOMException && error.name === "AbortError") ||
      message.toLowerCase().includes("abort");
    logFdOutcome({
      leagueCode,
      endpoint,
      dataKind,
      status: null,
      failureCode: isTimeout ? "TIMEOUT" : "FETCH_EXCEPTION",
      failureLayer: isTimeout ? "api" : "app",
      responseSummary: null,
      errorMessage: message,
    });
    logLeagueFetchFailure("fd", leagueCode, path, message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function safeApiSportsFetch(
  leagueCode: LeagueId,
  path: string,
): Promise<Record<string, unknown> | null> {
  const host = process.env.APISPORTS_HOST ?? "";
  const key = process.env.APISPORTS_KEY ?? "";
  if (!host || !key) {
    logLeagueFetchFailure("apisports", leagueCode, path, "missing host/key");
    return null;
  }
  try {
    const res = await fetch(`https://${host}${path}`, {
      headers: { "x-apisports-key": key },
      cache: "no-store",
    });
    if (!res.ok) {
      logLeagueFetchFailure("apisports", leagueCode, path, `HTTP ${res.status}`);
      return null;
    }
    return (await res.json()) as Record<string, unknown>;
  } catch (error) {
    logLeagueFetchFailure(
      "apisports",
      leagueCode,
      path,
      error instanceof Error ? error.message : String(error),
    );
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

async function fetchOneLeague(code: LeagueId, previous?: LeagueSnapshot): Promise<LeagueSnapshot> {
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
    safeFdFetch<StandingsRes>(code, `/competitions/${competitionId}/standings`),
    safeFdFetch<FixturesRes>(code, `/competitions/${competitionId}/matches?status=SCHEDULED&limit=8`),
    safeNewsFetch(name),
  ]);

  const tableFd = Array.isArray(standingsFd?.standings)
    ? (standingsFd.standings.find((s) => s?.type === "TOTAL")?.table ?? [])
    : [];
  const fixturesFromFd = Array.isArray(fixturesFd?.matches) ? fixturesFd.matches : [];
  const mergedStandings = tableFd.length > 0 ? tableFd : previous?.standings ?? [];
  const mergedFixtures = fixturesFromFd.length > 0 ? fixturesFromFd : previous?.fixtures ?? [];
  const standingsUsedPrevious = tableFd.length === 0 && (previous?.standings?.length ?? 0) > 0;
  const fixturesUsedPrevious = fixturesFromFd.length === 0 && (previous?.fixtures?.length ?? 0) > 0;
  console.info("[leagueSnapshot][fd] merge result", {
    leagueCode: code,
    standings: {
      liveCount: tableFd.length,
      mergedCount: mergedStandings.length,
      fallbackToPrevious: standingsUsedPrevious,
    },
    fixtures: {
      liveCount: fixturesFromFd.length,
      mergedCount: mergedFixtures.length,
      fallbackToPrevious: fixturesUsedPrevious,
    },
  });

  if (process.env.NODE_ENV !== "production") {
    console.log(`[leagueSnapshot][${code}] raw fd`, {
      competitionName: standingsFd?.competition?.name ?? null,
      standingsCount: tableFd.length,
      fixturesCount: fixturesFromFd.length,
    });
  }

  if (hasAnyLeagueData(mergedStandings, mergedFixtures)) {
    const snapshot: LeagueSnapshot = {
      standings: mergedStandings,
      fixtures: mergedFixtures,
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
    safeApiSportsFetch(code, `/standings?league=${apiLeague}&season=${APISPORTS_SEASON}`),
    safeApiSportsFetch(code, `/fixtures?league=${apiLeague}&season=${APISPORTS_SEASON}&next=8`),
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

  const mergedApiStandings = standings.length > 0 ? standings : previous?.standings ?? [];
  const mergedApiFixtures = fixtures.length > 0 ? fixtures : previous?.fixtures ?? [];
  if (hasAnyLeagueData(mergedApiStandings, mergedApiFixtures)) {
    const snapshot: LeagueSnapshot = {
      standings: mergedApiStandings,
      fixtures: mergedApiFixtures,
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
    console.warn(`[leagueSnapshot][${code}] no data after all providers`, {
      fdCompetitionId: competitionId,
      apiSportsLeagueId: apiLeague,
    });
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
      const next = await fetchOneLeague(code, current);
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
  if (fresh) {
    console.info("[leagueSnapshot] return cached snapshot", {
      leagueCode: code,
      servedFromCache: true,
      cacheState: "fresh",
      source: cached.source,
      standingsCount: cached.standings.length,
      fixturesCount: cached.fixtures?.length ?? 0,
    });
    return cached;
  }

  // 既存成功キャッシュがあれば 429時 fallback として即返す
  if (cached && snapshotHasData(cached)) {
    console.info("[leagueSnapshot] return cached snapshot", {
      leagueCode: code,
      servedFromCache: true,
      cacheState: "stale_fallback",
      source: cached.source,
      standingsCount: cached.standings.length,
      fixturesCount: cached.fixtures?.length ?? 0,
    });
    return cached;
  }

  // 対象リーグのみ同期取得（他リーグ背景更新でレートを消費しない）
  await refreshLeague(code);
  const afterRefresh = snapshotCache.get(code);
  if (afterRefresh) {
    console.info("[leagueSnapshot] return refreshed snapshot", {
      leagueCode: code,
      servedFromCache: false,
      source: afterRefresh.source,
      standingsCount: afterRefresh.standings.length,
      fixturesCount: afterRefresh.fixtures?.length ?? 0,
    });
    return afterRefresh;
  }
  console.warn("[leagueSnapshot] return empty snapshot", {
    leagueCode: code,
    servedFromCache: false,
    source: "empty",
    standingsCount: 0,
    fixturesCount: 0,
  });
  return (
    afterRefresh ?? {
      standings: [],
      fixtures: [],
      news: [],
      competitionName: leagueName(code),
      fetchedAt: Date.now(),
      source: "empty",
    }
  );
}
