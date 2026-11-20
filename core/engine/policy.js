// @ts-check
// Final generation policy `mixed-v2` (design §6.2, §6.4, §7.2–§7.5, §8.3): limits, piece counts,
// piece-size histograms, score constants and deterministic budgets. Pure; the only randomness
// is the Rng passed to planSizes.
import { level } from './levels.js';
import { QUALIFICATION } from './qualification.js';

/** @typedef {import('./rng.js').Rng} Rng */

/**
 * @typedef {object} SizeOptions
 * @property {[number, number]} [window] Inclusive piece-size window overriding sizeWindow.
 * @property {(size: number) => number} [avail] Remaining distinct shapes per size.
 * @property {number} [smallCap] Maximum number of 3–4-cell pieces.
 */

export const POLICY_ID = 'mixed-v2';

/**
 * Shipped limits follow the qualification gates (§8.7): 576 only after BQ-1, phones 484 only after BQ-3.
 * @param {Readonly<Record<'bq1' | 'bq3', Readonly<{ status: string }>>>} qualification
 */
export function deriveLimits(qualification) {
  return Object.freeze({
    minActive: 30,
    maxSide: 32,
    designMaxActive: 576,
    releaseMaxActive: qualification.bq1.status === 'pass' ? 576 : 484,
    phoneMaxActive: qualification.bq3.status === 'pass' ? 484 : 360,
    largeBoardMaxActive: 676,
    maxBatch: 10,
  });
}

export const LIMITS = deriveLimits(QUALIFICATION);

/**
 * Largest board area the generator accepts on this device. Phones never use the large-board switch.
 * @param {{ phone: boolean, largeBoards: boolean }} device
 * @param {{ phoneMaxActive: number, releaseMaxActive: number, largeBoardMaxActive: number }} [limits]
 * @returns {number}
 */
export function enabledMaxActive(device, limits = LIMITS) {
  if (device.phone) return limits.phoneMaxActive;
  return device.largeBoards ? limits.largeBoardMaxActive : limits.releaseMaxActive;
}

export const SCORE = Object.freeze({
  model: 'difficulty-v2',
  weights: Object.freeze({ U: 2, B: 8 }),
  caps: Object.freeze({ branch: 5000, rows: 50000 }),
});

export const TIME = Object.freeze({ targetMs: 60000, dispatchStopMs: 115000, responseMs: 120000 });

export const BUDGETS = Object.freeze({
  carveSteps: 6000,
  carveTries: 24,
  macroPartitions: 30,
  macroSteps: 3000,
  sizePlans: 6,
  rateBranch: 5000,
  rateRows: 50000,
  countRowsSmall: 10000,
  countRowsLarge: 2000,
  clueSubsets: 64,
  lnsSteps: 8,
  lnsRowsMacro: 3000,
  lnsRowsFlat: 5000,
  restartMaxArea: 150,
  restartBase: 2000,
  tilingTotal: 100000,
  slotAttempts: 12,
  maxRows: 600000,
  maxNodes: 5000000,
  workspaceBytes: 160 * 1048576,
  scratchBytes: 32 * 1048576,
  cacheBytes: 32 * 1048576,
  verifyRows: 2000000,
  progressEvery: 50000,
  historyKeys: 1000,
});

/**
 * Work limits (in search steps) of the exhaustive arrangement count after a `layouts-not-found`
 * batch. `collect` is the most unused arrangements the completion pass takes as candidates.
 * Separate from BUDGETS so generation budgets stay unchanged.
 */
export const ENUMERATION = Object.freeze({
  placements: 250000000,
  nodes: 2500000,
  collect: 32,
});

const K60 = [6, 7.5, 8.5, 10, 11.5, 13, 16, 24, 32, 43, 58, 78];
const K_CAP_FROM_HELL_1 = [42, 62, 92, 140, 210];
const HELL_1_INDEX = 7;
const COUNT_EXPONENT = 0.28;
// Hole-free free polyominoes by size 3..10; larger sizes are unbounded in practice.
const SHAPES = [0, 0, 0, 2, 5, 12, 35, 107, 363, 1248, 4460];

