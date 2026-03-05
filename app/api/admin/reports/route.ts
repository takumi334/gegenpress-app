import { NextResponse } from "next/server";
import { prisma, withPrismaRetry } from "@/lib/prisma";
import { requireAdminFromRequest } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    requireAdminFromRequest(req);

    const id = Number(params.id);
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

