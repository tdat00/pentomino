# MP12a — Calibration slice: the GV2 cases again with v3, and the knob changes

| Header | Value |
|---|---|
| ID | MP12a (first part of the report's MP12; MP12b1 runs the full landscape, MP12b2 the search evidence and the lock) |
| Depends on | MP11 (accepted and committed: the landscape records carry the v3 measures; the slow test exists); MP09d2 (v3 active); MP06b and MP06c (the GV2 baseline, the probe and fit records) |
| Estimated size | Medium: about 450–850 changed lines (the launcher, about 400 lines given below, and the criteria script with their self-tests; knob values and their pins; re-pinned v3 tables; the record); about 60–90 minutes of developer work plus machine time: a provisional 30–60 minutes per round (360 landscape requests, 90 captures, 90 pack ratings, under the lock protocol, so waits for the Sudoku repository come on top), projected again after the first small and the first large case; at most three rounds |
| Owner role | Measurement |
| Milestone | M7 — calibrated and locked |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-25 (run, criteria, what P3 may change), RES-18 (formula, invariants, the JR-P3 ranges), RES-05 and C5 (the 5 % census rule), RES-10 (caps), RES-14 (regenerated requests, here captured once per round), RES-26 (v3 tests), RES-35 (AR1); clarifications PROC-P1 (a), SA2-Q-P09 (branch A), JR-P3, **P-OD1** (census 10,000,000 revisited here), **P-OD2** (work 760,000,000 accepted), **P-OD3** (the penalty re-examined here), **P-OD5** (D36: cells v3 cannot make) in part H, Part I D21 and D36; check-list §4.2 D19, D21, D29, D36 and §7 (the shared-machine lock protocol); cross-review SP06, SP07 (`docs/difficulty-v3/gpt-6-astra/6-review-of-task-pack.md`, second pass) and TP20, TP21, TP22, TP25, TP26 (its MP12 tranche) |
| Gates owned | GL-P3 (slice), and GF-P2 and GA-P2 again when this task changes a knob (check-list §7) |
| Implementation status | Not started |

## Goal & business context

The owner asked that Hard be really hard, and that the levels be measured and fitted before they are locked
(PROC-P1 (a)). The knobs of the v3 score were fitted in MP06c on puzzles that the v2 generator had made; now v3 makes
the puzzles itself (aiming at the centre of the band, MP07, and requiring a proved real choice at Hard and above,
MP09c). This task measures the same 18 board-and-level cells as the v2 baseline (GV2), compares them, checks the
owner's criteria, and changes the knobs within the approved ranges where a criterion fails, recording every change
with its before and after data.

Three owner decisions are revisited here (part H of `clarifications.md`): **P-OD1** — the census budget stays at
10,000,000 and is revisited at this calibration on v3-generated puzzles (by the 5 % rule of C5); **P-OD2** — the work
cap 760,000,000 is accepted (it stays unless a capped path appears); **P-OD3** — the initial fit switched the few/many
penalty off, (0, 0), against the intent of SA1-Q-P1 ("the few/many penalty stays"): this task re-examines the penalty
on v3-generated puzzles and reports the comparison.

## Scope

### In scope

- The run control (cross-review TP20): the landscape launcher `docs/difficulty-v3/landscape-v3/launch.mjs` (new,
  exactly as given below; MP12b1 and MP12b2 use it read-only) and the lock protocol of check-list §7 for every timed
  command of this task.
- Gate GL-P3, slice part: the 18 GV2 cases with v3, in rounds; `rate-probe` on the captured matching requests.
- The criteria evaluation per round by the criteria script `docs/difficulty-v3/landscape-v3/criteria.mjs` (new, with
  its self-test; TP21, TP22); the knob search within the ranges; the changes (`SCORE_V3`, `DEDUCE`, and `K60`,
  `POLICY_ID` or `SHARES` only when needed, SA2-Q-P09 branch A) with their pins.
- After the last knob change of this task: the re-pins of the knob-dependent v3 tests, then GF-P2 and GA-P2.
- The record `docs/difficulty-v3/calibration-slice-<date>.md`; the landscape reports under
  `docs/difficulty-v3/landscape-v3/`.

### Out of scope

- The full landscape (MP12b1), the search evidence, the Hell report and the lock (MP12b2); the design document's
  measured values of §7.8 (MP12b2 writes them once, after the lock).
- Any algorithm change: a new estimator, a multi-order aggregation, dropping a diagnostic, a carving redesign, moving
  band edges — not allowed without a new decision (RES-25). A knob outside its range needs a new answer from the plan
  author: stop and report.

## Repository rules

- Read `AGENTS.md` and `tasks/difficulty-v3/check-list.md` §3 and §7 first.
- Heavy runs: the landscape shards, the probe captures and ratings, the test runs, the slow tests,
  `tools/record-fixtures.mjs` and `npm test`, exactly as written below, each through the helper `Invoke-Dv3Timed` of
  check-list §7 "Shared-machine lock protocol" (cross-review TP20; save it verbatim as
  `tests/artifacts/MP12a/dv3-lock.ps1` and dot-source it in every call): one bounded command per acquisition of the
  lock, at most 590 s (captures and ratings at most 570 s), at least 15 s between releasing the lock and taking it
  again (the helper waits), never a lock held across a series of commands; `npm run check` and the scripts'
  self-tests need no lock. The dispatch of this task is its slot; the lock interleaves its runs with the Sudoku
  repository's. Before each round, write its plan (shards, capture and rating groups, expected wall time) at the top
  of the round's section of the record; the reply gives the projections.
- A command that reaches its limit, an unexpected exit or an unusable checkpoint stops the task: report it. Only the
  launcher's scheduled pause (exit 3) is resumed, by the identical command. Never lower `--seeds`, use `--restart`,
  change a seed, regenerate a request or drop a completed row to make a command fit.
- Records are written once and never overwritten: each round has its own folder; a landscape report is staged under
  `tests/artifacts/MP12a/landscape/` (the tool rewrites it at every resume) and published once by the launcher; a
  correction is a new file.
- Never stage, commit, stash, reset, push or switch branches; never edit `tasks/difficulty-v3/`, `plan.md`,
  `clarifications.md`, the reports, the earlier records (`probe-2026-11-12.md`, `fit-2026-11-12.md`,
  `baseline-v2/`, `probe-corpus-2026-11-12/`) or `docs/calibration/`. UTF-8 without BOM, CRLF (normalise every
  tool-written JSON and Markdown before the hand-off), no trailing whitespace, no absolute path in a record.

## Inputs & context

### Values at the start (read them from the tree; do not assume)

- `SCORE_V3` in `core/engine/policy.js` (written by MP08 from `docs/difficulty-v3/fit-2026-11-12.md` §3 and the owner's
  P-OD3 (a)): expected `base { max: 12, scale: 3 }`, `rule [0, 0, 2, 2]`, `weights { G: 5, info: 0.5 }`, `penalty {
  few: 0, many: 0 }`.
- `DEDUCE` (MP06b, pinned in `tests/policy.test.js`): `{ lookaheadWidth: 4, nodes: 30000, solutions: 8, work:
  760000000, census: 10000000, memoryBytes: 33554432 }`.
- `K60` (`core/engine/policy.js`, `const K60 = [6, 7.5, 8.5, 10, 11.5, 13, 16, 24, 32, 43, 58, 78];`) and `POLICY_ID`
  (`'mixed-v2'`); `SHARES` (`core/engine/levels.js:18`, `const SHARES = [0.62, 0.54, 0.46, 0.38, 0.3, 0.22, 0.14, 0.1,
  0.06, 0.04, 0.04];`).
- Findings to re-examine (`fit-2026-11-12.md` §8 and MP06c's log): the Normal-to-Hard margin is one point on three
  boards; `rule[2] = rule[3]`; four knobs sit on a range edge (`base.max` 12, `base.scale` 3, `weights.info` 0.5,
  penalty (0, 0)); the Hard hit rate of corpus A was capped by `Gproved` (12x12-hard 16/50, 18x20-hard 7/50); with
  uniqueness required, no v2-made 18 x 20 Hard, Expert or Master puzzle had a proved guess (20/20 `Gproved = 0`).

### The fit ranges and invariants (RES-18; JR-P3 (a), plan author)

Hard invariants: `base.max + max(rule) <= 16`; `rule[0] = rule[1] = 0 <= rule[2] <= rule[3]`;
`0 <= penalty.few <= penalty.many`; weights >= 0. Ranges: `base.max` 8-12, `base.scale` 3-12, `rule[2] <= rule[3]`
with `base.max + rule[3] <= 16`, `weights.G` 0-8, `weights.info` 0.5-6, `0 <= penalty.few <= penalty.many <= 8`.
What P3 may change (SA2-Q-P09 branch A): the `SCORE_V3` knobs within these ranges; the `DEDUCE` caps (RES-10); `K60`
and `SHARES` when needed to keep hit rates; every change recorded with before and after data; a `K60` change bumps
`POLICY_ID` (for example `'mixed-v3'`, RES-01). A capped path stays unrateable whatever the caps (RES-04).

### The cases (GV2, RES-14)

The 18 cases of `docs/difficulty-v3/baseline-v2/` (`<case>-2026-11-12.json|.md`): 6x10, 10x10 and 12x12 with easy,
normal, hard, expert and master; 18x20 with hard, expert and master. List them with the command of MP06b
(`tasks/difficulty-v3/MP06b-probe-and-v2-baseline.md`, "Cases of GV2") and use the printed list.

### Run control: the lock, the launcher and publication (cross-review TP20)

Every landscape shard of this task (and of MP12b1, and of an ordered change round of MP12b2) runs through the launcher
`docs/difficulty-v3/landscape-v3/launch.mjs` under the helper `Invoke-Dv3Timed` of check-list §7. The launcher changes
no request, budget, seed, worker count, row limit or population: it bounds each invocation and publishes each report
once.

- **Run.** `launch.mjs run <the arguments of tools/calibrate.mjs>` calls `run(argv, { onInterrupt })` of
  `tools/calibrate.mjs` (`:454-581`) in its own process. Its `onInterrupt` hook requests a pause 150 s after the start
  (a Ctrl+C requests it too, but then counts as unscheduled); `calibrate.mjs` finishes the row in progress (each row is
  a child process with the 400 s limit of `--child-limit-s`, `:46`), writes `<output>.json` and `<output>.md` and
  returns 2. One invocation therefore ends after about 150 + 400 s at most, inside the helper's 590 s. A row stopped
  at its child limit is a recorded `child-timeout` row of the tool, as without the launcher.
- **Staging.** `--output` must be a path under `tests/artifacts/` that ends with the round's start date
  (`-YYYY-MM-DD`): `calibrate.mjs` then keeps that name (`reportBase`, `:436-441`) and its checkpoint
  `<output>.checkpoint.jsonl` (`:496`) across days, and rewrites the two report files at every resume (`:577-578`)
  where no record lives. `--restart` is refused.
- **Exit codes.** 0: every requested row is recorded (also when the pause fell into the last row). 3: paused on
  schedule with rows left and at least one new row recorded: run the identical command again (same arguments, output
  and checkpoint). 2: `calibrate.mjs` stopped or ended incomplete without the scheduled pause, or a paused invocation
  recorded no row: stop and report. 1: invalid input, an unusable checkpoint (`calibrate.mjs` refuses a checkpoint of
  another digest, versions or matrix) or an error: stop and report. The helper's `TimedOut` is a failure, never a
  pause.
- **Publish.** `launch.mjs publish <output> <record folder> --seeds <n>` checks the staged report: `complete`, as many
  rows as `meta.expectedRuns`, every row a recorded landscape row (`probeKind` `generation`, not interrupted), per case
  exactly the reps 0 to n - 1 (so no row twice), `meta.sourceDigest` and `meta.versions` equal to the tree's
  (`computeSourceDigest` over `SOURCE_FILES`, `currentVersions()`), the Markdown present and no record of that name in
  the folder. Then it copies `<name>.json` and `<name>.md` into the folder without overwriting and deletes the staged
  checkpoint. A refusal copies nothing: report it.
- **Checks before the first round** (no shared lock: nothing is generated): the launcher's self-test (the pause, the
  pause in the last row, a pause without a new row, an incomplete run without a pause, the refused arguments and every
  refusal of `publish`), then the helper's fake-tree check in a scratch lock folder:

  ```powershell
  node docs/difficulty-v3/landscape-v3/launch.mjs --self-test
  if ($LASTEXITCODE -ne 0) { throw 'launcher self-test failed' }
  . tests\artifacts\MP12a\dv3-lock.ps1
  New-Item -ItemType Directory -Force 'tests\artifacts\MP12a\lock-test' | Out-Null
  $fake = 'tests\artifacts\MP12a\fake-tree.mjs'
  Set-Content $fake ("import { spawn } from 'node:child_process';`r`n" +
    "spawn(process.execPath, ['-e', 'setTimeout(() => {}, 120000)'], { stdio: 'inherit' });`r`n" +
    "setTimeout(() => {}, 120000);")
  $r = Invoke-Dv3Timed -Task 'MP12a fake tree' -NodeArgs @($fake) -LimitSeconds 5 `
    -LockDir 'tests\artifacts\MP12a\lock-test'
  if (-not $r.TimedOut -or $r.Killed.Count -lt 2) { throw 'the fake tree was not stopped as a tree' }
  if (Get-Process -Id $r.Killed -ErrorAction SilentlyContinue) { throw 'a process of the fake tree survived' }
  if (Test-Path 'tests\artifacts\MP12a\lock-test\dv3-timing.lock') { throw 'the test lock was not released' }
  ```

  The launcher prints "launch self-test: 22 of 22 cases as expected" (the analysts' run of the code below, where each
  of 16 single-condition mutations failed the self-test). A failure is a defect to report, never settled by changing an
  expected value.

The launcher, exactly (`docs/difficulty-v3/landscape-v3/launch.mjs`, CRLF):

```js
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
// command again); 2 when calibrate.mjs stopped or ended incomplete without the scheduled pause, or a paused
// invocation recorded no row (stop and report); 1 on invalid input, an unusable checkpoint or an error (stop and
// report). publish exits 0 when both files are copied and the staged checkpoint is deleted, 1 when it refuses
// (nothing is copied).
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
  /** @param {() => void} onSignal */
  const onInterrupt = (onSignal) => {
    const timer = setTimeout(() => {
      paused = true;
      onSignal();
    }, deps.pauseMs);
    const sigint = () => onSignal();
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
  if (code === 0 || (code === 2 && paused && complete)) {
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
      const readText = (/** @type {string} */ p) => readFileSync(join(ROOT, p), 'utf8');
      return { sourceDigest: await computeSourceDigest(readText), versions: currentVersions() };
    };
    return publish(argv[1], argv[2], Number(argv[4]), { fs, identity, log });
  }
  log(USAGE);
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
```

### One round r (r = 0, 1, 2; at most three rounds in this task)

1. Shards (one case per shard), each run by the launcher in bounded invocations under the lock, then published once
   into the round's folder (`<date>` is the round's start date, fixed for the whole round):

   ```powershell
   . tests\artifacts\MP12a\dv3-lock.ps1
   $k = 0; $date = '<date>'; $case = '6x10-easy'
   $stage = "tests/artifacts/MP12a/landscape/r$k/$case-$date"
   $node = @('--max-old-space-size=2048', 'docs/difficulty-v3/landscape-v3/launch.mjs', 'run', '--profile', 'landscape',
     '--workers', '4', '--seeds', '20', '--fresh-process', '--cases', "^$case$", '--output', $stage)
   do {
     $r = Invoke-Dv3Timed -Task "MP12a r$k $case" -NodeArgs $node
     if ($r.TimedOut) { throw "MP12a r$k ${case}: the 590 s limit was reached; stop and report" }
   } while ($r.Exit -eq 3)
   if ($r.Exit -ne 0) { throw "MP12a r$k ${case}: launcher exit $($r.Exit); stop and report" }
   node docs/difficulty-v3/landscape-v3/launch.mjs publish $stage "docs/difficulty-v3/landscape-v3/r$k" --seeds 20
   if ($LASTEXITCODE -ne 0) { throw "MP12a r$k ${case}: publish refused" }
   ```

   and the same for every case (`$case`), in the order of the printed list. Record per invocation: case, start, end,
   seconds, launcher exit, the checkpoint rows after it (the launcher's last line) and the lock wait; per case the
   publish line. The published `docs/difficulty-v3/landscape-v3/r<k>/<case>-<date>.json|.md` is the round's report.
2. The probe corpus of the round ("The probe corpus of a round" below): capture the 90 requests once, rate the
   captured packs with the `prod` label, merge into the round's `final.jsonl`, every capture and rating command
   through the helper with `-LimitSeconds 570`. Exit 2 of a capture marks a partial request and an identity mismatch
   is marked in the manifest: record both, never substitute (RES-14).
3. Evaluate the criteria with `criteria.mjs` (below) from the published reports and the probe lines; write the
   round's section of the record.
4. If every criterion holds and the penalty question is settled, the round is final (no change). Otherwise choose the
   change by "Choosing a change" (below), apply it, re-pin the knob-dependent pins first ("Pinned tests" and "The D36
   and fixture re-pins"), run the between-round checks of "Test order around a knob change" (fixture-independent
   files and the slow tests only), and start round r + 1. A failure of availability (C2, or C1 unavailable) never
   starts a round with an unchanged tuple: it needs the orchestrator's go-ahead for one `SHARES` or `K60` trial, or the
   task stops with the numbers (TP22). After round 2, a criterion that still fails is a finding for the owner: stop
   and report it with the data (SA2-Q-P09); do not start a fourth round.

### Criteria (RES-25; per round)

| ID | Criterion | How |
|---|---|---|
| C1 | Levels are ordered: on each of the four boards the median accepted v3 score strictly increases with the requested level | `v3.score.median` of each cell of the round's reports (MP11; the accepted puzzles' `details.puzzles[].score`). A cell with `v3: null` (no accepted v3 puzzle) makes its board **unavailable**: C1 is not met there, and the cell is an availability failure ("Choosing a change"). Accepted v3 scores lie in their band and the bands are ordered, so with every cell present C1 holds; it is still computed |
| C2 | Hard and Expert keep their request completion rate: each Hard and Expert cell with a GV2 baseline has a `requestCompletionRate` of at least its GV2 value minus 10 percentage points | `requestCompletionRate` = MP11's `requestInBandRate` of the cell (the recorded requests that completed ten in-band puzzles, over the recorded requests), compared with the same field of `baseline-v2/<case>-2026-11-12.json`; also report the puzzle yield (accepted / 200) of both. The fit's `puzzleRescoreHitRate` ("The probe corpus of a round") is another measure and never decides C2 (TP22) |
| C3 | Hard and above need a proved real choice | `v3.provedZero` is 0 in every Hard-or-above cell with `v3 !== null` (MP11), and the slow test passes; a cell with `v3: null` is listed as unavailable, never as 0 |
| C4 | The census rule (C5, P-OD1): in every level and board cell with accepted puzzles, at most 5 % of them are census estimates (`censored: true`) | MP11's `v3.censored.share` of each cell with `v3 !== null`; unavailable otherwise |
| C5 | No capped accepted path: no line of the round's `final.jsonl` is classified `capped` (the canonical `prod` re-ratings of the captured accepted puzzles at the production caps; these puzzles were rated complete at the same caps during generation, so a capped line is a defect to report) | `final.jsonl` (classified first, MP06b A1.3 step 1). The landscape's diagnostic samples are reported, never gated (TP21; below) |

**Diagnostic samples are not accepted puzzles** (cross-review TP21). After each request the landscape rates random
clue subsets of the accepted set at several clue counts, two each (`sampleProfiles`, `tools/bench/runner.js:415-487`;
`sampleCounts(30, 4)` includes 1, 2 and 3 clues), many of them far harder than the requested level. Per cell the
record gives `sampledUnrateable` with its denominator, the attempted samples (the rated samples, `samples.length`
summed over the cell's runs, plus `details.sampleFailures` summed over its runs with a set), apart from the accepted
puzzles' census share (C4) and from MP12b2's generation-profile counts. They never fail C5 and never feed the cap rule
of "Choosing a change"; a request without a set has no samples, so a zero there says nothing about its generation
profiles. A rule that every sampled subset be rateable would be a new decision.

**Missing values** (cross-review TP27). A cell without accepted v3 puzzles has `v3: null`
(`tools/bench/calibration-reference.js:346-363`): its median, census share and `provedZero` are unavailable, never 0,
and its row keeps the cell's actual observations (requests, accepted puzzles, failure reasons).

Also record per round (RES-25): per cell the distributions of G, `info`, Cmax, `deductionTier`, `solutions` and the
v3 score; the request completion rate and the yield, and the current tuple's puzzle rescore hit rate, in separate
columns; the diagnostic samples (unrateable over attempted); time per run (T10 median and p95) and the peak memory;
the census-estimate, partial and incomplete outcomes; the order-noise table from the `prod` lines (`--orders 5
--tie-orders 3`: per cell, the spread of G and of the v3 score across orders, as in `probe-2026-11-12.md`); the probe
manifest summary (requests, exit codes, accepted puzzles, identity matches); the source identity of the round's
reports (`meta.sourceDigest`, `meta.versions` and `meta.sourceCommit`, which says `+uncommitted-changes` while a knob
change of this task is not committed yet; MP12b1 reuses a report by that identity, TP25).

### The criteria script `docs/difficulty-v3/landscape-v3/criteria.mjs` (new; TP21, TP22, TP27)

A durable script (CRLF, `// @ts-check`, ASCII output) from which the record's criteria tables come:

- `node docs/difficulty-v3/landscape-v3/criteria.mjs --round docs/difficulty-v3/landscape-v3/r<k> --baseline
  docs/difficulty-v3/baseline-v2 --final docs/difficulty-v3/landscape-v3/r<k>/probe/final.jsonl [--fit
  tests/artifacts/MP12a/r<k>/fit-current.json]` prints Markdown: the C1-C5 table with the numbers; one row per cell
  (`requestCompletionRate`, its GV2 value and bound, the yields, `puzzleRescoreHitRate` when `--fit` is given,
  `v3.score.median`, `v3.censored.share`, `v3.provedZero`, the `prod` lines by class, the diagnostic samples unrateable
  over attempted); then the branches of "Choosing a change" that apply. Exit 0 when it could evaluate (whatever the
  criteria say), 1 on an input error.
- Input errors: not exactly one report per GV2 case in the round folder (`<case>-<date>.json`); a report that is not
  `complete` or lacks a rep 0-19 of its case; reports with different `meta.sourceDigest` or `meta.versions`; a missing
  baseline file of a Hard or Expert case; a `final.jsonl` line without `request` or `puzzleId`. A cell comes from the
  report's `calibration.cells` (the aggregate that `calibrate.mjs` writes into each landscape report), its samples from
  the report's `runs`.
- A pure core, exported: `evaluateRound({ cells, baseline, lines, fit })` returns `{ criteria, cells, branches }`;
  each criterion is `{ status: 'pass' | 'fail' | 'unavailable', detail }` (C3 covers `provedZero`; the slow test is
  recorded apart), and `unavailable` does not meet it; `branches` lists, in this order, `caps` (C5 fails), `census` (C4
  fails), `availability` (C2 fails, or C1 is unavailable on a board) and `order` (C1 fails with every median present),
  or is `['final']` when every criterion passes.
- `--self-test` runs the pure core on five synthetic rounds and exits 1 on any difference:
  1. complete accepted puzzles, every `prod` line `complete`, one cell with `sampledUnrateable` 1 of 24 attempted
     samples: C5 passes, the cell shows "1 of 24", `branches` is `['final']`;
  2. the same with one `prod` line classified `capped`: C5 fails and `branches` starts with `caps`;
  3. every retained puzzle re-scores in band (`puzzleRescoreHitRate` 1) but no request reached ten
     (`requestCompletionRate` 0 against a GV2 value 0.9 on a Hard cell): C2 fails and `branches` is
     `['availability']`, never `final` and never a score-only round;
  4. one cell with `v3: null`: C1 is `unavailable` on its board, C3 and C4 are `unavailable` for that cell (not 0, not
     a pass), and `branches` contains `availability`;
  5. one cell with a census share of 0.06: C4 fails and `branches` contains `census`.

### The probe corpus of a round (cross-review SP06; MP06b Amendment A1, adapted)

Every observation of a round is made on packs captured once; nothing is regenerated for a rating run, and no output
file is ever overwritten.

- **Requests**: the 18 GV2 cases x reps 0-4 (90), request id `A-<case id>-r<rep>`, each generated exactly as
  `rate-probe --landscape` builds it (MP06b A1.1: `version` 1, the case's `boardRows`, `rotation`, `levelId`,
  `quantity` 10, `seedText` = `seedFor(case, rep)`, `batchIndex` 1, `batchSeed` = seedText + `#1`, the case's
  `uniqueness`, `versions` = `currentVersions()`) and captured with `node tools\generate.mjs --recipe <recipe file>
  --workers 4 --max-active <case maxActive> --output <pack file>`.
- **The round's corpus** (durable, written once): `docs/difficulty-v3/landscape-v3/r<k>/probe/packs/<request>.json`;
  `docs/difficulty-v3/landscape-v3/r<k>/probe/manifest.json` with the fields of MP06b A1.1 (one row per request, also
  for a request without puzzles; `identity.expected` = the `details.resultDigest` of the run with the same seed in this
  round's report `landscape-v3/r<k>/<case>-<date>.json`; `finalDeduce` = the six `DEDUCE` fields of the tree, the
  production tuple of the round); and `docs/difficulty-v3/landscape-v3/r<k>/probe/final.jsonl`, the `prod` lines merged
  as MP06b A1.5 (manifest order, then pack order; `request` and `corpus` in front; each request exactly `accepted`
  lines; `(request, puzzleId)` unique).
- **Labels** (outputs `tests\artifacts\MP12a\r<k>\runs\<label>\<request>.jsonl`: scratch, never overwritten; the
  label names the budget tuple, and the record gives each label's tuple):

  | Label | Packs | Options | Purpose |
  |---|---|---|---|
  | `prod` | all | `--orders 5 --tie-orders 3`, no `--deduce` | the authoritative lines of the round (`final.jsonl`), the order noise, C5 |
  | `cap-1g` | packs with a `capped` `prod` line | `--deduce '{"work":1000000000,"nodes":2000000}'` | cap inputs (C5) |
  | `cap-10g` | packs still `capped`, or with a count cutoff, under `cap-1g` | `--deduce '{"work":10000000000,"nodes":20000000}'` | the same, once more (A1's complete-diagnostic rule) |
  | `census-20m`, `census-40m`, `census-80m` | the packs of the cells above 5 % (C4) | `--deduce '{"census":X}'` with X = 20,000,000, 40,000,000, 80,000,000, in this order | the census budget (C4) |

- **Classification first** (MP06b A1.3 step 1): every line is `error`, `complete`, `capped` or `none`, and a
  `complete` line whose `deduction.search.stop` is `node-cap` or `work-cap` is a count cutoff. Only `complete` lines
  are read for `first` or `census`; a missing value is never read as 0; every table counts the other classes in their
  own columns.
- **The driver**: copy `tests/artifacts/MP06b/corpus.mjs` and `lib.mjs` to `tests/artifacts/MP12a/` and adapt them:
  corpus A only; the round's folders (`CORPUS_DIR`, `RUNS_DIR`, `RECIPES_DIR` per round); `expected` from the round's
  published report; the labels above. Run every capture and rating command through `Invoke-Dv3Timed -LimitSeconds
  570`, which replaces MP06b's `run-logged.mjs`; keep a run log `tests/artifacts/MP12a/r<k>/runlog.jsonl` (label,
  command, start, end, seconds, exit, timed out, lock wait). If those scratch files are gone, write the equivalent to
  MP06b Amendment A1 (A1.1, A1.2, A1.5, A1.6). A command is one board's group when it fits in 570 s (MP06b's v2 groups
  took 7-47 s; v3 is slower, so project from the first group), else one request. A single pack whose rating does not
  finish within 570 s stops the task: `rate-probe` has no puzzle selector, and a request is never regenerated or split
  (TP20); report it. Expected about 10-20 minutes for the captures and 10-15 for `prod` per round.
- **The fit input** (the ordering branch and P-OD3): copy `tests/artifacts/MP06c/fit.mjs` and `lib.mjs` to
  `tests/artifacts/MP12a/fit/`, set `CORPUS_DIR` to the round's `probe/` folder (its `loadData` checks the manifest,
  `finalDeduce` against the pinned `DEDUCE` and the `(request, puzzleId)` join) and the distance origin to
  `tupleOf(SCORE_V3)` of the tree (the current knobs, not MP06c's starting values); fit only the `complete` lines of
  requests whose `identity.match` is true, and list the others. Its hit rate is the **puzzle rescore hit rate**
  (`puzzleRescoreHitRate`: the retained puzzle lines of a cell that re-score into their requested level, with
  `Gproved >= 1` at Hard and above, over the cell's retained lines; MP06c "The fit"), never the request completion
  rate of C2 (TP22). Write the current tuple's rates to `tests/artifacts/MP12a/r<k>/fit-current.json` (`{ tuple,
  cells: { <case id>: { lines, hits, puzzleRescoreHitRate } } }`) for `criteria.mjs --fit`. If those scratch files are
  gone, write the equivalent to MP06c "The fit".
- **Verification under the chosen tuple**: a `DEDUCE` change is pinned in `policy.js` before the next round, whose
  `prod` label then measures it as the production tuple; a change chosen in round 2 cannot be verified in this task
  and is not made: report it.

### The stall stop and cells v3 cannot make (D21, D36)

- Report the `STALL_LIMIT` in force (12) with its D21-V3 record (MP09d2, `docs/difficulty-v3/d21-v3-2026-11-12.md`
  §5.5: the rule is not inert, it fired on 10 `any`-mode calls at N = 12, so MP12b2 skips its re-examination). The
  slice has no Hell case.
- A GV2 cell that makes no puzzle in the final round, after the changes of this task, is a finding for the owner with
  the options of D36 (plan author, P-OD5): (i) stop offering the level for that board area (the plan author's
  recommendation for levels v3 cannot make), or (iii) a separate engine project; option (ii), a different contract,
  is defined for Hell levels only and does not apply here. The finding gives the cell, the v2 and v3 request
  completion rates and yields, and why the requests failed (the report's failure reasons); MP12b2's search evidence
  adds the refused and unrateable profiles of the GV2 Hard, Expert and Master cells.

### Choosing a change (check-list D29)

- **C4 fails** (P-OD1): rate the captured packs of the failing cells with the labels `census-20m`, then `census-40m`,
  then `census-80m` (the override changes only the probe's measurement, never the generation); take the smallest
  budget at which every cell is at most 5 % (numerator: `complete` lines with `deduction.census.complete === false`;
  denominator: `complete` lines of the cell), and record the cost (deduction time median, p95 and maximum). If
  80,000,000 is not enough, keep 10,000,000 and report the cells to the owner (as D19). A new census value is a
  `DEDUCE` change, verified by the next round (above).
- **C5 fails** (P-OD2): for the packs with a `capped` `prod` line, run `cap-1g` and, for the packs still `capped` or
  with a count cutoff under it, `cap-10g`; set `work` and `nodes` by D19's rule (twice the largest main-search value
  of the complete diagnostic lines, `search.work - census.work` and `search.nodes - census.nodes`, rounded up to
  10,000,000 or 10,000) and record it; P-OD2's 760,000,000 stays unless that rule gives more. A line still `capped`
  under `cap-10g` is not an observed maximum: it gives no cap value and is an unresolved failure for the owner (D36,
  P-OD2); a count cutoff is a lower bound, left out of the maxima and listed. Diagnostic samples never enter this
  rule (TP21).
- **An availability failure: C2 fails, or C1 is unavailable on a board** (a cell without accepted puzzles; cross-review
  TP22). The measured `requestCompletionRate` decides, never a rescore. On a corpus of v3-made puzzles the current
  tuple re-scores every accepted puzzle into its band (`puzzleRescoreHitRate` 100 %, distance 0), so MP06c's grid
  returns the current tuple: run the grid once to show it and record the result; a rescore does not predict missing
  puzzles or completed requests. Never spend a round on an unchanged tuple. Instead prepare one evidence-based trial of
  `SHARES` (the level's initial clue share) or `K60` (the piece counts, with a `POLICY_ID` bump), SA2-Q-P09 branch A,
  from these facts per failing cell: the request outcomes (accepted 0-9 or 10 per request, the `partialReason`
  histogram), the observed K against `pieceCountRange`, and where the rated calibration and selection scores fall
  against the band, from at most one serial capture per failing cell under the D36 observer, with `D21_OUT` under
  `tests/artifacts/MP12a/r<k>/diag/` and at most 570 s under the lock
  (`node --import ./docs/difficulty-v3/d21-v3-2026-11-12/spent.mjs ./docs/difficulty-v3/d21-2026-11-12/flow.mjs
  --board <cols>x<rows> --level <id> --seed landscape-diag/<case id>/0 --quantity 10 --label <case id>`, summarised by
  `node ./docs/difficulty-v3/d21-v3-2026-11-12/summarise.mjs <file>`): scores all above the band argue for fewer
  pieces or more clues, all below for the opposite. Record the proposed values (the smallest change the facts
  support, the levels it touches, the reason), then stop and report: the next round starts only with the
  orchestrator's go-ahead (who may consult the plan author). When the facts point in no clear direction, no trial is
  justified: stop with the numbers (a finding for the owner, with the D36 options when a cell made no puzzle). A
  changed score tuple (C4, C5 or P-OD3) still needs the next round's measurement; the three-round ceiling stays.
- **C1 fails with every median present** (not expected: accepted v3 scores lie in their ordered bands): re-score the
  `complete` lines of the round's `final.jsonl` with `breakdownV3(metrics, knobs)` (`core/engine/difficulty.js`, MP08)
  over the grid of MP06c (`tasks/difficulty-v3/MP06c-initial-fit.md`, "The fit": the same grid, the same hit
  definition including `Gproved >= 1` for Hard and above, the same constraint and lexicographic objective on
  `puzzleRescoreHitRate`, but with **distance to the current knobs** instead of the starting values), through the fit
  input of "The probe corpus of a round". The best admissible set is the candidate; a re-score predicts, it does not
  prove: the next round measures it. When the best set is the current tuple, stop and report.
- **The penalty (P-OD3)**: in round 0, re-score the `complete` lines of `final.jsonl` with the current knobs and with
  the best set of the grid that has a nonzero penalty (`penalty.few >= 1`); if that set meets C1 on the re-scored
  medians and its predicted mean `puzzleRescoreHitRate` is at most 1 percentage point below the current knobs' (100 %
  on this corpus, which was selected under the current knobs, so the comparison favours them; the record says so),
  make it the candidate of round 1 (the intent of SA1-Q-P1) and measure it; otherwise keep (0, 0). Either way the
  record gives the comparison (the two sets, their predicted puzzle rescore hit rates and, when run, their measured
  request completion rates per cell), and the reply states it for the owner.

### Pinned tests (RES-26; check-list D23)

A knob change moves only the knob-dependent pins: `tests/policy.test.js` (`SCORE_V3` and, when changed, `DEDUCE`,
`K60`, `SHARES`, `POLICY_ID` pins), `tests/difficulty-v3.test.js` (the worked-example table of the knobs and the
recipes' v3 characterisation values: recompute them with `breakdownV3` from their deduction inputs, never copy an
implementation's output without checking it against the formula; a `SCORE_V3` change keeps the inputs, so the inputs
printed before the change serve, while a `DEDUCE` change needs them measured again first, with the new caps; `SHARES`
and `K60` do not touch these fixed recipes; TP26), the v3 clue tests that MP09d2 listed as knob-dependent (the table
below), and, after GF-P2, the generation fixtures and `tests/fixtures/ui-flow-recipes.json` (check-list D21: a UI-flow
recipe that stops completing is reported and the orchestrator holds the commit until the owner decides). Any other
failing test is reported, not edited.

### The D36 and fixture re-pins (cross-review TP26)

After a knob change, before the between-round checks and in any case before GF-P2 and the first strict `npm test`,
each of these is settled as the table says. A semantic failure (a request that no longer succeeds, a premise that no
longer holds) is a stop, never a re-pin.

| Pin | Treatment |
|---|---|
| 15 x 20 Nightmare (`tests/clues.test.js:552-562`: seed `t18-big-a`, set attempt 0, K 24, score 67, 4 clues, in band) | Run the same set attempt at the new tuple (command A below), check the printed score with `breakdownV3` from the printed metrics, then re-pin the score and the clue count, and K when it moved (only a `K60` or `SHARES` change can move it). If the attempt is no longer `ok` and in band, that is a finding: never change its seed, board, level or attempt. |
| The UI-flow recipes (`tests/fixtures/ui-flow-recipes.json`: `default-10x6-normal`, `heart-n10-master`, `square-22x22-nightmare`) | Keep the quantity and the request inputs; migrate only `expect.pieces`, `expect.puzzles` and `expect.scores` of a recipe whose GA-P2 batch completed (all quantity puzzles, no notice), as the GA-P2 block says. A recipe that does not complete stops the task (D21). |
| The unrateable calibration (`tests/clues.test.js:564-569`: 22 x 22 `hell-3`, `t18-big-a`, attempt 0, `{ ok: false, reason: 'not-in-band' }`) | `not-in-band` alone does not prove the premise: a rateable out-of-band calibration returns the same object. After any knob change, re-observe attempt 0 under the D36 observer (command B) and summarise it with `summarise.mjs`: its call must have no rated and no refused profile, only capped ones. If not, choose the input by MP09d2's rule (its record §3.3): the first of MP09d2's C1 order (22 x 22 `hell-3`, 15 x 20 `hell-2`, 22 x 22 `hell-1`, 22 x 22 `hell-2`, 32 x 15 `hell-3`, 18 x 18 `hell-2`, 24 x 24 `hell-3`) whose attempt 0, re-observed by command B with its board and level, is all capped; re-pin the test's board and level (seed and attempt unchanged). If none is, stop and report. |
| The generation fixtures (`tests/fixtures/generation-case.json`, `tests/fixtures/generated-sample-pack.json`) | GF-P2 alone refreshes them, then the strict fixture tests. Never edit a claim by hand, never weaken `checkRecipe`, never change `player/samples/sample-pack.json` or `tests/fixtures/puzzlecode-v1.json`. |

```powershell
. tests\artifacts\MP12a\dv3-lock.ps1
# A: the 15 x 20 Nightmare set attempt 0 at the tree's tuple
$a = "import { boardFromRows } from './core/engine/board.js'; import { setAttempt } from './core/engine/generate.js'; " +
  "import { createWorkspace, MAIN_WORKSPACE_BYTES, SCRATCH_WORKSPACE_BYTES } from './core/engine/workspace.js'; " +
  "const execution = { main: createWorkspace(MAIN_WORKSPACE_BYTES), scratch: createWorkspace(SCRATCH_WORKSPACE_BYTES) }; " +
  "const s = setAttempt({ board: boardFromRows(Array(20).fill('#'.repeat(15))), rotation: 0, levelId: 'nightmare', " +
  "seedText: 't18-big-a', uniqueness: 'any', execution }, 0); console.log(JSON.stringify(s.ok ? { K: s.set.pieces.length, " +
  "score: s.calibration.rating.score, clues: s.calibration.clues.length, metrics: s.calibration.rating.metrics } : s));"
$r = Invoke-Dv3Timed -Task "MP12a r$k 15x20 nightmare" -LimitSeconds 570 -NodeArgs @('--input-type=module', '-e', $a)
if ($r.Exit -ne 0) { throw 'command A failed' }
# B: attempt 0 of the unrateable input (board and level as the table says), observed by MP09d2's D36 observer
New-Item -ItemType Directory -Force "tests\artifacts\MP12a\r$k\d36" | Out-Null
$out = "tests/artifacts/MP12a/r$k/d36/avail-22x22-hell-3.jsonl"
$r = Invoke-Dv3Timed -Task "MP12a r$k unrateable input" -LimitSeconds 570 -Environment @{ D21_OUT = $out } -NodeArgs @(
  '--import', './docs/difficulty-v3/d21-v3-2026-11-12/spent.mjs', './docs/difficulty-v3/d21-v3-2026-11-12/avail.mjs',
  '--board', '22x22', '--level', 'hell-3', '--seed', 't18-big-a', '--attempts', '1')
if ($r.Exit -ne 0) { throw 'command B failed' }
node ./docs/difficulty-v3/d21-v3-2026-11-12/summarise.mjs $out
```

Then both slow tests of `tests/clues.test.js` pass under the lock (the between-round checks below run them).

### Test order around a knob change (cross-review TP06)

The recorded generation fixtures and the UI-flow recipes keep the old knobs until GF-P2, which runs once, after the
final round. Before it, the files that read those fixtures or run the recorded recipe fail by design: a score or share
change moves the recorded keys and scores, and a `K60` or `POLICY_ID` change makes `checkRecipe`
(`tools/generate.mjs:276-279`) refuse the recipe at once. Re-pinning the unit tables cannot make them pass. So:

- **Between rounds** (after a change and its re-pins, before the next round), only these checks, each under the lock,
  and they must pass:

  ```powershell
  . tests\artifacts\MP12a\dv3-lock.ps1
  $r = Invoke-Dv3Timed -Task "MP12a r$k between-round checks" -NodeArgs @('--test', '--test-skip-pattern=slow',
    'tests/policy.test.js', 'tests/difficulty.test.js', 'tests/difficulty-v3.test.js', 'tests/clues.test.js',
    'tests/tasks.test.js', 'tests/worker-pool.test.js')
  if ($r.Exit -ne 0) { throw 'between-round checks failed' }
  $r = Invoke-Dv3Timed -Task "MP12a r$k slow v3 test" -NodeArgs @('--test', '--test-name-pattern=^slow: v3 generation',
    'tests/difficulty-v3.test.js')
  if ($r.Exit -ne 0) { throw 'slow v3 test failed' }
  $r = Invoke-Dv3Timed -Task "MP12a r$k D36 slow tests" -NodeArgs @('--test',
    '--test-name-pattern=^slow: (a 15 x 20 Nightmare|an unrateable calibration)', 'tests/clues.test.js')
  if ($r.Exit -ne 0) { throw 'D36 slow tests failed' }
  ```

  These files read only static fixtures (`polyominoes.js`, `clue-recipes.js`, `hand-authored-pack.json` and the frozen
  `puzzlecode-v1.json`), never the generated ones. Do not run the fixture-dependent files below or the quick set as a
  gate between rounds. A quick-set run between rounds is optional and is diagnostic output only (under the lock, with
  `--test-reporter=spec --test-reporter-destination=tests/artifacts/MP12a/r<k>-quick-diagnostic.txt`): never stop on
  it and never edit a test because of it.
- **After the final round, when a knob changed**: GF-P2, then the strict checks (the fixture-dependent files of
  MP09d2's Phase E, then the whole quick set), then GA-P2 by MP09d2's Phase F procedure (below). Everything after GF-P2
  must pass.
- **Without any knob change** there is no GF-P2 and no GA-P2; `npm run test:quick` must pass as it is.

### GF-P2 and GA-P2 (only when this task changed a knob)

After the last change of this task and its final round (GF-P2 about 2 s per command, the fixture-dependent files and
the quick set about 2-4 minutes, GA-P2 about 5-10 minutes; every command under the lock, at most 590 s):

```powershell
. tests\artifacts\MP12a\dv3-lock.ps1
$r = Invoke-Dv3Timed -Task 'MP12a GF-P2 replace' -NodeArgs @('tools/record-fixtures.mjs', '--replace', '--reason',
  'P3: v3 calibration (slice)')
if ($r.Exit -ne 0) { throw 'record-fixtures failed' }
$r = Invoke-Dv3Timed -Task 'MP12a GF-P2 check' -NodeArgs @('tools/record-fixtures.mjs', '--check')
if ($r.Exit -ne 0) { throw 'fixture check failed' }
git --no-pager diff --stat -- tests/fixtures player/samples

# strict after GF-P2: the fixture-dependent files, then the whole quick set
$r = Invoke-Dv3Timed -Task 'MP12a fixture-dependent files' -NodeArgs @('--test', '--test-skip-pattern=slow',
  'tests/generate.test.js', 'tests/cli.test.js', 'tests/puzzlecode-cli.test.js', 'tests/generation-client.test.js',
  'tests/calibration.test.js', 'tests/benchmark-matrix.test.js', 'tests/player-load.test.js', 'tests/rate-probe.test.js',
  'tests/generator-state.test.js', 'tests/generator-controller.test.js', 'tests/pack.test.js')
if ($r.Exit -ne 0) { throw 'fixture-dependent tests failed after GF-P2' }
$r = Invoke-Dv3Timed -Task 'MP12a quick set' -NodeArgs @('--test', '--test-skip-pattern=slow', 'tests/**/*.test.js')
if ($r.Exit -ne 0) { throw 'quick set failed after GF-P2' }

# GA-P2: the first run is kept as evidence (TAP file); then the UI-flow migration; the final run is the verdict
$r = Invoke-Dv3Timed -Task 'MP12a GA-P2 first' -NodeArgs @('--test', '--test-reporter=spec',
  '--test-reporter-destination=stdout', '--test-reporter=tap',
  '--test-reporter-destination=tests/artifacts/MP12a/ga-p2-first.txt', 'tests/**/*.test.js')
"GA-P2 first run: exit $($r.Exit), stopped at the limit $($r.TimedOut)"
# Read the failures in ga-p2-first.txt. Allowed: UI-flow expectations of recipes that completed (all quantity puzzles,
# no notice); migrate their expect.pieces, expect.puzzles and expect.scores in tests\fixtures\ui-flow-recipes.json.
# Anything else (a recipe that does not complete, a slow D36 test of tests\clues.test.js, any other test, a run stopped
# at the limit) stops the task here: report it (D21, D36).
$r = Invoke-Dv3Timed -Task 'MP12a UI-flow recipes' -NodeArgs @('--test', 'tests/generator-controller.test.js')
if ($r.Exit -ne 0) { throw 'GA-P2: UI-flow recipes still fail after the migration' }
$r = Invoke-Dv3Timed -Task 'MP12a GA-P2 final' -NodeArgs @('--test', 'tests/**/*.test.js')
if ($r.Exit -ne 0) { throw 'GA-P2: the final npm test failed' }
```

`node --test "tests/**/*.test.js"` is `npm test` (`package.json`); a run stopped at 590 s is a failure to report
(AGENTS.md); do not raise a limit.

### The record `docs/difficulty-v3/calibration-slice-<date>.md`

1. Header: date, code revision per round, Node version, CPU count, the knobs and caps at the start, the `STALL_LIMIT`
   in force with MP09d2's decision (its record §5.5), the run-control checks (the launcher's self-test line, the
   fake-tree check, the criteria script's self-test).
2. Per round: the plan written before it; the invocation table (case, start, end, seconds, launcher exit, rows after
   it, lock wait) and the publish line of each case; the source identity of the round's reports (`sourceDigest`,
   `versions`, `sourceCommit`); the probe corpus (the manifest summary, each label with its budget tuple, the commands
   and outcomes with their lock waits, the classification counts); the criteria table C1-C5 of `criteria.mjs` (pass,
   fail or unavailable with the numbers); the per-cell measures listed above; the GV2 comparison table (per cell: GV2
   request completion rate and yield, v3 request completion rate and yield, difference, the C2 bound, and the v3
   puzzle rescore hit rate in its own column); the diagnostic samples; the order-noise table.
3. The changes: for each, the knob, the old and new value, the reason, the predicted and the measured effect; for an
   availability failure, the facts, the proposed trial and the orchestrator's answer, or the stop.
4. P-OD1, P-OD2 and P-OD3: the outcome of each, with its numbers.
5. Findings for the owner (or "none"; a cell v3 cannot make with the D36 options), and the values handed to MP12b1.

## Files to create/modify

| File | Change |
|---|---|
| `core/engine/policy.js` | `SCORE_V3`, `DEDUCE`, `K60`, `POLICY_ID` values only (when changed) |
| `core/engine/levels.js` | `SHARES` values only (when changed) |
| `tests/policy.test.js`, `tests/difficulty-v3.test.js`, the knob-dependent clue tests (MP09d2's list, the replaced 15 x 20 slow test among them), `tests/fixtures/ui-flow-recipes.json` | re-pins (when a knob changed) |
| `tests/fixtures/generation-case.json`, `tests/fixtures/generated-sample-pack.json` | by the tool (GF-P2, when a knob changed) |
| `docs/difficulty-v3/landscape-v3/launch.mjs` (new) | the landscape launcher, exactly as given (TP20); MP12b1 and MP12b2 use it read-only |
| `docs/difficulty-v3/landscape-v3/criteria.mjs` (new) | the criteria script with its self-test (TP21, TP22, TP27) |
| `docs/difficulty-v3/landscape-v3/` (new) | the round folders `r0/`, `r1/`, `r2/` with the published shard reports and each round's `probe/` corpus (`packs/`, `manifest.json`, `final.jsonl`) |
| `docs/difficulty-v3/calibration-slice-<date>.md` (new) | the record |
| `docs/design-detail.md`, `docs/design-brief.md` | only when a value changes (documentation slot) |

Exclusive ownership while active: the files above; scratch under `tests/artifacts/MP12a/` (the helper's copy
`dv3-lock.ps1`, the staged landscape reports and checkpoints, the drivers, the run logs). Documentation slot
(cross-review SP07: the living documents describe the current values at every commit), only when this task changes a
value: design §7.8, one sentence saying that the knobs and caps in `core/engine/policy.js` are those of the slice
(link to the record; MP12b2 writes the measured parameters after the lock); for a `K60` or `SHARES` change, the
values that design §7.4 and §7.5 quote, and the brief's table "Levels and typical boards" (its example piece counts,
recomputed with `pieceCountRange(levelId, area)` of `core/engine/policy.js` for the boards and levels of the table).
Without a change: none. Must not edit: algorithm code, `player/samples/sample-pack.json`,
`tests/fixtures/puzzlecode-v1.json` (check-list D20).

## Implementation steps

1. Read the inputs; list the cases; save the lock helper; create the launcher exactly and the criteria script; run
   the checks of "Run control" and the criteria script's self-test.
2. Round 0 (its plan written first): shards, probe, evaluation, the P-OD3 comparison.
3. If needed: the change (an availability failure stops for the orchestrator's go-ahead first), the re-pins, the
   between-round checks and the slow tests ("Test order around a knob change"; no fixture-dependent file and no quick
   set as a gate); then the next round.
4. After the final round, when a knob changed: GF-P2, the strict post-GF-P2 checks, GA-P2 (all in "GF-P2 and GA-P2");
   without a change: the quick set under the lock. Then the record and `npm run check`.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP12a-B01 | On the four GV2 boards, generated levels are ordered, Hard and Expert keep their request completion rate within 10 points of v2, and every Hard-or-above puzzle has a proved real choice — or the failing cells are reported to the owner with data | the record's final criteria table |
| MP12a-B02 | The owner's three questions are answered with numbers: the census budget (P-OD1), the work cap (P-OD2), the penalty (P-OD3) | record §4 |
| MP12a-B03 | Every knob change is within the approved ranges and recorded with its before and after data | record §3; the diff of `policy.js` and `levels.js` |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP12a-T01 | Every shard of every round ran through the launcher under the lock helper, each invocation recorded (case, times, launcher exit, rows, lock wait), every resume the identical command after exit 3; every report was published once by `launch.mjs publish` under `landscape-v3/r<k>/`; none was overwritten; no published case left a checkpoint | the record; `git status` |
| MP12a-T02 | Each round's probe corpus follows "The probe corpus of a round": every request captured once and listed in the manifest (also without puzzles), identity matches and mismatches recorded, every rating run on the captured packs under a label naming its budget tuple, every capture and rating command under the lock within 570 s, no output overwritten, `final.jsonl` merged with the count and `(request, puzzleId)` checks, lines classified before any `first` or `census` value is read | the corpus folders; the record; the scratch driver |
| MP12a-T03 | C2 is decided by the measured `requestCompletionRate` and never by `puzzleRescoreHitRate`; C5 counts only the `prod` lines of accepted puzzles, and the diagnostic samples are reported with their denominators (TP21, TP22); no round ran on an unchanged tuple after an availability failure; the knob search follows MP06c's grid, hit definition, constraint and objective (distance to the current knobs), on the `complete` lines of identity-matched requests only; a raised cap comes only from complete diagnostic lines | the record; `criteria.mjs`; the scratch scripts |
| MP12a-T04 | After a knob change: only knob-dependent pins changed, the D36 and fixture re-pins settled by their table (TP26); between rounds only the fixture-independent checks and the slow tests gated the next round (TP06); after the final round GF-P2 with the reason "P3: v3 calibration (slice)", `--check`, the fixture-dependent files and the quick set pass, and GA-P2 passes with only completed UI-flow recipes migrated (first run kept in `tests/artifacts/MP12a/ga-p2-first.txt`) | gate record |
| MP12a-T05 | The quick set (under the lock) and `npm run check` pass; the record, the reports and the two scripts are CRLF without BOM | command output |
| MP12a-T06 | `launch.mjs` is the code given here and its self-test passes 22 of 22; the fake-tree check stopped both processes and released its test lock; `criteria.mjs --self-test` passes its five cases | the record; command output |

## Test plan

### Exact commands

The rounds as written above, with the between-round checks of "Test order around a knob change" after a change, and
GF-P2 and GA-P2 as written there when a knob changed. Then, on the final tree:

```powershell
node docs/difficulty-v3/landscape-v3/launch.mjs --self-test
if ($LASTEXITCODE -ne 0) { throw 'launcher self-test failed' }
node docs/difficulty-v3/landscape-v3/criteria.mjs --self-test
if ($LASTEXITCODE -ne 0) { throw 'criteria self-test failed' }
. tests\artifacts\MP12a\dv3-lock.ps1
$r = Invoke-Dv3Timed -Task 'MP12a targeted tests' -NodeArgs @('--test', '--test-skip-pattern=slow', 'tests/policy.test.js',
  'tests/difficulty.test.js', 'tests/difficulty-v3.test.js', 'tests/clues.test.js', 'tests/tasks.test.js',
  'tests/worker-pool.test.js')
if ($r.Exit -ne 0) { throw 'targeted tests failed' }
$r = Invoke-Dv3Timed -Task 'MP12a slow v3 test' -NodeArgs @('--test', '--test-name-pattern=^slow: v3 generation',
  'tests/difficulty-v3.test.js')
if ($r.Exit -ne 0) { throw 'slow v3 test failed' }
$r = Invoke-Dv3Timed -Task 'MP12a quick set' -NodeArgs @('--test', '--test-skip-pattern=slow', 'tests/**/*.test.js')
if ($r.Exit -ne 0) { throw 'quick set failed' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'repository check failed' }
```

On a tree with a knob change, the quick set runs only after GF-P2 (before it, it fails by design).

## Definition of done & handoff

- Every criterion has its evidence; the reply gives the final criteria table, every change with its reason, the
  P-OD1, P-OD2 and P-OD3 outcomes, the `STALL_LIMIT` in force, the machine time per round with the lock waits apart,
  and any finding for the owner.
- Handoff to MP12b1: the knobs and caps after this task, the record path, the last round's folder (its 18 reports are
  the slice evidence of the lock) with the source identity of its reports, the launcher's path, and whether GF-P2 and
  GA-P2 ran.

## Execution log

| Field | Value |
|---|---|
| Status | Accepted and committed (`difficulty-v3 MP12a: Calibration slice: the GV2 cases again with v3, and the knob changes`); the rounds' files were committed earlier in the pause-state commit `a25960c`, the close in this commit |
| Start | 2026-11-13 12:24 (+07:00), first developer (rounds 0-2); close 20:54 |
| End | 2026-11-13 17:49 first developer, cancelled by the owner's pause; close 21:02 developer, 21:15 orchestrator commit |
| Duration | first developer about 5 h 25 min (machine runs about 1.5 h of it: round 0 12:30-13:31, round 1 13:40-14:14, round 2 16:39-17:11; owner waits for P-OD7 and P-OD8 included); close 8 min developer (four locked commands 155.6 s, lock waits 0 s); about 10 min review. The pause (17:52-20:54) is not counted |
| Model | claude-sonnet-5.5 (two developers: rounds 0-2 in the previous orchestrator session, the close in this one); orchestrator review claude-opus-5.5 |
| Token usage | 390 model calls (342 + 48); 91,638,952 input tokens (90,212,585 cache reads); 378,757 output tokens |
| AI credits | about 1,638 (developers: about 1,519 for rounds 0-2, about 119 for the close) |
| Verification | Close developer (`MP12a-close-addendum.md`): identity check (digest `34cea386…`, versions `gen-v3`, `mixed-v2`, `xoshiro128ss-v1`, `difficulty-v3`; diff since `f33aa71` exactly the 7 expected files); `record-fixtures --check` OK (0.6 s); UI-flow recipes 29/29 (9.4 s); GA-P2 final `npm test` 1,360/1,360 (122.6 s, TAP `tests/artifacts/MP12a/ga-p2-r2-final.txt`, the EPERM exception not needed); quick set 1,340/1,340 (23.0 s); `launch.mjs --self-test` 23 of 23, `criteria.mjs --self-test` 5 of 5; `npm run check` OK; CRLF without BOM. Orchestrator re-run: quick set 1,340/1,340 (22.7 s under the timing lock); `npm run check` OK |
| Acceptance | MP12a-B01..B03 and T01..T06 as evaluated in the record (C1, C2, C3 and C5 pass; C4 with the two owner-accepted exceptions, P-OD7 and P-OD8); close criteria MP12a-C01..C05 met. Diff reviewed: the record gains §7.2's P-OD8 sentence, §8.5's closing line, §8.6-§8.9 (P-OD8 and the PR-P1 rows, GF-P2 and GA-P2 of round 2, the test plan) and §9 "Handoff"; `docs/design-detail.md` §7.8 states the census change with both exceptions and R7 as a known limitation, §7.9 names both exceptions without the duplicated sentences, §4.2's `SCORE_V3` comment is current. No `SOURCE_FILES` file, test or fixture changed by the close |
| Issues & resolutions | (1) C4 failed after round 0 in five cells and after round 2 in 10x10-master (7.0 %) and 18x20-master (11.0 %): the owner raised `census` to 80,000,000 (P-OD7) and accepted both cells' estimates (P-OD8 (a)); the task stopped by its orders, no fourth round. (2) The owner's pause at 17:52 cancelled the first developer during the close; the close ran after the plan author's answer to PR-P1 from `MP12a-close-addendum.md` (binding). (3) `tests/site-tools.test.js` EPERM in the first round-2 GA-P2 run (17:45): passed alone at 17:48 and did not recur in the final `npm test`; a named item for MP17 (record §8.6). (4) The stale comment above `SCORE_V3` in `core/engine/policy.js` stays to keep the source digest; MP12b3 corrects it. (5) The close's quick-set command added a TAP reporter to count the tests (recorded in §8.9) |
| Handoff | MP12b1: reuse the 18 round-2 reports of `docs/difficulty-v3/landscape-v3/r2/` by the digest `34cea386…` and the four version keys; the costly cells are the Master cells and 18x20-expert (10x10-master's work at 58.6 % of the cap). MP12b2: lock `12 / 3 / [0, 0, 2, 3] / G 5 / info 0.5 / (1, 2)` unless MP12b1 breaks C1 or C3; the two accepted census exceptions; R7 a known limitation; `STALL_LIMIT` 12. Owner: nothing open from this task |
