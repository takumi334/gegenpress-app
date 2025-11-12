// app/lib/i18n.ts（サーバー専用：Reactのimportは不要）
import { cookies, headers } from "next/headers";
import { LANG_OPTIONS } from "./grammar";

export const SUPPORTED_LOCALES = LANG_OPTIONS.map(l => l.code) as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale =
  (SUPPORTED_LOCALES.includes("en") ? "en" : SUPPORTED_LOCALES[0]) as Locale;

function normalizeLocale(v?: string | null): Locale {
  const code = (v || "").split(",")[0]?.trim().slice(0,2).toLowerCase();
  return (SUPPORTED_LOCALES as readonly string[]).includes(code ?? "")
    ? (code as Locale)
    : DEFAULT_LOCALE;
}

// ★ここを async にして cookies()/headers() を await
export async function getInitialLocale(): Promise<Locale> {
  try {
    const c = (await cookies()).get("locale")?.value;
    if (c) return normalizeLocale(c);
  } catch {}

  try {
    const al = (await headers()).get("accept-language");
    return normalizeLocale(al);
  } catch {
    return DEFAULT_LOCALE;
  }
}

