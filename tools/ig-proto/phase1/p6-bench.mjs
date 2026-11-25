// @ts-check
// Phase-1 bench of P6 (V4-T14, closes N-V4-12): the production bench (`tools/calibrate.mjs --profile landscape`, four
// workers, cold, one fresh process per row) on the old version (main 3fc65f4) and the new one (the commit under test),
// in two detached worktrees. This module holds the pure rules (the ledger of the owner's separate allowance of 45
// counted minutes, the preflight of an invocation, the checkpoint check, the pairing, the identity of a pair, the
// statistics, the memory checks and the two renderers) and the two commands `preflight` and `compare`. The locked
// invocations are `p6-bench.ps1`'s, through the lock helper; nothing here runs the bench, a clock or git.
//
//   node tools\ig-proto\phase1\p6-bench.mjs preflight --group A|B --side old|new --new-commit <C> [--resume-instructed]
//   node tools\ig-proto\phase1\p6-bench.mjs compare --new-commit <C>
//
// Exit codes of `preflight`: 0 run, 7 complete (nothing to run), 4 allowance, 5 an unreconciled invocation, 6 a second
// timeout, 8 a source, checkpoint or ledger mismatch, 9 an incomplete group that needs the pack author's instruction,
// 1 a usage error or an unreadable input. `compare` exits 0 or, refusing, 1 with nothing written.
// The results are Node screening evidence: five requests per cell are descriptive, never a browser qualification (D39).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

import { MAIN_BUDGET_BYTES, WORKER_LIMIT_BYTES } from '../../../core/browser/worker-pool.js';
import { CRITERIA, evaluateCell, returnedEveryArrangement, summarize, validateRunRecord } from '../../bench/report.js';
import { checkText } from '../../check-conventions.mjs';
import { abs, FROZEN_DIGEST, parseArgs, rel } from '../lib/paths.mjs';
import { sha256, toCrlf, writeJson, writeJsonl, writeText } from '../lib/records.mjs';

export const OLD_COMMIT = '3fc65f4681a53d3984d9218c15efbf696cc3a1a5';
export const OLD_DIGEST = FROZEN_DIGEST;
export const GROUPS = Object.freeze({
  A: Object.freeze(['14x14-master', '26x26-master', '26x26-expert', '26x26-nightmare', '10x10-nightmare']),
  B: Object.freeze(['12x12-nightmare', '18x18-nightmare']),
});
/** The order of the four invocations: block-order counterbalancing (A old then new, B new then old). */
export const ORDER = Object.freeze([['A', 'old'], ['A', 'new'], ['B', 'new'], ['B', 'old']]);
export const SEEDS = 5;
export const ALLOWANCE_S = 2700;
export const QUIET_MAX_S = 45;
export const LIMIT_MAX_S = 900;
export const LIMIT_MIN_S = 300;
export const RAW = 'tests/artifacts/ig-proto/phase1/P6-bench';
export const EVIDENCE = 'docs/improve-generating/evidence/phase1/P6-bench';
/** The landscape sampling's fields of `details`: diagnostics after the timed interval, never part of an identity. */
export const SAMPLING_FIELDS = Object.freeze(['sampleFailures', 'sampleUnrateable']);
export const STATEMENT = 'Node screening evidence at four workers, cold, one fresh process per request; not a browser qualification (D39)';

const TASK = 'V4-T14';
const REPORT_FORMAT = 'pentomino-bench-report';
const CHECKPOINT_FORMAT = 'pentomino-bench-checkpoint';
const WORKERS = 4;
const HEAP_FLAG = '--max-old-space-size=2048';
const HEX40 = /^[0-9a-f]{40}$/;
const HEX64 = /^[0-9a-f]{64}$/;
const CELLS = Object.freeze([...GROUPS.A, ...GROUPS.B]);
const LEVELS = Object.freeze(['Master', 'Expert', 'Nightmare']);
const SET_KEYS = Object.freeze(['area', 'K', 'sizes', 'setAttempt', 'initialG']);
const METRICS = Object.freeze(['t1', 't10', 't10MinusT1', 'response']);
const METRIC_LABELS = Object.freeze({ t1: 'T1', t10: 'T10', t10MinusT1: 'T10 - T1', response: 'response' });
const LEDGER_FIELDS = Object.freeze(['id', 'task', 'group', 'side', 'commit', 'limitS', 'start', 'end', 'wallSeconds', 'nodeSeconds',
  'lockWaitSeconds', 'quietS', 'countedSeconds', 'killed', 'exit', 'report', 'reportSha256']);
const DRIVE_PATH = /(^|[^A-Za-z0-9])[A-Za-z]:(\\\\|\\|\/)/;
export const LIMITATIONS = Object.freeze([
  'Five requests per cell provide descriptive results only; the nearest-rank p95 is the maximum of the available sample.',
  'Response medians include partial responses: each side\'s ten of n stands beside it.',
  'The landscape profile\'s diagnostic sampling runs after the T1, T10 and response timing, but it takes invocation time and counts in the whole-process peak memory.',
  'The order (A old then new, B new then old) reduces one order imbalance but does not cancel temporal drift within a cell.',
]);

/** @param {unknown} v @returns {v is number} */
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
/** @param {unknown} v @returns {v is number} */
const isPos = (v) => isNum(v) && v > 0;
/** @param {unknown} v @returns {v is Record<string, any>} */
const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
/** @param {number} x @returns {string} */
const num = (x) => String(Math.round(x * 1000) / 1000);
/** @param {string} caseId @returns {string} */
const levelOf = (caseId) => {
  const m = /-(master|expert|nightmare)$/.exec(caseId);
  return m === null ? 'Other' : `${m[1][0].toUpperCase()}${m[1].slice(1)}`;
};
/** @param {string} caseId @returns {number} */
const cellOrder = (caseId) => {
  const at = CELLS.indexOf(caseId);
  return at < 0 ? CELLS.length : at;
};

/**
 * @typedef {object} LedgerLine
 * @property {string} id
 * @property {string} task
 * @property {'A' | 'B'} group
 * @property {'old' | 'new'} side
 * @property {string} commit
 * @property {number} limitS
 * @property {string} start
 * @property {string} end
 * @property {number} wallSeconds
 * @property {number} nodeSeconds
 * @property {number} lockWaitSeconds
 * @property {number | null} quietS
 * @property {number} countedSeconds
 * @property {boolean} killed
 * @property {number | null} exit
 * @property {string | null} report
 * @property {string | null} reportSha256
 */

/** @param {unknown} row @returns {boolean} */
function ledgerLineOk(row) {
  if (!isObject(row) || !isDeepStrictEqual(Object.keys(row).sort(), [...LEDGER_FIELDS].sort())) {
    return false;
  }
  const strings = typeof row.id === 'string' && row.task === TASK && typeof row.start === 'string' && typeof row.end === 'string'
    && Number.isFinite(Date.parse(row.start)) && Number.isFinite(Date.parse(row.end));
  const good = ['limitS', 'wallSeconds', 'nodeSeconds', 'lockWaitSeconds', 'countedSeconds'].every((k) => isNum(row[k]) && row[k] >= 0);
  const orNull = (/** @type {unknown} */ v, /** @type {(x: unknown) => boolean} */ test) => v === null || test(v);
  return strings && good && Object.hasOwn(GROUPS, row.group) && (row.side === 'old' || row.side === 'new')
    && typeof row.commit === 'string' && HEX40.test(row.commit) && orNull(row.quietS, Number.isInteger) && typeof row.killed === 'boolean'
    && orNull(row.exit, Number.isInteger) && orNull(row.report, (v) => typeof v === 'string') && orNull(row.reportSha256, (v) => typeof v === 'string');
}

