// @ts-check
// Admission statistics of plan section 5.2, row level (V4-T09a; reviews R12, RV2-06, RV2-18, RV3-08): which published
// rows are valid measurements, completion and the capped T10 kept apart from the deadline (D-V4-16), and the
// per-puzzle evidence (puzzle keys, clue counts) that every comparison needs before it may compare anything. Missing,
// invalid, censored or erroneous data is incomplete evidence, never a pass; an invalid puzzle or pack is a
// correctness failure. Pure functions of published rows. V4-T09b adds the pairing, the matched sets and the clue,
// faster and no-regression rules; V4-T09c adds the work ledger of a request (IG-P-Q37: an interval of consumed units
// from the journal and linkage lines), the work rule and the class verdict; V4-T09d adds the global verdicts (the cell
// gates on the arm a class ships, Master identity, the Hell 1 report, P5's stops, the post-hoc projection, the
// population and phase 0's verdict) and V4-T09e the verdict tool (bound prerequisites, the class-selection receipt, the
// work report and the records it writes: `node tools\ig-proto\verdicts.mjs --manifest <path> --label frozen
// --source-label <SL>`); the manifest the tool reads is described in data/verdict-manifest.schema.md.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

import { pairPrimitives } from './lib/ledger.mjs';
import { abs, evidenceDir, FROZEN_COMMIT, FROZEN_DIGEST, parseArgs, rel, ROOT, sourceRoot } from './lib/paths.mjs';
import { ACCEPTED_FORMAT, checkAccepted, LIVE_DEADLINE_FIELDS, proofEnvelope } from './lib/proof.mjs';
import { banner, buildMeta, harnessInfo, sha256, sha256Text, writeJson, writeText } from './lib/records.mjs';
import { ensureTree } from './lib/tree.mjs';

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
 * @param {IngestedRow[]} rows
 * @param {Record<string, any>} ledgers From a `rowKey` to `rowLedger`'s result.
 * @returns {{ ingested: IngestedRow, ledger: Record<string, any> }[]} Each row with its ledger; a row without one has
 *   no journal (incomplete, never zero work).
 */
function attachLedgers(rows, ledgers) {
  return rows.map((ingested) => ({
    ingested, ledger: typeof ingested.rowKey === 'string' && Object.hasOwn(ledgers, ingested.rowKey) ? ledgers[ingested.rowKey] : NO_JOURNAL,
  }));
}

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
      screen: attachLedgers(c.screenRows, c.screenLedgers),
      noScreen: attachLedgers(c.noScreenRows, c.noScreenLedgers),
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

/** The refusal of a live-deadline prerequisite that is not a live-deadline binding (R01, D-V4-08). */
const LIVE_REFUSAL = 'verdicts: the live-deadline prerequisite must be a live-deadline binding';

/** @typedef {{ status: 'pass' | 'fail' | 'incomplete', reasons: string[] }} Prerequisite */

/**
 * The prerequisites of a verdict through their accepted bindings (V4-T09e; R2-09, RV3-06, D-V4-18): each declared
 * `{ binding, current }` is `checkAccepted` of the binding file with the arms it names compared to today's trees
 * (`currentOf`); the historical stage-1 binding is declared with `current: []` and stays valid after unrelated harness
 * work. A live-deadline binding whose `expected.kind` is not `live-deadline` or whose `expected.fields` are not
 * T04d's `LIVE_DEADLINE_FIELDS` is refused (it throws): a projection can never satisfy it. A binding file that is
 * absent is `incomplete` (`missing binding <path>`), and so is one that is not JSON or whose current tree cannot be
 * read. `stage1` and `liveDeadline` are keys only when declared (`phase0Verdict` reads an absent one as `incomplete`).
 * @param {{ stage1?: { binding: string, current: string[] }, parity?: { binding: string, current: string[] }[],
 *   liveDeadline?: { binding: string, current: string[] } }} declared The manifest's `prerequisites`.
 * @param {{ readJson: (path: string) => any, readFile: (path: string) => string | null,
 *   currentOf: (id: string) => { treeId: string, paramsHash: string } }} io `readJson` returns `null` for an absent file
 *   and throws for one that is not JSON; `currentOf(id)` is today's tree id and the SHA-256 of `JSON.stringify(params)`
 *   of that tree's `ig-tree.json`, and is only asked for the arms of a binding that exists.
 * @returns {Record<string, Prerequisite>} `stage1`, `liveDeadline` and one `parity:<binding path>` per parity entry.
 */
export function prerequisites(declared, { readJson, readFile, currentOf }) {
  if (!isObject(declared)) {
    throw new TypeError('verdicts: prerequisites needs the declared prerequisites');
  }
  /** @param {unknown} ref @returns {{ binding: string, current: string[] }} */
  const needRef = (ref) => {
    const r = /** @type {any} */ (ref);
    if (!isObject(r) || typeof r.binding !== 'string' || r.binding === '' || !Array.isArray(r.current) || !r.current.every((/** @type {unknown} */ id) => typeof id === 'string')) {
      throw new TypeError('verdicts: a prerequisite needs the path of its binding and the list of arm ids to compare');
    }
    return r;
  };
  if (declared.parity !== undefined && !Array.isArray(declared.parity)) {
    throw new TypeError('verdicts: the parity prerequisites must be a list');
  }
  const stage1 = declared.stage1 === undefined ? undefined : needRef(declared.stage1);
  const live = declared.liveDeadline === undefined ? undefined : needRef(declared.liveDeadline);
  const parity = (declared.parity ?? []).map(needRef);
  const names = parity.map((p) => `parity:${p.binding}`);
  if (new Set(names).size !== names.length) {
    throw new RangeError('verdicts: a parity binding is declared twice');
  }
  /** @param {string} path @returns {any} The binding, `null` when absent, `undefined` when it is not JSON. */
  const load = (path) => {
    try {
      return readJson(path);
    } catch {
      return undefined;
    }
  };
  if (live !== undefined) {
    const binding = load(live.binding);
    if (isObject(binding) && binding.format === ACCEPTED_FORMAT
      && (binding.expected?.kind !== 'live-deadline' || !isDeepStrictEqual(binding.expected?.fields, LIVE_DEADLINE_FIELDS))) {
      throw new Error(LIVE_REFUSAL);
    }
  }
  /** @param {{ binding: string, current: string[] }} ref @returns {Prerequisite} */
  const check = (ref) => {
    const binding = load(ref.binding);
    if (binding === null) {
      return { status: 'incomplete', reasons: [`missing binding ${ref.binding}`] };
    }
    if (binding === undefined) {
      return { status: 'incomplete', reasons: [`unreadable binding ${ref.binding}`] };
    }
    /** @type {{ id: string, treeId: string, paramsHash: string }[]} */
    let current;
    try {
      current = ref.current.map((id) => ({ id, ...currentOf(id) }));
    } catch (e) {
      return { status: 'incomplete', reasons: [`current tree unreadable: ${e instanceof Error ? e.message : String(e)}`] };
    }
    return checkAccepted(binding, { readFile, current });
  };
  /** @type {Record<string, Prerequisite>} */
  const out = {};
  if (stage1 !== undefined) {
    out.stage1 = check(stage1);
  }
  if (live !== undefined) {
    out.liveDeadline = check(live);
  }
  parity.forEach((ref, i) => {
    out[names[i]] = check(ref);
  });
  return out;
}

