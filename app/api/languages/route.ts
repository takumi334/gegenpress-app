import { NextResponse } from "next/server";

export async function GET() {
  try {
    const key = process.env.GOOGLE_TRANSLATE_API_KEY;
    if (!key) {
      return NextResponse.json({ error: "no key" }, { status: 500 });
    }

    const url =
      `https://translation.googleapis.com/language/translate/v2/languages?key=${key}&target=en`;

    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) {
      const text = await r.text();
      return NextResponse.json({ error: text, status: r.status }, { status: 500 });
    }

    const data = await r.json();
    const languages = (data?.data?.languages ?? []).sort((a: any, b: any) =>
      String(a.name).localeCompare(String(b.name))
    );

    return NextResponse.json({ languages });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}

