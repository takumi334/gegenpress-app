# Vercel デプロイとスマホ表示が更新されないときの確認手順

## 1. ローカル変更が commit / push 済みか確認する手順

### 1-1. 未コミット・未プッシュの有無を確認

```bash
# 現在のブランチとリモートとの差分
git status
git log origin/main --oneline -3   # 例: main の場合
git log HEAD --oneline -3

# ローカルにあってリモートにないコミット（未 push）があるか
git log origin/main..HEAD --oneline

# 未コミットの変更があるか（Working tree / index）
git status --short
```

- **`git status`** で `nothing to commit, working tree clean` かつ  
  **`git log origin/main..HEAD --oneline`** が何も出なければ、**push 済み**です。
- 変更がある場合は `git add` → `git commit` → `git push` してから Vercel を確認します。

### 1-2. プッシュまで一気にやる例

```bash
git add -A
git status
git commit -m "fix: スマホ表示の更新など"
git push origin main
```

---

## 2. Vercel で「最新コミット」がデプロイされているか確認する方法

### 2-1. Deployments 画面の開き方

1. [Vercel Dashboard](https://vercel.com/dashboard) にログイン
2. 対象プロジェクト（例: gegenpress-web）をクリック
3. 上部タブの **「Deployments」** をクリック

### 2-2. 一覧の見方

- **一番上**が直近のデプロイです。
- 各デプロイ行に次のような情報が出ます：
  - **Commit**: コミットメッセージ（クリックで GitHub の該当コミットへ）
  - **Branch**: どのブランチからか（例: `main`, `develop`）
  - **Status**: Building → Ready（緑） or Error（赤）
  - **Type**: **Production** か **Preview** のどちらか

### 2-3. Production と Preview の見分け

| Type        | いつ作られるか           | どの URL で見えるか              |
|------------|---------------------------|----------------------------------|
| **Production** | `main` など本番ブランチへの push | `https://xxxx.vercel.app`（本番ドメイン） |
| **Preview**    | それ以外のブランチや PR の push  | そのデプロイ専用の URL（例: `xxx-xxx.vercel.app`） |

- 本番のスマホ表示を確認したいなら、**Production** の一番上のデプロイが「最新コミット」かどうかを見ます。
- 該当デプロイの **Commit** をクリックし、GitHub 上のコミットが「今 push したあのコミット」と一致しているか確認します。

### 2-4. 本番が古いままの場合

- **Redeploy**: 該当デプロイの ⋮ → **Redeploy** で同じコミットを再ビルドできます。
- キャッシュを外して再ビルドしたい場合は **Redeploy** 時に **Clear Cache and Redeploy** を選びます。

---

## 3. スマホ側のキャッシュ / PWA / Service Worker を消す（Android Chrome）

「Vercel は最新なのにスマホだけ古い」ときは、端末側のキャッシュや PWA・Service Worker の可能性があります。

### 3-1. サイトのデータだけ削除（推奨・まずここ）

1. Android で **Chrome** を開く
2. アドレスバーに **`https://xxxx.vercel.app`** を表示した状態にする
3. アドレスバー左の **鍵マーク（またはアイコン）** をタップ
4. **「サイトの設定」**（または「サイト情報」）をタップ
5. **「保存されているデータを削除」** または **「データを削除」** をタップ
6. 確認で **「データを削除」** を選ぶ
7. 該当タブを閉じて、再度 `https://xxxx.vercel.app` を開く

これでそのサイトのキャッシュ・Cookie・Storage が消え、Service Worker も「未登録」になります。

### 3-2. Service Worker を個別に確認・削除する

1. Chrome で **`https://xxxx.vercel.app`** を開く
2. アドレスバーに **`chrome://serviceworker-internals/`** と入力して開く
3. 一覧から **`xxxx.vercel.app`** を探す
4. 該当行の **「Unregister」** をタップして削除
5. サイトタブに戻り、**更新**（スワイプでリロード）する

### 3-3. 「ホームに追加」した PWA をやめる場合

1. ホーム画面の **アプリアイコン（PWA）** を長押し
2. **「アプリ情報」** または **「削除」** を選ぶ
3. **「アンインストール」** または **「削除」** で削除
4. 以降は Chrome で **通常の URL**（`https://xxxx.vercel.app`）を開いて利用

### 3-4. Chrome 全体のキャッシュを削除（最終手段）

1. Chrome の **⋮** → **「設定」**
2. **「プライバシーとセキュリティ」** → **「閲覧履歴データを削除」**
3. **期間** を「全期間」に
4. **「キャッシュされた画像とファイル」** にチェック（Cookie 等は必要に応じて）
5. **「データを削除」** を実行

---

## 4. キャッシュ回避：URL に `?v=timestamp` を付けて確認する

デプロイは最新なのに「古いアセット」が返っている可能性があるときの確認用です。

- 例:  
  `https://xxxx.vercel.app/`  
  →  
  `https://xxxx.vercel.app/?v=1730123456`

クエリが変わると多くの CDN/ブラウザは別リソースとして扱うため、キャッシュを避けて最新を取れます。

- **運用での案**: ビルドごとにバージョンやタイムスタンプを埋め込み、重要な静的アセットや HTML の参照に `?v=ビルドID` を付ける方法もあります（Next.js では `assetPrefix` やビルド ID を利用可能）。

---

## 5. next-pwa 等で Service Worker を使っている場合の対応

**このプロジェクトでは現在 next-pwa や Service Worker は使っていません**（`package.json` に next-pwa なし、sw 系ファイルなし）。

今後 **next-pwa** 等を入れた場合の目安です。

### 5-1. 無効化（開発・確認用）

- 環境変数で PWA をオフにする（例: `NEXT_PUBLIC_DISABLE_PWA=1`）  
  または
- `next.config.js` の PWA 設定をコメントアウトしてビルドし直す  
→ SW が生成されず、キャッシュの影響を切り分けしやすくなります。

### 5-2. 更新を確実に当てる

- **skipWaiting / clients.claim** を有効にし、新しい SW がすぐに有効になるようにする。
- **キャッシュ名（workbox の precache 名）にバージョンやビルド ID を含める**と、ビルドごとに別キャッシュになり、古いキャッシュが残りにくくなります。

---

## チェックリスト（スマホ表示が更新されないとき）

1. [ ] `git status` と `git log origin/main..HEAD` で **commit / push 済み**か確認した
2. [ ] Vercel の **Deployments** で、本番（Production）の **一番上のデプロイ**がそのコミットか確認した
3. [ ] Android Chrome で **「サイトの設定」→「保存されているデータを削除」** を試した
4. [ ] 必要なら **`chrome://serviceworker-internals/`** で該当 SW を Unregister した
5. [ ] 確認用に **`?v=timestamp`** 付き URL で開いて最新が出るか見た

これでも直らない場合は、Vercel の **Redeploy（Clear Cache and Redeploy）** と、別ネットワーク（例: スマホの Wi‑Fi を切って LTE）でのアクセスも試すと原因の切り分けに役立ちます。
