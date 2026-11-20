// @ts-check
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

import { activeCount, boardFromRows, classifyBlocked, preset, regions, symmetries } from '../core/engine/board.js';
import { offeredLevels } from '../core/engine/levels.js';
import { checkMatrix, planRuns } from '../tools/bench/runner.js';

const readJson = (/** @type {string} */ path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const fixture = readJson('./fixtures/bq-irregular-466.json');
const matrix = readJson('../tools/bench/matrices/bq-0.json');

/** @type {{ id: string, boardRows: string[], rotation: number, levelId: string, maxActive: number, repetitions: number, seedPrefix: string, quantity: number, uniqueness: string }[]} */
const cases = matrix.cases;
const rect = (/** @type {number} */ w, /** @type {number} */ h) => Array.from({ length: h }, () => '#'.repeat(w));
const casesOf = (/** @type {string} */ prefix) => cases.filter((c) => c.id.startsWith(`${prefix}-`));
const levelsOf = (/** @type {string} */ prefix) => casesOf(prefix).map((c) => c.levelId);
const offered = (/** @type {string[]} */ rows) => offeredLevels(activeCount(boardFromRows(rows))).map((l) => l.id);

describe('irregular 466 fixture', () => {
  test('has the documented schema and construction', () => {
    assert.deepEqual(Object.keys(fixture), ['rows']);
    assert.equal(fixture.rows.length, 22);
    const expected = rect(22, 22).map((row, y) => [...row].map((_, x) => {
      const off = (x <= 2 && y <= 2) || (x >= 20 && y >= 19) || (x === 7 && y === 6) || (x === 15 && y === 14) || (x === 5 && y === 17);
      return off ? '.' : '#';
    }).join(''));
    assert.deepEqual(fixture.rows, expected);
  });

  test('is 466 cells, connected, has holes and no symmetry', () => {
    const board = boardFromRows(fixture.rows);
    assert.equal(activeCount(board), 466);
    assert.equal(regions(board).length, 1);
    assert.equal(classifyBlocked(board).filter((v) => v === 2).length, 3);
    assert.deepEqual(symmetries(board), [0]);
  });
});

describe('BQ-0 matrix', () => {
  test('is a valid BQ-0 benchmark matrix with quantity 10 and uniqueness any', () => {
    const checked = checkMatrix(matrix);
    assert.deepEqual(checked.issues, []);
    assert.equal(matrix.profile, 'BQ-0');
    for (const c of cases) {
      assert.equal(c.quantity, 10);
      assert.equal(c.uniqueness, 'any');
      assert.equal(c.seedPrefix, 'bq0');
    }
  });

  test('uses the fixture rows and the preset heart verbatim', () => {
    for (const c of casesOf('dirr466')) {
      assert.deepEqual(c.boardRows, fixture.rows);
    }
    const heart = preset('heart', { n: 24 });
    assert.equal(activeCount(heart.board), 432);
    for (const c of casesOf('dheart432')) {
      assert.equal(c.rotation, 45);
      assert.deepEqual(boardFromRows(c.boardRows).active, heart.board.active);
    }
    for (const c of cases.filter((x) => !x.id.startsWith('dheart432-'))) {
      assert.equal(c.rotation, 0);
    }
  });

  test('desktop cases cap at 484, phone cases at 360, and sides stay within 32', () => {
    for (const c of cases) {
      assert.equal(c.maxActive, c.id.startsWith('p') ? 360 : 484, c.id);
      const board = boardFromRows(c.boardRows);
      assert.ok(Math.max(board.width, board.height) <= 32, c.id);
      assert.ok(activeCount(board) <= c.maxActive, c.id);
    }
  });

  test('covers every offered level of the large desktop boards from Hard upward; Heart 432 stops at Hell-2', () => {
    for (const [prefix, rows] of [['d22x22', rect(22, 22)], ['d32x15', rect(32, 15)], ['dirr466', fixture.rows]]) {
      const expected = offered(rows);
      assert.deepEqual(levelsOf(String(prefix)), expected, String(prefix));
      assert.equal(expected[0], 'hard');
      assert.ok(expected.includes('hell-3'));
    }
    const heart = levelsOf('dheart432');
    assert.deepEqual(heart, ['hard', 'expert', 'master', 'nightmare', 'hell-1', 'hell-2']);
    assert.ok(!heart.includes('hell-3'));
  });

  test('covers every offered level of the small desktop boards', () => {
    assert.deepEqual(levelsOf('d6x10'), offered(rect(10, 6)));
    assert.deepEqual(levelsOf('d6x10'), ['very-easy', 'easy', 'normal', 'hard', 'expert', 'master']);
    assert.deepEqual(levelsOf('d12x12'), offered(rect(12, 12)));
    assert.equal(levelsOf('d12x12')[0], 'easy');
  });

  test('phones run 18x20 at Hard, Nightmare, Hell-1 and Hell-2 only and never Hell-3', () => {
    assert.deepEqual(levelsOf('p18x20'), ['hard', 'nightmare', 'hell-1', 'hell-2']);
    for (const c of casesOf('p18x20')) {
      assert.equal(activeCount(boardFromRows(c.boardRows)), 360);
    }
    assert.ok(!cases.some((c) => activeCount(boardFromRows(c.boardRows)) <= 360 && c.levelId === 'hell-3'));
  });

  test('every level is offered for its board area and no level is requested twice', () => {
    for (const c of cases) {
      assert.ok(offered(c.boardRows).includes(c.levelId), c.id);
    }
    assert.equal(new Set(cases.map((c) => `${c.id}`)).size, cases.length);
  });

  test('has at least 20 seeds per cell and at least 60 for Hell-1 at the largest area of each platform', () => {
    for (const c of cases) {
      assert.ok(c.repetitions >= 20, c.id);
    }
    assert.ok(cases.find((c) => c.id === 'd22x22-hell-1')?.repetitions >= 60);
    assert.ok(cases.find((c) => c.id === 'p18x20-hell-1')?.repetitions >= 60);
    for (const c of cases.filter((x) => x.levelId === 'hell-1')) {
      assert.ok(c.repetitions >= (activeCount(boardFromRows(c.boardRows)) >= 484 ? 60 : 20), c.id);
    }
  });

  test('plans one cancel probe per cell and one generation row per seed', () => {
    const specs = planRuns(matrix);
    assert.equal(specs.filter((s) => s.probeKind === 'cancel').length, cases.length);
    assert.equal(specs.filter((s) => s.probeKind === 'generation').length, cases.reduce((sum, c) => sum + c.repetitions, 0));
    const seeds = new Set(specs.filter((s) => s.probeKind === 'generation' && s.caseId === 'd22x22-hell-1').map((s) => s.seed));
    assert.equal(seeds.size, 60);
  });
});
