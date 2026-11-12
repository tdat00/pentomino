// @ts-check
// Quick part of the difficulty-v3 tests (design §7.10): the pure score formula, its production knobs and the mapping
// from a deduction result to the formula's inputs. The slow part (generation orders the levels) belongs to the
// calibration task.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { boardFromRows } from '../core/engine/board.js';
import { measureDeduction } from '../core/engine/deduce.js';
import { breakdownV3, scoreV3 } from '../core/engine/difficulty.js';
import { DEDUCE, SCORE_V3 } from '../core/engine/policy.js';
import { buildModel } from '../core/engine/tiling.js';
import { createWorkspace, MAIN_WORKSPACE_BYTES } from '../core/engine/workspace.js';
import { CLUE_RECIPES, RECIPE_BOARD_ROWS, recipeWitness } from './fixtures/clue-recipes.js';
import { CLASSIC_PENTOMINOES } from './fixtures/polyominoes.js';

/** @typedef {import('../core/engine/types.js').Piece} Piece */
/** @typedef {import('../core/engine/types.js').Pose} Pose */
/** @typedef {import('../core/engine/deduce.js').DeductionResult} DeductionResult */
/** @typedef {import('../core/engine/difficulty.js').ScoreInputV3} ScoreInputV3 */
/** @typedef {{ board: import('../core/engine/types.js').Board, pieces: Piece[], clues: Pose[] }} Puzzle */

// The starting values of RES-18: test vectors only, always passed explicitly.
const START = Object.freeze({
  model: 'difficulty-v3',
  base: Object.freeze({ max: 12, scale: 6 }),
  rule: Object.freeze([0, 0, 2, 4]),
  weights: Object.freeze({ G: 6, info: 4 }),
  penalty: Object.freeze({ few: 2, many: 4 }),
});

const TERMS = /** @type {const} */ (['base', 'rule', 'guess', 'penalty', 'unrounded']);

/** `[id, U, deductionTier, G, info, solutions, base, rule, guess, penalty, unrounded, score]` of the analysts' reference. */
const VECTORS = /** @type {const} */ ([
  ['W1', 6, 1, 1, 1, 'unique', 7.585447, 0, 10, 0, 17.585447, 18],
  ['W2', 6, 2, 1, 1, 'unique', 7.585447, 2, 10, 0, 19.585447, 20],
  ['W3', 6, 3, 1, 1, 'unique', 7.585447, 4, 10, 0, 21.585447, 22],
  ['W4', 6, 1, 2, 2, 'unique', 7.585447, 0, 20, 0, 27.585447, 28],
  ['W5', 6, 2, 2, 2, 'unique', 7.585447, 2, 20, 0, 29.585447, 30],
  ['W6', 6, 3, 2, 2, 'unique', 7.585447, 4, 20, 0, 31.585447, 32],
  ['Z0', 0, 0, 0, 0, 'unique', 0, 0, 0, 0, 0, 0],
  ['G0a', 200, 3, 0, 0, 'unique', 12, 4, 0, 0, 16, 16],
  ['G0b', 200, 3, 0, 0, 'few', 12, 4, 0, 2, 14, 14],
  ['G0c', 200, 3, 0, 0, 'many', 12, 4, 0, 4, 12, 12],
  ['G0d', 5, 2, 0, 0, 'unknown', 6.784821, 2, 0, 0, 8.784821, 9],
  ['L3', 7, 3, 2, 1 + Math.log2(3), 'unique', 8.263161, 4, 22.33985, 0, 34.603011, 35],
  ['P1', 1, 0, 0, 0, 'many', 1.842219, 0, 0, 4, -2.157781, 0],
]);

