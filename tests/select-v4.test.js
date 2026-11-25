// @ts-check
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { boardFromRows, rectangle } from '../core/engine/board.js';
import { carveFlatSet, carveMacro, finalizeSet } from '../core/engine/carve.js';
import { selectClues, selectCluesV3 } from '../core/engine/clues.js';
import { IncompleteRatingError, inBand } from '../core/engine/difficulty.js';
import { level } from '../core/engine/levels.js';
import { BUDGETS, DEDUCE, pieceCountRange } from '../core/engine/policy.js';
import { createRng, normalizeSeedText } from '../core/engine/rng.js';
import { selectCluesV4 } from '../core/engine/select-v4.js';
import { buildModel, solveFirst } from '../core/engine/tiling.js';
import { createWorkspace, MAIN_WORKSPACE_BYTES } from '../core/engine/workspace.js';
import { RECIPE_BOARD_ROWS, recipeWitness } from './fixtures/clue-recipes.js';
import { CLASSIC_PENTOMINOES } from './fixtures/polyominoes.js';

/** @typedef {import('../core/engine/types.js').Piece} Piece */
/** @typedef {import('../core/engine/types.js').Pose} Pose */
/** @typedef {import('../core/engine/types.js').Rating} Rating */

const ws = createWorkspace(MAIN_WORKSPACE_BYTES);
const board = boardFromRows([...RECIPE_BOARD_ROWS]);
const pieces = /** @type {Piece[]} */ ([...CLASSIC_PENTOMINOES]);
const layout = recipeWitness();

/**
 * @param {number} score
 * @returns {Rating}
 */
const fakeRating = (score) => /** @type {Rating} */ (/** @type {unknown} */ ({
  model: 'difficulty-v3', score, level: 'very-easy', saturated: false, metrics: {},
}));

