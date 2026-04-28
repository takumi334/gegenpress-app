"use client";

import { useCallback, useRef, useState } from "react";
import type { FormationDef, Slot } from "@/lib/formations";
import type { PlayerLite } from "@/lib/lineupPlayers";
import {
  convertClientToPitchPercent,
  type PositionPercent,
} from "@/lib/pitchLayout";
import type { DrawPath } from "@/lib/pitchLayout";
import SoccerPitchSVG from "./SoccerPitchSVG";
import DraggablePitchMarker from "./DraggablePitchMarker";
import PitchPenLayer from "./PitchPenLayer";
import type { PitchMode } from "./PitchModeSelector";
import { lineupBuilderUi } from "@/lib/lineupBuilderUiCopy";

export type SlotAssignments = Record<string, PlayerLite | null>;

export type SlotPositions = Record<string, PositionPercent>;

/** ポジション別の表示名（role とは別管理） */
export type SlotNames = Record<string, string>;

export type Ball = {
  id: "ball";
  x: number;
  y: number;
};

type PitchBoardProps = {
  formation: FormationDef;
  assignments: SlotAssignments;
  slotPositions: SlotPositions;
  slotNames?: SlotNames;
  ball: Ball;
  onBallChange: (ball: Ball) => void;
  onSlotPositionChange: (slotCode: string, x: number, y: number) => void;
  onClearSlot?: (positionCode: string) => void;
  onSlotTap?: (slotCode: string, slotLabel: string) => void;
  pitchMode?: PitchMode;
  drawPaths?: DrawPath[];
  onDrawPathsChange?: (paths: DrawPath[]) => void;
};

export default function PitchBoard({
  formation,
  assignments,
  slotPositions,
  slotNames = {},
  ball,
  onBallChange,
  onSlotPositionChange,
  onClearSlot,
  onSlotTap,
  pitchMode = "cursor",
  drawPaths = [],
  onDrawPathsChange = () => {},
}: PitchBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingSlot, setDraggingSlot] = useState<string | null>(null);
  const draggingSlotRef = useRef<string | null>(null);
  const isCursorMode = pitchMode === "cursor";

  const handleBallPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!isCursorMode) return;
      e.preventDefault();
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      const onMove = (moveEvent: PointerEvent) => {
        if (!containerRef.current) return;
        const next = convertClientToPitchPercent(
          moveEvent.clientX,
          moveEvent.clientY,
          rect
        );
        onBallChange({ id: "ball", x: next.x, y: next.y });
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
    [isCursorMode, onBallChange]
  );

  const handleMarkerPointerDown = useCallback((slotCode: string, slotLabel: string, e: React.PointerEvent) => {
    if (!isCursorMode) return;
    e.preventDefault();
    setDraggingSlot(slotCode);
    draggingSlotRef.current = slotCode;
    const startX = e.clientX;
    const startY = e.clientY;
    let moved = false;

    const onMove = (moveEvent: PointerEvent) => {
      const slot = draggingSlotRef.current;
      if (!slot || !containerRef.current) return;
      if (Math.abs(moveEvent.clientX - startX) > 4 || Math.abs(moveEvent.clientY - startY) > 4) {
        moved = true;
      }
      const rect = containerRef.current.getBoundingClientRect();
      const { x, y } = convertClientToPitchPercent(moveEvent.clientX, moveEvent.clientY, rect);
      onSlotPositionChange(slot, x, y);
    };

    const onUp = () => {
      if (!moved) {
        if (process.env.NODE_ENV !== "production") {
          console.log("[PitchBoard] tapped slot", { slotCode, slotLabel });
        }
        onSlotTap?.(slotCode, slotLabel);
      }
      setDraggingSlot(null);
      draggingSlotRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }, [onSlotPositionChange, isCursorMode, onSlotTap]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-xl overflow-hidden border-2 border-white/20 shadow-xl bg-[#2f8f4e] ${!isCursorMode ? "cursor-crosshair" : ""}`}
      style={{ aspectRatio: "2/3" }}
    >
      <SoccerPitchSVG className="absolute inset-0 w-full h-full" />
      {/* ペン描画レイヤー（Pen モード時のみ有効） */}
      <PitchPenLayer
        enabled={!isCursorMode}
        drawPaths={drawPaths}
        onDrawPathsChange={onDrawPathsChange}
        containerRef={containerRef}
      />
      {/* マーカー用オーバーレイ（ピッチ全体と同じサイズ） */}
      <div
        className="absolute inset-0"
        style={{ touchAction: "none", pointerEvents: isCursorMode ? "auto" : "none" }}
      >
        {/* ボール */}
        <div
          className="ball absolute -translate-x-1/2 -translate-y-1/2 bg-[#3b82f6] border-2 border-white rounded-full cursor-grab active:cursor-grabbing z-20 shadow-md"
          style={{
            left: `${ball.x}%`,
            top: `${ball.y}%`,
            width: "14px",
            height: "14px",
          }}
          onPointerDown={handleBallPointerDown}
        />

        {formation.slots.map((slot: Slot) => {
          const pos = slotPositions[slot.code] ?? { x: slot.x, y: slot.y };
          const assigned = assignments[slot.code] ?? null;
          const displayName = slotNames[slot.code] ?? (assigned ? (assigned.translatedName ?? assigned.name) : "");
          return (
            <DraggablePitchMarker
              key={slot.code}
              slotCode={slot.code}
              label={slot.label}
              playerName={displayName}
              player={assigned}
              x={pos.x}
              y={pos.y}
              isDragging={draggingSlot === slot.code}
              onPointerDown={(e) => handleMarkerPointerDown(slot.code, slot.label, e)}
              onTap={() => {
                if (process.env.NODE_ENV !== "production") {
                  console.log("[PitchBoard] tapped slot", { slotCode: slot.code, slotLabel: slot.label });
                }
                onSlotTap?.(slot.code, slot.label);
              }}
              onClear={onClearSlot}
            />
          );
        })}
      </div>
      {!isCursorMode && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-white/80 bg-black/30 px-2 py-1 rounded">
          {lineupBuilderUi.drawingHint}
        </div>
      )}
    </div>
  );
}
