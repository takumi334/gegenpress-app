// app/leagues/[leagueId]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { LEAGUES, type LeagueId } from "../../lib/leagues";
import { getCanonicalUrl } from "../../lib/publicSiteUrl";
import { getLeagueSnapshot } from "@/lib/server/leagueSnapshotCache";

export const revalidate = 300;

function isSupportedLeague(code: string): code is LeagueId {
  return LEAGUES.some((l) => l.id === code);
}

function getLeagueName(code: string): string {
  return LEAGUES.find((l) => l.id === code)?.name ?? "League";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}): Promise<Metadata> {
  try {
    const { leagueId } = await params;
    const leagueCode = (leagueId ?? "").toUpperCase();
    const leagueName = getLeagueName(leagueCode);

    return {
      title: `${leagueName} | Gegenpress`,
      description: `Standings, fixtures, teams and related news for ${leagueName}.`,
      alternates: {
        canonical: getCanonicalUrl(`/leagues/${leagueCode || "PL"}`),
      },
    };
  } catch {
    return {
      title: "League data not available | Gegenpress",
      description: "League data not available.",
      alternates: {
        canonical: getCanonicalUrl("/leagues"),
      },
    };
  }
}

export default async function LeaguePage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const leagueCode = (leagueId ?? "").toUpperCase();
  const supported = isSupportedLeague(leagueCode);
  const leagueName = supported ? getLeagueName(leagueCode) : "League";

  if (!supported) {
    return (
      <main className="p-6 space-y-4">
        <h1 className="text-3xl font-bold">League data not available</h1>
        <p className="text-sm text-gray-600">
          We could not find data for this league code.
        </p>
      </main>
    );
  }

  const bundle = await getLeagueSnapshot(leagueCode);

  const table = Array.isArray(bundle.standings) ? bundle.standings : [];
  const fixtures = Array.isArray(bundle.fixtures) ? bundle.fixtures : [];
  const news = Array.isArray(bundle.news) ? bundle.news : [];
  const title = bundle.competitionName || leagueName;
  const teamNames = table
    .map((row) => row?.team?.name)
    .filter((name): name is string => typeof name === "string" && name.length > 0);
  const isFallbackView = table.length === 0;

  if (process.env.NODE_ENV !== "production") {
    console.log(`[LeaguePage][${leagueCode}] render bundle`, {
      source: bundle.source,
      competitionName: bundle.competitionName,
      code: leagueCode,
      standingsCount: table.length,
      fixturesCount: fixtures.length,
      teamsCount: 0,
    });
  }

  return (
    <main className="p-6 space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-sm text-gray-600">{leagueCode}</p>
        {isFallbackView ? (
          <p className="text-sm text-amber-700">データ更新中です。前回キャッシュまたは最小表示を継続しています。</p>
        ) : null}
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Standings</h2>
        {table.length === 0 ? (
          <p className="text-sm text-gray-600">League data not available.</p>
        ) : (
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
              {table
                .filter((row) => row?.team?.id && row?.team?.name)
                .map((row) => (
                  <tr key={row.team!.id} className="border-t">
                    <td className="p-2 text-right">{row.position ?? "-"}</td>
                    <td className="p-2">
                      <Link
                        className="text-blue-600 underline hover:opacity-80"
                        href={`/board/${row.team!.id}`}
                      >
                        {row.team!.name}
                      </Link>
                    </td>
                    <td className="p-2 text-right">{row.points ?? "-"}</td>
                    <td className="p-2 text-right">{row.goalDifference ?? "-"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Teams</h2>
        {teamNames.length === 0 ? (
          <div className="rounded border border-dashed p-4 text-sm text-gray-600">
            チーム一覧を更新中です。
          </div>
        ) : (
          <ul className="divide-y rounded border">
            {teamNames.map((name) => (
              <li key={name} className="p-3 text-sm">
                {name}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Fixtures</h2>
        {fixtures.length === 0 ? (
          <p className="text-sm text-gray-600">No fixtures available.</p>
        ) : (
          <ul className="divide-y rounded border">
            {fixtures
              .filter((m) => m?.homeTeam?.name && m?.awayTeam?.name)
              .map((match) => (
                <li key={match.id ?? `${match.homeTeam?.name}-${match.awayTeam?.name}`} className="p-3 text-sm">
                  <div className="font-medium">
                    {match.homeTeam?.name} vs {match.awayTeam?.name}
                  </div>
                  <div className="text-gray-600">
                    {match.utcDate ? new Date(match.utcDate).toLocaleString() : "TBD"} /{" "}
                    {match.status ?? "SCHEDULED"}
                  </div>
                </li>
              ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">News</h2>
        {news.length === 0 ? (
          <p className="text-sm text-gray-600">No news available.</p>
        ) : (
          <ul className="divide-y rounded border">
            {news
              .filter((item) => item?.title && item?.link)
              .map((item) => (
                <li key={`${item.title}-${item.link}`} className="p-3">
                  <a className="text-blue-600 underline hover:opacity-80" href={item.link} target="_blank" rel="noreferrer">
                    {item.title}
                  </a>
                </li>
              ))}
          </ul>
        )}
      </section>
    </main>
  );
}


