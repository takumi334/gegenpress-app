import { NextResponse } from "next/server";
import { getTeamNameFromFD } from "@/lib/team-resolver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 掲示板の team パラメータ（数字 ID）から FD 上のクラブ表示名を返す */
export async function GET(
  _req: Request,
  context: { params: Promise<{ teamId: string }> }
) {
  const { teamId: raw } = await context.params;
  const teamId = raw?.trim() ?? "";
  if (!/^\d+$/.test(teamId)) {
    return NextResponse.json({ error: "invalid teamId" }, { status: 400 });
  }
  const name = await getTeamNameFromFD(teamId);
  return NextResponse.json({ name, teamId: Number(teamId) });
}
