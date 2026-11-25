// @ts-check
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { createResponseGuard, guardSetThenBatch } from '../core/browser/generation-deadline.js';

function createFakeClock() {
  let now = 0;
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
    pending: () => timers.length,
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

/** @param {any} [snapshot] */
const fakeClient = (snapshot = { status: 'partial', reason: 'response-bound', accepted: [] }) => ({
  cancels: 0,
  cancel() {
    this.cancels += 1;
  },
  prefixSnapshot: () => snapshot,
});

/** @returns {{ promise: Promise<any>, resolve: (v: any) => void, reject: (e: unknown) => void }} */
function deferred() {
  /** @type {any} */
  let resolve;
  /** @type {any} */
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** @param {Promise<unknown>} promise */
function track(promise) {
  /** @type {{ state: string, value?: any, error?: any }} */
  const out = { state: 'pending' };
  promise.then((value) => Object.assign(out, { state: 'resolved', value }), (error) => Object.assign(out, { state: 'rejected', error }));
  return out;
}

const never = () => new Promise(() => {});
const TYPED = { status: 'failed', reason: 'response-bound', failures: {} };
const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('response guard', () => {
  test('a set that settles first is returned unchanged', async () => {
    const clock = createFakeClock();
    const client = fakeClient();
    const guard = createResponseGuard({ clock, client, origin: 0 });
    const d = deferred();
    const out = track(guard.set(d.promise));
    clock.advance(1000);
    const value = { status: 'complete' };
    d.resolve(value);
    await flush();
    assert.equal(out.value, value);
    assert.equal(client.cancels, 0);
    assert.equal(guard.fired(), false);
    guard.clear();
  });

  test('an unsettled set at the bound is a typed failure', async () => {
    const clock = createFakeClock();
    const client = fakeClient();
    const guard = createResponseGuard({ clock, client, origin: 0 });
    const out = track(guard.set(never()));
    clock.advance(118999);
    await flush();
    assert.equal(out.state, 'pending');
    clock.advance(1);
    await flush();
    assert.deepEqual(out.value, TYPED);
    assert.equal(client.cancels, 1);
    assert.equal(guard.fired(), true);
  });

  test('an unsettled batch at the bound returns the snapshot', async () => {
    const clock = createFakeClock();
    const snapshot = { stub: true };
    const client = fakeClient(snapshot);
    const guard = createResponseGuard({ clock, client, origin: 0 });
    const out = track(guard.batch(never()));
    clock.advance(119000);
    await flush();
    assert.equal(out.value, snapshot);
    assert.equal(client.cancels, 1);
  });

  test('a null snapshot is an error', async () => {
    const clock = createFakeClock();
    const guard = createResponseGuard({ clock, client: fakeClient(null), origin: 0 });
    const out = track(guard.batch(never()));
    clock.advance(119000);
    await flush();
    assert.equal(out.state, 'rejected');
    assert.equal(out.error.message, 'the response bound found no batch prefix');
  });

  test('a late completion after the bound is ignored', async () => {
    const clock = createFakeClock();
    const guard = createResponseGuard({ clock, client: fakeClient(), origin: 0 });
    const d = deferred();
    const out = track(guard.set(d.promise));
    clock.advance(119000);
    await flush();
    assert.deepEqual(out.value, TYPED);
    clock.advance(500);
    d.resolve({ status: 'complete' });
    await flush();
    assert.deepEqual(out.value, TYPED);
  });

  test('a late rejection after the bound is ignored', async () => {
    const clock = createFakeClock();
    const guard = createResponseGuard({ clock, client: fakeClient(), origin: 0 });
    const d = deferred();
    const out = track(guard.set(d.promise));
    clock.advance(119000);
    d.reject(new Error('late'));
    await flush();
    assert.equal(out.state, 'resolved');
  });

  test('clear is idempotent and stops the timer', async () => {
    const clock = createFakeClock();
    const client = fakeClient();
    const guard = createResponseGuard({ clock, client, origin: 0 });
    const out = track(guard.set(never()));
    guard.clear();
    guard.clear();
    assert.equal(clock.pending(), 0);
    clock.advance(200000);
    await flush();
    assert.equal(out.state, 'pending');
    assert.equal(client.cancels, 0);
    assert.equal(guard.fired(), false);
  });

  test('a phase after the bound resolves at once', async () => {
    const clock = createFakeClock();
    const snapshot = { stub: true };
    const client = fakeClient(snapshot);
    const guard = createResponseGuard({ clock, client, origin: 0 });
    clock.advance(119000);
    assert.equal(client.cancels, 1);
    const out = track(guard.batch(never()));
    await flush();
    assert.equal(out.value, snapshot);
    assert.equal(client.cancels, 2);
  });

  test('a second phase while one is pending throws; a failing cancel is caught', async () => {
    const clock = createFakeClock();
    const client = { cancel() { throw new Error('cancel failed'); }, prefixSnapshot: () => null };
    const guard = createResponseGuard({ clock, client, origin: 0 });
    const out = track(guard.set(never()));
    assert.throws(() => guard.batch(never()), /a response-guard phase is already pending/);
    clock.advance(119000);
    await flush();
    assert.deepEqual(out.value, TYPED);
  });

  test('the timer counts from the origin', () => {
    const clock = createFakeClock();
    clock.advance(10000);
    const client = fakeClient();
    createResponseGuard({ clock, client, origin: 4000 });
    clock.advance(112999);
    assert.equal(client.cancels, 0);
    clock.advance(1);
    assert.equal(client.cancels, 1);
  });
});

describe('guardSetThenBatch', () => {
  test('composite: the set\'s completion keeps the timer for the batch', async () => {
    const clock = createFakeClock();
    const snapshot = { stub: true };
    const client = fakeClient(snapshot);
    const set = { status: 'complete' };
    const d = deferred();
    const out = track(guardSetThenBatch({ clock, client, scope: { origin: 0, setCutAt: 46000 } }, () => d.promise, () => never()));
    clock.advance(30000);
    d.resolve(set);
    await flush();
    assert.equal(clock.pending(), 1, 'the one timer survives the set');
    clock.advance(89000);
    await flush();
    assert.deepEqual(out.value, { set, batch: snapshot });
    assert.equal(client.cancels, 1);
    assert.equal(clock.pending(), 0);
  });

  test('legacy: a long set, then a batch beyond the old set\'s deadline', async () => {
    const clock = createFakeClock();
    const client = fakeClient();
    const set = { status: 'complete' };
    const setD = deferred();
    const batchD = deferred();
    const out = track(guardSetThenBatch({ clock, client }, () => setD.promise, () => batchD.promise));
    clock.advance(100000);
    setD.resolve(set);
    await flush();
    assert.equal(clock.pending(), 1, 'only the batch\'s guard');
    clock.advance(100000);
    batchD.resolve({ status: 'complete' });
    await flush();
    assert.deepEqual(out.value, { set, batch: { status: 'complete' } });
    assert.equal(client.cancels, 0);
    assert.equal(clock.pending(), 0);
  });

  test('legacy: a held set is cut at its own bound', async () => {
    const clock = createFakeClock();
    const client = fakeClient();
    /** @type {any[]} */
    const seen = [];
    const out = track(guardSetThenBatch({ clock, client }, () => never(), (set) => {
      seen.push(set);
      return null;
    }));
    clock.advance(119000);
    await flush();
    assert.deepEqual(seen, [TYPED]);
    assert.deepEqual(out.value, { set: TYPED, batch: null });
    assert.equal(clock.pending(), 0);
  });

  test('a rejection passes through after the guards are cleared', async () => {
    const clock = createFakeClock();
    const client = fakeClient();
    const failure = new Error('set failed');
    await assert.rejects(guardSetThenBatch({ clock, client, scope: { origin: 0, setCutAt: null } }, () => Promise.reject(failure), () => null), failure);
    assert.equal(clock.pending(), 0);
    const batchFailure = new Error('batch failed');
    await assert.rejects(guardSetThenBatch({ clock, client }, () => Promise.resolve({ status: 'complete' }), () => Promise.reject(batchFailure)), batchFailure);
    assert.equal(clock.pending(), 0);
  });
});
