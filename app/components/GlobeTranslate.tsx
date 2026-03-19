// app/components/GlobeTranslate.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useUILanguage, useSetUILanguage } from "@/lib/NativeLangProvider";
import type { UILanguage } from "@/lib/NativeLangProvider";

type Lang = { language: string; name: string };

const FALLBACK_OPTS: Lang[] = [
  { language: "en", name: "English" },
  { language: "ja", name: "日本語" },
];

export default function GlobeTranslate() {
  const uiLanguage = useUILanguage();
  const setUILanguage = useSetUILanguage();
  const [languages, setLanguages] = useState<Lang[]>([]);

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

  const opts = useMemo(
    () => (languages.length ? languages : FALLBACK_OPTS),
    [languages]
  );

  const handleChange = (v: string) => {
    const lang = (v === "ja" ? "ja" : "en") as UILanguage;
    setUILanguage(lang);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 min-w-[120px]">
      <span aria-hidden className="shrink-0">🌍</span>
      <div className="flex items-center gap-1 shrink-0">
        <label className="text-xs opacity-80 whitespace-nowrap">UI</label>
        <select
          value={uiLanguage}
          onChange={(e) => handleChange(e.target.value)}
          className="rounded-md bg-white/10 px-2 py-1 text-sm min-w-[100px] w-auto"
          aria-label="UI language"
          style={{ maxWidth: "100%" }}
        >
          {opts.map((l) => (
            <option key={l.language} value={l.language}>
              {l.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
