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
const BOARD_REPLIES_CACHE_HEADERS: Record<string, string> = {
  "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30",
};

const DEFAULT_TARGET_LANG = "en";

/** GET /api/posts?threadId= — 返信一覧（互換・直叩き用） */
export async function GET(req: NextRequest) {
  try {
    const threadIdStr = req.nextUrl.searchParams.get("threadId");
    if (!threadIdStr) {
      return NextResponse.json({ error: "threadId required" }, { status: 400, headers: BOARD_REPLIES_CACHE_HEADERS });
    }
    const idNum = Number(threadIdStr);
    if (!Number.isInteger(idNum) || idNum <= 0) {
      return NextResponse.json({ error: "invalid threadId" }, { status: 400, headers: BOARD_REPLIES_CACHE_HEADERS });
    }
    const posts = await withPrismaRetry("GET /api/posts", () =>
      prisma.post.findMany({
        where: { threadId: idNum },
        orderBy: { createdAt: "asc" },
        select: { id: true, author: true, body: true, createdAt: true },
      })
    );
    return NextResponse.json(posts, { headers: BOARD_REPLIES_CACHE_HEADERS });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "internal error";
    return NextResponse.json({ error: message }, { status: 500, headers: BOARD_REPLIES_CACHE_HEADERS });
  }
}

/** POST /api/posts — 返信作成（/api/threads/[id]/posts と同等・モデレーション共通） */
export async function POST(req: NextRequest) {
  try {
    let payload: {
      threadId?: number | string;
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

    const threadIdNum = Number(payload?.threadId);
    if (!Number.isInteger(threadIdNum) || threadIdNum <= 0) {
      return NextResponse.json({ error: "threadId required" }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const originalBody = (payload?.body ?? "").toString().trim().slice(0, 5000);
    const authorName =
      (payload?.authorName ?? "").toString().trim().slice(0, 40) || "匿名";
    const tacticPayload = payload?.tacticPayload ?? null;
    const tactic =
      tacticPayload &&
      typeof tacticPayload === "object" &&
      Array.isArray((tacticPayload as { frames?: unknown }).frames)
        ? (tacticPayload as object)
        : undefined;
    const targetLang =
      (payload?.targetLang ?? DEFAULT_TARGET_LANG).trim() || DEFAULT_TARGET_LANG;

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
      const translated = await translateBatch([originalBody], targetLang);
      const candidate = (translated[0] ?? "").trim();
      finalTranslatedBody =
        candidate && candidate !== originalBody ? candidate : null;
    } catch {
      /* 翻訳失敗時は null */
    }

    const exists = await withPrismaRetry("POST /api/posts thread.findUnique", () =>
      prisma.thread.findUnique({
        where: { id: threadIdNum },
        select: { id: true },
      })
    );
    if (!exists) {
      return NextResponse.json({ error: "thread not found" }, { status: 404, headers: NO_STORE_HEADERS });
    }

    const post = await withPrismaRetry("POST /api/posts post.create", () =>
      prisma.post.create({
        data: {
          threadId: threadIdNum,
          author: authorName,
          body: originalBody,
          translatedBody: finalTranslatedBody,
          ...(tactic !== undefined && { tactic }),
        },
        select: { id: true, author: true, body: true, createdAt: true },
      })
    );

    return NextResponse.json(post, { status: 201, headers: NO_STORE_HEADERS });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "internal error";
    return NextResponse.json({ error: message }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
