"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchBox() {
  const [q, setQ] = useState("");
  const router = useRouter();

  const go = () => {
    const s = q.trim();
    if (!s) return;
    router.push(`/search?q=${encodeURIComponent(s)}`);
  };

  return (
    <div className="w-full">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") go();
        }}
        placeholder="Search players / clubs / threads…"
        className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 outline-none focus:border-white/40"
      />
    </div>
  );
}