/**
 * The class-selection receipt (V4-T09e; RV3-04, RV3-06; D-V4-18, D-V4-20): the shipped arm of every class cell from the
 * class verdicts, in one `ig-v4-proof` envelope of the kind `class-selection` that binds every input of the decision
 * (`evidence`: the verdict manifest, the activation, closure and freeze records, every runs, journal and link file read,
 * each with its SHA-256; `arms`: the tree id and the parameter hash of the published runs files). Its `verdict` is `pass`
 * (a final selection) when no declared row is missing, or when a closure is given whose `missing` is exactly the declared
 * rows that are not published (in any order); else `incomplete`, and an interim report is never a selection. With a
 * closure, `coverage.expected` is the declared rows less the closed ones, `coverage.missing` is empty and
 * `collection.missing` lists the closed rows, so that `proofCheck` against T11f's expectation of the same records passes.
 * The envelope carries `reasons` for an incomplete one.
 * @param {{ classes: { id: string, cells: string[], screen: string, noScreen: string }[] }} manifest
 * @param {{ id: string, verdict: 'admitted' | 'failed' | 'inconclusive', decidedBy: string | null }[]} results One per class.
 * @param {{ files: { path: string, sha256: string }[], published: string[], declared: string[],
 *   activation: { path: string, sha256: string } | null, closure: { path: string, sha256: string, missing: string[] } | null,
 *   freeze: { path: string, sha256: string } | null, arms: { id: string, treeId: string | null, paramsHash: string | null }[],
 *   harnessHash: string }} inputs `published` and `declared` are `<arm>/<rowKey>`; every non-null `activation`, `closure`
 *   and `freeze` must be one of `files` (the receipt binds it).
 * @returns {Record<string, any>} The envelope; `selection` and `collection` stand at its root.
 */
export function classSelection(manifest, results, inputs) {
  if (!isObject(manifest) || !Array.isArray(manifest.classes) || !Array.isArray(results) || !isObject(inputs)) {
    throw new TypeError('verdicts: classSelection needs the manifest, the class results and the inputs');
  }
  const { files, published, declared, activation, closure, freeze, arms, harnessHash } = inputs;
  for (const [name, list] of Object.entries({ files, published, declared, arms })) {
    if (!Array.isArray(list)) {
      throw new TypeError(`verdicts: classSelection needs ${name} as a list`);
    }
  }
  for (const [name, ref] of Object.entries({ activation, closure, freeze })) {
    if (ref !== null && !files.some((f) => f.path === ref?.path && f.sha256 === ref?.sha256)) {
      throw new RangeError(`verdicts: the receipt does not bind the ${name} record`);
    }
  }
  if (closure !== null && !(Array.isArray(closure.missing) && closure.missing.every((r) => typeof r === 'string'))) {
    throw new TypeError('verdicts: a closure needs the list of its missing rows');
  }
  /** @type {{ id: string, verdict: string, decidedBy: string | null, shipped: string }[]} */
  const classes = [];
  /** @type {Record<string, { class: string, shipped: string }>} */
  const cells = {};
  for (const cls of manifest.classes) {
    const result = results.find((r) => r?.id === cls.id);
    if (result === undefined) {
      throw new RangeError(`verdicts: class ${cls.id} has no verdict`);
    }
    const shipped = shippedArm(result, { screen: cls.screen, noScreen: cls.noScreen });
    classes.push({ id: cls.id, verdict: result.verdict, decidedBy: result.decidedBy ?? null, shipped });
    for (const cell of cls.cells) {
      if (Object.hasOwn(cells, cell)) {
        throw new RangeError(`verdicts: cell ${cell} is in two classes`);
      }
      cells[cell] = { class: cls.id, shipped };
    }
  }
  const have = new Set(published);
  const missing = declared.filter((row) => !have.has(row));
  const closed = closure === null ? [] : closure.missing;
  const matches = closure !== null && missing.length === closed.length && missing.every((row) => closed.includes(row));
  const final = missing.length === 0 || matches;
  /** @type {string[]} */
  const reasons = final ? [] : [...(closure === null ? [] : ['closure does not match']), ...missing.map((row) => `missing ${row}`)];
  const closedSet = new Set(closed);
  return proofEnvelope({
    kind: 'class-selection',
    verdict: final ? 'pass' : 'incomplete',
    source: { frozenCommit: FROZEN_COMMIT, sourceDigest: FROZEN_DIGEST },
    harnessHash,
    arms,
    coverage: {
      expected: closure !== null && final ? declared.filter((row) => !closedSet.has(row)) : declared,
      observed: published,
      missing: closure !== null && final ? [] : missing,
      censored: [],
    },
    evidence: files,
    fields: {
      selection: { classes, cells },
      collection: { activationSha256: activation?.sha256 ?? null, closureSha256: closure?.sha256 ?? null, missing: [...closed] },
      reasons,
    },
  });
}

/**
 * The work report of a class (IG-P-Q37, D-V4-17; V4-T09e): T09c's `workRule` result with, per arm, the width of the
 * interval per accepted puzzle (`hiRatio - loRatio`, `null` when the arm accepted no puzzle), the open primitives (the sum
 * of `ledger.open` over the arm's rows, which `workRule` does not carry) and `unbounded` (an invalid bound made `hi`
 * infinite: a JSON number cannot say it). Reported, never judged here: the verdict is T09c's.
 * @param {ReturnType<typeof workRule>} work
 * @param {{ screen: { ingested: IngestedRow, ledger: Record<string, any> }[], noScreen: { ingested: IngestedRow, ledger: Record<string, any> }[] }} rows
 *   The rows given to `workRule`.
 * @returns {{ verdict: 'pass' | 'worse' | 'unknown', screen: ArmWork & { width: number | null, open: number, unbounded: boolean },
 *   noScreen: ArmWork & { width: number | null, open: number, unbounded: boolean } }}
 */
export function workReport(work, rows) {
  /** @param {ArmWork} arm @param {{ ledger: Record<string, any> }[]} list */
  const report = (arm, list) => ({
    ...arm,
    width: arm.loRatio === null || arm.hiRatio === null ? null : arm.hiRatio - arm.loRatio,
    open: list.reduce((sum, r) => sum + (isCount(r.ledger.open) ? r.ledger.open : 0), 0),
    unbounded: !Number.isFinite(arm.hi),
  });
  return { verdict: work.verdict, screen: report(work.screen, rows.screen), noScreen: report(work.noScreen, rows.noScreen) };
}

/**
 * The cells whose shipped arm a final verdict recomputes differently from the selection it rests on (RV3-03): a cell is
 * changed when its class or shipped arm differs, or when only one side names it.
 * @param {{ cells: Record<string, { class: string, shipped: string }> }} selected The receipt's `selection`.
 * @param {Record<string, { class: string, shipped: string }>} recomputed
 * @returns {string[]} The receipt's cells in its order, then the cells only the recomputation has.
 */
export function selectionChanges(selected, recomputed) {
  if (!isObject(selected) || !isObject(selected.cells) || !isObject(recomputed)) {
    throw new TypeError('verdicts: selectionChanges needs the selection cells and the recomputed cells');
  }
  const same = (/** @type {any} */ a, /** @type {any} */ b) => isObject(a) && isObject(b) && a.class === b.class && a.shipped === b.shipped;
  return [...new Set([...Object.keys(selected.cells), ...Object.keys(recomputed)])]
    .filter((cell) => !same(selected.cells[cell], recomputed[cell]));
}

