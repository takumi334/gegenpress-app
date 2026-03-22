import { NextResponse } from "next/server";
import { prisma, withPrismaRetry } from "@/lib/prisma";
import { verifyAdminDeleteToken } from "@/lib/adminDeleteToken";

export const runtime = "nodejs";

/**
 * 署名付きトークンのみ。管理者メール内 URL から POST。
 */
export async function POST(req: Request) {
  let token = "";
  try {
    const body = (await req.json().catch(() => ({}))) as { token?: string };
    token = typeof body.token === "string" ? body.token.trim() : "";
  } catch {
    token = "";
  }

  if (!token) {
    return NextResponse.json({ ok: false, error: "token_required" }, { status: 403 });
  }

  const payload = verifyAdminDeleteToken(token);
  if (!payload) {
    return NextResponse.json(
      { ok: false, error: "invalid_or_expired_token" },
      { status: 403 }
    );
  }

  try {
    await withPrismaRetry("admin/mod/delete transaction", async () => {
      await prisma.$transaction(async (tx) => {
        const report = await tx.report.findUnique({
          where: { id: payload.reportId },
        });
        if (!report) {
          throw new Error("REPORT_NOT_FOUND");
        }
        if (report.targetId !== payload.targetId || report.kind !== payload.type) {
          throw new Error("REPORT_MISMATCH");
        }

        if (payload.type === "thread") {
          const th = await tx.thread.findUnique({ where: { id: payload.targetId } });
          if (th) {
            await tx.thread.update({
              where: { id: payload.targetId },
              data: { deletedAt: new Date() },
            });
          }
        } else {
          await tx.post.deleteMany({ where: { id: payload.targetId } });
        }

        await tx.report.deleteMany({
          where: { kind: payload.type, targetId: payload.targetId },
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
