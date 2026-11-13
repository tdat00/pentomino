// @ts-check
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { activeCount, boardFromRows, validateForGeneration } from '../core/engine/board.js';
import { canonicalJson, sha256Hex } from '../core/engine/hash.js';
import { level, offeredLevels } from '../core/engine/levels.js';
import {
  aggregateLandscape, boardId, buildLandscapeMatrix, checkLandscapeBoards, checkSetPolicy, deterministicBoard, initialG,
  landscapeBoards, rectRows, REFERENCE_ROWS, referenceFor, referencePolicyAgreement, renderLandscapeMarkdown, sampleCounts,
} from '../tools/bench/calibration-reference.js';
import { newRunRecord, evaluateCell, returnedEveryArrangement, validateRunRecord } from '../tools/bench/report.js';
import { releaseHost, runCase, validateMatrix } from '../tools/bench/runner.js';
import { createNodeHost, loadMatrix, parseArgs, readCheckpoint, reportBase, run, runInChild } from '../tools/calibrate.mjs';

const recipe = JSON.parse(readFileSync(new URL('./fixtures/generation-case.json', import.meta.url), 'utf8'));
const ARTIFACTS = fileURLToPath(new URL('./artifacts/t21-calibration/', import.meta.url));

describe('reference table', () => {
  test('every row of the design table is present and inside its level\'s offered areas', () => {
    assert.equal(REFERENCE_ROWS.length, 56);
    for (const r of REFERENCE_ROWS) {
      const [lo, hi] = level(r.level).areas;
      assert.ok(r.aMin >= lo && r.aMax <= Math.min(hi, 676), `${r.level} ${r.aMin}-${r.aMax}`);
      assert.ok(r.k[0] <= r.k[1] && r.sizes[0] <= r.sizes[1] && r.g0[0] <= r.g0[1]);
    }
    const hell = /** @type {NonNullable<ReturnType<typeof referenceFor>>} */ (referenceFor('hell-1', 600));
    assert.equal(hell.nodeS, 48.6);
    assert.equal(hell.planKind, 'lazy-estimate');
    assert.deepEqual(hell.boards, [{ cols: 26, rows: 26 }]);
    assert.deepEqual(/** @type {any} */ (referenceFor('hell-3', 470)).boards, [{ cols: 22, rows: 22 }, { cols: 32, rows: 15 }]);
  });

  test('n/m rows are forecasts and the K28 row is not comparable', () => {
    const forecast = /** @type {NonNullable<ReturnType<typeof referenceFor>>} */ (referenceFor('hard', 250));
    assert.equal(forecast.nodeKind, 'forecast');
    assert.equal(forecast.boards, null);
    assert.equal(forecast.planKind, 'estimate');
    const k28 = /** @type {NonNullable<ReturnType<typeof referenceFor>>} */ (referenceFor('expert', 600));
    assert.equal(k28.comparable, false);
    assert.match(k28.note, /K = 28/);
  });

  test('the exact policy agrees with each row\'s K range within the one-piece tolerance', () => {
    for (const r of REFERENCE_ROWS) {
      const agreement = referencePolicyAgreement(r);
      assert.ok(agreement.agrees, `${r.level} ${r.aMin}-${r.aMax}: table ${r.k} policy ${agreement.policyK}`);
    }
  });
});

