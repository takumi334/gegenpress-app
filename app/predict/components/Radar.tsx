
"use client";
import React, { useRef } from "react";

type MetricKey = "fw" | "mf" | "df" | "tac" | "gk";
export type TeamSide = Record<MetricKey, number> & {
  team?: {
    name?: string;
    color?: string;
    primaryColor?: string;
    colors?: { primary?: string; secondary?: string };
  };
};

type Props = { home: TeamSide; away: TeamSide; title?: string };

const KNOWN: Record<string, string> = {
  "Arsenal FC": "#EF4444",
  "Chelsea FC": "#3B82F6",
  "Manchester City": "#6CB6F3",
  "Manchester United": "#DA291C",
  "Liverpool FC": "#C8102E",
  "Tottenham Hotspur": "#132257",
};
function hashColor(name: string, sat = 70, light = 50) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue} ${sat}% ${light}%)`;
}
function pickTeamColor(side: TeamSide, def: string) {
  const n = side.team?.name ?? "";
  const c = side.team?.colors?.primary || side.team?.primaryColor || side.team?.color || KNOWN[n];
  return c || hashColor(n || def);
}

const SIZE = 360, R = 130, CX = SIZE / 2, CY = SIZE / 2;
const clamp100 = (v: number) => Math.max(0, Math.min(100, Number(v || 0)));
const METRICS: Array<{ key: MetricKey; label: string }> = [
  { key: "fw", label: "FW" }, { key: "mf", label: "MF" }, { key: "df", label: "DF" },
  { key: "tac", label: "TAC" }, { key: "gk", label: "GK" },
];
const angles = METRICS.map((_, i) => (i / METRICS.length) * 2 * Math.PI - Math.PI / 2);

function polarToPoint(v: number, a: number, radius = R) {
  const r = (clamp100(v) / 100) * radius;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)] as const;
}
function toPoints(values: number[]) { return values.map((v, i) => polarToPoint(v, angles[i])); }
function toPath(pts: readonly (readonly [number, number])[]) {
  return `M ${pts.map(([x, y]) => `${x},${y}`).join(" L ")} Z`;
}

export default function Radar({ home, away }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  const homeVals = METRICS.map((m) => clamp100(home[m.key]));
  const awayVals = METRICS.map((m) => clamp100(away[m.key]));
  const homePts = toPoints(homeVals);
  const awayPts = toPoints(awayVals);

  const gridRings: string[] = Array.from({ length: 4 }, (_, k) => {
    const rr = R * ((k + 1) / (5));
    const pts = angles.map((a) => polarToPoint(100, a, rr));
    return toPath(pts);
  });

  const homeStroke = pickTeamColor(home, "#EF4444");
  const awayStroke = pickTeamColor(away, "#3B82F6");
  const homeFill = homeStroke.startsWith("hsl(") ? homeStroke.replace("%)", "% / 0.35)") : homeStroke + "55";
  const awayFill = awayStroke.startsWith("hsl(") ? awayStroke.replace("%)", "% / 0.35)") : awayStroke + "55";

  async function copyPng() {
    const svg = svgRef.current; if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml" }));
    const img = new Image();
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = url; });
    const c = document.createElement("canvas"); c.width = SIZE; c.height = SIZE;
    const ctx = c.getContext("2d")!; ctx.fillStyle = "#fff"; ctx.fillRect(0,0,c.width,c.height); ctx.drawImage(img,0,0);
    const blob: Blob = await new Promise((res) => c.toBlob((b) => res(b as Blob), "image/png"));
    URL.revokeObjectURL(url);
    try {
      await (navigator as any).clipboard.write([new (window as any).ClipboardItem({ "image/png": blob })]);
      alert("画像をコピーしました。掲示板に貼り付けてください。");
    } catch {
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "radar.png"; a.click();
      URL.revokeObjectURL(a.href);
    }
  }

  return (
    <div className="w-full">
      <div className="flex items-start gap-3">
        <svg ref={svgRef} width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img">
          {angles.map((a, i) => {
            const [x, y] = polarToPoint(100, a, R);
            return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="#e5e7eb" strokeWidth={1} />;
          })}
          {gridRings.map((d, i) => <path key={i} d={d} fill="none" stroke="#e5e7eb" strokeDasharray="4 4" />)}
          <path d={toPath(homePts)} fill={homeFill} stroke={homeStroke} strokeWidth={2} />
          <path d={toPath(awayPts)} fill={awayFill} stroke={awayStroke} strokeWidth={2} />
          {METRICS.map((m, i) => {
            const [lx, ly] = polarToPoint(112, angles[i], R + 18);
            return (
              <text key={m.key} x={lx} y={ly} fontSize="12"
                    textAnchor={Math.cos(angles[i]) > 0.2 ? "start" : Math.cos(angles[i]) < -0.2 ? "end" : "middle"}
                    dominantBaseline="middle" fill="#374151">{m.label}</text>
            );
          })}
          {METRICS.map((m, i) => {
            const a = angles[i];
            const [hx, hy] = polarToPoint(homeVals[i] + 6, a);
            const [ax, ay] = polarToPoint(awayVals[i] + 12, a);
            return (
              <g key={m.key}>
                <text x={hx} y={hy} fontSize="11" textAnchor="middle" dominantBaseline="middle" fill={homeStroke}>{homeVals[i]}</text>
                <text x={ax} y={ay} fontSize="11" textAnchor="middle" dominantBaseline="middle" fill={awayStroke}>{awayVals[i]}</text>
              </g>
            );
          })}
        </svg>

        <div className="min-w-[140px]">
          <button onClick={copyPng}
                  className="mb-2 rounded-xl px-3 py-2 text-sm border bg-white hover:bg-gray-50 shadow-sm">
            画像をコピー
          </button>
          <div className="mt-2 flex flex-col gap-1 text-sm">
            <span className="inline-flex items-center gap-2">
              <span style={{ width: 12, height: 12, background: homeStroke }} className="inline-block rounded-sm" />
              {home.team?.name ?? "Home"}
            </span>
            <span className="inline-flex items-center gap-2">
              <span style={{ width: 12, height: 12, background: awayStroke }} className="inline-block rounded-sm" />
              {away.team?.name ?? "Away"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
