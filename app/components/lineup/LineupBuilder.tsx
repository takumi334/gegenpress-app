"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { getFormation, type FormationId } from "@/lib/formations";
import { getFormationLayout, updateSlotPosition } from "@/lib/pitchLayout";
import type { PlayerLite } from "@/lib/lineupPlayers";
import type { SlotAssignments, SlotPositions, SlotNames, Ball } from "./PitchBoard";
import FormationSelector from "./FormationSelector";
import PitchBoard from "./PitchBoard";
import PitchModeSelector from "./PitchModeSelector";
import type { PitchMode } from "./PitchModeSelector";
import SlotNamesEditor from "./SlotNamesEditor";
import PlayerCard from "./PlayerCard";
import type { DrawPath } from "@/lib/pitchLayout";
import { drawWatermark } from "@/lib/tacticsGif";
import { lineupBuilderUi } from "@/lib/lineupBuilderUiCopy";

const FRAME_COUNT = 4;
const FRAME_DELAY_MS = 800;

type LineupFrame = {
  formation: FormationId;
  assignments: SlotAssignments;
  slotNames: SlotNames;
  slotPositions: SlotPositions;
  ball: Ball;
  drawPaths: DrawPath[];
  saved: boolean;
};

function buildDefaultSlotPositions(formationId: FormationId): SlotPositions {
  const layout = getFormationLayout(formationId);
  return Object.fromEntries(layout.map((s) => [s.id, { x: s.x, y: s.y }]));
}

const PENDING_TACTIC_REPLY_KEY = "pendingTacticReply";

type LineupBuilderProps = {
  players?: PlayerLite[];
  initialFormation?: FormationId;
  initialAssignments?: SlotAssignments;
  onSave?: (formation: FormationId, assignments: SlotAssignments) => void;
  saveLabel?: string;
  /** 指定時は「投稿に添付して戻る」で返信に作戦を添付して戻る */
  returnTo?: string;
};

