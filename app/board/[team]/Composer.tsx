"use client";

import React, { useState } from "react";

type Props = { team: string };

export default function Composer({ team }: Props) {
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<"post" | "question">("post");
  const [sending, setSending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;

    setSending(true);
    try {
      const res = await fetch(`/board/${team}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: kind, // "post" or "question"
          body: text,
        }),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));

      setBody("");
      alert(kind === "question" ? "質問を投稿しました" : "投稿しました");
    } catch (err: any) {
      alert(`送信に失敗しました: ${err?.message ?? String(err)}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border p-4 space-y-3">
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-1">
          <input
            type="radio"
            name="kind"
            value="post"
            checked={kind === "post"}
            onChange={() => setKind("post")}
          />
          投稿
        </label>
        <label className="flex items-center gap-1">
          <input
            type="radio"
            name="kind"
            value="question"
            checked={kind === "question"}
            onChange={() => setKind("question")}
          />
          質問
        </label>
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="チームに関する投稿/質問をどうぞ"
        rows={4}
        className="w-full resize-y rounded-md border p-3 outline-none focus:ring"
      />

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {sending ? "送信中…" : "送信"}
        </button>
      </div>
    </form>
  );
}