/**
 * @param {string} text The raw ledger (LF from the invoking script, CRLF in the published copy).
 * @returns {LedgerLine[]}
 */
export function readLedger(text) {
  /** @type {LedgerLine[]} */
  const rows = [];
  text.split('\n').forEach((raw, index) => {
    const line = raw.replace(/\r$/, '');
    if (line.trim() === '') {
      return;
    }
    /** @type {unknown} */
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      row = null;
    }
    if (!ledgerLineOk(row)) {
      throw new Error(`p6-bench: ledger line ${index + 1} is unreadable`);
    }
    rows.push(/** @type {LedgerLine} */ (row));
  });
  return rows;
}

/**
 * The limit of the next invocation under the owner's separate allowance: an invocation is charged at most its limit plus
 * the quiet period, so the ledger can never pass the allowance.
 * @param {readonly LedgerLine[]} rows
 * @returns {{ spent: number, limitS: number, allowed: boolean }}
 */
export function nextLimit(rows) {
  const spent = rows.reduce((sum, r) => sum + r.countedSeconds, 0);
  const limitS = Math.min(LIMIT_MAX_S, Math.floor(ALLOWANCE_S - spent - QUIET_MAX_S));
  return { spent, limitS, allowed: limitS >= LIMIT_MIN_S };
}

/**
 * Strict read of a bench checkpoint before a resume (the bench's own reader skips unreadable lines silently).
 * @param {string} text
 * @param {{ group: 'A' | 'B', side: 'old' | 'new', commit: string }} expected `commit` is the side's expected commit.
 * @returns {{ rows: number }}
 */
export function checkCheckpoint(text, { group, side, commit }) {
  const fail = (/** @type {number} */ n, /** @type {string} */ reason) => new Error(`p6-bench: checkpoint ${side}/${group} line ${n}: ${reason}`);
  const cells = new Set(GROUPS[group]);
  /** @type {Record<string, any> | null} */
  let header = null;
  const seen = new Set();
  let rows = 0;
  text.split('\n').forEach((raw, index) => {
    const n = index + 1;
    const line = raw.trim();
    if (line === '') {
      return;
    }
    /** @type {any} */
    let value;
    try {
      value = JSON.parse(line);
    } catch {
      throw fail(n, 'unreadable or truncated line');
    }
    if (header === null) {
      const ok = isObject(value) && value.format === CHECKPOINT_FORMAT && value.kind === 'node' && value.workers === WORKERS
        && value.lifecycle === 'cold' && value.freshProcess === true && typeof value.sourceDigest === 'string' && isObject(value.versions);
      if (!ok) {
        throw fail(n, 'the header is not a cold, fresh-process, four-worker node checkpoint');
      }
      header = value;
      return;
    }
    if (!isObject(value) || value.kind !== 'run') {
      throw fail(n, 'not a run line');
    }
    const run = value.run;
    const problems = validateRunRecord(run);
    if (problems.length > 0) {
      throw fail(n, `invalid run: ${problems[0]}`);
    }
    if (run.probeKind !== 'generation' || !cells.has(run.caseId)) {
      throw fail(n, `${run.probeKind} row of ${run.caseId} is not a generation row of group ${group}`);
    }
    if (!Number.isInteger(run.rep) || run.rep < 0 || run.rep >= SEEDS || run.seed !== `landscape/${run.caseId}/${run.rep}`) {
      throw fail(n, `${run.caseId} #${run.rep} has the seed ${run.seed}`);
    }
    if (run.sourceCommit !== commit) {
      throw fail(n, `the row is of the commit ${run.sourceCommit}`);
    }
    if (run.sourceDigest !== header.sourceDigest || !isDeepStrictEqual(run.versions, header.versions)) {
      throw fail(n, 'the row\'s source digest or versions differ from the header\'s');
    }
    const key = `${run.caseId}|${run.rep}`;
    if (seen.has(key)) {
      throw fail(n, `${run.caseId} #${run.rep} is recorded twice`);
    }
    seen.add(key);
    rows += 1;
  });
  if (header === null) {
    throw fail(1, 'the header is missing');
  }
  return { rows };
}

/**
 * @typedef {{ decision: 'run', limitS: number, spent: number }
 *   | { decision: 'complete', line: number, report: string }
 *   | { decision: 'stop', code: number, kind: string, reason: string }} Decision
 */

/** @param {string} group @param {string} side @param {string} raw @returns {RegExp} The path a terminal report has in the ledger. */
const reportPathPattern = (group, side, raw) => new RegExp(`^${raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/${side}/${group}-\\d{4}-\\d{2}-\\d{2}\\.json$`);

/**
 * The decision before an invocation.
 * @param {{ rows: readonly LedgerLine[], pending: unknown, group: 'A' | 'B', side: 'old' | 'new', checkpoint: string | null,
 *   resumeInstructed: boolean, newCommit: string, completedReport?: { path: string, sha256: string, report: unknown } | null,
 *   raw?: string }} input `raw` is the folder of the raw files (a scratch one in the self-test).
 * @returns {Decision}
 */
export function preflight({ rows, pending, group, side, checkpoint, resumeInstructed, newCommit, completedReport = null, raw = RAW }) {
  /** @type {(code: number, kind: string, reason: string) => Decision} */
  const stop = (code, kind, reason) => ({ decision: 'stop', code, kind, reason });
  if (pending !== null && pending !== undefined) {
    return stop(5, 'accounting', 'an invocation is not reconciled: pending.json');
  }
  if (rows.some((r) => r.commit !== (r.side === 'old' ? OLD_COMMIT : newCommit))) {
    return stop(8, 'source', 'ledger source does not match this comparison');
  }
  const mine = rows.filter((r) => r.group === group && r.side === side);
  const done = mine.filter((r) => r.exit === 0);
  if (done.length > 0) {
    const line = done[0];
    if (done.length !== 1) {
      return stop(8, 'source', `${group} ${side} has ${done.length} ledger lines with exit 0, exactly one is required`);
    }
    if (completedReport === null || completedReport === undefined) {
      return stop(8, 'source', `the terminal report of ${group} ${side} is missing`);
    }
    if (line.report !== completedReport.path || line.reportSha256 !== completedReport.sha256 || !reportPathPattern(group, side, raw).test(completedReport.path)) {
      return stop(8, 'source', `the terminal report of ${group} ${side} does not have the path and the SHA-256 of its ledger line`);
    }
    const problems = validateReport(completedReport.report, { side, group, newCommit });
    if (problems.length > 0) {
      return stop(8, 'source', `the terminal report of ${group} ${side}: ${problems[0]}`);
    }
    return { decision: 'complete', line: rows.indexOf(line) + 1, report: line.report };
  }
  const last = mine.at(-1);
  if (last !== undefined && last.exit === 2 && !resumeInstructed) {
    return stop(9, 'incomplete', `${group} ${side} ended incomplete (exit 2); a resume needs the pack author's instruction`);
  }
  if (mine.filter((r) => r.killed).length >= 2) {
    return stop(6, 'timeout', `a second timeout of ${group} ${side}`);
  }
  if (checkpoint !== null) {
    try {
      checkCheckpoint(checkpoint, { group, side, commit: side === 'old' ? OLD_COMMIT : newCommit });
    } catch (e) {
      return stop(8, 'checkpoint', (e instanceof Error ? e.message : String(e)).replace(/^p6-bench: /, ''));
    }
  }
  const next = nextLimit(rows);
  if (!next.allowed) {
    return stop(4, 'allowance', `${num(next.spent)} s counted of ${ALLOWANCE_S}; less than ${LIMIT_MIN_S} s left for an invocation`);
  }
  return { decision: 'run', limitS: next.limitS, spent: next.spent };
}

