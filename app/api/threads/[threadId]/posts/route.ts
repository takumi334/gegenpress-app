// app/api/threads/[threadId]/posts/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma, { withPrismaRetry } from "@/lib/prisma";
import { translateBatch } from "@/lib/translate";
import { NO_STORE_HEADERS } from "@/lib/noStore";
import {
  containsBannedWords,
  containsBannedWordsInFields,
  MODERATION_ERROR_MESSAGE,
} from "@/lib/moderation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_TARGET_LANG = "en";

// ----------------------------
// POST /api/threads/[threadId]/posts
// body: { authorName?: string, body: string, targetLang?: string }
// ----------------------------
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId: threadIdParam } = await context.params;
    const threadId = threadIdParam?.trim();
    if (!threadId) {
      return NextResponse.json({ error: "threadId is required" }, { status: 400, headers: NO_STORE_HEADERS });
    }

    let payload: {
      authorName?: string;
      body?: string;
      tacticPayload?: Record<string, unknown> | null;
      targetLang?: string;
    };
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json({ error: "invalid JSON" }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const originalBody = (payload?.body ?? "").toString().trim().slice(0, 5000);
    const authorName =
      (payload?.authorName ?? "").toString().trim().slice(0, 40) || "匿名";
    const tacticPayload = payload?.tacticPayload ?? null;
    const tactic = tacticPayload && typeof tacticPayload === "object" && Array.isArray((tacticPayload as { frames?: unknown }).frames)
      ? (tacticPayload as object)
      : undefined;
    const targetLang = (payload?.targetLang ?? DEFAULT_TARGET_LANG).trim() || DEFAULT_TARGET_LANG;

    if (!originalBody) {
      return NextResponse.json({ error: "本文が空です" }, { status: 400, headers: NO_STORE_HEADERS });
    }

    if (
      containsBannedWordsInFields([originalBody, authorName]) ||
      (tactic !== undefined && containsBannedWords(JSON.stringify(tactic)))
    ) {
      return NextResponse.json({ error: MODERATION_ERROR_MESSAGE }, { status: 400, headers: NO_STORE_HEADERS });
    }

    let finalTranslatedBody: string | null = null;
    try {
      const translationInput = [originalBody];
      const translated = await translateBatch(translationInput, targetLang);
      const candidate = (translated[0] ?? "").trim();
      finalTranslatedBody = candidate && candidate !== originalBody ? candidate : null;
    } catch (translateErr) {
      console.warn("[POST posts] 翻訳失敗（translatedBody は null で保存）", translateErr);
    }

    const idNum = Number(threadId);
    if (isNaN(idNum) || idNum <= 0) {
      return NextResponse.json({ error: "invalid threadId" }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const exists = await withPrismaRetry("POST /api/threads/[threadId]/posts thread.findUnique", () =>
      prisma.thread.findUnique({
        where: { id: idNum },
        select: { id: true, deletedAt: true },
      })
    );

    if (!exists) {
      return NextResponse.json(
        { error: "thread not found" },
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }
    if (exists.deletedAt) {
      return NextResponse.json(
        { error: "thread already deleted" },
        { status: 409, headers: NO_STORE_HEADERS }
      );
    }

    const dataBeforeInsert = {
      threadId: idNum,
      author: authorName,
      body: originalBody,
      translatedBody: finalTranslatedBody,
      ...(tactic !== undefined && { tactic }),
    };

    const post = await withPrismaRetry("POST /api/threads/[threadId]/posts post.create", () =>
      prisma.post.create({
        data: dataBeforeInsert,
        select: { id: true, body: true, translatedBody: true, createdAt: true },
      })
    );

    return NextResponse.json({ id: post.id }, { status: 201, headers: NO_STORE_HEADERS });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "internal error";
    console.error("❌ 投稿保存エラー:", e);
    return NextResponse.json(
      { error: String(message) },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
