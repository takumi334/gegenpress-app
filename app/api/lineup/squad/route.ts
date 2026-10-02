import { NextRequest, NextResponse } from "next/server";
import { getDbCacheState } from "@/lib/server/footballDataDbCache";

type SquadCategory = "GK" | "DF" | "MF" | "FW" | "OTHER";

type SquadPayload = {
  teamId: number;
  grouped: Record<SquadCategory, string[]>;
};

const EMPTY_GROUPED: Record<SquadCategory, string[]> = {
  GK: [],
  DF: [],
  MF: [],
  FW: [],
  OTHER: [],
};

function hasSquad(grouped: Record<SquadCategory, string[]>): boolean {
  return (
    grouped.GK.length +
      grouped.DF.length +
      grouped.MF.length +
      grouped.FW.length +
      grouped.OTHER.length >
    0
  );
}

function groupedCounts(grouped: Record<SquadCategory, string[]>) {
  return {
    GK: grouped.GK.length,
    DF: grouped.DF.length,
    MF: grouped.MF.length,
    FW: grouped.FW.length,
    OTHER: grouped.OTHER.length,
  };
}

export async function GET(req: NextRequest) {
  const teamIdRaw = req.nextUrl.searchParams.get("teamId") ?? "";
  const teamId = Number(teamIdRaw);
  if (!Number.isInteger(teamId) || teamId <= 0) {
    return NextResponse.json(
      {
        teamId: 0,
        grouped: EMPTY_GROUPED,
        meta: { source: "none", stale: false, message: "teamId is required" },
      },
      { status: 400 }
    );
  }

  const cacheKey = `squad:${teamId}`;
  const cached = await getDbCacheState<SquadPayload>(cacheKey).catch(() => null);
  if (cached) {
    const cachedHasSquad = hasSquad(cached.payload.grouped);
    if (process.env.NODE_ENV !== "production") {
      console.log("[lineup/squad] cache hit", {
        teamId,
        source: cached.source,
        stale: !cached.isFresh,
        counts: groupedCounts(cached.payload.grouped),
      });
    }
    return NextResponse.json({
      ...cached.payload,
      meta: {
        source: cached.source,
        stale: !cached.isFresh,
        message: cachedHasSquad ? null : "選手候補なし。手入力できます。",
      },
    });
  }

  // Cache-only read: the lineup builder never refreshes upstream data as a
  // side effect of a visitor opening the page.
  return NextResponse.json({
    teamId,
    grouped: EMPTY_GROUPED,
    meta: {
      source: "none",
      stale: false,
      message: "選手候補は未取得です。手入力できます。",
    },
  });
}
