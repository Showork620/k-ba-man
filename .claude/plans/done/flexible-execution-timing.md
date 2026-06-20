# フレキシブル実行タイミング — 「いつ実行しても壊れない」設計

## Context

- 現在の §3.5（expert-subagents.md）は3ゾーン運用を前提とする:
  - T-1日 夜: 静的組（龍之介・誠・葵・鉄平）= pack-v1 で本実行、当日依存組は暫定
  - 当日朝: オッズ依存組（さくら・優子・陽菜）= pack-v2-odds で再実行
  - 発走3時間前: 馬場依存組（吾郎・美咲・健太）= pack-v2-baba で再実行 → 最終集約 → 下流全部
- **3ゾーンは品質最適化であって硬い制約ではない**。10人全員が pack-v1 だけで予想を出せる（§3.5「冪等性/フォールバック: T-1夜の pack-v1 では当日依存組も暫定値を出しておく」）。
- しかし **実運用では3回の実行窓を毎週確保するのは現実的でないことがある**。Sho が前日夜しか時間が取れない週、当日朝にまとめて実行したい週がある。
- **問題**: 現在の `run-weekly.sh` は3ゾーンの存在を認識しない（`predictions/v1` 単独集約）。3ゾーン運用は手動で多dir aggregate → run-weekly という2段操作。「前日夜に全部やりたい」ときのパスが設計上不在。
- **weekly-automation.md** は「Mac でスケジュール＋Remote Control」の自動化を設計済みだが、「手動1回実行」のユースケースが明示的にカバーされていない。

## 設計原則

1. **3ゾーンはオプショナルな品質階層、ワンショットがデフォルト** — 実行回数が増えるほど品質が上がるが、1回でも完結する。
2. **いつ実行しても壊れない** — 前日夜でも当日朝でも発走3h前でも、パイプライン全体（予想→集約→配分→買い目）を1コマンドで通せる。
3. **品質劣化は黙らない** — 当日データを使えなかった場合、集約結果と提出物に劣化レベルを明記する。
4. **後から品質を上げられる** — ワンショット実行後、時間があれば当日データで部分再実行＋再集約して品質を上書きできる。

## 品質階層の定義

| レベル | 実行パターン | データ品質 | タイミング例 |
|---|---|---|---|
| **L3 (Full)** | 3ゾーン完走（静的 → オッズ → 馬場 → overlay 集約） | 当日オッズ＋当日馬場が反映。設計上の最高品質 | 前日夜→当日朝→発走3h前 |
| **L2 (Partial)** | 2ゾーン完走。L2-odds（オッズ更新）と L2-baba（馬場更新）の2変種あり | 片方の当日データが反映。詳細は後述「L2のバリエーション」 | 当日朝 or 発走3h前 |
| **L1 (Single-shot)** | ワンショット（全10人を pack-v1 で実行） | 前日データのみ。オッズ・馬場とも暫定 | 前日夜に1回で全部通す |

- **L1 でも集合知の骨格（10人×3軸の多様性）は完全に機能する**。劣化するのはオッズ依存3人と馬場依存3人の「入力鮮度」のみ。
- **L3 → L2 → L1 は graceful degradation**。どのレベルでも集約と下流は正常に動く。

## pack の時刻依存性

品質階層は「実行回数」だけでなく **pack の中身**にも依存する。pack-v1 は手動 web 収集物であり、作成時刻によって含まれるデータが異なる:

| pack 作成時刻 | オッズ | 馬場 | 調教 | 備考 |
|---|---|---|---|---|
| T-3日〜T-2日 | 前売りオッズ（参考程度） | 天気予報（数日先） | 最終追切前の可能性 | 早すぎ。調教・枠が未確定なら pack 作成自体が困難 |
| **T-1日 夜**（推奨） | 前日最終オッズ | 天気予報（翌日） | 最終追切後 | **ワンショットの基準タイミング**。大半のデータが揃う |
| 当日朝 | 当日開始オッズ | 天気実況＋予報 | 確定 | オッズが更新済み。pack-v1 に当日オッズを入れればL1でもオッズ依存3人の品質が実質L2相当 |
| 発走3h前 | 中間オッズ（ほぼ最終） | 馬場差・含水率が確定 | 確定 | 最も充実。pack-v1 に全部入れればL1でも品質はL3に近い |

