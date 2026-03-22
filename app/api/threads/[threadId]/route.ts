// app/api/threads/[threadId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma, { withPrismaRetry } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, context: { params: Promise<{ threadId: string }> }) {
  const { threadId: threadIdParam } = await context.params;
  const threadId = threadIdParam?.trim();
  if (!threadId) {
    return NextResponse.json({ error: "threadId is required" }, { status: 400 });
  }
  const index = Number(threadId);
  if (isNaN(index) || index <= 0) {
    return NextResponse.json({ error: "invalid threadId" }, { status: 400 });
  }
  const anonId = req.nextUrl.searchParams.get("anonId")?.trim() ?? "";

  const thread = await withPrismaRetry("GET /api/threads/[threadId] thread.findUnique", () =>
    prisma.thread.findUnique({
      where: { id: index },
      select: {
        id: true,
        title: true,
        teamId: true,
        body: true,
        translatedBody: true,
        threadType: true,
        deletedAt: true,
        _count: { select: { threadLikes: true } },
        ...(anonId
          ? { threadLikes: { where: { anonId }, select: { id: true } } }
          : {}),
        posts: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            author: true,
            body: true,
            translatedBody: true,
            tactic: true,
            createdAt: true,
            _count: { select: { postLikes: true } },
            ...(anonId ? { postLikes: { where: { anonId }, select: { id: true } } } : {}),
          },
        },
        tacticsBoards: {
          orderBy: { createdAt: "desc" },
          select: { id: true, mode: true, title: true, body: true, data: true, createdAt: true },
        },
      },
    })
  );

  if (!thread) {
    return NextResponse.json({ error: "thread not found" }, { status: 404 });
  }

  if (thread.deletedAt) {
    return NextResponse.json({ error: "thread not found" }, { status: 404 });
  }

  const threadRow = thread as typeof thread & {
    _count?: { threadLikes: number };
    threadLikes?: { id: number }[];
  };

  return NextResponse.json({
    id: thread.id,
    title: thread.title,
    teamId: thread.teamId,
    body: thread.body,
    translatedBody: thread.translatedBody ?? null,
    threadType: thread.threadType ?? null,
    threadLikeCount: threadRow._count?.threadLikes ?? 0,
    threadLikedByMe: anonId
      ? ((threadRow.threadLikes?.length ?? 0) > 0)
      : false,
    posts: thread.posts.map((p) => ({
      id: p.id,
      author: p.author,
      authorName: p.author ?? null,
      body: p.body,
      translatedBody: (p as { translatedBody?: string | null }).translatedBody ?? null,
      tactic: p.tactic ?? null,
      createdAt: p.createdAt,
      likeCount: p._count.postLikes,
      likedByMe: anonId ? ((p as { postLikes?: { id: number }[] }).postLikes?.length ?? 0) > 0 : false,
    })),
    tacticsBoards: thread.tacticsBoards.map((tb) => ({
      id: tb.id,
      mode: tb.mode,
      title: tb.title ?? "",
      body: tb.body ?? "",
      data: tb.data,
      createdAt: tb.createdAt,
    })),
  });
}
