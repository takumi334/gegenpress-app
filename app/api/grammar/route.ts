import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { text, target, native } = await req.json();
    if (!text || !target || !native) {
      return NextResponse.json(
        { error: "text, target and native required" },
        { status: 400 }
      );
    }

    // 🧠 native（母国語）で文法を説明
    const prompt = `
You are a friendly and patient language teacher.
Please explain the grammar of the following ${target} sentence in the learner's native language (${native}).
Write your explanation entirely in ${native}.
Use short, clear sentences — about 3 simple bullet points — so even beginners can understand.
Sentence: ${text}
`;

    const apiKey = process.env.OPENAI_API_KEY!;
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "OpenAI error");

    const explanation =
      data.choices?.[0]?.message?.content?.trim() ??
      "Aucune explication trouvée.";

    return NextResponse.json({ explanation });
  } catch (err) {
    console.error("grammar route error:", err);
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
}

