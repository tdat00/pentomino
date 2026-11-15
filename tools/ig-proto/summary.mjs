// @ts-check
// Estimate-vs-measured summary of the improve-generating phase-0 round (IGP-07; check-list §5 and §6).
//   node tools\ig-proto\summary.mjs --label <L> [--root <evidence folder>] [--source-label <SL>]
// It reads the published records of IGP-00 to IGP-06 and IGP-03h under <root> (default
// docs/improve-generating/evidence/<L>/), the invocation logs of the label and clarifications.md, and writes
// summary.json and summary.md into <root>. It generates nothing, rates nothing and times nothing, so it runs
// unlocked. Every value is read from a record; the estimates are the table of check-list §5 copied below. The
// verdicts are descriptive (check-list §5): they say where a measurement lies against the analysts' values.
// Exit 1 when a required record is missing (the message names the task).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { median } from '../bench/report.js';
import { assembleCalls } from './compare.mjs';
import { readInvocations } from './lib/budget.mjs';
import { abs, evidenceDir, IG_DIR, mp12b1Report, parseArgs, rel, ROOT, ROUND_LIMIT_S } from './lib/paths.mjs';
import { banner, buildMeta, writeJson, writeText } from './lib/records.mjs';

/** Each analyst's value, and a point value, is widened by this factor for the small samples (check-list §5). */
const WIDEN = 1.35;
/** A time verdict needs at least this many after-arm requests that reached ten in the matched cohort (check-list §5). */
const MIN_N = 3;
const P7_ASSUMPTION = Object.freeze({ likely: 1.3, low: 1.1, high: 1.8 });
const HEADLINE = Object.freeze(['14x14-nightmare', '15x15b10-nightmare', '12x12-nightmare', '26x26-nightmare', '26x26-hell-1']);

/**
 * The verdict rules: check-list §5 and the pack author's rulings of the IGP-07 review, in one table. A row builder reads
 * its parameters (the analysts' values in seconds, ranges) from here, and the "Verdict rules" section of summary.md is
 * generated from it, so that the frozen round reproduces the same rules. `rule` is the kind of verdict; `judged` is
 * the quantity compared; the estimates themselves are the table ESTIMATES below.
 */
const RULES = Object.freeze({
  R00: { rule: 'holds / fails ("different source" when the source digest is not MP12b1\'s)', judged: 'no identity failure in IGP-00, IGP-01 and IGP-04, and arm E reproduces IGP-01\'s after arm; the identity level reached is named on every seed' },
  R01: { rule: 'time', judged: 'T10 median of the before arm on the matched cohort (reps 0-2) against MP12b1\'s value', values: [112.98] },
  R02: { rule: 'time', judged: 'T10 median of the after arm', cell: '14x14-nightmare', values: [17.7, 16.0] },
  R03: { rule: 'range', judged: 'completion of the after arm (ten of n) per cell, n beside; three requests cannot separate 19 from 20 of 20, and completion after P1-P5 is only a lower bound for the after-all completion Opus estimated', range: [0.95, 1] },
  R04: { rule: 'time', judged: 'T10 median of the after arm', cell: '15x15b10-nightmare', values: [13.8, 13.7] },
  R05: { rule: 'time', judged: 'T10 median of the after arm', cell: '12x12-nightmare', values: [39, 48, 44.5] },
  R06: { rule: 'time', judged: 'T10 median of the after arm', cell: '26x26-nightmare', values: [15.5, 17.8] },
  R07: { rule: 'time against the matched cohort', judged: 'T10 median of the after arm on each Master cell (190 M; 26x26 also at 380 M); the reference is the before arm\'s T10 median on the same seeds, widened by 1.35, because "unchanged" is about the change; MP12b1\'s 20-rep medians (2.57 s, 8.36 s) and the paired ratios are printed beside' },
  R08: { rule: 'time', judged: 'T10 median of the after arm', cell: '26x26-hell-1', values: [28, 50, 60] },
  R09: { rule: 'later round', judged: 'the step did not run in this round (D-IG9)' },
  R10: { rule: 'range', judged: 'batch share of the before arm\'s profile time; cells outside the estimate carry none', ranges: { '14x14-nightmare': [0.3, 0.6], '15x15b10-nightmare': [0.3, 0.6], '12x12-nightmare': [0.05, 0.1] } },
  R11: { rule: 'holds / fails', judged: 'dead-end entries in the after arm (the hypothesis is none)' },
  R12: { rule: 'point value widened by 1.35: below / inside / above', judged: 'mean window profiles per ok call of the after arm (an expected count); the median is printed beside', value: 4 },
  R13: { rule: 'time (the two analysts\' values)', judged: 'median waves of the after arm per cell, at least three requests', values: [2.25, 2.75] },
  R14: { rule: 'holds / fails', judged: 'violations of the screen certificate (0 required), with the coverage gaps' },
  R15: { rule: 'none: measured (no estimate)', judged: 'the estimate is qualitative' },
  R16: { rule: 'none: measured (no estimate)', judged: 'the estimate is qualitative; the 12x12 screen factor is printed beside "about nothing"' },
  R17: { rule: 'none: measured (no estimate)', judged: 'the estimate is a formula' },
  R18: { rule: 'none: measured (no estimate)', judged: 'the estimate has no number' },
  R19: { rule: 'range', judged: 'median locate probes per finished call of the after arm; the P4 factor 1.05-1.15 is not isolated in any arm: not measured, no verdict', range: [2, 6] },
  R20: { rule: 'none: measured (no estimate)', judged: '"a clear gain" has no threshold; none was found: nothing adopted' },
  R21: { rule: 'none: measured (no estimate)', judged: 'the 6 G figure is withdrawn' },
  R22: { rule: 'range', judged: 'level-pooled median of the per-seed T10 factors A / B; the per-cell values and the margin to the range edge are printed and never rounded across the edge', ranges: { Nightmare: [1.03, 1.2], Master: [1.15, 1.6] } },
  R23: { rule: 'range', judged: 'level medians of B / C (eight workers alone): the batch (T10 - T1) and the set stage (T1); A / C, the machine and the per-rating slowdown beside', ranges: { batch: [1.3, 1.9], set: [1.0, 1.3] } },
  R24: { rule: 'Projection', judged: 'P7 is not prototyped: a sensitivity, no factor' },
  R25: { rule: 'Projection', judged: 'P7 is assumed; each band (the measured T10 factor x P7 1.1-1.8) and whether ÷1.9 lies inside it are printed as description' },
  R26: { rule: 'holds / fails', judged: 'both bench criteria (accounted and process peaks) pass on every arm; the estimate is a worst-case ceiling that follows from the arm\'s own constants, so passing peaks never refute it' },
  R27: { rule: 'none: measured (no estimate)', judged: 'the estimate is "unknown"' },
  R28: { rule: 'none: measured (no estimate)', judged: 'the estimate is "unknown"' },
  R29: { rule: 'none: measured (no estimate)', judged: 'point values without a range; the differences and the PM1 counts are printed' },
  R30: { rule: 'none: measured (no estimate)', judged: 'the estimate is "unknown"; the phase shares are firm, the category and function shares indicative' },
  R31: { rule: 'Projection', judged: 'P7 is unmeasured: compared with the analysts\' after-all values, never judged against them' },
  R32: { rule: 'no verdict', judged: 'the population stands beside every time verdict of its cell; IG-P-Q17 judges it' },
  R33: { rule: 'no verdict', judged: 'IG-P-Q17 judges it' },
});
/** The analysts' after-all values (check-list §5 R31), in seconds; Astra's Hell 1 value is the range 25 to 30. */
const AFTER_ALL = Object.freeze({
  '14x14-nightmare': { opus: '8.0 s', astra: '7.94 s' },
  '15x15b10-nightmare': { opus: '6.3 s', astra: '7.22 s' },
  '12x12-nightmare': { opus: '16 s', astra: '21.7 s' },
  '26x26-nightmare': { opus: '7.0 s', astra: '8.84 s' },
  '26x26-hell-1': { opus: '15 s', astra: '25-30 s' },
});

/** The estimates of check-list §5 with their sources (the table is copied, not derived). */
const ESTIMATES = Object.freeze({
  R00: { quantity: 'Harness fidelity: `base` and `log` agree with MP12b1 (puzzle identity by digest where the accepted counts are equal; otherwise metric-prefix agreement, puzzle identity not established)', estimate: 'required agreement', source: 'check-list §3 "Determinism"' },
  R01: { quantity: '14x14 Nightmare today: T10 median / p95, ten of 20', estimate: '112.98 / 151.64 s, 11 of 20 (Measured; MP12b1)', source: '' },
  R02: { quantity: '14x14 Nightmare after P1-P5, four workers: T10 median', estimate: 'Opus 17.7 s (112.98 / 6.4); Astra 16.0 s (tail 21.5-35.3)', source: 'Projection; claude-opus-5.5/2-cross-review.md §1.3-§1.4, gpt-6-astra/2-cross-review.md §6' },
  R03: { quantity: 'Completion after P1-P5 on 12x12, 14x14 and 15x15b10 Nightmare', estimate: 'Opus about 19-20 of 20 after all phases; Astra unknown (report §3)', source: 'Projection; report §3' },
  R04: { quantity: '15x15b10 Nightmare after P1-P5: T10 median', estimate: 'Opus 13.8 s (86.23 / 6.25); Astra 13.7 s', source: 'Projection; as R02' },
  R05: { quantity: '12x12 Nightmare after P1-P5: T10 median', estimate: 'Opus about 39-48 s (P1 and P4 about 1.3 to 1.6); Astra 44.5 s', source: 'Projection; as R02' },
  R06: { quantity: '26x26 Nightmare after P1-P5: T10 median', estimate: 'Opus 15.5 s (18.61 / 1.2); Astra 17.8 s', source: 'Projection; as R02' },
  R07: { quantity: 'Master after P1-P5 (14x14 and 26x26)', estimate: 'unchanged (both); today 2.57 s and 8.36 s', source: 'Projection; as R02' },
  R08: { quantity: 'Hell 1 26x26 after P1-P5: T10 median; ten of n', estimate: 'Opus about 28 s; Astra 50-60 s; both only if a window holds', source: 'Projection; as R02' },
  R09: { quantity: '16x16 and 15x20 Nightmare after P1-P5', estimate: 'not measured in this round (D-IG9)', source: 'check-list §4 D-IG9' },
  R10: { quantity: 'Dead-end share of today\'s batch profile time', estimate: 'a heuristic 30-60 % on 196-300 cells; 5-10 % on 12x12 and 18x18 (report §4)', source: 'report §1, §4' },
  R11: { quantity: 'Dead-end entries per call after P1-P5', estimate: 'expected none (a hypothesis, not a requirement)', source: 'hypothesis' },
  R12: { quantity: 'Window profiles per successful call', estimate: 'about four (a scenario parameter, report §2)', source: 'report §2' },
  R13: { quantity: 'Batch waves for nine slots at four workers (a proxy)', estimate: '2.25 (Opus) or 2.75 (Astra)', source: 'Projection; report §2' },
  R14: { quantity: 'Screen certificate (IG-P-Q01 (b)): certified screens equal canonical', estimate: '0 violations required; otherwise fallback (c)', source: 'IG-P-Q01' },
  R15: { quantity: 'Useful ratings lost (in band, screen-capped) at 95 / 190 / 380 M', estimate: '"95 M is low for Nightmare"; 190-380 M is about 0.6-1.2 s of main work (report §4, IG-P-Q09)', source: 'report §4, IG-P-Q09' },
  R16: { quantity: 'Work per accepted puzzle at 95 / 190 / 380 M and without the screen (14x14 and 12x12 Nightmare)', estimate: 'the minimiser picks W (IG-P-Q09); on 12x12, P2 gives "about nothing"', source: 'IG-P-Q09' },
  R17: { quantity: 'P2\'s saving on today\'s call profiles', estimate: 'the capped share at the start count (3-89 %) times the cap\'s cost less the screen\'s', source: 'report §4 (a formula)' },
  R18: { quantity: 'Canonical re-ratings per call and their share of work', estimate: 'priced in PM4 and PM3 (no number)', source: 'check-list §5' },
  R19: { quantity: 'Locate profiles per call with the table prior (P4)', estimate: '"2 to 6 profiles per candidate instead of up to 64" (plan P4); P4 x 1.05-1.15 (report §4)', source: 'plan P4, report §4' },
  R20: { quantity: 'Arity-3 set stage: probes counted, idealised call-level T1 bound', estimate: 'adopted only with a clear gain (IG-P-Q08)', source: 'IG-P-Q08' },
  R21: { quantity: 'P5 budget inputs: share of ok calls whose work passes 1 to 12 G units', estimate: 'the 6 G figure is withdrawn (IG-P-Q10)', source: 'IG-P-Q10' },
  R22: { quantity: 'P6 factor on T10', estimate: 'x 1.03-1.2 at Nightmare, x 1.15-1.6 at Master', source: 'plan P6; report §4' },
  R23: { quantity: 'Eight workers, unadmitted upper bound', estimate: 'batch x 1.3-1.9 (likely 1.6), set stage x 1.0-1.3', source: 'plan P8; report §4' },
  R24: { quantity: 'P7 sensitivity', estimate: 'x 1.1-1.8 (likely 1.3); PM2 first', source: 'plan P7; report §4' },
  R25: { quantity: 'First-phase factor P6 x P7 x P8 on T10 (Projection: P7 assumed)', estimate: '÷1.9 (Opus\'s illustrative assumption)', source: 'report §1, §2' },
  R26: { quantity: 'Memory at eight workers: both bench criteria', estimate: 'can exceed 1.5 GiB in the worst case (2,092 MiB accounted)', source: 'IG-P-Q05' },
  R27: { quantity: 'In-band ratings on Hell 1 at 215-484 cells, Hell 2, Hell 3 (score-in-band and AR1-eligible apart)', estimate: 'unknown: no in-band rating ever observed (report §2, IG-P-Q16)', source: 'report §2, IG-P-Q16' },
  R28: { quantity: 'Why Hell 1 sets fail on 14x14 and 24x24', estimate: 'unknown', source: 'report §2' },
  R29: { quantity: 'Capped share at the start count; window counts (14x14, 12x12, 26x26 Nightmare)', estimate: '0.89, 0.53, 0.10 (report §1, from MP12b1\'s samples)', source: 'report §1' },
  R30: { quantity: 'Rating-time shares by phase and function on 10x10 and 12x12 Nightmare', estimate: 'unknown; P7 and P11 targets (IG-P-Q12)', source: 'IG-P-Q12' },
  R31: { quantity: 'After all phases (Projection): measured P1-P5 ÷ (measured P6 x eight-worker bound, with a stated transfer range) ÷ P7 assumption', estimate: 'the analysts\' after-all values (Opus / Astra): 14x14 8.0 / 7.94 s, 15x15b10 6.3 / 7.22 s, 12x12 16 / 21.7 s, 26x26 7.0 / 8.84 s, Hell 1 26x26 15 / 25-30 s', source: 'Projection; report §2' },
  R32: { quantity: 'Population of the accepted puzzles, before (and MP12b1\'s 20 reps) against after: clue share p10 / median / p90, U, score position in the band, central share, per cell', estimate: 'the same population (implicit in both analyses\' factors)', source: 'check-list §5' },
  R33: { quantity: 'The split of P1-P5\'s gain and of the clue-count shift between the search without the screen and the screen (before → no screen → 190 M on 14x14 and 12x12 Nightmare), with the shift\'s two parts: requests served on an earlier set than today\'s; the clue shift on the same set', estimate: 'none in the analyses (added after IGP-02); IG-P-Q17\'s addendum gives a rough split, an indication only: on today\'s call profiles the screen alone saves 2.0 times on 12x12 and 4.0 on 14x14 Nightmare', source: 'IG-P-Q17 addendum after IGP-02' },
});
const ROW_IDS = Object.freeze(Object.keys(ESTIMATES));

// ---------------------------------------------------------------------------------------------------------------
// Records

/** The records a summary needs: [task, path under the task's folder, what it is]. */
const REQUIRED = Object.freeze([
  ['IGP-00', 'identity.json', 'identity of the harness (R00)'],
  ['IGP-01', 'compare.json', 'the headline comparison'],
  ['IGP-01', 'compare-r2.json', 'the corrected comparison and its populations'],
  ['IGP-02', 'pm4.json', 'the screen certificate'],
  ['IGP-03', 'compare.json', 'the PM3 variants'],
  ['IGP-03', 'budgets.json', 'the P5 budget inputs'],
  ['IGP-03h', 'compare.json', 'the no-screen arm on Hell 1'],
  ['IGP-04', 'compare.json', 'the first-phase factors'],
  ['IGP-05', 'pm1.json', 'PM1 tranche 1'],
  ['IGP-05', 'discoveries.jsonl', 'PM1 in-band ratings'],
  ['IGP-06', 'pm2.json', 'the rating profile'],
]);
/** Published arms whose runs and journals are read for R23 (the twin calls of B and C). */
const TWIN_ARMS = Object.freeze([['IGP-04', 'B'], ['IGP-04', 'C']]);

class MissingRecords extends Error {}

/** @param {string} file @returns {any} */
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
/** @param {string} file @returns {any[]} */
const readJsonl = (file) => readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => l.trim() !== '').map((l) => JSON.parse(l));

/**
 * @param {string} root Evidence folder of the label.
 * @returns {any} Every record read.
 */
