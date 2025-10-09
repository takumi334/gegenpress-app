// app/board/[team]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTeamNameFromFD, resolveTeamId } from "@/lib/team-resolver";
import ClientHeading from "./ClientHeading";
import NewsList from "./NewsList";
import OfficialVideos from "./officialVideos";
import BoardClient from "@/board/components/BoardClient";

export default async function BoardPage({ params }: { params: { team: string } }) {
  // /board/[team] は「スラッグ or 数値」の両対応
  const resolved = resolveTeamId(params.team);
  const num = Number(params.team);
  const teamId = resolved ?? (Number.isNaN(num) ? undefined : num);

  if (teamId == null) notFound();

  // チーム名を先に取得
  const teamName = await getTeamNameFromFD(String(teamId));

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">
        <ClientHeading teamName={teamName} />
      </h1>

      {/* 掲示板クライアント */}
      <section>
        <BoardClient team={String(teamId)} initialTab="tweet" />
      </section>

      {/* 2カラム：ニュース / 公式動画 */}
      <section className="space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 左：ニュース */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">
              <Link href={`/board/${teamId}/news`} className="underline underline-offset-4">
                News
              </Link>
            </h2>
            <NewsList teamName={teamName} limit={10} />
            <div className="text-right">
              <Link href={`/board/${teamId}/news`} className="text-sm underline underline-offset-4">
                もっと見る
              </Link>
            </div>
          </div>

          {/* 右：公式動画 */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">
              <Link href={`/board/${teamId}/videos`} className="underline underline-offset-4">
                Team news / Official videos
              </Link>
            </h2>
            <OfficialVideos teamName={teamName} limit={10} />
            <div className="text-right">
              <Link href={`/board/${teamId}/videos`} className="text-sm underline underline-offset-4">
                もっと見る
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

