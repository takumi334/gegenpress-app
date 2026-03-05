"use client";

import { useState } from "react";
import { getOrCreateAnonId } from "@/lib/anonId";

type CommentLikeButtonProps = {
  commentId: number;
  initialLikeCount: number;
  initialLikedByMe: boolean;
};

export default function CommentLikeButton({
  commentId,
  initialLikeCount,
  initialLikedByMe,
}: CommentLikeButtonProps) {
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [likedByMe, setLikedByMe] = useState(initialLikedByMe);
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    if (pending) return;
    const prevCount = likeCount;
    const prevLiked = likedByMe;
    setPending(true);
    setLikeCount((c) => (prevLiked ? c - 1 : c + 1));
    setLikedByMe((v) => !v);

    try {
      const anonId = getOrCreateAnonId();
      const res = await fetch(`/api/comments/${commentId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonId }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || typeof data.likeCount !== "number") {
        setLikeCount(prevCount);
        setLikedByMe(prevLiked);
        console.error("comment like failed", res.status, data?.error);
        return;
      }
      setLikeCount(data.likeCount);
      setLikedByMe(data.likedByMe);
    } catch (e) {
      console.error("comment like error", e);
      setLikeCount(prevCount);
      setLikedByMe(prevLiked);
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs disabled:opacity-60 ${
        likedByMe ? "border-amber-400/60 bg-amber-500/20" : "border-white/30 hover:bg-white/10"
      }`}
      aria-pressed={likedByMe}
    >
      <span>👍</span>
      <span>Like</span>
      <span>{likeCount}</span>
    </button>
  );
}
