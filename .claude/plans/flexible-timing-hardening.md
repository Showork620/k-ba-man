# 実行タイミング頑健化 — 「3h前が理想・前日夜/当日朝でも壊れない」を実運用レベルへ

## Context

- 要請（Sho）: **発走3時間前の手動実行が理想だが、当日朝でも前日の夜でも実行を許容する**設計にしたい。
- この要請の骨格は既に `.claude/plans/done/flexible-execution-timing.md` で設計され、**大半が実装済み**:
  - `run-weekly.sh` に `--race-time` / `--refresh-from` / `--what-now` / `--plan`（品質レベル表示・カテゴリ別鮮度）実装済み
  - `aggregate.mjs` に `deriveQualityLevel()` ／ `quality_level` ／ `degraded_experts` 出力、複数dir overlay 対応
  - `run-experts.sh` に `--only` / `--out`、品質階層 **L1(ワンショット) → L2-odds/L2-baba → L3** が稼働
- **しかし「前日夜・当日朝でも壊れない」を名乗るには残ギャップがある**。本プランはそのギャップを埋める**次イテレーション（頑健化）**。done プランが定義した L1/L2/L3 モデルは前提として維持し、否定しない。
- 大原則: **後方互換**（既存の `run-weekly.sh <id>` / `--plan` 挙動を一切壊さない。新機能は opt-in か無害な追加のみ）、**凍結尊重**（`runs/202609030411/` を再生成しない）、**コミットは Sho レビュー後**。

### 3つの実行タイミングと、現状それぞれが「壊れる/危うい」点

| タイミング | 理想/許容 | 現状の問題 |
|---|---|---|
| **発走3時間前** | ★理想（馬場確定 + 下流に3h） | アップグレード経路（L2/L3）が手動多dir集約必須で footgun（G1） |
| **当日朝** | 許容（オッズは当日・馬場は予報） | 当日朝に作った充実 pack でも品質が L1 と過小評価（G3）。残り時間表示は動く |
| **前日の夜（T-1）** | 許容（最もシンプルな L1 ワンショット） | **`--race-time` の残り時間計算が当日固定で破綻 → `--what-now` が誤案内（G2）**。まさにこのケースを直撃 |

---

## 現状の実装（検証済み・既に動いているもの）

> 「何を作り直さなくてよいか」を明示する。下記は実コードを読んで確認済み。

| 機能 | 実装箇所 | 状態 |
|---|---|---|
| ワンショット（L1）で pack→予想→集約→配分→買い目→採点 を1コマンド | `run-weekly.sh`（冪等な状態機械） | ✅ 稼働 |
| 品質レベル L1/L2-odds/L2-baba/L3 の自動判定 | `aggregate.mjs:238-265`（`deriveQualityLevel`/`listDegradedExperts`）→ `aggregated-v1.json` に `quality_level`/`degraded_experts` | ✅ 稼働 |
| `--plan` に品質レベル・カテゴリ別鮮度・アップグレード案内 | `run-weekly.sh:271-343`（`read_quality_level`/`report_category_status`） | ✅ 稼働 |
| `--what-now`（残り時間と状態から次の一手） | `run-weekly.sh:353-439` | ⚠ 動くが日付バグ（G2） |
| `--refresh-from <step>`（古い成果物を消して再実行） | `run-weekly.sh:444-467` | ⚠ 動くが再集約が単一dir（G1） |
| カテゴリ部分再実行 `--only`/`--out` | `run-experts.sh:15-16,109-111` | ✅ 稼働 |
| 複数dir overlay 集約（後dir優先で上書き） | `aggregate.mjs:34-54` | ✅ 稼働（ただし run-weekly が呼ばない＝G1） |

**結論**: 機能の土台は揃っている。残るのは「非理想タイミング（前日夜・当日朝→3h前）の経路に潜む欠陥と過小評価」の解消。

---

## 設計目標（このプランの達成基準）

