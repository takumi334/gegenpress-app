"use client";

import { useT } from "@/lib/NativeLangProvider";

export function ClubNewsTitle() {
  const t = useT();
  return <h2 className="text-xl font-semibold">{t("board.clubNews")}</h2>;
}

export function OfficialVideosTitle() {
  const t = useT();
  return <h2 className="text-xl font-semibold">{t("board.officialVideos")}</h2>;
}
