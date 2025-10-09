"use client";
import { useState } from "react";
import { translateText } from "@/app/lib/translate";

export default function TranslatePage() {
  const [src, setSrc] = useState("");
  const [dst, setDst] = useState("");
  const [lang, setLang] = useState("ja");

  const onRun = async () => {
    const t = await translateText(src, lang);
    setDst(t);
  };

  return (
    <main className="p-4 space-y-3">
      <h1 className="text-2xl font-bold">翻訳ツール</h1>
      <div className="flex gap-2 items-center">
        <label className="text-sm">Target</label>
        <select value={lang} onChange={(e)=>setLang(e.target.value)} className="border px-2 py-1 rounded">
          <option value="ja">日本語</option>
          <option value="en">English</option>
          <option value="es">Español</option>
          {/* 必要な言語を追加 */}
        </select>
        <button onClick={onRun} className="border px-3 py-1 rounded">翻訳する</button>
      </div>
      <textarea value={src} onChange={(e)=>setSrc(e.target.value)} placeholder="原文"
                className="border w-full min-h-[120px] p-2 rounded" />
      <textarea value={dst} readOnly placeholder="訳文"
                className="border w-full min-h-[120px] p-2 rounded bg-gray-50" />
    </main>
  );
}

