export type LeagueId =
  | "PL"
  | "PD"
  | "SA"
  | "BL1"
  | "FL1";

export const LEAGUES: { id: LeagueId; name: string }[] = [
  { id: "PL", name: "Premier League" },
  { id: "PD", name: "La Liga" },
  { id: "SA", name: "Serie A" },
  { id: "BL1", name: "Bundesliga" },
  { id: "FL1", name: "Ligue 1" },
];

export const ACTIVE_LEAGUES: LeagueId[] = [
  "PL",
  "PD",
  "SA",
  "BL1",
  "FL1",
];