describe('select-v4 smoke', () => {
  test('a gen-v4 call returns an in-band result with its window', () => {
    const target = { ...level('master'), id: 'master' };
    const result = selectCluesV4({
      board, pieces, layout, target, rng: createRng('p2-04/a'), uniqueness: 'any', excludeClueKeys: new Set(), ws,
    });
    assert.equal(result.ok, true);
    assert.ok(inBand(result.rating, target));
    assert.ok(Number.isInteger(result.igWindow.wc) && result.igWindow.wc >= 1 && result.igWindow.wc <= 10);
    assert.deepEqual(result.counters, { budgetStops: 0, screenCapped: 0, rescueReratings: 0, tailReratings: 0 });
    assert.notEqual(result.rating.metrics.dlxStop, 'skipped');
  });

  test('a no-window call names its side', () => {
    const target = { ...level('master'), id: 'master' };
    const result = selectCluesV4({
      board, pieces, layout, target, rng: createRng('p2-04/b'), uniqueness: 'any', excludeClueKeys: new Set(), ws,
      rate: () => fakeRating(0), rateScreen: () => fakeRating(0),
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'not-in-band');
    assert.equal(result.igNoWindow, 'below');
  });

  test("the dispatcher keeps today's search while the route is off", () => {
    const big = rectangle(10, 10);
    const twenty = [...pieces, ...pieces.slice(0, 8).map((p) => ({ ...p, id: `${p.id}2` }))];
    const witness = /** @type {Pose[]} */ (solveFirst(buildModel(big, twenty, [], ws), { rowTrialLimit: 1e6 }).layout);
    /** @param {string} seed */
    const context = (seed) => ({
      board: big, pieces: twenty, layout: witness, target: { ...level('nightmare'), id: 'nightmare' },
      rng: createRng(seed), uniqueness: /** @type {'any'} */ ('any'), excludeClueKeys: new Set(), ws,
      rate: () => fakeRating(60),
    });
    assert.deepEqual(selectClues(context('p2-04/c')), selectCluesV3(context('p2-04/c')));
  });
});

// The frozen synthetic vectors of the v4 selector (tools/ig-proto/self-test.mjs, `v4: P1 locate, rescue and
// re-rating order`): the inputs and the expected values are literal. The expected values are the frozen selector's
// outputs on the same inputs.
const K15_SIZES = [5, 5, 5, 5, 5, 6, 6, 6, 6, 7, 7, 8, 9, 10, 10];
/** @type {{ board: any, set: any } | null} */
let k15Cache = null;

/** The K = 15 set of the frozen vectors, carved with the production modules. */
function k15() {
  if (k15Cache === null) {
    const board15 = boardFromRows(Array.from({ length: 10 }, () => '#'.repeat(10)));
    const stream = createRng(normalizeSeedText('ig-selftest/proto/k15/1'), 'set/0');
    const ks = /** @type {number[]} */ (pieceCountRange('master', 100));
    const k = ks[stream.int(ks.length)];
    const carved = /** @type {any} */ ((100 / k >= 6.5 ? carveMacro(board15, k, stream.derive('macro'), BUDGETS) : null)
      ?? carveFlatSet(board15, k, stream.derive('flat'), BUDGETS));
    const set = finalizeSet(board15, carved.regions, carved.regionOf ?? null);
    assert.equal(set.pieces.length, 15);
    assert.deepEqual(set.pieces.map((p) => p.cells.length).sort((a, b) => a - b), K15_SIZES);
    k15Cache = { board: board15, set };
  }
  return k15Cache;
}

/**
 * @param {number} score
 * @param {{ work?: number, Gproved?: number, stop?: string }} [opts]
 * @returns {any}
 */
function synthetic(score, { work = 1, Gproved = 1, stop = 'exhausted' } = {}) {
  return {
    model: 'difficulty-v3', score, level: 'st', saturated: false,
    metrics: { work, censusWork: 0, nodes: 1, censusNodes: 0, searchStop: stop, Gproved, censusComplete: true },
  };
}

const BAND = Object.freeze({ id: 'st-band', min: 55, max: 70, share: 0.3 });
const DOWN = (/** @type {number} */ c) => (c <= 2 ? 'cap' : synthetic(100 - 10 * c));
const capAll = () => 'cap';

/**
 * @param {(count: number) => any} fn
 * @param {any[]} clues
 * @param {string[]} log
 * @param {string} kind
 */
function fromCount(fn, clues, log, kind) {
  log.push(`${kind}:${clues.length}`);
  const r = fn(clues.length);
  if (r === 'cap') {
    throw new IncompleteRatingError('synthetic cap', { nodes: 1, work: DEDUCE.work, stop: 'work-cap' });
  }
  return r;
}

/**
 * Runs one call on the K = 15 set with synthetic ratings.
 * `spec.observers`: `'none'`, `'charge'` or `'both'` (the default); `spec.throwCharge` and `spec.throwRecord`:
 * `{ at, error }`, the observer call that throws.
 * @param {string} name
 * @param {Record<string, any>} spec
 */
function run(name, spec) {
  const { board: board15, set } = /** @type {{ board: any, set: any }} */ (k15());
  /** @type {string[]} */
  const log = [];
  /** @type {number[]} */
  const charges = [];
  /** @type {any[]} */
  const events = [];
  const observers = spec.observers ?? 'both';
  let result = null;
  let error = null;
  try {
    result = selectCluesV4({
      board: board15, pieces: set.pieces, layout: set.witness, target: spec.target ?? BAND,
      uniqueness: spec.uniqueness ?? 'any', rng: createRng(normalizeSeedText('ig-selftest/proto/p1'), `selftest/${name}`),
      excludeClueKeys: spec.exclude ?? new Set(), ws: createWorkspace(MAIN_WORKSPACE_BYTES),
      igPrior: spec.prior ?? null, screenW: 190000000,
      rateScreen: (/** @type {any[]} */ clues) => fromCount(spec.screen, clues, log, 'screen'),
      rate: (/** @type {any} */ _b, /** @type {any} */ _p, /** @type {any[]} */ clues) => fromCount(spec.canon ?? spec.screen, clues, log, 'canon'),
      ...(spec.budget === undefined ? {} : { budget: spec.budget }),
      ...(spec.replaySkips === undefined ? {} : { replaySkips: spec.replaySkips }),
      ...(observers === 'none' ? {} : {
        charge: (/** @type {number} */ u) => {
          charges.push(u);
          if (spec.throwCharge !== undefined && charges.length === spec.throwCharge.at) {
            throw spec.throwCharge.error;
          }
        },
      }),
      ...(observers !== 'both' ? {} : {
        record: (/** @type {any} */ ev) => {
          events.push(ev);
          if (spec.throwRecord !== undefined && events.length === spec.throwRecord.at) {
            throw spec.throwRecord.error;
          }
        },
      }),
    });
  } catch (e) {
    error = e;
  }
  return { result, error, log, charges, events };
}

const RATING_KINDS = ['rated', 'unrateable', 'rejected'];

/** @param {{ log: string[], charges: number[], events: any[] }} r */
function observables(r) {
  const rated = r.events.filter((ev) => RATING_KINDS.includes(ev.kind));
  /** @type {Record<string, number[]>} */
  const probes = {};
  for (const ev of rated) {
    (probes[ev.phase] ??= []).push(ev.clueIds.length);
  }
  return {
    probes,
    kinds: rated.map((ev) => `${ev.phase}:${ev.clueIds.length}:${ev.kind}${ev.reason === undefined ? '' : ':' + ev.reason}`),
    other: r.events.filter((ev) => !RATING_KINDS.includes(ev.kind)).map((ev) => ev.kind),
    seamCalls: r.log,
    charges: r.charges,
  };
}

// Writing aids for the long literal lists: `s` splits a space-separated list, `x` repeats a value, and the others
// repeat one entry of the kinds or seam-call lists.
const s = (/** @type {string} */ text) => text.split(' ');
const x = (/** @type {number} */ n, /** @type {any} */ v) => Array.from({ length: n }, () => v);
const kU = (/** @type {string} */ phase, /** @type {number} */ n, times = 1) => x(times, `${phase}:${n}:unrateable:screen-capped`);
const kR = (/** @type {string} */ phase, /** @type {number} */ n, times = 1) => x(times, `${phase}:${n}:rated`);
const kJ = (/** @type {string} */ phase, /** @type {number} */ n, times = 1) => x(times, `${phase}:${n}:rejected:no-proved-guess`);
const scr = (/** @type {number} */ n, times = 1) => x(times, `screen:${n}`);
const can = (/** @type {number} */ n, times = 1) => x(times, `canon:${n}`);

const REBRACKETED_CANON = (/** @type {number} */ c) => synthetic(100 - 10 * c);
const OVERWORK_SCREEN = (/** @type {number} */ c) => (c === 7 ? synthetic(30, { work: 190000001, stop: 'work-cap' }) : DOWN(c));
const AR1_SCREEN = (/** @type {number} */ c) => (c === 4 ? synthetic(60, { Gproved: 0 }) : DOWN(c));

const WINDOW_7_TO_12 = [7, 8, 9, 10, 11, 12].flatMap((n) => x(4, n));

/**
 * `counters` is `[screenCapped, rescueReratings, tailReratings]`: the entries of the kinds list ending
 * `:unrateable:screen-capped`, `rescue:<n>:rated|rejected` and `rerate:<n>:rated|rejected`.
 * @type {{ name: string, spec: Record<string, any>, ok: boolean, reason: string | null, igNoWindow?: 'below' | 'above',
 *   clues?: number, score?: number, igWindow: any, skips: any, counters: number[], probes: Record<string, number[]>,
 *   kinds: string[], other: string[], seamCalls: string[], charges: number[] }[]}
 */
const VECTORS = [
  {
    name: 'noprior', spec: { screen: DOWN }, ok: true, reason: null, clues: 4, score: 60,
    igWindow: { c0: 7, wc: 4, hit: 4, hiBelow: null, loAbove: null, probes: 3, result: 'hit', proof: null },
    skips: { subsets: [], repairs: [] }, counters: [1, 0, 0],
    probes: { locate: [7, 1, 4] },
    kinds: s('locate:7:rated locate:1:unrateable:screen-capped locate:4:rated'),
    other: ['selected'],
    seamCalls: s('screen:7 screen:1 screen:4'),
    charges: [1, 760000000, 1],
  },
  {
    name: 'prior6', spec: { prior: 6, screen: DOWN }, ok: true, reason: null, clues: 4, score: 60,
    igWindow: { c0: 6, wc: 4, hit: 4, hiBelow: null, loAbove: null, probes: 4, result: 'hit', proof: null },
    skips: { subsets: [], repairs: [] }, counters: [0, 0, 0],
    probes: { locate: [6, 5, 3, 4] },
    kinds: s('locate:6:rated locate:5:rated locate:3:rated locate:4:rated'),
    other: ['selected'],
    seamCalls: s('screen:6 screen:5 screen:3 screen:4'),
    charges: [1, 1, 1, 1],
  },
  {
    name: 'overwork', spec: { screen: OVERWORK_SCREEN, canon: DOWN }, ok: false, reason: 'not-in-band',
    igWindow: null, skips: null, counters: [35, 0, 4],
    probes: {
      locate: [7, 13, 10, 8],
      window: [8, 8, 8, 8, 7, 7, 7, 7],
      beam: [7, 7, 7, 7, 7, 7, 7, 8, 8, 7, 7, 8, 7, 7, 8, 7, 8, 7, 7, 8, 7, 7, 7, 8, 7, 7, 8, 7, 8, 7, 7, 7, 8, 8, 8, 7, 7, 8, 8, 8, 8, 7, 7, 8, 7, 7, 8, 8, 8, 8, 8, 7],
      rerate: [7, 7, 7, 7],
    },
    kinds: s('locate:7:unrateable:screen-capped locate:13:rated locate:10:rated locate:8:rated window:8:rated window:8:rated window:8:rated window:8:rated window:7:unrateable:screen-capped window:7:unrateable:screen-capped window:7:unrateable:screen-capped window:7:unrateable:screen-capped beam:7:unrateable:screen-capped beam:7:unrateable:screen-capped beam:7:unrateable:screen-capped beam:7:unrateable:screen-capped beam:7:unrateable:screen-capped beam:7:unrateable:screen-capped beam:7:unrateable:screen-capped beam:8:rated beam:8:rated beam:7:unrateable:screen-capped beam:7:unrateable:screen-capped beam:8:rated beam:7:unrateable:screen-capped beam:7:unrateable:screen-capped beam:8:rated beam:7:unrateable:screen-capped beam:8:rated beam:7:unrateable:screen-capped beam:7:unrateable:screen-capped beam:8:rated beam:7:unrateable:screen-capped beam:7:unrateable:screen-capped beam:7:unrateable:screen-capped beam:8:rated beam:7:unrateable:screen-capped beam:7:unrateable:screen-capped beam:8:rated beam:7:unrateable:screen-capped beam:8:rated beam:7:unrateable:screen-capped beam:7:unrateable:screen-capped beam:7:unrateable:screen-capped beam:8:rated beam:8:rated beam:8:rated beam:7:unrateable:screen-capped beam:7:unrateable:screen-capped beam:8:rated beam:8:rated beam:8:rated beam:8:rated beam:7:unrateable:screen-capped beam:7:unrateable:screen-capped beam:8:rated beam:7:unrateable:screen-capped beam:7:unrateable:screen-capped beam:8:rated beam:8:rated beam:8:rated beam:8:rated beam:8:rated beam:7:unrateable:screen-capped rerate:7:rated rerate:7:rated rerate:7:rated rerate:7:rated'),
    other: [],
    seamCalls: s('screen:7 screen:13 screen:10 screen:8 screen:8 screen:8 screen:8 screen:8 screen:7 screen:7 screen:7 screen:7 screen:7 screen:7 screen:7 screen:7 screen:7 screen:7 screen:7 screen:8 screen:8 screen:7 screen:7 screen:8 screen:7 screen:7 screen:8 screen:7 screen:8 screen:7 screen:7 screen:8 screen:7 screen:7 screen:7 screen:8 screen:7 screen:7 screen:8 screen:7 screen:8 screen:7 screen:7 screen:7 screen:8 screen:8 screen:8 screen:7 screen:7 screen:8 screen:8 screen:8 screen:8 screen:7 screen:7 screen:8 screen:7 screen:7 screen:8 screen:8 screen:8 screen:8 screen:8 screen:7 canon:7 canon:7 canon:7 canon:7'),
    charges: [190000001, 1, 1, 1, 1, 1, 1, 1, 190000001, 190000001, 190000001, 190000001, 190000001, 190000001, 190000001, 190000001, 190000001, 190000001, 190000001, 1, 1, 190000001, 190000001, 1, 190000001, 190000001, 1, 190000001, 1, 190000001, 190000001, 1, 190000001, 190000001, 190000001, 1, 190000001, 190000001, 1, 190000001, 1, 190000001, 190000001, 190000001, 1, 1, 1, 190000001, 190000001, 1, 1, 1, 1, 190000001, 190000001, 1, 190000001, 190000001, 1, 1, 1, 1, 1, 190000001, 1, 1, 1, 1],
  },
  {
    name: 'ar1in', spec: { screen: AR1_SCREEN }, ok: false, reason: 'not-in-band',
    igWindow: null, skips: null, counters: [1, 0, 0],
    probes: {
      locate: [7, 1, 4],
      window: [4, 4, 4, 4],
      beam: [6, 6, 6, 6, 7, 7, 6, 7, 5, 6, 6, 5, 5, 5, 6, 6, 5, 5, 6, 5, 5, 5, 6, 6, 5, 5, 6, 5, 6, 5, 6, 6, 5, 6, 5, 6, 6, 5, 6, 6, 4, 5, 5, 4, 5, 4, 5, 4, 4, 4, 5, 5, 5, 4, 4, 4, 4],
      rerate: [1],
    },
    kinds: s('locate:7:rated locate:1:unrateable:screen-capped locate:4:rejected:no-proved-guess window:4:rejected:no-proved-guess window:4:rejected:no-proved-guess window:4:rejected:no-proved-guess window:4:rejected:no-proved-guess beam:6:rated beam:6:rated beam:6:rated beam:6:rated beam:7:rated beam:7:rated beam:6:rated beam:7:rated beam:5:rated beam:6:rated beam:6:rated beam:5:rated beam:5:rated beam:5:rated beam:6:rated beam:6:rated beam:5:rated beam:5:rated beam:6:rated beam:5:rated beam:5:rated beam:5:rated beam:6:rated beam:6:rated beam:5:rated beam:5:rated beam:6:rated beam:5:rated beam:6:rated beam:5:rated beam:6:rated beam:6:rated beam:5:rated beam:6:rated beam:5:rated beam:6:rated beam:6:rated beam:5:rated beam:6:rated beam:6:rated beam:4:rejected:no-proved-guess beam:5:rated beam:5:rated beam:4:rejected:no-proved-guess beam:5:rated beam:4:rejected:no-proved-guess beam:5:rated beam:4:rejected:no-proved-guess beam:4:rejected:no-proved-guess beam:4:rejected:no-proved-guess beam:5:rated beam:5:rated beam:5:rated beam:4:rejected:no-proved-guess beam:4:rejected:no-proved-guess beam:4:rejected:no-proved-guess beam:4:rejected:no-proved-guess rerate:1:unrateable:path-capped'),
    other: [],
    seamCalls: s('screen:7 screen:1 screen:4 screen:4 screen:4 screen:4 screen:4 screen:6 screen:6 screen:6 screen:6 screen:7 screen:7 screen:6 screen:7 screen:5 screen:6 screen:6 screen:5 screen:5 screen:5 screen:6 screen:6 screen:5 screen:5 screen:6 screen:5 screen:5 screen:5 screen:6 screen:6 screen:5 screen:5 screen:6 screen:5 screen:6 screen:5 screen:6 screen:6 screen:5 screen:6 screen:5 screen:6 screen:6 screen:5 screen:6 screen:6 screen:4 screen:5 screen:5 screen:4 screen:5 screen:4 screen:5 screen:4 screen:4 screen:4 screen:5 screen:5 screen:5 screen:4 screen:4 screen:4 screen:4 canon:1'),
    charges: [1, 760000000, ...x(62, 1), 760000000],
  },
  {
    name: 'below1', spec: { screen: () => synthetic(30) }, ok: false, reason: 'not-in-band', igNoWindow: 'below',
    igWindow: null, skips: null, counters: [0, 0, 0],
    probes: { locate: [7, 1] },
    kinds: s('locate:7:rated locate:1:rated'),
    other: ['no-window'],
    seamCalls: s('screen:7 screen:1'),
    charges: [1, 1],
  },
  {
    name: 'above13', spec: { screen: () => synthetic(90) }, ok: false, reason: 'not-in-band', igNoWindow: 'above',
    igWindow: null, skips: null, counters: [0, 0, 0],
    probes: { locate: [7, 13] },
    kinds: s('locate:7:rated locate:13:rated'),
    other: ['no-window'],
    seamCalls: s('screen:7 screen:13'),
    charges: [1, 1],
  },
  {
    name: 'confirmed', spec: { screen: capAll, canon: () => synthetic(90) }, ok: false, reason: 'not-in-band',
    igNoWindow: 'above', igWindow: null, skips: null, counters: [2, 2, 0],
    probes: { locate: [7, 13], rescue: [13, 7] },
    kinds: s('locate:7:unrateable:screen-capped locate:13:unrateable:screen-capped rescue:13:rated rescue:7:rated'),
    other: ['no-window'],
    seamCalls: ['screen:7', 'screen:13', 'canon:13', 'canon:7'],
    charges: [760000000, 760000000, 1, 1],
  },
  {
    name: 'heuristic', spec: { prior: 2, screen: capAll, canon: () => synthetic(90) }, ok: false, reason: 'not-in-band',
    igNoWindow: 'above', igWindow: null, skips: null, counters: [5, 4, 0],
    probes: { locate: [2, 3, 5, 9, 13], rescue: [13, 9, 5, 3] },
    kinds: s('locate:2:unrateable:screen-capped locate:3:unrateable:screen-capped locate:5:unrateable:screen-capped locate:9:unrateable:screen-capped locate:13:unrateable:screen-capped rescue:13:rated rescue:9:rated rescue:5:rated rescue:3:rated'),
    other: ['no-window'],
    seamCalls: s('screen:2 screen:3 screen:5 screen:9 screen:13 canon:13 canon:9 canon:5 canon:3'),
    charges: [760000000, 760000000, 760000000, 760000000, 760000000, 1, 1, 1, 1],
  },
  {
    name: 'rebracketed', spec: { screen: capAll, canon: REBRACKETED_CANON }, ok: false, reason: 'not-in-band',
    igWindow: null, skips: null, counters: [49, 2, 2],
    probes: {
      locate: [7, 13, 1, 4, 5, 6], rescue: [13, 7],
      window: [...WINDOW_7_TO_12, 13, 13, 13],
      seed: x(16, 7), rerate: [7, 7],
    },
    kinds: [
      ...kU('locate', 7), ...kU('locate', 13), ...kR('rescue', 13), ...kR('rescue', 7),
      ...kU('locate', 1), ...kU('locate', 4), ...kU('locate', 5), ...kU('locate', 6),
      ...kU('window', 7, 4), ...kU('window', 8, 4), ...kU('window', 9, 4), ...kU('window', 10, 4),
      ...kU('window', 11, 4), ...kU('window', 12, 4), ...kU('window', 13, 3),
      ...kU('seed', 7, 16), ...kR('rerate', 7, 2),
    ],
    other: [],
    seamCalls: [
      ...scr(7), ...scr(13), ...can(13), ...can(7), ...scr(1), ...scr(4), ...scr(5), ...scr(6),
      ...scr(7, 4), ...scr(8, 4), ...scr(9, 4), ...scr(10, 4), ...scr(11, 4), ...scr(12, 4), ...scr(13, 3),
      ...scr(7, 16), ...can(7, 2),
    ],
    charges: [760000000, 760000000, 1, 1, ...x(47, 760000000), 1, 1],
  },
  {
    name: 'rescuedin', spec: { screen: capAll, canon: (/** @type {number} */ c) => synthetic(c === 13 ? 60 : 90) },
    ok: true, reason: null, clues: 13, score: 60,
    igWindow: { c0: 7, wc: 13, hit: 13, hiBelow: null, loAbove: null, probes: 2, result: 'hit', proof: 'rescued-in' },
    skips: { subsets: [], repairs: [] }, counters: [2, 2, 0],
    probes: { locate: [7, 13], rescue: [13, 7] },
    kinds: s('locate:7:unrateable:screen-capped locate:13:unrateable:screen-capped rescue:13:rated rescue:7:rated'),
    other: ['selected'],
    seamCalls: ['screen:7', 'screen:13', 'canon:13', 'canon:7'],
    charges: [760000000, 760000000, 1, 1],
  },
  {
    name: 'rescuedrefused',
    spec: { screen: capAll, canon: (/** @type {number} */ c) => (c === 13 ? synthetic(60, { Gproved: 0 }) : synthetic(90)) },
    ok: false, reason: 'not-in-band', igWindow: null, skips: null, counters: [21, 2, 2],
    probes: { locate: [7, 13], rescue: [13, 7], window: x(4, 13), seed: x(15, 13), rerate: [13, 13] },
    kinds: [
      ...kU('locate', 7), ...kU('locate', 13), ...kJ('rescue', 13), ...kR('rescue', 7),
      ...kU('window', 13, 4), ...kU('seed', 13, 15), ...kJ('rerate', 13, 2),
    ],
    other: [],
    seamCalls: [...scr(7), ...scr(13), ...can(13), ...can(7), ...scr(13, 19), ...can(13, 2)],
    charges: [760000000, 760000000, 1, 1, ...x(19, 760000000), 1, 1],
  },
  {
    name: 'require-rebracketed', spec: { uniqueness: 'require', screen: capAll, canon: REBRACKETED_CANON },
    ok: false, reason: 'not-in-band', igWindow: null, skips: null, counters: [50, 2, 2],
    probes: {
      locate: [7, 13, 1, 4, 5, 6], rescue: [13, 7],
      window: [...WINDOW_7_TO_12, 13, 13, 13, 13],
      seed: x(16, 7), rerate: [7, 7],
    },
    kinds: [
      ...kU('locate', 7), ...kU('locate', 13), ...kR('rescue', 13), ...kR('rescue', 7),
      ...kU('locate', 1), ...kU('locate', 4), ...kU('locate', 5), ...kU('locate', 6),
      ...kU('window', 7, 4), ...kU('window', 8, 4), ...kU('window', 9, 4), ...kU('window', 10, 4),
      ...kU('window', 11, 4), ...kU('window', 12, 4), ...kU('window', 13, 4),
      ...kU('seed', 7, 16), ...kR('rerate', 7, 2),
    ],
    other: [],
    seamCalls: [
      ...scr(7), ...scr(13), ...can(13), ...can(7), ...scr(1), ...scr(4), ...scr(5), ...scr(6),
      ...scr(7, 4), ...scr(8, 4), ...scr(9, 4), ...scr(10, 4), ...scr(11, 4), ...scr(12, 4), ...scr(13, 4),
      ...scr(7, 16), ...can(7, 2),
    ],
    charges: [760000000, 760000000, 1, 1, ...x(48, 760000000), 1, 1],
  },
  {
    name: 'require-down', spec: { uniqueness: 'require', screen: DOWN }, ok: true, reason: null, clues: 4, score: 60,
    igWindow: { c0: 7, wc: 4, hit: 4, hiBelow: 7, loAbove: 1, probes: 3, result: 'hit', proof: null },
    skips: { subsets: [], repairs: [] }, counters: [1, 0, 0],
    probes: { locate: [7, 1, 4], window: [4, 4] },
    kinds: s('locate:7:rated locate:1:unrateable:screen-capped locate:4:rated window:4:rated window:4:rated'),
    other: ['repair', 'repair', 'selected'],
    seamCalls: s('screen:7 screen:1 screen:4 screen:4 canon:5 screen:4'),
    charges: [1, 760000000, 1, 10000, 1, 513, 154, 1, 1, 418],
  },
];

describe('gen-v4 frozen vectors (K = 15)', () => {
  test('the K = 15 set is the frozen one', () => {
    assert.equal(k15().set.pieces.length, 15);
  });

  for (const c of VECTORS) {
    test(c.name, () => {
      const r = run(c.name, c.spec);
      assert.equal(r.error, null);
      const res = r.result;
      assert.equal(res.ok, c.ok);
      assert.equal(res.reason ?? null, c.reason);
      assert.equal(res.igNoWindow ?? null, c.igNoWindow ?? null);
      if (c.ok) {
        assert.equal(res.clues.length, c.clues);
        assert.equal(res.rating.score, c.score);
      }
      assert.deepEqual(res.igWindow ?? null, c.igWindow);
      assert.deepEqual(res.skips ?? null, c.skips);
      assert.deepEqual(res.counters, {
        budgetStops: 0, screenCapped: c.counters[0], rescueReratings: c.counters[1], tailReratings: c.counters[2],
      });
      assert.deepEqual(observables(r), {
        probes: c.probes, kinds: c.kinds, other: c.other, seamCalls: c.seamCalls, charges: c.charges,
      });
    });
  }

  test('observers do not change the result (P2-T03)', () => {
    const summed = /** @param {number[]} charges */ (charges) => charges.reduce((sum, u) => sum + u, 0);
    /** @param {any} res */
    const view = (res) => ({
      ok: res.ok, clues: res.clues?.length ?? null, score: res.rating?.score ?? null, skips: res.skips ?? null,
      igWindow: res.igWindow ?? null, counters: res.counters,
    });
    const cases = [
      ['require-rebracketed', { uniqueness: 'require', screen: capAll, canon: REBRACKETED_CANON }, 38000000004],
      ['require-down', { uniqueness: 'require', screen: DOWN }, 760011090],
    ];
    for (const [name, spec, sum] of /** @type {[string, Record<string, any>, number][]} */ (cases)) {
      const bare = run(name, { ...spec, observers: 'none' });
      const metered = run(name, { ...spec, observers: 'charge' });
      const full = run(name, { ...spec, observers: 'both' });
      for (const r of [bare, metered, full]) {
        assert.equal(r.error, null);
      }
      assert.deepEqual(view(metered.result), view(bare.result));
      assert.deepEqual(view(full.result), view(bare.result));
      assert.deepEqual([bare.charges, bare.events], [[], []]);
      assert.equal(summed(metered.charges), sum);
      assert.equal(summed(full.charges), sum);
      assert.deepEqual(metered.charges, full.charges);
    }
  });

  test('a throwing charge propagates at once', () => {
    const error = new Error('charge-stop');
    const r = run('throw-charge', {
      screen: capAll, canon: REBRACKETED_CANON, throwCharge: { at: 3, error },
    });
    assert.equal(r.error, error);
    assert.equal(r.result, null);
    assert.deepEqual(r.charges, [760000000, 760000000, 1]);
    assert.equal(r.events.length, 2);
    assert.deepEqual(observables(r).kinds, s('locate:7:unrateable:screen-capped locate:13:unrateable:screen-capped'));
    assert.deepEqual(r.log, ['screen:7', 'screen:13', 'canon:13']);
  });

  test('a throwing record propagates at once', () => {
    const error = new Error('record-stop');
    const r = run('throw-record', {
      screen: capAll, canon: REBRACKETED_CANON, throwRecord: { at: 2, error },
    });
    assert.equal(r.error, error);
    assert.equal(r.result, null);
    assert.equal(r.events.length, 2);
    assert.deepEqual(r.charges, [760000000, 760000000]);
    assert.deepEqual(observables(r).kinds, s('locate:7:unrateable:screen-capped locate:13:unrateable:screen-capped'));
    assert.deepEqual(r.log, ['screen:7', 'screen:13']);
  });
});
