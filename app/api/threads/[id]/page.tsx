// app/board/thread/[id]/page.tsx
import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import CommentForm from "./CommentForm";

// Prisma のモデル型(Thread)は posts を含まないので、include 付きのペイロード型を使う
type ThreadWithPosts = Prisma.ThreadGetPayload<{
  include: { posts: true };
}>;

export default async function ThreadPage({
  params,
}: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const thread: ThreadWithPosts | null = await prisma.thread.findUnique({
    where: { id },
    include: { posts: { orderBy: { createdAt: "asc" } } },
  });
  if (!thread) notFound();

  return (
    <main className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">{thread.title}</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">スレッド一覧（投稿）</h2>
        {thread.posts.length === 0 ? (
          <p className="text-sm text-gray-500">まだ投稿がありません。</p>
        ) : (
          <ul className="space-y-2">
            {thread.posts.map((p) => (
              <li key={p.id} className="rounded border p-3">
                <div className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">
                    {p.author || "匿名"}
                  </span>{" "}
                  <span className="ml-2">
                    {new Date(p.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="whitespace-pre-wrap">{p.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 投稿フォーム（クライアント） */}
      <section>
        <h3 className="text-base font-semibold mb-2">投稿</h3>
        <CommentForm threadId={thread.id} />
      </section>
    </main>
  );
}
