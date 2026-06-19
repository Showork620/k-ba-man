#!/usr/bin/env bash
# 10人の専門家を（全員 or 部分集合で）並列実行し、predictions/<out>/ に保存する。
# §3.5 の3カテゴリ運用（当日情報への感応度で分割）の選択的再実行に対応:
#   全員（v1 基本実行）:    scripts/run-experts.sh <pack-v1.json>
#   オッズ依存組（当日朝）:  scripts/run-experts.sh <pack-v2-odds.json> --only sakura,yuko,hina --out v2-odds
#   馬場依存組（発走3h前）:  scripts/run-experts.sh <pack-v2-baba.json> --only goro,misaki,kenta --out v2-baba
# クォーラム判定（≥8）は全員実行時のみ。部分実行では出さない（少人数集約の事故防止は呼び出し側の責務）。
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"

usage() {
  cat >&2 <<'EOF'
usage: scripts/run-experts.sh <pack.json> [options]
  <pack.json>          RaceDataPack（位置引数。--pack でも可）
  --only n1,n2,...      実行する専門家をカンマ区切りで限定（既定: 全10人）
  --out <subdir>        保存先 predictions/<subdir>/（既定: v1）
  --pack <path>         pack を明示指定（位置引数の代わり）
  --dry-run            実行せず、対象・pack・保存先だけ表示して終了
  -h, --help           このヘルプ
有効な専門家: tatsunosuke makoto misaki kenta teppei sakura aoi hina yuko goro
EOF
}

# ── 引数パース ──
PACK=""
ONLY=""
OUT="v1"
DRYRUN=0
while [ $# -gt 0 ]; do
  case "$1" in
    --only)    ONLY="${2:?--only にはカンマ区切りの専門家名が必要}"; shift ;;
    --out)     OUT="${2:?--out にはサブディレクトリ名が必要}"; shift ;;
    --pack)    PACK="${2:?--pack にはファイルパスが必要}"; shift ;;
    --dry-run) DRYRUN=1 ;;
    -h|--help) usage; exit 0 ;;
    -*)        echo "unknown option: $1" >&2; usage; exit 2 ;;
    *)         PACK="$1" ;;
  esac
  shift
done

