# data/scoring — レース後採点と重み学習台帳

設計書 §8.5（採点skill）と §7.1（重み w_i の学習）の基盤。`scripts/score-race.mjs` が生成・更新する。

## ファイル

| ファイル | 内容 |
|---|---|
| `<race_id>.json` | 1レース分の採点カード（各専門家のスコア＋集団ベースライン＋多様性分解＋人間予想家比較） |
| `weights.json` | w_i 台帳。専門家別の累積スコアと現行重み。`aggregate.mjs` が将来読む契約 |
| `README.md` | このファイル |

## 実行

```bash
node scripts/score-race.mjs runs/<race_id>
```

入力: `runs/<race_id>/result.json`（確定結果）、`predictions/v1/*.json`（各予想）、`predictions/aggregated-v1.json`（集団）、`pack-v1.json`（馬名）、`data/experts/<race>.json`（人間ベースライン・任意）。

確率の正規化は `aggregate.mjs` の `getWinProbs` と同一規約（未列挙馬に `(1−Σ)/残頭数` を配分 → εフロア0.005 → 再正規化）。採点と集約で確率の扱いがズレないようにするため。

## 指標

| 指標 | 定義 | 向き |
|---|---|---|
| `win_brier` | マルチクラスBrier（1着イベント）`Σ_h (p_h − y_h)²` | 小さいほど良い（0〜2） |
| `win_logloss` | `−ln(p_winner)` | 小さいほど良い |
| `p_winner` | 正規化後に1着馬へ与えた確率 | — |
| `marks_place3_coverage` | 印（◎○▲△）に実際の3着内3頭が何頭含まれたか | 大きいほど良い（0〜3） |
| `placed_mean_pred_rank` | 3着内各馬に予想で与えた着順の平均 | 小さいほど良い |
| `spec_sum_ok` | 列挙 win_prob 合計が §3.4 の 0.95〜1.05 か | true が良い |

### 3つのベースライン比較（§7.3）

1. **市場** — 確定オッズ由来の暗黙確率（控除補正後）。**未実装**（全馬オッズが pack に未収録のため。TODO）
2. **人間予想家** — `data/experts/<race>.json` の◎が1着/3着内だった数。AI集合知の本命と同じ土俵で比較
3. **個人 vs 集団** — 個人平均 Brier `M` vs 集団 Brier `E`。`D = M − E`（多様性予測定理 E=M−D）。線形プールは Jensen 不等式で `D ≥ 0` が保証される

## 重み学習のルール（§7.1 / §7.3）

- **初期は等重み**。n が小さい段階での重み付けは過学習（result-v1 の「n=1 で重み付けは禁物」と整合）。
- `weights.json` の `min_races_before_weighting`（既定20）に達するまで `current_weights` は全員 equal を維持し、`cumulative` にスコアを蓄積するだけ。`current_weights` は合計がちょうど 1 になるよう端数を最後の専門家で吸収する。
- スコアは `cumulative[expert].per_race`（1レース1エントリ）で保存する。**全期間の単純累積ではなく per-race** にするのは、閾値到達後に「直近20レース」を切り出して rolling window を計算するため。
- 較正は **knowledge cutoff 後の実レースのみ**（§7.3 の汚染問題回避）。過去レースのバックテストは w_i の根拠にしない。
- 閾値到達後は rolling window 20レースの Brier/LogLoss から w_i を更新する想定。`weighting_active` が true になったら `aggregate.mjs` 側で `confidence × 過去精度` の重みに切替える（**この配線は次フェーズ**。現状 aggregate.mjs は confidence のみ使用）。
- ⚠ **編成変更時の注意**: 過去レースに居た専門家が新編成に居ないと `current_weights` から外れる（`cumulative` には残る）。10人の編成を入れ替える場合は `weighting_active` を一旦 false に戻して再蓄積するのが安全。

## 現状（2026-06-14）

- `races_recorded`: 1（2026宝塚記念）。`weighting_active`: false（等重み継続）。
- 初回データの所見は `runs/202609030411/result-v1.md` 参照。血統(龍之介)が Brier 最良だが **n=1 のため重みには反映しない**。

## TODO

1. 市場ベースライン（全馬の確定オッズを `result.json` に収録 → 控除補正して Brier 比較）
2. 完全着順の収録（`result.json` の `finish_order_complete: true`）→ RPS / Spearman 順位相関を追加
3. `min_races_before_weighting` 到達後、`aggregate.mjs` に w_i 配線（`weights.json` の `current_weights` を log pooling 指数に乗算）
