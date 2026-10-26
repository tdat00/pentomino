// @ts-check
// Frozen v1 data and raw payload codec of the single-puzzle code: bit I/O, Exp-Golomb, colex
// ranks, CRC-20, the lazily built polyomino catalogue and the solution-path tail. Pure. The frozen
// tables are copies by design: later changes to the live palette, levels or rating must not change
// how an old code decodes.

import { boardFromRows, boardToRows } from './board.js';
import { distinctOrientations, orientedCells, poseCells } from './geometry.js';
import { puzzleId } from './keys.js';
import { validatePack } from './pack.js';
import { countPlacements, preparePlacements } from './placements.js';
import { ALPHABET, PuzzleCodeError } from './puzzlecode-input.js';

/** @typedef {import('./types.js').XY} XY */
/** @typedef {import('./types.js').Board} Board */
/** @typedef {import('./types.js').Piece} Piece */
/** @typedef {import('./types.js').Pose} Pose */
/** @typedef {import('./types.js').Pack} Pack */
/** @typedef {import('./types.js').RatingClaim} RatingClaim */
/** @typedef {import('./types.js').CertificateClaim} CertificateClaim */

/**
 * What the payload carries about one puzzle, after pack validation.
 * @typedef {object} PuzzleParts
 * @property {Board} board
 * @property {number} rotation Display angle in degrees: 0, 45, ... 315.
 * @property {Piece[]} pieces
 * @property {Pose[]} clues
 * @property {Pose[] | null} solution
 * @property {RatingClaim | null} rating
 * @property {CertificateClaim | null} certificate
 * @property {string | null} title Null when absent; an empty title is absent.
 */

/**
 * Replaceable computations, so a test can force a failure.
 * @typedef {object} CodecDeps
 * @property {(board: Board, pieces: Piece[], clues: Pose[]) => { R: number, H: number }} [measure]
 *   Count-only placement measurement; defaults to `measureFreePlacements`.
 */

export { ALPHABET };

/** Bounds of the decoder (all checked before any loop or allocation). */
export const CODE_BOUNDS = Object.freeze({
  side: 64,
  active: 1024,
  pieces: 128,
  pieceCells: 128,
  catalogueMaxSize: 10,
  idChars: 8,
  labelChars: 4,
  titleChars: 80,
  modelChars: 64,
  ratingJsonBytes: 8192,
  inflatedBytes: 64 * 1024,
  maxSafe: Number.MAX_SAFE_INTEGER,
  syndromeSymbols: 5732,
  kind2Max: 2147483647,
});

export const CRC20 = Object.freeze({
  width: 20, poly: 0x6c1bd, init: 0xfffff, xorOut: 0xfffff, mask: 0xfffff,
});

/** Frozen v1 colours of piece indices 0 ... 127, lower-case RGB without `#`. */
export const FROZEN_COLORS = Object.freeze([
  'e6194b', '3cb44b', 'ffe119', '4363d8', 'f58231', '911eb4', '42d4f4', 'f032e6',
  'bfef45', 'fabed4', '469990', 'dcbeff', '9a6324', 'fffac8', '800000', 'aaffc3',
  '808000', 'ffd8b1', '000075', 'a9a9a9', '2841bd', 'e07b6c', '28bd67', 'be6ce0',
  'bdbd28', '6cbee0', 'bd2866', '7ae06c', '4228bd', 'e0a16c', '28bd99', 'e06cda',
  '8bbd28', '6c97e0', 'bd2834', '6ce084', '7328bd', 'e0c86c', '28b0bd', 'e06cb4',
  '59bd28', '6c70e0', 'bd4e28', '6ce0ab', 'a528bd', 'd1e06c', '287ebd', 'e06c8d',
  '28bd29', '8e6ce0', 'bd8028', '6ce0d2', 'bd28a3', 'aae06c', '284cbd', 'e0716c',
  '28bd5b', 'b56ce0', 'bdb228', '6cc7e0', 'bd2872', '83e06c', '3628bd', 'e0986c',
  '28bd8d', 'dc6ce0', '97bd28', '6ca0e0', 'bd2840', '6ce07b', '6828bd', 'e0bf6c',
  '28bcbd', 'e06cbd', '65bd28', '6c79e0', 'bd4328', '6ce0a2', '9a28bd', 'dae06c',
  '288abd', 'e06c96', '33bd28', '856ce0', 'bd7428', '6ce0c9', 'bd28af', 'b3e06c',
  '2858bd', 'e06c6f', '28bd4f', 'ac6ce0', 'bda628', '6cd0e0', 'bd287d', '8ce06c',
  '2a28bd', 'e08f6c', '28bd81', 'd36ce0', 'a2bd28', '6ca9e0', 'bd284b', '6ce072',
  '5c28bd', 'e0b66c', '28bdb3', 'e06cc6', '71bd28', '6c82e0', 'bd3728', '6ce099',
  '8e28bd', 'e0dd6c', '2896bd', 'e06c9f', '3fbd28', '7c6ce0', 'bd6928', '6ce0c0',
  'bd28bb', 'bce06c', '2864bd', 'e06c78', '28bd43', 'a36ce0', 'bd9b28', '6cd9e0',
]);

/**
 * Frozen default label: spreadsheet letters A ... Z, AA ... DX.
 * @param {number} index 0 ... 127
 * @returns {string}
 */
export function labelFor(index) {
  let n = index + 1;
  let label = '';
  while (n > 0) {
    n -= 1;
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26);
  }
  return label;
}

/**
 * Frozen default colour, lower-case `#rrggbb`.
 * @param {number} index 0 ... 127
 * @returns {string}
 */
export function colorFor(index) {
  return `#${FROZEN_COLORS[index]}`;
}

/** Frozen rating-model constants (difficulty-v2). */
export const RATING = Object.freeze({
  model: 'difficulty-v2',
  branchCap: 5000,
  rowCap: 50000,
  /** Lower score edge of level index 0 ... 10. */
  bandEdges: Object.freeze([0, 8, 12, 17, 25, 37, 53, 77, 112, 162, 235]),
  /** Entry i is the smallest B whose score bonus is at least i + 1. */
  thresholds: Object.freeze([
    1, 1, 2, 2, 3, 4, 6, 8, 11, 15, 20, 27, 36, 48, 64, 86, 115, 153, 205, 273,
    365, 486, 649, 865, 1154, 1539, 2053, 2738, 3651, 4869,
  ]),
  stops: Object.freeze(['solution', 'branch-cap', 'row-cap']),
});

const LEVEL_IDS = ['very-easy', 'easy', 'normal', 'hard', 'expert', 'master', 'nightmare'];
const LEVEL_LABELS = ['Very easy', 'Easy', 'Normal', 'Hard', 'Expert', 'Master', 'Nightmare'];
const HELL_ID = /^hell-([1-9][0-9]{0,2})$/;

/**
 * Frozen integer score: 2 U plus the number of thresholds not above B. Equals
 * round(2 U + 8 log10(1 + B)) for U 1 ... 128 and B 0 ... 5,000.
 * @param {number} U
 * @param {number} B
 * @returns {number}
 */
export function frozenScore(U, B) {
  if (U === 0) {
    return 0;
  }
  let bonus = 0;
  while (bonus < RATING.thresholds.length && RATING.thresholds[bonus] <= B) {
    bonus += 1;
  }
  return 2 * U + bonus;
}

/**
 * Frozen level id of a compact-domain score (at most 286).
 * @param {number} score
 * @returns {string}
 */
export function frozenLevelId(score) {
  let index = 0;
  while (index + 1 < RATING.bandEdges.length && RATING.bandEdges[index + 1] <= score) {
    index += 1;
  }
  return index < LEVEL_IDS.length ? LEVEL_IDS[index] : `hell-${index - 6}`;
}

/**
 * English label of a known level id (named levels and `hell-1` ... `hell-999`),
 * or null. Only title kinds 1 and 2 look a label up.
 * @param {unknown} id
 * @returns {string | null}
 */
export function levelLabelOf(id) {
  if (typeof id !== 'string') {
    return null;
  }
  const named = LEVEL_IDS.indexOf(id);
  if (named >= 0) {
    return LEVEL_LABELS[named];
  }
  const hell = HELL_ID.exec(id);
  return hell === null ? null : `Hell ${hell[1]}`;
}

// ---------------------------------------------------------------- failures

/** @returns {PuzzleCodeError} */
const truncated = () => new PuzzleCodeError('invalid', 'The code ends too early.');

/**
 * @param {string} message
 * @returns {PuzzleCodeError}
 */
