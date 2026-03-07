// lib/boardApi.ts
import prisma, { withPrismaRetry } from "@/lib/prisma";

export type ThreadDTO = {
  id: number;
  teamId: number;
  title: string;
  body: string;
  createdAt: Date;
  postCount?: number;
  threadType?: string | null;
};

export async function listThreads(teamId: number) {
  const op = "boardApi.listThreads";
  const rows = await withPrismaRetry(op, () => prisma.thread.findMany({
    where: { teamId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      teamId: true,
      title: true,
      body: true,
      createdAt: true,
      threadType: true,
      _count: { select: { posts: true } },
    },
  }));
  return rows.map((r) => ({
    id: r.id,
    teamId: r.teamId,
    title: r.title,
    body: r.body,
    createdAt: r.createdAt,
    postCount: r._count.posts,
    threadType: r.threadType ?? undefined,
  }));
}

export async function getThreadById(threadId: number) {
  return withPrismaRetry("boardApi.getThreadById", () =>
    prisma.thread.findUnique({
      where: { id: threadId },
      select: { id: true, teamId: true, title: true, body: true },
    })
  );
}

export async function createThread(teamId: number, title: string, body: string = "") {
  return withPrismaRetry("boardApi.createThread", () =>
    prisma.thread.create({
      data: { teamId, title, body },
      select: { id: true, teamId: true, title: true, body: true, createdAt: true },
    })
  );
}