function loadRecords(root) {
  const missing = [];
  const path = (/** @type {string} */ task, /** @type {string} */ name) => join(root, task, ...name.split('/'));
  for (const [task, name, what] of REQUIRED) {
    if (!existsSync(path(task, name))) {
      missing.push(`${task}: ${name} (${what})`);
    }
  }
  for (const [task, arm] of TWIN_ARMS) {
    const dir = path(task, arm);
    if (!existsSync(dir) || !readdirSync(dir).some((n) => n.endsWith('.runs.json'))) {
      missing.push(`${task}: ${arm}/*.runs.json and *.calls.jsonl (the published arm ${arm})`);
    }
  }
  if (missing.length > 0) {
    throw new MissingRecords(`required record missing, run its task first: ${missing.join('; ')}`);
  }
  const json = (/** @type {string} */ task, /** @type {string} */ name) => readJson(path(task, name));
  const optional = (/** @type {string} */ task, /** @type {string} */ name) => (existsSync(path(task, name)) ? json(task, name) : null);
  return {
    identity: json('IGP-00', 'identity.json'),
    igp01: json('IGP-01', 'compare.json'),
    igp01r2: json('IGP-01', 'compare-r2.json'),
    pm4: json('IGP-02', 'pm4.json'),
    igp03: json('IGP-03', 'compare.json'),
    budgets: json('IGP-03', 'budgets.json'),
    igp03h: json('IGP-03h', 'compare.json'),
    c5: optional('IGP-03h', 'c5/compare.json'),
    igp04: json('IGP-04', 'compare.json'),
    pm1: json('IGP-05', 'pm1.json'),
    discoveries: readJsonl(path('IGP-05', 'discoveries.jsonl')),
    pm2: json('IGP-06', 'pm2.json'),
    arms: Object.fromEntries(TWIN_ARMS.map(([task, arm]) => [arm, loadArm(path(task, arm))])),
  };
}

/**
 * @param {string} dir A published arm folder.
 * @returns {{ rows: any[], byRow: Map<string, any[]> }} Its runs and its calls assembled from the published journals.
 */
function loadArm(dir) {
  /** @type {any[]} */
  const rows = [];
  /** @type {any[]} */
  const lines = [];
  for (const name of readdirSync(dir).filter((n) => n.endsWith('.runs.json')).sort()) {
    const record = readJson(join(dir, name));
    rows.push(...record.rows);
    const journal = join(dir, `${record.shard}.calls.jsonl`);
    if (existsSync(journal)) {
      lines.push(...readJsonl(journal));
    }
  }
  /** @type {Map<string, any[]>} */
  const byRow = new Map();
  for (const call of assembleCalls(lines)) {
    byRow.set(call.row, [...(byRow.get(call.row) ?? []), call]);
  }
  return { rows, byRow };
}

// ---------------------------------------------------------------------------------------------------------------
// Formatting and statistics

/** @param {number | null | undefined} x @param {number} [d] @returns {string} */
const f = (x, d = 2) => (x === null || x === undefined || Number.isNaN(x) ? '-' : x.toFixed(d));
/** @param {number | null | undefined} ms @param {number} [d] @returns {string} */
const sec = (ms, d = 2) => (ms === null || ms === undefined ? '-' : (ms / 1000).toFixed(d));
/** @param {number | null | undefined} x @param {number} [d] @returns {string} */
const pct = (x, d = 1) => (x === null || x === undefined ? '-' : `${(100 * x).toFixed(d)} %`);
/** @param {number | null | undefined} x @returns {string} */
const mUnits = (x) => (x === null || x === undefined ? '-' : `${(x / 1e6).toFixed(1)} M`);
/** @param {any} r A ratio summary `{ n, median, min, max }`. @returns {string} */
const ratioText = (r) => (r === null || r === undefined || r.n === 0 ? '-' : `${f(r.median)} [${f(r.min)}-${f(r.max)}] n ${r.n}`);
/** @param {any} r A paired factor. @returns {string} The factor with its n; below n = 3 it is no factor estimate. */
const pairedText = (r) => (r === null || r === undefined || r.n === 0 ? '- (no factor estimate)' : `${ratioText(r)}${r.n < MIN_N ? ' (no factor estimate)' : ''}`);
/** @param {number} x @param {[number, number]} range @returns {string} The signed distance of x from the nearer edge of the range (negative below it). */
function marginText(x, range) {
  const m = x < range[0] ? x - range[0] : x > range[1] ? x - range[1] : Math.min(x - range[0], range[1] - x);
  return `${m >= 0 ? '+' : '-'}${Math.abs(m).toFixed(3)}`;
}
/** @param {number[]} v @returns {number} */
const sum = (v) => v.reduce((s, x) => s + x, 0);
/** @param {any[]} v @returns {number[]} */
const nums = (v) => v.filter((x) => typeof x === 'number' && Number.isFinite(x));
/** @param {number} n @returns {string} */
const withCommas = (n) => Math.round(n).toLocaleString('en-US');
/** @param {string} id @returns {string} The level of a cell id. */
const levelOf = (id) => (/-master$/.test(id) ? 'Master' : /-nightmare$/.test(id) ? 'Nightmare' : id);
/** @param {string} id @returns {string} A cell id as a short name. */
const cellName = (id) => id.replace(/-nightmare$/, ' Nightmare').replace(/-master$/, ' Master').replace(/-hell-(\d)$/, ' Hell $1').replace(/^(\d+x\d+)(b10)? /, '$1$2 ');

/**
 * A time verdict (check-list §5): below both, between (each analyst's value widened by 1.35) or above both, and
 * inconclusive with fewer than three after-arm values.
 * @param {{ n: number, median: number | null } | null | undefined} t10 T10 statistics in ms.
 * @param {number[]} values The analysts' values in seconds.
 * @returns {{ label: string, why: string }}
 */
function timeVerdict(t10, values) {
  if (t10 === null || t10 === undefined || t10.n === 0 || t10.median === null) {
    return { label: 'inconclusive', why: 'no request reached ten' };
  }
  if (t10.n < MIN_N) {
    return { label: 'inconclusive', why: `n ${t10.n} request(s) reached ten, fewer than ${MIN_N}` };
  }
  const lo = Math.min(...values) / WIDEN;
  const hi = Math.max(...values) * WIDEN;
  const s = t10.median / 1000;
  const label = s < lo ? 'below both' : s > hi ? 'above both' : 'between';
  return { label, why: `${f(s)} s against ${f(lo)} to ${f(hi)} s (the analysts' values ${values.map((v) => f(v, 2)).join(', ')} widened by ${WIDEN})` };
}

/**
 * A range verdict: inside or outside a stated range, with the margin to the nearer edge (never rounded across it).
 * @param {number | null | undefined} x
 * @param {[number, number]} range
 * @returns {{ label: string, why: string }}
 */
function rangeVerdict(x, range) {
  if (x === null || x === undefined || Number.isNaN(x)) {
    return { label: 'inconclusive', why: 'no value' };
  }
  const side = x < range[0] ? ', below it' : x > range[1] ? ', above it' : '';
  return { label: x >= range[0] && x <= range[1] ? 'inside' : 'outside', why: `${f(x, 3)} against ${range[0]}-${range[1]}${side} (margin ${marginText(x, range)})` };
}

/**
 * A point value widened like the analysts' times (ruling on R12): below, inside or above the band `value / 1.35` to
 * `value x 1.35`.
 * @param {number | null | undefined} x
 * @param {number} value
 * @returns {{ label: string, why: string }}
 */
function bandVerdict(x, value) {
  if (x === null || x === undefined || Number.isNaN(x)) {
    return { label: 'inconclusive', why: 'no value' };
  }
  const lo = value / WIDEN;
  const hi = value * WIDEN;
  return { label: x < lo ? 'below' : x > hi ? 'above' : 'inside', why: `${f(x, 2)} against ${f(lo, 2)}-${f(hi, 2)} (${value} widened by ${WIDEN})` };
}

/**
 * @param {Record<string, { label: string, why: string }>} perCell
 * @returns {string} One label when every entry agrees, else the entries joined.
 */
function joinLabels(perCell) {
  const labels = Object.values(perCell).map((v) => v.label);
  return new Set(labels).size === 1 ? labels[0] : Object.entries(perCell).map(([k, v]) => `${k}: ${v.label}`).join('; ');
}

// ---------------------------------------------------------------------------------------------------------------
// Rows

/** @typedef {{ label: string, why?: string, perCell?: Record<string, { label: string, why: string }> }} Verdict */
/** @typedef {{ measured: any, text: string, completion: string | null, kind: string, formula: string, record: string, verdict: Verdict, detail?: string[] }} Built */

/** @param {any} D @returns {Record<string, any>} The cells of IGP-01's headline pair. */
const headlineCells = (D) => D.igp01.pairs[0].cells;

/**
 * The population of the accepted puzzles beside a time verdict (R32): clue share, clues and score medians.
 * @param {any} D
 * @param {string} cell
 */
function populationBeside(D, cell) {
  const p = D.igp01r2.populations[cell];
  if (p === undefined) {
    return null;
  }
  return {
    puzzles: { mp12b1: p.mp12b1.puzzles, after: p.after.puzzles },
    clueShareMedian: { mp12b1: p.mp12b1.share.median, after: p.after.share.median },
    cluesMedian: { mp12b1: p.mp12b1.clues.median, after: p.after.clues.median },
    scoreMedian: { mp12b1: p.mp12b1.score.median, after: p.after.score.median },
  };
}

/** @param {any} pop @returns {string} */
const populationText = (pop) => (pop === null ? 'population n/a' : `population (R32): clue share median ${f(pop.clueShareMedian.mp12b1, 3)} today -> ${f(pop.clueShareMedian.after, 3)} after, clues ${f(pop.cluesMedian.mp12b1, 1)} -> ${f(pop.cluesMedian.after, 1)}, score ${f(pop.scoreMedian.mp12b1, 1)} -> ${f(pop.scoreMedian.after, 1)}`);

/** @param {{ before: number, after: number, of: number }} c @returns {string} */
const completionText = (c) => `ten of n: before ${c.before} of ${c.of}, after ${c.after} of ${c.of}`;

/** @param {any} D @returns {Built} */
function rowR00(D) {
  const id = D.identity.summary;
  const cells = headlineCells(D);
  /** @type {Record<string, number>} */
  const levels01 = {};
  let seeds01 = 0;
  for (const c of Object.values(cells)) {
    for (const i of c.identity) {
      levels01[i.level] = (levels01[i.level] ?? 0) + 1;
      seeds01 += 1;
    }
  }
  /** @type {Record<string, number>} */
  const levels04 = {};
  let seeds04 = 0;
  for (const list of Object.values(D.igp04.identityMp12b1.A)) {
    for (const i of /** @type {any[]} */ (list)) {
      levels04[i.level] = (levels04[i.level] ?? 0) + 1;
      seeds04 += 1;
    }
  }
  const repro = D.igp04.reproduction;
  const failures = [...D.identity.failures, ...D.igp01.failures, ...D.igp04.failures];
  const sameSource = D.identity.meta.source.equalsMp12b1Source === true;
  const tally = (/** @type {Record<string, number>} */ t) => Object.entries(t).map(([k, v]) => `${v} ${k}`).join(', ');
  const verdict = !sameSource ? { label: 'different source', why: 'the source digest differs from MP12b1\'s: identity is not compared' }
    : failures.length === 0 && id.failures === 0 && repro.ok === true ? { label: 'holds', why: `no identity failure in IGP-00 (${id.seeds} seeds), IGP-01 (${seeds01}), IGP-04 (${seeds04}); arm E reproduces IGP-01's after arm` }
      : { label: 'fails', why: `${failures.length} failure(s) recorded` };
  const detail = ['**Identity level reached on each seed**', '', '| Source | Seed | Pair | Level reached | Note |', '|---|---|---|---|---|'];
  for (const s of D.identity.seeds) {
    for (const [pair, r] of Object.entries(s.pairs)) {
      detail.push(`| IGP-00 | ${s.seed} | ${pair} | ${/** @type {any} */ (r).level} | ${/** @type {any} */ (r).note} |`);
    }
  }
  for (const [cell, c] of Object.entries(cells)) {
    for (const i of c.identity) {
      detail.push(`| IGP-01 | ${i.seed} | before~MP12b1 (${cellName(cell)}) | ${i.level} | ${i.note ?? ''} |`);
    }
  }
  for (const [cell, list] of Object.entries(D.igp04.identityMp12b1.A)) {
    for (const i of /** @type {any[]} */ (list)) {
      detail.push(`| IGP-04 | ${i.seed} | A~MP12b1 (${cellName(cell)}) | ${i.level} | ${i.note ?? ''} |`);
    }
  }
  for (const s of repro.perSeed) {
    detail.push(`| IGP-04 | ${s.seed} | E~IGP-01/after (${cellName(s.caseId)}) | ${s.ok ? 'puzzle-identity' : 'differs'} | ${s.note ?? ''} |`);
  }
  return {
    measured: {
      igp00: { seeds: id.seeds, puzzleIdentity: id.puzzleIdentity, metricPrefixOnly: id.metricPrefixOnly, failures: id.failures, medianRatioBase: id.medianRatioBase, medianRatioLog: id.medianRatioLog, medianLogOverhead: id.medianLogOverhead },
      igp01BeforeVsMp12b1: { seeds: seeds01, levels: levels01 }, igp04ArmAVsMp12b1: { seeds: seeds04, levels: levels04 },
      igp04EReproducesIgp01After: { ok: repro.ok, seeds: repro.perSeed.length },
    },
    text: `IGP-00: ${id.seeds} seeds, puzzle identity on ${id.puzzleIdentity}, metric-prefix only ${id.metricPrefixOnly}, failures ${id.failures}; median time ratios base/MP12b1 ${f(id.medianRatioBase, 3)}, log/MP12b1 ${f(id.medianRatioLog, 3)}, log/base ${f(id.medianLogOverhead, 3)}. IGP-01 before arm against MP12b1: ${seeds01} seeds (${tally(levels01)}). IGP-04 arm A against MP12b1: ${seeds04} seeds (${tally(levels04)}). Arm E reproduces IGP-01's after arm on ${repro.perSeed.length} seeds: ${repro.ok ? 'yes' : 'NO'}. The level reached on each seed is in the R00 detail.`,
    completion: null, kind: 'Measured', formula: 'level of identity per seed and pair (`comparePair`): puzzle identity by digest or keys, else metric-prefix agreement; failures recorded by the three tasks',
    record: 'IGP-00 `identity.json`; IGP-01 `compare.json` (identity); IGP-04 `compare.json` (`identityMp12b1`, `reproduction`)',
    verdict: { ...verdict, why: `${verdict.why}. Rule: ${RULES.R00.rule}` },
    detail,
  };
}

/** @param {any} D @returns {Built} */
function rowR01(D) {
  const cell = headlineCells(D)['14x14-nightmare'];
  const v = D.igp01.rows.R01.value['14x14-nightmare'];
  const verdict = timeVerdict(v.reRunBefore, RULES.R01.values);
  return {
    measured: { today: v.today, todayRequests: cell.mp12b1.all.requests, reRunBeforeT10: v.reRunBefore, reached: v.reached, responseDriftMedian: v.responseDriftMedian },
    text: `MP12b1 ${sec(v.today.median)} / ${sec(v.today.p95)} s (ten of ${cell.mp12b1.all.requests}: ${v.today.n}); re-run on reps 0-2: T10 median ${sec(v.reRunBefore.median)} s (n ${v.reRunBefore.n}), ten of n ${v.reached}; response drift against MP12b1 (median of before / MP12b1 on the same seeds) ${f(v.responseDriftMedian, 3)}`,
    completion: `ten of n: ${v.reached}`, kind: D.igp01.rows.R01.kind, formula: D.igp01.rows.R01.formula,
    record: 'IGP-01 `compare.json` (R01)',
    verdict: { label: verdict.label, why: `${verdict.why}; response drift ${f(v.responseDriftMedian, 3)} beside. Rule: ${RULES.R01.rule}, one value` },
  };
}

/** @param {any} D @param {'R02' | 'R04' | 'R05' | 'R06' | 'R08'} id @returns {Built} */
function rowHeadline(D, id) {
  const spec = /** @type {{ cell: string, values: number[] }} */ (RULES[id]);
  const cell = headlineCells(D)[spec.cell];
  const source = D.igp01.rows[id];
  const t10 = cell.after.t10;
  const verdict = timeVerdict(t10, spec.values);
  const p = cell.paired;
  const pop = populationBeside(D, spec.cell);
  const marks = p.fewerPuzzles.length > 0 ? ` Fewer puzzles delivered in the after arm: ${p.fewerPuzzles.join('; ')}.` : '';
  return {
    measured: { cell: spec.cell, afterT10Ms: t10, pairedT10Ratio: p.t10Ratio, pairedResponseRatio: p.responseRatio, completion: p.completion, fewerPuzzles: p.fewerPuzzles, population: pop },
    text: `${cellName(spec.cell)}: after T10 median ${sec(t10.median)} s (n ${t10.n}, p95 ${sec(t10.p95)}); paired T10 ratio ${pairedText(p.t10Ratio)}; paired response ratio ${pairedText(p.responseRatio)}; ${populationText(pop)}.${marks}`,
    completion: completionText(p.completion), kind: source.kind, formula: source.formula,
    record: `IGP-01 \`compare.json\` (${id}), \`compare-r2.json\` (population)`,
    verdict: { label: verdict.label, why: `${verdict.why}. Rule: ${RULES[id].rule} (check-list §5; after-arm n ${t10.n}, paired n ${p.t10Ratio.n})` },
  };
}

