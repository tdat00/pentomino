// @ts-check
// ig-proto, variants p1p5 and p1p5-main: PM3's prototype of P1 to P5 (IGP-01). This file exists only in a tree copy
// (tests/artifacts/ig-proto/tree/<variant>/core/engine/); no production file imports it. It has the contract of
// `selectClues` (clues.js) and keeps the contract's results: only the order and the kind of the ratings change.
//   P1  the clue count is located by sequential bracketing on one nested family of subsets (phase A);
//   P2  every probe is rated under a lowered main-work limit W (the screen) and a run that stayed within W has the
//       canonical rating (IG-P-Q01 (b)); a run above W is screen-capped and is never accepted;
//   P3  a screen-capped profile reads as "too few clues";
//   P4  the start count comes from a fitted table prior (IG.prior), else from K - U0;
//   P5  a call whose canonical ratings show no window ends at once (`no-window`); budgets are recorded, not enforced.
// IGP-03 adds IG.a3: in the set stage phase A bisects with three probes per round (variant p1p5-main-a3); with it off,
// and in every other stage, the code path is IGP-01's.
// Today's helpers are copied from clues.js with the line ranges named in their comments.
import { activeCount } from './board.js';
import { countRowLimit, makeUnique } from './clues.js';
import { IncompleteRatingError, inBand, measureV3, MODEL, rate, scoreV3 } from './difficulty.js';
import { IG } from './ig-params.js';
import { endCall, igPhase, recordRating, startCall } from './ig-log.js';
import { clueKey } from './keys.js';
import { bandEdge, levelForScore } from './levels.js';
import { BUDGETS, DEDUCE, SCORE } from './policy.js';
import { isValidLayout } from './tiling.js';

// clues.js:60-68.
const BEAM_WIDTH = 4;
const STALL_LIMIT = 12;
const SAMPLES_PER_COUNT = 4;
const COUNT_CHANGES = 8;
const MOVES_PER_MEMBER = 8;
const CENTRE_RESERVE = 16;

/** A final result found inside a nested helper: it unwinds to `igSelectProto`. */
class Final {
  /** @param {any} res */
  constructor(res) {
    this.res = res;
  }
}

/** @param {number} x @param {number} lo @param {number} hi @returns {number} */
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

/** clues.js:172-179 */
function bandDistance(/** @type {any} */ target, /** @type {any} */ r) {
  if (r.score < target.min) {
    return target.min - r.score;
  }
  return r.score >= target.max ? r.score - target.max + 1 : 0;
}

