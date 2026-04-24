"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import GlobeTranslate from "@components/GlobeTranslate";
import PageI18nTranslateButton from "@components/PageI18nTranslateButton";
import PostTranslationSelect from "@components/PostTranslationSelect";

export default function SiteHeader() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <header className="w-full border-b bg-white/70 backdrop-blur text-black">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center">
              <Link href="/" className="font-extrabold tracking-widest text-xl shrink-0">
                GEGENPRESS
              </Link>
            </div>
            <div className="shrink-0 flex flex-wrap items-center gap-3">
              <div className="min-w-[220px] h-8" aria-hidden />
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="w-full border-b bg-white/70 backdrop-blur text-black">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center">
            <Link
              href="/"
              className="font-extrabold tracking-widest text-xl shrink-0"
            >
              GEGENPRESS
            </Link>
          </div>
          <div className="w-full sm:w-auto flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <PostTranslationSelect />
              <PageI18nTranslateButton />
            </div>
            <div className="hidden sm:block h-6 w-px bg-black/20" aria-hidden />
            <div className="pt-1 sm:pt-0">
              <GlobeTranslate />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
