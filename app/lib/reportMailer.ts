// lib/reportMailer.ts
import { Resend } from "resend";

export type ReportMailContext = {
  id: number;
  /** DB の kind（thread / post） */
  kind: string;
  /** メール表示用（スレッド / 返信） */
  kindLabel: string;
  targetId: number;
  reason?: string | null;
  detail?: string | null;
  teamId?: number | null;
  authorName?: string | null;
  createdAtIso?: string | null;
  excerpt: string;
  publicViewUrl: string;
  /** 返信のみ: 掲示板トップからのショートカット（自動でスレッドへ） */
  publicBoardShortcutUrl?: string;
  /** 空ならメールに載せない（秘密未設定など） */
  adminDeleteUrl: string;
  /** 本番 URL が使えないときの注記 */
  siteUrlNote?: string;
};

export async function sendReportMail(args: ReportMailContext) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.REPORT_TO_EMAIL;
  const from = process.env.REPORT_FROM_EMAIL;

  if (!apiKey) throw new Error("RESEND_API_KEY is missing");
  if (!to) throw new Error("REPORT_TO_EMAIL is missing");
  if (!from) throw new Error("REPORT_FROM_EMAIL is missing (verify a domain and set it)");

  const resend = new Resend(apiKey);

  const subject = `【通報】${args.kindLabel} #${args.targetId} (report ${args.id}) — ${args.reason ?? "no-reason"}`;

  const lines = [
    `reportId: ${args.id}`,
    `種別（DB kind）: ${args.kind}（表示: ${args.kindLabel}）`,
    `targetId: ${args.targetId}`,
    `teamId: ${args.teamId ?? "（不明）"}`,
    `reason: ${args.reason ?? ""}`,
    args.detail ? `detail: ${args.detail}` : "",
    `投稿者名: ${args.authorName ?? "（匿名／スレッドの場合はタイトル参照）"}`,
    `投稿日時: ${args.createdAtIso ?? "（不明）"}`,
    "",
    "── 対象本文抜粋（先頭付近） ──",
    args.excerpt,
    "",
    "── リンク ──",
    args.publicViewUrl
      ? `一般確認URL（直接）:\n${args.publicViewUrl}`
      : `一般確認URL:\n（生成できませんでした）${args.siteUrlNote ? `\n${args.siteUrlNote}` : ""}`,
    args.publicBoardShortcutUrl
      ? `一般確認URL（掲示板経由・返信ハイライト）:\n${args.publicBoardShortcutUrl}`
      : "",
    "",
    args.adminDeleteUrl
      ? `管理者対応:\n管理画面（ADMIN_KEY）から削除してください\n${args.adminDeleteUrl}`
      : `管理者対応:\nADMIN_KEY で管理画面から削除してください`,
    args.siteUrlNote && args.publicViewUrl
      ? `\n※ URL ベース: ${args.siteUrlNote}`
      : "",
  ];

  const text = lines.filter(Boolean).join("\n");

  const result = await resend.emails.send({
    from,
    to,
    subject,
    text,
  });

  const anyResult = result as { error?: { message?: string } };
  if (anyResult?.error) {
    throw new Error(anyResult.error?.message ?? String(anyResult.error));
  }

  return result;
}
