// @ts-check
// Generator job controller (design §6.9, §8.6, §9.3, §9.4, §10.4–§10.6): binds the generation
// client to the store. It owns the `job` field, checks the request revision on every reply, replaces
// state atomically, and prepares links, exports and imports. It never solves anything itself: all
// searching runs in the client's workers or in the injected worker task runner.
import { boardToRows } from '../core/engine/board.js';
import { level } from '../core/engine/levels.js';
import { MAX_FILE_BYTES, packBoard, parsePack } from '../core/engine/pack.js';
import { BUDGETS } from '../core/engine/policy.js';
import { isValidLayout } from '../core/engine/tiling.js';
import { loadFromText } from '../core/browser/handoff.js';
import {
  MAX_PACK_BYTES, MAX_PACK_PUZZLES, acceptSet, addSeenKeys, applyCertificate, batchLevelOf, buildPack, capFor, clampQuantity,
  generationBlock, gotoSet, historyRoom, importPackState, mergeSeenKeys, nextBatch, packFits, readyLevelId, referenceOf,
  removePuzzle, renumberTitles, resetHistory, setTimelineLength, visiblePack,
} from './state.js';
import { formatMessage, formatNotice } from './strings.js';

/** @typedef {import('./state.js').GeneratorState} GeneratorState */
/** @typedef {import('./state.js').GeneratorStore} GeneratorStore */
/** @typedef {import('./state.js').StatusNotice} StatusNotice */
/** @typedef {import('./state.js').LinkItem} LinkItem */
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
 * @property {(kind: 'solveFirst' | 'verifyPack', payload: object, o: { signal: AbortSignal }) => Promise<unknown>} [runWorkerTask]
 *   Runs one bounded worker task outside the generation client (imports).
 * @property {(pack: Pack, index: number) => Promise<LinkItem>} [prepareLink]
 * @property {(pack: Pack, index: number) => Promise<void>} [openPlayer] Same-tab hand-off; rejects with `handoff-unavailable`.
 * @property {(pack: Pack, fileName: string, o: { omitSolutions: boolean }) => void} [download]
 * @property {(text: string) => Promise<boolean>} [copy]
 * @property {(message: string, kind: 'info' | 'warning' | 'error') => void} [notify]
 * @property {(pack: Pack) => void} [saveLibrary] Best-effort library save before a same-tab hand-off.
 * @property {() => void} [beforeNavigate] Saves the generator state.
 * @property {() => number} [now]
 * @property {(fn: () => void, ms: number) => unknown} [setTimer]
 * @property {(handle: any) => void} [clearTimer]
 * @property {() => string} [random]
 * @property {number} [linkDelayMs]
 */

const PROGRESS_THROTTLE_MS = 200;
const LINK_DELAY_MS = 150;
const KIB = 1024;

/**
 * @param {string} id
 * @returns {string}
 */
function levelLabel(id) {
  try {
    return level(id).label;
  } catch {
    return id;
  }
}

/**
 * @param {string} code
 * @param {string} text
 * @param {StatusNotice['kind']} kind
 * @param {string[]} [actions]
 * @returns {StatusNotice}
 */
function notice(code, text, kind, actions = []) {
  return { code, text, kind, actions };
}

/**
 * Maps a partial batch to its design notice (§10.7 trigger table). A `layouts-not-found` stop with an
 * exhaustive arrangement count (owner decision 2026-10-23) is a complete outcome, not a warning; when
 * unused arrangements were tried as candidates (fix round 3) and gave no puzzle, the warning says so.
 * @param {string | undefined} reason
 * @param {{ n: number, q: number, levelId: string, arrangements?: import('../core/browser/generation-client.js').ArrangementReport }} o
 * @returns {StatusNotice | null}
 */
