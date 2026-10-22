// @ts-check
// Puzzle identities. Symmetry keys (`layoutKey`, `clueKey`, `layoutDistance`)
// recognise arrangements that are the same up to a board symmetry, while
// `progressFingerprint`, `puzzleId` and `packId` use exact coordinates because
// saved moves refer to exact cells. Pack-shaped data is read structurally; this
// module never imports the pack module.

import { boardToRows, normalizedActive, symmetries } from './board.js';
import { distinctOrientations, normalizeCells, poseCells, TRANSFORMS } from './geometry.js';
import { canonicalJson, sha256Hex } from './hash.js';

/** @typedef {import('./types.js').XY} XY */
/** @typedef {import('./types.js').Board} Board */
/** @typedef {import('./types.js').Piece} Piece */
/** @typedef {import('./types.js').Pose} Pose */
/** @typedef {import('./types.js').Pack} Pack */

const MAX_RANK = 36 * 36 - 1;

/** @param {string} a @param {string} b */
const compareIds = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Numerically smallest normalized orientation of a shape.
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

/**
 * @param {XY[]} a
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

const RANK_CACHE_SIZE = 8;
/** @type {Map<string, Map<string, number>>} */
const rankCache = new Map();

/**
 * Cached by piece content; the returned map is shared and read-only.
 * @param {Piece[]} pieces
 * @returns {Map<string, number>}
 */
function shapeRanks(pieces) {
  const signature = pieces.map((piece) => `${piece.id}:${piece.cells.map(([x, y]) => `${x},${y}`).join(';')}`).join('|');
  const hit = rankCache.get(signature);
  if (hit !== undefined) {
    rankCache.delete(signature);
    rankCache.set(signature, hit);
    return hit;
  }
  const ranks = computeShapeRanks(pieces);
  rankCache.set(signature, ranks);
  if (rankCache.size > RANK_CACHE_SIZE) {
    rankCache.delete(/** @type {string} */ (rankCache.keys().next().value));
  }
  return ranks;
}

/**
 * Shape rank of each piece: its index among the distinct shapes in
 * (size, numeric canonical shape) order, so identical shapes share a rank.
 * @param {Piece[]} pieces
 * @returns {Map<string, number>}
 */
function computeShapeRanks(pieces) {
  /** @type {Map<string, XY[]>} */
  const shapes = new Map();
  const shapeOf = pieces.map((piece) => {
    const shape = canonicalShape(piece.cells);
    const text = shape.map(([x, y]) => `${x},${y}`).join(';');
    shapes.set(text, shape);
    return text;
  });
  const sorted = [...shapes.entries()].sort((a, b) => a[1].length - b[1].length || compareShapes(a[1], b[1]));
  if (sorted.length > MAX_RANK + 1) {
    throw new RangeError(`more than ${MAX_RANK + 1} distinct shapes cannot be ranked in two base-36 digits`);
  }
  const rankOfShape = new Map(sorted.map(([text], i) => [text, i]));
  return new Map(pieces.map((piece, i) => [piece.id, /** @type {number} */ (rankOfShape.get(shapeOf[i]))]));
}

/**
 * @param {Piece[]} pieces
 * @returns {Map<string, Piece>}
 */
function pieceMap(pieces) {
  if (!Array.isArray(pieces)) {
    throw new RangeError('pieces must be an array');
  }
  const byId = new Map();
  for (const piece of pieces) {
    if (typeof piece?.id !== 'string' || !Array.isArray(piece.cells) || piece.cells.length === 0) {
      throw new RangeError('every piece needs an id and a nonempty list of cells');
    }
    if (byId.has(piece.id)) {
      throw new RangeError(`duplicate piece id ${piece.id}`);
    }
    byId.set(piece.id, piece);
  }
  return byId;
}

