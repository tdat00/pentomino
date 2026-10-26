// @ts-check
// Exact-cover tiling model: builds the packed model for (board, pieces, clues), wraps the DLX
// search so results are complete layouts, validates layouts independently of any solver, and
// adds the seeded discovery searches (restarts, local re-tiling). No clocks, storage or DOM.
//
// A workspace holds one live model: building another overwrites the buffers, so the older
// model is marked stale and refuses to solve or decode.

import { ExactCover } from './dlx.js';
import { poseCells } from './geometry.js';
import { countPlacements, MAX_NONZEROS, MAX_ROWS, preparePlacements } from './placements.js';
import { BUDGETS } from './policy.js';
import { fillArena } from './workspace.js';

/** @typedef {import('./types.js').XY} XY */
/** @typedef {import('./types.js').Board} Board */
/** @typedef {import('./types.js').Piece} Piece */
/** @typedef {import('./types.js').Pose} Pose */
/** @typedef {import('./types.js').PieceSet} PieceSet */
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
 * @param {{ rng?: Rng, rowTrialLimit: number, branchTrialLimit?: number,
 *   onProgress?: (rowTrials: number) => void, progressEvery?: number }} o
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
    onProgress: o.onProgress,
    progressEvery: o.progressEvery,
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

/**
 * Luby restart multiplier for the one-based index `i`: 1, 1, 2, 1, 1, 2, 4, 1, ...
 * @param {number} i
 * @returns {number}
 */
export function luby(i) {
  if (!Number.isSafeInteger(i) || i < 1) {
    throw new RangeError('luby index must be a positive integer');
  }
  let index = i;
  for (;;) {
    let k = 1;
    while (2 ** k - 1 < index) {
      k += 1;
    }
    if (index === 2 ** k - 1) {
      return 2 ** (k - 1);
    }
    index = index - 2 ** (k - 1) + 1;
  }
}

/**
 * Restart report of `randomTiling`, for tests and progress.
 * @typedef {object} RestartInfo
 * @property {number} index One-based restart number.
 * @property {number} limit Row-trial limit given to this restart.
 * @property {number} rowTrials Row trials it used.
 * @property {boolean} found
 * @property {boolean} exhausted
 */

/**
 * Seeded global random tiling with Luby restarts. Restart `i` searches with
 * `rng.derive('r' + i)` and at most `restartBase * luby(i)` row trials, clamped
 * to what is left of `totalRowTrials`. Returns null when the budget is spent or
 * a restart exhausts its space without a solution (that proves none exists, so
 * further restarts could only repeat it). Always finite.
 * @param {Board} board
 * @param {Piece[]} pieces
 * @param {Rng} rng
 * @param {Workspace} ws
 * @param {{ clues?: Pose[], totalRowTrials: number, restartBase: number, onRestart?: (info: RestartInfo) => void }} o
 * @returns {Pose[] | null}
 */
export function randomTiling(board, pieces, rng, ws, o) {
  if (!Number.isInteger(o.totalRowTrials) || o.totalRowTrials < 0 || !Number.isInteger(o.restartBase) || o.restartBase < 1) {
    throw new RangeError('totalRowTrials must be a nonnegative integer and restartBase a positive integer');
  }
  const model = buildModel(board, pieces, o.clues ?? [], ws);
  let spent = 0;
  for (let i = 1; spent < o.totalRowTrials; i += 1) {
    const limit = Math.min(o.restartBase * luby(i), o.totalRowTrials - spent);
    const r = solveFirst(model, { rng: rng.derive(`r${i}`), rowTrialLimit: limit });
    o.onRestart?.({ index: i, limit, rowTrials: r.rowTrials, found: r.layout !== null, exhausted: r.exhausted });
    if (r.layout !== null) {
      return r.layout;
    }
    if (r.exhausted) {
      return null;
    }
    // A restart that reports no work still consumes budget so the loop ends.
    spent += Math.max(1, r.rowTrials);
  }
  return null;
}

/**
 * @param {Piece} piece
 * @param {Pose} pose
 * @param {number} width
 * @returns {string}
 */
function footprintKey(piece, pose, width) {
  return poseCells(piece, pose).map(([x, y]) => y * width + x).sort((a, b) => a - b).join(',');
}

/**
 * Local re-tiling: releases the `cluster` pieces, keeps every other pose fixed and searches the
 * released cells with the seeded solver (use the scratch workspace). Returns a complete layout,
 * sorted like `pieces`, with one genuinely different cluster placement picked from at most
 * `maxSolutions` completions, or null when none differs.
 * @param {Board} board
 * @param {Piece[]} pieces
 * @param {Pose[]} layout Complete valid layout.
 * @param {number[]} cluster Distinct indices into `pieces`.
 * @param {Rng} rng
 * @param {Workspace} ws
 * @param {{ rowTrialLimit: number, maxSolutions: number }} o
 * @returns {Pose[] | null}
 */
