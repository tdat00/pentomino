// @ts-check
// The derived display rating (design §7.7; D27): a puzzle whose stored rating was made on an older scale
// (`difficulty-v2`, `difficulty-v1`) is shown with a rating made again on today's scale, with the original in a note.
// This module holds the rules the Player and the Generator share: which puzzles are rated again, the key of a derived
// rating, the scheduler of the background requests and what a view shows. The stored claim is never changed. No DOM and
// no storage.

import { MODEL } from '../engine/difficulty.js';
import { PoolError, isAbortError } from './worker-pool.js';

/**
 * @typedef {{ status: 'pending' } | { status: 'rated', rating: any } | { status: 'failed', code: string }
 *   | { status: 'unavailable' }} DisplayEntry The state of one derived rating.
 */

/**
 * @typedef {object} DisplayWish
 * @property {string} key `displayRatingKey` of the puzzle.
 * @property {{ boardRows: string[], pieces: object[], clues: object[] }} payload The `rate` task payload.
 */

/** @typedef {{ t: (key: string, args?: Record<string, unknown>) => string, levelLabel: (id: string) => string }} DisplayText */

const DEFAULT_LIMIT = 1000;

/**
 * Whether a stored claim is shown with a derived rating: exactly the claims of an older model. A puzzle without a
 * claim is not rated, a `difficulty-v3` claim already is on today's scale, and an unknown model is left alone.
 * @param {unknown} claim
 * @returns {boolean}
 */
export function needsDisplayRating(claim) {
  if (typeof claim !== 'object' || claim === null) {
    return false;
  }
  const { model } = /** @type {{ model?: unknown }} */ (claim);
  return model === 'difficulty-v2' || model === 'difficulty-v1';
}

/**
 * Two equal puzzles share one derived rating, and a later model gets new keys.
 * @param {string} fingerprint `progressFingerprint` of the puzzle.
 * @returns {string}
 */
export function displayRatingKey(fingerprint) {
  return `${fingerprint}|${MODEL}`;
}

/**
 * Rates the wished puzzles one request at a time, in the order of the wishes, and keeps the answers.
 * @param {{ submit: (kind: 'rate', payload: object, o: { signal: AbortSignal }) => Promise<unknown>,
 *   onChange: (key: string, entry: DisplayEntry | undefined) => void, limit?: number }} options `submit` is the
 *   app's auxiliary request (design §8.1); `onChange` hears every entry that appears, changes or goes away (`undefined`).
 *   At most `limit` entries (default 1,000) are kept, so only the first `limit` wishes are heard.
 * @returns {{ want: (wishes: DisplayWish[]) => void, get: (key: string) => DisplayEntry | undefined, dispose: () => void }}
 */
