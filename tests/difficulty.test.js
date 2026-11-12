// @ts-check
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { boardFromRows } from '../core/engine/board.js';
import {
  breakdownV3, IncompleteRatingError, inBand, measureV2, measureV3, MODEL, rate, rateV2, scoreV2, scoreV3,
  UnsatisfiableError,
} from '../core/engine/difficulty.js';
import { level, levelForScore } from '../core/engine/levels.js';
import { validatePack } from '../core/engine/pack.js';
import { DEDUCE, SCORE } from '../core/engine/policy.js';
import { buildModel, solveFirst } from '../core/engine/tiling.js';
import { createWorkspace, MAIN_WORKSPACE_BYTES } from '../core/engine/workspace.js';
import { CLASSIC_PENTOMINOES } from './fixtures/polyominoes.js';

/** @typedef {import('../core/engine/types.js').Piece} Piece */
/** @typedef {import('../core/engine/types.js').Pose} Pose */

const ws = createWorkspace(MAIN_WORKSPACE_BYTES);
const rect = (/** @type {number} */ w, /** @type {number} */ h) => boardFromRows(Array(h).fill('#'.repeat(w)));
const pieces = /** @type {Piece[]} */ ([...CLASSIC_PENTOMINOES]);
const board60 = rect(10, 6);

/** @returns {Pose[]} */
function witness60() {
  const first = solveFirst(buildModel(board60, pieces, [], ws), { rowTrialLimit: 1e6 }).layout;
  return /** @type {Pose[]} */ (first);
}

const mono = { id: 'M', label: 'M', color: '#000000', cells: /** @type {[number, number][]} */ ([[0, 0]]) };
const p5 = /** @type {Piece} */ (pieces.find((p) => p.id === 'P'));

test('worked (U, B) to D examples', () => {
  const table = [[0, 0, 0], [3, 0, 6], [4, 3, 13], [5, 10, 18], [8, 0, 16], [11, 999, 46], [12, 5000, 54],
    [40, 5000, 110], [41, 5000, 112], [66, 5000, 162]];
  for (const [U, B, D] of table) {
    assert.equal(scoreV2(U, B), D, `U=${U} B=${B}`);
  }
  assert.equal(scoreV2(0, 5000), 0);
  assert.throws(() => scoreV2(-1, 0), RangeError);
  assert.throws(() => scoreV2(2, 1.5), RangeError);
});

test('worked scores land in the documented levels', () => {
  const levels = [[0, 'very-easy'], [6, 'very-easy'], [13, 'normal'], [18, 'hard'], [46, 'master'], [54, 'nightmare'],
    [110, 'hell-1'], [112, 'hell-2'], [162, 'hell-3']];
  for (const [D, id] of levels) {
    assert.equal(levelForScore(/** @type {number} */ (D)).id, id);
  }
});

test('inBand uses an inclusive minimum and an exclusive maximum', () => {
  const target = level('hard');
  const at = (/** @type {number} */ s) => /** @type {import('../core/engine/types.js').Rating} */ ({ score: s });
  assert.equal(inBand(at(target.min - 1), target), false);
  assert.equal(inBand(at(target.min), target), true);
  assert.equal(inBand(at(target.max - 1), target), true);
  assert.equal(inBand(at(target.max), target), false);
});

test('a complete layout scores zero with zero counters', () => {
  const layout = witness60();
  const r = rate(board60, pieces, layout, ws);
  assert.deepEqual(r, {
    model: MODEL,
    score: 0,
    level: 'very-easy',
    saturated: false,
    metrics: { U: 0, B: 0, branchTrials: 0, rowTrials: 0, stop: 'solution', R: 0, H: 0 },
  });
  assert.throws(() => rate(board60, pieces, [...layout.slice(1), { ...layout[1] }], ws), UnsatisfiableError);
});

test('forced placements keep B = 0 and score 2U', () => {
  const b = rect(3, 2);
  const two = [p5, mono];
  const r = rate(b, two, [{ piece: 'M', x: 0, y: 0, turn: 0, mirrored: false }], ws);
  assert.equal(r.metrics.U, 1);
  assert.equal(r.metrics.B, 0);
  assert.equal(r.metrics.branchTrials, 0);
  assert.equal(r.metrics.stop, 'solution');
  assert.equal(r.metrics.R, 5);
  assert.equal(r.metrics.H, 1);
  assert.equal(r.score, 2);
  assert.equal(r.saturated, false);
});

