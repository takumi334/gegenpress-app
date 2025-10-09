"use client";

import type { FdPlayer } from "../../../types/fd";

type Props = { squad: FdPlayer[] | undefined };

export default function SquadTable({ squad }: Props) {
  const players = (squad ?? []).filter((m) => m.role === "PLAYER");

  const th = "px-3 py-2 text-left text-xs font-semibold text-gray-600";
  const td = "px-3 py-2 text-sm";

  return (
    <section className="mt-6">
      <h2 className="text-xl font-semibold mb-2">Squad</h2>
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className={th}>#</th>
              <th className={th}>Name</th>
              <th className={th}>Position</th>
              <th className={th}>Nationality</th>
              <th className={th}>Birth</th>
            </tr>
          </thead>
          <tbody>
            {players.length === 0 ? (
              <tr>
                <td className={td} colSpan={5}>
                  No players found.
                </td>
              </tr>
            ) : (
              players.map((p) => (
                <tr key={p.id} className="even:bg-gray-50">
                  <td className={td}>{p.shirtNumber ?? "-"}</td>
                  <td className={td}>{p.name}</td>
                  <td className={td}>{p.position}</td>
                  <td className={td}>{p.nationality}</td>
                  <td className={td}>{p.dateOfBirth}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

