// @ts-check
// Shared difficulty rating (`difficulty-v3`, design §7.10): the deduction measure of how a person solves the
// puzzle (`measureV3`), scored by `scoreV3`. Only work counters enter the score: no clocks, no randomness. The
// `difficulty-v2` functions (`scoreV2`, `measureV2`, `rateV2`, design §7.2) are kept for stored claims, the frozen
// Player sample and the rating probe.

import { measureDeduction } from './deduce.js';
import { isValidLayout, buildModel, solveFirst } from './tiling.js';
import { levelForScore } from './levels.js';
import { DEDUCE, SCORE, SCORE_V3 } from './policy.js';

/** @typedef {import('./types.js').Board} Board */
/** @typedef {import('./types.js').Piece} Piece */
/** @typedef {import('./types.js').Pose} Pose */
/** @typedef {import('./types.js').Metrics} Metrics */
/** @typedef {import('./types.js').MetricsV3} MetricsV3 */
/** @typedef {import('./types.js').Rating} Rating */
/** @typedef {import('./types.js').RatingV2} RatingV2 */
/** @typedef {import('./types.js').RatingV3} RatingV3 */
/** @typedef {import('./types.js').RatingDetail} RatingDetail */
/** @typedef {import('./deduce.js').DeductionLimits} DeductionLimits */
/** @typedef {import('./deduce.js').DeductionResult} DeductionResult */
/** @typedef {import('./levels.js').Level} Level */
/** @typedef {import('./workspace.js').Workspace} Workspace */

/**
 * The inputs of the `difficulty-v3` score: the other fields of `MetricsV3` are ignored.
 * @typedef {Pick<MetricsV3, 'U' | 'deductionTier' | 'G' | 'info' | 'solutions'>} ScoreInputV3
 */

/**
 * The shape of `SCORE_V3`; the probe passes its own (validated) knobs.
 * @typedef {object} ScoreKnobsV3
 * @property {{ max: number, scale: number }} base
 * @property {readonly number[]} rule Rule term by deduction tier 0 to 3.
 * @property {{ G: number, info: number }} weights
 * @property {{ few: number, many: number }} penalty
 */

/**
 * The terms of the `difficulty-v3` score; `score` is the only rounded value.
 * @typedef {object} BreakdownV3
 * @property {number} base
 * @property {number} rule
 * @property {number} guess
 * @property {number} penalty
 * @property {number} unrounded `base + rule + guess - penalty`.
 * @property {number} score
 */

export const MODEL = 'difficulty-v3';

/** Thrown when a clue set has no solution: a piece without placements or an exhausted empty search. */
export class UnsatisfiableError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = 'UnsatisfiableError';
    this.code = 'unsatisfiable';
  }
}

/**
 * Thrown when the deduction search was capped (node or work cap) before its first solution: the puzzle is unrateable
 * (RES-04). `counters` are the search totals at the cap. Nothing is derived from a capped path.
 */
export class IncompleteRatingError extends Error {
  /**
   * @param {string} message
   * @param {{ nodes: number, work: number, stop: 'node-cap' | 'work-cap' }} counters
   */
  constructor(message, counters) {
    super(message);
    this.name = 'IncompleteRatingError';
    this.code = 'rating-incomplete';
    this.reason = 'path-capped';
    this.counters = { nodes: counters.nodes, work: counters.work, stop: counters.stop };
  }
}

/**
 * The `difficulty-v2` score: `D = round(2U + 8 log10(1 + B))`, rounded once; `U = 0` scores 0. `B` is the
 * effective (already capped) branch count.
 * @param {number} U Pieces left to place.
 * @param {number} B Effective branch trials.
 * @returns {number}
 */
export function scoreV2(U, B) {
  if (!Number.isInteger(U) || U < 0) {
    throw new RangeError('U must be a non-negative integer');
  }
  if (!Number.isInteger(B) || B < 0) {
    throw new RangeError('B must be a non-negative integer');
  }
  return U === 0 ? 0 : Math.round(SCORE.weights.U * U + SCORE.weights.B * Math.log10(1 + B));
}

const SOLUTIONS_V3 = ['unique', 'few', 'many', 'unknown'];

