// app/api/threads/route.ts
import { NextRequest } from "next/server";
import { listThreads, createThread } from "@/lib/boardApi";

export const runtime = "nodejs";

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
    console.log("[GET /api/threads] listThreads teamId=", teamId);
    const threads = await listThreads(teamId);
    // フロントが配列/ items 両方に対応できるように配列を直接返す
    return Response.json(threads, { status: 200 });
  } catch (e: any) {
    console.error("GET /api/threads error:", e);
    return Response.json(
      { ok: false, error: e?.message ?? "Server error", code: e?.code },
      { status: 500 }
    );
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
    console.log("[POST /api/threads] createThread teamId=", t);
    const row = await createThread(t, title.trim(), bodyText);
    return Response.json(row, { status: 201 });
  } catch (e: any) {
    console.error("threads POST error", e);
    return Response.json(
      {
        ok: false,
        error: e?.message ?? "Server error",
        code: e?.code,
        message: e?.message,
      },
      { status: 500 }
    );
  }
}

