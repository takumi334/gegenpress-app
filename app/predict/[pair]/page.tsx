// app/predict/[pair]/page.tsx
import PostComposer from "../components/PostComposer";
import type { Metadata } from "next";
import { getCanonicalUrl } from "@/lib/publicSiteUrl";
import { getTeamPageData } from "@/lib/server/teamPageData";

export const revalidate = 86400;

type TableRow = {
  team: { id: number; name: string };
  playedGames: number;
  won: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
};

// Next 15: params は Promise の可能性がある
type PageProps = { params: Promise<{ pair: string }> };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pair: string }>;
}): Promise<Metadata> {
  const { pair } = await params;
  return {
    title: "Match Prediction | Gegenpress",
    alternates: {
      canonical: getCanonicalUrl(`/predict/${pair}`),
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { pair } = await params;
  const [homeId, awayId] = pair.split("-vs-").map(Number);
  const { standings } = await getTeamPageData(homeId);
  const table: TableRow[] = standings.map((r) => ({
    team: { id: r.team.id, name: r.team.name },
    playedGames: r.playedGames,
    won: r.won,
    goalsFor: r.goalsFor,
    goalsAgainst: r.goalsAgainst,
    goalDifference: r.goalDifference,
  }));

  return (
    <PostComposer
      init={{
        homeId,
        awayId,
        standings: table,
      }}
    />
  );
}

