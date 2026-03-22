import { MetadataRoute } from "next";
import { LEAGUES } from "@/lib/leagues";
import prisma from "@/lib/prisma";
import { getSiteUrl } from "@/lib/publicSiteUrl";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const entries: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/leagues`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    ...LEAGUES.map((l) => ({
      url: `${base}/leagues/${l.id}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];

  try {
    const teamIds = await prisma.thread.findMany({
      where: { deletedAt: null },
      select: { teamId: true },
      distinct: ["teamId"],
    });
    const seen = new Set<number>();
    for (const { teamId } of teamIds) {
      if (seen.has(teamId)) continue;
      seen.add(teamId);
      entries.push({
        url: `${base}/board/${teamId}`,
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 0.7,
      });
    }

    const threads = await prisma.thread.findMany({
      where: { deletedAt: null },
      select: { id: true, teamId: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 2000,
    });
    for (const t of threads) {
      entries.push({
        url: `${base}/board/${t.teamId}/thread/${t.id}`,
        lastModified: t.createdAt,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  } catch (e) {
    console.error("[sitemap] prisma error", e);
  }

  return entries;
}
