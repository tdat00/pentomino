// D21-V3 certification (MP09d2; cross-review TP03, TP14): for every `require`-mode call with a finite band of the
// no-stall baseline (split.mjs's require/ files), the final result of the same call rerun with STALL_LIMIT 12 and 16
// (rerun.mjs). A rerun is identical to the baseline up to the first rating at which the stall rule holds on the
// baseline sequence (the rule of simulate() in ../d21-2026-11-12/simulate.mjs); there the rule fires and hands the
// candidates to the uniqueness repair. A fired call keeps its final result (same), loses the central half (lost: the
// baseline result lies in the central half of its band and the rerun's result does not, or the rerun has none), or
// changes it otherwise (changed: for example another clue set that is still central, or a change of a result that
// was not central). A call whose rerun differs from the baseline before the rule fires (or at all, when it never
// fires) is not reproducible: the decision then stops. ASCII Markdown on stdout; exit 1 when a baseline call has no
// rerun or a rerun has no baseline.
//   node ./<this folder>/certify.mjs --base <require files...> --n12 <file> --n16 <file>
//   node ./<this folder>/certify.mjs --self-test   (synthetic calls; exit 1 on a wrong classification)
import { readFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const at = (/** @type {string} */ flag) => argv.indexOf(flag);
/** @param {string[]} files @returns {Map<string, any>} the call lines by tag */
function callsOf(files) {
  /** @type {Map<string, any>} */
  const map = new Map();
  for (const file of files) {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      if (line.trim() === '') {
        continue;
      }
      const c = JSON.parse(line);
      if (c.kind !== 'call') {
        continue;
      }
      if (map.has(c.tag)) {
        throw new Error(`${file}: the tag ${c.tag} occurs twice`);
      }
      map.set(c.tag, c);
    }
  }
  return map;
}
/**
 * The number of ratings after which the stall rule with limit n first holds on a recorded sequence, or null when it
 * never holds (the counting of simulate() in ../d21-2026-11-12/simulate.mjs and of RES-15a in clues.js).
 * @param {any} call @param {number} n
 */
function fireAt(call, n) {
  const { min, max } = call.target;
  const centre = (min + max) / 2;
  const half = (max - min) / 4;
  let best = Infinity;
  let stall = 0;
  let below = false;
  let above = false;
  let central = false;
  for (let i = 0; i < call.ratings.length; i += 1) {
    const s = call.ratings[i].s;
    if (s < centre - half) {
      below = true;
    } else if (s > centre + half) {
      above = true;
    } else {
      central = true;
    }
    let improved = false;
    if (s >= min && s < max && Math.abs(s - centre) < best) {
      improved = true;
      best = Math.abs(s - centre);
    }
    stall = improved ? 0 : stall + 1;
    if (best !== Infinity && !central && !(below && above) && stall >= n) {
      return i + 1;
    }
  }
  return null;
}
/** @param {any} c @returns {boolean} true when the call has a result in the central half of its band */
const central = (c) => c.result.ok
  && Math.abs(c.result.s - (c.target.min + c.target.max) / 2) <= (c.target.max - c.target.min) / 4;
/** @param {any} a @param {any} b */
const sameResult = (a, b) => (a.result.ok
  ? b.result.ok && a.result.h === b.result.h && a.result.s === b.result.s
  : !b.result.ok && a.result.reason === b.result.reason);
/** @param {any} a @param {any} b @param {number} k */
const samePrefix = (a, b, k) => b.ratings.length >= k
  && a.ratings.slice(0, k).every((/** @type {any} */ r, /** @type {number} */ i) => r.s === b.ratings[i].s && r.h === b.ratings[i].h);
/** @param {any} c */
const show = (c) => (c.result.ok ? `ok ${c.result.s} (${c.result.n} clues, ${c.result.h})` : c.result.reason);
/**
 * @param {any} b the baseline call @param {any} x its rerun @param {number} n the stall limit of the rerun
 * @returns {{ kind: 'none' | 'same' | 'lost' | 'changed' | 'irreproducible', stop: number | null, verdict: string }}
 */
function classify(b, x, n) {
  const stop = fireAt(b, n);
  if (stop === null) {
    return x.ratings.length === b.ratings.length && samePrefix(b, x, b.ratings.length) && sameResult(b, x)
      ? { kind: 'none', stop, verdict: '' }
      : { kind: 'irreproducible', stop, verdict: 'NOT REPRODUCIBLE: the rule never fires on the baseline sequence' };
  }
  if (!samePrefix(b, x, stop)) {
    return { kind: 'irreproducible', stop, verdict: `NOT REPRODUCIBLE: the rerun differs before rating ${stop}` };
  }
  if (sameResult(b, x)) {
    return { kind: 'same', stop, verdict: '' };
  }
  if (central(b) && !central(x)) {
    return { kind: 'lost', stop, verdict: `LOST CENTRAL: fired after rating ${stop}` };
  }
  return { kind: 'changed', stop, verdict: `changed: fired after rating ${stop}` };
}

