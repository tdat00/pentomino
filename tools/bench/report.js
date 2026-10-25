// @ts-check
// Benchmark report model (design §7.8, §8.7; T21): the per-run record, the
// statistics, the qualification checks and the JSON/Markdown renderers. Pure:
// no clock, DOM, filesystem or engine call, so Node and the browser page share
// it and the unit tests drive it with synthetic runs.
//
// Conventions. Median is the middle value (mean of the two middle values for an
// even count); p95 is the nearest rank ceil(.95 * n); an empty sample has null
// statistics, never zero. T10 percentiles are CONDITIONAL on the runs that
// reached ten puzzles and always sit next to the all-run completion rates.
// Missing measurements are `null` and make a check `not-measured`; they never
// pass. No verdict here ever says a browser qualification gate passed.
import { sha256Hex } from '../../core/engine/hash.js';
import { TIME } from '../../core/engine/policy.js';
import { MAIN_BUDGET_BYTES, WORKER_LIMIT_BYTES } from '../../core/browser/worker-pool.js';

export const REPORT_FORMAT = 'pentomino-bench-report';
export const REPORT_VERSION = 1;
export const QUANTITY = 10;
export const PROBE_KINDS = Object.freeze(['generation', 'cancel', 'scaled-watchdog']);
export const MAIN_TASK_METHODS = Object.freeze(['longtask-api', 'heartbeat', 'not-applicable']);

const GIB = 1024 * 1024 * 1024;
export const CRITERIA = Object.freeze({
  completeTenRate: 0.9,
  atLeastOneRate: 0.99,
  t10MedianMs: TIME.targetMs,
  t10P95Ms: TIME.dispatchStopMs,
  responseMs: TIME.responseMs,
  processBytes: 1.5 * GIB,
  mainTaskMs: 50,
  cancelMs: 200,
  minRepetitions: 20,
});

/** Files whose content identifies the measured code; the same list is hashed by Node and by the browser page. */
export const SOURCE_FILES = Object.freeze([
  'core/engine/board.js', 'core/engine/carve.js', 'core/engine/clues.js', 'core/engine/difficulty.js',
  'core/engine/dlx.js', 'core/engine/enumerate.js', 'core/engine/game.js', 'core/engine/generate.js', 'core/engine/geometry.js',
  'core/engine/hash.js', 'core/engine/hints.js', 'core/engine/keys.js', 'core/engine/levels.js', 'core/engine/pack.js',
  'core/engine/palette.js', 'core/engine/placements.js', 'core/engine/policy.js', 'core/engine/protocol.js',
  'core/engine/puzzlecode-input.js', 'core/engine/puzzlecode-v1.js', 'core/engine/puzzlecode.js',
  'core/engine/qualification.js', 'core/engine/rng.js', 'core/engine/sharecode.js', 'core/engine/tasks.js',
  'core/engine/tiling.js', 'core/engine/types.js', 'core/engine/version.js', 'core/engine/view.js',
  'core/engine/workspace.js', 'core/browser/worker-pool.js', 'core/browser/generation-client.js',
  'core/workers/engine.worker.js', 'tools/bench/runner.js', 'tools/bench/report.js',
  'tools/bench/responsiveness.js', 'tools/bench/calibration-reference.js',
]);

