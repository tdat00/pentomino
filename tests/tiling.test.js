// @ts-check
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boardFromRows } from '../core/engine/board.js';
import { canonicalKey, poseCells } from '../core/engine/geometry.js';
import { countModel, createWorkspace, MAIN_WORKSPACE_BYTES } from '../core/engine/workspace.js';
import { createRng } from '../core/engine/rng.js';
import { buildModel, countSolutions, isValidLayout, ModelError, rowPose, solveFirst } from '../core/engine/tiling.js';
import { CLASSIC_PENTOMINOES } from './fixtures/polyominoes.js';

/** @typedef {import('../core/engine/types.js').Piece} Piece */
/** @typedef {import('../core/engine/types.js').Pose} Pose */
/** @typedef {import('../core/engine/types.js').Board} Board */

const pieces = /** @type {Piece[]} */ ([...CLASSIC_PENTOMINOES]);
const rect = (/** @type {number} */ w, /** @type {number} */ h) => boardFromRows(Array(h).fill('#'.repeat(w)));
const newWs = () => createWorkspace(MAIN_WORKSPACE_BYTES);

/** @param {Piece[]} ps @param {Pose[]} layout */
const footprints = (ps, layout) => layout.map((pose) => {
  const piece = /** @type {Piece} */ (ps.find((p) => p.id === pose.piece));
  return `${pose.piece}:${poseCells(piece, pose).map(([x, y]) => `${x},${y}`).sort().join(' ')}`;
}).sort().join('|');

// An independent tiler: its own transform formulas, no geometry module, no DLX.
/** @type {((c: number[]) => number[])[]} */
const TF = [
  ([x, y]) => [x, y], ([x, y]) => [-y, x], ([x, y]) => [-x, -y], ([x, y]) => [y, -x],
  ([x, y]) => [-x, y], ([x, y]) => [-y, -x], ([x, y]) => [x, -y], ([x, y]) => [y, x],
];

/**
 * Raw count of piece-to-cell-set assignments.
 * @param {Board} b
 * @param {Piece[]} ps
 * @param {Pose[]} clues
 */
function bruteCount(b, ps, clues) {
  const cellsOf = (/** @type {Piece} */ p, /** @type {Pose} */ pose) =>
    poseCells(p, pose).map(([x, y]) => y * b.width + x);
  const taken = new Uint8Array(b.active.length);
  for (const c of clues) {
    for (const at of cellsOf(/** @type {Piece} */ (ps.find((p) => p.id === c.piece)), c)) {
      taken[at] = 1;
    }
  }
  const free = ps.filter((p) => !clues.some((c) => c.piece === p.id));
  /** @type {Map<string, number[][]>} */
  const shapes = new Map(free.map((p) => {
    const seen = new Set();
    /** @type {number[][]} */
    const list = [];
    for (const f of TF) {
      const moved = p.cells.map((c) => f(c));
      const minX = Math.min(...moved.map((c) => c[0]));
      const minY = Math.min(...moved.map((c) => c[1]));
      const norm = moved.map(([x, y]) => [x - minX, y - minY]);
      const key = norm.map((c) => c.join(',')).sort().join(';');
      if (!seen.has(key)) {
        seen.add(key);
        list.push(norm.flat());
      }
    }
    return [p.id, list];
  }));
  const used = new Set();
  /** @returns {number} */
  const go = () => {
    let first = -1;
    for (let i = 0; i < taken.length; i += 1) {
      if (b.active[i] === 1 && taken[i] === 0) {
        first = i;
        break;
      }
    }
    if (first < 0) {
      return used.size === free.length ? 1 : 0;
    }
    const fx = first % b.width;
    const fy = Math.floor(first / b.width);
    let total = 0;
    for (const p of free) {
      if (used.has(p.id)) {
        continue;
      }
      for (const flat of /** @type {number[][]} */ (shapes.get(p.id))) {
        for (let k = 0; k < flat.length; k += 2) {
          const cells = [];
          let ok = true;
          for (let j = 0; j < flat.length && ok; j += 2) {
            const x = fx + flat[j] - flat[k];
            const y = fy + flat[j + 1] - flat[k + 1];
            const at = y * b.width + x;
            ok = x >= 0 && y >= 0 && x < b.width && y < b.height && b.active[at] === 1 && taken[at] === 0;
            cells.push(at);
          }
          if (ok) {
            cells.forEach((at) => { taken[at] = 1; });
            used.add(p.id);
            total += go();
            used.delete(p.id);
            cells.forEach((at) => { taken[at] = 0; });
          }
        }
      }
    }
    return total;
  };
  return go();
}

