import "server-only";

import * as PImage from "pureimage";
import { GIFEncoder, quantize, applyPalette } from "gifenc";
import { prisma, withPrismaRetry } from "@/lib/prisma";
import { getFormation, type FormationId } from "@/lib/formations";

export const runtime = "nodejs";

export const GIF_WIDTH = 500;
export const GIF_HEIGHT = 750;
export const delayMs = 800;

type Point = { x: number; y: number };
type DrawPath = { points?: Point[] };
type SlotPositions = Record<string, Point>;
type FrameData = {
  slotPositions: SlotPositions;
  ball: Point | null;
  drawPaths: DrawPath[];
};
type LineupGifPayload = {
  formation: FormationId;
  slotNames: Record<string, string>;
  frames: FrameData[];
};

function toFormation(value: unknown): FormationId {
  return value === "4-4-2" || value === "3-5-2" || value === "3-2-4-1" ? value : "4-3-3";
}

function normalizeFrame(raw: unknown, defaultSlots: SlotPositions): FrameData {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const slotPositionsInput = obj.slotPositions;
  const drawPathsInput = obj.drawPaths;
  const ballInput = obj.ball;

  const slotPositions: SlotPositions =
    slotPositionsInput && typeof slotPositionsInput === "object"
      ? (slotPositionsInput as SlotPositions)
      : { ...defaultSlots };

  const drawPaths = Array.isArray(drawPathsInput) ? (drawPathsInput as DrawPath[]) : [];
  const ball =
    ballInput && typeof ballInput === "object" && typeof (ballInput as Point).x === "number" && typeof (ballInput as Point).y === "number"
      ? (ballInput as Point)
      : { x: 50, y: 50 };

  return { slotPositions, ball, drawPaths };
}

