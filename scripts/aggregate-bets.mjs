#!/usr/bin/env node
// 資金配分専門家のポートフォリオを平均して統合買い目を出力する
// ポートフォリオの凸結合はポートフォリオなので、チケット単位の stake 平均が正当な集約になる
// usage: node scripts/aggregate-bets.mjs <bets-dir(v1)>

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";

const betsDir = process.argv[2];
if (!betsDir) {
  console.error("usage: node scripts/aggregate-bets.mjs <bets-dir>");
  process.exit(1);
}

const BET_TYPES = new Set(["単勝", "複勝", "ワイド", "馬連", "三連複", "三連単"]);
const UNORDERED = new Set(["ワイド", "馬連", "三連複"]);
const DUST_JPY = 200; // 平均後にこれ未満のチケットは見送りに回す

// selection の正規化: 順不同券種は昇順ソート
function normalizeSelection(betType, sel) {
  if (UNORDERED.has(betType)) {
    return sel
      .split("-")
      .map((s) => parseInt(s.trim(), 10))
      .sort((a, b) => a - b)
      .join("-");
  }
  return sel.replace(/\s/g, "");
}

const files = readdirSync(betsDir).filter((f) => f.endsWith(".json"));
const portfolios = [];
for (const f of files) {
  try {
    const p = JSON.parse(readFileSync(join(betsDir, f), "utf-8"));
    if (p.bettor_id && Array.isArray(p.tickets)) portfolios.push(p);
    else console.error(`スキップ: ${f}（必須フィールド欠落）`);
  } catch {
    console.error(`スキップ: ${f}（パース失敗）`);
  }
}
if (portfolios.length === 0) {
  console.error("有効なポートフォリオが0件。終了。");
  process.exit(1);
}

const N = portfolios.length;
const pool = {}; // key → { bet_type, selection, totalStake, backers: [bettor_id], rationales }

for (const p of portfolios) {
  for (const t of p.tickets) {
    if (!BET_TYPES.has(t.bet_type)) {
      console.error(`不正券種をスキップ: ${p.bettor_id} ${t.bet_type}`);
      continue;
    }
    const sel = normalizeSelection(t.bet_type, t.selection);
    const key = `${t.bet_type}:${sel}`;
    pool[key] ??= { bet_type: t.bet_type, selection: sel, totalStake: 0, backers: [], rationales: [] };
    pool[key].totalStake += t.stake_jpy;
    pool[key].backers.push(p.bettor_name || p.bettor_id);
    pool[key].rationales.push(`${p.bettor_name || p.bettor_id}: ${t.rationale_short}`);
  }
}

// stake 平均（不参加者は0円扱い）→ 100円単位に丸め → DUST 未満を落とす
const tickets = [];
let dust = 0;
for (const key of Object.keys(pool)) {
  const e = pool[key];
  const avg = Math.round(e.totalStake / N / 100) * 100;
  if (avg < DUST_JPY) {
    dust += avg;
    continue;
  }
  tickets.push({
    bet_type: e.bet_type,
    selection: e.selection,
    stake_jpy: avg,
    consensus: `${e.backers.length}/${N}`,
    backers: e.backers,
    rationales: e.rationales,
  });
}
tickets.sort((a, b) => b.stake_jpy - a.stake_jpy || b.backers.length - a.backers.length);

const totalStake = tickets.reduce((s, t) => s + t.stake_jpy, 0);
const budget = 10000;

const output = {
  method: `portfolio averaging over ${N} bettors (equal weight); dust<${DUST_JPY} dropped`,
  bettor_count: N,
  bettors: portfolios.map((p) => ({
    bettor: p.bettor_name || p.bettor_id,
    backend: p.backend,
    philosophy: p.philosophy,
    total_stake_jpy: p.tickets.reduce((s, t) => s + t.stake_jpy, 0),
    ticket_count: p.tickets.length,
  })),
  aggregated_tickets: tickets,
  total_stake_jpy: totalStake,
  pass_jpy: budget - totalStake,
  pass_note: "pass = 集合的な見送り額（各自が使わなかった予算とダスト切捨ての平均）",
};

const outPath = join(dirname(betsDir), "aggregated-v1.json");
writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n");

console.log("");
console.log("╔══════════════════════════════════════════════════╗");
console.log("║      k-ba-man 集合知買い目 — ポートフォリオ平均    ║");
console.log("╚══════════════════════════════════════════════════╝");
console.log("");
console.log(`参加: ${N}人`);
for (const b of output.bettors) {
  console.log(`  ${b.bettor}（${b.backend}）: ${b.ticket_count}点 ${b.total_stake_jpy}円 — ${b.philosophy}`);
}
console.log("");
console.log("【統合買い目】");
console.log("  券種    買い目        金額   支持");
console.log("  " + "─".repeat(44));
for (const t of tickets) {
  console.log(
    `  ${t.bet_type.padEnd(4, "　")}  ${t.selection.padEnd(12)}  ${String(t.stake_jpy).padStart(5)}円  ${t.consensus}`
  );
}
console.log("  " + "─".repeat(44));
console.log(`  合計 ${totalStake}円 / 見送り ${budget - totalStake}円`);
console.log("");
console.log(`詳細 → ${outPath}`);
