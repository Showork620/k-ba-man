# AGENTS.md — エージェント対応表

`.claude/agents/` には **2チーム計15人のエージェント定義** ＋ **2種の出力スキーマ** ＋ **6本の backend ラッパー** が同居する。定義の正本はここ（`.claude/agents/*.md` / `*.sh`）。仕様の詳細は `docs/design/expert-subagents.md`。

- **jinba-\*（予想専門家10人）** — `RaceDataPack` を読み **ExpertPrediction** JSON を返す。`run-experts.sh` が並列起動。
- **haibun-\*（資金配分専門家5人）** — `betting-input`（集約確率のみ）を読み **BettorPortfolio** JSON を返す。`run-bettors.sh` が並列起動。
- ⚠ 両方「専門家」と呼ぶが別チーム。`expert_id`（予想）と `bettor_id`（配分）を取り違えない。

---

## 予想専門家 jinba-*（10人 → ExpertPrediction）

| expert_id | キャラ | 流派 | バックエンド | model(frontmatter) | effort | tools |
|---|---|---|---|---|---|---|
| `aoi` | 葵 | 騎手・厩舎 | Claude直 | sonnet | medium | Read, WebFetch, WebSearch |
| `goro` | 吾郎 | 馬場・トラックバイアス | Claude直 | claude-opus-4-6 | max→出力high | Read, WebFetch, WebSearch |
| `hina` | 陽菜 | 穴党・逆張り | **gemini-2.5-flash**（.sh） | haiku(配管) | low | Bash, Read |
| `kenta` | 健太 | スピード指数 | Claude直 | sonnet | low | Read, WebFetch, WebSearch |
| `makoto` | 誠 | データ・統計 | **codex / gpt-5.5**（.sh） | haiku(配管) | high | Bash, Read |
| `misaki` | 美咲 | 展開・ペース読み | Claude直 | opus | medium | Read, WebFetch, WebSearch |
| `sakura` | さくら | オッズ・市場分析 | Claude直 | haiku | medium | Read, WebFetch, WebSearch |
| `tatsunosuke` | 龍之介 | 血統・配合 | Claude直 | opus | xhigh→出力high | Read, WebFetch, WebSearch |
| `teppei` | 鉄平 | 調教・仕上がり | **codex / gpt-5.5**（.sh） | haiku(配管) | medium | Bash, Read |
| `yuko` | 優子 | 堅実本命 | **gemini-2.5-flash**（.sh） | haiku(配管) | low | Bash, Read |

バックエンド内訳: **Claude直6人**（aoi/goro/kenta/misaki/sakura/tatsunosuke）／**codex 2人**（makoto/teppei）／**gemini 2人**（hina/yuko）。

## 資金配分専門家 haibun-*（5人 → BettorPortfolio）

| bettor_id | キャラ | 方針 | バックエンド | model | effort | 点数 |
|---|---|---|---|---|---|---|
| `go` | 剛 | ◎軸 三連複フォーメーション（攻撃派） | Claude直 | opus | high | 〜12点 |
| `ittetsu` | 一徹 | 1/4ケリー基準（規律派） | **codex / gpt-5.5**（.sh） | haiku(配管) | high | 〜12点 |
| `kaede` | 楓 | 券種分散（どの決着でも壊滅しない） | Claude直 | sonnet | medium | 〜12点 |
| `ritsu` | 律 | 損益分岐オッズ×1.05 未満を拒否（回収率規律） | **gemini-2.5-flash**（.sh） | haiku(配管) | — | 〜12点 |
| `sayuri` | さゆり | 複勝圏確率最優先・トリガミ回避（堅実） | Claude直 | haiku | low | **5点目安**（スキーマ上限は12） |

バックエンド内訳: **Claude直3人**（go/kaede/sayuri）／**codex 1人**（ittetsu）／**gemini 1人**（ritsu）。

---

## 出力スキーマ（契約・2種）

