"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

// ------- types -------
type Post = {
  id: string;
  authorName: string | null;
  body: string;
  createdAt: string; // APIからはISO文字列で来る想定
};

type ThreadData = {
  id: string;
  title: string;
  teamId: string;
  posts: Post[];
};

// ------- component -------
export default function ThreadView({
  teamId,
  threadId,
}: {
  teamId: string;
  threadId: string;
}) {
  const [data, setData] = useState<ThreadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/threads/${threadId}`, { cache: "no-store" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error || `HTTP ${r.status}`);
      }
      const j: ThreadData = await r.json();
      setData(j);
    } catch (e: any) {
      setErr(e?.message || "読み込みに失敗しました");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    if (!threadId) return;
    load();
  }, [threadId, load]);

  if (loading) return <div className="p-4 text-sm opacity-70">読み込み中…</div>;
  if (err) return <div className="p-4 text-sm text-red-600">エラー: {err}</div>;
  if (!data?.id) return <div className="p-4 text-sm opacity-70">スレッドが見つかりません。</div>;

  return (
    <main className="p-4 space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-bold">{data.title}</h1>
        <div className="text-xs opacity-60">投稿数: {data.posts.length}</div>
      </header>

      <ul className="space-y-2">
        {data.posts.length === 0 ? (
          <li className="text-sm opacity-70">まだ投稿がありません。</li>
        ) : (
          data.posts.map((p) => (
            <li key={p.id} className="border p-2 rounded">
              <div className="text-xs opacity-60">
                {p.authorName || "名無し"}・{new Date(p.createdAt).toLocaleString()}
              </div>
              <div className="whitespace-pre-wrap">{p.body}</div>
            </li>
          ))
        )}
      </ul>

      <ReplyForm
        threadId={threadId}
        onPosted={load}
      />

      <div>
        <a className="underline text-sm opacity-70" href={`/board/${teamId}`}>
          ← 掲示板に戻る
        </a>
      </div>
    </main>
  );
}

// ------- reply form -------
function ReplyForm({
  threadId,
  onPosted,
}: {
  threadId: string;
  onPosted: () => void;
}) {
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = useMemo(() => body.trim().length > 0, [body]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/threads/${threadId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorName: name.trim() || null, body: body.trim() }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);

      // 送信成功
      setBody("");
      onPosted(); // 再読み込み
    } catch (e: any) {
      setErr(e?.message || "送信に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2 p-3 border rounded">
      <input
        className="w-full border px-2 py-1"
        placeholder="表示名（任意）"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <textarea
        className="w-full border px-2 py-1 min-h-[100px]"
        placeholder="本文"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      {err && <div className="text-sm text-red-600">{err}</div>}
      <button disabled={!canSubmit || busy} className="px-3 py-1 border rounded">
        {busy ? "送信中…" : "返信する"}
      </button>
    </form>
  );
}

