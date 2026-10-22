// @ts-check
// Display-only view mathematics. Presentation angles are counter-clockwise
// degrees; transform indices t = 4f + r follow geometry.js (r clockwise grid
// quarter turns). Nothing here touches board data, scoring, seeds or identities.

import { rotateCCW, rotateCW } from './geometry.js';

/** @typedef {import('./types.js').XY} XY */

/** @type {readonly number[]} */
export const ANGLES = Object.freeze([0, 45, 90, 135, 180, 225, 270, 315]);

const CARDINAL = /** @type {const} */ ({
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
});

const HALF_DIAGONAL = Math.SQRT1_2;
// Exact cos/sin per 45-degree step so multiples of 90 stay free of float noise.
const TRIG = Object.freeze([
  [1, 0], [HALF_DIAGONAL, HALF_DIAGONAL], [0, 1], [-HALF_DIAGONAL, HALF_DIAGONAL],
  [-1, 0], [-HALF_DIAGONAL, -HALF_DIAGONAL], [0, -1], [HALF_DIAGONAL, -HALF_DIAGONAL],
]);

/** Normalizes -0 to 0. */
const plain = (/** @type {number} */ n) => (n === 0 ? 0 : n);

/**
 * Wraps a finite multiple of 45 into 0..315. Anything else throws RangeError.
 * @param {number} deg
 * @returns {number}
 */
export function normalizeAngle(deg) {
  if (typeof deg !== 'number' || !Number.isFinite(deg) || deg % 45 !== 0) {
    throw new RangeError(`angle must be a finite multiple of 45, got ${deg}`);
  }
  return plain(((deg % 360) + 360) % 360);
}

/**
 * Center of the active bounding box in board coordinates (cell (x, y) covers
 * [x, x+1] x [y, y+1]); the pivot of the SVG `rotate(-theta, cx, cy)`.
 * @param {XY[]} cells
 * @returns {XY | null} null when there are no cells
 */
export function activeCenter(cells) {
  if (cells.length === 0) {
    return null;
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of cells) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return [(minX + maxX + 1) / 2, (minY + maxY + 1) / 2];
}

/**
 * Bounding box of all cell corners after the display rotation about the active
 * bounding-box center. minX/minY stay in that board-coordinate frame. No cells
 * gives a zero extent; callers then fall back to the authored frame.
 * @param {XY[]} cells
 * @param {number} theta counter-clockwise degrees, multiple of 45
 * @returns {{ w: number, h: number, minX: number, minY: number }}
 */
export function rotatedExtent(cells, theta) {
  const step = normalizeAngle(theta) / 45;
  const center = activeCenter(cells);
  if (center === null) {
    return { w: 0, h: 0, minX: 0, minY: 0 };
  }
  const [cx, cy] = center;
  const [c, s] = TRIG[step];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of cells) {
    for (const [px, py] of [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]]) {
      const dx = px - cx;
      const dy = py - cy;
      // SVG rotate(-theta) in a y-down frame.
      const rx = cx + dx * c + dy * s;
      const ry = cy - dx * s + dy * c;
      minX = Math.min(minX, rx);
      minY = Math.min(minY, ry);
      maxX = Math.max(maxX, rx);
      maxY = Math.max(maxY, ry);
    }
  }
  return { w: maxX - minX, h: maxY - minY, minX, minY };
}

/**
 * Cell size in CSS px that fits the extent plus a margin on each side, clamped.
 * @param {{ w: number, h: number }} ext
 * @param {number} availW
 * @param {number} availH
 * @param {{ min?: number, max?: number, marginCells?: number }} [o]
 * @returns {number}
 */
export function fitCellSize(ext, availW, availH, o = {}) {
  const min = o.min ?? 14;
  const max = o.max ?? 64;
  const margin = o.marginCells ?? 0.5;
  // Tiny epsilon keeps exact fits from flooring one pixel low through float noise.
  const raw = Math.min(availW / (ext.w + 2 * margin), availH / (ext.h + 2 * margin));
  const size = Number.isFinite(raw) ? Math.floor(raw + 1e-9) : min;
  return Math.min(max, Math.max(min, size));
}

/**
 * @param {number} t
 * @returns {number}
 */
function checkedT(t) {
  if (!Number.isInteger(t) || t < 0 || t > 7) {
    throw new RangeError(`transform index must be an integer 0..7, got ${t}`);
  }
  return t;
}

/**
 * Screen-space quarter turn of the displayed piece.
 * @param {number} t
 * @param {'cw' | 'ccw'} dir
 * @returns {number}
 */
export function screenRotate(t, dir) {
  checkedT(t);
  if (dir === 'cw') {
    return rotateCW(t);
  }
  if (dir === 'ccw') {
    return rotateCCW(t);
  }
  throw new RangeError(`direction must be 'cw' or 'ccw', got ${String(dir)}`);
}

/**
 * Screen-space mirror of the displayed piece under view angle theta.
 * @param {number} t
 * @param {number} theta
 * @param {'horizontal' | 'vertical'} axis horizontal swaps left and right
 * @returns {number}
 */
export function screenFlip(t, theta, axis) {
  checkedT(t);
  const k = (normalizeAngle(theta) / 45) % 4;
  const f = t >> 2;
  const r = t & 3;
  let next;
  if (axis === 'horizontal') {
    next = (((k - r) % 4) + 4) % 4;
  } else if (axis === 'vertical') {
    next = (((k + 2 - r) % 4) + 4) % 4;
  } else {
    throw new RangeError(`axis must be 'horizontal' or 'vertical', got ${String(axis)}`);
  }
  return 4 * (1 - f) + next;
}

/**
 * Grid movement for a screen arrow key: R^floor(theta/90) of the screen vector.
 * At odd multiples of 45 the tie resolves to the mapping for theta - 45.
 * @param {number} theta
 * @param {'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown'} key
 * @returns {XY}
 */
export function arrowToGrid(theta, key) {
  const arrow = CARDINAL[key];
  if (arrow === undefined) {
    throw new RangeError(`unsupported arrow key: ${String(key)}`);
  }
  let [x, y] = arrow;
  const quarters = Math.floor(normalizeAngle(theta) / 90);
  for (let i = 0; i < quarters; i += 1) {
    [x, y] = [-y, x];
  }
  return [plain(x), plain(y)];
}

/**
 * Nearest multiple of 90 degrees, ties toward theta - 45.
 * @param {number} theta
 * @returns {number}
 */
export function straightenAngle(theta) {
  return Math.floor(normalizeAngle(theta) / 90) * 90;
}
