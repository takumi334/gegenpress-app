// lib/boardApi.ts
import prisma, { withPrismaRetry } from "@/lib/prisma";

export type TacticsBoardSummary = {
  id: number;
  data: unknown;
  createdAt: Date;
};

export type ThreadDTO = {
  id: number;
  teamId: number;
  title: string;
  body: string;
  translatedBody?: string | null;
  createdAt: Date;
  postCount?: number;
  threadLikeCount?: number;
  threadLikedByMe?: boolean;
  threadType?: string | null;
  tacticsBoards?: TacticsBoardSummary[];
};

export async function listThreads(
  teamId: number,
  options?: { anonId?: string }
) {
  const op = "boardApi.listThreads";
  const anonId = options?.anonId?.trim();
  const rows = await withPrismaRetry(op, () =>
    prisma.thread.findMany({
      where: { teamId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        teamId: true,
        title: true,
        body: true,
        translatedBody: true,
        createdAt: true,
        threadType: true,
        _count: { select: { posts: true, threadLikes: true } },
        ...(anonId
          ? { threadLikes: { where: { anonId }, select: { id: true } } }
          : {}),
        tacticsBoards: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { id: true, data: true, createdAt: true },
        },
      },
    })
  );
  return rows.map((r) => {
    const row = r as typeof r & { threadLikes?: { id: number }[] };
    return {
      id: r.id,
      teamId: r.teamId,
      title: r.title,
      body: r.body,
      translatedBody: r.translatedBody ?? undefined,
      createdAt: r.createdAt,
      postCount: r._count.posts,
      threadLikeCount: r._count.threadLikes,
      threadLikedByMe: anonId ? (row.threadLikes?.length ?? 0) > 0 : undefined,
      threadType: r.threadType ?? undefined,
      tacticsBoards: r.tacticsBoards?.length
        ? r.tacticsBoards.map((tb) => ({
            id: tb.id,
            data: tb.data,
            createdAt: tb.createdAt,
          }))
        : undefined,
    };
  });
}

export async function getThreadById(threadId: number) {
  const row = await withPrismaRetry("boardApi.getThreadById", () =>
    prisma.thread.findUnique({
      where: { id: threadId },
      select: { id: true, teamId: true, title: true, body: true, deletedAt: true },
    })
  );
  if (!row || row.deletedAt) return null;
  return { id: row.id, teamId: row.teamId, title: row.title, body: row.body };
}

export async function createThread(
  teamId: number,
  title: string,
  body: string = "",
  threadType?: string | null,
  matchId?: number | null,
  translatedBody?: string | null
) {
  const safeThreadType = threadType ?? "GENERAL";
  return withPrismaRetry("boardApi.createThread", () =>
    prisma.thread.create({
      data: {
        teamId,
        title,
        body,
        ...(translatedBody != null && translatedBody !== "" && { translatedBody }),
        threadType: safeThreadType,
        matchId: matchId ?? undefined,
      },
      select: { id: true, teamId: true, title: true, body: true, translatedBody: true, createdAt: true, threadType: true },
    })
  );
}

/** lineup-builder 用: スレッドに紐づく戦術ボードを1件作成（data に formation/frames 等を保存） */
export async function createTacticsBoardForThread(
  threadId: number,
  tacticPayload: Record<string, unknown>,
  options?: { mode?: string; body?: string }
) {
  return withPrismaRetry("boardApi.createTacticsBoardForThread", () =>
    prisma.tacticsBoard.create({
      data: {
        threadId,
        mode: options?.mode ?? "GENERAL",
        title: options?.title ?? "",
        body: options?.body ?? "",
        data: tacticPayload as object,
      },
      select: { id: true, threadId: true, mode: true, data: true },
    })
  );
}
