// @ts-check
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boardFromRows } from '../core/engine/board.js';
import { certify, countRowLimit, makeUnique } from '../core/engine/clues.js';
import { poseCells } from '../core/engine/geometry.js';
import { createRng } from '../core/engine/rng.js';
import { buildModel, countSolutions, ModelError, solveFirst } from '../core/engine/tiling.js';
import { createWorkspace, MAIN_WORKSPACE_BYTES } from '../core/engine/workspace.js';
import { CLASSIC_PENTOMINOES } from './fixtures/polyominoes.js';

/** @typedef {import('../core/engine/types.js').Piece} Piece */
/** @typedef {import('../core/engine/types.js').Pose} Pose */

const ws = createWorkspace(MAIN_WORKSPACE_BYTES);
const rect = (/** @type {number} */ w, /** @type {number} */ h) => boardFromRows(Array(h).fill('#'.repeat(w)));
const piece = (/** @type {string} */ id, /** @type {[number, number][]} */ cells) => ({ id, label: id, color: '#123456', cells });
const pose = (/** @type {string} */ id, /** @type {number} */ x, /** @type {number} */ y, turn = 0, mirrored = false) =>
  /** @type {Pose} */ ({ piece: id, x, y, turn: /** @type {0} */ (turn), mirrored });

const p5 = piece('P', [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1]]);
const mono = piece('M', [[0, 0]]);
const pieces12 = /** @type {Piece[]} */ ([...CLASSIC_PENTOMINOES]);

/** @param {ReturnType<typeof rect>} b @param {Piece[]} ps @param {Pose[]} clues @param {number} cap */
function raw(b, ps, clues, cap) {
  return countSolutions(buildModel(b, ps, clues, ws), { cap, rowTrialLimit: 1e6 });
}

test('raw solution counts of tiny problems', () => {
  const b = rect(3, 2);
  assert.equal(raw(b, [p5, mono], [], 10).found, 4);
  assert.equal(raw(b, [p5, mono], [pose('M', 0, 0)], 10).found, 1);
  assert.equal(raw(b, [p5, mono], [pose('M', 1, 0)], 10).found, 0);
  assert.equal(raw(rect(2, 2), [piece('a', [[0, 0], [1, 0]]), piece('b', [[0, 0], [1, 0]])], [], 10).found, 4);
});

test('a reflected alternative counts as a second raw solution', () => {
  const found = raw(rect(3, 2), [p5, mono], [], 10);
  assert.equal(found.found, 4);
  const witnessesOf = (/** @type {Pose[][]} */ list) => list.map((w) => {
    const placed = /** @type {Pose} */ (w.find((p) => p.piece === 'P'));
    return poseCells(p5, placed).map(([x, y]) => `${x},${y}`).sort().join(' ');
  });
  const feet = witnessesOf(raw(rect(3, 2), [p5, mono], [], 4).witnesses);
  assert.equal(new Set(feet).size, 4);
  const mirrored = feet.map((f) => f.split(' ').map((c) => `${2 - Number(c.split(',')[0])},${c.split(',')[1]}`).sort().join(' '));
  for (const m of mirrored) {
    assert.ok(feet.includes(m), 'the mirror image of every solution is also counted');
  }
  assert.equal(certify(rect(3, 2), [p5, mono], [], ws, 10000).status, 'multiple');
});

test('symmetric pieces do not create duplicate poses', () => {
  const plus = rect(3, 3);
  plus.active[0] = 0;
  plus.active[2] = 0;
  plus.active[6] = 0;
  plus.active[8] = 0;
  const x = /** @type {Piece} */ (pieces12.find((p) => p.id === 'X'));
  assert.equal(raw(plus, [x], [], 10).found, 1);
  assert.equal(certify(plus, [x], [], ws, 10000).status, 'unique');
  const domino = piece('D', [[0, 0], [1, 0]]);
  assert.equal(certify(rect(2, 1), [domino], [], ws, 100).status, 'unique');
  assert.equal(certify(rect(1, 2), [domino], [], ws, 100).status, 'unique');
});

