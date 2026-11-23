// @ts-check
// P7's pure helpers (stages 2 to 4 pack T03a): shared by p7-probe.mjs and lib/lane-worker.mjs; no main, no lanes, no label.
import { readFileSync } from 'node:fs';

import { abs } from './paths.mjs';

export const MEMORY_MANIFEST = 'tools/ig-proto/data/p7-memory-fixtures.json';
export const MEMORY_SETTINGS = Object.freeze(['fixture', 'mem-below', 'mem-ref', 'mem-fast']);

/**
 * @typedef {{ id: string, width: number, height: number, a: number, b: number, pieces: number, rows: number, nonzeros: number,
 *   columns: number, arenaBytes: number, refBytes: number, listBytes: number, canonical: string }} MemoryFixture
 * @typedef {{ fixture: string, memoryBytes: number, expect: string }} MemoryStep
 * @typedef {{ fixture: string, memoryBytes: number, capacityBytes: number, expect: string }} MemoryCapacity
 * @typedef {{ format: string, version: number, source: string, limit: number, workspaceBytes: number,
 *   limits: { work: number, census: number }, fixtures: MemoryFixture[], sequence: MemoryStep[],
 *   capacity: MemoryCapacity[] }} MemoryManifest
 */

/** @type {MemoryManifest | null} */
let manifest = null;

/** @returns {MemoryManifest} The memory fixture manifest, read once; a malformed one throws. */
export function memoryManifest() {
  if (manifest === null) {
    const read = JSON.parse(readFileSync(abs(MEMORY_MANIFEST), 'utf8'));
    const bad = (/** @type {string} */ reason) => new Error(`p7-probe: bad memory manifest: ${reason}`);
    if (read?.format !== 'ig-p7-memory-fixtures') {
      throw bad(`format ${JSON.stringify(read?.format)}`);
    }
    if (read.version !== 1) {
      throw bad(`version ${JSON.stringify(read.version)}`);
    }
    const ids = new Set(read.fixtures.map((/** @type {MemoryFixture} */ f) => f.id));
    if (ids.size !== read.fixtures.length) {
      throw bad('the fixture ids are not distinct');
    }
    for (const entry of [...read.sequence, ...read.capacity]) {
      if (!ids.has(entry.fixture)) {
        throw bad(`an entry names the unknown fixture ${entry.fixture}`);
      }
    }
    manifest = read;
  }
  return /** @type {MemoryManifest} */ (manifest);
}

/**
 * @param {MemoryFixture} f
 * @returns {{ boardRows: string[], pieces: any[], clues: [] }} A fully active board tiled by equal `a` x `b` rectangles, no clue.
 */
export function fixtureInput(f) {
  return {
    boardRows: Array.from({ length: f.height }, () => '#'.repeat(f.width)),
    pieces: Array.from({ length: f.pieces }, (_, i) => ({
      id: `r${i}`,
      label: `R${i}`,
      color: '#888888',
      cells: Array.from({ length: f.a * f.b }, (_unused, k) => [k % f.a, Math.floor(k / f.a)]),
    })),
    clues: [],
  };
}

/**
 * @param {{ search: { work: number }, census?: { work: number } | null }} result A reference `DeductionResult`.
 * @returns {{ refWork: number, refCensusWork: number }} `search.work` includes the census's work (deduce.js), so the
 *   difference is the main search's work.
 */
export function workInputs(result) {
  const refCensusWork = result.census?.work ?? 0;
  return { refWork: result.search.work - refCensusWork, refCensusWork };
}

/**
 * @param {string} setting
 * @param {{ base: any, refWork?: number, refCensusWork?: number, refBytes?: number | null, extraBytes?: number }} o
 *   `base` is the item's base limits.
 * @returns {{ limits: any, diagnostics: Record<string, unknown> } | null} The limits and diagnostics of a setting; null when
 *   it does not apply to the item. An unknown setting or a bad screen limit throws.
 */
export function limitsFor(setting, { base, refWork, refCensusWork, refBytes, extraBytes }) {
  const plain = (/** @type {Record<string, number>} */ over, /** @type {Record<string, unknown>} */ diagnostics = {}) => ({
    limits: { ...base, ...over }, diagnostics,
  });
  const num = (/** @type {number | null | undefined} */ v) => (typeof v === 'number' ? v : NaN);
  switch (setting) {
    case 'canonical':
    case 'fixture':
      return { limits: base, diagnostics: {} };
    case 'tie1':
      return { limits: base, diagnostics: { tieOrder: 1 } };
    case 'undo':
      return { limits: base, diagnostics: { verifyUndo: true } };
    case 'work-half':
      return num(refWork) >= 2 ? plain({ work: Math.floor(/** @type {number} */ (refWork) / 2) }) : null;
    case 'work-minus1':
      return num(refWork) >= 1 ? plain({ work: /** @type {number} */ (refWork) - 1 }) : null;
    case 'work-ref':
      return num(refWork) >= 1 ? plain({ work: /** @type {number} */ (refWork) }) : null;
    case 'census-half':
      return num(refCensusWork) >= 2 ? plain({ census: Math.floor(/** @type {number} */ (refCensusWork) / 2) }) : null;
    case 'mem-below':
      return num(refBytes) >= 1 ? plain({ memoryBytes: /** @type {number} */ (refBytes) - 1 }) : null;
    case 'mem-ref':
      return num(refBytes) >= 0 && num(extraBytes) > 0 ? plain({ memoryBytes: /** @type {number} */ (refBytes) + /** @type {number} */ (extraBytes) - 1 }) : null;
    case 'mem-fast':
      return num(refBytes) >= 0 && num(extraBytes) > 0 ? plain({ memoryBytes: /** @type {number} */ (refBytes) + /** @type {number} */ (extraBytes) }) : null;
    default:
      break;
  }
  if (setting.startsWith('screen:')) {
    const text = setting.slice('screen:'.length);
    if (!/^(0|[1-9][0-9]*)$/.test(text) || !Number.isSafeInteger(Number(text))) {
      throw new Error(`p7-probe: bad screen setting ${setting}`);
    }
    return plain({ work: Number(text) });
  }
  throw new Error(`p7-probe: unknown setting ${setting}`);
}

/**
 * @param {() => any} fn
 * @returns {{ result: any } | { error: { name: string, code: unknown, message: string, details: unknown } }}
 *   The structured clone of what `fn` returns, or the normalized error it throws. Two outcomes are equal when
 *   `isDeepStrictEqual` holds.
 */
export function outcomeOf(fn) {
  try {
    return { result: structuredClone(fn()) };
  } catch (e) {
    const own = (/** @type {string} */ key) => (e !== null && typeof e === 'object' && Object.hasOwn(e, key) ? /** @type {any} */ (e)[key] : null);
    const details = own('details');
    return {
      error: {
        name: e instanceof Error ? e.name : typeof e,
        code: own('code'),
        message: e instanceof Error ? e.message : String(e),
        details: details === null || details === undefined ? null : JSON.parse(JSON.stringify(details)),
      },
    };
  }
}
