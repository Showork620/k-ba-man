#!/usr/bin/env bash
# cli-smoke-test — gemini / codex バックエンドの疎通（スモーク）テスト
#
# k-ba-man の予想/配分ラッパー（.claude/agents/jinba-*-{codex,gemini}.sh,
# haibun-*-{codex,gemini}.sh）と「同じ呼び出し方」で小さなプロンプトを1往復させ、
# 「CLI が存在するか」だけでなく「実際に応答が返るか」を確認する。
# 既存の run-weekly.sh の smoke_test() は presence チェックのみ。これはその上位版。
#
# 検知する失敗モード（cli-backend-pitfalls メモリ由来・2026-06-12 実戦で確認）:
#   codex : --output-schema サイレント空出力 / モデル gpt-5.5 不達 / 引数エラー
#   gemini: GEMINI_CLI_TRUST_WORKSPACE 未設定の trust エラー / pro の quota 切れ /
#           .response のコードフェンス
#
# 呼び出し方は本番ラッパーに合わせる（疎通確認なので reasoning effort のみ low に落とす）:
#   codex : codex exec -s read-only -m gpt-5.5 -c model_reasoning_effort=low -o <file> -
#   gemini: GEMINI_CLI_TRUST_WORKSPACE=true gemini -p ... -m <model> --output-format json --approval-mode plan
#
# 外部 API は読み取り相当（プロンプト送信→補完受信）のみ。codex は -s read-only、
# gemini は --approval-mode plan で副作用なし。ファイル書き込み・ツール実行は行わない。
#
# 使い方:
#   bash .claude/skills/cli-smoke-test/smoke-test.sh [options]
#     --codex-only       codex だけテスト
#     --gemini-only      gemini（flash）だけテスト ※pro を使うエージェントは無い（吾郎は Claude へ移行）
#     --fix, --login     認証エラーを検出したら、その場で再ログイン工程へ移行する
#                        （codex は `codex login` を実行→再テスト。gemini は方式が
#                        違うため復旧手順を案内）。ブラウザ認証が要るので自分の
#                        端末で `! bash …/smoke-test.sh --fix` のように実行する
#     --quiet            応答スニペットを省略しサマリのみ
#     --timeout <sec>    1 往復のタイムアウト秒（既定 90。timeout/gtimeout がある場合のみ有効）
#     -h, --help         このヘルプ
#
# 終了コード: 全テスト成功=0 / 1件以上失敗=1（警告は失敗にしない）
#   --fix 指定時は「ログイン後の再テスト」結果で終了コードを返す

set -uo pipefail   # -e は付けない（失敗を握って報告したいため）

DO_CODEX=1
DO_GEMINI=1
QUIET=0
FIX=0
TIMEOUT_SEC=90

while [ $# -gt 0 ]; do
  case "$1" in
    --codex-only)  DO_GEMINI=0 ;;
    --gemini-only) DO_CODEX=0 ;;
    --quiet)       QUIET=1 ;;
    --fix|--login) FIX=1 ;;
    --timeout)     shift; TIMEOUT_SEC="${1:?--timeout には秒数が必要}" ;;
    -h|--help)
      # 行番号に依存せず、先頭の連続コメント行をそのままヘルプとして出す
      awk 'NR>1 && /^#/{sub(/^# ?/,""); print; next} NR>1{exit}' "$0"
      exit 0 ;;
    *) echo "不明なオプション: $1（-h でヘルプ）" >&2; exit 2 ;;
  esac
  shift
done

# 期待する応答: smoke と ok の両方を含む小さな JSON
SMOKE_PROMPT='Reply with ONLY this JSON, no prose and no code fence: {"smoke":"ok"}'

# ── タイムアウト・ラッパー（timeout/gtimeout があれば使う）──
TIMEOUT_BIN=""
if   command -v timeout  >/dev/null 2>&1; then TIMEOUT_BIN="timeout"
elif command -v gtimeout >/dev/null 2>&1; then TIMEOUT_BIN="gtimeout"
fi
run_with_timeout() {
  if [ -n "$TIMEOUT_BIN" ]; then "$TIMEOUT_BIN" "$TIMEOUT_SEC" "$@"; else "$@"; fi
}

