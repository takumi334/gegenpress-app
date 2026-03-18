"use client";

import type { FormationDef, Slot } from "@/lib/formations";
import type { PlayerChipData } from "./PlayerChip";
import type { DrawingStroke } from "@/lib/tacticsPlacements";
import SoccerPitch from "./SoccerPitch";
import DraggablePlacementMarker from "./DraggablePlacementMarker";
import TacticsDrawingCanvas from "./TacticsDrawingCanvas";

export type TacticsSlotAssignments = Record<string, PlayerChipData | null>;

export type SlotPositions = Record<string, { x: number; y: number }>;
export type BallPosition = { x: number; y: number } | null;

type PenColor = "red" | "blue" | "erase";

type TacticsPitchBoardProps = {
  formation: FormationDef;
  assignments: TacticsSlotAssignments;
  slotPositions?: SlotPositions;
  onSlotPositionChange?: (slotCode: string, x: number, y: number) => void;
  onClearSlot?: (positionCode: string) => void;
  placementModeActive?: boolean;
  strokes?: DrawingStroke[];
  onStrokesChange?: (strokes: DrawingStroke[]) => void;
  penColor?: PenColor;
  penModeActive?: boolean;
  ballPosition?: BallPosition;
  onBallPositionChange?: (x: number, y: number) => void;
};

function getSlotPosition(slot: Slot, slotPositions?: SlotPositions) {
  const custom = slotPositions?.[slot.code];
  return custom ?? { x: slot.x, y: slot.y };
}

export default function TacticsPitchBoard({
  formation,
  assignments,
  slotPositions = {},
  onSlotPositionChange,
  onClearSlot,
  placementModeActive = true,
  strokes = [],
  onStrokesChange,
  penColor = "red",
  penModeActive = false,
  ballPosition,
  onBallPositionChange,
}: TacticsPitchBoardProps) {
  const MIN = 3;
  const MAX = 97;

  const handleBallPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!placementModeActive || !onBallPositionChange) return;
      e.preventDefault();
      const target = e.currentTarget.closest("[data-pitch-container]") as HTMLElement | null;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const start = { px: e.clientX, py: e.clientY, x: ballPosition?.x ?? 50, y: ballPosition?.y ?? 50 };

      const onMove = (moveEvent: PointerEvent) => {
        const dxPct = ((moveEvent.clientX - start.px) / rect.width) * 100;
        const dyPct = ((moveEvent.clientY - start.py) / rect.height) * 100;
        let nx = start.x + dxPct;
        let ny = start.y + dyPct;
        nx = Math.max(MIN, Math.min(MAX, nx));
        ny = Math.max(MIN, Math.min(MAX, ny));
        onBallPositionChange(nx, ny);
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [placementModeActive, onBallPositionChange, ballPosition]
  );

  return (
    <div
      data-pitch-container
      className="relative w-full rounded-xl overflow-hidden border-2 border-gray-600 shadow-lg"
      style={{ aspectRatio: "68/105", maxWidth: 400 }}
    >
      <div className="absolute inset-0 flex items-center justify-center p-1">
        <SoccerPitch className="max-w-full max-h-full object-contain" />
      </div>

      {onStrokesChange && (
        <TacticsDrawingCanvas
          strokes={strokes}
          onChange={onStrokesChange}
          penColor={penColor}
          enabled={penModeActive}
        />
      )}

      {formation.slots.map((slot: Slot) => {
        const pos = getSlotPosition(slot, slotPositions);
        return (
          <DraggablePlacementMarker
            key={slot.code}
            slotCode={slot.code}
            slotLabel={slot.label}
            player={assignments[slot.code] ?? null}
            x={pos.x}
            y={pos.y}
            onPositionChange={onSlotPositionChange ?? (() => {})}
            onClear={onClearSlot}
            enabled={placementModeActive}
          />
        );
      })}

      {ballPosition && (
        <div
          className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3b82f6] border-2 border-white shadow-md cursor-grab active:cursor-grabbing touch-none z-20"
          style={{ left: `${ballPosition.x}%`, top: `${ballPosition.y}%` }}
          onPointerDown={handleBallPointerDown}
        />
      )}
    </div>
  );
}
