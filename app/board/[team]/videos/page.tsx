// app/board/[team]/videos/page.tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { resolveTeamId, getTeamNameFromFD } from "@/lib/team-resolver";
import OfficialVideos from "../officialVideos"; // ← 1つ上の階層にあるコンポーネント
import { getCanonicalUrl } from "@/lib/publicSiteUrl";

export async function generateMetadata({
  params,
}: {
  params: { team: string };
}): Promise<Metadata> {
  const teamId = params.team?.trim();
  return {
    title: "Official Videos | Gegenpress",
    alternates: {
      canonical: getCanonicalUrl(`/board/${teamId}/videos`),
    },
  };
}

export default async function TeamVideosPage({ params }: { params: { team: string } }) {
  const resolved = resolveTeamId(params.team);
  const num = Number(params.team);
  const teamId = resolved ?? (Number.isNaN(num) ? undefined : num);
  if (teamId == null) notFound();

  const teamName = await getTeamNameFromFD(String(teamId));

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">{teamName} — Official videos</h1>
      {/* 全件表示。トップだけ絞るなら props limit を渡す */}
      <OfficialVideos teamName={teamName} />
    </main>
  );
}

