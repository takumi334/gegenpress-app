import type { Report } from "@prisma/client";
import {
  getPublicSiteOrigin,
  PUBLIC_SITE_URL_FALLBACK_MESSAGE,
} from "@/lib/publicSiteUrl";
import prisma, { withPrismaRetry } from "@/lib/prisma";

function excerptFromText(parts: string[], max = 180): string {
  const s = parts
    .map((x) => (x ?? "").trim())
    .filter(Boolean)
    .join("\n")
    .replace(/\s+/g, " ")
    .trim();
  if (s.length <= max) return s || "（本文なし）";
  return `${s.slice(0, max)}…`;
}

export type BuiltReportMail = Awaited<ReturnType<typeof buildReportEmailContext>>;

export async function buildReportEmailContext(
  created: Report,
  teamIdHint?: number | null
) {
  const kind = created.kind.trim();
  const kindLabel =
    kind === "post" ? "返信" : kind === "thread" ? "スレッド" : kind;

  let teamId: number | null =
    teamIdHint != null && Number.isFinite(Number(teamIdHint))
      ? Number(teamIdHint)
      : null;
  let authorName: string | null = null;
  let createdAtIso: string | null = created.createdAt?.toISOString?.() ?? null;
  let excerptParts: string[] = [];
  let threadIdForReply: number | null = null;

  if (kind === "thread") {
    const th = await withPrismaRetry("buildReportEmail thread", () =>
      prisma.thread.findUnique({
        where: { id: created.targetId },
        select: { title: true, body: true, createdAt: true, teamId: true },
      })
    );
    if (th) {
      teamId = th.teamId;
      createdAtIso = th.createdAt.toISOString();
      excerptParts = [th.title, th.body];
    }
  } else if (kind === "post") {
    const po = await withPrismaRetry("buildReportEmail post", () =>
      prisma.post.findUnique({
        where: { id: created.targetId },
        select: {
          author: true,
          body: true,
          createdAt: true,
          threadId: true,
          thread: { select: { teamId: true } },
        },
      })
    );
    if (po) {
      threadIdForReply = po.threadId;
      teamId = po.thread.teamId;
      authorName = po.author?.trim() || null;
      createdAtIso = po.createdAt.toISOString();
      excerptParts = [po.body];
    }
  }

  const excerpt = excerptFromText(excerptParts);
  const origin = getPublicSiteOrigin();
  const siteUrlNote = origin ? undefined : PUBLIC_SITE_URL_FALLBACK_MESSAGE;

  let publicViewUrl = "";
  let publicBoardShortcutUrl = "";
  if (origin && teamId != null) {
    if (kind === "thread") {
      publicViewUrl = `${origin}/board/${teamId}?highlightThread=${created.targetId}`;
    } else if (kind === "post" && threadIdForReply != null) {
      publicViewUrl = `${origin}/board/${teamId}/thread/${threadIdForReply}?highlightReply=${created.targetId}`;
      publicBoardShortcutUrl = `${origin}/board/${teamId}?highlightReply=${created.targetId}`;
    }
  }

  const adminDeleteUrl = origin
    ? `${origin}/admin/reports?targetId=${encodeURIComponent(String(created.targetId))}&kind=${encodeURIComponent(kind)}`
    : "";

  return {
    id: created.id,
    kind,
    kindLabel,
    targetId: created.targetId,
    reason: created.reason,
    detail: created.detail,
    teamId,
    authorName,
    createdAtIso,
    excerpt,
    publicViewUrl,
    publicBoardShortcutUrl: publicBoardShortcutUrl || undefined,
    adminDeleteUrl,
    siteUrlNote,
  };
}
