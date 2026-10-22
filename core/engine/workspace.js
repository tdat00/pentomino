// @ts-check
// Grow-only typed-array arenas shared by successive exact-cover models, plus
// the exact byte accounting and guards that run before any large allocation.
//
// Shared internal layout (one arena per worker role; T07 builds on it as is):
//   DLX            Int32 L, R, U, D, C, ROW [N = nonzeros + columns + 1], S [columns + 1]
//   search stack   Int32 stCol, stRow, stPos, stBase, stChoices [columns + 1]
//   seeded order   Int32 shuffle [rows] (candidate rows of one search path are disjoint)
//   packed rows    Int32 rowCols [nonzeros], rowStart [rows + 1]
//   row metadata   Int16 rowPiece, Uint8 rowT, Int16 rowX, rowY [rows]
//   maps           Int32 cellColumn [width * height], placementsPerPiece [free pieces]
// Rows are written in canonical order by `fillArena`, so no sort scratch is
// needed. A workspace holds one live model: reserving or building another
// model reuses (and overwrites) the same buffers.

import { BUDGETS } from './policy.js';
import {
  countPlacements,
  MAX_NONZEROS,
  MAX_ROWS,
  ModelError,
  preparePlacements,
  visitPlacements,
} from './placements.js';

/** @typedef {import('./types.js').Board} Board */
/** @typedef {import('./types.js').Piece} Piece */
/** @typedef {import('./types.js').Pose} Pose */
/** @typedef {import('./placements.js').PlacementPlan} PlacementPlan */

export { ModelError, MAX_NONZEROS, MAX_ROWS };
export const MAIN_WORKSPACE_BYTES = BUDGETS.workspaceBytes;
export const SCRATCH_WORKSPACE_BYTES = BUDGETS.scratchBytes;

/** @typedef {Int32Array | Int16Array | Uint8Array} Typed */
/** @typedef {Int32ArrayConstructor | Int16ArrayConstructor | Uint8ArrayConstructor} TypedCtor */

/**
 * Arrays handed to the model builder by `reserve`; each has exactly the
 * length listed and holds unspecified data until filled.
 * @typedef {object} Arena
 * @property {number} rows
 * @property {number} nonzeros Includes one piece column per row.
 * @property {number} columns
 * @property {Int32Array} rowCols [nonzeros]
 * @property {Int32Array} rowStart [rows + 1]
 * @property {Int16Array} rowPiece [rows] index into the plan's free pieces
 * @property {Uint8Array} rowT [rows] transform index 0..7
 * @property {Int16Array} rowX [rows]
 * @property {Int16Array} rowY [rows]
 * @property {Int32Array} cellColumn Copy of the plan's cell-to-column map.
 * @property {Int32Array} placementsPerPiece Rows per free piece (L_i).
 */

/**
 * @typedef {object} Workspace
 * @property {() => number} bytes Total bytes of allocated buffers.
 * @property {number} capacityBytes
 * @property {() => number} peakBytes Highest byte total, including a replaced buffer held during growth.
 * @property {() => number} allocationCount Buffers allocated so far.
 * @property {(name: string, length: number) => Int32Array} int32
 * @property {(name: string, length: number) => Int16Array} int16
 * @property {(name: string, length: number) => Uint8Array} uint8
 * @property {(plan: PlacementPlan, counts?: { rows: number, nonzeros: number, perPiece: Int32Array, exceeded?: boolean }) => Arena} reserve
 */

const DLX_NAMES = ['L', 'R', 'U', 'D', 'C', 'ROW'];
const STACK_NAMES = ['stCol', 'stRow', 'stPos', 'stBase', 'stChoices'];

/**
 * Names and lengths of the Int32 DLX arrays and search stack.
 * @param {number} columns
 * @param {number} nonzeros
 * @returns {[string, number][]}
 */
function dlxSlotList(columns, nonzeros) {
  const nodes = nonzeros + columns + 1;
  return [
    ...DLX_NAMES.map((n) => /** @type {[string, number]} */ ([`dlx.${n}`, nodes])),
    ['dlx.S', columns + 1],
    ...STACK_NAMES.map((n) => /** @type {[string, number]} */ ([`dlx.${n}`, columns + 1])),
  ];
}

/**
 * DLX links and search-stack arrays for a model of the given size.
 * @param {Workspace} ws
 * @param {number} columns
 * @param {number} nonzeros
 */
