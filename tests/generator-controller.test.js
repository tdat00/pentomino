// @ts-check
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

import { createGenerationClient, GenerationError } from '../core/browser/generation-client.js';
import { HandoffError } from '../core/browser/handoff.js';
import { createPool } from '../core/browser/worker-pool.js';
import { boardFromRows, boardKey, rectangle } from '../core/engine/board.js';
import { layoutKey } from '../core/engine/keys.js';
import { packBoard, parsePack, validatePack } from '../core/engine/pack.js';
import { BUDGETS } from '../core/engine/policy.js';
import { isValidLayout } from '../core/engine/tiling.js';
import { batchShortfall, createJobController, duplicateGuard } from '../generator/jobs.js';
import {
  acceptSet, createGeneratorStore, defaultGeneratorState, duplicateSetNumber, generationBlock, setTimelineLength, visiblePack, withBoard,
} from '../generator/state.js';
import { formatMessage, formatNotice } from '../generator/strings.js';
import { nodeWorkerFactory } from '../tools/node-worker.mjs';

const samplePack = /** @type {import('../core/engine/types.js').Pack} */ (
  /** @type {any} */ (parsePack(readFileSync(new URL('./fixtures/generated-sample-pack.json', import.meta.url), 'utf8'))).value);
const recipes = JSON.parse(readFileSync(new URL('./fixtures/ui-flow-recipes.json', import.meta.url), 'utf8')).recipes;
const WITNESS = samplePack.witness ?? /** @type {any} */ (samplePack.puzzles[0].solution);
/** @type {import('../core/engine/types.js').PieceSet} */
const SET = { board: packBoard(samplePack), pieces: samplePack.pieces, witness: WITNESS, carving: 'flat', macroRegion: null };
const handPack = /** @type {import('../core/engine/types.js').Pack} */ (
  /** @type {any} */ (parsePack(readFileSync(new URL('./fixtures/hand-authored-pack.json', import.meta.url), 'utf8'))).value);
/** A second set with other pieces on another board, for tests that need two different sets. @type {import('../core/engine/types.js').PieceSet} */
const OTHER_SET = {
  board: packBoard(handPack), pieces: handPack.pieces, witness: handPack.witness ?? /** @type {any} */ (handPack.puzzles[0].solution), carving: 'flat', macroRegion: null,
};
const DESKTOP = { phone: false };
/** @param {import('../generator/state.js').GeneratorState} state @returns {number} Saved sets of every board (the set on show is not saved). */
const savedCount = (state) => Object.values(state.setsByBoard).flat().length;

/**
 * @param {number} i
 * @param {number} [offset]
 * @returns {import('../core/engine/types.js').Puzzle}
 */
function makePuzzle(i, offset = 0) {
  const base = /** @type {any} */ (samplePack.puzzles[i % samplePack.puzzles.length]);
  return {
    id: `q${i}`,
    title: `Normal #${offset + i + 1}`,
    clues: base.clues,
    solution: base.solution,
    rating: { model: 'difficulty-v2', score: 14, level: 'normal', saturated: false, metrics: base.rating?.metrics ?? { U: 1, B: 1, branchTrials: 1, rowTrials: 1, stop: 'solution', R: 1, H: 1 } },
    certificate: null,
  };
}

/** @param {number} n @param {number} [from] @param {number} [offset] */
const makePuzzles = (n, from = 0, offset = 0) => Array.from({ length: n }, (_, i) => ({ ...makePuzzle(from + i), title: `Normal #${offset + i + 1}` }));

/** @returns {{ promise: Promise<void>, resolve: () => void }} */
function gate() {
  /** @type {() => void} */
  let resolve = () => {};
  const promise = new Promise((r) => {
    resolve = () => r(undefined);
  });
  return { promise, resolve };
}

const tick = () => new Promise((resolve) => setImmediate(resolve));

/**
 * A scriptable client. `batch(input, hooks)` and `set(input, hooks)` return the job result.
 * @param {{ set?: (input: any, hooks: any) => Promise<any> | any, batch?: (input: any, hooks: any) => Promise<any> | any, onCancel?: () => void }} script
 */
function fakeClient(script = {}) {
  /** @type {any[]} */
  const sets = [];
  /** @type {any[]} */
  const batches = [];
  /** @type {any[]} */
  const hooksSeen = [];
  const client = {
    sets,
    batches,
    hooksSeen,
    cancels: 0,
    /** @param {any} input @param {any} hooks */
    async generateSet(input, hooks) {
      sets.push(input);
      return script.set ? script.set(input, hooks) : { status: 'complete', set: SET, calibration: makePuzzle(0), attempt: 0 };
    },
    /** @param {any} input @param {any} hooks */
    async generateBatch(input, hooks) {
      batches.push(input);
      hooksSeen.push(hooks);
      if (script.batch) {
        return script.batch(input, hooks);
      }
      const puzzles = makePuzzles(input.quantity, batches.length * 20, input.displayOffset ?? 0);
      puzzles.forEach((puzzle, index) => hooks.onAccepted?.({ revision: input.revision, index, puzzle, accepted: index + 1, quantity: input.quantity }));
      return { status: 'complete', accepted: puzzles, seenLayouts: [], seenClues: [] };
    },
    cancel() {
      client.cancels += 1;
      script.onCancel?.();
    },
    recycle() {},
  };
  return client;
}

