// @ts-check
// Generation Steps model (MP16a, design §6.12 and §11.11): the two views and the compact filter, the step sentences,
// the score table, the stage list and the status text, and the controller, on the real replay of the replay fixture
// (tests/fixtures/replay-case.json, the first candidate puzzle) and on small synthetic step lists.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, test } from 'node:test';
import { PoolAbortError, PoolError, WorkerTaskError } from '../core/browser/worker-pool.js';
import { boardFromRows } from '../core/engine/board.js';
import { breakdownV3 } from '../core/engine/difficulty.js';
import { clueKey } from '../core/engine/keys.js';
import { validatePack } from '../core/engine/pack.js';
import { REPLAY } from '../core/engine/policy.js';
import { finalStep, replayPuzzle } from '../core/engine/replay.js';
import { createWorkspace, MAIN_WORKSPACE_BYTES, SCRATCH_WORKSPACE_BYTES } from '../core/engine/workspace.js';
import { packOf, setLocale, t } from '../generator/i18n.js';
import {
  boardOf, compactIndices, compactSteps, createReplayController, descriptorKeys, failureText, renderDesc, scoreTable,
  stageList, statusText, stepKeyOf, stepText, visibleIndices,
} from '../generator/ui/replay-model.js';

/** @typedef {import('../core/engine/replay.js').ReplayResult} ReplayResult */
/** @typedef {import('../core/engine/replay.js').Step} Step */
/** @typedef {import('../generator/ui/replay-model.js').Desc} Desc */

afterEach(() => {
  setLocale('en', null);
});

const FIXTURE = JSON.parse(readFileSync(new URL('./fixtures/replay-case.json', import.meta.url), 'utf8'));
const workspaces = { ws: createWorkspace(MAIN_WORKSPACE_BYTES), scratch: createWorkspace(SCRATCH_WORKSPACE_BYTES) };

/**
 * The inputs of every puzzle of the fixture packs, with the set as the Generator builds it from a pack.
 * @returns {{ set: any, puzzle: any, generation: any }[]}
 */
function fixtureInputs() {
  return FIXTURE.packs.flatMap((/** @type {unknown} */ raw) => {
    const read = validatePack(raw);
    assert.ok(read.ok, 'the fixture pack is valid');
    const pack = /** @type {any} */ (read.value);
    const set = {
      board: boardFromRows(pack.board.rows),
      pieces: pack.pieces,
      witness: pack.witness ?? null,
      carving: pack.generation.carving,
      macroRegion: pack.generation.macroRegion,
    };
    return pack.puzzles.map((/** @type {any} */ puzzle) => ({ set, puzzle, generation: pack.generation }));
  });
}

const INPUTS = fixtureInputs();
const madeOf = (/** @type {any} */ input) => input.generation.made[input.puzzle.id];
const FIRST = /** @type {any} */ (INPUTS.find((input) => madeOf(input).kind === 'candidate'));
const CALIBRATION = /** @type {any} */ (INPUTS.find((input) => madeOf(input).kind === 'calibration'));
const SET = FIRST.set;
/** The replay of every puzzle of the fixture, made once. */
const ALL = INPUTS.map((input) => ({ input, result: /** @type {ReplayResult} */ (replayPuzzle(input, workspaces, REPLAY)) }));
/** @type {ReplayResult} */
const RESULT = /** @type {any} */ (ALL.find((one) => one.input === FIRST)).result;
/** @type {ReplayResult} */
const CALIBRATION_RESULT = /** @type {any} */ (ALL.find((one) => one.input === CALIBRATION)).result;
const SOURCE = /** @type {any} */ ({ set: SET, puzzle: FIRST.puzzle, setOrigin: null, made: null });
const EN = packOf('en');
const VI = packOf('vi');

