// @ts-check
// SA-Opus, round 1: N-V4-14 at validation size, an indication: how often would T09c's work rule decide a class with 20
// seeds per cell if the 20 validation requests of a cell looked like its five pilot requests? Paired bootstrap of the
// pilot rows (the same drawn rep for both arms of a cell), 4,000 draws, mulberry32 seed 20261123. Also the faster rule's
// point conditions (geo >= 1.15, every cell >= 1.0) on the same draws. Read-only, unlocked.
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\s2-boot.mjs
// Writes s2-boot.json and s2-boot.md beside this script.
import { join } from 'node:path';

import { armShards, CAP_MS, f, HERE, QUANTITY, rowJournal, V, writeCrlf } from './s2-lib.mjs';

/** @type {Record<string, Record<string, Record<number, { lo: number, hi: number, acc: number, t10: number }>>>} */
const rows = {};
for (const arm of ['fr-screen', 'fr-none']) {
  rows[arm] = {};
  for (const s of armShards(arm)) {
    rows[arm][s.cell] = {};
    for (const r of s.rows) {
      const j = rowJournal(arm, s.shard, r.rowKey);
      const l = V.rowLedger(j.lines, j.linkLines);
      rows[arm][s.cell][r.rep] = { lo: l.lo, hi: l.hi, acc: r.run.acceptedCount, t10: V.cappedT10(r.run, { quantity: QUANTITY, capMs: CAP_MS }) };
    }
  }
}
const CLASSES = {
  'n-mid 196-324 piloted (14x14, 15x15b10, 16x16, 15x20)': ['14x14-nightmare', '15x15b10-nightmare', '16x16-nightmare', '15x20-nightmare'],
  'n-mid-a 196-256 (14x14, 15x15b10, 16x16)': ['14x14-nightmare', '15x15b10-nightmare', '16x16-nightmare'],
  'n-mid-b 196-215 (14x14, 15x15b10)': ['14x14-nightmare', '15x15b10-nightmare'],
  '16x16 alone': ['16x16-nightmare'],
  '15x20 alone': ['15x20-nightmare'],
  'n-large (26x26 only piloted)': ['26x26-nightmare'],
  'n-small (10x10, 12x12)': ['10x10-nightmare', '12x12-nightmare'],
  'hell-1 (26x26 only piloted, 380 M)': ['26x26-hell-1'],
};
const mulberry32 = V.mulberry32;
const DRAWS = 4000;
const N = 20;
const md = ['# N-V4-14 at validation size: a paired bootstrap of the pilot rows (SA-Opus scratch, round 1)', '',
  'Each draw takes 20 reps per cell with replacement from the five pilot reps (the same rep for `fr-screen` and `fr-none`),',
  'sums the ledgers\' lo and hi and the accepted puzzles per arm over the class, and applies T09c\'s work rule; the faster',
  'columns apply the point conditions of the faster rule (class geo >= 1.15 and every cell geo >= 1.0) to the same draws.',
  '4,000 draws, `mulberry32(20261123)`. Five pilot rows per cell are thin: an indication of decidability, not a forecast.', '',
  '| Class (cells) | work pass | work unknown | work worse | faster point conditions met |', '|---|---:|---:|---:|---:|'];
/** @type {any} */
const out = {};
for (const [name, cells] of Object.entries(CLASSES)) {
  const rand = mulberry32(20261123);
  let pass = 0;
  let unknown = 0;
  let worse = 0;
  let fast = 0;
  for (let d = 0; d < DRAWS; d += 1) {
    const sum = { s: { lo: 0, hi: 0, acc: 0 }, n: { lo: 0, hi: 0, acc: 0 } };
    const logs = [];
    let cellOk = true;
    for (const cell of cells) {
      const cl = [];
      for (let i = 0; i < N; i += 1) {
        const rep = Math.floor(rand() * 5);
        const a = rows['fr-screen'][cell][rep];
        const b = rows['fr-none'][cell][rep];
        sum.s.lo += a.lo; sum.s.hi += a.hi; sum.s.acc += a.acc;
        sum.n.lo += b.lo; sum.n.hi += b.hi; sum.n.acc += b.acc;
        cl.push(Math.log(b.t10 / a.t10));
      }
      const cg = Math.exp(cl.reduce((x, y) => x + y, 0) / cl.length);
      if (cg < 1.0) cellOk = false;
      logs.push(...cl);
    }
    const sHi = sum.s.hi / sum.s.acc;
    const sLo = sum.s.lo / sum.s.acc;
    const nLo = sum.n.lo / sum.n.acc;
    const nHi = sum.n.hi / sum.n.acc;
    if (sHi <= nLo) pass += 1;
    else if (sLo > nHi) worse += 1;
    else unknown += 1;
    const geo = Math.exp(logs.reduce((x, y) => x + y, 0) / logs.length);
    if (geo >= 1.15 && cellOk) fast += 1;
  }
  out[name] = { cells, pass: pass / DRAWS, unknown: unknown / DRAWS, worse: worse / DRAWS, faster: fast / DRAWS };
  md.push(`| ${name} | ${f(pass / DRAWS, 3)} | ${f(unknown / DRAWS, 3)} | ${f(worse / DRAWS, 3)} | ${f(fast / DRAWS, 3)} |`);
}
writeCrlf(join(HERE, 's2-boot.md'), md.join('\n'));
writeCrlf(join(HERE, 's2-boot.json'), JSON.stringify(out, null, 1));
process.stdout.write(md.join('\n') + '\n');