/**
 * A final verdict never changes the selection it rests on (RV3-03): a recomputed shipped arm that differs from the
 * selection's fails phase 0 whatever else is open.
 * @param {{ verdict: 'pass' | 'fail' | 'incomplete', deciding: string[] }} phase0 `phase0Verdict`'s result.
 * @param {string[]} changed `selectionChanges`' result.
 * @returns {{ verdict: 'pass' | 'fail' | 'incomplete', deciding: string[] }} `phase0` itself when nothing changed, else
 *   `fail` naming each `selection changed <cell>`, then the items that failed anyway.
 */
export function finalPhase0(phase0, changed) {
  if (changed.length === 0) {
    return phase0;
  }
  return { verdict: 'fail', deciding: [...changed.map((cell) => `selection changed ${cell}`), ...(phase0.verdict === 'fail' ? phase0.deciding : [])] };
}

/**
 * @param {{ verdict: 'pass' | 'fail' | 'incomplete', deciding: string[] }} phase0
 * @param {Record<string, Prerequisite>} [prerequisites] When given, a deciding prerequisite is followed by its reasons.
 * @returns {string} The phase-0 line: `Phase 0: pass.`, `Phase 0: INCOMPLETE (...)` or `Phase 0: FAIL (...)`, the reasons
 *   of `deciding` joined by `; `.
 */
export function phase0Line({ verdict, deciding }, prerequisites = {}) {
  const reasoned = deciding.map((item) => {
    const name = /^prerequisite (.+?)(?: \(missing\))?: (?:pass|fail|incomplete)$/.exec(item)?.[1];
    const reasons = name !== undefined && Object.hasOwn(prerequisites, name) ? prerequisites[name].reasons : [];
    return reasons.length > 0 ? `${item} (${reasons.join(', ')})` : item;
  });
  return verdict === 'pass' ? 'Phase 0: pass.' : `Phase 0: ${verdict === 'fail' ? 'FAIL' : 'INCOMPLETE'} (${reasoned.join('; ')})`;
}

const NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** The observation namespaces an accepted binding hashes (check-list section 3.1, D-V4-18): no verdict is written into them. */
const HISTORICAL_TASKS = Object.freeze(['IGP-02', 'V4-T04', 'V4-T04v4', 'V4-T04f', 'V4-T04i', 'V4-S2P']);

/** @param {unknown} v @returns {boolean} A name that is safe as a file or folder name. */
const isNamed = (v) => typeof v === 'string' && NAME.test(v);

/** @param {unknown} p @returns {boolean} A repository-relative path with `/`, with no `..` and no drive. */
const isRepoPath = (p) => typeof p === 'string' && p !== '' && !p.includes('\\') && !p.startsWith('/') && !/^[A-Za-z]:/.test(p) && !p.split('/').includes('..');

/**
 * @param {any} m The verdict manifest (`data/verdict-manifest.schema.md`).
 * @returns {void} Throws `verdicts: ...` unless it has the shape the tool reads: a missing or malformed field is a refused
 *   manifest, never a default that could turn a gate into a vacuous one.
 */
function needManifest(m) {
  /** @param {string} problem @returns {never} */
  const bad = (problem) => {
    throw new RangeError(`verdicts: manifest: ${problem}`);
  };
  /** @param {string} what @param {unknown} list */
  const names = (what, list) => {
    if (!Array.isArray(list) || !list.every(isNamed)) {
      bad(`${what} must be a list of names`);
    }
  };
  /** @param {string} what @param {any} value @param {boolean} nullable */
  const refOf = (what, value, nullable) => {
    if (!(nullable && value === null) && !(isObject(value) && isRepoPath(value.path) && typeof value.sha256 === 'string' && KEY.test(value.sha256))) {
      bad(`${what} must be { path, sha256 }${nullable ? ' or null' : ''}`);
    }
  };
  if (!isObject(m)) {
    bad('it is not an object');
  }
  if (!isNamed(m.task)) {
    bad('task must be a name');
  }
  if (HISTORICAL_TASKS.includes(m.task)) {
    bad(`task ${m.task} is a historical observation namespace`);
  }
  if (m.label !== 'frozen') {
    bad('label must be frozen');
  }
  if (m.purpose !== 'selection' && m.purpose !== 'final') {
    bad(`purpose must be selection or final, got ${JSON.stringify(m.purpose)}`);
  }
  needPositive('quantity', m.quantity, true);
  needPositive('capMs', m.capMs, false);
  needPositive('responseBoundMs', m.responseBoundMs, false);
  needResampling(m);
  needReps(m.validationReps);
  if (!Array.isArray(m.masterReps) || !m.masterReps.every(Number.isInteger)) {
    bad('masterReps must be a list of integers');
  }
  if (!isObject(m.collection)) {
    bad('collection must be an object');
  }
  refOf('collection.activation', m.collection.activation, true);
  refOf('collection.closure', m.collection.closure, true);
  if (m.purpose === 'final') {
    refOf('selection', m.selection, false);
  } else if (m.selection !== undefined) {
    bad('selection belongs to a final purpose');
  }
  if (!Array.isArray(m.arms) || m.arms.length === 0) {
    bad('arms must be a non-empty list');
  }
  /** @type {Set<string>} */
  const ids = new Set();
  for (const a of m.arms) {
    if (!isObject(a) || !['id', 'task', 'arm', 'variant'].every((k) => isNamed(a[k])) || typeof a.treeId !== 'string' || a.treeId === ''
      || !Array.isArray(a.files) || !a.files.every((/** @type {any} */ f) => isObject(f) && isRepoPath(f.path) && typeof f.sha256 === 'string' && KEY.test(f.sha256))) {
      bad(`arm ${JSON.stringify(isObject(a) ? a.id : a)} needs id, task, arm, variant, treeId and files [{ path, sha256 }]`);
    }
    if (ids.has(a.id)) {
      bad(`arm ${a.id} is declared twice`);
    }
    ids.add(a.id);
  }
  /** @param {string} what @param {unknown} id */
  const known = (what, id) => {
    if (typeof id !== 'string' || !ids.has(id)) {
      bad(`${what} names the unknown arm ${String(id)}`);
    }
  };
  if (!Array.isArray(m.classes)) {
    bad('classes must be a list');
  }
  /** @type {Set<string>} */
  const classIds = new Set();
  /** @type {Set<string>} */
  const classCells = new Set();
  for (const c of m.classes) {
    if (!isObject(c) || !isNamed(c.id) || !Array.isArray(c.cells) || c.cells.length === 0 || !c.cells.every(isNamed)) {
      bad(`a class needs an id and a non-empty list of cells, got ${JSON.stringify(c)}`);
    }
    if (classIds.has(c.id)) {
      bad(`class ${c.id} is declared twice`);
    }
    classIds.add(c.id);
    known(`class ${c.id}`, c.screen);
    known(`class ${c.id}`, c.noScreen);
    for (const cell of c.cells) {
      if (classCells.has(cell)) {
        bad(`cell ${cell} is in two classes`);
      }
      classCells.add(cell);
    }
  }
  names('failingCells', m.failingCells);
  names('hell1', m.hell1);
  if (!Array.isArray(m.controls) || !m.controls.every((/** @type {any} */ c) => isObject(c) && isNamed(c.cell))) {
    bad('controls must be a list of { cell, today }');
  }
  for (const c of m.controls) {
    known(`control ${c.cell}`, c.today);
  }
  if (!Array.isArray(m.masters) || !m.masters.every((/** @type {any} */ c) => isObject(c) && isNamed(c.cell))) {
    bad('masters must be a list of { cell, today, after }');
  }
  for (const c of m.masters) {
    known(`master ${c.cell}`, c.today);
    known(`master ${c.cell}`, c.after);
  }
  if (m.masters.length > 0) {
    needReps(m.masterReps);
  }
  if (!Array.isArray(m.p5) || !m.p5.every((/** @type {any} */ p) => isObject(p) && isNamed(p.cell))) {
    bad('p5 must be a list of { cell, bounded, uncapped, reps }');
  }
  for (const p of m.p5) {
    known(`p5 ${p.cell}`, p.bounded);
    known(`p5 ${p.cell}`, p.uncapped);
    needReps(p.reps);
  }
  const projection = m.deadlineProjection;
  if (!isObject(projection) || !Array.isArray(projection.arms) || !Array.isArray(projection.reserves)
    || !projection.reserves.every((/** @type {unknown} */ r) => isNum(r) && r >= 0 && r <= 1)) {
    bad('deadlineProjection must be { arms, reserves, deadlineMs }');
  }
  needPositive('deadlineMs', projection.deadlineMs, false);
  for (const id of projection.arms) {
    known('deadlineProjection', id);
  }
  if (!isObject(m.prerequisites)) {
    bad('prerequisites must be an object');
  }
}

