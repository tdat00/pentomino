// @ts-check
// SA-Opus, S01 step 8 (the SAs' reading of V4-S2B): the numbers of s01-reading.md, read from the records only (unlocked,
// no rating, search or generation):
// - the two fit-read records of V4-S2B (preview and prefixes, written by S01 step 7);
// - the published rows of V4-S2B's fr-none (8 cells, reps 0-4) and MP12b1's reports of the same cells (today's search,
//   reps 0-9; reps 0-4 are the preview's pairs);
// - the raw journals of V4-S2B (tests/artifacts/ig-proto/frozen/V4-S2B/fr-none/<shard>/logs/), read with fit-read's pure
//   callPrefixes and boundFirings for the frozen four-attempt bound (S01's prefixes record ran without --bound);
// - stage 2's 26x26 Nightmare fr-none pairs (V4-S2), for the comparison the plan's risk table names.
// Writes s01-numbers.json and s01-numbers.md beside this script.
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\s01-numbers.mjs --label frozen --source-label "frozen 3fc65f4"
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { ROOT } from './s2-lib.mjs';

const load = (/** @type {string[]} */ ...p) => import(pathToFileURL(join(ROOT, ...p)).href);
const { cappedT10, geoMean, noRegression, parseLines, reachedTen, runStatus } = await load('tools', 'ig-proto', 'verdicts.mjs');
const { withoutSampling } = await load('tools', 'ig-proto', 'manifest.mjs');
const { mp12b1Report } = await load('tools', 'ig-proto', 'lib', 'paths.mjs');
const { boundFirings, callPrefixes } = await load('tools', 'ig-proto', 'fit-read.mjs');

const CELLS = ['3x29-nightmare', '18x18-nightmare', '18x20-nightmare', '20x20-nightmare', '20x21-nightmare', '32x15-nightmare',
  '22x22-nightmare', '24x24-nightmare'];
const EVIDENCE = join(ROOT, 'docs', 'improve-generating', 'evidence', 'frozen');
const RAW = join(ROOT, 'tests', 'artifacts', 'ig-proto', 'frozen');
const json = (/** @type {string} */ p) => JSON.parse(readFileSync(p, 'utf8'));
const preview = json(join(EVIDENCE, 'V4-S2B', 'fit-read-preview-fr-none.json'));
const prefixes = json(join(EVIDENCE, 'V4-S2B', 'fit-read-prefixes-fr-none.json'));
const Q = { quantity: 10, capMs: 120000 };
const s = (/** @type {number | null | undefined} */ ms) => (typeof ms === 'number' ? Math.round(ms / 100) / 10 : null);
const r3 = (/** @type {number | null} */ x) => (x === null ? null : Math.round(x * 1000) / 1000);
/** @param {number[]} xs @returns {number} The sample standard deviation of the natural logs. */
const logSd = (xs) => {
  const l = xs.map(Math.log);
  const m = l.reduce((a, b) => a + b, 0) / l.length;
  return Math.sqrt(l.reduce((a, b) => a + (b - m) ** 2, 0) / (l.length - 1));
};

/** The today runs of a cell by rep, sampling removed. @param {string} cell */
function todayRuns(cell) {
  const found = mp12b1Report(cell);
  /** @type {Map<number, any>} */
  const byRep = new Map();
  for (const run of found?.report?.runs ?? []) {
    if (run.probeKind === 'generation') {
      byRep.set(run.rep, withoutSampling(run));
    }
  }
  return { path: found?.path ?? null, byRep };
}

/** The bound of 4 on the raw journals of one row. @param {string} task @param {string} shard @param {string} rowKey */
function rowBound(task, shard, rowKey) {
  const logs = join(RAW, task, 'fr-none', shard, 'logs');
  const names = existsSync(logs) ? readdirSync(logs).sort() : [];
  const files = names.filter((n) => n.startsWith(`${rowKey}.`) && n.endsWith('.jsonl') && !n.endsWith('.row.jsonl') && n !== `${rowKey}.link.jsonl`);
  /** @type {Record<string, any>[]} */
  const lines = [];
  /** @type {string[]} */
  const problems = [];
  for (const name of files) {
    const parsed = parseLines(readFileSync(join(logs, name), 'utf8'), name);
    lines.push(...parsed.lines);
    problems.push(...parsed.problems);
  }
  const p = callPrefixes(lines, { nightmare: 10000000000 });
  const sets = p.calls.filter((c) => c.stage === 'set');
  return {
    files: files.length, problems: [...problems, ...p.problems], calls: p.calls.length, setCalls: sets.length,
    setResults: sets.map((c) => `${c.attempt}:${c.endResult ?? (c.ended ? 'ended' : 'open')}`),
    bound: boundFirings(p.calls, 4),
  };
}