# ── 認証失敗の追跡（バックエンド別。--fix の再ログイン工程で参照）──
CODEX_AUTH_FAIL=0
GEMINI_AUTH_FAIL=0

# gemini の再認証手順（単一の真実源。手順が変わったらここだけ直す）
# ※ gemini は codex のような一発 `gemini login` では直らない。oauth-personal
#   （個人向け無償OAuth = Code Assist for individuals）が廃止されたため。
gemini_remediation() {
  cat <<'EOF'
  gemini: 個人向け無償OAuth(oauth-personal)は2026-06-18に恒久廃止。codex と違い再ログインでは直らない。次のいずれか:
    (A・推奨) AI Studio(https://aistudio.google.com/apikey)でキー発行 → export GEMINI_API_KEY=<キー> して再実行
              （gemini-cli は非対話なら env だけで USE_GEMINI に切替。settings.json 変更もラッパー改修も不要）
    (B・代替) Vertex 経由:  export GOOGLE_GENAI_USE_VERTEXAI=true; export GOOGLE_CLOUD_PROJECT=<proj>;
              export GOOGLE_CLOUD_LOCATION=us-central1  + gcloud auth application-default login
    確認:  bash .claude/skills/cli-smoke-test/smoke-test.sh --gemini-only
    ※ 無償キーは pro 5RPM/50req日・flash 10RPM と低め。詰まれば課金キー or Vertex。
    ※ Antigravity CLI は headless の API キー認証が未対応(Issue #78)のため、非対話パイプラインには現状不向き。
EOF
}

# ── 出力ヘルパー（色は端末向け）──
PASS=0; FAILED=0; WARNED=0
_c() { if [ -t 1 ]; then printf '\033[%sm' "$1"; fi; }   # tty のときだけ色
_r() { if [ -t 1 ]; then printf '\033[0m'; fi; }
snippet() { printf '%s' "$1" | tr '\n' ' ' | cut -c1-140; }
ok()   { PASS=$((PASS+1));     printf '  %s✓%s %-22s %s\n' "$(_c 32)" "$(_r)" "$1" "${2:-}"; [ "$QUIET" -eq 0 ] && [ -n "${3:-}" ] && printf '      ↳ %s\n' "$(snippet "$3")"; return 0; }
warn() { WARNED=$((WARNED+1)); printf '  %s⚠%s %-22s %s\n' "$(_c 33)" "$(_r)" "$1" "${2:-}"; [ "$QUIET" -eq 0 ] && [ -n "${3:-}" ] && printf '      ↳ %s\n' "$(snippet "$3")"; return 0; }
fail() { FAILED=$((FAILED+1));  printf '  %s✗%s %-22s %s\n' "$(_c 31)" "$(_r)" "$1" "${2:-}"; return 1; }

# ── codex 疎通 ──
test_codex() {
  local label="codex (gpt-5.5)"
  if ! command -v codex >/dev/null 2>&1; then
    fail "$label" "codex CLI が PATH に無い（command -v codex 失敗）→ 誠・鉄平・一徹が Claude fallback"
    return
  fi
  local ver out raw rc
  ver="$(codex --version 2>/dev/null | head -1)"
  out="$(mktemp "${TMPDIR:-/tmp}/smoke-codex.txt.XXXXXX")"
  # 本番ラッパーと同じ: -s read-only / -m gpt-5.5 / -o ファイル受け（--output-schema は使わない）
  printf '%s\n' "$SMOKE_PROMPT" \
    | run_with_timeout codex exec -s read-only -m gpt-5.5 -c model_reasoning_effort=low -o "$out" - \
        >/dev/null 2>"$out.err"
  rc=$?
  raw="$(sed '/^```/d' "$out" 2>/dev/null)"
  local err errmsg
  err="$(cat "$out.err" 2>/dev/null)"
  # 代表エラー行: 非本質的ノイズ（壊れた/存在しない skill の読み込み失敗ログ）を除き、
  # 認証・接続系を優先して拾う。無ければノイズ除去後の末尾行。
  errmsg="$(printf '%s\n' "$err" | grep -viE 'failed to load skill' | grep -iE '401|unauthor|authenticat|quota|exhaust|websocket|reconnect|error' | tail -1)"
  [ -z "$errmsg" ] && errmsg="$(printf '%s\n' "$err" | grep -viE 'failed to load skill' | tail -1)"
  if [ "$rc" -eq 124 ]; then
    fail "$label" "タイムアウト(${TIMEOUT_SEC}s) ver=$ver"
  elif printf '%s' "$err" | grep -qiE '401|unauthorized|not logged in|authentication failed|please run .*login'; then
    CODEX_AUTH_FAIL=1
    fail "$label" "認証エラー: 未ログイン/トークン失効（401 Unauthorized）→ codex の再ログインが必要。ver=$ver"
  elif [ "$rc" -ne 0 ]; then
    fail "$label" "codex exec 非0終了(rc=$rc) ver=$ver — ${errmsg:-（stderr空）}"
  elif [ ! -s "$out" ]; then
    # まさに --output-schema サイレント空出力 / モデル不達のパターン
    fail "$label" "出力が空（silent empty: -o が0バイト。モデル不達 or schema 落とし穴の兆候）ver=$ver"
  elif printf '%s' "$raw" | grep -qi smoke && printf '%s' "$raw" | grep -qi ok; then
    ok "$label" "$ver" "$raw"
  else
    warn "$label" "応答はあるが期待JSONと不一致 ver=$ver" "$raw"
  fi
  rm -f "$out" "$out.err"
}

# ── gemini 疎通（モデルを引数で受ける）──
test_gemini() {
  local model="$1" label="gemini ($1)"
  if ! command -v gemini >/dev/null 2>&1; then
    fail "$label" "gemini CLI が PATH に無い（command -v gemini 失敗）→ 吾郎・陽菜・律が Claude fallback"
    return
  fi
  local ver raw resp rc errf combined
  ver="$(gemini --version 2>/dev/null | head -1)"
  errf="$(mktemp "${TMPDIR:-/tmp}/smoke-gemini.err.XXXXXX")"
  # 本番ラッパーと同じ: TRUST_WORKSPACE / --output-format json / --approval-mode plan
  raw="$(run_with_timeout env GEMINI_CLI_TRUST_WORKSPACE=true \
            gemini -p "$SMOKE_PROMPT" -m "$model" --output-format json --approval-mode plan 2>"$errf")"
  rc=$?
  combined="$raw $(cat "$errf" 2>/dev/null)"
  if [ "$rc" -eq 124 ]; then
    fail "$label" "タイムアウト(${TIMEOUT_SEC}s) ver=$ver"
  elif printf '%s' "$combined" | grep -qiE 'ineligibletier|no longer supported|unauthenticated|reauthenticate|error authenticating|migrate to'; then
    GEMINI_AUTH_FAIL=1
    fail "$label" "認証エラー: アカウント階層が無効/未認証（IneligibleTier 等）→ 再認証・プラン移行が必要。ver=$ver"
  elif printf '%s' "$combined" | grep -qiE 'exhausted|quota|resource_exhausted|capacity'; then
    fail "$label" "quota 切れの兆候（pro→flash に落とすか時間を置く）ver=$ver"
  elif printf '%s' "$combined" | grep -qiE 'trust|not running in a trusted'; then
    fail "$label" "trust エラー（GEMINI_CLI_TRUST_WORKSPACE 要確認）ver=$ver"
  else
    resp="$(printf '%s' "$raw" | jq -r '.response // empty' 2>/dev/null | sed '/^```/d')"
    if [ -z "$resp" ]; then
      fail "$label" "応答が空/JSON抽出不可(rc=$rc) ver=$ver — $(head -1 "$errf" 2>/dev/null)"
    elif printf '%s' "$resp" | grep -qi smoke && printf '%s' "$resp" | grep -qi ok; then
      ok "$label" "$ver" "$resp"
    else
      warn "$label" "応答はあるが期待JSONと不一致 ver=$ver" "$resp"
    fi
  fi
  rm -f "$errf"
}

# ════════════════════════════════════════════════════════════════
echo "════ CLI 疎通スモークテスト（k-ba-man ラッパーと同じ呼び出し方で1往復）════"
if ! command -v jq >/dev/null 2>&1; then
  echo "  注: jq が無いため gemini の .response 抽出が不完全になります（brew install jq）"
fi
if [ -z "$TIMEOUT_BIN" ]; then
  echo "  注: timeout/gtimeout が無いため各呼び出しのタイムアウトは無効（brew install coreutils で gtimeout）"
fi
echo

[ "$DO_CODEX"  -eq 1 ] && test_codex
# gemini は flash のみ（吾郎=旧 pro は Claude opus-4-6 へ移行。pro を使うエージェントは無い）
[ "$DO_GEMINI" -eq 1 ] && test_gemini gemini-2.5-flash

echo
echo "──── サマリ: ✓${PASS}  ⚠${WARNED}  ✗${FAILED} ────"
if [ "$FAILED" -gt 0 ]; then
  echo "  → 失敗あり。該当バックエンドは本番で Claude fallback になり実効多様性が下がる（cli-backend-pitfalls）"
fi

AUTH_FAIL=$(( CODEX_AUTH_FAIL + GEMINI_AUTH_FAIL ))

# ── 認証エラー時のログイン工程への移行 ──
if [ "$AUTH_FAIL" -gt 0 ] && [ "$FIX" -eq 0 ]; then
  # 既定: 次の手順を案内（--fix を付ければ自動実行）
  echo
  echo "── 認証エラーを検出。再認証の手順 ──"
  [ "$CODEX_AUTH_FAIL" -eq 1 ] && echo "  codex : codex login   （ブラウザでOAuth。headless は codex login --device-auth）"
  [ "$GEMINI_AUTH_FAIL" -eq 1 ] && gemini_remediation
  echo "  → --fix を付けて再実行すると、ログイン工程へ自動で移行します:"
  echo "       ! bash .claude/skills/cli-smoke-test/smoke-test.sh --fix"

elif [ "$AUTH_FAIL" -gt 0 ] && [ "$FIX" -eq 1 ]; then
  # --fix: その場で再ログイン工程に移行
  echo
  echo "════ --fix: 認証フローへ移行 ════"
  if [ "$CODEX_AUTH_FAIL" -eq 1 ]; then
    if command -v codex >/dev/null 2>&1; then
      echo "▶ codex login を実行します（ブラウザが開きます。完了するまで待機）…"
      if codex login; then echo "  ✓ codex login 完了"; else echo "  ✗ codex login 失敗（headless なら codex login --device-auth を試す）"; fi
    fi
  fi
  if [ "$GEMINI_AUTH_FAIL" -eq 1 ]; then
    echo "▶ gemini は自動ログインで復旧できません。手順:"
    gemini_remediation
  fi
  # ログイン後の状態で再テストし、その結果で終了コードを返す
  echo
  echo "════ 再テスト（ログイン後の状態）════"
  PASS=0; FAILED=0; WARNED=0
  [ "$DO_CODEX"  -eq 1 ] && [ "$CODEX_AUTH_FAIL"  -eq 1 ] && test_codex
  [ "$DO_GEMINI" -eq 1 ] && [ "$GEMINI_AUTH_FAIL" -eq 1 ] && test_gemini gemini-2.5-flash
  echo
  echo "──── 再テスト後サマリ: ✓${PASS}  ⚠${WARNED}  ✗${FAILED} ────"
fi

[ "$FAILED" -eq 0 ]
