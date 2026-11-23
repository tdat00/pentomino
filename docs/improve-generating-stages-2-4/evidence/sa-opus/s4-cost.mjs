// @ts-check
// SA-Opus, round 1: the realistic cost of the stage-4 plans from V4-S2's measured times (read-only, unlocked).
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\s4-cost.mjs
// 1. The per-row overhead of V4-S2's row steps: invocation node seconds against the published response times.
// 2. The groups of the activated collection (T11a's `expandMatrix`, both conditional Hell 1 boards activated by their pilots)
//    re-simulated with T11b's own `simulateRows`, with row times from the stage-2 pilots where a cell was piloted and from
//    T11b's reference (MP12b1's median response, `refS`, x the stage-1 factor, without the 1.25 projection factor) elsewhere.
//    An estimate for the owner beside the formal guard, never a price or a bound.
// Writes s4-cost.json and s4-cost.md beside this script.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { armShards, f, HERE, med, RAW, ROOT, writeCrlf } from './s2-lib.mjs';

const M = await import(pathToFileURL(join(ROOT, 'tools', 'ig-proto', 'manifest.mjs')).href);
const P = await import(pathToFileURL(join(ROOT, 'tools', 'ig-proto', 'lib', 'paths.mjs')).href);

// 1. Per-row overhead in V4-S2.
const inv = readFileSync(join(RAW, 'invocations.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const resp = {};
for (const arm of ['fr-base', 'fr-screen', 'fr-none', 'fr-close', 'fr-c4', 'fr-ps', 'fr-p5']) {
  for (const s of armShards(arm)) resp[`rows-${arm}-${s.shard}`] = s.rows.map((r) => r.run.responseMs / 1000);
}
const overheads = [];
const ohRows = [];
for (const l of inv) {
  const r = resp[l.step];
  if (!r) continue;
  const sum = r.reduce((a, b) => a + b, 0);
  const oh = (l.nodeSeconds - sum) / r.length;
  overheads.push(oh);
  ohRows.push({ step: l.step, rows: r.length, nodeS: l.nodeSeconds, responseSumS: sum, overheadPerRowS: oh });
}
const OVERHEAD_S = med(overheads);

// 2. Measured mean response per (arm, cell) in V4-S2.
/** @type {Record<string, Record<string, number>>} */
const mean = {};
for (const arm of ['fr-base', 'fr-screen', 'fr-none', 'fr-ps', 'fr-p5']) {
  mean[arm] = {};
  for (const s of armShards(arm)) mean[arm][s.cell] = s.rows.reduce((a, r) => a + r.run.responseMs / 1000, 0) / s.rows.length;
}
// The configuration each twin is assumed to have on a piloted cell (SA-Opus's freeze proposal, section 5 of the analysis):
// screened at 190 M on 14x14, 15x15b10 and 16x16 Nightmare; no screen elsewhere; Hell 1 on the per-set prior.
const SCREENED = new Set(['14x14-nightmare', '15x15b10-nightmare', '16x16-nightmare']);
/** @param {string} arm @param {string} cell @returns {{ s: number, source: string } | null} */
function measured(arm, cell) {
  const hell = cell.endsWith('hell-1');
  if (arm === 'fr-frozen' || arm === 'fr-frozen-uncapped') {
    if (hell) return mean['fr-ps'][cell] !== undefined ? { s: mean['fr-ps'][cell], source: 'fr-ps' } : mean['fr-base'][cell] !== undefined ? { s: mean['fr-base'][cell], source: 'fr-base' } : null;
    if (SCREENED.has(cell)) return mean['fr-screen'][cell] !== undefined ? { s: mean['fr-screen'][cell], source: 'fr-screen' } : null;
    return mean['fr-none'][cell] !== undefined ? { s: mean['fr-none'][cell], source: 'fr-none' } : null;
  }
  if (arm === 'fr-frozen-none' || arm === 'fr-frozen-none-uncapped') {
    if (hell) return mean['fr-ps'][cell] !== undefined ? { s: mean['fr-ps'][cell], source: 'fr-ps' } : mean['fr-base'][cell] !== undefined ? { s: mean['fr-base'][cell], source: 'fr-base' } : null;
    return mean['fr-none'][cell] !== undefined ? { s: mean['fr-none'][cell], source: 'fr-none' } : null;
  }
  return null;
}

const data = M.matrixData();
const controls = M.controlsFrom(P.mp12b1Report, data.cells.failingNightmare);
const expansion = M.expandMatrix(data, { controls, secondValidationBoards: [] });
const factor = M.factor();
const QUIET = { idle: 15, full: 45 };
/** @type {any[]} */
const rows = [];
const totals = { 'V4-S4': { node: 0, inv: 0, rows: 0 }, 'V4-S4C': { node: 0, inv: 0, rows: 0 } };
for (const g of expansion.groups) {
  const isInitial = g.collection === 'initial';
  const isConditional = g.collection === 'conditional';
  if (!(isInitial || isConditional) || g.stage !== 4) continue;
  let arm = g.arm;
  if (arm === 'shipped-uncapped') {
    // Assumed shipped arm: the screen twin on the screened cells, the no-screen twin elsewhere.
    arm = SCREENED.has(g.cell) ? 'fr-frozen-uncapped' : 'fr-frozen-none-uncapped';
  }
  let rowS;
  let source;
  const m = measured(arm, g.cell);
  if (m !== null) {
    rowS = Math.min(m.s, g.rowLimitS === 130 ? 120 : m.s) + OVERHEAD_S;
    source = `${m.source} pilot mean`;
  } else {
    const ref = M.refS(g.cell);
    rowS = ref === null ? g.rowLimitS : factor * ref + OVERHEAD_S;
    source = ref === null ? 'row limit (no reference)' : 'MP12b1 refS x factor';
  }
  const sim = M.simulateRows({ rows: g.rows, rowS: Math.max(rowS, 1), rowLimitS: g.rowLimitS });
  const plan = g.task;
  if (totals[plan]) {
    totals[plan].node += sim.nodeS;
    totals[plan].inv += sim.invocations.length;
    totals[plan].rows += g.rows;
  }
  rows.push({ id: g.id, collection: g.collection, arm, cell: g.cell, rows: g.rows, rowLimitS: g.rowLimitS, rowS, source,
    nodeS: sim.nodeS, invocations: sim.invocations.length, censored: sim.censored });
}
// The four P-1 passes of the stage-4 arms: V4-S2's measured P-1 passes of the fr-* arms (counted seconds less quiet).
const p1 = inv.filter((l) => l.step.startsWith('parity-fr-') && l.step !== 'parity-fr-p5').map((l) => l.nodeSeconds);
const p1NodeS = 4 * (p1.reduce((a, b) => a + b, 0) / p1.length);
totals['V4-S4'].node += p1NodeS;
totals['V4-S4'].inv += 4;
const summary = {};
for (const [plan, t] of Object.entries(totals)) {
  summary[plan] = {
    rows: t.rows, invocations: t.inv, nodeS: t.node,
    countedIdleMin: (t.node + QUIET.idle * t.inv) / 60,
    countedFullMin: (t.node + QUIET.full * t.inv) / 60,
  };
}
// The supplementary pilot proposed in question Q3: fr-none on the eight controls without a stage-2 pilot, reps 0 to 4, one
// row step per cell at the default row limit (260 s), priced by T11b's rule (formal) and at refS x factor (realistic).
const SUPPLEMENT = ['3x29-nightmare', '18x18-nightmare', '18x20-nightmare', '20x20-nightmare', '20x21-nightmare', '32x15-nightmare',
  '22x22-nightmare', '24x24-nightmare'];
const supplement = { formalProjectS: 0, formalInv: 0, realisticNodeS: 0, realisticInv: 0, cells: [] };
for (const cell of SUPPLEMENT) {
  const ref = M.refS(cell);
  const formal = M.simulateRows({ rows: 5, rowS: M.projectedRowS({ refS: ref, factor, rowLimitS: 260 }), rowLimitS: 260 });
  const real = M.simulateRows({ rows: 5, rowS: factor * ref + OVERHEAD_S, rowLimitS: 260 });
  supplement.formalProjectS += formal.nodeS;
  supplement.formalInv += formal.invocations.length;
  supplement.realisticNodeS += real.nodeS;
  supplement.realisticInv += real.invocations.length;
  supplement.cells.push({ cell, refS: ref, formalNodeS: formal.nodeS, realisticNodeS: real.nodeS });
}
const supplementSummary = {
  formalCountedMin: (supplement.formalProjectS + 45 * supplement.formalInv) / 60,
  formalGuardMin: 1.25 * (supplement.formalProjectS + 45 * supplement.formalInv) / 60,
  realisticIdleMin: (supplement.realisticNodeS + 15 * supplement.realisticInv) / 60,
  realisticFullMin: (supplement.realisticNodeS + 45 * supplement.realisticInv) / 60,
};
const out = { overheadPerRowS: OVERHEAD_S, overheadRows: ohRows, factor, controls, p1NodeS, groups: rows, summary, supplement, supplementSummary };
const md = ['# Stage 4 at the stage-2 measured times (SA-Opus scratch, round 1)', '',
  'Computed by `s4-cost.mjs`: T11a\'s `expandMatrix` (controls by `controlsFrom`, both conditional Hell 1 boards activated) and',
  'T11b\'s `simulateRows`, with each row\'s time from the stage-2 pilot mean response of the arm that the freeze proposal',
  'gives the twin (plus the measured per-row overhead) where the cell was piloted, else T11b\'s `refS` x the stage-1 factor',
  'without the 1.25 projection factor. An estimate beside the formal guard, never a price.', '',
  `Per-row overhead (median over V4-S2's ${overheads.length} row steps): ${f(OVERHEAD_S, 2)} s. Stage-1 factor: ${f(factor, 4)}.`,
  `The four P-1 passes: ${f(p1NodeS, 0)} node s (the mean of V4-S2's six passing fr-* passes, times four).`, '',
  '| Plan | Rows | Invocations | Node s | Counted min at a 15-s quiet | Counted min at a 45-s quiet |',
  '|---|---:|---:|---:|---:|---:|'];
for (const [plan, s] of Object.entries(summary)) {
  md.push(`| ${plan} | ${s.rows} | ${s.invocations} | ${f(s.nodeS, 0)} | ${f(s.countedIdleMin, 1)} | ${f(s.countedFullMin, 1)} |`);
}
md.push('', `The supplementary pilot of question Q3 (fr-none on ${SUPPLEMENT.length} controls, reps 0 to 4): formal (T11b's projection, a 45-s quiet) ${f(supplementSummary.formalCountedMin, 1)} counted min, guard ${f(supplementSummary.formalGuardMin, 1)}; realistic (refS x factor) ${f(supplementSummary.realisticIdleMin, 1)} at a 15-s quiet, ${f(supplementSummary.realisticFullMin, 1)} at 45 s, in ${supplement.realisticInv} invocations.`);
md.push('', '| Group | Collection | Arm (assumed) | Rows | Row limit | Row s | Source | Node s | Invocations |', '|---|---|---|---:|---:|---:|---|---:|---:|');
for (const r of rows) md.push(`| ${r.id} | ${r.collection} | ${r.arm} | ${r.rows} | ${r.rowLimitS} | ${f(r.rowS, 1)} | ${r.source} | ${f(r.nodeS, 0)} | ${r.invocations} |`);
writeCrlf(join(HERE, 's4-cost.md'), md.join('\n'));
writeCrlf(join(HERE, 's4-cost.json'), JSON.stringify(out, null, 1));
process.stdout.write(md.slice(0, 16).join('\n') + '\n');
