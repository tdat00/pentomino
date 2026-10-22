// @ts-check
// Canonical placement planning for the exact-cover model: validates clues,
// fixes the column order and enumerates every legal piece placement in the one
// canonical row order. Counting and filling walk the same enumeration, so row
// and nonzero counts always equal what a fill writes. Pure and dependency-free
// apart from T03 geometry; no per-row objects are ever created.
//
// Column order: free board cells in (y, x) order, then the free pieces sorted
// by (size, numeric canonical shape tuple, id). Row order: by piece column,
// then by the sorted absolute cell tuple. Because cell columns ascend in (y, x),
// that equals "first occupied cell in (y, x) order, then the orientation's
// offsets relative to that cell, compared numerically", which is how the walk
// enumerates, so no sort (and no sort scratch memory) is needed.

import { distinctOrientations, normalizeCells, poseCells } from './geometry.js';

/** @typedef {import('./types.js').XY} XY */
/** @typedef {import('./types.js').Board} Board */
/** @typedef {import('./types.js').Piece} Piece */
/** @typedef {import('./types.js').Pose} Pose */

/**
 * One distinct orientation. Offsets are relative to its first cell in (y, x)
 * order, so `dy[0] = 0`, `dx[0] = 0` and the pose origin of a placement whose
 * first cell lands on (ax, ay) is `(ax - firstX, ay)`.
 * @typedef {object} PlanOrientation
 * @property {number} t Smallest transform index 0..7 producing this cell set.
 * @property {number} firstX Normalized x of the first cell (its y is 0).
 * @property {Int32Array} dx
 * @property {Int32Array} dy
 */

/**
 * @typedef {object} PlacementPlan
 * @property {number} width
 * @property {number} height
 * @property {number} freeCells Board cells that are active and not covered by a clue.
 * @property {number} freePieceCount
 * @property {number} columns `freeCells + freePieceCount`; cell columns first.
 * @property {Int32Array} cellColumn Column of each board cell (`y * width + x`), or -1.
 * @property {string[]} freePieceIds Canonical order of the free pieces (= piece columns).
 * @property {number[]} freePieceSource Index into the caller's `pieces` for each free piece.
 * @property {string[]} pieceOrder Canonical order of all piece IDs, clued or free.
 * @property {number[]} orderSource Index into the caller's `pieces` for each `pieceOrder` entry.
 * @property {Int32Array} pieceSizes Cell count of each free piece.
 * @property {Pose[]} clues Copied valid clue poses, in the caller's order.
 * @property {PlanOrientation[][]} orientations Per free piece, sorted by relative offsets.
 */

/** Hard model limits shared with `workspace.js` and the T07 model builder. */
export const MAX_ROWS = 600000;
export const MAX_NONZEROS = 5000000;
const MAX_CELLS = 1 << 16;
const MAX_PIECES = 32767;
const MAX_SIDE = 32767;

/**
 * Typed model error. Codes: `model-too-large`, `invalid-clue`, `invalid-input`.
 */
export class ModelError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   * @param {Record<string, number>} [details]
   */
  constructor(code, message, details) {
    super(message);
    this.name = 'ModelError';
    this.code = code;
    this.details = details ?? {};
  }
}

/**
 * @param {XY[]} a Normalized cell lists of equal or different length.
 * @param {XY[]} b
 * @returns {number}
 */
function compareShapes(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i += 1) {
    const d = a[i][1] - b[i][1] || a[i][0] - b[i][0];
    if (d !== 0) {
      return d;
    }
  }
  return a.length - b.length;
}

/**
 * Numeric canonical shape: the smallest normalized orientation.
 * @param {XY[]} cells
 * @returns {XY[]}
 */
function canonicalShape(cells) {
  /** @type {XY[] | null} */
  let best = null;
  for (const { cells: variant } of distinctOrientations(cells)) {
    if (best === null || compareShapes(variant, best) < 0) {
      best = variant;
    }
  }
  return best ?? [];
}

/** @param {unknown} v */
const isInt = (v) => Number.isInteger(v);

/**
 * @param {Board} board
 */
