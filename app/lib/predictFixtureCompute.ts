/**
 * football-data.org を用いた「次の試合＋ポアソン予想」の純計算（キャッシュなし）。
 * 1 回のフル計算で FD へ約 4〜5 リクエスト。
 */
import "server-only";

const FD_BASE = process.env.FD_BASE ?? "https://api.football-data.org/v4";
const FD_KEY = process.env.FOOTBALL_DATA_API_KEY ?? "";

export class PredictFdRateLimitedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PredictFdRateLimitedError";
  }
}

async function fdFetch(path: string): Promise<unknown> {
  const url = `${FD_BASE}${path}`;
  const res = await fetch(url, {
    headers: { "X-Auth-Token": FD_KEY, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 429) {
      throw new PredictFdRateLimitedError(`football-data 429 url=${url}`);
    }
    throw new Error(`football-data ${res.status}: ${text.slice(0, 200) || url}`);
  }
  return res.json();
}

function expWeight(daysAgo: number, halfLifeDays = 120) {
  const k = Math.log(2) / halfLifeDays;
  return Math.exp(-k * daysAgo);
}

async function weightedStatsSplit(teamId: string) {
  const j = (await fdFetch(`/teams/${teamId}/matches?status=FINISHED`)) as {
    matches?: unknown[];
  };
  const matches: any[] = Array.isArray(j?.matches) ? j.matches : [];
  const now = Date.now();

  const acc = {
    H: { for: 0, ag: 0, w: 0 },
    A: { for: 0, ag: 0, w: 0 },
  };

  for (const m of matches) {
    const utc = m?.utcDate;
    if (utc == null) continue;
    const d = new Date(utc).getTime();
    const daysAgo = Math.max(0, (now - d) / 86400000);
    const w = expWeight(daysAgo, 120);

    const isHome = String(m?.homeTeam?.id) === teamId;
    const hs = Number(m?.score?.fullTime?.home ?? 0);
    const as = Number(m?.score?.fullTime?.away ?? 0);
    const gf = isHome ? hs : as;
    const ga = isHome ? as : hs;

    const k = isHome ? "H" : "A";
    acc[k].for += w * gf;
    acc[k].ag += w * ga;
    acc[k].w += w;
  }

  const prior = { for: 1.45, ag: 1.45, w: 5 };
  const H_for = (acc.H.for + prior.w * prior.for) / (acc.H.w + prior.w);
  const H_ag = (acc.H.ag + prior.w * prior.ag) / (acc.H.w + prior.w);
  const A_for = (acc.A.for + prior.w * prior.for) / (acc.A.w + prior.w);
  const A_ag = (acc.A.ag + prior.w * prior.ag) / (acc.A.w + prior.w);

  return { H_for, H_ag, A_for, A_ag };
}

async function getNextFixture(teamId: string) {
  const j1 = (await fdFetch(`/teams/${teamId}/matches?status=SCHEDULED`)) as {
    matches?: any[];
  };
  const firstScheduled = Array.isArray(j1?.matches) ? j1.matches?.[0] : undefined;
  let m = firstScheduled?.utcDate != null ? firstScheduled : undefined;

  if (!m) {
    const j2 = (await fdFetch(
      `/teams/${teamId}/matches?status=TIMED,POSTPONED`
    )) as { matches?: any[] };
    const arr: any[] = Array.isArray(j2?.matches) ? j2.matches : [];
    const now = Date.now();
    m = arr
      .filter((x) => x?.utcDate != null && new Date(x.utcDate).getTime() > now)
      .sort(
        (a, b) =>
          new Date(a?.utcDate ?? 0).getTime() - new Date(b?.utcDate ?? 0).getTime()
      )[0];
  }

  return m;
}

function poissonP(k: number, lambda: number) {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let p = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) p *= lambda / i;
  return p;
}

function summarize(homeXg: number, awayXg: number, maxGoals = 6) {
  const mat: number[][] = [];
  for (let h = 0; h <= maxGoals; h++) {
    const row: number[] = [];
    for (let a = 0; a <= maxGoals; a++) {
      row.push(poissonP(h, homeXg) * poissonP(a, awayXg));
    }
    mat.push(row);
  }
  let home = 0,
    draw = 0,
    away = 0;
  for (let h = 0; h < mat.length; h++) {
    for (let a = 0; a < mat[h].length; a++) {
      if (h > a) home += mat[h][a];
      else if (h === a) draw += mat[h][a];
      else away += mat[h][a];
    }
  }
  const flat: { h: number; a: number; p: number }[] = [];
  for (let h = 0; h <= maxGoals; h++) {
    for (let a = 0; a <= maxGoals; a++) {
      flat.push({ h, a, p: mat[h][a] });
    }
  }
  flat.sort((x, y) => y.p - x.p);
  return { winProb: { home, draw, away }, topScores: flat.slice(0, 10) };
}

export type TeamPredictPayload = {
  fixture: {
    id: number | null;
    utcDate: string | null;
    venue: string | null;
    status: string | null;
    teams: {
      home: { name: string | null; logo: string | null };
      away: { name: string | null; logo: string | null };
    };
  };
  xg: { home: number; away: number };
  winProb: { home: number; draw: number; away: number };
  topScores: { h: number; a: number; p: number }[];
  meta?: {
    source: "fresh" | "cache" | "stale";
    fetchedAt?: string;
    expiresAt?: string;
    preparing?: boolean;
  };
  message?: string;
};

export type ComputeTeamPredictResult =
  | { kind: "ok"; payload: TeamPredictPayload }
  | { kind: "no_fixture"; payload: { message: string } }
  | { kind: "error"; message: string; rateLimited?: boolean };

export async function computeTeamPredict(teamId: string): Promise<ComputeTeamPredictResult> {
  if (!FD_KEY) {
    return { kind: "error", message: "FOOTBALL_DATA_API_KEY is missing in env" };
  }

  try {
    const fixture = await getNextFixture(teamId);
    if (!fixture) {
      return { kind: "no_fixture", payload: { message: "No upcoming fixture found." } };
    }

    const isHome = String(fixture?.homeTeam?.id) === teamId;
    const oppId = String(isHome ? fixture?.awayTeam?.id : fixture?.homeTeam?.id);

    const sTeam = await weightedStatsSplit(teamId);
    const sOpp = await weightedStatsSplit(oppId);

    const homeXg = isHome
      ? sTeam.H_for * sOpp.A_ag / 1.45
      : sOpp.H_for * sTeam.A_ag / 1.45;
    const awayXg = isHome
      ? sOpp.A_for * sTeam.H_ag / 1.45
      : sTeam.A_for * sOpp.H_ag / 1.45;

    const summary = summarize(homeXg, awayXg, 6);

    const payload: TeamPredictPayload = {
      fixture: {
        id: fixture?.id ?? null,
        utcDate: fixture?.utcDate ?? null,
        venue: fixture?.venue ?? null,
        status: fixture?.status ?? null,
        teams: {
          home: {
            name: fixture?.homeTeam?.name ?? null,
            logo: fixture?.homeTeam?.crest ?? null,
          },
          away: {
            name: fixture?.awayTeam?.name ?? null,
            logo: fixture?.awayTeam?.crest ?? null,
          },
        },
      },
      xg: { home: homeXg, away: awayXg },
      winProb: summary.winProb,
      topScores: summary.topScores,
    };

    return { kind: "ok", payload };
  } catch (e: unknown) {
    if (e instanceof PredictFdRateLimitedError) {
      return { kind: "error", message: e.message, rateLimited: true };
    }
    const msg = e instanceof Error ? e.message : String(e);
    return { kind: "error", message: msg };
  }
}
