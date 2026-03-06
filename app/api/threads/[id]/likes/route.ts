import { NextRequest, NextResponse } from "next/server";
import prisma, { withPrismaRetry } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const threadId = Number(id);

  if (!Number.isInteger(threadId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  try {
    console.log("[POST /api/threads/[id]/likes] thread.update id=", threadId);
    const updated = await withPrismaRetry("POST /api/threads/[id]/likes thread.update", () => prisma.thread.update({
      where: { id: threadId },
      data: {
        likes: { increment: 1 },
      },
      select: { likes: true },
    }));

    return NextResponse.json({ likes: updated.likes });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "thread not found" }, { status: 404 });
  }
}

