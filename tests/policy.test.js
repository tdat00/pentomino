// @ts-check
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { offeredLevels } from '../core/engine/levels.js';
import {
  BUDGETS,
  ENUMERATION,
  LIMITS,
  POLICY_ID,
  SCORE,
  TIME,
  deriveLimits,
  enabledMaxActive,
  histogramFeasible,
  kMax,
  kMin,
  minAreaForCount,
  pieceCountRange,
  planSizes,
  sizeWindow,
} from '../core/engine/policy.js';
import { QUALIFICATION } from '../core/engine/qualification.js';
import { createRng, createRngFromState } from '../core/engine/rng.js';

const AVAIL = [0, 0, 0, 2, 5, 12, 35, 107, 363, 1248, 4460];
/** @param {number} s */
const defaultAvail = (s) => (s < 3 ? 0 : s < AVAIL.length ? AVAIL[s] : Infinity);

/**
 * Independent oracle: layered DP over sizes with states (pieces, area, small pieces).
 * @param {number} area
 * @param {number} k
 * @param {{ window?: [number, number], avail?: (s: number) => number, smallCap?: number }} [o]
 */
function bruteFeasible(area, k, o = {}) {
  const [wlo, whi] = o.window ?? [Math.max(3, Math.floor((3 * area) / (5 * k))), Math.ceil((3 * area) / (2 * k))];
  const avail = o.avail ?? defaultAvail;
  const smallCap = o.smallCap ?? Math.floor((2 * k) / 5);
  let states = new Set(['0,0,0']);
  for (let s = Math.max(3, wlo); s <= whi; s++) {
    const next = new Set();
    for (const key of states) {
      const [n, a, small] = key.split(',').map(Number);
      for (let c = 0; c <= avail(s) && n + c <= k && a + c * s <= area; c++) {
        const sm = small + (s <= 4 ? c : 0);
        if (sm <= smallCap) next.add(`${n + c},${a + c * s},${sm}`);
      }
    }
    states = next;
  }
  return [...states].some((key) => key.startsWith(`${k},${area},`));
}

/**
 * @param {number[]} sizes
 * @param {number} area
 * @param {number} k
 * @param {{ window?: [number, number], avail?: (s: number) => number, smallCap?: number }} [o]
 */
