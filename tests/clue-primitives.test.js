// @ts-check
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boardFromRows } from '../core/engine/board.js';
import * as prim from '../core/engine/clue-primitives.js';
import * as clues from '../core/engine/clues.js';
import { level } from '../core/engine/levels.js';
import { createRng } from '../core/engine/rng.js';
import { createWorkspace, MAIN_WORKSPACE_BYTES } from '../core/engine/workspace.js';
import { RECIPE_BOARD_ROWS, recipeWitness } from './fixtures/clue-recipes.js';
import { CLASSIC_PENTOMINOES } from './fixtures/polyominoes.js';

/** @typedef {import('../core/engine/types.js').Piece} Piece */

test('clues.js re-exports the same primitives', () => {
  assert.equal(clues.certify, prim.certify);
  assert.equal(clues.countRowLimit, prim.countRowLimit);
  assert.equal(clues.makeUnique, prim.makeUnique);
  assert.equal(clues.SkipReplayError, prim.SkipReplayError);
});

test('the dispatcher returns today\'s search result', () => {
  const ws = createWorkspace(MAIN_WORKSPACE_BYTES);
  const make = () => ({
    board: boardFromRows([...RECIPE_BOARD_ROWS]),
    pieces: /** @type {Piece[]} */ ([...CLASSIC_PENTOMINOES]),
    layout: recipeWitness(),
    target: level('normal'),
    rng: createRng('p2-02'),
    uniqueness: /** @type {const} */ ('any'),
    excludeClueKeys: new Set(),
    ws,
  });
  const result = clues.selectClues(make());
  assert.ok(result.ok);
  assert.deepEqual(result, clues.selectCluesV3(make()));
});

test('ranked orders by band distance, centre, key', () => {
  const band = { min: 10, max: 20 };
  /**
   * @param {string} key
   * @param {number} score
   * @returns {import('../core/engine/clue-primitives.js').Candidate}
   */
  const candidate = (key, score) => /** @type {any} */ ({ key, rating: { score }, idx: [], clues: [], seq: 0 });
  const below = candidate('a', 5);
  const inside = candidate('b', 14);
  const above = candidate('c', 25);
  assert.deepEqual(prim.ranked(band, [above, below, inside]), [inside, below, above]);
  const centreLate = candidate('z', 15);
  const centreFirst = candidate('d', 15);
  assert.deepEqual(prim.ranked(band, [above, centreLate, inside, centreFirst, below]),
    [centreFirst, centreLate, inside, below, above]);
});
