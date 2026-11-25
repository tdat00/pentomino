// @ts-check
// Clue selection and proof-status certificates (design §6.10–§6.11): count-guided
// sampling, then a small beam search, at most 64 rated subsets. A finite band is
// searched for its centre: the search stops early on a final result in the central
// half of the band, or when the central half looks out of reach (a stall), else
// returns the in-band final result nearest to the centre once 48 subsets are rated
// or the search ends. Uniqueness is only reported after an exhaustive count;
// cutoffs never become proofs. An unrateable subset (RES-04) and, for a Hard-or-above
// target, a rating without a proved decisive guess (RES-35) spend a profile and count
// for nothing else.

import { countRowLimit, makeUnique, noProvedGuess, ranked, SkipReplayError, sortLike } from './clue-primitives.js';
import { completeDiagnostic, IncompleteRatingError, inBand, rate, rateDetailed, rateLean } from './difficulty.js';
import { clueKey } from './keys.js';
import { bandEdge, initialClueCount } from './levels.js';
import { BUDGETS } from './policy.js';
import { isValidLayout } from './tiling.js';

export { certify, countRowLimit, makeUnique, SkipReplayError } from './clue-primitives.js';

/** @typedef {import('./types.js').Board} Board */
/** @typedef {import('./types.js').Piece} Piece */
/** @typedef {import('./types.js').Pose} Pose */
/** @typedef {import('./types.js').Rating} Rating */
/** @typedef {import('./types.js').RatingV3} RatingV3 */
/** @typedef {import('./types.js').RatingDetail} RatingDetail */
/** @typedef {import('./types.js').ClueEvent} ClueEvent */
/** @typedef {import('./types.js').Certificate} Certificate */
/** @typedef {import('./levels.js').Level} Level */
/** @typedef {import('./rng.js').Rng} Rng */
/** @typedef {import('./workspace.js').Workspace} Workspace */

/**
 * `onRate` observes every search rating (diagnostics and tests; it must not mutate its arguments).
 * @typedef {object} SelectContext
 * @property {Board} board
 * @property {Piece[]} pieces
 * @property {Pose[]} layout Complete valid witness layout.
 * @property {Pick<Level, 'min' | 'max' | 'share'> & { id?: string }} target
 * @property {Rng} rng
 * @property {'any' | 'require'} uniqueness
 * @property {ReadonlySet<string>} excludeClueKeys
 * @property {Workspace} ws
 * @property {(clues: Pose[], rating: Rating) => void} [onRate]
 * @property {(board: Board, pieces: Piece[], clues: Pose[], ws: Workspace) => Rating} [rate] Replaces `rate()` of
 *   difficulty.js for every rating of this call (subsets and repaired sets); diagnostics and tests only.
 * @property {(event: ClueEvent) => void} [record] Observer (RES-28): receives the events of design §6.10, plain
 *   owned JSON, never mutated after delivery. With it, every rating of the call goes through `rateDetailed`. A
 *   throwing observer propagates.
 * @property {'calibration' | 'candidate'} [recordSource] `source` of the events; default 'candidate'.
 * @property {{ subsets: number[], repairs: number[] }} [replaySkips] Replay control (RES-27, RES-28): skip exactly
 *   these ordinals instead of consulting `excludeClueKeys`; every entry must be consumed (`SkipReplayError`).
 * @property {(units: number) => void} [charge] Work meter (RES-29): called once per rating attempt of this call,
 *   right after the rating returns or throws, and once per uniqueness count of a repair, right after the count; always
 *   before the event (if any) of that rating or finish is recorded. A throwing `charge` propagates unchanged.
 */

/**
 * `skips` lists, in increasing order and for the whole call, the subset ordinals and the repair ordinals at
 * which the exclusion of `excludeClueKeys` acted (RES-27).
 * @typedef {{ ok: true, clues: Pose[], rating: Rating, certificate: Certificate | null,
 *     skips: { subsets: number[], repairs: number[] } }
 *   | { ok: false, reason: 'not-in-band' | 'uniqueness-not-proved' }} SelectResult
 */