test('metrics carry actual counters and the diagnostics R and H', () => {
  const layout = witness60();
  const clues = layout.slice(0, 7);
  const r = rate(board60, pieces, clues, ws);
  const model = buildModel(board60, pieces, clues, ws);
  const bits = [...model.placementsPerPiece.subarray(0, model.freePieces.length)]
    .reduce((sum, rows) => sum + Math.log2(1 + rows), 0) / 5;
  assert.equal(r.metrics.U, 5);
  assert.equal(r.metrics.R, 25);
  assert.equal(r.metrics.H, bits);
  assert.equal(r.metrics.B, r.metrics.branchTrials);
  assert.equal(r.score, scoreV2(5, r.metrics.B));
  assert.equal(r.level, levelForScore(r.score).id);
});

test('saturation reports the effective B apart from the actual counters', () => {
  const clues = witness60().slice(0, 2);
  const branchCap = measureV2(board60, pieces, clues, ws, { branch: 3, rows: 50000 });
  assert.equal(branchCap.saturated, true);
  assert.equal(branchCap.metrics.stop, 'branch-cap');
  assert.equal(branchCap.metrics.branchTrials, 3);
  assert.equal(branchCap.metrics.B, 5000);

  const rowCap = measureV2(board60, pieces, clues, ws, { branch: 5000, rows: 40 });
  assert.equal(rowCap.saturated, true);
  assert.equal(rowCap.metrics.stop, 'row-cap');
  assert.equal(rowCap.metrics.rowTrials, 40);
  assert.ok(rowCap.metrics.branchTrials < 5000);
  assert.equal(rowCap.metrics.B, 5000);
  assert.equal(scoreV2(rowCap.metrics.U, rowCap.metrics.B), 2 * 10 + 30);

  const solved = measureV2(board60, pieces, clues, ws);
  assert.equal(solved.saturated, false);
  assert.equal(solved.metrics.B, solved.metrics.branchTrials);
});

test('unsatisfiable clue sets are refused instead of rated', () => {
  assert.throws(() => rate(rect(1, 4), [
    { id: 'a', label: 'a', color: '#111111', cells: [[0, 0], [0, 1], [0, 2]] },
    { id: 'b', label: 'b', color: '#222222', cells: [[0, 0], [0, 1]] },
  ], [], ws), (e) => e instanceof UnsatisfiableError && /no solution/.test(e.message));
  assert.throws(() => rate(rect(2, 2), [p5, mono], [], ws), (e) => e instanceof UnsatisfiableError && /no legal placement/.test(e.message));
});

test('ratings ignore piece ids, colors and input order', () => {
  const layout = witness60();
  const clues = layout.filter((p) => 'FILNPTU'.includes(p.piece));
  const base = rate(board60, pieces, clues, ws);
  const rename = (/** @type {string} */ id) => `piece-${id.toLowerCase()}${id.charCodeAt(0)}`;
  const renamed = pieces.map((p, i) => ({ ...p, id: rename(p.id), label: `L${i}`, color: `#00${(i + 10).toString(16)}${(i + 10).toString(16)}00` }));
  const renamedClues = clues.map((c) => ({ ...c, piece: rename(c.piece) }));
  const permuted = rate(board60, renamed.slice().reverse(), renamedClues.slice().reverse(), ws);
  assert.deepEqual(permuted, base);
  const rotated = [...renamed.slice(5), ...renamed.slice(0, 5)];
  assert.deepEqual(rate(board60, rotated, renamedClues, ws), base);
});

// ============================================ difficulty-v3 measurement

