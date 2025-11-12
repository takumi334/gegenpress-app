import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Tab = "tweet" | "question";
type Post = {
  id: string; team: string; tab: Tab; content: string;
  author?: string; authorId?: string; createdAt: number;
  deletedAt?: number; reports?: number; likes?: number; likedBy?: Set<string>;
};

const STORE_KEY = Symbol.for("__BOARD_STORE__");
type Store = Map<string, Post[]>;
const store: Store = (globalThis as any)[STORE_KEY] || new Map();
(globalThis as any)[STORE_KEY] = store;

export async function POST(req: NextRequest, { params }: { params: { team: string } }) {
  const { team } = params;
  const { id, reason } = await req.json().catch(() => ({}));
  if (!id) {
    return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  }

  const list = store.get(team) || [];
  const p = list.find(x => x.id === id && !x.deletedAt);
  if (!p) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

  p.reports = (p.reports ?? 0) + 1;
  // 必要なら reason を保存する実装に拡張可
  return NextResponse.json({ ok: true, id, reports: p.reports, reason: reason ?? null });
}

