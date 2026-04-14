// app/layout.tsx
import "./globals.css";
import { Suspense } from "react";
import { getInitialLocale } from "@/lib/i18n";
import { I18nUIProvider } from "@/lib/i18n-ui";
import { NativeLangProvider } from "@/lib/NativeLangProvider";
import { PostTranslationProvider } from "@/lib/PostTranslationContext";
import SiteHeader from "./components/SiteHeader";
import GrammarHints from "./components/GrammarHints";
import AdBreakProvider from "./components/AdBreakProvider";
import { getSiteUrl } from "@/lib/publicSiteUrl";

export const metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Gegenpress｜海外サッカー掲示板・翻訳付き・試合予想",
    template: "%s | Gegenpress",
  },
  description:
    "海外サッカーの翻訳付き掲示板。プレミアリーグ・ラリーガなど各クラブの英語ファンコメントを翻訳で読め、試合予想や戦術議論も。海外サッカー好きの日本人ファン向け。",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "Gegenpress",
    title: "Gegenpress｜海外サッカー掲示板・翻訳付き・試合予想",
    description:
      "海外サッカーの翻訳付き掲示板。プレミアリーグ・ラリーガなど各クラブの英語ファンコメントを翻訳で読め、試合予想や戦術議論も。",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gegenpress｜海外サッカー掲示板・翻訳付き・試合予想",
    description:
      "海外サッカーの翻訳付き掲示板。英語ファンコメントを翻訳で読め、試合予想や戦術議論も。",
  },
  verification: {
    google: "YpiM3LqythtSfHft11x7j6oR5GgA_N6u9kqNt-M3nC4",
  },
};

export default async function RootLayout({ children }) {
  const initialLocale = await getInitialLocale();

  return (
    <html lang={initialLocale} translate="no" className="notranslate">
      <body className="min-h-dvh bg-black text-white antialiased">
        <I18nUIProvider initialLocale={initialLocale}>
          <NativeLangProvider>
          <PostTranslationProvider>
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
          </PostTranslationProvider>
          </NativeLangProvider>
        </I18nUIProvider>
      </body>
    </html>
  );
}

