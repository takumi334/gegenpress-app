"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewThreadForm({ teamId }: { teamId: string/* 2025/11/27 numberから修正 */ }) {
  const router = useRouter();
  const [authorName, setAuthorName] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!title || !body) {
      setMessage("タイトルと本文を入力してください");
      return;
    }

    try {
      const res = await fetch("/api/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          title,
          body,
          authorName: authorName.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.id) {
        throw new Error(data?.error || "thread id を取得できませんでした");
      }

      // ✅ 作成直後にスレッド詳細へ
      router.push(`/board/${teamId}/thread/${data.id}`);
    } catch (err: any) {
      console.error(err);
      setMessage("投稿失敗: " + err.message);
    }
  }

  // …フォームUIはそのまま…
  // 2025/11/27 とりあえずUI追加
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block">
          名前（任意）:
          <input
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            className="w-full border px-2 py-1"
          />
        </label>
      </div>
      <div>
        <label className="block">
          タイトル:
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border px-2 py-1"
          />
        </label>
      </div>
      <div>
        <label className="block">
          本文:
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full border px-2 py-1 min-h-[100px]"
          />
        </label>
      </div>
      {message && <div className="text-sm text-red-600">{message}</div>}
      <div>
        <button type="submit" className="px-3 py-1 border rounded">
          投稿する
        </button>
      </div>
    </form>
  );
}