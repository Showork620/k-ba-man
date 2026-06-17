# k-ba-man 週次運用 runbook

**毎週の運用サイクル**を回すための手順書。対象レース1本につき「予想作成 → 結果提出 → 反省メンテ」を1周する。
設計の根拠は [expert-subagents.md](./expert-subagents.md)、重みづけ方針は同 §7.1。

```
  ┌──────────────────────────────────────────────────────────────┐
  │  フェーズ1 予想作成     フェーズ2 結果提出     フェーズ3 反省メンテ │
  │  (レース前)            (レース後)            (採点・改善)        │
  │  pack→10予想→集約       result.json記録        score→台帳→総括     │
  │  →配分5人→買い目→提出                          →メンテ判断         │
  └────────────┬─────────────────────────────────────┬─────────────┘
               └──────────── 毎週ループ ──────────────┘
```

`race_id` は netkeiba 形式: `西暦4 + 場2 + 回2 + 日2 + R2`（例 2026宝塚=`202609030411`、阪神=09）。全成果物は `runs/<race_id>/` 配下。

---

## フェーズ1: 予想作成（レース前）

タイミングは設計書 §3.5 準拠（T-1日夜に pack v1 で基本実行、当日朝にオッズ依存組のみ pack v2 で再実行可）。

| # | ステップ | コマンド / 成果物 | 備考 |
|---|---|---|---|
| 1 | **pack 作成** | `runs/<race_id>/pack-v1.json` | ⚠ 現状**手動**（web 収集）。出馬表・血統・調教・天気・オッズ・枠順。誤りは `pack_meta.errata` に記録。スキーマは §3.1 |
| 2 | **CLI 事前スモークテスト** | `codex --version` / `gemini --version` ＋ 1頭分の試走 | バックエンド多様性の生命線。落ちていれば修正してから本実行（[cli-backend-pitfalls] 参照） |
| 3 | **10専門家を並列実行** | `scripts/run-experts.sh runs/<race_id>/pack-v1.json` | → `predictions/v1/<expert>.json` ×10。**クォーラム8人以上**で集約可、7人以下は Sho 相談 |
| 4 | **予想集約** | `node scripts/aggregate.mjs runs/<race_id>/predictions/v1 runs/<race_id>/pack-v1.json` | → `predictions/aggregated-v1.json`（Borda＋正規化logpool、印、place_prob_lb） |
| 5 | **betting-input 生成** | `node scripts/build-betting-input.mjs runs/<race_id> [--odds <当日オッズ.json>]` → `betting-input-v1.json` | 集約確率＋オッズから自動生成。**★リーク防止は構造的**: 集約の `aggregated_ranking` だけ読み、個別予想・印・信頼度は読まない（書き込み前に tripwire でペルソナ名・専門家キーの混入を検査）。当日オッズ（複勝含む）は `--odds` で渡すと精度↑（前回の穴）。省略時は pack の事前オッズを使い `odds_place=null`。当日朝に再取得したら `--odds` で再生成 |
| 6 | **配分5専門家を実行** | `scripts/run-bettors.sh runs/<race_id>/betting-input-v1.json` → `bets/v1/<bettor>.json` ×5 | `haibun-*` で定義済み（go/kaede/sayuri=Claude, ittetsu=codex, ritsu=gemini）。哲学: 一徹(¼ケリー)/律(損益分岐×1.05)/さゆり(的中率)/楓(券種分散)/剛(三連複フォーメーション)。スキーマ `bettor-output.schema.json`。total=0 の全額見送りも有効 |
| 7 | **買い目集約** | `node scripts/aggregate-bets.mjs runs/<race_id>/bets/v1` | → `bets/aggregated-v1.json`（ポートフォリオ平均、200円未満ダスト除外） |
| 8 | **予算圧縮 → 確定買い目** | `runs/<race_id>/betting-v2.md` | 集約投票額を確定予算に圧縮（階層丸め）。馬場急変は無効化ルール |
| 9 | **レビュー** | `runs/<race_id>/review-v1.md` | 集約の数学・独立性・多様性・市場ベンチを検証。集合知のセオリーに従い個別意見は再評価しない |
| 10 | **提出** | `runs/<race_id>/prediction-v1.md` ＋ `betting-v2.md` | Sho へ。**馬券購入は Sho 判断**（システムは出力まで） |

---

## フェーズ2: 結果提出（レース後）

| # | ステップ | 成果物 | 備考 |
|---|---|---|---|
| 1 | **確定結果を記録** | `runs/<race_id>/result.json` | `winner` / `place3` / `payouts`。可能なら `finish_order_known` を全頭にして `finish_order_complete: true`（RPS 算出に必要） |

`result.json` のスキーマ例は `runs/202609030411/result.json` を参照。

---

## フェーズ3: 反省メンテ（採点・改善）

| # | ステップ | コマンド / 成果物 | 備考 |
|---|---|---|---|
| 1 | **レース後採点** | `node scripts/score-race.mjs runs/<race_id>` | → `data/scoring/<race_id>.json`（各専門家 Brier/LogLoss/印カバー、集団vs個人 E=M−D、人間ベースライン）＋ `data/scoring/weights.json` 更新 |
| 2 | **総括** | `runs/<race_id>/result-v1.md` | 収支・印答え合わせ・専門家別採点・学び。`runs/202609030411/result-v1.md` がテンプレ |
| 3 | **ステークホルダー報告（任意）** | `runs/<race_id>/report-v1.md` | 外部配布用。n・運の依存・但し書きを正直に |
| 4 | **メンテ判断** | プロンプト/集約/スキーマの改修 | 下記チェックリスト |

