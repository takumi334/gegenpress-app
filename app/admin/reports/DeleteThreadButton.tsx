"use client";
import { useEffect, useMemo, useState } from "react";
import { ADMIN_KEY_STORAGE_KEY, FIXED_ADMIN_PASSCODE } from "@/lib/adminPasscode";

export function DeleteThreadButton({ id, deletedAt }: { id: number; deletedAt?: string | null }) {
  const isDeleted = Boolean(deletedAt);
  const [adminKey, setAdminKey] = useState("");
  const isEnabled = useMemo(() => adminKey.trim() === FIXED_ADMIN_PASSCODE, [adminKey]);

  useEffect(() => {
    const sync = () => setAdminKey((localStorage.getItem(ADMIN_KEY_STORAGE_KEY) ?? "").trim());
    sync();
    window.addEventListener("focus", sync);
    window.addEventListener("admin-key-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("focus", sync);
      window.removeEventListener("admin-key-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return (
    <button
      type="button"
      disabled={!isEnabled}
      onClick={async () => {
        const action = isDeleted ? "復元" : "削除（論理削除）";
        if (!confirm(`thread #${id} を${action}します。OK？`)) return;
        if (!isEnabled) {
          alert("Passcode 4231 required");
          return;
        }

        const res = await fetch(`/api/admin/thread/${id}`, {
          method: isDeleted ? "PATCH" : "DELETE",
          headers: { "x-admin-key": adminKey.trim() },
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok || !json.ok) {
          const message = String(json?.message ?? "");
          if (res.status === 401 || message === "UNAUTHORIZED") {
            alert("パスコードが違います");
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
        opacity: isEnabled ? 1 : 0.5,
        cursor: isEnabled ? "pointer" : "not-allowed",
      }}
    >
      {isDeleted ? "復元" : "削除"}
    </button>
  );
}


