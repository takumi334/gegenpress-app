// app/board/[team]/NewsList.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Item = {
  title: string;
  title_t?: string;   // APIが付ける翻訳済タイトル（任意）
  link: string;
  pubDate: string;
  source: string;
};

function gtLink(url: string, lang: string) {
  const u = new URL("https://translate.google.com/translate");
  u.searchParams.set("sl", "auto");
  u.searchParams.set("tl", lang || "en");
  u.searchParams.set("u", url);
  return u.toString();
}

export default function NewsList({ teamName }: { teamName: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [openViaGT, setOpenViaGT] = useState(false);
  const [translateHeadlines, setTranslateHeadlines] = useState(false);

  // Native（GlobeTranslate の保存値）— 変更反映のため storage を直接読む
  const native = useMemo(() => {
    if (typeof window === "undefined") return "en";
    return (localStorage.getItem("baseLang") || localStorage.getItem("lang") || "en").trim();
  }, [typeof window !== "undefined" ? localStorage.getItem("baseLang") : ""]); // 値が変われば再評価

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const url =
          `/api/news?q=${encodeURIComponent(teamName)}` +
          (translateHeadlines ? `&translate=1&lang=${encodeURIComponent(native)}` : "");
        const r = await fetch(url, { cache: "no-store" });
        const data = await r.json();
        if (!cancelled && Array.isArray(data.items)) setItems(data.items);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [teamName, native, translateHeadlines]);

  if (loading) return <div className="text-sm opacity-80" data-i18n>Loading news…</div>;
  if (items.length === 0) return <div className="text-sm opacity-60" data-i18n>No news.</div>;

  return (
    <div className="space-y-3">
      <div className="text-sm flex flex-wrap items-center gap-4">
        <label className="inline-flex items-center gap-1">
          <input type="checkbox" checked={translateHeadlines}
                 onChange={(e) => setTranslateHeadlines(e.target.checked)} />
          <span data-i18n>Translate headlines</span>
          <span className="opacity-60">({native})</span>
        </label>
        <label className="inline-flex items-center gap-1">
          <input type="checkbox" checked={openViaGT}
                 onChange={(e) => setOpenViaGT(e.target.checked)} />
          <span data-i18n>Open article via Google Translate</span>
        </label>
      </div>

      {/* 見出しだけを列挙（説明や http は出さない） */}
      <ul className="list-disc pl-5 space-y-1">
        {items.map((n, i) => {
          const href = openViaGT ? gtLink(n.link, native) : n.link;
          const title = (translateHeadlines ? (n.title_t || n.title) : n.title) || "";
          return (
            <li key={i}>
              <a href={href} target="_blank" rel="noreferrer" className="underline">
                {title}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

