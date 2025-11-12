"use client";

import { useState } from "react";
import Link from "next/link";

import BoardClient from "@board/components/BoardClient";
import NextFixturePanel from "@/board/components/NextFixturePanel";
import TeamRadarComposer from "@board/components/TeamRadarComposer";
import NewsList from "../NewsList";
import OfficialVideos from "../officialVideos";

type Props = {
  teamId: number;
  teamName: string;
};

type TabKey = "predict" | "news" | "videos";

export default function TeamBoardClient({ teamId, teamName }: Props) {
  // 何も表示しない状態からスタート → ボタンを押したら各タブが表示
  const [active, setActive] = useState<TabKey | null>(null);

  return (
    <main className="p-4 md:p-6 space-y-8">
      <h1 className="text-2xl font-bold">{teamName} 掲示板</h1>

      <section>
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] gap-6 items-start">
          {/* 左：掲示板 */}
          <div className="w-full">
            <BoardClient team={String(teamId)} initialTab="tweet" />
          </div>

          {/* 右：タブ式ウィジェット */}
          <aside className="md:sticky md:top-4 h-fit">
            <div className="rounded-lg border bg-white dark:bg-zinc-900 shadow-sm">
              {/* タブヘッダ */}
              <div className="flex justify-around border-b text-sm font-medium">
                {(["predict", "news", "videos"] as TabKey[]).map((key) => (
                  <button
                    key={key}
                    className={`py-2 px-4 ${
                      active === key
                        ? "border-b-2 border-blue-500 text-blue-600"
                        : "text-gray-600"
                    }`}
                    onClick={() => setActive(key)}
                  >
                    {key === "predict" ? "予想" : key === "news" ? "News" : "Videos"}
                  </button>
                ))}
              </div>

              {/* タブ内容 */}
              <div className="p-4 space-y-6">
                {active === "predict" && (
                  <div className="space-y-4">
                    <NextFixturePanel teamId={String(teamId)} />
                    {/* 五角形レーダー */}
                    <TeamRadarComposer teamId={String(teamId)} />
                  </div>
                )}

                {active === "news" && (
                  <div className="space-y-3">
                    <div className="flex items-baseline justify-between">
                      <h2 className="text-base font-semibold">News</h2>
                      <Link
                        href={`/board/${teamId}/news`}
                        className="text-xs underline"
                      >
                        もっと見る
                      </Link>
                    </div>
                    <NewsList teamName={teamName} limit={10} />
                  </div>
                )}

                {active === "videos" && (
                  <div className="space-y-3">
                    <div className="flex items-baseline justify-between">
                      <h2 className="text-base font-semibold">Official videos</h2>
                      <Link
                        href={`/board/${teamId}/videos`}
                        className="text-xs underline"
                      >
                        もっと見る
                      </Link>
                    </div>
                    <OfficialVideos teamName={teamName} limit={10} />
                  </div>
                )}

                {!active && (
                  <p className="text-sm text-gray-500">右のタブを押すと表示します。</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

