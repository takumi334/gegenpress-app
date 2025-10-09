import { NextRequest, NextResponse } from "next/server";
import { checkModeration } from "@/app/lib/moderation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = String(body?.text ?? "");
    const m = checkModeration(text);
    if (!m.ok) {
      // クライアントと同じメッセージ基準で拒否
      return new NextResponse("[投稿できません]", { status: 400 });
    }

    // TODO: ここで DB 保存（team/type/videoUrl/translation など）
    // await db.posts.create(...);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return new NextResponse("error", { status: 500 });
  }
}

