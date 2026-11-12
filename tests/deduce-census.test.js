// @ts-check
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boardFromRows } from '../core/engine/board.js';
import { measureDeduction } from '../core/engine/deduce.js';
import { DEDUCE } from '../core/engine/policy.js';
import { createRng } from '../core/engine/rng.js';
import { buildModel, countSolutions } from '../core/engine/tiling.js';
import { createWorkspace, MAIN_WORKSPACE_BYTES } from '../core/engine/workspace.js';
import { CLUE_RECIPES, RECIPE_BOARD_ROWS, recipeWitness } from './fixtures/clue-recipes.js';
import { CLASSIC_PENTOMINOES } from './fixtures/polyominoes.js';

/** @typedef {import('../core/engine/types.js').Board} Board */
/** @typedef {import('../core/engine/types.js').Piece} Piece */
/** @typedef {import('../core/engine/types.js').Pose} Pose */
/** @typedef {import('../core/engine/deduce.js').DeductionResult} DeductionResult */
/** @typedef {import('../core/engine/deduce.js').DeductionLimits} DeductionLimits */
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
const T4 = pc('T4', [[0, 0], [1, 0], [2, 0], [1, 1]]);
const S4 = pc('S4', [[1, 0], [2, 0], [0, 1], [1, 1]]);
const L4 = pc('L4', [[0, 0], [1, 0], [2, 0], [0, 1]]);
const [F, L, P, T, U, Y] = ['F', 'L', 'P', 'T', 'U', 'Y'].map(classic);

/** @type {Record<string, Puzzle>} */
const PUZZLES = {
  V2: { board: rect(3, 1), pieces: [M, D], clues: [] },
  V3: { board: rect(10, 1), pieces: [M, D, I3, I4], clues: [] },
  V4: { board: rect(2, 2), pieces: [D, D2], clues: [] },
  N8: {
    board: boardFromRows(['####', '####', '.#.#', '####', '####', '####']), pieces: [T, L, Y, P, D], clues: [],
  },
  P9: { board: rect(4, 3), pieces: [P, D, U], clues: [] },
  CF1: { board: rect(4, 3), pieces: [F, M, L4, D], clues: [] },
  CF2: { board: boardFromRows(['####', '.###', '####']), pieces: [I3, T4, L3, M], clues: [] },
  CF3: { board: boardFromRows(['###.##', '######', '######']), pieces: [I4, D, L4, L3, S4], clues: [] },
};

/**
 * @param {Puzzle} puzzle
 * @param {Partial<DeductionLimits>} [limits]
 * @param {import('../core/engine/deduce.js').DeductionDiagnostics} [diagnostics]
 */
function run(puzzle, limits = {}, diagnostics = {}) {
  const model = buildModel(puzzle.board, puzzle.pieces, puzzle.clues, createWorkspace(MAIN_WORKSPACE_BYTES));
  return measureDeduction(model, { ...DEDUCE, ...limits }, diagnostics);
}

/** @param {string} id */
const puzzle = (id) => PUZZLES[id];

/** @param {DeductionResult} result */
const first = (result) => /** @type {NonNullable<DeductionResult['first']>} */ (result.first);

/** @param {DeductionResult} result */
const census = (result) => /** @type {NonNullable<DeductionResult['census']>} */ (result.census);

/** The census of the final path as `[c, kLow, f, u]` per node. */
const tuples = (/** @type {DeductionResult} */ result) => first(result).census.map((n) => [n.c, n.kLow, n.f, n.u]);

/** The raw values of MP04: every final-path guess node counts. */
const raw = (/** @type {DeductionResult} */ result) => ({
  G: first(result).choices.length,
  info: first(result).choices.reduce((sum, c) => sum + Math.log2(c), 0),
});

