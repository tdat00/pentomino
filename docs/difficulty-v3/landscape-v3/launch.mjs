// @ts-check
// MP12a landscape launcher (cross-review TP20). Run control only: no request budget, worker count, seed, row limit
// or population is changed. `run` calls tools/calibrate.mjs in this process and asks it to pause PAUSE_MS after the
// start: calibrate.mjs then finishes the row in progress (its child limit, 400 s by default, still applies), writes
// its report and returns, so that one invocation stays inside the 590 s limit of the lock helper (check-list §7).
// `publish` checks a completed staged report and copies it once into its record folder.
//   node --max-old-space-size=2048 docs/difficulty-v3/landscape-v3/launch.mjs run <tools/calibrate.mjs arguments>
//   node docs/difficulty-v3/landscape-v3/launch.mjs publish <staged output> <record folder> --seeds <n>
//   node docs/difficulty-v3/landscape-v3/launch.mjs --self-test
// run exits 0 when every requested row is recorded; 3 when it paused on schedule with rows left (run the identical
// command again); 2 when calibrate.mjs stopped or ended incomplete without the scheduled pause, after an explicit
// interrupt (Ctrl+C, even when the scheduled pause fell due too), or a paused invocation recorded no row (stop and
// report); 1 on invalid input, an unusable checkpoint or an error (stop and report). publish exits 0 when both files
// are copied and the staged checkpoint is deleted, 1 when it refuses (nothing is copied).
import { constants, copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const PAUSE_MS = 150000;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const DATED = /-\d{4}-\d{2}-\d{2}$/;
const USAGE = 'usage: launch.mjs run <calibrate.mjs arguments>\n'
  + '       launch.mjs publish <staged output> <record folder> --seeds <n>\n'
  + '       launch.mjs --self-test';

/**
 * @typedef {object} Fs
 * @property {(path: string) => boolean} existsSync
 * @property {(path: string, encoding: 'utf8') => string} readFileSync
 * @property {(from: string, to: string, mode: number) => void} copyFileSync
 * @property {(path: string) => void} rmSync
 * @property {(path: string, options: { recursive: true }) => unknown} mkdirSync
 */
/**
 * @typedef {object} LaunchDeps
 * @property {(argv: string[], overrides: object) => Promise<number>} run `run` of tools/calibrate.mjs.
 * @property {Fs} fs
 * @property {number} pauseMs
 * @property {(text: string) => void} log
 */
/**
 * @typedef {object} PublishDeps
 * @property {Fs} fs
 * @property {() => Promise<{ sourceDigest: string, versions: unknown }>} identity The tree's source identity.
 * @property {(text: string) => void} log
 */

/** @param {string} p */
const norm = (p) => p.split('\\').join('/');

/**
 * @param {string} p
 * @param {string} prefix
 */
const inside = (p, prefix) => norm(p).startsWith(prefix) && !norm(p).split('/').includes('..');

/** @param {string} text */
const countRows = (text) => text.split('\n').filter((line) => line.startsWith('{"kind":"run"')).length;

/**
 * @param {string[]} argv
 * @param {string} flag
 */
const valueOf = (argv, flag) => {
  const at = argv.indexOf(flag);
  return at < 0 ? undefined : argv[at + 1];
};

/**
 * One bounded invocation of tools/calibrate.mjs.
 * @param {string[]} argv The arguments of tools/calibrate.mjs.
 * @param {LaunchDeps} deps
 * @returns {Promise<number>}
 */
export async function launch(argv, deps) {
  const output = valueOf(argv, '--output');
  if (valueOf(argv, '--profile') !== 'landscape') {
    deps.log('launch: give --profile landscape');
    return 1;
  }
  if (output === undefined || !inside(output, 'tests/artifacts/') || !DATED.test(output)) {
    deps.log('launch: --output must be a staging path under tests/artifacts/ ending with -YYYY-MM-DD');
    return 1;
  }
  if (argv.includes('--restart')) {
    deps.log('launch: --restart is not allowed; resume with the identical command');
    return 1;
  }
  const checkpoint = `${output}.checkpoint.jsonl`;
  const rows = () => (deps.fs.existsSync(checkpoint) ? countRows(deps.fs.readFileSync(checkpoint, 'utf8')) : 0);
  const before = rows();
  let paused = false;
  let interrupted = false;
  /** @param {() => void} onSignal */
  const onInterrupt = (onSignal) => {
    const timer = setTimeout(() => {
      paused = true;
      onSignal();
    }, deps.pauseMs);
    const sigint = () => {
      interrupted = true;
      onSignal();
    };
    process.once('SIGINT', sigint);
    return () => {
      clearTimeout(timer);
      process.removeListener('SIGINT', sigint);
    };
  };
  let code;
  try {
    code = await deps.run(argv, { onInterrupt });
  } catch (e) {
    deps.log(`launch: calibrate.mjs failed: ${e instanceof Error ? e.message : String(e)}`);
    return 1;
  }
  const after = rows();
  let complete = false;
  if (code !== 1 && deps.fs.existsSync(`${output}.json`)) {
    try {
      complete = JSON.parse(deps.fs.readFileSync(`${output}.json`, 'utf8')).complete === true;
    } catch {
      complete = false;
    }
  }
  let exit = 1;
  if (code === 2 && interrupted) {
    exit = 2;
  } else if (code === 0 || (code === 2 && paused && complete)) {
    exit = 0;
  } else if (code === 2 && paused && after > before) {
    exit = 3;
  } else if (code === 2) {
    exit = 2;
  }
  deps.log(`launch: calibrate exit ${code}; paused ${paused}; checkpoint rows ${before} -> ${after}; `
    + `report complete ${complete}; launcher exit ${exit}`);
  return exit;
}

/**
 * Checks a completed staged report and copies its .json and .md once into the record folder.
 * @param {string} output The staged `--output` value.
 * @param {string} folder The record folder.
 * @param {number} seeds Requests per case.
 * @param {PublishDeps} deps
 * @returns {Promise<number>}
 */
export async function publish(output, folder, seeds, deps) {
  /** @type {string[]} */
  const problems = [];
  if (!inside(output, 'tests/artifacts/') || !DATED.test(output)) {
    problems.push('the staged output must be under tests/artifacts/ and end with -YYYY-MM-DD');
  }
  if (!inside(folder, 'docs/difficulty-v3/')) {
    problems.push('the record folder must be under docs/difficulty-v3/');
  }
  if (!Number.isInteger(seeds) || seeds < 1) {
    problems.push('--seeds must be a positive integer');
  }
  const base = `${norm(folder).replace(/\/$/, '')}/${norm(output).split('/').pop()}`;
  const targets = [`${base}.json`, `${base}.md`];
  /** @type {any} */
  let report = null;
  try {
    report = JSON.parse(deps.fs.readFileSync(`${output}.json`, 'utf8'));
  } catch {
    problems.push('the staged report cannot be read');
  }
  if (report !== null) {
    if (report.complete !== true) {
      problems.push('the report is not complete');
    }
    if (report.runCount !== report.meta?.expectedRuns) {
      problems.push(`the report has ${report.runCount} rows for ${report.meta?.expectedRuns} expected`);
    }
    const runs = Array.isArray(report.runs) ? report.runs : [];
    /** @type {Map<string, number[]>} */
    const reps = new Map();
    for (const r of runs) {
      if (r.probeKind !== 'generation' || r.interrupted === true) {
        problems.push(`row ${r.probeKind}|${r.caseId}|${r.rep} is not a recorded landscape row`);
      }
      reps.set(r.caseId, [...(reps.get(r.caseId) ?? []), r.rep]);
    }
    if (runs.length === 0) {
      problems.push('the report has no row');
    }
    const want = Array.from({ length: seeds }, (_, i) => i).join(',');
    for (const [caseId, list] of reps) {
      const got = [...list].sort((a, b) => a - b).join(',');
      if (got !== want) {
        problems.push(`case ${caseId} has the reps ${got}, not 0 to ${seeds - 1}`);
      }
    }
    const tree = await deps.identity();
    if (report.meta?.sourceDigest !== tree.sourceDigest) {
      problems.push('the report was measured on another source digest than the tree');
    }
    if (JSON.stringify(report.meta?.versions) !== JSON.stringify(tree.versions)) {
      problems.push('the versions of the report differ from those of the tree');
    }
  }
  if (!deps.fs.existsSync(`${output}.md`)) {
    problems.push('the staged Markdown report is missing');
  }
  for (const target of targets) {
    if (deps.fs.existsSync(target)) {
      problems.push(`${target} exists: a record is never overwritten`);
    }
  }
  if (problems.length > 0) {
    for (const problem of problems) {
      deps.log(`publish: ${problem}`);
    }
    return 1;
  }
  deps.fs.mkdirSync(folder, { recursive: true });
  deps.fs.copyFileSync(`${output}.json`, targets[0], constants.COPYFILE_EXCL);
  deps.fs.copyFileSync(`${output}.md`, targets[1], constants.COPYFILE_EXCL);
  if (deps.fs.existsSync(`${output}.checkpoint.jsonl`)) {
    deps.fs.rmSync(`${output}.checkpoint.jsonl`);
  }
  deps.log(`publish: wrote ${targets.join(' and ')}; deleted the staged checkpoint`);
  return 0;
}

/** In-memory files for the self-test. @param {Record<string, string>} files */
function memoryFs(files) {
  const data = new Map(Object.entries(files));
  return {
    data,
    existsSync: (/** @type {string} */ p) => data.has(norm(p)),
    readFileSync: (/** @type {string} */ p) => {
      const text = data.get(norm(p));
      if (text === undefined) {
        throw new Error(`ENOENT ${p}`);
      }
      return text;
    },
    copyFileSync: (/** @type {string} */ from, /** @type {string} */ to) => {
      if (data.has(norm(to))) {
        throw new Error(`EEXIST ${to}`);
      }
      data.set(norm(to), /** @type {string} */ (data.get(norm(from))));
    },
    rmSync: (/** @type {string} */ p) => {
      data.delete(norm(p));
    },
    mkdirSync: () => undefined,
    append: (/** @type {string} */ p, /** @type {string} */ text) => {
      data.set(norm(p), (data.get(norm(p)) ?? '') + text);
    },
  };
}

/**
 * @typedef {object} RunCase
 * @property {string[]} [argv]
 * @property {number} [pauseMs]
 * @property {boolean} [waitForPause] The fake calibrate.mjs waits until the pause is requested.
 * @property {boolean} [interrupt] An explicit interrupt (SIGINT) arrives first, and the row runs past the pause.
 * @property {number} [rowsAdded]
 * @property {boolean} [complete]
 * @property {number} [code] What the fake calibrate.mjs returns.
 * @property {boolean} [called] Whether calibrate.mjs must be called (default true).
 * @property {number} want
 */
/**
 * @typedef {object} PublishCase
 * @property {string} json
 * @property {string} [folder]
 * @property {boolean} [existing] The record exists already.
 * @property {boolean} [md] The staged Markdown exists (default true).
 * @property {{ sourceDigest: string, versions: unknown }} [tree]
 * @property {number} want
 */

/** @returns {Promise<number>} */
async function selfTest() {
  const out = 'tests/artifacts/MP12a/self-test/case-2026-01-01';
  /** @type {string[]} */
  const failures = [];
  let cases = 0;
  /** @param {string} name @param {RunCase} c */
  const runCase = async (name, c) => {
    cases += 1;
    const fs = memoryFs({ [`${out}.checkpoint.jsonl`]: '{"format":"pentomino-bench-checkpoint"}\n' });
    let called = false;
    const run = async (/** @type {string[]} */ _argv, /** @type {any} */ overrides) => {
      called = true;
      /** @type {(value?: unknown) => void} */
      let onPause = () => {};
      const pause = new Promise((done) => {
        onPause = done;
      });
      const unhook = overrides.onInterrupt(() => onPause());
      /** @type {NodeJS.Timeout | undefined} */
      let guard;
      try {
        if (c.interrupt === true) {
          process.emit('SIGINT');
          await new Promise((done) => {
            guard = setTimeout(done, 100);
          });
        }
        if (c.waitForPause === true) {
          await Promise.race([pause, new Promise((done) => {
            guard = setTimeout(done, 2000);
          })]);
        }
        for (let i = 0; i < (c.rowsAdded ?? 0); i += 1) {
          fs.append(`${out}.checkpoint.jsonl`, `${JSON.stringify({ kind: 'run', run: { rep: i } })}\n`);
        }
        if (c.code !== 1) {
          fs.data.set(`${out}.json`, JSON.stringify({ complete: c.complete === true }));
        }
        return c.code ?? 0;
      } finally {
        clearTimeout(guard);
        unhook();
      }
    };
    const argv = c.argv ?? ['--profile', 'landscape', '--seeds', '20', '--output', out];
    const got = await launch(argv, { run, fs, pauseMs: c.pauseMs ?? 60000, log: () => {} });
    if (got !== c.want || called !== (c.called ?? true)) {
      failures.push(`${name}: exit ${got} (want ${c.want}), calibrate called ${called}`);
    }
  };
  const paused = { pauseMs: 5, waitForPause: true, code: 2 };
  await runCase('R1 complete', { code: 0, rowsAdded: 2, complete: true, want: 0 });
  await runCase('R2 paused with rows left', { ...paused, rowsAdded: 1, complete: false, want: 3 });
  await runCase('R3 paused in the last row', { ...paused, rowsAdded: 1, complete: true, want: 0 });
  await runCase('R4 incomplete without a pause', { rowsAdded: 1, complete: false, code: 2, want: 2 });
  await runCase('R5 paused without a new row', { ...paused, rowsAdded: 0, complete: false, want: 2 });
  await runCase('R6 unusable checkpoint', { code: 1, want: 1 });
  const refused = { want: 1, called: false };
  await runCase('R7 output without a date',
    { ...refused, argv: ['--profile', 'landscape', '--output', 'tests/artifacts/MP12a/x'] });
  await runCase('R8 output outside tests/artifacts',
    { ...refused, argv: ['--profile', 'landscape', '--output', 'docs/difficulty-v3/x-2026-01-01'] });
  await runCase('R9 restart', { ...refused, argv: ['--profile', 'landscape', '--restart', '--output', out] });
  await runCase('R10 not the landscape profile',
    { ...refused, argv: ['--matrix', 'tools/bench/matrices/smoke.json', '--output', out] });
  await runCase('R11 explicit interrupt, then the scheduled pause fell due',
    { pauseMs: 5, interrupt: true, code: 2, rowsAdded: 1, complete: false, want: 2 });

  const folder = 'docs/difficulty-v3/landscape-v3/r0';
  const record = `${folder}/case-2026-01-01`;
  const v3 = { model: 'difficulty-v3' };
  /** @param {number} expected @param {number[]} reps @param {(rep: number) => boolean} [cut] */
  const report = (expected, reps, cut = () => false) => JSON.stringify({
    complete: true,
    runCount: reps.length,
    meta: { expectedRuns: expected, sourceDigest: 'd1', versions: v3 },
    runs: reps.map((rep) => ({ probeKind: 'generation', caseId: 'c', rep, interrupted: cut(rep) })),
  });
  /** @param {string} name @param {PublishCase} c */
  const publishCase = async (name, c) => {
    cases += 1;
    /** @type {Record<string, string>} */
    const files = { [`${out}.json`]: c.json, [`${out}.checkpoint.jsonl`]: 'rows' };
    if (c.md !== false) {
      files[`${out}.md`] = 'report';
    }
    if (c.existing === true) {
      files[`${record}.json`] = 'old';
    }
    const fs = memoryFs(files);
    const tree = c.tree ?? { sourceDigest: 'd1', versions: v3 };
    const got = await publish(out, c.folder ?? folder, 3, { fs, identity: async () => tree, log: () => {} });
    const copied = fs.data.get(`${record}.json`) === c.json && fs.data.get(`${record}.md`) === 'report';
    const ok = c.want === 0
      ? got === 0 && copied && !fs.data.has(`${out}.checkpoint.jsonl`)
      : got === 1 && !fs.data.has(`${record}.md`) && fs.data.has(`${out}.checkpoint.jsonl`)
        && (c.existing !== true || fs.data.get(`${record}.json`) === 'old');
    if (!ok) {
      failures.push(`${name}: exit ${got} (want ${c.want}), copied ${copied}`);
    }
  };
  const good = report(3, [0, 1, 2]);
  await publishCase('P1 published', { json: good, want: 0 });
  await publishCase('P2 incomplete', { json: JSON.stringify({ ...JSON.parse(good), complete: false }), want: 1 });
  await publishCase('P3 a row twice', { json: report(3, [0, 0, 2]), want: 1 });
  await publishCase('P4 a rep outside 0 to 2', { json: report(3, [0, 1, 3]), want: 1 });
  await publishCase('P5 a case of the matrix missing', { json: report(6, [0, 1, 2]), want: 1 });
  await publishCase('P6 no row', { json: report(0, []), want: 1 });
  await publishCase('P7 an interrupted row', { json: report(3, [0, 1, 2], (rep) => rep === 2), want: 1 });
  await publishCase('P8 another source digest', { json: good, tree: { sourceDigest: 'd2', versions: v3 }, want: 1 });
  await publishCase('P9 other versions',
    { json: good, tree: { sourceDigest: 'd1', versions: { model: 'difficulty-v2' } }, want: 1 });
  await publishCase('P10 no Markdown report', { json: good, md: false, want: 1 });
  await publishCase('P11 the record exists', { json: good, existing: true, want: 1 });
  await publishCase('P12 folder outside docs/difficulty-v3', { json: good, folder: 'docs/calibration', want: 1 });
  for (const failure of failures) {
    process.stderr.write(`self-test: ${failure}\n`);
  }
  process.stdout.write(`launch self-test: ${cases - failures.length} of ${cases} cases as expected\n`);
  return failures.length === 0 ? 0 : 1;
}

/** @param {string[]} argv @returns {Promise<number>} */
async function main(argv) {
  if (argv[0] === '--self-test' && argv.length === 1) {
    return selfTest();
  }
  const log = (/** @type {string} */ text) => process.stderr.write(`${text}\n`);
  if (resolve('.').toLowerCase() !== ROOT.toLowerCase()) {
    log('launch: run from the repository root');
    return 1;
  }
  const fs = { existsSync, readFileSync, copyFileSync, rmSync, mkdirSync };
  if (argv[0] === 'run') {
    const { run } = await import(pathToFileURL(join(ROOT, 'tools', 'calibrate.mjs')).href);
    return launch(argv.slice(1), { run, fs, pauseMs: PAUSE_MS, log });
  }
  if (argv[0] === 'publish' && argv.length === 5 && argv[3] === '--seeds') {
    const identity = async () => {
      const { computeSourceDigest } = await import(pathToFileURL(join(ROOT, 'tools', 'bench', 'report.js')).href);
      const { currentVersions } = await import(pathToFileURL(join(ROOT, 'tools', 'record-fixtures.mjs')).href);
      const { APP_VERSION } = await import(pathToFileURL(join(ROOT, 'core', 'engine', 'version.js')).href);
      const readText = (/** @type {string} */ p) => readFileSync(join(ROOT, p), 'utf8');
      // calibrate.mjs writes `meta.versions` as currentVersions() plus the app version
      return { sourceDigest: await computeSourceDigest(readText), versions: { ...currentVersions(), app: APP_VERSION } };
    };
    return publish(argv[1], argv[2], Number(argv[4]), { fs, identity, log });
  }
  log(USAGE);
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
