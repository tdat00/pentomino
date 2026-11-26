// @ts-check
// `gen-v4`'s clue selection (design §6.10): the frozen search of the phase-1 prototype as production code. It is
// reached only through the dispatcher `selectClues` of clues.js, on the route of gen-v4.js (off until the cutover).
// The search is today's (`selectCluesV3`) with these changes:
//   P1  the clue count is located by sequential bracketing on one nested family of subsets (phase A), with the
//       rescue by canonical re-rating of the screen-capped locate probes (`RERATE_MAX`);
//   P2  every probe is rated under a lowered main-work limit W (the screen); a run whose main-phase work is at most W
//       is the canonical rating, a run above it is screen-capped, steers only and is never accepted;
//   P3  a screen-capped profile reads as "too few clues", a sided result;
//   P4  the start count comes from the table prior or the per-set `igPrior`, else from K - 8 (`step0` is 1 with a
//       prior, 8 without);
//   P5  the call ends when its work budget (`callBudgetOf`, or the test seam `ctx.budget`) is spent: checked before
//       every rating and every uniqueness count, it returns its best result or `not-in-band`: in `require` the best
//       already finished final, in `any` the best waiting in-band candidate (finishing costs nothing there);
//   P6  without a `rate` seam, a recorder or `onRate`, every search rating is lean and `conclude` completes the
//       returned rating.
// Kept from today's search: `SelectContext` and `SelectResult`, the `record` events with their `detail` from the
// same measurement, one `charge` per rating attempt and per repair count (before the event), `replaySkips` and
// `SkipReplayError`, `conclude`, the repairs and the centre rule. Two events are new: `no-window` and `budget`.
import { activeCount } from './board.js';
import {
  bandDistance, countRowLimit, makeUnique, noProvedGuess, ranked, SkipReplayError, sortLike,
} from './clue-primitives.js';
import {
  completeDiagnostic, IncompleteRatingError, inBand, rate, rateDetailed, rateLean, rateWithLimits, screenCertified,
} from './difficulty.js';
import { callBudgetOf, priorStart, RERATE_MAX, screenWOf, SKIP_BOUNDS_V4, startOf } from './gen-v4.js';
import { clueKey } from './keys.js';
import { bandEdge } from './levels.js';
import { BUDGETS, DEDUCE } from './policy.js';
import { isValidLayout } from './tiling.js';

/** @typedef {import('./types.js').Board} Board */
/** @typedef {import('./types.js').Piece} Piece */
/** @typedef {import('./types.js').Pose} Pose */
/** @typedef {import('./types.js').Rating} Rating */
/** @typedef {import('./types.js').RatingDetail} RatingDetail */
/** @typedef {import('./types.js').ClueEvent} ClueEvent */
/** @typedef {import('./workspace.js').Workspace} Workspace */
/** @typedef {import('./clues.js').SelectContext} SelectContext */
/** @typedef {import('./clues.js').SelectResult} SelectResult */
/** @typedef {import('./clues.js').Candidate} Candidate */
/** @typedef {import('./clues.js').Finished} Finished */
/** @typedef {import('./clues.js').Selected} Selected */

// clues.js:77-85, without SMALL_AREA.
const BEAM_WIDTH = 4;
const STALL_LIMIT = 12;
const SAMPLES_PER_COUNT = 4;
const COUNT_CHANGES = 8;
const MOVES_PER_MEMBER = 8;
const CENTRE_RESERVE = 16;

/** A final result found inside a nested helper: it unwinds to `searchV4`, which concludes the call with it. */
class Final {
  /** @param {any} res */
  constructor(res) {
    this.res = res;
  }
}

/** The end of a call whose work budget is spent (P5): it unwinds to `searchV4`, which ends the call. */
class BudgetStop {}

/**
 * The order of a canonical re-rating: by the distance of the count to the window count `wc`, then the higher count,
 * then probe order.
 * @param {{ count: number, n: number }[]} list
 * @param {number} wc
 * @returns {any[]}
 */
