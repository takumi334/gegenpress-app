"use client";

import { useDroppable } from "@dnd-kit/core";
import type { Slot } from "@/lib/formations";
import type { PlayerLite } from "@/lib/lineupPlayers";
import PlayerCard from "./PlayerCard";

type FormationSlotProps = {
  slot: Slot;
  player: PlayerLite | null;
  onClear?: (positionCode: string) => void;
};

export default function FormationSlot({ slot, player, onClear }: FormationSlotProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot-${slot.code}`,
    data: { type: "slot", positionCode: slot.code },
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        absolute w-14 h-14 -translate-x-1/2 -translate-y-1/2
        flex items-center justify-center
        rounded-full border-2 border-dashed min-w-0
        ${isOver ? "border-green-500 bg-green-100/80" : "border-gray-400 bg-white/90"}
      `}
      style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
    >
      {player ? (
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="absolute inset-0 flex items-center justify-center scale-75">
            <PlayerCard player={player} compact />
          </div>
          {onClear && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear(slot.code);
              }}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600"
              aria-label="ポジションを解除"
            >
              ×
            </button>
          )}
        </div>
      ) : (
        <span className="text-xs text-gray-500 font-medium">{slot.label}</span>
      )}
    </div>
  );
}