/**
 * The terms of the `difficulty-v3` score (design §7.10), evaluated in this order and rounded once:
 * `base = max (1 - exp(-U / scale))`, the rule term of the deduction tier, `guess = wG G + wInfo info`, the penalty
 * of a few or many solutions; `unrounded = base + rule + guess - penalty`. `info` is the unquantised double of the
 * measurement. The knobs are not validated here. Throws `RangeError` for an invalid metric.
 * @param {ScoreInputV3} m
 * @param {ScoreKnobsV3} [knobs]
 * @returns {BreakdownV3}
 */
export function breakdownV3(m, knobs = SCORE_V3) {
  const { U, deductionTier, G, info, solutions } = m;
  if (!Number.isInteger(U) || U < 0) {
    throw new RangeError('U must be a non-negative integer');
  }
  if (!Number.isInteger(deductionTier) || deductionTier < 0 || deductionTier > 3) {
    throw new RangeError('deductionTier must be an integer from 0 to 3');
  }
  if (!Number.isInteger(G) || G < 0) {
    throw new RangeError('G must be a non-negative integer');
  }
  if (!Number.isFinite(info) || info < 0) {
    throw new RangeError('info must be a finite number >= 0');
  }
  if (G === 0 && info !== 0) {
    throw new RangeError('info must be 0 when G is 0');
  }
  if (!SOLUTIONS_V3.includes(solutions)) {
    throw new RangeError('solutions must be unique, few, many or unknown');
  }
  const base = knobs.base.max * (1 - Math.exp(-U / knobs.base.scale));
  const rule = knobs.rule[deductionTier];
  const guess = knobs.weights.G * G + knobs.weights.info * info;
  const penalty = solutions === 'few' ? knobs.penalty.few : solutions === 'many' ? knobs.penalty.many : 0;
  const unrounded = base + rule + guess - penalty;
  return { base, rule, guess, penalty, unrounded, score: U === 0 ? 0 : Math.max(0, Math.round(unrounded)) };
}

/**
 * The `difficulty-v3` score of the metrics under the production knobs `SCORE_V3`.
 * @param {ScoreInputV3} m
 * @returns {number}
 */
export function scoreV3(m) {
  return breakdownV3(m).score;
}

/**
 * The `difficulty-v2` metrics of a board, its set and a clue subset. Throws `ModelError` for invalid
 * input and `UnsatisfiableError` when the clues cannot be completed. `limits`
 * lowers the work caps for tests; the effective B of a capped search stays 5,000.
 * @param {Board} board
 * @param {Piece[]} pieces
 * @param {Pose[]} clues
 * @param {Workspace} ws
 * @param {{ branch: number, rows: number }} [limits]
 * @returns {{ metrics: Metrics, saturated: boolean }}
 */
export function measureV2(board, pieces, clues, ws, limits = SCORE.caps) {
  const U = pieces.length - clues.length;
  if (U === 0) {
    if (!isValidLayout(board, pieces, clues)) {
      throw new UnsatisfiableError('the clues are not a complete valid layout');
    }
    return {
      metrics: { U: 0, B: 0, branchTrials: 0, rowTrials: 0, stop: 'solution', R: 0, H: 0 },
      saturated: false,
    };
  }
  const model = buildModel(board, pieces, clues, ws);
  let bits = 0;
  for (let i = 0; i < model.freePieces.length; i += 1) {
    const rows = model.placementsPerPiece[i];
    if (rows === 0) {
      throw new UnsatisfiableError(`piece ${model.freePieces[i]} has no legal placement`);
    }
    bits += Math.log2(1 + rows);
  }
  const run = solveFirst(model, { rowTrialLimit: limits.rows, branchTrialLimit: limits.branch });
  /** @type {Metrics['stop']} */
  let stop = 'solution';
  if (run.layout === null) {
    if (run.exhausted) {
      throw new UnsatisfiableError('the clues have no solution');
    }
    stop = run.stop === 'row-limit' ? 'row-cap' : 'branch-cap';
  }
  const saturated = stop !== 'solution';
  return {
    metrics: {
      U,
      B: saturated ? SCORE.caps.branch : Math.min(run.branchTrials, SCORE.caps.branch),
      branchTrials: run.branchTrials,
      rowTrials: run.rowTrials,
      stop,
      R: model.freeCells,
      H: bits / U,
    },
    saturated,
  };
}

