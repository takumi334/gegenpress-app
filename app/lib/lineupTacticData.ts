/**
 * lineup-builder の戦術ペイロードを TacticsBoardData 形式に変換
 * TacticsLineupView で表示するため
 */

import { getFormation } from "@/lib/formations";
import type { FormationId } from "@/lib/formations";
import type { TacticsBoardData } from "@/lib/tacticsPlacements";
import type { DrawingStroke } from "@/lib/tacticsPlacements";

export type LineupTacticPayload = {
  formation?: string;
  currentFrame?: number;
  frames?: {
    slotPositions: Record<string, { x: number; y: number }>;
    ball: { x: number; y: number };
    drawPaths: { id: string; points: { x: number; y: number }[] }[];
  }[];
  /** スロット別の選手名・表示名（保存時に引き継ぐ） */
  slotNames?: Record<string, string>;
  source?: string;
  previewImage?: string;
};

/**
 * lineup-builder 保存形式 → TacticsBoardData
 * フレームごとは位置(x,y)のみ更新し、名前・役割は placements で共通保持する。
 */
export function lineupPayloadToTacticsBoardData(
  payload: LineupTacticPayload | null | undefined
): TacticsBoardData | null {
  if (!payload?.frames?.length) return null;

  const formation = payload.formation ?? "4-3-3";
  const first = payload.frames[0];
  const formationDef = getFormation((formation ?? "4-3-3") as FormationId);
  const slotNames = payload.slotNames ?? {};

  const placements = first
    ? Object.entries(first.slotPositions).map(([slotCode, pos]) => {
        const role = formationDef.slots.find((s) => s.code === slotCode)?.label ?? slotCode;
        const name = slotNames[slotCode]?.trim() ?? "";
        return {
          slotCode,
          playerName: name,
          x: pos.x,
          y: pos.y,
          label: role,
        };
      })
    : [];

  const animationFrames = payload.frames.map((f) => ({
    slotPositions: f.slotPositions,
    ballPosition: f.ball ? { x: f.ball.x, y: f.ball.y } : null,
    strokes: (f.drawPaths ?? []).map(
      (p): DrawingStroke => ({ color: "red", points: p.points.map((pt) => ({ ...pt })) })
    ),
  }));

  return {
    formation,
    placements,
    currentFrame: payload.currentFrame ?? 0,
    animationFrames,
    drawingData:
      animationFrames[0]?.strokes?.length > 0
        ? { strokes: animationFrames[0].strokes }
        : undefined,
  };
}
