// app/lib/fd.ts
const FD_BASE = process.env.FD_BASE ?? "https://api.football-data.org/v4";
const FD_KEY  = process.env.FOOTBALL_DATA_API_KEY ?? "";

// 無料枠に余裕を持って 1時間ごと更新（= 24回/日）
export const FD_REVALIDATE_SECONDS = 60 * 60;

/** 内部: URL組み立て（デバッグガード付き） */
function buildUrl(path: string) {
  if (typeof path !== "string") {
    // ここに来たら呼び出し元が間違ってます。ログで特定できます。
    // 例: fdFetch({ path: "/..." }) や fdFetch(undefined)
    // 一時救済: { path: "/..." } なら取り出す
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyPath = path as any;
    if (anyPath && typeof anyPath.path === "string") {
      path = anyPath.path;
      console.warn("[fdFetch] got object; using .path =", path);
    } else {
      console.error("[fdFetch] path must be string. got:", path);
      throw new Error("fdFetch path must be a string");
    }
  }
  const base = FD_BASE.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/** 共通 fetch（Next の再検証キャッシュで 1h に1回だけ取得） */
export async function fdFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = buildUrl(path);
  const res = await fetch(url, {
    ...init,
    next: { revalidate: FD_REVALIDATE_SECONDS },
    headers: {
      ...(init.headers || {}),
      "X-Auth-Token": FD_KEY,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`FD ${res.status} ${res.statusText} @ ${url}\n${text}`);
  }
  return res.json() as Promise<T>;
}

/* =========================
   ヘルパ関数
   ========================= */

/** チームの試合（status と limit 指定可） */
export async function fdTeamMatches(
  teamId: number,
  opts: { status?: "SCHEDULED" | "FINISHED" | "LIVE"; limit?: number } = {},
) {
  const q = new URLSearchParams();
  if (opts.status) q.set("status", opts.status);
  if (opts.limit)  q.set("limit", String(opts.limit));
  const qs = q.toString();
  return fdFetch(`/teams/${teamId}/matches${qs ? `?${qs}` : ""}`);
}

/** チーム情報（activeCompetitions を見るのに使用） */
export const fdTeamInfo = (teamId: number) => fdFetch(`/teams/${teamId}`);

/** 大会IDで順位表を取得（例: 2021=PL） */
export const fdCompetitionStandingsById = (competitionId: number) =>
  fdFetch(`/competitions/${competitionId}/standings`);

/* =========================
   リーグ一覧（型も公開）
   ========================= */
export const LEAGUES = {
  PL:  "Premier League",
  PD:  "La Liga",
  SA:  "Serie A",
  BL1: "Bundesliga",
  FL1: "Ligue 1",
  DED: "Eredivisie",
  PPL: "Primeira Liga",
  CL:  "UEFA Champions League",
} as const;

export type LeagueId = keyof typeof LEAGUES;
export type LeagueCode = LeagueId;

