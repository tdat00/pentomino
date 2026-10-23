// @ts-check
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { boardFromRows, boardToRows } from '../core/engine/board.js';
import { certify } from '../core/engine/clues.js';
import { rate } from '../core/engine/difficulty.js';
import { completionCandidate, puzzleCandidate, setAttempt } from '../core/engine/generate.js';
import { layoutKey } from '../core/engine/keys.js';
import { createPack } from '../core/engine/pack.js';
import { parseWorkerMessage } from '../core/engine/protocol.js';
import { createTaskHandler, errorReply, executeTask, TaskError } from '../core/engine/tasks.js';
import { buildModel, isValidLayout, rowPose, solveFirst } from '../core/engine/tiling.js';
import { createWorkspace, MAIN_WORKSPACE_BYTES, SCRATCH_WORKSPACE_BYTES } from '../core/engine/workspace.js';
import { CLASSIC_PENTOMINOES } from './fixtures/polyominoes.js';
import { RECIPE_BOARD_ROWS, recipeWitness } from './fixtures/clue-recipes.js';

/** @typedef {import('../core/engine/types.js').Pose} Pose */

const rows = [...RECIPE_BOARD_ROWS];
const board = boardFromRows(rows);
const pieces = CLASSIC_PENTOMINOES.map((p) => ({ id: p.id, label: p.label, color: p.color, cells: p.cells.map(([x, y]) => /** @type {import('../core/engine/types.js').XY} */ ([x, y])) }));
const witness = recipeWitness();
/** @param {string} ids */
const cluesOf = (ids) => witness.filter((p) => ids.includes(p.piece));
const master = cluesOf('YW');
const execution = () => ({ main: createWorkspace(MAIN_WORKSPACE_BYTES), scratch: createWorkspace(SCRATCH_WORKSPACE_BYTES) });
const x0 = /** @type {Pose} */ ({ piece: 'X', x: 0, y: 0, turn: 0, mirrored: false });

/** @param {import('../core/engine/types.js').PieceSet} set */
const wireSet = (set) => ({
  boardRows: boardToRows(set.board),
  pieces: set.pieces,
  witness: set.witness,
  carving: set.carving,
  macroRegion: set.macroRegion,
});

const attemptPayload = { boardRows: rows, rotation: 0, levelId: 'hard', seedText: 'fixture-set-0', uniqueness: 'any', attempt: 0 };

/** @param {object} pack */
const verify = (pack) => /** @type {{ results: { index: number, fingerprint: string, status: string }[] }} */ (
  executeTask('verifyPack', { pack }, execution()));

