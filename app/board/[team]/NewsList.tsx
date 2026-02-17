"use client";

import { useEffect, useRef, useState } from "react";

type Item = { title: string; title_t?: string; link: string; lang?: string };

export default function NewsList({
  teamName,
  limit,
  initialItems,
  initialLang = "ja",
}: {
  teamName: string;
  limit?: number;
  initialItems?: Item[];
  initialLang?: string;
}) {
  const [items, setItems] = useState<Item[]>(initialItems ?? []);
  const [loading, setLoading] = useState(!initialItems);
  const [lang, setLang] = useState(initialLang);
  const initialLangRef = useRef(initialLang);

  useEffect(() => {
    setItems(initialItems ?? []);
    setLoading(!initialItems);
    initialLangRef.current = initialLang;
    if (!initialItems) setLang(initialLang);
  }, [initialItems, initialLang]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored =
      localStorage.getItem("targetLang") ||
      localStorage.getItem("baseLang") ||
      localStorage.getItem("lang");
    if (stored && stored !== lang) setLang(stored);
  }, []);

  useEffect(() => {
    let canceled = false;

    // 初期データと同じ言語ならサーバー値をそのまま使う
    if (initialItems?.length && lang === initialLangRef.current) {
      setLoading(false);
      return () => {
        canceled = true;
      };
    }

    if (typeof window === "undefined") return;

    const url = new URL("/api/news", window.location.origin);
    url.searchParams.set("q", teamName);
    url.searchParams.set("translate", "1");
    url.searchParams.set("lang", lang);

    setLoading(true);
    fetch(url.toString(), { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => !canceled && setItems(Array.isArray(json.items) ? json.items : []))
      .catch(() => !canceled && setItems([]))
      .finally(() => !canceled && setLoading(false));

    return () => {
      canceled = true;
    };
  }, [teamName, lang, initialItems]);

  const list = limit ? items.slice(0, limit) : items;
  const siteLinks = buildSiteSearchLinks(teamName, lang);

  return (
    <section className="space-y-4">
      {/* サイト検索ショートカット */}
      <div className="rounded-lg border border-white/15 p-3">
        <div className="flex items-baseline justify-between">
          <p className="text-xs opacity-70 mb-2" translate="no">
            Open site search
          </p>
          <span className="text-[10px] opacity-60" translate="no">
            Tip: use browser translate
          </span>
        </div>
        <ul className="list-disc pl-5 space-y-1">
          {siteLinks.map((l, i) => (
            <li key={i}>
              <a
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
                title={l.title}
              >
                {l.title}
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* APIのニュース（あれば） */}
      {loading ? (
        <div className="space-y-3">
          <div className="h-16 rounded-lg bg-white/5 animate-pulse" />
          <div className="h-16 rounded-lg bg-white/5 animate-pulse" />
        </div>
      ) : list.length ? (
        <ul className="space-y-3">
          {list.map((it, i) => {
            const text = it.title_t?.trim() ? it.title_t : it.title;
            const url = extractHref(it.link);
            // 記事本文は翻訳プロキシで開く（比較的安定）
            const href = gtLinkOpt(url, lang, /*preferGT*/ true);
            const displayLang = it.title_t?.trim() ? lang : it.lang || "en";
            return (
              <li key={i} className="rounded-xl border border-white/10 p-3 hover:bg-white/5">
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline underline-offset-2"
                >
                  <span lang={displayLang}>{text}</span>
                </a>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm opacity-70">
          No news found. Try the shortcuts above.
        </p>
      )}
    </section>
  );
}

/* ===== helpers ===== */

// BBC/GOAL/フォールバックの検索リンク
function buildSiteSearchLinks(query: string, lang: string) {
  const qRaw = query.trim();
  const q = encodeURIComponent(qRaw);

  // BBC（記事優先クエリ）
  const bbcArticles = `https://www.bbc.co.uk/search?q=${q}&content_types=articles`;

  // GOAL は翻訳プロキシが弾かれやすいので「直リンク」
  const goalSearch = `https://www.goal.com/en/search?q=${q}`;

  // ESPN（追加の保険）
  const espnSearch = `https://www.espn.com/search/results?q=${q}`;

  // Google site: フォールバック
  const googleBBC = `https://www.google.com/search?q=site:bbc.co.uk%20${q}`;
  const googleGoal = `https://www.google.com/search?q=site:goal.com%20${q}`;

  return [
    { title: `BBC Sport (Articles): ${qRaw}`, href: gtLinkOpt(bbcArticles, lang, true) },
    { title: `GOAL: ${qRaw}`, href: goalSearch }, // ←翻訳なしで開く
    { title: `ESPN: ${qRaw}`, href: gtLinkOpt(espnSearch, lang, true) },
    { title: `Google → BBC`, href: gtLinkOpt(googleBBC, lang, true) },
    { title: `Google → GOAL`, href: gtLinkOpt(googleGoal, lang, true) },
  ];
}

// href="..." を含む文字列／素のURL両対応
function extractHref(input: string): string {
  if (!input) return "";
  const m = input.match(/href="([^"]+)"/i);
  if (m?.[1]) return decodeHTMLEntities(m[1]);
  const m2 = input.match(/https?:\/\/\S+/);
  if (m2) return decodeHTMLEntities(m2[0]);
  return decodeHTMLEntities(input);
}

function decodeHTMLEntities(s: string) {
  return s
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

/**
 * 翻訳プロキシで開く/開かないを選択
 * - preferGT=true: 翻訳プロキシ経由にする（BBC/ESPN/Google用）
 * - preferGT=false: 直で開く（GOALなどブロックされやすいサイト）
 */
function gtLinkOpt(url: string, lang: string, preferGT: boolean) {
  if (!preferGT) return url;
  const u = new URL("https://translate.google.com/translate");
  u.searchParams.set("sl", "auto");
  u.searchParams.set("tl", lang || "ja");
  u.searchParams.set("u", url);
  return u.toString();
}
