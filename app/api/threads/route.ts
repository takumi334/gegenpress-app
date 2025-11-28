// app/api/threads/route.ts
import { NextRequest } from "next/server";
import { listThreads, createThread } from "@/lib/boardApi";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const teamIdStr = searchParams.get("teamId");
    if (!teamIdStr) {
      return new Response(JSON.stringify({ error: "teamId required" }), { status: 400 });
    }
    const teamId = Number(teamIdStr);
    if (!Number.isInteger(teamId)) {
      return new Response(JSON.stringify({ error: "teamId must be integer" }), { status: 400 });
    }

    const threads = await listThreads(teamId);
    // フロントが配列/ items 両方に対応できるように配列を直接返す
    return Response.json(threads, { status: 200 });
  } catch (e: any) {
    console.error("GET /api/threads error:", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Server error" }), { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { teamId, title, body } = await req.json() as {
      teamId: number | string; title?: string; body?: string;
    };

    const t = Number(teamId);
    if (!Number.isInteger(t)) {
      return new Response(JSON.stringify({ error: "teamId must be integer" }), { status: 400 });
    }
    if (!title || !title.trim()) {
      return new Response(JSON.stringify({ error: "title required" }), { status: 400 });
    }

    const bodyText = typeof body === "string" ? body.trim() : undefined;
    const row = await createThread(t, title.trim(), bodyText);
    return Response.json(row, { status: 201 });
  } catch (e: any) {
    console.error("POST /api/threads error:", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Server error" }), { status: 500 });
  }
}

