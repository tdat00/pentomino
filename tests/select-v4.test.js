// @ts-check
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { boardFromRows, rectangle } from '../core/engine/board.js';
import { selectClues, selectCluesV3 } from '../core/engine/clues.js';
import { inBand } from '../core/engine/difficulty.js';
import { level } from '../core/engine/levels.js';
import { createRng } from '../core/engine/rng.js';
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
