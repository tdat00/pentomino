// D36 observer (MP09d2): the D21 observer (../d21-2026-11-12/register.mjs) plus, after each selectClues call line,
// one line { kind: 'spent', tag, capped, cappedWork }: the profiles of that call whose rating was unrateable
// (IncompleteRatingError, code 'rating-incomplete') and the work their searches spent. The stall stop stays on (the
// production rule). No product file is changed. Use: node --import <this file> <driver> ...
import { appendFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import '../d21-2026-11-12/register.mjs';

const root = resolve(process.env.D21_ROOT ?? '.');
const out = process.env.D21_OUT;
const { rate: defaultRate } = await import(pathToFileURL(join(root, 'core', 'engine', 'difficulty.js')).href);
const observe = globalThis.__d21Tap;

globalThis.__d21Tap = (/** @type {any} */ ctx, /** @type {(c: any) => any} */ inner) => {
  const rate = ctx.rate ?? defaultRate;
  let capped = 0;
  let cappedWork = 0;
  const counting = {
    ...ctx,
    rate: (/** @type {any} */ b, /** @type {any} */ p, /** @type {any[]} */ clues, /** @type {any} */ w) => {
      try {
        return rate(b, p, clues, w);
      } catch (e) {
        if (/** @type {any} */ (e)?.code === 'rating-incomplete') {
          capped += 1;
          cappedWork += /** @type {any} */ (e).counters?.work ?? 0;
        }
        throw e;
      }
    },
  };
  const result = observe(counting, inner);
  if (out !== undefined) {
    appendFileSync(out, `${JSON.stringify({ kind: 'spent', tag: globalThis.__d21Tag, capped, cappedWork })}\r\n`);
  }
  return result;
};
