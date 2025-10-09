// app/team/[slug]/not-found.tsx郢晢ｽｻ闔・･繝ｻ・､騾包ｽｻ陝ｲ・ｩ驍ｵ・ｺ繝ｻ・ｪ驍ｵ・ｺ陷会ｽｱ邵ｲ荳ｹK郢晢ｽｻ郢晢ｽｻ
import Link from "next/link";

export default function TeamNotFound() {
  return (
    <main className="px-6 py-16">
      <h1 className="text-2xl font-bold">Team not found</h1>
      <p className="mt-2 text-black/60">髫ｰ謔ｶ繝ｻ繝ｻ・ｮ陞｢・ｹ繝ｻ繝ｻ・ｹ・ｧ陟募ｨｯ陞ｺ驛｢譏ｶ繝ｻ郢晢ｽｻ驛｢譎｢・｣・ｰ驍ｵ・ｺ繝ｻ・ｯ鬮ｫ遨ゑｽｹ譏ｶ蜻ｽ驍ｵ・ｺ闕ｵ譎｢・ｽ鬘費ｽｸ・ｺ繝ｻ・ｾ驍ｵ・ｺ陝ｶ蜻ｻ・ｽ骰具ｽｸ・ｺ繝ｻ・ｧ驍ｵ・ｺ陷会ｽｱ隨ｳ繝ｻ・ｸ・ｲ郢晢ｽｻ/p>
      <Link href="/" className="mt-6 inline-block rounded-lg px-4 py-2 bg-black text-white">
        驛｢譎冗樟郢晢ｽ｣驛｢譎丞ｹｲ遶城メ・ｬ魃会ｽｽ・ｻ驛｢・ｧ郢晢ｽｻ
      </Link>
    </main>
  );
}