1. **どの時刻に実行しても残り時間・推奨が正しい** — 前日夜（発走は翌日）でも `--race-time`/`--what-now` が正値・正しい分岐を返す。
2. **アップグレードがワンコマンド** — 「朝にワンショット → 3h前に馬場更新」を、手動多dir集約を覚えなくても1コマンドで安全に再実行できる。当日情報を黙って捨てない。
3. **pack の鮮度が品質に正しく反映** — 当日朝に作った充実 pack のワンショットを L1 と過小評価せず、「実質どの鮮度か」を可視化する。
4. **無人/リモコン実行でも沈黙failしない** — スモークがゲートとして効き、完了/失敗が通知される（自動化フォールバック時の最終防衛線）。
5. **採点が入力鮮度と能力差を混同しない** — 採点カードに品質レベルが残る。

---

## 残ギャップと最小修正

> 各ギャップ: 症状 → 証拠(file:line) → 「前日夜/当日朝でも壊れない」目標への影響 → 最小修正（後方互換）→ 優先度。

### G2 ★最重要: 前日夜（T-1）で残り時間計算が破綻し `--what-now` が誤案内する

- **症状**: `--race-time HH:MM` は「**本日**の日付 + HH:MM」で発走 epoch を計算する。前日夜に実行すると発走は翌日なので、残り時間が負値（例: 金22:00・発走翌15:30 → 約 −6.5h）になり、`--what-now` 決定木が `else` 分岐（「⚠ 下流処理の時間が足りない」）を返す。**ユーザーが明示的に望む「前日夜実行」をシステムが「手遅れ」と誤判定する。**
- **証拠**（verify-timing-gaps WF で実機再現済み: T-1 22:00・発走翌15:30 → `htr=-6.5`, `_htr_int=-6` で全分岐を外れ `else` 着地）:
  - `run-weekly.sh:141` `hours_to_race()` — `race_epoch="$(... date -j -f '%Y-%m-%d %H:%M' "$(TZ=Asia/Tokyo date +%Y-%m-%d) $RACE_TIME" ...)"`。日付が常に**今日**。
  - `run-weekly.sh:142-145` `diff_s` は負値でもそのまま返す（コメント「発走済みでもそのまま返す」）→ T-1 は発走前なのに負値。
  - `run-weekly.sh:380-399`・`403-414` `--what-now` の `_htr_int="${_htr%.*}"` 分岐は `htr` が負だと全 `-gt` を外れ「時間切れ」側（else / 切迫案内）へ誤着地。pred 未実行ブランチも L1 完了ブランチも同根。
  - `run-weekly.sh:282` `--plan` 表示が **「発走: 本日 ${RACE_TIME}」と「本日」固定**＋残り時間が負表示。
  - `run-weekly.sh:62,117-122` `--race-time` は `HH:MM` のみ受理、**日付を渡す手段が無い**（`--race-date`/ISO/post_time いずれも未対応）。
  - **重要**: `pack-v1.json` は既に `race.date`（例 `2026-06-14`）と `race.post_time`（例 `15:40`）を持つのに run-weekly はこれを読まず `date +%Y-%m-%d` で再構成している＝**正データが手元にあるのに使っていない**。
- **影響**: 前日夜シナリオ（L1 の最も自然な運用）で `--what-now` が「⚠ 時間が足りない／配分は簡略化を」という**真逆の指示**を返し、最良の実行窓を逃す。`--plan` の残り時間も負表示。パイプライン本体（469行〜）は htr 非依存で通るので「壊れる」のは**案内の正しさ**（頑健性目標の「正しい誘導」が機能不全）。
- **最小修正**（後方互換・優先順位付き多層フォールバック）:
  1. **pack から発走日時を読む（最優先・追加引数ゼロ・既存packで即効）** — `hours_to_race()` で `jq -r '.race.date'` / `.race.post_time` を読み race epoch を算出。`--race-time` 未指定でも pack に日時があれば残り時間表示が可能になる（137行の早期 return を緩める）。検証: pack の `2026-06-14 15:40` で T-1 22:00 → `htr=+17.7h`（正）。
  2. **明示 `--race-date YYYY-MM-DD`（pack より優先）** — pack に日付が無い/上書きしたい時用。`--race-time` を ISO `YYYY-MM-DDTHH:MM` 受理に拡張しても可。
  3. **bare `HH:MM` の「次に来る HH:MM」フォールバック** — pack も日付も無い時、`now > 本日HH:MM` なら翌日扱い（`date -j -v+1d`、macOS で動作確認済み）。`--race-time` 単独の後方互換を保ちつつ当日固定より頑健。
  4. `--plan:282` の「本日」固定をやめ算出した発走月日を表示。発走日時は G4 の execution-state.json に永続化し再入力不要に。weekly-automation §6/§8 TODO#3（発走時刻 ISO を単一入力にトリガ算出）と同じ真実の源を共有。
