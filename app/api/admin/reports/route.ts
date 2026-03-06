import { NextRequest, NextResponse } from "next/server";
import { prisma, withPrismaRetry } from "@/lib/prisma";
import { requireAdminFromRequest } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{}> }
) {
  try {
    requireAdminFromRequest(req);
    await context.params;

    const idStr = req.nextUrl.searchParams.get("id");
    const id = Number(idStr);
    if (!Number.isFinite(id)) {
      return NextResponse.json(
        { ok: false, message: "invalid id" },
        { status: 400 }
      );
    }

    console.log("[DELETE /api/admin/reports] thread.update + report.deleteMany id=", id);
    await withPrismaRetry("DELETE /api/admin/reports thread.update", () =>
      prisma.thread.update({
        where: { id },
        data: { deletedAt: new Date() },
      })
    );
    await withPrismaRetry("DELETE /api/admin/reports report.deleteMany", () =>
      prisma.report.deleteMany({
        where: { kind: "thread", targetId: id },
      })
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}

