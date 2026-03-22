"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_NATIVE_LANG,
  DEFAULT_TARGET_LANG,
  isValidPostTranslationLang,
  type PostTranslationLangCode,
} from "./postTranslationLangs";

const STORAGE_NATIVE = "postTranslationNative";
const STORAGE_TARGET = "postTranslationTarget";

function getStored(
  key: string,
  fallback: PostTranslationLangCode
): PostTranslationLangCode {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    if (v && isValidPostTranslationLang(v)) return v;
  } catch {}
  return fallback;
}

type Ctx = {
  nativeLang: PostTranslationLangCode;
  targetLang: PostTranslationLangCode;
  setNativeLang: (v: PostTranslationLangCode) => void;
  setTargetLang: (v: PostTranslationLangCode) => void;
  sameLanguage: boolean;
  /**
   * 0 = 掲示板本文などは API 翻訳しない（DB 保存済みのみ表示可）。
   * 「翻訳する」で +1 し、ThreadList / スレッド詳細 / lineup 名などがまとめて API 呼び出し。
   */
  translationTrigger: number;
  requestContentTranslation: () => void;
};

const PostTranslationCtx = createContext<Ctx | null>(null);

export function PostTranslationProvider({ children }: { children: ReactNode }) {
  const [nativeLang, setNativeState] = useState<PostTranslationLangCode>(
    DEFAULT_NATIVE_LANG
  );
  const [targetLang, setTargetState] = useState<PostTranslationLangCode>(
    DEFAULT_TARGET_LANG
  );
  const [translationTrigger, setTranslationTrigger] = useState(0);

  useEffect(() => {
    setNativeState(getStored(STORAGE_NATIVE, DEFAULT_NATIVE_LANG));
    setTargetState(getStored(STORAGE_TARGET, DEFAULT_TARGET_LANG));
  }, []);

  const setNativeLang = useCallback((v: PostTranslationLangCode) => {
    setNativeState(v);
    setTranslationTrigger(0);
    try {
      localStorage.setItem(STORAGE_NATIVE, v);
    } catch {}
  }, []);

  const setTargetLang = useCallback((v: PostTranslationLangCode) => {
    setTargetState(v);
    setTranslationTrigger(0);
    try {
      localStorage.setItem(STORAGE_TARGET, v);
    } catch {}
  }, []);

  const requestContentTranslation = useCallback(() => {
    setTranslationTrigger((n) => n + 1);
  }, []);

  const sameLanguage = nativeLang === targetLang;

  const value: Ctx = {
    nativeLang,
    targetLang,
    setNativeLang,
    setTargetLang,
    sameLanguage,
    translationTrigger,
    requestContentTranslation,
  };

  return (
    <PostTranslationCtx.Provider value={value}>
      {children}
    </PostTranslationCtx.Provider>
  );
}

export function usePostTranslation() {
  const ctx = useContext(PostTranslationCtx);
  if (!ctx) {
    return {
      nativeLang: DEFAULT_NATIVE_LANG as PostTranslationLangCode,
      targetLang: DEFAULT_TARGET_LANG as PostTranslationLangCode,
      setNativeLang: () => {},
      setTargetLang: () => {},
      sameLanguage: false,
      translationTrigger: 0,
      requestContentTranslation: () => {},
    };
  }
  return ctx;
}
