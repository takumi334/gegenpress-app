"use client";

import { useState } from "react";

type LikeButtonProps = {
  threadId: number;
  initialCount?: number;
};

export default function LikeButton({
  threadId,
  initialCount = 0,
}: LikeButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    if (pending) return;

    const prev = count;
    setPending(true);
    setCount(prev + 1); // 楽観的更新

    try {
      const res = await fetch(`/api/threads/${threadId}/likes`, {
        method: "POST",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || typeof data.likes !== "number") {
        // 失敗したら元に戻す
        setCount(prev);
        console.error("like failed", res.status, data?.error);
        return;
      }

      // サーバーが返した正確な値で上書き
      setCount(data.likes);
    } catch (e) {
      console.error("like error", e);
      setCount(prev);
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="inline-flex items-center gap-1 rounded-full border border-white/30 px-3 py-1 text-xs hover:bg-white/10 disabled:opacity-60"
    >
      <span>👍</span>
      <span>{count}</span>
    </button>
  );
}

