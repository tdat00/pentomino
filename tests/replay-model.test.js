// @ts-check
// Generation steps model (MP16a, MP18a; design §6.12 and §11.11): the two views and the compact filter, the step
// sentences, the score table, the stage list and the status text, the steps table (rows, stage groups and controller)
// and the removed dialog, on the real replay of the replay fixture (tests/fixtures/replay-case-v4.json, the first
// candidate puzzle) and on small synthetic step lists.

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
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
  STEPS_CACHE_SIZE, boardOf, compactIndices, compactSteps, createStepsController, descriptorKeys, failureText, renderDesc,
  rowLabel, scoreTable, stageGroups, stageList, statusText, stepKeyOf, stepPieces, stepScore, stepTechniques, stepText,
  visibleIndices,
} from '../generator/ui/replay-model.js';

/** @typedef {import('../core/engine/replay.js').ReplayResult} ReplayResult */
/** @typedef {import('../core/engine/replay.js').Step} Step */
/** @typedef {import('../generator/ui/replay-model.js').Desc} Desc */

afterEach(() => {
  setLocale('en', null);
});

const FIXTURE = JSON.parse(readFileSync(new URL('./fixtures/replay-case-v4.json', import.meta.url), 'utf8'));
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
  const counts = Object.entries(metrics.rules).filter(([, n]) => /** @type {number} */ (n) > 0)
    .map(([name, n]) => ({ key: 'replay.uses', params: { rule: { key: `replay.rule.${name}` }, n } }));
  assert.deepEqual(rules.detail?.params?.counts, counts.length === 0 ? { key: 'replay.table.rules.none' } : counts);
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
  all.push(...stageList(null).map((entry) => entry.name), failureText('failed'), failureText('worker-unavailable'));
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

/** @returns {ReplayResult} */
const smallResult = () => /** @type {ReplayResult} */ ({
  ...RESULT, steps: [step({ stage: 1, kind: 'count' }), REAL_FINAL],
});

/** The steps of the controller cases: stages 1-4, six rated steps (10, 12, 11, 20, 13, 21), a repair, selected, final. */
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

// ---------------------------------------------------------------------------------------------------------------
// 11. The row of a step: pieces, techniques and score (MP18a).

const uses = (/** @type {string} */ rule, /** @type {number} */ n) => ({ key: 'replay.uses', params: { rule: { key: `replay.rule.${rule}` }, n } });
const guesses = (/** @type {number} */ count, /** @type {number} */ proved) => ({ key: 'replay.guesses', params: { count, proved } });
const IN = { key: 'replay.score.inBand' };
const OUT = { key: 'replay.score.outOfBand' };
const NA = { key: 'replay.table.unavailable' };
/** @param {import('../generator/ui/replay-model.js').Line} line */
const lineText = (line) => (typeof line === 'number' ? String(line)
  : Array.isArray(line) ? line.map((d) => renderDesc(d, t)).join(', ') : renderDesc(line, t));

test('steps: the pieces, techniques and score of the real steps', () => {
  const R = RESULT.steps;
  /** @type {[number, string, string[], unknown[], unknown[]][]} */
  const rows = [
    [0, 'count', [], [], []],
    [1, 'carve', [], [], []],
    [2, 'piece', ['G'], [], []],
    [10, 'piece', ['B'], [], []],
    [11, 'start', [], [], []],
    [12, 'retile', ['B', 'C', 'E'], [], []],
    [19, 'retile', ['A', 'B', 'C', 'E'], [], []],
    [20, 'rated', ['D', 'H', 'I'], [[uses('R1', 3)], guesses(3, 3)], [29, OUT]],
    [21, 'rated', ['A', 'G', 'H'], [[uses('R1', 5)], guesses(1, 1)], [15, OUT]],
    [22, 'rated', ['C', 'D', 'H'], [[uses('R1', 4), uses('R4', 27), uses('R6', 5), uses('R8', 12)], guesses(2, 2)], [24, IN]],
    [23, 'rated', ['A', 'D', 'F'], [[uses('R1', 4), uses('R4', 18), uses('R6', 2), uses('R7', 146)], guesses(1, 1)], [17, IN]],
    [26, 'repair', ['F'], [], []],
    [27, 'repair', ['G'], [[uses('R1', 4)]], [9]],
    [29, 'rejected', ['C', 'D', 'F', 'H'], [[uses('R1', 5), uses('R4', 10)]], [12, OUT, { key: 'replay.table.refused' }]],
    [52, 'selected', ['D', 'E', 'H', 'I'], [], []],
    [53, 'final', ['D', 'E', 'H', 'I'], [[uses('R1', 3), uses('R2', 1), uses('R8', 18)], guesses(1, 1)], [19, IN]],
  ];
  for (const [i, kind, pieces, techniques, score] of rows) {
    assert.equal(R[i].kind, kind, `step ${i}`);
    assert.deepEqual(stepPieces(R[i], SET), pieces, `pieces of step ${i}`);
    assert.deepEqual(stepTechniques(R[i]), techniques, `techniques of step ${i}`);
    assert.deepEqual(stepScore(R[i]), score, `score of step ${i}`);
  }
  assert.deepEqual(stepTechniques(R[53]).map(lineText), ['Forced cell ×3, Forced piece ×1, Neck ×18', '1 decisive guess (1 proved)']);
  assert.deepEqual(stepTechniques(R[20]).map(lineText), ['Forced cell ×3', '3 decisive guesses (3 proved)']);
  assert.deepEqual(stepScore(R[53]).map(lineText), ['19', 'in band']);
  assert.deepEqual(stepScore(R[29]).map(lineText), ['12', 'outside the band', 'refused: no proved guess']);
  setLocale('vi', null);
  assert.deepEqual(stepTechniques(R[53]).map(lineText), ['Ô bắt buộc ×3, Mảnh bắt buộc ×1, Chỗ thắt ×18', '1 lần đoán quyết định (1 được chứng minh)']);
  assert.deepEqual(stepScore(R[53]).map(lineText), ['19', 'trong khoảng điểm']);
  assert.deepEqual(rowLabel(0), { key: 'replay.row', params: { n: 1 } });
  assert.deepEqual(rowLabel(53), { key: 'replay.row', params: { n: 54 } });
});