describe('breakdownV3 and scoreV3', () => {
  test('the formula vectors W1-P1 under the starting knobs: every term, one rounding', () => {
    for (const [id, U, deductionTier, G, info, solutions, base, rule, guess, penalty, unrounded, score] of VECTORS) {
      const got = breakdownV3({ U, deductionTier, G, info, solutions }, START);
      assert.deepEqual(Object.keys(got), [...TERMS, 'score'], id);
      const want = { base, rule, guess, penalty, unrounded };
      for (const term of TERMS) {
        assert.ok(Math.abs(got[term] - want[term]) < 1e-6, `${id} ${term}: ${got[term]} against ${want[term]}`);
      }
      assert.equal(got.score, score, id);
    }
  });

  test('G = 0 never reaches the Hard edge 17; terms, order, rounding and penalty hold on the whole grid', () => {
    const solutionsList = /** @type {const} */ (['unique', 'few', 'many', 'unknown']);
    let tuples = 0;
    for (const knobs of [SCORE_V3, START]) {
      for (const U of [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 400]) {
        for (const deductionTier of /** @type {const} */ ([0, 1, 2, 3])) {
          for (const G of [0, 1, 2, 3, 5, 8]) {
            const infos = G === 0 ? [0] : [G, G * Math.log2(3), G * 3.5, G * Math.log2(28)];
            for (const info of infos) {
              for (const solutions of solutionsList) {
                const m = { U, deductionTier, G, info, solutions };
                const id = JSON.stringify(m);
                const got = breakdownV3(m, knobs);
                assert.equal(got.base, knobs.base.max * (1 - Math.exp(-U / knobs.base.scale)), id);
                assert.equal(got.rule, knobs.rule[deductionTier], id);
                assert.equal(got.guess, knobs.weights.G * G + knobs.weights.info * info, id);
                const penalty = { unique: 0, few: knobs.penalty.few, many: knobs.penalty.many, unknown: 0 }[solutions];
                assert.equal(got.penalty, penalty, id);
                assert.equal(got.unrounded, got.base + got.rule + got.guess - got.penalty, id);
                assert.equal(got.score, U === 0 ? 0 : Math.max(0, Math.round(got.unrounded)), id);
                assert.ok(Number.isInteger(got.score) && got.score >= 0 && !Object.is(got.score, -0), id);
                if (G === 0) {
                  assert.ok(got.score <= 16, `${id}: a puzzle without a decisive guess scored ${got.score}`);
                }
                if (knobs === SCORE_V3) {
                  assert.equal(scoreV3(m), got.score, id);
                  assert.deepEqual(breakdownV3(m), got, id);
                }
                tuples += 1;
              }
            }
          }
        }
      }
    }
    assert.equal(tuples, 2 * 13 * 4 * 21 * 4);
  });

  test('a JSON round trip of the metrics gives the same breakdown and score, info unquantised', () => {
    const base = breakdownV3({ U: 6, deductionTier: 2, G: 1, info: 1, solutions: 'unique' }, START).base;
    // Unrounded 20.4999999995: within 1e-9 of the half-integer 20.5, so the score rounds down to 20.
    const nearHalf = (20.5 - 5e-10 - (base + 2 + 6)) / 4;
    const cases = [
      { knobs: SCORE_V3, m: { U: 7, deductionTier: 3, G: 2, info: 1 + Math.log2(3), solutions: 'many' } },
      { knobs: START, m: { U: 7, deductionTier: 3, G: 2, info: 1 + Math.log2(3), solutions: 'many' } },
      { knobs: START, m: { U: 6, deductionTier: 2, G: 1, info: nearHalf, solutions: 'unique' } },
    ];
    for (const { knobs, m } of cases) {
      // The other fields of a stored rating are ignored by the formula.
      const stored = { ...m, R: 30, H: 2.5, B: 1, rules: { R1: 3 }, censusComplete: true };
      const back = JSON.parse(JSON.stringify(stored));
      assert.ok(Object.is(back.info, m.info), `info ${m.info}`);
      assert.deepEqual(breakdownV3(back, knobs), breakdownV3(m, knobs));
      assert.equal(breakdownV3(back, knobs).score, breakdownV3(m, knobs).score);
    }
    const near = breakdownV3(cases[2].m, START);
    assert.ok(Math.abs(near.unrounded - 20.5) < 1e-9 && near.unrounded < 20.5, `${near.unrounded}`);
    assert.equal(near.score, 20);
    assert.ok(Math.abs(nearHalf - 1.2286383) < 1e-6, `${nearHalf}`);
  });

  test('worked examples of the production knobs: U = 6, binary guesses, unique', () => {
    // base = 12 (1 - e^-2) = 10.3760; guess = 5 G + 0.5 info with info = G; rule 0 for tier 1, 2 for tiers 2 and 3.
    const examples = /** @type {const} */ ([
      [1, 1, 16], [1, 2, 21], [2, 1, 18], [2, 2, 23], [3, 1, 18], [3, 2, 23],
    ]);
    for (const [deductionTier, G, score] of examples) {
      const m = { U: 6, deductionTier, G, info: G, solutions: /** @type {const} */ ('unique') };
      const got = breakdownV3(m);
      assert.ok(Math.abs(got.base - 10.376) < 1e-3, `tier ${deductionTier} G ${G}`);
      assert.equal(got.guess, 5.5 * G);
      assert.equal(got.rule, deductionTier === 1 ? 0 : 2);
      assert.equal(got.score, score, `tier ${deductionTier} G ${G}: ${got.unrounded}`);
      assert.equal(scoreV3(m), score);
    }
  });

  test('invalid inputs throw a RangeError', () => {
    const valid = { U: 6, deductionTier: 1, G: 1, info: 1, solutions: 'unique' };
    /** @type {[string, Record<string, unknown>][]} */
    const invalid = [
      ['U = -1', { U: -1 }],
      ['U = 1.5', { U: 1.5 }],
      ['U = "6"', { U: '6' }],
      ['tier 4', { deductionTier: 4 }],
      ['tier -1', { deductionTier: -1 }],
      ['tier 1.5', { deductionTier: 1.5 }],
      ['G = -1', { G: -1 }],
      ['G = 1.5', { G: 1.5 }],
      ['info = NaN', { info: NaN }],
      ['info = Infinity', { info: Infinity }],
      ['info = -1', { info: -1 }],
      ['G = 0 with info 1', { G: 0, info: 1 }],
      ['solutions "two"', { solutions: 'two' }],
      ['solutions "none"', { solutions: 'none' }],
    ];
    assert.doesNotThrow(() => breakdownV3(valid));
    for (const [label, change] of invalid) {
      const m = /** @type {any} */ ({ ...valid, ...change });
      assert.throws(() => breakdownV3(m), RangeError, label);
      assert.throws(() => breakdownV3(m, START), RangeError, label);
      assert.throws(() => scoreV3(m), RangeError, label);
    }
  });
});

