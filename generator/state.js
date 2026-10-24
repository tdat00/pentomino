// @ts-check
// Generator state: the observable store, device classification, board edit transitions,
// seed and batch bookkeeping, derived board/level descriptions and safe persistence
// (design §6.2, §8.6, §10.1–§10.7). Pure: nothing here touches the DOM, and all limits,
// ranges and level tables come from the engine modules.
import {
  MAX_SIDE, activeCount, boardFromRows, boardKey, boardToRows, rectangle, trimMargins, validateForGeneration,
} from '../core/engine/board.js';
import { initialClueCount, level, offeredLevels } from '../core/engine/levels.js';
import { canonicalKey } from '../core/engine/geometry.js';
import { createPack, packBoard, PackError, serializePack, validatePack } from '../core/engine/pack.js';
import { BUDGETS, LIMITS, POLICY_ID, enabledMaxActive, pieceCountRange, sizeWindow } from '../core/engine/policy.js';
import { QUALIFICATION } from '../core/engine/qualification.js';
import { batchSeedFor, normalizeSeedText, randomSeedText, RNG_ID, SEED_SCHEME } from '../core/engine/rng.js';
import { clueKey, layoutKey } from '../core/engine/keys.js';
import { ALGO_ID, APP_VERSION } from '../core/engine/version.js';
import { t } from './i18n.js';
import { formatMessage, formatNotice, levelLabel } from './strings.js';

/** @typedef {import('../core/engine/types.js').Board} Board */
/** @typedef {import('../core/engine/types.js').PieceSet} PieceSet */
/** @typedef {import('../core/engine/types.js').Puzzle} Puzzle */
/** @typedef {import('../core/engine/types.js').Pack} Pack */
/** @typedef {import('../core/engine/types.js').XY} XY */

/**
 * A stored set with its seed, batch counter and history. Packs keep it serializable.
 * @typedef {object} SavedSet
 * @property {Pack} setPack
 * @property {Pack | null} calibrationPack
 * @property {Pack | null} batchPack
 * @property {string} setSeed
 * @property {number} batchIndex
 * @property {{ layouts: string[], clues: string[] }} history
 * @property {{ levelId: string, uniqueness: 'any' | 'require' } | null} [calibrationFor]
 * @property {Record<string, string>} [puzzleSeeds] Batch seed of each puzzle of `batchPack`, by puzzle id.
 */

/**
 * @typedef {object} GeneratorState
 * @property {Board} board Editor board; `set.board` keeps the board a set was made for.
 * @property {number} rotation Display angle, counter-clockwise, multiple of 45.
 * @property {string} presetId Board preset last chosen in step 1 (one of PRESET_IDS).
 * @property {string} levelId
 * @property {string} seedText
 * @property {boolean} keepSeed
 * @property {'any' | 'require'} uniqueness
 * @property {boolean} largeBoards Mirror of the stored preference; never written to gen:state.
 * @property {string | null} setSeed
 * @property {number} batchIndex
 * @property {PieceSet | null} set
 * @property {Puzzle | null} calibration
 * @property {{ levelId: string, uniqueness: 'any' | 'require' } | null} calibrationFor Settings the calibration was made for; null = unknown.
 * @property {Puzzle[]} puzzles
 * @property {string[]} seenLayouts
 * @property {string[]} seenClues
 * @property {Readonly<Record<string, readonly SavedSet[]>>} setsByBoard Saved sets by board: the key is `boardKey(board)`, the list
 *   holds the sets made for that board, newest first. The set on show is not in it.
 * @property {null | JobInfo} job Owned by the job controller; never persisted.
 * @property {{ labels: boolean, patterns: boolean, timer: boolean, straighten: boolean }} prefs
 * @property {number} quantity Puzzles per request, 1-10.
 * @property {string | null} batchLevelId Level of the puzzle row; null follows the level the set was made for.
 * @property {StatusNotice | null} notice Outcome of the last action.
 * @property {readonly string[]} checking Puzzle ids whose lazy certificate is still pending.
 * @property {readonly string[]} claimedIds Puzzles whose rating and certificate come from a file or storage.
 * @property {Readonly<Record<string, string>>} puzzleSeeds Batch seed each puzzle was generated with, by puzzle id.
 * @property {boolean} calibrationTrusted The calibration was produced by this session's engine run.
 * @property {number} setPosition Where the set on show sits in the newest-first list of the sets of its own board.
 * @property {readonly (readonly Puzzle[])[]} parked Earlier puzzle groups kept as separate packs after a size split.
 * @property {Readonly<Record<string, string>>} verification Solvability status of imported puzzles by id.
 * @property {LinkState} links Prepared player links of the visible pack.
 */

/**
 * @typedef {object} JobInfo
 * @property {number} requestId
 * @property {string} revision
 * @property {string} stage
 * @property {number} startedAt
 * @property {'set' | 'batch' | 'import'} [kind]
 * @property {number} [accepted]
 * @property {number} [quantity]
 * @property {number} [slot] One-based puzzle slot being worked on.
 * @property {boolean} [cancelling]
 */

/**
 * @typedef {object} StatusNotice
 * @property {string} code Notice id (N-*) or a message id (M-*).
 * @property {string} text
 * @property {'error' | 'warning' | 'info'} kind
 * @property {string[]} actions `new-set`, `reset-history`, `smaller-quantity`.
 * @property {number} [room] Remaining history room for `smaller-quantity`.
 * @property {() => string} [retext] Builds `text` again, so the notice can follow a language switch.
 */

/**
 * @typedef {object} LinkItem
 * @property {string | null} href
 * @property {boolean} portable
 * @property {string} [warning]
 */

/**
 * `pack` is the exact pack object the links were prepared for; `items[i]` belongs to `ids[i]`.
 * @typedef {object} LinkState
 * @property {Pack | null} pack
 * @property {readonly string[]} ids
 * @property {readonly LinkItem[]} items
 */

/**
 * @typedef {object} HardwareClass
 * @property {boolean} coarsePointer
 * @property {number | undefined} deviceMemory
 * @property {number | undefined} hardwareConcurrency
 * @property {boolean} phone
 */

export const DEFAULT_COLS = 10;
export const DEFAULT_ROWS = 6;
export const MIN_EDIT_SIDE = 3;
export const HISTORY_LIMIT = 50;
/** Most piece sets kept for one board, the one on show included; at the limit Generate is disabled until a set is removed. */
export const MAX_SETS = 50;
export const MAX_SAVED_SETS = MAX_SETS - 1;
/** Most boards whose sets are kept; the board used least recently loses its sets first. */
export const MAX_SAVED_BOARDS = 10;
export const PERSIST_DELAY_MS = 300;
export const STORAGE_VERSION = 1;
export const DEFAULT_QUANTITY = 5;
export const DEFAULT_LEVEL_ID = 'normal';
/** Board presets of step 1, as the preset menu lists them. */
export const PRESET_IDS = Object.freeze(['rectangle', 'heart', 'diamond', 'cross', 'ring']);
/** Levels the generator can ever offer (areas up to 676): Very easy … Hell-3. */
export const LISTED_LEVEL_IDS = Object.freeze(['very-easy', 'easy', 'normal', 'hard', 'expert', 'master', 'nightmare', 'hell-1', 'hell-2', 'hell-3']);
const FIRST_HELL_INDEX = 7;
const UNIQUE_STANDARD_AREA = 200;
const MAX_KEY_LENGTH = 8192;

/** @type {LinkState} */
const EMPTY_LINKS = Object.freeze({ pack: null, ids: Object.freeze([]), items: Object.freeze([]) });

/** @type {GeneratorState['prefs']} */
const DEFAULT_VIEW_PREFS =  Object.freeze({ labels: true, patterns: true, timer: true, straighten: false });

/**
 * @param {Partial<GeneratorState>} [overrides]
 * @returns {GeneratorState}
 */
export function defaultGeneratorState(overrides = {}) {
  return {
    board: rectangle(DEFAULT_COLS, DEFAULT_ROWS),
    rotation: 0,
    presetId: 'rectangle',
    levelId: DEFAULT_LEVEL_ID,
    seedText: '',
    keepSeed: false,
    uniqueness: 'any',
    largeBoards: false,
    setSeed: null,
    batchIndex: 0,
    set: null,
    calibration: null,
    calibrationFor: null,
    puzzles: [],
    seenLayouts: [],
    seenClues: [],
    setsByBoard: {},
    job: null,
    prefs: { ...DEFAULT_VIEW_PREFS },
    quantity: DEFAULT_QUANTITY,
    batchLevelId: null,
    notice: null,
    checking: [],
    claimedIds: [],
    puzzleSeeds: {},
    calibrationTrusted: false,
    setPosition: 0,
    parked: [],
    verification: {},
    links: EMPTY_LINKS,
    ...overrides,
  };
}

/**
 * @param {Record<string, unknown>} a
 * @param {Record<string, unknown>} b
 * @returns {boolean}
 */
