import { NextResponse } from "next/server";

export async function GET() {
  // Deliberately disabled: a public/debug endpoint must never spend the shared
  // football-data.org quota. Use the protected cache refresh job instead.
  return NextResponse.json({ error: "not_found" }, { status: 404 });
}
