"use client";

import { useEffect, useState } from "react";

type Props = { teamId: string }; // ← 呼び出し側と合わせて string

type Fixture = {
  utc: string;        // ISO日時
  opponent?: string;  // 相手名（仮）
  venue?: string;     // 会場（仮）
};

export default function NextFixturePanel({ teamId }: Props) {
  const [loading, setLoading] = useState(true);
  const [fx, setFx] = useState<Fixture | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let aborted = false;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        // ★ ここはダミー。後で本物のAPIに差し替え
        await new Promise((r) => setTimeout(r, 300));
        const dummy: Fixture = {
          utc: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          opponent: "TBD",
          venue: "Home",
        };

        if (!aborted) setFx(dummy);
      } catch (e: any) {
        if (!aborted) setErr(e?.message ?? "Failed to load fixture");
      } finally {
        if (!aborted) setLoading(false);
      }
    })();

    return () => {
      aborted = true;
    };
  }, [teamId]);

  if (loading) return <div className="text-sm text-gray-500">Loading next fixture…</div>;
  if (err) return <div className="text-sm text-red-600">Error: {err}</div>;
  if (!fx) return <div className="text-sm text-gray-500">No upcoming fixtures.</div>;

  const dt = new Date(fx.utc);

  return (
    <div className="space-y-1 text-sm">
      <div className="font-medium">Next fixture</div>
      <div>Team ID: {teamId}</div>
      <div>Opponent: {fx.opponent ?? "-"}</div>
      <div>Venue: {fx.venue ?? "-"}</div>
      <div>Date: {dt.toLocaleString()}</div>
    </div>
  );
}

