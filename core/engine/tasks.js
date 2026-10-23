// @ts-check
// Shared task dispatch (design §8.1-§8.5). `executeTask` is the one synchronous
// entry point every host uses: the browser module worker and the Node worker
// adapter both call it, so there is no second protocol or second solver.
// `createTaskHandler` wraps it with the worker-side message loop: validation,
// per-worker workspaces with immediate byte accounting, progress and error
// conversion. Nothing here reads a clock, storage or the DOM.

import { boardFromRows } from './board.js';
import { certify } from './clues.js';
import { rate, UnsatisfiableError } from './difficulty.js';
import { enumerateLayouts } from './enumerate.js';
import { completionCandidate, GenerationError, puzzleCandidate, setAttempt } from './generate.js';
import { progressFingerprint } from './keys.js';
import { packBoard, validatePack } from './pack.js';
import { parseTaskMessage, validatePayload } from './protocol.js';
import { BUDGETS, ENUMERATION } from './policy.js';
import { buildModel, isValidLayout, ModelError, solveFirst } from './tiling.js';
import { createWorkspace, MAIN_WORKSPACE_BYTES, SCRATCH_WORKSPACE_BYTES } from './workspace.js';

/** @typedef {import('./types.js').EngineExecution} EngineExecution */
/** @typedef {import('./types.js').Issue} Issue */
/** @typedef {import('./types.js').PieceSet} PieceSet */
/** @typedef {import('./types.js').Workspace} Workspace */
/** @typedef {import('./protocol.js').TaskKind} TaskKind */
/** @typedef {import('./protocol.js').Reply} Reply */

/**
 * Typed control error of the task layer. `code` is `invalid-payload`,
 * `invalid-pack` or `invalid-task`; `issues` lists structured problems.
 */
export class TaskError extends Error {
  /**
   * @param {'invalid-payload' | 'invalid-pack' | 'invalid-task'} code
   * @param {string} message
   * @param {Issue[]} [issues]
   */
  constructor(code, message, issues = []) {
    super(message);
    this.name = 'TaskError';
    this.code = code;
    this.issues = issues;
  }
}

/** Error codes a worker replies with (besides engine `ModelError` codes). */
export const ERROR_CODES = Object.freeze({
  invalidTask: 'invalid-task',
  invalidPayload: 'invalid-payload',
  invalidPack: 'invalid-pack',
  invalidRequest: 'invalid-request',
  modelTooLarge: 'model-too-large',
  unsatisfiable: 'unsatisfiable',
  historyFull: 'history-full',
  internal: 'internal',
});

const MAX_MESSAGE = 500;

/**
 * @param {EngineExecution} execution
 * @returns {(rowTrials: number) => void}
 */
function trialProgress(execution) {
  return (rowTrials) => execution.onProgress?.({ stage: 'search', rowTrials });
}

/**
 * @param {{ boardRows: string[], pieces: import('./types.js').Piece[], witness: import('./types.js').Pose[] | null,
 *   carving: PieceSet['carving'], macroRegion: number[] | null }} s
 * @returns {PieceSet}
 */
function hydrateSet(s) {
  return { board: boardFromRows(s.boardRows), pieces: s.pieces, witness: s.witness, carving: s.carving, macroRegion: s.macroRegion };
}

/**
 * Proof status of every puzzle of a validated pack. A stored solution is a
 * validated exact cover, so it proves existence in O(cells) and nothing is
 * searched; otherwise at most `verifyRows` row trials, and `unsatisfiable`
 * only when the search was exhausted with zero solutions.
 * @param {unknown} input
 * @param {EngineExecution} execution
 * @returns {{ results: { index: number, fingerprint: string, status: 'solvable' | 'unsatisfiable' | 'not-verified' }[] }}
 */
function verifyPack(input, execution) {
  const parsed = validatePack(input);
  if (!parsed.ok) {
    throw new TaskError('invalid-pack', 'The pack is not valid', parsed.issues);
  }
  const { value: pack } = parsed;
  const board = packBoard(pack);
  let rowTrials = 0;
  const results = pack.puzzles.map((puzzle, index) => {
    const fingerprint = progressFingerprint(board, pack.pieces, puzzle.clues);
    /** @type {'solvable' | 'unsatisfiable' | 'not-verified'} */
    let status = 'not-verified';
    if (puzzle.solution !== null && puzzle.solution !== undefined && isValidLayout(board, pack.pieces, puzzle.solution)) {
      status = 'solvable';
    } else {
      try {
        const model = buildModel(board, pack.pieces, puzzle.clues, execution.main);
        const base = rowTrials;
        const found = solveFirst(model, {
          rowTrialLimit: BUDGETS.verifyRows,
          onProgress: (n) => execution.onProgress?.({ stage: 'verify', rowTrials: base + n }),
        });
        rowTrials += found.rowTrials;
        if (found.layout !== null) {
          status = 'solvable';
        } else if (found.exhausted) {
          status = 'unsatisfiable';
        }
      } catch (e) {
        if (!(e instanceof ModelError)) {
          throw e;
        }
      }
    }
    execution.onProgress?.({ stage: 'verify', rowTrials });
    return { index, fingerprint, status };
  });
  return { results };
}

