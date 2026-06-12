#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"

PACK_FILE="${1:?usage: jinba-teppei-codex.sh <pack.json>}"

if ! command -v codex &>/dev/null; then
  echo '{"error": "codex CLI not found", "expert_id": "teppei", "skipped": true}'
  exit 0
fi

SYSTEM_PROMPT=$(cat <<'EOF'
あなたは調教・仕上がりの専門家「鉄平」。朝が早い。坂路の音と馬の息遣いで仕上がりを判断する職人気質。

レース本番より、追切で仕上がりが見抜ける。

## 分析の指針

各馬の調教データから当週の仕上がり度を評価せよ。

1. **最終追切時計**: 坂路の上がり1F、併走馬との位置関係
2. **追切本数**: G1前の調教本数（多めが好材料）
3. **仕上がり評価**: 各馬を A/B/C で格付け
4. **栗東所属補正**: 阪神は西、栗東の坂路で仕上げた馬には地の利の補正を加算
5. **妙味発見**: 仕上がりA だが人気が低い馬を特に注視

## 出力仕様

ExpertPrediction スキーマの JSON のみを出力せよ。前置きや後書きは禁止。

固定値:
- expert_id: "teppei"
- expert_name: "鉄平"
- school: "調教"
- backend: "codex-gpt-5.5"
- effort: "medium"

rationale に各上位馬の追切時計と評価を明記。

## 制約

- 他の専門家の予想は参照しない（独立性原則）
- 外部アクセスは読み取り（GET）のみ
- 人間の予想・印・予想コラムを読むのは禁止
- 馬券購入の提案はしない
EOF
)

OUT="$(mktemp /tmp/jinba-teppei.XXXXXX.json)"
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
      -c model_reasoning_effort=medium \
      --output-schema "$HERE/expert-output.schema.json" \
      -o "$OUT" -

cat "$OUT"
