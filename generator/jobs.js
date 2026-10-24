// @ts-check
// Generator job controller: binds the generation client to the store. Every reply is checked against the revision of
// the job that asked for it, so a stale reply changes nothing. All searching runs in workers.
import { boardToRows } from '../core/engine/board.js';
import { clueKey, layoutKey } from '../core/engine/keys.js';
import { BUDGETS } from '../core/engine/policy.js';
import { randomPuzzleSeed } from '../core/engine/rng.js';
import {
  MAX_PACK_BYTES, MAX_PACK_PUZZLES, acceptSet, addSeenKeys, applyCertificate, batchLevelOf, buildPack, capFor, duplicateSetNumber,
  generationBlock, gotoSet, historyRoom, mergeSeenKeys, nextBatch, packFits,
  removeAllPuzzles, removeAllSets, removeCurrentSet, removePuzzle, renumberTitles, resetHistory, setTimelineLength, setViewPosition, setsFull,
  validSeed, visiblePack,
} from './state.js';
import { t } from './i18n.js';
import { formatMessage, formatNotice, levelLabel } from './strings.js';

/** @typedef {import('./state.js').GeneratorState} GeneratorState */
/** @typedef {import('./state.js').GeneratorStore} GeneratorStore */
/** @typedef {import('./state.js').StatusNotice} StatusNotice */
/** @typedef {import('../core/engine/types.js').Pack} Pack */
/** @typedef {import('../core/engine/types.js').Puzzle} Puzzle */
/** @typedef {import('../core/browser/generation-client.js').GenerationClient} GenerationClient */

/**
 * @typedef {object} JobControllerOptions
 * @property {GeneratorStore} store
 * @property {{ phone: boolean }} hardware
 * @property {GenerationClient} client
 * @property {boolean} [workersAvailable] False shows N-NOWORKER instead of starting a job.
 * @property {() => void} [cancelPending] Cancels every pool task, idle certificates included.
 * @property {(pack: Pack, index: number) => Promise<void>} [openPlayer] Opens the player in a new tab; rejects with `handoff-unavailable` or `popup-blocked`.
 * @property {(pack: Pack, fileName: string) => void} [download]
 * @property {(message: string, kind: 'info' | 'warning' | 'error') => void} [notify]
 * @property {() => void} [beforeNavigate] Saves the generator state before the player opens.
 * @property {() => number} [now]
 * @property {() => string} [randomNumber] Source of fresh puzzle seeds (whole numbers as text).
 * @property {typeof duplicateGuard} [duplicateGuard] Replaces the duplicate check of new puzzles (tests whose fake puzzles share clues).
 */

const KIB = 1024;

/**
 * @param {string} code
 * @param {string | (() => string)} text A function is kept as `retext`, so the text can follow a language switch.
 * @param {StatusNotice['kind']} kind
 * @param {string[]} [actions]
 * @returns {StatusNotice}
 */
function notice(code, text, kind, actions = []) {
  return typeof text === 'function' ? { code, text: text(), kind, actions, retext: text } : { code, text, kind, actions };
}

/**
 * Recognises a puzzle equal to one already seen on a set: the same id (exact clues), the same clue set or the same
 * solution up to a board symmetry. Admitting is idempotent per id.
 * @param {import('../core/engine/types.js').PieceSet} set
 * @param {Puzzle[]} existing Puzzles already listed; they are admitted without being compared.
 * @returns {{ admit: (puzzle: Puzzle) => boolean, rejected: Set<string> }}
 */
export function duplicateGuard(set, existing) {
  const ids = new Set();
  const clues = new Set();
  const layouts = new Set();
  /** @type {Set<string>} */
  const rejected = new Set();
  /** @type {Set<string>} */
  const admitted = new Set();
  /** @param {Puzzle} puzzle @returns {{ clue: string | null, layout: string | null }} */
  const keysOf = (puzzle) => {
    try {
      return {
        clue: clueKey(set.board, set.pieces, puzzle.clues),
        layout: Array.isArray(puzzle.solution) ? layoutKey(set.board, set.pieces, puzzle.solution) : null,
      };
    } catch {
      return { clue: null, layout: null };
    }
  };
  /** @param {Puzzle} puzzle */
  const remember = (puzzle) => {
    const { clue, layout } = keysOf(puzzle);
    ids.add(puzzle.id);
    if (clue !== null) {
      clues.add(clue);
    }
    if (layout !== null) {
      layouts.add(layout);
    }
  };
  existing.forEach(remember);
  return {
    rejected,
    admit(puzzle) {
      if (rejected.has(puzzle.id)) {
        return false;
      }
      const { clue, layout } = keysOf(puzzle);
      const known = ids.has(puzzle.id);
      if (known && admitted.has(puzzle.id)) {
        return true;
      }
      if (known || (clue !== null && clues.has(clue)) || (layout !== null && layouts.has(layout))) {
        rejected.add(puzzle.id);
        return false;
      }
      admitted.add(puzzle.id);
      remember(puzzle);
      return true;
    },
  };
}

