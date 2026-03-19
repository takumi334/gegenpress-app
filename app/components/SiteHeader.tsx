"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import GlobeTranslate from "@components/GlobeTranslate";
import PostTranslationSelect from "@components/PostTranslationSelect";
import SearchBox from "@components/SearchBox";
import { useT } from "@/lib/NativeLangProvider";
import { lineupBuilderUi } from "@/lib/lineupBuilderUiCopy";

export default function SiteHeader() {
  const [mounted, setMounted] = useState(false);
  const t = useT();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <header className="w-full border-b bg-white/70 backdrop-blur text-black">
        <div className="mx-auto max-w-6xl px-4 py-3 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-4 flex-wrap">
              <Link href="/" className="font-extrabold tracking-widest text-xl shrink-0">
                GEGENPRESS
              </Link>
              <nav className="flex flex-wrap gap-2 text-sm">
                <Link href="/leagues/PL" className="hover:underline">PL</Link>
                <Link href="/leagues/PD" className="hover:underline">PD</Link>
                <Link href="/leagues/SA" className="hover:underline">SA</Link>
                <Link href="/leagues/BL1" className="hover:underline">BL1</Link>
                <Link href="/leagues/FL1" className="hover:underline">FL1</Link>
                <Link href="/lineup-builder" className="hover:underline">Lineup</Link>
                <Link href="/lineup-builder" className="hover:underline">
                  {lineupBuilderUi.tacticsBoard}
                </Link>
              </nav>
            </div>
            <div className="shrink-0 flex flex-wrap items-center gap-3">
              <div className="min-w-[220px] h-8" aria-hidden />
            </div>
          </div>
          <div className="w-full">
            <SearchBox className="w-full" />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="w-full border-b bg-white/70 backdrop-blur text-black">
      <div className="mx-auto max-w-6xl px-4 py-3 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-4 flex-wrap">
            <Link
              href="/"
              className="font-extrabold tracking-widest text-xl shrink-0"
            >
              GEGENPRESS
            </Link>
            <nav className="flex flex-wrap gap-2 text-sm">
              <Link href="/leagues/PL" className="hover:underline">
                PL
              </Link>
              <Link href="/leagues/PD" className="hover:underline">
                PD
              </Link>
              <Link href="/leagues/SA" className="hover:underline">
                SA
              </Link>
              <Link href="/leagues/BL1" className="hover:underline">
                BL1
              </Link>
              <Link href="/leagues/FL1" className="hover:underline">
                FL1
              </Link>
              <Link href="/lineup-builder" className="hover:underline">
                {t("header.lineup")}
              </Link>
              <Link href="/lineup-builder" className="hover:underline">
                {lineupBuilderUi.tacticsBoard}
              </Link>
            </nav>
          </div>
          <div className="shrink-0 flex flex-wrap items-center gap-3">
            <PostTranslationSelect />
            <GlobeTranslate />
          </div>
        </div>
        <div className="w-full">
          <SearchBox className="w-full" />
        </div>
      </div>
    </header>
  );
}