/**
 * @typedef {object} VerdictIo What the tool reads from the machine; the self-test supplies it from memory.
 * @property {(path: string) => string | null} readText The text of a repository-relative file; `null` when absent.
 * @property {(folder: string) => string[]} list The files below a repository-relative folder, any depth, as
 *   repository-relative paths in name order; empty when the folder is absent.
 * @property {string} harnessHash Today's `harnessInfo().harnessHash`, the producer of a selection.
 * @property {(id: string) => { treeId: string, paramsHash: string }} currentOf Today's tree of an arm id, for the
 *   prerequisites; it throws for a tree that cannot be read.
 */

/** @param {string} path @returns {string} The file name of a repository-relative path. */
const baseName = (path) => path.slice(path.lastIndexOf('/') + 1);

/** @param {string[]} paths @returns {string[]} */
const sorted = (paths) => [...paths].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

/**
 * The published rows of one arm (V4-T09e, Authority "Reading the records"): every runs file of the arm's evidence folder
 * and every file its `files` declares, each row through `ingestRow`. A file whose SHA-256 differs from the manifest's
 * (`changed evidence`), that `files` does not declare (`undeclared evidence`), that is missing, that is not JSON or
 * whose `meta.trees.<variant>.treeId` is not the arm's `treeId` (`stale tree`) makes each of its rows `invalid`, and its
 * rows are not counted as published.
 * @param {any} manifest
 * @param {any} arm
 * @param {VerdictIo} io
 */
function readArm(manifest, arm, io) {
  const folder = `docs/improve-generating/evidence/${manifest.label}/${arm.task}/${arm.arm}`;
  const onDisk = io.list(folder).filter((p) => p.startsWith(`${folder}/`) && p.endsWith('.runs.json') && !p.slice(folder.length + 1).includes('/'));
  /** @type {Map<string, string>} */
  const declared = new Map(arm.files.map((/** @type {{ path: string, sha256: string }} */ f) => [f.path, f.sha256]));
  /** @type {IngestedRow[]} */
  const rows = [];
  /** @type {{ path: string, sha256: string | null, declared: string | null, rows: number, problems: string[] }[]} */
  const files = [];
  /** @type {{ path: string, sha256: string }[]} */
  const evidence = [];
  /** @type {string[]} */
  const published = [];
  /** @type {{ treeId: string, paramsHash: string | null }[]} */
  const seen = [];
  for (const path of sorted([...new Set([...declared.keys(), ...onDisk])])) {
    /** @type {string[]} */
    const problems = [];
    const info = { path, sha256: /** @type {string | null} */ (null), declared: declared.get(path) ?? null, rows: 0, problems };
    files.push(info);
    const text = io.readText(path);
    if (text === null) {
      problems.push('missing evidence');
      continue;
    }
    info.sha256 = sha256Text(text);
    evidence.push({ path, sha256: info.sha256 });
    if (info.declared === null) {
      problems.push('undeclared evidence');
    } else if (info.declared !== info.sha256) {
      problems.push('changed evidence');
    }
    /** @type {any} */
    let doc;
    try {
      doc = JSON.parse(text);
    } catch {
      problems.push('unreadable evidence');
      continue;
    }
    const tree = doc?.meta?.trees?.[arm.variant];
    if (tree?.treeId !== arm.treeId) {
      problems.push('stale tree');
    }
    if (isObject(tree) && typeof tree.treeId === 'string') {
      const identity = { treeId: tree.treeId, paramsHash: isObject(tree.params) ? sha256(JSON.stringify(tree.params)) : null };
      if (!seen.some((s) => s.treeId === identity.treeId && s.paramsHash === identity.paramsHash)) {
        seen.push(identity);
      }
    }
    if (!Array.isArray(doc?.rows)) {
      problems.push('no rows');
      continue;
    }
    info.rows = doc.rows.length;
    for (const row of doc.rows) {
      const got = ingestRow(row, { quantity: manifest.quantity });
      if (problems.length === 0) {
        rows.push(got);
        if (typeof got.rowKey === 'string') {
          published.push(`${arm.id}/${got.rowKey}`);
        }
      } else {
        rows.push({ ...got, status: 'invalid', problems: [...problems.map((p) => `${p} ${path}`), ...got.problems] });
      }
    }
  }
  return { rows, files, evidence, published, tree: seen.length === 1 ? seen[0] : { treeId: null, paramsHash: null } };
}

/**
 * The journals of the rows of one arm (V4-T09e step 3): per row every file `<rowKey>.*.jsonl` of the logs folder of every
 * shard of the arm other than `<rowKey>.row.jsonl` and `<rowKey>.link.jsonl`, through `parseLines` (its problems, and
 * those of the link file, join the row's ledger), and the link lines of `<rowKey>.link.jsonl`.
 * @param {any} manifest
 * @param {any} arm
 * @param {IngestedRow[]} rows
 * @param {VerdictIo} io
 * @returns {{ ledgers: Record<string, Record<string, any>>, journals: Record<string, Record<string, any>[] | null>,
 *   evidence: { path: string, sha256: string }[] }} A row with no journal and no link file has neither a ledger nor a
 *   journal; `journals[rowKey]` is `null` also when its lines had a problem and show no dead end (a lost line could hide one).
 */
function readJournals(manifest, arm, rows, io) {
  const raw = `tests/artifacts/ig-proto/${manifest.label}/${arm.task}/${arm.arm}`;
  const logs = io.list(raw).filter((p) => {
    const parts = p.startsWith(`${raw}/`) ? p.slice(raw.length + 1).split('/') : [];
    return parts.length === 3 && parts[1] === 'logs' && parts[2].endsWith('.jsonl');
  });
  /** @type {Record<string, Record<string, any>>} */
  const ledgers = {};
  /** @type {Record<string, Record<string, any>[] | null>} */
  const journals = {};
  /** @type {{ path: string, sha256: string }[]} */
  const evidence = [];
  for (const { rowKey } of rows) {
    if (typeof rowKey !== 'string' || Object.hasOwn(journals, rowKey)) {
      continue;
    }
    const mine = logs.filter((p) => baseName(p).startsWith(`${rowKey}.`));
    const links = mine.filter((p) => baseName(p) === `${rowKey}.link.jsonl`);
    const workers = mine.filter((p) => baseName(p) !== `${rowKey}.row.jsonl` && baseName(p) !== `${rowKey}.link.jsonl`);
    if (workers.length === 0 && links.length === 0) {
      journals[rowKey] = null;
      continue;
    }
    /** @type {string[]} */
    const problems = [];
    let workerProblems = 0;
    /** @param {string} path @returns {Record<string, any>[]} */
    const read = (path) => {
      const text = io.readText(path);
      if (text === null) {
        problems.push(`missing journal file ${path}`);
        return [];
      }
      evidence.push({ path, sha256: sha256Text(text) });
      const parsed = parseLines(text, baseName(path));
      problems.push(...parsed.problems);
      return parsed.lines;
    };
    const lines = workers.flatMap((p) => {
      const before = problems.length;
      const got = read(p);
      workerProblems += problems.length - before;
      return got;
    });
    const linkLines = links.length === 0 ? null : links.flatMap(read);
    const ledger = rowLedger(lines, linkLines);
    ledgers[rowKey] = problems.length === 0 ? ledger : { ...ledger, complete: false, problems: [...ledger.problems, ...problems] };
    journals[rowKey] = workers.length === 0 || (workerProblems > 0 && deadEnds(lines) === 0) ? null : lines;
  }
  return { ledgers, journals, evidence };
}

