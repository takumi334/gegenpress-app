/**
 * 投稿翻訳用の対応言語リスト（ヘッダー Native/Target 選択用）
 * 多言語化しやすいよう定数化
 */
export const POST_TRANSLATION_LANGUAGES = [
  { code: "ja", name: "Japanese" },
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "nl", name: "Dutch" },
] as const;

export type PostTranslationLangCode =
  (typeof POST_TRANSLATION_LANGUAGES)[number]["code"];

export const DEFAULT_NATIVE_LANG: PostTranslationLangCode = "ja";
export const DEFAULT_TARGET_LANG: PostTranslationLangCode = "en";

export function isValidPostTranslationLang(
  code: string
): code is PostTranslationLangCode {
  return POST_TRANSLATION_LANGUAGES.some((l) => l.code === code);
}

export function getLangName(code: string): string {
  const found = POST_TRANSLATION_LANGUAGES.find((l) => l.code === code);
  return found?.name ?? code;
}
