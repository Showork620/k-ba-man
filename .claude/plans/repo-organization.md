# k-ba-man リポジトリ整理 — README作成＋ディレクトリ整序プラン

## Context

- このリポジトリ `k-ba-man` には **3つの異質なものが同居**している：(1) 実際に動く競馬予想ハーネス（エンジン）、(2) その予想の様子・履歴を「コンテンツ」として見せるサイト/スライド/キャラ設定、(3) それらを支える設計・調査ドキュメント。
- **問題**: ルートに `README.md` も `AGENTS.md` も `CLAUDE.md` も無い。初見の AI エージェント（および人間）が、エントリポイント・正本・凍結アーカイブ・スクラッチの区別を掴む手がかりがゼロ。結果、「再生成可能な生成物を正本と誤認する」「死蔵ファイルを現行仕様と誤認する」「同名異物を取り違える」といった混乱が構造的に起きうる。
- **このプランの中心成果物は「ルート README.md」**。ただし README 1枚だけでは不足で、AI ナビゲーションを成立させるには「ルート README ＋ 各層の薄い案内ファイル」の二階建て＋最低限のリポジトリ衛生（.gitignore 拡張・死蔵明示）が要る。それらをまとめて「整理」の射程とする。
- 精査は 9 サブシステムを並列調査するワークフローで実施済み（予想/配分エンジン・scripts・data/runs・docs・worldbuilding・site・slides・config）。本プランはその結果と横断レビューに基づく。
- **大原則（厳守）**：
  1. **壊さない** — 下流が実パスに依存している箇所がある（後述「保護リスト」）。リネーム/移動/削除は依存を張り替えてから、順序を守って行う。
  2. **凍結を尊重** — `runs/202609030411/` 等の過去ランは historical-immutable。上書き・改名しない。
  3. **コミットは Sho レビュー後**（グローバルルール）。本プランの実行で作る/直すファイルも未コミットのまま残す。
  4. **破壊的操作（追跡ファイルの rm/mv）は Sho の明示承認後**。プランでは提案に留める。

---

## 現状マップ（精査サマリ）

### このリポジトリの実態 = 四層構造

| 層 | ディレクトリ | 役割 | ライフサイクル |
|---|---|---|---|
| **engine/harness（エンジン）** | `scripts/`（接着）＋ `.claude/agents/`（定義正本） | 2段階集合知パイプラインのコードとエージェント定義 | canonical-source（手書き正本） |
| **run-artifacts（履歴）** | `runs/<race_id>/` ＋ `data/scoring/` ＋ `data/experts/` | レース単位の予想・配分・採点の凍結記録、人間予想家ベースライン、重み台帳 | 過去ランは historical-immutable／生成物は再生成可／pack・result・人間予想家は手書き正本 |
| **content（コンテンツ）** | `docs/worldbuilding/` ＋ `site/` ＋ `slides/` | 10人をキャラ化した創作レイヤー、公開SPA、採用/登壇スライド | 創作の正本だがエンジンに対しては従属（エンジンが上位正典） |
| **design/docs（設計）** | `docs/design/` ＋ `docs/research/` | エンジン仕様・週次運用 runbook の正本と、その根拠リサーチ | design=正本／research=鮮度3種混在 |

### パイプライン全体像（エントリポイント）

```
pack-v1.json（手書き入力）
  └─ scripts/run-weekly.sh <race_id>  ← 唯一の司令塔（冪等な状態機械）
       ① run-experts.sh      → predictions/v1/<expert>.json ×10（予想10人 jinba-*）
       ② aggregate.mjs       → predictions/aggregated-v1.json（Borda＋log pooling）
       ③ build-betting-input.mjs → betting-input-v1.json（★リーク遮断の実体）
       ④ run-bettors.sh      → bets/v1/<bettor>.json ×5（配分5人 haibun-*）
       ⑤ aggregate-bets.mjs  → bets/aggregated-v1.json（券種別 stake 平均）
       ⑥（人手ゲート）提出 prediction-v1.md ＋ betting-v2.md
       ⑦ レース後 result.json（手書き）→ score-race.mjs → data/scoring/<race_id>.json ＋ weights.json
```

### AI が混乱する主要ポイント（README で潰すべき的）

