import { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/publicSiteUrl";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  const isPreviewEnvironment = process.env.VERCEL_ENV === "preview";
  return {
    rules: isPreviewEnvironment
      ? [{ userAgent: "*", disallow: "/" }]
      : [{ userAgent: "*", allow: "/", disallow: ["/api/", "/admin/"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
