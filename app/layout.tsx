// app/layout.tsx
import "./globals.css";
import { Suspense } from "react";
import { getInitialLocale } from "@/lib/i18n";
import { I18nUIProvider } from "@/lib/i18n-ui";
import SiteHeader from "./components/SiteHeader";
import GrammarHints from "./components/GrammarHints";
import AdBreakProvider from "./components/AdBreakProvider";

export const metadata = {
  verification: {
    google: "YpiM3LqythtSfHft11x7j6oR5GgA_N6u9kqNt-M3nC4",
  },
};

export default async function RootLayout({ children }) {
  const initialLocale = await getInitialLocale();

  return (
    <html lang={initialLocale} translate="no" className="notranslate">
      <head>
        <meta
          name="google-site-verification"
          content="YpiM3LqythtSfHft11x7j6oR5GgA_N6u9kqNt-M3nC4"
        />
      </head>

      <body className="min-h-dvh bg-black text-white antialiased">
        <I18nUIProvider initialLocale={initialLocale}>
          <Suspense fallback={null}>
          <AdBreakProvider>
            <div className="border-b border-white/10">
              <div className="mx-auto max-w-6xl p-4">
                <SiteHeader />
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

