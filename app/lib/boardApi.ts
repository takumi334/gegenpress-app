export type Tab = "tweet" | "question";

const j = async (r: Response) => {
  if (!r.ok) return { ok: false, error: `status ${r.status}` };
  const ct = r.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return { ok: false, error: "not json" };
  try { return await r.json(); } catch { return { ok: false, error: "json parse error" }; }
};

// 一覧（タブ/ページング）
export async function listPosts(
  team: string,
  opts?: { page?: number; pageSize?: number; tab?: Tab; mine?: boolean }
) {
  const p = new URLSearchParams();
  if (opts?.page) p.set("page", String(opts.page));
  if (opts?.pageSize) p.set("pageSize", String(opts.pageSize));
  if (opts?.tab) p.set("tab", opts.tab);
  if (opts?.mine) p.set("mine", "1");
  const res = await fetch(`/api/board/${encodeURIComponent(team)}?${p.toString()}`, { cache: "no-store" });
  return j(res);
}

// ID 指定で取得（自分の投稿用）
export async function listPostsByIds(team: string, ids: string[]) {
  const res = await fetch(
    `/api/board/${encodeURIComponent(team)}?ids=${encodeURIComponent(ids.join(","))}`,
    { cache: "no-store" }
  );
  return j(res);
}

// 新規投稿
export async function createPost(
  team: string,
  data: { content: string; tab?: Tab; author?: string },
  clientId: string
) {
  const res = await fetch(`/api/board/${encodeURIComponent(team)}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-client-id": clientId, // ← API と合わせる
    },
    body: JSON.stringify(data),
  });
  return j(res);
}

// 通報
export async function reportPost(team: string, id: string, reason?: string) {
  const res = await fetch(`/api/board/${encodeURIComponent(team)}/report`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id, reason }),
  });
  return j(res);
}

// いいね
export async function likePost(team: string, id: string, clientId: string) {
  const res = await fetch(`/api/board/${encodeURIComponent(team)}/like`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-client-id": clientId, // ← API と合わせる
    },
    body: JSON.stringify({ id }),
  });
  return j(res);
}

// 削除（管理者）
export async function deletePost(team: string, id: string) {
  const res = await fetch(`/api/board/${encodeURIComponent(team)}?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { "x-admin-key": (process.env.NEXT_PUBLIC_ADMIN_KEY as string) || "" },
  });
  return j(res);
}

