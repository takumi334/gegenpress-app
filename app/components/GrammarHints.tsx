"use client";

// app/components/GrammarHints.tsx
import { MINI_GRAMMAR, LANG_OPTIONS } from "../lib/grammar";
// grammar.tsを使う
import { useMemo, useState, useEffect } from "react";

export default function GrammarHints() {
  const [locale, setLocale] = useState<keyof typeof MINI_GRAMMAR>("en");
  const [open, setOpen] = useState(false);

  // localStroageからtargetLangを取得してsetLocaleする処理を追加 2025/11/18
  useEffect(() => {
    const storedLang = localStorage.getItem("targetLang");
    console.log("storedLang:", storedLang);
    if (storedLang && LANG_OPTIONS.some(l => l.code === storedLang)) {
      setLocale(storedLang as keyof typeof MINI_GRAMMAR);
    }
  },[locale]);

  const tips = useMemo(() => {
    const list = MINI_GRAMMAR[locale] ?? [];
    return list.slice(0, 3);
  }, [locale]);

  const currentLabel = useMemo(() => {
    return LANG_OPTIONS.find(l => l.code === locale)?.label ?? locale.toUpperCase();
  }, [locale]);

  return (
    <div className="mx-auto max-w-6xl px-4 mt-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-sm underline underline-offset-4 decoration-white/30 hover:decoration-white/60"
        aria-expanded={open}
      >
        Grammar tips for {currentLabel}
      </button>
      {open && (
        <ul className="mt-2 space-y-1 text-sm text-white/80 list-disc pl-6">
          {tips.map((t, i) => <li key={i}>{t}</li>)}
        </ul>
      )}
    </div>
  );
}

