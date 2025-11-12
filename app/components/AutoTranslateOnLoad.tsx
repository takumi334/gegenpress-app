// app/components/AutoTranslateOnLoad.tsx
'use client';
import { useEffect } from 'react';

function collectTargets(): HTMLElement[] {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-i18n]'));
  // まだ翻訳していないものだけ
  return nodes.filter(n => !n.dataset.i18nDone);
}

async function translateAll(target: string) {
  const nodes = collectTargets();
  if (nodes.length === 0) return;

  // 元文を保存（初回のみ）
  const sources = nodes.map((el) => {
    const src = el.getAttribute('data-i18n-src');
    if (!src) el.setAttribute('data-i18n-src', el.innerText);
    return src ?? el.innerText;
  });

  // 空文字は送らない
  const payload: { idx: number; text: string }[] = [];
  sources.forEach((t, i) => {
    const s = (t ?? '').trim();
    if (s) payload.push({ idx: i, text: s });
  });
  if (payload.length === 0) return;

  // 翻訳API
  const r = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: payload.map(p => p.text), target, format: 'text' }),
    cache: 'no-store',
  });
  if (!r.ok) return;
  const data = await r.json();
  const ts: string[] = data?.translations ?? [];

  // ループ防止：印を付けてから書き換え
  payload.forEach((p, k) => {
    const el = nodes[p.idx];
    if (!el) return;
    el.dataset.i18nDone = '1';
    const t = ts[k];
    if (typeof t === 'string' && t.length) {
      el.innerText = t;
    }
  });
}

// 短時間の連続イベントをまとめる
function debounce<F extends (...a: any[]) => void>(fn: F, ms = 300) {
  let h: number | undefined;
  return (...args: Parameters<F>) => {
    if (h) window.clearTimeout(h);
    h = window.setTimeout(() => fn(...args), ms);
  };
}

export default function AutoTranslateOnLoad() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const target =
      localStorage.getItem('targetLang') ||
      localStorage.getItem('lang') || // 互換
      '';

    const base = localStorage.getItem('baseLang') || (navigator.language?.split('-')[0] ?? 'ja');

    // 初回
    if (target && target !== base) {
      translateAll(target);
    }

    // 監視（デバウンスあり）
    const debounced = debounce(() => {
      const t = localStorage.getItem('targetLang') || localStorage.getItem('lang') || '';
      const b = localStorage.getItem('baseLang') || (navigator.language?.split('-')[0] ?? 'ja');
      if (t && t !== b) translateAll(t);
    }, 500);

    const mo = new MutationObserver(() => debounced());
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });

    return () => mo.disconnect();
  }, []);

  return null;
}

