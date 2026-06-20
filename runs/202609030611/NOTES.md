# しらさぎステークス（GⅢ）— 今週の対象レース 作業メモ

> **状態**: pack 未作成（着手前）。このファイルはセッションを跨いで「今週の対象」を残すための引き継ぎメモ。
> **作成**: 2026-06-20。

## 確定事項

- **対象レース**: しらさぎステークス（GⅢ）
- **race_id**: `202609030611`（netkeiba 12桁。出馬表ページで実確認済み）
- **発走**: 2026-06-21（日）**15:30**
- **競馬場/条件**: 阪神・芝1600m(外)・サマーマイルシリーズ第1戦（2025 新設）
- **選定根拠**: その週末（6/20-21）は 6/20 重賞なし、6/21 に最上位格 GⅢ が2本並走（しらさぎS／府中牝馬S=東京・芝1800m・牝馬限定ハンデ `202605030611`）。同格 GⅢ のタイブレークを **Sho 判断で しらさぎS に決定**（選定方針 → `.claude/memories/target-race-selection.md`）。

## 現状・次の一手

- ❌ **pack-v1.json 未作成 ← ブロッカー**（run-weekly ステップ1ハードゲート。現状は手動 web 収集：出馬表・枠順・血統・過去走・調教・天気・前日オッズ）。
  - ⚠ WebFetch は JRA/netkeiba の表を誤読しやすい → **出馬表（馬番・騎手・枠・斤量）は一次ソースで厳密に**取る（netkeiba 出馬表 `race_id=202609030611` 軸）。
- ✅ インフラは GO（claude/codex/gemini 実疎通済み 2026-06-20、スクリプト検証済み）。
- 今日（6/20）は **T-1日**。pack-v1 の収集着手が可能。

## 実行手順（pack ができたら。§3.5 の3カテゴリ運用）

```bash
# 静的（T-1夜）
bash scripts/run-experts.sh runs/202609030611/pack-v1.json

# オッズ依存（当日朝）
bash scripts/run-experts.sh runs/202609030611/pack-v2-odds.json --only sakura,yuko,hina --out v2-odds

# 馬場＋仕上げ（発走3h前＝12:30頃。Remote Control で go、実体は Mac）
bash scripts/run-experts.sh runs/202609030611/pack-v2-baba.json --only goro,misaki,kenta --out v2-baba
node scripts/aggregate.mjs runs/202609030611/predictions/v1 runs/202609030611/predictions/v2-odds runs/202609030611/predictions/v2-baba runs/202609030611/pack-v1.json
bash scripts/run-weekly.sh 202609030611
```

進捗確認はいつでも `bash scripts/run-weekly.sh 202609030611 --plan`。

## 参照

- 選定方針: `.claude/memories/target-race-selection.md`
- カテゴリ/タイミング: `docs/design/expert-subagents.md` §3.5
- 自動化設計: `docs/design/weekly-automation.md`
- 週次手順: `docs/design/weekly-ops.md`
