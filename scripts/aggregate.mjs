#!/usr/bin/env node
// 10人の ExpertPrediction を集約し、統合予想を出力する
// usage: node scripts/aggregate.mjs <predictions-dir...> [pack.json]

import { readFileSync, readdirSync, writeFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";

// 複数の予測ディレクトリを受け付ける（§3.5 の世代混在: v1 静的 → v2-odds → v2-baba）。
// 同一 expert_id は「後のディレクトリ優先（overlay）」で上書き。末尾引数が実在する .json なら pack。
const rawArgs = process.argv.slice(2);
if (rawArgs.length === 0) {
  console.error("usage: node scripts/aggregate.mjs <predictions-dir...> [pack.json]");
  process.exit(1);
}
let packPath;
let dirArgs = rawArgs;
const lastArg = rawArgs[rawArgs.length - 1];
if (lastArg.endsWith(".json")) {
  try {
    if (statSync(lastArg).isFile()) {
      packPath = lastArg;
      dirArgs = rawArgs.slice(0, -1);
    }
  } catch {
    /* .json だが実ファイルでない → ディレクトリ扱いのまま残す */
  }
}
if (dirArgs.length === 0) {
  console.error("予測ディレクトリが指定されていない。");
  process.exit(1);
}
const predDir = dirArgs[0]; // 出力先（aggregated-v1.json）の親ディレクトリ決定に使う

// --- 予測データ読み込み（複数 dir を overlay。同一 expert_id は後の dir 優先）---
const byExpert = new Map();
for (const d of dirArgs) {
  let files;
  try {
    files = readdirSync(d).filter((f) => f.endsWith(".json"));
  } catch {
    console.error(`スキップ: ディレクトリを読めない（${d}）`);
    continue;
  }
  for (const f of files) {
    try {
      const data = JSON.parse(readFileSync(join(d, f), "utf-8"));
      if (data.expert_id && Array.isArray(data.predicted_ranking)) {
        byExpert.set(data.expert_id, data); // 後の dir 優先で上書き（世代混在の overlay）
      }
    } catch {
      console.error(`スキップ: ${join(d, f)}（パース失敗）`);
    }
  }
}
const predictions = [...byExpert.values()];

if (predictions.length === 0) {
  console.error("有効な予測が0件。終了。");
  process.exit(1);
}

// --- 出馬表から全馬番を取得 ---
let allHorses = new Set();
if (packPath) {
  try {
    const pack = JSON.parse(readFileSync(packPath, "utf-8"));
    for (const h of pack.horses) allHorses.add(h.horse_num);
  } catch {
    // pack が読めない場合は予測から収集
  }
}
if (allHorses.size === 0) {
  for (const p of predictions) {
    for (const r of p.predicted_ranking) allHorses.add(r.horse_num);
    for (const w of p.win_prob || []) allHorses.add(w.horse_num);
  }
}
const horseNums = [...allHorses].sort((a, b) => a - b);
const N = horseNums.length;

// --- 1. Borda Count ---
const bordaScores = Object.fromEntries(horseNums.map((h) => [h, 0]));

for (const pred of predictions) {
  const ranked = pred.predicted_ranking || [];
  const maxRank = ranked.length;
  for (const { horse_num, rank } of ranked) {
    bordaScores[horse_num] = (bordaScores[horse_num] || 0) + (maxRank - rank + 1);
  }
}

const bordaRanking = horseNums
  .map((h) => ({ horse_num: h, score: bordaScores[h] }))
  .sort((a, b) => b.score - a.score);

// --- 2. Log Pooling ---
const EPS = 0.005;

function getWinProbs(pred) {
  const probs = {};
  for (const { horse_num, prob } of pred.win_prob || []) {
    probs[horse_num] = prob;
  }
  // 未列挙馬にフロア配分
  const listed = Object.values(probs).reduce((s, p) => s + p, 0);
  const unlisted = horseNums.filter((h) => !(h in probs));
  const remainder = Math.max(0, 1 - listed);
  const perUnlisted = unlisted.length > 0 ? remainder / unlisted.length : 0;
  for (const h of unlisted) {
    probs[h] = perUnlisted;
  }
  // ε フロア適用
  for (const h of horseNums) {
    probs[h] = Math.max(probs[h] || 0, EPS);
  }
  // 再正規化
  const total = Object.values(probs).reduce((s, p) => s + p, 0);
  for (const h of horseNums) {
    probs[h] /= total;
  }
  return probs;
}

// 線形プール（単純平均。参考系列として出力）
const linearPooled = Object.fromEntries(horseNums.map((h) => [h, 0]));
for (const pred of predictions) {
  const probs = getWinProbs(pred);
  for (const h of horseNums) {
    linearPooled[h] += probs[h] / predictions.length;
  }
}

// 複勝圏（3着内）確率の線形平均。未列挙馬を0扱いする下限近似
const placePooled = Object.fromEntries(horseNums.map((h) => [h, 0]));
for (const pred of predictions) {
  const listed = Object.fromEntries((pred.place_prob || []).map((x) => [x.horse_num, x.prob]));
  for (const h of horseNums) {
    placePooled[h] += (listed[h] || 0) / predictions.length;
  }
}

// 重みは Σ=1 に正規化する（信頼度加重の幾何平均）。
// 正規化しないと Σconfidence 乗の過剰 extremizing になり分布が退化する
const confSum = predictions.reduce((s, p) => s + (p.confidence || 0.5), 0);
const logPooled = Object.fromEntries(horseNums.map((h) => [h, 0]));

for (const pred of predictions) {
  const probs = getWinProbs(pred);
  const w = (pred.confidence || 0.5) / confSum;
  for (const h of horseNums) {
    logPooled[h] += w * Math.log(probs[h]);
  }
}

// exp して正規化
const rawPooled = {};
let maxLog = Math.max(...Object.values(logPooled));
let pooledSum = 0;
for (const h of horseNums) {
  rawPooled[h] = Math.exp(logPooled[h] - maxLog);
  pooledSum += rawPooled[h];
}
const finalProbs = {};
for (const h of horseNums) {
  finalProbs[h] = rawPooled[h] / pooledSum;
}

const probRanking = horseNums
  .map((h) => ({ horse_num: h, prob: finalProbs[h] }))
  .sort((a, b) => b.prob - a.prob);

// --- 3. 統合ランキング（Borda × Log Pooling の平均順位） ---
const bordaRankMap = {};
bordaRanking.forEach((r, i) => {
  bordaRankMap[r.horse_num] = i + 1;
});
const probRankMap = {};
probRanking.forEach((r, i) => {
  probRankMap[r.horse_num] = i + 1;
});

const combined = horseNums
  .map((h) => ({
    horse_num: h,
    borda_rank: bordaRankMap[h],
    prob_rank: probRankMap[h],
    avg_rank: (bordaRankMap[h] + probRankMap[h]) / 2,
    borda_score: bordaScores[h],
    win_prob: finalProbs[h],
    win_prob_linear: linearPooled[h],
    place_prob_lb: placePooled[h],
  }))
  // タイブレークを明示: avg_rank → 集約勝率 → Borda → 馬番（決定的）
  .sort(
    (a, b) =>
      a.avg_rank - b.avg_rank ||
      b.win_prob - a.win_prob ||
      b.borda_score - a.borda_score ||
      a.horse_num - b.horse_num
  );

// --- 4. 印の決定 ---
const marks = {
  honmei: combined[0].horse_num,
  taikou: combined[1].horse_num,
  tanana: combined[2].horse_num,
  renka: combined.slice(3, 6).map((c) => c.horse_num),
};

// --- 馬名マッピング ---
let horseNames = {};
if (packPath) {
  try {
    const pack = JSON.parse(readFileSync(packPath, "utf-8"));
    for (const h of pack.horses) horseNames[h.horse_num] = h.name;
  } catch {
    // pass
  }
}
function name(num) {
  return horseNames[num] || `馬番${num}`;
}

// --- 5. 各専門家の印一覧 ---
const expertSummary = predictions.map((p) => ({
  expert: `${p.expert_name}（${p.school}/${p.backend}）`,
  honmei: `◎ ${name(p.marks?.honmei)}`,
  taikou: `○ ${name(p.marks?.taikou)}`,
  tanana: `▲ ${name(p.marks?.tanana)}`,
  renka: (p.marks?.renka || []).map((h) => `△ ${name(h)}`).join(" "),
  confidence: p.confidence,
}));

// --- 品質レベル判定（§3.5 の当日依存カテゴリに基づく）---
const ODDS_EXPERTS = ["sakura", "yuko", "hina"];
const BABA_EXPERTS = ["goro", "misaki", "kenta"];

function deriveQualityLevel(gens) {
  const byId = Object.fromEntries(gens.map((g) => [g.expert_id, g.pack_version]));
  const oddsUpgraded = ODDS_EXPERTS.every((id) => byId[id]?.startsWith("v2-odds"));
  const babaUpgraded = BABA_EXPERTS.every((id) => byId[id]?.startsWith("v2-baba"));
  if (oddsUpgraded && babaUpgraded) return "L3";
  if (oddsUpgraded) return "L2-odds";
  if (babaUpgraded) return "L2-baba";
  return "L1";
}

function listDegradedExperts(gens) {
  const byId = Object.fromEntries(gens.map((g) => [g.expert_id, g.pack_version]));
  const degraded = [];
  for (const id of ODDS_EXPERTS) {
    if (!byId[id]?.startsWith("v2-odds")) degraded.push(`${id} (stale odds)`);
  }
  for (const id of BABA_EXPERTS) {
    if (!byId[id]?.startsWith("v2-baba")) degraded.push(`${id} (stale track)`);
  }
  return degraded;
}

const generationsData = predictions.map((p) => ({
  expert_id: p.expert_id,
  pack_version: p.pack_version ?? null,
}));
const qualityLevel = deriveQualityLevel(generationsData);
const degradedExperts = listDegradedExperts(generationsData);

// --- 出力 ---
const output = {
  race_id: predictions[0]?.race_id || "202609030411",
  method:
    "borda_count + normalized log pooling (confidence-weighted geometric mean); tiebreak: avg_rank → win_prob → borda → horse_num",
  probability_notes: {
    win_prob: "正規化 log pooling（Σ重み=1 の信頼度加重幾何平均）",
    win_prob_linear: "線形プール（単純平均・参考）",
    place_prob_lb: "place_prob の線形平均。未列挙馬を0扱いした下限近似",
  },
  expert_count: predictions.length,
  experts_used: predictions.map((p) => p.expert_name),
  aggregated_ranking: combined.map((c, i) => ({
    rank: i + 1,
    horse_num: c.horse_num,
    horse_name: name(c.horse_num),
    borda_score: c.borda_score,
    win_prob: Math.round(c.win_prob * 10000) / 10000,
    win_prob_linear: Math.round(c.win_prob_linear * 10000) / 10000,
    place_prob_lb: Math.round(c.place_prob_lb * 10000) / 10000,
    borda_rank: c.borda_rank,
    prob_rank: c.prob_rank,
  })),
  marks: {
    "◎ 本命": `${marks.honmei} ${name(marks.honmei)}`,
    "○ 対抗": `${marks.taikou} ${name(marks.taikou)}`,
    "▲ 単穴": `${marks.tanana} ${name(marks.tanana)}`,
    "△ 連下": marks.renka.map((h) => `${h} ${name(h)}`),
  },
  expert_predictions: expertSummary,
  // 品質レベル（§flexible-execution-timing: L1/L2-odds/L2-baba/L3）
  quality_level: qualityLevel,
  degraded_experts: degradedExperts,
  // 世代混在の記録（§3.5: 混ぜる場合はその旨を集約結果に明記する）
  source_dirs: dirArgs,
  generations: generationsData,
};

const outPath = join(dirname(predDir), "aggregated-v1.json");
writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n");

// --- コンソール出力 ---
console.log("");
console.log("╔══════════════════════════════════════════════════╗");
console.log("║        k-ba-man 集合知予想 — 宝塚記念 2026        ║");
console.log("╚══════════════════════════════════════════════════╝");
console.log("");
console.log(`参加専門家: ${predictions.length}人`);
console.log(`集約手法: Borda + 正規化 Log Pooling（タイブレーク: 勝率→Borda→馬番）`);
console.log(`品質: ${qualityLevel}${degradedExperts.length > 0 ? `（暫定: ${degradedExperts.join(", ")}）` : ""}`);
console.log("");

console.log("【印】");
console.log(`  ◎ ${name(marks.honmei)}（馬番 ${marks.honmei}）`);
console.log(`  ○ ${name(marks.taikou)}（馬番 ${marks.taikou}）`);
console.log(`  ▲ ${name(marks.tanana)}（馬番 ${marks.tanana}）`);
for (const h of marks.renka) {
  console.log(`  △ ${name(h)}（馬番 ${h}）`);
}

console.log("");
console.log("【統合ランキング】");
console.log("  順位  馬番  馬名                Borda  勝率(log)  勝率(線形)  複勝LB");
console.log("  " + "─".repeat(72));
for (const c of combined.slice(0, 10)) {
  const r = combined.indexOf(c) + 1;
  const pct = (c.win_prob * 100).toFixed(1);
  const pctL = (c.win_prob_linear * 100).toFixed(1);
  const pctP = (c.place_prob_lb * 100).toFixed(1);
  const nm = name(c.horse_num).padEnd(16, "　");
  console.log(
    `  ${String(r).padStart(4)}  ${String(c.horse_num).padStart(4)}  ${nm}  ${String(c.borda_score).padStart(5)}  ${pct.padStart(8)}%  ${pctL.padStart(9)}%  ${pctP.padStart(5)}%`
  );
}

console.log("");
console.log("【各専門家の本命】");
for (const e of expertSummary) {
  console.log(`  ${e.expert}: ${e.honmei}`);
}

console.log("");
console.log(`詳細 → ${outPath}`);
