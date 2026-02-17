// app/components/Header.tsx
"use client";

import GlobeTranslate from "@/components/GlobeTranslate";
import SearchBox from "@/components/SearchBox";

export default function Header() {
  return (
    <header className="grid grid-cols-[auto,1fr,auto] items-center gap-4 px-4 py-2">
      <h1 className="text-lg font-bold text-white">GEGENPRESS</h1>

      {/* 検索：中央で常に表示 */}
      <SearchBox />

      {/* 言語：右 */}
      <GlobeTranslate />
    </header>
  );
}