async function resolvePayload(id: number): Promise<LineupGifPayload | null> {
  const lineup = await withPrismaRetry("GET /api/gif/[id] predictedLineup", () =>
    prisma.predictedLineup.findUnique({
      where: { id },
      include: {
        players: {
          include: { player: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    })
  );

  if (lineup) {
    const formation = toFormation(lineup.formation);
    const slots = getFormation(formation).slots;
    const baseSlots: SlotPositions = Object.fromEntries(slots.map((s) => [s.code, { x: s.x, y: s.y }]));
    const slotNames: Record<string, string> = {};
    lineup.players.forEach((p) => {
      if (p.positionCode) slotNames[p.positionCode] = p.player?.name ?? p.positionCode;
    });
    return {
      formation,
      slotNames,
      frames: [{ slotPositions: baseSlots, ball: { x: 50, y: 50 }, drawPaths: [] }],
    };
  }

  const board = await withPrismaRetry("GET /api/gif/[id] tacticsBoard", () =>
    prisma.tacticsBoard.findUnique({
      where: { id },
      select: { data: true },
    })
  );
  const boardData = board?.data as Record<string, unknown> | null;
  if (boardData && typeof boardData === "object") {
    const formation = toFormation(boardData.formation);
    const baseSlots: SlotPositions = Object.fromEntries(
      getFormation(formation).slots.map((s) => [s.code, { x: s.x, y: s.y }])
    );
    const slotNames = (boardData.slotNames as Record<string, string> | undefined) ?? {};
    const rawFrames = Array.isArray(boardData.frames) ? boardData.frames : [];
    const frames = rawFrames.length > 0 ? rawFrames.map((f) => normalizeFrame(f, baseSlots)) : [normalizeFrame(null, baseSlots)];
    return { formation, slotNames, frames };
  }

  const post = await withPrismaRetry("GET /api/gif/[id] post", () =>
    prisma.post.findUnique({
      where: { id },
      select: { tactic: true },
    })
  );
  const tacticData = post?.tactic as Record<string, unknown> | null;
  if (tacticData && typeof tacticData === "object") {
    const formation = toFormation(tacticData.formation);
    const baseSlots: SlotPositions = Object.fromEntries(
      getFormation(formation).slots.map((s) => [s.code, { x: s.x, y: s.y }])
    );
    const slotNames = (tacticData.slotNames as Record<string, string> | undefined) ?? {};
    const rawFrames = Array.isArray(tacticData.frames) ? tacticData.frames : [];
    const frames = rawFrames.length > 0 ? rawFrames.map((f) => normalizeFrame(f, baseSlots)) : [normalizeFrame(null, baseSlots)];
    return { formation, slotNames, frames };
  }

  return null;
}

function drawPitch(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#2f8f4e";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.strokeRect(w * 0.04, h * 0.03, w * 0.92, h * 0.94);
  ctx.beginPath();
  ctx.moveTo(w * 0.04, h * 0.5);
  ctx.lineTo(w * 0.96, h * 0.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.5, w * 0.13, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeRect(w * 0.22, h * 0.03, w * 0.56, h * 0.16);
  ctx.strokeRect(w * 0.22, h * 0.81, w * 0.56, h * 0.16);
}

function drawPaths(ctx: CanvasRenderingContext2D, paths: DrawPath[], w: number, h: number) {
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const path of paths) {
    const points = Array.isArray(path?.points) ? path.points : [];
    if (points.length < 2) continue;
    ctx.beginPath();
    points.forEach((pt, idx) => {
      const x = (pt.x / 100) * w;
      const y = (pt.y / (pt.y > 100 ? 150 : 100)) * h;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
}

function drawPlayers(
  ctx: CanvasRenderingContext2D,
  frame: FrameData,
  formation: FormationId,
  slotNames: Record<string, string>,
  w: number,
  h: number
) {
  const formationSlots = getFormation(formation).slots;
  const baseSlots: SlotPositions = Object.fromEntries(formationSlots.map((s) => [s.code, { x: s.x, y: s.y }]));
  const allSlotCodes = new Set([...Object.keys(baseSlots), ...Object.keys(frame.slotPositions ?? {})]);
  ctx.textAlign = "center";
  for (const code of allSlotCodes) {
    const pos = frame.slotPositions?.[code] ?? baseSlots[code];
    if (!pos) continue;
    const x = (pos.x / 100) * w;
    const y = (pos.y / 100) * h;
    ctx.beginPath();
    ctx.fillStyle = "#22c55e";
    ctx.strokeStyle = "#064e3b";
    ctx.lineWidth = 2;
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    const name = (slotNames?.[code] ?? "").trim();
    if (name) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "12px sans-serif";
      ctx.fillText(name, x, y + 20);
    }
  }
}

function drawBall(ctx: CanvasRenderingContext2D, ball: Point | null, w: number, h: number) {
  if (!ball) return;
  const x = (ball.x / 100) * w;
  const y = (ball.y / 100) * h;
  ctx.beginPath();
  ctx.fillStyle = "#3b82f6";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

export async function buildGifResponseById(idParam: string): Promise<Response> {
  const id = Number(idParam);
  if (!Number.isInteger(id)) {
    return new Response("Invalid id", { status: 404 });
  }

  const payload = await resolvePayload(id);
  if (!payload) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const image = PImage.make(GIF_WIDTH, GIF_HEIGHT);
    const ctx = image.getContext("2d");
    const encoder = GIFEncoder();

    const frames = payload.frames.length > 0 ? payload.frames : [{ slotPositions: {}, ball: { x: 50, y: 50 }, drawPaths: [] }];
    for (const frame of frames) {
      ctx.clearRect(0, 0, GIF_WIDTH, GIF_HEIGHT);
      drawPitch(ctx, GIF_WIDTH, GIF_HEIGHT);
      drawPaths(ctx, frame.drawPaths, GIF_WIDTH, GIF_HEIGHT);
      drawPlayers(ctx, frame, payload.formation, payload.slotNames, GIF_WIDTH, GIF_HEIGHT);
      drawBall(ctx, frame.ball, GIF_WIDTH, GIF_HEIGHT);
      const rgba = image.data as Uint8Array;
      const palette = quantize(rgba, 256);
      const index = applyPalette(rgba, palette);
      encoder.writeFrame(index, GIF_WIDTH, GIF_HEIGHT, {
        palette,
        delay: delayMs,
        repeat: 0,
      });
    }

    encoder.finish();
    const gifBuffer = Buffer.from(encoder.bytes());
    return new Response(gifBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "public, max-age=60, s-maxage=60",
      },
    });
  } catch (error) {
    console.error("[api/gif] generation failed", error);
    return new Response("Failed to generate GIF", { status: 500 });
  }
}
