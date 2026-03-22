import { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/publicSiteUrl";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/admin/"] },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
