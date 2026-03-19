import { NextRequest, NextResponse } from "next/server";
import { prisma, withPrismaRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const list = await withPrismaRetry("GET /api/lineup list", () =>
      prisma.predictedLineup.findMany({
        take: 50,
        orderBy: { createdAt: "desc" },
        select: { id: true, formation: true, title: true, createdAt: true },
      })
    );
    return NextResponse.json(list);
  } catch (e) {
    console.error("[GET /api/lineup]", e);
    return NextResponse.json({ error: "Failed to list lineups" }, { status: 500 });
  }
}

type SaveBody = {
  formation: string;
  title?: string | null;
  threadId?: number | null;
  assignments: Record<string, number>;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SaveBody;
    const { formation, title, threadId, assignments } = body;
    if (!formation || typeof formation !== "string") {
      return NextResponse.json({ error: "formation required" }, { status: 400 });
    }
    const entries = Object.entries(assignments ?? {}).filter(
      ([, playerId]) => typeof playerId === "number"
    );

    const lineup = await withPrismaRetry("POST /api/lineup create lineup", () =>
      prisma.predictedLineup.create({
        data: {
          userId: null,
          threadId: threadId ?? null,
          formation,
          title: title ?? null,
        },
      })
    );

    await withPrismaRetry("POST /api/lineup create players", async () => {
      await prisma.predictedLineupPlayer.createMany({
        data: entries.map(([positionCode], i) => ({
          lineupId: lineup.id,
          playerId: entries[i][1],
          positionCode,
          sortOrder: i,
        })),
      });
    });

    return NextResponse.json({
      id: lineup.id,
      formation: lineup.formation,
      title: lineup.title,
      threadId: lineup.threadId,
    });
  } catch (e) {
    console.error("[POST /api/lineup]", e);
    return NextResponse.json(
      { error: "Failed to save lineup" },
      { status: 500 }
    );
  }
}
