import { createHash } from "crypto";

/** API / DB キャッシュ用に原文を正規化 */
export function normalizeTranslationSource(s: string): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

/** Prisma TranslationCache.id およびメモリKVキー用 */
export function translationCacheKey(source: string, targetLang: string): string {
  const n = normalizeTranslationSource(source);
  return createHash("sha256")
    .update(`${n}\0${targetLang}`, "utf8")
    .digest("hex");
}
