// @ts-check
// Case boards from the frozen catalogue and carve-only piece sets (setAttempt's carve, without its calibration call).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { IG_DIR } from './paths.mjs';

/** The constant of core/engine/generate.js: a mean piece size from which the macro carve is tried first. */
const MACRO_MIN_MEAN = 6.5;

/** @type {any} */
let catalogue = null;

/** @returns {any} data/boards-v1.json. */
export function loadCatalogue() {
  catalogue ??= JSON.parse(readFileSync(join(IG_DIR, 'data', 'boards-v1.json'), 'utf8'));
  return catalogue;
}

/**
 * @param {string} caseId
 * @returns {{ id: string, boardRows: string[], rotation: number, levelId: string, maxActive: number, quantity: 10,
 *   uniqueness: 'any', seedPrefix: string, area: number }} A copy of the catalogue entry; an unknown id throws.
 */
export function caseBoard(caseId) {
  const entry = loadCatalogue().cases[caseId];
  if (entry === undefined) {
    throw new Error(`unknown case id ${caseId}`);
  }
  return structuredClone(entry);
}

/**
 * The carve of `setAttempt` in the same order: board, area, stream `set/<attempt>`, the piece-count range of the
 * tree (with diagnostic offers), K, macro or flat carve, finalize, validate.
 * `offeredInSource` is read from the engine itself: the area interval of its `levels.js`. The tree is built from the
 * selected source (the frozen snapshot under `--label frozen`), so the offer is that source's, also in a worker
 * thread, and the tree's diagnostic offers (`instr`) report `false` for a cell the source does not offer.
 * @param {import('./engine.mjs').Engine} engine
 * @param {{ boardRows: string[], levelId: string, seedText: string, attempt: number }} o
 * @returns {{ ok: true, board: any, set: any, area: number, K: number, attempt: number, calRng: any,
 *   offeredInSource: boolean } | { ok: false, reason: string }}
 */
export function carveSet(engine, { boardRows, levelId, seedText, attempt }) {
  const { board: B, carve, policy, rng } = engine;
  const board = B.boardFromRows(boardRows);
  const area = B.activeCount(board);
  const stream = rng.createRng(rng.normalizeSeedText(seedText), `set/${attempt}`);
  const ks = policy.pieceCountRange(levelId, area);
  if (ks === null || ks.length === 0) {
    return { ok: false, reason: 'not-offered' };
  }
  const k = ks[stream.int(ks.length)];
  let carved = null;
  if (area / k >= MACRO_MIN_MEAN) {
    carved = carve.carveMacro(board, k, stream.derive('macro'), policy.BUDGETS);
  }
  if (carved === null) {
    carved = carve.carveFlatSet(board, k, stream.derive('flat'), policy.BUDGETS);
  }
  if (carved === null) {
    return { ok: false, reason: 'carve' };
  }
  const set = carve.finalizeSet(board, carved.regions, carved.regionOf ?? null);
  if (carve.validateSet(set).length > 0) {
    return { ok: false, reason: 'internal' };
  }
  const lv = engine.levels.level(levelId);
  const offeredInSource = area >= lv.areas[0] && area <= lv.areas[1] && ks !== null && ks.length > 0;
  return {
    ok: true,
    board,
    set,
    area,
    K: set.pieces.length,
    attempt,
    calRng: stream.derive('cal'),
    offeredInSource,
  };
}

/**
 * The first attempt from 0 whose carve succeeds.
 * @param {import('./engine.mjs').Engine} engine
 * @param {{ boardRows: string[], levelId: string, seedText: string, maxAttempts?: number }} o
 * @returns {ReturnType<typeof carveSet> | { ok: false, reason: 'no-carve', failures: string[] }}
 */
export function firstCarvedSet(engine, { boardRows, levelId, seedText, maxAttempts = 8 }) {
  /** @type {string[]} */
  const failures = [];
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const carved = carveSet(engine, { boardRows, levelId, seedText, attempt });
    if (carved.ok) {
      return carved;
    }
    failures.push(carved.reason);
  }
  return { ok: false, reason: 'no-carve', failures };
}

/**
 * @param {Extract<ReturnType<typeof carveSet>, { ok: true }>} carved
 * @returns {{ attempt: number, area: number, K: number, sizes: number[], carving: string, offeredInSource: boolean }}
 */
export function setInfo(carved) {
  return {
    attempt: carved.attempt,
    area: carved.area,
    K: carved.K,
    sizes: carved.set.pieces.map((/** @type {{ cells: unknown[] }} */ p) => p.cells.length).sort((/** @type {number} */ a, /** @type {number} */ b) => a - b),
    carving: carved.set.carving,
    offeredInSource: carved.offeredInSource,
  };
}
