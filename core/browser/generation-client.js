// @ts-check
// Generation orchestration (design §6.5, §6.9, §8.2, §8.6; D41). One browser-neutral
// client drives the worker pool for the Generator, the Node tests and the CLI:
// it schedules piece-set attempts and batch candidates, feeds the deterministic
// fold of `generate.js`, streams accepted puzzles and packages only accepted
// data. It touches no DOM or storage and reads its clock for deadlines and
// metadata only; the pool owns the 115 s watchdog.

import { activeCount, boardFromRows, boardToRows, validateForGeneration } from '../engine/board.js';
import { countRowLimit } from '../engine/clues.js';
import {
  candidateContext, dispatchOrder, foldAccept, foldNext, foldStart, GenerationError as HistoryError,
} from '../engine/generate.js';
import { puzzleId } from '../engine/keys.js';
import { level } from '../engine/levels.js';
import { createPack, validatePackSliced } from '../engine/pack.js';
import { pieceCountRange, POLICY_ID } from '../engine/policy.js';
import { batchSeedFor, normalizeSeedText, RNG_ID, SEED_SCHEME } from '../engine/rng.js';
import { isValidLayout } from '../engine/tiling.js';
import { ALGO_ID, APP_VERSION } from '../engine/version.js';
import { isAbortError, PoolError, systemClock, WorkerTaskError } from './worker-pool.js';

/** @typedef {import('../engine/types.js').Board} Board */
/** @typedef {import('../engine/types.js').Certificate} Certificate */
/** @typedef {import('../engine/types.js').Issue} Issue */
/** @typedef {import('../engine/types.js').Pack} Pack */
/** @typedef {import('../engine/types.js').PieceSet} PieceSet */
/** @typedef {import('../engine/types.js').Pose} Pose */
/** @typedef {import('../engine/types.js').Puzzle} Puzzle */
/** @typedef {import('../engine/types.js').PuzzleCandidate} PuzzleCandidate */
/** @typedef {import('./worker-pool.js').Clock} Clock */
/** @typedef {import('./worker-pool.js').Pool} Pool */

/**
 * @typedef {object} SetInput
 * @property {string[]} boardRows `#` active, `.` blocked; never changed implicitly.
 * @property {number} rotation Presentation only: 0, 45, ... 315 counter-clockwise degrees.
 * @property {string} levelId
 * @property {string} seedText Already normalized set seed.
 * @property {'any' | 'require'} uniqueness
 * @property {number} maxActive Enabled active-cell cap of the device (the board minimum is 30).
 * @property {string} [revision] Owner tag echoed by every hook; defaults to `g<requestId>`.
 */

/**
 * @typedef {object} BatchInput
 * @property {PieceSet} set
 * @property {number} rotation
 * @property {string} targetLevelId
 * @property {number} quantity 1-10.
 * @property {string} setSeed Already normalized set seed.
 * @property {number} batchIndex One-based request number on this set; the UI counts every request.
 * @property {'any' | 'require'} uniqueness
 * @property {number} [displayOffset] Visible puzzle count for Add more; defaults to 0.
 * @property {string[]} seenLayouts Session history, at most 1,000 keys.
 * @property {string[]} seenClues
 * @property {Puzzle} [calibration] Engine-produced puzzle of this set (never a stored claim).
 * @property {string} [setLevel] Provenance only.
 * @property {number} [setAttempt] Provenance only.
 * @property {string} [revision]
 */

/**
 * @typedef {object} GenerationProgress
 * @property {string} revision
 * @property {'set' | 'batch'} job
 * @property {string} stage `carving`, `candidate`, or a worker stage such as `memory`.
 * @property {number} [attempt] Set attempt, or candidate attempt within the slot.
 * @property {number} [slot] One-based batch slot.
 * @property {number} [accepted] Accepted puzzles so far (batch).
 * @property {number} [quantity]
 * @property {number} elapsedMs
 * @property {number} [bytes]
 * @property {number} [rowTrials]
 */

/**
 * @typedef {object} AcceptedEvent
 * @property {string} revision
 * @property {number} index Zero-based position in this batch.
 * @property {Puzzle} puzzle
 * @property {number} accepted
 * @property {number} quantity
 */

/**
 * Lazy certificate of an accepted puzzle; sent only while its request is still the latest.
 * @typedef {object} CertificateEvent
 * @property {string} revision
 * @property {string} puzzleId
 * @property {Certificate} certificate
 */

