export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma, withPrismaRetry } from "@/lib/prisma";
import { requireAdminApiKey } from "@/lib/requireAdminApiKey";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
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
    const status = msg === "UNAUTHORIZED" ? 401 : 500;

    return NextResponse.json({ ok: false, message: msg }, { status });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    requireAdminApiKey(req);
    const { id: idStr } = await context.params;
    const id = Number(idStr);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ ok: false, message: "Invalid id" }, { status: 400 });
    }

    const exists = await withPrismaRetry("PATCH /api/admin/thread thread.findUnique", () =>
      prisma.thread.findUnique({ where: { id } })
    );
    if (!exists) {
      return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
    }

    await withPrismaRetry("PATCH /api/admin/thread thread.restore", () =>
      prisma.thread.update({
        where: { id },
        data: { deletedAt: null },
      })
    );

    return NextResponse.json({ ok: true, restoredThread: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ ok: false, message: msg }, { status });
  }
}