**含意**: ワンショット（L1）であっても、**pack を遅く作るほど品質は上がる**。3ゾーンの真の価値は「T-1夜に静的組を先行実行しておくことで、当日の残り時間を馬場確認と下流処理に使える」という**時間配分の最適化**。時間がない週は「当日朝に充実した pack-v1 を1本作り、ワンショットで全通し」が合理的なフォールバック。

---

## アップグレードパス（L1 → L2 → L3）

ワンショット実行後に時間ができた場合、品質を段階的に上げるメカニクス:

### L1 → L2（オッズ更新）

```bash
# 1. 当日オッズを反映した pack-v2-odds.json を作成（手動）
# 2. オッズ依存3人だけ再実行
bash scripts/run-experts.sh runs/<id>/pack-v2-odds.json --only sakura,yuko,hina --out v2-odds

# 3. overlay 再集約（v1 の暫定オッズ予想が v2-odds で上書きされる）
node scripts/aggregate.mjs runs/<id>/predictions/v1 runs/<id>/predictions/v2-odds runs/<id>/pack-v1.json

# 4. 下流を再生成（run-weekly は aggregated-v1.json が在れば集約スキップ → betting-input 以降を再実行）
#    ※ 古い aggregated-v1.json を削除してから run-weekly を通すか、
#      betting-input-v1.json を削除して再生成させる
rm runs/<id>/betting-input-v1.json runs/<id>/bets/v1/*.json runs/<id>/bets/aggregated-v1.json
bash scripts/run-weekly.sh <id> --yes
```

**ポイント**: `aggregate.mjs` の overlay は「同一 expert_id を後の dir 優先」で上書きするため、v1/sakura.json（前日オッズ暫定）が v2-odds/sakura.json（当日オッズ本実行）で自動的に置換される。元の v1/sakura.json は残る（上書きではなく無視される）ので、ロールバックも可能。

### L2 → L3（馬場更新）

```bash
# 1. 馬場データを反映した pack-v2-baba.json を作成（手動。オッズは含めない）
# 2. 馬場依存3人を再実行
bash scripts/run-experts.sh runs/<id>/pack-v2-baba.json --only goro,misaki,kenta --out v2-baba

# 3. 3dir overlay 集約
node scripts/aggregate.mjs runs/<id>/predictions/v1 runs/<id>/predictions/v2-odds runs/<id>/predictions/v2-baba runs/<id>/pack-v1.json

# 4. 下流再生成（上記と同じ手順）
```

### 注意: 冪等性の落とし穴

`run-weekly.sh` は「成果物が在ればスキップ」する冪等設計のため、**アップグレード時は中間成果物を削除してから再実行する必要がある**。削除対象:

| アップグレード段階 | 削除すべきファイル | 理由 |
|---|---|---|
| 再集約後 | `betting-input-v1.json` | 集約確率が変わったため配分入力も再生成 |
| betting-input 再生成後 | `bets/v1/*.json`, `bets/aggregated-v1.json` | 配分入力が変わったため配分結果も再計算 |

この「削除→再実行」はエラーが起きやすい。**成果物§1 の `run-weekly.sh` 拡張で `--refresh-from aggregate` のようなオプションを追加し、指定ステップ以降の成果物を自動削除して再実行する**のが安全（Step 2 の TODO に追加）。

---

## 品質レベルの自動判定アルゴリズム

`aggregate.mjs` は既に `generations` フィールド（各 expert の `pack_version`）を出力している。品質レベルはこのデータから機械的に算出できる:

```javascript
// カテゴリ定義（§3.5）
const ODDS_EXPERTS = ['sakura', 'yuko', 'hina'];
const BABA_EXPERTS = ['goro', 'misaki', 'kenta'];

function deriveQualityLevel(generations) {
  const byId = Object.fromEntries(generations.map(g => [g.expert_id, g.pack_version]));

  const oddsUpgraded = ODDS_EXPERTS.every(id => byId[id]?.startsWith('v2-odds'));
  const babaUpgraded = BABA_EXPERTS.every(id => byId[id]?.startsWith('v2-baba'));

  if (oddsUpgraded && babaUpgraded) return 'L3';
  if (oddsUpgraded) return 'L2-odds';
  if (babaUpgraded) return 'L2-baba';
  return 'L1';
}

function listDegradedExperts(generations) {
  const byId = Object.fromEntries(generations.map(g => [g.expert_id, g.pack_version]));
  const degraded = [];
  for (const id of ODDS_EXPERTS) {
    if (!byId[id]?.startsWith('v2-odds')) degraded.push(`${id} (stale odds)`);
  }
  for (const id of BABA_EXPERTS) {
    if (!byId[id]?.startsWith('v2-baba')) degraded.push(`${id} (stale track)`);
  }
  return degraded;
}
```

