// @ts-check
// Corrected comparison record of IGP-01 (compare-r2): analysis of the already published runs only, with no generation
// and no rating. It leaves compare.json|md untouched and adds what the pack author asked for after the IGP-01 review:
// the puzzle population per cell (clue share and score of MP12b1, the before arm and the after arm), the like-with-like
// caveats of the estimate column, the n = 1 reading of 14x14 Nightmare and the mixed 26x26 Master result.
//   node tools\ig-proto\compare-r2.mjs --task IGP-01 --label provisional [--source-label <SL>]
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { median, percentile } from '../bench/report.js';
import { evidenceDir, mp12b1Report, parseArgs } from './lib/paths.mjs';
import { banner, buildMeta, writeJson, writeText } from './lib/records.mjs';

/** The headline cells in the order of the pack author's table, with the analysts' rows (check-list §5; Projections). */
const CELLS = Object.freeze([
  { id: '12x12-nightmare', label: '12x12 Nightmare', opus: 'about 39-48 s', astra: '44.5 s', allOpus: '16 s', allAstra: '21.7 s' },
  { id: '14x14-nightmare', label: '14x14 Nightmare', opus: '17.7 s', astra: '16.0 s', allOpus: '8.0 s', allAstra: '7.94 s' },
  { id: '15x15b10-nightmare', label: '15x15b10 Nightmare', opus: '13.8 s', astra: '13.7 s', allOpus: '6.3 s', allAstra: '7.22 s' },
  { id: '26x26-hell-1', label: 'Hell 1 26x26', opus: 'about 28 s (if a window holds)', astra: '50-60 s (if a window holds)', allOpus: '15 s', allAstra: '25-30 s' },
  { id: '26x26-nightmare', label: '26x26 Nightmare', opus: '15.5 s', astra: '17.8 s', allOpus: '7.0 s', allAstra: '8.84 s' },
  { id: '14x14-master', label: '14x14 Master', opus: 'unchanged', astra: 'unchanged', allOpus: 'not stated', allAstra: 'not stated' },
  { id: '26x26-master', label: '26x26 Master', opus: 'unchanged', astra: 'unchanged', allOpus: 'not stated', allAstra: 'not stated' },
]);
const SCREEN_OUTCOMES = new Set(['scap0', 'scap1', 'over']);

/** @param {number[]} v */
const dist = (v) => ({
  n: v.length,
  min: v.length === 0 ? null : Math.min(...v),
  p25: percentile(v, 0.25),
  median: median(v),
  p75: percentile(v, 0.75),
  max: v.length === 0 ? null : Math.max(...v),
});
/** @param {number | null | undefined} x @param {number} [d] @returns {string} */
const fix = (x, d = 3) => (x === null || x === undefined ? '-' : x.toFixed(d));
/** @param {any} s @param {number} [d] @returns {string} median [p25-p75] (min-max) */
const spread = (s, d = 3) => `${fix(s.median, d)} [${fix(s.p25, d)}-${fix(s.p75, d)}] (${fix(s.min, d)}-${fix(s.max, d)})`;
/** @param {number | null | undefined} ms @returns {string} */
const sec = (ms) => (ms === null || ms === undefined ? '-' : (ms / 1000).toFixed(2));

/** @param {string} file @returns {any[]} */
const readJsonl = (file) => readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => l.trim() !== '').map((l) => JSON.parse(l));

/**
 * @param {string} label
 * @param {string} task
 * @param {string} arm
 * @returns {{ rows: any[], calls: any[] }} The published rows and journal lines of the arm.
 */
