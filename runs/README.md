# runs/ — レース単位の run-artifact カタログ

各レースは `runs/<race_id>/` 1ディレクトリにまとまる。`<race_id>` は **netkeiba の12桁 race_id**（例 `202609030411`）。生成は `scripts/run-weekly.sh <race_id>`（→ ルート [README.md](../README.md)）。

> **新レースの始め方**: `runs/<新race_id>/` を作り、`pack-v1.json` を手動作成してから `run-weekly.sh <新race_id>`。**既存ランは上書きしない。**

---

## ディレクトリ内のファイル一覧と性質

`R = runs/<race_id>` とする。

| ファイル | 性質 | 説明 |
|---|---|---|
| `R/pack-v1.json` | **手書き正本** | RaceDataPack（出馬表・枠・斤量・血統・前日オッズ・天気）。全パイプラインの入力。`pack_meta.errata` に修正履歴 |
| `R/result.json` | **手書き正本** | JRA確定結果（winner / place3 / payouts / 人気）。`score-race.mjs` の必須入力 |
| `R/predictions/v1/<expert>.json` ×10 | 再生成可 | 各予想専門家の出力。LLM非決定的なので再実行で同一にはならない |
| `R/predictions/v1/<expert>.log` | 痕跡 | CLI フォールバックのエラー証跡（backend欄の `*-fallback` の唯一の裏付け） |
| `R/predictions/aggregated-v1.json` | 再生成可 | 10人の集約（Borda＋正規化Log Pooling）。`quality_level`/`degraded_experts` を含む |
| `R/betting-input-v1.json` | 再生成可 | 配分への共通入力（**集約確率＋市場オッズ＋控除率のみ**。個別予想を含まない＝リーク防止生成物） |
| `R/bets/v1/<bettor>.json` ×5 | 再生成可 | 配分専門家の買い目（tickets。全額見送り＝空配列も有効） |
| `R/bets/aggregated-v1.json` | 再生成可 | 5人の買い目をポートフォリオ平均（dust<200 切捨て）。`predictions/aggregated-v1.json` と**同名異物** |
| `R/prediction-v1.md` | 半生成（提出物） | 予想の提出物 |
| `R/betting-v1.md` → `betting-v2.md` | 半生成（提出物） | 買い目の提出物。**v2 が最終**（予算を確定額へ圧縮） |
| `R/review-v1.md` / `report-v1.md` / `result-v1.md` | 半生成 | レビュー・総括・採点所見 |

採点結果はランの外（`data/scoring/<race_id>.json` ＋ `data/scoring/weights.json`）に出る。

---

## `v1` の三義（取り違え注意）

| 何の v1 か | 例 | 意味 |
|---|---|---|
| **フォルダ**（実行ラウンド/カテゴリ） | `predictions/v1`, `bets/v1` | 既定の保存先。当日再実行は `predictions/v2-odds`・`v2-baba`（`run-experts.sh --out` で生成） |
| **ファイル世代** | `pack-v1.json`, `aggregated-v1.json`, `betting-input-v1.json` | 世代番号 |
| **md 改訂** | `betting-v1.md` → `betting-v2.md` | 提出物の改訂。**betting は v2 が最終** |

> ⚠ `score-race.mjs` と `run-weekly.sh` の冪等ゲートは `pack-v1.json` / `predictions/v1` / `aggregated-v1.json` を **v1 固定** で読む。当日再実行の `v2-odds`/`v2-baba` は集約には overlay されるが**採点では読まれない**（既知の制約。当日依存カテゴリの設計は `docs/design/expert-subagents.md §3.5`）。

---

## レースID ⇔ スラッグ 対応表

`runs/`・`data/scoring/` は **race_id**、`data/experts/`（人間予想家ベースライン）は**スラッグ**で命名する。同一レースでも名前が違うので対応表を持つ。

| race_id | レース | 開催 | スラッグ（data/experts） | 状態 |
|---|---|---|---|---|
| `202609030411` | 第67回 宝塚記念（G1） | 2026-06-14・阪神 芝2200m内 | `takarazuka-2026` | **凍結**（初回ライブ運用済み） |
| `202609030611` | しらさぎステークス（GⅢ） | 2026-06-21 15:30・阪神 芝1600m外 | （未作成） | **現役WIP**（pack 未作成・着手前。`NOTES.md` 参照） |
| `202605030611` | 府中牝馬ステークス（GⅢ） | 2026-06-21・東京 芝1800m | — | 同週並走（しらさぎSとのタイブレークで非選択。`NOTES.md` に記載） |

> ⚠ `202609030611`（しらさぎS）と `202605030611`（府中牝馬S）は末尾6桁が酷似。取り違え注意。
> ⚠ `score-race.mjs:156` は人間予想家ファイルを `takarazuka` 文字列マッチで探すため、他レースでは自動発見できず誤って宝塚データを拾うリスクがある（既知の負債）。

---

## 凍結ランの扱い（重要）

- `runs/202609030411/` は historical-immutable（過去ランの記録）。**新レースは別ディレクトリ**を作る。
- ただし**再生成物**（`predictions/aggregated-v1.json` 等）は `aggregate.mjs` の改修時に再生成されうる。現に同ファイルは品質レベル機能追加で working tree が変更されている（凍結の運用と再生成可の性質が衝突しうる点に注意。確定方針は Sho 判断）。
- 手書き正本（`pack-v1.json` / `result.json`）と提出物 md は触らない。