/**
 * Maps the stop reason of a partial batch to its notice. A `layouts-not-found` stop with an exhaustive arrangement
 * count is a complete outcome, not a warning.
 * @param {string | undefined} reason
 * @param {{ n: number, q: number, levelId: string, arrangements?: import('../core/browser/generation-client.js').ArrangementReport }} o
 * @returns {StatusNotice | null}
 */
export function batchShortfall(reason, o) {
  const params = () => ({ n: o.n, q: o.q, level: levelLabel(o.levelId) });
  switch (reason) {
    case 'time-limit':
      return notice('N-PARTIAL', () => formatNotice('N-PARTIAL', params()), 'warning');
    case 'layouts-not-found': {
      const found = o.arrangements;
      if (found?.status === 'exhausted' && found.total !== undefined) {
        const variant = o.n === 0 ? 'none' : (found.earlier ?? 0) > 0 ? 'rest' : 'all';
        const total = found.total;
        return notice('N-ARRANGEMENTS', () => formatNotice('N-ARRANGEMENTS', { ...params(), total }, variant), 'info', ['new-set']);
      }
      if (found?.status === 'more' && found.tried !== undefined && (found.unusable ?? 0) > 0) {
        const unique = found.unusableWhy === 'uniqueness-not-proved';
        const count = found.unusable ?? 0;
        const variant = found.searched === true ? 'all' : 'some';
        return notice('N-LAYOUTS-UNUSED', () => {
          const clueset = t(unique ? 'notice.clueset.unique' : 'notice.clueset.plain', { level: params().level });
          return formatNotice('N-LAYOUTS-UNUSED', { ...params(), count, clueset }, variant);
        }, 'warning', ['new-set']);
      }
      if (found?.status === 'more' && found.tried === undefined) {
        return notice('N-LAYOUTS-LEFT', () => formatNotice('N-LAYOUTS-LEFT', params()), 'warning', ['new-set']);
      }
      return notice('N-FEWLAYOUTS', () => formatNotice('N-FEWLAYOUTS', params()), 'warning', ['new-set']);
    }
    case 'difficulty-not-found':
      return notice('N-SETLEVEL', () => formatNotice('N-SETLEVEL', params()), 'warning', ['new-set']);
    case 'uniqueness-not-proved':
      return notice('N-UNIQUE', () => formatNotice('N-UNIQUE', params()), 'warning');
    default:
      return null;
  }
}

/**
 * @param {GeneratorState} state
 * @returns {StatusNotice}
 */
function historyPrompt(state) {
  const used = Math.max(state.seenLayouts.length, state.seenClues.length);
  return notice('M-HISTORY-FULL', () => formatMessage('M-HISTORY-FULL', { used, max: BUDGETS.historyKeys }), 'warning', ['reset-history']);
}

/**
 * @param {unknown} error
 * @param {GeneratorState} state
 * @returns {StatusNotice}
 */
function errorNotice(error, state) {
  const code = /** @type {{ code?: unknown }} */ (error)?.code;
  if (code === 'model-too-large' || code === 'memory-limit') {
    return notice('N-TOOLARGE', () => formatNotice('N-TOOLARGE'), 'error');
  }
  if (code === 'worker-unavailable') {
    return notice('N-NOWORKER', () => formatNotice('N-NOWORKER'), 'error');
  }
  if (code === 'history-full') {
    return historyPrompt(state);
  }
  const detail = error instanceof Error ? error.message.slice(0, 300) : null;
  return notice('M-FAILED', () => formatMessage('M-FAILED', { message: detail ?? t('message.requestFailed') }), 'error');
}

/**
 * @param {JobControllerOptions} options
 */
