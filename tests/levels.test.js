// @ts-check
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { bandEdge, level, levelForScore, offeredLevels } from '../core/engine/levels.js';

const IDS = ['very-easy', 'easy', 'normal', 'hard', 'expert', 'master', 'nightmare', 'hell-1', 'hell-2', 'hell-3', 'hell-4'];
const EDGES = [0, 8, 12, 17, 25, 37, 53, 77, 112, 162, 235, 341];
const SHARES = [0.62, 0.54, 0.46, 0.38, 0.3, 0.22, 0.14, 0.1, 0.06, 0.04, 0.04];
const AREAS = [
  [30, 87], [32, 215], [36, 348], [41, Infinity], [50, Infinity], [59, Infinity],
  [81, Infinity], [164, Infinity], [266, Infinity], [450, Infinity], [744, Infinity],
];

describe('level table', () => {
  test('band edges follow e0 = 0, eL = round(10 * 1.45^(L - 1.5))', () => {
    EDGES.forEach((edge, i) => assert.equal(bandEdge(i), edge, `edge ${i}`));
  });

  test('levels carry exact ids, bands, shares and areas', () => {
    IDS.forEach((id, i) => {
      const lv = level(id);
      assert.equal(lv.id, id);
      assert.equal(lv.index, i);
      assert.equal(lv.min, EDGES[i]);
      assert.equal(lv.max, EDGES[i + 1]);
      assert.equal(lv.share, SHARES[i]);
      assert.deepEqual([...lv.areas], AREAS[i]);
    });
    assert.equal(level('very-easy').label, 'Very easy');
    assert.equal(level('hell-3').label, 'Hell 3');
  });

  test('levels are immutable and cached', () => {
    const lv = level('hard');
    assert.equal(level('hard'), lv);
    assert.ok(Object.isFrozen(lv));
    assert.ok(Object.isFrozen(lv.areas));
  });

  test('hell-n beyond the table is classified but never generatable', () => {
    const h5 = level('hell-5');
    assert.equal(h5.index, 11);
    assert.equal(h5.min, 341);
    assert.equal(h5.max, bandEdge(12));
    assert.equal(h5.share, 0.04);
    assert.deepEqual([...h5.areas], [Infinity, Infinity]);
    const h9 = level('hell-9');
    assert.equal(h9.index, 15);
    assert.equal(h9.min, bandEdge(15));
    assert.equal(h9.max, bandEdge(16));
    assert.ok(h9.max > h9.min * 1.4);
    assert.equal(level('hell-9'), h9);
  });

  test('malformed or non-positive Hell suffixes are rejected', () => {
    for (const id of ['hell-0', 'hell-01', 'hell-1.5', 'hell--1', 'hell-', 'hell', 'Hell-1', 'hell-1e2', 'hell- 1',
      'hell-9007199254740993', 'hell-99999', '', 'unknown', 'hard ']) {
      assert.throws(() => level(id), RangeError, id);
    }
    assert.throws(() => level(/** @type {any} */ (7)), TypeError);
  });
});

describe('levelForScore', () => {
  test('every band edge belongs to its own level and the value below to the previous one', () => {
    for (let i = 1; i < EDGES.length; i++) {
      assert.equal(levelForScore(EDGES[i]).index, i, `at ${EDGES[i]}`);
      assert.equal(levelForScore(EDGES[i] - 1e-9).index, i - 1, `below ${EDGES[i]}`);
      assert.equal(levelForScore(EDGES[i] + 0.5).index, i);
    }
    assert.equal(levelForScore(0).id, 'very-easy');
    assert.equal(levelForScore(7.99).id, 'very-easy');
  });

  test('every integer score matches the brute-force band', () => {
    for (let score = 0; score <= 3000; score++) {
      let expected = 0;
      while (bandEdge(expected + 1) <= score) expected++;
      const lv = levelForScore(score);
      assert.equal(lv.index, expected, `score ${score}`);
      assert.ok(lv.min <= score && score < lv.max);
    }
  });

  test('generated Hell levels continue the ladder', () => {
    const lv = levelForScore(bandEdge(12));
    assert.equal(lv.id, 'hell-6');
    assert.equal(levelForScore(bandEdge(12) - 1).id, 'hell-5');
    assert.equal(levelForScore(1e6).id, level(levelForScore(1e6).id).id);
    assert.ok(levelForScore(Number.MAX_VALUE).index > 1000);
  });

  test('invalid scores are rejected', () => {
    for (const bad of [-1, NaN, Infinity, -Infinity]) assert.throws(() => levelForScore(bad), RangeError);
    assert.throws(() => levelForScore(/** @type {any} */ ('5')), RangeError);
  });
});

describe('offeredLevels', () => {
  test('availability boundaries are exact for every level', () => {
    for (let i = 0; i < AREAS.length; i++) {
      const [from, to] = AREAS[i];
      assert.ok(offeredLevels(from).some((l) => l.index === i), `${IDS[i]} at ${from}`);
      assert.ok(!offeredLevels(from - 1).some((l) => l.index === i), `${IDS[i]} below ${from}`);
      if (Number.isFinite(to)) {
        assert.ok(offeredLevels(to).some((l) => l.index === i));
        assert.ok(!offeredLevels(to + 1).some((l) => l.index === i));
      }
    }
  });

  test('offered levels are ascending, contiguous and non-empty for A = 30..676', () => {
    for (let area = 30; area <= 676; area++) {
      const offered = offeredLevels(area);
      assert.ok(offered.length > 0, `area ${area}`);
      offered.forEach((lv, i) => assert.equal(lv.index, offered[0].index + i, `area ${area}`));
      assert.ok(!offered.some((lv) => lv.index >= 10), `hell-4+ offered at ${area}`);
    }
  });

  test('business examples: 60, 360 and 484 cells', () => {
    const ids = (/** @type {number} */ area) => offeredLevels(area).map((l) => l.id);
    assert.deepEqual(ids(60), IDS.slice(0, 6));
    assert.deepEqual(ids(360), IDS.slice(3, 9));
    assert.deepEqual(ids(484), IDS.slice(3, 10));
    assert.deepEqual(ids(30), ['very-easy']);
    assert.deepEqual(ids(676), IDS.slice(3, 10));
  });

  test('lowest and highest level per area band match the design table', () => {
    /** @type {Array<[number, string, string]>} */
    const rows = [
      [31, 'very-easy', 'very-easy'], [35, 'very-easy', 'easy'], [40, 'very-easy', 'normal'],
      [49, 'very-easy', 'hard'], [58, 'very-easy', 'expert'], [80, 'very-easy', 'master'],
      [87, 'very-easy', 'nightmare'], [88, 'easy', 'nightmare'], [163, 'easy', 'nightmare'],
      [215, 'easy', 'hell-1'], [216, 'normal', 'hell-1'], [265, 'normal', 'hell-1'],
      [348, 'normal', 'hell-2'], [349, 'hard', 'hell-2'], [449, 'hard', 'hell-2'], [450, 'hard', 'hell-3'],
    ];
    for (const [area, lowest, highest] of rows) {
      const offered = offeredLevels(area);
      assert.equal(offered[0].id, lowest, `lowest at ${area}`);
      assert.equal(offered[offered.length - 1].id, highest, `highest at ${area}`);
    }
  });

  test('invalid areas are rejected', () => {
    for (const bad of [-1, 1.5, NaN, Infinity]) assert.throws(() => offeredLevels(bad), RangeError);
    assert.deepEqual(offeredLevels(5), []);
  });
});
