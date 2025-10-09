// app/data/moderation.ts
// --- NG ワードリスト ---
// 差別語・暴力表現・スパム・卑猥語などをまとめて管理
export const NG_WORDS: string[] = [
  // 暴力・攻撃的表現
  "死ね",
  "殺す",
  "殺してやる",
  "ぶっ殺す",

  // 差別・蔑称（例：仮の表記、実際には運用で追加してください）
  "差別語",
  "馬鹿",
  "あほ",
  "ブス",
  "デブ",

  // 卑猥語（例示）
  "セックス",
  "AV",
  "エロ",
  "ちんこ",
  "まんこ",

  // スパム・広告的な表現
  "無料で稼げる",
  "副業リンク",
  "スパムワードA",
  "禁止ワードB",

  // TODO: 必要に応じて追加
];

// --- 文字列を正規化する関数 ---
// ・全角/半角統一（NFKC）
// ・小文字化
// ・空白削除
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKC")
    .replace(/\s+/g, "");
}

// --- NG ワードを検索する関数 ---
export function findNgWord(text: string): string | null {
  const normalized = normalize(text);
  for (const w of NG_WORDS) {
    if (!w) continue;
    const t = normalize(w);
    if (t && normalized.includes(t)) {
      return w; // 最初にヒットした NG ワードを返す
    }
  }
  return null;
}

// --- 判定用ラッパー関数 ---
export function containsNgWord(text: string): boolean {
  return findNgWord(text) !== null;
}

