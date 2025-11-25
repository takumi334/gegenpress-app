"use client";

import { useEffect, useState } from "react";

type Item = {
  id: string;
  title: string;
  authorName?: string | null;
  createdAt?: string;   // ISO 文字列で受ける
  postCount?: number;
};

type Props = { teamId: string };

export default function ThreadList({ teamId }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [err, setErr] = useState("");

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
          : [];
        
        //titleと本文をlocaleに合わせて翻訳する処理を追加予定
        //未実装

        if (alive) setItems(list);
      } catch (e: any) {
        if (alive) setErr(e?.message || "load failed");
      }
    })();
    return () => {
      alive = false;
    };
  }, [teamId]);

  if (err) return <div className="text-red-600">Error: {err}</div>;
  if (!items.length) return <div className="text-sm text-gray-600">まだ投稿がありません。</div>;

  return (
    <div className="border rounded divide-y">
      {items.map((t) => (
        <div key={t.id} className="p-2">
          <div className="font-semibold">{t.title}</div>
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

