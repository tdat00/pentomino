// @ts-check
// Namespaced, failure-tolerant localStorage wrapper. All access goes through an
// injected adapter; nothing outside `pentomino:v1:` is read, listed or removed.

/** @typedef {import('../engine/types.js').Pose} Pose */
/** @typedef {import('../engine/types.js').Issue} Issue */

/** @template T @typedef {import('../engine/types.js').Result<T>} Result */

/**
 * The subset of the Web Storage API that is used.
 * @typedef {object} StorageAdapter
 * @property {number} length
 * @property {(index: number) => string | null} key
 * @property {(key: string) => string | null} getItem
 * @property {(key: string, value: string) => void} setItem
 * @property {(key: string) => void} removeItem
 */

/** @typedef {{ ok: false, code: 'storage-unavailable' | 'quota' | 'invalid-data', message: string }} StorageFailure */
/** @typedef {{ ok: true } | StorageFailure} StorageResult */

/**
 * Local progress record, version 2. Version 1 records (written before hints)
 * are still read and come back as version 2 with `revealed` false and
 * `hintsUsed` 0; the stored text is rewritten by the next save. Older records
 * may also carry `updatedAt`, which is ignored: the LRU index keeps save times.
 * @typedef {object} Progress
 * @property {2} v
 * @property {Pose[]} placements
 * @property {number} elapsedMs
 * @property {number} moves
 * @property {boolean} solved Geometry only; a revealed game is complete but not earned.
 * @property {boolean} revealed
 * @property {number} hintsUsed
 */

/**
 * What `saveProgress` accepts: version 2, or a version 1 shape without the new fields.
 * @typedef {Omit<Progress, 'v' | 'revealed' | 'hintsUsed'> & { v: 1 | 2, revealed?: boolean, hintsUsed?: number }} ProgressInput
 */

/**
 * Older versions also stored `labels`, `patterns`, `timer` and `largeBoards`; they are ignored and dropped by
 * the next write.
 * @typedef {object} Prefs
 * @property {boolean} straighten
 */

export const NAMESPACE = 'pentomino:v1:';
export const MAX_PROGRESS_ENTRIES = 300;
export const SAVE_FAILED_MESSAGE = "Progress can't be saved in this browser";

const KEY_GENERATOR = `${NAMESPACE}gen:state`;
const KEY_PROGRESS_PREFIX = `${NAMESPACE}progress:`;
// Private LRU bookkeeping; deliberately outside the `progress:` prefix.
const KEY_PROGRESS_INDEX = `${NAMESPACE}progress-index`;
const KEY_PREFS = `${NAMESPACE}prefs`;

const FINGERPRINT = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_PLACEMENTS = 1024;
/** @type {Prefs} */
const DEFAULT_PREFS = Object.freeze({ straighten: false });
const PREF_KEYS = /** @type {(keyof Prefs)[]} */ (Object.keys(DEFAULT_PREFS));

/**
 * @param {unknown} error
 * @returns {boolean}
 */