function assertPlanValid(sizes, area, k, o = {}) {
  const [lo, hi] = o.window ?? sizeWindow(area, k);
  const avail = o.avail ?? defaultAvail;
  const smallCap = o.smallCap ?? Math.floor((2 * k) / 5);
  assert.equal(sizes.length, k);
  assert.equal(sizes.reduce((a, b) => a + b, 0), area);
  /** @type {Map<number, number>} */
  const counts = new Map();
  for (const s of sizes) {
    assert.ok(Number.isInteger(s) && s >= Math.max(3, lo) && s <= hi, `size ${s} outside [${lo},${hi}]`);
    counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  for (const [s, c] of counts) assert.ok(c <= avail(s), `${c} pieces of size ${s} exceed availability`);
  assert.ok((counts.get(3) ?? 0) + (counts.get(4) ?? 0) <= smallCap, 'small-piece cap exceeded');
}

describe('bounds and tables', () => {
  test('minAreaForCount reproduces the design table', () => {
    const ks = [6, 8, 10, 12, 13, 16, 18, 20, 24, 30, 36, 42, 48, 54, 60, 66, 80, 90];
    const areas = [26, 35, 44, 54, 58, 72, 81, 92, 116, 152, 188, 224, 260, 296, 338, 380, 478, 548];
    ks.forEach((k, i) => assert.equal(minAreaForCount(k), areas[i], `K=${k}`));
  });

  test('kMin and kMax reproduce the design anchors', () => {
    /** @type {Array<[number, number, number]>} */
    const rows = [[60, 6, 13], [100, 8, 21], [144, 9, 28], [196, 11, 37], [256, 12, 47], [360, 15, 63],
      [484, 17, 80], [576, 18, 94], [676, 20, 108], [36, 5, 8], [324, 14, 58], [400, 15, 68]];
    for (const [area, lo, hi] of rows) {
      assert.equal(kMin(area), lo, `kMin(${area})`);
      assert.equal(kMax(area), hi, `kMax(${area})`);
    }
  });

  test('kMin is the exact ceiling of 0.75*sqrt(A) and kMax is maximal', () => {
    for (let area = 1; area <= 700; area++) {
      const lo = kMin(area);
      assert.ok(16 * lo * lo >= 9 * area && 16 * (lo - 1) * (lo - 1) < 9 * area, `kMin(${area})`);
      const hi = kMax(area);
      if (hi > 0) assert.ok(hi * 4.5 <= area && minAreaForCount(hi) <= area);
      assert.ok((hi + 1) * 4.5 > area || minAreaForCount(hi + 1) > area, `kMax(${area}) not maximal`);
    }
  });

  test('sizeWindow is [max(3, floor(.6 mu)), ceil(1.5 mu)]', () => {
    assert.deepEqual(sizeWindow(60, 12), [3, 8]);
    assert.deepEqual(sizeWindow(60, 10), [3, 9]);
    assert.deepEqual(sizeWindow(360, 16), [13, 34]);
    assert.deepEqual(sizeWindow(100, 10), [6, 15]);
    assert.deepEqual(sizeWindow(30, 6), [3, 8]);
    assert.throws(() => sizeWindow(0, 5), RangeError);
    assert.throws(() => sizeWindow(60, 2.5), RangeError);
  });
});

describe('histogramFeasible', () => {
  test('exact-minimum inventories are feasible and one cell less is not', () => {
    for (const k of [6, 8, 10, 12, 13, 16, 18, 20, 24, 30, 36, 42, 48, 54, 60, 66, 80, 90]) {
      const min = minAreaForCount(k);
      assert.ok(histogramFeasible(min, k), `K=${k} A=${min}`);
      assert.ok(!histogramFeasible(min - 1, k), `K=${k} A=${min - 1}`);
    }
  });

  test('classic 12 x 5 histogram is supported, 13 distinct pentominoes are not', () => {
    assert.ok(histogramFeasible(60, 12));
    assert.ok(!histogramFeasible(65, 13, { window: [5, 5] }));
    assert.ok(histogramFeasible(60, 12, { window: [5, 5] }));
  });

  test('agrees with the independent DP on every small (A, K)', () => {
    for (let area = 6; area <= 90; area++) {
      for (let k = 1; k <= 20; k++) {
        assert.equal(histogramFeasible(area, k), bruteFeasible(area, k), `A=${area} K=${k}`);
      }
    }
  });

  test('agrees with the DP on random larger inputs', () => {
    const rng = createRng('policy-histogram-oracle');
    for (let t = 0; t < 120; t++) {
      const k = 4 + rng.int(30);
      const area = Math.max(3 * k, Math.floor(4.2 * k) + rng.int(Math.floor(3 * k)));
      assert.equal(histogramFeasible(area, k), bruteFeasible(area, k), `A=${area} K=${k}`);
    }
  });

  test('agrees with the DP under overrides, including exhausted small shapes and the DP fallback', () => {
    const rng = createRng('policy-override-oracle');
    for (let t = 0; t < 600; t++) {
      const k = 1 + rng.int(14);
      const area = 3 * k + rng.int(12 * k);
      const caps = Array.from({ length: 14 }, () => rng.int(Math.min(k + 1, 5)));
      const lo = 3 + rng.int(4);
      const hi = lo + rng.int(10);
      const o = {
        window: /** @type {[number, number]} */ ([lo, hi]),
        avail: (/** @type {number} */ s) => (s < 3 ? 0 : caps[s % caps.length]),
        smallCap: rng.int(k + 1),
      };
      const table = Array.from({ length: hi + 2 }, (_, s) => o.avail(s));
      const fixed = { ...o, avail: (/** @type {number} */ s) => table[s] ?? 0 };
      assert.equal(histogramFeasible(area, k, fixed), bruteFeasible(area, k, fixed), `A=${area} K=${k} ${JSON.stringify([lo, hi, o.smallCap, table])}`);
    }
  });

  test('small-shape availability is exhausted by the shape count, not just the cap', () => {
    const noSmall = { window: /** @type {[number, number]} */ ([3, 6]), avail: (/** @type {number} */ s) => (s <= 4 ? 0 : 99) };
    assert.ok(histogramFeasible(25, 5, noSmall));
    assert.ok(!histogramFeasible(24, 5, noSmall));
    const oneShapeEach = { window: /** @type {[number, number]} */ ([5, 5]), avail: () => 2 };
    assert.ok(histogramFeasible(10, 2, oneShapeEach));
    assert.ok(!histogramFeasible(15, 3, oneShapeEach));
    assert.ok(!histogramFeasible(9, 3, { smallCap: 0 }));
  });

  test('large pieces on a 360-cell board are available (Hard)', () => {
    assert.ok(histogramFeasible(360, 16));
    assert.ok(histogramFeasible(360, 18));
    const [lo, hi] = sizeWindow(360, 16);
    assert.ok(hi >= 30 && lo >= 13);
  });
});

describe('pieceCountRange', () => {
  /** @type {Array<[string, number, number, number]>} */
  const anchors = [
    ['very-easy', 60, 6, 7], ['easy', 60, 7, 8], ['normal', 60, 8, 9], ['hard', 60, 9, 11],
    ['expert', 60, 11, 12], ['master', 60, 12, 13],
    ['hard', 360, 16, 18], ['expert', 360, 18, 20], ['master', 360, 20, 23], ['nightmare', 360, 25, 28],
    ['hell-1', 360, 37, 42], ['hell-2', 360, 50, 56], ['hell-3', 484, 73, 80], ['hell-3', 676, 80, 90],
  ];

  test('reproduces every anchor row as a gap-free range', () => {
    for (const [id, area, from, to] of anchors) {
      const range = pieceCountRange(id, area);
      assert.ok(range, `${id}@${area}`);
      assert.deepEqual(range, Array.from({ length: to - from + 1 }, (_, i) => from + i), `${id}@${area}`);
    }
  });

  test('is null where a level is not offered, including non-generatable levels', () => {
    assert.equal(pieceCountRange('nightmare', 60), null);
    assert.equal(pieceCountRange('very-easy', 88), null);
    assert.equal(pieceCountRange('hell-3', 449), null);
    assert.equal(pieceCountRange('hell-4', 676), null);
    assert.equal(pieceCountRange('hell-5', 676), null);
    assert.equal(pieceCountRange('hell-12', 100), null);
    assert.throws(() => pieceCountRange('hell-0', 100), RangeError);
    assert.throws(() => pieceCountRange('hard', 0), RangeError);
  });

  test('every offered (level, area) for A = 30..676 yields a non-empty feasible range within bounds', () => {
    for (let area = 30; area <= 676; area++) {
      for (const lv of offeredLevels(area)) {
        const range = pieceCountRange(lv.id, area);
        assert.ok(range && range.length > 0, `${lv.id}@${area}`);
        for (const k of range) {
          assert.ok(k >= kMin(area) && k <= kMax(area), `${lv.id}@${area} K=${k}`);
          assert.ok(histogramFeasible(area, k), `${lv.id}@${area} K=${k}`);
        }
      }
      for (const id of ['hell-4', 'hell-5']) assert.equal(pieceCountRange(id, area), null);
    }
  });

  test('counts rise with the level at a fixed area', () => {
    for (const area of [100, 250, 360, 484, 676]) {
      let prev = 0;
      for (const lv of offeredLevels(area)) {
        const range = /** @type {number[]} */ (pieceCountRange(lv.id, area));
        assert.ok(range[0] >= prev, `${lv.id}@${area}`);
        prev = range[0];
      }
    }
  });

  test('Hell caps bound the count', () => {
    assert.ok(Math.max(.../** @type {number[]} */ (pieceCountRange('hell-1', 676))) <= 42);
    assert.ok(Math.max(.../** @type {number[]} */ (pieceCountRange('hell-2', 676))) <= 62);
    assert.ok(Math.max(.../** @type {number[]} */ (pieceCountRange('hell-3', 676))) <= 92);
  });
});

describe('planSizes', () => {
  test('always sums to A and satisfies every bound on all offered areas', () => {
    const rng = createRng('policy-plan-all');
    for (let area = 30; area <= 676; area += 7) {
      for (const lv of offeredLevels(area)) {
        const range = /** @type {number[]} */ (pieceCountRange(lv.id, area));
        for (const k of [range[0], range[range.length - 1]]) {
          const sizes = planSizes(area, k, rng);
          assert.ok(sizes, `${lv.id}@${area} K=${k}`);
          assertPlanValid(/** @type {number[]} */ (sizes), area, k);
        }
      }
    }
  });

  test('returns null exactly when the histogram is infeasible', () => {
    const rng = createRng('policy-plan-null');
    for (let area = 6; area <= 70; area++) {
      for (let k = 1; k <= 16; k++) {
        const plan = planSizes(area, k, rng);
        assert.equal(plan !== null, histogramFeasible(area, k), `A=${area} K=${k}`);
        if (plan) assertPlanValid(plan, area, k);
      }
    }
  });

  test('exact-minimum inventories reproduce the minimum histogram', () => {
    const plan = /** @type {number[]} */ (planSizes(26, 6, createRng('min')));
    assert.deepEqual([...plan].sort((a, b) => a - b), [3, 3, 5, 5, 5, 5]);
    assert.equal(planSizes(25, 6, createRng('min')), null);
    const plan338 = /** @type {number[]} */ (planSizes(338, 60, createRng('min')));
    assert.ok(plan338);
    assertPlanValid(plan338, 338, 60);
  });

  test('respects overrides and exhausted availability', () => {
    const rng = createRng('policy-plan-overrides');
    for (let t = 0; t < 300; t++) {
      const k = 1 + rng.int(12);
      const area = 3 * k + rng.int(10 * k);
      const caps = Array.from({ length: 40 }, () => rng.int(Math.min(k + 1, 6)));
      const lo = 3 + rng.int(4);
      const o = {
        window: /** @type {[number, number]} */ ([lo, lo + rng.int(12)]),
        avail: (/** @type {number} */ s) => (s < 3 ? 0 : caps[s] ?? 0),
        smallCap: rng.int(k + 1),
      };
      const plan = planSizes(area, k, rng, o);
      assert.equal(plan !== null, bruteFeasible(area, k, o), `A=${area} K=${k}`);
      if (plan) assertPlanValid(plan, area, k, o);
    }
  });

  test('continues from a feasible histogram when greedy growth dead-ends', () => {
    const caps = new Map([[6, 1], [7, 0], [8, 3], [9, 3], [10, 0], [11, 2]]);
    const o = { window: /** @type {[number, number]} */ ([6, 11]), avail: (/** @type {number} */ s) => caps.get(s) ?? 0, smallCap: 1 };
    const plan = planSizes(29, 3, createRng('dead-end'), o);
    assert.ok(plan);
    assertPlanValid(plan, 29, 3, o);
  });

  test('is reproducible for a fixed RNG stream and varies across streams', () => {
    const a = planSizes(360, 20, createRngFromState([1, 2, 3, 4]));
    const b = planSizes(360, 20, createRngFromState([1, 2, 3, 4]));
    assert.deepEqual(a, b);
    const c = planSizes(360, 20, createRng('seed-a'));
    assert.deepEqual(c, planSizes(360, 20, createRng('seed-a')));
    const variants = new Set();
    for (let i = 0; i < 12; i++) variants.add(JSON.stringify(planSizes(360, 20, createRng(`vary-${i}`))));
    assert.ok(variants.size > 1);
  });

  test('uses only Rng.int and Rng.shuffle', () => {
    const real = createRng('spy');
    const spy = /** @type {any} */ ({
      int: (/** @type {number} */ n) => real.int(n),
      shuffle: (/** @type {any[]} */ a) => real.shuffle(a),
    });
    const plan = planSizes(100, 12, spy);
    assert.ok(plan);
    assertPlanValid(plan, 100, 12);
  });
});

describe('limits, qualification and budgets', () => {
  test('qualification ships not-run with no reports and is immutable', () => {
    for (const key of /** @type {const} */ (['bq0', 'bq1', 'bq2', 'bq3'])) {
      assert.deepEqual({ ...QUALIFICATION[key] }, { status: 'not-run', report: null });
      assert.ok(Object.isFrozen(QUALIFICATION[key]));
    }
    assert.ok(Object.isFrozen(QUALIFICATION));
    assert.throws(() => {
      /** @type {any} */ (QUALIFICATION).bq1.status = 'pass';
    }, TypeError);
  });

  test('default device limits stay at 484 / 360 and 676 is opt-in on desktop only', () => {
    assert.equal(POLICY_ID, 'mixed-v2');
    assert.equal(LIMITS.releaseMaxActive, 484);
    assert.equal(LIMITS.phoneMaxActive, 360);
    assert.equal(LIMITS.designMaxActive, 576);
    assert.equal(LIMITS.largeBoardMaxActive, 676);
    assert.equal(LIMITS.minActive, 30);
    assert.equal(LIMITS.maxSide, 32);
    assert.equal(LIMITS.maxBatch, 10);
    assert.equal(enabledMaxActive({ phone: false, largeBoards: false }), 484);
    assert.equal(enabledMaxActive({ phone: false, largeBoards: true }), 676);
    assert.equal(enabledMaxActive({ phone: true, largeBoards: false }), 360);
    assert.equal(enabledMaxActive({ phone: true, largeBoards: true }), 360);
  });

  test('limits are raised only by passing gates', () => {
    const pass = { status: 'pass' };
    const none = { status: 'fail' };
    const both = deriveLimits({ bq1: pass, bq3: pass });
    assert.equal(both.releaseMaxActive, 576);
    assert.equal(both.phoneMaxActive, 484);
    assert.equal(enabledMaxActive({ phone: true, largeBoards: true }, both), 484);
    assert.equal(enabledMaxActive({ phone: false, largeBoards: false }, both), 576);
    const blocked = deriveLimits({ bq1: none, bq3: { status: 'blocked' } });
    assert.equal(blocked.releaseMaxActive, 484);
    assert.equal(blocked.phoneMaxActive, 360);
    assert.ok(Object.isFrozen(LIMITS));
  });

  test('score, time and budget constants match the design', () => {
    assert.deepEqual(JSON.parse(JSON.stringify(SCORE)), {
      model: 'difficulty-v2', weights: { U: 2, B: 8 }, caps: { branch: 5000, rows: 50000 },
    });
    assert.deepEqual({ ...TIME }, { targetMs: 60000, dispatchStopMs: 115000, responseMs: 120000 });
    assert.deepEqual({ ...BUDGETS }, {
      carveSteps: 6000, carveTries: 24, macroPartitions: 30, macroSteps: 3000, sizePlans: 6,
      rateBranch: 5000, rateRows: 50000, countRowsSmall: 10000, countRowsLarge: 2000,
      clueSubsets: 64, lnsSteps: 8, lnsRowsMacro: 3000, lnsRowsFlat: 5000,
      restartMaxArea: 150, restartBase: 2000, tilingTotal: 100000, slotAttempts: 12,
      maxRows: 600000, maxNodes: 5000000, workspaceBytes: 167772160,
      scratchBytes: 33554432, cacheBytes: 33554432, verifyRows: 2000000,
      progressEvery: 50000, historyKeys: 1000,
    });
    for (const o of [SCORE, SCORE.weights, SCORE.caps, TIME, BUDGETS]) assert.ok(Object.isFrozen(o));
  });

  test('the arrangement count has its own frozen limits; BUDGETS is pinned above (owner decision 2026-10-23)', () => {
    assert.deepEqual({ ...ENUMERATION }, { placements: 250000000, nodes: 2500000, collect: 32 });
    assert.ok(Object.isFrozen(ENUMERATION));
  });
});