export function nearestFirst(list, wc) {
  return list.slice().sort((a, b) => Math.abs(a.count - wc) - Math.abs(b.count - wc) || b.count - a.count || a.n - b.n);
}

/** The events name the seed phase `seed`; the search calls it `p2`. */
const eventPhase = (/** @type {string} */ phase) => (phase === 'p2' ? 'seed' : phase);

/**
 * Selects a subset of the witness whose measured score lies in the target band (the contract of `selectClues`):
 * `gen-v4`'s search (design §6.10). Additions to the `SelectContext`: `igPrior` (`undefined`: the table prior of
 * `priorStart`; `null`: no prior; an integer: the per-set override, clamped to 1 to K - 2) and the test seams
 * `rateScreen(clues, W)` (replaces the screened rating), `screenW` (the screen limit of the call) and `budget` (the
 * call budget in units). Additions to the result: `igWindow` (the summary of the locate), `counters` (`budgetStops`,
 * `screenCapped`, `rescueReratings`, `tailReratings`) and, on a no-window failure, `igNoWindow` (`'below'` or
 * `'above'`).
 * @param {SelectContext & Record<string, any>} ctx
 * @returns {any}
 */
export function selectCluesV4(ctx) {
  const K = ctx.pieces.length;
  const W = ctx.screenW ?? screenWOf(ctx.target.id ?? '', activeCount(ctx.board));
  const prior = K < 3 ? null : ctx.igPrior === undefined
    ? priorStart(ctx.target.id ?? '', activeCount(ctx.board), K)
    : ctx.igPrior === null ? null : Math.min(K - 2, Math.max(1, ctx.igPrior));
  const loc = {
    c0: null, probes: 0, result: null, hit: null, hiBelow: null, loAbove: null, wc: null,
    noWindowProof: null, rescue: /** @type {{ count: number, side: string, kind: string }[]} */ ([]), countWork: 0,
  };
  return searchV4(ctx, loc, W, prior);
}

/**
 * @param {SelectContext & Record<string, any>} ctx
 * @param {any} loc The summary of the locate, returned as `igWindow`.
 * @param {number} W The screen limit of the call.
 * @param {number | null} prior The start count, or null.
 * @returns {any}
 */
