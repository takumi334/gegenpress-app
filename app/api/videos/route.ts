
import { NextResponse } from "next/server";
const VIDEOS_CACHE_HEADERS: Record<string, string> = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=60",
};
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  return NextResponse.json(
    {
      items: [
        { title: `${q} highlights`, url: "https://www.youtube.com/results?search_query=" + encodeURIComponent(q) },
        { title: `${q} press conference`, url: "https://www.youtube.com/results?search_query=" + encodeURIComponent(q + " press conference") },
      ],
    },
    { headers: VIDEOS_CACHE_HEADERS }
  );
}
