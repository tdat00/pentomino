// @ts-check
// Difficulty level ladder (design §7.4) and frozen per-level board-area availability (§7.5).
// Pure data and arithmetic; no clocks, randomness or browser APIs.

/**
 * @typedef {object} Level
 * @property {string} id
 * @property {string} label
 * @property {number} index Very easy 0 … nightmare 6, hell-n 6 + n.
 * @property {number} min Inclusive lower score bound.
 * @property {number} max Exclusive upper score bound (may be Infinity).
 * @property {number} share Initial clue share.
 * @property {[number, number]} areas Inclusive offered board area interval; [Infinity, Infinity] = never generated.
 */

const NAMED = ['very-easy', 'easy', 'normal', 'hard', 'expert', 'master', 'nightmare'];
const NAMED_LABELS = ['Very easy', 'Easy', 'Normal', 'Hard', 'Expert', 'Master', 'Nightmare'];
const SHARES = [0.62, 0.54, 0.46, 0.38, 0.3, 0.22, 0.14, 0.1, 0.06, 0.04, 0.04];
const GENERIC_HELL_SHARE = 0.04;
const BAND_RATIO = 1.45;
/** @type {ReadonlyArray<readonly [number, number]>} */
const AREAS = [
  [30, 87],
  [32, 215],
  [36, 348],
  [41, Infinity],
  [50, Infinity],
  [59, Infinity],
  [81, Infinity],
  [164, Infinity],
  [266, Infinity],
  [450, Infinity],
  [744, Infinity],
];
const HELL_ID = /^hell-([1-9][0-9]*)$/;

/**
 * Lower score edge of level L: e0 = 0, eL = round(10 · 1.45^(L − 1.5)).
 * @param {number} index
 * @returns {number}
 */
export function bandEdge(index) {
  return index === 0 ? 0 : Math.round(10 * BAND_RATIO ** (index - 1.5));
}

/** @type {Map<number, Readonly<Level>>} */
const cache = new Map();

/**
 * @param {number} index Non-negative safe integer with a finite lower edge.
 * @returns {Readonly<Level>}
 */
function levelAt(index) {
  const known = cache.get(index);
  if (known) return known;
  const min = bandEdge(index);
  if (!Number.isFinite(min)) throw new RangeError('level is beyond the representable score range');
  const hell = index - 6;
  const areas = index < AREAS.length ? AREAS[index] : [Infinity, Infinity];
  /** @type {Readonly<Level>} */
  const made = Object.freeze({
    id: index < NAMED.length ? NAMED[index] : `hell-${hell}`,
    label: index < NAMED.length ? NAMED_LABELS[index] : `Hell ${hell}`,
    index,
    min,
    max: bandEdge(index + 1),
    share: index < SHARES.length ? SHARES[index] : GENERIC_HELL_SHARE,
    areas: Object.freeze([areas[0], areas[1]]),
  });
  cache.set(index, made);
  return made;
}

/**
 * Level by id; `hell-n` (positive integer, no leading zeros) is generated on demand.
 * @param {string} id
 * @returns {Readonly<Level>}
 */
export function level(id) {
  if (typeof id !== 'string') throw new TypeError('level id must be a string');
  const named = NAMED.indexOf(id);
  if (named >= 0) return levelAt(named);
  const match = HELL_ID.exec(id);
  const n = match ? Number(match[1]) : NaN;
  if (!Number.isSafeInteger(n)) throw new RangeError(`unknown level id: ${id}`);
  return levelAt(6 + n);
}

/**
 * Level whose band contains the score: max{L : eL <= score}.
 * @param {number} score Finite and non-negative.
 * @returns {Readonly<Level>}
 */
export function levelForScore(score) {
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 0) {
    throw new RangeError('score must be a finite non-negative number');
  }
  let index = score < bandEdge(1) ? 0 : Math.max(1, Math.floor(Math.log(score / 10) / Math.log(BAND_RATIO) + 1.5));
  while (bandEdge(index + 1) <= score) index++;
  while (index > 0 && bandEdge(index) > score) index--;
  return levelAt(index);
}

/**
 * Levels offered for a board of the given active area, ascending.
 * @param {number} area Non-negative integer.
 * @returns {Readonly<Level>[]}
 */
export function offeredLevels(area) {
  if (!Number.isInteger(area) || area < 0) throw new RangeError('area must be a non-negative integer');
  const offered = [];
  for (let i = 0; i < AREAS.length; i++) {
    if (area >= AREAS[i][0] && area <= AREAS[i][1]) offered.push(levelAt(i));
  }
  return offered;
}
