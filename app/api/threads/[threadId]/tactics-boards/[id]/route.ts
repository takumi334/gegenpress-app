import { NextRequest, NextResponse } from "next/server";
import { prisma, withPrismaRetry } from "@/lib/prisma";
import { isTacticsBoardCreateAllowed } from "@/lib/threadType";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PatchBody = {
  title?: string | null;
  body?: string | null;
  data?: unknown;
};

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ threadId: string; id: string }> }
) {
  const { threadId: threadIdParam, id: idParam } = await context.params;
  const threadId = Number(threadIdParam);
  const boardId = Number(idParam);
  if (!Number.isInteger(threadId) || !Number.isInteger(boardId)) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  let body: PatchBody = {};
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const thread = await withPrismaRetry("PATCH tactics-boards thread", () =>
    prisma.thread.findUnique({
      where: { id: threadId },
      select: { id: true, threadType: true },
    })
  );
  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }
  if (!isTacticsBoardCreateAllowed(thread.threadType)) {
    return NextResponse.json(
      { error: "このスレッドでは戦術ボードの編集はできません。" },
      { status: 403 }
    );
  }

  const existing = await withPrismaRetry("PATCH tactics-boards findFirst", () =>
    prisma.tacticsBoard.findFirst({
      where: { id: boardId, threadId },
      select: { id: true },
    })
  );
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const title =
    body.title === undefined ? undefined : typeof body.title === "string" ? body.title : null;
  const bodyText =
    body.body === undefined ? undefined : typeof body.body === "string" ? body.body : null;
  const data = body.data !== undefined ? body.data : undefined;

  const updated = await withPrismaRetry("PATCH tactics-boards update", () =>
    prisma.tacticsBoard.update({
      where: { id: boardId },
      data: {
        ...(title !== undefined ? { title: title ?? "" } : {}),
        ...(bodyText !== undefined ? { body: bodyText ?? "" } : {}),
        ...(data !== undefined ? { data: data as object | null } : {}),
      },
      select: { id: true, threadId: true, mode: true, title: true, body: true, data: true, createdAt: true },
    })
  );

  return NextResponse.json({
    id: updated.id,
    threadId: updated.threadId,
    mode: updated.mode,
    title: updated.title ?? "",
    body: updated.body ?? "",
    data: updated.data,
    createdAt: updated.createdAt,
  });
}

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
