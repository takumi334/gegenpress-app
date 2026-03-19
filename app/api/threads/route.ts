// app/api/threads/route.ts
import { NextRequest } from "next/server";
import { listThreads, createThread, createTacticsBoardForThread } from "@/lib/boardApi";
import { translateBatch } from "@/lib/translate";

export const runtime = "nodejs";

const DEFAULT_TARGET_LANG = "en";

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
    const payload = await req.json() as {
      teamId: number | string;
      title?: string;
      body?: string;
      threadType?: string | null;
      tacticPayload?: Record<string, unknown> | null;
      targetLang?: string;
    };
    const { teamId, title, body, threadType, tacticPayload, targetLang } = payload;

    const t = Number(teamId);
    if (!Number.isInteger(t)) {
      return new Response(JSON.stringify({ error: "teamId must be integer" }), { status: 400 });
    }
    if (!title || !title.trim()) {
      return new Response(JSON.stringify({ error: "title required" }), { status: 400 });
    }

    let bodyText = typeof body === "string" ? body.trim() : "";
    if (bodyText.includes("[tactic]") || bodyText.includes("data:image/png;base64,")) {
      bodyText = bodyText
        .replace(/\n*!\[[^\]]*\]\(data:image\/[^)]+\)\n*/g, "\n")
        .replace(/\n*\[tactic\]\n*/gi, "\n")
        .replace(/【戦術メモ】[\s\S]*?この投稿は lineup-builder から作成されました[^\n]*\n*/g, "")
        .trim();
    }
    const lang = (targetLang ?? DEFAULT_TARGET_LANG).trim() || DEFAULT_TARGET_LANG;

    let translatedBody: string | null = null;
    if (bodyText) {
      try {
        const [tr] = await translateBatch([bodyText], lang);
        const candidate = (tr ?? "").trim();
        translatedBody = candidate && candidate !== bodyText ? candidate : null;
        console.log("[POST /api/threads] スレッド作成時の翻訳", {
          originalBody: bodyText.slice(0, 60) + "…",
          translationResult: candidate ? candidate.slice(0, 60) + "…" : "(empty)",
          finalTranslatedBody: translatedBody ? "set" : "null",
        });
      } catch (translateErr) {
        console.warn("[POST /api/threads] 翻訳失敗", translateErr);
      }
    }

    const allowed = ["PRE_MATCH", "LIVE_MATCH", "POST_MATCH", "GENERAL"] as const;
    const type = (allowed.includes(threadType as any) ? threadType : null) ?? "GENERAL";
    const row = await createThread(t, title.trim(), bodyText, type, undefined, translatedBody);

    if (tacticPayload && Array.isArray(tacticPayload.frames) && tacticPayload.frames.length > 0) {
      await createTacticsBoardForThread(row.id, tacticPayload, { mode: "GENERAL", body: bodyText });
    }

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