| # | 混乱の種 | 実態 |
|---|---|---|
| 1 | ルートに入口が無い | README/AGENTS/CLAUDE 不在。`site/README.md` は site 限定で誤誘導しうる |
| 2 | `.codex/agents/*.toml`（10本） | **死蔵**。`run-experts.sh` から未参照、内部パスが `.Codex/agents`（大文字）で壊れ、人格・backend値・契約条項が `.claude/agents/*.md` 正本から乖離 |
| 3 | `aggregated-v1.json` が2箇所 | `predictions/aggregated-v1.json`（予想集約）と `bets/aggregated-v1.json`（買い目集約）は同名・別物 |
| 4 | `v1` の三義性 | (a) `predictions/v1`・`bets/v1`＝実行ラウンドのフォルダ、(b) `pack-v1.json`・`aggregated-v1.json`＝集約世代、(c) `betting-v1.md→v2.md`＝改訂版（v2が最終） |
| 5 | 「専門家」が2集団 | 予想 expert（10人 jinba）≠ 配分 bettor（5人 haibun）。`expert_id` と `bettor_id` を取り違えやすい |
| 6 | レース名の二系統 | `data/experts/takarazuka-2026.json`（レース名スラッグ）と `runs/202609030411/`・`data/scoring/202609030411.json`（netkeiba race_id）が同一レース。対応表が無い |
| 7 | 創作の数値を実装と誤認 | `円卓制度.md` の降格点・閾値は**物語用の架空数値**で `score-race.mjs` の実装ではない。監査役/降格戦/外部挑戦者も架空（対応エージェント無し） |
| 8 | `site/app.js` のデータ性質 | runs/data を「実行時に読む」のではなく `data/scoring/<id>.json` 等を**手で転記した静的スナップショット**。画像は `../slides/...` で越境参照 |
| 9 | budget=10000 が3箇所固定 | `build-betting-input.mjs` ＋ `bettor-output.schema.json` ＋ `aggregate-bets.mjs`。片方だけ変えると `pass_jpy` がズレる |
| 10 | 専門家名簿が4箇所ハードコード | `run-experts.sh`／`run-bettors.sh`／`run-weekly.sh`(smoke_test)／`build-betting-input.mjs:PERSONA_NAMES`。名簿変更の同期漏れは**リーク tripwire を静かに無効化しうる** |

### 保護リスト（リネーム/移動/削除すると下流が割れる — 整理前に必読）

1. **`runs/202609030411/` 全ファイル** — `score-race.mjs` が `pack-v1.json`・`aggregated-v1.json` を **v1固定でハードコード読み**。`docs/design/weekly-ops.md` がスキーマ例・テンプレとして名指し参照。**改名・移動禁止**（新レースは `runs/<新race_id>/` を作る）。
2. **`slides/assets/characters/` の site 被参照画像（約11枚）** — `site/app.js` が `'../slides/assets/characters/*.png'` で越境参照。特に `yuko-soft-v2.png`（site と slides v1 が依存・slides v2 は `yuko.png`）と `lineup-real-preview.png`。**yuko画像の統合/リネームは site/app.js と slides v1 の参照を張り替えてから**。
3. **`aggregate.mjs` の race_id フォールバック `"202609030411"` ハードコード** — pack/予想に race_id が無いと過去IDが混入。pack 作成時は race_id 必須。
4. **`build-betting-input.mjs` の `PERSONA_NAMES` / `FORBIDDEN_KEYS`** — リーク遮断の実体。名簿を増減するなら上記#10の4箇所を同期（さもないと tripwire が素通り）。
5. **budget=10000 の3箇所** — schema・aggregate-bets・配分agent定義。同時改修が必要。

---

## 成果物

整理の射程は「AI が迷わないナビゲーション層の新設」＋「最小限のリポジトリ衛生」＋「（承認後の）冗長物の削除」。具体的な成果物：

1. **`README.md`（ルート・新規・最重要）** — このリポジトリの「地図」。4本柱（何か／どう動かすか／どこに何があるか／触ってよい所と凍結すべき所）。本プラン末尾に骨子案を添付。
2. **`AGENTS.md`（ルート・新規）** — エージェント対応表。jinba-*=予想10人（ExpertPrediction出力）／haibun-*=配分5人（BettorPortfolio出力）／schema 2種／各人のバックエンド（Claude直/codex/gemini）／`.claude=現行`・`.codex=死蔵`の宣言。
3. **`runs/README.md`（新規）** — run-artifact カタログ＋命名凡例。どれが手書き正本（pack/result/md）でどれが再生成可か、`v1` 三義性、race名スラッグ⇔race_id 対応表。
4. **`.codex/agents/STATUS.md`（新規）または `.codex/agents/*.toml` 削除** — 死蔵の明示（どちらにするかは Sho 判断、後述）。
5. **`.gitignore` 拡張** — `tmp/`・`*.lock`（`.claude/scheduled_tasks.lock`）・`runs/**/*.log`・`runs/**/*.raw` を追記（追加のみ、何も壊さない）。
6. **既存ファイルへの軽微な註記追記** — 誤読を防ぐ1〜数行のコメント/註記（site/README・app.js 先頭・円卓制度.md 冒頭・sayuri の点数規約・cli-invocation の鮮度註記）。
7. **（Sho 承認後の破壊的整理）** — `slides/assets.zip` 削除（17MB）、`.codex/agents/*.toml` 削除、`ChatGPT Image....png` 削除/リネーム、`02-誠リニューアル成功レポート.md` 移動、`slides/keiba-strategy v2 (bundle).html` リネーム、没画像の `unused/` 退避。

