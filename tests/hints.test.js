// @ts-check
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { boardFromRows } from '../core/engine/board.js';
import { createGame, isEarned, isSolved, reduce } from '../core/engine/game.js';
import { poseCells } from '../core/engine/geometry.js';
import {
  HINT_ROW_LIMIT, HINT_UNKNOWN_MESSAGE, chooseHintPlacement, compatibleStoredLayout, findCompatibleLayout, repairCandidates,
  resolveHint,
} from '../core/engine/hints.js';
import { progressFingerprint } from '../core/engine/keys.js';
import { validatePayload } from '../core/engine/protocol.js';
import { buildModel, countSolutions, isValidLayout, solveFirst } from '../core/engine/tiling.js';
import { MAIN_WORKSPACE_BYTES, createWorkspace } from '../core/engine/workspace.js';
import { createStorage } from '../core/browser/storage.js';
import { PoolAbortError } from '../core/browser/worker-pool.js';
import { createHintController, hintFingerprint } from '../player/hints.js';
import { createPlayController } from '../player/play.js';
import { createPlayerController, createPlayerStore } from '../player/state.js';
import { HINT_TEXT } from '../player/strings.js';

/** @typedef {import('../core/engine/types.js').Pose} Pose */

const FIXTURE_TEXT = readFileSync(new URL('./fixtures/hand-authored-pack.json', import.meta.url), 'utf8');
const WORKSPACE = createWorkspace(MAIN_WORKSPACE_BYTES);

/**
 * T11's board and pieces with the clue set replaced by clue A only; J is a movable piece here.
 * @returns {any}
 */
function regressionPack() {
  const pack = JSON.parse(FIXTURE_TEXT);
  pack.puzzles[0].clues = [pack.puzzles[0].clues[0]];
  return pack;
}

const PACK = regressionPack();
const BOARD = boardFromRows(PACK.board.rows);
/** @type {Pose[]} */
const STORED = PACK.puzzles[0].solution;
/** @type {Pose[]} */
const CLUES = PACK.puzzles[0].clues;

/**
 * @param {string} piece
 * @returns {Pose}
 */
const stored = (piece) => /** @type {Pose} */ (STORED.find((p) => p.piece === piece));

/** @type {Pose} */
const WRONG_B = { piece: 'B', x: 1, y: 0, turn: 1, mirrored: false };

/**
 * Real exhaustive search (the same engine the worker runs) with a row cap.
 * @param {any} pack
 * @param {number} [rowLimit]
 * @returns {(fixed: Pose[]) => { layout: Pose[] | null, exhausted: boolean }}
 */
function engineSolver(pack, rowLimit = 5e6) {
  const board = boardFromRows(pack.board.rows);
  return (fixed) => {
    const model = buildModel(board, pack.pieces, fixed, WORKSPACE);
    const { layout, exhausted } = solveFirst(model, { rowTrialLimit: rowLimit });
    return { layout, exhausted };
  };
}

/**
 * @param {any} pack
 * @param {Pose[]} poses
 * @returns {import('../core/engine/game.js').GameState}
 */
function gameWith(pack, poses) {
  return poses.reduce((game, pose) => reduce(game, { type: 'place', pose }), createGame(pack, 0));
}

/**
 * The regression state of T25: B wrongly first, then E to J at their documented positions.
 * @returns {import('../core/engine/game.js').GameState}
 */
function regressionGame() {
  const game = gameWith(PACK, [WRONG_B, ...['E', 'F', 'G', 'H', 'I', 'J'].map(stored)]);
  assert.deepEqual([...game.placed.keys()], ['B', 'E', 'F', 'G', 'H', 'I', 'J']);
  return game;
}

/**
 * @param {Pose[]} layout
 * @param {Pose[]} fixed
 */
function assertProof(layout, fixed) {
  assert.equal(isValidLayout(BOARD, PACK.pieces, layout), true, 'the proof layout is a complete valid tiling');
  assert.notEqual(compatibleStoredLayout(BOARD, PACK.pieces, fixed, layout), null, 'the proof layout keeps every fixed piece');
}

