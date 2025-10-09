// app/predict/components/PostComposer.tsx
"use client";
import React, { useMemo } from "react";
import Radar from "./Radar"; // default export

// --- 必要最低限の型（このファイル内で自給自足） ---
export type TableRow = {
  team: { id: number; name: string };
  playedGames: number;
  won: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
};
type TeamSide = {
  gk: number; df: number; mf: number; fw: number; tac: number;
  team: { id: number; name: string };
};
type RadarAll = { home: TeamSide; away: TeamSide; tacticLabel: string; tacticDetail: string };
type Props = { init: { homeId: number; awayId: number; standings: TableRow[] } };

// --- Poisson helpers（ゴール分布計算）---
const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));
const poisson = (lambda: number, k: number) =>
  Math.exp(-lambda) * Math.pow(lambda, k) / fact(k);
type Score = { k: number; m: number; p: number };
function scoreMatrix(lambdaH: number, lambdaA: number, max = 7): Score[] {
  const out: Score[] = [];
  for (let k = 0; k <= max; k++) {
    for (let m = 0; m <= max; m++) {
      out.push({ k, m, p: poisson(lambdaH, k) * poisson(lambdaA, m) });
    }
  }
  return out;
}
function outcomeProbs(scores: Score[]) {
  let home = 0, draw = 0, away = 0;
  for (const s of scores) {
    if (s.k > s.m) home += s.p;
    else if (s.k < s.m) away += s.p;
    else draw += s.p;
  }
  const total = home + draw + away || 1;
  return { home, draw, away, total };
}
function mostLikelyScore(scores: Score[]) {
  return scores.reduce((a, b) => (b.p > a.p ? b : a), scores[0]);
}

// --- レーダー用のユーティリティ ---
const HOME_ADV_PCT = 7; // HOMEアドバンテージ（予測用・表示用）

function clamp(v: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, v));
}
function toScale50(value: number, leagueAvg: number, reverse = false): number {
  if (!isFinite(value) || !isFinite(leagueAvg) || leagueAvg <= 0) return 50;
  const ratio = value / leagueAvg;
  const score = reverse ? 1 / ratio : ratio;
  return clamp(Math.round(score * 50));
}
function pickTeam(standings: TableRow[] | undefined, teamId: number) {
  if (!standings || standings.length === 0) return undefined;
  return standings.find(r => r.team.id === teamId);
}
function leagueAverages(rows?: TableRow[]) {
  const safe = rows ?? [];
  const n = safe.length || 1;
  const sum = safe.reduce(
    (acc, r) => {
      const pg = Math.max(1, r.playedGames);
      acc.gf += r.goalsFor / pg;
      acc.ga += r.goalsAgainst / pg;
      acc.wr += r.won / pg;
      acc.gd += r.goalDifference / pg;
      return acc;
    },
    { gf: 0, ga: 0, wr: 0, gd: 0 }
  );
  return { gfPg: sum.gf / n, gaPg: sum.ga / n, wr: sum.wr / n, gdPg: sum.gd / n };
}
function teamMetrics(r: TableRow) {
  const pg = Math.max(1, r.playedGames);
  return {
    gfPg: r.goalsFor / pg,
    gaPg: r.goalsAgainst / pg,
    wr:   r.won / pg,
    gdPg: r.goalDifference / pg,
    id:   r.team.id,
    name: r.team.name,
  };
}
function radarFromStandings(home: TableRow, away: TableRow, all: TableRow[]): RadarAll {
  const avg = leagueAverages(all);
  const h = teamMetrics(home);
  const a = teamMetrics(away);

  const hFW  = toScale50(h.gfPg, avg.gfPg);
  const hGK  = toScale50(h.gaPg, avg.gaPg, true);
  const hDF  = toScale50(h.wr,   avg.wr);
  const hTAC = toScale50(h.gdPg, avg.gdPg);
  const hMF  = clamp(Math.round((hFW + hGK) / 2));

  const aFW  = toScale50(a.gfPg, avg.gfPg);
  const aGK  = toScale50(a.gaPg, avg.gaPg, true);
  const aDF  = toScale50(a.wr,   avg.wr);
  const aTAC = toScale50(a.gdPg, avg.gdPg);
  const aMF  = clamp(Math.round((aFW + aGK) / 2));

  const homeSide: TeamSide = { gk: hGK, df: hDF, mf: hMF, fw: hFW, tac: hTAC, team: { id: h.id, name: h.name } };
  const awaySide: TeamSide = { gk: aGK, df: aDF, mf: aMF, fw: aFW, tac: aTAC, team: { id: a.id, name: a.name } };

  const tacticLabel  = "リーグ平均比（五角形の定義）";
  const tacticDetail =
    `FW=得点/試合, GK=失点/試合(反転), MF=(FW+GK)/2, DF=勝率, TAC=得失点差/試合\n` +
    `Home ${h.name}: 得点 ${h.gfPg.toFixed(2)} / 失点 ${h.gaPg.toFixed(2)} / 勝率 ${(h.wr * 100).toFixed(1)}% / 得失点差/試合 ${h.gdPg.toFixed(2)}\n` +
    `Away ${a.name}: 得点 ${a.gfPg.toFixed(2)} / 失点 ${a.gaPg.toFixed(2)} / 勝率 ${(a.wr * 100).toFixed(1)}% / 得失点差/試合 ${a.gdPg.toFixed(2)}`;

  return { home: homeSide, away: awaySide, tacticLabel, tacticDetail };
}

