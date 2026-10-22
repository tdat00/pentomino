// @ts-check
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { parseWorkerMessage } from '../core/engine/protocol.js';
import { TIME } from '../core/engine/policy.js';
import { createTaskHandler } from '../core/engine/tasks.js';
import {
  createPool,
  defaultPoolSize,
  isAbortError,
  MEMORY_UI_INTERVAL_MS,
  PoolError,
  WORKER_LIMIT_BYTES,
  WorkerTaskError,
} from '../core/browser/worker-pool.js';
import { RECIPE_BOARD_ROWS, recipeWitness } from './fixtures/clue-recipes.js';
import { CLASSIC_PENTOMINOES } from './fixtures/polyominoes.js';

const rows = [...RECIPE_BOARD_ROWS];
const pieces = CLASSIC_PENTOMINOES.map((p) => ({ id: p.id, label: p.label, color: p.color, cells: p.cells.map(([x, y]) => [x, y]) }));
const master = recipeWitness().filter((p) => 'YW'.includes(p.piece));
const ratePayload = () => ({ boardRows: rows, pieces, clues: master });

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
    pending: () => timers.length,
  };
}

class FakeWorker {
  constructor() {
    /** @type {any[]} */
    this.messages = [];
    this.terminated = false;
    /** @type {Record<string, ((e: any) => void)[]>} */
    this.listeners = {};
    this.failPost = false;
  }

  /** @param {any} message */
  postMessage(message) {
    if (this.failPost) {
      throw new Error('DataCloneError');
    }
    this.messages.push(message);
  }

  terminate() {
    this.terminated = true;
  }

  /** @param {string} type @param {(e: any) => void} fn */
  addEventListener(type, fn) {
    (this.listeners[type] ??= []).push(fn);
  }

  /** Delivers even after termination: the pool must ignore such late events. @param {string} type @param {any} event */
  emit(type, event) {
    for (const fn of this.listeners[type] ?? []) {
      fn(event);
    }
  }

  /** @param {any} data */
  send(data) {
    this.emit('message', { data });
  }

  /** @param {number} [at] */
  taskId(at = this.messages.length - 1) {
    return this.messages[at].id;
  }

  /** @param {unknown} value @param {number} [at] */
  result(value, at) {
    this.send({ type: 'result', id: this.taskId(at), value });
  }
}

/** @param {{ size?: number, clock?: ReturnType<typeof createFakeClock>, onMemory?: any }} [o] */
function setup(o = {}) {
  const clock = o.clock ?? createFakeClock();
  /** @type {FakeWorker[]} */
  const workers = [];
  const pool = createPool({
    size: o.size ?? 1,
    clock,
    onMemory: o.onMemory,
    workerFactory: () => {
      const w = new FakeWorker();
      workers.push(w);
      return w;
    },
  });
  return { pool, clock, workers };
}

/** @param {number} requestId @param {string} [revision] @param {Record<string, unknown>} [extra] */
const task = (requestId, revision = 'r1', extra = {}) => ({ requestId, revision, kind: /** @type {const} */ ('rate'), payload: ratePayload(), ...extra });

/**
 * Records the outcome at once so a rejection is never unhandled.
 * @param {Promise<unknown>} promise
 */