- **優先度: P0**（ユーザー要請の核心「前日夜でも実行」を直撃する実バグ。WF 判定も「致命的」）

### G1 ★: アップグレード時に run-weekly が当日情報を自動 overlay せず、手動多dir集約が必須

- **症状**: `run-weekly.sh` 内蔵の予想集約は `predictions/v1` 単独しか `aggregate.mjs` に渡さない。L1→L2/L3 のアップグレード（朝にオッズ更新／3h前に馬場更新）では、**手動で多dir aggregate を先に回さないと** v2-odds/v2-baba が無視され、当日情報を捨てた古い集約が静かに下流へ流れる。
- **証拠**:
  - `run-weekly.sh:532` `node scripts/aggregate.mjs "$PRED_DIR" "$PACK"`、`run-weekly.sh:101` `PRED_DIR="$RACE_DIR/predictions/v1"` — 単一dir固定。
  - `run-weekly.sh:444-467` `--refresh-from` は成果物を消すが、その後の再集約も同じ単一dir経路。
  - `aggregate.mjs:34-54` は複数dir overlay 可能（＝集約側は対応済み、呼び出し側が使っていないだけ）。
  - weekly-automation.md:71-73, §8 TODO#4 が「現状は手動多dir aggregate を先に回す運用で回避」と明記。
- **影響**: 「朝にワンショット → 3h前に馬場だけ更新」という、まさに許容したい運用が、手順を1つ忘れると**当日馬場を反映しない買い目**を生む（沈黙の劣化）。しかも `quality_level` は L1 のまま出るので「再実行したのに L2 に上がらない」だけで、捨てた事実に気づきにくい。**現状 `runs/*/predictions/v2-*` は1つも存在せず＝まだ踏んでいない地雷。L2/L3 を初めて狙う週（＝理想の3h前運用）に発火する。**
- **最小修正**（後方互換）: run-weekly が集約時に `predictions/v1` ＋ **存在する `predictions/v2-odds`・`predictions/v2-baba`** を昇順（overlay は後dir優先なので `v2-odds → v2-baba`）で `aggregate.mjs` に渡す（v1先頭固定）。v2-* が無ければ引数は `v1` のみ＝**現状と完全同一挙動**。`aggregate.mjs` 側は変更不要。さらに「`aggregated-v1.json` より新しい `predictions/v2-*/` があれば自動で再集約（`find -newer`）」で `--refresh-from` を忘れても陳腐化しない（weekly-automation §7「鮮度の落とし穴」を構造的に解消）。
  - **連動して直す表示側のズレ**（WF 指摘）: `report_category_status`（`run-weekly.sh:161-185`）と `listDegradedExperts`（`aggregate.mjs:248`）は **`predictions/v1` のファイルしか見ない**。手動 overlay で正しく L2 集約しても `--plan` のカテゴリ内訳が「v2-odds 未更新」と誤表示しうる。overlay 修正と合わせ、表示も overlay 後の値（`v2-*/` の最新）を見るよう揃える。
  - **暫定の地雷可視化**: 本体修正前でも、`--refresh-from aggregate` のヘルプ（`run-weekly.sh:26-28`）に「v1 のみ再集約。v2-* を含めるには手動 aggregate」の注記を足すだけで誤用を減らせる。
- **優先度: P0**（理想の3h前アップグレード経路を直撃）／※後方互換上は完全安全（v2-* 不在のワンショットには無影響）なので、**L2/L3 運用を始める週までに必ず塞ぐ**位置づけ。

### G3: 当日朝に作った充実 pack でも品質が L1 と過小評価される

