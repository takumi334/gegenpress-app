// app/components/NextMatchWidget.tsx
"use client";
import { useEffect, useState } from "react";

type Match = {
  utcDate: string;
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
  competition?: { name?: string };
  venue?: string;
};

export default function NextMatchWidget({ teamId }: { teamId: number }) {
  const [match, setMatch] = useState<Match | null>(null);
  const [pred, setPred] = useState<{ exp: { home: number; away: number }, top: {score:string;p:number}[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const r = await fetch(`/api/next-fixture?teamId=${teamId}`, { cache: "no-store" });
      const data = await r.json();
      if (!mounted) return;
      setMatch(data.fixture ?? null);
      if (data.match) {
        const h = data.match.homeTeam.id;
        const a = data.match.awayTeam.id;
        const pr = await fetch(`/api/predict?homeId=${h}&awayId=${a}`, { cache: "no-store" }).then(r=>r.json());
        if (!mounted) return;
        setPred(pr);
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [teamId]);

  if (loading) return <div className="border p-3 rounded">Loading next match…</div>;
  if (!match) return <div className="border p-3 rounded">No upcoming match.</div>;

  const dt = match.utcDate ? new Date(match.utcDate) : null;
const date = dt ? dt.toLocaleString() : "-";

  return (
    <div className="border p-3 rounded space-y-2">
      <div className="text-sm opacity-70">{match.competition?.name || "Next match"}</div>
      <div className="font-semibold">{match.homeTeam.name} vs {match.awayTeam.name}</div>
      <div className="text-sm">{date}</div>

      {pred && (
        <div className="mt-2">
          <div className="text-sm opacity-70">Expected goals (xG-like, simple)</div>
          <div>{match.homeTeam.name}: {pred.exp.home.toFixed(2)} / {match.awayTeam.name}: {pred.exp.away.toFixed(2)}</div>
          <div className="text-sm opacity-70 mt-2">Top scorelines</div>
          <ul className="list-disc pl-5">
            {pred.top.map((t, i) => (
              <li key={i}>{t.score}  ({(t.p*100).toFixed(1)}%)</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

