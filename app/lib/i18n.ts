// lib/i18n.ts
import { cookies } from "next/headers";

export function getTargetLang() {
  const c = cookies().get("ui_lang")?.value;
  return c || process.env.DEFAULT_LANG || "en";
}

