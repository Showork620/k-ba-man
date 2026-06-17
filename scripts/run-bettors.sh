#!/usr/bin/env bash
# 5人の資金配分専門家を並列実行し、bets/v1 ディレクトリに結果を保存する。
# 入力は betting-input（集約確率のみ・個別専門家リークなし）。run-experts.sh と対の構造。
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"

INPUT="${1:?usage: scripts/run-bettors.sh <betting-input.json>}"
INPUT="$(cd "$(dirname "$INPUT")" && pwd)/$(basename "$INPUT")"
RACE_DIR="$(dirname "$INPUT")"
BETS_DIR="$RACE_DIR/bets/v1"
mkdir -p "$BETS_DIR"

AGENTS_DIR=".claude/agents"

PIDS=()
NAMES=()

run_claude() {
  local name="$1"
  local out="$BETS_DIR/${name}.json"
  echo "[claude] $name 開始..."
  claude -p "$INPUT" \
    --agent "haibun-$name" \
    --allowedTools "Read" \
    --output-format text \
    > "$out.raw" 2>"$out.log" || true
  # エージェント出力から JSON を抽出（生 JSON or コードブロック）
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
  local cli_type="${3:-cli}"
  local out="$BETS_DIR/${name}.json"
  echo "[$cli_type] $name 開始..."
  bash "$script" "$INPUT" > "$out" 2>"$out.log" || true
  if ! jq '.' "$out" >/dev/null 2>&1; then
    echo "[$cli_type] $name: JSON パース失敗（ログ: $out.log）" >&2
  fi
  echo "[$cli_type] $name 完了 → $out"
}

# --- Claude 系 3人 ---
for name in go kaede sayuri; do
  run_claude "$name" &
  PIDS+=($!)
  NAMES+=("$name")
done

# --- codex 系 1人 ---
run_cli "$AGENTS_DIR/haibun-ittetsu-codex.sh" ittetsu codex &
PIDS+=($!)
NAMES+=(ittetsu)

# --- gemini 系 1人 ---
run_cli "$AGENTS_DIR/haibun-ritsu-gemini.sh" ritsu gemini &
PIDS+=($!)
NAMES+=(ritsu)

echo ""
echo "=== 5人を並列実行中 (PID: ${PIDS[*]}) ==="
echo ""

for pid in "${PIDS[@]}"; do wait "$pid" || true; done

echo ""
echo "=== 実行完了 ==="

VALID=0
TOTAL=${#NAMES[@]}
for name in "${NAMES[@]}"; do
  f="$BETS_DIR/${name}.json"
  if [ -f "$f" ] && jq -e '.bettor_id' "$f" >/dev/null 2>&1; then
    VALID=$((VALID + 1))
  else
    echo "  ✗ $name: 無効な出力（ログ: $BETS_DIR/${name}.log）"
  fi
done

echo "  有効: $VALID / $TOTAL（※ total_stake_jpy=0 の全額見送りも有効なポートフォリオ）"
echo ""
if [ "$VALID" -ge 3 ]; then
  echo "集約可能。→ node scripts/aggregate-bets.mjs $BETS_DIR"
else
  echo "有効ポートフォリオが少なすぎ（$VALID）。ログを確認して Sho に相談。"
fi
