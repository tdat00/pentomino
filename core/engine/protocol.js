// @ts-check
// Wire protocol between the controller and engine workers (design §8.1): task
// and reply validators. Payloads are plain JSON-compatible DTOs; a message that
// is not exactly what this module describes never reaches engine execution.
// Validators return fresh normalized copies, never the caller's objects.

import { MAX_SIDE } from './board.js';
import { level } from './levels.js';
import { BUDGETS } from './policy.js';
import { MAX_CODE_SYMBOLS, MAX_INPUT_CHARS } from './puzzlecode-input.js';
import { normalizeSeedText } from './rng.js';

/** @typedef {import('./types.js').Issue} Issue */
/** @typedef {import('./types.js').Piece} Piece */
/** @typedef {import('./types.js').Pose} Pose */
/** @template T @typedef {import('./types.js').Result<T>} Result */

/** @typedef {'setAttempt' | 'puzzleCandidate' | 'completionCandidate' | 'certify' | 'rate' | 'verifyPack' | 'solveFirst' | 'enumerateLayouts' | 'encodePuzzleCode' | 'decodePuzzleCode'} TaskKind */
/** @typedef {{ type: 'task', id: number, kind: TaskKind, payload: any }} Request */
/**
 * A correction a worker proposes for a mistyped code symbol (`CodeCandidate` of the codec); offered, never applied.
 * @typedef {{ component: 'core' | 'tail', group: number, position: number, expected: string, typed: string,
 *   correctedCode: string }} WireCandidate
 */
/**
 * An error issue; a puzzle-code error adds its message `params` and, for a mistyped core, the `candidate`.
 * @typedef {Issue & { params?: Record<string, string | number>, candidate?: WireCandidate }} WireIssue
 */
/**
 * @typedef {{ type: 'progress', id: number, stage: string, rowTrials: number, bytes: number }
 *   | { type: 'result', id: number, value: unknown }
 *   | { type: 'error', id: number, code: string, message: string, issues?: WireIssue[] }} Reply
 */

export const TASK_KINDS = Object.freeze(/** @type {const} */ ([
  'setAttempt', 'puzzleCandidate', 'certify', 'rate', 'verifyPack', 'solveFirst', 'enumerateLayouts', 'completionCandidate',
  'encodePuzzleCode', 'decodePuzzleCode',
]));
/** Largest row-trial limit a task may request. */
export const MAX_ROW_LIMIT = 2000000;
export const MAX_BOARD_CELLS = MAX_SIDE * MAX_SIDE;
export const MAX_STRING = 512;
/** History keys spend two characters per active cell, so a key may exceed MAX_STRING on large boards. */
export const MAX_KEY = 2 * MAX_BOARD_CELLS;
const MAX_ISSUES = 20;
const MAX_ID_LENGTH = 64;
const MAX_COORD = 4096;
const MAX_MESSAGE = 2000;
/** Most message values and longest value of a puzzle-code issue (`{ char }` is the usual one). */
const MAX_PARAMS = 8;
const MAX_PARAM_STRING = 256;
/** Most unused arrangements one enumeration task may be asked to return. */
const MAX_COLLECT = 256;
/** Bounds of a rating claim's free-form metrics (the pack format allows 4 KiB at depth 8). */
const MAX_JSON_DEPTH = 8;
const MAX_JSON_NODES = 4096;
const MAX_JSON_STRING = 8192;

/**
 * @typedef {object} Ctx
 * @property {Issue[]} issues
 */

/**
 * @param {Ctx} ctx
 * @param {string} code
 * @param {string} path
 * @param {string} message
 * @returns {undefined}
 */
function fail(ctx, code, path, message) {
  if (ctx.issues.length < MAX_ISSUES) {
    ctx.issues.push({ code, path, message });
  }
  return undefined;
}

/**
 * @param {unknown} v
 * @returns {v is Record<string, unknown>}
 */
function isPlain(v) {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) {
    return false;
  }
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

/**
 * Plain object whose own keys are all in `allowed`; required keys must be present.
 * @param {Ctx} ctx
 * @param {unknown} v
 * @param {string} path
 * @param {readonly string[]} required
 * @param {readonly string[]} [optional]
 * @returns {Record<string, unknown> | undefined}
 */
function readObject(ctx, v, path, required, optional = []) {
  if (!isPlain(v)) {
    return fail(ctx, 'invalid-type', path, `${path} must be a plain object`);
  }
  let ok = true;
  for (const key of Object.keys(v)) {
    if (!required.includes(key) && !optional.includes(key)) {
      fail(ctx, 'unknown-field', `${path}.${key}`, `${path} has an unknown field ${key}`);
      ok = false;
    }
  }
  for (const key of required) {
    if (!Object.hasOwn(v, key)) {
      fail(ctx, 'missing-field', `${path}.${key}`, `${path} needs a field ${key}`);
      ok = false;
    }
  }
  return ok ? v : undefined;
}

/**
 * @param {unknown} v
 * @returns {v is number}
 */