**既存コードへの影響は最小**: `aggregate.mjs` の出力オブジェクトに `quality_level` と `degraded_experts` を追加するだけ。既存フィールドは不変。

### エッジケース: 部分的カテゴリ更新（3人中2人だけ成功）

v2-odds で sakura・hina は成功したが yuko が失敗した場合、`every()` は false を返すため **L1 判定**になる。しかし2/3は当日データを使っている。

**対応方針**: カテゴリ全員成功をレベル昇格の条件とする（保守的判定）。`degraded_experts` が個別状況を正確に列挙するため、`--plan` 表示で「yuko のみ v2-odds 未実行。再実行すれば L2-odds に昇格」と具体的に案内する。不足1人は `--only yuko --out v2-odds` で補える。

---

## `--what-now` の判定ロジック（決定木）

```
入力: race_time（発走時刻 JST）、現在時刻、execution-state.json の有無と中身

if pack-v1 が無い:
  → "pack-v1 を作成してください（ブロッカー）"
  終了

hours_to_race = (race_time - now) in hours

if execution-state が無い or 予想未実行:
  # まだ何もやっていない
  if hours_to_race > 18:    # T-1日夜より前
    → "まだ早い。T-1日夜（調教・天気予報確定後）にワンショットが最適"
  elif hours_to_race > 6:   # T-1日夜〜当日朝
    → "今すぐワンショット実行（L1）。時間があれば当日朝にオッズ更新で L2 へ"
  elif hours_to_race > 3:   # 当日朝〜発走3h前
    → "当日オッズ入りの pack で今すぐワンショット（実質L2相当）"
    → "12:30 に馬場更新で L3 も狙える"
  elif hours_to_race > 1:   # 発走3h前〜1h前
    → "当日全データ入りの pack で今すぐワンショット（実質L3相当）"
    → "下流処理に ~30分必要。急いで"
  else:                     # 1h未満
    → "⚠ 下流処理の時間が足りない可能性。予想のみ実行し、配分は簡略化を検討"

elif quality_level == "L1":
  if hours_to_race > 3:
    → "L1 完了済み。品質↑するなら:"
    → "  (a) 当日オッズで v2-odds → L2-odds"
    → "  (b) 発走3h前に馬場で v2-baba → L2-baba"
    → "  (c) 両方 → L3"
  else:
    → "L1 完了済み。馬場データで v2-baba 再実行 → L2-baba"

elif quality_level == "L2-odds":
  → "L2-odds 完了済み。馬場データで v2-baba 再実行 → L3"

elif quality_level == "L2-baba":
  → "L2-baba 完了済み。オッズデータで v2-odds 再実行 → L3"

elif quality_level == "L3":
  → "✓ 全ゾーン完了。提出物を確認してください"
```

---

## 成果物（必要な変更）

### 1. `run-weekly.sh` にタイミングモードを追加

```
--timing single    # ワンショット: 全10人を pack で実行 → 集約 → 下流全部（デフォルト）
--timing staged    # 3ゾーン: 既存の多dir overlay 前提（明示時のみ。手動 aggregate 必要）
--race-time HH:MM # 発走時刻。JST 固定（TZ=Asia/Tokyo。Mac のローカル TZ に依存しない。weekly-automation.md §6 と整合）。残り時間を計算し提出物に記録
```

- `--timing single`（または未指定）: 現在の `run-weekly.sh` の挙動そのもの。**変更なし・追加コストゼロ**。
- `--timing staged`: overlay 前提の3ゾーン運用を明示（「手動で多dir aggregate を先にやった」宣言）。
- `--race-time`: 提出物に「実行時刻と発走までの余裕」を自動注記。当日朝に実行したなら「発走6h前実行・L1品質・当日オッズ未反映」が betting-v2.md に残る。

### 2. 実行状態ファイル `runs/<race_id>/execution-state.json`

各ゾーンの完了状態と品質レベルを追跡する。

