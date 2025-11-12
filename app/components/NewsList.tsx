"use client";
import { useEffect, useMemo, useState } from "react";

type Item = {
  title: string;
  title_t?: string;
  link: string;
  pubDate?: string;
  source?: string;
};

// 見出し末尾の「 - The Guardian」「 – ESPN」などを落とす
function cleanTitle(t: string) {
  const idx = Math.max(t.lastIndexOf(" - "), t.lastIndexOf(" – "));
  return idx > 15 ? t.slice(0, idx).trim() : (t || "").trim();
}

// Google 翻訳を経由して記事を開くリンク
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

  // Native を優先（未設定なら "en"）
  const native = useMemo(() => {
    if (typeof window === "undefined") return "en";
    return (
      (localStorage.getItem("baseLang") ||
        localStorage.getItem("lang") ||
        "en") as string
    ).trim();
  }, []);

  useEffect(() => {
    const ac = new AbortController(); // ← 新規フェッチ時に前回を中断
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const url =
          `/api/news?q=${encodeURIComponent(teamName)}` +
          (translateHeadlines
            ? `&translate=1&lang=${encodeURIComponent(native)}`
            : "");

        const r = await fetch(url, {
          cache: "no-store",
          signal: ac.signal,
        });

        // fetch 自体が失敗したときに備えて
        if (!r.ok) {
          console.error("news fetch failed:", r.status, await r.text());
          if (!cancelled) {
            setItems([]);
          }
          return;
        }

        const data = await r.json();

        // 正規化：重複除去 & タイトル整形
        const seen = new Set<string>();
        const list: Item[] = (Array.isArray(data.items) ? data.items : [])
          .map((it: Item) => ({
            ...it,
            title: cleanTitle(it.title || ""),
          }))
          .filter((it: Item) => {
            const key = (it.title || "") + "|" + (it.link || "");
            if (!it.title || !it.link || seen.has(key)) return false;
            seen.add(key);
            return true;
          });

        if (!cancelled) setItems(list);
      } catch (e: any) {
        // 中断は想定動作なので無視。それ以外は軽くログ。
        if (e?.name !== "AbortError") {
          console.error("news fetch error:", e);
          if (!cancelled) setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      ac.abort(); // ← 前回リクエストをキャンセル
    };
  }, [teamName, native, translateHeadlines]);

  if (loading) {
    return (
      <div className="text-sm opacity-80" data-i18n>
        Loading news…
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="text-sm opacity-60" data-i18n>
        No news.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-sm flex flex-wrap items-center gap-4">
        <label className="inline-flex items-center gap-1">
          <input
            type="checkbox"
            checked={translateHeadlines}
            onChange={(e) => setTranslateHeadlines(e.target.checked)}
          />
          <span data-i18n>Translate headlines</span>
          <span className="opacity-60">({native})</span>
        </label>

        <label className="inline-flex items-center gap-1">
          <input
            type="checkbox"
            checked={openViaGT}
            onChange={(e) => setOpenViaGT(e.target.checked)}
          />
          <span data-i18n>Open article via Google Translate</span>
        </label>
      </div>

      {/* 見出しだけ表示（URLの生文字は出さない） */}
      <ul className="list-disc pl-5 space-y-1 marker:text-white/60">
        {items.map((n, i) => {
          const href = openViaGT ? gtLink(n.link, native) : n.link;
          const title = translateHeadlines ? n.title_t || n.title : n.title;
          return (
            <li key={i} className="whitespace-normal break-words">
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                {title}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

