/**
 * ピッチ上の座標・変換ユーティリティ
 * x, y は 0〜100 のパーセント（幅・高さに対する）。左上 (0,0)、右下 (100,100)。
 */

import type { FormationId } from "./formations";
import { getFormation } from "./formations";

export type PositionPercent = { x: number; y: number };

/** マーカー半径（%）の目安。clamp 時にマーカーがはみ出さないようマージンに使う */
const MARGIN_PERCENT = 4;

/**
 * フォーメーションの初期配置（各スロットの code, label, x, y）を返す。
 * 保存・共有時に「どのフォーメーションのレイアウトか」を復元しやすくする。
 */
export function getFormationLayout(formationId: FormationId): Array<{ id: string; label: string; role: string; x: number; y: number }> {
  const formation = getFormation(formationId);
  return formation.slots.map((s) => ({
    id: s.code,
    label: s.label,
    role: s.code,
    x: s.x,
    y: s.y,
  }));
}

/**
 * 座標をピッチ内にクランプする（0〜100、マージン考慮）。
 */
export function clampPlayerPosition(x: number, y: number): PositionPercent {
  const m = MARGIN_PERCENT;
  return {
    x: Math.max(m, Math.min(100 - m, x)),
    y: Math.max(m, Math.min(100 - m, y)),
  };
}

/**
 * クライアント座標（clientX, clientY）をピッチの bounding rect から
 * パーセント (0〜100) に変換する。
 */
export function convertClientToPitchPercent(
  clientX: number,
  clientY: number,
  rect: DOMRect
): PositionPercent {
  const x = ((clientX - rect.left) / rect.width) * 100;
  const y = ((clientY - rect.top) / rect.height) * 100;
  return clampPlayerPosition(x, y);
}

/**
 * スロット位置を更新した結果の新しい Record を返す。
 * 保存・共有用に state 更新を一箇所にまとめる。
 */
export function updateSlotPosition(
  current: Record<string, PositionPercent>,
  slotCode: string,
  x: number,
  y: number
): Record<string, PositionPercent> {
  const clamped = clampPlayerPosition(x, y);
  return { ...current, [slotCode]: clamped };
}

/** ペン描画: 1本の線（SVG viewBox 座標で保持） */
export type DrawPath = {
  id: string;
  points: { x: number; y: number }[];
};

const PITCH_VIEW_W = 100;
const PITCH_VIEW_H = 150;

/**
 * クライアント座標をピッチ SVG viewBox 座標 (0..100, 0..150) に変換する。
 * ペン描画の座標に使用。
 */
export function convertClientToViewBox(
  clientX: number,
  clientY: number,
  rect: DOMRect
): { x: number; y: number } {
  const x = ((clientX - rect.left) / rect.width) * PITCH_VIEW_W;
  const y = ((clientY - rect.top) / rect.height) * PITCH_VIEW_H;
  return {
    x: Math.max(0, Math.min(PITCH_VIEW_W, x)),
    y: Math.max(0, Math.min(PITCH_VIEW_H, y)),
  };
}
