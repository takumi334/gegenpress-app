import Link from "next/link";
import { LEAGUES } from "@lib/leagues";
import Header from "@/components/Header";
import { lineupBuilderUi } from "@/lib/lineupBuilderUiCopy";

export const metadata = {
  title: "Gegenpress | サッカー翻訳・試合予想・海外掲示板",
  description:
    "Gegenpressは、海外サッカーの翻訳付き掲示板と試合予想を楽しめるファンサイトです。クラブ別に議論しながら、海外の反応やスコア予想をまとめてチェックできます。",
};

export default function HomePage() {
  return (
    <main className="relative min-h-dvh">
      <header className="px-6 py-10 md:py-14 flex justify-between">
        <h1 className="text-4xl font-extrabold text-white">GEGENPRESS</h1>
      </header>

      <section className="px-6 pb-10">
        <p className="mt-2 text-white/80" data-i18n>
          European football hub (Football-Data.org)
        </p>

        <h2 className="sr-only" data-i18n>Leagues</h2>
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 max-w-5xl">
          {LEAGUES.map((lg) => (
            <li key={lg.id}>
              <div className="space-y-2">
                <Link href={`/leagues/${lg.id}`} className="block text-white underline">
                  <span className="block text-2xl">{lg.id}</span>
                  <span className="block text-sm opacity-80">{lg.name}</span>
                </Link>
                <Link
                  href="/lineup-builder"
                  className="inline-flex items-center justify-center rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/15 border border-white/20"
                >
                  {lineupBuilderUi.tacticsBoard}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="px-6 pb-20">
        <div className="rounded-2xl bg-white/80 p-6">
          <div className="text-sm text-black/70" data-i18n>Ad</div>
          <div className="mt-2 h-32 w-full grid place-items-center">
            <span className="text-black/50" data-i18n>
              広告枠（300×250 ／ 728×90 等）
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}

