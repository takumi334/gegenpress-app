// POST /api/cron/create-scheduled?teamId=57
// predict の fixture に基づき ScheduledPost を 3件作成（既存ならスキップ）
import { NextRequest, NextResponse } from "next/server";
import { prisma, withPrismaRetry } from "@/lib/prisma";
import { getPredictJsonForTeam } from "@/lib/predictCacheService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LINEUP_BODY = `【予想スタメン誘導文】
- フォメ・出場予想
- 怪我人の有無
- キープレイヤーを箇条書きで`;

const HALFTIME_BODY = `【後半作戦会議テンプレ】
前半の問題点：
- 
修正案：
- `;

const POSTMATCH_BODY = `【お疲れ様会テンプレ】
採点(10段階)：ー/10
MOM：
次節への一言：`;

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("authorization")?.replace("Bearer ", "")
      ?? req.headers.get("x-cron-secret")
      ?? req.nextUrl.searchParams.get("secret");
    const expected = process.env.CRON_SECRET;
    if (expected && secret !== expected) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const teamIdStr = req.nextUrl.searchParams.get("teamId")?.trim();
    if (!teamIdStr || !/^\d+$/.test(teamIdStr)) {
      return NextResponse.json({ error: "teamId required" }, { status: 400 });
    }
    const teamId = Number(teamIdStr);

    const { json: data } = await getPredictJsonForTeam(teamIdStr);
    const fixture = data?.fixture as { utcDate?: string; id?: number; teams?: { home?: { name?: string }; away?: { name?: string } } } | undefined;
    if (!fixture?.utcDate) {
      return NextResponse.json({ ok: true, created: 0, message: "no fixture" });
    }

    const kickoff = new Date(fixture.utcDate);
    const home = fixture?.teams?.home?.name ?? "Home";
    const away = fixture?.teams?.away?.name ?? "Away";
    const koTime = kickoff.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
    const fixtureId = fixture?.id ?? 0;

    const specs = [
      {
        type: "LINEUP",
        runAt: new Date(kickoff.getTime() - 60 * 60 * 1000),
        title: `【予想スタメン】${home} vs ${away}（Kickoff ${koTime}）`,
        body: LINEUP_BODY,
      },
      {
        type: "HALFTIME",
        runAt: new Date(kickoff.getTime() + 45 * 60 * 1000),
        title: `【後半作戦会議】${home} vs ${away}（HT）`,
        body: HALFTIME_BODY,
      },
      {
        type: "POSTMATCH",
        runAt: new Date(kickoff.getTime() + 120 * 60 * 1000),
        title: `【お疲れ様会】${home} vs ${away}（FT）`,
        body: POSTMATCH_BODY,
      },
    ];

    let created = 0;
    const scheduledPost = (prisma as any).scheduledPost;
    for (const s of specs) {
      const runAtLo = new Date(s.runAt.getTime() - 5 * 60000);
      const runAtHi = new Date(s.runAt.getTime() + 5 * 60000);
      const existing = await withPrismaRetry("POST /api/cron/create-scheduled scheduledPost.findFirst", () =>
        scheduledPost.findFirst({
          where: {
            teamId,
            type: s.type,
            runAt: { gte: runAtLo, lte: runAtHi },
            postedAt: null,
          },
        })
      );
      if (existing) continue;

      await withPrismaRetry("POST /api/cron/create-scheduled scheduledPost.create", () =>
        scheduledPost.create({
          data: {
            teamId,
            fixtureId,
            type: s.type,
            title: s.title,
            body: s.body,
            runAt: s.runAt,
          },
        })
      );
      created++;
    }

    return NextResponse.json({ ok: true, created, total: specs.length });
  } catch (e: any) {
    console.error("create-scheduled error:", e);
    return NextResponse.json({ error: e?.message ?? "internal error" }, { status: 500 });
  }
}