const invalid = (message) => new PuzzleCodeError('invalid', message);

// ------------------------------------------------------------------ bit I/O

/** Writes bits, most significant first. */
export class BitWriter {
  constructor() {
    /** @type {number[]} */
    this.bits = [];
  }

  /** @returns {number} */
  get length() {
    return this.bits.length;
  }

  /**
   * @param {number} value Integer in 0 ... 2^n - 1.
   * @param {number} n Bit count, 0 ... 53.
   */
  write(value, n) {
    if (!Number.isSafeInteger(value) || value < 0 || n < 0 || n > 53 || value >= 2 ** n) {
      throw new RangeError(`${value} does not fit in ${n} bits`);
    }
    for (let i = n - 1; i >= 0; i -= 1) {
      this.bits.push(Math.floor(value / 2 ** i) % 2);
    }
  }

  /**
   * @param {bigint} value Non-negative.
   * @param {number} n Bit count.
   */
  writeBig(value, n) {
    const text = value === 0n ? '' : value.toString(2);
    if (value < 0n || text.length > n) {
      throw new RangeError(`${value} does not fit in ${n} bits`);
    }
    for (let i = text.length; i < n; i += 1) {
      this.bits.push(0);
    }
    for (let i = 0; i < text.length; i += 1) {
      this.bits.push(text.charCodeAt(i) - 48);
    }
  }

  /** @param {BitWriter} other */
  append(other) {
    for (const bit of other.bits) {
      this.bits.push(bit);
    }
  }

  /** @param {number} multiple Zero-fills up to a multiple of this many bits. */
  padTo(multiple) {
    while (this.bits.length % multiple !== 0) {
      this.bits.push(0);
    }
  }

  /** @returns {Uint8Array} Bytes, the last one zero-filled. */
  toBytes() {
    const out = new Uint8Array(Math.ceil(this.bits.length / 8));
    for (let i = 0; i < this.bits.length; i += 1) {
      out[i >> 3] |= this.bits[i] << (7 - (i & 7));
    }
    return out;
  }
}

/** Reads bits, most significant first; running past the end is `invalid`. */
export class BitReader {
  /**
   * @param {ArrayLike<number>} bits One 0/1 value per element.
   * @param {number} [start]
   * @param {number} [end]
   */
  constructor(bits, start = 0, end = bits.length) {
    this.bits = bits;
    this.pos = start;
    this.end = end;
  }

  /** @returns {number} */
  get remaining() {
    return this.end - this.pos;
  }

  /** @returns {number} */
  readBit() {
    if (this.pos >= this.end) {
      throw truncated();
    }
    const bit = this.bits[this.pos];
    this.pos += 1;
    return bit;
  }

  /**
   * @param {number} n 0 ... 53
   * @returns {number}
   */
  read(n) {
    if (n > this.remaining) {
      throw truncated();
    }
    let value = 0;
    for (let i = 0; i < n; i += 1) {
      value = value * 2 + this.bits[this.pos + i];
    }
    this.pos += n;
    return value;
  }

  /**
   * @param {number} n
   * @returns {bigint}
   */
  readBig(n) {
    if (n > this.remaining) {
      throw truncated();
    }
    if (n === 0) {
      return 0n;
    }
    let text = '';
    for (let i = 0; i < n; i += 1) {
      text += this.bits[this.pos + i];
    }
    this.pos += n;
    return BigInt(`0b${text}`);
  }

  /** @returns {boolean} True when every unread bit is zero. */
  restIsZero() {
    for (let i = this.pos; i < this.end; i += 1) {
      if (this.bits[i] !== 0) {
        return false;
      }
    }
    return true;
  }
}

const MAX_SAFE_BIG = BigInt(Number.MAX_SAFE_INTEGER);

/**
 * @param {bigint} value Non-negative.
 * @returns {number}
 */
export function bitLength(value) {
  return value === 0n ? 0 : value.toString(2).length;
}

/**
 * Exp-Golomb of order k: `v + 2^k` in binary, preceded by (length - k - 1)
 * zero bits. Exact for values up to 2^53 - 1.
 * @param {BitWriter} w
 * @param {number} k
 * @param {number} v
 */
export function writeEG(w, k, v) {
  if (!Number.isSafeInteger(v) || v < 0) {
    throw new RangeError(`Exp-Golomb value must be a safe non-negative integer, got ${v}`);
  }
  const x = BigInt(v) + (1n << BigInt(k));
  const length = bitLength(x);
  w.write(0, 0);
  for (let i = 0; i < length - k - 1; i += 1) {
    w.bits.push(0);
  }
  w.writeBig(x, length);
}

/**
 * @param {BitReader} r
 * @param {number} k
 * @returns {number}
 * @throws {PuzzleCodeError} `invalid` for a prefix of more than 53 - k zero bits or a value above 2^53 - 1.
 */
export function readEG(r, k) {
  let zeros = 0;
  while (r.readBit() === 0) {
    zeros += 1;
    if (zeros > 53 - k) {
      throw invalid('A number in the code is out of range.');
    }
  }
  const rest = r.readBig(zeros + k);
  const value = ((1n << BigInt(zeros + k)) | rest) - (1n << BigInt(k));
  if (value > MAX_SAFE_BIG) {
    throw invalid('A number in the code is out of range.');
  }
  return Number(value);
}

/**
 * Truncated binary of 0 <= x < n; no bits when n is 1.
 * @param {BitWriter} w
 * @param {number} x
 * @param {number} n
 */
export function writeTB(w, x, n) {
  if (!Number.isInteger(n) || n < 1 || !Number.isInteger(x) || x < 0 || x >= n) {
    throw new RangeError(`truncated binary value ${x} is outside 0 ... ${n - 1}`);
  }
  const k = 31 - Math.clz32(n);
  const t = 2 ** (k + 1) - n;
  if (x < t) {
    w.write(x, k);
  } else {
    w.write(x + t, k + 1);
  }
}

/**
 * @param {BitReader} r
 * @param {number} n Alphabet size; 0 is `invalid`.
 * @returns {number}
 */
export function readTB(r, n) {
  if (!Number.isInteger(n) || n < 1) {
    throw invalid('A choice in the code has no valid option.');
  }
  const k = 31 - Math.clz32(n);
  const t = 2 ** (k + 1) - n;
  const v = r.read(k);
  return v < t ? v : v * 2 + r.readBit() - t;
}

/**
 * Binomial coefficient as an exact integer.
 * @param {number} n
 * @param {number} k
 * @returns {bigint}
 */
export function binomial(n, k) {
  if (k < 0 || k > n) {
    return 0n;
  }
  const m = Math.min(k, n - k);
  let result = 1n;
  for (let i = 1; i <= m; i += 1) {
    result = (result * BigInt(n - m + i)) / BigInt(i);
  }
  return result;
}

/**
 * Colex rank of a sorted k-subset.
 * @param {number[]} subset Strictly ascending.
 * @returns {bigint}
 */
export function colexRank(subset) {
  let rank = 0n;
  for (let i = 0; i < subset.length; i += 1) {
    rank += binomial(subset[i], i + 1);
  }
  return rank;
}

/**
 * @param {bigint} rank Less than C(N, k).
 * @param {number} N
 * @param {number} k
 * @returns {number[]} Strictly ascending.
 */
export function colexUnrank(rank, N, k) {
  /** @type {number[]} */
  const out = new Array(k);
  let remainder = rank;
  let ceiling = N - 1;
  for (let i = k; i >= 1; i -= 1) {
    let lo = i - 1;
    let hi = ceiling;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (binomial(mid, i) <= remainder) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    out[i - 1] = lo;
    remainder -= binomial(lo, i);
    ceiling = lo - 1;
  }
  return out;
}

/**
 * Writes a k-subset of {0 ... N - 1} as its colex rank in
 * bitLength(C(N, k) - 1) bits.
 * @param {BitWriter} w
 * @param {number[]} subset
 * @param {number} N
 */
export function writeRank(w, subset, N) {
  const total = binomial(N, subset.length);
  if (total === 0n) {
    throw new RangeError('subset larger than its alphabet');
  }
  w.writeBig(colexRank(subset), bitLength(total - 1n));
}

/**
 * @param {BitReader} r
 * @param {number} N
 * @param {number} k
 * @returns {number[]}
 */
export function readRank(r, N, k) {
  const total = binomial(N, k);
  if (total === 0n) {
    throw invalid('A subset in the code is larger than its alphabet.');
  }
  const value = r.readBig(bitLength(total - 1n));
  if (value >= total) {
    throw invalid('A subset rank in the code is out of range.');
  }
  return colexUnrank(value, N, k);
}

