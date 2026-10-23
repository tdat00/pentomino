// @ts-check
// Node benchmark and calibration runner (design §7.8, §8.7; T21). It drives the
// shared runner of tools/bench/ with four worker_threads and the production
// generation client; it never contains an algorithm of its own.
//
//   node --max-old-space-size=2048 tools/calibrate.mjs --matrix tools/bench/matrices/smoke.json --workers 4 --fresh-process --output docs/calibration/node-smoke
//   node --max-old-space-size=2048 tools/calibrate.mjs --profile landscape --workers 4 --seeds 20 --fresh-process --output docs/calibration/landscape
//
// `--fresh-process` runs every row in its own child process, so retained history
// never leaks between rows and `maxRSS` is the exact whole-process peak (workers
// included). A child that exits, crashes or is stopped by its watchdog still
// yields a recorded row. Node results are screening evidence: they never replace
// browser measurements and never change a qualification gate.
//
// Output: <output>.json, <output>.md and a resumable <output>.checkpoint.jsonl
// (one line per finished row; resumed only for an identical code digest,
// versions, matrix and measurement mode). The landscape profile appends the
// date to the report names: landscape-<date>.json/.md.
import { execFileSync, spawn } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { availableParallelism, cpus, release, totalmem } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { createPool, MAX_POOL_SIZE, systemClock } from '../core/browser/worker-pool.js';
import { APP_VERSION } from '../core/engine/version.js';
import { aggregateLandscape, buildLandscapeMatrix, LANDSCAPE_SEEDS, matrixDigest, renderLandscapeMarkdown } from './bench/calibration-reference.js';
import {
  buildReport, computeSourceDigest, newRunRecord, renderMarkdown, reportJson, runKey, toCrlf, validateRunRecord,
} from './bench/report.js';
import { createNotApplicable } from './bench/responsiveness.js';
import { planRuns, runCase, runMatrix, validateMatrix, releaseHost } from './bench/runner.js';
import { nodeWorkerFactory } from './node-worker.mjs';
import { currentVersions } from './record-fixtures.mjs';

/** @typedef {import('./bench/runner.js').BenchMatrix} BenchMatrix */
/** @typedef {import('./bench/runner.js').BenchCase} BenchCase */
/** @typedef {import('./bench/runner.js').RunSpec} RunSpec */
/** @typedef {import('./bench/runner.js').Host} Host */
/** @typedef {import('./bench/report.js').RunRecord} RunRecord */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = fileURLToPath(import.meta.url);
const RESULT_MARK = '@@RUN@@';
const CHECKPOINT_FORMAT = 'pentomino-bench-checkpoint';
const DEFAULT_CHILD_LIMIT_S = 400;
const SAMPLE_INTERVAL_MS = 25;

export const USAGE = `usage: node --max-old-space-size=2048 tools/calibrate.mjs (--matrix <file.json> | --profile landscape) --output <base> [options]
options  --workers 1-4 (default 4)    --fresh-process (one child process per row)
         --seeds N (landscape repetitions per cell, default ${LANDSCAPE_SEEDS})    --max-active 30-676 (landscape, default 676)
         --cases <regex> (run only matching case ids)    --lifecycle cold|warm (default cold; warm needs no --fresh-process)
         --no-cancel-probe    --watchdog-scale N (add one scaled-watchdog row, N >= 2)
         --restart (discard an existing checkpoint)    --child-limit-s N (hard limit of a child row, default ${DEFAULT_CHILD_LIMIT_S})
Exit codes: 0 every requested row recorded, 2 stopped early or incomplete, 1 invalid input or an unusable checkpoint.
`;

const FLAGS = new Set(['matrix', 'profile', 'workers', 'seeds', 'max-active', 'cases', 'lifecycle', 'output', 'watchdog-scale',
  'child-limit-s', 'fresh-process', 'no-cancel-probe', 'restart', 'child', 'help']);
const SWITCHES = new Set(['fresh-process', 'no-cancel-probe', 'restart', 'child', 'help']);

