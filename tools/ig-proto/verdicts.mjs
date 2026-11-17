// @ts-check
// Admission statistics of plan section 5.2, row level (V4-T09a; reviews R12, RV2-06, RV2-18, RV3-08): which published
// rows are valid measurements, completion and the capped T10 kept apart from the deadline (D-V4-16), and the
// per-puzzle evidence (puzzle keys, clue counts) that every comparison needs before it may compare anything. Missing,
// invalid, censored or erroneous data is incomplete evidence, never a pass; an invalid puzzle or pack is a
// correctness failure. Pure functions of published rows. V4-T09b adds the pairing, the matched sets and the clue,
// faster and no-regression rules; V4-T09c adds the work ledger of a request (IG-P-Q37: an interval of consumed units
// from the journal and linkage lines), the work rule and the class verdict; V4-T09d adds the global verdicts (the cell
// gates on the arm a class ships, Master identity, the Hell 1 report, P5's stops, the post-hoc projection, the
// population and phase 0's verdict) and V4-T09e the verdict tool; the manifest the tool reads is described in
// data/verdict-manifest.schema.md.
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { pairPrimitives } from './lib/ledger.mjs';
import { sourceRoot } from './lib/paths.mjs';

// The record schema of the frozen source (V4-T01a), never the worktree's.
const { validateRunRecord } = await import(pathToFileURL(join(sourceRoot('frozen'), 'tools', 'bench', 'report.js')).href);
// The level ladder of the frozen source: the band of a puzzle's level, for the population's score position.
const { level: levelOf } = await import(pathToFileURL(join(sourceRoot('frozen'), 'core', 'engine', 'levels.js')).href);

/** @typedef {'valid' | 'invalid' | 'incorrect' | 'censored' | 'error'} RowStatus */
/** @typedef {{ status: RowStatus, problems: string[] }} RunStatus */
/**
 * @typedef {object} IngestedRow
 * @property {any} rowKey
 * @property {any} caseId
 * @property {any} rep
 * @property {any} seed
 * @property {any} run
 * @property {RowStatus} status
 * @property {string[]} problems
 */

/** The statuses of a row, in the order `runStatus` tries them (`valid` last). */
const STATUSES = Object.freeze(['invalid', 'incorrect', 'censored', 'error', 'valid']);
/** The tail observation of plan section 5.2 is defined over exactly 20 valid requests. */
const TAIL_REQUESTS = 20;
const KEY = /^[0-9a-f]{64}$/;

/** @param {unknown} v @returns {v is number} */
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** @param {unknown} v @returns {boolean} An integer from 0. */
const isCount = (v) => typeof v === 'number' && Number.isInteger(v) && v >= 0;

/** @param {unknown} v @returns {v is Record<string, any>} */
const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * @param {string} name
 * @param {unknown} value
 * @param {boolean} integer
 * @returns {void} Throws unless the value is a finite number above 0 (an integer when asked): a missing option must
 *   not turn every comparison into a vacuous one.
 */
function needPositive(name, value, integer) {
  if (!isNum(value) || value <= 0 || (integer && !Number.isInteger(value))) {
    throw new RangeError(`verdicts: ${name} must be a positive ${integer ? 'integer' : 'number'}, got ${String(value)}`);
  }
}

/** @param {unknown} e @returns {unknown} The phase of an `errors` entry. */
const phaseOf = (e) => (isObject(e) ? e.phase : undefined);

/** @param {unknown} e @returns {string} */
const describeError = (e) => (isObject(e) ? `error ${String(e.phase)}/${String(e.code)}` : 'an errors entry that is not an object');

/**
 * Judges one run record (the `RunRecord` of `tools/bench/report.js`); the first status that matches wins (RV2-18).
 * `invalid`: the record fails the frozen schema, is not a generation probe, has no valid count or response time, or
 * reached ten without a valid T10. `incorrect` (a correctness failure, kept apart from missing evidence): an invalid
 * puzzle or pack, an unexpected unsatisfiable certificate, or `invalid-accepted`. `censored` (no measurement exists):
 * `measurementValid` false, an interrupted run or a host failure. `error`: any other `errors` entry. `valid`: none of
 * these; a normal measured failure (`set:<reason>`, `time-limit`, `partial` with fewer than ten puzzles) is valid.
 * @param {unknown} run
 * @param {{ quantity: number }} options
 * @returns {RunStatus} `problems` names each matched condition of the winning status; empty for `valid`.
 */
export function runStatus(run, { quantity }) {
  needPositive('quantity', quantity, true);
  const shape = validateRunRecord(run).map((/** @type {string} */ p) => `record: ${p}`);
  if (!isObject(run)) {
    return { status: 'invalid', problems: shape };
  }
  const invalid = [...shape];
  if (run.probeKind !== 'generation') {
    invalid.push(`probeKind is ${JSON.stringify(run.probeKind)}, not "generation"`);
  }
  if (!isCount(run.acceptedCount)) {
    invalid.push('acceptedCount is not an integer from 0');
  }
  if (!(isNum(run.responseMs) && run.responseMs >= 0)) {
    invalid.push('responseMs is not a finite number from 0');
  }
  if (isCount(run.acceptedCount) && run.acceptedCount >= quantity) {
    const tenth = run.tenthReadyMs;
    if (!(isNum(tenth) && tenth >= 0 && (!isNum(run.responseMs) || tenth <= run.responseMs))) {
      invalid.push(`tenthReadyMs is not a finite number from 0 to responseMs although ${run.acceptedCount} puzzles were accepted`);
    }
  }
  if (invalid.length > 0) {
    return { status: 'invalid', problems: invalid };
  }
  const errors = /** @type {unknown[]} */ (run.errors);
  const incorrect = [
    ...errors.filter((e) => phaseOf(e) === 'validation' || phaseOf(e) === 'certificates').map(describeError),
    ...(run.partialReason === 'invalid-accepted' ? ['partialReason is invalid-accepted'] : []),
  ];
  if (incorrect.length > 0) {
    return { status: 'incorrect', problems: incorrect };
  }
  const censored = [
    ...(run.measurementValid === false ? ['measurementValid is false'] : []),
    ...(run.interrupted === true ? ['the run was interrupted'] : []),
    ...errors.filter((e) => phaseOf(e) === 'host').map(describeError),
  ];
  if (censored.length > 0) {
    return { status: 'censored', problems: censored };
  }
  const other = errors.filter((e) => !['validation', 'certificates', 'host'].includes(/** @type {string} */ (phaseOf(e)))).map(describeError);
  return other.length > 0 ? { status: 'error', problems: other } : { status: 'valid', problems: [] };
}

/**
 * Judges one published row (`{ rowKey, caseId, rep, seed, localRep, run }`, `arm.mjs publish`): invalid also when the
 * run's case or seed is not the row's, else the status of its run (R12, RV2-18). Only `valid` rows enter a statistic.
 * @param {unknown} row
 * @param {{ quantity: number }} options
 * @returns {IngestedRow}
 */
export function ingestRow(row, { quantity }) {
  if (!isObject(row)) {
    return { rowKey: null, caseId: null, rep: null, seed: null, run: null, status: 'invalid', problems: ['the row is not an object'] };
  }
  const { rowKey, caseId, rep, seed, run } = row;
  const judged = runStatus(run, { quantity });
  /** @type {string[]} */
  const mismatches = [];
  if (isObject(run)) {
    if (run.caseId !== caseId) {
      mismatches.push(`run.caseId ${JSON.stringify(run.caseId)} is not the row's caseId ${JSON.stringify(caseId)}`);
    }
    if (run.seed !== seed) {
      mismatches.push(`run.seed ${JSON.stringify(run.seed)} is not the row's seed ${JSON.stringify(seed)}`);
    }
  }
  if (mismatches.length > 0) {
    return { rowKey, caseId, rep, seed, run, status: 'invalid', problems: [...mismatches, ...(judged.status === 'invalid' ? judged.problems : [])] };
  }
  return { rowKey, caseId, rep, seed, run, status: judged.status, problems: judged.problems };
}

/**
 * @param {any} run A valid row's run.
 * @param {{ quantity: number }} options
 * @returns {boolean} Whether the request holds ten puzzles, whatever its time (D-V4-16). Throws on a missing or invalid
 *   `quantity`: it would otherwise read every row as "never reached ten".
 */
export function reachedTen(run, { quantity }) {
  needPositive('quantity', quantity, true);
  return run.acceptedCount >= quantity;
}

/**
 * @param {any} run A valid row's run.
 * @param {{ quantity: number, capMs: number }} options
 * @returns {number} The T10 of a request that reached ten, at most `capMs`; `capMs` for one that did not (plan
 *   section 5.2, IG-P-Q26: one endpoint for both arms). Throws on a request that reached ten without a T10, which is
 *   not a valid row: an invalid row never enters a statistic.
 */
export function cappedT10(run, { quantity, capMs }) {
  needPositive('capMs', capMs, false);
  if (!reachedTen(run, { quantity })) {
    return capMs;
  }
  if (!isNum(run.tenthReadyMs) || run.tenthReadyMs < 0) {
    throw new RangeError('verdicts: a request with ten puzzles has no valid tenthReadyMs (not a valid row)');
  }
  return Math.min(run.tenthReadyMs, capMs);
}

/**
 * @param {any} run A valid row's run.
 * @param {{ responseBoundMs: number }} options
 * @returns {boolean} Whether the response came after the hard bound; reported apart, enforced by the live-deadline
 *   receipt (N-V4-13), never by the completion count.
 */
export function deadlineViolation(run, { responseBoundMs }) {
  needPositive('responseBoundMs', responseBoundMs, false);
  return run.responseMs > responseBoundMs;
}

/**
 * The completion record of a cell over its ingested rows (RV2-06): the rows by status, the valid requests that reached
 * ten, the deadline violations (both over valid rows only) and the tail observation: over exactly 20 valid rows, the
 * second-largest uncapped T10 (a nearest-rank p95 of 20), a request that did not reach ten being larger than every
 * number; `null` when that second-largest is such a request or the cell does not have exactly 20 valid rows. The tail
 * is reported, never gated. `capMs` belongs to the shared options of the ratio statistics and is not used here.
 * @param {IngestedRow[]} rows
 * @param {{ quantity: number, capMs?: number, responseBoundMs: number }} options
 * @returns {{ requests: number, statuses: Record<RowStatus, number>, reachedTen: number, deadlineViolations: number, p95Ms: number | null }}
 */
