// app/sim/page.tsx
"use client";

import { useState } from "react";

export default function SimPage() {
  const [home, setHome] = useState("arsenal");
  const [away, setAway] = useState("chelsea");
  const [res, setRes] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    setRes(null);
    const r = await fetch(`/api/sim?home=${home}&away=${away}`, { cache: "no-store" });
    const j = await r.json();
    setRes(j);
    setLoading(false);
  }

  return (
    <main className="container mx-auto max-w-xl p-6 space-y-4">
      <h1 className="text-2xl font-bold">Match Simulator</h1>
      <div className="flex gap-2">
        <input className="border p-2 rounded w-full" value={home} onChange={e=>setHome(e.target.value)} placeholder="home slug (e.g. arsenal)" />
        <span className="px-2 grid place-items-center">vs</span>
        <input className="border p-2 rounded w-full" value={away} onChange={e=>setAway(e.target.value)} placeholder="away slug (e.g. chelsea)" />
      </div>
      <button disabled={loading} onClick={run} className="px-4 py-2 rounded bg-black text-white disabled:opacity-50">
        {loading ? "Simulating..." : "Simulate"}
      </button>

      {res && !res.error && (
        <div className="mt-4 space-y-2 text-sm">
          <div>Home win: {(res.homeWin * 100).toFixed(1)}%</div>
          <div>Draw: {(res.draw * 100).toFixed(1)}%</div>
          <div>Away win: {(res.awayWin * 100).toFixed(1)}%</div>
          <div className="mt-2">
            Top scores:
            <ul className="list-disc ml-5">
              {res.topScores.map((s: any) => (
                <li key={s.score}>{s.score} ({(s.p * 100).toFixed(1)}%)</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {res?.error && <p className="text-red-600">Error: {res.error}</p>}
    </main>
  );
}