- **症状**: 品質判定は予想JSONの `pack_version` のみを見る。当日朝に当日オッズ入りの pack を作ってワンショットしても `pack_version` は `"v1"` のままなので L1 判定。実質 L2-odds 相当でも数値上は最低ランクに見える。
- **証拠**:
  - `pack-v1.json` の `pack_meta` には `retrieved_at`（例 `"2026-06-12T22:00:00+09:00"`）が**存在するが、`aggregate.mjs`/`run-weekly.sh` は品質判定に使っていない**。`data_freshness`（odds/baba 別の鮮度）に相当する構造化フィールドは無い。
  - `aggregate.mjs:238-246` の判定は `byId[id]?.startsWith("v2-odds")` のみ＝ pack の中身の鮮度は不問。
- **影響**: 「当日朝にまとめて実行」を選んだ週、提出物・`--plan` が実態より低品質に見え、Sho の判断材料が歪む。
- **最小修正**（後方互換・手書き pack 前提）: pack_meta に任意フィールド `data_freshness: { odds: "prerace-day"|"same-day-am"|"same-day-3h", baba: ... }` を追加できるようにし、`aggregate.mjs`/`--plan` が「pack 作成: 当日朝 → オッズ実質当日」と**注記**を添える（品質レベルは保守的に据え置きつつ、`pack_meta.retrieved_at` と `data_freshness` を可視化）。pack は手書きなので強制はせず、無ければ従来通り。
- **優先度: P1**

### G4: execution-state.json 未実装（発走日時・ゾーン完了履歴の永続先が無い）

- **症状**: 品質は毎回 `aggregated-v1.json` から動的算出（`run-weekly.sh:149-152`）。これで8割は足りるが、(a) **発走日時の永続先が無い**（G2 で毎回 `--race-time` 再入力が必要）、(b) pack 作成時刻・各ゾーン完了時刻の履歴が残らず、(c) weekly-automation §7 のハートビート/dead-man's switch の土台が無い。
- **証拠**: リポジトリ全体に `execution-state.json` の生成/参照なし（done プラン §201-217 が提案するも未実装）。
- **最小修正**: 各ステップ完了時に `runs/<id>/execution-state.json` を追記更新する薄いヘルパ（`race_datetime`・各ゾーン `completed_at`・`pack_meta.retrieved_at`・`quality_level`）。`--plan`/`--what-now` はこれを優先、無ければ動的算出にフォールバック（後方互換）。**G2 の発走日時永続化の受け皿**を兼ねる。
- **優先度: P1**（G2 を「一度入れたら覚える」UXにするために効く）

### G5: スモークが presence のみ・非ゲート、通知/dead-man's switch 無し

- **症状**: `run-weekly.sh:233-245` `smoke_test()` は `command -v`（バイナリ存在）だけで、認証切れ/クォータ切れ/空応答/trust エラーを検知できず、しかも**警告止まり（非ゲート）**。off-hours の前日夜実行や Remote Control フォールバックで codex/gemini 認証が切れていると、**全員 Claude フォールバックで多様性が静かに崩れたまま完走**しうる。完了/失敗の通知経路も無い。
- **証拠**: `run-weekly.sh:233-245`（presence のみ・`claude` 不在以外は警告継続）、`run-weekly.sh:248-262` `report_backend_health()`（実出力の `backend` から fallback を検出＝事後検知はある）。`.claude/skills/cli-smoke-test`（実1往復テスト）は存在。weekly-automation §8 TODO#1,#5。
- **最小修正**（opt-in）: 本番/無人モード（例 `--strict-smoke` か自動化ラッパー）では smoke を `cli-smoke-test`（実1往復）に置換し**失敗を停止＋通知**（fallback 容認は `--allow-fallback` 明示時のみ）。手動既定は現状維持。完了/停止の通知は Mac 常駐と独立した1経路（PushNotification 等）。
- **優先度: P2**（手動運用には必須でないが、自動フォールバックの最終防衛線）

### G6: 採点カードに品質レベルが残らず、鮮度と能力差を混同しうる

