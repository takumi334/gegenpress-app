"use client";

type Props = { teamName: string; limit?: number };

export default function VideoHub({ teamName, limit = 6 }: Props) {
  // YouTube 検索クエリ
  const qOfficial   = encodeURIComponent(`${teamName} official channel`);
  const qHighlights = encodeURIComponent(`${teamName} highlights`);
  const qPress      = encodeURIComponent(`${teamName} press conference`);

  const ytBase = "https://www.youtube.com/results?search_query=";

  // 表示リンク（GOAL/translateは入れない）
  const links = [
    { label: "YouTube: Official channel",  href: `${ytBase}${qOfficial}` },
    { label: "YouTube: Highlights",        href: `${ytBase}${qHighlights}` },
    { label: "YouTube: Press conference",  href: `${ytBase}${qPress}` },
    { label: "BBC (original)", href: `https://www.bbc.co.uk/search?q=${encodeURIComponent(`${teamName} football`)}&filter=news` },
  ];

  return (
    <section className="space-y-3">
      <ul className="list-disc pl-5 space-y-1">
        {links.map(l => (
          <li key={l.href}>
            <a className="underline underline-offset-2 hover:text-blue-600"
               href={l.href} target="_blank" rel="noreferrer">
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