/**
 * @param {{ client?: ReturnType<typeof fakeClient>, state?: Partial<import('../generator/state.js').GeneratorState>, accepted?: boolean,
 *   options?: Partial<import('../generator/jobs.js').JobControllerOptions> }} [o]
 */
function harness(o = {}) {
  const client = o.client ?? fakeClient();
  let state = defaultGeneratorState({ board: SET.board, levelId: 'normal', ...o.state });
  if (o.accepted) {
    state = acceptSet(state, { set: SET, calibration: makePuzzle(0), setSeed: 'seed-one', trusted: true });
    state = { ...state, ...o.state };
  }
  const store = createGeneratorStore(state);
  const spies = { cancelPending: 0, navigations: 0 };
  const controller = createJobController({
    store,
    hardware: DESKTOP,
    client: /** @type {any} */ (client),
    // The fake puzzles of these tests reuse a few real clue sets under different ids, so the real duplicate check is off here.
    duplicateGuard: () => ({ admit: () => true, rejected: new Set() }),
    cancelPending: () => {
      spies.cancelPending += 1;
    },
    beforeNavigate: () => {
      spies.navigations += 1;
    },
    ...o.options,
  });
  return {
    client,
    store,
    controller,
    spies,
    destroy: () => controller.destroy(),
  };
}

describe('piece set jobs', () => {
  test('a finished set replaces the old one in one update and keeps a trusted calibration', async () => {
    const h = harness();
    const seen = /** @type {boolean[]} */ ([]);
    h.store.subscribe((state, previous) => {
      if (state.set !== previous.set) {
        seen.push(state.job === null);
      }
    });
    await h.controller.generateSet({ seed: 'AAAA' });
    const state = h.store.getState();
    assert.deepEqual(seen, [true]);
    assert.equal(state.job, null);
    assert.equal(state.set, SET);
    assert.equal(state.setSeed, 'AAAA');
    assert.equal(state.batchIndex, 0);
    assert.equal(state.calibrationTrusted, true);
    assert.deepEqual(state.calibrationFor, { levelId: 'normal', uniqueness: 'any' });
    assert.equal(h.client.sets[0].seedText, 'AAAA');
    assert.equal(h.client.sets[0].levelId, 'normal');
    h.destroy();
  });

  test('a failed, cancelled or faulty request never replaces the accepted set', async () => {
    const outcomes = [
      [{ status: 'failed', reason: 'time-limit' }, 'N-NOSET', formatNotice('N-NOSET', { level: 'Normal' })],
      [{ status: 'cancelled' }, 'M-CANCELLED-SET', formatMessage('M-CANCELLED-SET')],
      [new GenerationError('model-too-large', 'x'), 'N-TOOLARGE', formatNotice('N-TOOLARGE')],
      [new GenerationError('worker-unavailable', 'x'), 'N-NOWORKER', formatNotice('N-NOWORKER')],
    ];
    for (const [outcome, code, text] of outcomes) {
      const client = fakeClient({
        set: async () => {
          if (outcome instanceof Error) {
            throw outcome;
          }
          return outcome;
        },
      });
      const h = harness({ client, accepted: true });
      const before = h.store.getState();
      await h.controller.generateSet({ seed: 'BBBB' });
      const after = h.store.getState();
      assert.equal(after.set, before.set, code);
      assert.equal(after.setSeed, 'seed-one');
      assert.equal(after.job, null);
      assert.equal(after.notice?.code, code);
      assert.equal(after.notice?.text, text);
      h.destroy();
    }
  });

  test('no workers shows N-NOWORKER without starting a job', async () => {
    const h = harness({ options: { workersAvailable: false } });
    await h.controller.generateSet({ seed: 'AAAA' });
    assert.equal(h.client.sets.length, 0);
    assert.equal(h.store.getState().notice?.text, formatNotice('N-NOWORKER'));
    h.destroy();
  });
});

