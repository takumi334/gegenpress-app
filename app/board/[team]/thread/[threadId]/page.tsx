// app/board/[team]/thread/[threadId]/page.tsx
import Threadview from "./view";

type PageProps = {
  params: Promise<{ team: string; threadId: string }>;
};

export default async function Page({ params }: PageProps) {
  const resolved = await params; // ← ここがポイント（Promiseを解決）
  const teamId = resolved.team;
  const threadId = resolved.threadId;

  return <Threadview teamId={teamId} threadId={threadId} />;
}