function selfTest() {
  // Hard band [17, 25): centre 21, central half [19, 23]. Thirteen raw ratings of 18 (one-sided, nearest 3 from the
  // first one), then a central 21: with N = 12 the rule fires after rating 13; with N = 16 it never fires.
  const target = { min: 17, max: 25, share: 0.4 };
  /** @param {number[]} scores @param {string} p */
  const seq = (scores, p) => scores.map((s, i) => ({ s, c: 5, h: `${p}${i}` }));
  const base = { kind: 'call', tag: 'self', mode: 'require', target, ratings: seq([...Array(13).fill(18), 21], 'r'),
    result: { ok: true, s: 21, n: 6, h: 'base21' } };
  /** @param {any} result @param {any[]} [ratings] */
  const rerun = (result, ratings = base.ratings.slice(0, 13)) => ({ ...base, ratings, result });
  const edge = { ...base, ratings: seq(Array(13).fill(18), 'r'), result: { ok: true, s: 18, n: 5, h: 'r0' } };
  const early = { ...base, ratings: seq([18, 21], 'q'), result: { ok: true, s: 21, n: 6, h: 'q1' } };
  const cases = /** @type {[string, number, any, any, string][]} */ ([
    ['a different central puzzle at 21', 12, base, rerun({ ok: true, s: 21, n: 7, h: 'other21' }), 'changed'],
    ['a different central puzzle at 20', 12, base, rerun({ ok: true, s: 20, n: 6, h: 'other20' }), 'changed'],
    ['a loss to 18', 12, base, rerun({ ok: true, s: 18, n: 5, h: 'r0' }), 'lost'],
    ['no result', 12, base, rerun({ ok: false, reason: 'uniqueness-not-proved' }), 'lost'],
    ['the same result', 12, base, rerun({ ...base.result }), 'same'],
    ['a rerun that differs before the firing rating', 12, base,
      rerun({ ok: true, s: 21, n: 7, h: 'other21' }, base.ratings.map((r, i) => (i === 4 ? { ...r, h: 'zz' } : r)).slice(0, 13)),
      'irreproducible'],
    ['a change of a result that was not central', 12, edge, { ...edge, result: { ok: true, s: 17, n: 4, h: 'x' } }, 'changed'],
    ['never fires (N = 16), identical rerun', 16, base, { ...base }, 'none'],
    ['never fires (N = 16), another result', 16, base, { ...base, result: { ok: true, s: 21, n: 7, h: 'other21' } },
      'irreproducible'],
    ['never fires (a central rating), identical rerun', 12, early, { ...early }, 'none'],
  ]);
  let wrong = 0;
  for (const [name, n, b, x, want] of cases) {
    const got = classify(b, x, n).kind;
    console.log(`${got === want ? 'ok' : 'WRONG'} - ${name}: ${got}${got === want ? '' : ` (expected ${want})`}`);
    wrong += got === want ? 0 : 1;
  }
  console.log(`${cases.length - wrong} of ${cases.length} synthetic cases classified as expected`);
  process.exitCode = wrong === 0 ? 0 : 1;
}

function main() {
  if (at('--base') !== 0 || at('--n12') < 2 || at('--n16') !== at('--n12') + 2 || argv.length !== at('--n16') + 2) {
    throw new Error('usage: certify.mjs --base <require files...> --n12 <file> --n16 <file> | --self-test');
  }
  const base = callsOf(argv.slice(1, at('--n12')));
  const tags = [...base.keys()].filter((t) => typeof base.get(t).target.max === 'number' && base.get(t).mode === 'require');
  let failed = false;
  const rows = [];
  const notes = [];
  for (const [n, file] of [[12, argv[at('--n12') + 1]], [16, argv[at('--n16') + 1]]]) {
    const rerun = callsOf([String(file)]);
    const missing = tags.filter((t) => !rerun.has(t));
    const extra = [...rerun.keys()].filter((t) => !tags.includes(t));
    if (missing.length > 0 || extra.length > 0) {
      notes.push(`- N=${n}: ${missing.length} baseline calls without a rerun (${missing.slice(0, 5).join(', ')}), `
        + `${extra.length} reruns without a baseline (${extra.slice(0, 5).join(', ')})`);
      failed = true;
    }
    const r = { compared: 0, fired: 0, same: 0, lost: 0, changed: 0, irreproducible: 0 };
    for (const tag of tags.filter((t) => rerun.has(t))) {
      const b = base.get(tag);
      const x = rerun.get(tag);
      const { kind, stop, verdict } = classify(b, x, Number(n));
      r.compared += 1;
      r.fired += stop === null ? 0 : 1;
      if (kind !== 'none') {
        r[kind] += 1;
      }
      if (verdict !== '') {
        notes.push(`- N=${n} ${tag}: baseline ${show(b)} after ${b.ratings.length} rated; rerun ${show(x)} after `
          + `${x.ratings.length} rated (${verdict})`);
      }
    }
    rows.push(`| ${n} | ${r.compared} | ${r.fired} | ${r.same} | ${r.lost} | ${r.changed} | ${r.irreproducible} |`);
  }
  console.log(`## Certification of the require-mode calls (${tags.length} with a finite band)`);
  console.log('| N | compared | fired | fired, same final result | lost central final result | other changed results | not reproducible |');
  console.log('|---|---|---|---|---|---|---|');
  for (const row of rows) {
    console.log(row);
  }
  for (const note of notes) {
    console.log(note);
  }
  process.exitCode = failed ? 1 : 0;
}

if (argv.length === 1 && argv[0] === '--self-test') {
  selfTest();
} else {
  main();
}
