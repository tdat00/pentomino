// @ts-check
// Worker pool and action watchdogs (design §8.1, §8.4, §8.5). Every `run` of one action (`beginRequest`) shares its
// clock, so no subtask restarts the two-minute budget. Replies from a terminated or replaced worker are ignored, so a
// late message can never settle a new task.

import { parseTaskMessage, parseWorkerMessage } from '../engine/protocol.js';
import { BUDGETS, TIME } from '../engine/policy.js';

/** @typedef {import('../engine/protocol.js').TaskKind} TaskKind */
/** @typedef {import('../engine/types.js').Issue} Issue */

/**
 * `signal` cancels one task (for example attempts above the lowest successful one); it is never sent to a worker.
 * @typedef {object} PoolTask
 * @property {number} requestId
 * @property {string} revision
 * @property {TaskKind} kind
 * @property {object} payload
 * @property {AbortSignal} [signal]
 */

/**
 * A browser `Worker`, a Node adapter (which maps its `exit` event to `error`) or a test fake. Events: `message`
 * (event.data), `error` and `messageerror`.
 * @typedef {object} WorkerLike
 * @property {(message: unknown) => void} postMessage
 * @property {() => void} terminate
 * @property {(type: string, listener: (event: any) => void) => void} addEventListener
 */

/**
 * @typedef {object} Clock
 * @property {() => number} now Monotonic milliseconds.
 * @property {(fn: () => void, ms: number) => unknown} setTimeout
 * @property {(handle: unknown) => void} clearTimeout
 */

/**
 * @typedef {object} MemorySnapshot
 * @property {number} workerBytes Latest reported high-water bytes of the live workers.
 * @property {number} mainBytes Known main-thread buffers.
 * @property {number} totalBytes
 * @property {number} peakBytes Highest `totalBytes` seen.
 * @property {number} mainBudgetBytes
 */

/**
 * @typedef {object} TimeoutInfo
 * @property {number} requestId
 * @property {string} revision
 * @property {number} elapsedMs
 */

/**
 * @typedef {object} Pool
 * @property {(task: PoolTask, onProgress?: (p: { stage: string, rowTrials: number, bytes: number }) => void) => Promise<unknown>} run
 * @property {(task: PoolTask) => Promise<unknown>} runIdle
 * @property {() => void} cancelAll
 * @property {() => void} recycle
 * @property {number} size
 * @property {(r: { requestId: number, revision: string, onTimeout?: (info: TimeoutInfo) => void }) => void} beginRequest
 * @property {(requestId: number) => void} endRequest
 * @property {() => MemorySnapshot} memory
 * @property {(bytes: number) => void} setMainBytes
 * @property {() => void} close
 */

export const MAIN_BUDGET_BYTES = 300 * 1048576;
/** Largest byte total one worker may report: main, scratch and cache workspaces. */
export const WORKER_LIMIT_BYTES = BUDGETS.workspaceBytes + BUDGETS.scratchBytes + BUDGETS.cacheBytes;
/** UI memory callbacks are limited to 5 per second; accounting itself is immediate. */
export const MEMORY_UI_INTERVAL_MS = 200;
export const MAX_POOL_SIZE = 4;

/** Rejection of a task that was cancelled, superseded, stale or past the deadline. `reason` says which. */
export class PoolAbortError extends Error {
  /**
   * @param {'cancelled' | 'superseded' | 'stale' | 'ended' | 'recycled' | 'preempted' | 'deadline' | 'closed'} reason
   */
  constructor(reason) {
    super(`The task was aborted: ${reason}`);
    this.name = 'AbortError';
    this.code = 'aborted';
    this.reason = reason;
  }
}

/**
 * Transport or pool fault. `code`: `invalid-task`, `worker-unavailable`,
 * `worker-crashed`, `worker-protocol`, `memory-limit`, `worker-failed`.
 */
export class PoolError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   * @param {Issue[]} [issues]
   */
  constructor(code, message, issues = []) {
    super(message);
    this.name = 'PoolError';
    this.code = code;
    this.issues = issues;
  }
}

