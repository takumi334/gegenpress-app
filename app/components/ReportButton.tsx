"use client";

import { useState } from "react";
import { useT } from "@/lib/NativeLangProvider";

type Props = {
  kind: "thread" | "post";
  targetId: number;
  /** 通報メールの teamId・確認 URL 用（掲示板のチーム ID） */
  teamId?: string;
  pageUrl?: string;
};

export default function ReportButton({ kind, targetId, teamId, pageUrl }: Props) {
  const t = useT();
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
          teamId:
            teamId !== undefined && teamId !== ""
              ? Number(teamId)
              : undefined,
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
      alert(t("report.failed"));
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
        {t("report.button")}
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
            <div className="font-semibold mb-2">{t("report.title")}</div>

            <div className="text-xs text-white/70 mb-3">
              {t("report.targetLabel")}: {kind} / ID: {targetId}
            </div>

            <label className="block text-sm mb-1">{t("report.reason")}</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full mb-3 rounded-md bg-black/40 border border-white/10 p-2"
            >
              <option value="spam">{t("report.reasonSpam")}</option>
              <option value="abuse">{t("report.reasonAbuse")}</option>
              <option value="illegal">{t("report.reasonIllegal")}</option>
              <option value="other">{t("report.reasonOther")}</option>
            </select>

            <label className="block text-sm mb-1">{t("report.detailOptional")}</label>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={3}
              className="w-full rounded-md bg-black/40 border border-white/10 p-2"
              placeholder={t("report.detailPlaceholder")}
            />

            <div className="mt-4 flex gap-2 justify-end">
              <button
                onClick={() => setOpen(false)}
                className="px-3 py-2 rounded-md border border-white/10 hover:bg-white/10"
                disabled={loading}
              >
                {t("report.cancel")}
              </button>
              <button
                onClick={submit}
                className="px-3 py-2 rounded-md bg-white text-black hover:opacity-90 disabled:opacity-60"
                disabled={loading}
              >
                {done ? t("report.submitOk") : loading ? t("report.submitting") : t("report.submit")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

