// @ts-check
// SA-Opus, T16 step 6 (stages 2 to 4 pack): the 26x26 Nightmare control re-read with the final record's P5 pair, for
// information only and never a verdict. On the 20 validation seeds (reps 20-39) it compares, with the harness's own
// recipe (verdicts.mjs cappedT10 and noRegression; quantity 10, cap 120 s, 10,000 resamples, seed 20261116):
// today's arm (log-link) against the shipped arm (fr-frozen-none, the recorded control, which must reproduce
// verdicts.json), today's arm against the shipped arm's uncapped twin (fr-frozen-none-uncapped, V4-S4C: no call budget,
// no set-attempt bound, no live deadline) and the twin against the shipped arm (what P5's limits and the live deadline
// cost or saved per seed), with the set stage of the slowest seeds on each arm.
// Unlocked: it reads records only; it writes its outputs beside itself.
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\t16-cell26.mjs
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cappedT10, geoMean, ingestRow, noRegression } from '../../../../tools/ig-proto/verdicts.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const HERE = 'docs/improve-generating-stages-2-4/evidence/sa-opus';
const PUB = 'docs/improve-generating/evidence/frozen';
const CELL = '26x26-nightmare';
/** @type {{ path: string, sha256Lf: string }[]} */
const inputs = [];
const sha256 = (/** @type {string} */ t) => createHash('sha256').update(t, 'utf8').digest('hex');
const json = (/** @type {string} */ p) => {
  const text = readFileSync(join(ROOT, p), 'utf8');
  inputs.push({ path: p, sha256Lf: sha256(text.replace(/\r\n/g, '\n')) });
  return JSON.parse(text);
};
const crlf = (/** @type {string} */ t) => `${t.replace(/\r?\n/g, '\r\n').replace(/[ \t]+\r\n/g, '\r\n').replace(/(\r\n)*$/, '')}\r\n`;
const r4 = (/** @type {number} */ x) => Math.round(x * 10000) / 10000;
const s1 = (/** @type {number} */ ms) => Math.round(ms / 100) / 10;

const manifest = json('tools/ig-proto/plans/verdicts/V4-S4F.verdict-manifest.json');
const final = json(`${PUB}/V4-S4F/verdicts.json`);
const { quantity, capMs, resamples, resampleSeed, validationReps: reps } = manifest;
const opts = { quantity, capMs };
const stat = { resamples, resampleSeed };

