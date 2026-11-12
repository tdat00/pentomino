# MP17 — Final compatibility and regression evidence, release notes (gate GZ)

| Header | Value |
|---|---|
| ID | MP17 (the report's MP17, dispatched whole) |
| Depends on | MP16b (accepted and committed: the card button, `tests/browser/replay.html`, the GB-P4 record) and, through it, every earlier part; the lock of MP12b |
| Estimated size | Medium: about 300–500 changed lines (the record about 250–400 lines with the release notes; justified corrections, if any); about 50–60 minutes of work plus about 60–80 minutes of machine time (gate GZ) |
| Owner role | QA and release |
| Milestone | M10 — verified |
| Design refs | `docs/difficulty-v3/report-detailed.md` §5.1 (MP17 row), §5.2 (the lock), §5.3 (GZ), RES-01 and RES-25 (what the lock means), RES-32 (MP17 row: the release notes), RES-35 (AR1); `docs/difficulty-v3/plan.md` §1.1, §6 and §7 (last item); clarifications C3 (a), AR1 (part G), PROC-P1 (a); check-list §6, §7, §9 |
| Gates owned | **GZ**: the lock checks; `npm test`; the plan §6 probe and the level runs on 10x6 and 20x18 (`tools/generate.mjs`, small counts); a small `tools/rate-probe.mjs` run; every page of `tests/browser/` in headless Edge (ports 8817 and 9317) |
| Implementation status | Not started |

## Goal & business context

The owner asked to "make Hard really hard": Hard and above must need at least one real choice, generated puzzles must
sit in the middle of their band, and the levels must be measured, fitted and locked before Generation Steps. This last
task proves, on the finished branch, that the change does what was asked and broke nothing:

- the plan's own reproduction (plan §6), which on 2026-11-11 showed 20x18 Hard puzzles that needed no choice at all
  (B = 0), now shows only Hard-or-above puzzles with a proved decisive guess (`Gproved >= 1`, hence G >= 1);
- on 10x6 and 20x18 every offered level still produces puzzles in its band, in increasing order;
- nothing in the rating or the generation changed after the lock (MP12b): Generation Steps (MP13a to MP16b) only
  observes;
- the full test suite and every browser page pass;
- users get release notes of the change (C3 (a)): there is no release-notes file in the repository and no
  `CHANGELOG.md` is added, so the notes are a section of the final record.

This is a regression run only (PROC-P1 (a)): no refit, no knob change, no algorithm change.

## Scope

### In scope

- Gate GZ, in this order: the lock checks; `npm test`; the generation runs; the re-rating of their puzzles; the
  `rate-probe` run; every browser page.
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
  machine; never two heavy runs at once): "GZ: `npm test` (about 5–10 minutes), 12 generation runs (about 15–30
  minutes), the re-rating and 3 `rate-probe` runs (about 5–15 minutes), 16 browser pages (about 15–20 minutes); about
  60–80 minutes in total, one run at a time". Start only when the orchestrator says the machine is free. The lock
  checks (step 1) are light and run before the announcement.
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

### The lock (MP12b) and what may differ since

- The lock commit is the latest commit of MP12b:
  `git --no-pager log -1 --format="%H %s" --grep="^difficulty-v3 MP12b"`. Its record is
  `docs/difficulty-v3/calibration-<date>.md` (find it with `Get-ChildItem docs\difficulty-v3\calibration-2*.md`; MP12a's
  `calibration-slice-<date>.md` is the slice record): its header lists the final knobs and caps as literals, §3 the
  per-board and per-level results (with `provedZero`, which must be 0), §7 the lock statement.
- Allowed since the lock (MP13a to MP16b; they add observers and new modules, never a rating or a generated puzzle):
  `core/engine/policy.js` gains `REPLAY` (MP15a) and nothing else; `core/engine/difficulty.js` gains `rateDetailed`
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

- The MP12b record: hit rates, T10 times and score distributions of the cells 6x10 and 18x20 (the same rectangles as
  10x6 and 20x18, turned by a quarter; seeds differ, so compare ranges and availability, not single puzzles).
