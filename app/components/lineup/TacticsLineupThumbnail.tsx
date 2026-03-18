"use client";

import { useMemo } from "react";
import { getFormation } from "@/lib/formations";
import type { FormationId } from "@/lib/formations";
import type { TacticsBoardData } from "@/lib/tacticsPlacements";
import SoccerPitch from "./SoccerPitch";

type TacticsLineupThumbnailProps = {
  data: TacticsBoardData | null | undefined;
};

function placementsBySlot(
  placements: {
    slotCode: string;
    playerName?: string;
    translatedName?: string;
    label?: string | null;
    x?: number;
    y?: number;
  }[]
): Map<string, { playerName: string; displayName: string; role: string; x?: number; y?: number }> {
  const m = new Map<string, { playerName: string; displayName: string; role: string; x?: number; y?: number }>();
  placements.forEach((p) => {
    const name = p.playerName ?? "";
    const displayName = (p.translatedName ?? name).trim() || name;
    m.set(p.slotCode, {
      playerName: name,
      displayName,
      role: p.label ?? p.slotCode,
      x: p.x,
      y: p.y,
    });
  });
  return m;
}

/**
 * 一覧用の軽量サムネイル。先頭フレームのみ表示し、コントロール・描画レイヤーは出さない。
 */
export default function TacticsLineupThumbnail({ data }: TacticsLineupThumbnailProps) {
  const { formationDef, bySlot, firstFrame, frameCount } = useMemo(() => {
    const f = (data?.formation ?? "4-3-3") as FormationId;
    const def = getFormation(f);
    const placements = data?.placements ?? [];
    const by = placementsBySlot(placements);
    const frames = data?.animationFrames ?? [];
    const first = frames[0] ?? null;
    return {
      formationDef: def,
      bySlot: by,
      firstFrame: first,
      frameCount: frames.length,
    };
  }, [data]);

  const hasPlacements = (data?.placements?.length ?? 0) > 0;
  const hasDrawing = (data?.drawingData?.strokes?.length ?? 0) > 0;
  const hasFrames = frameCount > 0;

  if (!hasPlacements && !hasDrawing) return null;

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="relative w-full rounded-lg overflow-hidden border border-gray-500"
        style={{ aspectRatio: "68/105", maxWidth: 140 }}
      >
        <div className="absolute inset-0 flex items-center justify-center p-0.5">
          <SoccerPitch className="max-w-full max-h-full object-contain" />
        </div>

        {hasPlacements &&
          formationDef.slots.map((slot) => {
            const info = bySlot.get(slot.code);
            const name = info?.displayName ?? "";
            const role = info?.role ?? slot.label;
            const override = firstFrame?.slotPositions?.[slot.code];
            const x = override?.x ?? info?.x ?? slot.x;
            const y = override?.y ?? info?.y ?? slot.y;
            const label = name.length > 0 ? name : role;
            return (
              <div
                key={slot.code}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  width: "20%",
                  height: "8%",
                }}
              >
                <div className="rounded-full border border-green-500 bg-gray-800/95 px-1 py-0.5 flex items-center justify-center min-w-0 max-w-full w-full">
                  <span className="text-[8px] font-medium text-gray-100 truncate text-center leading-tight">
                    {label}
                  </span>
                </div>
              </div>
            );
          })}

        {firstFrame?.ballPosition && (
          <div
            className="absolute w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3b82f6] border border-white pointer-events-none"
            style={{
              left: `${firstFrame.ballPosition.x}%`,
              top: `${firstFrame.ballPosition.y}%`,
            }}
          />
        )}
      </div>
      {hasFrames && (
        <span className="text-[10px] text-gray-500">
          Frame 1 / {frameCount}
        </span>
      )}
    </div>
  );
}
