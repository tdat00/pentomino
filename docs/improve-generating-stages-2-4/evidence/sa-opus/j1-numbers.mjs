// @ts-check
// SA-Opus, joint report round 1: the few new numbers of the joint report and plan (read-only, unlocked).
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\j1-numbers.mjs
// (1) The Hell 1 table prior on the piloted boards, both SAs' candidate statistics, from fr-base's raw journals: the
//     seed-balanced median window share wc/K of the ended calls (median per pilot seed, then across seeds) and the median
//     accepted share (prior-v1's rule); (2) the P7 spike's timing probe on T11g's own item schedule at V4-S2K's measured item
//     times (factor 1 instead of 1.25; corrected after SA-Astra's draft review, finding 6); (3) the round's account chain to
//     each owner stop on the agreed route, by formal guard and at the timing-proxy estimates of x1-prices.
// Writes j1-numbers.json and j1-numbers.md beside it.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { armShards, callsOf, f, HERE, med, ROOT, rowJournal, writeCrlf } from './s2-lib.mjs';

/** @type {any} */
const out = {};
const md = ['# Joint report round 1: new numbers (SA-Opus scratch)', '', 'Computed by `j1-numbers.mjs` (read-only, unlocked).', ''];

// (1) Hell 1 table prior candidates on the piloted boards.
md.push('## 1. Hell 1 table prior on the piloted boards (fr-base, V4-S2 reps 0-4)', '',
  '| Board (area) | per-seed median wc/K | seed-balanced wc/K | median accepted share (pooled) | start at the median K |', '|---|---|---:|---:|---|');
out.prior = {};
for (const s of armShards('fr-base').filter((x) => x.cell.endsWith('hell-1'))) {
  const perSeed = [];
  const Ks = [];
  for (const r of s.rows) {
    const j = rowJournal('fr-base', s.shard, r.rowKey);
    const shares = [];
    for (const c of callsOf(j.lines ?? []).values()) {
      if (c.end && c.start && typeof c.end.locate?.wc === 'number') {
        shares.push(c.end.locate.wc / c.start.K);
        Ks.push(c.start.K);
      }
    }
    perSeed.push(/** @type {number} */ (med(shares)));
  }
  const accepted = s.rows.flatMap((r) => r.run.details.puzzles.map((/** @type {any} */ p) => p.clues / r.run.details.K));
  const seedBalanced = /** @type {number} */ (med(perSeed));
  const pooled = /** @type {number} */ (med(accepted));
  const K = /** @type {number} */ (med(Ks));
  out.prior[s.cell] = { perSeed, seedBalanced, pooled, medianK: K, startSeed: Math.round(seedBalanced * K), startPooled: Math.round(pooled * K) };
  md.push(`| ${s.cell} | ${perSeed.map((x) => f(x, 4)).join(' ')} | ${f(seedBalanced, 6)} | ${f(pooled, 6)} | K ${K}: ${Math.round(seedBalanced * K)} against ${Math.round(pooled * K)} |`);
}

// (2) The P7 spike's timing probe: T11g's own item schedule (`price`, with its 2-s startup and 3-s group start per invocation),
//     at V4-S2K's measured item durations (factor 1) instead of the formal 1.25; a timing-proxy scenario, not a measurement.
const M = await import(pathToFileURL(join(ROOT, 'tools', 'ig-proto', 'manifest.mjs')).href);
const kernel = JSON.parse(readFileSync(join(ROOT, 'docs', 'improve-generating', 'evidence', 'frozen', 'V4-S2K', 'kernel.json'), 'utf8'));
/** @param {number} factor */
const spikeInput = (factor) => ({ type: 'items', groups: [{ kind: 'v4-kernel', variant: 'candidate-composite', lanes: 1, reserveS: 90,
  durationsS: Array.from({ length: 3 }, () => kernel.rows.map((/** @type {any} */ r) => factor * r.itemMs / 1000)).flat() }] });
const formal = M.price([spikeInput(1.25), spikeInput(1.25), spikeInput(1.25)]);
const proxy = M.price([spikeInput(1), spikeInput(1), spikeInput(1)]);
out.spike = { items: 3 * kernel.rows.length, itemMsSum: kernel.rows.reduce((/** @type {number} */ a, /** @type {any} */ r) => a + r.itemMs, 0),
  formal: { projected: formal.countedS / 60, guard: formal.guardS / 60 },
  threeCandidates: { idle: (proxy.projectS + 15 * proxy.invocations) / 60, full: (proxy.projectS + 45 * proxy.invocations) / 60 },
  proxyProjectS: proxy.projectS, invocations: proxy.invocations };