すべて**未コミットのまま残す**（Sho レビュー後にコミット）。

---

## 実行ステップ

整理は「破壊リスク・即効性」で段階分けする。Step 1〜3 は純増・追加のみで何も壊さず即効。Step 4 は順序厳守の参照張り替え。Step 5 は Sho 承認ゲート。

### Step 0: 準備
- 本プランを `./.claude/plans/repo-organization.md` と `~/.claude/plans/repo-organization.md` の両方に保存（プラン両置きルール）。
- メモリは既存の `project_k-ba-man.md` に「四層構造＋整理方針」を1行追記（新規ファイルは作らず既存に集約）。

### Step 1: ナビゲーション層の新設（純増・破壊ゼロ・最優先）
1. **`README.md`（ルート）** を執筆。骨子は末尾「付録A」。
   - 設計正本2本（`docs/design/expert-subagents.md`／`weekly-ops.md`）へ筆頭リンク。
   - エントリポイント `bash scripts/run-weekly.sh <race_id>` を明示＋「個別スクリプト直叩きは冪等ゲート（QUORUM=8／MIN_BETTORS=3／リーク tripwire）をバイパスする」警告。
   - 四層ディレクトリマップ＋命名凡例（#3/#4/#5/#6 を集約）。
   - 「触ってよい所／凍結すべき所／死蔵（誤認注意）／再生成可」の4分類。
   - 原則3点（馬券は実購入しない・外部アクセスはGET読み取りのみ・見送りも投資判断）。
2. **`AGENTS.md`（ルート）** を執筆 — 成果物#2 の対応表。`.claude/agents/` に jinba（予想10）と haibun（配分5）が同居する点、schema 2種の契約、backend識別子（claude-*／codex-gpt-5.5／gemini-2.5-*）と effort（high/medium/low、xhighはCLI内部設定でスキーマ値ではない）の三層を明記。
3. **`runs/README.md`** を執筆 — 成果物#3。`runs/<race_id>/` 直下のファイルカタログ（pack-v1.json=手書き正本／result.json=手書き正本／predictions・bets・aggregated・betting-input=再生成可／*.md=半生成の提出物）。`v1` 三義性の凡例。`takarazuka-2026 = 202609030411` の対応表。
4. **`.codex/agents/` の扱いを確定**（Sho 判断・後述「オープンな判断事項」）。削除しないなら `.codex/agents/STATUS.md` に「未使用の実験的ポート。正本は `.claude/agents/*.md`。再利用時は schema/.sh の不在・`Codex` 大文字パスバグ・backend値・§3.3/§3.4 欠落を要修正」と明記。

### Step 2: `.gitignore` 拡張（追加のみ）
- 末尾に追記：`tmp/`、`*.lock`（または `.claude/scheduled_tasks.lock`）、`runs/**/*.log`、`runs/**/*.raw`。
- `.DS_Store` は既に効いている（追跡0件）ので追記不要。
- 既コミット済みの `runs/202609030411/predictions/v1/*.log` を追跡から外すかは Sho 判断（フォールバック判定の唯一の痕跡として価値あり。残す＝keep が既定）。

### Step 3: 既存ファイルへの誤読防止註記（軽微・低リスク）
- `site/README.md` の「Data sources」を「**出典（手動転記元）であり実行時に読み込むものではない**」と明確化。レース追加時に `RACES` と `HORSES` を手編集する手順を追記。
- `site/app.js` 先頭に「データは `data/scoring/<id>.json` と `slides/assets/characters/` への手動転記。参照ファイルをリネーム/移動すると壊れる」コメント。
- `docs/worldbuilding/yosouya-10/円卓制度.md` 冒頭に「降格点・閾値は**物語用の架空数値**であり `score-race.mjs` の実装ではない」警告を格上げ。
- `docs/worldbuilding/yosouya-10/README.md` に「本設定集は予想10人(jinba)のみ。配分5人(haibun)は扱わない」スコープ1文。
- `.claude/agents/haibun-sayuri.md` に「方針＝5点目安／スキーマ＝ハード上限12」の1行（矛盾に見せない）。
- `docs/research/cli-invocation.md` 冒頭に「2026-06-12 スナップショット・要定期再検証」の鮮度註記を強める。
- `docs/design/weekly-ops.md` に「専門家名簿は#10の4箇所を同期（将来 roster.json 単一化）」の註記。

