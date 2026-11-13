# MP17 — Final compatibility and regression evidence, release notes (gate GZ)

| Header | Value |
|---|---|
| ID | MP17 (the report's MP17, dispatched whole) |
| Depends on | MP16b (accepted and committed: the card button, `tests/browser/replay.html`, the GB-P4 record) and, through it, every earlier part; the lock of MP12b2 (or MP12b3, check-list D35) |
| Estimated size | Medium: about 300–500 changed lines (the record about 250–400 lines with the release notes; justified corrections, if any); about 50–60 minutes of work plus about 70–100 minutes of machine time (gate GZ) |
| Owner role | QA and release |
| Milestone | M10 — verified |
| Design refs | `docs/difficulty-v3/report-detailed.md` §5.1 (MP17 row), §5.2 (the lock), §5.3 (GZ), RES-01 and RES-25 (what the lock means), RES-32 (MP17 row: the release notes), RES-35 (AR1); `docs/difficulty-v3/plan.md` §1.1, §6 and §7 (last item); clarifications C3 (a), AR1 (part G), PROC-P1 (a); check-list §6, §7, §9 |
| Gates owned | **GZ**: the two fixture checks; `npm test`; the plan §6 probe and the level runs on 10x6 and 20x18 (`tools/generate.mjs`, small counts, a fresh attempt directory); a small `tools/rate-probe.mjs` run; every page of `tests/browser/` in headless Edge in the main phase, plus the keys and narrow phases of `puzzle-code-acceptance` and the keys phase of `replay` (ports 8817 and 9317; MP16b's runner) |
| Implementation status | Not started |

## Goal & business context

The owner asked to "make Hard really hard": Hard and above must need at least one real choice, generated puzzles must
sit in the middle of their band, and the levels must be measured, fitted and locked before Generation Steps. This last
task proves, on the finished branch, that the change does what was asked and broke nothing:

- the plan's own reproduction (plan §6), which on 2026-11-11 showed 20x18 Hard puzzles that needed no choice at all
  (B = 0), now shows only Hard-or-above puzzles with a proved decisive guess (`Gproved >= 1`, hence G >= 1);
- on 10x6 and 20x18 every offered level still produces puzzles in its band, in increasing order;
- nothing in the rating or the generation changed after the lock (MP12b2): Generation Steps (MP13a to MP16b) only
  observes;
- the full test suite and every browser page pass;
- users get release notes of the change (C3 (a)): there is no release-notes file in the repository and no
  `CHANGELOG.md` is added, so the notes are a section of the final record.

This is a regression run only (PROC-P1 (a)): no refit, no knob change, no algorithm change.

## Scope

### In scope

- Before the gate: the lock inspection (git commands and the printed constants only; step 1). Gate GZ, in this
  order: the two fixture checks; `npm test`; the generation runs; the re-rating of their puzzles; the `rate-probe`
  runs; the browser runs (cross-review SP18: the fixture checks regenerate puzzles, so they are part of the gate).
- Scratch scripts under `tests/artifacts/MP17/` (given below; not committed).
- The record `docs/difficulty-v3/final-<date>.md` (new; `<date>` is the date of the GZ runs, `YYYY-MM-DD`), with the
  section "Release notes".
- Justified corrections only (the rule below): document wording in the living documents, in both languages, and test
  names, comments or expectations; each one listed in the record and the reply with its reason.

### Out of scope

- Any change under `core/`, `tools/`, `generator/` or `player/` (code and locales), any pinned rating or generation
  value, any generated fixture, `player/samples/sample-pack.json`, `tests/fixtures/puzzlecode-v1.json`. A defect found
  by GZ is reported to the orchestrator with its evidence; the orchestrator sends it to the task that owns the file as
  a fix round (check-list §2, step 5) and GZ is repeated for what the fix touches.
- A refit or a change of any knob, cap, band, rule, counter, clue-search setting, `SHARES` or `K60` (locked).
- Physical devices (printers, phone cameras): the blocked checks of `tests/browser/acceptance.html` stay blocked.
- The release decision record (check-list §9) and the execution summary: the orchestrator's. Merging and pushing.

### The rule for a justified correction

A correction is allowed only when all three hold: (1) the item is a sentence of a living document (`README.md`,
`USERGUIDE.md`, `USERGUIDE.vn.md`, `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md`, `docs/design-brief.md`,
`docs/design-detail.md`) or a test name, comment or expectation (`tests/*.test.js`, `tests/browser/*.js`); (2) it is
stale because of an intended contract of an accepted task, which the correction names with its acceptance ID (for
example "MP10b1-B02: v2 claims show a derived display rating"); (3) no code, no pinned rating or generation value and
no generated fixture changes. Anything else is a defect report. A failing test is never weakened, skipped or deleted.

## Repository rules

- Read `AGENTS.md` and `tasks/difficulty-v3/check-list.md` §3, §6 and §7 first.
- **Announce the gate to the orchestrator before starting it** (the Sudoku repository runs in parallel on the same
  machine; never two heavy runs at once): "GZ: the two fixture checks (about as long as in the GF-P2 record of MP09d2,
  or of the last task that re-recorded the fixtures, and the GF-P4 record of MP13b), `npm test` (about 5–10 minutes),
  12 generation runs (about 15–30 minutes), the re-rating and up to 3 `rate-probe` runs (about 5–15 minutes), 19
  browser runs in four invocations (16 pages in the main phase, the keys and narrow phases of
  `puzzle-code-acceptance`, the keys phase of `replay`; about 20–30 minutes); about 70–100 minutes in total, one run
  at a time". Start only when the orchestrator says the machine is free. Only the lock inspection (step 1: git
  commands and `lock-values.mjs`, which prints constants) runs before the announcement; a retry of any gate command,
  the fixture checks included, waits for the orchestrator's go in the same way (cross-review SP18).
