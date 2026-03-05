import { NextRequest } from "next/server";
import prisma, { withPrismaRetry } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const teamIdParam = searchParams.get("teamId");

  if (!q) {
    return Response.json({ items: [] });
  }

  const teamId = teamIdParam ? Number(teamIdParam) : undefined;
  if (teamIdParam != null && !Number.isInteger(teamId)) {
    return Response.json({ items: [] });
  }

  console.log("[GET /api/search] thread.findMany q=", q.slice(0, 30));
  const items = await withPrismaRetry("GET /api/search thread.findMany", () => prisma.thread.findMany({
    where: {
      ...(teamId != null ? { teamId } : {}),
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { body: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, teamId: true, title: true, body: true, createdAt: true },
  }));

  return Response.json({ items });
}
