"use client";

export type PitchMode = "cursor" | "pen";

type PitchModeSelectorProps = {
  value: PitchMode;
  onChange: (mode: PitchMode) => void;
  onClearPen: () => void;
  hasDrawings: boolean;
};

export default function PitchModeSelector({
  value,
  onChange,
  onClearPen,
  hasDrawings,
}: PitchModeSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">モード</span>
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => onChange("cursor")}
          className={`
            px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors
            ${value === "cursor"
              ? "border-green-600 bg-green-600/20 text-green-400 dark:bg-green-900/40 dark:text-green-300"
              : "border-gray-500 bg-gray-700 text-gray-300 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-gray-500"}
          `}
        >
          Cursor
        </button>
        <button
          type="button"
          onClick={() => onChange("pen")}
          className={`
            px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors
            ${value === "pen"
              ? "border-green-600 bg-green-600/20 text-green-400 dark:bg-green-900/40 dark:text-green-300"
              : "border-gray-500 bg-gray-700 text-gray-300 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-gray-500"}
          `}
        >
          Pen
        </button>
        <button
          type="button"
          onClick={onClearPen}
          disabled={!hasDrawings}
          className="px-4 py-2 rounded-lg text-sm font-medium border-2 border-gray-500 bg-gray-700 text-gray-300 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:bg-gray-800 dark:hover:border-gray-500"
        >
          Clear Pen
        </button>
      </div>
    </div>
  );
}
