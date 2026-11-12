// @ts-check
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boardFromRows } from '../core/engine/board.js';
import { certify, makeUnique, selectClues } from '../core/engine/clues.js';
import { IncompleteRatingError, inBand, rate, rateV2, UnsatisfiableError } from '../core/engine/difficulty.js';
import { setAttempt } from '../core/engine/generate.js';
import { clueKey } from '../core/engine/keys.js';
import { level, levelForScore } from '../core/engine/levels.js';
import { createRng } from '../core/engine/rng.js';
import { buildModel, isValidLayout, solveFirst } from '../core/engine/tiling.js';
import { createWorkspace, MAIN_WORKSPACE_BYTES, SCRATCH_WORKSPACE_BYTES } from '../core/engine/workspace.js';
import { CLUE_RECIPES, RECIPE_BOARD_ROWS, recipeWitness } from './fixtures/clue-recipes.js';
import { CLASSIC_PENTOMINOES } from './fixtures/polyominoes.js';

/** @typedef {import('../core/engine/types.js').Board} Board */
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

/** @param {Pose[]} clues Clued piece ids in layout order. */
const ids = (clues) => clues.map((c) => c.piece).join('');

/** @param {Pose[]} clues */
const keyOf = (clues) => clueKey(board, pieces, clues);

/** @typedef {Parameters<typeof selectClues>[0]} Context */

/**
 * @param {number} score
 * @param {Piece[]} p
 * @param {Pose[]} clues
 * @returns {Rating}
 */
const fakeRating = (score, p, clues) => /** @type {Rating} */ (/** @type {unknown} */ ({
  model: 'difficulty-v2', score, level: levelForScore(score).id, saturated: false, metrics: { U: p.length - clues.length },
}));

/**
 * A rating seam: the score depends only on the number of clues.
 * @param {Record<number, number>} table Score by number of clues; other counts score 10.
 * @returns {NonNullable<Context['rate']>}
 */
const scripted = (table) => (_b, p, clues) => fakeRating(table[clues.length] ?? 10, p, clues);

/**
 * A rating seam by call order: the n-th rating call scores `scores[n]`, then 10. Fits `any` mode, where every
 * rating call is a search profile.
 * @param {number[]} scores
 * @returns {NonNullable<Context['rate']>}
 */
const sequence = (scores) => {
  let next = 0;
  return (_b, p, clues) => fakeRating(scores[next++] ?? 10, p, clues);
};

/**
 * Runs `selectClues` on the recipe board and records every rating call, marking the calls that `onRate`
 * reports as search profiles (a profile's rating call is followed at once by its `onRate`).
 * @param {Partial<Context> & Pick<Context, 'target'> & { seed: string }} o
 * @returns {{ result: ReturnType<typeof selectClues>, rated: { clues: Pose[], rating: Rating }[],
 *   calls: { ids: string, score: number, profile: boolean }[] }}
 */
function traced(o) {
  /** @type {{ ids: string, score: number, profile: boolean }[]} */
  const calls = [];
  /** @type {{ clues: Pose[], rating: Rating }[]} */
  const rated = [];
  const inner = o.rate ?? rate;
  const result = selectClues({
    board,
    pieces,
    layout,
    rng: createRng(o.seed),
    uniqueness: 'any',
    excludeClueKeys: new Set(),
    ws,
    ...o,
    onRate: (clues, rating) => {
      rated.push({ clues, rating });
      calls[calls.length - 1].profile = true;
    },
    rate: (b, p, clues, w) => {
      const r = inner(b, p, clues, w);
      calls.push({ ids: ids(clues), score: r.score, profile: false });
      return r;
    },
  });
  return { result, rated, calls };
}

/**
 * The band-centre oracle for `any` mode and a finite band, over the ratings a run made in order.
 * @param {{ min: number, max: number }} target
 * @param {{ clues: Pose[], rating: Rating }[]} rated
 * @returns {{ stop: number, pick: { clues: Pose[], rating: Rating } | null }}
 */
function expectedAny(target, rated) {
  const centre = (target.min + target.max) / 2;
  const half = (target.max - target.min) / 4;
  /** @type {{ clues: Pose[], rating: Rating, key: string }[]} */
  const seen = [];
  const nearest = () => seen.slice().sort((a, b) => Math.abs(a.rating.score - centre) - Math.abs(b.rating.score - centre)
    || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))[0];
  for (let i = 0; i < rated.length; i += 1) {
    const r = { ...rated[i], key: keyOf(rated[i].clues) };
    if (inBand(r.rating, target)) {
      seen.push(r);
      if (Math.abs(r.rating.score - centre) <= half) {
        return { stop: i + 1, pick: r };
      }
    }
    if (i + 1 >= 48 && seen.length > 0) {
      return { stop: i + 1, pick: nearest() };
    }
  }
  return { stop: rated.length, pick: seen.length > 0 ? nearest() : null };
}

/**
 * The 3 x 5 board of the P, U and V pieces, with its witness layout.
 * @returns {{ b: Board, ps: Piece[], witness: Pose[] }}
 */
