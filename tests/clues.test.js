// @ts-check
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boardFromRows } from '../core/engine/board.js';
import { certify, makeUnique, selectClues } from '../core/engine/clues.js';
import { inBand, rate } from '../core/engine/difficulty.js';
import { clueKey } from '../core/engine/keys.js';
import { level } from '../core/engine/levels.js';
import { createRng } from '../core/engine/rng.js';
import { buildModel, isValidLayout, solveFirst } from '../core/engine/tiling.js';
import { createWorkspace, MAIN_WORKSPACE_BYTES } from '../core/engine/workspace.js';
import { CLUE_RECIPES, RECIPE_BOARD_ROWS, recipeWitness } from './fixtures/clue-recipes.js';
import { CLASSIC_PENTOMINOES } from './fixtures/polyominoes.js';

/** @typedef {import('../core/engine/types.js').Piece} Piece */
/** @typedef {import('../core/engine/types.js').Pose} Pose */
/** @typedef {import('../core/engine/types.js').Rating} Rating */

const ws = createWorkspace(MAIN_WORKSPACE_BYTES);
const board = boardFromRows([...RECIPE_BOARD_ROWS]);
const pieces = /** @type {Piece[]} */ ([...CLASSIC_PENTOMINOES]);
const layout = recipeWitness();
const K = pieces.length;

/**
 * @param {Partial<Parameters<typeof selectClues>[0]> & { seed?: string }} o
 * @returns {{ result: ReturnType<typeof selectClues>, rated: { clues: Pose[], rating: Rating }[] }}
 */
function run(o) {
  /** @type {{ clues: Pose[], rating: Rating }[]} */
  const rated = [];
  const result = selectClues({
    board,
    pieces,
    layout,
    target: level('normal'),
    rng: createRng(o.seed ?? 'clues'),
    uniqueness: 'any',
    excludeClueKeys: new Set(),
    ws,
    onRate: (clues, rating) => rated.push({ clues, rating }),
    ...o,
  });
  return { result, rated };
}

/** @param {Pose[]} clues */
const isSubsetOfLayout = (clues) => clues.every((c) => layout.some((p) => p.piece === c.piece && p.x === c.x
  && p.y === c.y && p.turn === c.turn && p.mirrored === c.mirrored));

/** @param {{ clues: Pose[] }[]} rated */
const distinctSubsets = (rated) => new Set(rated.map((r) => r.clues.map((c) => c.piece).sort().join(''))).size;

test('the fixture witness is a valid tiling', () => {
  assert.ok(isValidLayout(board, pieces, layout));
});

test('every reachable level gets an in-band subset of the witness', () => {
  for (const id of ['very-easy', 'easy', 'normal', 'hard', 'expert', 'master']) {
    const target = level(id);
    const { result, rated } = run({ target, seed: `any-${id}` });
    assert.ok(result.ok, `${id}: ${result.ok ? '' : result.reason}`);
    assert.equal(result.certificate, null);
    assert.ok(inBand(result.rating, target));
    assert.equal(result.rating.level, id);
    assert.ok(isSubsetOfLayout(result.clues));
    assert.ok(result.clues.length >= 1 && K - result.clues.length >= 2);
    assert.deepEqual(result.rating, rate(board, pieces, result.clues, ws));
    assert.ok(rated.length <= 64);
  }
});

test('required uniqueness returns a proven, in-band certificate', () => {
  for (const id of ['easy', 'hard', 'master']) {
    const target = level(id);
    const { result } = run({ target, uniqueness: 'require', seed: `req-${id}` });
    assert.ok(result.ok, `${id}: ${result.ok ? '' : result.reason}`);
    assert.deepEqual(result.certificate, { status: 'unique', model: 'dlx-v1', rowLimit: 10000, verified: true });
    assert.equal(certify(board, pieces, result.clues, ws, 10000).status, 'unique');
    assert.ok(inBand(result.rating, target));
    assert.deepEqual(result.rating, rate(board, pieces, result.clues, ws));
    assert.ok(isSubsetOfLayout(result.clues) && K - result.clues.length >= 2);
  }
});

test('published recipes still hold', () => {
  for (const [id, recipe] of Object.entries(CLUE_RECIPES)) {
    const clues = layout.filter((p) => recipe.pieces.includes(p.piece));
    assert.equal(clues.length, recipe.pieces.length);
    const r = rate(board, pieces, clues, ws);
    assert.equal(r.score, recipe.score, id);
    assert.equal(r.level, id);
    assert.equal(r.saturated, false);
    assert.equal(certify(board, pieces, clues, ws, 10000).status, 'unique');
  }
});

test('selection is deterministic for a seed and honours excluded clue keys', () => {
  const first = run({ seed: 'same' }).result;
  const again = run({ seed: 'same' }).result;
  assert.deepEqual(again, first);
  assert.ok(first.ok);
  const key = clueKey(board, pieces, first.clues);
  const other = run({ seed: 'same', excludeClueKeys: new Set([key]) }).result;
  assert.ok(other.ok);
  assert.notEqual(clueKey(board, pieces, other.clues), key);
});

