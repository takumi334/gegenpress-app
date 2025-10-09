// app/components/NextMatchCard.tsx
import React from "react";

type Prob = { win: number; draw: number; lose: number };   // 0..1
type Pred = { homeGoals: number; awayGoals: number };
type Odds = { home: number; draw: number; away: number };

export function NextMatchCard({
  title = "次節 予想スコア",
  homeTeam,
  awayTeam,
  kickoff,          // ISO string (なくてもOK)
  pred,
  prob,
  odds,
  lambdas,         // 例: { home: 1.73, away: 0.65 } 表示用
  note,            // 例: "Poisson (過去20試合)"
}: {
  title?: string;
  homeTeam: string;
  awayTeam: string;
  kickoff?: string;
  pred: Pred;
  prob: Prob;
  odds?: Odds;
  lambdas?: { home: number; away: number };
  note?: string;
}) {
  const when = kickoff
    ? new Date(kickoff).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : undefined;

  const chip = (label: string) => (
    <span className="rounded-full border border-white/25 bg-white/10 px-2 py-0.5 text-xs">
      {label}
    </span>
  );

  return (
    <aside className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur text-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wide">{title}</h3>
        <div className="flex items-center gap-2">
          {chip(`Win ${Math.round(prob.win * 100)}%`)}
          {chip(`Draw ${Math.round(prob.draw * 100)}%`)}
          {chip(`Lose ${Math.round(prob.lose * 100)}%`)}
        </div>
      </div>

      <div className="rounded-xl bg-black/20 p-3 space-y-2">
        {when && <div className="text-xs opacity-80">{when}</div>}
        <div className="flex items-center justify-between text-base font-semibold">
          <span className="truncate pr-2">{homeTeam}</span>
          <span className="tabular-nums text-lg">
            {pred.homeGoals} – {pred.awayGoals}
          </span>
          <span className="truncate pl-2 text-right">{awayTeam}</span>
        </div>

        {odds && (
          <div className="flex justify-around text-xs mt-1 opacity-80">
            <span>Home {odds.home.toFixed(2)}</span>
            <span>Draw {odds.draw.toFixed(2)}</span>
            <span>Away {odds.away.toFixed(2)}</span>
          </div>
        )}

        {lambdas && (
          <div className="text-xs opacity-70 tabular-nums mt-1">
            λH:{lambdas.home.toFixed(2)}　λA:{lambdas.away.toFixed(2)}
          </div>
        )}
      </div>

      {note && <p className="text-xs leading-relaxed opacity-80">{note}</p>}
    </aside>
  );
}