/**
 * The invariants of every complete result: the census is aligned with `choices`, kLow + f + u = c with kLow >= 1,
 * a node counts iff kLow < c, info sums log2(c / kLow) over the counted nodes in path order, Gproved counts the
 * nodes with f >= 1, and the metric domain holds (G = 0 means info = Cmax = Dmax = 0).
 * @param {DeductionResult} result
 */
function assertConsistent(result) {
  if (result.first === null) {
    assert.equal(result.census, null);
    return;
  }
  const f = result.first;
  assert.equal(f.census.length, f.choices.length);
  f.census.forEach((n, i) => {
    assert.equal(n.c, f.choices[i]);
    assert.equal(n.kLow + n.f + n.u, n.c);
    assert.ok(n.kLow >= 1);
  });
  const counted = f.census.filter((n) => n.kLow < n.c);
  assert.equal(f.G, counted.length);
  assert.equal(f.Gproved, f.census.filter((n) => n.f >= 1).length);
  assert.ok(f.Gproved <= f.G);
  assert.equal(f.info, counted.reduce((sum, n) => sum + Math.log2(n.c / n.kLow), 0));
  assert.equal(f.Cmax, counted.reduce((max, n) => Math.max(max, n.c), 0));
  if (f.G === 0) {
    assert.deepEqual([f.info, f.Cmax, f.Dmax], [0, 0, 0]);
  }
  const undecided = f.census.reduce((sum, n) => sum + n.u, 0);
  assert.deepEqual([census(result).complete, census(result).undecided], [undecided === 0, undecided]);
  assert.ok(census(result).nodes <= result.search.nodes && census(result).work <= result.search.work);
}

/**
 * The census fixtures of the task and the re-pinned vectors it draws on, each with the values it pins. `work` is
 * pinned as 0 or 'positive' only.
 * @type {{ id: string, puzzle: string, limits: Partial<DeductionLimits>, expect: Record<string, unknown> }[]}
 */
