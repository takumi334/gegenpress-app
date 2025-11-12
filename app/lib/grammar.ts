// app/lib/grammar.ts（または grammarHints.ts）

// 各リーグ対応言語（8言語）
export const LANG_OPTIONS = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "fr", label: "Français" },
  { code: "pt", label: "Português" },
  { code: "nl", label: "Nederlands" },
  { code: "ja", label: "日本語" },
];

// 中卒レベル文法ヒント（要点だけ）
export const MINI_GRAMMAR: Record<string, string[]> = {
  en: [
    "Use 'a/an' for singular countable nouns.",
    "Verb + s for he/she/it (He plays football).",
    "Adjectives come before nouns (a big stadium).",
  ],
  es: [
    "Los sustantivos tienen género (el, la).",
    "Verbos terminan en -ar, -er, -ir.",
    "Adjetivos siguen al sustantivo (coche rojo).",
  ],
  de: [
    "Substantive sind großgeschrieben.",
    "Der, die, das zeigen das Geschlecht.",
    "Das Verb steht meist an zweiter Stelle.",
  ],
  it: [
    "I nomi hanno genere e numero.",
    "Gli articoli cambiano con il genere (il, la, i, le).",
    "Il verbo concorda con il soggetto.",
  ],
  fr: [
    "Les noms ont un genre (le, la).",
    "L’adjectif s’accorde en genre et nombre.",
    "Les verbes changent selon le sujet.",
  ],
  pt: [
    "Os substantivos têm gênero (o, a).",
    "Os verbos mudam conforme o sujeito.",
    "Adjetivos seguem o substantivo.",
  ],
  nl: [
    "Gebruik 'de' of 'het' voor zelfstandige naamwoorden.",
    "Werkwoorden veranderen met het onderwerp.",
    "Bijvoeglijke naamwoorden komen vóór het zelfstandig naamwoord.",
  ],
  ja: [
    "助詞が文の関係を示す（が・を・に）。",
    "動詞は文末に置く。",
    "形容詞は名詞の前に置く。",
  ],
};

