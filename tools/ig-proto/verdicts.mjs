// @ts-check
// Admission statistics of plan section 5.2, row level (V4-T09a; reviews R12, RV2-06, RV2-18, RV3-08): which published
// rows are valid measurements, completion and the capped T10 kept apart from the deadline (D-V4-16), and the
// per-puzzle evidence (puzzle keys, clue counts) that every comparison needs before it may compare anything. Missing,
// invalid, censored or erroneous data is incomplete evidence, never a pass; an invalid puzzle or pack is a
// correctness failure. Pure functions of published rows. V4-T09b adds the pairing, the matched sets and the clue,
// faster and no-regression rules; V4-T09c adds the work ledger of a request (IG-P-Q37: an interval of consumed units
// from the journal and linkage lines), the work rule and the class verdict; V4-T09d and V4-T09e add the global verdicts
// and the verdict tool to this file; the manifest the tool reads is described in data/verdict-manifest.schema.md.
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { pairPrimitives } from './lib/ledger.mjs';
import { sourceRoot } from './lib/paths.mjs';

// The record schema of the frozen source (V4-T01a), never the worktree's.
const { validateRunRecord } = await import(pathToFileURL(join(sourceRoot('frozen'), 'tools', 'bench', 'report.js')).href);

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
