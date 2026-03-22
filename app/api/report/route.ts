export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma, withPrismaRetry } from "@/lib/prisma";
import util from "node:util";
import { Prisma } from "@prisma/client";
import { sendReportMail } from "@/lib/reportMailer";
import { buildReportEmailContext } from "@/lib/buildReportEmailContext";

/**
 * GET /api/report
 * 管理・確認用：最新のレポート一覧を取得
 */
export async function GET() {
  try {
    const items = await withPrismaRetry("GET /api/report report.findMany", () =>
      prisma.report.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
      })
    );

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

    const { kind, targetId, reason, detail, pageUrl, teamId: bodyTeamId } = (body ?? {}) as Record<
      string,
      unknown
    >;

    // ✅ kind 必須（DB・削除トークンと一致させる）
    if (typeof kind !== "string" || kind.trim() === "") {
      return NextResponse.json(
        { ok: false, type: "BadRequest", message: "kind is required" },
        { status: 400 }
      );
    }
    const kindNorm = kind.trim();
    if (kindNorm !== "thread" && kindNorm !== "post") {
      return NextResponse.json(
        { ok: false, type: "BadRequest", message: "kind must be thread or post" },
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

    const created = await withPrismaRetry("POST /api/report report.create", () =>
      prisma.report.create({
        data: {
          kind: kindNorm,
          targetId: targetIdNum,
          reason:
            typeof reason === "string" && reason.trim() ? reason.trim() : null,
          detail:
            typeof detail === "string" && detail.trim() ? detail.trim() : null,
          pageUrl:
            typeof pageUrl === "string" && pageUrl.trim() ? pageUrl.trim() : null,
          ua,
          ip: null,
        },
      })
    );

    // Report モデルに teamId はない。teamId はリクエスト body から渡す（例: /board/[teamId] から通報時）
    const teamIdForMail =
      bodyTeamId !== undefined && bodyTeamId !== null && Number.isFinite(Number(bodyTeamId))
        ? Number(bodyTeamId)
        : undefined;

    try {
      const mailCtx = await buildReportEmailContext(created, teamIdForMail);
      await sendReportMail(mailCtx);
    } catch (err) {
      console.error("[/api/report][POST] sendReportMail failed:", err);
      // メール失敗しても通報自体は成功にする
    }

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
