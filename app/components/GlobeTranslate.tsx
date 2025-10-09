// app/components/GlobeTranslate.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Lang = { language: string; name: string };

/* ---------- helpers ---------- */
function restoreOriginals() {
  // data-i18n-src に退避しておいた原文を戻す
  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>("[data-i18n]")
  );
  nodes.forEach((el) => {
    const src = el.getAttribute("data-i18n-src");
    if (typeof src === "string") el.textContent = src; // innerText ではなく textContent
  });
}

async function translatePage(targetLang: string, abort?: AbortSignal) {
  if (!targetLang) return;

  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>("[data-i18n]")
  );
  if (nodes.length === 0) return;

  // 原文の退避（未保存要素だけ）
  const originals = nodes.map(
    (el) => el.getAttribute("data-i18n-src") ?? (el.textContent ?? "")
  );
  nodes.forEach((el, i) => {
    if (!el.getAttribute("data-i18n-src")) {
      el.setAttribute("data-i18n-src", originals[i] ?? "");
    }
  });

  // 空文字は送らない
  const payload: { idx: number; text: string }[] = [];
  originals.forEach((t, i) => {
    const s = (t ?? "").trim();
    if (s) payload.push({ idx: i, text: s });
  });
  if (payload.length === 0) return;

  const r = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      q: payload.map((p) => p.text),
      target: targetLang,
      format: "text",
    }),
    signal: abort, // 同時実行の競合を防ぐ
    cache: "no-store",
  }).catch((e) => {
    if ((e as any)?.name !== "AbortError") console.error(e);
    return null;
  });
  if (!r || !r.ok) return;

  const data = await r.json().catch(() => ({}));
  const translated: string[] = data?.translations ?? [];

  payload.forEach((p, k) => {
    const t = translated[k];
    if (typeof t === "string") nodes[p.idx].textContent = t;
  });
}

/* ---------- component ---------- */
export default function GlobeTranslate() {
  // 既定の母国語はブラウザ言語
  const defaultBase =
    typeof navigator !== "undefined"
      ? navigator.language?.split("-")[0] || "ja"
      : "ja";

  const [languages, setLanguages] = useState<Lang[]>([]);
  const [loading, setLoading] = useState(false);

  const [baseLang, setBaseLang] = useState<string>(() => {
    try {
      return localStorage.getItem("baseLang") ?? defaultBase;
    } catch {
      return defaultBase;
    }
  });

  const [targetLang, setTargetLang] = useState<string>(() => {
    try {
      // 互換性のため古い key "lang" も参照
      return (
        localStorage.getItem("targetLang") ||
        localStorage.getItem("lang") ||
        (typeof navigator !== "undefined"
          ? navigator.language?.split("-")[0] || "ja"
          : "ja")
      );
    } catch {
      return defaultBase;
    }
  });

  // 進行中リクエストのキャンセル制御
  const abortRef = useRef<AbortController | null>(null);
  const cancelRunning = () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    return abortRef.current.signal;
  };

  // 言語リストの取得（失敗時は固定配列にフォールバック）
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await fetch("/api/languages", { cache: "no-store" });
        if (!r.ok) return;
        const data = await r.json();
        if (mounted && Array.isArray(data.languages)) {
          setLanguages(data.languages);
        }
      } catch {
        /* no-op */
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const opts = useMemo<Lang[]>(
    () =>
      languages.length
        ? languages
        : [
            { language: "en", name: "English" },
            { language: "ja", name: "日本語" },
            { language: "es", name: "Español" },
            { language: "de", name: "Deutsch" },
            { language: "fr", name: "Français" },
            { language: "ko", name: "한국어" },
            { language: "zh", name: "中文" },
          ],
    [languages]
  );

  // 母国語変更
  const onChangeBase = (v: string) => {
    setBaseLang(v);
    try {
      localStorage.setItem("baseLang", v);
    } catch {}
    if (v === targetLang) restoreOriginals();
  };

  // 対象言語変更
  const onChangeTarget = async (v: string) => {
    setTargetLang(v);
    try {
      localStorage.setItem("targetLang", v);
      localStorage.setItem("lang", v); // 互換キーも同時保存
    } catch {}
    setLoading(true);
    try {
      if (v === baseLang) {
        restoreOriginals();
      } else {
        const signal = cancelRunning();
        await translatePage(v, signal);
      }
    } finally {
      setLoading(false);
    }
  };

  // 初期適用：保存済み target が base と異なる場合のみ翻訳
  useEffect(() => {
    const saved =
      ((): string | null => {
        try {
          return (
            localStorage.getItem("targetLang") || localStorage.getItem("lang")
          );
        } catch {
          return null;
        }
      })() || targetLang;

    if (saved && saved !== baseLang) {
      setLoading(true);
      const signal = cancelRunning();
      translatePage(saved, signal).finally(() => setLoading(false));
    } else {
      restoreOriginals();
    }
    // 初回のみ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex items-center gap-2">
      <span aria-hidden>🌍</span>

      {/* 母国語 */}
      <label className="text-xs opacity-80">Native</label>
      <select
        value={baseLang}
        onChange={(e) => onChangeBase(e.target.value)}
        className="rounded-md bg-white/10 px-2 py-1 text-sm"
        aria-label="Native language"
      >
        {opts.map((l) => (
          <option key={l.language} value={l.language}>
            {l.name}
          </option>
        ))}
      </select>

      {/* 対象言語 */}
      <label className="text-xs opacity-80">Target</label>
      <select
        value={targetLang}
        onChange={(e) => onChangeTarget(e.target.value)}
        className="rounded-md bg-white/10 px-2 py-1 text-sm"
        aria-label="Target language"
        disabled={loading}
      >
        {opts.map((l) => (
          <option key={l.language} value={l.language}>
            {l.name}
          </option>
        ))}
      </select>

      {loading && <span className="text-xs opacity-80">Translating…</span>}
    </div>
  );
}