test('steps: pieces, techniques and score of synthetic steps the real result lacks', () => {
  /** @param {Step} s @param {string[]} pieces @param {unknown[]} techniques @param {unknown[]} score @param {string} where */
  const expectRow = (s, pieces, techniques, score, where) => {
    assert.deepEqual(stepPieces(s, SET), pieces, `${where}: pieces`);
    assert.deepEqual(stepTechniques(s), techniques, `${where}: techniques`);
    assert.deepEqual(stepScore(s), score, `${where}: score`);
  };
  expectRow(step({ kind: 'skip', args: { sequence: 2, source: 'candidate' } }), [], [], [], 'skip');
  expectRow(step({
    kind: 'unrateable', board: { placed: [], lifted: [], clues: ['C', 'A'] }, band: { min: 17, max: 25 },
    args: { sequence: 3, phase: 'beam', source: 'candidate', reason: 'path-capped' },
  }), ['A', 'C'], [], [{ key: 'replay.table.unrateable' }], 'unrateable');
  expectRow(step({ stage: 6, kind: 'repair', args: { repairSequence: 1, added: null, accepted: false, reason: 'not-proved' } }), [], [], [], 'repair before a clue');
  expectRow(step({
    stage: 3, kind: 'piece', board: { placed: [{ id: null, cells: [[0, 0]], pose: null }], lifted: [], clues: [] }, args: { n: 1 },
  }), [], [], [], 'piece without an id');
  expectRow(step({
    stage: 4, kind: 'retile', board: { placed: [], lifted: ['Z', 'C', 'A'], clues: [] }, args: { step: 0, lifted: 3, changed: true },
  }), ['A', 'C', 'Z'], [], [], 'lifted piece the set does not know');
  expectRow(finalStep({ ...FIRST, puzzle: { ...FIRST.puzzle, rating: null } }, 'matched', null), ['D', 'E', 'H', 'I'], [], [], 'final without a claim');
  expectRow(finalStep({
    ...FIRST, puzzle: { ...FIRST.puzzle, rating: { model: 'difficulty-v3', score: 19, level: 'hard', saturated: false, censored: true } },
  }, 'matched', null), ['D', 'E', 'H', 'I'], [NA], [19, IN, { key: 'rating.note.estimateShort' }], 'summary claim');
  expectRow(finalStep({
    ...FIRST,
    puzzle: {
      ...FIRST.puzzle,
      rating: {
        model: 'difficulty-v2', score: 31, level: 'master', saturated: false,
        metrics: { U: 8, B: 120, branchTrials: 3, rowTrials: 9, stop: 'solution', R: 1, H: 0.5 },
      },
    },
  }, 'matched', null), ['D', 'E', 'H', 'I'], [NA], [31], 'v2 claim');
  expectRow(rated(19), [], [NA], [19, IN], 'rated 19');
  expectRow(rated(25), [], [NA], [25, OUT], 'rated 25');
  expectRow(rated(17), [], [NA], [17, IN], 'rated 17');
  expectRow(rated(80, { min: 53, max: null }), [], [NA], [80, IN], 'open band, above');
  expectRow(rated(40, { min: 53, max: null }), [], [NA], [40, OUT], 'open band, below');
  const censored = /** @type {Step} */ ({ ...RESULT.steps[22], rating: { ...RESULT.steps[22].rating, censored: true } });
  assert.deepEqual(stepScore(censored), [24, IN, { key: 'rating.note.estimateShort' }]);
  assert.deepEqual(stepTechniques(censored), stepTechniques(RESULT.steps[22]));
});

// ---------------------------------------------------------------------------------------------------------------
// 12. The stage groups.

/**
 * @param {import('../generator/ui/replay-model.js').StageGroup[]} groups
 * @param {number[]} stages
 * @param {number[]} sizes
 */
function assertGroups(groups, stages, sizes) {
  assert.deepEqual(groups.map((g) => g.stage), stages);
  assert.deepEqual(groups.map((g) => g.indices.length), sizes);
  for (const g of groups) {
    assert.deepEqual(g.heading, { key: 'replay.stage.heading', params: { n: g.stage, name: { key: `replay.stage.${g.stage}` } } });
  }
}