// ---------------------------------------------------------- CRC and symbols

/**
 * Register of CRC-20 after the given bits.
 * @param {ArrayLike<number>} bits
 * @param {number} start
 * @param {number} end
 * @param {number} [init]
 * @returns {number}
 */
export function crc20Register(bits, start, end, init = CRC20.init) {
  let r = init;
  for (let i = start; i < end; i += 1) {
    const feedback = ((r >>> 19) & 1) ^ bits[i];
    r = (r << 1) & CRC20.mask;
    if (feedback === 1) {
      r ^= CRC20.poly;
    }
  }
  return r;
}

/**
 * CRC-20 of the bits (init 0xFFFFF, MSB first, XOR-out 0xFFFFF).
 * @param {ArrayLike<number>} bits
 * @param {number} [start]
 * @param {number} [end]
 * @returns {number}
 */
export function crc20(bits, start = 0, end = bits.length) {
  return crc20Register(bits, start, end) ^ CRC20.xorOut;
}

/** Register after a complete valid component: its own check symbols included. */
export const RESIDUE_REGISTER = 0x6cdce ^ CRC20.xorOut;

/**
 * @param {string} symbols
 * @returns {Uint8Array} One 0/1 value per bit, five per symbol.
 */
export function symbolsToBits(symbols) {
  const bits = new Uint8Array(symbols.length * 5);
  for (let i = 0; i < symbols.length; i += 1) {
    const v = ALPHABET.indexOf(symbols[i]);
    for (let j = 0; j < 5; j += 1) {
      bits[i * 5 + j] = (v >> (4 - j)) & 1;
    }
  }
  return bits;
}

/**
 * @param {ArrayLike<number>} bits Length a multiple of five.
 * @param {number} [start]
 * @param {number} [end]
 * @returns {string}
 */
export function bitsToSymbols(bits, start = 0, end = bits.length) {
  let out = '';
  for (let i = start; i < end; i += 5) {
    out += ALPHABET[bits[i] * 16 + bits[i + 1] * 8 + bits[i + 2] * 4 + bits[i + 3] * 2 + bits[i + 4]];
  }
  return out;
}

/**
 * The four check symbols of a 20-bit CRC value, most significant first.
 * @param {number} value
 * @returns {string}
 */
export function checkSymbols(value) {
  return ALPHABET[(value >>> 15) & 31] + ALPHABET[(value >>> 10) & 31]
    + ALPHABET[(value >>> 5) & 31] + ALPHABET[value & 31];
}

// ---------------------------------------------------------------- geometry

/**
 * Numeric comparison of normalized cell lists: y, then x, then length.
 * @param {XY[]} a
 * @param {XY[]} b
 * @returns {number}
 */
