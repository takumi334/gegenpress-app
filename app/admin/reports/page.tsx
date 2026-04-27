import { prisma } from "@/lib/prisma";
import { DeleteThreadButton } from "./DeleteThreadButton";
import AdminKeyInput from "./AdminKeyInput";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams?: Promise<{ targetId?: string; kind?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const filterTargetId = Number(sp.targetId ?? "");
  const filterKind = (sp.kind ?? "").trim();
  const items = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const filteredItems = items.filter((r) => {
    if (Number.isFinite(filterTargetId) && r.targetId !== filterTargetId) return false;
    if (filterKind && r.kind !== filterKind) return false;
    return true;
  });
  const threadIds = filteredItems
    .filter((r) => r.kind === "thread")
    .map((r) => Number(r.targetId))
    .filter((id) => Number.isFinite(id));
  const postIds = filteredItems
    .filter((r) => r.kind === "post")
    .map((r) => Number(r.targetId))
    .filter((id) => Number.isFinite(id));

  const [threads, posts] = await Promise.all([
    threadIds.length
      ? prisma.thread.findMany({
          where: { id: { in: threadIds } },
          select: { id: true, teamId: true, title: true, body: true, deletedAt: true },
        })
      : Promise.resolve([]),
    postIds.length
      ? prisma.post.findMany({
          where: { id: { in: postIds } },
          select: {
            id: true,
            body: true,
            threadId: true,
            thread: { select: { teamId: true, title: true, deletedAt: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const threadMap = new Map(threads.map((t) => [t.id, t]));
  const postMap = new Map(posts.map((p) => [p.id, p]));

  return (
    <div style={{ padding: 24 }}>
      <AdminKeyInput />
      <h1>Reports</h1>
      {(Number.isFinite(filterTargetId) || filterKind) ? (
        <div style={{ marginBottom: 8, color: "#444", fontSize: 13 }}>
          Filter: targetId={Number.isFinite(filterTargetId) ? String(filterTargetId) : "-"}, kind={filterKind || "-"}
        </div>
      ) : null}

      <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th align="left">createdAt</th>
            <th align="left">kind</th>
            <th align="left">targetId</th>
            <th align="left">reason</th>
            <th align="left">teamId</th>
            <th align="left">threadId</th>
            <th align="left">title</th>
            <th align="left">body</th>
            <th align="left">deletedAt</th>
            <th align="left">status</th>
            <th align="left">url</th>
            <th align="left">action</th>
          </tr>
        </thead>

        <tbody>
          {filteredItems.map((r) => {
            const thread = r.kind === "thread" ? threadMap.get(Number(r.targetId)) : null;
            const post = r.kind === "post" ? postMap.get(Number(r.targetId)) : null;
            const teamId = thread?.teamId ?? post?.thread?.teamId ?? "";
            const threadId = thread?.id ?? post?.threadId ?? "";
            const title = thread?.title ?? post?.thread?.title ?? "";
            const body = thread?.body ?? post?.body ?? "";
            const deletedAt = thread?.deletedAt ?? post?.thread?.deletedAt ?? null;

            return (
              <tr key={r.id} style={{ borderTop: "1px solid #ddd" }}>
                <td>{new Date(r.createdAt).toLocaleString()}</td>
                <td>{r.kind}</td>
                <td>{String(r.targetId)}</td>
                <td>{r.reason ?? ""}</td>
                <td>{teamId ? String(teamId) : ""}</td>
                <td>{threadId ? String(threadId) : ""}</td>
                <td style={{ maxWidth: 220, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {title}
                </td>
                <td style={{ maxWidth: 300, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {body}
                </td>
                <td>{deletedAt ? new Date(deletedAt).toLocaleString() : ""}</td>
                <td>{deletedAt ? "削除済み" : "表示中"}</td>
                <td>
                  {r.pageUrl ? (
                    <a href={r.pageUrl} target="_blank" rel="noreferrer">
                      open
                    </a>
                  ) : (
                    ""
                  )}
                </td>
                <td>
                  {r.kind === "thread" ? (
                    <DeleteThreadButton id={Number(r.targetId)} deletedAt={thread?.deletedAt ? thread.deletedAt.toISOString() : null} />
                  ) : (
                    <span>-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
