import Link from "next/link";
import GlobeTranslate from "@components/GlobeTranslate"; // ← 統一

export default function SiteHeader() {
  return (
    <header className="w-full px-6 py-4 border-b bg-white/70 backdrop-blur text-black">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link href="/" className="font-extrabold tracking-widest text-xl">
          GEGENPRESS
        </Link>

        <nav className="flex gap-4 text-sm">
          <Link href="/leagues/PL">PL</Link>
          <Link href="/leagues/PD">PD</Link>
          <Link href="/leagues/SA">SA</Link>
          <Link href="/leagues/BL1">BL1</Link>
          <Link href="/leagues/FL1">FL1</Link>
        </nav>

        <GlobeTranslate />
      </div>
    </header>
  );
}

