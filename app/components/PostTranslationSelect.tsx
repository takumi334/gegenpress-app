"use client";

import { useEffect, useState } from "react";
import { usePostTranslation } from "@/lib/PostTranslationContext";
import { useT } from "@/lib/NativeLangProvider";
import {
  POST_TRANSLATION_LANGUAGES,
  type PostTranslationLangCode,
} from "@/lib/postTranslationLangs";

export default function PostTranslationSelect() {
  const t = useT();
  const [mounted, setMounted] = useState(false);
  const {
    nativeLang,
    targetLang,
    setNativeLang,
    setTargetLang,
    sameLanguage,
    translationTrigger,
    requestContentTranslation,
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
        <label className="text-xs opacity-80 whitespace-nowrap">{t("header.nativeLabel")}</label>
        <select
          value={nativeLang}
          onChange={(e) =>
            setNativeLang((e.target.value || "ja") as PostTranslationLangCode)
          }
          className="rounded-md bg-white/10 px-2 py-1 text-sm min-w-[90px] max-w-[120px] border border-gray-300 text-inherit"
          aria-label={t("header.nativeLanguageAria")}
        >
          {POST_TRANSLATION_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <label className="text-xs opacity-80 whitespace-nowrap">{t("header.targetLabel")}</label>
        <select
          value={targetLang}
          onChange={(e) =>
            setTargetLang((e.target.value || "en") as PostTranslationLangCode)
          }
          className="rounded-md bg-white/10 px-2 py-1 text-sm min-w-[90px] max-w-[120px] border border-gray-300 text-inherit"
          aria-label={t("header.targetLanguageAria")}
        >
          {POST_TRANSLATION_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.name}
            </option>
          ))}
        </select>
      </div>
      {sameLanguage && (
        <span className="text-[10px] opacity-70 whitespace-nowrap" title={t("header.translationNotRequired")}>
          {t("header.translationNotRequired")}
        </span>
      )}
      {!sameLanguage && (
        <button
          type="button"
          onClick={() => requestContentTranslation()}
          className="rounded-md bg-emerald-700 hover:bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white whitespace-nowrap shrink-0"
          title={t("header.translatePostsTitle")}
        >
          {t("header.translatePosts")}
          {translationTrigger > 0 ? " ✓" : ""}
        </button>
      )}
    </div>
  );
}
