import { NextRequest, NextResponse } from "next/server";
import { checkModeration } from "@/lib/moderation"; // ← 修正

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    const mod = await checkModeration(text);
    if (!mod.ok) {
      return NextResponse.json({ error: "blocked" }, { status: 400 });
    }
    // …本来の処理…
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

