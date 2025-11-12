"use client";
import { useState } from "react";

export default function SettingsPage() {
  const [lang, setLang] = useState("ja");

  const saveLang = async () => {
    await fetch("/api/set-lang", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang }),
    });
    alert("保存しました！");
  };

  return (
    <main className="p-6">
      <h1 className="text-xl font-bold mb-4">母国語設定</h1>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        className="border p-2"
      >
        <option value="en">English</option>
        <option value="ja">日本語</option>
        <option value="ko">한국어</option>
        <option value="zh">中文</option>
        <option value="es">Español</option>
      </select>
      <button
        onClick={saveLang}
        className="ml-2 px-4 py-2 bg-blue-600 text-white rounded"
      >
        保存
      </button>
    </main>
  );
}