export function compareCells(a, b) {
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
 * The least normalized transform of a cell list.
 * @param {XY[]} cells
 * @returns {XY[]}
 */
export function canonicalCells(cells) {
  /** @type {XY[] | null} */
  let best = null;
  for (let t = 0; t < 8; t += 1) {
    const variant = orientedCells(cells, t);
    if (best === null || compareCells(variant, best) < 0) {
      best = variant;
    }
  }
  return /** @type {XY[]} */ (best);
}

/** @param {XY[]} cells @returns {string} */
const shapeText = (cells) => cells.map(([x, y]) => `${x},${y}`).join(' ');

/**
 * @typedef {object} Orientation
 * @property {number} t Smallest transform index giving these cells.
 * @property {XY[]} cells Normalized and sorted.
 * @property {number} w
 * @property {number} h
 */

/**
 * Distinct orientations of a shape in the frozen order, with their extents.
 * @param {XY[]} cells
 * @returns {Orientation[]}
 */
function orientationsOf(cells) {
  return distinctOrientations(cells).map(({ t, cells: shape }) => {
    let w = 0;
    let h = 0;
    for (const [x, y] of shape) {
      w = Math.max(w, x + 1);
      h = Math.max(h, y + 1);
    }
    return { t, cells: shape, w, h };
  });
}

/**
 * Smallest transform index of `shape` whose oriented cells equal `target`.
 * @param {XY[]} shape
 * @param {XY[]} target Normalized and sorted.
 * @returns {number} -1 when no transform matches.
 */
function transformTo(shape, target) {
  for (let t = 0; t < 8; t += 1) {
    if (compareCells(orientedCells(shape, t), target) === 0) {
      return t;
    }
  }
  return -1;
}

// --------------------------------------------------------------- catalogue

/**
 * Lazily built free-polyomino catalogue, one size at a time.
 * @type {({ shapes: XY[][], index: Map<string, number> } | undefined)[]}
 */
const catalogue = [];

/** Counts catalogue work, so a test can prove that importing builds nothing. */
export const catalogueStats = { sizesBuilt: 0 };

const NEIGHBORS = /** @type {const} */ ([[1, 0], [0, 1], [-1, 0], [0, -1]]);

// The eight transforms of the fixed geometry convention as (a, b, c, d) with
// x' = a x + b y and y' = c x + d y; index t = turn + 4 mirrored.
const T_A = [1, 0, -1, 0, -1, 0, 1, 0];
const T_B = [0, -1, 0, 1, 0, -1, 0, 1];
const T_C = [0, 1, 0, -1, 0, -1, 0, 1];
const T_D = [1, 0, -1, 0, 1, 0, -1, 0];

/**
 * Canonical form of `shape` plus one more cell, as packed keys `y * 32 + x`
 * sorted ascending (the same order as comparing cells by y, then x). Only used
 * to grow the catalogue quickly; shapes are at most ten cells wide.
 * @param {XY[]} shape
 * @param {number} ex
 * @param {number} ey
 * @returns {Int32Array}
 */
function canonicalPackedPlus(shape, ex, ey) {
  const n = shape.length + 1;
  const xs = new Int32Array(n);
  const ys = new Int32Array(n);
  for (let i = 0; i < n - 1; i += 1) {
    xs[i] = shape[i][0];
    ys[i] = shape[i][1];
  }
  xs[n - 1] = ex;
  ys[n - 1] = ey;
  /** @type {Int32Array | null} */
  let best = null;
  const tx = new Int32Array(n);
  const ty = new Int32Array(n);
  for (let t = 0; t < 8; t += 1) {
    let minX = Infinity;
    let minY = Infinity;
    for (let i = 0; i < n; i += 1) {
      tx[i] = T_A[t] * xs[i] + T_B[t] * ys[i];
      ty[i] = T_C[t] * xs[i] + T_D[t] * ys[i];
      minX = Math.min(minX, tx[i]);
      minY = Math.min(minY, ty[i]);
    }
    const keys = new Int32Array(n);
    for (let i = 0; i < n; i += 1) {
      keys[i] = (ty[i] - minY) * 32 + (tx[i] - minX);
    }
    keys.sort();
    if (best !== null) {
      let order = 0;
      for (let i = 0; i < n && order === 0; i += 1) {
        order = keys[i] - best[i];
      }
      if (order >= 0) {
        continue;
      }
    }
    best = keys;
  }
  return /** @type {Int32Array} */ (best);
}

/**
 * @param {number} n 1 ... 10
 * @returns {{ shapes: XY[][], index: Map<string, number> }}
 */
function sizeEntry(n) {
  if (!Number.isInteger(n) || n < 1 || n > CODE_BOUNDS.catalogueMaxSize) {
    throw new RangeError(`catalogue size must be 1 ... ${CODE_BOUNDS.catalogueMaxSize}, got ${n}`);
  }
  const known = catalogue[n];
  if (known !== undefined) {
    return known;
  }
  /** @type {XY[][]} */
  let shapes;
  if (n === 1) {
    shapes = [[[0, 0]]];
  } else {
    /** @type {Map<string, XY[]>} */
    const found = new Map();
    for (const shape of sizeEntry(n - 1).shapes) {
      const inside = new Set(shape.map(([x, y]) => `${x},${y}`));
      for (const [x, y] of shape) {
        for (const [dx, dy] of NEIGHBORS) {
          const key = `${x + dx},${y + dy}`;
          if (inside.has(key)) {
            continue;
          }
          inside.add(key);
          const packed = canonicalPackedPlus(shape, x + dx, y + dy);
          const id = packed.join();
          if (!found.has(id)) {
            found.set(id, Array.from(packed, (k) => /** @type {XY} */ ([k % 32, (k - (k % 32)) / 32])));
          }
        }
      }
    }
    shapes = [...found.values()].sort(compareCells);
  }
  const entry = { shapes, index: new Map(shapes.map((cells, i) => [shapeText(cells), i])) };
  catalogue[n] = entry;
  catalogueStats.sizesBuilt += 1;
  return entry;
}

/**
 * Canonical free polyominoes of n cells in catalogue order; read-only.
 * @param {number} n 1 ... 10
 * @returns {readonly XY[][]}
 */
export function catalogueShapes(n) {
  return sizeEntry(n).shapes;
}

/**
 * @param {number} n 1 ... 10
 * @returns {number}
 */
export function catalogueCount(n) {
  return sizeEntry(n).shapes.length;
}

// -------------------------------------------------------------------- text

const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

/**
 * `text(s)`: a form bit, EG3 of the length, then 8-bit bytes (form 0) or 16-bit
 * code units (form 1, only for strings with lone surrogates).
 * @param {BitWriter} w
 * @param {string} s
 */
export function writeText(w, s) {
  if (LONE_SURROGATE.test(s)) {
    w.write(1, 1);
    writeEG(w, 3, s.length);
    for (let i = 0; i < s.length; i += 1) {
      w.write(s.charCodeAt(i), 16);
    }
  } else {
    const bytes = utf8Encoder.encode(s);
    w.write(0, 1);
    writeEG(w, 3, bytes.length);
    for (const byte of bytes) {
      w.write(byte, 8);
    }
  }
}

/**
 * @param {BitReader} r
 * @param {number} maxCount Largest accepted byte or code-unit count.
 * @returns {string}
 */
export function readText(r, maxCount) {
  const form = r.readBit();
  const count = readEG(r, 3);
  if (count > maxCount) {
    throw invalid('A text in the code is too long.');
  }
  if (form === 1) {
    if (count * 16 > r.remaining) {
      throw truncated();
    }
    let text = '';
    for (let i = 0; i < count; i += 1) {
      text += String.fromCharCode(r.read(16));
    }
    return text;
  }
  if (count * 8 > r.remaining) {
    throw truncated();
  }
  const bytes = new Uint8Array(count);
  for (let i = 0; i < count; i += 1) {
    bytes[i] = r.read(8);
  }
  try {
    return utf8Decoder.decode(bytes);
  } catch {
    throw invalid('A text in the code is not valid UTF-8.');
  }
}

// ----------------------------------------------------------------- rating

/**
 * Count-only placement measurement of the unclued pieces: free cells and the
 * mean log2(1 + placements) summed in the plan's order (size, canonical shape,
 * id). Never builds an exact-cover model, so it has no solver workspace limit.
 * @param {Board} board
 * @param {Piece[]} pieces
 * @param {Pose[]} clues
 * @returns {{ R: number, H: number }}
 */
export function measureFreePlacements(board, pieces, clues) {
  const U = pieces.length - clues.length;
  if (U === 0) {
    return { R: 0, H: 0 };
  }
  const plan = preparePlacements(board, pieces, clues);
  const counts = countPlacements(plan);
  let bits = 0;
  for (let i = 0; i < plan.freePieceCount; i += 1) {
    bits += Math.log2(1 + counts.perPiece[i]);
  }
  return { R: plan.freeCells, H: bits / U };
}

/**
 * The claim of the compact rating form, in the pack reader's field order.
 * @param {Board} board
 * @param {Piece[]} pieces
 * @param {Pose[]} clues
 * @param {{ stop: string, branchTrials: number, rowTrials: number }} fields
 * @param {NonNullable<CodecDeps['measure']>} measure
 * @returns {RatingClaim}
 */
export function rebuildRatingClaim(board, pieces, clues, fields, measure) {
  const U = pieces.length - clues.length;
  if (U === 0) {
    return {
      model: RATING.model,
      score: 0,
      level: frozenLevelId(0),
      saturated: false,
      metrics: { U: 0, B: 0, branchTrials: 0, rowTrials: 0, stop: 'solution', R: 0, H: 0 },
    };
  }
  const { R, H } = measure(board, pieces, clues);
  const saturated = fields.stop !== 'solution';
  const B = saturated ? RATING.branchCap : Math.min(fields.branchTrials, RATING.branchCap);
  const score = frozenScore(U, B);
  return {
    model: RATING.model,
    score,
    level: frozenLevelId(score),
    saturated,
    metrics: { U, B, branchTrials: fields.branchTrials, rowTrials: fields.rowTrials, stop: fields.stop, R, H },
  };
}

/**
 * The compact form's fields when the stored claim is exactly rebuildable.
 * @param {RatingClaim} claim
 * @param {Board} board
 * @param {Piece[]} pieces
 * @param {Pose[]} clues
 * @param {NonNullable<CodecDeps['measure']>} measure
 * @returns {{ stop: string, branchTrials: number, rowTrials: number } | null}
 */
function rebuildableFields(claim, board, pieces, clues, measure) {
  try {
    if (claim.model !== RATING.model) {
      return null;
    }
    const m = /** @type {Record<string, unknown> | undefined} */ (claim.metrics);
    if (m === undefined || typeof m.stop !== 'string' || !RATING.stops.includes(m.stop)) {
      return null;
    }
    const { branchTrials, rowTrials } = m;
    if (!Number.isInteger(branchTrials) || /** @type {number} */ (branchTrials) < 0
      || /** @type {number} */ (branchTrials) > RATING.branchCap
      || !Number.isInteger(rowTrials) || /** @type {number} */ (rowTrials) < 0
      || /** @type {number} */ (rowTrials) > RATING.rowCap) {
      return null;
    }
    const fields = { stop: m.stop, branchTrials: /** @type {number} */ (branchTrials), rowTrials: /** @type {number} */ (rowTrials) };
    const rebuilt = rebuildRatingClaim(board, pieces, clues, fields, measure);
    return JSON.stringify(rebuilt) === JSON.stringify(claim) ? fields : null;
  } catch {
    return null;
  }
}

/**
 * @param {BitWriter} w
 * @param {RatingClaim | null} claim
 * @param {PuzzleParts} parts
 * @param {NonNullable<CodecDeps['measure']>} measure
 */
function writeRating(w, claim, parts, measure) {
  if (claim === null) {
    w.write(0, 1);
    return;
  }
  w.write(1, 1);
  const fields = rebuildableFields(claim, parts.board, parts.pieces, parts.clues, measure);
  if (fields === null) {
    w.write(0, 1);
    writeText(w, JSON.stringify(claim));
    return;
  }
  w.write(1, 1);
  const stop = RATING.stops.indexOf(fields.stop);
  writeTB(w, stop, 3);
  if (stop === 1) {
    const atCap = fields.branchTrials === RATING.branchCap;
    w.write(atCap ? 1 : 0, 1);
    if (!atCap) {
      writeEG(w, 5, fields.branchTrials);
    }
  } else {
    writeEG(w, 5, fields.branchTrials);
  }
  if (stop === 2) {
    const atCap = fields.rowTrials === RATING.rowCap;
    w.write(atCap ? 1 : 0, 1);
    if (!atCap) {
      writeEG(w, 5, fields.rowTrials);
    }
  } else {
    writeEG(w, 5, fields.rowTrials);
  }
}

/**
 * @typedef {{ present: false }
 *   | { present: true, rebuild: { stop: string, branchTrials: number, rowTrials: number } }
 *   | { present: true, json: string }} RatingField
 */

/**
 * @param {BitReader} r
 * @returns {RatingField}
 */
function readRatingField(r) {
  if (r.readBit() === 0) {
    return { present: false };
  }
  if (r.readBit() === 0) {
    return { present: true, json: readText(r, CODE_BOUNDS.ratingJsonBytes) };
  }
  const stop = readTB(r, 3);
  let branchTrials;
  if (stop === 1 && r.readBit() === 1) {
    branchTrials = RATING.branchCap;
  } else {
    branchTrials = readEG(r, 5);
  }
  let rowTrials;
  if (stop === 2 && r.readBit() === 1) {
    rowTrials = RATING.rowCap;
  } else {
    rowTrials = readEG(r, 5);
  }
  if (branchTrials > RATING.branchCap || rowTrials > RATING.rowCap) {
    throw invalid('A rating counter is above its cap.');
  }
  return { present: true, rebuild: { stop: RATING.stops[stop], branchTrials, rowTrials } };
}

// ------------------------------------------------------------- title, cert

const KIND2_SUFFIX = /^[1-9][0-9]{0,9}$/;

/**
 * @param {BitWriter} w
 * @param {string | null} title
 * @param {RatingClaim | null} rating
 */
function writeTitle(w, title, rating) {
  if (title === null) {
    w.write(0, 2);
    return;
  }
  const label = rating === null ? null : levelLabelOf(rating.level);
  if (label !== null) {
    if (title === label) {
      w.write(1, 2);
      return;
    }
    if (title.startsWith(`${label} #`)) {
      const suffix = title.slice(label.length + 2);
      if (KIND2_SUFFIX.test(suffix) && Number(suffix) <= CODE_BOUNDS.kind2Max) {
        w.write(2, 2);
        writeEG(w, 2, Number(suffix) - 1);
        return;
      }
    }
  }
  w.write(3, 2);
  writeText(w, title);
}

/**
 * @typedef {{ kind: 0 } | { kind: 1 } | { kind: 2, n: number } | { kind: 3, text: string }} TitleField
 */

/**
 * @param {BitReader} r
 * @returns {TitleField}
 */
function readTitleField(r) {
  const kind = r.read(2);
  if (kind === 2) {
    const n = readEG(r, 2) + 1;
    if (n > CODE_BOUNDS.kind2Max) {
      throw invalid('A title number is out of range.');
    }
    return { kind, n };
  }
  if (kind === 3) {
    return { kind, text: readText(r, CODE_BOUNDS.titleChars * 4) };
  }
  return { kind };
}

const CERTIFICATE_STATUSES = /** @type {const} */ (['unique', 'multiple', 'not-proved', 'unsatisfiable']);

/**
 * @param {BitWriter} w
 * @param {CertificateClaim | null} certificate
 */
function writeCertificate(w, certificate) {
  if (certificate === null) {
    w.write(0, 1);
    return;
  }
  w.write(1, 1);
  writeTB(w, CERTIFICATE_STATUSES.indexOf(certificate.status), 4);
  if (certificate.model === 'dlx-v1') {
    w.write(1, 1);
  } else {
    w.write(0, 1);
    writeText(w, certificate.model);
  }
  if (certificate.rowLimit === undefined) {
    w.write(0, 1);
  } else {
    w.write(1, 1);
    writeEG(w, 10, certificate.rowLimit);
  }
}

/**
 * @param {BitReader} r
 * @returns {CertificateClaim | null}
 */
function readCertificate(r) {
  if (r.readBit() === 0) {
    return null;
  }
  const status = CERTIFICATE_STATUSES[readTB(r, 4)];
  const model = r.readBit() === 1 ? 'dlx-v1' : readText(r, CODE_BOUNDS.modelChars * 4);
  /** @type {CertificateClaim} */
  const claim = { status, model };
  if (r.readBit() === 1) {
    claim.rowLimit = readEG(r, 10);
  }
  return claim;
}

// ------------------------------------------------------------------- board

/**
 * @param {number} W
 * @param {number} H
 * @param {Uint8Array} active
 * @returns {{ mode: number, writer: BitWriter }}
 */
function chooseBoardMask(W, H, active) {
  const cells = W * H;
  /** @type {number[]} */
  const blocked = [];
  for (let i = 0; i < cells; i += 1) {
    if (active[i] === 0) {
      blocked.push(i);
    }
  }
  /** @type {{ mode: number, writer: BitWriter }[]} */
  const options = [];
  /** @param {number} mode @param {(w: BitWriter) => void} body */
  const add = (mode, body) => {
    const writer = new BitWriter();
    writeTB(writer, mode, 5);
    body(writer);
    options.push({ mode, writer });
  };

  if (blocked.length === 0) {
    add(0, () => {});
  }

  /** @type {number[]} */
  const gaps = [];
  let previous = -1;
  for (const index of blocked) {
    gaps.push(index - previous - 1);
    previous = index;
  }
  /** @type {{ k: number, writer: BitWriter } | null} */
  let bestGaps = null;
  for (let k = 0; k < 8; k += 1) {
    const writer = new BitWriter();
    writeEG(writer, 2, gaps.length);
    writer.write(k, 3);
    for (const gap of gaps) {
      writeEG(writer, k, gap);
    }
    if (bestGaps === null || writer.length < bestGaps.writer.length) {
      bestGaps = { k, writer };
    }
  }
  add(1, (w) => w.append(/** @type {{ writer: BitWriter }} */ (bestGaps).writer));

  /** @type {number[]} */
  const runs = [];
  let current = 1;
  let length = 0;
  for (let i = 0; i < cells; i += 1) {
    if (active[i] === current) {
      length += 1;
    } else {
      runs.push(length);
      current = active[i];
      length = 1;
    }
  }
  runs.push(length);
  const stored = runs.slice(0, -1);
  /** @type {{ k: number, writer: BitWriter } | null} */
  let bestRuns = null;
  for (let k = 0; k < 8; k += 1) {
    const writer = new BitWriter();
    writer.write(k, 3);
    writeEG(writer, 2, stored.length);
    for (const run of stored) {
      writeEG(writer, k, run);
    }
    if (bestRuns === null || writer.length < bestRuns.writer.length) {
      bestRuns = { k, writer };
    }
  }
  add(2, (w) => w.append(/** @type {{ writer: BitWriter }} */ (bestRuns).writer));

  add(3, (w) => {
    const covered = new Uint8Array(cells);
    /** @type {{ x: number, y: number, w: number, h: number }[]} */
    const rectangles = [];
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        const at = y * W + x;
        if (active[at] === 1 || covered[at] === 1) {
          continue;
        }
        let rw = 1;
        while (x + rw < W && active[at + rw] === 0 && covered[at + rw] === 0) {
          rw += 1;
        }
        let rh = 1;
        while (y + rh < H) {
          let whole = true;
          for (let dx = 0; dx < rw; dx += 1) {
            const i = (y + rh) * W + x + dx;
            if (active[i] === 1 || covered[i] === 1) {
              whole = false;
              break;
            }
          }
          if (!whole) {
            break;
          }
          rh += 1;
        }
        for (let dy = 0; dy < rh; dy += 1) {
          for (let dx = 0; dx < rw; dx += 1) {
            covered[(y + dy) * W + x + dx] = 1;
          }
        }
        rectangles.push({ x, y, w: rw, h: rh });
      }
    }
    writeEG(w, 0, rectangles.length);
    for (const rect of rectangles) {
      writeTB(w, rect.y * W + rect.x, cells);
      writeTB(w, rect.w - 1, W - rect.x);
      writeTB(w, rect.h - 1, H - rect.y);
    }
  });

  add(4, (w) => {
    for (let i = 0; i < cells; i += 1) {
      w.write(active[i], 1);
    }
  });

  return options.reduce((best, option) => (option.writer.length < best.writer.length ? option : best));
}