function tinyCase() {
  const b = boardFromRows(Array(3).fill('#####'));
  const ps = ['P', 'U', 'V'].map((id) => /** @type {Piece} */ (pieces.find((p) => p.id === id)));
  const witness = /** @type {Pose[]} */ (solveFirst(buildModel(b, ps, [], ws), { rowTrialLimit: 1e6 }).layout);
  return { b, ps, witness };
}

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
    const v2 = rateV2(board, pieces, clues, ws);
    assert.equal(v2.score, recipe.score, id);
    assert.equal(v2.level, id);
    assert.equal(v2.saturated, false);
    const r = rate(board, pieces, clues, ws);
    assert.equal(r.level, levelForScore(r.score).id, id);
    assert.equal(r.saturated, false);
    assert.equal('censored' in r, false, id);
    assert.equal(/** @type {import('../core/engine/types.js').MetricsV3} */ (r.metrics).solutions, 'unique', id);
    assert.equal(/** @type {import('../core/engine/types.js').MetricsV3} */ (r.metrics).censusComplete, true, id);
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
    rate: rateV2,
  });
  assert.deepEqual(result, { ok: false, reason: 'not-in-band' });
  assert.equal(rated.length, 3, 'only three one-piece subsets exist');
  assert.equal(distinctSubsets(rated), 3);
});

test('a band no subset reaches fails without relabelling and within 64 ratings', () => {
  for (const id of ['nightmare', 'hell-1']) {
    const target = level(id);
    const { result, rated } = run({ target, seed: `none-${id}`, rate: rateV2 });
    assert.deepEqual(result, { ok: false, reason: 'not-in-band' });
    assert.ok(rated.length > 0 && rated.length <= 64);
    assert.equal(distinctSubsets(rated), rated.length);
    assert.ok(rated.every((r) => !inBand(r.rating, target)));
  }
});

test('the beam search finds a band the count-guided stage missed', () => {
  const target = { min: 34, max: 36, share: 0.3 };
  const { result, rated } = run({ target, seed: 'seed5', rate: rateV2 });
  assert.ok(result.ok);
  assert.ok(rated.length > 8 * 4, `phase 1 rates at most 32 subsets, saw ${rated.length}`);
  assert.ok(rated.length <= 64);
  assert.equal(distinctSubsets(rated), rated.length);
  assert.ok(inBand(result.rating, target));
  assert.deepEqual(result.rating, rateV2(board, pieces, result.clues, ws));
});

test('a uniqueness repair that leaves the band is not accepted', () => {
  const target = { min: 36, max: 38, share: 0.3 };
  const any = run({ target, seed: 'seed3', rate: rateV2 }).result;
  assert.ok(any.ok);
  const repaired = makeUnique(board, pieces, layout, any.clues, createRng('x'), ws, 10000);
  assert.ok(repaired !== null && repaired.length > any.clues.length);
  assert.equal(inBand(rateV2(board, pieces, repaired, ws), target), false);

  const required = run({ target, seed: 'seed3', uniqueness: 'require', rate: rateV2 }).result;
  assert.ok(required.ok);
  assert.ok(inBand(required.rating, target));
  assert.equal(required.certificate?.status, 'unique');
  assert.equal(certify(board, pieces, required.clues, ws, 10000).status, 'unique');
  assert.notEqual(clueKey(board, pieces, required.clues), clueKey(board, pieces, repaired));
});

// Centre-seeking acceptance (design §6.10). T is a finite band with centre 25, central half [22.5, 27.5] and
// initial clue count 3; S rates a clue set by its size only.
const T = { min: 20, max: 30, share: 0.22 };
const S = scripted({ 1: 40, 2: 25, 3: 21, 4: 18 });

/**
 * Compact trace: `p<n>` is a profile of n clues, `R<n>:<score>` a repair call.
 * @param {{ ids: string, score: number, profile: boolean }[]} calls
 */
const shape = (calls) => calls.map((c) => (c.profile ? `p${c.ids.length}` : `R${c.ids.length}:${c.score}`)).join(' ');

/** @param {{ ids: string, score: number, profile: boolean }[]} calls */
const repairs = (calls) => calls.filter((c) => !c.profile).map((c) => `${c.ids}:${c.score}`);

test('any, centre reconstruction', () => {
  const cases = [
    ...['very-easy', 'easy', 'normal', 'hard', 'expert', 'master'].map((id) => ({ target: level(id), seed: `centre-${id}` })),
    { target: { min: 34, max: 36, share: 0.3 }, seed: 'reserve-0' },
    { target: { min: 28, max: 30, share: 0.3 }, seed: 'reserve-3' },
  ];
  const stops = [];
  for (const { target, seed } of cases) {
    const { result, rated } = traced({ target, seed, rate: rateV2 });
    const expected = expectedAny(target, rated);
    assert.ok(expected.pick !== null, seed);
    assert.deepEqual(result, { ok: true, clues: expected.pick.clues, rating: expected.pick.rating, certificate: null }, seed);
    assert.equal(rated.length, expected.stop, seed);
    stops.push(rated.length);
  }
  assert.ok(stops.some((n) => n < 48), 'one case stops on a central candidate');
  assert.ok(stops.includes(48), 'one case stops at profile 48');
  assert.deepEqual(stops, [9, 6, 20, 1, 1, 6, 48, 48]);
});

