"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchBox({ className = "" }: { className?: string }) {
  const [q, setQ] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const s = q.trim();
    if (!s) return;
    router.push(`/search?q=${encodeURIComponent(s)}`);
  };

  return (
    <form onSubmit={handleSubmit} className={className || "w-full"}>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search players / clubs / threads…"
        className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 outline-none focus:border-white/40"
        aria-label="Search"
      />
      <button type="submit" className="sr-only">
        Search
      </button>
    </form>
  );
}