/** @typedef {Extract<SelectResult, { ok: true }>} Selected */

/** @typedef {Omit<Selected, 'skips'>} Finished A final result before the skips of the call are attached. */

/** @typedef {import('./clue-primitives.js').Candidate} Candidate */

const BEAM_WIDTH = 4;
// Stall stop (RES-15a): this many rated profiles in a row without an in-band candidate nearer to the centre.
const STALL_LIMIT = 12;
const SAMPLES_PER_COUNT = 4;
const COUNT_CHANGES = 8;
const MOVES_PER_MEMBER = 8;
// The search for the band centre stops at profile BUDGETS.clueSubsets - CENTRE_RESERVE (48 of 64).
const CENTRE_RESERVE = 16;

/** Exclusive upper bounds of one call's skip ordinals (RES-27), from the loop limits of `selectClues`. */
export const SKIP_BOUNDS = Object.freeze({
  subsets: COUNT_CHANGES * SAMPLES_PER_COUNT + 4 * SAMPLES_PER_COUNT
    + (BUDGETS.clueSubsets + 1) * BEAM_WIDTH * MOVES_PER_MEMBER,
  repairs: BUDGETS.clueSubsets,
});

/**
 * Selects a subset of the witness whose measured score lies in the target band: `gen-v4`'s search on its route
 * (`usesGenV4`, design §7.6), today's search everywhere else.
 * @param {SelectContext} ctx
 * @returns {SelectResult}
 */
export function selectClues(ctx) {
  return selectCluesV3(ctx);
}

/**
 * Today's search (`gen-v3`, design §6.10): selects a subset of the witness whose measured score lies in the target
 * band. Throws RangeError for fewer than three pieces or an invalid layout.
 * @param {SelectContext} ctx
 * @returns {SelectResult}
 */