```json
{
  "race_id": "202609030611",
  "quality_level": "L1",
  "zones": {
    "static": { "completed_at": "2026-06-20T22:30:00+09:00", "pack": "pack-v1.json", "experts": ["tatsunosuke","makoto","aoi","teppei","sakura","yuko","hina","goro","misaki","kenta"] },
    "odds": { "completed_at": null, "pack": null, "experts": [] },
    "baba": { "completed_at": null, "pack": null, "experts": [] }
  },
  "aggregate": { "completed_at": "2026-06-20T22:45:00+09:00", "overlay_dirs": ["predictions/v1"], "quality_level": "L1" },
  "downstream_completed_at": "2026-06-20T23:00:00+09:00"
}
```

- `run-weekly.sh --plan` がこのファイルを表示に使い、「次に品質を上げるには v2-odds をいつ実行すればよいか」を案内。
- 後続ゾーン実行時に前ゾーンの完了を assert（weekly-automation.md §7 の要件を満たす）。

### 3. 品質注記の集約結果・提出物への埋め込み

- `aggregate.mjs` の出力に `quality_level` フィールドを追加:
  ```json
  {
    "quality_level": "L1",
    "degraded_experts": ["sakura (stale odds)", "goro (stale track)"],
    "note": "全員 pack-v1 で実行（当日オッズ・当日馬場の反映なし）"
  }
  ```
- `prediction-v1.md` / `betting-v2.md` の冒頭に品質注記テンプレートを追加:
  ```
  > 品質: L1（ワンショット実行・前日夜 22:30 JST）
  > 当日データ未反映: オッズ依存3人・馬場依存3人は暫定値
  ```

### 4. 「今から実行するなら何をすべきか」ガイドコマンド

`run-weekly.sh --what-now <race_id> --race-time 15:30` で、現在時刻と発走時刻から:

```
現在: 2026-06-21 09:00 JST
発走: 2026-06-21 15:30 JST（残り 6h30m）
現在の状態: pack-v1 あり、予想未実行

推奨:
  1. [今すぐ] 全10人をワンショット実行（L1 品質・約20分）
     bash scripts/run-weekly.sh 202609030611 --race-time 15:30
  2. [任意・品質↑] 12:30 に馬場依存組を再実行して L2 に引き上げ
     bash scripts/run-experts.sh runs/202609030611/pack-v2-baba.json --only goro,misaki,kenta --out v2-baba
     → 再集約 → run-weekly で下流を再生成
```

### 5. `weekly-automation.md` への統合

§3「3ゾーン構成」の直後に「§3.1 ワンショット実行（手動・フォールバック）」を追加:

- 3ゾーンのスケジュールが全滅しても、**いつでもワンショットで L1 品質の提出物を出せる**ことを明記。
- Remote Control のフォールバック（launchd 自動実行）が不発でも、手動ワンショットが最終防衛線。
- 品質階層と判断基準: 「L1 で出すか、時間をかけて L2/L3 に上げるかは Sho 判断。L1 でも集合知の多様性は完全（入力鮮度のみ劣化）」。

---

## 実行ステップ

### Step 1: execution-state.json のスキーマ定義（純増・破壊ゼロ）
- `scripts/` 配下に状態読み書きのヘルパ関数を追加（`run-weekly.sh` 内に組み込み or 独立ユーティリティ）。
- `runs/<race_id>/execution-state.json` を生成・更新するロジック。

### Step 2: `run-weekly.sh` の拡張（後方互換・既存挙動を壊さない）
- `--timing` / `--race-time` / `--what-now` オプションを追加。
- 未指定時のデフォルトは `single`（現在の挙動そのまま）= **既存ユーザーへの影響ゼロ**。
- `--plan` 表示に品質レベルと「品質を上げるには」案内を追加。
- `--refresh-from <step>` オプション: 指定ステップ以降の中間成果物を自動削除してから実行。アップグレード時の「削除忘れで古い結果が残る」事故を防ぐ。
  - `--refresh-from aggregate`: aggregated-v1.json + betting-input + bets を削除→再集約から再実行
  - `--refresh-from betting-input`: betting-input + bets を削除→配分入力から再実行
  - `--refresh-from bets`: bets のみ削除→配分から再実行

### Step 3: `aggregate.mjs` に品質注記を追加
- `quality_level` / `degraded_experts` を出力 JSON に含める。
- 各 expert の `pack_version` を集計し、v2-odds/v2-baba が欠けている expert を列挙。
- 出力互換（新フィールド追加のみ、既存フィールドは不変）。