/** clues.js:184-190 */
function ranked(/** @type {any} */ target, /** @type {any[]} */ list) {
  const center = (target.min + target.max) / 2;
  return list.slice().sort((a, b) => bandDistance(target, a.rating) - bandDistance(target, b.rating)
    || Math.abs(a.rating.score - center) - Math.abs(b.rating.score - center)
    || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

/** clues.js:195-199 */
function noProvedGuess(/** @type {any} */ r) {
  const m = r.metrics;
  return typeof m === 'object' && m !== null && Object.hasOwn(m, 'Gproved') && m.Gproved === 0;
}

/** clues.js:559-562: clues in layout order. */
function sortLike(/** @type {any[]} */ layout, /** @type {any[]} */ clues) {
  const wanted = new Set(clues.map((c) => c.piece));
  return layout.filter((p) => wanted.has(p.piece));
}

/**
 * The order of a canonical re-rating (IG-P-Q01): by the distance of the count to the window count `wc`, then the
 * higher count, then probe order.
 * @param {{ count: number, n: number }[]} list
 * @param {number} wc
 * @returns {any[]}
 */
export function nearestFirst(list, wc) {
  return list.slice().sort((a, b) => Math.abs(a.count - wc) - Math.abs(b.count - wc) || b.count - a.count || a.n - b.n);
}

/**
 * The prior start count of a call: the test seam `ctx.igPrior`, else the table of IG.prior (P4), else null.
 * @param {any} ctx
 * @param {number} K
 * @returns {number | null}
 */
function priorCount(ctx, K) {
  if (ctx.igPrior !== undefined) {
    return ctx.igPrior === null ? null : clamp(ctx.igPrior, 1, K - 2);
  }
  const cell = IG.prior?.[`${ctx.target.id}@${activeCount(ctx.board)}`];
  return cell === undefined ? null : clamp(Math.round(cell.share * K), 1, K - 2);
}

/**
 * Selects a subset of the witness whose measured score lies in the target band (the contract of `selectClues`).
 * Test seams (self-test only): `ctx.igScreen(clues, W)` and `ctx.igCanonical(clues)` replace the screened and the
 * canonical rating, `ctx.igPrior` the table prior, `ctx.igW` the screen limit of the call.
 * @param {any} ctx
 * @returns {any}
 */
export function igSelectProto(ctx) {
  const K = ctx.pieces.length;
  const W = ctx.igW ?? IG.W[ctx.target.id] ?? IG.W.default;
  const call = startCall(ctx, { W, priorCount: K < 3 ? null : priorCount(ctx, K) });
  const loc = {
    c0: null, prior: call.priorCount, probes: 0, result: null, hit: null, hiBelow: null, loAbove: null, wc: null,
    noWindowProof: null, rescue: /** @type {{ count: number, side: string, kind: string }[]} */ ([]),
  };
  call.locate = loc;
  /** @type {any} */
  let logged = null;
  /** @type {any} */
  let res;
  try {
    res = search(ctx, call, loc, W, call.priorCount, (r) => {
      logged = r;
    });
  } catch (e) {
    if (!(e instanceof Final)) {
      endCall(call, e);
      throw e;
    }
    res = e.res;
  }
  endCall(call, logged ?? res);
  return res;
}

/**
 * @param {any} ctx
 * @param {import('./ig-log.js').Call} call
 * @param {any} loc The locate summary written on the `end` line.
 * @param {number} W
 * @param {number | null} prior
 * @param {(res: any) => void} markNoWindow Sets the journaled result of a call that ends with `no-window`.
 * @returns {any}
 */
function search(ctx, call, loc, W, prior, markNoWindow) {
  const { board, pieces, layout, target, rng, uniqueness, excludeClueKeys, ws, onRate } = ctx;
  const K = pieces.length;
  if (K < 3) {
    throw new RangeError('clue selection needs at least three pieces');
  }
  if (!isValidLayout(board, pieces, layout)) {
    throw new RangeError('layout is not a complete valid arrangement of the pieces');
  }
  if (IG.rerate !== 'end') {
    throw new Error('ig-select-proto: the window re-rating variant is deferred (IG.rerate must be end)');
  }
  const useA3 = IG.a3 === true && ctx.igStage === 'set';
  if (useA3) {
    loc.rounds = [];
  }
  const limit = BUDGETS.clueSubsets;
  const rowLimit = countRowLimit(board);
  const screened = W < DEDUCE.work;
  const rerateMax = IG.rerateMax;
  const refuseUnproved = target.min >= bandEdge(3);
  const finite = Number.isFinite(target.max);
  const centre = finite ? (target.min + target.max) / 2 : 0;
  const halfWidth = finite ? (target.max - target.min) / 4 : 0;
  const bandCentre = finite ? centre : target.min;

  /** @param {any[]} clues */
  const rateCanonical = (clues) => (ctx.igCanonical !== undefined
    ? ctx.igCanonical(clues) : (ctx.rate ?? rate)(board, pieces, clues, ws));
  /** @param {any[]} clues The screened rating: `rate()` built under the lowered main-work limit. */
  const rateScreen = (clues) => {
    if (ctx.igScreen !== undefined) {
      return ctx.igScreen(clues, W);
    }
    if (!screened) {
      return rateCanonical(clues);
    }
    const { metrics } = measureV3(board, pieces, clues, ws, { deduce: { ...DEDUCE, work: W }, dlx: SCORE.caps });
    const value = scoreV3(metrics);
    return {
      model: MODEL, score: value, level: levelForScore(value).id, saturated: false,
      ...(metrics.censusComplete ? {} : { censored: true }), metrics,
    };
  };
  /** @param {number} score @returns {'below' | 'in' | 'above'} */
  const sideOfScore = (score) => (score < target.min ? 'below' : score >= target.max ? 'above' : 'in');

  /** @type {Set<string>} */
  const tried = new Set();
  /** @type {any[]} */
  const rated = [];
  /** @type {any[]} */
  const inBandList = [];
  /** @type {Map<string, any>} */
  const finals = new Map();
  /** @type {any[]} Every probe in order, with its classification (the re-rating phases read it). */
  const probes = [];
  let profiles = 0;
  let unproved = false;
  let ratedBelow = false;
  let ratedAbove = false;
  let ratedCentral = false;
  let nearest = Infinity;
  let nearestAt = 0;

  /**
   * clues.js:250-288's rateSubset, with the screen (P2, P3) and the direction of every result.
   * @param {number[]} idx
   * @param {string} phase
   * @returns {any} null when skipped (repeated, excluded or out of budget: no profile), else the probe.
   */
  const probe = (idx, phase) => {
    const id = idx.join(',');
    if (profiles >= limit || tried.has(id)) {
      return null;
    }
    tried.add(id);
    const clues = idx.map((i) => layout[i]);
    const key = clueKey(board, pieces, clues);
    if (excludeClueKeys.has(key)) {
      return null;
    }
    /** @type {any} */
    let rating = null;
    let capped = false;
    try {
      rating = recordRating(call, phase, clues.length, () => rateScreen(clues), screened ? W : null);
    } catch (error) {
      if (!(error instanceof IncompleteRatingError)) {
        throw error;
      }
      capped = true;
    }
    profiles += 1;
    const p = {
      n: probes.length, phase, count: clues.length, idx, clues, key, kind: 'rated', dir: 'above', screenCapped: false,
      rerated: false, score: null, estimated: false, cand: null,
    };
    probes.push(p);
    if (capped) {
      p.kind = 'too-few';
      p.screenCapped = screened;
      return p;
    }
    p.score = rating.score;
    const m = rating.metrics;
    if (screened && m.work - m.censusWork > W) {
      p.kind = 'too-few';
      p.screenCapped = true;
      return p;
    }
    p.dir = sideOfScore(rating.score);
    if (refuseUnproved && noProvedGuess(rating)) {
      p.kind = 'ar1';
      p.estimated = rating.censored === true;
      return p;
    }
    if (onRate !== undefined) {
      onRate(clues, rating);
    }
    p.cand = { idx, clues, rating, key };
    rated.push(p.cand);
    return p;
  };

  /**
   * A canonical re-rating of a screen-capped probe, outside the profile limit and charged to the shared allowance.
   * @param {any} p
   * @param {string} phase
   * @returns {any} The result: kind (rated, ar1, too-few for a canonical cap), dir, cand (rated only; not yet in `rated`).
   */
  const rerate = (p, phase) => {
    p.rerated = true;
    call.rerates += 1;
    /** @type {any} */
    let rating;
    try {
      rating = recordRating(call, phase, p.count, () => rateCanonical(p.clues), null);
    } catch (error) {
      if (!(error instanceof IncompleteRatingError)) {
        throw error;
      }
      return { count: p.count, kind: 'too-few', dir: 'above', cand: null, score: null, screenCapped: false };
    }
    const refused = refuseUnproved && noProvedGuess(rating);
    return {
      count: p.count, kind: refused ? 'ar1' : 'rated', dir: sideOfScore(rating.score), score: rating.score, screenCapped: false,
      cand: refused ? null : { idx: p.idx, clues: p.clues, rating, key: p.key },
    };
  };

  /** clues.js:289-328 (the rated re-rating of a repair is journaled as phase `repair`). */
  const finish = (/** @type {any} */ c) => {
    if (uniqueness === 'any') {
      return { ok: true, clues: c.clues, rating: c.rating, certificate: null };
    }
    const repaired = makeUnique(board, pieces, layout, c.clues, rng, ws, rowLimit);
    if (repaired === null) {
      unproved = true;
      return null;
    }
    const changed = repaired.length !== c.clues.length;
    const clues = changed ? sortLike(layout, repaired) : c.clues;
    let rating = c.rating;
    if (changed) {
      try {
        rating = recordRating(call, 'repair', clues.length, () => rateCanonical(clues), null);
      } catch (error) {
        if (!(error instanceof IncompleteRatingError)) {
          throw error;
        }
        return null;
      }
      if (refuseUnproved && noProvedGuess(rating)) {
        return null;
      }
    }
    if (!inBand(rating, target)) {
      return null;
    }
    if (changed && excludeClueKeys.has(clueKey(board, pieces, clues))) {
      return null;
    }
    return { ok: true, clues, rating, certificate: { status: 'unique', model: 'dlx-v1', rowLimit, verified: true } };
  };

  /** clues.js:330-337 */
  const finishOnce = (/** @type {any} */ c) => {
    const id = c.idx.join(',');
    if (!finals.has(id)) {
      finals.set(id, finish(c));
    }
    return finals.get(id);
  };

  /** clues.js:342 */
  const central = (/** @type {any} */ r) => !finite || Math.abs(r.score - centre) <= halfWidth;

  /** clues.js:349-385 */
  const chooseBest = () => {
    for (;;) {
      const open = inBandList.filter((c) => finals.get(c.idx.join(',')) !== null);
      if (open.length === 0) {
        return null;
      }
      let pick = open[0];
      if (finite) {
        let pickDistance = Infinity;
        let pickFinished = false;
        for (const c of ranked(target, open)) {
          const final = finals.get(c.idx.join(','));
          const distance = Math.abs((final ? final.rating : c.rating).score - centre);
          const finished = final !== undefined;
          if (distance < pickDistance || (distance === pickDistance && finished && !pickFinished)) {
            pick = c;
            pickDistance = distance;
            pickFinished = finished;
          }
        }
      }
      const final = finals.get(pick.idx.join(','));
      if (final !== undefined) {
        return final;
      }
      finishOnce(pick);
    }
  };

  /** clues.js:387-420: called once for every profile (null for a profile that is no candidate). */
  const afterProfile = (/** @type {any} */ c) => {
    if (c !== null) {
      const inside = inBand(c.rating, target);
      if (finite) {
        const offset = c.rating.score - centre;
        if (Math.abs(offset) <= halfWidth) {
          ratedCentral = true;
        } else if (offset < 0) {
          ratedBelow = true;
        } else {
          ratedAbove = true;
        }
        if (inside && Math.abs(offset) < nearest) {
          nearest = Math.abs(offset);
          nearestAt = rated.length;
        }
      }
      if (inside) {
        inBandList.push(c);
        if (central(c.rating)) {
          const final = finishOnce(c);
          if (final !== null && central(final.rating)) {
            return final;
          }
        }
      }
    }
    if (finite && inBandList.length > 0) {
      const stalled = !ratedCentral && ratedBelow !== ratedAbove && rated.length - nearestAt >= STALL_LIMIT;
      if (stalled || profiles >= limit - CENTRE_RESERVE) {
        return chooseBest();
      }
    }
    return null;
  };

  /** One probe and its `afterProfile`; a final result unwinds the call. */
  const step = (/** @type {number[]} */ idx, /** @type {string} */ phase) => {
    const p = probe(idx, phase);
    if (p === null) {
      return null;
    }
    if (phase === 'locate') {
      loc.probes += 1;
    }
    const done = afterProfile(p.kind === 'rated' ? p.cand : null);
    if (done !== null) {
      if (phase === 'locate' && p.dir === 'in') {
        Object.assign(loc, { result: 'hit', hit: p.count, wc: p.count });
      }
      throw new Final(done);
    }
    return p;
  };

  /** A candidate from a canonical re-rating joins `rated` like a probe's, and `afterProfile` reads it. */
  const adopt = (/** @type {any} */ r) => {
    if (r.cand === null) {
      return;
    }
    if (onRate !== undefined) {
      onRate(r.cand.clues, r.cand.rating);
    }
    rated.push(r.cand);
    const done = afterProfile(r.cand);
    if (done !== null) {
      throw new Final(done);
    }
  };

  /** clues.js:427 */
  const sample = (/** @type {number} */ count) => rng.shuffle(layout.map((_, i) => i)).slice(0, count).sort((a, b) => a - b);

  // Phase A: locate (P1 with the P4 prior), on one nested family.
  igPhase('locate');
  const order = rng.shuffle(layout.map((_, i) => i));
  const fam = (/** @type {number} */ c) => order.slice(0, c).sort((a, b) => a - b);
  const c0 = clamp(prior ?? K - IG.U0, 1, K - 2);
  const step0 = prior !== null ? 1 : IG.U0;
  loc.c0 = c0;
  /** @type {Map<number, any>} The latest result at each locate count (a canonical re-rating replaces a screen). */
  const byCount = new Map();
  /** @type {number | null} */
  let hit = null;
  /** @type {number | null} */
  let hiBelow = null;
  /** @type {number | null} */
  let loAbove = null;
  /** @type {string | null} */
  let noWindow = null;
  let skipped = false;

  /** @returns {'in' | 'in-refused' | 'below' | 'above' | 'skip'} */
  const side = (/** @type {number} */ c) => {
    let p = step(fam(c), 'locate');
    if (p === null) {
      p = step(sample(c), 'locate');
    }
    if (p === null) {
      return 'skip';
    }
    byCount.set(c, p);
    return p.dir === 'in' ? (p.kind === 'ar1' ? 'in-refused' : 'in') : p.dir;
  };
  const isIn = (/** @type {string} */ s) => s === 'in' || s === 'in-refused';

  /** The BELOW march: towards fewer clues from `hiBelow`, the step doubling after each below result. */
  const marchDown = () => {
    let stepSize = step0;
    for (;;) {
      const c = Math.max(1, /** @type {number} */ (hiBelow) - stepSize);
      if (c === hiBelow) {
        noWindow = 'below-to-one';
        return;
      }
      const s = side(c);
      if (isIn(s)) {
        hit = c;
        return;
      }
      if (s === 'below') {
        hiBelow = c;
        if (c === 1) {
          noWindow = 'below-to-one';
          return;
        }
        stepSize *= 2;
      } else {
        if (s === 'above') {
          loAbove = c;
        } else {
          skipped = true;
        }
        return;
      }
    }
  };
  /** The ABOVE march: towards more clues from `loAbove`. */
  const marchUp = () => {
    let stepSize = step0;
    for (;;) {
      const c = Math.min(K - 2, /** @type {number} */ (loAbove) + stepSize);
      if (c === loAbove) {
        noWindow = 'above-to-max';
        return;
      }
      const s = side(c);
      if (isIn(s)) {
        hit = c;
        return;
      }
      if (s === 'above') {
        loAbove = c;
        if (c === K - 2) {
          noWindow = 'above-to-max';
          return;
        }
        stepSize *= 2;
      } else {
        if (s === 'below') {
          hiBelow = c;
        } else {
          skipped = true;
        }
        return;
      }
    }
  };
  /**
   * IG.a3, set stage only (IGP-03): arity-3 bisection. A round rates up to three counts of the family (middle, lower,
   * upper quarter point), all of them, then reads them in that order; the probe tree depends only on the family order.
   * A final result ends the call and leaves the unread probes rated (wasted); the round is journaled on the locate
   * summary with its serial and critical (longest probe) times.
   */
  const bisectA3 = () => {
    /** @type {any[]} */
    const rounds = loc.rounds;
    while (hit === null && !skipped && hiBelow !== null && loAbove !== null && hiBelow - loAbove > 1) {
      const lo = loAbove;
      const hi = hiBelow;
      const g = hi - lo;
      const counts = [...new Set([lo + Math.floor(g / 2), lo + Math.max(1, Math.floor(g / 4)), lo + Math.max(1, Math.floor((3 * g) / 4))])]
        .filter((c) => c > lo && c < hi);
      const round = counts.map((c) => {
        const t0 = performance.now();
        let p = probe(fam(c), 'locate-a3');
        if (p === null) {
          p = probe(sample(c), 'locate-a3');
        }
        const ms = Math.round((performance.now() - t0) * 1000) / 1000;
        if (p !== null) {
          loc.probes += 1;
          byCount.set(c, p);
        }
        const s = p === null ? 'skip' : p.dir === 'in' ? (p.kind === 'ar1' ? 'in-refused' : 'in') : p.dir;
        return { c, p, s, ms };
      });
      const entry = {
        probes: round.map((r) => ({ count: r.c, side: r.s, ms: r.ms })),
        serialMs: Math.round(round.reduce((t, r) => t + r.ms, 0) * 1000) / 1000,
        criticalMs: Math.max(...round.map((r) => r.ms)),
        consumed: 0,
      };
      rounds.push(entry);
      for (const r of round) {
        entry.consumed += 1;
        const done = afterProfile(r.p !== null && r.p.kind === 'rated' ? r.p.cand : null);
        if (done !== null) {
          if (r.p !== null && r.p.dir === 'in') {
            Object.assign(loc, { result: 'hit', hit: r.p.count, wc: r.p.count });
          }
          throw new Final(done);
        }
      }
      const found = round.find((r) => isIn(r.s));
      if (found !== undefined) {
        hit = found.c;
      } else {
        let nextLo = Math.max(lo, ...round.filter((r) => r.s === 'above').map((r) => r.c));
        let nextHi = Math.min(hi, ...round.filter((r) => r.s === 'below').map((r) => r.c));
        if (nextLo >= nextHi) {
          // The results cross: keep only the middle probe's side.
          nextLo = round[0].s === 'above' ? round[0].c : lo;
          nextHi = round[0].s === 'below' ? round[0].c : hi;
        }
        loAbove = nextLo;
        hiBelow = nextHi;
      }
      if (round.some((r) => r.s === 'skip')) {
        skipped = true;
      }
    }
  };
  const bisect = () => {
    if (useA3) {
      bisectA3();
      return;
    }
    while (hit === null && !skipped && hiBelow !== null && loAbove !== null && hiBelow - loAbove > 1) {
      const mid = Math.floor((loAbove + hiBelow) / 2);
      const s = side(mid);
      if (isIn(s)) {
        hit = mid;
      } else if (s === 'below') {
        hiBelow = mid;
      } else if (s === 'above') {
        loAbove = mid;
      } else {
        skipped = true;
      }
    }
  };
  /** The window count: the hit; else the end of the closed bracket with a usable rating; else the known end. */
  const windowCount = () => {
    if (hit !== null) {
      return hit;
    }
    if (hiBelow !== null && loAbove !== null) {
      const above = byCount.get(loAbove);
      const below = byCount.get(hiBelow);
      if (above.kind === 'too-few') {
        return hiBelow;
      }
      return Math.abs(below.score - bandCentre) <= Math.abs(above.score - bandCentre) ? hiBelow : loAbove;
    }
    return hiBelow ?? loAbove ?? c0;
  };
  /** @param {string} proof @returns {any} A call that ends at once: no window (P5's fail-at-once). */
  const failNoWindow = (proof) => {
    Object.assign(loc, { result: noWindow, hiBelow, loAbove, wc: windowCount(), noWindowProof: proof });
    markNoWindow({ ok: false, result: 'no-window' });
    return { ok: false, reason: 'not-in-band' };
  };

  const first = side(c0);
  if (isIn(first)) {
    hit = c0;
  } else if (first === 'below') {
    hiBelow = c0;
    marchDown();
  } else if (first === 'above') {
    loAbove = c0;
    marchUp();
  } else {
    skipped = true;
  }
  bisect();

  /** @type {string | null} */
  let proof = null;
  if (noWindow === 'below-to-one') {
    return failNoWindow('canonical');
  }
  if (noWindow === 'above-to-max') {
    const locateProbes = probes.filter((p) => p.phase === 'locate');
    if (!locateProbes.some((p) => p.screenCapped)) {
      return failNoWindow('canonical');
    }
    // The rescue: a canonical re-rating of the screen-capped locate probes nearest the window count, once per call.
    igPhase('rescue');
    const todo = nearestFirst(locateProbes.filter((p) => p.screenCapped), windowCount());
    /** @type {any[]} */
    const results = [];
    for (const p of todo) {
      if (call.rerates >= rerateMax) {
        break;
      }
      const r = rerate(p, 'rescue');
      results.push(r);
      loc.rescue.push({ count: p.count, side: r.dir, kind: r.kind });
      byCount.set(p.count, r);
    }
    const inResults = results.filter((r) => r.dir === 'in');
    if (inResults.length > 0) {
      // A window: the first in-band result in rescue order is the hit; every eligible in-band rating is a candidate
      // (an AR1 refusal is none), and today's afterProfile may finish the call on it.
      hit = inResults[0].count;
      noWindow = null;
      proof = 'rescued-in';
      try {
        inResults.forEach(adopt);
      } catch (e) {
        if (e instanceof Final) {
          Object.assign(loc, { result: 'hit', hit, wc: hit, noWindowProof: proof });
        }
        throw e;
      }
    } else if (results.some((r) => r.dir === 'below')) {
      // The bracket is rebuilt from every locate result and phase A resumes, with no second rescue.
      proof = 'rebracketed';
      noWindow = null;
      hiBelow = Math.min(...[...byCount].filter(([, r]) => r.dir === 'below').map(([c]) => c));
      const aboveCounts = [...byCount].filter(([c, r]) => r.dir === 'above' && c < /** @type {number} */ (hiBelow)).map(([c]) => c);
      loAbove = aboveCounts.length === 0 ? null : Math.max(...aboveCounts);
      igPhase('locate');
      if (loAbove === null) {
        marchDown();
      }
      bisect();
      if (noWindow === 'below-to-one') {
        return failNoWindow('rebracketed');
      }
    } else {
      return failNoWindow(todo.every((p) => p.rerated) ? 'confirmed' : 'heuristic');
    }
  }
  const wc = windowCount();
  Object.assign(loc, {
    result: hit !== null ? 'hit' : skipped ? 'skip' : 'window', hit, hiBelow, loAbove, wc, noWindowProof: proof,
  });

  // Phase B: window (clues.js:429-464 from the window count; too-few probes count as above, AR1 refusals by score).
  igPhase('window');
  let count = wc;
  const countsTried = new Set();
  for (let stepNo = 0; stepNo < COUNT_CHANGES; stepNo += 1) {
    countsTried.add(count);
    let below = 0;
    let above = 0;
    for (let attempt = 0; attempt < SAMPLES_PER_COUNT; attempt += 1) {
      const p = step(sample(count), 'window');
      if (p === null) {
        continue;
      }
      if (p.dir === 'above') {
        above += 1;
      } else if (p.dir === 'below') {
        below += 1;
      }
    }
    if (below > 0 && above === 0) {
      count -= 1;
    } else if (above > 0 && below === 0) {
      count += 1;
    } else {
      break;
    }
    if (count < 1 || count > K - 2 || countsTried.has(count)) {
      break;
    }
  }

  // Phase C: today's phase 2 (the dead end, clues.js:466-475), sampling at the window count.
  if (rated.length === 0) {
    igPhase('p2');
  }
  for (let attempt = 0; rated.length === 0 && attempt < 4 * SAMPLES_PER_COUNT; attempt += 1) {
    step(sample(wc), 'p2');
  }

  /** clues.js:484-519 */
  const neighbours = (/** @type {any} */ member) => {
    const inSet = new Set(member.idx);
    const outside = layout.map((_, i) => i).filter((i) => !inSet.has(i));
    const size = member.idx.length;
    const options = ['swap'];
    const lean = member.rating.score < target.min ? ['remove'] : member.rating.score >= target.max ? ['add'] : ['add', 'remove'];
    for (const kind of lean) {
      if ((kind === 'add' && size + 1 <= K - 2) || (kind === 'remove' && size - 1 >= 1)) {
        options.push(kind, kind);
      }
    }
    /** @type {number[][]} */
    const out = [];
    const local = new Set();
    for (let attempt = 0; attempt < 4 * MOVES_PER_MEMBER && out.length < MOVES_PER_MEMBER; attempt += 1) {
      const kind = rng.pick(options);
      const next = member.idx.slice();
      if (kind === 'add') {
        next.push(rng.pick(outside));
      } else if (kind === 'remove') {
        next.splice(rng.int(size), 1);
      } else {
        if (outside.length === 0) {
          continue;
        }
        next[rng.int(size)] = rng.pick(outside);
      }
      next.sort((/** @type {number} */ a, /** @type {number} */ b) => a - b);
      const id = next.join(',');
      if (!tried.has(id) && !local.has(id)) {
        local.add(id);
        out.push(next);
      }
    }
    return out;
  };

  // Phase D: today's beam (clues.js:521-545), with screened probes.
  igPhase('beam');
  let beam = ranked(target, rated).slice(0, BEAM_WIDTH);
  while (profiles < limit && beam.length > 0) {
    /** @type {any[]} */
    const fresh = [];
    for (const member of beam) {
      for (const idx of neighbours(member)) {
        const p = step(idx, 'beam');
        if (p !== null && p.cand !== null) {
          fresh.push(p.cand);
        }
      }
    }
    if (fresh.length === 0) {
      break;
    }
    beam = ranked(target, [...beam, ...fresh]).slice(0, BEAM_WIDTH);
  }
  let best = chooseBest();
  if (best !== null) {
    return best;
  }

  // Phase E: canonical re-rating of the screen-capped probes nearest the window count (IG-P-Q01).
  igPhase('rerate');
  for (const p of nearestFirst(probes.filter((q) => q.screenCapped && !q.rerated), wc)) {
    if (call.rerates >= rerateMax) {
      break;
    }
    adopt(rerate(p, 'rerate'));
  }
  best = chooseBest();
  if (best !== null) {
    return best;
  }
  return { ok: false, reason: unproved ? 'uniqueness-not-proved' : 'not-in-band' };
}
