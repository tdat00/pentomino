// @ts-check
// Replay of one generated puzzle from its record (design §6.12, RES-29): the preflight of the record and the code
// versions, the two stage runs (the piece set, then the candidate), the work meter and the bounds, and the exact final
// comparison with the stored puzzle (`runReplay`); then the steps of the Generation Steps dialog, built from the
// recorded events and bounded in bytes (`replayPuzzle`). Pure: no DOM, storage, clock or randomness; every result is a
// function of the input, the limits and `isCancelled`.

import { activeCount, boardToRows } from './board.js';
import { SkipReplayError } from './clues.js';
import { breakdownV3 } from './difficulty.js';
import { canonicalKey, poseCells } from './geometry.js';
import { provenanceVersions, puzzleCandidate, setAttempt } from './generate.js';
import { level } from './levels.js';
import { readProvenance } from './pack.js';
import { pieceCountRange, REPLAY } from './policy.js';

/** @typedef {import('./types.js').Piece} Piece */
/** @typedef {import('./types.js').XY} XY */
/** @typedef {import('./types.js').RatingDetail} RatingDetail */
/** @typedef {import('./difficulty.js').BreakdownV3} BreakdownV3 */
/** @typedef {import('./types.js').PieceSet} PieceSet */
/** @typedef {import('./types.js').Pose} Pose */
/** @typedef {import('./types.js').Puzzle} Puzzle */
/** @typedef {import('./types.js').PackPuzzle} PackPuzzle */
/** @typedef {import('./types.js').RatingClaim} RatingClaim */
/** @typedef {import('./types.js').RecordEvent} RecordEvent */
/** @typedef {import('./types.js').Workspace} Workspace */
/** @typedef {import('./types.js').ProvenanceVersions} ProvenanceVersions */

/**
 * What `runReplay` reads: the set (board, pieces, witness, carving, macro region), the stored puzzle and the pack's
 * whole `generation` object (or `{ setOrigin, made }`).
 * @typedef {object} ReplayInput
 * @property {PieceSet} set
 * @property {PackPuzzle | Puzzle} puzzle
 * @property {unknown} generation
 */

/**
 * @typedef {object} ReplayLimits
 * @property {number} maxSteps Events (steps) kept, one of them reserved for the final step.
 * @property {number} maxBytes Serialized bytes of the events as one JSON array, less `reserveBytes`.
 * @property {number} work Total metered work (ratings, uniqueness counts, one unit per event).
 */

/**
 * `replayed`: the stage ran to its end. `unavailable`: the record or the code versions do not allow it. `mismatch`:
 * it ran and disagreed with the record (the set attempt failed, a recorded skip does not fit, the candidate failed).
 * `stopped`: a bound stopped the replay while the stage ran or before it could run.
 * @typedef {'replayed' | 'unavailable' | 'mismatch' | 'stopped'} StageState
 */

/**
 * `stages.candidate` is `'calibration'` for the set's reused calibration puzzle, which has no layout stage (RES-27);
 * `stages.final` is `'compared'` when at least one field of the final comparison was compared (passed or failed).
 * `set` is the engine's replayed `PieceSet`, kept for the steps: its `board.active` is a `Uint8Array`, so it is the
 * only field that is not plain JSON.
 * @typedef {object} ReplayRun
 * @property {'matched' | 'unavailable' | 'mismatch' | 'incomplete'} status
 * @property {string | null} reason
 * @property {{ set: StageState, candidate: StageState | 'calibration', final: 'compared' | 'not-compared' }} stages
 * @property {string[]} compared The fields that were compared and equal, in comparison order.
 * @property {number} work The metered total, the units that crossed a bound included.
 * @property {RecordEvent[]} events The retained events in chronological order.
 * @property {PieceSet | null} set
 */

/** Thrown when `isCancelled` answers true (checked at every metered unit). */
export class ReplayCancelledError extends Error {
  constructor() {
    super('the replay was cancelled');
    this.name = 'ReplayCancelledError';
    this.code = 'cancelled';
  }
}

const encoder = new TextEncoder();

/**
 * @param {string} text
 * @returns {number} The UTF-8 byte length of the text.
 */
export function utf8Length(text) {
  return encoder.encode(text).length;
}

/**
 * @param {unknown} v
 * @returns {v is Record<string, any>}
 */
