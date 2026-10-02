import { NextResponse } from "next/server";
import { getPredictJsonForTeam } from "@/lib/predictCacheService";

const NEXT_FIXTURE_CACHE_HEADERS: Record<string, string> = {
  "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=300",
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");
  if (!teamId) {
    return NextResponse.json(
      { error: "teamId required" },
      { status: 400, headers: NEXT_FIXTURE_CACHE_HEADERS }
    );
  }

  // Cache-only read: visiting a page must never call football-data.org.
  const { json: predict } = await getPredictJsonForTeam(teamId);
  const fixture = predict.fixture as
    | {
        id?: number | null;
        utcDate?: string | null;
        venue?: string | null;
        status?: string | null;
        teams?: {
          home?: { id?: number; name?: string | null };
          away?: { id?: number; name?: string | null };
        };
      }
    | undefined;

  const match = fixture
    ? {
        id: fixture.id ?? null,
        utcDate: fixture.utcDate ?? null,
        venue: fixture.venue ?? null,
        status: fixture.status ?? null,
        homeTeam: {
          id: fixture.teams?.home?.id ?? 0,
          name: fixture.teams?.home?.name ?? "Home",
        },
        awayTeam: {
          id: fixture.teams?.away?.id ?? 0,
          name: fixture.teams?.away?.name ?? "Away",
        },
      }
    : null;

  return NextResponse.json(
    { match, predict },
    { headers: NEXT_FIXTURE_CACHE_HEADERS }
  );
}