/** The worker ran the task and replied with an error (`model-too-large`, `invalid-pack`, ...). */
export class WorkerTaskError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   * @param {Issue[]} [issues]
   */
  constructor(code, message, issues = []) {
    super(message);
    this.name = 'WorkerTaskError';
    this.code = code;
    this.issues = issues;
  }
}

/**
 * @param {unknown} error
 * @returns {error is PoolAbortError}
 */
export function isAbortError(error) {
  return error instanceof PoolAbortError;
}

/** @type {Clock} */
export const systemClock = Object.freeze({
  now: () => globalThis.performance.now(),
  setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
  clearTimeout: (handle) => globalThis.clearTimeout(/** @type {any} */ (handle)),
});

/** @returns {number} `max(1, min(4, navigator.hardwareConcurrency || 4))` */
export function defaultPoolSize() {
  const cores = /** @type {any} */ (globalThis).navigator?.hardwareConcurrency;
  return Math.max(1, Math.min(MAX_POOL_SIZE, cores || 4));
}

/** @returns {WorkerLike} */
function defaultWorkerFactory() {
  const Ctor = /** @type {any} */ (globalThis).Worker;
  if (typeof Ctor !== 'function') {
    throw new PoolError('worker-unavailable', 'Module workers are not supported here');
  }
  return new Ctor(new URL('../workers/engine.worker.js', import.meta.url), { type: 'module' });
}

/**
 * @typedef {object} RequestState
 * @property {number} requestId
 * @property {string} revision
 * @property {number} startedAt
 * @property {unknown} timer
 * @property {((info: TimeoutInfo) => void) | undefined} onTimeout
 * @property {boolean} ended
 * @property {boolean} timedOut
 */

/**
 * @typedef {object} Slot
 * @property {number} index
 * @property {WorkerLike | null} worker
 * @property {Entry | null} busy
 * @property {number} bytes
 */

/**
 * @typedef {object} Entry
 * @property {number} id
 * @property {boolean} idle
 * @property {RequestState} request
 * @property {{ type: 'task', id: number, kind: TaskKind, payload: any }} message
 * @property {(value: unknown) => void} resolve
 * @property {(error: unknown) => void} reject
 * @property {((p: { stage: string, rowTrials: number, bytes: number }) => void) | undefined} onProgress
 * @property {Slot | null} slot
 * @property {boolean} settled
 * @property {(() => void) | null} cleanup
 */

/**
 * @param {{ size?: number, workerFactory?: () => WorkerLike, clock?: Clock,
 *   onMemory?: (snapshot: MemorySnapshot) => void, mainBytes?: number }} [options]
 * @returns {Pool}
 */