export function dlxViews(ws, columns, nonzeros) {
  const nodes = nonzeros + columns + 1;
  const get = (/** @type {string} */ n, /** @type {number} */ len) => ws.int32(`dlx.${n}`, len);
  return {
    L: get('L', nodes),
    R: get('R', nodes),
    U: get('U', nodes),
    D: get('D', nodes),
    C: get('C', nodes),
    ROW: get('ROW', nodes),
    S: get('S', columns + 1),
    stCol: get('stCol', columns + 1),
    stRow: get('stRow', columns + 1),
    stPos: get('stPos', columns + 1),
    stBase: get('stBase', columns + 1),
    stChoices: get('stChoices', columns + 1),
  };
}

/**
 * @param {number} columns
 * @param {number} rows
 * @param {number} nonzeros
 * @param {number} cells
 * @param {number} freePieces
 * @returns {[string, TypedCtor, number][]}
 */
function modelSlots(columns, rows, nonzeros, cells, freePieces) {
  return [
    ...dlxSlotList(columns, nonzeros).map((/** @type {[string, number]} */ [n, len]) =>
      /** @type {[string, TypedCtor, number]} */ ([n, Int32Array, len])),
    ['dlx.shuffle', Int32Array, rows],
    ['rowCols', Int32Array, nonzeros],
    ['rowStart', Int32Array, rows + 1],
    ['rowPiece', Int16Array, rows],
    ['rowT', Uint8Array, rows],
    ['rowX', Int16Array, rows],
    ['rowY', Int16Array, rows],
    ['cellColumn', Int32Array, cells],
    ['placementsPerPiece', Int32Array, freePieces],
  ];
}

/**
 * Bytes a fresh arena needs for the model: DLX links, stack, packed rows,
 * metadata and maps (no sort scratch: rows are enumerated in canonical order).
 * @param {PlacementPlan} plan
 * @param {number} rows
 * @param {number} nonzeros
 * @returns {number}
 */
export function modelBytes(plan, rows, nonzeros) {
  let total = 0;
  for (const [, ctor, length] of modelSlots(plan.columns, rows, nonzeros, plan.width * plan.height, plan.freePieceCount)) {
    total += length * ctor.BYTES_PER_ELEMENT;
  }
  return total;
}

/**
 * @param {string} message
 * @param {Record<string, number>} details
 */
const tooLarge = (message, details) => new ModelError('model-too-large', message, details);

class ArenaWorkspace {
  /** @param {number} capacityBytes */
  constructor(capacityBytes) {
    this.capacityBytes = capacityBytes;
    /** @type {Map<string, Typed>} */
    this.slots = new Map();
    this.total = 0;
    this.peak = 0;
    this.allocations = 0;
  }

  bytes() {
    return this.total;
  }

  peakBytes() {
    return this.peak;
  }

  allocationCount() {
    return this.allocations;
  }

  /**
   * Grow-only named buffer. When the replaced buffer and the new one would not
   * both fit under the capacity, the old one is released first, so the declared
   * ceiling is never exceeded; contents are never preserved across growth.
   * @param {string} name
   * @param {TypedCtor} Ctor
   * @param {number} length
   * @returns {any}
   */
  array(name, Ctor, length) {
    if (!Number.isInteger(length) || length < 0) {
      throw new RangeError(`buffer length must be a nonnegative integer, got ${length}`);
    }
    const old = this.slots.get(name);
    if (old !== undefined && old.constructor === Ctor && old.length >= length) {
      return old.length === length ? old : old.subarray(0, length);
    }
    const oldBytes = old === undefined ? 0 : old.byteLength;
    const newBytes = length * Ctor.BYTES_PER_ELEMENT;
    const others = this.total - oldBytes;
    if (others + newBytes > this.capacityBytes) {
      throw tooLarge(`workspace needs ${others + newBytes} bytes, capacity is ${this.capacityBytes}`,
        { bytes: others + newBytes, capacity: this.capacityBytes });
    }
    if (this.total + newBytes > this.capacityBytes) {
      this.slots.delete(name);
      this.total = others;
    }
    this.peak = Math.max(this.peak, this.total + newBytes);
    /** @type {Typed} */
    let fresh;
    try {
      fresh = new Ctor(length);
    } catch {
      throw tooLarge('allocation failed', { bytes: newBytes });
    }
    this.slots.set(name, fresh);
    this.total = others + newBytes;
    this.allocations += 1;
    return fresh;
  }

  /** @param {string} name @param {number} length */
  int32(name, length) {
    return /** @type {Int32Array} */ (this.array(name, Int32Array, length));
  }

  /** @param {string} name @param {number} length */
  int16(name, length) {
    return /** @type {Int16Array} */ (this.array(name, Int16Array, length));
  }

  /** @param {string} name @param {number} length */
  uint8(name, length) {
    return /** @type {Uint8Array} */ (this.array(name, Uint8Array, length));
  }

