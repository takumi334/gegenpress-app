import { NextRequest, NextResponse } from "next/server";
import prisma, { withPrismaRetry } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ threadId: string }> }
) {
  const { threadId: threadIdParam } = await context.params;
  const threadId = Number(threadIdParam);

  if (!Number.isInteger(threadId) || threadId <= 0) {
    return NextResponse.json({ error: "invalid threadId" }, { status: 400 });
  }

  let body: { anonId?: string } = {};
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    // no body
  }
  const anonId = (body.anonId ?? req.headers.get("x-anon-id") ?? "").trim();
  if (!anonId) {
    return NextResponse.json(
      { error: "anonId required (body.anonId or header x-anon-id)" },
      { status: 400 }
    );
  }

  try {
    const thread = await withPrismaRetry(
      "POST /api/threads/[threadId]/likes thread.findUnique",
      () =>
        prisma.thread.findUnique({
          where: { id: threadId },
          include: {
            threadLikes: { where: { anonId } },
            _count: { select: { threadLikes: true } },
          },
        })
    );
    if (!thread) {
      return NextResponse.json({ error: "thread not found" }, { status: 404 });
    }

    const existing = thread.threadLikes[0];
    if (existing) {
      await withPrismaRetry(
        "POST /api/threads/[threadId]/likes threadLike.delete",
        () => prisma.threadLike.delete({ where: { id: existing.id } })
      );
      const newCount = thread._count.threadLikes - 1;
      return NextResponse.json({
        likeCount: Math.max(0, newCount),
        likedByMe: false,
      });
    }

    await withPrismaRetry(
      "POST /api/threads/[threadId]/likes threadLike.create",
      () =>
        prisma.threadLike.create({
          data: { threadId, anonId },
        })
    );
    const newCount = thread._count.threadLikes + 1;
    return NextResponse.json({
      likeCount: newCount,
      likedByMe: true,
    });
  } catch (e) {
    console.error("[POST /api/threads/[threadId]/likes]", e);
    return NextResponse.json(
      { error: "failed to toggle like" },
      { status: 500 }
    );
  }
}