/**
 * @typedef {object} GenerationHooks
 * @property {(progress: GenerationProgress) => void} [onProgress]
 * @property {(event: AcceptedEvent) => void} [onAccepted]
 * @property {(event: CertificateEvent) => void} [onCertificate]
 */

/**
 * `failed` carries `reason` `time-limit`, `attempts-exhausted` (only with `maxSetAttempts`).
 * @typedef {object} SetJobResult
 * @property {'complete' | 'failed' | 'cancelled'} status
 * @property {PieceSet} [set]
 * @property {Puzzle} [calibration] Becomes puzzle #1 only when the matching first batch accepts it.
 * @property {number} [attempt] Lowest successful attempt index.
 * @property {Pack} [pack] Kind `piece-set`, no puzzles.
 * @property {string} [reason]
 * @property {Record<string, number>} [failures] Failed attempts by engine reason.
 */

/**
 * @typedef {object} BatchJobResult
 * @property {'complete' | 'partial' | 'cancelled'} status
 * @property {Pack} [pack] Present when at least one puzzle was accepted.
 * @property {Puzzle[]} accepted
 * @property {string[]} seenLayouts
 * @property {string[]} seenClues
 * @property {'layouts-not-found' | 'difficulty-not-found' | 'uniqueness-not-proved' | 'time-limit'} [reason]
 */

/**
 * @typedef {object} GenerationClient
 * @property {(input: SetInput, hooks?: GenerationHooks) => Promise<SetJobResult>} generateSet
 * @property {(input: BatchInput, hooks?: GenerationHooks) => Promise<BatchJobResult>} generateBatch
 * @property {() => void} cancel
 * @property {() => void} recycle
 */

/**
 * @typedef {object} Job
 * @property {number} requestId
 * @property {string} revision
 * @property {number} startedAt
 * @property {boolean} running
 * @property {boolean} cancelled Cancel, supersession or a closed pool.
 * @property {boolean} timedOut
 * @property {(() => void) | null} wake
 */

export const MAX_BATCH = 10;
const MIN_ACTIVE_CAP = 30;
const MAX_ACTIVE_CAP = 676;
const REVISION_MAX = 128;

/**
 * Typed fault of a generation request. `code` is `invalid-board`, `invalid-input`,
 * `level-unavailable`, `history-full`, a worker code such as `model-too-large`, a
 * pool code such as `worker-crashed` or `internal`. `accepted` and the history
 * arrays hold what the request had already produced, so the UI keeps that prefix.
 */
export class GenerationError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   * @param {{ issues?: Issue[], accepted?: Puzzle[], seenLayouts?: string[], seenClues?: string[] }} [detail]
   */
  constructor(code, message, detail = {}) {
    super(message);
    this.name = 'GenerationError';
    this.code = code;
    this.issues = detail.issues ?? [];
    this.accepted = detail.accepted ?? [];
    this.seenLayouts = detail.seenLayouts ?? [];
    this.seenClues = detail.seenClues ?? [];
  }
}

/**
 * @param {unknown} v
 * @returns {v is Record<string, any>}
 */
const isObject = (v) => typeof v === 'object' && v !== null;

/**
 * @param {unknown} value
 * @param {string} name
 * @returns {'any' | 'require'}
 */
function checkedUniqueness(value, name) {
  if (value !== 'any' && value !== 'require') {
    throw new GenerationError('invalid-input', `${name} must be "any" or "require"`);
  }
  return value;
}

/**
 * @param {unknown} value
 * @returns {number}
 */
function checkedRotation(value) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value >= 360 || value % 45 !== 0) {
    throw new GenerationError('invalid-input', 'rotation must be 0, 45, 90, ... or 315');
  }
  return value;
}

/**
 * @param {unknown} value
 * @param {string} name
 * @returns {string}
 */
function checkedSeed(value, name) {
  try {
    if (typeof value === 'string' && normalizeSeedText(value) === value) {
      return value;
    }
  } catch {
    // reported below
  }
  throw new GenerationError('invalid-input', `${name} must be a normalized seed of 1 to 64 characters`);
}

/**
 * @param {unknown} value
 * @param {string} name
 * @returns {string}
 */
function checkedLevel(value, name) {
  try {
    return level(/** @type {string} */ (value)).id;
  } catch {
    throw new GenerationError('invalid-input', `${name} is not a known level`);
  }
}

