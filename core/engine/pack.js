// @ts-check
// Versioned puzzle-pack wire format: staged, bounded validation that returns
// structured issues instead of throwing, canonical serialization and claim
// handling. Pure and dependency-free. Everything read from a file is untrusted:
// core objects are whitelisted and copied field by field, `generation` and
// `meta` are copied iteratively with depth and node limits, and ratings and
// certificates are always claims (`verified` is never read or written).

import { activeCount, boardFromRows, boardToRows, regions } from './board.js';
import { canonicalKey, canonicalT, hasHole, isConnected, normalizeCells, poseCells } from './geometry.js';
import { isValidLayout } from './tiling.js';

/** @typedef {import('./types.js').XY} XY */
/** @typedef {import('./types.js').Board} Board */
/** @typedef {import('./types.js').Piece} Piece */
/** @typedef {import('./types.js').Pose} Pose */
/** @typedef {import('./types.js').Issue} Issue */
/** @typedef {import('./types.js').Pack} Pack */
/** @typedef {import('./types.js').PackPuzzle} PackPuzzle */
/** @typedef {import('./types.js').Puzzle} Puzzle */
/** @typedef {import('./types.js').RatingClaim} RatingClaim */
/** @typedef {import('./types.js').CertificateClaim} CertificateClaim */
/** @typedef {import('./types.js').Metrics} Metrics */
/**
 * @template T
 * @typedef {import('./types.js').Result<T>} Result
 */

export const FORMAT = 'pentomino-pack';
export const SUPPORTED_VERSIONS = Object.freeze([1]);
export const RULES = Object.freeze(['free-polyomino-v1']);

export const MAX_FILE_BYTES = 512 * 1024;
export const MAX_META_BYTES = 4096;
export const MAX_ISSUES = 100;
const MAX_SIDE = 64;
const MAX_ACTIVE = 1024;
const MAX_PIECES = 128;
const MAX_PIECE_CELLS = 128;
const MAX_PUZZLES = 100;
const MAX_JSON_DEPTH = 32;
const MAX_JSON_NODES = 100000;
const MAX_CLAIM_METRICS_BYTES = 4096;
const CLAIM_JSON_DEPTH = 8;

const PIECE_ID = /^[A-Za-z0-9_-]{1,8}$/;
const PUZZLE_ID = /^[A-Za-z0-9_-]{1,64}$/;
const COLOR = /^#[0-9a-fA-F]{6}$/;
const BOARD_ROW = /^[#.]+$/;
const STOPS = new Set(['solution', 'branch-cap', 'row-cap']);
const STATUSES = new Set(['unique', 'multiple', 'not-proved', 'unsatisfiable']);

const ROOT_FIELDS = new Set(['format', 'version', 'kind', 'rules', 'board', 'presentation', 'pieces', 'witness', 'puzzles', 'generation', 'meta']);
const BOARD_FIELDS = new Set(['rows']);
const PRESENTATION_FIELDS = new Set(['rotation']);
const PIECE_FIELDS = new Set(['id', 'label', 'color', 'cells']);
const POSE_FIELDS = new Set(['piece', 'x', 'y', 'turn', 'mirrored']);
const PUZZLE_FIELDS = new Set(['id', 'title', 'clues', 'solution', 'rating', 'certificate']);
const RATING_V2_FIELDS = new Set(['model', 'score', 'level', 'saturated', 'metrics']);
const RATING_CLAIM_FIELDS = new Set(['model', 'score', 'level', 'saturated', 'censored', 'metrics']);
const METRICS_FIELDS = new Set(['U', 'B', 'branchTrials', 'rowTrials', 'stop', 'R', 'H']);
const CERTIFICATE_FIELDS = new Set(['status', 'model', 'rowLimit']);

/**
 * Thrown only for caller mistakes while writing a pack (never for malformed input).
 * `code` is `pack-too-large`, `invalid-rotation`, `invalid-json` or `meta-too-large`.
 */
export class PackError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   */
  constructor(code, message) {
    super(message);
    this.name = 'PackError';
    this.code = code;
  }
}

const encoder = new TextEncoder();

/**
 * @param {string} text
 * @returns {number}
 */
const byteLength = (text) => encoder.encode(text).length;

/**
 * Code points of `text`, counting at most `limit + 1`.
 * @param {string} text
 * @param {number} limit
 * @returns {number}
 */
function codePoints(text, limit) {
  let n = 0;
  for (const _ of text) {
    n += 1;
    if (n > limit) {
      break;
    }
  }
  return n;
}

/**
 * @param {unknown} v
 * @returns {v is Record<string, unknown>}
 */
function isPlainObject(v) {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) {
    return false;
  }
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

/**
 * @param {unknown} v
 * @returns {v is number}
 */
const isCount = (v) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;

/**
 * @param {unknown} v
 * @returns {v is number}
 */
const isScore = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;

/**
 * @param {string} path
 * @param {string | number} key
 * @returns {string}
 */
function child(path, key) {
  if (typeof key === 'number') {
    return `${path}[${key}]`;
  }
  const shown = key.length > 40 ? `${key.slice(0, 40)}…` : key;
  return path === '$' ? shown : `${path}.${shown}`;
}

/** @typedef {{ issues: Issue[], warnings: Issue[], truncated: boolean }} Ctx */

/** @returns {Ctx} */
const newCtx = () => ({ issues: [], warnings: [], truncated: false });

/**
 * @param {Ctx} ctx
 * @param {string} code
 * @param {string} path
 * @param {string} message
 */
function fail(ctx, code, path, message) {
  if (ctx.issues.length < MAX_ISSUES) {
    ctx.issues.push({ code, path, message });
  } else {
    ctx.truncated = true;
  }
}

/**
 * @param {Ctx} ctx
 * @param {string} code
 * @param {string} path
 * @param {string} message
 */
function warn(ctx, code, path, message) {
  ctx.warnings.push({ code, path, message });
}

/**
 * @param {Record<string, unknown>} obj
 * @param {string} key
 * @returns {unknown}
 */
function ownValue(obj, key) {
  const d = Object.getOwnPropertyDescriptor(obj, key);
  return d !== undefined && 'value' in d ? d.value : undefined;
}

