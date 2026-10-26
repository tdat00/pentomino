// @ts-check
// Hint and reveal orchestration (design §11.13), DOM-free. A worker result is applied only while the position still
// matches the fingerprint taken when the request started; moves go through the play controller, so each is undoable.

import { canPlace } from '../core/engine/game.js';
import { poseCells } from '../core/engine/geometry.js';
import {
  HINT_ROW_LIMIT, HINT_UNKNOWN_MESSAGE, findCompatibleLayout, resolveHint,
} from '../core/engine/hints.js';
import { packBoard } from '../core/engine/pack.js';
import { createPool, isAbortError } from '../core/browser/worker-pool.js';
import { HINT_TEXT } from './strings.js';

/** @typedef {import('../core/engine/types.js').Pose} Pose */
/** @typedef {import('../core/engine/types.js').XY} XY */
/** @typedef {import('../core/engine/types.js').Board} Board */
/** @typedef {import('./state.js').PlayerState} PlayerState */

/**
 * @typedef {object} PoolLike
 * @property {(r: { requestId: number, revision: string, onTimeout?: (info: unknown) => void }) => void} beginRequest
 * @property {(task: { requestId: number, revision: string, kind: 'solveFirst', payload: object }) => Promise<unknown>} run
 * @property {(requestId: number) => void} endRequest
 * @property {() => void} cancelAll
 * @property {() => void} close
 */

/**
 * What the board highlights: the cells of the suggested pose (a preview) or of
 * the placed piece a removal repairs.
 * @typedef {object} HintMarks
 * @property {'place' | 'remove'} kind
 * @property {string} piece
 * @property {Pose | null} pose Suggested pose of a place hint.
 * @property {XY[]} cells
 * @property {boolean} pulse
 */

/**
 * `working` covers a hint check and a reveal search; `hint` holds a proven
 * result that waits for the player; `reveal-unsat` asks whether to reset first.
 * @typedef {object} HintState
 * @property {'idle' | 'working' | 'hint' | 'reveal-unsat'} phase
 * @property {'hint' | 'reveal' | null} task
 * @property {string} message Visible status text; empty when there is nothing to say.
 * @property {HintMarks | null} marks
 * @property {number} version Increases with every change.
 */

/**
 * @typedef {object} HintOptions
 * @property {import('./state.js').PlayerStore} store
 * @property {Pick<ReturnType<typeof import('./play.js').createPlayController>, 'apply'>} play
 * @property {(message: string) => void} [announce]
 * @property {() => PoolLike} [createPool] Hint pool factory (default: one module worker, separate from verification).
 * @property {() => boolean} [reducedMotion]
 */

/** @type {WeakMap<object, Board>} */
const boards = new WeakMap();

/**
 * @param {import('../core/engine/types.js').Pack} pack
 * @returns {Board}
 */
function boardOf(pack) {
  let board = boards.get(pack);
  if (board === undefined) {
    board = packBoard(pack);
    boards.set(pack, board);
  }
  return board;
}

/**
 * Identity of what a result was computed for: the pack revision, puzzle, exact
 * board/clue fingerprint and the player's placements. Anything else (timer,
 * selection, counters) may change without invalidating a result.
 * @param {Pick<PlayerState, 'game' | 'revision' | 'index' | 'fingerprints'>} state
 * @returns {string}
 */
export function hintFingerprint(state) {
  const game = state.game;
  if (game === null) {
    return '';
  }
  const placements = [...game.placed.values()]
    .map((p) => `${p.piece}@${p.x},${p.y},${p.turn},${p.mirrored ? 1 : 0}`)
    .sort()
    .join(';');
  return `${state.revision}|${state.index}|${state.fingerprints[state.index] ?? ''}|${placements}`;
}

/**
 * @param {HintOptions} options
 */
