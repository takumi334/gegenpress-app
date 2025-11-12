'use client';

import { useEffect, useState } from "react";

export default function PostEditor() {
  const [text, setText] = useState("");
  const [translated, setTranslated] = useState("");
  const [explain, setExplain] = useState<any[]>([]);
  const [loading, setLoading] = useState<"t"|"e"|null>(null);
  const [target, setTarget] = useState("en");

  // クライアント保存の選択言語を反映
  useEffect(() => {
    const saved = localStorage.getItem("lang");
    if (saved) setTarget(saved);
  }, []);

  const doTranslate = async () => {
    setLoading("t");
    try {
      const r = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: [text], target }), // 任意→任意
      });
      const data = await r.json();
      setTranslated(data.translations?.[0] ?? "");
    } finally { setLoading(null); }
  };

  const doExplain = async () => {
    setLoading("e");
    try {
      // 解説は英文を想定（他言語にしたい場合はLanguageToolのlangを対応コードに変更）
      const ltLang = target === "en" ? "en-US" : "en-US";
      const r = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: translated || text, lang: ltLang }),
      });
      const data = await r.json();
      setExplain(data.explanations ?? []);
    } finally { setLoading(null); }
  };

  return (
    <div className="space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full h-28 rounded-md border border-white/20 bg-white/10 p-2 text-white"
        placeholder="投稿本文を入力..."
      />
      <div className="flex gap-2">
        <button onClick={doTranslate} disabled={!text || !!loading}
          className="rounded-md bg-white/10 px-3 py-1 text-white border border-white/20">
          {loading==="t" ? "翻訳中..." : `翻訳する（→${target}）`}
        </button>
        <button onClick={doExplain} disabled={!(translated||text) || !!loading}
          className="rounded-md bg-white/10 px-3 py-1 text-white border border-white/20">
          {loading==="e" ? "解析中..." : "文法解説（β）"}
        </button>
      </div>

      {translated && (
        <div className="rounded-lg border border-white/20 bg-white/5 p-3">
          <div className="text-xs opacity-70 mb-1">翻訳結果</div>
          <p className="whitespace-pre-wrap">{translated}</p>
        </div>
      )}

      {explain.length > 0 && (
        <div className="rounded-lg border border-white/20 bg-white/5 p-3 space-y-2">
          <div className="text-xs opacity-70">文法解説（LanguageTool）</div>
          <ul className="list-disc pl-5 text-sm">
            {explain.map((m, i) => (
              <li key={i}><span className="opacity-80">{m.jaNote}</span></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

