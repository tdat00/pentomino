// @ts-check
// Exact-cover tiling model: builds the packed model for (board, pieces, clues)
// from the shared placement planner, wraps the DLX search so every result is a
// complete layout (clues included, canonical piece order) and validates layouts
// independently of any solver. No clocks, storage or DOM; no per-row objects.
//
// A workspace holds one live model. Building another model in the same
// workspace overwrites the buffers, so the older model is marked stale and
// refuses to solve or decode.

import { ExactCover } from './dlx.js';
import { poseCells } from './geometry.js';
import { countPlacements, MAX_NONZEROS, MAX_ROWS, preparePlacements } from './placements.js';
import { fillArena } from './workspace.js';

/** @typedef {import('./types.js').XY} XY */
/** @typedef {import('./types.js').Board} Board */
/** @typedef {import('./types.js').Piece} Piece */
/** @typedef {import('./types.js').Pose} Pose */
/** @typedef {import('./rng.js').Rng} Rng */
/** @typedef {import('./workspace.js').Workspace} Workspace */

/**
 * Packed model. The typed arrays are views into the workspace that built it.
 * `rowPiece` indexes `freePieces` (canonical order), not the caller's array.
 * @typedef {object} Model
 * @property {ExactCover} cover
 * @property {Int16Array} rowPiece
 * @property {Uint8Array} rowT Transform index 0..7 (`4 * mirrored + turn`) of each row.
 * @property {Int16Array} rowX Pose origin x of each row.
 * @property {Int16Array} rowY Pose origin y of each row.
 * @property {string[]} freePieces Free piece IDs in canonical column order.
 * @property {number} freeCells Free board cells (cell columns).
 * @property {Int32Array} placementsPerPiece Rows per free piece (L_i), canonical order.
 * @property {Pose[]} clues Copies of the clue poses.
 * @property {string[]} pieceOrder Canonical order of every piece ID, clued or free.
 */

export { ModelError } from './placements.js';

/** @type {WeakMap<Workspace, Model>} */
const LIVE = new WeakMap();

/**
 * Builds the exact-cover model. Throws `ModelError`: `invalid-input`,
 * `invalid-clue`, or `model-too-large` (over 600,000 rows, 5,000,000 nonzeros
 * or the workspace capacity) before anything large is allocated.
 * @param {Board} b
 * @param {Piece[]} pieces
 * @param {Pose[]} clues
 * @param {Workspace} ws
 * @returns {Model}
 */
export function buildModel(b, pieces, clues, ws) {
  LIVE.delete(ws);
  const plan = preparePlacements(b, pieces, clues);
  const counts = countPlacements(plan, { maxRows: MAX_ROWS, maxNonzeros: MAX_NONZEROS });
  const arena = ws.reserve(plan, counts);
  fillArena(plan, arena);
  const model = {
    cover: new ExactCover(ws, arena.columns, arena.rowCols, arena.rowStart, arena.rows),
    rowPiece: arena.rowPiece,
    rowT: arena.rowT,
    rowX: arena.rowX,
    rowY: arena.rowY,
    freePieces: plan.freePieceIds,
    freeCells: plan.freeCells,
    placementsPerPiece: arena.placementsPerPiece,
    clues: plan.clues,
    pieceOrder: plan.pieceOrder,
  };
  LIVE.set(ws, model);
  return model;
}

/**
 * @param {Model} m
 */
function assertLive(m) {
  if (LIVE.get(m.cover.ws) !== m) {
    throw new Error('stale model: its workspace has built another model since');
  }
}

/**
 * Pose of a model row.
 * @param {Model} m
 * @param {number} row
 * @returns {Pose}
 */
export function rowPose(m, row) {
  if (!Number.isInteger(row) || row < 0 || row >= m.cover.rowCount) {
    throw new RangeError(`row ${row} is outside 0..${m.cover.rowCount - 1}`);
  }
  assertLive(m);
  const t = m.rowT[row];
  return {
    piece: m.freePieces[m.rowPiece[row]],
    x: m.rowX[row],
    y: m.rowY[row],
    turn: /** @type {import('./types.js').Turn} */ (t & 3),
    mirrored: t >= 4,
  };
}

/**
 * @param {Model} m
 * @returns {Map<string, number>}
 */
function orderIndex(m) {
  return new Map(m.pieceOrder.map((id, i) => [id, i]));
}

/**
 * Complete layout: the clues plus the poses of the chosen rows, sorted by
 * canonical piece order.
 * @param {Model} m
 * @param {Int32Array} rows
 * @param {Map<string, number>} order
 * @returns {Pose[]}
 */
function decode(m, rows, order) {
  const layout = m.clues.map((c) => ({ ...c }));
  for (let i = 0; i < rows.length; i += 1) {
    layout.push(rowPose(m, rows[i]));
  }
  layout.sort((a, c) => /** @type {number} */ (order.get(a.piece)) - /** @type {number} */ (order.get(c.piece)));
  return layout;
}

