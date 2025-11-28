"use client";

import { useRouter } from "next/navigation";
import { useState, FormEvent } from "react";

export default function CommentForm({ threadId }: { threadId: number }) {
  const router = useRouter();
  const [authorName, setAuthorName] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/threads/${threadId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorName: authorName.trim(), body: body.trim() }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "failed");
      setBody("");
      router.refresh(); // サーバー側の一覧を再取得
    } catch (e: any) {
      setErr(e?.message || "failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 max-w-xl">
      <input
        className="w-full rounded border px-3 py-2"
        placeholder="投稿者名（任意）"
        value={authorName}
        onChange={(e) => setAuthorName(e.target.value)}
        maxLength={40}
      />
      <textarea
        className="w-full rounded border px-3 py-2 min-h-[90px]"
        placeholder="コメントを書く…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={2000}
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={busy || !body.trim()}
          className="rounded bg-black text-white px-3 py-1.5 disabled:opacity-40"
        >
          {busy ? "送信中…" : "送信"}
        </button>
        {err && <span className="text-xs text-red-500">{err}</span>}
      </div>
    </form>
  );
}