/** The gate of a cell that no class ships: there is no arm to judge (plan section 5.2, IG-P-Q29). */
const noShippedArm = (/** @type {string} */ cell) => ({
  verdict: /** @type {const} */ ('incomplete'), reasons: [`no class ships ${cell}`], reachedTen: null, deadEnds: null,
  deadlineViolations: null, p95Ms: null, noRegression: null,
});

/** @param {unknown} list @param {string} what @returns {string[]} */
function needRows(list, what) {
  if (!Array.isArray(list) || !list.every((r) => typeof r === 'string')) {
    throw new Error(`verdicts: ${what} must be a list of <arm>/<rowKey>`);
  }
  return list;
}

/**
 * Decided records are written once (check-list section 3.3; V4-T09e step 3c): the reason a verdict run must not write the
 * records of its task, else `null`. An interim record (a selection that is `incomplete`, a phase 0 that is `incomplete`) is
 * superseded when the collection is closed or a prerequisite is accepted; a decided one is not, and correcting it needs a
 * new manifest `task`.
 * @param {'selection' | 'final'} purpose
 * @param {{ selection: any, verdicts: any }} existing The task's parsed `class-selection.json` and `verdicts.json`, each
 *   `null` when absent.
 * @returns {string | null} `a final selection exists` (the purpose `selection` and a selection receipt with `verdict` `pass`),
 *   `a decided phase 0 exists` (the purpose `final` and a phase 0 of `pass` or `fail`), else `null`.
 */
export function decidedRecord(purpose, { selection, verdicts }) {
  if (purpose !== 'selection' && purpose !== 'final') {
    throw new RangeError(`verdicts: purpose must be selection or final, got ${String(purpose)}`);
  }
  if (purpose === 'selection' && isObject(selection) && selection.verdict === 'pass') {
    return 'a final selection exists';
  }
  const phase0 = isObject(verdicts) ? verdicts.phase0?.verdict : undefined;
  if (purpose === 'final' && (phase0 === 'pass' || phase0 === 'fail')) {
    return 'a decided phase 0 exists';
  }
  return null;
}

/**
 * Computes the verdict records of a manifest from the records it names (V4-T09e, steps 1 to 3b): the rows of every arm,
 * the journals of the class arms, the class verdicts, the cells on the arms they ship, the controls, Master identity,
 * Hell 1, P5's stops, the projection, the population, the prerequisites and phase 0 and, for a selection, the
 * class-selection receipt. It throws (a refused manifest) when the manifest is malformed, a named record is missing or
 * differs from its SHA-256, or the live-deadline prerequisite is not a live-deadline binding.
 * @param {any} manifest
 * @param {VerdictIo} io
 * @param {{ path: string, sha256: string }} manifestRef The manifest file as read.
 * @returns {{ record: Record<string, any>, receipt: Record<string, any> | null }} `receipt` only for the purpose `selection`.
 */