export function createJobController(options) {
  const { store, hardware, client } = options;
  const now = options.now ?? (() => Date.now());
  const notify = options.notify ?? (() => {});
  let seq = 0;
  /** @type {string | null} */
  let certRevision = null;
  let destroyed = false;

  /** @param {string} revision */
  const isCurrent = (revision) => !destroyed && store.getState().job?.revision === revision;

  /** Stops lazy work of an earlier action: the idle certificate checks. */
  function stopBackground() {
    options.cancelPending?.();
    certRevision = null;
    store.update((s) => (s.checking.length === 0 ? s : { ...s, checking: [] }));
  }

  /**
   * @param {'set' | 'batch'} kind
   * @param {Partial<GeneratorState>} [patch]
   * @returns {string} The revision that owns the job.
   */
  function begin(kind, patch = {}) {
    seq += 1;
    stopBackground();
    const revision = `${kind}-${seq}`;
    store.update((s) => ({
      ...s,
      ...patch,
      job: { requestId: seq, revision, kind, startedAt: now(), accepted: 0 },
      notice: null,
      checking: [],
    }));
    return revision;
  }

  /**
   * Ends the job owned by `revision` with a state patch; a stale revision changes nothing.
   * @param {string} revision
   * @param {(state: GeneratorState) => GeneratorState} change
   * @returns {boolean}
   */
  function finish(revision, change) {
    if (!isCurrent(revision)) {
      return false;
    }
    store.update((s) => ({ ...change(s), job: null }));
    return true;
  }

  /**
   * @param {{ seed: string, state?: GeneratorState }} request The seed field is already updated.
   * @returns {Promise<void>}
   */
  async function generateSet(request) {
    const state = store.getState();
    if (state.job !== null || setsFull(state)) {
      return;
    }
    if (options.workersAvailable === false) {
      store.update((s) => ({ ...s, notice: notice('N-NOWORKER', () => formatNotice('N-NOWORKER'), 'error') }));
      return;
    }
    const { levelId, uniqueness, rotation } = state;
    const board = state.board;
    const revision = begin('set');
    /** @type {Awaited<ReturnType<GenerationClient['generateSet']>>} */
    let result;
    try {
      result = await client.generateSet({
        boardRows: boardToRows(board),
        rotation,
        levelId,
        seedText: request.seed,
        uniqueness,
        maxActive: capFor(hardware),
        revision,
      });
    } catch (error) {
      finish(revision, (s) => ({ ...s, notice: errorNotice(error, s) }));
      return;
    }
    if (result.status === 'complete' && result.set !== undefined && result.calibration !== undefined) {
      const { set, calibration } = result;
      const repeated = duplicateSetNumber(store.getState(), set);
      if (repeated !== null) {
        // The same board and pieces as a set already in the list: nothing is added; that set is shown instead.
        stopBackground();
        finish(revision, (s) => ({
          ...(gotoSet(s, setTimelineLength(s) - repeated) ?? s),
          notice: notice('N-DUPSET', () => formatNotice('N-DUPSET', { n: repeated }), 'info'),
        }));
        return;
      }
      finish(revision, (s) => ({
        ...acceptSet(s, { set, calibration, setSeed: request.seed, calibrationFor: { levelId, uniqueness }, trusted: true }),
        notice: null,
      }));
    } else if (result.status === 'cancelled') {
      finish(revision, (s) => ({ ...s, notice: notice('M-CANCELLED-SET', () => formatMessage('M-CANCELLED-SET'), 'info') }));
    } else {
      finish(revision, (s) => ({ ...s, notice: notice('N-NOSET', () => formatNotice('N-NOSET', { level: levelLabel(levelId) }), 'warning') }));
    }
  }

  /**
   * Generates the next puzzles of the set and adds them after the ones listed.
   * @returns {Promise<void>}
   */
  async function addMore() {
    const state = store.getState();
    if (state.job !== null || state.set === null || state.setSeed === null) {
      return;
    }
    const block = generationBlock(state, hardware);
    if (block !== null) {
      store.update((s) => ({ ...s, notice: notice('M-BLOCKED', () => generationBlock(store.getState(), hardware) ?? block, 'warning') }));
      return;
    }
    if (options.workersAvailable === false) {
      store.update((s) => ({ ...s, notice: notice('N-NOWORKER', () => formatNotice('N-NOWORKER'), 'error') }));
      return;
    }
    const room = MAX_PACK_PUZZLES - state.puzzles.length;
    if (room <= 0) {
      store.update((s) => ({ ...s, notice: notice('M-PACK-FULL', () => formatMessage('M-PACK-FULL', { max: MAX_PACK_PUZZLES }), 'warning') }));
      return;
    }
    const quantity = Math.min(state.quantity, room);
    if (historyRoom(state) < quantity) {
      store.update((s) => ({ ...s, notice: historyPrompt(s) }));
      return;
    }

    const targetLevelId = batchLevelOf(state);
    // Every press draws its own random whole-number seed.
    const batchSeed = validSeed((options.randomNumber ?? randomPuzzleSeed)()) ?? randomPuzzleSeed();
    const begun = /** @type {NonNullable<ReturnType<typeof nextBatch>>} */ (nextBatch(state, batchSeed));
    const { set, uniqueness, setSeed } = { set: state.set, uniqueness: state.uniqueness, setSeed: state.setSeed };
    const before = state.puzzles;
    const made = state.calibrationFor;
    const reusable = state.calibration !== null && state.calibrationTrusted && made !== null
      && made.levelId === targetLevelId && made.uniqueness === uniqueness;
    const revision = begin('batch', { batchIndex: begun.batchIndex });
    certRevision = revision;
    /** @param {Puzzle[]} list @returns {Record<string, string>} */
    const seedsFor = (list) => Object.fromEntries(list.map((p) => [p.id, begun.batchSeed]));
    /** @type {Puzzle[]} */
    const streamed = [];
    // Backstop for the engine's own history: a puzzle equal to one already listed is never added.
    const guard = (options.duplicateGuard ?? duplicateGuard)(set, [...before, ...state.parked.flat()]);

    /** @type {Awaited<ReturnType<GenerationClient['generateBatch']>> | null} */
    let result = null;
    /** @type {unknown} */
    let failure = null;
    try {
      result = await client.generateBatch({
        set,
        rotation: state.rotation,
        targetLevelId,
        quantity,
        setSeed,
        batchIndex: begun.batchIndex,
        batchSeed: begun.batchSeed,
        displayOffset: before.length,
        uniqueness,
        seenLayouts: [...state.seenLayouts],
        seenClues: [...state.seenClues],
        ...(reusable ? { calibration: /** @type {Puzzle} */ (state.calibration) } : {}),
        ...(made === null ? {} : { setLevel: made.levelId }),
        revision,
      }, {
        onAccepted: (event) => {
          if (!isCurrent(revision) || !guard.admit(event.puzzle)) {
            return;
          }
          streamed.push(event.puzzle);
          store.update((s) => {
            const seen = addSeenKeys(s, event.puzzle);
            return {
              ...seen,
              puzzles: [...before, ...streamed],
              puzzleSeeds: { ...seen.puzzleSeeds, ...seedsFor(streamed) },
              job: s.job === null ? null : { ...s.job, accepted: streamed.length },
            };
          });
        },
        onCertificate: (event) => {
          if (certRevision === revision && event.revision === revision && !destroyed) {
            store.update((s) => applyCertificate(s, event.puzzleId, event.certificate));
          }
        },
      });
    } catch (error) {
      failure = error;
    }
    if (!isCurrent(revision)) {
      return;
    }

    const fault = /** @type {{ accepted?: Puzzle[], seenLayouts?: string[], seenClues?: string[] } | null} */ (failure);
    const rawAccepted = result !== null ? result.accepted : fault?.accepted ?? streamed;
    const accepted = rawAccepted.filter((p) => guard.admit(p));
    const seenLayouts = result !== null ? result.seenLayouts : fault?.seenLayouts ?? [];
    const seenClues = result !== null ? result.seenClues : fault?.seenClues ?? [];
    const status = result?.status ?? 'partial';
    const reason = result?.reason;

    finish(revision, (s) => {
      let puzzles = [...before, ...accepted];
      let parked = s.parked;
      /** @type {StatusNotice | null} */
      let outcome = null;
      if (before.length > 0 && accepted.length > 0 && !packFits({ ...s, puzzles }, puzzles)) {
        parked = [...parked, before];
        puzzles = renumberTitles(accepted);
        const parkedCount = before.length;
        outcome = notice('M-SPLIT', () => formatMessage('M-SPLIT', { kib: MAX_PACK_BYTES / KIB, n: parkedCount }), 'warning');
      }
      if (failure !== null) {
        outcome = errorNotice(failure, s);
      } else if (status === 'cancelled') {
        outcome = notice('M-CANCELLED-BATCH', () => formatMessage('M-CANCELLED-BATCH', { n: accepted.length, q: quantity, level: levelLabel(targetLevelId) }), 'info');
      } else if (reason !== undefined) {
        outcome = batchShortfall(reason, { n: accepted.length, q: quantity, levelId: targetLevelId, arrangements: result?.arrangements }) ?? outcome;
      }
      if (guard.rejected.size > 0 && failure === null) {
        outcome = notice('M-DUPLICATE', () => formatMessage('M-DUPLICATE'), 'error');
      }
      const pendingIds = result !== null && status !== 'cancelled' && reason !== 'time-limit'
        ? accepted.filter((p) => p.certificate === null || p.certificate === undefined).map((p) => p.id)
        : [];
      return {
        ...s,
        puzzles,
        puzzleSeeds: { ...s.puzzleSeeds, ...seedsFor(accepted) },
        parked,
        seenLayouts: mergeSeenKeys(s.seenLayouts, seenLayouts),
        seenClues: mergeSeenKeys(s.seenClues, seenClues),
        checking: pendingIds.filter((id) => puzzles.some((p) => p.id === id)),
        notice: outcome,
      };
    });
  }

  /** Stops the running job at the next opportunity; accepted puzzles stay. */
  function cancel() {
    const job = store.getState().job;
    if (job === null || job.cancelling === true) {
      return;
    }
    store.update((s) => (s.job === null ? s : { ...s, job: { ...s.job, cancelling: true } }));
    client.cancel();
  }

  /** @param {string} puzzleId */
  function remove(puzzleId) {
    if (store.getState().job === null) {
      store.update((s) => removePuzzle(s, puzzleId));
    }
  }

  /** The seen-history stays. */
  function removeAll() {
    if (store.getState().job === null) {
      store.update((s) => removeAllPuzzles(s));
    }
  }

  function clearHistory() {
    if (store.getState().job === null) {
      store.update((s) => resetHistory(s));
    }
  }

  /** @param {number} delta 1 = older set, -1 = newer set; only the sets of the board in step 1 are stepped through. */
  function stepSet(delta) {
    const state = store.getState();
    if (state.job !== null) {
      return;
    }
    const { index, total } = setViewPosition(state);
    // A set made for another board is on show: older goes to the newest set of the board, newer has nowhere to go.
    const target = index === -1 ? (delta > 0 ? 0 : -1) : index + delta;
    if (target < 0 || target >= total) {
      return;
    }
    stopBackground();
    const next = gotoSet(state, target);
    store.update(() => next ?? state);
  }

  /** Drops the set on show; a neighbour takes its place. */
  function removeSet() {
    const state = store.getState();
    if (state.job !== null || state.set === null) {
      return;
    }
    stopBackground();
    store.update((s) => removeCurrentSet(s));
  }

  /** Drops every set of the board in step 1, the one on show included; the sets of other boards stay. */
  function removeSets() {
    const state = store.getState();
    if (state.job !== null || state.set === null) {
      return;
    }
    stopBackground();
    store.update((s) => removeAllSets(s));
  }

  /**
   * Opens the player on one puzzle of the visible pack in a new tab; the generator stays where it is, so nothing is
   * cancelled or stopped.
   * @param {string} puzzleId
   * @returns {Promise<void>}
   */
  async function playPuzzle(puzzleId) {
    const pack = visiblePack(store.getState());
    const index = pack === null ? -1 : pack.puzzles.findIndex((p) => p.id === puzzleId);
    if (pack === null || index < 0 || options.openPlayer === undefined) {
      return;
    }
    options.beforeNavigate?.();
    try {
      await options.openPlayer(pack, index);
    } catch (error) {
      const code = /** @type {{ code?: unknown }} */ (error)?.code;
      if (code === 'handoff-unavailable') {
        store.update((s) => ({ ...s, notice: notice('M-PLAYER-UNAVAILABLE', () => formatMessage('M-PLAYER-UNAVAILABLE'), 'warning') }));
      } else if (code === 'popup-blocked') {
        store.update((s) => ({ ...s, notice: notice('M-PLAYER-BLOCKED', () => formatMessage('M-PLAYER-BLOCKED'), 'warning') }));
      } else {
        throw error;
      }
    }
  }

  /**
   * Downloads an earlier pack that was split off at the file size limit.
   * @param {number} index
   */
  function exportParked(index) {
    const state = store.getState();
    const group = state.parked[index];
    if (group === undefined || state.set === null || options.download === undefined) {
      return;
    }
    const pack = buildPack(state, group);
    try {
      options.download(pack, `pentomino-${state.setSeed ?? 'set'}-earlier-${index + 1}`);
    } catch {
      notify(formatMessage('M-EXPORT-FAILED'), 'error');
    }
  }

  return {
    generateSet,
    addMore,
    cancel,
    removePuzzle: remove,
    removeAllPuzzles: removeAll,
    resetHistory: clearHistory,
    stepSet,
    removeSet,
    removeAllSets: removeSets,
    playPuzzle,
    exportParked,
    destroy() {
      destroyed = true;
    },
  };
}