function isObject(v) {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * @param {unknown} v
 * @returns {boolean}
 */
function isPlainObject(v) {
  if (!isObject(v)) {
    return false;
  }
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

/**
 * @param {object} o
 * @param {string} key
 * @returns {unknown} The value of an own data property, else undefined (a getter is never called).
 */
function ownValue(o, key) {
  const d = Object.getOwnPropertyDescriptor(o, key);
  return d !== undefined && 'value' in d ? d.value : undefined;
}

/**
 * @param {unknown} input
 */
function checkInput(input) {
  const ok = isObject(input)
    && isObject(input.set) && isObject(input.set.board) && input.set.board.active instanceof Uint8Array
    && Array.isArray(input.set.pieces) && input.set.pieces.length >= 1
    && (input.set.witness === undefined || input.set.witness === null || Array.isArray(input.set.witness))
    && isObject(input.puzzle) && typeof input.puzzle.id === 'string' && Array.isArray(input.puzzle.clues)
    && (input.puzzle.solution === undefined || input.puzzle.solution === null || Array.isArray(input.puzzle.solution))
    && (input.puzzle.rating === undefined || input.puzzle.rating === null || isObject(input.puzzle.rating))
    && isObject(input.generation);
  if (!ok) {
    throw new RangeError('invalid replay input');
  }
}

/**
 * @param {unknown} limits
 * @param {unknown} reserveBytes
 */
function checkLimits(limits, reserveBytes) {
  const ok = isObject(limits)
    && Number.isSafeInteger(limits.maxSteps) && limits.maxSteps >= 1
    && Number.isSafeInteger(limits.maxBytes) && limits.maxBytes >= 1
    && Number.isSafeInteger(limits.work) && limits.work >= 0
    && Number.isSafeInteger(reserveBytes) && /** @type {number} */ (reserveBytes) >= 0
    && /** @type {number} */ (reserveBytes) <= limits.maxBytes;
  if (!ok) {
    throw new RangeError('invalid replay limits');
  }
}

/**
 * The record of one puzzle (cross-review SP08): `setOrigin` and the puzzle's own entry of `made`, so that a pack's
 * whole `generation` and a one-entry payload read the same, in O(1) of the number of puzzles. A `made` that is not a
 * map is kept as it is, so that `readProvenance` reports it.
 * @param {Record<string, any>} generation
 * @param {string} id
 * @returns {Record<string, unknown>}
 */
function ownProvenance(generation, id) {
  /** @type {Record<string, unknown>} */
  const out = {};
  if (Object.hasOwn(generation, 'setOrigin')) {
    out.setOrigin = ownValue(generation, 'setOrigin');
  }
  if (Object.hasOwn(generation, 'made')) {
    const map = ownValue(generation, 'made');
    if (!isPlainObject(map)) {
      out.made = map;
    } else if (Object.hasOwn(/** @type {object} */ (map), id)) {
      out.made = { [id]: ownValue(/** @type {object} */ (map), id) };
    }
  }
  return out;
}

/**
 * @param {ProvenanceVersions} a
 * @param {ProvenanceVersions} b
 * @returns {boolean}
 */
export function sameVersions(a, b) {
  return a.algo === b.algo && a.policy === b.policy && a.rng === b.rng && a.seedScheme === b.seedScheme
    && a.ratingModel === b.ratingModel && a.priorTable === b.priorTable && a.screenTable === b.screenTable;
}

/**
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean} Deep equality of two plain JSON values (key order does not matter).
 */
function sameJson(a, b) {
  if (a === b) {
    return true;
  }
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }
  if (Array.isArray(a) !== Array.isArray(b)) {
    return false;
  }
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) {
    return false;
  }
  return keys.every((k) => Object.hasOwn(b, k)
    && sameJson(/** @type {any} */ (a)[k], /** @type {any} */ (b)[k]));
}

/**
 * @param {Map<string, Piece>} pieces
 * @param {Pose} pose
 * @returns {string | null} The cells of the pose as one sorted key; null when the piece is unknown or the pose
 *   cannot be placed.
 */
function cellsKey(pieces, pose) {
  const piece = pieces.get(pose.piece);
  if (piece === undefined) {
    return null;
  }
  try {
    return poseCells(piece, pose).map(([x, y]) => `${x},${y}`).sort().join(';');
  } catch {
    return null;
  }
}

/**
 * Whether two lists of poses place the same pieces on the same cells; poses may be written with different but
 * equivalent orientations.
 * @param {Piece[]} piecesA
 * @param {Pose[]} posesA
 * @param {Piece[]} piecesB
 * @param {Pose[]} posesB
 * @returns {boolean}
 */
