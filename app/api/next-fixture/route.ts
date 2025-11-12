// app/api/next-fixture/route.ts
import { NextResponse } from "next/server";

const BASE = process.env.FD_BASE || "https://api.football-data.org/v4";
const KEY  = process.env.FOOTBALL_DATA_API_KEY!;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId");
    if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });

    // 次の試合
    const r = await fetch(`${BASE}/teams/${teamId}/matches?status=SCHEDULED&limit=1`, {
      headers: { "X-Auth-Token": KEY }, cache: "no-store",
    });
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      return NextResponse.json({ error: `fd failed ${r.status}`, detail: text }, { status: 502 });
    }
    const json = await r.json();
    const match = json?.matches?.[0] ?? null;
    if (!match?.homeTeam?.id || !match?.awayTeam?.id) {
      return NextResponse.json({ match: null, predict: null });
    }

    // 予測も同梱
    const url = new URL("/api/predict", "http://localhost:3000");
    url.searchParams.set("homeId", String(match.homeTeam.id));
    url.searchParams.set("awayId", String(match.awayTeam.id));
    const preRes = await fetch(url, { cache: "no-store" }).catch(() => null);
    const predict = preRes && preRes.ok ? await preRes.json() : null;

    return NextResponse.json({ match, predict });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
}

