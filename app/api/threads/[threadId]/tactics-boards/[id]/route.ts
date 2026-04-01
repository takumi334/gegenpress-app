import { NextRequest, NextResponse } from "next/server";
import { prisma, withPrismaRetry } from "@/lib/prisma";
import { isTacticsBoardCreateAllowed } from "@/lib/threadType";
import { NO_STORE_HEADERS } from "@/lib/noStore";
import {
  containsBannedWords,
  containsBannedWordsInFields,
  MODERATION_ERROR_MESSAGE,
} from "@/lib/moderation";

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
    return NextResponse.json({ error: "Invalid params" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  let body: PatchBody = {};
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const thread = await withPrismaRetry("PATCH tactics-boards thread", () =>
    prisma.thread.findUnique({
      where: { id: threadId },
      select: { id: true, threadType: true },
    })
  );
  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404, headers: NO_STORE_HEADERS });
  }
  if (!isTacticsBoardCreateAllowed(thread.threadType)) {
    return NextResponse.json(
      { error: "このスレッドでは戦術ボードの編集はできません。" },
      { status: 403, headers: NO_STORE_HEADERS }
    );
  }

  const existing = await withPrismaRetry("PATCH tactics-boards findFirst", () =>
    prisma.tacticsBoard.findFirst({
      where: { id: boardId, threadId },
      select: { id: true },
    })
  );
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE_HEADERS });
  }

  const title =
    body.title === undefined ? undefined : typeof body.title === "string" ? body.title : null;
  const bodyText =
    body.body === undefined ? undefined : typeof body.body === "string" ? body.body : null;
  const data = body.data !== undefined ? body.data : undefined;

  const checkTitle = title !== undefined ? title ?? "" : "";
  const checkBody = bodyText !== undefined ? bodyText ?? "" : "";
  if (
    (title !== undefined || bodyText !== undefined) &&
    containsBannedWordsInFields([checkTitle, checkBody])
  ) {
    return NextResponse.json({ error: MODERATION_ERROR_MESSAGE }, { status: 400, headers: NO_STORE_HEADERS });
  }
  if (data !== undefined && containsBannedWords(JSON.stringify(data))) {
    return NextResponse.json({ error: MODERATION_ERROR_MESSAGE }, { status: 400, headers: NO_STORE_HEADERS });
  }

  if (process.env.NODE_ENV !== "production" && data !== undefined) {
    console.log("[PATCH tactics-boards] dataPayload", data);
  }

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

  return NextResponse.json(
    {
      id: updated.id,
      threadId: updated.threadId,
      mode: updated.mode,
      title: updated.title ?? "",
      body: updated.body ?? "",
      data: updated.data,
      createdAt: updated.createdAt,
    },
    { headers: NO_STORE_HEADERS }
  );
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ threadId: string; id: string }> }
) {
  const { threadId: threadIdParam, id: idParam } = await context.params;
  const threadId = Number(threadIdParam);
  const boardId = Number(idParam);
  if (!Number.isInteger(threadId) || !Number.isInteger(boardId)) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const board = await withPrismaRetry("GET tactics-boards/[id] findFirst", () =>
    prisma.tacticsBoard.findFirst({
      where: { id: boardId, threadId },
      select: { id: true, threadId: true, mode: true, title: true, body: true, data: true, createdAt: true },
    })
  );
  if (!board) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE_HEADERS });
  }
  return NextResponse.json(
    {
      id: board.id,
      threadId: board.threadId,
      mode: board.mode,
      title: board.title ?? "",
      body: board.body ?? "",
      data: board.data,
      createdAt: board.createdAt,
    },
    { headers: NO_STORE_HEADERS }
  );
}
