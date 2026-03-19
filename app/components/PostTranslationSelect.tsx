"use client";

import { useEffect, useState } from "react";
import { usePostTranslation } from "@/lib/PostTranslationContext";
import {
  POST_TRANSLATION_LANGUAGES,
  type PostTranslationLangCode,
} from "@/lib/postTranslationLangs";

export default function PostTranslationSelect() {
  const [mounted, setMounted] = useState(false);
  const {
    nativeLang,
    targetLang,
    setNativeLang,
    setTargetLang,
    sameLanguage,
  } = usePostTranslation();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex flex-wrap items-center gap-2 min-w-[200px] h-8" aria-hidden />
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 min-w-0">
      <div className="flex items-center gap-1 shrink-0">
        <label className="text-xs opacity-80 whitespace-nowrap">Native</label>
        <select
          value={nativeLang}
          onChange={(e) =>
            setNativeLang((e.target.value || "ja") as PostTranslationLangCode)
          }
          className="rounded-md bg-white/10 px-2 py-1 text-sm min-w-[90px] max-w-[120px] border border-gray-300 text-inherit"
          aria-label="Native language for posts"
        >
          {POST_TRANSLATION_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <label className="text-xs opacity-80 whitespace-nowrap">Target</label>
        <select
          value={targetLang}
          onChange={(e) =>
            setTargetLang((e.target.value || "en") as PostTranslationLangCode)
          }
          className="rounded-md bg-white/10 px-2 py-1 text-sm min-w-[90px] max-w-[120px] border border-gray-300 text-inherit"
          aria-label="Target translation language"
        >
          {POST_TRANSLATION_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.name}
            </option>
          ))}
        </select>
      </div>
      {sameLanguage && (
        <span className="text-[10px] opacity-70 whitespace-nowrap" title="翻訳不要">
          翻訳不要
        </span>
      )}
    </div>
  );
}
