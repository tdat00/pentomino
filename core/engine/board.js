// @ts-check
// Board model: active-cell masks, presets, region/exterior analysis, D4
// symmetries and generation validation. Authored W x H coordinates are never
// changed implicitly; analysis copies report their offsets. Pure and
// dependency-free; presentation rotation is not part of board data.

import { TRANSFORMS } from './geometry.js';

/** @typedef {import('./types.js').XY} XY */
/** @typedef {import('./types.js').Board} Board */
/** @typedef {import('./types.js').Issue} Issue */
/** @typedef {Issue & { cells?: XY[] }} BoardIssue Issue plus offending cells (board coordinates) to highlight. */

export const MIN_ACTIVE = 30;
export const MAX_SIDE = 32;
export const LARGE_BOARD_WARNING_CELLS = 360;
export const LARGE_BOARD_MESSAGE = 'Large board: generation can take up to 2 minutes';
const PRESET_MAX_SIDE = 64;

/**
 * @param {Board} b
 * @returns {number}
 */
export function activeCount(b) {
  let n = 0;
  for (let i = 0; i < b.active.length; i += 1) {
    n += b.active[i];
  }
  return n;
}

/**
 * Active cells in row-major order, as [x, y].
 * @param {Board} b
 * @returns {XY[]}
 */
export function activeCells(b) {
  /** @type {XY[]} */
  const out = [];
  for (let y = 0; y < b.height; y += 1) {
    for (let x = 0; x < b.width; x += 1) {
      if (b.active[y * b.width + x] === 1) {
        out.push([x, y]);
      }
    }
  }
  return out;
}

/**
 * Rows use `#` for active and `.` for blocked. Throws RangeError when the rows
 * are not a nonempty, equal-length list of nonempty strings of those characters.
 * @param {string[]} rows
 * @returns {Board}
 */
export function boardFromRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new RangeError('board rows must be a nonempty array');
  }
  const width = typeof rows[0] === 'string' ? rows[0].length : 0;
  if (width === 0) {
    throw new RangeError('board rows must be nonempty strings');
  }
  const active = new Uint8Array(width * rows.length);
  rows.forEach((row, y) => {
    if (typeof row !== 'string' || row.length !== width) {
      throw new RangeError(`board row ${y} must be a string of length ${width}`);
    }
    for (let x = 0; x < width; x += 1) {
      const ch = row[x];
      if (ch === '#') {
        active[y * width + x] = 1;
      } else if (ch !== '.') {
        throw new RangeError(`board row ${y} has invalid character at column ${x}; use # or .`);
      }
    }
  });
  return { width, height: rows.length, active };
}

/**
 * @param {Board} b
 * @returns {string[]}
 */
export function boardToRows(b) {
  /** @type {string[]} */
  const rows = [];
  for (let y = 0; y < b.height; y += 1) {
    let row = '';
    for (let x = 0; x < b.width; x += 1) {
      row += b.active[y * b.width + x] === 1 ? '#' : '.';
    }
    rows.push(row);
  }
  return rows;
}

/**
 * @param {number} value
 * @param {string} name
 * @returns {number}
 */
function checkedSize(value, name) {
  if (!Number.isInteger(value) || value < 1 || value > PRESET_MAX_SIDE) {
    throw new RangeError(`${name} must be an integer 1..${PRESET_MAX_SIDE}, got ${value}`);
  }
  return value;
}

/**
 * @param {number} w
 * @param {number} h
 * @param {(x: number, y: number) => boolean} [isActive]
 * @returns {Board}
 */
function maskBoard(w, h, isActive = () => true) {
  const width = checkedSize(w, 'width');
  const height = checkedSize(h, 'height');
  const active = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      active[y * width + x] = isActive(x, y) ? 1 : 0;
    }
  }
  return { width, height, active };
}

/**
 * @param {number} w
 * @param {number} h
 * @returns {Board}
 */
export function rectangle(w, h) {
  return maskBoard(w, h);
}

/**
 * Preset masks with their default presentation rotation (counter-clockwise degrees).
 * Invalid parameters throw RangeError.
 * @param {'rectangle' | 'heart' | 'diamond' | 'cross' | 'ring'} id
 * @param {{ n?: number, w?: number, h?: number, roundLobes?: boolean }} [p]
 * @returns {{ board: Board, rotation: number }}
 */