/** @param {any} D @returns {Built} */
function rowR03(D) {
  const value = D.igp01.rows.R03.value;
  const range = /** @type {[number, number]} */ (RULES.R03.range);
  /** @type {Record<string, { label: string, why: string }>} */
  const perCell = {};
  for (const [cell, v] of Object.entries(value)) {
    const [reached, of] = String(v.after).split(' of ').map(Number);
    perCell[cellName(cell)] = { ...rangeVerdict(reached / of, range), why: `after ${v.after} (${pct(reached / of, 0)}, n ${of}) against Opus 19-20 of 20 (${range[0] * 100}-${range[1] * 100} %)` };
  }
  return {
    measured: value,
    text: `${Object.entries(value).map(([cell, v]) => `${cellName(cell)}: before ${v.before}, after ${v.after} (n ${String(v.after).split(' of ')[1]}; censored ${v.censored})`).join('; ')}. Caveats: three requests cannot separate 19 from 20 of 20, and completion after P1-P5 is only a lower bound for the after-all completion Opus estimated`,
    completion: 'ten of n, reps 0-2', kind: D.igp01.rows.R03.kind, formula: D.igp01.rows.R03.formula,
    record: 'IGP-01 `compare.json` (R03)',
    verdict: { label: joinLabels(perCell), perCell, why: `Rule: ${RULES.R03.rule}, inside or outside (check-list §5)` },
  };
}

/** @param {any} D @returns {Built} */
function rowR07(D) {
  const cells = headlineCells(D);
  /** @type {Record<string, { label: string, why: string }>} */
  const perCell = {};
  /** @type {Record<string, any>} */
  const measured = {};
  const parts = [];
  for (const id of ['14x14-master', '26x26-master']) {
    const c = cells[id];
    const ref = c.before.t10.median / 1000;
    const v = timeVerdict(c.after.t10, [ref]);
    perCell[cellName(id)] = { ...v, why: `${v.why.replace("the analysts' values", 'the before arm on the same seeds')}` };
    measured[id] = { mp12b1T10Ms: c.mp12b1.all.t10, beforeT10Ms: c.before.t10, afterT10Ms: c.after.t10, pairedT10Ratio: c.paired.t10Ratio, completion: c.paired.completion, population: populationBeside(D, id) };
    parts.push(`${cellName(id)}: after T10 median ${sec(c.after.t10.median)} s (n ${c.after.t10.n}) against the before arm on the same seeds ${f(ref)} s; MP12b1's 20-rep median ${sec(c.mp12b1.all.t10.median)} s beside (cohort drift ${f(ref / (c.mp12b1.all.t10.median / 1000))} x); paired T10 ratio ${pairedText(c.paired.t10Ratio)}; ${completionText(c.paired.completion)}; ${populationText(populationBeside(D, id))}`);
  }
  const w380 = D.igp03.rows.R16.value['26x26-master'].perW.find((/** @type {any} */ r) => r.role === 'w380');
  const ref26 = cells['26x26-master'].before.t10.median / 1000;
  const v380 = timeVerdict(w380.t10, [ref26]);
  perCell['26x26 Master at 380 M'] = { ...v380, why: v380.why.replace("the analysts' values", 'the before arm on the same seeds') };
  measured['26x26-master-380M'] = { t10Ms: w380.t10, reached: w380.reached, perSeed: D.igp03.rows.R07.value['26x26-master'] };
  const r380 = D.igp03.rows.R07.value['26x26-master'];
  parts.push(`26x26 Master at 380 M (IGP-03): T10 median ${sec(w380.t10.median)} s (n ${w380.t10.n}, ten of n: ${w380.reached}) against the same before arm ${f(ref26)} s; per-seed before / 190 M ${pairedText(r380.beforeOverMain)}, before / 380 M ${pairedText(r380.beforeOverW380)} (geometric mean ${f(r380.beforeOverW380.geoMean)}, n ${r380.beforeOverW380.n}), 190 M / 380 M ${pairedText(r380.mainOverW380)}`);
  return {
    measured, text: parts.join('. '), completion: `14x14: ${completionText(cells['14x14-master'].paired.completion)}; 26x26: ${completionText(cells['26x26-master'].paired.completion)}`,
    kind: D.igp01.rows.R07.kind, formula: `${D.igp01.rows.R07.formula}; ${D.igp03.rows.R07.formula}`,
    record: 'IGP-01 `compare.json` (R07), `compare-r2.json`; IGP-03 `compare.json` (R07, R16)',
    verdict: { label: joinLabels(perCell), perCell, why: `Rule: ${RULES.R07.rule}` },
  };
}

/** @param {any} D @returns {Built} */
function rowR10(D) {
  const value = D.igp01.rows.R10.value;
  const ranges = /** @type {Record<string, [number, number]>} */ (RULES.R10.ranges);
  /** @type {Record<string, { label: string, why: string }>} */
  const perCell = {};
  const parts = [];
  for (const [cell, v] of Object.entries(value)) {
    const range = ranges[cell];
    parts.push(`${cellName(cell)}: batch ${pct(v.batch.timeShare)} of the time (${v.batch.callsWithP2} of ${v.batch.calls} calls), set ${pct(v.set.timeShare)} (${v.set.callsWithP2} of ${v.set.calls}), both ${pct(v.both.timeShare)}`);
    perCell[cellName(cell)] = range === undefined ? { label: 'measured (no estimate)', why: 'no estimate for this cell' } : { ...rangeVerdict(v.batch.timeShare, range), why: `batch share ${pct(v.batch.timeShare)} against ${range[0] * 100}-${range[1] * 100} %` };
  }
  return {
    measured: value, text: parts.join('; '), completion: null, kind: D.igp01.rows.R10.kind, formula: D.igp01.rows.R10.formula,
    record: 'IGP-01 `compare.json` (R10, the before arm)',
    verdict: { label: joinLabels(perCell), perCell, why: 'Rule: a stated range, inside or outside (check-list §5); the batch share of the profile time is judged (30-60 % on 196-300 cells, 15x15b10 with its 215 cells included; 5-10 % on 12x12); cells outside the estimate carry none' },
  };
}

/** @param {any} D @returns {Built} */
function rowR11(D) {
  const value = D.igp01.rows.R11.value;
  const entries = Object.entries(value).map(([cell, v]) => ({ cell, entries: /** @type {any} */ (v).both.p2Tuples, calls: /** @type {any} */ (v).both.calls }));
  const total = sum(entries.map((e) => e.entries));
  return {
    measured: value, text: `${entries.map((e) => `${cellName(e.cell)}: ${e.entries} dead-end tuples in ${e.calls} calls`).join('; ')}; ${total} in all`,
    completion: null, kind: D.igp01.rows.R11.kind, formula: D.igp01.rows.R11.formula, record: 'IGP-01 `compare.json` (R11, the after arm)',
    verdict: { label: total === 0 ? 'holds' : 'fails', why: `${total} dead-end entries in the after arm on ${entries.length} cells. Rule: the hypothesis "none", holds or fails` },
  };
}

/** @param {any} D @returns {Built} */
function rowR12(D) {
  const value = D.igp01.rows.R12.value;
  const point = /** @type {number} */ (RULES.R12.value);
  /** @type {Record<string, { label: string, why: string }>} */
  const perCell = {};
  for (const [cell, v] of Object.entries(value)) {
    const after = /** @type {any} */ (v).after;
    perCell[cellName(cell)] = { ...bandVerdict(after.mean, point), why: `mean ${bandVerdict(after.mean, point).why}; median ${f(after.median, 0)} beside` };
  }
  return {
    measured: value,
    text: `${Object.entries(value).map(([cell, v]) => `${cellName(cell)}: after mean ${f(/** @type {any} */ (v).after.mean, 2)} / median ${f(/** @type {any} */ (v).after.median, 0)} (p90 ${/** @type {any} */ (v).after.p90}, max ${/** @type {any} */ (v).after.max}; ${/** @type {any} */ (v).after.okCalls} ok calls); before, all tuples, mean ${f(/** @type {any} */ (v).before.mean, 2)} / median ${f(/** @type {any} */ (v).before.median, 0)}`).join('; ')}. "About four" widened by ${WIDEN} is ${f(point / WIDEN, 2)}-${f(point * WIDEN, 2)}`,
    completion: null, kind: D.igp01.rows.R12.kind, formula: D.igp01.rows.R12.formula, record: 'IGP-01 `compare.json` (R12)',
    verdict: { label: joinLabels(perCell), perCell, why: `Rule: ${RULES.R12.rule}; the mean is judged, the median is beside it` },
  };
}

/** @param {any} D @returns {Built} */
function rowR13(D) {
  const value = D.igp01.rows.R13.value;
  const values = /** @type {number[]} */ (RULES.R13.values);
  /** @type {Record<string, { label: string, why: string }>} */
  const perCell = {};
  for (const [cell, v] of Object.entries(value)) {
    const after = /** @type {any} */ (v).after;
    const lo = Math.min(...values) / WIDEN;
    const hi = Math.max(...values) * WIDEN;
    perCell[cellName(cell)] = after.n < MIN_N ? { label: 'inconclusive', why: `${after.n} value(s), fewer than ${MIN_N}` }
      : { label: after.median < lo ? 'below both' : after.median > hi ? 'above both' : 'between', why: `${f(after.median)} against ${f(lo)} to ${f(hi)} waves (${values.join(' and ')} widened by ${WIDEN})` };
  }
  return {
    measured: value,
    text: Object.entries(value).map(([cell, v]) => `${cellName(cell)}: after median ${f(/** @type {any} */ (v).after.median)} (n ${/** @type {any} */ (v).after.n}, p90 ${f(/** @type {any} */ (v).after.p90)}), before ${f(/** @type {any} */ (v).before.median)} (n ${/** @type {any} */ (v).before.n})`).join('; '),
    completion: null, kind: D.igp01.rows.R13.kind, formula: D.igp01.rows.R13.formula, record: 'IGP-01 `compare.json` (R13)',
    verdict: { label: joinLabels(perCell), perCell, why: `Rule: ${RULES.R13.rule} (below both, between, above both, widened by ${WIDEN}; at least ${MIN_N} requests)` },
  };
}

/** @param {any} D @returns {Built} */
function rowR14(D) {
  const cert = D.pm4.certificate;
  const gaps = cert.coverage.gaps;
  const holds = cert.violations.length === 0;
  const cov = cert.coverage;
  return {
    measured: { violations: cert.violations.length, certifiedRuns: cert.certifiedRuns, equalCanonical: cov.equalCanonical, coverage: { certified: cov.certified.runs, over: cov.over.runs, scap1: cov.scap1.runs, scap0: cov.scap0.runs, r7Cut: cov.r7Cut.runs }, gaps, r7CutCensus: cert.r7CutCensus.runs },
    text: `${cert.violations.length} violations over ${cert.certifiedRuns} certified runs (equal canonical ${cov.equalCanonical.certified.equal} of ${cov.equalCanonical.certified.of}); coverage: overshoots ${cov.over.runs} (equal ${cov.equalCanonical.over.equal} of ${cov.equalCanonical.over.of}), caps after the first solution ${cov.scap1.runs}, caps before it ${cov.scap0.runs}, R7 cuts in the main search ${cov.r7Cut.runs} (none certified); census cuts ${cert.r7CutCensus.runs} apart; coverage gaps: ${gaps.length === 0 ? 'none' : gaps.join('; ')}`,
    completion: null, kind: 'Measured', formula: 'every certified screen run (main work <= W) deep-equal to its canonical rating; named cases observed', record: 'IGP-02 `pm4.json` (`certificate`)',
    verdict: { label: holds ? 'holds' : 'fails', why: `${cert.violations.length} violations; coverage gaps: ${gaps.length === 0 ? 'none' : gaps.join('; ')}. Rule: 0 violations required (check-list §5)` },
  };
}

/** @param {any} D @returns {{ ws: string[], pooled: any, cells: Record<string, any> }} */
function pm4PerW(D) {
  const ws = D.pm4.W.map(String);
  return { ws, pooled: D.pm4.pooled.perW, cells: D.pm4.cells };
}

/** @param {any} D @returns {Built} */
function rowR15(D) {
  const { ws, pooled, cells } = pm4PerW(D);
  const label = (/** @type {string} */ w) => `${Number(w) / 1e6} M`;
  const pooledText = ws.map((w) => `${label(w)} ${pooled[w].usefulLost.n} of ${pooled[w].usefulLost.of} (${pct(pooled[w].usefulLost.share, 0)})`).join(', ');
  const byCell = Object.fromEntries(Object.entries(cells).map(([cell, c]) => [cell, Object.fromEntries(ws.map((w) => [label(w), /** @type {any} */ (c).perW[w].usefulLost]))]));
  const cellText = Object.entries(byCell).map(([cell, v]) => `${cellName(cell)} ${ws.map((w) => `${/** @type {any} */ (v)[label(w)].n}/${/** @type {any} */ (v)[label(w)].of}`).join(' / ')}`).join('; ');
  const window = ws.map((w) => `${label(w)} ${pooled[w].window?.usefulLost?.n ?? '-'}`).join(', ');
  return {
    measured: { pooled: Object.fromEntries(ws.map((w) => [label(w), pooled[w].usefulLost])), byCell, windowProfilesLost: pooled[ws[0]].window?.usefulLost === undefined ? null : Object.fromEntries(ws.map((w) => [label(w), pooled[w].window.usefulLost])) },
    text: `useful ratings lost on today's call profiles, pooled over ${Object.keys(cells).length} cells: ${pooledText}; per cell at ${ws.map(label).join(' / ')}: ${cellText}${pooled[ws[0]].window?.usefulLost === undefined ? '' : `; window profiles lost ${window} (of ${pooled[ws[0]].window.usefulLost.of})`}`,
    completion: null, kind: 'Measured; Derived', formula: 'useful = a complete canonical rating in the band, not refused by AR1; lost at W when its screen is screen-capped', record: 'IGP-02 `pm4.json` (`pooled.perW`, `cells.<case>.perW`)',
    verdict: { label: 'measured (no estimate)', why: 'the estimate is qualitative ("95 M is low for Nightmare"); no §5 rule applies' },
  };
}

/** @param {any} D @returns {Built} */
function rowR16(D) {
  /** @type {Record<string, any>} */
  const cells = {};
  /** @type {[string, string, any][]} Key, label and record of each block's source. */
  const sources = [['IGP-03', 'IGP-03', D.igp03], ['IGP-03h', 'IGP-03h', D.igp03h]];
  if (D.c5 !== null) {
    sources.push(['IGP-03h-c5', 'IGP-03h c5, paired by seed', D.c5]);
  }
  const text = [];
  const armName = (/** @type {any} */ r) => (r.role === 'before' ? 'today (IGP-01 before)' : r.W === 760000000 ? 'no screen' : `${r.W / 1e6} M`);
  for (const [key, label, rec] of sources) {
    for (const [cell, v] of Object.entries(rec.rows.R16.value)) {
      const perW = /** @type {any[]} */ (/** @type {any} */ (v).perW);
      const requests = perW.map((r) => Number(String(r.reached).split(' of ')[1]));
      const paired = new Set(requests).size === 1;
      const least = paired && perW.length > 1 ? /** @type {any} */ (v).least : null;
      (cells[cell] ??= {})[key] = perW.map((r) => ({ role: r.role, W: r.W, reached: r.reached, t10Ms: r.t10, workWithSet: r.workWithSet, workWithoutSet: r.workWithoutSet }));
      cells[cell][`${key}-least`] = least;
      text.push(`${cellName(cell)} (${label}): ${perW.map((r) => `${armName(r)} ${mUnits(r.workWithSet)} units per accepted puzzle (T10 median ${sec(r.t10.median)} s, n ${r.t10.n}; ten of n ${r.reached})`).join(', ')}${paired ? '' : ` (seed sets differ: requests ${requests.join(' / ')}; medians not paired)`}; least: ${least ?? '-'}`);
    }
  }
  const six = twelveBySeed(D);
  const fallback = D.igp03.rows.R33.value['12x12-nightmare'].factors.find((/** @type {any} */ x) => x.from === 'w760' && x.to === 'main');
  const screen = six === null ? { ratio: fallback.t10, geoMean: null, seeds: fallback.t10.n } : { ratio: six.t10Ratio, geoMean: six.t10Ratio.geoMean, seeds: six.seeds };
  cells['12x12-nightmare-screenFactor'] = { seeds: screen.seeds, noScreenOver190M: screen.ratio };
  text.push(`12x12 Nightmare, the screen's own factor (no screen / 190 M, ${screen.seeds} seeds): x${f(screen.ratio.median)} (n ${screen.ratio.n}${screen.geoMean === null ? '' : `, geometric mean ${f(screen.geoMean)}`}) against the estimate "P2 gives about nothing"`);
  return {
    measured: cells, text: text.join('; '), completion: null, kind: D.igp03.rows.R16.kind, formula: D.igp03.rows.R16.formula,
    record: `IGP-03 \`compare.json\` (R16); IGP-03h \`compare.json\` (R16)${D.c5 === null ? '' : '; IGP-03h `c5/compare.json` (R16)'}`,
    verdict: { label: 'measured (no estimate)', why: 'the estimate is qualitative (the minimiser picks W); no W is recommended; no §5 rule applies' },
  };
}