/**
 * @param {readonly Record<string, any>[]} oldRuns
 * @param {readonly Record<string, any>[]} newRuns
 * @returns {{ caseId: string, rep: number, old: Record<string, any>, new: Record<string, any> }[]} In cell order, then rep.
 */
export function pairRuns(oldRuns, newRuns) {
  /** @param {readonly Record<string, any>[]} runs */
  const index = (runs) => {
    /** @type {Map<string, Record<string, any>>} */
    const map = new Map();
    for (const run of runs) {
      const key = `${run.caseId}|${run.rep}`;
      if (!Number.isInteger(run.rep) || run.rep < 0 || run.rep >= SEEDS || run.seed !== `landscape/${run.caseId}/${run.rep}` || map.has(key)) {
        throw new Error(`p6-bench: unpaired run ${run.caseId} #${run.rep}`);
      }
      map.set(key, run);
    }
    return map;
  };
  const olds = index(oldRuns);
  const news = index(newRuns);
  for (const [key, run] of [...olds, ...news]) {
    if (!olds.has(key) || !news.has(key)) {
      throw new Error(`p6-bench: unpaired run ${run.caseId} #${run.rep}`);
    }
  }
  return [...olds.entries()]
    .map(([key, old]) => ({ caseId: /** @type {string} */ (old.caseId), rep: /** @type {number} */ (old.rep), old, new: /** @type {Record<string, any>} */ (news.get(key)) }))
    .sort((a, b) => cellOrder(a.caseId) - cellOrder(b.caseId) || (a.caseId < b.caseId ? -1 : a.caseId > b.caseId ? 1 : 0) || a.rep - b.rep);
}

/** @param {any} a @param {any} b @param {string} path @returns {string | null} The first differing path, or null. */
function firstDiff(a, b, path) {
  if (isDeepStrictEqual(a, b)) {
    return null;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
      const d = firstDiff(a[i], b[i], `${path}[${i}]`);
      if (d !== null) {
        return d;
      }
    }
  } else if (isObject(a) && isObject(b)) {
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const d = firstDiff(a[key], b[key], `${path}.${key}`);
      if (d !== null) {
        return d;
      }
    }
  }
  return path;
}

/** @param {any} details @returns {Record<string, any> | null} */
function withoutSampling(details) {
  if (!isObject(details)) {
    return null;
  }
  const copy = { ...details };
  for (const field of SAMPLING_FIELDS) {
    delete copy[field];
  }
  return copy;
}

/** @param {Record<string, any>} run @returns {string | null} The production result digest of the run. */
export function resultDigest(run) {
  const digest = run.details?.resultDigest;
  return typeof digest === 'string' ? digest : null;
}

/**
 * The identity of a pair on the production reports: only `equal` is an identity pass.
 * @param {Record<string, any>} oldRun
 * @param {Record<string, any>} newRun
 * @returns {{ category: 'equal' | 'differ' | 'metric-prefix-only' | 'no-puzzle-evidence' | 'incomplete', path: string | null }}
 */
export function identity(oldRun, newRun) {
  const oldAccepted = Number.isInteger(oldRun.acceptedCount) ? oldRun.acceptedCount : 0;
  const newAccepted = Number.isInteger(newRun.acceptedCount) ? newRun.acceptedCount : 0;
  if (oldAccepted < 1 || newAccepted < 1) {
    return { category: 'no-puzzle-evidence', path: null };
  }
  const oldDetails = withoutSampling(oldRun.details);
  const newDetails = withoutSampling(newRun.details);
  for (const [details, accepted] of /** @type {const} */ ([[oldDetails, oldAccepted], [newDetails, newAccepted]])) {
    if (details === null) {
      return { category: 'incomplete', path: 'details' };
    }
    const missing = SET_KEYS.find((k) => !(k in details));
    if (missing !== undefined) {
      return { category: 'incomplete', path: `details.${missing}` };
    }
    if (!Array.isArray(details.puzzles) || details.puzzles.length !== accepted) {
      return { category: 'incomplete', path: 'details.puzzles' };
    }
  }
  const [o, n] = [/** @type {Record<string, any>} */ (oldDetails), /** @type {Record<string, any>} */ (newDetails)];
  for (const key of SET_KEYS) {
    const d = firstDiff(o[key], n[key], `details.${key}`);
    if (d !== null) {
      return { category: 'differ', path: d };
    }
  }
  for (let i = 0; i < Math.min(oldAccepted, newAccepted); i += 1) {
    const d = firstDiff(o.puzzles[i], n.puzzles[i], `details.puzzles[${i}]`);
    if (d !== null) {
      return { category: 'differ', path: d };
    }
  }
  if (oldAccepted !== newAccepted) {
    return { category: 'metric-prefix-only', path: null };
  }
  if (typeof o.resultDigest !== 'string' || typeof n.resultDigest !== 'string') {
    return { category: 'incomplete', path: 'details.resultDigest' };
  }
  return o.resultDigest === n.resultDigest ? { category: 'equal', path: null } : { category: 'differ', path: 'details.resultDigest' };
}

/** @param {readonly Record<string, any>[]} runs @param {string} id @returns {{ status: string, value: number | string | null, limit: number | string }} */
function checkOf(runs, id) {
  const found = evaluateCell(/** @type {any} */ (runs)).checks.find((c) => c.id === id);
  if (found === undefined) {
    throw new Error(`p6-bench: the bench has no check ${id}`);
  }
  return { status: found.status, value: found.value, limit: found.limit };
}

/**
 * @param {readonly Record<string, any>[]} runs The generation rows of one side of a cell (or of a level).
 */
export function cellStats(runs) {
  const records = /** @type {any[]} */ (runs);
  const withTen = records.filter((r) => r.acceptedCount >= 10);
  /** @type {Record<string, number>} */
  const accepted = {};
  for (const run of records) {
    accepted[run.acceptedCount] = (accepted[run.acceptedCount] ?? 0) + 1;
  }
  const peaks = (/** @type {string} */ field) => {
    const values = records.map((r) => r[field]).filter(isNum);
    return values.length === 0 ? null : Math.max(...values);
  };
  return {
    n: records.length,
    tenOfN: withTen.length,
    tenOrProvenAllOfN: records.filter((r) => r.acceptedCount >= 10 || returnedEveryArrangement(r)).length,
    t1: summarize(records.map((r) => r.firstReadyMs).filter(isPos)),
    t10: summarize(withTen.map((r) => r.tenthReadyMs).filter(isPos)),
    response: summarize(records.map((r) => r.responseMs).filter(isPos)),
    accepted: Object.fromEntries(Object.entries(accepted).sort((a, b) => Number(a[0]) - Number(b[0]))),
    peakProcessMax: peaks('peakProcessBytes'),
    peakAccountedMax: peaks('peakAccountedBytes'),
    checks: {
      peakProcessMemory: checkOf(records, 'peak-process-memory'),
      byteAccounting: checkOf(records, 'byte-accounting'),
      modelTooLarge: checkOf(records, 'model-too-large'),
    },
    samplingErrors: records.reduce((sum, r) => sum + r.errors.filter((/** @type {{ phase: string }} */ e) => e.phase === 'sampling').length, 0),
  };
}

