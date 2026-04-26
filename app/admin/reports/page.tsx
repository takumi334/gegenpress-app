import { prisma } from "@/lib/prisma";
import { DeleteThreadButton } from "./DeleteThreadButton";
import AdminAuthPanel from "./AdminAuthPanel";
import { isAllowedAdminEmail } from "@/lib/adminUser";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export default async function AdminReportsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const signedInEmail = user?.email?.trim().toLowerCase() ?? null;
  const canManage = isAllowedAdminEmail(signedInEmail);

  if (!canManage) {
    return (
      <div style={{ padding: 24 }}>
        <AdminAuthPanel signedInEmail={signedInEmail} canManage={false} />
        <p style={{ color: "#444", fontSize: 14 }}>
          管理画面は管理者ログイン後のみ利用できます。
        </p>
      </div>
    );
  }

  const items = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const threadIds = items
    .filter((r) => r.kind === "thread")
    .map((r) => Number(r.targetId))
    .filter((id) => Number.isFinite(id));
  const postIds = items
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
      <AdminAuthPanel signedInEmail={signedInEmail} canManage />
      <h1>Reports</h1>

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
            <th align="left">url</th>
            <th align="left">action</th>
          </tr>
        </thead>

        <tbody>
          {items.map((r) => {
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