/**
 * Own enumerable data properties of a plain object, whitelisted. Reports
 * unknown fields, accessors and missing required fields; null when `v` is
 * not a plain object.
 * @param {Ctx} ctx
 * @param {unknown} v
 * @param {string} path
 * @param {ReadonlySet<string>} allowed
 * @param {string[]} required
 * @returns {Map<string, unknown> | null}
 */
function readFields(ctx, v, path, allowed, required) {
  if (!isPlainObject(v)) {
    fail(ctx, 'invalid-type', path, `${path} must be an object`);
    return null;
  }
  /** @type {Map<string, unknown>} */
  const fields = new Map();
  for (const key of Object.keys(v)) {
    const d = /** @type {PropertyDescriptor} */ (Object.getOwnPropertyDescriptor(v, key));
    if (!('value' in d)) {
      fail(ctx, 'invalid-type', child(path, key), 'Accessor properties are not allowed');
    } else if (!allowed.has(key)) {
      fail(ctx, 'unknown-field', child(path, key), `Unknown field "${child('', key)}"; use meta for extensions`);
    } else {
      fields.set(key, d.value);
    }
  }
  for (const key of required) {
    if (!fields.has(key) || fields.get(key) === undefined) {
      fail(ctx, 'missing-field', child(path, key), `Missing required field "${key}"`);
    }
  }
  return fields;
}

class JsonError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   */
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/**
 * Iterative deep copy of a JSON value into fresh plain objects. Own data
 * properties only; `__proto__` and similar keys become ordinary own data
 * properties. Bounded in depth and node count, so cyclic or adversarial
 * structures fail instead of exhausting the stack or memory.
 * @param {unknown} root
 * @param {number} maxDepth
 * @param {number} maxNodes
 * @returns {{ ok: true, value: unknown } | { ok: false, code: string, message: string }}
 */
function copyJson(root, maxDepth, maxNodes) {
  let nodes = 0;
  /** @type {{ src: any, dst: any, depth: number }[]} */
  const stack = [];
  /**
   * @param {unknown} v
   * @param {number} depth
   * @returns {unknown}
   */
  const clone = (v, depth) => {
    nodes += 1;
    if (nodes > maxNodes) {
      throw new JsonError('json-too-large', `More than ${maxNodes} JSON values`);
    }
    if (v === null || typeof v === 'boolean' || typeof v === 'string') {
      return v;
    }
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) {
        throw new JsonError('json-invalid', 'Numbers must be finite');
      }
      return v;
    }
    if (typeof v !== 'object') {
      throw new JsonError('json-invalid', `A ${typeof v} is not a JSON value`);
    }
    if (depth > maxDepth) {
      throw new JsonError('json-too-deep', `Nesting is deeper than ${maxDepth} levels`);
    }
    const isArray = Array.isArray(v);
    if (!isArray && !isPlainObject(v)) {
      throw new JsonError('json-invalid', 'Only plain objects and arrays are JSON values');
    }
    const dst = isArray ? [] : {};
    stack.push({ src: v, dst, depth });
    return dst;
  };
  try {
    const result = clone(root, 0);
    while (stack.length > 0) {
      const { src, dst, depth } = /** @type {{ src: any, dst: any, depth: number }} */ (stack.pop());
      if (Array.isArray(src)) {
        if (src.length > maxNodes - nodes) {
          throw new JsonError('json-too-large', `More than ${maxNodes} JSON values`);
        }
        for (let i = 0; i < src.length; i += 1) {
          const d = Object.getOwnPropertyDescriptor(src, i);
          if (d === undefined || !('value' in d)) {
            throw new JsonError('json-invalid', 'Arrays must be dense data arrays');
          }
          dst.push(clone(d.value, depth + 1));
        }
      } else {
        const keys = Object.keys(src);
        if (keys.length > maxNodes - nodes) {
          throw new JsonError('json-too-large', `More than ${maxNodes} JSON values`);
        }
        for (const key of keys) {
          const d = /** @type {PropertyDescriptor} */ (Object.getOwnPropertyDescriptor(src, key));
          if (!('value' in d)) {
            throw new JsonError('json-invalid', 'Accessor properties are not JSON');
          }
          Object.defineProperty(dst, key, {
            value: clone(d.value, depth + 1),
            writable: true,
            enumerable: true,
            configurable: true,
          });
        }
      }
    }
    return { ok: true, value: result };
  } catch (e) {
    if (e instanceof JsonError) {
      return { ok: false, code: e.code, message: e.message };
    }
    throw e;
  }
}

/**
 * Copies an optional free-form object (`generation`, `meta`) under a byte limit.
 * @param {Ctx} ctx
 * @param {unknown} v
 * @param {string} path
 * @param {number} maxBytes
 * @param {string} tooLarge
 * @returns {object | null}
 */
function readJsonObject(ctx, v, path, maxBytes, tooLarge) {
  if (!isPlainObject(v)) {
    fail(ctx, 'invalid-type', path, `${path} must be a JSON object`);
    return null;
  }
  const copy = copyJson(v, MAX_JSON_DEPTH, MAX_JSON_NODES);
  if (!copy.ok) {
    fail(ctx, copy.code, path, `${path}: ${copy.message}`);
    return null;
  }
  const size = byteLength(JSON.stringify(copy.value));
  if (size > maxBytes) {
    fail(ctx, tooLarge, path, `${path} is ${size} bytes serialized; the limit is ${maxBytes}`);
    return null;
  }
  return /** @type {object} */ (copy.value);
}

/**
 * @param {Ctx} ctx
 * @param {unknown} v
 * @param {string} path
 * @param {RegExp} pattern
 * @param {string} what
 * @returns {string | null}
 */
function readId(ctx, v, path, pattern, what) {
  if (typeof v !== 'string') {
    fail(ctx, 'invalid-type', path, `${what} must be a string`);
    return null;
  }
  if (v.length > 64 || !pattern.test(v)) {
    fail(ctx, 'invalid-id', path, `${what} must match ${pattern.source.replace(/^\^|\$$/g, '')}`);
    return null;
  }
  return v;
}

/**
 * @param {Ctx} ctx
 * @param {unknown} v
 * @param {string} path
 * @param {number} min
 * @param {number} max
 * @param {string} what
 * @returns {string | null}
 */
