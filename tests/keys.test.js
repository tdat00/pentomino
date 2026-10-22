// @ts-check
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { boardFromRows, symmetries } from '../core/engine/board.js';
import { normalizeCells, poseCells } from '../core/engine/geometry.js';
import { createRng } from '../core/engine/rng.js';
import {
  cacheStats, clueKey, layoutDistance, layoutKey, minLayoutDistance, packId, progressFingerprint, puzzleId,
} from '../core/engine/keys.js';
import { createWorkspace, MAIN_WORKSPACE_BYTES } from '../core/engine/workspace.js';
import { buildModel, countSolutions, solveFirst } from '../core/engine/tiling.js';
import { CLASSIC_PENTOMINOES } from './fixtures/polyominoes.js';

/** @typedef {import('../core/engine/types.js').Piece} Piece */
/** @typedef {import('../core/engine/types.js').Pose} Pose */
/** @typedef {import('../core/engine/types.js').XY} XY */

const pieces = /** @type {Piece[]} */ ([...CLASSIC_PENTOMINOES]);
const rect = (/** @type {number} */ w, /** @type {number} */ h) => boardFromRows(Array(h).fill('#'.repeat(w)));
const piece = (/** @type {string} */ id, /** @type {XY[]} */ cells) => ({ id, label: id, color: '#000000', cells });
const pose = (/** @type {string} */ id, /** @type {number} */ x, /** @type {number} */ y, turn = 0, mirrored = false) =>
  /** @type {Pose} */ ({ piece: id, x, y, turn: /** @type {0 | 1 | 2 | 3} */ (turn), mirrored });

/**
 * @param {import('../core/engine/types.js').Board} board
 * @param {Piece[]} ps
 * @param {number} cap
 */
function layouts(board, ps, cap = Infinity) {
  const model = buildModel(board, ps, [], createWorkspace(MAIN_WORKSPACE_BYTES));
  return countSolutions(model, { cap, rowTrialLimit: Infinity }).witnesses;
}

/** Pose of `p` whose footprint is exactly `cells`. */
function poseFor(/** @type {Piece} */ p, /** @type {XY[]} */ cells) {
  const want = normalizeCells(cells);
  const minX = Math.min(...cells.map((c) => c[0]));
  const minY = Math.min(...cells.map((c) => c[1]));
  for (const mirrored of [false, true]) {
    for (const turn of [0, 1, 2, 3]) {
      const here = poseCells(p, pose(p.id, 0, 0, turn, mirrored));
      if (JSON.stringify(normalizeCells(here)) === JSON.stringify(want)) {
        return pose(p.id, minX, minY, turn, mirrored);
      }
    }
  }
  throw new Error('no pose');
}

/** @param {Pose[]} layout @param {(c: XY) => XY} f */
const mapLayout = (layout, f) => layout.map((q) => {
  const p = /** @type {Piece} */ (pieces.find((e) => e.id === q.piece));
  return poseFor(p, poseCells(p, q).map(f));
});

const sixByTen = rect(10, 6);
const first = /** @type {Pose[]} */ (solveFirst(
  buildModel(sixByTen, pieces, [], createWorkspace(MAIN_WORKSPACE_BYTES)),
  { rowTrialLimit: Infinity },
).layout);

test('a reflected or rotated full layout has the same key and distance 0', () => {
  const key = layoutKey(sixByTen, pieces, first);
  assert.match(key, /^([0-9a-z]{2}){60}$/);
  for (const f of [([x, y]) => [9 - x, y], ([x, y]) => [x, 5 - y], ([x, y]) => [9 - x, 5 - y]]) {
    const moved = mapLayout(first, /** @type {(c: XY) => XY} */ (f));
    assert.notDeepEqual(moved, first);
    assert.equal(layoutKey(sixByTen, pieces, moved), key);
    assert.equal(layoutDistance(sixByTen, pieces, first, moved), 0);
  }
  const other = /** @type {Pose[]} */ (solveFirst(
    buildModel(sixByTen, pieces, [], createWorkspace(MAIN_WORKSPACE_BYTES)),
    { rng: createRng('keys'), rowTrialLimit: Infinity },
  ).layout);
  assert.notEqual(layoutKey(sixByTen, pieces, other), key);
});

test('classic ranks follow (size, numeric canonical shape) and layouts must be complete', () => {
  const board = rect(3, 1);
  const ps = [piece('b', [[0, 0], [1, 0]]), piece('a', [[0, 0]])];
  assert.equal(layoutKey(board, ps, [pose('a', 0, 0), pose('b', 1, 0)]), '000101');
  assert.equal(layoutKey(board, ps, [pose('b', 0, 0), pose('a', 2, 0)]), '000101', 'mirror image');
  assert.throws(() => layoutKey(board, ps, [pose('b', 0, 0)]), RangeError);
  assert.throws(() => clueKey(board, ps, [pose('a', 5, 0)]), RangeError);
  assert.throws(() => clueKey(board, ps, [pose('a', 0, 0), pose('a', 1, 0)]), RangeError);
});

