"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="px-6 py-16">
      <h2 className="text-2xl font-bold">エラーが発生しました</h2>
      <pre className="mt-2 text-sm opacity-70 whitespace-pre-wrap">
        {error.message}
      </pre>
      <button
        onClick={() => reset()}
        className="mt-6 rounded-lg bg-black px-4 py-2 text-white"
      >
        再試行
      </button>
    </main>
  );
}

