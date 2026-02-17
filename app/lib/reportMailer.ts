// lib/reportMailer.ts
import { Resend } from "resend";

type ReportMailArgs = {
  id: number | string;
  kind: string;
  targetId: number | string;
  reason?: string | null;
  teamId?: number | string | null;
  url?: string;
};

export async function sendReportMail(args: ReportMailArgs) {
  console.log("🔥 sendReportMail CALLED", args);

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.REPORT_TO_EMAIL;
  const from = process.env.REPORT_FROM_EMAIL; // ← 明示的に必須にする（事故防止）

  if (!apiKey) throw new Error("RESEND_API_KEY is missing");
  if (!to) throw new Error("REPORT_TO_EMAIL is missing");
  if (!from) throw new Error("REPORT_FROM_EMAIL is missing (verify a domain and set it)");

  const resend = new Resend(apiKey);

  const subject = `【通報】${args.kind} #${args.targetId} (${args.reason ?? "no-reason"})`;

  const text = [
    `Report ID: ${args.id}`,
    `Kind: ${args.kind}`,
    `TargetId: ${args.targetId}`,
    `Reason: ${args.reason ?? ""}`,
    `TeamId: ${args.teamId ?? ""}`,
    args.url ? `URL: ${args.url}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  console.log("🔥 BEFORE resend.emails.send", { from, to, subject });

  const result = await resend.emails.send({
    from,      // 例: "Gegenpress <noreply@yourdomain.com>"
    to,        // 例: "あなたのGmail"
    subject,
    text,
  });

  console.log("🔥 AFTER resend.emails.send result:", result);

  // Resendは失敗時 result.error が入ることがある
  const anyResult = result as any;
  if (anyResult?.error) {
    throw new Error(anyResult.error?.message ?? String(anyResult.error));
  }

  return result;
}

