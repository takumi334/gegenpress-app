"use client";

import Link from "next/link";
import GlobeTranslate from "@components/GlobeTranslate";
import SearchBox from "@/components/SearchBox";

export default function SiteHeader() {
  return (
    <header className="w-full border-b bg-white/70 backdrop-blur text-black">
      <div className="mx-auto max-w-6xl px-4 py-3 flex flex-col gap-3">
        {/* 1段目: ロゴ + リーグタブ + 言語 */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-extrabold tracking-widest text-xl shrink-0">
              GEGENPRESS
            </Link>
            <nav className="flex flex-wrap gap-2 text-sm">
              <Link href="/leagues/PL" className="hover:underline">PL</Link>
              <Link href="/leagues/PD" className="hover:underline">PD</Link>
              <Link href="/leagues/SA" className="hover:underline">SA</Link>
              <Link href="/leagues/BL1" className="hover:underline">BL1</Link>
              <Link href="/leagues/FL1" className="hover:underline">FL1</Link>
            </nav>
          </div>
          <div className="shrink-0">
            <GlobeTranslate />
          </div>
        </div>
        {/* 2段目: 検索バー（幅100%） */}
        <div className="w-full">
          <SearchBox className="w-full" />
        </div>
      </div>
    </header>
  );
}