/**
 * @typedef {object} RunRecord
 * @property {string} caseId
 * @property {string} seed Exact set seed text.
 * @property {string} sourceCommit
 * @property {string} sourceDigest
 * @property {Record<string, string>} versions
 * @property {string} platform
 * @property {string} browserOrNode
 * @property {number} workerCount
 * @property {string} startedAt
 * @property {number | null} firstReadyMs T1: click to validated set + calibration puzzle.
 * @property {number | null} tenthReadyMs T10: click to the tenth accepted puzzle.
 * @property {number} responseMs Click to the final answer of the request.
 * @property {number} acceptedCount Validated, in-band, strictly distinct puzzles.
 * @property {string | null} partialReason
 * @property {boolean} layoutsExhausted Owner decision 2026-10-23: the piece set's distinct arrangements were counted
 *   exhaustively and every one of them is among the accepted puzzles (the shortfall is a proven maximum).
 * @property {number | null} layoutTotal Exact number of distinct arrangements when `layoutsExhausted`.
 * @property {string | null} layoutMethod Enumeration method (`cell-backtracking-v1`) when an enumeration ran, else null.
 * @property {'exhausted' | 'more' | 'unproven' | null} layoutStatus Outcome of the enumeration, null when none ran.
 * @property {number | null} layoutEnumPlacements Candidate placements tried by the enumeration.
 * @property {number | null} layoutEnumMs Wall time of the enumeration inside the request.
 * @property {number | null} layoutPassTried Fix round 3: arrangements the completion pass ran as candidates, null when no pass ran.
 * @property {number | null} layoutPassAdded Puzzles the completion pass accepted.
 * @property {number | null} layoutUnusable Arrangements the pass tried that gave no puzzle.
 * @property {number | null} layoutPassMs Wall time of the completion pass.
 * @property {number} peakAccountedBytes
 * @property {number | null} peakProcessBytes
 * @property {number} ratingSaturatedCount
 * @property {{ unique: number, multiple: number, notProved: number, notChecked: number }} certificates
 * @property {number | null} certificatesSettledMs
 * @property {number | null} maxModelRows
 * @property {number | null} maxModelNodes
 * @property {'longtask-api' | 'heartbeat' | 'not-applicable'} mainTaskMethod
 * @property {number | null} maxMainTaskMs
 * @property {number | null} longTasksOver50
 * @property {number | null} cancelLatencyMs
 * @property {'generation' | 'cancel' | 'scaled-watchdog'} probeKind
 * @property {boolean} renderingEnabled
 * @property {boolean} measurementValid
 * @property {string[]} measurementNotes
 * @property {{ phase: string, code: string, message: string }[]} errors
 * @property {number} rep Zero-based repetition (the probes use their own rows).
 * @property {'cold' | 'warm'} lifecycle Cold = new worker pool for this run; warm = reused pool.
 * @property {boolean} interrupted Stopped by the user or an interrupt; excluded from the rates.
 * @property {Record<string, any> | null} details Set summary, policy check, result digest.
 * @property {Record<string, any>[]} samples Landscape profile samples (diagnostics, not accepted puzzles).
 */

/** @param {Partial<RunRecord>} init @returns {RunRecord} */
export function newRunRecord(init = {}) {
  return {
    caseId: '',
    seed: '',
    sourceCommit: '',
    sourceDigest: '',
    versions: {},
    platform: '',
    browserOrNode: '',
    workerCount: 0,
    startedAt: '',
    firstReadyMs: null,
    tenthReadyMs: null,
    responseMs: 0,
    acceptedCount: 0,
    partialReason: null,
    layoutsExhausted: false,
    layoutTotal: null,
    layoutMethod: null,
    layoutStatus: null,
    layoutEnumPlacements: null,
    layoutEnumMs: null,
    layoutPassTried: null,
    layoutPassAdded: null,
    layoutUnusable: null,
    layoutPassMs: null,
    peakAccountedBytes: 0,
    peakProcessBytes: null,
    ratingSaturatedCount: 0,
    certificates: { unique: 0, multiple: 0, notProved: 0, notChecked: 0 },
    certificatesSettledMs: null,
    maxModelRows: null,
    maxModelNodes: null,
    mainTaskMethod: 'not-applicable',
    maxMainTaskMs: null,
    longTasksOver50: null,
    cancelLatencyMs: null,
    probeKind: 'generation',
    renderingEnabled: false,
    measurementValid: true,
    measurementNotes: [],
    errors: [],
    rep: 0,
    lifecycle: 'cold',
    interrupted: false,
    details: null,
    samples: [],
    ...init,
  };
}

/** @param {unknown} v @returns {v is number} */
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
/** @param {unknown} v */
const isNumOrNull = (v) => v === null || isNum(v);

/**
 * Structural check of a run record (also used to reject foreign checkpoint lines).
 * @param {unknown} run
 * @returns {string[]} Problems; empty when valid.
 */