export function verdictRecords(manifest, io, manifestRef) {
  needManifest(manifest);
  const { purpose, quantity, capMs, responseBoundMs, resamples, resampleSeed, validationReps: reps, masterReps } = manifest;
  /** @type {Map<string, string>} */
  const evidence = new Map([[manifestRef.path, manifestRef.sha256]]);
  /** @param {string} what @param {{ path: string, sha256: string }} ref @returns {any} The record, as JSON. */
  const named = (what, ref) => {
    const text = io.readText(ref.path);
    if (text === null) {
      throw new Error(`verdicts: ${what} ${ref.path} is missing`);
    }
    if (sha256Text(text) !== ref.sha256) {
      throw new Error(`verdicts: ${what} ${ref.path} differs from the SHA-256 of the manifest`);
    }
    evidence.set(ref.path, ref.sha256);
    /** @type {unknown} */
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`verdicts: ${what} ${ref.path} is not JSON`);
    }
    if (!isObject(parsed)) {
      throw new Error(`verdicts: ${what} ${ref.path} is not a JSON object`);
    }
    return parsed;
  };
  const { activation, closure: closureRef } = manifest.collection;
  const activationRecord = activation === null ? null : named('the activation record', activation);
  const closureRecord = closureRef === null ? null : named('the closure record', closureRef);
  if (closureRecord !== null && closureRecord.activation?.sha256 !== activation?.sha256) {
    throw new Error(`verdicts: the closure belongs to another activation: ${closureRef.path}`);
  }
  const selectionReceipt = purpose === 'final' ? named('the selection receipt', manifest.selection) : null;
  if (selectionReceipt !== null && selectionReceipt.verdict !== 'pass') {
    throw new Error(`verdicts: the selection is not final: ${manifest.selection.path}`);
  }
  /** @type {{ path: string, sha256: string } | null} */
  let freeze = null;
  if (activationRecord !== null) {
    const f = activationRecord.epoch?.freeze;
    if (!isObject(f) || !isRepoPath(f.path) || typeof f.sha256 !== 'string' || !KEY.test(f.sha256)) {
      throw new Error('verdicts: the activation record names no freeze record (epoch.freeze)');
    }
    named('the freeze record', f);
    freeze = { path: f.path, sha256: f.sha256 };
  }
  const declared = activationRecord !== null
    ? needRows(activationRecord.declaredRows, 'declaredRows of the activation record')
    : [...new Set(manifest.classes.flatMap((/** @type {any} */ c) => [c.screen, c.noScreen].flatMap((arm) => c.cells.flatMap((/** @type {string} */ cell) => reps.map((/** @type {number} */ rep) => `${arm}/${cell}~${rep}`)))))];
  const closure = closureRecord === null ? null : { ...closureRef, missing: needRows(closureRecord.missing, 'missing of the closure record') };

  /** @type {Record<string, IngestedRow[]>} */
  const armRows = {};
  /** @type {Record<string, ReturnType<typeof readArm>>} */
  const read = {};
  /** @type {string[]} */
  const published = [];
  for (const arm of manifest.arms) {
    const got = readArm(manifest, arm, io);
    read[arm.id] = got;
    armRows[arm.id] = got.rows;
    published.push(...got.published);
    for (const e of got.evidence) {
      evidence.set(e.path, e.sha256);
    }
  }
  const classArms = [...new Set(manifest.classes.flatMap((/** @type {any} */ c) => [c.screen, c.noScreen]))];
  /** @type {Record<string, Record<string, any>>} */
  const ledgers = {};
  /** @type {Record<string, Record<string, Record<string, any>[] | null>>} */
  const journals = {};
  for (const id of /** @type {string[]} */ (classArms)) {
    const got = readJournals(manifest, manifest.arms.find((/** @type {any} */ a) => a.id === id), armRows[id], io);
    ledgers[id] = got.ledgers;
    journals[id] = got.journals;
    for (const e of got.evidence) {
      evidence.set(e.path, e.sha256);
    }
  }

  /** @param {string} id @param {string} cell @returns {IngestedRow[]} */
  const rowsOf = (id, cell) => armRows[id].filter((r) => r.caseId === cell);
  const failing = new Set(manifest.failingCells);
  /** @type {Map<string, any>} */
  const controlOf = new Map(manifest.controls.map((/** @type {any} */ c) => [c.cell, c]));
  const gateOptions = { reps, quantity, capMs, responseBoundMs };
  /** @param {'failing' | 'control'} kind @param {string} armId @param {string} cell */
  const gateOn = (kind, armId, cell) => (kind === 'failing'
    ? cellGate('failing', rowsOf(armId, cell), { ...gateOptions, journals: journals[armId] ?? {} })
    : cellGate('control', rowsOf(armId, cell), { ...gateOptions, todayRows: rowsOf(controlOf.get(cell).today, cell), resamples, resampleSeed }));

  /** @type {Map<string, { class: string, shipped: string }>} */
  const shipOf = new Map();
  const classResults = manifest.classes.map((/** @type {any} */ cls) => {
    const cells = cls.cells.map((/** @type {string} */ cell) => {
      const kind = failing.has(cell) ? 'failing' : controlOf.has(cell) ? 'control' : null;
      return {
        cell, screenRows: rowsOf(cls.screen, cell), noScreenRows: rowsOf(cls.noScreen, cell),
        screenLedgers: ledgers[cls.screen], noScreenLedgers: ledgers[cls.noScreen],
        screenCellGate: kind === null ? 'pass' : gateOn(kind, cls.screen, cell).verdict,
      };
    });
    const result = classVerdict({ cells, reps, resamples, resampleSeed, quantity, capMs });
    const shipped = shippedArm(result, { screen: cls.screen, noScreen: cls.noScreen });
    for (const cell of cls.cells) {
      shipOf.set(cell, { class: cls.id, shipped });
    }
    const rowsWithLedgers = {
      screen: cells.flatMap((/** @type {any} */ c) => attachLedgers(c.screenRows, c.screenLedgers)),
      noScreen: cells.flatMap((/** @type {any} */ c) => attachLedgers(c.noScreenRows, c.noScreenLedgers)),
    };
    return {
      id: cls.id, cells: cls.cells, screen: cls.screen, noScreen: cls.noScreen, shipped,
      screenCellGates: Object.fromEntries(cells.map((/** @type {any} */ c) => [c.cell, c.screenCellGate])),
      ...result, work: workReport(result.work, rowsWithLedgers),
    };
  });

  const failingResults = manifest.failingCells.map((/** @type {string} */ cell) => {
    const ship = shipOf.get(cell);
    return { cell, class: ship?.class ?? null, shipped: ship?.shipped ?? null, gate: ship === undefined ? noShippedArm(cell) : gateOn('failing', ship.shipped, cell) };
  });
  const controlResults = manifest.controls.map((/** @type {any} */ c) => {
    const ship = shipOf.get(c.cell);
    return { cell: c.cell, class: ship?.class ?? null, shipped: ship?.shipped ?? null, today: c.today, gate: ship === undefined ? noShippedArm(c.cell) : gateOn('control', ship.shipped, c.cell) };
  });
  const masterResults = manifest.masters.map((/** @type {any} */ m) => ({
    cell: m.cell, today: m.today, after: m.after, result: masterIdentity(rowsOf(m.today, m.cell), rowsOf(m.after, m.cell), masterReps),
  }));
  const hell1Results = manifest.hell1.flatMap((/** @type {string} */ cell) => {
    const ship = shipOf.get(cell);
    const arms = ship !== undefined ? [ship.shipped] : manifest.arms.map((/** @type {any} */ a) => a.id).filter((/** @type {string} */ id) => rowsOf(id, cell).length > 0);
    return (arms.length === 0 ? [null] : arms).map((arm) => ({
      cell, class: ship?.class ?? null, arm, report: hell1Report(arm === null ? [] : rowsOf(arm, cell), { reps, quantity }),
    }));
  });
  const p5Results = manifest.p5.map((/** @type {any} */ p) => p5Stops(rowsOf(p.bounded, p.cell), rowsOf(p.uncapped, p.cell), { quantity, cell: p.cell, reps: p.reps }));
  const { arms: projectedArms, reserves, deadlineMs } = manifest.deadlineProjection;
  const projection = projectedArms.flatMap((/** @type {string} */ arm) => reserves.map((/** @type {number} */ reserve) => ({
    arm, reserve, ...deadlineProjection(armRows[arm], { reserve, deadlineMs, quantity }),
  })));
  const populations = Object.fromEntries(manifest.arms.map((/** @type {any} */ a) => [a.id, population(armRows[a.id], { quantity })]));

  const readJson = (/** @type {string} */ path) => {
    const text = io.readText(path);
    return text === null ? null : JSON.parse(text);
  };
  const prereq = prerequisites(manifest.prerequisites, { readJson, readFile: io.readText, currentOf: io.currentOf });
  let phase0 = phase0Verdict({
    purpose,
    classes: classResults.map(({ id, verdict }) => ({ id, verdict })),
    cells: failingResults.map(({ cell, gate }) => ({ cell, verdict: gate.verdict })),
    controls: controlResults.map(({ cell, gate }) => ({ cell, verdict: gate.verdict })),
    masters: masterResults.map(({ cell, result }) => ({ cell, verdict: result.verdict })),
    p5: p5Results,
    prerequisites: prereq,
  });

  const missing = declared.filter((row) => !new Set(published).has(row));
  /** @type {Record<string, any> | null} */
  let selection = null;
  /** @type {Record<string, any> | null} */
  let receipt = null;
  if (selectionReceipt !== null) {
    const sel = selectionReceipt.selection;
    if (!isObject(sel) || !isObject(sel.cells)) {
      throw new Error('verdicts: the selection receipt has no selection.cells');
    }
    const changed = selectionChanges(sel, Object.fromEntries(shipOf));
    phase0 = finalPhase0(phase0, changed);
    selection = { ...manifest.selection, verdict: selectionReceipt.verdict ?? null, changed };
  } else {
    receipt = classSelection(manifest, classResults, {
      files: sorted([...evidence.keys()]).map((path) => ({ path, sha256: /** @type {string} */ (evidence.get(path)) })),
      published, declared, activation, closure, freeze,
      arms: manifest.arms.map((/** @type {any} */ a) => ({ id: a.id, ...read[a.id].tree })),
      harnessHash: io.harnessHash,
    });
    selection = { verdict: receipt.verdict, reasons: receipt.reasons, declared: declared.length, published: published.length, missing: receipt.coverage.missing.length };
  }
  const statuses = (/** @type {IngestedRow[]} */ rows) => Object.fromEntries(STATUSES.map((s) => [s, rows.filter((r) => r.status === s).length]));
  const record = {
    task: manifest.task,
    purpose,
    manifest: { ...manifestRef, value: manifest },
    arms: Object.fromEntries(manifest.arms.map((/** @type {any} */ a) => [a.id, {
      task: a.task, arm: a.arm, variant: a.variant, treeId: a.treeId, tree: read[a.id].tree, files: read[a.id].files,
      rows: armRows[a.id].length, statuses: statuses(armRows[a.id]),
    }])),
    collection: { declared: declared.length, published: published.length, missing, closure },
    classes: classResults,
    failingCells: failingResults,
    controls: controlResults,
    masters: masterResults,
    hell1: hell1Results,
    p5: p5Results,
    prerequisites: prereq,
    selection,
    phase0: { ...phase0, line: phase0Line(phase0, prereq) },
    projection: { label: PROJECTION_LABEL, results: projection },
    population: populations,
  };
  return { record, receipt };
}

