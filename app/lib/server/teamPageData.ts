import { fdFetch } from "@/lib/fd";
import { getDbCacheState, setDbCache } from "@/lib/server/footballDataDbCache";

type TeamInfo = {
  id: number;
  name?: string;
  crest?: string;
  activeCompetitions?: Array<{ id?: number }>;
  squad?: Array<{
    id: number;
    name: string;
    position: string | null;
    nationality: string | null;
  }>;
};

type MatchInfo = {
  competition?: { id?: number };
};

type StandingRow = {
  position: number;
  team: { id: number; name: string };
  playedGames: number;
  points: number;
  goalDifference: number;
  won: number;
  goalsFor: number;
  goalsAgainst: number;
};

type StandingsPayload = {
  standings?: Array<{
    type?: string;
    table?: StandingRow[];
  }>;
};

export type TeamPageData = {
  team: TeamInfo | null;
  standings: StandingRow[];
  recentMatches: MatchInfo[];
};

export async function getTeamPageData(teamId: number): Promise<TeamPageData> {
  if (!Number.isFinite(teamId) || teamId <= 0) {
    return { team: null, standings: [], recentMatches: [] };
  }

  const cacheKey = `team_page:${teamId}`;
  const cached = await getDbCacheState<TeamPageData>(cacheKey).catch(() => null);
  if (cached?.isFresh) {
    return cached.payload;
  }

  const [team, matchesRes] = await Promise.all([
    fdFetch<TeamInfo>(`/teams/${teamId}`).catch(() => null),
    fdFetch<{ matches?: MatchInfo[] }>(
      `/teams/${teamId}/matches?status=FINISHED&limit=5`,
    ).catch(() => ({ matches: [] })),
  ]);

  const recentMatches = Array.isArray(matchesRes?.matches) ? matchesRes.matches : [];
  const competitionId =
    recentMatches[0]?.competition?.id ??
    team?.activeCompetitions?.[0]?.id;

  let standings: StandingRow[] = [];
  if (competitionId) {
    const standingsRes = await fdFetch<StandingsPayload>(
      `/competitions/${competitionId}/standings`,
    ).catch(() => null);
    const totalTable =
      standingsRes?.standings?.find((s) => s?.type === "TOTAL")?.table ??
      standingsRes?.standings?.[0]?.table ??
      [];
    standings = Array.isArray(totalTable) ? totalTable : [];
  }

  const payload = { team, standings, recentMatches };
  const hasUsableTeam = Boolean(payload.team?.id);
  if (hasUsableTeam) {
    await setDbCache(cacheKey, "team_page", payload, 60 * 30).catch(() => undefined);
    return payload;
  }
  if (cached) return cached.payload;
  return payload;
}
