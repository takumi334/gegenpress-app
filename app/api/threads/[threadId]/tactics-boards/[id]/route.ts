import { NextRequest, NextResponse } from "next/server";
import { prisma, withPrismaRetry } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ threadId: string; id: string }> }
) {
  const { threadId: threadIdParam, id: idParam } = await context.params;
  const threadId = Number(threadIdParam);
  const boardId = Number(idParam);
  if (!Number.isInteger(threadId) || !Number.isInteger(boardId)) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const board = await withPrismaRetry("GET tactics-boards/[id] findFirst", () =>
    prisma.tacticsBoard.findFirst({
      where: { id: boardId, threadId },
      select: { id: true, threadId: true, mode: true, title: true, body: true, data: true, createdAt: true },
    })
  );
  if (!board) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    id: board.id,
    threadId: board.threadId,
    mode: board.mode,
    title: board.title ?? "",
    body: board.body ?? "",
    data: board.data,
    createdAt: board.createdAt,
  });
}
