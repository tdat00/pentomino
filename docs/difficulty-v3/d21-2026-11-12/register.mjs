// D21 measurement preload (read-only observer; no product file is changed).
// Wraps `selectClues` of the loaded tree when `core/engine/clues.js` is loaded and appends one JSON line per
// call (and per driver event) to the file named by D21_OUT. Use: node --import <this file> <script>.
// D21_ROOT (default: the working directory) is the tree whose `core/engine/keys.js` computes the clue keys.
import { createHash } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(process.env.D21_ROOT ?? '.');
const out = process.env.D21_OUT;
const { clueKey } = await import(pathToFileURL(join(root, 'core', 'engine', 'keys.js')).href);
const { rate: defaultRate } = await import(pathToFileURL(join(root, 'core', 'engine', 'difficulty.js')).href);

const MARKER = 'export function selectClues(ctx) {';

registerHooks({
  load(url, context, nextLoad) {
    const result = nextLoad(url, context);
    if (!url.endsWith('/core/engine/clues.js')) {
      return result;
    }
    const source = typeof result.source === 'string' ? result.source : Buffer.from(result.source).toString('utf8');
    if (!source.includes(MARKER)) {
      throw new Error('D21 hook: selectClues header not found');
    }
    const wrapper = `${MARKER}\n  const tap = globalThis.__d21Tap;\n`
      + '  return tap === undefined ? selectCluesInner(ctx) : tap(ctx, selectCluesInner);\n}\n\n'
      + 'function selectCluesInner(ctx) {';
    return { ...result, source: source.replace(MARKER, wrapper) };
  },
});

/** @param {object} record */
const write = (record) => {
  if (out !== undefined) {
    appendFileSync(out, `${JSON.stringify(record)}\r\n`);
  }
};

globalThis.__d21Tag = 'untagged';
globalThis.__d21Event = (/** @type {object} */ event) => write({ kind: 'event', tag: globalThis.__d21Tag, ...event });

globalThis.__d21Tap = (/** @type {any} */ ctx, /** @type {(c: any) => any} */ inner) => {
  const startedAt = performance.now();
  let last = startedAt;
  const ratings = [];
  const keys = [];
  // Ratings made through the `rate` seam that are not followed by `onRate` are repair ratings (`require` mode);
  // trees without the seam ignore the wrapper and record no repairs.
  const rateInner = ctx.rate ?? defaultRate;
  const repairs = [];
  const wrapped = {
    ...ctx,
    rate: (/** @type {any} */ b, /** @type {any} */ p, /** @type {any[]} */ clues, /** @type {any} */ w) => {
      const result = rateInner(b, p, clues, w);
      repairs.push({ c: clues.length, s: result.score, after: ratings.length });
      return result;
    },
    onRate: (/** @type {any[]} */ clues, /** @type {any} */ rating) => {
      repairs.pop();
      const now = performance.now();
      const m = rating.metrics ?? {};
      ratings.push({
        s: rating.score, c: clues.length, u: m.U, b: m.B, bt: m.branchTrials, sat: rating.saturated, t: now - last,
      });
      keys.push(clueKey(ctx.board, ctx.pieces, clues));
      last = now;
      ctx.onRate?.(clues, rating);
    },
  };
  const result = inner(wrapped);
  const ms = performance.now() - startedAt;
  const distinct = [...new Set(keys)].sort();
  ratings.forEach((r, i) => {
    r.kr = distinct.indexOf(keys[i]);
    r.h = createHash('sha1').update(keys[i]).digest('hex').slice(0, 10);
  });
  /** @type {any} */
  let summary;
  if (result.ok) {
    const key = clueKey(ctx.board, ctx.pieces, result.clues);
    const found = keys.indexOf(key);
    summary = {
      ok: true, s: result.rating.score, n: result.clues.length, ri: found < 0 ? null : found + 1,
      cert: result.certificate?.status ?? null, h: createHash('sha1').update(key).digest('hex').slice(0, 10),
    };
  } else {
    summary = { ok: false, reason: result.reason };
  }
  write({
    kind: 'call',
    tag: globalThis.__d21Tag,
    mode: ctx.uniqueness,
    K: ctx.pieces.length,
    target: { min: ctx.target.min, max: ctx.target.max, share: ctx.target.share },
    excluded: ctx.excludeClueKeys.size,
    ms: Math.round(ms * 10) / 10,
    ratings: ratings.map((r) => ({ ...r, t: Math.round(r.t * 10) / 10 })),
    repairs,
    result: summary,
  });
  return result;
};
