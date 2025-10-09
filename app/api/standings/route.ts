import { NextResponse } from "next/server";

const host = process.env.APISPORTS_HOST!;
const key = process.env.APISPORTS_KEY!;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const league = searchParams.get("league");   // 例: 39 (Premier League)
  const season = searchParams.get("season");   // 例: 2024

  if (!league || !season) {
    return NextResponse.json({ error: "league と season は必須です" }, { status: 400 });
  }

  const url = `https://${host}/standings?league=${league}&season=${season}`;
  const res = await fetch(url, {
    headers: { "x-apisports-key": key },
    cache: "no-store",
  });

  const data = await res.json();
  return NextResponse.json(data);
}
