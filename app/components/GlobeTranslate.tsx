// app/components/GlobeTranslate.tsx
"use client";

import { useUILanguage, useSetUILanguage } from "@/lib/NativeLangProvider";
import type { UILanguage } from "@/lib/NativeLangProvider";
import { useT } from "@/lib/NativeLangProvider";
import { UI_LANGUAGES } from "@/lib/i18n/ui";

type Lang = { language: string; name: string };

export default function GlobeTranslate() {
  const uiLanguage = useUILanguage();
  const setUILanguage = useSetUILanguage();
  const t = useT();
  const opts: Lang[] = UI_LANGUAGES.map((l) => ({ language: l.code, name: l.label }));

  const handleChange = (v: string) => {
    const lang = (["ja", "en", "it", "es", "de"].includes(v) ? v : "en") as UILanguage;
    setUILanguage(lang);
  };

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span aria-hidden className="shrink-0">🌍</span>
      <div className="flex items-center gap-2 min-w-0">
        <label className="text-xs sm:text-sm font-medium text-black/80 whitespace-nowrap">
          UI Language:
        </label>
        <select
          value={uiLanguage}
          onChange={(e) => handleChange(e.target.value)}
          className="rounded-md border border-black/20 bg-white px-2 py-1 text-sm min-w-[120px] sm:min-w-[140px] max-w-[170px]"
          aria-label={t("header.uiLanguageAria")}
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
