"use client";

import { useCallback, useRef, useState } from "react";
import { PITCH_VIEW_W, PITCH_VIEW_H } from "./pitchConstants";
import { convertClientToViewBox, type DrawPath } from "@/lib/pitchLayout";

type PitchPenLayerProps = {
  enabled: boolean;
  drawPaths: DrawPath[];
  onDrawPathsChange: (paths: DrawPath[]) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  className?: string;
};

export default function PitchPenLayer({
  enabled,
  drawPaths,
  onDrawPathsChange,
  containerRef,
  className = "",
}: PitchPenLayerProps) {
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<{ x: number; y: number }[]>([]);

  const getViewBoxPoint = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return null;
      return convertClientToViewBox(clientX, clientY, containerRef.current.getBoundingClientRect());
    },
    [containerRef]
  );

  const commitStroke = useCallback(
    (points: { x: number; y: number }[]) => {
      if (points.length < 2) return;
      const newPath: DrawPath = {
        id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `path-${Date.now()}`,
        points,
      };
      onDrawPathsChange([...drawPaths, newPath]);
    },
    [drawPaths, onDrawPathsChange]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return;
      e.preventDefault();
      const p = getViewBoxPoint(e.clientX, e.clientY);
      if (!p) return;
      isDrawingRef.current = true;
      currentPointsRef.current = [p];
      setCurrentPoints([p]);

      const onMove = (moveEvent: PointerEvent) => {
        if (!isDrawingRef.current || !containerRef.current) return;
        const pt = convertClientToViewBox(
          moveEvent.clientX,
          moveEvent.clientY,
          containerRef.current.getBoundingClientRect()
        );
        currentPointsRef.current = [...currentPointsRef.current, pt];
        setCurrentPoints(currentPointsRef.current);
      };
      const onUp = () => {
        if (!isDrawingRef.current) return;
        isDrawingRef.current = false;
        const finishedPoints = currentPointsRef.current;
        currentPointsRef.current = [];
        setCurrentPoints([]);
        commitStroke(finishedPoints);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [enabled, getViewBoxPoint, containerRef, commitStroke]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled || !isDrawingRef.current) return;
      e.preventDefault();
      const p = getViewBoxPoint(e.clientX, e.clientY);
      if (!p) return;
      currentPointsRef.current = [...currentPointsRef.current, p];
      setCurrentPoints(currentPointsRef.current);
    },
    [enabled, getViewBoxPoint]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return;
      e.preventDefault();
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      const finishedPoints = currentPointsRef.current;
      currentPointsRef.current = [];
      setCurrentPoints([]);
      commitStroke(finishedPoints);
    },
    [enabled, commitStroke]
  );

  const pointsToD = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return "";
    const [first, ...rest] = points;
    return rest.reduce((acc, p) => `${acc} L ${p.x} ${p.y}`, `M ${first.x} ${first.y}`);
  };

  return (
    <svg
      viewBox={`0 0 ${PITCH_VIEW_W} ${PITCH_VIEW_H}`}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ pointerEvents: enabled ? "auto" : "none", touchAction: "none" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {drawPaths.map((path) => (
        <path
          key={path.id}
          d={pointsToD(path.points)}
          fill="none"
          stroke="rgba(255,255,255,0.9)"
          strokeWidth={1.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {currentPoints.length > 0 && (
        <path
          d={pointsToD(currentPoints)}
          fill="none"
          stroke="rgba(255,255,255,0.95)"
          strokeWidth={1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
