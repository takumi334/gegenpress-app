// app/data/leagues.ts
import type { LeagueCode } from "@/app/lib/fd";

export type League = {
  code: LeagueCode;
  name: string;
  country: string;
};

export const LEAGUES: League[] = [
  { code: "PL",  name: "Premier League",         country: "England"     },
  { code: "PD",  name: "La Liga",                country: "Spain"       },
  { code: "BL1", name: "Bundesliga",             country: "Germany"     },
  { code: "SA",  name: "Serie A",                country: "Italy"       },
  { code: "FL1", name: "Ligue 1",                country: "France"      },
  { code: "DED", name: "Eredivisie",             country: "Netherlands" },
  { code: "PPL", name: "Primeira Liga",          country: "Portugal"    },
  { code: "CL",  name: "UEFA Champions League",  country: "Europe"      },
];