test('steps: stage groups follow the steps in order; a stage without steps keeps its heading and mark', () => {
  const all = RESULT.steps.map((_, i) => i);
  const groups = stageGroups(RESULT, all);
  assertGroups(groups, [1, 2, 3, 4, 5, 6, 5, 6, 5, 7], [1, 1, 9, 9, 6, 2, 6, 1, 18, 1]);
  assert.deepEqual(groups.flatMap((g) => g.indices), all);
  assert.ok(groups.every((g) => g.mark === null && g.markText === null));

  const key = stepKeyOf(SET);
  assert.deepEqual(visibleIndices(RESULT.steps, 'compact', key), [0, 1, 2, 11, 20, 21, 22, 25, 26, 27, 34, 52, 53]);
  assertGroups(stageGroups(RESULT, visibleIndices(RESULT.steps, 'compact', key)), [1, 2, 3, 4, 5, 6, 5, 7], [1, 1, 1, 1, 4, 3, 1, 1]);

  const calibration = stageGroups(CALIBRATION_RESULT, CALIBRATION_RESULT.steps.map((_, i) => i));
  assertGroups(calibration, [1, 2, 3, 4, 5, 6, 5, 7], [1, 1, 9, 0, 4, 2, 21, 1]);
  assert.deepEqual(
    [calibration[3].mark, calibration[3].markText, calibration[3].indices],
    ['none', { key: 'replay.stage.none' }, []],
  );
  const calibrationKey = stepKeyOf(CALIBRATION.set);
  const calibrationCompact = visibleIndices(CALIBRATION_RESULT.steps, 'compact', calibrationKey);
  assert.deepEqual(calibrationCompact, [0, 1, 2, 11, 12, 14, 15, 16, 37, 38]);
  assertGroups(stageGroups(CALIBRATION_RESULT, calibrationCompact), [1, 2, 3, 4, 5, 6, 5, 7], [1, 1, 1, 0, 3, 2, 1, 1]);

  // Q2 (a): a puzzle without a record shows its stored puzzle only, whatever stage the engine replayed.
  const stored = finalStep(FIRST, 'unavailable', null);
  for (const [reason, stages] of /** @type {const} */ ([
    ['no-set-origin', { set: 'unavailable', candidate: 'unavailable', final: 'not-compared' }],
    ['no-record', { set: 'replayed', candidate: 'unavailable', final: 'compared' }],
  ])) {
    const unavailable = /** @type {ReplayResult} */ ({ ...RESULT, status: 'unavailable', reason, stages, compared: [], steps: [stored] });
    const shown = stageGroups(unavailable, [0]);
    assertGroups(shown, [1, 2, 3, 4, 5, 6, 7], [0, 0, 0, 0, 0, 0, 1]);
    assert.deepEqual(shown.map((g) => g.mark), ['notAvailable', 'notAvailable', 'notAvailable', 'notAvailable', 'notAvailable', 'notAvailable', null], reason);
    assert.deepEqual(shown.map((g) => g.markText), [...Array(6).fill({ key: 'replay.notAvailable' }), null], reason);
    assert.deepEqual(shown.map((g) => g.indices), [[], [], [], [], [], [], [0]], reason);
    assert.deepEqual(stepScore(stored), [19, IN]);
    assert.equal(stepText(stored).key, 'replay.step.final.stored');
  }

  const early = replayPuzzle(FIRST, workspaces, { ...REPLAY, maxSteps: 1 });
  const stopped = stageGroups(early, [0]);
  assertGroups(stopped, [1, 2, 3, 4, 5, 6, 7], [0, 0, 0, 0, 0, 0, 1]);
  assert.deepEqual(stopped.map((g) => g.mark), ['stopped', 'stopped', 'stopped', 'stopped', 'stopped', 'stopped', null]);
});

test('steps: the rules are named, never coded, in the techniques and the score table, in both languages', () => {
  const rules = scoreTable(RESULT.steps[53], RESULT.steps).rows.find((r) => r.id === 'rules');
  assert.deepEqual(rules?.detail?.params?.counts, [uses('R1', 3), uses('R2', 1), uses('R8', 18)]);
  const row = /** @type {Desc} */ (rules?.detail);
  assert.equal(renderDesc(row, t), 'Deduction tier 3; rule uses: Forced cell ×3, Forced piece ×1, Neck ×18');
  assert.deepEqual(
    descriptorKeys({ key: 'replay.table.rules', params: { tier: 3, counts: [uses('R1', 3), uses('R8', 18)] } }),
    ['replay.table.rules', 'replay.uses', 'replay.rule.R1', 'replay.uses', 'replay.rule.R8'],
  );
  for (const code of ['en', 'vi']) {
    setLocale(code, null);
    if (code === 'vi') {
      assert.equal(renderDesc(row, t), 'Bậc suy luận 3; số lần dùng quy tắc: Ô bắt buộc ×3, Mảnh bắt buộc ×1, Chỗ thắt ×18');
    }
    for (const result of [RESULT, CALIBRATION_RESULT]) {
      for (const s of result.steps) {
        const texts = [...stepTechniques(s).map(lineText), ...stepScore(s).map(lineText)];
        for (const r of scoreTable(s, result.steps).rows) {
          texts.push(renderDesc(r.head, t), ...(r.detail === null ? [] : [renderDesc(r.detail, t)]));
          if (typeof r.value === 'object' && r.value !== null) {
            texts.push(renderDesc(r.value, t));
          }
        }
        for (const text of texts) {
          assert.ok(!/\bR[1-9]\b/.test(text), `${code}: ${text}`);
        }
      }
    }
  }
});

// ---------------------------------------------------------------------------------------------------------------
// 13. The controller of the section.

/**
 * @param {Partial<{ run: (source: any, signal: AbortSignal) => Promise<ReplayResult>,
 *   cache: { load(source: any): ReplayResult | null, save(source: any, result: ReplayResult): void } }>} [over]
 */
function stepsHarness(over = {}) {
  /** @type {{ source: any, signal: AbortSignal, answer: ReturnType<typeof deferred<ReplayResult>> }[]} */
  const calls = [];
  /** @type {import('../generator/ui/replay-model.js').StepsState[]} */
  const states = [];
  const controller = createStepsController({
    run: over.run ?? ((source, signal) => {
      const answer = /** @type {any} */ (deferred());
      calls.push({ source, signal, answer });
      return answer.promise;
    }),
    cache: over.cache,
    onChange: (state) => states.push(state),
  });
  return { controller, calls, states };
}

/** @param {string} id @param {any} [set] @param {any} [made] @param {any} [setOrigin] */
const src = (id, set = SET, made = null, setOrigin = null) => /** @type {any} */ ({ set, puzzle: { ...FIRST.puzzle, id }, setOrigin, made });