const CASES = [
  {
    id: 'CF1 budget cut', puzzle: 'CF1', limits: { census: 0 },
    expect: {
      S: 8, solutions: 'many', stop: 'solution-limit', Gt: 6, nodes: 19, choices: [11, 6],
      census: [[11, 4, 0, 7], [6, 2, 4, 0]], G: 2, Gproved: 1, info: 3.0444, Cmax: 11, Dmax: 1,
      cen: { complete: false, undecided: 7, nodes: 0, work: 'positive' },
    },
  },
  {
    id: 'CF1 complete', puzzle: 'CF1', limits: {},
    expect: {
      S: 8, solutions: 'many', stop: 'solution-limit', Gt: 6, nodes: 32, choices: [11, 6],
      census: [[11, 8, 3, 0], [6, 2, 4, 0]], G: 2, Gproved: 2, info: 2.0444, Cmax: 11, Dmax: 1,
      cen: { complete: true, undecided: 0, nodes: 13, work: 'positive' },
    },
  },
  {
    id: 'CF1 infinite', puzzle: 'CF1', limits: { census: Infinity },
    expect: {
      S: 8, solutions: 'many', stop: 'solution-limit', Gt: 6, nodes: 32, choices: [11, 6],
      census: [[11, 8, 3, 0], [6, 2, 4, 0]], G: 2, Gproved: 2, info: 2.0444, Cmax: 11, Dmax: 1,
      cen: { complete: true, undecided: 0, nodes: 13, work: 'positive' },
    },
  },
  {
    id: 'CF2 free node', puzzle: 'CF2', limits: {},
    expect: {
      S: 8, solutions: 'many', Gt: 6, nodes: 18, choices: [4, 3], census: [[4, 4, 0, 0], [3, 2, 1, 0]],
      G: 1, Gproved: 1, info: 0.585, Cmax: 3, Dmax: 1, cen: { complete: true, undecided: 0, nodes: 3, work: 'positive' },
    },
  },
  {
    id: 'CF2 budget cut', puzzle: 'CF2', limits: { census: 0 },
    expect: {
      nodes: 15, choices: [4, 3], census: [[4, 3, 0, 1], [3, 2, 1, 0]], G: 2, Gproved: 1, info: 1, Cmax: 4, Dmax: 1,
      cen: { complete: false, undecided: 1, nodes: 0, work: 'positive' },
    },
  },
  {
    id: 'CF3 Dmax', puzzle: 'CF3', limits: {},
    expect: {
      S: 8, solutions: 'many', Gt: 4, nodes: 22, choices: [6, 3, 4],
      census: [[6, 3, 3, 0], [3, 3, 0, 0], [4, 4, 0, 0]], G: 1, Gproved: 1, info: 1, Cmax: 6, Dmax: 0,
      cen: { complete: true, undecided: 0, nodes: 7, work: 'positive' },
    },
  },
  {
    id: 'CF3 budget cut', puzzle: 'CF3', limits: { census: 0 },
    expect: {
      nodes: 15, choices: [6, 3, 4], census: [[6, 1, 3, 2], [3, 2, 0, 1], [4, 4, 0, 0]], G: 2, Gproved: 1,
      info: 3.1699, Cmax: 6, Dmax: 1, cen: { complete: false, undecided: 3, nodes: 0, work: 'positive' },
    },
  },
  {
    id: 'V3', puzzle: 'V3', limits: {},
    expect: {
      S: 8, Gt: 7, nodes: 21, choices: [4, 3, 2], census: [[4, 4, 0, 0], [3, 3, 0, 0], [2, 2, 0, 0]],
      G: 0, Gproved: 0, info: 0, Cmax: 0, Dmax: 0, cen: { complete: true, undecided: 0, nodes: 6, work: 'positive' },
    },
  },
  {
    id: 'V3 budget cut', puzzle: 'V3', limits: { census: 0 },
    expect: {
      nodes: 15, choices: [4, 3, 2], census: [[4, 2, 0, 2], [3, 3, 0, 0], [2, 2, 0, 0]], G: 1, Gproved: 0, info: 1,
      Cmax: 4, Dmax: 0, cen: { complete: false, undecided: 2, nodes: 0, work: 'positive' },
    },
  },
  {
    id: 'N8', puzzle: 'N8', limits: {},
    expect: {
      S: 4, solutions: 'few', stop: 'exhausted', nodes: 26, choices: [13], census: [[13, 2, 11, 0]], G: 1, Gproved: 1,
      info: 2.7004, Cmax: 13, Dmax: 0, cen: { complete: true, undecided: 0, nodes: 0, work: 0 },
    },
  },
  {
    id: 'P9', puzzle: 'P9', limits: {},
    expect: {
      S: 4, solutions: 'few', stop: 'exhausted', nodes: 15, choices: [12], census: [[12, 3, 9, 0]], G: 1, Gproved: 1,
      info: 2, Cmax: 12, Dmax: 0, cen: { complete: true, undecided: 0, nodes: 0, work: 0 },
    },
  },
];

/** @param {string} id */
const fixture = (id) => /** @type {(typeof CASES)[number]} */ (CASES.find((c) => c.id === id));

/** @param {(typeof CASES)[number]} c */
const runCase = (c) => run(puzzle(c.puzzle), c.limits, { verifyUndo: true });

test('the census fixtures reproduce, with the invariants of a complete result', () => {
  for (const c of CASES) {
    const result = runCase(c);
    assertConsistent(result);
    const f = first(result);
    const actual = /** @type {Record<string, unknown>} */ ({
      S: result.count.S, solutions: result.count.solutions, stop: result.search.stop, Gt: result.search.Gt,
      nodes: result.search.nodes, choices: f.choices, census: tuples(result), G: f.G, Gproved: f.Gproved,
      info: Number(f.info.toFixed(4)), Cmax: f.Cmax, Dmax: f.Dmax,
      cen: { ...result.census, work: census(result).work > 0 ? 'positive' : 0 },
    });
    for (const [key, value] of Object.entries(c.expect)) {
      assert.deepEqual(actual[key], value, `${c.id}: ${key}`);
    }
  }
});