/**
 * The `difficulty-v3` metrics of a board, its set and a clue subset (design §7.10): the deduction measure
 * (`measureDeduction`) and, beside it, the v2 DLX diagnostic, which never enters the score. Throws `ModelError` for
 * invalid input, `UnsatisfiableError` when the clues cannot be completed and `IncompleteRatingError` when the
 * deduction path was capped. `limits.dlx` lowers the DLX caps for tests; its B stays pinned to 5,000 when capped.
 * An unfinished census is not an error: it is reported in `censusComplete` and `censusUndecided`. A rating never
 * has `saturated` (it stays `false`) and never has `solutions: 'none'`. No shape check: twin pieces are counted as
 * labelled pieces.
 * @param {Board} board
 * @param {Piece[]} pieces
 * @param {Pose[]} clues
 * @param {Workspace} ws
 * @param {{ deduce: DeductionLimits, dlx: { branch: number, rows: number } }} [limits]
 * @returns {{ metrics: MetricsV3, saturated: false }}
 */
export function measureV3(board, pieces, clues, ws, limits = { deduce: DEDUCE, dlx: SCORE.caps }) {
  const { metrics, saturated } = measureV3Core(board, pieces, clues, ws, limits, false);
  return { metrics, saturated };
}

/**
 * The detail of a measurement without a solver call (U = 0), as the zero metrics: every number 0, a unique
 * solution and a complete census.
 * @param {number} limit The count limit.
 * @returns {RatingDetail}
 */
function zeroDetail(limit) {
  return {
    path: 'complete',
    first: {
      F: 0, E: 0, rules: { R1: 0, R2: 0, R3: 0, R4: 0, R5: 0, R6: 0, R7: 0, R8: 0, R9: 0 }, deductionTier: 0,
      G: 0, Gproved: 0, info: 0, Cmax: 0, Dmax: 0, choices: [], rows: [], census: [],
    },
    search: { Gt: 0, nodes: 0, work: 0, stop: 'exhausted' },
    count: { S: 1, limit, exhausted: true, solutions: 'unique' },
    census: { complete: true, undecided: 0, nodes: 0, work: 0 },
  };
}

/**
 * The owned copy of a complete deduction result (RES-19): plain values, no view into the workspace.
 * @param {DeductionResult} d
 * @returns {RatingDetail}
 */
function copyDetail(d) {
  const first = /** @type {NonNullable<DeductionResult['first']>} */ (d.first);
  const census = /** @type {NonNullable<DeductionResult['census']>} */ (d.census);
  return {
    path: 'complete',
    first: {
      F: first.F,
      E: first.E,
      rules: {
        R1: first.rules.R1, R2: first.rules.R2, R3: first.rules.R3, R4: first.rules.R4, R5: first.rules.R5,
        R6: first.rules.R6, R7: first.rules.R7, R8: first.rules.R8, R9: first.rules.R9,
      },
      deductionTier: first.deductionTier,
      G: first.G,
      Gproved: first.Gproved,
      info: first.info,
      Cmax: first.Cmax,
      Dmax: first.Dmax,
      choices: Array.from(first.choices),
      rows: Array.from(first.rows),
      census: first.census.map((n) => ({ c: n.c, kLow: n.kLow, f: n.f, u: n.u })),
    },
    search: { Gt: d.search.Gt, nodes: d.search.nodes, work: d.search.work, stop: d.search.stop },
    count: { S: d.count.S, limit: d.count.limit, exhausted: d.count.exhausted, solutions: d.count.solutions },
    census: { complete: census.complete, undecided: census.undecided, nodes: census.nodes, work: census.work },
  };
}

/**
 * The DLX diagnostic of a model: the four fields of `MetricsV3` that only the traversal sets. An exhausted search
 * without a solution is an internal error (the deduction found one).
 * @param {import('./tiling.js').Model} model
 * @param {{ branch: number, rows: number }} dlx
 * @returns {Pick<MetricsV3, 'B' | 'branchTrials' | 'rowTrials' | 'dlxStop'>}
 */
function dlxDiagnostic(model, dlx) {
  const run = solveFirst(model, { rowTrialLimit: dlx.rows, branchTrialLimit: dlx.branch });
  /** @type {MetricsV3['dlxStop']} */
  let dlxStop = 'solution';
  if (run.layout === null) {
    if (run.exhausted) {
      throw new Error('internal: the DLX diagnostic found no solution where the deduction found one');
    }
    dlxStop = run.stop === 'row-limit' ? 'row-cap' : 'branch-cap';
  }
  return {
    B: dlxStop === 'solution' ? Math.min(run.branchTrials, SCORE.caps.branch) : SCORE.caps.branch,
    branchTrials: run.branchTrials,
    rowTrials: run.rowTrials,
    dlxStop,
  };
}

