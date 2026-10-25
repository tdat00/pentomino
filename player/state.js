// @ts-check
// Player state: a small observable store and the DOM-free controller that opens puzzles from the address (or the
// sample), replaces the open game atomically, keeps the address shareable, saves progress and checks solvability in
// a worker. Browser services are injected, so the same code runs under Node tests and in the page.

import { createGame, snapshot } from '../core/engine/game.js';
import { progressFingerprint } from '../core/engine/keys.js';
import { packBoard } from '../core/engine/pack.js';
import { MAX_URL_CHARS, encodeShareCode, parseLocationHash } from '../core/engine/sharecode.js';
import { normalizeAngle, straightenAngle } from '../core/engine/view.js';
import { readIncoming, readPack } from '../core/browser/handoff.js';
import { SAVE_FAILED_MESSAGE, browserStorage } from '../core/browser/storage.js';
import { createPool, isAbortError } from '../core/browser/worker-pool.js';
import { INDEX_MESSAGE, LOAD_FAILED_MESSAGE, SAMPLE_FAILED_MESSAGE, messageForIssues, restorationNotice } from './strings.js';

/** @typedef {import('../core/engine/types.js').Pack} Pack */
/** @typedef {import('../core/engine/types.js').Issue} Issue */
/** @typedef {import('../core/engine/game.js').GameState} GameState */
/** @typedef {import('../core/browser/storage.js').Prefs} Prefs */

/**
 * `pending` is a live check; `not-verified` is inconclusive (never "impossible");
 * only `unsatisfiable` came from an exhausted search with zero solutions.
 * @typedef {object} Verification
 * @property {'pending' | 'solvable' | 'unsatisfiable' | 'not-verified'} status
 * @property {'solution' | 'search' | 'unavailable'} [basis]
 */

/** @typedef {{ code: string, message: string }} PlayerError */
/** @typedef {{ kind: 'info' | 'warning', text: string }} Notice */
/** @typedef {'new' | 'in-progress' | 'solved' | 'revealed'} PuzzleStatus */

/**
 * `game` is the committed game of `pack[index]`; `error` describes the last
 * refused replacement and never clears the open game. `revision` increases with every replaced
 * pack, so late proof data of an older pack is recognisable.
 * @typedef {object} PlayerState
 * @property {'start' | 'game'} screen
 * @property {Pack | null} pack
 * @property {string | null} packId Id of the copy saved in this browser for a same-browser `#lib=` address.
 * @property {'hash' | 'library' | 'sample' | null} source `hash`: the pack came from the address; `library`: the
 *   player made it (a puzzle was removed); `sample`: the sample. Both of the latter get a `#pack=` address when it fits.
 * @property {boolean} local The address is a same-browser `#lib=` link.
 * @property {number} index
 * @property {number | null} viewRotation Display angle chosen with the board's rotate buttons (counter-clockwise
 *   degrees); null follows the pack. Local to the open pack and never saved.
 * @property {GameState | null} game
 * @property {boolean} loading
 * @property {PlayerError | null} error
 * @property {Notice | null} notice
 * @property {Record<number, Verification>} verificationByPuzzle
 * @property {PuzzleStatus[]} statuses
 * @property {string[]} fingerprints
 * @property {number} revision
 * @property {Prefs} prefs
 * @property {string | null} storageWarning
 */

/** @type {Prefs} */
const DEFAULT_PREFS = Object.freeze({ straighten: false });

/** @returns {PlayerState} */
function defaultState() {
  return {
    screen: 'start',
    pack: null,
    packId: null,
    source: null,
    local: false,
    index: 0,
    viewRotation: null,
    game: null,
    loading: false,
    error: null,
    notice: null,
    verificationByPuzzle: {},
    statuses: [],
    fingerprints: [],
    revision: 0,
    prefs: { ...DEFAULT_PREFS },
    storageWarning: null,
  };
}

/**
 * Observable state. `update` takes a patch or a function returning a patch;
 * listeners run synchronously with `(state, previous)` and only when a value
 * actually changed.
 * @param {Partial<PlayerState>} [initial]
 */
