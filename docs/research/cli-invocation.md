# CLI invocation 仕様メモ — gemini / codex / Claude Code subagent

調査日: 2026-06-12。各 CLI のローカル `--help` 出力と公式ドキュメント（Claude Code subagent ページ）からの一次情報をベースに整理。

## 1. gemini CLI

実バイナリ: `/Users/rhyolite/.nodenv/shims/gemini`

### 非対話実行（headless）

```bash
gemini -p "<プロンプト>"
# あるいは
echo "<追加入力>" | gemini -p "<プロンプト>"
```

- `-p, --prompt` を渡すと non-interactive（headless）モード
- 引数なしで `gemini [query]` だけだと interactive モードに入る
- 標準入力（stdin）に流すと、`-p` のプロンプトに **追記** される（CLI ヘルプ明記）

### モデル指定

```bash
gemini -p "..." -m gemini-2.5-pro
gemini -p "..." --model gemini-2.5-flash
```

- `-m, --model <string>` フラグ
- 値はモデル名文字列。`pro` と `flash` の **モデル選択そのものが effort 段階の役割を果たす**
- 現行（2026-06-12 確認）: `gemini-2.5-pro` / `gemini-2.5-flash` は有効。Gemini 3 系は `gemini-3-pro-preview`（preview 扱い）

### 出力形式

```bash
gemini -p "..." --output-format json          # 構造化出力
gemini -p "..." --output-format stream-json   # ストリーミング JSONL
gemini -p "..." --output-format text          # デフォルト
```