/**
 * Old over new, per pair, where both endpoints are finite and positive.
 * @param {readonly { old: Record<string, any>, new: Record<string, any> }[]} pairs
 * @returns {Record<string, { n: number, median: number | null, min: number | null, max: number | null, excluded: number }>}
 */
export function pairedRatios(pairs) {
  /** @type {Record<string, (r: Record<string, any>) => number | null>} */
  const value = {
    t1: (r) => (isPos(r.firstReadyMs) ? r.firstReadyMs : null),
    t10: (r) => (r.acceptedCount >= 10 && isPos(r.tenthReadyMs) ? r.tenthReadyMs : null),
    t10MinusT1: (r) => (r.acceptedCount >= 10 && isPos(r.tenthReadyMs) && isPos(r.firstReadyMs) && r.tenthReadyMs > r.firstReadyMs ? r.tenthReadyMs - r.firstReadyMs : null),
    response: (r) => (isPos(r.responseMs) ? r.responseMs : null),
  };
  return Object.fromEntries(METRICS.map((metric) => {
    /** @type {number[]} */
    const ratios = [];
    for (const pair of pairs) {
      const [o, n] = [value[metric](pair.old), value[metric](pair.new)];
      if (o !== null && n !== null) {
        ratios.push(o / n);
      }
    }
    const s = summarize(ratios);
    return [metric, { n: ratios.length, median: ratios.length < 3 ? null : s.median, min: s.min, max: s.max, excluded: pairs.length - ratios.length }];
  }));
}

/**
 * The checks of step 6 on one terminal report.
 * @param {unknown} report
 * @param {{ side: 'old' | 'new', group: 'A' | 'B', newCommit: string }} expected
 * @returns {string[]} Problems; empty when the report is acceptable.
 */
export function validateReport(report, { side, group, newCommit }) {
  if (!isObject(report)) {
    return ['the report is not an object'];
  }
  /** @type {string[]} */
  const problems = [];
  const bad = (/** @type {string} */ text) => {
    problems.push(text);
  };
  const meta = isObject(report.meta) ? report.meta : {};
  if (report.format !== REPORT_FORMAT) {
    bad(`the format is not ${REPORT_FORMAT}`);
  }
  if (report.complete !== true) {
    bad('the report is not complete');
  }
  if (meta.kind !== 'node' || meta.profile !== 'landscape' || meta.workerCount !== WORKERS || meta.lifecycle !== 'cold') {
    bad('the report is not a cold four-worker landscape run of node');
  }
  if (meta.sourceCommit !== (side === 'old' ? OLD_COMMIT : newCommit)) {
    bad(`the source commit is ${meta.sourceCommit}`);
  }
  if (side === 'old' ? meta.sourceDigest !== OLD_DIGEST : typeof meta.sourceDigest !== 'string' || !HEX64.test(meta.sourceDigest)) {
    bad(`the source digest is ${meta.sourceDigest}`);
  }
  for (const key of ['matrixDigest', 'startedAt', 'finishedAt', 'browserOrNode', 'platform']) {
    if (typeof meta[key] !== 'string' || meta[key] === '') {
      bad(`meta.${key} is missing`);
    }
  }
  const hardware = meta.hardware;
  if (!isObject(hardware) || typeof hardware.cpu !== 'string' || !isNum(hardware.logicalCores) || !isNum(hardware.totalMemoryBytes)
    || typeof hardware.node !== 'string' || !Array.isArray(hardware.execArgv) || !hardware.execArgv.includes(HEAP_FLAG)) {
    bad(`meta.hardware lacks cpu, logicalCores, totalMemoryBytes, node or execArgv with ${HEAP_FLAG}`);
  }
  if (!Array.isArray(report.runs)) {
    return [...problems, 'the report has no rows'];
  }
  const cells = new Set(GROUPS[group]);
  const seen = new Set();
  for (const run of report.runs) {
    const shown = isObject(run) ? `${run.caseId} #${run.rep}` : 'a row';
    const invalid = validateRunRecord(run);
    if (invalid.length > 0) {
      bad(`${shown}: ${invalid[0]}`);
      continue;
    }
    const key = `${run.caseId}|${run.rep}`;
    if (!cells.has(run.caseId) || !Number.isInteger(run.rep) || run.rep < 0 || run.rep >= SEEDS) {
      bad(`${shown} is not a row of group ${group}`);
      continue;
    }
    if (seen.has(key)) {
      bad(`${shown} is recorded twice`);
    }
    seen.add(key);
    if (run.probeKind !== 'generation') {
      bad(`${shown} is a ${run.probeKind} row`);
    }
    if (run.measurementValid !== true || run.interrupted !== false) {
      bad(`${shown} is not a valid, uninterrupted measurement${run.errors.length > 0 ? ` (${run.errors[0].phase}/${run.errors[0].code})` : ''}`);
    }
    if (run.seed !== `landscape/${run.caseId}/${run.rep}`) {
      bad(`${shown} has the seed ${run.seed}`);
    }
    for (const field of ['sourceCommit', 'sourceDigest', 'browserOrNode', 'platform', 'workerCount', 'lifecycle']) {
      if (run[field] !== meta[field]) {
        bad(`${shown}: ${field} differs from the report's`);
      }
    }
    if (!isDeepStrictEqual(run.versions, meta.versions)) {
      bad(`${shown}: versions differ from the report's`);
    }
    const other = run.errors.find((/** @type {{ phase: string }} */ e) => e.phase !== 'sampling');
    if (other !== undefined) {
      bad(`${shown} has an error of phase ${other.phase} (${other.code})`);
    }
    if (run.acceptedCount >= 10 && !isPos(run.tenthReadyMs)) {
      bad(`${shown} has ten puzzles and no finite positive T10`);
    }
    if (!isPos(run.responseMs)) {
      bad(`${shown} has no finite positive response`);
    }
  }
  for (const caseId of GROUPS[group]) {
    for (let rep = 0; rep < SEEDS; rep += 1) {
      if (!seen.has(`${caseId}|${rep}`)) {
        bad(`${caseId} #${rep} is missing`);
      }
    }
  }
  return problems;
}

/** @param {string} label @param {string} text @returns {string[]} */
function textProblems(label, text) {
  /** @type {string[]} */
  const problems = [];
  if (/\r(?!\n)/.test(text) || /(?<!\r)\n/.test(text)) {
    problems.push(`${label} is not CRLF only`);
  }
  if (DRIVE_PATH.test(text)) {
    problems.push(`${label} holds a drive-letter path`);
  }
  return problems;
}