/**
 * Hard, expert and master recipes: unique puzzles whose count is exhausted. Every alternative before the path's own
 * failed in the search (f), the later ones did not exist: kLow 1 and no probe.
 * @type {Record<string, number[][]>}
 */
const RECIPE_CENSUS = {
  'very-easy': [],
  easy: [],
  normal: [],
  hard: [[2, 1, 1, 0], [5, 1, 4, 0]],
  expert: [[2, 1, 1, 0], [6, 1, 5, 0], [2, 1, 1, 0]],
  master: [[4, 1, 3, 0], [2, 1, 1, 0], [7, 1, 6, 0], [2, 1, 1, 0]],
};

test('a unique puzzle: kLow 1, nothing undecided, the values equal the raw ones and cost nothing extra', () => {
  assert.deepEqual(Object.keys(RECIPE_CENSUS), Object.keys(CLUE_RECIPES));
  for (const [level, want] of Object.entries(RECIPE_CENSUS)) {
    const kept = CLUE_RECIPES[/** @type {keyof typeof CLUE_RECIPES} */ (level)].pieces;
    const board = boardFromRows([...RECIPE_BOARD_ROWS]);
    const clues = recipeWitness().filter((pose) => kept.includes(pose.piece));
    const result = run({ board, pieces: [...CLASSIC_PENTOMINOES], clues }, {}, { verifyUndo: true });
    assertConsistent(result);
    assert.equal(result.count.solutions, 'unique', level);
    assert.deepEqual(tuples(result), want, level);
    for (const node of first(result).census) {
      assert.deepEqual([node.kLow, node.u], [1, 0], level);
    }
    assert.deepEqual([first(result).G, first(result).info, first(result).Gproved],
      [raw(result).G, raw(result).info, raw(result).G], level);
    assert.equal(first(result).Cmax, first(result).choices.reduce((max, c) => Math.max(max, c), 0), level);
    assert.deepEqual(result.census, { complete: true, undecided: 0, nodes: 0, work: 0 }, level);
  }
});

test('a free node is not counted: the choice between alternatives that all solve the puzzle', () => {
  const cf2 = run(puzzle('CF2'));
  assert.deepEqual(first(cf2).census[0], { c: 4, kLow: 4, f: 0, u: 0 });
  assert.deepEqual([first(cf2).choices, first(cf2).G, first(cf2).Gproved], [[4, 3], 1, 1]);
  for (const id of ['V2', 'V4']) {
    const result = run(puzzle(id));
    assert.equal(raw(result).G, 1, id);
    assert.deepEqual([first(result).G, first(result).info, first(result).Cmax, first(result).Dmax], [0, 0, 0, 0], id);
  }
});

test('a node with a failing alternative counts log2(c / kLow)', () => {
  const n8 = first(run(puzzle('N8')));
  assert.equal(n8.info, Math.log2(13 / 2));
  const p9 = first(run(puzzle('P9')));
  assert.equal(p9.info, Math.log2(12 / 3));
  const cf1 = first(run(puzzle('CF1')));
  assert.equal(cf1.info, Math.log2(11 / 8) + Math.log2(6 / 2));
  assert.equal(Number(cf1.info.toFixed(4)), 2.0444);
  assert.ok(cf1.info < Math.log2(11) + Math.log2(6));
});

