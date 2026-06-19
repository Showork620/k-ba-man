# k-ba-man 週次運用の自動化（スケジュール実行 ＋ リモコン）設計

> **目的**: [weekly-ops.md](./weekly-ops.md) の「予想 → 集約 → 配分 → 買い目 → 提出物生成」を、できるだけ自動で回し、人手判断の要所だけを残す。
> **確定**: 2026-06-20（Sho 合意）。3レンズ敵対レビュー（技術正確性・運用failure mode・リポ整合）反映済み。
> **関連**: weekly-ops.md（手順）、[expert-subagents.md](./expert-subagents.md) §3.5（当日依存カテゴリ）、`scripts/run-experts.sh` / `scripts/aggregate.mjs` / `scripts/run-weekly.sh`、`.claude/skills/cli-smoke-test`。

---

## 1. 設計を縛る制約（最重要）

k-ba-man の価値は **バックエンド多様性**（claude ＋ codex/gpt-5.5 ＋ gemini-2.5-flash）。codex/gemini が認証されていない環境で動かすと全員 Claude にフォールバックし、**実効的な多様性が静かに崩れて設計の根幹が無効化**する。

→ **実行は codex/gemini が認証済みの自前 Mac（always-on）で行う。Anthropic のクラウド routine は使わない。**

> クラウド routine は **Anthropic 管理のクラウド環境**で実行され、選択リポジトリを**デフォルトブランチから毎回 fresh clone** する。ローカルにインストール/認証された CLI（codex/gemini）・ローカル MCP・認証情報には到達できない（ローカル MCP は claude.ai の connector 化が必要）。ネットワークは環境の allowlist に従う。出典: `code.claude.com/docs/en/routines`・`/en/scheduled-tasks`（比較表「Access to local files: No (fresh clone)」）。

**人手ゲートは2つ残る**（自動化してもなくならない）:
- **入口 = pack 作成**（手動 web 収集。pack-builder 未実装 — weekly-ops TODO 項目3）
- **出口 = 馬券購入**（Sho 判断。システムは提出物まで）

---

## 2. Claude Code 機構の選定

| 方式 | 実行場所 | codex/gemini | 採否 |
|---|---|---|---|
| クラウド routine（`/schedule`） | Anthropic クラウド・git fresh clone | ❌ 使えない | **不採用**（多様性喪失） |
| **Desktop scheduled tasks**（Desktop アプリ Routines → Local） | **Mac** | ✅ フル対応 | **スケジュールに採用** |
| 自作ローカル定時（launchd ＋ `claude -p`） | Mac | ✅（認証環境次第） | 代替（公式機能ではない） |
| **Remote Control** | Mac の既存セッションを web/モバイルから操作 | ✅ 実行はローカル維持 | **リモコンに採用** |
| GitHub Actions self-hosted runner ＋ workflow_dispatch | Mac runner | ✅ | 接続不可時の代替（早期に用意） |

★ **Remote Control は実行を Mac に保つ**（公式 `/en/remote-control`「Claude keeps running locally the entire time, so nothing moves to the cloud」「filesystem, MCP servers, tools, project configuration all stay available」）。よってリモコン起動でも配分（一徹=codex／律=gemini）が縮退せず動く。Remote Control は「**既存セッションの操作**」であり、新規タスクの定時起動機能ではない（定時起動は Desktop scheduled tasks 側）。

**Remote Control の要件（docs 確認済み・`/en/remote-control`）**: Pro/Max/Team/Enterprise で利用可（**API キー不可**）／claude.ai の **OAuth フルスコープ ログインが必要**（setup-token・inference-only トークン不可）／Team・Enterprise は管理者がトグルを有効化／初回 **workspace trust** の承認／**Claude Code v2.1.51 以上**／**ローカルプロセスが起動し続けている**前提（約10分以上のネットワーク断でタイムアウト）。実機確認は「自分のプランで実際にトグルが出るか」程度に縮小。

