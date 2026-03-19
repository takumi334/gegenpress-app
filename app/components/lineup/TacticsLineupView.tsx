"use client";

import { useCallback, useEffect, useRef, useMemo, useState } from "react";
import { getFormation } from "@/lib/formations";
import type { FormationId } from "@/lib/formations";
import type { TacticsBoardData } from "@/lib/tacticsPlacements";
import { exportTacticsToGif, downloadBlob, type GifExportFormat } from "@/lib/tacticsGif";
import SoccerPitch from "./SoccerPitch";
import { drawSingleStroke } from "@/lib/tacticsStrokeDraw";
import { buildXPostShareText } from "@/lib/xPostShareText";
import type { BuildHashtagsInput } from "@/lib/xPostHashtags";

type TacticsLineupViewProps = {
  data: TacticsBoardData | null | undefined;
  /** 省略時は tactics-board-export.gif */
  exportFileName?: string;
  /**
   * GIF右欄の原文（NATIVE）。指定すると「コート左・コメント右・下部クレジット」の横長レイアウトで出力する。
   * 戦術ボードの body や投稿本文を渡す想定。
   */
  exportNativeBody?: string;
  /**
   * GIF右欄の翻訳本文（TRANSLATION）。指定すると NATIVE の下に TRANSLATION セクションとして描画する。
   * 投稿詳細で表示している翻訳と同じ値を渡す。
   */
  exportTranslatedBody?: string | null;
  /**
   * コピー用: NATIVE欄の本文。指定時は Copy JP / Copy EN / Copy X Post を表示。
   */
  copyNativeBody?: string;
  /**
   * コピー用: TRANSLATION欄の本文。空の場合は英語コピーは空、X投稿用は日本語+URLのみ。
   */
  copyTranslatedBody?: string | null;
  /**
   * コピー用: 戦術投稿のパス（例: /board/57/thread/17/tactics-board/7）。X投稿用の絶対URLに使う。
   */
  copyTargetPath?: string;
  /** X投稿ハッシュタグ用（例: FD のクラブ名）。英字でないとタグ化されない */
  xPostTeamDisplayName?: string | null;
  /** X投稿ハッシュタグ用リーグ名。省略時は親で推定しない */
  xPostLeagueName?: string | null;
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

function DrawingOverlay({
  strokes,
  className,
}: {
  strokes: { color: string; points: { x: number; y: number }[] }[];
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || strokes.length === 0) return;
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
    strokes.forEach((s) => {
      drawSingleStroke(ctx, s, w, h);
    });
  }, [strokes]);

  useEffect(() => {
    draw();
  }, [draw]);

  if (strokes.length === 0) return null;
  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className ?? ""}`}
    />
  );
}

function getAbsoluteUrl(path: string): string {
  if (typeof window !== "undefined") return `${window.location.origin}${path}`;
  return `https://gegenpress.app${path}`;
}

