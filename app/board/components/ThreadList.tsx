"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n-ui";

type Item = {
  id: string;
  title: string;
  body?: string;
  authorName?: string | null;
  createdAt?: string;   // ISO 文字列で受ける
  postCount?: number;
  title_t?: string;
  body_t?: string;
};

type Props = { teamId: string };

export default function ThreadList({ teamId }: Props) {
  const { locale } = useI18n();
  const [items, setItems] = useState<Item[]>([]);
  const [rawItems, setRawItems] = useState<Item[]>([]);
  const [err, setErr] = useState("");
  const [targetLang, setTargetLang] = useState<string>(locale);

  // localStorage に保存されている翻訳ターゲットを優先
  useEffect(() => {
    try {
      const stored =
        (typeof window !== "undefined" && localStorage.getItem("targetLang")) ||
        (typeof window !== "undefined" && localStorage.getItem("lang"));
      if (stored && stored !== targetLang) setTargetLang(stored);
    } catch {
      // 取得できない場合は locale を使用
    }
    // targetLang は依存に含めず初回のみ確認
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErr("");
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
      }
    })();
    return () => {
      alive = false;
    };
  }, [teamId]);

  // title/body を targetLang（localStorage > locale）に翻訳
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!rawItems.length) return;

      const target = (targetLang || locale || "").trim();
      if (!target || target === locale) {
        if (!cancelled) setItems(rawItems);
        return;
      }

      // 翻訳対象のテキストをユニーク化して送る
      const texts: string[] = [];
      rawItems.forEach((i) => {
        const t = (i.title || "").trim();
        const b = (i.body || "").trim();
        if (t) texts.push(t);
        if (b) texts.push(b);
      });

      const uniq = Array.from(new Set(texts));
      if (uniq.length === 0) {
        if (!cancelled) setItems(rawItems);
        return;
      }

      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ q: uniq, target }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json().catch(() => ({}));
        const trs: string[] = Array.isArray(data?.translations) ? data.translations : [];

        const map = new Map<string, string>();
        uniq.forEach((txt, idx) => {
          map.set(txt, trs[idx] ?? txt);
        });

        const translated = rawItems.map((i) => {
          const titleSrc = (i.title || "").trim();
          const bodySrc = (i.body || "").trim();
          return {
            ...i,
            title_t: titleSrc ? map.get(titleSrc) ?? i.title : i.title,
            body_t: bodySrc ? map.get(bodySrc) ?? i.body : i.body,
          };
        });

        if (!cancelled) setItems(translated);
      } catch {
        if (!cancelled) setItems(rawItems); // 失敗時は原文のまま
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [rawItems, targetLang, locale]);

  if (err) return <div className="text-red-600">Error: {err}</div>;
  if (!items.length) return <div className="text-sm text-gray-600">まだ投稿がありません。</div>;

  return (
    <div className="border rounded divide-y">
      {items.map((t) => (
        <div key={t.id} className="p-2">
          <div className="font-semibold">{t.title_t ?? t.title}</div>
          <div className="text-xs text-gray-500">{t.body_t ?? t.body}</div>
          <div className="text-xs text-gray-500">
            {t.authorName || "Anonymous"}
            {t.createdAt ? ` ・ ${new Date(t.createdAt).toLocaleString()}` : ""}
            {typeof t.postCount === "number" ? ` ・ ${t.postCount}件の返信` : ""}
          </div>
        </div>
      ))}
    </div>
  );
}

