// @ts-check
// Player state: a tiny observable store plus the DOM-free controller that owns
// every way a puzzle can arrive (link, file, paste, library, sample), atomic
// replacement of the open game, progress hand-off to storage, and non-blocking
// solvability checks through a one-worker pool. Browser services are injected
// so the same code runs under Node tests and in the page.

import { createGame, snapshot } from '../core/engine/game.js';
import { packId as computePackId, progressFingerprint } from '../core/engine/keys.js';
import { packBoard } from '../core/engine/pack.js';
import { parseLocationHash } from '../core/engine/sharecode.js';
import { straightenAngle } from '../core/engine/view.js';
import { downloadPack, loadFromFile, loadFromText, readIncoming } from '../core/browser/handoff.js';
import { SAVE_FAILED_MESSAGE, browserStorage } from '../core/browser/storage.js';
import { createPool, isAbortError } from '../core/browser/worker-pool.js';
import { INDEX_MESSAGE, LOAD_FAILED_MESSAGE, SAMPLE_FAILED_MESSAGE, messageForIssues, restorationNotice } from './strings.js';

/** @typedef {import('../core/engine/types.js').Pack} Pack */
/** @typedef {import('../core/engine/types.js').Issue} Issue */
/** @typedef {import('../core/engine/game.js').GameState} GameState */
/** @typedef {import('../core/browser/storage.js').Prefs} Prefs */
/** @typedef {import('../core/browser/storage.js').LibraryEntry} LibraryEntry */

/**
 * `pending` is a live check; `not-verified` is inconclusive (never "impossible");
 * only `unsatisfiable` came from an exhausted search with zero solutions.
 * @typedef {object} Verification
 * @property {'pending' | 'solvable' | 'unsatisfiable' | 'not-verified'} status
 * @property {'solution' | 'search' | 'unavailable'} [basis]
 */

/** @typedef {{ code: string, message: string }} PlayerError */
/** @typedef {{ kind: 'info' | 'warning', text: string }} Notice */
/** @typedef {'new' | 'in-progress' | 'solved'} PuzzleStatus */

/**
 * `game` is the committed game of `pack[index]`; `error` describes the last
 * refused replacement and never clears the open game. `resume` is set while the
 * Continue / Restart choice is open. `revision` increases with every replaced
 * pack, so late proof data of an older pack is recognisable.
 * @typedef {object} PlayerState
 * @property {'import' | 'game'} screen
 * @property {Pack | null} pack
 * @property {string | null} packId Library id when the pack is saved in this browser.
 * @property {'hash' | 'file' | 'paste' | 'library' | 'sample' | null} source
 * @property {boolean} local The address is a same-browser `#lib=` link.
 * @property {number} index
 * @property {GameState | null} game
 * @property {boolean} loading
 * @property {PlayerError | null} error
 * @property {Notice | null} notice
 * @property {{ placed: number, solved: boolean } | null} resume
 * @property {Record<number, Verification>} verificationByPuzzle
 * @property {PuzzleStatus[]} statuses
 * @property {string[]} fingerprints
 * @property {number} revision
 * @property {Prefs} prefs
 * @property {LibraryEntry[]} library
 * @property {string | null} storageWarning
 */

/** @type {Prefs} */
const DEFAULT_PREFS = Object.freeze({ labels: true, patterns: true, timer: true, straighten: false, largeBoards: false });

