"use client";

import { useEffect } from "react";

type Props = {
  /** Google AdSense の data-ad-slot */
  slot: string;
  /** コンテナのスタイル（デフォルトは 250px 高さ確保） */
  style?: React.CSSProperties;
  /** 自動レイアウト */
  format?: string; // "auto" など
  /** レスポンシブ指定 */
  responsive?: "true" | "false";
};

/**
 * Google AdSense インライン広告
 * 使い方:
 * <AdSense slot="xxxxxxxxxx" />
 */
export default function AdSense({
  slot,
  style = { display: "block", minHeight: "250px" },
  format = "auto",
  responsive = "true",
}: Props) {
  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // スクリプト未読込などで失敗しても致命的ではないので握りつぶす
    }
  }, []);

  return (
    <ins
      className="adsbygoogle"
      style={style as any}
      // TODO: あなたの AdSense ID に置き換えてください（ca-pub-XXXXXXXXXXXXXXX）
      data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={responsive}
    />
  );
}

