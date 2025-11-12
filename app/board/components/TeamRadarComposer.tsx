"use client";
import { useEffect, useState } from "react";

type Row = {
  position: number;
  teamName: string;
  points: number;
  played: number;
  gd: number;
};

export default function TeamRadarComposer({ teamId }: { teamId: string }) {
  const [table, setTable] = useState<Row[]>([]);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        // 57=Arsenal → PL=39 を仮定（必要なら teamId→leagueId のマップ化）
        const res = await fetch(`/api/standings?league=39&season=2024`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        console.log("standings JSON:", data); // ← 中身確認

        // どの形でも拾えるようにアダプタを用意
        const rows = adaptToRows(data);

        console.log("adapted rows:", rows); // ← 実際テーブル化されたもの
        if (alive) setTable(rows);
      } catch (e: any) {
        if (alive) setErr(e.message ?? "load failed");
      }
    }

    load();
    return () => { alive = false; };
  }, []);

  if (err) return <div>standings error: {err}</div>;
  if (!table.length) return <div>standings not found</div>;

  return (
    <div className="text-sm">
      <h3 className="font-bold mb-2">Premier League Standings</h3>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-1 border">#</th>
            <th className="p-1 border text-left">Team</th>
            <th className="p-1 border">Pts</th>
            <th className="p-1 border">P</th>
            <th className="p-1 border">GD</th>
          </tr>
        </thead>
        <tbody>
          {table.map((r) => (
            <tr key={r.position}>
              <td className="p-1 border text-center">{r.position}</td>
              <td className="p-1 border">{r.teamName}</td>
              <td className="p-1 border text-center">{r.points}</td>
              <td className="p-1 border text-center">{r.played}</td>
              <td className="p-1 border text-center">{r.gd}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- アダプタ ----------
function adaptToRows(json: any): Row[] {
  // ① すでに正規化 { table: [...] }
  if (Array.isArray(json?.table)) {
    return json.table as Row[];
  }

  // ② Football-Data 形式 { standings: [{type:"TOTAL", table:[...]}] }
  const s =
    json?.standings?.find((x: any) => x?.type === "TOTAL") ??
    json?.standings?.[0];

  if (Array.isArray(s?.table)) {
    return s.table.map((r: any) => ({
      position: r.position,
      teamName: r.team?.name ?? r.teamName ?? "",
      points: r.points,
      played: r.playedGames ?? r.played ?? r.played_matches ?? 0,
      gd: r.goalDifference ?? r.gd ?? 0,
    }));
  }

  // ③ 他の形：空配列
  return [];
}

