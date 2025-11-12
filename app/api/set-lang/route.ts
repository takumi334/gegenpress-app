// app/api/set-lang/route.ts
import { NextResponse } from "next/server";
export async function POST(req: Request) {
  const { lang } = await req.json();
  if (!lang) return NextResponse.json({ error:"lang required" }, { status:400 });
  const res = NextResponse.json({ ok:true });
  res.cookies.set("gp_lang", lang, { path:"/", maxAge: 60*60*24*365 });
  return res;
}