test('any, ties by key', () => {
  const { result, rated } = traced({ rate: scripted({ 2: 21, 3: 29 }), target: T, seed: 'tie-0' });
  assert.equal(rated.length, 48);
  const keys = rated.filter((r) => inBand(r.rating, T)).map((r) => keyOf(r.clues)).sort();
  assert.ok(keys.length > 1);
  assert.ok(result.ok);
  assert.equal(keyOf(result.clues), keys[0]);
  assert.equal(ids(result.clues), 'YV');
});

test('any, end of search', () => {
  const { b, ps, witness } = tinyCase();
  const target = { min: 6, max: 14, share: 0.3 };
  /** @type {{ clues: Pose[], rating: Rating }[]} */
  const rated = [];
  const result = selectClues({
    board: b,
    pieces: ps,
    layout: witness,
    target,
    rng: createRng('end'),
    uniqueness: 'any',
    excludeClueKeys: new Set(),
    ws,
    onRate: (clues, rating) => rated.push({ clues, rating }),
    rate: rateV2,
  });
  assert.equal(rated.length, 3);
  assert.ok(result.ok);
  assert.equal(result.rating.score, 6);
  const nearest = rated.filter((r) => r.rating.score === 6).map((r) => clueKey(b, ps, r.clues)).sort();
  assert.deepEqual(rated.filter((r) => inBand(r.rating, target)).map((r) => r.clues[0].piece).sort(), ['U', 'V']);
  assert.equal(clueKey(b, ps, result.clues), nearest[0]);
  assert.equal(ids(result.clues), 'V');
});

test('unbounded', () => {
  const target = { min: 17, max: Infinity, share: 0.38 };
  const any = traced({ target, seed: 'unbounded', rate: rateV2 });
  assert.equal(any.rated.length, 1);
  assert.ok(any.result.ok);
  assert.deepEqual(any.result.clues, any.rated[0].clues);
  assert.equal(ids(any.result.clues), 'ILVTF');
  assert.equal(any.result.rating.score, 20);

  const required = traced({ target, seed: 'unbounded-1', uniqueness: 'require', rate: rateV2 });
  assert.deepEqual(required.calls.map((c) => `${c.ids}:${c.score}:${c.profile ? 'profile' : 'repair'}`),
    ['LVTNX:19:profile', 'LVTNFX:12:repair', 'LTFZX:20:profile']);
  assert.ok(required.result.ok);
  assert.equal(ids(required.result.clues), 'LTFZX');
  assert.equal(required.result.certificate?.status, 'unique');
  assert.ok(Number.isFinite(required.result.rating.score));
});

test('require, central stop', () => {
  const { result, rated, calls } = traced({ rate: S, target: T, uniqueness: 'require', seed: 'req-0' });
  assert.equal(rated.length, 6);
  assert.deepEqual(repairs(calls), []);
  assert.ok(result.ok);
  assert.equal(result.rating.score, 25);
  assert.equal(ids(result.clues), 'FW');
  assert.equal(result.certificate?.status, 'unique');
});

test('require, failed repair falls through', () => {
  const { result, calls } = traced({ rate: S, target: T, uniqueness: 'require', seed: 'req-2' });
  assert.equal(shape(calls), 'p3 p3 p3 p3 p4 p2 R4:18 p4 p2');
  assert.ok(result.ok);
  assert.equal(result.rating.score, 25);
  assert.equal(ids(result.clues), 'YP');
});

test('require, off-centre repairs, lazy best-first, each repair once', () => {
  const { result, rated, calls } = traced({ rate: S, target: T, uniqueness: 'require', seed: 'req-3' });
  assert.equal(rated.length, 48);
  assert.deepEqual(repairs(calls), ['WZX:21', 'FWZ:21', 'VTWX:18', 'PVTF:18', 'UFX:21', 'UNWX:18', 'NFX:21', 'IPN:21',
    'WZX:21', 'IPU:21', 'ILUF:18', 'PFZ:21']);
  assert.equal(calls[calls.length - 1].profile, true, 'no repair after profile 48');
  assert.ok(result.ok);
  assert.equal(result.rating.score, 21);
  assert.equal(ids(result.clues), 'UFX');
  assert.equal(certify(board, pieces, result.clues, ws, 10000).status, 'unique');
});

