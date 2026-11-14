// @ts-check
// ig-proto, variant "log": a durable per-probe journal of today's clue search. This file exists only in a tree
// copy (tests/artifacts/ig-proto/tree/<variant>/core/engine/); no production file imports it. Without IG_LOG_DIR
// it writes nothing. Every event is one JSON line appended at once (open, append, close), so it survives the
// termination of the worker or the process that wrote it.
import { appendFileSync } from 'node:fs';
import { threadId } from 'node:worker_threads';

import { activeCount, boardToRows } from './board.js';
import { igTake } from './deduce.js';
import { IncompleteRatingError, rate, UnsatisfiableError } from './difficulty.js';
import { IG } from './ig-params.js';
import { bandEdge, initialClueCount } from './levels.js';

/**
 * @typedef {object} Call
 * @property {string} id `<row>:<pid>:<threadId>:<sequence>`
 * @property {string} phase Current phase: p1, p2, beam (the prototype adds its own).
 * @property {number} i Probes recorded so far.
 * @property {number} work Main plus census work of the recorded probes.
 * @property {number} rerates Canonical re-ratings (the prototype sets it).
 * @property {number | null} W Screen limit of the call (the prototype; null: canonical).
 * @property {number | null} priorCount Prior start count of the call (the prototype; null without a prior).
 * @property {object} [locate] Summary of the prototype's locate phase, written on the `end` line.
 * @property {number} t0
 * @property {boolean} logging
 * @property {any} ctx
 */

let sequence = 0;
/** @type {Call | null} */
let current = null;

const now = () => performance.timeOrigin + performance.now();
const round3 = (/** @type {number} */ x) => Math.round(x * 1000) / 1000;

/** @param {object} line */
function write(line) {
  const dir = process.env.IG_LOG_DIR;
  if (dir === undefined) {
    return;
  }
  const row = process.env.IG_ROW ?? 'unrowed';
  appendFileSync(`${dir}/${row}.${process.pid}.${threadId}.jsonl`, `${JSON.stringify(line)}\n`);
}

/**
 * Opens a call: one `start` line.
 * @param {any} ctx The SelectContext, plus `igStage` and `igAttempt` set by the caller.
 * @param {{ W?: number | null, priorCount?: number | null }} [extra] The prototype's screen limit and prior count.
 * @returns {Call}
 */
export function startCall(ctx, extra = {}) {
  sequence += 1;
  const row = process.env.IG_ROW ?? 'unrowed';
  /** @type {Call} */
  const call = {
    id: `${row}:${process.pid}:${threadId}:${sequence}`,
    phase: 'p1',
    i: 0,
    work: 0,
    rerates: 0,
    W: extra.W ?? null,
    priorCount: extra.priorCount ?? null,
    t0: performance.now(),
    logging: process.env.IG_LOG_DIR !== undefined,
    ctx,
  };
  current = call;
  if (call.logging) {
    const K = ctx.pieces.length;
    write({
      t: 'start', call: call.id, v: 1, variant: IG.variant, row, stage: ctx.igStage ?? 'other', attempt: ctx.igAttempt ?? null,
      level: ctx.target.id ?? null, min: ctx.target.min, max: ctx.target.max, K, A: activeCount(ctx.board),
      startCount: initialClueCount(ctx.target.share, K), priorCount: call.priorCount, W: call.W, at: now(),
    });
  }
  return call;
}

/** @param {string} name Enters a phase of the current call; a `phase` line follows whether or not a rating does. */
export function igPhase(name) {
  const call = current;
  if (call === null) {
    return;
  }
  call.phase = name;
  if (call.logging) {
    write({ t: 'phase', call: call.id, phase: name, at: now() });
  }
}

/**
 * @param {{ min: number, max: number }} target
 * @param {number} score
 * @returns {'below' | 'above' | 'central' | 'in'}
 */
function sideOf(target, score) {
  if (score < target.min) {
    return 'below';
  }
  if (score >= target.max) {
    return 'above';
  }
  if (!Number.isFinite(target.max)) {
    return 'central';
  }
  const centre = (target.min + target.max) / 2;
  return Math.abs(score - centre) <= (target.max - target.min) / 4 ? 'central' : 'in';
}