// ===================== 本体 =====================
export default function PostComposer({ init }: Props) {
  const { homeId, awayId, standings } = init;

  const radar = useMemo(() => {
    const home = pickTeam(standings, homeId);
    const away = pickTeam(standings, awayId);
    if (!home || !away) {
      const dummy: TableRow = {
        team: { id: 0, name: home ? "Away?" : "Home?" },
        playedGames: 1, won: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0,
      };
      return radarFromStandings(home ?? dummy, away ?? dummy, standings);
    }
    return radarFromStandings(home, away, standings);
  }, [homeId, awayId, standings]);

  // ---- 予想スコア（ページ上部に表示） ----
  const scoreCard = (() => {
    const league = leagueAverages(standings);
    const home = pickTeam(standings, homeId);
    const away = pickTeam(standings, awayId);
    if (!league || !home || !away) return null;

    const leagueGF = (league.gfPg + league.gaPg) / 2 || 2.7;
    const homeAttackStrength  = Math.max(0.4, home.goalsFor     / Math.max(1, home.playedGames)) / Math.max(0.1, league.gfPg);
    const homeDefenseWeakness = Math.max(0.4, home.goalsAgainst / Math.max(1, home.playedGames)) / Math.max(0.1, league.gaPg);
    const awayAttackStrength  = Math.max(0.4, away.goalsFor     / Math.max(1, away.playedGames)) / Math.max(0.1, league.gfPg);
    const awayDefenseWeakness = Math.max(0.4, away.goalsAgainst / Math.max(1, away.playedGames)) / Math.max(0.1, league.gaPg);

    const adv = (100 + HOME_ADV_PCT) / 100;
    const lambdaH = leagueGF * homeAttackStrength * awayDefenseWeakness * adv;
    const lambdaA = leagueGF * awayAttackStrength * homeDefenseWeakness;

    const scores = scoreMatrix(lambdaH, lambdaA, 7);
    const odds   = outcomeProbs(scores);
    const mode   = mostLikelyScore(scores);

    return (
      <div style={{ marginBottom: 16 }}>
        <h3 className="text-xl font-bold">予想スコア</h3>
        <div className="text-3xl mt-1 font-semibold">
          {mode.k} – {mode.m}
        </div>
        <div className="mt-1 text-sm text-gray-600">
          λH: {lambdaH.toFixed(2)}　λA: {lambdaA.toFixed(2)}　
          勝/分/負: {(100 * odds.home).toFixed(1)}% / {(100 * odds.draw).toFixed(1)}% / {(100 * odds.away).toFixed(1)}%
        </div>
        <div className="text-xs text-gray-500 mt-0.5">HOMEアドバンテージ +{HOME_ADV_PCT}% 反映</div>
      </div>
    );
  })();

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold">対戦予想</h2>

      {/* 予想スコア（上部） */}
      {scoreCard}

      {/* レーダー */}
      <div>
        <h4 className="text-lg font-semibold mb-2">
          攻撃/守備（リーグ比 50=平均）
        </h4>

        {/* レーダー + 軸の生値（簡易） */}
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ minWidth: 320 }}>
            <Radar home={radar.home} away={radar.away} />
          </div>

          <div style={{ fontSize: 12, lineHeight: 1.6, opacity: 0.9 }}>
            <div><b>FW</b>: {radar.home.fw} / {radar.away.fw}</div>
            <div><b>MF</b>: {radar.home.mf} / {radar.away.mf}</div>
            <div><b>DF</b>: {radar.home.df} / {radar.away.df}</div>
            <div><b>GK</b>: {radar.home.gk} / {radar.away.gk}</div>
            <div><b>TAC</b>: {radar.home.tac} / {radar.away.tac}</div>
          </div>
        </div>
      </div>

      {/* 根拠は削除。状況に応じてだけ出す */}
      {/* 例: 掲示板で説明を足したい時だけ tacticDetail を表示 */}
      {radar.tacticDetail ? (
        <details className="text-sm text-gray-700">
          <summary className="cursor-pointer select-none">補足（クリックで表示）</summary>
          <pre style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>{radar.tacticDetail}</pre>
        </details>
      ) : null}
    </section>
  );
}

