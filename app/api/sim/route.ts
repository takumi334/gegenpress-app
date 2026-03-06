import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{}> }
) {
  await context.params;
  const home = req.nextUrl.searchParams.get("home") ?? "";
  const away = req.nextUrl.searchParams.get("away") ?? "";
  if (!home.trim() || !away.trim()) {
    return NextResponse.json(
      { error: "home and away query params required" },
      { status: 400 }
    );
  }
  // Stub: return placeholder probabilities (full sim logic can be added later)
  return NextResponse.json({
    homeWin: 0.33,
    draw: 0.34,
    awayWin: 0.33,
    topScores: [
      { score: "1-0", p: 0.1 },
      { score: "0-0", p: 0.09 },
      { score: "1-1", p: 0.08 },
    ],
  });
}
