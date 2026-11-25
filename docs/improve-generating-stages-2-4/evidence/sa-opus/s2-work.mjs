// @ts-check
// SA-Opus, round 1: N-V4-14, the width of the work intervals of rule (c5) on V4-S2's journals (read-only, unlocked).
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\s2-work.mjs
// Per arm and cell, and pooled per candidate class: T09c's `workRule` (screen arm fr-screen against fr-none), the
// interval per accepted puzzle and where its width comes from (the open primitives of terminated calls: kind, stage,
// bound against the median completed work of the same kind). Also the class statistics of plan 5.2 on the pilot
// seeds (indicative only: five fitting seeds, not a validation). Writes s2-work.json and s2-work.md beside it.
import { join } from 'node:path';

import { armShards, callsOf, CAP_MS, f, HERE, med, QUANTITY, rowJournal, V, writeCrlf } from './s2-lib.mjs';

const REPS = [0, 1, 2, 3, 4];
const G = 1e9;
/** @type {Record<string, Record<string, { rows: any[], ledgers: Record<string, any>, open: any[], done: Record<string, number[]> }>>} */
const data = {};
for (const arm of ['fr-screen', 'fr-none', 'fr-base']) {
  data[arm] = {};
  for (const s of armShards(arm)) {
    const ledgers = {};
    const open = [];
    /** @type {Record<string, number[]>} */
    const done = { screen: [], rate: [], count: [] };
    for (const r of s.rows) {
      const j = rowJournal(arm, s.shard, r.rowKey);
      const ledger = V.rowLedger(j.lines, j.linkLines);
      ledgers[r.rowKey] = ledger;
      // The open primitive of each call without an end line: its last begin line without a completion.
      for (const [id, c] of callsOf(j.lines)) {
        const completions = c.ps.length + c.counts.length;
        for (let i = 0; i < c.begins.length; i += 1) {
          const b = c.begins[i];
          if (i < completions) {
            // completed primitive i: its reported units
            const kind = b.kind;
            if (kind === 'count') continue;
          }
        }
        // completed units by kind, pairing begins with completions in order
        let pi = 0;
        let ci = 0;
        for (const b of c.begins) {
          if (b.kind === 'count') {
            if (ci < c.counts.length) done.count.push(c.counts[ci++].units);
          } else if (pi < c.ps.length) {
            const t = c.ps[pi++].tuple;
            done[b.kind].push(t[4] + t[5]);
          }
        }
        if (c.end === null && c.begins.length > c.ps.length + c.counts.length) {
          const b = c.begins[c.begins.length - 1];
          open.push({ row: r.rowKey, call: id, stage: c.start?.stage ?? null, kind: b.kind, bound: b.bound, K: c.start?.K, phases: c.phases.slice(-1)[0] ?? null });
        }
      }
    }
    data[arm][s.cell] = { rows: s.rows, ledgers, open, done };
  }
}

/** @param {string} arm @param {string[]} cells */
function rowsWithLedgers(arm, cells) {
  const out = [];
  for (const cell of cells) {
    const d = data[arm][cell];
    if (!d) return null;
    for (const r of d.rows) out.push({ ingested: r, ledger: d.ledgers[r.rowKey] });
  }
  return out;
}

const CLASSES = {
  'n-small (10x10, 12x12)': ['10x10-nightmare', '12x12-nightmare'],
  'n-mid (14x14, 15x15b10, 16x16, 15x20)': ['14x14-nightmare', '15x15b10-nightmare', '16x16-nightmare', '15x20-nightmare'],
  'n-mid-a (14x14, 15x15b10, 16x16)': ['14x14-nightmare', '15x15b10-nightmare', '16x16-nightmare'],
  'n-mid-b (14x14, 15x15b10)': ['14x14-nightmare', '15x15b10-nightmare'],
  'n-large (26x26)': ['26x26-nightmare'],
  'hell-1 (26x26)': ['26x26-hell-1'],
};
for (const cell of ['10x10-nightmare', '12x12-nightmare', '14x14-nightmare', '15x15b10-nightmare', '16x16-nightmare', '15x20-nightmare', '26x26-nightmare', '26x26-hell-1']) {
  CLASSES[`cell ${cell}`] = [cell];
}

