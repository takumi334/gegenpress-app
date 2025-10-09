import { NextRequest, NextResponse } from "next/server";

function simpleExplain(text: string): string {
  const t = text.slice(0, 1500);
  const tips: string[] = [];

  if (/\bI goes\b/i.test(t)) tips.push("主語と動詞の一致：I の後は go。");
  if (/\ba [aeiou]/i.test(t)) tips.push("冠詞 a/an：母音で始まる語は an。");
  if (/\ba [a-z]+s\b/i.test(t)) tips.push("複数名詞に a は不可。");
  if (/\bin \d{1,2}(am|pm)\b/i.test(t)) tips.push("時刻は at を用いる（例：at 7 pm）。");

  if (!tips.length) tips.push("大きな文法問題は見つかりません。自然な表現です。");
  return tips.join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string")
      return NextResponse.json({ explanation: "" });
    return NextResponse.json({ explanation: simpleExplain(text) });
  } catch {
    return NextResponse.json({ explanation: "" });
  }
}

