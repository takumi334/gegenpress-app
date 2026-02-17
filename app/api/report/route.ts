export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import util from "node:util";
import { Prisma } from "@prisma/client";
import { sendReportMail } from "@/lib/reportMailer";

/**
 * GET /api/report
 * 管理・確認用：最新のレポート一覧を取得
 */
export async function GET() {
  try {
    const items = await prisma.report.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ ok: true, items });
  } catch (e: unknown) {
    console.error("[/api/report][GET] error raw:", e);
    console.error(
      "[/api/report][GET] error inspect:",
      util.inspect(e, { depth: 10 })
    );

    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, type: "InternalError", message: msg },
      { status: 500 }
    );
  }
}

/**
 * POST /api/report
 * 通報作成API
 */
export async function POST(req: Request) {
  // どんなリクエストが来ているか最低限ログ
  const contentType = req.headers.get("content-type") ?? "";
  const ua = req.headers.get("user-agent") ?? null;

  try {
    // JSONが壊れてても落ちないようにする
    let body: unknown = null;
    try {
      body = await req.json();
    } catch (err) {
      console.error("[/api/report][POST] req.json() failed:", err);
      body = null;
    }

    // ★ここが欲しいログ（必ず出る）
    console.log("[/api/report][POST] content-type:", contentType);
    console.log("[/api/report][POST] raw body:", body);

    const { kind, targetId, reason, detail, pageUrl } = (body ?? {}) as Record<
      string,
      unknown
    >;

    // ✅ kind 必須
    if (typeof kind !== "string" || kind.trim() === "") {
      return NextResponse.json(
        { ok: false, type: "BadRequest", message: "kind is required" },
        { status: 400 }
      );
    }

    // ✅ targetId 必須（数値）
    const targetIdNum = Number(targetId);
    if (!Number.isFinite(targetIdNum)) {
      return NextResponse.json(
        { ok: false, type: "BadRequest", message: "targetId must be a number" },
        { status: 400 }
      );
    }

    const created = await prisma.report.create({
      data: {
        kind: kind.trim(),
        targetId: targetIdNum,
        reason:
          typeof reason === "string" && reason.trim() ? reason.trim() : null,
        detail:
          typeof detail === "string" && detail.trim() ? detail.trim() : null,
        pageUrl:
          typeof pageUrl === "string" && pageUrl.trim() ? pageUrl.trim() : null,
        ua,
        ip: null, // 必要なら headers から取得
      },
    });

console.log("[/api/report][POST] before sendReportMail");

try {
  const r = await sendReportMail({
    id: created.id,
    kind: created.kind,
    targetId: created.targetId,
    reason: created.reason,
    teamId: created.teamId,
    url: created.pageUrl,
  });

  console.log("[/api/report][POST] sendReportMail OK:", r);
} catch (err) {
  console.error("[/api/report][POST] sendReportMail failed:", err);
}


try {
await sendReportMail({
  id: created.id,
  kind: created.kind,
  targetId: created.targetId,
  reason: created.reason,
  teamId: created.teamId,
  url: created.pageUrl, // or req.body.pageUrl
});

} catch (err) {
  console.error("[/api/report][POST] sendReportMail failed:", err);
  // ✅ メール失敗しても通報自体は成功にする
}


    console.log("[/api/report][POST] created:", created);

    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (e: unknown) {
    console.error("[/api/report][POST] error raw:", e);
    console.error(
      "[/api/report][POST] error inspect:",
      util.inspect(e, { depth: 10 })
    );

    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        {
          ok: false,
          type: "KnownRequestError",
          name: e.name,
          code: e.code,
          meta: e.meta,
          message: e.message,
        },
        { status: 500 }
      );
    }

    if (e instanceof Prisma.PrismaClientValidationError) {
      return NextResponse.json(
        { ok: false, type: "ValidationError", message: e.message },
        { status: 500 }
      );
    }

    if (e instanceof Prisma.PrismaClientInitializationError) {
      return NextResponse.json(
        { ok: false, type: "InitializationError", message: e.message },
        { status: 500 }
      );
    }

    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, type: "UnknownError", message: msg },
      { status: 500 }
    );
  }
}
