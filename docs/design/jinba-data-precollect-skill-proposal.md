# jinba 事前データ収集 Skill 作成案

作成日: 2026-06-26

対象: `.claude/agents/jinba-*.jsonc` 10ファイルを正本として読み、10人の予想専門家が走る前に `RaceDataPack` を半自動で作る Claude Code 用 Skill。

## 目的

現在の最大の手作業は `runs/<race_id>/pack-v1.json` / `pack-v2-odds.json` / `pack-v2-baba.json` の事前収集である。各 `jinba-*.jsonc` には「誰が何を必要とするか」「pack に正規書き込みしてよいキー」「参照だけに留めるキー」がすでに整理されているため、Skill はこれを読み、収集計画・pack 草案・欠損レポートを作る。

この Skill は予想をしない。専門家の独立性を壊さず、事実データだけを集める。

## 提案 Skill

- Skill 名: `jinba-pack-precollector`
- 配置: `.claude/skills/jinba-pack-precollector/`
- 主な呼び出し例:
  - 「次走の pack-v1 を作るため、jinba の JSONC から事前収集計画を出して」
  - 「このレースの `pack-v2-odds` を当日朝オッズで更新して」
  - 「発走3時間前用に `pack-v2-baba` を作って、吾郎・美咲・健太が見る馬場情報を揃えて」
  - 「pack の欠損を jsonc 基準で点検して」

### Frontmatter 案

```markdown
---
name: jinba-pack-precollector
description: k-ba-man の RaceDataPack を作成・更新するための事前データ収集 Skill。Use when Claude Code needs to create or audit `runs/<race_id>/pack-v1.json`, `pack-v2-odds.json`, or `pack-v2-baba.json` from `.claude/agents/jinba-*.jsonc`; collect factual horse racing data before running jinba experts; plan missing data, enforce pack write ownership, prevent prediction/human-expert leakage, and produce collection reports.
---
```

## 収集フェーズ

| フェーズ | 出力 | 主担当 JSONC | 正規 pack 書き込み | 備考 |
|---|---|---|---|---|
| T-1日夜 | `pack-v1.json` | `makoto`, `aoi`, `tatsunosuke`, `teppei` | `race.name/date/course`, `horses[].age/sex/past_races`, `horses[].jockey`, `horses[].trainer`, `horses[].pedigree`, `horses[].training` | 静的組の本実行用。オッズ依存・馬場依存組も暫定実行できるだけの基本データを入れる |
| 当日朝 | `pack-v2-odds.json` | `sakura` | `horses[].odds.win`, `horses[].odds.place`, `race.fan_vote` | `hina` / `yuko` はオッズを参照するが pack 正規書き込みはしない |
| 発走3時間前 | `pack-v2-baba.json` | `goro` | `race.weather`, `track_bias.this_week_observations` | `kenta` / `misaki` は馬場情報を参照するが正規書き込みはしない。`pack-v2-baba` に当日オッズを混ぜない |

## 10人別のデータ要求サマリ

