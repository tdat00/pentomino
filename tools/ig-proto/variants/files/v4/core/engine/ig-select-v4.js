// @ts-check
// ig-proto, variant v4 (task V4-T02a of the pack improve-generating-v4): the gen-v4 prototype as a fork of the frozen
// `selectClues` (core/engine/clues.js at 3fc65f4). This file exists only in a tree copy
// (tests/artifacts/ig-proto/tree-frozen/<variant>/core/engine/); no production file imports it. It runs on Node only
// (ig-log.js imports node:fs too). Plan §3 P1 to P4 and the decisions D-V4-03 to D-V4-06 are added where the plan puts
// them; everything else is the frozen search, so its contracts stay:
//   P1  the clue count is located by sequential bracketing on one nested family of subsets (phase A), with the
//       rescue by canonical re-rating of the screen-capped locate probes (`rerateMax`);
//   P2  every probe is rated under a lowered main-work limit W (the screen); a run whose main-phase work is at most W
//       is the canonical rating, a run above it is screen-capped, steers only and is never accepted;
//   P3  a screen-capped profile reads as "too few clues", a sided result;
//   P4  the start count comes from the table prior (IG.prior), else from K - U0 (`step0` is 1 with a prior, U0 without);
//   P5  (V4-T07a) the call ends when its work budget (IG.callBudget, or the seam ctx.igBudget) is spent: checked before
//       every rating and every uniqueness count, it returns the best already finished result or `not-in-band`.
// Kept from the frozen search: `SelectContext` and `SelectResult`, the `record` events with their `detail` from the
// same measurement, one `charge` per rating attempt and per repair count (before the event), `replaySkips` and
// `SkipReplayError`, `conclude`, the repairs and the centre rule. The copy's `selectClues` sends only Nightmare and
// Hell 1 targets here (`v4Target`).
import { appendFileSync } from 'node:fs';
import { threadId } from 'node:worker_threads';

import { activeCount } from './board.js';
import { countRowLimit, makeUnique, SkipReplayError } from './clues.js';
import { igRateDetailedWithLimits, IncompleteRatingError, inBand, measureV3, MODEL, rate, rateDetailed, scoreV3 } from './difficulty.js';
import { IG } from './ig-params.js';
import { endCall, igPhase, recordRating, startCall, withP6 } from './ig-log.js';
import { clueKey } from './keys.js';
import { bandEdge, levelForScore } from './levels.js';
import { BUDGETS, DEDUCE, SCORE } from './policy.js';
import { isValidLayout } from './tiling.js';

/** @typedef {import('./types.js').Board} Board */
/** @typedef {import('./types.js').Piece} Piece */
/** @typedef {import('./types.js').Pose} Pose */
/** @typedef {import('./types.js').Rating} Rating */
/** @typedef {import('./types.js').RatingDetail} RatingDetail */
/** @typedef {import('./types.js').ClueEvent} ClueEvent */
/** @typedef {import('./workspace.js').Workspace} Workspace */
/** @typedef {import('./clues.js').SelectContext} SelectContext */
/** @typedef {import('./clues.js').SelectResult} SelectResult */
/** @typedef {import('./clues.js').Candidate} Candidate */
/** @typedef {import('./clues.js').Finished} Finished */
/** @typedef {import('./clues.js').Selected} Selected */

// clues.js:77-85, without SMALL_AREA.
const BEAM_WIDTH = 4;
const STALL_LIMIT = 12;
const SAMPLES_PER_COUNT = 4;
const COUNT_CHANGES = 8;
const MOVES_PER_MEMBER = 8;
const CENTRE_RESERVE = 16;

/**
 * Exclusive upper bounds of one call's skip ordinals (D-V4-04): the frozen 2,128 subset ordinals plus 64 for the
 * locate (at most 56 with the (c4) probe of T08, every ordinal is below 2,184). Literals, because `clues.js` and this
 * module import each other.
 */
export const SKIP_BOUNDS_V4 = Object.freeze({ subsets: 2192, repairs: 64 });

/** A final result found inside a nested helper: it unwinds to `searchV4`, which concludes the call with it. */
class Final {
  /** @param {any} res */
  constructor(res) {
    this.res = res;
  }
}

/** The end of a call whose work budget is spent (P5, R10): it unwinds to `searchV4`, which ends the call. */
class BudgetStop {}

/**
 * The work budget of a selection call in units (P5): the table's value for the target's level, else its `default`;
 * infinite (never stops) without a table or a positive number.
 * @param {any} table `IG.callBudget`: `{ <level id>: units, default: units }`.
 * @param {{ id?: string }} target
 * @returns {number}
 */
export function callBudgetOf(table, target) {
  if (table === undefined || table === null) {
    return Infinity;
  }
  const v = table[/** @type {string} */ (target.id)] ?? table.default;
  return typeof v === 'number' && v > 0 ? v : Infinity;
}

/** @param {number} x @param {number} lo @param {number} hi @returns {number} */
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

/**
 * clues.js:217-227
 * @param {Pick<import('./levels.js').Level, 'min' | 'max'>} target
 * @param {Rating} r
 * @returns {number} 0 inside the band, else the distance to the nearest in-band score.
 */
function bandDistance(target, r) {
  if (r.score < target.min) {
    return target.min - r.score;
  }
  return r.score >= target.max ? r.score - target.max + 1 : 0;
}

/**
 * clues.js:229-239
 * @param {Pick<import('./levels.js').Level, 'min' | 'max'>} target
 * @param {Candidate[]} list
 * @returns {Candidate[]}
 */
