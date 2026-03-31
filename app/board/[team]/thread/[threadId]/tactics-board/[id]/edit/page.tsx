"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isTacticsBoardCreateAllowed } from "@/lib/threadType";
import { TacticsBoardEditor } from "../../../TacticsBoardEditor";
import { useT } from "@/lib/NativeLangProvider";
import { boardRecordDataToViewData } from "@/lib/tacticsBoardViewData";
import { tacticsBoardDataToBuilderInitial } from "@/lib/tacticsBoardEditInitial";

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

export default function EditTacticsBoardPage({ params }: PageProps) {
  const router = useRouter();
  const t = useT();
  const [resolved, setResolved] = useState<{ team: string; threadId: string; id: string } | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then(setResolved);
  }, [params]);

  useEffect(() => {
    if (!resolved?.threadId || !resolved?.id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`/api/threads/${resolved.threadId}/tactics-boards/${resolved.id}`).then(
        (r) => {
          if (!r.ok) throw new Error(t("tactics.fetchFailed"));
          return r.json();
        }
      ),
      fetch(`/api/threads/${resolved.threadId}`)
        .then((r) => r.json())
        .then((data: { threadType?: string | null }) => isTacticsBoardCreateAllowed(data.threadType))
        .catch(() => false),
    ])
      .then(([b, ok]: [Board, boolean]) => {
        if (!cancelled) {
          setBoard(b);
          setAllowed(ok);
        }
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
  }, [resolved?.threadId, resolved?.id, t]);

  const handleSaved = useCallback(() => {
    if (resolved) {
      router.push(`/board/${resolved.team}/thread/${resolved.threadId}/tactics-board/${resolved.id}`);
    }
  }, [resolved, router]);

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

  if (allowed === false) {
    router.replace(`/board/${resolved.team}/thread/${resolved.threadId}?error=tactics_not_allowed`);
    return (
      <main className="p-4">
        <p className="text-sm text-gray-500">{t("common.redirecting")}</p>
      </main>
    );
  }

  const viewData = boardRecordDataToViewData(board.data);
  const builderInitial =
    tacticsBoardDataToBuilderInitial(viewData) ?? {
      formation: "4-3-3" as const,
      assignments: {},
      initialAnimationFrames: undefined,
      initialCurrentFrame: 0,
    };

  return (
    <main className="p-4 max-w-2xl mx-auto">
      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <Link
          href={`/board/${resolved.team}/thread/${resolved.threadId}/tactics-board/${resolved.id}`}
          className="text-sm text-gray-600 hover:underline"
        >
          ← {t("tactics.backToView")}
        </Link>
        <Link
          href={`/board/${resolved.team}/thread/${resolved.threadId}`}
          className="text-sm text-gray-600 hover:underline"
        >
          {t("common.backToThread")}
        </Link>
      </div>
      <TacticsBoardEditor
        teamId={resolved.team}
        threadId={resolved.threadId}
        editBoardId={board.id}
        initialTitle={board.title ?? ""}
        initialBody={board.body ?? ""}
        initialFormation={builderInitial.formation}
        initialAssignments={builderInitial.assignments}
        initialAnimationFrames={builderInitial.initialAnimationFrames}
        initialCurrentFrame={builderInitial.initialCurrentFrame}
        onSaved={handleSaved}
      />
    </main>
  );
}
