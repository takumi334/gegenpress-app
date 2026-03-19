"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ReportButton from "@components/ReportButton";
import { useT } from "@/lib/NativeLangProvider";
import { usePostTranslation } from "@/lib/PostTranslationContext";
import CommentLikeButton from "@/board/components/CommentLikeButton";
import { getOrCreateAnonId } from "@/lib/anonId";
import { canCreateTacticsBoard, normalizeThreadType, THREAD_TYPE } from "@/lib/threadType";
import TacticsLineupThumbnail from "@components/lineup/TacticsLineupThumbnail";
import TacticsLineupView from "@components/lineup/TacticsLineupView";
import { PostBodyNativeOnly, PostBodyTranslationOnly } from "@/board/components/PostBodyRenderer";
import { lineupPayloadToTacticsBoardData, type LineupTacticPayload } from "@/lib/lineupTacticData";
import { stripDataUrlsFromText } from "@/lib/tacticsPostBody";

// ------- types -------
type Post = {
  id: string;
  authorName: string | null;
  body: string;
  translatedBody?: string | null;
  tactic?: LineupTacticPayload | null;
  createdAt: string;
  likeCount?: number;
  likedByMe?: boolean;
};

type TacticsBoardItem = {
  id: number;
  mode: string;
  title: string;
  body: string;
  data?: {
    formation?: string;
    placements?: { slotCode: string; playerName: string; x?: number; y?: number }[];
    drawingData?: { strokes: { color: string; points: { x: number; y: number }[] }[] };
  } | null;
  createdAt: string;
};

type ThreadData = {
  id: string;
  title: string;
  teamId: string;
  body: string;
  threadType?: string | null;
  posts: Post[];
  tacticsBoards?: TacticsBoardItem[];
};

function isNativeOnlyThread(threadType?: string | null): boolean {
  if (!threadType) return false;
  const t = normalizeThreadType(threadType);
  return t === THREAD_TYPE.PRE_MATCH || t === THREAD_TYPE.LIVE_MATCH || t === THREAD_TYPE.POST_MATCH;
}

/** 投稿内容からX（Twitter）の intent/tweet 用テキストを組み立てる（英語・日本語・URL） */
function buildTweetText(
  nativeBody: string,
  translatedBody: string | null | undefined,
  targetLang: string | undefined,
  sameLanguage: boolean,
  pageUrl: string
): string {
  const native = stripDataUrlsFromText(nativeBody || "").trim();
  const translated = (translatedBody && stripDataUrlsFromText(translatedBody).trim()) || "";
  const parts: string[] = [];
  if (sameLanguage || !translated) {
    if (native) parts.push(native);
  } else {
    const englishComment = targetLang === "en" ? (translated || native) : native;
    const japaneseComment = targetLang === "ja" ? (translated || native) : (translated || native);
    if (englishComment) parts.push(englishComment);
    if (japaneseComment && japaneseComment !== englishComment) parts.push(japaneseComment);
  }
  parts.push(pageUrl);
  return parts.join("\n\n");
}