export function selectCluesV3(ctx) {
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

  /**
   * One rating attempt, charged to the work meter (the search work of the rating, or of the capped path) before
   * anything else happens with it.
   * @param {Pose[]} clues
   * @returns {{ rating: Rating, detail: RatingDetail | null } | null} null when the deduction path was capped
   *   (unrateable, RES-04); every other error propagates.
   */
  const rateOnce = (clues) => {
    /** @type {{ rating: Rating, detail: RatingDetail | null }} */
    let out;
    try {
      out = rateWith(board, pieces, clues, ws);
    } catch (error) {
      if (!(error instanceof IncompleteRatingError)) {
        throw error;
      }
      charge?.(error.counters.work);
      return null;
    }
    const work = /** @type {{ work?: unknown } | undefined} */ (out.rating.metrics)?.work;
    charge?.(typeof work === 'number' && Number.isFinite(work) ? work : 0);
    return out;
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
   * @param {number[]} idx
   * @param {'sample' | 'seed' | 'beam'} phase
   * @returns {Candidate | 'spent' | null} null when skipped (repeated, excluded or out of budget: no profile);
   *   'spent' when the subset took a profile without becoming a candidate (unrateable, or refused as unproved).
   */
  const rateSubset = (idx, phase) => {
    const id = idx.join(',');
    if (profiles >= limit || tried.has(id)) {
      return null;
    }
    tried.add(id);
    const ordinal = subsetOrdinal;
    subsetOrdinal += 1;
    const clues = idx.map((i) => layout[i]);
    const key = clueKey(board, pieces, clues);
    if (subsetSkipped(ordinal, key)) {
      subsetSkips.push(ordinal);
      record?.({ stage: 'clues', kind: 'skip', source, sequence: ordinal });
      return null;
    }
    const out = rateOnce(clues);
    profiles += 1;
    if (out === null) {
      record?.({
        stage: 'clues', kind: 'unrateable', source, phase, sequence: ordinal, clueIds: idsOf(clues),
        reason: 'path-capped', band: bandOf(),
      });
      return 'spent';
    }
    const { rating, detail } = out;
    if (refuseUnproved && noProvedGuess(rating)) {
      record?.({
        stage: 'clues', kind: 'rejected', source, phase, sequence: ordinal, clueIds: idsOf(clues), rating, detail,
        band: bandOf(), reason: 'no-proved-guess',
      });
      return 'spent';
    }
    if (onRate !== undefined) {
      onRate(clues, rating);
    }
    record?.({
      stage: 'clues', kind: 'rated', source, phase, sequence: ordinal, clueIds: idsOf(clues), rating, detail,
      band: bandOf(),
    });
    const candidate = { idx, clues, rating, key, seq: ordinal };
    rated.push(candidate);
    return candidate;
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
    const ordinal = repairOrdinal;
    repairOrdinal += 1;
    /** @type {{ addedId: string, clues: Pose[] }[]} */
    const steps = [];
    const repaired = makeUnique(board, pieces, layout, c.clues, rng, ws, rowLimit, {
      onAdd: record === undefined ? undefined : (addedId, list) => {
        steps.push({ addedId, clues: ownPoses(sortLike(layout, list)) });
      },
      onCount: charge,
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
        const out = rateOnce(clues);
        if (out === null) {
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
   * by the `selected` event (RES-28).
   * @param {Finished} r
   * @returns {Selected}
   */
  const conclude = (r) => {
    verifyConsumed();
    const origin = /** @type {{ sequence: number, repairSequence: number | null }} */ (origins.get(r));
    record?.({
      stage: 'clues', kind: 'selected', source, sequence: origin.sequence, repairSequence: origin.repairSequence,
    });
    return {
      ...r,
      rating: completeDiagnostic(board, pieces, r.clues, /** @type {RatingV3} */ (r.rating), ws),
      skips: { subsets: subsetSkips.slice(), repairs: repairSkips.slice() },
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

  let count = initialClueCount(target.share, K);
  const startCount = count;
  const countsTried = new Set();
  for (let step = 0; step < COUNT_CHANGES; step += 1) {
    countsTried.add(count);
    let below = 0;
    let above = 0;
    for (let attempt = 0; attempt < SAMPLES_PER_COUNT; attempt += 1) {
      const c = rateSubset(sample(count), 'sample');
      if (c === null) {
        continue;
      }
      const done = afterProfile(c === 'spent' ? null : c);
      if (done !== null) {
        return conclude(done);
      }
      if (c === 'spent') {
        continue;
      }
      if (c.rating.score < target.min) {
        below += 1;
      } else if (c.rating.score >= target.max) {
        above += 1;
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

  // Phase 2: when every phase-1 sample was skipped, seed the beam afresh.
  for (let attempt = 0; rated.length === 0 && attempt < 4 * SAMPLES_PER_COUNT; attempt += 1) {
    const c = rateSubset(sample(startCount), 'seed');
    if (c === null) {
      continue;
    }
    const done = afterProfile(c === 'spent' ? null : c);
    if (done !== null) {
      return conclude(done);
    }
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

  let beam = ranked(target, rated).slice(0, BEAM_WIDTH);
  while (profiles < limit && beam.length > 0) {
    /** @type {Candidate[]} */
    const fresh = [];
    for (const member of beam) {
      for (const idx of neighbours(member)) {
        const c = rateSubset(idx, 'beam');
        if (c === null) {
          continue;
        }
        const done = afterProfile(c === 'spent' ? null : c);
        if (done !== null) {
          return conclude(done);
        }
        if (c === 'spent') {
          continue;
        }
        fresh.push(c);
      }
    }
    if (fresh.length === 0) {
      break;
    }
    beam = ranked(target, [...beam, ...fresh]).slice(0, BEAM_WIDTH);
  }
  const best = chooseBest();
  if (best !== null) {
    return conclude(best);
  }
  verifyConsumed();
  return { ok: false, reason: unproved ? 'uniqueness-not-proved' : 'not-in-band' };
}
