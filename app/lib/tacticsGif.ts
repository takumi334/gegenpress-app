/**
 * 戦術ボードデータからGIFを生成（ブラウザのみ、gif.js使用）
 */

import { getFormation } from "@/lib/formations";
import type { FormationId } from "@/lib/formations";
import type { TacticsBoardData, DrawingStroke } from "@/lib/tacticsPlacements";
import { drawSingleStroke } from "@/lib/tacticsStrokeDraw";

const PITCH_ASPECT = 105 / 68; // height/width
const PITCH_WIDTH_RATIO = 68 / 105; // width/height
const DEFAULT_WIDTH = 600;
const DEFAULT_DELAY_MS = 700;

/** SNS最適化: 縦長 9:16（モバイルで最大表示） */
const SNS_VERTICAL_WIDTH = 720;
const SNS_VERTICAL_HEIGHT = 1280;
/** SNS最適化: 正方形 1:1 */
const SNS_SQUARE_SIZE = 1080;
/** コート描画の論理サイズ（アスペクト比 68:105 を維持） */
const LOGICAL_PITCH_HEIGHT = 1050;
const LOGICAL_PITCH_WIDTH = Math.round(LOGICAL_PITCH_HEIGHT * PITCH_WIDTH_RATIO);

/** コメント付きレイアウト用サイズ */
const LAYOUT_PITCH_WIDTH = 600;
const LAYOUT_COMMENT_WIDTH = 280;
const LAYOUT_GAP = 20;
const LAYOUT_CREDIT_HEIGHT = 36;
const LAYOUT_PITCH_HEIGHT = Math.round(LAYOUT_PITCH_WIDTH * PITCH_ASPECT);
const LAYOUT_TOTAL_WIDTH = LAYOUT_PITCH_WIDTH + LAYOUT_GAP + LAYOUT_COMMENT_WIDTH;
const LAYOUT_TOTAL_HEIGHT = LAYOUT_PITCH_HEIGHT + LAYOUT_CREDIT_HEIGHT;

/** コメント欄: 各セクションの最大表示行数（超えたら末尾を … で省略） */
const COMMENT_SECTION_MAX_LINES = 10;
const COMMENT_MAX_LINES = 18;
const COMMENT_LINE_HEIGHT_RATIO = 1.35;
const COMMENT_HEADING = "Tactical Note";
const LABEL_NATIVE = "NATIVE";
const LABEL_TRANSLATION = "TRANSLATION";
const SECTION_GAP = 12;

/**
 * 長文を maxWidth で折り返し、最大 maxLines 行まで返す。改行 \\n も尊重。
 * 日本語など CJK は文字単位で折り返し（単語境界に依存しない）。
 */
function getWrappedLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const lines: string[] = [];
  const paragraphs = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  for (const para of paragraphs) {
    if (lines.length >= maxLines) break;
    const remaining = para.trim();
    if (!remaining) {
      if (lines.length < maxLines) lines.push("");
      continue;
    }
    let rest = remaining;
    while (rest.length > 0 && lines.length < maxLines) {
      if (ctx.measureText(rest).width <= maxWidth) {
        lines.push(rest);
        break;
      }
      let low = 0;
      let high = rest.length;
      while (high - low > 1) {
        const mid = Math.floor((low + high) / 2);
        if (ctx.measureText(rest.slice(0, mid)).width <= maxWidth) low = mid;
        else high = mid;
      }
      const breakAt = low;
      if (breakAt <= 0) {
        lines.push(rest[0]);
        rest = rest.slice(1);
      } else {
        lines.push(rest.slice(0, breakAt));
        rest = rest.slice(breakAt).trimStart();
      }
    }
  }
  return lines.slice(0, maxLines);
}

