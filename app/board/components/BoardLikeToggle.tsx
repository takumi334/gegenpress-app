"use client";

import { useEffect, useState } from "react";
import { getOrCreateAnonId } from "@/lib/anonId";

export type BoardLikeKind = "thread" | "post";

type BoardLikeToggleProps = {
  kind: BoardLikeKind;
  targetId: number;
  initialLikeCount: number;
  initialLikedByMe: boolean;
  /** 掲示板ダーク背景向け（既定） / 明るいカード内なら false */
  variant?: "dark" | "light";
};

function likeEndpoint(kind: BoardLikeKind, targetId: number): string {
  return kind === "thread"
    ? `/api/threads/${targetId}/likes`
    : `/api/comments/${targetId}/like`;
}

/**
 * スレッド／リプライ（投稿）共通の Like トグル。anonId は localStorage。
 * 未 Like: ♡ / Like 済: ♥（件数付き）
 */
export default function BoardLikeToggle({
  kind,
  targetId,
  initialLikeCount,
  initialLikedByMe,
  variant = "dark",
}: BoardLikeToggleProps) {
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [likedByMe, setLikedByMe] = useState(initialLikedByMe);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setLikeCount(initialLikeCount);
    setLikedByMe(initialLikedByMe);
  }, [initialLikeCount, initialLikedByMe]);

  const handleClick = async () => {
    if (pending) return;
    const prevCount = likeCount;
    const prevLiked = likedByMe;
    setPending(true);
    setLikeCount((c) => (prevLiked ? c - 1 : c + 1));
    setLikedByMe((v) => !v);

    try {
      const anonId = getOrCreateAnonId();
      if (!anonId) {
        setLikeCount(prevCount);
        setLikedByMe(prevLiked);
        setPending(false);
        return;
      }
      const res = await fetch(likeEndpoint(kind, targetId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonId }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || typeof data.likeCount !== "number") {
        setLikeCount(prevCount);
        setLikedByMe(prevLiked);
        console.error("like failed", kind, res.status, data?.error);
        return;
      }
      setLikeCount(data.likeCount);
      setLikedByMe(Boolean(data.likedByMe));
    } catch (e) {
      console.error("like error", e);
      setLikeCount(prevCount);
      setLikedByMe(prevLiked);
    } finally {
      setPending(false);
    }
  };

  const dark = variant === "dark";
  const style = likedByMe
    ? dark
      ? "border-rose-400/70 bg-rose-500/20 text-rose-100"
      : "border-rose-400/80 bg-rose-50 text-rose-800"
    : dark
      ? "border-white/45 bg-white/[0.06] text-white hover:bg-white/12"
      : "border-gray-400 bg-white text-gray-800 hover:bg-gray-50";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm tabular-nums font-medium disabled:opacity-50 ${style}`}
      aria-pressed={likedByMe}
      aria-label={likedByMe ? `いいねを解除（${likeCount}）` : `いいねする（現在 ${likeCount}）`}
    >
      <span className="select-none text-base leading-none" aria-hidden>
        {likedByMe ? "♥" : "♡"}
      </span>
      <span>{likeCount}</span>
    </button>
  );
}
