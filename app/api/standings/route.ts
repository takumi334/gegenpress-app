import { NextResponse } from "next/server";
import { getDbCacheState, setDbCache } from "@/lib/server/footballDataDbCache";
const LEAGUES_CACHE_HEADERS: Record<string, string> = {
  "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=600",
};

const FD_BASE = process.env.FD_BASE ?? "https://api.football-data.org/v4";
const FD_KEY  = process.env.FOOTBALL_DATA_API_KEY!;

// 数値 → Football-Data のコードに変換（前回と同じ）
const mapLeague = (val: string) => {
  const m: Record<string, string> = {
    "39": "PL",   // Premier League
    "78": "BL1",  // Bundesliga
    "135": "SA",  // Serie A
    "140": "PD",  // LaLiga
    "61": "FL1",  // Ligue 1
    "88": "DED",  // Eredivisie
    "94": "PPL",  // Primeira Liga
  };
  return m[val] ?? val;
};

type StandingEntry = {
  type?: string;
  table?: Array<{
    position?: number;
    team?: { id?: number; name?: string };
    playedGames?: number;
    won?: number;
    draw?: number;
    lost?: number;
    points?: number;
    goalsFor?: number;
    goalsAgainst?: number;
    goalDifference?: number;
  }>;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const leagueRaw = searchParams.get("league") ?? "PL";
    const season    = searchParams.get("season") ?? "2024";

    const code = mapLeague(leagueRaw);
    const cacheKey = `standings:${code}:${season}`;
    const cached = await getDbCacheState<{ table: unknown[] }>(cacheKey);
    if (cached?.isFresh) {
      return NextResponse.json(
        { ...cached.payload, meta: { source: "cache", stale: false, updating: false } },
        { status: 200, headers: LEAGUES_CACHE_HEADERS }
      );
    }

    const url  = `${FD_BASE}/competitions/${code}/standings?season=${season}`;

    const res = await fetch(url, {
      headers: { "X-Auth-Token": FD_KEY },
      next: { revalidate: 60 * 30 },
    });

    if (!res.ok) {
      const text = await res.text();
      if (cached) {
        return NextResponse.json(
          { ...cached.payload, meta: { source: cached.source, stale: true, updating: true } },
          { status: 200, headers: LEAGUES_CACHE_HEADERS }
        );
      }
      return NextResponse.json(
        { error: "upstream_error", status: res.status, detail: text.slice(0,300) },
        { status: 502, headers: LEAGUES_CACHE_HEADERS }
      );
    }

    const data = (await res.json()) as { standings?: StandingEntry[] };

    // ▼ TOTAL（総合順位）のテーブルだけを抽出して前提の形に整形
    const total = (data?.standings ?? []).find((s) => s?.type === "TOTAL");
    const table = (total?.table ?? []).map((r) => ({
      position: r?.position,
      teamId:   r?.team?.id,
      teamName: r?.team?.name,
      played:   r?.playedGames,
      won:      r?.won,
      draw:     r?.draw,
      lost:     r?.lost,
      points:   r?.points,
      gf:       r?.goalsFor,
      ga:       r?.goalsAgainst,
      gd:       r?.goalDifference,
    }));

    const payload = { table };
    await setDbCache(cacheKey, "standings", payload, 60 * 30);
    return NextResponse.json(
      { ...payload, meta: { source: "api", stale: false, updating: false } },
      { status: 200, headers: LEAGUES_CACHE_HEADERS }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "internal";
    const { searchParams } = new URL(req.url);
    const code = mapLeague(searchParams.get("league") ?? "PL");
    const season = searchParams.get("season") ?? "2024";
    const cached = await getDbCacheState<{ table: unknown[] }>(`standings:${code}:${season}`).catch(() => null);
    if (cached) {
      return NextResponse.json(
        { ...cached.payload, meta: { source: cached.source, stale: true, updating: true } },
        { status: 200, headers: LEAGUES_CACHE_HEADERS }
      );
    }
    return NextResponse.json({ error: message }, { status: 500, headers: LEAGUES_CACHE_HEADERS });
  }
}

