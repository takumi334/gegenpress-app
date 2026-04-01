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
    formation?: string;
    assignments?: Record<
      string,
      { id?: number | string; name?: string; translatedName?: string; teamName?: string | null } | null
    >;
    slotNames?: Record<string, string>;
    slotPositions: Record<string, { x: number; y: number }>;
    ball?: { x: number; y: number };
    ballPosition?: { x: number; y: number } | null;
    drawPaths?: { id: string; points: { x: number; y: number }[] }[];
    strokes?: DrawingStroke[];
    timestamp?: number;
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
        const assigned = first.assignments?.[slotCode];
        const name = (slotNames[slotCode]?.trim() ||
          assigned?.translatedName?.trim() ||
          assigned?.name?.trim() ||
          "");
        return {
          slotCode,
          playerName: name,
          ...(assigned?.translatedName ? { translatedName: assigned.translatedName } : {}),
          x: pos.x,
          y: pos.y,
          label: role,
        };
      })
    : [];

  const animationFrames = payload.frames.map((f) => ({
    formation: f.formation ?? formation,
    assignments: f.assignments,
    slotNames: f.slotNames,
    slotPositions: f.slotPositions,
    ballPosition: f.ballPosition ?? (f.ball ? { x: f.ball.x, y: f.ball.y } : null),
    strokes: f.strokes
      ? f.strokes.map((s) => ({
          ...s,
          points: s.points.map((pt) => ({ ...pt })),
        }))
      : (f.drawPaths ?? []).map(
          (p): DrawingStroke => ({ color: "red", points: p.points.map((pt) => ({ ...pt })) })
        ),
    timestamp: f.timestamp,
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
