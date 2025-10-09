// app/predict/[pair]/page.tsx

import PostComposer from "../components/PostComposer";
import { fdFetch } from "@/lib/fd";

type TableRow = {
  team: { id: number; name: string };
  playedGames: number;
  won: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
};

async function fetchStandings(competitionCode: string): Promise<TableRow[]> {
  type FDTableRow = {
    team: { id: number; name: string };
    playedGames: number;
    won: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
  };

  const data = await fdFetch<any>({
    path: `/competitions/${competitionCode}/standings`,
  });

  const table: FDTableRow[] = data?.standings?.[0]?.table ?? [];
  return table.map((r) => ({
    team: { id: r.team.id, name: r.team.name },
    playedGames: r.playedGames,
    won: r.won,
    goalsFor: r.goalsFor,
    goalsAgainst: r.goalsAgainst,
    goalDifference: r.goalDifference,
  }));
}

// Next 15 で params が Promise の形に対応
type PageProps = { params: Promise<{ pair: string }> };

export default async function Page({ params }: PageProps) {
  const { pair } = await params; // ← 必ず await
  const [homeId, awayId] = pair.split("-vs-").map(Number);

  // 対象リーグは必要に応じて PL/PD/SA/BL1/FL1 などに変更
  const standings = await fetchStandings("PL");
// ...fetchStandingsの後
async function fetchH2HAvgGoals(...) { ... }

export default async function Page(...) {
  ...
  const h2h = await fetchH2HAvgGoals(homeId, awayId, 6);
  return <PostComposer init={{ homeId, awayId, standings, h2h }} />
}

  return (
    <PostComposer
      init={{
        homeId,
        awayId,
        standings, // TableRow[]
      }}
    />
  );
}

