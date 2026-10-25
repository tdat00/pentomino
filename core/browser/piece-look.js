// @ts-check
// How a piece looks, on screen and on a black-and-white print. Display only: the ids, labels and colours of a set
// (core/engine/palette.js, stored in packs) do not change.

import { BASE_COLORS } from '../engine/palette.js';

/** @typedef {'none' | 'circle' | 'square' | 'disc'} LabelMark */

const MARKS = /** @type {const} */ (['none', 'circle', 'square', 'disc']);

/**
 * The display colour of each base colour: the same family of hues, at light, dark and middle grey levels in turn, so
 * neighbouring letters differ on a black-and-white print too.
 * Luma (0.299 R + 0.587 G + 0.114 B) light > 170, middle 110-160, dark < 95.
 */
const DISPLAY_COLORS = Object.freeze([
  '#ff8a80', '#1b7a2f', '#b38f00', '#90b4ff', '#943a00',
  '#9b59d0', '#7fe3f7', '#9c1a8f', '#7fae1e', '#ffc2d6',
  '#1f6b64', '#9479cc', '#e0b88a', '#3d4f63', '#c25467',
  '#b6f5cf', '#555f00', '#cf7d3c', '#1a237e', '#8c8c8c',
]);

const BY_BASE = new Map(BASE_COLORS.map((hex, i) => [hex.toLowerCase(), DISPLAY_COLORS[i]]));

/**
 * @param {string} color `#rrggbb` as stored with the piece.
 * @returns {string} The colour to draw: the remapped one for a base colour, otherwise the stored one.
 */
export function displayColor(color) {
  return BY_BASE.get(String(color).toLowerCase()) ?? color;
}

/**
 * Grey level a printer gives a colour, 0 (black) to 255 (white).
 * @param {string} hex `#rrggbb`
 * @returns {number}
 */
export function luma(hex) {
  const value = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#808080';
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Letter colour and a halo of the opposite colour, so the letter stays readable on any grey.
 * @param {string} fill `#rrggbb` as drawn.
 * @returns {{ ink: string, halo: string }}
 */
export function inkFor(fill) {
  return luma(fill) >= 140 ? { ink: '#000000', halo: '#ffffff' } : { ink: '#ffffff', halo: '#000000' };
}

/**
 * The one character shown for a label, and its mark.
 * @param {string} label
 * @returns {{ char: string, mark: LabelMark }}
 */
export function pieceGlyph(label) {
  const text = String(label);
  if (/^[A-Z]{2,}$/.test(text)) {
    // Spreadsheet numbering: A..Z, AA..AZ, BA..BZ, ...; the round of the alphabet picks the mark (AA..AZ circle,
    // BA..BZ square, CA..CZ disc), and the label shows only its last letter.
    let n = 0;
    for (const ch of text) {
      n = n * 26 + (ch.charCodeAt(0) - 64);
    }
    const index = n - 1;
    const round = Math.floor(index / 26);
    if (round < MARKS.length) {
      return { char: String.fromCharCode(65 + (index % 26)), mark: MARKS[round] };
    }
  }
  return { char: text, mark: 'none' };
}

/**
 * The label as text (messages, names): the letter, enclosed the way its mark draws it.
 * @param {string} label
 * @returns {string}
 */
export function pieceLabelText(label) {
  const { char, mark } = pieceGlyph(label);
  if (mark === 'none' || !/^[A-Z]$/.test(char)) {
    return char;
  }
  const offset = char.charCodeAt(0) - 65;
  const base = mark === 'circle' ? 0x24b6 : mark === 'square' ? 0x1f130 : 0x1f150;
  return String.fromCodePoint(base + offset);
}
