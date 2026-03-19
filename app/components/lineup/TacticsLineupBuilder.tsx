"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { getFormation, type FormationId } from "@/lib/formations";
import type { TacticsSlotAssignments, SlotPositions, BallPosition } from "./TacticsPitchBoard";
import type { DrawingStroke } from "@/lib/tacticsPlacements";
import FormationSelector from "./FormationSelector";
import TacticsPitchBoard from "./TacticsPitchBoard";
import TacticsBoardToolbar, { type BoardMode, type PenColor } from "./TacticsBoardToolbar";
import type { DrawToolKind } from "./TacticsDrawingCanvas";
import PlayerChip from "./PlayerChip";
import { useT } from "@/lib/NativeLangProvider";
import type { TacticsPlayer } from "@/lib/tacticsPlayers";
import { drawWatermark } from "@/lib/tacticsGif";

export type LineupBuilderData = {
  formation: FormationId;
  assignments: TacticsSlotAssignments;
  slotPositions: SlotPositions;
  strokes: DrawingStroke[];
  frames?: {
    slotPositions: SlotPositions;
    ballPosition: BallPosition;
    strokes: DrawingStroke[];
  }[];
  currentFrame?: number;
};

type BuilderFrame = {
  slotPositions: SlotPositions;
  ballPosition: BallPosition;
  strokes: DrawingStroke[];
};

type TacticsLineupBuilderProps = {
  players: TacticsPlayer[];
  initialFormation?: FormationId;
  initialAssignments?: TacticsSlotAssignments;
  initialSlotPositions?: SlotPositions;
  initialStrokes?: DrawingStroke[];
  /** 4フレーム分を渡すとアニメ・線を復元（編集画面用） */
  initialAnimationFrames?: BuilderFrame[];
  initialCurrentFrame?: number;
  onChange?: (data: LineupBuilderData) => void;
};

function cloneFrame(f: BuilderFrame): BuilderFrame {
  return {
    slotPositions: { ...f.slotPositions },
    ballPosition: f.ballPosition ? { ...f.ballPosition } : null,
    strokes: f.strokes.map((s) => ({
      ...s,
      points: s.points.map((p) => ({ ...p })),
    })),
  };
}

