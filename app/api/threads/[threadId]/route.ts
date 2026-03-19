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

  console.log("[GET /api/threads/[threadId]] thread.findUnique threadId=", index);
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
    console.log("[GET /api/threads/[threadId]] thread not found id=", index);
    return NextResponse.json({ error: "thread not found" }, { status: 404 });
  }

  console.log("[GET /api/threads/[threadId]] found thread id=", thread.id, "threadType=", thread.threadType ?? "null");

  return NextResponse.json({
    id: thread.id,
    title: thread.title,
    teamId: thread.teamId,
    body: thread.body,
    translatedBody: thread.translatedBody ?? null,
    threadType: thread.threadType ?? null,
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
