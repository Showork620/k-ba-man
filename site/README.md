# k-ba-man site prototype

`index.html` をブラウザで開くと、k-ba-man のキャラクター紹介・暫定ランキング・成績履歴を確認できます。

## Pages

- `#/overview`: メディア全体のトップ。暫定首位、累計収支、キャラクター導線を表示。
- `#/live`: 公開中のリアルタイムページ。`live-race.v1` の `active_phase` に応じて表示。
- `#/live/announce`: 数日前の次回対象レース発表。
- `#/live/predictions`: 当日朝の10人予想・集合知予想。
- `#/live/result`: レース後の答え合わせ。
- `#/ranking`: 現在誰の成績がいいかを、暫定席次 / Brier / ◎結果 / LogLoss で並び替え。
- `#/characters`: 10人のキャラクター一覧。
- `#/characters/:id`: キャラクターごとの紹介と成績履歴。各レースを開くと予想印と結果だけを確認できます。
- `#/races`: 全体のレース履歴、投資額、集合知MARKS/RESULT、買い目、払い戻し一覧。

## Data sources

現状は静的プロトタイプとして、レース履歴を `site/data/race-history.v1.*` にコピーしています。表示側は `site/api/race-history-api.js` の取得APIだけを参照します。根拠テキストや確率などの詳細データは保持しますが、サイト上のキャラ履歴ではMARKS/RESULT中心に絞って表示します。

リアルタイムページは `site/data/live-race.v1.*` が制御します。`current_race_id` は `race-history.v1` のレースを指し、`active_phase` を `announce` / `predictions` / `result` に変えるだけで `#/live` の表示段階が切り替わります。上部の状態フローは各フェーズの `short_title`、`next_phase`、`next_timing` を使います。各段階の直リンクは検証・共有用に常時表示できます。

- キャラクター設定: `docs/worldbuilding/yosouya-10/characters/`
- レース履歴スナップショット: `site/data/race-history.v1.json`
- ライブページ制御: `site/data/live-race.v1.json`
- データスキーマ: `site/data/race-history.schema.json`, `site/data/live-race.schema.json`
- データ取得API: `site/api/race-history-api.js`
- ライブページAPI: `site/api/live-race-api.js`
- 正本入力: `runs/<race_id>/pack-v1.json`, `runs/<race_id>/result.json`, `runs/<race_id>/predictions/v1/*.json`, `data/scoring/<race_id>.json`
- キャラクター画像: `assets/characters/`（site・slides 共通リソース）

レースが増えたら、`race-history.v1` スナップショットを更新します。将来DB化するときは `race-history-api.js` の取得元をDB/APIへ差し替え、画面側の呼び出しは維持します。

## UI policy

- 画面の高さを超える明細を、カード内の折りたたみトグルで展開しない。
- 長い結果ビュー、買い目、払い戻し一覧はモーダルまたは専用ビューで表示し、元ページのスクロール位置を保つ。
- 折りたたみUIは、MARKS/RESULTだけなど1画面内で収まる短い補足に限る。
