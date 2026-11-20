// @ts-check
import assert from 'node:assert/strict';
import { readdirSync, existsSync } from 'node:fs';
import { describe, test } from 'node:test';

import { createLongTaskMonitor, createHeartbeatMonitor, createResponsiveness } from '../tools/bench/responsiveness.js';
import {
  buildReport, computeSourceDigest, CRITERIA, evaluateCell, median, newRunRecord, percentile, renderMarkdown, reportJson,
  SOURCE_FILES, summarize, toCrlf, validateRunRecord,
} from '../tools/bench/report.js';

/** @param {Partial<import('../tools/bench/report.js').RunRecord>} [over] */
const run = (over = {}) => newRunRecord({
  caseId: 'cell', seed: 's', sourceCommit: 'c', sourceDigest: 'd', versions: {}, platform: 'p', browserOrNode: 'chrome 130',
  workerCount: 4, startedAt: 't', firstReadyMs: 100, tenthReadyMs: 1000, responseMs: 1100, acceptedCount: 10,
  peakAccountedBytes: 1e6, peakProcessBytes: 1e8, certificates: { unique: 3, multiple: 7, notProved: 0, notChecked: 0 },
  mainTaskMethod: 'longtask-api', maxMainTaskMs: 30, longTasksOver50: 0, ...over,
});
/** @param {Partial<import('../tools/bench/report.js').RunRecord>} [over] */
const cancelRun = (over = {}) => run({ probeKind: 'cancel', acceptedCount: 1, tenthReadyMs: null, cancelLatencyMs: 50, partialReason: 'cancelled', ...over });
const many = (/** @type {number} */ n, /** @type {(i: number) => Partial<import('../tools/bench/report.js').RunRecord>} */ f) => Array.from({ length: n }, (_, i) => run({ rep: i, ...f(i) }));
const checkOf = (/** @type {ReturnType<typeof evaluateCell>} */ cell, /** @type {string} */ id) => {
  const found = cell.checks.find((c) => c.id === id);
  assert.ok(found, id);
  return found;
};

describe('statistics', () => {
  test('median is the middle value or the mean of the two middle values', () => {
    assert.equal(median([5, 1, 3]), 3);
    assert.equal(median([4, 1, 3, 2]), 2.5);
    assert.equal(median([7]), 7);
  });

  test('p95 is the nearest rank ceil(0.95 n)', () => {
    const values = Array.from({ length: 20 }, (_, i) => i + 1);
    assert.equal(percentile(values, 0.95), 19);
    assert.equal(percentile([...values, 21], 0.95), 20);
    assert.equal(percentile([9, 1], 0.95), 9);
    assert.equal(percentile([5], 0.95), 5);
  });

  test('empty samples give null, never zero', () => {
    assert.equal(median([]), null);
    assert.equal(percentile([], 0.95), null);
    assert.deepEqual(summarize([]), { n: 0, min: null, median: null, p95: null, max: null });
  });
});

