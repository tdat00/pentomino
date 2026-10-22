// @ts-check
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  activeCells,
  activeCount,
  boardFromRows,
  boardToRows,
  classifyBlocked,
  normalizedActive,
  preset,
  rectangle,
  regions,
  symmetries,
  trimMargins,
  validateForGeneration,
} from '../core/engine/board.js';

/** @typedef {import('../core/engine/types.js').Board} Board */

const heartCount = (/** @type {number} */ n, round = false) => activeCount(preset('heart', { n, roundLobes: round }).board);

test('boardFromRows and boardToRows round-trip and reject malformed input', () => {
  const rows = ['#.#', '###'];
  const board = boardFromRows(rows);
  assert.equal(board.width, 3);
  assert.equal(board.height, 2);
  assert.deepEqual([...board.active], [1, 0, 1, 1, 1, 1]);
  assert.deepEqual(boardToRows(board), rows);
  for (const bad of [[], [''], ['##', '#'], ['#x'], ['#.', '. '], /** @type {any} */ ('##'), /** @type {any} */ ([1])]) {
    assert.throws(() => boardFromRows(bad), RangeError);
  }
});

test('preset default sizes, counts and rotations', () => {
  const cases = /** @type {const} */ ([
    ['rectangle', 60, 0, 10, 6],
    ['heart', 75, 45, 10, 10],
    ['diamond', 64, 45, 8, 8],
    ['cross', 45, 0, 9, 9],
    ['ring', 60, 0, 8, 8],
  ]);
  for (const [id, count, rotation, w, h] of cases) {
    const { board, rotation: r } = preset(id, {});
    assert.equal(activeCount(board), count, id);
    assert.equal(r, rotation, id);
    assert.equal(board.width, w);
    assert.equal(board.height, h);
  }
  assert.equal(heartCount(10, true), 73);
  assert.equal(preset('heart', { n: 10, roundLobes: true }).board.active[0], 0);
});

test('heart cell counts follow 3/4 N squared', () => {
  const expected = new Map([[8, 48], [12, 108], [14, 147], [22, 363], [24, 432], [26, 507]]);
  for (const [n, count] of expected) {
    assert.equal(heartCount(n), count);
  }
  assert.deepEqual(boardToRows(preset('heart', { n: 4 }).board), ['##..', '##..', '####', '####']);
});

test('preset parameters are validated', () => {
  assert.throws(() => preset('heart', { n: 9 }), RangeError);
  assert.throws(() => preset('ring', { w: 5, h: 8 }), RangeError);
  assert.throws(() => preset('rectangle', { w: 0, h: 3 }), RangeError);
  assert.throws(() => preset('diamond', { n: 2.5 }), RangeError);
  assert.throws(() => preset(/** @type {any} */ ('star'), {}), RangeError);
  assert.equal(activeCount(preset('ring', { w: 6, h: 6 }).board), 32);
  const odd = preset('ring', { w: 11, h: 7 }).board;
  assert.equal(odd.active[3 * 11 + 4], 0);
  assert.equal(odd.active[3 * 11 + 6], 1);
  assert.deepEqual(boardToRows(preset('cross', { n: 5 }).board), ['.##..', '#####', '#####', '.##..', '.##..']);
});

test('regions use four neighbours only', () => {
  const diagonal = boardFromRows(['#.', '.#']);
  assert.deepEqual(regions(diagonal), [[0], [3]]);
  assert.deepEqual(regions(boardFromRows(['##', '#.'])), [[0, 1, 2]]);
  assert.deepEqual(regions(boardFromRows(['..'])), []);
});

test('classifyBlocked separates exterior cells from enclosed holes', () => {
  const ring = preset('ring', {}).board;
  const classes = classifyBlocked(ring);
  assert.equal(classes[3 * 8 + 3], 2);
  assert.equal(classes[0], 0);
  const heart = preset('heart', {}).board;
  const heartClasses = classifyBlocked(heart);
  assert.equal(heartClasses[0 * 10 + 9], 1);
  assert.equal(heartClasses.filter((v) => v === 2).length, 0);
  assert.equal(heartClasses.filter((v) => v === 1).length, 25);
  // A blocked pocket touching the edge is exterior; the same pocket sealed is a hole.
  assert.deepEqual([...classifyBlocked(boardFromRows(['#.#', '###']))], [0, 1, 0, 0, 0, 0]);
  assert.deepEqual([...classifyBlocked(boardFromRows(['###', '#.#', '###']))], [0, 0, 0, 0, 2, 0, 0, 0, 0]);
  // The centre is sealed by its four orthogonal neighbours; corner cells reach the outside.
  assert.deepEqual([...classifyBlocked(boardFromRows(['.#.', '#.#', '.#.']))], [1, 0, 1, 0, 2, 0, 1, 0, 1]);
  assert.equal(classifyBlocked({ width: 0, height: 0, active: new Uint8Array(0) }).length, 0);
});

test('normalizedActive and trimMargins keep authored coordinates explicit', () => {
  const padded = boardFromRows(['....', '.##.', '.#..', '....']);
  const before = [...padded.active];
  const analysis = normalizedActive(padded);
  assert.deepEqual(boardToRows(analysis.board), ['##', '#.']);
  assert.deepEqual([analysis.dx, analysis.dy], [1, 1]);
  assert.deepEqual([...padded.active], before);
  assert.equal(padded.width, 4);
  assert.deepEqual(boardToRows(trimMargins(padded)), ['##', '#.']);
  assert.deepEqual(boardToRows(trimMargins(boardFromRows(['##', '##']))), ['##', '##']);
});

