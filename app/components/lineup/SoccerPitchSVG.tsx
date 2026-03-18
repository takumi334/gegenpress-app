"use client";

import {
  PITCH_VIEW_W,
  PITCH_VIEW_H,
  CENTER_Y,
  HALF_W,
  CENTER_CIRCLE_R,
  PENALTY_AREA_LEFT,
  PENALTY_AREA_RIGHT,
  PENALTY_AREA_DEPTH,
  GOAL_AREA_LEFT,
  GOAL_AREA_RIGHT,
  GOAL_AREA_DEPTH,
  PENALTY_SPOT_TOP_Y,
  PENALTY_SPOT_BOTTOM_Y,
  PENALTY_ARC_R,
  LINE_WIDTH,
  CORNER_R,
} from "./pitchConstants";

const PITCH_BG = "#2f8f4e";
const LINE_COLOR = "#ffffff";

/**
 * サッカーコート SVG（FIFA 比率・上下対称）
 * viewBox 0 0 100 150
 */
export default function SoccerPitchSVG({ className = "" }: { className?: string }) {
  const w = PITCH_VIEW_W;
  const h = PITCH_VIEW_H;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      {/* 背景（芝） */}
      <rect x={0} y={0} width={w} height={h} rx={CORNER_R} ry={CORNER_R} fill={PITCH_BG} />

      {/* 外枠 */}
      <rect
        x={LINE_WIDTH / 2}
        y={LINE_WIDTH / 2}
        width={w - LINE_WIDTH}
        height={h - LINE_WIDTH}
        rx={CORNER_R}
        ry={CORNER_R}
        fill="none"
        stroke={LINE_COLOR}
        strokeWidth={LINE_WIDTH}
      />

      {/* センターライン（ピッチ中央・横方向） */}
      <line
        x1={LINE_WIDTH / 2}
        y1={CENTER_Y}
        x2={w - LINE_WIDTH / 2}
        y2={CENTER_Y}
        stroke={LINE_COLOR}
        strokeWidth={LINE_WIDTH}
      />

      {/* センターサークル（横長の楕円） */}
      <ellipse
        cx={HALF_W}
        cy={CENTER_Y}
        rx={CENTER_CIRCLE_R * 1.6}
        ry={CENTER_CIRCLE_R * 0.7}
        fill="none"
        stroke={LINE_COLOR}
        strokeWidth={LINE_WIDTH}
      />
      {/* センタースポット */}
      <circle cx={HALF_W} cy={CENTER_Y} r={0.6} fill={LINE_COLOR} />

      {/* 上側ペナルティエリア */}
      <rect
        x={PENALTY_AREA_LEFT}
        y={LINE_WIDTH / 2}
        width={PENALTY_AREA_RIGHT - PENALTY_AREA_LEFT}
        height={PENALTY_AREA_DEPTH}
        fill="none"
        stroke={LINE_COLOR}
        strokeWidth={LINE_WIDTH}
      />
      {/* 上側ゴールエリア */}
      <rect
        x={GOAL_AREA_LEFT}
        y={LINE_WIDTH / 2}
        width={GOAL_AREA_RIGHT - GOAL_AREA_LEFT}
        height={GOAL_AREA_DEPTH}
        fill="none"
        stroke={LINE_COLOR}
        strokeWidth={LINE_WIDTH}
      />
      {/* 上側ペナルティスポット */}
      <circle cx={HALF_W} cy={PENALTY_SPOT_TOP_Y} r={0.6} fill={LINE_COLOR} />

      {/* 下側ペナルティエリア */}
      <rect
        x={PENALTY_AREA_LEFT}
        y={h - LINE_WIDTH / 2 - PENALTY_AREA_DEPTH}
        width={PENALTY_AREA_RIGHT - PENALTY_AREA_LEFT}
        height={PENALTY_AREA_DEPTH}
        fill="none"
        stroke={LINE_COLOR}
        strokeWidth={LINE_WIDTH}
      />
      {/* 下側ゴールエリア */}
      <rect
        x={GOAL_AREA_LEFT}
        y={h - LINE_WIDTH / 2 - GOAL_AREA_DEPTH}
        width={GOAL_AREA_RIGHT - GOAL_AREA_LEFT}
        height={GOAL_AREA_DEPTH}
        fill="none"
        stroke={LINE_COLOR}
        strokeWidth={LINE_WIDTH}
      />
      {/* 下側ペナルティスポット */}
      <circle cx={HALF_W} cy={PENALTY_SPOT_BOTTOM_Y} r={0.6} fill={LINE_COLOR} />

      {/* ゴール枠（簡易・上） */}
      <line
        x1={GOAL_AREA_LEFT}
        y1={0}
        x2={GOAL_AREA_RIGHT}
        y2={0}
        stroke={LINE_COLOR}
        strokeWidth={LINE_WIDTH * 1.2}
      />
      {/* ゴール枠（簡易・下） */}
      <line
        x1={GOAL_AREA_LEFT}
        y1={h}
        x2={GOAL_AREA_RIGHT}
        y2={h}
        stroke={LINE_COLOR}
        strokeWidth={LINE_WIDTH * 1.2}
      />
    </svg>
  );
}
