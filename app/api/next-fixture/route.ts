// app/api/next-fixture/route.ts
import { NextResponse } from "next/server";
import { getPredictJsonForTeam } from "@/lib/predictCacheService";

const BASE = process.env.FD_BASE || "https://api.football-data.org/v4";
const KEY = process.env.FOOTBALL_DATA_API_KEY!;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId");
    if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });

    const r = await fetch(`${BASE}/teams/${teamId}/matches?status=SCHEDULED&limit=1`, {
      headers: { "X-Auth-Token": KEY },
      cache: "no-store",
    });
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      if (r.status === 429) {
        return NextResponse.json({
          match: null,
          predict: null,
          error: "fd_rate_limited",
          detail: text.slice(0, 200),
        });
      }
      return NextResponse.json(
        { error: `fd failed ${r.status}`, detail: text },
        { status: 502 }
      );
    }
    const json = await r.json();
    const match = json?.matches?.[0] ?? null;
    if (!match?.homeTeam?.id || !match?.awayTeam?.id) {
      return NextResponse.json({ match: null, predict: null });
    }

    // 予想は「この teamId の次試合」視点でキャッシュ（ホーム/アウェイの xG 補正と一致させる）
    const { json: predict } = await getPredictJsonForTeam(teamId);

    return NextResponse.json({ match, predict });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
}