export function preset(id, p = {}) {
  switch (id) {
    case 'rectangle':
      return { board: rectangle(p.w ?? 10, p.h ?? 6), rotation: 0 };
    case 'heart': {
      const n = checkedSize(p.n ?? 10, 'n');
      if (n % 2 !== 0) {
        throw new RangeError(`heart size must be even, got ${n}`);
      }
      const half = n / 2;
      const round = p.roundLobes === true;
      const board = maskBoard(n, n, (x, y) => {
        if (x >= half && y < half) {
          return false;
        }
        return !(round && ((x === 0 && y === 0) || (x === n - 1 && y === n - 1)));
      });
      return { board, rotation: 45 };
    }
    case 'diamond': {
      const n = checkedSize(p.n ?? 8, 'n');
      return { board: rectangle(n, n), rotation: 45 };
    }
    case 'cross': {
      const n = checkedSize(p.n ?? 9, 'n');
      const thickness = Math.ceil(n / 3);
      const start = Math.floor((n - thickness) / 2);
      const inBar = (/** @type {number} */ v) => v >= start && v < start + thickness;
      return { board: maskBoard(n, n, (x, y) => inBar(x) || inBar(y)), rotation: 0 };
    }
    case 'ring': {
      const w = checkedSize(p.w ?? p.n ?? 8, 'width');
      const h = checkedSize(p.h ?? p.n ?? 8, 'height');
      const holeX = Math.floor((w - 2) / 2);
      const holeY = Math.floor((h - 2) / 2);
      if (holeX < 2 || w - 2 - holeX < 2 || holeY < 2 || h - 2 - holeY < 2) {
        throw new RangeError(`ring needs walls of at least 2 cells around its 2x2 hole; got ${w}x${h}`);
      }
      const board = maskBoard(w, h, (x, y) => !(x >= holeX && x < holeX + 2 && y >= holeY && y < holeY + 2));
      return { board, rotation: 0 };
    }
    default:
      throw new RangeError(`unknown board preset: ${String(id)}`);
  }
}

/**
 * Four-neighbour active regions. Each region lists row-major cell indices
 * ascending; regions are ordered by their smallest index.
 * @param {Board} b
 * @returns {number[][]}
 */
export function regions(b) {
  const { width, height, active } = b;
  const seen = new Uint8Array(active.length);
  /** @type {number[][]} */
  const out = [];
  for (let start = 0; start < active.length; start += 1) {
    if (active[start] !== 1 || seen[start] === 1) {
      continue;
    }
    /** @type {number[]} */
    const region = [];
    const stack = [start];
    seen[start] = 1;
    while (stack.length > 0) {
      const i = /** @type {number} */ (stack.pop());
      region.push(i);
      const x = i % width;
      const y = (i - x) / width;
      /** @type {number[]} */
      const next = [];
      if (x > 0) next.push(i - 1);
      if (x < width - 1) next.push(i + 1);
      if (y > 0) next.push(i - width);
      if (y < height - 1) next.push(i + width);
      for (const j of next) {
        if (active[j] === 1 && seen[j] === 0) {
          seen[j] = 1;
          stack.push(j);
        }
      }
    }
    region.sort((a, c) => a - c);
    out.push(region);
  }
  return out;
}

/**
 * 0 active, 1 exterior blocked, 2 enclosed hole. Exterior cells are blocked
 * cells reachable from outside a one-cell padded grid through blocked cells.
 * @param {Board} b
 * @returns {Uint8Array}
 */
export function classifyBlocked(b) {
  const { width, height, active } = b;
  const pw = width + 2;
  const ph = height + 2;
  const outside = new Uint8Array(pw * ph);
  const stack = [0];
  outside[0] = 1;
  while (stack.length > 0) {
    const i = /** @type {number} */ (stack.pop());
    const x = i % pw;
    const y = (i - x) / pw;
    /** @type {number[]} */
    const next = [];
    if (x > 0) next.push(i - 1);
    if (x < pw - 1) next.push(i + 1);
    if (y > 0) next.push(i - pw);
    if (y < ph - 1) next.push(i + pw);
    for (const j of next) {
      if (outside[j] === 1) {
        continue;
      }
      const jx = j % pw;
      const jy = (j - jx) / pw;
      const inside = jx >= 1 && jx <= width && jy >= 1 && jy <= height;
      if (inside && active[(jy - 1) * width + (jx - 1)] === 1) {
        continue;
      }
      outside[j] = 1;
      stack.push(j);
    }
  }
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (active[y * width + x] !== 1) {
        out[y * width + x] = outside[(y + 1) * pw + (x + 1)] === 1 ? 1 : 2;
      }
    }
  }
  return out;
}

/**
 * @param {Board} b
 * @returns {{ minX: number, minY: number, maxX: number, maxY: number } | null}
 */
function activeBounds(b) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < b.height; y += 1) {
    for (let x = 0; x < b.width; x += 1) {
      if (b.active[y * b.width + x] === 1) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  return maxX < 0 ? null : { minX, minY, maxX, maxY };
}

/**
 * @param {Board} b
 * @returns {Board}
 */
function copyBoard(b) {
  return { width: b.width, height: b.height, active: b.active.slice() };
}

/**
 * Crops to the active bounding box and reports the offsets of the crop inside
 * the authored board. An all-blocked board yields an empty 0x0 board at (0, 0).
 * @param {Board} b
 * @returns {{ board: Board, dx: number, dy: number }}
 */
export function normalizedActive(b) {
  const box = activeBounds(b);
  if (box === null) {
    return { board: { width: 0, height: 0, active: new Uint8Array(0) }, dx: 0, dy: 0 };
  }
  const width = box.maxX - box.minX + 1;
  const height = box.maxY - box.minY + 1;
  const active = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      active[y * width + x] = b.active[(y + box.minY) * b.width + (x + box.minX)];
    }
  }
  return { board: { width, height, active }, dx: box.minX, dy: box.minY };
}

