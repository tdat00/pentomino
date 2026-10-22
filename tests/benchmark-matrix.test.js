// @ts-check
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

import { PoolAbortError, PoolError, systemClock, WorkerTaskError } from '../core/browser/worker-pool.js';
import { boardFromRows } from '../core/engine/board.js';
import { puzzleId } from '../core/engine/keys.js';
import { createNotApplicable } from '../tools/bench/responsiveness.js';
import {
  checkMatrix, MatrixError, modelSize, planRuns, probeSeedFor, runCase, scaledClock, seedFor, validateAccepted, validateMatrix,
} from '../tools/bench/runner.js';
import { replayRecipe } from '../tools/record-fixtures.mjs';

const smoke = JSON.parse(readFileSync(new URL('../tools/bench/matrices/smoke.json', import.meta.url), 'utf8'));
const recipe = JSON.parse(readFileSync(new URL('./fixtures/generation-case.json', import.meta.url), 'utf8'));
const rect = (/** @type {number} */ w, /** @type {number} */ h) => Array.from({ length: h }, () => '#'.repeat(w));

/** @param {Record<string, any>} [over] */
const benchCase = (over = {}) => ({
  id: 'c', boardRows: rect(10, 6), rotation: 0, levelId: 'hard', maxActive: 676, quantity: 10, uniqueness: 'any',
  seedPrefix: 'p', repetitions: 2, ...over,
});
const matrixOf = (/** @type {Record<string, any>} */ over) => ({ version: 1, profile: 'smoke', cases: [benchCase(over)] });
const issuesOf = (/** @type {unknown} */ m) => checkMatrix(m).issues.map((i) => `${i.path}: ${i.message}`);

describe('matrix validation', () => {
  test('the committed smoke matrix is valid and uses the recorded recipe seed', () => {
    const matrix = validateMatrix(smoke);
    assert.equal(matrix.profile, 'smoke');
    assert.equal(matrix.cases[0].seeds?.[0], recipe.seedText);
    assert.equal(matrix.cases[0].levelId, recipe.levelId);
    assert.deepEqual(matrix.cases[0].boardRows, recipe.boardRows);
    assert.ok(matrix.cases.some((c) => c.rotation === 45), 'a heart case at 45 degrees');
  });

  test('seed text is the prefix, the case id and the repetition unless explicit seeds are given', () => {
    const c = benchCase();
    assert.equal(seedFor(/** @type {any} */ (c), 1), 'p/c/1');
    const explicit = benchCase({ seeds: ['alpha', 'beta'] });
    assert.equal(seedFor(explicit, 1), 'beta');
    assert.equal(probeSeedFor(explicit, 'cancel'), 'alpha');
    assert.equal(probeSeedFor(c, 'cancel'), 'p/c/cancel');
  });

  test('explicit seeds must match the repetitions and be normalized', () => {
    assert.deepEqual(issuesOf(matrixOf({ seeds: ['one'] })).map((m) => m.split(':')[0]), ['cases[0].seeds']);
    assert.ok(issuesOf(matrixOf({ seeds: [' padded', 'x'] })).some((m) => /not normalized/.test(m)));
    assert.ok(issuesOf(matrixOf({ seedPrefix: 'x'.repeat(80) })).some((m) => /seed/.test(m)));
    assert.deepEqual(issuesOf(matrixOf({ seeds: ['one', 'two'] })), []);
  });

  test('area, side, connectivity, level offering, quantity and uniqueness are checked before any run', () => {
    assert.ok(issuesOf(matrixOf({ boardRows: rect(5, 5) })).some((m) => /at least 30/.test(m)));
    assert.ok(issuesOf(matrixOf({ boardRows: rect(33, 1) })).some((m) => /maximum of 32/.test(m)));
    assert.ok(issuesOf(matrixOf({ boardRows: ['####.####', '####.####', '####.####', '####.####'] })).length > 0);
    assert.ok(issuesOf(matrixOf({ levelId: 'very-easy', boardRows: rect(10, 10) })).some((m) => /not offered for a board of 100/.test(m)));
    assert.ok(issuesOf(matrixOf({ levelId: 'hell-3', boardRows: rect(18, 20) })).some((m) => /not offered/.test(m)));
    assert.ok(issuesOf(matrixOf({ levelId: 'nope' })).some((m) => /levelId/.test(m)));
    assert.ok(issuesOf(matrixOf({ quantity: 5 })).some((m) => /quantity/.test(m)));
    assert.ok(issuesOf(matrixOf({ uniqueness: 'require' })).some((m) => /uniqueness/.test(m)));
    assert.ok(issuesOf(matrixOf({ maxActive: 50 })).some((m) => /allows at most 50/.test(m)));
    assert.ok(issuesOf(matrixOf({ rotation: 30 })).some((m) => /rotation/.test(m)));
    assert.ok(issuesOf({ version: 2, profile: 'x', cases: [] }).length >= 3);
    assert.ok(issuesOf({ version: 1, profile: 'smoke', cases: [benchCase(), benchCase()] }).some((m) => /duplicate/.test(m)));
    assert.throws(() => validateMatrix(matrixOf({ quantity: 9 })), MatrixError);
  });

  test('rows are planned per case with one cancel probe and an optional watchdog row', () => {
    const matrix = validateMatrix({ version: 1, profile: 'smoke', cases: [benchCase({ id: 'a' }), benchCase({ id: 'b', repetitions: 1 })] });
    const specs = planRuns(matrix, { watchdogScale: 500 });
    assert.deepEqual(specs.map((s) => `${s.probeKind}:${s.caseId}:${s.rep}`), [
      'generation:a:0', 'generation:a:1', 'cancel:a:0', 'generation:b:0', 'cancel:b:0', 'scaled-watchdog:a:0',
    ]);
    assert.equal(specs.at(-1)?.watchdogScale, 500);
    assert.equal(planRuns(matrix, { cancelProbes: false }).filter((s) => s.probeKind === 'cancel').length, 0);
  });
});

