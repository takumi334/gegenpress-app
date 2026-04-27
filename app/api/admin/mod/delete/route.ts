import { NextRequest, NextResponse } from "next/server";
import { prisma, withPrismaRetry } from "@/lib/prisma";
import { requireAdminApiKey } from "@/lib/requireAdminApiKey";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    requireAdminApiKey(req);
  } catch {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  let payload: { reportId?: number; targetId?: number; type?: "thread" | "post" } = {};
  try {
    payload = (await req.json().catch(() => ({}))) as {
      reportId?: number;
      targetId?: number;
      type?: "thread" | "post";
    };
  } catch {
    payload = {};
  }

  if (
    !Number.isFinite(Number(payload.reportId)) ||
    !Number.isFinite(Number(payload.targetId)) ||
    (payload.type !== "thread" && payload.type !== "post")
  ) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  try {
    await withPrismaRetry("admin/mod/delete transaction", async () => {
      await prisma.$transaction(async (tx) => {
        const report = await tx.report.findUnique({
          where: { id: Number(payload.reportId) },
        });
        if (!report) {
          throw new Error("REPORT_NOT_FOUND");
        }
        if (report.targetId !== Number(payload.targetId) || report.kind !== payload.type) {
          throw new Error("REPORT_MISMATCH");
        }

        if (payload.type === "thread") {
          const th = await tx.thread.findUnique({ where: { id: Number(payload.targetId) } });
          if (th) {
            await tx.thread.update({
              where: { id: Number(payload.targetId) },
              data: { deletedAt: new Date() },
            });
          }
        } else {
          await tx.post.deleteMany({ where: { id: Number(payload.targetId) } });
        }

        await tx.report.deleteMany({
          where: { kind: payload.type, targetId: Number(payload.targetId) },
        });
      });
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "REPORT_NOT_FOUND" || msg === "REPORT_MISMATCH") {
      return NextResponse.json({ ok: false, error: msg }, { status: 403 });
    }
    console.error("[ADMIN_MOD_DELETE]", e);
    return NextResponse.json(
      { ok: false, error: "delete_failed", message: msg },
      { status: 500 }
    );
  }
}
