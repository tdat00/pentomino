// @ts-check
// SA-Opus, T16 step 1 (stages 2 to 4 pack): the verdicts of the final record V4-S4F restated per class, failing cell,
// control, Master cell, Hell 1 board, P5 pair and population cell, never recomputed with another rule; and, from the
// published Master rows, the Master timing (reported, not gated): per cell, today's arm against fr-frozen on reps
// 20-24, the capped T10 (quantity 10, cap 120 s) by verdicts.mjs's own cappedT10.
// Unlocked: it reads records only; it writes its outputs beside itself.
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\t16-verdicts.mjs
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cappedT10, geoMean, ingestRow } from '../../../../tools/ig-proto/verdicts.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const HERE = 'docs/improve-generating-stages-2-4/evidence/sa-opus';
const FINAL = 'docs/improve-generating/evidence/frozen/V4-S4F';
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
const r1 = (/** @type {number} */ x) => Math.round(x * 10) / 10;

const v = json(`${FINAL}/verdicts.json`);
const manifest = json('tools/ig-proto/plans/verdicts/V4-S4F.verdict-manifest.json');
const { quantity, capMs, masterReps } = manifest;

const classes = v.classes.map((/** @type {any} */ c) => ({
  class: c.class ?? c.id, verdict: c.verdict, decidedBy: c.decidedBy ?? null, ships: c.ships ?? c.shipped,
}));
const failing = v.failingCells.map((/** @type {any} */ c) => ({
  cell: c.cell, class: c.class, shipped: c.shipped, gate: c.gate.verdict, reachedTen: c.gate.reachedTen, deadEnds: c.gate.deadEnds,
  deadlineViolations: c.gate.deadlineViolations, p95S: r1(c.gate.p95Ms / 1000),
}));
const controls = v.controls.map((/** @type {any} */ c) => ({
  cell: c.cell, class: c.class, shipped: c.shipped, today: c.today, gate: c.gate.verdict, reachedTen: c.gate.reachedTen,
  deadlineViolations: c.gate.deadlineViolations, p95S: r1(c.gate.p95Ms / 1000), geoMean: r4(c.gate.noRegression.geoMean),
  lower: r4(c.gate.noRegression.lower), reasons: c.gate.reasons,
}));
// Master timing (reported, not gated): the capped T10 of today's arm and fr-frozen on the master reps.
const masters = v.masters.map((/** @type {any} */ m) => {
  const rowsOf = (/** @type {string} */ arm) => {
    const doc = json(`${S4}/${arm}/master-${m.cell}.runs.json`);
    return new Map(doc.rows.filter((/** @type {any} */ r) => ingestRow(r, { quantity }).status === 'valid' && masterReps.includes(r.rep))
      .map((/** @type {any} */ r) => [r.rep, r.run]));
  };
  const today = rowsOf(m.today);
  const after = rowsOf(m.after);
  const reps = masterReps.filter((/** @type {number} */ r) => today.has(r) && after.has(r));
  const t = reps.map((/** @type {number} */ r) => cappedT10(today.get(r), { quantity, capMs }));
  const a = reps.map((/** @type {number} */ r) => cappedT10(after.get(r), { quantity, capMs }));
  const median = (/** @type {number[]} */ xs) => { const s = xs.slice().sort((x, y) => x - y); return s[(s.length - 1) >> 1]; };
  const tenToday = reps.filter((/** @type {number} */ r) => today.get(r).acceptedCount >= quantity).length;
  const tenAfter = reps.filter((/** @type {number} */ r) => after.get(r).acceptedCount >= quantity).length;
  return {
    cell: m.cell, verdict: m.result.verdict, differences: m.result.differences.length, reps: reps.length,
    reachedTenToday: tenToday, reachedTenAfter: tenAfter,
    medianTodayS: r1(median(t) / 1000), medianAfterS: r1(median(a) / 1000),
    ratioGeoMean: r4(geoMean(reps.map((/** @type {number} */ _, /** @type {number} */ i) => t[i] / a[i]))),
  };
});
const hell1 = v.hell1.map((/** @type {any} */ h) => ({ cell: h.cell, arm: h.arm, ...h.report }));
const p5 = v.p5.map((/** @type {any} */ p) => ({
  cell: p.cell, declared: p.declared, pairs: p.pairs, falseStops: p.falseStops, lostCompletions: p.lostCompletions, unknown: p.unknown,
  lostReps: p.lostReps, falseStopReps: p.falseStopReps, unexpected: p.unexpected.length,
}));
// The population per cell: every arm that ran the cell, side by side (the record's population, restated).
const cellsOf = new Set(Object.values(v.population).flatMap((/** @type {any} */ byCell) => Object.keys(byCell)));
const population = [...cellsOf].sort().map((cell) => ({
  cell,
  arms: Object.fromEntries(Object.entries(v.population).filter(([, byCell]) => /** @type {any} */ (byCell)[cell] !== undefined)
    .map(([arm, byCell]) => {
      const p = /** @type {any} */ (byCell)[cell];
      return [arm, {
        requests: p.completion.requests, reachedTen: p.completion.reachedTen, puzzles: p.puzzles,
        clueShareMedian: r4(p.clueShare.median), scorePositionMedian: r4(p.scorePosition.median),
        censusEstimateShare: r4(p.censusEstimateShare), evidenceProblems: p.evidenceProblems.length,
      }];
    })),
}));
const result = {
  script: `${HERE}/t16-verdicts.mjs`, record: `${FINAL}/verdicts.json`, purpose: v.purpose, phase0: v.phase0.line,
  declared: v.collection?.declared ?? null, published: v.collection?.published ?? null, missing: v.collection?.missing?.length ?? null,
  classes, failing, controls, masters, hell1, p5, population,
  selection: { verdict: v.selection.verdict, changed: v.selection.changed },
  prerequisites: Object.entries(v.prerequisites).map(([name, p]) => ({ name, status: /** @type {any} */ (p).status })),
  inputs: { entries: inputs.length, sha256Lf: sha256(JSON.stringify(inputs)) },
};
// The population two-sided on the ten controls: the shipped arm against today's arm, both directions reported.
const twoSided = controls.map((/** @type {any} */ c) => {
  const s = /** @type {any} */ (v.population)[c.shipped][c.cell];
  const t = /** @type {any} */ (v.population)[c.today][c.cell];
  return {
    cell: c.cell, shipped: c.shipped, today: c.today,
    clueShare: { shipped: [s.clueShare.min, s.clueShare.median, s.clueShare.max].map(r4), today: [t.clueShare.min, t.clueShare.median, t.clueShare.max].map(r4), medianDiff: r4(s.clueShare.median - t.clueShare.median) },
    scorePosition: { shipped: r4(s.scorePosition.median), today: r4(t.scorePosition.median), medianDiff: r4(s.scorePosition.median - t.scorePosition.median) },
    censusEstimateShare: { shipped: r4(s.censusEstimateShare), today: r4(t.censusEstimateShare), diff: r4(s.censusEstimateShare - t.censusEstimateShare) },
    reachedTen: { shipped: s.completion.reachedTen, today: t.completion.reachedTen, requests: s.completion.requests },
  };
});
const sign = (/** @type {number[]} */ xs) => ({ up: xs.filter((x) => x > 0).length, equal: xs.filter((x) => x === 0).length, down: xs.filter((x) => x < 0).length });
Object.assign(result, {
  twoSided, twoSidedCounts: {
    clueShareMedian: sign(twoSided.map((x) => x.clueShare.medianDiff)),
    scorePositionMedian: sign(twoSided.map((x) => x.scorePosition.medianDiff)),
    censusEstimateShare: sign(twoSided.map((x) => x.censusEstimateShare.diff)),
  },
});
writeFileSync(join(ROOT, HERE, 't16-verdicts.json'), crlf(JSON.stringify(result, null, 2)), 'utf8');
const arms = ['fr-frozen', 'fr-frozen-none', 'log-link', 'fr-frozen-uncapped', 'fr-frozen-none-uncapped'];
const md = [
  `# T16: the final record restated (${FINAL}/verdicts.json, purpose ${v.purpose})`,
  '',
  `${v.phase0.line}`,
  '',
  '## Master timing (reported, not gated; capped T10 on reps 20-24)',
  '',
  '| Cell | Identity | Reached ten today / after | Median today (s) | Median after (s) | Geometric mean today over after |',
  '|---|---|---|---:|---:|---:|',
  ...masters.map((/** @type {any} */ m) => `| ${m.cell} | ${m.verdict} | ${m.reachedTenToday} / ${m.reachedTenAfter} | ${m.medianTodayS} | ${m.medianAfterS} | ${m.ratioGeoMean} |`),
  '',
  '## Population per cell (median clue share / median score position / census-estimate share; reached ten of requests)',
  '',
  `| Cell | ${arms.join(' | ')} |`,
  `|---|${arms.map(() => '---').join('|')}|`,
  ...population.map((p) => `| ${p.cell} | ${arms.map((a) => {
    const x = /** @type {any} */ (p.arms)[a];
    return x === undefined ? '-' : `${x.clueShareMedian} / ${x.scorePositionMedian} / ${x.censusEstimateShare}; ${x.reachedTen} of ${x.requests}`;
  }).join(' | ')} |`),
  '',
  '## The population two-sided on the ten controls (shipped arm minus today\'s arm; reported, not gated)',
  '',
  '| Control | Clue share min / median / max, shipped | today | Median difference | Score position median shipped / today (difference) | Census-estimate share shipped / today (difference) | Reached ten shipped / today |',
  '|---|---|---|---:|---|---|---|',
  ...twoSided.map((x) => `| ${x.cell} | ${x.clueShare.shipped.join(' / ')} | ${x.clueShare.today.join(' / ')} | ${x.clueShare.medianDiff} | ${x.scorePosition.shipped} / ${x.scorePosition.today} (${x.scorePosition.medianDiff}) | ${x.censusEstimateShare.shipped} / ${x.censusEstimateShare.today} (${x.censusEstimateShare.diff}) | ${x.reachedTen.shipped} / ${x.reachedTen.today} of ${x.reachedTen.requests} |`),
  '',
  `Directions (up / equal / down): clue-share median ${JSON.stringify(/** @type {any} */ (result).twoSidedCounts.clueShareMedian)}, score-position median ${JSON.stringify(/** @type {any} */ (result).twoSidedCounts.scorePositionMedian)}, census-estimate share ${JSON.stringify(/** @type {any} */ (result).twoSidedCounts.censusEstimateShare)}.`,
].join('\n');
writeFileSync(join(ROOT, HERE, 't16-verdicts.md'), crlf(md), 'utf8');
process.stdout.write(`t16-verdicts: ${v.phase0.line}; ${classes.length} classes, ${failing.length} failing cells, ${controls.length} controls, ${masters.length} Master cells, ${hell1.length} Hell 1 boards, ${p5.length} P5 cells, ${population.length} population cells; ${inputs.length} files read (sha256 of the index ${result.inputs.sha256Lf})\n`);
for (const m of masters) {
  process.stdout.write(`  ${m.cell}: ${m.verdict}; ten ${m.reachedTenToday}/${m.reachedTenAfter}; median ${m.medianTodayS} s today, ${m.medianAfterS} s after; gm ${m.ratioGeoMean}\n`);
}
