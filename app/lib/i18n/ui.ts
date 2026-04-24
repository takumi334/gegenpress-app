import type { UILanguage } from "@/lib/NativeLangProvider";

export const UI_LANGUAGES: Array<{ code: UILanguage; label: string }> = [
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
  { code: "it", label: "Italiano" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
];

export const UI_STORAGE_KEY = "uiLanguage";
