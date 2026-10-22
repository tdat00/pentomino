// @ts-check
// Small, solved clue recipes for later integration fixtures: the classic twelve
// pentominoes tiling a 10 x 6 rectangle, and per level the clued piece IDs of a
// puzzle that `selectClues` accepted in `require` mode (certificate `unique`).

/** @typedef {import('../../core/engine/types.js').Pose} Pose */

export const RECIPE_BOARD_ROWS = Object.freeze(Array(6).fill('#'.repeat(10)));

/** `[piece, x, y, turn, mirrored]` of the canonical first tiling. */
const WITNESS_ROWS = [
  ['I', 3, 0, 0, 0], ['L', 0, 0, 3, 1], ['Y', 1, 4, 2, 1], ['P', 4, 3, 1, 0], ['U', 8, 0, 1, 0], ['V', 7, 3, 2, 0],
  ['T', 6, 1, 0, 0], ['N', 0, 2, 1, 0], ['F', 2, 2, 0, 1], ['W', 4, 1, 0, 0], ['Z', 6, 3, 1, 0], ['X', 1, 0, 0, 0],
];

/** @returns {Pose[]} */
export function recipeWitness() {
  return WITNESS_ROWS.map(([piece, x, y, turn, mirrored]) => ({
    piece: /** @type {string} */ (piece),
    x: /** @type {number} */ (x),
    y: /** @type {number} */ (y),
    turn: /** @type {0 | 1 | 2 | 3} */ (turn),
    mirrored: mirrored === 1,
  }));
}

/** Clued piece IDs with the expected score; each puzzle is unique and unsaturated. */
export const CLUE_RECIPES = Object.freeze({
  'very-easy': { pieces: 'IYPUVNFWZ', score: 6 },
  easy: { pieces: 'IPUVTNFX', score: 8 },
  normal: { pieces: 'LYVTNWX', score: 12 },
  hard: { pieces: 'LUNFX', score: 22 },
  expert: { pieces: 'ILWZ', score: 25 },
  master: { pieces: 'YW', score: 43 },
});
