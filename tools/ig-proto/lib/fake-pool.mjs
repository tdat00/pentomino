// @ts-check
// A port of the scripted pool of tests/generation-client.test.js (`settle`, `createFakeClock`, `FakeWorker`, `harness`
// and `track`; lines 19-136 and 197-203 at the frozen source): the code is the test file's, and only `harness` takes
// the `createPool` of a tree as its first parameter, so that a case runs the pool and the client of one tree, loaded by
// file URL (V4-T07b). No worker thread is created: the workers are scripted and the pool's clock is the fake one.

export const settle = async () => {
  // The client slices pack validation with timer-based pauses, so alternate both kinds of turns.
  for (let i = 0; i < 12; i += 1) {
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setTimeout(resolve, 2));
  }
};

export function createFakeClock() {
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

export class FakeWorker {
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
 * @param {(options: any) => any} createPool The `createPool` of the tree under test.
 * @param {{ size?: number, handler?: (task: Task) => Outcome | undefined }} [o]
 */
export function harness(createPool, o = {}) {
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

/** @param {Promise<unknown>} promise */
export function track(promise) {
  /** @type {{ state: string, value?: any, error?: any }} */
  const out = { state: 'pending' };
  promise.then((value) => Object.assign(out, { state: 'resolved', value }), (error) => Object.assign(out, { state: 'rejected', error }));
  return out;
}