function checkBoard(board) {
  if (typeof board !== 'object' || board === null || !isInt(board.width) || !isInt(board.height)
    || board.width < 1 || board.height < 1 || board.width > MAX_SIDE || board.height > MAX_SIDE
    || !(board.active instanceof Uint8Array) || board.active.length !== board.width * board.height) {
    throw new ModelError('invalid-input', 'board must have positive integer sides and a matching active mask');
  }
  if (board.width * board.height > MAX_CELLS) {
    throw new ModelError('model-too-large', `board has more than ${MAX_CELLS} cells`, { cells: board.width * board.height });
  }
}

/**
 * Validates the input and builds the canonical plan. Clue problems (unknown or
 * repeated pieces, blocked or out-of-range cells, overlaps) are rejected here,
 * before any large buffer exists.
 * @param {Board} board
 * @param {Piece[]} pieces
 * @param {Pose[]} clues
 * @returns {PlacementPlan}
 */
export function preparePlacements(board, pieces, clues) {
  checkBoard(board);
  if (!Array.isArray(pieces) || !Array.isArray(clues)) {
    throw new ModelError('invalid-input', 'pieces and clues must be arrays');
  }
  if (pieces.length > MAX_PIECES) {
    throw new ModelError('model-too-large', `more than ${MAX_PIECES} pieces`, { pieces: pieces.length });
  }
  const { width, height } = board;

  /** @type {Map<string, number>} */
  const byId = new Map();
  pieces.forEach((piece, index) => {
    if (typeof piece?.id !== 'string' || !Array.isArray(piece.cells) || piece.cells.length === 0
      || !piece.cells.every((c) => Array.isArray(c) && isInt(c[0]) && isInt(c[1]))) {
      throw new ModelError('invalid-input', `piece ${index} needs an id and a nonempty list of integer cells`);
    }
    if (byId.has(piece.id)) {
      throw new ModelError('invalid-input', `duplicate piece id ${piece.id}`);
    }
    byId.set(piece.id, index);
  });

  const cellColumn = new Int32Array(width * height);
  for (let i = 0; i < cellColumn.length; i += 1) {
    cellColumn[i] = board.active[i] === 1 ? 0 : -1;
  }
  /** @type {Set<string>} */
  const clued = new Set();
  /** @type {Pose[]} */
  const clueCopy = [];
  for (const [index, pose] of clues.entries()) {
    const piece = byId.has(pose?.piece) ? pieces[/** @type {number} */ (byId.get(pose.piece))] : null;
    if (piece === null) {
      throw new ModelError('invalid-clue', `clue ${index} names unknown piece ${String(pose?.piece)}`);
    }
    if (clued.has(piece.id)) {
      throw new ModelError('invalid-clue', `piece ${piece.id} is clued more than once`);
    }
    if (!isInt(pose.x) || !isInt(pose.y) || ![0, 1, 2, 3].includes(pose.turn) || typeof pose.mirrored !== 'boolean') {
      throw new ModelError('invalid-clue', `clue ${index} has an invalid pose`);
    }
    clued.add(piece.id);
    for (const [x, y] of poseCells(piece, pose)) {
      if (x < 0 || y < 0 || x >= width || y >= height || cellColumn[y * width + x] === -1) {
        throw new ModelError('invalid-clue', `clue ${index} covers blocked or out-of-range cell ${x},${y}`);
      }
      if (cellColumn[y * width + x] === 1) {
        throw new ModelError('invalid-clue', `clue ${index} overlaps another clue at ${x},${y}`);
      }
      cellColumn[y * width + x] = 1;
    }
    clueCopy.push({ piece: pose.piece, x: pose.x, y: pose.y, turn: pose.turn, mirrored: pose.mirrored });
  }

  let freeCells = 0;
  for (let i = 0; i < cellColumn.length; i += 1) {
    cellColumn[i] = cellColumn[i] === 0 ? freeCells++ : -1;
  }

  const shapes = pieces.map((piece) => canonicalShape(/** @type {XY[]} */ (piece.cells)));
  const order = pieces.map((_, i) => i).sort((a, b) =>
    shapes[a].length - shapes[b].length || compareShapes(shapes[a], shapes[b])
    || (pieces[a].id < pieces[b].id ? -1 : pieces[a].id > pieces[b].id ? 1 : 0));
  const freeOrder = order.filter((i) => !clued.has(pieces[i].id));

  const orientations = freeOrder.map((i) => {
    /** @type {PlanOrientation[]} */
    const list = distinctOrientations(/** @type {XY[]} */ (pieces[i].cells)).map(({ t, cells }) => {
      const sorted = normalizeCells(cells);
      const [fx] = sorted[0];
      return {
        t,
        firstX: fx,
        dx: Int32Array.from(sorted, ([x]) => x - fx),
        dy: Int32Array.from(sorted, ([, y]) => y),
      };
    });
    list.sort((a, b) => {
      for (let k = 1; k < a.dx.length; k += 1) {
        const d = a.dy[k] - b.dy[k] || a.dx[k] - b.dx[k];
        if (d !== 0) {
          return d;
        }
      }
      return 0;
    });
    return list;
  });

  return {
    width,
    height,
    freeCells,
    freePieceCount: freeOrder.length,
    columns: freeCells + freeOrder.length,
    cellColumn,
    freePieceIds: freeOrder.map((i) => pieces[i].id),
    freePieceSource: freeOrder,
    pieceOrder: order.map((i) => pieces[i].id),
    orderSource: order,
    pieceSizes: Int32Array.from(freeOrder, (i) => pieces[i].cells.length),
    clues: clueCopy,
    orientations,
  };
}