### Step 4: 提出物テンプレートへの品質注記挿入
- `prediction-v1.md` / `betting-v2.md` の生成に品質バナーを自動挿入。
- Sho が品質レベルを見て「L1 で出すか追加実行するか」を判断できるようにする。

### Step 5: `weekly-automation.md` のドキュメント更新
- §3.1 追加。品質階層の定義と判断基準。
- §7/§8 のフォールバック記述にワンショットを最終防衛線として追記。

---

## シナリオ・ウォークスルー

### シナリオA: 前日夜ワンショット（L1・最もシンプル）

> 金曜 22:00。明日はしらさぎS（15:30発走）。今週は忙しくて当日の再実行は無理。

```bash
# 1. pack-v1.json を手動作成済み（出馬表・前日オッズ・天気予報・最終追切）
ls runs/202609030611/pack-v1.json  # ✓ あり

# 2. ワンショット実行（これだけで提出物まで出る）
bash scripts/run-weekly.sh 202609030611 --race-time 15:30 --yes

# 内部で起きること:
#   スモークテスト → 全10人予想(~15min) → クォーラム判定(≥8) → 集約 →
#   betting-input → 配分5人(~10min) → 買い目集約 → 人手ゲートで停止
#
# execution-state.json → quality_level: "L1"
# aggregated-v1.json  → quality_level: "L1", degraded_experts: [sakura,yuko,hina,goro,misaki,kenta]
#
# 所要時間: 約25-30分（LLM並列実行）
```

結果: 提出物が出る。品質注記「L1・前日オッズ・想定馬場」が付く。**翌日何もしなくてよい**。

### シナリオB: 当日朝まとめて実行（実質L2相当）

> 土曜 9:00。しらさぎS（15:30発走）まで6.5h。朝の段階で当日オッズが出ている。

```bash
# 1. pack-v1.json を当日朝に作成（当日開始オッズを含む → pack自体が鮮度高い）
#    ※ 前日夜に作った pack-v1 があるなら、オッズだけ更新して上書き
ls runs/202609030611/pack-v1.json  # ✓ 当日オッズ入り

# 2. ワンショット実行
bash scripts/run-weekly.sh 202609030611 --race-time 15:30 --yes

# ※ pack-v1 に当日オッズが入っているため、オッズ依存3人(さくら・優子・陽菜)も
#   当日オッズで予想する。pack_version は v1 だが入力品質は実質 L2 相当。
#   execution-state.json → quality_level: "L1"（pack_version ベースの判定では L1）
#   ただし品質注記に「pack 作成時刻: 当日 09:00 → オッズは当日反映」と補足

# 3. [任意] 12:30 に馬場依存3人だけ再実行して正式 L2/L3 へ
bash scripts/run-experts.sh runs/202609030611/pack-v2-baba.json --only goro,misaki,kenta --out v2-baba
node scripts/aggregate.mjs runs/202609030611/predictions/v1 runs/202609030611/predictions/v2-baba runs/202609030611/pack-v1.json
bash scripts/run-weekly.sh 202609030611 --refresh-from betting-input --yes
```

結果: ワンショットだけで実質L2品質。馬場更新まで行えばL2正式（またはL3に近い品質）。

### シナリオC: 発走3時間前のフル実行（L3）

> 土曜 12:30。しらさぎS（15:30発走）まで3h。前日夜に L1 ワンショット済み。馬場が確定した。

```bash
# 1. L1 は前夜に完了済み
bash scripts/run-weekly.sh 202609030611 --plan  # 現在の品質: L1

# 2. 馬場依存3人を再実行
bash scripts/run-experts.sh runs/202609030611/pack-v2-baba.json --only goro,misaki,kenta --out v2-baba

# 3. overlay 再集約＋下流再生成
node scripts/aggregate.mjs runs/202609030611/predictions/v1 runs/202609030611/predictions/v2-baba runs/202609030611/pack-v1.json
bash scripts/run-weekly.sh 202609030611 --refresh-from betting-input --yes

# execution-state.json → quality_level: "L2-baba"（馬場のみ更新）
# ※ オッズも更新していれば L3
```

結果: 前夜の L1 をベースに馬場情報で品質向上。全体の所要時間は馬場3人(~8min)＋集約＋配分(~10min)。

### シナリオD: 当日朝にゼロから（時間はあるが忙しい）