/** @param {string} id */
const classic = (id) => /** @type {Piece} */ (CLASSIC_PENTOMINOES.find((p) => p.id === id));
/**
 * @param {string} id
 * @param {[number, number][]} cells
 * @returns {Piece}
 */
const piece = (id, cells) => ({ id, label: id, color: '#000000', cells });

/**
 * @param {Puzzle} puzzle
 * @param {import('../core/engine/deduce.js').DeductionLimits} [limits]
 */
function measure(puzzle, limits = DEDUCE) {
  const model = buildModel(puzzle.board, puzzle.pieces, puzzle.clues, createWorkspace(MAIN_WORKSPACE_BYTES));
  return measureDeduction(model, limits);
}

/**
 * The mapping of the design (§7.10) from a complete deduction result to the inputs of the formula.
 * @param {Puzzle} puzzle
 * @param {DeductionResult} result
 * @returns {ScoreInputV3}
 */
function scoreInput(puzzle, result) {
  const first = /** @type {NonNullable<DeductionResult['first']>} */ (result.first);
  return {
    U: puzzle.pieces.length - puzzle.clues.length,
    deductionTier: first.deductionTier,
    G: first.G,
    info: first.info,
    solutions: /** @type {ScoreInputV3['solutions']} */ (result.count.solutions),
  };
}

describe('the deduction result as the input of the score', () => {
  test('an unfinished census gives an upper estimate between the decisive and the raw values (CF1)', () => {
    const puzzle = {
      board: boardFromRows(['####', '####', '####']),
      pieces: [
        classic('F'), piece('M', [[0, 0]]), piece('L4', [[0, 0], [1, 0], [2, 0], [0, 1]]), piece('D', [[0, 0], [1, 0]]),
      ],
      clues: /** @type {Pose[]} */ ([]),
    };
    const estimate = measure(puzzle, { ...DEDUCE, census: 0 });
    const decisive = measure(puzzle);
    assert.equal(estimate.census?.complete, false);
    assert.equal(decisive.census?.complete, true);
    const first = /** @type {NonNullable<DeductionResult['first']>} */ (decisive.first);
    assert.deepEqual(first.choices, [11, 6]);
    assert.deepEqual(/** @type {NonNullable<DeductionResult['first']>} */ (estimate.first).choices, [11, 6]);

    const inputs = {
      decisive: scoreInput(puzzle, decisive),
      estimate: scoreInput(puzzle, estimate),
      raw: {
        ...scoreInput(puzzle, decisive),
        G: first.choices.length,
        info: first.choices.reduce((sum, c) => sum + Math.log2(c), 0),
      },
    };
    for (const input of Object.values(inputs)) {
      assert.deepEqual([input.U, input.deductionTier, input.G, input.solutions], [4, 3, 2, 'many']);
    }
    assert.deepEqual(
      [inputs.decisive.info, inputs.estimate.info, inputs.raw.info].map((v) => v.toFixed(4)),
      ['2.0444', '3.0444', '6.0444'],
    );
    assert.ok(Math.abs(inputs.estimate.info - (Math.log2(11 / 4) + Math.log2(3))) < 1e-12);

    const startScores = [inputs.decisive, inputs.estimate, inputs.raw].map((m) => breakdownV3(m, START).score);
    assert.deepEqual(startScores, [26, 30, 42]);
    const productionScores = [inputs.decisive, inputs.estimate, inputs.raw].map((m) => scoreV3(m));
    assert.ok(productionScores[0] <= productionScores[1] && productionScores[1] <= productionScores[2],
      productionScores.join(' '));
  });

  test('the six clue recipes: score of the mapped deduction result (characterisation under the fitted knobs)', () => {
    // Pinned for the knobs of SCORE_V3; they move when the knobs are fitted again, and no order is asserted.
    const expected = { 'very-easy': 8, easy: 9, normal: 12, hard: 24, expert: 30, master: 37 };
    assert.deepEqual(Object.keys(expected), Object.keys(CLUE_RECIPES));
    const pieces = [...CLASSIC_PENTOMINOES];
    for (const [level, want] of Object.entries(expected)) {
      const kept = CLUE_RECIPES[/** @type {keyof typeof CLUE_RECIPES} */ (level)].pieces;
      const puzzle = {
        board: boardFromRows([...RECIPE_BOARD_ROWS]),
        pieces,
        clues: recipeWitness().filter((pose) => kept.includes(pose.piece)),
      };
      const result = measure(puzzle);
      assert.equal(result.path, 'complete', level);
      assert.equal(scoreV3(scoreInput(puzzle, result)), want, level);
    }
  });
});