test('steps controller: one run per puzzle; another puzzle aborts its own run; a cache of 16 per set', async () => {
  const h = stepsHarness();
  assert.deepEqual(h.controller.getState(), { phase: 'idle', source: null, result: null, failure: null, view: 'compact', expanded: null });
  assert.equal(h.states.length, 0);

  const A = src('pA');
  const B = src('pB');
  h.controller.show(A);
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].source, A);
  assert.equal(h.calls[0].signal.aborted, false);
  assert.deepEqual(h.states.map((s) => s.phase), ['loading']);
  h.controller.show({ ...A });
  assert.equal(h.calls.length, 1);
  assert.equal(h.states.length, 1, 'the same puzzle changes nothing');

  h.controller.show(B);
  assert.equal(h.calls[0].signal.aborted, true);
  assert.equal(h.calls.length, 2);
  h.calls[0].answer.resolve(RESULT);
  await flush();
  assert.equal(h.controller.getState().phase, 'loading', 'the late answer of A changes nothing');
  h.calls[1].answer.resolve(smallResult());
  await flush();
  assert.equal(h.controller.getState().phase, 'ready');
  assert.equal(h.controller.getState().result?.steps.length, 2);

  h.controller.show(A);
  assert.equal(h.calls.length, 3, 'an aborted run is not kept');
  h.calls[2].answer.resolve(RESULT);
  await flush();
  assert.equal(h.controller.getState().phase, 'ready');
  const before = h.calls.length;
  h.controller.show(B);
  assert.equal(h.calls.length, before);
  assert.equal(h.controller.getState().phase, 'ready');
  assert.equal(h.controller.getState().result?.steps.length, 2, 'the cached result at once');

  const c = stepsHarness();
  for (let i = 0; i <= STEPS_CACHE_SIZE; i += 1) {
    c.controller.show(src(`c${i}`));
    c.calls[i].answer.resolve(smallResult());
    await flush();
  }
  assert.equal(c.calls.length, STEPS_CACHE_SIZE + 1);
  c.controller.show(src(`c${STEPS_CACHE_SIZE}`));
  c.controller.show(src('c1'));
  assert.equal(c.calls.length, STEPS_CACHE_SIZE + 1);
  c.controller.show(src('c0'));
  assert.equal(c.calls.length, STEPS_CACHE_SIZE + 2, 'c0 was dropped first');
  c.calls[STEPS_CACHE_SIZE + 1].answer.resolve(smallResult());
  await flush();
  c.controller.show(src('c1'));
  assert.equal(c.calls.length, STEPS_CACHE_SIZE + 2);
  c.controller.show(src('c2'));
  assert.equal(c.calls.length, STEPS_CACHE_SIZE + 3, 'c1 was shown again, so c2 was the least recently shown');

  const n = c.calls.length;
  c.controller.show(src('c16', { ...SET }));
  assert.equal(c.calls.length, n + 1, 'a new set object empties the cache');
  c.controller.show(src('c16'));
  assert.equal(c.calls.length, n + 2);

  const m = stepsHarness();
  const made = () => ({ schema: 1, kind: 'candidate' });
  m.controller.show(src('pX', SET, made()));
  m.calls[0].answer.resolve(smallResult());
  await flush();
  m.controller.show(src('pY'));
  m.calls[1].answer.resolve(smallResult());
  await flush();
  m.controller.show(src('pX', SET, made()));
  assert.equal(m.calls.length, 3, 'made is compared by identity');

  const k = stepsHarness();
  k.controller.setView('all');
  k.controller.show(src('pK'));
  const count = k.states.length;
  k.controller.show(null);
  assert.equal(k.calls[0].signal.aborted, true);
  assert.deepEqual(
    { ...k.controller.getState() },
    { phase: 'idle', source: null, result: null, failure: null, view: 'all', expanded: null },
  );
  assert.equal(k.states.length, count + 1);
  k.controller.show(null);
  assert.equal(k.states.length, count + 1, 'nothing to change');
});

test('steps controller: a saved replay answers at once without a run; a finished replay is saved, a failed one is not', async () => {
  /** @type {Map<string, ReplayResult>} */
  const kept = new Map();
  const cache = {
    load: (/** @type {any} */ source) => kept.get(source.puzzle.id) ?? null,
    save: (/** @type {any} */ source, /** @type {ReplayResult} */ result) => void kept.set(source.puzzle.id, result),
  };
  const first = stepsHarness({ cache });
  first.controller.show(src('pS'));
  assert.equal(first.calls.length, 1, 'nothing is saved yet, so the replay runs');
  first.calls[0].answer.resolve(smallResult());
  await flush();
  assert.equal(kept.get('pS'), first.controller.getState().result, 'the finished replay is saved');

  const later = stepsHarness({ cache });
  later.controller.show(src('pS'));
  assert.equal(later.calls.length, 0, 'a new session replays nothing');
  assert.deepEqual(later.states.map((s) => s.phase), ['ready'], 'and never shows the loading phase');
  assert.equal(later.controller.getState().result, kept.get('pS'));

  const failing = stepsHarness({ cache });
  failing.controller.show(src('pF'));
  failing.calls[0].answer.reject(new PoolError('worker-unavailable', 'no worker'));
  await flush();
  assert.equal(failing.controller.getState().phase, 'failed');
  assert.equal(kept.has('pF'), false, 'a failure is not saved');
});

