#!/usr/bin/env node
// レース後採点 — 各専門家の予想を確定結果と突き合わせてスコアを算出する。
// 設計書 §8.5（採点skill）の第一版 / §7.1（重み学習）の初期データ生成。
//
// usage: node scripts/score-race.mjs <race-dir>
//   読む: <race-dir>/predictions/v1/*.json
//         <race-dir>/result.json
//         <race-dir>/predictions/aggregated-v1.json（集団ベースライン用・任意）
//         <race-dir>/pack-v1.json（全馬番・馬名用・任意）
//         data/experts/<race>.json（人間予想家ベースライン用・任意）
//   書く: data/scoring/<race_id>.json（採点カード）
//         data/scoring/weights.json（w_i 台帳・累積。無ければ初期化）
//
// 確率の正規化は scripts/aggregate.mjs の getWinProbs と同一規約（未列挙馬フロア配分→εフロア→再正規化）。

import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const raceDir = process.argv[2];
if (!raceDir) {
  console.error("usage: node scripts/score-race.mjs <race-dir>");
  process.exit(1);
}

const readJSON = (p) => JSON.parse(readFileSync(p, "utf-8"));
const round = (x, n) => (x == null ? null : Math.round(x * 10 ** n) / 10 ** n);
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);

// --- 入力 ---
const result = readJSON(join(raceDir, "result.json"));
const winner = result.winner;
const place3 = result.place3 || [];

const pack = existsSync(join(raceDir, "pack-v1.json")) ? safe(() => readJSON(join(raceDir, "pack-v1.json"))) : null;
const agg = existsSync(join(raceDir, "predictions", "aggregated-v1.json"))
  ? safe(() => readJSON(join(raceDir, "predictions", "aggregated-v1.json")))
  : null;

function safe(fn) { try { return fn(); } catch { return null; } }

// --- 全馬番（pack 優先、無ければ予想と結果から収集） ---
let horseNums = [];
if (pack?.horses) horseNums = pack.horses.map((h) => h.horse_num);
const horseNames = {};
if (pack?.horses) for (const h of pack.horses) horseNames[h.horse_num] = h.name;

// --- 予想読み込み ---
const predDir = join(raceDir, "predictions", "v1");
const preds = [];
for (const f of readdirSync(predDir).filter((f) => f.endsWith(".json"))) {
  const d = safe(() => readJSON(join(predDir, f)));
  if (d && d.expert_id && Array.isArray(d.win_prob) && d.win_prob.length > 0) preds.push(d);
  else if (d === null) console.error(`スキップ: ${f}（パース失敗）`);
  else if (d && d.expert_id) console.error(`⚠ スキップ: ${f}（${d.expert_id}: win_prob が空/欠落 — 均等分布の誤採点を避けるため除外）`);
}
if (preds.length === 0) { console.error("有効な予想が0件。終了。"); process.exit(1); }

if (horseNums.length === 0) {
  const s = new Set(place3);
  for (const p of preds) {
    for (const w of p.win_prob || []) s.add(w.horse_num);
    for (const r of p.predicted_ranking || []) s.add(r.horse_num);
  }
  horseNums = [...s];
}
horseNums = [...new Set(horseNums)].sort((a, b) => a - b);

// --- aggregate.mjs と同一の win_prob 正規化 ---
const EPS = 0.005;
function fullDist(winProbArr) {
  const probs = {};
  for (const { horse_num, prob } of winProbArr || []) probs[horse_num] = prob;
  const listed = Object.values(probs).reduce((s, p) => s + p, 0);
  const unlisted = horseNums.filter((h) => !(h in probs));
  const rem = Math.max(0, 1 - listed);
  const per = unlisted.length ? rem / unlisted.length : 0;
  for (const h of unlisted) probs[h] = per;
  for (const h of horseNums) probs[h] = Math.max(probs[h] || 0, EPS);
  const t = Object.values(probs).reduce((s, p) => s + p, 0);
  for (const h of horseNums) probs[h] /= t;
  return probs;
}

// マルチクラス Brier（1着イベント）: Σ_h (p_h − [h==winner])^2 ∈ [0,2]、小さいほど良い
const brierWin = (dist) => horseNums.reduce((s, h) => s + (dist[h] - (h === winner ? 1 : 0)) ** 2, 0);
// 対数損失: −ln(p_winner)、小さいほど良い
const logloss = (dist) => -Math.log(dist[winner]);
const predRankOf = (pred, horse) => {
  const r = (pred.predicted_ranking || []).find((x) => x.horse_num === horse);
  return r ? r.rank : null;
};