// ------- component -------
export default function ThreadView({
  teamId,
  threadId,
  errorParam,
  tacticsSaved,
}: {
  teamId: string;
  threadId: string;
  errorParam?: string;
  tacticsSaved?: string;
}) {
  const t = useT();
  const { targetLang, sameLanguage } = usePostTranslation();
  const [data, setData] = useState<ThreadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [postTranslations, setPostTranslations] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const anonId = getOrCreateAnonId();
      const url = anonId
        ? `/api/threads/${threadId}?anonId=${encodeURIComponent(anonId)}`
        : `/api/threads/${threadId}`;
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error || `HTTP ${r.status}`);
      }
      const j: ThreadData = await r.json();
      setData(j);
    } catch (e: any) {
      setErr(e?.message || t("thread.loadFailed"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    if (!threadId) return;
    load();
  }, [threadId, load]);

  // 投稿の翻訳取得（ヘッダーの Native/Target に従う）
  useEffect(() => {
    let cancelled = false;
    setPostTranslations({});
    if (!data?.posts?.length) return;
    if (sameLanguage || isNativeOnlyThread(data.threadType)) return;

    (async () => {
      const unique = new Set<string>();
      const postBodies: { id: string; body: string }[] = [];
      for (const p of data.posts) {
        const body = (p.body || "").trim();
        if (!body) continue;
        unique.add(body);
        postBodies.push({ id: p.id, body });
      }
      const list = Array.from(unique);
      const map = new Map<string, string>();
      if (list.length > 0) {
        try {
          const res = await fetch("/api/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
            body: JSON.stringify({ q: list, target: targetLang }),
          });
          if (!res.ok) throw new Error("translate failed");
          const j = await res.json().catch(() => ({}));
          const trs: string[] = Array.isArray(j?.translations) ? j.translations : [];
          list.forEach((txt, idx) => map.set(txt, trs[idx] ?? txt));
        } catch {
          if (!cancelled) setPostTranslations({});
          return;
        }
      }
      if (cancelled) return;
      const next: Record<string, string> = {};
      postBodies.forEach(({ id, body }) => {
        next[id] = map.get(body) ?? body;
      });
      setPostTranslations(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [data?.id, data?.posts, data?.threadType, targetLang, sameLanguage]);

  if (loading) return <div className="p-4 text-sm opacity-70">{t("common.loading")}</div>;
  if (err) return <div className="p-4 text-sm text-red-600">{t("common.error")}: {err}</div>;
  if (!data?.id) return <div className="p-4 text-sm opacity-70">{t("thread.threadNotFound")}</div>;

  const tacticsButtonLabel = normalizeThreadType(data.threadType) === THREAD_TYPE.LIVE_MATCH
    ? t("tactics.postLiveMemo")
    : t("tactics.postTactics");
  const tacticsDesc = normalizeThreadType(data.threadType) === THREAD_TYPE.LIVE_MATCH
    ? t("tactics.descLiveMatch")
    : t("tactics.descPreMatch");

  return (
    <main className="p-4 space-y-4">
      {errorParam === "tactics_not_allowed" && (
        <div className="p-3 rounded bg-amber-100 text-amber-800 text-sm">
          {t("thread.tacticsNotAllowed")}
        </div>
      )}
      {tacticsSaved != null && tacticsSaved !== "" && (
        <div className="p-3 rounded bg-green-100 text-green-800 text-sm">
          {t("tactics.saved")}
        </div>
      )}
      <header className="space-y-1">
        <h1 className="text-xl font-bold">{data.title}</h1>
        <div className="text-xs opacity-60">{t("thread.postCount")}: {data.posts.length}</div>
        {data.body ? (
          <div className="mt-1">
            <PostBodyNativeOnly body={data.body} />
          </div>
        ) : null}
      </header>

      {canCreateTacticsBoard(data.threadType) && (
        <section className="p-3 border rounded bg-gray-50">
          <Link
            href={`/board/${teamId}/thread/${threadId}/tactics-board/new`}
            className="inline-block px-4 py-2 rounded font-medium bg-green-600 text-white hover:bg-green-700 text-sm"
          >
            {tacticsButtonLabel}
          </Link>
          <p className="text-xs text-gray-600 mt-1">
            {tacticsDesc}
          </p>
        </section>
      )}

      {(() => {
        type FeedItem =
          | { type: "post"; createdAt: string; post: Post }
          | { type: "tacticsBoard"; createdAt: string; board: TacticsBoardItem };
        const postsItems: FeedItem[] = (data.posts ?? []).map((p) => ({
          type: "post" as const,
          createdAt: p.createdAt,
          post: p,
        }));
        const boardsItems: FeedItem[] = (data.tacticsBoards ?? []).map((tb) => ({
          type: "tacticsBoard" as const,
          createdAt: typeof tb.createdAt === "string" ? tb.createdAt : (tb as { createdAt?: string }).createdAt ?? new Date().toISOString(),
          board: tb,
        }));
        const feed = [...postsItems, ...boardsItems].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        return (
          <ul className="space-y-3 list-none p-0 m-0">
            {feed.map((item) => {
              if (item.type === "tacticsBoard") {
                const tb = item.board;
                const hasLegacyData =
                  (tb.data as { placements?: unknown[]; drawingData?: { strokes?: unknown[] } } | null)
                    ?.placements?.length ||
                  (tb.data as { drawingData?: { strokes?: unknown[] } } | null)?.drawingData?.strokes?.length;
                const lineupData = lineupPayloadToTacticsBoardData((tb.data ?? null) as LineupTacticPayload | null);
                const viewData = lineupData ?? (hasLegacyData ? (tb.data as Parameters<typeof TacticsLineupThumbnail>[0]["data"]) : null);
                return (
                  <li key={`tb-${tb.id}`} className="border border-white/10 rounded p-3 bg-white/[0.02]">
                    <div className="text-xs text-white/50 mb-1">
                      {tb.mode === "LIVE_MATCH" ? t("tactics.liveMemo") : tb.mode === "GENERAL" ? "戦術（lineup-builder）" : t("tactics.preMatch")} ·{" "}
                      {new Date(tb.createdAt).toLocaleString("ja-JP")}
                    </div>
                    {tb.title ? <div className="font-medium text-sm text-white/90 mt-1">{tb.title}</div> : null}
                    {tb.body ? <p className="text-sm text-white/80 whitespace-pre-wrap mt-1">{tb.body}</p> : null}
                    {viewData ? (
                      <div className="mt-2 flex items-start gap-2">
                        <TacticsLineupThumbnail data={viewData} />
                        <Link
                          href={`/board/${teamId}/thread/${threadId}/tactics-board/${tb.id}`}
                          className="text-xs text-blue-400 hover:underline shrink-0 self-center"
                        >
                          {t("common.seeDetails")}
                        </Link>
                      </div>
                    ) : (
                      <Link
                        href={`/board/${teamId}/thread/${threadId}/tactics-board/${tb.id}`}
                        className="text-xs text-blue-400 hover:underline mt-1 inline-block"
                      >
                        {t("common.seeDetails")}
                      </Link>
                    )}
                  </li>
                );
              }
              const p = item.post;
              const nativeOnly = isNativeOnlyThread(data.threadType);
              const bodyT = postTranslations[p.id];
              const noTranslation = sameLanguage || nativeOnly;
              const rightBody = noTranslation ? null : (p.translatedBody ?? bodyT ?? p.body);

              return (
                <li key={`post-${p.id}`} className="border border-white/10 rounded p-3 bg-white/[0.02]">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="text-xs text-white/50">
                      {p.authorName || t("thread.anonymous")}・{new Date(p.createdAt).toLocaleString()}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <CommentLikeButton
                        commentId={Number(p.id)}
                        initialLikeCount={p.likeCount ?? 0}
                        initialLikedByMe={p.likedByMe ?? false}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const pageUrl =
                            typeof window !== "undefined"
                              ? `${window.location.origin}/board/${teamId}/thread/${threadId}`
                              : `https://gegenpress.app/board/${teamId}/thread/${threadId}`;
                          const text = buildTweetText(
                            p.body,
                            rightBody ?? null,
                            targetLang ?? undefined,
                            sameLanguage,
                            pageUrl
                          );
                          window.open(
                            `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
                            "_blank",
                            "noopener,noreferrer"
                          );
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-[#0a0a0a] text-white border border-white/20 hover:bg-[#1a1a1a] hover:border-white/30 transition-colors"
                      >
                        Xで投稿
                      </button>
                      <ReportButton kind="post" targetId={Number(p.id)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="border border-white/10 rounded p-2 bg-white/[0.03]">
                      <div className="text-[11px] text-white/50 mb-1">{t("board.native")}</div>
                      <PostBodyNativeOnly body={p.body} />
                    </div>
                    <div className="border border-white/10 rounded p-2 bg-white/[0.03]">
                      <div className="text-[11px] text-white/50 mb-1">{t("board.translation")}</div>
                      <PostBodyTranslationOnly
                        body={p.body}
                        translatedBody={rightBody ?? undefined}
                        noTranslation={noTranslation}
                      />
                    </div>
                  </div>
                  {p.tactic && (() => {
                    const viewData = lineupPayloadToTacticsBoardData(p.tactic as LineupTacticPayload);
                    return viewData ? (
                      <div className="mt-2">
                        <TacticsLineupView data={viewData} />
                      </div>
                    ) : null;
                  })()}
                </li>
              );
            })}
          </ul>
        );
      })()}


      <ReplyForm
        threadId={threadId}
        onPosted={load}
        returnTo={`/board/${teamId}/thread/${threadId}`}
      />

      <div>
        <a className="underline text-sm opacity-70" href={`/board/${teamId}`}>
          {t("common.backToBoard")}
        </a>
      </div>
    </main>
  );
}

// ------- reply form -------
const PENDING_TACTIC_REPLY_KEY = "pendingTacticReply";

export function ReplyForm({
  threadId,
  onPosted,
  returnTo,
}: {
  threadId: string;
  onPosted: () => void;
  returnTo?: string;
}) {
  const t = useT();
  const { targetLang, sameLanguage } = usePostTranslation();
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [pendingTactic, setPendingTactic] = useState<LineupTacticPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem(PENDING_TACTIC_REPLY_KEY);
    if (!raw) return;
    try {
      const data = JSON.parse(raw) as LineupTacticPayload;
      if (data?.frames?.length) {
        setPendingTactic({
          formation: data.formation,
          currentFrame: data.currentFrame,
          frames: data.frames,
          slotNames: data.slotNames,
          source: "lineup-builder",
        });
      }
    } catch {
      // ignore
    }
    sessionStorage.removeItem(PENDING_TACTIC_REPLY_KEY);
  }, []);

  const canSubmit = useMemo(() => body.trim().length > 0, [body]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const payload: {
        authorName: string | null;
        body: string;
        tacticPayload?: LineupTacticPayload;
        targetLang?: string;
      } = {
        authorName: name.trim() || null,
        body: body.trim(),
        targetLang: sameLanguage ? undefined : (targetLang || "en"),
      };
      if (pendingTactic?.frames?.length) {
        payload.tacticPayload = pendingTactic;
      }
      const r = await fetch(`/api/threads/${threadId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);

      setBody("");
      setPendingTactic(null);
      onPosted();
    } catch (e: any) {
      setErr(e?.message || "Failed to post");
    } finally {
      setBusy(false);
    }
  }

  const tacticViewData = useMemo(
    () => (pendingTactic ? lineupPayloadToTacticsBoardData(pendingTactic) : null),
    [pendingTactic]
  );

  return (
    <form onSubmit={submit} className="space-y-2 p-3 border rounded">
      {returnTo && (
        <p className="text-xs text-white/70 mb-1">
          <Link href={`/lineup-builder?returnTo=${encodeURIComponent(returnTo)}`} className="underline">
            作戦を描いて返信
          </Link>
        </p>
      )}
      <input
        className="w-full border px-2 py-1 bg-white/5 border-white/20 text-white"
        placeholder={t("thread.displayNamePlaceholder")}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <textarea
        className="w-full border px-2 py-1 min-h-[100px] bg-white/5 border-white/20 text-white"
        placeholder={t("thread.sharePlaceholder")}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      {tacticViewData && (
        <div className="flex items-center gap-2 flex-wrap">
          <TacticsLineupThumbnail data={tacticViewData} />
          <button
            type="button"
            onClick={() => setPendingTactic(null)}
            className="text-xs text-white/70 underline"
          >
            作戦を外す
          </button>
        </div>
      )}
      {err && <div className="text-sm text-red-600">{err}</div>}
      <button disabled={!canSubmit || busy} className="px-3 py-1 border rounded">
        {busy ? t("thread.posting") : t("thread.postReply")}
      </button>
    </form>
  );
}

