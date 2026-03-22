# 主要機能総点検レポート

**実施日**: 2025-03-22  
**対象**: 翻訳・予想・差別用語防止・Like・通報削除

---

## 【総評】

| 項目 | 評価 |
|------|------|
| **本番投入前の危険度** | **中**（致命的な不具合はなし。軽微〜中程度の要修正あり） |
| **重大** | 0 件 |
| **中** | 2 件 |
| **軽微** | 4 件 |

**Build**: ✅ 成功（npm run build）

---

## 【機能別判定】

### 1. 翻訳節約型

| 項目 | 判定 |
|------|------|
| **総合** | **OK** |

**根拠**:
- ページ表示時に自動翻訳しない（`AutoTranslateOnLoad` は `return null` で廃止済み）
- 「翻訳する」押下時のみ API 呼び出し（`translationTrigger === 0` のときは API を呼ばない）
- 同じテキストはキャッシュ優先（L1 メモリ KV → L2 DB → L3 Google API の順）
- まとめ翻訳（`q: [texts]` で配列一括送信、1 行ずつではない）
- `PostTranslationSelect` / `PageI18nTranslateButton` がクリック時のみ実行
- `view.tsx` / `ThreadList.tsx` ともに `translationTrigger > 0` のときのみ fetch

**問題**:
- **軽微**: Google Translate API 無効時、`getGoogleKey()` が throw するが、route の try/catch で 400 を返す。表示時は翻訳 API を呼ばないためクラッシュしない。翻訳ボタン押下時は 400 で失敗するのみ。
- **軽微**: `ThreadList.tsx` に `console.log` が残っている（246, 284 行付近）。

**修正案**:
- 本番では `console.log` を削除または `process.env.NODE_ENV === 'development'` でガードする。

---

### 2. 予想 24 時間 TTL

| 項目 | 判定 |
|------|------|
| **総合** | **要修正** |

**根拠**:
- キャッシュフロー: OK → stale → live の順で取得、stale 時はバックグラウンド更新
- 429 時: `rateLimited: true` でフォールバック、200 + メッセージを返し即死しない
- EMPTY cache の扱い: `status: "EMPTY"` で正しく返却

**問題**:
- **中**: TTL デフォルトが **12 時間**。要望は 24 時間。`predictCacheService.ts` 16 行目: `?? 12`

```ts
const TTL_MS = Math.max(1, Number(process.env.PREDICT_CACHE_TTL_HOURS ?? 12)) * 3600 * 1000;
```

- `.env.example` のコメントも `"12"` のまま。

**修正案**:
- デフォルトを 24 に変更: `?? 24`
- `.env.example` を `PREDICT_CACHE_TTL_HOURS="24"` に更新

---

### 3. 差別用語防止

| 項目 | 判定 |
|------|------|
| **総合** | **OK** |

**根拠**:
- スレッド作成: `app/api/threads/route.ts` で `containsBannedWordsInFields([title, bodyText, displayName])` および `tacticPayload` をチェック
- リプライ作成: `app/api/threads/[threadId]/posts/route.ts` および `app/api/posts/route.ts` で同様にチェック
- 戦術ボード: `tactics-boards` の POST/PATCH でも `containsBannedWords` 使用
- サーバー側で拒否し、`MODERATION_ERROR_MESSAGE` でエラー返却
- フロント（ReplyForm 等）は `j?.error` でメッセージを表示
- 禁止語辞書: `app/lib/moderation.ts` の `RAW_BANNED_PHRASES`、正規化後に部分一致

**問題**:
- 特になし。多言語投稿も正規化（NFKC, 小文字化, 記号除去等）により検出対象。

**修正案**:
- 運用に応じて禁止語を追加する方針で問題なし。

---

### 4. Like

| 項目 | 判定 |
|------|------|
| **総合** | **OK** |

**根拠**:
- スレッド Like: `BoardLikeToggle kind="thread"` → `/api/threads/[threadId]/likes`
- リプライ Like: `CommentLikeButton` → `BoardLikeToggle kind="post"` → `/api/comments/[commentId]/like`
- anonId による二重防止（同一 anonId で 1 件のみ）
- optimistic update 実装済み（クリック時即時反映、失敗時にロールバック）
- 一覧: `ThreadList` で `BoardLikeToggle`、`listThreads` の `threadLikeCount` / `threadLikedByMe` を利用
- 詳細: `view.tsx` で `BoardLikeToggle` / `CommentLikeButton`、`threadLikeCount` / `likeCount` を利用
- 再読込時: anonId 付きで `/api/threads` を再取得し `threadLikedByMe` をマージ

