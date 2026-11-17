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

import { activeCount } from './board.js';
import { completeDiagnostic, IncompleteRatingError, inBand, rate, rateDetailed, rateLean } from './difficulty.js';
import { poseCells } from './geometry.js';
import { clueKey } from './keys.js';
import { bandEdge, initialClueCount } from './levels.js';
import { BUDGETS } from './policy.js';
import { buildModel, countSolutions, isValidLayout } from './tiling.js';

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
 * @property {Pick<Level, 'min' | 'max' | 'share'>} target
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

/**
 * @typedef {object} Candidate
 * @property {number[]} idx Ascending layout positions of the clued pieces.
 * @property {Pose[]} clues
 * @property {Rating} rating
 * @property {string} key Symmetry-aware clue key.
 * @property {number} seq Subset ordinal (RES-27).
 */

const BEAM_WIDTH = 4;
// Stall stop (RES-15a): this many rated profiles in a row without an in-band candidate nearer to the centre.
const STALL_LIMIT = 12;
const SAMPLES_PER_COUNT = 4;
const COUNT_CHANGES = 8;
const MOVES_PER_MEMBER = 8;
const SMALL_AREA = 200;
// The search for the band centre stops at profile BUDGETS.clueSubsets - CENTRE_RESERVE (48 of 64).
const CENTRE_RESERVE = 16;

/** Exclusive upper bounds of one call's skip ordinals (RES-27), from the loop limits of `selectClues`. */
export const SKIP_BOUNDS = Object.freeze({
  subsets: COUNT_CHANGES * SAMPLES_PER_COUNT + 4 * SAMPLES_PER_COUNT
    + (BUDGETS.clueSubsets + 1) * BEAM_WIDTH * MOVES_PER_MEMBER,
  repairs: BUDGETS.clueSubsets,
});

/**
 * Thrown when a recorded skip list does not fit the run it is replayed in (`replaySkips`, RES-27): a repair ordinal
 * whose finish ended before the excluded-key check is `unreachable`; an entry left unconsumed when `selectClues`
 * returns is `unused`.
 */
export class SkipReplayError extends Error {
  /**
   * @param {'unreachable' | 'unused'} reason
   * @param {'subsets' | 'repairs'} list
   * @param {number} ordinal
   */
  constructor(reason, list, ordinal) {
    super(`recorded ${list} skip ${ordinal} is ${reason}`);
    this.name = 'SkipReplayError';
    this.code = 'replay-skips';
    this.reason = reason;
    this.list = list;
    this.ordinal = ordinal;
  }
}

/**
 * Row limit of a raw uniqueness count: 10,000 up to 200 active cells, else 2,000.
 * @param {Board} board
 * @returns {number}
 */
export function countRowLimit(board) {
  return activeCount(board) <= SMALL_AREA ? BUDGETS.countRowsSmall : BUDGETS.countRowsLarge;
}

/**
 * Raw proof status of a clue set: no board-symmetry quotient, at most two
 * solutions, at most `rowLimit` row trials.
 * @param {Board} board
 * @param {Piece[]} pieces
 * @param {Pose[]} clues
 * @param {Workspace} ws
 * @param {number} rowLimit
 * @returns {Certificate}
 */
export function certify(board, pieces, clues, ws, rowLimit) {
  const model = buildModel(board, pieces, clues, ws);
  const c = countSolutions(model, { cap: 2, rowTrialLimit: rowLimit, witnessLimit: 0 });
  /** @type {Certificate['status']} */
  let status = 'not-proved';
  if (c.found >= 2) {
    status = 'multiple';
  } else if (c.exhausted) {
    status = c.found === 1 ? 'unique' : 'unsatisfiable';
  }
  return { status, model: 'dlx-v1', rowLimit, verified: true };
}

/**
 * @param {Piece} piece
 * @param {Pose} pose
 * @returns {string}
 */
function footprint(piece, pose) {
  return poseCells(piece, pose).map(([x, y]) => y * 65536 + x).sort((a, b) => a - b).join(',');
}

