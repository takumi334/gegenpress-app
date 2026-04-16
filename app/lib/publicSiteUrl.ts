/**
 * metadata / canonical / sitemap / robots 用のベースURL。
 * 検索エンジン向けの正本URLは常に gegenpress.app を返す。
 * （旧 vercel.app が canonical として混入しないように固定）
 */
export function getSiteUrl(): string {
  return "https://gegenpress.app";
}

export function getCanonicalUrl(pathname = "/"): string {
  const base = getSiteUrl();
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return normalizedPath === "/" ? `${base}/` : `${base}${normalizedPath}`;
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
