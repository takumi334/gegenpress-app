// app/board/[team]/thread/[threadId]/page.tsx
import Threadview from "./view";
import { getThreadById } from "@/lib/boardApi";
import { getTeamNameFromFD } from "@lib/team-resolver";
import { getCanonicalUrl } from "@/lib/publicSiteUrl";
import type { Metadata } from "next";

export const revalidate = 30;

/** Next.js App Router: params / searchParams は Promise（15+） */
type ThreadPageSearchParams = {
  error?: string;
  tactics_saved?: string;
  highlightReply?: string;
};

type ThreadPageProps = {
  params: Promise<{ team: string; threadId: string }>;
  searchParams?: Promise<ThreadPageSearchParams>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ team: string; threadId: string }>;
}): Promise<Metadata> {
  const { team, threadId } = await params;
  const id = Number(threadId);
  if (!id || isNaN(id)) return { title: "スレッド | Gegenpress" };
  const thread = await getThreadById(id);
  if (!thread) return { title: "スレッド | Gegenpress" };
  const teamName = await getTeamNameFromFD(team).catch(() => `Team ${team}`);
  const title = `${thread.title} | ${teamName}掲示板`;
  const desc = thread.body
    ? `${thread.body.slice(0, 120)}${thread.body.length > 120 ? "…" : ""}`
    : `${teamName}の海外サッカー掲示板。英語ファンコメントを翻訳付きで読め、試合予想や戦術議論も。`;
  return {
    title,
    description: desc,
    alternates: { canonical: getCanonicalUrl(`/board/${team}/thread/${threadId}`) },
  };
}

export default async function Page({ params, searchParams }: ThreadPageProps) {
  const resolved = await params;
  const teamId = resolved.team;
  const threadId = resolved.threadId;

  const q: ThreadPageSearchParams = await (searchParams ?? Promise.resolve({}));
  const errorParam = q.error;
  const tacticsSaved = q.tactics_saved;
  const highlightReplyId = q.highlightReply;

  return (
    <Threadview
      teamId={teamId}
      threadId={threadId}
      errorParam={errorParam}
      tacticsSaved={tacticsSaved}
      highlightReplyId={highlightReplyId}
    />
  );
}