describe('accepted puzzle validation', () => {
  const replay = replayRecipe(recipe);
  const { set } = replay;
  const puzzles = replay.fold.accepted.map((c) => ({
    id: puzzleId(set.board, set.pieces, c.clues), clues: c.clues, solution: c.layout, rating: c.rating, certificate: null,
  }));

  test('ten distinct in-band puzzles pass', () => {
    assert.equal(puzzles.length, 10);
    const result = validateAccepted(set, puzzles, 'hard');
    assert.deepEqual(result.problems, []);
    assert.equal(result.valid.length, 10);
  });

  test('a clue-only variant of a layout is never counted as another puzzle', () => {
    const [first] = puzzles;
    const variant = { ...first, id: 'variant', clues: first.solution.slice(0, 2) };
    const result = validateAccepted(set, [first, variant], 'hard');
    assert.equal(result.valid.length, 1);
    assert.match(result.problems.join(' '), /clue-only variant/);
  });

  test('an out-of-band, repeated or invalid puzzle is rejected', () => {
    assert.equal(validateAccepted(set, puzzles.slice(0, 2), 'expert').valid.length, 0);
    assert.match(validateAccepted(set, [puzzles[0], puzzles[0]], 'hard').problems.join(' '), /repeats/);
    const broken = { ...puzzles[0], solution: puzzles[0].solution.slice(1) };
    assert.match(validateAccepted(set, [broken], 'hard').problems.join(' '), /valid complete layout/);
    const foreign = { ...puzzles[0], clues: [{ ...puzzles[0].clues[0], x: 99 }] };
    assert.match(validateAccepted(set, [foreign], 'hard').problems.join(' '), /proper subset/);
  });

  test('model size counts rows and nonzeros of the empty and clued models', () => {
    const size = modelSize(set.board, set.pieces, puzzles.map((p) => p.clues));
    assert.ok(size !== null && size.rows > 0 && size.nodes > size.rows);
  });
});

describe('clocks', () => {
  test('a scaled clock runs time faster and shortens every timer by the same factor', () => {
    let t = 1000;
    /** @type {number[]} */
    const delays = [];
    const base = {
      now: () => t,
      setTimeout: (/** @type {() => void} */ _fn, /** @type {number} */ ms) => {
        delays.push(ms);
        return 1;
      },
      clearTimeout: () => {},
    };
    const fast = scaledClock(base, 100);
    t = 1010;
    assert.equal(fast.now(), 2000);
    fast.setTimeout(() => {}, 115000);
    assert.deepEqual(delays, [1150]);
  });
});

