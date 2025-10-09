"use client";

import { useEffect, useState } from "react";

/* ユーザーが選んだ Target 言語（localStorage）を拾う */
function useTargetLang(defaultLang = "ja") {
  const [lang, setLang] = useState(defaultLang);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setLang(localStorage.getItem("targetLang") || defaultLang);
    }
  }, []);
  return lang;
}

export default function NewsAndVideos({ teamName }: { teamName: string }) {
  const [tab, setTab] = useState<"news" | "video">("news");
  const lang = useTargetLang("ja");

  return (
    <div className="space-y-3">
      {/* tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("news")}
          className={`px-3 py-1 border rounded ${tab === "news" ? "font-bold" : ""}`}
          data-i18n
        >
          news
        </button>
        <button
          onClick={() => setTab("video")}
          className={`px-3 py-1 border rounded ${tab === "video" ? "font-bold" : ""}`}
          data-i18n
        >
          official video
        </button>
      </div>

      {tab === "news" ? (
        <NewsList teamName={teamName} lang={lang} />
      ) : (
        <OfficialVideos teamName={teamName} />
      )}
    </div>
  );
}

/* ===== ニュース ===== */
function NewsList({ teamName, lang }: { teamName: string; lang: string }) {
  const [items, setItems] = useState<
    { title_translated: string; desc_translated: string; link: string; pubDate: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(
          `/api/news?q=${encodeURIComponent(teamName)}&lang=${encodeURIComponent(lang)}`,
          { cache: "no-store" }
        );
        const data = await r.json();
        if (!cancel) setItems(data.items ?? []);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [teamName, lang]);

  if (loading && items.length === 0) return <div className="text-sm opacity-70" data-i18n>読み込み中…</div>;
  if (items.length === 0) return <div className="text-sm opacity-70" data-i18n>ニュースが見つかりませんでした</div>;

  return (
    <ul className="space-y-2">
      {items.map((n, i) => (
        <li key={i} className="rounded-lg bg-white/10 border border-white/20 p-3">
          <a href={n.link} target="_blank" rel="noreferrer" className="font-semibold underline">
            {n.title_translated}
          </a>
          <p className="text-sm opacity-80 mt-1" dangerouslySetInnerHTML={{ __html: n.desc_translated }} />
          <div className="text-xs opacity-60 mt-1">{n.pubDate}</div>
        </li>
      ))}
    </ul>
  );
}

/* ===== 公式動画 ===== */
function OfficialVideos({ teamName }: { teamName: string }) {
  const [items, setItems] = useState<{ id: string; title: string; url: string; publishedAt: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/videos?q=${encodeURIComponent(teamName + " official")}`, { cache: "no-store" });
        const data = await r.json();
        if (!cancel) setItems(data.items ?? []);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [teamName]);

  if (loading && items.length === 0) return <div className="text-sm opacity-70" data-i18n>読み込み中…</div>;
  if (items.length === 0) return <div className="text-sm opacity-70" data-i18n>公式動画が見つかりませんでした</div>;

  return (
    <ul className="grid md:grid-cols-2 gap-3">
      {items.map((v) => (
        <li key={v.id} className="border rounded overflow-hidden">
          <a href={v.url} target="_blank" rel="noreferrer" className="block p-3">
            <div className="font-medium">{v.title}</div>
            <div className="text-xs opacity-60">{new Date(v.publishedAt).toLocaleString()}</div>
          </a>
        </li>
      ))}
    </ul>
  );
}

