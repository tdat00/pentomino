// @ts-check
// Shared difficulty score (`difficulty-v2`, design §7): pieces to place plus the bounded
// canonical DLX effort until the first solution. Only work counters enter the score: no
// clocks, no randomness.

import { isValidLayout, buildModel, solveFirst } from './tiling.js';
import { levelForScore } from './levels.js';
import { SCORE, SCORE_V3 } from './policy.js';

/** @typedef {import('./types.js').Board} Board */
/** @typedef {import('./types.js').Piece} Piece */
/** @typedef {import('./types.js').Pose} Pose */
/** @typedef {import('./types.js').Metrics} Metrics */
/** @typedef {import('./types.js').MetricsV3} MetricsV3 */
/** @typedef {import('./types.js').Rating} Rating */
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

export const MODEL = 'difficulty-v2';

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
 * `D = round(2U + 8 log10(1 + B))`, rounded once; `U = 0` scores 0. `B` is the
 * effective (already capped) branch count.
 * @param {number} U Pieces left to place.
 * @param {number} B Effective branch trials.
 * @returns {number}
 */
export function score(U, B) {
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
 * Metrics of a board, its set and a clue subset. Throws `ModelError` for invalid
 * input and `UnsatisfiableError` when the clues cannot be completed. `limits`
 * lowers the work caps for tests; the effective B of a capped search stays 5,000.
 * @param {Board} board
 * @param {Piece[]} pieces
 * @param {Pose[]} clues
 * @param {Workspace} ws
 * @param {{ branch: number, rows: number }} [limits]
 * @returns {{ metrics: Metrics, saturated: boolean }}
 */
export function measure(board, pieces, clues, ws, limits = SCORE.caps) {
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
 * @param {Board} board
 * @param {Piece[]} pieces
 * @param {Pose[]} clues
 * @param {Workspace} ws
 * @returns {Rating}
 */
export function rate(board, pieces, clues, ws) {
  const { metrics, saturated } = measure(board, pieces, clues, ws);
  const value = score(metrics.U, metrics.B);
  return { model: MODEL, score: value, level: levelForScore(value).id, saturated, metrics };
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