/** @param {any} D @returns {Built} */
function rowR17(D) {
  const { ws, pooled, cells } = pm4PerW(D);
  const label = (/** @type {string} */ w) => `${Number(w) / 1e6} M`;
  const saving = Object.fromEntries(ws.map((w) => [label(w), pooled[w].cost.saving]));
  const perCell = Object.fromEntries(Object.entries(cells).map(([cell, c]) => [cell, { startCountCappedShare: /** @type {any} */ (c).startCountCappedShare, saving: Object.fromEntries(ws.map((w) => [label(w), /** @type {any} */ (c).perW[w].cost.saving])) }]));
  const capped = (/** @type {any} */ x) => (typeof x === 'number' ? pct(x, 0) : x?.share !== undefined ? pct(x.share, 0) : '-');
  return {
    measured: { pooledSaving: saving, perCell },
    text: `P2's saving (1 / net cost ratio) on today's call profiles, pooled: ${ws.map((w) => `${label(w)} ${f(saving[label(w)], 1)} x`).join(', ')}; per cell (capped share at the start count; saving at ${ws.map(label).join(' / ')}): ${Object.entries(perCell).map(([cell, v]) => `${cellName(cell)} (${capped(/** @type {any} */ (v).startCountCappedShare)}; ${ws.map((w) => f(/** @type {any} */ (v).saving[label(w)], 1)).join(' / ')})`).join('; ')}`,
    completion: null, kind: 'Derived', formula: 'P2 saving = 1 / net ratio; net = (sum of screen ms + canonical ms of the lost useful ratings, each re-rated once) / sum of canonical ms', record: 'IGP-02 `pm4.json` (`pooled.perW`, `cells`)',
    verdict: { label: 'measured (no estimate)', why: 'the estimate is a formula, not a number; no §5 rule applies' },
  };
}

/** @param {any} D @returns {Built} */
function rowR18(D) {
  const r01 = D.igp01.rows.R18.value;
  let finished = sum(Object.values(r01).map((v) => /** @type {any} */ (v).callsFinished));
  let maxPerCall = Math.max(...Object.values(r01).map((v) => /** @type {any} */ (v).perCallMax));
  let maxWork = Math.max(...Object.values(r01).map((v) => /** @type {any} */ (v).workShare));
  let reRated = 0;
  for (const src of [D.igp03.rows.R18.value, D.igp03h.rows.R18.value]) {
    for (const roles of Object.values(src)) {
      for (const r of /** @type {any[]} */ (roles)) {
        if (r.rerates !== null) {
          finished += r.rerates.callsFinished;
          maxPerCall = Math.max(maxPerCall, r.rerates.perCallMax);
          maxWork = Math.max(maxWork, r.rerates.workShare);
        }
        reRated += r.reRated.n;
      }
    }
  }
  return {
    measured: { callsFinished: finished, maxReratesPerCall: maxPerCall, maxWorkShare: maxWork, reRatedProbes: reRated, igp01: r01 },
    text: `${maxPerCall === 0 && reRated === 0 ? 'no call re-rated' : `up to ${maxPerCall} re-ratings per call`} in ${withCommas(finished)} finished calls of every prototype arm (IGP-01 after arm on ${Object.keys(r01).length} cells; IGP-03 and IGP-03h arms); re-ratings' share of the work at most ${pct(maxWork)}; re-rated probes in band ${reRated}`,
    completion: null, kind: D.igp01.rows.R18.kind, formula: D.igp01.rows.R18.formula, record: 'IGP-01 `compare.json` (R18); IGP-03 and IGP-03h `compare.json` (R18)',
    verdict: { label: 'measured (no estimate)', why: 'the estimate says "no number"' },
  };
}

/** @param {any} D @returns {Built} */
function rowR19(D) {
  const value = D.igp01.rows.R19.value;
  const range = /** @type {[number, number]} */ (RULES.R19.range);
  /** @type {Record<string, { label: string, why: string }>} */
  const perCell = {};
  for (const [cell, v] of Object.entries(value)) {
    const median = /** @type {any} */ (v).probes.median;
    const r = rangeVerdict(median, range);
    perCell[cellName(cell)] = { ...r, why: `median ${median} locate probes per call against ${range[0]}-${range[1]}${median < range[0] ? ' (below: the prior hits at once)' : ''}` };
  }
  return {
    measured: value,
    text: `${Object.entries(value).map(([cell, v]) => `${cellName(cell)}: ${/** @type {any} */ (v).probes.median} / ${/** @type {any} */ (v).probes.p90} / ${/** @type {any} */ (v).probes.max} locate probes per call (median / p90 / max; ${/** @type {any} */ (v).calls} calls; results ${Object.entries(/** @type {any} */ (v).results).map(([k, n]) => `${k} ${n}`).join(', ')}; no-window proofs ${/** @type {any} */ (v).results['no-window'] ?? 0}; rescues ${/** @type {any} */ (v).callsWithRescue})`).join('; ')}. The P4 factor x1.05-1.15 is not isolated in any arm: not measured, no verdict`,
    completion: null, kind: D.igp01.rows.R19.kind, formula: D.igp01.rows.R19.formula, record: 'IGP-01 `compare.json` (R19)',
    verdict: { label: joinLabels(perCell), perCell, why: `Rule: ${RULES.R19.rule} (${range[0]} to ${range[1]} profiles), inside or outside, on the median locate probes per call` },
  };
}

/** @param {any} D @returns {Built} */
function rowR20(D) {
  const value = D.igp03.rows.R20.value;
  /** @type {Record<string, any>} */
  const parts = {};
  const text = [];
  for (const [cell, v] of Object.entries(value)) {
    const main = /** @type {any} */ (v).setStage.main;
    const a3 = /** @type {any} */ (v).setStage.a3;
    const bound = /** @type {any} */ (v).idealisedT1Bound;
    const t1 = /** @type {any} */ (v).t1;
    parts[cell] = { probesPerCallMean: { main: main.probesPerCallMean, a3: a3.probesPerCallMean }, wastedProbes: a3.wastedProbes, rounds: a3.rounds, idealisedT1BoundMs: bound, t1Ms: t1, boundOverMain: bound.median / t1.main.median };
    text.push(`${cellName(cell)}: set-stage probes per finished call ${f(main.probesPerCallMean, 2)} (main) / ${f(a3.probesPerCallMean, 2)} (a3, ${a3.wastedProbes} wasted, ${a3.rounds} rounds); idealised T1 bound ${sec(bound.median)} s against measured T1 ${sec(t1.main.median)} s (main) / ${sec(t1.a3.median)} s (a3), bound / main ${f(bound.median / t1.main.median, 2)}`);
  }
  return {
    measured: parts, text: `${text.join('; ')}. No clear gain: nothing adopted`, completion: null, kind: D.igp03.rows.R20.kind, formula: D.igp03.rows.R20.formula, record: 'IGP-03 `compare.json` (R20)',
    verdict: { label: 'measured (no estimate)', why: `${RULES.R20.judged}` },
  };
}

/** @param {any} D @returns {Built} */
function rowR21(D) {
  const budgets = D.budgets.budgets;
  const arms = D.budgets.arms;
  /** @type {Record<string, any>} */
  const pooled = {};
  for (const [arm, a] of Object.entries(arms)) {
    const okCalls = sum(Object.values(/** @type {any} */ (a).cells).flatMap((c) => Object.values(/** @type {any} */ (c)).map((s) => /** @type {any} */ (s).okCalls)));
    const beyond = Object.fromEntries(budgets.map((/** @type {number} */ b) => [`${b / 1e9} G`, sum(Object.values(/** @type {any} */ (a).cells).flatMap((c) => Object.values(/** @type {any} */ (c)).map((s) => /** @type {any} */ (s).okBeyond[b] * /** @type {any} */ (s).okCalls))) / okCalls]));
    const failed = Object.fromEntries(budgets.map((/** @type {number} */ b) => [`${b / 1e9} G`, sum(Object.values(/** @type {any} */ (a).cells).flatMap((c) => Object.values(/** @type {any} */ (c)).map((s) => /** @type {any} */ (s).failedAbove[b])))]));
    pooled[arm] = { variant: /** @type {any} */ (a).variant, okCalls, okBeyondShare: beyond, failedCallsAbove: failed, failedCalls: sum(Object.values(/** @type {any} */ (a).cells).flatMap((c) => Object.values(/** @type {any} */ (c)).map((s) => /** @type {any} */ (s).failedCalls))), workPerMs: /** @type {any} */ (a).workPerMs };
  }
  return {
    measured: pooled,
    text: Object.entries(pooled).map(([arm, p]) => `${arm} (${p.variant}): ${p.okCalls} ok calls, share beyond ${Object.entries(p.okBeyondShare).map(([b, s]) => `${b} ${pct(/** @type {number} */ (s), 0)}`).join(', ')}; failed calls ${p.failedCalls}; work rate ${f(p.workPerMs / 1000, 0)} M units/s`).join('; '),
    completion: null, kind: 'Measured; Derived', formula: 'share of ok calls (set and batch, every cell of the arm) whose work passes B = 1, 2, 4, 6, 8, 12 G units; failed calls above B; work per ms to show B in seconds', record: 'IGP-03 `budgets.json`',
    verdict: { label: 'measured (no estimate)', why: 'the estimate says the 6 G figure is withdrawn; no number to compare' },
  };
}

/** @param {any} D @returns {Built} */
function rowR22(D) {
  const v = D.igp04.rows.R22.value;
  const ranges = /** @type {Record<string, [number, number]>} */ (RULES.R22.ranges);
  /** @type {Record<string, { label: string, why: string }>} */
  const perCell = {};
  for (const [level, r] of Object.entries(v.levels)) {
    const t10 = /** @type {any} */ (r).t10;
    perCell[level] = { ...rangeVerdict(t10.median, ranges[level]), why: `T10 factor median ${rangeVerdict(t10.median, ranges[level]).why.replace(' against', `, n ${t10.n}, against`)}` };
  }
  const cellText = Object.entries(v.cells).map(([cell, c]) => {
    const t10 = /** @type {any} */ (c).t10;
    const range = ranges[levelOf(cell)];
    const r = rangeVerdict(t10.median, range);
    return `${cellName(cell)} ${f(t10.median, 3)} [${f(t10.min, 3)}-${f(t10.max, 3)}] n ${t10.n}: ${r.label}, margin ${marginText(t10.median, range)} to ${range[0]}-${range[1]}`;
  }).join('; ');
  const ws = v.workSaving;
  return {
    measured: { pair: v.pair, levels: v.levels, cells: v.cells, workSaving: ws },
    text: `${v.pair} (P6 alone, today's search, four workers), level-pooled medians of the per-seed T10 factors: ${Object.entries(v.levels).map(([level, r]) => `${level} ${f(/** @type {any} */ (r).t10.median, 3)} [${f(/** @type {any} */ (r).t10.min, 3)}-${f(/** @type {any} */ (r).t10.max, 3)}] n ${/** @type {any} */ (r).t10.n}`).join('; ')}; per cell (3 decimals, never rounded across the range edge): ${cellText}; P6 saves ${Object.entries(ws).map(([cell, w]) => `${pct(/** @type {any} */ (w).savingShare)} of the rating time on ${cellName(cell)}`).join(', ')}`,
    completion: Object.entries(v.cells).map(([cell, c]) => `${cellName(cell)}: ${/** @type {any} */ (c).completion.after} of ${/** @type {any} */ (c).completion.of}`).join('; '),
    kind: D.igp04.rows.R22.kind, formula: D.igp04.rows.R22.formula, record: 'IGP-04 `compare.json` (R22)',
    verdict: { label: joinLabels(perCell), perCell, why: `Rule: ${RULES.R22.rule}, inside or outside, on the level-pooled median per-seed T10 factor (A:B)` },
  };
}

/**
 * The per-rating time ratio of twin calls B / C: the rating ms of a call in the arm at four workers over its twin's
 * at eight workers (the same call key), computed as `compare.mjs` computes A / B; below 1 is slower at eight workers.
 * @param {any} D
 * @returns {Record<string, { matchedCalls: number, unmatched: number, ratioBC: number, slowdown: number }>}
 */
function twinCalls(D) {
  const callKey = (/** @type {any} */ c) => JSON.stringify([
    c.stage, c.start.attempt, c.start.level, c.start.K, c.start.A, c.start.startCount,
    c.tuples.map((/** @type {any} */ t) => [t.phase, t.count, t.outcome, t.score, t.work, t.flags]), c.end.result, c.end.clueCount, c.end.profiles,
  ]);
  const B = D.arms.B;
  const C = D.arms.C;
  /** @type {Record<string, any>} */
  const out = {};
  const cellIds = [...new Set(B.rows.map((/** @type {any} */ r) => r.caseId))];
  for (const caseId of cellIds) {
    let matched = 0;
    let unmatched = 0;
    let ratingB = 0;
    let ratingC = 0;
    for (const x of B.rows.filter((/** @type {any} */ r) => r.caseId === caseId)) {
      const y = C.rows.find((/** @type {any} */ r) => r.caseId === caseId && r.seed === x.seed);
      if (y === undefined) {
        continue;
      }
      const finished = (/** @type {any} */ c) => c.start !== null && c.end !== null;
      const after = (C.byRow.get(y.rowKey) ?? []).filter(finished);
      /** @type {Map<string, any[]>} */
      const pool = new Map();
      for (const c of after) {
        pool.set(callKey(c), [...(pool.get(callKey(c)) ?? []), c]);
      }
      for (const c of (B.byRow.get(x.rowKey) ?? []).filter(finished)) {
        const twin = pool.get(callKey(c))?.shift();
        if (twin === undefined) {
          unmatched += 1;
          continue;
        }
        matched += 1;
        ratingB += sum(nums(c.tuples.map((/** @type {any} */ t) => t.ms)));
        ratingC += sum(nums(twin.tuples.map((/** @type {any} */ t) => t.ms)));
      }
    }
    if (matched > 0) {
      out[caseId] = { matchedCalls: matched, unmatched, ratioBC: ratingB / ratingC, slowdown: ratingC / ratingB - 1 };
    }
  }
  return out;
}

/** @param {any} D @returns {Built} */
function rowR23(D) {
  const v = D.igp04.rows.R23.value;
  const machine = D.igp04.meta.machine;
  const twin = twinCalls(D);
  const w = v.widthAlone;
  const ranges = /** @type {Record<'batch' | 'set', [number, number]>} */ (RULES.R23.ranges);
  /** @type {Record<string, { label: string, why: string }>} */
  const perCell = {};
  for (const [level, r] of Object.entries(w.levels)) {
    const batch = rangeVerdict(/** @type {any} */ (r).batch.median, ranges.batch);
    const set = rangeVerdict(/** @type {any} */ (r).t1.median, ranges.set);
    perCell[`${level} batch`] = { ...batch, why: `batch ${batch.why}` };
    perCell[`${level} set stage`] = { ...set, why: `set stage (T1) ${set.why}` };
  }
  const slow = Object.values(twin).map((t) => t.slowdown);
  const machineText = `${machine.cpu}, ${machine.logicalCores} logical cores, ${f(machine.totalMemoryBytes / 2 ** 30, 0)} GiB, ${machine.platform}, Node ${machine.node}`;
  return {
    measured: { machine, widthAlone: w.levels, widthAloneCells: w.cells, p6AndWidth: v.p6AndWidth.levels, perRatingTwinCalls: twin },
    text: `B:C (eight workers alone, today's search; below 1 is slower at eight): ${Object.entries(w.levels).map(([level, r]) => `${level} batch ${ratioText(/** @type {any} */ (r).batch)}, set stage (T1) ${ratioText(/** @type {any} */ (r).t1)}, T10 ${ratioText(/** @type {any} */ (r).t10)}`).join('; ')}. One rating at eight workers takes ${pct(Math.min(...slow), 0)} to ${pct(Math.max(...slow), 0)} longer than at four (twin calls B / C, ${Object.entries(twin).map(([cell, t]) => `${cellName(cell)} ${f(t.ratioBC)} over ${t.matchedCalls} calls`).join(', ')}). Machine: ${machineText}. A:C (P6 x eight workers) beside: ${Object.entries(v.p6AndWidth.levels).map(([level, r]) => `${level} batch ${ratioText(/** @type {any} */ (r).batch)}`).join('; ')}`,
    completion: Object.entries(w.cells).map(([cell, c]) => `${cellName(cell)}: ${/** @type {any} */ (c).completion.after} of ${/** @type {any} */ (c).completion.of}`).join('; '),
    kind: D.igp04.rows.R23.kind, formula: `${D.igp04.rows.R23.formula}; per-rating ratio B / C = rating ms of a call at four workers over its twin's at eight (same call key; callRatio as compare.mjs computes A / B)`,
    record: 'IGP-04 `compare.json` (R23, meta.machine); the published journals of IGP-04 arms B and C',
    verdict: { label: joinLabels(perCell), perCell, why: `Rule: ${RULES.R23.rule}, inside or outside, on the B:C factor of the batch (T10 - T1) and the set stage (T1) per level; this machine's result, an unadmitted upper bound` },
  };
}

/** @param {any} D @returns {{ needed: { min: number, max: number }, range: string }} */
function neededKernel(D) {
  /** @type {number[]} */
  const values = [];
  for (const cell of Object.values(D.pm2.cells)) {
    const c = /** @type {any} */ (cell);
    for (const key of ['1.87', '1.91']) {
      values.push(c.neededKernelSpeedup?.[key]);
      for (const cls of Object.values(c.byClass ?? {})) {
        for (const sub of Object.values(/** @type {any} */ (cls))) {
          values.push(/** @type {any} */ (sub).neededKernelSpeedup?.[key]);
        }
      }
    }
  }
  const v = nums(values);
  const min = Math.min(...v);
  const max = Math.max(...v);
  return { needed: { min, max }, range: `about ${f(min, 1)} to ${f(max, 1)}` };
}

/**
 * The range of the kernel's share of the rating time (the search and census phases): over each cell's whole corpus and
 * every class (call or window, complete or capped) with ratings, each end named.
 * @param {any} D
 * @returns {{ min: { share: number, where: string }, max: { share: number, where: string }, whole: { min: number, max: number }, text: string }}
 */