test('clueKey writes .. for unclued cells; translation-only differences matter unless the board maps one to the other', () => {
  const board = rect(5, 2);
  const ps = [piece('d', [[0, 0], [1, 0]]), piece('m', [[0, 0]])];
  assert.equal(clueKey(board, ps, [pose('m', 0, 0)]), '..'.repeat(9) + '00', 'smallest of the four corner images');
  assert.equal(clueKey(board, ps, [pose('d', 0, 0)]), clueKey(board, ps, [pose('d', 3, 0)]), 'mirror image');
  assert.equal(clueKey(board, ps, [pose('d', 0, 0)]), clueKey(board, ps, [pose('d', 3, 1)]), 'rotated image');
  assert.notEqual(clueKey(board, ps, [pose('d', 0, 0)]), clueKey(board, ps, [pose('d', 1, 0)]));
  assert.equal(clueKey(board, ps, []), '..'.repeat(10));
});

test('a board without symmetry keeps layouts apart and a symmetric one merges them', () => {
  const board = boardFromRows(['##.', '###', '#..']);
  assert.deepEqual(symmetries(board), [0]);
  const ps = [piece('t', [[0, 0], [1, 0], [0, 1]]), piece('d', [[0, 0], [1, 0]]), piece('m', [[0, 0]])];
  const all = layouts(board, ps);
  assert.ok(all.length >= 4);
  assert.equal(new Set(all.map((l) => layoutKey(board, ps, l))).size, all.length);
  for (const l of all) {
    assert.equal(layoutDistance(board, ps, l, l), 0);
  }
  const [a, b] = all;
  assert.ok(layoutDistance(board, ps, a, b) >= 2, 'distinct complete layouts differ in at least two pieces');
  assert.equal(layoutDistance(board, ps, a, b), layoutDistance(board, ps, b, a));
});

test('keys use one whole-board frame: blocked margins and translation do not matter', () => {
  const ps = [piece('a', [[0, 0], [1, 0], [2, 0], [0, 1]]), piece('b', [[0, 0], [1, 0], [2, 0], [2, 1]])];
  const tight = rect(4, 2);
  const padded = boardFromRows(['......', '......', '.####.', '.####.', '......']);
  const [one] = layouts(tight, ps);
  const shifted = one.map((q) => ({ ...q, x: q.x + 1, y: q.y + 2 }));
  assert.equal(layoutKey(padded, ps, shifted), layoutKey(tight, ps, one));
  const clues = [one[0]];
  assert.equal(clueKey(padded, ps, [shifted[0]]), clueKey(tight, ps, clues));
  assert.notEqual(
    progressFingerprint(padded, ps, [shifted[0]]),
    progressFingerprint(tight, ps, clues),
    'exact margins stay in the progress identity',
  );
  assert.equal(layoutDistance(padded, ps, shifted, shifted), 0);
});

test('identical imported shapes share a rank while their solver identities differ', () => {
  const board = rect(2, 2);
  const twins = ['a', 'b'].map((id) => piece(id, [[0, 0], [1, 0]]));
  const all = layouts(board, twins);
  assert.equal(all.length, 4);
  assert.equal(new Set(all.map((l) => layoutKey(board, twins, l))).size, 1);
  const distances = all.map((l) => layoutDistance(board, twins, all[0], l));
  assert.deepEqual(distances, [0, 0, 0, 0], 'the square board symmetry maps every labelling onto every other');
});

test('different generated layouts are at least two pieces apart', () => {
  const rng = createRng('distance');
  const seen = [];
  for (let i = 0; i < 6; i += 1) {
    seen.push(/** @type {Pose[]} */ (solveFirst(
      buildModel(sixByTen, pieces, [], createWorkspace(MAIN_WORKSPACE_BYTES)),
      { rng: rng.derive(`r${i}`), rowTrialLimit: Infinity },
    ).layout));
  }
  for (const a of seen) {
    for (const b of seen) {
      const same = layoutKey(sixByTen, pieces, a) === layoutKey(sixByTen, pieces, b);
      const d = layoutDistance(sixByTen, pieces, a, b);
      assert.equal(d === 0, same);
      assert.ok(d === 0 || d >= 2);
    }
  }
});