- **症状**: `score-race.mjs` は `predictions/v1` と `aggregated-v1.json`（任意・ベースライン用）を読むが `quality_level` を記録しない。20レース蓄積後の重みづけで L1（入力鮮度低）の低スコアと L3 の低スコアを同列に扱うと、**入力鮮度の差が専門家の能力差と誤認**される（特に馬場依存組は L1 で構造的に不利）。
- **証拠**: `score-race.mjs:6,8,11,34-36,210-211` — 読む/書く対象に `quality_level` 無し。`data/scoring/<race_id>.json` と `weights.json` を出力。
- **最小修正**: score-race が `aggregated-v1.json`（or execution-state）から `quality_level` を読み `data/scoring/<id>.json` に転記するだけ（**採点ロジックは不変**）。重みづけ時の扱い（L1除外 or 品質別比較）は将来。
- **優先度: P2**

### G7: バックエンド fallback の現状（修正でなく「明文化すべき注意点」）

- **現状**: codex/gemini 担当（予想: 誠/鉄平=codex, 陽菜/優子=gemini ／ 配分: 一徹=codex, 律=gemini）は CLI 不在/失敗時に Claude へ fallback し、`backend` フィールドに痕跡が残る（`report_backend_health` が検出）。off-hours/前日夜の実行で認証が切れていると静かに多様性が縮退しうる。`--only` 部分実行ではクォーラム判定が回らない（全10人実行時のみ）点も運用上の注意。
- **対応**: 修正必須の欠陥ではない。**本プラン/README に「前日夜・当日朝の off-hours 実行前に `.claude/skills/cli-smoke-test` で実往復確認」**を運用注意として明記（G5 と接続）。

---

## 成果物（変更点のまとめ）

1. **`run-weekly.sh`**: (a) 発走日時の日付対応（`--race-time` ISO 受理 + bare HH:MM の「次に来る」解釈 / 任意 `--race-date`）= G2、(b) 集約を `predictions/v1` + 存在する `v2-*` の自動多dir overlay + mtime 鮮度再集約 = G1、(c) `--plan`/`--what-now` が execution-state を優先参照 = G4、(d) 任意 `--strict-smoke`/`--allow-fallback` = G5。
2. **`aggregate.mjs`**: pack_meta の `retrieved_at`/`data_freshness` を読み、`aggregated-v1.json` に鮮度注記を添える（品質レベル算出ロジックは不変）= G3。
3. **`runs/<id>/execution-state.json`**（新規・任意生成）: 発走日時・ゾーン完了時刻・pack 鮮度・品質レベルの永続先 = G4。
4. **`score-race.mjs`**: `quality_level` を採点カードへ転記 = G6。
5. **通知ヘルパ**（任意・自動化用）: 完了/停止を独立経路で通知 = G5。
6. **ドキュメント**: weekly-automation.md §8 TODO#3/#4/#5 と本プランの対応を明記、README/運用メモに「off-hours 実行前のスモーク」を追記 = G7。

---

## 実行ステップ（優先度順・各ステップ後方互換）

### Step 1（P0）: G2 発走日時の日付対応
- `run-weekly.sh` の `hours_to_race()` を「発走日時（日付込み・Asia/Tokyo）」基準に。`--race-time` を ISO 受理に拡張、bare HH:MM は「次に来る HH:MM」解釈。`--race-date` 追加可。
- **検証**: 前日22:00 / 発走翌15:30 で `--what-now --race-time 2026-06-21T15:30`（または `--race-date`）が「残り 17.5h・前日夜ワンショット推奨」を返す。bare `--race-time 15:30` を金22:00に打っても翌日扱いで正値。

### Step 2（P0）: G1 run-weekly の自動多dir overlay
- 集約呼び出しを「`predictions/v1` + 存在する `predictions/v2-odds`・`predictions/v2-baba`（先頭 v1 固定）」に。v2-* 不在なら現状同一。
- `aggregated-v1.json` より新しい `predictions/v2-*/` を検出したら自動再集約（鮮度判定）。`--refresh-from` 後の再集約もこの多dir経路を通す。
- **検証**: 朝にワンショット(L1) → `--only goro,misaki,kenta --out v2-baba` → `run-weekly <id> --yes` だけで `quality_level: L2-baba` になり、betting-input/配分が再生成される（手動 aggregate 不要）。