/**
 * Runs one rating attempt and journals its tuple; returns the rating or rethrows the error unchanged.
 * @template T
 * @param {Call} call
 * @param {string} phase
 * @param {number} count Clues of the subset.
 * @param {() => T} fn
 * @param {number | null} W Screen limit of the attempt (null: canonical).
 * @returns {T}
 */
export function recordRating(call, phase, count, fn, W) {
  if (!call.logging) {
    return fn();
  }
  igTake();
  const t0 = performance.now();
  /** @type {any} */
  let rating = null;
  /** @type {any} */
  let error = null;
  try {
    rating = fn();
  } catch (e) {
    error = e;
  }
  const ms = round3(performance.now() - t0);
  const ins = igTake();
  const { target } = call.ctx;
  /** @type {string} */
  let outcome;
  let score = null;
  let mainWork = 0;
  let censusWork = 0;
  let nodes = 0;
  let censusNodes = 0;
  /** @type {string | null} */
  let stop = null;
  let flags = '';
  if (error === null) {
    const m = rating.metrics;
    score = rating.score;
    censusWork = m.censusWork;
    mainWork = m.work - m.censusWork;
    nodes = m.nodes;
    censusNodes = m.censusNodes;
    stop = m.searchStop;
    if (rating.censored === true) {
      flags += 'e';
    }
    const refused = target.min >= bandEdge(3) && m.Gproved === 0;
    if (refused) {
      flags += 'r';
    }
    if ((ins?.r7CutCensus ?? 0) > 0) {
      flags += 'c';
    }
    outcome = refused ? 'ar1' : sideOf(target, score);
    if (W !== null && mainWork > W) {
      outcome = stop === 'work-cap' ? 'scap1' : 'over';
    }
  } else if (error instanceof IncompleteRatingError) {
    outcome = W !== null ? 'scap0' : 'capped';
    mainWork = error.counters.work;
    nodes = error.counters.nodes;
    stop = error.counters.stop;
  } else if (error instanceof UnsatisfiableError) {
    outcome = 'unsat';
  } else {
    outcome = 'error';
  }
  call.work += mainWork + censusWork;
  write({
    t: 'p', call: call.id, i: call.i,
    tuple: [phase, count, outcome, score, mainWork, censusWork, ins?.workFirst ?? null, ins?.nodesFirst ?? null, nodes,
      censusNodes, stop, ins?.r7Cut ?? null, ms, flags],
  });
  call.i += 1;
  if (error !== null) {
    throw error;
  }
  return rating;
}

/**
 * Closes a call: one `end` line. `res` is a SelectResult, an Error, or `{ ok: false, result: <name> }` for a result
 * the search itself does not have (the prototype's `no-window`).
 * @param {Call} call
 * @param {any} res
 */
export function endCall(call, res) {
  if (current === call) {
    current = null;
  }
  if (!call.logging) {
    return;
  }
  /** @type {string} */
  let result;
  let score = null;
  let clueCount = null;
  let accepted = null;
  if (res instanceof Error) {
    result = 'error';
  } else if (res.ok === true) {
    result = 'ok';
    score = res.rating.score;
    clueCount = res.clues.length;
    if (IG.logAccepted === true) {
      accepted = { boardRows: boardToRows(call.ctx.board), pieces: call.ctx.pieces, clues: res.clues, rating: res.rating };
    }
  } else {
    result = res.result ?? res.reason;
  }
  write({
    t: 'end', call: call.id, result, score, clueCount, ms: round3(performance.now() - call.t0), work: call.work,
    profiles: call.i, rerates: call.rerates, accepted, ...(call.locate === undefined ? {} : { locate: call.locate }), at: now(),
  });
}

/**
 * Today's search, journaled: `v3` is the unchanged search function of the copy.
 * @param {any} ctx
 * @param {(ctx: any) => any} v3
 * @returns {any}
 */
export function igDispatch(ctx, v3) {
  const call = startCall(ctx);
  igPhase('p1');
  const seam = (/** @type {any} */ b, /** @type {any} */ p, /** @type {any} */ c, /** @type {any} */ ws) => recordRating(
    call, call.phase, c.length, () => (ctx.rate ?? rate)(b, p, c, ws), null);
  let res;
  try {
    res = v3({ ...ctx, rate: seam });
  } catch (e) {
    endCall(call, e);
    throw e;
  }
  endCall(call, res);
  return res;
}
