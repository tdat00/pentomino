// @ts-check
// The response guard (plan §4.5, R3; R9): one timer bounds a whole operation from its origin, pack assembly included.
// At the bound it cancels the client and settles the pending phase: a set phase with a typed failure, a batch phase
// with the client's consumed, validated prefix, without waiting for a held assembly. A phase's own late completion is
// ignored, so only one terminal result is delivered. It touches no DOM and no Node API.

import { DEADLINE } from '../engine/gen-v4.js';

/** @typedef {import('./generation-client.js').BatchJobResult} BatchJobResult */
/** @typedef {import('./generation-client.js').SetJobResult} SetJobResult */
/** @typedef {import('./generation-client.js').RequestScope} RequestScope */
/** @typedef {import('./worker-pool.js').Clock} Clock */
/** @typedef {{ cancel: () => void, prefixSnapshot: () => BatchJobResult | null }} GuardedClient */

/**
 * @typedef {object} ResponseGuard
 * @property {(promise: Promise<SetJobResult>) => Promise<SetJobResult>} set
 * @property {(promise: Promise<BatchJobResult>) => Promise<BatchJobResult>} batch
 * @property {() => void} clear
 * @property {() => boolean} fired
 */

/**
 * @typedef {object} Phase
 * @property {'set' | 'batch'} kind
 * @property {(value: any) => void} resolve
 * @property {(error: unknown) => void} reject
 */

/** @type {() => SetJobResult} */
const boundFailure = () => /** @type {SetJobResult} */ ({ status: 'failed', reason: 'response-bound', failures: {} });

/**
 * @param {{ clock: Clock, client: GuardedClient, origin: number, boundMs?: number }} args
 * @returns {ResponseGuard}
 */
export function createResponseGuard({ clock, client, origin, boundMs = DEADLINE.responseBoundMs - DEADLINE.hostMarginMs }) {
  let hasFired = false;
  /** @type {unknown} */
  let timer = null;
  /** @type {Phase | null} */
  let pending = null;

  const cancelClient = () => {
    try {
      client.cancel();
    } catch {
      // a failing cancel must not stop the bound result
    }
  };

  /**
   * @param {Phase} phase
   * @returns {void}
   */
  const settleWithBound = (phase) => {
    if (phase.kind === 'set') {
      phase.resolve(boundFailure());
      return;
    }
    try {
      const snapshot = client.prefixSnapshot();
      if (snapshot === null) {
        phase.reject(new Error('the response bound found no batch prefix'));
      } else {
        phase.resolve(snapshot);
      }
    } catch (e) {
      phase.reject(e);
    }
  };

  const fire = () => {
    timer = null;
    hasFired = true;
    cancelClient();
    const phase = pending;
    if (phase !== null) {
      pending = null;
      settleWithBound(phase);
    }
  };

  timer = clock.setTimeout(fire, Math.max(0, origin + boundMs - clock.now()));

  /**
   * @param {'set' | 'batch'} kind
   * @param {Promise<any>} promise
   * @returns {Promise<any>}
   */
  const phaseOf = (kind, promise) => {
    if (pending !== null) {
      throw new Error('a response-guard phase is already pending');
    }
    return new Promise((resolve, reject) => {
      /** @type {Phase} */
      const phase = { kind, resolve, reject };
      if (hasFired) {
        cancelClient();
        settleWithBound(phase);
        promise.then(() => {}, () => {});
        return;
      }
      pending = phase;
      promise.then((value) => {
        if (pending === phase) {
          pending = null;
          resolve(value);
        }
      }, (error) => {
        if (pending === phase) {
          pending = null;
          reject(error);
        }
      });
    });
  };

  return {
    set: (promise) => phaseOf('set', promise),
    batch: (promise) => phaseOf('batch', promise),
    clear() {
      if (timer !== null) {
        clock.clearTimeout(timer);
        timer = null;
      }
    },
    fired: () => hasFired,
  };
}

/**
 * Runs a set request, then the batch that follows it, under the lifetime rule of R9.
 * With a `scope` (an automatic `gen-v4` request) one guard from `scope.origin` covers both phases and lives until the
 * whole operation ends. Without one (a legacy route) each request gets its own guard, cleared when it settles, before
 * the following request creates its own.
 * @param {{ clock: Clock, client: GuardedClient, scope?: RequestScope | null }} args
 * @param {() => Promise<SetJobResult>} runSet
 * @param {(set: SetJobResult) => Promise<BatchJobResult> | null} runBatch Receives every settled set result, the
 *   guard's typed failure included; null when no batch follows.
 * @returns {Promise<{ set: SetJobResult, batch: BatchJobResult | null }>}
 */
export async function guardSetThenBatch({ clock, client, scope }, runSet, runBatch) {
  if (scope !== undefined && scope !== null) {
    const guard = createResponseGuard({ clock, client, origin: scope.origin });
    try {
      const set = await guard.set(runSet());
      const next = runBatch(set);
      const batch = next === null ? null : await guard.batch(next);
      return { set, batch };
    } finally {
      guard.clear();
    }
  }
  const setGuard = createResponseGuard({ clock, client, origin: clock.now() });
  /** @type {SetJobResult} */
  let set;
  try {
    set = await setGuard.set(runSet());
  } finally {
    setGuard.clear();
  }
  const origin = clock.now();
  const next = runBatch(set);
  if (next === null) {
    return { set, batch: null };
  }
  const batchGuard = createResponseGuard({ clock, client, origin });
  try {
    return { set, batch: await batchGuard.batch(next) };
  } finally {
    batchGuard.clear();
  }
}