const MONO = [[0, 0]];
const DOMINO = [[0, 0], [1, 0]];
const I3 = [[0, 0], [1, 0], [2, 0]];
const L3 = [[0, 0], [1, 0], [0, 1]];
const TETS = [[[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 0], [1, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [2, 0], [0, 1]]];
const SHAPES = /** @type {[number, number][][]} */ ([MONO, DOMINO, I3, L3, ...TETS]);

test('DLX agrees with an independent brute-force tiler on random tiny boards, blocked cells and clues', () => {
  const rng = createRng('tiling-oracle');
  const ws = newWs();
  let withClues = 0;
  let solvable = 0;
  for (let trial = 0; trial < 250; trial += 1) {
    const ps = Array.from({ length: 1 + rng.int(4) }, (_, i) => ({
      id: `p${i}`, label: `p${i}`, color: '#000000', cells: SHAPES[rng.int(SHAPES.length)],
    }));
    const area = ps.reduce((n, p) => n + p.cells.length, 0);
    const w = 3 + rng.int(3);
    const h = 3 + rng.int(2);
    if (area > w * h) {
      continue;
    }
    const active = new Uint8Array(w * h).fill(1);
    for (let blocked = 0; blocked < w * h - area;) {
      const at = rng.int(w * h);
      if (active[at] === 1) {
        active[at] = 0;
        blocked += 1;
      }
    }
    const board = { width: w, height: h, active };
    /** @type {Pose[]} */
    const clues = [];
    if (rng.int(2) === 0) {
      const piece = ps[rng.int(ps.length)];
      const pose = /** @type {Pose} */ ({ piece: piece.id, x: rng.int(w), y: rng.int(h), turn: rng.int(4), mirrored: rng.int(2) === 1 });
      if (poseCells(piece, pose).every(([x, y]) => x >= 0 && y >= 0 && x < w && y < h && active[y * w + x] === 1)) {
        clues.push(pose);
        withClues += 1;
      }
    }
    const expected = bruteCount(board, ps, clues);
    const model = buildModel(board, ps, clues, ws);
    const r = countSolutions(model, { cap: Infinity, rowTrialLimit: Infinity });
    assert.equal(r.found, expected, `trial ${trial}`);
    assert.equal(r.exhausted, true);
    solvable += expected > 0 ? 1 : 0;
    assert.equal(new Set(r.witnesses.map((l) => footprints(ps, l))).size, r.found);
    for (const layout of r.witnesses) {
      assert.ok(isValidLayout(board, ps, layout));
      for (const c of clues) {
        assert.deepEqual(layout.find((p) => p.piece === c.piece), c);
      }
    }
    assert.equal(solveFirst(model, { rowTrialLimit: Infinity }).layout !== null, expected > 0);
  }
  assert.ok(withClues > 20 && solvable > 40, `weak sample: ${withClues} clued, ${solvable} solvable`);
});

test('classic raw count 3x20 is 8', () => {
  const model = buildModel(rect(20, 3), pieces, [], newWs());
  assert.equal(countSolutions(model, { cap: Infinity, rowTrialLimit: Infinity, witnessLimit: 0 }).found, 8);
});

for (const [w, h, expected] of [[15, 4, 1472], [12, 5, 4040], [10, 6, 9356]]) {
  test(`classic raw count ${h}x${w} is ${expected} (slow)`, () => {
    const model = buildModel(rect(w, h), pieces, [], newWs());
    const r = countSolutions(model, { cap: Infinity, rowTrialLimit: Infinity, witnessLimit: 0 });
    assert.equal(r.found, expected);
    assert.equal(r.exhausted, true);
  });
}

test('witnesses are complete valid layouts including clues, sorted by canonical piece order', () => {
  const board = rect(10, 6);
  const first = solveFirst(buildModel(board, pieces, [], newWs()), { rowTrialLimit: Infinity });
  const layout = /** @type {Pose[]} */ (first.layout);
  assert.equal(layout.length, 12);
  assert.ok(isValidLayout(board, pieces, layout));
  const clue = layout.find((p) => p.piece === 'P');
  const model = buildModel(board, pieces, [/** @type {Pose} */ (clue)], newWs());
  const again = /** @type {Pose[]} */ (solveFirst(model, { rowTrialLimit: Infinity }).layout);
  assert.equal(again.length, 12);
  assert.deepEqual(again.find((p) => p.piece === 'P'), clue);
  assert.deepEqual(again.map((p) => p.piece), model.pieceOrder);
  assert.deepEqual(model.freePieces, model.pieceOrder.filter((id) => id !== 'P'));
  assert.ok(isValidLayout(board, pieces, again));
});

test('certificate evidence: cutoffs prove nothing, exhaustion does', () => {
  const ws = newWs();
  const domino = (/** @type {string} */ id) => ({ id, label: id, color: '#000000', cells: DOMINO });
  const one = buildModel(rect(2, 1), [domino('a')], [], ws);
  assert.deepEqual(
    (({ found, exhausted }) => ({ found, exhausted }))(countSolutions(one, { cap: 1, rowTrialLimit: Infinity })),
    { found: 1, exhausted: false },
  );
  assert.deepEqual(
    (({ found, exhausted }) => ({ found, exhausted }))(countSolutions(one, { cap: 2, rowTrialLimit: Infinity })),
    { found: 1, exhausted: true },
  );
  const many = buildModel(rect(2, 2), [domino('a'), domino('b')], [], ws);
  const two = countSolutions(many, { cap: 2, rowTrialLimit: Infinity });
  assert.equal(two.found, 2);
  assert.equal(two.exhausted, false);
  assert.equal(two.witnesses.length, 2);
  const none = buildModel(rect(3, 1), [domino('a'), domino('b')], [], ws);
  const zero = solveFirst(none, { rowTrialLimit: Infinity });
  assert.equal(zero.layout, null);
  assert.equal(zero.exhausted, true);
  assert.equal(zero.stop, 'exhausted');
  const cut = buildModel(rect(10, 6), pieces, [], ws);
  const limited = solveFirst(cut, { rowTrialLimit: 3 });
  assert.equal(limited.layout, null);
  assert.equal(limited.exhausted, false);
  assert.equal(limited.stop, 'row-limit');
  assert.equal(limited.rowTrials, 3);
  assert.equal(countSolutions(cut, { cap: 5, rowTrialLimit: 3 }).found, 0);
});

test('a symmetric piece with several equivalent t values is one row per footprint', () => {
  const x = /** @type {Piece} */ (pieces.find((p) => p.id === 'X'));
  const cross = boardFromRows(['.#.', '###', '.#.']);
  const model = buildModel(cross, [x], [], newWs());
  assert.equal(model.cover.rowCount, 1);
  assert.deepEqual([...model.placementsPerPiece], [1]);
  assert.equal(model.rowT[0], 0);
  assert.deepEqual(rowPose(model, 0), { piece: 'X', x: 0, y: 0, turn: 0, mirrored: false });
  assert.equal(countSolutions(model, { cap: 10, rowTrialLimit: Infinity }).found, 1);
  const clued = buildModel(cross, [x], [{ piece: 'X', x: 0, y: 0, turn: 3, mirrored: true }], newWs());
  const r = countSolutions(clued, { cap: 10, rowTrialLimit: Infinity });
  assert.equal(r.found, 1);
  assert.deepEqual(r.witnesses[0], [{ piece: 'X', x: 0, y: 0, turn: 3, mirrored: true }]);
});

test('rows are in canonical order and rowPose reproduces each footprint', () => {
  const board = boardFromRows(['#####.', '######', '.#####', '######']);
  const ws = newWs();
  const model = buildModel(board, pieces.slice(0, 4), [], ws);
  assert.equal(model.cover.rowCount, countModel(board, pieces.slice(0, 4), []).rows);
  assert.equal(model.placementsPerPiece.reduce((a, b) => a + b, 0), model.cover.rowCount);
  /** @type {number[][]} */
  const tuples = [];
  for (let r = 0; r < model.cover.rowCount; r += 1) {
    const pose = rowPose(model, r);
    const piece = /** @type {Piece} */ (pieces.find((p) => p.id === pose.piece));
    const cells = poseCells(piece, pose);
    assert.ok(cells.every(([x, y]) => board.active[y * 6 + x] === 1));
    tuples.push([model.rowPiece[r], ...cells.map(([x, y]) => y * 6 + x).sort((a, b) => a - b)]);
  }
  const sorted = tuples.slice().sort((a, b) => {
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) {
        return a[i] - b[i];
      }
    }
    return 0;
  });
  assert.deepEqual(tuples, sorted);
  assert.equal(new Set(tuples.map((t) => t.join(','))).size, tuples.length);
  assert.throws(() => rowPose(model, model.cover.rowCount), RangeError);
});

