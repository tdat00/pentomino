// @ts-check
// Browser client of the two puzzle-code worker tasks (`encodePuzzleCode`, `decodePuzzleCode`). Every codec run, and
// the cold shape catalogue it may build, happens in a module worker of a dedicated one-worker pool that this client
// creates on its first operation; nothing is decoded on the page's main thread and there is no hidden fallback when
// workers are missing. The page only normalizes the typed text (structural, cheap) so that it knows the code a reply
// belongs to. Results use the project's `{ ok, value, warnings }` shape; a failure carries typed issues and, where the
// worker found them, a validated core-only recovery or a one-symbol correction candidate. Neither is ever applied or
// opened here: the caller decides after the user confirms.

import { PuzzleCodeError, normalizePuzzleCodeInput } from '../engine/puzzlecode-input.js';
import { createPool as createWorkerPool, isAbortError, PoolAbortError, PoolError, WorkerTaskError } from './worker-pool.js';

/** @typedef {import('../engine/types.js').Pack} Pack */
/** @typedef {import('../engine/puzzlecode.js').PuzzleCodeSnapshot} PuzzleCodeSnapshot */
/** @typedef {import('../engine/puzzlecode.js').EncodedPuzzleCode} EncodedPuzzleCode */
/** @typedef {import('../engine/protocol.js').WireCandidate} WireCandidate */

/**
 * One problem. `code` is a puzzle-code error (`empty`, `bad-char`, `dots`, `too-long`, `core-check`, `version`,
 * `no-deflate`, `invalid`, `index`), a tail error (`tail-check`, `tail-tag`, `tail-invalid`), a client failure
 * (`worker-unavailable`, `worker-error`) or a controller outcome (`cancelled`). `params` holds message values
 * such as `{ char }`; `message` is a developer text, the apps show their own by `code`.
 * @typedef {object} CodeIssue
 * @property {string} code
 * @property {string} path
 * @property {string} message
 * @property {Record<string, string | number>} [params]
 */

/**
 * The valid core of a code whose tail is damaged: an ordinary pack without an answer. It is data, not a decision;
 * nothing opens it until the user chooses to.
 * @typedef {object} CoreRecovery
 * @property {'core-only'} kind
 * @property {'tail-check' | 'tail-tag' | 'tail-invalid'} code
 * @property {Pack} pack
 */

/**
 * A one-symbol correction that already passed the checksum and a complete decode; offered, never applied.
 * `offset` is zero-based within the component, `group` one-based (groups of four), `position` one to four.
 * @typedef {object} PuzzleCodeCorrection
 * @property {string} normalizedCode The typed code, normalized.
 * @property {string} correctedCode The whole code with the correction applied.
 * @property {'core' | 'tail'} component
 * @property {number} offset
 * @property {number} group
 * @property {number} position
 * @property {string} typed
 * @property {string} expected
 */

/**
 * @typedef {object} CodeFailure
 * @property {false} ok
 * @property {CodeIssue[]} issues
 * @property {CoreRecovery} [recovery]
 * @property {PuzzleCodeCorrection} [candidate]
 */

/** @template T @typedef {{ ok: true, value: T, warnings: CodeIssue[] } | CodeFailure} CodeResult */

/**
 * @typedef {object} DecodedPuzzleCode
 * @property {Pack} pack One puzzle; its answer is set only when the code carried a valid tail.
 * @property {boolean} hasTail
 * @property {null | 'tail-check' | 'tail-tag' | 'tail-invalid'} tailError Always null in a success.
 * @property {PuzzleCodeCorrection} [candidate]
 * @property {string} code The normalized request: upper case, ungrouped, at most one dot.
 */

/**
 * The pool surface the client uses. A pool passed in is caller-owned and must be dedicated to this client's
 * operations (every operation begins its own request, which supersedes the pool's previous one); a pool made by
 * `createPool` is owned and closed by `dispose`.
 * @typedef {object} PoolLike
 * @property {(r: { requestId: number, revision: string, onTimeout?: (info: unknown) => void }) => void} beginRequest
 * @property {(task: { requestId: number, revision: string, kind: 'encodePuzzleCode' | 'decodePuzzleCode',
 *   payload: object, signal?: AbortSignal }) => Promise<unknown>} run
 * @property {(requestId: number) => void} endRequest
 * @property {() => void} [close]
 */