export function createPool(options = {}) {
  const size = options.size ?? defaultPoolSize();
  if (!Number.isInteger(size) || size < 1 || size > MAX_POOL_SIZE) {
    throw new RangeError(`pool size must be an integer from 1 to ${MAX_POOL_SIZE}`);
  }
  const factory = options.workerFactory ?? defaultWorkerFactory;
  const clock = options.clock ?? systemClock;
  /** @type {Slot[]} */
  const slots = Array.from({ length: size }, (_, index) => ({ index, worker: null, busy: null, bytes: 0 }));
  /** @type {Map<number, Entry>} */
  const registry = new Map();
  /** @type {Entry[]} */
  const normalQueue = [];
  /** @type {Entry[]} */
  const idleQueue = [];
  /** @type {RequestState | null} */
  let current = null;
  let lastRequestId = -1;
  let nextId = 1;
  let closed = false;
  let pumping = false;
  let mainBytes = options.mainBytes ?? 0;
  let peakBytes = 0;
  let lastEmit = -Infinity;
  /** @type {unknown} */
  let memoryTimer = null;

  /** @returns {MemorySnapshot} */
  const memory = () => {
    const workerBytes = slots.reduce((sum, s) => sum + s.bytes, 0);
    const totalBytes = workerBytes + mainBytes;
    return { workerBytes, mainBytes, totalBytes, peakBytes: Math.max(peakBytes, totalBytes), mainBudgetBytes: MAIN_BUDGET_BYTES };
  };

  const emitMemory = () => {
    const callback = options.onMemory;
    if (callback === undefined) {
      return;
    }
    const send = () => {
      lastEmit = clock.now();
      try {
        callback(memory());
      } catch {
        // a faulty display callback never affects the pool
      }
    };
    const wait = lastEmit + MEMORY_UI_INTERVAL_MS - clock.now();
    if (wait <= 0) {
      send();
    } else if (memoryTimer === null) {
      memoryTimer = clock.setTimeout(() => {
        memoryTimer = null;
        send();
      }, wait);
    }
  };

  /** Accounts a memory change immediately; only the display callback is throttled. */
  const account = () => {
    peakBytes = memory().peakBytes;
    emitMemory();
  };

  /** @param {Entry} entry */
  const finish = (entry) => {
    entry.settled = true;
    registry.delete(entry.id);
    for (const queue of [normalQueue, idleQueue]) {
      const at = queue.indexOf(entry);
      if (at >= 0) {
        queue.splice(at, 1);
      }
    }
    entry.cleanup?.();
    entry.cleanup = null;
  };

  /**
   * @param {Entry} entry
   * @param {unknown} value
   */
  const resolveEntry = (entry, value) => {
    if (!entry.settled) {
      finish(entry);
      entry.resolve(value);
    }
  };

  /**
   * @param {Entry} entry
   * @param {unknown} error
   */
  const rejectEntry = (entry, error) => {
    if (!entry.settled) {
      finish(entry);
      entry.reject(error);
    }
  };

  /** Terminates the exact worker instance of a slot; it is recreated lazily. @param {Slot} slot */
  const discard = (slot) => {
    const { worker } = slot;
    slot.worker = null;
    slot.busy = null;
    slot.bytes = 0;
    try {
      worker?.terminate();
    } catch {
      // nothing more to release
    }
    account();
  };

  /**
   * @param {Entry} entry
   * @param {ConstructorParameters<typeof PoolAbortError>[0]} reason
   */
  const abortEntry = (entry, reason) => {
    if (entry.settled) {
      return;
    }
    const { slot } = entry;
    entry.slot = null;
    if (slot !== null && slot.busy === entry) {
      discard(slot);
    }
    rejectEntry(entry, new PoolAbortError(reason));
  };

  /**
   * @param {(entry: Entry) => boolean} match
   * @param {ConstructorParameters<typeof PoolAbortError>[0]} reason
   */
  const abortWhere = (match, reason) => {
    for (const entry of [...registry.values()]) {
      if (match(entry)) {
        abortEntry(entry, reason);
      }
    }
  };

  /** @param {RequestState} request */
  const stopTimer = (request) => {
    if (request.timer !== null) {
      clock.clearTimeout(request.timer);
      request.timer = null;
    }
  };

  /** @param {RequestState} request */
  const expire = (request) => {
    if (current !== request || request.ended || request.timedOut) {
      return;
    }
    request.timedOut = true;
    stopTimer(request);
    abortWhere((e) => e.request === request, 'deadline');
    try {
      request.onTimeout?.({ requestId: request.requestId, revision: request.revision, elapsedMs: clock.now() - request.startedAt });
    } catch {
      // the controller's callback must not break the pool
    }
  };

  /** Late timers cannot extend the deadline: every dispatch re-checks the shared clock. @param {RequestState} request */
  const checkDeadline = (request) => {
    if (!request.ended && !request.timedOut && clock.now() - request.startedAt >= TIME.dispatchStopMs) {
      expire(request);
    }
  };

  /**
   * @param {Slot} slot
   * @param {string} code
   * @param {string} message
   */
  const failSlot = (slot, code, message) => {
    const { busy } = slot;
    discard(slot);
    if (busy !== null) {
      busy.slot = null;
      rejectEntry(busy, new PoolError(code, message));
    }
    pump();
  };

  /**
   * @param {Slot} slot
   * @param {WorkerLike} instance
   * @param {unknown} data
   */
  const onMessage = (slot, instance, data) => {
    if (slot.worker !== instance) {
      return;
    }
    const parsed = parseWorkerMessage(data);
    if (!parsed.ok) {
      failSlot(slot, 'worker-protocol', 'The worker sent a malformed message');
      return;
    }
    const message = parsed.value;
    const entry = slot.busy;
    if (entry === null || message.id !== entry.id) {
      return;
    }
    if (current !== entry.request) {
      abortEntry(entry, 'stale');
      pump();
      return;
    }
    if (message.type === 'progress') {
      if (message.bytes > WORKER_LIMIT_BYTES) {
        failSlot(slot, 'memory-limit', `The worker reported ${message.bytes} bytes, above ${WORKER_LIMIT_BYTES}`);
        return;
      }
      slot.bytes = message.bytes;
      account();
      try {
        entry.onProgress?.({ stage: message.stage, rowTrials: message.rowTrials, bytes: message.bytes });
      } catch {
        // a faulty progress callback never affects the task
      }
      return;
    }
    slot.busy = null;
    entry.slot = null;
    if (message.type === 'result') {
      resolveEntry(entry, message.value);
    } else {
      rejectEntry(entry, new WorkerTaskError(message.code, message.message, message.issues ?? []));
    }
    pump();
  };

  /** @param {Slot} slot @returns {WorkerLike} */
  const spawn = (slot) => {
    const instance = factory();
    try {
      instance.addEventListener('message', (event) => onMessage(slot, instance, event?.data));
      instance.addEventListener('error', (event) => {
        if (slot.worker === instance) {
          failSlot(slot, 'worker-crashed', `The worker stopped: ${String(event?.message ?? 'unknown error').slice(0, 200)}`);
        }
      });
      instance.addEventListener('messageerror', () => {
        if (slot.worker === instance) {
          failSlot(slot, 'worker-protocol', 'The worker sent a message that could not be read');
        }
      });
    } catch (e) {
      try {
        instance.terminate();
      } catch {
        // nothing more to release
      }
      throw e;
    }
    slot.worker = instance;
    return instance;
  };

  /** @param {Entry} entry @param {Slot} slot */
  const dispatch = (entry, slot) => {
    let instance = slot.worker;
    if (instance === null) {
      try {
        instance = spawn(slot);
      } catch (e) {
        rejectEntry(entry, e instanceof PoolError ? e : new PoolError('worker-unavailable', 'A worker could not be started'));
        return;
      }
    }
    slot.busy = entry;
    entry.slot = slot;
    try {
      instance.postMessage(entry.message);
    } catch {
      discard(slot);
      entry.slot = null;
      rejectEntry(entry, new PoolError('worker-failed', 'The task could not be sent to the worker'));
    }
  };

  const freeSlot = () => slots.find((s) => s.busy === null && s.worker !== null) ?? slots.find((s) => s.busy === null);

  function pump() {
    if (pumping) {
      return;
    }
    pumping = true;
    try {
      for (;;) {
        if (current !== null) {
          checkDeadline(current);
        }
        const entry = normalQueue[0] ?? idleQueue[0];
        if (entry === undefined) {
          return;
        }
        const slot = freeSlot();
        if (slot === undefined) {
          const victim = entry.idle ? undefined : slots.find((s) => s.busy?.idle === true);
          if (victim?.busy === undefined || victim.busy === null) {
            return;
          }
          // Background certificates never delay a user-visible task.
          abortEntry(victim.busy, 'preempted');
          continue;
        }
        (entry.idle ? idleQueue : normalQueue).shift();
        dispatch(entry, slot);
      }
    } finally {
      pumping = false;
    }
  }

  /**
   * @param {PoolTask} task
   * @param {boolean} idle
   * @param {Entry['onProgress']} onProgress
   * @returns {Promise<unknown>}
   */
  const enqueue = (task, idle, onProgress) => new Promise((resolve, reject) => {
    if (closed) {
      reject(new PoolAbortError('closed'));
      return;
    }
    const message = parseTaskMessage({ type: 'task', id: 0, kind: task?.kind, payload: task?.payload });
    if (!message.ok || !Number.isSafeInteger(task.requestId) || task.requestId < 0 || typeof task.revision !== 'string') {
      reject(new PoolError('invalid-task', 'The task is not a valid pool task', message.ok ? [] : message.issues));
      return;
    }
    const request = current;
    if (request === null || request.requestId !== task.requestId || request.revision !== task.revision) {
      reject(new PoolAbortError('stale'));
      return;
    }
    if (task.signal?.aborted === true) {
      reject(new PoolAbortError('cancelled'));
      return;
    }
    checkDeadline(request);
    if (request.timedOut) {
      reject(new PoolAbortError('deadline'));
      return;
    }
    if (request.ended && !idle) {
      reject(new PoolAbortError('ended'));
      return;
    }
    const id = nextId;
    nextId += 1;
    /** @type {Entry} */
    const entry = {
      id,
      idle,
      request,
      message: { ...message.value, id },
      resolve,
      reject,
      onProgress,
      slot: null,
      settled: false,
      cleanup: null,
    };
    const { signal } = task;
    if (signal !== undefined) {
      const onAbort = () => {
        abortEntry(entry, 'cancelled');
        pump();
      };
      signal.addEventListener('abort', onAbort, { once: true });
      entry.cleanup = () => signal.removeEventListener('abort', onAbort);
    }
    registry.set(id, entry);
    (idle ? idleQueue : normalQueue).push(entry);
    pump();
  });

  return {
    size,
    run: (task, onProgress) => enqueue(task, false, onProgress),
    runIdle: (task) => enqueue(task, true, undefined),

    beginRequest({ requestId, revision, onTimeout }) {
      if (closed) {
        throw new Error('the pool is closed');
      }
      if (!Number.isSafeInteger(requestId) || requestId < 0 || typeof revision !== 'string' || revision.length === 0) {
        throw new TypeError('requestId must be a nonnegative safe integer and revision a nonempty string');
      }
      if (requestId <= lastRequestId) {
        throw new RangeError('requestId must increase with every request');
      }
      if (current !== null) {
        stopTimer(current);
        current.ended = true;
        abortWhere(() => true, 'superseded');
      }
      /** @type {RequestState} */
      const request = { requestId, revision, startedAt: clock.now(), timer: null, onTimeout, ended: false, timedOut: false };
      request.timer = clock.setTimeout(() => expire(request), TIME.dispatchStopMs);
      current = request;
      lastRequestId = requestId;
    },

    endRequest(requestId) {
      const request = current;
      if (request === null || request.requestId !== requestId || request.ended) {
        return;
      }
      request.ended = true;
      stopTimer(request);
      // Leftover speculative work of a finished action is useless; idle certificates continue.
      abortWhere((e) => e.request === request && !e.idle, 'ended');
      pump();
    },

    cancelAll() {
      if (current !== null) {
        current.ended = true;
        stopTimer(current);
      }
      abortWhere(() => true, 'cancelled');
    },

    recycle() {
      for (const slot of slots) {
        if (slot.busy !== null) {
          abortEntry(slot.busy, 'recycled');
        } else if (slot.worker !== null) {
          discard(slot);
        }
      }
      pump();
    },

    memory,

    setMainBytes(bytes) {
      if (!Number.isSafeInteger(bytes) || bytes < 0) {
        throw new RangeError('bytes must be a nonnegative safe integer');
      }
      mainBytes = bytes;
      account();
    },

    close() {
      closed = true;
      if (current !== null) {
        current.ended = true;
        stopTimer(current);
      }
      abortWhere(() => true, 'closed');
      for (const slot of slots) {
        if (slot.worker !== null) {
          discard(slot);
        }
      }
      if (memoryTimer !== null) {
        clock.clearTimeout(memoryTimer);
        memoryTimer = null;
      }
    },
  };
}