describe('puzzle batches', () => {
  test('Remove all empties the list but keeps the seen-history; nothing happens during a job', async () => {
    const h = harness({ accepted: true, state: { quantity: 3 } });
    await h.controller.addMore();
    const seen = h.store.getState().seenLayouts.length;
    assert.ok(h.store.getState().puzzles.length > 0 && seen > 0);
    h.controller.removeAllPuzzles();
    const state = h.store.getState();
    assert.deepEqual([state.puzzles.length, Object.keys(state.puzzleSeeds).length], [0, 0]);
    assert.equal(state.seenLayouts.length, seen, 'removed puzzles stay in the history');
    assert.equal(state.batchIndex, 1, 'the batch counter goes on');
    h.controller.removeAllPuzzles();
    assert.equal(h.store.getState(), state, 'an empty list is left alone');
    h.destroy();
  });

  test('a new puzzle equal to a listed one is not added, and the notice says no more can be made', async () => {
    /** @type {number[]} */
    const picks = [0, 0, 1];
    const client = fakeClient({
      batch: (input, hooks) => {
        const puzzle = { ...makePuzzle(picks[input.batchIndex - 1]), id: `fresh${input.batchIndex}` };
        hooks.onAccepted({ revision: input.revision, index: 0, puzzle, accepted: 1, quantity: 1 });
        return { status: 'complete', accepted: [puzzle], seenLayouts: [], seenClues: [] };
      },
    });
    const h = harness({ accepted: true, client, state: { quantity: 1 }, options: { duplicateGuard } });
    await h.controller.addMore();
    assert.deepEqual(h.store.getState().puzzles.map((p) => p.id), ['fresh1']);
    await h.controller.addMore();
    let state = h.store.getState();
    assert.deepEqual(state.puzzles.map((p) => p.id), ['fresh1'], 'the equal puzzle is not listed, not even while streaming');
    assert.deepEqual([state.notice?.code, state.notice?.kind], ['M-DUPLICATE', 'error']);
    assert.equal(state.puzzleSeeds.fresh2, undefined);
    await h.controller.addMore();
    state = h.store.getState();
    assert.deepEqual(state.puzzles.map((p) => p.id), ['fresh1', 'fresh3'], 'a different puzzle still goes in');
    assert.equal(state.notice, null);
    h.destroy();
  });

  test('every press uses its own fresh random whole-number batch seed', async () => {
    let n = 0;
    const h = harness({ accepted: true, state: { quantity: 2 }, options: { randomNumber: () => String(1000 + (n += 1)) } });
    await h.controller.addMore();
    const first = h.store.getState().puzzles.map((p) => p.id);
    assert.equal(first.length, 2);
    assert.deepEqual(first.map((id) => h.store.getState().puzzleSeeds[id]), ['1001', '1001'], 'a press draws a random number');
    assert.equal(h.client.batches[0].batchSeed, '1001', 'the request carries it');
    await h.controller.addMore();
    assert.equal(h.client.batches[1].batchSeed, '1002', 'the next press draws another');
    const all = h.store.getState();
    assert.deepEqual(all.puzzles.map((p) => all.puzzleSeeds[p.id]), ['1001', '1001', '1002', '1002']);
    assert.deepEqual(h.client.batches.map((b) => b.batchIndex), [1, 2], 'the press counter still counts every request');
    h.destroy();
  });

  test('every request increments the batch index; a regenerated identical set is refused, so the batch state stays', async () => {
    const h = harness({ accepted: true });
    await h.controller.addMore();
    await h.controller.addMore();
    assert.deepEqual(h.client.batches.map((b) => [b.setSeed, b.batchIndex]), [['seed-one', 1], ['seed-one', 2]]);
    assert.ok(h.client.batches[1].seenLayouts.length > 0, 'the second request sees the first batch');
    assert.equal(h.client.batches[0].calibration?.id, 'q0', 'the first request reuses the trusted calibration');
    await h.controller.generateSet({ seed: 'seed-one' });
    assert.equal(h.store.getState().notice?.code, 'N-DUPSET');
    assert.equal(h.store.getState().batchIndex, 2, 'nothing was replaced');
    assert.ok(h.store.getState().seenLayouts.length > 0);
    await h.controller.addMore();
    assert.deepEqual([h.client.batches[2].setSeed, h.client.batches[2].batchIndex], ['seed-one', 3]);
    h.destroy();
  });

  test('every press appends after the visible puzzles and numbers on', async () => {
    const h = harness({ accepted: true, state: { quantity: 5 } });
    await h.controller.addMore();
    h.store.update({ quantity: 3 });
    await h.controller.addMore();
    const state = h.store.getState();
    assert.deepEqual(h.client.batches.map((b) => b.displayOffset), [0, 5]);
    assert.deepEqual(state.puzzles.map((p) => p.title), ['Normal #1', 'Normal #2', 'Normal #3', 'Normal #4', 'Normal #5', 'Normal #6', 'Normal #7', 'Normal #8']);
    h.destroy();
  });

  test('a calibration made for another level is not reused, and a stored one never is', async () => {
    const h = harness({ accepted: true });
    h.store.update({ batchLevelId: 'easy' });
    await h.controller.addMore();
    assert.equal(h.client.batches[0].targetLevelId, 'easy');
    assert.equal('calibration' in h.client.batches[0], false);
    const restored = harness({ accepted: true, state: { calibrationTrusted: false } });
    await restored.controller.addMore();
    assert.equal('calibration' in restored.client.batches[0], false);
    h.destroy();
    restored.destroy();
  });

  test('partial batches keep the set, count the request and map to the exact notices', async () => {
    const cases = /** @type {const} */ ([
      ['time-limit', 'N-PARTIAL', []],
      ['layouts-not-found', 'N-FEWLAYOUTS', ['new-set']],
      ['difficulty-not-found', 'N-SETLEVEL', ['new-set']],
      ['uniqueness-not-proved', 'N-UNIQUE', []],
    ]);
    for (const [reason, code, actions] of cases) {
      const client = fakeClient({
        batch: (input, hooks) => {
          const puzzles = makePuzzles(2, 50);
          puzzles.forEach((puzzle, index) => hooks.onAccepted({ revision: input.revision, index, puzzle, accepted: index + 1, quantity: input.quantity }));
          return { status: 'partial', reason, accepted: puzzles, seenLayouts: ['l1'], seenClues: ['c1'] };
        },
      });
      const h = harness({ client, accepted: true, state: { quantity: 4 } });
      const set = h.store.getState().set;
      await h.controller.addMore();
      const state = h.store.getState();
      assert.equal(state.set, set);
      assert.equal(state.batchIndex, 1);
      assert.equal(state.puzzles.length, 2);
      assert.equal(state.notice?.code, code);
      assert.deepEqual(state.notice?.actions, actions);
      assert.equal(state.notice?.text, formatNotice(code, { n: 2, q: 4, level: 'Normal' }));
      assert.equal(state.levelId, 'normal');
      assert.ok(state.seenLayouts.includes('l1'));
      h.destroy();
    }
  });

  test('a counted arrangement shortfall reads "Found N/M arrangements" and is not a warning; unproven ones are', async () => {
    const base = { method: 'cell-backtracking-v1', placements: 10, nodes: 3, solutions: 4, elapsedMs: 5 };
    const cases = /** @type {const} */ ([
      [{ ...base, status: 'exhausted', total: 2, earlier: 0 }, 'N-ARRANGEMENTS', 'info',
        'Found 2/2 arrangements, the most this piece set allows. Generate a new piece set for more Normal puzzles.'],
      [{ ...base, status: 'exhausted', total: 6, earlier: 4 }, 'N-ARRANGEMENTS', 'info',
        'Found 2/2 remaining arrangements (6 in total), the most this piece set has left. Generate a new piece set for more Normal puzzles.'],
      [{ ...base, status: 'more' }, 'N-LAYOUTS-LEFT', 'warning',
        'Found 2 of 4 different Normal puzzles. This piece set has more arrangements, but none gave another Normal puzzle in the search. Try again, or generate a new piece set for more.'],
      [{ ...base, status: 'unproven', why: 'placements-limit' }, 'N-FEWLAYOUTS', 'warning',
        'Found 2 of 4 different Normal puzzles; no more were found. This piece set may allow only a few different arrangements — generate a new piece set for more.'],
      [{ ...base, status: 'more', found: 3, searched: true, tried: 3, added: 0, unusable: 3, unusableWhy: 'not-in-band' }, 'N-LAYOUTS-UNUSED', 'warning',
        'Found 2 of 4 different Normal puzzles. Every other arrangement of this piece set (3) was tried, and none has a clue set that rates Normal. Generate a new piece set for more Normal puzzles.'],
      [{ ...base, status: 'more', found: 32, searched: false, tried: 32, added: 0, unusable: 32, unusableWhy: 'uniqueness-not-proved' }, 'N-LAYOUTS-UNUSED', 'warning',
        'Found 2 of 4 different Normal puzzles. The other arrangements tried (32) have no clue set with exactly one solution that rates Normal, and the search did not cover every arrangement of this piece set. Try again, or generate a new piece set for more.'],
      [{ ...base, status: 'more', found: 2, searched: false, tried: 2, added: 2, unusable: 0 }, 'N-FEWLAYOUTS', 'warning',
        'Found 2 of 4 different Normal puzzles; no more were found. This piece set may allow only a few different arrangements — generate a new piece set for more.'],
    ]);
    for (const [arrangements, code, kind, text] of cases) {
      const client = fakeClient({
        batch: (input, hooks) => {
          const puzzles = makePuzzles(2, 50);
          puzzles.forEach((puzzle, index) => hooks.onAccepted({ revision: input.revision, index, puzzle, accepted: index + 1, quantity: input.quantity }));
          return { status: 'partial', reason: 'layouts-not-found', accepted: puzzles, seenLayouts: ['l1'], seenClues: ['c1'], arrangements };
        },
      });
      const h = harness({ client, accepted: true, state: { quantity: 4 } });
      await h.controller.addMore();
      const { notice, puzzles } = h.store.getState();
      assert.equal(puzzles.length, 2);
      assert.deepEqual([notice?.code, notice?.kind, notice?.text], [code, kind, text]);
      assert.deepEqual(notice?.actions, ['new-set'], 'a new piece set stays available');
      h.destroy();
    }
    assert.equal(batchShortfall('layouts-not-found', { n: 0, q: 4, levelId: 'normal', arrangements: { ...base, status: 'exhausted', total: 6, earlier: 6 } })?.text,
      'This piece set has no arrangements left: all 6 have been used. Generate a new piece set for more Normal puzzles.');

    const filled = fakeClient({
      batch: (input, hooks) => {
        const puzzles = makePuzzles(4, 50);
        puzzles.forEach((puzzle, index) => hooks.onAccepted({ revision: input.revision, index, puzzle, accepted: index + 1, quantity: input.quantity }));
        return {
          status: 'complete', accepted: puzzles, seenLayouts: ['l1'], seenClues: ['c1'],
          arrangements: { ...base, status: 'more', found: 2, searched: true, tried: 2, added: 2, unusable: 0 },
        };
      },
    });
    const done = harness({ client: filled, accepted: true, state: { quantity: 4 } });
    await done.controller.addMore();
    assert.equal(done.store.getState().puzzles.length, 4);
    assert.equal(done.store.getState().notice, null, 'a batch the completion pass filled is a plain success');
    done.destroy();
  });

  test('a batch without a single result keeps the listed puzzles and still counts the request', async () => {
    const h = harness({ accepted: true });
    await h.controller.addMore();
    const first = h.store.getState().puzzles;
    h.client.batches.length = 0;
    const failing = fakeClient({ batch: () => ({ status: 'partial', reason: 'layouts-not-found', accepted: [], seenLayouts: [], seenClues: [] }) });
    const h2 = harness({ client: failing, accepted: true, state: { puzzles: first } });
    await h2.controller.addMore();
    assert.deepEqual(h2.store.getState().puzzles, first);
    assert.equal(h2.store.getState().batchIndex, 1);
    h.destroy();
    h2.destroy();
  });

  test('cancel keeps the streamed prefix, the set and its calibration; nothing is invented', async () => {
    const release = gate();
    /** @type {any} */
    let hooks;
    const client = fakeClient({
      batch: async (input, h) => {
        hooks = h;
        const puzzles = makePuzzles(2, 60);
        puzzles.forEach((puzzle, index) => h.onAccepted({ revision: input.revision, index, puzzle, accepted: index + 1, quantity: input.quantity }));
        await release.promise;
        return { status: 'cancelled', accepted: puzzles, seenLayouts: [], seenClues: [] };
      },
    });
    const h = harness({ client, accepted: true });
    const before = h.store.getState();
    const running = h.controller.addMore();
    await tick();
    assert.equal(h.store.getState().puzzles.length, 2, 'cards stream in');
    assert.equal(h.store.getState().job?.accepted, 2);
    h.controller.cancel();
    assert.equal(client.cancels, 1);
    assert.equal(h.store.getState().job?.cancelling, true);
    release.resolve();
    await running;
    const after = h.store.getState();
    assert.equal(after.job, null);
    assert.equal(after.puzzles.length, 2);
    assert.equal(after.set, before.set);
    assert.equal(after.calibration, before.calibration);
    assert.equal(after.notice?.code, 'M-CANCELLED-BATCH');
    assert.deepEqual(after.checking, []);
    assert.ok(hooks);
    h.destroy();
  });

  test('a fault keeps the prefix the client reports, and a full history asks for a reset', async () => {
    const faulty = fakeClient({
      batch: () => {
        throw new GenerationError('internal', 'worker lost', { accepted: makePuzzles(2, 70), seenLayouts: ['kept-layout'], seenClues: ['kept-clue'] });
      },
    });
    const h = harness({ client: faulty, accepted: true });
    await h.controller.addMore();
    assert.equal(h.store.getState().puzzles.length, 2);
    assert.ok(h.store.getState().seenLayouts.includes('kept-layout'));
    assert.equal(h.store.getState().notice?.code, 'M-FAILED');
    h.destroy();

    const full = harness({ accepted: true, state: { quantity: 1, seenLayouts: Array.from({ length: BUDGETS.historyKeys }, (_, i) => `k${i}`) } });
    await full.controller.addMore();
    const notice = full.store.getState().notice;
    assert.equal(full.client.batches.length, 0);
    assert.equal(full.store.getState().batchIndex, 0);
    assert.deepEqual([notice?.code, notice?.actions], ['M-HISTORY-FULL', ['reset-history']]);
    assert.equal(notice?.text, formatMessage('M-HISTORY-FULL', { used: BUDGETS.historyKeys, max: BUDGETS.historyKeys }));
    full.controller.resetHistory();
    assert.deepEqual(full.store.getState().seenLayouts, []);
    await full.controller.addMore();
    assert.equal(full.client.batches.length, 1);
    full.controller.resetHistory();
    assert.equal(full.store.getState().batchIndex, 1, 'a history reset does not rewind the batch index');
    full.destroy();
  });

  test('capacity: a request is clamped to the 100 puzzle limit and refused when full', async () => {
    const h = harness({ accepted: true, state: { puzzles: makePuzzles(98, 100), quantity: 5 } });
    await h.controller.addMore();
    assert.equal(h.client.batches[0].quantity, 2);
    h.destroy();
    const full = harness({ accepted: true, state: { puzzles: makePuzzles(100, 100) } });
    await full.controller.addMore();
    assert.equal(full.client.batches.length, 0);
    assert.equal(full.store.getState().notice?.code, 'M-PACK-FULL');
    full.destroy();
  });

  test('the list stops at the pack size limit: New Puzzle is refused when no puzzle would fit, and one that does not fit is dropped', async () => {
    const huge = (/** @type {number} */ i) => ({
      ...makePuzzle(i, 0),
      solution: Array.from({ length: 4000 }, () => /** @type {any} */ (makePuzzle(0).solution)[0]),
    });
    const client = fakeClient({
      batch: (input, hooks) => {
        const puzzles = [huge(200), huge(201)];
        puzzles.forEach((puzzle, index) => hooks.onAccepted({ revision: input.revision, index, puzzle, accepted: index + 1, quantity: input.quantity }));
        return { status: 'complete', accepted: puzzles, seenLayouts: [], seenClues: [] };
      },
    });
    const h = harness({ client, accepted: true, state: { puzzles: [huge(300)], quantity: 2 } });
    await h.controller.addMore();
    const state = h.store.getState();
    assert.equal(state.notice?.code, 'M-PACK-SIZE');
    assert.equal(state.notice?.text, formatMessage('M-PACK-SIZE', { kib: 512 }));
    assert.deepEqual(state.puzzles.map((p) => p.id), ['q300', 'q200'], 'the puzzle past the limit is not listed');

    await h.controller.addMore();
    assert.equal(h.client.batches.length, 1, 'a full list starts no job');
    assert.equal(h.store.getState().notice?.code, 'M-PACK-SIZE');
    assert.equal(h.store.getState().puzzles.length, 2);
    h.destroy();

    const cancelled = harness({
      client: fakeClient({
        batch: (input, hooks) => {
          const puzzles = [huge(210), huge(211)];
          puzzles.forEach((puzzle, index) => hooks.onAccepted({ revision: input.revision, index, puzzle, accepted: index + 1, quantity: input.quantity }));
          return { status: 'cancelled', accepted: puzzles, seenLayouts: [], seenClues: [] };
        },
      }),
      accepted: true,
      state: { puzzles: [huge(300)], quantity: 2 },
    });
    await cancelled.controller.addMore();
    assert.equal(cancelled.store.getState().notice?.code, 'M-PACK-SIZE', 'a cancelled batch still explains the puzzle it dropped');
    assert.equal(cancelled.store.getState().puzzles.length, 2);
    cancelled.destroy();
  });

  test('removing a card renumbers the titles but keeps the seen history', async () => {
    const h = harness({ accepted: true });
    await h.controller.addMore();
    const seen = h.store.getState().seenLayouts.length;
    const second = h.store.getState().puzzles[1].id;
    h.controller.removePuzzle(second);
    const state = h.store.getState();
    assert.equal(state.puzzles.length, 4);
    assert.deepEqual(state.puzzles.map((p) => p.title), ['Normal #1', 'Normal #2', 'Normal #3', 'Normal #4']);
    assert.equal(state.seenLayouts.length, seen);
    h.destroy();
  });

  test('stale hooks cannot change state: late accepts and certificates of old requests are ignored', async () => {
    const h = harness({ accepted: true });
    await h.controller.addMore();
    const hooks = h.client.hooksSeen[0];
    const revision = h.client.batches[0].revision;
    const ids = h.store.getState().checking;
    assert.equal(ids.length, 5, 'certificates are pending after the batch');
    const certificate = { status: 'unique', model: 'dlx-v1', rowLimit: 1, verified: true };
    hooks.onCertificate({ revision: 'old', puzzleId: ids[0], certificate });
    assert.equal(h.store.getState().puzzles.find((p) => p.id === ids[0])?.certificate, null, 'a foreign revision is ignored');
    hooks.onCertificate({ revision, puzzleId: ids[0], certificate });
    assert.equal(h.store.getState().puzzles.find((p) => p.id === ids[0])?.certificate?.status, 'unique');
    assert.equal(h.store.getState().checking.length, 4);
    const puzzlesBefore = h.store.getState().puzzles;
    hooks.onAccepted({ revision, index: 9, puzzle: makePuzzle(99), accepted: 6, quantity: 5 });
    assert.equal(h.store.getState().puzzles, puzzlesBefore, 'no job owns that revision any more');
    await h.controller.generateSet({ seed: 'seed-one' });
    assert.deepEqual(h.store.getState().checking, [], 'a user action ends the pending checks: they read "not checked"');
    hooks.onCertificate({ revision, puzzleId: ids[1], certificate });
    assert.equal(h.store.getState().puzzles.find((p) => p.id === ids[1])?.certificate, null);
    assert.ok(h.spies.cancelPending >= 2);
    h.destroy();
  });
});