test('steps controller: a new generation resubmits the replay; failures and Try again; an unavailable result shows its final step', async () => {
  const ABORTED = () => new PoolAbortError('cancelled');
  /** @param {unknown[]} outcomes */
  const scripted = (outcomes) => {
    let at = 0;
    return stepsHarness({
      run: () => {
        const outcome = outcomes[Math.min(at, outcomes.length - 1)];
        at += 1;
        return outcome instanceof Error ? Promise.reject(outcome) : Promise.resolve(/** @type {ReplayResult} */ (outcome));
      },
    });
  };
  const calls = (/** @type {ReturnType<typeof scripted>} */ h) => h.states.filter((s) => s.phase === 'loading').length;

  const once = stepsHarness({
    run: (() => {
      let n = 0;
      return () => {
        n += 1;
        return n === 1 ? Promise.reject(ABORTED()) : Promise.resolve(RESULT);
      };
    })(),
  });
  once.controller.show(SOURCE);
  await flush();
  assert.deepEqual(once.states.map((s) => s.phase), ['loading', 'ready']);

  let runs = 0;
  const twice = stepsHarness({
    run: () => {
      runs += 1;
      return runs <= 2 ? Promise.reject(ABORTED()) : Promise.resolve(RESULT);
    },
  });
  twice.controller.show(SOURCE);
  await flush();
  assert.equal(runs, 3);
  assert.deepEqual(twice.states.map((s) => s.phase), ['loading', 'ready']);

  /** @param {unknown} error */
  async function failureFor(error) {
    const h = stepsHarness({ run: () => Promise.reject(error) });
    h.controller.show(SOURCE);
    await flush();
    assert.equal(h.controller.getState().phase, 'failed');
    assert.equal(h.controller.getState().result, null);
    return h.controller.getState().failure;
  }
  assert.equal(await failureFor(new PoolError('worker-unavailable', 'no worker')), 'worker-unavailable');
  for (const error of [
    new PoolError('invalid-task', 'refused'), new PoolError('worker-crashed', 'crash'), new WorkerTaskError('invalid-request', 'bad'),
    new TypeError('malformed source'), new PoolAbortError('closed'), new Error('x'),
  ]) {
    assert.equal(await failureFor(error), 'failed', error.message);
  }
  const thrown = stepsHarness({ run: () => { throw new TypeError('malformed source'); } });
  thrown.controller.show(SOURCE);
  await flush();
  assert.equal(thrown.controller.getState().failure, 'failed');
  const empty = stepsHarness({ run: () => Promise.resolve(/** @type {any} */ ({ status: 'matched', steps: [] })) });
  empty.controller.show(SOURCE);
  await flush();
  assert.equal(empty.controller.getState().failure, 'failed');

  const retry = scripted([new PoolError('worker-unavailable', 'no worker'), RESULT]);
  retry.controller.show(SOURCE);
  await flush();
  assert.equal(retry.controller.getState().failure, 'worker-unavailable');
  retry.controller.retry();
  assert.equal(retry.controller.getState().phase, 'loading');
  assert.equal(retry.controller.getState().failure, null);
  await flush();
  assert.equal(retry.controller.getState().phase, 'ready');
  const after = retry.states.length;
  retry.controller.retry();
  assert.equal(retry.states.length, after, 'retry in ready does nothing');
  assert.equal(calls(retry), 2);

  const kept = stepsHarness();
  kept.controller.show(src('pK1'));
  kept.calls[0].answer.reject(new Error('x'));
  await flush();
  kept.controller.show(src('pK2'));
  kept.controller.show(src('pK1'));
  assert.equal(kept.calls.length, 3, 'a failed run is not kept');

  const input = (/** @type {(generation: any) => any} */ change) => ({ ...FIRST, generation: change(FIRST.generation) });
  const cases = /** @type {[string, any, string, number][]} */ ([
    ['without the puzzle record', input((g) => ({
      ...g, made: Object.fromEntries(Object.entries(g.made).filter(([id]) => id !== FIRST.puzzle.id)),
    })), 'no-record', 12],
    ['without the set origin', input((g) => Object.fromEntries(Object.entries(g).filter(([name]) => name !== 'setOrigin'))), 'no-set-origin', 43],
    ['with a completion record', input((g) => ({
      ...g, made: { ...g.made, [FIRST.puzzle.id]: { schema: 1, kind: 'completion' } },
    })), 'completion', 12],
  ]);
  for (const [name, replayInput, reason, count] of cases) {
    const raw = /** @type {ReplayResult} */ (replayPuzzle(replayInput, workspaces, REPLAY));
    assert.equal(raw.status, 'unavailable', name);
    assert.equal(raw.reason, reason, name);
    assert.equal(raw.steps.length, count, name);
    const h = stepsHarness({ run: () => Promise.resolve(raw) });
    h.controller.show(SOURCE);
    await flush();
    assert.equal(raw.status, 'unavailable', `${name}: the engine's result is not changed`);
    assert.equal(raw.steps.length, count, name);
    assert.deepEqual(h.states.map((s) => s.phase), ['loading', 'ready'], name);
    const shown = /** @type {ReplayResult} */ (h.controller.getState().result);
    assert.notEqual(shown, raw);
    assert.deepEqual([shown.status, shown.reason, shown.stages, shown.compared, shown.work], [raw.status, raw.reason, raw.stages, raw.compared, raw.work], name);
    assert.equal(shown.steps.length, 1, name);
    assert.equal(shown.steps[0], raw.steps[raw.steps.length - 1], name);
    assert.equal(shown.steps[0].kind, 'final');
    assert.deepEqual(stepScore(shown.steps[0]), [19, IN], name);
    assert.deepEqual(h.controller.visible(), [0], name);
    h.controller.setView('all');
    assert.deepEqual(h.controller.visible(), [0], name);
    const groups = stageGroups(shown, [0]);
    assertGroups(groups, [1, 2, 3, 4, 5, 6, 7], [0, 0, 0, 0, 0, 0, 1]);
    assert.deepEqual(groups.map((g) => g.mark), ['notAvailable', 'notAvailable', 'notAvailable', 'notAvailable', 'notAvailable', 'notAvailable', null], name);
    assert.deepEqual(groups.map((g) => g.indices), [[], [], [], [], [], [], [0]], name);
  }

  const odd = stepsHarness({
    run: () => Promise.resolve(/** @type {ReplayResult} */ ({ ...RESULT, status: 'unavailable', reason: 'no-record', steps: RESULT.steps.slice(0, 3) })),
  });
  odd.controller.show(SOURCE);
  await flush();
  assert.equal(odd.controller.getState().phase, 'failed');
  assert.equal(odd.controller.getState().failure, 'failed');
});

