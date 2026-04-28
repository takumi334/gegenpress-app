"use client";

import { useCallback, useState } from "react";
import { usePostTranslation } from "@/lib/PostTranslationContext";

function collectI18nNodes(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-i18n]"));
}

/**
 * data-i18n 要素をまとめて /api/translate に送り、表示を Target 言語に差し替える。
 * ページ表示時は自動実行しない（コスト削減）。クリック時のみ。
 */
export default function PageI18nTranslateButton() {
  const { targetLang, sameLanguage } = usePostTranslation();
  const [busy, setBusy] = useState(false);

  const run = useCallback(async () => {
    if (sameLanguage || typeof window === "undefined") return;
    const nodes = collectI18nNodes();
    if (nodes.length === 0) return;

    const sources = nodes.map((el) => {
      const src = el.getAttribute("data-i18n-src");
      if (src != null && src !== "") return src;
      const t = el.innerText ?? "";
      el.setAttribute("data-i18n-src", t);
      return t;
    });

    const payload: { idx: number; text: string }[] = [];
    sources.forEach((t, i) => {
      const s = (t ?? "").trim();
      if (s) payload.push({ idx: i, text: s });
    });
    if (payload.length === 0) return;

    setBusy(true);
    try {
      const r = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: payload.map((p) => p.text),
          target: targetLang,
          format: "text",
        }),
      });
      if (!r.ok) return;
      const data = await r.json();
      const ts: string[] = Array.isArray(data?.translations) ? data.translations : [];
      payload.forEach((p, k) => {
        const el = nodes[p.idx];
        if (!el) return;
        el.dataset.i18nDone = "1";
        const t = ts[k];
        if (typeof t === "string" && t.length) el.innerText = t;
      });
    } finally {
      setBusy(false);
    }
  }, [sameLanguage, targetLang]);

  if (sameLanguage) {
    return (
      <span className="text-[10px] opacity-50 whitespace-nowrap" title="Native と Target が同じです">
        UI翻訳不要
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void run()}
      className="rounded-md border border-gray-400 bg-white/90 px-2 py-1 text-xs font-medium text-gray-800 hover:bg-white disabled:opacity-50 whitespace-nowrap shrink-0"
      title={`ページ内の UI 文言（data-i18n）を ${targetLang.toUpperCase()} に翻訳`}
    >
      {busy ? "…" : "UIを翻訳"}
    </button>
  );
}
