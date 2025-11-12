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
  const data = await fdFetch<any>(`/competitions/${competitionCode}/standings`);
  const table = (data?.standings?.[0]?.table ?? []) as any[];

  return table.map((r) => ({
    team: { id: r.team.id, name: r.team.name },
    playedGames: r.playedGames,
    won: r.won,
    goalsFor: r.goalsFor,
    goalsAgainst: r.goalsAgainst,
    goalDifference: r.goalDifference,
  }));
}

// Next 15: params は Promise の可能性がある
type PageProps = { params: Promise<{ pair: string }> };

export default async function Page({ params }: PageProps) {
  const { pair } = await params;
  const [homeId, awayId] = pair.split("-vs-").map(Number);

  // 必要に応じて PL → PD/SA/BL1/FL1 などへ変更
  const standings = await fetchStandings("PL");

  return (
    <PostComposer
      init={{
        homeId,
        awayId,
        standings,
      }}
    />
  );
}