> 土曜 8:00。pack 未作成。しらさぎS（15:30発走）まで7.5h。

```bash
# 1. 状況確認
bash scripts/run-weekly.sh 202609030611 --what-now --race-time 15:30

# 出力:
#   現在: 2026-06-21 08:00 JST
#   発走: 2026-06-21 15:30 JST（残り 7h30m）
#   現在の状態: pack なし ← ブロッカー
#
#   推奨:
#     1. [今すぐ] pack-v1.json を作成（当日オッズを含めると実質L2品質）
#     2. [pack 後] ワンショット実行（~30分）
#     3. [任意] 12:30 に馬場依存組を再実行して品質を L3 へ

# 2. pack 作成 → ワンショット → [任意で馬場更新]
```

---

## 品質階層の補足: L2 のバリエーション

L2 は「2ゾーン完走」だが、どの2ゾーンかで品質の性質が異なる:

| L2 バリエーション | 更新済み | 暫定のまま | 起きやすさ |
|---|---|---|---|
| **L2-odds**: 静的＋オッズ | さくら・優子・陽菜 | 吾郎・美咲・健太 | 高（当日朝のスケジュール + 馬場確定前） |
| **L2-baba**: 静的＋馬場 | 吾郎・美咲・健太 | さくら・優子・陽菜 | 中（前夜L1→発走3h前に馬場だけ更新のパターン） |

品質判定アルゴリズムは上記「品質レベルの自動判定アルゴリズム」セクションの `deriveQualityLevel()` で4値（L1/L2-odds/L2-baba/L3）を返す。

---

## `--plan` 出力モックアップ（品質レベル統合後）

### 現状（変更前）
```
╔══════════════════════════════════════════════════╗
║   k-ba-man 週次オーケストレーター — 進捗            ║
╚══════════════════════════════════════════════════╝
  レース: 202609030611（runs/202609030611）

  ✓ 1. pack            — pack-v1.json
  ✓ 2. 予想10人        — 有効 10 人（クォーラム 8）
  ✓ 3. 予想集約        — aggregated-v1.json
  ...
```

### 改善後
```
╔══════════════════════════════════════════════════╗
║   k-ba-man 週次オーケストレーター — 進捗            ║
╚══════════════════════════════════════════════════╝
  レース: 202609030611（runs/202609030611）
  発走: 2026-06-21 15:30 JST（残り 6h15m）
  品質: L1（ワンショット・前日夜 22:30 実行）

  ✓ 1. pack            — pack-v1.json（2026-06-20 22:00 作成）
  ✓ 2. 予想10人        — 有効 10 人（クォーラム 8）
  ・   オッズ依存(3人) — 暫定（前日オッズ）。v2-odds で更新可
  ・   馬場依存(3人)   — 暫定（天気予報）。v2-baba で更新可
  ✓ 3. 予想集約        — aggregated-v1.json
  ✓ 4. betting-input   — リーク防止生成物
  ✓ 5. 配分5人         — 有効 5 人
  ✓ 6. 買い目集約      — bets/aggregated-v1.json
  ・ 7. 確定結果        — result.json（人手・レース後）
  ・ 8. 採点

  品質を上げるには:
    → [12:30] 馬場依存組を再実行（pack-v2-baba.json 作成 → --only goro,misaki,kenta → 再集約）→ L2-baba
    → [9:00以降] オッズ依存組を再実行（pack-v2-odds.json 作成 → --only sakura,yuko,hina → 再集約）→ L2-odds
    → 両方完了 → L3
```

---

## 検証方法

- **L1 パス**: `run-weekly.sh <race_id>` のみで pack → 全10人 → 集約 → 配分 → 買い目まで通ることを確認。execution-state.json が `quality_level: "L1"` で生成されること。
- **L3 パス**: 3ゾーン実行後に execution-state.json が `quality_level: "L3"` に更新されること。
- **L2-baba パス**: 馬場依存組だけ再実行 → 再集約で `quality_level: "L2-baba"` になること。
- **後方互換**: 既存の `run-weekly.sh 202609030411 --plan` が壊れないこと（新フィールドは追加のみ）。
- **--what-now**: 各時刻で適切な推奨が出ること（前日夜=ワンショット推奨、当日朝=ワンショット＋馬場再実行の案内、3h前=馬場再実行推奨）。
- **--refresh-from**: `--refresh-from aggregate` で aggregated/betting-input/bets が削除され、再集約から再実行されること。古い成果物が残って鮮度の落とし穴に嵌まらないこと。
- **品質注記**: 集約結果 JSON と提出物 md に品質バナーが含まれること。
- **シナリオA〜D**: 上記4シナリオを実際の runs/ で通し、期待する品質レベルが記録されること。

