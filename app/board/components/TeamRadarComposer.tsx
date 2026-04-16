"use client";

type Row = {
  position: number;
  teamName: string;
  points: number;
  played: number;
  gd: number;
};

export default function TeamRadarComposer({
  table,
  err = "",
}: {
  table: Row[];
  err?: string;
}) {

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

