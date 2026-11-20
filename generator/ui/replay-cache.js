// @ts-check
// The saved replays of Generation steps (design §6.12, §9.6): the steps of a puzzle are made in the background right
// after the puzzle is generated and kept in the browser's storage, by a key made from everything the replay reads, so
// that a puzzle is not replayed again, also after a reload. A change to the puzzle, its set, its origin records or the
// generator's version makes another key: a saved replay is never shown for something it was not made from.

import { boardToRows } from '../../core/engine/board.js';
import { ALGO_ID, APP_VERSION } from '../../core/engine/version.js';
import { PoolAbortError } from '../../core/browser/worker-pool.js';
import { presented } from './replay-model.js';

/** @typedef {import('./replay-model.js').ReplaySource} ReplaySource */
/** @typedef {import('../../core/engine/replay.js').ReplayResult} ReplayResult */

/**
 * @typedef {object} ReplayCache
 * @property {(source: ReplaySource) => ReplayResult | null} load The saved result of the source, or null.
 * @property {(source: ReplaySource, result: ReplayResult) => void} save Keeps a result; a refusal is ignored.
 * @property {(source: ReplaySource) => boolean} has Whether a result is saved for the source (it is not read).
 * @property {(source: ReplaySource) => void} prefetch Makes the replay of a source in the background and saves it, unless
 *   it is saved or already asked for.
 * @property {(source: ReplaySource, signal: AbortSignal) => Promise<ReplayResult>} run The replay of a source for the
 *   section: it waits for a prefetch of the same source instead of making the replay twice.
 * @property {() => void} dispose Aborts the prefetches.
 */

/**
 * The text of a value with sorted keys, without undefined or null properties: the same text before and after the
 * value went through the saved state.
 * @param {unknown} value
 * @returns {string}
 */
function canonical(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => (item === undefined ? 'null' : canonical(item))).join(',')}]`;
  }
  if (typeof value === 'object' && value !== null) {
    const record = /** @type {Record<string, unknown>} */ (value);
    return `{${Object.keys(record).sort()
      .filter((name) => record[name] !== undefined && record[name] !== null)
      .map((name) => `${JSON.stringify(name)}:${canonical(record[name])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

/**
 * cyrb53, a 53-bit hash of a text.
 * @param {string} text
 * @param {number} seed
 * @returns {number}
 */
function hash53(text, seed) {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/**
 * The key is made of what the replay request carries (the generation client's `replayPuzzle`) and nothing else, so it
 * does not change when a certificate, a title or a display rating is added to the puzzle later.
 * @param {ReplaySource} source
 * @returns {string} The storage key of the source's replay: two hashes and the length of what they are made from.
 */
export function replayKeyOf(source) {
  const { set, puzzle } = source;
  const text = canonical([
    ALGO_ID, APP_VERSION, boardToRows(set.board), set.pieces, set.witness, set.carving, set.macroRegion,
    { id: puzzle.id, clues: puzzle.clues, solution: puzzle.solution, rating: puzzle.rating }, source.setOrigin, source.made,
  ]);
  return `r${hash53(text, 0).toString(36)}${hash53(text, 1).toString(36)}${text.length.toString(36)}`;
}

/**
 * @param {{ loadReplay?: (key: string) => unknown, saveReplay?: (key: string, result: unknown) => unknown,
 *   hasReplay?: (key: string) => boolean } | null | undefined} storage
 * @param {((source: ReplaySource, signal: AbortSignal) => Promise<ReplayResult>) | undefined} runner Makes a replay
 *   (the generation client's `replayPuzzle`); without it nothing is prefetched and `run` fails.
 * @returns {ReplayCache | undefined} Undefined when the storage keeps no replays (a scripted storage).
 */
export function createReplayCache(storage, runner) {
  if (storage === null || storage === undefined || typeof storage.loadReplay !== 'function' || typeof storage.saveReplay !== 'function') {
    return undefined;
  }
  const { loadReplay, saveReplay, hasReplay } = storage;
  /** @type {Map<string, { promise: Promise<ReplayResult> | null, controller: AbortController }>} */
  const inflight = new Map();
  /** Keys asked for once: a failed prefetch is not tried again by itself (the section's button does that). */
  const attempted = new Set();
  let disposed = false;

  /**
   * @param {ReplaySource} source
   * @param {ReplayResult} result
   */
  function save(source, result) {
    try {
      saveReplay.call(storage, replayKeyOf(source), result);
    } catch {
      // A cache that cannot be written costs only a new replay next time.
    }
  }

  /** @param {ReplaySource} source @returns {boolean} */
  function has(source) {
    try {
      const key = replayKeyOf(source);
      return typeof hasReplay === 'function' ? hasReplay.call(storage, key) === true : loadReplay.call(storage, key) !== null;
    } catch {
      return false;
    }
  }

  return {
    load(source) {
      try {
        return /** @type {ReplayResult | null} */ (loadReplay.call(storage, replayKeyOf(source)));
      } catch {
        return null;
      }
    },
    save,
    has,
    prefetch(source) {
      if (runner === undefined || disposed) {
        return;
      }
      const key = replayKeyOf(source);
      if (inflight.has(key) || attempted.has(key)) {
        return;
      }
      attempted.add(key);
      if (has(source)) {
        return;
      }
      const entry = { promise: /** @type {Promise<ReplayResult> | null} */ (null), controller: new AbortController() };
      inflight.set(key, entry);
      entry.promise = (async () => {
        await null;
        try {
          for (;;) {
            try {
              const result = await runner(source, entry.controller.signal);
              const shown = presented(result);
              if (shown !== null) {
                save(source, shown);
              }
              return result;
            } catch (error) {
              // A new generation began (this run's own signal is not aborted): ask again, the request waits for it to end.
              if (error instanceof PoolAbortError && error.reason === 'cancelled' && !entry.controller.signal.aborted && !disposed) {
                continue;
              }
              throw error;
            }
          }
        } finally {
          inflight.delete(key);
        }
      })();
      entry.promise.catch(() => {});
    },
    run(source, signal) {
      const entry = inflight.get(replayKeyOf(source));
      if (entry === undefined || entry.promise === null) {
        return /** @type {NonNullable<typeof runner>} */ (runner)(source, signal);
      }
      const waited = entry.promise;
      return new Promise((resolve, reject) => {
        if (signal.aborted) {
          reject(new PoolAbortError('cancelled'));
          return;
        }
        signal.addEventListener('abort', () => reject(new PoolAbortError('cancelled')), { once: true });
        waited.then(resolve, reject);
      });
    },
    dispose() {
      disposed = true;
      for (const { controller } of inflight.values()) {
        controller.abort();
      }
    },
  };
}
