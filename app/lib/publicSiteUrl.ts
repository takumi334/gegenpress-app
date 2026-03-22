/**
 * metadata / canonical / sitemap / robots 用のベースURL。
 * 本番URL（SITE_URL / NEXT_PUBLIC_SITE_URL）を優先。固定URLで検索結果の表示を安定させる。
 * VERCEL_URL は本番デプロイ時のみフォールバック（VERCEL_ENV=production）。プレビューURLは使わない。
 */
export function getSiteUrl(): string {
  const raw = (
    process.env.SITE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    ""
  ).trim();
  if (raw) {
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      const url = new URL(withProto);
      return url.origin.replace(/\/$/, "");
    } catch {
      /* invalid */
    }
  }
  if (
    process.env.VERCEL_ENV === "production" &&
    process.env.VERCEL_URL
  ) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}

/**
 * メール・署名付き管理URL用の公開オリジン。
 * localhost / 127.0.0.1 はメールに載せない（空扱い）。
 */
export function getPublicSiteOrigin(): string {
  const raw = (
    process.env.SITE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    ""
  ).trim();
  if (!raw) return "";

  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(withProto);
  } catch {
    return "";
  }

  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") {
    return "";
  }

  return url.origin.replace(/\/$/, "");
}

/** メール本文用: 未設定・localhost のときの説明文 */
export const PUBLIC_SITE_URL_FALLBACK_MESSAGE =
  "（SITE_URL または NEXT_PUBLIC_SITE_URL に本番の https://ドメイン を設定してください。未設定のためメール内のリンクを省略しています）";
