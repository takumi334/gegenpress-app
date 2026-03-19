"use client";

import { useDraggable } from "@dnd-kit/core";
import type { PlayerLite } from "@/lib/lineupPlayers";

type PlayerCardProps = {
  player: PlayerLite;
  compact?: boolean;
};

export default function PlayerCard({ player, compact }: PlayerCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `player-${player.id}`,
    data: { type: "player", player },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`
        rounded border bg-white shadow cursor-grab active:cursor-grabbing
        ${compact ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm"}
        ${isDragging ? "opacity-50 shadow-lg z-10" : ""}
      `}
    >
      <div className="font-medium truncate">{player.translatedName ?? player.name}</div>
      <div className="text-xs text-gray-500 mt-0.5">
        {player.positionCategory}
        {player.shirtNumber != null ? ` #${player.shirtNumber}` : ""}
      </div>
    </div>
  );
}