test('require, excluded repaired key', () => {
  const first = traced({ rate: S, target: T, uniqueness: 'require', seed: 'req-3' }).result;
  assert.ok(first.ok);
  const excludeClueKeys = new Set([keyOf(first.clues)]);
  const { result, rated, calls } = traced({ rate: S, target: T, uniqueness: 'require', seed: 'req-3', excludeClueKeys });
  assert.equal(rated.length, 48);
  assert.equal(repairs(calls).filter((r) => r.startsWith('UFX:')).length, 1, 'the excluded repair is rated once');
  assert.ok(result.ok);
  assert.equal(result.rating.score, 21);
  assert.equal(ids(result.clues), 'PFZ');
  assert.equal(excludeClueKeys.has(keyOf(result.clues)), false);
});

test('require, budget exhausted', () => {
  const only = scripted({ 1: 25 });
  const unproved = traced({ rate: only, target: T, uniqueness: 'require', seed: 'budget-0' });
  assert.deepEqual(unproved.result, { ok: false, reason: 'uniqueness-not-proved' });
  assert.equal(unproved.rated.length, 64);
  assert.equal(unproved.rated.filter((r) => inBand(r.rating, T)).length, 12);
  assert.equal(repairs(unproved.calls).length, 11);

  const outOfBand = traced({ rate: only, target: T, uniqueness: 'require', seed: 'budget-1' });
  assert.deepEqual(outOfBand.result, { ok: false, reason: 'not-in-band' });
  assert.equal(outOfBand.rated.length, 64);
  assert.equal(outOfBand.rated.filter((r) => inBand(r.rating, T)).length, 12);
  assert.equal(repairs(outOfBand.calls).length, 12, 'each in-band candidate is finished at most once');
});

test('no candidate', () => {
  for (const uniqueness of /** @type {const} */ (['any', 'require'])) {
    const { result, rated, calls } = traced({ rate: scripted({}), target: T, uniqueness, seed: 'none-0' });
    assert.deepEqual(result, { ok: false, reason: 'not-in-band' }, uniqueness);
    assert.equal(rated.length, 27, uniqueness);
    assert.equal(calls.length, 27, 'no repair is rated');
  }
});

// Stall stop (design §6.10, RES-15a). In `any` mode the n-th rating call is the n-th profile, so `sequence` scripts the
// profiles. With T, 21 and 22 are in band below the central half, 29 is in band above it and 35 is above the band.
const FLAT_21 = Array(60).fill(21);

test('stall, stops after 12 non-improving one-sided ratings and not before', () => {
  const flat = traced({ rate: sequence(FLAT_21), target: T, seed: 's1' });
  assert.equal(flat.rated.length, 13, 'the first in-band profile and 12 that are not nearer; ties do not reset the count');
  assert.ok(flat.result.ok);
  assert.equal(flat.result.rating.score, 21);
  assert.equal(keyOf(flat.result.clues), flat.rated.map((r) => keyOf(r.clues)).sort()[0]);

  const late = traced({ rate: sequence([...Array(12).fill(21), 22, ...FLAT_21]), target: T, seed: 's1' });
  assert.equal(late.rated.length, 25, '11 non-improving ratings are not enough; a nearer one at the 13th resets the count');
  assert.ok(late.result.ok);
  assert.equal(late.result.rating.score, 22);
  assert.deepEqual(late.result.clues, late.rated[12].clues);

  const lateStart = traced({ rate: sequence([10, 10, 10, 10, 10, ...FLAT_21]), target: T, seed: 's1' });
  assert.equal(lateStart.rated.length, 18, 'the count starts at the first in-band candidate (profile 6)');

  const outOfBand = traced({ rate: sequence([21]), target: T, seed: 's1' });
  assert.equal(outOfBand.rated.length, 13, 'ratings below the band are on the same side and are not nearer');
  assert.ok(outOfBand.result.ok);
  assert.equal(outOfBand.result.rating.score, 21);

  const skipped = new Set(flat.rated.slice(1, 3).map((r) => keyOf(r.clues)));
  const again = traced({ rate: sequence(FLAT_21), target: T, seed: 's1', excludeClueKeys: skipped });
  assert.equal(again.rated.length, 13, 'excluded (skipped) subsets are not rated candidates and are not counted');
  assert.equal(again.rated.some((r) => skipped.has(keyOf(r.clues))), false);
});

test('stall, not with a central candidate seen or candidates on both sides', () => {
  const both = traced({ rate: sequence([22, 29, ...FLAT_21]), target: T, seed: 's1' });
  assert.equal(both.rated.length, 48, 'an in-band candidate above the central half');
  assert.ok(both.result.ok);
  assert.equal(both.result.rating.score, 22);

  const above = traced({ rate: sequence([21, 35, ...FLAT_21]), target: T, seed: 's1' });
  assert.equal(above.rated.length, 48, 'a candidate above the band is on the other side too');
  assert.ok(above.result.ok);
  assert.equal(above.result.rating.score, 21);

  const central = traced({ rate: sequence([...Array(12).fill(21), 25]), target: T, seed: 's1' });
  assert.equal(central.rated.length, 13, 'the central stop comes first');
  assert.ok(central.result.ok);
  assert.equal(central.result.rating.score, 25);
});

