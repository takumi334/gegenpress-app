import { NextRequest, NextResponse } from "next/server";
import prisma, { withPrismaRetry } from "@/lib/prisma";
import { requireAdminApiKey } from "@/lib/requireAdminApiKey";
const BOARD_REPLY_LOOKUP_CACHE_HEADERS: Record<string, string> = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
};

export const runtime = "nodejs";

/** 通報ハイライト用: 返信 ID から threadId / teamId を解決（公開・読み取りのみ） */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ postid: string }> }
) {
  const { postid } = await context.params;
  const postId = Number(postid);
  if (!Number.isFinite(postId)) {
    return NextResponse.json({ error: "invalid postId" }, { status: 400, headers: BOARD_REPLY_LOOKUP_CACHE_HEADERS });
  }

  const post = await withPrismaRetry("GET /api/posts/[postid] locate", () =>
    prisma.post.findUnique({
      where: { id: postId },
      select: {
        threadId: true,
        thread: { select: { teamId: true, deletedAt: true } },
      },
    })
  );

  if (!post || post.thread.deletedAt) {
    return NextResponse.json({ error: "not found" }, { status: 404, headers: BOARD_REPLY_LOOKUP_CACHE_HEADERS });
  }

  return NextResponse.json({
    threadId: post.threadId,
    teamId: post.thread.teamId,
  }, { headers: BOARD_REPLY_LOOKUP_CACHE_HEADERS });
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ postid: string }> }
) {
  try {
    requireAdminApiKey(req);
  } catch {
    return NextResponse.json(
      { ok: false, message: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const { postid } = await context.params;
  const postId = Number(postid);
  if (!Number.isFinite(postId)) {
    return NextResponse.json(
      { ok: false, message: "invalid postId" },
      { status: 400 }
    );
  }

  await withPrismaRetry("DELETE /api/posts/[postid] post.delete", () =>
    prisma.post.delete({ where: { id: postId } })
  );
  return NextResponse.json({ ok: true });
}

