// GET /api/cron/auto-match-threads
// 試合開始1時間前の自動スレッド生成。Vercel Cron 等から CRON_SECRET で保護して叩く。
import { NextRequest, NextResponse } from "next/server";
import { runAutoCreateMatchThreads } from "@/lib/autoCreateMatchThreads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const secret =
      req.headers.get("authorization")?.replace("Bearer ", "") ??
      req.headers.get("x-cron-secret") ??
      req.nextUrl.searchParams.get("secret");
    const expected = process.env.CRON_SECRET;
    if (expected && secret !== expected) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const result = await runAutoCreateMatchThreads(now);

    return NextResponse.json({
      createdCount: result.createdCount,
      skippedCount: result.skippedCount,
      failedCount: result.failedCount,
      matches: result.matches,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "internal error";
    console.error("[GET /api/cron/auto-match-threads] error:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
