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

const USER_HEADER = "x-client-id"; // フロントと合わせる

export async function POST(req: NextRequest, { params }: { params: { team: string } }) {
  const { team } = params;
  const { id } = await req.json().catch(() => ({}));
  const uid = req.headers.get(USER_HEADER) || "";

  if (!id || !uid) {
    return NextResponse.json({ ok: false, error: "id/user required" }, { status: 400 });
  }

  const list = store.get(team) || [];
  const p = list.find(x => x.id === id && !x.deletedAt);
  if (!p) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

  p.likedBy ??= new Set<string>();
  if (!p.likedBy.has(uid)) {
    p.likedBy.add(uid);
    p.likes = (p.likes ?? 0) + 1;
  }
  return NextResponse.json({ ok: true, id, likes: p.likes ?? 0 });
}

