// app/api/threads/route.ts
import { NextRequest } from "next/server";
import { listThreads, createThread, createTacticsBoardForThread } from "@/lib/boardApi";
import { translateBatch } from "@/lib/translate";
import { NO_STORE_HEADERS } from "@/lib/noStore";
import {
  containsBannedWords,
  containsBannedWordsInFields,
  MODERATION_ERROR_MESSAGE,
} from "@/lib/moderation";

export const runtime = "nodejs";
const BOARD_LIST_CACHE_HEADERS: Record<string, string> = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
};

const DEFAULT_TARGET_LANG = "en";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const teamIdStr = searchParams.get("teamId");
    if (!teamIdStr) {
      return new Response(JSON.stringify({ error: "teamId required" }), { status: 400, headers: BOARD_LIST_CACHE_HEADERS });
    }
    const teamId = Number(teamIdStr);
    if (!Number.isInteger(teamId)) {
      return new Response(JSON.stringify({ error: "teamId must be integer" }), { status: 400, headers: BOARD_LIST_CACHE_HEADERS });
    }
    const anonId = searchParams.get("anonId")?.trim();
    const threads = await listThreads(
      teamId,
      anonId ? { anonId } : undefined
    );
    return Response.json(threads, { status: 200, headers: BOARD_LIST_CACHE_HEADERS });
  } catch (e: any) {
    console.error("GET /api/threads error:", e);
    return Response.json(
      { ok: false, error: e?.message ?? "Server error", code: e?.code },
      { status: 500, headers: BOARD_LIST_CACHE_HEADERS }
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
      authorName?: string;
    };
    const { teamId, title, body, threadType, tacticPayload, targetLang, authorName } =
      payload;

    const t = Number(teamId);
    if (!Number.isInteger(t)) {
      return new Response(JSON.stringify({ error: "teamId must be integer" }), { status: 400, headers: NO_STORE_HEADERS });
    }
    if (!title || !title.trim()) {
      return new Response(JSON.stringify({ error: "title required" }), { status: 400, headers: NO_STORE_HEADERS });
    }

    const displayName =
      typeof authorName === "string" ? authorName.trim().slice(0, 80) : "";

    let bodyText = typeof body === "string" ? body.trim() : "";
    if (bodyText.includes("[tactic]") || bodyText.includes("data:image/png;base64,")) {
      bodyText = bodyText
        .replace(/\n*!\[[^\]]*\]\(data:image\/[^)]+\)\n*/g, "\n")
        .replace(/\n*\[tactic\]\n*/gi, "\n")
        .replace(/【戦術メモ】[\s\S]*?この投稿は lineup-builder から作成されました[^\n]*\n*/g, "")
        .trim();
    }

    if (
      containsBannedWordsInFields([title.trim(), bodyText, displayName]) ||
      (tacticPayload != null &&
        Object.keys(tacticPayload).length > 0 &&
        containsBannedWords(JSON.stringify(tacticPayload)))
    ) {
      return new Response(JSON.stringify({ error: MODERATION_ERROR_MESSAGE }), {
        status: 400,
        headers: NO_STORE_HEADERS,
      });
    }

    const lang = (targetLang ?? DEFAULT_TARGET_LANG).trim() || DEFAULT_TARGET_LANG;

    let translatedBody: string | null = null;
    if (bodyText) {
      try {
        const [tr] = await translateBatch([bodyText], lang);
        const candidate = (tr ?? "").trim();
        translatedBody = candidate && candidate !== bodyText ? candidate : null;
      } catch (translateErr) {
        console.warn("[POST /api/threads] 翻訳失敗", translateErr);
      }
    }

    const allowed = ["PRE_MATCH", "LIVE_MATCH", "POST_MATCH", "GENERAL"] as const;
    const type = (allowed.includes(threadType as any) ? threadType : null) ?? "GENERAL";
    const row = await createThread(t, title.trim(), bodyText, type, undefined, translatedBody);

    if (tacticPayload && Array.isArray(tacticPayload.frames) && tacticPayload.frames.length > 0) {
      if (process.env.NODE_ENV !== "production") {
        console.log("[POST /api/threads] tacticPayload before save", tacticPayload);
      }
      await createTacticsBoardForThread(row.id, tacticPayload, { mode: "GENERAL", body: bodyText });
    }

    return Response.json(row, { status: 201, headers: NO_STORE_HEADERS });
  } catch (e: any) {
    console.error("threads POST error", e);
    return Response.json(
      {
        ok: false,
        error: e?.message ?? "Server error",
        code: e?.code,
        message: e?.message,
      },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