export function batchShortfall(reason, o) {
  const params = { n: o.n, q: o.q, level: levelLabel(o.levelId) };
  switch (reason) {
    case 'time-limit':
      return notice('N-PARTIAL', formatNotice('N-PARTIAL', params), 'warning');
    case 'layouts-not-found': {
      const found = o.arrangements;
      if (found?.status === 'exhausted' && found.total !== undefined) {
        const variant = o.n === 0 ? 'none' : (found.earlier ?? 0) > 0 ? 'rest' : 'all';
        return notice('N-ARRANGEMENTS', formatNotice('N-ARRANGEMENTS', { ...params, total: found.total }, variant), 'info', ['new-set']);
      }
      if (found?.status === 'more' && found.tried !== undefined && (found.unusable ?? 0) > 0) {
        const clueset = found.unusableWhy === 'uniqueness-not-proved'
          ? `clue set with exactly one solution that rates ${params.level}`
          : `clue set that rates ${params.level}`;
        return notice('N-LAYOUTS-UNUSED', formatNotice('N-LAYOUTS-UNUSED', { ...params, count: found.unusable ?? 0, clueset }, found.searched === true ? 'all' : 'some'), 'warning', ['new-set']);
      }
      if (found?.status === 'more' && found.tried === undefined) {
        return notice('N-LAYOUTS-LEFT', formatNotice('N-LAYOUTS-LEFT', params), 'warning', ['new-set']);
      }
      return notice('N-FEWLAYOUTS', formatNotice('N-FEWLAYOUTS', params), 'warning', ['new-set']);
    }
    case 'difficulty-not-found':
      return notice('N-SETLEVEL', formatNotice('N-SETLEVEL', params), 'warning', ['new-set']);
    case 'uniqueness-not-proved':
      return notice('N-UNIQUE', formatNotice('N-UNIQUE', params), 'warning');
    default:
      return null;
  }
}

/**
 * @param {number} room
 * @param {number} q
 * @param {GeneratorState} state
 * @returns {StatusNotice}
 */
function historyPrompt(room, q, state) {
  const used = Math.max(state.seenLayouts.length, state.seenClues.length);
  const text = formatMessage('M-HISTORY-FULL', { used, max: BUDGETS.historyKeys, room, q });
  return { ...notice('M-HISTORY-FULL', text, 'warning', room > 0 ? ['reset-history', 'smaller-quantity'] : ['reset-history']), room };
}

/**
 * @param {unknown} error
 * @param {GeneratorState} state
 * @param {number} quantity
 * @returns {StatusNotice}
 */
function errorNotice(error, state, quantity) {
  const code = /** @type {{ code?: unknown }} */ (error)?.code;
  if (code === 'model-too-large' || code === 'memory-limit') {
    return notice('N-TOOLARGE', formatNotice('N-TOOLARGE'), 'error');
  }
  if (code === 'worker-unavailable') {
    return notice('N-NOWORKER', formatNotice('N-NOWORKER'), 'error');
  }
  if (code === 'history-full') {
    return historyPrompt(historyRoom(state), quantity, state);
  }
  const message = error instanceof Error ? error.message.slice(0, 300) : 'The request failed';
  return notice('M-FAILED', formatMessage('M-FAILED', { message }), 'error');
}

/**
 * @param {JobControllerOptions} options
 */
