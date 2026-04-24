"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useT } from "@/lib/NativeLangProvider";
import type { LineupTacticPayload } from "@/lib/lineupTacticData";

export default function NewThreadForm({ teamId }: { teamId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useT();
  const [authorName, setAuthorName] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [hasPendingTactic, setHasPendingTactic] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [pendingTacticPayload, setPendingTacticPayload] = useState<LineupTacticPayload | null>(null);
  const [resolvedTeamId, setResolvedTeamId] = useState(teamId);

  useEffect(() => {
    const seg = pathname?.split("/").filter(Boolean) ?? [];
    const boardIdx = seg.indexOf("board");
    const teamFromPath = boardIdx >= 0 ? seg[boardIdx + 1] : "";
    const normalized = (teamFromPath || teamId || "").trim();
    if (normalized) setResolvedTeamId(normalized);
  }, [pathname, teamId]);

  useEffect(() => {
    setAuthorName("");
    setTitle("");
    setBody("");
    setMessage("");
    setHasPendingTactic(false);
    setPreviewImage(null);
    setPendingTacticPayload(null);
  }, [resolvedTeamId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!resolvedTeamId) return;
    sessionStorage.setItem("lastBoardPath", `/board/${resolvedTeamId}`);
  }, [resolvedTeamId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem("pendingTacticPost");
    if (!raw) return;
    setHasPendingTactic(true);
    try {
      const data = JSON.parse(raw) as LineupTacticPayload & { previewImage?: string };
      if (data?.previewImage && typeof data.previewImage === "string") {
        setPreviewImage(data.previewImage);
      }
      setPendingTacticPayload({
        formation: data?.formation,
        currentFrame: data?.currentFrame,
        frames: data?.frames,
        slotNames: data?.slotNames,
        source: "lineup-builder",
        previewImage: data?.previewImage,
      });
      setBody("");
    } catch (e) {
      console.error("Failed to parse pendingTacticPost", e);
    } finally {
      sessionStorage.removeItem("pendingTacticPost");
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!title?.trim()) {
      setMessage(t("newThread.requiredMessage"));
      return;
    }

    const bodyText = body.trim();
    const payload: {
      teamId: string;
      boardSlug: string;
      title: string;
      body: string;
      authorName?: string;
      threadType: string;
      tacticPayload?: LineupTacticPayload;
    } = {
      teamId: resolvedTeamId,
      boardSlug: resolvedTeamId,
      title: title.trim(),
      body: bodyText,
      authorName: authorName.trim() || undefined,
      threadType: "GENERAL",
    };
    if (pendingTacticPayload?.frames?.length) {
      payload.tacticPayload = {
        ...pendingTacticPayload,
        previewImage: previewImage ?? undefined,
      };
    }

    try {
      const res = await fetch("/api/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data?.id) {
        throw new Error(data?.error || t("newThread.postFailed"));
      }

      const threadId = Number(data.id);
      if (!Number.isInteger(threadId)) {
        throw new Error("Invalid thread id in response");
      }
      // 作成直後にスレッド詳細へ（正しい threadId でリダイレクト）
      router.push(`/board/${resolvedTeamId}/thread/${threadId}`);
    } catch (err: any) {
      console.error(err);
      setMessage(t("newThread.postFailed") + ": " + err.message);
    }
  }

  // …フォームUIはそのまま…
  // 2025/11/27 とりあえずUI追加
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block">
          {t("newThread.nameLabel")}:
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
          {t("newThread.titleLabel")}:
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
          {t("newThread.threadLabel")}:
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full border px-2 py-1 min-h-[100px]"
          />
        </label>
        {hasPendingTactic && (
          <p className="mt-1 text-xs text-gray-600">
            lineup-builder から戦術メモが読み込まれました。必要に応じて編集してください。
          </p>
        )}
        {previewImage && (
          <div className="mt-3">
            <p className="text-xs text-gray-600 mb-1">この戦術画像も一緒に投稿されます。</p>
            <img
              src={previewImage}
              alt="戦術プレビュー"
              className="max-w-full border rounded shadow-sm"
            />
          </div>
        )}
      </div>
      {message && <div className="text-sm text-red-600">{message}</div>}
      <div>
        <button type="submit" className="px-3 py-1 border rounded">
          {t("newThread.submit")}
        </button>
      </div>
    </form>
  );
}