export function validateRunRecord(run) {
  if (typeof run !== 'object' || run === null || Array.isArray(run)) {
    return ['the run is not an object'];
  }
  const r = /** @type {Record<string, any>} */ (run);
  /** @type {string[]} */
  const problems = [];
  const need = (/** @type {string} */ name, /** @type {boolean} */ ok) => {
    if (!ok) {
      problems.push(`${name} is missing or has the wrong type`);
    }
  };
  for (const name of ['caseId', 'seed', 'sourceCommit', 'sourceDigest', 'platform', 'browserOrNode', 'startedAt']) {
    need(name, typeof r[name] === 'string');
  }
  need('versions', typeof r.versions === 'object' && r.versions !== null);
  for (const name of ['workerCount', 'responseMs', 'acceptedCount', 'peakAccountedBytes', 'ratingSaturatedCount', 'rep']) {
    need(name, isNum(r[name]));
  }
  for (const name of ['firstReadyMs', 'tenthReadyMs', 'peakProcessBytes', 'certificatesSettledMs', 'maxModelRows',
    'maxModelNodes', 'maxMainTaskMs', 'longTasksOver50', 'cancelLatencyMs']) {
    need(name, isNumOrNull(r[name]));
  }
  need('partialReason', r.partialReason === null || typeof r.partialReason === 'string');
  // Fields added by the 2026-10-23 owner decision; records written before it simply lack them.
  need('layoutsExhausted', r.layoutsExhausted === undefined || typeof r.layoutsExhausted === 'boolean');
  for (const name of ['layoutTotal', 'layoutEnumPlacements', 'layoutEnumMs', 'layoutPassTried', 'layoutPassAdded', 'layoutUnusable', 'layoutPassMs']) {
    need(name, r[name] === undefined || isNumOrNull(r[name]));
  }
  need('layoutMethod', r.layoutMethod === undefined || r.layoutMethod === null || typeof r.layoutMethod === 'string');
  need('mainTaskMethod', MAIN_TASK_METHODS.includes(r.mainTaskMethod));
  need('probeKind', PROBE_KINDS.includes(r.probeKind));
  need('lifecycle', r.lifecycle === 'cold' || r.lifecycle === 'warm');
  for (const name of ['renderingEnabled', 'measurementValid', 'interrupted']) {
    need(name, typeof r[name] === 'boolean');
  }
  need('measurementNotes', Array.isArray(r.measurementNotes));
  need('errors', Array.isArray(r.errors));
  need('samples', Array.isArray(r.samples));
  const c = r.certificates;
  need('certificates', typeof c === 'object' && c !== null
    && ['unique', 'multiple', 'notProved', 'notChecked'].every((k) => isNum(c[k])));
  return problems;
}

/** @param {RunRecord} run @returns {string} */
export const runKey = (run) => `${run.probeKind}|${run.caseId}|${run.rep}`;

/**
 * @param {readonly number[]} values
 * @returns {number | null} Middle value, or the mean of the two middle values.
 */
export function median(values) {
  if (values.length === 0) {
    return null;
  }
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Nearest-rank percentile: the value at rank ceil(p * n).
 * @param {readonly number[]} values
 * @param {number} p In (0, 1].
 * @returns {number | null}
 */
export function percentile(values, p) {
  if (values.length === 0) {
    return null;
  }
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.max(1, Math.ceil(p * sorted.length)) - 1];
}

/**
 * @param {readonly number[]} values
 * @returns {{ n: number, min: number | null, median: number | null, p95: number | null, max: number | null }}
 */
export function summarize(values) {
  return {
    n: values.length,
    min: values.length === 0 ? null : Math.min(...values),
    median: median(values),
    p95: percentile(values, 0.95),
    max: values.length === 0 ? null : Math.max(...values),
  };
}

/** @param {RunRecord} run */
const isNodeRun = (run) => run.mainTaskMethod === 'not-applicable' && run.browserOrNode.startsWith('node');

/**
 * @typedef {{ id: string, label: string, status: 'pass' | 'fail' | 'not-measured' | 'not-applicable',
 *   value: number | string | null, limit: number | string, note: string }} Check
 */

/**
 * @param {string} id
 * @param {string} label
 * @param {Check['status']} status
 * @param {Check['value']} value
 * @param {Check['limit']} limit
 * @param {string} [note]
 * @returns {Check}
 */
const check = (id, label, status, value, limit, note = '') => ({ id, label, status, value, limit, note });

/**
 * @param {number | null} value
 * @param {number} limit
 * @param {boolean} inclusive
 * @param {'upper' | 'lower'} side
 * @returns {'pass' | 'fail' | 'not-measured'}
 */
function compare(value, limit, inclusive, side) {
  if (value === null) {
    return 'not-measured';
  }
  const ok = side === 'upper' ? (inclusive ? value <= limit : value < limit) : (inclusive ? value >= limit : value > limit);
  return ok ? 'pass' : 'fail';
}

/**
 * Criterion 2 after the owner decision of 2026-10-23: a run that returned fewer than ten puzzles still counts
 * when the piece set was proven to have no further arrangement and the run returned every one of them.
 * An unproven shortfall (`more`, `unproven`, no enumeration) never counts.
 * @param {RunRecord} run
 * @returns {boolean}
 */
export function returnedEveryArrangement(run) {
  return run.layoutsExhausted === true && run.partialReason === 'layouts-not-found' && run.errors.length === 0
    && run.acceptedCount >= 1 && run.acceptedCount < QUANTITY && run.layoutTotal === run.acceptedCount;
}

