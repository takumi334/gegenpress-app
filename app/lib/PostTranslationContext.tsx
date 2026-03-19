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
};

const PostTranslationCtx = createContext<Ctx | null>(null);

export function PostTranslationProvider({ children }: { children: ReactNode }) {
  const [nativeLang, setNativeState] = useState<PostTranslationLangCode>(
    DEFAULT_NATIVE_LANG
  );
  const [targetLang, setTargetState] = useState<PostTranslationLangCode>(
    DEFAULT_TARGET_LANG
  );

  useEffect(() => {
    setNativeState(getStored(STORAGE_NATIVE, DEFAULT_NATIVE_LANG));
    setTargetState(getStored(STORAGE_TARGET, DEFAULT_TARGET_LANG));
  }, []);

  const setNativeLang = useCallback((v: PostTranslationLangCode) => {
    setNativeState(v);
    try {
      localStorage.setItem(STORAGE_NATIVE, v);
    } catch {}
  }, []);

  const setTargetLang = useCallback((v: PostTranslationLangCode) => {
    setTargetState(v);
    try {
      localStorage.setItem(STORAGE_TARGET, v);
    } catch {}
  }, []);

  const sameLanguage = nativeLang === targetLang;

  const value: Ctx = {
    nativeLang,
    targetLang,
    setNativeLang,
    setTargetLang,
    sameLanguage,
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
    };
  }
  return ctx;
}
