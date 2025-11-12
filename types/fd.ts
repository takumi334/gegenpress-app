// types/fd.ts
export type FdSquadRole = "PLAYER" | "COACH";
export type FdPosition = "Goalkeeper" | "Defence" | "Midfield" | "Offence" | "N/A";

export interface FdPlayer {
  id: number;
  name: string;
  position?: FdPosition | null;
  nationality?: string;
  dateOfBirth?: string;
  shirtNumber?: number | null;
  role: FdSquadRole;
}

export interface FdTeam {
  id: number;
  name: string;
  shortName?: string;
  tla?: string;
  crest?: string;      // svg or png url
  founded?: number;
  clubColors?: string;
  venue?: string;
  address?: string;
  website?: string;
  squad?: FdPlayer[];
}

