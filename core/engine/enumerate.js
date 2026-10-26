// @ts-check
// Bounded exhaustive count of the distinct arrangements of a piece set: proves whether a set has
// another arrangement once a batch finds no new one. Backtracking instead of DLX because these sets
// have large distinct pieces, where one DLX trial costs about as much as the whole model. Canonical
// order, no RNG, no clock; limits count search steps, so every host gives the same answer.

import { canonicalKey, distinctOrientations } from './geometry.js';
import { layoutKey } from './keys.js';

/** @typedef {import('./types.js').Board} Board */
/** @typedef {import('./types.js').Piece} Piece */
/** @typedef {import('./types.js').Pose} Pose */

/**
 * @typedef {object} EnumerationResult
 * @property {'exhausted' | 'more' | 'limit'} status `exhausted`: the whole space was searched and every arrangement
 *   is in `known` (`total` is exact); `more`: an arrangement outside `known` exists; `limit`: nothing is proved.
 * @property {number} total Distinct arrangements seen (exact only when `exhausted`).
 * @property {number} placements Candidate placements tried (plus one per eight cells of region checks).
 * @property {number} nodes Search nodes (one per first empty cell).
 * @property {number} solutions Complete tilings visited (symmetric images included).
 * @property {'placements' | 'nodes' | null} limit Which limit stopped the search.
 * @property {{ key: string, layout: Pose[] }[]} [layouts] Only with `collect`: the unused arrangements found, by key.
 * @property {boolean} [complete] Only with `collect`: the whole space was searched, so `layouts` holds every
 *   unused arrangement and `total` is exact.
 */

/**
 * Enumerates the tilings of `board` by `pieces` against `known` (strict layout keys already used).
 * Row-major cell scan: the piece covering the first empty cell has it as its own first cell, so each
 * candidate is one (piece, orientation) pair. Identical shapes are used in index order to drop their
 * permutations. After each placement every adjacent empty region must fit the smallest unused piece.
 * Stops at the first arrangement outside `known`, unless `limits.collect` asks for up to that many:
 * they are then gathered (one layout per key) and returned sorted by key.
 * @param {Board} board
 * @param {Piece[]} pieces
 * @param {ReadonlySet<string>} known
 * @param {{ placementLimit: number, nodeLimit: number, collect?: number }} limits
 * @returns {EnumerationResult}
 */
