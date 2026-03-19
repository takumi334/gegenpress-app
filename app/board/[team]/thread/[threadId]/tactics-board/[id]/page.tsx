"use client";

import { useMemo, useEffect, useState } from "react";
import Link from "next/link";
import TacticsLineupView from "@components/lineup/TacticsLineupView";
import type { TacticsBoardData } from "@/lib/tacticsPlacements";
import { boardRecordDataToViewData } from "@/lib/tacticsBoardViewData";
import { useT } from "@/lib/NativeLangProvider";
import { usePostTranslation } from "@/lib/PostTranslationContext";
import { stripDataUrlsFromText } from "@/lib/tacticsPostBody";

type PageProps = {
  params: Promise<{ team: string; threadId: string; id: string }>;
};

type Board = {
  id: number;
  mode: string;
  title: string;
  body: string;
  data: unknown;
  createdAt: string;
};

export default function TacticsBoardDetailPage({ params }: PageProps) {
  const t = useT();
  const { targetLang, sameLanguage } = usePostTranslation();
  const [resolved, setResolved] = useState<{ team: string; threadId: string; id: string } | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [translatedBody, setTranslatedBody] = useState<string | null>(null);
  const [viewDataWithTranslation, setViewDataWithTranslation] = useState<TacticsBoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then(setResolved);
  }, [params]);

  useEffect(() => {
    if (!resolved?.threadId || !resolved?.id) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/threads/${resolved.threadId}/tactics-boards/${resolved.id}`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(t("tactics.fetchFailed"));
        return r.json();
      })
      .then((data: Board) => {
        if (!cancelled) setBoard(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? t("common.error"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resolved?.threadId, resolved?.id]);

  // 投稿詳細と同じく、翻訳を取得してGIFに反映する
  useEffect(() => {
    let cancelled = false;
    setTranslatedBody(null);
    const body = board?.body ?? "";
    const textToTranslate = (stripDataUrlsFromText(body) || body).trim();
    if (!textToTranslate || sameLanguage) return;
    (async () => {
      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ q: [textToTranslate], target: targetLang }),
        });
        if (!res.ok) throw new Error("translate failed");
        const j = await res.json().catch(() => ({}));
        const trs: string[] = Array.isArray(j?.translations) ? j.translations : [];
        if (!cancelled && trs[0] != null) setTranslatedBody(trs[0]);
      } catch {
        if (!cancelled) setTranslatedBody(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [board?.body, targetLang, sameLanguage]);

  const viewData = useMemo(() => boardRecordDataToViewData(board?.data), [board?.data]);

  useEffect(() => {
    if (!viewData?.placements?.length) {
      setViewDataWithTranslation(viewData ?? null);
      return;
    }
    if (sameLanguage) {
      setViewDataWithTranslation(viewData);
      return;
    }
    let cancelled = false;
    const uniqueNames = [...new Set(viewData.placements.map((p) => p.playerName).filter(Boolean))];
    if (uniqueNames.length === 0) {
      setViewDataWithTranslation(viewData);
      return;
    }
    fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ q: uniqueNames, target: targetLang }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("translate failed"))))
      .then((j: { translations?: string[] }) => {
        const trs = Array.isArray(j?.translations) ? j.translations : [];
        const nameToTranslated = new Map<string, string>();
        uniqueNames.forEach((name, i) => {
          nameToTranslated.set(name, trs[i] ?? name);
        });
        if (!cancelled) {
          setViewDataWithTranslation({
            ...viewData,
            placements: viewData.placements.map((p) => ({
              ...p,
              translatedName: nameToTranslated.get(p.playerName) ?? p.playerName,
            })),
          });
        }
      })
      .catch(() => {
        if (!cancelled) setViewDataWithTranslation(viewData);
      });
    return () => {
      cancelled = true;
    };
  }, [viewData, targetLang, sameLanguage]);

  const dataForView = viewDataWithTranslation ?? viewData;

  if (loading || !resolved) {
    return (
      <main className="p-4">
        <p className="text-sm text-gray-500">{t("common.loading")}</p>
      </main>
    );
  }
  if (error || !board) {
    return (
      <main className="p-4">
        <p className="text-sm text-red-600">{error ?? t("common.notFound")}</p>
        <Link
          href={`/board/${resolved.team}/thread/${resolved.threadId}`}
          className="text-sm text-blue-600 hover:underline mt-2 inline-block"
        >
          {t("common.backToThread")}
        </Link>
      </main>
    );
  }

  const rawNativeBody = board.body ?? "";
  const sanitizedNativeBody = stripDataUrlsFromText(rawNativeBody);
  const exportNativeBody = sanitizedNativeBody || rawNativeBody || undefined;

  const rawTranslatedBody = translatedBody ?? "";
  const sanitizedTranslatedBody = stripDataUrlsFromText(rawTranslatedBody);
  const exportTranslatedBody = sanitizedTranslatedBody || rawTranslatedBody || undefined;

  return (
    <main className="p-4 max-w-2xl mx-auto">
      <div className="mb-4">
        <Link
          href={`/board/${resolved.team}/thread/${resolved.threadId}`}
          className="text-sm text-gray-600 hover:underline"
        >
          {t("common.backToThread")}
        </Link>
      </div>
      <article className="border rounded p-4 bg-white">
        <div className="text-xs text-gray-500">
          {board.mode === "LIVE_MATCH" ? t("tactics.liveTacticsMemo") : t("tactics.preMatchBoard")} ·{" "}
          {new Date(board.createdAt).toLocaleString("ja-JP")}
        </div>
        {board.title ? <h1 className="text-lg font-bold mt-1">{board.title}</h1> : null}
        <div className="mt-3 flex flex-col sm:flex-row flex-wrap gap-2 items-stretch sm:items-center">
          <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 flex-1 min-w-0">
            {t("tactics.viewerHint")}
          </p>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Link
              href={`/board/${resolved.team}/thread/${resolved.threadId}/tactics-board/${resolved.id}/edit`}
              className="inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium"
            >
              {t("tactics.editBoard")}
            </Link>
            <Link
              href={`/board/${resolved.team}/thread/${resolved.threadId}/tactics-board/new`}
              className="inline-flex items-center justify-center px-3 py-1.5 rounded-md border border-gray-300 text-gray-800 hover:bg-gray-50 text-sm font-medium"
            >
              {t("tactics.newBoard")}
            </Link>
          </div>
        </div>
        {dataForView ? (
          <div className="mt-4">
            <TacticsLineupView
              data={dataForView}
              exportFileName={`tactics-board-${board.id}.gif`}
              exportNativeBody={exportNativeBody}
              exportTranslatedBody={exportTranslatedBody}
              copyNativeBody={sanitizedNativeBody || undefined}
              copyTranslatedBody={sanitizedTranslatedBody || undefined}
              copyTargetPath={resolved ? `/board/${resolved.team}/thread/${resolved.threadId}/tactics-board/${resolved.id}` : undefined}
            />
          </div>
        ) : null}
        {board.body ? (
          <div className="mt-2 whitespace-pre-wrap text-sm">{board.body}</div>
        ) : (
          <p className="text-sm text-gray-500 mt-2">{t("tactics.noNote")}</p>
        )}
      </article>
    </main>
  );
}
