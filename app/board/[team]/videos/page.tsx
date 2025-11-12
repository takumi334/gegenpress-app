// app/board/[team]/videos/page.tsx
import { notFound } from "next/navigation";
import { resolveTeamId, getTeamNameFromFD } from "@/lib/team-resolver";
import OfficialVideos from "../officialVideos"; // ← 1つ上の階層にあるコンポーネント

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