test('every clue key excluded leaves nothing to accept', () => {
  const b = boardFromRows(Array(3).fill('#####'));
  const ps = ['P', 'U', 'V'].map((id) => /** @type {Piece} */ (pieces.find((p) => p.id === id)));
  const witness = /** @type {Pose[]} */ (solveFirst(buildModel(b, ps, [], ws), { rowTrialLimit: 1e6 }).layout);
  const singles = witness.map((p) => [p]);
  const scores = singles.map((c) => rate(b, ps, c, ws).score);
  const target = { min: Math.min(...scores), max: Math.max(...scores) + 1, share: 0.3 };
  const context = { board: b, pieces: ps, layout: witness, target, uniqueness: /** @type {const} */ ('any'), ws };
  const open = selectClues({ ...context, rng: createRng('excl'), excludeClueKeys: new Set() });
  assert.ok(open.ok);
  const banned = new Set(singles.map((c) => clueKey(b, ps, c)));
  assert.deepEqual(selectClues({ ...context, rng: createRng('excl'), excludeClueKeys: banned }), { ok: false, reason: 'not-in-band' });
});

test('repeated subsets are rejected before rating', () => {
  const b = boardFromRows(Array(3).fill('#####'));
  const ps = ['P', 'U', 'V'].map((id) => /** @type {Piece} */ (pieces.find((p) => p.id === id)));
  const witness = /** @type {Pose[]} */ (solveFirst(buildModel(b, ps, [], ws), { rowTrialLimit: 1e6 }).layout);
  /** @type {{ clues: Pose[], rating: Rating }[]} */
  const rated = [];
  const result = selectClues({
    board: b,
    pieces: ps,
    layout: witness,
    target: level('master'),
    rng: createRng('tiny'),
    uniqueness: 'any',
    excludeClueKeys: new Set(),
    ws,
    onRate: (clues, rating) => rated.push({ clues, rating }),
  });
  assert.deepEqual(result, { ok: false, reason: 'not-in-band' });
  assert.equal(rated.length, 3, 'only three one-piece subsets exist');
  assert.equal(distinctSubsets(rated), 3);
});

test('a band no subset reaches fails without relabelling and within 64 ratings', () => {
  for (const id of ['nightmare', 'hell-1']) {
    const target = level(id);
    const { result, rated } = run({ target, seed: `none-${id}` });
    assert.deepEqual(result, { ok: false, reason: 'not-in-band' });
    assert.ok(rated.length > 0 && rated.length <= 64);
    assert.equal(distinctSubsets(rated), rated.length);
    assert.ok(rated.every((r) => !inBand(r.rating, target)));
  }
});

test('the beam search finds a band the count-guided stage missed', () => {
  const target = { min: 34, max: 36, share: 0.3 };
  const { result, rated } = run({ target, seed: 'seed5' });
  assert.ok(result.ok);
  assert.ok(rated.length > 8 * 4, `phase 1 rates at most 32 subsets, saw ${rated.length}`);
  assert.ok(rated.length <= 64);
  assert.equal(distinctSubsets(rated), rated.length);
  assert.ok(inBand(result.rating, target));
  assert.deepEqual(result.rating, rate(board, pieces, result.clues, ws));
});

test('a uniqueness repair that leaves the band is not accepted', () => {
  const target = { min: 36, max: 38, share: 0.3 };
  const any = run({ target, seed: 'seed3' }).result;
  assert.ok(any.ok);
  const repaired = makeUnique(board, pieces, layout, any.clues, createRng('x'), ws, 10000);
  assert.ok(repaired !== null && repaired.length > any.clues.length);
  assert.equal(inBand(rate(board, pieces, repaired, ws), target), false);

  const required = run({ target, seed: 'seed3', uniqueness: 'require' }).result;
  assert.deepEqual(required, { ok: false, reason: 'not-in-band' });
});

test('invalid inputs are refused', () => {
  const broken = layout.map((p, i) => (i === 0 ? { ...layout[1] } : p));
  assert.throws(() => run({ layout: broken }), RangeError);
  assert.throws(() => run({ layout: layout.slice(1) }), RangeError);
  const two = pieces.slice(0, 2);
  assert.throws(() => run({ pieces: two, layout: layout.filter((p) => p.piece === 'F' || p.piece === 'I') }), RangeError);
});

test('generated ratings are the same under piece id, color and order permutations', () => {
  const { result } = run({ seed: 'perm', target: level('hard') });
  assert.ok(result.ok);
  const rename = (/** @type {string} */ id) => `q${id.charCodeAt(0)}`;
  const renamed = pieces.map((p, i) => ({ ...p, id: rename(p.id), color: `#${(i + 16).toString(16)}${(i + 16).toString(16)}${(i + 16).toString(16)}` }));
  const clues = result.clues.map((c) => ({ ...c, piece: rename(c.piece) })).reverse();
  assert.deepEqual(rate(board, renamed.reverse(), clues, ws), result.rating);
});

test('slow: a large required-unique request is never accepted on a cutoff', () => {
  const wide = boardFromRows(Array(5).fill('#'.repeat(41)));
  const I = /** @type {Piece} */ (pieces.find((p) => p.id === 'I'));
  const strip = Array.from({ length: 41 }, (_, i) => ({ ...I, id: `i${i}` }));
  const witness = /** @type {Pose[]} */ (solveFirst(buildModel(wide, strip, [], ws), { rowTrialLimit: 1e6 }).layout);
  const context = {
    board: wide,
    pieces: strip,
    layout: witness,
    target: level('hell-1'),
    excludeClueKeys: new Set(),
    ws,
  };
  const any = selectClues({ ...context, rng: createRng('big'), uniqueness: 'any' });
  assert.ok(any.ok && any.certificate === null);
  assert.notEqual(certify(wide, strip, any.clues, ws, 2000).status, 'unique');
  const required = selectClues({ ...context, rng: createRng('big'), uniqueness: 'require' });
  assert.deepEqual(required, { ok: false, reason: 'uniqueness-not-proved' });
});
