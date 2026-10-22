// @ts-check
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  TRANSFORMS,
  canonicalKey,
  canonicalT,
  compose,
  distinctOrientations,
  hasHole,
  isConnected,
  normalizeCells,
  orientedCells,
  outlineLoops,
  poseCells,
  rotateCCW,
  rotateCW,
  transformCells,
} from '../core/engine/geometry.js';
import { CLASSIC_ORIENTATION_COUNTS, CLASSIC_PENTOMINOES } from './fixtures/polyominoes.js';

/** @typedef {import('../core/engine/types.js').XY} XY */

const L3 = /** @type {XY[]} */ ([[0, 0], [1, 0], [0, 1]]);
const I3 = /** @type {XY[]} */ ([[0, 0], [1, 0], [2, 0]]);
const O4 = /** @type {XY[]} */ ([[0, 0], [1, 0], [0, 1], [1, 1]]);
const D = /** @type {XY[]} */ ([[1, 0], [0, 1], [1, 1]]);
const RING = /** @type {XY[]} */ ([[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2]]);
const F_INPUT = /** @type {XY[]} */ ([[2, 0], [3, 0], [4, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1]]);
const piece = (/** @type {XY[]} */ cells) => ({ id: 'p', label: 'p', color: '#000000', cells });

test('transform table matches the specification', () => {
  const expected = [
    [3, 5], [-5, 3], [-3, -5], [5, -3], [-3, 5], [-5, -3], [3, -5], [5, 3],
  ];
  TRANSFORMS.forEach((fn, t) => {
    assert.deepEqual(fn([3, 5]).map((n) => n + 0), expected[t], `t=${t}`);
  });
  assert.equal(TRANSFORMS.length, 8);
});

test('composition identities and area preservation', () => {
  const sample = /** @type {XY[]} */ ([[0, 0], [3, 1], [-2, 4], [5, -1]]);
  for (let t = 0; t < 8; t += 1) {
    let r = t;
    for (let i = 0; i < 4; i += 1) {
      r = rotateCW(r);
    }
    assert.equal(r, t, 'CW^4');
    assert.equal(rotateCCW(rotateCW(t)), t);
    assert.equal(compose(0, t), t);
    assert.equal(compose(t, 0), t);
    assert.equal(transformCells(sample, t).length, sample.length);
    assert.equal(canonicalKey(transformCells(sample, t)), canonicalKey(sample));
    for (let u = 0; u < 8; u += 1) {
      const want = transformCells(transformCells(sample, u), t);
      assert.deepEqual(transformCells(sample, compose(t, u)), want, `compose(${t},${u})`);
    }
  }
  assert.equal(compose(4, 4), 0, 'mirror squared');
  for (let r = 0; r < 4; r += 1) {
    // M∘R^r = R^-r∘M
    assert.equal(compose(4, r), compose((4 - r) % 4, 4));
  }
  assert.equal(compose(4, 1), compose(rotateCCW(0), 4));
  assert.equal(rotateCW(3), 0);
  assert.equal(rotateCCW(0), 3);
  assert.equal(rotateCW(7), 4);
  assert.equal(rotateCCW(4), 7);
  assert.throws(() => compose(8, 0), RangeError);
  assert.throws(() => transformCells(L3, -1), RangeError);
});

test('normalization sorts numerically, handles negatives and never mutates', () => {
  const input = /** @type {XY[]} */ ([[12, 10], [-3, 10], [10, 9]]);
  const copy = JSON.stringify(input);
  assert.deepEqual(normalizeCells(input), [[13, 0], [0, 1], [15, 1]]);
  assert.equal(JSON.stringify(input), copy);
  assert.deepEqual(normalizeCells([]), []);
  transformCells(input, 5);
  orientedCells(input, 6);
  canonicalKey(input);
  assert.equal(JSON.stringify(input), copy);
  assert.ok(!Object.is(orientedCells([[0, 0]], 2)[0][0], -0));
});