function samePlacement(piecesA, posesA, piecesB, posesB) {
  if (posesA.length !== posesB.length) {
    return false;
  }
  const mapA = new Map(piecesA.map((p) => [p.id, p]));
  const mapB = new Map(piecesB.map((p) => [p.id, p]));
  /** @type {Map<string, string>} */
  const left = new Map();
  for (const pose of posesA) {
    const key = cellsKey(mapA, pose);
    if (key === null || left.has(pose.piece)) {
      return false;
    }
    left.set(pose.piece, key);
  }
  for (const pose of posesB) {
    const key = cellsKey(mapB, pose);
    if (key === null || left.get(pose.piece) !== key) {
      return false;
    }
    left.delete(pose.piece);
  }
  return left.size === 0;
}

/**
 * @param {Piece[]} a
 * @param {Piece[]} b
 * @returns {boolean} The same length and, at every index, the same id and the same shape.
 */
function samePieces(a, b) {
  return a.length === b.length && a.every((p, i) => {
    try {
      return p.id === b[i].id && canonicalKey(p.cells) === canonicalKey(b[i].cells);
    } catch {
      return false;
    }
  });
}

/**
 * @param {RatingClaim} claim
 * @param {import('./types.js').Rating} rating
 * @returns {boolean}
 */
function sameRating(claim, rating) {
  if (claim.model !== rating.model || claim.score !== rating.score || claim.level !== rating.level) {
    return false;
  }
  if (Object.hasOwn(claim, 'censored') !== Object.hasOwn(rating, 'censored') || claim.censored !== rating.censored) {
    return false;
  }
  return claim.metrics === undefined || sameJson(claim.metrics, rating.metrics);
}

/**
 * Re-runs the generation of one puzzle from its record (RES-29) and compares the result with the stored puzzle
 * (design §6.12). The steps of the Generation Steps dialog are built from `events`; tests call this directly.
 *
 * `matched` only when the whole trace was replayed and every comparison passed; `unavailable` when the record or the
 * code versions do not allow a replay (decided before any stage runs); `mismatch` when the replay disagrees; and
 * `incomplete` when a bound stopped it (never compared, never `matched`).
 * @param {ReplayInput} input
 * @param {{ ws: Workspace, scratch: Workspace }} workspaces Main and scratch workspaces, as generation uses them.
 * @param {ReplayLimits} [limits]
 * @param {() => boolean} [isCancelled] Checked at every metered unit; true throws `ReplayCancelledError`.
 * @param {number} [reserveBytes] Bytes kept free for the final step and the brackets of the steps array.
 * @returns {ReplayRun}
 * @throws {RangeError} The input or the limits are malformed (before any stage runs).
 */