function kernelRange(D) {
  /** @type {{ share: number, where: string }[]} */
  const parts = [];
  /** @type {number[]} */
  const whole = [];
  for (const [cell, c] of Object.entries(D.pm2.cells)) {
    whole.push(/** @type {any} */ (c).kernelShare);
    for (const [cls, group] of Object.entries(/** @type {any} */ (c).byClass ?? {})) {
      for (const [kind, x] of Object.entries(/** @type {any} */ (group))) {
        if (kind !== 'all' && /** @type {any} */ (x).ratings > 0 && typeof /** @type {any} */ (x).kernelShare === 'number') {
          parts.push({ share: /** @type {any} */ (x).kernelShare, where: `${cellName(cell)}, ${cls} ${kind}` });
        }
      }
    }
  }
  const min = parts.reduce((m, p) => (p.share < m.share ? p : m));
  const max = parts.reduce((m, p) => (p.share > m.share ? p : m));
  const wholeRange = { min: Math.min(...whole), max: Math.max(...whole) };
  return { min, max, whole: wholeRange, text: `${pct(min.share)} (${min.where}) to ${pct(max.share)} (${max.where}); whole corpus ${(100 * wholeRange.min).toFixed(1)}-${pct(wholeRange.max)}` };
}

/** @param {any} D @returns {Built} */
function rowR24(D) {
  const cells = D.pm2.cells;
  const need = neededKernel(D);
  const kernel = kernelRange(D);
  const classLine = (/** @type {any} */ c) => Object.entries(c.byClass ?? {}).flatMap(([cls, o]) => Object.entries(/** @type {any} */ (o)).filter(([k, x]) => k !== 'all' && /** @type {any} */ (x).ratings > 0).map(([k, x]) => `${cls} ${k} ${pct(/** @type {any} */ (x).kernelShare)}`)).join(', ');
  const measured = Object.fromEntries(Object.entries(cells).map(([cell, c]) => [cell, {
    kernelShare: /** @type {any} */ (c).kernelShare, p7Sensitivity: /** @type {any} */ (c).p7Sensitivity, neededKernelSpeedup: /** @type {any} */ (c).neededKernelSpeedup,
    byClass: Object.fromEntries(Object.entries(/** @type {any} */ (c).byClass ?? {}).map(([cls, o]) => [cls, Object.fromEntries(Object.entries(/** @type {any} */ (o)).map(([k, x]) => [k, { ratings: /** @type {any} */ (x).ratings, kernelShare: /** @type {any} */ (x).kernelShare, neededKernelSpeedup: /** @type {any} */ (x).neededKernelSpeedup }]))])),
  }]));
  return {
    measured: { cells: measured, kernelShareRange: kernel, neededKernelSpeedupFor187To191: need.needed, p6Reference: D.pm2.p6Reference },
    text: `${Object.entries(cells).map(([cell, c]) => `${cellName(cell)}: kernel (search + census) ${pct(/** @type {any} */ (c).kernelShare)} of rating time (${/** @type {any} */ (c).ratings.complete} complete, ${/** @type {any} */ (c).ratings.capped} capped; ${classLine(c)}); a kernel 2 x faster gives x${f(/** @type {any} */ (c).p7Sensitivity['2'])}, 1.5 x gives x${f(/** @type {any} */ (c).p7Sensitivity['1.5'])}; for x1.3 the kernel must be ${f(/** @type {any} */ (c).neededKernelSpeedup['1.3'])} x faster, for x1.8 ${f(/** @type {any} */ (c).neededKernelSpeedup['1.8'])} x`).join('; ')}. The kernel's share of the rating time is ${kernel.text}, so P7 is about the kernel speed-up itself; ÷1.9 on the prototype needs the kernel ${need.range} x faster (the needed speed-ups for the factors 1.87 and 1.91). DLX ${pct(cells['12x12-nightmare']?.dlxShare)} of the 12x12 rating time against P6's saving ${D.pm2.p6Reference.todayText} on today's search`,
    completion: null, kind: 'Measured (shares); the sensitivity is a hypothetical map 1 / (1 - k + k / s), a Projection', formula: 'kernel share k = search + census share of the profiled rating time; P7 sensitivity 1 / (1 - k + k / s); needed speed-up s for the factor F = 1 / (1 - k + k / s)', record: 'IGP-06 `pm2.json`',
    verdict: { label: 'Projection', why: 'P7 is not prototyped: PM2 gives a sensitivity, not a factor; the range 1.1-1.8 (likely 1.3) stays; no narrowing' },
  };
}

/** @param {any} D @returns {Built} */
function rowR25(D) {
  const v = D.igp04.rows.R25.value;
  const against = v.against;
  const need = neededKernel(D);
  const parts = [];
  for (const [kind, set] of [['today (A:C)', v.measured.today], ['prototype (E:F)', v.measured.prototype]]) {
    for (const [cell, c] of Object.entries(/** @type {any} */ (set).cells)) {
      const p = /** @type {any} */ (c).projection;
      const inside = against >= p.low && against <= p.high;
      parts.push(`${cellName(cell)} ${kind}: T10 factor ${f(/** @type {any} */ (c).t10.median, 3)} (n ${/** @type {any} */ (c).n}); band (x P7 ${P7_ASSUMPTION.low}-${P7_ASSUMPTION.high}) ${f(p.low, 2)}-${f(p.high, 2)}, likely ${f(p.likely, 2)}; ÷${against} lies ${inside ? 'inside' : against > p.high ? 'outside, above' : 'outside, below'} the band; P7 needed for ÷${against} ${f(p.p7NeededFor19, 2)}`);
    }
  }
  return {
    measured: { ...v, neededKernelSpeedupFor187To191: need.needed },
    text: `${parts.join('; ')}. P7 assumed ${P7_ASSUMPTION.likely} (${P7_ASSUMPTION.low}-${P7_ASSUMPTION.high}); eight workers an unadmitted upper bound. IGP-06: ÷${against} on the prototype needs the kernel ${need.range} x faster`,
    completion: null, kind: D.igp04.rows.R25.kind, formula: D.igp04.rows.R25.formula, record: 'IGP-04 `compare.json` (R25); IGP-06 `pm2.json`',
    verdict: { label: 'Projection', why: `${RULES.R25.judged}. A row that uses the unmeasured P7 stays a Projection (check-list §5)` },
  };
}

/** @param {any} D @returns {Built} */
function rowR26(D) {
  const m = D.igp04.rows.R26.value;
  const rows = Object.entries(m);
  const maxProcess = Math.max(...rows.map(([, v]) => /** @type {any} */ (v).maxProcess));
  const maxAccounted = Math.max(...rows.map(([, v]) => /** @type {any} */ (v).maxAccounted));
  const mib = (/** @type {number} */ b) => `${withCommas(b / 2 ** 20)} MiB`;
  const pass = rows.every(([, v]) => /** @type {any} */ (v).pass === true);
  const worst = rows.find(([, v]) => /** @type {any} */ (v).workers === 8);
  const eight = worst === undefined ? null : /** @type {any} */ (worst[1]);
  return {
    measured: m,
    text: `${rows.map(([arm, v]) => `${arm} (${/** @type {any} */ (v).workers} workers): accounted peak ${mib(/** @type {any} */ (v).maxAccounted)} of ${mib(/** @type {any} */ (v).accountedLimit)}, process peak ${mib(/** @type {any} */ (v).maxProcess)} of ${mib(/** @type {any} */ (v).processLimit)}, ${/** @type {any} */ (v).pass ? 'pass' : 'FAIL'}`).join('; ')}. Largest observed peaks: accounted ${mib(maxAccounted)}${eight === null ? '' : ` of ${mib(eight.accountedLimit)}`}, process ${mib(maxProcess)}${eight === null ? '' : ` of ${mib(eight.processLimit)}`}. The estimate is a worst-case ceiling${eight === null ? '' : ` (${mib(eight.accountedLimit)} accounted at eight workers against the ${mib(eight.processLimit)} process limit)`} that follows from the arm's own constants; observed peaks that pass do not refute it`,
    completion: null, kind: D.igp04.rows.R26.kind, formula: D.igp04.rows.R26.formula, record: 'IGP-04 `compare.json` (R26)',
    verdict: { label: pass ? 'holds' : 'fails', why: `${pass ? 'both bench criteria pass on every arm' : 'a bench criterion fails on an arm'} (largest process peak ${mib(maxProcess)}, largest accounted peak ${mib(maxAccounted)}). Rule: ${RULES.R26.rule}` },
  };
}

/**
 * The in-band ratings of PM1 with an incomplete census, from `discoveries.jsonl`.
 * @param {any} D
 */
function censusShares(D) {
  /** @type {Record<string, { inBand: number, eligible: number, censusIncomplete: number }>} */
  const byLevel = {};
  /** @type {Record<string, { inBand: number, eligible: number, censusIncomplete: number }>} */
  const byCell = {};
  for (const d of D.discoveries) {
    if (d.part !== 'windows') {
      continue;
    }
    const level = (/hell-\d/.exec(d.case) ?? ['nightmare'])[0];
    for (const [map, key] of [[byLevel, level], [byCell, d.case]]) {
      const t = (map[key] ??= { inBand: 0, eligible: 0, censusIncomplete: 0 });
      t.inBand += 1;
      t.eligible += d.eligible ? 1 : 0;
      t.censusIncomplete += d.rating.metrics.censusComplete === false ? 1 : 0;
    }
  }
  return { byLevel, byCell };
}

/**
 * MP12b1's censored share of accepted puzzles per landscape cell of a level (a rating that is an estimate).
 * @param {string} level `hell-1` and so on.
 * @param {any} D
 */
function mp12b1Censored(level, D) {
  /** @type {Record<string, { accepted: number, censored: number }>} */
  const out = {};
  const boards = JSON.parse(readFileSync(join(IG_DIR, 'data', 'boards-v1.json'), 'utf8'));
  const ids = Array.isArray(boards.cases) ? boards.cases.map((/** @type {any} */ c) => c.id ?? c.caseId) : Object.keys(boards.cases ?? boards);
  for (const id of ids.filter((/** @type {string} */ i) => i.endsWith(`-${level}`))) {
    const m = mp12b1Report(id);
    if (m === null) {
      continue;
    }
    const runs = m.report.runs ?? [];
    const accepted = sum(nums(runs.map((/** @type {any} */ r) => r.acceptedCount)));
    if (accepted > 0) {
      out[id] = { accepted, censored: sum(nums(runs.map((/** @type {any} */ r) => r.ratingCensoredCount))) };
    }
  }
  return out;
}

/** @param {any} D @returns {Built} */
function rowR27(D) {
  const { byLevel, byCell } = censusShares(D);
  const pooled = D.pm1.pooled;
  const parts = [];
  /** @type {Record<string, any>} */
  const levels = {};
  for (const level of ['hell-1', 'hell-2', 'hell-3']) {
    const p = pooled[level];
    const c = byLevel[level] ?? { inBand: 0, eligible: 0, censusIncomplete: 0 };
    const mp = mp12b1Censored(level, D);
    const mpAccepted = sum(Object.values(mp).map((m) => m.accepted));
    const mpCensored = sum(Object.values(mp).map((m) => m.censored));
    levels[level] = { cells: p.cells, families: p.families, ratings: p.ratings, inBand: p.inBand, eligible: p.eligible, censusIncomplete: c.censusIncomplete, mp12b1: { cells: mp, accepted: mpAccepted, censored: mpCensored } };
    parts.push(`${level.replace('hell-', 'Hell ')}: ${p.inBand} in band (${p.eligible} eligible) of ${p.ratings} ratings in ${p.families} families on ${p.cells} cells${p.inBand > 0 ? `, ${c.censusIncomplete} of them with an incomplete census (${pct(c.censusIncomplete / p.inBand, 0)})` : ''}; MP12b1: ${mpAccepted === 0 ? 'no accepted puzzle' : `${mpCensored} of ${mpAccepted} accepted puzzles censored (${Object.entries(mp).map(([id, m]) => `${cellName(id)} ${m.censored} of ${m.accepted}`).join(', ')})`}`);
  }
  const part1 = ['hell-1', 'hell-2', 'hell-3'].reduce((t, l) => ({ inBand: t.inBand + (byLevel[l]?.inBand ?? 0), censored: t.censored + (byLevel[l]?.censusIncomplete ?? 0) }), { inBand: 0, censored: 0 });
  const req = D.igp03h.rows.R27.value;
  const request = Object.entries(req).map(([cell, v]) => `${cellName(cell)} without the screen: ${/** @type {any} */ (v).w760.ratingCensored} of ${/** @type {any} */ (v).w760.accepted} accepted puzzles censored (${pct(/** @type {any} */ (v).w760.share, 0)})`).join('; ');
  const hell26 = D.igp03h.study.screenBySeed['26x26-hell-1'].rows;
  const censored26 = sum(hell26.map((/** @type {any} */ r) => r.w760.ratingCensored));
  const accepted26 = sum(hell26.map((/** @type {any} */ r) => r.w760.accepted));
  return {
    measured: { part1: { inBandCensoredTotal: part1, levels, byCell }, requestLevel: { ...req, '26x26-hell-1': { w760: { accepted: accepted26, ratingCensored: censored26, share: censored26 / accepted26 } } } },
    text: `${parts.join('; ')}; part 1 in all: ${part1.censored} of ${part1.inBand} in-band ratings with an incomplete census. Request level: ${request}; Hell 1 26x26 without the screen ${censored26} of ${accepted26}`,
    completion: null, kind: 'Measured; Derived', formula: 'in-band ratings of part 1 (`discoveries.jsonl`, part windows) whose census is incomplete (`censusComplete` false) / in-band ratings; MP12b1: `ratingCensoredCount` / accepted puzzles per cell; request level: accepted puzzles whose rating is an estimate', record: 'IGP-05 `pm1.json`, `discoveries.jsonl`; IGP-03h `compare.json` (R27); MP12b1 reports',
    verdict: { label: 'measured (no estimate)', why: 'the estimate is "unknown: no in-band rating ever observed"; the censored share stands beside MP12b1\'s, which is as censored (a complete census could score these puzzles differently)' },
  };
}

/** @param {any} D @returns {Built} */
function rowR28(D) {
  const part3 = D.pm1.part3;
  /** @type {Record<string, any>} */
  const measured = {};
  const text = [];
  for (const [cell, p] of Object.entries(part3)) {
    const sets = /** @type {any[]} */ (/** @type {any} */ (p).sets);
    const withWindow = sets.filter((s) => s.inBandOffsets.length > 0);
    const offsets = sets.flatMap((s) => s.inBandOffsets.map((/** @type {any} */ o) => o.offset));
    const capped = sum(sets.map((s) => s.startCountProfiles.capped));
    const profiles = sum(sets.map((s) => s.startCountProfiles.n));
    measured[cell] = { sets: sets.length, classes: /** @type {any} */ (p).classes, made: /** @type {any} */ (p).made, startCountProfiles: { n: profiles, capped }, setsWithEligibleWindows: withWindow.length, windowOffsets: offsets.length === 0 ? null : { min: Math.min(...offsets), max: Math.max(...offsets) }, inBand: /** @type {any} */ (p).inBand, eligible: /** @type {any} */ (p).eligible, mainWorkAbove: /** @type {any} */ (p).mainWorkAbove };
    const above = /** @type {any} */ (p).mainWorkAbove['380'];
    text.push(`${cellName(cell)}: ${sets.length} failing sets, classes ${Object.entries(/** @type {any} */ (p).classes).map(([k, n]) => `${k} ${n}`).join(', ')}; ${capped} of ${profiles} start-count profiles capped; ${withWindow.length} of ${sets.length} sets have an eligible window at +${offsets.length === 0 ? '-' : `${Math.min(...offsets)} to +${Math.max(...offsets)}`} clues (${/** @type {any} */ (p).eligible} eligible in-band ratings; ${above.eligible.n} of ${above.eligible.of} above 380 M of main work)`);
  }
  return {
    measured, text: text.join('; '), completion: null, kind: 'Measured', formula: 'today\'s set-stage call per failing Hell 1 set, its failure classified; the part-1 algorithm on two orders of each set', record: 'IGP-05 `pm1.json` (part 3)',
    verdict: { label: 'measured (no estimate)', why: 'the estimate is "unknown"' },
  };
}

/** @param {any} D @returns {Built} */
function rowR29(D) {
  const v = D.igp01.rows.R29.value;
  const p2 = D.pm1.part2;
  const report = { '14x14-nightmare': 0.89, '12x12-nightmare': 0.53, '26x26-nightmare': 0.10 };
  const text = [];
  /** @type {Record<string, any>} */
  const measured = {};
  for (const cell of ['14x14-nightmare', '12x12-nightmare', '26x26-nightmare', '15x15b10-nightmare', '14x14-master', '26x26-master', '26x26-hell-1']) {
    const a = v[cell];
    const b = p2[cell];
    const est = /** @type {Record<string, number>} */ (report)[cell];
    const windows = b === undefined ? null : b.windowCounts.map((/** @type {any} */ w) => `+${w.offset[0]}: ${pct(w.inBandShare, 0)}`).join(', ');
    measured[cell] = { reportShare: est ?? null, differenceToReport: est === undefined ? null : a.share - est, igp01Before: a, pm1Part2: b === undefined ? null : { cappedShare: b.startCountCappedShare, windowCounts: b.windowCounts, inBand: b.inBand.ratings } };
    text.push(`${cellName(cell)}: IGP-01 before arm ${a.capped} of ${a.tuples} p1 tuples at the start count capped (${f(a.share, 3)}${est === undefined ? '' : `; report ${f(est, 2)}, difference ${a.share - est >= 0 ? '+' : '-'}${Math.abs(a.share - est).toFixed(3)}`})${b === undefined ? '' : `; PM1 part 2 ${b.startCountCappedShare.capped} of ${b.startCountCappedShare.rated} families capped at the start count (${b.startCountCappedShare.stoppedAbove} stopped above it); window counts (in-band share by offset) ${windows}`}`);
  }
  return {
    measured, text: text.join('; '), completion: null, kind: D.igp01.rows.R29.kind, formula: `${D.igp01.rows.R29.formula}; PM1 part 2: families whose scan rated the start count and found it capped / families that rated it`, record: 'IGP-01 `compare.json` (R29); IGP-05 `pm1.json` (part 2)',
    verdict: { label: 'measured (no estimate)', why: 'the estimates are point values (0.89, 0.53, 0.10) with no stated range; no §5 rule applies; the differences are beside them' },
  };
}