export function createJobController(options) {
  const { store, hardware, client } = options;
  const now = options.now ?? (() => Date.now());
  const setTimer = options.setTimer ?? ((fn, ms) => globalThis.setTimeout(fn, ms));
  const clearTimer = options.clearTimer ?? ((handle) => globalThis.clearTimeout(handle));
  const notify = options.notify ?? (() => {});
  let seq = 0;
  let lastProgressAt = 0;
  /** @type {string | null} */
  let certRevision = null;
  /** @type {AbortController | null} */
  let taskAbort = null;
  /** @type {AbortController | null} */
  let verifyAbort = null;
  /** @type {unknown} */
  let linkTimer = null;
  let linkToken = 0;
  let destroyed = false;

  /** @param {string} revision */
  const isCurrent = (revision) => !destroyed && store.getState().job?.revision === revision;

  /** Stops lazy work of an earlier action: idle certificates and import verification. */
  function stopBackground() {
    options.cancelPending?.();
    certRevision = null;
    if (verifyAbort !== null) {
      verifyAbort.abort();
      verifyAbort = null;
    }
    store.update((s) => {
      const open = Object.values(s.verification).includes('checking');
      if (!open && s.checking.length === 0) {
        return s;
      }
      return {
        ...s,
        checking: [],
        verification: open
          ? Object.fromEntries(Object.entries(s.verification).map(([id, v]) => [id, v === 'checking' ? 'not-verified' : v]))
          : s.verification,
      };
    });
  }

  /**
   * @param {'set' | 'batch' | 'import'} kind
   * @param {number} [quantity]
   * @param {Partial<GeneratorState>} [patch]
   * @returns {string} The revision that owns the job.
   */
  function begin(kind, quantity = 0, patch = {}) {
    seq += 1;
    stopBackground();
    const revision = `${kind}-${seq}`;
    lastProgressAt = 0;
    store.update((s) => ({
      ...s,
      ...patch,
      job: { requestId: seq, revision, kind, stage: 'starting', startedAt: now(), accepted: 0, quantity },
      notice: null,
      checking: [],
    }));
    return revision;
  }

  /**
   * @param {string} revision
   * @param {{ stage: string, accepted?: number, quantity?: number, slot?: number }} p
   */
  function progress(revision, p) {
    const t = now();
    store.update((s) => {
      const job = s.job;
      if (job === null || job.revision !== revision || job.cancelling === true) {
        return s;
      }
      const accepted = p.accepted ?? job.accepted;
      const quantity = p.quantity ?? job.quantity;
      const slot = p.slot ?? job.slot;
      const same = p.stage === job.stage && accepted === job.accepted && quantity === job.quantity && slot === job.slot;
      if (same || (p.stage === job.stage && accepted === job.accepted && t - lastProgressAt < PROGRESS_THROTTLE_MS)) {
        return s;
      }
      lastProgressAt = t;
      return { ...s, job: { ...job, stage: p.stage, accepted, quantity, ...(slot === undefined ? {} : { slot }) } };
    });
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

  // Piece sets

  /**
   * @param {{ seed: string, state?: GeneratorState }} request The seed field is already updated.
   * @returns {Promise<void>}
   */
  async function generateSet(request) {
    const state = store.getState();
    if (state.job !== null) {
      return;
    }
    if (options.workersAvailable === false) {
      store.update((s) => ({ ...s, notice: notice('N-NOWORKER', formatNotice('N-NOWORKER'), 'error') }));
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
        maxActive: capFor(state, hardware),
        revision,
      }, { onProgress: (p) => progress(revision, p) });
    } catch (error) {
      finish(revision, (s) => ({ ...s, notice: errorNotice(error, s, 0) }));
      return;
    }
    if (result.status === 'complete' && result.set !== undefined && result.calibration !== undefined) {
      const { set, calibration } = result;
      finish(revision, (s) => ({
        ...acceptSet(s, { set, calibration, setSeed: request.seed, calibrationFor: { levelId, uniqueness }, trusted: true }),
        notice: null,
      }));
    } else if (result.status === 'cancelled') {
      finish(revision, (s) => ({ ...s, notice: notice('M-CANCELLED-SET', formatMessage('M-CANCELLED-SET'), 'info') }));
    } else {
      finish(revision, (s) => ({ ...s, notice: notice('N-NOSET', formatNotice('N-NOSET', { level: levelLabel(levelId) }), 'warning') }));
    }
  }

  // Puzzle batches

  /**
   * @param {boolean} append
   * @returns {Promise<void>}
   */
  async function startBatch(append) {
    const state = store.getState();
    if (state.job !== null || state.set === null || state.setSeed === null || state.stale) {
      return;
    }
    const block = generationBlock(state, hardware);
    if (block !== null) {
      store.update((s) => ({ ...s, notice: notice('M-BLOCKED', block, 'warning') }));
      return;
    }
    if (options.workersAvailable === false) {
      store.update((s) => ({ ...s, notice: notice('N-NOWORKER', formatNotice('N-NOWORKER'), 'error') }));
      return;
    }
    let quantity = clampQuantity(state.quantity);
    if (append) {
      const room = MAX_PACK_PUZZLES - state.puzzles.length;
      if (room <= 0) {
        store.update((s) => ({ ...s, notice: notice('M-PACK-FULL', formatMessage('M-PACK-FULL', { max: MAX_PACK_PUZZLES }), 'warning') }));
        return;
      }
      quantity = Math.min(quantity, room);
    }
    const historyLeft = historyRoom(state);
    if (historyLeft < quantity) {
      store.update((s) => ({ ...s, notice: historyPrompt(historyLeft, quantity, s) }));
      return;
    }

    const targetLevelId = batchLevelOf(state);
    const begun = /** @type {NonNullable<ReturnType<typeof nextBatch>>} */ (nextBatch(state));
    const { set, uniqueness, setSeed } = { set: state.set, uniqueness: state.uniqueness, setSeed: state.setSeed };
    const before = state.puzzles;
    const claimedBefore = state.claimedIds;
    const displayOffset = append ? before.length : 0;
    const made = state.calibrationFor;
    const reusable = state.calibration !== null && state.calibrationTrusted && made !== null
      && made.levelId === targetLevelId && made.uniqueness === uniqueness;
    const revision = begin('batch', quantity, { batchIndex: begun.batchIndex });
    certRevision = revision;
    /** @type {Puzzle[]} */
    const streamed = [];

    /** @param {GeneratorState} s @returns {GeneratorState} */
    const showStreamed = (s) => {
      const puzzles = append ? [...before, ...streamed] : streamed.length > 0 ? [...streamed] : before;
      return { ...s, puzzles, claimedIds: append ? claimedBefore : [] };
    };

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
        displayOffset,
        uniqueness,
        seenLayouts: [...state.seenLayouts],
        seenClues: [...state.seenClues],
        ...(reusable ? { calibration: /** @type {Puzzle} */ (state.calibration) } : {}),
        ...(made === null ? {} : { setLevel: made.levelId }),
        revision,
      }, {
        onProgress: (p) => progress(revision, p),
        onAccepted: (event) => {
          if (!isCurrent(revision)) {
            return;
          }
          streamed.push(event.puzzle);
          store.update((s) => {
            const seen = addSeenKeys(s, event.puzzle);
            return {
              ...showStreamed(seen),
              job: s.job === null ? null : { ...s.job, accepted: streamed.length, quantity },
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
    const accepted = result !== null ? result.accepted : fault?.accepted ?? streamed;
    const seenLayouts = result !== null ? result.seenLayouts : fault?.seenLayouts ?? [];
    const seenClues = result !== null ? result.seenClues : fault?.seenClues ?? [];
    const status = result?.status ?? 'partial';
    const reason = result?.reason;

    finish(revision, (s) => {
      let puzzles = append ? [...before, ...accepted] : accepted.length > 0 ? [...accepted] : before;
      let claimedIds = append ? claimedBefore : accepted.length > 0 ? [] : claimedBefore;
      let parked = s.parked;
      /** @type {StatusNotice | null} */
      let outcome = null;
      if (append && before.length > 0 && accepted.length > 0 && !packFits({ ...s, puzzles }, puzzles)) {
        parked = [...parked, before];
        puzzles = renumberTitles(accepted);
        claimedIds = [];
        outcome = notice('M-SPLIT', formatMessage('M-SPLIT', { kib: MAX_PACK_BYTES / KIB, n: before.length }), 'warning');
      }
      if (failure !== null) {
        outcome = errorNotice(failure, s, quantity);
      } else if (status === 'cancelled') {
        outcome = notice('M-CANCELLED-BATCH', formatMessage('M-CANCELLED-BATCH', { n: accepted.length, q: quantity, level: levelLabel(targetLevelId) }), 'info');
      } else if (reason !== undefined) {
        outcome = batchShortfall(reason, { n: accepted.length, q: quantity, levelId: targetLevelId, arrangements: result?.arrangements }) ?? outcome;
      }
      const pendingIds = result !== null && status !== 'cancelled' && reason !== 'time-limit'
        ? accepted.filter((p) => p.certificate === null || p.certificate === undefined).map((p) => p.id)
        : [];
      return {
        ...s,
        puzzles,
        claimedIds,
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
    store.update((s) => (s.job === null ? s : { ...s, job: { ...s.job, cancelling: true, stage: 'cancelling' } }));
    if (job.kind === 'import') {
      taskAbort?.abort();
    } else {
      client.cancel();
    }
  }

  // Imports

  /**
   * @param {Pack} pack Validated by T11.
   * @returns {Promise<boolean>} Whether the pack replaced the current set.
   */
  async function importPack(pack) {
    if (store.getState().job !== null) {
      return false;
    }
    let reference = referenceOf(pack)?.layout ?? null;
    const revision = begin('import');
    /** @type {'given' | 'solved' | 'exhausted' | 'cutoff'} */
    let found = reference === null ? 'cutoff' : 'given';
    if (reference === null && options.runWorkerTask !== undefined) {
      store.update((s) => (s.job === null ? s : { ...s, job: { ...s.job, stage: 'import' } }));
      taskAbort = new AbortController();
      try {
        const reply = /** @type {{ layout?: any, exhausted?: boolean } | null} */ (await options.runWorkerTask('solveFirst', {
          boardRows: pack.board.rows,
          pieces: pack.pieces,
          clues: [],
          rowLimit: BUDGETS.verifyRows,
        }, { signal: taskAbort.signal }));
        if (reply !== null && Array.isArray(reply.layout) && isValidLayout(packBoard(pack), pack.pieces, reply.layout)) {
          reference = reply.layout;
          found = 'solved';
        } else if (reply?.layout === null && reply.exhausted === true) {
          found = 'exhausted';
        }
      } catch (error) {
        if (taskAbort?.signal.aborted && store.getState().job?.cancelling === true) {
          taskAbort = null;
          finish(revision, (s) => ({ ...s, notice: notice('M-CANCELLED-IMPORT', formatMessage('M-CANCELLED-IMPORT'), 'info') }));
          return false;
        }
      }
      taskAbort = null;
    }
    if (!isCurrent(revision)) {
      return false;
    }
    const current = store.getState();
    const imported = importPackState(current, pack, reference, options.random);
    const block = generationBlock(imported.state, hardware);
    const parts = [formatMessage('M-IMPORTED', { pieces: pack.pieces.length, puzzles: pack.puzzles.length })];
    if (found === 'exhausted') {
      parts.push(formatMessage('M-NOARRANGEMENT'));
    } else if (block !== null) {
      parts.push(block);
    } else {
      parts.push(formatMessage('M-IMPORT-HISTORY'));
    }
    const text = parts.join(' ');
    finish(revision, () => ({
      ...imported.state,
      notice: notice('M-IMPORTED', text, block === null && found !== 'exhausted' ? 'info' : 'warning'),
    }));
    verifyImported(pack);
    return true;
  }

  /**
   * Checks imported puzzles that carry no answer, in a worker, after the import. Play never waits for it.
   * @param {Pack} pack
   */
  function verifyImported(pack) {
    const state = store.getState();
    const open = pack.puzzles.filter((p) => !Array.isArray(p.solution)).map((p) => p.id);
    if (open.length === 0) {
      return;
    }
    const set = state.set;
    if (options.runWorkerTask === undefined) {
      store.update((s) => ({ ...s, verification: { ...s.verification, ...Object.fromEntries(open.map((id) => [id, 'not-verified'])) } }));
      return;
    }
    verifyAbort = new AbortController();
    const abort = verifyAbort;
    options.runWorkerTask('verifyPack', { pack }, { signal: abort.signal }).then((reply) => {
      const results = /** @type {{ results?: { index: number, status: string }[] }} */ (reply)?.results ?? [];
      store.update((s) => {
        if (s.set !== set || abort.signal.aborted) {
          return s;
        }
        const verification = { ...s.verification };
        for (const entry of results) {
          const id = pack.puzzles[entry.index]?.id;
          if (id !== undefined && verification[id] === 'checking') {
            verification[id] = entry.status === 'solvable' || entry.status === 'unsatisfiable' ? entry.status : 'not-verified';
          }
        }
        return { ...s, verification };
      });
    }, () => {
      store.update((s) => (s.set !== set ? s : {
        ...s,
        verification: Object.fromEntries(Object.entries(s.verification).map(([id, v]) => [id, v === 'checking' ? 'not-verified' : v])),
      }));
    });
  }

  /**
   * @param {string} reason
   * @returns {void}
   */
  function importFailed(reason) {
    store.update((s) => ({ ...s, notice: notice('M-IMPORT-FAILED', formatMessage('M-IMPORT-FAILED', { reason }), 'error') }));
  }

  /**
   * Pasted text: raw pack JSON, a player link or a share code.
   * @param {string} text
   * @returns {Promise<boolean>}
   */
  async function importText(text) {
    if (store.getState().job !== null) {
      return false;
    }
    const trimmed = String(text).trim();
    const loaded = trimmed.startsWith('{') ? parsePack(trimmed) : await loadFromText(trimmed);
    if (!loaded.ok) {
      importFailed(loaded.issues[0]?.message ?? 'The text is not a puzzle pack.');
      return false;
    }
    return importPack('pack' in loaded.value ? loaded.value.pack : loaded.value);
  }

  /**
   * @param {{ size: number, text: () => Promise<string> }} file
   * @returns {Promise<boolean>}
   */
  async function importFile(file) {
    if (store.getState().job !== null) {
      return false;
    }
    if (!file || file.size > MAX_FILE_BYTES) {
      importFailed(formatMessage('M-IMPORT-TOOBIG', { kib: MAX_FILE_BYTES / KIB }));
      return false;
    }
    let text;
    try {
      text = await file.text();
    } catch {
      importFailed('The file could not be read.');
      return false;
    }
    return importText(text);
  }

  // Cards, history and settings

  /** @param {string} puzzleId */
  function remove(puzzleId) {
    if (store.getState().job === null) {
      store.update((s) => removePuzzle(s, puzzleId));
    }
  }

  function clearHistory() {
    if (store.getState().job === null) {
      store.update((s) => resetHistory(s));
    }
  }

  /** @param {number} room */
  function requestFewer(room) {
    store.update((s) => ({ ...s, quantity: clampQuantity(room), notice: null }));
  }

  /** @param {number} delta -1 = older set, +1 = newer set */
  function stepSet(delta) {
    const state = store.getState();
    if (state.job !== null) {
      return;
    }
    const target = state.setPosition + delta;
    if (target < 0 || target >= setTimelineLength(state)) {
      return;
    }
    stopBackground();
    const next = gotoSet(state, target);
    store.update(() => next ?? state);
  }

  // Links, hand-off and exports

  async function refreshLinks() {
    linkTimer = null;
    const state = store.getState();
    if (destroyed || state.job !== null) {
      return;
    }
    const pack = visiblePack(state);
    if (pack === null) {
      if (state.links.pack !== null) {
        store.update((s) => ({ ...s, links: { pack: null, ids: [], items: [] } }));
      }
      return;
    }
    if (state.links.pack === pack) {
      return;
    }
    linkToken += 1;
    const token = linkToken;
    const prepare = options.prepareLink;
    if (prepare === undefined) {
      return;
    }
    const items = await Promise.all(pack.puzzles.map((_, i) => prepare(pack, i).catch(() => ({ href: null, portable: false }))));
    const latest = store.getState();
    if (destroyed || token !== linkToken || latest.job !== null || visiblePack(latest) !== pack) {
      return;
    }
    store.update((s) => ({ ...s, links: { pack, ids: pack.puzzles.map((p) => p.id), items } }));
  }

  function scheduleLinks() {
    if (linkTimer !== null) {
      clearTimer(linkTimer);
    }
    linkTimer = setTimer(() => void refreshLinks(), options.linkDelayMs ?? LINK_DELAY_MS);
  }

  const unsubscribe = store.subscribe((state, previous) => {
    if (state.puzzles !== previous.puzzles || state.set !== previous.set || state.rotation !== previous.rotation
      || state.job !== previous.job) {
      scheduleLinks();
    }
  });
  scheduleLinks();

  /** @returns {Pack | null} */
  const currentPack = () => visiblePack(store.getState());

  /**
   * Before any same-tab navigation: unfinished work stops, the state is saved and the pack goes to the library.
   * @param {Pack | null} [pack]
   */
  function prepareNavigation(pack = currentPack()) {
    if (store.getState().job !== null) {
      client.cancel();
    }
    stopBackground();
    options.beforeNavigate?.();
    if (pack !== null) {
      try {
        options.saveLibrary?.(pack);
      } catch {
        // The library is best effort; the link itself decides whether the hand-off works.
      }
    }
  }

  /**
   * @param {Pack} pack
   * @param {number} index
   */
  async function play(pack, index) {
    if (options.openPlayer === undefined) {
      return;
    }
    options.beforeNavigate?.();
    stopBackground();
    try {
      await options.openPlayer(pack, index);
    } catch (error) {
      if (/** @type {{ code?: unknown }} */ (error)?.code === 'handoff-unavailable') {
        store.update((s) => ({ ...s, notice: notice('M-PLAYER-UNAVAILABLE', formatMessage('M-PLAYER-UNAVAILABLE'), 'warning') }));
      } else {
        throw error;
      }
    }
  }

  /** @returns {Promise<void>} */
  function playAll() {
    const pack = currentPack();
    return pack === null ? Promise.resolve() : play(pack, 0);
  }

  /**
   * @param {string} puzzleId
   * @returns {Promise<void>}
   */
  function playPuzzle(puzzleId) {
    const pack = currentPack();
    const index = pack === null ? -1 : pack.puzzles.findIndex((p) => p.id === puzzleId);
    return pack === null || index < 0 ? Promise.resolve() : play(pack, index);
  }

  /**
   * @param {Pack} pack
   * @param {string} name
   */
  function writeFile(pack, name) {
    if (options.download === undefined) {
      return;
    }
    try {
      options.download(pack, name, { omitSolutions: store.getState().omitSolutions });
    } catch {
      notify(formatMessage('M-EXPORT-FAILED'), 'error');
    }
  }

  /** @returns {string} */
  function exportName() {
    const state = store.getState();
    return `pentomino-${state.setSeed ?? 'set'}`;
  }

  function exportPack() {
    const pack = currentPack();
    if (pack !== null) {
      writeFile(pack, `${exportName()}-${pack.puzzles.length}-puzzles`);
    }
  }

  /** @param {string} puzzleId */
  function exportPuzzle(puzzleId) {
    const state = store.getState();
    const puzzle = state.puzzles.find((p) => p.id === puzzleId);
    if (puzzle !== undefined && state.set !== null) {
      writeFile(buildPack(state, [puzzle]), `${exportName()}-${puzzle.title ?? puzzle.id}`);
    }
  }

  function exportSet() {
    const state = store.getState();
    if (state.set !== null) {
      writeFile(buildPack(state, []), `${exportName()}-piece-set`);
    }
  }

  /** @param {number} index */
  function exportParked(index) {
    const state = store.getState();
    const group = state.parked[index];
    if (group !== undefined && state.set !== null) {
      writeFile(buildPack(state, group), `${exportName()}-earlier-${index + 1}`);
    }
  }

  /**
   * @param {number} index Position in the visible pack.
   * @returns {Promise<void>}
   */
  async function copyLink(index) {
    const pack = currentPack();
    if (pack === null || options.copy === undefined) {
      return;
    }
    const links = store.getState().links;
    /** @type {LinkItem | undefined} */
    let item = links.pack === pack ? links.items[index] : undefined;
    if (item === undefined && options.prepareLink !== undefined) {
      item = await options.prepareLink(pack, index).catch(() => undefined);
    }
    if (item === undefined || item.href === null) {
      notify(item?.warning ?? formatMessage('M-PLAYER-UNAVAILABLE'), 'warning');
      return;
    }
    const copied = await options.copy(item.href);
    if (!copied) {
      notify(formatMessage('M-COPY-FAILED'), 'error');
    } else if (item.warning !== undefined) {
      notify(item.portable ? formatNotice('N-LONGLINK') : item.warning, 'warning');
    } else {
      notify(formatMessage('M-LINK-COPIED'), 'info');
    }
  }

  /** @param {string} puzzleId */
  function copyPuzzleLink(puzzleId) {
    const pack = currentPack();
    const index = pack === null ? -1 : pack.puzzles.findIndex((p) => p.id === puzzleId);
    return index < 0 ? Promise.resolve() : copyLink(index);
  }

  return {
    generateSet,
    newPuzzles: () => startBatch(false),
    addMore: () => startBatch(true),
    cancel,
    importPack,
    importText,
    importFile,
    removePuzzle: remove,
    resetHistory: clearHistory,
    requestFewer,
    stepSet,
    refreshLinks,
    prepareNavigation,
    playAll,
    playPuzzle,
    exportPack,
    exportPuzzle,
    exportSet,
    exportParked,
    copyPackLink: () => copyLink(0),
    copyPuzzleLink,
    readyLevel: () => readyLevelId(store.getState()),
    destroy() {
      destroyed = true;
      unsubscribe();
      if (linkTimer !== null) {
        clearTimer(linkTimer);
      }
      taskAbort?.abort();
      verifyAbort?.abort();
    },
  };
}
