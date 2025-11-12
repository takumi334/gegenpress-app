// app/board/[team]/page.tsx
import { notFound } from "next/navigation";
import { unwrapParams } from "@/lib/next-compat";

import BoardClient from "@board/components/BoardClient";
import PredictBox from "@board/components/PredictBox";

// ★ここを相対インポートに変更
import NewsList from "./NewsList";
import OfficialVideos from "./officialVideos";

import { getTeamNameFromFD } from "@lib/team-resolver";
import NewThreadForm from "@board/components/NewThreadForm";
import ThreadList    from "@board/components/ThreadList";

export default async function TeamBoardPage({
  params,
}: {
  params: { team: string } | Promise<{ team: string }>;
}) {
  // 14/15 両対応
  const { team } = await (params instanceof Promise ? params : Promise.resolve(params));
  const teamId = team.trim();

  // 数字だけ許可（/board/57）
  if (!/^\d+$/.test(teamId)) notFound();

  const teamName =
    (await getTeamNameFromFD(teamId).catch(() => null)) ?? `Team ${teamId}`;

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">{teamName} 掲示板</h1>

      <section className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] gap-6">
        <div className="space-y-6">
          <NewThreadForm teamId={teamId} />
          <ThreadList teamId={teamId} />
        </div>

        <aside className="md:sticky md:top-4 h-fit">
          <PredictBox teamId={teamId} />
        </aside>
      </section>
    </main>
  );
}



