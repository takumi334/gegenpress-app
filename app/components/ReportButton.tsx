"use client";

import { useState } from "react";

type Props = {
  kind: "thread" | "post";
  targetId: number;
  pageUrl?: string;
};

export default function ReportButton({ kind, targetId, pageUrl }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("spam");
  const [detail, setDetail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    setLoading(true);
    setDone(false);

    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          targetId,
          reason,
          detail,
          pageUrl: pageUrl ?? location.href,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        throw new Error(json?.message ?? "failed");
      }

      setDone(true);
      setTimeout(() => {
        setOpen(false);
        setDone(false);
        setDetail("");
      }, 700);
    } catch (e) {
      console.error(e);
      alert("通報に失敗しました（もう一回）");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-2 py-1 rounded-md border border-white/20 hover:bg-white/10"
      >
        Report
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-[92%] max-w-md rounded-xl bg-zinc-900 text-white p-4 border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-semibold mb-2">通報 Report</div>

            <div className="text-xs text-white/70 mb-3">
              対象: {kind} / ID: {targetId}
            </div>

            <label className="block text-sm mb-1">理由 Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full mb-3 rounded-md bg-black/40 border border-white/10 p-2"
            >
              <option value="spam">スパム Spam</option>
              <option value="abuse">暴言/誹謗中傷 Abuse/Harassment</option>
              <option value="illegal">違法っぽい Illegal content</option>
              <option value="other">その他</option>
            </select>

            <label className="block text-sm mb-1">詳細（任意）</label>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={3}
              className="w-full rounded-md bg-black/40 border border-white/10 p-2"
              placeholder="例：URLが大量、同じ文面連投…など"
            />

            <div className="mt-4 flex gap-2 justify-end">
              <button
                onClick={() => setOpen(false)}
                className="px-3 py-2 rounded-md border border-white/10 hover:bg-white/10"
                disabled={loading}
              >
                キャンセル Cancel
              </button>
              <button
                onClick={submit}
                className="px-3 py-2 rounded-md bg-white text-black hover:opacity-90 disabled:opacity-60"
                disabled={loading}
              >
                {done ? "送信OK" : loading ? "送信中…" : "送信 Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