function readText(ctx, v, path, min, max, what) {
  if (typeof v !== 'string') {
    fail(ctx, 'invalid-type', path, `${what} must be a string`);
    return null;
  }
  const n = v.length > max * 2 ? max + 1 : codePoints(v, max);
  if (n < min || n > max) {
    fail(ctx, 'invalid-length', path, `${what} must be ${min}-${max} characters`);
    return null;
  }
  return v;
}

/**
 * @param {Ctx} ctx
 * @param {unknown} v
 * @returns {{ rows: string[] } | null}
 */
function readBoard(ctx, v) {
  const fields = readFields(ctx, v, 'board', BOARD_FIELDS, ['rows']);
  const rows = fields?.get('rows');
  if (fields === null || rows === undefined) {
    return null;
  }
  const path = 'board.rows';
  if (!Array.isArray(rows)) {
    fail(ctx, 'invalid-type', path, 'board.rows must be an array of strings');
    return null;
  }
  if (rows.length < 1 || rows.length > MAX_SIDE) {
    fail(ctx, 'board-size', path, `Board height must be 1-${MAX_SIDE}, got ${rows.length}`);
    return null;
  }
  const before = ctx.issues.length;
  for (let y = 0; y < rows.length; y += 1) {
    const row = rows[y];
    if (typeof row !== 'string') {
      fail(ctx, 'invalid-type', child(path, y), 'Board rows must be strings');
    } else if (row.length < 1 || row.length > MAX_SIDE) {
      fail(ctx, 'board-size', child(path, y), `Board width must be 1-${MAX_SIDE}, got ${row.length}`);
    }
  }
  if (ctx.issues.length > before) {
    return null;
  }
  const width = rows[0].length;
  let active = 0;
  for (let y = 0; y < rows.length; y += 1) {
    const row = /** @type {string} */ (rows[y]);
    if (row.length !== width) {
      fail(ctx, 'board-ragged', child(path, y), `Row ${y} has length ${row.length}; expected ${width}`);
    } else if (!BOARD_ROW.test(row)) {
      fail(ctx, 'board-invalid-char', child(path, y), `Row ${y} may only contain # and .`);
    } else {
      for (let x = 0; x < width; x += 1) {
        active += row[x] === '#' ? 1 : 0;
      }
    }
  }
  if (ctx.issues.length > before) {
    return null;
  }
  if (active < 1 || active > MAX_ACTIVE) {
    fail(ctx, 'board-area', path, `Board must have 1-${MAX_ACTIVE} active cells, got ${active}`);
    return null;
  }
  return { rows: rows.slice() };
}

/**
 * @param {Ctx} ctx
 * @param {unknown} v
 * @param {string} path
 * @returns {XY[] | null}
 */
function readCells(ctx, v, path) {
  if (!Array.isArray(v)) {
    fail(ctx, 'invalid-type', path, 'Piece cells must be an array of [x, y] pairs');
    return null;
  }
  if (v.length < 1 || v.length > MAX_PIECE_CELLS) {
    fail(ctx, 'piece-size', path, `A piece has 1-${MAX_PIECE_CELLS} cells, got ${v.length}`);
    return null;
  }
  /** @type {XY[]} */
  const cells = [];
  let shapeOk = true;
  v.forEach((c, i) => {
    if (Array.isArray(c) && c.length === 2 && Number.isSafeInteger(c[0]) && Number.isSafeInteger(c[1])) {
      cells.push([c[0], c[1]]);
    } else {
      shapeOk = false;
      fail(ctx, 'invalid-type', child(path, i), 'A cell must be a pair of integers [x, y]');
    }
  });
  if (!shapeOk) {
    return null;
  }
  const seen = new Set();
  let unique = true;
  cells.forEach(([x, y], i) => {
    const key = `${x},${y}`;
    if (seen.has(key)) {
      unique = false;
      fail(ctx, 'piece-duplicate-cell', child(path, i), `Cell [${x}, ${y}] is repeated`);
    }
    seen.add(key);
  });
  if (!unique) {
    return null;
  }
  const norm = normalizeCells(cells);
  if (norm.some(([x, y], i) => x !== cells[i][0] || y !== cells[i][1])) {
    fail(ctx, 'piece-not-normalized', path, 'Cells must be translated to min x = min y = 0 and sorted by (y, x)');
    return null;
  }
  if (!isConnected(cells)) {
    fail(ctx, 'piece-disconnected', path, 'Piece cells must be edge-connected');
    return null;
  }
  return cells;
}

/**
 * @param {Ctx} ctx
 * @param {unknown} v
 * @param {number} area
 * @returns {Piece[] | null}
 */
function readPieces(ctx, v, area) {
  if (!Array.isArray(v)) {
    fail(ctx, 'invalid-type', 'pieces', 'pieces must be an array');
    return null;
  }
  if (v.length < 1 || v.length > MAX_PIECES) {
    fail(ctx, 'piece-count', 'pieces', `A pack has 1-${MAX_PIECES} pieces, got ${v.length}`);
    return null;
  }
  const before = ctx.issues.length;
  /** @type {Piece[]} */
  const pieces = [];
  const ids = new Set();
  v.forEach((raw, i) => {
    const path = child('pieces', i);
    const fields = readFields(ctx, raw, path, PIECE_FIELDS, ['id', 'label', 'color', 'cells']);
    if (fields === null) {
      return;
    }
    const id = fields.has('id') ? readId(ctx, fields.get('id'), child(path, 'id'), PIECE_ID, 'Piece id') : null;
    if (id !== null) {
      if (ids.has(id)) {
        fail(ctx, 'duplicate-id', child(path, 'id'), `Piece id "${id}" is repeated`);
      }
      ids.add(id);
    }
    const label = fields.has('label') ? readText(ctx, fields.get('label'), child(path, 'label'), 0, 4, 'Piece label') : null;
    const colorValue = fields.get('color');
    let color = null;
    if (fields.has('color')) {
      if (typeof colorValue !== 'string') {
        fail(ctx, 'invalid-type', child(path, 'color'), 'Piece color must be a string');
      } else if (!COLOR.test(colorValue)) {
        fail(ctx, 'invalid-color', child(path, 'color'), 'Piece color must look like #rrggbb');
      } else {
        color = colorValue;
      }
    }
    const cells = fields.has('cells') ? readCells(ctx, fields.get('cells'), child(path, 'cells')) : null;
    if (id !== null && label !== null && color !== null && cells !== null) {
      pieces.push({ id, label, color, cells });
    }
  });
  if (ctx.issues.length > before) {
    return null;
  }
  const total = pieces.reduce((sum, p) => sum + p.cells.length, 0);
  if (total !== area) {
    fail(ctx, 'area-mismatch', 'pieces', `Pieces cover ${total} cells but the board has ${area} active cells`);
    return null;
  }
  return pieces;
}

