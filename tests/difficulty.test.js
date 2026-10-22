// @ts-check
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boardFromRows } from '../core/engine/board.js';
import { inBand, measure, MODEL, rate, score, UnsatisfiableError } from '../core/engine/difficulty.js';
import { level, levelForScore } from '../core/engine/levels.js';
import { buildModel, solveFirst } from '../core/engine/tiling.js';
import { createWorkspace, MAIN_WORKSPACE_BYTES } from '../core/engine/workspace.js';
import { CLASSIC_PENTOMINOES } from './fixtures/polyominoes.js';

/** @typedef {import('../core/engine/types.js').Piece} Piece */
/** @typedef {import('../core/engine/types.js').Pose} Pose */

const ws = createWorkspace(MAIN_WORKSPACE_BYTES);
const rect = (/** @type {number} */ w, /** @type {number} */ h) => boardFromRows(Array(h).fill('#'.repeat(w)));
const pieces = /** @type {Piece[]} */ ([...CLASSIC_PENTOMINOES]);
const board60 = rect(10, 6);

/** @returns {Pose[]} */
function witness60() {
  const first = solveFirst(buildModel(board60, pieces, [], ws), { rowTrialLimit: 1e6 }).layout;
  return /** @type {Pose[]} */ (first);
}

const mono = { id: 'M', label: 'M', color: '#000000', cells: /** @type {[number, number][]} */ ([[0, 0]]) };
const p5 = /** @type {Piece} */ (pieces.find((p) => p.id === 'P'));

test('worked (U, B) to D examples', () => {
  const table = [[0, 0, 0], [3, 0, 6], [4, 3, 13], [5, 10, 18], [8, 0, 16], [11, 999, 46], [12, 5000, 54],
    [40, 5000, 110], [41, 5000, 112], [66, 5000, 162]];
  for (const [U, B, D] of table) {
    assert.equal(score(U, B), D, `U=${U} B=${B}`);
  }
  assert.equal(score(0, 5000), 0);
  assert.throws(() => score(-1, 0), RangeError);
  assert.throws(() => score(2, 1.5), RangeError);
});

test('worked scores land in the documented levels', () => {
  const levels = [[0, 'very-easy'], [6, 'very-easy'], [13, 'normal'], [18, 'hard'], [46, 'master'], [54, 'nightmare'],
    [110, 'hell-1'], [112, 'hell-2'], [162, 'hell-3']];
  for (const [D, id] of levels) {
    assert.equal(levelForScore(/** @type {number} */ (D)).id, id);
  }
});

test('inBand uses an inclusive minimum and an exclusive maximum', () => {
  const target = level('hard');
  const at = (/** @type {number} */ s) => /** @type {import('../core/engine/types.js').Rating} */ ({ score: s });
  assert.equal(inBand(at(target.min - 1), target), false);
  assert.equal(inBand(at(target.min), target), true);
  assert.equal(inBand(at(target.max - 1), target), true);
  assert.equal(inBand(at(target.max), target), false);
});

test('a complete layout scores zero with zero counters', () => {
  const layout = witness60();
  const r = rate(board60, pieces, layout, ws);
  assert.deepEqual(r, {
    model: MODEL,
    score: 0,
    level: 'very-easy',
    saturated: false,
    metrics: { U: 0, B: 0, branchTrials: 0, rowTrials: 0, stop: 'solution', R: 0, H: 0 },
  });
  assert.throws(() => rate(board60, pieces, [...layout.slice(1), { ...layout[1] }], ws), UnsatisfiableError);
});

test('forced placements keep B = 0 and score 2U', () => {
  const b = rect(3, 2);
  const two = [p5, mono];
  const r = rate(b, two, [{ piece: 'M', x: 0, y: 0, turn: 0, mirrored: false }], ws);
  assert.equal(r.metrics.U, 1);
  assert.equal(r.metrics.B, 0);
  assert.equal(r.metrics.branchTrials, 0);
  assert.equal(r.metrics.stop, 'solution');
  assert.equal(r.metrics.R, 5);
  assert.equal(r.metrics.H, 1);
  assert.equal(r.score, 2);
  assert.equal(r.saturated, false);
});

test('metrics carry actual counters and the diagnostics R and H', () => {
  const layout = witness60();
  const clues = layout.slice(0, 7);
  const r = rate(board60, pieces, clues, ws);
  const model = buildModel(board60, pieces, clues, ws);
  const bits = [...model.placementsPerPiece.subarray(0, model.freePieces.length)]
    .reduce((sum, rows) => sum + Math.log2(1 + rows), 0) / 5;
  assert.equal(r.metrics.U, 5);
  assert.equal(r.metrics.R, 25);
  assert.equal(r.metrics.H, bits);
  assert.equal(r.metrics.B, r.metrics.branchTrials);
  assert.equal(r.score, score(5, r.metrics.B));
  assert.equal(r.level, levelForScore(r.score).id);
});

test('saturation reports the effective B apart from the actual counters', () => {
  const clues = witness60().slice(0, 2);
  const branchCap = measure(board60, pieces, clues, ws, { branch: 3, rows: 50000 });
  assert.equal(branchCap.saturated, true);
  assert.equal(branchCap.metrics.stop, 'branch-cap');
  assert.equal(branchCap.metrics.branchTrials, 3);
  assert.equal(branchCap.metrics.B, 5000);

  const rowCap = measure(board60, pieces, clues, ws, { branch: 5000, rows: 40 });
  assert.equal(rowCap.saturated, true);
  assert.equal(rowCap.metrics.stop, 'row-cap');
  assert.equal(rowCap.metrics.rowTrials, 40);
  assert.ok(rowCap.metrics.branchTrials < 5000);
  assert.equal(rowCap.metrics.B, 5000);
  assert.equal(score(rowCap.metrics.U, rowCap.metrics.B), 2 * 10 + 30);

  const solved = measure(board60, pieces, clues, ws);
  assert.equal(solved.saturated, false);
  assert.equal(solved.metrics.B, solved.metrics.branchTrials);
});

test('unsatisfiable clue sets are refused instead of rated', () => {
  assert.throws(() => rate(rect(1, 4), [
    { id: 'a', label: 'a', color: '#111111', cells: [[0, 0], [0, 1], [0, 2]] },
    { id: 'b', label: 'b', color: '#222222', cells: [[0, 0], [0, 1]] },
  ], [], ws), (e) => e instanceof UnsatisfiableError && /no solution/.test(e.message));
  assert.throws(() => rate(rect(2, 2), [p5, mono], [], ws), (e) => e instanceof UnsatisfiableError && /no legal placement/.test(e.message));
});

test('ratings ignore piece ids, colors and input order', () => {
  const layout = witness60();
  const clues = layout.filter((p) => 'FILNPTU'.includes(p.piece));
  const base = rate(board60, pieces, clues, ws);
  const rename = (/** @type {string} */ id) => `piece-${id.toLowerCase()}${id.charCodeAt(0)}`;
  const renamed = pieces.map((p, i) => ({ ...p, id: rename(p.id), label: `L${i}`, color: `#00${(i + 10).toString(16)}${(i + 10).toString(16)}00` }));
  const renamedClues = clues.map((c) => ({ ...c, piece: rename(c.piece) }));
  const permuted = rate(board60, renamed.slice().reverse(), renamedClues.slice().reverse(), ws);
  assert.deepEqual(permuted, base);
  const rotated = [...renamed.slice(5), ...renamed.slice(0, 5)];
  assert.deepEqual(rate(board60, rotated, renamedClues, ws), base);
});
