// @ts-check
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boardFromRows } from '../core/engine/board.js';
import { measureDeduction } from '../core/engine/deduce.js';
import { poseCells } from '../core/engine/geometry.js';
import { DEDUCE } from '../core/engine/policy.js';
import { createRng } from '../core/engine/rng.js';
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
// A second piece of T4's shape: direct engine inputs may repeat a shape (the entry points of the product refuse it).
const T4b = pc('T4b', [[0, 0], [1, 0], [2, 0], [1, 1]]);
const S4 = pc('S4', [[1, 0], [2, 0], [0, 1], [1, 1]]);
const L4 = pc('L4', [[0, 0], [1, 0], [2, 0], [0, 1]]);
const [P, U, L, T, Y] = ['P', 'U', 'L', 'T', 'Y'].map(classic);

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
 * Rule boards B1-B4 and the R3 near-misses K1 and K2 (MP03), then P7, N7, P8, N8, P9 and K9 (MP04). `dlx` is the
 * exact count; `expect` pins the values of the default ladder (the fields it names are compared).
 * @type {{ id: string, puzzle: Puzzle, dlx: number, expect: Record<string, unknown> }[]}
 */
const BOARDS = [
  {
    id: 'B1',
    puzzle: { board: boardFromRows(['##.###', '##.###', '#.....']), pieces: [P, U, M], clues: [] },
    dlx: 2,
    expect: {
      path: 'complete', S: 2, solutions: 'few', exhausted: true, stop: 'exhausted', Gt: 1, nodes: 3,
      F: 2, R1: 1, R2: 0, R3: 1, R4: 4, R5: 0, R6: 0, R7: 0, R8: 0, R9: 0, E: 0, tier: 2, G: 0, Gproved: 0,
      choices: [2], census: [[2, 2, 0, 0]], info: 0, Cmax: 0, Dmax: 0,
    },
  },
  {
    id: 'B2',
    puzzle: { board: rect(5, 1), pieces: [I4, M], clues: [] },
    dlx: 2,
    expect: {
      path: 'complete', S: 2, solutions: 'few', exhausted: true, stop: 'exhausted', Gt: 1, nodes: 3,
      F: 1, R1: 1, R2: 0, R3: 0, R4: 3, R5: 0, R6: 0, R7: 0, R8: 0, R9: 0, E: 0, tier: 2, G: 0, Gproved: 0,
      choices: [2], census: [[2, 2, 0, 0]], info: 0, Cmax: 0,
    },
  },
  {
    id: 'B3',
    puzzle: { board: boardFromRows(['###', '###', '###', '.#.']), pieces: [O4, L3, I3], clues: [] },
    dlx: 2,
    expect: {
      path: 'complete', S: 2, solutions: 'few', exhausted: true, stop: 'exhausted', Gt: 1, nodes: 3,
      F: 2, R1: 2, R2: 0, R3: 0, R4: 19, R5: 4, R6: 0, R7: 0, R8: 0, R9: 0, E: 0, tier: 2, G: 0, Gproved: 0,
      choices: [2], census: [[2, 2, 0, 0]], info: 0, Cmax: 0,
    },
  },
  {
    id: 'B4',
    puzzle: { board: boardFromRows(['###', '###', '.##', '.##']), pieces: [T4, L, M], clues: [] },
    dlx: 1,
    expect: {
      path: 'complete', S: 1, solutions: 'unique', exhausted: true, stop: 'exhausted', Gt: 0, nodes: 1,
      F: 3, R1: 3, R2: 0, R3: 0, R4: 2, R5: 4, R6: 2, R7: 0, R8: 0, R9: 0, E: 2, tier: 2, G: 0, Gproved: 0,
      choices: [], census: [],
    },
  },
  {
    id: 'K1',
    puzzle: { board: boardFromRows(['##.##', '##.##']), pieces: [O4, M, L3], clues: [] },
    dlx: 8,
    expect: {
      path: 'complete', S: 8, solutions: 'many', exhausted: false, stop: 'solution-limit', Gt: 3, nodes: 11,
      F: 1, R1: 1, R2: 0, R3: 0, R4: 0, R5: 0, R6: 0, R7: 0, R8: 0, R9: 0, E: 0, tier: 1, G: 0, Gproved: 0,
      choices: [2, 4], census: [[2, 2, 0, 0], [4, 4, 0, 0]], info: 0, Cmax: 0, Dmax: 0,
    },
  },
  {
    id: 'K2',
    puzzle: { board: boardFromRows(['##.##', '##.##']), pieces: [O4, D, D2], clues: [] },
    dlx: 8,
    expect: {
      path: 'complete', S: 8, solutions: 'many', exhausted: false, stop: 'solution-limit', Gt: 3, nodes: 11,
      F: 1, R1: 1, R2: 0, R3: 0, R4: 0, R5: 0, R6: 0, R7: 0, R8: 0, R9: 0, E: 0, tier: 1, G: 0, Gproved: 0,
      choices: [2, 4], census: [[2, 2, 0, 0], [4, 4, 0, 0]], info: 0, Cmax: 0, Dmax: 0,
    },
  },
  {
    // A 4 x 4 board without two opposite dark corners: 6 dark and 8 light cells, and every piece covers as many
    // dark as light cells, so the parity alone proves that no tiling exists.
    id: 'P7',
    puzzle: { board: boardFromRows(['.###', '####', '####', '###.']), pieces: [D, O4, L4, S4], clues: [] },
    dlx: 0,
    expect: { path: 'none', S: 0, solutions: 'none', exhausted: true, stop: 'exhausted', Gt: 0, nodes: 1, census: null },
  },
  {
    // Two separated T-shaped regions with imbalance +2 each; either piece fills either: both are not mandatory in
    // one region.
    id: 'N7',
    puzzle: { board: boardFromRows(['###.###', '.#...#.']), pieces: [T4, T4b], clues: [] },
    dlx: 2,
    expect: {
      path: 'complete', S: 2, solutions: 'few', exhausted: true, stop: 'exhausted', Gt: 1, nodes: 3,
      F: 1, R1: 1, R2: 0, R3: 0, R4: 0, R5: 0, R6: 0, R7: 0, R8: 0, R9: 0, E: 0, tier: 1, G: 0, Gproved: 0,
      choices: [2], census: [[2, 2, 0, 0]], info: 0, Cmax: 0,
    },
  },
  {
    // An hourglass: the neck cell (3, 2) is an articulation cell with more than four live rows.
    id: 'P8',
    puzzle: {
      board: boardFromRows(['####', '####', '...#', '####', '####', '####']), pieces: [T, L, Y, P, M], clues: [],
    },
    dlx: 1,
    expect: {
      path: 'complete', S: 1, solutions: 'unique', exhausted: true, stop: 'exhausted', Gt: 1, nodes: 5,
      F: 4, R1: 2, R2: 2, R3: 0, R4: 4, R5: 0, R6: 6, R7: 0, R8: 35, R9: 0, E: 6, tier: 3, G: 1, Gproved: 1,
      choices: [4], census: [[4, 1, 3, 0]], info: 2, Cmax: 4, Dmax: 0,
    },
  },
  {
    // The two halves are joined in two places: there is no neck. Two of the 13 placements of the guess lead to a
    // solution, so the guess is counted with the weight log2(13 / 2).
    id: 'N8',
    puzzle: {
      board: boardFromRows(['####', '####', '.#.#', '####', '####', '####']), pieces: [T, L, Y, P, D], clues: [],
    },
    dlx: 4,
    expect: {
      path: 'complete', S: 4, solutions: 'few', exhausted: true, stop: 'exhausted', Gt: 4, nodes: 26,
      F: 4, R1: 4, R2: 0, R3: 0, R4: 0, R5: 21, R6: 3, R7: 0, R8: 0, R9: 0, E: 3, tier: 2, G: 1, Gproved: 1,
      choices: [13], census: [[13, 2, 11, 0]], info: 2.7004, Cmax: 13, Dmax: 0,
    },
  },
  {
    id: 'P9',
    puzzle: { board: rect(4, 3), pieces: [P, D, U], clues: [] },
    dlx: 4,
    expect: {
      path: 'complete', S: 4, solutions: 'few', exhausted: true, stop: 'exhausted', Gt: 2, nodes: 15,
      F: 2, R1: 2, R2: 0, R3: 0, R4: 8, R5: 0, R6: 0, R7: 0, R8: 0, R9: 8, E: 0, tier: 3, G: 1, Gproved: 1,
      choices: [12], census: [[12, 3, 9, 0]], info: 2, Cmax: 12, Dmax: 0,
    },
  },
  {
    // The cells (0, 0) and (0, 1) share the vertical domino: they are not a pair, and killing the square at x = 1
    // would lose a solution.
    id: 'K9',
    puzzle: { board: rect(3, 2), pieces: [D, O4], clues: [] },
    dlx: 2,
    expect: {
      path: 'complete', S: 2, solutions: 'few', exhausted: true, stop: 'exhausted', Gt: 1, nodes: 3,
      F: 1, R1: 1, R2: 0, R3: 0, R4: 5, R5: 0, R6: 0, R7: 0, R8: 0, R9: 0, E: 0, tier: 2, G: 0, Gproved: 0,
      choices: [2], census: [[2, 2, 0, 0]], info: 0, Cmax: 0,
    },
  },
  {
    // Added by MP04 beyond the task's vectors, found by mutating R7: a pocket's candidates are only the pieces with a
    // live row inside it. Counting the pieces of the other pocket too gives R6 5 and R7 1 here instead of 4 and 2.
    // MP05 re-pinned its metrics (not in the task's table): only the root guess has a failing alternative.
    id: 'X7',
    puzzle: { board: boardFromRows(['..#.##', '###.##', '###.##']), pieces: [T4, I3, D, L3, M], clues: [] },
    dlx: 4,
    expect: {
      path: 'complete', S: 4, solutions: 'few', exhausted: true, stop: 'exhausted', Gt: 4, nodes: 9,
      F: 2, R1: 1, R2: 1, R3: 0, R4: 19, R5: 0, R6: 4, R7: 2, R8: 0, R9: 0, E: 4, tier: 3, G: 1, Gproved: 1,
      choices: [2, 2, 2], census: [[2, 1, 1, 0], [2, 2, 0, 0], [2, 2, 0, 0]], info: 1, Cmax: 2, Dmax: 0,
    },
  },
];