test('TAC-2: the first wrong piece is blamed, never the correct recent ones', async () => {
  const game = regressionGame();
  const solve = engineSolver(PACK);
  const fixed = [...CLUES, ...game.placed.values()];
  assert.deepEqual(solve(fixed), { layout: null, exhausted: true }, 'the current state is proven unsatisfiable');
  for (const id of ['E', 'F', 'G', 'H', 'I', 'J']) {
    const without = solve(fixed.filter((p) => p.piece !== id));
    assert.deepEqual(without, { layout: null, exhausted: true }, `removing ${id} still leaves no solution`);
  }
  assert.notEqual(solve(fixed.filter((p) => p.piece !== 'B')).layout, null, 'removing B repairs it');
  assert.deepEqual(repairCandidates(game.placed, game.history), ['J', 'I', 'H', 'G', 'F', 'E', 'B']);

  /** @type {string[]} */
  const queried = [];
  const result = await resolveHint({
    board: BOARD,
    pieces: PACK.pieces,
    clues: CLUES,
    placed: game.placed,
    history: game.history,
    solution: STORED,
    solve: (poses) => {
      queried.push(poses.filter((p) => p.piece !== 'A').map((p) => p.piece).join(''));
      return solve(poses);
    },
  });
  assert.equal(result.kind, 'remove');
  assert.equal(result.kind === 'remove' && result.piece, 'B');
  assert.equal(result.kind === 'remove' && result.proof, 'repairing-layout');
  assert.deepEqual(queried, ['BEFGHIJ', 'BEFGHI', 'BEFGHJ', 'BEFGIJ', 'BEFHIJ', 'BEGHIJ', 'BFGHIJ'],
    'the state, then each removal most recent first, J first; the stored answer settles the removal of B without a search');
  if (result.kind === 'remove') {
    assertProof(result.layout, [...CLUES, ...[...game.placed.values()].filter((p) => p.piece !== 'B')]);
  }
});

test('a capped or inconclusive query is unknown, never a blame or an arbitrary stored target', async () => {
  const game = regressionGame();
  const request = {
    board: BOARD, pieces: PACK.pieces, clues: CLUES, placed: game.placed, history: game.history, solution: null,
  };
  const exact = engineSolver(PACK);
  const unknown = { kind: 'unknown', message: HINT_UNKNOWN_MESSAGE };
  // One row of work: the removal of B is found only after 4 row trials, so that query is capped.
  assert.deepEqual(await resolveHint({ ...request, solve: engineSolver(PACK, 1) }), unknown);
  // Everything exhausted except the one query that matters.
  assert.deepEqual(await resolveHint({
    ...request,
    solve: (fixed) => (fixed.some((p) => p.piece === 'B') ? exact(fixed) : { layout: null, exhausted: false }),
  }), unknown);
  // The current position itself cannot be decided: no repair search, and the stored answer is not substituted.
  let calls = 0;
  assert.deepEqual(await resolveHint({
    ...request,
    solve: () => {
      calls += 1;
      return { layout: null, exhausted: false };
    },
  }), unknown);
  assert.equal(calls, 1);
  // A solver that fails (deadline, crash) stops the hint; the caller maps it to unknown.
  await assert.rejects(resolveHint({ ...request, solve: () => Promise.reject(new PoolAbortError('deadline')) }), { reason: 'deadline' });
  // Nothing proven when no piece is left to place or the position itself is malformed.
  assert.deepEqual(await resolveHint({
    ...request,
    placed: new Map([['B', { piece: 'B', x: 0, y: 0, turn: 0, mirrored: false }]]),
    solve: () => {
      throw new Error('must not search an invalid position');
    },
  }), unknown);
});

test('a compatible stored answer proves a placement without any search', async () => {
  const game = gameWith(PACK, [stored('E'), stored('H')]);
  const result = await resolveHint({
    board: BOARD,
    pieces: PACK.pieces,
    clues: CLUES,
    placed: game.placed,
    history: game.history,
    solution: STORED,
    solve: () => {
      throw new Error('the stored answer is compatible');
    },
  });
  assert.equal(result.kind, 'place');
  if (result.kind === 'place') {
    assert.equal(game.placed.has(result.pose.piece), false);
    assert.deepEqual(result.layout.find((p) => p.piece === result.pose.piece), result.pose);
    assertProof(result.layout, [...CLUES, ...game.placed.values()]);
  }
});

