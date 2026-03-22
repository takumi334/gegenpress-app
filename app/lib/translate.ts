const GOOGLE_URL = "https://translation.googleapis.com/language/translate/v2";

/** 1チャンクあたりの最大文字数（Google API の Text too long を避ける） */
const MAX_CHUNK_LENGTH = 1200;

/** 1リクエストあたりの最大セグメント数（API 制限に余裕を持たせる） */
const MAX_SEGMENTS_PER_REQUEST = 25;

type CacheKey = `${string}::${string}`;
const MAX_ENTRIES = 2000;
const TTL_MS = 24 * 60 * 60 * 1000;

const mem = new Map<CacheKey, { t: number; v: string }>();

function normalize(s: string) {
  return (s ?? "").replace(/\s+/g, " ").trim();
}
function keyOf(text: string, target: string): CacheKey {
  return `${normalize(text)}::${target}`;
}
function getGoogleKey(): string {
  const v = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!v) throw new Error("GOOGLE_TRANSLATE_API_KEY is missing!");
  return v;
}
function getCached(text: string, target: string) {
  const k = keyOf(text, target);
  const hit = mem.get(k);
  if (!hit) return null;
  if (Date.now() - hit.t > TTL_MS) { mem.delete(k); return null; }
  mem.delete(k); mem.set(k, hit);   // LRU
  return hit.v;
}
function setCached(text: string, target: string, v: string) {
  const k = keyOf(text, target);
  if (mem.size >= MAX_ENTRIES) {
    const first = mem.keys().next().value;
    if (first) mem.delete(first);
  }
  mem.set(k, { t: Date.now(), v });
}

/**
 * 翻訳API用に長文を安全な長さのチャンクに分割する。
 * 改行・段落・句読点を優先して分割し、それでも長い場合は強制で切る。
 */
export function splitForTranslate(text: string, maxLen: number = MAX_CHUNK_LENGTH): string[] {
  const s = (text ?? "").trim();
  if (!s) return [];
  if (s.length <= maxLen) return [s];

  const chunks: string[] = [];
  let rest = s;

  while (rest.length > 0) {
    if (rest.length <= maxLen) {
      chunks.push(rest);
      break;
    }
    let splitAt = -1;
    const segment = rest.slice(0, maxLen + 1);
    const preferBreak = ["\n\n", "\n", "。", ".", "!", "?", "；", ";", "、", ",", " "];
    for (const sep of preferBreak) {
      const i = segment.lastIndexOf(sep);
      if (i > maxLen * 0.3) {
        splitAt = i + sep.length;
        break;
      }
      if (i > 0 && splitAt < 0) splitAt = i + sep.length;
    }
    if (splitAt <= 0) splitAt = maxLen;
    chunks.push(rest.slice(0, splitAt));
    rest = rest.slice(splitAt).replace(/^\s+/, "");
  }

  return chunks.filter((c) => c.length > 0);
}

/**
 * 複数チャンクを順に翻訳し、結果を結合する。一部失敗時は当該チャンクは原文のまま返しログを残す。
 */
