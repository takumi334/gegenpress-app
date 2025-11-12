export type Lang = { code: string; label: string };
export type LeagueId = 'PL' | 'PD' | 'SA' | 'BL1' | 'FL1' | 'DED' | 'PPL';

export const LEAGUES: { id: LeagueId; name: string }[] = [
  { id: 'PL', name: 'Premier League' },
  { id: 'PD', name: 'La Liga' },
  { id: 'SA', name: 'Serie A' },
  { id: 'BL1', name: 'Bundesliga' },
  { id: 'FL1', name: 'Ligue 1' },
  { id: 'DED', name: 'Eredivisie' },      // オランダ
  { id: 'PPL', name: 'Primeira Liga' },   // ポルトガル
];

export const LANGUAGES: Lang[] = [
  { code: "ja", label: "日本語" },
  { code: "en", label: "English" },
  { code: "zh-CN", label: "简体中文" },
  { code: "zh-TW", label: "繁體中文" },
  { code: "ko", label: "한국어" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "es", label: "Español" },
  { code: "pt", label: "Português" },
  { code: "it", label: "Italiano" },
  { code: "ru", label: "Русский" },
  { code: "ar", label: "العربية" },
  { code: "hi", label: "हिन्दी" },
  { code: "th", label: "ไทย" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "id", label: "Bahasa Indonesia" },
  { code: "ms", label: "Bahasa Melayu" },
  { code: "tr", label: "Türkçe" },
  { code: "nl", label: "Nederlands" },
  { code: "sv", label: "Svenska" },
  { code: "pl", label: "Polski" },
  { code: "uk", label: "Українська" },
  { code: "cs", label: "Čeština" },
  { code: "el", label: "Ελληνικά" },
  { code: "he", label: "עברית" },
  { code: "ro", label: "Română" },
  { code: "hu", label: "Magyar" },
  { code: "da", label: "Dansk" },
  { code: "fi", label: "Suomi" },
  { code: "no", label: "Norsk" },
  // 必要に応じて追加
];