export function createHintController(options) {
  const { store, play } = options;
  /** @param {string} message */
  const announce = (message) => options.announce?.(message);
  /** @type {HintState} */
  let state = { phase: 'idle', task: null, message: '', marks: null, version: 0 };
  /** @type {Set<() => void>} */
  const listeners = new Set();
  /** @type {PoolLike | null} */
  let pool = null;
  let seq = 0;
  let destroyed = false;
  /** @type {{ id: number, fp: string, pool: PoolLike | null } | null} */
  let active = null;
  /** @type {{ fp: string, kind: 'place', pose: Pose, piece: string } | { fp: string, kind: 'remove', piece: string } | null} */
  let shown = null;

  /** @returns {PoolLike} */
  function getPool() {
    pool ??= (options.createPool ?? (() => /** @type {PoolLike} */ (/** @type {unknown} */ (createPool({ size: 1 })))))();
    return pool;
  }

  /** @param {Partial<HintState>} patch */
  function set(patch) {
    state = { ...state, ...patch, version: state.version + 1 };
    for (const listener of [...listeners]) {
      listener();
    }
  }

  /**
   * @param {string} id
   * @returns {string}
   */
  function labelOf(id) {
    return store.getState().pack?.pieces.find((p) => p.id === id)?.label ?? id;
  }

  function abortActive() {
    const request = active;
    active = null;
    if (request?.pool != null) {
      try {
        request.pool.cancelAll();
      } catch {
        // The pool may already be closed.
      }
    }
  }

  function clearShown() {
    shown = null;
  }

  /**
   * @returns {{ id: number, fp: string, request: NonNullable<typeof active> } | null}
   */
  function begin() {
    const s = store.getState();
    if (destroyed || s.screen !== 'game' || s.game === null || s.pack === null) {
      return null;
    }
    abortActive();
    clearShown();
    seq += 1;
    const request = { id: seq, fp: hintFingerprint(s), pool: /** @type {PoolLike | null} */ (null) };
    active = request;
    return { id: request.id, fp: request.fp, request };
  }

  /**
   * One `solveFirst` query per call, all under the request's single deadline.
   * The request opens with the first query, so a stored answer starts no worker.
   * @param {NonNullable<typeof active>} request
   * @param {import('../core/engine/types.js').Pack} pack
   * @returns {(fixed: Pose[]) => Promise<{ layout: Pose[] | null, exhausted: boolean }>}
   */
  function solverFor(request, pack) {
    const revision = `hint:${request.id}`;
    return async (fixed) => {
      if (request.pool === null) {
        const opened = getPool();
        opened.beginRequest({ requestId: request.id, revision });
        request.pool = opened;
      }
      const reply = /** @type {{ layout?: Pose[] | null, exhausted?: boolean }} */ (await request.pool.run({
        requestId: request.id,
        revision,
        kind: 'solveFirst',
        payload: { boardRows: pack.board.rows, pieces: pack.pieces, clues: fixed, rowLimit: HINT_ROW_LIMIT, maxSolutions: 1 },
      }));
      return { layout: reply?.layout ?? null, exhausted: reply?.exhausted === true };
    };
  }

  /** @param {NonNullable<typeof active>} request */
  function finish(request) {
    if (request.pool !== null) {
      try {
        request.pool.endRequest(request.id);
      } catch {
        // The pool may already be closed.
      }
    }
    if (active === request) {
      active = null;
    }
  }

  /**
   * @param {NonNullable<typeof active>} request
   * @param {string} fp
   * @returns {boolean}
   */
  function current(request, fp) {
    return !destroyed && active === request && hintFingerprint(store.getState()) === fp;
  }

  /**
   * A cancelled or superseded request stays silent; a changed position has
   * already been reported by the store listener.
   * @param {NonNullable<typeof active>} request
   * @param {string} fp
   * @returns {boolean}
   */
  function settle(request, fp) {
    const fresh = current(request, fp);
    finish(request);
    return fresh;
  }

  /** @returns {Promise<void>} */
  async function requestHint() {
    const started = begin();
    if (started === null) {
      return;
    }
    const { request, fp } = started;
    const game = /** @type {NonNullable<PlayerState['game']>} */ (store.getState().game);
    const pack = /** @type {NonNullable<PlayerState['pack']>} */ (store.getState().pack);
    if (game.solved) {
      active = null;
      set({ phase: 'idle', task: null, message: HINT_TEXT.complete, marks: null });
      announce(HINT_TEXT.complete);
      return;
    }
    set({ phase: 'working', task: 'hint', message: HINT_TEXT.working, marks: null });
    announce(HINT_TEXT.working);
    const puzzle = pack.puzzles[game.index];
    /** @type {import('../core/engine/hints.js').HintResult} */
    let result = { kind: 'unknown', message: HINT_UNKNOWN_MESSAGE };
    try {
      result = await resolveHint({
        board: boardOf(pack),
        pieces: pack.pieces,
        clues: puzzle.clues,
        placed: game.placed,
        history: game.history,
        solution: puzzle.solution,
        solve: solverFor(request, pack),
      });
    } catch (error) {
      // Cancelled or replaced requests stay silent; a deadline, a crashed worker or a model that is too large prove nothing.
      if (isAbortError(error) && active !== request) {
        finish(request);
        return;
      }
    }
    if (!settle(request, fp)) {
      return;
    }
    show(result, fp);
  }

  /**
   * @param {import('../core/engine/hints.js').HintResult} result
   * @param {string} fp
   */
  function show(result, fp) {
    const s = store.getState();
    const game = /** @type {NonNullable<PlayerState['game']>} */ (s.game);
    const pack = /** @type {NonNullable<PlayerState['pack']>} */ (s.pack);
    const pulse = options.reducedMotion?.() !== true;
    if (result.kind === 'place') {
      const piece = pack.pieces.find((p) => p.id === result.pose.piece);
      if (piece === undefined || !canPlace(game, result.pose).ok) {
        set({ phase: 'idle', task: null, message: HINT_UNKNOWN_MESSAGE, marks: null });
        announce(HINT_UNKNOWN_MESSAGE);
        return;
      }
      play.apply({ type: 'hint' });
      shown = { fp, kind: 'place', pose: result.pose, piece: piece.id };
      const message = HINT_TEXT.place(piece.label);
      set({
        phase: 'hint',
        task: null,
        message,
        marks: { kind: 'place', piece: piece.id, pose: result.pose, cells: poseCells(piece, result.pose), pulse },
      });
      announce(message);
    } else if (result.kind === 'remove') {
      const piece = pack.pieces.find((p) => p.id === result.piece);
      const pose = game.placed.get(result.piece);
      if (piece === undefined || pose === undefined) {
        set({ phase: 'idle', task: null, message: HINT_UNKNOWN_MESSAGE, marks: null });
        announce(HINT_UNKNOWN_MESSAGE);
        return;
      }
      play.apply({ type: 'hint' });
      shown = { fp, kind: 'remove', piece: piece.id };
      const message = HINT_TEXT.remove(piece.label);
      set({
        phase: 'hint',
        task: null,
        message,
        marks: { kind: 'remove', piece: piece.id, pose: null, cells: poseCells(piece, pose), pulse },
      });
      announce(message);
    } else {
      set({ phase: 'idle', task: null, message: result.message, marks: null });
      announce(result.message);
    }
  }

  /** @returns {boolean} */
  function applyHint() {
    const hint = shown;
    const s = store.getState();
    if (hint === null || state.phase !== 'hint' || s.game === null) {
      return false;
    }
    if (hintFingerprint(s) !== hint.fp) {
      clearShown();
      set({ phase: 'idle', task: null, message: HINT_TEXT.stale, marks: null });
      announce(HINT_TEXT.stale);
      return false;
    }
    const label = labelOf(hint.piece);
    const game = s.game;
    const fits = hint.kind === 'place'
      ? !game.placed.has(hint.piece) && canPlace(game, hint.pose).ok
      : game.placed.has(hint.piece);
    const applied = fits && play.apply(hint.kind === 'place' ? { type: 'place', pose: hint.pose } : { type: 'remove', piece: hint.piece });
    clearShown();
    const message = applied
      ? (hint.kind === 'place' ? HINT_TEXT.placedHint(label) : HINT_TEXT.removedHint(label))
      : HINT_TEXT.noLongerFits;
    set({ phase: 'idle', task: null, message, marks: null });
    announce(message);
    return applied;
  }

  /**
   * Finds a complete solution that agrees with the current placements (or only
   * the clues when `replace`) and commits it as the revealed answer. The caller
   * has already asked the player to confirm; nothing changes before that.
   * @param {{ replace?: boolean }} [options]
   * @returns {Promise<void>}
   */
  async function reveal({ replace = false } = {}) {
    const started = begin();
    if (started === null) {
      return;
    }
    const { request, fp } = started;
    const game = /** @type {NonNullable<PlayerState['game']>} */ (store.getState().game);
    const pack = /** @type {NonNullable<PlayerState['pack']>} */ (store.getState().pack);
    if (game.solved) {
      active = null;
      set({ phase: 'idle', task: null, message: HINT_TEXT.complete, marks: null });
      announce(HINT_TEXT.complete);
      return;
    }
    set({ phase: 'working', task: 'reveal', message: HINT_TEXT.revealWorking, marks: null });
    announce(HINT_TEXT.revealWorking);
    const puzzle = pack.puzzles[game.index];
    /** @type {import('../core/engine/hints.js').Compatible} */
    let found = { status: 'unknown' };
    try {
      found = await findCompatibleLayout({
        board: boardOf(pack),
        pieces: pack.pieces,
        fixed: replace ? puzzle.clues : [...puzzle.clues, ...game.placed.values()],
        solution: puzzle.solution,
        solve: solverFor(request, pack),
      });
    } catch (error) {
      if (isAbortError(error) && active !== request) {
        finish(request);
        return;
      }
    }
    if (!settle(request, fp)) {
      return;
    }
    if (found.status === 'found') {
      const done = play.apply({ type: 'reveal', layout: found.layout });
      const message = done ? HINT_TEXT.revealed : HINT_TEXT.revealFailed;
      set({ phase: 'idle', task: null, message, marks: null });
      announce(message);
    } else if (found.status === 'unsatisfiable' && !replace) {
      set({ phase: 'reveal-unsat', task: null, message: HINT_TEXT.revealUnsat, marks: null });
      announce(HINT_TEXT.revealUnsat);
    } else {
      const message = found.status === 'unsatisfiable' ? HINT_TEXT.revealImpossible : HINT_TEXT.revealUnknown;
      set({ phase: 'idle', task: null, message, marks: null });
      announce(message);
    }
  }

  function cancel() {
    if (state.phase !== 'working') {
      return;
    }
    abortActive();
    set({ phase: 'idle', task: null, message: HINT_TEXT.cancelled, marks: null });
    announce(HINT_TEXT.cancelled);
  }

  function dismiss() {
    if (state.phase === 'working') {
      cancel();
      return;
    }
    const declined = state.phase === 'reveal-unsat';
    clearShown();
    set({ phase: 'idle', task: null, message: declined ? HINT_TEXT.revealCancelled : '', marks: null });
    if (declined) {
      announce(HINT_TEXT.revealCancelled);
    }
  }

  /** A declined confirmation: nothing was started, so only a message. */
  function declineReveal() {
    if (state.phase === 'working') {
      return;
    }
    clearShown();
    set({ phase: 'idle', task: null, message: HINT_TEXT.revealCancelled, marks: null });
    announce(HINT_TEXT.revealCancelled);
  }

  // A result belongs to one exact position; any other position drops it.
  const unsubscribe = store.subscribe((next, previous) => {
    const g = next.game;
    const p = previous.game;
    if (g === p || (g !== null && p !== null && g.placed === p.placed && g.pack === p.pack && g.index === p.index
      && next.revision === previous.revision && next.screen === previous.screen)) {
      return;
    }
    if (state.phase === 'idle' && active === null) {
      return;
    }
    const fp = hintFingerprint(next);
    if (state.phase === 'working' && active !== null && active.fp !== fp) {
      abortActive();
      set({ phase: 'idle', task: null, message: HINT_TEXT.stale, marks: null });
    } else if ((state.phase === 'hint' && shown !== null && shown.fp !== fp) || (state.phase === 'reveal-unsat' && next.game !== p)) {
      clearShown();
      set({ phase: 'idle', task: null, message: '', marks: null });
    }
  });

  return {
    getState: () => state,
    /**
     * @param {() => void} listener
     * @returns {() => void} unsubscribe
     */
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    requestHint,
    applyHint,
    reveal,
    declineReveal,
    cancel,
    dismiss,
    destroy() {
      destroyed = true;
      unsubscribe();
      abortActive();
      listeners.clear();
      try {
        pool?.close();
      } catch {
        // Already closed.
      }
      pool = null;
    },
  };
}

/** @typedef {ReturnType<typeof createHintController>} HintController */
