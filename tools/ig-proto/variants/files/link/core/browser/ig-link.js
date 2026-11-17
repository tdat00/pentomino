// @ts-check
// ig-proto, variant "link" (V4-T06): the batch linkage journal. This file exists only in a tree copy
// (tests/artifacts/ig-proto*/<tree>/core/browser/); no production file imports it. Without IG_LOG_DIR it writes
// nothing. Each line of `<row>.link.jsonl` is one JSON object appended at once, with the time it was written
// (`at`, ms since the epoch): `start`, then per candidate task `dispatch`, `await`, `complete`, `consume`, then
// `calibration` lines for the calibration puzzle, `discard` for every task the fold never consumed, and `end`.
// It observes only: it changes no dispatch, fold or result.
import { appendFileSync } from 'node:fs';

let batch = 0;
let lastAwait = '';
/** @type {Set<string>} */
const consumed = new Set();
const now = () => performance.timeOrigin + performance.now();

/** @param {object} line */
function write(line) {
  const env = globalThis.process?.env;
  if (env?.IG_LOG_DIR === undefined) {
    return;
  }
  appendFileSync(`${env.IG_LOG_DIR}/${env.IG_ROW ?? 'unrowed'}.link.jsonl`, `${JSON.stringify(line)}\n`);
}

/** @param {string} batchSeed @param {number} quantity */
export function igLinkStart(batchSeed, quantity) {
  batch += 1;
  lastAwait = '';
  consumed.clear();
  write({ t: 'link', ev: 'start', batch, batchSeed, quantity, at: now() });
}

/** @param {string} ev @param {Record<string, unknown>} data */
export function igLink(ev, data) {
  if (ev === 'await') {
    const k = `${data.slot}/${data.attempt}`;
    if (k === lastAwait) {
      return;
    }
    lastAwait = k;
  }
  if (ev === 'consume') {
    consumed.add(`${data.slot}/${data.attempt}`);
  }
  write({ t: 'link', ev, batch, ...data, at: now() });
}

/** @param {Map<string, { done: boolean }>} cache @param {string} status @param {string | undefined} reason @param {number} accepted */
export function igLinkEnd(cache, status, reason, accepted) {
  for (const [k, entry] of cache) {
    if (!consumed.has(k)) {
      const [slot, attempt] = k.split('/').map(Number);
      write({ t: 'link', ev: 'discard', batch, slot, attempt, done: entry.done, at: now() });
    }
  }
  write({ t: 'link', ev: 'end', batch, status, reason: reason ?? null, accepted, at: now() });
}
