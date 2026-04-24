"use client";

import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "ADMIN_KEY";

export default function AdminKeyInput() {
  const [adminKey, setAdminKey] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const hasKey = useMemo(() => adminKey.trim().length > 0, [adminKey]);
  const maskedKey = useMemo(() => (adminKey ? "*".repeat(adminKey.length) : "（未入力）"), [adminKey]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) ?? "";
    if (saved) setAdminKey(saved);
  }, []);

  const save = () => {
    const trimmed = adminKey.trim();
    localStorage.setItem(STORAGE_KEY, trimmed);
    // Save key immediately as normalized value so UI and localStorage always match.
    setAdminKey(trimmed);
    setSavedMessage("保存しました");
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
          onChange={(e) => {
            setAdminKey(e.target.value);
            if (savedMessage) setSavedMessage("");
          }}
          style={{
            minWidth: 260,
            padding: "6px 8px",
            border: "1px solid #ccc",
            borderRadius: 6,
            color: "#000",
            background: "#fff",
          }}
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
      <div style={{ marginTop: 8, fontSize: 12, color: "#444" }}>
        masked: <code>{maskedKey}</code>
      </div>
      {savedMessage ? (
        <div style={{ marginTop: 6, fontSize: 12, color: "#0a7a33" }}>{savedMessage}</div>
      ) : null}
      <style>{`input::placeholder { color: #666; opacity: 1; }`}</style>
    </section>
  );
}