function shallowEqual(a, b) {
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) {
    return false;
  }
  return keys.every((key) => Object.hasOwn(b, key) && Object.is(a[key], b[key]));
}

/**
 * Observable state holder. `update` takes a patch or an updater (old state → new state);
 * values are replaced, never mutated in place. Unchanged results do not notify.
 * @param {Partial<GeneratorState>} [initial]
 */
export function createGeneratorStore(initial) {
  /** @type {GeneratorState} */
  let state = { ...defaultGeneratorState(), ...initial };
  /** @type {Set<(state: GeneratorState, previous: GeneratorState) => void>} */
  const listeners = new Set();
  let destroyed = false;
  return {
    /** @returns {GeneratorState} */
    getState: () => state,
    /**
     * @param {(state: GeneratorState, previous: GeneratorState) => void} listener
     * @returns {() => void} unsubscribe
     */
    subscribe(listener) {
      if (typeof listener !== 'function') {
        throw new TypeError('listener must be a function');
      }
      if (destroyed) {
        return () => {};
      }
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** @param {Partial<GeneratorState> | ((state: GeneratorState) => GeneratorState)} patchOrUpdater */
    update(patchOrUpdater) {
      if (destroyed) {
        return;
      }
      const previous = state;
      const next = typeof patchOrUpdater === 'function' ? patchOrUpdater(previous) : { ...previous, ...patchOrUpdater };
      if (typeof next !== 'object' || next === null) {
        throw new TypeError('the state update must produce an object');
      }
      if (next === previous || shallowEqual(/** @type {any} */ (next), /** @type {any} */ (previous))) {
        return;
      }
      state = next;
      for (const listener of [...listeners]) {
        try {
          listener(state, previous);
        } catch (error) {
          // One failing subscriber must not starve the others; surface it asynchronously.
          globalThis.setTimeout(() => {
            throw error;
          }, 0);
        }
      }
    },
    destroy() {
      destroyed = true;
      listeners.clear();
    },
  };
}

/** @typedef {ReturnType<typeof createGeneratorStore>} GeneratorStore */

// Device classification (design §6.2).

/**
 * Phone = coarse primary pointer and (deviceMemory <= 4, unknown, or hardwareConcurrency <= 4).
 * @param {{ coarsePointer: boolean, deviceMemory?: number, hardwareConcurrency?: number }} hw
 * @returns {boolean}
 */
export function isPhone(hw) {
  if (hw.coarsePointer !== true) {
    return false;
  }
  const memory = hw.deviceMemory;
  const memoryKnown = typeof memory === 'number' && Number.isFinite(memory);
  const cores = hw.hardwareConcurrency;
  return !memoryKnown || /** @type {number} */ (memory) <= 4 || (typeof cores === 'number' && cores <= 4);
}

/**
 * Reads the browser (or an injected stand-in with matchMedia and navigator).
 * @param {{ matchMedia?: (query: string) => { matches: boolean }, navigator?: { deviceMemory?: number, hardwareConcurrency?: number } }} [env]
 * @returns {HardwareClass}
 */
export function detectHardware(env = /** @type {any} */ (globalThis)) {
  let coarsePointer = false;
  try {
    coarsePointer = env.matchMedia?.('(pointer: coarse)')?.matches === true;
  } catch {
    coarsePointer = false;
  }
  const nav = env.navigator;
  const deviceMemory = typeof nav?.deviceMemory === 'number' ? nav.deviceMemory : undefined;
  const hardwareConcurrency = typeof nav?.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : undefined;
  return { coarsePointer, deviceMemory, hardwareConcurrency, phone: isPhone({ coarsePointer, deviceMemory, hardwareConcurrency }) };
}

/**
 * Largest board area accepted on this device with the current Large boards preference.
 * @param {Pick<GeneratorState, 'largeBoards'>} state
 * @param {{ phone: boolean }} hardware
 * @returns {number}
 */
export function capFor(state, hardware) {
  return enabledMaxActive({ phone: hardware.phone, largeBoards: state.largeBoards });
}

// Board edit transitions (all return new boards; inputs are never mutated).

/**
 * @param {Board} a
 * @param {Board} b
 * @returns {boolean}
 */
export function boardsEqual(a, b) {
  return a.width === b.width && a.height === b.height && a.active.every((v, i) => v === b.active[i]);
}

/**
 * @param {Board} board
 * @param {number} x
 * @param {number} y
 * @param {0 | 1} value
 * @returns {Board} The same board when the cell already has that value or lies outside.
 */
export function setCell(board, x, y, value) {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= board.width || y >= board.height) {
    return board;
  }
  const index = y * board.width + x;
  if (board.active[index] === value) {
    return board;
  }
  const active = board.active.slice();
  active[index] = value;
  return { width: board.width, height: board.height, active };
}

/**
 * Cells still inside the new bounds keep their state; new cells are active.
 * @param {Board} board
 * @param {number} cols
 * @param {number} rows
 * @returns {Board}
 */
export function resizeBoard(board, cols, rows) {
  for (const [name, value] of /** @type {const} */ ([['columns', cols], ['rows', rows]])) {
    if (!Number.isInteger(value) || value < MIN_EDIT_SIDE || value > MAX_SIDE) {
      throw new RangeError(`${name} must be a whole number from ${MIN_EDIT_SIDE} to ${MAX_SIDE}`);
    }
  }
  if (cols === board.width && rows === board.height) {
    return board;
  }
  const active = new Uint8Array(cols * rows);
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      active[y * cols + x] = x < board.width && y < board.height ? board.active[y * board.width + x] : 1;
    }
  }
  return { width: cols, height: rows, active };
}

/**
 * Bounded undo history of whole boards (immutable values, so sharing is safe).
 * @param {number} [limit]
 */
export function createEditHistory(limit = HISTORY_LIMIT) {
  /** @type {Board[]} */
  const past = [];
  return {
    /** Records the board as it was before one edit step. @param {Board} before */
    record(before) {
      past.push(before);
      if (past.length > limit) {
        past.shift();
      }
    },
    /** @returns {Board | null} The most recent recorded board, removed from the history. */
    undo: () => past.pop() ?? null,
    canUndo: () => past.length > 0,
    size: () => past.length,
    clear() {
      past.length = 0;
    },
  };
}

/**
 * Closest listed level to `levelId` among those offered at `area`; null when none is offered.
 * @param {string} levelId
 * @param {number} area
 * @returns {string | null}
 */
export function nearestOfferedLevel(levelId, area) {
  const offered = offeredLevels(area).filter((l) => LISTED_LEVEL_IDS.includes(l.id));
  if (offered.length === 0) {
    return null;
  }
  const from = level(levelId).index;
  let best = offered[0];
  for (const candidate of offered) {
    if (Math.abs(candidate.index - from) < Math.abs(best.index - from)) {
      best = candidate;
    }
  }
  return best.id;
}

/**
 * The state after a structural board edit. The set on show always belongs to the board on show: when the board no
 * longer matches it, the set joins the saved sets of its own board and the newest set made for the new board takes its
 * place, or no set is shown at all. An edit that goes back to an earlier board brings its sets back. A level that is
 * unavailable on the new board moves to the nearest offered one.
 * @param {GeneratorState} state
 * @param {Board} board
 * @param {number} [rotation]
 * @returns {GeneratorState}
 */
export function withBoard(state, board, rotation = state.rotation) {
  const levelId = nearestOfferedLevel(state.levelId, activeCount(board)) ?? state.levelId;
  const fitted = fitSet(board === state.board ? state : { ...state, board });
  if (fitted === state && rotation === state.rotation && levelId === state.levelId) {
    return state;
  }
  return { ...fitted, rotation, levelId };
}

/**
 * @param {GeneratorState} state
 * @returns {GeneratorState} The state with the set on show made for `state.board`: the set of another board is saved
 *   under its own board and the newest readable set of this board comes instead, or none.
 */
function fitSet(state) {
  const shown = state.set;
  if (shown !== null && boardsEqual(shown.board, state.board)) {
    return state;
  }
  const current = shown === null ? null : savedSetOf(state);
  const ownKey = shown === null ? '' : boardKey(shown.board);
  const setsByBoard = current === null
    ? state.setsByBoard
    : withSets(state.setsByBoard, ownKey, insertAt(listOf(state.setsByBoard, ownKey), state.setPosition, current).slice(0, MAX_SAVED_SETS));
  const key = boardKey(state.board);
  const list = listOf(setsByBoard, key);
  /** @type {Set<number>} */
  const dropped = new Set();
  for (let i = 0; i < list.length; i += 1) {
    const read = readSavedSet(list[i]);
    if (read === null) {
      dropped.add(i);
      continue;
    }
    return {
      ...state,
      ...freshSetExtras(),
      ...read,
      setsByBoard: withSets(setsByBoard, key, list.filter((_, at) => at !== i && !dropped.has(at))),
      setPosition: 0,
    };
  }
  return shown === null && dropped.size === 0 ? state : withoutSet(state, withSets(setsByBoard, key, list.filter((_, at) => !dropped.has(at))));
}