test('steps controller: toggle, view, the real clue keys and dispose', async () => {
  const run = () => Promise.resolve(playbackResult());
  const h = stepsHarness({ run });
  const B = src('pB');
  h.controller.show(SOURCE);
  await flush();
  assert.deepEqual(h.controller.visible(), COMPACT);
  const opened = () => h.controller.getState().expanded;
  h.controller.toggle(9);
  assert.equal(opened(), 9);
  h.controller.toggle(9);
  assert.equal(opened(), null);
  h.controller.toggle(9);
  h.controller.toggle(12);
  assert.equal(opened(), 12, 'one step at a time');
  const count = h.states.length;
  h.controller.toggle(8);
  h.controller.toggle(99);
  assert.equal(opened(), 12);
  assert.equal(h.states.length, count, 'a hidden or unknown step does nothing');

  h.controller.setView('all');
  assert.equal(opened(), 12);
  assert.equal(h.controller.visible().length, 15);
  h.controller.toggle(8);
  assert.equal(opened(), 8);
  h.controller.setView('compact');
  assert.equal(opened(), null, 'the view hides the open step');
  const settled = h.states.length;
  h.controller.setView('compact');
  h.controller.setView(/** @type {any} */ ('bogus'));
  assert.equal(h.states.length, settled);

  h.controller.setView('all');
  h.controller.toggle(3);
  h.controller.show(B);
  await flush();
  assert.equal(h.controller.getState().view, 'all', 'the view is kept for another puzzle');
  assert.equal(h.controller.getState().expanded, null);

  const decided = /** @type {any} */ (ALL.find(({ input, result }) => JSON.stringify(compactIndices(result.steps, stepKeyOf(input.set)))
    !== JSON.stringify(compactIndices(result.steps, () => ''))));
  assert.ok(decided !== undefined);
  const real = stepsHarness({ run: () => Promise.resolve(decided.result) });
  real.controller.show({ ...SOURCE, set: decided.input.set });
  await flush();
  assert.deepEqual(real.controller.visible(), compactIndices(decided.result.steps, stepKeyOf(decided.input.set)));
  assert.ok(real.controller.visible().length < decided.result.steps.length);

  const d = stepsHarness();
  d.controller.show(SOURCE);
  d.controller.dispose();
  assert.equal(d.calls[0].signal.aborted, true);
  const settledD = d.states.length;
  d.calls[0].answer.resolve(RESULT);
  await flush();
  d.controller.show(src('pA'));
  assert.equal(d.calls.length, 1, 'a disposed controller makes no call');
  assert.equal(d.states.length, settledD, 'and announces nothing');
});

// ---------------------------------------------------------------------------------------------------------------
// 14. The texts of the section, and the removed dialog.

test('steps: every key of the row model exists in both packs; the nine rule names; the removed keys are gone', () => {
  const synthetic = [
    step({ kind: 'skip', args: { sequence: 2 } }),
    step({ kind: 'unrateable', board: { placed: [], lifted: [], clues: ['C'] }, band: { min: 17, max: 25 } }),
    step({ stage: 6, kind: 'repair', args: { added: null } }),
    rated(19), rated(25), rated(80, { min: 53, max: null }),
    { ...RESULT.steps[22], rating: { ...RESULT.steps[22].rating, censored: true } },
    finalStep({ ...FIRST, puzzle: { ...FIRST.puzzle, rating: null } }, 'matched', null),
  ];
  /** @type {Desc[]} */
  const all = [];
  /** @param {import('../generator/ui/replay-model.js').Line} line */
  const addLine = (line) => {
    if (typeof line !== 'number') {
      all.push(...(Array.isArray(line) ? line : [line]));
    }
  };
  for (const result of [RESULT, CALIBRATION_RESULT]) {
    for (const view of /** @type {const} */ (['compact', 'all'])) {
      const visible = visibleIndices(result.steps, view, stepKeyOf(result === RESULT ? SET : CALIBRATION.set));
      for (const g of stageGroups(result, visible)) {
        all.push(g.heading, ...(g.markText === null ? [] : [g.markText]));
      }
    }
    result.steps.forEach((s, i) => {
      all.push(rowLabel(i));
      stepTechniques(s).forEach(addLine);
      stepScore(s).forEach(addLine);
    });
  }
  for (const s of synthetic) {
    stepTechniques(s).forEach(addLine);
    stepScore(s).forEach(addLine);
  }
  for (const d of all) {
    assertKnown(d, d.key);
  }
  const direct = [
    'replay.title', 'replay.loading', 'replay.waiting', 'replay.retry', 'replay.view.label', 'replay.view.compact', 'replay.view.all',
    'replay.col.step', 'replay.col.what', 'replay.col.pieces', 'replay.col.techniques', 'replay.col.score', 'replay.cell.none',
    'replay.board', 'replay.table.caption',
  ];
  for (const key of direct) {
    assert.ok(textOf(EN, key) !== undefined && textOf(VI, key) !== undefined, key);
  }
  assert.equal(EN['replay.title'], 'Generation steps');
  assert.equal(VI['replay.title'], 'Các bước tạo đề');
  const names = {
    en: ['Forced cell', 'Forced piece', 'Pocket placement', 'Piece claims cells', 'Cell claims a piece', 'Dead placement', 'Parity', 'Neck', 'Pair exclusion'],
    vi: ['Ô bắt buộc', 'Mảnh bắt buộc', 'Đặt mảnh vào vùng kín', 'Mảnh chiếm ô', 'Ô chỉ nhận một mảnh', 'Cách đặt dẫn tới mâu thuẫn', 'Chẵn lẻ màu ô', 'Chỗ thắt', 'Loại trừ cặp'],
  };
  for (const [pack, list] of /** @type {const} */ ([[EN, names.en], [VI, names.vi]])) {
    assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => pack[`replay.rule.R${n}`]), list);
  }
  for (const key of [
    'replay.button', 'replay.button.aria', 'replay.close', 'replay.prev', 'replay.next', 'replay.play', 'replay.pause', 'replay.slider',
    'replay.stages', 'replay.failed.interrupted',
  ]) {
    assert.equal(textOf(EN, key), undefined, `${key} is not in English`);
    assert.equal(textOf(VI, key), undefined, `${key} is not in Vietnamese`);
  }
});