describe('hand-off and set history', () => {
  test('Play opens the validated visible pack on the chosen puzzle and explains when it cannot', async () => {
    /** @type {Array<[any, number]>} */
    const opened = [];
    let refuse = false;
    let block = false;
    const h = harness({
      accepted: true,
      options: {
        openPlayer: async (pack, index) => {
          if (block) {
            throw new HandoffError('popup-blocked', 'blocked');
          }
          if (refuse) {
            throw new HandoffError('handoff-unavailable', 'no link');
          }
          opened.push([pack, index]);
        },
      },
    });
    await h.controller.addMore();
    const ids = h.store.getState().puzzles.map((p) => p.id);
    await h.controller.playPuzzle(ids[0]);
    await h.controller.playPuzzle(ids[2]);
    assert.deepEqual(opened.map(([, index]) => index), [0, 2]);
    const result = validatePack(opened[0][0]);
    assert.ok(result.ok);
    assert.equal(opened[0][0].puzzles.length, 5);
    assert.deepEqual([opened[0][0].generation.batchIndex, opened[0][0].generation.setSeed], [1, 'seed-one']);
    assert.equal(h.spies.navigations, 2, 'state is saved before every hand-off');
    refuse = true;
    await h.controller.playPuzzle(ids[0]);
    assert.equal(h.store.getState().notice?.code, 'M-PLAYER-UNAVAILABLE');
    assert.equal(h.store.getState().puzzles.length, 5);
    refuse = false;
    block = true;
    await h.controller.playPuzzle(ids[0]);
    assert.equal(h.store.getState().notice?.code, 'M-PLAYER-BLOCKED', 'a blocked tab is explained');
    assert.equal(h.store.getState().puzzles.length, 5);
    h.destroy();
  });

  test('stepping through the set history swaps sets without losing any', async () => {
    const client = fakeClient({ set: () => ({ status: 'complete', set: OTHER_SET, calibration: null, attempt: 0 }) });
    const h = harness({ accepted: true, client });
    await h.controller.addMore();
    await h.controller.generateSet({ seed: 'seed-two' });
    const state = h.store.getState();
    assert.equal(savedCount(state), 1);
    assert.equal(state.setSeed, 'seed-two');
    h.controller.stepSet(1);
    assert.equal(h.store.getState().setSeed, 'seed-one');
    assert.equal(h.store.getState().puzzles.length, 5);
    assert.equal(h.store.getState().setPosition, 1);
    assert.equal(h.store.getState().calibrationTrusted, false);
    h.controller.stepSet(-1);
    assert.equal(h.store.getState().setSeed, 'seed-two');
    assert.equal(savedCount(h.store.getState()), 1);
    h.controller.stepSet(-1);
    assert.equal(h.store.getState().setPosition, 0);
    h.destroy();
  });

  test('stepping and removing only touch the sets of the board in step 1; the sets of other boards stay saved', async () => {
    const small = rectangle(5, 4);
    const SMALL_SET = { ...SET, board: small };
    const client = fakeClient({ set: () => ({ status: 'complete', set: SMALL_SET, calibration: null, attempt: 0 }) });
    const h = harness({ accepted: true, client });
    h.store.update((s) => acceptSet(s, { set: SET, calibration: null, setSeed: 'seed-two' }));
    assert.equal(setTimelineLength(h.store.getState()), 2, 'two sets for the first board');
    h.store.update((s) => withBoard(s, small));
    assert.deepEqual([setTimelineLength(h.store.getState()), h.store.getState().set], [0, null], 'no set for the new board yet: the list is empty');
    await h.controller.generateSet({ seed: 'seed-small' });
    let state = h.store.getState();
    assert.deepEqual([state.setSeed, setTimelineLength(state)], ['seed-small', 1]);
    assert.deepEqual(Object.keys(state.setsByBoard), [boardKey(SET.board)], 'the first board keeps its own list');
    h.controller.stepSet(1);
    h.controller.stepSet(-1);
    assert.equal(h.store.getState().setSeed, 'seed-small', 'there is nowhere to step on this board');
    // Back on the first board, its newest set comes up.
    h.store.update((s) => withBoard(s, SET.board));
    state = h.store.getState();
    assert.deepEqual([state.setSeed, setTimelineLength(state)], ['seed-two', 2]);
    h.controller.stepSet(1);
    assert.equal(h.store.getState().setSeed, 'seed-one');
    h.controller.stepSet(-1);
    state = h.store.getState();
    assert.deepEqual([state.setSeed, setTimelineLength(state)], ['seed-two', 2]);
    h.controller.removeAllSets();
    state = h.store.getState();
    assert.deepEqual([state.set, Object.keys(state.setsByBoard)], [null, [boardKey(small)]], 'the sets of the small board are still saved');
    h.destroy();
  });

  test('a generated set that repeats one in the list (same board and piece shapes) is not added; that set is shown', async () => {
    const other = fakeClient({
      set: (/** @type {{ seedText: string }} */ input) => ({
        status: 'complete', set: input.seedText.startsWith('again') ? SET : OTHER_SET, calibration: null, attempt: 0,
      }),
    });
    const h = harness({ accepted: true, client: other });
    await h.controller.generateSet({ seed: 'seed-two' });
    assert.equal(setTimelineLength(h.store.getState()), 2, 'a different set is added');
    await h.controller.generateSet({ seed: 'seed-three' });
    let state = h.store.getState();
    assert.equal(state.notice?.code, 'N-DUPSET');
    assert.equal(state.notice?.text, formatNotice('N-DUPSET', { n: 2 }), 'it repeats the set on show, Set 2 of 2');
    assert.deepEqual([state.setSeed, state.setPosition, setTimelineLength(state), state.job], ['seed-two', 0, 2, null], 'nothing is added or changed');

    // On Set 2 (newest), generating Set 1's pieces again jumps back to Set 1.
    await h.controller.generateSet({ seed: 'again-one' });
    state = h.store.getState();
    assert.deepEqual([state.setSeed, state.setPosition, setTimelineLength(state)], ['seed-one', 1, 2], 'switched to the older, repeated set');
    assert.equal(state.notice?.text, formatNotice('N-DUPSET', { n: 1 }));
    assert.equal(state.set?.board.width, SET.board.width, 'its board came with it');

    // On Set 1, generating Set 2's pieces again jumps forward to Set 2.
    await h.controller.generateSet({ seed: 'seed-four' });
    state = h.store.getState();
    assert.deepEqual([state.setSeed, state.setPosition, setTimelineLength(state)], ['seed-two', 0, 2], 'switched to the newer, repeated set');
    assert.equal(state.set?.board.width, OTHER_SET.board.width);
    assert.equal(duplicateSetNumber(state, OTHER_SET), 2);
    assert.equal(duplicateSetNumber(state, SET), 1);
    h.destroy();
  });

  test('Remove set drops the set on show and its puzzles; Remove all sets clears every set', async () => {
    const h = harness({ accepted: true });
    await h.controller.addMore();
    h.store.update((s) => ['seed-two', 'seed-three'].reduce(
      (state, setSeed) => acceptSet(state, { set: SET, calibration: null, setSeed }), s));
    assert.equal(setTimelineLength(h.store.getState()), 3);
    h.controller.removeSet();
    let state = h.store.getState();
    assert.deepEqual([state.setSeed, state.setPosition, setTimelineLength(state)], ['seed-two', 0, 2], 'the next older set takes its place');
    h.controller.stepSet(1);
    assert.equal(h.store.getState().setSeed, 'seed-one');
    assert.equal(h.store.getState().puzzles.length, 5);
    h.controller.removeSet();
    state = h.store.getState();
    assert.deepEqual([state.setSeed, state.setPosition, setTimelineLength(state), state.puzzles.length], ['seed-two', 0, 1, 0],
      'removing the oldest set falls back to the newer one; its puzzles went with it');
    h.store.update((s) => acceptSet(s, { set: SET, calibration: null, setSeed: 'seed-four' }));
    h.controller.removeAllSets();
    state = h.store.getState();
    assert.deepEqual([state.set, state.setSeed, savedCount(state), state.puzzles.length, setTimelineLength(state)], [null, null, 0, 0, 0]);
    h.controller.removeSet();
    assert.equal(h.store.getState(), state, 'nothing left to remove');
    h.destroy();
  });
});