/**
 * The one measurement behind `measureV3`, `rate`, `rateDetailed` and `rateLean`. With `keepDetail` the deduction
 * result is copied right after `measureDeduction` returns, before the DLX diagnostic reuses the workspace; the second
 * solve of the detail channel does not exist. Without `withDlx` (and with U > 0) the DLX diagnostic is not run: `B`,
 * `branchTrials` and `rowTrials` are 0 and `dlxStop` is `'skipped'` (P6); everything else is as with it.
 * @param {Board} board
 * @param {Piece[]} pieces
 * @param {Pose[]} clues
 * @param {Workspace} ws
 * @param {{ deduce: DeductionLimits, dlx: { branch: number, rows: number } }} limits
 * @param {boolean} keepDetail
 * @param {boolean} [withDlx] Default true.
 * @returns {{ metrics: MetricsV3, saturated: false, detail: RatingDetail | null }}
 */
function measureV3Core(board, pieces, clues, ws, limits, keepDetail, withDlx = true) {
  const U = pieces.length - clues.length;
  if (U === 0) {
    if (!isValidLayout(board, pieces, clues)) {
      throw new UnsatisfiableError('the clues are not a complete valid layout');
    }
    return {
      metrics: {
        U: 0, R: 0, H: 0, B: 0, branchTrials: 0, rowTrials: 0, dlxStop: 'solution', searchStop: 'exhausted',
        F: 0, E: 0, rules: { R1: 0, R2: 0, R3: 0, R4: 0, R5: 0, R6: 0, R7: 0, R8: 0, R9: 0 },
        deductionTier: 0, tier: 0, G: 0, info: 0, Cmax: 0, Dmax: 0, Gt: 0, nodes: 0, work: 0,
        S: 1, solutionLimit: limits.deduce.solutions, solutions: 'unique',
        censusComplete: true, censusUndecided: 0, censusNodes: 0, censusWork: 0, Gproved: 0,
      },
      saturated: false,
      detail: keepDetail ? zeroDetail(limits.deduce.solutions) : null,
    };
  }
  const model = buildModel(board, pieces, clues, ws);
  let bits = 0;
  for (let i = 0; i < model.freePieces.length; i += 1) {
    const rows = model.placementsPerPiece[i];
    if (rows === 0) {
      throw new UnsatisfiableError(`piece ${model.freePieces[i]} has no legal placement`);
    }
    bits += Math.log2(1 + rows);
  }
  const d = measureDeduction(model, limits.deduce);
  if (d.path === 'none') {
    throw new UnsatisfiableError('the clues have no solution');
  }
  if (d.path === 'capped') {
    throw new IncompleteRatingError('the deduction path was capped', {
      nodes: d.search.nodes,
      work: d.search.work,
      stop: /** @type {'node-cap' | 'work-cap'} */ (d.search.stop),
    });
  }
  const first = /** @type {NonNullable<typeof d.first>} */ (d.first);
  const detail = keepDetail ? copyDetail(d) : null;
  const census = /** @type {NonNullable<typeof d.census>} */ (d.census);
  const dlx = withDlx
    ? dlxDiagnostic(model, limits.dlx)
    : { B: 0, branchTrials: 0, rowTrials: 0, dlxStop: /** @type {MetricsV3['dlxStop']} */ ('skipped') };
  return {
    metrics: {
      U,
      R: model.freeCells,
      H: bits / U,
      B: dlx.B,
      branchTrials: dlx.branchTrials,
      rowTrials: dlx.rowTrials,
      dlxStop: dlx.dlxStop,
      searchStop: d.search.stop,
      F: first.F,
      E: first.E,
      rules: {
        R1: first.rules.R1, R2: first.rules.R2, R3: first.rules.R3, R4: first.rules.R4, R5: first.rules.R5,
        R6: first.rules.R6, R7: first.rules.R7, R8: first.rules.R8, R9: first.rules.R9,
      },
      deductionTier: first.deductionTier,
      tier: first.G > 0 ? 4 : first.deductionTier,
      G: first.G,
      info: first.info,
      Cmax: first.Cmax,
      Dmax: first.Dmax,
      Gt: d.search.Gt,
      nodes: d.search.nodes,
      work: d.search.work,
      S: d.count.S,
      solutionLimit: d.count.limit,
      solutions: /** @type {MetricsV3['solutions']} */ (d.count.solutions),
      censusComplete: census.complete,
      censusUndecided: census.undecided,
      censusNodes: census.nodes,
      censusWork: census.work,
      Gproved: first.Gproved,
    },
    saturated: false,
    detail,
  };
}

