// @ts-check
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boardFromRows } from '../core/engine/board.js';
import { measureDeduction } from '../core/engine/deduce.js';
import { poseCells } from '../core/engine/geometry.js';
import { DEDUCE } from '../core/engine/policy.js';
import { createRng } from '../core/engine/rng.js';
import {
  assertLive, buildModel, countSolutions, isValidLayout, ModelError, rowPose,
} from '../core/engine/tiling.js';
import { createWorkspace, MAIN_WORKSPACE_BYTES } from '../core/engine/workspace.js';
import { CLUE_RECIPES, RECIPE_BOARD_ROWS, recipeWitness } from './fixtures/clue-recipes.js';
import { CLASSIC_PENTOMINOES } from './fixtures/polyominoes.js';

/** @typedef {import('../core/engine/types.js').Board} Board */
/** @typedef {import('../core/engine/types.js').Piece} Piece */
/** @typedef {import('../core/engine/types.js').Pose} Pose */
/** @typedef {import('../core/engine/tiling.js').Model} Model */
/** @typedef {import('../core/engine/deduce.js').DeductionResult} DeductionResult */
/** @typedef {import('../core/engine/deduce.js').DeductionLimits} DeductionLimits */
/** @typedef {{ board: Board, pieces: Piece[], clues: Pose[] }} Puzzle */

const newWs = () => createWorkspace(MAIN_WORKSPACE_BYTES);
const rect = (/** @type {number} */ w, /** @type {number} */ h) => boardFromRows(Array(h).fill('#'.repeat(w)));
const pc = (/** @type {string} */ id, /** @type {[number, number][]} */ cells) =>
  ({ id, label: id, color: '#000000', cells });
const M = pc('M', [[0, 0]]);
const D = pc('D', [[0, 0], [1, 0]]);
const D2 = pc('D2', [[0, 0], [1, 0]]);
const I3 = pc('I3', [[0, 0], [1, 0], [2, 0]]);
const L3 = pc('L3', [[0, 0], [1, 0], [0, 1]]);
const I4 = pc('I4', [[0, 0], [1, 0], [2, 0], [3, 0]]);
const P = /** @type {Piece} */ (CLASSIC_PENTOMINOES.find((p) => p.id === 'P'));
const PENTOMINOES = /** @type {Piece[]} */ ([...CLASSIC_PENTOMINOES]);

/**
 * @param {Puzzle} puzzle
 * @param {DeductionLimits} [limits]
 * @param {import('../core/engine/deduce.js').DeductionDiagnostics} [diagnostics]
 */
function measure(puzzle, limits = DEDUCE, diagnostics = {}) {
  const model = buildModel(puzzle.board, puzzle.pieces, puzzle.clues, newWs());
  return { model, result: measureDeduction(model, limits, diagnostics) };
}

/**
 * @param {Model} model
 * @param {number} r
 */
const poseText = (model, r) => {
  const pose = rowPose(model, r);
  return `${pose.piece}@(${pose.x}, ${pose.y})`;
};

/**
 * Metric domain (RES-04): G counts the choices; no guess means no information, width or depth.
 * @param {DeductionResult} result
 */
function assertDomain(result) {
  if (result.first === null) {
    return;
  }
  const f = result.first;
  assert.equal(f.G, f.choices.length);
  assert.equal(f.info, f.choices.reduce((sum, c) => sum + Math.log2(c), 0));
  assert.equal(f.Cmax, f.choices.reduce((max, c) => Math.max(max, c), 0));
  assert.equal(f.rows.length, f.F + f.G);
  if (f.G === 0) {
    assert.deepEqual([f.info, f.Cmax, f.Dmax], [0, 0, 0]);
  }
}

/**
 * The fields the tables pin, in one flat record.
 * @param {Model} model
 * @param {DeductionResult} result
 */
function flat(model, result) {
  const f = result.first;
  return {
    path: result.path,
    S: result.count.S,
    solutions: result.count.solutions,
    exhausted: result.count.exhausted,
    stop: result.search.stop,
    Gt: result.search.Gt,
    nodes: result.search.nodes,
    ...(f === null ? {} : {
      F: f.F,
      E: f.E,
      R1: f.rules.R1,
      R2: f.rules.R2,
      R3: f.rules.R3,
      R4: f.rules.R4,
      R5: f.rules.R5,
      R6: f.rules.R6,
      R7: f.rules.R7,
      R8: f.rules.R8,
      R9: f.rules.R9,
      tier: f.deductionTier,
      G: f.G,
      choices: f.choices,
      info: Number(f.info.toFixed(4)),
      Cmax: f.Cmax,
      Dmax: f.Dmax,
      rows: f.rows.map((r) => poseText(model, r)),
    }),
  };
}