describe('executeTask returns exact engine results', () => {
  test('setAttempt and puzzleCandidate equal the direct engine calls', () => {
    const direct = setAttempt({ board, rotation: 0, levelId: 'hard', seedText: 'fixture-set-0', uniqueness: 'any', execution: execution() }, 0);
    const viaTask = /** @type {typeof direct} */ (executeTask('setAttempt', attemptPayload, execution()));
    assert.ok(direct.ok);
    assert.deepEqual(viaTask, direct);
    assert.deepEqual(structuredClone(viaTask), direct);

    const ctx = {
      set: direct.set,
      targetLevelId: 'hard',
      quantity: 10,
      batchSeed: 'fixture-set-0#1',
      uniqueness: /** @type {const} */ ('any'),
      seenLayouts: new Set(['x']),
      seenClues: new Set(),
    };
    const expected = puzzleCandidate({ ...ctx, execution: execution() }, 1, 0);
    const got = executeTask('puzzleCandidate', {
      set: wireSet(direct.set),
      targetLevelId: 'hard',
      quantity: 10,
      batchSeed: 'fixture-set-0#1',
      uniqueness: 'any',
      seenLayouts: ['x'],
      seenClues: [],
      slot: 1,
      attempt: 0,
    }, execution());
    assert.deepEqual(got, expected);
    assert.deepEqual(structuredClone(got), expected);
  });

  test('a long internal batch seed is used whole, not truncated to 64 code points', () => {
    const set = /** @type {any} */ (setAttempt({ board, rotation: 0, levelId: 'hard', seedText: 'fixture-set-0', uniqueness: 'any', execution: execution() }, 0)).set;
    const call = (/** @type {string} */ batchSeed) => executeTask('puzzleCandidate', {
      set: wireSet(set), targetLevelId: 'hard', quantity: 1, batchSeed, uniqueness: 'any', seenLayouts: [], seenClues: [], slot: 1, attempt: 0,
    }, execution());
    const long = `${'a'.repeat(64)}#1`;
    assert.deepEqual(call(long), puzzleCandidate({
      set, targetLevelId: 'hard', quantity: 1, batchSeed: long, uniqueness: 'any', seenLayouts: new Set(), seenClues: new Set(), execution: execution(),
    }, 1, 0));
  });

  test('certify, rate and solveFirst', () => {
    const ws = createWorkspace(MAIN_WORKSPACE_BYTES);
    const clues = cluesOf('LUNFX');
    assert.deepEqual(executeTask('certify', { boardRows: rows, pieces, clues, rowLimit: 10000 }, execution()), certify(board, pieces, clues, ws, 10000));
    assert.deepEqual(executeTask('rate', { boardRows: rows, pieces, clues }, execution()), rate(board, pieces, clues, ws));

    const solved = /** @type {ReturnType<typeof solveFirst>} */ (
      executeTask('solveFirst', { boardRows: rows, pieces, clues: master, rowLimit: 2000000 }, execution()));
    assert.ok(solved.layout !== null && isValidLayout(board, pieces, solved.layout));
    assert.deepEqual(solved, solveFirst(buildModel(board, pieces, master, ws), { rowTrialLimit: 2000000 }));

    const capped = /** @type {ReturnType<typeof solveFirst>} */ (
      executeTask('solveFirst', { boardRows: rows, pieces, clues: [], rowLimit: 0 }, execution()));
    assert.equal(capped.layout, null);
    assert.equal(capped.exhausted, false);
    assert.equal(capped.stop, 'row-limit');
  });

  test('solveFirst reports search progress through the execution callback', () => {
    const events = /** @type {{ stage: string, rowTrials: number }[]} */ ([]);
    const run = { ...execution(), onProgress: (/** @type {any} */ p) => events.push(p) };
    executeTask('solveFirst', { boardRows: rows, pieces, clues: [], rowLimit: 2000000, maxSolutions: 1 }, run);
    assert.ok(events.every((e) => e.stage === 'search' && e.rowTrials > 0));
  });

  test('enumerateLayouts reports exhausted and more outcomes with wire-safe results', () => {
    const board45 = Array(4).fill('#'.repeat(5));
    const four = ['F', 'L', 'U', 'Y'].map((id) => /** @type {typeof pieces[number]} */ (pieces.find((p) => p.id === id)));
    const direct = /** @type {any} */ (executeTask('enumerateLayouts', { boardRows: board45, pieces: four, seenLayouts: [] }, execution()));
    assert.equal(direct.status, 'more');
    assert.deepEqual(structuredClone(direct), direct);
    const ws = createWorkspace(MAIN_WORKSPACE_BYTES);
    const found = /** @type {Pose[][]} */ ([]);
    const model = buildModel(boardFromRows(board45), four, [], ws);
    model.cover.solve({ maxSolutions: Infinity, onSolution: (rowsChosen) => {
      found.push(Array.from(rowsChosen, (r) => rowPose(model, r)));
    } });
    const keys = [...new Set(found.map((layout) => layoutKey(boardFromRows(board45), four, layout)))];
    const exhausted = /** @type {any} */ (executeTask('enumerateLayouts', { boardRows: board45, pieces: four, seenLayouts: keys }, execution()));
    assert.equal(exhausted.status, 'exhausted');
    assert.equal(exhausted.total, 3);
    assert.equal(exhausted.why, undefined);

    const collected = /** @type {any} */ (executeTask('enumerateLayouts', { boardRows: board45, pieces: four, seenLayouts: [keys[0]], collect: 8 }, execution()));
    assert.deepEqual([collected.status, collected.complete, collected.total], ['more', true, 3]);
    assert.deepEqual(collected.layouts.map((/** @type {{ key: string }} */ l) => l.key), keys.slice(1).sort());
    assert.deepEqual(structuredClone(collected), collected);
    assert.throws(() => executeTask('enumerateLayouts', { boardRows: board45, pieces: four, seenLayouts: [], collect: 0 }, execution()), TaskError);
  });

  test('completionCandidate equals the direct engine call for a given layout', () => {
    const direct = setAttempt({ board, rotation: 0, levelId: 'hard', seedText: 'fixture-set-0', uniqueness: 'any', execution: execution() }, 0);
    assert.ok(direct.ok);
    const layout = /** @type {Pose[]} */ (direct.set.witness);
    const payload = {
      set: wireSet(direct.set), targetLevelId: 'hard', quantity: 4, batchSeed: 'fixture-set-0#1', uniqueness: 'any', seenLayouts: ['x'], seenClues: [], layout,
    };
    const expected = completionCandidate({
      set: direct.set, targetLevelId: 'hard', quantity: 4, batchSeed: 'fixture-set-0#1', uniqueness: 'any',
      seenLayouts: new Set(['x']), seenClues: new Set(), execution: execution(),
    }, layout);
    const got = executeTask('completionCandidate', payload, execution());
    assert.deepEqual(got, expected);
    assert.deepEqual(structuredClone(got), expected);
    assert.throws(() => executeTask('completionCandidate', { ...payload, layout: [x0] }, execution()), RangeError);
  });

  test('malformed payloads and unknown kinds never reach the engine', () => {
    const spy = execution();
    for (const [kind, payload] of /** @type {[any, any][]} */ ([
      ['rate', { boardRows: rows, pieces, clues: [], extra: 1 }],
      ['certify', { boardRows: rows, pieces, clues: [], rowLimit: -1 }],
      ['setAttempt', { ...attemptPayload, boardRows: ['#x'] }],
      ['nonsense', {}],
      ['rate', null],
    ])) {
      assert.throws(() => executeTask(kind, payload, spy), (e) => e instanceof TaskError && e.code === 'invalid-payload' && e.issues.length > 0);
    }
    assert.equal(spy.main.allocationCount(), 0);
    assert.equal(spy.scratch.allocationCount(), 0);
  });
});

