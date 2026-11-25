// @ts-check
// Clue-selection primitives shared by the `gen-v3` and `gen-v4` selectors (design §6.10, §6.11).

import { activeCount } from './board.js';
import { poseCells } from './geometry.js';
import { BUDGETS } from './policy.js';
import { buildModel, countSolutions } from './tiling.js';

/** @typedef {import('./types.js').Board} Board */
/** @typedef {import('./types.js').Piece} Piece */
/** @typedef {import('./types.js').Pose} Pose */
/** @typedef {import('./types.js').Rating} Rating */
/** @typedef {import('./types.js').Certificate} Certificate */
/** @typedef {import('./levels.js').Level} Level */
/** @typedef {import('./rng.js').Rng} Rng */
/** @typedef {import('./workspace.js').Workspace} Workspace */

/**
 * @typedef {object} Candidate
 * @property {number[]} idx Ascending layout positions of the clued pieces.
 * @property {Pose[]} clues
 * @property {Rating} rating
 * @property {string} key Symmetry-aware clue key.
 * @property {number} seq Subset ordinal (RES-27).
 */

export const SMALL_AREA = 200;

/**
 * Thrown when a recorded skip list does not fit the run it is replayed in (`replaySkips`, RES-27): a repair ordinal
 * whose finish ended before the excluded-key check is `unreachable`; an entry left unconsumed when `selectClues`
 * returns is `unused`.
 */
export class SkipReplayError extends Error {
  /**
   * @param {'unreachable' | 'unused'} reason
   * @param {'subsets' | 'repairs'} list
   * @param {number} ordinal
   */
  constructor(reason, list, ordinal) {
    super(`recorded ${list} skip ${ordinal} is ${reason}`);
    this.name = 'SkipReplayError';
    this.code = 'replay-skips';
    this.reason = reason;
    this.list = list;
    this.ordinal = ordinal;
  }
}

/**
 * Row limit of a raw uniqueness count: 10,000 up to 200 active cells, else 2,000.
 * @param {Board} board
 * @returns {number}
 */
export function countRowLimit(board) {
  return activeCount(board) <= SMALL_AREA ? BUDGETS.countRowsSmall : BUDGETS.countRowsLarge;
}

/**
 * Raw proof status of a clue set: no board-symmetry quotient, at most two
 * solutions, at most `rowLimit` row trials.
 * @param {Board} board
 * @param {Piece[]} pieces
 * @param {Pose[]} clues
 * @param {Workspace} ws
 * @param {number} rowLimit
 * @returns {Certificate}
 */
export function certify(board, pieces, clues, ws, rowLimit) {
  const model = buildModel(board, pieces, clues, ws);
  const c = countSolutions(model, { cap: 2, rowTrialLimit: rowLimit, witnessLimit: 0 });
  /** @type {Certificate['status']} */
  let status = 'not-proved';
  if (c.found >= 2) {
    status = 'multiple';
  } else if (c.exhausted) {
    status = c.found === 1 ? 'unique' : 'unsatisfiable';
  }
  return { status, model: 'dlx-v1', rowLimit, verified: true };
}

/**
 * @param {Piece} piece
 * @param {Pose} pose
 * @returns {string}
 */
export function footprint(piece, pose) {
  return poseCells(piece, pose).map(([x, y]) => y * 65536 + x).sort((a, b) => a - b).join(',');
}

/**
 * Counterexample-guided repair: while two raw completions exist, clue the
 * smallest planted piece whose footprint differs in another solution. Returns
 * the clues (the given ones first, then the added ones) once one completion
 * exists and the search was exhaustive; null when that cannot be proved. `hooks` only observe: `onAdd` is called
 * after each added clue with the piece id and a copy of the current clue list, `onCount` right after each count
 * with its row trials (the work meter).
 * @param {Board} board
 * @param {Piece[]} pieces
 * @param {Pose[]} layout
 * @param {Pose[]} clues
 * @param {Rng} rng
 * @param {Workspace} ws
 * @param {number} rowLimit
 * @param {{ onAdd?: (pieceId: string, clues: Pose[]) => void, onCount?: (rowTrials: number) => void }} [hooks]
 * @returns {Pose[] | null}
 */
export function makeUnique(board, pieces, layout, clues, rng, ws, rowLimit, hooks = {}) {
  const byId = new Map(pieces.map((p) => [p.id, p]));
  const planted = new Map(layout.map((pose) => [pose.piece, pose]));
  const maxClues = pieces.length - 2;
  let current = clues.slice();
  while (current.length <= maxClues) {
    const model = buildModel(board, pieces, current, ws);
    const c = countSolutions(model, { cap: 2, rowTrialLimit: rowLimit, witnessLimit: 2 });
    hooks.onCount?.(c.rowTrials);
    if (c.found === 1 && c.exhausted) {
      return current;
    }
    if (c.found < 2) {
      return null;
    }
    const clued = new Set(current.map((p) => p.piece));
    const other = c.witnesses.find((w) => w.some((pose) => {
      const piece = /** @type {Piece} */ (byId.get(pose.piece));
      return footprint(piece, pose) !== footprint(piece, /** @type {Pose} */ (planted.get(pose.piece)));
    }));
    if (other === undefined) {
      return null;
    }
    /** @type {Piece[]} */
    const differing = [];
    for (const pose of other) {
      const piece = /** @type {Piece} */ (byId.get(pose.piece));
      if (!clued.has(pose.piece)
        && footprint(piece, pose) !== footprint(piece, /** @type {Pose} */ (planted.get(pose.piece)))) {
        differing.push(piece);
      }
    }
    if (differing.length === 0) {
      return null;
    }
    const smallest = Math.min(...differing.map((p) => p.cells.length));
    const ties = differing.filter((p) => p.cells.length === smallest);
    const chosen = ties.length === 1 ? ties[0] : rng.pick(ties);
    current = [...current, /** @type {Pose} */ (planted.get(chosen.id))];
    hooks.onAdd?.(chosen.id, current.slice());
  }
  return null;
}

/**
 * @param {Pick<Level, 'min' | 'max'>} target
 * @param {Rating} r
 * @returns {number} 0 inside the band, else the distance to the nearest in-band score.
 */
export function bandDistance(target, r) {
  if (r.score < target.min) {
    return target.min - r.score;
  }
  return r.score >= target.max ? r.score - target.max + 1 : 0;
}

/**
 * @param {Pick<Level, 'min' | 'max'>} target
 * @param {Candidate[]} list
 * @returns {Candidate[]}
 */
export function ranked(target, list) {
  const center = (target.min + target.max) / 2;
  return list.slice().sort((a, b) => bandDistance(target, a.rating) - bandDistance(target, b.rating)
    || Math.abs(a.rating.score - center) - Math.abs(b.rating.score - center)
    || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

/**
 * @param {Rating} r
 * @returns {boolean} true when the rating reports no proved decisive guess (`metrics.Gproved === 0`).
 */
export function noProvedGuess(r) {
  const m = /** @type {unknown} */ (r.metrics);
  return typeof m === 'object' && m !== null && Object.hasOwn(m, 'Gproved')
    && /** @type {{ Gproved?: unknown }} */ (m).Gproved === 0;
}

/**
 * Clues in layout order.
 * @param {Pose[]} layout
 * @param {Pose[]} clues
 * @returns {Pose[]}
 */
export function sortLike(layout, clues) {
  const wanted = new Set(clues.map((c) => c.piece));
  return layout.filter((p) => wanted.has(p.piece));
}
