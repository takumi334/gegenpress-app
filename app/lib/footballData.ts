/**
 * football-data.org v4 API クライアント（試合1時間前スレッド自動作成用）
 * レート制限に配慮し、必要最低限のリクエストのみ行う。
 */

const BASE_URL =
  process.env.FOOTBALL_DATA_BASE_URL ?? process.env.FD_BASE ?? "https://api.football-data.org/v4";
const API_KEY = process.env.FOOTBALL_DATA_API_KEY ?? "";

/** v4 API の試合レスポンスの生型（必要な項目のみ） */
export type FootballDataMatchRaw = {
  id: number;
  utcDate: string;
  status: string;
  competition?: { id: number; code: string; name: string };
  homeTeam?: { id: number; name: string };
  awayTeam?: { id: number; name: string };
};

/** アプリ内で使いやすい形に整形した試合 */
export type MatchLite = {
  id: number;
  utcDate: string;
  status: string;
  competitionCode: string;
  competitionName: string;
  homeTeamId: number;
  homeTeamName: string;
  awayTeamId: number;
  awayTeamName: string;
};

function toMatchLite(m: FootballDataMatchRaw): MatchLite {
  return {
    id: m.id,
    utcDate: m.utcDate,
    status: m.status ?? "",
    competitionCode: m.competition?.code ?? "",
    competitionName: m.competition?.name ?? "",
    homeTeamId: m.homeTeam?.id ?? 0,
    homeTeamName: m.homeTeam?.name ?? "Home",
    awayTeamId: m.awayTeam?.id ?? 0,
    awayTeamName: m.awayTeam?.name ?? "Away",
  };
}

type MatchesResponse = { matches?: FootballDataMatchRaw[] };

/**
 * 指定日付範囲・大会で試合一覧を取得する。
 * レート制限対策: 1リクエストで済むよう competitions をまとめて指定する。
 */
export async function fetchMatchesForDateRange(params: {
  dateFrom: string; // YYYY-MM-DD
  dateTo: string;   // YYYY-MM-DD
  competitions: string[]; // 大会コードの配列 e.g. ["PL", "CL"]
}): Promise<MatchLite[]> {
  const { dateFrom, dateTo, competitions } = params;
  if (!API_KEY) {
    console.error("[footballData] FOOTBALL_DATA_API_KEY is not set");
    return [];
  }
  const q = new URLSearchParams();
  q.set("dateFrom", dateFrom);
  q.set("dateTo", dateTo);
  if (competitions.length > 0) {
    q.set("competitions", competitions.join(","));
  }
  const url = `${BASE_URL.replace(/\/$/, "")}/matches?${q.toString()}`;
  try {
    const res = await fetch(url, {
      headers: { "X-Auth-Token": API_KEY },
      next: { revalidate: 0 },
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[footballData] API error", res.status, res.statusText, text.slice(0, 200));
      return [];
    }
    const data = (await res.json()) as MatchesResponse;
    const list = data.matches ?? [];
    return list.map(toMatchLite);
  } catch (e) {
    console.error("[footballData] fetch error", url, e);
    return [];
  }
}
