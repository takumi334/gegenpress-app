"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DrawingStroke } from "@/lib/tacticsPlacements";

type PenColor = "red" | "blue" | "erase";

type TacticsDrawingCanvasProps = {
  strokes: DrawingStroke[];
  onChange: (strokes: DrawingStroke[]) => void;
  penColor: PenColor;
  enabled: boolean;
  className?: string;
};

export default function TacticsDrawingCanvas({
  strokes,
  onChange,
  penColor,
  enabled,
  className = "",
}: TacticsDrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const currentStrokeRef = useRef<{ color: string; points: { x: number; y: number }[] } | null>(null);

  const getCoord = useCallback(
    (e: React.PointerEvent | PointerEvent): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
    },
    []
  );

  const drawStrokes = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const w = rect.width;
    const h = rect.height;
    const toPx = (p: { x: number; y: number }) => ({
      x: (p.x / 100) * w,
      y: (p.y / 100) * h,
    });

    [...strokes, currentStrokeRef.current].filter(Boolean).forEach((stroke) => {
      const s = stroke!;
      if (s.points.length < 2) return;
      ctx.beginPath();
      const first = toPx(s.points[0]);
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < s.points.length; i++) {
        const pt = toPx(s.points[i]);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.strokeStyle = s.color === "erase" ? "transparent" : s.color === "red" ? "#ef4444" : "#3b82f6";
      ctx.lineWidth = s.color === "erase" ? 24 : 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (s.color === "erase") {
        ctx.globalCompositeOperation = "destination-out";
      } else {
        ctx.globalCompositeOperation = "source-over";
      }
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
    });
  }, [strokes]);

  useEffect(() => {
    drawStrokes();
  }, [drawStrokes]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return;
      e.preventDefault();
      const pt = getCoord(e);
      if (!pt) return;
      setIsDrawing(true);
      currentStrokeRef.current = {
        color: penColor === "erase" ? "erase" : penColor,
        points: [pt],
      };
      drawStrokes();
    },
    [enabled, penColor, getCoord, drawStrokes]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled || !isDrawing || !currentStrokeRef.current) return;
      e.preventDefault();
      const pt = getCoord(e);
      if (!pt) return;
      currentStrokeRef.current.points.push(pt);
      drawStrokes();
    },
    [enabled, isDrawing, getCoord, drawStrokes]
  );

  const handlePointerUp = useCallback(() => {
    if (!isDrawing || !currentStrokeRef.current) return;
    const stroke = currentStrokeRef.current;
    currentStrokeRef.current = null;
    setIsDrawing(false);
    if (stroke.points.length >= 2) {
      onChange([...strokes, stroke]);
    }
    drawStrokes();
  }, [isDrawing, strokes, onChange, drawStrokes]);

  const handlePointerLeave = useCallback(() => {
    if (isDrawing) handlePointerUp();
  }, [isDrawing, handlePointerUp]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full touch-none ${className}`}
      style={{ pointerEvents: enabled ? "auto" : "none" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerUp}
    />
  );
}
