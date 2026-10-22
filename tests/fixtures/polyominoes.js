// @ts-check
// Frozen polyomino fixtures shared by geometry, solver and pack tests.

/** @typedef {import('../../core/engine/types.js').Piece} Piece */

/** Cells are canonical: the numerically smallest normalized variant (see canonicalKey). */
/** @type {readonly Piece[]} */
export const CLASSIC_PENTOMINOES = Object.freeze([
  { id: 'F', label: 'F', color: '#e6194b', cells: [[0, 0], [1, 0], [1, 1], [2, 1], [1, 2]] },
  { id: 'I', label: 'I', color: '#3cb44b', cells: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]] },
  { id: 'L', label: 'L', color: '#ffe119', cells: [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1]] },
  { id: 'N', label: 'N', color: '#4363d8', cells: [[0, 0], [1, 0], [2, 0], [2, 1], [3, 1]] },
  { id: 'P', label: 'P', color: '#f58231', cells: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1]] },
  { id: 'T', label: 'T', color: '#911eb4', cells: [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2]] },
  { id: 'U', label: 'U', color: '#42d4f4', cells: [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1]] },
  { id: 'V', label: 'V', color: '#f032e6', cells: [[0, 0], [1, 0], [2, 0], [0, 1], [0, 2]] },
  { id: 'W', label: 'W', color: '#bfef45', cells: [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]] },
  { id: 'X', label: 'X', color: '#fabed4', cells: [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]] },
  { id: 'Y', label: 'Y', color: '#469990', cells: [[0, 0], [1, 0], [2, 0], [3, 0], [1, 1]] },
  { id: 'Z', label: 'Z', color: '#dcbeff', cells: [[0, 0], [1, 0], [1, 1], [1, 2], [2, 2]] },
]);

/** Distinct orientation counts (1, 2, 4 or 8) of the classic pentominoes. */
export const CLASSIC_ORIENTATION_COUNTS = Object.freeze({
  F: 8, I: 2, L: 8, N: 8, P: 8, T: 4, U: 4, V: 4, W: 4, X: 1, Y: 8, Z: 4,
});