/**
 * Explicit edit: crops blocked margins. A board without active cells is
 * returned unchanged (as a copy).
 * @param {Board} b
 * @returns {Board}
 */
export function trimMargins(b) {
  return activeBounds(b) === null ? copyBoard(b) : normalizedActive(b).board;
}

/**
 * D4 indices t whose transform maps the normalized active cells onto
 * themselves, ascending. Blocked margins never matter; an empty board has only
 * the identity.
 * @param {Board} b
 * @returns {number[]}
 */
export function symmetries(b) {
  const box = activeBounds(b);
  if (box === null) {
    return [0];
  }
  const width = box.maxX - box.minX + 1;
  const height = box.maxY - box.minY + 1;
  const cells = activeCells(b);
  /** @type {number[]} */
  const out = [];
  for (let t = 0; t < 8; t += 1) {
    // A symmetry keeps the bounding box, so a transform that swaps its sides needs a square one.
    if (t % 2 === 1 && width !== height) {
      continue;
    }
    const fn = TRANSFORMS[t];
    const moved = cells.map((cell) => fn(cell));
    const minX = Math.min(...moved.map((c) => c[0]));
    const minY = Math.min(...moved.map((c) => c[1]));
    // The transform is a bijection, so every image landing on an active cell proves equal sets.
    const onto = moved.every(([x, y]) => {
      const fx = x - minX;
      const fy = y - minY;
      return fx < width && fy < height && b.active[(fy + box.minY) * b.width + fx + box.minX] === 1;
    });
    if (onto) {
      out.push(t);
    }
  }
  return out;
}

/**
 * @param {unknown} b
 * @returns {string | null} a description of the first structural problem
 */
function boardProblem(b) {
  const board = /** @type {Partial<Board> | null} */ (b);
  if (board === null || typeof board !== 'object') {
    return 'board must be an object';
  }
  const { width, height, active } = board;
  if (!Number.isInteger(width) || /** @type {number} */ (width) < 1) {
    return `board width must be a positive integer, got ${width}`;
  }
  if (!Number.isInteger(height) || /** @type {number} */ (height) < 1) {
    return `board height must be a positive integer, got ${height}`;
  }
  const expected = /** @type {number} */ (width) * /** @type {number} */ (height);
  if (!(active instanceof Uint8Array) || active.length !== expected) {
    return `board mask must be a Uint8Array of length ${expected}`;
  }
  for (let i = 0; i < active.length; i += 1) {
    if (active[i] > 1) {
      return 'board mask values must be 0 or 1';
    }
  }
  return null;
}

/**
 * @param {Board} b
 * @param {number} cap largest active area the device accepts
 * @returns {{ errors: BoardIssue[], warnings: BoardIssue[] }}
 */
export function validateForGeneration(b, cap) {
  if (!Number.isFinite(cap) || cap < 0) {
    throw new RangeError(`cap must be a finite non-negative number, got ${cap}`);
  }
  /** @type {BoardIssue[]} */
  const errors = [];
  /** @type {BoardIssue[]} */
  const warnings = [];
  const problem = boardProblem(b);
  if (problem !== null) {
    errors.push({ code: 'board-invalid', path: 'board', message: problem });
    return { errors, warnings };
  }
  for (const [name, size] of /** @type {const} */ ([['width', b.width], ['height', b.height]])) {
    if (size > MAX_SIDE) {
      errors.push({
        code: 'board-side-too-large',
        path: `board.${name}`,
        message: `Board ${name} ${size} exceeds the maximum of ${MAX_SIDE}`,
      });
    }
  }
  const area = activeCount(b);
  if (area < MIN_ACTIVE) {
    errors.push({
      code: 'board-too-few-cells',
      path: 'board.active',
      message: `Board has ${area} active cells; at least ${MIN_ACTIVE} are required`,
    });
  }
  if (area > cap) {
    errors.push({
      code: 'board-too-many-cells',
      path: 'board.active',
      message: `Board has ${area} active cells; this device allows at most ${cap}`,
    });
  }
  const parts = regions(b);
  if (parts.length > 1) {
    let largest = 0;
    parts.forEach((part, i) => {
      if (part.length > parts[largest].length) {
        largest = i;
      }
    });
    /** @type {XY[]} */
    const cells = [];
    parts.forEach((part, i) => {
      if (i !== largest) {
        for (const index of part) {
          cells.push([index % b.width, Math.floor(index / b.width)]);
        }
      }
    });
    cells.sort((a, c) => a[1] - c[1] || a[0] - c[0]);
    errors.push({
      code: 'board-disconnected',
      path: 'board.active',
      message: `Active cells form ${parts.length} separate regions; they must form one connected region`,
      cells,
    });
  }
  if (area > LARGE_BOARD_WARNING_CELLS) {
    warnings.push({ code: 'board-large', path: 'board.active', message: LARGE_BOARD_MESSAGE });
  }
  return { errors, warnings };
}
