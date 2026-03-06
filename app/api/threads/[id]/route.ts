// app/api/threads/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma, { withPrismaRetry } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await context.params;
  const id = idParam?.trim();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  const index = Number(id);
  if (isNaN(index) || index <= 0) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  const anonId = req.nextUrl.searchParams.get("anonId")?.trim() ?? "";

  console.log("[GET /api/threads/[id]] thread.findUnique id=", index);
  const thread = await withPrismaRetry("GET /api/threads/[id] thread.findUnique", () =>
    prisma.thread.findUnique({
      where: { id: index },
      include: {
        posts: {
          orderBy: { createdAt: "asc" },
          include: {
            _count: { select: { postLikes: true } },
            ...(anonId ? { postLikes: { where: { anonId }, select: { id: true } } } : {}),
          },
        },
      },
    })
  );

  if (!thread) {
    return NextResponse.json({ error: "thread not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: thread.id,
    title: thread.title,
    teamId: thread.teamId,
    body: thread.body,
    posts: thread.posts.map((p) => ({
      id: p.id,
      author: p.author,
      authorName: p.author ?? null,
      body: p.body,
      createdAt: p.createdAt,
      likeCount: p._count.postLikes,
      likedByMe: anonId ? ((p as { postLikes?: { id: number }[] }).postLikes?.length ?? 0) > 0 : false,
    })),
  });
}