test('an alternative valid path is found by search when the stored answer disagrees', async () => {
  const model = buildModel(BOARD, PACK.pieces, CLUES, WORKSPACE);
  const { witnesses } = countSolutions(model, { cap: 50, rowTrialLimit: 5e6, witnessLimit: 50 });
  assert.ok(witnesses.length >= 2);
  const other = witnesses.find((w) => compatibleStoredLayout(BOARD, PACK.pieces, w.filter((p) => p.piece === 'B'), STORED) === null);
  assert.ok(other, 'a tiling that differs from the stored one');
  const differing = /** @type {Pose[]} */ (other).filter((p) => p.piece !== 'A'
    && compatibleStoredLayout(BOARD, PACK.pieces, [p], STORED) === null);
  assert.ok(differing.length > 0);
  const game = gameWith(PACK, differing.slice(0, 2));
  assert.equal(game.placed.size, Math.min(2, differing.length));
  assert.equal(compatibleStoredLayout(BOARD, PACK.pieces, [...CLUES, ...game.placed.values()], STORED), null);
  /** @type {Pose[][]} */
  const searched = [];
  const solve = engineSolver(PACK);
  const result = await resolveHint({
    board: BOARD,
    pieces: PACK.pieces,
    clues: CLUES,
    placed: game.placed,
    history: game.history,
    solution: STORED,
    solve: (fixed) => {
      searched.push(fixed);
      return solve(fixed);
    },
  });
  assert.equal(searched.length, 1);
  assert.equal(result.kind, 'place');
  if (result.kind === 'place') {
    assert.equal(game.placed.has(result.pose.piece), false);
    assertProof(result.layout, [...CLUES, ...game.placed.values()]);
  }
});

test('compatibleStoredLayout compares occupied cells and validates the whole answer', () => {
  const pack = {
    board: { rows: ['####', '####'] },
    pieces: [0, 1, 2, 3].map((i) => ({ id: `p${i}`, label: `p${i}`, color: '#000000', cells: /** @type {[number, number][]} */ ([[0, 0], [1, 0]]) })),
  };
  const board = boardFromRows(pack.board.rows);
  /** @type {Pose[]} */
  const answer = [
    { piece: 'p0', x: 0, y: 0, turn: 0, mirrored: false },
    { piece: 'p1', x: 2, y: 0, turn: 0, mirrored: false },
    { piece: 'p2', x: 0, y: 1, turn: 0, mirrored: false },
    { piece: 'p3', x: 2, y: 1, turn: 0, mirrored: false },
  ];
  assert.deepEqual(compatibleStoredLayout(board, pack.pieces, [], answer), answer);
  assert.notEqual(compatibleStoredLayout(board, pack.pieces, [], answer), answer, 'a copy');
  // A half turn of a domino covers the same cells.
  assert.notEqual(compatibleStoredLayout(board, pack.pieces, [{ piece: 'p0', x: 0, y: 0, turn: 2, mirrored: true }], answer), null);
  // Same cells by another piece, or other cells, disagree.
  assert.equal(compatibleStoredLayout(board, pack.pieces, [{ piece: 'p0', x: 2, y: 0, turn: 0, mirrored: false }], answer), null);
  assert.equal(compatibleStoredLayout(board, pack.pieces, [{ piece: 'p0', x: 0, y: 0, turn: 1, mirrored: false }], answer), null);
  // The answer itself must be a complete exact cover of known pieces.
  assert.equal(compatibleStoredLayout(board, pack.pieces, [], answer.slice(1)), null);
  assert.equal(compatibleStoredLayout(board, pack.pieces, [], [{ ...answer[1], x: 0 }, ...answer.slice(1)]), null);
  assert.equal(compatibleStoredLayout(board, pack.pieces, [], null), null);
  assert.equal(compatibleStoredLayout(board, pack.pieces, [{ piece: 'zz', x: 0, y: 0, turn: 0, mirrored: false }], answer), null);
});

test('chooseHintPlacement takes only an unplaced piece, by touched cells with a canonical tie', () => {
  const pieces = ['a', 'b', 'c', 'd'].map((id) => ({ id, label: id, color: '#000000', cells: /** @type {[number, number][]} */ ([[0, 0], [1, 0]]) }));
  const board = boardFromRows(['####', '####']);
  /** @type {Pose[]} */
  const answer = [
    { piece: 'a', x: 0, y: 0, turn: 0, mirrored: false },
    { piece: 'b', x: 2, y: 0, turn: 0, mirrored: false },
    { piece: 'c', x: 0, y: 1, turn: 0, mirrored: false },
    { piece: 'd', x: 2, y: 1, turn: 0, mirrored: false },
  ];
  // c touches the border and the placed a on the most sides.
  assert.deepEqual(chooseHintPlacement(board, pieces, [answer[0]], answer), answer[2]);
  // Every piece touches four border sides: the smallest ID wins, and a placed piece is never chosen.
  assert.deepEqual(chooseHintPlacement(board, pieces, [], answer), answer[0]);
  assert.deepEqual(chooseHintPlacement(board, pieces, [answer[0]], answer.slice().reverse()), answer[2]);
  assert.equal(chooseHintPlacement(board, pieces, answer, answer), null, 'nothing left to place');
  assert.equal(chooseHintPlacement(board, pieces, [{ ...answer[0], x: 2 }], answer), null, 'an incompatible answer proves nothing');
});

