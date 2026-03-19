# 試合1時間前 自動スレッド生成 — セットアップ手順

## 変更ファイル一覧

| 種別 | パス |
|------|------|
| 環境例 | `.env.example` |
| Prisma | `prisma/schema.prisma` |
| マイグレーション | `prisma/migrations/20260314000000_add_auto_thread_job/migration.sql` |
| API クライアント | `app/lib/footballData.ts` |
| 自動作成ロジック | `app/lib/autoCreateMatchThreads.ts` |
| 掲示板 API | `app/lib/boardApi.ts`（`createThread` に `threadType` 引数追加） |
| Cron ルート | `app/api/cron/auto-match-threads/route.ts` |
| Vercel | `vercel.json`（cron スケジュール追加） |
| ドキュメント | `docs/AUTO_MATCH_THREADS.md`、`README.md`（追記） |

## セットアップ手順

### 1. 環境変数

`.env.local` に以下を設定（または既存の `.env` に追記）。

```env
FOOTBALL_DATA_API_KEY=あなたのAPIキー
FOOTBALL_DATA_BASE_URL=https://api.football-data.org/v4
FOOTBALL_TARGET_COMPETITIONS=PL,PD,BL1,SA,FL1,CL
CRON_SECRET=任意の秘密文字列
```

- API キー: [football-data.org](https://www.football-data.org/client/register) で取得
- 既存の `FD_BASE` / `FOOTBALL_DATA_API_KEY` がある場合は同じ値で可

### 2. マイグレーション実行

**注意:** このプロジェクトの `migration_lock.toml` は現在 `sqlite` のままです。本番が PostgreSQL の場合は、必要に応じて以下を検討してください。

- 新規に PostgreSQL で運用する場合: `migration_lock.toml` の `provider` を `postgresql` に変更してから `npx prisma migrate dev` を実行
- 既存の PostgreSQL DB に手動でテーブルを足す場合:  
  `prisma/migrations/20260314000000_add_auto_thread_job/migration.sql` をそのまま実行

```bash
cd gegenpress-web
npx prisma migrate dev --name add_auto_thread_job
# または（DB が PostgreSQL で lock を変更している場合）
npx prisma db execute --file prisma/migrations/20260314000000_add_auto_thread_job/migration.sql
```

その後、クライアント生成:

```bash
npx prisma generate
```

### 3. 動作確認

- 開発サーバー起動: `npm run dev`
- cron エンドポイント（認証付き）:
  - `GET http://localhost:3000/api/cron/auto-match-threads?secret=YOUR_CRON_SECRET`
- レスポンス例: `{ "createdCount": 0, "skippedCount": 0, "failedCount": 0, "matches": [] }`

### 4. Vercel での Cron

- `vercel.json` に 5 分ごとの cron を追加済みです
- Vercel の「Cron Secret」または環境変数 `CRON_SECRET` を設定し、認証方式に合わせてください

## 補足

- スレッドは「ホームチーム」の `teamId`（football-data.org の home team id）の板に作成されます
- 重複防止は `AutoThreadJob.externalMatchId`（試合 ID）の unique で行っています
- 予想スタメン・スコア予想は現状ダミー文言です（後で自前ロジックを実装予定）