describe('verifyPack', () => {
  const witnessPuzzle = { id: 'solved', clues: master, solution: witness, rating: null, certificate: null };
  const searchPuzzle = { id: 'search', clues: master, solution: null, rating: null, certificate: null };
  const impossible = { id: 'impossible', clues: [x0], solution: null, rating: null, certificate: null };
  const make = (/** @type {any[]} */ puzzles) => createPack({ board, rotation: 0, pieces, witness, puzzles });

  test('a stored solution proves existence without building a model; others are searched', () => {
    const run = execution();
    const out = /** @type {any} */ (executeTask('verifyPack', { pack: make([witnessPuzzle]) }, run));
    assert.equal(out.results.length, 1);
    assert.deepEqual(Object.keys(out.results[0]), ['index', 'fingerprint', 'status']);
    assert.equal(out.results[0].status, 'solvable');
    assert.match(out.results[0].fingerprint, /^[0-9a-f]{64}$/);
    assert.equal(run.main.allocationCount(), 0);

    const results = verify(make([witnessPuzzle, searchPuzzle, impossible])).results;
    assert.deepEqual(results.map((r) => [r.index, r.status]), [[0, 'solvable'], [1, 'solvable'], [2, 'unsatisfiable']]);
    assert.equal(results[0].fingerprint, results[1].fingerprint);
    assert.notEqual(results[0].fingerprint, results[2].fingerprint);
  });

  test('imported claims are ignored and a failed model stays not-verified, never unsatisfiable', () => {
    const ws = createWorkspace(MAIN_WORKSPACE_BYTES);
    const claimed = { ...searchPuzzle, rating: rate(board, pieces, master, ws), certificate: certify(board, pieces, master, ws, 10000) };
    const tiny = { main: createWorkspace(1024), scratch: createWorkspace(1024) };
    const out = /** @type {any} */ (executeTask('verifyPack', { pack: make([claimed]) }, tiny));
    assert.deepEqual(out.results.map((/** @type {any} */ r) => r.status), ['not-verified']);
    assert.ok(tiny.main.bytes() <= 1024);
    assert.equal(Object.hasOwn(out.results[0], 'rating'), false);
  });

  test('a malformed pack is an invalid-pack error with structured issues', () => {
    for (const pack of [{ format: 'nope' }, null, 5, 'text', make([witnessPuzzle]).board]) {
      assert.throws(() => executeTask('verifyPack', { pack }, execution()), (e) => {
        assert.ok(e instanceof TaskError);
        assert.equal(e.code, 'invalid-pack');
        assert.ok(e.issues.length > 0 && e.issues.every((i) => i.code && i.path));
        return true;
      });
    }
  });
});

