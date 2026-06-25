# CLAUDE.md

## 現在のフォーカス: サイトのビジュアルデザイン刷新

公開SPA（`site/`）のビジュアルデザインを磨き上げるフェーズにある。デザイン刷新に関するドキュメント・参考資料・方針は `docs/visual-design/` に集積していく。

### デザイン関連の主要ファイル

- `docs/visual-design/design-spec.md` — デザイン要件定義書（正本）。情報設計・トーン・カラー・レイアウト・モーション・成功基準を定義
- `docs/visual-design/` — デザイン刷新のドキュメント・参考資料の集積先（増えていく）
- `site/` — 公開SPA（vanilla HTML/CSS/JS、ハッシュルーティング、フレームワーク不使用）
- `assets/characters/` — キャラクター立ち絵（`<id>/mini.png`, `<id>/real.png` × 10人 + 集合 `real.png`）

### デザインの方向性（要点）

- ダークテーマ基調。「円卓」と「競馬場」の二重空間
- 10人のキャラクターが主役。各キャラ固有カラーをアクセントに
- 「席を守る切迫」「外れの重み」のトーン。楽しいキャラ紹介サイトではなく毎週裁かれる者たちの記録
- 詳細は `docs/visual-design/design-spec.md` §4

## プロジェクト概要

k-ba-man は、10人のAI予想専門家キャラクターが毎週の重賞を予想し、過程・結果・ランキング変動をコンテンツとして公開するメディアサイト。詳細は `README.md` を参照。

### リポジトリの三層

| 層 | 場所 |
|---|---|
| エンジン（予想パイプライン） | `scripts/` + `.claude/agents/`（→ `AGENTS.md`） |
| 履歴（レース記録） | `runs/<race_id>/` + `data/` |
| コンテンツ（サイト・キャラ・スライド） | `site/` + `docs/worldbuilding/` + `assets/` |

### 設計の正本

- `docs/design/expert-subagents.md` — 予想パイプライン仕様
- `docs/design/weekly-ops.md` — 週次運用手順
- `docs/design/weekly-automation.md` — 自動化設計
- `docs/visual-design/design-spec.md` — サイトのデザイン要件定義書
- `AGENTS.md` — エージェント対応表（jinba×10 + haibun×5）
