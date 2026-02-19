// app/api/predict/route.ts
import { NextRequest, NextResponse } from "next/server";

// ==== 環境変数 ====
const FD_BASE = process.env.FD_BASE ?? "https://api.football-data.org/v4";
const FD_KEY  = process.env.FOOTBALL_DATA_API_KEY ?? "";

// ==== ユーティリティ ====
function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}
function serverError(msg: string) {
  return NextResponse.json({ error: msg }, { status: 500 });
}

// FD API 共通 fetch（429や非200の診断メッセージ付き）
async function fdFetch(path: string) {
  const url = `${FD_BASE}${path}`;
  const res = await fetch(url, {
    headers: { "X-Auth-Token": FD_KEY, Accept: "application/json" },
        cache: "force-cache",
    next: { revalidate: 60 * 60 * 24 }, // 24h
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 429) {
      throw new Error(`football-data 429 (rate limited). Try later. url=${url}`);
    }
    throw new Error(`football-data ${res.status}: ${text || url}`);
  }
  return res.json();
}

// 時間減衰重み（最近の試合ほど重く）
function expWeight(daysAgo: number, halfLifeDays = 120) {
  const k = Math.log(2) / halfLifeDays;
  return Math.exp(-k * daysAgo);
}

// 簡易ポアソン×重み付きチーム強度
async function weightedStatsSplit(teamId: string) {
  const j = await fdFetch(`/teams/${teamId}/matches?status=FINISHED`);
  const matches: any[] = Array.isArray(j?.matches) ? j.matches : [];
  const now = Date.now();

  const acc = {
    H: { for: 0, ag: 0, w: 0 },
    A: { for: 0, ag: 0, w: 0 },
  };

  for (const m of matches) {
    const d = new Date(m.utcDate).getTime();
    const daysAgo = Math.max(0, (now - d) / 86400000);
    const w = expWeight(daysAgo, 120);

    const isHome = String(m?.homeTeam?.id) === teamId;
    const hs = Number(m?.score?.fullTime?.home ?? 0);
    const as = Number(m?.score?.fullTime?.away ?? 0);
    const gf = isHome ? hs : as;
    const ga = isHome ? as : hs;

    const k = isHome ? "H" : "A";
    acc[k].for += w * gf;
    acc[k].ag  += w * ga;
    acc[k].w   += w;
  }

  // 事前分布で安定化
  const prior = { for: 1.45, ag: 1.45, w: 5 };
  const H_for = (acc.H.for + prior.w * prior.for) / (acc.H.w + prior.w);
  const H_ag  = (acc.H.ag  + prior.w * prior.ag ) / (acc.H.w + prior.w);
  const A_for = (acc.A.for + prior.w * prior.for) / (acc.A.w + prior.w);
  const A_ag  = (acc.A.ag  + prior.w * prior.ag ) / (acc.A.w + prior.w);

  return { H_for, H_ag, A_for, A_ag };
}

// 次節（SCHEDULED）取得。無ければ FUTURE の最も近い試合へフォールバック
async function getNextFixture(teamId: string) {
  const j1 = await fdFetch(`/teams/${teamId}/matches?status=SCHEDULED`);
  let m = Array.isArray(j1?.matches) ? j1.matches?.[0] : undefined;

  if (!m) {
    const j2 = await fdFetch(`/teams/${teamId}/matches?status=TIMED,POSTPONED`);
    const arr: any[] = Array.isArray(j2?.matches) ? j2.matches : [];
    // 未来で一番近いもの
    m = arr
      .filter(x => new Date(x.utcDate).getTime() > Date.now())
      .sort((a,b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())[0];
  }

  return m; // undefined のまま返ることもある
}

// ポアソン確率
function poissonP(k: number, lambda: number) {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let p = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) p *= lambda / i;
  return p;
}

// スコア確率行列と勝分負確率
function summarize(homeXg: number, awayXg: number, maxGoals = 6) {
  const mat: number[][] = [];
  for (let h = 0; h <= maxGoals; h++) {
    const row: number[] = [];
    for (let a = 0; a <= maxGoals; a++) {
      row.push(poissonP(h, homeXg) * poissonP(a, awayXg));
    }
    mat.push(row);
  }
  let home = 0, draw = 0, away = 0;
  for (let h = 0; h < mat.length; h++) {
    for (let a = 0; a < mat[h].length; a++) {
      if (h > a) home += mat[h][a];
      else if (h === a) draw += mat[h][a];
      else away += mat[h][a];
    }
  }
  // 上位スコア候補
  const flat = [];
  for (let h = 0; h <= maxGoals; h++) {
    for (let a = 0; a <= maxGoals; a++) {
      flat.push({ h, a, p: mat[h][a] });
    }
  }
  flat.sort((x, y) => y.p - x.p);
  return { winProb: { home, draw, away }, topScores: flat.slice(0, 10) };
}

// ==== ルート本体 ====
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const teamId = (sp.get("teamId") || "").trim();

    // ここが 400 の主因になりやすい
    if (!teamId) return badRequest("teamId is required");
    if (!/^\d+$/.test(teamId)) return badRequest("teamId must be numeric");

    if (!FD_KEY) {
      return serverError("FOOTBALL_DATA_API_KEY is missing in env");
    }

    const fixture = await getNextFixture(teamId);
    if (!fixture) {
      return NextResponse.json({ message: "No upcoming fixture found." }, { status: 200 });
    }

    // 対戦相手を判定
    const isHome = String(fixture?.homeTeam?.id) === teamId;
    const oppId  = String(isHome ? fixture?.awayTeam?.id : fixture?.homeTeam?.id);

    // 双方の攻撃/被弾強度
    const sTeam = await weightedStatsSplit(teamId);
    const sOpp  = await weightedStatsSplit(oppId);

    // 期待得点（ホーム/アウェイ補正として相手の被弾平均を利用）
    const homeXg = isHome ? sTeam.H_for * sOpp.A_ag / 1.45 : sOpp.H_for * sTeam.A_ag / 1.45;
    const awayXg = isHome ? sOpp.A_for * sTeam.H_ag / 1.45 : sTeam.A_for * sOpp.H_ag / 1.45;

    const summary = summarize(homeXg, awayXg, 6);

    return NextResponse.json({
     fixture: [{
  utcDate: fixture?.utcDate ?? null,
  homeTeam: fixture?.homeTeam?.name ?? null,
  awayTeam: fixture?.awayTeam?.name ?? null,
  venue: fixture?.venue ?? null,
  status: fixture?.status ?? null,
}],

      xg: { home: homeXg, away: awayXg },
      winProb: summary.winProb,
      topScores: summary.topScores, // [{h,a,p}, ...]
    });
  } catch (e: any) {
    console.error("predict route error:", e?.message || e);
    return serverError(e?.message || "internal error");
  }
}

