# 試合予想キャッシュと football-data.org レート制限

## 呼び出し箇所（実装後）

| 経路 | 外部 FD 呼び出し |
|------|------------------|
| `GET /api/predict?teamId=` | キャッシュヒット時 **0 回**。ミス／期限切れで **最大 1 回の再計算**（内部で約 4〜5 リクエスト） |
| `GET /api/next-fixture?teamId=` | 次の試合 1 件取得 **1 回** ＋ 上記 `getPredictJsonForTeam(teamId)`（キャッシュ次第） |
| 掲示板 SSR `app/board/[team]/page.tsx` | `getPredictJsonForTeam` のみ（自己 HTTP ループなし） |
| `POST /api/cron/create-scheduled` | `getPredictJsonForTeam` のみ |
| `PredictBox` クライアント | SSR でデータがあれば **フェッチしない** |

## 1 ページ表示あたりの API 呼び出し（以前 vs 現在）

- **以前**: 掲示板 1 回表示で SSR が `/api/predict` を叩き、その中で FD に **約 4〜5 回**／クライアント `PredictBox` が再度叩くと **さらに同程度**の可能性。
- **現在**: 同一 `teamId` は **DB キャッシュが有効な間は FD 0**。期限切れ後の **最初の 1 リクエスト**が再計算（約 4〜5 回）し、**stale 返却時はバックグラウンド更新をスケジュール**（サーバレスでは完了しない場合あり）。

## API 上限の確認先

- **football-data.org**: アカウントダッシュボードのプラン説明（無料枠は **1 日あたりのリクエスト数**と対象コンペティションに制限あり。数値はプラン変更で変わるため **常に公式サイトを確認**）。
- 参考: [football-data.org documentation / client area](https://www.football-data.org/)

## 更新頻度の目安（逆算）

- 1 回のフル再計算 ≒ **FD 4〜5 リクエスト**と仮定。
- 無料枠が **100 リクエスト/日** の場合: `100 ÷ 5 = 20` チームまで「1 日 1 回フル更新」程度が上限イメージ。
- **12 時間 TTL**（デフォルト）→ 理論上はチームごとに 1 日 2 回まで再計算の余地があるため、**チーム数 × 2 × 5** が日次コールに近づく。**ユニークチームが多いサイトでは TTL を 24h に延ばす**と安全。
- 環境変数 `PREDICT_CACHE_TTL_HOURS` で調整可能。

## Vercel Hobby と cron

- **Hobby は Cron が使えない**（または制限が厳しい）ため、本実装は **cron に依存せず**、キャッシュ期限と **読み取り時の stale + 非同期更新**で運用する。
- `vercel.json` の crons は空のままでよい。

## 429 時のフォールバック

1. **再試行しない**（`computeTeamPredict` は 1 系統の fetch のみ）。
2. **有効な過去キャッシュ（OK）があればそのまま返す**（`meta.source: "stale"`）。
3. **キャッシュが無い**場合は **200 + メッセージ**（画面を壊さない。「データ準備中」系）。

## DB テーブル

- `prediction_cache`（Prisma `PredictionCache`）  
  - `id`: `team:{teamId}`  
  - `payload`: 予想 JSON  
  - `fetchedAt` / `expiresAt` / `status`（`OK` | `EMPTY`）