/**
 * @param {GeneratorState} state
 * @returns {GeneratorState}
 */
export function trimBoard(state) {
  return withBoard(state, trimMargins(state.board));
}

/**
 * @param {GeneratorState} state
 * @returns {boolean} Controls that change the board or settings are disabled while a job runs.
 */
export function isBusy(state) {
  return state.job !== null;
}

// Seeds and batches (design §8.6).

/**
 * @param {string} text
 * @returns {string | null} The normalized seed, or null when it is empty or too long.
 */
export function validSeed(text) {
  try {
    return normalizeSeedText(text);
  } catch {
    return null;
  }
}

/**
 * Typing a seed turns Keep seed on; clearing the field turns it off.
 * @param {GeneratorState} state
 * @param {string} text
 * @returns {GeneratorState}
 */
export function typeSeed(state, text) {
  return { ...state, seedText: text, keepSeed: text.trim() !== '' };
}

/**
 * The dice button: a fresh random seed now, kept for the next Generate. There is no Keep seed switch in the UI,
 * so a seed the user can see after rolling must be the one used.
 * @param {GeneratorState} state
 * @param {() => string} [random]
 * @returns {GeneratorState}
 */
export function rollSeed(state, random = randomSeedText) {
  return { ...state, seedText: random(), keepSeed: true };
}

/**
 * Seed for a Generate Piece Set request: with Keep seed off a fresh random seed first replaces
 * the field; with it on the field text is used unchanged (trimmed and NFC-normalized).
 * @param {GeneratorState} state
 * @param {() => string} [random]
 * @returns {{ ok: true, state: GeneratorState, seed: string } | { ok: false, reason: 'invalid-seed' }}
 */
export function beginSetRequest(state, random = randomSeedText) {
  const seed = state.keepSeed ? validSeed(state.seedText) : validSeed(random());
  if (seed === null) {
    return { ok: false, reason: 'invalid-seed' };
  }
  return { ok: true, state: state.seedText === seed ? state : { ...state, seedText: seed }, seed };
}

/**
 * The per-set data a new, restored or imported set starts without.
 * @returns {Pick<GeneratorState, 'notice' | 'checking' | 'batchLevelId' | 'parked' | 'verification' | 'links' | 'claimedIds' | 'puzzleSeeds' | 'setPosition'>}
 */
function freshSetExtras() {
  return {
    notice: null, checking: [], batchLevelId: null, parked: [], verification: {}, links: EMPTY_LINKS, claimedIds: [], puzzleSeeds: {}, setPosition: 0,
  };
}

/**
 * @template T
 * @param {readonly T[]} list
 * @param {number} index
 * @param {T} item
 * @returns {T[]}
 */
function insertAt(list, index, item) {
  const at = Math.max(0, Math.min(index, list.length));
  return [...list.slice(0, at), item, ...list.slice(at)];
}

/**
 * The sets by board with one board's list replaced. The board becomes the most recently used (last), an empty list
 * removes it, and the boards used least recently go once there are more than MAX_SAVED_BOARDS.
 * @param {Readonly<Record<string, readonly SavedSet[]>>} setsByBoard
 * @param {string} key
 * @param {readonly SavedSet[]} list
 * @returns {Record<string, readonly SavedSet[]>}
 */
function withSets(setsByBoard, key, list) {
  /** @type {Record<string, readonly SavedSet[]>} */
  const next = {};
  for (const [other, sets] of Object.entries(setsByBoard)) {
    if (other !== key) {
      next[other] = sets;
    }
  }
  if (list.length > 0) {
    next[key] = list;
  }
  for (const old of Object.keys(next).slice(0, Math.max(0, Object.keys(next).length - MAX_SAVED_BOARDS))) {
    delete next[old];
  }
  return next;
}

/**
 * @param {Readonly<Record<string, readonly SavedSet[]>>} setsByBoard
 * @param {string} key
 * @returns {readonly SavedSet[]} The saved sets of a board, newest first.
 */
function listOf(setsByBoard, key) {
  return Object.hasOwn(setsByBoard, key) ? setsByBoard[key] : [];
}

/**
 * @param {GeneratorState} state
 * @param {string} key
 * @returns {readonly SavedSet[]} The saved sets of a board, newest first (the set on show is never in it).
 */
function savedFor(state, key) {
  return listOf(state.setsByBoard, key);
}

/**
 * A newly accepted set starts at batch 0 with empty history, even when regenerated with the
 * same seed; the previous committed set moves into the (at most 5) set history.
 * @param {GeneratorState} state
 * @param {{ set: PieceSet, calibration: Puzzle | null, setSeed: string, calibrationFor?: GeneratorState['calibrationFor'],
 *   trusted?: boolean }} accepted `trusted` marks a calibration the engine produced in this session.
 * @returns {GeneratorState}
 */
export function acceptSet(state, accepted) {
  const previous = savedSetOf(state);
  // The set on show joins the saved sets of its own board, at the place it had in that list.
  const previousKey = state.set === null ? '' : boardKey(state.set.board);
  const setsByBoard = previous === null
    ? state.setsByBoard
    : withSets(state.setsByBoard, previousKey, insertAt(savedFor(state, previousKey), state.setPosition, previous).slice(0, MAX_SAVED_SETS));
  return {
    ...state,
    ...freshSetExtras(),
    set: accepted.set,
    calibration: accepted.calibration,
    calibrationFor: accepted.calibration === null ? null : accepted.calibrationFor ?? { levelId: state.levelId, uniqueness: state.uniqueness },
    calibrationTrusted: accepted.calibration !== null && accepted.trusted === true,
    setSeed: accepted.setSeed,
    batchIndex: 0,
    puzzles: [],
    seenLayouts: [],
    seenClues: [],
    setsByBoard,
  };
}

/**
 * Every New Puzzles / Add more request increments the set's batch index, whatever its outcome. Its seed is the given
 * `batchSeed` or, by default, `setSeed#batchIndex`.
 * @param {GeneratorState} state
 * @param {string} [batchSeed]
 * @returns {{ state: GeneratorState, batchSeed: string, batchIndex: number } | null} null without a set.
 */
export function nextBatch(state, batchSeed) {
  if (state.set === null || state.setSeed === null) {
    return null;
  }
  const batchIndex = state.batchIndex + 1;
  return { state: { ...state, batchIndex }, batchSeed: batchSeed ?? batchSeedFor(state.setSeed, batchIndex), batchIndex };
}

/**
 * @param {readonly string[]} known
 * @param {readonly string[]} added
 * @returns {string[]} Union keeping the newest `historyKeys` entries.
 */
function mergeKeys(known, added) {
  const merged = [...new Set([...known, ...added])];
  return merged.length > BUDGETS.historyKeys ? merged.slice(merged.length - BUDGETS.historyKeys) : merged;
}

/**
 * Commits a finished batch: New Puzzles replaces the visible batch, Add more appends; the layout
 * and clue history only grows, so a batch seed is never replayed against a grown history.
 * @param {GeneratorState} state
 * @param {{ puzzles: Puzzle[], seenLayouts: readonly string[], seenClues: readonly string[], append: boolean }} batch
 * @returns {GeneratorState}
 */
export function recordBatch(state, batch) {
  return {
    ...state,
    puzzles: batch.append ? [...state.puzzles, ...batch.puzzles] : [...batch.puzzles],
    seenLayouts: mergeKeys(state.seenLayouts, batch.seenLayouts),
    seenClues: mergeKeys(state.seenClues, batch.seenClues),
  };
}

/**
 * @param {GeneratorState} state
 * @returns {boolean} Whether the stored calibration was made for the level and uniqueness now selected.
 */
export function calibrationCurrent(state) {
  const made = state.calibrationFor;
  return state.calibration !== null && made !== null && made.levelId === state.levelId && made.uniqueness === state.uniqueness;
}

// Derived descriptions for the panels.

/**
 * @typedef {object} LevelEntry
 * @property {string} id
 * @property {string} label
 * @property {boolean} offered
 * @property {'larger' | 'smaller' | null} reason
 */

/**
 * Every listed level with its availability at `area`.
 * @param {number} area
 * @returns {LevelEntry[]}
 */
export function describeLevels(area) {
  const offered = new Set(offeredLevels(area).map((l) => l.id));
  return LISTED_LEVEL_IDS.map((id) => {
    const lv = level(id);
    const isOffered = offered.has(id);
    return { id, label: levelLabel(id), offered: isOffered, reason: isOffered ? null : area < lv.areas[0] ? 'larger' : 'smaller' };
  });
}