/**
 * Policy warnings only: nothing here makes a rules-valid pack invalid.
 * @param {Ctx} ctx
 * @param {Piece[]} pieces
 */
function warnAboutPieces(ctx, pieces) {
  /** @type {Map<string, string>} */
  const shapes = new Map();
  pieces.forEach((piece, i) => {
    const path = child('pieces', i);
    if (piece.cells.length < 3) {
      warn(ctx, 'small-piece', path, `Piece ${piece.id} has fewer than 3 cells`);
    }
    if (hasHole(piece.cells)) {
      warn(ctx, 'piece-hole', path, `Piece ${piece.id} has a hole`);
    }
    const key = canonicalKey(piece.cells);
    const first = shapes.get(key);
    if (first === undefined) {
      shapes.set(key, piece.id);
    } else {
      warn(ctx, 'duplicate-shape', path, `Piece ${piece.id} has the same shape as piece ${first}`);
    }
  });
}

/** @typedef {{ board: Board, pieces: Piece[], byId: Map<string, Piece> }} Env */

/**
 * @param {Ctx} ctx
 * @param {unknown} v
 * @param {string} path
 * @param {Env} env
 * @returns {{ pose: Pose, cells: XY[] } | null}
 */
function readPose(ctx, v, path, env) {
  const fields = readFields(ctx, v, path, POSE_FIELDS, ['piece', 'x', 'y', 'turn', 'mirrored']);
  if (fields === null) {
    return null;
  }
  const before = ctx.issues.length;
  const pieceId = fields.get('piece');
  /** @type {Piece | undefined} */
  let piece;
  if (fields.has('piece')) {
    piece = typeof pieceId === 'string' ? env.byId.get(pieceId) : undefined;
    if (piece === undefined) {
      fail(ctx, 'pose-unknown-piece', child(path, 'piece'), 'A pose must name a piece of this pack');
    }
  }
  for (const key of ['x', 'y']) {
    if (fields.has(key) && !Number.isSafeInteger(fields.get(key))) {
      fail(ctx, 'invalid-type', child(path, key), `Pose ${key} must be an integer`);
    }
  }
  const turn = fields.get('turn');
  if (fields.has('turn') && !(Number.isInteger(turn) && /** @type {number} */ (turn) >= 0 && /** @type {number} */ (turn) <= 3)) {
    fail(ctx, 'invalid-turn', child(path, 'turn'), 'Pose turn must be an integer 0-3');
  }
  if (fields.has('mirrored') && typeof fields.get('mirrored') !== 'boolean') {
    fail(ctx, 'invalid-type', child(path, 'mirrored'), 'Pose mirrored must be a boolean');
  }
  if (ctx.issues.length > before || piece === undefined) {
    return null;
  }
  const pose = /** @type {Pose} */ ({
    piece: piece.id,
    x: /** @type {number} */ (fields.get('x')),
    y: /** @type {number} */ (fields.get('y')),
    turn: /** @type {import('./types.js').Turn} */ (turn),
    mirrored: /** @type {boolean} */ (fields.get('mirrored')),
  });
  const cells = poseCells(piece, pose);
  const { width, height, active } = env.board;
  for (const [x, y] of cells) {
    if (x < 0 || y < 0 || x >= width || y >= height) {
      fail(ctx, 'pose-out-of-bounds', path, `Piece ${piece.id} leaves the board at [${x}, ${y}]`);
      return null;
    }
    if (active[y * width + x] !== 1) {
      fail(ctx, 'pose-blocked', path, `Piece ${piece.id} covers blocked cell [${x}, ${y}]`);
      return null;
    }
  }
  return { pose, cells };
}

/**
 * @param {Ctx} ctx
 * @param {unknown} v
 * @param {string} path
 * @param {Env} env
 * @param {number} maxLength
 * @param {string} lengthCode
 * @returns {Pose[] | null}
 */
function readPoses(ctx, v, path, env, maxLength, lengthCode) {
  if (!Array.isArray(v)) {
    fail(ctx, 'invalid-type', path, `${path} must be an array of poses`);
    return null;
  }
  if (v.length > maxLength) {
    fail(ctx, lengthCode, path, `${path} has ${v.length} poses; at most ${maxLength} are allowed`);
    return null;
  }
  const before = ctx.issues.length;
  const covered = new Uint8Array(env.board.active.length);
  const seen = new Set();
  /** @type {Pose[]} */
  const poses = [];
  v.forEach((raw, i) => {
    const item = readPose(ctx, raw, child(path, i), env);
    if (item === null) {
      return;
    }
    if (seen.has(item.pose.piece)) {
      fail(ctx, 'pose-duplicate-piece', child(path, i), `Piece ${item.pose.piece} appears more than once`);
      return;
    }
    seen.add(item.pose.piece);
    let overlap = false;
    for (const [x, y] of item.cells) {
      const at = y * env.board.width + x;
      overlap = overlap || covered[at] === 1;
      covered[at] = 1;
    }
    if (overlap) {
      fail(ctx, 'pose-overlap', child(path, i), `Piece ${item.pose.piece} overlaps another piece`);
      return;
    }
    poses.push(item.pose);
  });
  return ctx.issues.length === before ? poses : null;
}

/**
 * A complete exact cover: one pose per piece, every active cell once.
 * @param {Ctx} ctx
 * @param {unknown} v
 * @param {string} path
 * @param {Env} env
 * @returns {Pose[] | null}
 */