test('repairCandidates lists every placed piece once, newest move first, then canonical order', () => {
  const game = gameWith(PACK, [stored('E'), stored('F'), stored('G'), stored('H')]);
  const moved = reduce(reduce(game, { type: 'remove', piece: 'F' }), { type: 'place', pose: stored('F') });
  assert.deepEqual(repairCandidates(moved.placed, moved.history), ['F', 'H', 'G', 'E']);
  // History that no longer reaches back (cap or restore): the rest follow in canonical ID order.
  assert.deepEqual(repairCandidates(moved.placed, moved.history.slice(-2)), ['F', 'E', 'G', 'H']);
  assert.deepEqual(repairCandidates(moved.placed, []), ['E', 'F', 'G', 'H']);
  const afterReset = reduce(moved, { type: 'reset' });
  assert.deepEqual(repairCandidates(afterReset.placed, afterReset.history), []);
  assert.deepEqual(repairCandidates(new Map(), moved.history), []);
});

test('findCompatibleLayout: unsatisfiable needs an exhausted search, a bad answer is not trusted', async () => {
  const game = regressionGame();
  const solve = engineSolver(PACK);
  const fixed = [...CLUES, ...game.placed.values()];
  assert.deepEqual(await findCompatibleLayout({ board: BOARD, pieces: PACK.pieces, fixed, solution: STORED, solve }), { status: 'unsatisfiable' });
  assert.deepEqual(await findCompatibleLayout({
    board: BOARD, pieces: PACK.pieces, fixed, solution: null, solve: () => ({ layout: null, exhausted: false }),
  }), { status: 'unknown' });
  // A layout from the solver that does not keep the placements is not a proof.
  assert.deepEqual(await findCompatibleLayout({
    board: BOARD, pieces: PACK.pieces, fixed, solution: null, solve: () => ({ layout: STORED, exhausted: false }),
  }), { status: 'unknown' });
  const empty = await findCompatibleLayout({ board: BOARD, pieces: PACK.pieces, fixed: CLUES, solution: STORED, solve });
  assert.equal(empty.status === 'found' && empty.source, 'stored');
});

test('hints agree with an independent brute-force oracle on small random positions', async () => {
  const pieces = [
    { id: 'a', cells: [[0, 0], [1, 0], [0, 1]] },
    { id: 'b', cells: [[0, 0], [1, 0], [0, 1]] },
    { id: 'c', cells: [[0, 0], [1, 0]] },
    { id: 'd', cells: [[0, 0], [1, 0]] },
    { id: 'e', cells: [[0, 0], [1, 0]] },
  ].map((p) => ({ ...p, label: p.id, color: '#000000' }));
  const pack = { board: { rows: ['####', '####', '####'] }, pieces, puzzles: [{ id: 'q', clues: [] }] };
  const board = boardFromRows(pack.board.rows);
  /** @type {Pose[]} */
  const everyPose = [];
  for (const piece of pieces) {
    for (let y = 0; y < 3; y += 1) {
      for (let x = 0; x < 4; x += 1) {
        for (let turn = 0; turn < 4; turn += 1) {
          for (const mirrored of [false, true]) {
            const pose = /** @type {Pose} */ ({ piece: piece.id, x, y, turn, mirrored });
            const cells = poseCells(piece, pose);
            if (cells.every(([cx, cy]) => cx >= 0 && cy >= 0 && cx < 4 && cy < 3)) {
              everyPose.push(pose);
            }
          }
        }
      }
    }
  }
  /**
   * Plain backtracking over cells: can the fixed poses be extended to a complete tiling?
   * @param {Pose[]} fixed
   * @returns {boolean}
   */
  const satisfiable = (fixed) => {
    const byPiece = new Map(pieces.map((p) => [p.id, p]));
    const taken = new Array(12).fill(false);
    for (const pose of fixed) {
      for (const [x, y] of poseCells(/** @type {any} */ (byPiece.get(pose.piece)), pose)) {
        taken[y * 4 + x] = true;
      }
    }
    const free = pieces.filter((p) => !fixed.some((f) => f.piece === p.id));
    /** @param {number} i @returns {boolean} */
    const place = (i) => {
      if (i === free.length) {
        return taken.every(Boolean);
      }
      return everyPose.filter((pose) => pose.piece === free[i].id).some((pose) => {
        const cells = poseCells(free[i], pose).map(([x, y]) => y * 4 + x);
        if (cells.some((c) => taken[c])) {
          return false;
        }
        cells.forEach((c) => {
          taken[c] = true;
        });
        const ok = place(i + 1);
        cells.forEach((c) => {
          taken[c] = false;
        });
        return ok;
      });
    };
    return place(0);
  };
  const solve = engineSolver(pack);
  let seed = 7;
  const next = (/** @type {number} */ n) => {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    return (seed >>> 8) % n;
  };
  const seen = { place: 0, remove: 0, unknown: 0 };
  for (let round = 0; round < 160; round += 1) {
    let game = createGame(/** @type {any} */ (pack), 0);
    const count = 1 + next(4);
    for (let i = 0; i < count; i += 1) {
      game = reduce(game, { type: 'place', pose: everyPose[next(everyPose.length)] });
    }
    const fixed = [...game.placed.values()];
    const result = await resolveHint({
      board, pieces, clues: [], placed: game.placed, history: game.history, solution: null, solve,
    });
    if (satisfiable(fixed)) {
      assert.equal(result.kind, game.placed.size === pieces.length ? 'unknown' : 'place', `round ${round}`);
    } else {
      const repairs = [...game.placed.keys()].filter((id) => satisfiable(fixed.filter((p) => p.piece !== id)));
      if (repairs.length === 0) {
        assert.equal(result.kind, 'unknown', `round ${round}: nothing repairs it`);
      } else {
        assert.equal(result.kind, 'remove', `round ${round}`);
        // The first repairing piece in most-recent-first order, proven by a real layout.
        const order = repairCandidates(game.placed, game.history);
        assert.equal(result.kind === 'remove' && result.piece, order.find((id) => repairs.includes(id)));
      }
    }
    seen[result.kind] += 1;
    if (result.kind !== 'unknown') {
      const rest = result.kind === 'remove' ? fixed.filter((p) => p.piece !== result.piece) : fixed;
      assert.equal(isValidLayout(board, pieces, result.layout), true, `round ${round}: a complete tiling`);
      assert.notEqual(compatibleStoredLayout(board, pieces, rest, result.layout), null, `round ${round}: keeps the pieces`);
    }
  }
  assert.ok(seen.place > 0 && seen.remove > 0, `both outcomes occur (${JSON.stringify(seen)})`);
});

