import { NextResponse } from "next/server";

// ---- 環境変数（.env.local）
const FD_BASE = process.env.FD_BASE ?? "https://api.football-data.org/v4";
const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY ?? "";
const GOOGLE_TRANSLATE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY ?? ""; // ← 有料版を使う
const DEFAULT_LANG = process.env.DEFAULT_LANG ?? "en";

// ---- ヘルパー（HTML混入の除去）
const decodeHTMLEntities = (s: string) =>
  s
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

const extractHref = (input: string) => {
  if (!input) return "";
  const m = input.match(/href="([^"]+)"/i);
  if (m?.[1]) return decodeHTMLEntities(m[1]);
  const m2 = input.match(/https?:\/\/\S+/);
  if (m2) return decodeHTMLEntities(m2[0]);
  return decodeHTMLEntities(input);
};

// ---- Google Cloud Translation v2（APIキーでOK）
async function translateTitles(titles: string[], target: string) {
  if (!GOOGLE_TRANSLATE_API_KEY || titles.length === 0) return titles;
  const url = new URL(
    "https://translation.googleapis.com/language/translate/v2"
  );
  url.searchParams.set("key", GOOGLE_TRANSLATE_API_KEY);

  const body = {
    q: titles,            // 配列OK
    target,               // 例: "ja"
    format: "text",
    model: "nmt",
  };

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    // 失敗時は原文をそのまま返す（落とさない）
    return titles;
  }

  const json = await res.json();
  const data: Array<{ translatedText: string }> =
    json?.data?.translations ?? [];
  // titles と同じ並びで返す
  return data.map((d, i) => d?.translatedText ?? titles[i]);
}

// ---- 実体：ニュース取得（あなたの既存ロジックに合わせて差し替えてOK）
async function fetchNewsItems(query: string) {
  // ここはダミー：あなたの既存ニュースソースから items を取得してください
  // 期待する形：
  // [{ title: string, link: string, source?: string, pubDate?: string }, ...]
  // 例として Google News RSS を想定した最小実装
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(
    query
  )}&hl=en-US&gl=US&ceid=US:en`;

  const rss = await fetch(rssUrl).then((r) => r.text());

  // 超簡易パース（本番では proper RSS パーサーを推奨）
  const items: Array<{ title: string; link: string }> = [];
  const re = /<item>[\s\S]*?<title><!\[CDATA\[(.*?)\]\]><\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(rss))) {
    items.push({
      title: decodeHTMLEntities(m[1]),
      link: decodeHTMLEntities(m[2]),
    });
  }
  return items;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "Arsenal";
  const translate = searchParams.get("translate") === "1";
  const lang = (searchParams.get("lang") || DEFAULT_LANG).toLowerCase();

  // ニュース取得
  const rawItems = await fetchNewsItems(q);

  // タイトル翻訳（有料の Google Translation を使用）
  let translated: string[] = [];
  if (translate && lang && lang !== "auto") {
    translated = await translateTitles(
      rawItems.map((it) => it.title),
      lang
    );
  }

  const items = rawItems.map((it, i) => ({
    title: it.title,
    title_t: translated[i] || undefined, // 翻訳があれば付与
    link: extractHref(it.link),          // 生URLにクリーン
  }));

  // JSON 返却
  return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
}

