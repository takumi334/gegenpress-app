/**
 * 次の試合情報から ScheduledPost を upsert する。
 * /api/predict の処理の最後で呼び、予定だけ作成する（投稿は cron が実行）。
 */
import "server-only";
import { prisma, withPrismaRetry } from "@/lib/prisma";

// schema の model ScheduledPost → delegate は prisma.scheduledPost。
// 赤波線時は dev 停止 → npx prisma generate → 「TypeScript: Restart TS server」。通ったら (prisma as any) を外して prisma.scheduledPost に戻してよい。

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

export type NextFixtureData = {
  fixtureId?: number | null;
  utcDate: string;
  homeName: string;
  awayName: string;
};

const FIXTURE_ID_NONE = 0;

/**
 * 予測API/fixture から取得した「次の試合」をもとに ScheduledPost を 3件 upsert する。
 * @@unique([teamId, fixtureId, type]) で重複防止。
 */
export async function ensureScheduledPostsForNextFixture(
  teamId: number,
  fixture: NextFixtureData
): Promise<{ created: number }> {
  const kickoff = new Date(fixture.utcDate);
  const home = fixture.homeName || "Home";
  const away = fixture.awayName || "Away";
  const koStr = kickoff.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const fixtureIdDb = fixture.fixtureId ?? FIXTURE_ID_NONE;

  const specs = [
    {
      type: "LINEUP" as const,
      runAt: new Date(kickoff.getTime() - 60 * 60 * 1000),
      title: `【予想スタメン】${home} vs ${away}（Kickoff: ${koStr}）`,
      body: LINEUP_BODY,
    },
    {
      type: "HALFTIME" as const,
      runAt: new Date(kickoff.getTime() + 45 * 60 * 1000),
      title: `【後半会議】${home} vs ${away}（HT）`,
      body: HALFTIME_BODY,
    },
    {
      type: "POSTMATCH" as const,
      runAt: new Date(kickoff.getTime() + 120 * 60 * 1000),
      title: `【お疲れ様会】${home} vs ${away}（FT）`,
      body: POSTMATCH_BODY,
    },
  ];

  let created = 0;
  for (const s of specs) {
    try {
      await withPrismaRetry(`scheduler ensureScheduledPosts ${s.type}`, () =>
        (prisma as any).scheduledPost.upsert({
          where: {
            teamId_fixtureId_type: {
              teamId,
              fixtureId: fixtureIdDb,
              type: s.type,
            },
          },
          create: {
            teamId,
            fixtureId: fixtureIdDb,
            type: s.type,
            title: s.title,
            body: s.body,
            runAt: s.runAt,
          },
          update: {
            title: s.title,
            body: s.body,
            runAt: s.runAt,
          },
        })
      );
      created++;
    } catch (e: any) {
      if (e?.code === "P2002") continue;
      throw e;
    }
  }
  return { created };
}
