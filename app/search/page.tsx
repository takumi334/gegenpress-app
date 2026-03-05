"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type ThreadHit = {
  id: number;
  teamId: number;
  title: string;
  body: string;
  createdAt: string;
};

export default function SearchPage() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const [items, setItems] = useState<ThreadHit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setItems([]);
      return;
    }
    let alive = true;
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(term)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        setItems(Array.isArray(data?.items) ? data.items : []);
      })
      .catch(() => {
        if (alive) setItems([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [q]);

  return (
    <main className="max-w-2xl mx-auto py-6 px-4">
      <h1 className="text-xl font-semibold mb-4">
        Search results
        {q ? ` for “${q}”` : ""}
      </h1>

      {!q.trim() ? (
        <p className="text-sm opacity-70">Enter a search term in the header.</p>
      ) : loading ? (
        <p className="text-sm opacity-70">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm opacity-70">No threads found.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((t) => (
            <li key={`${t.teamId}-${t.id}`}>
              <Link
                href={`/board/${t.teamId}/thread/${t.id}`}
                className="block p-3 border rounded hover:bg-white/5"
              >
                <div className="font-medium line-clamp-1">{t.title}</div>
                {t.body && (
                  <div className="text-sm opacity-80 mt-1 line-clamp-2">
                    {t.body}
                  </div>
                )}
                <div className="text-xs opacity-60 mt-1">
                  Board {t.teamId} · {t.createdAt ? new Date(t.createdAt).toLocaleString() : ""}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
