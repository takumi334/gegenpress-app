// 色名を HEX に寄せる辞書（必要に応じて追加）
const NAMED: Record<string, string> = {
  black: "#000000",
  white: "#FFFFFF",
  grey: "#808080",
  gray: "#808080",
  silver: "#C0C0C0",
  red: "#D00027",
  crimson: "#DC143C",
  maroon: "#800000",
  claret: "#7F1734",
  burgundy: "#800020",
  blue: "#034694",
  navy: "#001F5B",
  skyblue: "#5BC2E7",
  cyan: "#00FFFF",
  teal: "#008080",
  green: "#008000",
  lime: "#32CD32",
  forest: "#0B6623",
  yellow: "#FFD100",
  amber: "#FFBF00",
  gold: "#D4AF37",
  orange: "#FF8C00",
  purple: "#4B0082",
  violet: "#8F00FF",
  magenta: "#FF00FF",
  pink: "#FFC0CB",
  brown: "#8B4513",
};

const HEX3 = /^#?[0-9a-f]{3}$/i;
const HEX6 = /^#?[0-9a-f]{6}$/i;

export function normalizeHex(input: string): string | null {
  if (!input) return null;
  let s = input.trim().toLowerCase();

  if (HEX6.test(s)) return s.startsWith("#") ? s : `#${s}`;
  if (HEX3.test(s)) {
    s = s.replace("#", "");
    const [r, g, b] = s.split("");
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  if (s in NAMED) return NAMED[s];

  // “sky blue” → “skyblue”
  s = s.replace(/\s+/g, "");
  if (s in NAMED) return NAMED[s];

  return null;
}

/** "Red / White" → ["#D00027", "#FFFFFF"] */
export function parseClubColors(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[\/,|]+/)         // "/", ",", "|" 区切りに対応
    .map(s => s.trim().toLowerCase())
    .map(normalizeHex)
    .filter((x): x is string => !!x);
}

/** 前景色(テキスト色)を計算（簡易コントラスト） */
export function readableTextColor(bgHex: string): "#000000" | "#FFFFFF" {
  const hex = bgHex.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  // 輝度（WCAG近似）
  const y = (r * 299 + g * 587 + b * 114) / 1000;
  return y >= 128 ? "#000000" : "#FFFFFF";
}
/* ts-node で実行:
   npx ts-node scripts/build-club-colors.ts
   => app/data/clubColors.json を生成
*/
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import fetch from "node-fetch";
import { parseClubColors, normalizeHex, readableTextColor } from "../app/lib/colors";

type ApiTeam = {
  id: number;
  name: string;
  clubColors?: string; // 例: "Red / White"
  crest?: string;
  tla?: string;
};

type ApiTeamsResp = { teams: ApiTeam[] };

const API = "https://api.football-data.org/v4";
const KEY = process.env.FOOTBALL_DATA_API_KEY;
if (!KEY) {
  console.error("FOOTBALL_DATA_API_KEY がありません");
  process.exit(1);
}

const COMPETITIONS = [
  "PL",   // プレミア
  "BL1",  // ブンデス
  "SA",   // セリエA
  "PD",   // ラ・リーガ
  "FL1",  // リーグ1
  "PPL",  // ポルトガル
  "DED",  // エールディビジ
];

async function getTeamsByCompetition(code: string): Promise<ApiTeam[]> {
  const url = `${API/****/""}`; // TS の補完避け
  const real = `${API}/competitions/${code}/teams`;
  const res = await fetch(real, { headers: { "X-Auth-Token": KEY } as any });
  if (!res.ok) throw new Error(`${code} fetch failed: ${res.status}`);
  const data = (await res.json()) as ApiTeamsResp;
  return data.teams || [];
}

// 既知のバリエーション→HEX（APIの clubColors が無い/曖昧なときの救済）
const TEAM_OVERRIDES: Record<number, { primary: string; secondary?: string }> = {
  // 例: ブライトン（青×白ストライプ → 青基調）
  // 397: { primary: "#0057B8", secondary: "#FFFFFF" },
};

async function main() {
  const map: Record<
    number,
    { id: number; name: string; tla?: string; crest?: string; primary: string; secondary?: string; text: string }
  > = {};

  for (const code of COMPETITIONS) {
    try {
      const teams = await getTeamsByCompetition(code);
      for (const t of teams) {
        const colors = parseClubColors(t.clubColors);
        const override = TEAM_OVERRIDES[t.id];

        // primary/secondary を決定
        const primary = override?.primary || colors[0] || "#666666";
        const secondary = override?.secondary || colors[1] || "#222222";
        const text = readableTextColor(primary);

        map[t.id] = {
          id: t.id,
          name: t.name,
          tla: t.tla,
          crest: t.crest,
          primary: normalizeHex(primary) || "#666666",
          secondary: normalizeHex(secondary) || "#222222",
          text,
        };
      }
      // API レート制限対策の小休止
      await new Promise(r => setTimeout(r, 600));
    } catch (e) {
      console.error(code, e);
    }
  }

  const outDir = join(process.cwd(), "app", "data");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "clubColors.json");
  writeFileSync(outPath, JSON.stringify(map, null, 2), "utf-8");
  console.log("written:", outPath, Object.keys(map).length, "teams");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
import COLORS from "@/data/clubColors.json";
type ClubColor = { primary: string; secondary?: string; text: string };

const FALLBACK: ClubColor = { primary: "#4A5568", secondary: "#2D3748", text: "#FFFFFF" };

export function getClubColors(team?: { id?: number | null; name?: string | null }): ClubColor {
  if (!team?.id) return FALLBACK;
  const hit = (COLORS as any)[team.id] as ClubColor | undefined;
  return hit ?? FALLBACK;
}
import { getClubColors } from "@/lib/clubColors";

// ...
const homeColors = getClubColors(radar.home.team);
const awayColors = getClubColors(radar.away.team);

<svg width={260} height={260} viewBox="0 0 260 260" className="my-3">
  {/* 多角形（HOME） */}
  <polygon
    points={radarPoints(radar.home, 130, 130, 100)}
    fill={`${homeColors.primary}33`}     // 透明度 0x33
    stroke={homeColors.primary}
    strokeWidth={2}
  />
  {/* 多角形（AWAY） */}
  <polygon
    points={radarPoints(radar.away, 130, 130, 100)}
    fill={`${awayColors.primary}33`}
    stroke={awayColors.primary}
    strokeWidth={2}
  />
  {/* 軸やラベルはそのまま */}
</svg>