test('pose and orientation vectors', () => {
  assert.deepEqual(orientedCells(D, 1), [[0, 0], [0, 1], [1, 1]]);
  assert.deepEqual(orientedCells(D, 4), [[0, 0], [0, 1], [1, 1]]);
  assert.deepEqual(orientedCells(D, 5), [[0, 0], [1, 0], [0, 1]]);
  const p = piece(D);
  assert.deepEqual(poseCells(p, { piece: 'p', x: 0, y: 0, turn: 1, mirrored: false }), [[0, 0], [0, 1], [1, 1]]);
  assert.deepEqual(poseCells(p, { piece: 'p', x: 0, y: 0, turn: 0, mirrored: true }), [[0, 0], [0, 1], [1, 1]]);
  assert.deepEqual(poseCells(p, { piece: 'p', x: 0, y: 0, turn: 1, mirrored: true }), [[0, 0], [1, 0], [0, 1]]);
  assert.deepEqual(poseCells(p, { piece: 'p', x: 4, y: 7, turn: 1, mirrored: true }), [[4, 7], [5, 7], [4, 8]]);
  // Bounding-box corner may be empty.
  assert.ok(!poseCells(p, { piece: 'p', x: 2, y: 3, turn: 0, mirrored: false }).some(([x, y]) => x === 2 && y === 3));
});

test('canonical keys: vectors, numeric order, translation and reflection invariance', () => {
  assert.equal(canonicalKey(L3), '3:0,0;1,0;0,1');
  assert.equal(canonicalKey(I3), '3:0,0;1,0;2,0');
  assert.equal(canonicalKey(F_INPUT), '8:0,0;1,0;2,0;3,0;4,0;0,1;1,1;2,1');
  assert.equal(canonicalKey([]), '0:');
  // Coordinates above 9 must compare numerically: a long bar must not be mistaken by "10" < "2".
  const bar = /** @type {XY[]} */ (Array.from({ length: 12 }, (_, i) => [i, 0]));
  assert.equal(canonicalKey(bar), `12:${bar.map(([x, y]) => `${x},${y}`).join(';')}`);
  assert.equal(canonicalKey(transformCells(bar, 1)), canonicalKey(bar));
  const shifted = /** @type {XY[]} */ (F_INPUT.map(([x, y]) => [x + 40, y - 17]));
  assert.equal(canonicalKey(shifted), canonicalKey(F_INPUT));
  for (let t = 0; t < 8; t += 1) {
    assert.equal(canonicalKey(transformCells(F_INPUT, t)), canonicalKey(F_INPUT));
  }
  const left = canonicalKey(CLASSIC_PENTOMINOES[3].cells);
  const mirroredN = transformCells(CLASSIC_PENTOMINOES[3].cells, 4);
  assert.equal(canonicalKey(mirroredN), left);
  assert.notEqual(canonicalKey(CLASSIC_PENTOMINOES[0].cells), left);
});

test('distinct orientations and canonicalT', () => {
  const counts = { O4: [O4, 1], I3: [I3, 2], T4: [[[0, 0], [1, 0], [2, 0], [1, 1]], 4], S4: [[[1, 0], [2, 0], [0, 1], [1, 1]], 4], L4: [[[0, 0], [0, 1], [0, 2], [1, 2]], 8], X5: [CLASSIC_PENTOMINOES[9].cells, 1] };
  for (const [name, [cells, n]] of Object.entries(counts)) {
    const list = distinctOrientations(/** @type {XY[]} */ (cells));
    assert.equal(list.length, n, name);
    assert.equal(list[0].t, 0);
    assert.deepEqual(list.map((e) => e.t), [...list.map((e) => e.t)].sort((a, b) => a - b));
  }
  for (const p of CLASSIC_PENTOMINOES) {
    const list = distinctOrientations(p.cells);
    assert.equal(list.length, CLASSIC_ORIENTATION_COUNTS[/** @type {keyof typeof CLASSIC_ORIENTATION_COUNTS} */ (p.id)], p.id);
    assert.deepEqual(p.cells, normalizeCells(p.cells));
    assert.equal(canonicalKey(p.cells), `5:${p.cells.map(([x, y]) => `${x},${y}`).join(';')}`);
    const reps = new Set(list.map((e) => e.t));
    for (let t = 0; t < 8; t += 1) {
      const rep = canonicalT(p.cells, t);
      assert.ok(reps.has(rep));
      assert.ok(rep <= t);
      assert.deepEqual(orientedCells(p.cells, rep), orientedCells(p.cells, t));
    }
  }
  assert.equal(canonicalT(O4, 7), 0);
  assert.equal(canonicalT(I3, 3), 1);
  assert.throws(() => canonicalT(I3, 9), RangeError);
});

