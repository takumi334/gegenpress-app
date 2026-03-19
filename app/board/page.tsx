"use client";

import Link from "next/link";
import TacticsLineupBuilder from "@components/lineup/TacticsLineupBuilder";
import { TACTICS_MOCK_PLAYERS } from "@/lib/tacticsPlayers";

export default function BoardIndex() {
  return (
    <main className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Tactics Board</h1>
          <p className="text-sm text-gray-600 mt-1">
            Create and preview tactical frames here, or open a club board to post.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/lineup-builder"
            className="inline-flex items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Open Lineup Builder
          </Link>
          <Link
            href="/board/57"
            className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Open Team Board
          </Link>
        </div>
      </div>

      <section className="border rounded-lg p-4 bg-white">
        <TacticsLineupBuilder players={TACTICS_MOCK_PLAYERS} initialFormation="4-3-3" />
      </section>
    </main>
  );
}