test('input ids, colors and order do not change the search traversal of distinct shapes', () => {
  const board = rect(10, 6);
  const renamed = pieces.map((p, i) => ({ ...p, id: `q${99 - i}`, label: 'x', color: '#123456' })).reverse();
  const a = solveFirst(buildModel(board, pieces, [], newWs()), { rowTrialLimit: Infinity });
  const b = solveFirst(buildModel(board, renamed, [], newWs()), { rowTrialLimit: Infinity });
  assert.equal(a.rowTrials, b.rowTrials);
  assert.equal(a.branchTrials, b.branchTrials);
  /** @param {Piece[]} ps @param {Pose[]} layout */
  const byShape = (ps, layout) => layout.map((pose) => {
    const piece = /** @type {Piece} */ (ps.find((p) => p.id === pose.piece));
    return `${canonicalKey(piece.cells)}@${poseCells(piece, pose).map(([x, y]) => `${x},${y}`).sort().join(' ')}`;
  }).sort();
  assert.deepEqual(byShape(pieces, /** @type {Pose[]} */ (a.layout)), byShape(renamed, /** @type {Pose[]} */ (b.layout)));
});

test('identical shapes keep raw solver identities', () => {
  const twins = ['a', 'b'].map((id) => ({ id, label: id, color: '#000000', cells: DOMINO }));
  const r = countSolutions(buildModel(rect(2, 2), twins, [], newWs()), { cap: Infinity, rowTrialLimit: Infinity });
  assert.equal(r.found, 4);
});