export function lnsStep(board, pieces, layout, cluster, rng, ws, o) {
  if (cluster.length === 0 || new Set(cluster).size !== cluster.length
    || !cluster.every((i) => Number.isInteger(i) && i >= 0 && i < pieces.length)) {
    throw new RangeError('cluster must be distinct, non-empty indices into pieces');
  }
  if (!isValidLayout(board, pieces, layout)) {
    throw new RangeError('layout is not a complete valid arrangement of the pieces');
  }
  const released = new Set(cluster.map((i) => pieces[i].id));
  const byId = new Map(pieces.map((p) => [p.id, p]));
  const fixed = layout.filter((p) => !released.has(p.piece)).map((p) => ({ ...p }));
  const before = new Map(layout.filter((p) => released.has(p.piece))
    .map((p) => [p.piece, footprintKey(/** @type {Piece} */ (byId.get(p.piece)), p, board.width)]));
  const model = buildModel(board, pieces, fixed, ws);
  const r = model.cover.solve({ maxSolutions: o.maxSolutions, rowTrialLimit: o.rowTrialLimit, rng });
  /** @type {Pose[][]} */
  const alternatives = [];
  for (const rows of r.solutions) {
    const poses = Array.from(rows, (row) => rowPose(model, row));
    if (poses.some((p) => footprintKey(/** @type {Piece} */ (byId.get(p.piece)), p, board.width) !== before.get(p.piece))) {
      alternatives.push(poses);
    }
  }
  if (alternatives.length === 0) {
    return null;
  }
  const order = new Map(pieces.map((p, i) => [p.id, i]));
  const next = [...fixed, ...rng.pick(alternatives)]
    .sort((a, c) => /** @type {number} */ (order.get(a.piece)) - /** @type {number} */ (order.get(c.piece)));
  return isValidLayout(board, pieces, next) ? next : null;
}

/**
 * Edge adjacency of the pieces in a layout; entry `i` lists the piece indices
 * touching `pieces[i]`, ascending.
 * @param {Board} board
 * @param {Piece[]} pieces
 * @param {Pose[]} layout
 * @returns {number[][]}
 */
function pieceAdjacency(board, pieces, layout) {
  const { width, height } = board;
  const owner = new Int32Array(width * height).fill(-1);
  const index = new Map(pieces.map((p, i) => [p.id, i]));
  for (const pose of layout) {
    const i = /** @type {number} */ (index.get(pose.piece));
    for (const [x, y] of poseCells(pieces[i], pose)) {
      owner[y * width + x] = i;
    }
  }
  const adjacent = pieces.map(() => /** @type {Set<number>} */ (new Set()));
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const a = owner[y * width + x];
      for (const b of [x + 1 < width ? owner[y * width + x + 1] : -1, y + 1 < height ? owner[(y + 1) * width + x] : -1]) {
        if (a >= 0 && b >= 0 && a !== b) {
          adjacent[a].add(b);
          adjacent[b].add(a);
        }
      }
    }
  }
  return adjacent.map((s) => [...s].sort((a, b) => a - b));
}

const MACRO_BROADEN_MAX = 9;

/**
 * Cluster to release at walk step `s` (design §6.7) and its row-trial limit.
 * Macro sets release the current pieces of one macro region, widened by their
 * neighbours up to nine pieces every eighth step; flat and imported sets release
 * a seeded BFS neighbourhood whose size grows while the walk is stuck.
 * @param {PieceSet} set
 * @param {Pose[]} layout
 * @param {number} s Zero-based step.
 * @param {number} stuck Consecutive failed steps.
 * @param {Rng} rng
 * @returns {{ cluster: number[], rows: number }}
 */
export function clusterFor(set, layout, s, stuck, rng) {
  const { board, pieces } = set;
  const adjacent = pieceAdjacency(board, pieces, layout);
  const macro = set.macroRegion;
  if (macro !== null && macro.length === pieces.length) {
    const regions = [...new Set(macro)].sort((a, b) => a - b);
    const region = regions[rng.int(regions.length)];
    const cluster = pieces.map((_, i) => i).filter((i) => macro[i] === region);
    if (s % 8 === 7) {
      const inside = new Set(cluster);
      const around = [...new Set(cluster.flatMap((i) => adjacent[i]))].filter((j) => !inside.has(j)).sort((a, b) => a - b);
      rng.shuffle(around);
      for (const j of around) {
        if (cluster.length >= MACRO_BROADEN_MAX) {
          break;
        }
        cluster.push(j);
      }
    }
    return { cluster: cluster.sort((a, b) => a - b), rows: BUDGETS.lnsRowsMacro };
  }
  const want = Math.min(pieces.length, 6 + rng.int(8) + 2 * Math.floor(stuck / 4));
  const cluster = [rng.int(pieces.length)];
  const seen = new Set(cluster);
  for (let head = 0; head < cluster.length && cluster.length < want; head += 1) {
    const around = adjacent[cluster[head]].filter((j) => !seen.has(j));
    rng.shuffle(around);
    for (const j of around) {
      if (cluster.length < want) {
        seen.add(j);
        cluster.push(j);
      }
    }
  }
  return { cluster: cluster.sort((a, b) => a - b), rows: BUDGETS.lnsRowsFlat };
}

/**
 * Walk of `steps` local re-tilings from `start`, one scratch-workspace search
 * per step. A failed step widens flat clusters; a success resets that count.
 * Every intermediate layout is complete and valid, so the result is too.
 * @param {PieceSet} set
 * @param {Pose[]} start Complete valid layout.
 * @param {Rng} rng
 * @param {Workspace} ws
 * @param {number} [steps]
 * @returns {Pose[]}
 */
export function lnsWalk(set, start, rng, ws, steps = BUDGETS.lnsSteps) {
  let current = start;
  let stuck = 0;
  for (let s = 0; s < steps; s += 1) {
    const { cluster, rows } = clusterFor(set, current, s, stuck, rng);
    const next = lnsStep(set.board, set.pieces, current, cluster, rng, ws, { rowTrialLimit: rows, maxSolutions: 8 });
    if (next === null) {
      stuck += 1;
    } else {
      current = next;
      stuck = 0;
    }
  }
  return current;
}