- The gate records in the Execution logs of MP09e (code pages), MP10b2 (display pages) and MP16b (replay, rendering,
  generator-flow, acceptance): the expected result of each page they ran. `tests/browser/acceptance.html` reported
  "16 checks, 4 blocked" at the regenerate-puzzle release; the blocked checks need a physical device.
- The slow test of MP11 in `tests/difficulty-v3.test.js`: "slow: v3 generation orders the levels on 10x6 and 12x12,
  and every Hard-or-above puzzle has a proved guess" (AR1 on generated puzzles; `npm test` runs it).

### Offered levels and bands

`offeredLevels(60)` is very-easy, easy, normal, hard, expert, master; `offeredLevels(360)` is hard, expert, master,
nightmare, hell-1, hell-2 (`core/engine/levels.js`, `AREAS`). Band lower edges `bandEdge(0..8)`: 0, 8, 12, 17, 25, 37,
53, 77, 112. Hard is level index 3; "Hard or above" is index >= 3.

### The generation runs (12)

From the repository root, `--workers 4`, default uniqueness (`any`) and `--max-active` (676), each pack to
`tests\artifacts\MP17\<name>.json` with `--output`. The first three are plan §6 verbatim (seeds `probe1` to
`probe3`); the others complete the offered levels of both boards.

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

Exit codes of `tools/generate.mjs`: 0 complete, 2 valid partial pack, 1 no usable result (no file written). A partial
or empty run is acceptable only where the MP12b record shows the same limited availability for the matching cell
(record it with that cell's hit rate); otherwise it is a finding.

```powershell
New-Item -ItemType Directory -Force tests\artifacts\MP17 | Out-Null
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
  $start = Get-Date
  node tools\generate.mjs --board $r[1] --level $r[2] --count $r[3] --seed $r[4] --workers 4 `
    --output "tests\artifacts\MP17\$($r[0]).json" 2> "tests\artifacts\MP17\$($r[0]).err.txt"
  $code = $LASTEXITCODE
  $ms = [int]((Get-Date) - $start).TotalMilliseconds
  $log += [pscustomobject]@{ name = $r[0]; board = $r[1]; level = $r[2]; count = $r[3]; seed = $r[4]; exit = $code; ms = $ms }
  "{0}: exit {1}, {2} ms" -f $r[0], $code, $ms
}
$log | ConvertTo-Json | Set-Content -Encoding utf8 tests\artifacts\MP17\runs.json
```

Each command normally ends within a few minutes (the generation client stops dispatching a batch at 115 s, `TIME` in
`core/engine/policy.js`); one still running after 10 minutes is stopped by its PID (find it by its command line with
`Get-CimInstance Win32_Process -Filter "Name='node.exe'"`) and reported.

### The re-rating and the checks (`tests/artifacts/MP17/summarise.mjs`, scratch)

```js
// @ts-check
// MP17 scratch (not committed): re-rates every puzzle of the GZ generation runs, checks the claims, the bands and
// AR1, and prints the tables of the final record. Exit 1 when a check fails.
import { existsSync, readFileSync } from 'node:fs';

import { boardFromRows } from '../../../core/engine/board.js';
import { rate } from '../../../core/engine/difficulty.js';
import { canonicalJson } from '../../../core/engine/hash.js';
import { level } from '../../../core/engine/levels.js';
import { parsePack } from '../../../core/engine/pack.js';
import { createWorkspace, MAIN_WORKSPACE_BYTES } from '../../../core/engine/workspace.js';