/**
 * Board in its normalized active frame, with every pose's cells expressed as
 * indices of that frame. The same whole-board translation applies to all poses.
 * @typedef {object} Placed
 * @property {Board} frame
 * @property {FrameInfo} info
 * @property {Map<string, number[]>} cells Normalized-frame cell indices per piece ID.
 * @property {number} covered Cells covered by all poses together.
 * @property {number} active Active cells of the frame.
 */

/**
 * A board's normalized frame with its symmetry maps, computed once per board
 * content: one batch compares many layouts on the same board.
 * @typedef {object} FrameInfo
 * @property {Board} frame
 * @property {number} dx
 * @property {number} dy
 * @property {number} active
 * @property {Int32Array[] | null} maps
 */

const FRAME_CACHE_SIZE = 8;
/** @type {Map<string, FrameInfo>} */
const frameCache = new Map();

/**
 * @param {Board} b
 * @returns {FrameInfo}
 */
function frameOf(b) {
  const signature = [];
  for (let i = 0; i < b.active.length; i += 1) {
    signature.push(b.active[i]);
  }
  const cacheKey = `${b.width}x${b.height}:${signature.join('')}`;
  const hit = frameCache.get(cacheKey);
  if (hit !== undefined) {
    frameCache.delete(cacheKey);
    frameCache.set(cacheKey, hit);
    return hit;
  }
  const { board: frame, dx, dy } = normalizedActive(b);
  let active = 0;
  for (let i = 0; i < frame.active.length; i += 1) {
    active += frame.active[i] === 1 ? 1 : 0;
  }
  /** @type {FrameInfo} */
  const info = { frame, dx, dy, active, maps: null };
  frameCache.set(cacheKey, info);
  if (frameCache.size > FRAME_CACHE_SIZE) {
    frameCache.delete(/** @type {string} */ (frameCache.keys().next().value));
  }
  return info;
}

/**
 * @param {Board} b
 * @param {Map<string, Piece>} byId
 * @param {Pose[]} poses
 * @returns {Placed}
 */
function place(b, byId, poses) {
  if (!Array.isArray(poses)) {
    throw new RangeError('poses must be an array');
  }
  const info = frameOf(b);
  const { frame, dx, dy, active } = info;
  const seen = new Uint8Array(frame.active.length);
  /** @type {Map<string, number[]>} */
  const cells = new Map();
  let covered = 0;
  for (const pose of poses) {
    const piece = byId.get(pose?.piece);
    if (piece === undefined) {
      throw new RangeError(`pose names unknown piece ${String(pose?.piece)}`);
    }
    if (cells.has(piece.id)) {
      throw new RangeError(`piece ${piece.id} is placed more than once`);
    }
    /** @type {number[]} */
    const indices = [];
    for (const [x, y] of poseCells(piece, pose)) {
      const fx = x - dx;
      const fy = y - dy;
      const at = fy * frame.width + fx;
      if (fx < 0 || fy < 0 || fx >= frame.width || fy >= frame.height || frame.active[at] !== 1) {
        throw new RangeError(`piece ${piece.id} covers blocked or out-of-range cell ${x},${y}`);
      }
      if (seen[at] === 1) {
        throw new RangeError(`piece ${piece.id} overlaps another piece at ${x},${y}`);
      }
      seen[at] = 1;
      indices.push(at);
      covered += 1;
    }
    cells.set(piece.id, indices);
  }
  return { frame, info, cells, covered, active };
}

/**
 * For each board symmetry, the map from a frame cell index to its image index.
 * The frame is normalized, so one translation per symmetry serves every cell.
 * @param {Board} frame
 * @returns {Int32Array[]}
 */
function symmetryMaps(frame) {
  const { width, height } = frame;
  return symmetries(frame).map((t) => {
    const fn = TRANSFORMS[t];
    let minX = Infinity;
    let minY = Infinity;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (frame.active[y * width + x] === 1) {
          const [tx, ty] = fn([x, y]);
          minX = Math.min(minX, tx);
          minY = Math.min(minY, ty);
        }
      }
    }
    const map = new Int32Array(width * height).fill(-1);
    // A symmetry maps the active cells onto themselves, so the image keeps the frame's width.
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (frame.active[y * width + x] === 1) {
          const [tx, ty] = fn([x, y]);
          map[y * width + x] = (ty - minY) * width + (tx - minX);
        }
      }
    }
    return map;
  });
}

