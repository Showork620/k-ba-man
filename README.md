# k-ba-man — 集合知・競馬予想ハーネス

10人の予想専門家と5人の資金配分専門家による **2段階の集合知** で毎週の重賞を予想する AI ハーネス。そして、その予想の過程・履歴を「コンテンツ」として見せるサイト/スライド/キャラクター設定の集合体。初回ライブ運用＝宝塚記念2026。

> **「今週の予想を作れ」と言われたAI/人間へ** → エントリポイントは `bash scripts/run-weekly.sh <race_id>`（冪等な状態機械。各ゲートで停止する）。設計の正本は下記「設計の正本」の4本。**個別スクリプトの直叩きは冪等ゲートをバイパスするので、通常は run-weekly.sh を使う。**

---

## このリポジトリは何か（3つが同居している）

| 層 | 中身 | 場所 |
|---|---|---|
| **エンジン（ハーネス）** | 予想10人(jinba)→集約→配分5人(haibun)→集約→採点 の決定的パイプライン。接着スクリプトとエージェント定義 | `scripts/` ＋ `.claude/agents/`（→ [AGENTS.md](./AGENTS.md)） |
| **履歴（run-artifacts）** | レース単位の予想・買い目・採点の記録、人間予想家ベースライン、重み台帳 | `runs/<race_id>/`（→ [runs/README.md](./runs/README.md)）, `data/scoring/`, `data/experts/` |
| **コンテンツ** | 10人をキャラ化した創作世界・公開SPA・採用/登壇スライド・立ち絵 | `docs/worldbuilding/`, `site/`, `slides/`, `assets/` |

**設計の正本（READMEより先に読むべき4本）**:
- `docs/design/expert-subagents.md` — **仕様**（10人設計・スキーマ・多様性3軸・§3.5 当日依存3カテゴリの実行タイミング）。最上位正本。
- `docs/design/weekly-ops.md` — **週次運用の手順**（予想作成→結果提出→反省メンテの3フェーズ）。
- `docs/design/weekly-automation.md` — **自動化設計**（Mac実行・スケジュール＋Remote Control。クラウドroutine不使用＝バックエンド多様性保持）。
- `docs/visual-design/design-spec.md` — **公開サイトのデザイン要件定義書**（情報設計・デザイントーン・SPA/OGP制約・成功基準）。

---

## パイプライン全体像（エントリポイント）

`R = runs/<race_id>` とする。`run-weekly.sh` は欠けている成果物を順に埋め、ゲートで停止する冪等な状態機械（race_id でも race-dir パスでも起動可）。

```
① pack（人手・web収集）            → R/pack-v1.json                       ★手書き正本
② run-experts.sh   R/pack-v1.json  → R/predictions/v1/<expert>.json ×10   （予想10人 jinba-*）
③ aggregate.mjs    R/predictions/v1 R/pack-v1.json → R/predictions/aggregated-v1.json  （Borda＋正規化Log Pooling）
④ build-betting-input.mjs  R       → R/betting-input-v1.json              （★リーク遮断の実体）
⑤ run-bettors.sh   betting-input   → R/bets/v1/<bettor>.json ×5           （配分5人 haibun-*）
⑥ aggregate-bets.mjs  R/bets/v1    → R/bets/aggregated-v1.json            （券種別 stake 平均）
⑦ 人手ゲート：予算圧縮(betting-v2.md)・レビュー(review-v1.md)・提出(prediction-v1.md)・レース後 result.json 記録
⑧ score-race.mjs   R               → data/scoring/<race_id>.json ＋ data/scoring/weights.json
```

**主なゲート（停止して Sho に委ねる）**:
- **pack 不在** — ①が無ければ着手不能（手動 web 収集のブロッカー）。
- **クォーラム未達** — 有効予想 < `QUORUM`（既定8、`--quorum`で可変）。
- **配分不足** — 有効ポートフォリオ < `MIN_BETTORS`（既定3、`--min-bettors`で可変）。
- **リーク tripwire** — `build-betting-input.mjs` が禁止キー/ペルソナ名を検出すると書込拒否（exit 1）。
- **人手判断** — 予算圧縮・レビュー・提出・`result.json` 記録・**馬券購入**は人手。

