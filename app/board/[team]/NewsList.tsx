"use client";

import { useEffect, useMemo, useState } from "react";

type Item = {
  title: string;
  title_t?: string; // 翻訳済みタイトル（ある場合）
  link: string;     // ときどき <a href="..."> を含む
  lang?: string;    // ソース側で推定されていれば使う
};

export default function NewsList({
  teamName,
  limit,
}: {
  teamName: string;
  /** トップでは 10 件など。省略時は全件 */
  limit?: number;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // UI言語（GlobeTranslate互換）
  const lang = useMemo(() => {
    if (typeof window === "undefined") return "en";
    return localStorage.getItem("baseLang") || localStorage.getItem("lang") || "en";
  }, []);

  useEffect(() => {
    let canceled = false;

    const url = new URL("/api/news", window.location.origin);
    url.searchParams.set("q", teamName);
    url.searchParams.set("translate", "1"); // API側でタイトル翻訳
    url.searchParams.set("lang", lang);

    fetch(url.toString(), { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => !canceled && setItems(json.items ?? []))
      .catch(() => !canceled && setItems([]))
      .finally(() => !canceled && setLoading(false));

    return () => {
      canceled = true;
    };
  }, [teamName, lang]);

  if (loading) {
    return (
      <section className="space-y-3">
        <div className="h-16 rounded-lg bg-white/5 animate-pulse" />
        <div className="h-16 rounded-lg bg-white/5 animate-pulse" />
      </section>
    );
  }

  const list = limit ? items.slice(0, limit) : items;

  return (
    <section className="space-y-4">
      <ul className="space-y-3">
        {list.map((it, i) => {
          const text = it.title_t?.trim() ? it.title_t : it.title; // タイトルだけ表示
          const url = extractHref(it.link);
          const href = gtLink(url, lang); // ✅ 常に翻訳版で開く
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
    </section>
  );
}

/* ========= helpers ========= */

// 実URLを抽出（href="..." 形式や素のURL両対応）
function extractHref(input: string): string {
  if (!input) return "";
  const m = input.match(/href="([^"]+)"/i);
  if (m?.[1]) return decodeHTMLEntities(m[1]);
  const m2 = input.match(/https?:\/\/\S+/);
  if (m2) return decodeHTMLEntities(m2[0]);
  return decodeHTMLEntities(input);
}

// HTMLエンティティの簡易デコード
function decodeHTMLEntities(s: string) {
  return s
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

// Google翻訳プロキシURLに変換（常時使用）
function gtLink(url: string, lang: string) {
  const u = new URL("https://translate.google.com/translate");
  u.searchParams.set("sl", "auto");
  u.searchParams.set("tl", lang || "en");
  u.searchParams.set("u", url);
  return u.toString();
}