### Step 4: cross-subsystem 参照の張り替え → その後に画像統合（順序厳守）
- **先に** `site/app.js` と `slides/keiba-strategy.html`（v1）の yuko 画像参照を、採用版（要 Sho 確認：`yuko-real.png` か `yuko.png` か `yuko-soft-v2.png` か）に統一。
- **その後に** `slides/assets/characters/` の没画像整理（Step 5）を行う。逆順だと site と slides v1 が同時に割れる。

### Step 5: Sho 承認ゲート — 破壊的整理（追跡ファイルの rm/mv）
以下は追跡ファイルの削除/移動で履歴・参照に影響。**自動実行せず提案に留め、Sho 承認後に実施**：
- `slides/assets.zip` 削除（`git rm`、`slides/assets/` と完全重複・17MB削減。配布時に再 zip 可）。
- `.codex/agents/*.toml`（10本）削除（Step 1-4 で「死蔵」確定済みなら）。
- `slides/assets/characters/ChatGPT Image Jun 14, 2026, 08_58_54 PM.png` — 未参照。用途無ければ削除、残すなら kebab-case にリネーム。
- 没・派生画像を `slides/assets/characters/unused/`（または `stock/`）へ退避（`*-real.png` 群・`mob*`・`lineup-*-preview`・`*-old.png`）。`legacy/`・`variants/`・`yuko-iterations/` は既に隔離済みなので維持（容量削減を優先するなら `yuko-iterations/*-chroma.png` 削除候補）。
- `docs/worldbuilding/yosouya-10/characters/02-誠リニューアル成功レポート.md` を `docs/worldbuilding/yosouya-10/_process/` へ移動（`02-` 連番を外しキャラ列挙の水増しも解消）。
- `slides/keiba-strategy v2 (bundle).html` をスペース無し名（例 `keiba-strategy-bundle.html`）にリネーム、または v1 へ統合。

---

## 整理順序と破壊リスクの分離

| 段階 | 内容 | 破壊リスク | コミット |
|---|---|---|---|
| Step 1 | ルートREADME / AGENTS.md / runs/README.md / STATUS.md 新設 | **ゼロ（純増）** | Sho レビュー後 |
| Step 2 | `.gitignore` 拡張 | **ゼロ（追加のみ）** | Sho レビュー後 |
| Step 3 | 既存ファイルへの註記追記 | 低（コメント追加のみ） | Sho レビュー後 |
| Step 4 | yuko 参照の張り替え→画像統合 | 中（順序厳守で回避） | Sho レビュー後 |
| Step 5 | zip/toml/没画像の削除・移動 | 高（追跡ファイルの rm/mv） | **Sho 明示承認 → レビュー後** |

→ Step 1〜2 で AI ナビと衛生の大半が片付き、破壊リスクのある Step 4〜5 を後段に分離できる。

---

## 検証方法

- **README/AGENTS の妥当性**: 「初見の AI がこの repo で『今週の予想を作れ』と言われたら、README だけ読んで `run-weekly.sh` に辿り着けるか」を基準に Sho がレビュー。
- **混乱ポイント10件の被覆**: 上表の各項目が README/AGENTS/runs-README のどこかで明示的に解消されているかチェック。
- **保護リスト不破壊**: Step 4-5 実施時、`site/index.html` をブラウザで開いて画像が割れないこと、`slides/keiba-strategy.html` が表示できることを確認。`grep -rn yuko site/ slides/` で参照先の整合を確認。
- **gitignore 効果**: `git status` に `tmp/` が出なくなること。
- **凍結尊重**: `runs/202609030411/` 配下が一切変更されていないこと（`git status` で確認）。

---

## スコープ外（このプランでは扱わない）

- **コードのリファクタ**: 専門家名簿の `roster.json` 単一化、budget のパラメータ化、JSON抽出ロジックの重複解消、score-race の `--version/--pack` 対応 — いずれも「整理（ナビゲーション＋衛生）」ではなく機能改修。README に「既知の負債」として記載するに留め、改修は別フェーズ。
- **サイトのリデザイン実装**: `docs/design/site-redesign/` の v1/v2 提案は将来計画。本プランは参照を壊さない範囲の註記のみ。
- **新レースの運用**: 週次運用そのものは `weekly-ops.md` の領分。
- **エンジン仕様の変更**: 集約手法・配分方針・スキーマ契約には触れない。

