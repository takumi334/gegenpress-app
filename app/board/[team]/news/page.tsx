// app/board/[team]/news/page.tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { resolveTeamId, getTeamNameFromFD } from "@/lib/team-resolver";
import NewsList from "../NewsList";
import { getCanonicalUrl } from "@/lib/publicSiteUrl";

export async function generateMetadata({
  params,
}: {
  params: { team: string };
}): Promise<Metadata> {
  const teamId = params.team?.trim();
  return {
    title: "Club News | Gegenpress",
    alternates: {
      canonical: getCanonicalUrl(`/board/${teamId}/news`),
    },
  };
}

export default async function TeamNewsPage({ params }: { params: { team: string } }) {
  const resolved = resolveTeamId(params.team);
  const num = Number(params.team);
  const teamId = resolved ?? (Number.isNaN(num) ? undefined : num);
  if (teamId == null) notFound();

  const teamName = await getTeamNameFromFD(String(teamId));

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">{teamName} — News</h1>
      <NewsList teamName={teamName} />
    </main>
  );
}