// --- 各専門家の採点 ---
const scored = preds.map((p) => {
  const dist = fullDist(p.win_prob);
  const listedSum = (p.win_prob || []).reduce((s, w) => s + w.prob, 0);
  const marksSet = new Set(
    [p.marks?.honmei, p.marks?.taikou, p.marks?.tanana, ...(p.marks?.renka || [])].filter((x) => x != null)
  );
  const placedRanks = place3.map((h) => predRankOf(p, h)).filter((r) => r != null);
  return {
    expert_id: p.expert_id,
    expert_name: p.expert_name,
    school: p.school,
    backend: p.backend,
    confidence: p.confidence ?? null,
    win_prob_listed_sum: round(listedSum, 3),
    spec_sum_ok: listedSum >= 0.95 && listedSum <= 1.05, // §3.4 の許容範囲
    p_winner: round(dist[winner], 4),
    win_brier: round(brierWin(dist), 4),
    win_logloss: round(logloss(dist), 4),
    honmei: p.marks?.honmei ?? null,
    honmei_won: p.marks?.honmei === winner,
    honmei_in_place3: place3.includes(p.marks?.honmei),
    marks_place3_coverage: place3.filter((h) => marksSet.has(h)).length, // 0..3
    placed_in_ranking: placedRanks.length,
    placed_mean_pred_rank: placedRanks.length ? round(mean(placedRanks), 2) : null,
  };
});

// --- 集団ベースライン（§7.3 #3 個人 vs 集団） ---
function distFromAgg(key) {
  if (!agg?.aggregated_ranking) return null;
  const d = {};
  for (const r of agg.aggregated_ranking) d[r.horse_num] = r[key] ?? 0;
  const t = horseNums.reduce((s, h) => s + (d[h] || 0), 0) || 1;
  for (const h of horseNums) d[h] = (d[h] || 0) / t;
  return d;
}
const logDist = distFromAgg("win_prob"); // 実運用の集約（aggregate.mjs の logpool 結果）
// 線形プール E は score-race 側で各専門家の fullDist を平均して算出する。
// M と同一の馬番集合・同一 full precision にすることで、D=M−E が別精度・別空間の
// 引き算になって符号反転する事故を防ぐ（agg の丸め済み win_prob_linear は使わない）。
const linDist = Object.fromEntries(horseNums.map((h) => [h, 0]));
for (const p of preds) {
  const d = fullDist(p.win_prob);
  for (const h of horseNums) linDist[h] += d[h] / preds.length;
}
const collective = {};
if (logDist) collective.logpool = { p_winner: round(logDist[winner], 4), win_brier: round(brierWin(logDist), 4), win_logloss: round(logloss(logDist), 4) };
collective.linear = { p_winner: round(linDist[winner], 4), win_brier: round(brierWin(linDist), 4), win_logloss: round(logloss(linDist), 4) };

// 多様性予測定理 E = M − D。線形プールは Jensen 不等式で D≥0 が保証される（logpool は保証外）
const M = mean(scored.map((s) => s.win_brier));
const diversity = {
  mean_individual_brier_M: round(M, 4),
  linear_pool_brier_E: collective.linear?.win_brier ?? null,
  diversity_D_linear: collective.linear ? round(M - collective.linear.win_brier, 4) : null,
  logpool_brier: collective.logpool?.win_brier ?? null,
  note: "M も E_linear も score-race 側の同一 fullDist（全頭・full precision）から算出。D_linear = M − E_linear ≥ 0 は Jensen 不等式で保証（線形プールが平均個人を必ず下回る／全員同一分布なら D=0）。実運用の集約は logpool（D≥0 保証外）なので別掲。RPS は完全着順が無いため未算出。",
};

