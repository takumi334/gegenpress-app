// 超シンプルなインメモリDB（開発用）
// 本番は Prisma/PlanetScale/Supabase などに置換

export type Thread = {
  id: string;
  teamId: string;     // "/board/[teamId]" に対応
  title: string;
  createdAt: number;
};

export type Post = {
  id: string;
  threadId: string;
  author: string;
  body: string;
  createdAt: number;
};

const threads = new Map<string, Thread>();
const posts = new Map<string, Post[]>();

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export const db = {
  listThreads(teamId: string): Thread[] {
    return [...threads.values()]
      .filter(t => t.teamId === teamId)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
  createThread(teamId: string, title: string): Thread {
    const t: Thread = { id: uid(), teamId, title, createdAt: Date.now() };
    threads.set(t.id, t);
    posts.set(t.id, []);
    return t;
  },
  getThread(id: string): Thread | undefined {
    return threads.get(id);
  },
  listPosts(threadId: string): Post[] {
    return (posts.get(threadId) ?? []).sort((a,b)=>a.createdAt-b.createdAt);
  },
  addPost(threadId: string, author: string, body: string): Post {
    const p: Post = { id: uid(), threadId, author, body, createdAt: Date.now() };
    const arr = posts.get(threadId) ?? [];
    arr.push(p);
    posts.set(threadId, arr);
    return p;
  },
};
export type Thread = {
  id: string;
  teamId: string;
  title: string;
  createdAt: number;
};

export type Post = {
  id: string;
  threadId: string;
  author: string;
  body: string;
  createdAt: number;
};

const threads = new Map<string, Thread>();
const posts = new Map<string, Post[]>();

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export const db = {
  listThreads(teamId: string): Thread[] {
    return [...threads.values()]
      .filter(t => t.teamId === teamId)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
  createThread(teamId: string, title: string): Thread {
    const t: Thread = { id: uid(), teamId, title, createdAt: Date.now() };
    threads.set(t.id, t);
    posts.set(t.id, []);
    return t;
  },
  getThread(id: string): Thread | undefined {
    return threads.get(id);
  },
  listPosts(threadId: string): Post[] {
    return (posts.get(threadId) ?? []).sort((a,b)=>a.createdAt-b.createdAt);
  },
  addPost(threadId: string, author: string, body: string): Post {
    const p: Post = { id: uid(), threadId, author, body, createdAt: Date.now() };
    const arr = posts.get(threadId) ?? [];
    arr.push(p);
    posts.set(threadId, arr);
    return p;
  },
};
