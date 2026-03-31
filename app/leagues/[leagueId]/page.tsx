// app/leagues/[leagueId]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { LEAGUES, type LeagueId } from "../../lib/leagues";
import { COMPETITIONS } from "../../lib/footballData.constant";
import { fdFetch } from "../../lib/fd";
import { getSiteUrl } from "../../lib/publicSiteUrl";

export const revalidate = 1800;
const LEAGUES_REVALIDATE_SECONDS = 60 * 30;

type StandingRow = {
  position?: number;
  team?: { id?: number; name?: string; crest?: string | null };
  points?: number;
  goalDifference?: number;
};

type StandingsRes = {
  competition?: { id?: number; name?: string; code?: LeagueId };
  standings?: Array<{ type?: "TOTAL"; table?: StandingRow[] }>;
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

type NewsRes = {
  items?: Array<{ title?: string; link?: string }>;
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

function isSupportedLeague(code: string): code is LeagueId {
  return LEAGUES.some((l) => l.id === code);
}

function getLeagueName(code: string): string {
  return LEAGUES.find((l) => l.id === code)?.name ?? "League";
}

async function safeFdFetch<T>(path: string): Promise<T | null> {
  try {
    return await fdFetch<T>(path, { next: { revalidate: LEAGUES_REVALIDATE_SECONDS } });
  } catch (error) {
    console.error(`[leagues] failed to fetch ${path}`, error);
    return null;
  }
}

async function safeNewsFetch(q: string): Promise<NewsRes | null> {
  try {
    const url = `${getSiteUrl()}/api/news?q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { next: { revalidate: LEAGUES_REVALIDATE_SECONDS } });
    if (!res.ok) return null;
    return (await res.json()) as NewsRes;
  } catch (error) {
    console.error("[leagues] failed to fetch news", error);
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
      next: { revalidate: LEAGUES_REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch (error) {
    console.error(`[leagues] apisports failed ${path}`, error);
    return null;
  }
}

type LeagueDataBundle = {
  standings: StandingRow[];
  fixtures: FixturesRes["matches"];
  teams: TeamsRes["teams"];
  competitionName: string;
};

async function fetchLeagueBundle(leagueCode: LeagueId, competitionId: number, leagueName: string): Promise<LeagueDataBundle> {
  const [standingsFd, fixturesFd, teamsFd] = await Promise.all([
    safeFdFetch<StandingsRes>(`/competitions/${competitionId}/standings`),
    safeFdFetch<FixturesRes>(`/competitions/${competitionId}/matches?status=SCHEDULED&limit=8`),
    safeFdFetch<TeamsRes>(`/competitions/${competitionId}/teams`),
  ]);

  const tableFd = Array.isArray(standingsFd?.standings)
    ? (standingsFd.standings.find((s) => s?.type === "TOTAL")?.table ?? [])
    : [];
  const fixturesFromFd = Array.isArray(fixturesFd?.matches) ? fixturesFd.matches : [];
  const teamsFromFd = Array.isArray(teamsFd?.teams) ? teamsFd.teams : [];
  const hasFdData = tableFd.length > 0 || fixturesFromFd.length > 0 || teamsFromFd.length > 0;
  if (hasFdData) {
    return {
      standings: tableFd,
      fixtures: fixturesFromFd,
      teams: teamsFromFd,
      competitionName: standingsFd?.competition?.name || leagueName,
    };
  }

  const apiSportsLeague = APISPORTS_LEAGUE_ID[leagueCode];
  const [standingsApi, fixturesApi, teamsApi] = await Promise.all([
    safeApiSportsFetch(`/standings?league=${apiSportsLeague}&season=${APISPORTS_SEASON}`),
    safeApiSportsFetch(`/fixtures?league=${apiSportsLeague}&season=${APISPORTS_SEASON}&next=8`),
    safeApiSportsFetch(`/teams?league=${apiSportsLeague}&season=${APISPORTS_SEASON}`),
  ]);

  const standingsResponse = Array.isArray(standingsApi?.response) ? standingsApi.response : [];
  const apiTable = Array.isArray(standingsResponse[0]?.league?.standings?.[0])
    ? standingsResponse[0].league.standings[0]
    : [];

  const table: StandingRow[] = apiTable.map((row: Record<string, unknown>) => ({
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
  const teams: TeamsRes["teams"] = teamsResponse.map((t: Record<string, unknown>) => ({
    id: Number((t?.team as Record<string, unknown> | undefined)?.id ?? 0) || undefined,
    name: String((t?.team as Record<string, unknown> | undefined)?.name ?? ""),
  }));

  return {
    standings: table,
    fixtures,
    teams,
    competitionName: String(standingsResponse[0]?.league?.name ?? leagueName),
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}): Promise<Metadata> {
  try {
    const { leagueId } = await params;
    const leagueCode = (leagueId ?? "").toUpperCase();
    const leagueName = getLeagueName(leagueCode);

    return {
      title: `${leagueName} | Gegenpress`,
      description: `Standings, fixtures, teams and related news for ${leagueName}.`,
      alternates: {
        canonical: `${getSiteUrl()}/leagues/${leagueCode || "PL"}`,
      },
    };
  } catch {
    return {
      title: "League data not available | Gegenpress",
      description: "League data not available.",
      alternates: {
        canonical: `${getSiteUrl()}/leagues`,
      },
    };
  }
}

export default async function LeaguePage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const leagueCode = (leagueId ?? "").toUpperCase();
  const supported = isSupportedLeague(leagueCode);
  const competitionId = supported ? COMPETITIONS[leagueCode] : undefined;
  const leagueName = supported ? getLeagueName(leagueCode) : "League";

  if (!supported || typeof competitionId !== "number") {
    return (
      <main className="p-6 space-y-4">
        <h1 className="text-3xl font-bold">League data not available</h1>
        <p className="text-sm text-gray-600">
          We could not find data for this league code.
        </p>
      </main>
    );
  }

  const [bundle, newsData] = await Promise.all([
    fetchLeagueBundle(leagueCode, competitionId, leagueName),
    safeNewsFetch(leagueName),
  ]);

  const table = Array.isArray(bundle.standings) ? bundle.standings : [];
  const fixtures = Array.isArray(bundle.fixtures) ? bundle.fixtures : [];
  const teams = Array.isArray(bundle.teams) ? bundle.teams : [];
  const news = Array.isArray(newsData?.items) ? newsData.items : [];
  const title = bundle.competitionName || leagueName;

  return (
    <main className="p-6 space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-sm text-gray-600">{leagueCode}</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Standings</h2>
        {table.length === 0 ? (
          <p className="text-sm text-gray-600">League data not available.</p>
        ) : (
          <table className="min-w-full border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 w-10 text-right">#</th>
                <th className="p-2 text-left">Team</th>
                <th className="p-2 w-16 text-right">Pts</th>
                <th className="p-2 w-16 text-right">GD</th>
              </tr>
            </thead>
            <tbody>
              {table
                .filter((row) => row?.team?.id && row?.team?.name)
                .map((row) => (
                  <tr key={row.team!.id} className="border-t">
                    <td className="p-2 text-right">{row.position ?? "-"}</td>
                    <td className="p-2">
                      <Link
                        className="text-blue-600 underline hover:opacity-80"
                        href={`/board/${row.team!.id}`}
                      >
                        {row.team!.name}
                      </Link>
                    </td>
                    <td className="p-2 text-right">{row.points ?? "-"}</td>
                    <td className="p-2 text-right">{row.goalDifference ?? "-"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Fixtures</h2>
        {fixtures.length === 0 ? (
          <p className="text-sm text-gray-600">No fixtures available.</p>
        ) : (
          <ul className="divide-y rounded border">
            {fixtures
              .filter((m) => m?.homeTeam?.name && m?.awayTeam?.name)
              .map((match) => (
                <li key={match.id ?? `${match.homeTeam?.name}-${match.awayTeam?.name}`} className="p-3 text-sm">
                  <div className="font-medium">
                    {match.homeTeam?.name} vs {match.awayTeam?.name}
                  </div>
                  <div className="text-gray-600">
                    {match.utcDate ? new Date(match.utcDate).toLocaleString() : "TBD"} /{" "}
                    {match.status ?? "SCHEDULED"}
                  </div>
                </li>
              ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Teams</h2>
        {teams.length === 0 ? (
          <p className="text-sm text-gray-600">No teams available.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {teams
              .filter((team) => team?.id && team?.name)
              .map((team) => (
                <li key={team.id} className="rounded border p-3">
                  <Link className="text-blue-600 underline hover:opacity-80" href={`/board/${team.id}`}>
                    {team.name}
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">News</h2>
        {news.length === 0 ? (
          <p className="text-sm text-gray-600">No news available.</p>
        ) : (
          <ul className="divide-y rounded border">
            {news
              .filter((item) => item?.title && item?.link)
              .map((item) => (
                <li key={`${item.title}-${item.link}`} className="p-3">
                  <a className="text-blue-600 underline hover:opacity-80" href={item.link} target="_blank" rel="noreferrer">
                    {item.title}
                  </a>
                </li>
              ))}
          </ul>
        )}
      </section>
    </main>
  );
}