/**
 * @param {Model} model
 * @param {DeductionResult} result
 * @param {Record<string, unknown>} expected Only the fields it names are compared.
 * @param {string} label
 */
function assertFields(model, result, expected, label) {
  const actual = /** @type {Record<string, unknown>} */ (flat(model, result));
  for (const [key, value] of Object.entries(expected)) {
    assert.deepEqual(actual[key], value, `${label}: ${key}`);
  }
}

/** Statuses of a solve that finds exactly one solution and exhausts the search. */
const UNIQUE = { path: 'complete', S: 1, solutions: 'unique', exhausted: true, stop: 'exhausted' };

/**
 * Vectors V1-V7. A re-pin of a later task changes the tables only. `rows` holds `piece@(x, y)` where the
 * specification names poses and piece ids otherwise (`pieces`).
 * @type {{ id: string, puzzle: Puzzle, expect: Record<string, unknown> }[]}
 */
const VECTORS = [
  {
    id: 'V1',
    puzzle: {
      board: rect(3, 2), pieces: [P, M], clues: [{ piece: 'M', x: 0, y: 0, turn: 0, mirrored: false }],
    },
    expect: {
      ...UNIQUE, Gt: 0, nodes: 1, F: 1, R1: 1, R2: 0, E: 0, tier: 1, G: 0, info: 0, Cmax: 0, Dmax: 0, choices: [],
    },
  },
  {
    id: 'V2',
    puzzle: { board: rect(3, 1), pieces: [M, D], clues: [] },
    expect: {
      path: 'complete', S: 2, solutions: 'few', exhausted: true, stop: 'exhausted', Gt: 1, nodes: 3,
      F: 1, R1: 1, R2: 0, R3: 0, R4: 1, R5: 0, R6: 0, E: 0, tier: 2, G: 1, choices: [2], info: 1, Cmax: 2, Dmax: 0,
      rows: ['M@(0, 0)', 'D@(1, 0)'],
    },
  },
  {
    id: 'V3',
    puzzle: { board: rect(10, 1), pieces: [M, D, I3, I4], clues: [] },
    expect: {
      path: 'complete', S: 8, solutions: 'many', exhausted: false, stop: 'solution-limit', Gt: 7, nodes: 15,
      F: 1, R1: 1, R2: 0, R3: 0, R4: 1, R5: 0, R6: 3, R7: 3, R8: 6, R9: 0, E: 3, tier: 3, G: 3, choices: [4, 3, 2],
      info: 4.585, Cmax: 4, Dmax: 2,
      rows: ['M@(0, 0)', 'D@(1, 0)', 'I3@(3, 0)', 'I4@(6, 0)'],
    },
  },
  {
    id: 'V4',
    puzzle: { board: rect(2, 2), pieces: [D, D2], clues: [] },
    expect: {
      path: 'complete', S: 4, solutions: 'few', exhausted: true, stop: 'exhausted', Gt: 1, nodes: 5,
      F: 1, tier: 1, G: 1, choices: [4], info: 2, Cmax: 4,
    },
  },
  {
    id: 'V5',
    puzzle: { board: rect(3, 2), pieces: [I3, L3], clues: [] },
    expect: {
      path: 'none', S: 0, solutions: 'none', exhausted: true, stop: 'exhausted', Gt: 0, nodes: 1,
    },
  },
  {
    id: 'V6',
    puzzle: { board: boardFromRows(['#...#', '#...#', '##.##']), pieces: [D, I3, L3], clues: [] },
    expect: {
      path: 'none', S: 0, solutions: 'none', exhausted: true, stop: 'exhausted', Gt: 0, nodes: 1,
    },
  },
  {
    id: 'V7',
    puzzle: {
      board: boardFromRows([...RECIPE_BOARD_ROWS]), pieces: PENTOMINOES, clues: recipeWitness(),
    },
    expect: {
      ...UNIQUE, Gt: 0, nodes: 1, R1: 0, R2: 0, F: 0, E: 0, tier: 0, G: 0, info: 0, Cmax: 0, Dmax: 0,
      choices: [], rows: [],
    },
  },
];