const cells = CELLS.map((cell) => {
  const pre = preview.cells.find((/** @type {any} */ c) => c.cell === cell);
  const doc = json(join(EVIDENCE, 'V4-S2B', 'fr-none', `pilot-${cell}.runs.json`));
  const today = todayRuns(cell);
  const rows = prefixes.rows.filter((/** @type {any} */ r) => r.cell === cell);
  const reps = [0, 1, 2, 3, 4].map((rep) => {
    const row = doc.rows.find((/** @type {any} */ x) => x.rep === rep);
    const run = row?.run;
    const t = today.byRep.get(rep);
    const pre1 = rows.find((/** @type {any} */ r) => r.rep === rep);
    const bound = rowBound('V4-S2B', `pilot-${cell}`, `${cell}~${rep}`);
    return {
      rep,
      todayT10s: t ? s(cappedT10(t, Q)) : null,
      afterT10s: run ? s(cappedT10(run, Q)) : null,
      afterResponseS: s(run?.responseMs),
      afterFirstReadyS: s(run?.firstReadyMs),
      afterSetS: s(run?.igSetMs),
      afterAccepted: run?.acceptedCount ?? null,
      afterPartial: run?.partialReason ?? null,
      afterStatus: run ? runStatus(run, { quantity: 10 }).status : null,
      afterTen: run ? reachedTen(run, { quantity: 10 }) : null,
      ratio: pre?.ratios?.[rep] ?? null,
      maxCallG: pre1?.maxSpent == null ? null : Math.round(pre1.maxSpent / 1e7) / 100,
      calls: pre1?.calls ?? null,
      bound: bound.bound,
      setResults: bound.setResults,
      journalProblems: bound.problems,
    };
  });
  const todayMore = [5, 6, 7, 8, 9].map((rep) => (today.byRep.has(rep) ? s(cappedT10(today.byRep.get(rep), Q)) : null));
  const ratios = /** @type {number[]} */ (pre.ratios.filter((/** @type {number | null} */ x) => x !== null));
  return {
    cell,
    area: Number(cell.split('-')[0].split('x')[0]) * Number(cell.split('-')[0].split('x')[1]),
    today: today.path,
    todayTen: pre.todayTen, afterTen: pre.afterTen, ratios: pre.ratios.map(r3), geo: r3(pre.geo), lower: r3(pre.lower), pass: pre.pass,
    logSd: r3(logSd(ratios)),
    problems: pre.problems,
    rows: rows.length,
    complete: rows.filter((/** @type {any} */ r) => r.complete).length,
    identityRows: rows.filter((/** @type {any} */ r) => r.identity.length > 0).length,
    rowProblems: rows.flatMap((/** @type {any} */ r) => r.problems.map((/** @type {string} */ p) => `${r.rowKey}: ${p}`)),
    affected: rows.reduce((/** @type {number} */ n, /** @type {any} */ r) => n + r.affected.length, 0),
    potentiallyAffected: rows.reduce((/** @type {number} */ n, /** @type {any} */ r) => n + r.potentiallyAffected.length, 0),
    ambiguous: rows.reduce((/** @type {number} */ n, /** @type {any} */ r) => n + r.ambiguous.length, 0),
    calls: rows.reduce((/** @type {number} */ n, /** @type {any} */ r) => n + Object.values(r.calls).reduce((/** @type {number} */ a, /** @type {any} */ b) => a + b, 0), 0),
    largestCallG: Math.round(Math.max(...rows.map((/** @type {any} */ r) => r.maxSpent ?? 0)) / 1e7) / 100,
    boundFirings: reps.filter((r) => r.bound.fires).length,
    maxSetS: Math.max(...reps.map((r) => r.afterSetS ?? 0)),
    maxResponseS: Math.max(...reps.map((r) => r.afterResponseS ?? 0)),
    reps,
    todayT10sReps5to9: todayMore,
  };
});

