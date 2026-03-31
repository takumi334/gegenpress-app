"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isTacticsBoardCreateAllowed } from "@/lib/threadType";
import { TacticsBoardEditor } from "../../TacticsBoardEditor";
import { useT } from "@/lib/NativeLangProvider";

type PageProps = {
  params: Promise<{ team: string; threadId: string }>;
};

export default function NewTacticsBoardPage({ params }: PageProps) {
  const router = useRouter();
  const t = useT();
  const [resolved, setResolved] = useState<{ team: string; threadId: string } | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(setResolved);
  }, [params]);

  useEffect(() => {
    if (!resolved?.threadId) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/threads/${resolved.threadId}`)
      .then((r) => r.json())
      .then((data: { threadType?: string | null }) => {
        if (!cancelled) setAllowed(isTacticsBoardCreateAllowed(data.threadType));
      })
      .catch(() => {
        if (!cancelled) setAllowed(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resolved?.threadId]);

  const handleSaved = useCallback(() => {
    if (resolved) {
      router.push(`/board/${resolved.team}/thread/${resolved.threadId}?tactics_saved=1`);
    }
  }, [resolved, router]);

  if (loading || !resolved) {
    return (
      <main className="p-4">
        <p className="text-sm text-gray-500">{t("common.loading")}</p>
      </main>
    );
  }

  if (!allowed) {
    router.replace(
      `/board/${resolved.team}/thread/${resolved.threadId}?error=tactics_not_allowed`
    );
    return (
      <main className="p-4">
        <p className="text-sm text-gray-500">{t("common.redirecting")}</p>
      </main>
    );
  }

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
      <TacticsBoardEditor
        teamId={resolved.team}
        threadId={resolved.threadId}
        onSaved={handleSaved}
      />
    </main>
  );
}
