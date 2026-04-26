"use client";

export function DeleteThreadButton({ id, deletedAt }: { id: number; deletedAt?: string | null }) {
  const isDeleted = Boolean(deletedAt);
  return (
    <button
      type="button"
      onClick={async () => {
        const action = isDeleted ? "復元" : "削除（論理削除）";
        if (!confirm(`thread #${id} を${action}します。OK？`)) return;

        const res = await fetch(`/api/admin/thread/${id}`, {
          method: isDeleted ? "PATCH" : "DELETE",
          cache: "no-store",
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok || !json.ok) {
          const message = String(json?.message ?? "");
          if (res.status === 401 || message === "UNAUTHORIZED") {
            alert("ログインが必要です");
            return;
          }
          if (res.status === 403 || message === "FORBIDDEN") {
            alert("管理者権限がありません");
            return;
          }
          alert(`失敗: ${message || res.status}`);
          return;
        }

        location.reload();
      }}
      style={{
        background: isDeleted ? "#2563eb" : "crimson",
        color: "white",
        padding: "6px 10px",
        borderRadius: 6,
      }}
    >
      {isDeleted ? "復元" : "削除"}
    </button>
  );
}