test('connectivity uses shared sides only', () => {
  assert.equal(isConnected([[5, 5]]), true);
  assert.equal(isConnected(RING), true);
  assert.equal(isConnected([[0, 0], [1, 1]]), false);
  assert.equal(isConnected([[0, 0], [2, 0]]), false);
  assert.equal(isConnected([[-1, -1], [0, -1], [0, 0]]), true);
  assert.equal(isConnected([]), false);
});

test('hole detection', () => {
  assert.equal(hasHole(RING), true);
  assert.equal(hasHole(O4), false);
  assert.equal(hasHole([[0, 0]]), false);
  assert.equal(hasHole(CLASSIC_PENTOMINOES[6].cells), false, 'U has a notch, not a hole');
  const padded = /** @type {XY[]} */ (RING.map(([x, y]) => [x - 7, y - 9]));
  assert.equal(hasHole(padded), true);
  assert.equal(hasHole([[1, 0], [0, 1], [2, 1], [1, 2]]), true, 'diamond ring');
  assert.equal(hasHole([[0, 0], [1, 0], [2, 0], [0, 1], [0, 2], [1, 2], [2, 2]]), false, 'gapped ring');
});

/**
 * Even-odd test of a cell centre against loops.
 * @param {XY[][]} loops
 * @param {number} px
 * @param {number} py
 */
function insideEvenOdd(loops, px, py) {
  let inside = false;
  for (const loop of loops) {
    for (let i = 0; i < loop.length; i += 1) {
      const [x1, y1] = loop[i];
      const [x2, y2] = loop[(i + 1) % loop.length];
      if ((y1 > py) !== (y2 > py) && px < x1 + ((py - y1) * (x2 - x1)) / (y2 - y1)) {
        inside = !inside;
      }
    }
  }
  return inside;
}

/**
 * @param {XY[]} cells
 */
function assertRasterMatches(cells) {
  const loops = outlineLoops(cells);
  const filled = new Set(cells.map(([x, y]) => `${x},${y}`));
  const xs = cells.map(([x]) => x);
  const ys = cells.map(([, y]) => y);
  for (let y = Math.min(...ys) - 2; y <= Math.max(...ys) + 2; y += 1) {
    for (let x = Math.min(...xs) - 2; x <= Math.max(...xs) + 2; x += 1) {
      assert.equal(insideEvenOdd(loops, x + 0.5, y + 0.5), filled.has(`${x},${y}`), `cell ${x},${y}`);
    }
  }
}

test('outline loops: single cell, rectangle and merged collinear vertices', () => {
  assert.deepEqual(outlineLoops([[0, 0]]), [[[0, 0], [1, 0], [1, 1], [0, 1]]]);
  assert.deepEqual(outlineLoops([[-3, -2]]), [[[-3, -2], [-2, -2], [-2, -1], [-3, -1]]]);
  assert.deepEqual(outlineLoops(O4), [[[0, 0], [2, 0], [2, 2], [0, 2]]]);
  assert.deepEqual(outlineLoops(I3), [[[0, 0], [3, 0], [3, 1], [0, 1]]]);
  assert.deepEqual(outlineLoops(L3), [[[0, 0], [2, 0], [2, 1], [1, 1], [1, 2], [0, 2]]]);
  assert.deepEqual(outlineLoops([]), []);
});

test('outline loops cover exactly the input cells', () => {
  for (const cells of [O4, L3, D, RING, F_INPUT, ...CLASSIC_PENTOMINOES.map((p) => p.cells)]) {
    assertRasterMatches(cells);
  }
  const concave = /** @type {XY[]} */ ([[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2], [3, 2]]);
  assertRasterMatches(concave);
  assertRasterMatches(RING.map(([x, y]) => [x - 20, y - 20]));
});

test('outline loops: ring has an outer and a hole loop', () => {
  const loops = outlineLoops(RING);
  assert.deepEqual(loops, [
    [[0, 0], [3, 0], [3, 3], [0, 3]],
    [[1, 1], [1, 2], [2, 2], [2, 1]],
  ]);
});