- Every test, probe and generation run finishes within 10 minutes and every browser check within 1 minute; a longer
  run has an error: stop it by its PID and report it.
- Never stage, commit, stash, reset, push or switch branches; never edit `tasks/difficulty-v3/`, the reports,
  `plan.md`, `clarifications.md`, the analysts' folders or an earlier record under `docs/difficulty-v3/`.
- UTF-8 without BOM, CRLF, final newline, no trailing whitespace; no absolute path in a document. Check
  `$LASTEXITCODE` after every `node` and `npm` command.

## Inputs & context

At the start, `git --no-pager status --short` must show no change outside `tasks/difficulty-v3/`; otherwise report it
before running anything. Line anchors below are at HEAD `60575a4`; later tasks moved lines: find them by the quoted
text.

### What the evidence must show (report §5.1, MP17 row; plan §7, last item)

1. Every generated Hard-or-above puzzle has `Gproved >= 1` (hence G >= 1: no G = 0).
2. Levels ordered on 10x6 and 20x18.
3. No scoring change since the lock.
4. Release notes written.
5. `npm run test:quick` and `npm run check` green.

### The lock (MP12b2) and what may differ since

- The lock commit is the latest commit of MP12b2, or of MP12b3 when the owner chose D36 (i) (both messages start
  with `difficulty-v3 MP12b`; MP12b1 comes earlier):
  `git --no-pager log -1 --format="%H %s" --grep="^difficulty-v3 MP12b"`. Its record, the **lock record**, is
  `docs/difficulty-v3/calibration-<date>.md` (find it with `Get-ChildItem docs\difficulty-v3\calibration-2*.md`; MP12a's
  `calibration-slice-<date>.md` is the slice record): its header lists the final knobs and caps as literals, §3 the
  per-board and per-level results (with `provedZero`, which must be 0), §12 the lock statement (MP12b2's layout).
- Allowed since the lock (MP13a to MP16b; they add observers and new modules, never a rating or a generated puzzle):
  `core/engine/policy.js` gains `REPLAY` (MP15a1) and nothing else; `core/engine/difficulty.js` gains `rateDetailed`
  (MP14a); `clues.js`, `generate.js`, `carve.js`, `tiling.js` gain skip ordinals and recorders (MP13a, MP14a, MP14b);
  `pack.js` gains the provenance checks (MP13a); new `replay.js`, `protocol.js` and `tasks.js` cases, client, Generator
  and UI files. `core/engine/levels.js`, `core/engine/version.js` and `core/engine/deduce.js` are unchanged.
- The evidence that the changed files did not change a rating or a generated puzzle is not the diff but the fixture
  checks (`node tools\record-fixtures.mjs --check` regenerates the generation fixtures recorded at the lock and
  compares the whole text; `--replay-case --check` does the same for MP13b's replay fixture) and the pinned tests
  (`tests/policy.test.js` pins `SCORE_V3` and `DEDUCE`; `tests/difficulty-v3.test.js`, `tests/clues.test.js` and the
  recorder tests pin ratings and selections).
- `K60` (`core/engine/policy.js`, `const K60 = [...]`, line 109 at HEAD) and `SHARES` (`core/engine/levels.js`,
  `const SHARES = [...]`, line 18) are module-private: compare their source lines.

### Baselines to compare with

- Plan §1.1 (probe of 2026-11-11, v2), the "before" of the final record:

  | Board | Level | K (pieces) | Piece sizes | Per puzzle: U (to place), B (branch trials), score |
  |---|---|---|---|---|
  | 10x6 | easy | 7 | 6..11 | U 3-4, B 1-2, score 8-10 |
  | 10x6 | **hard** | 9 | 5..8 | U 6, **B 6, 6, 10, 13, 32**, score 19-24 |
  | 20x18 | **hard** | 16 | 19..27 | U 9-10, **B 0, 0, 2**, score 18-24 |
  | 20x18 | expert | 18 | 14..24 | U 13, B 7-17, score 33-36 |

- The lock record: hit rates, T10 times and score distributions of the cells 6x10 and 18x20 (the same rectangles as
  10x6 and 20x18, turned by a quarter; seeds differ, so compare ranges and availability, not single puzzles).
- The gate records in the Execution logs of MP09e (code pages), MP10b2 (display pages) and MP16b (replay, rendering,
  generator-flow, acceptance): the expected result of each page they ran. `tests/browser/acceptance.html` reported
  "16 checks, 4 blocked" at the regenerate-puzzle release; the blocked checks need a physical device.
- The slow test of MP11 in `tests/difficulty-v3.test.js`: "slow: v3 generation orders the levels on 10x6 and 12x12,
  and every Hard-or-above puzzle has a proved guess" (AR1 on generated puzzles; `npm test` runs it).

### Offered levels and bands

`offeredLevels(60)` is very-easy, easy, normal, hard, expert, master; `offeredLevels(360)` is hard, expert, master,
nightmare, hell-1, hell-2 (`core/engine/levels.js`, `AREAS`; as at HEAD `60575a4`: an owner answer to MP12b2's D36
question may stop offering a level on a board, and the runs below follow `offeredLevels` as it is after the lock).
Band lower edges `bandEdge(0..8)`: 0, 8, 12, 17, 25, 37, 53, 77, 112. Hard is level index 3; "Hard or above" is
index >= 3.

### The generation runs (12)

From the repository root, `--workers 4`, default uniqueness (`any`) and `--max-active` (676), each pack written with
`--output` into a **fresh attempt directory** `tests\artifacts\MP17\gz-<yyyyMMdd-HHmmss>` that the block creates and
never reuses: a run without a result writes no file, so a reused directory could show an earlier pack beside the new
exit code (cross-review SP17). A repeated attempt makes a new directory; the record names the attempt it reports. The
first three runs are plan §6 verbatim (seeds `probe1` to `probe3`); the others complete the offered levels of both
boards.

| Name | Board | Level | Count | Seed |
|---|---|---|---:|---|
| p1 | 10x6 | hard | 5 | probe1 |
| p2 | 20x18 | hard | 3 | probe2 |
| p3 | 20x18 | expert | 3 | probe3 |
| s-very-easy | 10x6 | very-easy | 3 | final-10x6-very-easy |
| s-easy | 10x6 | easy | 3 | final-10x6-easy |
| s-normal | 10x6 | normal | 3 | final-10x6-normal |
| s-expert | 10x6 | expert | 3 | final-10x6-expert |
| s-master | 10x6 | master | 3 | final-10x6-master |
| t-master | 20x18 | master | 3 | final-20x18-master |
| t-nightmare | 20x18 | nightmare | 3 | final-20x18-nightmare |
| t-hell-1 | 20x18 | hell-1 | 3 | final-20x18-hell-1 |
| t-hell-2 | 20x18 | hell-2 | 3 | final-20x18-hell-2 |

Exit codes of `tools/generate.mjs`: 0 complete, 2 valid partial pack, 1 no usable result (no file written). A run
whose level is not offered on its board after the lock is not run and is recorded as `skipped: 'not-offered'`. The
manifest `runs.json` records for every run its exit code, time, and the size and SHA-256 of the pack it wrote (null
without one); `summarise.mjs` reads only the packs of this attempt whose digest matches.

```powershell
$gz = "tests\artifacts\MP17\gz-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
if (Test-Path $gz) { throw "attempt directory $gz exists" }
New-Item -ItemType Directory $gz | Out-Null
$offered = node -e "import('./core/engine/levels.js').then(({ offeredLevels: o }) => console.log(JSON.stringify({ '10x6': o(60).map((l) => l.id), '20x18': o(360).map((l) => l.id) })))" | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'offered levels not read' }
$runs = @(
  @('p1', '10x6', 'hard', 5, 'probe1'), @('p2', '20x18', 'hard', 3, 'probe2'), @('p3', '20x18', 'expert', 3, 'probe3'),
  @('s-very-easy', '10x6', 'very-easy', 3, 'final-10x6-very-easy'), @('s-easy', '10x6', 'easy', 3, 'final-10x6-easy'),
  @('s-normal', '10x6', 'normal', 3, 'final-10x6-normal'), @('s-expert', '10x6', 'expert', 3, 'final-10x6-expert'),
  @('s-master', '10x6', 'master', 3, 'final-10x6-master'), @('t-master', '20x18', 'master', 3, 'final-20x18-master'),
  @('t-nightmare', '20x18', 'nightmare', 3, 'final-20x18-nightmare'),
  @('t-hell-1', '20x18', 'hell-1', 3, 'final-20x18-hell-1'), @('t-hell-2', '20x18', 'hell-2', 3, 'final-20x18-hell-2')
)
$log = @()
foreach ($r in $runs) {
  $out = "$gz\$($r[0]).json"
  if ($offered.($r[1]) -notcontains $r[2]) {
    $log += [pscustomobject]@{ name = $r[0]; board = $r[1]; level = $r[2]; count = $r[3]; seed = $r[4]; skipped = 'not-offered'; exit = $null; ms = 0; bytes = $null; sha256 = $null }
    '{0}: {1} is not offered on {2}, not run' -f $r[0], $r[2], $r[1]
    continue
  }
  $start = Get-Date
  node tools\generate.mjs --board $r[1] --level $r[2] --count $r[3] --seed $r[4] --workers 4 --output $out 2> "$gz\$($r[0]).err.txt"
  $code = $LASTEXITCODE
  $ms = [int]((Get-Date) - $start).TotalMilliseconds
  $present = Test-Path $out
  $log += [pscustomobject]@{ name = $r[0]; board = $r[1]; level = $r[2]; count = $r[3]; seed = $r[4]; skipped = $null; exit = $code; ms = $ms
    bytes = $(if ($present) { (Get-Item $out).Length } else { $null }); sha256 = $(if ($present) { (Get-FileHash -Algorithm SHA256 $out).Hash.ToLower() } else { $null }) }
  '{0}: exit {1}, {2} ms, {3}' -f $r[0], $code, $ms, $(if ($present) { 'pack written' } else { 'no pack' })
}
ConvertTo-Json -InputObject $log | Set-Content -Encoding utf8 "$gz\runs.json"
"attempt directory: $gz"
```

Keep the printed attempt directory: the next commands use it (`$gz` must be set again in every new PowerShell
call, for example `$gz = 'tests\artifacts\MP17\gz-20270101-120000'`). This block was checked on a scratch tree
with a reduced run list (manifest, skipped rows, digests).

Each command normally ends within a few minutes (the generation client stops dispatching a batch at 115 s, `TIME` in
`core/engine/policy.js`); one still running after 10 minutes is stopped by its PID (find it by its command line with
`Get-CimInstance Win32_Process -Filter "Name='node.exe'"`) and reported.

### The re-rating and the checks (`tests/artifacts/MP17/summarise.mjs`, scratch)

```js
// @ts-check
// MP17 scratch (not committed): checks the run manifest of one GZ attempt directory, re-rates every puzzle of its
// packs, checks the claims, the bands and AR1, and prints the tables of the final record. Exit 1 when a check fails.
// Usage (from the repository root): node tests/artifacts/MP17/summarise.mjs <attempt directory>
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { boardFromRows } from '../../../core/engine/board.js';
import { rate } from '../../../core/engine/difficulty.js';
import { canonicalJson } from '../../../core/engine/hash.js';
import { level, offeredLevels } from '../../../core/engine/levels.js';
import { parsePack } from '../../../core/engine/pack.js';
import { createWorkspace, MAIN_WORKSPACE_BYTES } from '../../../core/engine/workspace.js';

/** The 12 runs of the task, in order: name, board, level, count, seed. */
const EXPECTED = [
  ['p1', '10x6', 'hard', 5, 'probe1'], ['p2', '20x18', 'hard', 3, 'probe2'], ['p3', '20x18', 'expert', 3, 'probe3'],
  ['s-very-easy', '10x6', 'very-easy', 3, 'final-10x6-very-easy'], ['s-easy', '10x6', 'easy', 3, 'final-10x6-easy'],
  ['s-normal', '10x6', 'normal', 3, 'final-10x6-normal'], ['s-expert', '10x6', 'expert', 3, 'final-10x6-expert'],
  ['s-master', '10x6', 'master', 3, 'final-10x6-master'], ['t-master', '20x18', 'master', 3, 'final-20x18-master'],
  ['t-nightmare', '20x18', 'nightmare', 3, 'final-20x18-nightmare'],
  ['t-hell-1', '20x18', 'hell-1', 3, 'final-20x18-hell-1'], ['t-hell-2', '20x18', 'hell-2', 3, 'final-20x18-hell-2'],
];
const dir = process.argv[2];
if (!dir || !existsSync(join(dir, 'runs.json'))) {
  console.error('usage: summarise.mjs <attempt directory with runs.json>');
  process.exit(2);
}
const area = (/** @type {string} */ board) => board.split('x').map(Number).reduce((a, b) => a * b, 1);
const median = (/** @type {number[]} */ xs) => {
  const s = [...xs].sort((a, b) => a - b);
  if (s.length === 0) return '-';
  return s.length % 2 === 1 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
/** @type {any} */
const runs = JSON.parse(readFileSync(join(dir, 'runs.json'), 'utf8').replace(/^\uFEFF/, ''));
/** @type {string[]} */ const failures = [];
/** @type {string[]} */ const misses = [];
/** @type {string[]} */ const puzzleRows = [];
/** @type {string[]} */ const levelRows = [];
let hardPlus = 0;
let provedZero = 0;
if (!Array.isArray(runs) || runs.length !== EXPECTED.length) {
  failures.push(`manifest: ${Array.isArray(runs) ? runs.length : 'no'} rows, expected ${EXPECTED.length}`);
}
const list = Array.isArray(runs) ? runs : [];
EXPECTED.forEach(([name, board, lvl, count, seed], i) => {
  const r = list[i];
  if (!r || r.name !== name || r.board !== board || r.level !== lvl || r.count !== count || r.seed !== seed) {
    failures.push(`manifest row ${i + 1}: expected ${name} ${board} ${lvl} ${count} ${seed}`);
  }
});
for (const run of list) {
  const file = join(dir, `${run.name}.json`);
  const present = existsSync(file);
  const offered = offeredLevels(area(run.board)).some((l) => l.id === run.level);
  const emptyRow = (/** @type {string} */ exit) => `| ${run.board} | ${run.level} | ${run.count} | 0 | ${exit} | ${run.ms} | - | - | - | - | - |`;
  if (run.skipped === 'not-offered') {
    if (offered) failures.push(`${run.name}: skipped as not offered, but ${run.level} is offered on ${run.board}`);
    if (present) failures.push(`${run.name}: a skipped run has a pack`);
    misses.push(`${run.name}: ${run.level} is not offered on ${run.board} (not run)`);
    levelRows.push(emptyRow('not offered'));
    continue;
  }
  if (!offered) failures.push(`${run.name}: ${run.level} is not offered on ${run.board}, but it was run`);
  if (![0, 1, 2].includes(run.exit)) {
    failures.push(`${run.name}: exit ${run.exit}`);
    continue;
  }
  if (run.exit === 1) {
    if (present || run.sha256 !== null) failures.push(`${run.name}: exit 1 with a pack`);
    misses.push(`${run.name}: no puzzle (exit 1)`);
    levelRows.push(emptyRow('1'));
    continue;
  }
  if (!present) {
    failures.push(`${run.name}: exit ${run.exit} without a pack`);
    continue;
  }
  const bytes = readFileSync(file);
  if (createHash('sha256').update(bytes).digest('hex') !== run.sha256) {
    failures.push(`${run.name}: the pack differs from the one this attempt wrote (digest)`);
    continue;
  }
  const parsed = parsePack(bytes.toString('utf8').replace(/^\uFEFF/, ''));
  if (!parsed.ok) {
    failures.push(`${run.name}: not a valid pack`);
    continue;
  }
  const pack = parsed.value;
  const produced = pack.puzzles.length;
  if (run.exit === 0 && produced !== run.count) failures.push(`${run.name}: exit 0 with ${produced} of ${run.count} puzzles`);
  if (run.exit === 2) {
    if (produced >= 1 && produced < run.count) misses.push(`${run.name}: partial, ${produced} of ${run.count} (exit 2)`);
    else failures.push(`${run.name}: exit 2 with ${produced} of ${run.count} puzzles`);
  }
  const target = level(run.level);
  const board = boardFromRows(pack.board.rows);
  /** @type {number[]} */ const scores = [];
  /** @type {number[]} */ const gs = [];
  /** @type {number[]} */ const us = [];
  let minProved = Infinity;
  let estimates = 0;
  for (const p of pack.puzzles) {
    const r = p.rating;
    const m = r.metrics;
    let fresh;
    try {
      fresh = rate(board, pack.pieces, p.clues, createWorkspace(MAIN_WORKSPACE_BYTES));
    } catch (e) {
      failures.push(`${run.name} ${p.id}: rate throws ${e instanceof Error ? e.name : String(e)}`);
      continue;
    }
    if (canonicalJson(fresh) !== canonicalJson(r)) failures.push(`${run.name} ${p.id}: claim differs from a fresh rate`);
    if (r.model !== 'difficulty-v3' || r.saturated !== false) {
      failures.push(`${run.name} ${p.id}: not a v3 claim`);
      continue;
    }
    if (r.level !== run.level) failures.push(`${run.name} ${p.id}: level ${r.level}, requested ${run.level}`);
    if (target.index >= 3) {
      hardPlus += 1;
      if (m.Gproved === 0) provedZero += 1;
      if (!(m.G >= 1 && m.Gproved >= 1)) failures.push(`${run.name} ${p.id}: Hard or above with G ${m.G}, Gproved ${m.Gproved}`);
    }
    scores.push(r.score);
    gs.push(m.G);
    us.push(m.U);
    minProved = Math.min(minProved, m.Gproved);
    if (r.censored === true) estimates += 1;
    puzzleRows.push(`| ${run.name} | ${p.id} | ${r.level} | ${r.score} | ${m.U} | ${m.deductionTier} | ${m.G} | `
      + `${m.Gproved} | ${m.info.toFixed(2)} | ${m.censusComplete ? 'yes' : 'no'} | ${m.solutions} | ${m.B} | `
      + `${m.dlxStop} | ${p.clues.length} |`);
  }
  const range = scores.length === 0 ? '-' : `${Math.min(...scores)}-${median(scores)}-${Math.max(...scores)}`;
  levelRows.push(`| ${run.board} | ${run.level} | ${run.count} | ${produced} | ${run.exit} | ${run.ms} | `
    + `${range} | ${median(us)} | ${median(gs)} | ${scores.length === 0 ? '-' : minProved} | ${estimates} |`);
}
if (hardPlus === 0) failures.push('no Hard-or-above puzzle in this attempt: MP17-B01 cannot be observed');
console.log('| Run | Puzzle | Level | Score | U | Tier | G | Gproved | info | Census complete | Solutions | B | DLX stop | Clues |');
console.log('|---|---|---|---:|---:|---:|---:|---:|---:|---|---|---:|---|---:|');
for (const row of puzzleRows) console.log(row);
console.log('');
console.log('| Board | Level | Requested | Produced | Exit | ms | Score min-median-max | U median | G median | Gproved min | Estimates |');
console.log('|---|---|---:|---:|---|---:|---|---:|---:|---:|---:|');
for (const row of levelRows) console.log(row);
console.log('');
console.log(`Hard or above: ${hardPlus} puzzles, Gproved = 0: ${provedZero}`);
for (const m of misses) console.log(`MISS ${m}`);
for (const f of failures) console.log(`FAIL ${f}`);
process.exitCode = failures.length === 0 ? 0 : 1;
```

Run it with `node tests\artifacts\MP17\summarise.mjs $gz > "$gz\summary.md"` and check `$LASTEXITCODE`. It checks
the manifest first (the 12 runs of the table in order; exit 0 with a pack of `count` puzzles, exit 2 with a pack of 1
to `count - 1` puzzles, exit 1 without a pack; the digest of every pack; a run skipped only when its level is not
offered, and run only when it is). A `FAIL` line is a defect (or a finding): stop and report it with the pack file;
do not change a value. In particular it fails when the attempt has no Hard-or-above puzzle at all: MP17-B01 needs
observed puzzles. Each `MISS` line (a level not offered, a run without a result, a partial run) must appear in record
§6 either as an approved exception, quoting the lock record's cell (6x10 or 18x20 at that level, with its hit rate)
or the owner's D36 answer that stopped offering it, or as a finding in §10; it is never counted as coverage.
"Levels ordered" holds when every puzzle is in the band of its requested level (no `FAIL`), so the score ranges of
the levels of one board are disjoint and increase with the level index; the U, tier and G medians per level are
reported as facts. The script was checked on a scratch tree (manifest, digest, skip and exit-code failures).

### The `rate-probe` run (10x6 and 20x18)

The probe re-measures the puzzles of `p1`, `p2` and `p3` (10x6 Hard, 20x18 Hard and Expert) of this attempt with the
deduction under 3 tie orders and the DLX diagnostic under 5 seeded orders, and scores them with the locked knobs. It
reads only packs of this attempt (cross-review SP17); a run without a pack is listed as skipped, never probed from an
older file:

```powershell
node -e "import('./core/engine/policy.js').then(({ SCORE_V3: k }) => require('fs').writeFileSync(process.argv[1], JSON.stringify({ model: k.model, base: k.base, rule: k.rule, weights: k.weights, penalty: k.penalty })))" "$gz\knobs.json"
foreach ($n in 'p1', 'p2', 'p3') {
  if (-not (Test-Path "$gz\$n.json")) { "probe ${n}: skipped, no pack in this attempt (see runs.json)"; continue }
  node tools\rate-probe.mjs --pack "$gz\$n.json" --orders 5 --tie-orders 3 --knobs "$gz\knobs.json" --output "$gz\probe-$n.jsonl"
  if ($LASTEXITCODE -ne 0) { throw "rate-probe $n failed" }
}
```

Per line: no `error`; `v3.score` equals `storedScore` (a difference is a defect: a claim that cannot be reproduced);
`v3.knobs` has no `outsideRanges`; report `deduction.first.G` and `deduction.first.Gproved`, the tie-order spread
`orders.summary.G` (min, median, max), `orders.summary.B` and `timing.deduceMs`. Expected time: 1–5 minutes per pack.
A skipped probe is listed in record §7 with the run's `MISS` line.

### The lock inspection (step 1, before the announcement) and the fixture checks (the first gate commands)

Before the announcement, only git commands and the printing of constants (cross-review SP18):

```powershell
$lock = (git --no-pager log -1 --format=%H --grep="^difficulty-v3 MP12b")
if (-not $lock) { throw 'no lock commit (MP12b2 or MP12b3) found' }
git --no-pager diff --stat $lock HEAD -- core tools
git --no-pager diff $lock HEAD -- core/engine/levels.js core/engine/version.js core/engine/deduce.js
git --no-pager diff $lock HEAD -- core/engine/policy.js
node tests\artifacts\MP17\lock-values.mjs
if ($LASTEXITCODE -ne 0) { throw 'lock values not printed' }
```

After the orchestrator's go, the first commands of the gate (each regenerates puzzles: the first the generation
fixtures recorded at the lock, the second MP13b's set and two batches):

```powershell
node tools\record-fixtures.mjs --check
if ($LASTEXITCODE -ne 0) { throw 'fixture check failed' }
node tools\record-fixtures.mjs --replay-case --check
if ($LASTEXITCODE -ne 0) { throw 'replay fixture check failed' }
```

`tests/artifacts/MP17/lock-values.mjs` (scratch):

```js
// @ts-check
// MP17 scratch: prints the locked values for comparison with the lock record.
import { readFileSync } from 'node:fs';

import { MODEL } from '../../../core/engine/difficulty.js';
import { DEDUCE, POLICY_ID, SCORE_V3 } from '../../../core/engine/policy.js';
import { currentVersions } from '../../../tools/record-fixtures.mjs';

const line = (/** @type {string} */ file, /** @type {string} */ name) =>
  readFileSync(new URL(`../../../core/engine/${file}`, import.meta.url), 'utf8')
    .split(/\r?\n/).find((l) => l.startsWith(`const ${name} = `)) ?? `${name}: not found`;
console.log(JSON.stringify({ MODEL, POLICY_ID, versions: currentVersions(), SCORE_V3, DEDUCE }));
console.log(line('policy.js', 'K60'));
console.log(line('levels.js', 'SHARES'));
```

Pass: the diff of `levels.js`, `version.js` and `deduce.js` is empty; the diff of `policy.js` has no removed line and
its added lines are the `REPLAY` constant with its comment; the printed `SCORE_V3`, `DEDUCE`, `POLICY_ID`, `K60` and
`SHARES` equal the literals of the lock record, `MODEL` is `difficulty-v3` and `versions.algo` is `gen-v3`. **Any
failure of the inspection: stop and report it to the orchestrator; do not announce the gate.** Then, inside the gate,
both fixture checks exit 0; a failure stops the gate (report it; the rest of GZ does not start).

### The browser runs

Headless Microsoft Edge through CDP with the runner of MP16b (cross-review SP19): copy the code block "The browser
runner" of `tasks/difficulty-v3/MP16b-dialog-wiring-and-documents.md` verbatim to `tests/artifacts/MP17/pages.mjs`.
It serves the repository on port 8817, starts Edge for every run with the throwaway profile `tests\artifacts\edge-MP17\`
and CDP port 9317, presses the trusted keys a page asks for, emulates the 390 px touch viewport in the narrow phase,
reads `data-summary` or else `#summary`, stops Edge and the server by PID, removes the profile (also on failure),
bounds every run at 540 s, and writes one evidence directory per page and phase (`browser.json`, `page.png`,
screenshots the page asks for) and `runs.json` with the PIDs. It refuses to start when a port is busy: report it and
never stop someone else's process. Every page of `tests/browser/` (`Get-ChildItem tests\browser\*.html`) runs in the
main phase; `puzzle-code-acceptance` also runs its keys and narrow phases and `replay` its keys phase, the phases
that the main run skips; the change touches the engine, the worker protocol, the client and pool, both apps, packs
and codes, so every page is affected. Expected list (16 pages; report a page added or missing):

```text
acceptance            generator-editor      generator-flow        hints
player-controls       player-load           print                 puzzle-code-acceptance
puzzle-code-cli-parity puzzle-code-entry    puzzle-code-print     puzzle-code-worker
puzzle-qr             rendering             replay                watchdog
```

Four invocations, one after the other (each about 4–10 minutes; start each in async mode and read its output):

```powershell
$b = "$gz\browser"
node tests\artifacts\MP17\pages.mjs --task MP17 --http 8817 --cdp 9317 --evidence "$b\1" acceptance generator-editor generator-flow hints player-controls
"browser 1: exit $LASTEXITCODE"
node tests\artifacts\MP17\pages.mjs --task MP17 --http 8817 --cdp 9317 --evidence "$b\2" player-load print puzzle-code-acceptance puzzle-code-cli-parity puzzle-code-entry
"browser 2: exit $LASTEXITCODE"
node tests\artifacts\MP17\pages.mjs --task MP17 --http 8817 --cdp 9317 --evidence "$b\3" puzzle-code-print puzzle-code-worker puzzle-qr rendering replay watchdog
"browser 3: exit $LASTEXITCODE"
node tests\artifacts\MP17\pages.mjs --task MP17 --http 8817 --cdp 9317 --evidence "$b\4" puzzle-code-acceptance:keys puzzle-code-acceptance:narrow replay:keys
"browser 4: exit $LASTEXITCODE"
```

A run passes with `data-result="pass"`, no CSP violation and no uncaught error (the runner's `PASS` line);
`acceptance.html` with its known blocked checks only. A run that passed in an earlier gate of this pack and fails
now is a regression (defect report). A run not made earlier in this pack (for example `hints`, `player-controls`,
`generator-editor`, `puzzle-code-worker`, `puzzle-qr`, `watchdog`, the keys and narrow phases of
`puzzle-code-acceptance`) that fails because an expectation pins a value an accepted task changed on purpose may be
corrected under the rule above; any other failure is a defect report. A run that times out (540 s) is a failure:
the last `CHECK-START` lines in its `browser.json` (`lastLogs`) show the check that stalled.

### The record `docs/difficulty-v3/final-<date>.md`

English, CRLF, no BOM, relative links only. Sections:

1. **Header**: date, code revision (`git rev-parse --short HEAD`), the lock commit, Node version, CPU count, the gate
   announcement and its start and end, total machine time.
2. **Lock**: the printed values against the lock record (equal, or the difference), the diff summary (`--stat`) and
   the `policy.js` addition (the inspection before the announcement); the two fixture checks (the first gate
   commands) with their durations.
3. **Full suite**: `npm test` counts (tests, pass, fail, skipped), duration; the AR1 slow test by name.
4. **Browser runs**: a table (page, phase, result, summary, duration, keys pressed) of the 19 runs from the four
   `runs.json` files; the blocked checks of `acceptance.html`; the PIDs stopped and the profile removed.
5. **The plan §6 probe, before and after**: the plan §1.1 table (before, v2) next to the rows of `p1`, `p2` and `p3`
   (after, v3: U, tier, G, `Gproved`, info, score, B and the DLX stop per puzzle).
6. **Levels on 10x6 and 20x18**: the attempt directory; the per-level table of `summary.md`; every `MISS` line as an
   approved exception (the lock record's cell and hit rate, or the owner's D36 answer) or as a finding in §10; levels
   not offered or without a puzzle stay visible in the table; the ordering statement.
7. **`rate-probe`**: per puzzle of `p1` to `p3`: the score check, G, `Gproved`, the tie-order spread, B under the
   seeded orders, the deduction time; a probe skipped for want of a pack, with its run's `MISS` line.
8. **AR1**: generated Hard-or-above puzzles in these runs and how many have `Gproved = 0` (must be 0); the slow test;
   the lock record's `provedZero` over the landscape.
9. **Corrections made in this task**: each with the file, the reason and the accepted task it follows; or "none".
10. **Findings for the owner**: or "none".
11. **Release notes** (below).

### Release notes (C3 (a); RES-32, MP17 row)

A section "Release notes" of the record, in plain words for users, then a short part for developers. It must cover
the six topics of RES-32: the v3 levels, the re-rated display, the estimate note, the proved-guess rule for generated
Hard-or-above puzzles, the refusal of sets with two pieces of the same shape and the removal notice for saved sets,
and Generation Steps. Verify every statement against the code, the user guides and the accepted tasks; quote visible
texts from `player/locale.en.js` and `generator/locale.en.js` (for example the keys `rating.note.rerated`,
`rating.note.notRerated`, `rating.note.estimate`, `rating.note.estimateShort` of MP10b1), never invented ones; drop or
correct a statement that does not hold and report it. The facts to state:

- **Difficulty (`difficulty-v3`).** The score follows how a person solves the puzzle: forced placements and
  deductions first (the rule ladder R1 to R9 in four tiers), then decisive guesses (choices whose wrong alternatives
  can be proved impossible). A puzzle that needs no guess scores below Hard. The level names and their score bands are
  unchanged, and so are the board sizes each level is offered on, unless the owner's D36 answer (lock record) stopped
  offering a level on some boards: then name those levels and boards, as users will no longer find them (cross-review
  SP17: unavailable levels stay visible); the score of a given puzzle differs from before.
- **Generated puzzles.** The Generator aims at the middle of the requested level's band. Every generated Hard-or-above
  puzzle has at least one proved decisive guess. A candidate whose deduction exceeds the solver's limits is not rated
  and is skipped; v3 ratings never show the "+" mark. The same seed makes different puzzles than earlier versions
  (algorithm `gen-v3`, rating `difficulty-v3`); a seed reproduces a puzzle only with the same versions.
- **Estimates.** When the check of a guess's alternatives cannot finish within its budget, the score is an upper
  estimate: packs mark it with `censored: true` and the apps show the estimate note (with the number of undecided
  alternatives when the full rating is known, without it for a rating read from a puzzle code).
- **Puzzles from earlier versions.** A stored rating is never changed. Puzzles rated by earlier versions
  (`difficulty-v1`, `difficulty-v2`) are re-rated for display with the new model, with a note; when the re-rating is
  not possible the stored rating is shown with "could not be re-rated". Packs, links and puzzle codes made by earlier
  versions keep opening (except sets with two pieces of the same shape); version-1 puzzle codes are unchanged; new codes
  carry a short rating (model, score, level, the "+" flag and, for an estimate, `censored`), packs the full one.
- **Two pieces of the same shape.** A piece set with two pieces of the same shape is refused when a pack, a link or a
  puzzle code is opened and when the Generator imports it, with an error message (before, the pack reader only
  warned). A saved Generator set with two pieces of the same shape is removed when the Generator starts, with a
  one-time notice in English and Vietnamese.
- **Generation Steps.** Each puzzle card in the Generator has a "How it was made" button that replays how the puzzle
  was made, step by step (set, layout, clue search, final rating), with the score table. It is available for puzzles
  made by this version; otherwise the dialog says that steps are not available. Packs written by this version carry a
  small optional provenance record (`generation.setOrigin`, `generation.made`) for it.
- **For developers.** The records of this change are in `docs/difficulty-v3/` (the report, the probe, the fit, the
  code sizes, the calibration with the lock, this record); the design is in `docs/design-detail.md` §6.12 and §7; the
  tools `tools/rate-probe.mjs` and `node tools/record-fixtures.mjs --replay-case` are described in the developer guide.
  No `CHANGELOG.md` is added.

### The documents sweep (for the corrections)

```powershell
Select-String -Path README.md, USERGUIDE.md, USERGUIDE.vn.md, DEVELOPERGUIDE.md, DEVELOPERGUIDE.vn.md, docs\design-brief.md, docs\design-detail.md -Pattern 'difficulty-v1|difficulty-v2|gen-v1|gen-v2|saturat'
Select-String -Path docs\design-detail.md -Pattern '^#{2,4} (6\.12|7\.8|7\.9|7\.10)'
foreach ($p in @(@('USERGUIDE.md', 'USERGUIDE.vn.md'), @('DEVELOPERGUIDE.md', 'DEVELOPERGUIDE.vn.md'))) {
  '{0} {1} / {2} {3}' -f $p[0], (Select-String -Path $p[0] -Pattern '^#{1,4} ').Count, $p[1], (Select-String -Path $p[1] -Pattern '^#{1,4} ').Count
}
```

Every hit of the first search presents v1 or v2 as historical or legacy (stored claims, the derived display, the DLX
diagnostic), never as the current rating or algorithm; the design document has §6.12, §7.8 (with the lock statement),
§7.9 and §7.10; each English guide has as many headings as its Vietnamese one (7 and 9 at HEAD `60575a4`; equal counts
are the check, not these numbers). The user guides state the refusal of sets with two pieces of the same shape and the
removal notice (RES-34), the estimate note and Generation Steps. Fix wording under the rule; report anything else.

## Files to create/modify

| File | Change |
|---|---|
| `docs/difficulty-v3/final-<date>.md` | new: the GZ record with the release notes |
| living documents (the list of the rule) | justified wording corrections only, both languages, each listed |
| `tests/*.test.js`, `tests/browser/*.js` | justified name, comment or expectation corrections only, each listed |

Exclusive ownership while this task runs: the record and the corrections it lists; scratch under
`tests/artifacts/MP17/` and the Edge profile `tests\artifacts\edge-MP17\`. Documentation slot: the record (RES-32 gives
MP17 no section of `docs/design-detail.md`). Must not edit: everything of "Out of scope".

## Implementation steps

1. Check the tree; find the lock commit and the lock record; write `lock-values.mjs`; run the lock inspection (git
   commands and `lock-values.mjs` only). Stop and report on any failure.
2. Write `summarise.mjs` and copy MP16b's runner to `pages.mjs`; announce GZ with the plan of "Repository rules";
   wait for the go.
3. The two fixture checks; `npm test` (record counts and duration); the 12 generation runs into a fresh attempt
   directory; `summarise.mjs`; the knobs file and the `rate-probe` runs of the packs that exist; the four browser
   invocations (19 runs). Stop and report on a defect; do not continue to the next run family with an unexplained
   failure.
4. The documents sweep and the corrections, if any.
5. The record with the release notes; `npm run test:quick`; `npm run check`; the CRLF check of the record.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP17-B01 | Every generated Hard-or-above puzzle of the final runs has a proved decisive guess (`Gproved >= 1`, hence G >= 1), and the runs produced at least one such puzzle; the plan §6 probe no longer shows Hard puzzles without a real choice | record §5, §8; `summary.md`; the slow test |
| MP17-B02 | On 10x6 and 20x18 every offered level produces puzzles in its band, so the levels are ordered; every partial or empty run and every level no longer offered is listed and matches the lock record (or the owner's D36 answer), otherwise it is a finding | record §6 |
| MP17-B03 | Nothing in the rating or the generation changed after the lock | record §2 |
| MP17-B04 | Everything else still works: the full suite and every browser page pass (the known blocked checks only) | record §3, §4 |
| MP17-B05 | Users have release notes on the six topics of RES-32, true to the delivered behaviour | record §11 |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP17-T01 | The lock inspection passes before the announcement (empty diffs of `levels.js`, `version.js`, `deduce.js`; `policy.js` adds only `REPLAY`; the values equal the lock record), and both fixture checks exit 0 as the first gate commands | command output; record §2 |
| MP17-T02 | `npm test` passes, with counts and duration recorded | command output; record §3 |
| MP17-T03 | The manifest of one fresh attempt directory has the 12 runs with consistent exit codes, packs and digests; every claim of its packs equals a fresh `rate` of its puzzle (`canonicalJson`), every puzzle is in its requested band, and `summarise.mjs` exits 0; every `rate-probe` line has no error and `v3.score` equal to `storedScore` | `summary.md`; `runs.json`; the `probe-*.jsonl` files; record §5–§7 |
| MP17-T04 | The 19 runs pass (the 16 pages in the main phase, the keys and narrow phases of `puzzle-code-acceptance`, the keys phase of `replay`; acceptance: the known blocked checks only) with no CSP violation and no uncaught error, each check under 1 minute; servers and browsers stopped by PID; the profile removed | record §4; the four `runs.json` |
| MP17-T05 | Only the record and the listed justified corrections changed (`git --no-pager status --short`); no file under `core/`, `tools/`, `generator/`, `player/` or `tests/fixtures/` changed | `git status`; review |
| MP17-T06 | `npm run test:quick` and `npm run check` pass; the record is CRLF without BOM, with a final newline and no absolute path | command output |

## Test plan

### Exact commands

The lock inspection, the fixture checks, the generation runs, `summarise.mjs`, the `rate-probe` runs and the browser
runs as written above. Then:

```powershell
# announced gate GZ (after the lock inspection): the two fixture checks (above), then the full suite
npm test
if ($LASTEXITCODE -ne 0) { throw 'npm test failed' }

# ... the generation runs, summarise.mjs, rate-probe, the four browser invocations (above) ...

npm run test:quick
if ($LASTEXITCODE -ne 0) { throw 'quick tests failed' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'check failed' }
node -e "const t=require('fs').readFileSync(process.argv[1],'utf8');console.log(/[^\r]\n/.test(t)?'LF found':'CRLF only')" docs\difficulty-v3\final-<date>.md
```

### Required test cases

None new. A justified correction of a test keeps its assertion's strength; the record lists the before and after.

## Definition of done & handoff

- Every criterion has its evidence; the reply follows check-list §8 and gives the gate record: every command with its
  start, end, duration and result; the lock commit; the record path; the corrections; the findings.
- Evidence for the orchestrator's release record (check-list §9): GZ (this record), AR1 (record §8), the full `npm test`
  (record §3), EN / VI (the documents sweep; the strings were reviewed in their tasks), documents in step (the sweep and
  any correction).
- Handoff: the release verdict is the owner's; merging `rating-v3` and pushing are not part of this task.

## Execution log

| Field | Value |
|---|---|
| Status | |
| Start | |
| End | |
| Duration | |
| Model | |
| Token usage | |
| AI credits | |
| Verification | |
| Acceptance | |
| Issues & resolutions | |
| Handoff | |
