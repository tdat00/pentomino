// @ts-check
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

import { createGenerationClient, GenerationError } from '../core/browser/generation-client.js';
import { HandoffError } from '../core/browser/handoff.js';
import { createPool } from '../core/browser/worker-pool.js';
import { boardFromRows, rectangle } from '../core/engine/board.js';
import { layoutKey } from '../core/engine/keys.js';
import { packBoard, parsePack, serializePack, validatePack } from '../core/engine/pack.js';
import { BUDGETS } from '../core/engine/policy.js';
import { isValidLayout } from '../core/engine/tiling.js';
import { batchShortfall, createJobController } from '../generator/jobs.js';
import {
  acceptSet, buildPack, carvingHint, createGeneratorStore, defaultGeneratorState, generationBlock, visiblePack,
} from '../generator/state.js';
import { formatMessage, formatNotice } from '../generator/strings.js';
import { nodeWorkerFactory } from '../tools/node-worker.mjs';

const samplePack = /** @type {import('../core/engine/types.js').Pack} */ (
  /** @type {any} */ (parsePack(readFileSync(new URL('./fixtures/generated-sample-pack.json', import.meta.url), 'utf8'))).value);
const recipes = JSON.parse(readFileSync(new URL('./fixtures/ui-flow-recipes.json', import.meta.url), 'utf8')).recipes;
const WITNESS = samplePack.witness ?? /** @type {any} */ (samplePack.puzzles[0].solution);
/** @type {import('../core/engine/types.js').PieceSet} */
const SET = { board: packBoard(samplePack), pieces: samplePack.pieces, witness: WITNESS, carving: 'flat', macroRegion: null };
const DESKTOP = { phone: false };

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
  /** @type {Array<(() => void) | null>} */
  const timers = [];
  const spies = { cancelPending: 0, notices: /** @type {string[]} */ ([]), saved: 0, navigations: 0, downloads: /** @type {any[]} */ ([]) };
  const controller = createJobController({
    store,
    hardware: DESKTOP,
    client: /** @type {any} */ (client),
    random: () => 'ZZZZ-ZZZZ-ZZZZ',
    setTimer: (fn) => timers.push(fn),
    clearTimer: (handle) => {
      timers[handle - 1] = null;
    },
    cancelPending: () => {
      spies.cancelPending += 1;
    },
    notify: (message) => spies.notices.push(message),
    beforeNavigate: () => {
      spies.navigations += 1;
    },
    download: (pack, name, opts) => spies.downloads.push({ pack, name, opts }),
    ...o.options,
  });
  return {
    client,
    store,
    controller,
    spies,
    /** Runs pending timers and lets promises settle. */
    async settle() {
      for (let round = 0; round < 4; round += 1) {
        const due = timers.splice(0).filter((fn) => fn !== null);
        for (const fn of due) {
          fn?.();
        }
        await tick();
      }
    },
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
  test('every request increments the batch index; a regenerated set with the same seed starts at 0 again', async () => {
    const h = harness({ accepted: true });
    await h.controller.newPuzzles();
    await h.controller.newPuzzles();
    assert.deepEqual(h.client.batches.map((b) => [b.setSeed, b.batchIndex]), [['seed-one', 1], ['seed-one', 2]]);
    assert.ok(h.client.batches[1].seenLayouts.length > 0, 'the second request sees the first batch');
    assert.equal(h.client.batches[0].calibration?.id, 'q0', 'the first request reuses the trusted calibration');
    await h.controller.generateSet({ seed: 'seed-one' });
    assert.equal(h.store.getState().batchIndex, 0);
    assert.deepEqual(h.store.getState().seenLayouts, []);
    await h.controller.newPuzzles();
    assert.deepEqual([h.client.batches[2].setSeed, h.client.batches[2].batchIndex, h.client.batches[2].seenLayouts], ['seed-one', 1, []]);
    h.destroy();
  });

  test('New puzzles replaces the batch at #1 and Add more appends after the visible ones', async () => {
    const h = harness({ accepted: true, state: { quantity: 5 } });
    await h.controller.newPuzzles();
    h.store.update({ quantity: 3 });
    await h.controller.addMore();
    const state = h.store.getState();
    assert.equal(h.client.batches[1].displayOffset, 5);
    assert.deepEqual(state.puzzles.map((p) => p.title), ['Normal #1', 'Normal #2', 'Normal #3', 'Normal #4', 'Normal #5', 'Normal #6', 'Normal #7', 'Normal #8']);
    await h.controller.newPuzzles();
    assert.equal(h.client.batches[2].displayOffset, 0);
    assert.equal(h.store.getState().puzzles.length, 3);
    h.destroy();
  });

  test('a calibration made for another level is not reused, and a stored one never is', async () => {
    const h = harness({ accepted: true });
    h.store.update({ batchLevelId: 'easy' });
    await h.controller.newPuzzles();
    assert.equal(h.client.batches[0].targetLevelId, 'easy');
    assert.equal('calibration' in h.client.batches[0], false);
    const restored = harness({ accepted: true, state: { calibrationTrusted: false } });
    await restored.controller.newPuzzles();
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
      await h.controller.newPuzzles();
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
      await h.controller.newPuzzles();
      const { notice, puzzles } = h.store.getState();
      assert.equal(puzzles.length, 2);
      assert.deepEqual([notice?.code, notice?.kind, notice?.text], [code, kind, text]);
      assert.deepEqual(notice?.actions, ['new-set'], 'a new piece set stays available');
      h.destroy();
    }
    assert.equal(batchShortfall('layouts-not-found', { n: 0, q: 4, levelId: 'normal', arrangements: { ...base, status: 'exhausted', total: 6, earlier: 6 } })?.text,
      'This piece set has no arrangements left: all 6 have been used. Generate a new piece set for more Normal puzzles.');
  });

  test('a batch without a single result keeps the earlier batch and still counts the request', async () => {
    const h = harness({ accepted: true });
    await h.controller.newPuzzles();
    const first = h.store.getState().puzzles;
    h.client.batches.length = 0;
    const failing = fakeClient({ batch: () => ({ status: 'partial', reason: 'layouts-not-found', accepted: [], seenLayouts: [], seenClues: [] }) });
    const h2 = harness({ client: failing, accepted: true, state: { puzzles: first } });
    await h2.controller.newPuzzles();
    assert.equal(h2.store.getState().puzzles, first);
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
    const running = h.controller.newPuzzles();
    await tick();
    assert.equal(h.store.getState().puzzles.length, 2, 'cards stream in');
    assert.equal(h.store.getState().job?.accepted, 2);
    h.controller.cancel();
    assert.equal(client.cancels, 1);
    assert.equal(h.store.getState().job?.stage, 'cancelling');
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

  test('a fault keeps the prefix the client reports, and history-full asks to reset or ask for fewer', async () => {
    const faulty = fakeClient({
      batch: () => {
        throw new GenerationError('internal', 'worker lost', { accepted: makePuzzles(2, 70), seenLayouts: ['kept-layout'], seenClues: ['kept-clue'] });
      },
    });
    const h = harness({ client: faulty, accepted: true });
    await h.controller.newPuzzles();
    assert.equal(h.store.getState().puzzles.length, 2);
    assert.ok(h.store.getState().seenLayouts.includes('kept-layout'));
    assert.equal(h.store.getState().notice?.code, 'M-FAILED');
    h.destroy();

    const full = harness({ accepted: true, state: { seenLayouts: Array.from({ length: BUDGETS.historyKeys - 2 }, (_, i) => `k${i}`) } });
    await full.controller.newPuzzles();
    const notice = full.store.getState().notice;
    assert.equal(full.client.batches.length, 0);
    assert.equal(full.store.getState().batchIndex, 0);
    assert.deepEqual(notice?.actions, ['reset-history', 'smaller-quantity']);
    assert.equal(notice?.room, 2);
    full.controller.requestFewer(2);
    assert.equal(full.store.getState().quantity, 2);
    await full.controller.newPuzzles();
    assert.equal(full.client.batches.length, 1);
    full.controller.resetHistory();
    assert.deepEqual(full.store.getState().seenLayouts, []);
    assert.equal(full.store.getState().batchIndex, 1, 'a history reset does not rewind the batch index');
    full.destroy();
  });

  test('capacity: Add more is clamped to the 100 puzzle limit and refused when full', async () => {
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

  test('a pack that would pass the byte limit is split and its earlier puzzles stay exportable', async () => {
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
    const h = harness({ client, accepted: true, state: { puzzles: [huge(300), huge(301)].map((p, i) => ({ ...p, title: `Normal #${i + 1}` })), quantity: 2 } });
    await h.controller.addMore();
    const state = h.store.getState();
    assert.equal(state.notice?.code, 'M-SPLIT');
    assert.equal(state.parked.length, 1);
    assert.deepEqual(state.parked[0].map((p) => p.id), ['q300', 'q301']);
    assert.deepEqual(state.puzzles.map((p) => [p.id, p.title]), [['q200', 'Normal #1'], ['q201', 'Normal #2']]);
    h.controller.exportParked(0);
    assert.deepEqual(h.spies.downloads[0].pack.puzzles.map((/** @type {any} */ p) => p.id), ['q300', 'q301']);
    h.destroy();
  });

  test('removing a card renumbers the titles but keeps the seen history', async () => {
    const h = harness({ accepted: true });
    await h.controller.newPuzzles();
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
    await h.controller.newPuzzles();
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
    h.controller.prepareNavigation();
    assert.deepEqual(h.store.getState().checking, [], 'a user action ends the pending checks: they read "not checked"');
    hooks.onCertificate({ revision, puzzleId: ids[1], certificate });
    assert.equal(h.store.getState().puzzles.find((p) => p.id === ids[1])?.certificate, null);
    assert.ok(h.spies.cancelPending >= 2);
    h.destroy();
  });
});

describe('links, hand-off and export', () => {
  /** @param {import('../core/engine/types.js').Pack} pack @param {number} index */
  const link = async (pack, index) => ({ href: `https://example.test/player/#pack=${pack.puzzles.length}&i=${index}`, portable: true });

  test('links belong to the exact pack they were encoded for; a late encoding of an old pack is dropped', async () => {
    /** @type {Array<{ pack: any, index: number, done: (item: any) => void }>} */
    const pending = [];
    const prepareLink = (/** @type {any} */ pack, /** @type {number} */ index) => new Promise((resolve) => {
      pending.push({ pack, index, done: resolve });
    });
    const h = harness({ accepted: true, state: { quantity: 2 }, options: { prepareLink: /** @type {any} */ (prepareLink) } });
    await h.controller.newPuzzles();
    await h.settle();
    const first = pending.splice(0);
    assert.equal(first.length, 2);
    const firstPack = visiblePack(h.store.getState());
    h.controller.removePuzzle(h.store.getState().puzzles[0].id);
    await h.settle();
    const second = pending.splice(0);
    assert.equal(second.length, 1);
    for (const item of second) {
      item.done({ href: 'https://example.test/new', portable: true });
    }
    await h.settle();
    const current = visiblePack(h.store.getState());
    assert.equal(h.store.getState().links.pack, current);
    for (const item of first) {
      item.done({ href: 'https://example.test/old', portable: true });
    }
    await h.settle();
    assert.equal(h.store.getState().links.pack, current, 'the stale encoding did not replace the current links');
    assert.notEqual(firstPack, current);
    assert.equal(h.store.getState().links.items[0].href, 'https://example.test/new');
    h.destroy();
  });

  test('links are prepared once a job is over, never while it streams', async () => {
    let calls = 0;
    const h = harness({ accepted: true, options: { prepareLink: async (pack, index) => { calls += 1; return link(pack, index); } } });
    await h.settle();
    assert.equal(calls, 0);
    await h.controller.newPuzzles();
    await h.settle();
    assert.equal(calls, 5);
    assert.deepEqual(h.store.getState().links.ids, h.store.getState().puzzles.map((p) => p.id));
    h.destroy();
  });

  test('Play all and Play use the validated visible pack and fall back honestly when no link can be made', async () => {
    /** @type {Array<[any, number]>} */
    const opened = [];
    let refuse = false;
    const h = harness({
      accepted: true,
      options: {
        openPlayer: async (pack, index) => {
          if (refuse) {
            throw new HandoffError('handoff-unavailable', 'no link');
          }
          opened.push([pack, index]);
        },
        saveLibrary: () => {
          throw new Error('library denied');
        },
      },
    });
    await h.controller.newPuzzles();
    await h.controller.playAll();
    await h.controller.playPuzzle(h.store.getState().puzzles[2].id);
    assert.deepEqual(opened.map(([, index]) => index), [0, 2]);
    const result = validatePack(opened[0][0]);
    assert.ok(result.ok);
    assert.equal(opened[0][0].puzzles.length, 5);
    assert.equal(h.spies.navigations, 2, 'state is saved before every hand-off');
    h.controller.prepareNavigation();
    refuse = true;
    await h.controller.playAll();
    assert.equal(h.store.getState().notice?.code, 'M-PLAYER-UNAVAILABLE');
    assert.equal(h.store.getState().puzzles.length, 5);
    h.destroy();
  });

  test('same-tab navigation cancels a running job; copy warns about long links and refuses missing ones', async () => {
    const release = gate();
    const client = fakeClient({
      batch: async (input, hooks) => {
        const puzzles = makePuzzles(1, 80);
        hooks.onAccepted({ revision: input.revision, index: 0, puzzle: puzzles[0], accepted: 1, quantity: input.quantity });
        await release.promise;
        return { status: 'cancelled', accepted: puzzles, seenLayouts: [], seenClues: [] };
      },
    });
    /** @type {string[]} */
    const copied = [];
    let item = /** @type {any} */ ({ href: 'https://example.test/long', portable: true, warning: 'long' });
    const h = harness({
      client,
      accepted: true,
      options: { prepareLink: async () => item, copy: async (text) => { copied.push(text); return true; } },
    });
    const running = h.controller.newPuzzles();
    await tick();
    h.controller.prepareNavigation();
    assert.equal(client.cancels, 1);
    release.resolve();
    await running;
    await h.controller.copyPuzzleLink(h.store.getState().puzzles[0].id);
    assert.deepEqual(copied, ['https://example.test/long']);
    assert.equal(h.spies.notices.at(-1), formatNotice('N-LONGLINK'));
    item = { href: null, portable: false, warning: 'too large for a link' };
    await h.controller.copyPackLink();
    assert.equal(copied.length, 1);
    assert.equal(h.spies.notices.at(-1), 'too large for a link');
    h.destroy();
  });

  test('exports carry every accepted puzzle, pending certificates included, and honor the omit-answers switch', async () => {
    const h = harness({ accepted: true, state: { omitSolutions: true } });
    await h.controller.newPuzzles();
    assert.equal(h.store.getState().checking.length, 5);
    h.controller.exportPack();
    h.controller.exportPuzzle(h.store.getState().puzzles[1].id);
    h.controller.exportSet();
    const [all, one, set] = h.spies.downloads;
    assert.equal(all.pack.puzzles.length, 5);
    assert.ok(all.pack.puzzles.every((/** @type {any} */ p) => p.certificate === null || p.certificate === undefined));
    assert.equal(all.opts.omitSolutions, true);
    assert.deepEqual(one.pack.puzzles.map((/** @type {any} */ p) => p.id), [h.store.getState().puzzles[1].id]);
    assert.equal(set.pack.puzzles.length, 0);
    assert.equal(set.pack.kind, 'piece-set');
    assert.ok(Array.isArray(set.pack.witness));
    assert.equal(all.pack.generation.batchIndex, 1);
    assert.equal(all.pack.generation.setSeed, 'seed-one');
    h.destroy();
  });

  test('stepping through the set history swaps sets without losing any', async () => {
    const h = harness({ accepted: true });
    await h.controller.newPuzzles();
    await h.controller.generateSet({ seed: 'seed-two' });
    const state = h.store.getState();
    assert.equal(state.setHistory.length, 1);
    assert.equal(state.setSeed, 'seed-two');
    h.controller.stepSet(1);
    assert.equal(h.store.getState().setSeed, 'seed-one');
    assert.equal(h.store.getState().puzzles.length, 5);
    assert.equal(h.store.getState().setPosition, 1);
    assert.equal(h.store.getState().calibrationTrusted, false);
    h.controller.stepSet(-1);
    assert.equal(h.store.getState().setSeed, 'seed-two');
    assert.equal(h.store.getState().setHistory.length, 1);
    h.controller.stepSet(-1);
    assert.equal(h.store.getState().setPosition, 0);
    h.destroy();
  });
});

describe('imports', () => {
  const ownPack = () => {
    const state = acceptSet(defaultGeneratorState({ board: SET.board }), { set: SET, calibration: makePuzzle(0), setSeed: 'import-seed', trusted: true });
    return { ...state, batchIndex: 3, puzzles: makePuzzles(2) };
  };
  /** @param {import('../core/engine/types.js').Pack} pack @param {object} [o] */
  const text = (pack, o = {}) => serializePack(pack, o);

  test('a pack with a witness restores seed and batch index; the next request continues after it', async () => {
    const source = ownPack();
    const h = harness();
    assert.equal(await h.controller.importText(text(buildPack(source))), true);
    const state = h.store.getState();
    assert.equal(state.setSeed, 'import-seed');
    assert.equal(state.batchIndex, 3);
    assert.equal(state.calibration, null);
    assert.equal(state.calibrationTrusted, false);
    assert.deepEqual(state.set?.witness, WITNESS);
    assert.equal(state.puzzles.length, 2);
    assert.deepEqual(state.claimedIds, state.puzzles.map((p) => p.id));
    assert.deepEqual(Object.values(state.verification), ['solvable', 'solvable']);
    assert.equal(state.notice?.code, 'M-IMPORTED');
    assert.match(state.notice?.text ?? '', /claims until checked/);
    await h.controller.newPuzzles();
    assert.equal(h.client.batches[0].batchIndex, 4);
    assert.equal('calibration' in h.client.batches[0], false);
    h.destroy();
  });

  test('without a witness the first puzzle answer is the reference; a missing seed gets a fresh local one', async () => {
    const withoutWitness = { ...buildPack(ownPack()), witness: null };
    const withoutSeed = { ...withoutWitness, generation: { app: 'x' } };
    const h = harness();
    await h.controller.importText(JSON.stringify(withoutSeed));
    const state = h.store.getState();
    assert.deepEqual(state.set?.witness, /** @type {any} */ (samplePack.puzzles[0]).solution);
    assert.equal(state.setSeed, 'ZZZZ-ZZZZ-ZZZZ');
    assert.equal(state.batchIndex, 0);
    assert.equal(state.set?.carving, 'imported');
    h.destroy();
  });

  test('without any answer a worker finds a first arrangement; a cutoff is never called unsatisfiable', async () => {
    const answerFree = JSON.parse(text(buildPack(ownPack()), { omitSolutions: true }));
    /** @type {any[]} */
    const asked = [];
    const run = (/** @type {any} */ reply) => async (/** @type {string} */ kind, /** @type {any} */ payload) => {
      asked.push([kind, payload]);
      return kind === 'solveFirst' ? reply : { results: payload.pack.puzzles.map((/** @type {any} */ p, /** @type {number} */ index) => ({ index, status: index === 0 ? 'solvable' : 'not-verified' })) };
    };

    const solved = harness({ options: { runWorkerTask: run({ layout: WITNESS, exhausted: false }) } });
    await solved.controller.importText(JSON.stringify(answerFree));
    await solved.settle();
    assert.deepEqual(solved.store.getState().set?.witness, WITNESS);
    assert.equal(asked[0][0], 'solveFirst');
    assert.deepEqual(asked[0][1].clues, []);
    assert.equal(asked[0][1].rowLimit, BUDGETS.verifyRows);
    const statuses = solved.store.getState().verification;
    assert.deepEqual(Object.values(statuses).sort(), ['not-verified', 'solvable']);
    assert.equal(generationBlock(solved.store.getState(), DESKTOP), null);

    const cutoff = harness({ options: { runWorkerTask: run({ layout: null, exhausted: false }) } });
    await cutoff.controller.importText(JSON.stringify(answerFree));
    assert.equal(cutoff.store.getState().set?.witness, null);
    assert.equal(generationBlock(cutoff.store.getState(), DESKTOP), formatMessage('M-NOWITNESS'));
    assert.ok(!/no arrangement of these pieces/i.test(cutoff.store.getState().notice?.text ?? ''));
    await cutoff.controller.newPuzzles();
    assert.equal(cutoff.client.batches.length, 0, 'an imported set without a reference cannot start New Puzzles');

    const none = harness({ options: { runWorkerTask: run({ layout: null, exhausted: true }) } });
    await none.controller.importText(JSON.stringify(answerFree));
    assert.match(none.store.getState().notice?.text ?? '', /No arrangement of these pieces fills the board/);
    for (const item of [solved, cutoff, none]) {
      item.destroy();
    }
  });

  test('import checks that were still running are reported as not verified when a new action starts', async () => {
    const answerFree = JSON.parse(text(buildPack(ownPack()), { omitSolutions: true }));
    const release = gate();
    const h = harness({
      options: {
        runWorkerTask: async (kind) => {
          if (kind === 'solveFirst') {
            return { layout: WITNESS, exhausted: false };
          }
          await release.promise;
          return { results: [] };
        },
      },
    });
    await h.controller.importText(JSON.stringify(answerFree));
    await tick();
    assert.deepEqual(new Set(Object.values(h.store.getState().verification)), new Set(['checking']));
    await h.controller.newPuzzles();
    assert.deepEqual(new Set(Object.values(h.store.getState().verification)), new Set(['not-verified']));
    release.resolve();
    h.destroy();
  });

  test('rejected imports change nothing', async () => {
    const h = harness({ accepted: true });
    const before = h.store.getState();
    for (const bad of ['{"format":"nope"}', 'not a pack', '{"format":"pentomino-pack","version":9}']) {
      assert.equal(await h.controller.importText(bad), false);
      const state = h.store.getState();
      assert.equal(state.set, before.set);
      assert.equal(state.puzzles, before.puzzles);
      assert.equal(state.setSeed, before.setSeed);
      assert.equal(state.notice?.code, 'M-IMPORT-FAILED');
    }
    assert.equal(await h.controller.importFile({ size: 600 * 1024, text: async () => '' }), false);
    assert.equal(h.store.getState().set, before.set);
    h.destroy();
  });

  test('macro-region hints are reused only when they match this generator and the piece order', () => {
    const base = buildPack(ownPack());
    const k = base.pieces.length;
    const region = Array.from({ length: k }, (_, i) => i % 3);
    const hint = (/** @type {any} */ generation) => carvingHint({ ...base, generation });
    assert.deepEqual(hint({ algo: 'gen-v2', carving: 'macro', macroRegion: region }), { carving: 'macro', macroRegion: region });
    assert.deepEqual(hint({ algo: 'gen-v2', carving: 'flat' }), { carving: 'flat', macroRegion: null });
    for (const generation of [
      { algo: 'gen-v2', carving: 'macro', macroRegion: region.slice(1) },
      { algo: 'gen-v2', carving: 'macro', macroRegion: region.map(() => 'a') },
      { algo: 'gen-v2', carving: 'macro', macroRegion: region.map((_, i) => (i === 0 ? -1 : 0)) },
      { algo: 'gen-v2', carving: 'macro', macroRegion: region.map((_, i) => (i === 0 ? k : 0)) },
      { algo: 'gen-v9', carving: 'macro', macroRegion: region },
      { carving: 'macro', macroRegion: region },
      undefined,
    ]) {
      assert.deepEqual(hint(generation), { carving: 'imported', macroRegion: null });
    }
  });

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
        openPlayer: async (pack, index) => {
          opened.push([pack, index]);
        },
        setTimer: () => 0,
        clearTimer: () => {},
      });
      try {
        await controller.generateSet({ seed: recipe.seedText });
        const afterSet = store.getState();
        assert.equal(afterSet.notice, null);
        assert.equal(afterSet.set?.pieces.length, recipe.expect.pieces);
        const setBefore = afterSet.set;
        await controller.newPuzzles();
        const state = store.getState();
        assert.equal(state.notice, null);
        assert.equal(state.set, setBefore, 'New Puzzles never changes the set');
        assert.equal(state.puzzles.length, recipe.expect.puzzles);
        assert.deepEqual(state.puzzles.map((p) => Math.round(p.rating?.score ?? -1)), recipe.expect.scores);
        const layouts = new Set(state.puzzles.map((p) => layoutKey(board, state.set?.pieces ?? [], p.solution ?? [])));
        assert.equal(layouts.size, state.puzzles.length, 'every puzzle has its own arrangement');
        for (const puzzle of state.puzzles) {
          assert.ok(isValidLayout(board, state.set?.pieces ?? [], puzzle.solution ?? []));
        }
        await controller.playAll();
        await controller.playPuzzle(state.puzzles[state.puzzles.length - 1].id);
        const [pack, index] = opened[1];
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
