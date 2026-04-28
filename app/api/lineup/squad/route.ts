import { NextRequest, NextResponse } from "next/server";
import { getDbCacheState, setDbCache } from "@/lib/server/footballDataDbCache";

type FdSquadMember = {
  id?: number;
  name?: string;
  position?: string | null;
};

type FdTeamResponse = {
  squad?: FdSquadMember[];
};

type SquadCategory = "GK" | "DF" | "MF" | "FW" | "OTHER";

type SquadPayload = {
  teamId: number;
  grouped: Record<SquadCategory, string[]>;
};

const FD_BASE = (process.env.FD_BASE ?? "https://api.football-data.org/v4").replace(/\/$/, "");
const FD_KEY = process.env.FOOTBALL_DATA_API_KEY ?? "";
const TTL_SECONDS = 12 * 60 * 60;
const FD_TIMEOUT_MS = 10_000;

const EMPTY_GROUPED: Record<SquadCategory, string[]> = {
  GK: [],
  DF: [],
  MF: [],
  FW: [],
  OTHER: [],
};

function classifyPosition(position: string | null | undefined): SquadCategory {
  const p = (position ?? "").toLowerCase();
  if (p.includes("goalkeeper")) return "GK";
  if (p.includes("defender") || p.includes("defence")) return "DF";
  if (p.includes("midfielder") || p.includes("midfield")) return "MF";
  if (p.includes("attacker") || p.includes("forward") || p.includes("offence")) return "FW";
  return "OTHER";
}

function normalizeGrouped(squad: FdSquadMember[] | undefined): Record<SquadCategory, string[]> {
  const grouped: Record<SquadCategory, string[]> = {
    GK: [],
    DF: [],
    MF: [],
    FW: [],
    OTHER: [],
  };
  for (const m of squad ?? []) {
    const name = (m?.name ?? "").trim();
    if (!name) continue;
    grouped[classifyPosition(m?.position)].push(name);
  }
  return grouped;
}

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
    return NextResponse.json({
      ...cached.payload,
      meta: {
        source: cached.source,
        stale: !cached.isFresh,
        message: cachedHasSquad ? null : "選手候補はありません。手入力できます。",
      },
    });
  }

  try {
    if (!FD_KEY) throw new Error("missing FOOTBALL_DATA_API_KEY");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FD_TIMEOUT_MS);
    const res = await fetch(`${FD_BASE}/teams/${teamId}`, {
      headers: { "X-Auth-Token": FD_KEY },
      next: { revalidate: TTL_SECONDS },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));
    if (!res.ok) {
      return NextResponse.json(
        {
          teamId,
          grouped: EMPTY_GROUPED,
          meta: { source: "none", stale: false, message: "選手候補はありません。手入力できます。" },
        },
        { status: 200 }
      );
    }
    const data = (await res.json()) as FdTeamResponse;
    const rawSquad = Array.isArray(data?.squad) ? data.squad : [];
    const payload: SquadPayload = {
      teamId,
      grouped: normalizeGrouped(rawSquad),
    };
    await setDbCache(cacheKey, "squad", payload, TTL_SECONDS).catch(() => undefined);
    const payloadHasSquad = hasSquad(payload.grouped);
    return NextResponse.json({
      ...payload,
      meta: {
        source: "api",
        stale: false,
        message: payloadHasSquad ? null : "選手候補はありません。手入力できます。",
      },
    });
  } catch {
    return NextResponse.json({
      teamId,
      grouped: EMPTY_GROUPED,
      meta: { source: "none", stale: false, message: "選手候補はありません。手入力できます。" },
    });
  }
}