test('the Generation steps module loads and the dialog module is gone', async () => {
  const steps = await import('../generator/ui/generation-steps.js');
  assert.equal(typeof steps.mountGenerationSteps, 'function');
  assert.equal(existsSync(new URL('../generator/ui/replay-dialog.js', import.meta.url)), false);
});

test('replay cache: the key follows what the replay reads and survives the saved state; a scripted storage has no cache', async () => {
  const { createReplayCache, replayKeyOf } = await import('../generator/ui/replay-cache.js');
  const source = src('pKey', SET, { schema: 1, kind: 'candidate' });
  const key = replayKeyOf(source);
  assert.match(key, /^r[a-z0-9]{1,60}$/);
  const restored = JSON.parse(JSON.stringify({ ...source, puzzle: { ...source.puzzle, note: undefined, title: null } }));
  assert.equal(replayKeyOf(restored), key, 'the same after a trip through JSON');
  assert.equal(replayKeyOf({ ...source, puzzle: { ...source.puzzle, title: 'Mine', certificate: { kind: 'unique' }, seed: 'x#1' } }), key,
    'a title, a certificate or a seed added later is not read by the replay');
  assert.notEqual(replayKeyOf({ ...source, puzzle: { ...source.puzzle, id: 'pOther' } }), key, 'another puzzle');
  assert.notEqual(replayKeyOf({ ...source, made: { schema: 1, kind: 'calibration' } }), key, 'another origin record');
  assert.notEqual(replayKeyOf({ ...source, setOrigin: { schema: 1 } }), key, 'another set origin');
  assert.notEqual(replayKeyOf({ ...source, set: { ...SET, carving: 'flat' } }), key, 'another set');

  assert.equal(createReplayCache({}), undefined);
  assert.equal(createReplayCache(null), undefined);
  /** @type {Map<string, unknown>} */
  const stored = new Map();
  const cache = /** @type {NonNullable<ReturnType<typeof createReplayCache>>} */ (createReplayCache({
    loadReplay: (name) => stored.get(name) ?? null,
    saveReplay: (name, result) => void stored.set(name, result),
  }));
  assert.equal(cache.load(source), null);
  cache.save(source, /** @type {any} */ (RESULT));
  assert.equal(cache.load(source), RESULT);
  const broken = createReplayCache({ loadReplay: () => { throw new Error('denied'); }, saveReplay: () => { throw new Error('denied'); } });
  assert.equal(broken?.load(source), null, 'a storage that throws is a miss');
  assert.doesNotThrow(() => broken?.save(source, /** @type {any} */ (RESULT)));
});

test('replay cache: the key holds the running provenance tuple', async () => {
  const { replayKeyFor, replayKeyOf } = await import('../generator/ui/replay-cache.js');
  const { provenanceVersions } = await import('../core/engine/generate.js');
  const source = src('pKey', SET, { schema: 1, kind: 'candidate' });
  const key = replayKeyFor(source, provenanceVersions());
  assert.equal(key, replayKeyOf(source));
  assert.notEqual(replayKeyFor(source, { ...provenanceVersions(), rng: 'other' }), key, 'another rng');
  assert.notEqual(replayKeyFor(source, { ...provenanceVersions(), priorTable: 'prior-s3-v2' }), key, 'the prior table id');
  assert.notEqual(replayKeyFor(source, { ...provenanceVersions(), screenTable: 'screen-v4-v2' }), key, 'the screen table id');
});

test('replay cache: a prefetch makes and saves a replay once; the section waits for it; a cancelled one is asked again', async () => {
  const { createReplayCache } = await import('../generator/ui/replay-cache.js');
  /** @type {Map<string, any>} */
  const stored = new Map();
  const storage = {
    loadReplay: (/** @type {string} */ key) => stored.get(key) ?? null,
    saveReplay: (/** @type {string} */ key, /** @type {any} */ result) => void stored.set(key, result),
    hasReplay: (/** @type {string} */ key) => stored.has(key),
  };
  /** @type {{ source: any, signal: AbortSignal, answer: ReturnType<typeof deferred<ReplayResult>> }[]} */
  const calls = [];
  const cache = /** @type {NonNullable<ReturnType<typeof createReplayCache>>} */ (createReplayCache(storage, (source, signal) => {
    const answer = /** @type {any} */ (deferred());
    calls.push({ source, signal, answer });
    return answer.promise;
  }));
  const A = src('pP1');
  cache.prefetch(A);
  await flush();
  assert.equal(calls.length, 1);
  assert.equal(cache.has(A), false);
  cache.prefetch(A);
  assert.equal(calls.length, 1, 'a replay being made is not asked for again');

  const waiter = new AbortController();
  const waited = cache.run(A, waiter.signal);
  assert.equal(calls.length, 1, 'the section waits for the prefetch instead of running');

  calls[0].answer.reject(new PoolAbortError('cancelled'));
  await flush();
  assert.equal(calls.length, 2, 'a new generation cancelled it, so it is asked again');
  calls[1].answer.resolve(smallResult());
  await flush();
  assert.equal((await waited).steps.length, 2, 'the waiting section gets the result');
  assert.deepEqual([cache.has(A), stored.size], [true, 1]);
  cache.prefetch(src('pP1'));
  assert.equal(calls.length, 2, 'a saved replay is not made again');

  const B = src('pP2');
  cache.prefetch(B);
  await flush();
  const leaving = new AbortController();
  const gone = cache.run(B, leaving.signal);
  leaving.abort();
  await assert.rejects(gone, (error) => error instanceof PoolAbortError && error.reason === 'cancelled');
  assert.equal(calls[2].signal.aborted, false, 'the section leaving does not stop the prefetch');
  calls[2].answer.reject(new PoolError('failed', 'broken'));
  await flush();
  assert.deepEqual([cache.has(B), stored.size], [false, 1], 'a failed replay is not saved');
  cache.prefetch(B);
  assert.equal(calls.length, 3, 'and is not tried again by itself');

  cache.dispose();
  assert.equal(calls[3] === undefined || calls[3].signal.aborted, true, 'dispose aborts the replays being made');
  assert.equal(createReplayCache(storage, undefined)?.prefetch(src('pP4')), undefined, 'without a runner nothing is prefetched');
});