function readLayout(ctx, v, path, env) {
  const poses = readPoses(ctx, v, path, env, env.pieces.length, 'layout-invalid');
  if (poses === null) {
    return null;
  }
  if (poses.length !== env.pieces.length || !isValidLayout(env.board, env.pieces, poses)) {
    fail(ctx, 'layout-invalid', path, `${path} must place every piece exactly once and cover every active cell`);
    return null;
  }
  return poses;
}

/**
 * @param {Pose[]} clues
 * @param {Pose[]} solution
 * @param {Env} env
 * @returns {string | null} the first clue piece the solution places elsewhere
 */
function firstClueMismatch(clues, solution, env) {
  const placed = new Map(solution.map((pose) => [pose.piece, pose]));
  for (const clue of clues) {
    const piece = /** @type {Piece} */ (env.byId.get(clue.piece));
    const other = /** @type {Pose} */ (placed.get(clue.piece));
    const a = poseCells(piece, clue);
    const b = poseCells(piece, other);
    if (a.some(([x, y], i) => x !== b[i][0] || y !== b[i][1])) {
      return clue.piece;
    }
  }
  return null;
}

/**
 * @param {Ctx} ctx
 * @param {unknown} v
 * @param {string} path
 * @returns {Metrics | null}
 */
function readMetricsV2(ctx, v, path) {
  const fields = readFields(ctx, v, path, METRICS_FIELDS, ['U', 'B', 'branchTrials', 'rowTrials', 'stop', 'R', 'H']);
  if (fields === null) {
    return null;
  }
  const before = ctx.issues.length;
  for (const key of ['U', 'B', 'branchTrials', 'rowTrials', 'R']) {
    if (fields.has(key) && !isCount(fields.get(key))) {
      fail(ctx, 'rating-invalid', child(path, key), `${key} must be a nonnegative integer`);
    }
  }
  if (fields.has('H') && !isScore(fields.get('H'))) {
    fail(ctx, 'rating-invalid', child(path, 'H'), 'H must be a finite nonnegative number');
  }
  if (fields.has('stop') && !STOPS.has(/** @type {string} */ (fields.get('stop')))) {
    fail(ctx, 'rating-invalid', child(path, 'stop'), 'stop must be solution, branch-cap or row-cap');
  }
  if (ctx.issues.length > before) {
    return null;
  }
  return /** @type {Metrics} */ ({
    U: fields.get('U'),
    B: fields.get('B'),
    branchTrials: fields.get('branchTrials'),
    rowTrials: fields.get('rowTrials'),
    stop: fields.get('stop'),
    R: fields.get('R'),
    H: fields.get('H'),
  });
}

/**
 * A rating is a claim. `difficulty-v2` is checked strictly; `difficulty-v1`
 * and foreign models are preserved with only their basic fields and opaque
 * bounded metrics, and are never reinterpreted.
 * @param {Ctx} ctx
 * @param {unknown} v
 * @param {string} path
 * @returns {RatingClaim | null}
 */
function readRating(ctx, v, path) {
  if (!isPlainObject(v)) {
    fail(ctx, 'invalid-type', path, 'rating must be an object');
    return null;
  }
  const current = ownValue(v, 'model') === 'difficulty-v2';
  const fields = readFields(ctx, v, path, current ? RATING_V2_FIELDS : RATING_CLAIM_FIELDS,
    current ? ['model', 'score', 'level', 'saturated', 'metrics'] : ['model', 'score', 'level']);
  if (fields === null) {
    return null;
  }
  const before = ctx.issues.length;
  const model = fields.has('model') ? readText(ctx, fields.get('model'), child(path, 'model'), 1, 64, 'Rating model') : null;
  if (fields.has('score') && !isScore(fields.get('score'))) {
    fail(ctx, 'rating-invalid', child(path, 'score'), 'Rating score must be a finite nonnegative number');
  }
  if (fields.has('level')) {
    readText(ctx, fields.get('level'), child(path, 'level'), 1, 64, 'Rating level');
  }
  for (const key of ['saturated', 'censored']) {
    if (fields.has(key) && typeof fields.get(key) !== 'boolean') {
      fail(ctx, 'rating-invalid', child(path, key), `Rating ${key} must be a boolean`);
    }
  }
  /** @type {unknown} */
  let metrics;
  if (fields.has('metrics')) {
    const mPath = child(path, 'metrics');
    if (current) {
      metrics = readMetricsV2(ctx, fields.get('metrics'), mPath);
    } else if (!isPlainObject(fields.get('metrics'))) {
      fail(ctx, 'rating-invalid', mPath, 'Rating metrics must be an object');
    } else {
      const copy = copyJson(fields.get('metrics'), CLAIM_JSON_DEPTH, MAX_JSON_NODES);
      if (!copy.ok) {
        fail(ctx, 'rating-invalid', mPath, copy.message);
      } else if (byteLength(JSON.stringify(copy.value)) > MAX_CLAIM_METRICS_BYTES) {
        fail(ctx, 'rating-invalid', mPath, `Rating metrics exceed ${MAX_CLAIM_METRICS_BYTES} bytes`);
      } else {
        metrics = copy.value;
      }
    }
  }
  if (ctx.issues.length > before || model === null) {
    return null;
  }
  if (!current && model !== 'difficulty-v1') {
    warn(ctx, 'unsupported-model', child(path, 'model'), `Rating model "${model}" is not supported; the claim is kept but not used`);
  }
  /** @type {RatingClaim} */
  const claim = {
    model,
    score: /** @type {number} */ (fields.get('score')),
    level: /** @type {string} */ (fields.get('level')),
  };
  for (const key of /** @type {const} */ (['saturated', 'censored'])) {
    if (fields.has(key)) {
      claim[key] = /** @type {boolean} */ (fields.get(key));
    }
  }
  if (metrics !== undefined) {
    claim.metrics = /** @type {object} */ (metrics);
  }
  return claim;
}

/**
 * @param {Ctx} ctx
 * @param {unknown} v
 * @param {string} path
 * @returns {CertificateClaim | null}
 */
