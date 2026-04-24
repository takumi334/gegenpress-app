"use client";

import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "ADMIN_KEY";

export default function AdminKeyInput() {
  const [adminKey, setAdminKey] = useState("");
  const hasKey = useMemo(() => adminKey.trim().length > 0, [adminKey]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) ?? "";
    if (saved) setAdminKey(saved);
  }, []);

  const save = () => {
    localStorage.setItem(STORAGE_KEY, adminKey.trim());
    alert("Admin key saved");
  };

  return (
    <section
      style={{
        marginBottom: 16,
        padding: 12,
        border: "1px solid #ddd",
        borderRadius: 8,
        background: "#fafafa",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Admin key</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="password"
          placeholder="Enter admin key"
          value={adminKey}
          onChange={(e) => setAdminKey(e.target.value)}
          style={{ minWidth: 260, padding: "6px 8px", border: "1px solid #ccc", borderRadius: 6 }}
        />
        <button
          type="button"
          onClick={save}
          disabled={!hasKey}
          style={{
            padding: "6px 10px",
            borderRadius: 6,
            border: "1px solid #ccc",
            cursor: hasKey ? "pointer" : "not-allowed",
            background: hasKey ? "#fff" : "#f5f5f5",
          }}
        >
          Save key
        </button>
      </div>
    </section>
  );
}