### メンテ・チェックリスト（毎週）

- [ ] **規約逸脱**: win_prob 合計 0.95〜1.05 を割った専門家はいないか（採点カードの `spec_sum_violations`）。慢性的なら該当プロンプトを点検
- [ ] **格付け混入**: data_used に第三者の評価・格付け・印が紛れていないか（§3.3）
- [ ] **バックエンド多様性**: codex/gemini が実際に動いたか（fallback の常態化は実効独立性を下げる）
- [ ] **重み**: `weights.json` の `races_recorded` の件数が `min_races_before_weighting`(20) 未満なら**等重み維持**。重みは入れない（§7.1）
- [ ] **n 規律**: 1レースの結果でペルソナ・流派を調整しない（過学習）。スコアは貯めるだけ
- [ ] **重みづけ ON 判断**（20レース到達後のみ）: 過去精度重みが等重みを **out-of-sample で上回る**ことを実証できたときだけ ON。総取りにせず緩く（§7.1）

---

## ファイル・命名規約

```
runs/<race_id>/
├── pack-v{n}.json                      # RaceDataPack（再取得で v2,v3…）
├── predictions/
│   ├── v{n}/<expert>.json              # 10専門家の ExpertPrediction
│   └── aggregated-v{n}.json            # 予想集約
├── bets/
│   ├── v{n}/<bettor>.json              # 5配分専門家の BettorPortfolio
│   └── aggregated-v{n}.json            # 買い目集約
├── betting-input-v{n}.json             # 配分専門家への入力（リークなし）
├── prediction-v{n}.md                  # 予想提出物
├── betting-v{n}.md                     # 買い目提出物
├── review-v{n}.md                      # レビュー
├── result.json                         # 確定結果（フェーズ2）
├── result-v{n}.md                      # レース後総括（フェーズ3）
└── report-v{n}.md                      # ステークホルダー報告（任意）

data/
├── scoring/<race_id>.json              # 採点カード
├── scoring/weights.json                # w_i 台帳（per_race 累積）
└── experts/<race>.json                 # 人間予想家ベースライン（評価専用・10人に渡さない §3.3）
```

- コミットは **Sho のレビュー後**（kochi は未コミットで残す）

---

## 現状のギャップと構築順（TODO）

毎週手動だと事故る箇所を、効くもの順に。

1. ~~配分専門家(5人)の agent 定義化~~ ✅ **完了（2026-06-14）**: `.claude/agents/haibun-*.{md,sh}` ＋ `scripts/run-bettors.sh` で正典化。go/kaede/sayuri=Claude・ittetsu=codex・ritsu=gemini。予想10人(`jinba-*`)と同構造・同リーク防止
2. ~~**betting-input builder**~~ ✅ **完了（2026-06-15）**: `scripts/build-betting-input.mjs`。集約 `aggregated_ranking` ＋ pack ＋（任意）当日オッズ `--odds` から `betting-input-v1.json` を生成。リーク防止は構造的（ホワイトリスト構築＋書き込み前 tripwire）。`breakeven_odds=1/win_prob` を独立計算。複勝オッズ `odds_place`・ワイド `meta.wide_odds` に対応。2026宝塚の手動版を数値再現で検証済み
3. **pack-builder** ← netkeiba/JRA スクレイピングで `pack-v1.json` を半自動生成。週次の最大の手作業
4. **週次オーケストレーター** ← pack→予想→集約→配分→買い目→（レース）→採点 を1コマンドで通し、各ゲート（クォーラム・予算・馬場急変）で停止する司令塔
5. **score-race の拡張** ← 完全着順時の RPS/Spearman、市場ベースライン（全馬オッズ）、20レース到達後の `aggregate.mjs` への w_i 配線

**運用ゲートの自動化（項目4オーケストレーターに内包すべき細目）**:
- **CLI 死活のゲート化**: codex/gemini のスモークテストを自動化し、落ちていれば警告。手動だと fallback 常態化を毎週見逃し、多様性が静かに崩れる
- **クォーラム判定の自動化**: `aggregate.mjs` は有効予想を集めるだけでクォーラム閾値(8)を強制しない。予想欠損時に静かに少人数集約する事故を防ぐゲートが要る
- **betting-v2 圧縮の支援**: 確定予算への階層丸め圧縮・馬場急変の無効化は現状手動。最終提出物に直結する手作業
- **完全着順の取得段取り**: 項目5の RPS は全頭着順が前提だが、レース後にどこから全頭着順を取るかが未定（pack-builder はレース前データ）。データ源を決めないと RPS は動かない
- **限界貢献メトリクス（理想）**: §7.1 規則2 の leave-one-out（その専門家を抜くと集団誤差がどれだけ悪化するか）は未実装。重みづけ ON 判断の精度を上げるなら実装候補
- **コンソール表示の汎用化**: `aggregate.mjs` のヘッダが「宝塚記念 2026」固定（出力JSONの値は動的なので実害は表示のみ）。週次化で動的レース名へ（`score-race.mjs` は対応済み）

---

*作成: 2026-06-14 / 初回ライブ運用(2026宝塚記念)を受けて週次運用へ移行*