test('progress fingerprints are exact: reflected clues and different source orientation differ', () => {
  const board = rect(6, 2);
  const l = piece('L', [[0, 0], [1, 0], [2, 0], [0, 1]]);
  const clue = [pose('L', 0, 0)];
  const mirroredClue = [poseFor(l, poseCells(l, clue[0]).map(([x, y]) => [5 - x, y]))];
  assert.equal(clueKey(board, [l], clue), clueKey(board, [l], mirroredClue), 'same up to symmetry');
  assert.notEqual(progressFingerprint(board, [l], clue), progressFingerprint(board, [l], mirroredClue));
  assert.notEqual(puzzleId(board, [l], clue), puzzleId(board, [l], mirroredClue));

  const turned = piece('L', [[0, 0], [0, 1], [0, 2], [1, 2]]);
  assert.notEqual(progressFingerprint(board, [l], clue), progressFingerprint(board, [turned], clue));
  assert.equal(progressFingerprint(board, [l], clue), progressFingerprint(board, [{ ...l, color: '#ffffff', label: 'zz' }], clue));
  assert.equal(
    progressFingerprint(board, [l], clue),
    progressFingerprint(board, [{ ...l, cells: [[5, 7], [6, 7], [7, 7], [5, 8]] }], clue),
    'cells are normalized, orientation kept',
  );
});

test('fingerprint format: canonical JSON of rows, id-sorted pieces and clues', () => {
  const board = rect(2, 2);
  const ps = [piece('b', [[0, 0], [1, 0]]), piece('a', [[0, 0], [0, 1]])];
  const clues = [pose('b', 0, 1)];
  const text = '{"clues":[["b",[[0,1],[1,1]]]],"pieces":[["a",[[0,0],[0,1]]],["b",[[0,0],[1,0]]]],"rows":["##","##"]}';
  const expected = createHash('sha256').update(text).digest('hex');
  assert.equal(progressFingerprint(board, ps, clues), expected);
  assert.equal(puzzleId(board, ps, clues), `p${expected.slice(0, 12)}`);
  assert.equal(progressFingerprint(board, [...ps].reverse(), clues), expected);
  assert.throws(() => progressFingerprint(board, ps, [pose('zz', 0, 0)]), RangeError);
});

test('packId covers rules, rows, pieces and clues but not styling or provenance', () => {
  const ps = [piece('a', [[0, 0], [1, 0]]), piece('b', [[0, 0], [0, 1]])];
  /** @returns {import('../core/engine/types.js').Pack} */
  const pack = () => ({
    format: 'pentomino-pack',
    version: 1,
    kind: 'puzzle-pack',
    rules: 'free-polyomino-v1',
    board: { rows: ['##', '##'] },
    pieces: ps.map((p) => ({ ...p, cells: p.cells.map((c) => /** @type {XY} */ ([...c])) })),
    puzzles: [
      { id: 'p1', title: 'One', clues: [pose('b', 0, 1)], rating: null },
      { id: 'p2', clues: [pose('a', 0, 0)] },
    ],
  });
  const base = packId(pack());
  assert.match(base, /^[0-9a-f]{16}$/);
  assert.equal(packId(pack()), base);

  const styled = pack();
  styled.presentation = { rotation: 45 };
  styled.meta = { author: 'x' };
  styled.pieces[0].color = '#abcdef';
  styled.pieces[0].label = 'Q';
  styled.puzzles[0].title = 'Renamed';
  styled.puzzles[0].id = 'other';
  styled.puzzles[1].rating = { model: 'm', score: 1, level: 'easy' };
  assert.equal(packId(styled), base);

  const reordered = pack();
  reordered.puzzles.reverse();
  assert.notEqual(packId(reordered), base);
  const moved = pack();
  moved.puzzles[1].clues = [pose('a', 0, 1)];
  assert.notEqual(packId(moved), base);
  const board = pack();
  board.board.rows = ['##', '#.'];
  assert.notEqual(packId(board), base);
  const shape = pack();
  shape.pieces[1].cells = [[0, 0], [1, 0]];
  assert.notEqual(packId(shape), base);
});

test('symmetry maps are built once per board, however many keys and distances are asked', () => {
  // A 12x5 board no other test uses, so its maps are built here and only here.
  const board = rect(12, 5);
  const [one, two] = layouts(board, pieces, 2);
  const before = cacheStats.mapBuilds;
  for (let i = 0; i < 6; i += 1) {
    layoutKey(board, pieces, i % 2 === 0 ? one : two);
    layoutDistance(board, pieces, one, two);
    minLayoutDistance(board, pieces, two, [one, two]);
  }
  assert.equal(cacheStats.mapBuilds - before, 1);
});

test('minLayoutDistance is the smallest pairwise distance and Infinity without others', () => {
  const rotated = mapLayout(first, ([x, y]) => [9 - x, 5 - y]);
  const other = /** @type {Pose[]} */ (layouts(sixByTen, pieces, 3)[2]);
  const expected = Math.min(layoutDistance(sixByTen, pieces, first, other), layoutDistance(sixByTen, pieces, first, rotated));
  assert.equal(minLayoutDistance(sixByTen, pieces, first, [other, rotated]), expected);
  assert.equal(minLayoutDistance(sixByTen, pieces, first, [rotated]), 0);
  assert.equal(minLayoutDistance(sixByTen, pieces, first, []), Infinity);
});
