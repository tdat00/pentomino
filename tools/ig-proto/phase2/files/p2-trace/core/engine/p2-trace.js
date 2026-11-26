// @ts-check
// The copies' trace layer (P2-12d; contracts.md C1): every selection call, every rating and every uniqueness count
// inside it is journaled in the format of the frozen work ledger (`rowLedger` of tools/ig-proto/verdicts.mjs). A
// primitive's proved upper bound is written before it starts and its units when it ends, so a killed worker's row
// still has an interval. This file exists only in a copy; no production file imports it. Without IG_LOG_DIR it writes
// nothing and every function only runs its callback. It observes only: it changes no result.
import { appendFileSync } from 'node:fs';
import { threadId } from 'node:worker_threads';

import { activeCount } from './board.js';
import { DEDUCE } from './policy.js';

/**
 * @typedef {object} TraceCall
 * @property {string} id `<row>:<pid>:<threadId>:<sequence>`
 * @property {number} work Main plus census units of the rated primitives.
 * @property {number} profiles Rated primitives so far.
 * @property {number} countWork Row trials of the uniqueness counts.
 * @property {boolean} pending A rating is running (a nested rating is not journaled).
 */

let sequence = 0;
/** @type {TraceCall | null} */
let current = null;
/** The destination files that have their worker header. */
const headed = new Set();

const now = () => performance.timeOrigin + performance.now();

/** @returns {string | null} The destination of the current IG_LOG_DIR and IG_ROW, `null` without IG_LOG_DIR. */
function destination() {
  const dir = process.env.IG_LOG_DIR;
  return dir === undefined ? null : `${dir}/${process.env.IG_ROW ?? 'unrowed'}.${process.pid}.${threadId}.jsonl`;
}

/** Ensures the worker header of the current destination (review-2 R2-02): once per destination, before its first other line. */
function ensureHeader() {
  const file = destination();
  if (file === null || headed.has(file)) {
    return;
  }
  headed.add(file);
  appendFileSync(file, `${JSON.stringify({ t: 'worker', pid: process.pid, threadId, at: now() })}\n`);
}

/** @param {object} line */
function write(line) {
  const file = destination();
  if (file === null) {
    return;
  }
  ensureHeader();
  appendFileSync(file, `${JSON.stringify(line)}\n`);
}

ensureHeader();

/**
 * Runs one selection call (the dispatcher `selectClues`), journaling its `start`, `caps` and `end` lines.
 * @template T
 * @param {any} ctx The SelectContext, plus `igStage` and `igAttempt` set by the caller.
 * @param {() => T} run
 * @returns {T}
 */
export function p2TraceCall(ctx, run) {
  if (process.env.IG_LOG_DIR === undefined) {
    return run();
  }
  sequence += 1;
  /** @type {TraceCall} */
  const call = {
    id: `${process.env.IG_ROW ?? 'unrowed'}:${process.pid}:${threadId}:${sequence}`,
    work: 0,
    profiles: 0,
    countWork: 0,
    pending: false,
  };
  write({
    t: 'start', call: call.id, stage: ctx.igStage ?? 'other', attempt: ctx.igAttempt ?? null, level: ctx.target?.id ?? null,
    A: activeCount(ctx.board), at: now(),
  });
  write({ t: 'caps', call: call.id, count: true });
  const previous = current;
  current = call;
  try {
    /** @type {any} */
    let res;
    try {
      res = run();
    } catch (e) {
      write({
        t: 'end', call: call.id, result: 'error', work: call.work, profiles: call.profiles, locate: { countWork: call.countWork },
        igNoWindow: null, budgetStop: false, clueCount: null, at: now(),
      });
      throw e;
    }
    write({
      t: 'end', call: call.id, result: res.ok === true ? 'ok' : String(res.reason), work: call.work, profiles: call.profiles,
      locate: { countWork: call.countWork }, igNoWindow: res.igNoWindow ?? null, budgetStop: (res.counters?.budgetStops ?? 0) > 0,
      clueCount: res.ok === true ? res.clues.length : null, at: now(),
    });
    return res;
  } finally {
    current = previous;
  }
}

/**
 * Runs one rating, journaling its `begin` (with the proved bound) and its `p` line.
 * @template T
 * @param {{ width: number, height: number }} board
 * @param {{ id: string, cells: unknown[] }[]} pieces
 * @param {{ piece: string }[]} clues
 * @param {number} work The main-work limit of the rating.
 * @param {() => T} run The rating, or `{ rating, detail }`.
 * @param {new (...args: any[]) => Error} Capped The `IncompleteRatingError` class.
 * @returns {T}
 */