/**
 * A pool whose every task fails the same way, to exercise the failure rows.
 * @param {unknown} failure
 */
function failingPool(failure) {
  return {
    size: 2,
    run: () => Promise.reject(failure),
    runIdle: () => Promise.reject(failure),
    cancelAll() {},
    recycle() {},
    beginRequest() {},
    endRequest() {},
    memory: () => ({ workerBytes: 0, mainBytes: 0, totalBytes: 0, peakBytes: 123, mainBudgetBytes: 0 }),
    setMainBytes() {},
    close() {},
  };
}

/** @param {unknown} failure */
function failingHost(failure) {
  return /** @type {any} */ ({
    kind: 'node', platform: 'test', browserOrNode: 'node test', workerCount: 2, lifecycle: 'cold', sourceCommit: 'c',
    sourceDigest: 'd', versions: {}, clock: systemClock, createPool: () => failingPool(failure),
    responsiveness: createNotApplicable(), clickCancel: (/** @type {() => void} */ h) => setTimeout(h, 0),
  });
}

describe('failure rows', () => {
  const caseDef = /** @type {any} */ (benchCase({ id: 'f' }));
  const spec = { caseId: 'f', rep: 0, seed: 'p/f/0', probeKind: /** @type {const} */ ('generation') };

  test('a crashed worker is recorded with its code and the run is still a row', async () => {
    const row = await runCase(spec, caseDef, failingHost(new PoolError('worker-crashed', 'boom')));
    assert.equal(row.acceptedCount, 0);
    assert.equal(row.partialReason, 'error:worker-crashed');
    assert.equal(row.errors[0].code, 'worker-crashed');
    assert.equal(row.firstReadyMs, null);
    assert.equal(row.peakAccountedBytes, 123);
    assert.equal(row.mainTaskMethod, 'not-applicable');
    assert.equal(row.maxMainTaskMs, null);
  });

  test('model-too-large keeps its own code so the criterion can fail on it', async () => {
    const row = await runCase(spec, caseDef, failingHost(new WorkerTaskError('model-too-large', 'too big')));
    assert.equal(row.errors[0].code, 'model-too-large');
    assert.equal(row.partialReason, 'error:model-too-large');
  });

  test('a watchdog deadline is a time-limit row, not a crash', async () => {
    const row = await runCase(spec, caseDef, failingHost(new PoolAbortError('deadline')));
    assert.equal(row.partialReason, 'set:time-limit');
    assert.equal(row.errors.length, 0);
    assert.equal(row.acceptedCount, 0);
  });

  test('a cancel probe that never reaches an accepted puzzle is invalid, not a pass', async () => {
    const row = await runCase({ ...spec, probeKind: 'cancel' }, caseDef, failingHost(new PoolAbortError('deadline')));
    assert.equal(row.cancelLatencyMs, null);
    assert.equal(row.measurementValid, false);
  });

  test('a board the matrix accepted still yields a row when the pool cannot start', async () => {
    const host = failingHost(null);
    host.createPool = () => {
      throw new PoolError('worker-unavailable', 'no workers');
    };
    const row = await runCase(spec, caseDef, host);
    assert.equal(row.errors[0].phase, 'host');
    assert.equal(row.measurementValid, false);
    assert.ok(boardFromRows(caseDef.boardRows));
  });
});

describe('timed interval', () => {
  test('a row ends the previous row\'s task before its monitor starts', async () => {
    const order = /** @type {string[]} */ ([]);
    const host = failingHost(new PoolAbortError('deadline'));
    host.uiIdle = async () => {
      order.push('idle');
    };
    host.responsiveness = { ...createNotApplicable(), start: () => order.push('start') };
    const caseDef = /** @type {any} */ (benchCase({ id: 'f' }));
    await runCase({ caseId: 'f', rep: 0, seed: 'p/f/0', probeKind: /** @type {const} */ ('generation') }, caseDef, host);
    assert.deepEqual(order.slice(0, 2), ['idle', 'start']);
  });
});
