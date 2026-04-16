import type { Metadata } from "next";
import { getCanonicalUrl } from "@/lib/publicSiteUrl";

export const metadata: Metadata = {
  title: "Board | Gegenpress",
  alternates: {
    canonical: getCanonicalUrl("/board"),
  },
};

export default function BoardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