/** @type {any} */
const out = { classes: {}, open: {} };
const md = ['# V4-S2: the work condition of rule (c5) on the pilot journals (SA-Opus scratch, round 1)', '',
  'Computed by `s2-work.mjs` with T09c\'s `rowLedger` and `workRule` and T09b\'s `pairRows`, `ratiosOf`, `matchedSets`,',
  '`clueRule` and `fasterRule` (10,000 resamples, seed 20261116) over the pilot reps 0 to 4 of `fr-screen` (screen arm) and',
  '`fr-none` (no-screen arm). Five fitting seeds: an indication of decidability, never a verdict. Work in G units per accepted puzzle.', '',
  '| Class (cells) | screen lo | screen hi | no-screen lo | no-screen hi | work rule | screen width | no-screen width | faster geo | lower 10 % | min cell geo | clue n | median d | moved >= 2 |',
  '|---|---:|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|'];
for (const [name, cells] of Object.entries(CLASSES)) {
  const sr = rowsWithLedgers('fr-screen', cells);
  const nr = rowsWithLedgers('fr-none', cells);
  if (!sr || !nr) continue;
  const work = V.workRule(sr, nr);
  /** @type {Record<string, (number|null)[]>} */
  const ratiosByCell = {};
  const matched = [];
  for (const cell of cells) {
    const p = V.pairRows(data['fr-screen'][cell].rows, data['fr-none'][cell].rows, REPS);
    ratiosByCell[cell] = V.ratiosOf(p.pairs, REPS, { quantity: QUANTITY, capMs: CAP_MS });
    matched.push(...V.matchedSets(p.pairs).matched);
  }
  const faster = V.fasterRule(ratiosByCell, REPS, { resamples: 10000, resampleSeed: 20261116 });
  const clue = V.clueRule(matched);
  out.classes[name] = { cells, work, faster, clue };
  md.push(`| ${name} | ${f(work.screen.loRatio / G)} | ${f(work.screen.hiRatio / G)} | ${f(work.noScreen.loRatio / G)} | ${f(work.noScreen.hiRatio / G)} | ${work.verdict} | ${f((work.screen.hiRatio - work.screen.loRatio) / G)} | ${f((work.noScreen.hiRatio - work.noScreen.loRatio) / G)} | ${f(faster.geoMean, 3)} | ${f(faster.lower, 3)} | ${f(Math.min(...Object.values(faster.cellGeoMeans)), 3)} | ${clue.n} | ${f(clue.medianDiff, 2)} | ${clue.moved2} |`);
}

md.push('', '## Where the width comes from: the open primitives of terminated calls', '',
  'One line per arm and cell: the open primitives (a `begin` line without its completion in a call closed by a confirmed',
  'worker termination), by kind and stage, their summed bound, and the median completed units of the same kind in the same',
  'arm and cell; "bound / median done" says how loose the proved bound is against what such a primitive usually charges.', '',
  '| Arm | Cell | open | by kind | by stage | sum of bounds G | median bound G | median done (same kind) G | bound / median done | width G (hi - lo) |',
  '|---|---|---:|---|---|---:|---:|---:|---:|---:|');
for (const [arm, cells] of Object.entries(data)) {
  for (const [cell, d] of Object.entries(cells)) {
    const byKind = {};
    const byStage = {};
    for (const o of d.open) {
      byKind[o.kind] = (byKind[o.kind] ?? 0) + 1;
      byStage[o.stage] = (byStage[o.stage] ?? 0) + 1;
    }
    const sum = d.open.reduce((s, o) => s + o.bound, 0);
    const kinds = Object.keys(byKind);
    const mainKind = kinds.sort((a, b) => byKind[b] - byKind[a])[0];
    const medDone = mainKind ? med(d.done[mainKind]) : null;
    const medBound = med(d.open.map((o) => o.bound));
    const width = Object.values(d.ledgers).reduce((s, l) => s + (l.hi - l.lo), 0);
    out.open[`${arm}/${cell}`] = { open: d.open.length, byKind, byStage, sum, medBound, medDone, width, mainKind };
    md.push(`| ${arm} | ${cell} | ${d.open.length} | ${Object.entries(byKind).map(([k, n]) => `${k} ${n}`).join(', ')} | ${Object.entries(byStage).map(([k, n]) => `${k} ${n}`).join(', ')} | ${f(sum / G, 1)} | ${f(medBound / G, 2)} | ${f(medDone / G, 3)} (${mainKind}) | ${f(medBound / medDone, 1)} | ${f(width / G, 1)} |`);
  }
}
writeCrlf(join(HERE, 's2-work.md'), md.join('\n'));
writeCrlf(join(HERE, 's2-work.json'), JSON.stringify(out, null, 1));
process.stdout.write(md.join('\n') + '\n');