/**
 * Qualification statistics and checks of one matrix cell. Ordinary generation
 * rows form every statistic; cancel and scaled-watchdog probes stay separate;
 * interrupted rows are counted but excluded from the denominators.
 * @param {readonly RunRecord[]} runs All rows of the cell.
 * @param {{ repetitions?: number }} [options]
 */
export function evaluateCell(runs, options = {}) {
  const caseId = runs[0]?.caseId ?? '';
  const generation = runs.filter((r) => r.probeKind === 'generation');
  const ordinary = generation.filter((r) => !r.interrupted);
  const cancels = runs.filter((r) => r.probeKind === 'cancel');
  const watchdogs = runs.filter((r) => r.probeKind === 'scaled-watchdog');
  const n = ordinary.length;
  const complete = ordinary.filter((r) => r.acceptedCount >= QUANTITY);
  const exhausted = ordinary.filter(returnedEveryArrangement);
  const criterionTwo = complete.length + exhausted.length;
  const atLeastOne = ordinary.filter((r) => r.acceptedCount >= 1);
  const t10Values = complete.map((r) => r.tenthReadyMs).filter(isNum);
  const t1Values = ordinary.map((r) => r.firstReadyMs).filter(isNum);
  const responses = ordinary.map((r) => r.responseMs).filter(isNum);
  const completeRate = n === 0 ? null : complete.length / n;
  const criterionTwoRate = n === 0 ? null : criterionTwo / n;
  const atLeastOneRate = n === 0 ? null : atLeastOne.length / n;
  const t10 = { conditional: true, basis: 'runs that completed ten puzzles', ...summarize(t10Values) };
  const nodeOnly = n > 0 && ordinary.every(isNodeRun);
  const processPeaks = ordinary.map((r) => r.peakProcessBytes).filter(isNum);
  const processMissing = ordinary.some((r) => r.peakProcessBytes === null);
  const accountedMax = ordinary.reduce((m, r) => Math.max(m, r.peakAccountedBytes), 0);
  const accountedLimit = Math.max(0, ...ordinary.map((r) => r.workerCount)) * WORKER_LIMIT_BYTES + MAIN_BUDGET_BYTES;
  const tooLarge = runs.filter((r) => r.errors.some((e) => e.code === 'model-too-large')).length;

  /** @type {Check[]} */
  const checks = [];
  checks.push(check('complete-ten-rate',
    'Runs with 10 of 10 puzzles or every proven-available arrangement (all ordinary runs; criterion 2, owner decision 2026-10-23)',
    compare(criterionTwoRate, CRITERIA.completeTenRate, true, 'lower'), criterionTwoRate, `>= ${CRITERIA.completeTenRate}`,
    `${criterionTwo} of ${n}: ${complete.length} with ten + ${exhausted.length} proven-exhausted`));
  checks.push(check('at-least-one-rate', 'Runs with at least 1 puzzle (all ordinary runs)',
    compare(atLeastOneRate, CRITERIA.atLeastOneRate, true, 'lower'), atLeastOneRate, `>= ${CRITERIA.atLeastOneRate}`,
    `${atLeastOne.length} of ${n}`));
  checks.push(check('t10-median', 'T10 median, conditional on complete runs',
    compare(t10.median, CRITERIA.t10MedianMs, true, 'upper'), t10.median, `<= ${CRITERIA.t10MedianMs} ms`, `n = ${t10.n}`));
  checks.push(check('t10-p95', 'T10 p95 (nearest rank), conditional on complete runs',
    compare(t10.p95, CRITERIA.t10P95Ms, true, 'upper'), t10.p95, `<= ${CRITERIA.t10P95Ms} ms`, `n = ${t10.n}`));
  const maxResponse = responses.length === 0 ? null : Math.max(...responses);
  checks.push(check('response-time', 'Longest response of any ordinary run',
    compare(maxResponse, CRITERIA.responseMs, true, 'upper'), maxResponse, `<= ${CRITERIA.responseMs} ms`));
  const processMax = processPeaks.length === 0 ? null : Math.max(...processPeaks);
  const processStatus = processMax !== null && processMax > CRITERIA.processBytes ? 'fail'
    : processMissing || processMax === null ? 'not-measured' : 'pass';
  checks.push(check('peak-process-memory', 'Real peak memory of the whole process (tab/process plus workers)',
    processStatus, processMax, `<= ${CRITERIA.processBytes} bytes`,
    processMissing ? 'some runs have no whole-process measurement' : ''));
  checks.push(check('byte-accounting', 'Accounted worker and main buffers within the design budgets',
    n === 0 ? 'not-measured' : accountedMax <= accountedLimit ? 'pass' : 'fail', n === 0 ? null : accountedMax,
    `<= ${accountedLimit} bytes`));
  checks.push(check('model-too-large', 'No model-too-large error', n === 0 ? 'not-measured' : tooLarge === 0 ? 'pass' : 'fail',
    tooLarge, '0'));

  const methods = [...new Set(ordinary.map((r) => r.mainTaskMethod))];
  if (nodeOnly) {
    checks.push(check('main-thread-task', 'No main-thread task over 50 ms', 'not-applicable', null, `<= ${CRITERIA.mainTaskMs} ms`,
      'Node has no browser main thread'));
  } else {
    const unmeasured = ordinary.some((r) => !r.measurementValid || r.maxMainTaskMs === null);
    const worst = ordinary.map((r) => r.maxMainTaskMs).filter(isNum);
    const worstMs = worst.length === 0 ? null : Math.max(...worst);
    const status = worstMs !== null && worstMs > CRITERIA.mainTaskMs ? 'fail' : unmeasured || worstMs === null ? 'not-measured' : 'pass';
    const proxy = methods.includes('heartbeat') ? ' heartbeat delay is a proxy, not a measured task duration;' : '';
    checks.push(check('main-thread-task', 'No main-thread task over 50 ms (rendering excluded)', status, worstMs,
      `<= ${CRITERIA.mainTaskMs} ms`, `method: ${methods.join(', ') || 'none'};${proxy} thumbnails off`.replace(/;$/, '')));
  }
  const cancelValues = cancels.map((r) => r.cancelLatencyMs);
  const cancelMeasured = cancelValues.filter(isNum);
  const cancelBad = cancels.some((r) => !r.measurementValid || r.cancelLatencyMs === null);
  const cancelMax = cancelMeasured.length === 0 ? null : Math.max(...cancelMeasured);
  const cancelStatus = cancelMax !== null && cancelMax >= CRITERIA.cancelMs ? 'fail'
    : cancelBad || cancelMax === null ? 'not-measured' : 'pass';
  checks.push(check('cancel-latency', 'Cancel settles quickly (separate probe, excluded from statistics)', cancelStatus, cancelMax,
    `< ${CRITERIA.cancelMs} ms`, `${cancels.length} probe(s)`));

  const expected = options.repetitions ?? null;
  const missingRuns = expected === null ? 0 : Math.max(0, expected - generation.length);
  const sufficient = n >= CRITERIA.minRepetitions;
  const unmet = checks.some((c) => c.status === 'not-measured');
  /** @type {'fail' | 'no-data' | 'node-screening-only' | 'incomplete-evidence' | 'meets-all-criteria'} */
  let verdict;
  if (checks.some((c) => c.status === 'fail')) {
    verdict = 'fail';
  } else if (n === 0) {
    verdict = 'no-data';
  } else if (nodeOnly) {
    verdict = 'node-screening-only';
  } else {
    verdict = unmet || !sufficient || missingRuns > 0 ? 'incomplete-evidence' : 'meets-all-criteria';
  }
  const certificates = { unique: 0, multiple: 0, notProved: 0, notChecked: 0 };
  for (const r of ordinary) {
    for (const key of /** @type {const} */ (['unique', 'multiple', 'notProved', 'notChecked'])) {
      certificates[key] += r.certificates[key];
    }
  }
  const counted = ordinary.filter((r) => r.layoutStatus != null);
  const countedBy = (/** @type {string} */ status) => counted.filter((r) => r.layoutStatus === status).length;
  const passed = ordinary.filter((r) => isNum(r.layoutPassTried));
  const sum = (/** @type {(number | null | undefined)[]} */ values) => values.filter(isNum).reduce((a, b) => a + b, 0);
  return {
    caseId,
    platform: nodeOnly ? 'node' : 'browser-or-mixed',
    arrangements: {
      method: counted.find((r) => r.layoutMethod != null)?.layoutMethod ?? null,
      enumerated: counted.length,
      exhausted: countedBy('exhausted'),
      more: countedBy('more'),
      unproven: countedBy('unproven'),
      placements: summarize(counted.map((r) => r.layoutEnumPlacements).filter(isNum)),
      ms: summarize(counted.map((r) => r.layoutEnumMs).filter(isNum)),
      pass: {
        runs: passed.length,
        added: sum(passed.map((r) => r.layoutPassAdded)),
        filledToTen: passed.filter((r) => r.acceptedCount >= QUANTITY && (r.layoutPassAdded ?? 0) > 0).length,
        unusable: sum(passed.map((r) => r.layoutUnusable)),
        ms: summarize(passed.map((r) => r.layoutPassMs).filter(isNum)),
      },
    },
    runs: {
      ordinary: n, expected, missing: missingRuns, complete: complete.length, exhausted: exhausted.length, atLeastOne: atLeastOne.length,
      interrupted: generation.length - n, cancelProbes: cancels.length, watchdogProbes: watchdogs.length,
    },
    rates: { completeTen: completeRate, tenOrEveryArrangement: criterionTwoRate, atLeastOne: atLeastOneRate },
    t1: summarize(t1Values),
    t10,
    response: summarize(responses),
    peak: { accountedMaxBytes: n === 0 ? null : accountedMax, processMaxBytes: processMax },
    saturatedAccepted: ordinary.reduce((s, r) => s + r.ratingSaturatedCount, 0),
    acceptedTotal: ordinary.reduce((s, r) => s + r.acceptedCount, 0),
    certificates,
    sampleSize: { n, minimum: CRITERIA.minRepetitions, sufficient },
    checks,
    verdict,
  };
}

