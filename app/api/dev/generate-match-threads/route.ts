// GET /api/dev/generate-match-threads
// 開発環境で試合スレッド自動生成を手動実行
// NODE_ENV=development または DEV_GENERATE_MATCH_THREADS=true のときのみ有効

import { NextRequest, NextResponse } from "next/server";
import { runAutoCreateMatchThreads } from "@/lib/autoCreateMatchThreads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isDev =
  process.env.NODE_ENV === "development" ||
  process.env.DEV_GENERATE_MATCH_THREADS === "true";

export async function GET(req: NextRequest) {
  if (!isDev) {
    return NextResponse.json({ error: "Available only in development" }, { status: 403 });
  }

  try {
    const now = new Date();
    const result = await runAutoCreateMatchThreads(now);

    return NextResponse.json({
      now: now.toISOString(),
      createdCount: result.createdCount,
      skippedCount: result.skippedCount,
      failedCount: result.failedCount,
      matches: result.matches,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "internal error";
    console.error("[GET /api/dev/generate-match-threads] error:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