/** @param {Record<string, string>} pack @param {string} key @returns {string | undefined} */
const textOf = (pack, key) => pack[key] ?? pack[`${key}_other`] ?? pack[`${key}_one`];
/** @param {string} text */
const placeholders = (text) => [...new Set([...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort();

/**
 * @param {Partial<Step>} [over]
 * @returns {Step}
 */
function step(over = {}) {
  return {
    stage: 5,
    kind: 'rated',
    board: { placed: [], lifted: [], clues: [] },
    rating: null,
    breakdown: null,
    detail: null,
    band: null,
    note: 'replay.step.rated',
    args: {},
    ...over,
  };
}

/**
 * @param {number} score
 * @param {{ min: number, max: number | null }} [band]
 * @returns {Step}
 */
function rated(score, band = { min: 17, max: 25 }) {
  return step({
    rating: /** @type {any} */ ({ model: 'difficulty-v3', score, level: 'hard', saturated: false }),
    band,
    args: { sequence: 0, phase: 'sample', source: 'candidate' },
  });
}

const REAL_RATED = RESULT.steps.findIndex((s) => s.kind === 'rated' && (s.detail?.first.census.length ?? 0) > 0);
const REAL_REJECTED = RESULT.steps.findIndex((s) => s.kind === 'rejected');
const REAL_FINAL = /** @type {Step} */ (RESULT.steps.at(-1));

// ---------------------------------------------------------------------------------------------------------------
// 1. The compact filter.

test('the compact filter keeps a rated step only when it strictly improves the P1 rank (band, centre, clue key)', () => {
  const steps = [10, 30, 12, 20, 21, 21, 22].map((score) => rated(score));
  const keys = ['k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7'];
  // d = [7, 11, k1], [6, 9, k2], [5, 9, k3], [0, 1, k4], [0, 0, k5], [0, 0, k6], [0, 1, k7]
  assert.deepEqual(compactIndices(steps, (_s, i) => keys[i]), [0, 1, 2, 3, 4]);
  assert.deepEqual(compactSteps(steps, (_s, i) => keys[i]), [0, 1, 2, 3, 4].map((i) => steps[i]));
  const smaller = [...keys];
  smaller[5] = 'k0';
  assert.deepEqual(compactIndices(steps, (_s, i) => smaller[i]), [0, 1, 2, 3, 4, 5], 'a tied score with a smaller key');
  const open = [10, 12, 17, 30].map((score) => rated(score, { min: 17, max: null }));
  assert.deepEqual(compactIndices(open, (_s, i) => `k${i + 1}`), [0, 1, 2], 'no upper edge: the centre distance is 0');
  const openLate = [30, 17].map((score) => rated(score, { min: 17, max: null }));
  assert.deepEqual(compactIndices(openLate, (_s, i) => ['k2', 'k9'][i]), [0], 'in an open band every in-band score is as central as another');
  // The upper edge is excluded: 25 is out of the band by 1, 17 is in it, both 4 from the centre.
  assert.deepEqual(compactIndices([25, 17].map((score) => rated(score)), (_s, i) => ['k1', 'k2'][i]), [0, 1]);
  // The same clue set (an equal rank) is not an improvement; a step without a rating is never one.
  assert.deepEqual(compactIndices([21, 21].map((score) => rated(score)), () => 'k5'), [0]);
  const unrated = step({ kind: 'rated', band: { min: 17, max: 25 } });
  assert.deepEqual(compactIndices([step({ stage: 5, kind: 'skip' }), unrated, rated(10)], (_s, i) => `k${i}`), [0, 2]);
  // The first step of a stage is kept whatever it is; skips, refusals and unrateable sets in between are not.
  const mixed = [
    step({ stage: 1, kind: 'count' }), step({ stage: 2, kind: 'carve' }), step({ stage: 3, kind: 'piece' }),
    step({ stage: 3, kind: 'piece' }), step({ stage: 4, kind: 'start' }), step({ stage: 4, kind: 'retile' }),
    step({ stage: 5, kind: 'skip' }), rated(30), rated(10), step({ stage: 5, kind: 'rejected', rating: rated(20).rating, band: rated(20).band }),
    step({ stage: 5, kind: 'unrateable' }), step({ stage: 6, kind: 'repair' }), step({ stage: 6, kind: 'repair' }),
    step({ stage: 5, kind: 'selected' }), step({ stage: 7, kind: 'final' }),
  ];
  assert.deepEqual(compactIndices(mixed, (_s, i) => `k${i}`), [0, 1, 2, 4, 6, 7, 11, 12, 13, 14]);
});

test('the compact filter on every real result keeps the rated steps that an independent loop keeps', () => {
  let decided = 0;
  for (const { input, result } of ALL) {
    const { steps } = result;
    const set = input.set;
    const keyOf = stepKeyOf(set);
    /** @param {Step} s @returns {[number, number, string]} */
    const rank = (s) => {
      const poses = s.board.placed.filter((p) => s.board.clues.includes(/** @type {string} */ (p.id))).map((p) => /** @type {any} */ (p.pose));
      const { min, max } = /** @type {{ min: number, max: number | null }} */ (s.band);
      const score = /** @type {number} */ (s.rating?.score);
      const distance = score < min ? min - score : max !== null && score >= max ? score - max + 1 : 0;
      return [distance, max === null ? 0 : Math.abs(score - (min + max) / 2), clueKey(set.board, set.pieces, poses)];
    };
    /** @param {[number, number, string]} a @param {[number, number, string]} b */
    const before = (a, b) => (a[0] !== b[0] ? a[0] < b[0] : a[1] !== b[1] ? a[1] < b[1] : a[2] < b[2]);
    /** @type {number[]} */
    const expected = [];
    /** @type {[number, number, string][]} */
    const earlier = [];
    steps.forEach((s, i) => {
      if (s.kind === 'rated') {
        const r = rank(s);
        if (earlier.every((other) => before(r, other))) {
          expected.push(i);
        }
        earlier.push(r);
      }
    });
    const kept = compactIndices(steps, keyOf).filter((i) => steps[i].kind === 'rated');
    assert.deepEqual(kept, expected, input.puzzle.id);
    assert.ok(expected.length >= 1 && expected.length <= earlier.length);
    const at = steps.findIndex((s) => s.kind === 'rated');
    assert.equal(keyOf(steps[at], at), rank(steps[at])[2], 'the key is clueKey of the poses of the clue ids');
    if (JSON.stringify(compactIndices(steps, keyOf)) !== JSON.stringify(compactIndices(steps, () => ''))) {
      decided += 1;
    }
  }
  assert.ok(ALL.length >= 6 && decided >= 3, `the clue keys decide the view of ${decided} of ${ALL.length} fixture puzzles`);
  assert.ok(compactIndices(RESULT.steps, stepKeyOf(SET)).length < RESULT.steps.length, 'the filter drops steps');
});
// ---------------------------------------------------------------------------------------------------------------
// 2. The views on the real result.

test('the compact view of the real result: first step of each stage, repairs, selected, final; the every-step view is the identity', () => {
  const { steps } = RESULT;
  const keyOf = stepKeyOf(SET);
  const compact = compactIndices(steps, keyOf);
  assert.deepEqual(compact, [...new Set(compact)].sort((a, b) => a - b), 'in the original order, without duplicates');
  const firstOfStage = [...new Set(steps.map((s) => s.stage))].map((stage) => steps.findIndex((s) => s.stage === stage));
  const required = new Set([
    ...firstOfStage,
    ...steps.flatMap((s, i) => (['repair', 'selected', 'final'].includes(s.kind) ? [i] : [])),
  ]);
  for (const i of required) {
    assert.ok(compact.includes(i), `step ${i} (${steps[i].kind}) is in the compact view`);
  }
  assert.ok(steps.some((s) => s.kind === 'repair') && steps.some((s) => s.kind === 'selected'), 'the real result has both');
  assert.equal(steps[compact.at(-1) ?? 0].kind, 'final');
  assert.ok(compact.length < steps.length);
  const extra = compact.filter((i) => !required.has(i));
  assert.ok(extra.every((i) => steps[i].kind === 'rated'), 'the only other kept steps are improving rated steps');
  assert.deepEqual(compactSteps(steps, keyOf), compact.map((i) => steps[i]));
  assert.deepEqual(visibleIndices(steps, 'all', keyOf), steps.map((_, i) => i));
  assert.deepEqual(visibleIndices(steps, 'compact', keyOf), compact);
  assert.deepEqual(visibleIndices(steps, 'all', keyOf).map((i) => steps[i]), RESULT.steps, 'every step: the identity');
});

// ---------------------------------------------------------------------------------------------------------------
// 3. The score table of a real step and of the final step.

/**
 * @param {import('../generator/ui/replay-model.js').ScoreTable} table
 * @param {string} id
 */
const rowsOf = (table, id) => table.rows.filter((r) => r.id === id);

test('the score table of a real rated step: the rows, the guess nodes, the sum and the band', () => {
  const s = RESULT.steps[REAL_RATED];
  const table = scoreTable(s, RESULT.steps);
  assert.equal(table.kind, 'table');
  assert.deepEqual(table.rows.filter((r) => r.id !== 'node').map((r) => r.id), ['base', 'rules', 'guess', 'nodes', 'penalty', 'total', 'band']);
  const metrics = /** @type {any} */ (s.rating).metrics;
  const terms = breakdownV3(metrics);
  const [base, rules, guess, penalty, total] = ['base', 'rules', 'guess', 'penalty', 'total'].map((id) => rowsOf(table, id)[0]);
  assert.deepEqual([base.value, rules.value, guess.value, penalty.value], [terms.base, terms.rule, terms.guess, terms.penalty]);
  assert.equal(/** @type {number} */ (base.value) + /** @type {number} */ (rules.value) + /** @type {number} */ (guess.value) - /** @type {number} */ (penalty.value), terms.unrounded);
  assert.equal(total.value, s.rating?.score);
  assert.deepEqual(base.detail, { key: 'replay.table.base', params: { u: metrics.U } });
  assert.equal(rules.detail?.key, 'replay.table.rules');
  assert.equal(rules.detail?.params?.tier, metrics.deductionTier);
  const counts = Object.entries(metrics.rules).filter(([, n]) => /** @type {number} */ (n) > 0).map(([name, n]) => `${name} ×${n}`).join(', ');
  assert.deepEqual(rules.detail?.params?.counts, counts === '' ? { key: 'replay.table.rules.none' } : counts);
  assert.deepEqual(guess.detail, { key: 'replay.table.guess', params: { g: metrics.G, gproved: metrics.Gproved, info: metrics.info } });
  const census = /** @type {any} */ (s.detail).first.census;
  const nodes = rowsOf(table, 'node');
  assert.equal(nodes.length, census.length);
  census.forEach((/** @type {any} */ node, /** @type {number} */ i) => {
    assert.deepEqual(nodes[i].head, { key: 'replay.table.node', params: { n: i + 1, c: node.c, klow: node.kLow, f: node.f, u: node.u } });
    assert.equal(nodes[i].counted, node.kLow < node.c);
    assert.equal(/** @type {Desc} */ (nodes[i].value).key, node.kLow < node.c ? 'replay.table.counted' : 'replay.table.notCounted');
  });
  const solutions = /** @type {Desc} */ (penalty.detail?.params?.solutions);
  assert.equal(solutions.key, metrics.solutions === 'few' ? 'replay.table.solutions.few' : metrics.solutions === 'many' ? 'replay.table.solutions.many' : 'replay.table.none');
  const band = /** @type {{ min: number, max: number | null }} */ (s.band);
  assert.deepEqual(rowsOf(table, 'band')[0].head, band.max === null
    ? { key: 'replay.table.bandOpen', params: { min: band.min } }
    : { key: 'replay.table.band', params: { min: band.min, max: band.max } });
  assert.equal(rowsOf(table, 'total')[0].detail, null, 'no estimate note for a finished census');
  // No guess node (a refused repair measured with G = 0): "none"; the penalty names its class.
  const empty = RESULT.steps.findIndex((x) => x.breakdown !== null && x.detail !== null && x.detail.first.census.length === 0);
  assert.ok(empty >= 0, 'the real result has a rating without guess nodes');
  const emptyTable = scoreTable(RESULT.steps[empty], RESULT.steps);
  assert.deepEqual(rowsOf(emptyTable, 'nodes')[0].value, { key: 'replay.table.none' });
  assert.equal(rowsOf(emptyTable, 'node').length, 0);
  for (const [solutions, key] of [['few', 'replay.table.solutions.few'], ['many', 'replay.table.solutions.many'], ['unknown', 'replay.table.none'], ['unique', 'replay.table.none']]) {
    const other = { ...s, rating: { ...s.rating, metrics: { ...metrics, solutions } } };
    assert.deepEqual(rowsOf(scoreTable(/** @type {any} */ (other), RESULT.steps), 'penalty')[0].detail?.params?.solutions, { key }, solutions);
  }
  // Variants of the same step: guess nodes that are all possible, no rule used, and G above Gproved.
  const twoNodes = [{ c: 2, kLow: 2, f: 0, u: 0 }, { c: 3, kLow: 1, f: 2, u: 0 }];
  const edited = /** @type {any} */ ({
    ...s,
    detail: { ...s.detail, first: { ...s.detail?.first, census: twoNodes } },
    rating: { ...s.rating, metrics: { ...metrics, G: 2, Gproved: 1, rules: { R1: 0, R2: 0, R3: 0, R4: 0, R5: 0, R6: 0, R7: 0, R8: 0, R9: 0 } } },
  });
  const variant = scoreTable(edited, RESULT.steps);
  assert.deepEqual(rowsOf(variant, 'node').map((r) => r.counted), [false, true], 'counted exactly when kLow < c');
  assert.deepEqual(rowsOf(variant, 'rules')[0].detail?.params?.counts, { key: 'replay.table.rules.none' });
  assert.deepEqual(rowsOf(variant, 'guess')[0].detail?.params, { g: 2, gproved: 1, info: metrics.info });
  // A breakdown that is not finite is not shown.
  const broken = scoreTable(/** @type {any} */ ({ ...s, breakdown: { ...s.breakdown, base: Number.NaN } }), RESULT.steps);
  assert.deepEqual(rowsOf(broken, 'base')[0].value, { key: 'replay.table.unavailable' });
  // An open band shows "from min".
  const open = scoreTable(/** @type {any} */ ({ ...s, band: { min: 17, max: null } }), RESULT.steps);
  assert.deepEqual(rowsOf(open, 'band')[0].head, { key: 'replay.table.bandOpen', params: { min: 17 } });
});

test('the final step takes its guess nodes from the step that measured the puzzle; without a claim it has no table', () => {
  const { steps } = RESULT;
  assert.equal(REAL_FINAL.detail, null);
  const at = /** @type {number} */ (REAL_FINAL.args.detailStep);
  assert.ok(Number.isInteger(at) && steps[at].detail !== null, 'args.detailStep names a measuring step');
  const own = scoreTable(REAL_FINAL, steps);
  const measured = scoreTable(steps[at], steps);
  assert.ok(rowsOf(measured, 'node').length > 0 || rowsOf(measured, 'nodes')[0].value !== null);
  assert.deepEqual(rowsOf(own, 'node'), rowsOf(measured, 'node'));
  assert.deepEqual(rowsOf(own, 'nodes'), rowsOf(measured, 'nodes'));
  assert.equal(rowsOf(own, 'total')[0].value, REAL_FINAL.rating?.score);
  const withoutDetailStep = scoreTable({ ...REAL_FINAL, args: { ...REAL_FINAL.args, detailStep: null } }, steps);
  assert.deepEqual(rowsOf(withoutDetailStep, 'node'), []);
  assert.deepEqual(rowsOf(withoutDetailStep, 'nodes')[0].value, { key: 'replay.table.unavailable' });
  const outOfRange = scoreTable({ ...REAL_FINAL, args: { ...REAL_FINAL.args, detailStep: steps.length + 5 } }, steps);
  assert.deepEqual(rowsOf(outOfRange, 'nodes')[0].value, { key: 'replay.table.unavailable' }, 'a step that does not exist');
  const noClaim = { ...REAL_FINAL, rating: null, breakdown: null, band: null, args: { status: 'matched', detailStep: null } };
  const table = scoreTable(noClaim, steps);
  assert.deepEqual(table, { kind: 'none', rows: [], message: { key: 'replay.table.noScore' } });
  assert.equal(stepText(noClaim).key, 'replay.step.final.generated', 'it still has its sentence');
});

// ---------------------------------------------------------------------------------------------------------------
// 4. Terms that are not available are never shown as 0.

/** @param {import('../generator/ui/replay-model.js').ScoreTable} table */
function assertNothingZero(table) {
  for (const row of table.rows) {
    for (const v of [row.value, ...Object.values(row.head.params ?? {}), ...Object.values(row.detail?.params ?? {})]) {
      assert.ok(typeof v !== 'number' || (Number.isFinite(v) && v !== 0), `${row.id} shows ${v}`);
    }
  }
}

test('a summary claim, or a null breakdown, shows the total and the band only; every other row is "not available"', () => {
  const summary = step({
    kind: 'final', stage: 7,
    rating: /** @type {any} */ ({ model: 'difficulty-v3', score: 19, level: 'hard', saturated: false }),
    band: { min: 17, max: 25 }, args: { status: 'matched', detailStep: null },
  });
  const table = scoreTable(summary, []);
  assert.deepEqual(table.rows.map((r) => r.id), ['base', 'rules', 'guess', 'nodes', 'penalty', 'total', 'band']);
  for (const id of ['base', 'rules', 'guess', 'nodes', 'penalty']) {
    assert.deepEqual(rowsOf(table, id)[0].value, { key: 'replay.table.unavailable' }, id);
    assert.equal(rowsOf(table, id)[0].detail, null, id);
  }
  assert.equal(rowsOf(table, 'total')[0].value, 19);
  assertNothingZero(table);
  // Metrics that breakdownV3 refuses (info without a guess): the engine gives a null breakdown.
  const refused = { ...(/** @type {any} */ (RESULT.steps[REAL_RATED].rating).metrics), G: 0, info: 5 };
  assert.throws(() => breakdownV3(refused), RangeError);
  const input = { ...FIRST, puzzle: { ...FIRST.puzzle, rating: { ...FIRST.puzzle.rating, metrics: refused } } };
  const stored = finalStep(input, 'matched', null);
  assert.equal(stored.breakdown, null);
  const odd = scoreTable(stored, RESULT.steps);
  assert.deepEqual(odd.rows.map((r) => r.id), ['base', 'rules', 'guess', 'nodes', 'penalty', 'total', 'band']);
  assert.ok(odd.rows.filter((r) => !['total', 'band'].includes(r.id)).every((r) => r.value !== null && typeof r.value === 'object'));
  assertNothingZero(odd);
  // Any other model: the total alone, with no band.
  const v1 = finalStep({ ...FIRST, puzzle: { ...FIRST.puzzle, rating: { model: 'difficulty-v1', score: 12, level: 'normal', saturated: false } } }, 'matched', null);
  const other = scoreTable(v1, []);
  assert.deepEqual(other.rows.map((r) => r.id), ['base', 'rules', 'guess', 'nodes', 'penalty', 'total']);
  assert.equal(rowsOf(other, 'total')[0].value, 12);
  assertNothingZero(other);
  // A v2 claim whose metrics are opaque has no terms: the total alone, no band.
  const opaque = finalStep({ ...FIRST, puzzle: { ...FIRST.puzzle, rating: { model: 'difficulty-v2', score: 20, level: 'hard', saturated: false, metrics: { oldCounter: 7 } } } }, 'matched', null);
  assert.equal(opaque.breakdown, null);
  const opaqueTable = scoreTable(opaque, []);
  assert.deepEqual(opaqueTable.rows.map((r) => r.id), ['base', 'rules', 'guess', 'nodes', 'penalty', 'total']);
  assert.equal(rowsOf(opaqueTable, 'total')[0].value, 20);
  assertNothingZero(opaqueTable);
});

// ---------------------------------------------------------------------------------------------------------------
// 5. A legacy v2 claim.

test('a v2 final claim shows 2 x U, 8 x log10(1 + B) and the total, and no band', () => {
  const claim = {
    model: 'difficulty-v2', score: 31, level: 'master', saturated: false,
    metrics: { U: 8, B: 120, branchTrials: 3, rowTrials: 9, stop: 'solution', R: 1, H: 0.5 },
  };
  const stored = finalStep({ ...FIRST, puzzle: { ...FIRST.puzzle, rating: claim } }, 'matched', null);
  assert.equal(/** @type {any} */ (stored.breakdown).model, 'difficulty-v2');
  const table = scoreTable(stored, []);
  assert.deepEqual(table.rows.map((r) => r.id), ['v2u', 'v2b', 'total']);
  assert.deepEqual(table.rows.map((r) => r.head.key), ['replay.table.v2.u', 'replay.table.v2.b', 'replay.table.total']);
  assert.equal(table.rows[0].value, 2 * 8);
  assert.equal(table.rows[1].value, 8 * Math.log10(1 + 120));
  assert.equal(table.rows[2].value, 31);
  assert.equal(rowsOf(table, 'band').length, 0, 'no band row: the band is on the current scale');
});

// ---------------------------------------------------------------------------------------------------------------
// 6. Unrateable, refused and estimated steps.

test('an unrateable step has its row and no score, a refused step its table and the refused row, an estimate its note', () => {
  const unrateable = step({ kind: 'unrateable', args: { sequence: 3, phase: 'beam', source: 'candidate', reason: 'path-capped' }, band: { min: 17, max: 25 } });
  assert.deepEqual(scoreTable(unrateable, []), {
    kind: 'unrateable', rows: [{ id: 'unrateable', head: { key: 'replay.table.unrateable' }, detail: null, value: null }], message: null,
  });
  const refused = scoreTable(RESULT.steps[REAL_REJECTED], RESULT.steps);
  assert.equal(refused.kind, 'table');
  assert.equal(refused.rows.at(-1)?.id, 'refused');
  assert.equal(refused.rows.at(-1)?.head.key, 'replay.table.refused');
  assert.ok(rowsOf(refused, 'total').length === 1 && rowsOf(refused, 'base').length === 1);
  assert.equal(scoreTable(RESULT.steps[0], RESULT.steps).kind, 'none');

  const base = /** @type {any} */ (RESULT.steps[REAL_RATED]);
  const full = { ...base, rating: { ...base.rating, censored: true, metrics: { ...base.rating.metrics, censusUndecided: 3 } } };
  assert.deepEqual(rowsOf(scoreTable(full, []), 'total')[0].detail, { key: 'rating.note.estimate', params: { count: 3 } });
  assert.equal(renderDesc(/** @type {Desc} */ (rowsOf(scoreTable(full, []), 'total')[0].detail), t), 'Decisive estimate: 3 alternatives undecided within the work limit');
  const one = { ...full, rating: { ...full.rating, metrics: { ...full.rating.metrics, censusUndecided: 1 } } };
  assert.equal(renderDesc(/** @type {Desc} */ (rowsOf(scoreTable(one, []), 'total')[0].detail), t), 'Decisive estimate: 1 alternative undecided within the work limit');
  const summary = rated(19);
  summary.rating = /** @type {any} */ ({ ...summary.rating, censored: true });
  assert.deepEqual(rowsOf(scoreTable(summary, []), 'total')[0].detail, { key: 'rating.note.estimateShort' });
});

// ---------------------------------------------------------------------------------------------------------------
// 7. The sentences.

/**
 * @param {Desc} d
 * @param {string} where
 */
function assertKnown(d, where) {
  for (const key of descriptorKeys(d)) {
    assert.ok(textOf(EN, key) !== undefined, `${where}: ${key} is in the English pack`);
    assert.ok(textOf(VI, key) !== undefined, `${where}: ${key} is in the Vietnamese pack`);
  }
  const english = /** @type {string} */ (textOf(EN, d.key));
  assert.deepEqual(Object.keys(d.params ?? {}).sort(), placeholders(english), `${where}: the placeholders of ${d.key}`);
  assert.deepEqual(placeholders(/** @type {string} */ (textOf(VI, d.key))), placeholders(english), `${where}: ${d.key} in Vietnamese`);
}

/**
 * @param {Step['kind']} kind
 * @param {Step['args']} args
 * @param {Partial<Step>} [over]
 * @returns {Step}
 */
const stepOf = (kind, args, over = {}) => step({ kind, args, note: `replay.step.${kind}`, ...over });

test('stepText gives an existing key with its placeholders for every kind and variant', () => {
  RESULT.steps.forEach((s, i) => assertKnown(stepText(s), `real step ${i} (${s.kind})`));
  assert.equal(stepText(RESULT.steps[0]).key, 'replay.step.count');
  assert.deepEqual(stepText(RESULT.steps[0]).params, { k: 9, min: 9, max: 11 });
  assert.equal(stepText(RESULT.steps[1]).key, 'replay.step.carve.macro');
  assert.equal(stepText(RESULT.steps[2]).key, 'replay.step.piece');
  assert.deepEqual(stepText(RESULT.steps[2]).params, { n: 1 }, 'the piece number is the stored one');
  assert.equal(stepText(RESULT.steps[11]).key, 'replay.step.start.witness');
  assert.equal(stepText(RESULT.steps[12]).key, 'replay.step.retile.changed');
  assert.deepEqual(stepText(RESULT.steps[12]).params, { step: 1, lifted: 3 }, 'the layout step counts from 1');
  assert.deepEqual(stepText(RESULT.steps[20]).params, { sequence: 1, score: RESULT.steps[20].rating?.score });
  assert.equal(stepText(RESULT.steps[REAL_REJECTED]).key, 'replay.step.rejected');
  assert.equal(stepText(REAL_FINAL).key, 'replay.step.final.generated');

  const synthetic = /** @type {[Step, string][]} */ ([
    [stepOf('carve', { mode: 'flat', parts: 0 }), 'replay.step.carve.flat'],
    [stepOf('carve', { mode: 'macro', parts: 3 }), 'replay.step.carve.macro'],
    [stepOf('start', { start: 'restart' }), 'replay.step.start.restart'],
    [stepOf('start', { start: 'witness' }), 'replay.step.start.witness'],
    [stepOf('retile', { step: 4, lifted: 2, changed: false }), 'replay.step.retile.same'],
    [stepOf('retile', { step: 4, lifted: 2, changed: true }), 'replay.step.retile.changed'],
    [stepOf('rated', { sequence: 2, phase: 'beam', source: 'calibration' }, { rating: rated(14).rating }), 'replay.step.rated.calibration'],
    [stepOf('skip', { sequence: 3, source: 'candidate' }), 'replay.step.skip'],
    [stepOf('unrateable', { sequence: 5, phase: 'beam', source: 'candidate', reason: 'path-capped' }), 'replay.step.unrateable'],
    [stepOf('repair', { repairSequence: 0, added: 'F', accepted: null, reason: null }), 'replay.step.repair.added'],
    [stepOf('repair', { repairSequence: 0, added: 'F', accepted: true, reason: null }, { rating: rated(20).rating }), 'replay.step.repair.accepted'],
    ...['not-proved', 'path-capped', 'no-proved-guess', 'out-of-band', 'excluded'].map((reason) => /** @type {[Step, string]} */ ([
      stepOf('repair', { repairSequence: 1, added: 'G', accepted: false, reason }), `replay.step.repair.rejected.${reason}`,
    ])),
    [stepOf('selected', { sequence: 1, repairSequence: null, source: 'candidate' }), 'replay.step.selected'],
    [stepOf('final', { status: 'mismatch', detailStep: null }, { stage: 7 }), 'replay.step.final.stored'],
    [stepOf('final', { status: 'incomplete', detailStep: null }, { stage: 7 }), 'replay.step.final.stored'],
    [stepOf('final', { status: 'unavailable', detailStep: null }, { stage: 7 }), 'replay.step.final.stored'],
    [stepOf('final', { status: 'matched', detailStep: null }, { stage: 7 }), 'replay.step.final.generated'],
  ]);
  for (const [s, key] of synthetic) {
    const d = stepText(s);
    assert.equal(d.key, key);
    assertKnown(d, key);
  }
  const skip = stepText(stepOf('skip', { sequence: 3, source: 'candidate' }));
  assert.deepEqual(skip, { key: 'replay.step.skip', params: { sequence: 4 } });
  assert.deepEqual(stepText(stepOf('repair', { repairSequence: 1, added: 'G', accepted: false, reason: 'excluded' })).params, { piece: 'G' });
});

test('a repair that failed before adding a clue says so without a piece name and highlights nothing', () => {
  const failed = stepOf('repair', { repairSequence: 1, added: null, accepted: false, reason: 'not-proved' }, {
    stage: 6, board: { placed: [], lifted: [], clues: [] },
  });
  assert.deepEqual(stepText(failed), { key: 'replay.step.repair.failedBeforeClue' });
  assert.equal(EN['replay.step.repair.failedBeforeClue'], 'The uniqueness check failed before any clue was added.');
  assert.ok(VI['replay.step.repair.failedBeforeClue'].length > 0);
  for (const code of ['en', 'vi']) {
    setLocale(code, null);
    const text = renderDesc(stepText(failed), t);
    assert.ok(!/null|\{piece\}|undefined/.test(text), `${code}: ${text}`);
  }
  assert.deepEqual(boardOf(failed).highlightedIds, []);
});

test('every real sentence is complete in both languages', () => {
  for (const code of ['en', 'vi']) {
    setLocale(code, null);
    RESULT.steps.forEach((s, i) => {
      const text = renderDesc(stepText(s), t, (n) => String(n));
      assert.ok(text.length > 10 && !/[{}]|null|undefined|NaN/.test(text), `${code} step ${i}: ${text}`);
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------
// 8. The stage list and the status text.

/**
 * @param {ReplayResult} result
 * @returns {(string | null)[]} The mark of each stage.
 */
const marks = (result) => stageList(result).map((entry) => entry.mark);

/**
 * @param {Partial<ReplayResult>} over
 * @param {Step[]} steps
 * @returns {ReplayResult}
 */
const resultOf = (over, steps) => ({ ...RESULT, ...over, steps: [...steps, { ...REAL_FINAL, args: { ...REAL_FINAL.args, status: over.status ?? 'matched' } }] });
const upToStage = (/** @type {number} */ stage) => RESULT.steps.filter((s) => s.stage <= stage && s.stage !== 7);

test('stage list and status: unavailable, mismatch, incomplete and the early stop', () => {
  // (a) a completion puzzle: stages 1-3 replayed, the candidate stages unavailable
  const a = resultOf({
    status: 'unavailable', reason: 'completion', stages: { set: 'replayed', candidate: 'unavailable', final: 'not-compared' },
  }, upToStage(3));
  assert.deepEqual(marks(a), [null, null, null, 'notAvailable', 'notAvailable', 'notAvailable', null]);
  assert.deepEqual(stageList(a)[3].markText, { key: 'replay.notAvailable' });
  assert.deepEqual(statusText(a), [{ key: 'replay.status.unavailable' }, { key: 'replay.reason.completion' }]);
  // (b) a mismatch of the rating names the field
  const b = resultOf({ status: 'mismatch', reason: 'rating' }, RESULT.steps.slice(0, -1));
  assert.deepEqual(statusText(b), [{ key: 'replay.status.mismatch', params: { field: { key: 'replay.field.rating' } } }]);
  assert.deepEqual(marks(b), [null, null, null, null, null, null, null], 'every stage has steps');
  // a mismatch in a group without steps
  const mismatched = resultOf({ status: 'mismatch', reason: 'set', stages: { set: 'mismatch', candidate: 'unavailable', final: 'compared' } }, []);
  assert.deepEqual(marks(mismatched), ['notAvailable', 'notAvailable', 'notAvailable', 'notAvailable', 'notAvailable', 'notAvailable', null]);
  // (c) a synthetic work stop after one rated step
  const firstRated = RESULT.steps.findIndex((s) => s.kind === 'rated');
  const c = resultOf({
    status: 'incomplete', reason: 'work', stages: { set: 'replayed', candidate: 'stopped', final: 'not-compared' },
  }, RESULT.steps.slice(0, firstRated + 1));
  assert.deepEqual(marks(c), [null, null, null, 'stopped', 'stopped', 'stopped', null]);
  assert.equal(stageList(c)[4].steps, 1, 'stage 5 keeps its step');
  assert.ok(!marks(c).includes('notAvailable'));
  assert.deepEqual(statusText(c), [{ key: 'replay.status.incomplete', params: { reason: { key: 'replay.limit.work' } } }]);
  // (d) the early stop: nothing but the final step
  const d = replayPuzzle(FIRST, workspaces, { ...REPLAY, maxSteps: 1 });
  assert.deepEqual([d.status, d.reason, d.stages.set, d.stages.candidate], ['incomplete', 'steps', 'stopped', 'stopped']);
  assert.deepEqual(marks(d), ['stopped', 'stopped', 'stopped', 'stopped', 'stopped', 'stopped', null]);
  assert.deepEqual(stageList(d)[0].markText, { key: 'replay.stage.stopped' }, 'distinct from "not available"');
  assert.deepEqual(statusText(d), [{ key: 'replay.status.incomplete', params: { reason: { key: 'replay.limit.steps' } } }]);
});

test('a stage that needed no steps says so; an incomplete result says "stopped" instead', () => {
  // (e) the calibration puzzle has no layout stage
  assert.equal(CALIBRATION_RESULT.status, 'matched');
  assert.equal(CALIBRATION_RESULT.stages.candidate, 'calibration');
  assert.equal(stageList(CALIBRATION_RESULT)[3].mark, 'none');
  assert.deepEqual(stageList(CALIBRATION_RESULT)[3].markText, { key: 'replay.stage.none' });
  assert.equal(EN['replay.stage.none'], 'No steps were needed for this puzzle.');
  assert.equal(stageList(CALIBRATION_RESULT)[4].mark, null, 'its clue stage has steps');
  // (f) a matched result without a repair
  const f = resultOf({}, RESULT.steps.filter((s) => s.stage !== 6 && s.stage !== 7));
  assert.equal(f.status, 'matched');
  assert.deepEqual(marks(f), [null, null, null, null, null, 'none', null]);
  // (g) a byte cut keeps the group states and drops the later steps
  const g = resultOf({
    status: 'incomplete', reason: 'bytes', stages: { set: 'replayed', candidate: 'replayed', final: 'not-compared' },
  }, RESULT.steps.slice(0, firstRatedIndex() + 1));
  assert.deepEqual(marks(g), [null, null, null, null, null, 'stopped', null]);
  // the layout stage of a calibration puzzle never ran, whatever the status; its later stages were cut
  const cut = { ...CALIBRATION_RESULT, status: /** @type {const} */ ('incomplete'), reason: 'work', steps: CALIBRATION_RESULT.steps.filter((s) => s.stage <= 4 || s.stage === 7) };
  assert.deepEqual(marks(cut), [null, null, null, 'none', 'stopped', 'stopped', null]);
  // while loading no stage carries a mark
  assert.deepEqual(stageList(null).map((entry) => [entry.mark, entry.markText, entry.steps]), Array(7).fill([null, null, 0]));
  assert.deepEqual(stageList(null).map((entry) => entry.name.key), [1, 2, 3, 4, 5, 6, 7].map((n) => `replay.stage.${n}`));
  // the real results
  assert.deepEqual(marks(RESULT), [null, null, null, null, null, null, null]);
  assert.deepEqual(statusText(RESULT), [{ key: 'replay.status.matched' }]);
});

/** @returns {number} */
function firstRatedIndex() {
  return RESULT.steps.findIndex((s) => s.kind === 'rated');
}

test('every key that the model returns exists in both packs with the placeholders of its descriptor', () => {
  /** @type {Desc[]} */
  const all = [];
  all.push(...RESULT.steps.map(stepText), ...CALIBRATION_RESULT.steps.map(stepText));
  for (const result of [RESULT, CALIBRATION_RESULT]) {
    for (const s of result.steps) {
      const table = scoreTable(s, result.steps);
      all.push(...table.rows.flatMap((r) => [r.head, ...(r.detail === null ? [] : [r.detail]), ...(typeof r.value === 'object' && r.value !== null ? [r.value] : [])]));
      if (table.message !== null) {
        all.push(table.message);
      }
    }
    all.push(...statusText(result), ...stageList(result).flatMap((entry) => [entry.name, ...(entry.markText === null ? [] : [entry.markText])]));
  }
  all.push(...stageList(null).map((entry) => entry.name), failureText('failed'), failureText('worker-unavailable'), failureText('interrupted'));
  for (const reason of ['no-set-origin', 'set-versions', 'no-record', 'record-invalid', 'completion', 'overflow', 'record-versions', 'calibration-needs-set']) {
    all.push(...statusText({ ...RESULT, status: 'unavailable', reason }));
  }
  for (const reason of ['set', 'skips', 'candidate-failed', 'board', 'pieces', 'witness', 'clues', 'rating', 'solution']) {
    all.push(...statusText({ ...RESULT, status: 'mismatch', reason }));
  }
  for (const reason of ['steps', 'bytes', 'work']) {
    all.push(...statusText({ ...RESULT, status: 'incomplete', reason }));
  }
  all.push(
    ...['stopped', 'none', 'notAvailable'].map((mark) => ({ key: mark === 'stopped' ? 'replay.stage.stopped' : mark === 'none' ? 'replay.stage.none' : 'replay.notAvailable' })),
    { key: 'replay.table.noScore' }, { key: 'replay.table.unrateable' }, { key: 'replay.table.refused' }, { key: 'replay.table.v2.u' },
    { key: 'replay.table.v2.b' }, { key: 'rating.note.estimateShort' }, { key: 'rating.note.estimate', params: { count: 2 } },
  );
  assert.ok(all.length > 150);
  for (const d of all) {
    assertKnown(d, d.key);
  }
  assert.ok(new Set(all.flatMap(descriptorKeys)).size > 60, 'many different keys are covered');
});

test('the board of a step: clues, placements and what is highlighted', () => {
  const { steps } = RESULT;
  const retile = steps[12];
  const view = boardOf(retile);
  assert.equal(view.clues.length, 0);
  assert.equal(view.placements.length, retile.board.placed.length);
  assert.deepEqual(view.highlightedIds, retile.board.lifted);
  const clueStep = steps[firstRatedIndex()];
  const shown = boardOf(clueStep);
  assert.deepEqual(shown.clues.map((p) => p.piece), clueStep.board.clues);
  assert.equal(shown.clues.length + shown.placements.length, clueStep.board.placed.length);
  assert.deepEqual(shown.highlightedIds, []);
  const repair = steps.find((s) => s.kind === 'repair' && s.args.added !== null);
  assert.deepEqual(boardOf(/** @type {Step} */ (repair)).highlightedIds, [/** @type {string} */ (repair?.args.added)]);
  const selected = /** @type {Step} */ (steps.find((s) => s.kind === 'selected'));
  assert.deepEqual(boardOf(selected).highlightedIds, selected.board.clues);
  assert.deepEqual(boardOf(REAL_FINAL).highlightedIds, []);
  // A piece without a pose (a cut inside the set stage) is not drawn.
  const cut = step({
    stage: 3, kind: 'piece',
    board: { placed: [{ id: null, cells: [[0, 0]], pose: null }, { id: 'B', cells: [], pose: null }], lifted: [], clues: [] },
  });
  assert.deepEqual(boardOf(cut), { clues: [], placements: [], highlightedIds: [] });
});

test('a failure says what happened', () => {
  assert.deepEqual(failureText('failed'), { key: 'replay.failed' });
  assert.deepEqual(failureText('worker-unavailable'), { key: 'replay.failed.worker' });
  assert.deepEqual(failureText('interrupted'), { key: 'replay.failed.interrupted' });
});

test('descriptors are written with the language, numbers formatted, count kept for the plural', () => {
  const nested = { key: 'replay.status.mismatch', params: { field: { key: 'replay.field.rating' } } };
  assert.equal(renderDesc(nested, t), 'The replay differs from the stored puzzle in the rating, so these steps are not the verified way it was made.');
  setLocale('vi', null);
  assert.match(renderDesc(nested, t), /^Việc chạy lại khác với đề đã lưu ở điểm độ khó,/);
  setLocale('en', null);
  assert.equal(renderDesc({ key: 'replay.table.guess', params: { g: 2, gproved: 1, info: 1.5 } }, t, (n) => `<${n}>`), 'G = <2> decisive guesses, <1> proved, information <1.5> bits');
  assert.deepEqual(descriptorKeys(nested), ['replay.status.mismatch', 'replay.field.rating']);
  assert.deepEqual(descriptorKeys({ key: 'a', params: { x: { key: 'b', params: { y: { key: 'c' }, z: 1 } }, w: 'text' } }), ['a', 'b', 'c']);
});

// ---------------------------------------------------------------------------------------------------------------
// 9 and 10. The controller.

/** @template T */
function deferred() {
  /** @type {(value: T) => void} */
  let resolve = () => {};
  /** @type {(reason?: unknown) => void} */
  let reject = () => {};
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

function scheduler() {
  let next = 1;
  /** @type {Map<number, { fn: () => void, ms: number }>} */
  const pending = new Map();
  return {
    schedule: (/** @type {() => void} */ fn, /** @type {number} */ ms) => {
      pending.set(next, { fn, ms });
      next += 1;
      return next - 1;
    },
    unschedule: (/** @type {unknown} */ handle) => {
      pending.delete(/** @type {number} */ (handle));
    },
    size: () => pending.size,
    delays: () => [...pending.values()].map((e) => e.ms),
    fire() {
      const [handle, entry] = /** @type {[number, { fn: () => void }]} */ ([...pending][0]);
      pending.delete(handle);
      entry.fn();
    },
  };
}

/**
 * @param {Partial<{ run: (source: any, signal: AbortSignal) => Promise<ReplayResult>, intervalMs: number }>} [over]
 */
function harness(over = {}) {
  const timers = scheduler();
  /** @type {import('../generator/ui/replay-model.js').ReplayViewState[]} */
  const states = [];
  /** @type {{ source: any, signal: AbortSignal }[]} */
  const calls = [];
  const controller = createReplayController({
    run: over.run ?? ((source, signal) => {
      calls.push({ source, signal });
      return new Promise(() => {});
    }),
    schedule: timers.schedule,
    unschedule: timers.unschedule,
    onChange: (state) => states.push(state),
    ...(over.intervalMs === undefined ? {} : { intervalMs: over.intervalMs }),
  });
  return { controller, timers, states, calls };
}

/** @returns {ReplayResult} */
const smallResult = () => /** @type {ReplayResult} */ ({
  ...RESULT, steps: [step({ stage: 1, kind: 'count' }), REAL_FINAL],
});

test('controller: open, loading, ready; close aborts only its own signal; a stale answer is ignored', async () => {
  /** @type {{ source: any, signal: AbortSignal }[]} */
  const calls = [];
  /** @type {ReturnType<typeof deferred<ReplayResult>>[]} */
  const answers = [];
  const { controller, timers, states } = harness({
    run: (source, signal) => {
      calls.push({ source, signal });
      const d = deferred();
      answers.push(/** @type {any} */ (d));
      return /** @type {Promise<ReplayResult>} */ (d.promise);
    },
  });
  assert.equal(controller.getState().phase, 'closed');
  controller.open(SOURCE);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].source, SOURCE);
  assert.equal(calls[0].signal.aborted, false);
  assert.deepEqual(controller.getState(), { phase: 'loading', result: null, failure: null, view: 'compact', index: 0, playing: false });
  answers[0].resolve(RESULT);
  await flush();
  assert.equal(controller.getState().phase, 'ready');
  assert.equal(controller.getState().result, RESULT);
  assert.equal(controller.getState().index, 0);
  assert.deepEqual(states.map((s) => s.phase), ['loading', 'ready']);
  controller.close();
  assert.equal(calls[0].signal.aborted, true, 'close aborts the signal given to run');
  assert.equal(controller.getState().phase, 'closed');
  assert.equal(controller.getState().result, null);
  assert.equal(timers.size(), 0);
  assert.equal(calls.length, 1, 'close calls nothing else');

  // an answer that arrives after close
  controller.open(SOURCE);
  const closedCount = states.length;
  controller.close();
  answers[1].resolve(RESULT);
  await flush();
  assert.equal(controller.getState().phase, 'closed');
  assert.equal(states.length, closedCount + 1, 'only the close was announced');

  // after a second open the first answer is ignored and the first signal is aborted
  controller.open(SOURCE);
  controller.open(SOURCE);
  assert.equal(calls[2].signal.aborted, true);
  assert.equal(calls[3].signal.aborted, false);
  answers[2].resolve(RESULT);
  await flush();
  assert.equal(controller.getState().phase, 'loading');
  answers[3].resolve(smallResult());
  await flush();
  assert.equal(controller.getState().phase, 'ready');
  assert.equal(controller.getState().result?.steps.length, 2);
});

test('controller: the failure kinds, and what a rejection does after close', async () => {
  /** @param {unknown} error */
  async function failureFor(error) {
    const { controller } = harness({ run: () => Promise.reject(error) });
    controller.open(SOURCE);
    await flush();
    const state = controller.getState();
    assert.equal(state.phase, 'failed');
    assert.equal(state.result, null);
    return state.failure;
  }
  assert.equal(await failureFor(new PoolError('worker-unavailable', 'no worker')), 'worker-unavailable');
  assert.equal(await failureFor(new PoolError('invalid-task', 'refused')), 'failed', 'only worker-unavailable shows the worker message');
  assert.equal(await failureFor(new PoolError('worker-crashed', 'crash')), 'failed');
  assert.equal(await failureFor(new WorkerTaskError('invalid-request', 'bad')), 'failed');
  assert.equal(await failureFor(new TypeError('malformed source')), 'failed');
  assert.equal(await failureFor(new PoolAbortError('cancelled')), 'interrupted');
  assert.equal(await failureFor(new PoolAbortError('closed')), 'failed');
  assert.equal(await failureFor(new Error('x')), 'failed');
  const thrown = harness({ run: () => { throw new TypeError('malformed source'); } });
  thrown.controller.open(SOURCE);
  await flush();
  assert.deepEqual([thrown.controller.getState().phase, thrown.controller.getState().failure], ['failed', 'failed']);
  const noSteps = harness({ run: () => Promise.resolve(/** @type {any} */ ({ status: 'matched', steps: [] })) });
  noSteps.controller.open(SOURCE);
  await flush();
  assert.equal(noSteps.controller.getState().failure, 'failed');

  const late = deferred();
  const { controller, states } = harness({ run: () => /** @type {Promise<ReplayResult>} */ (late.promise) });
  controller.open(SOURCE);
  controller.close();
  const count = states.length;
  late.reject(new PoolAbortError('cancelled'));
  await flush();
  assert.equal(controller.getState().phase, 'closed', 'the cancellation that close caused changes nothing');
  assert.equal(states.length, count);
});

/** The steps of the playback cases: stages 1-4, six rated steps (10, 12, 11, 20, 13, 21), a repair, selected, final. */
function playbackResult() {
  const scores = [10, 12, 11, 20, 13, 21];
  /** @type {Step[]} */
  const steps = [
    step({ stage: 1, kind: 'count' }), step({ stage: 2, kind: 'carve' }), step({ stage: 3, kind: 'piece' }),
    step({ stage: 3, kind: 'piece' }), step({ stage: 4, kind: 'start' }), step({ stage: 4, kind: 'retile' }),
    ...scores.map((score) => rated(score)),
    step({ stage: 6, kind: 'repair' }), step({ stage: 5, kind: 'selected' }), step({ stage: 7, kind: 'final' }),
  ];
  return /** @type {ReplayResult} */ ({ ...RESULT, steps });
}

const COMPACT = [0, 1, 2, 4, 6, 7, 9, 11, 12, 13, 14];

/** @param {Parameters<typeof harness>[0]} [over] */
async function readyHarness(over) {
  const answer = Promise.resolve(playbackResult());
  const h = harness({ run: () => answer, ...over });
  h.controller.open(SOURCE);
  await flush();
  assert.equal(h.controller.getState().phase, 'ready');
  return h;
}

test('controller: playback advances one visible step per tick and stops at the last', async () => {
  const { controller, timers, states } = await readyHarness();
  assert.deepEqual(controller.visible(), COMPACT);
  assert.deepEqual(timers.delays(), []);
  controller.play();
  assert.equal(controller.getState().playing, true);
  assert.deepEqual(timers.delays(), [900], 'one tick at the default interval');
  controller.play();
  assert.equal(timers.size(), 1, 'a second play while playing starts no second timer');
  /** @type {number[]} */
  const seen = [];
  while (timers.size() > 0) {
    timers.fire();
    seen.push(controller.getState().index);
  }
  assert.deepEqual(seen, COMPACT.slice(1));
  assert.equal(controller.getState().playing, false);
  assert.equal(controller.getState().index, 14);
  assert.ok(states.every((s) => s.index === 0 || COMPACT.includes(s.index)), 'only visible steps are shown');

  // at the last step play starts again from the first
  controller.play();
  assert.deepEqual([controller.getState().index, controller.getState().playing], [0, true]);
  timers.fire();
  assert.equal(controller.getState().index, 1);
  controller.pause();
  assert.equal(controller.getState().playing, false);
  assert.equal(timers.size(), 0);
  controller.pause();
  controller.play();
  assert.equal(controller.getState().playing, true);

  const custom = await readyHarness({ intervalMs: 250 });
  custom.controller.play();
  assert.deepEqual(custom.timers.delays(), [250]);
  custom.timers.fire();
  assert.deepEqual(custom.timers.delays(), [250], 'every tick is scheduled at the interval');
});

test('controller: the compact view of a real result uses the real clue keys; dispose aborts the run and stops the timer', async () => {
  // A puzzle whose view the clue keys decide (not only the scores).
  const decided = /** @type {any} */ (ALL.find(({ input, result }) => JSON.stringify(compactIndices(result.steps, stepKeyOf(input.set)))
    !== JSON.stringify(compactIndices(result.steps, () => ''))));
  assert.ok(decided !== undefined);
  const { controller } = harness({ run: () => Promise.resolve(decided.result) });
  controller.open({ ...SOURCE, set: decided.input.set });
  await flush();
  assert.deepEqual(controller.visible(), compactIndices(decided.result.steps, stepKeyOf(decided.input.set)));
  assert.equal(controller.visible().length < decided.result.steps.length, true);

  /** @type {AbortSignal[]} */
  const signals = [];
  const h = harness({ run: (_source, signal) => { signals.push(signal); return Promise.resolve(playbackResult()); } });
  h.controller.open(SOURCE);
  await flush();
  h.controller.play();
  assert.equal(h.timers.size(), 1);
  h.controller.dispose();
  assert.equal(signals[0].aborted, true);
  assert.equal(h.timers.size(), 0);
  const count = h.states.length;
  h.controller.open(SOURCE);
  assert.equal(h.states.length, count, 'a disposed controller announces nothing');
});

test('controller: pause, prev, next, seek and setView stop playback; the view keeps the step or the nearest earlier one', async () => {
  const { controller, timers } = await readyHarness();
  /** @type {[string, () => void][]} */
  const actions = [
    ['pause', () => controller.pause()], ['next', () => controller.next()], ['prev', () => controller.prev()],
    ['seek', () => controller.seek(9)], ['setView', () => controller.setView('all')],
  ];
  for (const [name, act] of actions) {
    controller.setView('compact');
    controller.seek(2);
    controller.play();
    assert.equal(controller.getState().playing, true, name);
    act();
    assert.equal(controller.getState().playing, false, `${name} stops playback`);
    assert.equal(timers.size(), 0, `${name} clears the timer`);
  }
  controller.setView('compact');
  controller.seek(9);
  assert.equal(controller.getState().index, 9);
  controller.setView('all');
  assert.deepEqual([controller.getState().view, controller.getState().index], ['all', 9]);
  assert.equal(controller.visible().length, 15);
  controller.seek(8);
  assert.equal(controller.getState().index, 8);
  controller.setView('compact');
  assert.equal(controller.getState().index, 7, 'step 8 is hidden: the nearest earlier visible step');
  controller.setView('all');
  controller.seek(10);
  controller.setView('compact');
  assert.equal(controller.getState().index, 9);
  controller.seek(13);
  assert.equal(controller.getState().index, 13);
  controller.seek(8);
  assert.equal(controller.getState().index, 7, 'a hidden step moves to the nearest earlier one');
  controller.seek(1000);
  assert.equal(controller.getState().index, 14);
  controller.seek(-5);
  assert.equal(controller.getState().index, 0);
  controller.seek(Number.NaN);
  assert.equal(controller.getState().index, 0);
  controller.next();
  controller.next();
  assert.equal(controller.getState().index, 2);
  controller.prev();
  assert.equal(controller.getState().index, 1);
  controller.prev();
  controller.prev();
  assert.equal(controller.getState().index, 0, 'prev stops at the first step');
  controller.seek(14);
  controller.next();
  assert.equal(controller.getState().index, 14, 'next stops at the last step');
  controller.setView('all');
  controller.seek(5);
  controller.next();
  assert.equal(controller.getState().index, 6, 'the every-step view visits every step');
  // a new open starts again in the compact view at the first step
  controller.open(SOURCE);
  assert.deepEqual([controller.getState().view, controller.getState().index, controller.getState().phase], ['compact', 0, 'loading']);
  controller.dispose();
  controller.next();
  assert.equal(controller.getState().phase, 'closed');
});

test('the dialog module loads', async () => {
  const dialog = await import('../generator/ui/replay-dialog.js');
  assert.equal(typeof dialog.createReplayDialog, 'function');
});
