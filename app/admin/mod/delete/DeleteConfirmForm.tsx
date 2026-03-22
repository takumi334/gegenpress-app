"use client";

import { useState } from "react";

export default function DeleteConfirmForm({
  token,
  summary,
}: {
  token: string;
  summary: string;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || ok) return;
    if (!confirm("この操作は取り消せません。本当に削除しますか？")) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/mod/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) {
        setMsg(
          j.error === "invalid_or_expired_token"
            ? "トークンが無効か期限切れです。"
            : j.error === "REPORT_MISMATCH"
              ? "通報レコードと対象が一致しません。"
              : j.error === "REPORT_NOT_FOUND"
                ? "通報が見つかりません（既に処理済みの可能性があります）。"
                : j.message || `削除に失敗しました（${res.status}）`
        );
        return;
      }
      setOk(true);
      setMsg("削除しました。");
    } catch {
      setMsg("通信エラーが発生しました。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <pre className="text-sm whitespace-pre-wrap bg-zinc-900 border border-white/10 rounded p-3 text-white/90">
        {summary}
      </pre>
      {!ok ? (
        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
        >
          {busy ? "処理中…" : "削除を実行する"}
        </button>
      ) : null}
      {msg ? (
        <p className={`text-sm ${ok ? "text-green-400" : "text-red-400"}`}>{msg}</p>
      ) : null}
    </form>
  );
}
