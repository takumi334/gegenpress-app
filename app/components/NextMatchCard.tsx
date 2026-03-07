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
      const m = data.match ?? data.fixture ?? null

const normalized =
  m && typeof m.homeTeam === "string"
    ? {
        utcDate: m?.utcDate,
        homeTeam: { id: Number(data?.homeId ?? 0), name: m?.homeTeam ?? "—" },
        awayTeam: { id: Number(data?.awayId ?? 0), name: m?.awayTeam ?? "—" },
        competition: m?.competition,
        venue: m?.venue,
      }
    : m;

      setMatch(normalized ?? null);

      if (data?.match?.homeTeam?.id != null && data?.match?.awayTeam?.id != null) {
        const h = data.match.homeTeam.id;
        const a = data.match.awayTeam.id;
        const pr = await fetch(`/api/predict?homeId=${h}&awayId=${a}`, { cache: "no-store" }).then((r) => r.json()).catch(() => null);
        if (!mounted) return;
        setPred(pr ?? null);
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [teamId]);

  if (loading) return <div className="border p-3 rounded">Loading next match…</div>;
  if (!match) return <div className="border p-3 rounded">No upcoming match.</div>;

  const dt = match?.utcDate ? new Date(match.utcDate) : null;
  const date = dt ? dt.toLocaleString() : "試合日時未設定";

  return (
    <div className="border p-3 rounded space-y-2">
      <div className="text-sm opacity-70">{match?.competition?.name || "Next match"}</div>
      <div className="font-semibold">{match?.homeTeam?.name ?? "—"} vs {match?.awayTeam?.name ?? "—"}</div>
      <div className="text-sm">{date}</div>

      {pred && (() => {
        const topScorelines = Array.isArray(pred?.top) ? pred.top.filter((t) => t?.score != null) : [];
        const exp = pred?.exp;
        return (
        <div className="mt-2">
          <div className="text-sm opacity-70">Expected goals (xG-like, simple)</div>
          <div className="text-black dark:text-white">{match?.homeTeam?.name ?? "—"}: {exp?.home != null ? exp.home.toFixed(2) : "—"} / {match?.awayTeam?.name ?? "—"}: {exp?.away != null ? exp.away.toFixed(2) : "—"}</div>
          {topScorelines.length > 0 && (
            <>
              <div className="text-sm opacity-70 mt-2">Top scorelines</div>
              <div className="flex flex-wrap gap-2 mt-1">
                {topScorelines.map((t, i) => {
                  const label = `${t.score} (${((t.p ?? 0) * 100).toFixed(1)}%)`;
                  return (
                    <span
                      key={`${t.score}-${i}`}
                      className="inline-flex items-center justify-center min-w-0 rounded-md px-3 py-1 text-sm font-medium bg-sky-400/20 border border-sky-300 text-sky-900 dark:text-sky-200 whitespace-nowrap"
                    >
                      {label}
                    </span>
                  );
                })}
              </div>
            </>
          )}
        </div>
        );
      })()}
    </div>
  );
}

