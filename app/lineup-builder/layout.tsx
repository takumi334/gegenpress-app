import type { Metadata } from "next";
import { getCanonicalUrl } from "@/lib/publicSiteUrl";

export const metadata: Metadata = {
  title: "Lineup Builder | Gegenpress",
  alternates: {
    canonical: getCanonicalUrl("/lineup-builder"),
  },
};

export default function LineupBuilderLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