describe('task handler', () => {
  /** @param {object} [options] */
  const harness = (options = {}) => {
    /** @type {any[]} */
    const replies = [];
    const handler = createTaskHandler({ post: (r) => replies.push(r), ...options });
    return { replies, handler };
  };
  const task = (/** @type {number} */ id, /** @type {string} */ kind, /** @type {object} */ payload) => ({ type: 'task', id, kind, payload });

  test('replies with a result and every reply passes the worker-message validator', () => {
    const { replies, handler } = harness();
    handler.handle(task(5, 'solveFirst', { boardRows: rows, pieces, clues: [], rowLimit: 2000000 }));
    assert.equal(replies.at(-1).type, 'result');
    assert.equal(replies.at(-1).id, 5);
    for (const reply of replies) {
      assert.ok(parseWorkerMessage(reply).ok, JSON.stringify(reply).slice(0, 100));
      assert.equal(reply.id, 5);
    }
  });

  test('reports allocated bytes immediately, including growth, as a non-decreasing high-water mark', () => {
    const { replies, handler } = harness();
    handler.handle(task(1, 'certify', { boardRows: rows, pieces, clues: master, rowLimit: 10000 }));
    handler.handle(task(2, 'rate', { boardRows: rows, pieces, clues: cluesOf('LUNFX') }));
    const memory = replies.filter((r) => r.type === 'progress' && r.stage === 'memory');
    assert.ok(memory.length > 0);
    assert.ok(memory[0].bytes > 0);
    for (let i = 1; i < memory.length; i += 1) {
      assert.ok(memory[i].bytes > memory[i - 1].bytes);
    }
    assert.equal(memory.at(-1).bytes, handler.bytes());
    assert.ok(handler.bytes() >= handler.main.bytes());
  });

  test('invalid messages are answered with invalid-task when they carry an id, otherwise dropped', () => {
    const { replies, handler } = harness();
    handler.handle({ type: 'task', id: 9, kind: 'rate', payload: { boardRows: rows } });
    handler.handle({ type: 'task', id: 10, kind: 'unknown', payload: {} });
    handler.handle({ type: 'task', id: -1, kind: 'rate', payload: {} });
    handler.handle(null);
    handler.handle('x');
    assert.deepEqual(replies.map((r) => [r.type, r.id, r.code]), [['error', 9, 'invalid-task'], ['error', 10, 'invalid-task']]);
    assert.ok(replies[0].issues.length > 0);
  });

  test('allocations above the declared capacity fail with model-too-large before any model is filled', () => {
    const { replies, handler } = harness({ mainBytes: 4096, scratchBytes: 4096 });
    handler.handle(task(3, 'certify', { boardRows: rows, pieces, clues: master, rowLimit: 10000 }));
    handler.handle(task(4, 'solveFirst', { boardRows: rows, pieces, clues: [], rowLimit: 100 }));
    const errors = replies.filter((r) => r.type === 'error');
    assert.deepEqual(errors.map((e) => [e.id, e.code]), [[3, 'model-too-large'], [4, 'model-too-large']]);
    assert.ok(handler.main.bytes() <= 4096);
    assert.ok(handler.bytes() <= 8192);
    assert.equal(replies.some((r) => r.type === 'result'), false);
  });

  test('engine errors become typed replies and never carry a stack', () => {
    const { replies, handler } = harness();
    handler.handle(task(1, 'setAttempt', { ...attemptPayload, levelId: 'hell-5' }));
    handler.handle(task(2, 'rate', { boardRows: rows, pieces, clues: [x0] }));
    handler.handle(task(3, 'verifyPack', { pack: { format: 'bad' } }));
    handler.handle(task(4, 'certify', { boardRows: rows, pieces, clues: [{ ...x0, piece: 'nope' }], rowLimit: 10 }));
    const errors = replies.filter((r) => r.type === 'error');
    assert.deepEqual(errors.map((e) => [e.id, e.code]), [[1, 'invalid-request'], [2, 'unsatisfiable'], [3, 'invalid-pack'], [4, 'invalid-clue']]);
    assert.ok(errors[2].issues.length > 0);
    assert.ok(errors.every((e) => !/\n\s+at /.test(e.message)));
    assert.equal(errorReply(1, new Error('boom')).type, 'error');
    assert.equal(/** @type {any} */ (errorReply(1, 'weird')).code, 'internal');
  });

  test('a result that cannot be sent still settles the task with an error', () => {
    /** @type {any[]} */
    const replies = [];
    const handler = createTaskHandler({
      post: (r) => {
        if (r.type === 'result') {
          throw new Error('DataCloneError');
        }
        replies.push(r);
      },
    });
    handler.handle(task(8, 'rate', { boardRows: rows, pieces, clues: master }));
    assert.deepEqual(replies.filter((r) => r.type === 'error').map((r) => [r.id, r.code]), [[8, 'internal']]);
  });

  test('the module worker entry wires message events to the shared handler', async () => {
    /** @type {any[]} */
    const posted = [];
    /** @type {((event: { data: unknown }) => void)[]} */
    const listeners = [];
    const scope = /** @type {any} */ (globalThis);
    await import('../core/workers/engine.worker.js?inert');
    assert.deepEqual(listeners, []);
    scope.postMessage = (/** @type {any} */ m) => posted.push(m);
    scope.addEventListener = (/** @type {string} */ type, /** @type {any} */ fn) => {
      assert.equal(type, 'message');
      listeners.push(fn);
    };
    try {
      await import('../core/workers/engine.worker.js?wired');
      assert.equal(listeners.length, 1);
      listeners[0]({ data: task(11, 'rate', { boardRows: rows, pieces, clues: master }) });
      listeners[0]({ data: { type: 'task', id: 12, kind: 'bogus', payload: {} } });
    } finally {
      delete scope.postMessage;
      delete scope.addEventListener;
    }
    assert.deepEqual(posted.filter((m) => m.type !== 'progress').map((m) => [m.type, m.id]), [['result', 11], ['error', 12]]);
  });
});