| ファイル | title | required | 要点 |
|---|---|---|---|
| `.claude/agents/expert-output.schema.json` | **ExpertPrediction** | 13キー（expert_id, expert_name, school, backend, effort, race_id, pack_version, predicted_ranking, win_prob, marks, confidence, rationale, data_used, warnings） | `effort` は enum `[high, medium, low]`。`additionalProperties: false` |
| `.claude/agents/bettor-output.schema.json` | **BettorPortfolio** | 7キー（bettor_id, bettor_name, philosophy, backend, tickets, total_stake_jpy, notes） | `tickets` maxItems **12**、各 `stake_jpy` min **300**・multipleOf **100**、`total_stake_jpy` max **10000**。`effort` フィールドは無い |

> ⚠ **budget=10000 の三箇所同期**: `bettor-output.schema.json`（total_stake_jpy max）＋ `build-betting-input.mjs`＋ `aggregate-bets.mjs`。片方だけ変えると `pass_jpy` がズレる（→ README 落とし穴#7）。スキーマに `budget` という名のキーは無く `total_stake_jpy` の `maximum` として実装されている。

---

## backend ラッパーの実体（CLI配管エージェント）

`hina / yuko / makoto / teppei / ittetsu / ritsu` の `.md` は **`model: haiku` の薄い配管**で、実際の推論バックエンドは同名 `.sh` 内にある。`.md` だけ読むとバックエンドが分からないので `.sh` を読むこと。

| ラッパー | 起動 |
|---|---|
| `jinba-makoto-codex.sh` / `jinba-teppei-codex.sh` / `haibun-ittetsu-codex.sh` | `codex exec -s read-only -m gpt-5.5 -c model_reasoning_effort=<high\|medium>`。**`--output-schema` は意図的に不使用**（structured-outputs 非対応キーワードで codex が無言の空出力になるため。2026-06-12 確認コメントが各 .sh に記載） |
| `jinba-hina-gemini.sh` / `jinba-yuko-gemini.sh` / `haibun-ritsu-gemini.sh` | `gemini -m gemini-2.5-flash --output-format json --approval-mode plan`、`GEMINI_CLI_TRUST_WORKSPACE=true`、`jq -r .response` で抽出 |

- **fallback**: 各配管 .sh は対応 CLI 不在時に `{"error": "<cli> CLI not found", "expert_id|bettor_id": "<id>", "skipped": true}` を返す。fallback が常態化すると実効的なバックエンド多様性が静かに崩れる（本番前に `.claude/skills/cli-smoke-test` で疎通確認）。
- **effort の三層**: ① frontmatter（`goro=max`, `tatsunosuke=xhigh` を含む） → ② スキーマ enum `[high, medium, low]` → ③ 出力固定値（goro/tatsunosuke は md 本文が `high` に丸めると明記）。`max`/`xhigh` は思考量設定であってスキーマ値ではない。

---

## 独立性・リーク防止の規約（全エージェント共通）

- **他専門家の予想・印は参照しない**（集合知の独立性条件）。
- **配分側は個別10人の出力を渡されない** — 集約確率（`betting-input`）のみで配分する。
- **`data/experts/` は jinba/haibun から参照禁止** — 人間予想家データは評価専用（一方向境界）。
- **第三者の評価・格付け・印は事実として使わず一次データのみ**（`sakura` のみオッズ・投票データを例外で参照可）。

## 別系統エージェント

- `expert-collector.md` — jinba/haibun とは別系統。`model: claude-sonnet-4-6`。人間予想家の予想記事を web 収集し `data/experts/takarazuka-2026.json` に**独自JSON形式**で保存（ExpertPrediction/BettorPortfolio スキーマは使わない）。`§7.3` の評価専用ベースライン生成。

---

## キャラ⇔エージェント対応（創作世界 ↔ 実装）

`docs/worldbuilding/yosouya-10/` の日本語フレーバー名と `expert_id`（ローマ字）の対応。世界観文書は jinba 10人のみが対象（haibun 5人のキャラ設定は無い）。

龍之介=tatsunosuke / 誠=makoto / 美咲=misaki / 健太=kenta / 鉄平=teppei / さくら=sakura / 葵=aoi / 陽菜=hina / 優子=yuko / 吾郎=goro
