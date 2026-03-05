// app/board/components/PredictBox.tsx
"use client";

import { useEffect, useState } from "react";

type PredictResp = {
  fixture?: {
    utcDate?: string | null;
    venue?: string | null;
    status?: string | null;
    teams?: {
      home?: { name?: string; logo?: string };
      away?: { name?: string; logo?: string };
    };
  };
  xg?: { home: number; away: number };
  winProb?: { home: number; draw: number; away: number };
  topScores?: { h: number; a: number; p: number }[];
  message?: string;
  error?: string;
};

export default function PredictBox({
  teamId,
  initialData,
}: {
  teamId: string;
  initialData?: PredictResp | null;
}) {
  const [data, setData] = useState<PredictResp | null>(
    initialData && !initialData.error ? initialData : null,
  );
  const [err, setErr] = useState<string>(initialData?.error ?? "");

  useEffect(() => {
    setData(initialData && !initialData?.error ? initialData : null);
    setErr(initialData?.error ?? "");
  }, [initialData]);

  useEffect(() => {
    let abort = false;

    // サーバーから初期データが供給された場合はフェッチ不要
    if (initialData && !initialData.error) return;

    (async () => {
      try {
        const r = await fetch(`/api/predict?teamId=${teamId}`, { cache: "no-store" });
        const j = (await r.json()) as PredictResp;
        if (!r.ok) throw new Error(j?.error || "predict failed");
        if (!abort) setData(j);
      } catch (e: any) {
        if (!abort) setErr(e?.message || String(e));
      }
    })();
    return () => { abort = true; };
  }, [teamId, initialData]);

  if (err) return (
    <section className="border rounded p-3 mt-6">
      <h3 className="text-lg font-semibold mb-2">Next fixture &amp; Prediction</h3>
      <div className="text-red-600">Error: {err}</div>
    </section>
  );

  if (!data) return (
    <section className="border rounded p-3 mt-6">
      <h3 className="text-lg font-semibold mb-2">Next fixture &amp; Prediction</h3>
      <div className="opacity-70">Loading…</div>
    </section>
  );

  if (data.message) {
    return (
      <section className="border rounded p-3 mt-6">
        <h3 className="text-lg font-semibold mb-2">Next fixture &amp; Prediction</h3>
        <div className="opacity-80">{data.message}</div>
      </section>
    );
  }

  const f = data.fixture!;
  const dt = f.utcDate ? new Date(f.utcDate) : null;

  const kickoffStr = dt
    ? dt.toLocaleString(undefined, {
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const pct = (x?: number) => (x == null ? "-" : `${(x * 100).toFixed(1)}%`);
  const num = (x?: number) => (x == null ? "-" : x.toFixed(2));

  return (
    <section className="border rounded p-3 mt-6">
      <h3 className="text-lg font-semibold mb-3">Next fixture &amp; Prediction</h3>

      <div className="text-sm leading-6">
        <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
          {f.teams?.home?.logo && (
            <img src={f.teams.home.logo} alt="" className="w-5 h-5 object-contain" />
          )}
          {f.teams?.home?.name ?? "-"}
          <span className="opacity-70 font-normal">vs</span>
          {f.teams?.away?.name ?? "-"}
          {f.teams?.away?.logo && (
            <img src={f.teams.away.logo} alt="" className="w-5 h-5 object-contain" />
          )}
        </div>
        {(kickoffStr || f.venue) && (
          <div className="opacity-80 mt-0.5">
            {f.venue ? `${f.venue} ・ ` : ""}
            {kickoffStr ? `Kickoff: ${kickoffStr}` : ""}
          </div>
        )}
      </div>

      <div className="mt-3 text-sm">
        <div>
          <span className="font-medium">Win/Draw odds:</span>{" "}
          H {pct(data.winProb?.home)} / D {pct(data.winProb?.draw)} / A {pct(data.winProb?.away)}
        </div>
        <div>
          <span className="font-medium">xG:</span>{" "}
          H {num(data.xg?.home)} – A {num(data.xg?.away)}
        </div>
      </div>

      {Array.isArray(data.topScores) && data.topScores.length > 0 && (() => {
        const topScorelines = data.topScores.slice(0, 5);
        console.log("topScorelines:", topScorelines);
        return (
        <div className="mt-3">
          <div className="text-sm font-medium mb-1">Top scorelines</div>
          <div className="flex flex-wrap gap-2">
            {topScorelines.map((s, i) => {
              const label =
                s?.h != null && s?.a != null
                  ? `${s.h}-${s.a} (${((s.p ?? 0) * 100).toFixed(1)}%)`
                  : "—";
              return (
                <span
                  key={`${s?.h ?? ""}-${s?.a ?? ""}-${i}`}
                  className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-sm bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {label}
                </span>
              );
            })}
          </div>
        </div>
        );
      })()}
    </section>
  );
}