- 集約 skill が解析しやすいよう、本ハーネスからは **`--output-format json` を基本**にする
- `--output-format json` は CLI レベルのエンベロープ: モデル応答は `.response`、他に `.stats`・`.error`（2026-06-12 [公式 headless ドキュメント](https://geminicli.com/docs/cli/headless/)確認済）→ ラッパーで `jq -r .response` 抽出が必要

### 認証

- インタラクティブで初回ログイン後、ローカルに認証情報がキャッシュされる想定
- API キー方式の場合は `GEMINI_API_KEY` 環境変数（要確認）。**スクリプト内で参照する形にし、Claude のプロンプトには直接展開しない**（グローバルセキュリティルール）

### その他

- `--approval-mode plan` で読み取り専用モード
- 本ハーネスでは予想専門家として呼ぶので、**書き込み権限を与えない**（`--approval-mode plan` を基本）

## 2. codex CLI

実バイナリ: `/Users/rhyolite/.local/bin/codex`

### 非対話実行（exec）

```bash
codex exec "<プロンプト>"
# stdin から
echo "<長いプロンプト>" | codex exec -
# プロンプト＋stdin（stdin は <stdin> ブロックとして追記）
echo "追加データ" | codex exec "ベースのプロンプト"
```

- サブコマンド `codex exec`（alias: `codex e`）が non-interactive 実行
- プロンプトを引数で渡さず stdin にすると `-` を使う

### モデル指定

```bash
codex exec -m gpt-5.5 "..."
```

- `-m, --model <MODEL>` フラグ
- 現行モデル（2026-06-12 [公式一覧](https://developers.openai.com/codex/models)確認済）: `gpt-5.5`（デフォルト）、`gpt-5.4-mini`、`gpt-5.3-codex`、`gpt-5.3-codex-spark` 等。**`o3` は現行一覧から消えている**

### reasoning effort 設定

codex には reasoning effort 専用フラグは存在しない。代わりに **`-c` で config 値を上書き**する方式:

```bash
codex exec -c model_reasoning_effort=high   -m gpt-5.5 "..."
codex exec -c model_reasoning_effort=medium -m gpt-5.5 "..."
codex exec -c model_reasoning_effort=low    -m gpt-5.5 "..."
```

- `-c <key=value>` で `~/.codex/config.toml` の値を 1 回限り上書き
- 値は TOML パース → 失敗時は raw 文字列扱い
- `model_reasoning_effort` は現行 codex で有効な config キー（2026-06-12 [公式 config reference](https://developers.openai.com/codex/config-reference) 確認済）。値域: `minimal / low / medium / high / xhigh`（一部モデルは xhigh 不可）

### 出力形式

```bash
codex exec --json "..."                  # JSONL イベントを stdout に流す
codex exec -o last_message.txt "..."     # 最終メッセージのみファイルに
codex exec --output-schema schema.json "..."  # JSON Schema に従う構造化出力
```

- 本ハーネスからは **`--output-schema` でレースの予想スキーマ JSON を強制**するのが最も堅い接続方法

### 承認・サンドボックス

```bash
codex exec -a never -s read-only "..."
```

- `-a, --ask-for-approval`: `untrusted | on-request | never`
- `-s, --sandbox`: `read-only | workspace-write | danger-full-access`
- 本ハーネスでは **`-a never -s read-only`** を基本（予想だけさせ、書き込み・コマンド実行は要らない）

### 認証

- `codex login` で初回認証 → ローカルキャッシュ
- API キー方式は `OPENAI_API_KEY` 環境変数（要確認）
- **スクリプト内で env を参照、プロンプトに直接展開しない**

## 3. Claude Code subagent (.claude/agents/*.md) 仕様

公式ドキュメント: https://code.claude.com/docs/en/subagents.md

### frontmatter フィールド

| フィールド | 必須 | 値の型 | 説明 |
|---|---|---|---|
| `name` | ✅ | 小文字 + ハイフン | ユニーク識別子 |
| `description` | ✅ | 文字列 | Claude が自動委譲判定に使う説明 |
| `tools` | | list / カンマ区切り文字列 | 利用可能ツール（例: `Read, Grep, Glob, Bash`）。省略すると全ツール |
| `disallowedTools` | | list / カンマ区切り文字列 | 除外ツール |
| `model` | | `sonnet` / `opus` / `haiku` / `fable` / 完全 ID / `inherit` | 使用モデル。デフォルト `inherit`（親と同じ） |
| `permissionMode` | | `default` / `acceptEdits` / `auto` / `dontAsk` / `bypassPermissions` / `plan` | パーミッション動作 |
| `maxTurns` | | 数値 | 最大ターン数 |
| `skills` | | list | プリロード skill |
| `mcpServers` | | object | MCP サーバー設定 |
| `hooks` | | object | ライフサイクルフック |
| `memory` | | `user` / `project` / `local` | 永続メモリスコープ |
| `background` | | bool | バックグラウンド実行（デフォルト false） |
| `effort` | | `low` / `medium` / `high` / `xhigh` / `max` | 努力レベル |
| `isolation` | | `worktree` | git worktree 隔離 |
| `color` | | red / blue / green / yellow / purple / orange / pink / cyan | 表示色 |

### 実在しないフィールド（要注意）

- ❌ `auto_invocation` — 存在しない。**自動委譲は `description` の書き方で制御**する
- ❌ `agent_toolset_20260401` — 存在しない（これは Anthropic Messages API のツールバージョン名）

### model 指定の値

- **alias** 推奨: `sonnet`, `opus`, `haiku`, `fable`
- **完全 ID** も可: `claude-opus-4-8`, `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`, `claude-fable-5`
- **`inherit`**（デフォルト）: 親会話と同じモデル

### effort 指定の値

- `low` / `medium` / `high` / `xhigh` / `max`
- ハーネス側で各専門家 subagent に effort を割り当てるネイティブ手段

### description の書き方（auto-invocation）

- ユーザー視点で「いつこの agent を呼ぶべきか」を明記
- 例: `"Use when the user asks for race predictions for the Takarazuka Kinen."`

## 4. k-ba-man での運用方針

### ラッパースクリプト経由で外部 CLI を呼ぶ（セキュリティルール準拠）

Claude のプロンプトに `$OPENAI_API_KEY` や `$GEMINI_API_KEY` を **直接展開しない**。

```
.claude/agents/
  jinba-makoto.md          # 専門家 subagent（codex バックエンド）
  jinba-makoto-codex.sh    # ラッパースクリプト（コロケーション）
  jinba-hina.md            # 専門家 subagent（gemini バックエンド）
  jinba-hina-gemini.sh     # ラッパースクリプト
```

`jinba-makoto-codex.sh` の例（API キーはスクリプト内で env から取得、Claude は結果だけ受け取る）:

```bash
#!/usr/bin/env bash
# codex 経由で専門家「誠」を呼ぶ
set -euo pipefail
# OPENAI_API_KEY は env から取得（このスクリプトは Claude にキー文字列を渡さない）
codex exec \
  -a never -s read-only \
  --search \
  -m gpt-5.5 \
  -c model_reasoning_effort=high \
  --output-schema "$(dirname "$0")/expert-output.schema.json" \
  -o /tmp/jinba-makoto-out.txt \
  "$(cat)"
cat /tmp/jinba-makoto-out.txt
```

Claude Code 側 subagent (`jinba-makoto.md`) の frontmatter は `tools: Bash` だけ与え、Bash でラッパーを呼ぶ。

### effort 統一マッピング

3 つのバックエンドで「effort 高/中/低」をどう実現するかを揃える:

| effort | Claude（subagent `effort` フィールド） | codex（`-c model_reasoning_effort`） | gemini（`-m`） |
|---|---|---|---|
| 高 | `high` または `xhigh` | `high` | `gemini-2.5-pro` |
| 中 | `medium` | `medium` | `gemini-2.5-flash`（高めの effort）|
| 低 | `low` | `low` | `gemini-2.5-flash`（簡潔指示で短く） |

### 確認済みの事実 vs 推測

**確認済み（ヘルプ出力 / 公式ドキュメントから直接引用）**:
- gemini の `-p / -m / --output-format` フラグの存在と意味
- codex の `exec / -m / -c / --json / --output-schema / -a / -s` の存在
- Claude Code subagent frontmatter のフィールド一覧（公式ドキュメント参照）

**2026-06-12 の追加検証で確認済みに昇格**:
- codex `model_reasoning_effort` は有効（値域 `minimal/low/medium/high/xhigh`）
- gemini `--output-format json` は `.response` / `.stats` / `.error` 構造
- codex 現行モデルは `gpt-5.5` 系（`o3` は廃止）

**推測のまま（実装時に再確認）**:
- 環境変数名 `OPENAI_API_KEY` / `GEMINI_API_KEY` の正確な名前（codex は `codex login` の OAuth でも可）
- gemini の認証フローの詳細
