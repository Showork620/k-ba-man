#!/usr/bin/env node
// 配分専門家の買い目を確定結果と突き合わせて収支を集計する
// bets/v1/ のみ対象（r2 はダブルチェック専用・記録対象外）
//
// usage: node scripts/score-bets.mjs <race-dir>
//   読む: <race-dir>/bets/v1/<bettor>.json
//         <race-dir>/bets/aggregated-v1.json
//         <race-dir>/result.json
//   書く: data/scoring/bettor-ledger.json（収支台帳・累積）

import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const raceDir = process.argv[2];
if (!raceDir) {
  console.error("usage: node scripts/score-bets.mjs <race-dir>");
  process.exit(1);
}

const readJSON = (p) => JSON.parse(readFileSync(p, "utf-8"));
const safe = (fn) => { try { return fn(); } catch { return null; } };
const round = (x, n) => Math.round(x * 10 ** n) / 10 ** n;

// 順不同券種のキー正規化（昇順ソート）
const UNORDERED = new Set(["ワイド", "馬連", "三連複"]);
function normKey(betType, sel) {
  if (UNORDERED.has(betType)) {
    return sel.split("-").map(Number).sort((a, b) => a - b).join("-");
  }
  return String(sel).replace(/\s/g, "");
}

// result.payouts から券種別ペイアウトマップを構築
// dict 形式 { "16": 390 } と array 形式 [{ horse_num, payout }] の両方に対応
function buildPayoutMap(payouts) {
  const map = {};
  const KEY_TO_BET_TYPE = {
    tansho:    "単勝",
    fukusho:   "複勝",
    wide:      "ワイド",
    umaren:    "馬連",
    umatan:    "馬単",
    sanrenpuku:"三連複",
    sanrentan: "三連単",
    // wakuren: 配分専門家は枠連を買わないため除外
  };
  for (const [key, betType] of Object.entries(KEY_TO_BET_TYPE)) {
    const data = payouts[key];
    if (!data) continue;
    map[betType] = {};
    if (Array.isArray(data)) {
      for (const item of data) {
        const sel = item.horse_num != null ? String(item.horse_num) : item.selection;
        map[betType][normKey(betType, sel)] = item.payout;
      }
    } else {
      for (const [sel, payout] of Object.entries(data)) {
        map[betType][normKey(betType, sel)] = payout;
      }
    }
  }
  return map;
}

// チケットリストに対してペイアウトを計算
function calcReturn(tickets, payoutMap) {
  let totalReturn = 0;
  const hits = [];
  for (const t of tickets || []) {
    const key = normKey(t.bet_type, t.selection);
    const payout = payoutMap[t.bet_type]?.[key];
    if (payout) {
      const units = Math.floor(t.stake_jpy / 100);
      const won = units * payout;
      totalReturn += won;
      hits.push({
        bet_type: t.bet_type,
        selection: t.selection,
        stake_jpy: t.stake_jpy,
        payout_per_100: payout,
        return_jpy: won,
      });
    }
  }
  return { return_jpy: totalReturn, hits };
}

// --- 入力読み込み ---
const result = readJSON(join(raceDir, "result.json"));
const payoutMap = buildPayoutMap(result.payouts || {});

const betsDir = join(raceDir, "bets", "v1");
const bettors = [];
for (const f of readdirSync(betsDir).filter((f) => f.endsWith(".json"))) {
  const d = safe(() => readJSON(join(betsDir, f)));
  if (d?.bettor_id && Array.isArray(d.tickets)) bettors.push(d);
  else console.error(`スキップ: ${f}（bettor_id/tickets 欠落）`);
}
if (bettors.length === 0) {
  console.error("有効なポートフォリオが0件。終了。");
  process.exit(1);
}

const aggPath = join(raceDir, "bets", "aggregated-v1.json");
const agg = existsSync(aggPath) ? safe(() => readJSON(aggPath)) : null;

// --- 各専門家の採点 ---
const scored = bettors.map((b) => {
  const { return_jpy, hits } = calcReturn(b.tickets, payoutMap);
  const stake = b.tickets.reduce((s, t) => s + t.stake_jpy, 0);
  return {
    bettor_id: b.bettor_id,
    bettor_name: b.bettor_name,
    backend: b.backend,
    stake_jpy: stake,
    return_jpy,
    profit_jpy: return_jpy - stake,
    roi: stake > 0 ? round(return_jpy / stake, 4) : null,
    hit_count: hits.length,
    hits,
  };
});

// --- 集約ポートフォリオの採点 ---
let aggScored = null;
if (agg?.aggregated_tickets) {
  const { return_jpy, hits } = calcReturn(agg.aggregated_tickets, payoutMap);
  const stake = agg.total_stake_jpy;
  aggScored = {
    stake_jpy: stake,
    return_jpy,
    profit_jpy: return_jpy - stake,
    roi: stake > 0 ? round(return_jpy / stake, 4) : null,
    hit_count: hits.length,
    hits,
    bettor_count: agg.bettor_count,
  };
}

// --- 台帳の更新 ---
const ledgerPath = join("data", "scoring", "bettor-ledger.json");
mkdirSync("data/scoring", { recursive: true });
let ledger = existsSync(ledgerPath) ? safe(() => readJSON(ledgerPath)) : null;
if (!ledger) {
  ledger = {
    version: "v1",
    note: "配分専門家（haibun-*）の収支台帳。bets/v1/ のみ対象（r2 はダブルチェック専用・記録対象外）。",
    races_recorded: [],
    cumulative: {},
    aggregated: { bettor_name: "集約（5人平均）", per_race: [] },
  };
}
if (!ledger.races_recorded.includes(result.race_id)) {
  ledger.races_recorded.push(result.race_id);
}

