// app/admin/page.tsx
"use client";
import { useState } from "react";

export default function AdminPage() {
  const [v, setV] = useState("");

  const save = async () => {
    document.cookie = `admin_key=${encodeURIComponent(v)}; path=/; max-age=${60 * 60 * 24 * 30}`;
    alert("管理者キーを保存しました（Cookie）");
  };

  return (
    <main className="p-4 space-y-3">
      <h1 className="text-2xl font-bold">管理者キーの設定</h1>
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        className="border px-2 py-1 rounded w-full max-w-md"
        placeholder="ADMIN_KEY を入力"
      />
      <div>
        <button onClick={save} className="border px-3 py-1 rounded">保存</button>
      </div>
      <p className="text-sm opacity-70">
        API 側は Header または Cookie の <code>admin_key</code> を確認します。
      </p>
    </main>
  );
}

