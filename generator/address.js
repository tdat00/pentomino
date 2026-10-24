// @ts-check
// The step settings live in the address, so a link shares them and a reload restores them. `preset` only picks the
// step 1 list entry (`cells` is the board key); the set on show is not named but made again from the settings and `seed`.

import { MAX_SIDE, boardFromKey, boardKey } from '../core/engine/board.js';
import { LISTED_LEVEL_IDS, MIN_EDIT_SIDE, PRESET_IDS, showSetBySeed, validSeed, withBoard } from './state.js';

/** @typedef {import('../core/engine/types.js').Board} Board */
/** @typedef {import('./state.js').GeneratorState} GeneratorState */

/** The parameters this module owns; `step` is not one of them. */
export const ADDRESS_PARAMS = Object.freeze(['preset', 'angle', 'cells', 'level', 'seed', 'unique']);

/**
 * @param {GeneratorState} state
 * @returns {Record<string, string>}
 */
export function addressParams(state) {
  const { board } = state;
  /** @type {Record<string, string>} */
  const params = {
    preset: state.presetId,
    angle: String(state.rotation),
    cells: boardKey(board),
    level: state.levelId,
  };
  const typed = state.keepSeed ? validSeed(state.seedText) : null;
  const seed = state.set !== null && state.setSeed !== null ? state.setSeed : typed;
  if (seed !== null) {
    params.seed = seed;
  }
  if (state.uniqueness === 'require') {
    // Not a step 2 setting, but it changes the set a seed makes.
    params.unique = '1';
  }
  return params;
}

/**
 * @param {string} href
 * @param {Record<string, string>} params
 * @returns {string} The address with exactly these settings; `step`, other parameters and the hash stay.
 */
export function withAddress(href, params) {
  const url = new URL(href);
  for (const name of ADDRESS_PARAMS) {
    url.searchParams.delete(name);
  }
  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, value);
  }
  return url.href;
}

/**
 * Parts of the address that are missing or invalid leave the state as it was.
 * @param {GeneratorState} state
 * @param {string} search
 * @returns {{ state: GeneratorState, seed: string | null }} `seed` is the seed the address names, if any; the state shows
 *   the set made with it when this browser still has it, and the caller makes it again otherwise.
 */
export function applyAddress(state, search) {
  const query = new URLSearchParams(search);
  /** @param {string} name @returns {number | null} */
  const whole = (name) => {
    const value = query.get(name);
    return value !== null && /^\d{1,3}$/.test(value) ? Number(value) : null;
  };
  const presetValue = query.get('preset') ?? '';
  const presetId = PRESET_IDS.includes(presetValue) ? presetValue : null;
  /** @type {Board | null} */
  let board = null;
  const cells = query.get('cells');
  if (cells !== null) {
    try {
      board = boardFromKey(cells);
    } catch {
      board = null;
    }
  }
  if (board !== null && (board.width < MIN_EDIT_SIDE || board.height < MIN_EDIT_SIDE || board.width > MAX_SIDE || board.height > MAX_SIDE)) {
    board = null;
  }
  const angle = whole('angle');
  const rotation = angle !== null && angle < 360 && angle % 45 === 0 ? angle : null;
  const levelValue = query.get('level') ?? '';
  const levelId = LISTED_LEVEL_IDS.includes(levelValue) ? levelValue : null;
  const seedValue = query.get('seed');
  const seed = seedValue === null ? null : validSeed(seedValue);

  let next = state;
  if (presetId !== null) {
    next = { ...next, presetId };
  }
  if (levelId !== null) {
    next = { ...next, levelId };
  }
  if (seed !== null) {
    next = { ...next, seedText: seed, keepSeed: true };
  }
  if (ADDRESS_PARAMS.some((name) => query.has(name))) {
    // The link carries settings, and an absent `unique` means "any": the sender's choice, not what was saved here.
    next = { ...next, uniqueness: query.get('unique') === '1' ? 'require' : 'any' };
  }
  next = withBoard(next, board ?? next.board, rotation ?? next.rotation);
  if (seed !== null) {
    next = showSetBySeed(next, seed) ?? next;
  }
  return { state: next, seed };
}
