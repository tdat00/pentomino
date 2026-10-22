// @ts-check
// Generator state: the observable store, device classification, board edit transitions,
// seed and batch bookkeeping, derived board/level descriptions and safe persistence
// (design §6.2, §8.6, §10.1–§10.7). Pure: nothing here touches the DOM, and all limits,
// ranges and level tables come from the engine modules.
import {
  MAX_SIDE, activeCount, boardFromRows, boardToRows, rectangle, trimMargins, validateForGeneration,
} from '../core/engine/board.js';
import { level, offeredLevels } from '../core/engine/levels.js';
import { createPack, packBoard, validatePack } from '../core/engine/pack.js';
import { BUDGETS, LIMITS, enabledMaxActive, pieceCountRange, sizeWindow } from '../core/engine/policy.js';
import { QUALIFICATION } from '../core/engine/qualification.js';
import { batchSeedFor, normalizeSeedText, randomSeedText } from '../core/engine/rng.js';
import { formatNotice } from './strings.js';

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
 */

/**
 * @typedef {object} GeneratorState
 * @property {Board} board Editor board; `set.board` keeps the board a set was made for.
 * @property {number} rotation Display angle, counter-clockwise, multiple of 45.
 * @property {boolean} editUnrotated
 * @property {string} levelId
 * @property {string} seedText
 * @property {boolean} keepSeed
 * @property {'any' | 'require'} uniqueness
 * @property {boolean} largeBoards Mirror of the stored preference; never written to gen:state.
 * @property {boolean} omitSolutions
 * @property {string | null} setSeed
 * @property {number} batchIndex
 * @property {PieceSet | null} set
 * @property {Puzzle | null} calibration
 * @property {{ levelId: string, uniqueness: 'any' | 'require' } | null} calibrationFor Settings the calibration was made for; null = unknown.
 * @property {Puzzle[]} puzzles
 * @property {string[]} seenLayouts
 * @property {string[]} seenClues
 * @property {readonly SavedSet[]} setHistory
 * @property {boolean} stale
 * @property {null | { requestId: number, revision: string, stage: string, startedAt: number }} job
 * @property {{ labels: boolean, patterns: boolean, timer: boolean, straighten: boolean }} prefs
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
export const MAX_SAVED_SETS = 5;
export const PERSIST_DELAY_MS = 300;
export const STORAGE_VERSION = 1;
export const DEFAULT_QUANTITY = 5;
export const DEFAULT_LEVEL_ID = 'normal';
/** Levels the generator can ever offer (areas up to 676): Very easy … Hell-3. */
export const LISTED_LEVEL_IDS = Object.freeze(['very-easy', 'easy', 'normal', 'hard', 'expert', 'master', 'nightmare', 'hell-1', 'hell-2', 'hell-3']);
const FIRST_HELL_INDEX = 7;
const UNIQUE_STANDARD_AREA = 200;
const MAX_KEY_LENGTH = 8192;

/** @type {GeneratorState['prefs']} */
const DEFAULT_VIEW_PREFS = Object.freeze({ labels: true, patterns: true, timer: true, straighten: false });

/**
 * @param {Partial<GeneratorState>} [overrides]
 * @returns {GeneratorState}
 */
