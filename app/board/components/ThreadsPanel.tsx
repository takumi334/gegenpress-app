'use client';

import { useEffect, useState } from 'react';

type Thread = {
  id: string;
  teamId: number;
  title: string;
  body?: string;
  createdAt: string;
  _count?: { posts: number };
};

export default function ThreadsPanel({ teamId }: { teamId: number }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/threads?teamId=${teamId}`, { cache: 'no-store' });
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      setThreads(j.threads ?? []);
    } catch (e: any) {
      setErr(e?.message ?? 'failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [teamId]);

  async function createThread(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const r = await fetch('/api/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId, title }),
    });
    const j = await r.json();
    if (!r.ok) {
      alert(j.error ?? 'failed');
      return;
    }
    setTitle('');
    load();
  }

  return (
    <aside className="p-4 border rounded-lg bg-white dark:bg-zinc-900 space-y-3">
      <h3 className="text-lg font-bold">Threads</h3>

      <form onSubmit={createThread} className="flex gap-2">
        <input
          className="flex-1 border rounded px-2 py-1"
          placeholder="Subject (e.g. Transfer talk)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button className="px-3 py-1 rounded bg-black text-white" type="submit">
          New
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : err ? (
        <p className="text-sm text-red-500">Error: {err}</p>
      ) : threads.length === 0 ? (
        <p className="text-sm text-gray-500">No threads yet.</p>
      ) : (
        <ul className="space-y-2">
          {threads.map((t) => (
            <li key={t.id} className="flex justify-between items-center">
              <a
                className="underline underline-offset-2"
                href={`/board/${teamId}/thread/${t.id}`}
              >
                {t.title}
              </a>
              <span className="text-xs text-gray-500">
                {t._count?.posts ?? 0} posts
              </span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