test('stall, returns the best by ranked order', () => {
  const { result, rated } = traced({ rate: sequence([21, 22, 21, 22, ...FLAT_21]), target: T, seed: 's1' });
  assert.equal(rated.length, 14, 'the second 22 is a tie and does not reset the count');
  assert.ok(result.ok);
  assert.equal(result.rating.score, 22);
  assert.equal(keyOf(result.clues), [rated[1], rated[3]].map((r) => keyOf(r.clues)).sort()[0]);
});

test('stall, require mode counts raw ratings and returns the repaired final result', () => {
  // The stall reads the raw profiles; only the repair of the stalled candidate can reach a set of five or more
  // clues, which `boosted` rates central.
  const flat = traced({ rate: scripted(Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, 21]))), target: T,
    uniqueness: 'require', seed: 's4' });
  const boosted = traced({ rate: (_b, p, clues) => fakeRating(clues.length >= 5 ? 25 : 21, p, clues), target: T,
    uniqueness: 'require', seed: 's4' });
  for (const run of [flat, boosted]) {
    assert.equal(run.rated.length, 13);
    assert.equal(run.calls.slice(0, 13).every((c) => c.profile), true, 'no repair before the stop');
    assert.equal(run.calls.length, 14, 'one repair after the stop');
    assert.ok(run.result.ok);
    assert.equal(run.result.certificate?.status, 'unique');
  }
  assert.deepEqual(boosted.rated.map((r) => ids(r.clues)), flat.rated.map((r) => ids(r.clues)));
  assert.deepEqual(repairs(flat.calls), ['YVNWZ:21']);
  assert.deepEqual(repairs(boosted.calls), ['YVNWZ:25']);
  assert.ok(flat.result.ok && boosted.result.ok);
  assert.equal(flat.result.rating.score, 21);
  assert.equal(boosted.result.rating.score, 25);
});

test('stall, an unbounded band never stops on a stall', () => {
  const target = { min: 20, max: Infinity, share: 0.22 };
  const { result, rated, calls } = traced({ rate: scripted({ 1: 21 }), target, uniqueness: 'require', seed: 'u1' });
  assert.deepEqual(result, { ok: false, reason: 'not-in-band' });
  assert.equal(rated.length, 64);
  assert.equal(calls.length - rated.length, repairs(calls).length);
});

test('stall, a search that needs ten ratings still reaches the central result (10 x 6 Master)', () => {
  const { result, calls } = traced({ target: level('master'), seed: 'pop-master-any-22', rate: rateV2 });
  assert.deepEqual(calls.map((c) => `${c.ids.length}/${c.score}`),
    ['3/39', '3/35', '3/33', '3/37', '2/36', '2/29', '2/29', '2/38', '1/35', '1/48']);
  assert.ok(result.ok);
  assert.equal(result.rating.score, 48);
  assert.equal(result.clues.length, 1);
});

test('slow: a 15 x 20 Nightmare calibration (K = 24) is in band under v3 (D36: replaces the Hell 2 case)', () => {
  const execution = { main: createWorkspace(MAIN_WORKSPACE_BYTES), scratch: createWorkspace(SCRATCH_WORKSPACE_BYTES) };
  const set = setAttempt({ board: boardFromRows(Array(20).fill('#'.repeat(15))), rotation: 0, levelId: 'nightmare',
    seedText: 't18-big-a', uniqueness: 'any', execution }, 0);
  assert.ok(set.ok);
  assert.equal(set.set.pieces.length, 24);
  assert.equal(set.calibration.rating.model, 'difficulty-v3');
  assert.ok(inBand(set.calibration.rating, level('nightmare')));
  assert.equal(set.calibration.rating.score, 67);
  assert.equal(set.calibration.clues.length, 4);
});

test('slow: an unrateable calibration ends not-in-band with no puzzle (D36)', () => {
  const execution = { main: createWorkspace(MAIN_WORKSPACE_BYTES), scratch: createWorkspace(SCRATCH_WORKSPACE_BYTES) };
  const set = setAttempt({ board: boardFromRows(Array(22).fill('#'.repeat(22))), rotation: 0, levelId: 'hell-3',
    seedText: 't18-big-a', uniqueness: 'any', execution }, 0);
  assert.deepEqual(set, { ok: false, reason: 'not-in-band' });
});

// Unrateable and unproved candidates (design §6.10, RES-04, RES-35 / AR1). The scripted v3 ratings carry `Gproved`;
// H is Hard (centre 21, central half [19, 23], initial clue count 5) and N is Normal (initial clue count 6).
const H = level('hard');
const N = level('normal');

/**
 * @param {Piece[]} p
 * @param {Pose[]} clues
 * @param {number} score
 * @param {number | undefined} Gproved
 * @param {boolean} [censored] true for a labelled estimate (C1 (b))
 * @returns {Rating}
 */
