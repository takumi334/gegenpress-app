// lib/boardApi.ts
// 修正:2025/11/13 Prisma Clientをdefault importで取得するように変更
import prisma from "@/lib/prisma";
export type ThreadDTO = {
  id: number;
  teamId: number;
  title: string;
  createdAt: Date;
};

export async function listThreads(teamId: number) {
  return prisma.thread.findMany({
    where: { teamId },
    orderBy: { createdAt: "desc" },
    select: { id: true, teamId: true, title: true, createdAt: true }, // content削除
  });
}

export async function createThread(teamId: number, title: string) {
  return prisma.thread.create({
    data: { teamId, title }, // content削除
    select: { id: true, teamId: true, title: true, createdAt: true }, // content削除
  });
}