/**
 * @template T
 * @param {readonly T[]} items
 * @param {(item: T) => string} keyOf
 * @returns {Map<string, T[]>}
 */
export function groupBy(items, keyOf) {
  /** @type {Map<string, T[]>} */
  const map = new Map();
  for (const item of items) {
    const key = keyOf(item);
    const list = map.get(key);
    if (list === undefined) {
      map.set(key, [item]);
    } else {
      list.push(item);
    }
  }
  return map;
}

/**
 * @typedef {object} ReportMeta
 * @property {'node' | 'browser'} kind
 * @property {string} profile
 * @property {string} sourceCommit
 * @property {string} sourceDigest
 * @property {Record<string, string>} versions
 * @property {string} platform
 * @property {string} browserOrNode
 * @property {Record<string, any>} [hardware]
 * @property {number} workerCount
 * @property {'cold' | 'warm'} lifecycle
 * @property {string} matrixDigest
 * @property {string} startedAt
 * @property {string} finishedAt
 * @property {number} expectedRuns Rows the matrix asks for, including probes.
 * @property {string[]} [notes]
 */

/**
 * @param {ReportMeta} meta
 * @param {readonly RunRecord[]} runs
 * @param {{ repetitions?: Record<string, number> }} [options] Repetitions per case id.
 */