/**
 * What the inlining of V8 does to the category shares, read from the records: the cell with the largest `control` share,
 * the share of `measureDeduction` in its top functions, and the largest unplaced share.
 * @param {any} D
 * @returns {{ cell: string, controlShare: number, measureDeductionShare: number | null, unplacedMax: number, text: string, unplacedText: string }}
 */
function inliningNote(D) {
  const entries = Object.entries(D.pm2.cells);
  const [cell, c] = entries.reduce((m, e) => (/** @type {any} */ (e[1]).categories.control.share > /** @type {any} */ (m[1]).categories.control.share ? e : m));
  const x = /** @type {any} */ (c);
  const measureDeduction = x.top.find((/** @type {any} */ t) => t.function === 'measureDeduction');
  const unplacedMax = Math.max(...entries.map(([, e]) => /** @type {any} */ (e).unplaced.share));
  return {
    cell, controlShare: x.categories.control.share, measureDeductionShare: measureDeduction?.share ?? null, unplacedMax,
    text: `on ${cellName(cell)} ${pct(x.categories.control.share)} sits in \`control\`${measureDeduction === undefined ? '' : `, of which \`measureDeduction\`'s own time with its inlined callees is ${pct(measureDeduction.share)} of the rating time`}`,
    unplacedText: `at most ${pct(unplacedMax)} unplaced`,
  };
}

/** @param {any} D @returns {Built} */
function rowR30(D) {
  const cells = D.pm2.cells;
  const inlining = inliningNote(D);
  /** @type {Record<string, any>} */
  const measured = {};
  const text = [];
  for (const [cell, c] of Object.entries(cells)) {
    const x = /** @type {any} */ (c);
    measured[cell] = {
      ratings: x.ratings, unplacedShare: x.unplaced.share,
      phases: Object.fromEntries(Object.entries(x.phases).map(([k, v]) => [k, /** @type {any} */ (v).share])),
      categories: Object.fromEntries(Object.entries(x.categories).map(([k, v]) => [k, /** @type {any} */ (v).share])),
      topFunctions: x.top.slice(0, 5).map((/** @type {any} */ t) => ({ function: t.function, file: t.file, category: t.category, share: t.share })),
    };
    const sh = (/** @type {any} */ o) => Object.entries(o).filter(([, v]) => /** @type {any} */ (v).share >= 0.005).map(([k, v]) => `${k} ${pct(/** @type {any} */ (v).share)}`).join(', ');
    text.push(`${cellName(cell)} (${x.ratings.complete + x.ratings.capped} ratings, unplaced ${pct(x.unplaced.share)}): phases (firm) ${sh(x.phases)}; categories (indicative) ${sh(x.categories)}; top functions (indicative) ${x.top.slice(0, 4).map((/** @type {any} */ t) => `${t.function} ${pct(t.share)}`).join(', ')}`);
  }
  return {
    measured, text: text.join('; '), completion: null, kind: 'Measured; Derived', formula: `V8 CPU profile samples charged the time to the next one, phase by stack ancestry with the widened markers; the denominator is the attributed rating time; the phase shares are firm (${inlining.unplacedText}), the category and function shares depend on V8's inlining and are indicative (${inlining.text})`, record: 'IGP-06 `pm2.json`',
    verdict: { label: 'measured (no estimate)', why: 'the estimate is "unknown"' },
  };
}

// ---------------------------------------------------------------------------------------------------------------
// R31: after all phases (a Projection)

/**
 * The six-seed 12x12 values of the screen against no screen (IGP-03h `c5/compare.json`).
 * @param {any} D
 */
function twelveBySeed(D) {
  const src = D.c5?.study?.screenBySeed?.['12x12-nightmare'] ?? D.igp03h.study.screenBySeed?.['12x12-nightmare'];
  return src === undefined ? null : { ...src.summary, seedNames: src.seeds, rows: src.rows };
}

/** @param {any} D @returns {Built} */
function rowR31(D) {
  const v = D.igp04.rows.R25.value;
  const prototype = Object.values(v.measured.prototype.cells).map((c) => /** @type {any} */ (c).t10.median);
  const everyFactor = nums([...Object.values(v.measured.today.cells), ...Object.values(v.measured.prototype.cells)].map((c) => /** @type {any} */ (c).t10.median));
  const factor = { likely: median(prototype), low: Math.min(...everyFactor), high: Math.max(...everyFactor) };
  const p7 = v.p7Assumption;
  const project = (/** @type {number} */ ms) => ({
    fast: ms / 1000 / (factor.high * p7.high), likely: ms / 1000 / (/** @type {number} */ (factor.likely) * p7.likely), slow: ms / 1000 / (factor.low * p7.low),
  });
  const cells = headlineCells(D);
  const todayFactors = v.measured.today.cells;
  const six = twelveBySeed(D);
  const noScreenT10 = (/** @type {string} */ cell) => {
    if (cell === '14x14-nightmare') {
      return { source: 'IGP-03/w760', ms: D.igp03.rows.R16.value[cell].perW.find((/** @type {any} */ r) => r.role === 'w760').t10 };
    }
    if (cell === '12x12-nightmare' && six !== null) {
      const t = nums(six.rows.map((/** @type {any} */ r) => r.w760.t10));
      return { source: `IGP-03/w760 and IGP-03h/w760, reps 0-${t.length - 1}`, ms: { n: t.length, median: median(t) } };
    }
    if (cell === '26x26-hell-1') {
      return { source: 'IGP-03h/w760', ms: D.igp03h.rows.R16.value[cell].perW.find((/** @type {any} */ r) => r.role === 'w760').t10 };
    }
    return null;
  };
  /** @type {Record<string, any>} */
  const measured = {};
  const table = [];
  for (const cell of HEADLINE) {
    const after = cells[cell].after.t10;
    const entry = {
      afterT10Ms: after, projection: after.median === null ? null : project(after.median), analysts: AFTER_ALL[/** @type {keyof typeof AFTER_ALL} */ (cell)],
      todaySearchFactor: todayFactors[cell]?.t10.median ?? null, todaySearchFactorTimesP7: todayFactors[cell] === undefined ? null : todayFactors[cell].projection,
      noScreen: /** @type {any} */ (null), meanSixSeed: /** @type {any} */ (null),
    };
    const ns = noScreenT10(cell);
    if (ns !== null && ns.ms.median !== null) {
      entry.noScreen = { source: ns.source, t10Ms: ns.ms, projection: project(ns.ms.median) };
    }
    if (cell === '12x12-nightmare' && six !== null) {
      const t = nums(six.rows.map((/** @type {any} */ r) => r.main.t10));
      entry.meanSixSeed = { source: `IGP-01/after and IGP-03h/main, reps 0-${t.length - 1}`, t10Ms: { n: t.length, median: median(t) }, projection: project(/** @type {number} */ (median(t))) };
    }
    measured[cell] = entry;
    table.push({ cell, entry });
  }
  const need = neededKernel(D);
  const kernel = kernelRange(D);
  const named = (/** @type {Record<string, any>} */ set) => Object.entries(set).map(([c, x]) => `${cellName(c)} (n ${x.n})`).join(', ');
  const plain = (/** @type {Record<string, any>} */ set) => Object.entries(set).map(([c, x]) => `${cellName(c)}, n ${x.n}`).join('; ');
  const measuredOn = `IGP-04: A:C on today's search on ${named(v.measured.today.cells)}; E:F on the prototype on ${named(v.measured.prototype.cells)}`;
  const p = (/** @type {any} */ x) => (x === null ? '-' : `${f(x.fast, 1)} / ${f(x.likely, 1)} / ${f(x.slow, 1)}`);
  const text = table.map(({ cell, entry }) => {
    const parts = [`${cellName(cell)}: after P1-P5 T10 ${sec(entry.afterT10Ms.median)} s (n ${entry.afterT10Ms.n}) -> ${p(entry.projection)} s (fast / likely / slow); analysts ${entry.analysts.opus} / ${entry.analysts.astra}`];
    if (entry.noScreen !== null) {
      parts.push(`no screen (population-keeping variant) T10 ${sec(entry.noScreen.t10Ms.median)} s (n ${entry.noScreen.t10Ms.n}) -> ${p(entry.noScreen.projection)} s`);
    }
    if (entry.meanSixSeed !== null) {
      parts.push(`190 M on ${entry.meanSixSeed.t10Ms.n} seeds T10 ${sec(entry.meanSixSeed.t10Ms.median)} s -> ${p(entry.meanSixSeed.projection)} s`);
    }
    if (entry.todaySearchFactor !== null) {
      parts.push(`today's-search A:C factor ${f(entry.todaySearchFactor, 3)}, x P7 likely ${f(entry.todaySearchFactorTimesP7.likely, 2)} (a reference for today's search, not the prototype's)`);
    }
    return parts.join('; ');
  });
  return {
    measured: { assumptions: { firstPhaseFactor: factor, p7: p7, against: v.against, measuredOn, transfer: `the prototype's factor is measured on ${named(v.measured.prototype.cells)} only (E:F); its transfer to every cell is an assumption; the range is the smallest to the largest measured P6 x eight-worker factor, today's search included`, neededKernelSpeedupForDivide19: need.needed, kernelShareRange: kernel, machine: D.igp04.meta.machine }, cells: measured },
    text: `Projection, never a measured or confirmed value: per cell the after-P1-P5 T10 median ÷ (first-phase factor x P7); likely factor ${f(factor.likely, 2)} (E:F, ${plain(v.measured.prototype.cells)}) for every cell, range ${f(factor.low, 2)}-${f(factor.high, 2)}; P7 ${p7.likely} (${p7.low}-${p7.high}) is assumed, IGP-06 does not narrow it; ÷${v.against} on the prototype needs the kernel ${need.range} x faster. Eight workers stay an unadmitted upper bound. Seconds fast / likely / slow: ${text.join(' | ')}`,
    completion: null, kind: `Projection (P7 assumed; the first-phase factor transferred from ${Object.keys(v.measured.prototype.cells).map(cellName).join(', ')})`, formula: `T10 median of the arm ÷ (P6 x eight-worker factor) ÷ P7: fast = ÷ (largest factor x ${p7.high}), likely = ÷ (E:F factor x ${p7.likely}), slow = ÷ (smallest factor x ${p7.low})`, record: 'IGP-01 `compare.json`; IGP-03 and IGP-03h `compare.json` and `c5/compare.json`; IGP-04 `compare.json` (R25); IGP-06 `pm2.json`',
    verdict: { label: 'Projection', why: 'P7 is unmeasured: the row stays a Projection (check-list §5); it is compared with the analysts\' values, not judged against them' },
  };
}

// ---------------------------------------------------------------------------------------------------------------
// R32 and R33 (no verdicts)

/** @param {string} role @param {string} cellId @returns {string} The arm of a study role, in words. */
function armLabel(role, cellId) {
  const labels = /** @type {Record<string, string>} */ ({ before: 'today', w095: '95 M', main: /hell/.test(cellId) ? '380 M' : '190 M', w380: '380 M', w760: 'no screen', a3: 'arity 3 (190 M)', today: 'today', mp12b1All: 'MP12b1, 20 reps' });
  return labels[role] ?? role;
}

/**
 * The median U of the accepted puzzles of an arm of a study cell.
 * @param {any} rec A study record (IGP-03 or IGP-03h `compare.json`).
 * @param {string} cell
 * @param {string} role
 * @returns {number | null}
 */
function medianU(rec, cell, role) {
  const puzzles = rec.study?.cells?.[cell]?.arms?.[role]?.puzzles;
  return puzzles === undefined ? null : median(nums(puzzles.map((/** @type {any} */ p) => p.U)));
}

/** @param {any} D @returns {Built} */
function rowR32(D) {
  const text = [];
  /** @type {Record<string, any>} */
  const measured = { igp01: {}, perW: {} };
  for (const [cell, p] of Object.entries(D.igp01r2.populations)) {
    const x = /** @type {any} */ (p);
    measured.igp01[cell] = { mp12b1: x.mp12b1, before: x.before, after: x.after, shareDifference: x.shareDifference };
    text.push(`${cellName(cell)}: clue share median ${f(x.mp12b1.share.median, 3)} (MP12b1, ${x.mp12b1.puzzles} puzzles) / ${f(x.before.share.median, 3)} (before) / ${f(x.after.share.median, 3)} (after, ${x.after.puzzles}), after - MP12b1 ${x.shareDifference.afterMinusMp12b1 >= 0 ? '+' : ''}${f(x.shareDifference.afterMinusMp12b1, 3)} (${x.shareDifference.cluesAfterMinusMp12b1 >= 0 ? '+' : ''}${x.shareDifference.cluesAfterMinusMp12b1} clues), score median ${f(x.mp12b1.score.median, 1)} / ${f(x.after.score.median, 1)}`);
  }
  const detail = ['| Cell | Source | Arm | Puzzles | Clue share p10 / median / p90 | U median | Score position | Central share |', '|---|---|---|---:|---|---:|---:|---:|'];
  for (const [name, rec] of [['IGP-03', D.igp03], ['IGP-03h', D.igp03h]]) {
    for (const [cell, arms] of Object.entries(rec.rows.R32.value)) {
      measured.perW[`${name}/${cell}`] = arms;
      for (const [role, p] of Object.entries(/** @type {any} */ (arms))) {
        const x = /** @type {any} */ (p);
        detail.push(`| ${cellName(cell)} | ${name} | ${armLabel(role, cell)} | ${x.puzzles} | ${f(x.share.p10, 3)} / ${f(x.share.median, 3)} / ${f(x.share.p90, 3)} | ${f(medianU(rec, cell, role), 1)} | ${f(x.position, 2)} | ${pct(x.central, 0)} |`);
      }
    }
  }
  const six = twelveBySeed(D);
  if (six !== null) {
    measured.sixSeed12x12 = six.populations;
    for (const [role, p] of Object.entries(six.populations)) {
      const x = /** @type {any} */ (p);
      detail.push(`| 12x12 Nightmare, ${six.seeds} seeds | IGP-03h | ${armLabel(role, '12x12-nightmare')} | ${x.puzzles} | ${f(x.share.p10, 3)} / ${f(x.share.median, 3)} / ${f(x.share.p90, 3)} | ${f(x.U.median, 1)} | ${f(x.position.median, 2)} | ${pct(x.centralShare, 0)} |`);
    }
  }
  return {
    measured, text: `${text.join('; ')}; per W, per arm and ${six === null ? 'the' : `the ${six.seeds}-seed`} 12x12 populations: see the R32 detail`, completion: null, kind: 'Measured; Derived', formula: 'population of the accepted puzzles per cell and arm (clue share = clues / K; p10 / median / p90 by nearest rank; position = (score - band min) / band width; central = within a quarter of the width of the centre)', record: 'IGP-01 `compare-r2.json`; IGP-03 and IGP-03h `compare.json` (R32)',
    verdict: { label: 'no verdict', why: 'R32 carries no verdict: the population stands beside every time verdict of its cell, and the answer to IG-P-Q17 judges it' },
    detail,
  };
}

