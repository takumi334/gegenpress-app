// app/board/[team]/OfficialVideos.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Video = {
  title: string;
  url: string;
};

export default function OfficialVideos({
  teamName,
  limit,
}: {
  teamName: string;
  /** トップでは 10 件など。省略時は全件 */
  limit?: number;
}) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  // NewsList と同じ基準で UI 言語を取得
  const lang = useMemo(() => {
    if (typeof window === "undefined") return "en";
    return localStorage.getItem("baseLang") || localStorage.getItem("lang") || "en";
  }, []);

  useEffect(() => {
    let canceled = false;
    async function fetchVideos() {
      try {
        const r = await fetch(
          `/api/videos?q=${encodeURIComponent(teamName)} official`,
          { cache: "no-store" }
        );
        if (!r.ok) throw new Error(`Failed videos: ${r.status}`);
        const data = await r.json();
        if (!canceled) setVideos(data.items ?? []);
      } catch (e) {
        console.error(e);
        if (!canceled) setVideos([]);
      } finally {
        if (!canceled) setLoading(false);
      }
    }
    fetchVideos();
    return () => {
      canceled = true;
    };
  }, [teamName]);

  if (loading) return <p data-i18n>動画を読み込み中...</p>;
  if (!videos.length) return <p data-i18n>動画が見つかりません</p>;

  const list = limit ? videos.slice(0, limit) : videos;

  return (
    <ul className="space-y-2">
      {list.map((v, i) => {
        const href = gtLink(v.url, lang); // ✅ Google翻訳プロキシ経由で開く
        return (
          <li key={i} className="rounded-xl border border-white/10 p-3 hover:bg-white/5">
            <a
              href={href}
              target="_blank"
              rel="noopener"
              className="underline"
              title={v.title}
            >
              🎥 {v.title}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/* ========= helpers ========= */

// Google翻訳プロキシURLに変換（NewsList と同一仕様）
function gtLink(url: string, lang: string) {
  const u = new URL("https://translate.google.com/translate");
  u.searchParams.set("sl", "auto");
  u.searchParams.set("tl", lang || "en");
  u.searchParams.set("u", url);
  return u.toString();
}

