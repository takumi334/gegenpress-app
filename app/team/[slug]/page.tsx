// app/team/[slug]/page.tsx
import { notFound } from "next/navigation";
import { fdFetch } from "@/lib/fd";

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

  let team: Team | null = null;
  try {
    // ★ fdFetch は { path, init } で渡す
    team = await fdFetch<Team>({
      path: `/teams/${teamId}`,
      init: { next: { revalidate: 1800 } }, // 30分キャッシュ
    });
  } catch {
    return notFound();
  }

  if (!team?.id) return notFound();

  const squad = team.squad ?? [];

  return (
    <main className="px-6 py-10">
      <header className="flex items-center gap-4">
        {/* crest は SVG/PNG 混在。<img> でOK（next/imageにするなら next.config に remotePatterns を追加） */}
        <img src={team.crest} alt={team.name} className="h-12 w-12 object-contain" />
        <h1 className="text-2xl font-bold">{team.name}</h1>
      </header>

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

