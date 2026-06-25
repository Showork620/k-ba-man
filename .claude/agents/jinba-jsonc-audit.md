# jinba JSONC 監査レポート

対象: `jinba-*.jsonc` 10ファイル / 4エージェント並列監査 / 2026-06-26

## サマリー

| 重要度 | 件数 |
|---|---|
| 問題なし | 18 |
| 要確認 | 7 |
| 問題あり | 2 |

---

## 1. 構造一貫性 — Pass

### 問題なし

- 全10ファイルが同一の10トップレベルキーを保持
- fetch_items 内オブジェクトが `id, priority, data, source_candidates, use_for` で統一
- priority 値は `high` / `medium` / `low` のみ
- JSONC コメント除去後、全ファイル valid JSON
- 全キー snake_case 統一

### 要確認: fetch_items 数のばらつき

hina・makoto は3アイテム、他8人は4アイテム。穴党・統計派は取得範囲が狭いため意図的と思われるが、確認の余地あり。

### 要確認: goro の disallowed が5項目

他の9人は4項目だが、goro のみ `当日オッズ（pack-v2-baba には混ぜない）` が追加（L70）。馬場専門家としてオッズ混入を防ぐ意図と読めるが、他の非オッズ系にも同項目を検討すべきか。

---

## 2. app.js CHARACTERS との整合性 — 2件不一致

### 問題なし

10人全員の `expert_id` と `expert_name` が CHARACTERS 配列と完全一致。ファイル名 `jinba-{id}.jsonc` と `"agent"` 値も整合。

### 問題あり: school の表記ずれ（JSONC ↔ app.js）

| キャラ | JSONC | app.js |
|---|---|---|
| misaki | `展開・ペース` | `展開・ペース読み` |
| goro | `馬場・トラックバイアス` | `馬場読み・トラックバイアス` |

JSONC では「読み」が省略されている。どちらかに統一が必要。

---

## 3. .md システムプロンプトとの整合性 — 要確認

### 要確認: school の三層命名

JSONC・app.js・.md 出力固定値でそれぞれ異なる school 名が使われている。

| キャラ | JSONC | app.js | .md 出力固定値 |
|---|---|---|---|
| tatsunosuke | `血統・配合` | `血統・配合` | `血統` |
| misaki | `展開・ペース` | `展開・ペース読み` | `展開` |
| kenta | `スピード指数` | `スピード指数` | `指数` |
| sakura | `オッズ・市場分析` | `オッズ・市場分析` | `オッズ` |
| aoi | `騎手・厩舎` | `騎手・厩舎` | `騎手` |
| goro | `馬場・トラックバイアス` | `馬場読み・トラックバイアス` | `馬場` |

`expert-output.schema.json` の `school` にどの名前が入るべきか規約が未定義。意図的な二層構造（表示名 vs 出力ラベル）なら明文化が望ましい。

### 問題なし

- fetch_items ↔ .md 分析指示: 矛盾なし（JSONC は「何を取得するか」、.md は「どう分析するか」で分業）
- CLI バックエンド .sh ファイル: `jinba-hina-gemini.sh`, `jinba-makoto-codex.sh`, `jinba-teppei-codex.sh`, `jinba-yuko-gemini.sh` — 全4種存在・実行権限あり

### 要確認: timing は JSONC にのみ存在

実行タイミング（T-1日夜 / 発走3時間前 / 当日朝）は JSONC でのみ管理。.md には明記なし。オーケストレーターが JSONC を参照する設計なら問題ないが、.md 側にも記載があると明確。

---

## 4. 内容品質・責務分離 — 競合あり

### 問題あり: write_to_pack_or_notes の書き込み競合

| パスキー | 書き込むエージェント | 対応案 |
|---|---|---|
| `horses[].odds` | sakura, yuko | sakura を正、yuko を read-only に |
| `horses[].past_races` | 7人 | 取得担当を1人に絞る |
| `track_bias.this_week_observations` | goro, misaki | goro を正、misaki はサブキーで分離 |

マージルール未定義のまま同一キーに複数エージェントが書き込む設計。pack 統合時にデータ競合が起きる。

### 要確認: データ重複取得（fetch の無駄）

オッズを3人（sakura, hina, yuko）、過去走を7人が各自取得。視点は異なるが raw データは同一ソース。pack への事前取得→参照に一本化すれば fetch コスト削減。

### 問題なし

- school ↔ fetch_items 整合性: 全10人が自分の専門分野に合ったデータのみを取得。越境なし
- source_candidates: JRA公式、netkeiba、JBISサーチ、気象庁、tenki.jp 等。全て実在サービス
- disallowed 共通ルール: 「他の jinba/haibun の出力禁止」「data/experts/ 禁止」が全10ファイルに存在