test('a budget cut gives an upper estimate between the decisive and the raw values, and says so', () => {
  for (const [id, cutId] of [['CF1 complete', 'CF1 budget cut'], ['CF3 Dmax', 'CF3 budget cut'],
    ['V3', 'V3 budget cut'], ['CF2 free node', 'CF2 budget cut']]) {
    const decisive = runCase(fixture(id));
    const estimate = runCase(fixture(cutId));
    assertConsistent(estimate);
    assert.deepEqual(first(estimate).choices, first(decisive).choices, cutId);
    assert.equal(census(estimate).complete, false, cutId);
    assert.ok(census(estimate).undecided > 0, cutId);
    assert.equal(census(decisive).complete, true, cutId);
    assert.ok(first(decisive).G <= first(estimate).G && first(estimate).G <= raw(estimate).G, cutId);
    assert.ok(first(decisive).info <= first(estimate).info && first(estimate).info <= raw(estimate).info, cutId);
    assert.ok(first(estimate).Gproved <= first(decisive).Gproved, cutId);
    // The estimate never changes what the search measured.
    assert.deepEqual([first(estimate).rows, first(estimate).rules, first(estimate).F, first(estimate).E],
      [first(decisive).rows, first(decisive).rules, first(decisive).F, first(decisive).E], cutId);
    assert.deepEqual(estimate.count, decisive.count, cutId);
    assert.deepEqual([estimate.search.Gt, estimate.search.stop], [decisive.search.Gt, decisive.search.stop], cutId);
  }
  assert.ok(first(runCase(fixture('CF1 budget cut'))).info < raw(run(puzzle('CF1'))).info);
  assert.equal(Number(raw(run(puzzle('CF1'))).info.toFixed(4)), 6.0444);
  assert.equal(Number(raw(run(puzzle('CF3'))).info.toFixed(4)), 6.1699);
  assert.equal(raw(run(puzzle('V3'))).G, 3);
  assert.equal(Number(raw(run(puzzle('V3'))).info.toFixed(4)), 4.585);
});

test('Gproved counts exactly the nodes with a proved failing alternative and equals G when the census is complete', () => {
  // [Gproved, G] of the budget cuts: a node with only undecided alternatives counts for G but not for Gproved.
  const cuts = { 'CF1 budget cut': [1, 2], 'CF2 budget cut': [1, 2], 'CF3 budget cut': [1, 2], 'V3 budget cut': [0, 1] };
  for (const [id, want] of Object.entries(cuts)) {
    const f = first(runCase(fixture(id)));
    assert.deepEqual([f.Gproved, f.G], want, id);
    assert.equal(f.Gproved, f.census.filter((n) => n.f >= 1).length, id);
  }
  for (const id of ['CF1 infinite', 'CF2 free node', 'CF3 Dmax', 'V3', 'N8', 'P9']) {
    const f = first(runCase(fixture(id)));
    assert.equal(f.Gproved, f.G, id);
  }
});

test('census work and nodes are in the totals; the node and work counters of the search proper stay', () => {
  const v3 = run(puzzle('V3'));
  const search = run(puzzle('V3'), { census: 0 });
  assert.equal(census(v3).nodes, 6);
  assert.equal(v3.search.nodes, 15 + 6);
  assert.equal(v3.search.nodes, search.search.nodes + census(v3).nodes);
  assert.ok(v3.search.work >= census(v3).work && census(v3).work > 0);
  assert.equal(v3.search.Gt, search.search.Gt);
  assert.equal(v3.search.Gt, 7);
  assert.ok(v3.search.work - census(v3).work < search.search.work);
});

test('a count stopped by a cap does not stop the census, and the cap bounds the search proper', () => {
  const c7 = run(puzzle('V3'), { nodes: 4 }, { verifyUndo: true });
  assertConsistent(c7);
  assert.deepEqual([c7.search.stop, c7.count.S, c7.count.solutions], ['node-cap', 1, 'unknown']);
  assert.deepEqual([census(c7).complete, census(c7).undecided, census(c7).nodes], [true, 0, 14]);
  assert.equal(first(c7).G, 0);
  assert.equal(c7.search.nodes, 4 + 14);
  assert.ok(c7.search.nodes - census(c7).nodes <= 4);
  const c8 = run(puzzle('V3'), { nodes: 5 });
  assert.deepEqual([c8.search.stop, c8.count.S, c8.count.solutions, census(c8).nodes, c8.search.nodes],
    ['node-cap', 2, 'few', 13, 18]);
  // A work cap that stops the count leaves the census its own budget and `search.stop` its value.
  const full = run(puzzle('V3'), { solutions: 30 });
  const cut = run(puzzle('V3'), { solutions: 30, work: Math.floor(full.search.work / 2) }, { verifyUndo: true });
  assertConsistent(cut);
  assert.equal(cut.search.stop, 'work-cap');
  assert.equal(census(cut).complete, true);
  assert.equal(first(cut).G, 0);
});

