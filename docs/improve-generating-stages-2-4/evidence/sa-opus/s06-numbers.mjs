// @ts-check
// SA-Opus, the SAs' reading of V4-S4 (s06-reading.md): the ten Nightmare controls re-read per seed from the published
// rows, with the harness's own recipe (verdicts.mjs cappedT10, noRegression; quantity 10, cap 120 s, 10,000 resamples,
// seed 20261116, validation reps 20-39), which must reproduce verdicts.json; then, for information only and never a
// verdict, the dispersion of each control, the slow seeds of 26x26 Nightmare, the same recipe for the screen arm
// fr-frozen against today's arm on the same seeds, and S01's five fitting seeds of 26x26 (V4-S2 fr-none) for comparison.
// Unlocked: it reads records only; it rates nothing and writes its outputs beside itself.
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\s06-numbers.mjs
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cappedT10, geoMean, ingestRow, noRegression } from '../../../../tools/ig-proto/verdicts.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const HERE = 'docs/improve-generating-stages-2-4/evidence/sa-opus';
const S4 = 'docs/improve-generating/evidence/frozen/V4-S4';
/** @type {{ path: string, sha256Lf: string }[]} */
const inputs = [];
const sha256 = (/** @type {string} */ t) => createHash('sha256').update(t, 'utf8').digest('hex');
const read = (/** @type {string} */ p) => {
  const text = readFileSync(join(ROOT, p), 'utf8');
  if (!inputs.some((e) => e.path === p)) {
    inputs.push({ path: p, sha256Lf: sha256(text.replace(/\r\n/g, '\n')) });
  }
  return text;
};
const json = (/** @type {string} */ p) => JSON.parse(read(p));
const crlf = (/** @type {string} */ t) => `${t.replace(/\r?\n/g, '\r\n').replace(/[ \t]+\r\n/g, '\r\n').replace(/(\r\n)*$/, '')}\r\n`;
const r4 = (/** @type {number} */ x) => Math.round(x * 10000) / 10000;

const manifest = json('tools/ig-proto/plans/verdicts/V4-S4.verdict-manifest.json');
const verdicts = json(`${S4}/verdicts.json`);
const { quantity, capMs, resamples, resampleSeed, validationReps: reps } = manifest;
const opts = { quantity, capMs };
const stat = { resamples, resampleSeed };

/** @param {string} arm @param {string} cell @returns {Map<number, any>} The valid rows of the cell by rep. */
function rowsOf(arm, cell) {
  const doc = json(`${S4}/${arm}/val-${cell}.runs.json`);
  /** @type {Map<number, any>} */
  const out = new Map();
  for (const row of doc.rows) {
    const g = ingestRow(row, { quantity });
    if (g.status === 'valid' && reps.includes(row.rep)) {
      out.set(row.rep, row.run);
    }
  }
  return out;
}
const sd = (/** @type {number[]} */ xs) => {
  const logs = xs.map(Math.log);
  const m = logs.reduce((a, b) => a + b, 0) / logs.length;
  return Math.sqrt(logs.reduce((a, b) => a + (b - m) ** 2, 0) / (logs.length - 1));
};
// The normal approximation of the resampled 10th percentile: lower = gm x exp(-1.2816 x sd / sqrt(n)).
const needed = (/** @type {number} */ s, /** @type {number} */ n) => 0.9 * Math.exp(1.2816 * s / Math.sqrt(n));
// The chance that a 20-seed lower bound reaches 0.9 when the true geometric mean is g (normal approximation).
const passChance = (/** @type {number} */ g, /** @type {number} */ s, /** @type {number} */ n) => {
  const z = (Math.log(g) - Math.log(needed(s, n))) / (s / Math.sqrt(n));
  // Standard normal CDF (Abramowitz-Stegun 26.2.17).
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const p = 1 - (Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI)) * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z >= 0 ? p : 1 - p;
};
const p95 = (/** @type {number[]} */ xs) => xs.slice().sort((a, b) => a - b)[Math.ceil(0.95 * xs.length) - 1];