// ---- controller: stale results, commit-time checks, timeout, reveal -------------------------------------------

function memoryAdapter() {
  const map = new Map();
  return {
    map,
    get length() {
      return map.size;
    },
    key: (/** @type {number} */ i) => [...map.keys()][i] ?? null,
    getItem: (/** @type {string} */ k) => map.get(k) ?? null,
    setItem: (/** @type {string} */ k, /** @type {string} */ v) => {
      map.set(k, String(v));
    },
    removeItem: (/** @type {string} */ k) => {
      map.delete(k);
    },
  };
}

/**
 * Fake worker pool that runs the real solver; `hold` keeps a query pending until it is settled by hand.
 * @param {(fixed: Pose[]) => { layout: Pose[] | null, exhausted: boolean }} solve
 */
function fakePool(solve) {
  const log = { begin: /** @type {{ requestId: number, revision: string }[]} */ ([]), run: /** @type {any[]} */ ([]), end: /** @type {number[]} */ ([]), cancelAll: 0, closed: false };
  /** @type {{ resolve: (v: unknown) => void, reject: (e: unknown) => void, task: any }[]} */
  const pending = [];
  const pool = {
    hold: false,
    /** @param {{ requestId: number, revision: string }} r */
    beginRequest(r) {
      log.begin.push(r);
    },
    /** @param {any} task */
    run(task) {
      log.run.push(task);
      assert.equal(validatePayload('solveFirst', task.payload).ok, true, 'a real worker accepts this payload');
      assert.equal(task.payload.rowLimit, HINT_ROW_LIMIT);
      if (pool.hold) {
        return new Promise((resolve, reject) => {
          pending.push({ resolve, reject, task });
        });
      }
      try {
        return Promise.resolve(solve(task.payload.clues));
      } catch (error) {
        return Promise.reject(error);
      }
    },
    /** @param {number} id */
    endRequest(id) {
      log.end.push(id);
    },
    cancelAll() {
      log.cancelAll += 1;
      for (const entry of pending.splice(0)) {
        entry.reject(new PoolAbortError('cancelled'));
      }
    },
    close() {
      log.closed = true;
    },
  };
  return { pool, log, pending };
}

/**
 * @param {{ placements?: Pose[], solve?: (fixed: Pose[]) => { layout: Pose[] | null, exhausted: boolean }, solution?: Pose[] | null }} [o]
 */