### Step 3（P1）: G4 execution-state.json
- 各ステップ完了時に追記更新。`--plan`/`--what-now` が優先参照、無ければ動的算出にフォールバック。Step 1 の発走日時の永続先を兼ねる。

### Step 4（P1）: G3 pack 鮮度の可視化
- `aggregate.mjs`/`--plan` が `pack_meta.retrieved_at`/`data_freshness` を表示・注記。pack 側フィールドは任意（無ければ従来通り）。

### Step 5（P2）: G6 採点への品質転記 / G5 スモークゲート＆通知
- `score-race.mjs` に `quality_level` 転記。自動化モードで `cli-smoke-test` 実往復ゲート＋通知。

---

## 後方互換性（厳守）

- `bash scripts/run-weekly.sh <id>` / `--plan` / `--yes` の既存挙動は不変。
- 新フラグはすべて opt-in。`predictions/v2-*` が無ければ集約は単一dir（＝現状）。
- `aggregate.mjs`/`score-race.mjs` の追加は**新フィールド追記のみ**（既存フィールド・採点ロジック不変）。
- `execution-state.json` が無くても動的算出で全機能動作。
- **凍結尊重**: `runs/202609030411/` は再生成しない（※別途、`predictions/aggregated-v1.json` が品質レベル追加で既に git modified になっている件は整理タスク側で扱う）。

---

## 検証方法（3時刻シナリオで通す）

| シナリオ | コマンド | 期待 |
|---|---|---|
| **前日夜（T-1）L1** | `run-weekly <id> --race-time 2026-06-21T15:30 --yes` | 残り時間が正値、提出物まで L1 で完走 |
| **当日朝ワンショット** | 当日 pack 作成 → `run-weekly <id> --race-time 2026-06-21T15:30 --yes` | 鮮度注記「オッズ実質当日」が付く（G3） |
| **3h前アップグレード** | `--only goro,misaki,kenta --out v2-baba` → `run-weekly <id> --yes` | 手動 aggregate 無しで `L2-baba`／`L3`（G1） |
| **後方互換** | `run-weekly 202609030411 --plan` | 既存表示が壊れない |
| **採点** | result.json 記録後 `run-weekly <id>` | `data/scoring/<id>.json` に `quality_level`（G6） |

---

## スコープ外

- pack-builder の実装（pack は手動収集のまま。weekly-ops TODO#3）。
- スケジュール自動化そのもの（Desktop scheduled tasks / launchd / Remote Control の構築は weekly-automation.md の領分。本プランは「いつ手動実行しても壊れない」耐性側）。
- 品質レベルによる**配分戦略の動的変更**（L1 は保守的に等。将来）。
- 重みづけアルゴリズム改修・score-race の overlay 対応（本プランは `quality_level` の記録までで、採点ロジックは変えない）。
- budget=10000 / roster 名簿 / race_id・バナーのハードコード解消（整理タスクの「既知の負債」。タイミングとは独立）。

---

## 既存ドキュメントとの関係

- **done/flexible-execution-timing.md**: L1/L2/L3 モデルとアップグレードパスを定義（実装済み）。本プランはその**残オープン項目（execution-state.json・多dir自動化・pack鮮度・採点品質）を実運用レベルに引き上げる**続編。
- **weekly-automation.md §8 TODO**: #3（トリガ時刻自動算出＝G2 と datetime を共有）、#4（run-weekly 多dir対応＝G1）、#1/#5（通知・スモークゲート＝G5）を本プランが具体化。
- **expert-subagents.md §3.5**: 当日依存カテゴリ（オッズ: さくら/優子/陽菜、馬場: 吾郎/美咲/健太）の定義をそのまま利用。変更なし。

---

*作成: 2026-06-20 / done/flexible-execution-timing.md の続編（頑健化イテレーション）。「3h前が理想・前日夜/当日朝でも壊れない」要請に対し、現コードの検証済みギャップ（G1 多dir自動化・G2 前日夜の時刻バグを P0）を埋める。*
