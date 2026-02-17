// app/layout.tsx
import { getInitialLocale } from "@/lib/i18n";
import { I18nUIProvider } from "@/lib/i18n-ui";
// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import SiteHeader from "./components/SiteHeader";      // ← ★これを追加！
import LanguageSwitcher from "./components/LanguageSwitcher";
import GrammarHints from "./components/GrammarHints";
import AdBreakProvider from "./components/AdBreakProvider";
import { Suspense } from "react";



export default async function RootLayout({ children }) {
  const initialLocale = await getInitialLocale();

  return (
    <html lang={initialLocale} translate="no" className="notranslate" suppressHydrationWarning>
      <body className="min-h-dvh bg-black text-white antialiased">
        {/* 👇 ここで包む */}
        <I18nUIProvider initialLocale={initialLocale}>
          <Suspense fallback={null}>
          <AdBreakProvider>
            <div className="border-b border-white/10">
              <div className="mx-auto max-w-6xl p-4 flex items-center justify-between">
                <SiteHeader />
                <LanguageSwitcher /> {/* Provider の内側 */}
              </div>
            </div>

            <main className="mx-auto max-w-6xl p-4" id="main">
              {children}
            </main>

            <GrammarHints />
          </AdBreakProvider>
            </Suspense>
        </I18nUIProvider>
      </body>
    </html>
  );
}



