import { NextRequest, NextResponse } from "next/server";
import { translateBatch } from "@/lib/translate"; // Google翻訳呼び出し関数
import { kvGet, kvSet } from "@/lib/kv";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const texts = Array.isArray(body.q) ? body.q : [String(body.q || "")];
    const target = body.target as string;

    if (!target) {
      console.error("translate: target missing", body);
      return NextResponse.json({ error: "target required" }, { status: 400 });
    }

    const clean = texts.map((t) => (t || "").trim());
    if (clean.length === 0 || !clean[0]) {
      console.error("translate: empty text");
      return NextResponse.json({ error: "text required" }, { status: 400 });
    }

    const results: string[] = [];
    const miss: { idx: number; text: string }[] = [];

    // キャッシュ確認
    for (let i = 0; i < clean.length; i++) {
      const key = `tr:${target}:${clean[i]}`;
      const hit = kvGet(key);
      if (hit != null) results[i] = hit;
      else miss.push({ idx: i, text: clean[i] });
    }

    // 未キャッシュ分をGoogle翻訳
    if (miss.length > 0) {
      const translated = await translateBatch(miss.map((m) => m.text), target);
      miss.forEach((m, k) => {
        const val = translated[k] ?? m.text;
        results[m.idx] = val;
        kvSet(`tr:${target}:${m.text}`, val);
      });
    }

    return NextResponse.json({ translations: results });
  } catch (err) {
    console.error("translate route error:", err);
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
}

