// 既存の items 正規化の直後に入れる
items = items
  .map(s => (s ?? "").trim())
  .filter(Boolean)
  // 広告/サイズ系のゴミを除外
  .filter(s =>
    !/^ad(\s|$)/i.test(s) &&         // "Ad", "ad "
    !/広告|sponsored/i.test(s) &&    // 日本語の広告や sponsored
    !/\b\d{2,4}\s*x\s*\d{2,4}\b/i.test(s) // 300x250, 728x90 など
  );

// 重複排除
items = Array.from(new Set(items));

// 量が多いと遅いので上限（UI固定文や見出しなら十分）
const MAX = 50;
if (items.length > MAX) items = items.slice(0, MAX);

// 何も残らなければ空配列で即返す（UIをブロックしない）
if (items.length === 0) {
  return NextResponse.json({ translations: [] }, { status: 200 });
}