[ -n "$PACK" ] || { echo "✗ pack が未指定" >&2; usage; exit 2; }
[ -f "$PACK" ] || { echo "✗ pack が見つからない: $PACK" >&2; exit 1; }
# --out はサブディレクトリ名のみ許可（パス脱出・誤爆防止）
case "$OUT" in
  */*|..|.|"") echo "✗ --out はサブディレクトリ名のみ指定可: \"$OUT\"" >&2; exit 2 ;;
esac

PACK="$(cd "$(dirname "$PACK")" && pwd)/$(basename "$PACK")"
RACE_DIR="$(dirname "$PACK")"
PRED_DIR="$RACE_DIR/predictions/$OUT"

AGENTS_DIR=".claude/agents"
SCHEMA="$AGENTS_DIR/expert-output.schema.json"
SCHEMA_CONTENT="$(cat "$SCHEMA")"

# ── 専門家→バックエンドの正典マップ（10人）──
ALL_EXPERTS=(tatsunosuke makoto misaki kenta teppei sakura aoi hina yuko goro)
is_known() { local n; for n in "${ALL_EXPERTS[@]}"; do [ "$n" = "$1" ] && return 0; done; return 1; }

run_claude() {
  local name="$1"
  local out="$PRED_DIR/${name}.json"
  echo "[claude] $name 開始..."
  claude -p "$PACK" \
    --agent "jinba-$name" \
    --allowedTools "Read,WebFetch,WebSearch" \
    --output-format text \
    > "$out.raw" 2>"$out.log" || true
  # エージェント出力から JSON を抽出（コードブロック内 or 生 JSON）
  if jq '.' "$out.raw" >/dev/null 2>&1; then
    mv "$out.raw" "$out"
  elif grep -q '^{' "$out.raw"; then
    sed -n '/^{/,/^}/p' "$out.raw" | jq '.' > "$out" 2>/dev/null || mv "$out.raw" "$out"
  elif grep -q '```json' "$out.raw"; then
    sed -n '/```json/,/```/p' "$out.raw" | sed '1d;$d' | jq '.' > "$out" 2>/dev/null || mv "$out.raw" "$out"
  else
    mv "$out.raw" "$out"
  fi
  rm -f "$out.raw"
  echo "[claude] $name 完了 → $out"
}

run_cli() {
  local script="$1"
  local name="$2"
  local out="$PRED_DIR/${name}.json"
  local cli_type="${3:-cli}"
  echo "[$cli_type] $name 開始..."
  bash "$script" "$PACK" > "$out" 2>"$out.log" || true
  if ! jq '.' "$out" >/dev/null 2>&1; then
    echo "[$cli_type] $name: JSON パース失敗（ログ: $out.log）" >&2
  fi
  echo "[$cli_type] $name 完了 → $out"
}

# 名前→正しいランナーへ振り分け（バックエンドの正典: Claude6 / codex2 / gemini2）
run_one() {
  case "$1" in
    tatsunosuke|misaki|kenta|sakura|aoi|goro) run_claude "$1" ;;
    makoto) run_cli "$AGENTS_DIR/jinba-makoto-codex.sh" makoto codex ;;
    teppei) run_cli "$AGENTS_DIR/jinba-teppei-codex.sh" teppei codex ;;
    hina)   run_cli "$AGENTS_DIR/jinba-hina-gemini.sh"  hina   gemini ;;
    yuko)   run_cli "$AGENTS_DIR/jinba-yuko-gemini.sh"  yuko   gemini ;;
    *) echo "unknown expert: $1" >&2; return 1 ;;
  esac
}

# ── 実行対象の決定（--only があれば部分集合、無ければ全10人）──
if [ -n "$ONLY" ]; then
  IFS=',' read -ra SELECTED <<< "$ONLY"
  for n in "${SELECTED[@]}"; do
    is_known "$n" || { echo "✗ 未知の専門家: \"$n\"（有効: ${ALL_EXPERTS[*]}）" >&2; exit 2; }
  done
  SUBSET=1
else
  SELECTED=("${ALL_EXPERTS[@]}")
  SUBSET=0
fi

echo "対象: ${SELECTED[*]}"
echo "pack: $PACK"
echo "保存先: $PRED_DIR"
if [ "$DRYRUN" -eq 1 ]; then
  echo "（--dry-run のため実行しない）"
  exit 0
fi
mkdir -p "$PRED_DIR"

# ── 並列実行 ──
PIDS=()
NAMES=()
for name in "${SELECTED[@]}"; do
  run_one "$name" &
  PIDS+=($!)
  NAMES+=("$name")
done

echo ""
echo "=== ${#NAMES[@]}人を並列実行中 (PID: ${PIDS[*]}) ==="
echo ""

FAILED=()
for i in "${!PIDS[@]}"; do
  if ! wait "${PIDS[$i]}"; then
    FAILED+=("${NAMES[$i]}")
  fi
done

echo ""
echo "=== 実行完了（出力先: $PRED_DIR）==="

VALID=0
TOTAL=${#NAMES[@]}
for name in "${NAMES[@]}"; do
  f="$PRED_DIR/${name}.json"
  if [ -f "$f" ] && jq -e '.expert_id' "$f" >/dev/null 2>&1; then
    VALID=$((VALID + 1))
  else
    echo "  ✗ $name: 無効な出力"
  fi
done

echo "  有効: $VALID / $TOTAL"
if [ ${#FAILED[@]} -gt 0 ]; then
  echo "  失敗: ${FAILED[*]}"
fi

if [ "$SUBSET" -eq 1 ]; then
  # 部分実行（当日再実行）: クォーラムは全員集約時に判定するためここでは出さない
  echo ""
  echo "部分実行（${SELECTED[*]} → predictions/$OUT/）。"
  echo "  → 全カテゴリ（v1 基本 ＋ 当日再実行分）が揃ったら集約してください。"
else
  QUORUM=8
  if [ "$VALID" -ge "$QUORUM" ]; then
    echo ""
    echo "クォーラム達成（$VALID ≥ $QUORUM）。集約可能。"
    echo "  → node scripts/aggregate.mjs $PRED_DIR $PACK"
  else
    echo ""
    echo "クォーラム未達（$VALID < $QUORUM）。Sho に相談してください。"
  fi
fi
