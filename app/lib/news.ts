import { XMLParser } from "fast-xml-parser";

export type NewsItem = {
  title: string;
  link: string;
  publishedAt?: string;
  source?: string;
};

export async function fetchTeamNews(teamName: string, locale = "ja"): Promise<NewsItem[]> {
  // Google News RSS驍ｵ・ｲ郢ｧ繝ｻ・ｽ・ｾ郢晢ｽｻ 髫ｴ魃会ｽｽ・･髫ｴ蟷｢・ｽ・ｬ鬮ｫ・ｱ郢晢ｽｻ
  // hl=ja & gl=JP & ceid=JP:ja 驛｢・ｧ陷代・・ｽ・ｻ陋溘・・ｽ・ｸ髮懶ｽ｣繝ｻ・ｼ闔・･繝ｻ・ｿ郢晢ｽｻ繝ｻ・ｦ遶丞｣ｺ繝ｻ髯滂ｽ｢隲帷腸・ｧ驍ｵ・ｺ繝ｻ・ｦ驛｢譎｢・ｽ・ｭ驛｢・ｧ繝ｻ・ｱ驛｢譎｢・ｽ・ｼ驛｢譎｢・ｽ・ｫ髯樊ｺｽ蛻､陝ｲ・ｩ郢晢ｽｻ郢晢ｽｻ
  const q = encodeURIComponent(`${teamName} football OR soccer`);
  const url = `https://news.google.com/rss/search?q=${q}&hl=${locale}&gl=JP&ceid=JP:${locale}`;

  const r = await fetch(url, { next: { revalidate: 60 * 10 } }); // 10髯具ｽｻ郢晢ｽｻ邵ｺ蜀暦ｽｹ譎｢・ｽ・｣驛｢譏ｴ繝ｻ邵ｺ蜥擾ｽｹ譎｢・ｽ・･
  if (!r.ok) return [];
  const xml = await r.text();

  const parser = new XMLParser({ ignoreAttributes: false });
  const j = parser.parse(xml);
  const items = j?.rss?.channel?.item || [];

  const list: NewsItem[] = items.slice(0, 8).map((it: any) => ({
    title: it?.title ?? "",
    link: normalizeGoogleNewsLink(it?.link ?? ""),
    publishedAt: it?.pubDate ?? "",
    source: it?.source?.["#text"] ?? "",
  }));
  return list;
}

// Google News 驛｢譎｢・ｽ・ｪ驛｢謨鳴驛｢・ｧ繝ｻ・､驛｢譎｢・ｽ・ｬ驛｢・ｧ繝ｻ・ｯ驛｢譎冗樟繝ｻ螳壽･懆ｰｺ谺鱈驍ｵ・ｺ繝ｻ・ｫ髯昴・繝ｻ隨ｳ迢暦ｽｹ・ｧ陷茨ｽｷ繝ｻ・ｼ髢ｧ・ｲ繝ｻ・ｰ繝ｻ・｡髫ｴ蝓主ｱｮ繝ｻ・ｼ郢晢ｽｻ
function normalizeGoogleNewsLink(link: string): string {
  try {
    const u = new URL(link);
    const urlParam = u.searchParams.get("url");
    return urlParam || link;
  } catch {
    return link;
  }
}