/**
 * @typedef {object} ReportInput
 * @property {'A' | 'B'} group
 * @property {'old' | 'new'} side
 * @property {string} path Repository path of the terminal report (as in the ledger).
 * @property {Uint8Array} bytes The raw bytes of the report.
 * @property {string} mdPath
 * @property {Uint8Array} mdBytes The raw bytes of the report's Markdown.
 */

/**
 * The comparison of the four terminal reports; refuses (throws `p6-bench: <reason>`) rather than compare invalid or
 * inconsistent inputs. It reads no clock: the same inputs give the same bytes.
 * @param {{ reports: readonly ReportInput[], ledger: readonly LedgerLine[], pending: unknown, newCommit: string, raw?: string }} input
 */
export function compareReports({ reports, ledger, pending, newCommit, raw = RAW }) {
  /** @type {(reason: string) => never} */
  const refuse = (reason) => {
    throw new Error(`p6-bench: ${reason}`);
  };
  if (!HEX40.test(newCommit)) {
    refuse('--new-commit is not a full commit');
  }
  if (pending !== null && pending !== undefined) {
    refuse('an invocation is not reconciled: pending.json');
  }
  const counted = ledger.reduce((sum, r) => sum + r.countedSeconds, 0);
  if (counted > ALLOWANCE_S) {
    refuse(`the ledger totals ${num(counted)} s, above the allowance of ${ALLOWANCE_S} s`);
  }
  if (ledger.some((r) => r.commit !== (r.side === 'old' ? OLD_COMMIT : newCommit))) {
    refuse('ledger source does not match this comparison');
  }
  /** @type {Record<string, { input: ReportInput, report: Record<string, any>, line: LedgerLine }>} */
  const byKey = {};
  for (const [group, side] of /** @type {readonly ['A' | 'B', 'old' | 'new'][]} */ (ORDER)) {
    const label = `${group} ${side}`;
    const lines = ledger.filter((r) => r.group === group && r.side === side && r.exit === 0);
    if (lines.length !== 1) {
      refuse(`${label} has ${lines.length} ledger lines with exit 0, exactly one is required`);
    }
    const line = lines[0];
    const input = reports.find((r) => r.group === group && r.side === side);
    if (input === undefined) {
      refuse(`the terminal report of ${label} is missing`);
    }
    if (input.path !== line.report || sha256(input.bytes) !== line.reportSha256 || !reportPathPattern(group, side, raw).test(input.path)) {
      refuse(`the terminal report of ${label} does not have the path and the SHA-256 of its ledger line`);
    }
    /** @type {unknown} */
    let report;
    try {
      report = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(input.bytes));
    } catch {
      refuse(`the terminal report of ${label} is not valid JSON`);
    }
    const problems = validateReport(report, { side, group, newCommit });
    if (problems.length > 0) {
      refuse(`${label}: ${problems.slice(0, 6).join('; ')}`);
    }
    const texts = [textProblems(input.path, new TextDecoder().decode(input.bytes)), textProblems(input.mdPath, new TextDecoder().decode(input.mdBytes))].flat();
    if (texts.length > 0) {
      refuse(texts.join('; '));
    }
    byKey[`${group}|${side}`] = { input, report: /** @type {Record<string, any>} */ (report), line };
  }
  const all = ORDER.map(([group, side]) => byKey[`${group}|${side}`]);
  const same = (/** @type {string} */ name, /** @type {(m: Record<string, any>) => unknown} */ pick) => {
    if (!all.every((e) => isDeepStrictEqual(pick(e.report.meta), pick(all[0].report.meta)))) {
      refuse(`the four reports do not share one ${name}`);
    }
  };
  same('browserOrNode', (m) => m.browserOrNode);
  same('platform', (m) => m.platform);
  same('hardware', (m) => m.hardware);
  for (const group of ['A', 'B']) {
    if (byKey[`${group}|old`].report.meta.matrixDigest !== byKey[`${group}|new`].report.meta.matrixDigest) {
      refuse(`old and new have different matrix digests in group ${group}`);
    }
  }
  if (byKey['A|new'].report.meta.sourceDigest !== byKey['B|new'].report.meta.sourceDigest) {
    refuse('the new reports have two source digests');
  }
  const rowsOf = (/** @type {'old' | 'new'} */ side) => /** @type {Record<string, any>[]} */ ([...byKey[`A|${side}`].report.runs, ...byKey[`B|${side}`].report.runs]);
  const pairs = pairRuns(rowsOf('old'), rowsOf('new')).map((p) => ({ ...p, identity: identity(p.old, p.new), oldDigest: resultDigest(p.old), newDigest: resultDigest(p.new) }));
  for (const pair of pairs) {
    if (pair.identity.category === 'differ' || pair.identity.category === 'incomplete') {
      refuse(`the pair ${pair.caseId} seed ${pair.old.seed} is ${pair.identity.category} at ${pair.identity.path}`);
    }
  }
  /** @param {readonly string[]} caseIds */
  const section = (caseIds) => {
    const chosen = pairs.filter((p) => caseIds.includes(p.caseId));
    return {
      old: cellStats(chosen.map((p) => p.old)),
      new: cellStats(chosen.map((p) => p.new)),
      ratios: pairedRatios(chosen),
      identity: {
        pairs: chosen.length,
        equal: chosen.filter((p) => p.identity.category === 'equal').length,
        metricPrefixOnly: chosen.filter((p) => p.identity.category === 'metric-prefix-only').length,
        noPuzzleEvidence: chosen.filter((p) => p.identity.category === 'no-puzzle-evidence').length,
        differ: 0,
        incomplete: 0,
      },
    };
  };
  const cells = CELLS.map((caseId) => ({ caseId, level: levelOf(caseId), group: GROUPS.A.includes(caseId) ? 'A' : 'B', ...section([caseId]) }));
  for (const one of cells) {
    for (const side of /** @type {const} */ (['old', 'new'])) {
      for (const [name, check] of Object.entries(one[side].checks)) {
        if (check.status !== 'pass') {
          refuse(`the memory check ${name} of ${side} ${one.caseId} is ${check.status} (${check.value} against ${check.limit})`);
        }
      }
    }
  }
  const levels = LEVELS.map((level) => {
    const ids = CELLS.filter((c) => levelOf(c) === level);
    return { level, cells: ids, ...section(ids) };
  });
  const oldMeta = byKey['A|old'].report.meta;
  const newMeta = byKey['A|new'].report.meta;
  return {
    format: 'ig-proto-p6-bench-compare',
    version: 1,
    task: TASK,
    statement: STATEMENT,
    commits: { old: OLD_COMMIT, new: newCommit },
    digests: { old: OLD_DIGEST, new: newMeta.sourceDigest },
    machine: { browserOrNode: oldMeta.browserOrNode, platform: oldMeta.platform, hardware: oldMeta.hardware },
    reports: ORDER.map(([group, side]) => {
      const e = byKey[`${group}|${side}`];
      return {
        group, side, file: `${side}/${basename(e.input.path)}`, sha256: e.line.reportSha256, startedAt: e.report.meta.startedAt,
        finishedAt: e.report.meta.finishedAt, matrixDigest: e.report.meta.matrixDigest, rows: e.report.runs.length, versions: e.report.meta.versions,
      };
    }),
    cells,
    levels,
    identity: {
      ...section([...CELLS]).identity,
      list: pairs.map((p) => ({
        caseId: p.caseId, rep: p.rep, seed: p.old.seed, category: p.identity.category, oldAccepted: p.old.acceptedCount,
        newAccepted: p.new.acceptedCount, oldDigest: p.oldDigest, newDigest: p.newDigest,
      })),
    },
    memory: { processLimitBytes: CRITERIA.processBytes, accountedLimitBytes: WORKERS * WORKER_LIMIT_BYTES + MAIN_BUDGET_BYTES },
    ledger: {
      invocations: ledger.length,
      countedSeconds: counted,
      allowanceSeconds: ALLOWANCE_S,
      lines: ledger.map((r) => ({
        group: r.group, side: r.side, limitS: r.limitS, nodeSeconds: r.nodeSeconds, lockWaitSeconds: r.lockWaitSeconds, quietS: r.quietS,
        countedSeconds: r.countedSeconds, killed: r.killed, exit: r.exit,
      })),
    },
    limitations: [...LIMITATIONS],
  };
}

