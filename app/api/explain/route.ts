import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { text, lang = "en-US" } = await req.json();
  if (!text) return NextResponse.json({ error: "No text" }, { status: 400 });

  const r = await fetch("https://api.languagetool.org/v2/check", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ text, language: lang, level: "picky" }),
  });

  if (!r.ok) return NextResponse.json({ error: await r.text() }, { status: 500 });

  const data = await r.json();
  const explanations = (data.matches || []).map((m: any) => ({
    offset: m.offset,
    length: m.length,
    message: m.message,
    rule: m.rule?.id,
    replacements: (m.replacements || []).slice(0, 3).map((x: any) => x.value),
    jaNote: `「${m.message}」→ 提案: ${(m.replacements || []).slice(0,3).map((x:any)=>x.value).join(", ")}`,
  }));

  return NextResponse.json({ explanations });
}