---

## オープンな判断事項（Sho に確認 — プランレビュー時に決定）

1. **`.codex/agents/*.toml`（10本）は削除 or 残して STATUS.md で死蔵明示か？**
   - 推奨：削除（codex 経由起動を将来本当に使う計画が無ければ）。残すなら STATUS.md 必須。
2. **`slides/assets.zip`（17MB）は削除してよいか？**
   - 推奨：削除（`slides/assets/` と完全重複・再 zip 可能）。
3. **`docs/design/site-redesign/`（未追跡3点）はコミット対象に含めるか、下書きとして untracked のままか？**
   - 推奨：手書き設計正本なのでコミット対象に含める（現状「宙ぶらりん」を解消）。
4. **`.vscode/settings.json`（個人テーマ・追跡済み）は維持か untrack か？**
   - 推奨：チーム共有を望まないなら `.gitignore` 化。望むなら維持。
5. **yuko の採用版立ち絵はどれか（`yuko-real.png` / `yuko.png` / `yuko-soft-v2.png`）？** — Step 4 の参照統一に必要。
6. **`runs/202609030411/predictions/v1/*.log`（既コミット）は追跡継続か追跡解除か？**
   - 推奨：keep（バックエンド・フォールバック判定の唯一の痕跡）。

---

## 付録A: ルート README.md 骨子案（レビュー用）

```markdown
# k-ba-man — 集合知・競馬予想ハーネス

10人の予想専門家と5人の資金配分専門家による2段階集合知で、毎週の重賞を予想する
AIハーネス。そして、その予想の過程・履歴をコンテンツとして見せるサイト/スライド/
キャラクター設定の集合体。目標レース: 2026年 宝塚記念の週次運用。

## このリポジトリは何か（3行）
- エンジン: 予想10人(jinba)→集約→配分5人(haibun)→集約→採点 の決定的パイプライン
- 履歴: レース単位の予想・買い目・採点の凍結記録
- コンテンツ: 10人をキャラ化した創作世界・公開サイト・採用/登壇スライド
- 設計の正本 → docs/design/expert-subagents.md（仕様）/ docs/design/weekly-ops.md（運用）

## 動かし方
- 通常運用: `bash scripts/run-weekly.sh <race_id>`（冪等な状態機械。ゲートで停止）
- ⚠ 個別スクリプト直叩きは冪等ゲート(クォーラム/配分数/リーク tripwire)をバイパスする
- 原則: 馬券は実購入しない / 外部アクセスはGET読み取りのみ / 見送りも投資判断

## ディレクトリ地図（四層）
- engine   : scripts/（接着）, .claude/agents/（jinba×10・haibun×5・schema×2 → AGENTS.md）
- 履歴     : runs/<race_id>/（→ runs/README.md）, data/scoring/, data/experts/
- content  : docs/worldbuilding/（キャラ正本・創作）, site/（公開SPA）, slides/（採用資料）
- 設計     : docs/design/（正本）, docs/research/（背景資料）

## 命名と落とし穴（AI 必読）
- aggregated-v1.json は2箇所: predictions/（予想集約）と bets/（買い目集約）。必ずフルパスで呼ぶ
- v1 は3義: フォルダ(実行ラウンド) / ファイル世代 / md改訂(betting は v2 が最終)
- expert(予想10人)≠ bettor(配分5人)。両方「専門家」と呼ぶので id を取り違えない
- レース名: takarazuka-2026（スラッグ）= 202609030411（netkeiba race_id）
- budget=10000 は3箇所固定（build-betting-input / schema / aggregate-bets）。変更は同時改修
- .codex/agents/*.toml は死蔵。現行の正本は .claude/agents/*.md
- 円卓制度.md 等の降格点・監査役・降格戦は物語用の創作。実装には存在しない

## 触ってよい所 / 凍結 / 再生成可
- 編集対象: scripts/, .claude/agents/, docs/design/, docs/worldbuilding/characters/, site/, slides/*.html
- 凍結(上書き禁止): runs/202609030411/, data/scoring/202609030411.json（新レースは runs/<新id>/）
- 再生成可: runs/*/predictions, bets, *aggregated*, betting-input, data/scoring/<id>.json
- 既知の負債: roster 4箇所重複 / budget パラメータ化未対応 / 市場ベースライン未実装 等
```
