# localhost:3000 で確認できるページURL

## 1. トップページ

```
http://localhost:3000/
```

## 2. 掲示板

**掲示板トップ（チーム未選択）**
```
http://localhost:3000/board
```

**掲示板一覧（チーム 57 のスレッド一覧）**
```
http://localhost:3000/board/57
```
※ 57 はチームID（例: マンチェスター・シティ）。64, 65 など別の数字でも可。

## 3. スレッド詳細

```
http://localhost:3000/board/57/thread/5
```
※ `57` = チームID、`5` = スレッドID

## 4. PRE_MATCH スレッド（戦術ボード投稿可能）

テスト用に 1 件作成済みです。

```
http://localhost:3000/board/57/thread/5
```

このページで「戦術ボードを投稿」ボタンと「試合前の狙いどころや配置予想を書き込む」が表示されます。

---

## その他の便利なURL

| ページ | URL |
|--------|-----|
| スタメンビルダー | http://localhost:3000/lineup-builder |
| 検索 | http://localhost:3000/search |
| リーグ一覧 | http://localhost:3000/leagues |