test('gen-v4 steps read in English and Vietnamese', () => {
  const clues = ['A', 'B', 'C', 'D', 'E'];
  const withClues = { board: { placed: [], lifted: [], clues } };
  const ratedAt = (/** @type {string} */ phase) => stepOf('rated', { sequence: 1, phase, source: 'candidate' }, { ...withClues, rating: rated(70).rating });
  const unrateableAt = (/** @type {string} */ phase, /** @type {string} */ reason) => stepOf(
    'unrateable', { sequence: 1, phase, source: 'candidate', reason }, { ...withClues, band: { min: 17, max: 25 } },
  );
  /** @type {[Step, string, Record<string, number>, Record<string, string>][]} */
  const cases = [
    [ratedAt('locate'), 'replay.step.locate', { sequence: 2, count: 5, score: 70 }, {
      en: 'Clue set 2 (5 clues) is rated to find how many clues this level needs: score 70.',
      vi: 'Nhóm mảnh đặt sẵn 2 (5 mảnh) được chấm để tìm số mảnh đặt sẵn mà mức này cần: điểm 70.',
    }],
    [ratedAt('rescue'), 'replay.step.rerate', { sequence: 2, score: 70 }, {
      en: 'Clue set 2 is rated again with the full limit: score 70.',
      vi: 'Nhóm mảnh đặt sẵn 2 được chấm lại với giới hạn đầy đủ: điểm 70.',
    }],
    [ratedAt('rerate'), 'replay.step.rerate', { sequence: 2, score: 70 }, {
      en: 'Clue set 2 is rated again with the full limit: score 70.',
      vi: 'Nhóm mảnh đặt sẵn 2 được chấm lại với giới hạn đầy đủ: điểm 70.',
    }],
    [ratedAt('window'), 'replay.step.rated', { sequence: 2, score: 70 }, {
      en: 'Clue set 2 is rated: score 70.',
      vi: 'Nhóm mảnh đặt sẵn 2 được chấm: điểm 70.',
    }],
    [unrateableAt('locate', 'screen-capped'), 'replay.step.screenCapped', { sequence: 2 }, {
      en: 'The quick rating of clue set 2 reached its work limit. It only guides the search; it has no score.',
      vi: 'Lần chấm nhanh nhóm mảnh đặt sẵn 2 đã chạm giới hạn phép tính. Kết quả chỉ định hướng việc tìm kiếm; không có điểm.',
    }],
    [unrateableAt('rerate', 'path-capped'), 'replay.step.rerateCapped', { sequence: 2 }, {
      en: 'The full rating of clue set 2 also reached its limit, so it has no score.',
      vi: 'Lần chấm đầy đủ nhóm mảnh đặt sẵn 2 cũng chạm giới hạn nên không có điểm.',
    }],
    [unrateableAt('beam', 'path-capped'), 'replay.step.unrateable', { sequence: 2 }, {
      en: 'Clue set 2 cannot be rated: the deduction path is capped.',
      vi: 'Không chấm được nhóm mảnh đặt sẵn 2: đường suy luận bị giới hạn.',
    }],
    [stepOf('budget', { source: 'candidate' }), 'replay.step.budget', {}, {
      en: 'This clue search reached its work limit: no further rating or uniqueness check was started.',
      vi: 'Lần tìm các mảnh đặt sẵn này đã chạm giới hạn phép tính: không bắt đầu thêm lần chấm điểm hay kiểm tra tính duy nhất nào.',
    }],
    [stepOf('noWindow', { side: 'below', source: 'candidate' }), 'replay.step.noWindow.below', {}, {
      en: 'The search reduced the number of clues to one without finding a clue set at this level.',
      vi: 'Việc tìm kiếm đã giảm số mảnh đặt sẵn tới một mà không tìm được nhóm mảnh đặt sẵn đạt mức này.',
    }],
    [stepOf('noWindow', { side: 'above', source: 'candidate' }), 'replay.step.noWindow.above', {}, {
      en: 'The search increased the number of clues to the allowed maximum without finding a clue set at this level.',
      vi: 'Việc tìm kiếm đã tăng số mảnh đặt sẵn tới mức tối đa cho phép mà không tìm được nhóm mảnh đặt sẵn đạt mức này.',
    }],
  ];
  for (const [s, key, params, texts] of cases) {
    const d = stepText(s);
    assert.equal(d.key, key);
    assert.deepEqual(d.params ?? {}, params, key);
    assertKnown(d, key);
    for (const code of /** @type {const} */ (['en', 'vi'])) {
      setLocale(code, null);
      assert.equal(renderDesc(d, t), texts[code], `${key} ${code}`);
    }
  }
  const capped = stepOf('unrateable', { sequence: 1, phase: 'locate', source: 'candidate', reason: 'screen-capped' });
  assert.deepEqual(stepScore(capped), [{ key: 'replay.table.unrateable' }], 'a screen-capped step shows no score');
  for (const kind of /** @type {const} */ (['budget', 'noWindow'])) {
    const none = stepOf(kind, { source: 'candidate', side: 'below' });
    assert.deepEqual([stepScore(none), stepTechniques(none), stepPieces(none, SET), boardOf(none).highlightedIds], [[], [], [], []], kind);
    assert.equal(scoreTable(none, [none]).kind, 'none', kind);
  }
});
