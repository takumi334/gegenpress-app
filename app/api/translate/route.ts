import { NextRequest, NextResponse } from "next/server";
import { translateBatch } from "@/lib/translate";
import { kvGet, kvSet } from "@/lib/kv";
import {
  normalizeTranslationSource,
  translationCacheKey,
} from "@/lib/translationCacheKey";
import { dbTranslationLookup, dbTranslationUpsertMany } from "@/lib/translationCacheDb";

function memKvKey(target: string, normalizedText: string): string {
  return `tr:${target}:${translationCacheKey(normalizedText, target)}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const texts = Array.isArray(body.q) ? body.q : [String(body.q || "")];
    const target = body.target as string;

    if (!target) {
      console.error("translate: target missing", body);
      return NextResponse.json({ error: "target required" }, { status: 400 });
    }

    const clean = texts.map((t) => normalizeTranslationSource(String(t ?? "")));
    if (clean.length === 0 || !clean[0]) {
      console.error("translate: empty text");
      return NextResponse.json({ error: "text required" }, { status: 400 });
    }

    const results: (string | undefined)[] = new Array(clean.length);
    const miss: { idx: number; text: string }[] = [];

    // L1: プロセス内メモリ KV（短いキー = sha256）
    for (let i = 0; i < clean.length; i++) {
      const t = clean[i];
      if (!t) {
        results[i] = "";
        continue;
      }
      const hit = kvGet(memKvKey(target, t));
      if (hit != null) results[i] = hit;
      else miss.push({ idx: i, text: t });
    }

    // L2: DB（再起動後も同一原文は API 不要）
    if (miss.length > 0) {
      let dbMap = new Map<string, string>();
      try {
        dbMap = await dbTranslationLookup(
          miss.map((m) => m.text),
          target
        );
      } catch (e) {
        console.warn("[translate] DB cache lookup skipped", e);
      }
      const stillMiss: { idx: number; text: string }[] = [];
      for (const m of miss) {
        const hitDb = dbMap.get(m.text);
        if (hitDb != null) {
          results[m.idx] = hitDb;
          kvSet(memKvKey(target, m.text), hitDb);
        } else {
          stillMiss.push(m);
        }
      }
      miss.length = 0;
      miss.push(...stillMiss);
    }

    // L3: Google API → L1/L2 に保存
    if (miss.length > 0) {
      const translated = await translateBatch(
        miss.map((m) => m.text),
        target
      );
      const toPersist: { source: string; targetLang: string; translated: string }[] = [];
      miss.forEach((m, k) => {
        const val = translated[k] ?? m.text;
        results[m.idx] = val;
        kvSet(memKvKey(target, m.text), val);
        if (val && val !== m.text) {
          toPersist.push({ source: m.text, targetLang: target, translated: val });
        }
      });
      try {
        await dbTranslationUpsertMany(toPersist);
      } catch (e) {
        console.warn("[translate] DB cache persist skipped", e);
      }
    }

    return NextResponse.json({
      translations: results.map((r, i) => r ?? clean[i] ?? ""),
    });
  } catch (err) {
    console.error("translate route error:", err);
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
}