/**
 * Walks every placement in canonical row order. Return `true` from `emit` to
 * stop early.
 * @param {PlacementPlan} plan
 * @param {(pieceIndex: number, t: number, x: number, y: number, cellColumns: Int32Array) => boolean | void} emit
 * @param {boolean} wantColumns Fill `cellColumns`; counting passes false.
 */
function walk(plan, emit, wantColumns) {
  const { width, height, cellColumn } = plan;
  /** @type {Int32Array} */
  let scratch = new Int32Array(0);
  for (let p = 0; p < plan.freePieceCount; p += 1) {
    const size = plan.pieceSizes[p];
    if (scratch.length < size) {
      scratch = new Int32Array(size);
    }
    const view = scratch.subarray(0, size);
    const list = plan.orientations[p];
    for (let ay = 0; ay < height; ay += 1) {
      for (let ax = 0; ax < width; ax += 1) {
        if (cellColumn[ay * width + ax] < 0) {
          continue;
        }
        for (let o = 0; o < list.length; o += 1) {
          const { dx, dy, t, firstX } = list[o];
          let fits = true;
          for (let k = 0; k < size; k += 1) {
            const x = ax + dx[k];
            const y = ay + dy[k];
            const column = x >= 0 && x < width && y < height ? cellColumn[y * width + x] : -1;
            if (column < 0) {
              fits = false;
              break;
            }
            if (wantColumns) {
              view[k] = column;
            }
          }
          if (fits && emit(p, t, ax - firstX, ay, view) === true) {
            return;
          }
        }
      }
    }
  }
}

/**
 * Calls `emit` once per row in canonical order. `cellColumns` is a reusable
 * view, ascending, of the cell columns the placement covers; the piece column
 * is `plan.freeCells + pieceIndex`. Copy it, never retain it.
 * @param {PlacementPlan} plan
 * @param {(pieceIndex: number, t: number, x: number, y: number, cellColumns: Int32Array) => void} emit
 */
export function visitPlacements(plan, emit) {
  walk(plan, (p, t, x, y, cols) => {
    emit(p, t, x, y, cols);
  }, true);
}

/**
 * Exact row and nonzero counts (each row has `size + 1` nonzeros: its cells
 * plus the piece column). Counting stops as soon as a limit is exceeded.
 * @param {PlacementPlan} plan
 * @param {{ maxRows?: number, maxNonzeros?: number }} [limits]
 * @returns {{ rows: number, nonzeros: number, perPiece: Int32Array, exceeded: boolean }}
 */
export function countPlacements(plan, limits = {}) {
  const maxRows = limits.maxRows ?? Infinity;
  const maxNonzeros = limits.maxNonzeros ?? Infinity;
  const perPiece = new Int32Array(plan.freePieceCount);
  let rows = 0;
  let nonzeros = 0;
  let exceeded = false;
  walk(plan, (p) => {
    perPiece[p] += 1;
    rows += 1;
    nonzeros += plan.pieceSizes[p] + 1;
    if (rows > maxRows || nonzeros > maxNonzeros) {
      exceeded = true;
      return true;
    }
    return false;
  }, false);
  return { rows, nonzeros, perPiece, exceeded };
}
