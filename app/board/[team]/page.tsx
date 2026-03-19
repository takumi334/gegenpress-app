// app/board/[team]/page.tsx
import { notFound } from "next/navigation";

import PredictBox from "@board/components/PredictBox";
import type { Metadata } from "next";
import NewsList from "./NewsList";
import OfficialVideos from "./officialVideos";
import { getTeamNameFromFD } from "@lib/team-resolver";
import NewThreadForm from "@board/components/NewThreadForm";
import BoardHeadings from "./BoardHeadings";
import { ClubNewsTitle, OfficialVideosTitle } from "./BoardSectionTitles";
import Link from "next/link";
import { lineupBuilderUi } from "@/lib/lineupBuilderUiCopy";

export async function generateMetadata({
  params,
}: {
  params: { team: string } | Promise<{ team: string }>;
}): Promise<Metadata> {
  const { team } = await (params instanceof Promise ? params : Promise.resolve(params));
  const teamId = team.trim();
  if (!/^\d+$/.test(teamId)) return { title: "掲示板" };
  const teamName = await getTeamNameFromFD(teamId).catch(() => `Team ${teamId}`);
  const title = `${teamName} 掲示板`;
  const description = `${teamName}の海外サッカー掲示板。海外ファンの反応や試合予想を翻訳付きでチェックできる翻訳付き掲示板です。`;
  return { title, description };
}
import ThreadList from "@board/components/ThreadList";
import { headers } from "next/headers";
import { listThreads } from "@/lib/boardApi";

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

  // ベースURL（サーバーフェッチ用）
  const hdr = await headers();
  const base =
    (process.env.VERCEL ? "https://" : "http://") +
    (hdr.get("host") ?? "localhost:3000");

  const defaultTeamName = `Team ${teamId}`;

  // 並列取得（teamName に依存するものは then でバインド）
  const teamNamePromise = getTeamNameFromFD(teamId).catch(() => null);
  const threadsPromise = loadThreads(teamId);
  const newsPromise = teamNamePromise.then((name) =>
    fetchNews(name ?? defaultTeamName, base),
  );
  const videosPromise = teamNamePromise.then((name) =>
    fetchVideos(name ?? defaultTeamName, base),
  );
  const predictPromise = fetchPredict(teamId, base);

  const [teamNameResolved, threads, newsItems, videoItems, predict] =
    await Promise.all([
      teamNamePromise,
      threadsPromise,
      newsPromise,
      videosPromise,
      predictPromise,
    ]);

  const teamName = teamNameResolved ?? defaultTeamName;

  return (
    <main className="p-6 space-y-8">
      <BoardHeadings teamName={teamName} />

      <section className="flex flex-wrap items-center gap-2">
        <Link
          href="/lineup-builder"
          className="inline-flex items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          {lineupBuilderUi.createTacticsBoard}
        </Link>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)] gap-6 items-start">
        <div className="space-y-4">
          <NewThreadForm teamId={teamId} />
          <ThreadList teamId={teamId} initialItems={threads} />
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
    const res = await fetch(url.toString(), { cache: "no-store" });
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
    const res = await fetch(url.toString(), { cache: "no-store" });
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
};

async function fetchPredict(teamId: string, baseUrl: string): Promise<PredictData | null> {
  try {
    const url = new URL("/api/predict", baseUrl);
    url.searchParams.set("teamId", teamId);
    const res = await fetch(url.toString(), { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("predict HTTP error", res.status, json?.error);
      return json ?? null;
    }
    return json;
  } catch (e) {
    console.error("fetchPredict failed", e);
    return null;
  }
}



