// @ts-check
// Shared difficulty score (`difficulty-v2`, design §7). The score combines the
// number of pieces to place with the bounded canonical DLX effort until its
// first solution. Only work counters enter the score: no clocks, no randomness.

import { isValidLayout, buildModel, solveFirst } from './tiling.js';
import { levelForScore } from './levels.js';
import { SCORE } from './policy.js';

/** @typedef {import('./types.js').Board} Board */
/** @typedef {import('./types.js').Piece} Piece */
/** @typedef {import('./types.js').Pose} Pose */
/** @typedef {import('./types.js').Metrics} Metrics */
/** @typedef {import('./types.js').Rating} Rating */
/** @typedef {import('./levels.js').Level} Level */
/** @typedef {import('./workspace.js').Workspace} Workspace */

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