export default function TacticsLineupBuilder({
  players,
  initialFormation = "4-3-3",
  initialAssignments = {},
  initialSlotPositions = {},
  initialStrokes = [],
  initialAnimationFrames,
  initialCurrentFrame = 0,
  onChange,
}: TacticsLineupBuilderProps) {
  const t = useT();
  const [formation, setFormation] = useState<FormationId>(initialFormation);
  const [assignments, setAssignments] = useState<TacticsSlotAssignments>(initialAssignments);
  const [frames, setFrames] = useState<BuilderFrame[]>(() => {
    if (initialAnimationFrames && initialAnimationFrames.length > 0) {
      const src = initialAnimationFrames;
      return [0, 1, 2, 3].map((idx) => {
        const f = src[idx] ?? src[src.length - 1];
        return cloneFrame(f);
      });
    }
    const basePositions = initialSlotPositions;
    return Array.from({ length: 4 }).map((_, idx) => ({
      slotPositions: idx === 0 ? { ...basePositions } : { ...basePositions },
      ballPosition: { x: 50, y: 50 },
      strokes: idx === 0 ? [...initialStrokes] : [],
    }));
  });
  const [currentFrame, setCurrentFrame] = useState(() => {
    if (initialAnimationFrames?.length) {
      const max = initialAnimationFrames.length - 1;
      return Math.min(Math.max(0, initialCurrentFrame), max);
    }
    return Math.min(Math.max(0, initialCurrentFrame), 3);
  });
  const [strokes, setStrokes] = useState<DrawingStroke[]>(() => {
    if (initialAnimationFrames && initialAnimationFrames.length > 0) {
      const i = Math.min(Math.max(0, initialCurrentFrame), initialAnimationFrames.length - 1);
      return initialAnimationFrames[i]?.strokes?.map((s) => ({
        ...s,
        points: s.points.map((p) => ({ ...p })),
      })) ?? [];
    }
    return [...initialStrokes];
  });
  const [mode, setMode] = useState<BoardMode>("placement");
  const [penColor, setPenColor] = useState<PenColor>("red");
  const [drawTool, setDrawTool] = useState<DrawToolKind>("freehand");
  const [penLineWidth, setPenLineWidth] = useState(4);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gifUrl, setGifUrl] = useState<string | null>(null);

  const formationDef = useMemo(() => getFormation(formation), [formation]);

  const activeFrame = frames[currentFrame] ?? frames[0];
  const slotPositions = activeFrame?.slotPositions ?? {};
  const ballPosition = activeFrame?.ballPosition ?? null;

  const notifyChange = useCallback(
    (updates: Partial<LineupBuilderData>) => {
      onChange?.({
        formation,
        assignments,
        slotPositions,
        strokes,
        frames,
        currentFrame,
        ...updates,
      });
    },
    [formation, assignments, slotPositions, strokes, frames, currentFrame, onChange]
  );

  const onFormationChange = useCallback(
    (id: FormationId) => {
      setFormation(id);
      setAssignments((prev) => {
        const next = { ...prev };
        const newSlots = getFormation(id).slots.map((s) => s.code);
        Object.keys(next).forEach((code) => {
          if (!newSlots.includes(code)) delete next[code];
        });
        const newSlotPositions = { ...slotPositions };
        Object.keys(newSlotPositions).forEach((code) => {
          if (!newSlots.includes(code)) delete newSlotPositions[code];
        });
        setFrames((prevFrames) =>
          prevFrames.map((f, idx) => ({
            slotPositions: idx === 0 ? newSlotPositions : { ...newSlotPositions },
            ballPosition: f.ballPosition,
            strokes: f.strokes,
          }))
        );
        notifyChange({ formation: id, assignments: next, slotPositions: newSlotPositions });
        return next;
      });
    },
    [notifyChange]
  );

  const handleSlotPositionChange = useCallback(
    (slotCode: string, x: number, y: number) => {
      setFrames((prev) => {
        const copy = [...prev];
        const frame = copy[currentFrame] ?? { slotPositions: {}, ballPosition: null };
        const nextSlots = { ...frame.slotPositions, [slotCode]: { x, y } };
        copy[currentFrame] = { ...frame, slotPositions: nextSlots };
        notifyChange({ slotPositions: nextSlots, frames: copy, currentFrame });
        return copy;
      });
    },
    [currentFrame, notifyChange]
  );

  const handleStrokesChange = useCallback(
    (s: DrawingStroke[]) => {
      setStrokes(s);
      setFrames((prev) => {
        const copy = [...prev];
        const frame = copy[currentFrame] ?? { slotPositions: {}, ballPosition: null, strokes: [] };
        const nextFrame = { ...frame, strokes: s };
        copy[currentFrame] = nextFrame;
        notifyChange({ strokes: s, frames: copy, currentFrame });
        return copy;
      });
    },
    [currentFrame, notifyChange]
  );

  const handleClearAll = useCallback(() => {
    setStrokes([]);
    setFrames((prev) => {
      const copy = [...prev];
      const frame = copy[currentFrame] ?? { slotPositions: {}, ballPosition: null, strokes: [] };
      const nextFrame = { ...frame, strokes: [] };
      copy[currentFrame] = nextFrame;
      notifyChange({ strokes: [], frames: copy, currentFrame });
      return copy;
    });
  }, [currentFrame, notifyChange]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;
      const activeId = String(active.id);
      const overId = String(over.id);
      if (!activeId.startsWith("chip-") || !overId.startsWith("slot-")) return;
      const playerId = activeId.replace("chip-", "");
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
        next[positionCode] = {
          id: player.id,
          name: player.name,
          translatedName: player.translatedName,
          teamName: player.teamName,
        };
        if (previousPlayer && previousPlayer.id !== playerId) {
          const freed = previousPlayer;
          Object.keys(next).forEach((code) => {
            if (next[code]?.id === freed.id) next[code] = null;
          });
        }
        notifyChange({ assignments: next });
        return next;
      });
    },
    [players, formationDef.slots, notifyChange]
  );

  const assignedIds = useMemo(
    () => new Set(Object.values(assignments).filter(Boolean).map((p) => p!.id)),
    [assignments]
  );
  const availablePlayers = useMemo(
    () => players.filter((p) => !assignedIds.has(p.id)),
    [players, assignedIds]
  );

  const clearSlot = useCallback(
    (positionCode: string) => {
      setAssignments((prev) => {
        const next = { ...prev, [positionCode]: null };
        notifyChange({ assignments: next });
        return next;
      });
    },
    [notifyChange]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleBallPositionChange = useCallback(
    (x: number, y: number) => {
      setFrames((prev) => {
        const copy = [...prev];
        const frame = copy[currentFrame] ?? { slotPositions: {}, ballPosition: null };
        const nextFrame = { ...frame, ballPosition: { x, y } as BallPosition };
        copy[currentFrame] = nextFrame;
        notifyChange({ frames: copy, currentFrame });
        return copy;
      });
    },
    [currentFrame, notifyChange]
  );

  useEffect(() => {
    // 再生・フレーム切り替えに合わせてペン線も同期
    const active = frames[currentFrame];
    if (active && active.strokes !== strokes) {
      setStrokes(active.strokes);
    }
  }, [currentFrame, frames, strokes]);

  useEffect(() => {
    if (!isPlaying) return;
    let frameIndex = currentFrame;
    const interval = setInterval(() => {
      frameIndex = (frameIndex + 1) % 4;
      setCurrentFrame(frameIndex);
    }, 800);
    return () => clearInterval(interval);
  }, [isPlaying, currentFrame]);

  const handlePlayToggle = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleSelectFrame = useCallback((index: number) => {
    setIsPlaying(false);
    setCurrentFrame(index);
  }, []);

  const handleCopyFromPrevious = useCallback(() => {
    setFrames((prev) => {
      const copy = [...prev];
      if (currentFrame === 0) return copy;
      const prevFrame = copy[currentFrame - 1];
      if (!prevFrame) return copy;
      copy[currentFrame] = {
        slotPositions: { ...prevFrame.slotPositions },
        ballPosition: prevFrame.ballPosition ? { ...prevFrame.ballPosition } : null,
        strokes: [...(prevFrame.strokes ?? [])],
      };
      const active = copy[currentFrame];
      setStrokes(active.strokes);
      notifyChange({
        slotPositions: active.slotPositions,
        strokes: active.strokes,
        frames: copy,
        currentFrame,
      });
      return copy;
    });
  }, [currentFrame, notifyChange]);

  const handleSaveCurrentFrame = useCallback(() => {
    setFrames((prev) => {
      const copy = [...prev];
      const frame = copy[currentFrame] ?? {
        slotPositions: {} as SlotPositions,
        ballPosition: null as BallPosition,
        strokes: [] as DrawingStroke[],
      };
      const nextFrame = {
        ...frame,
        slotPositions,
        ballPosition,
        strokes,
      };
      copy[currentFrame] = nextFrame;
      notifyChange({ frames: copy, currentFrame });
      return copy;
    });
  }, [currentFrame, slotPositions, ballPosition, strokes, notifyChange]);

  const handleGenerateGif = useCallback(async () => {
    if (!boardRef.current) return;
    const [html2canvas, GIFLib] = await Promise.all([
      import("html2canvas").then((m) => m.default),
      import("gif.js").then((m) => (m.default || (m as any))),
    ]);

    const gif = new (GIFLib as any)({
      workers: 2,
      quality: 10,
      workerScript: "/gif.worker.js",
    });

    for (let i = 0; i < 4; i++) {
      await new Promise<void>((resolve) => {
        setCurrentFrame(i);
        setTimeout(async () => {
          if (!boardRef.current) {
            resolve();
            return;
          }
          const canvas = await html2canvas(boardRef.current, { backgroundColor: "#000000" });
          const ctx = canvas.getContext("2d");
          if (ctx) drawWatermark(ctx, canvas.width, canvas.height);
          gif.addFrame(canvas, { delay: 800 });
          resolve();
        }, 200);
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
  }, []);

  return (
    <DndContext onDragEnd={handleDragEnd} sensors={sensors}>
      <div className="flex flex-col gap-3">
        <TacticsBoardToolbar
          mode={mode}
          onModeChange={setMode}
          penColor={penColor}
          onPenColorChange={setPenColor}
          onClearAll={handleClearAll}
          penModeActive={mode === "pen"}
          drawTool={drawTool}
          onDrawToolChange={setDrawTool}
          penLineWidth={penLineWidth}
          onPenLineWidthChange={setPenLineWidth}
        />
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
                Frame {idx + 1}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap justify-center mt-1">
            <button
              type="button"
              onClick={handleSaveCurrentFrame}
              className="px-3 py-1 text-xs rounded bg-emerald-600 text-white"
            >
              Save Frame
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
              onClick={handleGenerateGif}
              className="px-3 py-1 text-xs rounded bg-purple-600 text-white"
            >
              Export GIF
            </button>
          </div>
        </div>
        <div className="w-full max-w-md mx-auto" ref={boardRef}>
          <TacticsPitchBoard
            formation={formationDef}
            assignments={assignments}
            slotPositions={slotPositions}
            onSlotPositionChange={handleSlotPositionChange}
            onClearSlot={clearSlot}
            placementModeActive={mode === "placement"}
            strokes={strokes}
            onStrokesChange={handleStrokesChange}
            penColor={penColor}
            penLineWidth={penLineWidth}
            drawTool={drawTool}
            penModeActive={mode === "pen"}
            ballPosition={ballPosition}
            onBallPositionChange={handleBallPositionChange}
          />
        </div>
        {gifUrl && (
          <div className="flex flex-col items-center gap-2 mt-1">
            <div className="text-[11px] text-gray-300">GIF exported (tactic.gif)</div>
            <div className="flex gap-2 flex-wrap justify-center">
              <button
                type="button"
                className="px-3 py-1 text-xs rounded bg-gray-800 text-white border border-white/20"
              >
                このGIFで新規スレッド作成
              </button>
              <button
                type="button"
                className="px-3 py-1 text-xs rounded bg-gray-800 text-white border border-white/20"
              >
                このGIFを返信投稿
              </button>
            </div>
          </div>
        )}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("tactics.playerList")}
          </h3>
          <div className="flex flex-wrap gap-2 p-2 rounded-lg bg-gray-800/50 border border-gray-700 max-h-32 overflow-y-auto">
            {availablePlayers.length === 0 ? (
              <p className="text-xs text-gray-500 p-2">{t("tactics.allPlaced")}</p>
            ) : (
              availablePlayers.map((p) => (
                <PlayerChip
                  key={p.id}
                  player={{ id: p.id, name: p.name, translatedName: p.translatedName, teamName: p.teamName }}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </DndContext>
  );
}