export default function TacticsLineupView({
  data,
  exportFileName,
  exportNativeBody,
  exportTranslatedBody,
  copyNativeBody,
  copyTranslatedBody,
  copyTargetPath,
  xPostTeamDisplayName,
  xPostLeagueName,
}: TacticsLineupViewProps) {
  const [isExportingGif, setIsExportingGif] = useState(false);
  const [toast, setToast] = useState<{ message: string; isError: boolean } | null>(null);
  const [showGifActions, setShowGifActions] = useState(false);

  const xPostHashtagContext: BuildHashtagsInput = useMemo(
    () => ({
      teamNames: xPostTeamDisplayName ? [xPostTeamDisplayName] : [],
      leagueName: xPostLeagueName ?? undefined,
    }),
    [xPostTeamDisplayName, xPostLeagueName]
  );

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const showCopyButtons = copyTargetPath != null;
  const nativeText = (copyNativeBody ?? "").trim();
  const translatedText = (copyTranslatedBody != null && copyTranslatedBody !== "" ? copyTranslatedBody : "").trim();

  const xPostText = useMemo(() => {
    if (!copyTargetPath) return "";
    return buildXPostShareText({
      translatedText,
      nativeText,
      url: getAbsoluteUrl(copyTargetPath),
      hashtagContext: xPostHashtagContext,
    });
  }, [copyTargetPath, translatedText, nativeText, xPostHashtagContext]);

  const copyToClipboard = useCallback(async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast({ message: successMessage, isError: false });
    } catch {
      setToast({ message: "コピーに失敗しました", isError: true });
    }
  }, []);

  const handleCopyJP = useCallback(() => {
    copyToClipboard(nativeText, "日本語をコピーしました");
  }, [copyToClipboard, nativeText]);

  const handleCopyEN = useCallback(() => {
    copyToClipboard(translatedText, "英語をコピーしました");
  }, [copyToClipboard, translatedText]);

  const handleCopyXPost = useCallback(() => {
    copyToClipboard(xPostText, "X投稿文をコピーしました");
  }, [copyToClipboard, xPostText]);

  const handleGifSuccessCopy = useCallback(() => {
    handleCopyXPost();
  }, [handleCopyXPost]);

  const handleGifSuccessOpenX = useCallback(() => {
    const text = xPostText;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    setShowGifActions(false);
  }, [xPostText]);
  const { formationDef, bySlot } = useMemo(() => {
    const f = (data?.formation ?? "4-3-3") as FormationId;
    const def = getFormation(f);
    const placements = data?.placements ?? [];
    const by = placementsBySlot(placements);
    return { formationDef: def, bySlot: by };
  }, [data]);

  const strokes = data?.drawingData?.strokes ?? [];
  const frames = data?.animationFrames ?? [];
  const hasFrames = frames.length > 0;
  const canUseFrameControls = hasFrames && frames.length > 1;
  const [frameIndex, setFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!hasFrames) return;
    const initial = data?.currentFrame ?? 0;
    setFrameIndex(initial >= 0 && initial < frames.length ? initial : 0);
  }, [hasFrames, data?.currentFrame, frames.length]);

  useEffect(() => {
    if (!canUseFrameControls || !isPlaying) return;
    const interval = setInterval(() => {
      setFrameIndex((i) => {
        if (i >= frames.length - 1) {
          setIsPlaying(false);
          return frames.length - 1;
        }
        return i + 1;
      });
    }, 800);
    return () => clearInterval(interval);
  }, [canUseFrameControls, isPlaying, frames.length]);

  useEffect(() => {
    if (!canUseFrameControls) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setFrameIndex((i) => Math.max(0, i - 1));
        e.preventDefault();
      } else if (e.key === "ArrowRight") {
        setFrameIndex((i) => Math.min(frames.length - 1, i + 1));
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canUseFrameControls, frames.length]);

  const activeFrame = hasFrames ? frames[frameIndex] : null;

  const activeStrokes = hasFrames && activeFrame ? activeFrame.strokes : strokes;

  const hasPlacements = (data?.placements?.length ?? 0) > 0;
  const hasDrawing = activeStrokes.length > 0;

  if (!hasPlacements && !hasDrawing) return null;

  const canPrev = canUseFrameControls && frameIndex > 0;
  const canNext = canUseFrameControls && frameIndex < frames.length - 1;

  const goPrev = useCallback(() => {
    if (canPrev) setFrameIndex((i) => Math.max(0, i - 1));
  }, [canPrev]);
  const goNext = useCallback(() => {
    if (canNext) setFrameIndex((i) => Math.min(frames.length - 1, i + 1));
  }, [canNext, frames.length]);

  const [gifFormat, setGifFormat] = useState<GifExportFormat>("vertical");
  const canExportGif = hasFrames && frames.length >= 2 && !isExportingGif;
  const handleExportGif = useCallback(async () => {
    if (!canExportGif || !data) return;
    setIsExportingGif(true);
    let url: string | null = null;
    try {
      const blob = await exportTacticsToGif(data, {
        format: gifFormat,
        delayMs: 700,
        nativeText: exportNativeBody,
        translatedText: exportTranslatedBody,
      });
      const name = exportFileName ?? "tactics-board-export.gif";
      url = downloadBlob(blob, name);
      console.log("[TacticsLineupView] GIF download triggered", name);
      if (copyTargetPath) setShowGifActions(true);
    } catch (e) {
      console.error("[TacticsLineupView] GIF export failed", e);
      const msg = e instanceof Error ? e.message : String(e);
      alert(msg || "GIFの生成に失敗しました");
    } finally {
      setIsExportingGif(false);
      if (url) setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
  }, [canExportGif, data, exportFileName, exportNativeBody, exportTranslatedBody, gifFormat, copyTargetPath]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative w-full rounded-xl overflow-hidden border-2 border-gray-600"
        style={{ aspectRatio: "68/105", maxWidth: 320 }}
      >
        <div className="absolute inset-0 flex items-center justify-center p-1">
          <SoccerPitch className="max-w-full max-h-full object-contain" />
        </div>

        {hasDrawing && <DrawingOverlay strokes={activeStrokes} />}

        {hasPlacements &&
          formationDef.slots.map((slot) => {
            const info = bySlot.get(slot.code);
            const name = info?.displayName ?? "";
            const role = info?.role ?? slot.label;
            const override = activeFrame?.slotPositions?.[slot.code];
            const x = override?.x ?? info?.x ?? slot.x;
            const y = override?.y ?? info?.y ?? slot.y;
            const showTwoLines = name.length > 0;
            return (
              <div
                key={slot.code}
                className="absolute w-14 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <div className="rounded-full border-2 border-green-500 bg-gray-800/95 px-2 py-1 flex flex-col items-center justify-center min-w-0 max-w-full min-h-[2rem]">
                  {showTwoLines ? (
                    <>
                      <span className="text-xs font-medium text-gray-100 truncate w-full text-center leading-tight">
                        {name}
                      </span>
                      <span className="text-[10px] text-gray-300 truncate w-full text-center leading-tight">
                        {role}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs font-medium text-gray-100 truncate">
                      {role}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

        {activeFrame?.ballPosition && (
          <div
            className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3b82f6] border-2 border-white shadow-md pointer-events-none"
            style={{
              left: `${activeFrame.ballPosition.x}%`,
              top: `${activeFrame.ballPosition.y}%`,
            }}
          />
        )}
      </div>

      {hasFrames && (
        <div className="w-full flex flex-col items-center gap-2 mt-2 p-3 rounded-lg bg-gray-800 border border-gray-600">
          <div className="flex items-center justify-center gap-3 min-h-[40px] flex-wrap">
            <button
              type="button"
              onClick={goPrev}
              disabled={!canPrev || isExportingGif}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-700 text-white border border-gray-600 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-700 transition-colors"
            >
              Prev
            </button>
            <span className="min-w-[7rem] text-center text-sm font-semibold text-white">
              Frame {frameIndex + 1} / {frames.length}
            </span>
            <button
              type="button"
              onClick={goNext}
              disabled={!canNext || isExportingGif}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-700 text-white border border-gray-600 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-700 transition-colors"
            >
              Next
            </button>
          </div>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              disabled={!canUseFrameControls || isExportingGif}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-700 text-white border border-gray-600 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
            <span className="text-xs text-gray-400 mr-1">GIF:</span>
            <select
              value={gifFormat}
              onChange={(e) => setGifFormat(e.target.value as GifExportFormat)}
              disabled={isExportingGif}
              className="px-2 py-1.5 rounded-lg text-sm bg-gray-700 text-white border border-gray-600 disabled:opacity-50"
              aria-label="GIF format"
            >
              <option value="vertical">縦 9:16 (SNS)</option>
              <option value="square">正方形 1:1</option>
            </select>
            <button
              type="button"
              onClick={handleExportGif}
              disabled={!canExportGif}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-700 text-white border border-gray-600 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isExportingGif ? "生成中..." : "GIF生成"}
            </button>
          </div>
          {showGifActions && (
            <div className="flex items-center justify-center gap-2 flex-wrap mt-1 pt-2 border-t border-gray-600">
              <span className="text-xs text-gray-400">GIFをダウンロードしました</span>
              <button
                type="button"
                onClick={handleGifSuccessCopy}
                className="px-2 py-1 rounded text-xs font-medium bg-green-700 text-white hover:bg-green-600"
              >
                投稿文をコピー
              </button>
              <button
                type="button"
                onClick={handleGifSuccessOpenX}
                className="px-2 py-1 rounded text-xs font-medium bg-[#0a0a0a] text-white border border-white/20 hover:bg-[#1a1a1a]"
              >
                Xで開く
              </button>
            </div>
          )}
        </div>
      )}
      {showCopyButtons && !hasFrames && (
        <div className="w-full flex items-center justify-center gap-2 flex-wrap mt-2 p-2 rounded-lg bg-gray-800 border border-gray-600">
          <button
            type="button"
            onClick={handleCopyXPost}
            className="px-2 py-1.5 rounded-lg text-xs font-medium bg-gray-700 text-white border border-gray-600 hover:bg-gray-600"
          >
            投稿文をコピー
          </button>
          <button
            type="button"
            onClick={handleGifSuccessOpenX}
            className="px-2 py-1.5 rounded-lg text-xs font-medium bg-[#0a0a0a] text-white border border-white/20 hover:bg-[#1a1a1a]"
          >
            Xで開く
          </button>
        </div>
      )}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm font-medium shadow-lg z-50 ${
            toast.isError ? "bg-red-700 text-white" : "bg-gray-800 text-white border border-gray-600"
          }`}
        >
          {toast.message}
        </div>
      )}
      <p
        className="text-center mt-2 text-[12px] sm:text-[13px]"
        style={{ color: "#888" }}
      >
        Created with gegenpress.app
      </p>
    </div>
  );
}
