// app/board/[team]/page.tsx
import { notFound } from "next/navigation";

import PredictBox from "@board/components/PredictBox";
import type { Metadata } from "next";
import NewsList from "./NewsList";
import OfficialVideos from "./officialVideos";
import NewThreadForm from "@board/components/NewThreadForm";
import BoardHeadings from "./BoardHeadings";
import { ClubNewsTitle, OfficialVideosTitle } from "./BoardSectionTitles";
import Link from "next/link";
import { lineupBuilderUi } from "@/lib/lineupBuilderUiCopy";
import { getCanonicalUrl } from "@/lib/publicSiteUrl";
import { getTeamPageData } from "@/lib/server/teamPageData";

export async function generateMetadata({
  params,
}: {
  params: { team: string } | Promise<{ team: string }>;
}): Promise<Metadata> {
  const { team } = await (params instanceof Promise ? params : Promise.resolve(params));
  const teamId = team.trim();
  if (!/^\d+$/.test(teamId)) return { title: "掲示板" };
  const teamData = await getTeamPageData(Number(teamId));
  const teamName = teamData.team?.name ?? `Team ${teamId}`;
  const title = `${teamName} 掲示板`;
  const description = `${teamName}の海外サッカー掲示板。英語ファンコメントを翻訳付きで読め、試合予想や戦術議論も。`;
  return {
    title,
    description,
    alternates: { canonical: getCanonicalUrl(`/board/${teamId}`) },
  };
}
import ThreadList from "@board/components/ThreadList";
import { listThreads } from "@/lib/boardApi";
import { getPredictJsonForTeam } from "@/lib/predictCacheService";
import { headers } from "next/headers";

export const revalidate = 60;
const BOARD_REVALIDATE_SECONDS = 60;

export default async function TeamBoardPage({
  params,
  searchParams,
}: {
  params: { team: string } | Promise<{ team: string }>;
  searchParams?: Promise<{ highlightThread?: string; highlightReply?: string }>;
}) {
  // 14/15 両対応
  const { team } = await (params instanceof Promise ? params : Promise.resolve(params));
  const sp = searchParams ? await searchParams : {};
  const teamId = team.trim();

  // 数字だけ許可（/board/57）
  if (!/^\d+$/.test(teamId)) notFound();

  const defaultTeamName = `Team ${teamId}`;

  // 並列取得（teamName に依存するものは then でバインド）
  const teamDataPromise = getTeamPageData(Number(teamId));
  const threadsPromise = loadThreads(teamId);
  const hdr = await headers();
  const hdrHost =
    (process.env.VERCEL ? "https://" : "http://") +
    (hdr.get("host") ?? "localhost:3000");
  const newsPromise = teamDataPromise.then((data) =>
    fetchNews(data.team?.name ?? defaultTeamName, hdrHost),
  );
  const videosPromise = teamDataPromise.then((data) =>
    fetchVideos(data.team?.name ?? defaultTeamName, hdrHost),
  );
  const predictPromise = getPredictJsonForTeam(teamId).then((r) => r.json);

  const [teamData, threads, newsItems, videoItems, predict] =
    await Promise.all([
      teamDataPromise,
      threadsPromise,
      newsPromise,
      videosPromise,
      predictPromise,
    ]);

  const teamName = teamData.team?.name ?? defaultTeamName;

  return (
    <main className="p-6 space-y-8">
      <BoardHeadings teamName={teamName} />

      <section className="flex flex-wrap items-center gap-2">
        <Link
          href={`/lineup-builder?teamId=${teamId}`}
          className="inline-flex items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          {lineupBuilderUi.createTacticsBoard}
        </Link>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)] gap-6 items-start">
        <div className="space-y-4">
          <NewThreadForm key={`composer-${teamId}`} teamId={teamId} />
          <ThreadList
            key={`thread-list-${teamId}`}
            teamId={teamId}
            initialItems={threads}
            highlightThreadId={sp.highlightThread}
            highlightReplyId={sp.highlightReply}
          />
        </div>

        <aside className="md:sticky md:top-4 h-fit">
          <PredictBox teamId={teamId} initialData={predict} />
        </aside>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <ClubNewsTitle />
          <NewsList teamName={teamName} initialItems={newsItems} initialLang="ja" />
        </div>
        <div className="space-y-3">
          <OfficialVideosTitle />
          <OfficialVideos teamName={teamName} initialVideos={videoItems} />
        </div>
      </section>
    </main>
  );
}

/* ===== helpers (server side) ===== */

type TacticsBoardSummary = {
  id: number;
  data: unknown;
  createdAt: string;
};

type ThreadItem = {
  id: string;
  title: string;
  body?: string;
  createdAt?: string;
  authorName?: string | null;
  postCount?: number;
  threadLikeCount?: number;
  threadLikedByMe?: boolean;
  threadType?: string | null;
  tacticsBoards?: TacticsBoardSummary[];
};

async function loadThreads(teamId: string): Promise<ThreadItem[]> {
  try {
    const rows = await listThreads(Number(teamId));
    return rows.map((r) => ({
      id: String(r.id),
      title: r.title,
      body: r.body || "",
      createdAt: r.createdAt?.toISOString?.() ?? undefined,
      postCount: r.postCount ?? 0,
      threadLikeCount: r.threadLikeCount ?? 0,
      threadType: r.threadType ?? undefined,
      tacticsBoards: r.tacticsBoards?.length
        ? r.tacticsBoards.map((tb) => ({
          id: tb.id,
          data: tb.data,
          createdAt: tb.createdAt?.toISOString?.() ?? "",
          }))
        : undefined,
    }));
  } catch (e) {
    console.error("listThreads failed", e);
    return [];
  }
}

type NewsItem = { title: string; title_t?: string; link: string; lang?: string };

async function fetchNews(teamName: string, baseUrl: string): Promise<NewsItem[]> {
  try {
    const url = new URL("/api/news", baseUrl);
    url.searchParams.set("q", teamName);
    url.searchParams.set("translate", "1");
    url.searchParams.set("lang", "ja");
    const res = await fetch(url.toString(), { next: { revalidate: BOARD_REVALIDATE_SECONDS } });
    if (!res.ok) throw new Error(`news HTTP ${res.status}`);
    const json = await res.json();
    return Array.isArray(json?.items) ? json.items : [];
  } catch (e) {
    console.error("fetchNews failed", e);
    return [];
  }
}

type VideoItem = { id?: string; title: string; url?: string; publishedAt?: string; link?: string };

async function fetchVideos(teamName: string, baseUrl: string): Promise<VideoItem[]> {
  try {
    const url = new URL("/api/videos", baseUrl);
    url.searchParams.set("q", `${teamName} official`);
    const res = await fetch(url.toString(), { next: { revalidate: BOARD_REVALIDATE_SECONDS } });
    if (!res.ok) throw new Error(`videos HTTP ${res.status}`);
    const json = await res.json();
    return Array.isArray(json?.items) ? json.items : [];
  } catch (e) {
    console.error("fetchVideos failed", e);
    return [];
  }
}

type PredictData = {
  fixture?: {
    utcDate?: string;
    homeTeam?: string;
    awayTeam?: string;
    venue?: string | null;
    status?: string;
  };
  xg?: { home: number; away: number };
  winProb?: { home: number; draw: number; away: number };
  topScores?: { h: number; a: number; p: number }[];
  message?: string;
  error?: string;
  meta?: unknown;
};