describe('qualification checks', () => {
  test('complete-ten rate needs 90% of all ordinary runs and at-least-one needs 99%', () => {
    const nine = evaluateCell([...many(9, () => ({})), run({ rep: 9, acceptedCount: 4, tenthReadyMs: null })]);
    assert.equal(checkOf(nine, 'complete-ten-rate').status, 'pass');
    assert.equal(checkOf(nine, 'at-least-one-rate').status, 'pass');
    const eight = evaluateCell([...many(8, () => ({})), ...many(2, () => ({ acceptedCount: 4, tenthReadyMs: null }))]);
    assert.equal(checkOf(eight, 'complete-ten-rate').status, 'fail');
    // 19 of 20 first puzzles is 95%: below the 99% line, which only 20 of 20 meets
    const noFirst = evaluateCell([...many(19, () => ({})), run({ rep: 19, acceptedCount: 0, tenthReadyMs: null, firstReadyMs: null })]);
    assert.equal(checkOf(noFirst, 'at-least-one-rate').status, 'fail');
    const allFirst = evaluateCell(many(20, () => ({})));
    assert.equal(checkOf(allFirst, 'at-least-one-rate').status, 'pass');
    assert.equal(allFirst.rates.atLeastOne, 1);
  });

  test('criterion 2 (owner decision 2026-10-23): ten puzzles, or every arrangement that an exhaustive count proved; nothing else', () => {
    const proven = (/** @type {number} */ n, over = {}) => ({
      acceptedCount: n, tenthReadyMs: null, partialReason: 'layouts-not-found', layoutsExhausted: true, layoutTotal: n,
      layoutMethod: 'cell-backtracking-v1', layoutStatus: /** @type {const} */ ('exhausted'), layoutEnumPlacements: 40, layoutEnumMs: 12, ...over,
    });
    const rows = (/** @type {number} */ bad, /** @type {Partial<import('../tools/bench/report.js').RunRecord>} */ shortfall) => [
      ...many(20 - bad, () => ({})), ...Array.from({ length: bad }, (_, i) => run({ rep: 20 - bad + i, ...shortfall })),
    ];
    const pass = evaluateCell(rows(5, proven(6)));
    assert.equal(checkOf(pass, 'complete-ten-rate').status, 'pass');
    assert.equal(pass.rates.completeTen, 0.75, 'the strict ten rate is still reported');
    assert.equal(pass.rates.tenOrEveryArrangement, 1);
    assert.deepEqual([pass.runs.complete, pass.runs.exhausted], [15, 5]);
    assert.equal(pass.t10.n, 15, 'T10 stays conditional on runs that reached ten');
    assert.equal(pass.arrangements.exhausted, 5);
    assert.equal(pass.arrangements.method, 'cell-backtracking-v1');

    const failing = [
      proven(6, { layoutsExhausted: false, layoutTotal: null, layoutStatus: 'more' }),
      proven(6, { layoutsExhausted: false, layoutTotal: null, layoutStatus: 'unproven' }),
      proven(6, { layoutTotal: 7 }),
      proven(6, { partialReason: 'difficulty-not-found' }),
      proven(6, { errors: [{ phase: 'validation', code: 'invalid-puzzle', message: 'x' }] }),
      proven(0, { layoutTotal: 0 }),
      { acceptedCount: 6, tenthReadyMs: null, partialReason: 'layouts-not-found' },
    ];
    for (const shortfall of failing) {
      const cell = evaluateCell(rows(5, shortfall));
      assert.equal(checkOf(cell, 'complete-ten-rate').status, 'fail', JSON.stringify(shortfall));
      assert.equal(cell.runs.exhausted, 0);
    }
    const md = renderMarkdown(buildReport({ kind: 'node', profile: 'P', sourceCommit: 'c', sourceDigest: 'd', versions: {}, platform: 'p',
      browserOrNode: 'node v24', workerCount: 4, lifecycle: 'cold', matrixDigest: 'm', startedAt: 's', finishedAt: 'f', expectedRuns: 20 },
    rows(5, proven(6))));
    assert.match(md, /Ten or proven-all/);
    assert.match(md, /5 proven-all/);
    assert.match(md, /owner decision 2026-10-23/);
    assert.match(md, /Arrangement counts after layouts-not-found/);
  });

  test('the completion pass (fix round 3) is summarised per cell and old records simply lack it', () => {
    const filled = (/** @type {number} */ i) => ({
      layoutStatus: /** @type {const} */ ('more'), layoutMethod: 'cell-backtracking-v1', layoutEnumPlacements: 10, layoutEnumMs: 5,
      layoutPassTried: 2, layoutPassAdded: i < 3 ? 2 : 0, layoutUnusable: i < 3 ? 0 : 2, layoutPassMs: 20 + i,
    });
    const cell = evaluateCell(many(20, (i) => (i < 5 ? filled(i) : {})));
    assert.deepEqual(
      { ...cell.arrangements.pass, ms: undefined },
      { runs: 5, added: 6, filledToTen: 3, unusable: 4, ms: undefined },
    );
    assert.equal(cell.arrangements.pass.ms.max, 24);
    assert.deepEqual(validateRunRecord(run(filled(0))), []);
    assert.ok(validateRunRecord({ ...run(), layoutPassAdded: 'x' }).length > 0);
    const md = renderMarkdown(buildReport({ kind: 'node', profile: 'P', sourceCommit: 'c', sourceDigest: 'd', versions: {}, platform: 'p',
      browserOrNode: 'node v24', workerCount: 4, lifecycle: 'cold', matrixDigest: 'm', startedAt: 's', finishedAt: 'f', expectedRuns: 20 },
    many(20, (i) => (i < 5 ? filled(i) : {})).map((r, i) => ({ ...r, rep: i }))));
    assert.match(md, /Completion pass \(fix round 3/);
    assert.equal(evaluateCell(many(3, () => ({}))).arrangements.pass.runs, 0);
  });

  test('records written before the arrangement fields still validate and count as unproven', () => {
    const { layoutsExhausted, layoutTotal, layoutMethod, layoutStatus, layoutEnumPlacements, layoutEnumMs, ...old } = run({ acceptedCount: 4 });
    assert.deepEqual(validateRunRecord(old), []);
    assert.ok(validateRunRecord({ ...old, layoutsExhausted: 'yes' }).length > 0);
    const cell = evaluateCell([/** @type {any} */ (old)]);
    assert.equal(cell.runs.exhausted, 0);
    assert.equal(cell.arrangements.enumerated, 0);
  });

  test('T10 percentiles are conditional on completed runs and labelled so', () => {
    const cell = evaluateCell([...many(18, (i) => ({ tenthReadyMs: 1000 + i })), ...many(2, () => ({ acceptedCount: 3, tenthReadyMs: null }))]);
    assert.equal(cell.t10.conditional, true);
    assert.equal(cell.t10.n, 18);
    assert.equal(cell.runs.ordinary, 20);
    assert.equal(cell.rates.completeTen, 0.9);
  });

  test('T10 limits are inclusive: 60,000 ms median and 115,000 ms p95', () => {
    const edge = evaluateCell(many(20, (i) => ({ tenthReadyMs: i < 19 ? 60000 : 115000 })));
    assert.equal(checkOf(edge, 't10-median').status, 'pass');
    assert.equal(checkOf(edge, 't10-p95').status, 'pass');
    const slow = evaluateCell(many(20, () => ({ tenthReadyMs: 60001 })));
    assert.equal(checkOf(slow, 't10-median').status, 'fail');
    const tail = evaluateCell(many(20, (i) => ({ tenthReadyMs: i < 18 ? 1000 : 115001 })));
    assert.equal(checkOf(tail, 't10-p95').status, 'fail');
  });

  test('an empty completion sample has null percentiles and unmeasured T10 checks', () => {
    const cell = evaluateCell(many(3, () => ({ acceptedCount: 2, tenthReadyMs: null })));
    assert.equal(cell.t10.median, null);
    assert.equal(cell.t10.p95, null);
    assert.equal(checkOf(cell, 't10-median').status, 'not-measured');
    assert.equal(checkOf(cell, 'complete-ten-rate').status, 'fail');
  });

  test('every response, including failed runs, must be within 120 s', () => {
    assert.equal(checkOf(evaluateCell(many(2, (i) => ({ responseMs: 120000 - i }))), 'response-time').status, 'pass');
    const late = evaluateCell([run(), run({ rep: 1, acceptedCount: 0, tenthReadyMs: null, responseMs: 120001, partialReason: 'set:time-limit' })]);
    assert.equal(checkOf(late, 'response-time').status, 'fail');
  });

  test('missing browser measurements are not-measured, never a pass or zero', () => {
    const missing = evaluateCell(many(20, () => ({ maxMainTaskMs: null, longTasksOver50: null, measurementValid: false })));
    assert.equal(checkOf(missing, 'main-thread-task').status, 'not-measured');
    assert.equal(missing.verdict, 'incomplete-evidence');
    const noMemory = evaluateCell(many(20, () => ({ peakProcessBytes: null })));
    assert.equal(checkOf(noMemory, 'peak-process-memory').status, 'not-measured');
    const slowTask = evaluateCell(many(20, (i) => ({ maxMainTaskMs: i === 3 ? 51 : 10 })));
    assert.equal(checkOf(slowTask, 'main-thread-task').status, 'fail');
    const exact = evaluateCell(many(20, () => ({ maxMainTaskMs: 50 })));
    assert.equal(checkOf(exact, 'main-thread-task').status, 'pass');
  });

  test('heartbeat results are labelled as a proxy', () => {
    const cell = evaluateCell(many(20, () => ({ mainTaskMethod: 'heartbeat', maxMainTaskMs: 12 })));
    assert.match(checkOf(cell, 'main-thread-task').note, /heartbeat.*proxy/);
    const text = renderMarkdown(buildReport(reportMeta(), many(20, () => ({ mainTaskMethod: 'heartbeat', maxMainTaskMs: 12 }))));
    assert.match(text, /proxy, not a measured/);
  });

  test('real peak memory above 1.5 GiB fails and model-too-large always fails', () => {
    assert.equal(checkOf(evaluateCell(many(2, () => ({ peakProcessBytes: CRITERIA.processBytes + 1 }))), 'peak-process-memory').status, 'fail');
    assert.equal(checkOf(evaluateCell(many(2, () => ({ peakProcessBytes: CRITERIA.processBytes }))), 'peak-process-memory').status, 'pass');
    const big = evaluateCell([run(), run({ rep: 1, acceptedCount: 0, errors: [{ phase: 'set', code: 'model-too-large', message: 'x' }] })]);
    assert.equal(checkOf(big, 'model-too-large').status, 'fail');
  });

  test('cancel probes are excluded from the completion statistics and need < 200 ms', () => {
    const cell = evaluateCell([...many(10, () => ({})), cancelRun(), cancelRun({ rep: 1, cancelLatencyMs: 199 })]);
    assert.equal(cell.runs.ordinary, 10);
    assert.equal(cell.runs.cancelProbes, 2);
    assert.equal(cell.rates.completeTen, 1);
    assert.equal(checkOf(cell, 'cancel-latency').status, 'pass');
    assert.equal(checkOf(evaluateCell([run(), cancelRun({ cancelLatencyMs: 200 })]), 'cancel-latency').status, 'fail');
    assert.equal(checkOf(evaluateCell([run(), cancelRun({ cancelLatencyMs: null, measurementValid: false })]), 'cancel-latency').status, 'not-measured');
    assert.equal(checkOf(evaluateCell([run()]), 'cancel-latency').status, 'not-measured');
  });

  test('not-checked certificates are counted and never turned into proofs', () => {
    const cell = evaluateCell([
      run({ certificates: { unique: 2, multiple: 3, notProved: 1, notChecked: 4 } }),
      run({ rep: 1, certificates: { unique: 0, multiple: 0, notProved: 0, notChecked: 10 } }),
    ]);
    assert.deepEqual(cell.certificates, { unique: 2, multiple: 3, notProved: 1, notChecked: 14 });
  });

  test('interrupted runs are counted separately and leave the denominators alone', () => {
    const cell = evaluateCell([...many(4, () => ({})), run({ rep: 4, interrupted: true, acceptedCount: 2, tenthReadyMs: null, partialReason: 'cancelled' })]);
    assert.equal(cell.runs.ordinary, 4);
    assert.equal(cell.runs.interrupted, 1);
    assert.equal(cell.rates.completeTen, 1);
  });

  test('Node rows are screening only and the browser verdict never says qualified', () => {
    const node = evaluateCell(many(20, () => ({ browserOrNode: 'node v24', mainTaskMethod: 'not-applicable', maxMainTaskMs: null, longTasksOver50: null })));
    assert.equal(checkOf(node, 'main-thread-task').status, 'not-applicable');
    assert.equal(node.verdict, 'node-screening-only');
    const browser = evaluateCell([...many(20, () => ({})), cancelRun()], { repetitions: 20 });
    assert.equal(browser.verdict, 'meets-all-criteria');
    const short = evaluateCell([...many(5, () => ({})), cancelRun()], { repetitions: 5 });
    assert.equal(short.verdict, 'incomplete-evidence');
    assert.equal(short.sampleSize.sufficient, false);
    const missingRows = evaluateCell([...many(20, () => ({})), cancelRun()], { repetitions: 25 });
    assert.equal(missingRows.verdict, 'incomplete-evidence');
    assert.equal(missingRows.runs.missing, 5);
  });
});

/** @returns {import('../tools/bench/report.js').ReportMeta} */
function reportMeta() {
  return {
    kind: 'browser', profile: 'smoke', sourceCommit: 'c', sourceDigest: 'd', versions: {}, platform: 'p', browserOrNode: 'chrome',
    workerCount: 4, lifecycle: 'cold', matrixDigest: 'm', startedAt: 'a', finishedAt: 'b', expectedRuns: 20,
  };
}

describe('report files', () => {
  test('Node planning figures are labelled estimates and browser reports have none', () => {
    const node = buildReport({ ...reportMeta(), kind: 'node' }, many(20, () => ({ browserOrNode: 'node v24', tenthReadyMs: 2000 })));
    assert.equal(node.planning[0].browserPlanSeconds, 13);
    assert.match(renderMarkdown(node), /NOT measurements/);
    assert.deepEqual(buildReport(reportMeta(), many(20, () => ({}))).planning, []);
  });

  test('reports are UTF-8 text with CRLF line ends and a final newline', () => {
    const text = reportJson(buildReport(reportMeta(), many(2, () => ({}))));
    assert.ok(text.endsWith('\r\n'));
    assert.ok(!/[^\r]\n/.test(text));
    assert.equal(toCrlf('a\nb'), 'a\r\nb\r\n');
    assert.equal(toCrlf('a\r\nb\r\n'), 'a\r\nb\r\n');
    assert.match(renderMarkdown(buildReport(reportMeta(), many(2, () => ({})))), /CONDITIONAL/);
  });

  test('an incomplete report says so and records every row', () => {
    const report = buildReport(reportMeta(), many(3, () => ({})));
    assert.equal(report.complete, false);
    assert.equal(report.runCount, 3);
    assert.match(renderMarkdown(report), /INCOMPLETE/);
  });

  test('run records are validated structurally', () => {
    assert.deepEqual(validateRunRecord(run()), []);
    const broken = /** @type {any} */ ({ ...run() });
    delete broken.certificates;
    assert.ok(validateRunRecord(broken).length > 0);
    assert.ok(validateRunRecord(null).length > 0);
  });

  test('the source digest ignores line-ending style and covers every engine file', async () => {
    const lf = await computeSourceDigest((path) => `${path}\nbody\n`);
    const crlf = await computeSourceDigest((path) => `${path}\r\nbody\r\n`);
    assert.equal(lf, crlf);
    assert.notEqual(lf, await computeSourceDigest((path) => `${path}\nother\n`));
    for (const path of SOURCE_FILES) {
      assert.ok(existsSync(new URL(`../${path}`, import.meta.url)), path);
    }
    for (const name of readdirSync(new URL('../core/engine/', import.meta.url)).filter((n) => n.endsWith('.js'))) {
      assert.ok(SOURCE_FILES.includes(`core/engine/${name}`), name);
    }
  });
});

/**
 * Minimal fake of the PerformanceObserver contract.
 * @param {{ startTime: number, duration: number }[]} pending
 */
function fakeObserverClass(pending) {
  /** @type {any} */
  const state = { callback: null };
  class FakeObserver {
    static supportedEntryTypes = ['longtask'];
    /** @param {(list: { getEntries(): any[] }) => void} callback */
    constructor(callback) {
      state.callback = callback;
    }
    observe() {}
    disconnect() {}
    takeRecords() {
      return pending.splice(0);
    }
  }
  return { FakeObserver, state };
}

describe('responsiveness instrumentation', () => {
  test('long-task records: maximum duration and count over 50 ms inside the run only', () => {
    /** @type {{ startTime: number, duration: number }[]} */
    const pending = [];
    const { FakeObserver, state } = fakeObserverClass(pending);
    let now = 0;
    const monitor = createLongTaskMonitor({
      now: () => now, isVisible: () => true, onVisibilityChange: () => () => {}, PerformanceObserver: /** @type {any} */ (FakeObserver),
    });
    assert.ok(monitor);
    now = 100;
    monitor.start();
    state.callback({ getEntries: () => [{ startTime: 110, duration: 60 }, { startTime: 400, duration: 50 }] });
    pending.push({ startTime: 900, duration: 55 }, { startTime: 5000, duration: 900 });
    now = 1000;
    const result = monitor.stop();
    assert.equal(result.method, 'longtask-api');
    assert.equal(result.maxMainTaskMs, 60);
    assert.equal(result.longTasksOver50, 2);
    assert.equal(result.valid, true);
    now = 2000;
    monitor.start();
    now = 3000;
    const quiet = monitor.stop();
    assert.equal(quiet.maxMainTaskMs, 0);
    assert.equal(quiet.longTasksOver50, 0);
    assert.equal(quiet.valid, true);
  });

  test('losing the foreground invalidates the measurement', () => {
    const { FakeObserver } = fakeObserverClass([]);
    let visible = true;
    /** @type {(() => void) | null} */
    let listener = null;
    const monitor = createLongTaskMonitor({
      now: () => 0, isVisible: () => visible, PerformanceObserver: /** @type {any} */ (FakeObserver),
      onVisibilityChange: (fn) => {
        listener = fn;
        return () => {};
      },
    });
    assert.ok(monitor);
    monitor.start();
    visible = false;
    listener?.();
    visible = true;
    assert.equal(monitor.stop().valid, false);
  });

  /** Fake timer and channel clock for the heartbeat. */
  function heartbeatRig() {
    let now = 0;
    /** @type {(() => void)[]} */
    const timers = [];
    /** @type {(() => void) | null} */
    let deliver = null;
    let sent = 0;
    const env = {
      now: () => now,
      isVisible: () => true,
      onVisibilityChange: () => () => {},
      setTimeout: (/** @type {() => void} */ fn) => {
        timers.push(fn);
        return timers.length;
      },
      clearTimeout: () => {},
      createChannel: (/** @type {() => void} */ onMessage) => {
        deliver = onMessage;
        return { send: () => { sent += 1; }, close: () => {} };
      },
    };
    return {
      env,
      at: (/** @type {number} */ t) => { now = t; },
      fireTimer: () => /** @type {() => void} */ (timers.shift())(),
      deliver: () => /** @type {() => void} */ (deliver)(),
      sentCount: () => sent,
    };
  }

  test('heartbeat: delay beyond the scheduled delivery is the proxy for the longest task', () => {
    const rig = heartbeatRig();
    const monitor = createHeartbeatMonitor(rig.env);
    assert.ok(monitor);
    monitor.start();
    rig.at(10);
    rig.fireTimer();
    rig.deliver();
    rig.at(20);
    rig.fireTimer();
    rig.at(95);
    rig.deliver();
    rig.at(120);
    const result = monitor.stop();
    assert.equal(rig.sentCount(), 2);
    assert.equal(result.method, 'heartbeat');
    assert.equal(result.maxMainTaskMs, 75);
    assert.equal(result.longTasksOver50, 1);
    assert.equal(result.valid, true);
    assert.match(result.notes.join(' '), /proxy/);
  });

  test('heartbeat: an undelivered tick at the end counts as overdue, and no data is invalid not zero', () => {
    const rig = heartbeatRig();
    const monitor = createHeartbeatMonitor(rig.env);
    assert.ok(monitor);
    monitor.start();
    rig.at(300);
    const blocked = monitor.stop();
    assert.equal(blocked.maxMainTaskMs, 290);
    assert.equal(blocked.longTasksOver50, 1);
    monitor.start();
    rig.at(305);
    const silent = monitor.stop();
    assert.equal(silent.maxMainTaskMs, null);
    assert.equal(silent.valid, false);
  });

  test('longtask is preferred, heartbeat is the fallback, and nothing available is invalid', () => {
    const { FakeObserver } = fakeObserverClass([]);
    const rig = heartbeatRig();
    assert.equal(createResponsiveness({ ...rig.env, PerformanceObserver: /** @type {any} */ (FakeObserver) }).method, 'longtask-api');
    assert.equal(createResponsiveness(rig.env).method, 'heartbeat');
    const none = createResponsiveness({ now: () => 0, isVisible: () => true, onVisibilityChange: () => () => {} });
    none.start();
    const result = none.stop();
    assert.equal(result.valid, false);
    assert.equal(result.maxMainTaskMs, null);
  });
});