| expert_id | timing | fetch_items | pack への扱い |
|---|---|---|---|
| `makoto` | T-1日夜 | 過去10-15年結果、現出走馬特徴、コース距離基準 | `race.*`, `horses[].age`, `horses[].sex`, `horses[].past_races` の正規書き込み |
| `aoi` | T-1日夜 | 騎手成績、調教師成績、馬騎手コンビ、近況 | `horses[].jockey`, `horses[].trainer` の正規書き込み。コンビ成績は notes/data_used |
| `tatsunosuke` | T-1日夜 | 血統表、父・母父成績、過去好走血統、条件適性 | `horses[].pedigree` の正規書き込み。距離・馬場適性解釈は notes/data_used |
| `teppei` | T-1日夜 | 最終追切、追切本数、厩舎調教拠点、好走時追切 | `horses[].training` の正規書き込み |
| `sakura` | 当日朝 | 単複オッズ、オッズ推移、ファン投票、人気帯別過去結果 | `horses[].odds.win/place`, `race.fan_vote` の正規書き込み |
| `hina` | 当日朝 | 人気帯、前走の隠れ条件、条件替わり | pack 書き込みなし。`sakura` / `makoto` / `goro` の正規値を参照 |
| `yuko` | 当日朝 | 上位人気、G1/G2安定度、リスクフラグ、本命複勝率 | pack 書き込みなし。`sakura` / `makoto` の正規値を参照 |
| `goro` | 発走3時間前 | 公式馬場、天気実況、当日芝結果、道悪履歴 | `race.weather`, `track_bias.this_week_observations` の正規書き込み |
| `misaki` | 発走3時間前 | 脚質材料、過去ラップ、当日ペースバイアス、コース形状 | pack 書き込みなし。必要なら `track_bias.pace_observations` を notes 用サブキー |
| `kenta` | 発走3時間前 | 走破時計、ラップ、馬場差、類似条件履歴 | pack 書き込みなし。指数計算結果は notes/data_used |

## Skill のファイル構成案

```text
.claude/skills/jinba-pack-precollector/
├── SKILL.md
├── scripts/
│   ├── plan-collection.mjs
│   ├── validate-pack.mjs
│   └── merge-collected-data.mjs
└── references/
    ├── race-data-pack-contract.md
    ├── collection-sources.md
    └── leakage-rules.md
```

### `SKILL.md`

短く保ち、実行順だけを書く。詳細なスキーマやソース候補は references に逃がす。

必須ワークフロー:

1. `.claude/agents/jinba-*.jsonc` を現在の正本として読む。
2. `scripts/plan-collection.mjs` でフェーズ別の収集 TODO と正規書き込みオーナーを出す。
3. 対象レースの `race_id`, レース名, 日付, 発走時刻, 競馬場, コース, 出走馬を確定する。
4. フェーズに応じて事実データのみ収集する。
5. `merge-collected-data.mjs` で pack を生成・更新する。
6. `validate-pack.mjs` で欠損、境界違反、リーク、JSON 妥当性を検査する。
7. `runs/<race_id>/collection-report-<phase>.md` に、取得元・取得時刻・欠損・手動確認事項を残す。

### `scripts/plan-collection.mjs`

役割:

- JSONC をコメント除去して parse する。
- `timing` から `v1`, `v2-odds`, `v2-baba` に分類する。
- `fetch_items` を priority 順に並べ、収集 TODO を出す。
- `write_to_pack_or_notes` の `正規書き込み` を抽出し、1 pack path に複数 owner がいないか検査する。
- `packには書かない` を notes/data_used の要求として出す。

出力例:

```bash
node .claude/skills/jinba-pack-precollector/scripts/plan-collection.mjs --phase v1
node .claude/skills/jinba-pack-precollector/scripts/plan-collection.mjs --phase v2-odds
node .claude/skills/jinba-pack-precollector/scripts/plan-collection.mjs --phase v2-baba
```

### `scripts/merge-collected-data.mjs`

役割:

- 手元で収集した中間 JSON を `RaceDataPack` に merge する。
- merge 可能なキーを正規書き込み owner の whitelist に限定する。
- `pack-v2-odds` は `pack-v1` をベースにオッズ・ファン投票だけを更新する。
- `pack-v2-baba` は `pack-v1` をベースに馬場・天気・当日芝結果だけを更新する。`pack-v2-odds` をベースにしない。

推奨オプション:

```bash
node .../merge-collected-data.mjs --phase v1 --race-dir runs/<race_id> --input collected/v1.json
node .../merge-collected-data.mjs --phase v2-odds --race-dir runs/<race_id> --input collected/odds.json
node .../merge-collected-data.mjs --phase v2-baba --race-dir runs/<race_id> --input collected/baba.json
```

### `scripts/validate-pack.mjs`

