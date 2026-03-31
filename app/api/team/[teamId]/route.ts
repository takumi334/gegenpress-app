import { NextResponse } from "next/server";
import { getTeamNameFromFD } from "@/lib/team-resolver";
const BOARD_TEAM_CACHE_HEADERS: Record<string, string> = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
};

export const runtime = "nodejs";

/** 掲示板の team パラメータ（数字 ID）から FD 上のクラブ表示名を返す */
export async function GET(
  _req: Request,
  context: { params: Promise<{ teamId: string }> }
) {
  const { teamId: raw } = await context.params;
  const teamId = raw?.trim() ?? "";
  if (!/^\d+$/.test(teamId)) {
    return NextResponse.json({ error: "invalid teamId" }, { status: 400, headers: BOARD_TEAM_CACHE_HEADERS });
  }
  const name = await getTeamNameFromFD(teamId);
  return NextResponse.json({ name, teamId: Number(teamId) }, { headers: BOARD_TEAM_CACHE_HEADERS });
}
