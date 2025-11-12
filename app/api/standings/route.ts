import { NextResponse } from "next/server";

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
  };
  return m[val] ?? val;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const leagueRaw = searchParams.get("league") ?? "PL";
    const season    = searchParams.get("season") ?? "2024";

    const code = mapLeague(leagueRaw);
    const url  = `${FD_BASE}/competitions/${code}/standings?season=${season}`;

    const res = await fetch(url, {
      headers: { "X-Auth-Token": FD_KEY },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: "upstream_error", status: res.status, detail: text.slice(0,300) },
        { status: 502 }
      );
    }

    const data = await res.json();

    // ▼ TOTAL（総合順位）のテーブルだけを抽出して前提の形に整形
    const total = (data?.standings ?? []).find((s: any) => s?.type === "TOTAL");
    const table = (total?.table ?? []).map((r: any) => ({
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

    return NextResponse.json({ table }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "internal" }, { status: 500 });
  }
}

