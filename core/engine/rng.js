// @ts-check
// Deterministic xoshiro128** streams keyed by SHA-256 of the normalized seed text.
// Pure except randomSeedText, the one explicit entropy source.
import { sha256Hex } from './hash.js';

export const RNG_ID = 'xoshiro128ss-v1';
export const SEED_SCHEME = 'seed-sha256-v1';

const SEED_PREFIX = 'pentomino-seed-v1:';
const MAX_SEED_CODE_POINTS = 64;
const FRIENDLY_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const FRIENDLY_LENGTH = 12;
const ZERO_STATE_SUBSTITUTE = [0x9e3779b9, 0x243f6a88, 0xb7e15162, 0x6a09e667];
const TWO_POW_32 = 4294967296;

/**
 * @typedef {object} Rng
 * @property {() => number} nextU32
 * @property {(n: number) => number} int Uniform integer in [0, n), 1 <= n <= 2^32.
 * @property {() => number} float Uniform float in [0, 1).
 * @property {<T>(a: T[]) => T[]} shuffle In-place Fisher–Yates; returns the same array.
 * @property {<T>(a: readonly T[]) => T} pick
 * @property {(label: string) => Rng} derive Independent stream; ignores parent consumption.
 */

/**
 * Trims, NFC-normalizes and validates visible seed text (1–64 code points, case-sensitive).
 * @param {string} text
 * @returns {string}
 */
export function normalizeSeedText(text) {
  const normalized = normalizeUnbounded(text);
  if ([...normalized].length > MAX_SEED_CODE_POINTS) {
    throw new RangeError(`seed text must be at most ${MAX_SEED_CODE_POINTS} characters`);
  }
  return normalized;
}

/**
 * Normalization without the UI length limit, for internal batch seeds.
 * @param {string} text
 * @returns {string}
 */
function normalizeUnbounded(text) {
  if (typeof text !== 'string') throw new TypeError('seed text must be a string');
  const normalized = text.trim().normalize('NFC');
  if (normalized.length === 0) throw new RangeError('seed text must not be empty');
  return normalized;
}

/**
 * Internal seed of one batch: setSeed + "#" + batchIndex. Not subject to the UI length limit.
 * @param {string} setSeed A seed already accepted by normalizeSeedText.
 * @param {number} batchIndex Positive safe integer.
 * @returns {string}
 */
export function batchSeedFor(setSeed, batchIndex) {
  if (normalizeSeedText(setSeed) !== setSeed) throw new RangeError('set seed must already be normalized');
  if (!Number.isSafeInteger(batchIndex) || batchIndex < 1) {
    throw new RangeError('batch index must be a positive safe integer');
  }
  return `${setSeed}#${batchIndex}`;
}

/**
 * @param {number} x
 * @param {number} k
 * @returns {number}
 */
const rotl = (x, k) => ((x << k) | (x >>> (32 - k))) >>> 0;

/**
 * @param {readonly number[]} initial Four uint32 words; an all-zero state is replaced.
 * @param {(label: string) => Rng} derive
 * @returns {Rng}
 */
function makeRng(initial, derive) {
  let s0 = initial[0] >>> 0;
  let s1 = initial[1] >>> 0;
  let s2 = initial[2] >>> 0;
  let s3 = initial[3] >>> 0;
  if ((s0 | s1 | s2 | s3) === 0) [s0, s1, s2, s3] = ZERO_STATE_SUBSTITUTE;

  const nextU32 = () => {
    const result = Math.imul(rotl(Math.imul(s1, 5), 7), 9) >>> 0;
    const t = (s1 << 9) >>> 0;
    s2 = (s2 ^ s0) >>> 0;
    s3 = (s3 ^ s1) >>> 0;
    s1 = (s1 ^ s2) >>> 0;
    s0 = (s0 ^ s3) >>> 0;
    s2 = (s2 ^ t) >>> 0;
    s3 = rotl(s3, 11);
    return result;
  };

  /** @param {number} n */
  const int = (n) => {
    if (!Number.isInteger(n) || n < 1 || n > TWO_POW_32) {
      throw new RangeError('int(n) requires an integer 1 <= n <= 2^32');
    }
    const limit = Math.floor(TWO_POW_32 / n) * n;
    let x = nextU32();
    while (x >= limit) x = nextU32();
    return x % n;
  };

  return {
    nextU32,
    int,
    float: () => nextU32() / TWO_POW_32,
    shuffle(a) {
      for (let i = a.length - 1; i > 0; i--) {
        const j = int(i + 1);
        const tmp = a[i];
        a[i] = a[j];
        a[j] = tmp;
      }
      return a;
    },
    pick(a) {
      if (a.length === 0) throw new RangeError('pick requires a non-empty array');
      return a[int(a.length)];
    },
    derive,
  };
}

/**
 * @param {string} seed Complete normalized semantic seed.
 * @param {string} labelPath
 * @returns {Rng}
 */
function streamFor(seed, labelPath) {
  const digest = sha256Hex(`${SEED_PREFIX}${seed}${labelPath ? `\u0000${labelPath}` : ''}`);
  const state = [0, 1, 2, 3].map((i) => parseInt(digest.slice(i * 8, i * 8 + 8), 16));
  return makeRng(state, (label) => {
    if (typeof label !== 'string') throw new TypeError('label must be a string');
    return streamFor(seed, `${labelPath}/${label}`);
  });
}

/**
 * Stream for a set seed or internal batch seed; the full seed is hashed with no length limit.
 * @param {string} seedText
 * @param {string} [label]
 * @returns {Rng}
 */
export function createRng(seedText, label = '') {
  if (typeof label !== 'string') throw new TypeError('label must be a string');
  return streamFor(normalizeUnbounded(seedText), label);
}

/**
 * Test-only: a stream with an explicit state. It cannot derive children.
 * @param {readonly number[]} state Four uint32 words.
 * @returns {Rng}
 */
export function createRngFromState(state) {
  if (state.length !== 4) throw new RangeError('state must have four words');
  return makeRng(state, () => {
    throw new Error('a state-constructed Rng has no seed to derive from');
  });
}

/**
 * Friendly random seed "XXXX-XXXX-XXXX" from crypto.getRandomValues (never Math.random).
 * @returns {string}
 */
export function randomSeedText() {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(FRIENDLY_LENGTH));
  let text = '';
  for (let i = 0; i < FRIENDLY_LENGTH; i++) {
    if (i > 0 && i % 4 === 0) text += '-';
    text += FRIENDLY_ALPHABET[bytes[i] & 31];
  }
  return text;
}
