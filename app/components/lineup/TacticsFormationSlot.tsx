"use client";

import { useDroppable } from "@dnd-kit/core";
import type { Slot } from "@/lib/formations";
import type { PlayerChipData } from "./PlayerChip";
import PlayerChip from "./PlayerChip";

type TacticsFormationSlotProps = {
  slot: Slot;
  player: PlayerChipData | null;
  onClear?: (positionCode: string) => void;
};

export default function TacticsFormationSlot({
  slot,
  player,
  onClear,
}: TacticsFormationSlotProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot-${slot.code}`,
    data: { type: "slot", positionCode: slot.code },
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        absolute w-16 h-16 -translate-x-1/2 -translate-y-1/2
        flex items-center justify-center
        rounded-full border-2 border-dashed min-w-0
        ${isOver ? "border-green-400 bg-green-900/50" : "border-gray-500 bg-gray-800/80"}
      `}
      style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
    >
      {player ? (
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="absolute inset-0 flex items-center justify-center scale-75">
            <PlayerChip player={player} />
          </div>
          {onClear && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear(slot.code);
              }}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center hover:bg-red-500"
              aria-label="ポジションを解除"
            >
              ×
            </button>
          )}
        </div>
      ) : (
        <span className="text-xs text-gray-400 font-medium">{slot.label}</span>
      )}
    </div>
  );
}
