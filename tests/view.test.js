// @ts-check
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TRANSFORMS, orientedCells } from '../core/engine/geometry.js';
import { activeCells, preset, rectangle } from '../core/engine/board.js';
import {
  ANGLES,
  activeCenter,
  arrowToGrid,
  fitCellSize,
  normalizeAngle,
  rotatedExtent,
  screenFlip,
  screenRotate,
} from '../core/engine/view.js';
import { CLASSIC_PENTOMINOES } from './fixtures/polyominoes.js';

/** @typedef {import('../core/engine/types.js').XY} XY */

const near = (/** @type {number} */ a, /** @type {number} */ b, eps = 1e-4) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`);

/** Independent reference: 2x2 screen matrices in a y-down frame. */
const rad = (/** @type {number} */ deg) => (deg * Math.PI) / 180;
/** Board shown rotated counter-clockwise by theta: screen = D * grid. */
const displayMatrix = (/** @type {number} */ theta) => [
  [Math.cos(rad(theta)), Math.sin(rad(theta))],
  [-Math.sin(rad(theta)), Math.cos(rad(theta))],
];
const mul = (/** @type {number[][]} */ a, /** @type {number[][]} */ b) =>
  a.map((row, i) => b[0].map((_, j) => row[0] * b[0][j] + row[1] * b[1][j]));
const inverse = (/** @type {number[][]} */ m) => [[m[0][0], m[1][0]], [m[0][1], m[1][1]]];
const matrixOf = (/** @type {number} */ t) => {
  const a = TRANSFORMS[t]([1, 0]);
  const b = TRANSFORMS[t]([0, 1]);
  return [[a[0], b[0]], [a[1], b[1]]];
};
const tOfMatrix = (/** @type {number[][]} */ m) => {
  const hit = [...TRANSFORMS.keys()].filter((t) => {
    const ref = matrixOf(t);
    return ref.every((row, i) => row.every((v, j) => Math.abs(v - m[i][j]) < 1e-9));
  });
  assert.equal(hit.length, 1, `no unique D4 element for ${JSON.stringify(m)}`);
  return hit[0];
};
/** New grid transform whose display equals screen matrix S applied to the display of t. */
const referenceT = (/** @type {number} */ t, /** @type {number} */ theta, /** @type {number[][]} */ screen) => {
  const d = displayMatrix(theta);
  const m = mul(inverse(d), mul(screen, mul(d, matrixOf(t))));
  return tOfMatrix(m.map((row) => row.map((v) => (Math.abs(v) < 1e-9 ? 0 : Math.round(v)))));
};
const H_FLIP = [[-1, 0], [0, 1]];
const V_FLIP = [[1, 0], [0, -1]];
const CW = [[0, -1], [1, 0]];
const CCW = [[0, 1], [-1, 0]];

test('normalizeAngle accepts finite multiples of 45 and wraps', () => {
  assert.deepEqual(ANGLES.map(normalizeAngle), [0, 45, 90, 135, 180, 225, 270, 315]);
  assert.equal(normalizeAngle(-45), 315);
  assert.equal(normalizeAngle(-360), 0);
  assert.equal(Object.is(normalizeAngle(-0), 0), true);
  assert.equal(normalizeAngle(765), 45);
  assert.equal(normalizeAngle(-405), 315);
  for (const bad of [30, 44.9, Number.NaN, Infinity, -Infinity, /** @type {any} */ ('45'), /** @type {any} */ (null)]) {
    assert.throws(() => normalizeAngle(bad), RangeError);
  }
});

test('screen operations match geometric reference for 8 angles x 8 orientations', () => {
  for (const theta of ANGLES) {
    for (let t = 0; t < 8; t += 1) {
      assert.equal(screenFlip(t, theta, 'horizontal'), referenceT(t, theta, H_FLIP), `h t=${t} θ=${theta}`);
      assert.equal(screenFlip(t, theta, 'vertical'), referenceT(t, theta, V_FLIP), `v t=${t} θ=${theta}`);
      assert.equal(screenRotate(t, 'cw'), referenceT(t, theta, CW), `cw t=${t} θ=${theta}`);
      assert.equal(screenRotate(t, 'ccw'), referenceT(t, theta, CCW), `ccw t=${t} θ=${theta}`);
    }
  }
});

test('screen flips act as the reference on real shapes and are involutions', () => {
  const f = /** @type {XY[]} */ (CLASSIC_PENTOMINOES.find((p) => p.id === 'F')?.cells);
  assert.ok(f);
  for (const theta of ANGLES) {
    for (let t = 0; t < 8; t += 1) {
      for (const axis of /** @type {const} */ (['horizontal', 'vertical'])) {
        const once = screenFlip(t, theta, axis);
        assert.equal(screenFlip(once, theta, axis), t);
        assert.notEqual(once >> 2, t >> 2);
        const shown = orientedCells(f, t);
        const d = displayMatrix(theta);
        const flip = axis === 'horizontal' ? H_FLIP : V_FLIP;
        const screenPts = (/** @type {XY[]} */ cells) => cells.map(([x, y]) => [d[0][0] * x + d[0][1] * y, d[1][0] * x + d[1][1] * y]);
        const expected = screenPts(shown).map(([x, y]) => [flip[0][0] * x, flip[1][1] * y]);
        const actual = screenPts(orientedCells(f, once));
        const centroid = (/** @type {number[][]} */ pts) => [0, 1].map((i) => pts.reduce((s, p) => s + p[i], 0) / pts.length);
        const ce = centroid(expected);
        const ca = centroid(actual);
        const key = (/** @type {number[][]} */ pts, /** @type {number[]} */ c) =>
          pts.map((p) => `${Math.round((p[0] - c[0]) * 1e4) + 0},${Math.round((p[1] - c[1]) * 1e4) + 0}`).sort();
        assert.deepEqual(key(actual, ca), key(expected, ce));
      }
    }
  }
});

test('screenRotate and screenFlip validate their inputs', () => {
  assert.equal(screenRotate(3, 'cw'), 0);
  assert.equal(screenRotate(0, 'ccw'), 3);
  assert.equal(screenRotate(7, 'cw'), 4);
  assert.equal(screenFlip(0, 0, 'horizontal'), 4);
  assert.equal(screenFlip(1, 90, 'vertical'), 4 + ((2 + 2 - 1) % 4));
  assert.equal(screenFlip(0, -45, 'horizontal'), screenFlip(0, 315, 'horizontal'));
  assert.throws(() => screenRotate(8, 'cw'), RangeError);
  assert.throws(() => screenRotate(0, /** @type {any} */ ('up')), RangeError);
  assert.throws(() => screenFlip(0, 30, 'horizontal'), RangeError);
  assert.throws(() => screenFlip(-1, 0, 'horizontal'), RangeError);
  assert.throws(() => screenFlip(0, 0, /** @type {any} */ ('diagonal')), RangeError);
});

test('arrow keys map through the view rotation, with ties toward theta - 45', () => {
  const keys = /** @type {const} */ (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
  assert.deepEqual(keys.map((k) => arrowToGrid(0, k)), [[-1, 0], [1, 0], [0, -1], [0, 1]]);
  assert.deepEqual(keys.map((k) => arrowToGrid(90, k)), [[0, -1], [0, 1], [1, 0], [-1, 0]]);
  assert.deepEqual(keys.map((k) => arrowToGrid(180, k)), [[1, 0], [-1, 0], [0, 1], [0, -1]]);
  assert.deepEqual(keys.map((k) => arrowToGrid(270, k)), [[0, 1], [0, -1], [-1, 0], [1, 0]]);
  for (const [odd, even] of [[45, 0], [135, 90], [225, 180], [315, 270], [-45, 270], [-225, 90]]) {
    for (const k of keys) {
      assert.deepEqual(arrowToGrid(odd, k), arrowToGrid(even, k), `${odd} ${k}`);
    }
  }
  assert.deepEqual(arrowToGrid(-90, 'ArrowRight'), arrowToGrid(270, 'ArrowRight'));
  assert.ok(!Object.is(arrowToGrid(90, 'ArrowRight')[0], -0));
  assert.throws(() => arrowToGrid(0, /** @type {any} */ ('Enter')), RangeError);
  // A board rotated CCW 90 shows grid-down to the right: Right must move down on the grid.
  const d = displayMatrix(90);
  const [gx, gy] = arrowToGrid(90, 'ArrowRight');
  assert.deepEqual([Math.round(d[0][0] * gx + d[0][1] * gy), Math.round(d[1][0] * gx + d[1][1] * gy)], [1, 0]);
});

test('rotatedExtent matches published examples and the board frame', () => {
  const heart = activeCells(preset('heart', {}).board);
  const e = rotatedExtent(heart, 45);
  near(e.w, 14.1421);
  near(e.h, 10.6066);
  const wide = activeCells(rectangle(10, 6));
  const ew = rotatedExtent(wide, 45);
  near(ew.w, 11.3137);
  near(ew.h, 11.3137);
  assert.deepEqual(rotatedExtent(wide, 0), { w: 10, h: 6, minX: 0, minY: 0 });
  assert.deepEqual(rotatedExtent(wide, 90), { w: 6, h: 10, minX: 2, minY: -2 });
  assert.deepEqual(rotatedExtent(wide, 180), { w: 10, h: 6, minX: 0, minY: 0 });
  assert.deepEqual(rotatedExtent(wide, -90), rotatedExtent(wide, 270));
  const centered = rotatedExtent(wide, 45);
  near(centered.minX + centered.w / 2, 5);
  near(centered.minY + centered.h / 2, 3);
  assert.deepEqual(rotatedExtent([], 45), { w: 0, h: 0, minX: 0, minY: 0 });
  assert.deepEqual(activeCenter(wide), [5, 3]);
  assert.equal(activeCenter([]), null);
  assert.deepEqual(rotatedExtent([[3, 4]], 45).w > 1.41, true);
});

test('rotatedExtent ignores blocked margins and never alters its input', () => {
  const cells = /** @type {XY[]} */ ([[4, 5], [5, 5], [4, 6]]);
  const before = JSON.stringify(cells);
  const shifted = rotatedExtent(cells.map(([x, y]) => [x - 4, y - 5]), 135);
  const moved = rotatedExtent(cells, 135);
  near(shifted.w, moved.w);
  near(shifted.h, moved.h);
  assert.equal(JSON.stringify(cells), before);
});

test('fitCellSize uses the documented formula and clamps', () => {
  const wide = rotatedExtent(activeCells(rectangle(10, 6)), 45);
  assert.equal(fitCellSize(wide, 900, 500), 40);
  assert.equal(fitCellSize({ w: 6, h: 10 }, 900, 500), 45);
  assert.equal(fitCellSize({ w: 10, h: 6 }, 900, 500), 64);
  assert.equal(fitCellSize({ w: 10, h: 6 }, 100, 100), 14);
  assert.equal(fitCellSize({ w: 9, h: 9 }, 100, 100), 14);
  assert.equal(fitCellSize({ w: 9, h: 9 }, 195, 195), 19);
  assert.equal(fitCellSize({ w: 9, h: 9 }, 190, 190), 19);
  assert.equal(fitCellSize({ w: 9, h: 9 }, 1000, 1000, { max: 30 }), 30);
  assert.equal(fitCellSize({ w: 9, h: 9 }, 500, 500, { min: 5, marginCells: 0 }), 55);
  assert.equal(fitCellSize({ w: 9, h: 9 }, 50, 50, { min: 5 }), 5);
  assert.equal(fitCellSize({ w: 0, h: 0 }, 400, 300), 64);
  assert.equal(fitCellSize({ w: 4, h: 4 }, Number.NaN, 300), 14);
  const heart = rotatedExtent(activeCells(preset('heart', {}).board), 45);
  assert.equal(fitCellSize(heart, 900, 500), 43);
});