**問題**:
- 特になし。旧 `LikeButton` は削除済みで、`BoardLikeToggle` に統一されている。

**修正案**:
- 現状のままで問題なし。

---

### 5. 通報削除

| 項目 | 判定 |
|------|------|
| **総合** | **要修正（軽微）** |

**根拠**:
- 通報: `ReportButton` → POST `/api/report`（kind, targetId, reason, detail, pageUrl, teamId）
- 管理画面: `/admin/reports` で一覧表示（thread/post の targetId, reason 等）
- 削除: `DeleteThreadButton` が `DELETE /api/admin/thread/[id]` を `x-admin-key` で呼び出し
- 論理削除: `thread.update({ data: { deletedAt: new Date() } })`
- 一覧: `listThreads` で `where: { teamId, deletedAt: null }`
- 詳細: `GET /api/threads/[threadId]` で `deletedAt` があれば 404
- 認証: `requireAdminApiKey` で `x-admin-key` と `ADMIN_KEY` を照合
- メール URL: `buildReportEmailContext` → `getPublicSiteOrigin()`。localhost は空にしてメールに載せない。

**問題**:
- **中**: `sitemap.ts` が `deletedAt: null` でフィルタしていない。論理削除されたスレッドが sitemap に含まれる可能性あり。

```ts
// app/sitemap.ts 41-45 行
const threads = await prisma.thread.findMany({
  select: { id: true, teamId: true, createdAt: true },
  orderBy: { createdAt: "desc" },
  take: 2000,
  // where: { deletedAt: null } が無い
});
```

**修正案**:
- `where: { deletedAt: null }` を追加する。

---

## 【要修正ファイル一覧】

| ファイル | 問題 |
|----------|------|
| `app/lib/predictCacheService.ts` | TTL デフォルトが 12 時間。24 時間に変更すべき。 |
| `.env.example` | `PREDICT_CACHE_TTL_HOURS` のコメントを 24 に合わせる。 |
| `app/sitemap.ts` | 論理削除済みスレッドを sitemap から除外（`where: { deletedAt: null }`）。 |
| `app/board/components/ThreadList.tsx` | 本番用に `console.log` を削除 or 条件付きに。 |

---

## 【本番前に最低限直すべき TOP5】

1. **sitemap から deleted スレッドを除外**  
   論理削除済みの URL が sitemap に載ると SEO・UX 上問題になるため。

2. **予想 TTL を 24 時間に変更**  
   要望仕様との整合性のため。`PREDICT_CACHE_TTL_HOURS` のデフォルトを 24 に。

3. **ThreadList の console.log 削除**  
   本番ログのノイズ防止のため。

4. **.env.example の PREDICT_CACHE_TTL を 24 に更新**  
   デプロイ時の設定ミスを防ぐため。

5. **ADMIN_KEY の本番設定確認**  
   `/admin/reports` からの削除に必要。本番で適切に設定されているか確認する。

---

## 【localhost 直書き・古い URL の扱い】

| 場所 | 内容 | 評価 |
|------|------|------|
| `app/sitemap.ts` | `getBaseUrl()` で NEXT_PUBLIC_SITE_URL / VERCEL_URL 未設定時に `localhost:3000` | 開発用フォールバック。本番では VERCEL_URL が設定されるため問題なし。 |
| `app/robots.ts` | 同上 | 同上。 |
| `app/layout.tsx` | metadataBase 用の `getBaseUrl()` | 同上。 |
| `app/board/[team]/page.tsx` | `hdr.get("host") ?? "localhost:3000"` | fetchNews / fetchVideos の内部 URL 用。開発環境では妥当。 |
| `app/lib/publicSiteUrl.ts` | localhost を空にする処理 | メール内 URL に localhost を載せない意図通り。 |

---

## 【補足】

- **翻訳**: `translate-client.ts` は主に PostEditor 等で使用。掲示板本文の翻訳は `PostTranslationSelect` / `PageI18nTranslateButton` 経由でまとめ翻訳されている。
- **予想**: `next-fixture` は FD API を直接呼ぶが、predict 部分は `getPredictJsonForTeam`（キャッシュ経由）を使用。
- **通報削除**: メール経由の `/admin/mod/delete?token=...` と、管理画面の DeleteThreadButton（`/api/admin/thread/[id]`）の 2 経路がある。前者は署名トークン、後者は ADMIN_KEY。いずれも論理削除を行う。