function readCertificate(ctx, v, path) {
  const fields = readFields(ctx, v, path, CERTIFICATE_FIELDS, ['status', 'model']);
  if (fields === null) {
    return null;
  }
  const before = ctx.issues.length;
  if (fields.has('status') && !STATUSES.has(/** @type {string} */ (fields.get('status')))) {
    fail(ctx, 'certificate-invalid', child(path, 'status'), 'Certificate status must be unique, multiple, not-proved or unsatisfiable');
  }
  const model = fields.has('model') ? readText(ctx, fields.get('model'), child(path, 'model'), 1, 64, 'Certificate model') : null;
  if (fields.has('rowLimit') && !isCount(fields.get('rowLimit'))) {
    fail(ctx, 'certificate-invalid', child(path, 'rowLimit'), 'Certificate rowLimit must be a nonnegative integer');
  }
  if (ctx.issues.length > before || model === null) {
    return null;
  }
  if (model !== 'dlx-v1') {
    warn(ctx, 'unsupported-model', child(path, 'model'), `Certificate model "${model}" is not supported; the claim is kept but not used`);
  }
  /** @type {CertificateClaim} */
  const claim = { status: /** @type {CertificateClaim['status']} */ (fields.get('status')), model };
  if (fields.has('rowLimit')) {
    claim.rowLimit = /** @type {number} */ (fields.get('rowLimit'));
  }
  return claim;
}

/**
 * @param {Ctx} ctx
 * @param {unknown} v
 * @param {string} path
 * @param {Env} env
 * @returns {PackPuzzle | null}
 */
function readPuzzle(ctx, v, path, env) {
  const fields = readFields(ctx, v, path, PUZZLE_FIELDS, ['id', 'clues']);
  if (fields === null) {
    return null;
  }
  const before = ctx.issues.length;
  const id = fields.has('id') ? readId(ctx, fields.get('id'), child(path, 'id'), PUZZLE_ID, 'Puzzle id') : null;
  const title = fields.has('title') ? readText(ctx, fields.get('title'), child(path, 'title'), 0, 80, 'Puzzle title') : null;
  const clues = fields.has('clues')
    ? readPoses(ctx, fields.get('clues'), child(path, 'clues'), env, env.pieces.length - 1, 'too-many-clues')
    : null;
  const solutionRaw = fields.get('solution');
  const solution = solutionRaw === undefined || solutionRaw === null
    ? null
    : readLayout(ctx, solutionRaw, child(path, 'solution'), env);
  if (clues !== null && solution !== null) {
    const moved = firstClueMismatch(clues, solution, env);
    if (moved !== null) {
      fail(ctx, 'solution-clue-mismatch', child(path, 'solution'), `The solution places clue piece ${moved} on different cells`);
    }
  }
  const ratingRaw = fields.get('rating');
  const rating = ratingRaw === undefined || ratingRaw === null ? null : readRating(ctx, ratingRaw, child(path, 'rating'));
  const certRaw = fields.get('certificate');
  const certificate = certRaw === undefined || certRaw === null
    ? null
    : readCertificate(ctx, certRaw, child(path, 'certificate'));
  if (ctx.issues.length > before || id === null || clues === null) {
    return null;
  }
  /** @type {PackPuzzle} */
  const puzzle = { id };
  if (title !== null) {
    puzzle.title = title;
  }
  puzzle.clues = clues;
  puzzle.solution = solution;
  puzzle.rating = rating;
  puzzle.certificate = certificate;
  return puzzle;
}

/**
 * @param {Ctx} ctx
 * @param {unknown} input
 * @returns {Pack | null}
 */
function readPack(ctx, input) {
  if (!isPlainObject(input)) {
    fail(ctx, 'invalid-type', '$', 'A pack must be a JSON object');
    return null;
  }
  const format = ownValue(input, 'format');
  const version = ownValue(input, 'version');
  if (format === undefined) {
    fail(ctx, 'missing-field', 'format', 'Missing required field "format"');
  } else if (format !== FORMAT) {
    fail(ctx, 'bad-format', 'format', `format must be "${FORMAT}"`);
  }
  if (version === undefined) {
    fail(ctx, 'missing-field', 'version', 'Missing required field "version"');
  } else if (!SUPPORTED_VERSIONS.includes(/** @type {number} */ (version))) {
    fail(ctx, 'unsupported-version', 'version', `Unsupported version; this application reads version ${SUPPORTED_VERSIONS.join(', ')}`);
  }
  if (ctx.issues.length > 0) {
    return null;
  }

  const fields = readFields(ctx, input, '$', ROOT_FIELDS, ['kind', 'rules', 'board', 'pieces', 'puzzles']);
  if (fields === null) {
    return null;
  }
  const kind = fields.get('kind');
  if (fields.has('kind') && kind !== 'piece-set' && kind !== 'puzzle-pack') {
    fail(ctx, 'bad-kind', 'kind', 'kind must be "piece-set" or "puzzle-pack"');
  }
  if (fields.has('rules') && !RULES.includes(/** @type {string} */ (fields.get('rules')))) {
    fail(ctx, 'bad-rules', 'rules', `rules must be "${RULES[0]}"`);
  }
  let rotation = 0;
  if (fields.has('presentation')) {
    const p = readFields(ctx, fields.get('presentation'), 'presentation', PRESENTATION_FIELDS, ['rotation']);
    const r = p?.get('rotation');
    if (p !== null && r !== undefined) {
      if (typeof r === 'number' && Number.isInteger(r) && r >= 0 && r < 360 && r % 45 === 0) {
        rotation = r;
      } else {
        fail(ctx, 'invalid-rotation', 'presentation.rotation', 'rotation must be 0, 45, 90, ... or 315');
      }
    }
  }
  const generation = fields.has('generation')
    ? readJsonObject(ctx, fields.get('generation'), 'generation', MAX_FILE_BYTES, 'generation-too-large')
    : null;
  const meta = fields.has('meta')
    ? readJsonObject(ctx, fields.get('meta'), 'meta', MAX_META_BYTES, 'meta-too-large')
    : null;

  const board = fields.has('board') ? readBoard(ctx, fields.get('board')) : null;
  const boardModel = board === null ? null : boardFromRows(board.rows);
  const area = boardModel === null ? 0 : activeCount(boardModel);
  const pieces = boardModel !== null && fields.has('pieces') ? readPieces(ctx, fields.get('pieces'), area) : null;
  if (ctx.issues.length > 0 || board === null || boardModel === null || pieces === null) {
    return null;
  }

  warnAboutPieces(ctx, pieces);
  const parts = regions(boardModel).length;
  if (parts > 1) {
    warn(ctx, 'board-disconnected', 'board.rows', `The active cells form ${parts} separate regions`);
  }
  /** @type {Env} */
  const env = { board: boardModel, pieces, byId: new Map(pieces.map((p) => [p.id, p])) };

  const witnessRaw = fields.get('witness');
  const witness = witnessRaw === undefined || witnessRaw === null ? null : readLayout(ctx, witnessRaw, 'witness', env);

  /** @type {PackPuzzle[]} */
  const puzzles = [];
  const puzzlesRaw = fields.get('puzzles');
  if (!Array.isArray(puzzlesRaw)) {
    fail(ctx, 'invalid-type', 'puzzles', 'puzzles must be an array');
  } else if (kind === 'piece-set' && puzzlesRaw.length !== 0) {
    fail(ctx, 'kind-mismatch', 'puzzles', 'A piece-set has no puzzles');
  } else if (kind === 'puzzle-pack' && (puzzlesRaw.length < 1 || puzzlesRaw.length > MAX_PUZZLES)) {
    fail(ctx, 'puzzle-count', 'puzzles', `A puzzle-pack has 1-${MAX_PUZZLES} puzzles, got ${puzzlesRaw.length}`);
  } else {
    const ids = new Set();
    puzzlesRaw.forEach((raw, i) => {
      const puzzle = readPuzzle(ctx, raw, child('puzzles', i), env);
      if (puzzle !== null) {
        if (ids.has(puzzle.id)) {
          fail(ctx, 'duplicate-id', child(child('puzzles', i), 'id'), `Puzzle id "${puzzle.id}" is repeated`);
        }
        ids.add(puzzle.id);
        puzzles.push(puzzle);
      }
    });
  }
  if (ctx.issues.length > 0) {
    return null;
  }

  /** @type {Pack} */
  const pack = {
    format: FORMAT,
    version: 1,
    kind: /** @type {Pack['kind']} */ (kind),
    rules: 'free-polyomino-v1',
    board,
    presentation: { rotation },
    pieces,
    witness,
    puzzles,
  };
  if (generation !== null) {
    pack.generation = generation;
  }
  if (meta !== null) {
    pack.meta = meta;
  }
  return pack;
}

