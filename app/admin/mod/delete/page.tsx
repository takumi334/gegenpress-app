import { verifyAdminDeleteToken } from "@/lib/adminDeleteToken";
import prisma from "@/lib/prisma";
import DeleteConfirmForm from "./DeleteConfirmForm";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function AdminModDeletePage({ searchParams }: PageProps) {
  const { token: rawToken } = await searchParams;
  const token = typeof rawToken === "string" ? rawToken.trim() : "";

  if (!token) {
    return (
      <main className="mx-auto max-w-lg p-6 text-white">
        <h1 className="text-lg font-semibold mb-2">403</h1>
        <p className="text-white/80 text-sm">トークンがありません。</p>
      </main>
    );
  }

  const payload = verifyAdminDeleteToken(token);
  if (!payload) {
    return (
      <main className="mx-auto max-w-lg p-6 text-white">
        <h1 className="text-lg font-semibold mb-2">403</h1>
        <p className="text-white/80 text-sm">
          トークンが無効か期限切れです。メールに記載の新しいリンクを確認してください。
        </p>
      </main>
    );
  }

  const report = await prisma.report.findUnique({
    where: { id: payload.reportId },
  });

  const mismatch =
    !report ||
    report.targetId !== payload.targetId ||
    report.kind !== payload.type;

  if (mismatch) {
    return (
      <main className="mx-auto max-w-lg p-6 text-white">
        <h1 className="text-lg font-semibold mb-2">403</h1>
        <p className="text-white/80 text-sm">
          通報レコードとトークンが一致しません。既に処理済みか、URL が改ざんされています。
        </p>
      </main>
    );
  }

  let targetSummary = "";
  if (payload.type === "thread") {
    const th = await prisma.thread.findUnique({
      where: { id: payload.targetId },
      select: { title: true, body: true, teamId: true, deletedAt: true },
    });
    targetSummary = th
      ? `スレッド ID ${payload.targetId}\nteamId: ${th.teamId}\nタイトル: ${th.title}\n本文抜粋: ${(th.body || "").slice(0, 200)}${(th.body || "").length > 200 ? "…" : ""}\n状態: ${th.deletedAt ? "既に非表示（soft delete）" : "表示中"}`
      : `スレッド ID ${payload.targetId}（DB に存在しません）`;
  } else {
    const po = await prisma.post.findUnique({
      where: { id: payload.targetId },
      select: { body: true, threadId: true, author: true },
    });
    targetSummary = po
      ? `返信（投稿）ID ${payload.targetId}\nthreadId: ${po.threadId}\n投稿者: ${po.author ?? "（匿名）"}\n本文抜粋: ${(po.body || "").slice(0, 200)}${(po.body || "").length > 200 ? "…" : ""}`
      : `返信 ID ${payload.targetId}（DB に存在しません）`;
  }

  const summary = [
    "以下の対象を削除しようとしています。内容を確認してください。",
    "",
    `reportId: ${payload.reportId}`,
    `targetId: ${payload.targetId}`,
    `type: ${payload.type}`,
    `reason: ${report.reason ?? "—"}`,
    report.detail ? `detail: ${report.detail}` : "",
    "",
    "── 対象 ──",
    targetSummary,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <main className="mx-auto max-w-lg p-6 text-white space-y-4">
      <h1 className="text-xl font-semibold">管理者：削除の確認</h1>
      <p className="text-sm text-white/70">
        この URL はメール経由でのみ共有してください。一般公開ページには表示されません。
      </p>
      <DeleteConfirmForm token={token} summary={summary} />
    </main>
  );
}
