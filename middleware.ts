// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  // 既に region Cookie があるならスキップ
  const has = req.cookies.get("region")?.value;
  if (!has) {
    const q = url.searchParams.get("country");
    const headerCountry =
      req.headers.get("x-vercel-ip-country") ||
      req.headers.get("cf-ipcountry") ||
      undefined;

    const country = (q || headerCountry || "JP").toUpperCase(); // fallback JP
    const res = NextResponse.next();
    res.cookies.set("region", country, { path: "/", maxAge: 60 * 60 * 24 * 30 });
    return res;
  }
  return NextResponse.next();
}