/**
 * Piece counts, piece sizes, pre-placed share and pre-placed pieces for a level on a board, from the policy APIs.
 * @param {string} levelId
 * @param {number} area
 * @returns {{ kmin: number, kmax: number, sizeMin: number, sizeMax: number, share: number, placedMin: number, placedMax: number } | null}
 *   null when not offered.
 */
export function describeCount(levelId, area) {
  if (!LISTED_LEVEL_IDS.includes(levelId) || !Number.isInteger(area) || area < 1) {
    return null;
  }
  const counts = pieceCountRange(levelId, area);
  if (counts === null || counts.length === 0) {
    return null;
  }
  let sizeMin = Infinity;
  let sizeMax = 0;
  for (const k of counts) {
    const [low, high] = sizeWindow(area, k);
    sizeMin = Math.min(sizeMin, low);
    sizeMax = Math.max(sizeMax, high);
  }
  const share = level(levelId).share;
  return {
    kmin: counts[0], kmax: counts[counts.length - 1], sizeMin, sizeMax, share: Math.round(share * 100),
    placedMin: initialClueCount(share, counts[0]), placedMax: initialClueCount(share, counts[counts.length - 1]),
  };
}

/**
 * @typedef {object} Notice
 * @property {string} code
 * @property {string} text
 * @property {'error' | 'warning' | 'info'} kind
 */

/**
 * @typedef {object} BoardDescription
 * @property {number} area
 * @property {number} cap
 * @property {boolean} valid No validation error.
 * @property {string} statusText `{active} / {columns × rows} playable squares · connected` or the validation errors.
 * @property {XY[]} invalidCells Cells to highlight (outside the largest connected region).
 * @property {Notice[]} notices
 * @property {LevelEntry[]} levels
 * @property {boolean} levelOffered
 * @property {ReturnType<typeof describeCount>} count
 * @property {Notice[]} levelNotices
 */

/**
 * Everything the panels show about the current board, level and device.
 * @param {GeneratorState} state
 * @param {{ phone: boolean }} hardware
 * @param {number} [quantity] Puzzles per batch, for N-EXPERIMENTAL.
 * @returns {BoardDescription}
 */
export function describeBoard(state, hardware, quantity = DEFAULT_QUANTITY) {
  const area = activeCount(state.board);
  const cap = capFor(state, hardware);
  const { errors, warnings } = validateForGeneration(state.board, cap);
  /** @type {Notice[]} */
  const notices = [];
  /** @type {string[]} */
  const errorTexts = [];
  /** @type {XY[]} */
  const invalidCells = [];
  for (const issue of errors) {
    errorTexts.push(boardIssueText(issue, area, cap));
    for (const cell of issue.cells ?? []) {
      invalidCells.push(cell);
    }
  }
  const levels = describeLevels(area);
  const levelOffered = levels.some((l) => l.id === state.levelId && l.offered);
  const count = levelOffered ? describeCount(state.levelId, area) : null;
  const levelName = LISTED_LEVEL_IDS.includes(state.levelId) ? levelLabel(state.levelId) : state.levelId;

  if (warnings.some((w) => w.code === 'board-large')) {
    notices.push({ code: 'N-LARGE', text: formatNotice('N-LARGE'), kind: 'warning' });
  }
  if (!hardware.phone && state.largeBoards && area > LIMITS.releaseMaxActive && area <= cap && QUALIFICATION.bq2.status !== 'pass') {
    notices.push({ code: 'N-EXPERIMENTAL', text: formatNotice('N-EXPERIMENTAL', { limit: LIMITS.releaseMaxActive, q: quantity }), kind: 'warning' });
  }
  if (count !== null) {
    notices.push({ code: 'N-COUNT', text: formatNotice('N-COUNT', { kmin: count.kmin, kmax: count.kmax, level: levelName, share: count.share }), kind: 'info' });
  }
  const offered = levels.filter((l) => l.offered);
  if (offered.length > 0) {
    const highest = offered[offered.length - 1];
    const lowest = offered[0];
    if (levels.some((l) => l.reason === 'larger' && levels.indexOf(l) > levels.indexOf(highest))) {
      notices.push({ code: 'N-LEVELS', text: formatNotice('N-LEVELS', { highest: highest.label }, 'above'), kind: 'info' });
    }
    if (levels.some((l) => l.reason === 'smaller' && levels.indexOf(l) < levels.indexOf(lowest))) {
      notices.push({ code: 'N-LEVELS', text: formatNotice('N-LEVELS', { lowest: lowest.label }, 'below'), kind: 'info' });
    }
  }

  /** @type {Notice[]} */
  const levelNotices = [];
  if (state.uniqueness === 'require' && LISTED_LEVEL_IDS.includes(state.levelId)
    && level(state.levelId).index >= FIRST_HELL_INDEX && area > UNIQUE_STANDARD_AREA) {
    levelNotices.push({ code: 'N-UNIQUE-EXP', text: formatNotice('N-UNIQUE-EXP'), kind: 'warning' });
  }

  const statusText = errorTexts.length > 0
    ? errorTexts.join(' ')
    : t('board.status', { area, total: state.board.width * state.board.height });
  return { area, cap, valid: errors.length === 0, statusText, invalidCells, notices, levels, levelOffered, count, levelNotices };
}

// Packs: sets, calibration and batches are stored as validated pack documents.

/**
 * @param {PieceSet} set
 * @param {number} rotation
 * @param {Puzzle[]} puzzles
 * @returns {Pack}
 */
function packOf(set, rotation, puzzles) {
  return createPack({
    board: set.board,
    rotation,
    pieces: set.pieces,
    witness: set.witness,
    puzzles,
    meta: { carving: set.carving, macroRegion: set.macroRegion },
  });
}

/**
 * @param {Pack} pack
 * @returns {PieceSet}
 */
function setFromPack(pack) {
  const meta = /** @type {{ carving?: unknown, macroRegion?: unknown } | undefined} */ (pack.meta);
  const region = meta?.macroRegion;
  const macro = meta?.carving === 'macro' && Array.isArray(region) && region.length === pack.pieces.length
    && region.every((n) => Number.isSafeInteger(n) && n >= 0);
  const flat = meta?.carving === 'flat' && region === null;
  return {
    board: packBoard(pack),
    pieces: pack.pieces,
    witness: pack.witness ?? null,
    carving: macro ? 'macro' : flat ? 'flat' : 'imported',
    macroRegion: macro ? /** @type {number[]} */ (region) : null,
  };
}

/**
 * Restored puzzles carry the pack's rating and certificate as unverified claims.
 * @param {Pack} pack
 * @returns {Puzzle[]}
 */
function puzzlesFromPack(pack) {
  return pack.puzzles.map((p) => /** @type {Puzzle} */ (/** @type {unknown} */ ({
    id: p.id,
    ...(p.title === undefined ? {} : { title: p.title }),
    clues: p.clues,
    solution: p.solution ?? null,
    rating: p.rating ?? null,
    certificate: p.certificate ?? null,
  })));
}

/**
 * @param {GeneratorState} state
 * @returns {SavedSet | null} The committed set as a stored snapshot; null without a set or seed.
 */
export function savedSetOf(state) {
  if (state.set === null || state.setSeed === null) {
    return null;
  }
  try {
    return {
      setPack: packOf(state.set, state.rotation, []),
      calibrationPack: state.calibration === null ? null : packOf(state.set, state.rotation, [state.calibration]),
      batchPack: state.puzzles.length === 0 ? null : packOf(state.set, state.rotation, state.puzzles),
      setSeed: state.setSeed,
      batchIndex: state.batchIndex,
      history: { layouts: [...state.seenLayouts], clues: [...state.seenClues] },
      calibrationFor: state.calibrationFor,
      puzzleSeeds: seedsOfPuzzles(state.puzzleSeeds, state.puzzles),
    };
  } catch {
    return null;
  }
}

/**
 * Engine objects for a stored set; null when its packs do not validate or do not belong together.
 * @param {unknown} saved
 * @returns {{ set: PieceSet, calibration: Puzzle | null, calibrationFor: GeneratorState['calibrationFor'], calibrationTrusted: boolean,
 *   puzzles: Puzzle[], claimedIds: string[], puzzleSeeds: Record<string, string>, setSeed: string, batchIndex: number,
 *   seenLayouts: string[], seenClues: string[] } | null}
 */