const v3Rating = (p, clues, score, Gproved, censored = false) => /** @type {Rating} */ (/** @type {unknown} */ ({
  model: 'difficulty-v3', score, level: levelForScore(score).id, saturated: false,
  ...(censored ? { censored: true } : {}),
  metrics: Gproved === undefined ? { U: p.length - clues.length } : { U: p.length - clues.length, Gproved },
}));

const capped = () => new IncompleteRatingError('the deduction path was capped', { nodes: 5, work: 7, stop: 'work-cap' });

/** @typedef {number | [number, number | undefined] | [number, number | undefined, boolean] | 'capped' | Error} Scripted */

/**
 * A score (Gproved 1), [score, Gproved], [score, Gproved, true] (a labelled estimate), 'capped' (unrateable) or an
 * Error (thrown as it is).
 * @param {Scripted} entry
 * @param {Piece[]} p
 * @param {Pose[]} clues
 * @returns {Rating}
 */
function answer(entry, p, clues) {
  if (entry === 'capped') {
    throw capped();
  }
  if (entry instanceof Error) {
    throw entry;
  }
  if (typeof entry === 'number') {
    return v3Rating(p, clues, entry, 1);
  }
  return v3Rating(p, clues, entry[0], entry[1], entry[2] === true);
}

/**
 * A rating seam by number of clues; other counts answer [10, 1].
 * @param {Record<number, Scripted>} table
 * @returns {NonNullable<Context['rate']>}
 */
const byCount = (table) => (_b, p, clues) => answer(table[clues.length] ?? [10, 1], p, clues);

/**
 * A rating seam by call order; the last entry repeats.
 * @param {Scripted[]} list
 * @returns {NonNullable<Context['rate']>}
 */
const bySequence = (list) => {
  let next = 0;
  return (_b, p, clues) => answer(list[Math.min(next++, list.length - 1)], p, clues);
};

/**
 * `traced`, recording how each rating call ended: `score` or `score/Gproved`, `capped` for an unrateable subset,
 * `threw` for any other error. A call is a search profile when `onRate` follows it at once.
 * @typedef {{ ids: string, outcome: string, profile: boolean }} Call
 * @param {Partial<Context> & Pick<Context, 'target'> & { seed: string }} o
 * @param {Call[]} [calls] Filled as the calls happen, so that a throwing run can be inspected.
 * @returns {ReturnType<typeof selectClues>}
 */
function tracedOutcomes(o, calls = []) {
  const inner = o.rate ?? rate;
  return selectClues({
    board,
    pieces,
    layout,
    rng: createRng(o.seed),
    uniqueness: 'any',
    excludeClueKeys: new Set(),
    ws,
    ...o,
    onRate: () => {
      calls[calls.length - 1].profile = true;
    },
    rate: (b, p, clues, w) => {
      const call = { ids: ids(clues), outcome: 'threw', profile: false };
      calls.push(call);
      try {
        const r = inner(b, p, clues, w);
        call.outcome = 'Gproved' in r.metrics ? `${r.score}/${r.metrics.Gproved}` : `${r.score}`;
        return r;
      } catch (error) {
        if (error instanceof IncompleteRatingError) {
          call.outcome = 'capped';
        }
        throw error;
      }
    },
  });
}

/** @param {Call[]} calls */
const written = (calls) => calls.map((c) => `${c.ids}:${c.outcome}${c.profile ? '*' : ''}`);

/**
 * The calls by clue count and ending: `<clues>:<outcome>[*]` to the number of such calls.
 * @param {Call[]} calls
 * @returns {Record<string, number>}
 */
const tally = (calls) => {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const c of calls) {
    const name = `${c.ids.length}:${c.outcome}${c.profile ? '*' : ''}`;
    counts[name] = (counts[name] ?? 0) + 1;
  }
  return counts;
};

/**
 * @param {Partial<Context> & Pick<Context, 'target'> & { seed: string }} o
 * @returns {{ result: ReturnType<typeof selectClues>, calls: Call[] }}
 */
function outcomes(o) {
  /** @type {Call[]} */
  const calls = [];
  const result = tracedOutcomes(o, calls);
  return { result, calls };
}

/** @param {Call[]} calls */
const allDistinctWith5Clues = (calls) => calls.every((c) => c.ids.length === 5) && new Set(calls.map((c) => c.ids)).size === calls.length;

test('unproved or unrateable subsets, none usable: 20 distinct subsets spent, no onRate', () => {
  for (const [name, table, seed] of /** @type {const} */ ([
    ['refused', { 5: [21, 0] }, 'refused-0'],
    ['unrateable', { 5: 'capped' }, 'capped-0'],
  ])) {
    const { result, calls } = outcomes({ rate: byCount(table), target: H, seed });
    assert.deepEqual(result, { ok: false, reason: 'not-in-band' }, name);
    assert.equal(calls.length, 20, `${name}: 4 profiles in phase 1 (nothing below or above), then 16 in phase 2`);
    assert.equal(allDistinctWith5Clues(calls), true, name);
    assert.equal(calls.some((c) => c.profile), false, `${name}: onRate is never called`);
  }
});