/**
 * Counts the distinct arrangements of a piece set against the layout keys already used, within the
 * ENUMERATION limits (owner decision 2026-10-23). It needs no workspace; a limit is "unproven". With
 * `collect` it also returns the unused arrangements it met, sorted by key, for the completion pass.
 * @param {{ boardRows: string[], pieces: import('./types.js').Piece[], seenLayouts: string[], collect?: number }} p
 * @returns {{ status: 'exhausted' | 'more' | 'unproven', total: number, placements: number, nodes: number,
 *   solutions: number, why?: string, layouts?: { key: string, layout: import('./types.js').Pose[] }[], complete?: boolean }}
 */
function enumerateArrangements(p) {
  const { limit, status, ...counts } = enumerateLayouts(boardFromRows(p.boardRows), p.pieces, new Set(p.seenLayouts), {
    placementLimit: ENUMERATION.placements,
    nodeLimit: ENUMERATION.nodes,
    collect: p.collect,
  });
  const why = limit === null ? {} : { why: `${limit}-limit` };
  return { ...counts, ...why, status: status === 'limit' ? 'unproven' : status };
}

/**
 * Runs one task synchronously with the caller's workspaces. The payload is
 * validated again here, so a malformed payload never reaches engine code even
 * when a host skips the message layer. Results are the exact engine results
 * (plain data and typed arrays, safe to structured-clone). Throws `TaskError`,
 * `ModelError`, `GenerationError`, `UnsatisfiableError` or a RangeError for
 * arguments the engine itself rejects.
 * @param {TaskKind} kind
 * @param {object} payload
 * @param {EngineExecution} execution
 * @returns {unknown}
 */
export function executeTask(kind, payload, execution) {
  const checked = validatePayload(kind, payload);
  if (!checked.ok) {
    throw new TaskError('invalid-payload', checked.issues[0]?.message ?? 'The payload is invalid', checked.issues);
  }
  const p = checked.value;
  switch (kind) {
    case 'setAttempt':
      return setAttempt({
        board: boardFromRows(p.boardRows),
        rotation: p.rotation,
        levelId: p.levelId,
        seedText: p.seedText,
        uniqueness: p.uniqueness,
        execution,
      }, p.attempt);
    case 'puzzleCandidate':
      return puzzleCandidate({
        set: hydrateSet(p.set),
        targetLevelId: p.targetLevelId,
        quantity: p.quantity,
        batchSeed: p.batchSeed,
        uniqueness: p.uniqueness,
        seenLayouts: new Set(p.seenLayouts),
        seenClues: new Set(p.seenClues),
        execution,
      }, p.slot, p.attempt);
    case 'completionCandidate':
      return completionCandidate({
        set: hydrateSet(p.set),
        targetLevelId: p.targetLevelId,
        quantity: p.quantity,
        batchSeed: p.batchSeed,
        uniqueness: p.uniqueness,
        seenLayouts: new Set(p.seenLayouts),
        seenClues: new Set(p.seenClues),
        execution,
      }, p.layout);
    case 'certify':
      return certify(boardFromRows(p.boardRows), p.pieces, p.clues, execution.main, p.rowLimit);
    case 'rate':
      return rate(boardFromRows(p.boardRows), p.pieces, p.clues, execution.main);
    case 'verifyPack':
      return verifyPack(p.pack, execution);
    case 'solveFirst': {
      const model = buildModel(boardFromRows(p.boardRows), p.pieces, p.clues, execution.main);
      return solveFirst(model, { rowTrialLimit: p.rowLimit, onProgress: trialProgress(execution) });
    }
    case 'enumerateLayouts':
      return enumerateArrangements(p);
    default:
      throw new TaskError('invalid-task', 'Unknown task kind');
  }
}

/**
 * Error reply for a failed task; the message is truncated and never carries a stack.
 * @param {number} id
 * @param {unknown} error
 * @returns {Reply}
 */
