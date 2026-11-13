// @ts-check
// Auxiliary requests (design §8.1; D26): background jobs of the display rating and, later, the Generation Steps replay
// run on the pool the app already has. An auxiliary request is one idle-priority task. It waits while a main request
// (a generation or a verification) is active, gives way to every new one, and never begins or cancels main work, a
// hint or a lazy certificate. No DOM, no storage and no timers of its own.

import { isAbortError, PoolAbortError, PoolError } from './worker-pool.js';

/**
 * @typedef {object} AuxiliaryPool
 * @property {(r: { requestId: number, revision: string }) => void} beginRequest
 * @property {(requestId: number) => void} endRequest
 * @property {(task: { requestId: number, revision: string, kind: string, payload: object, signal?: AbortSignal }) => Promise<unknown>} [runIdle]
 */

/**
 * @typedef {object} AuxiliaryQueue
 * @property {(kind: string, payload: object, options?: { signal?: AbortSignal }) => Promise<unknown>} submit
 * @property {(token: { requestId: number, revision: string }) => void} mainBegin Call before the owner's
 *   `pool.beginRequest` of a main request: rejects every waiting submission and marks every running one (rule 4).
 * @property {(token: { requestId: number, revision: string }, timedOut: boolean) => void} mainEnd Call after the
 *   owner's `pool.endRequest` (also when the request timed out); ignored unless `token.requestId` is the last
 *   `mainBegin`'s. Keeps the token when it did not time out, then starts the waiting submissions.
 * @property {() => void} dispose Rejects every waiting and running submission with `PoolAbortError('closed')`; later
 *   submissions reject the same way.
 */

/**
 * @typedef {object} Entry
 * @property {string} kind
 * @property {object} payload
 * @property {AbortSignal | undefined} signal The caller's signal.
 * @property {(value: unknown) => void} resolve
 * @property {(error: unknown) => void} reject
 * @property {AbortController} controller Aborts the pool task of the current run only.
 * @property {boolean} byMain A new main request began while the task ran.
 * @property {boolean} settled
 * @property {(() => void) | null} cleanup Removes the listener of the caller's signal.
 */

/**
 * @param {{ getPool: () => AuxiliaryPool, allocate: () => number, kinds: readonly string[] }} options `getPool` may
 *   create the pool lazily (a throw means no worker); `allocate` returns the next id of the owner's monotonic
 *   allocator and is called only for a bootstrap.
 * @returns {AuxiliaryQueue}
 */