export function runReplay(input, workspaces, limits = REPLAY, isCancelled = () => false, reserveBytes = 0) {
  checkInput(input);
  checkLimits(limits, reserveBytes);
  const { set, puzzle, generation } = input;
  const execution = { main: workspaces.ws, scratch: workspaces.scratch };

  const prov = readProvenance(ownProvenance(/** @type {Record<string, any>} */ (generation), puzzle.id),
    new Set([puzzle.id]));
  // The projection holds this puzzle's entry only, so every problem of `generation.made...` is its own (a long id
  // is shortened in the problem's path).
  const recordProblem = prov.problems.some((p) => p.path === 'generation.made'
    || p.path.startsWith('generation.made.'));
  const origin = prov.setOrigin;
  const made = Object.hasOwn(prov.made, puzzle.id) ? prov.made[puzzle.id] : null;
  const running = provenanceVersions();

  // Preflight (no expensive work): which stages can run. 'to-run' never leaves this function.
  /** @type {StageState | 'to-run'} */
  let setState = 'to-run';
  /** @type {string | null} */
  let setReason = null;
  if (origin === null) {
    setState = 'unavailable';
    setReason = 'no-set-origin';
  } else if (!sameVersions(origin.versions, running)) {
    setState = 'unavailable';
    setReason = 'set-versions';
  } else {
    // A level with no piece count for this board cannot have made the set; `setAttempt` would throw for it.
    const counts = pieceCountRange(origin.level, activeCount(set.board));
    if (counts === null || counts.length === 0) {
      setState = 'unavailable';
      setReason = 'no-set-origin';
    }
  }
  /** @type {StageState | 'to-run' | 'calibration'} */
  let candState = 'to-run';
  /** @type {string | null} */
  let candReason = null;
  if (made === null) {
    candState = 'unavailable';
    candReason = recordProblem ? 'record-invalid' : 'no-record';
  } else if (made.kind === 'completion') {
    candState = 'unavailable';
    candReason = 'completion';
  } else if (made.kind === 'calibration') {
    if (setState === 'to-run') {
      candState = 'calibration';
    } else {
      candState = 'unavailable';
      candReason = 'calibration-needs-set';
    }
  } else if (made.skips === 'overflow') {
    candState = 'unavailable';
    candReason = 'overflow';
  } else if (!sameVersions(made.versions, running)) {
    candState = 'unavailable';
    candReason = 'record-versions';
  }

  // The meter and the recorder (RES-29): one unit per rating attempt and uniqueness count (`charge`) and one per
  // event (`record`), the bounds checked at each.
  /** @type {RecordEvent[]} */
  const events = [];
  let retained = 0;
  let work = 0;
  /** @type {'work' | 'steps' | 'bytes' | null} */
  let stopped = null;
  const STOP = {};
  /** @param {number} units */
  const tick = (units) => {
    if (isCancelled()) {
      throw new ReplayCancelledError();
    }
    work += units;
    if (work > limits.work) {
      stopped = 'work';
      throw STOP;
    }
  };
  /** @param {RecordEvent} event */
  const record = (event) => {
    tick(1);
    // The hidden calibration of a candidate puzzle is metered and dropped.
    if ('source' in event && event.source === 'calibration' && made?.kind !== 'calibration') {
      return;
    }
    // One step stays for the final one.
    if (events.length + 1 >= limits.maxSteps) {
      stopped = 'steps';
      throw STOP;
    }
    // The events as one JSON array: its brackets once and a comma before every event but the first.
    const next = retained + utf8Length(JSON.stringify(event)) + (events.length === 0 ? 2 : 1);
    if (next + reserveBytes > limits.maxBytes) {
      stopped = 'bytes';
      throw STOP;
    }
    retained = next;
    events.push(event);
  };

  /** @type {import('./types.js').SetAttemptResult | null} */
  let setRun = null;
  /** @type {import('./types.js').PuzzleCandidate | { fail: string } | null} */
  let candRun = null;
  /** @type {PieceSet | null} */
  let replayedSet = null;
  try {
    // Stages 1-3, and the calibration's clue stages.
    if (setState === 'to-run') {
      const o = /** @type {NonNullable<typeof origin>} */ (origin);
      setRun = setAttempt({
        board: set.board, rotation: 0, levelId: o.level, seedText: o.seed, uniqueness: o.uniqueness, execution,
      }, o.attempt, { record, charge: tick });
      if (setRun.ok) {
        setState = 'replayed';
        replayedSet = setRun.set;
      } else {
        setState = 'mismatch';
      }
    }
    // Stages 4-6.
    if (candState === 'to-run') {
      const m = /** @type {Extract<NonNullable<typeof made>, { kind: 'candidate' }>} */ (made);
      try {
        candRun = puzzleCandidate({
          set: replayedSet ?? set,
          targetLevelId: m.targetLevel,
          quantity: 1,
          batchSeed: m.batchSeed,
          uniqueness: m.uniqueness,
          ...(m.igPrior === null || m.igPrior === undefined ? {} : { igPrior: m.igPrior }),
          seenLayouts: new Set(),
          seenClues: new Set(),
          execution,
        }, m.slot, m.attempt, {
          record, replaySkips: /** @type {Exclude<typeof m.skips, 'overflow'>} */ (m.skips), charge: tick,
        });
        if ('fail' in candRun) {
          candState = 'mismatch';
          candReason = 'candidate-failed';
        } else {
          candState = 'replayed';
        }
      } catch (e) {
        if (!(e instanceof SkipReplayError)) {
          throw e;
        }
        candState = 'mismatch';
        candReason = 'skips';
      }
    }
  } catch (e) {
    if (e !== STOP) {
      throw e;
    }
    return {
      status: 'incomplete',
      reason: stopped,
      stages: {
        set: setState === 'to-run' ? 'stopped' : setState,
        candidate: candState === 'to-run' || candState === 'calibration' ? 'stopped' : candState,
        final: 'not-compared',
      },
      compared: [],
      work,
      events,
      set: replayedSet,
    };
  }

  // The final comparison (RES-29, JC11): exact, field by field, in the order of `compared`.
  const replayedOk = setRun !== null && setRun.ok ? setRun : null;
  const ranSet = replayedOk !== null;
  const produced = candRun !== null && !('fail' in candRun)
    ? { clues: candRun.clues, rating: candRun.rating, solution: candRun.layout }
    : candState === 'calibration' && replayedOk !== null
      ? {
        clues: replayedOk.calibration.clues,
        rating: replayedOk.calibration.rating,
        solution: replayedOk.calibration.solution,
      }
      : null;
  /** @type {string[]} */
  const compared = [];
  /** @type {Set<string>} */
  const failed = new Set();
  let attempted = false;
  /**
   * @param {string} name
   * @param {boolean} ok
   */
  const field = (name, ok) => {
    attempted = true;
    if (ok) {
      compared.push(name);
    } else {
      failed.add(name);
    }
  };
  if (setState === 'mismatch') {
    failed.add('set');
  }
  if (candState === 'mismatch') {
    failed.add(/** @type {string} */ (candReason));
  }
  if (replayedOk !== null) {
    const fresh = replayedOk.set;
    field('board', boardToRows(fresh.board).join('\n') === boardToRows(set.board).join('\n'));
    field('pieces', samePieces(fresh.pieces, set.pieces));
    if (set.witness !== undefined && set.witness !== null) {
      field('witness', fresh.witness !== null
        && samePlacement(fresh.pieces, fresh.witness, set.pieces, set.witness));
    }
  }
  if (produced !== null) {
    const pieces = (replayedSet ?? set).pieces;
    field('clues', samePlacement(pieces, produced.clues, set.pieces, puzzle.clues));
    if (puzzle.rating !== undefined && puzzle.rating !== null) {
      field('rating', sameRating(puzzle.rating, produced.rating));
    }
    if (puzzle.solution !== undefined && puzzle.solution !== null) {
      field('solution', samePlacement(pieces, produced.solution, set.pieces, puzzle.solution));
    }
  }

  /** @type {ReplayRun['status']} */
  let status = 'unavailable';
  /** @type {string | null} */
  let reason = setState === 'unavailable' ? setReason : candReason;
  if (failed.size > 0) {
    status = 'mismatch';
    reason = ['set', 'board', 'pieces', 'witness', 'skips', 'candidate-failed', 'clues', 'rating', 'solution']
      .find((name) => failed.has(name)) ?? null;
  } else if (ranSet && (candState === 'replayed' || candState === 'calibration')) {
    status = 'matched';
    reason = null;
  }
  return {
    status,
    reason,
    stages: {
      set: /** @type {StageState} */ (setState),
      candidate: /** @type {StageState | 'calibration'} */ (candState),
      final: attempted ? 'compared' : 'not-compared',
    },
    compared,
    work,
    events,
    set: replayedSet,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// The steps of the Generation Steps dialog (design §6.12, RES-29, RES-30).

/**
 * One piece on the board of a step: `cells` are its `[x, y]` cells; `id` and `pose` are null for a carved region
 * whose piece is not known (the replayed set is missing).
 * @typedef {object} Placed
 * @property {string | null} id
 * @property {XY[]} cells
 * @property {Pose | null} pose
 */

/**
 * The terms of a `difficulty-v2` score (RES-30): `u = 2 U`, `b = 8 log10(1 + B)` with the frozen v2 constants.
 * @typedef {object} BreakdownV2
 * @property {'difficulty-v2'} model
 * @property {number} u
 * @property {number} b
 * @property {number} score
 */

/**
 * One step of the dialog (RES-29, D33): plain JSON, no text (`note` is a locale key). `stage` is 1 piece count, 2
 * carving, 3 pieces, 4 layout, 5 clue search, 6 uniqueness repair, 7 the stored puzzle; `kind` is the event's kind, or
 * `final`. `rating`, `breakdown`, `detail` and `band` are null where the step has none; a null `breakdown` means that
 * the terms are not available, never that they are zero.
 * @typedef {object} Step
 * @property {1 | 2 | 3 | 4 | 5 | 6 | 7} stage
 * @property {string} kind
 * @property {{ placed: Placed[], lifted: string[], clues: string[] }} board
 * @property {import('./types.js').Rating | RatingClaim | null} rating
 * @property {BreakdownV3 | BreakdownV2 | null} breakdown
 * @property {RatingDetail | null} detail
 * @property {{ min: number, max: number | null } | null} band
 * @property {string} note
 * @property {Record<string, string | number | boolean | null>} args
 */

/**
 * `runReplay`'s fields without the events and the set, and the steps; the last step is always the final one.
 * @typedef {object} ReplayResult
 * @property {ReplayRun['status']} status
 * @property {string | null} reason
 * @property {ReplayRun['stages']} stages
 * @property {string[]} compared
 * @property {number} work
 * @property {Step[]} steps
 */

const V2_WEIGHT_U = 2;
const V2_WEIGHT_B = 8;

/**
 * @param {unknown} v
 * @returns {boolean}
 */
function isNonNegativeFinite(v) {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0;
}

/**
 * The score terms of a rating (RES-30): `breakdownV3` for a `difficulty-v3` rating with metrics, `2 U` and
 * `8 log10(1 + B)` for a `difficulty-v2` rating whose `U` and `B` are valid; null otherwise (no rating, a summary
 * claim, other or opaque metrics, another model, a term that is not finite). Never throws.
 * @param {unknown} rating
 * @returns {BreakdownV3 | BreakdownV2 | null}
 */
function breakdownOf(rating) {
  try {
    if (!isObject(rating) || !isPlainObject(rating.metrics)) {
      return null;
    }
    const metrics = rating.metrics;
    if (rating.model === 'difficulty-v3') {
      const terms = breakdownV3(/** @type {any} */ (metrics));
      const { base, rule, guess, penalty, unrounded, score } = terms;
      return [base, rule, guess, penalty, unrounded, score].every((v) => Number.isFinite(v)) ? terms : null;
    }
    if (rating.model === 'difficulty-v2' && isNonNegativeFinite(metrics.U) && isNonNegativeFinite(metrics.B)) {
      const u = V2_WEIGHT_U * metrics.U;
      const b = V2_WEIGHT_B * Math.log10(1 + metrics.B);
      return Number.isFinite(u) && Number.isFinite(b) ? { model: 'difficulty-v2', u, b, score: rating.score } : null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * @param {unknown} claim
 * @returns {{ min: number, max: number | null } | null} The band of the claim's level; null without a claim or for a
 *   level the engine does not know.
 */
function claimBand(claim) {
  if (!isObject(claim)) {
    return null;
  }
  try {
    const found = level(claim.level);
    return { min: found.min, max: Number.isFinite(found.max) ? found.max : null };
  } catch (e) {
    if (e instanceof RangeError || e instanceof TypeError) {
      return null;
    }
    throw e;
  }
}

/**
 * @param {Pose} pose
 * @returns {Pose} A copy of the five fields of the pose.
 */
function copyPose(pose) {
  return { piece: pose.piece, x: pose.x, y: pose.y, turn: pose.turn, mirrored: pose.mirrored };
}

/**
 * @param {Map<string, Piece>} pieces
 * @param {Pose} pose
 * @returns {Placed} The pose with its cells; a pose that cannot be placed has no cells.
 */
function placedOf(pieces, pose) {
  const piece = pieces.get(pose.piece);
  /** @type {XY[]} */
  let cells = [];
  if (piece !== undefined) {
    try {
      cells = poseCells(piece, pose);
    } catch {
      cells = [];
    }
  }
  return { id: pose.piece, cells, pose: copyPose(pose) };
}

/**
 * @param {XY[]} cells
 * @returns {string} The cells as one sorted key, as `cellsKey` writes it.
 */
function regionKey(cells) {
  return cells.map(([x, y]) => `${x},${y}`).sort().join(';');
}

/**
 * The final step (stage 7): the stored puzzle as `runReplay` was given it. `placed` lists the stored solution, or
 * exactly the stored clues when the puzzle has no solution (a pack written with `omitSolutions`); `rating` is a copy
 * of the stored claim, `breakdown` and `band` follow it, and all three are null for a puzzle that stores no claim.
 * `detail` is null: `args.detailStep` names the step whose detail measured the final puzzle (see `measuringStep`).
 * @param {ReplayInput} input
 * @param {string} status The status of the result.
 * @param {number | null} detailStep
 * @returns {Step}
 */
export function finalStep(input, status, detailStep) {
  const { set, puzzle } = input;
  const claim = isObject(puzzle.rating) ? puzzle.rating : null;
  const pieces = new Map(set.pieces.map((p) => [p.id, p]));
  const stored = Array.isArray(puzzle.solution) ? puzzle.solution : puzzle.clues;
  return {
    stage: 7,
    kind: 'final',
    board: {
      placed: stored.map((pose) => placedOf(pieces, pose)),
      lifted: [],
      clues: puzzle.clues.map((pose) => pose.piece),
    },
    rating: claim === null ? null : JSON.parse(JSON.stringify(claim)),
    breakdown: breakdownOf(claim),
    detail: null,
    band: claimBand(claim),
    note: 'replay.step.final',
    args: { status, detailStep },
  };
}

/**
 * The index of the step whose `detail` measured the final puzzle (SP11), for a matched result: the step of the
 * selected candidate (the `rated` step of the last `selected` step's subset, or the last `repair` step of its
 * repair). Null for a puzzle with no claim or a claim without metrics (a summary claim), when the steps hold no such
 * step, or when its detail is null.
 * @param {Step[]} steps The steps before the final one.
 * @param {ReplayInput['puzzle']} puzzle
 * @returns {number | null}
 */
function measuringStep(steps, puzzle) {
  if (!isObject(puzzle.rating) || !isObject(puzzle.rating.metrics)) {
    return null;
  }
  const selected = steps.findLast((s) => s.kind === 'selected');
  if (selected === undefined) {
    return null;
  }
  const { source, sequence, repairSequence } = selected.args;
  const index = repairSequence === null
    ? steps.findIndex((s) => s.kind === 'rated' && s.args.source === source && s.args.sequence === sequence)
    : steps.findLastIndex((s) => s.kind === 'repair' && s.args.repairSequence === repairSequence);
  return index >= 0 && steps[index].detail !== null ? index : null;
}

/**
 * Builds the steps of a run one event at a time, in the order of the events: the step of an event keeps what the
 * earlier events made known (the accepted regions, the candidate's layout, the clues of a rated subset or a repair).
 * @param {ReplayRun} run
 * @param {ReplayInput} input
 * @returns {(event: RecordEvent) => Step}
 */
export function stepMaker(run, input) {
  // The candidate stage runs on the replayed set, else on the stored one (as `runReplay` does).
  const pieces = new Map((run.set ?? input.set).pieces.map((p) => [p.id, p]));
  const witness = run.set !== null && run.set.witness !== null ? run.set.witness : [];
  /** @type {Map<string, { id: string, pose: Pose }>} */
  const owners = new Map();
  for (const pose of witness) {
    const key = cellsKey(pieces, pose);
    if (key !== null) {
      owners.set(key, { id: pose.piece, pose: copyPose(pose) });
    }
  }
  /** @type {Placed[] | null} */
  let calibration = null;
  /** @type {Placed[]} */
  let regions = [];
  /** @type {Placed[]} */
  let layout = [];
  /** @type {Map<string, string[]>} */
  const rated = new Map();
  /** @type {Map<number, string[]>} */
  const repaired = new Map();

  /**
   * @param {1 | 2 | 3 | 4 | 5 | 6} stage
   * @param {string} kind
   * @param {Placed[]} placed
   * @param {string[]} lifted
   * @param {string[]} clues
   * @param {Pick<Step, 'rating' | 'breakdown' | 'detail' | 'band'>} score
   * @param {Step['args']} args
   * @returns {Step}
   */
  const make = (stage, kind, placed, lifted, clues, score, args) => ({
    stage,
    kind,
    board: { placed, lifted, clues },
    rating: score.rating,
    breakdown: score.breakdown,
    detail: score.detail,
    band: score.band,
    note: `replay.step.${kind}`,
    args,
  });
  const none = { rating: null, breakdown: null, detail: null, band: null };
  /**
   * @param {{ source: 'calibration' | 'candidate' }} event
   * @returns {Placed[]} The layout the clue stages draw: the candidate's, or the replayed set's witness for the
   *   calibration puzzle.
   */
  const layoutOf = (event) => {
    if (event.source !== 'calibration') {
      return layout;
    }
    calibration ??= witness.map((pose) => placedOf(pieces, pose));
    return calibration;
  };
  /** @param {{ min: number, max: number | null }} band */
  const bandOf = (band) => ({ min: band.min, max: band.max });
  /** @param {Pose[]} poses */
  const idsOf = (poses) => poses.map((pose) => pose.piece);

  return (event) => {
    switch (event.kind) {
      case 'count':
        return make(1, 'count', [], [], [], none, {
          k: event.k,
          min: event.range.length > 0 ? Math.min(...event.range) : null,
          max: event.range.length > 0 ? Math.max(...event.range) : null,
        });
      case 'carve':
        return make(2, 'carve', [], [], [], none, {
          mode: event.mode,
          parts: event.parts === null ? 0 : event.parts.length,
        });
      case 'piece': {
        const owner = owners.get(regionKey(event.cells));
        regions = [...regions, {
          id: owner === undefined ? null : owner.id,
          cells: event.cells.map(([x, y]) => [x, y]),
          pose: owner === undefined ? null : owner.pose,
        }];
        return make(3, 'piece', regions, [], [], none, { n: regions.length });
      }
      case 'start':
        layout = event.layout.map((pose) => placedOf(pieces, pose));
        return make(4, 'start', layout, [], [], none, { start: event.start });
      case 'retile':
        layout = event.layout.map((pose) => placedOf(pieces, pose));
        return make(4, 'retile', layout, event.liftedIds.slice(), [], none, {
          step: event.step,
          lifted: event.liftedIds.length,
          changed: event.changed,
        });
      case 'rated':
        rated.set(`${event.source}|${event.sequence}`, event.clueIds);
        return make(5, 'rated', layoutOf(event), [], event.clueIds.slice(), {
          rating: event.rating, breakdown: breakdownOf(event.rating), detail: event.detail, band: bandOf(event.band),
        }, { sequence: event.sequence, phase: event.phase, source: event.source });
      case 'skip':
        return make(5, 'skip', layoutOf(event), [], [], none, { sequence: event.sequence, source: event.source });
      case 'budget':
        return make(5, 'budget', layoutOf(event), [], [], none, { source: event.source });
      case 'no-window':
        return make(5, 'noWindow', layoutOf(event), [], [], none, { side: event.side, source: event.source });
      case 'unrateable':
        return make(5, 'unrateable', layoutOf(event), [], event.clueIds.slice(), {
          rating: null, breakdown: null, detail: null, band: bandOf(event.band),
        }, { sequence: event.sequence, phase: event.phase, source: event.source, reason: event.reason });
      case 'rejected':
        return make(5, 'rejected', layoutOf(event), [], event.clueIds.slice(), {
          rating: event.rating, breakdown: breakdownOf(event.rating), detail: event.detail, band: bandOf(event.band),
        }, { sequence: event.sequence, phase: event.phase, source: event.source, reason: event.reason });
      case 'repair':
        repaired.set(event.repairSequence, idsOf(event.clues));
        return make(6, 'repair', layoutOf(event), [], idsOf(event.clues), {
          rating: event.rating, breakdown: breakdownOf(event.rating), detail: event.detail, band: null,
        }, {
          repairSequence: event.repairSequence,
          added: event.addedId,
          accepted: event.accepted,
          reason: event.reason ?? null,
        });
      case 'selected': {
        const clues = event.repairSequence === null
          ? rated.get(`${event.source}|${event.sequence}`)
          : repaired.get(event.repairSequence);
        return make(5, 'selected', layoutOf(event), [], clues === undefined ? [] : clues.slice(), none, {
          sequence: event.sequence, repairSequence: event.repairSequence, source: event.source,
        });
      }
      default:
        throw new Error(`unknown replay event ${JSON.stringify(/** @type {any} */ (event).kind)}`);
    }
  };
}

/**
 * Replays one generated puzzle and returns the steps the Generation Steps dialog plays (RES-29, design §6.12): one
 * step for each recorded event, in the order they were recorded, then the final step (stage 7: the stored puzzle).
 * The status, reason, stages, `compared` and `work` are `runReplay`'s, except that steps cut by `maxBytes` make the
 * result `incomplete` (reason `bytes`, nothing compared, `stages.final` `not-compared`), unless it already was.
 *
 * The bytes: `utf8Length(JSON.stringify(steps))` never exceeds `limits.maxBytes`. The final step is always present,
 * so its largest form, with the longest status and the longest `detailStep`, and the brackets of the array are kept
 * free in advance; a limit that cannot hold them is refused before anything runs.
 * @param {ReplayInput} input As `runReplay`.
 * @param {{ ws: Workspace, scratch: Workspace }} workspaces
 * @param {ReplayLimits} [limits]
 * @param {() => boolean} [isCancelled] Checked at every metered unit; true throws `ReplayCancelledError`.
 * @returns {ReplayResult}
 * @throws {RangeError} The input or the limits are malformed, or `maxBytes` cannot hold the final step.
 */
export function replayPuzzle(input, workspaces, limits = REPLAY, isCancelled = () => false) {
  checkInput(input);
  checkLimits(limits, 0);
  // A measuring step is an event step, so its index is at most `maxSteps - 2`.
  const finalBytes = Math.max(
    utf8Length(JSON.stringify(finalStep(input, 'unavailable', null))),
    limits.maxSteps >= 2 ? utf8Length(JSON.stringify(finalStep(input, 'unavailable', limits.maxSteps - 2))) : 0,
  );
  const reserve = finalBytes + 2;
  if (reserve > limits.maxBytes) {
    throw new RangeError('maxBytes cannot hold the final step');
  }
  const run = runReplay(input, workspaces, limits, isCancelled, reserve);

  /** @type {Step[]} */
  const steps = [];
  const next = stepMaker(run, input);
  let bytes = reserve;
  let cut = false;
  for (const event of run.events) {
    const step = next(event);
    // The step and the comma after it: the final step always follows.
    const size = utf8Length(JSON.stringify(step)) + 1;
    if (bytes + size > limits.maxBytes) {
      cut = true;
      break;
    }
    steps.push(step);
    bytes += size;
  }
  let { status, reason, stages, compared } = run;
  if (cut && status !== 'incomplete') {
    status = 'incomplete';
    reason = 'bytes';
    stages = { ...stages, final: 'not-compared' };
    compared = [];
  }
  steps.push(finalStep(input, status, status === 'matched' ? measuringStep(steps, input.puzzle) : null));
  return { status, reason, stages, compared, work: run.work, steps };
}
