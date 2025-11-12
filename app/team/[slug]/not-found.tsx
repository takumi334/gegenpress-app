import Link from "next/link";

export default function NotFound() {
  return (
    <main className="px-6 py-16">
      <h1 className="text-2xl font-bold">Team not found</h1>
      <p className="mt-2 text-black/60">
        指定されたチームが見つかりませんでした。
      </p>

      <Link
        href="/"
        className="mt-6 inline-block rounded-lg px-4 py-2 bg-black text-white"
      >
        トップへ戻る
      </Link>
    </main>
  );
}

