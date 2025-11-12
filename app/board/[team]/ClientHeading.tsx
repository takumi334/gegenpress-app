// app/board/[team]/ClientHeading.tsx
"use client";

import { useEffect, useState } from "react";

export default function ClientHeading({ teamName }: { teamName: string }) {
  const [label, setLabel] = useState("Board");

  useEffect(() => {
    const lang = (localStorage.getItem("baseLang") || localStorage.getItem("lang") || "en")
      .slice(0, 2);
    const LABELS: Record<string, string> = {
      en: "Board",
      ja: "掲示板",
      fr: "Forum",
      es: "Foro",
      de: "Forum",
      ko: "게시판",
      zh: "讨论区",
    };
    setLabel(LABELS[lang] ?? "Board");
  }, []);

  return (
    <span translate="no">
      {teamName} {label}
    </span>
  );
}

