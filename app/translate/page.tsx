
// app/api/translate/route.ts
"use client";
import { NextRequest, NextResponse } from "next/server";
import { translateBatch } from "@/lib/translate"; // ← ここが通るようになる

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    const body = raw ? JSON.parse(raw) : {};

    const items: string[] = Array.isArray(body?.items) ? body.items : [];
    const targetLang: string = body?.targetLang || "ja";

    if (items.length === 0) {
      return NextResponse.json({ translated: [], note: "no items" });
    }

    const translated = await translateBatch(
      items.map((t) => ({ text: t, to: targetLang }))
    );

    return NextResponse.json({ translated });
  } catch (err: any) {
    console.error("translate route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