/**
 * The `difficulty-v2` rating, kept under its v2 name: stored `difficulty-v2` claims, the frozen Player sample and the
 * probe's `v2` field rate with it. The model is written literally, so it stays v2 when `MODEL` moves on.
 * @param {Board} board
 * @param {Piece[]} pieces
 * @param {Pose[]} clues
 * @param {Workspace} ws
 * @returns {RatingV2}
 */
export function rateV2(board, pieces, clues, ws) {
  const { metrics, saturated } = measureV2(board, pieces, clues, ws);
  const value = scoreV2(metrics.U, metrics.B);
  return { model: 'difficulty-v2', score: value, level: levelForScore(value).id, saturated, metrics };
}

/**
 * The `difficulty-v3` rating of a clue subset (design §7.10): `scoreV3` of `measureV3`. It never refuses a rating
 * and is never saturated; a rating whose census did not finish is an estimate and carries `censored: true`. Throws
 * `ModelError` for invalid input, `UnsatisfiableError` and `IncompleteRatingError` (a capped deduction path).
 * @param {Board} board
 * @param {Piece[]} pieces
 * @param {Pose[]} clues
 * @param {Workspace} ws
 * @returns {RatingV3}
 */
export function rate(board, pieces, clues, ws) {
  const { metrics } = measureV3Core(board, pieces, clues, ws, { deduce: DEDUCE, dlx: SCORE.caps }, false);
  return ratingOf(metrics);
}

/**
 * The `difficulty-v3` rating of a clue subset with the detail channel (RES-19): `rating` equals what `rate` returns
 * (the same errors) and `detail` is an owned copy of the deduction result of the same measurement, copied before
 * the workspace is reused; there is no second solve. Only the recorders of clue selection call it: claims, packs and
 * codes never hold a detail.
 * @param {Board} board
 * @param {Piece[]} pieces
 * @param {Pose[]} clues
 * @param {Workspace} ws
 * @returns {{ rating: RatingV3, detail: RatingDetail }}
 */
export function rateDetailed(board, pieces, clues, ws) {
  const { metrics, detail } = measureV3Core(board, pieces, clues, ws, { deduce: DEDUCE, dlx: SCORE.caps }, true);
  return { rating: ratingOf(metrics), detail: /** @type {RatingDetail} */ (detail) };
}

/**
 * The search rating of `selectClues` (P6): `rate()` without the DLX diagnostic; the same score, errors and work;
 * never stored.
 * @param {Board} board
 * @param {Piece[]} pieces
 * @param {Pose[]} clues
 * @param {Workspace} ws
 * @returns {RatingV3}
 */
export function rateLean(board, pieces, clues, ws) {
  const { metrics } = measureV3Core(board, pieces, clues, ws, { deduce: DEDUCE, dlx: SCORE.caps }, false, false);
  return ratingOf(metrics);
}

/**
 * Fills the DLX diagnostic of a lean rating (`rateLean`) with one traversal on a new model of the same clues: the
 * result equals `rate()` of them, key order included, and `rating` is not changed. Any other rating is returned as
 * it is.
 * @param {Board} board
 * @param {Piece[]} pieces
 * @param {Pose[]} clues
 * @param {RatingV3} rating
 * @param {Workspace} ws
 * @returns {RatingV3}
 */
export function completeDiagnostic(board, pieces, clues, rating, ws) {
  if (rating.metrics?.dlxStop !== 'skipped') {
    return rating;
  }
  const diagnostic = dlxDiagnostic(buildModel(board, pieces, clues, ws), SCORE.caps);
  return { ...rating, metrics: { ...rating.metrics, ...diagnostic } };
}

/**
 * @param {MetricsV3} metrics
 * @returns {RatingV3}
 */
function ratingOf(metrics) {
  const value = scoreV3(metrics);
  return {
    model: MODEL,
    score: value,
    level: levelForScore(value).id,
    saturated: false,
    ...(metrics.censusComplete ? {} : { censored: true }),
    metrics,
  };
}

/**
 * A rating is in band iff `min <= score < max`; there is no other acceptance rule.
 * @param {Rating} r
 * @param {Pick<Level, 'min' | 'max'>} target
 * @returns {boolean}
 */
export function inBand(r, target) {
  return r.score >= target.min && r.score < target.max;
}