const controls = manifest.controls.map((/** @type {{ cell: string, today: string }} */ c) => {
  const record = verdicts.controls.find((/** @type {any} */ v) => v.cell === c.cell);
  const shipped = record.shipped;
  const today = rowsOf(c.today, c.cell);
  const after = rowsOf(shipped, c.cell);
  const screen = rowsOf('fr-frozen', c.cell);
  const per = reps.map((/** @type {number} */ rep) => {
    const t = cappedT10(today.get(rep), opts);
    const a = cappedT10(after.get(rep), opts);
    const s = screen.has(rep) ? cappedT10(screen.get(rep), opts) : null;
    return { rep, todayMs: t, shippedMs: a, screenMs: s, ratio: t / a, screenRatio: s === null ? null : t / s };
  });
  const ratios = per.map((p) => p.ratio);
  const nr = noRegression(ratios, reps, stat);
  const spread = sd(ratios);
  const screenRatios = per.map((p) => p.screenRatio);
  const screenNr = screenRatios.every((x) => typeof x === 'number') ? noRegression(/** @type {number[]} */ (screenRatios), reps, stat) : null;
  return {
    cell: c.cell, class: record.class, shipped, today: c.today,
    recorded: record.gate.noRegression, reproduced: { geoMean: nr.geoMean, lower: nr.lower, pass: nr.pass },
    same: Math.abs(nr.geoMean - record.gate.noRegression.geoMean) < 1e-12 && Math.abs(nr.lower - record.gate.noRegression.lower) < 1e-12,
    logSd: spread, gmNeededFor09: needed(spread, reps.length), passChanceAtParity: passChance(1, spread, reps.length),
    p95TodayS: p95(per.map((p) => p.todayMs)) / 1000, p95ShippedS: p95(per.map((p) => p.shippedMs)) / 1000,
    screenAgainstToday: shipped === 'fr-frozen' || screenNr === null ? null : { geoMean: screenNr.geoMean, lower: screenNr.lower },
    perSeed: per,
  };
});

// S01's five fitting seeds of 26x26 Nightmare (V4-S2's fr-none against MP12b1's today), as s01-reading.md W2 quotes them.
const s01 = json(`${HERE}/s01-numbers.json`);

