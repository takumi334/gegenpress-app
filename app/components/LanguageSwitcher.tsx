// app/components/LanguageSwitcher.tsx
"use client";
import { useI18n } from "../lib/i18n-ui";
import { LANG_OPTIONS } from "../lib/grammar";
import { useState } from "react";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} aria-haspopup="listbox" aria-expanded={open}>
        {locale.toUpperCase()}
      </button>
      {open && (
        <ul role="listbox" className="absolute right-0 mt-2 w-48 rounded-2xl border bg-black/80 backdrop-blur p-1">
          {LANG_OPTIONS.map(opt => (
            <li key={opt.code}>
              <button
                className="w-full text-left px-3 py-2 hover:bg-white/10 rounded-xl"
                onClick={() => { setLocale(opt.code); setOpen(false); }}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}