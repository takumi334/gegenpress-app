import { getDbCacheState } from "@/lib/server/footballDataDbCache";
import { cache } from "react";

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

export type TeamPageData = {
  team: TeamInfo | null;
  standings: StandingRow[];
  recentMatches: MatchInfo[];
};

async function readTeamPageData(teamId: number): Promise<TeamPageData> {
  if (!Number.isFinite(teamId) || teamId <= 0) {
    return { team: null, standings: [], recentMatches: [] };
  }
  const cached = await getDbCacheState<TeamPageData>(`team_page:${teamId}`).catch(() => null);
  return cached?.payload ?? { team: null, standings: [], recentMatches: [] };
}

// Page rendering is cache-only. generateMetadata and the page body also share
// this React request cache, so neither path can trigger an upstream refresh.
export const getTeamPageData = cache(readTeamPageData);
