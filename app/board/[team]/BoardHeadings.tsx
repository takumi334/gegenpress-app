"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/NativeLangProvider";

type Props = {
  teamName: string;
};

export default function BoardHeadings({ teamName }: Props) {
  const [mounted, setMounted] = useState(false);
  const t = useT();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold">{t("board.boardTitle", { teamName })}</h1>
      <p className="mt-2 text-sm text-white/75 max-w-2xl">
        {t("board.boardDesc", { teamName })}
      </p>
    </div>
  );
}