---

## 実装の優先度（効果/労力の比）

| 優先 | 項目 | 労力 | 効果 | 理由 |
|---|---|---|---|---|
| **P0** | `--plan` に品質レベル表示を追加 | 小（print_plan 関数に20行） | 高 | 毎回の状態確認で品質が一目で判る。他の全機能の前提 |
| **P0** | `aggregate.mjs` に quality_level 出力 | 小（既存 generations から10行の算出） | 高 | 品質判定の基盤。下流の品質注記すべてがこれに依存 |
| **P1** | `--refresh-from` オプション | 中（成果物削除＋再実行の接着） | 高 | アップグレード時の「削除忘れ→古い結果で配分」事故を構造的に防ぐ |
| **P1** | execution-state.json の生成 | 中（run-weekly の各ステップ完了時に書き込み） | 中 | `--plan` の品質表示に必要。ただし P0 だけなら generations から動的算出で代用可 |
| **P2** | `--what-now` ガイド | 中（決定木の実装＋race-time パース） | 中 | 便利だが P0 の `--plan` 品質表示で8割カバー |
| **P2** | 提出物への品質バナー自動挿入 | 小 | 低 | 提出物は現在手書き。自動生成になるまでは手動追記で十分 |
| **P3** | `--timing staged` モード | 小（分岐追加のみ） | 低 | 現状の手動多dir aggregate 運用で動いている |

**最小実装セット（P0 のみ）**: aggregate.mjs に quality_level 追加 ＋ `--plan` 表示の拡張。**この2点だけでプランの中核価値（品質の可視化）が動く**。残りは段階的に追加。

---

## 既存ドキュメントとの接続

### weekly-automation.md §8 TODO との関係

| weekly-automation.md TODO | 本プランとの関係 |
|---|---|
| **#4 run-weekly の集約を多dir 対応** | 本プランの `--refresh-from aggregate` が部分的に解決。ただし run-weekly 内蔵の aggregate 呼び出しを多dir 化する根本解決は別（本プランは「手動 aggregate → run-weekly」の運用を `--refresh-from` で安全にする補完策） |
| **#6 ゾーンの薄いラッパー化** | 本プランの `--what-now` がガイド機能として代替。ラッパースクリプト自体は weekly-automation.md のスコープ |
| **新規** | weekly-automation.md §7 の「`--plan` に pack_version 内訳を表示」TODO を、本プランの品質レベル表示が包含・解決 |

### expert-subagents.md §3.5 との関係

§3.5 は **3ゾーンの最適解を定義する設計書**。本プランはそれを否定せず、**「§3.5 を完全に実行できない週のためのフォールバック戦略」**を追加する。具体的な接続:

- §3.5「冪等性/フォールバック: 当日トリガーが落ちても暫定値が残るので集約が破綻しない」→ 本プランの L1 はまさにこのフォールバック状態を**正式な運用パス**として昇格させたもの
- §3.5 の3カテゴリ分類（静的/オッズ依存/馬場依存）→ 本プランの品質レベル判定のカテゴリ定義をそのまま利用。変更なし
- §3.5 の overlay メカニクス → 本プランのアップグレードパス（L1→L2→L3）の基盤。追加の仕組みは不要

### pack_version と実データ鮮度の乖離

**問題**: 当日朝に pack-v1.json を作成し当日オッズを含めた場合、オッズ依存3人は当日オッズで予想するが、`pack_version` は `"v1"` のまま。品質判定アルゴリズムは L1 と判定するが、実質は L2-odds 相当の品質。

**対応方針**: pack_version ベースの判定は **保守的**（実際より低く評価する方向に誤る）。これは安全側の誤りであり、過剰評価よりはるかにマシ。

```
判定: L1（保守的）  vs  実質: L2相当（pack-v1 に当日オッズが入っている）
→ Sho が判断: 「pack-v1 を当日朝に作ったから実質 L2 だ」と分かる人間の判断を信頼
→ execution-state.json に pack 作成時刻が入るので、手がかりは残る
```

