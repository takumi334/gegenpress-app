// app/board/[team]/officialVideos.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Video = { id?: string; title: string; url?: string; publishedAt?: string; link?: string };

export default function OfficialVideos({ teamName, limit }: { teamName: string; limit?: number }) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  // UI言語（翻訳プロキシの tl 用）
  const lang = useMemo(() => {
    if (typeof window === "undefined") return "en";
    return localStorage.getItem("baseLang") || localStorage.getItem("lang") || "en";
  }, []);

  useEffect(() => {
    let canceled = false;

    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/videos?q=${encodeURIComponent(teamName + " official")}`, { cache: "no-store" });
        const data = await r.json();

        // 1) API が items を返せたらそのまま使う（link / url どちらでも対応）
        let items: Video[] = Array.isArray(data?.items) ? data.items : [];

        // 2) 何も無ければフォールバックで YouTube 検索リンクを自動生成
        if (!items.length) {
          const q = (s: string) => `${teamName} ${s}`;
          items = [
            { title: `${teamName} official channel`, url: yts(q("official channel")) },
            { title: `${teamName} highlights`,       url: yts(q("highlights")) },
            { title: `${teamName} press conference`, url: yts(q("press conference")) },
          ];
        }

        if (!canceled) setVideos(items);
      } catch (_) {
        // 失敗時もフォールバック
        const q = (s: string) => `${teamName} ${s}`;
        const items: Video[] = [
          { title: `${teamName} official channel`, url: yts(q("official channel")) },
          { title: `${teamName} highlights`,       url: yts(q("highlights")) },
          { title: `${teamName} press conference`, url: yts(q("press conference")) },
        ];
        if (!canceled) setVideos(items);
      } finally {
        if (!canceled) setLoading(false);
      }
    })();

    return () => { canceled = true; };
  }, [teamName]);

  if (loading && videos.length === 0) return <p>Loading videos…</p>;
  if (!videos.length) return <p>No videos found</p>;

  const list = limit ? videos.slice(0, limit) : videos;

  // 既存ファイルをこの差分の通り修正してください

// …（前半はそのまま）…

  return (
    <ul className="space-y-2">
      {list.map((v, i) => {
        const raw = v.url || v.link || "";
        const href = toVideoHref(raw, lang); // ← ここを gtLink から変更
        return (
          <li key={v.id || i} className="rounded-xl border border-white/10 p-3 hover:bg-white/5">
            <a href={href} target="_blank" rel="noopener noreferrer" className="underline">
              🎥 {v.title}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

// ===== helpers =====

// YouTube 検索URL（フォールバック）
function yts(query: string) {
  const u = new URL("https://www.youtube.com/results");
  u.searchParams.set("search_query", query);
  return u.toString();
}

// ★ 動画用の最終リンクを決める：YouTube系はそのまま、その他は翻訳プロキシ
function toVideoHref(url: string, lang: string) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const isYouTube =
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "youtu.be" ||
      host.endsWith(".youtube.com");

    if (isYouTube) return u.toString(); // 直接開く（翻訳プロキシなし）
  } catch {
    // 不正なURLはそのまま返す
    return url;
  }
  return gtLink(url, lang); // YouTube 以外は翻訳プロキシ経由で
}

// News と同仕様の翻訳プロキシ（据え置き）
function gtLink(url: string, lang: string) {
  const u = new URL("https://translate.google.com/translate");
  u.searchParams.set("sl", "auto");
  u.searchParams.set("tl", lang || "en");
  u.searchParams.set("u", url);
  return u.toString();
}
