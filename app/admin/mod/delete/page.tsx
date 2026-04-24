export const dynamic = "force-dynamic";
export default async function AdminModDeletePage() {

  return (
    <main className="mx-auto max-w-lg p-6 text-white space-y-4">
      <h1 className="text-xl font-semibold">管理者削除</h1>
      <p className="text-sm text-white/70">
        通報対象の削除は <code>/admin/reports</code> から実行してください。
      </p>
    </main>
  );
}