export function readSavedSet(saved) {
  if (typeof saved !== 'object' || saved === null) {
    return null;
  }
  const dto = /** @type {Record<string, any>} */ (saved);
  const setSeed = typeof dto.setSeed === 'string' ? validSeed(dto.setSeed) : null;
  const batchIndex = dto.batchIndex;
  if (setSeed === null || !Number.isSafeInteger(batchIndex) || batchIndex < 0) {
    return null;
  }
  const setResult = validatePack(dto.setPack);
  if (!setResult.ok) {
    return null;
  }
  const set = setFromPack(setResult.value);
  const rows = JSON.stringify(setResult.value.board.rows);
  const pieces = JSON.stringify(setResult.value.pieces);
  /**
   * @param {unknown} raw
   * @param {(n: number) => boolean} count
   * @returns {Puzzle[]}
   */
  const related = (raw, count) => {
    if (raw === null || raw === undefined) {
      return [];
    }
    const result = validatePack(raw);
    if (!result.ok || JSON.stringify(result.value.board.rows) !== rows || JSON.stringify(result.value.pieces) !== pieces
      || !count(result.value.puzzles.length)) {
      return [];
    }
    return puzzlesFromPack(result.value);
  };
  const calibrationList = related(dto.calibrationPack, (n) => n === 1);
  const puzzles = related(dto.batchPack, (n) => n >= 1 && n <= 100);
  const history = typeof dto.history === 'object' && dto.history !== null ? dto.history : {};
  const made = dto.calibrationFor;
  const calibrationFor = calibrationList.length === 1 && typeof made === 'object' && made !== null
    && LISTED_LEVEL_IDS.includes(made.levelId) && (made.uniqueness === 'any' || made.uniqueness === 'require')
    ? { levelId: /** @type {string} */ (made.levelId), uniqueness: /** @type {'any' | 'require'} */ (made.uniqueness) }
    : null;
  return {
    set,
    calibration: calibrationList[0] ?? null,
    calibrationFor,
    calibrationTrusted: false,
    puzzles,
    claimedIds: puzzles.map((p) => p.id),
    puzzleSeeds: seedsOfPuzzles(dto.puzzleSeeds, puzzles),
    setSeed,
    batchIndex,
    seenLayouts: readKeys(history.layouts),
    seenClues: readKeys(history.clues),
  };
}

/**
 * The batch seeds that belong to these puzzles: text of 1–200 characters, one per puzzle id; anything else is dropped.
 * @param {unknown} source A stored or live `puzzleSeeds` value.
 * @param {readonly { id: string }[]} puzzles
 * @returns {Record<string, string>}
 */
function seedsOfPuzzles(source, puzzles) {
  /** @type {Record<string, string>} */
  const seeds = {};
  if (typeof source !== 'object' || source === null || Array.isArray(source)) {
    return seeds;
  }
  for (const puzzle of puzzles) {
    const seed = Object.hasOwn(source, puzzle.id) ? /** @type {Record<string, unknown>} */ (source)[puzzle.id] : undefined;
    if (typeof seed === 'string' && seed.length >= 1 && seed.length <= 200) {
      seeds[puzzle.id] = seed;
    }
  }
  return seeds;
}

/**
 * @param {unknown} value
 * @returns {string[]}
 */
function readKeys(value) {
  if (!Array.isArray(value) || value.length > BUDGETS.historyKeys) {
    return [];
  }
  return value.every((k) => typeof k === 'string' && k.length > 0 && k.length <= MAX_KEY_LENGTH) ? [...value] : [];
}

/**
 * Makes a stored set the current set again, with its board (set history navigation).
 * @param {GeneratorState} state
 * @param {SavedSet} saved
 * @returns {GeneratorState | null} null when the stored packs no longer validate.
 */
export function useSavedSet(state, saved) {
  const read = readSavedSet(saved);
  if (read === null) {
    return null;
  }
  return withBoard({ ...state, ...freshSetExtras(), ...read }, read.set.board);
}

// Persistence (design §9.6, §10.6).

/**
 * Storage shape `pentomino:v1:gen:state`. Timers, jobs, workers and the unvalidated candidates
 * never appear; Large boards lives only in prefs.
 * @param {GeneratorState} state
 * @returns {Record<string, unknown>}
 */
export function serializeState(state) {
  const saved = savedSetOf(state);
  return {
    v: STORAGE_VERSION,
    boardRows: boardToRows(state.board),
    rotation: state.rotation,
    presetId: state.presetId,
    levelId: state.levelId,
    seedText: state.seedText,
    keepSeed: state.keepSeed,
    uniqueness: state.uniqueness,
    setSeed: saved?.setSeed ?? null,
    batchIndex: saved?.batchIndex ?? 0,
    setPack: saved?.setPack ?? null,
    calibrationPack: saved?.calibrationPack ?? null,
    batchPack: saved?.batchPack ?? null,
    puzzleSeeds: saved?.puzzleSeeds ?? {},
    history: saved?.history ?? { layouts: [], clues: [] },
    setsByBoard: Object.fromEntries(Object.entries(state.setsByBoard).map(([key, sets]) => [key, sets.slice(0, MAX_SAVED_SETS)])),
    ...(saved?.calibrationFor ? { calibrationFor: saved.calibrationFor } : {}),
  };
}

/**
 * Restores state from a stored value through the validators. Invalid parts fall back to the
 * defaults individually; nothing here throws.
 * @param {unknown} stored
 * @param {Partial<GeneratorState>} [base] Preferences and other non-stored fields.
 * @returns {GeneratorState}
 */
export function restoreState(stored, base = {}) {
  const state = defaultGeneratorState(base);
  if (typeof stored !== 'object' || stored === null || /** @type {any} */ (stored).v !== STORAGE_VERSION) {
    return state;
  }
  const dto = /** @type {Record<string, any>} */ (stored);
  try {
    const board = boardFromRows(dto.boardRows);
    if (board.width >= MIN_EDIT_SIDE && board.height >= MIN_EDIT_SIDE && board.width <= MAX_SIDE && board.height <= MAX_SIDE) {
      state.board = board;
    }
  } catch {
    // Keep the default board.
  }
  if (Number.isInteger(dto.rotation) && dto.rotation >= 0 && dto.rotation < 360 && dto.rotation % 45 === 0) {
    state.rotation = dto.rotation;
  }
  if (PRESET_IDS.includes(dto.presetId)) {
    state.presetId = dto.presetId;
  }
  if (LISTED_LEVEL_IDS.includes(dto.levelId)) {
    state.levelId = dto.levelId;
  }
  if (typeof dto.seedText === 'string' && dto.seedText.length <= 256) {
    state.seedText = dto.seedText;
  }
  state.keepSeed = dto.keepSeed === true;
  state.uniqueness = dto.uniqueness === 'require' ? 'require' : 'any';
  /** @type {Record<string, SavedSet[]>} */
  const byBoard = {};
  /** @param {unknown} item */
  const keep = (item) => {
    const read = readSavedSet(item);
    if (read === null) {
      return;
    }
    // The board of the stored set decides where it goes; a stored key is never trusted.
    const key = boardKey(read.set.board);
    byBoard[key] ??= [];
    if (byBoard[key].length < MAX_SAVED_SETS) {
      byBoard[key].push(/** @type {SavedSet} */ (item));
    }
  };
  const savedLists = dto.setsByBoard;
  if (typeof savedLists === 'object' && savedLists !== null && !Array.isArray(savedLists)) {
    for (const sets of Object.values(savedLists)) {
      if (Array.isArray(sets)) {
        sets.forEach(keep);
      }
    }
  }
  if (Array.isArray(dto.setHistory)) {
    // Older storage: one list of every saved set, whatever its board.
    dto.setHistory.forEach(keep);
  }
  state.setsByBoard = Object.fromEntries(Object.entries(byBoard).slice(-MAX_SAVED_BOARDS));
  const current = readSavedSet(dto);
  if (current !== null) {
    Object.assign(state, current);
  }
  return fitSet(state);
}

/**
 * @typedef {object} StorageLike
 * @property {() => unknown} getGeneratorState
 * @property {(snapshot: unknown) => { ok: boolean }} setGeneratorState
 * @property {() => Record<string, boolean>} getPrefs
 * @property {(partial: Record<string, boolean>) => { ok: boolean }} setPrefs
 */

/**
 * Initial state: preferences are read first. The generator no longer offers the Large boards opt-in, so a stored
 * `largeBoards` (in prefs or, legacy, in gen:state) is ignored and the normal board limit applies.
 * @param {StorageLike} storage
 * @returns {GeneratorState}
 */
export function loadGeneratorState(storage) {
  /** @type {Record<string, boolean>} */
  let prefs = {};
  /** @type {unknown} */
  let stored = null;
  try {
    prefs = storage.getPrefs();
  } catch {
    prefs = {};
  }
  try {
    stored = storage.getGeneratorState();
  } catch {
    stored = null;
  }
  return restoreState(stored, {
    largeBoards: false,
    prefs: {
      labels: prefs.labels ?? DEFAULT_VIEW_PREFS.labels,
      patterns: prefs.patterns ?? DEFAULT_VIEW_PREFS.patterns,
      timer: prefs.timer ?? DEFAULT_VIEW_PREFS.timer,
      straighten: prefs.straighten ?? DEFAULT_VIEW_PREFS.straighten,
    },
  });
}