/** @param {unknown} v @returns {string} A table cell: no pipe, no line break. */
const cellText = (v) => (v === null || v === undefined || v === '' ? '-' : String(v).replaceAll('|', '\\|').replace(/\s+/g, ' '));

/** @param {unknown} v @returns {string} A number as the reports show it; a missing one is `-`, an infinite one `unbounded`. */
const numText = (v) => (v === null || v === undefined ? '-' : typeof v !== 'number' ? cellText(v) : Number.isFinite(v) ? String(Math.round(v * 10000) / 10000) : 'unbounded');

/** @param {string[]} head @param {unknown[][]} body @returns {string[]} A Markdown table. */
const table = (head, body) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...body.map((r) => `| ${r.map(cellText).join(' | ')} |`), ''];

/** The most problems of a class the report lists; the record holds all of them. */
const LISTED_PROBLEMS = 12;

/**
 * The report `verdicts.md` of a verdict record (V4-T09e step 3): one section per class (the verdict and its deciding
 * condition, the clue and faster numbers, the completion, the cell gates and the work table of IG-P-Q37), then the cells on
 * their shipped arm, the controls, Master identity, Hell 1 (a report), P5's stops, the prerequisites with their reasons,
 * the phase-0 line, and under its own heading the post-hoc projection.
 * @param {Record<string, any>} record `verdictRecords`' record (with its `meta`, for the banner).
 * @param {string} bannerText The banner of the record's meta block.
 * @returns {string}
 */
export function renderVerdicts(record, bannerText) {
  const lines = [
    `# Verdicts ${record.task} (V4-T09e)`, '', bannerText, '',
    `Purpose \`${record.purpose}\`. Manifest \`${record.manifest.path}\` (sha256 ${record.manifest.sha256}). `
    + `Declared rows ${record.collection.declared}, published ${record.collection.published}, missing ${record.collection.missing.length}.`, '',
  ];
  lines.push('## Records read', '', ...table(['Arm', 'File', 'Rows', 'Problems'], Object.entries(record.arms).flatMap(([id, arm]) => (arm.files.length === 0
    ? [[id, '(no runs file)', 0, '-']]
    : arm.files.map((/** @type {any} */ f) => [id, f.path, f.rows, f.problems.length === 0 ? '-' : f.problems.join(', ')])))));
  for (const cls of record.classes) {
    lines.push(`## Class ${cls.id}`, '',
      `Verdict **${cls.verdict}**, decided by ${cls.decidedBy ?? 'none'}. Cells ${cls.cells.join(', ')}. Screen arm \`${cls.screen}\`, no-screen arm \`${cls.noScreen}\`; the class ships \`${cls.shipped}\`.`, '',
      `- Clue rule: ${cls.clue.n} matched sets, median difference ${numText(cls.clue.medianDiff)}, ${cls.clue.moved2} moved by two clues or more: ${cls.clue.pass ? 'pass' : 'fail'}.`,
      cls.faster === null
        ? '- Faster rule: not computed, a pairing problem leaves a rep without a ratio.'
        : `- Faster rule: geometric mean ${numText(cls.faster.geoMean)}, lower bound ${numText(cls.faster.lower)}: ${cls.faster.pass ? 'pass' : 'fail'}.`,
      ...Object.entries(cls.completion).map(([cell, c]) => `- Completion of ${cell} (valid requests that reach ten): screen ${/** @type {any} */ (c).screen}, no screen ${/** @type {any} */ (c).noScreen}.`),
      ...Object.entries(cls.screenCellGates).map(([cell, gate]) => `- Cell gate of ${cell} on the screen arm: ${gate}.`),
      '', `Work (IG-P-Q37; the intervals are reported, the work rule judges them): **${cls.work.verdict}**.`, '',
      ...table(['Arm', 'Rows', 'Accepted', 'loRatio', 'hiRatio', 'Width', 'completedRatio', 'Terminated calls', 'Open primitives', 'Complete'],
        [['screen', cls.screen, cls.work.screen], ['no screen', cls.noScreen, cls.work.noScreen]].map(([label, id, w]) => [
          `${label} ${id}`, w.rows, w.accepted, numText(w.loRatio), numText(w.hiRatio), numText(w.width), numText(w.completedRatio), w.terminatedCalls, w.open, w.complete,
        ])));
    if (cls.problems.length > 0) {
      lines.push(`Problems (${Math.min(LISTED_PROBLEMS, cls.problems.length)} of ${cls.problems.length}):`, '',
        ...cls.problems.slice(0, LISTED_PROBLEMS).map((/** @type {string} */ p) => `- ${p}`), '');
    }
  }
  const gateRow = (/** @type {any} */ g) => [g.verdict, numText(g.reachedTen), numText(g.deadEnds), numText(g.deadlineViolations), numText(g.p95Ms), g.reasons.join('; ')];
  lines.push('## Failing Nightmare cells on the arm each ships', '',
    ...table(['Cell', 'Class', 'Shipped arm', 'Gate', 'Reached ten', 'Dead ends', 'Deadline violations', 'p95 ms', 'Reasons'],
      record.failingCells.map((/** @type {any} */ c) => [c.cell, c.class, c.shipped, ...gateRow(c.gate)])));
  lines.push('## Controls', '',
    ...table(['Cell', 'Class', 'Shipped arm', 'Today\'s arm', 'Gate', 'Reached ten', 'Dead ends', 'Deadline violations', 'p95 ms', 'Geometric mean', 'Lower bound', 'Reasons'],
      record.controls.map((/** @type {any} */ c) => [c.cell, c.class, c.shipped, c.today, ...gateRow(c.gate).slice(0, 5), numText(c.gate.noRegression?.geoMean), numText(c.gate.noRegression?.lower), c.gate.reasons.join('; ')])));
  lines.push('## Master identity', '',
    ...table(['Cell', 'Today\'s arm', 'After arm', 'Verdict', 'Differences', 'Problems'],
      record.masters.map((/** @type {any} */ m) => [m.cell, m.today, m.after, m.result.verdict, m.result.differences.map((/** @type {any} */ d) => `rep ${d.rep}: ${d.field}`).join('; '), m.result.problems.join('; ')])));
  lines.push('## Hell 1 (a report, never a gate)', '',
    ...table(['Cell', 'Class', 'Arm', 'Requests', 'Valid', 'Reached ten', 'Candidate (18 of 20)'],
      record.hell1.map((/** @type {any} */ h) => [h.cell, h.class, h.arm, h.report.requests, h.report.valid, h.report.reachedTen, h.report.candidate])));
  lines.push('## P5\'s stops over the declared pairs', '',
    ...table(['Cell', 'Declared', 'Pairs', 'False stops', 'Lost completions', 'Unknown', 'Unexpected rows'],
      record.p5.map((/** @type {any} */ p) => [p.cell, p.declared, p.pairs, p.falseStops, p.lostCompletions, p.unknown, p.unexpected.length])));
  lines.push('## Prerequisites', '',
    ...table(['Prerequisite', 'Status', 'Reasons'], Object.entries(record.prerequisites).map(([name, p]) => [name, /** @type {any} */ (p).status, /** @type {any} */ (p).reasons.join('; ')])));
  lines.push('## Selection', '',
    record.purpose === 'selection'
      ? `Class-selection receipt: ${record.selection.verdict}${record.selection.reasons.length > 0 ? ` (${record.selection.reasons.slice(0, LISTED_PROBLEMS).join('; ')})` : ''}.`
      : `Selection receipt \`${record.selection.path}\` (sha256 ${record.selection.sha256}, verdict ${record.selection.verdict}); cells changed since: ${record.selection.changed.length === 0 ? 'none' : record.selection.changed.join(', ')}.`,
    '', '## Phase 0', '', record.phase0.line, '',
    `## ${record.projection.label.charAt(0).toUpperCase()}${record.projection.label.slice(1)}`, '',
    'An estimate of the accepted prefixes of recorded runs; it proves neither the cancellation of dispatched work, nor the response assembly, nor the 120-s bound, and no gate reads it (D-V4-08).', '',
    ...table(['Arm', 'Reserve', 'Projected', 'Not linked', 'Invalid timeline', 'Set cut', 'Completed', 'Lost', 'Skipped (not valid)'],
      record.projection.results.map((/** @type {any} */ p) => {
        const count = (/** @type {(r: any) => boolean} */ keep) => p.rows.filter(keep).length;
        return [p.arm, p.reserve, count((r) => r.status === 'projected'), count((r) => r.status === 'not-linked'), count((r) => r.status === 'invalid-timeline'),
          count((r) => r.setCut === true), count((r) => r.completed === true), count((r) => r.lost === true), p.skipped];
      })));
  return lines.join('\n');
}

