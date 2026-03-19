# スレッド一覧・スレッド詳細のURLとテスト用スレッド作成

## ルーティング構造（Next.js App Router）

| パス | 説明 |
|------|------|
| `/board` | 掲示板トップ（チーム未指定時） |
| `/board/[team]` | **スレッド一覧**（そのチームの掲示板） |
| `/board/[team]/thread/[threadId]` | **スレッド詳細**（個別スレッド） |

- **`[team]`**: チームID（数字）。例: `57`（マンチェスター・シティ）、`64`（リバプール）
- **`[threadId]`**: スレッドID（数字）

---

## ローカル開発環境で開くURL

開発サーバー起動後（`npm run dev`）、次のURLで確認できます。

### スレッド一覧（チーム別掲示板）

```
http://localhost:3000/board/57
```

- `57` の部分を任意のチームIDに変えられます（例: `64`, `65`, `86`）。
- そのチームに紐づくスレッド一覧が表示されます。

### スレッド詳細（個別スレッド）

```
http://localhost:3000/board/57/thread/1
```

- `57`: チームID  
- `1`: スレッドID（DB のスレッドの `id`）
- 試合前/試合中スレ（PRE_MATCH / LIVE_MATCH）なら「戦術ボードを投稿」または「ライブ戦術メモを投稿」ボタンが表示されます。

### その他

- 掲示板トップ: `http://localhost:3000/board`
- スタメンビルダー: `http://localhost:3000/lineup-builder`

---

## テスト用に1本スレッドを作成する方法

DB が空で一覧に何も出ない場合、次のいずれかでテスト用スレッドを作れます。

### 方法1: API で作成（curl）

**試合前スレ（PRE_MATCH）の例**

```bash
curl -X POST http://localhost:3000/api/threads ^
  -H "Content-Type: application/json" ^
  -d "{\"teamId\": 57, \"title\": \"【試合1時間前】テスト vs 相手｜予想スタメン\", \"body\": \"テスト用スレッドです。\", \"threadType\": \"PRE_MATCH\"}"
```

**試合中スレ（LIVE_MATCH）の例**

```bash
curl -X POST http://localhost:3000/api/threads ^
  -H "Content-Type: application/json" ^
  -d "{\"teamId\": 57, \"title\": \"【後半作戦会議】テスト vs 相手\", \"body\": \"ライブメモ用テスト\", \"threadType\": \"LIVE_MATCH\"}"
```

- Windows の PowerShell では `^` をやめて 1 行で書くか、バッククォートで改行できます。
- レスポンスの `id` がスレッドIDです。詳細URLは `http://localhost:3000/board/57/thread/<id>` です。

### 方法2: Prisma Studio で作成

```bash
npx prisma studio
```

1. `スレッド` テーブルを開く  
2. 「Add record」で 1 件追加  
   - `teamId`: 57（任意の数字）  
   - `title`: 任意  
   - `body`: 任意  
   - `threadType`: `PRE_MATCH` または `LIVE_MATCH`（試合スレで確認したい場合）  
3. 保存後、一覧は `http://localhost:3000/board/57`、詳細は `http://localhost:3000/board/57/thread/<id>` で確認

### 方法3: 自動生成（cron）で作成

- 環境変数 `FOOTBALL_DATA_API_KEY` と `FOOTBALL_TARGET_COMPETITIONS` を設定し、  
  `GET http://localhost:3000/api/cron/auto-match-threads?secret=<CRON_SECRET>` を実行すると、  
  キックオフ 60 分前〜50 分前の試合がある場合に「試合1時間前」スレッド（PRE_MATCH）が自動作成されます。
- 作成されたスレッドは、該当する `teamId` の掲示板（`/board/<teamId>`）に表示されます。

---

## まとめ

| 確認したいもの | URL（ローカル例） |
|----------------|-------------------|
| スレッド一覧 | `http://localhost:3000/board/57` |
| スレッド詳細 | `http://localhost:3000/board/57/thread/1` |
| 試合スレ（PRE_MATCH/LIVE_MATCH）の戦術ボード | 上記詳細ページで「戦術ボードを投稿」等のボタンから |

テスト用スレッドは、API の `threadType: "PRE_MATCH"` / `"LIVE_MATCH"` 指定、Prisma Studio、または cron のいずれかで作成できます。
