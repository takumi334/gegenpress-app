// app/layout.tsx
import "./globals.css";
import { Suspense } from "react";
import { getInitialLocale } from "@/lib/i18n";
import { I18nUIProvider } from "@/lib/i18n-ui";
import SiteHeader from "./components/SiteHeader";
import GrammarHints from "./components/GrammarHints";
import AdBreakProvider from "./components/AdBreakProvider";

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export const metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: {
    default: "Gegenpress | 海外サッカー掲示板・試合予想・翻訳付き",
    template: "%s | Gegenpress",
  },
  description:
    "Gegenpressは海外サッカー掲示板。海外ファンの反応や試合予想を翻訳付きでチェックできる翻訳付き掲示板です。",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "Gegenpress",
    title: "Gegenpress | 海外サッカー掲示板・試合予想・翻訳付き",
    description:
      "海外サッカー掲示板。海外ファンの反応や試合予想を翻訳付きでチェックできる翻訳付き掲示板。",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gegenpress | 海外サッカー掲示板・試合予想",
    description: "海外サッカー掲示板。海外ファンの反応や試合予想を翻訳付きでチェック。",
  },
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

