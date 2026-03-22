import "server-only";

import { prisma, withPrismaRetry } from "@/lib/prisma";
import { normalizeTranslationSource, translationCacheKey } from "@/lib/translationCacheKey";

/** 正規化済み原文 → 訳文（ヒット分のみ） */
export async function dbTranslationLookup(
  texts: string[],
  targetLang: string
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const normalized = [...new Set(texts.map(normalizeTranslationSource).filter(Boolean))];
  if (normalized.length === 0) return out;

  const cacheKeys = normalized.map((t) => translationCacheKey(t, targetLang));
  const keyToSource = new Map<string, string>();
  normalized.forEach((t, i) => keyToSource.set(cacheKeys[i], t));

  const rows = await withPrismaRetry("TranslationCache.findMany", () =>
    prisma.translationCache.findMany({
      where: { id: { in: cacheKeys } },
      select: { id: true, translated: true },
    })
  );

  for (const r of rows) {
    const src = keyToSource.get(r.id);
    if (src) out.set(src, r.translated);
  }
  return out;
}

export async function dbTranslationUpsertMany(
  entries: { source: string; targetLang: string; translated: string }[]
): Promise<void> {
  if (entries.length === 0) return;
  const seen = new Set<string>();
  const deduped = entries.filter((e) => {
    const n = normalizeTranslationSource(e.source);
    if (!n) return false;
    const id = translationCacheKey(n, e.targetLang);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  if (deduped.length === 0) return;

  const CHUNK = 40;
  await withPrismaRetry("TranslationCache.upsertMany", async () => {
    for (let i = 0; i < deduped.length; i += CHUNK) {
      const slice = deduped.slice(i, i + CHUNK);
      await prisma.$transaction(
        slice.map((e) => {
          const n = normalizeTranslationSource(e.source);
          const id = translationCacheKey(n, e.targetLang);
          return prisma.translationCache.upsert({
            where: { id },
            create: {
              id,
              targetLang: e.targetLang,
              translated: e.translated,
            },
            update: { translated: e.translated },
          });
        })
      );
    }
  });
}
