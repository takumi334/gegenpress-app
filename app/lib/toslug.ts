// app/lib/toSlug.ts
export default function toSlug(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // 驛｢・ｧ繝ｻ・｢驛｢・ｧ繝ｻ・ｯ驛｢・ｧ繝ｻ・ｻ驛｢譎｢・ｽ・ｳ驛｢譎会ｽ｣・ｯ陷坂握諠ｷ繝ｻ・ｻ
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