/**
 * Symmetry maps of a cached frame, built on first use.
 * @param {FrameInfo} info
 * @returns {Int32Array[]}
 */
function mapsOf(info) {
  if (info.maps === null) {
    cacheStats.mapBuilds += 1;
    info.maps = symmetryMaps(info.frame);
  }
  return info.maps;
}

/**
 * Work counters of the per-board cache, for tests: `mapBuilds` counts symmetry
 * map constructions, which happen once per distinct board, not per comparison.
 */
export const cacheStats = { mapBuilds: 0 };

/** @param {number} rank */
const rankText = (rank) => rank.toString(36).padStart(2, '0');

/**
 * Smallest symmetry-transformed encoding. Cells without a placed piece are `..`.
 * @param {Placed} placed
 * @param {Map<string, number>} ranks
 * @returns {string}
 */
function minimumEncoding(placed, ranks) {
  const size = placed.frame.active.length;
  /** @type {string | null} */
  let best = null;
  for (const map of mapsOf(placed.info)) {
    const grid = new Array(size).fill('..');
    for (const [id, indices] of placed.cells) {
      const text = rankText(/** @type {number} */ (ranks.get(id)));
      for (const at of indices) {
        grid[map[at]] = text;
      }
    }
    // Row-major order over active cells only; blocked cells stay out of the key.
    let text = '';
    for (let i = 0; i < size; i += 1) {
      if (placed.frame.active[i] === 1) {
        text += grid[i];
      }
    }
    if (best === null || text < best) {
      best = text;
    }
  }
  return best ?? '';
}

/**
 * @param {Placed} placed
 * @param {Map<string, Piece>} byId
 */
function requireComplete(placed, byId) {
  if (placed.cells.size !== byId.size || placed.covered !== placed.active) {
    throw new RangeError('layout must place every piece and cover every active cell');
  }
}

/**
 * Symmetry-invariant identity of a complete layout: shape ranks of the active
 * cells in row-major order, minimized over the board's symmetries. Throws
 * RangeError for an incomplete or invalid layout.
 * @param {Board} b
 * @param {Piece[]} pieces
 * @param {Pose[]} layout
 * @returns {string}
 */
export function layoutKey(b, pieces, layout) {
  const byId = pieceMap(pieces);
  const placed = place(b, byId, layout);
  requireComplete(placed, byId);
  return minimumEncoding(placed, shapeRanks(pieces));
}

/**
 * Like `layoutKey` for the clue subset, with every other active cell written
 * as `..`. Clue positions use the same whole-board frame as the layout.
 * @param {Board} b
 * @param {Piece[]} pieces
 * @param {Pose[]} clues
 * @returns {string}
 */
export function clueKey(b, pieces, clues) {
  const byId = pieceMap(pieces);
  return minimumEncoding(place(b, byId, clues), shapeRanks(pieces));
}

/**
 * @param {Placed} first
 * @param {Placed} second
 * @returns {number}
 */
function placedDistance(first, second) {
  const sorted = (/** @type {number[]} */ indices) => Int32Array.from(indices).sort();
  const target = new Map([...second.cells].map(([id, indices]) => [id, sorted(indices)]));
  let best = Infinity;
  for (const map of mapsOf(first.info)) {
    let differing = 0;
    for (const [id, indices] of first.cells) {
      const moved = sorted(indices.map((at) => map[at]));
      const want = /** @type {Int32Array} */ (target.get(id));
      let same = moved.length === want.length;
      for (let i = 0; same && i < moved.length; i += 1) {
        same = moved[i] === want[i];
      }
      differing += same ? 0 : 1;
      if (differing >= best) {
        break;
      }
    }
    best = Math.min(best, differing);
  }
  return best;
}