// --- 人間予想家ベースライン（§7.3 #2・あれば） ---
let humanBaseline = null;
const humanFiles = existsSync("data/experts") ? readdirSync("data/experts").filter((f) => f.endsWith(".json")) : [];
const humanFile = humanFiles.find((f) => f.includes("takarazuka") || f.includes(result.race_id)) || humanFiles[0];
if (humanFile) {
  const hd = safe(() => readJSON(join("data/experts", humanFile)));
  const nameToNum = Object.fromEntries(Object.entries(horseNames).map(([n, name]) => [name, Number(n)]));
  if (hd?.experts && Object.keys(nameToNum).length === 0) {
    console.error("⚠ 人間予想家ベースライン: pack の馬名が解決できないため算出を見送り（pack-v1.json を確認）");
  } else if (hd?.experts) {
    const rows = hd.experts.map((e) => {
      const honmeiPick = (e.picks || []).find((pk) => pk.mark === "◎");
      const num = honmeiPick ? nameToNum[honmeiPick.horse_name] : null;
      return { name: e.expert_name, honmei_num: num ?? null, honmei_won: num === winner, honmei_in_place3: num != null && place3.includes(num) };
    });
    const withHonmei = rows.filter((r) => r.honmei_num != null);
    humanBaseline = {
      source: humanFile,
      expert_count: rows.length,
      with_identifiable_honmei: withHonmei.length,
      honmei_won_count: withHonmei.filter((r) => r.honmei_won).length,
      honmei_in_place3_count: withHonmei.filter((r) => r.honmei_in_place3).length,
      note: "人間予想家の◎が1着/3着内だった数。AI集合知の honmei(◎=集約本命) と同じ土俵で比較するための粗い指標。",
    };
  }
}

// --- 出力 ---
const byBrier = [...scored].sort((a, b) => a.win_brier - b.win_brier);
const out = {
  race_id: result.race_id,
  race_name: result.race_name,
  scored_note: "レース後採点。win(1着)と place(3着内)に基づく。完全着順未取得のため RPS は未算出。確率正規化は aggregate.mjs と同一規約。",
  result: { winner, place3, finish_order_complete: !!result.finish_order_complete },
  expert_count: scored.length,
  metrics_legend: {
    win_brier: "マルチクラスBrier（1着イベント）Σ(p−y)^2。0〜2、小さいほど良い",
    win_logloss: "−ln(p_winner)。小さいほど良い",
    p_winner: "正規化後に1着馬へ与えた確率",
    marks_place3_coverage: "印(◎○▲△)の中に実際の3着内3頭が何頭含まれたか（0〜3）",
    placed_mean_pred_rank: "3着内各馬に予想で与えた着順の平均（小さいほど良い／予想に無い馬は除外）",
    spec_sum_ok: "列挙win_probの合計が§3.4の0.95〜1.05に収まったか（判定は丸め前の生合計。表示の win_prob_listed_sum は3桁丸め）",
  },
  experts: scored,
  collective_baseline: collective,
  diversity_decomposition: diversity,
  human_baseline: humanBaseline,
  rankings: {
    best_win_brier: byBrier.slice(0, 3).map((s) => `${s.expert_name}(${s.win_brier})`),
    worst_win_brier: byBrier.slice(-3).reverse().map((s) => `${s.expert_name}(${s.win_brier})`),
    honmei_won: scored.filter((s) => s.honmei_won).map((s) => s.expert_name),
    honmei_in_place3: scored.filter((s) => s.honmei_in_place3).map((s) => s.expert_name),
    spec_sum_violations: scored.filter((s) => !s.spec_sum_ok).map((s) => `${s.expert_name}(${s.win_prob_listed_sum})`),
  },
};

mkdirSync("data/scoring", { recursive: true });
const outPath = join("data", "scoring", `${result.race_id}.json`);
writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");