export default function LineupBuilder({
  players = [],
  initialFormation = "4-3-3",
  initialAssignments = {},
  onSave,
  saveLabel = lineupBuilderUi.saveDefault,
  returnTo,
}: LineupBuilderProps) {
  const router = useRouter();
  const safeFormation: FormationId =
    initialFormation === "4-4-2" || initialFormation === "3-5-2" || initialFormation === "4-3-3"
      ? initialFormation
      : "4-3-3";
  const [formation, setFormation] = useState<FormationId>(safeFormation);
  const [assignments, setAssignments] = useState<SlotAssignments>(initialAssignments);
  const [slotPositions, setSlotPositions] = useState<SlotPositions>(() =>
    buildDefaultSlotPositions(safeFormation)
  );
  const [ball, setBall] = useState<Ball>({ id: "ball", x: 50, y: 50 });
  const [pitchMode, setPitchMode] = useState<PitchMode>("cursor");
  const [drawPaths, setDrawPaths] = useState<DrawPath[]>([]);
  const [slotNames, setSlotNames] = useState<SlotNames>({});
  const [frames, setFrames] = useState<LineupFrame[]>(() => {
    const basePositions = buildDefaultSlotPositions(safeFormation);
    const baseBall: Ball = { id: "ball", x: 50, y: 50 };
    return Array.from({ length: FRAME_COUNT }).map(() => ({
      formation: safeFormation,
      assignments: { ...initialAssignments },
      slotNames: {},
      slotPositions: { ...basePositions },
      ball: { ...baseBall },
      drawPaths: [],
      saved: false,
    }));
  });
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);

  const formationDef = useMemo(() => getFormation(formation), [formation]);

  const onSlotNameChange = useCallback((slotCode: string, name: string) => {
    setSlotNames((prev) => ({ ...prev, [slotCode]: name }));
  }, []);

  const onFormationChange = useCallback((id: FormationId) => {
    setFormation(id);
    setSlotPositions(buildDefaultSlotPositions(id));
    setAssignments((prev) => {
      const next = { ...prev };
      const newSlots = getFormation(id).slots.map((s) => s.code);
      Object.keys(next).forEach((code) => {
        if (!newSlots.includes(code)) delete next[code];
      });
      return next;
    });
  }, []);

  const onSlotPositionChange = useCallback((slotCode: string, x: number, y: number) => {
    setSlotPositions((prev) => updateSlotPosition(prev, slotCode, x, y));
  }, []);

  const handleBallChange = useCallback((next: Ball) => {
    setBall(next);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (!activeId.startsWith("player-") || !overId.startsWith("slot-")) return;
    const playerId = Number(activeId.replace("player-", ""));
    const positionCode = overId.replace("slot-", "");
    const player = players.find((p) => p.id === playerId);
    if (!player) return;
    const slotCodes = formationDef.slots.map((s) => s.code);
    if (!slotCodes.includes(positionCode)) return;

    setAssignments((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((code) => {
        if (next[code]?.id === playerId) next[code] = null;
      });
      const previousPlayer = next[positionCode] ?? null;
      next[positionCode] = player;
      if (previousPlayer && previousPlayer.id !== playerId) {
        const freed = previousPlayer;
        Object.keys(next).forEach((code) => {
          if (next[code]?.id === freed.id) next[code] = null;
        });
      }
      return next;
    });
    setSlotNames((prev) => ({ ...prev, [positionCode]: player.translatedName ?? player.name }));
  }, [players, formationDef.slots]);

  const assignedIds = useMemo(
    () => new Set(Object.values(assignments).filter(Boolean).map((p) => p!.id)),
    [assignments]
  );
  const availablePlayers = useMemo(
    () => players.filter((p) => !assignedIds.has(p.id)),
    [players, assignedIds]
  );

  const clearSlot = useCallback((positionCode: string) => {
    setAssignments((prev) => ({ ...prev, [positionCode]: null }));
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleSave = useCallback(() => {
    onSave?.(formation, assignments);
  }, [formation, assignments, onSave]);

  const cloneFrame = useCallback((frame: LineupFrame): LineupFrame => {
    return {
      formation: frame.formation,
      assignments: { ...frame.assignments },
      slotNames: { ...frame.slotNames },
      slotPositions: { ...frame.slotPositions },
      ball: { ...frame.ball },
      drawPaths: frame.drawPaths.map((p) => ({
        id: p.id,
        points: p.points.map((pt) => ({ ...pt })),
      })),
      saved: frame.saved,
    };
  }, []);

  const applyFrame = useCallback(
    (index: number, sourceFrames?: LineupFrame[]) => {
      const fr = (sourceFrames ?? frames)[index];
      if (!fr) return;
      setFormation(fr.formation);
      setAssignments({ ...fr.assignments });
      setSlotNames({ ...fr.slotNames });
      setSlotPositions(fr.slotPositions);
      setBall({ ...fr.ball });
      setDrawPaths(fr.drawPaths.map((p) => ({ id: p.id, points: p.points.map((pt) => ({ ...pt })) })));
    },
    [frames]
  );

  const handleSelectFrame = useCallback(
    (index: number) => {
      setIsPlaying(false);
      setCurrentFrame(index);
      applyFrame(index);
    },
    [applyFrame]
  );

  const handlePlayToggle = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleSaveFrame = useCallback(() => {
    setFrames((prev) => {
      const copy = [...prev];
      copy[currentFrame] = {
        formation,
        assignments: { ...assignments },
        slotNames: { ...slotNames },
        slotPositions: { ...slotPositions },
        ball: { ...ball },
        drawPaths: drawPaths.map((p) => ({
          id: p.id,
          points: p.points.map((pt) => ({ ...pt })),
        })),
        saved: true,
      };
      return copy;
    });
  }, [currentFrame, formation, assignments, slotNames, slotPositions, ball, drawPaths]);

  const buildCurrentDraftFrame = useCallback((): LineupFrame => {
    return {
      formation,
      assignments: { ...assignments },
      slotNames: { ...slotNames },
      slotPositions: { ...slotPositions },
      ball: { ...ball },
      drawPaths: drawPaths.map((p) => ({
        id: p.id,
        points: p.points.map((pt) => ({ ...pt })),
      })),
      saved: true,
    };
  }, [formation, assignments, slotNames, slotPositions, ball, drawPaths]);

  const handleSendToBoard = useCallback(async () => {
    try {
      const currentDraftFrame = buildCurrentDraftFrame();
      const effectiveFrames = frames.map((f, idx) => (idx === currentFrame ? currentDraftFrame : cloneFrame(f)));
      let previewImage: string | undefined;
      if (typeof window !== "undefined") {
        const frame = effectiveFrames[currentFrame];
        if (frame) {
          const { default: html2canvas } = await import("html2canvas");

          const container = document.createElement("div");
          container.style.position = "fixed";
          container.style.left = "-10000px";
          container.style.top = "0";
          container.style.width = "400px";
          container.style.aspectRatio = "2 / 3";
          container.style.backgroundColor = "#2f8f4e";
          container.style.borderRadius = "12px";
          container.style.border = "2px solid #ffffff";
          container.style.overflow = "hidden";

          const inner = document.createElement("div");
          inner.style.position = "relative";
          inner.style.width = "100%";
          inner.style.height = "100%";
          container.appendChild(inner);

          const pitchBorder = document.createElement("div");
          pitchBorder.style.position = "absolute";
          pitchBorder.style.left = "4%";
          pitchBorder.style.top = "3%";
          pitchBorder.style.width = "92%";
          pitchBorder.style.height = "94%";
          pitchBorder.style.border = "2px solid #ffffff";
          pitchBorder.style.borderRadius = "8px";
          inner.appendChild(pitchBorder);

          const centerLine = document.createElement("div");
          centerLine.style.position = "absolute";
          centerLine.style.left = "4%";
          centerLine.style.top = "50%";
          centerLine.style.width = "92%";
          centerLine.style.height = "0";
          centerLine.style.borderTop = "2px solid #ffffff";
          inner.appendChild(centerLine);

          const centerCircle = document.createElement("div");
          centerCircle.style.position = "absolute";
          centerCircle.style.left = "50%";
          centerCircle.style.top = "50%";
          centerCircle.style.width = "26%";
          centerCircle.style.height = "26%";
          centerCircle.style.transform = "translate(-50%, -50%)";
          centerCircle.style.borderRadius = "9999px";
          centerCircle.style.border = "2px solid #ffffff";
          inner.appendChild(centerCircle);

          const boxTop = document.createElement("div");
          boxTop.style.position = "absolute";
          boxTop.style.left = "22%";
          boxTop.style.top = "3%";
          boxTop.style.width = "56%";
          boxTop.style.height = "16%";
          boxTop.style.border = "2px solid #ffffff";
          inner.appendChild(boxTop);

          const boxBottom = document.createElement("div");
          boxBottom.style.position = "absolute";
          boxBottom.style.left = "22%";
          boxBottom.style.bottom = "3%";
          boxBottom.style.width = "56%";
          boxBottom.style.height = "16%";
          boxBottom.style.border = "2px solid #ffffff";
          inner.appendChild(boxBottom);

          Object.entries(frame.slotPositions).forEach(([code, pos]) => {
            const marker = document.createElement("div");
            marker.style.position = "absolute";
            marker.style.left = `${pos.x}%`;
            marker.style.top = `${pos.y}%`;
            marker.style.transform = "translate(-50%, -50%)";
            marker.style.width = "18px";
            marker.style.height = "18px";
            marker.style.borderRadius = "9999px";
            marker.style.backgroundColor = "#22c55e";
            marker.style.border = "2px solid #064e3b";
            marker.style.boxShadow = "0 0 4px rgba(0,0,0,0.5)";
            inner.appendChild(marker);
          });

          if (frame.ball) {
            const ballEl = document.createElement("div");
            ballEl.style.position = "absolute";
            ballEl.style.left = `${frame.ball.x}%`;
            ballEl.style.top = `${frame.ball.y}%`;
            ballEl.style.transform = "translate(-50%, -50%)";
            ballEl.style.width = "14px";
            ballEl.style.height = "14px";
            ballEl.style.borderRadius = "9999px";
            ballEl.style.backgroundColor = "#3b82f6";
            ballEl.style.border = "2px solid #ffffff";
            ballEl.style.boxShadow = "0 0 4px rgba(0,0,0,0.5)";
            inner.appendChild(ballEl);
          }

          if (frame.drawPaths.length > 0) {
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("viewBox", "0 0 100 150");
            svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
            svg.style.position = "absolute";
            svg.style.left = "0";
            svg.style.top = "0";
            svg.style.width = "100%";
            svg.style.height = "100%";

            frame.drawPaths.forEach((path) => {
              if (!path.points || path.points.length < 2) return;
              const d = path.points
                .slice(1)
                .reduce(
                  (acc, p) => `${acc} L ${p.x} ${p.y}`,
                  `M ${path.points[0].x} ${path.points[0].y}`
                );
              const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
              pathEl.setAttribute("d", d);
              pathEl.setAttribute("fill", "none");
              pathEl.setAttribute("stroke", "#ffffff");
              pathEl.setAttribute("stroke-width", "1.8");
              pathEl.setAttribute("stroke-linecap", "round");
              pathEl.setAttribute("stroke-linejoin", "round");
              svg.appendChild(pathEl);
            });

            inner.appendChild(svg);
          }

          document.body.appendChild(container);
          try {
            const canvas = await html2canvas(container, { backgroundColor: "#000000" });
            previewImage = canvas.toDataURL("image/png");
          } finally {
            document.body.removeChild(container);
          }
        }
      }

      const payload = {
        formation,
        currentFrame,
        frames: effectiveFrames,
        animationFrames: effectiveFrames,
        slotNames,
        createdAt: new Date().toISOString(),
        source: "lineup-builder",
        previewImage,
      };
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.log("[LineupBuilder] Send to board payload", payload);
      }
      if (typeof window !== "undefined") {
        sessionStorage.setItem("pendingTacticPost", JSON.stringify(payload));
      }
      router.push("/board/57"); // 例: チームID 57 の掲示板トップへ
    } catch (e) {
      console.error("Failed to prepare tactic payload", e);
    }
  }, [formation, currentFrame, frames, slotNames, router, buildCurrentDraftFrame, cloneFrame]);

  const handleAttachToReply = useCallback(() => {
    if (!returnTo) return;
    const currentDraftFrame = buildCurrentDraftFrame();
    const effectiveFrames = frames.map((f, idx) => (idx === currentFrame ? currentDraftFrame : cloneFrame(f)));
    const payload = {
      formation,
      currentFrame,
      frames: effectiveFrames,
      animationFrames: effectiveFrames,
      slotNames,
      createdAt: new Date().toISOString(),
      source: "lineup-builder",
    };
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.log("[LineupBuilder] Attach to reply payload", payload);
    }
    if (typeof window !== "undefined") {
      sessionStorage.setItem(PENDING_TACTIC_REPLY_KEY, JSON.stringify(payload));
    }
    router.push(returnTo);
  }, [formation, currentFrame, frames, slotNames, returnTo, router, buildCurrentDraftFrame, cloneFrame]);

  const handleExportGif = useCallback(async () => {
    const [html2canvas, GIFLib] = await Promise.all([
      import("html2canvas").then((m) => m.default),
      import("gif.js").then((m) => (m.default || (m as any))),
    ]);

    const gif = new (GIFLib as any)({
      workers: 2,
      quality: 10,
      workerScript: "/gif.worker.js",
    });

    const snapshotFrames = frames;

    const buildExportNode = (frameIndex: number) => {
      const frame = snapshotFrames[frameIndex];
      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.left = "-10000px";
      container.style.top = "0";
      container.style.width = "400px";
      container.style.aspectRatio = "2 / 3";
      container.style.backgroundColor = "#2f8f4e";
      container.style.borderRadius = "12px";
      container.style.border = "2px solid #ffffff";
      container.style.overflow = "hidden";

      const inner = document.createElement("div");
      inner.style.position = "relative";
      inner.style.width = "100%";
      inner.style.height = "100%";
      container.appendChild(inner);

      // ピッチの外枠ライン（シンプルな白枠）
      const pitchBorder = document.createElement("div");
      pitchBorder.style.position = "absolute";
      pitchBorder.style.left = "4%";
      pitchBorder.style.top = "3%";
      pitchBorder.style.width = "92%";
      pitchBorder.style.height = "94%";
      pitchBorder.style.border = "2px solid #ffffff";
      pitchBorder.style.borderRadius = "8px";
      inner.appendChild(pitchBorder);

      // センターライン
      const centerLine = document.createElement("div");
      centerLine.style.position = "absolute";
      centerLine.style.left = "4%";
      centerLine.style.top = "50%";
      centerLine.style.width = "92%";
      centerLine.style.height = "0";
      centerLine.style.borderTop = "2px solid #ffffff";
      inner.appendChild(centerLine);

      // センターサークル（だいたい中央）
      const centerCircle = document.createElement("div");
      centerCircle.style.position = "absolute";
      centerCircle.style.left = "50%";
      centerCircle.style.top = "50%";
      centerCircle.style.width = "26%";
      centerCircle.style.height = "26%";
      centerCircle.style.transform = "translate(-50%, -50%)";
      centerCircle.style.borderRadius = "9999px";
      centerCircle.style.border = "2px solid #ffffff";
      inner.appendChild(centerCircle);

      // ゴール前のボックス（上下）
      const boxTop = document.createElement("div");
      boxTop.style.position = "absolute";
      boxTop.style.left = "22%";
      boxTop.style.top = "3%";
      boxTop.style.width = "56%";
      boxTop.style.height = "16%";
      boxTop.style.border = "2px solid #ffffff";
      inner.appendChild(boxTop);

      const boxBottom = document.createElement("div");
      boxBottom.style.position = "absolute";
      boxBottom.style.left = "22%";
      boxBottom.style.bottom = "3%";
      boxBottom.style.width = "56%";
      boxBottom.style.height = "16%";
      boxBottom.style.border = "2px solid #ffffff";
      inner.appendChild(boxBottom);

      // 選手マーカー（各スロット位置に配置）
      Object.entries(frame.slotPositions).forEach(([code, pos]) => {
        const marker = document.createElement("div");
        marker.style.position = "absolute";
        marker.style.left = `${pos.x}%`;
        marker.style.top = `${pos.y}%`;
        marker.style.transform = "translate(-50%, -50%)";
        marker.style.width = "18px";
        marker.style.height = "18px";
        marker.style.borderRadius = "9999px";
        marker.style.backgroundColor = "#22c55e"; // 明るめの緑
        marker.style.border = "2px solid #064e3b";
        marker.style.boxShadow = "0 0 4px rgba(0,0,0,0.5)";
        inner.appendChild(marker);
      });

      // ボール
      if (frame.ball) {
        const ballEl = document.createElement("div");
        ballEl.style.position = "absolute";
        ballEl.style.left = `${frame.ball.x}%`;
        ballEl.style.top = `${frame.ball.y}%`;
        ballEl.style.transform = "translate(-50%, -50%)";
        ballEl.style.width = "14px";
        ballEl.style.height = "14px";
        ballEl.style.borderRadius = "9999px";
        ballEl.style.backgroundColor = "#3b82f6";
        ballEl.style.border = "2px solid #ffffff";
        ballEl.style.boxShadow = "0 0 4px rgba(0,0,0,0.5)";
        inner.appendChild(ballEl);
      }

      // ペン線を描く SVG
      if (frame.drawPaths.length > 0) {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 100 150");
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        svg.style.position = "absolute";
        svg.style.left = "0";
        svg.style.top = "0";
        svg.style.width = "100%";
        svg.style.height = "100%";

        frame.drawPaths.forEach((path) => {
          if (!path.points || path.points.length < 2) return;
          const d = path.points
            .slice(1)
            .reduce(
              (acc, p) => `${acc} L ${p.x} ${p.y}`,
              `M ${path.points[0].x} ${path.points[0].y}`
            );
          const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
          pathEl.setAttribute("d", d);
          pathEl.setAttribute("fill", "none");
          pathEl.setAttribute("stroke", "#ffffff");
          pathEl.setAttribute("stroke-width", "1.8");
          pathEl.setAttribute("stroke-linecap", "round");
          pathEl.setAttribute("stroke-linejoin", "round");
          svg.appendChild(pathEl);
        });

        inner.appendChild(svg);
      }

      document.body.appendChild(container);
      return container;
    };

    for (let i = 0; i < FRAME_COUNT; i++) {
      await new Promise<void>(async (resolve) => {
        const node = buildExportNode(i);
        try {
          const canvas = await html2canvas(node, { backgroundColor: "#000000" });
          const ctx = canvas.getContext("2d");
          if (ctx) drawWatermark(ctx, canvas.width, canvas.height);
          gif.addFrame(canvas, { delay: FRAME_DELAY_MS });
        } finally {
          document.body.removeChild(node);
          resolve();
        }
      });
    }

    gif.on("finished", (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      setGifUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      const a = document.createElement("a");
      a.href = url;
      a.download = "tactic.gif";
      a.click();
    });

    gif.render();
  }, [frames, applyFrame]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentFrame((prev) => {
        const next = (prev + 1) % FRAME_COUNT;
        applyFrame(next);
        return next;
      });
    }, FRAME_DELAY_MS);
    return () => clearInterval(interval);
  }, [isPlaying, applyFrame]);

  return (
    <DndContext onDragEnd={handleDragEnd} sensors={sensors}>
      <div className="flex flex-col lg:flex-row gap-4 w-full max-w-6xl mx-auto">
        <div className="lg:w-64 shrink-0 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {lineupBuilderUi.playersHeading}
            </h3>
            <div className="flex flex-col gap-2 max-h-[240px] overflow-y-auto p-1 border border-white/10 rounded-lg bg-white/5 dark:bg-white/[0.06]">
              {availablePlayers.length === 0 ? (
                <p className="text-xs text-gray-500 p-2">{lineupBuilderUi.allPlayersPlaced}</p>
              ) : (
                availablePlayers.map((p) => <PlayerCard key={p.id} player={p} />)
              )}
            </div>
          </div>
          <SlotNamesEditor
            formation={formationDef}
            slotNames={slotNames}
            onChange={onSlotNameChange}
          />
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-3">
          <FormationSelector value={formation} onChange={onFormationChange} />
        <div className="flex flex-col gap-2 items-center">
          <div className="flex gap-2 flex-wrap justify-center">
            {[0, 1, 2, 3].map((idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectFrame(idx)}
                className={`px-2 py-1 text-xs rounded ${
                  currentFrame === idx ? "bg-green-600 text-white" : "bg-gray-700 text-gray-200"
                }`}
              >
                <span className="flex items-center gap-1">
                  <span>Frame {idx + 1}</span>
                  {frames[idx]?.saved && <span className="text-[10px] text-yellow-300">●</span>}
                </span>
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap justify-center mt-1">
            <button
              type="button"
              onClick={handleSaveFrame}
              className="px-3 py-1 text-xs rounded bg-emerald-600 text-white"
            >
              {lineupBuilderUi.saveFrame}
            </button>
            <button
              type="button"
              onClick={handlePlayToggle}
              className="px-3 py-1 text-xs rounded bg-blue-600 text-white"
            >
              {isPlaying ? "Stop" : "Play"}
            </button>
            <button
              type="button"
              onClick={handleExportGif}
              className="px-3 py-1 text-xs rounded bg-purple-600 text-white opacity-60 cursor-not-allowed"
              disabled
            >
              Export GIF
            </button>
            <button
              type="button"
              onClick={handleSendToBoard}
              className="px-3 py-1 text-xs rounded bg-orange-500 text-white"
            >
              {lineupBuilderUi.sendToBoard}
            </button>
            {returnTo && (
              <button
                type="button"
                onClick={handleAttachToReply}
                className="px-3 py-1 text-xs rounded bg-sky-600 text-white"
              >
                {lineupBuilderUi.attachAndReturn}
              </button>
            )}
          </div>
        </div>
          <PitchModeSelector
            value={pitchMode}
            onChange={setPitchMode}
            onClearPen={() => setDrawPaths([])}
            hasDrawings={drawPaths.length > 0}
          />
        <div className="w-full max-w-xl mx-auto" ref={boardRef}>
            <PitchBoard
              formation={formationDef}
              assignments={assignments}
              slotPositions={slotPositions}
              slotNames={slotNames}
              ball={ball}
              onBallChange={handleBallChange}
              onSlotPositionChange={onSlotPositionChange}
              onClearSlot={clearSlot}
              pitchMode={pitchMode}
              drawPaths={drawPaths}
              onDrawPathsChange={setDrawPaths}
            />
          </div>
        {gifUrl && (
          <div className="flex flex-col items-center gap-2 mt-2">
            <div className="text-[11px] text-gray-300">GIF exported (tactic.gif)</div>
            <div className="flex gap-2 flex-wrap justify-center">
              <button
                type="button"
                className="px-3 py-1 text-xs rounded bg-gray-800 text-white border border-white/20"
              >
                {lineupBuilderUi.gifNewThread}
              </button>
              <button
                type="button"
                className="px-3 py-1 text-xs rounded bg-gray-800 text-white border border-white/20"
              >
                {lineupBuilderUi.gifReply}
              </button>
            </div>
          </div>
        )}
          {onSave && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleSave}
                className="px-6 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700"
              >
                {saveLabel}
              </button>
            </div>
          )}
        </div>
      </div>
    </DndContext>
  );
}
