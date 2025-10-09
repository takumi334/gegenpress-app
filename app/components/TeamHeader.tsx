"use client";

type Props = {
  name: string;
  // crest?: string;  // 驕ｶ鄙ｫ繝ｻ髣厄ｽｴ繝ｻ・ｿ驛｢・ｧ闕ｳ蟯ｩ繝ｻ驍ｵ・ｺ郢晢ｽｻ
  founded?: number;
  clubColors?: string;
  venue?: string;
  website?: string;
};

// 鬯ｯ繝ｻ・ｽ・ｭ髫ｴ竏壹・繝ｻ・ｭ陷会ｽｱ郢晢ｽｰ驛｢譏ｴ繝ｻ邵ｺ螢ｹ繝ｻ陋ｹ・ｻ・取ｺｽ・ｹ・ｧ繝ｻ・ｴ髣比ｼ夲ｽｽ・｣髫ｴ蜴・ｽｽ・ｿ郢晢ｽｻ郢晢ｽｻ
function InitialBadge({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="w-20 h-20 shrink-0 rounded-xl bg-gray-200 grid place-items-center text-xl font-bold text-gray-700">
      {initials || "FC"}
    </div>
  );
}

export default function TeamHeader({
  name,
  founded,
  clubColors,
  venue,
  website,
}: Props) {
  return (
    <header className="flex items-center gap-4 p-4 rounded-2xl shadow-sm bg-white/70">
      {/* 鬮｣・｡陟搾ｽｺ繝ｻ・ｽ隲幄肩・ｽ・ｨ繝ｻ・ｩ鬯ｩ貅ｯ縺也ｹ晢ｽｻ驍ｵ・ｺ繝ｻ・ｧ驛｢譎｢・ｽ・ｭ驛｢・ｧ繝ｻ・ｴ驍ｵ・ｺ繝ｻ・ｯ鬮ｯ・ｦ繝ｻ・ｨ鬩穂ｼ夲ｽｽ・ｺ驍ｵ・ｺ陷会ｽｱ遶企・・ｸ・ｺ郢晢ｽｻ*/}
      <InitialBadge name={name} />

      <div className="flex-1">
        <h1 className="text-2xl font-bold">{name}</h1>

        <div className="mt-1 text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
          {founded ? (
            <span>
              <span className="text-gray-500">Founded:</span> {founded}
            </span>
          ) : null}
          {clubColors ? (
            <span>
              <span className="text-gray-500">Colors:</span> {clubColors}
            </span>
          ) : null}
          {venue ? (
            <span>
              <span className="text-gray-500">Stadium:</span> {venue}
            </span>
          ) : null}
          {website ? (
            <a
              className="text-blue-600 underline break-all"
              href={website}
              target="_blank"
              rel="noreferrer"
            >
              {website}
            </a>
          ) : null}
        </div>
      </div>
    </header>
  );
}

