/**
 * サイト固定UIの翻訳
 * uiLanguage（UI言語）に基づいて表示言語を切り替える。投稿の Native/Target とは別。
 */

import ja from "translations/ja.json";
import en from "translations/en.json";

export type SupportedLang = "ja" | "en";

const DICT: Record<SupportedLang, Record<string, unknown>> = {
  ja: ja as Record<string, unknown>,
  en: en as Record<string, unknown>,
};

function getNested(obj: Record<string, unknown>, path: string): string | undefined {
  const keys = path.split(".");
  let cur: unknown = obj;
  for (const k of keys) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return typeof cur === "string" ? cur : undefined;
}

/** key は "section.key" 形式。params で {key} を置換 */
export function t(
  lang: string,
  key: string,
  params?: Record<string, string | number>
): string {
  const code = (lang === "ja" ? "ja" : "en") as SupportedLang;
  const dict = DICT[code];
  let str = getNested(dict, key) ?? getNested(DICT.en, key) ?? key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    });
  }
  return str;
}
