import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type Params = { params: { id: string } };

export async function POST(req: NextRequest, { params }: Params) {
  const threadId = Number(params.id);

  if (!Number.isInteger(threadId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  try {
    const updated = await prisma.thread.update({
      where: { id: threadId },
      data: {
        likes: { increment: 1 },
      },
      select: { likes: true },
    });

    return NextResponse.json({ likes: updated.likes });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "thread not found" }, { status: 404 });
  }
}

