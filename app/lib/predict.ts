// app/lib/predict.ts
import { fdFetch } from "@/lib/fd";

// ===== Types =====
export type TeamLite = { id: number; name: string };
export type MatchLite = {
  utcDate: string;
  score: { fullTime: { home: number | null; away: number | null } };
  homeTeam: TeamLite;
  awayTeam: TeamLite;
};

export type Factors = {
  gf: number; // 平均得点
  ga: number; // 平均失点
  atkFactor: number;
  defWeakFactor: number;
  restDays: number; // 直近試合からの休養日
  samples: number;
};

export type PoissonResult = {
  lambdaHome: number;
  lambdaAway: number;
  probs: { home: number; draw: number; away: number };
};

export type PredictOutput = {
  home: TeamLite;
  away: TeamLite;
  homeStats: Factors;
  awayStats: Factors;
  model: PoissonResult;
  leagueAvg: number;
};

type StandingRow = {
  team: TeamLite;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  position: number;
};

type StandingsRes = {
  competition: { id: number; code: string; name: string };
  season: { startDate: string; endDate: string };
  standings: Array<{
    type: "TOTAL";
    table: StandingRow[];
  }>;
};

// ====== FD helpers ======
async function getFinishedMatches(teamId: number, limit = 20): Promise<MatchLite[]> {
  const res = await fdFetch<{ matches: MatchLite[] }>(
    `/teams/${teamId}/matches?status=FINISHED&limit=${limit}`
  );
  return res.matches ?? [];
}

async function getStandingsByTeam(teamId: number) {
  // チームの所属大会を最近の試合から推定し、その大会の順位表を取得
  const ms = await getFinishedMatches(teamId, 1);
  const compId = (ms[0] as any)?.competition?.id; // v4の/teams/{id}/matches によっては competition が付く
  // competition が無い場合はチームIDから主流リーグを推定できないため、フォールバックとして
  // /teams/{id}→activeCompetitions[0] を利用
  let standings: StandingsRes | null = null;
  if (compId) {
    try {
      standings = await fdFetch<StandingsRes>(`/competitions/${compId}/standings`);
    } catch {}
  }
  if (!standings) {
    const team = await fdFetch<any>(`/teams/${teamId}`);
    const comp = team?.activeCompetitions?.[0];
    if (comp?.id) {
      standings = await fdFetch<StandingsRes>(`/competitions/${comp.id}/standings`);
    }
  }
  return standings;
}

// ====== Core stats from recent matches ======
function avg(n: number[]) {
  return n.length ? n.reduce((a, b) => a + b, 0) / n.length : 0;
}
function daysDiff(aISO: string, bISO: string) {
  const a = new Date(aISO).getTime();
  const b = new Date(bISO).getTime();
  return Math.max(0, Math.round((a - b) / 86400000));
}

function teamGFGA(matches: MatchLite[], teamId: number) {
  const gf: number[] = [];
  const ga: number[] = [];
  let lastDate: string | null = null;

  for (const m of matches) {
    const h = m.homeTeam.id === teamId;
    const fth = m.score.fullTime.home ?? 0;
    const fta = m.score.fullTime.away ?? 0;
    gf.push(h ? fth : fta);
    ga.push(h ? fta : fth);
    lastDate = m.utcDate;
  }
  const samples = gf.length;
  return {
    gf: avg(gf),
    ga: avg(ga),
    restDays: samples >= 1 ? daysDiff(new Date().toISOString(), lastDate!) : 0,
    samples,
  };
}

function leagueOneSideAverage(standings: StandingsRes) {
  const table = standings.standings.find((s) => s.type === "TOTAL")?.table ?? [];
  const totalGF = table.reduce((s, r) => s + r.goalsFor, 0);
  const totalGames = table.reduce((s, r) => s + r.playedGames, 0);
  // 片側平均 = (全チーム総得点) / (総試合数)
  return totalGames ? totalGF / totalGames : 1.3; // フォールバック
}

export async function predictMatch(homeId: number, awayId: number, N = 20): Promise<PredictOutput> {
  const [homeMatches, awayMatches] = await Promise.all([
    getFinishedMatches(homeId, N),
    getFinishedMatches(awayId, N),
  ]);

  const [homeTeam, awayTeam] = [
    homeMatches[0]?.homeTeam?.id === homeId ? homeMatches[0].homeTeam : homeMatches[0]?.awayTeam ?? { id: homeId, name: "Home" },
    awayMatches[0]?.homeTeam?.id === awayId ? awayMatches[0].homeTeam : awayMatches[0]?.awayTeam ?? { id: awayId, name: "Away" },
  ];

  // 所属リーグの平均
  const standings = await getStandingsByTeam(homeId);
  const leagueAvg = standings ? leagueOneSideAverage(standings) : 1.35;

  const h = teamGFGA(homeMatches, homeId);
  const a = teamGFGA(awayMatches, awayId);

  const atkH = h.gf / leagueAvg || 1;
  const defWeakH = h.ga / leagueAvg || 1;
  const atkA = a.gf / leagueAvg || 1;
  const defWeakA = a.ga / leagueAvg || 1;

  const homeAdv = 1.1;
  const lambdaHome = leagueAvg * atkH * defWeakA * homeAdv;
  const lambdaAway = leagueAvg * atkA * defWeakH;

  const probs = scoreProbs(lambdaHome, lambdaAway);

  return {
    home: homeTeam,
    away: awayTeam,
    homeStats: { gf: h.gf, ga: h.ga, atkFactor: atkH, defWeakFactor: defWeakH, restDays: h.restDays, samples: h.samples },
    awayStats: { gf: a.gf, ga: a.ga, atkFactor: atkA, defWeakFactor: defWeakA, restDays: a.restDays, samples: a.samples },
    model: { lambdaHome, lambdaAway, probs },
    leagueAvg,
  };
}

