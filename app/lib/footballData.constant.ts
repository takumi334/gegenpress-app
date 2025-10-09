// app/lib/footballData/constants.ts

export type LeagueCode =
  | "PL"   // Premier League
  | "PD"   // La Liga
  | "SA"   // Serie A
  | "BL1"  // Bundesliga
  | "FL1"  // Ligue 1
  | "DED"  // Eredivisie
  | "PPL"  // Primeira Liga
  | "CL";  // Champions League

export const COMPETITION_ID: Record<LeagueCode, number> = {
  PL: 2021,
  PD: 2014,
  SA: 2019,
  BL1: 2002,
  FL1: 2015,
  DED: 2003,
  PPL: 2017,
  CL: 2001,
};

export const COMPETITION_NAME: Record<LeagueCode, string> = {
  PL: "Premier League",
  PD: "La Liga",
  SA: "Serie A",
  BL1: "Bundesliga",
  FL1: "Ligue 1",
  DED: "Eredivisie",
  PPL: "Primeira Liga",
  CL: "UEFA Champions League",
};

// 一覧をループで扱いたいときに便利
export const LEAGUE_LIST = (Object.keys(COMPETITION_ID) as LeagueCode[]).map(
  (code) => ({
    code,
    id: COMPETITION_ID[code],
    name: COMPETITION_NAME[code],
  })
);

// 旧コード互換用（必要なければ削除しても良い）
export const COMPETITIONS: Record<string, number> = COMPETITION_ID;