test('seeded search is reproducible and canonical search consumes no randomness', () => {
  const model = buildModel(rect(10, 6), pieces, [], newWs());
  const run = (/** @type {string} */ seed) => solveFirst(model, { rng: createRng(seed), rowTrialLimit: Infinity });
  assert.deepEqual(run('s1'), run('s1'));
  assert.ok(isValidLayout(rect(10, 6), pieces, /** @type {Pose[]} */ (run('s1').layout)));
  assert.deepEqual(solveFirst(model, { rowTrialLimit: Infinity }), solveFirst(model, { rowTrialLimit: Infinity }));
});

test('guards fire before allocation and a rebuilt workspace invalidates the old model', () => {
  const tiny = createWorkspace(1024);
  assert.throws(() => buildModel(rect(10, 6), pieces, [], tiny), (e) => e instanceof ModelError && e.code === 'model-too-large');
  assert.equal(tiny.bytes(), 0);
  assert.throws(() => buildModel(rect(10, 6), pieces, [{ piece: 'nope', x: 0, y: 0, turn: 0, mirrored: false }], newWs()),
    (e) => e instanceof ModelError && e.code === 'invalid-clue');

  const ws = newWs();
  const old = buildModel(rect(10, 6), pieces, [], ws);
  buildModel(rect(2, 1), [{ id: 'a', label: 'a', color: '#000000', cells: DOMINO }], [], ws);
  assert.throws(() => solveFirst(old, { rowTrialLimit: 1 }), /stale/);
  assert.throws(() => countSolutions(old, { cap: 1, rowTrialLimit: 1 }), /stale/);
});