export function defaultGeneratorState(overrides = {}) {
  return {
    board: rectangle(DEFAULT_COLS, DEFAULT_ROWS),
    rotation: 0,
    editUnrotated: false,
    levelId: DEFAULT_LEVEL_ID,
    seedText: '',
    keepSeed: false,
    uniqueness: 'any',
    largeBoards: false,
    omitSolutions: false,
    setSeed: null,
    batchIndex: 0,
    set: null,
    calibration: null,
    calibrationFor: null,
    puzzles: [],
    seenLayouts: [],
    seenClues: [],
    setHistory: [],
    stale: false,
    job: null,
    prefs: { ...DEFAULT_VIEW_PREFS },
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
 * @returns {boolean} Whether any cell is blocked.
 */
export function hasBlockedCells(board) {
  return board.active.includes(0);
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
 * The state after a structural board edit: marks a set stale when its board differs from the
 * editor board and moves an unavailable level to the nearest offered one.
 * @param {GeneratorState} state
 * @param {Board} board
 * @param {number} [rotation]
 * @returns {GeneratorState}
 */
export function withBoard(state, board, rotation = state.rotation) {
  const stale = state.set !== null && !boardsEqual(state.set.board, board);
  const levelId = nearestOfferedLevel(state.levelId, activeCount(board)) ?? state.levelId;
  if (board === state.board && rotation === state.rotation && stale === state.stale && levelId === state.levelId) {
    return state;
  }
  return { ...state, board, rotation, stale, levelId };
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
 * @returns {boolean} Whether editing now should ask for confirmation (first edit after a set exists).
 */
export function needsStaleConfirm(state) {
  return state.set !== null && !state.stale;
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
 * The dice button: a fresh random seed now; Keep seed is unchanged.
 * @param {GeneratorState} state
 * @param {() => string} [random]
 * @returns {GeneratorState}
 */
export function rollSeed(state, random = randomSeedText) {
  return { ...state, seedText: random() };
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
 * A newly accepted set starts at batch 0 with empty history, even when regenerated with the
 * same seed; the previous committed set moves into the (at most 5) set history.
 * @param {GeneratorState} state
 * @param {{ set: PieceSet, calibration: Puzzle | null, setSeed: string, calibrationFor?: GeneratorState['calibrationFor'] }} accepted
 * @returns {GeneratorState}
 */
export function acceptSet(state, accepted) {
  const previous = savedSetOf(state);
  const setHistory = previous === null ? state.setHistory : [previous, ...state.setHistory].slice(0, MAX_SAVED_SETS);
  const stale = !boardsEqual(accepted.set.board, state.board);
  return {
    ...state,
    set: accepted.set,
    calibration: accepted.calibration,
    calibrationFor: accepted.calibration === null ? null : accepted.calibrationFor ?? { levelId: state.levelId, uniqueness: state.uniqueness },
    setSeed: accepted.setSeed,
    batchIndex: 0,
    puzzles: [],
    seenLayouts: [],
    seenClues: [],
    setHistory,
    stale,
  };
}

/**
 * Every New Puzzles / Add more request increments the set's batch index, whatever its outcome,
 * and uses `setSeed#batchIndex`.
 * @param {GeneratorState} state
 * @returns {{ state: GeneratorState, batchSeed: string, batchIndex: number } | null} null without a set.
 */
export function nextBatch(state) {
  if (state.set === null || state.setSeed === null) {
    return null;
  }
  const batchIndex = state.batchIndex + 1;
  return { state: { ...state, batchIndex }, batchSeed: batchSeedFor(state.setSeed, batchIndex), batchIndex };
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
    return { id, label: lv.label, offered: isOffered, reason: isOffered ? null : area < lv.areas[0] ? 'larger' : 'smaller' };
  });
}

/**
 * Piece counts, piece sizes and pre-placed share for a level on a board, from the policy APIs.
 * @param {string} levelId
 * @param {number} area
 * @returns {{ kmin: number, kmax: number, sizeMin: number, sizeMax: number, share: number } | null} null when not offered.
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
  return {
    kmin: counts[0], kmax: counts[counts.length - 1], sizeMin, sizeMax, share: Math.round(level(levelId).share * 100),
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
 * @property {string} statusText `{active} / {max} playable squares · connected` or the validation errors.
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
    let text = issue.message;
    if (issue.code === 'board-too-few-cells') {
      text = formatNotice('N-SMALL');
    } else if (issue.code === 'board-too-many-cells') {
      text = formatNotice('N-CAP', { area, max: cap });
    }
    errorTexts.push(text);
    for (const cell of issue.cells ?? []) {
      invalidCells.push(cell);
    }
  }
  const levels = describeLevels(area);
  const levelOffered = levels.some((l) => l.id === state.levelId && l.offered);
  const count = levelOffered ? describeCount(state.levelId, area) : null;
  const levelLabel = LISTED_LEVEL_IDS.includes(state.levelId) ? level(state.levelId).label : state.levelId;

  if (state.stale) {
    notices.push({ code: 'N-STALE', text: formatNotice('N-STALE'), kind: 'warning' });
  }
  if (warnings.some((w) => w.code === 'board-large')) {
    notices.push({ code: 'N-LARGE', text: formatNotice('N-LARGE'), kind: 'warning' });
  }
  if (!hardware.phone && state.largeBoards && area > LIMITS.releaseMaxActive && area <= cap && QUALIFICATION.bq2.status !== 'pass') {
    notices.push({ code: 'N-EXPERIMENTAL', text: formatNotice('N-EXPERIMENTAL', { limit: LIMITS.releaseMaxActive, q: quantity }), kind: 'warning' });
  }
  if (count !== null) {
    notices.push({ code: 'N-COUNT', text: formatNotice('N-COUNT', { kmin: count.kmin, kmax: count.kmax, level: levelLabel, share: count.share }), kind: 'info' });
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
    : `${area} / ${cap} playable squares · connected`;
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
    };
  } catch {
    return null;
  }
}

/**
 * Engine objects for a stored set; null when its packs do not validate or do not belong together.
 * @param {unknown} saved
 * @returns {{ set: PieceSet, calibration: Puzzle | null, calibrationFor: GeneratorState['calibrationFor'], puzzles: Puzzle[],
 *   setSeed: string, batchIndex: number, seenLayouts: string[], seenClues: string[] } | null}
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
    puzzles,
    setSeed,
    batchIndex,
    seenLayouts: readKeys(history.layouts),
    seenClues: readKeys(history.clues),
  };
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
 * Makes a stored set the current set again (set history navigation).
 * @param {GeneratorState} state
 * @param {SavedSet} saved
 * @returns {GeneratorState | null} null when the stored packs no longer validate.
 */
export function useSavedSet(state, saved) {
  const read = readSavedSet(saved);
  if (read === null) {
    return null;
  }
  return withStale({ ...state, ...read });
}

/**
 * @param {GeneratorState} state
 * @returns {GeneratorState}
 */
function withStale(state) {
  const stale = state.set !== null && !boardsEqual(state.set.board, state.board);
  return stale === state.stale ? state : { ...state, stale };
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
    levelId: state.levelId,
    seedText: state.seedText,
    keepSeed: state.keepSeed,
    uniqueness: state.uniqueness,
    omitSolutions: state.omitSolutions,
    setSeed: saved?.setSeed ?? null,
    batchIndex: saved?.batchIndex ?? 0,
    setPack: saved?.setPack ?? null,
    calibrationPack: saved?.calibrationPack ?? null,
    batchPack: saved?.batchPack ?? null,
    history: saved?.history ?? { layouts: [], clues: [] },
    setHistory: state.setHistory.slice(0, MAX_SAVED_SETS),
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
  if (LISTED_LEVEL_IDS.includes(dto.levelId)) {
    state.levelId = dto.levelId;
  }
  if (typeof dto.seedText === 'string' && dto.seedText.length <= 256) {
    state.seedText = dto.seedText;
  }
  state.keepSeed = dto.keepSeed === true;
  state.uniqueness = dto.uniqueness === 'require' ? 'require' : 'any';
  state.omitSolutions = dto.omitSolutions === true;
  const history = [];
  if (Array.isArray(dto.setHistory)) {
    for (const item of dto.setHistory) {
      if (history.length < MAX_SAVED_SETS && readSavedSet(item) !== null) {
        history.push(/** @type {SavedSet} */ (item));
      }
    }
  }
  state.setHistory = history;
  const current = readSavedSet(dto);
  if (current !== null) {
    Object.assign(state, current);
  }
  return withStale(state);
}

/**
 * @typedef {object} StorageLike
 * @property {() => unknown} getGeneratorState
 * @property {(snapshot: unknown) => { ok: boolean }} setGeneratorState
 * @property {() => Record<string, boolean>} getPrefs
 * @property {(partial: Record<string, boolean>) => { ok: boolean }} setPrefs
 */

/**
 * Initial state: preferences (including the Large boards opt-in) are read first and a duplicate
 * `largeBoards` inside gen:state is ignored.
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
    largeBoards: prefs.largeBoards === true,
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
  'board', 'rotation', 'levelId', 'seedText', 'keepSeed', 'uniqueness', 'omitSolutions', 'setSeed', 'batchIndex',
  'set', 'calibration', 'calibrationFor', 'puzzles', 'seenLayouts', 'seenClues', 'setHistory',
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
      // A full storage drops the optional parts first: older sets, then the visible batch.
      const reduced = { ...full, setHistory: [] };
      const minimal = { ...reduced, batchPack: null };
      for (const snapshot of [full, reduced, minimal]) {
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
    destroy() {
      unsubscribe();
      if (timer !== null) {
        clearTimer(timer);
        write();
      }
    },
  };
}
