import { NextRequest, NextResponse } from "next/server";
import prisma, { withPrismaRetry } from "@/lib/prisma";

export const runtime = "nodejs";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ postid: string }> }
) {
  // ✅ 管理者キー確認
  const adminKey = req.headers.get("x-admin-key");
  if (!adminKey || adminKey !== process.env.ADMIN_DELETE_KEY) {
    return NextResponse.json(
      { ok: false, message: "forbidden" },
      { status: 403 }
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

  console.log("[DELETE /api/posts/[postid]] post.delete id=", postId);
  await withPrismaRetry("DELETE /api/posts/[postid] post.delete", () =>
    prisma.post.delete({ where: { id: postId } })
  );
  return NextResponse.json({ ok: true });
}

