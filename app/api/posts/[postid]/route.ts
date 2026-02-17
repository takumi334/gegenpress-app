import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function DELETE(
  req: Request,
  { params }: { params: { postId: string } }
) {
  // ✅ 管理者キー確認
  const adminKey = req.headers.get("x-admin-key");
  if (!adminKey || adminKey !== process.env.ADMIN_DELETE_KEY) {
    return NextResponse.json(
      { ok: false, message: "forbidden" },
      { status: 403 }
    );
  }

  const postId = Number(params.postId);
  if (!Number.isFinite(postId)) {
    return NextResponse.json(
      { ok: false, message: "invalid postId" },
      { status: 400 }
    );
  }

  await prisma.post.delete({ where: { id: postId } });
  return NextResponse.json({ ok: true });
}