export function enumerateLayouts(board, pieces, known, limits) {
  const { width, height } = board;
  const cellCount = width * height;
  const free = new Uint8Array(cellCount);
  let freeCount = 0;
  for (let i = 0; i < cellCount; i += 1) {
    free[i] = board.active[i] === 1 ? 1 : 0;
    freeCount += free[i];
  }
  const count = pieces.length;
  const sizes = pieces.map((p) => p.cells.length);
  const keys = new Set();
  const collect = limits.collect ?? 0;
  /** @type {Map<string, Pose[]>} */
  const found = new Map();
  let solutions = 0;
  let placements = 0;
  let nodes = 0;
  /** @type {'more' | 'placements' | 'nodes' | null} */
  let stop = null;
  const result = () => {
    const gathering = collect > 0;
    const status = stop === 'more' || (gathering && found.size > 0) ? 'more' : stop === null ? 'exhausted' : 'limit';
    /** @type {EnumerationResult} */
    const out = {
      status,
      total: keys.size + found.size,
      placements,
      nodes,
      solutions,
      limit: stop === 'placements' || stop === 'nodes' ? stop : null,
    };
    if (gathering) {
      out.layouts = [...found].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([key, layout]) => ({ key, layout }));
      out.complete = stop === null;
    }
    return out;
  };
  if (sizes.reduce((sum, s) => sum + s, 0) !== freeCount) {
    return result();
  }

  const options = pieces.map((piece) => distinctOrientations(piece.cells).map(({ t, cells: shape }) => ({
    t,
    anchorX: shape[0][0],
    anchorY: shape[0][1],
    dx: Int32Array.from(shape, ([x]) => x - shape[0][0]),
    dy: Int32Array.from(shape, ([, y]) => y - shape[0][1]),
    offsets: Int32Array.from(shape, ([x, y]) => (y - shape[0][1]) * width + x - shape[0][0]),
    minDx: Math.min(...shape.map(([x]) => x)) - shape[0][0],
    maxDx: Math.max(...shape.map(([x]) => x)) - shape[0][0],
    maxDy: Math.max(...shape.map(([, y]) => y)) - shape[0][1],
  })));
  /** @type {Map<string, number>} */
  const lastOfShape = new Map();
  const previous = pieces.map((piece, i) => {
    const key = canonicalKey(piece.cells);
    const before = lastOfShape.get(key) ?? -1;
    lastOfShape.set(key, i);
    return before;
  });
  const used = new Uint8Array(count);
  const chosenPiece = new Int32Array(count);
  const chosenOption = new Int32Array(count);
  const chosenAt = new Int32Array(count);
  const stack = new Int32Array(cellCount);
  const stamp = new Int32Array(cellCount);
  let stampNow = 0;

  /**
   * Whether every empty region touching the placed piece can still hold the smallest unused piece.
   * A flood of eight cells counts as one placement against the limit.
   * @param {number} anchor Board index of the piece's first cell.
   * @param {{ dx: Int32Array, dy: Int32Array }} shape
   * @param {number} smallest
   * @returns {boolean}
   */
  const regionsFit = (anchor, shape, smallest) => {
    stampNow += 1;
    const ax = anchor % width;
    const ay = (anchor - ax) / width;
    for (let k = 0; k < shape.dx.length; k += 1) {
      const x = ax + shape.dx[k];
      const y = ay + shape.dy[k];
      for (let side = 0; side < 4; side += 1) {
        const nx = side === 0 ? x - 1 : side === 1 ? x + 1 : x;
        const ny = side === 2 ? y - 1 : side === 3 ? y + 1 : y;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
          continue;
        }
        const start = ny * width + nx;
        if (free[start] === 0 || stamp[start] === stampNow) {
          continue;
        }
        let top = 0;
        let size = 0;
        stack[top] = start;
        top += 1;
        stamp[start] = stampNow;
        while (top > 0) {
          top -= 1;
          const cell = stack[top];
          size += 1;
          const cx = cell % width;
          if (cx > 0 && free[cell - 1] === 1 && stamp[cell - 1] !== stampNow) {
            stamp[cell - 1] = stampNow;
            stack[top] = cell - 1;
            top += 1;
          }
          if (cx < width - 1 && free[cell + 1] === 1 && stamp[cell + 1] !== stampNow) {
            stamp[cell + 1] = stampNow;
            stack[top] = cell + 1;
            top += 1;
          }
          if (cell >= width && free[cell - width] === 1 && stamp[cell - width] !== stampNow) {
            stamp[cell - width] = stampNow;
            stack[top] = cell - width;
            top += 1;
          }
          if (cell + width < cellCount && free[cell + width] === 1 && stamp[cell + width] !== stampNow) {
            stamp[cell + width] = stampNow;
            stack[top] = cell + width;
            top += 1;
          }
        }
        placements += size >> 3;
        if (size < smallest) {
          return false;
        }
      }
    }
    return true;
  };

  /** @param {number} placed */
  const record = (placed) => {
    solutions += 1;
    /** @type {Pose[]} */
    const layout = [];
    for (let d = 0; d < placed; d += 1) {
      const option = options[chosenPiece[d]][chosenOption[d]];
      const at = chosenAt[d];
      const x = at % width;
      layout.push({
        piece: pieces[chosenPiece[d]].id,
        x: x - option.anchorX,
        y: (at - x) / width - option.anchorY,
        turn: /** @type {import('./types.js').Turn} */ (option.t & 3),
        mirrored: option.t >= 4,
      });
    }
    const key = layoutKey(board, pieces, layout);
    if (known.has(key)) {
      keys.add(key);
    } else if (collect === 0) {
      stop = 'more';
    } else if (!found.has(key)) {
      found.set(key, layout);
      if (found.size >= collect) {
        stop = 'more';
      }
    }
  };

  /**
   * @param {number} from First cell that may still be empty.
   * @param {number} placed
   */
  const search = (from, placed) => {
    let at = from;
    while (at < cellCount && free[at] === 0) {
      at += 1;
    }
    if (at === cellCount) {
      if (placed === count) {
        record(placed);
      }
      return;
    }
    if (placed === count) {
      return;
    }
    nodes += 1;
    if (nodes > limits.nodeLimit) {
      stop = 'nodes';
      return;
    }
    const ax = at % width;
    const ay = (at - ax) / width;
    for (let i = 0; i < count; i += 1) {
      if (used[i] === 1 || (previous[i] >= 0 && used[previous[i]] === 0)) {
        continue;
      }
      for (let o = 0; o < options[i].length; o += 1) {
        placements += 1;
        if (placements > limits.placementLimit) {
          stop = 'placements';
          return;
        }
        const shape = options[i][o];
        const { offsets } = shape;
        if (ax + shape.minDx < 0 || ax + shape.maxDx >= width || ay + shape.maxDy >= height) {
          continue;
        }
        let fits = true;
        for (let k = 1; k < offsets.length; k += 1) {
          if (free[at + offsets[k]] === 0) {
            fits = false;
            break;
          }
        }
        if (!fits) {
          continue;
        }
        for (let k = 0; k < offsets.length; k += 1) {
          free[at + offsets[k]] = 0;
        }
        used[i] = 1;
        chosenPiece[placed] = i;
        chosenOption[placed] = o;
        chosenAt[placed] = at;
        let smallest = Infinity;
        for (let j = 0; j < count; j += 1) {
          if (used[j] === 0 && sizes[j] < smallest) {
            smallest = sizes[j];
          }
        }
        if (smallest === Infinity || regionsFit(at, shape, smallest)) {
          search(at + 1, placed + 1);
        }
        used[i] = 0;
        for (let k = 0; k < offsets.length; k += 1) {
          free[at + offsets[k]] = 1;
        }
        if (stop !== null) {
          return;
        }
      }
    }
  };

  search(0, 0);
  return result();
}
