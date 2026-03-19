"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DrawingStroke } from "@/lib/tacticsPlacements";
import { drawSingleStroke, drawStrokeList } from "@/lib/tacticsStrokeDraw";

type PenColor = "red" | "blue" | "erase";

export type DrawToolKind = "freehand" | "line" | "arrow";

type TacticsDrawingCanvasProps = {
  strokes: DrawingStroke[];
  onChange: (strokes: DrawingStroke[]) => void;
  penColor: PenColor;
  /** ペン色が赤/青のときの線幅（消しゴムは固定幅） */
  penLineWidth: number;
  drawTool: DrawToolKind;
  enabled: boolean;
  className?: string;
};

function buildStroke(
  color: PenColor,
  points: { x: number; y: number }[],
  opts: { arrow?: boolean; lineWidth?: number }
): DrawingStroke {
  const c = color === "erase" ? "erase" : color;
  const stroke: DrawingStroke = { color: c, points };
  if (opts.arrow) stroke.arrow = true;
  if (c !== "erase" && opts.lineWidth != null) stroke.lineWidth = opts.lineWidth;
  return stroke;
}

export default function TacticsDrawingCanvas({
  strokes,
  onChange,
  penColor,
  penLineWidth,
  drawTool,
  enabled,
  className = "",
}: TacticsDrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef(strokes);
  strokesRef.current = strokes;
  const [isDrawing, setIsDrawing] = useState(false);
  const currentStrokeRef = useRef<DrawingStroke | null>(null);
  const lineStartRef = useRef<{ x: number; y: number } | null>(null);
  const lineEndRef = useRef<{ x: number; y: number } | null>(null);

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

    let preview: DrawingStroke | null = null;
    if (
      (drawTool === "line" || drawTool === "arrow") &&
      isDrawing &&
      lineStartRef.current &&
      lineEndRef.current
    ) {
      preview = buildStroke(penColor, [lineStartRef.current, lineEndRef.current], {
        arrow: drawTool === "arrow",
        lineWidth: penLineWidth,
      });
    }

    drawStrokeList(ctx, strokes, w, h, preview);

    if (drawTool === "freehand" && currentStrokeRef.current && currentStrokeRef.current.points.length >= 1) {
      drawSingleStroke(ctx, currentStrokeRef.current, w, h);
    }
  }, [strokes, penColor, penLineWidth, drawTool, isDrawing]);

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

      if (drawTool === "freehand") {
        currentStrokeRef.current = buildStroke(penColor, [pt], { lineWidth: penLineWidth });
        lineStartRef.current = null;
        lineEndRef.current = null;
      } else {
        currentStrokeRef.current = null;
        lineStartRef.current = pt;
        lineEndRef.current = pt;
      }
      drawStrokes();
    },
    [enabled, penColor, penLineWidth, drawTool, getCoord, drawStrokes]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled || !isDrawing) return;
      e.preventDefault();
      const pt = getCoord(e);
      if (!pt) return;

      if (drawTool === "freehand" && currentStrokeRef.current) {
        currentStrokeRef.current.points.push(pt);
        drawStrokes();
      } else if ((drawTool === "line" || drawTool === "arrow") && lineStartRef.current) {
        lineEndRef.current = pt;
        drawStrokes();
      }
    },
    [enabled, isDrawing, drawTool, getCoord, drawStrokes]
  );

  const handlePointerUp = useCallback(() => {
    if (!isDrawing) return;

    if (drawTool === "freehand" && currentStrokeRef.current) {
      const stroke = currentStrokeRef.current;
      currentStrokeRef.current = null;
      setIsDrawing(false);
      if (stroke.points.length >= 2) {
        onChange([...strokesRef.current, stroke]);
      }
      drawStrokes();
      return;
    }

    if ((drawTool === "line" || drawTool === "arrow") && lineStartRef.current && lineEndRef.current) {
      const a = lineStartRef.current;
      const b = lineEndRef.current;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      if (dx * dx + dy * dy > 0.01) {
        const stroke = buildStroke(penColor, [a, b], {
          arrow: drawTool === "arrow",
          lineWidth: penLineWidth,
        });
        onChange([...strokesRef.current, stroke]);
      }
      lineStartRef.current = null;
      lineEndRef.current = null;
      setIsDrawing(false);
      drawStrokes();
    }
  }, [isDrawing, drawTool, onChange, penColor, penLineWidth, drawStrokes]);

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
