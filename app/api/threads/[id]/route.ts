// app/api/threads/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id?.trim();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const thread = await prisma.thread.findUnique({
    where: { id },
    include: { posts: { orderBy: { createdAt: "asc" } } },
  });

  if (!thread) {
    return NextResponse.json({ error: "thread not found" }, { status: 404 });
  }

  // ★ ここを修正：UIが期待する形式（トップレベルに posts 配列）
  return NextResponse.json({
    id: thread.id,
    title: thread.title,
    teamId: thread.teamId,
    posts: thread.posts.map((p) => ({
      id: p.id,
      authorName: p.authorName,
      body: p.body,
      createdAt: p.createdAt,
    })),
  });
}