md.push('', '## 2. The P7 spike\'s timing probe (a timing-proxy scenario)', '',
  `Per candidate composite: ${out.spike.items} paired items; V4-S2K's item times sum to ${out.spike.itemMsSum} ms per pass. T11g's schedule`,
  `(\`price\`, with its per-invocation startup and group start) at the measured durations: ${f(proxy.projectS, 2)} node s for three candidates`,
  `in ${proxy.invocations} invocations, so ${f(out.spike.threeCandidates.idle, 4)} to ${f(out.spike.threeCandidates.full, 4)} counted minutes (15 s or 45 s quiet);`,
  `the formal price at 1.25 x the durations stays ${f(out.spike.formal.projected, 6)} projected / ${f(out.spike.formal.guard, 6)} guard.`);

// (3) The account chain (counted minutes) to each owner stop, on the agreed route (the Hell 1 check in V4-S3P).
const prices = JSON.parse(readFileSync(join(HERE, 'x1-prices.json'), 'utf8'));
const ACCOUNT = (10252.712 + 87.4) / 60;
const LIVE = { guard: 2634.330248 / 60, real: [4, 5] };
const PROOFS = prices['V4-S3P: the four frozen arms\' P-1 passes'];
const HELL = prices['Hell 1 composite check, rows only (arm with an accepted binding)'];
const S4 = prices['V4-S4 (initial + both conditional boards, no S4-6)'];
const S4C = prices['V4-S4C (same collection)'];
// SA-Astra's corrected realistic V4-S4 (15x20 and 26x26 Nightmare screen twins at fr-screen's times): review-records.json.
const S4_REAL = [464.2767082351509, 509.7767082351509];
const list = [
  ['V4-S2B control pilot', prices['V4-S2B'].formalGuardMin, [prices['V4-S2B'].realisticIdleMin, prices['V4-S2B'].realisticFullMin]],
  ['V4-P7 timing probe (three candidates)', out.spike.formal.guard, [out.spike.threeCandidates.idle, out.spike.threeCandidates.full]],
  ['V4-S3P: proofs plus the 20 Hell 1 rows', PROOFS.guard + HELL.guard, [PROOFS.realistic.idle + HELL.realistic.idle, PROOFS.realistic.full + HELL.realistic.full]],
  ['V4-LIVE', LIVE.guard, LIVE.real],
  ['V4-S4', S4.guard, S4_REAL],
  ['V4-S4C', S4C.guard, [S4C.realistic.idle, S4C.realistic.full]],
];
md.push('', '## 3. The round\'s account to each owner stop (counted minutes; grant 749, runs pass 747)', '',
  `Account now ${f(ACCOUNT, 4)}. "Minimum cap": the account at the assumed spend plus the stop's guard, rounded up; a minimum quote`,
  'for that scope, not a grant. "Guard chain": every earlier plan spends its whole guard.', '',
  '| Stop | guard | minimum cap at the proxy spend | cap if every earlier guard is spent | proxy minutes |', '|---|---:|---|---:|---|');
let g = ACCOUNT;
let lo = ACCOUNT;
let hi = ACCOUNT;
const rows = [];
for (const [name, guard, real] of list) {
  const r = { name, guard, capGuard: Math.ceil(g + /** @type {number} */ (guard)),
    capProxy: [Math.ceil(lo + /** @type {number} */ (guard)), Math.ceil(hi + /** @type {number} */ (guard))], real };
  rows.push(r);
  g += /** @type {number} */ (guard);
  lo += /** @type {number[]} */ (real)[0];
  hi += /** @type {number[]} */ (real)[1];
  md.push(`| ${name} | ${f(/** @type {number} */ (guard), 6)} | ${r.capProxy[0]} to ${r.capProxy[1]} | ${r.capGuard} | ${f(/** @type {number[]} */ (real)[0], 4)} to ${f(/** @type {number[]} */ (real)[1], 4)} |`);
}
out.chain = { rows, endGuard: g, endProxy: [lo, hi] };
md.push('', `End of the round: ${f(lo, 3)} to ${f(hi, 3)} counted minutes at the proxy spend; ${f(g, 3)} if every guard were spent.`);
writeCrlf(join(HERE, 'j1-numbers.json'), JSON.stringify(out, null, 2));
writeCrlf(join(HERE, 'j1-numbers.md'), md.join('\n'));
process.stdout.write(`${md.join('\n')}\n`);
