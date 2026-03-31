// app/api/predict/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPredictJsonForTeam } from "@/lib/predictCacheService";

export const runtime = "nodejs";

const PREDICT_CACHE_HEADERS: Record<string, string> = {
  "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
};

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400, headers: PREDICT_CACHE_HEADERS });
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const teamId = (sp.get("teamId") || "").trim();

    if (!teamId) return badRequest("teamId is required");
    if (!/^\d+$/.test(teamId)) return badRequest("teamId must be numeric");

    const { json, status } = await getPredictJsonForTeam(teamId);
    return NextResponse.json(json, { status, headers: PREDICT_CACHE_HEADERS });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("predict route error:", msg);
    return NextResponse.json(
      {
        message: "データ準備中です。しばらくしてから再度お試しください。",
        meta: { source: "preparing", error: msg },
      },
      { status: 200, headers: PREDICT_CACHE_HEADERS }
    );
  }
}