export function p2TraceRating(board, pieces, clues, work, run, Capped) {
  const call = current;
  if (call === null || call.pending) {
    return run();
  }
  write({
    t: 'begin', call: call.id, kind: work < DEDUCE.work ? 'screen' : 'rate', bound: ratingBound(board, pieces, clues, { ...DEDUCE, work }),
  });
  call.pending = true;
  let outcome = 'rated';
  /** @type {number | null} */
  let score = null;
  let mainWork = 0;
  let censusWork = 0;
  try {
    /** @type {any} */
    let result;
    try {
      result = run();
      const rating = result.rating ?? result;
      score = rating.score;
      censusWork = rating.metrics.censusWork;
      mainWork = rating.metrics.work - censusWork;
    } catch (e) {
      if (e instanceof Capped) {
        outcome = 'capped';
        mainWork = /** @type {any} */ (e).counters.work;
      } else {
        outcome = 'error';
      }
      throw e;
    } finally {
      write({ t: 'p', call: call.id, i: call.profiles, tuple: ['call', clues.length, outcome, score, mainWork, censusWork] });
      call.profiles += 1;
      call.work += mainWork + censusWork;
    }
    return result;
  } finally {
    call.pending = false;
  }
}

/**
 * Runs one uniqueness count, journaling its `begin` (the row limit) and its `count` line. A throw leaves the primitive
 * open: `rowLedger` reports it.
 * @template {{ rowTrials: number }} T
 * @param {number} rowLimit
 * @param {() => T} run
 * @returns {T}
 */
export function p2TraceCount(rowLimit, run) {
  const call = current;
  if (call === null) {
    return run();
  }
  write({ t: 'begin', call: call.id, kind: 'count', bound: rowLimit });
  const result = run();
  write({ t: 'count', call: call.id, units: result.rowTrials });
  call.countWork += result.rowTrials;
  return result;
}

/** @param {string} name The phase entered; only `'p2'` (a dead end) is written by the layer. */
export function p2TracePhase(name) {
  if (current !== null) {
    write({ t: 'phase', call: current.id, phase: name, at: now() });
  }
}

/** @param {string} phase `'close'`, `'rescue'` or `'rerate'`: a re-rating starts. */
export function p2TraceRerate(phase) {
  if (current !== null) {
    write({ t: 'rerate', call: current.id, phase, at: now() });
  }
}

/**
 * A proved upper bound of the units one rating can charge (IG-P-Q37; derivation in task T02d, R9 as corrected in
 * review 4): the setup, the work and census limits, and twice the largest stretch between two limit checks of
 * deduce.js plus a full undo, from upper bounds of the model's sizes that need no enumeration.
 * @param {{ width: number, height: number }} board
 * @param {{ id: string, cells: unknown[] }[]} pieces
 * @param {{ piece: string }[]} clues
 * @param {{ work: number, census: number }} limits
 * @returns {number}
 */
export function ratingBound(board, pieces, clues, limits) {
  const clued = new Set(clues.map((c) => c.piece));
  const free = pieces.filter((p) => !clued.has(p.id)).map((p) => p.cells.length);
  const cluedCells = pieces.filter((p) => clued.has(p.id)).reduce((s, p) => s + p.cells.length, 0);
  const A = board.width * board.height;
  const NC = activeCount(board) - cluedCells;
  const NP = free.length;
  const Tsz = free.reduce((s, n) => s + n, 0);
  const L = Math.max(0, ...free) + 1;
  const C = NC + NP;
  const R = 8 * NP * NC;
  const NZ = 8 * NC * (Tsz + NP);
  const K = 8 * Math.max(Tsz, NC);
  const sel = L + 2 * NZ;
  const U = R + C + NZ;
  const P = sel + U + (C + K + sel) + ((NC + 1) * (NP + 1) + NC) + (NZ + sel) + (R + 4 * NZ + NP * L + L * K)
    + (3 * NZ + R + (L - 1) * (R + NZ)) + (3 * NZ + sel + U)
    + (NC + 2 * NC * (R + NP) + 2 * R + NZ + 2 * NP + (NP + 1) * (NC + 1) * (2 * Tsz + 1))
    + (9 * NC + NP + NZ * (2 + 2 * NC + L) + NP * NP + NP * (NC + 1) * (NP + 1) + NZ)
    + (3 * NZ + (NC * NC) / 2 + 3 * ((NC * NC) / 2) * K * L) + (C + K);
  const setup = 3 * NZ + R + C + A + 2 * NC + NP;
  return Math.ceil(setup + limits.work + limits.census + 2 * (P + U));
}