/** @param {any} D @returns {Built} */
function rowR33(D) {
  const six = twelveBySeed(D);
  /** @type {Record<string, any>} */
  const measured = {};
  const text = [];
  const factor = (/** @type {any} */ x) => `${x.from === 'before' ? 'today (IGP-01 before)' : x.from === 'w760' ? 'no screen' : x.from} -> ${x.to === 'main' ? 'screen' : x.to === 'w760' ? 'no screen' : x.to}: T10 ${ratioText(x.t10)}, response ${ratioText(x.response)}`;
  const t14 = D.igp03.rows.R33.value['14x14-nightmare'];
  measured['14x14-nightmare'] = t14;
  const requestsOf = (/** @type {Record<string, any>} */ s) => Math.max(...Object.values(s).map((c) => c.requests));
  const sets = (/** @type {any} */ s) => Object.entries(s).map(([role, c]) => `${role} ${/** @type {any} */ (c).earlier} of ${/** @type {any} */ (c).requests} earlier`).join(', ');
  text.push(`14x14 Nightmare (IGP-03, ${requestsOf(t14.shift.sets)} seeds): ${t14.factors.filter((/** @type {any} */ x) => ['before:w760', 'w760:main', 'before:main'].includes(`${x.from}:${x.to}`)).map(factor).join('; ')}; requests served on an earlier set than today's: ${sets(t14.shift.sets)}; same-set clue shift against no screen: ${Object.entries(t14.shift.sameSet).filter(([role]) => role !== 'w760').map(([role, s]) => `${role} ${f(/** @type {any} */ (s).w760.median, 2)}`).join(', ')}`);
  if (six !== null) {
    measured['12x12-nightmare'] = { source: D.c5 === null ? 'IGP-03h compare.json' : 'IGP-03h c5/compare.json', seeds: six.seeds, screenBySeed: { reached: six.reached, t10Ratio: six.t10Ratio, responseRatio: six.responseRatio, todayOverW760: six.todayOverW760, todayOverMain: six.todayOverMain, shiftClues: six.shiftClues, shiftShare: six.shiftShare, sameSet: six.sameSet }, populations: { today: six.populations.today.share, w760: six.populations.w760.share, main: six.populations.main.share }, perSeed: six.rows.map((/** @type {any} */ r) => ({ seed: r.seed, t10Ratio: r.t10Ratio, todayOverW760: r.todayOverW760, shiftClues: r.shiftClues, shiftShare: r.shiftShare, sameSet: r.sameSet })) };
    text.push(`12x12 Nightmare (${six.seeds} seeds, reps 0-${six.seeds - 1}; supersedes IGP-03's ${requestsOf(D.igp03.rows.R33.value['12x12-nightmare'].shift.sets)}-seed reading): ten of n today (MP12b1) ${six.reached.today} of ${six.seeds}, no screen ${six.reached.w760}, 190 M ${six.reached.main}; today (MP12b1) -> no screen x${f(six.todayOverW760.median)} (n ${six.todayOverW760.n}, geometric mean ${f(six.todayOverW760.geoMean)}); no screen -> 190 M x${f(six.t10Ratio.median)} (n ${six.t10Ratio.n}, ${f(six.t10Ratio.min)}-${f(six.t10Ratio.max)}, geometric mean ${f(six.t10Ratio.geoMean)}); same-set clue shift 190 M - no screen per seed ${six.rows.map((/** @type {any} */ r) => `${r.shiftClues >= 0 ? '+' : ''}${f(r.shiftClues, 1)}`).join(' / ')}, median ${f(six.shiftClues.median, 2)} clues (${f(six.shiftShare.median, 3)} of K); median clue share today (MP12b1) ${f(six.populations.today.share.median, 3)}, no screen ${f(six.populations.w760.share.median, 3)}, 190 M ${f(six.populations.main.share.median, 3)}; requests on the same set in every arm: ${six.sameSet} of ${six.seeds}`);
  }
  const hell = D.igp03h.rows.R33.value['26x26-hell-1'];
  measured['26x26-hell-1'] = hell;
  text.push(`Hell 1 26x26 (IGP-03h, ${hell.screenBySeed.seeds} seeds): ${hell.factors.map(factor).join('; ')}; requests on an earlier set than today's: ${sets(hell.shift.sets)}; same-set clue shift 380 M - no screen ${f(hell.screenBySeed.shiftClues.median, 2)} clues (${f(hell.screenBySeed.shiftShare.median, 3)} of K); median clue share today (MP12b1) ${f(hell.screenBySeed.populations.today.share.median, 3)}, no screen ${f(hell.screenBySeed.populations.w760.share.median, 3)}, 380 M ${f(hell.screenBySeed.populations.main.share.median, 3)}`);
  const hell20 = D.igp03h.study.armOnly?.['20x20-hell-1']?.w760;
  if (hell20 !== undefined) {
    measured['20x20-hell-1'] = { reached: hell20.reached, requests: hell20.requests.length, t1Ms: hell20.t1, t10Ms: hell20.t10, todayOutcome: hell20.requests.map((/** @type {any} */ r) => r.today) };
    text.push(`Hell 1 20x20 without the screen (arm only, IGP-03h part 2): ten of ${hell20.requests.length}: ${hell20.reached}, T1 median ${sec(hell20.t1.median)} s, T10 median ${sec(hell20.t10.median)} s; today (MP12b1 prescreen) made no set (${hell20.requests.map((/** @type {any} */ r) => r.today.partial).join(', ')})`);
  }
  const seedLines = (/** @type {string} */ title, /** @type {any[]} */ rows, /** @type {string} */ screenName) => [`**${title}**`, '', `| Seed | Today (MP12b1) T10, s | No screen T10, s | ${screenName} T10, s | No screen / ${screenName} | Same-set clue shift (${screenName} - no screen) | Same set in both arms |`, '|---|---:|---:|---:|---:|---:|---|',
    ...rows.map((r) => `| ${r.seed} | ${sec(r.today?.t10)} | ${sec(r.w760?.t10)} | ${sec(r.main?.t10)} | ${f(r.t10Ratio)} | ${r.shiftClues === null || r.shiftClues === undefined ? '-' : `${r.shiftClues >= 0 ? '+' : ''}${f(r.shiftClues, 1)}`} | ${r.sameSet ? 'yes' : 'no'} |`)];
  const detail = [];
  if (six !== null) {
    detail.push(...seedLines(`12x12 Nightmare, ${six.seeds} seeds (${D.c5 === null ? 'IGP-03h compare.json' : 'IGP-03h c5/compare.json'}): the screen against no screen by seed`, six.rows, '190 M'), '');
  }
  const hellRows = D.igp03h.study.screenBySeed['26x26-hell-1'].rows;
  detail.push(...seedLines(`Hell 1 26x26, ${hellRows.length} seeds (IGP-03h): the screen against no screen by seed`, hellRows, '380 M'));
  return {
    measured, text: text.join('; '), completion: null, kind: 'Measured; ratios Derived', formula: 'paired T10 factors per seed (before -> no screen -> screen, ratio = the first arm over the second; n beside); the shift\'s two parts: requests served on an earlier set than today\'s and the clue shift on the same set (screen less no screen); 12x12 Nightmare from the by-seed section over every seed of IGP-03 and IGP-03h', record: 'IGP-03 `compare.json` (R33); IGP-03h `compare.json` (R33, screenBySeed, arm only) and `c5/compare.json`',
    verdict: { label: 'no verdict', why: 'R33 carries no verdict: its values are printed, and the answer to IG-P-Q17 judges them' },
    detail,
  };
}