export function createAuxiliaryQueue(options) {
  const { getPool, allocate, kinds } = options;
  let active = false;
  /** @type {{ requestId: number, revision: string } | null} */
  let mainToken = null;
  /** The newest usable request token; null when the next start must bootstrap one. */
  let token = /** @type {{ requestId: number, revision: string } | null} */ (null);
  /** @type {Entry[]} */
  let waiting = [];
  /** @type {Set<Entry>} */
  const running = new Set();
  let disposed = false;

  /** @param {Entry} entry @param {unknown} error */
  function fail(entry, error) {
    if (!entry.settled) {
      entry.settled = true;
      entry.cleanup?.();
      entry.reject(error);
    }
  }

  /** @param {Entry} entry @param {unknown} value */
  function succeed(entry, value) {
    if (!entry.settled) {
      entry.settled = true;
      entry.cleanup?.();
      entry.resolve(value);
    }
  }

  /** @param {() => unknown} makeError */
  function failWaiting(makeError) {
    const entries = waiting;
    waiting = [];
    for (const entry of entries) {
      fail(entry, makeError());
    }
  }

  /** @param {unknown} error @returns {unknown} */
  const unavailable = (error) => (error instanceof PoolError
    ? error
    : new PoolError('worker-unavailable', error instanceof Error ? error.message : 'The worker pool is unavailable'));

  /** @param {Entry} entry */
  function abortByCaller(entry) {
    const index = waiting.indexOf(entry);
    if (index >= 0) {
      waiting.splice(index, 1);
      fail(entry, new PoolAbortError('cancelled'));
    } else if (running.has(entry)) {
      entry.controller.abort();
    }
  }

  /** @param {Entry} entry @param {unknown} error */
  function runFailed(entry, error) {
    running.delete(entry);
    if (entry.settled) {
      return;
    }
    if (!isAbortError(error)) {
      fail(entry, error);
    } else if (entry.signal?.aborted === true || entry.byMain) {
      fail(entry, new PoolAbortError('cancelled'));
    } else if (error.reason === 'closed') {
      fail(entry, error);
    } else {
      if (error.reason === 'stale' || error.reason === 'superseded' || error.reason === 'deadline' || error.reason === 'ended') {
        token = null;
      }
      entry.controller = new AbortController();
      waiting.push(entry);
      queueMicrotask(start);
      return;
    }
    if (waiting.length > 0) {
      queueMicrotask(start);
    }
  }

  /** @param {Entry} entry @param {unknown} value */
  function runDone(entry, value) {
    running.delete(entry);
    succeed(entry, value);
    if (waiting.length > 0) {
      queueMicrotask(start);
    }
  }

  /**
   * @param {AuxiliaryPool} pool
   * @param {{ requestId: number, revision: string }} usable
   * @param {Entry} entry
   */
  function run(pool, usable, entry) {
    running.add(entry);
    /** @type {Promise<unknown>} */
    let task;
    try {
      task = /** @type {NonNullable<AuxiliaryPool['runIdle']>} */ (pool.runIdle)({
        requestId: usable.requestId,
        revision: usable.revision,
        kind: entry.kind,
        payload: entry.payload,
        signal: entry.controller.signal,
      });
    } catch (e) {
      task = Promise.reject(e);
    }
    task.then((value) => runDone(entry, value), (error) => runFailed(entry, error));
  }

  function start() {
    if (disposed || active || waiting.length === 0) {
      return;
    }
    /** @type {AuxiliaryPool} */
    let pool;
    try {
      pool = getPool();
    } catch (e) {
      failWaiting(() => unavailable(e));
      return;
    }
    if (typeof pool?.runIdle !== 'function') {
      failWaiting(() => new PoolError('worker-unavailable', 'This pool runs no auxiliary tasks'));
      return;
    }
    if (token === null) {
      if (running.size > 0) {
        return;
      }
      try {
        const requestId = allocate();
        const revision = `aux-${requestId}`;
        pool.beginRequest({ requestId, revision });
        pool.endRequest(requestId);
        token = { requestId, revision };
      } catch (e) {
        failWaiting(() => unavailable(e));
        return;
      }
    }
    const usable = token;
    const entries = waiting;
    waiting = [];
    for (const entry of entries) {
      run(pool, usable, entry);
    }
  }

  return {
    submit(kind, payload, submitOptions) {
      const signal = submitOptions?.signal;
      return new Promise((resolve, reject) => {
        if (!kinds.includes(kind)) {
          reject(new TypeError(`Unknown auxiliary request kind: ${String(kind)}`));
          return;
        }
        if (disposed) {
          reject(new PoolAbortError('closed'));
          return;
        }
        if (signal?.aborted === true) {
          reject(new PoolAbortError('cancelled'));
          return;
        }
        /** @type {Entry} */
        const entry = {
          kind, payload, signal, resolve, reject, controller: new AbortController(), byMain: false, settled: false, cleanup: null,
        };
        if (signal !== undefined) {
          const onAbort = () => abortByCaller(entry);
          signal.addEventListener('abort', onAbort, { once: true });
          entry.cleanup = () => signal.removeEventListener('abort', onAbort);
        }
        waiting.push(entry);
        start();
      });
    },

    mainBegin(next) {
      active = true;
      mainToken = next;
      token = null;
      failWaiting(() => new PoolAbortError('cancelled'));
      for (const entry of running) {
        entry.byMain = true;
      }
    },

    mainEnd(ended, timedOut) {
      if (mainToken === null || mainToken.requestId !== ended.requestId) {
        return;
      }
      active = false;
      token = timedOut ? null : { requestId: ended.requestId, revision: ended.revision };
      start();
    },

    dispose() {
      disposed = true;
      failWaiting(() => new PoolAbortError('closed'));
      for (const entry of [...running]) {
        running.delete(entry);
        fail(entry, new PoolAbortError('closed'));
        entry.controller.abort();
      }
    },
  };
}
