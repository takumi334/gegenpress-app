"use client";

import { useEffect, useState } from "react";
import ReportButton from "@/components/ReportButton";
import BoardLikeToggle from "@/board/components/BoardLikeToggle";
import { getOrCreateAnonId } from "@/lib/anonId";
import { useT } from "@/lib/NativeLangProvider";
import { usePostTranslation } from "@/lib/PostTranslationContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { normalizeThreadType, THREAD_TYPE } from "@/lib/threadType";
import TacticsLineupThumbnail from "@components/lineup/TacticsLineupThumbnail";
import { lineupPayloadToTacticsBoardData, type LineupTacticPayload } from "@/lib/lineupTacticData";

function isNativeOnlyThread(threadType?: string | null): boolean {
  if (!threadType) return false;
  const t = normalizeThreadType(threadType);
  return t === THREAD_TYPE.PRE_MATCH || t === THREAD_TYPE.LIVE_MATCH || t === THREAD_TYPE.POST_MATCH;
}

type TacticsBoardSummary = {
  id: number;
  data: unknown;
  createdAt: string;
};

type Item = {
  id: string;
  title: string;
  body?: string;
  /** DB保存済みの翻訳本文。APIで返る。優先して TRANSLATION 欄に表示 */
  translatedBody?: string | null;
  authorName?: string | null;
  createdAt?: string;
  postCount?: number;
  threadLikeCount?: number;
  threadLikedByMe?: boolean;
  threadType?: string | null;
  tacticsBoards?: TacticsBoardSummary[];
  title_t?: string;
  body_t?: string;
};

type Props = {
  teamId: string;
  initialItems?: Item[];
  highlightThreadId?: string;
  highlightReplyId?: string;
};