async function translateChunkBatch(
  chunks: string[],
  target: string,
  key: string
): Promise<{ results: string[]; failedChunkIndices: number[] }> {
  const results: string[] = new Array(chunks.length);
  const failedChunkIndices: number[] = [];

  for (let i = 0; i < chunks.length; i += MAX_SEGMENTS_PER_REQUEST) {
    const batch = chunks.slice(i, i + MAX_SEGMENTS_PER_REQUEST);
    const batchIndices = batch.map((_, j) => i + j);
    try {
      const res = await fetch(`${GOOGLE_URL}?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: batch, target, format: "text" }),
        cache: "no-store",
      });
      const body = await res.text();
      if (!res.ok) {
        console.warn("[translate] chunk batch failed", {
          responseStatus: res.status,
          failedChunkIndices: batchIndices,
          bodySlice: body.slice(0, 200),
        });
        batchIndices.forEach((idx) => failedChunkIndices.push(idx));
        batch.forEach((chunk, j) => {
          results[batchIndices[j]] = chunk;
        });
        continue;
      }
      const json = JSON.parse(body) as { data?: { translations?: Array<{ translatedText?: string }> } };
      const trs = (json.data?.translations ?? []).map((t) => t?.translatedText ?? "");
      batchIndices.forEach((batchIdx, j) => {
        results[batchIdx] = trs[j] ?? batch[j];
      });
    } catch (e) {
      console.warn("[translate] chunk batch error", { batchIndices, error: e });
      batchIndices.forEach((idx) => failedChunkIndices.push(idx));
      batch.forEach((chunk, j) => {
        results[batchIndices[j]] = chunk;
      });
    }
  }

  return { results, failedChunkIndices };
}

export async function translateBatch(texts: string[], target: string): Promise<string[]> {
  const key = getGoogleKey();
  const clean = (texts ?? []).map((t) => (t ?? "").trim());
  if (!target) throw new Error("target is required");
  if (clean.length === 0) return [];

  const out: string[] = new Array(clean.length);
  const need: { idx: number; text: string }[] = [];
  clean.forEach((t, i) => {
    if (!t) {
      out[i] = "";
      return;
    }
    const hit = getCached(t, target);
    if (hit != null) out[i] = hit;
    else need.push({ idx: i, text: t });
  });
  if (need.length === 0) return out;

  /**
   * 複数原文を「チャンク列」に展開し、Google の q[] を最大 MAX_SEGMENTS_PER_REQUEST 件ずつまとめて呼ぶ。
   * （旧実装は原文ごとに逐次 fetch しており、スレッド一覧等で API 回数が爆増していた）
   */
  type Expansion = { idx: number; text: string; chunks: string[] };
  const expansions: Expansion[] = [];
  for (const n of need) {
    const chunks = splitForTranslate(n.text);
    if (chunks.length === 0) {
      out[n.idx] = "";
      continue;
    }
    expansions.push({ idx: n.idx, text: n.text, chunks });
  }

  if (expansions.length === 0) return out;

  const flatChunks: string[] = [];
  /** flatChunks[i] が属する expansions 内の元インデックス（out の添字） */
  const flatOwnerIdx: number[] = [];
  for (const ex of expansions) {
    for (const ch of ex.chunks) {
      flatChunks.push(ch);
      flatOwnerIdx.push(ex.idx);
    }
  }

  const translatedFlat: string[] = new Array(flatChunks.length);
  for (let i = 0; i < flatChunks.length; i += MAX_SEGMENTS_PER_REQUEST) {
    const batch = flatChunks.slice(i, i + MAX_SEGMENTS_PER_REQUEST);
    const { results, failedChunkIndices } = await translateChunkBatch(batch, target, key);
    for (let j = 0; j < batch.length; j++) {
      translatedFlat[i + j] = results[j] ?? batch[j];
    }
    if (failedChunkIndices.length > 0) {
      console.warn("[translate] batch partial failure", {
        batchStart: i,
        failedChunkIndices: failedChunkIndices.map((k) => k - i),
      });
    }
  }

  const partsByOutIdx = new Map<number, string[]>();
  for (let i = 0; i < translatedFlat.length; i++) {
    const oi = flatOwnerIdx[i];
    if (!partsByOutIdx.has(oi)) partsByOutIdx.set(oi, []);
    partsByOutIdx.get(oi)!.push(translatedFlat[i]);
  }

  for (const ex of expansions) {
    const parts = partsByOutIdx.get(ex.idx) ?? [];
    const joined = parts.join("");
    out[ex.idx] = joined;
    setCached(ex.text, target, joined);
  }

  return out;
}

export async function translateText(text: string, target: string): Promise<string> {
  const [t] = await translateBatch([text], target);
  return t ?? text;
}

