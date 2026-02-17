import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminFromRequest } from "@/lib/adminAuth";

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

    await prisma.thread.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await prisma.report.deleteMany({
      where: { kind: "thread", targetId: id },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}