const METRICS_V3_KEYS = [
  'U', 'R', 'H', 'B', 'branchTrials', 'rowTrials', 'dlxStop', 'searchStop', 'F', 'E', 'rules', 'deductionTier', 'tier',
  'G', 'info', 'Cmax', 'Dmax', 'Gt', 'nodes', 'work', 'S', 'solutionLimit', 'solutions', 'censusComplete',
  'censusUndecided', 'censusNodes', 'censusWork', 'Gproved',
];
const RULE_KEYS = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9'];
const noRules = () => ({ R1: 0, R2: 0, R3: 0, R4: 0, R5: 0, R6: 0, R7: 0, R8: 0, R9: 0 });
const forcedClue = /** @type {Pose} */ ({ piece: 'M', x: 0, y: 0, turn: 0, mirrored: false });
const I5 = /** @type {Piece} */ (pieces.find((p) => p.id === 'I'));
const HAND_AUTHORED = readFileSync(new URL('./fixtures/hand-authored-pack.json', import.meta.url), 'utf8');

/**
 * The claim of a measurement and the pack reader's verdict on it: the strict reader of a `difficulty-v3` claim
 * accepts it and keeps every field in its order.
 * @param {import('../core/engine/types.js').MetricsV3} metrics
 */
function assertReaderAccepts(metrics) {
  const value = scoreV3(metrics);
  const claim = {
    model: 'difficulty-v3',
    score: value,
    level: levelForScore(value).id,
    saturated: false,
    ...(metrics.censusComplete ? {} : { censored: true }),
    metrics,
  };
  const pack = JSON.parse(HAND_AUTHORED);
  pack.puzzles[0].rating = claim;
  const read = validatePack(pack);
  assert.ok(read.ok, read.ok ? '' : JSON.stringify(read.issues));
  assert.equal(JSON.stringify(read.value.puzzles[0].rating), JSON.stringify(claim));
}

test('measureV3 returns the 28 metrics in the MetricsV3 order and never saturates', () => {
  const clues = witness60().slice(0, 7);
  const r = measureV3(board60, pieces, clues, ws);
  const model = buildModel(board60, pieces, clues, ws);
  const bits = [...model.placementsPerPiece.subarray(0, model.freePieces.length)]
    .reduce((sum, rows) => sum + Math.log2(1 + rows), 0) / 5;
  assert.deepEqual(Object.keys(r.metrics), METRICS_V3_KEYS);
  assert.deepEqual(Object.keys(r.metrics.rules), RULE_KEYS);
  assert.equal(r.saturated, false);
  assert.equal(r.metrics.U, 5);
  assert.equal(r.metrics.R, 25);
  assert.equal(r.metrics.H, bits);
  assert.equal(r.metrics.solutionLimit, DEDUCE.solutions);
  assert.equal(r.metrics.tier, r.metrics.G > 0 ? 4 : r.metrics.deductionTier);
  assert.equal(r.metrics.censusComplete, r.metrics.censusUndecided === 0);
  assert.equal(r.metrics.Gproved, r.metrics.G);
  const again = measureV3(board60, pieces, clues, ws);
  assert.deepEqual(again, r);
  assert.notEqual(again.metrics.rules, r.metrics.rules, 'each result owns its rules');
  assert.equal(scoreV3(r.metrics), breakdownV3(r.metrics).score);
  assertReaderAccepts(r.metrics);
});

test('measureV3 of a complete layout gives the zero metrics', () => {
  const layout = witness60();
  const expected = {
    metrics: {
      U: 0, R: 0, H: 0, B: 0, branchTrials: 0, rowTrials: 0, dlxStop: 'solution', searchStop: 'exhausted', F: 0, E: 0,
      rules: noRules(), deductionTier: 0, tier: 0, G: 0, info: 0, Cmax: 0, Dmax: 0, Gt: 0, nodes: 0, work: 0, S: 1,
      solutionLimit: DEDUCE.solutions, solutions: 'unique', censusComplete: true, censusUndecided: 0, censusNodes: 0,
      censusWork: 0, Gproved: 0,
    },
    saturated: false,
  };
  const r = measureV3(board60, pieces, layout, ws);
  assert.deepEqual(r, expected);
  assert.equal(JSON.stringify(r), JSON.stringify(expected));
  assert.deepEqual(Object.keys(r.metrics), METRICS_V3_KEYS);
  assert.equal(scoreV3(r.metrics), 0);
  assertReaderAccepts(r.metrics);
  const custom = measureV3(board60, pieces, layout, ws, { deduce: { ...DEDUCE, solutions: 3 }, dlx: SCORE.caps });
  assert.equal(custom.metrics.solutionLimit, 3);
  assert.throws(() => measureV3(board60, pieces, [...layout.slice(1), { ...layout[1] }], ws), UnsatisfiableError);
  assert.throws(() => measureV3(board60, pieces, [{ ...layout[0], x: layout[0].x + 1 }, ...layout.slice(1)], ws),
    UnsatisfiableError);
});

