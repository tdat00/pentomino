// @ts-check
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

import { activeCount, boardFromRows, classifyBlocked, preset, regions } from '../core/engine/board.js';
import { offeredLevels } from '../core/engine/levels.js';
import { checkMatrix, planRuns } from '../tools/bench/runner.js';

const readJson = (/** @type {string} */ path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const irr466 = readJson('./fixtures/bq-irregular-466.json');
const irr558 = readJson('./fixtures/bq-irregular-558.json');
const irr658 = readJson('./fixtures/bq-irregular-658.json');
const matrices = {
  bq1: readJson('../tools/bench/matrices/bq-1.json'),
  bq2: readJson('../tools/bench/matrices/bq-2.json'),
  bq3: readJson('../tools/bench/matrices/bq-3.json'),
};

/** @typedef {{ id: string, boardRows: string[], rotation: number, levelId: string, maxActive: number, repetitions: number, seedPrefix: string, quantity: number, uniqueness: string, seeds?: string[] }} Cell */

const rect = (/** @type {number} */ w, /** @type {number} */ h) => Array.from({ length: h }, () => '#'.repeat(w));
const areaOf = (/** @type {string[]} */ rows) => activeCount(boardFromRows(rows));
const cellsOf = (/** @type {{ cases: Cell[] }} */ matrix, /** @type {string} */ prefix) => matrix.cases.filter((c) => c.id.startsWith(`${prefix}-`));
const levelsOf = (/** @type {{ cases: Cell[] }} */ matrix, /** @type {string} */ prefix) => cellsOf(matrix, prefix).map((c) => c.levelId);
const offered = (/** @type {string[]} */ rows) => offeredLevels(areaOf(rows)).map((l) => l.id);
const SIX = ['hard', 'master', 'nightmare', 'hell-1', 'hell-2', 'hell-3'];
const FOUR = ['hard', 'nightmare', 'hell-1', 'hell-2'];

/**
 * @param {string[]} rows
 * @param {number} size
 * @param {number[][]} blocks Inclusive [x0, y0, x1, y1] rectangles.
 * @param {number[][]} singles
 */
const masked = (rows, size, blocks, singles) => rect(size, size).map((_, y) => [...rows[y]].map((_, x) => {
  const off = blocks.some(([x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1) || singles.some(([sx, sy]) => sx === x && sy === y);
  return off ? '.' : '#';
}).join(''));

describe('irregular fixtures', () => {
  test('558 and 658 have the documented schema and construction', () => {
    assert.deepEqual(Object.keys(irr558), ['rows']);
    assert.deepEqual(Object.keys(irr658), ['rows']);
    assert.deepEqual(irr558.rows, masked(rect(24, 24), 24, [[0, 0, 2, 2], [22, 21, 23, 23]], [[7, 6], [17, 16], [5, 19]]));
    assert.deepEqual(irr658.rows, masked(rect(26, 26), 26, [[0, 0, 2, 2], [24, 23, 25, 25]], [[7, 6], [19, 18], [5, 21]]));
  });

  test('have 558 and 658 active cells, 18 blocked, one connected component and three interior holes', () => {
    for (const [rows, size, active] of /** @type {[string[], number, number][]} */ ([[irr558.rows, 24, 558], [irr658.rows, 26, 658], [irr466.rows, 22, 466]])) {
      const board = boardFromRows(rows);
      assert.equal(rows.length, size);
      assert.ok(rows.every((r) => r.length === size));
      assert.equal(activeCount(board), active);
      assert.equal(size * size - active, 18);
      assert.equal(regions(board).length, 1);
      assert.equal(classifyBlocked(board).filter((v) => v === 2).length, 3);
    }
  });
});

describe('BQ-1/BQ-2/BQ-3 matrices', () => {
  test('are valid benchmark matrices with the right profile, quantity, mode and distinct seed prefixes', () => {
    /** @type {[keyof typeof matrices, string, string][]} */
    const expected = [['bq1', 'BQ-1', 'bq1'], ['bq2', 'BQ-2', 'bq2'], ['bq3', 'BQ-3', 'bq3']];
    for (const [key, profile, prefix] of expected) {
      const matrix = matrices[key];
      assert.deepEqual(checkMatrix(matrix).issues, [], key);
      assert.equal(matrix.profile, profile);
      for (const c of /** @type {Cell[]} */ (matrix.cases)) {
        assert.equal(c.quantity, 10, c.id);
        assert.equal(c.uniqueness, 'any', c.id);
        assert.equal(c.seedPrefix, prefix, c.id);
        assert.equal(c.seeds, undefined, `${c.id}: seeds come from the case id so every platform runs the same list`);
      }
      assert.equal(new Set(matrix.cases.map((/** @type {Cell} */ c) => c.id)).size, matrix.cases.length);
    }
  });

  test('BQ-1: 24x24, 32x18 and irregular 558 at Hard, Master, Nightmare, Hell-1, Hell-2 and Hell-3 with cap 576', () => {
    const m = matrices.bq1;
    assert.equal(m.cases.length, 18);
    assert.deepEqual(levelsOf(m, 'd24x24'), SIX);
    assert.deepEqual(levelsOf(m, 'd32x18'), SIX);
    assert.deepEqual(levelsOf(m, 'dirr558'), SIX);
    for (const c of /** @type {Cell[]} */ (m.cases)) assert.equal(c.maxActive, 576, c.id);
    for (const c of cellsOf(m, 'd24x24')) assert.deepEqual(c.boardRows, rect(24, 24));
    for (const c of cellsOf(m, 'd32x18')) assert.deepEqual(c.boardRows, rect(32, 18));
    for (const c of cellsOf(m, 'dirr558')) assert.deepEqual(c.boardRows, irr558.rows);
    assert.deepEqual(SIX, offered(rect(24, 24)).filter((id) => SIX.includes(id)));
  });

  test('BQ-2: 26x26, 32x21 and irregular 658 at the same six levels with cap 676', () => {
    const m = matrices.bq2;
    assert.equal(m.cases.length, 18);
    assert.deepEqual(levelsOf(m, 'd26x26'), SIX);
    assert.deepEqual(levelsOf(m, 'd32x21'), SIX);
    assert.deepEqual(levelsOf(m, 'dirr658'), SIX);
    for (const c of /** @type {Cell[]} */ (m.cases)) assert.equal(c.maxActive, 676, c.id);
    for (const c of cellsOf(m, 'd26x26')) assert.deepEqual(c.boardRows, rect(26, 26));
    for (const c of cellsOf(m, 'd32x21')) assert.deepEqual(c.boardRows, rect(32, 21));
    for (const c of cellsOf(m, 'dirr658')) assert.deepEqual(c.boardRows, irr658.rows);
  });

  test('BQ-3: Heart N22 at 45 degrees never gets Hell-3; 22x22 and irregular 466 do; cap 484, phones only', () => {
    const m = matrices.bq3;
    assert.equal(m.cases.length, 14);
    const heart = preset('heart', { n: 22 });
    assert.equal(activeCount(heart.board), 363);
    assert.deepEqual(levelsOf(m, 'pheart363'), FOUR);
    assert.deepEqual(levelsOf(m, 'p22x22'), [...FOUR, 'hell-3']);
    assert.deepEqual(levelsOf(m, 'pirr466'), [...FOUR, 'hell-3']);
    for (const c of cellsOf(m, 'pheart363')) {
      assert.equal(c.rotation, 45, c.id);
      assert.deepEqual(boardFromRows(c.boardRows).active, heart.board.active);
      assert.notEqual(c.levelId, 'hell-3');
    }
    for (const c of cellsOf(m, 'p22x22')) assert.deepEqual(c.boardRows, rect(22, 22));
    for (const c of cellsOf(m, 'pirr466')) assert.deepEqual(c.boardRows, irr466.rows);
    for (const c of /** @type {Cell[]} */ (m.cases)) assert.equal(c.maxActive, 484, c.id);
  });

  test('every cell is an offered level above its previous limit, within its candidate cap and the side limit', () => {
    /** @type {[keyof typeof matrices, number, number][]} */
    const windows = [['bq1', 484, 576], ['bq2', 576, 676], ['bq3', 360, 484]];
    for (const [key, previous, cap] of windows) {
      for (const c of /** @type {Cell[]} */ (matrices[key].cases)) {
        const board = boardFromRows(c.boardRows);
        assert.ok(offered(c.boardRows).includes(c.levelId), c.id);
        assert.ok(Math.max(board.width, board.height) <= 32, c.id);
        assert.ok(activeCount(board) <= cap && activeCount(board) > previous, c.id);
        assert.equal(c.rotation, c.id.startsWith('pheart363-') ? 45 : 0, c.id);
      }
    }
  });

  test('every cell has at least 20 seeds and Hell-1 at the largest area has at least 60', () => {
    for (const [key, largest] of /** @type {[keyof typeof matrices, number][]} */ ([['bq1', 576], ['bq2', 676], ['bq3', 484]])) {
      const cases = /** @type {Cell[]} */ (matrices[key].cases);
      assert.equal(Math.max(...cases.map((c) => areaOf(c.boardRows))), largest);
      for (const c of cases) {
        const need = c.levelId === 'hell-1' && areaOf(c.boardRows) === largest ? 60 : 20;
        assert.ok(c.repetitions >= need, c.id);
      }
      assert.ok(cases.some((c) => c.levelId === 'hell-1' && c.repetitions >= 60), key);
    }
  });

  test('plans one cancel probe per cell and one generation row per seed, with identical seeds on every run', () => {
    for (const matrix of Object.values(matrices)) {
      const specs = planRuns(matrix);
      const cases = /** @type {Cell[]} */ (matrix.cases);
      assert.equal(specs.filter((s) => s.probeKind === 'cancel').length, cases.length);
      assert.equal(specs.filter((s) => s.probeKind === 'generation').length, cases.reduce((sum, c) => sum + c.repetitions, 0));
      assert.deepEqual(planRuns(matrix).map((s) => s.seed), specs.map((s) => s.seed));
    }
  });
});