// Stage 2's 26x26 Nightmare on fr-none (V4-S2), the same recipe.
const s2 = json(join(EVIDENCE, 'V4-S2', 'fr-none', 'pilot-26x26-nightmare.runs.json'));
const t26 = todayRuns('26x26-nightmare');
const pairs26 = [0, 1, 2, 3, 4].map((rep) => {
  const run = s2.rows.find((/** @type {any} */ x) => x.rep === rep).run;
  const t = t26.byRep.get(rep);
  return { rep, todayT10s: s(cappedT10(t, Q)), afterT10s: s(cappedT10(run, Q)), ratio: r3(cappedT10(t, Q) / cappedT10(run, Q)) };
});
const ratios26 = pairs26.map((p) => /** @type {number} */ (p.ratio));
const nr26 = noRegression(pairs26.map((p) => cappedT10(t26.byRep.get(p.rep), Q) / cappedT10(s2.rows.find((/** @type {any} */ x) => x.rep === p.rep).run, Q)), [0, 1, 2, 3, 4], { resamples: 10000, resampleSeed: 20261116 });
const stage2 = { cell: '26x26-nightmare', task: 'V4-S2', arm: 'fr-none', pairs: pairs26, geo: r3(geoMean(ratios26)), lower: r3(nr26.lower), pass: nr26.pass, logSd: r3(logSd(ratios26)) };

// Descriptive arithmetic only (not a forecast): with a cell's five-seed log-sd s, the geometric mean that would put a
// normal-approximation 10th percentile of 20 resampled seeds at 0.9 is 0.9 x exp(1.2816 s / sqrt(20)).
const needed = (/** @type {number} */ sd) => r3(0.9 * Math.exp(1.2816 * sd / Math.sqrt(20)));
const out = {
  inputs: {
    preview: 'docs/improve-generating/evidence/frozen/V4-S2B/fit-read-preview-fr-none.json',
    prefixes: 'docs/improve-generating/evidence/frozen/V4-S2B/fit-read-prefixes-fr-none.json',
    previewSummary: { cells: preview.cells.length, problems: preview.problems, missing: preview.missing, unexpected: preview.unexpected },
    prefixesSummary: prefixes.summary,
  },
  cells: cells.map((c) => ({ ...c, neededGeoAt20: needed(c.logSd) })),
  stage2: { ...stage2, neededGeoAt20: needed(stage2.logSd) },
};
const here = join(ROOT, 'docs', 'improve-generating-stages-2-4', 'evidence', 'sa-opus');
writeFileSync(join(here, 's01-numbers.json'), `${JSON.stringify(out, null, 2)}\n`.replace(/\n/g, '\r\n'));
const md = [
  '# S01: the numbers of the SAs\' reading of V4-S2B (SA-Opus, s01-numbers.mjs)',
  '',
  '| Cell (area) | today ten / after ten | ratios rep 0-4 | geo | lower | log-sd | calls (affected, potentially) | largest call G | bound 4 fires | max set s | max response s |',
  '|---|---|---|---:|---:|---:|---|---:|---:|---:|---:|',
  ...out.cells.map((c) => `| ${c.cell} (${c.area}) | ${c.todayTen} / ${c.afterTen} | ${c.ratios.join(', ')} | ${c.geo} | ${c.lower} | ${c.logSd} | ${c.calls} (${c.affected}, ${c.potentiallyAffected}) | ${c.largestCallG} | ${c.boundFirings} | ${c.maxSetS} | ${c.maxResponseS} |`),
  '',
  '| Cell | rep | today T10 s | after T10 s | ratio | after set s | after response s | accepted | partial |',
  '|---|---:|---:|---:|---:|---:|---:|---:|---|',
  ...out.cells.flatMap((c) => c.reps.map((r) => `| ${c.cell} | ${r.rep} | ${r.todayT10s} | ${r.afterT10s} | ${r.ratio} | ${r.afterSetS} | ${r.afterResponseS} | ${r.afterAccepted} | ${r.afterPartial ?? '-'} |`)),
  '',
  `Today's T10 (s) on reps 5-9 (MP12b1, the same report): ${out.cells.map((c) => `${c.cell} ${c.todayT10sReps5to9.join(', ')}`).join('; ')}.`,
  '',
  `Stage 2, ${stage2.cell} on ${stage2.arm} (${stage2.task}): ratios ${stage2.pairs.map((p) => p.ratio).join(', ')}; geo ${stage2.geo}; lower ${stage2.lower}; log-sd ${stage2.logSd}.`,
  '',
  'Descriptive arithmetic (not a forecast): the geometric mean whose normal-approximation 10th percentile over 20 resampled',
  `seeds is 0.9 at a cell's five-seed log-sd: ${out.cells.map((c) => `${c.cell} ${c.neededGeoAt20}`).join('; ')}; ${stage2.cell} (stage 2) ${out.stage2.neededGeoAt20}.`,
  '',
].join('\n');
writeFileSync(join(here, 's01-numbers.md'), md.replace(/\n/g, '\r\n'));
process.stdout.write(md);
