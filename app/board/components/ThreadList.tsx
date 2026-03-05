"use client";

import { useEffect, useState } from "react";
import ReportButton from "@/components/ReportButton";
import Link from "next/link";

/** テキストが日本語主体なら "en"（英語へ翻訳）、それ以外は "ja"（日本語へ翻訳） */
function detectTargetLang(text: string): "en" | "ja" {
  if (!text.trim()) return "ja";
  const hasJapanese = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(text);
  return hasJapanese ? "en" : "ja";
}

const NATIVE_ONLY_TYPES = ["lineup", "halftime", "postmatch"];

function isNativeOnlyThread(threadType?: string | null): boolean {
  return !!threadType && NATIVE_ONLY_TYPES.includes(threadType.toLowerCase());
}

type Item = {
  id: string;
  title: string;
  body?: string;
  authorName?: string | null;
  createdAt?: string;
  postCount?: number;
  threadType?: string | null;
  title_t?: string;
  body_t?: string;
};

type Props = { teamId: string; initialItems?: Item[] };

export default function ThreadList({ teamId, initialItems }: Props) {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<Item[]>(initialItems ?? []);
  const [rawItems, setRawItems] = useState<Item[]>(initialItems ?? []);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(!initialItems);
  useEffect(() => setMounted(true), []);

  // initialItems が変わったら状態を同期
  useEffect(() => {
    setRawItems(initialItems ?? []);
    setItems(initialItems ?? []);
    setLoading(!initialItems);
    setErr("");
  }, [initialItems]);

  useEffect(() => {
    let alive = true;
    (async () => {
      // SSR で初期値がある場合はクライアントフェッチをスキップ
      if (initialItems?.length) {
        setLoading(false);
        return;
      }

      try {
        setErr("");
        setLoading(true);
        const res = await fetch(`/api/threads?teamId=${encodeURIComponent(teamId)}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json();

        // API 側のキー名が items でも threads でも拾えるように
        const list: Item[] = Array.isArray(j?.items)
          ? j.items
          : Array.isArray(j?.threads)
          ? j.threads
          : Array.isArray(j)
          ? j
          : [];

        if (alive) {
          setRawItems(list);
          setItems(list); // 即時表示（翻訳は別エフェクトで上書き）
        }
      } catch (e: any) {
        if (alive) setErr(e?.message || "load failed");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [teamId, initialItems]);

  // 投稿言語を自動判定し、日本語→英語・英語→日本語で /api/translate を呼び翻訳結果を Translation に表示
  // threadType が lineup / halftime / postmatch のスレは翻訳しない（ネイティブのみ）
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!rawItems.length) return;

      const translatableItems = rawItems.filter((i) => !isNativeOnlyThread(i.threadType));
      if (translatableItems.length === 0) {
        setItems(rawItems);
        return;
      }

      type Target = "en" | "ja";
      const textsByTarget = new Map<Target, Set<string>>();
      textsByTarget.set("en", new Set());
      textsByTarget.set("ja", new Set());
      translatableItems.forEach((i) => {
        const title = (i.title || "").trim();
        const body = (i.body || "").trim();
        const target = detectTargetLang(title + " " + body);
        if (title) textsByTarget.get(target)!.add(title);
        if (body) textsByTarget.get(target)!.add(body);
      });

      const listEn = Array.from(textsByTarget.get("en")!);
      const listJa = Array.from(textsByTarget.get("ja")!);
      const map = new Map<string, string>(); // "text::en" -> translated, "text::ja" -> translated

      const fetchTranslations = async (q: string[], target: Target) => {
        if (q.length === 0) return;
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ q, target }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json().catch(() => ({}));
        const trs: string[] = Array.isArray(data?.translations) ? data.translations : [];
        q.forEach((txt, idx) => map.set(`${txt}::${target}`, trs[idx] ?? txt));
      };

      try {
        await fetchTranslations(listEn, "en");
        await fetchTranslations(listJa, "ja");
        if (cancelled) return;

        const translated = rawItems.map((i) => {
          if (isNativeOnlyThread(i.threadType)) {
            return { ...i, title_t: i.title, body_t: i.body };
          }
          const titleSrc = (i.title || "").trim();
          const bodySrc = (i.body || "").trim();
          const target = detectTargetLang(titleSrc + " " + bodySrc);
          const title_t = titleSrc ? (map.get(`${titleSrc}::${target}`) ?? i.title) : i.title;
          const body_t = bodySrc ? (map.get(`${bodySrc}::${target}`) ?? i.body) : i.body;
          return { ...i, title_t, body_t };
        });
        setItems(translated);
      } catch {
        if (!cancelled) setItems(rawItems);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [rawItems]);

  if (loading && !rawItems.length) return <div className="text-sm text-gray-600">読み込み中…</div>;
  if (err) return <div className="text-red-600">Error: {err}</div>;
  if (!items.length) return <div className="text-sm text-gray-600">まだ投稿がありません。</div>;

  return (
    <div className="border rounded divide-y">
     {items.map((t) => {
  const created = t.createdAt ? new Date(t.createdAt) : null;
  const createdText =
    mounted && created
      ? new Intl.DateTimeFormat("ja-JP", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).format(created)
      : "";
  const nativeOnly = isNativeOnlyThread(t.threadType);
  return (
  <div key={t.id} className="p-2">
    <div className="flex items-start justify-between gap-2">
      <div className="font-semibold">
        {t.title_t ?? t.title}
      </div>
      <div className="flex items-center gap-2">
        <Link
          href={`/board/${teamId}/thread/${t.id}`}
          className="text-xs border rounded px-2 py-1 hover:bg-white/10"
        >
          Reply
          {typeof t.postCount === "number" ? ` (${t.postCount})` : ""}
        </Link>
        <ReportButton kind="thread" targetId={Number(t.id)} />
      </div>
    </div>

    {nativeOnly ? (
      <div className="mt-2 text-sm whitespace-pre-wrap text-slate-900 dark:text-slate-100">
        {t.body ? <div className="mt-1">{t.body}</div> : null}
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
        <div>
          <div className="text-[11px] text-gray-500">Original</div>
          <div className="font-semibold whitespace-pre-wrap">{t.title}</div>
          {t.body ? (
            <div className="text-xs text-gray-500 whitespace-pre-wrap mt-1">{t.body}</div>
          ) : null}
        </div>
        <div>
          <div className="text-[11px] text-gray-500">Translation</div>
          <div className="font-semibold whitespace-pre-wrap">{t.title_t ?? t.title}</div>
          {(t.body_t ?? t.body) ? (
            <div className="text-xs text-gray-500 whitespace-pre-wrap mt-1">
              {t.body_t ?? t.body}
            </div>
          ) : null}
        </div>
      </div>
    )}

    <div className="text-xs text-gray-500 mt-1">
      {t.authorName || "Anonymous"}
      {createdText && <> ・ {createdText}</>}
      {typeof t.postCount === "number" ? ` ・ ${t.postCount}件の返信` : ""}
    </div>
  </div>
  );
})}

    </div>
  );
}