/**
 * @param {BitReader} r
 * @param {number} W
 * @param {number} H
 * @returns {Uint8Array} Active mask, 1 = active.
 */
function readBoardMask(r, W, H) {
  const cells = W * H;
  const mode = readTB(r, 5);
  const active = new Uint8Array(cells).fill(1);
  if (mode === 0) {
    return active;
  }
  if (mode === 1) {
    const count = readEG(r, 2);
    const k = r.read(3);
    if (count > cells) {
      throw invalid('The board lists more blocked cells than it has cells.');
    }
    let index = -1;
    for (let i = 0; i < count; i += 1) {
      index += readEG(r, k) + 1;
      if (index >= cells) {
        throw invalid('A blocked cell is outside the board.');
      }
      active[index] = 0;
    }
    return active;
  }
  if (mode === 2) {
    const k = r.read(3);
    const count = readEG(r, 2);
    if (count > cells) {
      throw invalid('The board has more runs than cells.');
    }
    let at = 0;
    for (let i = 0; i < count; i += 1) {
      const run = readEG(r, k);
      if (run > cells - at) {
        throw invalid('A board run leaves the board.');
      }
      if (i % 2 === 1) {
        active.fill(0, at, at + run);
      }
      at += run;
    }
    if (count % 2 === 1) {
      active.fill(0, at, cells);
    }
    return active;
  }
  if (mode === 3) {
    const count = readEG(r, 0);
    if (count > cells) {
      throw invalid('The board lists more blocked rectangles than it has cells.');
    }
    for (let i = 0; i < count; i += 1) {
      const start = readTB(r, cells);
      const x = start % W;
      const y = (start - x) / W;
      const rw = readTB(r, W - x) + 1;
      const rh = readTB(r, H - y) + 1;
      for (let dy = 0; dy < rh; dy += 1) {
        for (let dx = 0; dx < rw; dx += 1) {
          const at = (y + dy) * W + x + dx;
          if (active[at] === 0) {
            throw invalid('Two blocked rectangles overlap.');
          }
          active[at] = 0;
        }
      }
    }
    return active;
  }
  if (r.remaining < cells) {
    throw truncated();
  }
  for (let i = 0; i < cells; i += 1) {
    active[i] = r.readBit();
  }
  return active;
}

