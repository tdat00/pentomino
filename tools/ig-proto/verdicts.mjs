// @ts-check
// Admission statistics of plan section 5.2, row level (V4-T09a; reviews R12, RV2-06, RV2-18, RV3-08): which published
// rows are valid measurements, completion and the capped T10 kept apart from the deadline (D-V4-16), and the
// per-puzzle evidence (puzzle keys, clue counts) that every comparison needs before it may compare anything. Missing,
// invalid, censored or erroneous data is incomplete evidence, never a pass; an invalid puzzle or pack is a
// correctness failure. Pure functions of published rows. V4-T09b to V4-T09e add the pairing and the class
// statistics, the work ledger and the class verdict, the global verdicts and the verdict tool to this file; the
// manifest the tool reads is described in data/verdict-manifest.schema.md.
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

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
 * @returns {boolean} Whether the request holds ten puzzles, whatever its time (D-V4-16).
 */
export function reachedTen(run, { quantity }) {
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
