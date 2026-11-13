// @ts-check
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { createAuxiliaryQueue } from '../core/browser/auxiliary.js';
import { createPool, PoolAbortError, PoolError, WorkerTaskError } from '../core/browser/worker-pool.js';

const pieces = [
  { id: 'A', label: 'A', color: '#e6194b', cells: [[0, 0], [0, 1], [1, 1]] },
  { id: 'B', label: 'B', color: '#3cb44b', cells: [[0, 0], [1, 0], [2, 0]] },
];
const ratePayload = { boardRows: ['###', '###'], pieces, clues: [] };
const solvePayload = { ...ratePayload, rowLimit: 100 };
const certifyPayload = { ...ratePayload, rowLimit: 100 };

const settle = async () => {
  for (let i = 0; i < 4; i += 1) {
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
  /** @type {Task[]} */
  const tasks = [];
  /** @type {Task[]} */
  const held = [];
  const pool = createPool({
    size: o.size ?? 2,
    clock,
    workerFactory: () => new FakeWorker((w, message) => {
      const task = { worker: w, id: message.id, kind: message.kind, payload: message.payload };
      tasks.push(task);
      const outcome = o.handler?.(task);
      if (outcome === undefined) {
        held.push(task);
      } else {
        queueMicrotask(() => answer(task, outcome));
      }
    }),
  });
  /** @param {Task} task @param {Outcome} outcome */
  const answer = (task, outcome) => {
    if ('error' in outcome) {
      task.worker.send({ type: 'error', id: task.id, code: outcome.error, message: 'scripted failure' });
    } else {
      task.worker.send({ type: 'result', id: task.id, value: outcome.value });
    }
  };
  /** @param {string} kind */
  const heldOf = (kind) => held.filter((t) => t.kind === kind);
  return { pool, clock, tasks, held, heldOf, answer };
}

/** @param {Promise<unknown>} promise */
function track(promise) {
  /** @type {{ state: string, value?: any, error?: any }} */
  const out = { state: 'pending' };
  promise.then((value) => Object.assign(out, { state: 'resolved', value }), (error) => Object.assign(out, { state: 'rejected', error }));
  return out;
}

/** @param {{ state: string, error?: any }} out @param {string} reason */
function assertAborted(out, reason) {
  assert.equal(out.state, 'rejected');
  assert.ok(out.error instanceof PoolAbortError, String(out.error));
  assert.equal(out.error.reason, reason);
}

/**
 * The queue on a scripted pool, with the owner's side: one allocator that main requests and bootstraps share, and a
 * log of the calls the queue makes on the pool.
 * @param {ReturnType<typeof harness>} h
 * @param {{ getPool?: () => any }} [o]
 */
function rig(h, o = {}) {
  let last = 0;
  /** @type {number[]} */
  const bootstrapped = [];
  /** @type {unknown[][]} */
  const log = [];
  const pool = {
    /** @param {{ requestId: number, revision: string, onTimeout?: () => void }} r */
    beginRequest(r) {
      log.push(['begin', r.requestId, r.revision]);
      h.pool.beginRequest(r);
    },
    /** @param {number} id */
    endRequest(id) {
      log.push(['end', id]);
      h.pool.endRequest(id);
    },
    /** @param {any} task */
    runIdle(task) {
      log.push(['idle', task.kind, task.requestId, task.revision]);
      return h.pool.runIdle(task);
    },
  };
  const queue = createAuxiliaryQueue({
    getPool: o.getPool ?? (() => pool),
    allocate: () => {
      last += 1;
      bootstrapped.push(last);
      return last;
    },
    kinds: ['rate'],
  });
  /** The token of the next main request. */
  const main = () => {
    last += 1;
    return { requestId: last, revision: `m${last}` };
  };
  /** @param {{ requestId: number, revision: string }} t @param {() => void} [onTimeout] */
  const begin = (t, onTimeout) => {
    queue.mainBegin(t);
    pool.beginRequest({ ...t, onTimeout });
  };
  /** @param {{ requestId: number, revision: string }} t @param {boolean} [timedOut] */
  const end = (t, timedOut = false) => {
    pool.endRequest(t.requestId);
    queue.mainEnd(t, timedOut);
  };
  /** A main request that has begun and ended, as after a finished generation. */
  const ended = () => {
    const t = main();
    begin(t);
    end(t);
    return t;
  };
  const idleCalls = () => log.filter((e) => e[0] === 'idle');
  return { queue, pool, log, bootstrapped, main, begin, end, ended, idleCalls };
}

describe('auxiliary queue', () => {
  test('a cold start bootstraps an idle-only token with one allocator id and runs the task under it', async () => {
    const h = harness();
    const r = rig(h);
    const out = track(r.queue.submit('rate', ratePayload));
    await settle();
    assert.deepEqual(r.log, [['begin', 1, 'aux-1'], ['end', 1], ['idle', 'rate', 1, 'aux-1']]);
    assert.deepEqual(r.bootstrapped, [1]);
    assert.deepEqual(h.tasks.map((t) => t.kind), ['rate']);
    assert.deepEqual(h.tasks[0].payload, ratePayload);
    assert.equal(out.state, 'pending');
    h.answer(h.held[0], { value: { rating: 'scripted' } });
    await settle();
    assert.deepEqual([out.state, out.value], ['resolved', { rating: 'scripted' }]);
  });

  test('an ended request that did not time out gives its token and no id is allocated', async () => {
    const h = harness();
    const r = rig(h);
    const t = r.ended();
    const out = track(r.queue.submit('rate', ratePayload));
    await settle();
    assert.deepEqual(r.idleCalls(), [['idle', 'rate', t.requestId, t.revision]]);
    assert.deepEqual(r.bootstrapped, []);
    assert.deepEqual(r.log.filter((e) => e[0] === 'begin'), [['begin', t.requestId, t.revision]]);
    h.answer(h.held[0], { value: { ok: 1 } });
    await settle();
    assert.equal(out.state, 'resolved');
  });

  test('it waits while a main request is active and starts when that request ends', async () => {
    const h = harness();
    const r = rig(h);
    const t = r.main();
    r.begin(t);
    const mainTask = track(h.pool.run({ requestId: t.requestId, revision: t.revision, kind: 'solveFirst', payload: solvePayload }));
    const out = track(r.queue.submit('rate', ratePayload));
    await settle();
    assert.deepEqual(h.tasks.map((x) => x.kind), ['solveFirst'], 'nothing else is posted');
    assert.equal(r.idleCalls().length, 0);
    h.answer(h.held[0], { value: { layout: null } });
    await settle();
    assert.equal(mainTask.state, 'resolved');
    assert.equal(r.idleCalls().length, 0, 'the request has not ended yet');
    r.end(t);
    await settle();
    assert.deepEqual(r.idleCalls(), [['idle', 'rate', t.requestId, t.revision]]);
    h.answer(h.heldOf('rate')[0], { value: { ok: 2 } });
    await settle();
    assert.deepEqual([out.state, out.value], ['resolved', { ok: 2 }]);
    assert.deepEqual(r.bootstrapped, []);
  });

  test('the end of a request that a newer one replaced is ignored', async () => {
    const h = harness();
    const r = rig(h);
    const first = r.main();
    r.begin(first);
    const second = r.main();
    r.begin(second);
    const out = track(r.queue.submit('rate', ratePayload));
    r.queue.mainEnd(first, false);
    await settle();
    assert.equal(r.idleCalls().length, 0, 'the newer request is still active');
    r.end(second);
    await settle();
    assert.deepEqual(r.idleCalls(), [['idle', 'rate', second.requestId, second.revision]]);
    h.answer(h.heldOf('rate')[0], { value: {} });
    await settle();
    assert.equal(out.state, 'resolved');
  });

  describe('a new main request', () => {
    test('rejects running submissions as cancelled, even though the pool aborts them as superseded', async () => {
      const h = harness();
      const r = rig(h);
      r.ended();
      const a = track(r.queue.submit('rate', ratePayload));
      const b = track(r.queue.submit('rate', ratePayload));
      await settle();
      assert.equal(h.heldOf('rate').length, 2);
      const t2 = r.main();
      r.begin(t2);
      await settle();
      assertAborted(a, 'cancelled');
      assertAborted(b, 'cancelled');
      assert.equal(h.tasks.filter((t) => t.kind === 'rate').length, 2, 'they are not posted again');
      const mainTask = track(h.pool.run({ requestId: t2.requestId, revision: t2.revision, kind: 'solveFirst', payload: solvePayload }));
      await settle();
      h.answer(h.heldOf('solveFirst')[0], { value: { layout: [] } });
      await settle();
      assert.deepEqual([mainTask.state, mainTask.value], ['resolved', { layout: [] }]);
    });

    test('rejects waiting submissions as cancelled at once, before they were ever posted', async () => {
      const h = harness();
      const r = rig(h);
      const t1 = r.main();
      r.begin(t1);
      const mainTask = track(h.pool.run({ requestId: t1.requestId, revision: t1.revision, kind: 'solveFirst', payload: solvePayload }));
      const out = track(r.queue.submit('rate', ratePayload));
      await settle();
      assert.equal(out.state, 'pending');
      const t2 = r.main();
      r.queue.mainBegin(t2);
      await settle();
      assertAborted(out, 'cancelled');
      r.pool.beginRequest(t2);
      await settle();
      assert.deepEqual(h.tasks.map((t) => t.kind), ['solveFirst']);
      assert.equal(r.idleCalls().length, 0);
      assertAborted(mainTask, 'superseded');
    });
  });

  describe('its own signal', () => {
    test('aborts a waiting submission and touches no main task', async () => {
      const h = harness();
      const r = rig(h);
      const t = r.main();
      r.begin(t);
      const mainTask = track(h.pool.run({ requestId: t.requestId, revision: t.revision, kind: 'solveFirst', payload: solvePayload }));
      const ac = new AbortController();
      const out = track(r.queue.submit('rate', ratePayload, { signal: ac.signal }));
      await settle();
      ac.abort();
      await settle();
      assertAborted(out, 'cancelled');
      assert.deepEqual(h.tasks.map((x) => x.kind), ['solveFirst'], 'nothing was posted');
      assert.equal(mainTask.state, 'pending');
      h.answer(h.held[0], { value: { layout: [] } });
      await settle();
      assert.deepEqual([mainTask.state, mainTask.value], ['resolved', { layout: [] }]);
      r.end(t);
      await settle();
      assert.equal(r.idleCalls().length, 0, 'the aborted submission does not start later');
    });

    test('aborts a running submission and leaves a lazy certificate of the same token running', async () => {
      const h = harness();
      const r = rig(h);
      const t = r.ended();
      const certificate = track(h.pool.runIdle({ requestId: t.requestId, revision: t.revision, kind: 'certify', payload: certifyPayload }));
      const ac = new AbortController();
      const out = track(r.queue.submit('rate', ratePayload, { signal: ac.signal }));
      await settle();
      const [certify] = h.heldOf('certify');
      const [rate] = h.heldOf('rate');
      assert.ok(certify !== undefined && rate !== undefined, 'both are running');
      ac.abort();
      await settle();
      assertAborted(out, 'cancelled');
      assert.equal(rate.worker.terminated, true);
      assert.equal(certify.worker.terminated, false);
      assert.equal(certificate.state, 'pending');
      h.answer(certify, { value: { status: 'unique' } });
      await settle();
      assert.deepEqual([certificate.state, certificate.value], ['resolved', { status: 'unique' }]);
      assert.equal(h.tasks.filter((x) => x.kind === 'rate').length, 1, 'it does not run again');
    });

    test('an already aborted signal rejects at once without a pool call', async () => {
      const h = harness();
      const r = rig(h);
      const ac = new AbortController();
      ac.abort();
      const out = track(r.queue.submit('rate', ratePayload, { signal: ac.signal }));
      await settle();
      assertAborted(out, 'cancelled');
      assert.deepEqual(r.log, []);
      assert.deepEqual(r.bootstrapped, []);
    });
  });

  test('a request that timed out gives no token: the next submission bootstraps a new one', async () => {
    const h = harness();
    const r = rig(h);
    const t = r.main();
    let timedOut = false;
    r.begin(t, () => {
      timedOut = true;
    });
    h.clock.advance(115000);
    assert.equal(timedOut, true);
    r.end(t, timedOut);
    await assert.rejects(h.pool.runIdle({ requestId: t.requestId, revision: t.revision, kind: 'certify', payload: certifyPayload }), { reason: 'deadline' });
    const out = track(r.queue.submit('rate', ratePayload));
    await settle();
    assert.deepEqual(r.bootstrapped, [t.requestId + 1]);
    assert.deepEqual(r.idleCalls(), [['idle', 'rate', t.requestId + 1, `aux-${t.requestId + 1}`]]);
    h.answer(h.heldOf('rate')[0], { value: { ok: 3 } });
    await settle();
    assert.deepEqual([out.state, out.value], ['resolved', { ok: 3 }]);
  });

  describe('an abort that is neither the caller\'s nor a new request\'s puts the task back in the queue', () => {
    test('cancelAll and recycle, with no main request active: it runs again under the same token', async () => {
      for (const act of /** @type {const} */ (['cancelAll', 'recycle'])) {
        const h = harness();
        const r = rig(h);
        const t = r.ended();
        const out = track(r.queue.submit('rate', ratePayload));
        await settle();
        assert.equal(h.heldOf('rate').length, 1);
        h.pool[act]();
        await settle();
        assert.equal(out.state, 'pending', `${act} is not reported`);
        assert.deepEqual(r.idleCalls(), [['idle', 'rate', t.requestId, t.revision], ['idle', 'rate', t.requestId, t.revision]], act);
        assert.deepEqual(r.bootstrapped, [], act);
        const [first, second] = h.heldOf('rate');
        h.answer(first, { value: { answer: 'first' } });
        await settle();
        assert.equal(out.state, 'pending', 'the answer of the aborted run is ignored');
        h.answer(second, { value: { answer: 'second' } });
        await settle();
        assert.deepEqual([out.state, out.value], ['resolved', { answer: 'second' }], act);
      }
    });

    test('a pool request begun behind its back drops the token and the tasks bootstrap once together', async () => {
      const h = harness();
      const r = rig(h);
      r.ended();
      const a = track(r.queue.submit('rate', ratePayload));
      const b = track(r.queue.submit('rate', ratePayload));
      await settle();
      const foreign = r.main();
      h.pool.beginRequest(foreign);
      await settle();
      assert.deepEqual(r.bootstrapped, [foreign.requestId + 1]);
      const calls = r.idleCalls();
      assert.equal(calls.length, 4);
      assert.deepEqual(calls.slice(2), [
        ['idle', 'rate', foreign.requestId + 1, `aux-${foreign.requestId + 1}`],
        ['idle', 'rate', foreign.requestId + 1, `aux-${foreign.requestId + 1}`],
      ]);
      assert.equal(a.state, 'pending');
      assert.equal(b.state, 'pending');
      for (const task of h.heldOf('rate').slice(2)) {
        h.answer(task, { value: { ok: true } });
      }
      await settle();
      assert.deepEqual([a.state, b.state], ['resolved', 'resolved']);
    });
  });

  describe('errors', () => {
    test('a worker failure passes through as the WorkerTaskError of the task', async () => {
      const h = harness({ handler: () => ({ error: 'rating-incomplete' }) });
      const r = rig(h);
      await assert.rejects(r.queue.submit('rate', ratePayload), (e) => e instanceof WorkerTaskError && e.code === 'rating-incomplete');
    });

    test('a pool that cannot be made, has no runIdle or is closed rejects with worker-unavailable', async () => {
      const h = harness();
      const boom = new PoolError('worker-unavailable', 'no workers');
      await assert.rejects(rig(h, { getPool: () => { throw boom; } }).queue.submit('rate', ratePayload), (e) => e === boom);
      await assert.rejects(
        rig(h, { getPool: () => { throw new Error('not supported'); } }).queue.submit('rate', ratePayload),
        (e) => e instanceof PoolError && e.code === 'worker-unavailable',
      );
      await assert.rejects(
        rig(h, { getPool: () => ({ beginRequest() {}, endRequest() {} }) }).queue.submit('rate', ratePayload),
        (e) => e instanceof PoolError && e.code === 'worker-unavailable',
      );
      const closed = rig(h);
      h.pool.close();
      await assert.rejects(closed.queue.submit('rate', ratePayload), (e) => e instanceof PoolError && e.code === 'worker-unavailable');
    });

    test('a kind outside the allow-list is a TypeError and reaches no pool', async () => {
      const h = harness();
      const r = rig(h);
      await assert.rejects(r.queue.submit('replayPuzzle', {}), TypeError);
      await assert.rejects(r.queue.submit('certify', certifyPayload), TypeError);
      assert.deepEqual(r.log, []);
      assert.deepEqual(h.tasks, []);
    });
  });

  test('dispose rejects waiting and running submissions as closed, and later ones too', async () => {
    const h = harness();
    const running = rig(h);
    running.ended();
    const a = track(running.queue.submit('rate', ratePayload));
    await settle();
    assert.equal(h.heldOf('rate').length, 1);
    running.queue.dispose();
    await settle();
    assertAborted(a, 'closed');
    assert.equal(h.heldOf('rate')[0].worker.terminated, true, 'the pool task is released');
    const again = track(running.queue.submit('rate', ratePayload));
    await settle();
    assertAborted(again, 'closed');

    const waiting = rig(harness());
    waiting.begin(waiting.main());
    const b = track(waiting.queue.submit('rate', ratePayload));
    await settle();
    assert.equal(b.state, 'pending');
    waiting.queue.dispose();
    await settle();
    assertAborted(b, 'closed');
    const later = track(waiting.queue.submit('rate', ratePayload));
    await settle();
    assertAborted(later, 'closed');
  });
});