test('Dmax is the number of pieces placed before the deepest counted node', () => {
  // CF3 has three guess nodes; only the root counts, and 3 pieces are placed before the last one (raw Dmax 3).
  const decisive = first(run(puzzle('CF3')));
  assert.deepEqual([decisive.G, decisive.Dmax], [1, 0]);
  const estimate = first(run(puzzle('CF3'), { census: 0 }));
  assert.deepEqual([estimate.G, estimate.Dmax], [2, 1]);
});

test('the census is deterministic and undo-clean, replay and probes included', () => {
  for (const id of ['CF1', 'CF3', 'V3']) {
    const plain = run(puzzle(id));
    assert.deepEqual(run(puzzle(id)), plain, id);
    assert.deepEqual(run(puzzle(id), {}, { verifyUndo: true }), plain, id);
    assert.ok(census(plain).nodes > 0, id);
  }
});

test('a larger census budget only refines the statuses and never changes the measurement', () => {
  const base = run(puzzle('CF1'), { census: Infinity });
  const budgets = [0, 1, 100, 400, 1000, 2500, 5000, 10000, 20000, 30000, 36000, 40000];
  let previous = run(puzzle('CF1'), { census: 0 });
  let partial = 0;
  for (const budget of budgets) {
    const result = run(puzzle('CF1'), { census: budget }, { verifyUndo: true });
    assertConsistent(result);
    first(result).census.forEach((n, i) => {
      assert.ok(n.kLow >= first(previous).census[i].kLow && n.f >= first(previous).census[i].f, `budget ${budget}`);
      assert.ok(n.kLow <= first(base).census[i].kLow && n.f <= first(base).census[i].f, `budget ${budget}`);
    });
    assert.ok(first(result).G <= first(previous).G && first(result).info <= first(previous).info, `budget ${budget}`);
    assert.deepEqual([result.count, result.search.stop, result.search.Gt, first(result).rows],
      [base.count, base.search.stop, base.search.Gt, first(base).rows], `budget ${budget}`);
    partial += census(result).complete ? 0 : 1;
    previous = result;
  }
  assert.ok(partial >= 6, `${partial} of ${budgets.length} budgets stopped the census`);
  assert.deepEqual(run(puzzle('CF1'), { census: 40000 }), base);
});

test('the probes run in path order: a later node is decided only after the nodes before it', () => {
  const rootStates = new Set();
  for (let budget = 0; budget <= 80000; budget += 2000) {
    const result = run(puzzle('CF3'), { census: budget }, { verifyUndo: true });
    assertConsistent(result);
    const [root, second] = first(result).census;
    assert.ok(second.u === 1 || root.u === 0, `budget ${budget}`);
    rootStates.add(`${root.u}${second.u}`);
  }
  assert.deepEqual([...rootStates].sort(), ['00', '01', '11', '21'], 'the sweep passes through every state');
});

