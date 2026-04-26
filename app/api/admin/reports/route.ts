import { NextRequest, NextResponse } from "next/server";
import { prisma, withPrismaRetry } from "@/lib/prisma";
import { requireAdminUserEmail } from "@/lib/adminUser";

export const runtime = "nodejs";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{}> }
) {
  try {
    await requireAdminUserEmail();
    await context.params;

    const idStr = req.nextUrl.searchParams.get("id");
    const id = Number(idStr);
    if (!Number.isFinite(id)) {
      return NextResponse.json(
        { ok: false, message: "invalid id" },
        { status: 400 }
      );
    }

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
    const message = e?.message ?? String(e);
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json(
      { ok: false, message },
      { status }
    );
  }
}

