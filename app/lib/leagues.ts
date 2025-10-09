// app/lib/leagues.ts  ← この場所にあるか確認
export type LeagueId =
  | "PL"   // Premier League
  | "PD"   // La Liga
  | "SA"   // Serie A
  | "BL1"  // Bundesliga
  | "FL1"  // Ligue 1
  | "DED"  // Eredivisie
  | "PPL"; // Primeira Liga

export const LEAGUES: { id: LeagueId; name: string }[] = [
  { id: "PL",  name: "Premier League" },
  { id: "PD",  name: "La Liga" },
  { id: "SA",  name: "Serie A" },
  { id: "BL1", name: "Bundesliga" },
  { id: "FL1", name: "Ligue 1" },
  { id: "DED", name: "Eredivisie" },     // ← 追加
  { id: "PPL", name: "Primeira Liga" },  // ← 追加
];

