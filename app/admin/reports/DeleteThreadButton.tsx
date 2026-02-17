"use client";

export function DeleteThreadButton({ id }: { id: number }) {
  return (
    <button
      type="button"
      onClick={async () => {
        if (!confirm(`thread #${id} を削除（論理削除）します。OK？`)) return;

        // ★ここから追加（超重要）
        const adminKey = (localStorage.getItem("ADMIN_KEY") ?? "").trim();
        if (!adminKey) {
          alert("ADMIN_KEY が localStorage にありません。先に保存してください。");
          return;
        }
        console.log("sending x-admin-key:", adminKey);
        // ★ここまで追加

        const res = await fetch(`/api/admin/thread/${id}`, {
          method: "DELETE",
          headers: {
            "x-admin-key": adminKey,
          },
          cache: "no-store",
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok || !json.ok) {
          alert(`削除失敗: ${json?.message ?? res.status}`);
          return;
        }

        location.reload();
      }}
      style={{ background: "crimson", color: "white", padding: "6px 10px" }}
    >
      削除
    </button>
  );
}