const c26 = controls.find((/** @type {any} */ c) => c.cell === '26x26-nightmare');
const sorted = c26.perSeed.slice().sort((/** @type {any} */ a, /** @type {any} */ b) => a.ratio - b.ratio);
const result = {
  script: `${HERE}/s06-numbers.mjs`, manifest: { quantity, capMs, resamples, resampleSeed, reps },
  controls: controls.map(({ perSeed, ...rest }) => rest),
  cell26: {
    perSeed: c26.perSeed, slowest: sorted.slice(0, 5), fastest: sorted.slice(-5),
    withoutSlowestTwo: geoMean(sorted.slice(2).map((/** @type {any} */ p) => p.ratio)),
    belowOne: c26.perSeed.filter((/** @type {any} */ p) => p.ratio < 1).length,
    below08: c26.perSeed.filter((/** @type {any} */ p) => p.ratio < 0.8).length,
    above12: c26.perSeed.filter((/** @type {any} */ p) => p.ratio > 1.2).length,
  },
  s01: {
    w2: (({ cell, task, arm, geo, lower, logSd, pairs }) => ({ cell, task, arm, geo, lower, logSd, ratios: pairs.map((/** @type {any} */ p) => p.ratio) }))(s01.stage2),
    w1: (({ cell, geo, lower, logSd, ratios }) => ({ cell, task: 'V4-S2B', arm: 'fr-none', geo, lower, logSd, ratios }))(s01.cells.find((/** @type {any} */ c) => c.cell === '32x15-nightmare')),
  },
  inputs: { entries: inputs.length, sha256Lf: sha256(JSON.stringify(inputs)) },
};
writeFileSync(join(ROOT, HERE, 's06-numbers.json'), crlf(JSON.stringify(result, null, 2)), 'utf8');
const md = [
  '# S06: the ten Nightmare controls of V4-S4, per seed (information, never a verdict)',
  '',
  `Recipe of \`tools/ig-proto/plans/verdicts/V4-S4.verdict-manifest.json\`: quantity ${quantity}, cap ${capMs} ms, ${resamples} resamples, seed ${resampleSeed}, reps ${reps[0]}-${reps.at(-1)}. Ratio = today's capped T10 over the shipped arm's.`,
  '',
  '| Cell | Class | Shipped | Geometric mean | Lower bound | Reproduced | Log sd | Mean needed for 0.9 | Chance to pass at parity | p95 today (s) | p95 shipped (s) | Screen arm against today (gm / lower) |',
  '|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|---|',
  ...controls.map((/** @type {any} */ c) => `| ${c.cell} | ${c.class} | ${c.shipped} | ${r4(c.reproduced.geoMean)} | ${r4(c.reproduced.lower)} | ${c.same} | ${r4(c.logSd)} | ${r4(c.gmNeededFor09)} | ${r4(c.passChanceAtParity)} | ${r4(c.p95TodayS)} | ${r4(c.p95ShippedS)} | ${c.screenAgainstToday === null ? '-' : `${r4(c.screenAgainstToday.geoMean)} / ${r4(c.screenAgainstToday.lower)}`} |`),
  '',
  '## 26x26 Nightmare per seed (capped T10, s)',
  '',
  '| Rep | Today (log-link) | Shipped (fr-frozen-none) | Ratio | Screen (fr-frozen) | Today over screen |',
  '|---:|---:|---:|---:|---:|---:|',
  ...c26.perSeed.map((/** @type {any} */ p) => `| ${p.rep} | ${r4(p.todayMs / 1000)} | ${r4(p.shippedMs / 1000)} | ${r4(p.ratio)} | ${p.screenMs === null ? '-' : r4(p.screenMs / 1000)} | ${p.screenRatio === null ? '-' : r4(p.screenRatio)} |`),
  '',
  `Below 1: ${result.cell26.belowOne} of 20; below 0.8: ${result.cell26.below08}; above 1.2: ${result.cell26.above12}. Without the two slowest seeds (descriptive only) the geometric mean is ${r4(result.cell26.withoutSlowestTwo)}.`,
].join('\n');
writeFileSync(join(ROOT, HERE, 's06-numbers.md'), crlf(md), 'utf8');
process.stdout.write(`s06-numbers: ${controls.length} controls, all reproduced: ${controls.every((/** @type {any} */ c) => c.same)}; inputs ${inputs.length}\n`);
for (const c of controls) {
  process.stdout.write(`  ${c.cell}: gm ${r4(c.reproduced.geoMean)} lower ${r4(c.reproduced.lower)} (${c.reproduced.pass ? 'pass' : 'FAIL'}); log sd ${r4(c.logSd)}; needed ${r4(c.gmNeededFor09)}; pass chance at parity ${r4(c.passChanceAtParity)}; p95 today ${r4(c.p95TodayS)} s, shipped ${r4(c.p95ShippedS)} s; screen vs today ${c.screenAgainstToday === null ? '-' : `${r4(c.screenAgainstToday.geoMean)}/${r4(c.screenAgainstToday.lower)}`}\n`);
}
process.stdout.write(`  26x26 slowest: ${result.cell26.slowest.map((/** @type {any} */ p) => `rep ${p.rep} ${r4(p.ratio)} (${r4(p.todayMs / 1000)} s vs ${r4(p.shippedMs / 1000)} s)`).join('; ')}\n`);
process.stdout.write(`  26x26 fastest: ${result.cell26.fastest.map((/** @type {any} */ p) => `rep ${p.rep} ${r4(p.ratio)}`).join('; ')}\n`);
process.stdout.write(`  s01 W2: ${JSON.stringify(result.s01)}\n`);