/** @param {string} label @returns {Built} */
function rowR09(label) {
  return {
    measured: null, text: 'not measured in this round', completion: null, kind: '-', formula: '-', record: '-',
    verdict: { label: 'later round', why: `D-IG9: 16x16 and 15x20 Nightmare are not measured in the ${label} round` },
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Machine time

/**
 * The counted machine time per task and debugging run from the invocation logs, with the unused remainder.
 * @param {string} label
 * @param {string} tasksOrder
 */
function machineTime(label, tasksOrder) {
  const all = readInvocations(label);
  /** @type {Map<string, any[]>} */
  const byTask = new Map();
  for (const i of all) {
    byTask.set(i.task, [...(byTask.get(i.task) ?? []), i]);
  }
  const plans = new Map();
  for (const name of readdirSync(join(IG_DIR, 'plans')).filter((n) => n.endsWith('.json'))) {
    const plan = readJson(join(IG_DIR, 'plans', name));
    plans.set(plan.task, plan);
  }
  const order = (/** @type {string} */ t) => {
    const base = t.replace(/-dev.*$/, '');
    const at = tasksOrder.split(' ').indexOf(base);
    return (at < 0 ? 99 : at) * 2 + (t === base ? 0 : 1);
  };
  const rows = [...byTask.keys()].sort((a, b) => order(a) - order(b)).map((task) => {
    const list = /** @type {any[]} */ (byTask.get(task));
    const s = (/** @type {string} */ k) => Math.round(sum(list.map((i) => Number(i[k]))) * 10) / 10;
    const plan = plans.get(task.replace(/-dev.*$/, ''));
    const optionalRan = plan !== undefined && plan.steps.some((/** @type {any} */ st) => st.optional === true && st.locked === true && list.some((i) => i.step === st.id));
    return {
      task, dev: /-dev/.test(task), locked: list.length, nodeSeconds: s('nodeSeconds'), lockWaitSeconds: s('lockWaitSeconds'), countedSeconds: s('countedSeconds'),
      reconstructed: list.some((i) => i.reconstructed === true),
      notes: list.filter((i) => i.reconstructed === true && typeof i.note === 'string').map((i) => String(i.note).replace(/\.$/, '')),
      allocationMinutes: /-dev/.test(task) || plan === undefined ? null : plan.allocationMinutes + (optionalRan ? plan.optionalMinutes ?? 0 : 0),
    };
  });
  const counted = Math.round(sum(all.map((i) => Number(i.countedSeconds))) * 10) / 10;
  return { rows, countedSeconds: counted, roundLimitSeconds: ROUND_LIMIT_S, unusedSeconds: Math.round((ROUND_LIMIT_S - counted) * 10) / 10 };
}

/**
 * The optional locked steps of the plans that never ran under their own task, and where they ran instead.
 * @param {string} label
 * @returns {{ task: string, step: string, ranAs: string | null }[]}
 */
function skippedOptionalSteps(label) {
  const all = readInvocations(label);
  const out = [];
  for (const name of readdirSync(join(IG_DIR, 'plans')).filter((n) => n.endsWith('.json')).sort()) {
    const plan = readJson(join(IG_DIR, 'plans', name));
    for (const step of plan.steps.filter((/** @type {any} */ s) => s.optional === true && s.locked === true)) {
      if (!all.some((i) => i.task === plan.task && i.step === step.id)) {
        const elsewhere = all.find((i) => i.task !== plan.task && !/-dev/.test(i.task) && i.step === step.id);
        out.push({ task: plan.task, step: step.id, ranAs: elsewhere === undefined ? null : elsewhere.task });
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// Open questions and the later-round list

/**
 * The addenda and notes of a question in clarifications.md (their bold lead-ins), the plan author's answer so far
 * and the owner's decision line, when there is one.
 * @param {string} text
 * @param {string} heading A line that starts the question's section.
 * @param {string} id The question id.
 * @returns {{ found: boolean, addenda: string[], answer: string, owner: string | null }}
 */
function clarificationsOf(text, heading, id) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => l.startsWith(heading));
  const ownerLine = lines.find((l) => l.startsWith(`| ${id} |`));
  const owner = ownerLine === undefined ? null : ownerLine.split('|')[2].trim();
  if (start < 0) {
    return { found: false, addenda: [], answer: '', owner };
  }
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^#{1,3} /.test(lines[i]) || /^---\s*$/.test(lines[i])) {
      end = i;
      break;
    }
  }
  const section = lines.slice(start, end);
  const addenda = [];
  for (const line of section) {
    const m = /^\*\*((?:Addendum|Note) after [^*]+)\*\*/.exec(line);
    if (m !== null) {
      addenda.push(m[1].replace(/\.$/, ''));
    }
  }
  const at = section.map((l) => l.startsWith('Plan-author answer:')).lastIndexOf(true);
  const answer = at < 0 ? '' : section[at].slice('Plan-author answer:'.length).replace(/\*\*/g, '').trim();
  return { found: true, addenda, answer, owner };
}

/**
 * @param {any} D
 */
function openQuestions(D) {
  const path = abs('docs/improve-generating/clarifications.md');
  const clar = existsSync(path) ? readFileSync(path, 'utf8') : '';
  const cells = headlineCells(D);
  const setShare = HEADLINE.map((c) => `${cellName(c)} ${f(cells[c].after.setShare.median, 2)} (before ${f(cells[c].before.setShare.median, 2)})`).join('; ');
  const workRate = D.budgets.arms['IGP-01/after']?.workPerMs;
  const six = twelveBySeed(D);
  const popShift = Object.entries(D.igp01r2.populations).map(([cell, p]) => `${cellName(cell)} ${/** @type {any} */ (p).shareDifference.afterMinusMp12b1 >= 0 ? '+' : ''}${f(/** @type {any} */ (p).shareDifference.afterMinusMp12b1, 3)}`).join(', ');
  const pooled = D.pm4.pooled.perW;
  const hell = D.pm4.cells['26x26-hell-1']?.perW;
  const w380 = String(D.pm4.W.at(-1));
  const hellSplit = D.igp03h.rows.R33.value['26x26-hell-1'].screenBySeed;
  const hell20 = D.igp03h.study.armOnly?.['20x20-hell-1']?.w760;
  const strip = (/** @type {string} */ t) => t.replace(/\.+$/, '');
  const state = (/** @type {{ found: boolean, answer: string, owner: string | null }} */ c) => [
    c.answer === '' ? 'open: no plan-author answer yet' : `plan-author answer so far: ${strip(c.answer)}`, c.owner === null ? null : `owner decision: ${strip(c.owner)}`].filter((x) => x !== null).join('; ');
  const q02 = clarificationsOf(clar, '## IG-P-Q02', 'IG-P-Q02');
  const q17 = clarificationsOf(clar, '### IG-P-Q17', 'IG-P-Q17');
  const q18 = clarificationsOf(clar, '### IG-P-Q18', 'IG-P-Q18');
  return [
    {
      id: 'IG-P-Q02', title: 'One 120 s budget for set and batch, or two?', ...q02, status: state(q02), rows: ['R13', 'R20', 'R21', 'R23', 'R02', 'R04', 'R05', 'R06', 'R08'],
      bears: `the set stage's share of a request (T1 / T10 median, after arm; before arm in brackets): ${setShare}; the unit work rate ${workRate === undefined ? '-' : `${f(workRate / 1000, 0)} M units/s`} (P5's unit budgets bound work, not time: 6 G units take ${workRate === undefined ? '-' : f(6e9 / workRate / 1000, 0)} s at that rate; R21); the batch waves (R13) and the set stage at eight workers (R23); T1 and T10 of the headline cells (R02 to R08).`,
    },
    {
      id: 'IG-P-Q17', title: 'May P1 to P5 move the accepted puzzles to more clues inside the band?', ...q17, status: state(q17), rows: ['R32', 'R33', 'R02', 'R04', 'R05', 'R06', 'R07', 'R08', 'R15', 'R16', 'R17', 'R18'],
      bears: `the median clue-share shift after P1 to P5 against MP12b1 (R32): ${popShift}; the split (R33): on 12x12 Nightmare${six === null ? '' : `, ${six.seeds} seeds,`} today -> no screen x${f(six?.todayOverW760.median)} and no screen -> 190 M x${f(six?.t10Ratio.median)} with a same-set shift of ${f(six?.shiftClues.median, 2)} clues; on Hell 1 26x26 no screen / 380 M ${f(hellSplit.t10Ratio.median)} with a same-set shift of ${f(hellSplit.shiftClues.median, 2)} clues; useful ratings lost at ${D.pm4.W.map((/** @type {number} */ w) => `${w / 1e6} M`).join(' / ')}: ${D.pm4.W.map((/** @type {number} */ w) => `${pooled[String(w)].usefulLost.n} of ${pooled[String(w)].usefulLost.of}`).join(' / ')} (R15); no W is recommended (R16); the population stands beside every time verdict (R02 to R08).`,
    },
    {
      id: 'IG-P-Q18', title: 'Where PM1 found Hell windows: the routes of Hell 3 and Hell 2, and Hell 1 on 215 to 484 cells', ...q18, status: state(q18), rows: ['R27', 'R28', 'R29', 'R08', 'R15', 'R16', 'R21', 'R33'],
      bears: `in-band ratings on Hell 1 (215-484 cells), Hell 2 and Hell 3 (R27: ${['hell-1', 'hell-2', 'hell-3'].map((l) => `${l.replace('hell-', 'Hell ')} ${D.pm1.pooled[l].inBand} of ${D.pm1.pooled[l].ratings}`).join(', ')}) and why today's Hell 1 sets fail (R28); on Hell 1 26x26 the screen loses ${hell === undefined ? '-' : `${hell[w380].usefulLost.n} of ${hell[w380].usefulLost.of}`} useful ratings at ${Number(w380) / 1e6} M (R15) and is not faster than no screen (R33: no screen / 380 M T10 ${f(hellSplit.t10Ratio.median)}, n ${hellSplit.t10Ratio.n}); ${hell20 === undefined ? '' : `Hell 1 20x20 without the screen: ten of ${hell20.requests.length}: ${hell20.reached}, T10 median ${sec(hell20.t10.median)} s, where today's prescreen made no set (R27, R33).`}`,
    },
  ];
}

/** The items nobody ran in this round: the rest of the check-list's D-IG9 and the deferred arms, with their cost. */
function laterRound(D, skipped) {
  const rest = D.pm1.laterRound;
  /** @type {{ id: string, item: string, cost: string, needs: string, source: string }[]} */
  const items = [
    { id: 'R09', item: '16x16 and 15x20 Nightmare after P1-P5', cost: 'not estimated', needs: 'the frozen round', source: 'check-list §4 D-IG9' },
    { id: 'PM1', item: rest.scope, cost: `about ${rest.workerHours} worker-hours, ${rest.wallHours} h on four lanes`, needs: rest.needs, source: 'IGP-05 `pm1.json` (laterRound); D-IG10' },
    { id: 'P7', item: 'P7 itself (PM2 gives a sensitivity only), the per-set calibration prior, P5\'s enforced budgets and attempt limit, P8\'s width and admission rules, walked layouts and the held-out window audit (PM1 tranche 2), the error rate of estimated AR1 directions, browser runs', cost: 'not estimated', needs: 'a later design decision or the frozen round', source: 'check-list §4 D-IG9' },
    { id: 'D-IG7', item: 'The window re-rating variant ("re-rate when the bracket closes", D-IG7\'s other reading) and option (b) proper of IG-P-Q17 (P4 at today\'s start count)', cost: 'not estimated', needs: 'the answer to IG-P-Q17', source: 'IGP-03 (deferred); IG-P-Q17 addendum after IGP-03' },
    { id: 'Q18', item: 'A PM3 run for Hell 2 (the prototype without the screen with a start near PM1\'s windows, two or three boards)', cost: 'not estimated', needs: 'the plan author\'s answer to IG-P-Q18 (2a)', source: 'IG-P-Q18' },
    { id: 'frozen', item: 'Every task re-run on the frozen post-MP17 source (check-list §6)', cost: 'the plan author sets the sample sizes and the budget', needs: 'difficulty-v3 frozen', source: 'check-list §6' },
  ];
  for (const s of skipped) {
    items.push({ id: `${s.task}/${s.step}`, item: `Optional step ${s.step} of ${s.task} was not run under its own task${s.ranAs === null ? '' : `; it ran as ${s.ranAs}`}`, cost: s.ranAs === null ? 'see its plan' : 'counted under ' + s.ranAs, needs: s.ranAs === null ? 'the frozen round' : 'none', source: `tools/ig-proto/plans/${s.task}.json` });
  }
  return items;
}

// ---------------------------------------------------------------------------------------------------------------
// Assembly

/** @param {any} D @param {string} label The label of the records (`provisional` or `frozen`). @returns {Record<string, Built>} */
function buildRows(D, label) {
  const built = {
    R00: rowR00(D), R01: rowR01(D), R02: rowHeadline(D, 'R02'), R03: rowR03(D), R04: rowHeadline(D, 'R04'), R05: rowHeadline(D, 'R05'),
    R06: rowHeadline(D, 'R06'), R07: rowR07(D), R08: rowHeadline(D, 'R08'), R09: rowR09(label), R10: rowR10(D), R11: rowR11(D), R12: rowR12(D),
    R13: rowR13(D), R14: rowR14(D), R15: rowR15(D), R16: rowR16(D), R17: rowR17(D), R18: rowR18(D), R19: rowR19(D), R20: rowR20(D),
    R21: rowR21(D), R22: rowR22(D), R23: rowR23(D), R24: rowR24(D), R25: rowR25(D), R26: rowR26(D), R27: rowR27(D), R28: rowR28(D),
    R29: rowR29(D), R30: rowR30(D), R31: rowR31(D), R32: rowR32(D), R33: rowR33(D),
  };
  return built;
}

/** @param {string} text @returns {string} A text safe inside a Markdown table cell. */
const cell = (text) => String(text).replace(/\|/g, '/').replace(/\r?\n/g, ' ');

/**
 * @param {any} meta
 * @param {Record<string, Built>} rows
 * @param {any} time
 * @param {any[]} questions
 * @param {any[]} later
 * @param {any} D
 * @returns {string[]}
 */
function markdown(meta, rows, time, questions, later, D) {
  const lines = ['# IGP-07 summary: estimate against measured', '', banner(meta), '',
    'This summary reads the records of IGP-00 to IGP-06 and IGP-03h and the invocation logs; it generates and times nothing. Every measured value is *' + meta.labelText + '*: *Measured*, *Derived* (computed from measured data; the formula is named) or a *Projection* (an assumption is named). The verdicts are descriptive (check-list §5): they say where a measurement lies against the analysts\' values, they validate nothing, and the report\'s midpoints and the scenario values are not gates (plan author, "Direction after the joint report"). The rule of every row is in the section "Verdict rules" below: a time is **below both**, **between** or **above both** (each analyst\'s value widened by 1.35) and **inconclusive** with fewer than three after-arm values; a range is **inside** or **outside**; a point value widened by 1.35 is **below**, **inside** or **above**; the certificate and the required or hypothesised conditions **hold** or **fail**; a row that uses the unmeasured P7 is a **Projection**. R32 and R33 carry no verdict; the population stands beside every time verdict of its cell.', '',
    '## Estimate against measured (check-list §5, rows R00 to R33)', '',
    `| Row | Quantity | Estimate (kind; source) | Measured, ${meta.label} (value; completion; kind and formula) | Record | Verdict |`, '|---|---|---|---|---|---|'];
  for (const id of ROW_IDS) {
    const e = /** @type {any} */ (ESTIMATES)[id];
    const r = rows[id];
    const stop = (/** @type {string} */ t) => (/[.;]$/.test(t) ? t : `${t}.`);
    const measured = `${stop(r.text)}${r.completion === null ? '' : ` Completion: ${stop(r.completion)}`} Kind: ${stop(r.kind)} Formula: ${stop(r.formula)}`;
    const verdict = r.verdict.perCell === undefined ? `**${r.verdict.label}**${r.verdict.why === undefined ? '' : ` (${r.verdict.why})`}`
      : `**${r.verdict.label}**: ${Object.entries(r.verdict.perCell).map(([k, v]) => `${k}: ${v.label} (${v.why})`).join('; ')}. ${r.verdict.why ?? ''}`;
    lines.push(`| ${id} | ${cell(e.quantity)} | ${cell(e.estimate)}${e.source === '' ? '' : ` (${cell(e.source)})`} | ${cell(measured)} | ${cell(r.record)} | ${cell(verdict)} |`);
  }
  for (const id of ['R00', 'R32', 'R33']) {
    if (rows[id].detail !== undefined) {
      lines.push('', `## ${id}: detail${id === 'R00' ? '' : ' (no verdict)'}`, '', ...rows[id].detail);
    }
  }
  lines.push('', '## Verdict rules', '',
    `The rules of check-list §5 and the pack author's rulings of the IGP-07 review, as the one table \`RULES\` of \`summary.mjs\` holds them; the frozen round reproduces them from it. A time verdict compares the T10 median of the after arm with the analysts' values, each widened by ${WIDEN} (below both / between / above both), and needs at least ${MIN_N} after-arm requests that reached ten in the matched cohort; with fewer, or with no T10, it is **inconclusive**. A paired factor is always printed with its n, and below n = ${MIN_N} it is labelled "no factor estimate". The task file's older wording, "fewer than three paired values", is superseded by §5.`, '',
    '| Row | Rule | What is judged | Parameters |', '|---|---|---|---|');
  for (const id of ROW_IDS) {
    const r = /** @type {any} */ (RULES)[id];
    const params = [];
    if (r.cell !== undefined) {
      params.push(`cell ${r.cell}`);
    }
    if (r.values !== undefined) {
      params.push(`values ${r.values.join(', ')}${/** @type {any} */ (r).rule.startsWith('time (') ? ' waves' : ' s'}, band ${f(Math.min(...r.values) / WIDEN, 2)}-${f(Math.max(...r.values) * WIDEN, 2)} after widening by ${WIDEN}`);
    }
    if (r.range !== undefined) {
      params.push(`range ${r.range[0]}-${r.range[1]}`);
    }
    if (r.ranges !== undefined) {
      params.push(`ranges ${Object.entries(r.ranges).map(([k, v]) => `${k} ${/** @type {number[]} */ (v)[0]}-${/** @type {number[]} */ (v)[1]}`).join(', ')}`);
    }
    if (r.value !== undefined) {
      params.push(`about ${r.value}, band ${f(r.value / WIDEN, 2)}-${f(r.value * WIDEN, 2)} after widening by ${WIDEN}`);
    }
    lines.push(`| ${id} | ${cell(r.rule)} | ${cell(r.judged)} | ${cell(params.join('; ') || '-')} |`);
  }

  // R31 detail
  const r31 = /** @type {any} */ (rows.R31.measured);
  lines.push('', '## R31: after all phases (a Projection)', '',
    `The after arm's T10 median of IGP-01 (P1 to P5, four workers) ÷ the first-phase factor ÷ P7. **Transfer assumption:** the first-phase factor is measured on few cells (${r31.assumptions.measuredOn}); its transfer to every cell is an assumption. The likely factor for every cell is E:F's ${f(r31.assumptions.firstPhaseFactor.likely, 3)}; the range is the smallest to the largest measured P6 x eight-worker factor (${f(r31.assumptions.firstPhaseFactor.low, 2)} to ${f(r31.assumptions.firstPhaseFactor.high, 2)}, today's search included). P7 is ${r31.assumptions.p7.likely} (range ${r31.assumptions.p7.low} to ${r31.assumptions.p7.high}); IGP-06 does not narrow that range: with the kernel's share of the rating time at ${r31.assumptions.kernelShareRange.text}, P7 is about the kernel speed-up itself, and ÷${r31.assumptions.against} on the prototype needs the kernel ${f(r31.assumptions.neededKernelSpeedupForDivide19.min, 1)} to ${f(r31.assumptions.neededKernelSpeedupForDivide19.max, 1)} times faster. Eight workers stay an unadmitted upper bound on this machine (${r31.assumptions.machine.cpu}, ${r31.assumptions.machine.logicalCores} logical cores). Every value below is a **Projection**, never a measured or confirmed value; fast / likely / slow use the largest, likely and smallest factor with the P7 range's ends.`, '',
    '| Cell | After P1-P5 T10 median, s (n) | Projection, s: fast / likely / slow | Analysts after all, Opus / Astra | No screen (population-keeping variant) T10, s (n); Projection | Today\'s search A:C factor (reference); x P7 likely |', '|---|---|---|---|---|---|');
  /** @type {string[]} */
  const noScreenSources = [];
  for (const [name, e] of Object.entries(r31.cells)) {
    const x = /** @type {any} */ (e);
    const proj = (/** @type {any} */ p) => `${f(p.fast, 1)} / ${f(p.likely, 1)} / ${f(p.slow, 1)}`;
    const ns = x.noScreen === null ? '-' : `${sec(x.noScreen.t10Ms.median)} (${x.noScreen.t10Ms.n}; ${x.noScreen.source}); ${proj(x.noScreen.projection)}`;
    if (x.noScreen !== null) {
      noScreenSources.push(`on ${cellName(name)} the T10 median of ${x.noScreen.source.replace(/IGP-03h?\/w760/g, '`$&`')} (n ${x.noScreen.t10Ms.n})`);
    }
    const six = x.meanSixSeed === null ? '' : `; 190 M on ${x.meanSixSeed.t10Ms.n} seeds ${sec(x.meanSixSeed.t10Ms.median)} s: ${proj(x.meanSixSeed.projection)}`;
    const ref = x.todaySearchFactor === null ? '-' : `${f(x.todaySearchFactor, 3)}; ${f(x.todaySearchFactorTimesP7.likely, 2)}`;
    lines.push(`| ${cellName(name)} | ${sec(x.afterT10Ms.median)} (${x.afterT10Ms.n}) | ${proj(x.projection)}${six} | ${x.analysts.opus} / ${x.analysts.astra} | ${ns} | ${ref} |`);
  }
  lines.push('', `The no-screen rows are the population-keeping variant of IG-P-Q17's addendum after IGP-03: ${noScreenSources.join(', ')}.`);

  // R23 detail
  const r23 = /** @type {any} */ (rows.R23.measured);
  lines.push('', '## R23: one rating at eight workers (this machine)', '',
    `Machine: ${r23.machine.cpu}, ${r23.machine.logicalCores} logical cores, ${f(r23.machine.totalMemoryBytes / 2 ** 30, 0)} GiB, ${r23.machine.platform}, Node ${r23.machine.node}. The ratio is the rating time of a call at four workers over its twin's at eight (arms B and C, identical calls matched by key); below 1 is slower at eight.`, '',
    '| Cell | Twin calls matched | Rating time ratio B / C | One rating takes longer by |', '|---|---:|---:|---:|');
  for (const [name, t] of Object.entries(r23.perRatingTwinCalls)) {
    lines.push(`| ${cellName(name)} | ${/** @type {any} */ (t).matchedCalls} | ${f(/** @type {any} */ (t).ratioBC)} | ${pct(/** @type {any} */ (t).slowdown, 0)} |`);
  }

  // R24 / R30 details
  const inlining = inliningNote(D);
  lines.push('', '## R24 and R30: where the rating time goes (IGP-06)', '',
    `The phase shares are firm (stack ancestry with the widened markers, ${inlining.unplacedText}); the category and function shares depend on V8's inlining and are indicative (${inlining.text}).`, '',
    '| Cell | Ratings (complete / capped) | search | census | model | dlx | other | Kernel k | Speed-up needed for x1.3 / x1.8 / x1.87 / x1.91 |', '|---|---|---:|---:|---:|---:|---:|---:|---|');
  for (const [name, c] of Object.entries(D.pm2.cells)) {
    const x = /** @type {any} */ (c);
    lines.push(`| ${cellName(name)} | ${x.ratings.complete} / ${x.ratings.capped} | ${pct(x.phases.search.share)} | ${pct(x.phases.census.share)} | ${pct(x.phases.model.share)} | ${pct(x.phases.dlx.share)} | ${pct(x.phases.other.share)} | ${pct(x.kernelShare)} | ${['1.3', '1.8', '1.87', '1.91'].map((k) => f(x.neededKernelSpeedup[k])).join(' / ')} |`);
  }

  // machine time
  lines.push('', '## Machine time of the round (counted)', '',
    'Counted time is node time plus the lock wait up to the 45 s quiet period, per locked invocation (check-list §7); the waits for difficulty-v3 beyond it are never counted. Source: the `invocations.jsonl` files of the label. The debugging runs (`<task>-dev`) count in the round\'s total, not in the task\'s cap.', '',
    '| Task | Locked invocations | Node s | Lock wait s (not counted beyond 45 s each) | Counted s | Allocation (cap = 1.25 x) |', '|---|---:|---:|---:|---:|---|');
  for (const r of time.rows) {
    lines.push(`| ${r.task}${r.reconstructed ? ' (reconstructed line)' : ''} | ${r.locked} | ${f(r.nodeSeconds, 1)} | ${f(r.lockWaitSeconds, 1)} | ${f(r.countedSeconds, 1)} | ${r.allocationMinutes === null ? '-' : `${r.allocationMinutes} min, cap ${f(r.allocationMinutes * 75, 0)} s`} |`);
  }
  lines.push(`| **Round total** | ${sum(time.rows.map((/** @type {any} */ r) => r.locked))} | ${f(sum(time.rows.map((/** @type {any} */ r) => r.nodeSeconds)), 1)} | ${f(sum(time.rows.map((/** @type {any} */ r) => r.lockWaitSeconds)), 1)} | **${f(time.countedSeconds, 1)}** | ${time.roundLimitSeconds} s (180 min) |`);
  lines.push('', `Unused remainder of the round: **${f(time.unusedSeconds, 1)} s (${f(time.unusedSeconds / 60, 1)} min)** of ${time.roundLimitSeconds} s. IGP-07 locked nothing and timed nothing; the remainder stays unused.`);
  for (const r of time.rows.filter((/** @type {any} */ x) => x.notes.length > 0)) {
    lines.push('', `Reconstructed line of ${r.task}: ${r.notes.join('; ')}.`);
  }

  // later round
  lines.push('', '## Later round', '', '| Item | What | Cost | Needs | Source |', '|---|---|---|---|---|');
  for (const l of later) {
    lines.push(`| ${l.id} | ${cell(l.item)} | ${cell(l.cost)} | ${cell(l.needs)} | ${cell(l.source)} |`);
  }

  // open questions
  lines.push('', '## Open plan-author questions and the rows that bear on them', '');
  for (const q of questions) {
    lines.push(`### ${q.id}: ${q.title}`, '', `- Status: ${q.status}.`,
      `- Addenda and notes in \`clarifications.md\`: ${q.found ? (q.addenda.length === 0 ? 'none' : q.addenda.join('; ')) : 'not found (clarifications.md missing)'}.`,
      `- Rows that bear on it: ${q.rows.join(', ')}.`, `- What the records give: ${q.bears}`, '');
  }
  lines.push('## Notes', '',
    `- Records read: ${REQUIRED.map(([t, n]) => `${t}/${n}`).join(', ')}${D.c5 === null ? '' : ', IGP-03h/c5/compare.json'}, the published runs and journals of IGP-04 arms B and C, MP12b1's reports (R27), \`clarifications.md\` and the invocation logs.`,
    '- Nothing here is a recommendation: no `W_screen` is recommended and no offer is justified by this summary.');
  return lines;
}

/** @param {string[]} argv @returns {Promise<number>} */
async function main(argv) {
  const { args } = parseArgs(argv, { values: ['label', 'root', 'source-label', 'horizon-s'] });
  if (args.label === undefined) {
    throw new Error('--label is required');
  }
  const label = args.label;
  const root = args.root === undefined ? evidenceDir(label, '').replace(/[\\/]+$/, '') : resolve(ROOT, args.root);
  let D;
  try {
    D = loadRecords(root);
  } catch (e) {
    if (e instanceof MissingRecords) {
      process.stderr.write(`summary: ${e.message}\n`);
      return 1;
    }
    throw e;
  }
  const built = buildRows(D, label);
  const time = machineTime(label, 'IGP-00 IGP-01 IGP-02 IGP-03 IGP-03h IGP-04 IGP-05 IGP-06');
  const skipped = skippedOptionalSteps(label);
  const later = laterRound(D, skipped);
  const questions = openQuestions(D);
  const meta = await buildMeta({ task: 'IGP-07', label, kind: 'summary', trees: [], sourceLabel: args['source-label'] });
  const rows = Object.fromEntries(ROW_IDS.map((id) => {
    const e = /** @type {any} */ (ESTIMATES)[id];
    const r = built[id];
    return [id, { quantity: e.quantity, estimate: { text: e.estimate, source: e.source }, measured: r.measured, text: r.text, completion: r.completion, kind: r.kind, formula: r.formula, record: r.record, verdict: r.verdict }];
  }));
  writeJson(join(root, 'summary.json'), { meta, rules: RULES, rows, laterRound: later, machineTime: time, skippedOptionalSteps: skipped, openQuestions: questions });
  writeText(join(root, 'summary.md'), markdown(meta, built, time, questions, later, D).join('\n'));
  const verdicts = ROW_IDS.map((id) => `${id} ${built[id].verdict.label}`).join('; ');
  process.stdout.write(`summary: ${ROW_IDS.length} rows written to ${rel(root)}/summary.json and summary.md; counted ${time.countedSeconds} s, unused ${time.unusedSeconds} s\nsummary: ${verdicts}\n`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (e) {
    process.stderr.write(`summary: ${e instanceof Error ? e.stack ?? e.message : String(e)}\n`);
    process.exitCode = 1;
  }
}