**将来改善（スコープ外）**: pack-v1.json 自体に `created_at` / `data_freshness` フィールドを追加し、pack の中身の鮮度を品質判定に組み込む。これは pack-builder（weekly-ops TODO #3）実装時に自然に入る。現時点では pack は手書きのため、フィールド追加を強制できない。

---

## 採点（score-race.mjs）との相互作用

**現状**: `score-race.mjs` は `predictions/v1/` 固定で読み、`quality_level` を参照しない。L1 と L3 の予想を同基準で採点すること自体は問題ない（入力条件の違いはスコアに自然に反映される）。

**問題**: 20レース蓄積後の重みづけ（§7.1）で「L1 での低スコア」と「L3 での低スコア」を同列に扱うと、入力鮮度の差が専門家の能力差と誤認される可能性がある。特に馬場依存組（吾郎・美咲・健太）は L1 で構造的に不利。

**対応**:
1. **採点カードに quality_level を記録**: `data/scoring/<race_id>.json` に `quality_level` フィールドを追加（score-race.mjs の入力として execution-state.json or aggregated-v1.json から取得）。
2. **重みづけ ON 判断時の分析**: L1 のみのレースを除外、または品質レベル別のスコア分布を比較する選択肢を残す。
3. **score-race.mjs の overlay 対応**: `predictions/v1` 固定ではなく overlay 済みの予想を読む改修は weekly-automation.md TODO #4 と連動。本プランでは「quality_level の記録」だけをスコープに含め、採点ロジック変更はスコープ外。

---

## スコープ外

- pack-builder の実装（これはどのタイミングでも手動。weekly-ops TODO 項目3）。
- 3ゾーンのスケジュール自動化そのもの（weekly-automation.md のスコープ。本プランは「スケジュールが機能しなかったとき」の耐性設計）。
- 品質レベルによる配分戦略の動的変更（L1 のときは保守的に、等。将来検討）。
- pack_version の自動鮮度判定（pack-builder 実装に付随して将来対応）。
- `aggregate.mjs` のコンソールヘッダ「宝塚記念 2026」のハードコード解消（weekly-ops.md の既存 TODO「コンソール表示の汎用化」に記載済み。品質レベル追加とは独立した修正）。
- score-race.mjs の採点ロジック変更（overlay 対応・重みづけアルゴリズム改修）。

---

## 設計上の決断メモ

### なぜ「デフォルト = ワンショット」か

§3.5 の3ゾーン設計は**品質最適化の天井を定義する設計書**であり、**最低要件を定義するものではない**。実運用で3回の窓を毎週確保する前提は脆い。ワンショットをデフォルトとし、3ゾーンを「余裕があるときの品質ブースト」と位置づけることで:

1. **実行の心理的障壁が下がる**: 「今週は時間がないからやらない」→「とりあえず1回回しておく」。
2. **データ蓄積が止まらない**: L1 でもスコアリングと重み蓄積は正常に動く。20レース到達が遅れない。
3. **自動化のフォールバック最終防衛線になる**: スケジュール全滅でも手動ワンショットで提出物を出せる。

### なぜ execution-state.json か

`run-weekly.sh` の冪等設計（「既にある成果物はスキップ」）は**存在判定**に依存するが、品質は存在だけでは判らない。
`predictions/v1/sakura.json` が「前日オッズの暫定実行」なのか「当日オッズの本実行」なのかは中身の `pack_version` を読まないと判別できない。
execution-state.json は pack_version 集計の手間なく「このランの品質レベル」を一目で把握させる。

### 前日夜実行の実際の劣化度合い

- **オッズ依存3人（さくら・優子・陽菜）**: 前日オッズと当日オッズの乖離は平均的に小さい（大幅変動は馬体重発表後の最後の30分に集中）。前日夜の暫定でも実害は限定的。
- **馬場依存3人（吾郎・美咲・健太）**: 天気予報→実況の差は梅雨期に大きくなりうる。道悪転換があれば L1 の劣化が顕著。逆に晴天続きなら暫定と本実行の差は微小。
- **結論**: L1 は「悪くても合理的な予想」であり「壊れた予想」ではない。劣化度合いは天候変動と相関し、一律には定まらない。

---

*作成: 2026-06-20 / 最終更新: 2026-06-20（8イテレーション + エッジケース監査で精査）*
*「3時間前が理想だが、いつでも実行可能な耐性設計」の要請に対する改善プラン*