test('the decisive values do not depend on where the count stopped', () => {
  for (const id of ['CF1', 'CF2', 'CF3', 'V3']) {
    const base = run(puzzle(id), { census: Infinity });
    const searchWork = base.search.work - census(base).work;
    /** @type {Partial<DeductionLimits>[]} */
    const cuts = [];
    for (let nodes = 1; nodes <= 45; nodes += 1) {
      cuts.push({ nodes });
    }
    for (let solutions = 2; solutions <= 8; solutions += 1) {
      cuts.push({ solutions });
    }
    for (let k = 1; k < 40; k += 1) {
      cuts.push({ work: Math.floor((searchWork * k) / 40) });
    }
    let capped = 0;
    for (const cut of cuts) {
      const result = run(puzzle(id), { ...cut, census: Infinity });
      if (result.path !== 'complete') {
        continue;
      }
      assertConsistent(result);
      assert.deepEqual(first(result), first(base), `${id} ${JSON.stringify(cut)}`);
      assert.equal(census(result).complete, true, `${id} ${JSON.stringify(cut)}`);
      capped += result.search.stop === 'node-cap' || result.search.stop === 'work-cap' ? 1 : 0;
    }
    assert.ok(capped >= 10, `${id}: ${capped} runs of ${cuts.length} were stopped by a cap with a path`);
  }
});

const SHAPES = [
  [[0, 0]], [[0, 0], [1, 0]], [[0, 0], [1, 0], [2, 0]], [[0, 0], [1, 0], [0, 1]],
  [[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 0], [1, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [2, 0], [0, 1]],
];

test('random oracle: the probes decide what an exhausted count decides, and a cut only moves values upward', () => {
  const rng = createRng('census-oracle');
  const ws = createWorkspace(MAIN_WORKSPACE_BYTES);
  let boards = 0;
  let guessed = 0;
  let probed = 0;
  let proved = 0;
  for (let trial = 0; trial < 500; trial += 1) {
    const ps = /** @type {Piece[]} */ (Array.from({ length: 2 + rng.int(4) }, (_, i) => ({
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
    const model = buildModel({ width: w, height: h, active }, ps, [], ws);
    const total = countSolutions(model, { cap: Infinity, rowTrialLimit: Infinity }).found;
    if (total === 0) {
      continue;
    }
    // An exhausted count decides every alternative of the path by itself (no probe) ...
    const exhaustive = measureDeduction(model, { ...DEDUCE, solutions: Math.max(2, total + 1) }, { verifyUndo: true });
    // ... a count that stops at the second solution leaves them to the probes, which must agree ...
    const probes = measureDeduction(model, { ...DEDUCE, solutions: 2, census: Infinity }, { verifyUndo: true });
    // ... and a budget of 0 leaves the alternatives the count did not reach undecided.
    const cut = measureDeduction(model, { ...DEDUCE, solutions: 2, census: 0 }, { verifyUndo: true });
    const label = `trial ${trial}`;
    boards += 1;
    assertConsistent(exhaustive);
    assertConsistent(probes);
    assertConsistent(cut);
    assert.deepEqual(census(exhaustive), { complete: true, undecided: 0, nodes: 0, work: 0 }, label);
    assert.equal(census(probes).complete, true, label);
    assert.deepEqual(first(probes), first(exhaustive), label);
    first(cut).census.forEach((n, i) => {
      const want = first(exhaustive).census[i];
      assert.ok(n.kLow <= want.kLow && n.f <= want.f && n.c === want.c, label);
    });
    assert.ok(first(exhaustive).G <= first(cut).G && first(cut).G <= raw(cut).G, label);
    assert.ok(first(exhaustive).info <= first(cut).info, label);
    assert.ok(first(cut).Gproved <= first(exhaustive).Gproved, label);
    guessed += first(exhaustive).choices.length > 0 ? 1 : 0;
    probed += census(probes).nodes > 0 ? 1 : 0;
    proved += first(exhaustive).Gproved > 0 ? 1 : 0;
  }
  assert.ok(boards >= 100 && guessed >= 60 && probed >= 50 && proved >= 25,
    `weak sample: ${boards} solvable boards, ${guessed} with guesses, ${probed} with probes, ${proved} with Gproved`);
});