/** @typedef {ReturnType<typeof compareReports>} Comparison */

/** @param {number | null} ms @returns {string} */
const fmtS = (ms) => (ms === null ? 'n/a' : ms >= 10000 ? `${(ms / 1000).toFixed(1)} s` : `${(ms / 1000).toFixed(2)} s`);
/** @param {number | null} b @returns {string} */
const fmtMiB = (b) => (b === null ? 'n/a' : `${(b / 1048576).toFixed(1)} MiB`);
/** @param {{ n: number, median: number | null, min: number | null, max: number | null }} r @returns {string} */
const fmtRatio = (r) => (r.min === null || r.max === null ? `n/a n ${r.n}` : `${r.median === null ? 'n/a' : `x${r.median.toFixed(2)}`} [${r.min.toFixed(2)}-${r.max.toFixed(2)}] n ${r.n}`);
/** @param {string} text @returns {string} */
const mdCell = (text) => text.replace(/\|/g, '/');

/**
 * @param {Comparison} result
 * @returns {string} The compare.md text (LF).
 */
export function renderMarkdown(result) {
  const o = result.commits.old;
  const n = result.commits.new;
  const hw = /** @type {Record<string, any>} */ (result.machine.hardware);
  const dates = result.reports.map((r) => `${r.group} ${r.side} ${r.startedAt} to ${r.finishedAt}`);
  const lines = [
    '# Phase-1 bench of P6: puzzle generation time of the old and the new version', '',
    `> ${STATEMENT}.`, '',
    '## 1. Sources and machine', '',
    '| Item | Value |', '| --- | --- |',
    `| Old version | main \`${o.slice(0, 7)}\` (\`${o}\`), source digest \`${result.digests.old}\` |`,
    `| New version | this branch \`${n.slice(0, 7)}\` (\`${n}\`; its only production change is P6, T12), source digest \`${result.digests.new}\` |`,
    `| Node | ${mdCell(result.machine.browserOrNode)}, flags \`${mdCell(hw.execArgv.join(' '))}\`, four workers, cold, one fresh process per request |`,
    `| Machine | ${mdCell(String(hw.cpu))}, ${hw.logicalCores} logical cores, ${(hw.totalMemoryBytes / 1073741824).toFixed(1)} GiB, ${mdCell(result.machine.platform)} |`,
    '| Profile | `landscape`, seeds `landscape/<case>/0` to `4` on both versions |',
    `| Reports | ${dates.join('; ')} |`,
    '', 'T1 is the click to the validated set and its calibration puzzle, T10 the click to the tenth accepted puzzle (only the requests that reached ten), the response the click to the final answer. A paired ratio is old over new for the same seed: above 1 the new version is faster.', '',
    '## 2. Results per cell', '',
  ];
  for (const c of result.cells) {
    lines.push(`### ${c.caseId} (${c.level}, group ${c.group})`, '', '| Measure | old | new |', '| --- | ---: | ---: |');
    const row = (/** @type {string} */ label, /** @type {(s: typeof c.old) => string} */ pick) => lines.push(`| ${label} | ${pick(c.old)} | ${pick(c.new)} |`);
    row('requests (n)', (s) => String(s.n));
    row('ten of n', (s) => `${s.tenOfN}/${s.n}`);
    row('ten or proven-all of n', (s) => `${s.tenOrProvenAllOfN}/${s.n}`);
    row('T1 median', (s) => fmtS(s.t1.median));
    row('T1 p95', (s) => fmtS(s.t1.p95));
    row('T10 median (conditional)', (s) => `${fmtS(s.t10.median)} (n ${s.t10.n})`);
    row('T10 p95 (conditional)', (s) => `${fmtS(s.t10.p95)} (n ${s.t10.n})`);
    row('response median', (s) => fmtS(s.response.median));
    row('response p95', (s) => fmtS(s.response.p95));
    row('response max', (s) => fmtS(s.response.max));
    row('accepted puzzles (count: requests)', (s) => Object.entries(s.accepted).map(([k, v]) => `${k}: ${v}`).join(', '));
    row('peak process memory', (s) => fmtMiB(s.peakProcessMax));
    row('peak accounted memory', (s) => fmtMiB(s.peakAccountedMax));
    row('sampling errors (post-timing)', (s) => String(s.samplingErrors));
    lines.push('', 'Paired ratios old/new (median [min-max] n; excluded pairs):', '');
    for (const m of METRICS) {
      lines.push(`- ${METRIC_LABELS[m]}: ${fmtRatio(c.ratios[m])}; ${c.ratios[m].excluded} excluded`);
    }
    lines.push('', `Identity: ${c.identity.equal} of ${c.identity.pairs} pairs \`equal\`, ${c.identity.metricPrefixOnly} \`metric-prefix-only\`, ${c.identity.noPuzzleEvidence} \`no-puzzle-evidence\`, 0 \`differ\`.`, '');
  }
  lines.push('## 3. Pooled paired ratios per level', '', '| Level | Cells | T1 | T10 | T10 - T1 | Response |', '| --- | --- | ---: | ---: | ---: | ---: |');
  for (const l of result.levels) {
    lines.push(`| ${l.level} | ${l.cells.join(', ')} | ${METRICS.map((m) => fmtRatio(l.ratios[m])).join(' | ')} |`);
  }
  const id = result.identity;
  lines.push('', 'Median [min-max] n of old over new, the pairs of the level pooled.', '',
    '## 4. Identity of the puzzles', '',
    `${id.equal} of ${id.pairs} pairs are \`equal\` (equal production result digests and summaries at equal accepted counts), ${id.metricPrefixOnly} are \`metric-prefix-only\` (puzzle-prefix identity not established), ${id.noPuzzleEvidence} are \`no-puzzle-evidence\`, 0 \`differ\`. A \`metric-prefix-only\` pair has matching summaries of its common puzzles at unequal accepted counts; it does not establish that the puzzles are prefix-identical.`, '',
    'T12\'s parity tests and the unchanged fixtures remain the compatibility evidence.', '',
    '<details>', `<summary>The production digests of the ${id.pairs} pairs</summary>`, '',
    '| Cell | Seed | Accepted old/new | Identity | Old digest | New digest |', '| --- | --- | --- | --- | --- | --- |');
  for (const p of id.list) {
    lines.push(`| ${p.caseId} | \`${p.seed}\` | ${p.oldAccepted}/${p.newAccepted} | ${p.category} | ${p.oldDigest === null ? 'n/a' : `\`${p.oldDigest}\``} | ${p.newDigest === null ? 'n/a' : `\`${p.newDigest}\``} |`);
  }
  lines.push('', '</details>', '', '## 5. Memory checks (phase 1\'s gate, N-V4-12)', '',
    `The whole-process peak must be at most ${fmtMiB(result.memory.processLimitBytes)} (\`peak-process-memory\`) and the accounted peak at most ${fmtMiB(result.memory.accountedLimitBytes)} at four workers (\`byte-accounting\`); each must be \`pass\`, and \`model-too-large\` 0.`, '',
    '| Cell | Side | Peak process | peak-process-memory | Peak accounted | byte-accounting | model-too-large |', '| --- | --- | ---: | --- | ---: | --- | --- |');
  for (const c of result.cells) {
    for (const side of /** @type {const} */ (['old', 'new'])) {
      const s = c[side];
      lines.push(`| ${c.caseId} | ${side} | ${fmtMiB(s.peakProcessMax)} | ${s.checks.peakProcessMemory.status} | ${fmtMiB(s.peakAccountedMax)} | ${s.checks.byteAccounting.status} | ${s.checks.modelTooLarge.status} (${s.checks.modelTooLarge.value}) |`);
    }
  }
  lines.push('', '## 6. Ledger of the owner\'s separate allowance', '',
    `${result.ledger.invocations} invocations, ${num(result.ledger.countedSeconds)} counted seconds of the allowance of ${result.ledger.allowanceSeconds} s (counted = node seconds + the lock wait, at most 45 s).`, '',
    '| Group | Side | Limit (s) | Node (s) | Lock wait (s) | Quiet (s) | Counted (s) | Killed | Exit |', '| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |');
  for (const l of result.ledger.lines) {
    lines.push(`| ${l.group} | ${l.side} | ${l.limitS} | ${num(l.nodeSeconds)} | ${num(l.lockWaitSeconds)} | ${l.quietS ?? 'n/a'} | ${num(l.countedSeconds)} | ${l.killed} | ${l.exit ?? 'n/a'} |`);
  }
  lines.push('', '## 7. Limitations', '', ...result.limitations.map((t) => `- ${t}`), '');
  return lines.join('\n');
}

/** @param {string} text @returns {string} */
const esc = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const CHART = Object.freeze({ width: 1200, height: 720, x0: 250, axisWidth: 560, top: 118, rowHeight: 68, barHeight: 22, ratioX: 985, old: '#9e9e9e', new: '#1f77b4' });
const TICKS = Object.freeze([1, 2, 5, 10, 20, 50, 100, 200]);

/**
 * @param {Comparison} result
 * @returns {{ svg: string, html: string }} The chart of the median response per cell (LF; the writers add CRLF).
 */
export function renderChart(result) {
  const { width, height, x0, axisWidth, top, rowHeight, barHeight } = CHART;
  const xOf = (/** @type {number} */ seconds) => x0 + (Math.log10(Math.min(200, Math.max(1, seconds))) / Math.log10(200)) * axisWidth;
  const hw = /** @type {Record<string, any>} */ (result.machine.hardware);
  const dates = [...new Set(result.reports.flatMap((r) => [r.startedAt.slice(0, 10), r.finishedAt.slice(0, 10)]))].sort();
  const date = dates.length === 1 ? dates[0] : `${dates[0]} to ${dates[dates.length - 1]}`;
  const id = result.identity;
  const [oldShort, newShort] = [result.commits.old.slice(0, 7), result.commits.new.slice(0, 7)];
  const out = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="system-ui, 'Segoe UI', Arial, sans-serif" fill="#222222">`,
    `<title>Puzzle generation time per request: main ${oldShort} against ${newShort}</title>`,
    `<rect width="${width}" height="${height}" fill="#ffffff"/>`,
    `<text x="16" y="32" font-size="20" font-weight="bold">${esc(`Puzzle generation time per request (median response, five seeds per cell): main ${oldShort} against ${newShort} (P6)`)}</text>`,
    `<text x="16" y="54" font-size="13" fill="#555555">${esc(`${result.machine.browserOrNode}, four workers, cold, ${hw.cpu}, ${date}`)}</text>`,
    `<rect x="16" y="68" width="14" height="14" fill="${CHART.old}"/><text x="36" y="80" font-size="13">old (main ${oldShort})</text>`,
    `<rect x="190" y="68" width="14" height="14" fill="${CHART.new}"/><text x="210" y="80" font-size="13">new (${newShort})</text>`,
    `<text x="${CHART.ratioX}" y="86" font-size="12" fill="#555555">paired response ratio old/new</text>`,
    `<text x="${CHART.ratioX}" y="102" font-size="12" fill="#555555">median [min-max] n</text>`,
  ];
  const bottom = top + result.cells.length * rowHeight;
  for (const tick of TICKS) {
    const x = xOf(tick).toFixed(1);
    out.push(`<line x1="${x}" y1="${top - 8}" x2="${x}" y2="${bottom}" stroke="#dddddd" stroke-width="1"/>`,
      `<text x="${x}" y="${top - 12}" font-size="12" text-anchor="middle" fill="#555555">${tick} s</text>`);
  }
  result.cells.forEach((c, i) => {
    const y = top + i * rowHeight;
    out.push(`<text x="16" y="${y + 30}" font-size="14" font-weight="bold">${esc(c.caseId)}</text>`, `<text x="16" y="${y + 47}" font-size="12" fill="#555555">${esc(c.level)}</text>`);
    for (const [k, side] of /** @type {const} */ ([[0, 'old'], [1, 'new']])) {
      const stats = c[side];
      const y0 = y + 4 + k * (barHeight + 8);
      const median = stats.response.median;
      const x1 = median === null ? x0 : xOf(median / 1000);
      out.push(`<rect class="bar" data-side="${side}" x="${x0}" y="${y0}" width="${Math.max(2, x1 - x0).toFixed(1)}" height="${barHeight}" fill="${CHART[side]}"/>`,
        `<text x="${(Math.max(x1, x0 + 2) + 8).toFixed(1)}" y="${y0 + 16}" font-size="13">${esc(`${fmtS(median)}, ${stats.tenOfN}/${stats.n} ten`)}</text>`);
    }
    out.push(`<text x="${CHART.ratioX}" y="${y + 34}" font-size="14" font-weight="bold">${esc(fmtRatio(c.ratios.response))}</text>`);
  });
  const foot = bottom + 28;
  out.push(`<text x="16" y="${foot}" font-size="12" fill="#555555">Node screening evidence, not a browser qualification.</text>`,
    `<text x="16" y="${foot + 18}" font-size="12" fill="#555555">${esc(`Production-digest equality established on ${id.equal} of ${id.pairs} pairs; ${id.metricPrefixOnly} pairs have metric-prefix agreement only and ${id.noPuzzleEvidence} have no common puzzle evidence.`)}</text>`,
    `<text x="16" y="${foot + 36}" font-size="12" fill="#555555">Prefix identity is not established by those summaries.</text>`, '</svg>');
  const svg = `${out.join('\n')}\n`;
  const html = ['<!DOCTYPE html>', '<html lang="en">', '<head>', '<meta charset="utf-8">',
    `<title>Puzzle generation time per request: main ${oldShort} against ${newShort}</title>`,
    '<style>', 'html, body { margin: 0; padding: 0; background: #ffffff; }', 'svg { display: block; }', '</style>', '</head>', '<body>', svg.trimEnd(), '</body>', '</html>', ''].join('\n');
  return { svg, html };
}

/** @param {string} path @returns {string | null} */
function readIfExists(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : null;
}

/** @param {string} raw @returns {LedgerLine[]} */
function readRawLedger(raw) {
  const text = readIfExists(abs(`${raw}/ledger.jsonl`));
  return text === null ? [] : readLedger(text);
}

/** @param {string} path @param {Uint8Array} bytes @returns {void} A byte copy of a raw report (never converted). */
function writeBytes(path, bytes) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
}

/**
 * @param {string[]} argv
 * @param {{ out: (text: string) => void, err: (text: string) => void }} [io]
 * @param {{ raw: string, evidence: string }} [paths] The raw and the evidence folders (scratch ones in the self-test).
 * @returns {number}
 */
export function main(argv, io = { out: (t) => process.stdout.write(t), err: (t) => process.stderr.write(t) }, paths = { raw: RAW, evidence: EVIDENCE }) {
  const { raw, evidence } = paths;
  try {
    const [command, ...rest] = argv;
    const { args, on } = parseArgs(rest, { values: ['group', 'side', 'new-commit'], switches: ['resume-instructed'] });
    const newCommit = args['new-commit'];
    if (newCommit === undefined || !HEX40.test(newCommit)) {
      throw new Error('p6-bench: --new-commit <the full commit under test> is required');
    }
    if (command === 'preflight') {
      const group = /** @type {'A' | 'B'} */ (args.group);
      const side = /** @type {'old' | 'new'} */ (args.side);
      if (!Object.hasOwn(GROUPS, group ?? '') || (side !== 'old' && side !== 'new')) {
        throw new Error('p6-bench: usage: preflight --group A|B --side old|new --new-commit <C> [--resume-instructed]');
      }
      const rows = readRawLedger(raw);
      const done = rows.filter((r) => r.group === group && r.side === side && r.exit === 0);
      /** @type {{ path: string, sha256: string, report: unknown } | null} */
      let completedReport = null;
      if (done.length === 1 && typeof done[0].report === 'string' && existsSync(abs(done[0].report))) {
        const bytes = readFileSync(abs(done[0].report));
        /** @type {unknown} */
        let report = null;
        try {
          report = JSON.parse(bytes.toString('utf8'));
        } catch {
          report = null;
        }
        completedReport = { path: done[0].report, sha256: sha256(bytes), report };
      }
      const decision = preflight({
        rows, pending: readIfExists(abs(`${raw}/pending.json`)), group, side, checkpoint: readIfExists(abs(`${raw}/${side}/${group}.checkpoint.jsonl`)),
        resumeInstructed: on.has('resume-instructed'), newCommit, completedReport, raw,
      });
      if (decision.decision === 'run') {
        io.out(`p6-bench: run ${group} ${side} with a limit of ${decision.limitS} s; ${num(decision.spent)} s counted of ${ALLOWANCE_S}\n`);
        return 0;
      }
      if (decision.decision === 'complete') {
        io.out(`p6-bench: ${group} ${side} is complete (ledger line ${decision.line}, ${decision.report}); nothing to run\n`);
        return 7;
      }
      io.err(`p6-bench: STOP (${decision.kind}): ${decision.reason}\n`);
      return decision.code;
    }
    if (command === 'compare') {
      const ledger = readRawLedger(raw);
      /** @type {ReportInput[]} */
      const reports = [];
      for (const [group, side] of /** @type {readonly ['A' | 'B', 'old' | 'new'][]} */ (ORDER)) {
        const line = ledger.find((r) => r.group === group && r.side === side && r.exit === 0);
        if (line === undefined || typeof line.report !== 'string' || !reportPathPattern(group, side, raw).test(line.report)) {
          throw new Error(`p6-bench: ${group} ${side} has no ledger line with exit 0 and a terminal report`);
        }
        const mdPath = line.report.replace(/\.json$/, '.md');
        if (!existsSync(abs(line.report)) || !existsSync(abs(mdPath))) {
          throw new Error(`p6-bench: the terminal report of ${group} ${side} or its Markdown is missing`);
        }
        reports.push({ group, side, path: line.report, bytes: readFileSync(abs(line.report)), mdPath, mdBytes: readFileSync(abs(mdPath)) });
      }
      const result = compareReports({ reports, ledger, pending: readIfExists(abs(`${raw}/pending.json`)), newCommit, raw });
      const chart = renderChart(result);
      /** @type {{ path: string, expected: string | Uint8Array, text: boolean, write: () => void }[]} */
      const outputs = [];
      for (const r of reports) {
        for (const [from, bytes] of /** @type {const} */ ([[r.path, r.bytes], [r.mdPath, r.mdBytes]])) {
          const target = abs(`${evidence}/${r.side}/${basename(from)}`);
          outputs.push({ path: target, expected: bytes, text: false, write: () => writeBytes(target, bytes) });
        }
      }
      const addText = (/** @type {string} */ name, /** @type {string} */ body) => {
        const target = abs(`${evidence}/${name}`);
        outputs.push({ path: target, expected: toCrlf(body), text: true, write: () => writeText(target, body) });
      };
      const ledgerTarget = abs(`${evidence}/ledger.jsonl`);
      outputs.push({ path: ledgerTarget, expected: toCrlf(ledger.map((r) => JSON.stringify(r)).join('\n')), text: true, write: () => writeJsonl(ledgerTarget, ledger) });
      const jsonTarget = abs(`${evidence}/compare.json`);
      outputs.push({ path: jsonTarget, expected: toCrlf(JSON.stringify(result, null, 2)), text: true, write: () => writeJson(jsonTarget, result) });
      addText('compare.md', renderMarkdown(result));
      addText('chart.svg', chart.svg);
      addText('chart.html', chart.html);
      // Everything is checked before anything is written: a refused publication writes nothing.
      for (const o of outputs) {
        const expected = Buffer.from(o.expected);
        if (o.text) {
          const problems = [...checkText(rel(o.path), expected), ...(DRIVE_PATH.test(expected.toString('utf8')) ? [`${rel(o.path)} would contain a drive-letter path`] : [])];
          if (problems.length > 0) {
            throw new Error(`p6-bench: ${problems[0]}`);
          }
        }
        if (existsSync(o.path) && !readFileSync(o.path).equals(expected)) {
          throw new Error(`p6-bench: ${rel(o.path)} exists with other bytes`);
        }
      }
      for (const o of outputs) {
        if (!existsSync(o.path)) {
          o.write();
        }
        io.out(`wrote ${rel(o.path)}\n`);
      }
      return 0;
    }
    throw new Error('p6-bench: usage: (preflight --group A|B --side old|new | compare) --new-commit <C> [--resume-instructed]');
  } catch (e) {
    io.err(`${e instanceof Error ? e.message : String(e)}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main(process.argv.slice(2));
}