export function createPlayerStore(initial = {}) {
  /** @type {PlayerState} */
  let state = { ...defaultState(), ...initial };
  /** @type {Set<(state: PlayerState, previous: PlayerState) => void>} */
  const listeners = new Set();
  let destroyed = false;
  return {
    /** @returns {PlayerState} */
    getState: () => state,
    /**
     * @param {(state: PlayerState, previous: PlayerState) => void} listener
     * @returns {() => void} unsubscribe
     */
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** @param {Partial<PlayerState> | ((state: PlayerState) => Partial<PlayerState> | null | undefined)} patchOrUpdater */
    update(patchOrUpdater) {
      if (destroyed) {
        return;
      }
      const patch = typeof patchOrUpdater === 'function' ? patchOrUpdater(state) : patchOrUpdater;
      if (typeof patch !== 'object' || patch === null) {
        return;
      }
      const keys = /** @type {(keyof PlayerState)[]} */ (Object.keys(patch));
      if (keys.every((key) => Object.is(state[key], patch[key]))) {
        return;
      }
      const previous = state;
      state = { ...state, ...patch };
      for (const listener of [...listeners]) {
        try {
          listener(state, previous);
        } catch (error) {
          console.error(error);
        }
      }
    },
    destroy() {
      destroyed = true;
      listeners.clear();
    },
  };
}

/** @typedef {ReturnType<typeof createPlayerStore>} PlayerStore */

/**
 * Angle the board and tray are drawn at: the angle the player turned the view to, else the pack's presentation
 * angle, or the nearest straight angle when the local Straighten view is on. Never written to the pack and never
 * part of a fingerprint.
 * @param {Pick<PlayerState, 'pack' | 'prefs' | 'viewRotation'>} state
 * @returns {number}
 */
export function effectiveRotation(state) {
  const rotation = state.viewRotation ?? state.pack?.presentation?.rotation ?? 0;
  return state.prefs.straighten ? straightenAngle(rotation) : rotation;
}

/**
 * @param {Pick<import('../core/engine/types.js').PackPuzzle, 'solution'> | undefined} puzzle
 * @param {Verification | undefined} verification
 * @returns {boolean} A solution is known: the pack includes a checked answer, or the solvability check found one.
 */
export function knownSolvable(puzzle, verification) {
  return verification?.status === 'solvable' || (puzzle?.solution !== null && puzzle?.solution !== undefined);
}

/**
 * @param {string} hash
 * @param {number} index
 * @returns {string} The same hash with its `i` parameter set.
 */
export function hashWithIndex(hash, index) {
  const parts = (hash.startsWith('#') ? hash.slice(1) : hash).split('&');
  let seen = false;
  const next = parts.map((part) => {
    if (part === 'i' || part.startsWith('i=')) {
      seen = true;
      return `i=${index}`;
    }
    return part;
  });
  if (!seen) {
    next.push(`i=${index}`);
  }
  return `#${next.join('&')}`;
}

const SAMPLE_PATH = './samples/sample-pack.json';
const MAX_SAMPLE_CHARS = 600000;

/**
 * @param {string} url
 * @returns {Promise<string>}
 */