const here = (/** @type {string} */ name) => new URL(`./${name}`, import.meta.url);
const text = (/** @type {URL} */ url) => readFileSync(url, 'utf8').replace(/^\uFEFF/, '');
const runs = JSON.parse(text(here('runs.json')));
const median = (/** @type {number[]} */ xs) => {
  const s = [...xs].sort((a, b) => a - b);
  if (s.length === 0) return '-';
  return s.length % 2 === 1 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
/** @type {string[]} */ const failures = [];
/** @type {string[]} */ const puzzleRows = [];
/** @type {string[]} */ const levelRows = [];
let hardPlus = 0;
let provedZero = 0;
for (const run of runs) {
  const target = level(run.level);
  const file = here(`${run.name}.json`);
  if (!existsSync(file)) {
    levelRows.push(`| ${run.board} | ${run.level} | ${run.count} | 0 | ${run.exit} | ${run.ms} | - | - | - | - | - |`);
    continue;
  }
  const parsed = parsePack(text(file));
  if (!parsed.ok) { failures.push(`${run.name}: not a valid pack`); continue; }
  const pack = parsed.value;
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
    if (r.model !== 'difficulty-v3' || r.saturated !== false) failures.push(`${run.name} ${p.id}: not a v3 claim`);
    if (r.level !== run.level) failures.push(`${run.name} ${p.id}: level ${r.level}, requested ${run.level}`);
    if (target.index >= 3) {
      hardPlus += 1;
      if (m.Gproved === 0) provedZero += 1;
      if (!(m.G >= 1 && m.Gproved >= 1)) failures.push(`${run.name} ${p.id}: Hard or above with G ${m.G}, Gproved ${m.Gproved}`);
    }
    scores.push(r.score); gs.push(m.G); us.push(m.U);
    minProved = Math.min(minProved, m.Gproved);
    if (r.censored === true) estimates += 1;
    puzzleRows.push(`| ${run.name} | ${p.id} | ${r.level} | ${r.score} | ${m.U} | ${m.deductionTier} | ${m.G} | ` +
      `${m.Gproved} | ${m.info.toFixed(2)} | ${m.censusComplete ? 'yes' : 'no'} | ${m.solutions} | ${m.B} | ` +
      `${m.dlxStop} | ${p.clues.length} |`);
  }
  const range = scores.length === 0 ? '-' : `${Math.min(...scores)}-${median(scores)}-${Math.max(...scores)}`;
  levelRows.push(`| ${run.board} | ${run.level} | ${run.count} | ${pack.puzzles.length} | ${run.exit} | ${run.ms} | ` +
    `${range} | ${median(us)} | ${median(gs)} | ${scores.length === 0 ? '-' : minProved} | ${estimates} |`);
}
console.log('| Run | Puzzle | Level | Score | U | Tier | G | Gproved | info | Census complete | Solutions | B | DLX stop | Clues |');
console.log('|---|---|---|---:|---:|---:|---:|---:|---:|---|---|---:|---|---:|');
for (const row of puzzleRows) console.log(row);
console.log('');
console.log('| Board | Level | Requested | Produced | Exit | ms | Score min-median-max | U median | G median | Gproved min | Estimates |');
console.log('|---|---|---:|---:|---:|---:|---|---:|---:|---:|---:|');
for (const row of levelRows) console.log(row);
console.log('');
console.log(`Hard or above: ${hardPlus} puzzles, Gproved = 0: ${provedZero}`);
for (const f of failures) console.log(`FAIL ${f}`);
process.exitCode = failures.length === 0 ? 0 : 1;
```

Run it with `node tests\artifacts\MP17\summarise.mjs > tests\artifacts\MP17\summary.md` and check `$LASTEXITCODE`. A
`FAIL` line is a defect (or a finding for a missing level): stop and report it with the pack file; do not change a
value. "Levels ordered" holds when every puzzle is in the band of its requested level (no `FAIL`), so the score ranges
of the levels of one board are disjoint and increase with the level index; the U, tier and G medians per level are
reported as facts.

### The `rate-probe` run (10x6 and 20x18)

The probe re-measures the puzzles of `p1`, `p2` and `p3` (10x6 Hard, 20x18 Hard and Expert) with the deduction under
3 tie orders and the DLX diagnostic under 5 seeded orders, and scores them with the locked knobs:

```powershell
node -e "import('./core/engine/policy.js').then(({ SCORE_V3: k }) => require('fs').writeFileSync('tests/artifacts/MP17/knobs.json', JSON.stringify({ model: k.model, base: k.base, rule: k.rule, weights: k.weights, penalty: k.penalty })))"
foreach ($n in 'p1', 'p2', 'p3') {
  node tools\rate-probe.mjs --pack "tests\artifacts\MP17\$n.json" --orders 5 --tie-orders 3 `
    --knobs tests\artifacts\MP17\knobs.json --output "tests\artifacts\MP17\probe-$n.jsonl"
  if ($LASTEXITCODE -ne 0) { throw "rate-probe $n failed" }
}
```

Per line: no `error`; `v3.score` equals `storedScore` (a difference is a defect: a claim that cannot be reproduced);
`v3.knobs` has no `outsideRanges`; report `deduction.first.G` and `deduction.first.Gproved`, the tie-order spread
`orders.summary.G` (min, median, max), `orders.summary.B` and `timing.deduceMs`. Expected time: 1–5 minutes per pack.

### The lock checks (step 1, before the announcement)

```powershell
$lock = (git --no-pager log -1 --format=%H --grep="^difficulty-v3 MP12b")
if (-not $lock) { throw 'no MP12b commit found' }
git --no-pager diff --stat $lock HEAD -- core tools
git --no-pager diff $lock HEAD -- core/engine/levels.js core/engine/version.js core/engine/deduce.js
git --no-pager diff $lock HEAD -- core/engine/policy.js
node tests\artifacts\MP17\lock-values.mjs
node tools\record-fixtures.mjs --check
if ($LASTEXITCODE -ne 0) { throw 'fixture check failed' }
node tools\record-fixtures.mjs --replay-case --check
if ($LASTEXITCODE -ne 0) { throw 'replay fixture check failed' }
```

`tests/artifacts/MP17/lock-values.mjs` (scratch):

```js
// @ts-check
// MP17 scratch: prints the locked values for comparison with the MP12b record.
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
`SHARES` equal the literals of the MP12b record, `MODEL` is `difficulty-v3` and `versions.algo` is `gen-v3`; both
fixture checks exit 0. **Any failure: stop, report it to the orchestrator and do not start the heavy part.**

### The browser pages

Headless Microsoft Edge through CDP with the native client and the procedure of `tasks/regenerate-puzzle/check-list.md`
§7; server `node tools/serve.mjs --port 8817 --prefix /pentomino/`; CDP port 9317; throwaway profile
`tests\artifacts\edge-MP17\`. Record the server and browser PIDs, stop them by PID and remove the profile afterwards,
also on failure; if a port is busy, report it and never stop someone else's process. Every page of `tests/browser/`
(`Get-ChildItem tests\browser\*.html`), one at a time; the change touches the engine, the worker protocol, the client
and pool, both apps, packs and codes, so every page is affected. Expected list (16 pages; report a page added or
missing):

```text
acceptance            generator-editor      generator-flow        hints
player-controls       player-load           print                 puzzle-code-acceptance
puzzle-code-cli-parity puzzle-code-entry    puzzle-code-print     puzzle-code-worker
puzzle-qr             rendering             replay                watchdog
```

URL: `http://127.0.0.1:8817/pentomino/tests/browser/<page>.html`. A page passes with `data-result="pass"`, no CSP
violation and no uncaught error; `acceptance.html` with its known blocked checks only. A page that passed in an earlier
gate of this pack and fails now is a regression (defect report). A page not run earlier in this pack (for example
`hints`, `player-controls`, `generator-editor`, `puzzle-code-worker`, `puzzle-qr`, `watchdog`) that fails because an
expectation pins a value an accepted task changed on purpose may be corrected under the rule above; any other failure
is a defect report.

### The record `docs/difficulty-v3/final-<date>.md`

English, CRLF, no BOM, relative links only. Sections:

1. **Header**: date, code revision (`git rev-parse --short HEAD`), the lock commit, Node version, CPU count, the gate
   announcement and its start and end, total machine time.
2. **Lock**: the printed values against the MP12b record (equal, or the difference), the diff summary (`--stat`) and
   the `policy.js` addition, the two fixture checks.
3. **Full suite**: `npm test` counts (tests, pass, fail, skipped), duration; the AR1 slow test by name.
4. **Browser pages**: a table (page, result, `data-summary`, duration); the blocked checks of `acceptance.html`; PIDs
   stopped and the profile removed.
5. **The plan §6 probe, before and after**: the plan §1.1 table (before, v2) next to the rows of `p1`, `p2` and `p3`
   (after, v3: U, tier, G, `Gproved`, info, score, B and the DLX stop per puzzle).
6. **Levels on 10x6 and 20x18**: the per-level table of `summary.md` with each partial or empty run explained by the
   MP12b cell; the ordering statement.
7. **`rate-probe`**: per puzzle of `p1` to `p3`: the score check, G, `Gproved`, the tie-order spread, B under the
   seeded orders, the deduction time.
8. **AR1**: generated Hard-or-above puzzles in these runs and how many have `Gproved = 0` (must be 0); the slow test;
   MP12b's `provedZero` over the landscape.
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
  can be proved impossible). A puzzle that needs no guess scores below Hard. The level names, their score bands and
  the board sizes each level is offered on are unchanged; the score of a given puzzle differs from before.
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