役割:

- JSON parse と最低限の `RaceDataPack` 形状検査。
- フェーズ別必須フィールド検査。
- `pack-v2-baba` に当日更新の `horses[].odds` が残っていないか検査。
- `data/experts/`, `predictions/`, `bets/` 由来の文字列やファイルパス混入を拒否する。
- `予想`, `印`, `買い目`, `推奨馬`, `ランク`, `評価A/B/C` など第三者判断の混入を警告する。
- `pack_meta.sources[]`, `pack_meta.retrieved_at`, `pack_meta.data_freshness` の存在を確認する。

## 収集データの中間形式案

手作業・ブラウザ取得・将来 scraper のどれでも同じ形に寄せる。

```jsonc
{
  "race_id": "2026....",
  "phase": "v1",
  "retrieved_at": "2026-06-26T21:00:00+09:00",
  "source_log": [
    {
      "id": "current_entries_features",
      "owner": "makoto",
      "source": "JRA公式出馬表",
      "url": "https://...",
      "retrieved_at": "2026-06-26T21:00:00+09:00"
    }
  ],
  "patch": {
    "race": {},
    "horses": [],
    "track_bias": {}
  },
  "notes": [
    {
      "owner": "aoi",
      "data_used": "combo_record",
      "summary": "pack には書かず rationale 用に保持"
    }
  ],
  "warnings": []
}
```

## 収集ソース方針

優先順位:

1. JRA公式: 出馬表、レース結果、馬場情報、開催情報、調教情報、ファン投票。
2. JBISサーチ: 血統表、父母父、近親。
3. netkeiba: 馬成績、騎手・調教師成績、オッズ表、過去結果表。使うのは数値・事実のみ。
4. 気象庁 / tenki.jp / Weathernews: 天気実況・短時間予報・降水量。

禁止:

- 他予想家の印・買い目・推奨馬・予想コラム。
- `data/experts/` 配下。
- 10人の `predictions/` 出力。
- 配分側 `bets/` 出力。
- 第三者の評価・格付け・ランク・スコア。例外は市場データとしてのオッズ・人気順・投票数。

## `RaceDataPack` への追記フィールド案

`docs/design/expert-subagents.md` の既存スキーマを壊さず、任意メタだけ追加する。

```jsonc
{
  "pack_meta": {
    "version": "v1",
    "retrieved_at": "2026-06-26T21:00:00+09:00",
    "data_freshness": {
      "entries": "t-1",
      "odds": "none|t-1|same-day-am",
      "baba": "forecast|same-day-3h"
    },
    "sources": [
      { "id": "current_entries_features", "owner": "makoto", "source": "JRA公式出馬表", "retrieved_at": "..." }
    ],
    "collection_warnings": []
  }
}
```

## 実装ステップ

### v0: 収集計画 Skill

- `SKILL.md` と `plan-collection.mjs` だけ作る。
- JSONC からフェーズ別 TODO と正規書き込み owner を出す。
- 手作業収集のチェックリストとして使う。

完了条件:

- `node .../plan-collection.mjs --phase v1` が makoto/aoi/tatsunosuke/teppei を中心に出す。
- `--phase v2-odds` が sakura を正規書き込み owner として出す。
- `--phase v2-baba` が goro を正規書き込み owner として出す。
- 正規書き込み重複があれば非0終了。

### v1: pack validation

- `validate-pack.mjs` を追加する。
- 既存 `runs/<race_id>/pack-v1.json` を検査し、欠損レポートを出す。
- `pack-v2-baba` のオッズ混入とリークを検査する。

完了条件:

- `runs/202609030411/pack-v1.json` を dry-run 検査できる。
- JSONC の `minimum_before_run` に対する欠損が report される。

### v2: merge helper

- `merge-collected-data.mjs` を追加する。
- 中間 JSON から pack を生成する。
- whitelist 外の patch は拒否する。

