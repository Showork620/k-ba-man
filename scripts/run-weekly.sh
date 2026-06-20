#!/usr/bin/env bash
# 週次運用オーケストレーター（司令塔）。
# pack → 予想10人 → 集約 → betting-input → 配分5人 → 買い目集約 →（レース）→ 採点 を
# 1コマンドで通し、各ゲートで停止する。設計と手順は docs/design/weekly-ops.md。
# 既存スクリプト(run-experts / aggregate / build-betting-input / run-bettors / aggregate-bets / score-race)の接着。
#
# 思想 = 冪等な状態機械: 「欠けている成果物を順に生成し、進めるところまで進む」。
#   - 既にある成果物はスキップ（再実行は当該ファイルを消すか、入力依存の betting-input は --odds/--budget で再生成）
#   - LLM ステップ（予想10人・配分5人＝クォータ消費）は実行前に必ず確認（--yes でスキップ可）
#   - ハードゲート（クォーラム未達・配分不足）は停止して Sho に委ねる
#   - 人手判断（予算圧縮・レビュー・提出・result.json 記録）の手前で停止し、次の手を案内
#
# usage:
#   scripts/run-weekly.sh <race_id|race-dir> [options]
# options:
#   --plan            実行せず現在の進捗とゲート状態だけ表示（状態確認コマンド）
#   --yes, -y         LLM 実行（予想/配分）の確認を自動承認（クォータ消費に注意）
#   --odds <file>     当日オッズ JSON。指定すると betting-input を再生成
#   --budget <jpy>    予算（build-betting-input へ）。指定すると betting-input を再生成
#   --quorum <n>      予想クォーラム閾値（既定 8）
#   --min-bettors <n> 配分の最小有効数（既定 3）
#   --skip-smoke      CLI 死活スモークテストを省略
#   --pack <name>     pack ファイル名（race-dir 相対。既定 pack-v1.json）。予想・集約・betting-input に反映。
#                     ※ 採点(score-race.mjs)は pack-v1.json 固定読みのため、非既定 pack 運用時は馬名解決が v1 基準になる点に注意
#   --race-time HH:MM 発走時刻（JST）。残り時間を表示し --plan の品質アップグレード案内に使う
#   --refresh-from <step>  指定ステップ以降の成果物を削除して再実行。アップグレード時の古い成果物残留を防ぐ
#                     aggregate     → aggregated + betting-input + bets を削除
#                     betting-input → betting-input + bets を削除
#                     bets          → bets のみ削除
#   --what-now        現在時刻と発走時刻（--race-time 必須）から最適な行動を案内して終了

set -uo pipefail   # -e は使わない（ゲート判定で非0終了を扱うため）
# git root へ移動（失敗を握り潰さず明示的に落とす。-e 無しなので cd "" の no-op を防ぐ）
ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null)"
[ -n "$ROOT" ] || { echo "✗ git リポジトリ root を特定できない（このスクリプトは k-ba-man リポジトリ内で実行すること）" >&2; exit 1; }
cd "$ROOT" || { echo "✗ cd 失敗: $ROOT" >&2; exit 1; }

# ── 既定値・引数パース ──
QUORUM=8
MIN_BETTORS=3
ASSUME_YES=0
PLAN=0
SKIP_SMOKE=0
ODDS=""
BUDGET=""
PACK_NAME="pack-v1.json"
RACE_TIME=""
REFRESH_FROM=""
WHAT_NOW=0
RACE_ARG=""

while [ $# -gt 0 ]; do
  case "$1" in
    --plan|--dry-run) PLAN=1 ;;
    --yes|-y) ASSUME_YES=1 ;;
    --skip-smoke) SKIP_SMOKE=1 ;;
    --quorum) QUORUM="${2:?--quorum には正の整数が必要}"; shift ;;
    --min-bettors) MIN_BETTORS="${2:?--min-bettors には正の整数が必要}"; shift ;;
    --odds) ODDS="${2:?--odds にはファイルパスが必要}"; shift ;;
    --budget) BUDGET="${2:?--budget には正の整数が必要}"; shift ;;
    --pack) PACK_NAME="${2:?--pack にはファイル名が必要}"; shift ;;
    --race-time) RACE_TIME="${2:?--race-time には HH:MM が必要}"; shift ;;
    --refresh-from) REFRESH_FROM="${2:?--refresh-from には aggregate|betting-input|bets が必要}"; shift ;;
    --what-now) WHAT_NOW=1 ;;
    -*) echo "unknown option: $1" >&2; exit 2 ;;
    *) RACE_ARG="$1" ;;
  esac
  shift