function track(promise) {
  /** @type {{ state: 'pending' | 'resolved' | 'rejected', value?: any, error?: any }} */
  const out = { state: 'pending' };
  promise.then((value) => Object.assign(out, { state: 'resolved', value }), (error) => Object.assign(out, { state: 'rejected', error }));
  return out;
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

/** @param {{ state: string, error?: any }} t @param {string} reason */
function assertAborted(t, reason) {
  assert.equal(t.state, 'rejected');
  assert.ok(isAbortError(t.error), String(t.error));
  assert.equal(t.error.name, 'AbortError');
  assert.equal(t.error.reason, reason);
}

describe('dispatch and settlement', () => {
  test('workers are created lazily; tasks go out as validated wire messages with unique ids', async () => {
    const { pool, workers } = setup({ size: 2 });
    assert.equal(workers.length, 0);
    pool.beginRequest({ requestId: 1, revision: 'r1' });
    const a = track(pool.run(task(1)));
    const b = track(pool.run(task(1)));
    assert.equal(workers.length, 2);
    for (const w of workers) {
      assert.equal(w.messages.length, 1);
      assert.equal(w.messages[0].type, 'task');
      assert.equal(w.messages[0].kind, 'rate');
      assert.ok(Number.isSafeInteger(w.messages[0].id));
    }
    assert.notEqual(workers[0].taskId(), workers[1].taskId());
    workers[1].result('B');
    workers[0].result('A');
    await flush();
    assert.deepEqual([a.value, b.value], ['A', 'B']);
    pool.close();
  });

  test('at most `size` tasks run; the rest queue in order and results may finish out of order', async () => {
    const { pool, workers } = setup({ size: 2 });
    pool.beginRequest({ requestId: 1, revision: 'r1' });
    const t = [0, 1, 2, 3].map(() => track(pool.run(task(1))));
    assert.deepEqual(workers.map((w) => w.messages.length), [1, 1]);
    workers[1].result('t1');
    await flush();
    assert.equal(workers[1].messages.length, 2);
    workers[0].result('t0');
    await flush();
    assert.equal(workers[0].messages.length, 2);
    workers[1].result('t3?', 1);
    workers[0].result('t2?', 1);
    await flush();
    assert.deepEqual(t.map((x) => x.state), ['resolved', 'resolved', 'resolved', 'resolved']);
    assert.equal(workers.length, 2);
    pool.close();
  });

  test('progress reaches the callback and a worker error reply rejects with its code while the worker survives', async () => {
    const { pool, workers } = setup();
    pool.beginRequest({ requestId: 1, revision: 'r1' });
    /** @type {any[]} */
    const progress = [];
    const t = track(pool.run(task(1), (p) => progress.push(p)));
    const w = workers[0];
    w.send({ type: 'progress', id: w.taskId(), stage: 'search', rowTrials: 50000, bytes: 4096 });
    w.send({ type: 'error', id: w.taskId(), code: 'invalid-pack', message: 'bad', issues: [{ code: 'x', path: '$', message: 'm' }] });
    await flush();
    assert.deepEqual(progress, [{ stage: 'search', rowTrials: 50000, bytes: 4096 }]);
    assert.equal(t.state, 'rejected');
    assert.ok(t.error instanceof WorkerTaskError);
    assert.equal(t.error.code, 'invalid-pack');
    assert.equal(t.error.issues.length, 1);
    assert.equal(w.terminated, false);
    const next = track(pool.run(task(1)));
    assert.equal(workers.length, 1);
    w.result('ok');
    await flush();
    assert.equal(next.value, 'ok');
    pool.close();
  });

  test('a throwing progress callback never affects the task', async () => {
    const { pool, workers } = setup();
    pool.beginRequest({ requestId: 1, revision: 'r1' });
    const t = track(pool.run(task(1), () => {
      throw new Error('ui bug');
    }));
    workers[0].send({ type: 'progress', id: workers[0].taskId(), stage: 's', rowTrials: 0, bytes: 1 });
    workers[0].result('fine');
    await flush();
    assert.equal(t.value, 'fine');
    pool.close();
  });

  test('malformed tasks are rejected without reaching a worker', async () => {
    const { pool, workers } = setup();
    pool.beginRequest({ requestId: 1, revision: 'r1' });
    const bad = [
      task(1, 'r1', { kind: 'solve' }),
      task(1, 'r1', { payload: { ...ratePayload(), onProgress: () => 1 } }),
      task(1, 'r1', { payload: null }),
      task(-1),
      task(1.5),
      { ...task(1), revision: 5 },
    ];
    const outcomes = bad.map((b) => track(pool.run(/** @type {any} */ (b))));
    await flush();
    for (const o of outcomes) {
      assert.equal(o.state, 'rejected');
      assert.ok(o.error instanceof PoolError || isAbortError(o.error));
    }
    assert.ok(outcomes.slice(0, 3).every((o) => o.error.code === 'invalid-task' && o.error.issues.length > 0));
    assert.equal(workers.length, 0);
    pool.close();
  });
});

describe('late and foreign messages', () => {
  test('replies from a terminated worker, or with another task id, cannot settle a new task', async () => {
    const { pool, workers } = setup();
    pool.beginRequest({ requestId: 1, revision: 'r1' });
    const first = track(pool.run(task(1)));
    const old = workers[0];
    const oldId = old.taskId();
    pool.cancelAll();
    await flush();
    assertAborted(first, 'cancelled');
    assert.equal(old.terminated, true);

    pool.beginRequest({ requestId: 2, revision: 'r2' });
    const second = track(pool.run(task(2, 'r2')));
    const fresh = workers[1];
    assert.notEqual(fresh, old);
    old.send({ type: 'result', id: oldId, value: 'late' });
    old.send({ type: 'result', id: fresh.taskId(), value: 'spoof from terminated worker' });
    fresh.send({ type: 'result', id: oldId, value: 'wrong id' });
    fresh.send({ type: 'result', id: fresh.taskId() + 99, value: 'unknown id' });
    await flush();
    assert.equal(second.state, 'pending');
    fresh.result('real');
    await flush();
    assert.equal(second.value, 'real');
    fresh.result('duplicate');
    await flush();
    assert.equal(second.value, 'real');
    pool.close();
  });

  test('stale or foreign requests are rejected immediately with an AbortError', async () => {
    const { pool, workers } = setup();
    const before = track(pool.run(task(1)));
    await flush();
    assertAborted(before, 'stale');
    pool.beginRequest({ requestId: 4, revision: 'rev-a' });
    const wrongRevision = track(pool.run(task(4, 'rev-b')));
    const wrongId = track(pool.run(task(3, 'rev-a')));
    const idle = track(pool.runIdle(task(3, 'rev-a')));
    await flush();
    for (const t of [wrongRevision, wrongId, idle]) {
      assertAborted(t, 'stale');
    }
    assert.equal(workers.length, 0);
    pool.close();
  });

  test('a malformed worker message kills that worker and settles its task', async () => {
    const { pool, workers } = setup();
    pool.beginRequest({ requestId: 1, revision: 'r1' });
    const t = track(pool.run(task(1)));
    workers[0].send({ type: 'result' });
    await flush();
    assert.equal(t.error.code, 'worker-protocol');
    assert.equal(workers[0].terminated, true);
    const again = track(pool.run(task(1)));
    assert.equal(workers.length, 2);
    workers[1].emit('messageerror', {});
    await flush();
    assert.equal(again.error.code, 'worker-protocol');
    pool.close();
  });
});

describe('crashes and unavailable workers', () => {
  test('a crashed worker rejects its task, is replaced lazily and its late reply is ignored', async () => {
    const { pool, workers } = setup();
    pool.beginRequest({ requestId: 1, revision: 'r1' });
    const t = track(pool.run(task(1)));
    const crashed = workers[0];
    const id = crashed.taskId();
    crashed.emit('error', { message: 'boom' });
    await flush();
    assert.equal(t.state, 'rejected');
    assert.ok(t.error instanceof PoolError);
    assert.equal(t.error.code, 'worker-crashed');
    assert.equal(crashed.terminated, true);
    assert.equal(workers.length, 1);

    const next = track(pool.run(task(1)));
    assert.equal(workers.length, 2);
    crashed.send({ type: 'result', id, value: 'ghost' });
    crashed.send({ type: 'result', id: workers[1].taskId(), value: 'ghost 2' });
    await flush();
    assert.equal(next.state, 'pending');
    workers[1].result('ok');
    await flush();
    assert.equal(next.value, 'ok');
    pool.close();
  });

  test('queued tasks survive a crash and run on the replacement worker', async () => {
    const { pool, workers } = setup();
    pool.beginRequest({ requestId: 1, revision: 'r1' });
    const a = track(pool.run(task(1)));
    const b = track(pool.run(task(1)));
    workers[0].emit('error', { message: 'exit 1' });
    await flush();
    assert.equal(a.state, 'rejected');
    assert.equal(workers.length, 2);
    assert.equal(workers[1].messages.length, 1);
    workers[1].result('b');
    await flush();
    assert.equal(b.value, 'b');
    pool.close();
  });

  test('factory and postMessage failures settle the task with typed errors', async () => {
    let mode = 'throw';
    /** @type {FakeWorker[]} */
    const made = [];
    const pool = createPool({
      size: 1,
      clock: createFakeClock(),
      workerFactory: () => {
        if (mode === 'throw') {
          throw new Error('no workers');
        }
        const w = new FakeWorker();
        w.failPost = mode === 'post';
        made.push(w);
        return w;
      },
    });
    pool.beginRequest({ requestId: 1, revision: 'r1' });
    const a = track(pool.run(task(1)));
    await flush();
    assert.equal(a.error.code, 'worker-unavailable');
    mode = 'post';
    const b = track(pool.run(task(1)));
    await flush();
    assert.equal(b.error.code, 'worker-failed');
    assert.equal(made[0].terminated, true);
    mode = 'ok';
    const c = track(pool.run(task(1)));
    made[1].result('fine');
    await flush();
    assert.equal(c.value, 'fine');
    pool.close();
  });

  test('the default factory reports missing module-worker support', async () => {
    if (typeof /** @type {any} */ (globalThis).Worker === 'function') {
      return;
    }
    const pool = createPool({ size: 1, clock: createFakeClock() });
    pool.beginRequest({ requestId: 1, revision: 'r1' });
    const t = track(pool.run(task(1)));
    await flush();
    assert.equal(t.error.code, 'worker-unavailable');
    pool.close();
  });
});

describe('action watchdog', () => {
  test('one deadline covers every task of an action; busy workers are terminated at 115 s with early notification', async () => {
    const { pool, clock, workers } = setup({ size: 2 });
    /** @type {any[]} */
    const timeouts = [];
    pool.beginRequest({ requestId: 1, revision: 'r1', onTimeout: (info) => timeouts.push({ ...info, at: clock.now() }) });
    const t0 = clock.now();
    const first = track(pool.run(task(1)));
    clock.advance(60000);
    const second = track(pool.run(task(1)));
    const queued = track(pool.run(task(1)));
    const third = track(pool.run(task(1)));
    clock.advance(TIME.dispatchStopMs - 60000 - 1);
    await flush();
    assert.deepEqual([first.state, second.state, queued.state, third.state], ['pending', 'pending', 'pending', 'pending']);
    assert.equal(timeouts.length, 0);
    assert.equal(workers.some((w) => w.terminated), false);

    clock.advance(1);
    await flush();
    for (const t of [first, second, queued, third]) {
      assertAborted(t, 'deadline');
    }
    assert.ok(workers.every((w) => w.terminated));
    assert.equal(timeouts.length, 1);
    assert.equal(timeouts[0].at - t0, TIME.dispatchStopMs);
    assert.equal(timeouts[0].elapsedMs, TIME.dispatchStopMs);
    assert.ok(timeouts[0].at - t0 <= TIME.responseMs - 5000 + 0);
    assert.deepEqual([timeouts[0].requestId, timeouts[0].revision], [1, 'r1']);

    const afterwards = track(pool.run(task(1)));
    await flush();
    assertAborted(afterwards, 'deadline');
    assert.equal(workers.length, 2);
    clock.advance(10 * TIME.responseMs);
    assert.equal(timeouts.length, 1);
    pool.close();
  });

  test('a delayed timer cannot extend the budget: dispatching re-checks the shared clock', async () => {
    const clock = createFakeClock();
    const lazy = { ...clock, setTimeout: () => 0 };
    const { pool, workers } = setup({ clock: lazy });
    let notified = 0;
    pool.beginRequest({ requestId: 1, revision: 'r1', onTimeout: () => { notified += 1; } });
    const running = track(pool.run(task(1)));
    clock.advance(TIME.dispatchStopMs + 5);
    const late = track(pool.run(task(1)));
    await flush();
    assertAborted(running, 'deadline');
    assertAborted(late, 'deadline');
    assert.equal(notified, 1);
    assert.equal(workers[0].terminated, true);
    pool.close();
  });

  test('a new request restarts the clock for itself only and removes the old timer', async () => {
    const { pool, clock } = setup();
    let first = 0;
    let second = 0;
    pool.beginRequest({ requestId: 1, revision: 'r1', onTimeout: () => { first += 1; } });
    clock.advance(100000);
    pool.beginRequest({ requestId: 2, revision: 'r2', onTimeout: () => { second += 1; } });
    clock.advance(TIME.dispatchStopMs - 1);
    assert.deepEqual([first, second], [0, 0]);
    clock.advance(1);
    assert.deepEqual([first, second], [0, 1]);
    pool.close();
  });

  test('requests must increase and arguments are validated', () => {
    const { pool } = setup();
    pool.beginRequest({ requestId: 3, revision: 'r' });
    assert.throws(() => pool.beginRequest({ requestId: 3, revision: 'r' }), RangeError);
    assert.throws(() => pool.beginRequest({ requestId: 2, revision: 'r' }), RangeError);
    assert.throws(() => pool.beginRequest({ requestId: 1.5, revision: 'r' }), TypeError);
    assert.throws(() => pool.beginRequest({ requestId: 9, revision: '' }), TypeError);
    assert.throws(() => createPool({ size: 0 }), RangeError);
    assert.throws(() => createPool({ size: 5 }), RangeError);
    assert.ok(defaultPoolSize() >= 1 && defaultPoolSize() <= 4);
    pool.close();
  });
});

describe('cancellation, supersession and ending', () => {
  test('cancelAll terminates exactly the busy workers, settles every promise and stops the deadline', async () => {
    const { pool, clock, workers } = setup({ size: 2 });
    let notified = 0;
    pool.beginRequest({ requestId: 1, revision: 'r1', onTimeout: () => { notified += 1; } });
    const done = track(pool.run(task(1)));
    workers[0].result('kept');
    await flush();
    const running = track(pool.run(task(1)));
    const queued = [track(pool.run(task(1))), track(pool.run(task(1)))];
    const idle = track(pool.runIdle(task(1)));
    assert.equal(workers.length, 2);
    const idleWorker = workers[0];
    pool.cancelAll();
    await flush();
    assert.equal(done.value, 'kept');
    for (const t of [running, ...queued, idle]) {
      assertAborted(t, 'cancelled');
    }
    assert.ok(workers.every((w) => w.terminated));
    assert.ok(idleWorker.terminated);
    clock.advance(TIME.responseMs * 2);
    assert.equal(notified, 0);
    const after = track(pool.run(task(1)));
    await flush();
    assertAborted(after, 'ended');
    pool.close();
  });

  test('cancelling leaves an idle cached worker alone', async () => {
    const { pool, workers } = setup({ size: 2 });
    pool.beginRequest({ requestId: 1, revision: 'r1' });
    const a = track(pool.run(task(1)));
    const b = track(pool.run(task(1)));
    workers[0].result('a');
    await flush();
    pool.cancelAll();
    await flush();
    assertAborted(b, 'cancelled');
    assert.equal(a.value, 'a');
    assert.equal(workers[0].terminated, false);
    assert.equal(workers[1].terminated, true);
    pool.close();
  });

  test('a new request supersedes pending and idle work and ignores their late replies', async () => {
    const { pool, workers } = setup();
    pool.beginRequest({ requestId: 1, revision: 'r1' });
    const running = track(pool.run(task(1)));
    const queued = track(pool.run(task(1)));
    const idle = track(pool.runIdle(task(1)));
    const oldWorker = workers[0];
    pool.beginRequest({ requestId: 2, revision: 'r2' });
    await flush();
    for (const t of [running, queued, idle]) {
      assertAborted(t, 'superseded');
    }
    assert.equal(oldWorker.terminated, true);
    const next = track(pool.run(task(2, 'r2')));
    oldWorker.result('stale value', 0);
    await flush();
    assert.equal(next.state, 'pending');
    workers[1].result('new');
    await flush();
    assert.equal(next.value, 'new');
    pool.close();
  });

  test('a per-task abort signal terminates only that task\'s worker', async () => {
    const { pool, workers } = setup({ size: 2 });
    pool.beginRequest({ requestId: 1, revision: 'r1' });
    const controller = new AbortController();
    const a = track(pool.run(task(1, 'r1', { signal: controller.signal })));
    const b = track(pool.run(task(1)));
    const preAborted = new AbortController();
    preAborted.abort();
    const c = track(pool.run(task(1, 'r1', { signal: preAborted.signal })));
    controller.abort();
    await flush();
    assertAborted(a, 'cancelled');
    assertAborted(c, 'cancelled');
    assert.equal(workers[0].terminated, true);
    assert.equal(workers[1].terminated, false);
    workers[1].result('b');
    await flush();
    assert.equal(b.value, 'b');
    assert.equal(workers[0].messages.length, 1);
    pool.close();
  });

  test('endRequest stops the deadline, drops leftover speculative tasks and keeps results already delivered', async () => {
    const { pool, clock, workers } = setup({ size: 2 });
    let notified = 0;
    pool.beginRequest({ requestId: 1, revision: 'r1', onTimeout: () => { notified += 1; } });
    const finished = track(pool.run(task(1)));
    const speculative = track(pool.run(task(1)));
    workers[0].result('accepted');
    await flush();
    pool.endRequest(99);
    pool.endRequest(1);
    pool.endRequest(1);
    await flush();
    assert.equal(finished.value, 'accepted');
    assertAborted(speculative, 'ended');
    assert.equal(workers[1].terminated, true);
    assert.equal(clock.pending(), 0);
    clock.advance(TIME.responseMs * 3);
    assert.equal(notified, 0);
    const late = track(pool.run(task(1)));
    await flush();
    assertAborted(late, 'ended');
    pool.close();
  });

  test('recycle drops cached workers (and their workspaces) before the next job and aborts busy ones', async () => {
    const { pool, workers } = setup({ size: 2 });
    pool.beginRequest({ requestId: 1, revision: 'r1' });
    const a = track(pool.run(task(1)));
    const busy = track(pool.run(task(1)));
    workers[0].result('a');
    await flush();
    assert.equal(a.value, 'a');
    pool.recycle();
    await flush();
    assertAborted(busy, 'recycled');
    assert.ok(workers.every((w) => w.terminated));
    assert.equal(pool.memory().workerBytes, 0);
    const next = track(pool.run(task(1)));
    assert.equal(workers.length, 3);
    assert.equal(workers[2].terminated, false);
    workers[2].result('fresh');
    await flush();
    assert.equal(next.value, 'fresh');
    pool.close();
  });

  test('close settles everything and refuses new work', async () => {
    const { pool, workers } = setup({ size: 2 });
    pool.beginRequest({ requestId: 1, revision: 'r1' });
    const all = [track(pool.run(task(1))), track(pool.run(task(1))), track(pool.run(task(1))), track(pool.runIdle(task(1)))];
    pool.close();
    await flush();
    for (const t of all) {
      assertAborted(t, 'closed');
    }
    assert.ok(workers.every((w) => w.terminated));
    const after = track(pool.run(task(1)));
    await flush();
    assertAborted(after, 'closed');
    assert.throws(() => pool.beginRequest({ requestId: 2, revision: 'r' }));
  });
});

describe('idle certificates', () => {
  test('idle work has the lowest priority and is preempted by user-visible tasks', async () => {
    const { pool, workers } = setup();
    pool.beginRequest({ requestId: 1, revision: 'r1' });
    const idleA = track(pool.runIdle(task(1)));
    const idleB = track(pool.runIdle(task(1)));
    const normal = track(pool.run(task(1)));
    assert.equal(workers.length, 2);
    assert.equal(workers[0].terminated, true);
    await flush();
    assertAborted(idleA, 'preempted');
    assert.equal(workers[1].messages.length, 1);
    workers[1].result('normal');
    await flush();
    assert.equal(normal.value, 'normal');
    assert.equal(workers.length, 2);
    assert.equal(idleB.state, 'pending');
    assert.equal(workers[1].messages.length, 2);
    workers[1].result('idle b');
    await flush();
    assert.equal(idleB.value, 'idle b');
    pool.close();
  });

  test('idle results arrive after the action ended without starting a deadline', async () => {
    const { pool, clock, workers } = setup();
    let notified = 0;
    pool.beginRequest({ requestId: 1, revision: 'r1', onTimeout: () => { notified += 1; } });
    pool.endRequest(1);
    const idle = track(pool.runIdle(task(1)));
    assert.equal(clock.pending(), 0);
    clock.advance(TIME.responseMs * 5);
    await flush();
    assert.equal(idle.state, 'pending');
    assert.equal(workers[0].terminated, false);
    assert.equal(notified, 0);
    workers[0].result({ status: 'unique' });
    await flush();
    assert.deepEqual(idle.value, { status: 'unique' });
    pool.close();
  });

  test('a new action (Play, Generate or Cancel) cancels idle checks; their late results are dropped', async () => {
    const { pool, workers } = setup({ size: 2 });
    pool.beginRequest({ requestId: 1, revision: 'r1' });
    pool.endRequest(1);
    const idle = track(pool.runIdle(task(1)));
    const worker = workers[0];
    pool.beginRequest({ requestId: 2, revision: 'r2' });
    await flush();
    assertAborted(idle, 'superseded');
    worker.result({ status: 'unique' });
    await flush();
    assertAborted(idle, 'superseded');
    const late = track(pool.runIdle(task(1)));
    await flush();
    assertAborted(late, 'stale');
    pool.close();
  });

  test('an unfinished action takes its idle checks down with the deadline', async () => {
    const { pool, clock } = setup();
    pool.beginRequest({ requestId: 1, revision: 'r1' });
    const idle = track(pool.runIdle(task(1)));
    clock.advance(TIME.dispatchStopMs);
    await flush();
    assertAborted(idle, 'deadline');
    pool.close();
  });
});

describe('memory accounting', () => {
  test('worker high-water bytes are summed with main-thread buffers immediately; display callbacks are throttled', async () => {
    const clock = createFakeClock();
    /** @type {any[]} */
    const shown = [];
    const { pool, workers } = setup({ size: 2, clock, onMemory: (/** @type {any} */ s) => shown.push(s) });
    pool.beginRequest({ requestId: 1, revision: 'r1' });
    track(pool.run(task(1)));
    track(pool.run(task(1)));
    pool.setMainBytes(1000);
    const send = (/** @type {number} */ w, /** @type {number} */ bytes) => workers[w].send({ type: 'progress', id: workers[w].taskId(), stage: 'memory', rowTrials: 0, bytes });
    send(0, 100);
    send(1, 200);
    send(0, 300);
    assert.deepEqual([pool.memory().workerBytes, pool.memory().totalBytes], [500, 1500]);
    assert.equal(pool.memory().mainBudgetBytes, 300 * 1048576);
    assert.equal(shown.length, 1);
    clock.advance(MEMORY_UI_INTERVAL_MS - 1);
    assert.equal(shown.length, 1);
    clock.advance(1);
    assert.equal(shown.length, 2);
    assert.equal(shown[1].totalBytes, 1500);
    for (let i = 0; i < 40; i += 1) {
      send(0, 300 + i);
      clock.advance(10);
    }
    assert.ok(shown.length <= 2 + Math.ceil(400 / MEMORY_UI_INTERVAL_MS) + 1);
    pool.recycle();
    assert.equal(pool.memory().workerBytes, 0);
    assert.equal(pool.memory().peakBytes >= 1500, true);
    pool.close();
  });

  test('a worker reporting more than its declared workspaces is terminated', async () => {
    const { pool, workers } = setup();
    pool.beginRequest({ requestId: 1, revision: 'r1' });
    const t = track(pool.run(task(1)));
    workers[0].send({ type: 'progress', id: workers[0].taskId(), stage: 'memory', rowTrials: 0, bytes: WORKER_LIMIT_BYTES + 1 });
    await flush();
    assert.equal(t.error.code, 'memory-limit');
    assert.equal(workers[0].terminated, true);
    assert.equal(pool.memory().workerBytes, 0);
    pool.close();
  });
});

describe('every promise settles', () => {
  test('a storm of cancellations, crashes, deadlines and recycles leaves no pending promise', async () => {
    const { pool, clock, workers } = setup({ size: 3 });
    /** @type {ReturnType<typeof track>[]} */
    const all = [];
    const spawnTasks = (/** @type {number} */ id, /** @type {string} */ rev) => {
      for (let i = 0; i < 7; i += 1) {
        all.push(track(pool.run(task(id, rev))));
      }
      all.push(track(pool.runIdle(task(id, rev))));
    };
    pool.beginRequest({ requestId: 1, revision: 'a' });
    spawnTasks(1, 'a');
    workers[0].emit('error', { message: 'x' });
    workers[1].result('ok');
    pool.recycle();
    pool.beginRequest({ requestId: 2, revision: 'b' });
    spawnTasks(2, 'b');
    pool.cancelAll();
    pool.beginRequest({ requestId: 3, revision: 'c' });
    spawnTasks(3, 'c');
    clock.advance(TIME.dispatchStopMs);
    pool.beginRequest({ requestId: 4, revision: 'd' });
    spawnTasks(4, 'd');
    pool.close();
    await flush();
    assert.equal(all.filter((t) => t.state === 'pending').length, 0);
    assert.ok(all.length > 20);
  });
});

describe('pool with the real task handler', () => {
  test('runs a real task through the wire protocol and feeds memory accounting', async () => {
    const clock = createFakeClock();
    /** @type {any[]} */
    const replies = [];
    const pool = createPool({
      size: 1,
      clock,
      workerFactory: () => {
        const worker = new FakeWorker();
        const handler = createTaskHandler({
          post: (reply) => {
            replies.push(reply);
            queueMicrotask(() => worker.send(reply));
          },
        });
        worker.postMessage = (message) => handler.handle(structuredClone(message));
        return worker;
      },
    });
    pool.beginRequest({ requestId: 1, revision: 'r1' });
    /** @type {any[]} */
    const seen = [];
    const rating = /** @type {any} */ (await pool.run(task(1), (p) => seen.push(p)));
    assert.equal(rating.model, 'difficulty-v2');
    assert.ok(replies.every((r) => parseWorkerMessage(r).ok));
    assert.ok(seen.some((p) => p.stage === 'memory' && p.bytes > 0));
    assert.ok(pool.memory().workerBytes > 0);
    const clues = recipeWitness().filter((p) => p.piece === 'X');
    await assert.rejects(
      pool.run({ requestId: 1, revision: 'r1', kind: 'certify', payload: { boardRows: rows, pieces, clues: [{ ...clues[0], piece: 'Q' }], rowLimit: 5 } }),
      (e) => e instanceof WorkerTaskError && e.code === 'invalid-clue',
    );
    pool.close();
  });
});
