import { NextResponse } from "next/server";
import { prisma, withPrismaRetry } from "@/lib/prisma";
import { MOCK_PLAYERS } from "@/lib/lineupPlayers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    let list = await withPrismaRetry("GET /api/lineup/players", () =>
      prisma.player.findMany({
        orderBy: [{ positionCategory: "asc" }, { id: "asc" }],
      })
    );
    if (list.length === 0 && MOCK_PLAYERS.length > 0) {
      await withPrismaRetry("GET /api/lineup/players seed", async () => {
        for (const p of MOCK_PLAYERS) {
          await prisma.$executeRaw`
            INSERT INTO players (id, name, "positionCategory", "teamName", "shirtNumber")
            VALUES (${p.id}, ${p.name}, ${p.positionCategory}, ${p.teamName ?? null}, ${p.shirtNumber ?? null})
            ON CONFLICT (id) DO NOTHING
          `;
        }
        await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('players', 'id'), (SELECT COALESCE(MAX(id), 1) FROM players))`;
      });
      list = await prisma.player.findMany({
        orderBy: [{ positionCategory: "asc" }, { id: "asc" }],
      });
    }
    if (list.length > 0) {
      return NextResponse.json(
        list.map((p) => ({
          id: p.id,
          name: p.name,
          positionCategory: p.positionCategory,
          teamName: p.teamName,
          shirtNumber: p.shirtNumber,
        }))
      );
    }
    return NextResponse.json(MOCK_PLAYERS);
  } catch (e) {
    console.error("[GET /api/lineup/players]", e);
    return NextResponse.json(MOCK_PLAYERS);
  }
}