> 用語注: 公式のローカル定時機能名は **「Desktop scheduled tasks」**（Desktop アプリの Routines で「Local」を選んで作成）。「Local Routine」という独立名称の機能は存在しない。`launchd + claude -p` は公式機能ではなく OS スケジューラで CLI を叩く自作手法（permission 設定や MCP 統合は持たない素のヘッドレス実行）。

---

## 3. 3ゾーン構成

時点はすべて**発走時刻基準**（§3.5）。スケジュールはレースごとに発走時刻から逆算してセットする。

| ゾーン | 時点 | 中身 | 実行 | 起動 |
|---|---|---|---|---|
| **静的** | T-1日 夜 | pack-v1 → 全10人 基本実行（codex/gemini 含む。当日依存組も**暫定値**を出す） | Mac | スケジュール |
| **オッズ依存** | 当日朝 | pack-v2-odds → さくら・優子・陽菜（gemini 含む） | Mac | スケジュール |
| **馬場＋仕上げ** | 発走3時間前 | 馬場依存組(全Claude) → 集約 → betting-input → 配分 → 買い目 → 提出物 → 通知 | **Mac で実行** | **Remote Control（go ゲート）＋ launchd フォールバック** |

- 静的ゾーンでは当日依存組（オッズ：さくら・優子・陽菜／馬場：吾郎・美咲・健太）も**暫定値**を出し、当日朝の v2-odds・発走3h前の v2-baba が **overlay 上書き**する（`aggregate.mjs` は同一 expert_id を**後の dir 優先**で上書き。§3.5）。
- 「発走3時間前」を人手トリガにする理由は §3.5（馬場が固まり下流に約3時間残る）と、Sho が当日馬場を確認して go を出す**出口前ゲート**を兼ねるため。**3時間は単一レース前提の暫定オフセット**で、同日複数レースや馬場確定の遅延では見直す（§7）。

---

## 4. 各ゾーンのコマンド（実装素材は既存）

```bash
# 静的（T-1夜・スケジュール）
bash scripts/run-experts.sh runs/<race_id>/pack-v1.json

# オッズ依存（当日朝・スケジュール）
bash scripts/run-experts.sh runs/<race_id>/pack-v2-odds.json --only sakura,yuko,hina --out v2-odds

# 馬場＋仕上げ（発走3h前・Remote Control で go、実体は Mac）
bash scripts/run-experts.sh runs/<race_id>/pack-v2-baba.json --only goro,misaki,kenta --out v2-baba
node scripts/aggregate.mjs runs/<race_id>/predictions/v1 runs/<race_id>/predictions/v2-odds runs/<race_id>/predictions/v2-baba runs/<race_id>/pack-v1.json
bash scripts/run-weekly.sh <race_id>   # 集約済みを検出 → betting-input → 配分 → 買い目集約 → 人手ゲート手前で停止
```

- **集約は必ず手動の多dir overlay を先に回す**。`run-weekly.sh` 内蔵の集約は `predictions/v1` 単独しか `aggregate.mjs` に渡さない（多dir 非対応）。多dir aggregate を踏まずに run-weekly を直接起動すると、**v2-odds/v2-baba（当日情報）を捨てた v1 単独集約**が静かに生成される。順序は「v2-baba 生成 → 多dir aggregate で `aggregated-v1.json` 再生成 → run-weekly」を固定。
- 多dir aggregate は **v1 を先頭引数**に置く（出力 `aggregated-v1.json` の親ディレクトリは先頭引数の親で決まる）。
- **鮮度の落とし穴**: run-weekly は `aggregated-v1.json` が在れば集約をスキップする冪等設計だが、これは「集約済み＝最新」と誤認しうる。**v2-baba 反映前の古い集約が残っていると当日馬場が反映されないまま betting-input へ進む**。仕上げゾーンでは必ず再集約してから run-weekly を回す（run-weekly に overlay dir を渡せる `--pred-dirs` か mtime 鮮度判定を入れるのは §7 TODO）。
- **pack の事前 assert**（クォータ空振り防止）: 各ゾーン起動前に pack の存在・鮮度・`race_id` 一致を検証し、不在/古い/別レースなら run-experts を起動せず停止して通知する。