/**
 * Counterexample-guided repair: while two raw completions exist, clue the
 * smallest planted piece whose footprint differs in another solution. Returns
 * the clues (the given ones first, then the added ones) once one completion
 * exists and the search was exhaustive; null when that cannot be proved. `hooks` only observe: `onAdd` is called
 * after each added clue with the piece id and a copy of the current clue list, `onCount` right after each count
 * with its row trials (the work meter).
 * @param {Board} board
 * @param {Piece[]} pieces
 * @param {Pose[]} layout
 * @param {Pose[]} clues
 * @param {Rng} rng
 * @param {Workspace} ws
 * @param {number} rowLimit
 * @param {{ onAdd?: (pieceId: string, clues: Pose[]) => void, onCount?: (rowTrials: number) => void }} [hooks]
 * @returns {Pose[] | null}
 */
export function makeUnique(board, pieces, layout, clues, rng, ws, rowLimit, hooks = {}) {
  const byId = new Map(pieces.map((p) => [p.id, p]));
  const planted = new Map(layout.map((pose) => [pose.piece, pose]));
  const maxClues = pieces.length - 2;
  let current = clues.slice();
  while (current.length <= maxClues) {
    const model = buildModel(board, pieces, current, ws);
    const c = countSolutions(model, { cap: 2, rowTrialLimit: rowLimit, witnessLimit: 2 });
    hooks.onCount?.(c.rowTrials);
    if (c.found === 1 && c.exhausted) {
      return current;
    }
    if (c.found < 2) {
      return null;
    }
    const clued = new Set(current.map((p) => p.piece));
    const other = c.witnesses.find((w) => w.some((pose) => {
      const piece = /** @type {Piece} */ (byId.get(pose.piece));
      return footprint(piece, pose) !== footprint(piece, /** @type {Pose} */ (planted.get(pose.piece)));
    }));
    if (other === undefined) {
      return null;
    }
    /** @type {Piece[]} */
    const differing = [];
    for (const pose of other) {
      const piece = /** @type {Piece} */ (byId.get(pose.piece));
      if (!clued.has(pose.piece)
        && footprint(piece, pose) !== footprint(piece, /** @type {Pose} */ (planted.get(pose.piece)))) {
        differing.push(piece);
      }
    }
    if (differing.length === 0) {
      return null;
    }
    const smallest = Math.min(...differing.map((p) => p.cells.length));
    const ties = differing.filter((p) => p.cells.length === smallest);
    const chosen = ties.length === 1 ? ties[0] : rng.pick(ties);
    current = [...current, /** @type {Pose} */ (planted.get(chosen.id))];
    hooks.onAdd?.(chosen.id, current.slice());
  }
  return null;
}

/**
 * @param {Pick<Level, 'min' | 'max'>} target
 * @param {Rating} r
 * @returns {number} 0 inside the band, else the distance to the nearest in-band score.
 */
function bandDistance(target, r) {
  if (r.score < target.min) {
    return target.min - r.score;
  }
  return r.score >= target.max ? r.score - target.max + 1 : 0;
}

/**
 * @param {Pick<Level, 'min' | 'max'>} target
 * @param {Candidate[]} list
 * @returns {Candidate[]}
 */
function ranked(target, list) {
  const center = (target.min + target.max) / 2;
  return list.slice().sort((a, b) => bandDistance(target, a.rating) - bandDistance(target, b.rating)
    || Math.abs(a.rating.score - center) - Math.abs(b.rating.score - center)
    || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

/**
 * @param {Rating} r
 * @returns {boolean} true when the rating reports no proved decisive guess (`metrics.Gproved === 0`).
 */
function noProvedGuess(r) {
  const m = /** @type {unknown} */ (r.metrics);
  return typeof m === 'object' && m !== null && Object.hasOwn(m, 'Gproved')
    && /** @type {{ Gproved?: unknown }} */ (m).Gproved === 0;
}

/**
 * Selects a subset of the witness whose measured score lies in the target band.
 * Throws RangeError for fewer than three pieces or an invalid layout.
 * @param {SelectContext} ctx
 * @returns {SelectResult}
 */
export function selectClues(ctx) {
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

/**
 * Clues in layout order.
 * @param {Pose[]} layout
 * @param {Pose[]} clues
 * @returns {Pose[]}
 */
function sortLike(layout, clues) {
  const wanted = new Set(clues.map((c) => c.piece));
  return layout.filter((p) => wanted.has(p.piece));
}
