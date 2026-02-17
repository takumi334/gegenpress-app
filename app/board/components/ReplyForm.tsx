// app/board/components/ReplyForm.tsx
"use client";

import { useEffect, useState } from "react";

type Props = {
  threadId: number;
};

type Reply = {
  id: number;
  author: string | null;
  body: string;
  createdAt: string;
};

export default function ReplyForm({ threadId }: Props) {
  const [author, setAuthor] = useState("");
  const [body, setBody] = useState("");
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // 初回ロード時に返信一覧を取得
  useEffect(() => {
    let cancelled = false;

    async function fetchReplies() {
      try {
        const res = await fetch(`/api/posts?threadId=${threadId}`);
        if (!res.ok) throw new Error("failed to load replies");
        const data = (await res.json()) as Reply[];
        if (!cancelled) {
          setReplies(data);
        }
      } catch (e) {
        console.error("load replies error", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchReplies();
    return () => {
      cancelled = true;
    };
  }, [threadId]);

  // 返信送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || sending) return;

    setSending(true);
    try {
      if (!Number.isFinite(threadId)) {
  console.error("invalid threadId", threadId);
  return;
}

const res = await fetch("/api/posts", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    threadId,
    authorName: author.trim() || undefined,
    body: body.trim(),
  }),
});

const data = await res.json().catch(() => null);

if (!res.ok || !data) {
  console.error("reply failed", res.status, data);
  return;
}

      setReplies((prev) => [...prev, data]);
      setBody("");
    } catch (e) {
      console.error("reply submit error", e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-2 space-y-2 text-sm">
      {/* 入力フォーム */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="名前（任意）"
          className="w-full rounded border border-white/20 bg-black/40 px-2 py-1 text-xs"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="返信を書く…"
          className="w-full rounded border border-white/20 bg-black/40 px-2 py-1 text-xs"
          rows={2}
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="rounded bg-white/10 px-3 py-1 text-xs hover:bg-white/20 disabled:opacity-40"
        >
          返信する
        </button>
      </form>

      {/* 返信一覧 */}
      <div className="mt-1 space-y-1">
        {loading ? (
          <p className="text-xs text-white/60">読み込み中…</p>
        ) : replies.length === 0 ? (
          <p className="text-xs text-white/60">まだ返信はありません。</p>
        ) : (
          replies.map((r) => (
            <div
              key={`${threadId}-${r.id}`}
              className="rounded border border-white/10 bg-black/30 px-2 py-1 text-xs"
            >
              <div className="flex justify-between text-[10px] text-white/60">
                <span>{r.author ?? "匿名"}</span>
                <span>
                  {new Date(r.createdAt).toLocaleString("ja-JP", {
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              {/* ▼ 本文：翻訳 + 文法ヒント */}
              <div
                className="mt-1 whitespace-pre-wrap text-xs"
                data-grammar="true"
                data-grammar-src={r.body}
                data-i18n="1"
                data-i18n-src={r.body}
              >
                {r.body}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

