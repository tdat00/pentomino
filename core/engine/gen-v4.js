// @ts-check
// gen-v4: the frozen values and pure rules of plan v4 (P1 to P5) and of phase 2 (plan 4.1): table ids, the route
// predicate, the screen, the budgets, the start rule, the per-set prior rule of Hell 1 and the algorithm family.
// Pure and DOM-free; the route is live since the P2-15 cutover.

import { activeCount } from './board.js';
import { DEDUCE } from './policy.js';

/** @typedef {import('./types.js').Board} Board */

// The route switch, set to true by P2-15 together with `ALGO_ID = 'gen-v4'`.
export const GEN_V4_LIVE = true;

/** Table ids. */
export const PRIOR_TABLE_ID = 'prior-s3-v1';
export const SCREEN_TABLE_ID = 'screen-v4-v1';
export const BUDGET_TABLE_ID = 'budget-s3-v1';
export const DEADLINE_ID = 'deadline-s3-v1';

/** The start-count prior: the window share by `'<level>@<active cells>'` (tools/ig-proto/data/prior-s3-v1.json). */
export const PRIOR = Object.freeze({
  'hell-1@196': 0.4,
  'hell-1@215': 0.404412,
  'hell-1@256': 0.358108,
  'hell-1@300': 0.443429,
  'hell-1@324': 0.347222,
  'hell-1@360': 0.331514,
  'hell-1@400': 0.368421,
  'hell-1@420': 0.390244,
  'hell-1@480': 0.297161,
  'hell-1@484': 0.2875,
  'hell-1@576': 0.219512,
  'hell-1@676': 0.2,
  'nightmare@100': 0.2,
  'nightmare@144': 0.210526,
  'nightmare@196': 0.190476,
  'nightmare@215': 0.181818,
  'nightmare@256': 0.173913,
  'nightmare@300': 0.192308,
  'nightmare@324': 0.16,
  'nightmare@360': 0.16,
  'nightmare@400': 0.16313,
  'nightmare@420': 0.153846,
  'nightmare@480': 0.142857,
  'nightmare@484': 0.145503,
  'nightmare@576': 0.133333,
  'nightmare@676': 0.133333,
  'nightmare@87': 0.166667,
});
/** The step without a prior cell (the frozen `U0`). */
export const NO_PRIOR_STEP = 8;
/** The screen work bound (Nightmare, `SCREEN_AREAS` active cells) and the area range it applies to. */
export const SCREEN_W = 190000000;
export const SCREEN_AREAS = Object.freeze([196, 256]);
/** The per-candidate call budget by uniqueness mode and level. */
export const CALL_BUDGET = Object.freeze({ any: Object.freeze({ nightmare: 10000000000, 'hell-1': 40000000000 }), require: Object.freeze({ nightmare: 32000000000, 'hell-1': 40000000000 }) });
export const SET_ATTEMPTS_BOUND = 4;
export const RERATE_MAX = 4;
/** The levels that take the per-set prior. */
export const PER_SET_LEVELS = Object.freeze(['hell-1']);
export const DEADLINE = Object.freeze({ reserve: 0.6, setStageCapMs: 46000, generationStopMs: 115000, responseBoundMs: 120000, hostMarginMs: 1000 });
export const SKIP_BOUNDS_V4 = Object.freeze({ subsets: 2192, repairs: 64 });

/**
 * @param {Board} board
 * @returns {boolean} True for the full 26 by 26 board (676 active cells).
 */
export function isFull26(board) {
  return board.width === 26 && board.height === 26 && activeCount(board) === 676;
}

/**
 * @param {string} levelId
 * @param {Board} board
 * @returns {boolean} True when the level and board take gen-v4: Hell 1, and Nightmare except the full 26 by 26 board.
 */
export function isGenV4Route(levelId, board) {
  return levelId === 'hell-1' || (levelId === 'nightmare' && !isFull26(board));
}

/**
 * @param {string} levelId
 * @param {Board} board
 * @returns {boolean} The route, while `GEN_V4_LIVE` is true.
 */
export function usesGenV4(levelId, board) {
  return GEN_V4_LIVE && isGenV4Route(levelId, board);
}

/**
 * @param {string} levelId
 * @param {number} area Active cell count.
 * @returns {number} The screen work bound; `DEDUCE.work` (no screen) outside Nightmare 196 to 256 cells.
 */
export function screenWOf(levelId, area) {
  return levelId === 'nightmare' && area >= SCREEN_AREAS[0] && area <= SCREEN_AREAS[1] ? SCREEN_W : DEDUCE.work;
}

/**
 * @param {string} uniqueness `'any'` or `'require'`.
 * @param {string} levelId
 * @returns {number} The call budget, or `Infinity` when none applies.
 */
export function callBudgetOf(uniqueness, levelId) {
  const v = /** @type {Record<string, Record<string, number>>} */ (CALL_BUDGET)[uniqueness]?.[levelId];
  return typeof v === 'number' && v > 0 ? v : Infinity;
}

/**
 * @param {string} levelId
 * @param {number} area Active cell count.
 * @param {number} K Clue count.
 * @returns {number | null} The table start count, or null without a cell (or when K < 3).
 */
export function priorStart(levelId, area, K) {
  const key = `${levelId}@${area}`;
  if (K < 3 || !Object.hasOwn(PRIOR, key)) {
    return null;
  }
  return Math.min(K - 2, Math.max(1, Math.round(/** @type {Record<string, number>} */ (PRIOR)[key] * K)));
}

/**
 * @param {number | null} prior A start count, or null.
 * @param {number} K Clue count.
 * @returns {{ c0: number, step0: number }} The start count and step (the frozen ig-select-v4.js lines 949 and 950).
 */
export function startOf(prior, K) {
  return { c0: Math.min(K - 2, Math.max(1, prior ?? K - NO_PRIOR_STEP)), step0: prior === null ? NO_PRIOR_STEP : 1 };
}

// The frozen per-set rule (variant v4-ps, plan P4 item 2), under the match rule of calibrationCandidate: the
// calibration shows the target level, and `require` needs a unique certificate.
/**
 * The caller applies it only when `PER_SET_LEVELS.includes(levelId)` and only to a usable calibration. It never reads
 * `seenLayouts`, `seenClues` or any key.
 * @param {any} cal The batch's usable calibration puzzle, or undefined.
 * @param {string} levelId
 * @param {'any' | 'require'} uniqueness
 * @returns {{ igPrior?: number }}
 */
export function perSetPrior(cal, levelId, uniqueness) {
  if (cal === undefined || cal === null || cal.rating === null || cal.rating.level !== levelId) {
    return {};
  }
  if (uniqueness === 'require' && cal.certificate?.status !== 'unique') {
    return {};
  }
  const wc = cal.igWindow?.wc;
  return Number.isInteger(wc) && wc >= 1 ? { igPrior: wc } : {};
}

/**
 * @param {unknown} algo An algorithm id.
 * @returns {boolean} True for `gen-v4` and the prototype ids `gen-v4-proto:<name>`.
 */
export function isV4Family(algo) {
  return typeof algo === 'string' && (algo === 'gen-v4' || /^gen-v4-proto:[a-z0-9][a-z0-9-]{0,39}$/.test(algo));
}
