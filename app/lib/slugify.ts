// 名前 → slug の正規化（アクセント除去・記号除去・空白→ハイフン）
export function slugify(raw: string): string {
  return raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")       // アクセント除去
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")           // 非英数をハイフン化
    .replace(/^-+|-+$/g, "");              // 先頭末尾ハイフン削除
}

// ハイフンでもスペースでも同じ扱いにして比較しやすくする
export function compact(s: string): string {
  return slugify(s).replace(/-/g, "");
}