/**
 * Minimum over board symmetries of the number of piece IDs whose occupied cell
 * sets differ between the two complete layouts.
 * @param {Board} b
 * @param {Piece[]} pieces
 * @param {Pose[]} a
 * @param {Pose[]} c
 * @returns {number}
 */
export function layoutDistance(b, pieces, a, c) {
  return minLayoutDistance(b, pieces, a, [c]);
}

/**
 * Smallest `layoutDistance` from `a` to any of `others` (`Infinity` for none),
 * placing `a` once.
 * @param {Board} b
 * @param {Piece[]} pieces
 * @param {Pose[]} a
 * @param {Pose[][]} others
 * @returns {number}
 */
export function minLayoutDistance(b, pieces, a, others) {
  const byId = pieceMap(pieces);
  const first = place(b, byId, a);
  requireComplete(first, byId);
  let best = Infinity;
  for (const other of others) {
    const second = place(b, byId, other);
    requireComplete(second, byId);
    best = Math.min(best, placedDistance(first, second));
  }
  return best;
}

/**
 * @param {Map<string, Piece>} byId
 * @returns {[string, XY[]][]}
 */
function pieceProjection(byId) {
  return [...byId.values()]
    .sort((a, b) => compareIds(a.id, b.id))
    .map((piece) => [piece.id, normalizeCells(piece.cells)]);
}

/**
 * @param {Map<string, Piece>} byId
 * @param {Pose[]} clues
 * @returns {[string, XY[]][]}
 */
function clueProjection(byId, clues) {
  if (!Array.isArray(clues)) {
    throw new RangeError('clues must be an array');
  }
  const seen = new Set();
  return clues
    .map((pose) => {
      const piece = byId.get(pose?.piece);
      if (piece === undefined) {
        throw new RangeError(`clue names unknown piece ${String(pose?.piece)}`);
      }
      if (seen.has(piece.id)) {
        throw new RangeError(`piece ${piece.id} is clued more than once`);
      }
      seen.add(piece.id);
      /** @type {[string, XY[]]} */
      const entry = [piece.id, poseCells(piece, pose).sort((p, q) => p[1] - q[1] || p[0] - q[0])];
      return entry;
    })
    .sort((a, b) => compareIds(a[0], b[0]));
}

/**
 * Exact-coordinate identity of a puzzle for saved progress. Colors, labels,
 * presentation, ratings, timestamps and public IDs are excluded; source cell
 * orientation and blocked margins are included.
 * @param {Board} b
 * @param {Piece[]} pieces
 * @param {Pose[]} clues
 * @returns {string} 64 lowercase hex characters
 */
export function progressFingerprint(b, pieces, clues) {
  const byId = pieceMap(pieces);
  return sha256Hex(canonicalJson({
    rows: boardToRows(b),
    pieces: pieceProjection(byId),
    clues: clueProjection(byId, clues),
  }));
}

/**
 * Public puzzle ID: `p` plus the first 12 hex characters of the fingerprint.
 * @param {Board} b
 * @param {Piece[]} pieces
 * @param {Pose[]} clues
 * @returns {string}
 */
export function puzzleId(b, pieces, clues) {
  return `p${progressFingerprint(b, pieces, clues).slice(0, 12)}`;
}

/**
 * Library identity of a pack's core content: rules, exact board rows, pieces
 * and each puzzle's exact clues in pack order. Titles, colors, labels,
 * rotation, ratings, provenance and public IDs do not matter. Returns the
 * first 16 hex characters of the digest.
 * @param {Pack} pack
 * @returns {string}
 */
export function packId(pack) {
  const byId = pieceMap(pack.pieces);
  return sha256Hex(canonicalJson({
    rules: pack.rules,
    rows: pack.board.rows,
    pieces: pieceProjection(byId),
    puzzles: pack.puzzles.map((puzzle) => clueProjection(byId, puzzle.clues)),
  })).slice(0, 16);
}
