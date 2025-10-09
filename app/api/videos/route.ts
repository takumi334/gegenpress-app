import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// YouTube 検索RSS（公式APIなしの簡易版）
function buildYoutubeSearchFeed(q: string) {
  return `https://www.youtube.com/feeds/videos.xml?search_query=${encodeURIComponent(q)}`;
}

function clean(s: string) {
  return s.replace(/<!\[CDATA\[|\]\]>/g, "").trim();
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "Premier League official";
    const xml = await fetch(buildYoutubeSearchFeed(q), { cache: "no-store" }).then((r) => r.text());

    const items: { id: string; title: string; url: string; publishedAt: string }[] = [];
    const re = /<entry>([\s\S]*?)<\/entry>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml)) && items.length < 12) {
      const block = m[1];
      const get = (tag: string) => clean(block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))?.[1] ?? "");
      const linkMatch = block.match(/<link[^>]+href="([^"]+)"/);
      items.push({
        id: get("id"),
        title: get("title"),
        url: linkMatch?.[1] ?? "",
        publishedAt: get("published"),
      });
    }

    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}

