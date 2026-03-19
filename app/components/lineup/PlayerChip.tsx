"use client";

import { useDraggable } from "@dnd-kit/core";

export type PlayerChipData = {
  id: string;
  name: string;
  /** 翻訳後の表示名。未設定時は name を使用 */
  translatedName?: string;
  teamName?: string | null;
};

type PlayerChipProps = {
  player: PlayerChipData;
};

export default function PlayerChip({ player }: PlayerChipProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `chip-${player.id}`,
    data: { type: "player", player },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`
        rounded px-2 py-1.5 text-sm cursor-grab active:cursor-grabbing
        bg-gray-700 text-gray-100 border border-gray-600
        hover:bg-gray-600
        ${isDragging ? "opacity-50 shadow-lg z-10" : ""}
      `}
    >
      <span className="font-medium truncate block">{player.translatedName ?? player.name}</span>
      {player.teamName && (
        <span className="text-xs text-gray-400 truncate block">{player.teamName}</span>
      )}
    </div>
  );
}
