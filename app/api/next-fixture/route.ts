// app/api/next-fixture/route.ts
import { NextResponse } from "next/server";
import { getPredictJsonForTeam } from "@/lib/predictCacheService";
const NEXT_FIXTURE_CACHE_HEADERS: Record<string, string> = {
  "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=300",
};

const BASE = process.env.FD_BASE || "https://api.football-data.org/v4";
const KEY = process.env.FOOTBALL_DATA_API_KEY!;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId");
    if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400, headers: NEXT_FIXTURE_CACHE_HEADERS });

    const r = await fetch(`${BASE}/teams/${teamId}/matches?status=SCHEDULED&limit=1`, {
      headers: { "X-Auth-Token": KEY },
      next: { revalidate: 60 * 30 },
    });
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      if (r.status === 429) {
        return NextResponse.json(
          {
            match: null,
            predict: null,
            error: "fd_rate_limited",
            detail: text.slice(0, 200),
          },
          { headers: NEXT_FIXTURE_CACHE_HEADERS }
        );
      }
      return NextResponse.json(
        { error: `fd failed ${r.status}`, detail: text },
        { status: 502, headers: NEXT_FIXTURE_CACHE_HEADERS }
      );
    }
    const json = await r.json();
    const match = json?.matches?.[0] ?? null;
    if (!match?.homeTeam?.id || !match?.awayTeam?.id) {
      return NextResponse.json({ match: null, predict: null }, { headers: NEXT_FIXTURE_CACHE_HEADERS });
    }

    // 予想は「この teamId の次試合」視点でキャッシュ（ホーム/アウェイの xG 補正と一致させる）
    const { json: predict } = await getPredictJsonForTeam(teamId, match);

    return NextResponse.json({ match, predict }, { headers: NEXT_FIXTURE_CACHE_HEADERS });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "bad request" }, { status: 400, headers: NEXT_FIXTURE_CACHE_HEADERS });
  }
}