/** @param {string} task @param {string} arm @returns {Map<number, any>} */
function rowsOf(task, arm) {
  const doc = json(`${PUB}/${task}/${arm}/val-${CELL}.runs.json`);
  /** @type {Map<number, any>} */
  const out = new Map();
  for (const row of doc.rows) {
    if (ingestRow(row, { quantity }).status === 'valid' && reps.includes(row.rep)) {
      out.set(row.rep, row.run);
    }
  }
  return out;
}
const arms = {
  today: rowsOf('V4-S4', 'log-link'),
  shipped: rowsOf('V4-S4', 'fr-frozen-none'),
  uncapped: rowsOf('V4-S4C', 'fr-frozen-none-uncapped'),
  screen: rowsOf('V4-S4', 'fr-frozen'),
};
const t10 = (/** @type {Map<number, any>} */ m, /** @type {number} */ rep) => cappedT10(m.get(rep), opts);
const perSeed = reps.map((/** @type {number} */ rep) => ({
  rep,
  todayS: s1(t10(arms.today, rep)), shippedS: s1(t10(arms.shipped, rep)), uncappedS: s1(t10(arms.uncapped, rep)), screenS: s1(t10(arms.screen, rep)),
  setTodayS: s1(arms.today.get(rep).igSetMs ?? NaN), setShippedS: s1(arms.shipped.get(rep).igSetMs), setUncappedS: s1(arms.uncapped.get(rep).igSetMs),
  todayOverShipped: r4(t10(arms.today, rep) / t10(arms.shipped, rep)),
  todayOverUncapped: r4(t10(arms.today, rep) / t10(arms.uncapped, rep)),
  uncappedOverShipped: r4(t10(arms.uncapped, rep) / t10(arms.shipped, rep)),
}));
/** @param {(rep: number) => number} f */
const nr = (f) => {
  const x = noRegression(reps.map(f), reps, stat);
  return { geoMean: r4(x.geoMean), lower: r4(x.lower), atLeast09: x.pass };
};
const recorded = final.controls.find((/** @type {any} */ c) => c.cell === CELL);
const shippedNr = nr((rep) => t10(arms.today, rep) / t10(arms.shipped, rep));
const result = {
  script: `${HERE}/t16-cell26.mjs`, cell: CELL, manifest: { quantity, capMs, resamples, resampleSeed, reps },
  recorded: { shipped: recorded.shipped, gate: recorded.gate?.noRegression ?? recorded.gate },
  reproduced: shippedNr,
  informationOnly: {
    todayOverUncapped: nr((rep) => t10(arms.today, rep) / t10(arms.uncapped, rep)),
    uncappedOverShipped: { geoMean: r4(geoMean(reps.map((/** @type {number} */ rep) => t10(arms.uncapped, rep) / t10(arms.shipped, rep)))) },
    todayOverScreen: nr((rep) => t10(arms.today, rep) / t10(arms.screen, rep)),
  },
  p5: final.p5.find((/** @type {any} */ p) => p.cell === CELL),
  perSeed,
  inputs: { entries: inputs.length, sha256Lf: sha256(JSON.stringify(inputs)), files: inputs },
};
writeFileSync(join(ROOT, HERE, 't16-cell26.json'), crlf(JSON.stringify(result, null, 2)), 'utf8');
const md = [
  '# T16: 26x26 Nightmare re-read with its P5 pair (information only, never a verdict)',
  '',
  `Recorded control (V4-S4F): ${JSON.stringify(result.recorded.gate)}; reproduced: geometric mean ${shippedNr.geoMean}, lower bound ${shippedNr.lower}.`,
  `Today over the uncapped twin: ${JSON.stringify(result.informationOnly.todayOverUncapped)}; uncapped over shipped (geometric mean): ${result.informationOnly.uncappedOverShipped.geoMean}; today over the screen arm: ${JSON.stringify(result.informationOnly.todayOverScreen)}.`,
  `P5 pair: ${JSON.stringify(result.p5)}.`,
  '',
  '| Rep | Capped T10 today / shipped / uncapped / screen (s) | Set stage today / shipped / uncapped (s) | Today over shipped | Today over uncapped | Uncapped over shipped |',
  '|---:|---|---|---:|---:|---:|',
  ...perSeed.map((p) => `| ${p.rep} | ${p.todayS} / ${p.shippedS} / ${p.uncappedS} / ${p.screenS} | ${p.setTodayS} / ${p.setShippedS} / ${p.setUncappedS} | ${p.todayOverShipped} | ${p.todayOverUncapped} | ${p.uncappedOverShipped} |`),
].join('\n');
writeFileSync(join(ROOT, HERE, 't16-cell26.md'), crlf(md), 'utf8');
process.stdout.write(`t16-cell26: ${inputs.length} files (sha256 of the index ${result.inputs.sha256Lf}); recorded ${JSON.stringify(result.recorded.gate)}; reproduced ${JSON.stringify(shippedNr)}\n`);
process.stdout.write(`  today/uncapped ${JSON.stringify(result.informationOnly.todayOverUncapped)}; uncapped/shipped ${JSON.stringify(result.informationOnly.uncappedOverShipped)}; today/screen ${JSON.stringify(result.informationOnly.todayOverScreen)}\n`);
for (const p of perSeed) {
  process.stdout.write(`  ${JSON.stringify(p)}\n`);
}