/** @param {string} id */
const vector = (id) => /** @type {(typeof VECTORS)[number]} */ (VECTORS.find((v) => v.id === id));

/**
 * @param {Model} model
 * @param {Puzzle} puzzle
 * @param {DeductionResult} result
 */
function assertValidFirstPath(model, puzzle, result) {
  const first = /** @type {NonNullable<DeductionResult['first']>} */ (result.first);
  assert.equal(first.rows.length, model.freePieceCount);
  const layout = [...puzzle.clues, ...first.rows.map((r) => rowPose(model, r))];
  assert.ok(isValidLayout(puzzle.board, puzzle.pieces, layout));
}

test('vectors V1-V7 reproduce, with a valid first path and the metric domain', () => {
  for (const v of VECTORS) {
    const { model, result } = measure(v.puzzle);
    assertFields(model, result, v.expect, v.id);
    assertDomain(result);
    assert.equal(result.census, null, v.id);
    assert.deepEqual(Object.keys(result), ['path', 'first', 'search', 'count', 'census']);
    assert.deepEqual(Object.keys(result.search), ['Gt', 'nodes', 'work', 'stop']);
    assert.deepEqual(Object.keys(result.count), ['S', 'limit', 'exhausted', 'solutions']);
    assert.equal(result.count.limit, DEDUCE.solutions);
    if (result.first === null) {
      assert.equal(result.path, 'none', v.id);
      continue;
    }
    assert.deepEqual(Object.keys(result.first), [
      'F', 'E', 'rules', 'deductionTier', 'G', 'info', 'Cmax', 'Dmax', 'choices', 'rows', 'census',
    ]);
    assert.deepEqual(Object.keys(result.first.rules), ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9']);
    assert.deepEqual(result.first.census, []);
    assert.ok(Array.isArray(result.first.choices) && Array.isArray(result.first.rows));
    assertValidFirstPath(model, v.puzzle, result);
  }
  const v1 = measure(vector('V1').puzzle);
  assert.deepEqual(v1.result.first?.rows.map((r) => rowPose(v1.model, r).piece), ['P']);
});

/**
 * Caps C1-C10: `{ ...DEDUCE, <field>: <value> }` on a vector.
 * @type {{ id: string, vector: string, limits: Partial<DeductionLimits>, expect: Record<string, unknown> }[]}
 */
const CAPS = [
  { id: 'C1', vector: 'V2', limits: { nodes: 0 },
    expect: { path: 'capped', stop: 'node-cap', nodes: 0, Gt: 0, S: 0, solutions: 'unknown', exhausted: false } },
  { id: 'C2', vector: 'V2', limits: { nodes: 1 }, expect: { path: 'capped', stop: 'node-cap', nodes: 1, Gt: 1 } },
  { id: 'C3', vector: 'V2', limits: { nodes: 2 },
    expect: { path: 'complete', S: 1, solutions: 'unknown', stop: 'node-cap', nodes: 2, exhausted: false } },
  { id: 'C4', vector: 'V2', limits: { nodes: 3 }, expect: vector('V2').expect },
  { id: 'C5', vector: 'V2', limits: { work: 1 },
    expect: { path: 'capped', stop: 'work-cap', nodes: 0, Gt: 0, S: 0, solutions: 'unknown', exhausted: false } },
  { id: 'C6a', vector: 'V3', limits: { nodes: 1 }, expect: { path: 'capped', stop: 'node-cap' } },
  { id: 'C6b', vector: 'V3', limits: { nodes: 2 }, expect: { path: 'capped', stop: 'node-cap' } },
  { id: 'C6c', vector: 'V3', limits: { nodes: 3 }, expect: { path: 'capped', stop: 'node-cap' } },
  { id: 'C7', vector: 'V3', limits: { nodes: 4 },
    expect: { path: 'complete', S: 1, solutions: 'unknown', stop: 'node-cap' } },
  { id: 'C8', vector: 'V3', limits: { nodes: 5 },
    expect: { path: 'complete', S: 2, solutions: 'few', stop: 'node-cap' } },
  { id: 'C9', vector: 'V3', limits: { solutions: 2 },
    expect: { path: 'complete', S: 2, solutions: 'many', stop: 'solution-limit', nodes: 5, Gt: 3 } },
  { id: 'C10', vector: 'V3', limits: { solutions: 30 },
    expect: { path: 'complete', S: 24, solutions: 'few', exhausted: true, stop: 'exhausted', nodes: 41, Gt: 17 } },
];

test('caps C1-C10: statuses, node counts and no uniqueness from a cap', () => {
  for (const c of CAPS) {
    const v = vector(c.vector);
    const { model, result } = measure(v.puzzle, { ...DEDUCE, ...c.limits });
    assertFields(model, result, c.expect, c.id);
    assertDomain(result);
    if (result.path === 'capped') {
      assert.equal(result.first, null, c.id);
    }
    if (c.limits.nodes !== undefined) {
      assert.ok(result.search.nodes <= c.limits.nodes, c.id);
    }
    if (result.search.stop === 'node-cap' || result.search.stop === 'work-cap') {
      assert.notEqual(result.count.solutions, 'unique', c.id);
      assert.notEqual(result.count.solutions, 'none', c.id);
    }
  }
  const { result: base } = measure(vector('V2').puzzle);
  const c3 = measure(vector('V2').puzzle, { ...DEDUCE, nodes: 2 }).result;
  assert.deepEqual(c3.first, base.first);
  assert.deepEqual(measure(vector('V2').puzzle, { ...DEDUCE, nodes: 3 }).result, base);
  const c5 = measure(vector('V2').puzzle, { ...DEDUCE, work: 1 }).result;
  assert.ok(c5.search.work > 1);
  assert.equal(c5.search.stop, 'work-cap');
});

test('the work cap stops a search that has started and the work of a capped run is deterministic', () => {
  const puzzle = vector('V3').puzzle;
  const full = measure(puzzle, { ...DEDUCE, solutions: 30 }).result;
  const cap = Math.floor(full.search.work / 2);
  const a = measure(puzzle, { ...DEDUCE, solutions: 30, work: cap }).result;
  const b = measure(puzzle, { ...DEDUCE, solutions: 30, work: cap }).result;
  assert.equal(a.search.stop, 'work-cap');
  assert.ok(a.search.work > cap && a.search.work < full.search.work);
  assert.ok(a.search.nodes > 0 && a.search.nodes < full.search.nodes);
  assert.notEqual(a.count.solutions, 'unique');
  assert.deepEqual(a, b);
  assert.equal(a.count.exhausted, false);
});

/**
 * Recipes: columns U (free pieces), F (= R1 here), R4, R5, R7, R8 (rows killed), E (rows killed by R6), tier, G,
 * choices, info (4 decimals), Cmax, Dmax, Gt, nodes. R2, R3 and R9 are 0 in every recipe. Characterisation of this
 * ladder version, not a monotonicity theorem; later rules re-pin it.
 * @type {Record<string, { U: number, F: number, R4: number, R5: number, E: number, R7: number, R8: number,
 *   tier: number, G: number, choices: number[], info: string, Cmax: number, Dmax: number, Gt: number,
 *   nodes: number }>}
 */
const RECIPE_TABLE = {
  'very-easy': {
    U: 3, F: 3, R4: 0, R5: 0, E: 0, R7: 0, R8: 0, tier: 1, G: 0, choices: [], info: '0.0000', Cmax: 0, Dmax: 0,
    Gt: 0, nodes: 1,
  },
  easy: {
    U: 4, F: 4, R4: 0, R5: 0, E: 0, R7: 0, R8: 0, tier: 1, G: 0, choices: [], info: '0.0000', Cmax: 0, Dmax: 0,
    Gt: 0, nodes: 1,
  },
  normal: {
    U: 5, F: 5, R4: 9, R5: 0, E: 0, R7: 0, R8: 0, tier: 2, G: 0, choices: [], info: '0.0000', Cmax: 0, Dmax: 0,
    Gt: 0, nodes: 1,
  },
  hard: {
    U: 7, F: 5, R4: 19, R5: 0, E: 2, R7: 0, R8: 58, tier: 3, G: 2, choices: [2, 5], info: '3.3219', Cmax: 5,
    Dmax: 2, Gt: 2, nodes: 8,
  },
  expert: {
    U: 8, F: 5, R4: 9, R5: 0, E: 8, R7: 5, R8: 101, tier: 3, G: 3, choices: [2, 6, 2], info: '4.5850', Cmax: 6,
    Dmax: 4, Gt: 5, nodes: 18,
  },
  master: {
    U: 10, F: 6, R4: 0, R5: 45, E: 12, R7: 0, R8: 152, tier: 3, G: 4, choices: [4, 2, 7, 2], info: '6.8074', Cmax: 7,
    Dmax: 3, Gt: 37, nodes: 145,
  },
};

/**
 * @param {string} level
 * @returns {Puzzle}
 */
function recipePuzzle(level) {
  const kept = CLUE_RECIPES[/** @type {keyof typeof CLUE_RECIPES} */ (level)].pieces;
  return {
    board: boardFromRows([...RECIPE_BOARD_ROWS]),
    pieces: PENTOMINOES,
    clues: recipeWitness().filter((pose) => kept.includes(pose.piece)),
  };
}

test('the six recipes reproduce the pinned characterisation', () => {
  assert.deepEqual(Object.keys(RECIPE_TABLE), Object.keys(CLUE_RECIPES));
  for (const [level, want] of Object.entries(RECIPE_TABLE)) {
    const puzzle = recipePuzzle(level);
    const { model, result } = measure(puzzle);
    const first = /** @type {NonNullable<typeof result.first>} */ (result.first);
    assert.equal(model.freePieceCount, want.U, level);
    assert.deepEqual({ ...UNIQUE }, {
      path: result.path, S: result.count.S, solutions: result.count.solutions, exhausted: result.count.exhausted,
      stop: result.search.stop,
    }, level);
    assert.deepEqual([first.F, first.G, first.choices, first.info.toFixed(4), first.Cmax, first.Dmax],
      [want.F, want.G, want.choices, want.info, want.Cmax, want.Dmax], level);
    assert.deepEqual([result.search.Gt, result.search.nodes], [want.Gt, want.nodes], level);
    assert.deepEqual([first.E, first.deductionTier, first.rules.R1, first.rules.R2, first.rules.R6],
      [want.E, want.tier, want.F, 0, want.E], level);
    assert.deepEqual([first.rules.R3, first.rules.R4, first.rules.R5], [0, want.R4, want.R5], level);
    assert.deepEqual([first.rules.R7, first.rules.R8, first.rules.R9], [want.R7, want.R8, 0], level);
    assertDomain(result);
    assertValidFirstPath(model, puzzle, result);
  }
});

const NO_LOOKAHEAD = { ...DEDUCE, lookaheadWidth: 0 };

test('N1, N2: the R3 check alone proves V6 at the root, V5 needs R6 or a guess node', () => {
  const v6 = measure(vector('V6').puzzle, NO_LOOKAHEAD);
  assertFields(v6.model, v6.result, vector('V6').expect, 'N1');
  const v5 = measure(vector('V5').puzzle, NO_LOOKAHEAD);
  assertFields(v5.model, v5.result, { ...vector('V5').expect, Gt: 1, nodes: 3 }, 'N2');
});

test('N3: with lookaheadWidth 0 V2 and V3 have no R6 kills; V3 keeps its other values and R8 tries every neck', () => {
  const expected = {
    V2: { R4: 1, tier: 2 },
    V3: { R4: 1, R7: 3, R8: 9, tier: 3 },
  };
  for (const [id, values] of Object.entries(expected)) {
    const { model, result } = measure(vector(id).puzzle, NO_LOOKAHEAD);
    assertFields(model, result, { ...vector(id).expect, E: 0, R6: 0, ...values }, `N3 ${id}`);
  }
});

test('F counts R1-R3, E counts R6 and the tier is the highest tier with a count', () => {
  const puzzles = [...VECTORS.map((v) => v.puzzle), ...Object.keys(RECIPE_TABLE).map(recipePuzzle)];
  for (const puzzle of puzzles) {
    const first = measure(puzzle).result.first;
    if (first !== null) {
      const { R1, R2, R3, R4, R5, R6, R7, R8, R9 } = first.rules;
      assert.deepEqual([first.F, first.E], [R1 + R2 + R3, R6]);
      const tier = R7 + R8 + R9 > 0 ? 3 : R4 + R5 + R6 > 0 ? 2 : R1 + R2 + R3 > 0 ? 1 : 0;
      assert.equal(first.deductionTier, tier);
    }
  }
});

test('N4: lookahead trials restore the state exactly, also when the work cap stops one', () => {
  const puzzles = [vector('V2'), vector('V3'), vector('V5')].map((v) => v.puzzle)
    .concat(Object.keys(RECIPE_TABLE).map(recipePuzzle));
  for (const [index, puzzle] of puzzles.entries()) {
    for (const lookaheadWidth of [2, 4, 12]) {
      const limits = { ...DEDUCE, lookaheadWidth };
      assert.deepEqual(measure(puzzle, limits, { verifyUndo: true }).result, measure(puzzle, limits).result,
        `puzzle ${index}, width ${lookaheadWidth}`);
    }
  }
  for (const puzzle of [vector('V2').puzzle, vector('V5').puzzle]) {
    const full = measure(puzzle).result.search.work;
    let capped = 0;
    for (let work = 0; work < full; work += 1) {
      const limits = { ...DEDUCE, work };
      const checked = measure(puzzle, limits, { verifyUndo: true }).result;
      assert.deepEqual(checked, measure(puzzle, limits).result, `work cap ${work}`);
      capped += checked.search.stop === 'work-cap' ? 1 : 0;
    }
    assert.ok(capped > full / 2, `${capped} of ${full} caps stopped the run`);
  }
});

const SHAPES = [
  [[0, 0]], [[0, 0], [1, 0]], [[0, 0], [1, 0], [2, 0]], [[0, 0], [1, 0], [0, 1]],
  [[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 0], [1, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [2, 0], [0, 1]],
];

test('random oracle: the deduction count equals the DLX count, with undo verified at every step', () => {
  const rng = createRng('deduce-oracle');
  const ws = newWs();
  let solvable = 0;
  let multiple = 0;
  let clued = 0;
  for (let trial = 0; trial < 300; trial += 1) {
    const ps = /** @type {Piece[]} */ (Array.from({ length: 1 + rng.int(4) }, (_, i) => ({
      id: `p${i}`, label: `p${i}`, color: '#000000', cells: SHAPES[rng.int(SHAPES.length)],
    })));
    const area = ps.reduce((n, p) => n + p.cells.length, 0);
    const w = 3 + rng.int(3);
    const h = 3 + rng.int(2);
    if (area > w * h) {
      continue;
    }
    const active = new Uint8Array(w * h).fill(1);
    for (let blocked = 0; blocked < w * h - area;) {
      const at = rng.int(w * h);
      if (active[at] === 1) {
        active[at] = 0;
        blocked += 1;
      }
    }
    const board = { width: w, height: h, active };
    /** @type {Pose[]} */
    const clues = [];
    if (rng.int(2) === 0) {
      const piece = ps[rng.int(ps.length)];
      const pose = /** @type {Pose} */ ({
        piece: piece.id, x: rng.int(w), y: rng.int(h), turn: rng.int(4), mirrored: rng.int(2) === 1,
      });
      if (poseCells(piece, pose).every(([x, y]) => x >= 0 && y >= 0 && x < w && y < h && active[y * w + x] === 1)) {
        clues.push(pose);
        clued += 1;
      }
    }
    const model = buildModel(board, ps, clues, ws);
    const expected = countSolutions(model, { cap: Infinity, rowTrialLimit: Infinity }).found;
    const result = measureDeduction(model, { ...DEDUCE, solutions: Math.max(2, expected + 1) }, { verifyUndo: true });
    const label = `trial ${trial}`;
    assert.equal(result.count.S, expected, label);
    assert.equal(result.count.exhausted, true, label);
    assert.equal(result.search.stop, 'exhausted', label);
    assert.equal(result.count.solutions, expected === 0 ? 'none' : expected === 1 ? 'unique' : 'few', label);
    assert.equal(result.path, expected > 0 ? 'complete' : 'none', label);
    assertDomain(result);
    if (expected > 0) {
      assertValidFirstPath(model, { board, pieces: ps, clues }, result);
    } else {
      assert.equal(result.first, null, label);
    }
    solvable += expected > 0 ? 1 : 0;
    multiple += expected > 1 ? 1 : 0;
  }
  assert.ok(solvable >= 40 && multiple >= 20 && clued >= 10,
    `weak sample: ${solvable} solvable, ${multiple} with several solutions, ${clued} clued`);
});

test('ids, colours and piece order change nothing; repeated and rebuilt runs are equal', () => {
  const puzzle = recipePuzzle('hard');
  const { model, result: base } = measure(puzzle);
  const rename = (/** @type {string} */ id) => `piece-${id.toLowerCase()}${id.charCodeAt(0)}`;
  const hex = (/** @type {number} */ i) => (i + 10).toString(16);
  const renamed = puzzle.pieces.map((p, i) => ({
    ...p, id: rename(p.id), label: `L${i}`, color: `#00${hex(i)}${hex(i)}00`,
  }));
  const renamedClues = puzzle.clues.map((c) => ({ ...c, piece: rename(c.piece) }));
  const permuted = measure({
    board: puzzle.board, pieces: renamed.slice().reverse(), clues: renamedClues.slice().reverse(),
  }).result;
  assert.deepEqual(permuted, base);
  assert.deepEqual(measureDeduction(model), base);
  assert.deepEqual(measureDeduction(model), base);
  assert.deepEqual(measure(puzzle).result, base);
});

test('a stale model throws and invalid limits are RangeErrors that name the field', () => {
  const ws = newWs();
  const puzzle = vector('V2').puzzle;
  const stale = buildModel(puzzle.board, puzzle.pieces, puzzle.clues, ws);
  buildModel(puzzle.board, puzzle.pieces, puzzle.clues, ws);
  assert.throws(() => measureDeduction(stale), /stale/);

  const { model } = measure(puzzle);
  /** @type {[Record<string, unknown>, string][]} */
  const invalid = [
    [{ ...DEDUCE, solutions: 1 }, 'solutions'],
    [{ ...DEDUCE, nodes: -1 }, 'nodes'],
    [{ ...DEDUCE, work: 1.5 }, 'work'],
    [{ ...DEDUCE, lookaheadWidth: Infinity }, 'lookaheadWidth'],
    [{ ...DEDUCE, census: -1 }, 'census'],
    [{ ...DEDUCE, memoryBytes: Number.NaN }, 'memoryBytes'],
    [{ nodes: 5 }, 'lookaheadWidth'],
  ];
  for (const [limits, field] of invalid) {
    assert.throws(() => measureDeduction(model, /** @type {DeductionLimits} */ (limits)),
      (e) => e instanceof RangeError && e.message.includes(field), field);
  }
  const infinite = measureDeduction(model, { ...DEDUCE, nodes: Infinity, work: Infinity, memoryBytes: Infinity });
  assert.equal(infinite.count.solutions, 'few');
});

test('buffers are workspace slots: counted, reused, and the model stays live', () => {
  const ws = newWs();
  const puzzle = vector('V3').puzzle;
  const model = buildModel(puzzle.board, puzzle.pieces, puzzle.clues, ws);
  const before = ws.bytes();
  const solutions = countSolutions(model, { cap: Infinity, rowTrialLimit: Infinity }).found;
  assert.equal(solutions, 24);
  const first = measureDeduction(model);
  assert.ok(ws.bytes() > before);
  const [allocations, bytes] = [ws.allocationCount(), ws.bytes()];
  assert.deepEqual(measureDeduction(model), first);
  assert.equal(ws.allocationCount(), allocations);
  assert.equal(ws.bytes(), bytes);
  assertLive(model);
  assert.equal(countSolutions(model, { cap: Infinity, rowTrialLimit: Infinity }).found, solutions);
});

test('the memory limit throws model-too-large before anything is allocated', () => {
  const ws = newWs();
  const puzzle = vector('V3').puzzle;
  const model = buildModel(puzzle.board, puzzle.pieces, puzzle.clues, ws);
  const [allocations, bytes] = [ws.allocationCount(), ws.bytes()];
  /** @param {number} memoryBytes */
  const refusal = (memoryBytes) => {
    try {
      measureDeduction(model, { ...DEDUCE, memoryBytes });
    } catch (e) {
      return /** @type {ModelError} */ (e);
    }
    return null;
  };
  const small = refusal(64);
  assert.ok(small instanceof ModelError);
  assert.equal(small.code, 'model-too-large');
  assert.equal(small.details.limit, 64);
  assert.ok(small.details.bytes > 64);
  assert.equal(ws.allocationCount(), allocations);
  assert.equal(ws.bytes(), bytes);
  assert.ok(refusal(small.details.bytes - 1) instanceof ModelError);
  assert.equal(ws.allocationCount(), allocations);
  assert.equal(refusal(small.details.bytes), null);
  assert.equal(ws.bytes() - bytes, small.details.bytes);
});

test('verifyUndo gives the same results on the vectors and the recipes', () => {
  const puzzles = [...VECTORS.map((v) => v.puzzle), ...Object.keys(RECIPE_TABLE).map(recipePuzzle)];
  for (const puzzle of puzzles) {
    const plain = measure(puzzle).result;
    assert.deepEqual(measure(puzzle, DEDUCE, { verifyUndo: true }).result, plain);
  }
});