/**
 * First solution in canonical order, or seeded when `rng` is given. `layout`
 * is null when none was found; `exhausted` is true only when the whole space
 * was searched, so a null layout with `exhausted` proves unsatisfiability.
 * @param {Model} m
 * @param {{ rng?: Rng, rowTrialLimit: number, branchTrialLimit?: number }} o
 * @returns {{ layout: Pose[] | null, rowTrials: number, branchTrials: number, exhausted: boolean,
 *   stop: 'exhausted' | 'solution-limit' | 'row-limit' | 'branch-limit' }}
 */
export function solveFirst(m, o) {
  assertLive(m);
  const r = m.cover.solve({
    maxSolutions: 1,
    rowTrialLimit: o.rowTrialLimit,
    branchTrialLimit: o.branchTrialLimit,
    rng: o.rng ?? null,
  });
  return {
    layout: r.found > 0 ? decode(m, r.solutions[0], orderIndex(m)) : null,
    rowTrials: r.rowTrials,
    branchTrials: r.branchTrials,
    exhausted: r.exhausted,
    stop: r.stop,
  };
}

/**
 * Raw coordinate/piece assignment count, canonical order, no symmetry
 * quotient. Stops after `cap` solutions or `rowTrialLimit` row trials. One
 * found plus `exhausted` proves uniqueness; two found proves multiple; zero
 * found plus `exhausted` proves unsatisfiable; anything else proves nothing.
 * `witnesses` are complete layouts of the first `witnessLimit` (default
 * `cap`) solutions found.
 * @param {Model} m
 * @param {{ cap: number, rowTrialLimit: number, witnessLimit?: number }} o
 * @returns {{ found: number, exhausted: boolean, witnesses: Pose[][] }}
 */
export function countSolutions(m, o) {
  assertLive(m);
  const r = m.cover.solve({ maxSolutions: o.cap, rowTrialLimit: o.rowTrialLimit });
  const order = orderIndex(m);
  const limit = Math.min(r.solutions.length, o.witnessLimit ?? o.cap);
  /** @type {Pose[][]} */
  const witnesses = [];
  for (let i = 0; i < limit; i += 1) {
    witnesses.push(decode(m, r.solutions[i], order));
  }
  return { found: r.found, exhausted: r.exhausted, witnesses };
}

/**
 * @param {unknown} pose
 * @returns {boolean}
 */
function isPoseShape(pose) {
  const p = /** @type {Partial<Pose> | null} */ (pose);
  return typeof p === 'object' && p !== null && typeof p.piece === 'string'
    && Number.isInteger(p.x) && Number.isInteger(p.y)
    && (p.turn === 0 || p.turn === 1 || p.turn === 2 || p.turn === 3) && typeof p.mirrored === 'boolean';
}

/**
 * @param {unknown} piece
 * @returns {boolean}
 */
function isPieceShape(piece) {
  const p = /** @type {Partial<Piece> | null} */ (piece);
  return typeof p === 'object' && p !== null && typeof p.id === 'string' && Array.isArray(p.cells)
    && p.cells.length > 0 && p.cells.every((c) => Array.isArray(c) && Number.isInteger(c[0]) && Number.isInteger(c[1]));
}

/**
 * Independent O(cells) check of a complete layout: exactly one pose per piece
 * ID, every transformed footprint on active cells, no overlap, and the union
 * equals the active mask. Never throws on malformed input.
 * @param {Board} b
 * @param {Piece[]} pieces
 * @param {Pose[]} layout
 * @returns {boolean}
 */
export function isValidLayout(b, pieces, layout) {
  if (typeof b !== 'object' || b === null || !(b.active instanceof Uint8Array)
    || !Number.isInteger(b.width) || !Number.isInteger(b.height) || b.active.length !== b.width * b.height
    || !Array.isArray(pieces) || !Array.isArray(layout) || layout.length !== pieces.length
    || !pieces.every(isPieceShape)) {
    return false;
  }
  const byId = new Map(pieces.map((p) => [p.id, p]));
  if (byId.size !== pieces.length) {
    return false;
  }
  let activeTotal = 0;
  for (let i = 0; i < b.active.length; i += 1) {
    activeTotal += b.active[i] === 1 ? 1 : 0;
  }
  const covered = new Uint8Array(b.active.length);
  const used = new Set();
  let total = 0;
  for (const pose of layout) {
    if (!isPoseShape(pose) || used.has(pose.piece)) {
      return false;
    }
    const piece = byId.get(pose.piece);
    if (piece === undefined) {
      return false;
    }
    used.add(pose.piece);
    for (const [x, y] of poseCells(piece, pose)) {
      if (x < 0 || y < 0 || x >= b.width || y >= b.height) {
        return false;
      }
      const at = y * b.width + x;
      if (b.active[at] !== 1 || covered[at] === 1) {
        return false;
      }
      covered[at] = 1;
      total += 1;
    }
  }
  return used.size === pieces.length && total === activeTotal;
}