function setup(o = {}) {
  const pack = regressionPack();
  if (o.solution === null) {
    delete pack.puzzles[0].solution;
  }
  const storage = createStorage(memoryAdapter(), () => 5000);
  const store = createPlayerStore({});
  const controller = createPlayerController({
    store,
    storage,
    location: { hash: '', pathname: '/', search: '' },
    history: { replaceState() {} },
    createPool: () => ({ beginRequest() {}, endRequest() {}, close() {}, run: () => new Promise(() => {}) }),
  });
  const fingerprints = [progressFingerprint(BOARD, pack.pieces, pack.puzzles[0].clues)];
  store.update({
    screen: 'game', pack, index: 0, game: gameWith(pack, o.placements ?? []), fingerprints, statuses: ['new'], revision: 1,
  });
  /** @type {string[]} */
  const said = [];
  /** @type {unknown[]} */
  const wins = [];
  const play = createPlayController({
    store,
    controller,
    now: () => 1000,
    setTimeout: () => 0,
    clearTimeout() {},
    setInterval: () => 0,
    clearInterval() {},
    announce: (m) => said.push(m),
    onSolved: (r) => wins.push(r),
  });
  const fake = fakePool(o.solve ?? engineSolver(pack));
  const hints = createHintController({ store, play, announce: (m) => said.push(m), createPool: () => fake.pool, reducedMotion: () => false });
  const game = () => /** @type {import('../core/engine/game.js').GameState} */ (store.getState().game);
  return { pack, storage, store, controller, play, hints, game, said, wins, ...fake };
}

test('a hint is shown, counted once, and applied as one undoable action', async () => {
  const h = setup({ placements: [WRONG_B, ...['E', 'F', 'G', 'H', 'I', 'J'].map(stored)].slice(1, 3) });
  await h.hints.requestHint();
  assert.equal(h.hints.getState().phase, 'hint');
  assert.equal(h.hints.getState().marks?.kind, 'place');
  assert.equal(h.game().hintsUsed, 1);
  assert.equal(h.game().placed.size, 2, 'showing a hint places nothing');
  assert.equal(h.log.begin.length, 0, 'a compatible stored answer needs no worker');
  const pose = /** @type {Pose} */ (h.hints.getState().marks?.pose);
  const before = h.game().history.length;
  assert.equal(h.hints.applyHint(), true);
  assert.deepEqual(h.game().placed.get(pose.piece), pose);
  assert.equal(h.game().history.length, before + 1, 'one undoable action');
  assert.equal(h.hints.getState().phase, 'idle');
  assert.equal(h.hints.getState().message, HINT_TEXT.placedHint(pose.piece));
  assert.equal(h.play.undo(), true);
  assert.equal(h.game().placed.has(pose.piece), false);
  assert.equal(h.game().hintsUsed, 1, 'the counter is not undone');
  assert.ok(h.said.some((m) => m === HINT_TEXT.place(pose.piece)));
});

test('the repairing hint blames the first wrong piece only after every candidate was tested', async () => {
  const h = setup({ placements: [WRONG_B, ...['E', 'F', 'G', 'H', 'I', 'J'].map(stored)] });
  await h.hints.requestHint();
  const state = h.hints.getState();
  assert.equal(state.phase, 'hint');
  assert.equal(state.marks?.kind, 'remove');
  assert.equal(state.marks?.piece, 'B');
  assert.equal(h.log.run.length, 7, 'the state and six removals; the stored answer settles the removal of B');
  assert.deepEqual(h.log.begin.map((r) => r.revision), [`hint:${h.log.begin[0].requestId}`]);
  assert.deepEqual(h.log.end, [h.log.begin[0].requestId]);
  assert.equal(h.hints.applyHint(), true);
  assert.equal(h.game().placed.has('B'), false);
  assert.equal(h.game().placed.size, 6);
});

test('an unknown or timed-out check says so, counts nothing and changes nothing', async () => {
  const capped = setup({ placements: [stored('E')], solution: null, solve: () => ({ layout: null, exhausted: false }) });
  await capped.hints.requestHint();
  assert.equal(capped.hints.getState().message, HINT_UNKNOWN_MESSAGE);
  assert.equal(capped.hints.getState().marks, null);
  assert.equal(capped.game().hintsUsed, 0);
  assert.equal(capped.game().placed.size, 1);

  const late = setup({
    placements: [WRONG_B, ...['E', 'F', 'G', 'H', 'I', 'J'].map(stored)],
    solve: () => {
      throw new PoolAbortError('deadline');
    },
  });
  await late.hints.requestHint();
  assert.equal(late.hints.getState().message, HINT_UNKNOWN_MESSAGE, 'a timeout is not a proof');
  assert.equal(late.hints.getState().phase, 'idle');
  assert.equal(late.game().hintsUsed, 0);
  assert.deepEqual(late.log.end, [late.log.begin[0].requestId], 'the request is always ended');
});