function ranked(target, list) {
  const center = (target.min + target.max) / 2;
  return list.slice().sort((a, b) => bandDistance(target, a.rating) - bandDistance(target, b.rating)
    || Math.abs(a.rating.score - center) - Math.abs(b.rating.score - center)
    || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

/**
 * clues.js:241-249
 * @param {Rating} r
 * @returns {boolean} true when the rating reports no proved decisive guess (`metrics.Gproved === 0`).
 */
function noProvedGuess(r) {
  const m = /** @type {unknown} */ (r.metrics);
  return typeof m === 'object' && m !== null && Object.hasOwn(m, 'Gproved')
    && /** @type {{ Gproved?: unknown }} */ (m).Gproved === 0;
}

/**
 * clues.js:775-784: clues in layout order.
 * @param {Pose[]} layout
 * @param {Pose[]} clues
 * @returns {Pose[]}
 */
function sortLike(layout, clues) {
  const wanted = new Set(clues.map((c) => c.piece));
  return layout.filter((p) => wanted.has(p.piece));
}

/**
 * The order of a canonical re-rating (IG-P-Q01): by the distance of the count to the window count `wc`, then the
 * higher count, then probe order.
 * @param {{ count: number, n: number }[]} list
 * @param {number} wc
 * @returns {any[]}
 */
export function nearestFirst(list, wc) {
  return list.slice().sort((a, b) => Math.abs(a.count - wc) - Math.abs(b.count - wc) || b.count - a.count || a.n - b.n);
}

/**
 * The prior start count of a call: the test seam `ctx.igPrior`, else the table of IG.prior (P4), else null.
 * @param {any} ctx
 * @param {number} K
 * @returns {number | null}
 */
function priorCount(ctx, K) {
  if (ctx.igPrior !== undefined) {
    return ctx.igPrior === null ? null : clamp(ctx.igPrior, 1, K - 2);
  }
  const cell = IG.prior?.[`${ctx.target.id}@${activeCount(ctx.board)}`];
  return cell === undefined ? null : clamp(Math.round(cell.share * K), 1, K - 2);
}

/**
 * Whether a target takes the v4 search: Nightmare and Hell 1 (53 to 111); Hell 2 starts at 112 and keeps the frozen
 * search, as every level below Nightmare does (D-V4-03).
 * @param {{ min: number }} target
 * @returns {boolean}
 */
export function v4Target(target) {
  return target.min >= bandEdge(6) && target.min < bandEdge(8);
}

/** The journal keeps the prototype's phase names (`p2`, which compare.mjs reads); the events use the frozen `seed`. */
const eventPhase = (/** @type {string} */ phase) => (phase === 'p2' ? 'seed' : phase);

/**
 * One line of the work ledger (review R2-14, R2-07): count work is journaled by this module, independently of a
 * caller's `charge`, on the file and row naming of ig-log.js.
 * @param {object} line
 */
function igLedgerLine(line) {
  const dir = process.env.IG_LOG_DIR;
  if (dir === undefined) {
    return;
  }
  const row = process.env.IG_ROW ?? 'unrowed';
  appendFileSync(`${dir}/${row}.${process.pid}.${threadId}.jsonl`, `${JSON.stringify(line)}\n`);
}

/** The capability line of a selection call: its count work is journaled (null: the legacy route's call). */
export const igCapsLine = (/** @type {string | null} */ callId) => igLedgerLine({ t: 'caps', call: callId, count: true });

/** One uniqueness count of a repair, with its row trials (the units `charge` receives). */
export const igCountLine = (/** @type {string | null} */ callId, /** @type {number} */ units) => igLedgerLine({
  t: 'count', call: callId, units,
});

/** The begin line of a primitive (IG-P-Q37): written before it starts, so it survives a kill. */
export const igBeginLine = (
  /** @type {string | null} */ callId, /** @type {string} */ kind, /** @type {number} */ bound,
) => igLedgerLine({ t: 'begin', call: callId, kind, bound });

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
export function igRatingBound(board, pieces, clues, limits) {
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

/**
 * Selects a subset of the witness whose measured score lies in the target band (the contract of `selectClues`).
 * Test seams (self-test only): `ctx.igScreen(clues, W)` and `ctx.igCanonical(clues)` replace the screened and the
 * canonical rating, `ctx.igPrior` the table prior, `ctx.igW` the screen limit of the call, `ctx.igBudget` (a number
 * of units) the call budget of `IG.callBudget` (P5), and `ctx.igChargeKinds` (an array) receives one kind per metered
 * unit: `rate:<journal phase>` or `count`.
 * @param {any} ctx
 * @returns {any}
 */
export function selectCluesV4(ctx) {
  const K = ctx.pieces.length;
  const W = ctx.igW ?? IG.W[ctx.target.id] ?? IG.W.default;
  const call = startCall(ctx, { W, priorCount: K < 3 ? null : priorCount(ctx, K) });
  igCapsLine(call.id);
  const loc = {
    c0: null, prior: call.priorCount, probes: 0, result: null, hit: null, hiBelow: null, loAbove: null, wc: null,
    noWindowProof: null, rescue: /** @type {{ count: number, side: string, kind: string }[]} */ ([]),
    tables: { prior: IG.priorTable ?? null, screen: IG.screenTable ?? null }, countWork: 0,
  };
  call.locate = loc;
  /** @type {any} */
  let logged = null;
  /** @type {any} */
  let res;
  try {
    // Under IG.p6 the search skips the DLX diagnostic and withP6 completes the returned result; without it
    // withP6 only calls the search.
    res = withP6(ctx, () => searchV4(ctx, call, loc, W, call.priorCount, (r) => {
      logged = r;
    }), call);
  } catch (e) {
    endCall(call, e);
    throw e;
  }
  endCall(call, logged ?? res);
  return res;
}

/**
 * @param {SelectContext & Record<string, any>} ctx
 * @param {import('./ig-log.js').Call} call
 * @param {any} loc The locate summary written on the `end` line.
 * @param {number} W
 * @param {number | null} prior
 * @param {(res: any) => void} markNoWindow Sets the journaled result of a call that ends with `no-window`.
 * @returns {any}
 */
function searchV4(ctx, call, loc, W, prior, markNoWindow) {
  const { board, pieces, layout, target, rng, uniqueness, excludeClueKeys, ws, onRate, record, charge } = ctx;
  const replay = ctx.replaySkips;
  const source = ctx.recordSource ?? 'candidate';
  const K = pieces.length;
  if (K < 3) {
    throw new RangeError('clue selection needs at least three pieces');
  }
  if (!isValidLayout(board, pieces, layout)) {
    throw new RangeError('layout is not a complete valid arrangement of the pieces');
  }
  const limit = BUDGETS.clueSubsets;
  const rowLimit = countRowLimit(board);
  // Every rating of this call goes through rateWith: the subsets and the repaired sets. The `rate` seam keeps
  // priority; a recorder asks for the detail channel (RES-28); without either the call path is `rate` itself.
  const seam = ctx.rate;
  /** @type {(b: Board, p: Piece[], c: Pose[], w: Workspace) => { rating: Rating, detail: RatingDetail | null }} */
  const rateWith = seam !== undefined
    ? (b, p, c, w) => ({ rating: seam(b, p, c, w), detail: null })
    : record !== undefined ? rateDetailed : (b, p, c, w) => ({ rating: rate(b, p, c, w), detail: null });
  // A generated Hard-or-above candidate needs a proved decisive guess (RES-35, AR1).
  const refuseUnproved = target.min >= bandEdge(3);
  const finite = Number.isFinite(target.max);
  // Centre and half-width of the central half of the band; only used when the band is finite.
  const centre = finite ? (target.min + target.max) / 2 : 0;
  const halfWidth = finite ? (target.max - target.min) / 4 : 0;
  /** @type {Set<string>} */
  const tried = new Set();
  /** @type {Candidate[]} */
  const rated = [];
  /** @type {Candidate[]} In-band candidates in rating order. */
  const inBandList = [];
  /** @type {Map<string, Finished | null>} Final result of each finished candidate by raw subset id (null: failed). */
  const finals = new Map();
  let profiles = 0;
  let unproved = false;
  // Skip ordinals (RES-27): the next ordinal of each kind and the ordinals at which the exclusion acted.
  let subsetOrdinal = 0;
  let repairOrdinal = 0;
  /** @type {number[]} */
  const subsetSkips = [];
  /** @type {number[]} */
  const repairSkips = [];
  // Replay of the skips (`replaySkips`): the index of the next unconsumed entry of each list.
  let subsetNext = 0;
  let repairNext = 0;
  /** @type {WeakMap<Finished, { sequence: number, repairSequence: number | null }>} Where a final result came from. */
  const origins = new WeakMap();
  // Stall stop state, from the raw subset ratings only (finite band): which sides of the central half have been
  // rated, the distance to the centre of the nearest in-band candidate, and how many candidates were rated when it
  // was. Spent profiles take no part in it (D21 counting rule).
  let ratedBelow = false;
  let ratedAbove = false;
  let ratedCentral = false;
  let nearest = Infinity;
  let nearestAt = 0;

  // Observers (RES-28, RES-29): the events are built fresh and only when `record` is set (an optional call does not
  // evaluate its arguments otherwise).
  const bandOf = () => ({ min: target.min, max: Number.isFinite(target.max) ? target.max : null });
  /** @param {Pose[]} poses */
  const ownPoses = (poses) => poses.map((p) => ({ piece: p.piece, x: p.x, y: p.y, turn: p.turn, mirrored: p.mirrored }));
  /** @param {Pose[]} poses */
  const idsOf = (poses) => poses.map((p) => p.piece);

  const screened = W < DEDUCE.work;
  const rerateMax = IG.rerateMax;
  const bandCentre = finite ? centre : target.min;
  /** @type {any[]} Every probe in order, with its classification (the re-rating phases read it). */
  const probes = [];
  /** @param {number} score @returns {'below' | 'in' | 'above'} */
  const sideOfScore = (score) => (score < target.min ? 'below' : score >= target.max ? 'above' : 'in');
  /** @type {(count: number) => number[]} The nested family of phase A, assigned there. */
  let fam;

  const budget = ctx.igBudget ?? callBudgetOf(IG.callBudget, target);
  let spent = 0;
  loc.spent = 0;
  // Every metered unit (P5, R10): charged to the observer and the budget, with its kind for the test seam.
  /** @param {number} u @param {string} kind */
  const meter = (u, kind) => {
    spent += u;
    loc.spent = spent;
    ctx.igChargeKinds?.push(kind);
    charge?.(u);
  };
  // The count hook, metered (the journal line and `loc.countWork` stay as they were).
  /** @param {number} u */
  const meterCount = (u) => {
    igCountLine(call.id, u);
    loc.countWork += u;
    meter(u, 'count');
  };
  const checkBudget = () => {
    if (spent >= budget) {
      throw new BudgetStop();
    }
  };

  /**
   * @param {Pose[]} clues
   * @returns {{ rating: Rating, detail: RatingDetail | null }} The canonical rating of a subset or a repaired set.
   */
  const rateCanonical = (clues) => (ctx.igCanonical !== undefined
    ? { rating: ctx.igCanonical(clues), detail: null } : rateWith(board, pieces, clues, ws));
  const screenLimits = { deduce: { ...DEDUCE, work: W }, dlx: SCORE.caps };
  /**
   * The screened rating: built under the lowered main-work limit W. A screened run that passes the certificate of
   * `rateOnce` is the canonical measurement, so its detail is the canonical detail.
   * @param {Pose[]} clues
   * @returns {{ rating: Rating, detail: RatingDetail | null }}
   */
  const rateScreen = (clues) => {
    if (ctx.igScreen !== undefined) {
      return { rating: ctx.igScreen(clues, W), detail: null };
    }
    if (seam !== undefined) {
      return { rating: seam(board, pieces, clues, ws), detail: null };
    }
    if (!screened) {
      return rateCanonical(clues);
    }
    if (record !== undefined) {
      return igRateDetailedWithLimits(board, pieces, clues, ws, screenLimits);
    }
    const { metrics } = measureV3(board, pieces, clues, ws, screenLimits);
    const value = scoreV3(metrics);
    return {
      rating: {
        model: MODEL, score: value, level: levelForScore(value).id, saturated: false,
        ...(metrics.censusComplete ? {} : { censored: true }), metrics,
      },
      detail: null,
    };
  };
  /**
   * One rating attempt: journaled, charged once (the search work of the rating, or of the capped path) before
   * anything else happens with it, and classified (P2's certificate).
   * @param {Pose[]} clues
   * @param {'screen' | 'canonical'} mode
   * @param {string} phase The journal phase.
   * @returns {{ capped: true, screenCapped: boolean } | { capped: false, rating: Rating, detail: RatingDetail | null }}
   *   capped: the deduction path was capped (unrateable, RES-04) or the screened run is above W; every other error
   *   propagates.
   */
  const rateOnce = (clues, mode, phase) => {
    checkBudget();
    igBeginLine(call.id, mode === 'screen' && screened ? 'screen' : 'rate',
      igRatingBound(board, pieces, clues, mode === 'screen' && screened ? screenLimits.deduce : DEDUCE));
    /** @type {RatingDetail | null} */
    let detail = null;
    /** @type {any} */
    let rating;
    try {
      rating = recordRating(call, phase, clues.length, () => {
        const o = mode === 'screen' ? rateScreen(clues) : rateCanonical(clues);
        detail = o.detail;
        return o.rating;
      }, mode === 'screen' && screened ? W : null);
    } catch (error) {
      if (!(error instanceof IncompleteRatingError)) {
        throw error;
      }
      meter(error.counters.work, `rate:${phase}`);
      return { capped: true, screenCapped: mode === 'screen' && screened };
    }
    const m = rating.metrics;
    meter(typeof m?.work === 'number' && Number.isFinite(m.work) ? m.work : 0, `rate:${phase}`);
    if (mode === 'screen' && screened && m.work - m.censusWork > W) {
      return { capped: true, screenCapped: true };
    }
    return { capped: false, rating, detail };
  };

  /**
   * Whether the subset with this ordinal is skipped: by the recorded list when replaying, else by the excluded keys.
   * @param {number} ordinal
   * @param {string} key
   * @returns {boolean}
   */
  const subsetSkipped = (ordinal, key) => {
    if (replay === undefined) {
      return excludeClueKeys.has(key);
    }
    if (replay.subsets[subsetNext] !== ordinal) {
      return false;
    }
    subsetNext += 1;
    return true;
  };

  /**
   * @param {number} ordinal
   * @param {Pose[]} clues
   * @returns {boolean} true when the repair with this ordinal is skipped, as `subsetSkipped`.
   */
  const repairSkipped = (ordinal, clues) => {
    if (replay === undefined) {
      return excludeClueKeys.has(clueKey(board, pieces, clues));
    }
    if (replay.repairs[repairNext] !== ordinal) {
      return false;
    }
    repairNext += 1;
    return true;
  };

  /** Every recorded skip must have been consumed when the call returns (success or failure). */
  const verifyConsumed = () => {
    if (replay !== undefined && subsetNext < replay.subsets.length) {
      throw new SkipReplayError('unused', 'subsets', replay.subsets[subsetNext]);
    }
    if (replay !== undefined && repairNext < replay.repairs.length) {
      throw new SkipReplayError('unused', 'repairs', replay.repairs[repairNext]);
    }
  };

  /**
   * clues.js:389-437's rateSubset with the screen (P2, P3) and the direction of every result. One subset-ordinal
   * sequence serves the locate, window, seed and beam probes (D-V4-04).
   * @param {number[]} idx
   * @param {string} phase The journal phase: locate, window, p2 or beam.
   * @returns {any} null when skipped (repeated, excluded or out of budget: no profile), else the probe.
   */
  const rateSubset = (idx, phase) => {
    const id = idx.join(',');
    if (profiles >= limit || tried.has(id)) {
      return null;
    }
    tried.add(id);
    const ordinal = subsetOrdinal;
    subsetOrdinal += 1;
    if (ordinal >= SKIP_BOUNDS_V4.subsets) {
      throw new Error(`ig-select-v4: subset ordinal ${ordinal} reaches the bound ${SKIP_BOUNDS_V4.subsets}`);
    }
    const clues = idx.map((i) => layout[i]);
    const key = clueKey(board, pieces, clues);
    if (subsetSkipped(ordinal, key)) {
      subsetSkips.push(ordinal);
      record?.({ stage: 'clues', kind: 'skip', source, sequence: ordinal });
      return null;
    }
    const out = rateOnce(clues, 'screen', phase);
    profiles += 1;
    const p = {
      n: probes.length, ordinal, phase, count: clues.length, idx, clues, key, kind: 'rated', dir: 'above',
      screenCapped: false, rerated: false, score: null, cand: null,
    };
    probes.push(p);
    if (out.capped) {
      p.kind = 'too-few';
      p.screenCapped = out.screenCapped;
      record?.({
        stage: 'clues', kind: 'unrateable', source, phase: eventPhase(phase), sequence: ordinal, clueIds: idsOf(clues),
        reason: out.screenCapped ? 'screen-capped' : 'path-capped', band: bandOf(),
      });
      return p;
    }
    const { rating, detail } = out;
    p.score = rating.score;
    p.dir = sideOfScore(rating.score);
    if (refuseUnproved && noProvedGuess(rating)) {
      p.kind = 'ar1';
      record?.({
        stage: 'clues', kind: 'rejected', source, phase: eventPhase(phase), sequence: ordinal, clueIds: idsOf(clues),
        rating, detail, band: bandOf(), reason: 'no-proved-guess',
      });
      return p;
    }
    if (onRate !== undefined) {
      onRate(clues, rating);
    }
    record?.({
      stage: 'clues', kind: 'rated', source, phase: eventPhase(phase), sequence: ordinal, clueIds: idsOf(clues),
      rating, detail, band: bandOf(),
    });
    p.cand = { idx, clues, rating, key, seq: ordinal };
    rated.push(p.cand);
    return p;
  };

  /**
   * The final result of an in-band candidate: the raw subset for `any`, else the repaired and re-rated set. In
   * `require` mode the steps of the repair are recorded once the finish has decided (D31): one `repair` event per
   * added clue, only the last with the outcome; a failure before any clue was added is one event with no piece.
   * @param {Candidate} c In-band candidate.
   * @returns {Finished | null}
   */
  const finish = (c) => {
    if (uniqueness === 'any') {
      /** @type {Finished} */
      const final = { ok: true, clues: c.clues, rating: c.rating, certificate: null };
      origins.set(final, { sequence: c.seq, repairSequence: null });
      return final;
    }
    checkBudget();
    const ordinal = repairOrdinal;
    repairOrdinal += 1;
    /** @type {{ addedId: string, clues: Pose[] }[]} */
    const steps = [];
    igBeginLine(call.id, 'count', rowLimit);
    const repaired = makeUnique(board, pieces, layout, c.clues, rng, ws, rowLimit, {
      onAdd: (addedId, list) => {
        if (record !== undefined) {
          steps.push({ addedId, clues: ownPoses(sortLike(layout, list)) });
        }
        if (list.length <= K - 2) {
          checkBudget();
          igBeginLine(call.id, 'count', rowLimit);
        }
      },
      onCount: meterCount,
    });
    /** @typedef {NonNullable<Extract<ClueEvent, { kind: 'repair' }>['reason']>} RepairReason */
    /**
     * @param {RepairReason} reason
     * @param {Rating | null} [rating]
     * @param {RatingDetail | null} [detail]
     */
    const refusal = (reason, rating = null, detail = null) => ({ rating, detail, accepted: false, reason });
    let consumed = false;
    /** @returns {{ final: Finished | null, outcome: ReturnType<typeof refusal> | { rating: Rating, detail: null | RatingDetail, accepted: true, reason?: undefined } }} */
    const decide = () => {
      if (repaired === null) {
        unproved = true;
        return { final: null, outcome: refusal('not-proved') };
      }
      // Repair re-rates only a changed clue set; that rating is not a search profile.
      const changed = repaired.length !== c.clues.length;
      const clues = changed ? sortLike(layout, repaired) : c.clues;
      let rating = c.rating;
      /** @type {RatingDetail | null} */
      let detail = null;
      if (changed) {
        const out = rateOnce(clues, 'canonical', 'repair');
        if (out.capped) {
          return { final: null, outcome: refusal('path-capped') };
        }
        ({ rating, detail } = out);
        if (refuseUnproved && noProvedGuess(rating)) {
          return { final: null, outcome: refusal('no-proved-guess', rating, detail) };
        }
      }
      if (!inBand(rating, target)) {
        return { final: null, outcome: refusal('out-of-band', rating, detail) };
      }
      if (changed && repairSkipped(ordinal, clues)) {
        consumed = true;
        repairSkips.push(ordinal);
        return { final: null, outcome: refusal('excluded', rating, detail) };
      }
      /** @type {Finished} */
      const final = {
        ok: true, clues, rating, certificate: { status: 'unique', model: 'dlx-v1', rowLimit, verified: true },
      };
      origins.set(final, { sequence: c.seq, repairSequence: changed ? ordinal : null });
      return { final, outcome: { rating, detail, accepted: true } };
    };
    const { final, outcome } = decide();
    if (record !== undefined && steps.length > 0) {
      steps.forEach((step, i) => {
        const last = i === steps.length - 1;
        record({
          stage: 'unique', kind: 'repair', source, repairSequence: ordinal, addedId: step.addedId, clues: step.clues,
          rating: last ? outcome.rating : null, detail: last ? outcome.detail : null,
          accepted: last ? outcome.accepted : null,
          ...(last && outcome.reason !== undefined ? { reason: outcome.reason } : {}),
        });
      });
    } else if (record !== undefined && !outcome.accepted) {
      record({
        stage: 'unique', kind: 'repair', source, repairSequence: ordinal, addedId: null, clues: ownPoses(c.clues),
        rating: null, detail: null, accepted: false, reason: outcome.reason,
      });
    }
    if (replay !== undefined && !consumed && replay.repairs[repairNext] === ordinal) {
      throw new SkipReplayError('unreachable', 'repairs', ordinal);
    }
    return final;
  };

  /**
   * The result of the call: a fresh copy of a final result with the skips of the whole call up to now, announced
   * by the `selected` event (RES-28), and the summary of the locate.
   * @param {Finished} r
   * @returns {any}
   */
  const conclude = (r) => {
    verifyConsumed();
    const origin = /** @type {{ sequence: number, repairSequence: number | null }} */ (origins.get(r));
    record?.({
      stage: 'clues', kind: 'selected', source, sequence: origin.sequence, repairSequence: origin.repairSequence,
    });
    return {
      ...r,
      skips: { subsets: subsetSkips.slice(), repairs: repairSkips.slice() },
      igWindow: {
        c0: loc.c0, wc: loc.wc, hit: loc.hit, hiBelow: loc.hiBelow, loAbove: loc.loAbove, probes: loc.probes,
        result: loc.result, proof: loc.noWindowProof,
      },
    };
  };

  /**
   * Finishes a candidate at most once, so that the repair draws from the rng at deterministic points.
   * @param {Candidate} c
   * @returns {Finished | null}
   */
  const finishOnce = (c) => {
    const id = c.idx.join(',');
    if (!finals.has(id)) {
      finals.set(id, finish(c));
    }
    return /** @type {Finished | null} */ (finals.get(id));
  };

  /**
   * @param {Rating} r
   * @returns {boolean} true in the central half of a finite band, and for every rating of an unbounded band.
   */
  const central = (r) => !finite || Math.abs(r.score - centre) <= halfWidth;

  /**
   * Lazy best-first choice over the final results of the in-band candidates: the one whose final score (raw
   * score while unfinished) is nearest to the centre, finishing candidates until that one is a final result.
   * @returns {Finished | null} null when no in-band candidate has a final result.
   */
  const chooseBest = () => {
    for (;;) {
      const open = inBandList.filter((c) => finals.get(c.idx.join(',')) !== null);
      if (open.length === 0) {
        return null;
      }
      /** @type {Candidate} */
      let pick = open[0];
      if (finite) {
        let pickDistance = Infinity;
        let pickFinished = false;
        for (const c of ranked(target, open)) {
          const final = finals.get(c.idx.join(','));
          const distance = Math.abs((final ? final.rating : c.rating).score - centre);
          const finished = final !== undefined;
          if (distance < pickDistance || (distance === pickDistance && finished && !pickFinished)) {
            pick = c;
            pickDistance = distance;
            pickFinished = finished;
          }
        }
      }
      const final = finals.get(pick.idx.join(','));
      if (final !== undefined) {
        return final;
      }
      finishOnce(pick);
    }
  };

  // The best final result already finished (R10): the existing centre and tie order, no new work.
  const bestFinished = () => {
    let pick = null;
    let pickDistance = Infinity;
    for (const c of (finite ? ranked(target, inBandList) : inBandList)) {
      const final = finals.get(c.idx.join(','));
      if (final === undefined || final === null) {
        continue;
      }
      const distance = finite ? Math.abs(final.rating.score - centre) : 0;
      if (pick === null || distance < pickDistance) {
        pick = final;
        pickDistance = distance;
      }
    }
    return pick;
  };

  /**
   * Called once for every profile: a central final result stops the search; so does a stall (RES-15a: the central
   * half is out of reach); from profile `limit - CENTRE_RESERVE` on, the best final result seen so far does. The
   * stall reads raw subset ratings only, in every uniqueness mode, and counts rated candidates: a spent profile
   * (`c` null) is on no side of the central half, is never nearer and neither advances nor resets the count.
   * @param {Candidate | null} c Null for a spent profile.
   * @returns {Finished | null}
   */
  const afterProfile = (c) => {
    if (c !== null) {
      const inside = inBand(c.rating, target);
      if (finite) {
        const offset = c.rating.score - centre;
        if (Math.abs(offset) <= halfWidth) {
          ratedCentral = true;
        } else if (offset < 0) {
          ratedBelow = true;
        } else {
          ratedAbove = true;
        }
        if (inside && Math.abs(offset) < nearest) {
          nearest = Math.abs(offset);
          nearestAt = rated.length;
        }
      }
      if (inside) {
        inBandList.push(c);
        if (central(c.rating)) {
          const final = finishOnce(c);
          if (final !== null && central(final.rating)) {
            return final;
          }
        }
      }
    }
    if (finite && inBandList.length > 0) {
      const stalled = !ratedCentral && ratedBelow !== ratedAbove && rated.length - nearestAt >= STALL_LIMIT;
      if (stalled || profiles >= limit - CENTRE_RESERVE) {
        return chooseBest();
      }
    }
    return null;
  };

  /**
   * @param {number} count
   * @returns {number[]}
   */
  const sample = (count) => rng.shuffle(layout.map((_, i) => i)).slice(0, count).sort((a, b) => a - b);

  /** One probe and its `afterProfile`; a final result unwinds the call. */
  const step = (/** @type {number[]} */ idx, /** @type {string} */ phase) => {
    const p = rateSubset(idx, phase);
    if (p === null) {
      return null;
    }
    if (phase === 'locate') {
      loc.probes += 1;
    }
    const done = afterProfile(p.kind === 'rated' ? p.cand : null);
    if (done !== null) {
      if (phase === 'locate' && p.dir === 'in') {
        Object.assign(loc, { result: 'hit', hit: p.count, wc: p.count });
      }
      throw new Final(done);
    }
    return p;
  };

  /**
   * A canonical re-rating of a screen-capped probe, outside the profile limit and the ordinals, and charged to the
   * shared allowance (D-V4-04).
   * @param {any} p
   * @param {string} phase
   * @returns {any} The result: kind (rated, ar1, too-few for a canonical cap), dir, cand (rated only; not yet in `rated`).
   */
  const rerate = (p, phase) => {
    p.rerated = true;
    call.rerates += 1;
    const out = rateOnce(p.clues, 'canonical', phase);
    if (out.capped) {
      record?.({
        stage: 'clues', kind: 'unrateable', source, phase: eventPhase(phase), sequence: p.ordinal,
        clueIds: idsOf(p.clues), reason: 'path-capped', band: bandOf(),
      });
      return { count: p.count, kind: 'too-few', dir: 'above', cand: null, score: null, screenCapped: false };
    }
    const { rating, detail } = out;
    const refused = refuseUnproved && noProvedGuess(rating);
    if (refused) {
      record?.({
        stage: 'clues', kind: 'rejected', source, phase: eventPhase(phase), sequence: p.ordinal,
        clueIds: idsOf(p.clues), rating, detail, band: bandOf(), reason: 'no-proved-guess',
      });
    } else {
      record?.({
        stage: 'clues', kind: 'rated', source, phase: eventPhase(phase), sequence: p.ordinal, clueIds: idsOf(p.clues),
        rating, detail, band: bandOf(),
      });
    }
    return {
      count: p.count, kind: refused ? 'ar1' : 'rated', dir: sideOfScore(rating.score), score: rating.score,
      screenCapped: false,
      cand: refused ? null : { idx: p.idx, clues: p.clues, rating, key: p.key, seq: p.ordinal },
    };
  };

  /** A candidate from a canonical re-rating joins `rated` like a probe's, and `afterProfile` reads it. */
  const adopt = (/** @type {any} */ r) => {
    if (r.cand === null) {
      return;
    }
    if (onRate !== undefined) {
      onRate(r.cand.clues, r.cand.rating);
    }
    rated.push(r.cand);
    const done = afterProfile(r.cand);
    if (done !== null) {
      throw new Final(done);
    }
  };

  try {
    // Phase A: locate (P1 with the P4 prior), on one nested family.
    igPhase('locate');
    const order = rng.shuffle(layout.map((_, i) => i));
    fam = (/** @type {number} */ c) => order.slice(0, c).sort((a, b) => a - b);
    const c0 = clamp(prior ?? K - IG.U0, 1, K - 2);
    const step0 = prior !== null ? 1 : IG.U0;
    loc.c0 = c0;
    /** @type {Map<number, any>} The latest result at each locate count (a canonical re-rating replaces a screen). */
    const byCount = new Map();
    /** @type {number | null} */
    let hit = null;
    /** @type {number | null} */
    let hiBelow = null;
    /** @type {number | null} */
    let loAbove = null;
    /** @type {string | null} */
    let noWindow = null;
    let skipped = false;

    /** @returns {'in' | 'in-refused' | 'below' | 'above' | 'skip'} */
    const side = (/** @type {number} */ c) => {
      let p = step(fam(c), 'locate');
      if (p === null) {
        p = step(sample(c), 'locate');
      }
      if (p === null) {
        return 'skip';
      }
      byCount.set(c, p);
      return p.dir === 'in' ? (p.kind === 'ar1' ? 'in-refused' : 'in') : p.dir;
    };
    const isIn = (/** @type {string} */ s) => s === 'in' || s === 'in-refused';

    /** The BELOW march: towards fewer clues from `hiBelow`, the step doubling after each below result. */
    const marchDown = () => {
      let stepSize = step0;
      for (;;) {
        const c = Math.max(1, /** @type {number} */ (hiBelow) - stepSize);
        if (c === hiBelow) {
          noWindow = 'below-to-one';
          return;
        }
        const s = side(c);
        if (isIn(s)) {
          hit = c;
          return;
        }
        if (s === 'below') {
          hiBelow = c;
          if (c === 1) {
            noWindow = 'below-to-one';
            return;
          }
          stepSize *= 2;
        } else {
          if (s === 'above') {
            loAbove = c;
          } else {
            skipped = true;
          }
          return;
        }
      }
    };
    /** The ABOVE march: towards more clues from `loAbove`. */
    const marchUp = () => {
      let stepSize = step0;
      for (;;) {
        const c = Math.min(K - 2, /** @type {number} */ (loAbove) + stepSize);
        if (c === loAbove) {
          noWindow = 'above-to-max';
          return;
        }
        const s = side(c);
        if (isIn(s)) {
          hit = c;
          return;
        }
        if (s === 'above') {
          loAbove = c;
          if (c === K - 2) {
            noWindow = 'above-to-max';
            return;
          }
          stepSize *= 2;
        } else {
          if (s === 'below') {
            hiBelow = c;
          } else {
            skipped = true;
          }
          return;
        }
      }
    };
    const bisect = () => {
      while (hit === null && !skipped && hiBelow !== null && loAbove !== null && hiBelow - loAbove > 1) {
        const mid = Math.floor((loAbove + hiBelow) / 2);
        const s = side(mid);
        if (isIn(s)) {
          hit = mid;
        } else if (s === 'below') {
          hiBelow = mid;
        } else if (s === 'above') {
          loAbove = mid;
        } else {
          skipped = true;
        }
      }
    };
    /** The window count: the hit; else the end of the closed bracket with a usable rating; else the known end. */
    const windowCount = () => {
      if (hit !== null) {
        return hit;
      }
      if (hiBelow !== null && loAbove !== null) {
        const above = byCount.get(loAbove);
        const below = byCount.get(hiBelow);
        if (above.kind === 'too-few') {
          return hiBelow;
        }
        return Math.abs(below.score - bandCentre) <= Math.abs(above.score - bandCentre) ? hiBelow : loAbove;
      }
      return hiBelow ?? loAbove ?? c0;
    };
    /** @param {string} proof @returns {any} A call that ends at once: no window (P5's fail-at-once). */
    const failNoWindow = (proof) => {
      verifyConsumed();
      Object.assign(loc, { result: noWindow, hiBelow, loAbove, wc: windowCount(), noWindowProof: proof });
      markNoWindow({ ok: false, result: 'no-window' });
      return { ok: false, reason: 'not-in-band' };
    };

    const first = side(c0);
    if (isIn(first)) {
      hit = c0;
    } else if (first === 'below') {
      hiBelow = c0;
      marchDown();
    } else if (first === 'above') {
      loAbove = c0;
      marchUp();
    } else {
      skipped = true;
    }
    bisect();

    /** @type {string | null} */
    let proof = null;
    if (noWindow === 'below-to-one') {
      return failNoWindow('canonical');
    }
    if (noWindow === 'above-to-max') {
      const locateProbes = probes.filter((p) => p.phase === 'locate');
      if (!locateProbes.some((p) => p.screenCapped)) {
        return failNoWindow('canonical');
      }
      // The rescue: a canonical re-rating of the screen-capped locate probes nearest the window count, once per call.
      igPhase('rescue');
      const todo = nearestFirst(locateProbes.filter((p) => p.screenCapped), windowCount());
      /** @type {any[]} */
      const results = [];
      for (const p of todo) {
        if (call.rerates >= rerateMax) {
          break;
        }
        const r = rerate(p, 'rescue');
        results.push(r);
        loc.rescue.push({ count: p.count, side: r.dir, kind: r.kind });
        byCount.set(p.count, r);
      }
      const inResults = results.filter((r) => r.dir === 'in');
      if (inResults.length > 0) {
        // A window: the first in-band result in rescue order is the hit; every eligible in-band rating is a
        // candidate (an AR1 refusal is none), and today's afterProfile may finish the call on it.
        hit = inResults[0].count;
        noWindow = null;
        proof = 'rescued-in';
        try {
          inResults.forEach(adopt);
        } catch (e) {
          if (e instanceof Final) {
            Object.assign(loc, { result: 'hit', hit, wc: hit, noWindowProof: proof });
          }
          throw e;
        }
      } else if (results.some((r) => r.dir === 'below')) {
        // The bracket is rebuilt from every locate result and phase A resumes, with no second rescue.
        proof = 'rebracketed';
        noWindow = null;
        hiBelow = Math.min(...[...byCount].filter(([, r]) => r.dir === 'below').map(([c]) => c));
        const aboveCounts = [...byCount]
          .filter(([c, r]) => r.dir === 'above' && c < /** @type {number} */ (hiBelow)).map(([c]) => c);
        loAbove = aboveCounts.length === 0 ? null : Math.max(...aboveCounts);
        igPhase('locate');
        if (loAbove === null) {
          marchDown();
        }
        bisect();
        if (noWindow === 'below-to-one') {
          return failNoWindow('rebracketed');
        }
      } else {
        return failNoWindow(todo.every((p) => p.rerated) ? 'confirmed' : 'heuristic');
      }
    }
    const wc = windowCount();
    Object.assign(loc, {
      result: hit !== null ? 'hit' : skipped ? 'skip' : 'window', hit, hiBelow, loAbove, wc, noWindowProof: proof,
    });

    // Phase B: window (clues.js:429-464 from the window count; too-few probes count as above, AR1 refusals by score).
    igPhase('window');
    let count = wc;
    const countsTried = new Set();
    for (let stepNo = 0; stepNo < COUNT_CHANGES; stepNo += 1) {
      countsTried.add(count);
      let below = 0;
      let above = 0;
      for (let attempt = 0; attempt < SAMPLES_PER_COUNT; attempt += 1) {
        const p = step(sample(count), 'window');
        if (p === null) {
          continue;
        }
        if (p.dir === 'above') {
          above += 1;
        } else if (p.dir === 'below') {
          below += 1;
        }
      }
      if (below > 0 && above === 0) {
        count -= 1;
      } else if (above > 0 && below === 0) {
        count += 1;
      } else {
        break;
      }
      if (count < 1 || count > K - 2 || countsTried.has(count)) {
        break;
      }
    }

    // Phase C: today's phase 2 (the dead end, clues.js:466-475), sampling at the window count.
    if (rated.length === 0) {
      igPhase('p2');
    }
    for (let attempt = 0; rated.length === 0 && attempt < 4 * SAMPLES_PER_COUNT; attempt += 1) {
      step(sample(wc), 'p2');
    }

    /**
     * Up to `MOVES_PER_MEMBER` unseen neighbours: add, remove or swap one clue,
     * leaning towards the side of the band the member is on.
     * @param {Candidate} member
     * @returns {number[][]}
     */
    const neighbours = (member) => {
      const inSet = new Set(member.idx);
      const outside = layout.map((_, i) => i).filter((i) => !inSet.has(i));
      const size = member.idx.length;
      const options = ['swap'];
      const lean = member.rating.score < target.min ? ['remove'] : member.rating.score >= target.max ? ['add'] : ['add', 'remove'];
      for (const kind of lean) {
        if ((kind === 'add' && size + 1 <= K - 2) || (kind === 'remove' && size - 1 >= 1)) {
          options.push(kind, kind);
        }
      }
      /** @type {number[][]} */
      const out = [];
      const local = new Set();
      for (let attempt = 0; attempt < 4 * MOVES_PER_MEMBER && out.length < MOVES_PER_MEMBER; attempt += 1) {
        const kind = rng.pick(options);
        const next = member.idx.slice();
        if (kind === 'add') {
          next.push(rng.pick(outside));
        } else if (kind === 'remove') {
          next.splice(rng.int(size), 1);
        } else {
          if (outside.length === 0) {
            continue;
          }
          next[rng.int(size)] = rng.pick(outside);
        }
        next.sort((a, b) => a - b);
        const id = next.join(',');
        if (!tried.has(id) && !local.has(id)) {
          local.add(id);
          out.push(next);
        }
      }
      return out;
    };

    // Phase D: today's beam (clues.js:521-545), with screened probes.
    igPhase('beam');
    let beam = ranked(target, rated).slice(0, BEAM_WIDTH);
    while (profiles < limit && beam.length > 0) {
      /** @type {Candidate[]} */
      const fresh = [];
      for (const member of beam) {
        for (const idx of neighbours(member)) {
          const p = step(idx, 'beam');
          if (p !== null && p.cand !== null) {
            fresh.push(p.cand);
          }
        }
      }
      if (fresh.length === 0) {
        break;
      }
      beam = ranked(target, [...beam, ...fresh]).slice(0, BEAM_WIDTH);
    }
    let best = chooseBest();
    if (best !== null) {
      return conclude(best);
    }

    // Phase E: canonical re-rating of the screen-capped probes nearest the window count (IG-P-Q01).
    igPhase('rerate');
    for (const p of nearestFirst(probes.filter((q) => q.screenCapped && !q.rerated), wc)) {
      if (call.rerates >= rerateMax) {
        break;
      }
      adopt(rerate(p, 'rerate'));
    }
    best = chooseBest();
    if (best !== null) {
      return conclude(best);
    }
    verifyConsumed();
    return { ok: false, reason: unproved ? 'uniqueness-not-proved' : 'not-in-band' };
  } catch (e) {
    if (e instanceof BudgetStop) {
      loc.budgetStop = { limit: budget, spent, overshoot: spent - budget };
      const best = bestFinished();
      if (best !== null) {
        return conclude(best);
      }
      verifyConsumed();
      return { ok: false, reason: 'not-in-band' };
    }
    if (e instanceof Final) {
      return conclude(e.res);
    }
    throw e;
  }
}