export function errorReply(id, error) {
  let code = ERROR_CODES.internal;
  let message = 'The task failed';
  /** @type {Issue[] | undefined} */
  let issues;
  if (error instanceof TaskError) {
    ({ code, message } = error);
    issues = error.issues.length > 0 ? error.issues : undefined;
  } else if (error instanceof ModelError || error instanceof GenerationError) {
    ({ code, message } = error);
  } else if (error instanceof UnsatisfiableError) {
    code = ERROR_CODES.unsatisfiable;
    message = error.message;
  } else if (error instanceof RangeError || error instanceof TypeError) {
    code = ERROR_CODES.invalidRequest;
    message = error.message;
  } else if (error instanceof Error) {
    message = error.message;
  }
  const reply = { type: /** @type {const} */ ('error'), id, code, message: message.slice(0, MAX_MESSAGE) };
  return issues === undefined ? reply : { ...reply, issues };
}

/**
 * @param {unknown} input
 * @returns {number | null} the message id when it is a safe nonnegative integer
 */
function messageId(input) {
  const id = typeof input === 'object' && input !== null ? /** @type {{ id?: unknown }} */ (input).id : undefined;
  return typeof id === 'number' && Number.isSafeInteger(id) && id >= 0 ? id : null;
}

/**
 * Wraps a workspace so every call that may allocate reports the new byte total
 * immediately, including growth that replaces a buffer.
 * @param {Workspace} ws
 * @param {() => void} changed
 * @returns {Workspace}
 */
function metered(ws, changed) {
  /** @type {(fn: () => any) => any} */
  const around = (fn) => {
    try {
      return fn();
    } finally {
      changed();
    }
  };
  return /** @type {Workspace} */ ({
    capacityBytes: ws.capacityBytes,
    bytes: () => ws.bytes(),
    peakBytes: () => ws.peakBytes(),
    allocationCount: () => ws.allocationCount(),
    int32: (name, length) => around(() => ws.int32(name, length)),
    int16: (name, length) => around(() => ws.int16(name, length)),
    uint8: (name, length) => around(() => ws.uint8(name, length)),
    reserve: (plan, counts) => around(() => ws.reserve(plan, counts)),
  });
}

/**
 * Worker-side message handler: one per worker, owning that worker's main and
 * scratch workspaces. `handle` validates a message, runs the task
 * synchronously and posts progress/result/error replies through `post`.
 * Memory progress carries the sum of both workspaces' high-water bytes.
 * @param {{ post: (reply: Reply) => void, mainBytes?: number, scratchBytes?: number }} options
 * @returns {{ handle: (message: unknown) => void, main: Workspace, scratch: Workspace, bytes: () => number }}
 */
export function createTaskHandler(options) {
  const rawMain = createWorkspace(options.mainBytes ?? MAIN_WORKSPACE_BYTES);
  const rawScratch = createWorkspace(options.scratchBytes ?? SCRATCH_WORKSPACE_BYTES);
  const bytes = () => rawMain.peakBytes() + rawScratch.peakBytes();
  /** @type {number | null} */
  let current = null;
  let reported = 0;

  /** @param {Reply} reply */
  const post = (reply) => {
    try {
      options.post(reply);
    } catch (e) {
      if (reply.type === 'result') {
        // A value that cannot be cloned must still settle the task.
        try {
          options.post(errorReply(reply.id, new Error(`The result could not be sent: ${e instanceof Error ? e.message : 'unknown'}`)));
        } catch {
          // the transport is gone; the controller's crash handling settles the task
        }
      }
    }
  };
  const memory = () => {
    const total = bytes();
    if (current !== null && total > reported) {
      reported = total;
      post({ type: 'progress', id: current, stage: 'memory', rowTrials: 0, bytes: total });
    }
  };
  const main = metered(rawMain, memory);
  const scratch = metered(rawScratch, memory);

  /** @param {unknown} message */
  const handle = (message) => {
    const parsed = parseTaskMessage(message);
    if (!parsed.ok) {
      const id = messageId(message);
      if (id !== null) {
        post({ type: 'error', id, code: ERROR_CODES.invalidTask, message: 'The task message is invalid', issues: parsed.issues });
      }
      return;
    }
    const { id, kind, payload } = parsed.value;
    current = id;
    try {
      const value = executeTask(kind, payload, {
        main,
        scratch,
        onProgress: (p) => {
          const info = /** @type {{ stage?: unknown, rowTrials?: unknown }} */ (p);
          post({
            type: 'progress',
            id,
            stage: typeof info.stage === 'string' ? info.stage : 'search',
            rowTrials: typeof info.rowTrials === 'number' && Number.isSafeInteger(info.rowTrials) ? info.rowTrials : 0,
            bytes: bytes(),
          });
        },
      });
      post({ type: 'result', id, value });
    } catch (e) {
      post(errorReply(id, e));
    } finally {
      current = null;
    }
  };

  return { handle, main, scratch, bytes };
}
