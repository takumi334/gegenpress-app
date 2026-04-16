import Link from "next/link";
import { ACTIVE_LEAGUES, LEAGUES } from "@lib/leagues";
import { getCanonicalUrl } from "@/lib/publicSiteUrl";

export const metadata = {
  title: "Gegenpress｜海外サッカー掲示板・翻訳付き・試合予想",
  description:
    "海外サッカーの翻訳付き掲示板。プレミアリーグ・ラリーガなど各クラブの英語ファンコメントを翻訳で読め、試合予想や戦術議論も楽しめます。海外サッカーが好きな日本人ファン向けのコミュニティサイト。",
  alternates: {
    canonical: getCanonicalUrl("/"),
  },
};

export default function HomePage() {
  const homeLeagues = LEAGUES.filter((l) => ACTIVE_LEAGUES.includes(l.id));
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
          {homeLeagues.map((lg) => (
            <li key={lg.id}>
              <Link
                href={`/leagues/${lg.id}?t=${Date.now()}`}
                prefetch={false}
                className="block relative z-10 pointer-events-auto text-white underline"
              >
                <span className="block text-2xl">{lg.id}</span>
                <span className="block text-sm opacity-80">{lg.name}</span>
              </Link>
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

