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

const isPreviewEnvironment = process.env.VERCEL_ENV === "preview";

export const metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Gegenpress - Football Tactics Board",
    template: "%s | Gegenpress",
  },
  description: "Create and discuss football tactics using interactive boards.",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "Gegenpress",
    title: "Gegenpress - Football Tactics Board",
    description: "Create and discuss football tactics using interactive boards.",
  },
  robots: isPreviewEnvironment
    ? {
        index: false,
        follow: false,
        googleBot: {
          index: false,
          follow: false,
          noimageindex: true,
        },
      }
    : undefined,
  twitter: {
    card: "summary_large_image",
    title: "Gegenpress - Football Tactics Board",
    description: "Create and discuss football tactics using interactive boards.",
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