/**
 * Validates untrusted data (normally `JSON.parse` output) and returns a fresh,
 * normalized pack. Never throws: malformed input, even hostile objects,
 * yields `{ ok: false, issues }` (at most 100 issues, in stage order).
 * Optional witness/solution/rating/certificate are `null` when absent; the
 * ratings and certificates returned are claims, never verified facts.
 * @param {unknown} input
 * @returns {Result<Pack>}
 */
export function validatePack(input) {
  const ctx = newCtx();
  /** @type {Pack | null} */
  let value = null;
  try {
    value = readPack(ctx, input);
  } catch {
    ctx.issues.length = 0;
    fail(ctx, 'invalid-input', '$', 'The input could not be read as a pack');
    value = null;
  }
  if (ctx.issues.length > 0 || value === null) {
    if (ctx.truncated) {
      ctx.issues.push({ code: 'too-many-issues', path: '$', message: `More than ${MAX_ISSUES} problems; the rest are not listed` });
    }
    return { ok: false, issues: ctx.issues };
  }
  return { ok: true, value, warnings: ctx.warnings };
}

/**
 * Size check (UTF-8 bytes, before parsing), `JSON.parse` without a reviver,
 * then `validatePack`. A leading byte-order mark is ignored.
 * @param {string} text
 * @returns {Result<Pack>}
 */
export function parsePack(text) {
  if (typeof text !== 'string') {
    return { ok: false, issues: [{ code: 'invalid-type', path: '$', message: 'Pack text must be a string' }] };
  }
  // Every UTF-16 unit takes at least one byte, so long strings are rejected without encoding.
  if (text.length > MAX_FILE_BYTES || byteLength(text) > MAX_FILE_BYTES) {
    return {
      ok: false,
      issues: [{ code: 'pack-too-large', path: '$', message: `A pack file is at most ${MAX_FILE_BYTES} bytes` }],
    };
  }
  let data;
  try {
    data = JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
  } catch (e) {
    const detail = e instanceof Error ? e.message.slice(0, 200) : 'parse error';
    return { ok: false, issues: [{ code: 'invalid-json', path: '$', message: `Not valid JSON: ${detail}` }] };
  }
  return validatePack(data);
}

/**
 * Writes a pose with its canonical orientation index; its occupied cells and
 * origin are unchanged. Poses naming unknown pieces are copied as they are.
 * @param {Pose} pose
 * @param {Map<string, Piece>} byId
 * @returns {Pose}
 */
function canonicalPose(pose, byId) {
  const piece = byId.get(pose.piece);
  let { turn, mirrored } = pose;
  if (piece !== undefined) {
    const t = canonicalT(piece.cells, (pose.mirrored ? 4 : 0) + pose.turn);
    turn = /** @type {import('./types.js').Turn} */ (t & 3);
    mirrored = t >= 4;
  }
  return { piece: pose.piece, x: pose.x, y: pose.y, turn, mirrored };
}

/**
 * @param {Pose[]} poses
 * @param {Map<string, Piece>} byId
 * @returns {Pose[]}
 */
const canonicalPoses = (poses, byId) => poses.map((pose) => canonicalPose(pose, byId));

/**
 * @param {unknown} value
 * @returns {unknown}
 */
function copyClaimJson(value) {
  const copy = copyJson(value, MAX_JSON_DEPTH, MAX_JSON_NODES);
  if (!copy.ok) {
    throw new PackError('invalid-json', copy.message);
  }
  return copy.value;
}

/**
 * Whitelisted, ordered copy of a rating claim.
 * @param {RatingClaim | import('./types.js').Rating} r
 * @returns {RatingClaim}
 */
function ratingClaim(r) {
  /** @type {RatingClaim} */
  const out = { model: r.model, score: r.score, level: r.level };
  if (r.saturated !== undefined) {
    out.saturated = r.saturated;
  }
  if ('censored' in r && r.censored !== undefined) {
    out.censored = r.censored;
  }
  if (r.metrics !== undefined && r.metrics !== null) {
    if (r.model === 'difficulty-v2') {
      const m = /** @type {Metrics} */ (r.metrics);
      out.metrics = { U: m.U, B: m.B, branchTrials: m.branchTrials, rowTrials: m.rowTrials, stop: m.stop, R: m.R, H: m.H };
    } else {
      out.metrics = /** @type {object} */ (copyClaimJson(r.metrics));
    }
  }
  return out;
}