test('a Hard subset without a proved decisive guess is refused, then a proved one is taken', () => {
  const refused = outcomes({ rate: bySequence([[21, 0], [21, 1]]), target: H, seed: 'refused-1' });
  assert.deepEqual(written(refused.calls), ['LPUVF:21/0', 'UTFZX:21/1*']);
  assert.ok(refused.result.ok);
  assert.equal(ids(refused.result.clues), 'UTFZX');
  assert.equal(refused.result.rating.score, 21);
  assert.equal(refused.result.certificate, null);

  const estimate = outcomes({ rate: bySequence([[21, 0], [21, 1, true]]), target: H, seed: 'refused-1' });
  assert.deepEqual(written(estimate.calls), ['LPUVF:21/0', 'UTFZX:21/1*']);
  assert.ok(estimate.result.ok);
  assert.equal(ids(estimate.result.clues), 'UTFZX');
  assert.equal(estimate.result.rating.score, 21);
  assert.equal(/** @type {{ censored?: boolean }} */ (estimate.result.rating).censored, true);
  assert.equal(/** @type {{ Gproved?: number }} */ (estimate.result.rating.metrics).Gproved, 1);
});

test('below Hard a rating without a proved decisive guess is accepted', () => {
  const { result, calls } = outcomes({ rate: bySequence([[14, 0]]), target: N, seed: 'normal-0' });
  assert.deepEqual(written(calls), ['YUTFWX:14/0*']);
  assert.ok(result.ok);
  assert.equal(ids(result.clues), 'YUTFWX');
  assert.equal(result.rating.score, 14);
});

test('an unrateable subset spends a profile and the search goes on', () => {
  const hard = outcomes({ rate: bySequence(['capped', [21, 1]]), target: H, seed: 'capped-1' });
  assert.deepEqual(written(hard.calls), ['ILYTZ:capped', 'IVTZX:21/1*']);
  assert.ok(hard.result.ok);
  assert.equal(ids(hard.result.clues), 'IVTZX');

  const normal = outcomes({ rate: bySequence(['capped', [14, 0]]), target: N, seed: 'capped-2' });
  assert.deepEqual(written(normal.calls), ['IYPUTF:capped', 'ILUVTW:14/0*']);
  assert.ok(normal.result.ok);
  assert.equal(ids(normal.result.clues), 'ILUVTW');
});

test('a repair whose rating is refused or unrateable fails and the next candidate is tried', () => {
  const refused = outcomes({ rate: byCount({ 5: [21, 1], 6: [21, 0], 7: [21, 0], 8: [21, 0], 9: [21, 0] }), target: H,
    uniqueness: 'require', seed: 'repair-2' });
  assert.deepEqual(written(refused.calls), ['IYTZX:21/1*', 'IYTWZX:21/0', 'YUVWZ:21/1*']);
  assert.ok(refused.result.ok);
  assert.equal(ids(refused.result.clues), 'YUVWZ');
  assert.equal(refused.result.certificate?.status, 'unique');
  assert.equal(certify(board, pieces, refused.result.clues, ws, 10000).status, 'unique');

  const unrateable = outcomes({ rate: byCount({ 5: [21, 1], 6: 'capped', 7: 'capped', 8: 'capped', 9: 'capped' }),
    target: H, uniqueness: 'require', seed: 'repair-2' });
  assert.deepEqual(written(unrateable.calls), ['IYTZX:21/1*', 'IYTWZX:capped', 'YUVWZ:21/1*']);
  assert.ok(unrateable.result.ok);
  assert.equal(ids(unrateable.result.clues), 'YUVWZ');
  assert.equal(unrateable.result.certificate?.status, 'unique');
});

test('every error other than IncompleteRatingError propagates as the same object', () => {
  for (const error of [new RangeError('boom'), new UnsatisfiableError('x')]) {
    assert.throws(() => outcomes({ rate: () => {
      throw error;
    }, target: H, seed: 'boom' }), (e) => e === error);
  }
  const boom = new RangeError('boom');
  /** @type {Call[]} */
  const calls = [];
  assert.throws(() => tracedOutcomes({ rate: byCount({ 5: [21, 1], 6: boom }), target: H, uniqueness: 'require',
    seed: 'repair-2' }, calls), (e) => e === boom);
  assert.deepEqual(written(calls), ['IYTZX:21/1*', 'IYTWZX:threw']);
});

test('spent profiles count for the stop at profile 48', () => {
  const { result, calls } = outcomes({ rate: byCount({ 5: [17, 1], 4: 'capped', 6: [26, 1] }), target: H,
    seed: 'reserve-spent' });
  assert.equal(calls.length, 48);
  assert.deepEqual(tally(calls), { '5:17/1*': 17, '6:26/1*': 20, '4:capped': 11 });
  assert.equal(written(calls)[47], 'LNWZ:capped');
  assert.equal(calls.filter((c) => c.profile).length, 37);
  assert.ok(result.ok);
  assert.equal(ids(result.clues), 'LYNWZ');
  assert.equal(result.rating.score, 17);
});

