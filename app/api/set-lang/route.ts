// app/api/set-lang/route.ts
import { NextResponse } from "next/server";
import { UI_LANGUAGES } from "@/lib/i18n/ui";
export async function POST(req: Request) {
  const { lang } = await req.json();
  const supported = new Set(UI_LANGUAGES.map((x) => x.code));
  if (!lang || !supported.has(lang)) {
    return NextResponse.json({ error: "unsupported lang" }, { status: 400 });
  }
  const res = NextResponse.json({ ok:true });
  res.cookies.set("gp_lang", lang, { path:"/", maxAge: 60*60*24*365 });
  return res;
}
