"use client";

import { useCallback, useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import type { PlayerChipData } from "./PlayerChip";

type DraggablePlacementMarkerProps = {
  slotCode: string;
  slotLabel: string;
  player: PlayerChipData | null;
  x: number;
  y: number;
  onPositionChange: (slotCode: string, x: number, y: number) => void;
  onClear?: (slotCode: string) => void;
  enabled: boolean;
};

const MIN = 3;
const MAX = 97;

export default function DraggablePlacementMarker({
  slotCode,
  slotLabel,
  player,
  x,
  y,
  onPositionChange,
  onClear,
  enabled,
}: DraggablePlacementMarkerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startRef = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const { isOver, setNodeRef } = useDroppable({
    id: `slot-${slotCode}`,
    data: { type: "slot", positionCode: slotCode },
  });

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return;
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      startRef.current = { px: e.clientX, py: e.clientY, x, y };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [enabled, x, y]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled || !isDragging || !startRef.current) return;
      e.preventDefault();
      const rect = (e.target as HTMLElement).closest("[data-pitch-container]")?.getBoundingClientRect();
      if (!rect) return;
      const dxPct = ((e.clientX - startRef.current.px) / rect.width) * 100;
      const dyPct = ((e.clientY - startRef.current.py) / rect.height) * 100;
      let nx = startRef.current.x + dxPct;
      let ny = startRef.current.y + dyPct;
      nx = Math.max(MIN, Math.min(MAX, nx));
      ny = Math.max(MIN, Math.min(MAX, ny));
      onPositionChange(slotCode, nx, ny);
    },
    [enabled, isDragging, slotCode, onPositionChange]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (isDragging) {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      }
      setIsDragging(false);
      startRef.current = null;
    },
    [isDragging]
  );

  return (
    <div
      ref={setNodeRef}
      className={`
        absolute w-14 h-14 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center
        rounded-full border-2 min-w-0 select-none
        ${player ? "border-green-500 bg-gray-800/95" : "border-dashed border-gray-500 bg-gray-800/80"}
        ${isOver ? "ring-2 ring-green-400" : ""}
        ${enabled ? "cursor-grab active:cursor-grabbing touch-none" : ""}
        ${isDragging ? "z-20 ring-2 ring-green-400/80" : "z-10"}
      `}
      style={{ left: `${x}%`, top: `${y}%` }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {player ? (
        <div className="relative w-full h-full flex items-center justify-center px-1">
          <span className="text-xs font-medium text-gray-100 truncate text-center">{player.translatedName ?? player.name}</span>
          {onClear && enabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear(slotCode);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center hover:bg-red-500"
              aria-label="配置を解除"
            >
              ×
            </button>
          )}
        </div>
      ) : (
        <span className="text-[10px] text-gray-400 font-medium">{slotLabel}</span>
      )}
    </div>
  );
}
