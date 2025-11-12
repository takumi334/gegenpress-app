"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PostComposer({ threadId }: { threadId: string }) {
  const router = useRouter();
  const [authorName, setAuthorName] = useState("");
  const [body, setBody] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;

    await fetch(`/api/threads/${threadId}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorName, body }),
    });

    setBody("");
    router.refresh(); // ← これが一覧再取得のトリガー！
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="投稿者名（任意）"
        value={authorName}
        onChange={(e) => setAuthorName(e.target.value)}
        className="border px-2 py-1 rounded w-full"
      />
      <textarea
        placeholder="コメントを入力..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="border px-2 py-1 rounded w-full mt-2"
      />
      <button
        type="submit"
        className="bg-black text-white px-4 py-2 rounded mt-2"
      >
        送信
      </button>
    </form>
  );
}

