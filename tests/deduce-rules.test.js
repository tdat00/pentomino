// @ts-check
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boardFromRows } from '../core/engine/board.js';
import { measureDeduction } from '../core/engine/deduce.js';
import { DEDUCE } from '../core/engine/policy.js';
import { buildModel, countSolutions, rowPose } from '../core/engine/tiling.js';
import { createWorkspace, MAIN_WORKSPACE_BYTES } from '../core/engine/workspace.js';
import { CLASSIC_PENTOMINOES } from './fixtures/polyominoes.js';

/** @typedef {import('../core/engine/types.js').Board} Board */
/** @typedef {import('../core/engine/types.js').Piece} Piece */
/** @typedef {import('../core/engine/types.js').Pose} Pose */
/** @typedef {{ board: Board, pieces: Piece[], clues: Pose[] }} Puzzle */

const rect = (/** @type {number} */ w, /** @type {number} */ h) => boardFromRows(Array(h).fill('#'.repeat(w)));
const pc = (/** @type {string} */ id, /** @type {[number, number][]} */ cells) =>
  ({ id, label: id, color: '#000000', cells });
const classic = (/** @type {string} */ id) => /** @type {Piece} */ (CLASSIC_PENTOMINOES.find((p) => p.id === id));
const M = pc('M', [[0, 0]]);
const D = pc('D', [[0, 0], [1, 0]]);
const D2 = pc('D2', [[0, 0], [1, 0]]);
const I3 = pc('I3', [[0, 0], [1, 0], [2, 0]]);
const L3 = pc('L3', [[0, 0], [1, 0], [0, 1]]);
const I4 = pc('I4', [[0, 0], [1, 0], [2, 0], [3, 0]]);
const O4 = pc('O4', [[0, 0], [1, 0], [0, 1], [1, 1]]);
const T4 = pc('T4', [[0, 0], [1, 0], [2, 0], [1, 1]]);
const [P, U, L] = [classic('P'), classic('U'), classic('L')];

/**
 * Each model is built on a fresh workspace.
 * @param {Puzzle} puzzle
 */
const build = (puzzle) =>
  buildModel(puzzle.board, puzzle.pieces, puzzle.clues, createWorkspace(MAIN_WORKSPACE_BYTES));

/**
 * @param {Puzzle} puzzle
 * @param {import('../core/engine/deduce.js').DeductionLimits} [limits]
 */
function measure(puzzle, limits = DEDUCE) {
  const model = build(puzzle);
  return { model, result: measureDeduction(model, limits, { verifyUndo: true }) };
}

/**
 * Rule boards B1-B4 and the R3 near-misses K1 and K2. `dlx` is the exact count; `expect` pins the values of the
 * default ladder (the fields it names are compared).
 * @type {{ id: string, puzzle: Puzzle, dlx: number, expect: Record<string, unknown> }[]}
 */
const BOARDS = [
  {
    id: 'B1',
    puzzle: { board: boardFromRows(['##.###', '##.###', '#.....']), pieces: [P, U, M], clues: [] },
    dlx: 2,
    expect: {
      path: 'complete', S: 2, solutions: 'few', exhausted: true, stop: 'exhausted', Gt: 1, nodes: 3,
      F: 2, R1: 1, R2: 0, R3: 1, R4: 4, R5: 0, R6: 0, E: 0, tier: 2, G: 1, choices: [2], Dmax: 1,
    },
  },
  {
    id: 'B2',
    puzzle: { board: rect(5, 1), pieces: [I4, M], clues: [] },
    dlx: 2,
    expect: {
      path: 'complete', S: 2, solutions: 'few', exhausted: true, stop: 'exhausted', Gt: 1, nodes: 3,
      F: 1, R1: 1, R2: 0, R3: 0, R4: 3, R5: 0, R6: 0, E: 0, tier: 2, G: 1, choices: [2],
    },
  },
  {
    id: 'B3',
    puzzle: { board: boardFromRows(['###', '###', '###', '.#.']), pieces: [O4, L3, I3], clues: [] },
    dlx: 2,
    expect: {
      path: 'complete', S: 2, solutions: 'few', exhausted: true, stop: 'exhausted', Gt: 1, nodes: 3,
      F: 2, R1: 2, R2: 0, R3: 0, R4: 19, R5: 4, R6: 0, E: 0, tier: 2, G: 1, choices: [2],
    },
  },
  {
    id: 'B4',
    puzzle: { board: boardFromRows(['###', '###', '.##', '.##']), pieces: [T4, L, M], clues: [] },
    dlx: 1,
    expect: {
      path: 'complete', S: 1, solutions: 'unique', exhausted: true, stop: 'exhausted', Gt: 0, nodes: 1,
      F: 3, R1: 3, R2: 0, R3: 0, R4: 2, R5: 4, R6: 2, E: 2, tier: 2, G: 0, choices: [],
    },
  },
  {
    id: 'K1',
    puzzle: { board: boardFromRows(['##.##', '##.##']), pieces: [O4, M, L3], clues: [] },
    dlx: 8,
    expect: {
      path: 'complete', S: 8, solutions: 'many', exhausted: false, stop: 'solution-limit', Gt: 3, nodes: 11,
      F: 1, R1: 1, R2: 0, R3: 0, R4: 0, R5: 0, R6: 0, E: 0, tier: 1, G: 2, choices: [2, 4], Dmax: 1,
    },
  },
  {
    id: 'K2',
    puzzle: { board: boardFromRows(['##.##', '##.##']), pieces: [O4, D, D2], clues: [] },
    dlx: 8,
    expect: {
      path: 'complete', S: 8, solutions: 'many', exhausted: false, stop: 'solution-limit', Gt: 3, nodes: 11,
      F: 1, R1: 1, R2: 0, R3: 0, R4: 0, R5: 0, R6: 0, E: 0, tier: 1, G: 2, choices: [2, 4], Dmax: 1,
    },
  },
];

