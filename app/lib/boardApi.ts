// lib/boardApi.ts
// 修正:2025/11/13 Prisma Clientをdefault importで取得するように変更
import prisma from "@/lib/prisma";
export type ThreadDTO = {
  id: number;
  teamId: number;
  title: string;
  body: string;
  createdAt: Date;
};

export async function listThreads(teamId: number) {
  return prisma.thread.findMany({
    where: { teamId },
    orderBy: { createdAt: "desc" },
    select: { id: true, teamId: true, title: true, body: true, createdAt: true },
  });
}

export async function createThread(teamId: number, title: string, body: string = "") {
  return prisma.thread.create({
    data: { teamId, title, body },
    select: { id: true, teamId: true, title: true, body: true, createdAt: true },
  });
}
