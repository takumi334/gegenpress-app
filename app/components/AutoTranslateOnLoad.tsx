'use client';
import { useEffect } from "react";

async function translateAll(target: string) {
  if (!target) return;

  // 1) 対象収集 & 原文退避
  const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-i18n]"));
  if (nodes.length === 0) return;

  const originals = nodes.map((el) => el.getAttribute("data-i18n-src") ?? el.innerText);
  nodes.forEach((el, i) => {
    if (!el.getAttribute("data-i18n-src")) el.setAttribute("data-i18n-src", originals[i]);
  });

  // 空文字は送らない
  const payload: { idx: number; text: string }[] = [];
  originals.forEach((t, i) => {
    const s = (t ?? "").trim();
    if (s) payload.push({ idx: i, text: s });
  });
  if (payload.length === 0) return;

  const r = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: payload.map(p => p.text), target, format: "text" }),
    cache: "no-store",
  });
  if (!r.ok) return;

  const data = await r.json();
  const ts: string[] = data?.translations ?? [];
  payload.forEach((p, k) => {
    nodes[p.idx].innerText = ts[k] ?? nodes[p.idx].innerText;
  });
}

export default function AutoTranslateOnLoad() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const target =
      localStorage.getItem("targetLang") ||
      localStorage.getItem("lang") ||      // ★ 互換
      "";

    // 初期：target が base と違うなら翻訳
    const base = localStorage.getItem("baseLang") || (navigator.language?.split("-")[0] ?? "ja");
    if (target && target !== base) {
      translateAll(target);
    }

    // 監視：新しい data-i18n 要素が追加されたら再翻訳
    const mo = new MutationObserver(() => {
      const t = localStorage.getItem("targetLang") || localStorage.getItem("lang") || "";
      const b = localStorage.getItem("baseLang") || (navigator.language?.split("-")[0] ?? "ja");
      if (t && t !== b) translateAll(t);
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => mo.disconnect();
  }, []);

  return null;
}