/** @type {ReadonlyArray<keyof GeneratorState>} */
const PERSISTED_KEYS = Object.freeze([
  'board', 'rotation', 'presetId', 'levelId', 'seedText', 'keepSeed', 'uniqueness', 'setSeed', 'batchIndex',
  'set', 'calibration', 'calibrationFor', 'puzzles', 'seenLayouts', 'seenClues', 'setsByBoard',
]);
/** @type {ReadonlyArray<keyof GeneratorState>} */
const PREF_STATE_KEYS = Object.freeze(['prefs', 'largeBoards']);

/**
 * Debounced saving of the committed state. Failures never throw: a full or denied storage is
 * reported once through `onFailure` while editing continues.
 * @param {GeneratorStore} store
 * @param {StorageLike} storage
 * @param {{ delayMs?: number, onFailure?: (failure: unknown) => void,
 *   setTimer?: (fn: () => void, ms: number) => unknown, clearTimer?: (handle: any) => void }} [o]
 */
export function createPersistence(store, storage, o = {}) {
  const delayMs = o.delayMs ?? PERSIST_DELAY_MS;
  const setTimer = o.setTimer ?? ((fn, ms) => globalThis.setTimeout(fn, ms));
  const clearTimer = o.clearTimer ?? ((handle) => globalThis.clearTimeout(handle));
  /** @type {unknown} */
  let timer = null;
  let dirtyState = false;
  let dirtyPrefs = false;

  function write() {
    timer = null;
    const state = store.getState();
    if (dirtyPrefs) {
      dirtyPrefs = false;
      attempt(() => storage.setPrefs({ ...state.prefs, largeBoards: state.largeBoards }));
    }
    if (dirtyState) {
      dirtyState = false;
      const full = serializeState(state);
      // A full storage drops the optional parts first: the oldest sets of every board a few at a time, then the visible batch.
      const lists = /** @type {Record<string, unknown[]>} */ (full.setsByBoard);
      const longest = Math.max(0, ...Object.values(lists).map((list) => list.length));
      const snapshots = [full];
      for (let kept = Math.floor(longest / 2); kept > 0; kept = Math.floor(kept / 2)) {
        snapshots.push({ ...full, setsByBoard: Object.fromEntries(Object.entries(lists).map(([key, list]) => [key, list.slice(0, kept)])) });
      }
      const reduced = { ...full, setsByBoard: {} };
      snapshots.push(reduced, { ...reduced, batchPack: null });
      for (const snapshot of snapshots) {
        if (attempt(() => storage.setGeneratorState(snapshot))) {
          return;
        }
      }
    }
  }

  /**
   * @param {() => { ok: boolean }} fn
   * @returns {boolean}
   */
  function attempt(fn) {
    try {
      const result = fn();
      if (result.ok === false) {
        o.onFailure?.(result);
        return false;
      }
      return true;
    } catch (error) {
      o.onFailure?.(error);
      return false;
    }
  }

  const unsubscribe = store.subscribe((state, previous) => {
    const changedState = PERSISTED_KEYS.some((key) => !Object.is(state[key], previous[key]));
    const changedPrefs = PREF_STATE_KEYS.some((key) => !Object.is(state[key], previous[key]));
    if (!changedState && !changedPrefs) {
      return;
    }
    dirtyState = dirtyState || changedState;
    dirtyPrefs = dirtyPrefs || changedPrefs;
    if (timer !== null) {
      clearTimer(timer);
    }
    timer = setTimer(write, delayMs);
  });

  return {
    /** Writes any pending change now (page hide, navigation). */
    flush() {
      if (timer !== null) {
        clearTimer(timer);
        write();
      }
    },
    /** Writes the full current state now, pending change or not (before a same-tab hand-off). */
    saveNow() {
      if (timer !== null) {
        clearTimer(timer);
      }
      dirtyState = true;
      write();
    },
    destroy() {
      unsubscribe();
      if (timer !== null) {
        clearTimer(timer);
        write();
      }
    },
  };
}

// Jobs, results and imports (design §6.9, §9.4, §10.4–§10.6). Pure helpers: the controller applies them.

export const MAX_PACK_PUZZLES = 100;
export const MAX_QUANTITY = 10;
export const MIN_GENERATION_PIECES = 3;
export const MAX_PACK_BYTES = 512 * 1024;

/**
 * @param {unknown} value
 * @returns {number} A whole quantity from 1 to 10; unreadable input gives the default.
 */
export function clampQuantity(value) {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) ? Math.max(1, Math.min(MAX_QUANTITY, n)) : DEFAULT_QUANTITY;
}

/**
 * @param {GeneratorState} state
 * @returns {string} The level the set was calibrated for, else the selected level.
 */
export function readyLevelId(state) {
  return state.calibration !== null && state.calibrationFor !== null ? state.calibrationFor.levelId : state.levelId;
}

/**
 * @param {GeneratorState} state
 * @returns {string} Level of the next puzzle request: the puzzle row's own choice or the set's level.
 */
export function batchLevelOf(state) {
  return state.batchLevelId ?? readyLevelId(state);
}

/**
 * @param {PieceSet} set
 * @returns {{ pieces: number, sizeMin: number, sizeMax: number }}
 */
export function describeSet(set) {
  const sizes = set.pieces.map((p) => p.cells.length);
  return { pieces: sizes.length, sizeMin: Math.min(...sizes), sizeMax: Math.max(...sizes) };
}

/**
 * @param {{ code: string, message: string }} issue
 * @param {number} area
 * @param {number} cap
 * @returns {string}
 */
function boardIssueText(issue, area, cap) {
  switch (issue.code) {
    case 'board-too-few-cells':
      return formatNotice('N-SMALL');
    case 'board-too-many-cells':
      return formatNotice('N-CAP', { area, max: cap });
    case 'board-disconnected': {
      const regions = /(\d+) separate regions/.exec(issue.message)?.[1];
      return regions === undefined ? issue.message : t('board.issue.disconnected', { count: regions });
    }
    default:
      return issue.message;
  }
}

/**
 * Why a set cannot start New Puzzles / Add more, or null. A set that is outside the generator's
 * operating limits stays viewable, exportable and playable.
 * @param {GeneratorState} state
 * @param {{ phone: boolean }} hardware
 * @returns {string | null}
 */
export function generationBlock(state, hardware) {
  const set = state.set;
  if (set === null) {
    return formatMessage('M-NEEDS-SET');
  }
  if (set.pieces.length < MIN_GENERATION_PIECES) {
    return formatMessage('M-FEWPIECES');
  }
  if (set.witness === null) {
    return formatMessage('M-NOWITNESS');
  }
  const area = activeCount(set.board);
  const cap = capFor(state, hardware);
  const { errors } = validateForGeneration(set.board, cap);
  if (errors.length > 0) {
    return boardIssueText(errors[0], area, cap);
  }
  const levelId = batchLevelOf(state);
  if (!offeredLevels(area).some((l) => l.id === levelId)) {
    return formatMessage('M-LEVEL-NOT-OFFERED', { level: LISTED_LEVEL_IDS.includes(levelId) ? levelLabel(levelId) : levelId, area });
  }
  return null;
}

/**
 * @param {GeneratorState} state
 * @returns {number} How many more puzzles the seen-history can take.
 */
export function historyRoom(state) {
  return Math.max(0, BUDGETS.historyKeys - Math.max(state.seenLayouts.length, state.seenClues.length));
}

/**
 * Titles follow the visible position ("Hard #3"); other titles stay as they are. IDs never change.
 * @param {readonly Puzzle[]} puzzles
 * @returns {Puzzle[]}
 */
export function renumberTitles(puzzles) {
  return puzzles.map((puzzle, i) => {
    const match = typeof puzzle.title === 'string' ? /^(.*) #\d+$/.exec(puzzle.title) : null;
    if (match === null || puzzle.title === `${match[1]} #${i + 1}`) {
      return puzzle;
    }
    return { ...puzzle, title: `${match[1]} #${i + 1}` };
  });
}

/**
 * @param {GeneratorState} state
 * @param {readonly Puzzle[]} puzzles
 * @param {string} createdAt
 * @returns {Record<string, unknown>}
 */
export function generationOf(state, puzzles, createdAt) {
  const set = /** @type {PieceSet} */ (state.set);
  /** @type {Record<string, unknown>} */
  const generation = {
    app: `pentomino-generator/${APP_VERSION}`,
    algo: ALGO_ID,
    policy: POLICY_ID,
    rng: RNG_ID,
    seedScheme: SEED_SCHEME,
  };
  if (state.setSeed !== null) {
    generation.setSeed = state.setSeed;
  }
  if (state.calibrationFor !== null && state.calibration !== null) {
    generation.setLevel = state.calibrationFor.levelId;
  }
  generation.carving = set.carving;
  if (set.carving === 'macro' && set.macroRegion !== null) {
    generation.macroRegion = set.macroRegion.slice();
  }
  if (state.batchIndex >= 1 && state.setSeed !== null) {
    const lastPuzzle = puzzles[puzzles.length - 1];
    generation.batchSeed = (lastPuzzle === undefined ? undefined : state.puzzleSeeds[lastPuzzle.id]) ?? batchSeedFor(state.setSeed, state.batchIndex);
    generation.batchLevel = puzzles[0]?.rating?.level ?? batchLevelOf(state);
    generation.batchIndex = state.batchIndex;
  }
  generation.uniqueness = state.calibrationFor?.uniqueness ?? state.uniqueness;
  generation.createdAt = createdAt;
  return generation;
}

