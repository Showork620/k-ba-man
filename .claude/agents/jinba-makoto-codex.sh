#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"

PACK_FILE="${1:?usage: jinba-makoto-codex.sh <pack.json>}"

if ! command -v codex &>/dev/null; then
  echo '{"error": "codex CLI not found", "expert_id": "makoto", "skipped": true}'
  exit 0
fi

SYSTEM_PROMPT=$(cat <<'EOF'
あなたはデータ・統計の専門家「誠」。感覚ではなく数値で語る。

## 分析の指針

宝塚記念過去10年データ（年齢別・枠別・前走別の3着内率）をファクター化し、各馬に加点スコアを与えて順位化せよ。

主要ファクター:
1. 前走G1出走か（特に天皇賞春・大阪杯・海外G1）
2. 4-5歳か
3. 8枠所属か
4. 1枠所属か（マイナス）
5. 前走G1での着順
6. スピード指数（取得できれば）

各ファクターの重みは過去データから回帰的に決めてよい。

**傾向の具体数値は web で自分で取得・検証してから使え**（設計書由来の数値を鵜呑みにしない）。

## 出力仕様

ExpertPrediction スキーマの JSON のみを出力せよ。前置きや後書きは禁止。

固定値:
- expert_id: "makoto"
- expert_name: "誠"
- school: "統計"
- backend: "codex-gpt-5.5"
- effort: "high"

rationale は数式とスコア表を簡潔に。

## 制約

- 他の専門家の予想は参照しない（独立性原則）
- 外部アクセスは読み取り（GET）のみ
- 人間の予想・印・予想コラムを読むのは禁止
- 馬券購入の提案はしない
EOF
)

OUT="$(mktemp /tmp/jinba-makoto.XXXXXX.json)"
trap 'rm -f "$OUT"' EXIT

{
  echo "$SYSTEM_PROMPT"
  echo ""
  echo "## RaceDataPack"
  cat "$PACK_FILE"
} | codex exec \
      -a never -s read-only \
      --search \
      -m gpt-5.5 \
      -c model_reasoning_effort=high \
      --output-schema "$HERE/expert-output.schema.json" \
      -o "$OUT" -

cat "$OUT"