describe('generation limits', () => {
  test('sets outside the generator limits stay usable but explain why they cannot start puzzles', () => {
    const few = { ...SET, pieces: SET.pieces.slice(0, 2) };
    const state = defaultGeneratorState({ board: SET.board, set: few, setSeed: 's', levelId: 'normal' });
    assert.equal(generationBlock(state, DESKTOP), formatMessage('M-FEWPIECES'));
    const wide = { ...SET, board: rectangle(20, 19) };
    const big = defaultGeneratorState({ board: wide.board, set: wide, setSeed: 's', levelId: 'hard' });
    assert.equal(generationBlock(big, { phone: true }), formatNotice('N-CAP', { area: 380, max: 360 }));
    assert.equal(generationBlock(big, DESKTOP), null);
    const small = { ...SET, board: boardFromRows(['####', '####', '####']) };
    assert.equal(generationBlock(defaultGeneratorState({ board: small.board, set: small, setSeed: 's' }), DESKTOP), formatNotice('N-SMALL'));
  });
});

describe('controller discipline', () => {
  test('the controller never runs a solver on the main thread', () => {
    const source = readFileSync(new URL('../generator/jobs.js', import.meta.url), 'utf8');
    assert.doesNotMatch(source, /\b(solveFirst|countSolutions|buildModel|randomTiling|lnsWalk|selectClues|certify|rate)\(/);
    assert.doesNotMatch(source, /from '\.\.\/core\/engine\/(dlx|clues|generate|carve|workspace)\.js'/);
  });

  test('a shared pack identity: the visible pack is rebuilt only when its content changes', () => {
    const state = { ...acceptSet(defaultGeneratorState({ board: SET.board }), { set: SET, calibration: null, setSeed: 's' }), puzzles: makePuzzles(2) };
    const pack = visiblePack(state);
    assert.equal(visiblePack({ ...state }), pack);
    assert.notEqual(visiblePack({ ...state, puzzles: makePuzzles(2) }), pack);
    assert.equal(visiblePack({ ...state, puzzles: [] }), null);
  });
});

describe('real engine flows (slow)', () => {
  for (const recipe of recipes) {
    test(`slow: ${recipe.name}: set, ${recipe.quantity} puzzles, Play keeps every piece and clue`, async () => {
      const pool = createPool({ size: 2, workerFactory: nodeWorkerFactory() });
      const client = createGenerationClient(pool);
      const board = boardFromRows(recipe.boardRows);
      const store = createGeneratorStore(defaultGeneratorState({
        board, rotation: recipe.rotation, levelId: recipe.levelId, uniqueness: recipe.uniqueness, quantity: recipe.quantity,
      }));
      /** @type {any[]} */
      const opened = [];
      const controller = createJobController({
        store,
        hardware: DESKTOP,
        client,
        cancelPending: () => pool.cancelAll(),
        // The recorded batches were made with the seed "<set seed>#1": feed it as the batch seed so the replay is exact.
        randomNumber: () => `${recipe.seedText}#1`,
        openPlayer: async (pack, index) => {
          opened.push([pack, index]);
        },
      });
      try {
        await controller.generateSet({ seed: recipe.seedText });
        const afterSet = store.getState();
        assert.equal(afterSet.notice, null);
        assert.equal(afterSet.set?.pieces.length, recipe.expect.pieces);
        const setBefore = afterSet.set;
        await controller.addMore();
        const state = store.getState();
        assert.equal(state.notice, null);
        assert.equal(state.set, setBefore, 'New Puzzle never changes the set');
        assert.equal(state.puzzles.length, recipe.expect.puzzles);
        assert.deepEqual(state.puzzles.map((p) => Math.round(p.rating?.score ?? -1)), recipe.expect.scores);
        const layouts = new Set(state.puzzles.map((p) => layoutKey(board, state.set?.pieces ?? [], p.solution ?? [])));
        assert.equal(layouts.size, state.puzzles.length, 'every puzzle has its own arrangement');
        for (const puzzle of state.puzzles) {
          assert.ok(isValidLayout(board, state.set?.pieces ?? [], puzzle.solution ?? []));
        }
        await controller.playPuzzle(state.puzzles[state.puzzles.length - 1].id);
        const [pack, index] = opened[0];
        assert.equal(index, state.puzzles.length - 1);
        assert.ok(validatePack(pack).ok);
        assert.deepEqual(pack.pieces, state.set?.pieces);
        assert.deepEqual(pack.puzzles.map((/** @type {any} */ p) => p.clues), state.puzzles.map((p) => p.clues));
        assert.equal(pack.presentation.rotation, recipe.rotation);
      } finally {
        controller.destroy();
        pool.close();
      }
    });
  }
});