function searchV4(ctx, loc, W, prior) {
  const { board, pieces, layout, target, rng, uniqueness, excludeClueKeys, ws, onRate, record, charge } = ctx;
  const replay = ctx.replaySkips;
  const source = ctx.recordSource ?? 'candidate';
  const K = pieces.length;
  if (K < 3) {
    throw new RangeError('clue selection needs at least three pieces');
  }
  if (!isValidLayout(board, pieces, layout)) {
    throw new RangeError('layout is not a complete valid arrangement of the pieces');
  }
  const limit = BUDGETS.clueSubsets;
  const rowLimit = countRowLimit(board);
  // Every rating of this call goes through rateWith: the subsets and the repaired sets. The `rate` seam keeps
  // priority; a recorder asks for the detail channel (RES-28); without a seam, a recorder or `onRate` the search
  // rates without the DLX diagnostic (P6) and `conclude` completes the returned rating.
  const seam = ctx.rate;
  /** @type {(b: Board, p: Piece[], c: Pose[], w: Workspace) => { rating: Rating, detail: RatingDetail | null }} */
  const rateWith = seam !== undefined
    ? (b, p, c, w) => ({ rating: seam(b, p, c, w), detail: null })
    : record !== undefined
      ? rateDetailed
      : (b, p, c, w) => ({ rating: (onRate === undefined ? rateLean : rate)(b, p, c, w), detail: null });
  // A generated Hard-or-above candidate needs a proved decisive guess (RES-35, AR1).
  const refuseUnproved = target.min >= bandEdge(3);
  const finite = Number.isFinite(target.max);
  // Centre and half-width of the central half of the band; only used when the band is finite.
  const centre = finite ? (target.min + target.max) / 2 : 0;
  const halfWidth = finite ? (target.max - target.min) / 4 : 0;
  /** @type {Set<string>} */
  const tried = new Set();
  /** @type {Candidate[]} */
  const rated = [];
  /** @type {Candidate[]} In-band candidates in rating order. */
  const inBandList = [];
  /** @type {Map<string, Finished | null>} Final result of each finished candidate by raw subset id (null: failed). */
  const finals = new Map();
  let profiles = 0;
  let unproved = false;
  // Skip ordinals (RES-27): the next ordinal of each kind and the ordinals at which the exclusion acted.
  let subsetOrdinal = 0;
  let repairOrdinal = 0;
  /** @type {number[]} */
  const subsetSkips = [];
  /** @type {number[]} */
  const repairSkips = [];
  // Replay of the skips (`replaySkips`): the index of the next unconsumed entry of each list.
  let subsetNext = 0;
  let repairNext = 0;
  /** @type {WeakMap<Finished, { sequence: number, repairSequence: number | null }>} Where a final result came from. */
  const origins = new WeakMap();
  // Stall stop state, from the raw subset ratings only (finite band): which sides of the central half have been
  // rated, the distance to the centre of the nearest in-band candidate, and how many candidates were rated when it
  // was. Spent profiles take no part in it (D21 counting rule).
  let ratedBelow = false;
  let ratedAbove = false;
  let ratedCentral = false;
  let nearest = Infinity;
  let nearestAt = 0;

  // Observers (RES-28, RES-29): the events are built fresh and only when `record` is set (an optional call does not
  // evaluate its arguments otherwise).
  const bandOf = () => ({ min: target.min, max: Number.isFinite(target.max) ? target.max : null });
  /** @param {Pose[]} poses */
  const ownPoses = (poses) => poses.map((p) => ({ piece: p.piece, x: p.x, y: p.y, turn: p.turn, mirrored: p.mirrored }));
  /** @param {Pose[]} poses */
  const idsOf = (poses) => poses.map((p) => p.piece);

  const screened = W < DEDUCE.work;
  const bandCentre = finite ? centre : target.min;
  /** @type {any[]} Every probe in order, with its classification (the re-rating phases read it). */
  const probes = [];
  /** @param {number} score @returns {'below' | 'in' | 'above'} */
  const sideOfScore = (score) => (score < target.min ? 'below' : score >= target.max ? 'above' : 'in');
  /** @type {(count: number) => number[]} The nested family of phase A, assigned there. */
  let fam;
  // The canonical re-ratings of the call (rescue and tail) share the allowance RERATE_MAX.
  let rerates = 0;
  const counters = { budgetStops: 0, screenCapped: 0, rescueReratings: 0, tailReratings: 0 };

  const budget = ctx.budget ?? callBudgetOf(uniqueness, target.id ?? '');
  let spent = 0;
  loc.spent = 0;
  // Every metered unit (P5): charged to the observer and the budget.
  /** @param {number} u @param {string} kind */
  const meter = (u, kind) => {
    spent += u;
    loc.spent = spent;
    charge?.(u);
  };
  // The count hook, metered (`loc.countWork` keeps the count work).
  /** @param {number} u */
  const meterCount = (u) => {
    loc.countWork += u;
    meter(u, 'count');
  };
  const checkBudget = () => {
    if (spent >= budget) {
      throw new BudgetStop();
    }
  };

  /**
   * @param {Pose[]} clues
   * @returns {{ rating: Rating, detail: RatingDetail | null }} The canonical rating of a subset or a repaired set.
   */
  const rateCanonical = (clues) => rateWith(board, pieces, clues, ws);
  /**
   * The screened rating: built under the lowered main-work limit W. A screened run that passes the certificate of
   * `rateOnce` is the canonical measurement, so its detail is the canonical detail.
   * @param {Pose[]} clues
   * @returns {{ rating: Rating, detail: RatingDetail | null }}
   */
  const rateScreen = (clues) => {
    if (ctx.rateScreen !== undefined) {
      return { rating: ctx.rateScreen(clues, W), detail: null };
    }
    if (seam !== undefined) {
      return { rating: seam(board, pieces, clues, ws), detail: null };
    }
    if (!screened) {
      return rateCanonical(clues);
    }
    return rateWithLimits(
      board, pieces, clues, ws, W, record !== undefined ? 'detailed' : onRate === undefined ? 'lean' : 'full',
    );
  };
  /**
   * One rating attempt: charged once (the search work of the rating, or of the capped path) before anything else
   * happens with it, and classified (P2's certificate).
   * @param {Pose[]} clues
   * @param {'screen' | 'canonical'} mode
   * @param {string} phase The search phase.
   * @returns {{ capped: true, screenCapped: boolean } | { capped: false, rating: Rating, detail: RatingDetail | null }}
   *   capped: the deduction path was capped (unrateable, RES-04) or the screened run is above W; every other error
   *   propagates.
   */
  const rateOnce = (clues, mode, phase) => {
    checkBudget();
    /** @type {RatingDetail | null} */
    let detail = null;
    /** @type {any} */
    let rating;
    try {
      const o = mode === 'screen' ? rateScreen(clues) : rateCanonical(clues);
      detail = o.detail;
      rating = o.rating;
    } catch (error) {
      if (!(error instanceof IncompleteRatingError)) {
        throw error;
      }
      meter(error.counters.work, `rate:${phase}`);
      if (mode === 'screen' && screened) {
        counters.screenCapped += 1;
      }
      return { capped: true, screenCapped: mode === 'screen' && screened };
    }
    const m = rating.metrics;
    meter(typeof m?.work === 'number' && Number.isFinite(m.work) ? m.work : 0, `rate:${phase}`);
    if (mode === 'screen' && screened && !screenCertified(m, W)) {
      counters.screenCapped += 1;
      return { capped: true, screenCapped: true };
    }
    return { capped: false, rating, detail };
  };

  /**
   * Whether the subset with this ordinal is skipped: by the recorded list when replaying, else by the excluded keys.
   * @param {number} ordinal
   * @param {string} key
   * @returns {boolean}
   */
  const subsetSkipped = (ordinal, key) => {
    if (replay === undefined) {
      return excludeClueKeys.has(key);
    }
    if (replay.subsets[subsetNext] !== ordinal) {
      return false;
    }
    subsetNext += 1;
    return true;
  };

  /**
   * @param {number} ordinal
   * @param {Pose[]} clues
   * @returns {boolean} true when the repair with this ordinal is skipped, as `subsetSkipped`.
   */
  const repairSkipped = (ordinal, clues) => {
    if (replay === undefined) {
      return excludeClueKeys.has(clueKey(board, pieces, clues));
    }
    if (replay.repairs[repairNext] !== ordinal) {
      return false;
    }
    repairNext += 1;
    return true;
  };

  /** Every recorded skip must have been consumed when the call returns (success or failure). */
  const verifyConsumed = () => {
    if (replay !== undefined && subsetNext < replay.subsets.length) {
      throw new SkipReplayError('unused', 'subsets', replay.subsets[subsetNext]);
    }
    if (replay !== undefined && repairNext < replay.repairs.length) {
      throw new SkipReplayError('unused', 'repairs', replay.repairs[repairNext]);
    }
  };

  /**
   * clues.js's rateSubset with the screen (P2, P3) and the direction of every result. One subset-ordinal
   * sequence serves the locate, window, seed and beam probes.
   * @param {number[]} idx
   * @param {string} phase The search phase: locate, window, p2 or beam.
   * @returns {any} null when skipped (repeated, excluded or out of budget: no profile), else the probe.
   */
  const rateSubset = (idx, phase) => {
    const id = idx.join(',');
    if (profiles >= limit || tried.has(id)) {
      return null;
    }
    tried.add(id);
    const ordinal = subsetOrdinal;
    subsetOrdinal += 1;
    if (ordinal >= SKIP_BOUNDS_V4.subsets) {
      throw new Error(`ig-select-v4: subset ordinal ${ordinal} reaches the bound ${SKIP_BOUNDS_V4.subsets}`);
    }
    const clues = idx.map((i) => layout[i]);
    const key = clueKey(board, pieces, clues);
    if (subsetSkipped(ordinal, key)) {
      subsetSkips.push(ordinal);
      record?.({ stage: 'clues', kind: 'skip', source, sequence: ordinal });
      return null;
    }
    const out = rateOnce(clues, 'screen', phase);
    profiles += 1;
    const p = {
      n: probes.length, ordinal, phase, count: clues.length, idx, clues, key, kind: 'rated', dir: 'above',
      screenCapped: false, rerated: false, score: null, cand: null,
    };
    probes.push(p);
    if (out.capped) {
      p.kind = 'too-few';
      p.screenCapped = out.screenCapped;
      record?.({
        stage: 'clues', kind: 'unrateable', source, phase: eventPhase(phase), sequence: ordinal, clueIds: idsOf(clues),
        reason: out.screenCapped ? 'screen-capped' : 'path-capped', band: bandOf(),
      });
      return p;
    }
    const { rating, detail } = out;
    p.score = rating.score;
    p.dir = sideOfScore(rating.score);
    if (refuseUnproved && noProvedGuess(rating)) {
      p.kind = 'ar1';
      record?.({
        stage: 'clues', kind: 'rejected', source, phase: eventPhase(phase), sequence: ordinal, clueIds: idsOf(clues),
        rating, detail, band: bandOf(), reason: 'no-proved-guess',
      });
      return p;
    }
    if (onRate !== undefined) {
      onRate(clues, rating);
    }
    record?.({
      stage: 'clues', kind: 'rated', source, phase: eventPhase(phase), sequence: ordinal, clueIds: idsOf(clues),
      rating, detail, band: bandOf(),
    });
    p.cand = { idx, clues, rating, key, seq: ordinal };
    rated.push(p.cand);
    return p;
  };

  /**
   * The final result of an in-band candidate: the raw subset for `any`, else the repaired and re-rated set. In
   * `require` mode the steps of the repair are recorded once the finish has decided (D31): one `repair` event per
   * added clue, only the last with the outcome; a failure before any clue was added is one event with no piece.
   * @param {Candidate} c In-band candidate.
   * @returns {Finished | null}
   */
  const finish = (c) => {
    if (uniqueness === 'any') {
      /** @type {Finished} */
      const final = { ok: true, clues: c.clues, rating: c.rating, certificate: null };
      origins.set(final, { sequence: c.seq, repairSequence: null });
      return final;
    }
    checkBudget();
    const ordinal = repairOrdinal;
    repairOrdinal += 1;
    /** @type {{ addedId: string, clues: Pose[] }[]} */
    const steps = [];
    const repaired = makeUnique(board, pieces, layout, c.clues, rng, ws, rowLimit, {
      onAdd: (addedId, list) => {
        if (record !== undefined) {
          steps.push({ addedId, clues: ownPoses(sortLike(layout, list)) });
        }
        if (list.length <= K - 2) {
          checkBudget();
        }
      },
      onCount: meterCount,
    });
    /** @typedef {NonNullable<Extract<ClueEvent, { kind: 'repair' }>['reason']>} RepairReason */
    /**
     * @param {RepairReason} reason
     * @param {Rating | null} [rating]
     * @param {RatingDetail | null} [detail]
     */
    const refusal = (reason, rating = null, detail = null) => ({ rating, detail, accepted: false, reason });
    let consumed = false;
    /** @returns {{ final: Finished | null, outcome: ReturnType<typeof refusal> | { rating: Rating, detail: null | RatingDetail, accepted: true, reason?: undefined } }} */
    const decide = () => {
      if (repaired === null) {
        unproved = true;
        return { final: null, outcome: refusal('not-proved') };
      }
      // Repair re-rates only a changed clue set; that rating is not a search profile.
      const changed = repaired.length !== c.clues.length;
      const clues = changed ? sortLike(layout, repaired) : c.clues;
      let rating = c.rating;
      /** @type {RatingDetail | null} */
      let detail = null;
      if (changed) {
        const out = rateOnce(clues, 'canonical', 'repair');
        if (out.capped) {
          return { final: null, outcome: refusal('path-capped') };
        }
        ({ rating, detail } = out);
        if (refuseUnproved && noProvedGuess(rating)) {
          return { final: null, outcome: refusal('no-proved-guess', rating, detail) };
        }
      }
      if (!inBand(rating, target)) {
        return { final: null, outcome: refusal('out-of-band', rating, detail) };
      }
      if (changed && repairSkipped(ordinal, clues)) {
        consumed = true;
        repairSkips.push(ordinal);
        return { final: null, outcome: refusal('excluded', rating, detail) };
      }
      /** @type {Finished} */
      const final = {
        ok: true, clues, rating, certificate: { status: 'unique', model: 'dlx-v1', rowLimit, verified: true },
      };
      origins.set(final, { sequence: c.seq, repairSequence: changed ? ordinal : null });
      return { final, outcome: { rating, detail, accepted: true } };
    };
    const { final, outcome } = decide();
    if (record !== undefined && steps.length > 0) {
      steps.forEach((step, i) => {
        const last = i === steps.length - 1;
        record({
          stage: 'unique', kind: 'repair', source, repairSequence: ordinal, addedId: step.addedId, clues: step.clues,
          rating: last ? outcome.rating : null, detail: last ? outcome.detail : null,
          accepted: last ? outcome.accepted : null,
          ...(last && outcome.reason !== undefined ? { reason: outcome.reason } : {}),
        });
      });
    } else if (record !== undefined && !outcome.accepted) {
      record({
        stage: 'unique', kind: 'repair', source, repairSequence: ordinal, addedId: null, clues: ownPoses(c.clues),
        rating: null, detail: null, accepted: false, reason: outcome.reason,
      });
    }
    if (replay !== undefined && !consumed && replay.repairs[repairNext] === ordinal) {
      throw new SkipReplayError('unreachable', 'repairs', ordinal);
    }
    return final;
  };

  /**
   * The result of the call: a fresh copy of a final result with the skips of the whole call up to now, announced
   * by the `selected` event (RES-28), and the summary of the locate.
   * @param {Finished} r
   * @returns {any}
   */
  const conclude = (r) => {
    verifyConsumed();
    const origin = /** @type {{ sequence: number, repairSequence: number | null }} */ (origins.get(r));
    record?.({
      stage: 'clues', kind: 'selected', source, sequence: origin.sequence, repairSequence: origin.repairSequence,
    });
    return {
      ...r,
      rating: completeDiagnostic(board, pieces, r.clues, /** @type {import('./types.js').RatingV3} */ (r.rating), ws),
      skips: { subsets: subsetSkips.slice(), repairs: repairSkips.slice() },
      igWindow: {
        c0: loc.c0, wc: loc.wc, hit: loc.hit, hiBelow: loc.hiBelow,
        loAbove: loc.loAbove, probes: loc.probes,
        result: loc.result, proof: loc.noWindowProof,
      },
      counters: { ...counters },
    };
  };

  /**
   * Finishes a candidate at most once, so that the repair draws from the rng at deterministic points.
   * @param {Candidate} c
   * @returns {Finished | null}
   */
  const finishOnce = (c) => {
    const id = c.idx.join(',');
    if (!finals.has(id)) {
      finals.set(id, finish(c));
    }
    return /** @type {Finished | null} */ (finals.get(id));
  };

  /**
   * @param {Rating} r
   * @returns {boolean} true in the central half of a finite band, and for every rating of an unbounded band.
   */
  const central = (r) => !finite || Math.abs(r.score - centre) <= halfWidth;

  /**
   * Lazy best-first choice over the final results of the in-band candidates: the one whose final score (raw
   * score while unfinished) is nearest to the centre, finishing candidates until that one is a final result.
   * @returns {Finished | null} null when no in-band candidate has a final result.
   */
  const chooseBest = () => {
    for (;;) {
      const open = inBandList.filter((c) => finals.get(c.idx.join(',')) !== null);
      if (open.length === 0) {
        return null;
      }
      /** @type {Candidate} */
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

  // The best final result already finished: the existing centre and tie order, no new work.
  const bestFinished = () => {
    let pick = null;
    let pickDistance = Infinity;
    for (const c of (finite ? ranked(target, inBandList) : inBandList)) {
      const final = finals.get(c.idx.join(','));
      if (final === undefined || final === null) {
        continue;
      }
      const distance = finite ? Math.abs(final.rating.score - centre) : 0;
      if (pick === null || distance < pickDistance) {
        pick = final;
        pickDistance = distance;
      }
    }
    return pick;
  };

  /**
   * Called once for every profile: a central final result stops the search; so does a stall (RES-15a: the central
   * half is out of reach); from profile `limit - CENTRE_RESERVE` on, the best final result seen so far does. The
   * stall reads raw subset ratings only, in every uniqueness mode, and counts rated candidates: a spent profile
   * (`c` null) is on no side of the central half, is never nearer and neither advances nor resets the count.
   * @param {Candidate | null} c Null for a spent profile.
   * @returns {Finished | null}
   */
  const afterProfile = (c) => {
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

  /**
   * @param {number} count
   * @returns {number[]}
   */
  const sample = (count) => rng.shuffle(layout.map((_, i) => i)).slice(0, count).sort((a, b) => a - b);

  /** One probe and its `afterProfile`; a final result unwinds the call. */
  const step = (/** @type {number[]} */ idx, /** @type {string} */ phase) => {
    const p = rateSubset(idx, phase);
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

  /**
   * A canonical re-rating of a screen-capped probe, outside the profile limit and the ordinals, and charged to the
   * shared allowance of `RERATE_MAX`.
   * @param {any} p
   * @param {string} phase
   * @returns {any} The result: kind (rated, ar1, too-few for a canonical cap), dir, cand (rated only; not yet in `rated`).
   */
  const rerate = (p, phase) => {
    p.rerated = true;
    rerates += 1;
    const out = rateOnce(p.clues, 'canonical', phase);
    if (out.capped) {
      record?.({
        stage: 'clues', kind: 'unrateable', source, phase: eventPhase(phase), sequence: p.ordinal,
        clueIds: idsOf(p.clues), reason: 'path-capped', band: bandOf(),
      });
      return { count: p.count, kind: 'too-few', dir: 'above', cand: null, score: null, screenCapped: false };
    }
    const { rating, detail } = out;
    if (phase === 'rescue') {
      counters.rescueReratings += 1;
    } else if (phase === 'rerate') {
      counters.tailReratings += 1;
    }
    const refused = refuseUnproved && noProvedGuess(rating);
    if (refused) {
      record?.({
        stage: 'clues', kind: 'rejected', source, phase: eventPhase(phase), sequence: p.ordinal,
        clueIds: idsOf(p.clues), rating, detail, band: bandOf(), reason: 'no-proved-guess',
      });
    } else {
      record?.({
        stage: 'clues', kind: 'rated', source, phase: eventPhase(phase), sequence: p.ordinal, clueIds: idsOf(p.clues),
        rating, detail, band: bandOf(),
      });
    }
    return {
      count: p.count, kind: refused ? 'ar1' : 'rated', dir: sideOfScore(rating.score), score: rating.score,
      screenCapped: false,
      cand: refused ? null : { idx: p.idx, clues: p.clues, rating, key: p.key, seq: p.ordinal },
    };
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

  try {
    // Phase A: locate (P1 with the P4 prior), on one nested family.
    const order = rng.shuffle(layout.map((_, i) => i));
    fam = (/** @type {number} */ c) => order.slice(0, c).sort((a, b) => a - b);
    const { c0, step0 } = startOf(prior, K);
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
    const bisect = () => {
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
      verifyConsumed();
      Object.assign(loc, { result: noWindow, hiBelow, loAbove, wc: windowCount(), noWindowProof: proof });
      record?.({ stage: 'clues', kind: 'no-window', source, side: noWindow === 'below-to-one' ? 'below' : 'above' });
      return {
        ok: false,
        reason: 'not-in-band',
        igNoWindow: noWindow === 'below-to-one' ? 'below' : 'above',
        counters: { ...counters },
      };
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
      const todo = nearestFirst(locateProbes.filter((p) => p.screenCapped), windowCount());
      /** @type {any[]} */
      const results = [];
      for (const p of todo) {
        if (rerates >= RERATE_MAX) {
          break;
        }
        const r = rerate(p, 'rescue');
        results.push(r);
        loc.rescue.push({ count: p.count, side: r.dir, kind: r.kind });
        byCount.set(p.count, r);
      }
      const inResults = results.filter((r) => r.dir === 'in');
      if (inResults.length > 0) {
        // A window: the first in-band result in rescue order is the hit; every eligible in-band rating is a
        // candidate (an AR1 refusal is none), and today's afterProfile may finish the call on it.
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
        const aboveCounts = [...byCount]
          .filter(([c, r]) => r.dir === 'above' && c < /** @type {number} */ (hiBelow)).map(([c]) => c);
        loAbove = aboveCounts.length === 0 ? null : Math.max(...aboveCounts);
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
    for (let attempt = 0; rated.length === 0 && attempt < 4 * SAMPLES_PER_COUNT; attempt += 1) {
      step(sample(wc), 'p2');
    }

    /**
     * Up to `MOVES_PER_MEMBER` unseen neighbours: add, remove or swap one clue,
     * leaning towards the side of the band the member is on.
     * @param {Candidate} member
     * @returns {number[][]}
     */
    const neighbours = (member) => {
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
        next.sort((a, b) => a - b);
        const id = next.join(',');
        if (!tried.has(id) && !local.has(id)) {
          local.add(id);
          out.push(next);
        }
      }
      return out;
    };

    // Phase D: today's beam (clues.js:521-545), with screened probes.
    let beam = ranked(target, rated).slice(0, BEAM_WIDTH);
    while (profiles < limit && beam.length > 0) {
      /** @type {Candidate[]} */
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
      return conclude(best);
    }

    // Phase E: canonical re-rating of the screen-capped probes nearest the window count.
    for (const p of nearestFirst(probes.filter((q) => q.screenCapped && !q.rerated), wc)) {
      if (rerates >= RERATE_MAX) {
        break;
      }
      adopt(rerate(p, 'rerate'));
    }
    best = chooseBest();
    if (best !== null) {
      return conclude(best);
    }
    verifyConsumed();
    return { ok: false, reason: unproved ? 'uniqueness-not-proved' : 'not-in-band', counters: { ...counters } };
  } catch (e) {
    if (e instanceof BudgetStop) {
      counters.budgetStops = 1;
      record?.({ stage: 'clues', kind: 'budget', source });
      // No new work after the stop. In 'any' mode `finish` returns the raw subset (no rating, no count, no
      // rng draw), so `chooseBest` does no work and returns the best waiting in-band candidate (plan P5).
      const best = uniqueness === 'any' ? chooseBest() : bestFinished();
      if (best !== null) {
        return conclude(best);
      }
      verifyConsumed();
      return { ok: false, reason: 'not-in-band', counters: { ...counters } };
    }
    if (e instanceof Final) {
      return conclude(e.res);
    }
    throw e;
  }
}
