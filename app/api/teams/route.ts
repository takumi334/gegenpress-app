// app/api/teams/route.ts
import { NextResponse } from "next/server";
import { getDbCacheState, setDbCache } from "@/lib/server/footballDataDbCache";
const LEAGUES_CACHE_HEADERS: Record<string, string> = {
  "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=600",
};

const host = process.env.APISPORTS_HOST!;
const key  = process.env.APISPORTS_KEY!;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const league = searchParams.get("league"); // 髣懆侭繝ｻ 39
  const season = searchParams.get("season") ?? "2024";

  if (!league) {
    return NextResponse.json({ error: "league is required" }, { status: 400, headers: LEAGUES_CACHE_HEADERS });
  }

  const cacheKey = `teams:${league}:${season}`;
  const cached = await getDbCacheState<unknown>(cacheKey);
  if (cached?.isFresh) {
    return NextResponse.json(
      { ...(cached.payload as object), meta: { source: "cache", stale: false, updating: false } },
      { headers: LEAGUES_CACHE_HEADERS }
    );
  }

  try {
    const url = `https://${host}/teams?league=${league}&season=${season}`;
    const res = await fetch(url, {
      headers: { "x-apisports-key": key },
      next: { revalidate: 60 * 30 },
    });
    if (!res.ok) {
      if (cached) {
        return NextResponse.json(
          { ...(cached.payload as object), meta: { source: cached.source, stale: true, updating: true } },
          { headers: LEAGUES_CACHE_HEADERS }
        );
      }
      return NextResponse.json(
        { error: "upstream_error", status: res.status },
        { status: 502, headers: LEAGUES_CACHE_HEADERS }
      );
    }
    const data = await res.json();
    await setDbCache(cacheKey, "teams", data, 60 * 30);
    return NextResponse.json(
      { ...(data as object), meta: { source: "api", stale: false, updating: false } },
      { headers: LEAGUES_CACHE_HEADERS }
    );
  } catch {
    if (cached) {
      return NextResponse.json(
        { ...(cached.payload as object), meta: { source: cached.source, stale: true, updating: true } },
        { headers: LEAGUES_CACHE_HEADERS }
      );
    }
    return NextResponse.json(
      { error: "upstream_error", status: 500 },
      { status: 500, headers: LEAGUES_CACHE_HEADERS }
    );
  }
}

