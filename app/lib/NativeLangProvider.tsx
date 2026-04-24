"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { t as tFn } from "./translations";
import { UI_STORAGE_KEY } from "@/lib/i18n/ui";

/** UI表示用の言語（ラベル・見出し・ボタンなど）。投稿の Native/Target とは別。 */
export type UILanguage = "ja" | "en" | "it" | "es" | "de";

function getStoredUILanguage(): UILanguage {
  if (typeof window === "undefined") return "en";
  try {
    const saved =
      localStorage.getItem(UI_STORAGE_KEY) ||
      localStorage.getItem("nativeLang") ||
      localStorage.getItem("baseLang");
    if (saved === "ja" || saved === "en" || saved === "it" || saved === "es" || saved === "de") return saved;
    const browser = navigator.language?.split("-")[0] || "en";
    if (browser === "ja" || browser === "en" || browser === "it" || browser === "es" || browser === "de") {
      return browser;
    }
    return "en";
  } catch {
    return "en";
  }
}

type Ctx = {
  /** UI言語（画面全体のラベル・見出しに使用）。投稿翻訳の Native/Target とは別。 */
  uiLanguage: UILanguage;
  setUILanguage: (v: UILanguage) => void;
  /** 辞書参照。uiLanguage に応じた文言を返す */
  t: (key: string, params?: Record<string, string | number>) => string;
  /** @deprecated use uiLanguage */
  nativeLang: UILanguage;
  /** @deprecated use setUILanguage */
  setNativeLang: (v: UILanguage) => void;
};

const Ctx = createContext<Ctx | null>(null);

export function NativeLangProvider({ children }: { children: ReactNode }) {
  const [uiLanguage, setState] = useState<UILanguage>("en");

  useEffect(() => {
    setState(getStoredUILanguage());
    const handleStorage = () => setState(getStoredUILanguage());
    window.addEventListener("storage", handleStorage);
    window.addEventListener("nativeLangChange", handleStorage);
    window.addEventListener("uiLanguageChange", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("nativeLangChange", handleStorage);
      window.removeEventListener("uiLanguageChange", handleStorage);
    };
  }, []);

  const setUILanguage = useCallback((v: UILanguage) => {
    setState(v);
    try {
      localStorage.setItem(UI_STORAGE_KEY, v);
      localStorage.setItem("nativeLang", v);
      localStorage.setItem("baseLang", v);
      window.dispatchEvent(new Event("nativeLangChange"));
      window.dispatchEvent(new Event("uiLanguageChange"));
    } catch {}
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      tFn(uiLanguage, key, params),
    [uiLanguage]
  );

  const value: Ctx = {
    uiLanguage,
    setUILanguage,
    t,
    nativeLang: uiLanguage,
    setNativeLang: setUILanguage,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUILanguage(): UILanguage {
  const ctx = useContext(Ctx);
  return ctx?.uiLanguage ?? "en";
}

export function useSetUILanguage(): (v: UILanguage) => void {
  const ctx = useContext(Ctx);
  return ctx?.setUILanguage ?? (() => {});
}

export function useNativeLang(): UILanguage {
  const ctx = useContext(Ctx);
  return ctx?.nativeLang ?? "en";
}

export function useSetNativeLang(): (v: UILanguage) => void {
  const ctx = useContext(Ctx);
  return ctx?.setNativeLang ?? (() => {});
}

export function useT(): (key: string, params?: Record<string, string | number>) => string {
  const ctx = useContext(Ctx);
  return ctx?.t ?? ((key: string) => key);
}