test('a result is dropped when the board changed while it was computed', async () => {
  const h = setup({ placements: [WRONG_B], solution: null });
  h.pool.hold = true;
  const running = h.hints.requestHint();
  assert.equal(h.hints.getState().phase, 'working');
  await Promise.resolve();
  assert.equal(h.pending.length, 1);
  // The player moves another piece: the question is no longer the same.
  assert.equal(h.play.apply({ type: 'place', pose: stored('J') }), true);
  assert.equal(h.hints.getState().phase, 'idle');
  assert.equal(h.hints.getState().message, HINT_TEXT.stale);
  assert.equal(h.log.cancelAll, 1);
  await running;
  assert.equal(h.hints.getState().marks, null);
  assert.equal(h.game().hintsUsed, 0);

  // A late reply of a superseded request is ignored as well.
  const second = setup({ placements: [WRONG_B], solution: null });
  second.pool.hold = true;
  const first = second.hints.requestHint();
  await Promise.resolve();
  const firstReply = second.pending[0];
  const newer = second.hints.requestHint();
  await Promise.resolve();
  firstReply.resolve({ layout: STORED, exhausted: false });
  await first;
  assert.equal(second.hints.getState().marks, null, 'the old answer shows nothing');
  second.pool.hold = false;
  second.pending.splice(0).forEach((entry) => entry.resolve({ layout: null, exhausted: false }));
  await newer;
  assert.equal(second.hints.getState().message, HINT_UNKNOWN_MESSAGE);
});

test('a hint that no longer fits is never committed', async () => {
  const h = setup({ placements: [stored('E')] });
  await h.hints.requestHint();
  const pose = /** @type {Pose} */ (h.hints.getState().marks?.pose);
  const placed = h.game().placed;
  // Moving any piece changes the position: the preview disappears and Place it does nothing.
  assert.equal(h.play.apply({ type: 'remove', piece: 'E' }), true);
  assert.equal(h.hints.getState().marks, null);
  assert.equal(h.hints.applyHint(), false);
  assert.equal(h.game().placed.has(pose.piece), false);
  assert.notEqual(h.game().placed, placed);

  // The commit-time guard: the game refuses the action (a drag is in progress), so nothing is claimed.
  const busy = setup({ placements: [stored('E')] });
  await busy.hints.requestHint();
  const shown = /** @type {Pose} */ (busy.hints.getState().marks?.pose);
  const tray = [...busy.game().tray.keys()].find((id) => id !== shown.piece);
  assert.equal(busy.play.beginDrag({ pieceId: /** @type {string} */ (tray), sourceCell: null }), true);
  assert.equal(busy.hints.applyHint(), false);
  assert.equal(busy.game().placed.has(shown.piece), false);
  assert.equal(busy.hints.getState().message, HINT_TEXT.noLongerFits);
});

test('Cancel stops a running check without touching the board', async () => {
  const h = setup({ placements: [WRONG_B], solution: null });
  h.pool.hold = true;
  const running = h.hints.requestHint();
  await Promise.resolve();
  h.hints.cancel();
  await running;
  assert.equal(h.hints.getState().phase, 'idle');
  assert.equal(h.hints.getState().message, HINT_TEXT.cancelled);
  assert.equal(h.game().placed.size, 1);
  assert.equal(h.game().hintsUsed, 0);
  assert.deepEqual(h.log.end, [h.log.begin[0].requestId]);
});

test('reveal: a compatible stored answer is applied once, marked revealed and never a win', async () => {
  const h = setup({ placements: [stored('E'), stored('H')] });
  const clues = [...h.pack.puzzles[0].clues];
  h.hints.declineReveal();
  assert.equal(h.game().placed.size, 2, 'a cancelled reveal changes nothing');
  assert.equal(h.hints.getState().message, HINT_TEXT.revealCancelled);
  assert.equal(h.game().revealed, false);

  await h.hints.reveal();
  const game = h.game();
  assert.equal(game.revealed, true);
  assert.equal(game.solved, true);
  assert.equal(isSolved(game), true);
  assert.equal(isEarned(game), false);
  assert.equal(h.wins.length, 0, 'no victory dialog');
  assert.equal(h.log.run.length, 0, 'the stored answer needed no search');
  assert.deepEqual(h.pack.puzzles[0].clues, clues);
  assert.equal(game.placed.size, 9);
  assert.ok(h.said.includes(HINT_TEXT.revealed));
  assert.equal(game.history.length, 3, 'two placements and one reveal command');
  const record = h.storage.loadProgress(h.store.getState().fingerprints[0]);
  assert.equal(record?.revealed, true);
  assert.equal(record?.solved, true);

  // Undo restores the player's pieces but the session stays revealed.
  assert.equal(h.play.undo(), true);
  assert.equal(h.game().placed.size, 2);
  assert.equal(h.game().revealed, true);
  // Finishing by hand afterwards is still not an earned win.
  h.play.redo();
  assert.equal(h.wins.length, 0);
});