/**
 * @typedef {object} Args
 * @property {string | null} matrix
 * @property {string | null} profile
 * @property {number} workers
 * @property {number} seeds
 * @property {number} maxActive
 * @property {RegExp | null} cases
 * @property {'cold' | 'warm'} lifecycle
 * @property {string} output
 * @property {number} watchdogScale
 * @property {number} childLimitS
 * @property {boolean} freshProcess
 * @property {boolean} cancelProbes
 * @property {boolean} restart
 */

/**
 * @param {string[]} argv
 * @returns {{ ok: true, args: Args } | { ok: 'help' } | { ok: 'child' } | { ok: false, error: string }}
 */
export function parseArgs(argv) {
  /** @type {Map<string, string>} */
  const flags = new Map();
  try {
    for (let i = 0; i < argv.length; i += 1) {
      const match = /^--([a-z-]+)(?:=(.*))?$/s.exec(argv[i]);
      if (match === null || !FLAGS.has(match[1])) {
        throw new RangeError(`unknown argument: ${argv[i]}`);
      }
      const name = match[1];
      if (flags.has(name)) {
        throw new RangeError(`--${name} was given twice`);
      }
      if (SWITCHES.has(name)) {
        flags.set(name, '');
        continue;
      }
      let value = match[2];
      if (value === undefined) {
        i += 1;
        value = argv[i];
        if (value === undefined || value.startsWith('--')) {
          throw new RangeError(`--${name} needs a value`);
        }
      }
      flags.set(name, value);
    }
    if (flags.has('help')) {
      return { ok: 'help' };
    }
    if (flags.has('child')) {
      return { ok: 'child' };
    }
    if (flags.has('matrix') === flags.has('profile')) {
      throw new RangeError('give exactly one of --matrix and --profile');
    }
    if (flags.has('profile') && flags.get('profile') !== 'landscape') {
      throw new RangeError('--profile supports only "landscape"; other profiles come from --matrix files');
    }
    if (!flags.has('output')) {
      throw new RangeError('--output is required');
    }
    const int = (/** @type {string} */ name, /** @type {number} */ fallback, /** @type {number} */ min, /** @type {number} */ max) => {
      const text = flags.get(name);
      if (text === undefined) {
        return fallback;
      }
      const value = /^[0-9]{1,9}$/.test(text) ? Number(text) : NaN;
      if (!Number.isInteger(value) || value < min || value > max) {
        throw new RangeError(`--${name} must be an integer from ${min} to ${max}`);
      }
      return value;
    };
    const lifecycle = flags.get('lifecycle') ?? 'cold';
    if (lifecycle !== 'cold' && lifecycle !== 'warm') {
      throw new RangeError('--lifecycle must be cold or warm');
    }
    const freshProcess = flags.has('fresh-process');
    if (lifecycle === 'warm' && freshProcess) {
      throw new RangeError('--lifecycle warm cannot be combined with --fresh-process');
    }
    if (lifecycle === 'warm' && flags.has('profile')) {
      throw new RangeError('the landscape profile needs --lifecycle cold');
    }
    let cases = null;
    if (flags.has('cases')) {
      try {
        cases = new RegExp(/** @type {string} */ (flags.get('cases')));
      } catch {
        throw new RangeError('--cases is not a valid regular expression');
      }
    }
    return {
      ok: true,
      args: {
        matrix: flags.get('matrix') ?? null,
        profile: flags.get('profile') ?? null,
        workers: int('workers', MAX_POOL_SIZE, 1, MAX_POOL_SIZE),
        seeds: int('seeds', LANDSCAPE_SEEDS, 1, 1000),
        maxActive: int('max-active', 676, 30, 676),
        cases,
        lifecycle,
        output: /** @type {string} */ (flags.get('output')),
        watchdogScale: int('watchdog-scale', 0, 2, 1000000),
        childLimitS: int('child-limit-s', DEFAULT_CHILD_LIMIT_S, 30, 86400),
        freshProcess,
        cancelProbes: !flags.has('no-cancel-probe'),
        restart: flags.has('restart'),
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * @param {Args} args
 * @param {(path: string) => string} [readText]
 * @returns {BenchMatrix}
 */
export function loadMatrix(args, readText = (path) => readFileSync(path, 'utf8')) {
  /** @type {unknown} */
  let data;
  if (args.profile === 'landscape') {
    data = buildLandscapeMatrix({ seeds: args.seeds, maxActive: args.maxActive });
  } else {
    const text = readText(/** @type {string} */ (args.matrix));
    try {
      data = JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
    } catch {
      throw new RangeError('the matrix file is not valid JSON');
    }
  }
  const matrix = validateMatrix(data);
  if (args.cases === null) {
    return matrix;
  }
  const { cases } = args;
  const kept = matrix.cases.filter((c) => cases.test(c.id));
  if (kept.length === 0) {
    throw new RangeError('--cases matches no case of the matrix');
  }
  return { ...matrix, cases: kept };
}

/**
 * Whole-process memory tracker. In a fresh child process `maxRSS` is the exact
 * peak working set including the worker threads; elsewhere only periodic RSS
 * samples exist and the note says so.
 * @param {boolean} exact
 * @returns {{ stop: () => { bytes: number | null, notes: string[] } }}
 */
export function trackProcessMemory(exact) {
  let peak = process.memoryUsage.rss();
  const timer = setInterval(() => {
    peak = Math.max(peak, process.memoryUsage.rss());
  }, SAMPLE_INTERVAL_MS);
  return {
    stop() {
      clearInterval(timer);
      peak = Math.max(peak, process.memoryUsage.rss());
      if (exact) {
        peak = Math.max(peak, process.resourceUsage().maxRSS * 1024);
        return { bytes: peak, notes: ['whole-process peak working set (maxRSS) of a one-row process, worker threads included'] };
      }
      return { bytes: peak, notes: [`sampled RSS every ${SAMPLE_INTERVAL_MS} ms in a shared process; includes memory retained from earlier rows; not an exact peak`] };
    },
  };
}

/**
 * @typedef {object} Source
 * @property {string} commit
 * @property {string} digest
 * @property {Record<string, string>} versions
 */

/** @returns {Promise<Source>} */
export async function readSource() {
  let commit = 'unknown';
  try {
    commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8', windowsHide: true }).trim();
    const dirty = execFileSync('git', ['status', '--porcelain', '--', 'core', 'tools'], { cwd: ROOT, encoding: 'utf8', windowsHide: true }).trim();
    commit += dirty === '' ? '' : '+uncommitted-changes';
  } catch {
    // not a git checkout: the digest still identifies the code
  }
  const digest = await computeSourceDigest((path) => readFileSync(resolve(ROOT, path), 'utf8'));
  return { commit, digest, versions: { ...currentVersions(), app: APP_VERSION } };
}

/**
 * @param {{ workers: number, lifecycle: 'cold' | 'warm', freshProcess: boolean, source: Source }} o
 * @returns {Host}
 */
export function createNodeHost({ workers, lifecycle, freshProcess, source }) {
  return {
    kind: 'node',
    platform: `${process.platform} ${release()} ${process.arch}`,
    browserOrNode: `node ${process.version}`,
    workerCount: workers,
    lifecycle,
    sourceCommit: source.commit,
    sourceDigest: source.digest,
    versions: source.versions,
    clock: systemClock,
    createPool: (size, clock) => createPool({ size, workerFactory: nodeWorkerFactory(), clock }),
    responsiveness: createNotApplicable(),
    processMemory: () => trackProcessMemory(freshProcess),
    clickCancel: (handler) => {
      setTimeout(handler, 0);
    },
    uiIdle: () => new Promise((done) => setImmediate(done)),
  };
}

/** @returns {Record<string, unknown>} */
function hardware() {
  const list = cpus();
  return {
    cpu: list[0]?.model ?? 'unknown',
    logicalCores: availableParallelism(),
    totalMemoryBytes: totalmem(),
    node: process.version,
    execArgv: process.execArgv,
  };
}

/**
 * Failure row of a child that never reported (exit, crash or watchdog kill).
 * @param {RunSpec} spec
 * @param {BenchCase} caseDef
 * @param {Host} host
 * @param {string} code
 * @param {string} message
 * @param {number} elapsedMs
 * @returns {RunRecord}
 */
function childFailure(spec, caseDef, host, code, message, elapsedMs) {
  return newRunRecord({
    caseId: caseDef.id,
    seed: spec.seed,
    sourceCommit: host.sourceCommit,
    sourceDigest: host.sourceDigest,
    versions: host.versions,
    platform: host.platform,
    browserOrNode: host.browserOrNode,
    workerCount: host.workerCount,
    probeKind: spec.probeKind,
    rep: spec.rep,
    responseMs: elapsedMs,
    partialReason: `error:${code}`,
    measurementValid: false,
    measurementNotes: ['the row process ended without reporting; no measurement exists'],
    errors: [{ phase: 'host', code, message }],
  });
}

/**
 * Runs one row in a child process of this script.
 * @param {{ spec: RunSpec, caseDef: BenchCase, host: Host, source: Source, profileSampling: boolean, limitMs: number }} o
 * @returns {Promise<RunRecord>}
 */
export function runInChild({ spec, caseDef, host, source, profileSampling, limitMs }) {
  return new Promise((done) => {
    const started = Date.now();
    const child = spawn(process.execPath, [...process.execArgv, SCRIPT, '--child'], {
      stdio: ['pipe', 'pipe', 'inherit'],
      windowsHide: true,
    });
    /** @type {Buffer[]} */
    const chunks = [];
    let killed = false;
    let spawnError = '';
    const timer = setTimeout(() => {
      killed = true;
      child.kill();
    }, limitMs);
    child.stdout.on('data', (c) => chunks.push(c));
    child.on('error', (e) => {
      spawnError = e.message;
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      const text = Buffer.concat(chunks).toString('utf8');
      const line = text.split('\n').find((l) => l.startsWith(RESULT_MARK));
      if (line !== undefined) {
        try {
          const record = JSON.parse(line.slice(RESULT_MARK.length));
          if (validateRunRecord(record).length === 0) {
            done(record);
            return;
          }
        } catch {
          // fall through to the failure row
        }
      }
      const elapsed = Date.now() - started;
      done(killed
        ? childFailure(spec, caseDef, host, 'child-timeout', `the row process was stopped after ${limitMs} ms`, elapsed)
        : childFailure(spec, caseDef, host, 'child-exit', spawnError || `the row process ended with code ${code ?? 'none'} signal ${signal ?? 'none'} after ${text.length} bytes of output${line === undefined ? '' : ' (result line present but unreadable)'}`, elapsed));
    });
    child.stdin.on('error', () => {});
    child.stdin.end(JSON.stringify({ spec, caseDef, workers: host.workerCount, profileSampling, source }));
  });
}

/** Child entry: reads one row from stdin, runs it, prints the record. @returns {Promise<void>} */
async function childMain() {
  const chunks = [];
  for await (const c of process.stdin) {
    chunks.push(c);
  }
  const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  const host = createNodeHost({ workers: input.workers, lifecycle: 'cold', freshProcess: true, source: input.source });
  let cancel = /** @type {(() => void) | null} */ (null);
  process.on('SIGINT', () => cancel?.());
  const record = await runCase(input.spec, input.caseDef, host, {
    profileSampling: input.profileSampling,
    registerCancel: (fn) => {
      cancel = fn;
    },
  });
  // No process.exit(): workers that were just terminated must finish unwinding or a native crash can follow on Windows.
  await new Promise((done) => process.stdout.write(`${RESULT_MARK}${JSON.stringify(record)}\n`, done));
  process.exitCode = 0;
}

/**
 * @param {string} path
 * @param {Record<string, unknown>} header
 * @returns {{ ok: true, runs: RunRecord[], skipped: number } | { ok: false, reason: string }}
 */
export function readCheckpoint(path, header) {
  const lines = readFileSync(path, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l !== '');
  /** @type {any} */
  let first;
  try {
    first = JSON.parse(lines[0] ?? '');
  } catch {
    return { ok: false, reason: 'the checkpoint has no readable header' };
  }
  if (first?.format !== CHECKPOINT_FORMAT) {
    return { ok: false, reason: 'the file is not a benchmark checkpoint' };
  }
  for (const key of Object.keys(header)) {
    if (JSON.stringify(first[key]) !== JSON.stringify(header[key])) {
      return { ok: false, reason: `the checkpoint was written for a different ${key}` };
    }
  }
  /** @type {RunRecord[]} */
  const runs = [];
  let skipped = 0;
  for (const line of lines.slice(1)) {
    try {
      const entry = JSON.parse(line);
      if (entry?.kind === 'run' && validateRunRecord(entry.run).length === 0) {
        runs.push(entry.run);
        continue;
      }
    } catch {
      // a half-written last line of an interrupted process
    }
    skipped += 1;
  }
  return { ok: true, runs, skipped };
}

/**
 * @param {string} base
 * @param {boolean} landscape
 * @returns {string} Report base name; landscape reports carry the date.
 */
export function reportBase(base, landscape) {
  if (!landscape || /\d{4}-\d{2}-\d{2}$/.test(base)) {
    return base;
  }
  return `${base}-${new Date().toISOString().slice(0, 10)}`;
}

/**
 * @typedef {object} Io
 * @property {(text: string) => void} stderr
 * @property {(onSignal: () => void) => (() => void)} onInterrupt
 */

/**
 * @param {string[]} argv
 * @param {Partial<Io>} [overrides]
 * @returns {Promise<number>}
 */
export async function run(argv, overrides = {}) {
  /** @type {Io} */
  const io = {
    stderr: (text) => process.stderr.write(text),
    onInterrupt: (onSignal) => {
      process.once('SIGINT', onSignal);
      return () => process.removeListener('SIGINT', onSignal);
    },
    ...overrides,
  };
  const parsed = parseArgs(argv);
  if (parsed.ok === 'help') {
    io.stderr(USAGE);
    return 0;
  }
  if (parsed.ok === 'child') {
    await childMain();
    return 0;
  }
  if (!parsed.ok) {
    io.stderr(`calibrate: ${parsed.error}\n${USAGE}`);
    return 1;
  }
  const { args } = parsed;
  let matrix;
  try {
    matrix = loadMatrix(args);
  } catch (e) {
    io.stderr(`calibrate: ${e instanceof Error ? e.message : String(e)}\n`);
    return 1;
  }
  const landscape = matrix.profile === 'landscape';
  if (landscape && args.seeds < LANDSCAPE_SEEDS) {
    io.stderr(`calibrate: warning: ${args.seeds} seeds per cell is below the ${LANDSCAPE_SEEDS} the calibration acceptance needs; cells stay "incomplete"\n`);
  }
  const source = await readSource();
  const host = createNodeHost({ workers: args.workers, lifecycle: args.lifecycle, freshProcess: args.freshProcess, source });
  const specs = planRuns(matrix, { cancelProbes: args.cancelProbes && !landscape, watchdogScale: args.watchdogScale });
  const header = {
    format: CHECKPOINT_FORMAT, version: 1, kind: 'node', sourceDigest: source.digest, versions: source.versions,
    matrixDigest: matrixDigest(matrix), workers: args.workers, lifecycle: args.lifecycle, freshProcess: args.freshProcess,
  };
  const checkpoint = `${args.output}.checkpoint.jsonl`;
  mkdirSync(dirname(resolve(checkpoint)), { recursive: true });
  /** @type {RunRecord[]} */
  let runs = [];
  if (args.restart && existsSync(checkpoint)) {
    rmSync(checkpoint);
  }
  if (existsSync(checkpoint)) {
    const loaded = readCheckpoint(checkpoint, header);
    if (!loaded.ok) {
      io.stderr(`calibrate: cannot resume ${checkpoint}: ${loaded.reason}. Runs of different revisions are never pooled; use --restart to discard it.\n`);
      return 1;
    }
    runs = loaded.runs;
    io.stderr(`calibrate: resuming ${runs.length} recorded rows${loaded.skipped > 0 ? ` (${loaded.skipped} unreadable lines ignored)` : ''}\n`);
  } else {
    writeFileSync(checkpoint, `${JSON.stringify(header)}\n`);
  }
  const startedAt = new Date().toISOString();
  const done = new Set(runs.map(runKey));
  let stopRequested = false;
  const unhook = io.onInterrupt(() => {
    stopRequested = true;
    io.stderr('calibrate: interrupt received; finishing the current row\n');
  });
  const limitMs = args.childLimitS * 1000;
  try {
    const fresh = await runMatrix(matrix, host, {
      specs,
      done,
      shouldStop: () => stopRequested,
      execute: args.freshProcess
        ? (spec, caseDef) => runInChild({ spec, caseDef, host, source, profileSampling: landscape, limitMs })
        : undefined,
      onStart: (spec, index, total) => io.stderr(`[${index + 1}/${total}] ${spec.probeKind} ${spec.caseId} #${spec.rep} seed ${spec.seed}\n`),
      onRun: (record) => {
        io.stderr(`    accepted ${record.acceptedCount}/10, T10 ${record.tenthReadyMs ?? 'n/a'} ms, response ${Math.round(record.responseMs)} ms`
          + `${record.partialReason === null ? '' : `, ${record.partialReason}`}`
          + `${record.layoutStatus == null ? '' : ` (arrangements ${record.layoutStatus}${record.layoutTotal === null ? '' : ` ${record.layoutTotal}`}, ${Math.round(record.layoutEnumMs ?? 0)} ms`
            + `${record.layoutPassTried == null ? '' : `, pass tried ${record.layoutPassTried} added ${record.layoutPassAdded ?? 0} in ${Math.round(record.layoutPassMs ?? 0)} ms`})`}\n`);
        if (!record.interrupted) {
          appendFileSync(checkpoint, `${JSON.stringify({ kind: 'run', run: record })}\n`);
        }
      },
    });
    runs = [...runs, ...fresh];
  } finally {
    unhook();
    releaseHost(host);
  }
  const interrupted = runs.filter((r) => r.interrupted);
  const recorded = runs.filter((r) => !r.interrupted);
  const repetitions = Object.fromEntries(matrix.cases.map((c) => [c.id, c.repetitions]));
  const report = buildReport({
    kind: 'node',
    profile: matrix.profile,
    sourceCommit: source.commit,
    sourceDigest: source.digest,
    versions: source.versions,
    platform: host.platform,
    browserOrNode: host.browserOrNode,
    hardware: hardware(),
    workerCount: args.workers,
    lifecycle: args.lifecycle,
    matrixDigest: header.matrixDigest,
    startedAt,
    finishedAt: new Date().toISOString(),
    expectedRuns: specs.length,
    notes: [args.freshProcess ? 'fresh process per row' : 'all rows shared one process: whole-process memory is a sampled estimate'],
  }, [...recorded, ...interrupted], { repetitions });
  const base = reportBase(args.output, landscape);
  let markdown = renderMarkdown(report, { detail: !landscape });
  /** @type {Record<string, unknown>} */
  const out = { ...report };
  if (landscape) {
    const calibration = aggregateLandscape([...recorded], /** @type {any} */ (matrix));
    out.calibration = calibration;
    markdown = `${renderLandscapeMarkdown(calibration, {
      date: new Date().toISOString().slice(0, 10), sourceCommit: source.commit, sourceDigest: source.digest, seeds: args.seeds, workers: args.workers,
    })}\n${markdown}`;
  }
  writeFileSync(`${base}.json`, reportJson(out));
  writeFileSync(`${base}.md`, toCrlf(markdown));
  io.stderr(`calibrate: wrote ${base}.json and ${base}.md (${report.runCount} rows of ${specs.length}${report.complete ? '' : ', INCOMPLETE'})\n`);
  return report.complete && !stopRequested ? 0 : 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await run(process.argv.slice(2));
}