test('stall, spent profiles do not advance the stall counter', () => {
  const { result, calls } = outcomes({ rate: byCount({ 5: [17, 1], 4: 'capped', 6: [30, 0] }), target: H,
    seed: 'reserve-spent' });
  const text = written(calls);
  assert.equal(calls.length, 34);
  assert.deepEqual(tally(calls), { '5:17/1*': 13, '6:30/0': 15, '4:capped': 6 });
  assert.deepEqual(text.slice(0, 6), ['LVNWZ:17/1*', 'ILYFZ:17/1*', 'YPUVN:17/1*', 'IUVWZ:17/1*', 'ILNWZ:17/1*', 'LYNWZ:17/1*']);
  assert.equal(text[33], 'LYFWZ:17/1*', 'the stall stop fires at the 13th rated candidate');
  assert.ok(result.ok);
  assert.equal(ids(result.clues), 'LYNWZ');
  assert.equal(result.rating.score, 17);
});

test('stall, unrateable profiles between rated ones are neutral', () => {
  const { result, calls } = outcomes({ rate: bySequence([[18, 1], 'capped', 'capped', 'capped', [18, 1]]), target: H,
    seed: 'stall-capped' });
  assert.deepEqual(written(calls), ['PVTFW:18/1*', 'YPNFX:capped', 'IYPUT:capped', 'YVTFX:capped', 'PVTFWZ:18/1*',
    'PVTF:18/1*', 'PVFW:18/1*', 'LPVTFW:18/1*', 'PVTNFW:18/1*', 'YPVTFW:18/1*', 'PVTW:18/1*', 'PTFW:18/1*', 'PVTN:18/1*',
    'IPVT:18/1*', 'PTF:18/1*', 'YPVF:18/1*']);
  assert.equal(calls.filter((c) => c.profile).length, 13);
  assert.ok(result.ok);
  assert.equal(ids(result.clues), 'YPVF');
  assert.equal(result.rating.score, 18);
});

test('stall, a refused profile is on no side of the central half and not nearer', () => {
  for (const [score, expected] of /** @type {const} */ ([[21, 'YPVZ:21/0'], [30, 'YPVZ:30/0']])) {
    const list = [[18, 1], [18, 1], [18, 1], [18, 1], [18, 1], [18, 1], [18, 1], [score, 0], [18, 1]];
    const { result, calls } = outcomes({ rate: bySequence(/** @type {Scripted[]} */ (list)), target: H,
      seed: 'stall-refused' });
    assert.deepEqual(written(calls), ['YPVTZ:18/1*', 'INFWX:18/1*', 'ILVNW:18/1*', 'YPUVT:18/1*', 'YPVTZX:18/1*',
      'LYPTZ:18/1*', 'IYPVTZ:18/1*', expected, 'YPTZ:18/1*', 'YPVTNZ:18/1*', 'LYPVTZ:18/1*', 'YPVTFZ:18/1*', 'INWX:18/1*',
      'IFWX:18/1*'], String(score));
    assert.equal(calls.filter((c) => c.profile).length, 13, String(score));
    assert.ok(result.ok, String(score));
    assert.equal(ids(result.clues), 'YPTZ', String(score));
    assert.equal(result.rating.score, 18, String(score));
  }
});

test('a rating without Gproved is never refused', () => {
  const { result, calls } = outcomes({ rate: sequence([21]), target: H, seed: 'v2-0' });
  assert.deepEqual(written(calls), ['IYUVX:21*']);
  assert.ok(result.ok);
  assert.equal(ids(result.clues), 'IYUVX');
});

test('Hard or above starts at the lower edge of Hard (min 17)', () => {
  const below = outcomes({ rate: bySequence([[23, 0]]), target: { min: 16, max: 30, share: 0.38 }, seed: 'edge-16' });
  assert.deepEqual(written(below.calls), ['LYUFZ:23/0*']);
  assert.ok(below.result.ok);
  assert.equal(ids(below.result.clues), 'LYUFZ');

  const edge = outcomes({ rate: bySequence([[23, 0], [23, 1]]), target: { min: 17, max: 30, share: 0.38 },
    seed: 'edge-17' });
  assert.deepEqual(written(edge.calls), ['UVNFX:23/0', 'ILUVW:23/1*']);
  assert.ok(edge.result.ok);
  assert.equal(ids(edge.result.clues), 'ILUVW');
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
    target: { min: 0, max: Infinity, share: 0.1 },
    excludeClueKeys: new Set(),
    ws,
  };
  const any = selectClues({ ...context, rng: createRng('big'), uniqueness: 'any' });
  assert.ok(any.ok && any.certificate === null);
  assert.notEqual(certify(wide, strip, any.clues, ws, 2000).status, 'unique');
  const required = selectClues({ ...context, rng: createRng('big'), uniqueness: 'require' });
  assert.deepEqual(required, { ok: false, reason: 'uniqueness-not-proved' });
});
