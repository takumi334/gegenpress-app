// app/components/Header.tsx
import GlobeTranslate from "@/components/GlobeTranslate";

export default function Header() {
  return (
    <header className="flex items-center justify-between px-4 py-2">
      <h1 className="text-lg font-bold">GEGENPRESS</h1>
      <GlobeTranslate /> {/* ←ここだけでOK */}
    </header>
  );
}

