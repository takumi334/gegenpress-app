// app/board/[team]/thread/[threadId]/page.tsx
// app/board/[team]/thread/[threadId]/page.tsx
import ThreadView from "./view"; // ← view.tsx を使うなら相対import

export default async function Page({
  params,
}: {
  params: { team: string; threadId: string };
}) {
  const resolved = await params;
  return (<>
    <ThreadView teamId={resolved.team} threadId={resolved.threadId} />
  </>);
}
