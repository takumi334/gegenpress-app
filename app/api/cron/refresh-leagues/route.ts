import { NextRequest, NextResponse } from "next/server";
import { refreshNextLeagueSnapshot } from "@/lib/server/leagueSnapshotCache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const supplied =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    req.headers.get("x-cron-secret") ??
    req.nextUrl.searchParams.get("secret");
  return supplied === expected;
}

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "cron_not_configured" }, { status: 503 });
  }
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await refreshNextLeagueSnapshot();
  return NextResponse.json(result, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