for (const s of scored) {
  const c = (ledger.cumulative[s.bettor_id] ||= {
    bettor_name: s.bettor_name,
    backend: s.backend,
    per_race: [],
  });
  c.bettor_name = s.bettor_name;
  c.backend = s.backend;
  if (!c.per_race.some((r) => r.race_id === result.race_id)) {
    c.per_race.push({
      race_id: result.race_id,
      race_name: result.race_name,
      stake_jpy: s.stake_jpy,
      return_jpy: s.return_jpy,
      profit_jpy: s.profit_jpy,
      roi: s.roi,
      hit_count: s.hit_count,
      hits: s.hits,
    });
  }
  c.races = c.per_race.length;
  c.total_stake_jpy = c.per_race.reduce((s, r) => s + r.stake_jpy, 0);
  c.total_return_jpy = c.per_race.reduce((s, r) => s + r.return_jpy, 0);
  c.total_profit_jpy = c.total_return_jpy - c.total_stake_jpy;
  c.cumulative_roi = c.total_stake_jpy > 0
    ? round(c.total_return_jpy / c.total_stake_jpy, 4)
    : null;
}

if (aggScored) {
  if (!ledger.aggregated) ledger.aggregated = { bettor_name: "集約（5人平均）", per_race: [] };
  const ca = ledger.aggregated;
  if (!ca.per_race.some((r) => r.race_id === result.race_id)) {
    ca.per_race.push({
      race_id: result.race_id,
      race_name: result.race_name,
      stake_jpy: aggScored.stake_jpy,
      return_jpy: aggScored.return_jpy,
      profit_jpy: aggScored.profit_jpy,
      roi: aggScored.roi,
      hit_count: aggScored.hit_count,
      hits: aggScored.hits,
      bettor_count: aggScored.bettor_count,
    });
  }
  ca.races = ca.per_race.length;
  ca.total_stake_jpy = ca.per_race.reduce((s, r) => s + r.stake_jpy, 0);
  ca.total_return_jpy = ca.per_race.reduce((s, r) => s + r.return_jpy, 0);
  ca.total_profit_jpy = ca.total_return_jpy - ca.total_stake_jpy;
  ca.cumulative_roi = ca.total_stake_jpy > 0
    ? round(ca.total_return_jpy / ca.total_stake_jpy, 4)
    : null;
}

writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + "\n");

// --- コンソール表示 ---
const nm = (n) => `${n}番`;
console.log("");
console.log(`=== k-ba-man 配分専門家 収支採点 — ${result.race_name || result.race_id} ===`);
console.log("");
console.log(`結果: 1着 ${nm(result.winner)} / 3着内 ${result.place3.map(nm).join(", ")}`);
console.log("");
console.log("【各配分専門家】投資 / 回収 / 損益 / ROI");
console.log("  " + "─".repeat(68));
const byProfit = [...scored].sort((a, b) => b.profit_jpy - a.profit_jpy);
for (const s of byProfit) {
  const sign = s.profit_jpy >= 0 ? "+" : "";
  const hitStr = s.hit_count > 0 ? ` 的中${s.hit_count}票` : " 全外";
  console.log(
    `  ${s.bettor_name.padEnd(4, "　")} [${s.backend}]` +
    ` 投資${s.stake_jpy}円 回収${s.return_jpy}円 ${sign}${s.profit_jpy}円` +
    ` ROI=${s.roi != null ? (s.roi * 100).toFixed(1) : "—"}%${hitStr}`
  );
}
console.log("");
if (aggScored) {
  const sign = aggScored.profit_jpy >= 0 ? "+" : "";
  console.log(
    `  集約ポートフォリオ` +
    ` 投資${aggScored.stake_jpy}円 回収${aggScored.return_jpy}円 ${sign}${aggScored.profit_jpy}円` +
    ` ROI=${aggScored.roi != null ? (aggScored.roi * 100).toFixed(1) : "—"}%`
  );
  console.log("");
}

console.log("【累積収支（全レース）】");
console.log("  " + "─".repeat(68));
const byTotalProfit = Object.values(ledger.cumulative).sort(
  (a, b) => b.total_profit_jpy - a.total_profit_jpy
);
for (const c of byTotalProfit) {
  const sign = c.total_profit_jpy >= 0 ? "+" : "";
  console.log(
    `  ${c.bettor_name.padEnd(4, "　")} ${c.races}戦` +
    ` 投資${c.total_stake_jpy}円 回収${c.total_return_jpy}円 ${sign}${c.total_profit_jpy}円` +
    ` 累積ROI=${c.cumulative_roi != null ? (c.cumulative_roi * 100).toFixed(1) : "—"}%`
  );
}
if (ledger.aggregated?.per_race?.length > 0) {
  const ca = ledger.aggregated;
  const sign = ca.total_profit_jpy >= 0 ? "+" : "";
  console.log(
    `  集約　 ${ca.races}戦` +
    ` 投資${ca.total_stake_jpy}円 回収${ca.total_return_jpy}円 ${sign}${ca.total_profit_jpy}円` +
    ` 累積ROI=${ca.cumulative_roi != null ? (ca.cumulative_roi * 100).toFixed(1) : "—"}%`
  );
}
console.log("");
console.log(`台帳 → ${ledgerPath}（races=${ledger.races_recorded.length}）`);
