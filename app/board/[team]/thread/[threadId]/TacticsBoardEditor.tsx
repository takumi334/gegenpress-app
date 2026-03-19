"use client";

import { useCallback, useState } from "react";
import TacticsLineupBuilder from "@components/lineup/TacticsLineupBuilder";
import { useT } from "@/lib/NativeLangProvider";
import type { LineupBuilderData } from "@components/lineup/TacticsLineupBuilder";
import { TACTICS_MOCK_PLAYERS } from "@/lib/tacticsPlayers";
import { assignmentsToPlacements } from "@/lib/tacticsPlacements";
import { getFormation } from "@/lib/formations";
import type { FormationId } from "@/lib/formations";
import type { TacticsSlotAssignments } from "@components/lineup/TacticsPitchBoard";
import type { DrawingStroke } from "@/lib/tacticsPlacements";
import type { SlotPositions, BallPosition } from "@components/lineup/TacticsPitchBoard";

export type TacticsBoardEditorProps = {
  teamId: string;
  threadId: string;
  onSaved: () => void;
  variant?: "full" | "compact";
  /** 指定時は PATCH で既存ボードを更新 */
  editBoardId?: number;
  initialTitle?: string;
  initialBody?: string;
  initialFormation?: FormationId;
  initialAssignments?: TacticsSlotAssignments;
  initialAnimationFrames?: {
    slotPositions: SlotPositions;
    ballPosition: BallPosition;
    strokes: DrawingStroke[];
  }[];
  initialCurrentFrame?: number;
};

export function TacticsBoardEditor({
  teamId,
  threadId,
  onSaved,
  variant = "full",
  editBoardId,
  initialTitle = "",
  initialBody = "",
  initialFormation = "4-3-3",
  initialAssignments = {},
  initialAnimationFrames,
  initialCurrentFrame = 0,
}: TacticsBoardEditorProps) {
  const t = useT();
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const firstFrameIdx =
    initialAnimationFrames && initialAnimationFrames.length > 0
      ? Math.min(initialCurrentFrame, initialAnimationFrames.length - 1)
      : 0;
  const [lineupData, setLineupData] = useState<LineupBuilderData>({
    formation: initialFormation,
    assignments: initialAssignments,
    slotPositions: initialAnimationFrames?.[firstFrameIdx]?.slotPositions ?? {},
    strokes: initialAnimationFrames?.[firstFrameIdx]?.strokes ?? [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLineupChange = useCallback((data: LineupBuilderData) => {
    setLineupData(data);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { formation, assignments, slotPositions, strokes, frames, currentFrame } = lineupData;
      const formationDef = getFormation(formation);
      const placements = assignmentsToPlacements(
        assignments,
        slotPositions,
        formationDef.slots.map((s) => ({ code: s.code, x: s.x, y: s.y }))
      );
      const dataPayload: {
        formation: string;
        placements: ReturnType<typeof assignmentsToPlacements>;
        drawingData?: { strokes: typeof strokes };
        animationFrames?: { slotPositions: typeof slotPositions; ballPosition: { x: number; y: number } | null; strokes: typeof strokes }[];
        currentFrame?: number;
      } = { formation, placements };
      if (strokes.length > 0) {
        dataPayload.drawingData = { strokes };
      }
      if (frames && frames.length > 0) {
        dataPayload.animationFrames = frames as any;
        dataPayload.currentFrame = currentFrame;
      }
      const anyFrameStrokes = frames?.some((f) => (f.strokes?.length ?? 0) > 0) ?? false;
      const hasContent = placements.length > 0 || strokes.length > 0 || anyFrameStrokes;
      const url = editBoardId
        ? `/api/threads/${threadId}/tactics-boards/${editBoardId}`
        : `/api/threads/${threadId}/tactics-boards`;
      const res = await fetch(url, {
        method: editBoardId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || null,
          body: body.trim() || null,
          data: hasContent ? dataPayload : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("tactics.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  if (variant === "compact") {
    return (
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          className="w-full border px-2 py-1 min-h-[80px] text-sm"
          placeholder={t("tactics.memoPlaceholder")}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={saving} className="px-3 py-1 border rounded text-sm">
          {saving ? t("tactics.saving") : t("tactics.save")}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
        {editBoardId ? t("tactics.editBoard") : t("tactics.title")}
      </h2>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t("tactics.titleOptional")}
        </label>
        <input
          type="text"
          className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          placeholder={t("tactics.titlePlaceholder")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t("tactics.lineupLabel")}
        </h3>
        <TacticsLineupBuilder
          key={editBoardId != null ? `edit-${editBoardId}` : "create"}
          players={TACTICS_MOCK_PLAYERS}
          initialFormation={initialFormation}
          initialAssignments={initialAssignments}
          initialAnimationFrames={initialAnimationFrames}
          initialCurrentFrame={initialCurrentFrame}
          onChange={handleLineupChange}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t("tactics.noteLabel")}
        </label>
        <textarea
          className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 min-h-[100px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          placeholder={t("tactics.notePlaceholder")}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="px-4 py-2 rounded font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
      >
        {saving ? t("tactics.saving") : editBoardId ? t("tactics.updateSubmit") : t("tactics.submit")}
      </button>
    </form>
  );
}