const isSafeNonNegative = (v) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;

/**
 * @param {Ctx} ctx
 * @param {unknown} v
 * @param {string} path
 * @param {number} min
 * @param {number} max
 * @returns {number | undefined}
 */
function readInt(ctx, v, path, min, max) {
  if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < min || v > max) {
    return fail(ctx, 'invalid-value', path, `${path} must be an integer from ${min} to ${max}`);
  }
  return v;
}

/**
 * @param {Ctx} ctx
 * @param {unknown} v
 * @param {string} path
 * @param {number} [max]
 * @param {boolean} [allowEmpty]
 * @returns {string | undefined}
 */
function readString(ctx, v, path, max = MAX_STRING, allowEmpty = false) {
  if (typeof v !== 'string' || v.length > max || (!allowEmpty && v.length === 0)) {
    return fail(ctx, 'invalid-value', path, `${path} must be a${allowEmpty ? '' : ' nonempty'} string of at most ${max} characters`);
  }
  return v;
}

/**
 * @param {Ctx} ctx
 * @param {unknown} v
 * @param {string} path
 * @param {number} maxLength
 * @returns {unknown[] | undefined}
 */
function readArray(ctx, v, path, maxLength) {
  if (!Array.isArray(v) || v.length > maxLength) {
    return fail(ctx, 'invalid-type', path, `${path} must be an array of at most ${maxLength} items`);
  }
  return v;
}

/**
 * @param {Ctx} ctx
 * @param {unknown} v
 * @param {string} path
 * @returns {string[] | undefined}
 */