/** @returns {PlayerState} */
function defaultState() {
  return {
    screen: 'import',
    pack: null,
    packId: null,
    source: null,
    local: false,
    index: 0,
    game: null,
    loading: false,
    error: null,
    notice: null,
    resume: null,
    verificationByPuzzle: {},
    statuses: [],
    fingerprints: [],
    revision: 0,
    prefs: { ...DEFAULT_PREFS },
    library: [],
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
 * Angle the board and tray are drawn at: the pack's presentation angle, or its
 * nearest straight angle when the local Straighten view is on. Never written
 * to the pack and never part of a fingerprint.
 * @param {Pick<PlayerState, 'pack' | 'prefs'>} state
 * @returns {number}
 */
export function effectiveRotation(state) {
  const rotation = state.pack?.presentation?.rotation ?? 0;
  return state.prefs.straighten ? straightenAngle(rotation) : rotation;
}

/**
 * @param {Pack | null} pack
 * @returns {boolean} Patterns are offered only above 20 pieces.
 */
export function offersPatterns(pack) {
  return (pack?.pieces.length ?? 0) > 20;
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
 * @property {(pack: Pack, name: string) => void} [download]
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
  const download = options.download ?? downloadPack;
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

  function refreshLibrary() {
    store.update({ library: storage.libraryIndex() });
  }

  /** @param {string | null} fp @returns {PuzzleStatus} */
  function statusOf(fp) {
    const saved = fp === null ? null : storage.loadProgress(fp);
    if (saved === null) {
      return 'new';
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
      const progress = saved === null ? undefined : {
        ...saved,
        updatedAt: Number.isFinite(saved.updatedAt) ? new Date(saved.updatedAt).toISOString() : undefined,
      };
      return { ok: true, fingerprints, game: createGame(pack, index, /** @type {any} */ (progress)) };
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
    if (game === null || fp === undefined || !(game.moves > 0 || game.placed.size > 0 || game.elapsedMs > 0)) {
      return true;
    }
    const snap = snapshot(game);
    const result = storage.saveProgress(fp, {
      v: 1, placements: snap.placements, elapsedMs: snap.elapsedMs, moves: snap.moves, solved: snap.solved,
    });
    const statuses = s.statuses.slice();
    statuses[s.index] = statusOf(fp);
    store.update({ statuses, storageWarning: result.ok ? s.storageWarning : SAVE_FAILED_MESSAGE });
    return result.ok;
  }

  /**
   * Keeps the address in step: a link keeps its code and only `i` changes; a
   * pack that arrived another way gets a same-browser `#lib=` link when it is
   * saved, else no hash.
   * @param {'hash' | 'file' | 'paste' | 'library' | 'sample'} source
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
   * @param {Pack} pack
   * @param {number} index
   * @param {{ source: 'hash' | 'file' | 'paste' | 'library' | 'sample', libraryId?: string, samePack?: boolean }} meta
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
      } else {
        const saved = storage.saveLibraryPack(pack);
        packId = saved.ok ? saved.packId : null;
        storageWarning = saved.ok ? null : SAVE_FAILED_MESSAGE;
      }
    }
    const source = samePack ? before.source ?? meta.source : meta.source;
    const local = syncHash(source, packId, index);
    const { game } = prepared;
    const resume = game.placed.size > 0 || game.solved ? { placed: game.placed.size, solved: game.solved } : null;
    const text = restorationNotice(game.restoreWarnings);
    const statuses = samePack ? before.statuses.slice() : prepared.fingerprints.map((fp) => statusOf(fp));
    store.update({
      screen: 'game',
      pack,
      packId,
      source,
      local,
      index,
      game,
      loading: false,
      error: null,
      notice: text === '' ? null : { kind: 'warning', text },
      resume,
      verificationByPuzzle: samePack ? before.verificationByPuzzle : {},
      statuses,
      fingerprints: prepared.fingerprints,
      revision: samePack ? before.revision : before.revision + 1,
      library: storage.libraryIndex(),
      storageWarning: storageWarning ?? (samePack ? before.storageWarning : null),
    });
    startVerification(index);
    return { ok: true };
  }

  /**
   * One in-flight import at a time: only the newest request may commit.
   * @param {() => Promise<import('../core/engine/types.js').Result<{ pack: Pack, index: number }>>} run
   * @param {{ source: 'hash' | 'file' | 'paste' | 'library' | 'sample', libraryId?: string, quiet?: string[] }} meta
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
     * Opens the puzzle named by the address, if any. Without one the Import
     * screen stays up; nothing is opened automatically.
     * @returns {Promise<unknown>}
     */
    start() {
      refreshLibrary();
      const hash = String(getLocation()?.hash ?? '');
      store.update({ prefs: storage.getPrefs() });
      return load(() => readIncoming({ hash }, env), hashMeta(hash));
    },
    /** @param {string} hash */
    openHash: (hash) => load(() => readIncoming({ hash }, env), hashMeta(hash)),
    /** @param {string} text */
    importText: (text) => load(() => loadFromText(text, env), { source: 'paste' }),
    /** @param {{ size: number, text: () => Promise<string> }} file */
    importFile: (file) => load(() => loadFromFile(file, env), { source: 'file' }),
    /** @param {string} id */
    openLibraryPack: (id) => load(() => readIncoming({ hash: `#lib=${id}&i=0` }, env), { source: 'library', libraryId: id }),
    openSample() {
      return load(async () => {
        const base = options.baseUrl ?? globalThis.document?.baseURI ?? globalThis.location?.href;
        let text;
        try {
          text = await (options.fetchText ?? defaultFetchText)(new URL(SAMPLE_PATH, base).href);
        } catch {
          return { ok: false, issues: [{ code: 'load-failed', path: '$', message: SAMPLE_FAILED_MESSAGE }] };
        }
        return loadFromText(text, env);
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
    /** @param {'continue' | 'restart'} choice */
    resume(choice) {
      const s = store.getState();
      if (!s.pack || s.resume === null) {
        return;
      }
      if (choice === 'continue') {
        store.update({ resume: null });
        return;
      }
      const fresh = createGame(s.pack, s.index);
      store.update({ game: fresh, resume: null, notice: null });
      const fp = s.fingerprints[s.index];
      if (fp !== undefined) {
        const result = storage.saveProgress(fp, { v: 1, placements: [], elapsedMs: 0, moves: 0, solved: false });
        const statuses = s.statuses.slice();
        statuses[s.index] = 'new';
        store.update({ statuses, storageWarning: result.ok ? s.storageWarning : SAVE_FAILED_MESSAGE });
      }
    },
    /**
     * Marks a tray or board piece as selected (null clears it). Moves are T20's.
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
    showImport() {
      refreshLibrary();
      store.update({ screen: 'import', error: null });
    },
    closeImport() {
      store.update((s) => (s.game === null ? null : { screen: 'game', error: null }));
    },
    dismissError() {
      store.update({ error: null });
    },
    dismissNotice() {
      store.update({ notice: null });
    },
    /** @param {string} id */
    removeLibraryPack(id) {
      const result = storage.removeLibraryPack(id);
      store.update((s) => ({
        library: storage.libraryIndex(),
        packId: s.packId === id ? null : s.packId,
      }));
      return result;
    },
    /**
     * @param {string} id
     * @returns {{ ok: boolean, message?: string }}
     */
    exportLibraryPack(id) {
      const loaded = storage.loadLibraryPack(id);
      if (!loaded.ok) {
        return { ok: false, message: messageForIssues(loaded.issues) };
      }
      try {
        const title = /** @type {{ title?: unknown } | undefined} */ (loaded.value.meta)?.title;
        download(loaded.value, typeof title === 'string' && title !== '' ? title : loaded.value.puzzles[0]?.title ?? 'puzzle');
        return { ok: true };
      } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : 'The pack could not be exported.' };
      }
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
