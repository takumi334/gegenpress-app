"use client";

import { useT } from "@/lib/NativeLangProvider";
import type { DrawToolKind } from "./TacticsDrawingCanvas";

export type BoardMode = "placement" | "pen";
export type PenColor = "red" | "blue" | "erase";

type TacticsBoardToolbarProps = {
  mode: BoardMode;
  onModeChange: (m: BoardMode) => void;
  penColor: PenColor;
  onPenColorChange: (c: PenColor) => void;
  onClearAll: () => void;
  penModeActive: boolean;
  drawTool: DrawToolKind;
  onDrawToolChange: (t: DrawToolKind) => void;
  penLineWidth: number;
  onPenLineWidthChange: (w: number) => void;
};

export default function TacticsBoardToolbar({
  mode,
  onModeChange,
  penColor,
  onPenColorChange,
  onClearAll,
  penModeActive,
  drawTool,
  onDrawToolChange,
  penLineWidth,
  onPenLineWidthChange,
}: TacticsBoardToolbarProps) {
  const t = useT();
  return (
    <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-gray-800/80 border border-gray-700">
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-400 mr-1">{t("tactics.mode")}:</span>
        <button
          type="button"
          onClick={() => onModeChange("placement")}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            mode === "placement"
              ? "bg-green-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          {t("tactics.placement")}
        </button>
        <button
          type="button"
          onClick={() => onModeChange("pen")}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            mode === "pen" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          {t("tactics.pen")}
        </button>
      </div>
      {penModeActive && (
        <>
          <span className="text-gray-600">|</span>
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-xs text-gray-400 mr-1">{t("tactics.drawTools")}:</span>
            <button
              type="button"
              onClick={() => onDrawToolChange("freehand")}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                drawTool === "freehand"
                  ? "bg-slate-500 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {t("tactics.freehand")}
            </button>
            <button
              type="button"
              onClick={() => onDrawToolChange("line")}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                drawTool === "line"
                  ? "bg-slate-500 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {t("tactics.line")}
            </button>
            <button
              type="button"
              onClick={() => onDrawToolChange("arrow")}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                drawTool === "arrow"
                  ? "bg-slate-500 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {t("tactics.arrow")}
            </button>
          </div>
          <span className="text-gray-600">|</span>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400 mr-1">{t("tactics.lineWidth")}:</span>
            {[3, 4, 6, 10].map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => onPenLineWidthChange(w)}
                className={`min-w-[2rem] px-1.5 py-1 rounded text-xs font-medium border-2 transition-colors ${
                  penLineWidth === w ? "border-white bg-gray-600 text-white" : "border-gray-600 bg-gray-700 text-gray-300"
                }`}
                title={`${w}px`}
              >
                {w}
              </button>
            ))}
          </div>
          <span className="text-gray-600">|</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPenColorChange("red")}
              className={`w-8 h-8 rounded-full border-2 transition-colors ${
                penColor === "red" ? "bg-red-500 border-red-300" : "bg-red-600/60 border-gray-600"
              }`}
              title={t("tactics.redPen")}
            />
            <button
              type="button"
              onClick={() => onPenColorChange("blue")}
              className={`w-8 h-8 rounded-full border-2 transition-colors ${
                penColor === "blue" ? "bg-blue-500 border-blue-300" : "bg-blue-600/60 border-gray-600"
              }`}
              title={t("tactics.bluePen")}
            />
            <button
              type="button"
              onClick={() => onPenColorChange("erase")}
              className={`px-2 py-1 rounded text-xs border-2 transition-colors ${
                penColor === "erase" ? "border-gray-400 bg-gray-600" : "border-gray-600 bg-gray-700"
              }`}
              title={t("tactics.eraser")}
            >
              {t("tactics.eraser")}
            </button>
            <button
              type="button"
              onClick={onClearAll}
              className="px-2 py-1 rounded text-xs bg-gray-600 hover:bg-gray-500 text-gray-200"
              title={t("tactics.clearAll")}
            >
              {t("tactics.clearAll")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
