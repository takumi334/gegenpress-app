export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import LineupViewClient from "./LineupViewClient";
import { getCanonicalUrl } from "@/lib/publicSiteUrl";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: "Lineup | Gegenpress",
    alternates: {
      canonical: getCanonicalUrl(`/lineup-builder/${id}`),
    },
  };
}

export default function LineupViewPage() {
  return <LineupViewClient />;
}
