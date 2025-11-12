// app/board/[team]/thread/[threadId]/page.tsx
// app/board/[team]/thread/[threadId]/page.tsx
import ThreadView from "./view"; // ← view.tsx を使うなら相対import

export default function Page({
  params,
}: {
  params: { team: string; threadId: string };
}) {
  return <ThreadView teamId={params.team} threadId={params.threadId} />;
}