// ------------------------------------------------------------------- shapes

/**
 * Breadth-first shape code (shapes over ten cells): the root is the first cell
 * in raster order at (0, 0); neighbours are tried right, down, left, up.
 * @param {BitWriter} w
 * @param {XY[]} canonical Normalized and sorted.
 */
function writeBfsShape(w, canonical) {
  const n = canonical.length;
  const [rootX, rootY] = canonical[0];
  const inShape = new Set(canonical.map(([x, y]) => `${x - rootX},${y - rootY}`));
  const decided = new Set(['0,0']);
  /** @type {XY[]} */
  const queue = [[0, 0]];
  let known = 1;
  for (let head = 0; known < n && head < queue.length; head += 1) {
    const [x, y] = queue[head];
    for (const [dx, dy] of NEIGHBORS) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;
      if (ny < 0 || (ny === 0 && nx < 0) || decided.has(key)) {
        continue;
      }
      decided.add(key);
      const inside = inShape.has(key);
      w.write(inside ? 1 : 0, 1);
      if (inside) {
        queue.push([nx, ny]);
        known += 1;
        if (known === n) {
          break;
        }
      }
    }
  }
}

/**
 * @param {BitReader} r
 * @param {number} n Cell count, over ten.
 * @returns {XY[]} Normalized and sorted.
 */
function readBfsShape(r, n) {
  /** @type {XY[]} */
  const cells = [[0, 0]];
  const decided = new Set(['0,0']);
  /** @type {XY[]} */
  const queue = [[0, 0]];
  let steps = 0;
  for (let head = 0; cells.length < n; head += 1) {
    if (head >= queue.length) {
      throw invalid('A piece shape ends before its declared size.');
    }
    const [x, y] = queue[head];
    for (const [dx, dy] of NEIGHBORS) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;
      if (ny < 0 || (ny === 0 && nx < 0) || decided.has(key)) {
        continue;
      }
      decided.add(key);
      steps += 1;
      if (steps > 4 * n + 8) {
        throw invalid('A piece shape needs too many steps.');
      }
      if (r.readBit() === 1) {
        cells.push([nx, ny]);
        queue.push([nx, ny]);
        if (cells.length === n) {
          break;
        }
      }
    }
  }
  return orientedCells(cells, 0);
}

/**
 * Legal placements of a shape in the frozen order: orientation, then y, then
 * x; every cell active and not covered. `visit` returns true to stop.
 * @param {number} W
 * @param {number} H
 * @param {Uint8Array} active
 * @param {Uint8Array} covered
 * @param {Orientation[]} orientations
 * @param {(o: number, x: number, y: number) => boolean | void} visit
 */
function forEachLegalPlacement(W, H, active, covered, orientations, visit) {
  for (let o = 0; o < orientations.length; o += 1) {
    const { cells, w, h } = orientations[o];
    for (let y = 0; y + h <= H; y += 1) {
      for (let x = 0; x + w <= W; x += 1) {
        let legal = true;
        for (const [cx, cy] of cells) {
          const at = (y + cy) * W + x + cx;
          if (active[at] !== 1 || covered[at] === 1) {
            legal = false;
            break;
          }
        }
        if (legal && visit(o, x, y) === true) {
          return;
        }
      }
    }
  }
}

// ------------------------------------------------------------------ encoder

/**
 * @typedef {object} PieceInfo
 * @property {XY[]} canonical Canonical shape.
 * @property {string} key Text of the canonical shape.
 * @property {number} t Smallest transform of the canonical shape giving the stored cells.
 * @property {Orientation[]} orientations Distinct orientations of the canonical shape.
 */

/**
 * @param {Piece[]} pieces
 * @returns {PieceInfo[]}
 */
function analysePieces(pieces) {
  return pieces.map((piece) => {
    const canonical = canonicalCells(piece.cells);
    return {
      canonical,
      key: shapeText(canonical),
      t: transformTo(canonical, piece.cells),
      orientations: orientationsOf(canonical),
    };
  });
}

/**
 * @param {Piece[]} pieces
 * @param {PieceInfo[]} infos
 * @returns {boolean[]} Entry i: piece i has the shape of piece i - 1.
 */
function sameShapeFlags(pieces, infos) {
  return pieces.map((_, i) => i > 0 && infos[i].key === infos[i - 1].key);
}

/**
 * @param {PieceInfo[]} infos
 * @param {number[]} remaining
 * @returns {boolean}
 */
function inCanonicalOrder(infos, remaining) {
  for (let i = 1; i < remaining.length; i += 1) {
    const a = infos[remaining[i - 1]].canonical;
    const b = infos[remaining[i]].canonical;
    if (a.length < b.length || (a.length === b.length && compareCells(a, b) >= 0)) {
      return false;
    }
  }
  return true;
}

/**
 * The version-1 payload of the core: everything after the version symbol and
 * before the zero fill.
 * @param {PuzzleParts} parts
 * @param {CodecDeps} [deps]
 * @returns {BitWriter}
 */
export function encodeCorePayload(parts, deps = {}) {
  const measure = deps.measure ?? measureFreePlacements;
  const { board, pieces, clues } = parts;
  const K = pieces.length;
  const W = board.width;
  const H = board.height;
  const infos = analysePieces(pieces);
  const same = sameShapeFlags(pieces, infos);
  const repeated = same.some(Boolean);
  const remaining = pieces.map((_, i) => i).filter((i) => !same[i]);
  const canonicalOrder = inCanonicalOrder(infos, remaining);
  const canonicalOrientation = infos.every((info) => info.t === 0);
  const defaultIdentity = pieces.every((piece, i) => piece.id === labelFor(i) && piece.label === labelFor(i)
    && piece.color.toLowerCase() === colorFor(i));

  const w = new BitWriter();
  w.write(repeated ? 1 : 0, 1);
  writeRating(w, parts.rating, parts, measure);
  writeTitle(w, parts.title, parts.rating);
  writeCertificate(w, parts.certificate);

  w.write(W - 1, 6);
  w.write(H - 1, 6);
  w.append(chooseBoardMask(W, H, board.active).writer);
  w.write(parts.rotation / 45, 3);

  writeEG(w, 3, K - 1);
  w.write(canonicalOrder ? 1 : 0, 1);
  w.write(canonicalOrientation ? 1 : 0, 1);
  w.write(defaultIdentity ? 1 : 0, 1);
  if (repeated) {
    for (let i = 1; i < K; i += 1) {
      w.write(same[i] ? 1 : 0, 1);
    }
  }

  const sizes = remaining.map((i) => pieces[i].cells.length);
  if (canonicalOrder) {
    writeEG(w, 2, sizes[0] - 1);
    for (let i = 1; i < sizes.length; i += 1) {
      writeEG(w, 0, sizes[i - 1] - sizes[i]);
    }
  } else {
    for (const size of sizes) {
      writeEG(w, 2, size - 1);
    }
  }

  for (let at = 0; at < remaining.length;) {
    const size = sizes[at];
    if (size > CODE_BOUNDS.catalogueMaxSize) {
      writeBfsShape(w, infos[remaining[at]].canonical);
      at += 1;
    } else if (canonicalOrder) {
      let end = at;
      while (end < remaining.length && sizes[end] === size) {
        end += 1;
      }
      const entry = sizeEntry(size);
      writeRank(w, remaining.slice(at, end).map((i) => /** @type {number} */ (entry.index.get(infos[i].key))), entry.shapes.length);
      at = end;
    } else {
      const entry = sizeEntry(size);
      const index = /** @type {number} */ (entry.index.get(infos[remaining[at]].key));
      writeTB(w, index, entry.shapes.length);
      at += 1;
    }
  }

  if (!canonicalOrientation) {
    for (const info of infos) {
      w.write(info.t, 3);
    }
  }

  if (!defaultIdentity) {
    pieces.forEach((piece, i) => {
      const idSet = piece.id !== labelFor(i);
      const labelSet = piece.label !== labelFor(i);
      const colorSet = piece.color.toLowerCase() !== colorFor(i);
      w.write(idSet ? 1 : 0, 1);
      w.write(labelSet ? 1 : 0, 1);
      w.write(colorSet ? 1 : 0, 1);
      if (idSet) {
        writeText(w, piece.id);
      }
      if (labelSet) {
        writeText(w, piece.label);
      }
      if (colorSet) {
        w.write(parseInt(piece.color.slice(1), 16), 24);
      }
    });
  }

  writeClues(w, parts, infos);
  return w;
}