test('isValidLayout checks cover, overlap, blocked cells and one pose per id', () => {
  const dominoes = ['a', 'b'].map((id) => ({ id, label: id, color: '#000000', cells: DOMINO }));
  const board = boardFromRows(['##', '#.', '##']);
  const poseA = { piece: 'a', x: 0, y: 0, turn: 0, mirrored: false };
  const poseB = { piece: 'b', x: 0, y: 2, turn: 0, mirrored: false };
  const good = /** @type {Pose[]} */ ([poseA, poseB]);
  const ok = (/** @type {Pose[]} */ l, /** @type {Piece[]} */ ps = dominoes) => isValidLayout(board, ps, l);
  assert.equal(ok(good), false, 'two dominoes cover 4 of 5 cells');
  const three = [...dominoes, { id: 'c', label: 'c', color: '#000000', cells: MONO }];
  const full = /** @type {Pose[]} */ ([poseA, poseB, { piece: 'c', x: 0, y: 1, turn: 0, mirrored: false }]);
  assert.equal(ok(full, three), true);
  assert.equal(ok(full.slice(0, 2), three), false, 'missing piece');
  assert.equal(ok([...full, poseA], three), false, 'extra pose');
  assert.equal(ok([poseA, poseA, full[2]], three), false, 'repeated piece');
  assert.equal(ok([poseA, { ...poseB, piece: 'z' }, full[2]], three), false, 'unknown piece');
  assert.equal(ok([poseA, { ...poseB, y: 1 }, full[2]], three), false, 'overlap');
  assert.equal(ok([poseA, poseB, { ...full[2], x: 1, y: 1 }], three), false, 'blocked cell');
  assert.equal(ok([poseA, { ...poseB, x: 1 }, full[2]], three), false, 'off board');
  assert.equal(ok([poseA, poseB, { ...full[2], turn: 7 }], three), false, 'malformed pose');
  assert.equal(isValidLayout(board, [dominoes[0], dominoes[0]], good), false, 'duplicate piece ids');
});

test('a different valid completion is accepted and symmetric poses are one layout', () => {
  const board = rect(10, 6);
  const a = /** @type {Pose[]} */ (solveFirst(buildModel(board, pieces, [], newWs()), { rowTrialLimit: Infinity }).layout);
  const b = /** @type {Pose[]} */ (solveFirst(buildModel(board, pieces, [], newWs()), { rng: createRng('other'), rowTrialLimit: Infinity }).layout);
  assert.ok(isValidLayout(board, pieces, b));
  assert.notEqual(footprints(pieces, a), footprints(pieces, b));
  // The same footprint through another equivalent X pose is still one arrangement.
  const x = a.find((p) => p.piece === 'X');
  const altered = a.map((p) => (p === x ? { ...p, turn: /** @type {0 | 1 | 2 | 3} */ ((p.turn + 1) % 4), mirrored: !p.mirrored } : p));
  assert.ok(isValidLayout(board, pieces, altered));
  assert.equal(footprints(pieces, altered), footprints(pieces, a));
});
