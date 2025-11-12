"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewThreadForm({ teamId }: { teamId: number }) {
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
}

