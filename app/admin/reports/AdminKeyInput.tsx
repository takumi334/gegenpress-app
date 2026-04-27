"use client";

import { useEffect, useMemo, useState } from "react";
import { ADMIN_KEY_STORAGE_KEY, FIXED_ADMIN_PASSCODE } from "@/lib/adminPasscode";

const STORAGE_KEY = ADMIN_KEY_STORAGE_KEY;

export default function AdminKeyInput() {
  const [adminKey, setAdminKey] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const hasKey = useMemo(() => adminKey.trim().length > 0, [adminKey]);
  const isValid = useMemo(() => adminKey.trim() === FIXED_ADMIN_PASSCODE, [adminKey]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) ?? "";
    if (saved) setAdminKey(saved);
  }, []);

  useEffect(() => {
    if (!savedMessage) return;
    const timer = window.setTimeout(() => setSavedMessage(""), 2000);
    return () => window.clearTimeout(timer);
  }, [savedMessage]);

  const save = () => {
    const trimmed = adminKey.trim();
    localStorage.setItem(STORAGE_KEY, trimmed);
    setAdminKey(trimmed);
    setSavedMessage("Saved!");
    window.dispatchEvent(new Event("admin-key-updated"));
  };

  return (
    <section style={{ marginBottom: 16, padding: 12, border: "1px solid #ddd", borderRadius: 8, background: "#fafafa" }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Passcode</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="password"
          placeholder="Enter passcode"
          value={adminKey}
          onChange={(e) => {
            setAdminKey(e.target.value);
            if (savedMessage) setSavedMessage("");
          }}
          style={{
            minWidth: 260,
            width: "min(100%, 360px)",
            minHeight: 42,
            padding: "8px 10px",
            border: "1px solid #bbb",
            borderRadius: 6,
            color: "#111",
            background: "#fff",
          }}
        />
        <button
          type="button"
          onClick={save}
          disabled={!hasKey}
          style={{
            minWidth: 104,
            minHeight: 42,
            padding: "8px 14px",
            borderRadius: 6,
            border: "1px solid #bbb",
            cursor: hasKey ? "pointer" : "not-allowed",
            background: hasKey ? "#fff" : "#f5f5f5",
            color: "#111",
            fontSize: 12,
            fontWeight: 600,
            lineHeight: 1.2,
          }}
        >
          Save
        </button>
      </div>
      {savedMessage ? <div style={{ marginTop: 8, fontSize: 12, color: "#333" }}>{savedMessage}</div> : null}
      <div style={{ marginTop: 6, fontSize: 12, color: isValid ? "#0a7a33" : "#444" }}>
        {isValid ? "削除/復元が有効です" : "パスコード 4231 を入力すると削除/復元が有効になります"}
      </div>
      <style>{`input::placeholder { color: #666; opacity: 1; }`}</style>
    </section>
  );
}
