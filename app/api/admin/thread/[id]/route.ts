export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma, withPrismaRetry } from "@/lib/prisma";
import { requireAdminApiKey } from "@/lib/requireAdminApiKey";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    console.log("[/api/admin/thread/[id]] incoming request", {
      hasAdminHeader: !!req.headers.get("x-admin-key"),
      adminHeaderLen: (req.headers.get("x-admin-key") ?? "").trim().length,
    });
    requireAdminApiKey(req);

    const { id: idStr } = await context.params;
    const id = Number(idStr);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ ok: false, message: "Invalid id" }, { status: 400 });
    }

    const reportResult = await withPrismaRetry(
      "DELETE /api/admin/thread report.deleteMany",
      () =>
        prisma.report.deleteMany({
          where: { kind: "thread", targetId: id },
        })
    );

    const exists = await withPrismaRetry("DELETE /api/admin/thread thread.findUnique", () =>
      prisma.thread.findUnique({ where: { id } })
    );

    if (exists) {
      await withPrismaRetry("DELETE /api/admin/thread thread.update deletedAt", () =>
        prisma.thread.update({
          where: { id },
          data: { deletedAt: new Date() },
        })
      );
    }

    return NextResponse.json({
      ok: true,
      softDeletedThread: Boolean(exists),
      deletedReports: reportResult.count,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log("[/api/admin/thread/[id]] failed", {
      message: msg,
      hasEnv: !!process.env.ADMIN_KEY,
      envLen: process.env.ADMIN_KEY?.length ?? 0,
      hasAdminHeader: !!req.headers.get("x-admin-key"),
      adminHeaderLen: (req.headers.get("x-admin-key") ?? "").trim().length,
    });

    const status = msg === "UNAUTHORIZED" ? 401 : 500;

    return NextResponse.json({ ok: false, message: msg }, { status });
  }
}