進捗確認は `bash scripts/run-weekly.sh <race_id> --plan`。次の一手案内は `--what-now --race-time HH:MM`。
当日再実行（オッズ/馬場の品質アップグレード L1→L2→L3）の設計は `docs/design/expert-subagents.md §3.5` と `.claude/plans/done/flexible-execution-timing.md`、その残ギャップ改善は `.claude/plans/flexible-timing-hardening.md`。

---

## ディレクトリ地図（四層）

```
scripts/                エンジンの接着（run-weekly=司令塔, run-experts, aggregate, build-betting-input,
                        run-bettors, aggregate-bets, score-race）
.claude/agents/         エージェント定義の正本（jinba×10 ＋ haibun×5 ＋ schema×2 ＋ backend .sh×6）→ AGENTS.md
runs/<race_id>/         レース単位の全成果物（pack/予想/集約/配分/提出物/result）→ runs/README.md
data/scoring/           採点カード <race_id>.json ＋ weights.json（重み台帳）＋ README.md
data/experts/           人間予想家ベースライン（評価専用・予想/packに混入禁止）
docs/design/            設計の正本3本（仕様 expert-subagents / 運用 weekly-ops / 自動化 weekly-automation）
docs/visual-design/     ビジュアルデザイン刷新のドキュメント・参考資料（design-spec.md が正本）
docs/research/          背景リサーチ4本（集合知理論・予想流派・CLI仕様・宝塚記念）
docs/worldbuilding/     10人をキャラ化した創作世界（yosouya-10。jinba 10人のみ・haibun は対象外）
docs/memo/              走り書きスクラッチ（設計の正本ではない）
site/                   公開SPA（静的。app.js に CHARACTERS/HORSES/RACES を inline 保持。実行時に data を読まない）
slides/                 採用/登壇スライド（現用＝keiba-strategy.html）＋ slides/assets/（勉強会・採用画像4枚）
assets/characters/      現用キャラ立ち絵 <expert_id>/{mini,mid,real}.png ＋ 集合 real.png（site/slides 共通リソース）
assets/characters-bench/ 没・旧・派生・実験画像の退避先（live 参照なし）
.claude/plans/          設計プラン（現役は直下、完了は done/）
.claude/memories/       運用メモリ（現状 target-race-selection.md の1本）
.claude/skills/         cli-smoke-test（CLIバックエンドの疎通テスト）
```

---

## 命名と落とし穴（AI 必読）

| # | 落とし穴 | 正しい理解 |
|---|---|---|
| 1 | `aggregated-v1.json` が2箇所 | `predictions/aggregated-v1.json`（予想集約）と `bets/aggregated-v1.json`（買い目集約）は**同名・別物**。必ずフルパスで呼ぶ |
| 2 | `v1` の三義 | (a) フォルダ `predictions/v1`・`bets/v1`（実行ラウンド） (b) ファイル世代 `pack-v1.json`/`aggregated-v1.json` (c) md改訂 `betting-v1.md`→`betting-v2.md`（**betting は v2 が最終**） |
| 3 | 「専門家」が2集団 | 予想 **expert（10人 jinba-*）** ≠ 配分 **bettor（5人 haibun-*）**。`expert_id` と `bettor_id` を取り違えない |
| 4 | AI専門家10 ≠ 人間予想家9 | `data/experts/takarazuka-2026.json` は**人間予想家9人**（評価専用ベースライン）。AI専門家(jinba)とは別物で、pack・予想に混ぜるのは設計上の禁止事項（リーク） |
| 5 | レース名の二系統 | `runs/`・`data/scoring/` は netkeiba **race_id**（`202609030411`）、`data/experts/` は**スラッグ**（`takarazuka-2026`）。同一レースだが命名規約が違う（→ runs/README.md に対応表） |
| 6 | 創作の数値を実装と誤認 | `docs/worldbuilding/.../円卓制度.md` の降格点・閾値・監査役・降格戦・外部挑戦者は **物語用の架空制度**で `score-race.mjs` の実装ではない |
| 7 | budget=10000 は実質固定 | `build-betting-input.mjs` ＋ `aggregate-bets.mjs` ＋ `bettor-output.schema.json` の3箇所に独立ハードコード。`--budget` で渡しても**下流が追従しない**（end-to-end 変更不可） |
| 8 | 採点は v1 固定読み | `score-race.mjs` は `pack-v1.json`・`predictions/v1`・`aggregated-v1.json` を v1 固定で読む。当日再実行の `v2-odds`/`v2-baba` は集約には入るが**採点では読まれない** |
| 9 | 画像の頭身バリアント | `mini.png`=チビ/SD（**site/slides 現用**）, `mid.png`=中頭身（退役中・未参照）, `real.png`=実頭身。makoto だけ site が `real.png` を使う例外 |
| 10 | `real.png` が2種 | `assets/characters/real.png`=10人**集合**ビジュアル（hero用）≠ `assets/characters/<id>/real.png`=**個別**立ち絵 |
| 11 | CLI配管エージェント | `hina/yuko/makoto/teppei/ittetsu/ritsu` の `.md` は `model: haiku` の薄い配管で、実バックエンドは `.sh` 内の gemini-2.5-flash / gpt-5.5（→ AGENTS.md） |

