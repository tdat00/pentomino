// @ts-check
// Piece presentation data: deterministic colors, spreadsheet-style labels,
// fill-pattern identifiers and readable text colors. No DOM or preferences.

/** Trubetskoy's 20 distinct colors, used in id order. */
export const BASE_COLORS = Object.freeze([
  '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
  '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabed4',
  '#469990', '#dcbeff', '#9a6324', '#fffac8', '#800000',
  '#aaffc3', '#808000', '#ffd8b1', '#000075', '#a9a9a9',
]);

const MAX_LABEL_LENGTH = 4;
const PATTERNS = /** @type {const} */ (['dots', 'hlines', 'vlines']);

/**
 * @param {number} index
 * @returns {number}
 */
function checkedIndex(index) {
  if (!Number.isSafeInteger(index) || index < 0) {
    throw new RangeError(`piece index must be a non-negative integer, got ${index}`);
  }
  return index;
}

/**
 * @param {number} h degrees
 * @param {number} s 0..1
 * @param {number} l 0..1
 * @returns {string}
 */
function hslToHex(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  /** @param {number} n */
  const channel = (n) => {
    const k = (n + h / 30) % 12;
    const v = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(v * 255).toString(16).padStart(2, '0');
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

/**
 * @param {number} index
 * @returns {string} `#rrggbb`
 */
export function colorFor(index) {
  checkedIndex(index);
  if (index < BASE_COLORS.length) {
    return BASE_COLORS[index];
  }
  return hslToHex((index * 137.508) % 360, 0.65, index % 2 === 0 ? 0.45 : 0.65);
}

/**
 * Spreadsheet numbering: 0 = A, 25 = Z, 26 = AA, 701 = ZZ, 702 = AAA.
 * Labels longer than four characters are rejected.
 * @param {number} index
 * @returns {string}
 */
export function labelFor(index) {
  let n = checkedIndex(index) + 1;
  let label = '';
  while (n > 0) {
    n -= 1;
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26);
  }
  if (label.length > MAX_LABEL_LENGTH) {
    throw new RangeError(`label for index ${index} would exceed ${MAX_LABEL_LENGTH} characters`);
  }
  return label;
}

/**
 * Pieces beyond the 20 base colors get a pattern only in sets larger than 20.
 * @param {number} index
 * @param {number} k piece count of the set
 * @returns {'none' | 'dots' | 'hlines' | 'vlines'}
 */
export function patternFor(index, k) {
  checkedIndex(index);
  if (k <= BASE_COLORS.length || index < BASE_COLORS.length) {
    return 'none';
  }
  return PATTERNS[Math.floor(index / 20) % 3];
}

/**
 * Black or white, whichever has the higher WCAG contrast against the color.
 * @param {string} hex `#rrggbb`
 * @returns {'#000000' | '#ffffff'}
 */
export function textColorFor(hex) {
  if (typeof hex !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(hex)) {
    throw new RangeError(`color must be #rrggbb, got ${String(hex)}`);
  }
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const contrastWithBlack = (luminance + 0.05) / 0.05;
  const contrastWithWhite = 1.05 / (luminance + 0.05);
  return contrastWithBlack >= contrastWithWhite ? '#000000' : '#ffffff';
}