/**
 * A pack of the current set with the given puzzles (default: the visible ones).
 * @param {GeneratorState} state
 * @param {readonly Puzzle[]} [puzzles]
 * @param {string} [createdAt]
 * @returns {Pack}
 */
export function buildPack(state, puzzles = state.puzzles, createdAt = new Date().toISOString()) {
  const set = state.set;
  if (set === null) {
    throw new RangeError('there is no piece set');
  }
  return createPack({
    board: set.board,
    rotation: state.rotation,
    pieces: set.pieces,
    witness: set.witness,
    puzzles: /** @type {Puzzle[]} */ (puzzles),
    generation: generationOf(state, puzzles, createdAt),
  });
}

/** @type {{ puzzles: readonly Puzzle[], set: PieceSet, rotation: number, setSeed: string | null, batchIndex: number, pack: Pack } | null} */
let visibleCache = null;

/**
 * The pack of everything visible. The same object is returned until its content changes, so
 * link encodings can be cached and compared by identity.
 * @param {GeneratorState} state
 * @returns {Pack | null} null without a set or puzzles.
 */
export function visiblePack(state) {
  if (state.set === null || state.puzzles.length === 0) {
    return null;
  }
  const hit = visibleCache;
  if (hit !== null && hit.puzzles === state.puzzles && hit.set === state.set && hit.rotation === state.rotation
    && hit.setSeed === state.setSeed && hit.batchIndex === state.batchIndex) {
    return hit.pack;
  }
  const pack = buildPack(state);
  visibleCache = { puzzles: state.puzzles, set: state.set, rotation: state.rotation, setSeed: state.setSeed, batchIndex: state.batchIndex, pack };
  return pack;
}

/**
 * @param {GeneratorState} state
 * @param {readonly Puzzle[]} puzzles
 * @returns {boolean} Whether a pack of these puzzles still fits the 512 KiB file limit.
 */
export function packFits(state, puzzles) {
  try {
    serializePack(buildPack(state, puzzles));
    return true;
  } catch (error) {
    if (error instanceof PackError && error.code === 'pack-too-large') {
      return false;
    }
    throw error;
  }
}

/**
 * @param {GeneratorState} state
 * @param {StatusNotice | null} notice
 * @returns {GeneratorState}
 */
export function withNotice(state, notice) {
  return { ...state, notice };
}

/**
 * @param {readonly string[]} known
 * @param {readonly string[]} added
 * @returns {string[]} Union keeping the newest keys.
 */
export function mergeSeenKeys(known, added) {
  return mergeKeys(known, added);
}

/**
 * Adds the keys of an accepted puzzle to the history at once, so a restore that happens mid-batch
 * never forgets a visible puzzle.
 * @param {GeneratorState} state
 * @param {Puzzle} puzzle
 * @returns {GeneratorState}
 */
export function addSeenKeys(state, puzzle) {
  const set = state.set;
  if (set === null) {
    return state;
  }
  try {
    const layouts = puzzle.solution === null ? [] : [layoutKey(set.board, set.pieces, puzzle.solution)];
    return {
      ...state,
      seenLayouts: mergeKeys(state.seenLayouts, layouts),
      seenClues: mergeKeys(state.seenClues, [clueKey(set.board, set.pieces, puzzle.clues)]),
    };
  } catch {
    // The final result of the request carries the authoritative keys.
    return state;
  }
}

/**
 * @param {GeneratorState} state
 * @returns {GeneratorState} The history is emptied; the batch counter is not rewound.
 */
export function resetHistory(state) {
  return { ...state, seenLayouts: [], seenClues: [], notice: null };
}

/**
 * Stores a lazy certificate on its puzzle. Packs keep it; the card shows it as verified.
 * @param {GeneratorState} state
 * @param {string} puzzleId
 * @param {import('../core/engine/types.js').Certificate} certificate
 * @returns {GeneratorState}
 */
export function applyCertificate(state, puzzleId, certificate) {
  /** @param {readonly Puzzle[]} list */
  const swap = (list) => (list.some((p) => p.id === puzzleId) ? list.map((p) => (p.id === puzzleId ? { ...p, certificate } : p)) : list);
  const puzzles = swap(state.puzzles);
  return {
    ...state,
    puzzles: /** @type {Puzzle[]} */ (puzzles),
    parked: state.parked.map(swap),
    checking: state.checking.filter((id) => id !== puzzleId),
  };
}

/**
 * Removing a card never touches the seen-history.
 * @param {GeneratorState} state
 * @param {string} puzzleId
 * @returns {GeneratorState}
 */
export function removePuzzle(state, puzzleId) {
  if (!state.puzzles.some((p) => p.id === puzzleId)) {
    return state;
  }
  return {
    ...state,
    puzzles: renumberTitles(state.puzzles.filter((p) => p.id !== puzzleId)),
    checking: state.checking.filter((id) => id !== puzzleId),
  };
}

/**
 * Remove all: every puzzle of the list goes, with the earlier packs and the cards' extras. The seen-history stays, like
 * when a single card is removed, so new puzzles never repeat a removed one.
 * @param {GeneratorState} state
 * @returns {GeneratorState}
 */
export function removeAllPuzzles(state) {
  if (state.puzzles.length === 0 && state.parked.length === 0) {
    return state;
  }
  return { ...state, puzzles: [], parked: [], checking: [], claimedIds: [], puzzleSeeds: {}, verification: {}, notice: null };
}

/**
 * Steps through the piece sets of the board made in step 1 (newest first). The rotation of the chosen set comes with it.
 * @param {GeneratorState} state
 * @param {number} position Index in the newest-first list of the sets of the board (`setView`).
 * @returns {GeneratorState | null} null when the position does not exist or the stored set no longer validates.
 */
export function gotoSet(state, position) {
  const current = savedSetOf(state);
  if (current === null || !Number.isInteger(position) || position < 0) {
    return null;
  }
  const view = setView(state);
  if (position === view.index) {
    return state;
  }
  // The set on show joins the saved sets of its own board, so nothing is lost when it leaves the screen.
  const ownKey = boardKey(/** @type {PieceSet} */ (state.set).board);
  const joined = withSets(state.setsByBoard, ownKey, insertAt(savedFor(state, ownKey), state.setPosition, current));
  const timeline = Object.hasOwn(joined, view.key) ? joined[view.key] : [];
  if (position >= timeline.length) {
    return null;
  }
  const target = timeline[position];
  const read = readSavedSet(target);
  if (read === null) {
    return null;
  }
  const rotation = /** @type {{ presentation?: { rotation?: number } }} */ (target.setPack).presentation?.rotation ?? 0;
  return withBoard({
    ...state,
    ...freshSetExtras(),
    ...read,
    setsByBoard: withSets(joined, view.key, timeline.filter((_, i) => i !== position)),
    setPosition: position,
  }, read.set.board, rotation);
}

/**
 * The list of piece sets: the sets of the board made in step 1, `setsByBoard[boardKey(state.board)]`.
 * @param {GeneratorState} state
 * @returns {{ key: string, index: number, total: number }} `key` of the board of step 1; `index` where the set on show
 *   sits in its list, newest first (-1 when that set was made for another board); `total` sets in the list.
 */
export function setView(state) {
  const key = boardKey(state.board);
  const saved = savedFor(state, key);
  const fits = state.set !== null && boardKey(state.set.board) === key;
  return {
    key,
    index: fits ? Math.min(Math.max(0, state.setPosition), saved.length) : -1,
    total: saved.length + (fits ? 1 : 0),
  };
}

/**
 * @param {GeneratorState} state
 * @returns {number} Number of sets in the list of the board (the set on show included while it fits the board); 0 without a set.
 */
export function setTimelineLength(state) {
  return state.set === null ? 0 : setView(state).total;
}

/**
 * @param {GeneratorState} state
 * @returns {{ index: number, total: number }} Where the set on show sits in the list of the board, newest first
 *   (`index` -1 when it was made for another board), and the size of that list.
 */
export function setViewPosition(state) {
  const { index, total } = setView(state);
  return { index, total };
}

/**
 * @param {GeneratorState} state
 * @returns {{ n: number | null, total: number }} The number shown as "Set n/total": sets are numbered oldest first, so the
 *   newest set is "Set total/total". `n` is null while the set on show was made for another board.
 */
export function setNumber(state) {
  const { index, total } = setViewPosition(state);
  return { n: index === -1 ? null : total - index, total };
}

