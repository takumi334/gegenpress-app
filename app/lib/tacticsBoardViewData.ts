/**
 * API / DB の tactics board JSON を TacticsLineupView・編集初期化用のビューデータに揃える
 */

import { lineupPayloadToTacticsBoardData, type LineupTacticPayload } from "@/lib/lineupTacticData";
import type { TacticsBoardData } from "@/lib/tacticsPlacements";

export function boardRecordDataToViewData(raw: unknown): TacticsBoardData | null {
  if (raw == null) return null;
  const payload = raw as
    | LineupTacticPayload
    | { placements?: unknown[]; drawingData?: { strokes?: unknown[] } }
    | null;
  const hasLegacy =
    (payload as { placements?: unknown[] })?.placements?.length ||
    (payload as { drawingData?: { strokes?: unknown[] } })?.drawingData?.strokes?.length;
  return (
    lineupPayloadToTacticsBoardData(payload as LineupTacticPayload) ??
    (hasLegacy ? (payload as TacticsBoardData) : null)
  );
}
