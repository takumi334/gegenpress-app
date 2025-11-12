// 翻訳：Google Cloud Translation v2（API Key方式）
// 必要: .env.local に GOOGLE_TRANSLATE_API_KEY=xxxxx
export async function translateGoogle(
  text: string,
  targetLang: string,
  sourceLang?: string
): Promise<string> {
  if (!text.trim()) return "";
  const key = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!key) throw new Error("GOOGLE_TRANSLATE_API_KEY is not set");

  const url = `https://translation.googleapis.com/language/translate/v2?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // q: 配列OK。ここでは単文で。
    body: JSON.stringify({ q: text, target: targetLang, source: sourceLang }),
    // Server only
    cache: "no-store",
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`[translate] ${res.status} ${res.statusText} ${t}`);
  }
  const json = (await res.json()) as {
    data?: { translations?: Array<{ translatedText: string }> };
  };
  return json?.data?.translations?.[0]?.translatedText ?? "";
}

// 文法解説：まずはスタブ（後でGPT/LLMに差し替え）
export async function explainGrammar(
  text: string,
  lang: "en" | "ja"
): Promise<string> {
  // TODO: OPENAI_API_KEY を使って実装に置換
  return `【${lang}文法解説(ダミー)】「${text.slice(0, 30)}…」の時制・語順・前置詞の使い方に注意。`;
}