  /**
   * Guards the model against the row, nonzero and byte ceilings, then reserves
   * every buffer of the shared layout. Nothing large is allocated when a guard
   * fails. A smaller model afterwards allocates no new buffer.
   * @param {PlacementPlan} plan
   * @param {{ rows: number, nonzeros: number, perPiece: Int32Array, exceeded?: boolean }} [counts]
   * @returns {Arena}
   */
  reserve(plan, counts = countPlacements(plan, { maxRows: MAX_ROWS, maxNonzeros: MAX_NONZEROS })) {
    const { rows, nonzeros } = counts;
    if (counts.exceeded === true || rows > MAX_ROWS || nonzeros > MAX_NONZEROS) {
      throw tooLarge(`model needs more than ${MAX_ROWS} rows or ${MAX_NONZEROS} nonzeros`, { rows, nonzeros });
    }
    const needed = modelBytes(plan, rows, nonzeros);
    if (needed > this.capacityBytes) {
      throw tooLarge(`model needs ${needed} bytes, capacity is ${this.capacityBytes}`,
        { rows, nonzeros, bytes: needed, capacity: this.capacityBytes });
    }
    const specs = modelSlots(plan.columns, rows, nonzeros, plan.width * plan.height, plan.freePieceCount);
    const named = new Set(specs.map(([name]) => name));
    let projected = 0;
    for (const [name, buffer] of this.slots) {
      if (!named.has(name)) {
        projected += buffer.byteLength;
      }
    }
    for (const [name, ctor, length] of specs) {
      projected += Math.max(this.slots.get(name)?.byteLength ?? 0, length * ctor.BYTES_PER_ELEMENT);
    }
    if (projected > this.capacityBytes) {
      // Leftovers from larger earlier models would push past the ceiling.
      this.slots.clear();
      this.total = 0;
    }
    for (const [name, ctor, length] of specs) {
      this.array(name, ctor, length);
    }
    const cellColumn = this.int32('cellColumn', plan.cellColumn.length);
    cellColumn.set(plan.cellColumn);
    const placementsPerPiece = this.int32('placementsPerPiece', plan.freePieceCount);
    placementsPerPiece.set(counts.perPiece);
    return {
      rows,
      nonzeros,
      columns: plan.columns,
      rowCols: this.int32('rowCols', nonzeros),
      rowStart: this.int32('rowStart', rows + 1),
      rowPiece: this.int16('rowPiece', rows),
      rowT: this.uint8('rowT', rows),
      rowX: this.int16('rowX', rows),
      rowY: this.int16('rowY', rows),
      cellColumn,
      placementsPerPiece,
    };
  }
}

/**
 * @param {number} capacityBytes
 * @returns {Workspace}
 */
export function createWorkspace(capacityBytes) {
  if (!Number.isSafeInteger(capacityBytes) || capacityBytes < 0) {
    throw new RangeError(`capacityBytes must be a nonnegative integer, got ${capacityBytes}`);
  }
  return /** @type {Workspace} */ (/** @type {unknown} */ (new ArenaWorkspace(capacityBytes)));
}

/**
 * Exact model size before anything is allocated: placement rows, nonzeros
 * (`nodes`, one per row cell plus its piece column) and the bytes a fresh
 * arena needs. Throws `invalid-clue` or `invalid-input` for bad input.
 * @param {Board} b
 * @param {Piece[]} pieces
 * @param {Pose[]} clues
 * @returns {{ rows: number, nodes: number, bytes: number }}
 */
export function countModel(b, pieces, clues) {
  const plan = preparePlacements(b, pieces, clues);
  const { rows, nonzeros } = countPlacements(plan);
  return { rows, nodes: nonzeros, bytes: modelBytes(plan, rows, nonzeros) };
}

/**
 * Writes every placement into the arena in canonical row order: each row is
 * its ascending cell columns followed by its piece column. The caller's counts
 * and the enumeration must agree.
 * @param {PlacementPlan} plan
 * @param {Arena} arena
 * @returns {number} Rows written.
 */
export function fillArena(plan, arena) {
  let row = 0;
  let at = 0;
  const { rowCols, rowStart, rowPiece, rowT, rowX, rowY } = arena;
  visitPlacements(plan, (piece, t, x, y, cells) => {
    if (row >= arena.rows || at + cells.length + 1 > arena.nonzeros) {
      throw new ModelError('invalid-input', 'arena is too small for the plan');
    }
    rowStart[row] = at;
    rowCols.set(cells, at);
    at += cells.length;
    rowCols[at] = plan.freeCells + piece;
    at += 1;
    rowPiece[row] = piece;
    rowT[row] = t;
    rowX[row] = x;
    rowY[row] = y;
    row += 1;
  });
  if (row !== arena.rows || at !== arena.nonzeros) {
    throw new ModelError('invalid-input', 'arena size does not match the plan');
  }
  rowStart[row] = at;
  return row;
}
