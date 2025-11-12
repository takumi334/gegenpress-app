"use client";

import { useState, useEffect } from "react";

export default function BoardClient({
  teamId,
  teamName,
}: {
  teamId: string;
  teamName: string;
}) {
  const [threads, setThreads] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");

  // 投稿一覧取得
  const fetchThreads = async () => {
    const res = await fetch(`/api/threads?teamId=${teamId}`);
    if (res.ok) {
      const data = await res.json();
      // ✅ 投稿日時が新しい順に並べ替える
      setThreads(
        data.sort(
          (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      );
    }
  };

  useEffect(() => {
    fetchThreads();
  }, [teamId]);

  // 投稿ボタン
  const handlePost = async () => {
    if (!body.trim()) return;
    await fetch(`/api/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, name, body }),
    });
    setBody("");
    // ✅ 再取得して最新順更新
    fetchThreads();
  };

  return (
    <section className="border rounded p-3 mt-8 bg-white shadow-sm">
      <h3 className="text-lg font-semibold mb-2">{teamName} 掲示板</h3>
      <div className="flex flex-col gap-2 mb-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Display name (optional)…"
          className="border p-1 rounded text-sm"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your post…"
          className="border p-1 rounded text-sm min-h-[60px]"
        />
        <button
          onClick={handlePost}
          className="bg-blue-600 text-white text-sm rounded px-3 py-1 self-start"
        >
          投稿
        </button>
      </div>

      {threads.length === 0 ? (
        <p className="text-sm opacity-70">まだ投稿がありません。</p>
      ) : (
        <ul className="space-y-2">
          {threads.map((t) => (
            <li key={t.id} className="border-t pt-2">
              <div className="text-xs opacity-60 mb-1">
                {t.name || "名無しさん"}・
                {new Date(t.createdAt).toLocaleString()}
              </div>
              <div className="text-sm">{t.body}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

