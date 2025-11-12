// lib/i18n-ui.tsx (CLIENT ONLY)
"use client";
import React, { createContext, useContext, useState, ReactNode } from "react";

type Ctx = { locale: string; setLocale: (v: string) => void };
const I18nCtx = createContext<Ctx | null>(null);

export function I18nUIProvider({
  initialLocale,
  children,
}: { initialLocale: string; children: ReactNode }) {
  const [locale, setLocale] = useState(initialLocale);
  return <I18nCtx.Provider value={{ locale, setLocale }}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const v = useContext(I18nCtx);
  if (!v) throw new Error("useI18n must be used inside I18nUIProvider");
  return v;
}

