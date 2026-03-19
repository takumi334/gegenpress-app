import { NextRequest, NextResponse } from "next/server";
import { prisma, withPrismaRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const lineupId = Number(id);
  if (!Number.isInteger(lineupId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  try {
    const lineup = await withPrismaRetry("GET /api/lineup/[id]", () =>
      prisma.predictedLineup.findUnique({
        where: { id: lineupId },
        include: {
          players: {
            include: { player: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      })
    );
    if (!lineup) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      id: lineup.id,
      formation: lineup.formation,
      title: lineup.title,
      threadId: lineup.threadId,
      createdAt: lineup.createdAt,
      players: lineup.players.map((lp) => ({
        positionCode: lp.positionCode,
        sortOrder: lp.sortOrder,
        player: {
          id: lp.player.id,
          name: lp.player.name,
          positionCategory: lp.player.positionCategory,
          teamName: lp.player.teamName,
          shirtNumber: lp.player.shirtNumber,
        },
      })),
    });
  } catch (e) {
    console.error("[GET /api/lineup/[id]]", e);
    return NextResponse.json(
      { error: "Failed to load lineup" },
      { status: 500 }
    );
  }
}
