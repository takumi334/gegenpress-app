// app/team/[slug]/page.tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCanonicalUrl } from "@/lib/publicSiteUrl";
import { getTeamPageData } from "@/lib/server/teamPageData";

type Team = {
  id: number;
  name: string;
  crest: string;
  squad?: Array<{
    id: number;
    name: string;
    position: string | null;
    nationality: string | null;
  }>;
};

function parseTeamIdFromSlug(slug: string): number | null {
  // "65-manchester-city" -> 65
  const idStr = slug.split("-")[0];
  const id = Number(idStr);
  return Number.isFinite(id) ? id : null;
}

export default async function TeamPage({ params }: { params: { slug: string } }) {
  const teamId = parseTeamIdFromSlug(params.slug);
  if (!teamId) return notFound();

  const { team } = await getTeamPageData(teamId);
  const hasTeam = Boolean(team?.id);
  const displayName = team?.name ?? `Team ${teamId}`;

  const squad = team?.squad ?? [];

  return (
    <main className="px-6 py-10">
      <header className="flex items-center gap-4">
        {team?.crest ? (
          // crest は SVG/PNG 混在。<img> でOK（next/imageにするなら next.config に remotePatterns を追加）
          <img src={team.crest} alt={displayName} className="h-12 w-12 object-contain" />
        ) : (
          <div className="h-12 w-12 rounded-full bg-gray-200" />
        )}
        <h1 className="text-2xl font-bold">{displayName}</h1>
      </header>

      {!hasTeam ? (
        <p className="mt-3 text-sm text-gray-600">データ更新中です。最新取得に失敗したため、表示を最小構成で継続しています。</p>
      ) : null}

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Squad</h2>

        {squad.length === 0 ? (
          <p className="mt-3 text-sm text-black/60">
            スカッド情報が取得できませんでした（時期/大会により空の場合があります）。
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {squad.map((p) => (
              <li key={p.id} className="rounded-xl border p-4">
                <div className="font-medium">{p.name}</div>
                <div className="text-sm text-black/60">
                  {p.position ?? "—"} / {p.nationality ?? "—"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  return {
    title: "Team | Gegenpress",
    alternates: {
      canonical: getCanonicalUrl(`/team/${params.slug}`),
    },
  };
}