/**
 * @param {unknown} value
 * @returns {string[]}
 */
function checkedKeys(value) {
  if (!Array.isArray(value) || value.some((key) => typeof key !== 'string')) {
    throw new GenerationError('invalid-input', 'history must be an array of key strings');
  }
  return value.slice();
}

/**
 * @param {unknown} revision
 * @param {number} requestId
 * @returns {string}
 */
function revisionOf(revision, requestId) {
  if (revision === undefined) {
    return `g${requestId}`;
  }
  if (typeof revision !== 'string' || revision.length === 0 || revision.length > REVISION_MAX) {
    throw new GenerationError('invalid-input', 'revision must be a nonempty string');
  }
  return revision;
}

/**
 * Wire form of a piece set for `puzzleCandidate` payloads.
 * @param {PieceSet} set
 * @returns {object}
 */
function wireSet(set) {
  return {
    boardRows: boardToRows(set.board),
    pieces: set.pieces,
    witness: set.witness,
    carving: set.carving,
    macroRegion: set.macroRegion,
  };
}

/**
 * Display callbacks never break a job.
 * @template T
 * @param {((value: T) => void) | undefined} fn
 * @param {T} value
 */
function emit(fn, value) {
  try {
    fn?.(value);
  } catch {
    // a faulty UI callback must not affect generation
  }
}

/**
 * @param {unknown} error
 * @param {ConstructorParameters<typeof GenerationError>[2]} detail
 * @returns {GenerationError}
 */
function toFault(error, detail) {
  if (error instanceof GenerationError) {
    return error;
  }
  if (error instanceof WorkerTaskError || error instanceof PoolError) {
    return new GenerationError(error.code, error.message, { ...detail, issues: error.issues });
  }
  const message = error instanceof Error ? error.message : 'The generation request failed';
  return new GenerationError('internal', message.slice(0, 500), detail);
}

/**
 * Generation provenance of a pack (design §5.5); `createdAt` is host-supplied.
 * @param {object} p
 * @param {string} p.setSeed
 * @param {string} [p.setLevel]
 * @param {number} [p.setAttempt]
 * @param {PieceSet} p.set
 * @param {'any' | 'require'} p.uniqueness
 * @param {string} p.createdAt
 * @param {{ batchSeed: string, batchLevel: string, batchIndex: number }} [p.batch]
 * @returns {object}
 */
function generationMeta(p) {
  /** @type {Record<string, unknown>} */
  const meta = {
    app: `pentomino-generator/${APP_VERSION}`,
    algo: ALGO_ID,
    policy: POLICY_ID,
    rng: RNG_ID,
    seedScheme: SEED_SCHEME,
    setSeed: p.setSeed,
  };
  if (p.setLevel !== undefined) {
    meta.setLevel = p.setLevel;
  }
  if (p.setAttempt !== undefined) {
    meta.setAttempt = p.setAttempt;
  }
  meta.carving = p.set.carving;
  if (p.set.carving === 'macro' && p.set.macroRegion !== null) {
    meta.macroRegion = p.set.macroRegion.slice();
  }
  if (p.batch !== undefined) {
    Object.assign(meta, p.batch);
  }
  meta.uniqueness = p.uniqueness;
  meta.createdAt = p.createdAt;
  return meta;
}

/** Lets the host run other tasks between slices of main-thread work. */
const pauseForHost = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Builds and validates a pack from engine objects, validating in slices so the main thread
 * stays under one frame budget; an invalid result is an internal fault, never a usable pack.
 * @param {Parameters<typeof createPack>[0]} parts
 * @param {ConstructorParameters<typeof GenerationError>[2]} detail
 * @returns {Promise<Pack>}
 */
async function assemblePack(parts, detail) {
  let checked;
  try {
    checked = await validatePackSliced(createPack(parts), pauseForHost);
  } catch (e) {
    throw new GenerationError('internal', e instanceof Error ? e.message.slice(0, 500) : 'The pack could not be built', detail);
  }
  if (!checked.ok) {
    throw new GenerationError('internal', 'The generated pack failed validation', { ...detail, issues: checked.issues });
  }
  return checked.value;
}

/**
 * @param {unknown} v
 * @returns {boolean}
 */
const isCertificate = (v) => isObject(v) && typeof v.status === 'string';

