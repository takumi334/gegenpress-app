// app/api/board/[team]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

// Edge/ServerlessでOK（better-sqlite3不要）
export const runtime = "edge";
export const dynamic = "force-dynamic";

type CreatePostPayload =
  | { action?: undefined; type?: "post" | "question"; body?: string; author?: string | null }
  | { action: "report"; id: string; reason?: string };

// 初期化（存在しなければ作成）
async function ensureTables() {
  await sql/* sql */`
    CREATE TABLE IF NOT EXISTS posts (
      id        TEXT PRIMARY KEY,
      team      TEXT NOT NULL,
      type      TEXT CHECK(type IN ('post','question')) NOT NULL,
      body      TEXT NOT NULL,
      author    TEXT,
      createdAt TIMESTAMPTZ NOT NULL
    );
  `;
  await sql/* sql */`
    CREATE INDEX IF NOT EXISTS idx_posts_team_createdAt
      ON posts(team, createdAt DESC);
  `;
  await sql/* sql */`
    CREATE TABLE IF NOT EXISTS reports (
      id        TEXT PRIMARY KEY,
      postId    TEXT NOT NULL,
      team      TEXT NOT NULL,
      reason    TEXT,
      createdAt TIMESTAMPTZ NOT NULL
    );
  `;
  await sql/* sql */`
    CREATE INDEX IF NOT EXISTS idx_reports_team_createdAt
      ON reports(team, createdAt DESC);
  `;
}

// ── 一覧取得 ───────────────────────────────
export async function GET(_req: NextRequest, ctx: { params: { team: string } }) {
  try {
    await ensureTables();
    const { team } = ctx.params;
    const { rows } = await sql/* sql */`
      SELECT id, team, type, body, author, createdAt
      FROM posts
      WHERE team = ${team}
      ORDER BY createdAt DESC
      LIMIT 50
    `;
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// ── 新規投稿 / 通報 ───────────────────────
export async function POST(req: NextRequest, ctx: { params: { team: string } }) {
  try {
    await ensureTables();
    const { team } = ctx.params;
    const payload = (await req.json()) as CreatePostPayload;

    // 通常投稿
    if (!payload?.action) {
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      const type = payload.type ?? "post";
      const body = (payload.body ?? "").trim();
      const author = payload.author ?? null;
      if (!body) return NextResponse.json({ error: "body is required" }, { status: 400 });

      await sql/* sql */`
        INSERT INTO posts (id, team, type, body, author, createdAt)
        VALUES (${id}, ${team}, ${type}, ${body}, ${author}, ${createdAt})
      `;
      return NextResponse.json({ ok: true, id, createdAt }, { status: 201 });
    }

    // 通報
    if (payload.action === "report") {
      if (!payload.id) return NextResponse.json({ error: "post id is required" }, { status: 400 });
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      await sql/* sql */`
        INSERT INTO reports (id, postId, team, reason, createdAt)
        VALUES (${id}, ${payload.id}, ${team}, ${payload.reason ?? ""}, ${createdAt})
      `;
      return NextResponse.json({ ok: true }, { status: 201 });
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// ── 投稿削除 ───────────────────────────────
export async function DELETE(req: NextRequest, ctx: { params: { team: string } }) {
  try {
    await ensureTables();
    const { team } = ctx.params;
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    await sql/* sql */`DELETE FROM posts   WHERE id = ${id} AND team = ${team}`;
    await sql/* sql */`DELETE FROM reports WHERE postId = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