/**
 * @param {BitWriter} w
 * @param {PuzzleParts} parts
 * @param {PieceInfo[]} infos
 */
function writeClues(w, parts, infos) {
  const { board, pieces, clues } = parts;
  const K = pieces.length;
  const G = clues.length;
  const indexOfId = new Map(pieces.map((piece, i) => [piece.id, i]));
  const order = clues.map((clue) => /** @type {number} */ (indexOfId.get(clue.piece)));
  const sorted = [...order].sort((a, b) => a - b);
  const inPieceOrder = order.every((index, i) => index === sorted[i]);
  writeTB(w, G, K + 1);
  w.write(inPieceOrder ? 1 : 0, 1);
  writeRank(w, sorted, K);
  if (!inPieceOrder) {
    const left = [...sorted];
    for (const index of order) {
      const position = left.indexOf(index);
      writeTB(w, position, left.length);
      left.splice(position, 1);
    }
  }
  const covered = new Uint8Array(board.active.length);
  clues.forEach((clue, record) => {
    const piece = pieces[order[record]];
    const info = infos[order[record]];
    const o = orientationOfPose(piece, clue, info.orientations);
    let ordinal = 0;
    let found = -1;
    forEachLegalPlacement(board.width, board.height, board.active, covered, info.orientations, (oi, x, y) => {
      if (oi === o && x === clue.x && y === clue.y) {
        found = ordinal;
      }
      ordinal += 1;
    });
    writeTB(w, found, ordinal);
    for (const [x, y] of poseCells(piece, clue)) {
      covered[y * board.width + x] = 1;
    }
  });
}

/**
 * Index of the distinct orientation of the canonical shape whose cells the
 * pose of a stored piece occupies (relative to its origin).
 * @param {Piece} piece
 * @param {Pose} pose
 * @param {Orientation[]} orientations
 * @returns {number}
 */
function orientationOfPose(piece, pose, orientations) {
  const shape = orientedCells(piece.cells, (pose.mirrored ? 4 : 0) + pose.turn);
  return orientations.findIndex((orientation) => compareCells(orientation.cells, shape) === 0);
}

/**
 * Candidate placements for the next free cell of the solution path: unused
 * pieces in index order, each distinct orientation anchored by its first cell.
 * @param {number} W
 * @param {number} H
 * @param {Uint8Array} active
 * @param {Uint8Array} covered
 * @param {number} cell First free active cell in raster order.
 * @param {boolean[]} used
 * @param {Orientation[][]} orientations Per piece.
 * @returns {{ piece: number, o: number, x: number, y: number }[]}
 */
function pathCandidates(W, H, active, covered, cell, used, orientations) {
  const cx = cell % W;
  const cy = (cell - cx) / W;
  /** @type {{ piece: number, o: number, x: number, y: number }[]} */
  const out = [];
  orientations.forEach((list, piece) => {
    if (used[piece]) {
      return;
    }
    list.forEach((orientation, o) => {
      const x = cx - orientation.cells[0][0];
      const y = cy;
      if (x < 0 || x + orientation.w > W || y + orientation.h > H) {
        return;
      }
      for (const [dx, dy] of orientation.cells) {
        const at = (y + dy) * W + x + dx;
        if (active[at] !== 1 || covered[at] === 1) {
          return;
        }
      }
      out.push({ piece, o, x, y });
    });
  });
  return out;
}

/**
 * The tail payload (tag 1): the solution path; null without a stored solution.
 * @param {PuzzleParts} parts
 * @returns {BitWriter | null}
 */
export function encodeTailPayload(parts) {
  const { board, pieces, clues, solution } = parts;
  if (solution === null) {
    return null;
  }
  const W = board.width;
  const H = board.height;
  const orientations = pieces.map((piece) => orientationsOf(canonicalCells(piece.cells)));
  const used = pieces.map((piece) => clues.some((clue) => clue.piece === piece.id));
  const covered = new Uint8Array(board.active.length);
  for (const clue of clues) {
    const piece = /** @type {Piece} */ (pieces.find((p) => p.id === clue.piece));
    for (const [x, y] of poseCells(piece, clue)) {
      covered[y * W + x] = 1;
    }
  }
  // The solution placement whose first cell (raster order) is each cell.
  /** @type {Map<number, { piece: number, o: number }>} */
  const startsAt = new Map();
  for (const pose of solution) {
    const piece = pieces.findIndex((p) => p.id === pose.piece);
    const o = orientationOfPose(pieces[piece], pose, orientations[piece]);
    const [fx, fy] = orientations[piece][o].cells[0];
    startsAt.set((pose.y + fy) * W + pose.x + fx, { piece, o });
  }

  const w = new BitWriter();
  w.write(1, 5);
  for (let cell = 0; cell < board.active.length; cell += 1) {
    if (board.active[cell] !== 1 || covered[cell] === 1) {
      continue;
    }
    const choice = startsAt.get(cell);
    const candidates = pathCandidates(W, H, board.active, covered, cell, used, orientations);
    const index = candidates.findIndex((c) => c.piece === choice?.piece && c.o === choice.o);
    if (index < 0) {
      throw invalid('The stored solution does not fit the puzzle.');
    }
    writeTB(w, index, candidates.length);
    const picked = candidates[index];
    used[picked.piece] = true;
    for (const [dx, dy] of orientations[picked.piece][picked.o].cells) {
      covered[(picked.y + dy) * W + picked.x + dx] = 1;
    }
  }
  return w;
}

// ------------------------------------------------------------------ decoder

/**
 * @param {number} count
 * @param {string} what
 * @returns {number}
 */
function checkedSize(count, what) {
  if (count < 1 || count > CODE_BOUNDS.pieceCells) {
    throw invalid(`${what} must have 1 to ${CODE_BOUNDS.pieceCells} cells.`);
  }
  return count;
}

/**
 * Validates the wire form of a one-puzzle pack and gives the puzzle its
 * recomputed public id.
 * @param {Record<string, unknown>} wire
 * @returns {Pack}
 */
function validatedPack(wire) {
  const checked = validatePack(wire);
  if (!checked.ok) {
    throw invalid(checked.issues[0]?.message ?? 'The code does not describe a valid puzzle.');
  }
  const pack = checked.value;
  try {
    pack.puzzles[0].id = puzzleId(boardFromRows(pack.board.rows), pack.pieces, pack.puzzles[0].clues);
  } catch {
    throw invalid('The code does not describe a valid puzzle.');
  }
  return pack;
}

/**
 * Parses the version-1 payload of a core (after the version symbol, or from
 * inflated bytes) into one ordinary validated pack with one puzzle, no
 * solution, no witness, no generation and no meta. Every count and rank is
 * bounded before any loop or allocation that depends on it. The caller checks
 * the remaining bits.
 * @param {BitReader} r
 * @param {CodecDeps} [deps]
 * @returns {Pack}
 * @throws {PuzzleCodeError} `invalid`
 */
