/**
 * 戦術ボードのストローク描画（ビュー / GIF / 編集キャンバスで共通化）
 */

import type { DrawingStroke } from "@/lib/tacticsPlacements";

function toPx(p: { x: number; y: number }, w: number, h: number) {
  return { x: (p.x / 100) * w, y: (p.y / 100) * h };
}

export function strokePixelWidth(s: DrawingStroke): number {
  if (s.color === "erase") return 24;
  const w = s.lineWidth;
  if (typeof w === "number" && w > 0 && w <= 24) return w;
  return 4;
}

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  lineWidth: number
) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const headLen = Math.max(10, lineWidth * 3);
  const headWidth = Math.max(6, lineWidth * 2);
  const bx = x1 - ux * headLen;
  const by = y1 - uy * headLen;
  const px = -uy * (headWidth / 2);
  const py = ux * (headWidth / 2);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(bx + px, by + py);
  ctx.lineTo(bx - px, by - py);
  ctx.closePath();
  ctx.fillStyle = ctx.strokeStyle;
  ctx.fill();
}

/**
 * 1ストロークを描画（ctx は既に論理サイズ w×h にスケール済み想定）
 */
export function drawSingleStroke(
  ctx: CanvasRenderingContext2D,
  s: DrawingStroke,
  w: number,
  h: number
) {
  if (s.points.length < 2) return;
  const lw = strokePixelWidth(s);
  const to = (p: { x: number; y: number }) => toPx(p, w, h);

  if (s.color === "erase") {
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    const first = to(s.points[0]);
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < s.points.length; i++) {
      const pt = to(s.points[i]);
      ctx.lineTo(pt.x, pt.y);
    }
    ctx.strokeStyle = "rgba(0,0,0,1)";
    ctx.lineWidth = lw;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.restore();
    return;
  }

  const strokeColor = s.color === "red" ? "#ef4444" : "#3b82f6";
  ctx.beginPath();
  const first = to(s.points[0]);
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i < s.points.length; i++) {
    const pt = to(s.points[i]);
    ctx.lineTo(pt.x, pt.y);
  }
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lw;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalCompositeOperation = "source-over";
  ctx.stroke();

  if (s.arrow && s.points.length >= 2) {
    const pPrev = to(s.points[s.points.length - 2]);
    const pLast = to(s.points[s.points.length - 1]);
    ctx.strokeStyle = strokeColor;
    drawArrowHead(ctx, pPrev.x, pPrev.y, pLast.x, pLast.y, lw);
  }
}

export function drawStrokeList(
  ctx: CanvasRenderingContext2D,
  strokes: DrawingStroke[],
  w: number,
  h: number,
  extra?: DrawingStroke | null
) {
  for (const s of strokes) {
    drawSingleStroke(ctx, s, w, h);
  }
  if (extra && extra.points.length >= 2) {
    drawSingleStroke(ctx, extra, w, h);
  }
}
