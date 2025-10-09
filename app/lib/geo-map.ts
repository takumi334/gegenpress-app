// lib/geo-map.ts
import { FD } from "./competitions";

export function preferredCompetitionsByCountry(country: string) {
  switch (country) {
    case "GB":
    case "UK":
    case "IE":
      return [FD.PL, FD.ELC, FD.CL];
    case "ES":
      return [FD.PD, FD.CL];
    case "DE":
      return [FD.BL1, FD.CL];
    case "IT":
      return [FD.SA, FD.CL];
    case "FR":
      return [FD.FL1, FD.CL];
    case "NL":
      return [FD.DED, FD.CL];
    case "PT":
      return [FD.PPL, FD.CL];
    case "JP":
      // 欧州人気リーグをデフォルト表示
      return [FD.PL, FD.PD, FD.BL1, FD.SA, FD.FL1, FD.CL];
    default:
      return [FD.CL, FD.PL, FD.PD, FD.BL1];
  }
}
