---
name: cli-smoke-test
description: gemini / codex CLI バックエンドの疎通（スモーク）テスト。k-ba-man の予想・配分ラッパーと同じ呼び出し方（gpt-5.5 / gemini-2.5-flash、read-only サンドボックス、TRUST_WORKSPACE、--output-format json）で小さなプロンプトを1往復させ、CLI の存在だけでなく実際の応答・空出力・quota切れ・trust エラーを検知する。「gemini codex の疎通テスト」「CLI 死活確認」「本番（run-weekly）前のスモークテスト」のときに使う。
---

# cli-smoke-test

gemini / codex を**実際に1往復呼び出して**疎通を確認するスキル。`run-weekly.sh` の
`smoke_test()` が presence チェック（`command -v` + `--version`）止まりなのに対し、これは
小さなプロンプトを投げて応答が返るところまで確認する。`cli-backend-pitfalls` メモリが言う
「**本実行の前に必ず小さいプロンプトでスモークテストする**」を担うのがこのスキル。

## 使い方

このスキルが呼ばれたら、コロケーションされたスクリプトを実行して結果を報告する：

```bash
bash .claude/skills/cli-smoke-test/smoke-test.sh
```

オプション（ユーザーの依頼に応じて付ける）:
- `--codex-only` / `--gemini-only` — 片方だけテスト
- `--fix` / `--login` — 認証エラーを検出したら、その場で再ログイン工程へ移行する（下記フロー）
- `--quiet` — 応答スニペットを省略しサマリのみ
- `--timeout <秒>` — 1往復のタイムアウト（既定90、`timeout`/`gtimeout` がある場合のみ有効）

> 注: `gemini`/`codex` がインタラクティブシェルにしか PATH 登録されていない場合、Claude の
> Bash から `command -v` で見つからないことがある。その場合はユーザーに `! bash
> .claude/skills/cli-smoke-test/smoke-test.sh` をプロンプトで実行してもらうと、ログインシェルの
> PATH で走る。

## 認証エラー時のフロー（重要）

疎通テストが**認証エラー**で失敗したら、**すぐにログイン工程へ移行する**のがこのスキルの役目。
ただし codex と gemini で復旧方法が根本的に違う:

| バックエンド | 認証失敗の正体 | 復旧 |
|---|---|---|
| **codex** | 401 Unauthorized（トークン失効） | **`codex login`**（ブラウザOAuth。headless は `codex login --device-auth`）で直る |
| **gemini** | IneligibleTier（個人無償OAuth `oauth-personal` が **2026-06-18 恒久廃止**） | **再ログインでは直らない**。`export GEMINI_API_KEY=<AI Studioキー>` で復旧（env のみ・ラッパー改修不要）。代替は Vertex |

**フローの回し方:**
1. まず `bash …/smoke-test.sh` を実行。
2. 認証エラーが出たら、`--fix` を付けて再実行すると自動でログイン工程へ移行する。ブラウザ認証
   が要るので**ユーザーの端末で** `! bash .claude/skills/cli-smoke-test/smoke-test.sh --fix` の形で
   実行してもらう（Claude の Bash で直接叩くと `codex login` がブラウザ待ちでブロックする）。
   - codex 認証失敗時: スクリプトが自動で `codex login` を実行 → **ログイン後に再テスト**して
     最終結果と終了コードを返す。
   - gemini 認証失敗時: 自動ログインは不可。スクリプトが `GEMINI_API_KEY` / Vertex の手順を案内
     するので、ユーザーが `export GEMINI_API_KEY=…` を設定 → `--gemini-only` で再確認。
3. Claude は、認証エラーを見たら黙って報告で終わらせず、上記の「次の手順」を**能動的に案内**する
   こと（codex なら `! codex login` を提案、gemini なら API キー設定を提案）。

## テストする呼び出し（本番ラッパーと同一の流派）

| バックエンド | モデル | 使うラッパー | 疎通テストのコマンド骨子 |
|---|---|---|---|
| codex | gpt-5.5 | jinba-{makoto,teppei}, haibun-ittetsu | `codex exec -s read-only -m gpt-5.5 -c model_reasoning_effort=low -o <file> -` |
| gemini | gemini-2.5-flash | jinba-hina, jinba-yuko, haibun-ritsu | `GEMINI_CLI_TRUST_WORKSPACE=true gemini -p … -m gemini-2.5-flash --output-format json --approval-mode plan` |

reasoning effort のみ疎通確認用に `low` へ落とす（本番は high）。それ以外のフラグは本番と同じ。

> ※ 吾郎(goro) は gemini-2.5-pro → **Claude opus-4-6/max** へ移行したため、**gemini-2.5-pro を使うエージェントは無くなった**。このスキルは gemini を flash のみテストする（pro はテスト対象外）。goro の opus-4-6 は Claude 直結なのでこの CLI スモークの範囲外（Claude の死活は run-weekly.sh の `smoke_test()` が見る）。

## 検知する失敗モードと対処（cli-backend-pitfalls 由来）

- **codex: 出力が空（silent empty）** — `--output-schema` の非対応キーワードやモデル不達で
  `-o` が0バイトになる典型。このスキルは空出力を ✗ として検知する。対処: ラッパーは
  `--output-schema` を使わずプロンプトにスキーマをインライン記述（既に修正済み）。
- **codex: 非0終了 / 引数エラー** — `codex exec` に未対応フラグ（旧 `-a`/`--search` 等）。
- **gemini: 認証エラー（IneligibleTier / oauth-personal 廃止・2026-06-18）** — 個人無償OAuthが恒久廃止。
  ✗ として検知。再ログイン不可。`export GEMINI_API_KEY=<AI Studioキー>` で復旧（env のみ・ラッパー改修不要）。
  上の「認証エラー時のフロー」参照。
- **gemini: trust エラー** — `GEMINI_CLI_TRUST_WORKSPACE=true` 未設定で
  「not running in a trusted directory」。
- **gemini: quota 切れ** — 無償 API キーは pro 5RPM/50req日・flash 10RPM と低い。✗ 検知時は flash に
  落とすか時間を置く／課金キー・Vertex へ。
- **gemini: コードフェンス付き応答** — `.response` が ```json で包まれる → `sed '/^```/d'` で除去
  （スクリプト内で処理済み）。

## 終了コードと読み方

- 全テスト成功 → 終了コード 0。「バックエンド多様性 OK、本番 GO」と報告。
- 1件以上失敗 → 終了コード 1。該当バックエンドは本番で Claude fallback になり**実効的な独立性・
  多様性が下がる**ことを伝え、上表の対処を案内する。
- 警告（⚠）は応答はあるが期待 JSON と不一致のケース。疎通自体は OK なので失敗扱いにはしない。

## 関連

- ラッパー本体: `.claude/agents/jinba-*-{codex,gemini}.sh`, `.claude/agents/haibun-*-{codex,gemini}.sh`
- 既存の presence チェック: `scripts/run-weekly.sh` の `smoke_test()` / `report_backend_health()`
- 落とし穴の記録: メモリ `cli-backend-pitfalls`、`docs/research/cli-invocation.md`
