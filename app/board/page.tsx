
// app/board/page.tsx
import Link from "next/link";
import { searchAcrossBoards } from "@lib/boardApi";          // ③で足す薄いAPI
import { getTeamNameFromFD } from "@lib/team-resolver";

type Hit = {
  id: string;
  teamId: string | number;
  tab: string;
  content: string;
  createdAt: string | number;
};

export default async function BoardSearchPage({
  searchParams,
}: { searchParams: { q?: string } }) {
  const q = (searchParams.q ?? "").trim();
  const res = q ? await searchAcrossBoards(q, { limit: 80 }) : null;

  // teamId → 投稿配列 にグルーピング
  const groups: Record<string, Hit[]> = {};
  if (res?.ok) {
    for (const h of res.items as Hit[]) {
      const key = String(h.teamId);
      (groups[key] ||= []).push(h);
    }
  }

  return (
    <main className="p-6 space-y-6">
      <form className="flex gap-2" action="/board" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="選手・クラブ・トピックで検索（例：エムバペ）"
          className="border rounded px-3 py-2 w-full"
          data-i18n
        />
        <button className="border rounded px-4" data-i18n>検索</button>
      </form>

      {!q && <p className="opacity-70" data-i18n>キーワードを入力すると全掲示板を横断検索します。</p>}

      {q && res?.ok && (
        <div className="space-y-6">
          {await Promise.all(Object.entries(groups).map(async ([teamId, items]) => {
            const teamName = await getTeamNameFromFD(teamId);
            return (
              <section key={teamId} className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-lg font-semibold">
                    {teamName} <span className="text-sm opacity-70">/ {items.length} hits</span>
                  </h2>
                  <Link className="underline text-sm" href={`/board/${teamId}`} data-i18n>
                    掲示板を開く
                  </Link>
                </div>

                <ul className="space-y-3">
                  {items.map((p) => (
                    <li key={p.id} className="border rounded p-3">
                      <div className="text-xs opacity-60 flex gap-3 flex-wrap">
                        <span>{new Date(p.createdAt).toLocaleString()}</span>
                        <span>/{p.tab}</span>
                        <Link
                          className="underline"
                          href={`/board/${p.teamId}#post-${p.id}`}
                          data-i18n
                        >
                          元の投稿へジャンプ
                        </Link>
                      </div>
                      <p className="whitespace-pre-wrap mt-1">{p.content}</p>
                    </li>
                  ))}
                </ul>
              </section>
            );
          }))}
        </div>
      )}

      {q && res && !res.ok && <p className="text-red-500">{res.error}</p>}
    </main>
  );
}