/**
 * A reusable calibration puzzle must be self-consistent: a valid full layout
 * that contains every clue pose. Anything else is ignored, never repaired.
 * @param {PieceSet} set
 * @param {Puzzle | undefined} cal
 * @returns {Puzzle | undefined}
 */
function usableCalibration(set, cal) {
  if (!isObject(cal) || !Array.isArray(cal.clues) || !Array.isArray(cal.solution) || !isObject(cal.rating)) {
    return undefined;
  }
  if (!isValidLayout(set.board, set.pieces, cal.solution)) {
    return undefined;
  }
  const byPiece = new Map(cal.solution.map((pose) => [pose.piece, pose]));
  const same = cal.clues.every((c) => {
    const s = byPiece.get(c.piece);
    return s !== undefined && s.x === c.x && s.y === c.y && s.turn === c.turn && s.mirrored === c.mirrored;
  });
  return same ? cal : undefined;
}

/**
 * @param {Pool} pool
 * @param {{ clock?: Clock, createdAt?: () => string, maxSetAttempts?: number }} [options] `createdAt` supplies the
 *   metadata timestamp; `maxSetAttempts` (default unbounded) ends a set request as `attempts-exhausted`.
 * @returns {GenerationClient}
 */
export function createGenerationClient(pool, options = {}) {
  const clock = options.clock ?? systemClock;
  const createdAt = options.createdAt ?? (() => new Date().toISOString());
  let lastRequestId = 0;
  /** @type {Job | null} */
  let latest = null;

  /** @param {string | undefined} revision @returns {Job} */
  function begin(revision) {
    const requestId = lastRequestId + 1;
    const tag = revisionOf(revision, requestId);
    /** @type {Job} */
    const job = { requestId, revision: tag, startedAt: clock.now(), running: true, cancelled: false, timedOut: false, wake: null };
    pool.beginRequest({
      requestId,
      revision: tag,
      onTimeout: () => {
        job.timedOut = true;
        job.wake?.();
      },
    });
    lastRequestId = requestId;
    latest = job;
    return job;
  }

  /**
   * Leaves the pool request and releases leftover speculation.
   * @param {Job} job
   */
  function finish(job) {
    job.running = false;
    pool.endRequest(job.requestId);
  }

  /** @param {Job} job @returns {Promise<void>} */
  const waitEvent = (job) => new Promise((resolve) => {
    job.wake = () => {
      job.wake = null;
      resolve();
    };
  });

  /**
   * One pool task of a job; a recycled worker restarts the same deterministic task.
   * @param {Job} job
   * @param {'setAttempt' | 'puzzleCandidate' | 'certify'} kind
   * @param {object} payload
   * @param {AbortSignal | undefined} signal
   * @param {(p: { stage: string, rowTrials: number, bytes: number }) => void} [onProgress]
   * @returns {Promise<unknown>}
   */
  async function runTask(job, kind, payload, signal, onProgress) {
    for (;;) {
      try {
        return await pool.run({ requestId: job.requestId, revision: job.revision, kind, payload, signal }, onProgress);
      } catch (e) {
        if (isAbortError(e) && e.reason === 'recycled' && !job.cancelled && signal?.aborted !== true) {
          continue;
        }
        throw e;
      }
    }
  }

  /**
   * Maps an aborted or failed task to the job's stop reason, or throws the fault.
   * @param {Job} job
   * @param {unknown} error
   * @param {ConstructorParameters<typeof GenerationError>[2]} detail
   * @returns {'time-limit' | 'cancelled'}
   */
  function stopReason(job, error, detail) {
    if (isAbortError(error)) {
      if (error.reason === 'deadline') {
        job.timedOut = true;
        return 'time-limit';
      }
      job.cancelled = true;
      return 'cancelled';
    }
    throw toFault(error, detail);
  }

  /**
   * @param {SetInput} input
   * @returns {{ board: Board, rotation: number, seedText: string, levelId: string, uniqueness: 'any' | 'require' }}
   */
  function checkSet(input) {
    if (!isObject(input)) {
      throw new GenerationError('invalid-input', 'The set request must be an object');
    }
    const cap = input.maxActive;
    if (!Number.isInteger(cap) || cap < MIN_ACTIVE_CAP || cap > MAX_ACTIVE_CAP) {
      throw new GenerationError('invalid-input', `maxActive must be an integer from ${MIN_ACTIVE_CAP} to ${MAX_ACTIVE_CAP}`);
    }
    let board;
    try {
      board = boardFromRows(input.boardRows);
    } catch (e) {
      throw new GenerationError('invalid-board', e instanceof Error ? e.message : 'The board is invalid');
    }
    const { errors } = validateForGeneration(board, cap);
    if (errors.length > 0) {
      throw new GenerationError('invalid-board', errors[0].message, { issues: errors });
    }
    const levelId = checkedLevel(input.levelId, 'levelId');
    const area = activeCount(board);
    const counts = pieceCountRange(levelId, area);
    if (counts === null || counts.length === 0) {
      throw new GenerationError('level-unavailable', `${level(levelId).label} is not offered for a board of ${area} cells`);
    }
    return {
      board,
      rotation: checkedRotation(input.rotation),
      seedText: checkedSeed(input.seedText, 'seedText'),
      levelId,
      uniqueness: checkedUniqueness(input.uniqueness, 'uniqueness'),
    };
  }

  /**
   * @param {SetInput} input
   * @param {GenerationHooks} hooks
   * @returns {Promise<SetJobResult>}
   */
  async function generateSet(input, hooks = {}) {
    const request = checkSet(input);
    const maxAttempts = options.maxSetAttempts ?? Infinity;
    const job = begin(input.revision);
    const { board, levelId, seedText, uniqueness, rotation } = request;
    const boardRows = boardToRows(board);
    const size = pool.size;
    /** @type {Map<number, { kind: 'ok', value: any } | { kind: 'fail', reason: string } | { kind: 'fault', error: unknown } | { kind: 'skipped' }>} */
    const results = new Map();
    /** @type {Map<number, AbortController>} */
    const inflight = new Map();
    let next = 0;
    let winner = -1;

    /** @param {number} j */
    const launch = (j) => {
      const controller = new AbortController();
      inflight.set(j, controller);
      const payload = { boardRows, rotation, levelId, seedText, uniqueness, attempt: j };
      const progress = (/** @type {{ stage: string, rowTrials: number, bytes: number }} */ p) => emit(hooks.onProgress, {
        revision: job.revision, job: /** @type {const} */ ('set'), stage: p.stage, attempt: j,
        elapsedMs: clock.now() - job.startedAt, bytes: p.bytes, rowTrials: p.rowTrials,
      });
      runTask(job, 'setAttempt', payload, controller.signal, progress).then((value) => {
        inflight.delete(j);
        if (!isObject(value) || typeof value.ok !== 'boolean') {
          results.set(j, { kind: 'fault', error: new GenerationError('internal', 'The worker sent an invalid piece-set result') });
        } else if (value.ok) {
          results.set(j, { kind: 'ok', value });
          if (winner < 0 || j < winner) {
            winner = j;
            for (const [k, c] of inflight) {
              if (k > j) {
                c.abort();
              }
            }
          }
        } else {
          results.set(j, { kind: 'fail', reason: String(value.reason) });
        }
        emit(hooks.onProgress, {
          revision: job.revision, job: /** @type {const} */ ('set'), stage: 'carving', attempt: j, elapsedMs: clock.now() - job.startedAt,
        });
        job.wake?.();
      }, (error) => {
        inflight.delete(j);
        if (isAbortError(error) && controller.signal.aborted && error.reason === 'cancelled') {
          results.set(j, { kind: 'skipped' });
        } else {
          results.set(j, { kind: 'fault', error });
        }
        job.wake?.();
      });
    };

    /** @returns {Record<string, number>} */
    const tally = () => {
      /** @type {Record<string, number>} */
      const counts = {};
      for (const r of results.values()) {
        if (r.kind === 'fail') {
          counts[r.reason] = (counts[r.reason] ?? 0) + 1;
        }
      }
      return counts;
    };

    try {
      for (;;) {
        if (job.cancelled) {
          return { status: 'cancelled' };
        }
        if (job.timedOut) {
          return { status: 'failed', reason: 'time-limit', failures: tally() };
        }
        // The lowest successful attempt wins: scan the resolved prefix in order.
        for (let j = 0; ; j += 1) {
          const r = results.get(j);
          if (r === undefined) {
            break;
          }
          if (r.kind === 'fault') {
            const reason = stopReason(job, r.error, {});
            return reason === 'cancelled' ? { status: 'cancelled' } : { status: 'failed', reason, failures: tally() };
          }
          if (r.kind === 'ok') {
            return await finishSet(request, r.value);
          }
          if (r.kind === 'skipped') {
            break;
          }
        }
        while (winner < 0 && inflight.size < size && next < maxAttempts) {
          launch(next);
          next += 1;
        }
        if (inflight.size === 0 && winner < 0 && next >= maxAttempts) {
          return { status: 'failed', reason: 'attempts-exhausted', failures: tally() };
        }
        await waitEvent(job);
      }
    } finally {
      for (const c of inflight.values()) {
        c.abort();
      }
      finish(job);
    }
  }

  /**
   * @param {{ board: Board, rotation: number, seedText: string, levelId: string, uniqueness: 'any' | 'require' }} request
   * @param {any} value Successful setAttempt result.
   * @returns {Promise<SetJobResult>}
   */
  async function finishSet(request, value) {
    const { board } = request;
    const raw = value.set;
    if (!isObject(raw) || !Array.isArray(raw.pieces) || !isObject(value.calibration)) {
      throw new GenerationError('internal', 'The worker sent an invalid piece set');
    }
    /** @type {PieceSet} */
    const set = {
      board,
      pieces: raw.pieces,
      witness: Array.isArray(raw.witness) ? raw.witness : null,
      carving: raw.carving,
      macroRegion: Array.isArray(raw.macroRegion) ? raw.macroRegion : null,
    };
    if (set.witness === null || !isValidLayout(board, set.pieces, set.witness)) {
      throw new GenerationError('internal', 'The worker sent a piece set without a valid witness layout');
    }
    const pack = await assemblePack({
      board,
      rotation: request.rotation,
      pieces: set.pieces,
      witness: set.witness,
      puzzles: [],
      generation: generationMeta({
        setSeed: request.seedText,
        setLevel: request.levelId,
        setAttempt: value.attempt,
        set,
        uniqueness: request.uniqueness,
        createdAt: createdAt(),
      }),
    }, {});
    return { status: 'complete', set, calibration: value.calibration, attempt: value.attempt, pack };
  }

  /**
   * @param {BatchInput} input
   * @returns {{ set: PieceSet, rotation: number, level: string, quantity: number, setSeed: string, batchSeed: string,
   *   uniqueness: 'any' | 'require', offset: number, seenLayouts: string[], seenClues: string[], calibration: Puzzle | undefined }}
   */
  function checkBatch(input) {
    if (!isObject(input) || !isObject(input.set) || !Array.isArray(input.set.pieces)) {
      throw new GenerationError('invalid-input', 'The batch request needs a piece set');
    }
    const history = { seenLayouts: Array.isArray(input.seenLayouts) ? input.seenLayouts.slice() : [], seenClues: Array.isArray(input.seenClues) ? input.seenClues.slice() : [] };
    try {
      const { set } = input;
      boardToRows(set.board);
      const setSeed = checkedSeed(input.setSeed, 'setSeed');
      const seenLayouts = checkedKeys(input.seenLayouts);
      const seenClues = checkedKeys(input.seenClues);
      const offset = input.displayOffset ?? 0;
      if (!Number.isSafeInteger(offset) || offset < 0) {
        throw new GenerationError('invalid-input', 'displayOffset must be a nonnegative integer');
      }
      const quantity = input.quantity;
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_BATCH) {
        throw new GenerationError('invalid-input', `quantity must be an integer from 1 to ${MAX_BATCH}`);
      }
      let batchSeed;
      try {
        batchSeed = batchSeedFor(setSeed, input.batchIndex);
      } catch {
        throw new GenerationError('invalid-input', 'batchIndex must be a positive integer');
      }
      return {
        set,
        rotation: checkedRotation(input.rotation),
        level: checkedLevel(input.targetLevelId, 'targetLevelId'),
        quantity,
        setSeed,
        batchSeed,
        uniqueness: checkedUniqueness(input.uniqueness, 'uniqueness'),
        offset,
        seenLayouts,
        seenClues,
        calibration: usableCalibration(set, input.calibration),
      };
    } catch (e) {
      if (e instanceof GenerationError) {
        throw new GenerationError(e.code, e.message, { ...history, issues: e.issues });
      }
      throw new GenerationError('invalid-input', 'The batch request is invalid', history);
    }
  }

  /**
   * @param {BatchInput} input
   * @param {GenerationHooks} hooks
   * @returns {Promise<BatchJobResult>}
   */
  async function generateBatch(input, hooks = {}) {
    const request = checkBatch(input);
    const { set, level: levelId, quantity, batchSeed, uniqueness } = request;
    const label = level(levelId).label;
    /** @type {import('../engine/types.js').BatchContext} */
    const ctx = {
      set,
      targetLevelId: levelId,
      quantity,
      batchSeed,
      uniqueness,
      seenLayouts: new Set(request.seenLayouts),
      seenClues: new Set(request.seenClues),
      calibration: request.calibration,
      // The fold never touches workspaces; candidates get theirs inside the workers.
      execution: /** @type {any} */ ({}),
    };
    /** @type {import('../engine/generate.js').FoldState} */
    let state;
    try {
      state = foldStart(ctx);
    } catch (e) {
      const detail = { seenLayouts: request.seenLayouts, seenClues: request.seenClues };
      if (e instanceof HistoryError) {
        throw new GenerationError('history-full', e.message, detail);
      }
      throw new GenerationError('invalid-input', e instanceof Error ? e.message : 'The batch request is invalid', detail);
    }
    const job = begin(input.revision);
    const frozen = candidateContext(ctx, state);
    const base = {
      set: wireSet(set),
      targetLevelId: levelId,
      quantity,
      batchSeed,
      uniqueness,
      seenLayouts: [...frozen.seenLayouts],
      seenClues: [...frozen.seenClues],
    };
    /** @type {Map<string, { done: boolean, ok?: boolean, value?: unknown, error?: unknown }>} */
    const cache = new Map();
    const controller = new AbortController();
    /** @type {Puzzle[]} */
    const accepted = [];
    let inflight = 0;
    /** @type {'complete' | 'partial' | 'cancelled'} */
    let status = 'partial';
    /** @type {BatchJobResult['reason']} */
    let reason;
    const detail = () => ({ accepted: accepted.slice(), seenLayouts: [...state.seenLayouts], seenClues: [...state.seenClues] });
    const elapsed = () => clock.now() - job.startedAt;
    /** @param {Partial<GenerationProgress>} extra */
    const progress = (extra) => emit(hooks.onProgress, {
      revision: job.revision,
      job: /** @type {const} */ ('batch'),
      stage: 'candidate',
      accepted: accepted.length,
      quantity,
      elapsedMs: elapsed(),
      ...extra,
    });
    /** @param {number} slot @param {number} attempt */
    const key = (slot, attempt) => `${slot}/${attempt}`;

    /** @param {{ slot: number, attempt: number }} next */
    const launch = ({ slot, attempt }) => {
      /** @type {{ done: boolean, ok?: boolean, value?: unknown, error?: unknown }} */
      const entry = { done: false };
      cache.set(key(slot, attempt), entry);
      inflight += 1;
      const onWorker = (/** @type {{ stage: string, rowTrials: number, bytes: number }} */ p) => progress({
        stage: p.stage, slot, attempt, bytes: p.bytes, rowTrials: p.rowTrials,
      });
      runTask(job, 'puzzleCandidate', { ...base, slot, attempt }, controller.signal, onWorker).then((value) => {
        Object.assign(entry, { done: true, ok: true, value });
        inflight -= 1;
        job.wake?.();
      }, (error) => {
        Object.assign(entry, { done: true, ok: false, error });
        inflight -= 1;
        job.wake?.();
      });
    };

    /** @param {PuzzleCandidate} candidate */
    const accept = (candidate) => {
      const puzzle = {
        id: puzzleId(set.board, set.pieces, candidate.clues),
        title: `${label} #${request.offset + accepted.length + 1}`,
        clues: candidate.clues,
        solution: candidate.layout,
        rating: candidate.rating,
        certificate: candidate.certificate ?? null,
      };
      accepted.push(puzzle);
      emit(hooks.onAccepted, { revision: job.revision, index: accepted.length - 1, puzzle, accepted: accepted.length, quantity });
    };

    /**
     * Checks a candidate result the fold is about to consume.
     * @param {unknown} value
     * @returns {PuzzleCandidate | { fail: string }}
     */
    const checkOutcome = (value) => {
      if (isObject(value) && typeof value.fail === 'string') {
        return { fail: value.fail };
      }
      const ok = isObject(value) && Array.isArray(value.layout) && Array.isArray(value.clues)
        && typeof value.layoutKey === 'string' && typeof value.clueKey === 'string'
        && isObject(value.rating) && (value.certificate == null || isCertificate(value.certificate));
      if (!ok || !isValidLayout(set.board, set.pieces, value.layout)) {
        throw new GenerationError('internal', 'The worker sent an invalid puzzle candidate', detail());
      }
      return /** @type {PuzzleCandidate} */ (value);
    };

    try {
      for (const calibration of state.accepted) {
        accept(calibration);
      }
      while (state.status === 'running') {
        if (job.cancelled) {
          status = 'cancelled';
          break;
        }
        if (job.timedOut) {
          reason = 'time-limit';
          break;
        }
        for (const next of dispatchOrder(state, (s, a) => cache.has(key(s, a)), pool.size - inflight)) {
          launch(next);
        }
        const awaited = foldNext(state);
        const entry = awaited === null ? undefined : cache.get(key(awaited.slot, awaited.attempt));
        if (awaited === null || entry === undefined || !entry.done) {
          await waitEvent(job);
          continue;
        }
        if (entry.ok !== true) {
          const stop = stopReason(job, entry.error, detail());
          if (stop === 'cancelled') {
            status = 'cancelled';
          } else {
            reason = 'time-limit';
          }
          break;
        }
        const outcome = checkOutcome(entry.value);
        const before = state.accepted.length;
        try {
          state = foldAccept(state, outcome);
        } catch (e) {
          throw new GenerationError('internal', e instanceof Error ? e.message : 'The fold rejected a candidate', detail());
        }
        if (state.accepted.length > before) {
          accept(state.accepted[state.accepted.length - 1]);
        }
        progress({ slot: awaited.slot, attempt: awaited.attempt });
      }
      if (status !== 'cancelled' && reason === undefined) {
        if (state.status === 'complete') {
          status = 'complete';
        } else if (state.status === 'partial') {
          reason = state.reason;
        }
      }
    } catch (e) {
      throw toFault(e, detail());
    } finally {
      controller.abort();
      finish(job);
    }

    /** @type {BatchJobResult} */
    const result = { status, accepted, seenLayouts: [...state.seenLayouts], seenClues: [...state.seenClues] };
    if (reason !== undefined) {
      result.reason = reason;
    }
    if (accepted.length > 0) {
      result.pack = await assemblePack({
        board: set.board,
        rotation: request.rotation,
        pieces: set.pieces,
        witness: set.witness,
        puzzles: accepted,
        generation: generationMeta({
          setSeed: request.setSeed,
          setLevel: input.setLevel,
          setAttempt: input.setAttempt,
          set,
          uniqueness,
          createdAt: createdAt(),
          batch: { batchSeed, batchLevel: levelId, batchIndex: input.batchIndex },
        }),
      }, detail());
    }
    if (hooks.onCertificate !== undefined && status !== 'cancelled' && reason !== 'time-limit') {
      queueCertificates(job, set, accepted, hooks);
    }
    return result;
  }

  /**
   * Lazy proof status after the user-visible result: lowest priority, preempted by
   * any new request, and discarded when the revision is no longer the latest.
   * @param {Job} job
   * @param {PieceSet} set
   * @param {Puzzle[]} puzzles
   * @param {GenerationHooks} hooks
   */
  function queueCertificates(job, set, puzzles, hooks) {
    const boardRows = boardToRows(set.board);
    const rowLimit = countRowLimit(set.board);
    for (const puzzle of puzzles) {
      if (puzzle.certificate !== null && puzzle.certificate !== undefined) {
        continue;
      }
      const task = {
        requestId: job.requestId,
        revision: job.revision,
        kind: /** @type {const} */ ('certify'),
        payload: { boardRows, pieces: set.pieces, clues: puzzle.clues, rowLimit },
      };
      pool.runIdle(task).then((certificate) => {
        const current = latest === job && !job.cancelled;
        if (current && isCertificate(certificate)) {
          emit(hooks.onCertificate, { revision: job.revision, puzzleId: puzzle.id, certificate: /** @type {Certificate} */ (certificate) });
        }
      }, () => {
        // an aborted or failed certificate leaves the puzzle without a proof status
      });
    }
  }

  function cancel() {
    const job = latest;
    if (job !== null && job.running) {
      job.cancelled = true;
      pool.cancelAll();
      job.wake?.();
    }
  }

  return {
    generateSet,
    generateBatch,
    cancel,
    recycle() {
      cancel();
      pool.recycle();
    },
  };
}