完了条件:

- v1 中間 JSON から `runs/<race_id>/pack-v1.json` を生成できる。
- odds 中間 JSON から `pack-v2-odds.json` を生成できる。
- baba 中間 JSON から `pack-v2-baba.json` を生成し、当日オッズが混入した patch は拒否される。

### v3: source adapters

- Playwright や scraping は最後に足す。
- まずは JRA公式 / netkeiba / JBIS / 気象の「取得手順」を references に書き、手作業でも再現できる状態にする。
- 自動 scraper はサイト変更の影響が大きいため、最初から Skill の中心にしない。

## SKILL.md 本文ドラフト

```markdown
# jinba-pack-precollector

k-ba-man の jinba 10人を走らせる前に RaceDataPack を作る。予想はしない。`.claude/agents/jinba-*.jsonc` を正本として読み、事実データだけを収集し、pack の正規書き込み境界を守る。

## Workflow

1. Read `.claude/agents/jinba-*.jsonc`.
2. Run `node .claude/skills/jinba-pack-precollector/scripts/plan-collection.mjs --phase <v1|v2-odds|v2-baba>`.
3. Collect only factual data from allowed primary/numeric sources.
4. Record source URLs, retrieval time, and missing fields.
5. Merge collected data with `merge-collected-data.mjs` if available; otherwise edit pack manually following the owner whitelist from the plan.
6. Run `validate-pack.mjs` before running experts.
7. Write `runs/<race_id>/collection-report-<phase>.md`.

## Phase Rules

- `v1`: create `pack-v1.json` for T-1 static run. Use makoto/aoi/tatsunosuke/teppei as canonical pack writers.
- `v2-odds`: update only odds/fan-vote fields. Sakura is canonical writer. Hina/Yuko are read-only consumers.
- `v2-baba`: update only weather/track-bias fields. Goro is canonical writer. Do not include same-day odds for baba experts.

## Leakage Rules

Never read or copy `data/experts/`, `predictions/`, `bets/`, human predictions, marks, picks, recommendations, or third-party ratings. Odds, popularity rank, vote count, race results, times, pedigree, weather, training clocks, and official going are factual data.
```

## 判断ポイント

1. **Skill は pack-builder 本体ではなく「pack-builder を安全に作る足場」から始める。** いきなり scraper を書くより、JSONC 由来の owner whitelist と欠損検査を先に固定した方が事故が少ない。
2. **収集は agent 単位でなく phase 単位にまとめる。** `past_races` を7人が別々に集める設計に戻すと競合が復活する。`makoto` が基本成績、`sakura` がオッズ、`goro` が馬場を正規更新する。
3. **notes/data_used は pack 本体と分ける。** コンビ成績、指数計算、脚質推定、血統解釈などは ExpertPrediction の根拠に使うが、共通 pack の構造化キーを上書きしない。
4. **`pack-v2-baba` は `pack-v1` ベース固定にする。** 運用上 `pack-v2-odds` をベースにしたくなるが、馬場依存組に当日オッズを見せない境界を script で守る。

## 検証項目

- JSONC 10ファイルを parse できる。
- `fetch_items` priority が `high|medium|low` のみ。
- `正規書き込み` owner が重複しない。
- フェーズ別出力が設計書 §3.5 と一致する。
- `pack-v2-baba` に当日オッズが混ざらない。
- `data/experts/` / `predictions/` / `bets/` 由来データが混ざらない。
- 欠損がある場合は pack を黙って完成扱いにせず、`collection_warnings` と report に残す。

## 次に作るなら

最小の次手は v0 実装:

```bash
mkdir -p .claude/skills/jinba-pack-precollector/scripts
```

そのうえで `SKILL.md` と `scripts/plan-collection.mjs` を作る。これだけでも、毎週の pack 手作業が「10 JSONC を読み直す」から「phase 別 TODO を出して埋める」へ変わる。
