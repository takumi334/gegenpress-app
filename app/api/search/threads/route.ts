import { NextResponse } from "next/server";

export async function GET(req: Request) {
  return NextResponse.json({
    ok: true,
    hit: "app/api/search/threads/route.ts",
    url: req.url,
    time: new Date().toISOString(),
  });
}