test('all-blocked editor state is safe', () => {
  const empty = boardFromRows(['...', '...']);
  const analysis = normalizedActive(empty);
  assert.deepEqual([analysis.board.width, analysis.board.height, analysis.dx, analysis.dy], [0, 0, 0, 0]);
  assert.equal(analysis.board.active.length, 0);
  assert.deepEqual(symmetries(empty), [0]);
  const trimmed = trimMargins(empty);
  assert.deepEqual(boardToRows(trimmed), ['...', '...']);
  assert.notEqual(trimmed.active, empty.active);
  assert.deepEqual(regions(empty), []);
  assert.equal(activeCells(empty).length, 0);
  const { errors } = validateForGeneration(empty, 484);
  assert.ok(errors.some((e) => e.code === 'board-too-few-cells'));
});

test('symmetry counts, including asymmetric margins', () => {
  assert.deepEqual(symmetries(rectangle(10, 6)), [0, 2, 4, 6]);
  assert.equal(symmetries(rectangle(8, 8)).length, 8);
  assert.deepEqual(symmetries(preset('heart', {}).board), [0, 5]);
  assert.equal(symmetries(preset('cross', {}).board).length, 8);
  assert.equal(symmetries(preset('ring', {}).board).length, 8);
  assert.deepEqual(symmetries(boardFromRows(['##.', '#..'])), [0, 7]);
  assert.deepEqual(symmetries(boardFromRows(['###', '#..', '#..', '#..'])), [0]);
  assert.deepEqual(symmetries(boardFromRows(['#.#', '###'])), [0, 4]);
  assert.deepEqual(symmetries(boardFromRows(['###', '#..', '..#'])), [0]);

  const heartRows = boardToRows(preset('heart', {}).board);
  const padded = boardFromRows([
    '.'.repeat(15),
    ...heartRows.map((row) => `...${row}..`),
    '.'.repeat(15),
    '.'.repeat(15),
    '.'.repeat(15),
  ]);
  assert.deepEqual(symmetries(padded), [0, 5]);
  assert.equal(symmetries(preset('rectangle', { w: 4, h: 4 }).board).length, 8);
  const lopsided = boardFromRows(['#..', '#..', '#..', '...', '...']);
  assert.deepEqual(symmetries(lopsided), [0, 2, 4, 6]);
});

/**
 * @param {Board} board
 * @param {number} cap
 * @returns {string[]}
 */
const errorCodes = (board, cap = 484) => validateForGeneration(board, cap).errors.map((e) => e.code);

test('generation validation: area, cap, side and connectivity', () => {
  assert.deepEqual(errorCodes(rectangle(10, 6)), []);
  assert.deepEqual(errorCodes(rectangle(5, 5)), ['board-too-few-cells']);
  assert.deepEqual(errorCodes(rectangle(5, 6)), []);
  assert.deepEqual(errorCodes(rectangle(22, 22)), []);
  assert.deepEqual(errorCodes(rectangle(22, 22), 360), ['board-too-many-cells']);
  assert.deepEqual(errorCodes(rectangle(22, 22), 484), []);
  assert.deepEqual(errorCodes(rectangle(23, 22), 484), ['board-too-many-cells']);
  assert.deepEqual(errorCodes(rectangle(33, 1), 484), ['board-side-too-large']);
  assert.deepEqual(errorCodes(rectangle(32, 20), 484), ['board-too-many-cells']);
  assert.deepEqual(errorCodes(rectangle(32, 15), 484), []);

  const split = boardFromRows(['######.#', '######.#', '######.#', '######.#', '######.#']);
  const result = validateForGeneration(split, 484);
  assert.deepEqual(result.errors.map((e) => e.code), ['board-disconnected']);
  assert.deepEqual(result.errors[0].cells, [[7, 0], [7, 1], [7, 2], [7, 3], [7, 4]]);

  const diagonalOnly = boardFromRows(['######....', '######....', '######....', '......####', '......####', '......####']);
  assert.deepEqual(errorCodes(diagonalOnly), ['board-disconnected']);
});

test('generation validation: side errors name the offending dimension', () => {
  const tall = validateForGeneration(rectangle(2, 33), 484);
  assert.deepEqual(tall.errors.map((e) => [e.code, e.path]), [['board-side-too-large', 'board.height']]);
});

test('generation validation: large-board warning above 360 cells', () => {
  assert.deepEqual(validateForGeneration(rectangle(18, 20), 484).warnings, []);
  const large = validateForGeneration(rectangle(19, 20), 484);
  assert.deepEqual(large.warnings.map((w) => w.message), ['Large board: generation can take up to 2 minutes']);
  assert.equal(large.errors.length, 0);
});

test('generation validation rejects malformed boards without throwing', () => {
  const bad = [
    { width: 0, height: 3, active: new Uint8Array(0) },
    { width: 3, height: 2.5, active: new Uint8Array(7) },
    { width: 3, height: 3, active: new Uint8Array(8) },
    { width: 3, height: 3, active: new Uint8Array(9).fill(2) },
    { width: 3, height: 3, active: [1, 1, 1, 1, 1, 1, 1, 1, 1] },
  ];
  for (const board of bad) {
    const { errors } = validateForGeneration(/** @type {any} */ (board), 484);
    assert.deepEqual(errors.map((e) => e.code), ['board-invalid']);
  }
  assert.throws(() => validateForGeneration(rectangle(6, 6), Number.NaN), RangeError);
});

test('active cells are row-major and unaffected by presets sharing no state', () => {
  const a = preset('rectangle', { w: 2, h: 2 }).board;
  const b = preset('rectangle', { w: 2, h: 2 }).board;
  a.active[0] = 0;
  assert.equal(b.active[0], 1);
  assert.deepEqual(activeCells(boardFromRows(['.#', '#.'])), [[1, 0], [0, 1]]);
});
