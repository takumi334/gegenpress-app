import { formatHashtagLine, type BuildHashtagsInput } from "@/lib/xPostHashtags";

/**
 * 「投稿文コピー」「Xで開く」共通の本文組み立て。
 * 順序: 本文（訳→原文）→ 空行 → URL → 空行 → ハッシュタグ行
 */
export function buildXPostShareText(args: {
  translatedText: string;
  nativeText: string;
  url: string;
  hashtagContext?: BuildHashtagsInput;
}): string {
  const textParts: string[] = [];
  const tr = (args.translatedText ?? "").trim();
  const nat = (args.nativeText ?? "").trim();
  if (tr) textParts.push(tr);
  if (nat) textParts.push(nat);
  const body = textParts.join("\n\n");

  const url = (args.url ?? "").trim();
  const tagLine = formatHashtagLine(args.hashtagContext ?? {});

  const blocks: string[] = [];
  if (body) blocks.push(body);
  if (url) blocks.push(url);
  if (tagLine) blocks.push(tagLine);
  return blocks.join("\n\n");
}