/**
 * Shows the set of the board in step 1 that was made with a seed.
 * @param {GeneratorState} state
 * @param {string} seed
 * @returns {GeneratorState | null} null when no set of this board has that seed.
 */
export function showSetBySeed(state, seed) {
  const { key, index } = setView(state);
  if (state.set !== null && state.setSeed === seed && index !== -1) {
    return state;
  }
  const at = savedFor(state, key).findIndex((saved) => saved.setSeed === seed);
  // The set on show sits inside the list at `index`, so saved sets from there on are one place further.
  return at === -1 ? null : gotoSet(state, index !== -1 && at >= index ? at + 1 : at);
}

/**
 * @param {GeneratorState} state
 * @returns {boolean} Whether the set list is full: a new set needs a set removed first.
 */
export function setsFull(state) {
  return setTimelineLength(state) >= MAX_SETS;
}

/**
 * Identity of a piece set: the board's rows plus the shape of every piece (a shape counts the same turned or
 * flipped, and piece names and the order do not matter). Two sets with the same key give the same puzzles.
 * @param {Board} board
 * @param {readonly { cells: XY[] }[]} pieces
 * @returns {string}
 */
export function setKey(board, pieces) {
  return `${boardToRows(board).join('/')}|${pieces.map((p) => canonicalKey(p.cells)).sort().join('|')}`;
}

/**
 * Whether a new set repeats one already in the list of its board.
 * @param {GeneratorState} state
 * @param {PieceSet} set The set that was just generated.
 * @returns {number | null} Its number in the list (oldest first, as "Set n of total" shows), or null when it is new.
 */
export function duplicateSetNumber(state, set) {
  const current = savedSetOf(state);
  if (current === null) {
    return null;
  }
  const key = setKey(set.board, set.pieces);
  const boardId = boardKey(set.board);
  // Newest first: the set on show sits at `setPosition` of the list of its own board, the others keep their order around it.
  const saved = savedFor(state, boardId);
  const timeline = boardKey(/** @type {PieceSet} */ (state.set).board) === boardId ? insertAt(saved, state.setPosition, current) : saved;
  for (let i = 0; i < timeline.length; i += 1) {
    try {
      const pack = timeline[i].setPack;
      if (setKey(packBoard(pack), pack.pieces) === key) {
        return timeline.length - i;
      }
    } catch {
      // A stored set that cannot be read never counts as a repeat.
    }
  }
  return null;
}

/**
 * @param {GeneratorState} state
 * @param {Readonly<Record<string, readonly SavedSet[]>>} setsByBoard
 * @returns {GeneratorState} No set on show; the given sets stay saved.
 */
function withoutSet(state, setsByBoard) {
  return {
    ...state,
    ...freshSetExtras(),
    set: null,
    calibration: null,
    calibrationFor: null,
    calibrationTrusted: false,
    setSeed: null,
    batchIndex: 0,
    puzzles: [],
    seenLayouts: [],
    seenClues: [],
    setsByBoard,
  };
}

/**
 * Remove all sets: every set of the board in the list goes with its puzzles, the set on show included. The sets of other
 * boards stay saved; the board and the settings stay.
 * @param {GeneratorState} state
 * @returns {GeneratorState}
 */
export function removeAllSets(state) {
  return withoutSet(state, withSets(state.setsByBoard, boardKey(state.board), []));
}

/**
 * Remove set: the set on show and its puzzles go. The neighbour made for the same board takes its place, the next older
 * one first, else the next newer one, with its rotation (as when stepping); stored sets that no longer validate are
 * dropped on the way. Without another set of that board this leaves no set; the sets of other boards stay saved.
 * @param {GeneratorState} state
 * @returns {GeneratorState}
 */
export function removeCurrentSet(state) {
  if (state.set === null) {
    return state;
  }
  const ownKey = boardKey(state.set.board);
  // The saved list has no set on show, so the next older set now sits at `setPosition`.
  const rest = savedFor(state, ownKey);
  const from = Math.min(Math.max(0, state.setPosition), rest.length);
  const order = [
    ...Array.from({ length: rest.length - from }, (_, i) => from + i),
    ...Array.from({ length: from }, (_, i) => from - 1 - i),
  ];
  /** @type {Set<number>} */
  const dropped = new Set();
  for (const index of order) {
    const read = readSavedSet(rest[index]);
    if (read === null) {
      dropped.add(index);
      continue;
    }
    const rotation = /** @type {{ presentation?: { rotation?: number } }} */ (rest[index].setPack).presentation?.rotation ?? 0;
    let position = index;
    for (const gone of dropped) {
      position -= gone < index ? 1 : 0;
    }
    return withBoard({
      ...state,
      ...freshSetExtras(),
      ...read,
      setsByBoard: withSets(state.setsByBoard, ownKey, rest.filter((_, i) => i !== index && !dropped.has(i))),
      setPosition: position,
    }, state.board, rotation);
  }
  return withoutSet(state, withSets(state.setsByBoard, ownKey, rest.filter((_, i) => !dropped.has(i))));
}

/**
 * @param {Pack} pack
 * @returns {{ layout: import('../core/engine/types.js').Pose[], source: 'witness' | 'puzzle' } | null}
 *   The validated arrangement an imported set can start from.
 */
export function referenceOf(pack) {
  if (Array.isArray(pack.witness)) {
    return { layout: pack.witness, source: 'witness' };
  }
  for (const puzzle of pack.puzzles) {
    if (Array.isArray(puzzle.solution)) {
      return { layout: puzzle.solution, source: 'puzzle' };
    }
  }
  return null;
}

/**
 * Reusable macro-region provenance of an imported pack: only this generator's own algorithm,
 * one integer group id per piece. Anything else is ignored and the set uses flat re-tiling.
 * @param {Pack} pack
 * @returns {{ carving: PieceSet['carving'], macroRegion: number[] | null }}
 */
export function carvingHint(pack) {
  const generation = /** @type {Record<string, unknown> | undefined} */ (pack.generation);
  const k = pack.pieces.length;
  if (typeof generation === 'object' && generation !== null && generation.algo === ALGO_ID) {
    const region = generation.macroRegion;
    if (generation.carving === 'macro' && Array.isArray(region) && region.length === k
      && region.every((n) => Number.isSafeInteger(n) && n >= 0 && n < k)) {
      return { carving: 'macro', macroRegion: /** @type {number[]} */ (region).slice() };
    }
    if (generation.carving === 'flat') {
      return { carving: 'flat', macroRegion: null };
    }
  }
  return { carving: 'imported', macroRegion: null };
}

/**
 * Makes an imported (already validated) pack the current set and visible batch. Ratings and
 * certificates stay claims, no calibration is kept, and the seen-history only contains the
 * puzzles that came with the file.
 * @param {GeneratorState} state
 * @param {Pack} pack
 * @param {import('../core/engine/types.js').Pose[] | null} reference Arrangement found for the set; null when none.
 * @param {() => string} [random]
 * @returns {{ state: GeneratorState, restoredSeed: boolean, restoredIndex: boolean, hint: PieceSet['carving'] }}
 */
export function importPackState(state, pack, reference, random = randomSeedText) {
  const board = packBoard(pack);
  const rotation = pack.presentation?.rotation ?? 0;
  const generation = /** @type {Record<string, unknown>} */ (typeof pack.generation === 'object' && pack.generation !== null ? pack.generation : {});
  const foreignSeed = generation.seedScheme !== undefined && generation.seedScheme !== SEED_SCHEME;
  const fileSeed = !foreignSeed && typeof generation.setSeed === 'string' ? validSeed(generation.setSeed) : null;
  const setSeed = fileSeed ?? validSeed(random()) ?? randomSeedText();
  const index = generation.batchIndex;
  const restoredIndex = Number.isSafeInteger(index) && /** @type {number} */ (index) >= 0;
  const hint = carvingHint(pack);
  /** @type {PieceSet} */
  const set = { board, pieces: pack.pieces, witness: reference, carving: hint.carving, macroRegion: hint.macroRegion };
  const puzzles = puzzlesFromPack(pack);
  const accepted = acceptSet(state, { set, calibration: null, setSeed });
  /** @type {Record<string, string>} */
  const verification = {};
  const layouts = [];
  const clues = [];
  for (const puzzle of puzzles) {
    verification[puzzle.id] = puzzle.solution === null ? 'checking' : 'solvable';
    if (puzzle.solution !== null) {
      layouts.push(layoutKey(board, pack.pieces, puzzle.solution));
    }
    clues.push(clueKey(board, pack.pieces, puzzle.clues));
  }
  const next = withBoard({
    ...accepted,
    batchIndex: restoredIndex ? /** @type {number} */ (index) : 0,
    puzzles,
    claimedIds: puzzles.map((p) => p.id),
    verification,
    seenLayouts: mergeKeys([], layouts),
    seenClues: mergeKeys([], clues),
  }, board, rotation);
  return { state: next, restoredSeed: fileSeed !== null, restoredIndex, hint: hint.carving };
}
