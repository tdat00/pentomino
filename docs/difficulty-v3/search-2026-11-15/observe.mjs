// MP12b2 search observer (cross-review SP16, TP07): the D21 observer (../d21-2026-11-12/register.mjs) plus, after
// each selectClues call line, one line { kind: 'attempts', tag, list, finishes } with every rating attempt and every
// finish of the call, in order. No product file is changed: a load hook brackets the `finish` closure of
// core/engine/clues.js in memory, so repair ratings and repair outcomes are known, never inferred.
//   list: { ph, f, c, o, s, g, t, cc, w, ms } per rating attempt. ph: 'raw' (a search subset) or 'repair' (the
//     re-rating of a repaired set inside finish f; f is null for 'raw'); c: clues; o: 'rated' (a raw subset passed to
//     onRate, or a repair rating that passed AR1), 'refused' (Gproved 0 at Hard or above, AR1), 'capped' (the rating
//     threw IncompleteRatingError); s, g, t, cc: score, Gproved, deductionTier, censusComplete; w: metrics.work, or
//     counters.work of a capped rating; ms: the elapsed time of this rating alone (0.1 ms).
//   finishes: { f, c0, ri, o, c1, s, sel, ms } per finish (at most one per candidate). c0: clues of the candidate;
//     ri: its 1-based index among the raw rated subsets; o: 'raw' (any mode), 'unique' (require: already unique, the
//     raw subset is the result), 'repaired' (require: clues added, re-rated and accepted), 'not-unique' (the repair
//     gave up), 'capped' or 'refused' (the repair rating), 'rejected' (the repaired set left the band or has an
//     excluded key); c1, s: clues and score of the final result (null when none); sel: true for the finish whose
//     result the call returned (object identity); ms: the elapsed time of the finish (repair and re-rating).
// Use: node --import <this file> <driver>
import { appendFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import '../d21-2026-11-12/register.mjs';

const root = resolve(process.env.D21_ROOT ?? '.');
const out = process.env.D21_OUT;
const { rate: defaultRate } = await import(pathToFileURL(join(root, 'core', 'engine', 'difficulty.js')).href);
const { bandEdge } = await import(pathToFileURL(join(root, 'core', 'engine', 'levels.js')).href);
const observe = globalThis.__d21Tap;

const FINISH = '  const finish = (c) => {';
registerHooks({
  load(url, context, nextLoad) {
    const result = nextLoad(url, context);
    if (!url.endsWith('/core/engine/clues.js')) {
      return result;
    }
    const source = typeof result.source === 'string' ? result.source : Buffer.from(result.source).toString('utf8');
    if (source.split(FINISH).length !== 2) {
      throw new Error('MP12b2 observer: the finish closure of selectClues was not found exactly once');
    }
    globalThis.__mp12FinishHooked = true;
    const bracket = '  const finish = (c) => (globalThis.__mp12Finish === undefined ? finishInner(c)'
      + ' : globalThis.__mp12Finish(c, finishInner));\n  const finishInner = (c) => {';
    return { ...result, source: source.replace(FINISH, bracket) };
  },
});

/** @param {number} started */
const since = (started) => Math.round((performance.now() - started) * 10) / 10;

globalThis.__d21Tap = (/** @type {any} */ ctx, /** @type {(c: any) => any} */ inner) => {
  if (globalThis.__mp12FinishHooked !== true) {
    throw new Error('MP12b2 observer: core/engine/clues.js was loaded before the observer');
  }
  const rate = ctx.rate ?? defaultRate;
  const hardOrAbove = ctx.target.min >= bandEdge(3);
  /** @type {any[]} */
  const list = [];
  /** @type {any[]} */
  const finishes = [];
  /** @type {any[][]} the clue arrays passed to onRate, in order */
  const rated = [];
  /** @type {Map<any, any>} the result object of each accepted finish */
  const results = new Map();
  /** @type {any} */
  let current = null;
  const counting = {
    ...ctx,
    rate: (/** @type {any} */ b, /** @type {any} */ p, /** @type {any[]} */ clues, /** @type {any} */ w) => {
      const entry = {
        ph: current === null ? 'raw' : 'repair', f: current === null ? null : current.f, c: clues.length, o: 'pending',
        s: null, g: null, t: null, cc: null, w: null, ms: 0,
      };
      list.push(entry);
      const started = performance.now();
      try {
        const r = rate(b, p, clues, w);
        const m = r.metrics ?? {};
        Object.assign(entry, {
          s: r.score, g: m.Gproved ?? null, t: m.deductionTier ?? null, cc: m.censusComplete ?? null, w: m.work ?? null,
        });
        if (entry.ph === 'repair') {
          entry.o = hardOrAbove && entry.g === 0 ? 'refused' : 'rated';
        }
        return r;
      } catch (e) {
        entry.o = /** @type {any} */ (e)?.code === 'rating-incomplete' ? 'capped' : 'error';
        entry.w = /** @type {any} */ (e)?.counters?.work ?? null;
        throw e;
      } finally {
        entry.ms = since(started);
      }
    },
    onRate: (/** @type {any[]} */ clues, /** @type {any} */ rating) => {
      const last = list[list.length - 1];
      if (last !== undefined && last.ph === 'raw' && last.o === 'pending') {
        last.o = 'rated';
      }
      rated.push(clues);
      ctx.onRate?.(clues, rating);
    },
  };
  const finishTap = (/** @type {any} */ c, /** @type {(c: any) => any} */ finishInner) => {
    const entry = {
      f: finishes.length, c0: c.clues.length, ri: rated.indexOf(c.clues) + 1 || null, o: 'pending', c1: null, s: null,
      sel: false, ms: 0,
    };
    finishes.push(entry);
    const before = list.length;
    const started = performance.now();
    current = entry;
    /** @type {any} */
    let result;
    try {
      result = finishInner(c);
    } finally {
      current = null;
      entry.ms = since(started);
    }
    const inside = list.slice(before);
    if (result !== null) {
      entry.c1 = result.clues.length;
      entry.s = result.rating.score;
      entry.o = ctx.uniqueness === 'any' ? 'raw' : result.clues === c.clues ? 'unique' : 'repaired';
      results.set(entry, result);
    } else if (inside.length === 0) {
      entry.o = 'not-unique';
    } else {
      const last = inside[inside.length - 1];
      entry.o = last.o === 'capped' || last.o === 'refused' ? last.o : 'rejected';
    }
    return result;
  };
  globalThis.__mp12Finish = finishTap;
  /** @type {any} */
  let result;
  try {
    result = observe(counting, inner);
  } finally {
    globalThis.__mp12Finish = undefined;
  }
  for (const a of list) {
    if (a.o === 'pending') {
      a.o = 'refused';
    }
  }
  for (const f of finishes) {
    f.sel = results.get(f) === result;
  }
  if (out !== undefined) {
    appendFileSync(out, `${JSON.stringify({ kind: 'attempts', tag: globalThis.__d21Tag, list, finishes })}\r\n`);
  }
  return result;
};