export function completion(rows, { quantity, responseBoundMs }) {
  needPositive('quantity', quantity, true);
  needPositive('responseBoundMs', responseBoundMs, false);
  /** @type {Record<RowStatus, number>} */
  const statuses = { valid: 0, invalid: 0, incorrect: 0, censored: 0, error: 0 };
  for (const r of rows) {
    if (!STATUSES.includes(r.status)) {
      throw new TypeError(`verdicts: a row has the status ${String(r.status)}; completion reads ingested rows`);
    }
    statuses[r.status] += 1;
  }
  const valid = rows.filter((r) => r.status === 'valid');
  const times = valid.map((r) => (reachedTen(r.run, { quantity }) ? r.run.tenthReadyMs : Infinity));
  // Not `a - b`: two requests that did not reach ten are both Infinity.
  times.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const tail = valid.length === TAIL_REQUESTS ? times[TAIL_REQUESTS - 2] : null;
  return {
    requests: rows.length,
    statuses,
    reachedTen: valid.filter((r) => reachedTen(r.run, { quantity })).length,
    deadlineViolations: valid.filter((r) => deadlineViolation(r.run, { responseBoundMs })).length,
    p95Ms: tail !== null && Number.isFinite(tail) ? tail : null,
  };
}

/**
 * The puzzle keys of a request (`run.details.igPuzzleKeys`, written by the `instr` variant) and their problem, else null.
 * @param {any} details
 * @param {number} accepted Positive.
 * @returns {string | null}
 */
function keysProblem(details, accepted) {
  const keys = details?.igPuzzleKeys;
  if (!Array.isArray(keys)) {
    return 'missing puzzle keys';
  }
  if (keys.length !== accepted) {
    return `puzzle keys: ${keys.length} of ${accepted}`;
  }
  const malformed = keys.findIndex((k) => typeof k !== 'string' || !KEY.test(k));
  if (malformed >= 0) {
    return `malformed puzzle key ${malformed}`;
  }
  const seen = new Set();
  for (const [i, k] of keys.entries()) {
    if (seen.has(k)) {
      return `duplicate puzzle key ${i}`;
    }
    seen.add(k);
  }
  return null;
}

/**
 * The clue counts of a request (`run.details.K` and `run.details.puzzles[].clues`, written by the runner) and their
 * problem, else null.
 * @param {any} details
 * @param {number} accepted Positive.
 * @returns {string | null}
 */
function cluesProblem(details, accepted) {
  const K = details?.K;
  if (!Number.isInteger(K) || K < 1) {
    return 'missing K';
  }
  const puzzles = details.puzzles;
  if (!Array.isArray(puzzles)) {
    return 'missing clue counts';
  }
  if (puzzles.length !== accepted) {
    return `clues: ${puzzles.length} of ${accepted}`;
  }
  const bad = puzzles.findIndex((p) => !Number.isInteger(p?.clues) || p.clues < 0 || p.clues > K);
  return bad >= 0 ? `clue out of range at ${bad}` : null;
}

/**
 * The per-puzzle evidence of a valid row (RV3-08): `null` for what is complete, else the reason it is not. A valid row
 * with no accepted puzzle has complete evidence (an empty list) whatever its `details` holds. Missing evidence is never
 * equality and never a zero difference: the consumers make the affected statistic or gate incomplete. A run whose
 * `acceptedCount` is not an integer from 0 is not a valid row; its evidence is incomplete.
 * @param {any} run
 * @returns {{ keys: string | null, clues: string | null }}
 */
export function puzzleEvidence(run) {
  const accepted = run?.acceptedCount;
  if (!isCount(accepted)) {
    const reason = 'acceptedCount is not an integer from 0';
    return { keys: reason, clues: reason };
  }
  if (accepted === 0) {
    return { keys: null, clues: null };
  }
  return { keys: keysProblem(run.details, accepted), clues: cluesProblem(run.details, accepted) };
}

/** @typedef {{ rep: any, seed: any, a: IngestedRow, b: IngestedRow }} Pair */
/** @typedef {{ rep: any, seed: any, screen: number, noScreen: number, d: number }} MatchedSet */

/** The resampled lower bound is the 10th percentile of the resampled geometric means (plan section 5.2, the recipe). */
const LOWER_QUANTILE = 0.1;

/**
 * The generator of the resampling (plan section 5.2: a random seed written in the manifest): the same seed gives the
 * same sequence on every machine.
 * @param {number} seed
 * @returns {() => number} A function that returns the next value, from 0 up to but not including 1.
 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {number[]} values A non-empty list of finite numbers.
 * @returns {number} The median; of an even list the mean of its two middle values. Throws on an empty list: no data
 *   has no median.
 */