done

if [ -z "$RACE_ARG" ]; then
  echo "usage: scripts/run-weekly.sh <race_id|race-dir> [--plan] [--yes] [--odds f] [--budget n] [--quorum 8]" >&2
  exit 2
fi

# 数値オプションは正の整数を強制する。非数値だと set -e 無しのため整数比較 `[ -lt ]` が
# 黙ってエラー終了→false 扱いになり、クォーラム/配分のハードゲートを素通りする（このスクリプトの存在意義が崩れる）
for pair in "QUORUM:--quorum:$QUORUM" "MIN_BETTORS:--min-bettors:$MIN_BETTORS"; do
  flag="${pair#*:}"; flag="${flag%%:*}"; val="${pair##*:}"
  case "$val" in
    ''|*[!0-9]*) echo "✗ $flag は正の整数で指定: \"$val\"" >&2; exit 2 ;;
  esac
  [ "$val" -ge 1 ] 2>/dev/null || { echo "✗ $flag は 1 以上の整数で指定: \"$val\"" >&2; exit 2; }
done

# ── race-dir 解決（race_id でも path でも可）──
if [ -d "$RACE_ARG" ]; then
  RACE_DIR="$(cd "$RACE_ARG" && pwd)"
elif [ -d "runs/$RACE_ARG" ]; then
  RACE_DIR="$(cd "runs/$RACE_ARG" && pwd)"