---

## 触ってよい / 凍結 / 再生成可 / 死蔵

- **編集対象**: `scripts/`, `.claude/agents/`, `docs/design/`, `docs/visual-design/`, `docs/worldbuilding/.../characters/`, `site/`, `slides/keiba-strategy.html`
- **凍結（上書き禁止）**: `runs/202609030411/`（宝塚記念2026の記録）, `data/scoring/202609030411.json`。新レースは `runs/<新race_id>/` を作る
- **現役WIP（触らない）**: `runs/202609030611/`（しらさぎS・今週の対象。pack 未作成・着手前）
- **再生成可**: 各 run の `predictions/`, `bets/`, `*aggregated*`, `betting-input`, `data/scoring/<id>.json`（LLM非決定的なので再実行で同一にはならない）
- **死蔵（誤認注意）**: `slides/assets.zip`（17.9MB・陳腐化アーカイブ）, `slides/keiba-strategy v2 (bundle).html`（壊れ）, `assets/characters/cutout.png`（孤児）, `assets/characters-bench/`（退避先）, `mid.png`（退役中）

---

## 原則

- **馬券は実購入しない** — システムは提出物（買い目案）まで。購入判断は Sho。
- **外部アクセスは GET 読み取りのみ**（一次データの取得に限る）。
- **見送りも投資判断** — 全額見送り（tickets 空）も有効なポートフォリオ。
- **バックエンド多様性が設計の核心** — claude ＋ codex(gpt-5.5) ＋ gemini-2.5-flash。CLI 不在で全員 Claude に fallback すると実効独立性が静かに崩れる（本番前に `.claude/skills/cli-smoke-test` で疎通確認）。

---

## 既知の負債（整理＝ナビゲーションのスコープ外。改修は別フェーズ）

- **roster 重複** — 専門家名簿が複数箇所にハードコード（`run-experts.sh` 3箇所＋当日依存カテゴリ `sakura,yuko,hina`/`goro,misaki,kenta` が `aggregate.mjs`・`run-weekly.sh` 等に散在）。`PERSONA_NAMES`（リーク tripwire・日本語名）と `ALL_EXPERTS`（ローマ字名）の同期が切れると tripwire が静かに無効化。
- **budget=10000 のパラメータ化未対応**（上記 落とし穴#7）。
- **race_id / レース名のハードコード** — `aggregate.mjs:269` の race_id フォールバック `"202609030411"`、`aggregate.mjs:311` のバナー「宝塚記念 2026」、`score-race.mjs:156` の人間予想家ファイル選択 `takarazuka` 文字列マッチ（他レースで誤って宝塚データを拾うリスク）。
- **採点の v1 固定読み**（落とし穴#8）と **重みづけ未配線**（`weights.json` は races=1 < min 20 のため全員等重み・weighting_active=false）。

---

## さらに読む

- [AGENTS.md](./AGENTS.md) — 予想10人(jinba)・配分5人(haibun)・schema 2種・backend/effort の対応表
- [runs/README.md](./runs/README.md) — run-artifact カタログ、`v1` 三義、レースID⇔スラッグ対応表
- [data/scoring/README.md](./data/scoring/README.md) — 採点指標・ベースライン・重み学習ルール
- `docs/design/`（設計正本3本）／`docs/visual-design/`（ビジュアルデザイン刷新・design-spec.md）／`docs/research/`（背景）／`docs/worldbuilding/yosouya-10/README.md`（創作世界）
