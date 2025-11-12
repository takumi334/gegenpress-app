'use client';

import { useEffect, useState } from "react";

type Lang = { language: string; name: string };

export default function GlobeTranslate() {
  const [languages, setLanguages] = useState<Lang[]>([]);
  const [lang, setLang] = useState("en");

  useEffect(() => {
    const fetchLanguages = async () => {
      const res = await fetch(
        `https://translation.googleapis.com/language/translate/v2/languages?key=${process.env.NEXT_PUBLIC_GOOGLE_TRANSLATE_API_KEY}&target=ja`
      );
      const data = await res.json();
      setLanguages(data.data.languages);
    };
    fetchLanguages();
  }, []);

  return (
    <div className="flex items-center gap-2">
      <span role="img" aria-label="globe">🌍</span>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        className="rounded-md bg-white/10 px-2 py-1 text-white text-sm"
      >
        {languages.map((l) => (
          <option key={l.language} value={l.language}>
            {l.name}
          </option>
        ))}
      </select>
    </div>
  );
}