/** @param {number} size */
export const defaultAvail = (size) => (size < 3 ? 0 : size < SHAPES.length ? SHAPES[size] : Infinity);

/**
 * @param {string} name
 * @param {number} value
 */
function requirePositiveInteger(name, value) {
  if (!Number.isInteger(value) || value < 1) throw new RangeError(`${name} must be a positive integer`);
}

/**
 * kMin(A) = ⌈0.75·√A⌉, computed exactly as the least k with 16k² >= 9A.
 * @param {number} area
 * @returns {number}
 */
export function kMin(area) {
  requirePositiveInteger('area', area);
  let k = Math.floor(0.75 * Math.sqrt(area));
  while (16 * k * k < 9 * area) k++;
  return k;
}

/**
 * Smallest area of k pieces with pairwise distinct shapes, smallest sizes first, under the
 * default shape availability and the 3–4-cell cap ⌊0.4·k⌋.
 * @param {number} k
 * @returns {number}
 */
export function minAreaForCount(k) {
  requirePositiveInteger('k', k);
  let remaining = k;
  let small = Math.floor((2 * k) / 5);
  let area = 0;
  for (let s = 3; remaining > 0; s++) {
    let take = Math.min(remaining, defaultAvail(s));
    if (s <= 4) {
      take = Math.min(take, small);
      small -= take;
    }
    area += take * s;
    remaining -= take;
  }
  return area;
}

/**
 * Largest K <= ⌊A/4.5⌋ whose distinct-shape minimum area fits in A (0 if none).
 * @param {number} area
 * @returns {number}
 */
export function kMax(area) {
  requirePositiveInteger('area', area);
  let k = Math.floor((2 * area) / 9);
  while (k > 0 && minAreaForCount(k) > area) k--;
  return k;
}

/** Factors of `sizeWindow` (exactly 3/5 and 3/2 there) and its smallest size, for explanations. */
export const SIZE_WINDOW = Object.freeze({ low: 0.6, high: 1.5, minSize: 3 });

/**
 * Piece-size window [⌊0.6·μ⌋ (at least 3), ⌈1.5·μ⌉] for μ = A/K, in exact integer arithmetic.
 * @param {number} area
 * @param {number} k
 * @returns {[number, number]}
 */
export function sizeWindow(area, k) {
  requirePositiveInteger('area', area);
  requirePositiveInteger('k', k);
  return [Math.max(3, Math.floor((3 * area) / (5 * k))), Math.ceil((3 * area) / (2 * k))];
}

/**
 * @param {number} area
 * @param {number} k
 * @param {SizeOptions | undefined} o
 */
function resolveSizes(area, k, o) {
  requirePositiveInteger('area', area);
  requirePositiveInteger('k', k);
  const window = o?.window ?? sizeWindow(area, k);
  const smallCap = o?.smallCap ?? Math.floor((2 * k) / 5);
  if (!Number.isInteger(window[0]) || !Number.isInteger(window[1])) {
    throw new RangeError('size window bounds must be integers');
  }
  if (!Number.isInteger(smallCap) || smallCap < 0) throw new RangeError('smallCap must be a non-negative integer');
  return { lo: Math.max(3, window[0]), hi: window[1], avail: o?.avail ?? defaultAvail, smallCap };
}

/**
 * Finds counts (indexed by size, length hi + 2) with Σc = K, Σ s·c = A, sizes in the window,
 * c_s <= avail(s) and c3 + c4 <= smallCap, or null. Sizes 3–6 are enumerated; sizes >= 7 use
 * an attainable-sum interval, or a memoized search when some tail size has fewer shapes than
 * pieces left.
 * @param {number} area
 * @param {number} k
 * @param {{ lo: number, hi: number, avail: (s: number) => number, smallCap: number }} cfg
 * @returns {number[] | null}
 */