export function createDisplayRatings(options) {
  const { submit, onChange } = options;
  const limit = Number.isFinite(options.limit) ? Math.max(1, Math.floor(/** @type {number} */ (options.limit))) : DEFAULT_LIMIT;
  /** In the order they were settled: the oldest first. @type {Map<string, DisplayEntry>} */
  const entries = new Map();
  /** @type {DisplayWish[]} */
  let wishes = [];
  let wished = /** @type {Set<string>} */ (new Set());
  /** The request in flight; a settle of any other object is a late one and is dropped. */
  let flight = /** @type {{ key: string, payload: object, controller: AbortController } | null} */ (null);
  let disposed = false;

  /** @param {string} key @param {DisplayEntry} entry */
  function put(key, entry) {
    entries.delete(key);
    entries.set(key, entry);
    onChange(key, entry);
  }

  /** @param {string} key */
  function drop(key) {
    if (entries.delete(key)) {
      onChange(key, undefined);
    }
  }

  /** Removes the oldest settled entries that no wish needs, so that a wished puzzle is never requested again for room. */
  function trim() {
    for (const [key, entry] of [...entries]) {
      if (entries.size <= limit) {
        return;
      }
      if (entry.status !== 'pending' && !wished.has(key)) {
        drop(key);
      }
    }
  }

  /** @param {NonNullable<typeof flight>} request */
  function send(request) {
    /** @type {Promise<unknown>} */
    let reply;
    try {
      reply = Promise.resolve(submit('rate', request.payload, { signal: request.controller.signal }));
    } catch (error) {
      reply = Promise.reject(error);
    }
    reply.then((value) => settle(request, { status: 'rated', rating: value }), (error) => fail(request, error));
  }

  function pump() {
    if (disposed || flight !== null) {
      return;
    }
    const next = wishes.find((wish) => !entries.has(wish.key));
    if (next === undefined) {
      return;
    }
    const request = { key: next.key, payload: next.payload, controller: new AbortController() };
    flight = request;
    put(next.key, { status: 'pending' });
    trim();
    // A listener of `onChange` may have changed the wishes or disposed the scheduler.
    if (flight === request) {
      send(request);
    }
  }

  /** @param {NonNullable<typeof flight>} request @param {DisplayEntry} entry */
  function settle(request, entry) {
    if (disposed || flight !== request) {
      return;
    }
    flight = null;
    put(request.key, entry);
    trim();
    pump();
  }

  /** @param {NonNullable<typeof flight>} request @param {unknown} error */
  function fail(request, error) {
    if (disposed || flight !== request) {
      return;
    }
    if (isAbortError(error)) {
      if (error.reason === 'cancelled') {
        // A new verification or generation took the request; it waits for that main request again.
        send(request);
        return;
      }
      if (error.reason === 'closed') {
        flight = null;
        drop(request.key);
        return;
      }
    }
    if (error instanceof PoolError && error.code === 'worker-unavailable') {
      flight = null;
      put(request.key, { status: 'unavailable' });
      for (const wish of wishes) {
        if (!entries.has(wish.key)) {
          put(wish.key, { status: 'unavailable' });
        }
      }
      trim();
      return;
    }
    const code = /** @type {{ code?: unknown } | null} */ (error)?.code;
    settle(request, { status: 'failed', code: typeof code === 'string' ? code : 'error' });
  }

  return {
    want(next) {
      if (disposed) {
        return;
      }
      /** @type {DisplayWish[]} */
      const list = [];
      const keys = new Set();
      for (const wish of next) {
        if (list.length < limit && !keys.has(wish.key)) {
          keys.add(wish.key);
          list.push(wish);
        }
      }
      wishes = list;
      wished = keys;
      if (flight !== null && !keys.has(flight.key)) {
        const { key, controller } = flight;
        flight = null;
        controller.abort();
        drop(key);
      }
      pump();
    },

    get: (key) => entries.get(key),

    dispose() {
      disposed = true;
      const request = flight;
      flight = null;
      wishes = [];
      wished = new Set();
      entries.clear();
      request?.controller.abort();
    },
  };
}

/**
 * The score as a rating line shows it: rounded, with "+" when the rating is capped.
 * @param {{ score?: unknown, saturated?: unknown }} rating
 * @returns {string}
 */
function shownScore(rating) {
  const score = typeof rating.score === 'number' && Number.isFinite(rating.score) ? Math.round(rating.score) : 0;
  return `${score}${rating.saturated === true ? '+' : ''}`;
}

/**
 * @param {{ metrics?: unknown }} rating A rating with `censored: true`.
 * @param {DisplayText} text
 * @returns {string}
 */
function estimateNote(rating, text) {
  const metrics = /** @type {{ censusUndecided?: unknown } | null | undefined} */ (rating.metrics);
  const count = metrics?.censusUndecided;
  return typeof count === 'number' && Number.isFinite(count)
    ? text.t('rating.note.estimate', { count })
    : text.t('rating.note.estimateShort');
}

/**
 * @param {unknown} rating
 * @returns {boolean} Whether a worker's reply can be drawn as a rating line.
 */
function isRating(rating) {
  const { score, level } = /** @type {{ score?: unknown, level?: unknown }} */ (rating ?? {});
  return typeof score === 'number' && Number.isFinite(score) && typeof level === 'string';
}

/**
 * What a view shows for a puzzle: the rating to draw and the notes to write after it.
 * @param {any} claim The stored claim of the puzzle.
 * @param {DisplayEntry | undefined} entry The scheduler's entry for the puzzle's key.
 * @param {DisplayText} text
 * @returns {{ rating: any, notes: string[] } | null} null: no rating line at all.
 */
export function ratingDisplay(claim, entry, text) {
  if (typeof claim !== 'object' || claim === null) {
    return null;
  }
  /** @type {string[]} */
  const notes = [];
  if (!needsDisplayRating(claim)) {
    if (claim.model === 'difficulty-v3' && claim.censored === true) {
      notes.push(estimateNote(claim, text));
    }
    return { rating: claim, notes };
  }
  if (entry?.status === 'rated' && isRating(entry.rating)) {
    notes.push(text.t('rating.note.rerated', {
      level: text.levelLabel(claim.level), score: shownScore(claim), model: claim.model,
    }));
    if (entry.rating.censored === true) {
      notes.push(estimateNote(entry.rating, text));
    }
    return { rating: entry.rating, notes };
  }
  if (entry !== undefined && entry.status !== 'pending') {
    notes.push(text.t('rating.note.notRerated'));
  }
  return { rating: claim, notes };
}
