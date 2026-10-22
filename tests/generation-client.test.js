// @ts-check
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

import { createGenerationClient, GenerationError } from '../core/browser/generation-client.js';
import { createPool } from '../core/browser/worker-pool.js';
import { boardFromRows } from '../core/engine/board.js';
import { firstSetAttempt, puzzleCandidate } from '../core/engine/generate.js';
import { canonicalKey } from '../core/engine/geometry.js';
import { layoutDistance } from '../core/engine/keys.js';
import { validatePack } from '../core/engine/pack.js';
import { createTaskHandler } from '../core/engine/tasks.js';
import { createWorkspace, MAIN_WORKSPACE_BYTES, SCRATCH_WORKSPACE_BYTES } from '../core/engine/workspace.js';

const recipe = JSON.parse(readFileSync(new URL('./fixtures/generation-case.json', import.meta.url), 'utf8'));
const CREATED_AT = '2026-01-01T00:00:00.000Z';
const settle = async () => {
  for (let i = 0; i < 6; i += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
};

function createFakeClock() {
  let now = 1000;
  let seq = 0;
  /** @type {{ at: number, fn: () => void, id: number }[]} */
  let timers = [];
  return {
    now: () => now,
    setTimeout: (/** @type {() => void} */ fn, /** @type {number} */ ms) => {
      seq += 1;
      timers.push({ at: now + ms, fn, id: seq });
      return seq;
    },
    clearTimeout: (/** @type {unknown} */ id) => {
      timers = timers.filter((t) => t.id !== id);
    },
    /** @param {number} ms */
    advance(ms) {
      const target = now + ms;
      for (;;) {
        const due = timers.filter((t) => t.at <= target).sort((a, b) => a.at - b.at || a.id - b.id)[0];
        if (due === undefined) {
          break;
        }
        timers = timers.filter((t) => t !== due);
        now = Math.max(now, due.at);
        due.fn();
      }
      now = target;
    },
  };
}

/**
 * @typedef {{ value: unknown } | { error: string }} Outcome
 * @typedef {{ worker: FakeWorker, id: number, kind: string, payload: any }} Task
 */

class FakeWorker {
  /** @param {(worker: FakeWorker, message: any) => void} onTask */
  constructor(onTask) {
    this.onTask = onTask;
    this.terminated = false;
    /** @type {Record<string, ((e: any) => void)[]>} */
    this.listeners = {};
  }

  /** @param {any} message */
  postMessage(message) {
    this.onTask(this, message);
  }

  terminate() {
    this.terminated = true;
  }

  /** @param {string} type @param {(e: any) => void} fn */
  addEventListener(type, fn) {
    (this.listeners[type] ??= []).push(fn);
  }

  /** Delivers even after termination: the pool must ignore such late replies. @param {any} data */
  send(data) {
    for (const fn of this.listeners.message ?? []) {
      fn({ data });
    }
  }
}

/**
 * A pool of scripted workers. `handler` answers a task with an outcome, or returns
 * undefined to hold it until the test calls `answer`.
 * @param {{ size?: number, handler?: (task: Task) => Outcome | undefined }} [o]
 */
function harness(o = {}) {
  const clock = createFakeClock();
  /** @type {FakeWorker[]} */
  const workers = [];
  /** @type {Task[]} */
  const tasks = [];
  /** @type {Task[]} */
  const held = [];
  const pool = createPool({
    size: o.size ?? 4,
    clock,
    workerFactory: () => {
      const worker = new FakeWorker((w, message) => {
        const task = { worker: w, id: message.id, kind: message.kind, payload: message.payload };
        tasks.push(task);
        const outcome = o.handler?.(task);
        if (outcome === undefined) {
          held.push(task);
        } else {
          queueMicrotask(() => answer(task, outcome));
        }
      });
      workers.push(worker);
      return worker;
    },
  });
  /** @param {Task} task @param {Outcome} outcome */
  const answer = (task, outcome) => {
    if ('error' in outcome) {
      task.worker.send({ type: 'error', id: task.id, code: outcome.error, message: 'scripted failure' });
    } else {
      task.worker.send({ type: 'result', id: task.id, value: outcome.value });
    }
  };
  return { pool, clock, workers, tasks, held, answer };
}

/** @param {ReturnType<typeof harness>} h @param {object} [extra] */
const clientOf = (h, extra = {}) => createGenerationClient(h.pool, { clock: h.clock, createdAt: () => CREATED_AT, ...extra });

/** Real engine data shared by the tests, built once. */
let cached;
function fixture() {
  if (cached !== undefined) {
    return cached;
  }
  const execution = { main: createWorkspace(MAIN_WORKSPACE_BYTES), scratch: createWorkspace(SCRATCH_WORKSPACE_BYTES) };
  const board = boardFromRows(recipe.boardRows);
  const found = firstSetAttempt({
    board, rotation: 0, levelId: recipe.levelId, seedText: recipe.seedText, uniqueness: recipe.uniqueness, execution,
  });
  assert.ok(found.result !== null);
  const { set, calibration } = found.result;
  const ctx = {
    set, targetLevelId: recipe.levelId, quantity: 10, batchSeed: recipe.batchSeed, uniqueness: recipe.uniqueness,
    seenLayouts: new Set(), seenClues: new Set(), execution,
  };
  /** Ten real candidates whose layouts differ pairwise by at least the preferred distance of 3. */
  const chosen = [];
  for (let slot = 1; chosen.length < 10 && slot <= 12; slot += 1) {
    for (let attempt = 0; attempt < 12 && chosen.length < 10; attempt += 1) {
      const c = puzzleCandidate(ctx, slot, attempt);
      const ok = !('fail' in c) && chosen.every((p) => p.clueKey !== c.clueKey && p.layoutKey !== c.layoutKey
        && layoutDistance(board, set.pieces, p.layout, c.layout) >= 3);
      if (ok) {
        chosen.push(c);
      }
    }
  }
  assert.equal(chosen.length, 10);
  cached = { board, set, calibration, attempt: found.result.attempt, chosen };
  return cached;
}

const setInput = (over = {}) => ({
  boardRows: recipe.boardRows, rotation: 0, levelId: 'hard', seedText: 'fixture-set-0', uniqueness: 'any', maxActive: 676, ...over,
});
const batchInput = (over = {}) => ({
  set: fixture().set,
  rotation: 0,
  targetLevelId: 'hard',
  quantity: 10,
  setSeed: 'fixture-set-0',
  batchIndex: 1,
  uniqueness: 'any',
  seenLayouts: /** @type {string[]} */ ([]),
  seenClues: /** @type {string[]} */ ([]),
  ...over,
});
/** @param {number} n */
const setSuccess = (n) => ({ ok: true, set: fixture().set, calibration: fixture().calibration, attempt: n });

/** Candidate of slot `s` at attempt 0 from the pre-selected list; later attempts fail. @param {Task} t @param {number} [offset] */
const scripted = (t, offset = 0) => (t.payload.attempt === 0
  ? { value: fixture().chosen[t.payload.slot - 1 + offset] }
  : { value: { fail: 'layout' } });

/** @param {Promise<unknown>} promise */
function track(promise) {
  /** @type {{ state: string, value?: any, error?: any }} */
  const out = { state: 'pending' };
  promise.then((value) => Object.assign(out, { state: 'resolved', value }), (error) => Object.assign(out, { state: 'rejected', error }));
  return out;
}

/** @param {Task} t */
const attemptOf = (t) => t.payload.attempt;

describe('piece-set requests', () => {
  test('the lowest successful attempt wins and higher in-flight attempts are terminated', async () => {
    const h = harness();
    const client = clientOf(h);
    const result = track(client.generateSet(setInput()));
    await settle();
    assert.deepEqual(h.held.map(attemptOf), [0, 1, 2, 3]);
    h.answer(/** @type {Task} */ (h.held.find((t) => attemptOf(t) === 1)), { value: setSuccess(1) });
    await settle();
    assert.equal(h.held.find((t) => attemptOf(t) === 2)?.worker.terminated, true);
    assert.equal(h.held.find((t) => attemptOf(t) === 3)?.worker.terminated, true);
    assert.equal(h.held.find((t) => attemptOf(t) === 0)?.worker.terminated, false);
    assert.equal(result.state, 'pending', 'attempt 0 is lower and still running');
    h.answer(/** @type {Task} */ (h.held.find((t) => attemptOf(t) === 0)), { value: { ok: false, reason: 'not-in-band' } });
    await settle();
    assert.equal(result.value.status, 'complete');
    assert.equal(result.value.attempt, 1);
    assert.equal(result.value.pack.kind, 'piece-set');
    assert.deepEqual(result.value.pack.puzzles, []);
    assert.equal(result.value.pack.generation.setAttempt, 1);
    assert.equal(result.value.pack.generation.createdAt, CREATED_AT);
    assert.equal(h.tasks.length, 4, 'nothing is dispatched after a success');
  });

  test('an earlier attempt that finishes later still wins', async () => {
    const h = harness({ size: 2 });
    const result = track(clientOf(h).generateSet(setInput()));
    await settle();
    h.answer(h.held[1], { value: setSuccess(1) });
    await settle();
    h.answer(h.held[0], { value: setSuccess(0) });
    await settle();
    assert.equal(result.value.attempt, 0);
  });

  test('exhausting the allowed attempts fails with the tally of engine reasons', async () => {
    const reasons = ['carve', 'not-in-band', 'carve'];
    const h = harness({ size: 2, handler: (t) => ({ value: { ok: false, reason: reasons[attemptOf(t)] } }) });
    const result = await clientOf(h, { maxSetAttempts: 3 }).generateSet(setInput());
    assert.equal(result.status, 'failed');
    assert.equal(result.reason, 'attempts-exhausted');
    assert.deepEqual(result.failures, { carve: 2, 'not-in-band': 1 });
    assert.equal(result.pack, undefined);
  });

  test('the shared deadline ends a set request as time-limit, cancel as cancelled', async () => {
    const h = harness();
    const client = clientOf(h);
    const late = track(client.generateSet(setInput()));
    await settle();
    h.clock.advance(115000);
    await settle();
    assert.deepEqual([late.value.status, late.value.reason], ['failed', 'time-limit']);
    const cancelled = track(client.generateSet(setInput()));
    await settle();
    client.cancel();
    await settle();
    assert.equal(cancelled.value.status, 'cancelled');
  });

  test('transport and resource faults reject a typed error instead of a difficulty reason', async () => {
    const h = harness({ handler: () => ({ error: 'model-too-large' }) });
    const error = await clientOf(h).generateSet(setInput()).then(() => null, (e) => e);
    assert.ok(error instanceof GenerationError);
    assert.equal(error.code, 'model-too-large');
    assert.deepEqual(error.accepted, []);
  });

  test('invalid requests are rejected before any worker starts and never altered', async () => {
    const h = harness();
    const client = clientOf(h);
    const code = (/** @type {object} */ over) => client.generateSet(setInput(over)).then(() => 'ok', (e) => `${e.code}:${e.issues?.[0]?.code ?? ''}`);
    assert.equal(await code({ boardRows: ['####', '####', '####', '####'] }), 'invalid-board:board-too-few-cells');
    assert.equal(await code({ boardRows: [`${'#'.repeat(33)}`, '#'.repeat(33)] }), 'invalid-board:board-side-too-large');
    assert.equal(await code({ boardRows: ['#####...#####', '#####...#####', '#####...#####', '#####...#####', '#####...#####'] }), 'invalid-board:board-disconnected');
    assert.equal(await code({ maxActive: 50 }), 'invalid-board:board-too-many-cells');
    assert.equal(await code({ maxActive: 29 }), 'invalid-input:');
    assert.equal(await code({ levelId: 'hell-2' }), 'level-unavailable:');
    assert.equal(await code({ levelId: 'bogus' }), 'invalid-input:');
    assert.equal(await code({ rotation: 30 }), 'invalid-input:');
    assert.equal(await code({ seedText: ' padded ' }), 'invalid-input:');
    assert.equal(await code({ uniqueness: 'maybe' }), 'invalid-input:');
    assert.equal(h.workers.length, 0);
  });
});

describe('batch requests', () => {
  test('ten attempt-0 candidates are dispatched in three pool-width rounds and accepted in order', async () => {
    const h = harness();
    /** @type {string[]} */
    const streamed = [];
    const result = track(clientOf(h).generateBatch(batchInput(), { onAccepted: (e) => streamed.push(`${e.index}:${e.puzzle.title}`) }));
    /** @type {string[][]} */
    const rounds = [];
    for (;;) {
      await settle();
      const round = h.held.splice(0);
      if (round.length === 0) {
        break;
      }
      rounds.push(round.map((t) => `${t.payload.slot}/${t.payload.attempt}`));
      for (const t of round.reverse()) {
        h.answer(t, scripted(t));
      }
    }
    assert.equal(rounds.length >= 3, true);
    assert.deepEqual(rounds[0], ['1/0', '2/0', '3/0', '4/0']);
    assert.deepEqual(rounds[1], ['5/0', '6/0', '7/0', '8/0']);
    assert.deepEqual(rounds[2].slice(0, 2), ['9/0', '10/0']);
    assert.ok(rounds.every((r) => r.length <= 4), 'at most the pool width runs at once');
    assert.ok(rounds.slice(2).flat().slice(2).every((id) => !id.endsWith('/0')), 'the rest of round 3 is speculative retries');
    assert.equal(result.value.status, 'complete');
    assert.deepEqual(result.value.accepted.map((p) => p.title), Array.from({ length: 10 }, (_, i) => `Hard #${i + 1}`));
    assert.deepEqual(streamed, result.value.accepted.map((p, i) => `${i}:${p.title}`));
    assert.deepEqual(result.value.accepted.map((p) => p.solution), fixture().chosen.map((c) => c.layout));
    assert.equal(result.value.seenLayouts.length, 10);
    assert.equal(result.value.pack.kind, 'puzzle-pack');
    assert.equal(result.value.pack.puzzles.length, 10);
    assert.ok(validatePack(result.value.pack).ok);
    assert.equal(h.tasks.filter((t) => t.payload.attempt === 0).length, 10);
  });

  test('a matching calibration is puzzle #1 and a one-puzzle request needs no worker', async () => {
    const h = harness();
    const { calibration } = fixture();
    const result = await clientOf(h).generateBatch(batchInput({ quantity: 1, calibration }));
    assert.equal(result.status, 'complete');
    assert.equal(result.accepted[0].id, calibration.id);
    assert.equal(h.workers.length, 0);
    const stored = { ...calibration, solution: null };
    const ignored = await clientOf(harness({ handler: (t) => scripted(t) })).generateBatch(batchInput({ quantity: 1, calibration: stored }));
    assert.notEqual(ignored.accepted[0].id, calibration.id, 'a stored claim without a solution is never reused');
  });

  test('Add more continues the numbering and keeps the history', async () => {
    const h = harness({ handler: (t) => scripted(t, 3) });
    const first = fixture().chosen.slice(0, 3);
    const result = await clientOf(h).generateBatch(batchInput({
      quantity: 3,
      batchIndex: 2,
      displayOffset: 5,
      seenLayouts: first.map((c) => c.layoutKey),
      seenClues: first.map((c) => c.clueKey),
    }));
    assert.deepEqual(result.accepted.map((p) => p.title), ['Hard #6', 'Hard #7', 'Hard #8']);
    assert.equal(result.seenLayouts.length, 6);
    assert.equal(result.pack?.generation.batchSeed, 'fixture-set-0#2');
    assert.equal(result.pack?.generation.batchIndex, 2);
    assert.equal(result.pack?.generation.batchLevel, 'hard');
    for (const t of h.tasks) {
      assert.equal(t.payload.seenLayouts.length, 3, 'every candidate sees the frozen request-start history');
      assert.equal(t.payload.batchSeed, 'fixture-set-0#2');
    }
  });

  test('a duplicate clue key counts as a failed candidate and never enters the pack', async () => {
    const { chosen } = fixture();
    const h = harness({
      handler: (t) => {
        if (t.payload.slot === 2) {
          return t.payload.attempt === 0
            ? { value: { ...chosen[1], clueKey: chosen[0].clueKey } }
            : { value: t.payload.attempt === 1 ? chosen[1] : { fail: 'layout' } };
        }
        return scripted(t);
      },
    });
    const result = await clientOf(h).generateBatch(batchInput({ quantity: 3 }));
    assert.equal(result.status, 'complete');
    assert.deepEqual(result.accepted.map((p) => p.solution), chosen.slice(0, 3).map((c) => c.layout));
    assert.equal(new Set(result.accepted.map((p) => p.id)).size, 3);
    assert.ok(h.tasks.some((t) => t.payload.slot === 2 && t.payload.attempt === 1));
  });

  test('a slot that never fills ends partial with the most frequent engine reason', async () => {
    const h = harness({ handler: (t) => (t.payload.slot === 1 ? scripted(t) : { value: { fail: 'not-in-band' } }) });
    const result = await clientOf(h).generateBatch(batchInput({ quantity: 2 }));
    assert.equal(result.status, 'partial');
    assert.equal(result.reason, 'difficulty-not-found');
    assert.equal(result.accepted.length, 1);
    assert.equal(result.pack?.puzzles.length, 1);
    assert.equal(h.tasks.filter((t) => t.payload.slot === 2).length, 12);
  });

  test('cancel keeps the accepted prefix and its history', async () => {
    const h = harness({ handler: (t) => scripted(t) });
    const client = clientOf(h);
    const result = await client.generateBatch(batchInput(), {
      onAccepted: (e) => {
        if (e.accepted === 3) {
          client.cancel();
        }
      },
    });
    assert.equal(result.status, 'cancelled');
    assert.equal(result.accepted.length, 3);
    assert.equal(result.pack?.puzzles.length, 3);
    assert.equal(result.seenLayouts.length, 3);
    assert.equal(result.seenClues.length, 3);
    assert.ok(validatePack(result.pack).ok);
    client.cancel();
  });

  test('the deadline returns the prefix as a time-limit partial', async () => {
    const h = harness({ handler: (t) => (t.payload.slot <= 3 ? scripted(t) : undefined) });
    const result = track(clientOf(h).generateBatch(batchInput()));
    await settle();
    assert.equal(result.state, 'pending');
    h.clock.advance(115000);
    await settle();
    assert.deepEqual([result.value.status, result.value.reason, result.value.accepted.length], ['partial', 'time-limit', 3]);
    assert.equal(result.value.pack.puzzles.length, 3);
  });

  test('a resource fault rejects with the streamed prefix instead of a partial', async () => {
    const h = harness({ handler: (t) => (t.payload.slot === 3 ? { error: 'model-too-large' } : scripted(t)) });
    const error = await clientOf(h).generateBatch(batchInput()).then(() => null, (e) => e);
    assert.ok(error instanceof GenerationError);
    assert.equal(error.code, 'model-too-large');
    assert.equal(error.accepted.length, 2);
    assert.equal(error.seenLayouts.length, 2);
    assert.equal(error.seenClues.length, 2);
  });

  test('a full history fails preflight without eviction or dispatch', async () => {
    const h = harness({ handler: (t) => scripted(t) });
    const client = clientOf(h);
    const keys = Array.from({ length: 995 }, (_, i) => `k${i}`);
    const error = await client.generateBatch(batchInput({ quantity: 6, seenLayouts: keys })).then(() => null, (e) => e);
    assert.equal(error.code, 'history-full');
    assert.deepEqual(error.seenLayouts, keys);
    assert.equal(h.workers.length, 0);
    const idle = harness();
    const fits = track(clientOf(idle).generateBatch(batchInput({ quantity: 5, seenLayouts: keys })));
    await settle();
    assert.equal(idle.tasks.length, 4);
    idle.pool.cancelAll();
    await settle();
    assert.equal(fits.value.status, 'cancelled');
    const invalid = (/** @type {object} */ over) => client.generateBatch(batchInput(over)).then(() => 'ok', (e) => e.code);
    assert.equal(await invalid({ quantity: 11 }), 'invalid-input');
    assert.equal(await invalid({ batchIndex: 0 }), 'invalid-input');
    assert.equal(await invalid({ setSeed: 'a\u0000'.repeat(40) }), 'invalid-input');
    assert.equal(await invalid({ targetLevelId: 'nope' }), 'invalid-input');
  });

  test('a newer request supersedes the old one and its late replies are ignored', async () => {
    const h = harness({ size: 2 });
    const client = clientOf(h);
    /** @type {string[]} */
    const events = [];
    const first = track(client.generateBatch(batchInput({ revision: 'ra' }), { onAccepted: (e) => events.push(e.revision) }));
    await settle();
    const stale = [...h.held];
    assert.equal(stale.length, 2);
    const second = track(client.generateBatch(batchInput({ revision: 'rb', quantity: 1, calibration: fixture().calibration }), {
      onAccepted: (e) => events.push(e.revision),
    }));
    await settle();
    for (const t of stale) {
      h.answer(t, scripted(t));
    }
    await settle();
    assert.equal(first.value.status, 'cancelled');
    assert.equal(first.value.accepted.length, 0);
    assert.equal(second.value.status, 'complete');
    assert.deepEqual(events, ['rb']);
  });

  test('lazy certificates arrive only for the latest revision and reuse the request fingerprint', async () => {
    const certificate = { status: 'unique', model: 'dlx-v1', rowLimit: 10000, verified: true };
    const h = harness({ handler: (t) => (t.kind === 'certify' ? undefined : scripted(t)) });
    const client = clientOf(h);
    /** @type {any[]} */
    const events = [];
    const hooks = { onCertificate: (/** @type {any} */ e) => events.push(e) };
    const done = await client.generateBatch(batchInput({ quantity: 2, revision: 'r-first' }), hooks);
    await settle();
    const lazy = h.held.filter((t) => t.kind === 'certify');
    assert.equal(lazy.length, 2);
    assert.deepEqual(lazy.map((t) => t.payload.clues), done.accepted.map((p) => p.clues));
    h.answer(lazy[0], { value: certificate });
    await settle();
    assert.deepEqual(events.map((e) => [e.revision, e.puzzleId]), [['r-first', done.accepted[0].id]]);
    const newer = await client.generateBatch(batchInput({ quantity: 1, calibration: fixture().calibration }), hooks);
    assert.equal(newer.status, 'complete');
    h.answer(lazy[1], { value: certificate });
    await settle();
    assert.equal(events.length, 1, 'a certificate of an old revision is dropped');
  });
});

/**
 * A pool of real engine workers whose replies arrive in a scrambled order.
 * @param {number} size
 */
function realHarness(size) {
  const clock = createFakeClock();
  const pool = createPool({
    size,
    clock,
    workerFactory: () => {
      /** @type {FakeWorker} */
      const worker = new FakeWorker((_w, message) => {
        handler.handle(structuredClone(message));
      });
      const handler = createTaskHandler({
        post: (reply) => setTimeout(() => worker.send(reply), (reply.id * 7) % 5),
      });
      return worker;
    },
  });
  return { pool, clock };
}

/** @param {{ pool: ReturnType<typeof createPool>, clock: any }} h */
const realClient = (h) => createGenerationClient(h.pool, { clock: h.clock, createdAt: () => CREATED_AT });

/**
 * Runs the recipe's set and one batch.
 * @param {number} size
 * @param {{ rotation?: number, batchIndex?: number, history?: { seenLayouts: string[], seenClues: string[] }, quantity?: number }} [o]
 */
async function runRecipe(size, o = {}) {
  const h = realHarness(size);
  const client = realClient(h);
  try {
    const set = await client.generateSet(setInput({ rotation: o.rotation ?? 0 }));
    assert.equal(set.status, 'complete');
    const batchIndex = o.batchIndex ?? 1;
    const batch = await client.generateBatch(batchInput({
      set: set.set,
      rotation: o.rotation ?? 0,
      quantity: o.quantity ?? recipe.quantity,
      batchIndex,
      calibration: batchIndex === 1 ? set.calibration : undefined,
      seenLayouts: o.history?.seenLayouts ?? [],
      seenClues: o.history?.seenClues ?? [],
    }));
    return { set, batch };
  } finally {
    h.pool.close();
  }
}

/** Semantic view of a pack: everything except host-only presentation metadata. @param {any} pack */
const semantic = (pack) => {
  const { generation, presentation, ...rest } = JSON.parse(JSON.stringify(pack));
  delete generation.createdAt;
  return { ...rest, generation };
};

describe('real engine through the pool', () => {
  test('one and four workers reproduce the recorded recipe and an importable pack', async () => {
    const one = await runRecipe(1);
    const four = await runRecipe(4);
    for (const { set, batch } of [one, four]) {
      assert.equal(batch.status, 'complete');
      assert.deepEqual(set.set.pieces.map((p) => canonicalKey(p.cells)), recipe.expected.pieceKeys);
      assert.deepEqual(batch.seenLayouts, recipe.expected.layoutKeys);
      assert.deepEqual(batch.seenClues, recipe.expected.clueKeys);
      assert.deepEqual(batch.accepted.map((p) => p.rating?.score), recipe.expected.scores);
      assert.ok(validatePack(batch.pack).ok);
    }
    assert.equal(one.batch.accepted[0].id, one.set.calibration.id, 'the calibration is puzzle #1');
    assert.deepEqual(semantic(one.batch.pack), semantic(four.batch.pack));
    assert.deepEqual(semantic(one.set.pack), semantic(four.set.pack));
    assert.equal(one.batch.pack.generation.batchSeed, recipe.batchSeed);
  });

  test('rotation changes only the presentation', async () => {
    const base = await runRecipe(2);
    for (const rotation of [45, 90]) {
      const turned = await runRecipe(2, { rotation });
      assert.equal(turned.batch.pack.presentation.rotation, rotation);
      assert.deepEqual(turned.batch.seenLayouts, base.batch.seenLayouts);
      assert.deepEqual(turned.batch.seenClues, base.batch.seenClues);
      assert.deepEqual(turned.batch.accepted.map((p) => p.id), base.batch.accepted.map((p) => p.id));
      assert.deepEqual(semantic(turned.batch.pack), semantic(base.batch.pack));
    }
  });

  test('batch index 2 continues with the history, matches at both widths and a fresh set replays index 1', async () => {
    const first = await runRecipe(4, { quantity: 4 });
    const history = { seenLayouts: first.batch.seenLayouts, seenClues: first.batch.seenClues };
    const second = await runRecipe(1, { batchIndex: 2, history, quantity: 4 });
    const secondWide = await runRecipe(4, { batchIndex: 2, history, quantity: 4 });
    assert.equal(second.batch.pack.generation.batchSeed, `${recipe.seedText}#2`);
    assert.deepEqual(semantic(second.batch.pack), semantic(secondWide.batch.pack));
    const shared = second.batch.accepted.filter((p) => first.batch.accepted.some((q) => q.id === p.id));
    assert.deepEqual(shared, []);
    assert.equal(second.batch.seenLayouts.length, history.seenLayouts.length + second.batch.accepted.length);
    const replay = await runRecipe(2, { quantity: 4 });
    assert.deepEqual(semantic(replay.batch.pack), semantic(first.batch.pack));
  });
});