export default function ThreadList({
  teamId,
  initialItems,
  highlightThreadId,
  highlightReplyId,
}: Props) {
  const router = useRouter();
  const t = useT();
  const { targetLang, sameLanguage, translationTrigger } = usePostTranslation();
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<Item[]>(initialItems ?? []);
  const [rawItems, setRawItems] = useState<Item[]>(initialItems ?? []);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(!initialItems);
  useEffect(() => setMounted(true), []);

  // initialItems が変わったら状態を同期
  useEffect(() => {
    setRawItems(initialItems ?? []);
    setItems(initialItems ?? []);
    setLoading(!initialItems);
    setErr("");
  }, [initialItems]);

  // SSR 済み一覧に、anonId ベースの threadLikedByMe / 最新件数をマージ
  useEffect(() => {
    if (!initialItems?.length) return;
    const anon = getOrCreateAnonId();
    if (!anon) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/threads?teamId=${encodeURIComponent(teamId)}&anonId=${encodeURIComponent(anon)}`,
          { cache: "no-store" }
        );
        if (!res.ok || cancelled) return;
        const j = await res.json();
        const list: Item[] = Array.isArray(j) ? j : [];
        if (!list.length || cancelled) return;
        const map = new Map<
          string,
          { threadLikeCount?: number; threadLikedByMe?: boolean }
        >();
        for (const x of list) {
          map.set(String(x.id), {
            threadLikeCount:
              typeof x.threadLikeCount === "number" ? x.threadLikeCount : undefined,
            threadLikedByMe: Boolean(x.threadLikedByMe),
          });
        }
        setRawItems((prev) =>
          prev.map((p) => {
            const u = map.get(String(p.id));
            if (!u) return p;
            return {
              ...p,
              threadLikeCount: u.threadLikeCount ?? p.threadLikeCount,
              threadLikedByMe: u.threadLikedByMe,
            };
          })
        );
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [teamId, initialItems]);

  // /board/TEAM?highlightReply=POST_ID → スレッド詳細へ
  useEffect(() => {
    const rid = highlightReplyId?.trim();
    if (!rid || !/^\d+$/.test(rid)) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/posts/${encodeURIComponent(rid)}`, {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const j = await res.json().catch(() => ({}));
        const threadId = j?.threadId;
        if (typeof threadId !== "number" || cancelled) return;
        router.replace(
          `/board/${teamId}/thread/${threadId}?highlightReply=${encodeURIComponent(rid)}`
        );
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [teamId, highlightReplyId, router]);

  useEffect(() => {
    const tid = highlightThreadId?.trim();
    if (!tid || !/^\d+$/.test(tid) || !items.length) return;
    const el = document.querySelector(`[data-thread-row="${tid}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add(
      "ring-2",
      "ring-amber-400",
      "ring-offset-2",
      "ring-offset-black",
      "rounded-lg"
    );
    const tmr = window.setTimeout(() => {
      el.classList.remove(
        "ring-2",
        "ring-amber-400",
        "ring-offset-2",
        "ring-offset-black",
        "rounded-lg"
      );
    }, 4500);
    return () => window.clearTimeout(tmr);
  }, [highlightThreadId, items]);

  useEffect(() => {
    let alive = true;
    (async () => {
      // SSR で初期値がある場合はクライアントフェッチをスキップ
      if (initialItems?.length) {
        setLoading(false);
        return;
      }

      try {
        setErr("");
        setLoading(true);
        const anon = getOrCreateAnonId();
        const q = anon
          ? `teamId=${encodeURIComponent(teamId)}&anonId=${encodeURIComponent(anon)}`
          : `teamId=${encodeURIComponent(teamId)}`;
        const res = await fetch(`/api/threads?${q}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json();

        // API 側のキー名が items でも threads でも拾えるように
        const list: Item[] = Array.isArray(j?.items)
          ? j.items
          : Array.isArray(j?.threads)
          ? j.threads
          : Array.isArray(j)
          ? j
          : [];

        if (alive) {
          setRawItems(list);
          setItems(list);
        }
      } catch (e: any) {
        if (alive) setErr(e?.message || "load failed");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [teamId, initialItems]);

  // 翻訳取得: 「翻訳する」押下後のみ API（同一原文はサーバキャッシュ）。未実行時は DB 保存済み body 訳のみ表示。
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!rawItems.length) return;

      if (sameLanguage) {
        const withSame = rawItems.map((i) => ({
          ...i,
          title_t: i.title,
          body_t: i.body,
        }));
        if (!cancelled) setItems(withSame);
        return;
      }

      if (translationTrigger === 0) {
        const pending = rawItems.map((i) => ({
          ...i,
          title_t: "",
          body_t: (i.translatedBody ?? "").trim(),
        }));
        if (!cancelled) setItems(pending);
        return;
      }

      const uniqueTexts = new Set<string>();
      rawItems.forEach((i) => {
        const title = (i.title || "").trim();
        const body = (i.body || "").trim();
        if (title) uniqueTexts.add(title);
        if (body) uniqueTexts.add(body);
      });
      const list = Array.from(uniqueTexts);
      const map = new Map<string, string>();

      if (list.length > 0) {
        try {
          const res = await fetch("/api/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
            body: JSON.stringify({ q: list, target: targetLang }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            console.warn("[ThreadList] translate API not ok", res.status, data);
            if (!cancelled) setItems(rawItems);
            return;
          }
          const trs: string[] = Array.isArray(data?.translations) ? data.translations : [];
          list.forEach((txt, idx) => map.set(txt, (trs[idx] ?? "").trim()));
        } catch (e) {
          console.warn("[ThreadList] translate failed", e);
          if (!cancelled) setItems(rawItems);
          return;
        }
      }

      if (cancelled) return;
      const translated = rawItems.map((i) => {
        const titleSrc = (i.title || "").trim();
        const bodySrc = (i.body || "").trim();
        const title_t = titleSrc ? (map.get(titleSrc) ?? "") : "";
        const dbTranslatedBody = (i.translatedBody ?? "").trim();
        const body_t = dbTranslatedBody || (bodySrc ? (map.get(bodySrc) ?? "") : "");
        return { ...i, title_t, body_t };
      });
      setItems(translated);
    })();
    return () => {
      cancelled = true;
    };
  }, [rawItems, targetLang, sameLanguage, translationTrigger]);
  if (loading && !rawItems.length) return <div className="text-sm text-gray-600">{t("common.loading")}</div>;
  if (err) return <div className="text-red-600">{t("common.error")}: {err}</div>;
  if (!items.length) return <div className="text-sm text-gray-600">{t("board.noPosts")}</div>;

  return (
    <div className="border border-white/10 rounded divide-y divide-white/10 bg-white/[0.02]">
      {items.map((item) => {
        const created = item.createdAt ? new Date(item.createdAt) : null;
        const createdText =
          mounted && created
            ? new Intl.DateTimeFormat("ja-JP", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              }).format(created)
            : "";
        const noTranslation = sameLanguage;
        return (
          <div
            key={item.id}
            className="p-3 sm:p-4"
            data-thread-row={String(item.id)}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0 flex-1" />
              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                <BoardLikeToggle
                  kind="thread"
                  targetId={Number(item.id)}
                  initialLikeCount={item.threadLikeCount ?? 0}
                  initialLikedByMe={item.threadLikedByMe ?? false}
                />
                <Link
                  href={`/board/${teamId}/thread/${item.id}`}
                  className="text-xs border border-white/20 rounded px-2 py-1.5 hover:bg-white/10 text-white"
                >
                  {t("board.reply")}
                  {typeof item.postCount === "number" ? ` (${item.postCount})` : ""}
                </Link>
                <ReportButton
                  kind="thread"
                  targetId={Number(item.id)}
                  teamId={teamId}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div className="border border-white/10 rounded p-2.5 bg-white/[0.03] min-h-[60px]">
                <div className="text-[11px] uppercase tracking-wider text-white/50 mb-1">
                  {t("board.native")}
                </div>
                <div className="font-semibold text-sm text-white/95 whitespace-pre-wrap break-words">
                  {item.title ?? ""}
                </div>
                {item.body ? (
                  <div className="text-xs text-white/70 whitespace-pre-wrap mt-1.5 break-words">
                    {item.body}
                  </div>
                ) : null}
              </div>
              <div className="border border-white/10 rounded p-2.5 bg-white/[0.03] min-h-[60px]">
                <div className="text-[11px] uppercase tracking-wider text-white/50 mb-1">
                  {t("board.translation")}
                </div>
                {noTranslation ? (
                  <div className="text-xs text-white/50 italic">翻訳不要</div>
                ) : (
                  <>
                    {(() => {
                      const nativeTitle = item.title ?? "";
                      const nativeBody = item.body ?? "";
                      const translationTitle = (item.title_t ?? "").trim();
                      const translationBody = (item.body_t ?? "").trim();
                      const pendingHint =
                        translationTrigger === 0
                          ? "（ヘッダーの「翻訳する」で表示）"
                          : "";
                      const displayTitle =
                        translationTitle ||
                        (translationTrigger === 0 ? pendingHint : "(translation unavailable)");
                      const displayBody =
                        translationBody ||
                        (nativeBody
                          ? translationTrigger === 0
                            ? pendingHint
                            : "(translation unavailable)"
                          : "");
                      return (
                        <>
                          <div className="font-semibold text-sm text-white/95 whitespace-pre-wrap break-words">
                            {displayTitle}
                          </div>
                          {displayBody ? (
                            <div className="text-xs text-white/70 whitespace-pre-wrap mt-1.5 break-words">
                              {displayBody}
                            </div>
                          ) : null}
                        </>
                      );
                    })()}
                  </>
                )}
              </div>
            </div>

            {item.tacticsBoards && item.tacticsBoards.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {item.tacticsBoards.slice(0, 3).map((tb) => {
                  const viewData = lineupPayloadToTacticsBoardData(tb.data as LineupTacticPayload);
                  return viewData ? (
                    <Link
                      key={tb.id}
                      href={`/board/${teamId}/thread/${item.id}/tactics-board/${tb.id}`}
                      className="inline-flex items-center gap-1"
                    >
                      <TacticsLineupThumbnail data={viewData} />
                    </Link>
                  ) : null;
                })}
                {item.tacticsBoards.length > 3 && (
                  <Link
                    href={`/board/${teamId}/thread/${item.id}`}
                    className="text-xs text-white/60 underline"
                  >
                    +{item.tacticsBoards.length - 3}
                  </Link>
                )}
              </div>
            )}
            <div className="text-xs text-white/50 mt-2 flex flex-wrap gap-x-2">
              <span>{item.authorName || t("board.anonymous")}</span>
              {createdText && <span>・ {createdText}</span>}
              {typeof item.postCount === "number" && (
                <span>{t("board.replyCount", { count: item.postCount })}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
