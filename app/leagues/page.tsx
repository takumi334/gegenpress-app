// app/leagues/page.tsx
import Link from "next/link";
import { ACTIVE_LEAGUES, LEAGUES } from "../lib/leagues";
import { getCanonicalUrl } from "@/lib/publicSiteUrl";

export const metadata = {
  title: "Leagues | Gegenpress",
  alternates: {
    canonical: getCanonicalUrl("/leagues"),
  },
};

export default function LeaguesPage() {
  const visibleLeagues = LEAGUES.filter((l) => ACTIVE_LEAGUES.includes(l.id));
  return (
    <main className="mx-auto max-w-3xl p-4 space-y-6">
      <h1 className="text-2xl font-bold">Leagues</h1>
      <ul className="grid gap-3 sm:grid-cols-2">
        {visibleLeagues.map((l) => (
          <li key={l.id} className="rounded border p-4 hover:bg-gray-50">
            <div className="font-semibold">{l.name}</div>
            <div className="text-xs text-gray-500 mb-2">({l.id})</div>
            <Link
              href={`/leagues/${l.id}`}
              className="text-blue-600 hover:underline text-sm"
            >
              View league data
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

