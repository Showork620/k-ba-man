# k-ba-man site prototype

`index.html` をブラウザで開くと、k-ba-man のキャラクター紹介・暫定ランキング・成績履歴を確認できます。

## Pages

- `#/overview`: メディア全体のトップ。暫定首位、累計収支、キャラクター導線を表示。
- `#/ranking`: 現在誰の成績がいいかを、暫定席次 / Brier / ◎結果 / LogLoss で並び替え。
- `#/characters`: 10人のキャラクター一覧。
- `#/characters/:id`: キャラクターごとの紹介と成績履歴。
- `#/races`: 全体のレース履歴と専門家別スコア。

## Data sources

現状は静的プロトタイプとして `app.js` にデータを集約しています。

- キャラクター設定: `docs/worldbuilding/yosouya-10/characters/`
- 第1回ライブ運用: `runs/202609030411/report-v1.md`
- 採点カード: `data/scoring/202609030411.json`
- キャラクター画像: `assets/characters/`（site・slides 共通リソース）

レースが増えたら、`RACES` に採点カード由来の行を追加するだけでランキングと個別履歴が伸びます。
