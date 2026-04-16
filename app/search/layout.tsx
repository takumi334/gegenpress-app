import type { Metadata } from "next";
import { getCanonicalUrl } from "@/lib/publicSiteUrl";

export const metadata: Metadata = {
  title: "Search | Gegenpress",
  alternates: {
    canonical: getCanonicalUrl("/search"),
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function SearchLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
