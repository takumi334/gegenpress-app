"use client";

import { useDroppable } from "@dnd-kit/core";
import type { PlayerLite } from "@/lib/lineupPlayers";

type DraggablePitchMarkerProps = {
  slotCode: string;
  label: string;
  playerName: string;
  player: PlayerLite | null;
  x: number;
  y: number;
  isDragging: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onTap?: () => void;
  onClear?: (positionCode: string) => void;
};

const MARKER_SIZE_PX = 44;

export default function DraggablePitchMarker({
  slotCode,
  label,
  playerName,
  player,
  x,
  y,
  isDragging,
  onPointerDown,
  onTap,
  onClear,
}: DraggablePitchMarkerProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${slotCode}`,
    data: { type: "slot", positionCode: slotCode },
  });

  const nameDisplay = playerName.trim() || (player ? (player.translatedName ?? player.name) : "");
  const nameTruncated = nameDisplay.length > 8 ? `${nameDisplay.slice(0, 7)}…` : nameDisplay;

  return (
    <div
      ref={setNodeRef}
      className={`
        absolute flex flex-col items-center
        select-none cursor-grab active:cursor-grabbing touch-none
        ${isOver ? "ring-2 ring-green-400 ring-offset-2 ring-offset-transparent rounded-full" : ""}
        ${isDragging ? "scale-105 opacity-95 z-20" : "z-10"}
      `}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, -50%)",
      }}
      onPointerDown={(e) => {
        e.preventDefault();
        onPointerDown(e);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onTap?.();
      }}
    >
      {/* 丸の中に role */}
      <div
        className="w-11 h-11 rounded-full bg-white border-2 border-white/90 text-gray-900 font-semibold text-xs flex items-center justify-center shadow-lg flex-shrink-0"
        title={nameDisplay ? `${label}: ${nameDisplay}` : label}
      >
        {label}
      </div>
      {/* 丸の下に 選手名 */}
      {nameDisplay ? (
        <span
          className="text-[10px] font-medium text-white mt-0.5 max-w-[56px] truncate text-center drop-shadow-sm"
          title={nameDisplay}
        >
          {nameTruncated}
        </span>
      ) : (
        <span className="text-[10px] text-white/50 mt-0.5 max-w-[56px] truncate text-center">
          —
        </span>
      )}
      {onClear && player && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClear(slotCode);
          }}
          className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center hover:bg-red-600"
          aria-label="ポジションを解除"
        >
          ×
        </button>
      )}
    </div>
  );
}