export function median(values) {
  if (!Array.isArray(values) || values.length === 0 || !values.every(isNum)) {
    throw new RangeError('verdicts: median needs a non-empty list of finite numbers');
  }
  const sorted = values.slice().sort((x, y) => x - y);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * @param {number[]} values A non-empty list of finite numbers above 0 (a ratio of two capped times).
 * @returns {number} `Math.exp` of the mean of `Math.log`. Throws on any other input: a zero, a negative or a
 *   non-finite ratio is not a measurement and must not turn a gate into a vacuous pass.
 */
export function geoMean(values) {
  if (!Array.isArray(values) || values.length === 0 || !values.every((x) => isNum(x) && x > 0)) {
    throw new RangeError('verdicts: geoMean needs a non-empty list of finite numbers above 0');
  }
  return Math.exp(values.reduce((sum, x) => sum + Math.log(x), 0) / values.length);
}

/**
 * @param {unknown} reps
 * @returns {void} Throws unless the declared replicates are a non-empty list of distinct integers: a missing or repeated
 *   replicate would change every pairing and every resample.
 */
function needReps(reps) {
  if (!Array.isArray(reps) || reps.length === 0 || !reps.every(Number.isInteger) || new Set(reps).size !== reps.length) {
    throw new RangeError('verdicts: reps must be a non-empty list of distinct integers');
  }
}

/**
 * @param {{ resamples?: unknown, resampleSeed?: unknown }} options
 * @returns {void} Throws unless the options of the recipe are a positive integer and an integer.
 */
function needResampling({ resamples, resampleSeed }) {
  needPositive('resamples', resamples, true);
  if (!Number.isInteger(resampleSeed)) {
    throw new RangeError(`verdicts: resampleSeed must be an integer, got ${String(resampleSeed)}`);
  }
}

/**
 * @param {string} name
 * @param {unknown} series
 * @param {number} length
 * @returns {void} Throws unless the series is a list of `length` ratios, each a finite number above 0. A `null`
 *   (a rep without a pair, `ratiosOf`) is not a ratio: it is incomplete evidence, which the caller judges before it asks
 *   for a statistic.
 */
function needSeries(name, series, length) {
  if (!Array.isArray(series) || series.length !== length) {
    throw new RangeError(`verdicts: ${name} needs ${length} ratios, one per declared rep`);
  }
  const bad = series.findIndex((x) => !(isNum(x) && x > 0));
  if (bad >= 0) {
    throw new RangeError(`verdicts: ${name} has no ratio above 0 at index ${bad} (${String(series[bad])})`);
  }
}

/**
 * The geometric means of `resamples` resamples of the declared replicates, drawn with replacement; the drawn indices
 * are shared by every series (every cell of the class), and a resample's value is the geometric mean over every
 * (series, drawn index) pair.
 * @param {number[][]} series Each as long as `length`.
 * @param {number} length
 * @param {{ resamples: number, resampleSeed: number }} options
 * @returns {number} The value at index `Math.ceil(0.1 * resamples) - 1` of the ascending resampled means.
 */
function resampledLower(series, length, { resamples, resampleSeed }) {
  const rand = mulberry32(resampleSeed);
  const means = [];
  for (let r = 0; r < resamples; r += 1) {
    const drawn = Array.from({ length }, () => Math.floor(rand() * length));
    means.push(geoMean(series.flatMap((s) => drawn.map((i) => s[i]))));
  }
  means.sort((x, y) => x - y);
  return means[Math.ceil(LOWER_QUANTILE * resamples) - 1];
}

/** @param {IngestedRow} row @returns {string} The first problem of a row and how many more it has. */
function firstProblem(row) {
  const more = row.problems.length - 1;
  return row.problems.length === 0 ? '' : ` (${row.problems[0]}${more > 0 ? `, +${more} more` : ''})`;
}

/**
 * Pairs the ingested rows of one cell by request identity (R12): two rows are the same request when `caseId`, `rep`
 * and `seed` are equal, and the manifest declares the replicates. A pair exists only where both arms have exactly one
 * row at the rep, both rows are valid and their case and seed agree; every other case is a pairing problem, the
 * statistic that needs the pair is incomplete, and nothing is dropped silently. An `incorrect` row is also a
 * correctness failure, wherever it stands: a duplicate or an undeclared row does not hide it.
 * @param {IngestedRow[]} rowsA The first arm's rows (class use: the screen arm; no-regression use: after).
 * @param {IngestedRow[]} rowsB The second arm's rows (class use: no screen; no-regression use: today's).
 * @param {number[]} reps The declared replicates of the cell.
 * @returns {{ pairs: Pair[], problems: string[], incorrect: { side: 'a' | 'b', rep: any }[] }} `pairs` in the order of `reps`.
 */
export function pairRows(rowsA, rowsB, reps) {
  needReps(reps);
  /** @type {['a' | 'b', IngestedRow[]][]} */
  const sides = [['a', rowsA], ['b', rowsB]];
  for (const [side, rows] of sides) {
    if (!Array.isArray(rows) || rows.some((r) => !STATUSES.includes(/** @type {any} */ (r)?.status))) {
      throw new TypeError(`verdicts: the rows of side ${side} are not a list of ingested rows`);
    }
  }
  const declared = new Set(reps);
  /** @type {Pair[]} */
  const pairs = [];
  /** @type {string[]} */
  const problems = [];
  /** @type {{ side: 'a' | 'b', rep: any }[]} */
  const incorrect = [];
  for (const [side, rows] of sides) {
    for (const r of rows) {
      if (r.status === 'incorrect') {
        incorrect.push({ side, rep: r.rep });
      }
    }
  }
  for (const rep of reps) {
    const [a, b] = sides.map(([, rows]) => rows.filter((r) => r.rep === rep));
    for (const [side, found] of /** @type {['a' | 'b', IngestedRow[]][]} */ ([['a', a], ['b', b]])) {
      if (found.length === 0) {
        problems.push(`missing row: side ${side} rep ${rep}`);
      } else if (found.length > 1) {
        problems.push(`duplicate rows: side ${side} rep ${rep} has ${found.length}`);
      } else if (found[0].status !== 'valid') {
        problems.push(`status ${found[0].status}: side ${side} rep ${rep}${firstProblem(found[0])}`);
      }
    }
    if (a.length !== 1 || b.length !== 1) {
      continue;
    }
    const agree = [['case', a[0].caseId, b[0].caseId], ['seed', a[0].seed, b[0].seed]].filter(([, x, y]) => x !== y);
    for (const [what, x, y] of agree) {
      problems.push(`${what} differs at rep ${rep}: side a ${JSON.stringify(x)}, side b ${JSON.stringify(y)}`);
    }
    if (agree.length === 0 && a[0].status === 'valid' && b[0].status === 'valid') {
      pairs.push({ rep, seed: a[0].seed, a: a[0], b: b[0] });
    }
  }
  for (const [side, rows] of sides) {
    for (const r of rows) {
      if (!declared.has(r.rep)) {
        problems.push(`row outside the declared replicates: side ${side} rep ${String(r.rep)}`);
      }
    }
  }
  return { pairs, problems, incorrect };
}

/**
 * The matched sets of the pairs (IG-P-Q35, RV3-08): a pair whose `run.details.igSetKey` are strings and equal and
 * whose arms each accepted at least one puzzle, with complete clue evidence on both sides (`puzzleEvidence(run).clues`
 * is null). A pair that meets the first conditions but lacks the clue evidence is not a matched set and is listed in
 * `evidence`, one entry per side, never read as a zero difference; the class is then inconclusive (T09c). Any other
 * pair is simply not a matched set (the completion record keeps its outcome).
 * @param {Pair[]} pairs From `pairRows`: valid rows of both arms.
 * @returns {{ matched: MatchedSet[], evidence: { rep: any, side: 'a' | 'b', problem: string }[] }} `screen` and
 *   `noScreen` are the per-set clue values (the median of `run.details.puzzles[].clues`) of the first and the second
 *   arm and `d = screen - noScreen`.
 */
export function matchedSets(pairs) {
  /** @type {MatchedSet[]} */
  const matched = [];
  /** @type {{ rep: any, side: 'a' | 'b', problem: string }[]} */
  const evidence = [];
  for (const { rep, seed, a, b } of pairs) {
    const keyA = a.run?.details?.igSetKey;
    const keyB = b.run?.details?.igSetKey;
    if (typeof keyA !== 'string' || keyA !== keyB) {
      continue;
    }
    if (!(isCount(a.run.acceptedCount) && a.run.acceptedCount >= 1 && isCount(b.run.acceptedCount) && b.run.acceptedCount >= 1)) {
      continue;
    }
    const problemA = puzzleEvidence(a.run).clues;
    const problemB = puzzleEvidence(b.run).clues;
    if (problemA !== null || problemB !== null) {
      if (problemA !== null) {
        evidence.push({ rep, side: 'a', problem: problemA });
      }
      if (problemB !== null) {
        evidence.push({ rep, side: 'b', problem: problemB });
      }
      continue;
    }
    const screen = median(a.run.details.puzzles.map((/** @type {{ clues: number }} */ p) => p.clues));
    const noScreen = median(b.run.details.puzzles.map((/** @type {{ clues: number }} */ p) => p.clues));
    matched.push({ rep, seed, screen, noScreen, d: screen - noScreen });
  }
  return { matched, evidence };
}

/**
 * Rule (c5), the clue tolerance, pooled over the matched sets of the whole class (plan section 5.2): the median of the
 * per-set difference is at most 0.5 clues and at most one matched set in five moves by two clues or more. No matched
 * set is no evidence: `pass` is false and `medianDiff` null.
 * @param {MatchedSet[]} matched The matched sets of every cell of the class.
 * @returns {{ n: number, medianDiff: number | null, moved2: number, pass: boolean }}
 */
export function clueRule(matched) {
  const n = matched.length;
  const moved2 = matched.filter((m) => Math.abs(m.d) >= 2).length;
  const medianDiff = n > 0 ? median(matched.map((m) => m.d)) : null;
  return { n, medianDiff, moved2, pass: medianDiff !== null && medianDiff <= 0.5 && 5 * moved2 <= n };
}

/**
 * The per-rep ratio of the capped T10s (D-V4-16, one endpoint): `cappedT10(b) / cappedT10(a)` of the pair at each
 * declared rep (class use: no screen over screen, so above 1 favours the screen; no-regression use: today over
 * after). A request that did not reach ten enters at `capMs`.
 * @param {Pair[]} pairs From `pairRows`.
 * @param {number[]} reps The declared replicates of the cell.
 * @param {{ quantity: number, capMs: number }} options
 * @returns {(number | null)[]} In the order of `reps`; `null` for a rep without a pair (incomplete, never a ratio).
 */
export function ratiosOf(pairs, reps, { quantity, capMs }) {
  needReps(reps);
  needPositive('quantity', quantity, true);
  needPositive('capMs', capMs, false);
  /** @type {Map<any, Pair>} */
  const byRep = new Map();
  for (const p of pairs) {
    if (byRep.has(p.rep)) {
      throw new RangeError(`verdicts: two pairs at rep ${String(p.rep)}`);
    }
    byRep.set(p.rep, p);
  }
  return reps.map((rep) => {
    const p = byRep.get(rep);
    return p === undefined ? null : cappedT10(p.b.run, { quantity, capMs }) / cappedT10(p.a.run, { quantity, capMs });
  });
}

/**
 * Rule (c5), faster (plan section 5.2, the recipe): the geometric mean of the per-rep ratios over all (cell, rep)
 * pairs, every cell with the same reps and the same weight; its lower bound is the 10th percentile of `resamples`
 * resamples of the reps with replacement, the same drawn reps applied to every cell; and no cell's own geometric mean
 * may be below 1.0. Passes at a geometric mean of at least 1.15, a lower bound above 1.0 and every cell at least 1.0.
 * Throws on a series that is not complete (a `null` from `ratiosOf`): the caller judges missing evidence first.
 * @param {Record<string, (number | null)[]>} ratiosByCell From a cell to its `ratiosOf`, each as long as `reps`.
 * @param {number[]} reps The declared replicates, the same for every cell.
 * @param {{ resamples: number, resampleSeed: number }} options
 * @returns {{ geoMean: number, lower: number, cellGeoMeans: Record<string, number>, pass: boolean }}
 */
export function fasterRule(ratiosByCell, reps, { resamples, resampleSeed }) {
  needReps(reps);
  needResampling({ resamples, resampleSeed });
  const cells = Object.keys(ratiosByCell);
  if (cells.length === 0) {
    throw new RangeError('verdicts: fasterRule needs at least one cell');
  }
  for (const cell of cells) {
    needSeries(`cell ${cell}`, ratiosByCell[cell], reps.length);
  }
  const series = /** @type {number[][]} */ (cells.map((cell) => ratiosByCell[cell]));
  const cellGeoMeans = Object.fromEntries(cells.map((cell, i) => [cell, geoMean(series[i])]));
  const overall = geoMean(series.flat());
  const lower = resampledLower(series, reps.length, { resamples, resampleSeed });
  return { geoMean: overall, lower, cellGeoMeans, pass: overall >= 1.15 && lower > 1.0 && cells.every((cell) => cellGeoMeans[cell] >= 1.0) };
}

/**
 * The no-regression bound of a control (plan section 5.2): the same recipe for one cell, with the per-rep ratio today
 * over after; passes when the resampled lower bound is at least 0.9.
 * @param {(number | null)[]} ratios `ratiosOf` of the pairs (A after, B today), as long as `reps`.
 * @param {number[]} reps The declared replicates.
 * @param {{ resamples: number, resampleSeed: number }} options
 * @returns {{ geoMean: number, lower: number, pass: boolean }}
 */
export function noRegression(ratios, reps, { resamples, resampleSeed }) {
  needReps(reps);
  needResampling({ resamples, resampleSeed });
  needSeries('noRegression', ratios, reps.length);
  const series = /** @type {number[]} */ (ratios);
  const lower = resampledLower([series], reps.length, { resamples, resampleSeed });
  return { geoMean: geoMean(series), lower, pass: lower >= 0.9 };
}

/** @param {unknown} v @returns {v is number} A finite number from 0: units of work or a proved bound. */
const isUnits = (v) => isNum(v) && v >= 0;

/**
 * Parses the text of one journal file (V4-T09c): one JSON object per line. An empty last line (the final newline) is
 * ignored; every other line that is not a JSON object (a line cut by a kill, an empty line, a value that is not an
 * object) is the problem `unparseable line <n> of <file>`, with `n` counted from 1. A caller joins these problems to
 * its row's ledger: a lost line is a lost measurement, never zero work.
 * @param {string} text
 * @param {string} file The name the problems cite.
 * @returns {{ lines: Record<string, any>[], problems: string[] }}
 */
export function parseLines(text, file) {
  if (typeof text !== 'string' || typeof file !== 'string') {
    throw new TypeError('verdicts: parseLines needs the text and the name of a file');
  }
  const pieces = text.split('\n');
  if (pieces[pieces.length - 1] === '') {
    pieces.pop();
  }
  /** @type {Record<string, any>[]} */
  const lines = [];
  /** @type {string[]} */
  const problems = [];
  pieces.forEach((piece, index) => {
    /** @type {unknown} */
    let parsed;
    try {
      parsed = JSON.parse(piece);
    } catch {
      parsed = undefined;
    }
    if (isObject(parsed)) {
      lines.push(parsed);
    } else {
      problems.push(`unparseable line ${index + 1} of ${file}`);
    }
  });
  return { lines, problems };
}

/**
 * @typedef {object} RowLedger The work ledger of one request row (IG-P-Q37, D-V4-17).
 * @property {boolean} complete No problem: the bookkeeping of the row is whole. Only a complete ledger is evidence;
 *   the numbers of an incomplete one are the best the lines allow, never zero work.
 * @property {string[]} problems
 * @property {number} calls The `start` lines.
 * @property {number} ended Calls closed by their own `end` line.
 * @property {number} terminated Calls closed by a confirmed `worker-end` line.
 * @property {number} open The primitives left open by the terminated calls, whose bounds `hi` adds.
 * @property {number} lo The units of the completed primitives of the closed calls.
 * @property {number} hi `lo` plus the bound of every open primitive (infinite when such a bound is not a number).
 * @property {number} ratingWork `lo`'s share of ratings (the sum of the `p` lines' main and census units).
 * @property {number} countWork `lo`'s share of uniqueness counts.
 */

/** The journal line types that belong to a call. */
const CALL_LINES = Object.freeze(['p', 'phase', 'caps', 'begin', 'count', 'end']);
/** The stages a selection call can have; `other` (no `igStage`) is attributed to no task. */
const CALL_STAGES = Object.freeze(['set', 'batch', 'completion']);
/** The returned outcomes of a task for which no selection call ran (`core/engine/generate.js:131-136`, `:226-237`, `:309`). */
const PRE_SELECTION = Object.freeze({ set: ['carve', 'internal'], layout: ['layout'] });

/** @param {any} line @returns {number | null} The units of a `p` line (`tuple[4] + tuple[5]`), `null` when either is not valid. */
const unitsOfP = (line) => (Array.isArray(line.tuple) && isUnits(line.tuple[4]) && isUnits(line.tuple[5]) ? line.tuple[4] + line.tuple[5] : null);

/**
 * The work ledger of one request row as an interval `[lo, hi]` of consumed units (V4-T09c; IG-P-Q37, RV3-07, RV4-02).
 * A worker killed inside a primitive leaves that primitive's units unreported but bounded: a call closed by a
 * confirmed worker termination adds the proved bound of its one open primitive to `hi`. Every other loss is a problem
 * and makes the ledger incomplete: nothing missing is read as zero work. The rules, in order: no linkage; one call per
 * `start` line; ownership of every line; valid work values; the count capability; primitive pairing
 * (`pairPrimitives` of `lib/ledger.mjs`); closure (an `end`, or a `worker-end` line of the call's own process and
 * thread not before its start); reconciliation of an ended call with its `end` line; the stage; every returned task
 * matched to its own ended call by identity.
 * @param {Record<string, any>[]} lines Every line of the row's worker journals, each file's lines in file order.
 * @param {Record<string, any>[] | null} linkLines The lines of `<rowKey>.link.jsonl`, `null` when the file is absent.
 * @returns {RowLedger}
 */
export function rowLedger(lines, linkLines) {
  const objects = (/** @type {unknown} */ list) => Array.isArray(list) && list.every(isObject);
  if (!objects(lines) || (linkLines !== null && !objects(linkLines))) {
    throw new TypeError('verdicts: rowLedger needs the parsed journal lines and the link lines (or null)');
  }
  /** @type {string[]} */
  const problems = [];
  const add = (/** @type {string} */ problem) => {
    if (!problems.includes(problem)) {
      problems.push(problem);
    }
  };
  if (linkLines === null) {
    add('no linkage');
  }
  /** @type {Map<string, { id: string, start: Record<string, any>, lines: Record<string, any>[] }>} */
  const calls = new Map();
  let starts = 0;
  lines.forEach((line, index) => {
    if (line.t !== 'start') {
      return;
    }
    if (typeof line.call !== 'string' || line.call === '') {
      add(`invalid start line ${index}`);
      return;
    }
    starts += 1;
    if (calls.has(line.call)) {
      add(`duplicate start ${line.call}`);
    } else {
      calls.set(line.call, { id: line.call, start: line, lines: [] });
    }
  });
  for (const line of lines) {
    if (!CALL_LINES.includes(line.t)) {
      continue;
    }
    const owner = typeof line.call === 'string' ? calls.get(line.call) : undefined;
    if (owner === undefined) {
      add(`unowned ${line.t} line ${line.call}`);
    } else {
      owner.lines.push(line);
    }
  }
  const terminations = (linkLines ?? []).filter((l) => l.ev === 'worker-end');
  // A call id is `<row>:<pid>:<threadId>:<sequence>`, and the row may hold colons: the fields count from the end.
  const closedBy = (/** @type {{ id: string, start: Record<string, any> }} */ call) => {
    const fields = call.id.split(':');
    return fields.length >= 3 && terminations.some((w) => String(w.threadId) === fields[fields.length - 2]
      && String(w.pid) === fields[fields.length - 3] && isNum(w.at) && isNum(call.start.at) && w.at >= call.start.at);
  };
  let ended = 0;
  let terminated = 0;
  let open = 0;
  let lo = 0;
  let hi = 0;
  let ratingWork = 0;
  let countWork = 0;
  /** @type {{ id: string, start: Record<string, any> }[]} */
  const endedCalls = [];
  for (const call of calls.values()) {
    const { id, start } = call;
    const ofType = (/** @type {string} */ t) => call.lines.filter((l) => l.t === t);
    const ends = ofType('end');
    const ratings = ofType('p').map(unitsOfP);
    const counts = ofType('count');
    const ratingSum = ratings.reduce((/** @type {number} */ sum, u) => sum + (u ?? 0), 0);
    const countSum = counts.reduce((sum, l) => sum + (isUnits(l.units) ? l.units : 0), 0);
    const invalidRatings = ratings.includes(null);
    const invalidCounts = counts.some((l) => !isUnits(l.units));
    if (invalidRatings || invalidCounts) {
      add(`invalid work ${id}`);
    }
    if (ends.length + ratings.length + counts.length + ofType('begin').length > 0
      && ofType('caps').filter((l) => l.count === true).length !== 1) {
      add(`missing caps ${id}`);
    }
    const paired = pairPrimitives(call.lines, id);
    for (const problem of paired.problems) {
      add(problem);
    }
    if (!CALL_STAGES.includes(start.stage)) {
      add(`unattributed call ${id}`);
    }
    if (ends.length > 1) {
      add(`duplicate end ${id}`);
    }
    if (ends.length > 0) {
      ended += 1;
      endedCalls.push(call);
      const end = ends[0];
      if (!invalidRatings && ratingSum !== end.work) {
        add(`reconcile ${id}: work ${ratingSum} != ${end.work}`);
      }
      if (ratings.length !== end.profiles) {
        add(`reconcile ${id}: profiles ${ratings.length} != ${end.profiles}`);
      }
      const total = isObject(end.locate) ? end.locate.countWork : undefined;
      if (!invalidCounts && !(isUnits(total) && total === countSum)) {
        add(`reconcile ${id}: countWork ${countSum} != ${total}`);
      }
      if (paired.open !== null) {
        add(`unfinished primitive ${id}`);
      }
      lo += paired.lo;
      hi += paired.lo;
    } else if (closedBy(call)) {
      terminated += 1;
      let bound = 0;
      if (paired.open !== null) {
        open += 1;
        bound = isUnits(paired.open.bound) ? paired.open.bound : Infinity;
      }
      lo += paired.lo;
      hi += paired.lo + bound;
    } else {
      add(`open call ${id}`);
      continue;
    }
    ratingWork += ratingSum;
    countWork += countSum;
  }
  if (linkLines !== null) {
    // One task, one call: a call that answers a task never answers another (a speculative call is counted, not matched).
    /** @type {Set<{ id: string }>} */
    const claimed = new Set();
    const matched = (/** @type {string} */ stage, /** @type {unknown} */ attempt) => {
      if (attempt === null || attempt === undefined) {
        return false;
      }
      const found = endedCalls.filter((c) => c.start.stage === stage && c.start.attempt === attempt);
      if (found.length !== 1 || claimed.has(found[0])) {
        return false;
      }
      claimed.add(found[0]);
      return true;
    };
    for (const l of linkLines) {
      if (l.ev === 'set-complete') {
        if (!PRE_SELECTION.set.includes(l.outcome) && !matched('set', l.attempt)) {
          add(`unmatched set attempt ${l.attempt}`);
        }
      } else if (l.ev === 'complete') {
        if (l.ok === true && !PRE_SELECTION.layout.includes(l.outcome) && !matched('batch', `${l.slot}/${l.attempt}`)) {
          add(`unmatched batch candidate ${l.slot}/${l.attempt}`);
        }
      } else if (l.ev === 'completion-complete') {
        if (typeof l.valueKey === 'string' && l.valueKey !== l.key) {
          add(`completion key mismatch ${l.index}`);
        }
        if (!PRE_SELECTION.layout.includes(l.outcome) && !matched('completion', l.key)) {
          add(`unmatched completion task ${l.key}`);
        }
      }
    }
  }
  return { complete: problems.length === 0, problems, calls: starts, ended, terminated, open, lo, hi, ratingWork, countWork };
}

/**
 * @typedef {object} ArmWork The work of one arm over its rows (IG-P-Q37).
 * @property {number} lo
 * @property {number} hi
 * @property {number} accepted The accepted puzzles of the arm's valid rows.
 * @property {number | null} loRatio `lo` per accepted puzzle, `null` with none.
 * @property {number | null} hiRatio `hi` per accepted puzzle, `null` with none.
 * @property {number | null} completedRatio The completed-unit ratio (D-V4-17's former quantity): reported, not judged.
 * @property {boolean} complete Every row valid and every ledger complete.
 * @property {number} rows
 * @property {number} terminatedCalls Reported, not judged: a kill count is never a bound.
 */

/**
 * @param {string} name
 * @param {{ ingested: IngestedRow, ledger: Record<string, any> }[]} rows
 * @returns {ArmWork}
 */
function armWork(name, rows) {
  if (!Array.isArray(rows)) {
    throw new TypeError(`verdicts: workRule needs the rows of the ${name} arm as a list`);
  }
  let lo = 0;
  let hi = 0;
  let accepted = 0;
  let terminatedCalls = 0;
  let complete = true;
  for (const row of rows) {
    const { ingested, ledger } = isObject(row) ? row : /** @type {any} */ ({});
    if (!isObject(ingested) || !STATUSES.includes(ingested.status) || !isObject(ledger) || !isUnits(ledger.lo)
      || typeof ledger.hi !== 'number' || Number.isNaN(ledger.hi) || ledger.hi < ledger.lo) {
      throw new TypeError(`verdicts: a row of the ${name} arm is not an ingested row with its ledger`);
    }
    lo += ledger.lo;
    hi += ledger.hi;
    terminatedCalls += isCount(ledger.terminated) ? ledger.terminated : 0;
    if (ingested.status === 'valid') {
      accepted += ingested.run.acceptedCount;
    } else {
      complete = false;
    }
    if (ledger.complete !== true) {
      complete = false;
    }
  }
  const per = (/** @type {number} */ units) => (accepted > 0 ? units / accepted : null);
  return { lo, hi, accepted, loRatio: per(lo), hiRatio: per(hi), completedRatio: per(lo), complete, rows: rows.length, terminatedCalls };
}

/**
 * The work condition of rule (c5) on intervals (IG-P-Q37, D-V4-17): the screen arm's upper bound per accepted puzzle at
 * most the no-screen arm's lower bound is a `pass`; the screen arm's lower bound above the no-screen arm's upper bound
 * is `worse`; anything else, an arm with an incomplete ledger or an invalid row, or an arm with no accepted puzzle, is
 * `unknown` (the class is then inconclusive and uses no screen).
 * @param {{ ingested: IngestedRow, ledger: Record<string, any> }[]} screenRows `ingested` is T09a's `ingestRow`, `ledger`
 *   `rowLedger`'s result.
 * @param {{ ingested: IngestedRow, ledger: Record<string, any> }[]} noScreenRows
 * @returns {{ screen: ArmWork, noScreen: ArmWork, verdict: 'pass' | 'worse' | 'unknown' }}
 */
export function workRule(screenRows, noScreenRows) {
  const screen = armWork('screen', screenRows);
  const noScreen = armWork('noScreen', noScreenRows);
  /** @type {'pass' | 'worse' | 'unknown'} */
  let verdict = 'unknown';
  if (screen.complete && noScreen.complete && screen.accepted > 0 && noScreen.accepted > 0) {
    if (/** @type {number} */ (screen.hiRatio) <= /** @type {number} */ (noScreen.loRatio)) {
      verdict = 'pass';
    } else if (/** @type {number} */ (screen.loRatio) > /** @type {number} */ (noScreen.hiRatio)) {
      verdict = 'worse';
    }
  }
  return { screen, noScreen, verdict };
}

/** Rule (c5) needs at least this many matched sets with distinct seeds in every cell (plan section 5.2). */
const MIN_MATCHED_SETS = 15;
const CELL_GATES = Object.freeze(['pass', 'fail', 'incomplete']);
/** The ledger of a row that has no journal: incomplete, never zero work. */
const NO_JOURNAL = Object.freeze({ complete: false, problems: Object.freeze(['no journal']), lo: 0, hi: 0 });

/**
 * The class verdict of rule (c5) for a screen arm against its no-screen arm (plan section 5.2, R12, RV3-08, RV4-02): the
 * first condition that decides, in this fixed order: `correctness` (an `incorrect` row: failed); `incomplete-validation`
 * (a pairing problem: inconclusive); `evidence` (a matched pair without clue evidence: inconclusive); `matched-sets`
 * (a cell with fewer than 15 matched sets of distinct seeds: inconclusive); `clue` (the pooled clue rule: failed);
 * `faster` (the faster rule: failed); `work` (the work rule: `worse` is failed, `unknown` is inconclusive with
 * `decidedBy` `work-unknown`); `completion` (a cell whose screen arm has fewer valid rows reaching ten than the
 * no-screen arm's less 1: failed); `cell-gate` (a failing `screenCellGate`: failed, an `incomplete` one: inconclusive);
 * else `admitted`. Every statistic that can be computed is returned beside the verdict, whichever condition decides:
 * `faster` is `null` while a pairing problem leaves a rep without a ratio.
 * @param {{ cells: { cell: string, screenRows: IngestedRow[], noScreenRows: IngestedRow[], screenLedgers: Record<string, any>,
 *   noScreenLedgers: Record<string, any>, screenCellGate: 'pass' | 'fail' | 'incomplete' }[], reps: number[],
 *   resamples: number, resampleSeed: number, quantity: number, capMs: number }} input `screenRows` and `noScreenRows`
 *   are T09a's ingested rows; the ledgers map a `rowKey` to `rowLedger`'s result (a row without one has no journal);
 *   `screenCellGate` is T09d's, computed on the screen arm.
 * @returns {{ verdict: 'admitted' | 'failed' | 'inconclusive', decidedBy: string | null,
 *   clue: ReturnType<typeof clueRule>, faster: ReturnType<typeof fasterRule> | null, work: ReturnType<typeof workRule>,
 *   evidence: { cell: string, rep: any, side: 'a' | 'b', problem: string }[],
 *   completion: Record<string, { screen: number, noScreen: number }>, problems: string[] }}
 */
export function classVerdict(input) {
  if (!isObject(input) || !Array.isArray(input.cells) || input.cells.length === 0) {
    throw new RangeError('verdicts: classVerdict needs at least one cell');
  }
  const { reps, resamples, resampleSeed, quantity, capMs } = input;
  needReps(reps);
  needResampling({ resamples, resampleSeed });
  needPositive('quantity', quantity, true);
  needPositive('capMs', capMs, false);
  const names = input.cells.map((c) => c?.cell);
  if (names.some((n) => typeof n !== 'string' || n === '') || new Set(names).size !== names.length) {
    throw new RangeError('verdicts: the cells of a class need distinct names');
  }
  for (const c of input.cells) {
    if (!CELL_GATES.includes(c.screenCellGate)) {
      throw new RangeError(`verdicts: screenCellGate of ${c.cell} must be pass, fail or incomplete, got ${String(c.screenCellGate)}`);
    }
    if (!isObject(c.screenLedgers) || !isObject(c.noScreenLedgers)) {
      throw new TypeError(`verdicts: the ledgers of ${c.cell} are not objects from a rowKey to its ledger`);
    }
  }
  /** @param {IngestedRow[]} rows @param {Record<string, any>} ledgers */
  const withLedgers = (rows, ledgers) => rows.map((ingested) => ({
    ingested, ledger: typeof ingested.rowKey === 'string' && Object.hasOwn(ledgers, ingested.rowKey) ? ledgers[ingested.rowKey] : NO_JOURNAL,
  }));
  const options = { quantity, capMs };
  const cells = input.cells.map((c) => {
    const paired = pairRows(c.screenRows, c.noScreenRows, reps);
    const reached = (/** @type {IngestedRow[]} */ rows) => rows.filter((r) => r.status === 'valid' && reachedTen(r.run, options)).length;
    return {
      cell: c.cell,
      gate: c.screenCellGate,
      paired,
      sets: matchedSets(paired.pairs),
      ratios: ratiosOf(paired.pairs, reps, options),
      completion: { screen: reached(c.screenRows), noScreen: reached(c.noScreenRows) },
      screen: withLedgers(c.screenRows, c.screenLedgers),
      noScreen: withLedgers(c.noScreenRows, c.noScreenLedgers),
    };
  });
  const clue = clueRule(cells.flatMap((c) => c.sets.matched));
  const ratioless = cells.some((c) => c.ratios.includes(null));
  const faster = ratioless ? null : fasterRule(Object.fromEntries(cells.map((c) => [c.cell, c.ratios])), reps, { resamples, resampleSeed });
  const work = workRule(cells.flatMap((c) => c.screen), cells.flatMap((c) => c.noScreen));
  const evidence = cells.flatMap((c) => c.sets.evidence.map((e) => ({ cell: c.cell, ...e })));
  const completion = Object.fromEntries(cells.map((c) => [c.cell, c.completion]));
  const pairing = cells.flatMap((c) => c.paired.problems.map((p) => `${c.cell}: ${p}`));
  const problems = [
    ...pairing,
    ...evidence.map((e) => `${e.cell}: evidence at rep ${e.rep}, side ${e.side}: ${e.problem}`),
    ...cells.flatMap((c) => [['screen', c.screen], ['noScreen', c.noScreen]].flatMap(([side, rows]) => /** @type {any[]} */ (rows)
      .filter((r) => r.ledger.complete !== true).flatMap((r) => r.ledger.problems.map((p) => `${c.cell}: ${side} ${r.ingested.rowKey}: ${p}`)))),
  ];
  /** @param {'admitted' | 'failed' | 'inconclusive'} verdict @param {string | null} decidedBy */
  const decide = (verdict, decidedBy) => ({ verdict, decidedBy, clue, faster, work, evidence, completion, problems });
  if (cells.some((c) => c.paired.incorrect.length > 0)) {
    return decide('failed', 'correctness');
  }
  if (pairing.length > 0) {
    return decide('inconclusive', 'incomplete-validation');
  }
  if (evidence.length > 0) {
    return decide('inconclusive', 'evidence');
  }
  if (cells.some((c) => new Set(c.sets.matched.map((m) => m.seed)).size < MIN_MATCHED_SETS)) {
    return decide('inconclusive', 'matched-sets');
  }
  if (!clue.pass) {
    return decide('failed', 'clue');
  }
  if (faster === null) {
    throw new Error('verdicts: a rep has no ratio although no pairing problem was found');
  }
  if (!faster.pass) {
    return decide('failed', 'faster');
  }
  if (work.verdict === 'worse') {
    return decide('failed', 'work');
  }
  if (work.verdict === 'unknown') {
    return decide('inconclusive', 'work-unknown');
  }
  if (cells.some((c) => c.completion.screen < c.completion.noScreen - 1)) {
    return decide('failed', 'completion');
  }
  if (cells.some((c) => c.gate === 'fail')) {
    return decide('failed', 'cell-gate');
  }
  if (cells.some((c) => c.gate === 'incomplete')) {
    return decide('inconclusive', 'cell-gate');
  }
  return decide('admitted', null);
}

/** A cell's gate is settled at its third valid request that does not reach ten (plan section 5.1, "Stopping"). */
const STOP_FAILURES = 3;
/** Plan section 5.2: 18 of the 20 requests of a cell reach ten (the completion gate; Hell 1's candidate count). */
const REACHING_TEN = 18;
/** The hard end of the generation stop (plan section 3, P5; D-V4-08): the default of the post-hoc projection. */
const DEADLINE_MS = 115000;
const CLASS_VERDICTS = Object.freeze(['admitted', 'failed', 'inconclusive']);
/** The label every row of the post-hoc projection carries beside `postHoc: true` (R01, D-V4-08). */
const PROJECTION_LABEL = 'post-hoc projection; not a live deadline gate';
/** The first reason of a selection's phase-0 line: a selection is never a final admission (RV3-03). */
const SELECTION_PENDING = 'uncapped comparator collection pending';
/** The prerequisites a phase-0 verdict cannot do without (the names of the verdict manifest's `prerequisites`). */
const REQUIRED_PREREQUISITES = Object.freeze(['stage1', 'liveDeadline']);

/**
 * @param {string} name
 * @param {unknown} rows
 * @returns {void} Throws unless the rows are a list of ingested rows (T09a's `ingestRow`): a raw published row has no
 *   status and would pass every check.
 */
function needIngested(name, rows) {
  if (!Array.isArray(rows) || rows.some((r) => !STATUSES.includes(/** @type {any} */ (r)?.status))) {
    throw new TypeError(`verdicts: ${name} is not a list of ingested rows`);
  }
}

/**
 * @param {IngestedRow[]} rows One arm's rows of one cell.
 * @param {number[]} reps The declared replicates.
 * @returns {string[]} The declared replicates without exactly one valid row, and the rows outside the declared ones, as
 *   the pairing problems of `pairRows` say them for one arm.
 */
function repProblems(rows, reps) {
  const declared = new Set(reps);
  /** @type {string[]} */
  const problems = [];
  for (const rep of reps) {
    const found = rows.filter((r) => r.rep === rep);
    if (found.length === 0) {
      problems.push(`missing row: rep ${rep}`);
    } else if (found.length > 1) {
      problems.push(`duplicate rows: rep ${rep} has ${found.length}`);
    } else if (found[0].status !== 'valid') {
      problems.push(`status ${found[0].status}: rep ${rep}${firstProblem(found[0])}`);
    }
  }
  for (const r of rows) {
    if (!declared.has(r.rep)) {
      problems.push(`row outside the declared replicates: rep ${String(r.rep)}`);
    }
  }
  return problems;
}

/**
 * The dead-end entries of a row's journal (plan section 5.2: "no dead-end entry" on a failing Nightmare cell): the
 * distinct calls with a `phase` line of phase `p2`, the frozen phase-2 entry, which the prototype journals under the
 * same name. A `p2` line without a call id is one more entry (it cannot be told apart, and counting it is the safe side).
 * @param {Record<string, any>[]} lines The parsed lines of the row's journals (`parseLines`).
 * @returns {number}
 */
export function deadEnds(lines) {
  if (!Array.isArray(lines) || !lines.every(isObject)) {
    throw new TypeError('verdicts: deadEnds needs the parsed journal lines');
  }
  /** @type {Set<string>} */
  const calls = new Set();
  let unowned = 0;
  for (const line of lines) {
    if (line.t === 'phase' && line.phase === 'p2') {
      if (typeof line.call === 'string') {
        calls.add(line.call);
      } else {
        unowned += 1;
      }
    }
  }
  return calls.size + unowned;
}

/**
 * @typedef {object} CellGate The gate of one cell on the arm it ships (plan section 5.2, IG-P-Q29, D-V4-16).
 * @property {'pass' | 'fail' | 'incomplete'} verdict
 * @property {string[]} reasons The conditions of the verdict (empty for `pass`).
 * @property {number} reachedTen The valid requests at declared replicates that hold ten puzzles.
 * @property {number | null} deadEnds The dead-end entries over the valid rows' journals; `null` for a control.
 * @property {number} deadlineViolations Reported beside the gate, never judged here (D-V4-16).
 * @property {number | null} p95Ms The tail observation of T09a's `completion`, reported.
 * @property {{ geoMean: number, lower: number, pass: boolean } | null} noRegression A control's bound, `null` while its
 *   pairing is incomplete or the cell is a failing one.
 */

/**
 * The gate of a failing Nightmare cell or a control on its shipped arm (T09d; plan section 5.2, R12, RV3-08, RV4-08).
 * The first condition that matches decides: an `incorrect` row of the arm: `fail`; three or more valid requests that do not
 * reach ten (the verdict is settled at the third failure, so 18 of 20 must reach ten): `fail`; a failing cell with a
 * dead-end entry (`deadEnds`) in a valid row: `fail`; then `incomplete` for a failing cell with a declared replicate
 * without exactly one valid row (a duplicate, a row outside the declared replicates and a status other than `valid`
 * included) or a valid row without its journal, and for a control with any problem of `pairRows(rows, todayRows, reps)`
 * (A the shipped arm, B today's: a missing, duplicate, undeclared, not valid or disagreeing row on either side), before
 * any statistic; else a control's `noRegression` over today-over-after ratios (a lower bound below 0.9: `fail`); else
 * `pass`. Deadline violations and the p95 are reported beside the gate. Throws on a missing option.
 * @param {'failing' | 'control'} kind
 * @param {IngestedRow[]} rows The shipped arm's ingested rows.
 * @param {{ reps: number[], quantity: number, capMs?: number, responseBoundMs: number, todayRows?: IngestedRow[],
 *   journals?: Record<string, Record<string, any>[] | null>, resamples?: number, resampleSeed?: number }} options
 *   `todayRows` and the resampling options and `capMs` are a control's; `journals` goes from a `rowKey` to the lines of
 *   its journal (`null` when absent) and is a failing cell's.
 * @returns {CellGate}
 */
export function cellGate(kind, rows, options) {
  if (kind !== 'failing' && kind !== 'control') {
    throw new RangeError(`verdicts: cellGate kind must be failing or control, got ${String(kind)}`);
  }
  if (!isObject(options)) {
    throw new TypeError('verdicts: cellGate needs its options');
  }
  const { reps, quantity, capMs, responseBoundMs, todayRows, journals, resamples, resampleSeed } = options;
  needReps(reps);
  needPositive('quantity', quantity, true);
  needPositive('responseBoundMs', responseBoundMs, false);
  needIngested('rows', rows);
  if (kind === 'control') {
    needPositive('capMs', capMs, false);
    needResampling({ resamples, resampleSeed });
    needIngested('todayRows', todayRows);
  } else if (!isObject(journals)) {
    throw new TypeError('verdicts: the gate of a failing cell needs the journals of its rows (a rowKey to its lines)');
  }
  const declared = new Set(reps);
  const scoped = rows.filter((r) => declared.has(r.rep));
  const valid = scoped.filter((r) => r.status === 'valid');
  const stats = completion(scoped, { quantity, responseBoundMs });
  const short = valid.filter((r) => !reachedTen(r.run, { quantity }));
  const dead = kind === 'failing'
    ? valid.map((row) => {
      const lines = typeof row.rowKey === 'string' && Object.hasOwn(/** @type {object} */ (journals), row.rowKey) ? /** @type {any} */ (journals)[row.rowKey] : null;
      return { row, n: lines === null || lines === undefined ? null : deadEnds(lines) };
    })
    : [];
  const paired = kind === 'control' ? pairRows(rows, /** @type {IngestedRow[]} */ (todayRows), reps) : null;
  /** @type {string | null} */
  let ratioProblem = null;
  /** @type {CellGate['noRegression']} */
  let regression = null;
  if (paired !== null && paired.problems.length === 0) {
    const ratios = ratiosOf(paired.pairs, reps, { quantity, capMs: /** @type {number} */ (capMs) });
    const bad = ratios.findIndex((x) => !(isNum(x) && x > 0));
    if (bad >= 0) {
      ratioProblem = `no ratio above 0 at rep ${reps[bad]}`;
    } else {
      regression = noRegression(ratios, reps, { resamples: /** @type {number} */ (resamples), resampleSeed: /** @type {number} */ (resampleSeed) });
    }
  }
  /** @param {CellGate['verdict']} verdict @param {string[]} reasons @returns {CellGate} */
  const decide = (verdict, reasons) => ({
    verdict, reasons, reachedTen: stats.reachedTen, deadEnds: kind === 'failing' ? dead.reduce((sum, d) => sum + (d.n ?? 0), 0) : null,
    deadlineViolations: stats.deadlineViolations, p95Ms: stats.p95Ms, noRegression: regression,
  });
  const incorrect = rows.filter((r) => r.status === 'incorrect');
  if (incorrect.length > 0) {
    return decide('fail', incorrect.map((r) => `incorrect row: rep ${String(r.rep)}${firstProblem(r)}`));
  }
  if (short.length >= STOP_FAILURES) {
    return decide('fail', [`${short.length} valid requests did not reach ten (reps ${short.map((r) => r.rep).join(', ')})`]);
  }
  const stopped = dead.filter((d) => d.n !== null && d.n > 0);
  if (stopped.length > 0) {
    return decide('fail', stopped.map((d) => `dead-end entry: row ${String(d.row.rowKey)} has ${d.n} call(s) in phase p2`));
  }
  const missing = paired === null
    ? [...repProblems(rows, reps), ...dead.filter((d) => d.n === null).map((d) => `no journal: row ${String(d.row.rowKey)}`)]
    : [...paired.problems, ...(ratioProblem === null ? [] : [ratioProblem])];
  if (missing.length > 0) {
    return decide('incomplete', missing);
  }
  if (regression !== null && !regression.pass) {
    return decide('fail', [`no regression: the lower bound ${regression.lower} is below 0.9`]);
  }
  return decide('pass', []);
}

/**
 * The arm a class ships (plan section 5.2, IG-P-Q29): the screen arm when the class is admitted, else the no-screen
 * arm (a failed or an inconclusive class, and one outside the table, use no screen).
 * @param {{ verdict: 'admitted' | 'failed' | 'inconclusive' }} verdict `classVerdict`'s result.
 * @param {{ screen: any, noScreen: any }} cls The class's two arms (their ids, or whatever the caller keeps).
 * @returns {any} `cls.screen` or `cls.noScreen`.
 */
export function shippedArm(verdict, cls) {
  if (!isObject(verdict) || !CLASS_VERDICTS.includes(/** @type {any} */ (verdict.verdict))) {
    throw new RangeError(`verdicts: shippedArm needs a class verdict, got ${JSON.stringify(isObject(verdict) ? verdict.verdict : verdict)}`);
  }
  if (!isObject(cls) || cls.screen === undefined || cls.noScreen === undefined) {
    throw new TypeError('verdicts: shippedArm needs the screen and the no-screen arm of the class');
  }
  return verdict.verdict === 'admitted' ? cls.screen : cls.noScreen;
}

/**
 * Master identity (plan section 5.2; RV2-08, RV3-08, RV4-08): per declared replicate, today's and the after arm's
 * request serve the same puzzles in the same order. The pairing is `pairRows(afterRows, todayRows, reps)` (side a is the
 * after arm, side b today's), so a missing, duplicate, undeclared, not valid or disagreeing row on either side is a
 * problem (`incomplete`) and an `incorrect` row is a `fail`. On a pair, a side whose `puzzleEvidence(run).keys` is not
 * `null` is `incomplete` (`puzzle keys <today|after> rep <r>: <problem>`: empty or short key lists are never equality);
 * else the accepted counts must be equal and the ordered key lists deep-equal, one difference per replicate
 * (`acceptedCount`, or `igPuzzleKeys[<first differing index>]`). A request with no accepted puzzle has the key list `[]`
 * and its `details` are not read. A difference or an `incorrect` row fails the cell whatever else is missing.
 * @param {IngestedRow[]} todayRows
 * @param {IngestedRow[]} afterRows
 * @param {number[]} reps The declared replicates (`masterReps`).
 * @returns {{ verdict: 'pass' | 'fail' | 'incomplete', differences: { rep: any, seed: any, field: string }[], problems: string[] }}
 */
export function masterIdentity(todayRows, afterRows, reps) {
  needReps(reps);
  const paired = pairRows(afterRows, todayRows, reps);
  const problems = [...paired.problems];
  /** @type {{ rep: any, seed: any, field: string }[]} */
  const differences = [];
  for (const { rep, seed, a: after, b: today } of paired.pairs) {
    const sides = /** @type {[string, IngestedRow][]} */ ([['today', today], ['after', after]]);
    const unproved = sides.map(([side, r]) => [side, puzzleEvidence(r.run).keys]).filter(([, problem]) => problem !== null);
    for (const [side, problem] of unproved) {
      problems.push(`puzzle keys ${side} rep ${rep}: ${problem}`);
    }
    if (unproved.length > 0) {
      continue;
    }
    if (today.run.acceptedCount !== after.run.acceptedCount) {
      differences.push({ rep, seed, field: 'acceptedCount' });
      continue;
    }
    const [keysToday, keysAfter] = [today, after].map((r) => (r.run.acceptedCount === 0 ? [] : r.run.details.igPuzzleKeys));
    const at = keysToday.findIndex((/** @type {string} */ key, /** @type {number} */ i) => key !== keysAfter[i]);
    if (at >= 0) {
      differences.push({ rep, seed, field: `igPuzzleKeys[${at}]` });
    }
  }
  const verdict = differences.length > 0 || paired.incorrect.length > 0 ? 'fail' : problems.length > 0 ? 'incomplete' : 'pass';
  return { verdict, differences, problems };
}

/**
 * The Hell 1 report of a cell (plan section 5.2, IG-P-Q30): a request count, never a gate and never a veto. `candidate`
 * is whether at least 18 of the cell's requests hold ten puzzles (D-V4-16's completion over the valid rows at the
 * declared replicates); a request that is missing or not valid cannot reach ten.
 * @param {IngestedRow[]} rows
 * @param {{ reps: number[], quantity: number }} options
 * @returns {{ requests: number, valid: number, reachedTen: number, candidate: boolean }}
 */
export function hell1Report(rows, { reps, quantity }) {
  needReps(reps);
  needPositive('quantity', quantity, true);
  needIngested('rows', rows);
  const declared = new Set(reps);
  const scoped = rows.filter((r) => declared.has(r.rep));
  const valid = scoped.filter((r) => r.status === 'valid');
  const reached = valid.filter((r) => reachedTen(r.run, { quantity })).length;
  return { requests: scoped.length, valid: valid.length, reachedTen: reached, candidate: reached >= REACHING_TEN };
}

/**
 * The post-hoc deadline projection (R01, D-V4-08): what a recorded run would have served had the set stage been cut at
 * `(1 - reserve) * deadlineMs` and the response ended at `deadlineMs`. It estimates accepted prefixes and proves neither
 * the cancellation of dispatched work nor the response assembly nor the hard 120-s bound: it carries no verdict, every
 * row has `postHoc: true`, and nothing reads it as a prerequisite. Per valid row: `setCut` (the set arrived after the
 * cut; a request without a set is not cut), `served` (0 when cut, else the accept times up to the deadline),
 * `completed` (`served >= quantity`) and `lost` (the run reached ten and the projection did not). A row without the
 * linkage fields is `not-linked` and one whose timeline is not numbers `invalid-timeline`: neither has numbers.
 * @param {IngestedRow[]} rows
 * @param {{ reserve: number, deadlineMs?: number, quantity: number }} options
 * @returns {{ kind: 'deadline-projection', label: string, rows: { rep: any, seed: any, postHoc: true,
 *   status: 'projected' | 'not-linked' | 'invalid-timeline', setCut: boolean | null, served: number | null,
 *   completed: boolean | null, lost: boolean | null }[], skipped: number }} `skipped` counts the rows that are not valid.
 */
export function deadlineProjection(rows, { reserve, deadlineMs = DEADLINE_MS, quantity }) {
  if (!isNum(reserve) || reserve < 0 || reserve > 1) {
    throw new RangeError(`verdicts: reserve must be a share from 0 to 1, got ${String(reserve)}`);
  }
  needPositive('deadlineMs', deadlineMs, false);
  needPositive('quantity', quantity, true);
  needIngested('rows', rows);
  let skipped = 0;
  /** @type {ReturnType<typeof deadlineProjection>['rows']} */
  const out = [];
  for (const r of rows) {
    if (r.status !== 'valid') {
      skipped += 1;
      continue;
    }
    const { igSetMs, igAcceptedMs } = r.run;
    const base = { rep: r.rep, seed: r.seed, postHoc: /** @type {const} */ (true) };
    const none = { setCut: null, served: null, completed: null, lost: null };
    if (igSetMs === undefined || igAcceptedMs === undefined) {
      out.push({ ...base, status: 'not-linked', ...none });
    } else if (!(igSetMs === null || isUnits(igSetMs)) || !Array.isArray(igAcceptedMs) || !igAcceptedMs.every(isUnits)) {
      out.push({ ...base, status: 'invalid-timeline', ...none });
    } else {
      const setCut = igSetMs !== null && igSetMs > (1 - reserve) * deadlineMs;
      const served = setCut ? 0 : igAcceptedMs.filter((/** @type {number} */ t) => t <= deadlineMs).length;
      const completed = served >= quantity;
      out.push({ ...base, status: 'projected', setCut, served, completed, lost: reachedTen(r.run, { quantity }) && !completed });
    }
  }
  return { kind: 'deadline-projection', label: PROJECTION_LABEL, rows: out, skipped };
}

/**
 * P5's false stops and lost completions over the declared pairs (RV1-13, RV2-18, RV3-03; IG-P-D1 condition 4, P-OD12).
 * The declared pair of a replicate is the bounded and the uncapped row of the cell at that replicate, seed
 * `landscape/<cell>/<rep>`. A pair is `unknown` (with its reason) when either row is missing, duplicated, of another
 * seed, not `valid` or not linked (no `igSetMs` field), and a pair with no row on either side is `unknown` with the
 * reason `missing`, never an empty success. On a known pair a false stop is a bounded row whose `partialReason` starts
 * with `set:no-window-` while the uncapped row's `igSetMs` is a finite number (whatever its count), and a lost
 * completion is an uncapped row that reached ten while the bounded row did not. A row of either arm that is not of the
 * cell or not at a declared replicate is `unexpected` and not counted. The counts are a report, not a threshold.
 * @param {IngestedRow[]} boundedRows The P5 arm's rows.
 * @param {IngestedRow[]} uncappedRows The uncapped comparator's rows.
 * @param {{ quantity: number, cell: string, reps: number[] }} options
 * @returns {{ cell: string, declared: number, pairs: number, falseStops: number, lostCompletions: number, unknown: number,
 *   falseStopReps: number[], lostReps: number[], unknownReps: { rep: number, reason: string }[],
 *   unexpected: { side: 'bounded' | 'uncapped', rowKey: any, caseId: any, rep: any }[] }}
 */
export function p5Stops(boundedRows, uncappedRows, { quantity, cell, reps }) {
  needReps(reps);
  needPositive('quantity', quantity, true);
  if (typeof cell !== 'string' || cell === '') {
    throw new RangeError('verdicts: p5Stops needs the cell of its declared pairs');
  }
  needIngested('boundedRows', boundedRows);
  needIngested('uncappedRows', uncappedRows);
  const declared = new Set(reps);
  /** @type {['bounded' | 'uncapped', IngestedRow[]][]} */
  const arms = [['bounded', boundedRows], ['uncapped', uncappedRows]];
  const ours = (/** @type {IngestedRow} */ r) => r.caseId === cell && declared.has(r.rep);
  const unexpected = arms.flatMap(([side, rows]) => rows.filter((r) => !ours(r)).map((r) => ({ side, rowKey: r.rowKey, caseId: r.caseId, rep: r.rep })));
  /** @type {number[]} */
  const falseStopReps = [];
  /** @type {number[]} */
  const lostReps = [];
  /** @type {{ rep: number, reason: string }[]} */
  const unknownReps = [];
  let known = 0;
  for (const rep of reps) {
    const expected = `landscape/${cell}/${rep}`;
    const found = arms.map(([side, rows]) => ({ side, rows: rows.filter((r) => ours(r) && r.rep === rep) }));
    if (found.every((f) => f.rows.length === 0)) {
      unknownReps.push({ rep, reason: 'missing' });
      continue;
    }
    /** @type {string[]} */
    const reasons = [];
    for (const { side, rows } of found) {
      if (rows.length === 0) {
        reasons.push(`missing ${side} row`);
      } else if (rows.length > 1) {
        reasons.push(`duplicate ${side} rows (${rows.length})`);
      } else {
        const [r] = rows;
        if (r.seed !== expected) {
          reasons.push(`${side} row has the seed ${JSON.stringify(r.seed)}, expected ${expected}`);
        }
        if (r.status !== 'valid') {
          reasons.push(`${side} row is ${r.status}${firstProblem(r)}`);
        } else if (r.run.igSetMs === undefined) {
          reasons.push(`${side} row is not linked (no igSetMs)`);
        }
      }
    }
    if (reasons.length > 0) {
      unknownReps.push({ rep, reason: reasons.join('; ') });
      continue;
    }
    known += 1;
    const [bounded, uncapped] = found.map((f) => f.rows[0].run);
    if (typeof bounded.partialReason === 'string' && bounded.partialReason.startsWith('set:no-window-') && isNum(uncapped.igSetMs)) {
      falseStopReps.push(rep);
    }
    if (reachedTen(uncapped, { quantity }) && !reachedTen(bounded, { quantity })) {
      lostReps.push(rep);
    }
  }
  return {
    cell, declared: reps.length, pairs: known, falseStops: falseStopReps.length, lostCompletions: lostReps.length,
    unknown: unknownReps.length, falseStopReps, lostReps, unknownReps, unexpected,
  };
}

/**
 * @param {number[]} values
 * @returns {{ median: number, min: number, max: number } | null} `null` for no value.
 */
const spread = (values) => (values.length === 0 ? null : { median: median(values), min: Math.min(...values), max: Math.max(...values) });

/**
 * The score position of a puzzle in its level's band, `(score - min) / (max - min)` (plan section 3, P3), and its problem.
 * @param {any} puzzle
 * @returns {{ position: number } | { problem: string }}
 */
function positionOf(puzzle) {
  if (!isNum(puzzle?.score) || typeof puzzle.level !== 'string') {
    return { problem: 'score or level missing' };
  }
  /** @type {{ min: number, max: number }} */
  let band;
  try {
    band = levelOf(puzzle.level);
  } catch {
    return { problem: `unknown level ${puzzle.level}` };
  }
  return Number.isFinite(band.max) ? { position: (puzzle.score - band.min) / (band.max - band.min) } : { problem: `the band of ${puzzle.level} is open above` };
}

/**
 * The population of the accepted puzzles, per cell (plan section 3, P3: the clue share, the score position, the
 * census-estimate share and completion stand beside every timing, two-sided; V4-T09d): a report that judges nothing. A
 * cell is a `caseId`. The statistics read the valid rows with complete per-puzzle evidence (T09a's `puzzleEvidence`: a
 * row with no accepted puzzle contributes nothing and its `details` are not read; the clue counts and `K` must be
 * complete and every puzzle must carry a finite `score` and a known `level` for its band); the other valid rows are
 * listed apart as `evidenceProblems` and read nowhere. Completion is over every row of the cell. `clueShare` is
 * `clues / K` and `scorePosition` the score's place in the puzzle's level band, each `{ median, min, max }` over the
 * pooled puzzles (`null` without a puzzle); `censusEstimateShare` is `ratingCensoredCount` summed over those rows over
 * their `acceptedCount` summed (`null` without an accepted puzzle).
 * @param {IngestedRow[]} rows
 * @param {{ quantity: number }} options
 * @returns {Record<string, { completion: { requests: number, valid: number, reachedTen: number },
 *   rows: number, puzzles: number, clueShare: ReturnType<typeof spread>, scorePosition: ReturnType<typeof spread>,
 *   censusEstimateShare: number | null, evidenceProblems: { rowKey: any, rep: any, problem: string }[] }>}
 */
export function population(rows, { quantity }) {
  needPositive('quantity', quantity, true);
  needIngested('rows', rows);
  /** @type {Map<string, IngestedRow[]>} */
  const byCell = new Map();
  for (const r of rows) {
    const cell = String(r.caseId);
    byCell.set(cell, [...(byCell.get(cell) ?? []), r]);
  }
  return Object.fromEntries([...byCell].map(([cell, cellRows]) => {
    const valid = cellRows.filter((r) => r.status === 'valid');
    /** @type {{ rowKey: any, rep: any, problem: string }[]} */
    const evidenceProblems = [];
    /** @type {number[]} */
    const shares = [];
    /** @type {number[]} */
    const positions = [];
    let used = 0;
    let accepted = 0;
    let censored = 0;
    for (const r of valid) {
      const problem = puzzleEvidence(r.run).clues;
      const puzzles = problem === null && r.run.acceptedCount > 0 ? r.run.details.puzzles : [];
      const placed = puzzles.map(positionOf);
      const unplaced = placed.findIndex((p) => 'problem' in p);
      const censusOk = r.run.ratingCensoredCount === undefined || isCount(r.run.ratingCensoredCount);
      const reason = problem ?? (unplaced >= 0 ? `score position: puzzle ${unplaced}: ${/** @type {{ problem: string }} */ (placed[unplaced]).problem}` : censusOk ? null : 'ratingCensoredCount is not an integer from 0');
      if (reason !== null) {
        evidenceProblems.push({ rowKey: r.rowKey, rep: r.rep, problem: reason });
        continue;
      }
      used += 1;
      accepted += r.run.acceptedCount;
      censored += r.run.ratingCensoredCount ?? 0;
      shares.push(...puzzles.map((/** @type {{ clues: number }} */ p) => p.clues / r.run.details.K));
      positions.push(...placed.map((p) => /** @type {{ position: number }} */ (p).position));
    }
    return [cell, {
      completion: { requests: cellRows.length, valid: valid.length, reachedTen: valid.filter((r) => reachedTen(r.run, { quantity })).length },
      rows: used, puzzles: shares.length, clueShare: spread(shares), scorePosition: spread(positions),
      censusEstimateShare: accepted > 0 ? censored / accepted : null, evidenceProblems,
    }];
  }));
}

/**
 * Phase 0's verdict (plan section 6's gate row; RV2-08, RV3-03; IG-P-D1 condition 4). `fail` when an item fails: a
 * failing Nightmare cell, a control or a Master cell on its shipped arm, or a prerequisite. Else, with `purpose:
 * 'selection'`, `incomplete` with the first reason `uncapped comparator collection pending`: a selection is never a
 * final admission. Else, with `purpose: 'final'`, `pass` only when every class has a verdict, every failing cell,
 * control and Master cell passes, P5's stops cover every declared pair with no `unknown` pair (and at least one pair is
 * declared: lost completions are counted, never assumed) and every prerequisite passes, `stage1` and `liveDeadline`
 * included (a projection is no prerequisite: it is not an input); else `incomplete`. Hell 1 and the Hell 1 report are not
 * inputs: they never veto. A failed or inconclusive class does not fail phase 0 by itself: its cells are judged on its
 * no-screen arm.
 * @param {{ purpose: 'selection' | 'final', classes: { id: string, verdict: 'admitted' | 'failed' | 'inconclusive' | null }[],
 *   cells: { cell: string, verdict: string }[], controls: { cell: string, verdict: string }[],
 *   masters: { cell: string, verdict: string }[], p5: { cell: string, declared: number, pairs: number, unknown: number }[],
 *   prerequisites: Record<string, { status: string, reasons?: string[] }> }} input `cells`, `controls` and `masters`
 *   are `cellGate`'s and `masterIdentity`'s results with their cell (`verdict` `pass`, `fail` or `incomplete`); `p5` the
 *   `p5Stops` results (empty for a selection); `prerequisites` T09e's `{ [name]: { status, reasons } }`.
 * @returns {{ verdict: 'pass' | 'fail' | 'incomplete', deciding: string[] }} `deciding` names the items that decide, each
 *   `<item>: <status>` (all the items for a `pass`), the selection reason first.
 */
export function phase0Verdict(input) {
  if (!isObject(input)) {
    throw new TypeError('verdicts: phase0Verdict needs its input');
  }
  const { purpose, classes, cells, controls, masters, p5, prerequisites } = input;
  if (purpose !== 'selection' && purpose !== 'final') {
    throw new RangeError(`verdicts: purpose must be selection or final, got ${String(purpose)}`);
  }
  for (const [name, list] of Object.entries({ classes, cells, controls, masters, p5 })) {
    if (!Array.isArray(list)) {
      throw new TypeError(`verdicts: phase0Verdict needs ${name} as a list`);
    }
  }
  if (!isObject(prerequisites)) {
    throw new TypeError('verdicts: phase0Verdict needs the prerequisites as an object');
  }
  /** @type {{ name: string, status: 'pass' | 'fail' | 'incomplete' }[]} */
  const items = [];
  /** @param {string} name @param {unknown} status */
  const add = (name, status) => {
    if (status !== 'pass' && status !== 'fail' && status !== 'incomplete') {
      throw new RangeError(`verdicts: ${name} needs a status of pass, fail or incomplete, got ${JSON.stringify(status)}`);
    }
    items.push({ name, status });
  };
  for (const c of classes) {
    const given = isObject(c) && c.verdict !== null && c.verdict !== undefined;
    if (!isObject(c) || typeof c.id !== 'string' || (given && !CLASS_VERDICTS.includes(c.verdict))) {
      throw new RangeError(`verdicts: a class needs an id and a verdict of admitted, failed, inconclusive or none, got ${JSON.stringify(c)}`);
    }
    add(`class ${c.id} (${given ? c.verdict : 'no verdict'})`, given ? 'pass' : 'incomplete');
  }
  for (const [label, list] of [['failing cell', cells], ['control', controls], ['master', masters]]) {
    for (const c of /** @type {any[]} */ (list)) {
      add(`${label} ${String(c?.cell)}`, c?.verdict);
    }
  }
  for (const p of p5) {
    if (!isObject(p) || typeof p.cell !== 'string' || !isCount(p.declared) || !isCount(p.pairs) || !isCount(p.unknown)) {
      throw new TypeError('verdicts: a P5 entry needs the result of p5Stops (cell, declared, pairs, unknown)');
    }
    add(`p5 ${p.cell}`, p.declared > 0 && p.unknown === 0 && p.pairs === p.declared ? 'pass' : 'incomplete');
  }
  if (purpose === 'final' && p5.length === 0) {
    add('p5 (no declared pair)', 'incomplete');
  }
  for (const [name, p] of Object.entries(prerequisites)) {
    add(`prerequisite ${name}`, isObject(p) ? p.status : undefined);
  }
  for (const name of REQUIRED_PREREQUISITES) {
    if (!Object.hasOwn(prerequisites, name)) {
      add(`prerequisite ${name} (missing)`, 'incomplete');
    }
  }
  const named = (/** @type {typeof items} */ list) => list.map((i) => `${i.name}: ${i.status}`);
  const failed = items.filter((i) => i.status === 'fail');
  if (failed.length > 0) {
    return { verdict: 'fail', deciding: named(failed) };
  }
  const open = items.filter((i) => i.status === 'incomplete');
  if (purpose === 'selection') {
    return { verdict: 'incomplete', deciding: [SELECTION_PENDING, ...named(open)] };
  }
  return open.length > 0 ? { verdict: 'incomplete', deciding: named(open) } : { verdict: 'pass', deciding: named(items) };
}