/**
 * Whitelisted copy of a certificate claim; `verified` is dropped.
 * @param {CertificateClaim | import('./types.js').Certificate} c
 * @returns {CertificateClaim}
 */
function certificateClaim(c) {
  /** @type {CertificateClaim} */
  const out = { status: c.status, model: c.model };
  if (c.rowLimit !== undefined) {
    out.rowLimit = c.rowLimit;
  }
  return out;
}

/**
 * @param {Pack} p
 * @param {boolean} omitSolutions
 * @returns {object}
 */
function toWire(p, omitSolutions) {
  const byId = new Map(p.pieces.map((piece) => [piece.id, piece]));
  /** @type {Record<string, unknown>} */
  const wire = {
    format: FORMAT,
    version: 1,
    kind: p.kind,
    rules: p.rules,
    board: { rows: p.board.rows },
    presentation: { rotation: p.presentation?.rotation ?? 0 },
    pieces: p.pieces.map((piece) => ({
      id: piece.id,
      label: piece.label,
      color: piece.color,
      cells: piece.cells.map(([x, y]) => [x, y]),
    })),
  };
  if (!omitSolutions && p.witness) {
    wire.witness = canonicalPoses(p.witness, byId);
  }
  wire.puzzles = p.puzzles.map((puzzle) => {
    /** @type {Record<string, unknown>} */
    const out = { id: puzzle.id };
    if (puzzle.title !== undefined) {
      out.title = puzzle.title;
    }
    out.clues = canonicalPoses(puzzle.clues, byId);
    if (!omitSolutions && puzzle.solution) {
      out.solution = canonicalPoses(puzzle.solution, byId);
    }
    if (puzzle.rating) {
      out.rating = ratingClaim(puzzle.rating);
    }
    if (puzzle.certificate) {
      out.certificate = certificateClaim(puzzle.certificate);
    }
    return out;
  });
  if (p.generation !== undefined && p.generation !== null) {
    wire.generation = p.generation;
  }
  if (p.meta !== undefined && p.meta !== null) {
    wire.meta = p.meta;
  }
  return wire;
}

/**
 * Canonical JSON text: fixed key order, piece order preserved, symmetric poses
 * written with `canonicalT`, absent proofs omitted, `verified` never written.
 * `omitSolutions` drops the set witness and every puzzle solution; claims are
 * kept as claims. Throws PackError('pack-too-large') when the result would
 * exceed the importable file size.
 * @param {Pack} p
 * @param {{ omitSolutions?: boolean, pretty?: boolean }} [o]
 * @returns {string}
 */
export function serializePack(p, o = {}) {
  let text;
  try {
    text = JSON.stringify(toWire(p, o.omitSolutions === true), null, o.pretty === true ? 2 : undefined);
  } catch (e) {
    if (e instanceof PackError) {
      throw e;
    }
    throw new PackError('invalid-json', 'The pack could not be written as JSON');
  }
  if (text.length > MAX_FILE_BYTES || byteLength(text) > MAX_FILE_BYTES) {
    throw new PackError('pack-too-large', `The serialized pack exceeds ${MAX_FILE_BYTES} bytes`);
  }
  return text;
}

/**
 * Builds a pack from engine objects. The kind follows the puzzle count; poses
 * are written canonically; ratings and certificates become claims (`verified`
 * is dropped). Piece order, and with it any parallel `macroRegion` hint, is
 * preserved. Use `validatePack` to check a pack from an untrusted source.
 * @param {{ board: Board, rotation: number, pieces: Piece[], witness?: Pose[] | null,
 *   puzzles: Puzzle[] | PackPuzzle[], generation?: object, meta?: object }} a
 * @returns {Pack}
 */
export function createPack(a) {
  if (!Number.isInteger(a.rotation) || a.rotation < 0 || a.rotation >= 360 || a.rotation % 45 !== 0) {
    throw new PackError('invalid-rotation', `rotation must be 0, 45, ..., 315, got ${a.rotation}`);
  }
  const byId = new Map(a.pieces.map((piece) => [piece.id, piece]));
  /** @type {Pack} */
  const pack = {
    format: FORMAT,
    version: 1,
    kind: a.puzzles.length === 0 ? 'piece-set' : 'puzzle-pack',
    rules: 'free-polyomino-v1',
    board: { rows: boardToRows(a.board) },
    presentation: { rotation: a.rotation },
    pieces: a.pieces.map((piece) => ({
      id: piece.id,
      label: piece.label,
      color: piece.color,
      cells: piece.cells.map(([x, y]) => [x, y]),
    })),
    witness: a.witness ? canonicalPoses(a.witness, byId) : null,
    puzzles: a.puzzles.map((puzzle) => {
      /** @type {PackPuzzle} */
      const out = { id: puzzle.id };
      if (puzzle.title !== undefined) {
        out.title = puzzle.title;
      }
      out.clues = canonicalPoses(puzzle.clues, byId);
      out.solution = puzzle.solution ? canonicalPoses(puzzle.solution, byId) : null;
      out.rating = puzzle.rating ? ratingClaim(puzzle.rating) : null;
      out.certificate = puzzle.certificate ? certificateClaim(puzzle.certificate) : null;
      return out;
    }),
  };
  if (a.generation !== undefined) {
    pack.generation = /** @type {object} */ (copyClaimJson(a.generation));
  }
  if (a.meta !== undefined) {
    const meta = /** @type {object} */ (copyClaimJson(a.meta));
    if (byteLength(JSON.stringify(meta)) > MAX_META_BYTES) {
      throw new PackError('meta-too-large', `meta exceeds ${MAX_META_BYTES} bytes serialized`);
    }
    pack.meta = meta;
  }
  return pack;
}

/**
 * The pack's board as an engine Board.
 * @param {Pack} pack
 * @returns {Board}
 */
export function packBoard(pack) {
  return boardFromRows(pack.board.rows);
}
