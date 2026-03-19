/**
 * 戦術投稿本文のパース
 * - data:image/... を画像URLとして抽出
 * - 【戦術メモ】ブロックをメタ情報として抽出
 * - ユーザーメモ本文のみをテキストとして返す
 */

const DATA_URL_REGEX = /!\[([^\]]*)\]\((data:image\/[a-z]+;base64,[^)]+)\)/gi;
const TACTIC_HEADER_START = "【戦術メモ】";
const TACTIC_HEADER_END = "この投稿は lineup-builder から作成されました";

export type ParsedTacticsPost = {
  /** 戦術メモのメタ行（Formation, Frames, Current Frame など） */
  metaLines: string[];
  /** 本文に含まれる data URL 画像の配列 */
  imageUrls: string[];
  /** メタと画像を除いたユーザーメモ本文 */
  userBody: string;
  /** 戦術メモブロックがあったか */
  hasTacticMeta: boolean;
};

/**
 * 本文から構造化データをパースする。
 * 既存の通常投稿はそのまま userBody に含め、metaLines は空で返す。
 */
export function parseTacticsPostBody(body: string): ParsedTacticsPost {
  if (!body || typeof body !== "string") {
    return { metaLines: [], imageUrls: [], userBody: "", hasTacticMeta: false };
  }

  const imageUrls: string[] = [];
  let text = body;

  // 1. Markdown 画像 ![...](data:image/...) を抽出し、プレースホルダーに置換
  text = text.replace(DATA_URL_REGEX, (_, _alt, dataUrl) => {
    imageUrls.push(dataUrl);
    return "\n[画像]\n";
  });

  const lines = text.split(/\r?\n/);
  const metaLines: string[] = [];
  const userLines: string[] = [];
  let inMeta = false;
  let foundMeta = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (line.includes(TACTIC_HEADER_START)) {
      inMeta = true;
      foundMeta = true;
      metaLines.push(trimmed);
      continue;
    }
    if (inMeta) {
      if (line.includes(TACTIC_HEADER_END)) {
        metaLines.push(trimmed);
        inMeta = false;
        continue;
      }
      const isMetaLine =
        !trimmed ||
        trimmed.startsWith("Formation:") ||
        trimmed.startsWith("Frames:") ||
        trimmed.startsWith("Current Frame:");
      if (isMetaLine) {
        metaLines.push(trimmed);
        continue;
      }
      inMeta = false;
    }
    if (!inMeta) {
      const isTacticOrDataUrl =
        trimmed === "[tactic]" || /^data:image\/[a-z]+;base64,/.test(trimmed);
      if (!isTacticOrDataUrl) {
        userLines.push(line);
      }
    }
  }

  const userBody = userLines
    .join("\n")
    .replace(/\n*\[画像\]\n*/g, "\n")
    .replace(/\n*\[tactic\]\n*/gi, "\n")
    .trim();

  return {
    metaLines,
    imageUrls,
    userBody,
    hasTacticMeta: foundMeta || metaLines.length > 0,
  };
}

/**
 * 翻訳文から data URL を除去し、表示用テキストにする。
 * 翻訳APIが base64 をそのまま返した場合に生文字列を表示しないため。
 */
export function stripDataUrlsFromText(text: string): string {
  if (!text || typeof text !== "string") return "";
  return text.replace(DATA_URL_REGEX, () => "\n[画像]\n").replace(/\n*\[画像\]\n*/g, "\n").trim();
}