describe('landscape matrix', () => {
  test('deterministic boards use the closest-to-square pair, else block the final row', () => {
    assert.deepEqual(deterministicBoard(87), { cols: 3, rows: 29, blocked: 0 });
    assert.deepEqual(deterministicBoard(300), { cols: 15, rows: 20, blocked: 0 });
    assert.deepEqual(deterministicBoard(420), { cols: 20, rows: 21, blocked: 0 });
    assert.deepEqual(deterministicBoard(576), { cols: 24, rows: 24, blocked: 0 });
    const odd = deterministicBoard(215);
    assert.deepEqual(odd, { cols: 15, rows: 15, blocked: 10 });
    const rows = rectRows(odd.cols, odd.rows, odd.blocked);
    assert.equal(rows[14], `${'#'.repeat(5)}${'.'.repeat(10)}`);
    const board = boardFromRows(rows);
    assert.equal(activeCount(board), 215);
    assert.deepEqual(validateForGeneration(board, 676).errors, []);
    assert.equal(boardId(odd), '15x15b10');
  });

  test('boards are deduplicated, valid, within the side limit and include 32x15 but not 40x12', () => {
    const boards = landscapeBoards();
    assert.deepEqual(checkLandscapeBoards(), []);
    assert.equal(new Set(boards.map((b) => b.boardRows.join('/'))).size, boards.length);
    const ids = boards.map((b) => b.id);
    for (const wanted of ['6x10', '10x10', '12x12', '14x14', '16x16', '18x18', '18x20', '20x20', '22x22', '24x24', '26x26', '32x15']) {
      assert.ok(ids.includes(wanted), wanted);
    }
    assert.ok(!ids.includes('40x12'));
    for (const b of boards) {
      assert.deepEqual(validateForGeneration(boardFromRows(b.boardRows), 676).errors, [], b.id);
    }
  });

  test('every offered level runs at every board with at least 20 fixed seeds, quantity 10 and uniqueness any', () => {
    const matrix = buildLandscapeMatrix();
    validateMatrix(matrix);
    let expected = 0;
    for (const b of landscapeBoards()) {
      const levels = offeredLevels(b.area).map((l) => l.id);
      expected += levels.length;
      const present = matrix.cases.filter((c) => c.id.startsWith(`${b.id}-`)).map((c) => c.levelId);
      assert.deepEqual(present, levels, b.id);
    }
    assert.equal(matrix.cases.length, expected);
    for (const c of matrix.cases) {
      assert.ok(c.repetitions >= 20);
      assert.equal(c.quantity, 10);
      assert.equal(c.uniqueness, 'any');
      assert.ok(!c.boardRows.some((r) => r.length > 32) && c.boardRows.length <= 32);
    }
    assert.equal(buildLandscapeMatrix({ seeds: 3 }).cases[0].repetitions, 3);
  });

  test('every reference row has at least one cell of its level inside its area band', () => {
    const cells = buildLandscapeMatrix().cases.map((c) => ({ level: c.levelId, area: activeCount(boardFromRows(c.boardRows)) }));
    for (const r of REFERENCE_ROWS) {
      assert.ok(cells.some((c) => c.level === r.level && c.area >= r.aMin && c.area <= r.aMax), `${r.level} ${r.aMin}-${r.aMax}`);
    }
  });

  test('the sampler plan uses the share grid plus 1, K-2 and the initial G, all distinct', () => {
    assert.deepEqual(sampleCounts(9, 3), [1, 2, 3, 4, 5, 6, 7]);
    assert.deepEqual(sampleCounts(3, 1), [1]);
    for (const k of [10, 40, 90]) {
      const counts = sampleCounts(k, initialG('hard', k));
      assert.equal(new Set(counts).size, counts.length);
      assert.ok(counts.includes(1) && counts.includes(k - 2) && counts.includes(initialG('hard', k)));
      assert.ok(counts.every((g) => g >= 1 && g <= k - 2));
    }
    assert.equal(initialG('hard', 9), 3);
  });
});

describe('policy check of observed sets', () => {
  test('the recorded fixture set obeys the exact policy and violations are named', () => {
    const sizes = recipe.expected.pieceKeys.map((/** @type {string} */ k) => Number(k.split(':')[0]));
    assert.deepEqual(checkSetPolicy('hard', 60, sizes), []);
    assert.ok(checkSetPolicy('hard', 60, sizes.slice(1)).includes('area-sum'));
    assert.ok(checkSetPolicy('hard', 60, [20, 20, 20]).includes('k-out-of-range'));
    assert.ok(checkSetPolicy('hard', 60, [3, 3, 3, 4, 4, 4, 13, 13, 13]).includes('small-piece-cap'));
    assert.ok(checkSetPolicy('hard', 60, [3, 3, 3, 3, 10, 10, 10, 9, 9]).includes('shape-availability'));
    assert.deepEqual(checkSetPolicy('hard', 60, [4, 6, 6, 6, 6, 6, 9, 9, 8]), []);
    assert.ok(checkSetPolicy('hard', 60, [31, 5, 5, 5, 4, 4, 3, 3]).includes('size-window'));
  });
});