/**
 * `cancel`, `dispose` and a newer operation reject the operation they stop with a `PoolAbortError`
 * (`isAbortError`; reason `cancelled`, `closed` or `superseded`) and ignore its late reply. Any other outcome,
 * including a worker failure or the 115-second watchdog (`worker-error`, `params.reason` `deadline`), is a resolved
 * `CodeFailure`.
 * @typedef {object} PuzzleCodeClient
 * @property {(snapshot: PuzzleCodeSnapshot) => Promise<CodeResult<EncodedPuzzleCode>>} encode
 * @property {(text: string) => Promise<CodeResult<DecodedPuzzleCode>>} decode Typed, pasted or scanned text: a
 *   bare or grouped code, or a link with `#p=` (its index and mixed-key rules apply). A damaged tail is a failure
 *   with `recovery`, never a success.
 * @property {(text: string) => Promise<CodeResult<PuzzleCodeCorrection | null>>} repair The correction candidate of
 *   a bad checksum, or null when none exists; malformed text and service failures stay failures. It is the same
 *   decode RPC, not a third task.
 * @property {() => void} cancel
 * @property {() => void} dispose
 */

/** Codes a puzzle-code error reply may carry; any other worker error code is a service failure. */
const CODEC_CODES = new Set(['empty', 'bad-char', 'dots', 'too-long', 'core-check', 'version', 'no-deflate', 'invalid', 'index']);
const TAIL_CODES = new Set(['tail-check', 'tail-tag', 'tail-invalid']);

/** Developer texts; the apps show their own localized texts by `code`. */
const MESSAGES = Object.freeze({
  'worker-unavailable': 'This browser cannot open puzzle codes because module workers are unavailable.',
  'worker-error': 'Puzzle code processing failed. Try again.',
  'tail-check': 'The part after the dot has a typing error.',
  'tail-tag': 'The part after the dot is of a kind this version does not know.',
  'tail-invalid': 'The part after the dot does not fit this puzzle.',
  invalid: 'This code does not describe a valid puzzle.',
});

/** Request IDs only grow, across every client of this page, so two clients never collide on one pool. */
let lastRequestId = 0;

/** @returns {PoolLike} One module worker, started by the pool on its first task. */
const defaultPool = () => /** @type {PoolLike} */ (/** @type {unknown} */ (createWorkerPool({ size: 1 })));

/**
 * @param {string} code
 * @param {Record<string, string | number>} [params]
 * @returns {CodeFailure}
 */
function failure(code, params) {
  /** @type {CodeIssue} */
  const issue = { code, path: '$', message: /** @type {Record<string, string>} */ (MESSAGES)[code] ?? code };
  if (params !== undefined) {
    issue.params = params;
  }
  return { ok: false, issues: [issue] };
}

/**
 * The typed failure of a codec error raised on the page (input normalization) or anywhere else.
 * @param {unknown} error
 * @returns {CodeFailure}
 */
export function failureFromCodeError(error) {
  if (!(error instanceof PuzzleCodeError)) {
    return failure('worker-error');
  }
  /** @type {CodeIssue} */
  const issue = { code: error.code, path: '$', message: error.message };
  if (error.params !== undefined) {
    issue.params = error.params;
  }
  return { ok: false, issues: [issue] };
}

/**
 * @param {unknown} v
 * @returns {v is Record<string, any>}
 */
const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * @param {unknown} raw A worker candidate: the codec's fields, without `normalizedCode` and `offset`.
 * @param {string} normalizedCode
 * @returns {PuzzleCodeCorrection | undefined}
 */
