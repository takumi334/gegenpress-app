// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import SiteHeader from "@/components/SiteHeader";
import AutoTranslateOnLoad from "@/components/AutoTranslateOnLoad";

export const metadata: Metadata = {
  title: "Gegenpress",
  description: "European football hub (Football-Data.org)",
  // 明示しておくとブラウザの判定が安定
  metadataBase: new URL("https://example.com"),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // 🔒 ページ全体を“自動翻訳対象外”に
    <html lang="en" translate="no" className="notranslate">
      <head>
        {/* Google 自動翻訳への明示 */}
        <meta name="google" content="notranslate" />
        <meta httpEquiv="Content-Language" content="en" />

        {/* ここはそのまま（AdSense） */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
          crossOrigin="anonymous"
        />
      </head>

      <body className="min-h-dvh bg-black text-white antialiased">
        <SiteHeader />
        <AutoTranslateOnLoad />
        {children}
      </body>
    </html>
  );
}