test('outline loops: corner contacts stay separate', () => {
  const diagonal = outlineLoops([[0, 0], [1, 1]]);
  assert.deepEqual(diagonal, [
    [[0, 0], [1, 0], [1, 1], [0, 1]],
    [[1, 1], [2, 1], [2, 2], [1, 2]],
  ]);
  // Two L-shapes meeting at one corner around an empty cell stay two loops.
  const pinched = /** @type {XY[]} */ ([[0, 0], [1, 0], [0, 1], [2, 2], [1, 2], [2, 1]]);
  assert.equal(outlineLoops(pinched).length, 2);
  assertRasterMatches(pinched);
});

test('outline loops are deterministic and ignore input order', () => {
  const shuffled = [...RING].reverse();
  assert.deepEqual(outlineLoops(shuffled), outlineLoops(RING));
  const copy = JSON.stringify(RING);
  outlineLoops(RING);
  assert.equal(JSON.stringify(RING), copy);
});

/**
 * Independent grow-and-canonicalize enumerator: its own canonical form
 * (zero-padded text) rather than geometry.js's canonicalKey.
 * @param {number} maxSize
 * @returns {Map<string, XY[]>[]} free polyominoes by size (index = size)
 */
function enumerateFree(maxSize) {
  /** @param {XY[]} cells */
  const canon = (cells) => {
    const maps = [
      ([x, y]) => [x, y], ([x, y]) => [-y, x], ([x, y]) => [-x, -y], ([x, y]) => [y, -x],
      ([x, y]) => [-x, y], ([x, y]) => [y, x], ([x, y]) => [x, -y], ([x, y]) => [-y, -x],
    ];
    let best = '';
    /** @type {XY[]} */
    let bestCells = [];
    for (const m of maps) {
      const moved = cells.map((c) => /** @type {XY} */ (m(c)));
      const mx = Math.min(...moved.map((c) => c[0]));
      const my = Math.min(...moved.map((c) => c[1]));
      const norm = /** @type {XY[]} */ (moved.map(([x, y]) => [x - mx, y - my]));
      norm.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
      const text = norm.map(([x, y]) => `${String(y).padStart(3, '0')}${String(x).padStart(3, '0')}`).join('');
      if (best === '' || text < best) {
        best = text;
        bestCells = norm;
      }
    }
    return { text: best, cells: bestCells };
  };
  /** @type {Map<string, XY[]>[]} */
  const levels = [new Map(), new Map([['000000', [[0, 0]]]])];
  for (let n = 2; n <= maxSize; n += 1) {
    const next = new Map();
    for (const parent of levels[n - 1].values()) {
      const have = new Set(parent.map(([x, y]) => `${x},${y}`));
      for (const [x, y] of parent) {
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (have.has(`${x + dx},${y + dy}`)) {
            continue;
          }
          const { text, cells } = canon([...parent, [x + dx, y + dy]]);
          next.set(text, cells);
        }
      }
    }
    levels.push(next);
  }
  return levels;
}

test('free polyomino counts for sizes 1-8 and canonicalKey agreement', () => {
  const levels = enumerateFree(8);
  assert.deepEqual(levels.slice(1).map((m) => m.size), [1, 1, 2, 5, 12, 35, 108, 369]);
  const holeFree = levels.slice(1).map((m) => [...m.values()].filter((c) => !hasHole(c)).length);
  assert.deepEqual(holeFree.slice(6), [107, 363]);
  for (const level of levels.slice(1)) {
    const keys = new Set();
    for (const cells of level.values()) {
      assert.ok(isConnected(cells));
      keys.add(canonicalKey(cells));
      // Rotated/reflected copies never produce another key.
      assert.equal(canonicalKey(transformCells(cells, 5)), canonicalKey(cells));
    }
    assert.equal(keys.size, level.size);
  }
});

test('hole-free counts for sizes 9 and 10 (slow)', () => {
  const levels = enumerateFree(10);
  assert.equal(levels[9].size, 1285);
  assert.equal(levels[10].size, 4655);
  assert.equal([...levels[9].values()].filter((c) => !hasHole(c)).length, 1248);
  assert.equal([...levels[10].values()].filter((c) => !hasHole(c)).length, 4460);
});
