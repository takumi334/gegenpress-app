import { NextRequest, NextResponse } from "next/server";
import prisma, { withPrismaRetry } from "@/lib/prisma";

export const runtime = "nodejs";

type Params = { params: Promise<{ commentId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { commentId: commentIdStr } = await params;
  const commentId = Number(commentIdStr);
  if (!Number.isInteger(commentId) || commentId <= 0) {
    return NextResponse.json({ error: "invalid comment id" }, { status: 400 });
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
    const post = await withPrismaRetry(
      "POST /api/comments/[commentId]/like post.findUnique",
      () =>
        prisma.post.findUnique({
          where: { id: commentId },
          include: {
            postLikes: { where: { anonId } },
            _count: { select: { postLikes: true } },
          },
        })
    );
    if (!post) {
      return NextResponse.json({ error: "comment not found" }, { status: 404 });
    }

    const existing = post.postLikes[0];
    if (existing) {
      await withPrismaRetry(
        "POST /api/comments/[commentId]/like postLike.delete",
        () => prisma.postLike.delete({ where: { id: existing.id } })
      );
      const newCount = post._count.postLikes - 1;
      return NextResponse.json({
        likeCount: newCount,
        likedByMe: false,
      });
    }

    await withPrismaRetry(
      "POST /api/comments/[commentId]/like postLike.create",
      () =>
        prisma.postLike.create({
          data: { postId: commentId, anonId },
        })
    );
    const newCount = post._count.postLikes + 1;
    return NextResponse.json({
      likeCount: newCount,
      likedByMe: true,
    });
  } catch (e) {
    console.error("[POST /api/comments/[commentId]/like]", e);
    return NextResponse.json(
      { error: "failed to toggle like" },
      { status: 500 }
    );
  }
}