/**
 * @param {string} caseId
 * @param {number} rep
 * @param {Partial<import('../tools/bench/report.js').RunRecord>} [over]
 */
const landscapeRun = (caseId, rep, over = {}) => newRunRecord({
  caseId, rep, seed: `landscape/${caseId}/${rep}`, browserOrNode: 'node v24', acceptedCount: 10, tenthReadyMs: 1000, responseMs: 1100,
  details: { area: 60, K: 9, sizes: [4, 4, 4, 5, 7, 7, 9, 10, 10], initialG: 3, policy: { violations: [] }, puzzles: [{ G: 3 }, { G: 4 }] },
  samples: [
    { A: 60, K: 9, G: 3, U: 6, score: 20, inBand: true, saturated: false, branchTrials: 5, rowTrials: 50, ratingMs: 4, certificateStatus: 'not-checked' },
    { A: 60, K: 9, G: 1, U: 8, score: 40, inBand: false, saturated: true, branchTrials: 5000, rowTrials: 900, ratingMs: 9, certificateStatus: 'not-checked' },
  ],
  ...over,
});

describe('landscape aggregation', () => {
  const matrix = buildLandscapeMatrix({ seeds: 20 });
  const only = (/** @type {string[]} */ ids) => ({ ...matrix, cases: matrix.cases.filter((c) => ids.includes(c.id)) });
  const reps = (/** @type {string} */ id, /** @type {(i: number) => Partial<import('../tools/bench/report.js').RunRecord>} */ f = () => ({})) => Array.from({ length: 20 }, (_, i) => landscapeRun(id, i, f(i)));
  const cell = (/** @type {ReturnType<typeof aggregateLandscape>} */ agg, /** @type {string} */ id) => /** @type {any} */ (agg.cells.find((c) => c.caseId === id));
  const refRow = (/** @type {ReturnType<typeof aggregateLandscape>} */ agg, /** @type {string} */ label) => /** @type {any} */ (agg.referenceRows.find((r) => r.label === label));

  test('criterion 1: 90% of requests must complete ten in-band puzzles, with at least 20 seeds', () => {
    const id = '6x10-hard';
    const pass = aggregateLandscape(reps(id, (i) => (i < 2 ? { acceptedCount: 6, tenthReadyMs: null } : {})), only([id]));
    assert.equal(cell(pass, id).criterion1.status, 'pass');
    assert.equal(cell(pass, id).requestInBandRate, 0.9);
    const fail = aggregateLandscape(reps(id, (i) => (i < 3 ? { acceptedCount: 6, tenthReadyMs: null } : {})), only([id]));
    assert.equal(cell(fail, id).criterion1.status, 'fail');
    assert.ok(fail.blockers.some((b) => b.startsWith(id)));
    const few = aggregateLandscape(reps(id).slice(0, 5), only([id]));
    assert.equal(cell(few, id).criterion1.status, 'incomplete');
    assert.equal(few.outcome, 'incomplete');
  });

  test('criterion 2: K policy violations and K outside the reference range +/- 1 are blockers', () => {
    const id = '6x10-hard';
    const ok = aggregateLandscape(reps(id), only([id]));
    assert.equal(cell(ok, id).K.withinReferenceTolerance, true);
    assert.deepEqual(cell(ok, id).K.policyViolations, {});
    const far = aggregateLandscape(reps(id, () => ({ details: { area: 60, K: 14, sizes: [4], initialG: 3, policy: { violations: ['k-out-of-range'] }, puzzles: [] } })), only([id]));
    assert.equal(cell(far, id).K.withinReferenceTolerance, false);
    assert.equal(cell(far, id).K.policyViolations['k-out-of-range'], 20);
    assert.ok(far.blockers.some((b) => /policy violations/.test(b)));
    assert.ok(far.blockers.some((b) => /outside the reference row range/.test(b)));
    assert.equal(far.outcome, 'blocked');
  });

  test('criterion 3: maximum Node T10 is compared with 2x the measured maximum, forecasts and K28 are not bounds', () => {
    const id = '6x10-hard';
    const label = 'hard 41-80';
    const within = aggregateLandscape(reps(id, (i) => ({ tenthReadyMs: i === 0 ? 4800 : 100 })), only([id]));
    assert.equal(refRow(within, label).boundMs, 4800);
    assert.equal(refRow(within, label).status, 'pass');
    const over = aggregateLandscape(reps(id, (i) => ({ tenthReadyMs: i === 0 ? 4801 : 100 })), only([id]));
    assert.equal(refRow(over, label).status, 'fail');
    assert.ok(over.blockers.some((b) => b.startsWith('reference hard 41-80')));
    const censored = aggregateLandscape(reps(id, (i) => (i === 0 ? { acceptedCount: 0, tenthReadyMs: null, responseMs: 120000 } : {})), only([id]));
    assert.equal(cell(censored, id).maxT10Ms, 120000);
    assert.equal(refRow(censored, label).status, 'fail');

    const forecast = aggregateLandscape(reps('3x29-very-easy', () => ({ tenthReadyMs: 99999 })), only(['3x29-very-easy']));
    assert.equal(refRow(forecast, 'very-easy 81-87').status, 'forecast-only');
    assert.match(refRow(forecast, 'very-easy 81-87').note, /not a timing acceptance bound/);
    const k28 = aggregateLandscape(reps('26x26-expert'), only(['26x26-expert']));
    assert.equal(refRow(k28, 'expert 577-676').status, 'baseline-review-required');
    assert.ok(k28.blockers.some((b) => /reviewed new baseline/.test(b)));
    const unrun = aggregateLandscape([], only([id]));
    assert.equal(refRow(unrun, label).status, 'not-run');
  });

  test('samples feed score distributions, in-band and saturation shares, and latency labels', () => {
    const id = '6x10-hard';
    const agg = aggregateLandscape(reps(id), only([id]));
    const c = cell(agg, id);
    assert.equal(agg.profileSamples, 40);
    assert.equal(c.sampledInBandRate, 0.5);
    assert.equal(c.saturation.sampledShare, 0.5);
    assert.match(c.profileLatency.kind, /RPC/);
    assert.deepEqual(agg.scoreByU.map((g) => g.key), [6, 8]);
    assert.equal(agg.scoreByArea[0].key, 60);
    assert.equal(agg.scoreByU[1].saturatedShare, 1);
    assert.deepEqual(c.clues.accepted, { 3: 20, 4: 20 });
    assert.equal(c.v3, null, 'records without v3 metrics have no v3 block');
    assert.equal(c.sampledUnrateable, 0);
  });

  /**
   * @param {number} clues
   * @param {number} score
   * @param {Record<string, unknown>} [m]
   * @param {boolean} [censored]
   */
  const v3Puzzle = (clues, score, m = {}, censored = false) => ({
    clues, U: 9 - clues, score, level: 'hard', saturated: false, censored,
    metrics: {
      deductionTier: 2, G: 1, Gproved: 1, info: 1, Cmax: 4, Dmax: 1, solutions: 'unique', censusComplete: !censored,
      censusUndecided: censored ? 1 : 0, F: 2, E: 0, nodes: 10, work: 100, ...m,
    },
  });
  const v3Details = (/** @type {any[]} */ puzzles, /** @type {Record<string, unknown>} */ extra = {}) => (
    { area: 60, K: 9, sizes: [4, 4, 4, 5, 7, 7, 9, 10, 10], initialG: 3, policy: { violations: [] }, puzzles, ...extra });
  const mixedPuzzles = [
    v3Puzzle(3, 60),
    v3Puzzle(4, 70, { G: 2, Gproved: 0, info: 3, Cmax: 9, deductionTier: 3, solutions: 'few' }, true),
  ];

  test('new-format records give the clue counts and the v3 block of a cell', () => {
    const id = '6x10-hard';
    const c = cell(aggregateLandscape(reps(id, () => ({ details: v3Details(mixedPuzzles) })), only([id])), id);
    assert.deepEqual(c.clues.accepted, { 3: 20, 4: 20 });
    assert.deepEqual(c.v3, {
      accepted: 40,
      score: { n: 40, min: 60, median: 65, p95: 70, max: 70 },
      G: { 1: 20, 2: 20 },
      info: { n: 40, min: 1, median: 2, p95: 3, max: 3 },
      Cmax: { 4: 20, 9: 20 },
      tier: { 2: 20, 3: 20 },
      solutions: { few: 20, unique: 20 },
      censored: { count: 20, share: 0.5 },
      provedZero: 20,
    });
  });

  test('provedZero counts only the Hard-or-above levels', () => {
    const below = cell(aggregateLandscape(reps('6x10-normal', () => ({ details: v3Details(mixedPuzzles) })), only(['6x10-normal'])), '6x10-normal');
    assert.equal(below.v3.provedZero, 0);
    assert.equal(below.v3.G['2'], 20, 'the other measures are still counted');
    const none = cell(aggregateLandscape(reps('6x10-hard', () => ({ details: v3Details([mixedPuzzles[0]]) })), only(['6x10-hard'])), '6x10-hard');
    assert.equal(none.v3.provedZero, 0);
  });

  test('old and new records aggregate their clue counts together', () => {
    const id = '6x10-hard';
    const agg = aggregateLandscape(reps(id, (i) => ({
      details: v3Details(i < 10 ? [{ G: 3 }, { G: 5 }] : [mixedPuzzles[0], { ...mixedPuzzles[1], clues: 5 }]),
    })), only([id]));
    const c = cell(agg, id);
    assert.deepEqual(c.clues.accepted, { 3: 20, 5: 20 });
    assert.equal(c.v3.accepted, 20, 'only the records with v3 metrics enter the v3 block');
    assert.equal(c.v3.censored.count, 10);
  });

  test('the unrateable samples of the runs are summed', () => {
    const id = '6x10-hard';
    const agg = aggregateLandscape(reps(id, (i) => ({ details: v3Details([], i < 5 ? { sampleUnrateable: 2 } : {}) })), only([id]));
    assert.equal(cell(agg, id).sampledUnrateable, 10);
  });

  test('the Markdown shows the v3 table, and "-" for a cell without v3 data', () => {
    const meta = { date: 'D', sourceCommit: 'c', sourceDigest: 'd', seeds: 20, workers: 1 };
    const withV3 = '6x10-hard';
    const without = '6x10-normal';
    const records = [...reps(withV3, () => ({ details: v3Details(mixedPuzzles) })), ...reps(without)];
    const md = renderLandscapeMarkdown(aggregateLandscape(records, only([withV3, without])), meta);
    const header = '| Cell | Accepted | Score median | Score p95 | G median | info median | Cmax max | Tier 0/1/2/3 | Solutions unique/few/many/unknown | Census estimates | Hard+ with Gproved = 0 |';
    const table = md.slice(md.indexOf('## v3 measures per cell'), md.indexOf('## Reference rows'));
    assert.ok(table.includes(header));
    assert.ok(table.includes(`| ${withV3} | 40 | 65 | 70 | 1.5 | 2 | 9 | 0/0/20/20 | 20/20/0/0 | 20/40 | 20 |`), table);
    assert.ok(table.includes(`| ${without} | - | - | - | - | - | - | - | - | - | - |`), table);
    assert.ok(md.indexOf('## Cells') < md.indexOf('## v3 measures per cell'));
  });

  test('cells without runs stay listed as incomplete and nothing is skipped silently', () => {
    const agg = aggregateLandscape(reps('6x10-hard'), matrix);
    assert.equal(agg.coverage.cellsTotal, matrix.cases.length);
    assert.equal(agg.coverage.cellsComplete, 1);
    assert.equal(agg.coverage.incompleteCells.length, matrix.cases.length - 1);
    assert.equal(agg.outcome, 'incomplete');
    const subset = aggregateLandscape(reps('6x10-hard'), only(['6x10-hard']));
    assert.equal(subset.coverage.cellsSelected, 1);
    assert.equal(subset.coverage.notSelectedCells.length, matrix.cases.length - 1);
    assert.equal(subset.coverage.cellsTotal, matrix.cases.length);
    assert.equal(subset.outcome, 'incomplete');
  });
});