function correctionOf(raw, normalizedCode) {
  if (!isObject(raw) || (raw.component !== 'core' && raw.component !== 'tail')
    || !Number.isSafeInteger(raw.group) || raw.group < 1 || !Number.isSafeInteger(raw.position) || raw.position < 1 || raw.position > 4
    || typeof raw.typed !== 'string' || typeof raw.expected !== 'string' || typeof raw.correctedCode !== 'string') {
    return undefined;
  }
  const candidate = /** @type {WireCandidate} */ (raw);
  return {
    normalizedCode,
    correctedCode: candidate.correctedCode,
    component: candidate.component,
    offset: 4 * (candidate.group - 1) + candidate.position - 1,
    group: candidate.group,
    position: candidate.position,
    typed: candidate.typed,
    expected: candidate.expected,
  };
}

/**
 * Converts a settled or rejected pool task into a failure; cancellations are rethrown for the caller.
 * @param {unknown} error
 * @param {string | null} normalized The normalized request, for a candidate's `normalizedCode`.
 * @returns {CodeFailure}
 * @throws {PoolAbortError} Every abort except the watchdog's.
 */
function failureOf(error, normalized) {
  if (isAbortError(error)) {
    if (error.reason === 'deadline') {
      return failure('worker-error', { reason: 'deadline' });
    }
    throw error;
  }
  if (error instanceof WorkerTaskError) {
    if (!CODEC_CODES.has(error.code)) {
      return failure('worker-error', { reason: error.code });
    }
    /** @type {CodeIssue[]} */
    const issues = [];
    /** @type {PuzzleCodeCorrection | undefined} */
    let candidate;
    for (const raw of error.issues) {
      const issue = /** @type {CodeIssue & { candidate?: unknown }} */ (raw);
      /** @type {CodeIssue} */
      const copy = { code: issue.code, path: issue.path, message: issue.message };
      if (issue.params !== undefined) {
        copy.params = issue.params;
      }
      issues.push(copy);
      if (candidate === undefined && normalized !== null && issue.candidate !== undefined) {
        candidate = correctionOf(issue.candidate, normalized);
      }
    }
    if (issues.length === 0) {
      issues.push({ code: error.code, path: '$', message: error.message });
    }
    return candidate === undefined ? { ok: false, issues } : { ok: false, issues, candidate };
  }
  if (error instanceof PoolError) {
    if (error.code === 'worker-unavailable') {
      return failure('worker-unavailable');
    }
    if (error.code === 'invalid-task') {
      return {
        ok: false,
        issues: [{ code: 'invalid', path: '$', message: `The puzzle snapshot is not valid: ${error.issues[0]?.message ?? MESSAGES.invalid}`.slice(0, 500) }],
      };
    }
    return failure('worker-error', { reason: error.code });
  }
  return failure('worker-error');
}

/**
 * @param {unknown} value A decode reply.
 * @param {string} normalized
 * @returns {CodeResult<DecodedPuzzleCode>}
 */
function decodedResult(value, normalized) {
  if (!isObject(value) || !isObject(value.pack) || typeof value.hasTail !== 'boolean'
    || (value.tailError !== null && !TAIL_CODES.has(value.tailError))) {
    return failure('worker-error', { reason: 'result' });
  }
  const pack = /** @type {Pack} */ (value.pack);
  const candidate = value.candidate === undefined ? undefined : correctionOf(value.candidate, normalized);
  if (value.tailError !== null) {
    const code = /** @type {'tail-check' | 'tail-tag' | 'tail-invalid'} */ (value.tailError);
    /** @type {CodeFailure} */
    const bad = {
      ok: false,
      issues: [{ code, path: '$.tail', message: /** @type {Record<string, string>} */ (MESSAGES)[code] }],
      recovery: { kind: 'core-only', code, pack },
    };
    if (candidate !== undefined) {
      bad.candidate = candidate;
    }
    return bad;
  }
  return { ok: true, value: { pack, hasTail: value.hasTail, tailError: null, code: normalized }, warnings: [] };
}

/**
 * @param {unknown} value An encode reply.
 * @returns {CodeResult<EncodedPuzzleCode>}
 */
