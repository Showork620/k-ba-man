#!/usr/bin/env bash
# 10人の専門家を並列実行し、predictions ディレクトリに結果を保存する
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"

PACK="${1:?usage: scripts/run-experts.sh <pack.json>}"
PACK="$(cd "$(dirname "$PACK")" && pwd)/$(basename "$PACK")"
RACE_DIR="$(dirname "$PACK")"
PRED_DIR="$RACE_DIR/predictions/v1"
mkdir -p "$PRED_DIR"

AGENTS_DIR=".claude/agents"
SCHEMA="$AGENTS_DIR/expert-output.schema.json"
SCHEMA_CONTENT="$(cat "$SCHEMA")"

PIDS=()
NAMES=()

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

# --- Claude 系 6人 ---
CLAUDE_EXPERTS=(tatsunosuke misaki kenta sakura aoi yuko)
for name in "${CLAUDE_EXPERTS[@]}"; do
  run_claude "$name" &
  PIDS+=($!)
  NAMES+=("$name")
done

# --- codex 系 2人 ---
run_cli "$AGENTS_DIR/jinba-makoto-codex.sh" makoto codex &
PIDS+=($!)
NAMES+=(makoto)

run_cli "$AGENTS_DIR/jinba-teppei-codex.sh" teppei codex &
PIDS+=($!)
NAMES+=(teppei)

# --- gemini 系 2人 ---
run_cli "$AGENTS_DIR/jinba-hina-gemini.sh" hina gemini &
PIDS+=($!)
NAMES+=(hina)

run_cli "$AGENTS_DIR/jinba-goro-gemini.sh" goro gemini &
PIDS+=($!)
NAMES+=(goro)

# --- 全員の完了を待つ ---
echo ""
echo "=== 10人を並列実行中 (PID: ${PIDS[*]}) ==="
echo ""

FAILED=()
for i in "${!PIDS[@]}"; do
  if ! wait "${PIDS[$i]}"; then
    FAILED+=("${NAMES[$i]}")
  fi
done

echo ""
echo "=== 実行完了 ==="

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

QUORUM=8
if [ "$VALID" -ge "$QUORUM" ]; then
  echo ""
  echo "クォーラム達成（$VALID ≥ $QUORUM）。集約可能。"
  echo "  → node scripts/aggregate.mjs $PRED_DIR $PACK"
else
  echo ""
  echo "クォーラム未達（$VALID < $QUORUM）。Sho に相談してください。"
fi