/** @param {string} id */
const board = (id) => /** @type {(typeof BOARDS)[number]} */ (BOARDS.find((b) => b.id === id));

/**
 * The fields the tables pin, in one flat record; `census` is the `[c, kLow, f, u]` list of the final path, or the
 * result's `census` (null) when there is no complete path.
 * @param {import('../core/engine/deduce.js').DeductionResult} result
 */
function flat(result) {
  const f = result.first;
  return {
    path: result.path, S: result.count.S, solutions: result.count.solutions, exhausted: result.count.exhausted,
    stop: result.search.stop, Gt: result.search.Gt, nodes: result.search.nodes,
    census: result.census,
    ...(f === null ? {} : {
      F: f.F, R1: f.rules.R1, R2: f.rules.R2, R3: f.rules.R3, R4: f.rules.R4, R5: f.rules.R5, R6: f.rules.R6,
      R7: f.rules.R7, R8: f.rules.R8, R9: f.rules.R9, E: f.E, tier: f.deductionTier, G: f.G, Gproved: f.Gproved,
      choices: f.choices, census: f.census.map((n) => [n.c, n.kLow, n.f, n.u]),
      info: Number(f.info.toFixed(4)), Cmax: f.Cmax, Dmax: f.Dmax,
    }),
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
  const first = result.first;
  if (first === null) {
    assert.equal(result.path, 'none', id);
  } else {
    assert.equal(first.rows.length, first.F + first.choices.length, id);
    // No board of this file needs a census probe: every alternative is decided by the search itself.
    assert.deepEqual(result.census, { complete: true, undecided: 0, nodes: 0, work: 0 }, id);
    if (first.G === 0) {
      assert.deepEqual([first.info, first.Cmax, first.Dmax], [0, 0, 0], id);
    }
  }
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

test('R7 proves a parity contradiction at the root, without a lookahead and without a guess (P7)', () => {
  const { result } = check('P7');
  assert.equal(result.first, null);
  const model = build(board('P7').puzzle);
  const r = measureDeduction(model, { ...DEDUCE, lookaheadWidth: 0 }, { verifyUndo: true });
  assert.deepEqual([r.path, r.search.Gt, r.search.nodes, r.count.solutions], ['none', 0, 1, 'none']);
});

test('R7 keeps two separated regions that either of two pieces can fill (N7)', () => {
  const { result } = check('N7');
  assert.equal(result.first?.rules.R7, 0);
});

test('R7 counts only the pieces with a live row inside a pocket as its candidates (X7)', () => {
  const { result } = check('X7');
  assert.equal(result.count.S, board('X7').dlx);
});

test('R8 removes the placements over a neck that cut off a pocket nothing can fill (P8)', () => {
  const { result } = check('P8');
  assert.ok((result.first?.rules.R8 ?? 0) > 0);
});

test('R8 removes nothing when the narrow passage is not a neck (N8)', () => {
  const { result } = check('N8');
  assert.equal(result.first?.rules.R8, 0);
});

test('R8 with lookaheadWidth 0 tries every neck and still finds only sound kills (P8)', () => {
  const model = build(board('P8').puzzle);
  const r = measureDeduction(model, { ...DEDUCE, lookaheadWidth: 0 }, { verifyUndo: true });
  assert.deepEqual([r.count.S, r.count.exhausted, r.first?.rules.R6, r.first?.deductionTier], [1, true, 0, 3]);
  assert.ok((r.first?.rules.R8 ?? 0) > 0);
});

test('R9: two cells that only the same two pieces reach take both pieces away from other places (P9)', () => {
  const { result } = check('P9');
  assert.ok((result.first?.rules.R9 ?? 0) > 0);
});

test('R9 needs the "covers both" test: cells that one placement covers are not a pair (K9)', () => {
  const { result } = check('K9');
  assert.equal(result.first?.rules.R9, 0);
  assert.equal(result.count.S, board('K9').dlx);
});

test('the DLX counts of the rule boards, and tier 3 exactly when R7 + R8 + R9 is nonzero', () => {
  for (const b of BOARDS) {
    const model = build(b.puzzle);
    assert.equal(countSolutions(model, { cap: Infinity, rowTrialLimit: Infinity }).found, b.dlx, b.id);
    const first = measureDeduction(model).first;
    if (first !== null) {
      const { R7, R8, R9 } = first.rules;
      assert.equal(first.deductionTier === 3, R7 + R8 + R9 > 0, b.id);
    }
  }
});

test('work caps inside R7, R8 and R9 stop cleanly: the state is restored and the result is deterministic', () => {
  for (const id of ['P7', 'N7', 'P8', 'N8', 'P9']) {
    const puzzle = board(id).puzzle;
    const model = build(puzzle);
    const full = measureDeduction(model).search.work;
    const step = Math.max(1, Math.floor(full / 400));
    let capped = 0;
    for (let work = 0; work < full; work += step) {
      const limits = { ...DEDUCE, work };
      const checked = measureDeduction(model, limits, { verifyUndo: true });
      assert.deepEqual(checked, measureDeduction(model, limits), `${id}, work cap ${work}`);
      if (checked.search.stop === 'work-cap') {
        capped += 1;
        assert.ok(checked.count.solutions !== 'unique' && checked.count.solutions !== 'none', `${id}, ${work}`);
      }
    }
    assert.ok(capped > 0, id);
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

const SHAPES_PARITY = [
  [[0, 0]], [[0, 0], [1, 0]], [[0, 0], [1, 0], [0, 1]], [[0, 0], [1, 0], [2, 0], [1, 1]],
  [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]],
];

test('parity random oracle: the count equals the DLX count with R7, R8 and R9 active, undo verified', () => {
  const rng = createRng('deduce-oracle-parity');
  const ws = createWorkspace(MAIN_WORKSPACE_BYTES);
  let boards = 0;
  let solvable = 0;
  let multiple = 0;
  let clued = 0;
  const used = [0, 0, 0];
  for (let trial = 0; trial < 300; trial += 1) {
    const ps = /** @type {Piece[]} */ (Array.from({ length: 1 + rng.int(5) }, (_, i) => ({
      id: `p${i}`, label: `p${i}`, color: '#000000', cells: SHAPES_PARITY[rng.int(SHAPES_PARITY.length)],
    })));
    const area = ps.reduce((n, p) => n + p.cells.length, 0);
    const w = 3 + rng.int(3);
    const h = 3 + rng.int(3);
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
    assert.equal(result.path, expected > 0 ? 'complete' : 'none', label);
    boards += 1;
    if (result.first !== null) {
      const { R7, R8, R9 } = result.first.rules;
      used[0] += R7 > 0 ? 1 : 0;
      used[1] += R8 > 0 ? 1 : 0;
      used[2] += R9 > 0 ? 1 : 0;
    }
    solvable += expected > 0 ? 1 : 0;
    multiple += expected > 1 ? 1 : 0;
  }
  assert.ok(boards >= 200 && solvable >= 40 && multiple >= 20 && clued >= 15,
    `weak sample: ${boards} boards, ${solvable} solvable, ${multiple} with several solutions, ${clued} clued`);
  assert.ok(used[0] >= 10 && used[1] >= 10 && used[2] >= 2,
    `weak sample: R7, R8 and R9 are nonzero on ${used.join(', ')} final paths`);
});
