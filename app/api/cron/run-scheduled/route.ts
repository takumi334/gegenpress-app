// POST /api/cron/run-scheduled
// Vercel Cron または外部 Cron から叩く。CRON_SECRET で保護。
import { NextRequest, NextResponse } from "next/server";
import { prisma, withPrismaRetry } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("authorization")?.replace("Bearer ", "")
      ?? req.headers.get("x-cron-secret")
      ?? req.nextUrl.searchParams.get("secret");
    const expected = process.env.CRON_SECRET;
    if (expected && secret !== expected) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const limit = 20;
    console.log("[POST /api/cron/run-scheduled] scheduledPost.findMany");
    const pending = await withPrismaRetry("POST /api/cron/run-scheduled scheduledPost.findMany", () =>
      (prisma as any).scheduledPost.findMany({
        where: { runAt: { lte: now }, postedAt: null },
        orderBy: { runAt: "asc" },
        take: limit,
      })
    );

    let created = 0;
    for (const s of pending) {
      try {
        console.log("[POST /api/cron/run-scheduled] thread.create id=", s.id);
        const threadType = s.type.toLowerCase();
        await withPrismaRetry("POST /api/cron/run-scheduled thread.create", () =>
          prisma.thread.create({
            data: { teamId: s.teamId, title: s.title, body: s.body, threadType },
          })
        );
        await withPrismaRetry("POST /api/cron/run-scheduled scheduledPost.update", () =>
          (prisma as any).scheduledPost.update({
            where: { id: s.id },
            data: { postedAt: now },
          })
        );
        created++;
      } catch (e) {
        console.error("run-scheduled: failed to post", s.id, e);
      }
    }

    return NextResponse.json({ ok: true, created, total: pending.length });
  } catch (e: any) {
    console.error("run-scheduled error:", e);
    return NextResponse.json({ error: e?.message ?? "internal error" }, { status: 500 });
  }
}