test('certificate statuses follow the evidence table', () => {
  const unique = certify(rect(3, 2), [p5, mono], [pose('M', 0, 0)], ws, 10000);
  assert.deepEqual(unique, { status: 'unique', model: 'dlx-v1', rowLimit: 10000, verified: true });
  assert.equal(certify(rect(3, 2), [p5, mono], [], ws, 10000).status, 'multiple');
  assert.equal(certify(rect(3, 2), [p5, mono], [pose('M', 1, 0)], ws, 10000).status, 'unsatisfiable');
  assert.equal(certify(rect(4, 1), [piece('a', [[0, 0], [1, 0], [2, 0]]), piece('b', [[0, 0], [1, 0]])], [], ws, 10000).status, 'unsatisfiable');
  assert.equal(certify(rect(2, 2), [p5, mono], [], ws, 10000).status, 'unsatisfiable');
});

test('a cutoff with zero or one solution found proves nothing', () => {
  const board = rect(10, 6);
  assert.equal(certify(board, pieces12, [], ws, 5).status, 'not-proved');
  const first = solveFirst(buildModel(board, pieces12, [], ws), { rowTrialLimit: 1e6 });
  const oneThenCutoff = certify(board, pieces12, [], ws, first.rowTrials);
  assert.equal(oneThenCutoff.status, 'not-proved');
  assert.equal(oneThenCutoff.rowLimit, first.rowTrials);
  assert.equal(certify(board, pieces12, [], ws, 100000).status, 'multiple');
});

test('invalid clues are errors, not certificates', () => {
  assert.throws(() => certify(rect(3, 2), [p5, mono], [pose('M', 7, 7)], ws, 100), ModelError);
});

test('the raw row limit depends on the active area', () => {
  assert.equal(countRowLimit(rect(10, 20)), 10000);
  assert.equal(countRowLimit(rect(10, 21)), 2000);
});

test('makeUnique stops at K - 2 clues, seeds its ties and keeps proven sets unchanged', () => {
  const b = rect(5, 3);
  const ps = ['P', 'U', 'V'].map((id) => /** @type {Piece} */ (pieces12.find((p) => p.id === id)));
  const layout = /** @type {Pose[]} */ (solveFirst(buildModel(b, ps, [], ws), { rowTrialLimit: 1e6 }).layout);
  const outcomes = new Set();
  for (let i = 0; i < 12; i += 1) {
    const result = makeUnique(b, ps, layout, [], createRng(`tie-${i}`), ws, 10000);
    outcomes.add(result === null ? 'null' : result.map((p) => p.piece).join());
    if (result !== null) {
      assert.equal(result.length, 1);
      assert.equal(certify(b, ps, result, ws, 10000).status, 'unique');
    }
  }
  assert.ok(outcomes.size > 1 && [...outcomes].some((o) => o !== 'null'), [...outcomes].join(' | '));
  const proven = layout.filter((p) => p.piece === 'P');
  assert.deepEqual(makeUnique(b, ps, layout, proven, createRng('same'), ws, 10000), proven);
  const twoClues = layout.slice(0, 2);
  assert.equal(makeUnique(b, ps, layout, twoClues, createRng('over'), ws, 10000), null);
});

test('makeUnique repairs a real puzzle and the result certifies as unique', () => {
  const board = rect(10, 6);
  const layout = /** @type {Pose[]} */ (solveFirst(buildModel(board, pieces12, [], ws), { rowTrialLimit: 1e6 }).layout);
  const start = layout.slice(0, 3);
  assert.notEqual(certify(board, pieces12, start, ws, 10000).status, 'unique');
  const repaired = makeUnique(board, pieces12, layout, start, createRng('real'), ws, 10000);
  assert.ok(repaired !== null);
  assert.ok(repaired.length > start.length && repaired.length <= 10);
  assert.deepEqual(repaired.slice(0, 3), start);
  for (const clue of repaired) {
    assert.ok(layout.some((p) => p.piece === clue.piece && p.x === clue.x && p.y === clue.y
      && p.turn === clue.turn && p.mirrored === clue.mirrored));
  }
  assert.equal(certify(board, pieces12, repaired, ws, 10000).status, 'unique');
});

test('makeUnique never reports uniqueness from a cutoff or beyond K - 2 clues', () => {
  const board = rect(10, 6);
  const layout = /** @type {Pose[]} */ (solveFirst(buildModel(board, pieces12, [], ws), { rowTrialLimit: 1e6 }).layout);
  assert.equal(makeUnique(board, pieces12, layout, layout.slice(0, 3), createRng('cut'), ws, 3), null);
  assert.equal(makeUnique(board, pieces12, layout, layout.slice(0, 11), createRng('full'), ws, 10000), null);
});
