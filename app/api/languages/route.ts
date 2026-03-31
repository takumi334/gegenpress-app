import { NextResponse } from "next/server";
const TRANSLATE_LANGS_CACHE_HEADERS: Record<string, string> = {
  "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
};

export async function GET() {
  try {
    const key = process.env.GOOGLE_TRANSLATE_API_KEY;
    if (!key) {
      return NextResponse.json({ error: "no key" }, { status: 500, headers: TRANSLATE_LANGS_CACHE_HEADERS });
    }

    const url =
      `https://translation.googleapis.com/language/translate/v2/languages?key=${key}&target=en`;

    const r = await fetch(url, { next: { revalidate: 60 * 60 * 24 } });
    if (!r.ok) {
      const text = await r.text();
      return NextResponse.json({ error: text, status: r.status }, { status: 500, headers: TRANSLATE_LANGS_CACHE_HEADERS });
    }

    const data = await r.json();
    const languages = (data?.data?.languages ?? []).sort((a: any, b: any) =>
      String(a.name).localeCompare(String(b.name))
    );

    return NextResponse.json({ languages }, { headers: TRANSLATE_LANGS_CACHE_HEADERS });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500, headers: TRANSLATE_LANGS_CACHE_HEADERS });
  }
}

