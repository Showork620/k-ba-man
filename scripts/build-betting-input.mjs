#!/usr/bin/env node
// 集約予想（aggregated-vN.json）＋ pack ＋（任意）当日オッズから、
// 資金配分専門家5人への共通入力 betting-input-vN.json を生成する。
//
// このスクリプトの存在理由は「リークの構造的防止」と「転記ミスの排除」:
//   - 配分専門家には【集約確率分布だけ】を渡す。個別10専門家の予想・印・confidence は
//     一切渡さない（リーク防止 §3.3 / two-stage-collective-pipeline）。
//   - aggregated-vN.json の `expert_predictions` / `experts_used` / `marks` は読まない。
//     読むのは `aggregated_ranking`（馬番・集約確率）と `race_id` のみ。
//   - 出力直前にペルソナ名・専門家由来キーの混入をスキャンし、混じっていたら書き込みを拒否する
//     （将来 marks/expert を誤って通したときの保険＝tripwire）。
//
// usage:
//   node scripts/build-betting-input.mjs <race-dir> [options]
//
// options:
//   --version v1        集約予想・出力のバージョン（既定 v1）
//                       → 入力 predictions/aggregated-<version>.json / 出力 betting-input-<version>.json
//   --pack <name|path>  pack ファイル（既定 <race-dir>/pack-<version>.json、無ければ pack-v1.json）
//   --odds <path>       当日オッズ JSON（任意。win/place を上書き、wide を meta に通す）
//   --budget <jpy>      予算（既定 10000）
//   --race-label <str>  meta.race の人間可読ラベル（任意。無ければ pack から生成）
//   --out <path>        出力先（任意。既定 <race-dir>/betting-input-<version>.json）
//   --dry-run           ファイルに書かず stdout に出力（検証用）
//
// 当日オッズ JSON の形式（すべて任意フィールド）:
//   {
//     "retrieved_at": "2026-06-14T09:00:00+09:00",
//     "source": "JRA 当日オッズ",
//     "win":   { "5": 2.4, "2": 4.5, ... },              // 馬番→単勝オッズ
//     "place": { "5": [1.2, 1.4], "2": [1.8, 2.2], ... }, // 馬番→複勝オッズ [下限,上限] or 単一値
//     "wide":  { "5-16": [3.5, 4.2], ... }                // 任意。ペア→ワイドオッズ（meta に通すだけ）
//   }

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, isAbsolute, resolve } from "node:path";

// ─────────────────────────────────────────────────────────────
// 引数パース
// ─────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const positional = [];
const opts = {};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--dry-run") {
    opts.dryRun = true;
  } else if (a.startsWith("--")) {
    const key = a.slice(2);
    opts[key] = argv[++i];
  } else {
    positional.push(a);
  }
}

const raceDir = positional[0];
if (!raceDir) {
  console.error("usage: node scripts/build-betting-input.mjs <race-dir> [--version v1] [--pack <name>] [--odds <path>] [--budget 10000] [--race-label <str>] [--out <path>] [--dry-run]");
  process.exit(1);
}

const version = opts.version || "v1";

