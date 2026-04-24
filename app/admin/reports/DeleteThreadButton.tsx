"use client";

export function DeleteThreadButton({ id }: { id: number }) {
  return (
    <button
      type="button"
      onClick={async () => {
        if (!confirm(`thread #${id} を削除（論理削除）します。OK？`)) return;

        const adminKey = (localStorage.getItem("ADMIN_KEY") ?? "").trim();
        if (!adminKey) {
          alert("Admin key required");
          return;
        }

        const res = await fetch(`/api/admin/thread/${id}`, {
          method: "DELETE",
          headers: {
            "x-admin-key": adminKey,
          },
          cache: "no-store",
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok || !json.ok) {
          const message = String(json?.message ?? "");
          if (res.status === 401 || message === "UNAUTHORIZED") {
            alert("Admin keyが違います");
            return;
          }
          alert(`削除失敗: ${message || res.status}`);
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