`run-experts.sh --only/--out` と `aggregate.mjs` の多ディレクトリ overlay は導入済み（2026-06-20、`bash -n`・dry-run・fixture で検証）。専門家名・カテゴリ・backend・パスはレビューで §3.5/実装と一致を確認済み。

---

## 5. リモコン運用（Remote Control）＋ フォールバック

1. Mac 上に Claude Code セッションを常駐させる（KeepAlive で死活監視・自動再起動）。
2. 発走3時間前、Sho が claude.ai/code（Web/モバイル）から該当セッションに接続。
3. **当日馬場を確認**して「馬場＋仕上げゾーンを実行」と指示（§4 の3コマンド）。実行は Mac ローカル → codex/gemini/配分 すべて動く。
4. 完了後、提出物（`prediction-v1.md` / `betting-v2.md`）を Sho に通知。**予算圧縮・レビュー・購入は人手**。

**フォールバック（接続不可・セッション断・回線断に備える。必須）**:
- **launchd で発走3時間前にも仕上げゾーンを自動実行する**ジョブを置く。Remote Control は「Sho の go ゲート／上書き手段」と位置づけ、**接続できなくても提出物までは自動で出る**ようにする（Remote Control 単独依存にしない）。
- セッション死活監視（launchd `KeepAlive`）＋ **発走4時間前にセッション存在チェック → 不在なら早期通知**。
- 「当日朝の run がセッションを残す」案は、その朝 run がスリープ等で不発だと**セッションも同時に消える相関故障**になるため、セッション維持はスケジュール run とは独立させる。
- 早期に **GitHub Actions self-hosted runner ＋ workflow_dispatch**（GitHub モバイルから push 一発）を「接続不可時の代替トリガ」として用意する。

---

## 6. スケジュール実装（Mac）

- **採用**: Desktop scheduled tasks（または自作 launchd）。静的: T-1日 夜／オッズ: 当日朝。
- **前提**: Mac 起動 ＋ スリープ回避（`pmset`/`caffeinate`）。Desktop scheduled tasks は開いたセッション/常駐は不要で再起動も越えて永続するが、**マシン起動とスリープ回避は必須**（スリープ中は発火しない）。素の launchd+claude -p 自作なら、認証済みユーザ環境での実行が前提。
- **スリープ/再起動耐性**（HIGH リスク = 単一障害点）: 静的(T-1夜)が不発だと以降の全工程が pack-v1 予想欠落のまま進む。対策: (1) 対象時間帯の `pmset schedule wake`／`caffeinate` ラップ。(2) 各ゾーン完了時に**ハートビート**（成果物 mtime かタイムスタンプ）を残し、次ゾーン開始時に前ゾーン完了を **assert**（未完なら停止＋通知）。(3) LaunchAgent は `RunAtLoad` で再起動後に確実にロード。
- **スモークは presence では不十分**: run-weekly 内蔵の `smoke_test()` は `command -v`（バイナリ存在）のみで、認証切れ・クォータ切れ・空応答・trust エラーを検知できず、しかも警告止まり（非ゲート）。→ **各ゾーン起動前に `.claude/skills/cli-smoke-test`（実際に1往復させる）を必須実行**し、**失敗は警告でなく停止＋通知**を既定にする。フォールバック容認は明示フラグ（例 `--allow-fallback`）でのみ。本番スケジュールで `--skip-smoke` は使わない。
- **認証コンテキスト差異**: launchd/Desktop task からヘッドレス起動する実行ユーザの `$HOME`・PATH・認証キャッシュが、インタラクティブ shell と一致して codex/gemini 認証を参照できることを確認（差異があると fallback 化。上記スモークで検知）。
- **トリガ時刻算出**: 発走時刻（**`Asia/Tokyo` 明示の ISO8601**）を単一入力に、3トリガ（T-1夜／当日朝／発走-3h）を1スクリプトで算出して plist 生成する（§7 で優先実装）。Mac のローカル TZ に依存させず、セット後に「次回3トリガの絶対時刻」を表示して目視確認。日付境界（T-1夜の日付ズレ）に注意。