test('measureV3 of a forced placement has no guess', () => {
  const r = measureV3(rect(3, 2), [p5, mono], [forcedClue], ws);
  const m = r.metrics;
  assert.equal(r.saturated, false);
  assert.deepEqual(
    [m.U, m.R, m.H, m.B, m.branchTrials, m.dlxStop, m.searchStop],
    [1, 5, 1, 0, 0, 'solution', 'exhausted'],
  );
  assert.equal(m.rowTrials, measureV2(rect(3, 2), [p5, mono], [forcedClue], ws).metrics.rowTrials);
  assert.deepEqual([m.F, m.E, m.deductionTier, m.tier], [1, 0, 1, 1]);
  assert.deepEqual(m.rules, { ...noRules(), R1: 1 });
  assert.deepEqual([m.G, m.info, m.Cmax, m.Dmax, m.Gt, m.nodes], [0, 0, 0, 0, 0, 1]);
  assert.deepEqual([m.S, m.solutionLimit, m.solutions], [1, DEDUCE.solutions, 'unique']);
  assert.deepEqual(
    [m.censusComplete, m.censusUndecided, m.censusNodes, m.censusWork, m.Gproved],
    [true, 0, 0, 0, 0],
  );
  assert.equal(scoreV3(m), breakdownV3(m).score);
  assertReaderAccepts(m);
});

test('measureV3 counts twin pieces as labelled pieces (the engine is total on them)', () => {
  const strip = boardFromRows(['#####', '#####']);
  const twins = [{ ...I5, id: 'a' }, { ...I5, id: 'b' }];
  const m = measureV3(strip, twins, [], ws).metrics;
  assert.deepEqual([m.S, m.solutions, m.searchStop], [2, 'few', 'exhausted']);
  assert.deepEqual([m.F, m.G, m.Gproved, m.Gt, m.nodes], [1, 0, 0, 1, 3]);
  assert.equal(m.rules.R1, 1);
  assert.equal(m.censusComplete, true);
  assertReaderAccepts(m);
});

test('measureV3 throws IncompleteRatingError for a capped deduction path', () => {
  const caps = /** @type {const} */ ([[{ ...DEDUCE, nodes: 0 }, 'node-cap'], [{ ...DEDUCE, work: 0 }, 'work-cap']]);
  for (const [deduce, stop] of caps) {
    assert.throws(() => measureV3(board60, pieces, [], ws, { deduce, dlx: SCORE.caps }), (e) => {
      assert.ok(e instanceof IncompleteRatingError);
      assert.equal(e.code, 'rating-incomplete');
      assert.equal(e.reason, 'path-capped');
      assert.equal(e.counters.stop, stop);
      if (stop === 'node-cap') {
        assert.equal(e.counters.nodes, 0);
      }
      assert.deepEqual(Object.keys(e.counters), ['nodes', 'work', 'stop']);
      return true;
    }, stop);
  }
});

test('measureV3 refuses unsatisfiable clue sets like the v2 rating', () => {
  assert.throws(() => measureV3(rect(1, 4), [
    { id: 'a', label: 'a', color: '#111111', cells: [[0, 0], [0, 1], [0, 2]] },
    { id: 'b', label: 'b', color: '#222222', cells: [[0, 0], [0, 1]] },
  ], [], ws), (e) => e instanceof UnsatisfiableError && /no solution/.test(e.message));
  assert.throws(() => measureV3(rect(2, 2), [p5, mono], [], ws),
    (e) => e instanceof UnsatisfiableError && /no legal placement/.test(e.message));
});