describe('command line, checkpoint and resume', () => {
  const exactSmoke = ['--matrix', 'tools\\bench\\matrices\\smoke.json', '--workers', '4', '--fresh-process', '--output', 'docs\\calibration\\node-smoke'];
  const exactLandscape = ['--profile', 'landscape', '--workers', '4', '--seeds', '20', '--fresh-process', '--output', 'docs\\calibration\\landscape'];

  test('the documented commands parse', () => {
    const smoke = parseArgs(exactSmoke);
    assert.ok(smoke.ok === true);
    assert.equal(smoke.args.workers, 4);
    assert.equal(smoke.args.freshProcess, true);
    const landscape = parseArgs(exactLandscape);
    assert.ok(landscape.ok === true);
    assert.equal(landscape.args.profile, 'landscape');
    assert.equal(landscape.args.seeds, 20);
    assert.equal(reportBase('docs/calibration/landscape', true).replace(/\d{4}-\d{2}-\d{2}$/, 'DATE'), 'docs/calibration/landscape-DATE');
    assert.equal(reportBase('docs/calibration/node-smoke', false), 'docs/calibration/node-smoke');
  });

  test('conflicting or invalid flags are rejected', () => {
    for (const argv of [[], ['--matrix', 'a', '--profile', 'landscape', '--output', 'o'], ['--matrix', 'a'], ['--profile', 'bq0', '--output', 'o'],
      ['--matrix', 'a', '--output', 'o', '--workers', '5'], ['--matrix', 'a', '--output', 'o', '--lifecycle', 'warm', '--fresh-process'],
      ['--profile', 'landscape', '--output', 'o', '--lifecycle', 'warm'], ['--matrix', 'a', '--output', 'o', '--bogus']]) {
      assert.equal(parseArgs(argv).ok, false, argv.join(' '));
    }
  });

  test('a checkpoint resumes only for an identical code digest, versions and matrix', () => {
    rmSync(ARTIFACTS, { recursive: true, force: true });
    mkdirSync(ARTIFACTS, { recursive: true });
    const file = `${ARTIFACTS}resume.jsonl`;
    const header = { format: 'pentomino-bench-checkpoint', version: 1, kind: 'node', sourceDigest: 'aaa', versions: { algo: 'gen-v2' }, matrixDigest: 'mmm', workers: 4 };
    const row = JSON.stringify({ kind: 'run', run: landscapeRun('6x10-hard', 0) });
    writeFileSync(file, `${JSON.stringify(header)}\n${row}\n${row.slice(0, 40)}`);
    const same = readCheckpoint(file, header);
    assert.ok(same.ok);
    assert.equal(same.ok && same.runs.length, 1);
    assert.equal(same.ok && same.skipped, 1);
    for (const changed of [{ sourceDigest: 'bbb' }, { matrixDigest: 'nnn' }, { versions: { algo: 'gen-v3' } }, { workers: 2 }]) {
      const result = readCheckpoint(file, { ...header, ...changed });
      assert.equal(result.ok, false, JSON.stringify(changed));
    }
    writeFileSync(file, 'not json\n');
    assert.equal(readCheckpoint(file, header).ok, false);
  });
});

