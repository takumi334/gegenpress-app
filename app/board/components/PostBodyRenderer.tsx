"use client";

import { useMemo } from "react";
import { parseTacticsPostBody, stripDataUrlsFromText } from "@/lib/tacticsPostBody";

type PostBodyRendererProps = {
  /** 投稿本文（Native） */
  body: string;
  /** 翻訳後の本文（省略時は表示しない） */
  translatedBody?: string | null;
  /** 翻訳不要スレッドで true のとき翻訳列に「翻訳不要」を表示 */
  noTranslation?: boolean;
  className?: string;
};

export default function PostBodyRenderer({
  body,
  translatedBody,
  noTranslation,
  className = "",
}: PostBodyRendererProps) {
  const parsed = useMemo(() => parseTacticsPostBody(body), [body]);
  const safeTranslated = useMemo(
    () => (translatedBody ? stripDataUrlsFromText(translatedBody) : ""),
    [translatedBody]
  );

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 戦術メモのメタ情報 */}
      {parsed.hasTacticMeta && parsed.metaLines.length > 0 && (
        <div className="rounded-lg border border-white/20 bg-white/5 p-3 text-xs text-white/80">
          <div className="font-medium text-white/90 mb-1">戦術メモ</div>
          <ul className="space-y-0.5 list-none p-0 m-0">
            {parsed.metaLines
              .filter((line) => line.length > 0)
              .map((line, i) => (
                <li key={i}>{line}</li>
              ))}
          </ul>
        </div>
      )}

      {/* ユーザーメモ本文（data URL は含めず、画像は別ブロックで表示） */}
      {parsed.userBody.length > 0 && (
        <div className="whitespace-pre-wrap text-sm">{parsed.userBody}</div>
      )}

      {/* 画像プレビュー（base64 は img で表示し、生文字列は出さない） */}
      {parsed.imageUrls.length > 0 && (
        <div className="space-y-2">
          {parsed.imageUrls.map((url, i) => (
            <div key={i} className="rounded overflow-hidden border border-white/20 max-w-md">
              <img
                src={url}
                alt={`戦術図 ${i + 1}`}
                className="max-w-full h-auto block"
              />
            </div>
          ))}
        </div>
      )}

      {/* 翻訳列用: 翻訳テキスト（data URL は絶対に表示しない） */}
      {noTranslation ? (
        <div className="text-sm text-white/50 italic">翻訳不要</div>
      ) : safeTranslated.length > 0 ? (
        <div className="whitespace-pre-wrap text-sm border-t border-white/10 pt-2 mt-2">
          {safeTranslated}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Native 列のみ表示（2カラムの左側用）
 */
export function PostBodyNativeOnly({
  body,
  className = "",
}: {
  body: string;
  className?: string;
}) {
  const parsed = useMemo(() => parseTacticsPostBody(body), [body]);

  return (
    <div className={`space-y-3 ${className}`}>
      {parsed.hasTacticMeta && parsed.metaLines.length > 0 && (
        <div className="rounded-lg border border-white/20 bg-white/5 p-3 text-xs text-white/80">
          <div className="font-medium text-white/90 mb-1">戦術メモ</div>
          <ul className="space-y-0.5 list-none p-0 m-0">
            {parsed.metaLines
              .filter((line) => line.length > 0)
              .map((line, i) => (
                <li key={i}>{line}</li>
              ))}
          </ul>
        </div>
      )}
      {parsed.userBody.length > 0 && (
        <div className="whitespace-pre-wrap text-sm">{parsed.userBody}</div>
      )}
      {parsed.imageUrls.length > 0 && (
        <div className="space-y-2">
          {parsed.imageUrls.map((url, i) => (
            <div key={i} className="rounded overflow-hidden border border-white/20 max-w-md">
              <img
                src={url}
                alt={`戦術図 ${i + 1}`}
                className="max-w-full h-auto block"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Translation 列のみ表示（2カラムの右側用）。data URL は絶対に表示しない。
 */
export function PostBodyTranslationOnly({
  body,
  translatedBody,
  noTranslation,
  className = "",
}: {
  body: string;
  translatedBody?: string | null;
  noTranslation?: boolean;
  className?: string;
}) {
  const safeTranslated = useMemo(
    () => (translatedBody ? stripDataUrlsFromText(translatedBody) : ""),
    [translatedBody]
  );

  if (noTranslation) {
    return (
      <div className={`text-sm text-white/50 italic ${className}`}>翻訳不要</div>
    );
  }
  if (!safeTranslated) {
    return null;
  }
  return (
    <div className={`whitespace-pre-wrap text-sm ${className}`}>{safeTranslated}</div>
  );
}