/** @param {string} message @returns {number} 1, after the message on stderr. */
function refuse(message) {
  process.stderr.write(`verdicts: ${message}\n`);
  return 1;
}

/**
 * @param {string} folder Repository-relative.
 * @returns {string[]} The files below it at any depth, repository-relative with `/`, in name order; none when absent.
 */
function walkRepo(folder) {
  /** @type {string[]} */
  const out = [];
  /** @param {string} dir */
  const visit = (dir) => {
    for (const entry of readdirSync(abs(dir), { withFileTypes: true })) {
      if (entry.isDirectory()) {
        visit(`${dir}/${entry.name}`);
      } else if (entry.isFile()) {
        out.push(`${dir}/${entry.name}`);
      }
    }
  };
  if (existsSync(abs(folder))) {
    visit(folder);
  }
  return sorted(out);
}

/**
 * Today's tree of every arm a prerequisite compares, for the bindings that exist (an absent binding is `incomplete`
 * before any tree is asked for).
 * @param {any} declared The manifest's `prerequisites`.
 * @param {string | undefined} sourceLabel
 * @returns {Promise<(id: string) => { treeId: string, paramsHash: string }>}
 */
async function currentTrees(declared, sourceLabel) {
  const refs = [declared.stage1, declared.liveDeadline, ...(Array.isArray(declared.parity) ? declared.parity : [])];
  /** @type {Map<string, { treeId: string, paramsHash: string } | Error>} */
  const table = new Map();
  for (const ref of refs) {
    if (!isObject(ref) || typeof ref.binding !== 'string' || !Array.isArray(ref.current) || !existsSync(abs(ref.binding))) {
      continue;
    }
    for (const id of ref.current) {
      if (typeof id === 'string' && !table.has(id)) {
        try {
          const tree = await ensureTree(id, { sourceLabel });
          table.set(id, { treeId: tree.treeId, paramsHash: sha256(JSON.stringify(tree.params)) });
        } catch (e) {
          table.set(id, e instanceof Error ? e : new Error(String(e)));
        }
      }
    }
  }
  return (id) => {
    const found = table.get(id);
    if (found === undefined || found instanceof Error) {
      throw new Error(found === undefined ? `no current tree of ${id}` : `${id}: ${found.message}`);
    }
    return found;
  };
}

/**
 * `node tools\ig-proto\verdicts.mjs --manifest <path> --label frozen --source-label <SL>` (V4-T09e): reads the verdict
 * manifest and the records it names, and writes `verdicts.json` and `verdicts.md` under `evidence/frozen/<task>/` and,
 * for the purpose `selection`, `class-selection.json`. An interim record of the task is replaced (a selection that is
 * `incomplete` is superseded once the collection is closed, a phase 0 that is `incomplete` once a prerequisite is
 * accepted); a decided one is never overwritten (`decidedRecord`: the run is refused, exit 1, nothing written).
 * @param {string[]} argv
 * @returns {Promise<number>} 0 when the records are written (whatever the verdicts); 1 for a refused manifest or command.
 */
export async function main(argv) {
  const { args } = parseArgs(argv, { values: ['manifest', 'label', 'source-label'] });
  if (args.label !== 'frozen') {
    return refuse('--label frozen only');
  }
  if (args.manifest === undefined) {
    return refuse('--manifest is required');
  }
  const file = resolve(ROOT, args.manifest);
  if (!existsSync(file)) {
    return refuse(`no manifest ${args.manifest}`);
  }
  const text = readFileSync(file, 'utf8');
  /** @type {any} */
  let manifest;
  try {
    manifest = JSON.parse(text);
  } catch {
    return refuse(`${args.manifest} is not JSON`);
  }
  try {
    needManifest(manifest);
    const out = (/** @type {string} */ name) => evidenceDir('frozen', manifest.task, name);
    // Only the record the purpose could overwrite is read; one that is not JSON is refused, never replaced.
    const guarded = out(manifest.purpose === 'selection' ? 'class-selection.json' : 'verdicts.json');
    /** @type {any} */
    let existing = null;
    if (existsSync(guarded)) {
      try {
        existing = JSON.parse(readFileSync(guarded, 'utf8'));
      } catch {
        return refuse(`an unreadable record exists: ${rel(guarded)}`);
      }
    }
    const decided = decidedRecord(manifest.purpose, manifest.purpose === 'selection' ? { selection: existing, verdicts: null } : { selection: null, verdicts: existing });
    if (decided !== null) {
      return refuse(`${decided}: ${rel(guarded)}`);
    }
    const currentOf = await currentTrees(manifest.prerequisites, args['source-label']);
    const { record, receipt } = verdictRecords(manifest, {
      readText: (path) => (existsSync(abs(path)) ? readFileSync(abs(path), 'utf8') : null),
      list: walkRepo,
      harnessHash: harnessInfo().harnessHash,
      currentOf,
    }, { path: rel(file), sha256: sha256Text(text) });
    const meta = await buildMeta({ task: manifest.task, label: 'frozen', kind: 'verdicts', trees: [], sourceLabel: args['source-label'] });
    const full = { meta, ...record };
    writeJson(out('verdicts.json'), full);
    writeText(out('verdicts.md'), renderVerdicts(full, banner(meta)));
    if (receipt !== null) {
      writeJson(out('class-selection.json'), receipt);
    }
    for (const cls of record.classes) {
      process.stdout.write(`class ${cls.id}: ${cls.verdict} (${cls.decidedBy ?? 'none'}), ships ${cls.shipped}\n`);
    }
    process.stdout.write(`${record.phase0.line}\n`);
    for (const name of ['verdicts.json', 'verdicts.md', ...(receipt === null ? [] : ['class-selection.json'])]) {
      process.stdout.write(`verdicts: wrote ${rel(out(name))}\n`);
    }
    return 0;
  } catch (e) {
    return refuse(e instanceof Error ? e.message.replace(/^verdicts: /, '') : String(e));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
