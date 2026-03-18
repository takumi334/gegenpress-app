/**
 * 戦術ボードの配置データ形式
 * TacticsBoard.data に保存する JSON の型
 */

export type TacticsPlacement = {
  playerName: string;
  /** 翻訳後の表示名。未設定時は playerName を使用 */
  translatedName?: string;
  slotCode: string;
  teamName?: string | null;
  /** ピッチ上での x 座標 (0-100%)。省略時は formation のデフォルト */
  x?: number;
  /** ピッチ上での y 座標 (0-100%) */
  y?: number;
  /** 表示ラベル（スロット名など） */
  label?: string | null;
};

/** ペン描画の1ストローク */
export type DrawingStroke = {
  color: string; // "red" | "blue" | "erase"
  points: { x: number; y: number }[];
};

export type TacticsBoardData = {
  formation?: string;
  placements?: TacticsPlacement[];
  /** ペン描画データ（JSON strokes） */
  drawingData?: { strokes: DrawingStroke[] };
  /** アニメーション用のフレームデータ（任意） */
  animationFrames?: {
    slotPositions: Record<string, { x: number; y: number }>;
    ballPosition: { x: number; y: number } | null;
    strokes: DrawingStroke[];
  }[];
  currentFrame?: number;
};

type SlotDefault = { code: string; x: number; y: number };

/** TacticsSlotAssignments + slotPositions を TacticsPlacement[] に変換。x,y は slotPositions または slotDefaults から取得 */
export function assignmentsToPlacements(
  assignments: Record<
    string,
    { id: string; name: string; translatedName?: string; teamName?: string | null } | null
  >,
  slotPositions?: Record<string, { x: number; y: number }>,
  slotDefaults?: SlotDefault[]
): TacticsPlacement[] {
  const getPos = (slotCode: string) => {
    const custom = slotPositions?.[slotCode];
    if (custom) return custom;
    const def = slotDefaults?.find((s) => s.code === slotCode);
    return def ? { x: def.x, y: def.y } : undefined;
  };
  return Object.entries(assignments)
    .filter(([, p]) => p != null)
    .map(([slotCode, p]) => {
      const pos = getPos(slotCode);
      return {
        playerName: p!.name,
        ...(p!.translatedName != null && p!.translatedName !== "" && { translatedName: p!.translatedName }),
        slotCode,
        teamName: p!.teamName ?? null,
        ...(pos && { x: pos.x, y: pos.y }),
      };
    });
}
