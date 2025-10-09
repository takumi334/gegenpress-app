"use client";

import { useState } from "react";

type Props = {
  id: string;
  author: string;
  body: string;
  createdAt: number;
  // ユーザー設定（簡易版）：母国語と学習言語
  nativeLang?: string;   // 例 "ja"
  learnLang?: string;    // 例 "en"
};

export default function PostItem({ id, author, body, createdAt, nativeLang="ja", learnLang="en" }: Props) {
  const [loadingT, setLoadingT] = useState(false);
  const [loadingG, setLoadingG] = useState(false);
  const [translated, setTranslated] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleTranslate() {
    setError(null);
    setLoadingT(true);
    try {
      // 学習支援想定：本文を「母国語」と「学習言語」の2方向で見たい場合は
      // とりあえず「母国語へ翻訳」を採用。必要なら両方表示に拡張可。
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: body, target: nativeLang }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setTranslated(json.translated as string);
    } catch (e: any) {
      setError(e?.message ?? "翻訳に失敗しました");
    } finally {
      setLoadingT(false);
    }
  }

  async function handleGrammar() {
    setError(null);
    setLoadingG(true);
    try {
      // 文法解説は「学習言語」視点で
      const res = await fetch("/api/grammar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: body, lang: learnLang }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setExplanation(json.explanation as string);
    } catch (e: any) {
      setError(e?.message ?? "文法解説に失敗しました");
    } finally {
      setLoadingG(false);
    }
  }

  return (
    <li className="border p-3 rounded">
      <div className="text-sm text-gray-500">
        {author}・{new Date(createdAt).toLocaleString()}
      </div>
      <div className="whitespace-pre-wrap mt-1">{body}</div>

      <div className="mt-3 flex gap-2">
        <button
          disabled={loadingT}
          onClick={handleTranslate}
          className="px-3 py-1 rounded border hover:bg-gray-50 disabled:opacity-50"
        >
          {loadingT ? "翻訳中…" : "翻訳を表示"}
        </button>
        <button
          disabled={!translated || loadingG}
          onClick={handleGrammar}
          className="px-3 py-1 rounded border hover:bg-gray-50 disabled:opacity-50"
          title={!translated ? "先に翻訳を表示してください" : ""}
        >
          {loadingG ? "解説生成中…" : "文法解説を表示"}
        </button>
      </div>

      {error && <div className="mt-2 text-red-600 text-sm">{error}</div>}

      {translated && (
        <div className="mt-2 text-sm">
          <div className="font-semibold">翻訳（{nativeLang}）</div>
          <div className="whitespace-pre-wrap">{translated}</div>
        </div>
      )}

      {explanation && (
        <div className="mt-2 text-sm italic text-gray-600">
          {explanation}
        </div>
      )}
    </li>
  );
}

