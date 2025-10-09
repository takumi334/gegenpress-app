// app/api/teams/route.ts
import { NextResponse } from "next/server";

const host = process.env.APISPORTS_HOST!;
const key  = process.env.APISPORTS_KEY!;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const league = searchParams.get("league"); // 髣懆侭繝ｻ 39
  const season = searchParams.get("season") ?? "2024";

  if (!league) {
    return NextResponse.json({ error: "league is required" }, { status: 400 });
  }

  const url = `https://${host}/teams?league=${league}&season=${season}`;
  const res = await fetch(url, {
    headers: { "x-apisports-key": key },
    cache: "no-store",
  });

  const data = await res.json();
  return NextResponse.json(data);
}