// --- w_i 台帳の更新（§7.1） ---
// 規約: 初期は等重み。較正は cutoff 後の実レースのみ（§7.3）。rolling 20レースの Brier が貯まるまで等重みを維持。
const weightsPath = join("data", "scoring", "weights.json");
let ledger = existsSync(weightsPath) ? safe(() => readJSON(weightsPath)) : null;
if (!ledger) {
  ledger = {
    version: "v1",
    rule: "初期は等重み。w_i は cutoff 後の実レースのみで較正（§7.3）。rolling window 20レースの Brier/LogLoss が貯まるまで等重みを維持し、それまでは scores を蓄積するのみ（n が小さい段階での重み付けは過学習）。",
    min_races_before_weighting: 20,
    races_recorded: [],
    cumulative: {},
    current_weights: {},
    note: "current_weights は aggregate.mjs が将来読む契約。現在は全員 equal（races < min_races_before_weighting）。",
  };
}
if (!ledger.races_recorded.includes(result.race_id)) {
  ledger.races_recorded.push(result.race_id);
}
// per-race でスコアを蓄積する（rolling window 20レースを将来切り出せるようにする。§7.1）。
// 全期間の単純累積だと「直近20レース」を切り出せず rolling window が実装できないため per_race 配列で持つ。
for (const s of scored) {
  const c = (ledger.cumulative[s.expert_id] ||= { expert_name: s.expert_name, per_race: [] });
  c.expert_name = s.expert_name;
  if (!c.per_race.some((r) => r.race_id === result.race_id)) {
    c.per_race.push({ race_id: result.race_id, win_brier: s.win_brier, win_logloss: s.win_logloss, honmei_in_place3: s.honmei_in_place3 });
  }
  // 読み取り用の集計（全期間）。重み付けは将来 per_race から rolling window 20 で再計算する
  c.races = c.per_race.length;
  c.mean_win_brier = round(mean(c.per_race.map((r) => r.win_brier)), 4);
  c.mean_win_logloss = round(mean(c.per_race.map((r) => r.win_logloss)), 4);
  c.honmei_in_place3_count = c.per_race.filter((r) => r.honmei_in_place3).length;
}
// 等重み（races が閾値未満の間）。合計が厳密に1になるよう端数を最後の専門家で吸収する
const ids = scored.map((s) => s.expert_id);
const equal = round(1 / ids.length, 4);
ledger.current_weights = Object.fromEntries(
  ids.map((id, i) => [id, i < ids.length - 1 ? equal : round(1 - equal * (ids.length - 1), 4)])
);
ledger.weighting_active = ledger.races_recorded.length >= ledger.min_races_before_weighting;
writeFileSync(weightsPath, JSON.stringify(ledger, null, 2) + "\n");

// --- コンソール ---
const nm = (n) => (n == null ? "—" : horseNames[n] || `馬番${n}`);
console.log("");
console.log(`=== k-ba-man レース後採点 — ${result.race_name || result.race_id} ===`);
console.log("");
console.log(`結果: 1着 ${nm(winner)}(${winner}) / 3着内 ${place3.map((h) => `${nm(h)}(${h})`).join(", ")}`);
console.log(`採点対象: ${scored.length}人`);
console.log("");
console.log("【各専門家】Brier / LogLoss / p(1着) / ◎ / 印の3着内カバー");
console.log("  " + "─".repeat(78));
for (const s of byBrier) {
  console.log(
    `  ${s.expert_name.padEnd(5, "　")} ${s.school.padEnd(3, "　")}` +
    ` B=${s.win_brier.toFixed(3)} LL=${s.win_logloss.toFixed(2)} p=${(s.p_winner * 100).toFixed(1)}%` +
    ` ◎${nm(s.honmei)}${s.honmei_won ? "(1着)" : s.honmei_in_place3 ? "(3内)" : "(圏外)"}` +
    ` cov=${s.marks_place3_coverage}/3` +
    `${s.spec_sum_ok ? "" : ` ⚠Σ=${s.win_prob_listed_sum}`}`
  );
}
console.log("");
console.log("【集団 vs 個人（多様性予測定理 E=M−D）】");
console.log(`  個人平均 Brier (M)        : ${diversity.mean_individual_brier_M}`);
if (collective.linear) console.log(`  線形プール Brier (E)      : ${diversity.linear_pool_brier_E}  → D = ${diversity.diversity_D_linear}（Jensenで≥0保証）`);
if (collective.logpool) console.log(`  実運用 logpool Brier      : ${diversity.logpool_brier}  p(1着)=${(collective.logpool.p_winner * 100).toFixed(1)}%`);
console.log("");
if (humanBaseline) {
  console.log("【人間予想家ベースライン】");
  console.log(`  ${humanBaseline.expert_count}人中 ◎判別可 ${humanBaseline.with_identifiable_honmei}人: ◎1着 ${humanBaseline.honmei_won_count}人 / ◎3着内 ${humanBaseline.honmei_in_place3_count}人`);
  console.log("");
}
console.log(`採点カード → ${outPath}`);
console.log(`w_i 台帳   → ${weightsPath}（races=${ledger.races_recorded.length}, weighting_active=${ledger.weighting_active}）`);