function solveHistogram(area, k, { lo, hi, avail, smallCap }) {
  if (lo > hi) return null;
  const tailLo = Math.max(lo, 7);
  /** @type {number[]} */
  const counts = new Array(hi + 2).fill(0);
  /** @type {Set<number>} */
  const failed = new Set();

  /**
   * @param {number} s
   * @param {number} r
   * @param {number} rest
   * @returns {boolean}
   */
  const tailSearch = (s, r, rest) => {
    if (r === 0) return rest === 0;
    if (s > hi || r * s > rest || rest > r * hi) return false;
    const key = (s * (k + 1) + r) * (area + 1) + rest;
    if (failed.has(key)) return false;
    for (let c = Math.min(avail(s), r); c >= 0; c--) {
      if (c * s > rest) continue;
      if (tailSearch(s + 1, r - c, rest - c * s)) {
        counts[s] = c;
        return true;
      }
    }
    failed.add(key);
    return false;
  };

  /**
   * @param {number} r Pieces left for the tail.
   * @param {number} rest Area left for the tail.
   */
  const tailSolve = (r, rest) => {
    if (r === 0) return rest === 0;
    if (tailLo > hi || r * tailLo > rest || rest > r * hi) return false;
    let enough = true;
    for (let s = tailLo; s <= hi && enough; s++) enough = avail(s) >= r;
    if (!enough) return tailSearch(tailLo, r, rest);
    const q = Math.floor(rest / r);
    const extra = rest - q * r;
    counts[q] = r - extra;
    if (extra > 0) counts[q + 1] = extra;
    return true;
  };

  const fixedSizes = [3, 4, 5, 6];
  /**
   * @param {number} at Index into fixedSizes.
   * @param {number} n
   * @param {number} a
   * @param {number} small
   * @returns {boolean}
   */
  const search = (at, n, a, small) => {
    if (at === fixedSizes.length) return tailSolve(k - n, area - a);
    const s = fixedSizes[at];
    if (s < lo || s > hi) return search(at + 1, n, a, small);
    const maxCount = Math.min(avail(s), k - n, Math.floor((area - a) / s), s <= 4 ? smallCap - small : Infinity);
    for (let c = 0; c <= maxCount; c++) {
      if (search(at + 1, n + c, a + c * s, s <= 4 ? small + c : small)) {
        counts[s] = c;
        return true;
      }
    }
    return false;
  };
  return search(0, 0, 0, 0) ? counts : null;
}

/**
 * Whether a histogram exists with integer counts c_s: Σc = K, Σ s·c = A, sizes in the window,
 * c_s <= avail(s) and c3 + c4 <= smallCap.
 * @param {number} area
 * @param {number} k
 * @param {SizeOptions} [o]
 * @returns {boolean}
 */
export function histogramFeasible(area, k, o) {
  return solveHistogram(area, k, resolveSizes(area, k, o)) !== null;
}

/**
 * How `pieceCountRange` reaches its counts, for explanations: target mid = base · (A / 60)^0.28 (capped from Hell 1),
 * spread ±max(0.75, 6 % · mid), clamped to [kMin(A), min(kMax(A), cap)], then only histogram-feasible counts.
 * @param {string} levelId A valid level id (throws otherwise).
 * @param {number} area
 * @returns {{ base: number, referenceArea: number, exponent: number, cap: number, mid: number, spread: number,
 *   low: number, high: number, from: number, to: number, counts: number[] } | null} null when the level is not offered.
 */
