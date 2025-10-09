// app/leagues/[leagueId]/page.tsx
import Link from "next/link";
import { LEAGUES, type LeagueId } from "@/lib/leagues";
import { COMPETITIONS } from "@/lib/footballData.constant";
import { fdFetch } from "@/lib/fd";

// Standings API のレスポンス型
type StandingRow = {
  position: number;
  team: { id: number; name: string; crest: string | null };
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
};
type StandingsRes = {
  competition: { id: number; name: string; code: LeagueId };
  standings: Array<{ type: "TOTAL"; table: StandingRow[] }>;
};

function isSupportedLeague(code: string): code is LeagueId {
  return LEAGUES.some((l) => l.id === code);
}

export default async function LeaguePage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  // Next.js 15 では params が Promise になっている
  const { leagueId } = await params;
  const leagueCode = (leagueId ?? "").toUpperCase();

  if (!isSupportedLeague(leagueCode)) {
    // 未対応リーグは not-found に飛ばす
    throw new Error("unsupported league");
  }

  const competitionId = COMPETITIONS[leagueCode];
  if (typeof competitionId !== "number") {
    throw new Error(`invalid competitionId: ${JSON.stringify(competitionId)}`);
  }

  // Football-Data.org から standings を取得
  const data = await fdFetch<StandingsRes>({
    path: `/competitions/${competitionId}/standings`,
  });

  const table = data.standings.find((s) => s.type === "TOTAL")?.table ?? [];

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">{data.competition.name}</h1>

      <table className="min-w-full border border-gray-300">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-2 w-10 text-right">#</th>
            <th className="p-2 text-left">Team</th>
            <th className="p-2 w-16 text-right">Pts</th>
            <th className="p-2 w-16 text-right">GD</th>
          </tr>
        </thead>
        <tbody>
          {table.map((row) => (
            <tr key={row.team.id} className="border-t">
              <td className="p-2 text-right">{row.position}</td>
              <td className="p-2">
                <Link
                  className="text-blue-600 underline hover:opacity-80"
                  href={`/board/${row.team.id}`}
                >
                  {row.team.name}
                </Link>
              </td>
              <td className="p-2 text-right">{row.points}</td>
              <td className="p-2 text-right">{row.goalDifference}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}