function loadArm(label, task, arm) {
  const dir = evidenceDir(label, task, arm);
  /** @type {any[]} */
  const rows = [];
  /** @type {any[]} */
  const calls = [];
  for (const name of readdirSync(dir).filter((n) => n.endsWith('.runs.json')).sort()) {
    const record = JSON.parse(readFileSync(join(dir, name), 'utf8'));
    rows.push(...record.rows);
    const journal = join(dir, `${record.shard}.calls.jsonl`);
    if (!existsSync(journal)) {
      throw new Error(`the published journal ${record.shard}.calls.jsonl of arm ${arm} is missing`);
    }
    calls.push(...readJsonl(journal));
  }
  return { rows, calls };
}

/**
 * Accepted puzzles of runs as `{ share, clues, K, score }`.
 * @param {any[]} runs
 */
const puzzlesOf = (runs) => runs.flatMap((run) => (run.details?.puzzles ?? []).map((/** @type {any} */ p) => (
  { share: p.clues / run.details.K, clues: p.clues, K: run.details.K, score: p.score })));

/** @param {{ share: number, clues: number, K: number, score: number }[]} list */
const population = (list) => ({
  puzzles: list.length,
  K: dist(list.map((p) => p.K)),
  clues: dist(list.map((p) => p.clues)),
  share: dist(list.map((p) => p.share)),
  score: dist(list.map((p) => p.score)),
});

/**
 * @param {any[]} lines Journal lines.
 * @param {string} rowPrefix
 * @returns {{ tuples: number, byOutcome: Record<string, number>, screenCapped: number, canonicalCapped: number }}
 */
function probeOutcomes(lines, rowPrefix) {
  /** @type {Record<string, number>} */
  const byOutcome = {};
  let tuples = 0;
  for (const l of lines) {
    if (l.t === 'p' && String(l.call).startsWith(rowPrefix)) {
      tuples += 1;
      byOutcome[l.tuple[2]] = (byOutcome[l.tuple[2]] ?? 0) + 1;
    }
  }
  return {
    tuples, byOutcome,
    screenCapped: [...SCREEN_OUTCOMES].reduce((s, o) => s + (byOutcome[o] ?? 0), 0),
    canonicalCapped: byOutcome.capped ?? 0,
  };
}

