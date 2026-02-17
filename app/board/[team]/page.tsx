// app/board/[team]/page.tsx
import { notFound } from "next/navigation";

import PredictBox from "@board/components/PredictBox";
import NewsList from "./NewsList";
import OfficialVideos from "./officialVideos";
import { getTeamNameFromFD } from "@lib/team-resolver";
import NewThreadForm from "@board/components/NewThreadForm";
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
      <h1 className="text-2xl font-bold">{teamName} 掲示板</h1>

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
          <h2 className="text-xl font-semibold">クラブニュース</h2>
          <NewsList teamName={teamName} initialItems={newsItems} initialLang="ja" />
        </div>
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">公式動画</h2>
          <OfficialVideos teamName={teamName} initialVideos={videoItems} />
        </div>
      </section>
    </main>
  );
}

/* ===== helpers (server side) ===== */

type ThreadItem = {
  id: string;
  title: string;
  body?: string;
  createdAt?: string;
  authorName?: string | null;
  postCount?: number;
};

async function loadThreads(teamId: string): Promise<ThreadItem[]> {
  try {
    const rows = await listThreads(Number(teamId));
    return rows.map((r) => ({
      id: String(r.id),
      title: r.title,
      body: r.body || "",
      createdAt: r.createdAt?.toISOString?.() ?? undefined,
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



