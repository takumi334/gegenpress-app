import { NextRequest, NextResponse } from "next/server";
import { prisma, withPrismaRetry } from "@/lib/prisma";
import {
  isTacticsBoardCreateAllowed,
  threadTypeToTacticsBoardMode,
} from "@/lib/threadType";
import {
  containsBannedWords,
  containsBannedWordsInFields,
  MODERATION_ERROR_MESSAGE,
} from "@/lib/moderation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PostBody = {
  title?: string | null;
  body?: string | null;
  data?: unknown;
};

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ threadId: string }> }
) {
  const { threadId: threadIdParam } = await context.params;
  const threadId = Number(threadIdParam);
  if (!Number.isInteger(threadId) || threadId <= 0) {
    return NextResponse.json({ error: "Invalid threadId" }, { status: 400 });
  }

  const thread = await withPrismaRetry("POST tactics-boards thread.findUnique", () =>
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
      { error: "このスレッドでは戦術ボードの新規投稿はできません。" },
      { status: 403 }
    );
  }

  const mode = threadTypeToTacticsBoardMode(thread.threadType);
  if (!mode) {
    return NextResponse.json(
      { error: "Invalid thread type for tactics board" },
      { status: 400 }
    );
  }

  let body: PostBody = {};
  try {
    body = (await req.json()) as PostBody;
  } catch {
    // empty body is ok
  }
  const title = typeof body.title === "string" ? body.title : null;
  const data = body.data != null ? body.data : null;
  const bodyText = typeof body.body === "string" ? body.body : null;

  const titleS = title ?? "";
  const bodyS = bodyText ?? "";
  if (
    containsBannedWordsInFields([titleS, bodyS]) ||
    (data != null && containsBannedWords(JSON.stringify(data)))
  ) {
    return NextResponse.json({ error: MODERATION_ERROR_MESSAGE }, { status: 400 });
  }

  const board = await withPrismaRetry("POST tactics-boards create", () =>
    prisma.tacticsBoard.create({
      data: {
        threadId,
        mode,
        title: title ?? "",
        body: bodyText ?? "",
        data: data as object | null,
      },
    })
  );

  return NextResponse.json({
    id: board.id,
    threadId: board.threadId,
    mode: board.mode,
    title: board.title,
    body: board.body,
    createdAt: board.createdAt,
  });
}