---

## 7. 失敗モードと緩和（無人運用の前提）

無人スケジュール ＋ リモコンは、手作業より**「無音の失敗」が怖い**（回っているつもりで止まっている）。本番投入の必須要件:

- **通知は必須要件（TODO ではない）**: (1) 成功通知（提出物完成・パス・発走までの残り時間）。(2) 失敗/停止通知（スモーク失敗・クォーラム未達・配分不足・pack 不在・前ゾーン未完）。(3) **dead-man's switch**: 各ゾーンが定刻＋猶予内に完了ハートビートを出さなければ別経路で警告。通知は **Mac 常駐とは独立した経路**を最低1つ（PushNotification 等）。
- **当日上書きの silent staleness 検知**: overlay は「後 dir 優先で上書き」なので、当日ゾーンが（クォータ切れ/不発/`--only` 漏れで）対象 expert を出力しないと**静的の暫定値が黙って残り集約される**。対策: 集約前に「v2-odds/v2-baba で上書き必須の expert が最新ファイルを持ち pack_version が `v2-*`」を assert。集約後に `generations[].pack_version` を検証し、当日依存 expert が `v1`（暫定）のままなら警告。
- **クォータ切れ時の挙動**: フォールバック生成せず当該 expert を**欠席扱い**にし（空 Claude 多重を避ける）、回復後の再実行手順を明記。クォーラムを「有効数」だけでなく「**backend 多様性**（codex/gemini が各最低 N 人）」でも判定する多様性ゲートを追加検討。
- **再入（再接続時）**: まず `run-weekly --plan` で進捗とゲートを確認 → 必要なら overlay 元 dir を削除して再集約。`--plan` 表示に「集約に反映済みの pack_version 内訳（暫定 v1 が残っていないか）」を加えるのは TODO。

---

## 8. ギャップ・TODO（効くもの順）

1. **通知経路の実装**（§7。本番投入の必須要件に格上げ）。
2. **pack-builder 未実装**（pack-v1/v2-odds/v2-baba が手動収集）= 入口の手動が残る最大要因。スケジュールはこれが揃っている前提。各ゾーンの pack assert（§4）で空振りは防ぐ。
3. **トリガ時刻の自動算出**（発走時刻 → 3トリガ、`Asia/Tokyo` 固定、plist 生成）。
4. **run-weekly の集約を多dir 対応**（`--pred-dirs` か、overlay 元 dir の mtime 鮮度判定で再集約）。現状は手動多dir aggregate を先に回す運用で回避。
5. **run-weekly の smoke を cli-smoke-test 呼び出しに置換**（presence → 実往復・ゲート化）。
6. ゾーンの薄いラッパー化（pack assert ＋ スモーク ＋ ハートビートを内包する1コマンド）。
7. **GitHub Actions self-hosted runner ＋ workflow_dispatch**（Remote Control 接続不可時の push 一発代替）。
8. backend 多様性クォーラムゲート（§7）。

---

*作成: 2026-06-20 / バックエンド多様性を保つため「Mac 実行・クラウド routine 不使用」を前提に、スケジュール（静的・オッズ）＋ Remote Control リモコン（馬場＋仕上げ・launchd フォールバック付き）の二段構えで設計。3レンズ敵対レビューで factual/用語と運用 failure mode を反映。*
