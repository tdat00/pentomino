// @ts-check
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

import { boardFromRows, rectangle } from '../core/engine/board.js';
import {
  BUDGET_TABLE_ID, callBudgetOf, DEADLINE, DEADLINE_ID, GEN_V4_LIVE, isGenV4Route, isV4Family, perSetPrior, PER_SET_LEVELS,
  PRIOR, PRIOR_TABLE_ID, priorStart, RERATE_MAX, SCREEN_TABLE_ID, screenWOf, SET_ATTEMPTS_BOUND, SKIP_BOUNDS_V4, startOf,
  usesGenV4,
} from '../core/engine/gen-v4.js';

describe('gen-v4 tables and rules', () => {
  test('the prior table equals prior-s3-v1', () => {
    const json = JSON.parse(readFileSync(new URL('../tools/ig-proto/data/prior-s3-v1.json', import.meta.url), 'utf8'));
    const keys = Object.keys(json.cells);
    assert.equal(keys.length, 27);
    assert.deepEqual(Object.keys(PRIOR), keys);
    for (const k of keys) {
      assert.equal(/** @type {Record<string, number>} */ (PRIOR)[k], json.cells[k].share, k);
    }
    assert.equal(PRIOR_TABLE_ID, json.id);
  });

  test('the route: Hell 1 and Nightmare except the full 26x26', () => {
    const holed = boardFromRows(Array.from({ length: 26 }, (_, y) => (y === 0 ? `.${'#'.repeat(25)}` : '#'.repeat(26))));
    const boards = { full: rectangle(26, 26), wide: rectangle(13, 52), near: rectangle(25, 26), small: rectangle(10, 10), holed };
    assert.equal(isGenV4Route('nightmare', boards.full), false);
    for (const b of [boards.wide, boards.near, boards.small, boards.holed]) {
      assert.equal(isGenV4Route('nightmare', b), true);
    }
    for (const b of Object.values(boards)) {
      assert.equal(isGenV4Route('hell-1', b), true);
      assert.equal(isGenV4Route('master', b), false);
      assert.equal(isGenV4Route('hell-2', b), false);
    }
  });

  test('the route is off until the cutover', () => {
    assert.equal(GEN_V4_LIVE, false);
    assert.equal(usesGenV4('nightmare', rectangle(10, 10)), false);
  });

  test('the screen applies on Nightmare 196 to 256 cells only', () => {
    for (const a of [144, 145, 195, 196, 256, 257, 324, 325, 359, 360]) {
      assert.equal(screenWOf('nightmare', a), a >= 196 && a <= 256 ? 190000000 : 760000000, String(a));
    }
    assert.equal(screenWOf('nightmare', 220), 190000000);
    assert.equal(screenWOf('hell-1', 196), 760000000);
  });

  test('the call budget by mode and level', () => {
    assert.equal(callBudgetOf('any', 'nightmare'), 1e10);
    assert.equal(callBudgetOf('any', 'hell-1'), 4e10);
    assert.equal(callBudgetOf('require', 'nightmare'), 3.2e10);
    assert.equal(callBudgetOf('require', 'hell-1'), 4e10);
    assert.equal(callBudgetOf('any', 'master'), Infinity);
  });

  test('the start with and without a prior cell', () => {
    assert.equal(priorStart('nightmare', 196, 21), 4);
    assert.equal(priorStart('nightmare', 197, 21), null);
    assert.equal(priorStart('nightmare', 196, 2), null);
    assert.deepEqual(startOf(null, 9), { c0: 1, step0: 8 });
    assert.deepEqual(startOf(null, 5), { c0: 1, step0: 8 });
    assert.deepEqual(startOf(4, 21), { c0: 4, step0: 1 });
  });

  test('the frozen values', () => {
    assert.equal(SET_ATTEMPTS_BOUND, 4);
    assert.equal(RERATE_MAX, 4);
    assert.deepEqual(PER_SET_LEVELS, ['hell-1']);
    assert.deepEqual(SKIP_BOUNDS_V4, { subsets: 2192, repairs: 64 });
    assert.deepEqual(DEADLINE, { reserve: 0.6, setStageCapMs: 46000, generationStopMs: 115000, responseBoundMs: 120000, hostMarginMs: 1000 });
    assert.equal(SCREEN_TABLE_ID, 'screen-v4-v1');
    assert.equal(BUDGET_TABLE_ID, 'budget-s3-v1');
    assert.equal(DEADLINE_ID, 'deadline-s3-v1');
  });

  test('the per-set rule follows the frozen igPriorOf', () => {
    const cal = (/** @type {object} */ over = {}) => ({
      rating: { level: 'hell-1' }, certificate: { status: 'unique' }, igWindow: { wc: 6 }, ...over,
    });
    assert.deepEqual(perSetPrior(cal(), 'hell-1', 'require'), { igPrior: 6 });
    assert.deepEqual(perSetPrior(cal({ certificate: { status: 'multiple' } }), 'hell-1', 'require'), {});
    assert.deepEqual(perSetPrior(cal({ certificate: { status: 'multiple' } }), 'hell-1', 'any'), { igPrior: 6 });
    assert.deepEqual(perSetPrior(cal({ rating: { level: 'nightmare' } }), 'hell-1', 'require'), {});
    assert.deepEqual(perSetPrior(cal({ rating: null }), 'hell-1', 'require'), {});
    assert.deepEqual(perSetPrior(cal({ igWindow: { wc: 0 } }), 'hell-1', 'require'), {});
    assert.deepEqual(perSetPrior(cal({ igWindow: undefined }), 'hell-1', 'require'), {});
    assert.deepEqual(perSetPrior(undefined, 'hell-1', 'require'), {});
  });

  test('isV4Family', () => {
    assert.equal(isV4Family('gen-v4'), true);
    assert.equal(isV4Family('gen-v4-proto:p2-none'), true);
    assert.equal(isV4Family('gen-v4-proto:'), false);
    assert.equal(isV4Family('gen-v3'), false);
    assert.equal(isV4Family(undefined), false);
  });
});
