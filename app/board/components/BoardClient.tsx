"use client";

import { findNgWord } from "@/data/moderation";
import { useEffect, useMemo, useState } from "react";
import {
  listPosts,
  listPostsByIds,
  createPost,
  reportPost,
  deletePost,
  likePost,
  type BoardPost,
  type Tab,
} from "@/lib/boardApi";              // ← "@/lib/..." に統一
import { translateText } from "@/lib/translate";
import AdOverlay from "@/components/AdOverlay";   // ← app/ は付けない
import AdSlot from "@/components/AdSlot";

// ---- helpers ----
function getClientId(): string {
  if (typeof window === "undefined") return "server";
  const key = "gp_client_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}
function getMyPostIdsKey(team: string) {
  return `gp_my_posts_${team}`;
}
function draftKey(team: string, tab: string) {
  return `gp_draft_${team}_${tab}`;
}

export default function BoardClient({
  team,
  initialTab = "tweet",
}: {
  team: string;
  initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const [data, setData] =
    useState<{ items: BoardPost[]; totalPages: number; total?: number } | null>(
      null
    );
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [lang, setLang] = useState("ja"); // quick-translate target

  const [showMine, setShowMine] = useState(false);
  const clientId = useMemo(() => getClientId(), []);

  const likedKey = `gp_liked_${team}`;
  const [likedSet, setLikedSet] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      return new Set(JSON.parse(localStorage.getItem(likedKey) || "[]"));
    } catch {
      return new Set();
    }
  });
  const persistLiked = (set: Set<string>) => {
    localStorage.setItem(likedKey, JSON.stringify(Array.from(set)));
  };

  const myTeam = (process.env.NEXT_PUBLIC_MY_TEAM as string) || "";
  const [adOpen, setAdOpen] = useState(false);
  function openOverlayOnce(key: string) {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    setAdOpen(true);
  }

  // ---- load ----
  const reload = async () => {
    if (showMine) {
      const myIds = JSON.parse(
        localStorage.getItem(getMyPostIdsKey(team)) || "[]"
      ) as string[];
      if (myIds.length === 0) {
        setData({ items: [], totalPages: 1, total: 0 });
        return;
      }
      const res = await listPostsByIds(team, myIds);
      if (res.ok) setData({ items: res.items, totalPages: 1, total: res.total });
      return;
    }

    const res = await listPosts(team, { page, pageSize, tab });
    if (res.ok) {
      setData({
        items: res.items,
        totalPages: res.totalPages,
        total: res.total,
      });
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team, tab, page, showMine]);

  useEffect(() => {
    if (team === myTeam) openOverlayOnce(`ad_enter_${team}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team]);

  // ---- draft persist / restore ----
  useEffect(() => {
    localStorage.setItem(
      draftKey(team, tab),
      JSON.stringify({ author, content })
    );
  }, [team, tab, author, content]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey(team, tab));
      if (raw) {
        const d = JSON.parse(raw);
        if (typeof d?.author === "string") setAuthor(d.author);
        if (typeof d?.content === "string") setContent(d.content);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team, tab]);

  // ---- actions ----
  const onSubmit = async () => {
    if (!content.trim()) return;
    setBusy(true);
    try {
      const res = await createPost(team, {
        content,
        tab,
        author: author.trim() || undefined,
      });
      if (res.ok) {
        setContent("");
        const key = getMyPostIdsKey(team);
        const arr = JSON.parse(localStorage.getItem(key) || "[]");
        arr.unshift(res.post.id);
        localStorage.setItem(key, JSON.stringify(arr.slice(0, 500)));
        await reload();
      } else {
        alert(res.error || "Failed to post.");
      }
    } finally {
      setBusy(false);
    }
  };

  const onTranslateInto = async (targetLang: string) => {
    if (!content.trim()) return;
    const t = await translateText(content, targetLang);
    setContent(t);
  };

  const onTranslateAndPost = async () => {
    if (!content.trim()) return;
    setBusy(true);
    try {
      const t = await translateText(content, lang);
      const res = await createPost(team, {
        content: t,
        tab,
        author: author.trim() || undefined,
      });
      if (res.ok) {
        setContent("");
        const key = getMyPostIdsKey(team);
        const arr = JSON.parse(localStorage.getItem(key) || "[]");
        arr.unshift(res.post.id);
        localStorage.setItem(key, JSON.stringify(arr.slice(0, 500)));
        await reload();
      } else {
        alert(res.error || "Failed to translate & post.");
      }
    } finally {
      setBusy(false);
    }
  };

  const onReport = async (id: string) => {
    const reason = window.prompt("Reason for report (optional)", "");
    const r = await reportPost(team, id, reason || undefined);
    if (r.ok) alert("Reported.");
    else alert(r.error || "Failed to report.");
  };

  const onLike = async (id: string) => {
    if (likedSet.has(id)) return;
    const r = await likePost(team, id, clientId);
    if (r.ok) {
      const next = new Set(likedSet);
      next.add(id);
      setLikedSet(next);
      persistLiked(next);
      await reload();
    } else {
      alert(r.error || "Failed to like.");
    }
  };

  // ---- pagination window ----
  const pages = useMemo(() => {
    if (!data?.totalPages) return [1];
    const total = data.totalPages;
    const cur = page;
    const windowSize = 7;
    const half = Math.floor(windowSize / 2);
    let start = Math.max(1, cur - half);
    let end = Math.min(total, start + windowSize - 1);
    if (end - start + 1 < windowSize) start = Math.max(1, end - windowSize + 1);
    const arr: number[] = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  }, [data?.totalPages, page]);

  return (
    <div className="space-y-4">
      {/* ===== tabs / mine toggle ===== */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setTab("tweet");
              setPage(1);
              setShowMine(false);
            }}
            className={`px-2 py-1 border rounded ${tab === "tweet" && !showMine ? "font-bold" : ""}`}
            data-i18n
          >
            Timeline
          </button>
          <button
            onClick={() => {
              setTab("question");
              setPage(1);
              setShowMine(false);
            }}
            className={`px-2 py-1 border rounded ${tab === "question" && !showMine ? "font-bold" : ""}`}
            data-i18n
          >
            Questions
          </button>
        </div>

        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={showMine}
            onChange={(e) => {
              setShowMine(e.target.checked);
              setPage(1);
            }}
          />
          <span data-i18n>Only my posts</span>
        </label>
      </div>

      {/* ===== composer ===== */}
      <div className="space-y-2">
        <div>
          <div className="text-xs opacity-70 mb-1" data-i18n>
            Display name (optional)
          </div>
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="border px-2 py-1 w-full rounded"
          />
        </div>

        <div>
          <div className="text-xs opacity-70 mb-1" data-i18n>
            Write your post…
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="border px-2 py-2 w-full rounded min-h-[96px]"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={onSubmit} disabled={busy} className="border px-3 py-1 rounded" data-i18n>
            {busy ? "Posting…" : "Post"}
          </button>

          <label className="flex items-center gap-2">
            <span className="text-sm opacity-70" data-i18n>
              Target language
            </span>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="border px-2 py-1 rounded"
              aria-label="Translate target language"
            >
              <option value="ja">日本語</option>
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </label>

          <button onClick={() => onTranslateInto(lang)} className="border px-3 py-1 rounded" data-i18n>
            Translate content
          </button>
          <button onClick={onTranslateAndPost} disabled={busy} className="border px-3 py-1 rounded" data-i18n>
            Translate & Post
          </button>
        </div>
      </div>

      {/* ===== list ===== */}
      <ul className="space-y-2">
        {data?.items?.map((p) => (
          <li key={p.id} className="border p-2 rounded">
            <div className="text-xs opacity-60 flex gap-2 flex-wrap">
              <span>{new Date(p.createdAt).toLocaleString()}</span>
              <span>/{p.tab}</span>
              {p.author && (
                <span>
                  <span data-i18n>by</span> {p.author}
                </span>
              )}
            </div>

            <div className="whitespace-pre-wrap mt-1">{p.content}</div>

            <div className="flex gap-4 text-sm mt-2 items-center">
              <button onClick={() => onReport(p.id)} data-i18n>
                Report
              </button>
              <button
                onClick={async () => {
                  const r = await deletePost(team, p.id);
                  if (r.ok) reload();
                  else alert(r.error || "Failed to delete.");
                }}
                data-i18n
              >
                Delete
              </button>
              <button
                onClick={() => onLike(p.id)}
                disabled={likedSet.has(p.id)}
                className="inline-flex items-center gap-1"
                title={likedSet.has(p.id) ? "Already liked" : "Like"}
              >
                <span data-i18n>Like</span>
                <span>{p.likes ?? 0}</span>
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* ===== pager ===== */}
      {!showMine && data && data.totalPages > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="border px-2 py-1 rounded"
            data-i18n
          >
            Prev
          </button>

          {pages[0] > 1 && (
            <>
              <button onClick={() => setPage(1)} className="border px-2 py-1 rounded">
                1
              </button>
              {pages[0] > 2 && <span className="px-1">…</span>}
            </>
          )}

          {pages.map((n) => (
            <button
              key={n}
              onClick={() => setPage(n)}
              className={`border px-2 py-1 rounded ${n === page ? "font-bold" : ""}`}
            >
              {n}
            </button>
          ))}

          {pages[pages.length - 1] < (data.totalPages || 1) && (
            <>
              {pages[pages.length - 1] < (data.totalPages || 1) - 1 && <span className="px-1">…</span>}
              <button onClick={() => setPage(data.totalPages!)} className="border px-2 py-1 rounded">
                {data.totalPages}
              </button>
            </>
          )}

          <button
            disabled={page >= (data.totalPages || 1)}
            onClick={() => {
              setPage((p) => p + 1);
              if (team === myTeam) openOverlayOnce(`ad_next_${team}`);
            }}
            className="border px-2 py-1 rounded"
            data-i18n
          >
            Next
          </button>
        </div>
      )}

      {/* ===== ad slot ===== */}
      {String(process.env.NEXT_PUBLIC_SHOW_AD_SLOT).toLowerCase() === "true" && (
        <div className="mt-4">
          <AdSlot />
        </div>
      )}

      <AdOverlay open={adOpen} onClose={() => setAdOpen(false)} />
    </div>
  );
}