/** @param {string[]} argv @returns {Promise<number>} */
async function main(argv) {
  const { args } = parseArgs(argv, { values: ['task', 'label', 'source-label'] });
  const task = args.task ?? 'IGP-01';
  const label = args.label ?? 'provisional';
  const original = JSON.parse(readFileSync(evidenceDir(label, task, 'compare.json'), 'utf8'));
  const cells = original.pairs[0].cells;
  const before = loadArm(label, task, 'before');
  const after = loadArm(label, task, 'after');
  const meta = await buildMeta({ task, label, kind: 'compare-r2', trees: ['log', 'p1p5-main'], sourceLabel: args['source-label'] });

  /** @type {Record<string, any>} */
  const populations = {};
  for (const cell of CELLS) {
    const found = mp12b1Report(cell.id);
    if (found === null) {
      throw new Error(`no MP12b1 report for ${cell.id}`);
    }
    const mp = found.report.runs.filter((/** @type {any} */ r) => r.probeKind === 'generation');
    const afterRows = after.rows.filter((r) => r.caseId === cell.id);
    const seeds = afterRows.map((r) => r.seed);
    const mine = (/** @type {any[]} */ rows) => rows.filter((r) => r.caseId === cell.id).map((r) => r.run);
    const sources = {
      mp12b1: { what: `MP12b1, ${mp.length} reps (${found.path})`, ...population(puzzlesOf(mp)) },
      mp12b1Matched: { what: 'MP12b1, the seeds of the measured cohort', ...population(puzzlesOf(mp.filter((/** @type {any} */ r) => seeds.includes(r.seed)))) },
      before: { what: `before arm, ${mine(before.rows).length} seeds`, ...population(puzzlesOf(mine(before.rows))) },
      after: { what: `after arm, ${mine(after.rows).length} seeds`, ...population(puzzlesOf(mine(after.rows))) },
    };
    populations[cell.id] = {
      ...sources,
      shareDifference: {
        afterMinusMp12b1: sources.after.share.median - sources.mp12b1.share.median,
        afterMinusBefore: sources.after.share.median - sources.before.share.median,
        cluesAfterMinusMp12b1: sources.after.clues.median - sources.mp12b1.clues.median,
        cluesAfterMinusBefore: sources.after.clues.median - sources.before.clues.median,
        scoreAfterMinusMp12b1: sources.after.score.median - sources.mp12b1.score.median,
      },
    };
  }

  /** The paired T10 factors per seed of a cell, from the published runs. */
  const pairedT10 = (/** @type {string} */ id) => cells[id].seeds
    .filter((/** @type {any} */ s) => s.before && s.after && s.before.t10 !== null && s.after.t10 !== null && !s.before.censored && !s.after.censored)
    .map((/** @type {any} */ s) => ({ seed: s.seed, before: s.before.t10, after: s.after.t10, ratio: s.before.t10 / s.after.t10 }));
  const master = pairedT10('26x26-master');
  const geoMean = Math.exp(master.reduce((s, p) => s + Math.log(p.ratio), 0) / master.length);
  const masterBefore = probeOutcomes(before.calls, '26x26-master~');
  const masterAfter = probeOutcomes(after.calls, '26x26-master~');
  const nightmare14 = pairedT10('14x14-nightmare');

  const notes = {
    differentPopulation: 'The after arm produces different puzzles from today: on Nightmare and Hell 1 about 1 to 3 more clues per puzzle at a similar score, so part of the speed-up comes from a different puzzle population, not only from a faster search of the same puzzles.',
    likeWithLike: [
      'The estimate column holds the analysts\' P1 to P5 rows at four workers (R02 to R08), not the after-all-phases values (R31); the R31 values are shown apart.',
      'The estimates were applied to MP12b1\'s 20-seed T10 medians, while the measurements use 3 to 6 seeds, including seeds that today never finishes (a request that does not reach ten has no T10).',
      'The estimates assumed today\'s puzzles (the same clue counts and scores); the after arm\'s puzzles differ (population section).',
    ],
  };
  const record = {
    meta,
    supersedes: 'the reading of the headline table of compare.md; compare.json and compare.md are unchanged',
    headline: CELLS.map((c) => ({
      cell: c.id,
      today: cells[c.id].mp12b1?.all.t10 ?? null,
      before: { t10: cells[c.id].before.t10, reached: cells[c.id].before.reached, requests: cells[c.id].before.requests },
      after: { t10: cells[c.id].after.t10, reached: cells[c.id].after.reached, requests: cells[c.id].after.requests },
      pairedT10Ratio: cells[c.id].paired.t10Ratio,
      pairedResponseRatio: cells[c.id].paired.responseRatio,
      estimatesP1P5: { opus: c.opus, astra: c.astra },
      estimatesAfterAll: { opus: c.allOpus, astra: c.allAstra },
    })),
    caveats: notes,
    populations,
    nightmare14x14: { pairedT10: nightmare14, pairedResponseRatio: cells['14x14-nightmare'].paired.responseRatio, completion: cells['14x14-nightmare'].paired.completion },
    master26x26: {
      pairedT10: master,
      faster: master.filter((p) => p.ratio > 1).length,
      slower: master.filter((p) => p.ratio < 1).length,
      min: Math.min(...master.map((p) => p.ratio)),
      max: Math.max(...master.map((p) => p.ratio)),
      geometricMean: geoMean,
      probes: { before: masterBefore, after: masterAfter },
    },
  };
  writeJson(evidenceDir(label, task, 'compare-r2.json'), record);

  const lines = [`# ${task} comparison, corrected (r2)`, '', banner(meta), '',
    'This record supersedes the reading of the headline table in `compare.md`; `compare.json` and `compare.md` stay as written. It is an analysis of the published runs and journals only (no generation, no rating). "After" values are *Measured*, ratios are *Derived*, the estimates are the analysts\' *Projections*.', '',
    '## What the headline does and does not show', '',
    `- **The after arm produces different puzzles.** ${notes.differentPopulation}`,
    `- **Estimate column.** ${notes.likeWithLike[0]}`,
    `- **Samples.** ${notes.likeWithLike[1]}`,
    `- **Puzzles.** ${notes.likeWithLike[2]}`, '',
    '| Cell | Today, MP12b1 20 reps: T10 median / p95 (ten of 20) | Before: T10 median (ten of n) | After: T10 median (ten of n) | Paired T10 ratio (n) | Paired response ratio (n) | P1-P5 estimate, Opus / Astra (R02-R08) | After all phases, Opus / Astra (R31, not compared) |', '|---|---|---|---|---|---|---|---|'];
  for (const c of CELLS) {
    const x = cells[c.id];
    lines.push(`| ${c.label} | ${sec(x.mp12b1.all.t10.median)} / ${sec(x.mp12b1.all.t10.p95)} (${x.mp12b1.all.reached}) | ${sec(x.before.t10.median)} (${x.before.reached} of ${x.before.requests}) | ${sec(x.after.t10.median)} (${x.after.reached} of ${x.after.requests}) | ${fix(x.paired.t10Ratio.median, 2)} (${x.paired.t10Ratio.n}) | ${fix(x.paired.responseRatio.median, 2)} (${x.paired.responseRatio.n}) | ${c.opus} / ${c.astra} | ${c.allOpus} / ${c.allAstra} |`);
  }
  lines.push('', '## Population of the accepted puzzles', '',
    'Clue share is clues / K of each accepted puzzle; spread is `median [p25-p75] (min-max)` (nearest-rank percentiles). MP12b1 is all 20 reps of the cell; "MP12b1 matched" the seeds of the measured cohort; the before and after arms are the measured seeds.', '',
    '| Cell | Median clue share: MP12b1 | Before | After | After - MP12b1 | Median clues: MP12b1 / before / after | Median score: MP12b1 / before / after |', '|---|---:|---:|---:|---:|---|---|');
  for (const c of CELLS) {
    const p = populations[c.id];
    lines.push(`| ${c.label} | ${fix(p.mp12b1.share.median)} | ${fix(p.before.share.median)} | ${fix(p.after.share.median)} | ${p.shareDifference.afterMinusMp12b1 >= 0 ? '+' : ''}${fix(p.shareDifference.afterMinusMp12b1)} | ${fix(p.mp12b1.clues.median, 1)} / ${fix(p.before.clues.median, 1)} / ${fix(p.after.clues.median, 1)} | ${fix(p.mp12b1.score.median, 1)} / ${fix(p.before.score.median, 1)} / ${fix(p.after.score.median, 1)} |`);
  }
  for (const c of CELLS) {
    const p = populations[c.id];
    lines.push('', `### ${c.label}`, '', '| Source | Puzzles | K | Clues | Clue share | Score |', '|---|---:|---|---|---|---|');
    for (const key of ['mp12b1', 'mp12b1Matched', 'before', 'after']) {
      const s = p[key];
      lines.push(`| ${s.what} | ${s.puzzles} | ${spread(s.K, 1)} | ${spread(s.clues, 1)} | ${spread(s.share)} | ${spread(s.score, 1)} |`);
    }
  }
  const nm = CELLS.filter((c) => c.id.includes('nightmare') || c.id.includes('hell')).map((c) => populations[c.id].shareDifference.cluesAfterMinusMp12b1);
  const nmShare = CELLS.filter((c) => c.id.includes('nightmare') || c.id.includes('hell')).map((c) => populations[c.id].shareDifference.afterMinusMp12b1);
  const nmScore = CELLS.filter((c) => c.id.includes('nightmare') || c.id.includes('hell')).map((c) => populations[c.id].shareDifference.scoreAfterMinusMp12b1);
  lines.push('', `**Reading.** The before arm's population equals MP12b1's on the same seeds (the same puzzles, as the identity check says). On the Nightmare cells and Hell 1 the after arm's median clue share is higher than MP12b1's by ${fix(Math.min(...nmShare))} to ${fix(Math.max(...nmShare))}, that is ${fix(Math.min(...nm), 1)} to ${fix(Math.max(...nm), 1)} clues at the median, at a similar score (the after arm's median score differs from MP12b1's by ${fix(Math.min(...nmScore), 1)} to ${fix(Math.max(...nmScore), 1)} points). The after arm's puzzles are therefore not today's puzzles: part of the speed-up comes from a different puzzle population, and this record does not separate the two effects. On 14x14 Master the shares agree with the before arm; on 26x26 Master the after arm's share is lower (${fix(populations['26x26-master'].shareDifference.afterMinusMp12b1)}).`);

  const x14 = cells['14x14-nightmare'];
  lines.push('', '## 14x14 Nightmare: the paired factor rests on one seed', '',
    `Today reaches ten on ${x14.paired.completion.before} of ${x14.paired.completion.of} seeds, so only ${nightmare14.length} seed has a T10 on both sides: ${nightmare14.map((p) => `${p.seed} (${sec(p.before)} s before, ${sec(p.after)} s after, factor ${fix(p.ratio, 2)})`).join('; ')}. The paired T10 factor ${fix(x14.paired.t10Ratio.median, 2)} (n ${x14.paired.t10Ratio.n}) is not an estimate of anything. The comparison is carried by the paired response ratio ${fix(x14.paired.responseRatio.median, 1)} (min ${fix(x14.paired.responseRatio.min, 2)}, max ${fix(x14.paired.responseRatio.max, 2)}, n ${x14.paired.responseRatio.n}; a request that never reaches ten is counted at its response time) and by completion (${x14.paired.completion.before} of ${x14.paired.completion.of} to ${x14.paired.completion.after} of ${x14.paired.completion.of}). A better factor needs the frozen round with ten or more seeds.`);

  const m26 = cells['26x26-master'];
  lines.push('', '## 26x26 Master: a mixed result', '',
    `Paired T10 ratios per seed (before / after; above 1 is faster): ${master.map((p) => `${p.seed.split('/').pop()}: ${fix(p.ratio, 2)}`).join(', ')}. They range from ${fix(Math.min(...master.map((p) => p.ratio)), 2)} to ${fix(Math.max(...master.map((p) => p.ratio)), 2)}: ${record.master26x26.faster} seeds faster and ${record.master26x26.slower} slower, geometric mean ${fix(geoMean, 2)}. The median ${fix(m26.paired.t10Ratio.median, 2)} and the T10 medians (${sec(m26.before.t10.median)} s before, ${sec(m26.after.t10.median)} s after) cannot be told apart from "unchanged" at n = ${master.length}.`, '',
    `What the journals show: the after arm screen-capped ${masterAfter.screenCapped} of ${masterAfter.tuples} probes (${fix(100 * masterAfter.screenCapped / masterAfter.tuples, 1)} %; outcomes ${Object.entries(masterAfter.byOutcome).sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k} ${v}`).join(', ')}), where the before arm never capped (${masterBefore.canonicalCapped} canonical caps of ${masterBefore.tuples} probes). So \`W\` = 190 M is below the main work of some 26x26 Master ratings (each screen-capped probe spends up to 190 M units of main work and gives no rating). IGP-02 and IGP-03 measure this (the screen's economics and the \`W\` variants).`);
  writeText(evidenceDir(label, task, 'compare-r2.md'), lines.join('\n'));
  process.stdout.write(`compare-r2: written; 26x26 Master screen-capped ${masterAfter.screenCapped} of ${masterAfter.tuples}\n`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (e) {
    process.stderr.write(`compare-r2: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exitCode = 1;
  }
}
