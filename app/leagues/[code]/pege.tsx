// app/leagues/[code]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { fdFetch } from "@/app/lib/fd"; // ← named import（defaultじゃない）
import type { LeagueId } from "@/app/lib/fd";

/** Football-Data: 文字コード/数値IDどちらでも呼べるが
 *  まずコード（PL/PD...）で呼び、失敗したら数値IDにフォールバックする
 */
const CODE_TO_NUM: Record<string, number> = {
  PL: 2021,  // Premier League
  PD: 2014,  // La Liga  ← LLではなくPDが正しい
  SA: 2019,  // Serie A
  BL1: 2002, // Bundesliga
  FL1: 2015, // Ligue 1
  DED: 2003, // Eredivisie
  PPL: 2017, // Primeira Liga
  CL: 2001,  // UEFA Champions League
};

const LEAGUE_NAME: Record<keyof typeof CODE_TO_NUM, string> = {
  PL: "Premier League",
  PD: "La Liga",
  SA: "Serie A",
  BL1: "Bundesliga",
  FL1: "Ligue 1",
  DED: "Eredivisie",
  PPL: "Primeira Liga",
  CL: "UEFA Champions League",
};

type FdTeamsResp = {
  teams: { id: number; name: string; tla?: string }[];
};

export default async function LeaguePage({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();

  // コードが未知なら404
  if (!(code in CODE_TO_NUM)) return notFound();

  // 1) まずコードで取得を試す（/competitions/PL/teams）
  let data: FdTeamsResp | null = null;
  try {
    data = await fdFetch<FdTeamsResp>(`/competitions/${code}/teams`);
  } catch {
    // 2) うまくいかなければ数値IDにフォールバック（/competitions/2021/teams）
    const id = CODE_TO_NUM[code];
    data = await fdFetch<FdTeamsResp>(`/competitions/${id}/teams`);
  }

  const teams = data?.teams ?? [];

  return (
    <main className="mx-auto max-w-4xl p-4 space-y-6">
      <h1 className="text-2xl font-bold">{LEAGUE_NAME[code as LeagueId]}</h1>

      <ul className="divide-y rounded border">
        {teams.map((t) => (
          <li key={t.id} className="p-3 flex items-center justify-between">
            <div>{t.name}</div>
            <Link
              href={`/team/${toSlug(t.name)}`}
              className="text-blue-500 hover:underline"
            >
              チームページへ
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

function toSlug(s: string) {
  return s
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