export function decodeCorePayload(r, deps = {}) {
  const measure = deps.measure ?? measureFreePlacements;
  const repeated = r.readBit() === 1;
  const ratingField = readRatingField(r);
  const titleField = readTitleField(r);
  const certificate = readCertificate(r);

  const W = r.read(6) + 1;
  const H = r.read(6) + 1;
  const active = readBoardMask(r, W, H);
  let area = 0;
  for (let i = 0; i < active.length; i += 1) {
    area += active[i];
  }
  if (area < 1 || area > CODE_BOUNDS.active) {
    throw invalid(`The board must have 1 to ${CODE_BOUNDS.active} active cells.`);
  }
  const rotation = r.read(3) * 45;

  const K = readEG(r, 3) + 1;
  if (K > CODE_BOUNDS.pieces) {
    throw invalid(`A puzzle has 1 to ${CODE_BOUNDS.pieces} pieces.`);
  }
  const canonicalOrder = r.readBit() === 1;
  const canonicalOrientation = r.readBit() === 1;
  const defaultIdentity = r.readBit() === 1;
  const same = new Array(K).fill(false);
  if (repeated) {
    for (let i = 1; i < K; i += 1) {
      same[i] = r.readBit() === 1;
    }
  }
  const remaining = same.map((_, i) => i).filter((i) => !same[i]);

  /** @type {number[]} */
  const sizes = [];
  if (canonicalOrder) {
    let size = checkedSize(readEG(r, 2) + 1, 'A piece');
    sizes.push(size);
    for (let i = 1; i < remaining.length; i += 1) {
      size = checkedSize(size - readEG(r, 0), 'A piece');
      sizes.push(size);
    }
  } else {
    for (let i = 0; i < remaining.length; i += 1) {
      sizes.push(checkedSize(readEG(r, 2) + 1, 'A piece'));
    }
  }
  const sizeOf = new Array(K);
  remaining.forEach((piece, i) => {
    sizeOf[piece] = sizes[i];
  });
  for (let i = 1; i < K; i += 1) {
    if (same[i]) {
      sizeOf[i] = sizeOf[i - 1];
    }
  }
  if (sizeOf.reduce((sum, size) => sum + size, 0) !== area) {
    throw invalid('The piece sizes do not add up to the board area.');
  }

  /** @type {XY[][]} */
  const canonical = new Array(K);
  for (let at = 0; at < remaining.length;) {
    const size = sizes[at];
    if (size > CODE_BOUNDS.catalogueMaxSize) {
      const shape = readBfsShape(r, size);
      if (compareCells(canonicalCells(shape), shape) !== 0) {
        throw invalid('A large piece shape is not in canonical orientation.');
      }
      if (canonicalOrder && at > 0 && sizes[at - 1] === size && compareCells(canonical[remaining[at - 1]], shape) >= 0) {
        throw invalid('The pieces are not in the order the code declares.');
      }
      canonical[remaining[at]] = shape;
      at += 1;
    } else if (canonicalOrder) {
      let end = at;
      while (end < remaining.length && sizes[end] === size) {
        end += 1;
      }
      const entry = sizeEntry(size);
      const chosen = readRank(r, entry.shapes.length, end - at);
      chosen.forEach((index, j) => {
        canonical[remaining[at + j]] = entry.shapes[index];
      });
      at = end;
    } else {
      const entry = sizeEntry(size);
      canonical[remaining[at]] = entry.shapes[readTB(r, entry.shapes.length)];
      at += 1;
    }
  }
  for (let i = 1; i < K; i += 1) {
    if (same[i]) {
      canonical[i] = canonical[i - 1];
    }
  }

  const stored = canonical.map((shape) => (canonicalOrientation ? shape : orientedCells(shape, r.read(3))));

  /** @type {Piece[]} */
  const pieces = [];
  for (let i = 0; i < K; i += 1) {
    let id = labelFor(i);
    let label = id;
    let color = colorFor(i);
    if (!defaultIdentity) {
      const idSet = r.readBit() === 1;
      const labelSet = r.readBit() === 1;
      const colorSet = r.readBit() === 1;
      if (idSet) {
        id = readText(r, CODE_BOUNDS.idChars * 4);
      }
      if (labelSet) {
        label = readText(r, CODE_BOUNDS.labelChars * 4);
      }
      if (colorSet) {
        color = `#${r.read(24).toString(16).padStart(6, '0')}`;
      }
    }
    pieces.push({ id, label, color, cells: stored[i].map(([x, y]) => [x, y]) });
  }

  const G = readTB(r, K + 1);
  const inPieceOrder = r.readBit() === 1;
  const clued = readRank(r, K, G);
  let order = clued;
  if (!inPieceOrder) {
    const left = [...clued];
    order = [];
    for (let j = 0; j < G; j += 1) {
      const position = readTB(r, left.length);
      order.push(left[position]);
      left.splice(position, 1);
    }
  }
  /** @type {Pose[]} */
  const clues = [];
  const covered = new Uint8Array(W * H);
  for (const index of order) {
    const orientations = orientationsOf(canonical[index]);
    let total = 0;
    forEachLegalPlacement(W, H, active, covered, orientations, () => {
      total += 1;
    });
    const wanted = readTB(r, total);
    let ordinal = 0;
    /** @type {[number, number, number]} */
    let chosen = [0, 0, 0];
    forEachLegalPlacement(W, H, active, covered, orientations, (o, x, y) => {
      if (ordinal === wanted) {
        chosen = [o, x, y];
        return true;
      }
      ordinal += 1;
      return false;
    });
    const [o, x, y] = chosen;
    const t = transformTo(stored[index], orientations[o].cells);
    clues.push({ piece: pieces[index].id, x, y, turn: /** @type {0 | 1 | 2 | 3} */ (t & 3), mirrored: t >= 4 });
    for (const [cx, cy] of orientations[o].cells) {
      covered[(y + cy) * W + x + cx] = 1;
    }
  }

  const board = { width: W, height: H, active };
  /** @type {RatingClaim | null} */
  let rating = null;
  if (ratingField.present) {
    if ('rebuild' in ratingField) {
      try {
        rating = rebuildRatingClaim(board, pieces, clues, ratingField.rebuild, measure);
      } catch {
        throw invalid('The rating of the puzzle cannot be rebuilt.');
      }
    } else {
      let parsed;
      try {
        parsed = JSON.parse(ratingField.json);
      } catch {
        throw invalid('The rating of the puzzle is not valid.');
      }
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw invalid('The rating of the puzzle is not valid.');
      }
      rating = parsed;
    }
  }
  /** @type {string | undefined} */
  let title;
  if (titleField.kind === 1 || titleField.kind === 2) {
    const label = levelLabelOf(rating?.level);
    if (label === null) {
      throw invalid('The title refers to a level the rating does not have.');
    }
    title = titleField.kind === 1 ? label : `${label} #${titleField.n}`;
  } else if (titleField.kind === 3 && titleField.text !== '') {
    title = titleField.text;
  }

  /** @type {Record<string, unknown>} */
  const puzzle = { id: 'p' };
  if (title !== undefined) {
    puzzle.title = title;
  }
  puzzle.clues = clues;
  puzzle.solution = null;
  puzzle.rating = rating;
  puzzle.certificate = certificate;
  return validatedPack({
    format: 'pentomino-pack',
    version: 1,
    kind: 'puzzle-pack',
    rules: 'free-polyomino-v1',
    board: { rows: boardToRows(board) },
    presentation: { rotation },
    pieces,
    witness: null,
    puzzles: [puzzle],
  });
}

/**
 * Parses the steps of a tail (after its tag) against the validated core pack
 * and returns the pack with its stored solution, validated again.
 * @param {BitReader} r
 * @param {Pack} pack Core pack from `decodeCorePayload`.
 * @returns {Pack}
 * @throws {PuzzleCodeError} `invalid` when the path does not describe a valid layout.
 */
export function decodeTailPayload(r, pack) {
  const board = boardFromRows(pack.board.rows);
  const { width: W, height: H, active } = board;
  const { pieces } = pack;
  const puzzle = pack.puzzles[0];
  const orientations = pieces.map((piece) => orientationsOf(canonicalCells(piece.cells)));
  const used = pieces.map(() => false);
  /** @type {(Pose | undefined)[]} */
  const poses = pieces.map(() => undefined);
  const covered = new Uint8Array(active.length);
  for (const clue of puzzle.clues) {
    const index = pieces.findIndex((piece) => piece.id === clue.piece);
    used[index] = true;
    poses[index] = { ...clue };
    for (const [x, y] of poseCells(pieces[index], clue)) {
      covered[y * W + x] = 1;
    }
  }
  for (let cell = 0; cell < active.length; cell += 1) {
    if (active[cell] !== 1 || covered[cell] === 1) {
      continue;
    }
    const candidates = pathCandidates(W, H, active, covered, cell, used, orientations);
    const picked = candidates[readTB(r, candidates.length)];
    const orientation = orientations[picked.piece][picked.o];
    const t = transformTo(pieces[picked.piece].cells, orientation.cells);
    used[picked.piece] = true;
    poses[picked.piece] = {
      piece: pieces[picked.piece].id,
      x: picked.x,
      y: picked.y,
      turn: /** @type {0 | 1 | 2 | 3} */ (t & 3),
      mirrored: t >= 4,
    };
    for (const [dx, dy] of orientation.cells) {
      covered[(picked.y + dy) * W + picked.x + dx] = 1;
    }
  }
  if (r.remaining >= 5 || !r.restIsZero() || poses.some((pose) => pose === undefined)) {
    throw invalid('The solution part is not a complete path.');
  }
  const checked = validatePack({ ...pack, puzzles: [{ ...puzzle, solution: poses }] });
  if (!checked.ok) {
    throw invalid(checked.issues[0]?.message ?? 'The solution part does not fit the puzzle.');
  }
  return checked.value;
}
