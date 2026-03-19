# 試合1時間前 自動スレッド生成

football-data.org API を使い、対象大会・対象チームの試合について**試合開始1時間前**に自動でスレッドを作成する機能です。

## 環境変数

| 変数名 | 説明 |
|--------|------|
| `FOOTBALL_DATA_API_KEY` | [football-data.org](https://www.football-data.org/client/register) で取得した API キー。認証は `X-Auth-Token` ヘッダで行う。 |
| `FOOTBALL_DATA_BASE_URL` | API ベース URL（未指定時は `https://api.football-data.org/v4`） |
| `FOOTBALL_TARGET_COMPETITIONS` | 対象大会コードのカンマ区切り。例: `PL,PD,BL1,SA,FL1,CL`（PL=プレミアリーグ, PD=ラリーガ, BL1=ブンデス, SA=セリエA, FL1=リーグアン, CL=チャンピオンズリーグ） |
| `CRON_SECRET` | cron エンドポイント保護用。`Authorization: Bearer <value>` または `X-Cron-Secret` ヘッダ、または query `?secret=<value>` で照合。 |

## football-data.org API キーの設定方法

1. [football-data.org](https://www.football-data.org/client/register) でアカウント登録
2. 発行された API キーを `.env.local` に `FOOTBALL_DATA_API_KEY=...` で設定
3. 無料枠ではリクエスト数に制限があるため、cron は必要最小限（例: 5分おき）にすること

## 対象大会コードの変更方法

`.env` または `.env.local` の `FOOTBALL_TARGET_COMPETITIONS` を編集する。

例:

- プレミアリーグのみ: `FOOTBALL_TARGET_COMPETITIONS=PL`
- 複数大会: `FOOTBALL_TARGET_COMPETITIONS=PL,PD,BL1,SA,FL1,CL`

将来的に対象チーム ID で絞り込む拡張をしやすい形で実装済みです。

## Cron の設定方法

### Vercel Cron（推奨）

`vercel.json` に cron を追加し、5分おきにエンドポイントを叩く例:

```json
{
  "crons": [
    {
      "path": "/api/cron/auto-match-threads",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

Vercel の Cron は GET で呼ばれるため、`CRON_SECRET` を Vercel の「Cron Secret」として設定するか、パスに含めない（ヘッダで渡す）運用にしてください。Vercel が自動付与する認証を使う場合は、本番では query に secret を付けず、Vercel の Cron 認証に任せられます。

手動・外部 cron の例:

```bash
# 5分おきに叩く例（secret は query で渡す場合）
curl "https://your-app.vercel.app/api/cron/auto-match-threads?secret=YOUR_CRON_SECRET"
```

## 重複作成防止の仕組み

- テーブル `AutoThreadJob` に「football-data.org の試合 ID」（`externalMatchId`）を unique で保存
- スレッド作成前に既に同じ `externalMatchId` が存在する場合は**スキップ**
- 作成成功時は `status=CREATED` と `threadId` を保存し、失敗時は `status=FAILED` で記録（再実行時もスキップ対象になる）

## 判定ウィンドウ

- キックオフ**60分前〜50分前**の間に cron が実行された試合だけを対象にする
- これにより、cron が 5 分おきなど数分単位でも取りこぼしにくい

## 予想スタメン・スコア予想について（今回の範囲）

- 現時点では**ダミー文言**です（「この欄は後で自動予想ロジックを実装予定」）
- 後から以下を実装する想定:
  - 直近先発履歴から予想スタメン
  - 直近成績からスコア予想
  - 対象チーム ID による絞り込み

## 今後の拡張案

- **直近先発履歴から予想スタメン**: football-data.org の lineup 等を利用してスタメン予想を自動生成
- **直近成績からスコア予想**: 既存の `predict` ロジックや Poisson モデルを組み合わせてスコア予想を本文に挿入
- **対象チーム絞り込み**: `FOOTBALL_TARGET_TEAM_IDS` のような env を追加し、指定チームの試合のみスレッド作成