1. Check the tree; find the lock commit and the MP12b record; write `lock-values.mjs`; run the lock checks. Stop and
   report on any failure.
2. Write `summarise.mjs`; announce GZ with the plan of "Repository rules"; wait for the go.
3. `npm test` (record counts and duration); the 12 generation runs; `summarise.mjs`; the knobs file and the three
   `rate-probe` runs; the 16 browser pages. Stop and report on a defect; do not continue to the next run family with
   an unexplained failure.
4. The documents sweep and the corrections, if any.
5. The record with the release notes; `npm run test:quick`; `npm run check`; the CRLF check of the record.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP17-B01 | Every generated Hard-or-above puzzle of the final runs has a proved decisive guess (`Gproved >= 1`, hence G >= 1); the plan §6 probe no longer shows Hard puzzles without a real choice | record §5, §8; `summary.md`; the slow test |
| MP17-B02 | On 10x6 and 20x18 every offered level produces puzzles in its band, so the levels are ordered; partial or empty runs match the MP12b availability | record §6 |
| MP17-B03 | Nothing in the rating or the generation changed after the lock | record §2 |
| MP17-B04 | Everything else still works: the full suite and every browser page pass (the known blocked checks only) | record §3, §4 |
| MP17-B05 | Users have release notes on the six topics of RES-32, true to the delivered behaviour | record §11 |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP17-T01 | The lock checks pass: empty diffs of `levels.js`, `version.js`, `deduce.js`; `policy.js` adds only `REPLAY`; the values equal the MP12b record; both fixture checks exit 0 | command output; record §2 |
| MP17-T02 | `npm test` passes, with counts and duration recorded | command output; record §3 |
| MP17-T03 | Every claim of the 12 packs equals a fresh `rate` of its puzzle (`canonicalJson`), every puzzle is in its requested band, and `summarise.mjs` exits 0; every `rate-probe` line has no error and `v3.score` equal to `storedScore` | `summary.md`; the `probe-*.jsonl` files; record §5–§7 |
| MP17-T04 | The 16 pages pass (acceptance: the known blocked checks only) with no CSP violation and no uncaught error, each check under 1 minute; servers and browsers stopped by PID; the profile removed | record §4 |
| MP17-T05 | Only the record and the listed justified corrections changed (`git --no-pager status --short`); no file under `core/`, `tools/`, `generator/`, `player/` or `tests/fixtures/` changed | `git status`; review |
| MP17-T06 | `npm run test:quick` and `npm run check` pass; the record is CRLF without BOM, with a final newline and no absolute path | command output |

## Test plan

### Exact commands

The lock checks, the generation runs, `summarise.mjs`, the `rate-probe` runs and the browser pages as written above.
Then:

```powershell
# announced gate GZ (after the lock checks): the full suite first
npm test
if ($LASTEXITCODE -ne 0) { throw 'npm test failed' }

# ... the generation runs, summarise.mjs, rate-probe, the browser pages (above) ...

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
