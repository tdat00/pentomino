// @ts-check
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boardFromRows } from '../core/engine/board.js';
import {
  completeDiagnostic, IncompleteRatingError, rate, rateDetailed, rateLean, rateWithLimits, screenCertified,
} from '../core/engine/difficulty.js';
import { DEDUCE } from '../core/engine/policy.js';
import { createWorkspace, MAIN_WORKSPACE_BYTES } from '../core/engine/workspace.js';
import { CLUE_RECIPES, RECIPE_BOARD_ROWS, recipeWitness } from './fixtures/clue-recipes.js';
import { CLASSIC_PENTOMINOES } from './fixtures/polyominoes.js';

/** @typedef {import('../core/engine/types.js').Piece} Piece */
/** @typedef {import('../core/engine/types.js').Pose} Pose */

const ws = createWorkspace(MAIN_WORKSPACE_BYTES);
const board = boardFromRows([...RECIPE_BOARD_ROWS]);
const pieces = /** @type {Piece[]} */ ([...CLASSIC_PENTOMINOES]);
const witness = recipeWitness();

/** @returns {[string, Pose[]][]} */
function recipes() {
  return Object.entries(CLUE_RECIPES).map(([id, recipe]) => [id, witness.filter((p) => recipe.pieces.includes(p.piece))]);
}

test('at the canonical limit the screen rating is the canonical rating', () => {
  for (const [id, clues] of recipes()) {
    const lean = rateWithLimits(board, pieces, clues, ws, DEDUCE.work, 'lean');
    assert.deepEqual(lean.rating, rateLean(board, pieces, clues, ws), id);
    assert.equal(lean.detail, null, id);
    const full = rateWithLimits(board, pieces, clues, ws, DEDUCE.work, 'full');
    assert.deepEqual(full.rating, rate(board, pieces, clues, ws), id);
    assert.equal(full.detail, null, id);
    const detailed = rateWithLimits(board, pieces, clues, ws, DEDUCE.work, 'detailed');
    assert.deepEqual(detailed, rateDetailed(board, pieces, clues, ws), id);
  }
});

test('a certified screen rating equals the canonical rating', () => {
  for (const [id, clues] of recipes()) {
    const { metrics } = rate(board, pieces, clues, ws);
    const w = metrics.work - metrics.censusWork;
    assert.ok(w >= 1, `${id}: main work ${w}`);
    const screen = rateWithLimits(board, pieces, clues, ws, w, 'lean').rating;
    assert.equal(screenCertified(screen.metrics, w), true, id);
    assert.deepEqual(screen, rateLean(board, pieces, clues, ws), id);
  }
});

test('below its main work a rating is screen-capped or capped', () => {
  for (const [id, clues] of recipes()) {
    const { metrics } = rate(board, pieces, clues, ws);
    if (metrics.work - metrics.censusWork <= 1) {
      continue;
    }
    let screen;
    try {
      screen = rateWithLimits(board, pieces, clues, ws, 1, 'lean').rating;
    } catch (error) {
      assert.ok(error instanceof IncompleteRatingError, `${id}: ${error}`);
      continue;
    }
    assert.equal(screenCertified(screen.metrics, 1), false, id);
  }
});

test('P6 composes: a completed lean screen rating equals rate', () => {
  for (const [id, clues] of recipes()) {
    const lean = rateWithLimits(board, pieces, clues, ws, DEDUCE.work, 'lean').rating;
    assert.deepEqual(completeDiagnostic(board, pieces, clues, lean, ws), rate(board, pieces, clues, ws), id);
  }
});

test('an invalid limit throws', () => {
  const clues = recipes()[0][1];
  for (const work of [0, 1.5, DEDUCE.work + 1]) {
    assert.throws(() => rateWithLimits(board, pieces, clues, ws, work, 'lean'), RangeError, String(work));
  }
});
