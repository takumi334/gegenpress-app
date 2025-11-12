import Link from "next/link";

type Team = { slug: string; name: string };

const teams: Team[] = [
  { slug: "arsenal", name: "Arsenal" },
  { slug: "bayern", name: "Bayern" },
  { slug: "kawasaki", name: "川崎フロンターレ" },
];

export const metadata = {
  title: "Teams | Gegenpress",
};

export default function TeamsPage() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Teams</h1>
      <ul>
        {teams.map((t) => (
          <li key={t.slug}>
            <Link href={`/teams/${t.slug}`}>{t.name}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
