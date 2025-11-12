'use server';

const GOOGLE_URL = "https://translation.googleapis.com/language/translate/v2";

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

export async function translateBatch(texts: string[], target: string): Promise<string[]> {
  const key = getGoogleKey();
  const clean = (texts ?? []).map(t => (t ?? "").trim());
  if (!target) throw new Error("target is required");
  if (clean.length === 0) return [];

  const out: string[] = new Array(clean.length);
  const need: { idx: number; text: string }[] = [];
  clean.forEach((t, i) => {
    if (!t) { out[i] = ""; return; }
    const hit = getCached(t, target);
    if (hit != null) out[i] = hit; else need.push({ idx: i, text: t });
  });
  if (need.length === 0) return out;

  const res = await fetch(`${GOOGLE_URL}?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: need.map(n => n.text), target, format: "text" }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`google translate error ${res.status}: ${await res.text().catch(()=> "")}`);

  const json = await res.json() as { data?: { translations?: Array<{ translatedText?: string }> } };
  const trs = (json.data?.translations ?? []).map(t => t?.translatedText ?? "");

  need.forEach((n, i) => {
    const v = trs[i] ?? n.text;
    out[n.idx] = v;
    setCached(n.text, target, v);
  });
  return out;
}

export async function translateText(text: string, target: string): Promise<string> {
  const [t] = await translateBatch([text], target);
  return t ?? text;
}

