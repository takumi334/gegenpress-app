/**
 * X / Twitter 投稿用ハッシュタグ（英語ベース）。
 * 将来 i18n や別ソースからのチーム名に差し替え可能。
 */

export const X_POST_FIXED_HASHTAGS = ["#football", "#soccer", "#tactics", "#gegenpress"] as const;

/** クラブ名から除く短い接尾辞トークン（Manchester City の city は除かない） */
const TOKEN_SUFFIX = new Set(["fc", "afc", "sc", "cf", "the", "club"]);

/** Football-Data.org teamId → リーグ表示名（ハッシュタグ用・ベストエフォート） */
const PL_IDS = new Set([57, 61, 65, 66, 64, 73, 563, 67, 397, 402, 76]);
const LL_IDS = new Set([81, 86, 78, 559]);
const SA_IDS = new Set([109, 108, 98, 113, 100]);
const BL_IDS = new Set([5, 4, 721, 3]);
const L1_IDS = new Set([524, 516, 523]);

export function inferLeagueNameForFdTeamId(teamId: number): string | null {
  if (!Number.isFinite(teamId)) return null;
  if (PL_IDS.has(teamId)) return "Premier League";
  if (LL_IDS.has(teamId)) return "La Liga";
  if (SA_IDS.has(teamId)) return "Serie A";
  if (BL_IDS.has(teamId)) return "Bundesliga";
  if (L1_IDS.has(teamId)) return "Ligue 1";
  return null;
}

/**
 * 英字ベースの名前から1つのハッシュタグを生成。
 * - 非 ASCII を含む場合は null（日本語チーム名などはスキップ）
 * - 例: "Arsenal FC" → #Arsenal, "Premier League" → #PremierLeague
 */
export function toHashtag(raw: string): string | null {
  const t = (raw ?? "").trim();
  if (!t) return null;
  if (/[^\u0000-\u007F]/.test(t)) return null;

  const tokens = t
    .split(/[\s/|]+/)
    .map((s) => s.replace(/[^a-zA-Z0-9]/g, ""))
    .filter(Boolean);
  const filtered = tokens.filter((tok) => !TOKEN_SUFFIX.has(tok.toLowerCase()));
  if (filtered.length === 0) return null;

  const pascal = filtered
    .map((tok) => tok.charAt(0).toUpperCase() + tok.slice(1).toLowerCase())
    .join("");
  if (!/^[A-Za-z0-9]+$/.test(pascal)) return null;
  return `#${pascal}`;
}

export type BuildHashtagsInput = {
  teamNames?: (string | null | undefined)[];
  leagueName?: string | null;
};

/**
 * 固定タグ → チーム → リーグの順。重複（大文字小文字無視）を除く。
 */
export function buildHashtags(input: BuildHashtagsInput = {}): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const add = (tag: string | null) => {
    if (!tag) return;
    const key = tag.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(tag);
  };

  for (const f of X_POST_FIXED_HASHTAGS) add(f);
  for (const n of input.teamNames ?? []) {
    if (n) add(toHashtag(n));
  }
  if (input.leagueName) add(toHashtag(input.leagueName));

  return out;
}

export function formatHashtagLine(input: BuildHashtagsInput = {}): string {
  return buildHashtags(input).join(" ");
}