// ====== Poisson (0..6) ======
function factorial(n: number) {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}
function poisson(k: number, lambda: number) {
  return Math.exp(-lambda) * Math.pow(lambda, k) / factorial(k);
}
function scoreProbs(lh: number, la: number) {
  const max = 6;
  let home = 0, draw = 0, away = 0;
  for (let i = 0; i <= max; i++) {
    const ph = poisson(i, lh);
    for (let j = 0; j <= max; j++) {
      const pa = poisson(j, la);
      if (i > j) home += ph * pa;
      else if (i === j) draw += ph * pa;
      else away += ph * pa;
    }
  }
  const sum = home + draw + away || 1;
  return { home: home / sum, draw: draw / sum, away: away / sum };
}

// ====== 概要テキスト用ユーティリティ ======
export function round2(n: number) { return Math.round(n * 100) / 100; }
export function pct(n: number) { return Math.round(n * 100); }

export function summarize(input: PredictOutput) {
  const lambdaHome = round2(input.model.lambdaHome);
  const lambdaAway = round2(input.model.lambdaAway);
  const probs = input.model.probs;
  return { lambdaHome, lambdaAway, winPct: pct(probs.home), drawPct: pct(probs.draw), losePct: pct(probs.away) };
}

// ====== 「戦術」スコア（ユーザー選択 4 種） ======
/**
 * tacticKind:
 *  - "gd"     : 得失点差ベース
 *  - "goals"  : 得点率ベース（GF / leagueAvg）
 *  - "concede": 失点率ベース（1 / (1 + GA/leagueAvg)）
 *  - "rank"   : 順位ベース（下位ほど不利）
 */
export type TacticKind = "gd" | "goals" | "concede" | "rank";

export type RadarPack = {
  team: TeamLite;
  fw: number; mf: number; df: number; gk: number; // 0..100
  legend: { base: number; note: string }; // 根拠表示用
};

function scale01(v: number, min: number, max: number) {
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (v - min) / (max - min)));
}

export async function buildRadar(
  homeId: number,
  awayId: number,
  kind: TacticKind = "gd"
): Promise<{ home: RadarPack; away: RadarPack; tacticLabel: string; tacticDetail: string }> {

  // 順位表でリーグ全体の min/max を作って正規化に使う
  const standings = await getStandingsByTeam(homeId);
  const table = standings?.standings.find(s => s.type === "TOTAL")?.table ?? [];
  const leagueAvg = standings ? leagueOneSideAverage(standings) : 1.35;

  const meta = {
    gd: { label: "得失点差", get: (r: StandingRow) => r.goalDifference, note: "GD基準" },
    goals: { label: "得点率", get: (r: StandingRow) => (r.goalsFor / r.playedGames) / leagueAvg, note: "GF/リーグ平均" },
    concede: { label: "守備率", get: (r: StandingRow) => 1 / (1 + (r.goalsAgainst / r.playedGames) / leagueAvg), note: "失点抑制" },
    rank: { label: "順位指数", get: (r: StandingRow) => -r.position, note: "順位逆スケール" },
  }[kind];

  const vals = table.map(meta.get);
  const min = Math.min(...vals), max = Math.max(...vals);

  function pack(teamId: number): RadarPack {
    const row = table.find(r => r.team.id === teamId);
    const base = row ? meta.get(row) : 0;
    const s = scale01(base, min, max);      // 0..1
    const atk = s;                          // 攻撃寄り
    const def = s;                          // 守備寄り（同一指標でまずは同スケール）
    const fw = Math.round(atk * 100);
    const df = Math.round(def * 100);
    const mf = Math.round(((atk + def) / 2) * 100);
    const gk = Math.round(def * 100 * 0.95);

    return {
      team: row?.team ?? { id: teamId, name: `Team ${teamId}` },
      fw, mf, df, gk,
      legend: { base, note: meta.note },
    };
  }

  return {
    home: pack(homeId),
    away: pack(awayId),
    tacticLabel: meta.label,
    tacticDetail: meta.note,
  };
}

