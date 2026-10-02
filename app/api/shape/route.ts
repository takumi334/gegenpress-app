import { NextRequest, NextResponse } from "next/server";
import { ACTIVE_LEAGUES } from "@/lib/leagues";
import { getLeagueSnapshot } from "@/lib/server/leagueSnapshotCache";
type TacticKind = "gd" | "goals" | "concede" | "rank";
type CachedStanding = {team:{id:number;name:string};position:number;playedGames:number;goalsFor:number;goalsAgainst:number;goalDifference:number};
type RadarPack = {team:{id:number;name:string};fw:number;mf:number;df:number;gk:number;legend:{base:number;note:string}};
function scale01(v: number, min: number, max: number) {
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (v - min) / (max - min)));
}


export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;
  const homeId = Number(params.get("home")), awayId = Number(params.get("away"));
  const kind = (params.get("kind") as TacticKind) || "gd";
  if (!homeId || !awayId) return NextResponse.json({error:"invalid params"},{status:400});
  try {
    for (const code of ACTIVE_LEAGUES) {
      const snapshot = await getLeagueSnapshot(code);
      const table = snapshot.standings as CachedStanding[];
      if (!table.some(r => r.team?.id === homeId)) continue;
      const complete = table.every(r => r.team && typeof r.team.id === "number" && typeof r.team.name === "string" && typeof r.position === "number" && typeof r.playedGames === "number" && typeof r.goalsFor === "number" && typeof r.goalsAgainst === "number" && typeof r.goalDifference === "number");
      if (!complete) continue;
      const totalGF = table.reduce((s,r) => s+r.goalsFor,0);
      const totalGames = table.reduce((s,r) => s+r.playedGames,0);
      const leagueAvg = totalGames ? totalGF / totalGames : 1.3;
      const build = () => {
  const meta = {
    gd: { label: "得失点差", get: (r: CachedStanding) => r.goalDifference, note: "GD基準" },
    goals: { label: "得点率", get: (r: CachedStanding) => (r.goalsFor / r.playedGames) / leagueAvg, note: "GF/リーグ平均" },
    concede: { label: "守備率", get: (r: CachedStanding) => 1 / (1 + (r.goalsAgainst / r.playedGames) / leagueAvg), note: "失点抑制" },
    rank: { label: "順位指数", get: (r: CachedStanding) => -r.position, note: "順位逆スケール" },
  }[kind];

  const vals = table.map(meta.get);
  const min = Math.min(...vals), max = Math.max(...vals);

  function pack(teamId: number): RadarPack {
    const row = table.find(r => r.team.id === teamId);
    const base = row ? meta.get(row) : 0;
    const s = scale01(base, min, max);      // 0..1
    const atk = s;                          // 攻撃寄り
    const def = s;                          // 守備寄り（同一指標でまずは同スケール）
    const fw = Math.round(atk * 100);
    const df = Math.round(def * 100);
    const mf = Math.round(((atk + def) / 2) * 100);
    const gk = Math.round(def * 100 * 0.95);

    return {
      team: row?.team ?? { id: teamId, name: `Team ${teamId}` },
      fw, mf, df, gk,
      legend: { base, note: meta.note },
    };
  }

  return {
    home: pack(homeId),
    away: pack(awayId),
    tacticLabel: meta.label,
    tacticDetail: meta.note,
  };
      };
      return NextResponse.json(build());
    }
    return NextResponse.json({error:"cached league data is not available"},{status:503});
  } catch(e: unknown) { return NextResponse.json({error:e instanceof Error ? e.message : String(e)},{status:500}); }
}
