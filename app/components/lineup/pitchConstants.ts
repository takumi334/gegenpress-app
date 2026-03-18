/**
 * サッカーコート SVG 用定数（FIFA 比率・上下対称）
 * viewBox 0 0 PITCH_VIEW_W x PITCH_VIEW_H（幅:高さ = 2:3）
 * 実寸: 幅68m x 長さ105m（FIFA推奨）
 */

export const PITCH_VIEW_W = 100;
export const PITCH_VIEW_H = 150;

/** 幅68m → 100, 長さ105m → 150 */
const SCALE_X = PITCH_VIEW_W / 68;
const SCALE_Y = PITCH_VIEW_H / 105;

/** ピッチ中央（センターライン・センターサークル中心と完全一致） */
export const CENTER_Y = PITCH_VIEW_H / 2; // 75
export const HALF_W = PITCH_VIEW_W / 2;  // 50

/** センターサークル半径 9.15m（縦方向スケールで正円に見えるように） */
export const CENTER_CIRCLE_R = 9.15 * SCALE_Y;

/** ペナルティエリア: 幅40.32m(44yd), 奥行16.5m(18yd) — 上下同一寸法 */
export const PENALTY_AREA_WIDTH = 40.32 * SCALE_X;
export const PENALTY_AREA_DEPTH = 16.5 * SCALE_Y;
export const PENALTY_AREA_LEFT = (PITCH_VIEW_W - PENALTY_AREA_WIDTH) / 2;
export const PENALTY_AREA_RIGHT = PENALTY_AREA_LEFT + PENALTY_AREA_WIDTH;

/** ゴールエリア: 幅18.32m(20yd), 奥行5.5m(6yd) — 上下同一 */
export const GOAL_AREA_WIDTH = 18.32 * SCALE_X;
export const GOAL_AREA_DEPTH = 5.5 * SCALE_Y;
export const GOAL_AREA_LEFT = (PITCH_VIEW_W - GOAL_AREA_WIDTH) / 2;
export const GOAL_AREA_RIGHT = GOAL_AREA_LEFT + GOAL_AREA_WIDTH;

/** ペナルティスポット: ゴールラインから11m — 上下対称 */
export const PENALTY_SPOT_FROM_GOAL = 11 * SCALE_Y;
export const PENALTY_SPOT_TOP_Y = PENALTY_SPOT_FROM_GOAL;
export const PENALTY_SPOT_BOTTOM_Y = PITCH_VIEW_H - PENALTY_SPOT_FROM_GOAL;

/** ペナルティアーク半径 9.15m（センターサークルと同一） */
export const PENALTY_ARC_R = 9.15 * SCALE_Y;

/** ライン幅・角丸 */
export const LINE_WIDTH = 0.9;
export const CORNER_R = 1.2;
