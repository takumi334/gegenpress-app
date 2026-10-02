import { NextResponse } from "next/server";
import { ACTIVE_LEAGUES } from "@/lib/leagues";
import { getDbCacheState } from "@/lib/server/footballDataDbCache";
const LEAGUES_CACHE_HEADERS = { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=600" };
const mapLeague = (value: string) => ({ "39":"PL", "78":"BL1", "135":"SA", "140":"PD", "61":"FL1" } as Record<string,string>)[value] ?? value;
type Row = { position?:number; team?:{id?:number;name?:string}; playedGames?:number; won?:number; draw?:number; lost?:number; points?:number; goalsFor?:number; goalsAgainst?:number; goalDifference?:number };
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const code = mapLeague(params.get("league") ?? "PL");
  const season = params.get("season") ?? "2024";
  if (!(ACTIVE_LEAGUES as string[]).includes(code)) return NextResponse.json({ error:"unsupported league" }, { status:400, headers:LEAGUES_CACHE_HEADERS });
  const snapshot = await getDbCacheState<{standings?:Row[]}>(`league_snapshot:${code}`).catch(() => null);
  if (snapshot?.payload.standings?.length) {
    const table = snapshot.payload.standings.map(r => ({ position:r.position, teamId:r.team?.id, teamName:r.team?.name, played:r.playedGames, won:r.won, draw:r.draw, lost:r.lost, points:r.points, gf:r.goalsFor, ga:r.goalsAgainst, gd:r.goalDifference }));
    return NextResponse.json({ table, meta:{ source:snapshot.source, stale:!snapshot.isFresh, updating:false } }, { headers:LEAGUES_CACHE_HEADERS });
  }
  const cached = await getDbCacheState<{table:unknown[]}>(`standings:${code}:${season}`).catch(() => null);
  return NextResponse.json({ ...(cached?.payload ?? {table:[]}), meta:{ source:cached?.source ?? "none", stale:cached ? !cached.isFresh : false, updating:false } }, { headers:LEAGUES_CACHE_HEADERS });
}