test('reveal: an unsatisfiable position asks for an explicit reset first', async () => {
  const h = setup({ placements: [WRONG_B, ...['E', 'F', 'G', 'H', 'I', 'J'].map(stored)] });
  const placed = h.game().placed;
  await h.hints.reveal();
  assert.equal(h.hints.getState().phase, 'reveal-unsat');
  assert.equal(h.game().placed, placed, 'nothing is overwritten silently');
  assert.equal(h.game().revealed, false);
  h.hints.dismiss();
  assert.equal(h.hints.getState().message, HINT_TEXT.revealCancelled);
  assert.equal(h.game().placed, placed);

  await h.hints.reveal();
  await h.hints.reveal({ replace: true });
  const game = h.game();
  assert.equal(game.revealed, true);
  assert.equal(game.solved, true);
  assert.equal(h.wins.length, 0);
  assert.equal(h.log.run.length, 2, 'one proof search per reveal attempt; the clues-only answer is the stored one');
  assert.equal(h.play.undo(), true);
  assert.equal(h.game().placed.size, 7, 'the player can get the moves back');
  assert.equal(h.game().revealed, true);
});

test('reveal searches for a compatible solution when the stored one disagrees, and says so when it cannot', async () => {
  const model = buildModel(BOARD, PACK.pieces, CLUES, WORKSPACE);
  const { witnesses } = countSolutions(model, { cap: 50, rowTrialLimit: 5e6, witnessLimit: 50 });
  const other = /** @type {Pose[]} */ (witnesses.find((w) => compatibleStoredLayout(BOARD, PACK.pieces, w.filter((p) => p.piece === 'B'), STORED) === null));
  const differing = other.filter((p) => p.piece !== 'A' && compatibleStoredLayout(BOARD, PACK.pieces, [p], STORED) === null);
  const h = setup({ placements: differing.slice(0, 1) });
  await h.hints.reveal();
  assert.equal(h.log.run.length, 1);
  assert.equal(h.game().revealed, true);
  assert.equal(isValidLayout(BOARD, PACK.pieces, [...h.pack.puzzles[0].clues, ...h.game().placed.values()]), true);
  assert.deepEqual(h.game().placed.get(differing[0].piece), differing[0], 'the player\'s piece is kept');

  const capped = setup({ placements: differing.slice(0, 1), solve: () => ({ layout: null, exhausted: false }) });
  await capped.hints.reveal();
  assert.equal(capped.hints.getState().message, HINT_TEXT.revealUnknown);
  assert.equal(capped.game().revealed, false);
  assert.equal(capped.game().placed.size, 1);
});

test('the request fingerprint follows board, clues and placements only', () => {
  const h = setup({ placements: [stored('E')] });
  const base = hintFingerprint(h.store.getState());
  h.store.update((s) => ({ game: s.game === null ? null : { ...s.game, elapsedMs: 99, hintsUsed: 3, selected: 'F' } }));
  assert.equal(hintFingerprint(h.store.getState()), base);
  h.store.update({ fingerprints: ['another-clue-set'] });
  assert.notEqual(hintFingerprint(h.store.getState()), base);
  h.store.update({ fingerprints: [progressFingerprint(BOARD, h.pack.pieces, h.pack.puzzles[0].clues)] });
  assert.equal(hintFingerprint(h.store.getState()), base);
  assert.equal(h.play.apply({ type: 'place', pose: stored('F') }), true);
  assert.notEqual(hintFingerprint(h.store.getState()), base);
});

test('reveal needs the same position it started with', async () => {
  const h = setup({ placements: [stored('E')], solution: null });
  h.pool.hold = true;
  const running = h.hints.reveal();
  await Promise.resolve();
  h.play.apply({ type: 'remove', piece: 'E' });
  await running;
  assert.equal(h.game().revealed, false);
  assert.equal(h.game().placed.size, 0);
  assert.equal(h.hints.getState().message, HINT_TEXT.stale);
});