else
  case "$RACE_ARG" in
    /*) echo "✗ レースディレクトリが見つからない: ${RACE_ARG}" >&2 ;;
    *)  echo "✗ レースディレクトリが見つからない: ${RACE_ARG}（runs/${RACE_ARG} も無い）" >&2 ;;
  esac
  exit 1
fi
RACE_ID="$(basename "$RACE_DIR")"

PACK="$RACE_DIR/$PACK_NAME"
PRED_DIR="$RACE_DIR/predictions/v1"
AGG="$RACE_DIR/predictions/aggregated-v1.json"
BINPUT="$RACE_DIR/betting-input-v1.json"
BETS_DIR="$RACE_DIR/bets/v1"
BETS_AGG="$RACE_DIR/bets/aggregated-v1.json"
RESULT="$RACE_DIR/result.json"
# 採点ファイルは score-race.mjs が result.race_id 名で書く。dir名 ≠ race_id でも採点済み判定が効くよう
# result.json があればその race_id を真とする（無ければ dir 名でフォールバック）
if [ -f "$RESULT" ]; then
  _rid="$(jq -r '.race_id // empty' "$RESULT" 2>/dev/null)"
  SCORE="data/scoring/${_rid:-$RACE_ID}.json"
else
  SCORE="data/scoring/$RACE_ID.json"
fi

# ── race-time バリデーション ──
if [ -n "$RACE_TIME" ]; then
  case "$RACE_TIME" in
    [0-1][0-9]:[0-5][0-9]|2[0-3]:[0-5][0-9]) ;;
    *) echo "✗ --race-time は HH:MM 形式（00:00〜23:59）で指定: \"$RACE_TIME\"" >&2; exit 2 ;;
  esac
fi

# ── refresh-from バリデーション ──
if [ -n "$REFRESH_FROM" ]; then
  case "$REFRESH_FROM" in
    aggregate|betting-input|bets) ;;
    *) echo "✗ --refresh-from は aggregate|betting-input|bets のいずれか: \"$REFRESH_FROM\"" >&2; exit 2 ;;
  esac
fi

# ── ヘルパ ──
hr() { printf '  %s\n' "────────────────────────────────────────────────────"; }

# 発走までの残り時間（時間単位。小数1桁）。race-time 未指定なら空文字を返す
hours_to_race() {
  [ -n "$RACE_TIME" ] || return
  local now_epoch race_epoch diff_s
  now_epoch="$(TZ=Asia/Tokyo date +%s)"
  # 当日の race-time を epoch に変換
  race_epoch="$(TZ=Asia/Tokyo date -j -f '%Y-%m-%d %H:%M' "$(TZ=Asia/Tokyo date +%Y-%m-%d) $RACE_TIME" +%s 2>/dev/null)" || return
  diff_s=$((race_epoch - now_epoch))
  # 負値（発走済み）でもそのまま返す（表示側で判定）
  # bc で小数1桁
  printf '%.1f' "$(echo "scale=2; $diff_s / 3600" | bc)"
}

# aggregated-v1.json から品質レベルを読む（無ければ空）
read_quality_level() {
  [ -f "$AGG" ] || return
  jq -r '.quality_level // empty' "$AGG" 2>/dev/null
}

# aggregated-v1.json から degraded_experts を読む
read_degraded_experts() {
  [ -f "$AGG" ] || return
  jq -r '.degraded_experts[]? // empty' "$AGG" 2>/dev/null
}

# 予想ファイルからカテゴリ別の pack_version 内訳を表示
report_category_status() {
  local odds_stale=0 baba_stale=0 pv
  for name in sakura yuko hina; do
    local f="$PRED_DIR/${name}.json"
    [ -f "$f" ] || continue
    pv="$(jq -r '.pack_version // "v1"' "$f" 2>/dev/null)"
    case "$pv" in v2-odds*) ;; *) odds_stale=$((odds_stale+1)) ;; esac
  done
  for name in goro misaki kenta; do
    local f="$PRED_DIR/${name}.json"
    [ -f "$f" ] || continue
    pv="$(jq -r '.pack_version // "v1"' "$f" 2>/dev/null)"
    case "$pv" in v2-baba*) ;; *) baba_stale=$((baba_stale+1)) ;; esac
  done
  if [ "$odds_stale" -gt 0 ]; then
    echo "  .   オッズ依存(3人) — 暫定（${odds_stale}人が v2-odds 未更新）"
  else
    echo "  .   オッズ依存(3人) — v2-odds 更新済み"
  fi
  if [ "$baba_stale" -gt 0 ]; then
    echo "  .   馬場依存(3人)   — 暫定（${baba_stale}人が v2-baba 未更新）"
  else
    echo "  .   馬場依存(3人)   — v2-baba 更新済み"
  fi
}

# aggregate.mjs と同一の妥当性基準（expert_id ＋ predicted_ranking 配列）で数える
count_valid_preds() {
  local n=0 f
  [ -d "$PRED_DIR" ] || { echo 0; return; }
  for f in "$PRED_DIR"/*.json; do
    [ -e "$f" ] || continue
    jq -e '(.expert_id != null) and (.predicted_ranking | type == "array")' "$f" >/dev/null 2>&1 && n=$((n+1))
  done
  echo "$n"
}
# aggregate-bets.mjs と同一基準（bettor_id ＋ tickets 配列。空配列＝全額見送りも有効）
count_valid_bettors() {
  local n=0 f
  [ -d "$BETS_DIR" ] || { echo 0; return; }
  for f in "$BETS_DIR"/*.json; do
    [ -e "$f" ] || continue
    jq -e '(.bettor_id != null) and (.tickets | type == "array")' "$f" >/dev/null 2>&1 && n=$((n+1))
  done
  echo "$n"
}

# LLM 実行の確認。--yes で自動承認、非tty かつ未承認なら拒否（不用意なクォータ消費を防ぐ）
confirm() {
  local msg="$1"
  [ "$ASSUME_YES" -eq 1 ] && return 0
  if [ ! -t 0 ]; then
    echo "  ⏸ $msg" >&2
    echo "    （非対話環境のため自動実行しない。実行するなら --yes を付けるか、対話シェルで再実行）" >&2
    return 1
  fi
  local ans
  read -r -p "  ▶ $msg 実行する？ [y/N] " ans
  [[ "$ans" =~ ^[yY]([eE][sS])?$ ]]
}

# 停止して次の手を案内（exit）
halt() {
  echo ""
  echo "■ ここで停止: $1"
  shift
  for line in "$@"; do echo "  → $line"; done
  echo ""
  exit "${HALT_CODE:-0}"
}

# ── CLI 死活スモークテスト（ゲート: 警告のみ。fallback 常態化の早期検知）──
smoke_test() {
  echo "【CLI 死活スモークテスト】"
  local claude_ok=1 codex_ok=1 gemini_ok=1
  if command -v claude >/dev/null 2>&1; then echo "  ✓ claude"; else echo "  ✗ claude: 見つからない（予想6人＋配分3人が動かない）"; claude_ok=0; fi
  if command -v codex  >/dev/null 2>&1; then echo "  ✓ codex: $(codex --version 2>/dev/null | head -1)"; else echo "  ✗ codex: 不在 → 誠・鉄平(予想)・一徹(配分) が Claude fallback"; codex_ok=0; fi
  if command -v gemini >/dev/null 2>&1; then echo "  ✓ gemini: $(gemini --version 2>/dev/null | head -1)"; else echo "  ✗ gemini: 不在 → 陽菜・優子(予想)・律(配分) が Claude fallback"; gemini_ok=0; fi
  if [ "$codex_ok" -eq 1 ] && [ "$gemini_ok" -eq 1 ]; then
    echo "  → バックエンド多様性 OK"
  else
    echo "  ⚠ 一部バックエンド不在。fallback 常態化は実効独立性を下げる（cli-backend-pitfalls）。本実行前に修正推奨"
  fi
  [ "$claude_ok" -eq 1 ]
}

# 予想 JSON の backend に "fallback" を含む者を列挙（実出力からの fallback 検知）
report_backend_health() {
  local f fb name
  local fellback=()
  for f in "$PRED_DIR"/*.json; do
    [ -e "$f" ] || continue
    fb="$(jq -r '.backend // ""' "$f" 2>/dev/null)"
    case "$fb" in *fallback*) name="$(basename "$f" .json)"; fellback+=("$name → $fb") ;; esac
  done
  if [ "${#fellback[@]}" -gt 0 ]; then
    echo "  ⚠ fallback 検出（実効多様性が低下。CLI 点検を）:"
    local x; for x in "${fellback[@]}"; do echo "      - $x"; done
  else
    echo "  ✓ fallback なし（全員ネイティブ backend）"
  fi
}

# ════════════════════════════════════════════════════════════════
# 進捗の俯瞰（--plan で実行せず表示）
# ════════════════════════════════════════════════════════════════
status_line() { # $1=ラベル $2=条件(0/1) $3=詳細
  if [ "$2" -eq 1 ]; then echo "  ✓ $1${3:+  — $3}"; else echo "  ・ $1${3:+  — $3}"; fi
}

print_plan() {
  echo "╔══════════════════════════════════════════════════╗"
  echo "║   k-ba-man 週次オーケストレーター — 進捗            ║"
  echo "╚══════════════════════════════════════════════════╝"
  echo "  レース: ${RACE_ID}（${RACE_DIR}）"

  # 発走時刻と残り時間
  if [ -n "$RACE_TIME" ]; then
    local htr
    htr="$(hours_to_race)"
    if [ -n "$htr" ]; then
      echo "  発走: 本日 ${RACE_TIME} JST（残り ${htr}h）"
    else
      echo "  発走: ${RACE_TIME} JST"
    fi
  fi

  # 品質レベル
  local ql
  ql="$(read_quality_level)"
  if [ -n "$ql" ]; then
    echo "  品質: ${ql}"
  fi

  echo ""
  local np nb
  np="$(count_valid_preds)"; nb="$(count_valid_bettors)"
  status_line "1. pack"            "$([ -f "$PACK" ] && echo 1 || echo 0)"   "$PACK_NAME"
  status_line "2. 予想10人"        "$([ "$np" -gt 0 ] && echo 1 || echo 0)"  "有効 ${np} 人（クォーラム ${QUORUM}）"
  # 予想が存在しカテゴリ内訳が意味を持つなら表示
  if [ "$np" -gt 0 ]; then
    report_category_status
  fi
  status_line "3. 予想集約"        "$([ -f "$AGG" ] && echo 1 || echo 0)"    "aggregated-v1.json"
  status_line "4. betting-input"   "$([ -f "$BINPUT" ] && echo 1 || echo 0)" "リーク防止生成物"
  status_line "5. 配分5人"         "$([ "$nb" -gt 0 ] && echo 1 || echo 0)"  "有効 ${nb} 人（最小 ${MIN_BETTORS}）"
  status_line "6. 買い目集約"      "$([ -f "$BETS_AGG" ] && echo 1 || echo 0)" "bets/aggregated-v1.json"
  status_line "7. 確定結果"        "$([ -f "$RESULT" ] && echo 1 || echo 0)" "result.json（人手・レース後）"
  status_line "8. 採点"            "$([ -f "$SCORE" ] && echo 1 || echo 0)"  "$SCORE"
  echo ""

  # 次の一手
  if [ ! -f "$PACK" ]; then echo "  次 → pack を手動作成（web 収集。§3.1）: $PACK"
  elif [ "$np" -lt "$QUORUM" ] && [ ! -f "$AGG" ]; then echo "  次 → 予想10人を実行（クォータ消費）。本スクリプトを --plan 無しで"
  elif [ ! -f "$AGG" ]; then echo "  次 → 予想集約"
  elif [ ! -f "$BINPUT" ]; then echo "  次 → betting-input 生成"
  elif [ "$nb" -lt "$MIN_BETTORS" ] && [ ! -f "$BETS_AGG" ]; then echo "  次 → 配分5人を実行（クォータ消費）"
  elif [ ! -f "$BETS_AGG" ]; then echo "  次 → 買い目集約"
  elif [ ! -f "$RESULT" ]; then echo "  次 → 人手: betting-v2.md(予算圧縮)/review-v1.md/prediction-v1.md → 提出 → レース後 result.json 記録"
  elif [ ! -f "$SCORE" ]; then echo "  次 → 採点（result.json あり）"
  else echo "  ✓ 全工程完了"
  fi

  # 品質アップグレード案内（L1/L2 で下流完了後）
  if [ -n "$ql" ] && [ "$ql" != "L3" ] && [ -f "$BETS_AGG" ]; then
    echo ""
    echo "  品質を上げるには:"
    case "$ql" in
      L1)
        echo "    → オッズ依存組を再実行（pack-v2-odds → --only sakura,yuko,hina → 再集約）→ L2-odds"
        echo "    → 馬場依存組を再実行（pack-v2-baba → --only goro,misaki,kenta → 再集約）→ L2-baba"
        echo "    → 両方完了 → L3"
        ;;
      L2-odds)
        echo "    → 馬場依存組を再実行（pack-v2-baba → --only goro,misaki,kenta → 再集約）→ L3"
        ;;
      L2-baba)
        echo "    → オッズ依存組を再実行（pack-v2-odds → --only sakura,yuko,hina → 再集約）→ L3"
        ;;
    esac
    echo "    再集約後: scripts/run-weekly.sh $RACE_ID --refresh-from aggregate"
  fi
}

if [ "$PLAN" -eq 1 ]; then
  print_plan
  exit 0
fi

# ════════════════════════════════════════════════════════════════
# --what-now: 発走時刻と現在の状態から最適な行動を案内
# ════════════════════════════════════════════════════════════════
if [ "$WHAT_NOW" -eq 1 ]; then
  if [ -z "$RACE_TIME" ]; then
    echo "✗ --what-now には --race-time HH:MM が必要" >&2; exit 2
  fi
  _htr="$(hours_to_race)"
  _ql="$(read_quality_level)"
  _np="$(count_valid_preds)"
  _now="$(TZ=Asia/Tokyo date '+%Y-%m-%d %H:%M')"

  echo "╔══════════════════════════════════════════════════╗"
  echo "║   k-ba-man — what-now（次の一手ガイド）           ║"
  echo "╚══════════════════════════════════════════════════╝"
  echo "  現在: ${_now} JST"
  echo "  発走: ${RACE_TIME} JST（残り ${_htr}h）"
  echo "  レース: ${RACE_ID}"
  echo ""

  if [ ! -f "$PACK" ]; then
    echo "  状態: pack なし"
    echo ""
    echo "  推奨:"
    echo "    1. [今すぐ] pack-v1.json を作成（出馬表・オッズ・天気・調教）"
    echo "       遅く作るほど pack の情報が充実し品質が上がる"
  elif [ -z "$_ql" ] && [ "$_np" -eq 0 ]; then
    echo "  状態: pack あり、予想未実行"
    echo ""
    echo "  推奨:"
    # htr を整数比較用に変換（小数点以下切り捨て）
    _htr_int="${_htr%.*}"
    if [ "$_htr_int" -gt 18 ] 2>/dev/null; then
      echo "    まだ早い。T-1日夜（調教・天気予報確定後）のワンショットが最適"
    elif [ "$_htr_int" -gt 6 ] 2>/dev/null; then
      echo "    1. [今すぐ] ワンショット実行（L1 品質・約30分）"
      echo "       bash scripts/run-weekly.sh $RACE_ID --race-time $RACE_TIME --yes"
      echo "    2. [任意] 当日朝にオッズ更新で L2 へ引き上げ可"
    elif [ "$_htr_int" -gt 3 ] 2>/dev/null; then
      echo "    1. [今すぐ] 当日オッズ入り pack でワンショット（実質L2相当）"
      echo "       bash scripts/run-weekly.sh $RACE_ID --race-time $RACE_TIME --yes"
      echo "    2. [任意] 発走3h前に馬場更新で L3 も狙える"
    elif [ "$_htr_int" -gt 1 ] 2>/dev/null; then
      echo "    1. [今すぐ] 全データ入り pack でワンショット（実質L3相当）"
      echo "       bash scripts/run-weekly.sh $RACE_ID --race-time $RACE_TIME --yes"
      echo "    下流処理に ~30分必要。急いで"
    else
      echo "    ⚠ 下流処理の時間が足りない可能性"
      echo "    予想のみ実行し配分は簡略化を検討"
    fi
  elif [ "$_ql" = "L1" ]; then
    echo "  状態: L1 完了済み（ワンショット）"
    echo ""
    _htr_int="${_htr%.*}"
    if [ "$_htr_int" -gt 3 ] 2>/dev/null; then
      echo "  品質を上げるなら:"
      echo "    (a) 当日オッズで v2-odds → L2-odds"
      echo "        bash scripts/run-experts.sh runs/$RACE_ID/pack-v2-odds.json --only sakura,yuko,hina --out v2-odds"
      echo "    (b) 発走3h前に馬場で v2-baba → L2-baba"
      echo "        bash scripts/run-experts.sh runs/$RACE_ID/pack-v2-baba.json --only goro,misaki,kenta --out v2-baba"
      echo "    (c) 両方 → L3"
    else
      echo "  推奨: 馬場データで v2-baba 再実行 → L2-baba"
      echo "    bash scripts/run-experts.sh runs/$RACE_ID/pack-v2-baba.json --only goro,misaki,kenta --out v2-baba"
    fi
    echo "    → 再集約後: bash scripts/run-weekly.sh $RACE_ID --refresh-from aggregate --yes"
  elif [ "$_ql" = "L2-odds" ]; then
    echo "  状態: L2-odds 完了済み（オッズ更新済み）"
    echo ""
    echo "  推奨: 馬場データで v2-baba 再実行 → L3"
    echo "    bash scripts/run-experts.sh runs/$RACE_ID/pack-v2-baba.json --only goro,misaki,kenta --out v2-baba"
    echo "    → 再集約後: bash scripts/run-weekly.sh $RACE_ID --refresh-from aggregate --yes"
  elif [ "$_ql" = "L2-baba" ]; then
    echo "  状態: L2-baba 完了済み（馬場更新済み）"
    echo ""
    echo "  推奨: オッズデータで v2-odds 再実行 → L3"
    echo "    bash scripts/run-experts.sh runs/$RACE_ID/pack-v2-odds.json --only sakura,yuko,hina --out v2-odds"
    echo "    → 再集約後: bash scripts/run-weekly.sh $RACE_ID --refresh-from aggregate --yes"
  elif [ "$_ql" = "L3" ]; then
    echo "  状態: L3（全ゾーン完了）"
    echo ""
    echo "  ✓ 品質最高。提出物を確認してください"
  else
    echo "  状態: 予想実行済み（品質レベル不明）"
    echo ""
    echo "  → bash scripts/run-weekly.sh $RACE_ID --plan で詳細を確認"
  fi
  echo ""
  exit 0
fi

# ════════════════════════════════════════════════════════════════
# --refresh-from: 指定ステップ以降の成果物を削除（アップグレード時の古い成果物残留を防ぐ）
# ════════════════════════════════════════════════════════════════
if [ -n "$REFRESH_FROM" ]; then
  echo "【--refresh-from $REFRESH_FROM】指定ステップ以降の成果物を削除..."
  # aggregate → betting-input → bets の順に fall-through 削除
  _do_agg=0; _do_bi=0; _do_bets=0
  case "$REFRESH_FROM" in
    aggregate)     _do_agg=1; _do_bi=1; _do_bets=1 ;;
    betting-input) _do_bi=1; _do_bets=1 ;;
    bets)          _do_bets=1 ;;
  esac
  [ "$_do_agg" -eq 1 ] && [ -f "$AGG" ] && { rm "$AGG"; echo "  削除: $AGG"; }
  [ "$_do_bi" -eq 1 ] && [ -f "$BINPUT" ] && { rm "$BINPUT"; echo "  削除: $BINPUT"; }
  if [ "$_do_bets" -eq 1 ]; then
    if [ -d "$BETS_DIR" ]; then
      _bc=0
      for bf in "$BETS_DIR"/*.json; do
        [ -e "$bf" ] || continue
        rm "$bf"; _bc=$((_bc+1))
      done
      [ "$_bc" -gt 0 ] && echo "  削除: $BETS_DIR/*.json ($_bc ファイル)"
    fi
    [ -f "$BETS_AGG" ] && { rm "$BETS_AGG"; echo "  削除: $BETS_AGG"; }
  fi
  echo ""
fi

# ════════════════════════════════════════════════════════════════
# 実行ドライバ（前から順に、欠けている成果物を埋め、ゲートで停止）
# ════════════════════════════════════════════════════════════════
echo "╔══════════════════════════════════════════════════╗"
echo "║   k-ba-man 週次オーケストレーター — $RACE_ID"
echo "╚══════════════════════════════════════════════════╝"

# ── ステップ1: pack（人手）──
echo ""
echo "【1. pack】"
if [ -f "$PACK" ]; then
  echo "  ✓ $PACK"
else
  HALT_CODE=1 halt "pack が無い（${PACK}）" \
    "RaceDataPack を手動作成する（出馬表・血統・調教・天気・オッズ・枠順。§3.1）" \
    "誤りは pack_meta.errata に記録。作成後に再実行"
fi

# ── スモークテスト ──
echo ""
if [ "$SKIP_SMOKE" -eq 1 ]; then
  echo "【CLI 死活スモークテスト】スキップ（--skip-smoke）"
else
  if ! smoke_test; then
    HALT_CODE=1 halt "claude CLI が無く予想を実行できない" "claude CLI を導入してから再実行"
  fi
fi

# ── ステップ2-3: 予想10人 → クォーラム → 集約 ──
echo ""
echo "【2. 予想10人】"
NP="$(count_valid_preds)"
if [ -f "$AGG" ]; then
  echo "  ✓ 集約済み（aggregated-v1.json あり）。予想ステップはスキップ"
elif [ "$NP" -gt 0 ] && [ "$NP" -ge "$QUORUM" ]; then
  echo "  ✓ 既存の有効予想 $NP 人（クォーラム達成）。再実行せず集約へ"
else
  if [ "$NP" -gt 0 ]; then
    echo "  既存の有効予想 $NP 人（クォーラム $QUORUM 未達）"
  fi
  if confirm "予想10専門家を並列実行（クォータ消費）"; then
    bash scripts/run-experts.sh "$PACK"
    NP="$(count_valid_preds)"
  else
    HALT_CODE=2 halt "予想を実行しなかった" "実行するなら対話シェルで再実行、または --yes"
  fi
fi

# バックエンド健全性は予想が存在する限り毎回表示（集約済みの再開ランでも fallback 常態化を見逃さない）
if [ "$NP" -gt 0 ]; then
  echo "  バックエンド健全性:"
  report_backend_health
fi

# クォーラムゲート（ハード）
if [ ! -f "$AGG" ]; then
  if [ "$NP" -lt "$QUORUM" ]; then
    HALT_CODE=1 halt "クォーラム未達（有効 ${NP} < ${QUORUM}）" \
      "欠損した専門家のログを確認（$PRED_DIR/*.log）" \
      "CLI 不調なら修正して再実行。少人数集約は実効独立性を損なうため Sho に相談"
  fi
  echo ""
  echo "【3. 予想集約】クォーラム達成（${NP} ≥ ${QUORUM}）"
  if ! node scripts/aggregate.mjs "$PRED_DIR" "$PACK"; then
    HALT_CODE=1 halt "予想集約に失敗" "aggregate.mjs のエラーを確認"
  fi
else
  echo ""
  echo "【3. 予想集約】✓ 済み"
fi

# ── ステップ4: betting-input（決定的・リーク防止）──
echo ""
echo "【4. betting-input 生成】"
BUILD_ARGS=("$RACE_DIR")
# 非既定 pack を予想・集約と揃えて betting-input にも反映（接着漏れ防止）
[ "$PACK_NAME" != "pack-v1.json" ] && BUILD_ARGS+=(--pack "$PACK_NAME")
[ -n "$ODDS" ] && BUILD_ARGS+=(--odds "$ODDS")
[ -n "$BUDGET" ] && BUILD_ARGS+=(--budget "$BUDGET")
if [ -f "$BINPUT" ] && [ -z "$ODDS" ] && [ -z "$BUDGET" ]; then
  echo "  ✓ 既存（再生成するなら --odds / --budget を指定、またはファイルを削除）"
else
  [ -f "$BINPUT" ] && echo "  （--odds/--budget 指定により再生成）"
  if ! node scripts/build-betting-input.mjs "${BUILD_ARGS[@]}"; then
    HALT_CODE=1 halt "betting-input 生成に失敗（リーク検査 or 入力不整合の可能性）" "build-betting-input.mjs のエラーを確認"
  fi
fi

# ── ステップ5-6: 配分5人 → 配分クォーラム → 買い目集約 ──
echo ""
echo "【5. 配分5人】"
# betting-input を作り直したのに配分が古いままだと陳腐化する。bets より betting-input が新しければ警告
if [ -f "$BINPUT" ] && [ "$BINPUT" -nt "$BETS_DIR" ] 2>/dev/null && [ "$(count_valid_bettors)" -gt 0 ]; then
  echo "  ⚠ betting-input が既存の配分結果より新しい（当日オッズ等で再生成した？）。"
  echo "    配分5人は古い入力のまま。再配分するなら $BETS_DIR と $BETS_AGG を削除して再実行"
fi
NB="$(count_valid_bettors)"
if [ -f "$BETS_AGG" ]; then
  echo "  ✓ 買い目集約済み。配分ステップはスキップ"
elif [ "$NB" -ge "$MIN_BETTORS" ]; then
  echo "  ✓ 既存の有効ポートフォリオ $NB 人。再実行せず集約へ"
else
  if [ "$NB" -gt 0 ]; then echo "  既存の有効ポートフォリオ $NB 人（最小 $MIN_BETTORS 未達）"; fi
  if confirm "配分5専門家を並列実行（クォータ消費）"; then
    bash scripts/run-bettors.sh "$BINPUT"
    NB="$(count_valid_bettors)"
  else
    HALT_CODE=2 halt "配分を実行しなかった" "実行するなら対話シェルで再実行、または --yes"
  fi
fi

if [ ! -f "$BETS_AGG" ]; then
  if [ "$NB" -lt "$MIN_BETTORS" ]; then
    HALT_CODE=1 halt "有効ポートフォリオ不足（${NB} < ${MIN_BETTORS}）" \
      "配分のログを確認（$BETS_DIR/*.log）。少なすぎる場合は Sho に相談"
  fi
  echo ""
  echo "【6. 買い目集約】有効ポートフォリオ $NB 人"
  if ! node scripts/aggregate-bets.mjs "$BETS_DIR"; then
    HALT_CODE=1 halt "買い目集約に失敗" "aggregate-bets.mjs のエラーを確認"
  fi
else
  echo ""
  echo "【6. 買い目集約】✓ 済み"
fi

# ── 人手判断ゲート: 予算圧縮・レビュー・提出・結果記録 ──
if [ ! -f "$RESULT" ]; then
  halt "ここから先は人手判断（システムは出力まで・馬券購入は Sho）" \
    "予算圧縮 → $RACE_DIR/betting-v2.md（集約投票額を確定予算へ階層丸め。馬場急変は無効化）" \
    "レビュー → $RACE_DIR/review-v1.md（集約の数学・独立性・多様性・市場ベンチ）" \
    "提出 → $RACE_DIR/prediction-v1.md ＋ betting-v2.md" \
    "レース後 → $RACE_DIR/result.json を記録（winner/place3/payouts。可能なら finish_order_complete=true）" \
    "その後この司令塔を再実行すると採点まで通る"
fi

# ── ステップ8: 採点（result.json あり）──
echo ""
echo "【7-8. 採点】result.json あり"
if [ -f "$SCORE" ]; then
  echo "  ✓ 採点済み（data/scoring/$RACE_ID.json）。再採点するならファイルを削除して再実行"
else
  if ! node scripts/score-race.mjs "$RACE_DIR"; then
    HALT_CODE=1 halt "採点に失敗" "score-race.mjs のエラーを確認"
  fi
fi

echo ""
echo "■ 完了: pack → 予想 → 集約 → betting-input → 配分 → 買い目集約 → 採点 まで通過"
echo "  → 総括 $RACE_DIR/result-v1.md・台帳 data/scoring/weights.json を確認（反省メンテは weekly-ops.md フェーズ3）"