export function pieceCountPlan(levelId, area) {
  const lv = level(levelId);
  requirePositiveInteger('area', area);
  if (area < lv.areas[0] || area > lv.areas[1]) return null;
  const base = K60[lv.index];
  const cap = lv.index >= HELL_1_INDEX ? K_CAP_FROM_HELL_1[lv.index - HELL_1_INDEX] : Infinity;
  const mid = Math.min(base * (area / 60) ** COUNT_EXPONENT, cap);
  const spread = Math.max(0.75, 0.06 * mid);
  const low = kMin(area);
  const high = Math.min(kMax(area), cap);
  let from = Math.max(Math.round(mid - spread), low);
  let to = Math.min(Math.round(mid + spread), high);
  if (from > to) from = to = Math.min(Math.max(Math.round(mid), low), high);
  const counts = [];
  for (let k = from; k <= to; k++) {
    if (k >= 1 && histogramFeasible(area, k)) counts.push(k);
  }
  return { base, referenceArea: 60, exponent: COUNT_EXPONENT, cap, mid, spread, low, high, from, to, counts };
}

/**
 * Feasible piece counts for a level on a board area; null when the level is not offered there.
 * @param {string} levelId A valid level id (throws otherwise); non-generatable Hell levels give null.
 * @param {number} area
 * @returns {number[] | null}
 */
export function pieceCountRange(levelId, area) {
  return pieceCountPlan(levelId, area)?.counts ?? null;
}

/**
 * Deterministic piece-size plan: the smallest feasible histogram, grown one smallest eligible
 * piece at a time to area A, then 3K random ±1 transfers, then a shuffle. Null if infeasible.
 * @param {number} area
 * @param {number} k
 * @param {Rng} rng
 * @param {SizeOptions} [o]
 * @returns {number[] | null}
 */
export function planSizes(area, k, rng, o) {
  const cfg = resolveSizes(area, k, o);
  const witness = solveHistogram(area, k, cfg);
  if (!witness) return null;
  const { lo, hi, avail, smallCap } = cfg;
  /** @type {number[]} */
  const counts = new Array(hi + 2).fill(0);
  /** @type {number[]} */
  const sizes = [];
  let small = 0;
  for (let s = lo; s <= hi && sizes.length < k; s++) {
    const take = Math.min(k - sizes.length, avail(s), s <= 4 ? smallCap - small : Infinity);
    for (let c = 0; c < take; c++) sizes.push(s);
    counts[s] = take;
    if (s <= 4) small += take;
  }

  let total = sizes.reduce((sum, s) => sum + s, 0);
  while (total < area) {
    let smallest = Infinity;
    /** @type {number[]} */
    let candidates = [];
    for (let i = 0; i < k; i++) {
      const s = sizes[i];
      if (s >= hi || counts[s + 1] >= avail(s + 1) || s > smallest) continue;
      if (s < smallest) {
        smallest = s;
        candidates = [];
      }
      candidates.push(i);
    }
    if (candidates.length === 0) {
      // Growth can dead-end on exhausted shapes although a histogram exists: continue from the witness.
      sizes.length = 0;
      counts.fill(0);
      for (let s = lo; s <= hi; s++) {
        for (let c = 0; c < witness[s]; c++) sizes.push(s);
        counts[s] = witness[s];
      }
      break;
    }
    const i = candidates[candidates.length === 1 ? 0 : rng.int(candidates.length)];
    counts[sizes[i]]--;
    counts[++sizes[i]]++;
    total++;
  }

  for (let t = 0; t < 3 * k && k > 1; t++) {
    const i = rng.int(k);
    let j = rng.int(k - 1);
    if (j >= i) j++;
    const up = sizes[i] + 1;
    const down = sizes[j] - 1;
    if (up > hi || down < lo) continue;
    counts[sizes[i]]--;
    counts[sizes[j]]--;
    counts[up]++;
    counts[down]++;
    if (counts[up] <= avail(up) && counts[down] <= avail(down) && counts[3] + counts[4] <= smallCap) {
      sizes[i] = up;
      sizes[j] = down;
    } else {
      counts[up]--;
      counts[down]--;
      counts[sizes[i]]++;
      counts[sizes[j]]++;
    }
  }
  return rng.shuffle(sizes);
}
