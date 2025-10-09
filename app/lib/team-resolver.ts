// app/lib/team-resolver.ts
import slugify from "slugify";
import { fdFetch } from "./fd";

/** 任意の文字列をURLセーフなスラッグへ */
export function toTeamSlug(input: string): string {
  return slugify(input, { lower: true, strict: true, trim: true });
}

/** Football-Data.org の代表的チーム・スラッグ → teamId 対応表（必要に応じて追加） */
const SLUG_TO_ID: Record<string, number> = {
  // --- Premier League ---
  arsenal: 57,
  chelsea: 61,
  "manchester-city": 65,
  "man-city": 65,
  "manchester-united": 66,
  "man-utd": 66,
  liverpool: 64,
  tottenham: 73,
  "west-ham": 563,
  "newcastle-united": 67,
  brighton: 397,
  brentford: 402,
  wolves: 76,

  // --- LaLiga ---
  barcelona: 81,
  "real-madrid": 86,
  atletico: 78,
  sevilla: 559,

  // --- Serie A ---
  juventus: 109,
  inter: 108,
  milan: 98,
  napoli: 113,
  roma: 100,

  // --- Bundesliga ---
  bayern: 5,
  dortmund: 4,
  "rb-leipzig": 721,
  leverkusen: 3,

  // --- Ligue 1 ---
  psg: 524,
  marseille: 516,
  lyon: 523,
};

/** スラッグから teamId を返す（該当なしは null） */
export function resolveTeamId(slugOrName: string): number | null {
  const key = toTeamSlug(slugOrName);
  return SLUG_TO_ID[key] ?? null;
}

/** Football-Data API からチーム名を取得する */
export async function getTeamNameFromFD(slugOrId: string): Promise<string> {
  const id = resolveTeamId(slugOrId) ?? Number(slugOrId);
  if (!id || Number.isNaN(id)) return slugOrId; // 取得できない場合はそのまま返す

  try {
    const data = await fdFetch<{ name: string }>({
      path: `/teams/${id}`,
    });
    return data.name;
  } catch (err) {
    console.error("getTeamNameFromFD error:", err);
    return slugOrId;
  }
}