export function buildReport(meta, runs, options = {}) {
  const byCase = groupBy(runs, (r) => r.caseId);
  const cells = [...byCase.values()].map((rows) => evaluateCell(rows, { repetitions: options.repetitions?.[rows[0].caseId] }));
  const planning = meta.kind === 'node'
    ? cells.map((c) => {
      const ms = c.t10.max;
      return {
        caseId: c.caseId,
        nodeMaxT10Ms: ms,
        browserPlanSeconds: ms === null ? null : 5 + 4 * (ms / 1000),
        label: 'planning estimate (D39: 5 s + 4 x Node maximum); not a measurement; never enables a BQ flag',
      };
    })
    : [];
  return {
    format: REPORT_FORMAT,
    version: REPORT_VERSION,
    meta: { ...meta, notes: meta.notes ?? [] },
    complete: runs.filter((r) => !r.interrupted).length >= meta.expectedRuns,
    runCount: runs.length,
    cells,
    planning,
    statement: meta.kind === 'node'
      ? 'Node screening evidence only. It never replaces browser measurements and enables no BQ limit.'
      : 'Browser measurement of one device. It qualifies nothing by itself: gates change only in qualification.js with a linked report.',
    runs,
  };
}

/** @param {number | null} ms */
const fmtMs = (ms) => (ms === null ? 'n/a' : ms >= 10000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`);
/** @param {number | null} v */
const fmtPct = (v) => (v === null ? 'n/a' : `${(v * 100).toFixed(1)}%`);
/** @param {number | null} b */
const fmtMiB = (b) => (b === null ? 'n/a' : `${(b / 1048576).toFixed(1)} MiB`);

/**
 * @param {ReturnType<typeof buildReport>} report
 * @param {{ detail?: boolean }} [options] `detail: false` omits the per-check, probe and certificate tables (large sweeps).
 * @returns {string} Markdown with LF line ends (see `toCrlf`).
 */
export function renderMarkdown(report, options = {}) {
  const detail = options.detail !== false;
  const { meta } = report;
  const lines = [];
  lines.push(`# Benchmark report: ${meta.profile} (${meta.kind})`, '');
  lines.push(report.statement, '');
  lines.push('| Field | Value |', '| --- | --- |');
  const facts = /** @type {[string, unknown][]} */ ([
    ['Source commit', meta.sourceCommit], ['Source digest', meta.sourceDigest], ['Versions', JSON.stringify(meta.versions)],
    ['Platform', `${meta.platform} / ${meta.browserOrNode}`], ['Workers', meta.workerCount], ['Pool lifecycle', meta.lifecycle],
    ['Started', meta.startedAt], ['Finished', meta.finishedAt],
    ['Rows recorded / requested', `${report.runCount} / ${meta.expectedRuns}${report.complete ? '' : ' (INCOMPLETE)'}`],
  ]);
  if (meta.hardware !== undefined) {
    facts.push(['Hardware', JSON.stringify(meta.hardware)]);
  }
  for (const [k, v] of facts) {
    lines.push(`| ${k} | ${String(v).replace(/\|/g, '/')} |`);
  }
  lines.push('', '## Reading guide', '',
    '- Rates use every ordinary run of the cell as denominator; interrupted runs are counted separately and excluded.',
    '- Criterion 2 (owner decision 2026-10-23): a run counts when it returned ten puzzles OR every arrangement of its piece set, the latter only when an exhaustive enumeration proved there is no other one (`proven-all`). Unproven shortfalls fail. "10 of 10" shows the strict ten count.',
    '- T1 = click to validated piece set plus calibration puzzle. T10 = click to the tenth accepted puzzle, including set carving, pool start-up and the immediate New Puzzles (10).',
    '- T10 median/p95/max are CONDITIONAL: they use only runs that completed ten puzzles (n shown); read them with the completion rates.',
    '- Median = middle value (mean of the two middle values when even); p95 = nearest rank ceil(0.95 n); empty samples show n/a.',
    '- Lazy certificates do not delay T10; their settling time is separate. Cancel and watchdog probes are separate rows.',
    '- "not-measured" means the evidence is missing; it never counts as a pass.', '');
  lines.push('## Cells', '',
    '| Case | Runs | 10 of 10 | Ten or proven-all | >= 1 | T1 median | T10 median* | T10 p95* | T10 max* | Max response | Peak process | Peak accounted | Verdict |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const c of report.cells) {
    const runs = `${c.runs.ordinary}${c.runs.expected === null ? '' : `/${c.runs.expected}`}`;
    lines.push(`| ${c.caseId} | ${runs} | ${c.runs.complete}/${c.runs.ordinary} (${fmtPct(c.rates.completeTen)}) | `
      + `${c.runs.complete + c.runs.exhausted}/${c.runs.ordinary} (${fmtPct(c.rates.tenOrEveryArrangement)}; ${c.runs.exhausted} proven-all) | `
      + `${c.runs.atLeastOne}/${c.runs.ordinary} (${fmtPct(c.rates.atLeastOne)}) | ${fmtMs(c.t1.median)} | ${fmtMs(c.t10.median)} | `
      + `${fmtMs(c.t10.p95)} | ${fmtMs(c.t10.max)} | ${fmtMs(c.response.max)} | ${fmtMiB(c.peak.processMaxBytes)} | `
      + `${fmtMiB(c.peak.accountedMaxBytes)} | ${c.verdict} |`);
  }
  lines.push('', '\\* conditional on completed runs; n per cell: ' + report.cells.map((c) => `${c.caseId} ${c.t10.n}`).join(', '), '');
  const counted = report.cells.filter((c) => c.arrangements.enumerated > 0);
  if (counted.length > 0) {
    lines.push('## Arrangement counts after layouts-not-found (owner decision 2026-10-23)', '',
      `Method: ${counted[0].arrangements.method}; exhaustive, symmetry-reduced (strict layout keys), bounded by placement and node caps. `
      + '"proven-all": every arrangement was returned; "more": an unused arrangement exists (shortfall is not a maximum); "unproven": a cap or the deadline stopped the count.', '',
      '| Case | Counted | proven-all | more | unproven | Placements median / max | Time median / max |', '| --- | --- | --- | --- | --- | --- | --- |');
    for (const c of counted) {
      const a = c.arrangements;
      lines.push(`| ${c.caseId} | ${a.enumerated} | ${a.exhausted} | ${a.more} | ${a.unproven} | ${a.placements.median} / ${a.placements.max} | ${fmtMs(a.ms.median)} / ${fmtMs(a.ms.max)} |`);
    }
    lines.push('');
    const withPass = counted.filter((c) => c.arrangements.pass.runs > 0);
    if (withPass.length > 0) {
      lines.push('### Completion pass (fix round 3, 2026-10-23)', '',
        'After the count, unused arrangements are run as puzzle candidates (same clue selection, band, uniqueness mode and key rules) until the request is full or they are used up. '
        + '"Filled to ten": runs that reached ten puzzles only thanks to the pass; "without puzzle": arrangements tried that had no clue set in the band.', '',
        '| Case | Pass runs | Puzzles added | Filled to ten | Without puzzle | Pass time median / max |', '| --- | --- | --- | --- | --- | --- |');
      for (const c of withPass) {
        const p = c.arrangements.pass;
        lines.push(`| ${c.caseId} | ${p.runs} | ${p.added} | ${p.filledToTen} | ${p.unusable} | ${fmtMs(p.ms.median)} / ${fmtMs(p.ms.max)} |`);
      }
      lines.push('');
    }
  }
  if (detail) {
    lines.push('## Criteria checks', '', '| Case | Check | Status | Value | Limit | Note |', '| --- | --- | --- | --- | --- | --- |');
    for (const c of report.cells) {
      for (const k of c.checks) {
        lines.push(`| ${c.caseId} | ${k.label} | ${k.status} | ${typeof k.value === 'number' ? Math.round(k.value * 1000) / 1000 : (k.value ?? 'n/a')} | ${k.limit} | ${k.note} |`);
      }
    }
  }
  const probes = report.runs.filter((r) => r.probeKind !== 'generation');
  if (detail && probes.length > 0) {
    lines.push('', '## Probe rows (excluded from the statistics)', '',
      '| Probe | Case | Seed | Accepted | Cancel latency | Response | Reason | Valid | Notes |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const r of probes) {
      lines.push(`| ${r.probeKind} | ${r.caseId} | ${r.seed} | ${r.acceptedCount} | ${fmtMs(r.cancelLatencyMs)} | ${fmtMs(r.responseMs)} | `
        + `${r.partialReason ?? 'none'} | ${r.measurementValid} | ${r.measurementNotes.join('; ')} |`);
    }
  }
  if (detail) {
    lines.push('', '## Certificates (accepted puzzles of ordinary runs)', '',
      '| Case | unique | multiple | not proved | not checked | saturated ratings |', '| --- | --- | --- | --- | --- | --- |');
    for (const c of report.cells) {
      lines.push(`| ${c.caseId} | ${c.certificates.unique} | ${c.certificates.multiple} | ${c.certificates.notProved} | `
        + `${c.certificates.notChecked} | ${c.saturatedAccepted}/${c.acceptedTotal} |`);
    }
  }
  if (report.planning.length > 0) {
    lines.push('', '## Planning estimates (NOT measurements)', '', report.planning[0].label, '',
      '| Case | Node max T10 | Browser plan |', '| --- | --- | --- |');
    for (const p of report.planning) {
      lines.push(`| ${p.caseId} | ${fmtMs(p.nodeMaxT10Ms)} | ${p.browserPlanSeconds === null ? 'n/a' : `${p.browserPlanSeconds.toFixed(1)} s`} |`);
    }
  }
  const failed = report.runs.filter((r) => r.errors.length > 0);
  if (failed.length > 0) {
    lines.push('', '## Errors', '');
    for (const r of failed) {
      lines.push(`- ${r.probeKind} ${r.caseId} seed ${r.seed}: ${r.errors.map((e) => `${e.phase}/${e.code}: ${e.message}`).join('; ')}`);
    }
  }
  for (const note of meta.notes ?? []) {
    lines.push('', `Note: ${note}`);
  }
  return `${lines.join('\n')}\n`;
}

/**
 * @param {string} text
 * @returns {string} The text with CRLF line ends and a final newline.
 */
export function toCrlf(text) {
  const lf = text.replace(/\r\n/g, '\n');
  return `${(lf.endsWith('\n') ? lf : `${lf}\n`).replace(/\n/g, '\r\n')}`;
}

/** @param {unknown} report @returns {string} Two-space JSON, CRLF, final newline. */
export function reportJson(report) {
  return toCrlf(JSON.stringify(report, null, 2));
}

/**
 * Digest of the measured sources; line ends are normalised so every checkout agrees.
 * @param {(path: string) => string | Promise<string>} readText Repo-relative path to text.
 * @returns {Promise<string>}
 */
export async function computeSourceDigest(readText) {
  const lines = [];
  for (const path of SOURCE_FILES) {
    lines.push(`${path}\t${sha256Hex(String(await readText(path)).replace(/\r\n/g, '\n'))}`);
  }
  return sha256Hex(lines.join('\n'));
}
