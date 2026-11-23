// @ts-check
// SA-Opus, round 1: the stage-2 mechanism comparisons under plan 5.2's resampling recipe (read-only, unlocked).
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\s2-gains.mjs
// For each comparison, T09b's `ratiosOf` (capped T10 of the reference arm over the mechanism arm, per seed; above 1 the
// mechanism is faster) and `fasterRule` (geometric mean over every (cell, seed) pair, the 10th percentile of 10,000
// resamples of the seeds with seed 20261116, each cell's own geometric mean). Five fitting seeds per cell: a reading of
// the pilots, not a verdict. Writes s2-gains.md beside this script.
import { join } from 'node:path';

import { armShards, CAP_MS, f, HERE, QUANTITY, V, writeCrlf } from './s2-lib.mjs';

const REPS = [0, 1, 2, 3, 4];
/** @type {Record<string, Record<string, any[]>>} */
const rows = {};
for (const arm of ['fr-base', 'fr-screen', 'fr-none', 'fr-close', 'fr-c4', 'fr-ps', 'fr-p5']) {
  rows[arm] = {};
  for (const s of armShards(arm)) rows[arm][s.cell] = s.rows;
}
const COMPARISONS = [
  { name: 'per-set prior (fr-ps against fr-base)', mech: 'fr-ps', ref: 'fr-base', cells: ['26x26-hell-1', '20x20-hell-1'] },
  { name: '(c4) (fr-c4 against fr-base)', mech: 'fr-c4', ref: 'fr-base', cells: ['14x14-nightmare', '26x26-nightmare'] },
  { name: 'bracket close where it can act (fr-close against fr-base)', mech: 'fr-close', ref: 'fr-base', cells: ['14x14-nightmare'] },
  { name: 'bracket close, all three cells', mech: 'fr-close', ref: 'fr-base', cells: ['12x12-nightmare', '14x14-nightmare', '26x26-hell-1'] },
  { name: 'P5 at 2 G (fr-p5 against fr-base)', mech: 'fr-p5', ref: 'fr-base', cells: ['14x14-nightmare', '26x26-hell-1', '20x20-hell-1'] },
  { name: 'P5 at 2 G, Hell 1 only', mech: 'fr-p5', ref: 'fr-base', cells: ['26x26-hell-1', '20x20-hell-1'] },
  { name: 'same configuration (fr-none against fr-base)', mech: 'fr-none', ref: 'fr-base', cells: ['12x12-nightmare', '26x26-nightmare', '26x26-hell-1'] },
];
const md = ['# V4-S2: mechanism gains under the plan\'s resampling recipe (SA-Opus scratch, round 1)', '',
  'Ratio per seed = capped T10 of the reference arm over the mechanism arm (above 1: the mechanism is faster). `geo` and',
  '`lower 10 %` are T09b\'s `fasterRule` over every (cell, seed) pair with 10,000 resamples (seed 20261116); five fitting',
  'seeds per cell, a reading only.', '',
  '| Comparison | Cells | geo | lower 10 % | cell geos |', '|---|---|---:|---:|---|'];
for (const c of COMPARISONS) {
  /** @type {Record<string, (number|null)[]>} */
  const byCell = {};
  for (const cell of c.cells) {
    const p = V.pairRows(rows[c.mech][cell], rows[c.ref][cell], REPS);
    // pairRows(A, B): ratiosOf gives cappedT10(B) / cappedT10(A), the reference over the mechanism.
    byCell[cell] = V.ratiosOf(p.pairs, REPS, { quantity: QUANTITY, capMs: CAP_MS });
  }
  const r = V.fasterRule(byCell, REPS, { resamples: 10000, resampleSeed: 20261116 });
  md.push(`| ${c.name} | ${c.cells.join(', ')} | ${f(r.geoMean, 3)} | ${f(r.lower, 3)} | ${Object.entries(r.cellGeoMeans).map(([k, v]) => `${k} ${f(/** @type {number} */ (v), 3)}`).join('; ')} |`);
}
writeCrlf(join(HERE, 's2-gains.md'), md.join('\n'));
process.stdout.write(md.join('\n') + '\n');