describe('Node runner end to end', () => {
  const lines = (/** @type {string} */ path) => readFileSync(path, 'utf8');

  test('the smoke matrix writes valid reports, matches the recorded recipe, and resumes only a matching checkpoint', async () => {
    rmSync(ARTIFACTS, { recursive: true, force: true });
    mkdirSync(ARTIFACTS, { recursive: true });
    const out = `${ARTIFACTS}node-smoke`;
    const argv = ['--matrix', fileURLToPath(new URL('../tools/bench/matrices/smoke.json', import.meta.url)), '--workers', '4', '--fresh-process', '--output', out];
    /** @type {string[]} */
    const log = [];
    assert.equal(await run(argv, { stderr: (t) => log.push(t) }), 0);
    const json = JSON.parse(lines(`${out}.json`));
    assert.equal(json.format, 'pentomino-bench-report');
    assert.equal(json.runs.length, 5);
    assert.equal(json.complete, true);
    for (const text of [lines(`${out}.json`), lines(`${out}.md`)]) {
      assert.ok(text.endsWith('\r\n'));
      assert.ok(!/[^\r]\n/.test(text));
    }
    const probes = json.runs.filter((/** @type {any} */ r) => r.probeKind === 'cancel');
    assert.equal(probes.length, 2);
    for (const p of probes) {
      assert.equal(p.partialReason, 'cancelled');
      assert.ok(p.acceptedCount >= 1 && p.acceptedCount < 10);
      assert.equal(typeof p.cancelLatencyMs, 'number');
      assert.equal(p.measurementValid, true);
    }
    const ordinary = json.runs.filter((/** @type {any} */ r) => r.probeKind === 'generation');
    assert.ok(ordinary.every((/** @type {any} */ r) => r.acceptedCount === 10 && r.errors.length === 0 && r.mainTaskMethod === 'not-applicable'));
    assert.ok(ordinary.every((/** @type {any} */ r) => r.maxMainTaskMs === null && r.peakProcessBytes > 0 && r.certificates.notChecked === 0));
    const first = ordinary[0];
    assert.equal(first.seed, recipe.seedText);
    const { layoutKeys, clueKeys, scores } = recipe.expected;
    assert.equal(first.details.resultDigest, sha256Hex(canonicalJson({ layoutKeys, clueKeys, scores })));
    assert.deepEqual(json.cells.map((/** @type {any} */ c) => c.verdict), ['node-screening-only', 'node-screening-only']);

    log.length = 0;
    assert.equal(await run(argv, { stderr: (t) => log.push(t) }), 0);
    assert.match(log.join(''), /resuming 5 recorded rows/);
    assert.ok(!log.join('').includes('generation hard-10x6'));

    log.length = 0;
    assert.equal(await run([...argv, '--cases', 'heart'], { stderr: (t) => log.push(t) }), 1);
    assert.match(log.join(''), /different matrixDigest/);
  });

  test('a row process that is stopped by its watchdog still yields a failure row', async () => {
    const matrix = loadMatrix(/** @type {any} */ ({ matrix: fileURLToPath(new URL('../tools/bench/matrices/smoke.json', import.meta.url)), profile: null, cases: null, seeds: 20, maxActive: 676 }));
    const host = createNodeHost({ workers: 1, lifecycle: 'cold', freshProcess: true, source: { commit: 'c', digest: 'd', versions: {} } });
    const row = await runInChild({
      spec: { caseId: matrix.cases[0].id, rep: 0, seed: 'fixture-set-0', probeKind: 'generation' },
      caseDef: matrix.cases[0], host, source: { commit: 'c', digest: 'd', versions: {} }, profileSampling: false, limitMs: 1,
    });
    assert.equal(row.errors[0].code, 'child-timeout');
    assert.equal(row.measurementValid, false);
    assert.equal(row.acceptedCount, 0);
    assert.match(row.partialReason ?? '', /child-timeout/);
  });

  test('a proven-exhausted shortfall is recorded with its arrangement count and meets criterion 2; a completion pass is recorded too', async () => {
    const source = { commit: 'c', digest: 'd', versions: {} };
    const host = createNodeHost({ workers: 2, lifecycle: 'cold', freshProcess: false, source });
    const caseDef = {
      id: 'd7x5-easy', boardRows: Array(5).fill('#'.repeat(7)), rotation: 0, levelId: 'easy', maxActive: 676, quantity: 10,
      uniqueness: /** @type {const} */ ('any'), seedPrefix: 'owner', repetitions: 1,
    };
    const spec = { caseId: caseDef.id, rep: 0, seed: 'demo', probeKind: /** @type {const} */ ('generation') };
    try {
      const row = await runCase(spec, caseDef, host);
      assert.deepEqual([row.acceptedCount, row.partialReason, row.layoutsExhausted, row.layoutTotal, row.layoutStatus, row.layoutMethod],
        [2, 'layouts-not-found', true, 2, 'exhausted', 'cell-backtracking-v1']);
      assert.ok(typeof row.layoutEnumPlacements === 'number' && row.layoutEnumPlacements > 0 && typeof row.layoutEnumMs === 'number');
      assert.deepEqual(validateRunRecord(row), []);
      assert.equal(returnedEveryArrangement(row), true);
      assert.equal(evaluateCell([row]).runs.exhausted, 1);
      const filled = await runCase({ ...spec, seed: 'bq0/d6x10-very-easy/5' },
        { ...caseDef, id: 'd6x10-very-easy', boardRows: Array(6).fill('#'.repeat(10)), levelId: 'very-easy' }, host);
      assert.deepEqual([filled.acceptedCount, filled.layoutsExhausted, filled.layoutTotal, filled.layoutStatus], [8, true, 8, 'exhausted']);
      assert.deepEqual([filled.layoutPassTried, filled.layoutPassAdded, filled.layoutUnusable], [1, 1, 0], 'the completion pass found the eighth');
      assert.ok(typeof filled.layoutPassMs === 'number');
      assert.deepEqual(validateRunRecord(filled), []);
      assert.equal(returnedEveryArrangement(filled), true);
      assert.equal(row.layoutPassTried, null, 'no unused arrangement, no pass');
    } finally {
      releaseHost(host);
    }
  });

  test('the landscape profile samples distinct clue counts of the validated witness after the timed interval', async () => {
    const out = `${ARTIFACTS}landscape`;
    const argv = ['--profile', 'landscape', '--seeds', '1', '--cases', '^6x10-very-easy$', '--workers', '2', '--output', out];
    /** @type {string[]} */
    const log = [];
    assert.equal(await run(argv, { stderr: (t) => log.push(t) }), 0);
    const base = reportBase(out, true);
    assert.ok(existsSync(`${base}.json`) && existsSync(`${base}.md`));
    const json = JSON.parse(lines(`${base}.json`));
    assert.equal(json.runs.length, 1);
    const [r] = json.runs;
    assert.ok(r.acceptedCount >= 1 && r.acceptedCount <= 10);
    assert.equal(r.lifecycle, 'cold');
    assert.equal(r.samples.length > 0, true);
    const counts = [...new Set(r.samples.map((/** @type {any} */ s) => s.clues))];
    assert.deepEqual(counts, sampleCounts(r.details.K, r.details.initialG));
    assert.equal(r.samples.length, counts.length * 2);
    const sampleKeys = ['A', 'K', 'clues', 'U', 'score', 'inBand', 'saturated', 'censored', 'deductionTier', 'G', 'Gproved',
      'censusComplete', 'branchTrials', 'rowTrials', 'ratingMs', 'certificateStatus', 'sample'];
    for (const s of r.samples) {
      assert.deepEqual(Object.keys(s).sort(), [...sampleKeys].sort());
      assert.equal(s.U, s.K - s.clues);
      assert.equal(typeof s.censored, 'boolean');
      assert.ok(Number.isInteger(s.deductionTier) && s.deductionTier >= 0 && s.deductionTier <= 3);
      assert.ok(Number.isInteger(s.G) && s.Gproved <= s.G);
    }
    assert.equal(r.details.sampleUnrateable, 0, 'every sample of this run is rateable');
    assert.equal(r.ratingCensoredCount, r.details.puzzles.filter((/** @type {any} */ p) => p.censored).length);
    for (const p of r.details.puzzles) {
      assert.deepEqual(Object.keys(p), ['clues', 'U', 'score', 'level', 'saturated', 'censored', 'metrics']);
      assert.equal(p.U, r.details.K - p.clues);
      assert.deepEqual(Object.keys(p.metrics), ['deductionTier', 'G', 'Gproved', 'info', 'Cmax', 'Dmax', 'solutions',
        'censusComplete', 'censusUndecided', 'F', 'E', 'nodes', 'work']);
    }
    assert.equal(json.calibration.cells.length, 1);
    assert.equal(json.calibration.cells[0].criterion1.status, 'incomplete');
    assert.equal(json.calibration.cells[0].v3.accepted, r.acceptedCount);
    assert.equal(json.calibration.cells[0].v3.provedZero, 0);
    assert.match(lines(`${base}.md`), /Production-engine calibration landscape/);
    assert.match(lines(`${base}.md`), /## v3 measures per cell/);
    rmSync(ARTIFACTS, { recursive: true, force: true });
  });
});
