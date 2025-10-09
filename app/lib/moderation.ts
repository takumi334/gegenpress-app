// 軽量・依存ゼロの簡易モデレーション（日本語/英語）
// 必要に応じて語彙は追加可能。境界曖昧回避のため単語境界や語中一致も使います。

export type ModerationResult = { ok: true } | { ok: false; label: string; term: string };

const HATE_SLURS = [
  // ★ ここは例示。必要に応じて運用で拡張/調整してください。
  "黒人", "白人至上", "ユダヤ人", "障害者を侮辱", "ホモ", "レズ", "トランス差別",
  "chink", "gook", "retard", "faggot", "tranny", "kike", "spic", "wetback",
];

const VIOLENCE = [
  "殺す", "殺害", "皆殺し", "死ね", "刺す", "撃ち殺", "焼き殺", "リンチ", "吊るし首",
  "kill", "murder", "lynch", "shoot you", "gas you", "die bitch",
];

// （必要なら）卑語・侮辱
const PROFANITY = [
  "くそ", "馬鹿", "死ね", "氏ね", "ぶっ殺", "黙れ",
  "fuck", "shit", "bitch", "asshole", "bastard", "dumbass",
];

// 正規化（全角→半角/ひら→カナ は最低限。用途に応じて強化してください）
function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[！-／：-＠［-｀｛-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)) // 全角記号
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)) // 全角英数
    .replace(/\s+/g, " ")
    .trim();
}

function matchAny(text: string, terms: string[]) {
  for (const t of terms) {
    if (!t) continue;
    const pat = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"); // 単純語中一致
    if (pat.test(text)) return t;
  }
  return null;
}

export function checkModeration(raw: string): ModerationResult {
  const text = normalize(raw);

  const v = matchAny(text, VIOLENCE);
  if (v) return { ok: false, label: "暴力/殺害表現", term: v };

  const h = matchAny(text, HATE_SLURS);
  if (h) return { ok: false, label: "差別・憎悪表現", term: h };

  const p = matchAny(text, PROFANITY);
  if (p) return { ok: false, label: "卑語/侮辱表現", term: p };

  return { ok: true };
}