function isQuotaError(error) {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const e = /** @type {{ name?: unknown, code?: unknown, message?: unknown }} */ (error);
  return e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    || e.code === 22 || e.code === 1014 || (typeof e.message === 'string' && /quota/i.test(e.message));
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * @param {unknown} v
 * @returns {boolean}
 */
const isCount = (v) => typeof v === 'number' && Number.isInteger(v) && v >= 0;

/**
 * @param {unknown} v
 * @returns {boolean}
 */
const isPose = (v) => isRecord(v) && typeof v.piece === 'string' && Number.isInteger(v.x) && Number.isInteger(v.y)
  && Number.isInteger(v.turn) && /** @type {number} */ (v.turn) >= 0 && /** @type {number} */ (v.turn) <= 3
  && typeof v.mirrored === 'boolean';

/**
 * @param {unknown} v
 * @returns {Progress | null}
 */
function readProgress(v) {
  if (!isRecord(v) || (v.v !== 1 && v.v !== 2) || !Array.isArray(v.placements) || v.placements.length > MAX_PLACEMENTS
    || !v.placements.every(isPose) || typeof v.elapsedMs !== 'number' || !Number.isFinite(v.elapsedMs) || v.elapsedMs < 0
    || !isCount(v.moves) || typeof v.solved !== 'boolean') {
    return null;
  }
  // A version 1 record has neither field; a version 2 record must have both.
  const migrated = v.v === 1 && v.revealed === undefined && v.hintsUsed === undefined;
  if (!migrated && (typeof v.revealed !== 'boolean' || !isCount(v.hintsUsed))) {
    return null;
  }
  return {
    v: 2,
    placements: /** @type {Pose[]} */ (v.placements).map((p) => ({
      piece: p.piece, x: p.x, y: p.y, turn: p.turn, mirrored: p.mirrored,
    })),
    elapsedMs: v.elapsedMs,
    moves: /** @type {number} */ (v.moves),
    solved: v.solved,
    revealed: migrated ? false : /** @type {boolean} */ (v.revealed),
    hintsUsed: migrated ? 0 : /** @type {number} */ (v.hintsUsed),
  };
}

/**
 * @param {string} key
 * @returns {boolean}
 */
const inNamespace = (key) => typeof key === 'string' && key.startsWith(NAMESPACE);

/**
 * @param {string} message
 * @returns {StorageFailure}
 */
const invalid = (message) => ({ ok: false, code: 'invalid-data', message });

/**
 * Builds a storage facade over `adapter` (null/undefined means no storage).
 * Failed writes stay readable from memory for this instance only. Methods do
 * not depend on `this`, so they can be destructured.
 * @param {StorageAdapter | null | undefined} adapter
 * @param {() => number} now Host milliseconds.
 */
export function createStorage(adapter, now) {
  /** @type {Map<string, string | null>} Unsaved values; null marks a removal that could not be persisted. */
  const memory = new Map();
  /** @type {Issue | null} */
  let issue = null;

  /**
   * @param {string} code
   * @param {string} message
   * @param {string} [path]
   */
  function record(code, message, path = '$') {
    issue = { code, path, message };
  }

  /**
   * Raw text read: memory first, then storage. Missing entries are null and not an error.
   * @param {string} key
   * @returns {string | null}
   */
  function readRaw(key) {
    if (memory.has(key)) {
      return memory.get(key) ?? null;
    }
    if (!adapter) {
      return null;
    }
    try {
      return adapter.getItem(key);
    } catch (error) {
      record('storage-unavailable', `Saved data could not be read: ${error instanceof Error ? error.message : 'storage error'}`, key);
      return null;
    }
  }

  /**
   * @param {string} key
   * @returns {unknown}
   */
  function readJson(key) {
    const text = readRaw(key);
    if (text === null) {
      return null;
    }
    try {
      return JSON.parse(text);
    } catch {
      record('invalid-data', 'Saved data was damaged and was ignored', key);
      return null;
    }
  }

  /**
   * @param {string} key
   * @returns {boolean} False when storage threw.
   */
  function tryRemove(key) {
    memory.delete(key);
    if (!adapter) {
      return false;
    }
    try {
      adapter.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Quiet write for bookkeeping: no eviction and no issue; falls back to memory.
   * @param {string} key
   * @param {string} text
   */
  function writeQuiet(key, text) {
    try {
      if (!adapter) {
        throw new Error('no storage');
      }
      adapter.setItem(key, text);
      memory.delete(key);
    } catch {
      memory.set(key, text);
    }
  }

  /**
   * @param {string} prefix
   * @returns {string[]}
   */
  function list(prefix) {
    if (!inNamespace(prefix)) {
      return [];
    }
    /** @type {Set<string>} */
    const keys = new Set();
    if (adapter) {
      try {
        const count = adapter.length;
        for (let i = 0; i < count; i += 1) {
          const key = adapter.key(i);
          if (typeof key === 'string' && key.startsWith(prefix)) {
            keys.add(key);
          }
        }
      } catch (error) {
        record('storage-unavailable', `Saved data could not be listed: ${error instanceof Error ? error.message : 'storage error'}`);
      }
    }
    for (const [key, text] of memory) {
      if (key.startsWith(prefix)) {
        if (text === null) {
          keys.delete(key);
        } else {
          keys.add(key);
        }
      }
    }
    return [...keys].sort();
  }

  /**
   * LRU order is oldest first. A missing or damaged index is rebuilt from key names.
   * @returns {{ fp: string, at: number }[]}
   */
  function readProgressIndex() {
    const raw = readJson(KEY_PROGRESS_INDEX);
    /** @type {{ fp: string, at: number }[]} */
    const entries = [];
    if (Array.isArray(raw)) {
      const seen = new Set();
      for (const e of raw) {
        if (isRecord(e) && typeof e.fp === 'string' && FINGERPRINT.test(e.fp) && typeof e.at === 'number'
          && Number.isFinite(e.at) && !seen.has(e.fp)) {
          seen.add(e.fp);
          entries.push({ fp: e.fp, at: e.at });
        }
      }
      return entries;
    }
    for (const key of list(KEY_PROGRESS_PREFIX)) {
      const fp = key.slice(KEY_PROGRESS_PREFIX.length);
      if (FINGERPRINT.test(fp)) {
        entries.push({ fp, at: 0 });
      }
    }
    return entries;
  }

  /**
   * @param {{ fp: string, at: number }[]} entries
   */
  function writeProgressIndex(entries) {
    writeQuiet(KEY_PROGRESS_INDEX, JSON.stringify(entries));
  }

  /**
   * Drops least-recently-used progress records to make room: a quarter of them. Never touches preferences, generator
   * state or the protected key.
   * @param {string} protectedKey
   * @returns {number} Entries removed.
   */
  function evictLru(protectedKey) {
    const progress = readProgressIndex()
      .filter((e) => `${KEY_PROGRESS_PREFIX}${e.fp}` !== protectedKey)
      .sort((a, b) => a.at - b.at);
    if (progress.length > 0) {
      const drop = new Set(progress.slice(0, Math.max(1, Math.ceil(progress.length / 4))).map((e) => e.fp));
      let removed = 0;
      for (const fp of drop) {
        if (tryRemove(`${KEY_PROGRESS_PREFIX}${fp}`)) {
          removed += 1;
        }
      }
      writeProgressIndex(readProgressIndex().filter((e) => !drop.has(e.fp)));
      return removed;
    }
    return 0;
  }

  /**
   * Persists text with one LRU-evict-and-retry on quota; on failure the value
   * is kept in memory and an issue is recorded.
   * @param {string} key
   * @param {string} text
   * @returns {StorageResult}
   */
  function writeRaw(key, text) {
    /** @type {StorageFailure} */
    let failed = { ok: false, code: 'storage-unavailable', message: SAVE_FAILED_MESSAGE };
    if (adapter) {
      try {
        adapter.setItem(key, text);
        memory.delete(key);
        return { ok: true };
      } catch (error) {
        if (isQuotaError(error)) {
          failed = { ok: false, code: 'quota', message: SAVE_FAILED_MESSAGE };
          let evicted = 0;
          try {
            evicted = evictLru(key);
          } catch {
            evicted = 0;
          }
          if (evicted > 0) {
            try {
              adapter.setItem(key, text);
              memory.delete(key);
              return { ok: true };
            } catch {
              // Falls through to the in-memory fallback.
            }
          }
        }
      }
    }
    memory.set(key, text);
    record(failed.code, failed.message, key);
    return failed;
  }

  /**
   * @template T
   * @param {string} key
   * @returns {T | null}
   */
  function get(key) {
    return inNamespace(key) ? /** @type {T | null} */ (readJson(key)) : null;
  }

  /**
   * @param {string} key
   * @param {unknown} value
   * @returns {StorageResult}
   */
  function set(key, value) {
    if (!inNamespace(key)) {
      return invalid('Only pentomino:v1: keys can be written');
    }
    let text;
    try {
      text = JSON.stringify(value);
    } catch {
      return invalid('The value cannot be saved as JSON');
    }
    return typeof text === 'string' ? writeRaw(key, text) : invalid('The value cannot be saved as JSON');
  }

  /**
   * @param {string} key
   * @returns {StorageResult}
   */
  function remove(key) {
    if (!inNamespace(key)) {
      return invalid('Only pentomino:v1: keys can be removed');
    }
    if (!adapter) {
      memory.delete(key);
      return { ok: true };
    }
    try {
      adapter.removeItem(key);
      memory.delete(key);
      return { ok: true };
    } catch (error) {
      memory.set(key, null);
      record('storage-unavailable', `Saved data could not be removed: ${error instanceof Error ? error.message : 'storage error'}`, key);
      return { ok: false, code: 'storage-unavailable', message: 'Saved data could not be removed' };
    }
  }

  /**
   * @param {string} fp Exact-coordinate fingerprint.
   * @param {ProgressInput} value
   * @returns {StorageResult}
   */
  function saveProgress(fp, value) {
    if (typeof fp !== 'string' || !FINGERPRINT.test(fp)) {
      return invalid('Not a progress fingerprint');
    }
    const clean = readProgress(value);
    if (!clean) {
      return invalid('The progress record is not valid');
    }
    const written = writeRaw(`${KEY_PROGRESS_PREFIX}${fp}`, JSON.stringify(clean));
    const index = readProgressIndex().filter((e) => e.fp !== fp);
    index.push({ fp, at: now() });
    index.sort((a, b) => a.at - b.at);
    for (const old of index.splice(0, Math.max(0, index.length - MAX_PROGRESS_ENTRIES))) {
      tryRemove(`${KEY_PROGRESS_PREFIX}${old.fp}`);
    }
    writeProgressIndex(index);
    return written;
  }

  /**
   * @param {string} fp
   * @returns {Progress | null}
   */
  function loadProgress(fp) {
    if (typeof fp !== 'string' || !FINGERPRINT.test(fp)) {
      return null;
    }
    const key = `${KEY_PROGRESS_PREFIX}${fp}`;
    const raw = readJson(key);
    if (raw === null) {
      return null;
    }
    const progress = readProgress(raw);
    if (!progress) {
      record('invalid-data', 'Saved progress was damaged and was ignored', key);
    }
    return progress;
  }

  /**
   * Forgets the progress of one puzzle: its record and its LRU entry.
   * @param {string} fp
   * @returns {StorageResult}
   */
  function removeProgress(fp) {
    if (typeof fp !== 'string' || !FINGERPRINT.test(fp)) {
      return invalid('Not a progress fingerprint');
    }
    const removed = remove(`${KEY_PROGRESS_PREFIX}${fp}`);
    writeProgressIndex(readProgressIndex().filter((e) => e.fp !== fp));
    return removed;
  }

  /**
   * @returns {Prefs} Stored booleans over the defaults.
   */
  function getPrefs() {
    const raw = readJson(KEY_PREFS);
    const prefs = { ...DEFAULT_PREFS };
    if (isRecord(raw)) {
      for (const name of PREF_KEYS) {
        if (typeof raw[name] === 'boolean') {
          prefs[name] = /** @type {boolean} */ (raw[name]);
        }
      }
    } else if (raw !== null) {
      record('invalid-data', 'Saved preferences were damaged and were ignored', KEY_PREFS);
    }
    return prefs;
  }

  /**
   * Merges known boolean preferences into the freshly read stored value.
   * @param {Partial<Prefs>} partial
   * @returns {StorageResult}
   */
  function setPrefs(partial) {
    const next = getPrefs();
    if (isRecord(partial)) {
      for (const name of PREF_KEYS) {
        if (typeof partial[name] === 'boolean') {
          next[name] = /** @type {boolean} */ (partial[name]);
        }
      }
    }
    return writeRaw(KEY_PREFS, JSON.stringify(next));
  }

  return {
    get,
    set,
    remove,
    /** Key names inside the namespace that start with `prefix`; no values are read. */
    list,
    /** @returns {Issue | null} The latest read/write problem, for one user notice. */
    lastStorageIssue: () => issue,
    clearStorageIssue: () => {
      issue = null;
    },
    saveProgress,
    loadProgress,
    removeProgress,
    getPrefs,
    setPrefs,
    getGeneratorState: () => readJson(KEY_GENERATOR),
    /** @param {unknown} snapshot */
    setGeneratorState: (snapshot) => set(KEY_GENERATOR, snapshot),
  };
}

/** @typedef {ReturnType<typeof createStorage>} Storage */

/** @type {Storage | null} */
let shared = null;

/**
 * @returns {StorageAdapter | null} The browser's localStorage, or null when access is denied or absent.
 */
function browserAdapter() {
  try {
    return /** @type {StorageAdapter | null} */ (globalThis.localStorage ?? null);
  } catch {
    return null;
  }
}

/**
 * The lazily created default instance over `localStorage` and `Date.now`.
 * @returns {Storage}
 */
export function browserStorage() {
  shared ??= createStorage(browserAdapter(), () => Date.now());
  return shared;
}

/** Default instance: each method resolves the lazy browser storage when called. */
const storage = {
  /** @type {Storage['get']} */
  get: (key) => browserStorage().get(key),
  /** @type {Storage['set']} */
  set: (key, value) => browserStorage().set(key, value),
  /** @type {Storage['remove']} */
  remove: (key) => browserStorage().remove(key),
  /** @type {Storage['list']} */
  list: (prefix) => browserStorage().list(prefix),
  lastStorageIssue: () => browserStorage().lastStorageIssue(),
  clearStorageIssue: () => browserStorage().clearStorageIssue(),
  /** @type {Storage['saveProgress']} */
  saveProgress: (fp, value) => browserStorage().saveProgress(fp, value),
  /** @type {Storage['loadProgress']} */
  loadProgress: (fp) => browserStorage().loadProgress(fp),
  /** @type {Storage['removeProgress']} */
  removeProgress: (fp) => browserStorage().removeProgress(fp),
  getPrefs: () => browserStorage().getPrefs(),
  /** @type {Storage['setPrefs']} */
  setPrefs: (partial) => browserStorage().setPrefs(partial),
  getGeneratorState: () => browserStorage().getGeneratorState(),
  /** @type {Storage['setGeneratorState']} */
  setGeneratorState: (snapshot) => browserStorage().setGeneratorState(snapshot),
};

export const {
  get, set, remove, list, lastStorageIssue, clearStorageIssue, saveProgress, loadProgress, removeProgress, getPrefs, setPrefs,
  getGeneratorState,
  setGeneratorState,
} = storage;

export default storage;
