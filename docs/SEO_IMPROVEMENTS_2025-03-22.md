# 検索結果・SEO 改善サマリー

**実施日**: 2025-03-22

---

## 修正ファイル一覧

| ファイル | 変更内容 |
|----------|----------|
| `app/lib/publicSiteUrl.ts` | `getSiteUrl()` を追加。SITE_URL / NEXT_PUBLIC_SITE_URL を優先し、VERCEL_URL は本番のみフォールバック |
| `app/layout.tsx` | `metadataBase` を `getSiteUrl()` に変更。title / description / OGP を改善 |
| `app/page.tsx` | title / description 改善。`alternates.canonical` を追加 |
| `app/board/[team]/page.tsx` | description 改善。`alternates.canonical` を追加 |
| `app/board/[team]/thread/[threadId]/page.tsx` | description 改善。`alternates.canonical` を追加 |
| `app/sitemap.ts` | `getSiteUrl()` を使用。deleted thread 除外は既に実施済み |
| `app/robots.ts` | `getSiteUrl()` を使用 |
| `.env.example` | SITE_URL の説明を更新。gegenpress.app をデフォルト例に |

---

## 改善前の SEO 上の問題点

1. **URL の不安定さ**
   - `metadataBase` / sitemap / robots が `VERCEL_URL` をフォールバックに使用
   - プレビューデプロイ時、検索結果や OGP が仮 URL（`*-xxx.vercel.app`）を指す可能性があった

2. **title / description**
   - 「海外サッカー掲示板翻訳」の要素が弱い
   - 誰向けのサイトか（日本人ファン向け）が曖昧
   - 掲示板と試合予想の両立が伝わりづらい

3. **canonical**
   - 明示的な canonical が設定されておらず、プレビュー URL が正規 URL として扱われるリスク

4. **sitemap**
   - 論理削除済みスレッドを除外するよう修正済み（前回対応）

---

## 改善後の title / description 案（適用済み）

### ホーム（/）
- **title**: `Gegenpress｜海外サッカー掲示板・翻訳付き・試合予想`（約29文字）
- **description**: `海外サッカーの翻訳付き掲示板。プレミアリーグ・ラリーガなど各クラブの英語ファンコメントを翻訳で読め、試合予想や戦術議論も楽しめます。海外サッカーが好きな日本人ファン向けのコミュニティサイト。`（約95文字）

### レイアウト（デフォルト）
- **title**: `Gegenpress｜海外サッカー掲示板・翻訳付き・試合予想`
- **description**: `海外サッカーの翻訳付き掲示板。プレミアリーグ・ラリーガなど各クラブの英語ファンコメントを翻訳で読め、試合予想や戦術議論も。海外サッカー好きの日本人ファン向け。`（約70文字）

### 掲示板（/board/[team]）
- **description**: `{チーム名}の海外サッカー掲示板。英語ファンコメントを翻訳付きで読め、試合予想や戦術議論も。`

### スレッド（/board/[team]/thread/[threadId]）
- **title**: `{スレッドタイトル} | {チーム名}掲示板`
- **description**: スレッド本文の冒頭 120 文字、または掲示板説明

---

## 文字数について

- **title**: 約 30〜60 文字推奨（Google で約 60 文字まで表示）
- **description**: 約 120〜155 文字推奨（Google で約 155 文字まで表示）

上記案はその範囲内で、検索結果での途中切れを抑えています。

---

## 本番デプロイ時の設定

`.env` に以下を設定してください。

```
SITE_URL="https://gegenpress.app"
```

カスタムドメインを使用する場合は、その URL に変更してください。
