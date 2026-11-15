// @ts-check
// Replay of one generated puzzle from its record (design §6.12, RES-29): the preflight of the record and the code
// versions, the two stage runs (the piece set, then the candidate), the work meter and the bounds, and the exact final
// comparison with the stored puzzle. Pure: no DOM, storage, clock or randomness; every result is a function of the
// input, the limits and `isCancelled`.

import { activeCount, boardToRows } from './board.js';
import { SkipReplayError } from './clues.js';
import { canonicalKey, poseCells } from './geometry.js';
import { provenanceVersions, puzzleCandidate, setAttempt } from './generate.js';
import { readProvenance } from './pack.js';
import { pieceCountRange, REPLAY } from './policy.js';

/** @typedef {import('./types.js').Piece} Piece */
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
function sameVersions(a, b) {
  return a.algo === b.algo && a.policy === b.policy && a.rng === b.rng && a.seedScheme === b.seedScheme
    && a.ratingModel === b.ratingModel;
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
