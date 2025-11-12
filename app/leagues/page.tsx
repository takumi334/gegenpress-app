// app/leagues/page.tsx
import Link from "next/link";
import { LEAGUES } from "../lib/leagues";

export const metadata = { title: "Leagues" };

export default function LeaguesPage() {
  return (
    <main className="mx-auto max-w-3xl p-4 space-y-6">
      <h1 className="text-2xl font-bold">Leagues</h1>
      <ul className="grid gap-3 sm:grid-cols-2">
        {LEAGUES.map((l) => (
          <li key={l.code} className="rounded border p-4 hover:bg-gray-50">
            <div className="font-semibold">{l.name}</div>
            <div className="text-xs text-gray-500 mb-2">({l.code})</div>
            <Link
              href={`/leagues/${l.code}`}
              className="text-blue-600 hover:underline text-sm"
            >
              驍ｵ・ｺ髦ｮ蜷ｶ繝ｻ驛｢譎｢・ｽ・ｪ驛｢譎｢・ｽ・ｼ驛｢・ｧ繝ｻ・ｰ驍ｵ・ｺ繝ｻ・ｮ驛｢譏ｶ繝ｻ郢晢ｽｻ驛｢譎｢・｣・ｰ驛｢・ｧ陞ｳ螟ｲ・ｽ・ｦ闕ｵ譎｢・ｽ繝ｻ驕ｶ鄙ｫ繝ｻ
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

