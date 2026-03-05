export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma, withPrismaRetry } from "@/lib/prisma";

function requireAdminKey(req: Request) {
  const got = (req.headers.get("x-admin-key") ?? "").trim();
  const expected = (process.env.ADMIN_KEY ?? "").trim();

  if (!expected) throw new Error("ADMIN_KEY_MISSING");
  if (!got) throw new Error("UNAUTHORIZED");
  if (got !== expected) throw new Error("UNAUTHORIZED");
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    requireAdminKey(req);

    const id = Number(params.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ ok: false, message: "Invalid id" }, { status: 400 });
    }

    console.log("[DELETE /api/admin/thread/[id]] report.deleteMany + thread id=", id);
    const reportResult = await withPrismaRetry("DELETE /api/admin/thread report.deleteMany", () =>
      prisma.report.deleteMany({
        where: { kind: "thread", targetId: id },
      })
    );
    const exists = await withPrismaRetry("DELETE /api/admin/thread thread.findUnique", () =>
      prisma.thread.findUnique({ where: { id } })
    );
    if (exists) {
      await withPrismaRetry("DELETE /api/admin/thread thread.delete", () =>
        prisma.thread.delete({ where: { id } })
      );
    }

    return NextResponse.json({
      ok: true,
      deletedThread: Boolean(exists),
      deletedReports: reportResult.count,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);

    const status =
      msg === "UNAUTHORIZED" ? 401 :
      msg === "ADMIN_KEY_MISSING" ? 500 :
      500;

    const message =
      msg === "ADMIN_KEY_MISSING" ? "ADMIN_KEY is missing in env" : msg;

    return NextResponse.json({ ok: false, message }, { status });
  }
}
