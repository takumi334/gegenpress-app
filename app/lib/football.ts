// app/lib/football.ts
const BASE = "https://api.football-data.org/v4";

function authHeaders() {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) throw new Error("FOOTBALL_DATA_TOKEN が設定されていません");
  return { "X-Auth-Token": token };
}

export type LeagueCode = "PL" | "PD" | "BL1" | "SA" | "FL1" | "DED" | "PPL" | "CL";

export type TeamLite = {
  id: number;
  name: string;
  shortName: string | null;
  tla: string | null;
  crest: string | null;
  slug: string; // /team/[slug] 用
};

export async function fetchTeamsByLeague(league: LeagueCode): Promise<TeamLite[]> {
  const res = await fetch(`${BASE}/competitions/${league}/teams`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`teams fetch failed: ${res.status}`);
  const json = await res.json();
  const makeSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/fc|cf|ac|sc|bk|sv|ss|spal|calcio/g, "") // ノイズを軽減
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  return (json.teams ?? []).map((t: any) => ({
    id: t.id,
    name: t.name,
    shortName: t.shortName ?? null,
    tla: t.tla ?? null,
    crest: t.crest ?? null,
    slug: makeSlug(t.name),
  }));
}