function readBoardRows(ctx, v, path) {
  const rows = readArray(ctx, v, path, MAX_SIDE);
  if (rows === undefined) {
    return undefined;
  }
  const width = typeof rows[0] === 'string' ? rows[0].length : 0;
  if (rows.length === 0 || width === 0 || width > MAX_SIDE) {
    return fail(ctx, 'invalid-value', path, `${path} must have 1 to ${MAX_SIDE} nonempty rows of 1 to ${MAX_SIDE} cells`);
  }
  for (let y = 0; y < rows.length; y += 1) {
    const row = rows[y];
    if (typeof row !== 'string' || row.length !== width || !/^[#.]+$/.test(row)) {
      return fail(ctx, 'invalid-value', `${path}[${y}]`, `${path}[${y}] must be ${width} characters of # or .`);
    }
  }
  return /** @type {string[]} */ (rows).slice();
}

/**
 * @param {Ctx} ctx
 * @param {unknown} v
 * @param {string} path
 * @returns {Pose | undefined}
 */
function readPose(ctx, v, path) {
  const o = readObject(ctx, v, path, ['piece', 'x', 'y', 'turn', 'mirrored']);
  if (o === undefined) {
    return undefined;
  }
  const piece = readString(ctx, o.piece, `${path}.piece`, MAX_ID_LENGTH);
  const x = readInt(ctx, o.x, `${path}.x`, -MAX_COORD, MAX_COORD);
  const y = readInt(ctx, o.y, `${path}.y`, -MAX_COORD, MAX_COORD);
  const turn = readInt(ctx, o.turn, `${path}.turn`, 0, 3);
  if (typeof o.mirrored !== 'boolean') {
    return fail(ctx, 'invalid-value', `${path}.mirrored`, `${path}.mirrored must be a boolean`);
  }
  if (piece === undefined || x === undefined || y === undefined || turn === undefined) {
    return undefined;
  }
  return { piece, x, y, turn: /** @type {import('./types.js').Turn} */ (turn), mirrored: o.mirrored };
}

/**
 * @param {Ctx} ctx
 * @param {unknown} v
 * @param {string} path
 * @param {number} maxLength
 * @returns {Pose[] | undefined}
 */
function readPoses(ctx, v, path, maxLength) {
  const list = readArray(ctx, v, path, maxLength);
  if (list === undefined) {
    return undefined;
  }
  const poses = list.map((p, i) => readPose(ctx, p, `${path}[${i}]`));
  return poses.every((p) => p !== undefined) ? /** @type {Pose[]} */ (poses) : undefined;
}

/**
 * @param {Ctx} ctx
 * @param {unknown} v
 * @param {string} path
 * @returns {Piece | undefined}
 */
function readPiece(ctx, v, path) {
  const o = readObject(ctx, v, path, ['id', 'label', 'color', 'cells']);
  if (o === undefined) {
    return undefined;
  }
  const id = readString(ctx, o.id, `${path}.id`, MAX_ID_LENGTH);
  const label = readString(ctx, o.label, `${path}.label`, MAX_ID_LENGTH, true);
  const color = readString(ctx, o.color, `${path}.color`, MAX_ID_LENGTH, true);
  const raw = readArray(ctx, o.cells, `${path}.cells`, MAX_BOARD_CELLS);
  if (raw === undefined || raw.length === 0) {
    return raw === undefined ? undefined : fail(ctx, 'invalid-value', `${path}.cells`, `${path}.cells must not be empty`);
  }
  /** @type {import('./types.js').XY[]} */
  const cells = [];
  for (let i = 0; i < raw.length; i += 1) {
    const c = raw[i];
    const x = Array.isArray(c) && c.length === 2 ? readInt(ctx, c[0], `${path}.cells[${i}][0]`, -MAX_COORD, MAX_COORD) : undefined;
    const y = Array.isArray(c) && c.length === 2 ? readInt(ctx, c[1], `${path}.cells[${i}][1]`, -MAX_COORD, MAX_COORD) : undefined;
    if (x === undefined || y === undefined) {
      return fail(ctx, 'invalid-value', `${path}.cells[${i}]`, `${path}.cells[${i}] must be an [x, y] integer pair`);
    }
    cells.push([x, y]);
  }
  if (id === undefined || label === undefined || color === undefined) {
    return undefined;
  }
  return { id, label, color, cells };
}

/**
 * Pieces with unique ids whose cells fit on a board of the largest supported size.
 * @param {Ctx} ctx
 * @param {unknown} v
 * @param {string} path
 * @returns {Piece[] | undefined}
 */
function readPieces(ctx, v, path) {
  const list = readArray(ctx, v, path, MAX_BOARD_CELLS);
  if (list === undefined) {
    return undefined;
  }
  const pieces = list.map((p, i) => readPiece(ctx, p, `${path}[${i}]`));
  if (!pieces.every((p) => p !== undefined)) {
    return undefined;
  }
  const typed = /** @type {Piece[]} */ (pieces);
  if (typed.length === 0) {
    return fail(ctx, 'invalid-value', path, `${path} must not be empty`);
  }
  const ids = new Set(typed.map((p) => p.id));
  if (ids.size !== typed.length) {
    return fail(ctx, 'duplicate-id', path, `${path} repeats a piece id`);
  }
  if (typed.reduce((sum, p) => sum + p.cells.length, 0) > MAX_BOARD_CELLS) {
    return fail(ctx, 'invalid-value', path, `${path} has more cells than the largest board`);
  }
  return typed;
}

/**
 * @param {Ctx} ctx
 * @param {unknown} v
 * @param {string} path
 * @returns {number | undefined}
 */
function readRowLimit(ctx, v, path) {
  return readInt(ctx, v, path, 0, MAX_ROW_LIMIT);
}

/**
 * @param {Ctx} ctx
 * @param {unknown} v
 * @param {string} path
 * @returns {'any' | 'require' | undefined}
 */
function readUniqueness(ctx, v, path) {
  if (v !== 'any' && v !== 'require') {
    return fail(ctx, 'invalid-value', path, `${path} must be "any" or "require"`);
  }
  return v;
}

/**
 * @param {Ctx} ctx
 * @param {unknown} v
 * @param {string} path
 * @returns {string | undefined}
 */
function readLevelId(ctx, v, path) {
  const id = readString(ctx, v, path, MAX_ID_LENGTH);
  if (id === undefined) {
    return undefined;
  }
  try {
    level(id);
  } catch {
    return fail(ctx, 'invalid-value', path, `${path} is not a known level id`);
  }
  return id;
}

/**
 * A UI-normalized seed: 1-64 code points, already trimmed and NFC.
 * @param {Ctx} ctx
 * @param {unknown} v
 * @param {string} path
 * @returns {string | undefined}
 */
function readSetSeed(ctx, v, path) {
  try {
    if (typeof v === 'string' && normalizeSeedText(v) === v) {
      return v;
    }
  } catch {
    // reported below
  }
  return fail(ctx, 'invalid-value', path, `${path} must be a normalized seed of 1 to 64 characters`);
}

/**
 * The full internal batch seed (`setSeed#index`): normalized, but not limited to 64 code points.
 * @param {Ctx} ctx
 * @param {unknown} v
 * @param {string} path
 * @returns {string | undefined}
 */
function readBatchSeed(ctx, v, path) {
  if (typeof v === 'string' && v.length > 0 && v.length <= MAX_STRING && v.trim().normalize('NFC') === v) {
    return v;
  }
  return fail(ctx, 'invalid-value', path, `${path} must be a normalized nonempty string of at most ${MAX_STRING} characters`);
}

/**
 * @param {Ctx} ctx
 * @param {unknown} v
 * @param {string} path
 * @returns {string[] | undefined}
 */
function readHistory(ctx, v, path) {
  const list = readArray(ctx, v, path, BUDGETS.historyKeys);
  if (list === undefined) {
    return undefined;
  }
  for (let i = 0; i < list.length; i += 1) {
    if (typeof list[i] !== 'string' || /** @type {string} */ (list[i]).length > MAX_KEY) {
      return fail(ctx, 'invalid-value', `${path}[${i}]`, `${path}[${i}] must be a string`);
    }
  }
  return /** @type {string[]} */ (list).slice();
}

/**
 * @param {Ctx} ctx
 * @param {unknown} v
 * @param {string} path
 * @returns {{ boardRows: string[], pieces: Piece[], witness: Pose[] | null, carving: 'macro' | 'flat' | 'imported',
 *   macroRegion: number[] | null } | undefined}
 */
function readSet(ctx, v, path) {
  const o = readObject(ctx, v, path, ['boardRows', 'pieces', 'witness', 'carving', 'macroRegion']);
  if (o === undefined) {
    return undefined;
  }
  const boardRows = readBoardRows(ctx, o.boardRows, `${path}.boardRows`);
  const pieces = readPieces(ctx, o.pieces, `${path}.pieces`);
  /** @type {Pose[] | null | undefined} */
  let witness = null;
  if (o.witness !== null) {
    witness = readPoses(ctx, o.witness, `${path}.witness`, MAX_BOARD_CELLS);
    if (witness !== undefined && pieces !== undefined && witness.length !== pieces.length) {
      witness = fail(ctx, 'invalid-value', `${path}.witness`, `${path}.witness must place every piece once`);
    }
  }
  const carving = o.carving;
  if (carving !== 'macro' && carving !== 'flat' && carving !== 'imported') {
    fail(ctx, 'invalid-value', `${path}.carving`, `${path}.carving must be macro, flat or imported`);
  }
  /** @type {number[] | null | undefined} */
  let macroRegion = null;
  if (o.macroRegion !== null) {
    const list = readArray(ctx, o.macroRegion, `${path}.macroRegion`, MAX_BOARD_CELLS);
    macroRegion = list !== undefined && list.every((n) => isSafeNonNegative(n) && n < MAX_BOARD_CELLS)
      && (pieces === undefined || list.length === pieces.length)
      ? /** @type {number[]} */ (list).slice()
      : fail(ctx, 'invalid-value', `${path}.macroRegion`, `${path}.macroRegion must hold one region index per piece`);
  }
  if (boardRows === undefined || pieces === undefined || witness === undefined || macroRegion === undefined
    || (carving !== 'macro' && carving !== 'flat' && carving !== 'imported')) {
    return undefined;
  }
  return { boardRows, pieces, witness, carving, macroRegion };
}

/**
 * @param {Ctx} ctx
 * @param {unknown} v
 * @param {string} path
 * @param {number} maxDepth
 * @param {{ nodes: number }} budget
 * @returns {unknown} A fresh copy, or undefined after reporting a problem; `null` is a valid value.
 */
function readJson(ctx, v, path, maxDepth, budget) {
  budget.nodes -= 1;
  if (budget.nodes < 0) {
    return fail(ctx, 'invalid-value', path, `${path} holds too many values`);
  }
  if (v === null || typeof v === 'boolean') {
    return v;
  }
  if (typeof v === 'number') {
    return Number.isFinite(v) ? v : fail(ctx, 'invalid-value', path, `${path} must be a finite number`);
  }
  if (typeof v === 'string') {
    return v.length <= MAX_JSON_STRING ? v : fail(ctx, 'invalid-value', path, `${path} is longer than ${MAX_JSON_STRING} characters`);
  }
  if (maxDepth <= 0 || (!Array.isArray(v) && !isPlain(v))) {
    return fail(ctx, 'invalid-type', path, `${path} must be plain JSON data nested at most ${MAX_JSON_DEPTH} levels`);
  }
  if (Array.isArray(v)) {
    /** @type {unknown[]} */
    const list = [];
    for (let i = 0; i < v.length; i += 1) {
      const item = readJson(ctx, v[i], `${path}[${i}]`, maxDepth - 1, budget);
      if (item === undefined) {
        return undefined;
      }
      list.push(item);
    }
    return list;
  }
  /** @type {Record<string, unknown>} */
  const copy = {};
  for (const key of Object.keys(v)) {
    if (key.length > MAX_ID_LENGTH) {
      return fail(ctx, 'invalid-value', `${path}.${key.slice(0, 20)}`, `${path} has a key longer than ${MAX_ID_LENGTH} characters`);
    }
    const item = readJson(ctx, v[key], `${path}.${key}`, maxDepth - 1, budget);
    if (item === undefined) {
      return undefined;
    }
    Object.defineProperty(copy, key, { value: item, enumerable: true, writable: true, configurable: true });
  }
  return copy;
}

/**
 * A rating claim as the code carries it; its fields are claims and are checked again by the codec.
 * @param {Ctx} ctx
 * @param {unknown} v
 * @param {string} path
 * @returns {Record<string, unknown> | null | undefined} `null` is a valid absent claim.
 */
function readRatingClaim(ctx, v, path) {
  if (v === null || v === undefined) {
    return null;
  }
  const o = readObject(ctx, v, path, ['model', 'score', 'level'], ['saturated', 'censored', 'metrics']);
  if (o === undefined) {
    return undefined;
  }
  const model = readString(ctx, o.model, `${path}.model`);
  const level = readString(ctx, o.level, `${path}.level`);
  const score = typeof o.score === 'number' && Number.isFinite(o.score) && o.score >= 0
    ? o.score
    : fail(ctx, 'invalid-value', `${path}.score`, `${path}.score must be a finite nonnegative number`);
  /** @type {Record<string, unknown>} */
  const claim = { model, score, level };
  for (const key of ['saturated', 'censored']) {
    if (o[key] !== undefined) {
      claim[key] = typeof o[key] === 'boolean' ? o[key] : fail(ctx, 'invalid-value', `${path}.${key}`, `${path}.${key} must be a boolean`);
    }
  }
  if (o.metrics !== undefined) {
    claim.metrics = isPlain(o.metrics)
      ? readJson(ctx, o.metrics, `${path}.metrics`, MAX_JSON_DEPTH, { nodes: MAX_JSON_NODES })
      : fail(ctx, 'invalid-type', `${path}.metrics`, `${path}.metrics must be a plain object`);
  }
  return Object.values(claim).includes(undefined) ? undefined : claim;
}

/**
 * @param {Ctx} ctx
 * @param {unknown} v
 * @param {string} path
 * @returns {Record<string, unknown> | null | undefined} `null` is a valid absent claim.
 */
function readCertificateClaim(ctx, v, path) {
  if (v === null || v === undefined) {
    return null;
  }
  const o = readObject(ctx, v, path, ['status', 'model'], ['rowLimit']);
  if (o === undefined) {
    return undefined;
  }
  const status = o.status === 'unique' || o.status === 'multiple' || o.status === 'not-proved' || o.status === 'unsatisfiable'
    ? o.status
    : fail(ctx, 'invalid-value', `${path}.status`, `${path}.status must be unique, multiple, not-proved or unsatisfiable`);
  const model = readString(ctx, o.model, `${path}.model`);
  const rowLimit = o.rowLimit === undefined ? null : readInt(ctx, o.rowLimit, `${path}.rowLimit`, 0, Number.MAX_SAFE_INTEGER);
  if (status === undefined || model === undefined || rowLimit === undefined) {
    return undefined;
  }
  return rowLimit === null ? { status, model } : { status, model, rowLimit };
}

/**
 * The selected puzzle exactly as the codec takes it. Structure and sizes only: the codec validates the puzzle
 * itself, so a puzzle it refuses is a typed `invalid` code error, not a protocol error.
 * @param {Ctx} ctx
 * @param {unknown} v
 * @param {string} path
 * @returns {object | undefined}
 */
function readSnapshot(ctx, v, path) {
  const o = readObject(ctx, v, path, ['rows', 'rotation', 'pieces', 'clues'], ['title', 'solution', 'rating', 'certificate']);
  if (o === undefined) {
    return undefined;
  }
  const rows = readBoardRows(ctx, o.rows, `${path}.rows`);
  const rotation = readInt(ctx, o.rotation, `${path}.rotation`, 0, 359);
  const pieces = readPieces(ctx, o.pieces, `${path}.pieces`);
  const clues = readPoses(ctx, o.clues, `${path}.clues`, MAX_BOARD_CELLS);
  const solution = o.solution === undefined || o.solution === null ? null : readPoses(ctx, o.solution, `${path}.solution`, MAX_BOARD_CELLS);
  const title = o.title === undefined || o.title === null ? null : readString(ctx, o.title, `${path}.title`, MAX_STRING, true);
  const rating = readRatingClaim(ctx, o.rating, `${path}.rating`);
  const certificate = readCertificateClaim(ctx, o.certificate, `${path}.certificate`);
  return [rows, rotation, pieces, clues, solution, title, rating, certificate].includes(undefined)
    ? undefined
    : { rows, rotation, pieces, title, clues, solution, rating, certificate };
}

/** @type {Record<TaskKind, (ctx: Ctx, o: Record<string, unknown>) => object | undefined>} */
const PAYLOADS = {
  setAttempt(ctx, o) {
    const boardRows = readBoardRows(ctx, o.boardRows, 'payload.boardRows');
    const rotation = readInt(ctx, o.rotation, 'payload.rotation', 0, 359);
    const levelId = readLevelId(ctx, o.levelId, 'payload.levelId');
    const seedText = readSetSeed(ctx, o.seedText, 'payload.seedText');
    const uniqueness = readUniqueness(ctx, o.uniqueness, 'payload.uniqueness');
    const attempt = readInt(ctx, o.attempt, 'payload.attempt', 0, Number.MAX_SAFE_INTEGER);
    return [boardRows, rotation, levelId, seedText, uniqueness, attempt].includes(undefined)
      ? undefined
      : { boardRows, rotation, levelId, seedText, uniqueness, attempt };
  },
  puzzleCandidate(ctx, o) {
    const set = readSet(ctx, o.set, 'payload.set');
    const targetLevelId = readLevelId(ctx, o.targetLevelId, 'payload.targetLevelId');
    const quantity = readInt(ctx, o.quantity, 'payload.quantity', 1, 10);
    const batchSeed = readBatchSeed(ctx, o.batchSeed, 'payload.batchSeed');
    const uniqueness = readUniqueness(ctx, o.uniqueness, 'payload.uniqueness');
    const seenLayouts = readHistory(ctx, o.seenLayouts, 'payload.seenLayouts');
    const seenClues = readHistory(ctx, o.seenClues, 'payload.seenClues');
    const slot = readInt(ctx, o.slot, 'payload.slot', 1, 10);
    const attempt = readInt(ctx, o.attempt, 'payload.attempt', 0, Number.MAX_SAFE_INTEGER);
    return [set, targetLevelId, quantity, batchSeed, uniqueness, seenLayouts, seenClues, slot, attempt].includes(undefined)
      ? undefined
      : { set, targetLevelId, quantity, batchSeed, uniqueness, seenLayouts, seenClues, slot, attempt };
  },
  certify(ctx, o) {
    const boardRows = readBoardRows(ctx, o.boardRows, 'payload.boardRows');
    const pieces = readPieces(ctx, o.pieces, 'payload.pieces');
    const clues = readPoses(ctx, o.clues, 'payload.clues', MAX_BOARD_CELLS);
    const rowLimit = readRowLimit(ctx, o.rowLimit, 'payload.rowLimit');
    return [boardRows, pieces, clues, rowLimit].includes(undefined) ? undefined : { boardRows, pieces, clues, rowLimit };
  },
  rate(ctx, o) {
    const boardRows = readBoardRows(ctx, o.boardRows, 'payload.boardRows');
    const pieces = readPieces(ctx, o.pieces, 'payload.pieces');
    const clues = readPoses(ctx, o.clues, 'payload.clues', MAX_BOARD_CELLS);
    return [boardRows, pieces, clues].includes(undefined) ? undefined : { boardRows, pieces, clues };
  },
  verifyPack(_ctx, o) {
    return { pack: o.pack };
  },
  solveFirst(ctx, o) {
    const boardRows = readBoardRows(ctx, o.boardRows, 'payload.boardRows');
    const pieces = readPieces(ctx, o.pieces, 'payload.pieces');
    const clues = readPoses(ctx, o.clues, 'payload.clues', MAX_BOARD_CELLS);
    const rowLimit = readRowLimit(ctx, o.rowLimit, 'payload.rowLimit');
    if (o.maxSolutions !== undefined && o.maxSolutions !== 1) {
      fail(ctx, 'invalid-value', 'payload.maxSolutions', 'payload.maxSolutions must be 1 when given');
      return undefined;
    }
    return [boardRows, pieces, clues, rowLimit].includes(undefined)
      ? undefined
      : { boardRows, pieces, clues, rowLimit, maxSolutions: 1 };
  },
  enumerateLayouts(ctx, o) {
    const boardRows = readBoardRows(ctx, o.boardRows, 'payload.boardRows');
    const pieces = readPieces(ctx, o.pieces, 'payload.pieces');
    const seenLayouts = readHistory(ctx, o.seenLayouts, 'payload.seenLayouts');
    const collect = o.collect === undefined ? null : readInt(ctx, o.collect, 'payload.collect', 1, MAX_COLLECT);
    if ([boardRows, pieces, seenLayouts, collect].includes(undefined)) {
      return undefined;
    }
    return collect === null ? { boardRows, pieces, seenLayouts } : { boardRows, pieces, seenLayouts, collect };
  },
  completionCandidate(ctx, o) {
    const set = readSet(ctx, o.set, 'payload.set');
    const targetLevelId = readLevelId(ctx, o.targetLevelId, 'payload.targetLevelId');
    const quantity = readInt(ctx, o.quantity, 'payload.quantity', 1, 10);
    const batchSeed = readBatchSeed(ctx, o.batchSeed, 'payload.batchSeed');
    const uniqueness = readUniqueness(ctx, o.uniqueness, 'payload.uniqueness');
    const seenLayouts = readHistory(ctx, o.seenLayouts, 'payload.seenLayouts');
    const seenClues = readHistory(ctx, o.seenClues, 'payload.seenClues');
    const layout = readPoses(ctx, o.layout, 'payload.layout', MAX_BOARD_CELLS);
    return [set, targetLevelId, quantity, batchSeed, uniqueness, seenLayouts, seenClues, layout].includes(undefined)
      ? undefined
      : { set, targetLevelId, quantity, batchSeed, uniqueness, seenLayouts, seenClues, layout };
  },
  encodePuzzleCode(ctx, o) {
    const snapshot = readSnapshot(ctx, o.snapshot, 'payload.snapshot');
    return snapshot === undefined ? undefined : { snapshot };
  },
  decodePuzzleCode(ctx, o) {
    // The codec applies its own normalized-code limits; the empty text is its typed `empty` error.
    const text = readString(ctx, o.text, 'payload.text', MAX_INPUT_CHARS, true);
    return text === undefined ? undefined : { text };
  },
};

const PAYLOAD_FIELDS = /** @type {Record<TaskKind, { required: string[], optional?: string[] }>} */ ({
  setAttempt: { required: ['boardRows', 'rotation', 'levelId', 'seedText', 'uniqueness', 'attempt'] },
  puzzleCandidate: {
    required: ['set', 'targetLevelId', 'quantity', 'batchSeed', 'uniqueness', 'seenLayouts', 'seenClues', 'slot', 'attempt'],
  },
  certify: { required: ['boardRows', 'pieces', 'clues', 'rowLimit'] },
  rate: { required: ['boardRows', 'pieces', 'clues'] },
  verifyPack: { required: ['pack'] },
  solveFirst: { required: ['boardRows', 'pieces', 'clues', 'rowLimit'], optional: ['maxSolutions'] },
  enumerateLayouts: { required: ['boardRows', 'pieces', 'seenLayouts'], optional: ['collect'] },
  completionCandidate: {
    required: ['set', 'targetLevelId', 'quantity', 'batchSeed', 'uniqueness', 'seenLayouts', 'seenClues', 'layout'],
  },
  encodePuzzleCode: { required: ['snapshot'] },
  decodePuzzleCode: { required: ['text'] },
});

/**
 * @param {unknown} kind
 * @returns {kind is TaskKind}
 */
export function isTaskKind(kind) {
  return typeof kind === 'string' && /** @type {readonly string[]} */ (TASK_KINDS).includes(kind);
}

/**
 * Validates the payload of one task kind and returns a normalized copy (the
 * `verifyPack` pack is handed through untouched; `validatePack` owns it).
 * @param {unknown} kind
 * @param {unknown} payload
 * @returns {Result<any>}
 */
export function validatePayload(kind, payload) {
  if (!isTaskKind(kind)) {
    return { ok: false, issues: [{ code: 'unknown-kind', path: 'kind', message: 'kind is not a known task kind' }] };
  }
  /** @type {Ctx} */
  const ctx = { issues: [] };
  const { required, optional } = PAYLOAD_FIELDS[kind];
  const fields = readObject(ctx, payload, 'payload', required, optional);
  const value = fields === undefined ? undefined : PAYLOADS[kind](ctx, fields);
  if (value === undefined || ctx.issues.length > 0) {
    return { ok: false, issues: ctx.issues.length > 0 ? ctx.issues : [{ code: 'invalid-value', path: 'payload', message: 'payload is invalid' }] };
  }
  return { ok: true, value, warnings: [] };
}

/**
 * Controller-to-worker message: `{type:'task', id, kind, payload}`.
 * @param {unknown} input
 * @returns {Result<Request>}
 */
export function parseTaskMessage(input) {
  /** @type {Ctx} */
  const ctx = { issues: [] };
  const o = readObject(ctx, input, 'message', ['type', 'id', 'kind', 'payload']);
  if (o === undefined) {
    return { ok: false, issues: ctx.issues };
  }
  if (o.type !== 'task') {
    fail(ctx, 'invalid-value', 'message.type', 'message.type must be "task"');
  }
  const id = readInt(ctx, o.id, 'message.id', 0, Number.MAX_SAFE_INTEGER);
  if (!isTaskKind(o.kind)) {
    fail(ctx, 'unknown-kind', 'message.kind', 'message.kind is not a known task kind');
  }
  if (ctx.issues.length > 0 || id === undefined || !isTaskKind(o.kind)) {
    return { ok: false, issues: ctx.issues };
  }
  const payload = validatePayload(o.kind, o.payload);
  if (!payload.ok) {
    return payload;
  }
  return { ok: true, value: { type: 'task', id, kind: o.kind, payload: payload.value }, warnings: [] };
}

/**
 * @param {Ctx} ctx
 * @param {unknown} v
 * @param {string} path
 * @returns {Record<string, string | number> | undefined}
 */
function readParams(ctx, v, path) {
  if (!isPlain(v) || Object.keys(v).length > MAX_PARAMS) {
    return fail(ctx, 'invalid-type', path, `${path} must be a plain object of at most ${MAX_PARAMS} values`);
  }
  /** @type {Record<string, string | number>} */
  const params = {};
  for (const [key, value] of Object.entries(v)) {
    const ok = key.length <= MAX_ID_LENGTH && (typeof value === 'number' ? Number.isFinite(value) : typeof value === 'string' && value.length <= MAX_PARAM_STRING);
    if (!ok) {
      return fail(ctx, 'invalid-value', `${path}.${key.slice(0, 20)}`, `${path} values must be short strings or finite numbers`);
    }
    Object.defineProperty(params, key, { value, enumerable: true, writable: true, configurable: true });
  }
  return params;
}

/**
 * @param {Ctx} ctx
 * @param {unknown} v
 * @param {string} path
 * @returns {WireCandidate | undefined}
 */
function readCandidate(ctx, v, path) {
  const o = readObject(ctx, v, path, ['component', 'group', 'position', 'expected', 'typed', 'correctedCode']);
  if (o === undefined) {
    return undefined;
  }
  const component = o.component === 'core' || o.component === 'tail'
    ? o.component
    : fail(ctx, 'invalid-value', `${path}.component`, `${path}.component must be core or tail`);
  const group = readInt(ctx, o.group, `${path}.group`, 1, MAX_CODE_SYMBOLS);
  const position = readInt(ctx, o.position, `${path}.position`, 1, 4);
  const expected = readString(ctx, o.expected, `${path}.expected`, 1);
  const typed = readString(ctx, o.typed, `${path}.typed`, 1);
  const correctedCode = readString(ctx, o.correctedCode, `${path}.correctedCode`, MAX_CODE_SYMBOLS + 1);
  if (component === undefined || group === undefined || position === undefined || expected === undefined
    || typed === undefined || correctedCode === undefined) {
    return undefined;
  }
  return { component, group, position, expected, typed, correctedCode };
}

/**
 * @param {Ctx} ctx
 * @param {unknown} v
 * @returns {WireIssue[] | undefined}
 */
function readIssues(ctx, v) {
  const list = readArray(ctx, v, 'message.issues', 100);
  if (list === undefined) {
    return undefined;
  }
  /** @type {WireIssue[]} */
  const issues = [];
  for (let i = 0; i < list.length; i += 1) {
    const at = `message.issues[${i}]`;
    const o = readObject(ctx, list[i], at, ['code', 'path', 'message'], ['params', 'candidate']);
    const code = o && readString(ctx, o.code, `${at}.code`, MAX_ID_LENGTH, true);
    const path = o && readString(ctx, o.path, `${at}.path`, MAX_STRING, true);
    const message = o && readString(ctx, o.message, `${at}.message`, MAX_MESSAGE, true);
    const params = o && o.params !== undefined ? readParams(ctx, o.params, `${at}.params`) : undefined;
    const candidate = o && o.candidate !== undefined ? readCandidate(ctx, o.candidate, `${at}.candidate`) : undefined;
    if (code === undefined || path === undefined || message === undefined
      || (o?.params !== undefined && params === undefined) || (o?.candidate !== undefined && candidate === undefined)) {
      return undefined;
    }
    /** @type {WireIssue} */
    const issue = { code, path, message };
    if (params !== undefined) {
      issue.params = params;
    }
    if (candidate !== undefined) {
      issue.candidate = candidate;
    }
    issues.push(issue);
  }
  return issues;
}

/**
 * Worker-to-controller message: progress, result or error. A result value is
 * structured-cloned engine data and is passed through as received.
 * @param {unknown} input
 * @returns {Result<Reply>}
 */
export function parseWorkerMessage(input) {
  /** @type {Ctx} */
  const ctx = { issues: [] };
  if (!isPlain(input)) {
    return { ok: false, issues: [{ code: 'invalid-type', path: 'message', message: 'message must be a plain object' }] };
  }
  const type = input.type;
  /** @type {Reply | undefined} */
  let reply;
  if (type === 'progress') {
    const o = readObject(ctx, input, 'message', ['type', 'id', 'stage', 'rowTrials', 'bytes']);
    const id = o && readInt(ctx, o.id, 'message.id', 0, Number.MAX_SAFE_INTEGER);
    const stage = o && readString(ctx, o.stage, 'message.stage', MAX_ID_LENGTH);
    const rowTrials = o && readInt(ctx, o.rowTrials, 'message.rowTrials', 0, Number.MAX_SAFE_INTEGER);
    const bytes = o && readInt(ctx, o.bytes, 'message.bytes', 0, Number.MAX_SAFE_INTEGER);
    if (id !== undefined && stage !== undefined && rowTrials !== undefined && bytes !== undefined) {
      reply = { type, id, stage, rowTrials, bytes };
    }
  } else if (type === 'result') {
    const o = readObject(ctx, input, 'message', ['type', 'id', 'value']);
    const id = o && readInt(ctx, o.id, 'message.id', 0, Number.MAX_SAFE_INTEGER);
    if (o !== undefined && id !== undefined) {
      reply = { type, id, value: o.value };
    }
  } else if (type === 'error') {
    const o = readObject(ctx, input, 'message', ['type', 'id', 'code', 'message'], ['issues']);
    const id = o && readInt(ctx, o.id, 'message.id', 0, Number.MAX_SAFE_INTEGER);
    const code = o && readString(ctx, o.code, 'message.code', MAX_ID_LENGTH);
    const message = o && readString(ctx, o.message, 'message.message', MAX_MESSAGE, true);
    const issues = o && o.issues !== undefined ? readIssues(ctx, o.issues) : undefined;
    if (id !== undefined && code !== undefined && message !== undefined && (o?.issues === undefined || issues !== undefined)) {
      reply = issues === undefined ? { type, id, code, message } : { type, id, code, message, issues };
    }
  } else {
    fail(ctx, 'invalid-value', 'message.type', 'message.type must be progress, result or error');
  }
  if (reply === undefined || ctx.issues.length > 0) {
    return { ok: false, issues: ctx.issues.length > 0 ? ctx.issues : [{ code: 'invalid-value', path: 'message', message: 'message is invalid' }] };
  }
  return { ok: true, value: reply, warnings: [] };
}
