// app/board/[team]/thread/[threadId]/page.tsx
import Threadview from "./view";
import { getThreadById } from "@/lib/boardApi";
import { getTeamNameFromFD } from "@lib/team-resolver";
import type { Metadata } from "next";

type PageProps = {
  params: Promise<{ team: string; threadId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { team, threadId } = await params;
  const id = Number(threadId);
  if (!id || isNaN(id)) return { title: "スレッド | Gegenpress" };
  const thread = await getThreadById(id);
  if (!thread) return { title: "スレッド | Gegenpress" };
  const teamName = await getTeamNameFromFD(team).catch(() => `Team ${team}`);
  const title = `${thread.title} | ${teamName}掲示板`;
  const desc = thread.body
    ? `${thread.body.slice(0, 120)}${thread.body.length > 120 ? "…" : ""}`
    : `${teamName}の海外サッカー掲示板。海外ファンの反応や試合予想を翻訳付きでチェック。`;
  return { title, description: desc };
}

type SearchProps = { searchParams?: Promise<{ error?: string; tactics_saved?: string }> };

export default async function Page({ params, searchParams }: PageProps & SearchProps) {
  const resolved = await params;
  const teamId = resolved.team;
  const threadId = resolved.threadId;
  const q = await (searchParams ?? Promise.resolve({}));
  const errorParam = q?.error;
  const tacticsSaved = q?.tactics_saved;

  return (
    <Threadview
      teamId={teamId}
      threadId={threadId}
      errorParam={errorParam}
      tacticsSaved={tacticsSaved}
    />
  );
}
