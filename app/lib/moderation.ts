/**
 * 差別・憎悪表現の検出（新規投稿のみサーバー側で拒否）。
 * 正規化後に部分一致するよう、禁止語は運用で `RAW_BANNED_PHRASES` に追加してください。
 */

export const MODERATION_ERROR_MESSAGE =
  "不適切な表現が含まれているため投稿できません";

/**
 * 検出用にテキストを正規化する。
 * - NFKC
 * - 小文字化（英字）
 * - 全角英数・主要記号を半角相当へ
 * - 空白類削除
 * - Unicode 記号・句読点等を削除（差 別・差-別 等の回避を吸収）
 */
export function normalizeForBannedScan(text: string): string {
  if (!text) return "";
  let s = text.normalize("NFKC");
  s = s.toLowerCase();
  // 全角英数字 → 半角
  s = s.replace(/[！-～]/g, (c) => {
    const code = c.charCodeAt(0);
    if (code >= 0xff01 && code <= 0xff5e) {
      return String.fromCharCode(code - 0xfee0);
    }
    return c;
  });
  // ゼロ幅等
  s = s.replace(/[\u200B-\u200D\uFEFF]/g, "");
  // 空白削除（全角含む）
  s = s.replace(/\s+/g, "");
  // 記号・装飾（英数字・_ 以外の「記号」的なものを広めに落とす）
  s = s.replace(/[\p{P}\p{S}]/gu, "");
  return s;
}

/**
 * 禁止フレーズ（生テキスト）。短すぎる単独語は誤検知を避け長めの語・フレーズを優先。
 * 必要に応じて追加してください（コミット前に運用ポリシーに合わせて調整）。
 */
const RAW_BANNED_PHRASES: string[] = [
  // --- 英語圏の人種・民族ヘイト（明確なスラー） ---
  "chink",
  "gook",
  "kike",
  "nigger",
  "spic",
  "wetback",
  "white power",
  "whitepower",
  // --- 性的少数・性自認への侮蔑 ---
  "faggot",
  "tranny",
  "dyke",
  // --- 障害への侮蔑 ---
  "retard",
  // --- 日本語：差別・ヘイトで用いられる表現（運用で追加推奨） ---
  "バカチョン",
  "シナ人",
  "支那人",
  "シナジン",
  "エタヒニン",
  "穢多非人",
];

const NORMALIZED_BANNED = Array.from(
  new Set(
    RAW_BANNED_PHRASES.map((p) => normalizeForBannedScan(p)).filter(
      (p) => p.length >= 2
    )
  )
);

export function containsBannedWords(text: string): boolean {
  const n = normalizeForBannedScan(text);
  if (!n) return false;
  for (const term of NORMALIZED_BANNED) {
    if (term.length > 0 && n.includes(term)) return true;
  }
  return false;
}

/** 複数フィールドのいずれかに禁止語があれば true */
export function containsBannedWordsInFields(
  fields: Array<string | null | undefined>
): boolean {
  for (const f of fields) {
    if (f && containsBannedWords(f)) return true;
  }
  return false;
}