function encodedResult(value) {
  if (!isObject(value) || typeof value.C !== 'string' || (value.T !== null && typeof value.T !== 'string')
    || typeof value.F !== 'string' || (value.version !== 1 && value.version !== 2)) {
    return failure('worker-error', { reason: 'result' });
  }
  return { ok: true, value: { C: value.C, T: value.T, F: value.F, version: value.version }, warnings: [] };
}

/**
 * A client with its own lazily created worker. No worker, pool or catalogue exists before the first operation. One
 * operation runs at a time: starting another supersedes the running one.
 * @param {{ pool?: PoolLike, createPool?: () => PoolLike }} [options] `pool`: a caller-owned pool, never closed
 *   here. `createPool`: factory of a pool this client owns and closes in `dispose` (default: one module worker).
 * @returns {PuzzleCodeClient}
 */
export function createPuzzleCodeClient(options = {}) {
  /** @type {PoolLike | null} */
  let pool = options.pool ?? null;
  const owned = options.pool === undefined;
  let disposed = false;
  /** @type {{ stop: (reason: 'cancelled' | 'superseded' | 'closed') => void } | null} */
  let active = null;

  /**
   * One logical operation: one pool request with one task.
   * @param {'encodePuzzleCode' | 'decodePuzzleCode'} kind
   * @param {object} payload
   * @param {string | null} normalized
   * @returns {Promise<{ ok: true, value: unknown } | CodeFailure>}
   */
  async function call(kind, payload, normalized) {
    if (disposed) {
      throw new PoolAbortError('closed');
    }
    active?.stop('superseded');
    lastRequestId += 1;
    const requestId = lastRequestId;
    const revision = `puzzle-code-${requestId}`;
    const controller = new AbortController();
    /** @type {(error: PoolAbortError) => void} */
    let reject = () => {};
    const stopped = /** @type {Promise<never>} */ (new Promise((_, fail) => {
      reject = fail;
    }));
    const operation = {
      stop: (/** @type {'cancelled' | 'superseded' | 'closed'} */ reason) => {
        // Rejecting first makes this reason win the race against the pool's own abort.
        reject(new PoolAbortError(reason));
        controller.abort();
      },
    };
    active = operation;
    /** @type {PoolLike | null} */
    let used = null;
    try {
      pool ??= (options.createPool ?? defaultPool)();
      used = pool;
      used.beginRequest({ requestId, revision });
      const value = await Promise.race([used.run({ requestId, revision, kind, payload, signal: controller.signal }), stopped]);
      return { ok: true, value };
    } catch (error) {
      return failureOf(error, normalized);
    } finally {
      if (active === operation) {
        active = null;
      }
      try {
        used?.endRequest(requestId);
      } catch {
        // the pool may already be closed
      }
    }
  }

  /**
   * @param {string} text
   * @returns {Promise<CodeResult<DecodedPuzzleCode>>}
   */
  async function decode(text) {
    if (disposed) {
      throw new PoolAbortError('closed');
    }
    /** @type {string} */
    let normalized;
    try {
      normalized = normalizePuzzleCodeInput(text);
    } catch (error) {
      return failureFromCodeError(error);
    }
    const outcome = await call('decodePuzzleCode', { text: normalized }, normalized);
    return outcome.ok ? decodedResult(outcome.value, normalized) : outcome;
  }

  return {
    async encode(snapshot) {
      const outcome = await call('encodePuzzleCode', { snapshot }, null);
      return outcome.ok ? encodedResult(outcome.value) : outcome;
    },
    decode,
    async repair(text) {
      const decoded = await decode(text);
      if (decoded.ok) {
        return { ok: true, value: null, warnings: [] };
      }
      if (decoded.candidate !== undefined) {
        return { ok: true, value: decoded.candidate, warnings: [] };
      }
      return decoded.recovery !== undefined || decoded.issues[0]?.code === 'core-check'
        ? { ok: true, value: null, warnings: [] }
        : decoded;
    },
    cancel() {
      active?.stop('cancelled');
    },
    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      active?.stop('closed');
      const closing = pool;
      pool = null;
      if (owned && closing !== null) {
        try {
          closing.close?.();
        } catch {
          // already closed
        }
      }
    },
  };
}