function die(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

// 予算は正の整数のみ。NaN（--budget abc）・0・負値を素通りさせない（NaN→JSONで null 化して下流が壊れる）
let budget = 10000;
if (opts.budget != null) {
  const n = parseInt(opts.budget, 10);
  if (!Number.isFinite(n) || n <= 0) die(`--budget は正の整数で指定すること: "${opts.budget}"`);
  budget = n;
}

function readJson(path, label) {
  if (!existsSync(path)) die(`${label} が見つからない: ${path}`);
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch (e) {
    die(`${label} のパースに失敗: ${path}（${e.message}）`);
  }
}

function resolvePath(p) {
  return isAbsolute(p) ? p : resolve(p);
}

// ─────────────────────────────────────────────────────────────
// 入力読み込み
// ─────────────────────────────────────────────────────────────
const aggPath = join(raceDir, "predictions", `aggregated-${version}.json`);
const agg = readJson(aggPath, "集約予想");

if (!Array.isArray(agg.aggregated_ranking) || agg.aggregated_ranking.length === 0) {
  die(`集約予想に aggregated_ranking が無い: ${aggPath}`);
}

// pack: 明示パス > pack-<version>.json > pack-v1.json
let packPath;
if (opts.pack) {
  packPath = isAbsolute(opts.pack) || opts.pack.includes("/") ? resolvePath(opts.pack) : join(raceDir, opts.pack);
} else {
  const candidate = join(raceDir, `pack-${version}.json`);
  packPath = existsSync(candidate) ? candidate : join(raceDir, "pack-v1.json");
}
const pack = readJson(packPath, "pack");

// 当日オッズ（任意）
let dayOdds = null;
if (opts.odds) {
  dayOdds = readJson(resolvePath(opts.odds), "当日オッズ");
}

// ─────────────────────────────────────────────────────────────
// pack から馬名と単勝オッズの台帳を作る
// ─────────────────────────────────────────────────────────────
const packHorses = pack.horses || [];
const nameOf = {};
const packWinOdds = {};
for (const h of packHorses) {
  nameOf[h.horse_num] = h.name;
  if (h.odds && typeof h.odds.win === "number") packWinOdds[h.horse_num] = h.odds.win;
}
const packHorseNums = new Set(packHorses.map((h) => h.horse_num));

// 集約とpackの頭数整合チェック（除外・頭数変動の検知）
const aggNums = new Set(agg.aggregated_ranking.map((r) => r.horse_num));
const warnings = [];
for (const n of aggNums) {
  if (packHorseNums.size > 0 && !packHorseNums.has(n)) {
    warnings.push(`集約に居るが pack に居ない馬番 ${n}（pack 更新漏れ or 集約の取り違え）`);
  }
}
for (const n of packHorseNums) {
  if (!aggNums.has(n)) {
    warnings.push(`pack に居るが集約に居ない馬番 ${n}（除外 or 集約欠落）`);
  }
}

// win_prob 合計の健全性（規約 §3.4: 0.95〜1.05 を集約後も期待）
const winSum = agg.aggregated_ranking.reduce((s, r) => s + (r.win_prob || 0), 0);
if (winSum < 0.95 || winSum > 1.05) {
  warnings.push(`集約 win_prob 合計が ${winSum.toFixed(4)}（0.95〜1.05 外。集約の正規化を点検）`);
}

// budget の end-to-end パラメータ化は未対応。下流（schema/aggregate-bets/agent定義）は 10000 前提
if (budget !== 10000) {
  warnings.push(
    `予算 ${budget}円 は既定(10000)と異なる。bettor-output.schema.json(total_stake_jpy≤10000)・aggregate-bets.mjs(budget=10000固定)・配分エージェント定義は 10000 前提のため、特に >10000 では集約の pass_jpy 計算がズレる（end-to-end パラメータ化は未対応）`
  );
}

// ─────────────────────────────────────────────────────────────
// 当日オッズの解決ヘルパ
// ─────────────────────────────────────────────────────────────
function round2(x) {
  return Math.round(x * 100) / 100;
}

function dayWinOdds(num) {
  if (dayOdds && dayOdds.win && dayOdds.win[String(num)] != null) {
    return Number(dayOdds.win[String(num)]);
  }
  return null;
}

function dayPlaceOdds(num) {
  if (dayOdds && dayOdds.place && dayOdds.place[String(num)] != null) {
    return dayOdds.place[String(num)]; // 配列 [下限,上限] or 単一値。そのまま通す
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// horses 配列を【ホワイトリスト】で構築（リーク防止の核心）
// 集約から取るのは horse_num / win_prob / win_prob_linear / place_prob_lb のみ。
// expert_predictions・experts_used・marks・confidence は一切触れない。
// ─────────────────────────────────────────────────────────────
const oddsSourceUsed = new Set();
const horses = agg.aggregated_ranking
  .map((r) => {
    const num = r.horse_num;
    const winProb = r.win_prob ?? 0;

    // 単勝オッズ: 当日オッズ優先、無ければ pack の事前オッズ
    let oddsWin = dayWinOdds(num);
    if (oddsWin != null) {
      oddsSourceUsed.add("day");
    } else if (packWinOdds[num] != null) {
      oddsWin = packWinOdds[num];
      oddsSourceUsed.add("pack");
    }

    const placeOdds = dayPlaceOdds(num);
    if (placeOdds != null) oddsSourceUsed.add("day-place");

    // win_prob は保存値（4桁丸め）に統一し、breakeven も同じ保存値から導く（出力JSONの自己整合）
    const winProbStored = round4(winProb);
    const horse = {
      horse_num: num,
      // 馬名は pack 由来に固定。集約 horse_name へのフォールバックは廃止＝集約由来の自由文が
      // 出力に入る唯一の経路を構造的に塞ぐ（pack に無い馬は placeholder。これは警告対象の異常系）
      name: nameOf[num] || `馬番${num}`,
      // 集約確率（配分専門家はこの分布だけで判断する）
      win_prob: winProbStored,
      win_prob_linear: r.win_prob_linear != null ? round4(r.win_prob_linear) : null,
      place_prob: r.place_prob_lb != null ? round4(r.place_prob_lb) : null,
      // 損益分岐オッズ = 1 / win_prob（保存値起点。単勝専用。律・一徹が EV/ケリー判定に使う）
      breakeven_odds: winProbStored > 0 ? round2(1 / winProbStored) : null,
      // 市場オッズ
      odds_win: oddsWin != null ? round2(oddsWin) : null,
      odds_place: placeOdds,
    };
    return horse;
  })
  // 集約勝率の降順（手動版と同じ並び。タイブレークは馬番昇順で決定的に）
  .sort((a, b) => (b.win_prob || 0) - (a.win_prob || 0) || a.horse_num - b.horse_num);

function round4(x) {
  return Math.round(x * 10000) / 10000;
}

// ─────────────────────────────────────────────────────────────
// meta / constraints の組み立て
// ─────────────────────────────────────────────────────────────
const raceId = agg.race_id || pack.race?.race_id || "unknown";
const raceLabel = opts["race-label"] || buildRaceLabel(pack);

function buildRaceLabel(pack) {
  const rc = pack.race;
  if (!rc) return raceId;
  const c = rc.course || {};
  const surface = c.surface || "";
  const dist = c.distance ? `${c.distance}m` : "";
  const io = c.inner_outer ? `${c.inner_outer}回り` : "";
  const n = (pack.horses || []).length;
  const head = n ? `${n}頭` : "";
  const parts = [rc.name, rc.date, `${c.track || ""}`, `${surface}${dist}${io}`, head, rc.post_time ? `${rc.post_time}発走` : ""]
    .filter(Boolean)
    .join(" ");
  return parts || raceId;
}

// オッズ素性の説明
let oddsNote;
if (dayOdds) {
  oddsNote = `odds_win/odds_place は当日オッズ（${dayOdds.source || "source不明"}${dayOdds.retrieved_at ? " / " + dayOdds.retrieved_at : ""}）。`;
  if (oddsSourceUsed.has("pack")) oddsNote += " 当日オッズに無い馬は pack の事前オッズで補完。";
} else {
  const src = (pack.pack_meta?.sources || []).join(", ");
  oddsNote = `odds_win は pack の事前オッズ（${pack.pack_meta?.retrieved_at || "時点不明"}${src ? " / " + src : ""}）。当日オッズ未反映 — 当日朝に --odds で再生成推奨。odds_place は当日オッズ未取得のため null。`;
}

const trackAssumption =
  pack.race?.weather?.track_condition_forecast
    ? `馬場想定: ${pack.race.weather.track_condition_forecast}。前提が崩れた場合（馬場急変等）このポートフォリオは無効。`
    : "良馬場前提。馬場急変時はこのポートフォリオを無効とする。";

const output = {
  meta: {
    purpose:
      "資金配分専門家への共通入力。10人のAI予想専門家の【集約結果のみ】を含む（個別予想・印・信頼度は含まない＝リーク防止 §3.3）",
    generated_by: `scripts/build-betting-input.mjs（aggregated-${version} ＋ pack${dayOdds ? " ＋ 当日オッズ" : ""}）`,
    race_id: raceId,
    race: raceLabel,
    track_assumption: trackAssumption,
    budget_jpy: budget,
    odds_note: oddsNote,
    takeout: {
      単勝複勝: 0.2,
      馬連ワイド: 0.225,
      三連複: 0.25,
      三連単: 0.275,
    },
    field_glossary: {
      win_prob: "集約勝率（正規化 log pooling）。Kelly の p の入力（§7.2）",
      win_prob_linear: "線形プール（単純平均・参考）",
      place_prob: "複勝圏(3着内)確率の集約。未列挙馬を0扱いした下限近似（aggregated の place_prob_lb）",
      breakeven_odds: "損益分岐オッズ = 1 / win_prob（単勝専用）。これ×安全マージンを市場オッズが上回るかで判定（律・一徹）。複勝・組合せ券は place_prob/Harville から各自再計算",
      odds_win: "単勝オッズ（当日 or 事前。odds_note 参照）",
      odds_place: "複勝オッズ [下限,上限] or 単一値。当日オッズ未取得なら null（ワイド/複勝の自前推定が必要）",
    },
  },
  constraints: {
    budget_jpy: budget,
    min_stake_jpy: 300, // 1点の最低賭け金（bettor-output.schema.json 準拠）
    unit_jpy: 100, // 賭け金の刻み
    max_tickets: 12, // 1人あたり最大点数（schema 準拠）
    bet_types_allowed: ["単勝", "複勝", "ワイド", "馬連", "三連複", "三連単"],
  },
  horses,
};

// 当日オッズに wide ペアがあれば meta に通す（per-horse ではないので参考情報として）
if (dayOdds && dayOdds.wide && Object.keys(dayOdds.wide).length > 0) {
  output.meta.wide_odds = dayOdds.wide;
}

// ─────────────────────────────────────────────────────────────
// リーク tripwire（多層防御。書き込み前の最終ガード）:
//   防御1【主】FORBIDDEN_KEYS — 専門家由来のキー/値が出力全体に現れていないか。
//             ローマ字のため日本語のレース名・馬名と衝突せず誤検出しない。
//   防御2【補】PERSONA scan — 馬名フィールドにだけ限定。集約由来の自由文が混入しうる唯一の経路。
//             ※ name は pack 由来に固定済み（集約フォールバック廃止）なので本来ここは belt-and-suspenders。
//             レース名(meta.race)・--race-label は対象外。「葵ステークス」等の実在レース名で誤爆させないため。
// ─────────────────────────────────────────────────────────────
const PERSONA_NAMES = ["葵", "吾郎", "陽菜", "健太", "誠", "美咲", "さくら", "龍之介", "鉄平", "優子"];
const FORBIDDEN_KEYS = ["expert", "experts_used", "expert_predictions", "honmei", "taikou", "tanana", "renka", "confidence"];
const serialized = JSON.stringify(output);

const leaks = [];
for (const key of FORBIDDEN_KEYS) {
  if (serialized.includes(`"${key}"`)) leaks.push(`禁止キー "${key}" が出力に含まれる`);
}
// 自由文が入りうる集約由来フィールド＝馬名のみを検査（レース名・ユーザ指定ラベルは検査しない）
for (const h of horses) {
  for (const persona of PERSONA_NAMES) {
    if ((h.name || "").includes(persona)) {
      leaks.push(`馬名に専門家ペルソナ名 "${persona}" が混入（馬番 ${h.horse_num}）`);
    }
  }
}
if (leaks.length > 0) {
  console.error("✗ リーク検査に失敗。betting-input を書き込まない:");
  for (const l of leaks) console.error(`   - ${l}`);
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────
// 出力
// ─────────────────────────────────────────────────────────────
const json = JSON.stringify(output, null, 2) + "\n";

if (opts.dryRun) {
  process.stdout.write(json);
} else {
  const outPath = opts.out ? resolvePath(opts.out) : join(raceDir, `betting-input-${version}.json`);
  writeFileSync(outPath, json);
  console.log("");
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║   k-ba-man betting-input builder（リーク防止）     ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log("");
  console.log(`レース: ${raceLabel}`);
  console.log(`集約予想: ${aggPath}`);
  console.log(`pack:    ${packPath}`);
  console.log(`当日オッズ: ${opts.odds ? resolvePath(opts.odds) : "（無し — pack 事前オッズを使用）"}`);
  console.log(`予算:    ${budget.toLocaleString()}円 / 最低300円・100円単位・最大12点`);
  console.log(`馬数:    ${horses.length}頭（集約勝率 合計 ${winSum.toFixed(4)}）`);
  console.log(`リーク検査: ✓ pass（集約確率のみ・個別専門家情報なし）`);
  console.log("");
  console.log("  馬番  馬名              集約勝率  複勝確率  損益分岐  単勝オッズ");
  console.log("  " + "─".repeat(62));
  for (const h of horses.slice(0, 8)) {
    const nm = (h.name || "").padEnd(14, "　");
    const wp = ((h.win_prob || 0) * 100).toFixed(1).padStart(6);
    const pp = h.place_prob != null ? (h.place_prob * 100).toFixed(1).padStart(6) : "   —  ";
    const be = h.breakeven_odds != null ? String(h.breakeven_odds).padStart(7) : "     — ";
    const ow = h.odds_win != null ? String(h.odds_win).padStart(6) : "    — ";
    console.log(`  ${String(h.horse_num).padStart(3)}  ${nm}  ${wp}%  ${pp}%  ${be}  ${ow}`);
  }
  if (warnings.length > 0) {
    console.log("");
    console.log("⚠ 警告:");
    for (const w of warnings) console.log(`   - ${w}`);
  }
  console.log("");
  console.log(`出力 → ${outPath}`);
  console.log(`次 → scripts/run-bettors.sh ${outPath}`);
}

// stderr に警告（dry-run でも見えるよう）
if (opts.dryRun && warnings.length > 0) {
  for (const w of warnings) console.error(`⚠ ${w}`);
}
