// app/api/threads/[id]/posts/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // または { prisma } from "@/lib/db" に合わせて統一

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

// ----------------------------
// POST /api/threads/[id]/posts
// body: { authorName?: string, body: string }
// ----------------------------
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const resolved = await params;
    const id = resolved?.id?.trim();
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // JSONパース（例外処理付き）
    let payload: any;
    try {
      payload = await req.json();
      console.log(" payload:", payload);
    } catch {
      return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
    }

    const authorName =
      (payload?.authorName ?? "").toString().trim().slice(0, 40) || "匿名";
    const body =
      (payload?.body ?? "").toString().trim().slice(0, 5000);

    if (!body) {
      return NextResponse.json({ error: "本文が空です" }, { status: 400 });
    }

    const idNum = Number(id);
    if (isNaN(idNum) || idNum <= 0) {
      return NextResponse.json({ error: "invalid id" }, { status: 400 });
    }

    // スレッドが存在するかチェック
    const exists = await prisma.thread.findUnique({
      where: { id: idNum },
      select: { id: true },
    });

    if (!exists) {
      return NextResponse.json(
        { error: "thread not found" },
        { status: 404 }
      );
    }

    // 投稿を保存
    const post = await prisma.post.create({
      data: {
        threadId: idNum,
        author: authorName,
        body,
      },
      select: { id: true, createdAt: true },
    });

    console.log("✅ 新規コメント保存:", post);

    return NextResponse.json({ id: post.id }, { status: 201 });
  } catch (e: any) {
    console.error("❌ 投稿保存エラー:", e);
    return NextResponse.json(
      { error: e?.message ?? "internal error" },
      { status: 500 }
    );
  }
}