/**
 * 折り返しテキストを canvas に描画する。maxLines を超えた行は描画せず末尾を … で示す。
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
): void {
  const lines = getWrappedLines(ctx, text, maxWidth, maxLines);
  const truncated = lines.length === maxLines && text.length > 0;
  const lastLine = truncated ? lines[lines.length - 1] + "…" : lines[lines.length - 1];
  const drawLines = truncated ? [...lines.slice(0, -1), lastLine] : lines;
  drawLines.forEach((line, i) => {
    ctx.fillText(line, x, y + (i + 0.5) * lineHeight);
  });
}

function placementsBySlot(
  placements: {
    slotCode: string;
    playerName?: string;
    translatedName?: string;
    label?: string | null;
    x?: number;
    y?: number;
  }[]
): Map<string, { role: string; displayName: string; x?: number; y?: number }> {
  const m = new Map<string, { role: string; displayName: string; x?: number; y?: number }>();
  placements.forEach((p) => {
    const name = p.playerName ?? "";
    const displayName = (p.translatedName ?? name).trim() || name;
    m.set(p.slotCode, {
      role: p.label ?? p.slotCode,
      displayName,
      x: p.x,
      y: p.y,
    });
  });
  return m;
}

function drawPitch(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const pad = Math.min(w, h) * 0.02;
  const x0 = pad;
  const y0 = pad;
  const pw = w - 2 * pad;
  const ph = h - 2 * pad;

  // 芝生（グラデーション風に単色で）
  ctx.fillStyle = "#276633";
  ctx.fillRect(x0, y0, pw, ph);

  ctx.strokeStyle = "white";
  ctx.lineWidth = Math.max(1.5, pw * 0.004);

  // 外枠
  ctx.strokeRect(x0, y0, pw, ph);
  // ハーフウェーライン
  ctx.beginPath();
  ctx.moveTo(x0, y0 + ph / 2);
  ctx.lineTo(x0 + pw, y0 + ph / 2);
  ctx.stroke();
  // センターサークル
  ctx.beginPath();
  ctx.arc(x0 + pw / 2, y0 + ph / 2, pw * 0.13, 0, Math.PI * 2);
  ctx.stroke();
  // ペナルティエリア（ゴール前の大きい四角）40.32m×16.5m → 幅59% / 深さ16%
  const boxW = pw * 0.59;
  const boxH = ph * 0.16;
  ctx.strokeRect(x0 + (pw - boxW) / 2, y0, boxW, boxH);
  ctx.strokeRect(x0 + (pw - boxW) / 2, y0 + ph - boxH, boxW, boxH);
  // ゴールエリア（ゴール前の小さい四角）18.32m×5.5m → 幅27% / 深さ5.2%
  const goalBoxW = pw * 0.27;
  const goalBoxH = ph * 0.052;
  ctx.strokeRect(x0 + (pw - goalBoxW) / 2, y0, goalBoxW, goalBoxH);
  ctx.strokeRect(x0 + (pw - goalBoxW) / 2, y0 + ph - goalBoxH, goalBoxW, goalBoxH);
}

function drawStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: DrawingStroke[],
  w: number,
  h: number
) {
  if (!strokes.length) return;
  strokes.forEach((s) => {
    drawSingleStroke(ctx, s, w, h);
  });
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  data: TacticsBoardData,
  frameIndex: number,
  w: number,
  h: number
) {
  const frame = data?.animationFrames?.[frameIndex] as
    | {
        formation?: string;
        assignments?: Record<
          string,
          { name?: string; translatedName?: string } | null
        >;
        slotNames?: Record<string, string>;
        slotPositions?: Record<string, { x: number; y: number }>;
        ballPosition?: { x: number; y: number } | null;
        strokes?: DrawingStroke[];
      }
    | undefined;
  if (!frame) return;

  const formation = ((frame.formation ?? data?.formation) || "4-3-3") as FormationId;
  const formationDef = getFormation(formation);
  const placements = data?.placements ?? [];
  const bySlot = placementsBySlot(placements);

  drawPitch(ctx, w, h);

  const strokes = frame.strokes ?? [];
  drawStrokes(ctx, strokes, w, h);

  // 選手マーカー（円＋ポジションラベル＋表示名）。スマホでも潰れないようフォントは最小保証
  const slotPositions = frame.slotPositions ?? {};
  const baseSize = Math.min(w, h);
  const nameFontSize = Math.max(11, baseSize * 0.022);
  const labelFontSize = Math.max(9, baseSize * 0.016);
  const r = baseSize * 0.026;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  formationDef.slots.forEach((slot) => {
    const override = slotPositions[slot.code];
    const x = override?.x ?? slot.x;
    const y = override?.y ?? slot.y;
    const px = (x / 100) * w;
    const py = (y / 100) * h;
    ctx.fillStyle = "rgba(30, 41, 59, 0.95)";
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // ポジションラベル（ST / CM / LB など）円内に小さめの白文字
    const info = bySlot.get(slot.code);
    const roleLabel = info?.role ?? slot.label ?? slot.code;
    ctx.fillStyle = "rgba(255, 255, 255, 0.98)";
    ctx.font = `bold ${labelFontSize}px sans-serif`;
    ctx.textBaseline = "middle";
    ctx.fillText(roleLabel, px, py);
    // 選手名は円の下に表示
    const assigned = frame.assignments?.[slot.code];
    const displayName =
      frame.slotNames?.[slot.code]?.trim() ||
      assigned?.translatedName?.trim() ||
      assigned?.name?.trim() ||
      "";
    if (displayName) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.font = `${nameFontSize}px sans-serif`;
      ctx.textBaseline = "top";
      ctx.fillText(displayName, px, py + r + 2);
    }
  });

  // ボール
  const ball = frame.ballPosition;
  if (ball) {
    const bx = (ball.x / 100) * w;
    const by = (ball.y / 100) * h;
    const br = Math.min(w, h) * 0.015;
    ctx.fillStyle = "#3b82f6";
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

const WATERMARK_TEXT = "Created with gegenpress.app";

/** キャンバス最下部中央に半透明黒帯＋白文字で透かしを描画。GIF用。 */
export function drawWatermark(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const bandHeight = Math.max(20, h * 0.06);
  const y0 = h - bandHeight;
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(0, y0, w, bandHeight);
  ctx.fillStyle = "white";
  ctx.font = `bold ${Math.max(10, Math.round(bandHeight * 0.55))}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(WATERMARK_TEXT, w / 2, y0 + bandHeight / 2);
}

/**
 * コメント付きレイアウト用: 右側のコメントカードを描画。
 * 上: NATIVE 見出し + native本文、下: TRANSLATION 見出し + translation本文（値がある場合のみ）。
 */
function drawCommentPanel(
  ctx: CanvasRenderingContext2D,
  nativeText: string,
  translatedText: string | undefined | null,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const padding = 16;
  const innerW = w - padding * 2;
  const labelFontSize = 11;
  const bodyFontSize = 13;
  const bodyLineHeight = bodyFontSize * COMMENT_LINE_HEIGHT_RATIO;
  const lineHeight = labelFontSize * COMMENT_LINE_HEIGHT_RATIO;

  ctx.fillStyle = "rgba(30, 30, 35, 0.96)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);

  const tx = x + padding;
  let ty = y + padding;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  // Tactical Note
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.font = `bold 14px sans-serif`;
  ctx.fillText(COMMENT_HEADING, tx, ty);
  ty += lineHeight * 1.4;

  // NATIVE
  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  ctx.font = `bold ${labelFontSize}px sans-serif`;
  ctx.fillText(LABEL_NATIVE, tx, ty);
  ty += lineHeight;
  const nativeBody = (nativeText || "").trim() || " ";
  const nativeLines = getWrappedLines(ctx, nativeBody, innerW, COMMENT_SECTION_MAX_LINES);
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.font = `${bodyFontSize}px sans-serif`;
  wrapText(ctx, nativeBody, tx, ty, innerW, bodyLineHeight, COMMENT_SECTION_MAX_LINES);
  ty += bodyLineHeight * nativeLines.length + SECTION_GAP;

  // TRANSLATION（値がある場合のみ）
  const hasTranslation = (translatedText ?? "").trim().length > 0;
  if (hasTranslation) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    ctx.font = `bold ${labelFontSize}px sans-serif`;
    ctx.fillText(LABEL_TRANSLATION, tx, ty);
    ty += lineHeight;
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.font = `${bodyFontSize}px sans-serif`;
    wrapText(ctx, (translatedText ?? "").trim(), tx, ty, innerW, bodyLineHeight, COMMENT_SECTION_MAX_LINES);
  }
}

/** GIF出力フォーマット（SNS最適化） */
export type GifExportFormat = "vertical" | "square";

export type ExportTacticsGifOptions = {
  width?: number;
  delayMs?: number;
  /**
   * SNS最適化フォーマット。
   * - "vertical": 9:16（720x1280）縦長・モバイルで最大表示
   * - "square": 1:1（1080x1080）正方形
   * 未指定時は従来の横長コート比率。
   */
  format?: GifExportFormat;
  /**
   * コメント欄（右側）に表示する原文。指定すると「コート左・コメント右・下部クレジット」の横長レイアウトで出力する。
   * format が vertical/square の場合は無視され、コートのみ中央配置で出力する。
   */
  nativeText?: string;
  /**
   * コメント欄の翻訳本文。指定すると NATIVE の下に TRANSLATION セクションとして描画する。
   */
  translatedText?: string | null;
  /** @deprecated 代わりに nativeText を使用。互換のため comment があれば nativeText として扱う。 */
  comment?: string;
};

const LOG_PREFIX = "[tacticsGif]";

/**
 * 戦術ボードの全フレームからGIFを生成する。ブラウザのみ（window / gif.js）。
 * 2フレーム未満の場合は失敗する。
 */
export async function exportTacticsToGif(
  data: TacticsBoardData | null | undefined,
  options?: ExportTacticsGifOptions
): Promise<Blob> {
  if (typeof window === "undefined") {
    throw new Error("exportTacticsToGif is only available in the browser");
  }
  const frames = data?.animationFrames ?? [];
  if (frames.length < 2) {
    throw new Error("GIF requires at least 2 frames");
  }

  const format = options?.format;
  const useSnsLayout = format === "vertical" || format === "square";
  const nativeText = (options?.nativeText ?? options?.comment ?? "").trim();
  const translatedText = options?.translatedText ?? null;
  const withCommentLayout = !useSnsLayout && nativeText.length > 0;

  let width: number;
  let height: number;
  if (format === "vertical") {
    width = SNS_VERTICAL_WIDTH;
    height = SNS_VERTICAL_HEIGHT;
  } else if (format === "square") {
    width = SNS_SQUARE_SIZE;
    height = SNS_SQUARE_SIZE;
  } else if (withCommentLayout) {
    width = LAYOUT_TOTAL_WIDTH;
    height = LAYOUT_TOTAL_HEIGHT;
  } else {
    width = options?.width ?? DEFAULT_WIDTH;
    height = Math.round((options?.width ?? DEFAULT_WIDTH) * PITCH_ASPECT);
  }
  const delayMs = options?.delayMs ?? DEFAULT_DELAY_MS;

  const GIFLib = (await import("gif.js")).default || (await import("gif.js"));
  const workerScript = "/gif.worker.js";

  const gif = new (GIFLib as any)({
    workers: 2,
    quality: 10,
    workerScript,
  });

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas 2d context");

  for (let i = 0; i < frames.length; i++) {
    ctx.clearRect(0, 0, width, height);

    if (useSnsLayout) {
      // SNS用: 黒背景にコートを中央配置・アスペクト比維持で拡大
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, width, height);
      const scale = Math.min(
        width / LOGICAL_PITCH_WIDTH,
        height / LOGICAL_PITCH_HEIGHT
      );
      const drawW = LOGICAL_PITCH_WIDTH * scale;
      const drawH = LOGICAL_PITCH_HEIGHT * scale;
      const offsetX = (width - drawW) / 2;
      const offsetY = (height - drawH) / 2;
      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);
      drawFrame(ctx, data!, i, LOGICAL_PITCH_WIDTH, LOGICAL_PITCH_HEIGHT);
      ctx.restore();
    } else if (withCommentLayout) {
      drawFrame(ctx, data!, i, LAYOUT_PITCH_WIDTH, LAYOUT_PITCH_HEIGHT);
      drawCommentPanel(
        ctx,
        nativeText,
        translatedText,
        LAYOUT_PITCH_WIDTH + LAYOUT_GAP,
        0,
        LAYOUT_COMMENT_WIDTH,
        LAYOUT_PITCH_HEIGHT
      );
    } else {
      drawFrame(ctx, data!, i, width, height);
    }
    drawWatermark(ctx, width, height);
    gif.addFrame(canvas, { copy: true, delay: delayMs });
  }

  return new Promise<Blob>((resolve, reject) => {
    gif.on("finished", (blob: Blob) => {
      resolve(blob);
    });
    gif.on("error", (e: Error) => {
      console.error(LOG_PREFIX, "GIF render error", e);
      reject(e);
    });
    gif.on("abort", () => {
      console.warn(LOG_PREFIX, "GIF render abort");
      reject(new Error("GIF render aborted"));
    });
    try {
      gif.render();
    } catch (e) {
      console.error(LOG_PREFIX, "gif.render() threw", e);
      reject(e);
    }
  });
}

/**
 * Blobを指定ファイル名でダウンロード。呼び出し元でURL.revokeObjectURLすること。
 */
export function downloadBlob(blob: Blob, filename: string): string {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  return url;
}