/** @param {string} id */
const board = (id) => /** @type {(typeof BOARDS)[number]} */ (BOARDS.find((b) => b.id === id));

/**
 * The fields the tables pin, in one flat record.
 * @param {import('../core/engine/deduce.js').DeductionResult} result
 */
function flat(result) {
  const f = /** @type {NonNullable<typeof result.first>} */ (result.first);
  return {
    path: result.path, S: result.count.S, solutions: result.count.solutions, exhausted: result.count.exhausted,
    stop: result.search.stop, Gt: result.search.Gt, nodes: result.search.nodes,
    F: f.F, R1: f.rules.R1, R2: f.rules.R2, R3: f.rules.R3, R4: f.rules.R4, R5: f.rules.R5, R6: f.rules.R6,
    E: f.E, tier: f.deductionTier, G: f.G, choices: f.choices, Dmax: f.Dmax,
  };
}

/**
 * @param {string} id
 * @returns {{ model: import('../core/engine/tiling.js').Model, result: import('../core/engine/deduce.js').DeductionResult }}
 */
function check(id) {
  const b = board(id);
  const { model, result } = measure(b.puzzle);
  const actual = /** @type {Record<string, unknown>} */ (flat(result));
  for (const [key, value] of Object.entries(b.expect)) {
    assert.deepEqual(actual[key], value, `${id}: ${key}`);
  }
  const first = /** @type {NonNullable<typeof result.first>} */ (result.first);
  assert.equal(first.rows.length, first.F + first.G, id);
  assert.equal(first.rules.R7 + first.rules.R8 + first.rules.R9, 0, id);
  return { model, result };
}

test('R3 places the only piece that fills a pocket (B1), first of all', () => {
  const { model, result } = check('B1');
  const first = /** @type {NonNullable<typeof result.first>} */ (result.first);
  assert.deepEqual(rowPose(model, first.rows[0]), { piece: 'P', x: 0, y: 0, turn: 3, mirrored: true });
});

test('R4: a piece that must cover a cell keeps the other pieces off it (B2)', () => {
  check('B2');
});

test('R5: a cell that only one piece can reach claims that piece (B3, B4)', () => {
  check('B3');
  check('B4');
});

test('R3 near-misses: a pocket that two pieces could fill is not placed (K1, K2)', () => {
  for (const id of ['K1', 'K2']) {
    const { result } = check(id);
    assert.equal(result.first?.rules.R3, 0, id);
  }
});

/** @type {Record<'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6', Puzzle>} */
const V_PUZZLES = {
  V1: { board: rect(3, 2), pieces: [P, M], clues: [{ piece: 'M', x: 0, y: 0, turn: 0, mirrored: false }] },
  V2: { board: rect(3, 1), pieces: [M, D], clues: [] },
  V3: { board: rect(10, 1), pieces: [M, D, I3, I4], clues: [] },
  V4: { board: rect(2, 2), pieces: [D, D2], clues: [] },
  V5: { board: rect(3, 2), pieces: [I3, L3], clues: [] },
  V6: { board: boardFromRows(['#...#', '#...#', '##.##']), pieces: [D, I3, L3], clues: [] },
};

test('soundness oracle: the deduction count equals the DLX count, with and without the lookahead', () => {
  const puzzles = [...BOARDS.map((b) => b.puzzle), ...Object.values(V_PUZZLES)];
  let multiple = 0;
  for (const [index, puzzle] of puzzles.entries()) {
    const model = build(puzzle);
    const expected = countSolutions(model, { cap: Infinity, rowTrialLimit: Infinity }).found;
    for (const lookaheadWidth of [DEDUCE.lookaheadWidth, 0]) {
      const limits = { ...DEDUCE, lookaheadWidth, solutions: Math.max(2, expected + 1) };
      const r = measureDeduction(model, limits, { verifyUndo: true });
      assert.equal(r.count.S, expected, `puzzle ${index}, width ${lookaheadWidth}`);
      assert.equal(r.count.exhausted, true, `puzzle ${index}, width ${lookaheadWidth}`);
    }
    multiple += expected > 1 ? 1 : 0;
  }
  assert.ok(multiple >= 7, `${multiple} puzzles with several solutions`);
});

test('labelled pieces: two dominoes are two pieces and every arrangement counts per piece (K2, V4, D + D2)', () => {
  // The third puzzle: a pocket that D or D2 fills has two placements, so R3 places neither.
  const pockets = { board: boardFromRows(['##.##']), pieces: [D, D2], clues: [] };
  for (const [puzzle, dlx, pieces] of [[board('K2').puzzle, 8, 3], [V_PUZZLES.V4, 4, 2], [pockets, 2, 2]]) {
    const model = build(/** @type {Puzzle} */ (puzzle));
    assert.equal(model.freePieceCount, pieces);
    assert.equal(countSolutions(model, { cap: Infinity, rowTrialLimit: Infinity }).found, dlx);
    const r = measureDeduction(model, { ...DEDUCE, solutions: dlx + 1 });
    assert.equal(r.count.S, dlx);
    assert.equal(r.count.exhausted, true);
    assert.equal(r.first?.rules.R3, 0);
  }
});
