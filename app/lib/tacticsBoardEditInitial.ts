/**
 * 保存済み TacticsBoardData → TacticsLineupBuilder の初期値
 */

import type { FormationId } from "@/lib/formations";
import type { TacticsBoardData } from "@/lib/tacticsPlacements";
import type { DrawingStroke } from "@/lib/tacticsPlacements";
import type {
  TacticsSlotAssignments,
  SlotPositions,
  BallPosition,
} from "@components/lineup/TacticsPitchBoard";
import { TACTICS_MOCK_PLAYERS } from "@/lib/tacticsPlayers";

export type BuilderInitialFromBoard = {
  formation: FormationId;
  assignments: TacticsSlotAssignments;
  initialAnimationFrames: {
    formation?: FormationId;
    assignments?: TacticsSlotAssignments;
    slotPositions: SlotPositions;
    ballPosition: BallPosition;
    strokes: DrawingStroke[];
    timestamp?: number;
  }[];
  initialCurrentFrame: number;
};

function cloneStrokes(strokes: DrawingStroke[]): DrawingStroke[] {
  return strokes.map((s) => ({
    ...s,
    points: s.points.map((p) => ({ ...p })),
  }));
}

export function tacticsBoardDataToBuilderInitial(
  data: TacticsBoardData | null | undefined
): BuilderInitialFromBoard | null {
  if (!data) return null;

  const formation = (data.formation ?? "4-3-3") as FormationId;
  const placements = data.placements ?? [];

  const assignments: TacticsSlotAssignments = {};
  for (const pl of placements) {
    const match = TACTICS_MOCK_PLAYERS.find(
      (p) =>
        p.name === pl.playerName ||
        (pl.translatedName != null && pl.translatedName !== "" && p.name === pl.translatedName)
    );
    if (match) {
      assignments[pl.slotCode] = {
        id: match.id,
        name: match.name,
        translatedName: match.translatedName,
        teamName: match.teamName ?? null,
      };
    }
  }

  const anim = data.animationFrames;
  if (anim && anim.length > 0) {
    const initialAnimationFrames = [0, 1, 2, 3].map((idx) => {
      const fr = anim[idx] ?? anim[anim.length - 1];
      return {
        formation: (fr.formation ?? formation) as FormationId,
        assignments: (fr.assignments as TacticsSlotAssignments | undefined) ?? assignments,
        slotPositions: { ...fr.slotPositions },
        ballPosition: fr.ballPosition ?? { x: 50, y: 50 },
        strokes: cloneStrokes(fr.strokes ?? []),
        timestamp: fr.timestamp,
      };
    });
    const cf = data.currentFrame ?? 0;
    return {
      formation,
      assignments,
      initialAnimationFrames,
      initialCurrentFrame: Math.min(3, Math.max(0, cf)),
    };
  }

  const slotPositions: SlotPositions = {};
  for (const pl of placements) {
    if (pl.x != null && pl.y != null) {
      slotPositions[pl.slotCode] = { x: pl.x, y: pl.y };
    }
  }
  const strokes = cloneStrokes(data.drawingData?.strokes ?? []);
  const initialAnimationFrames = [0, 1, 2, 3].map((idx) => ({
    slotPositions: { ...slotPositions },
    ballPosition: { x: 50, y: 50 },
    strokes: idx === 0 ? strokes : [],
  }));

  return {
    formation,
    assignments,
    initialAnimationFrames,
    initialCurrentFrame: Math.min(3, Math.max(0, data.currentFrame ?? 0)),
  };
}