test('measureV3 reports an unfinished census as an estimate, never as an error', () => {
  const wide = boardFromRows(Array(5).fill('#'.repeat(41)));
  const strip = Array.from({ length: 41 }, (_, i) => ({ ...I5, id: `i${i}` }));
  const witness = /** @type {Pose[]} */ (solveFirst(buildModel(wide, strip, [], ws), { rowTrialLimit: 1e6 }).layout);
  const r = measureV3(wide, strip, witness.slice(0, 4), ws);
  const m = r.metrics;
  assert.equal(r.saturated, false);
  assert.equal(m.censusComplete, false);
  assert.ok(m.censusUndecided > 0);
  assert.ok(m.Gproved <= m.G);
  assert.equal(m.solutions, 'many');
  assert.equal(m.S, DEDUCE.solutions);
  assertReaderAccepts(m);

  // A cut budget is the same estimate on a small board: complete exactly when nothing is undecided.
  const clues = witness60().slice(0, 2);
  const cut = measureV3(board60, pieces, clues, ws, { deduce: { ...DEDUCE, census: 0 }, dlx: SCORE.caps });
  assert.equal(cut.saturated, false);
  assert.equal(cut.metrics.censusComplete, cut.metrics.censusUndecided === 0);
  assert.ok(cut.metrics.censusUndecided > 0, 'a budget of 0 leaves the alternatives of the guesses undecided');
  assert.ok(cut.metrics.Gproved <= cut.metrics.G);
  assertReaderAccepts(cut.metrics);
});

test('the DLX diagnostic of measureV3 never enters the deduction fields', () => {
  const clues = witness60().slice(0, 2);
  const normal = measureV3(board60, pieces, clues, ws);
  const capped = measureV3(board60, pieces, clues, ws, { deduce: DEDUCE, dlx: { branch: 3, rows: 50000 } });
  assert.equal(normal.saturated, false);
  assert.equal(capped.saturated, false);
  assert.equal(capped.metrics.dlxStop, 'branch-cap');
  assert.equal(capped.metrics.branchTrials, 3);
  assert.equal(capped.metrics.B, 5000);
  assert.equal(normal.metrics.dlxStop, 'solution');
  assert.equal(normal.metrics.B, normal.metrics.branchTrials);
  const withoutDlx = (/** @type {object} */ m) => Object.fromEntries(
    Object.entries(m).filter(([key]) => !['B', 'branchTrials', 'rowTrials', 'dlxStop'].includes(key)));
  assert.deepEqual(withoutDlx(capped.metrics), withoutDlx(normal.metrics));
  assert.equal(scoreV3(capped.metrics), scoreV3(normal.metrics));
  const rowCap = measureV3(board60, pieces, clues, ws, { deduce: DEDUCE, dlx: { branch: 5000, rows: 40 } });
  assert.equal(rowCap.metrics.dlxStop, 'row-cap');
  assert.equal(rowCap.metrics.rowTrials, 40);
  assert.equal(rowCap.metrics.B, 5000);
});

test('the v2 rating keeps its results under its v2 names', () => {
  const layout = witness60();
  const inputs = /** @type {[any, any, any][]} */ ([
    [rect(3, 2), [p5, mono], [forcedClue]],
    [board60, pieces, layout.slice(0, 7)],
  ]);
  const forced = rateV2(...inputs[0], ws);
  assert.deepEqual(Object.keys(forced), ['model', 'score', 'level', 'saturated', 'metrics']);
  assert.equal(forced.model, 'difficulty-v2');
  assert.equal(forced.score, 2);
  assert.equal(forced.level, 'very-easy');
  assert.equal(forced.saturated, false);
  assert.deepEqual(Object.keys(forced.metrics), ['U', 'B', 'branchTrials', 'rowTrials', 'stop', 'R', 'H']);
  assert.deepEqual([forced.metrics.U, forced.metrics.B, forced.metrics.branchTrials, forced.metrics.R, forced.metrics.H],
    [1, 0, 0, 5, 1]);
  const seven = rateV2(...inputs[1], ws);
  assert.equal(seven.score, scoreV2(5, seven.metrics.B));
  for (const input of inputs) {
    assert.equal(JSON.stringify(rate(...input, ws)), JSON.stringify(rateV2(...input, ws)));
  }
});
