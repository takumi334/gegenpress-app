// app/lib/postText.ts
import type { BaseModel, BoostPack } from "./predict";

function toPct(n: number) { return Math.round(n * 100); }
function r2(n: number) { return Math.round(n * 100) / 100; }

function hashifyNumbers(s?: string) {
  if (!s) return "";
  const nums = s
    .split(/[\s,、]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => Number(t))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 99);
  if (!nums.length) return "";
  return nums.map((n) => `#${n}`).join(", ");
}

export function makeThreeLinePost(
  base: BaseModel,
  now?: { lambdaHome: number; lambdaAway: number; probs: { home: number; draw: number; away: number } }
): string[] {
  const probs = now?.probs ?? base.probs;
  const lambdaHome = r2(now?.lambdaHome ?? base.lambdaHome);
  const lambdaAway = r2(now?.lambdaAway ?? base.lambdaAway);

  const line1 = `【${base.home.name} vs ${base.away.name} 予想】 勝:${toPct(probs.home)}% 分:${toPct(probs.draw)}% 負:${toPct(probs.away)}%`;
  const line2 = `根拠: 前線(攻撃係数) ${base.home.atkFactor} / 相手守備弱さ ${base.away.defWeakFactor} / 休養 H:${base.home.restDays}日 A:${base.away.restDays}日`;
  const line3 = `直近(${base.home.samples}/${base.away.samples})試合の平均得点 H:${base.home.gf} A:${base.away.gf}（λ H:${lambdaHome} A:${lambdaAway}）`;
  return [line1, line2, line3];
}

export function addAdLine(lines: string[], ad: string) {
  return [...lines, ad || "PR: スポーツベットで試合をもっと熱く。18歳未満不可"];
}

export function boostAnnotation(boosts: BoostPack, opt?: { label?: string }) {
  const label = opt?.label ?? "想定";

  function fmtPct(v?: number) {
    if (!v) return "";
    const p = Math.round(v * 100);
    return p >= 0 ? `+${p}%` : `${p}%`;
  }
  function posText(b: BoostPack["home"]) {
    const arr: string[] = [];
    if (b.GK) arr.push(`GK ${fmtPct(b.GK)}`);
    if (b.DF) arr.push(`DF ${fmtPct(b.DF)}`);
    if (b.MF) arr.push(`MF ${fmtPct(b.MF)}`);
    if (b.FW) arr.push(`FW ${fmtPct(b.FW)}`);
    return arr.join(", ");
  }

  const hNum = hashifyNumbers(boosts.homeNumbers);
  const aNum = hashifyNumbers(boosts.awayNumbers);
  const hNames = (boosts.homePlayer || "").split(/[\s,、]+/).map(s=>s.trim()).filter(Boolean).join(", ");
  const aNames = (boosts.awayPlayer || "").split(/[\s,、]+/).map(s=>s.trim()).filter(Boolean).join(", ");

  const hPieces = [];
  const aPieces = [];

  if (hNum) hPieces.push(`プレイヤーナンバー「${hNum}」`);
  if (hNames) hPieces.push(`プレイヤー名「${hNames}」`);
  if (posText(boosts.home)) hPieces.push(posText(boosts.home));

  if (aNum) aPieces.push(`プレイヤーナンバー「${aNum}」`);
  if (aNames) aPieces.push(`プレイヤー名「${aNames}」`);
  if (posText(boosts.away)) aPieces.push(posText(boosts.away));

  if (!hPieces.length && !aPieces.length) return "";

  return `※${label}: Home ${hPieces.join(" / ")} / Away ${aPieces.join(" / ")}`.trim();
}

