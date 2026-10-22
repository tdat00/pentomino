// @ts-check
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { boardFromRows } from '../core/engine/board.js';
import { poseCells } from '../core/engine/geometry.js';
import {
  EPOCH, MAX_HISTORY, canPlace, createGame, isSolved, poseT, reduce, snapshot,
} from '../core/engine/game.js';
import { progressFingerprint } from '../core/engine/keys.js';
import { buildModel, countSolutions } from '../core/engine/tiling.js';
import { MAIN_WORKSPACE_BYTES, createWorkspace } from '../core/engine/workspace.js';

/** @typedef {import('../core/engine/types.js').Pose} Pose */
/** @typedef {import('../core/engine/game.js').GameState} GameState */

const FIXTURE_TEXT = readFileSync(new URL('./fixtures/hand-authored-pack.json', import.meta.url), 'utf8');

/**
 * @param {any} value
 * @returns {any}
 */
function deepFreeze(value) {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

/** @returns {any} */
const fixturePack = () => JSON.parse(FIXTURE_TEXT);

/**
 * @param {string} piece
 * @param {number} x
 * @param {number} y
 * @param {number} [turn]
 * @param {boolean} [mirrored]
 * @returns {Pose}
 */
const pose = (piece, x, y, turn = 0, mirrored = false) => ({ piece, x, y, turn: /** @type {any} */ (turn), mirrored });

/**
 * @param {GameState} s
 * @param {any[]} actions
 * @returns {GameState}
 */
const run = (s, actions) => actions.reduce((state, a) => reduce(state, a), s);

/**
 * Comparable view of everything an undo must restore.
 * @param {GameState} s
 */
const view = (s) => ({
  placements: snapshot(s).placements,
  tray: [...s.tray.entries()],
  solved: s.solved,
});

/**
 * Both distinct complete tilings of the fixture puzzle, found through T07.
 * @returns {Pose[][]}
 */
function allSolutions() {
  const pack = fixturePack();
  const model = buildModel(boardFromRows(pack.board.rows), pack.pieces, pack.puzzles[0].clues,
    createWorkspace(MAIN_WORKSPACE_BYTES));
  return countSolutions(model, { cap: 50, rowTrialLimit: 5e6 }).witnesses;
}

/**
 * @param {Pose[]} layout
 * @param {any} pack
 * @returns {any[]}
 */
function placeActions(layout, pack) {
  const clues = new Set(pack.puzzles[0].clues.map((/** @type {Pose} */ c) => c.piece));
  return layout.filter((p) => !clues.has(p.piece)).map((p) => ({ type: 'place', pose: p }));
}

/** Small board with a blocked cell and a clue domino at (2,1)-(3,1). */
function miniPack() {
  return {
    board: { rows: ['####', '#.##'] },
    pieces: [
      { id: 'a', label: 'a', color: '#e6194b', cells: [[0, 0], [1, 0]] },
      { id: 'b', label: 'b', color: '#3cb44b', cells: [[0, 0], [1, 0]] },
      { id: 'c', label: 'c', color: '#ffe119', cells: [[0, 0], [1, 0]] },
    ],
    puzzles: [{ id: 'm', clues: [pose('c', 2, 1)] }],
  };
}

test('canPlace reports each rejection reason and priority', () => {
  const s = createGame(/** @type {any} */ (miniPack()), 0);
  assert.deepEqual(canPlace(s, pose('a', 0, 0)), { ok: true });
  assert.deepEqual(canPlace(s, pose('a', 3, 0)), { ok: false, reason: 'outside' });
  assert.deepEqual(canPlace(s, pose('a', -1, 0)), { ok: false, reason: 'outside' });
  assert.deepEqual(canPlace(s, pose('a', 0, 1)), { ok: false, reason: 'blocked' });
  assert.deepEqual(canPlace(s, pose('b', 2, 0, 1)), { ok: false, reason: 'clue' });
  const placed = reduce(s, { type: 'place', pose: pose('a', 0, 0) });
  assert.deepEqual(canPlace(placed, pose('b', 1, 0)), { ok: false, reason: 'overlap' });
  assert.deepEqual(canPlace(placed, pose('b', 2, 0)), { ok: true });
  assert.deepEqual(canPlace(placed, pose('a', 1, 0), 'a'), { ok: true });
  assert.deepEqual(canPlace(placed, pose('a', 1, 0)), { ok: false, reason: 'overlap' });
  assert.deepEqual(canPlace(s, pose('c', 0, 0)), { ok: false, reason: 'clue' });
  assert.deepEqual(canPlace(s, pose('zzz', 0, 0)), { ok: false, reason: 'outside' });
  assert.deepEqual(canPlace(s, /** @type {any} */ ({ piece: 'a', x: 0.5, y: 0, turn: 0, mirrored: false })),
    { ok: false, reason: 'outside' });
  assert.deepEqual(canPlace(s, pose('a', 3, 1, 2)), { ok: false, reason: 'outside' });
});

test('invalid, clue and no-op actions return the same state without history', () => {
  const pack = deepFreeze(miniPack());
  const s0 = createGame(pack, 0);
  const s1 = reduce(s0, { type: 'place', pose: pose('a', 0, 0) });
  assert.equal(s1.history.length, 1);
  const noops = [
    { type: 'place', pose: pose('b', 1, 0) },
    { type: 'place', pose: pose('b', 0, 1) },
    { type: 'place', pose: pose('b', 3, 0) },
    { type: 'place', pose: pose('c', 0, 0) },
    { type: 'move', pose: pose('a', 0, 0) },
    { type: 'move', pose: pose('nope', 0, 0) },
    { type: 'remove', piece: 'c' },
    { type: 'remove', piece: 'b' },
    { type: 'remove', piece: 'nope' },
    { type: 'orient', piece: 'c', t: 3 },
    { type: 'orient', piece: 'b', t: 0 },
    { type: 'orient', piece: 'b', t: 9 },
    { type: 'orient', piece: 'a', t: 1 },
    { type: 'orient', piece: 'a', t: 1, pose: pose('a', 0, 0, 2) },
    { type: 'orient', piece: 'a', t: 1, pose: pose('b', 0, 0, 1) },
    { type: 'orient', piece: 'a', t: 1, pose: pose('a', 3, 0, 1, false) },
    { type: 'bogus' },
    null,
  ];
  for (const a of noops) {
    assert.equal(reduce(s1, /** @type {any} */ (a)), s1, JSON.stringify(a));
  }
  assert.equal(reduce(s0, { type: 'undo' }), s0);
  assert.equal(reduce(s0, { type: 'redo' }), s0);
  assert.equal(reduce(s0, { type: 'reset' }), s0);
});

test('clues cannot be moved, removed or covered', () => {
  const pack = deepFreeze(fixturePack());
  const s = createGame(pack, 0);
  assert.equal(s.placed.has('A'), false);
  assert.equal(s.tray.has('A'), false);
  assert.equal(s.tray.size, 8);
  for (const a of [
    { type: 'move', pose: pose('A', 1, 1) },
    { type: 'remove', piece: 'A' },
    { type: 'orient', piece: 'J', t: 2, pose: pose('J', 8, 1, 2) },
    { type: 'place', pose: pose('B', 0, 0) },
  ]) {
    assert.equal(reduce(s, /** @type {any} */ (a)), s);
  }
  assert.equal(snapshot(run(s, [{ type: 'reset' }])).placements.length, 0);
});

test('moving a placed piece ignores its own old cells only', () => {
  const s = createGame(fixturePack(), 0);
  const placed = run(s, [{ type: 'place', pose: pose('F', 0, 4) }]);
  assert.deepEqual(canPlace(placed, pose('F', 1, 4)), { ok: false, reason: 'overlap' });
  const moved = reduce(placed, { type: 'move', pose: pose('F', 1, 4) });
  assert.deepEqual(moved.placed.get('F'), pose('F', 1, 4));
  assert.equal(moved.history.length, 2);
  const blocker = run(moved, [{ type: 'place', pose: pose('E', 0, 2) }]);
  assert.equal(reduce(blocker, { type: 'move', pose: pose('E', 0, 3) }), blocker);
  assert.equal(blocker.placed.get('E')?.y, 2);
});

test('symmetric piece poses and placed-piece orientation', () => {
  const s0 = createGame(/** @type {any} */ (miniPack()), 0);
  const p = pose('a', 0, 0, 2, true);
  assert.deepEqual(poseCells(s0.pack.pieces[0], p), poseCells(s0.pack.pieces[0], pose('a', 0, 0)));
  const s1 = reduce(s0, { type: 'place', pose: p });
  assert.equal(s1.history.length, 1);
  assert.equal(poseT(p), 6);
  const turned = reduce(s1, { type: 'orient', piece: 'a', t: 1, pose: pose('a', 0, 0, 1) });
  assert.equal(turned.placed.get('a')?.turn, 1);
  assert.equal(reduce(turned, { type: 'orient', piece: 'a', t: 1, pose: pose('a', 0, 0, 1) }), turned);

  const f = run(createGame(fixturePack(), 0), [{ type: 'place', pose: pose('F', 0, 4) }]);
  const rotated = reduce(f, { type: 'orient', piece: 'F', t: 2, pose: pose('F', 0, 4, 2) });
  assert.equal(rotated.placed.get('F')?.turn, 2);
  assert.equal(reduce(f, { type: 'orient', piece: 'F', t: 1, pose: pose('F', 0, 4, 1) }), f);
  assert.equal(reduce(f, { type: 'orient', piece: 'F', t: 2, pose: pose('F', 0, 4, 1) }), f);
});

test('undo and redo restore exact poses and tray orientations', () => {
  const s0 = createGame(fixturePack(), 0);
  const actions = [
    { type: 'orient', piece: 'B', t: 5 },
    { type: 'place', pose: pose('B', 1, 0, 1, true) },
    { type: 'move', pose: pose('B', 1, 0, 1, true) },
    { type: 'move', pose: pose('B', 2, 2, 3, false) },
    { type: 'orient', piece: 'E', t: 6 },
    { type: 'remove', piece: 'B' },
    { type: 'place', pose: pose('E', 0, 2, 2, true) },
  ];
  const views = [view(s0)];
  let s = s0;
  for (const a of actions) {
    s = reduce(s, /** @type {any} */ (a));
    views.push(view(s));
  }
  const committed = views.filter((v, i) => i > 0 && JSON.stringify(v) !== JSON.stringify(views[i - 1])).length;
  assert.equal(s.history.length, committed);
  assert.equal(s.moves, committed);
  assert.equal(s.tray.get('B'), poseT(pose('B', 2, 2, 3, false)));

  const stages = [];
  while (s.history.length > 0) {
    s = reduce(s, { type: 'undo' });
    stages.push(view(s));
  }
  assert.deepEqual(view(s), views[0]);
  assert.equal(s.moves, committed);
  assert.equal(s.tray.get('B'), 0);
  const backward = views.filter((v, i) => i === 0 || JSON.stringify(v) !== JSON.stringify(views[i - 1]));
  assert.deepEqual([...stages].reverse(), backward.slice(0, -1).slice(0));
  while (s.future.length > 0) {
    s = reduce(s, { type: 'redo' });
  }
  assert.deepEqual(view(s), views[views.length - 1]);
  assert.equal(s.moves, committed);
});

test('reset is one undoable command and restores tray orientations', () => {
  const s0 = createGame(fixturePack(), 0);
  const s = run(s0, [
    { type: 'orient', piece: 'B', t: 3 },
    { type: 'place', pose: pose('E', 0, 2) },
    { type: 'place', pose: pose('F', 0, 4) },
    { type: 'orient', piece: 'F', t: 2, pose: pose('F', 0, 4, 2) },
  ]);
  const cleared = reduce(s, { type: 'reset' });
  assert.equal(cleared.placed.size, 0);
  assert.deepEqual([...cleared.tray.values()], new Array(8).fill(0));
  assert.equal(cleared.history.length, s.history.length + 1);
  assert.equal(cleared.history[cleared.history.length - 1].kind, 'reset');
  assert.equal(cleared.moves, s.moves + 1);
  assert.equal(createGame(fixturePack(), 0).placed.size, 0);
  assert.equal(cleared.pack.puzzles[0].clues.length, 2);

  const undone = reduce(cleared, { type: 'undo' });
  assert.deepEqual(view(undone), view(s));
  assert.equal(undone.moves, cleared.moves);
  const redone = reduce(undone, { type: 'redo' });
  assert.deepEqual(view(redone), view(cleared));
  assert.deepEqual(view(reduce(redone, { type: 'undo' })), view(s));
});

test('a new commit clears the redo stack', () => {
  const s0 = createGame(fixturePack(), 0);
  const a = run(s0, [{ type: 'place', pose: pose('E', 0, 2) }, { type: 'place', pose: pose('F', 0, 4) }]);
  const undone = reduce(a, { type: 'undo' });
  assert.equal(undone.future.length, 1);
  const branched = reduce(undone, { type: 'place', pose: pose('H', 6, 3) });
  assert.equal(branched.future.length, 0);
  assert.equal(reduce(branched, { type: 'redo' }), branched);
  const invalid = reduce(undone, { type: 'place', pose: pose('H', 99, 3) });
  assert.equal(invalid.future.length, 1);
});

test('history is capped at 500 commands while the move counter keeps counting', () => {
  let s = createGame(fixturePack(), 0);
  for (let i = 1; i <= 600; i += 1) {
    s = reduce(s, { type: 'orient', piece: 'B', t: i % 2 === 1 ? 1 : 2 });
  }
  assert.equal(MAX_HISTORY, 500);
  assert.equal(s.history.length, 500);
  assert.equal(s.moves, 600);
  for (let i = 0; i < 700; i += 1) {
    s = reduce(s, { type: 'undo' });
  }
  assert.equal(s.history.length, 0);
  assert.equal(s.future.length, 500);
  assert.equal(s.tray.get('B'), 2);
  assert.equal(s.moves, 600);
});

test('full-board coverage wins for the witness and for another valid tiling', () => {
  const pack = fixturePack();
  const layouts = allSolutions();
  assert.ok(layouts.length >= 2);
  const witnessKey = JSON.stringify(pack.puzzles[0].solution.map((/** @type {Pose} */ p) => [p.piece, p.x, p.y, p.turn, p.mirrored]));
  const other = layouts.find((l) => JSON.stringify(
    [...l].sort((a, b) => a.piece.localeCompare(b.piece)).map((p) => [p.piece, p.x, p.y, p.turn, p.mirrored])) !== witnessKey);
  assert.ok(other, 'a non-witness completion exists');

  for (const layout of [pack.puzzles[0].solution, other]) {
    const actions = placeActions(layout, pack);
    const partial = run(createGame(pack, 0), actions.slice(0, -1));
    assert.equal(partial.solved, false);
    assert.equal(isSolved(partial), false);
    const done = reduce(partial, actions[actions.length - 1]);
    assert.equal(done.solved, true);
    assert.equal(isSolved(done), true);
    assert.equal(reduce(done, { type: 'undo' }).solved, false);
  }
  const noSolution = fixturePack();
  noSolution.puzzles[0].solution = null;
  assert.equal(run(createGame(noSolution, 0), placeActions(other ?? [], noSolution)).solved, true);
});

test('isSolved ignores forged flags and inconsistent maps', () => {
  const pack = fixturePack();
  const done = run(createGame(pack, 0), placeActions(pack.puzzles[0].solution, pack));
  assert.equal(isSolved({ ...done, solved: false }), true);
  const partial = run(createGame(pack, 0), placeActions(pack.puzzles[0].solution, pack).slice(1));
  assert.equal(isSolved({ ...partial, solved: true }), false);
  const forged = new Map(done.placed);
  forged.set('B', pose('C', 3, 0));
  assert.equal(isSolved({ ...done, placed: forged }), false);
  const dup = new Map(done.placed);
  dup.set('B', pose('B', 0, 0));
  assert.equal(isSolved({ ...done, placed: dup }), false);
  const shifted = new Map(done.placed);
  shifted.set('B', pose('B', 1, 0, 0, true));
  assert.equal(isSolved({ ...done, placed: shifted }), false);
});

test('inputs, maps and clue arrays are never mutated', () => {
  const pack = deepFreeze(fixturePack());
  const before = JSON.stringify(pack);
  const s0 = createGame(pack, 0);
  const p = deepFreeze(pose('E', 0, 2));
  const s1 = reduce(s0, { type: 'place', pose: p });
  const s2 = reduce(s1, { type: 'orient', piece: 'B', t: 4 });
  const s3 = reduce(reduce(reduce(s2, { type: 'reset' }), { type: 'undo' }), { type: 'redo' });
  assert.equal(s0.placed.size, 0);
  assert.equal(s0.history.length, 0);
  assert.equal(s1.tray.has('E'), false);
  assert.equal(s1.tray.get('B'), 0);
  assert.equal(s2.placed.size, 1);
  assert.equal(s3.placed.size, 0);
  assert.notEqual(s1.placed, s0.placed);
  assert.equal(JSON.stringify(pack), before);
  const mutable = { type: 'place', pose: pose('F', 0, 4) };
  const placed = reduce(s0, /** @type {any} */ (mutable));
  mutable.pose.x = 3;
  assert.equal(placed.placed.get('F')?.x, 0);
  assert.equal(placed.history[0].kind === 'piece' && placed.history[0].after?.x, 0);

  const saved = deepFreeze({ v: 1, placements: [pose('B', 1, 0)], elapsedMs: 5, moves: 1, solved: false, updatedAt: EPOCH });
  assert.equal(createGame(pack, 0, saved).placed.size, 1);
});

test('restoring keeps valid moves and reports each discarded one', () => {
  const pack = fixturePack();
  const saved = {
    v: 1,
    placements: [
      pose('B', 1, 0),
      { piece: 'C', x: 'a' },
      pose('ZZ', 0, 0),
      pose('C', 0, 0),
      pose('D', 9, 5),
      pose('E', 1, 0),
      pose('B', 6, 3),
      pose('H', 6, 3),
      pose('A', 5, 5),
    ],
    elapsedMs: 4200,
    moves: 11,
    solved: true,
    updatedAt: '2026-03-04T05:06:07.000Z',
  };
  const savedCopy = JSON.stringify(saved);
  const s = createGame(pack, 0, /** @type {any} */ (saved));
  assert.deepEqual([...s.placed.keys()], ['B', 'H']);
  assert.deepEqual(s.restoreWarnings.map((w) => [w.path, w.code]), [
    ['placements[1]', 'placement-malformed'],
    ['placements[2]', 'placement-unknown-piece'],
    ['placements[3]', 'placement-clue'],
    ['placements[4]', 'placement-outside'],
    ['placements[5]', 'placement-overlap'],
    ['placements[6]', 'placement-duplicate'],
    ['placements[8]', 'placement-clue'],
  ]);
  assert.ok(s.restoreWarnings.every((w) => w.message.length > 0));
  assert.equal(s.solved, false);
  assert.equal(s.elapsedMs, 4200);
  assert.equal(s.moves, 11);
  assert.equal(s.updatedAt, '2026-03-04T05:06:07.000Z');
  assert.deepEqual([...s.tray.keys()], ['C', 'D', 'E', 'F', 'G', 'I']);
  assert.equal(s.history.length, 0);
  assert.equal(JSON.stringify(saved), savedCopy);
  assert.equal('restoreWarnings' in snapshot(s), false);
});

test('forged solved progress and bad metadata do not create a win', () => {
  const pack = fixturePack();
  const forged = createGame(pack, 0, /** @type {any} */ ({
    v: 1, placements: [], elapsedMs: -5, moves: 1.5, solved: true, updatedAt: 'yesterday',
  }));
  assert.equal(forged.solved, false);
  assert.equal(forged.elapsedMs, 0);
  assert.equal(forged.moves, 0);
  assert.equal(forged.updatedAt, EPOCH);
  const wrongVersion = createGame(pack, 0, /** @type {any} */ ({ v: 2, placements: [] }));
  assert.equal(wrongVersion.restoreWarnings[0].code, 'progress-invalid');
  assert.equal(createGame(pack, 0, /** @type {any} */ ('x')).restoreWarnings.length, 1);

  const done = run(createGame(pack, 0), placeActions(pack.puzzles[0].solution, pack));
  const restored = createGame(pack, 0, snapshot(done));
  assert.equal(restored.solved, true);
  assert.deepEqual(restored.restoreWarnings, []);
  const stale = snapshot(done);
  stale.placements[0] = pose(stale.placements[0].piece, 0, 0);
  const staleGame = createGame(pack, 0, stale);
  assert.equal(staleGame.solved, false);
  assert.ok(staleGame.restoreWarnings.length >= 1);

  const flood = createGame(pack, 0, /** @type {any} */ ({
    v: 1, placements: new Array(150).fill(null), elapsedMs: 0, moves: 0, solved: false, updatedAt: EPOCH,
  }));
  assert.equal(flood.restoreWarnings.length, 101);
  assert.equal(flood.restoreWarnings[100].code, 'too-many-warnings');
  assert.throws(() => createGame(pack, 3), RangeError);
});

test('snapshot is deterministic, movable-only and round-trips', () => {
  const pack = fixturePack();
  const a = run(createGame(pack, 0), [
    { type: 'place', pose: pose('H', 6, 3) },
    { type: 'place', pose: pose('B', 1, 0) },
  ]);
  const b = run(createGame(pack, 0), [
    { type: 'place', pose: pose('B', 1, 0) },
    { type: 'place', pose: pose('H', 6, 3) },
  ]);
  const snap = snapshot(a);
  assert.deepEqual(snap.placements.map((p) => p.piece), ['B', 'H']);
  assert.deepEqual(snap, snapshot(b));
  assert.deepEqual(Object.keys(snap), ['v', 'placements', 'elapsedMs', 'moves', 'solved', 'updatedAt']);
  snap.placements[0].x = 7;
  assert.equal(a.placed.get('B')?.x, 1);
  const round = createGame(pack, 0, JSON.parse(JSON.stringify(snapshot(a))));
  assert.deepEqual(view(round), view(a));
  assert.equal(snapshot(createGame(pack, 0)).updatedAt, EPOCH);
});

test('identity is the exact-coordinate fingerprint, not the public puzzle id', () => {
  const pack = fixturePack();
  pack.puzzles.push({
    id: pack.puzzles[0].id,
    clues: [pose('A', 0, 0), pose('J', 8, 1, 0), pose('D', 6, 0)],
    solution: null,
  });
  const board = boardFromRows(pack.board.rows);
  assert.notEqual(progressFingerprint(board, pack.pieces, pack.puzzles[0].clues),
    progressFingerprint(board, pack.pieces, pack.puzzles[1].clues));
  const first = run(createGame(pack, 0), [{ type: 'place', pose: pose('D', 6, 0) }, { type: 'place', pose: pose('B', 1, 0) }]);
  const second = createGame(pack, 1, snapshot(first));
  assert.deepEqual([...second.placed.keys()], ['B']);
  assert.deepEqual(second.restoreWarnings.map((w) => w.code), ['placement-clue']);
  assert.equal(second.tray.has('D'), false);
});