async function defaultFetchText(url) {
  const response = await globalThis.fetch(url, { credentials: 'omit' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const text = await response.text();
  if (text.length > MAX_SAMPLE_CHARS) {
    throw new Error('The sample is too large');
  }
  return text;
}

/**
 * @typedef {object} PoolLike
 * @property {(r: { requestId: number, revision: string, onTimeout?: (info: unknown) => void }) => void} beginRequest
 * @property {(task: { requestId: number, revision: string, kind: 'verifyPack', payload: object }) => Promise<unknown>} run
 * @property {(requestId: number) => void} endRequest
 * @property {() => void} close
 */

/**
 * @typedef {object} ControllerOptions
 * @property {PlayerStore} store
 * @property {ReturnType<typeof browserStorage>} [storage] Defaults to the namespaced localStorage wrapper.
 * @property {{ hash: string, pathname: string, search: string }} [location]
 * @property {{ replaceState: (state: unknown, title: string, url: string) => void }} [history]
 * @property {(url: string) => Promise<string>} [fetchText] Only ever called with the fixed sample URL.
 * @property {string | URL} [baseUrl] Page base used to resolve the sample path.
 * @property {() => PoolLike} [createPool] Verification pool factory (default: one module worker).
 */

/**
 * @param {ControllerOptions} options
 */
export function createPlayerController(options) {
  const { store } = options;
  const storage = options.storage ?? browserStorage();
  const env = { storage };
  const getLocation = () => options.location ?? globalThis.location;
  const getHistory = () => options.history ?? globalThis.history;
  let destroyed = false;
  let loadToken = 0;
  let requestSeq = 0;
  /** @type {PoolLike | null} */
  let pool = null;
  let poolUnavailable = false;

  /** @returns {PoolLike} */
  function getPool() {
    pool ??= (options.createPool ?? (() => /** @type {PoolLike} */ (/** @type {unknown} */ (createPool({ size: 1 })))))();
    return pool;
  }

  /** @param {string | null} fp @returns {PuzzleStatus} */
  function statusOf(fp) {
    const saved = fp === null ? null : storage.loadProgress(fp);
    if (saved === null) {
      return 'new';
    }
    if (saved.revealed) {
      return 'revealed';
    }
    return saved.solved ? 'solved' : saved.placements.length > 0 ? 'in-progress' : 'new';
  }

  /**
   * Builds the game for `pack[index]`, restoring valid saved moves. Nothing is
   * committed here, so a throwing clue or geometry leaves the open game alone.
   * @param {Pack} pack
   * @param {number} index
   * @param {string[] | null} known Fingerprints of this very pack, when already computed.
   * @returns {{ ok: true, fingerprints: string[], game: GameState } | { ok: false, issues: Issue[] }}
   */
  function prepare(pack, index, known) {
    try {
      const fingerprints = known ?? (() => {
        const board = packBoard(pack);
        return pack.puzzles.map((puzzle) => progressFingerprint(board, pack.pieces, puzzle.clues));
      })();
      const saved = storage.loadProgress(fingerprints[index]);
      return { ok: true, fingerprints, game: createGame(pack, index, saved ?? undefined) };
    } catch (error) {
      return { ok: false, issues: [{ code: 'invalid-pack', path: '$', message: error instanceof Error ? error.message : 'The puzzle could not be opened.' }] };
    }
  }

  /**
   * Saves the open game's progress by exact-coordinate fingerprint. Untouched
   * games are not written, so merely opening a puzzle never clobbers a record.
   * @returns {boolean} False when the browser refused the write.
   */
  function saveNow() {
    const s = store.getState();
    const { game } = s;
    const fp = s.fingerprints[s.index];
    if (game === null || fp === undefined || !(game.moves > 0 || game.placed.size > 0 || game.elapsedMs > 0 || game.hintsUsed > 0)) {
      return true;
    }
    const snap = snapshot(game);
    const result = storage.saveProgress(fp, {
      v: 2,
      placements: snap.placements,
      elapsedMs: snap.elapsedMs,
      moves: snap.moves,
      solved: snap.solved,
      revealed: snap.revealed,
      hintsUsed: snap.hintsUsed,
    });
    const statuses = s.statuses.slice();
    statuses[s.index] = statusOf(fp);
    store.update({ statuses, storageWarning: result.ok ? s.storageWarning : SAVE_FAILED_MESSAGE });
    return result.ok;
  }

  /** Fresh game for the open puzzle; its saved record is removed at once. */
  function restartOpenGame() {
    const s = store.getState();
    if (!s.pack) {
      return;
    }
    store.update({ game: createGame(s.pack, s.index), notice: null });
    const fp = s.fingerprints[s.index];
    if (fp !== undefined) {
      const result = storage.removeProgress(fp);
      const statuses = s.statuses.slice();
      statuses[s.index] = 'new';
      store.update({ statuses, storageWarning: result.ok ? s.storageWarning : SAVE_FAILED_MESSAGE });
    }
  }

  /**
   * Keeps the address in step: a link keeps its code and only `i` changes; any other pack gets a same-browser
   * `#lib=` link when it is saved, else no hash, until `makePortable` replaces it.
   * @param {'hash' | 'library' | 'sample'} source
   * @param {string | null} packId
   * @param {number} index
   * @returns {boolean} Whether the resulting address is a same-browser link.
   */
  function syncHash(source, packId, index) {
    const location = getLocation();
    const current = String(location?.hash ?? '');
    const next = source === 'hash' && current !== ''
      ? hashWithIndex(current, index)
      : packId === null ? '' : `#lib=${packId}&i=${index}`;
    if (next !== current) {
      try {
        getHistory().replaceState(null, '', next === '' ? `${location.pathname}${location.search}` : next);
      } catch {
        // The address is cosmetic; a refused update never blocks play.
      }
    }
    return /^#(?:[^&]*&)*lib=/.test(next);
  }

  /**
   * The address is how a puzzle is kept and shared, so a pack that did not come from a `#pack=` link (the sample, or
   * a pack with a puzzle removed) gets one as soon as its code is ready and the link fits; the copy saved for the
   * same-browser address is then dropped. A pack too large for a link keeps its `#lib=` address.
   * @param {Pack} pack
   */
  async function makePortable(pack) {
    /** @type {string} */
    let code;
    try {
      code = await encodeShareCode(pack);
    } catch {
      return;
    }
    const s = store.getState();
    const location = getLocation();
    if (destroyed || s.pack !== pack || s.source === 'hash' || !location) {
      return;
    }
    // Another address (a link being opened) must not be overwritten by the link of the pack it replaces.
    if (String(location.hash ?? '') !== (s.packId === null ? '' : `#lib=${s.packId}&i=${s.index}`)) {
      return;
    }
    const hash = `#pack=${code}&i=${s.index}`;
    const page = typeof location.href === 'string' ? location.href.split('#')[0] : `${location.pathname}${location.search}`;
    if (page.length + hash.length > MAX_URL_CHARS) {
      return;
    }
    try {
      getHistory().replaceState(null, '', hash);
    } catch {
      return;
    }
    if (s.packId !== null) {
      storage.removeLibraryPack(s.packId);
    }
    store.update({ source: 'hash', packId: null, local: false });
  }

  /**
   * @param {Pack} pack
   * @param {number} index
   * @param {{ source: 'hash' | 'library' | 'sample', libraryId?: string, samePack?: boolean }} meta
   * @returns {{ ok: true } | { ok: false, issues: Issue[] }}
   */
  function commit(pack, index, meta) {
    saveNow();
    const before = store.getState();
    const samePack = meta.samePack === true && before.pack === pack;
    const prepared = prepare(pack, index, samePack ? before.fingerprints : null);
    if (!prepared.ok) {
      return prepared;
    }
    let { packId } = before;
    let storageWarning = null;
    if (!samePack) {
      if (meta.libraryId !== undefined) {
        storageWarning = storage.touchLibraryPack(meta.libraryId).ok ? null : SAVE_FAILED_MESSAGE;
        packId = meta.libraryId;
      } else if (meta.source === 'hash') {
        // A `#pack=` link carries the whole pack: nothing needs to be saved for it.
        packId = null;
      } else {
        const saved = storage.saveLibraryPack(pack);
        packId = saved.ok ? saved.packId : null;
        storageWarning = saved.ok ? null : SAVE_FAILED_MESSAGE;
      }
    }
    const source = samePack ? before.source ?? meta.source : meta.source;
    const local = syncHash(source, packId, index);
    const { game } = prepared;
    const text = restorationNotice(game.restoreWarnings);
    const statuses = samePack ? before.statuses.slice() : prepared.fingerprints.map((fp) => statusOf(fp));
    store.update({
      screen: 'game',
      pack,
      packId,
      source,
      local,
      index,
      viewRotation: samePack ? before.viewRotation : null,
      game,
      loading: false,
      error: null,
      notice: text === '' ? null : { kind: 'warning', text },
      verificationByPuzzle: samePack ? before.verificationByPuzzle : {},
      statuses,
      fingerprints: prepared.fingerprints,
      revision: samePack ? before.revision : before.revision + 1,
      storageWarning: storageWarning ?? (samePack ? before.storageWarning : null),
    });
    startVerification(index);
    if (!samePack && source !== 'hash') {
      void makePortable(pack);
    }
    return { ok: true };
  }

  /**
   * One in-flight load at a time: only the newest request may commit.
   * @param {() => Promise<import('../core/engine/types.js').Result<{ pack: Pack, index: number }>>} run
   * @param {{ source: 'hash' | 'library' | 'sample', libraryId?: string, quiet?: string[] }} meta
   * @returns {Promise<{ ok: boolean, stale?: boolean, issues?: Issue[] }>}
   */
  async function load(run, meta) {
    loadToken += 1;
    const token = loadToken;
    store.update({ loading: true, error: null });
    /** @type {import('../core/engine/types.js').Result<{ pack: Pack, index: number }>} */
    let result;
    try {
      result = await run();
    } catch (error) {
      result = { ok: false, issues: [{ code: 'load-failed', path: '$', message: error instanceof Error && error.name === 'LoadError' ? error.message : LOAD_FAILED_MESSAGE }] };
    }
    if (token !== loadToken || destroyed) {
      return { ok: false, stale: true };
    }
    if (!result.ok) {
      const quiet = result.issues[0] !== undefined && meta.quiet?.includes(result.issues[0].code) === true;
      store.update({
        loading: false,
        error: quiet ? null : { code: result.issues[0]?.code ?? 'invalid-pack', message: messageForIssues(result.issues) },
      });
      return { ok: false, issues: result.issues };
    }
    const committed = commit(result.value.pack, result.value.index, meta);
    if (!committed.ok) {
      store.update({ loading: false, error: { code: committed.issues[0].code, message: messageForIssues(committed.issues) } });
    }
    return committed;
  }

  /**
   * @param {string} hash
   * @returns {{ source: 'hash', libraryId?: string, quiet: string[] }}
   */
  function hashMeta(hash) {
    const lib = parseLocationHash(hash)?.lib;
    return lib === undefined ? { source: 'hash', quiet: ['no-incoming'] } : { source: 'hash', libraryId: lib, quiet: ['no-incoming'] };
  }

  /**
   * @param {number} index
   */
  function startVerification(index) {
    const s = store.getState();
    const { pack } = s;
    const puzzle = pack?.puzzles[index];
    if (!pack || !puzzle || destroyed) {
      return;
    }
    const known = s.verificationByPuzzle[index];
    if (known !== undefined) {
      return;
    }
    const { revision } = s;
    /** @param {Verification | null} value */
    const set = (value) => store.update((now) => {
      if (now.revision !== revision || now.pack !== pack) {
        return null;
      }
      const next = { ...now.verificationByPuzzle };
      if (value === null) {
        delete next[index];
      } else {
        next[index] = value;
      }
      return { verificationByPuzzle: next };
    });
    // A validated included answer is an exact cover: solvable without a search.
    if (puzzle.solution !== null && puzzle.solution !== undefined) {
      set({ status: 'solvable', basis: 'solution' });
      return;
    }
    if (poolUnavailable) {
      set({ status: 'not-verified', basis: 'unavailable' });
      return;
    }
    set({ status: 'pending' });
    requestSeq += 1;
    const id = requestSeq;
    const fingerprint = s.fingerprints[index];
    const stamp = `${revision}:${index}`;
    /** @param {unknown} reason */
    const giveUp = (reason) => {
      if (isAbortError(reason) && reason.reason !== 'deadline') {
        set(null);
        return;
      }
      if (/** @type {{ code?: string }} */ (reason)?.code === 'worker-unavailable') {
        poolUnavailable = true;
      }
      set({ status: 'not-verified', basis: 'unavailable' });
    };
    /** @type {PoolLike} */
    let active;
    try {
      active = getPool();
      active.beginRequest({ requestId: id, revision: stamp, onTimeout: () => giveUp(null) });
    } catch {
      poolUnavailable = true;
      set({ status: 'not-verified', basis: 'unavailable' });
      return;
    }
    active.run({ requestId: id, revision: stamp, kind: 'verifyPack', payload: { pack: { ...pack, puzzles: [puzzle] } } })
      .then((reply) => {
        if (destroyed) {
          return;
        }
        const row = /** @type {{ results?: { index: number, fingerprint: string, status: string }[] }} */ (reply)?.results?.[0];
        if (row === undefined || row.fingerprint !== fingerprint) {
          set({ status: 'not-verified', basis: 'search' });
        } else if (row.status === 'solvable') {
          set({ status: 'solvable', basis: 'search' });
        } else if (row.status === 'unsatisfiable') {
          set({ status: 'unsatisfiable', basis: 'search' });
        } else {
          set({ status: 'not-verified', basis: 'search' });
        }
      })
      .catch((error) => {
        if (!destroyed) {
          giveUp(error);
        }
      })
      .finally(() => {
        try {
          active.endRequest(id);
        } catch {
          // The pool may already be closed.
        }
      });
  }

  return {
    /**
     * Opens the puzzle named by the address, if any. Without one the start screen stays up; nothing is opened
     * automatically.
     * @returns {Promise<unknown>}
     */
    start() {
      const hash = String(getLocation()?.hash ?? '');
      store.update({ prefs: storage.getPrefs() });
      return load(() => readIncoming({ hash }, env), hashMeta(hash));
    },
    /** @param {string} hash */
    openHash: (hash) => load(() => readIncoming({ hash }, env), hashMeta(hash)),
    openSample() {
      return load(async () => {
        const base = options.baseUrl ?? globalThis.document?.baseURI ?? globalThis.location?.href;
        let text;
        try {
          text = await (options.fetchText ?? defaultFetchText)(new URL(SAMPLE_PATH, base).href);
        } catch {
          return { ok: false, issues: [{ code: 'load-failed', path: '$', message: SAMPLE_FAILED_MESSAGE }] };
        }
        return readPack(text);
      }, { source: 'sample' });
    },
    /**
     * Switches puzzle inside the open pack after saving the current progress.
     * @param {number} index
     * @returns {{ ok: boolean }}
     */
    goToPuzzle(index) {
      const s = store.getState();
      if (!s.pack || !Number.isInteger(index) || index < 0 || index >= s.pack.puzzles.length) {
        store.update({ error: { code: 'index-out-of-range', message: INDEX_MESSAGE } });
        return { ok: false };
      }
      loadToken += 1;
      store.update({ loading: false });
      const committed = commit(s.pack, index, { source: s.source ?? 'library', samePack: true });
      if (!committed.ok) {
        store.update({ error: { code: committed.issues[0].code, message: messageForIssues(committed.issues) } });
      }
      return { ok: committed.ok };
    },
    nextPuzzle() {
      return this.goToPuzzle(store.getState().index + 1);
    },
    previousPuzzle() {
      return this.goToPuzzle(store.getState().index - 1);
    },
    /** Replaces the open puzzle with a fresh game and an empty saved record (Replay). */
    replay() {
      restartOpenGame();
    },
    /**
     * Marks a tray or board piece as selected (null clears it). The play controller (`play.js`) drives selection and moves.
     * @param {string | null} pieceId
     */
    select(pieceId) {
      store.update((s) => (s.game === null || s.game.selected === pieceId ? null : { game: { ...s.game, selected: pieceId } }));
    },
    saveNow,
    /**
     * @param {keyof Prefs} name
     * @param {boolean} value
     */
    setPref(name, value) {
      const result = storage.setPrefs({ [name]: value });
      store.update((s) => ({
        prefs: storage.getPrefs(),
        storageWarning: result.ok ? s.storageWarning : SAVE_FAILED_MESSAGE,
      }));
    },
    /**
     * Turns the display of the open pack by `delta` counter-clockwise degrees (a multiple of 45); display only.
     * @param {number} delta
     */
    rotateView(delta) {
      store.update((s) => (s.pack === null ? null : {
        viewRotation: normalizeAngle((s.viewRotation ?? s.pack.presentation?.rotation ?? 0) + delta),
      }));
    },
    /**
     * Removes one puzzle from the open pack. The puzzle that was open stays open, or its neighbour opens when it was
     * the one removed; the last puzzle leaves the pack as `removeAllPuzzles` does. The shorter pack gets its own address.
     * @param {number} index
     * @returns {{ ok: boolean }}
     */
    removePuzzle(index) {
      const s = store.getState();
      const { pack } = s;
      if (!pack || !Number.isInteger(index) || index < 0 || index >= pack.puzzles.length) {
        return { ok: false };
      }
      if (pack.puzzles.length === 1) {
        this.removeAllPuzzles();
        return { ok: true };
      }
      saveNow();
      const reduced = { ...pack, puzzles: pack.puzzles.filter((_, i) => i !== index) };
      const nextIndex = index < s.index ? s.index - 1 : Math.min(s.index, reduced.puzzles.length - 1);
      loadToken += 1;
      const committed = commit(reduced, nextIndex, { source: 'library' });
      if (!committed.ok) {
        store.update({ loading: false, error: { code: committed.issues[0].code, message: messageForIssues(committed.issues) } });
        return { ok: false };
      }
      if (index !== s.index) {
        // Another puzzle stays open: the notice about it need not be shown again.
        store.update({ notice: s.notice });
      }
      store.update({ viewRotation: s.viewRotation });
      const now = store.getState();
      if (s.packId !== null && s.packId !== now.packId) {
        storage.removeLibraryPack(s.packId);
      }
      return { ok: true };
    },
    /** Closes the open pack and shows the start screen. Saved progress is kept. */
    removeAllPuzzles() {
      const s = store.getState();
      if (!s.pack) {
        return;
      }
      saveNow();
      loadToken += 1;
      if (s.packId !== null) {
        storage.removeLibraryPack(s.packId);
      }
      syncHash('library', null, 0);
      store.update({
        ...defaultState(),
        prefs: s.prefs,
        storageWarning: s.storageWarning,
        revision: s.revision + 1,
      });
    },
    dismissError() {
      store.update({ error: null });
    },
    dismissNotice() {
      store.update({ notice: null });
    },
    destroy() {
      destroyed = true;
      loadToken += 1;
      try {
        pool?.close();
      } catch {
        // already closed
      }
      pool = null;
    },
  };
}

/** @typedef {ReturnType<typeof createPlayerController>} PlayerController */
