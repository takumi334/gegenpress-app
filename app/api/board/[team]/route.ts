import { NextRequest, NextResponse } from "next/server";

// Edge/Serverlessでも動く超シンプルなスタブ
export const runtime = "edge";

export async function GET(
  _req: NextRequest,
  ctx: { params: { team: string } }
) {
  // いまは永続化しないダミー
  return NextResponse.json([], { status: 200 });
}

export async function POST() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}

