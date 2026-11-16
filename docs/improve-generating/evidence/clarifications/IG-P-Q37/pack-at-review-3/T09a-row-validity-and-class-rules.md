# T09a: Admission statistics of plan §5.2: valid rows, completion apart from the deadline, the class rules

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §5.2 (IG-P-Q19, Q26, Q35: unit, rule (c5) clue and faster, one endpoint, the recipe, completion apart, phase 0's completion gate and its p95 tail observation, no regression); decisions D-V4-08, D-V4-16; review RV1-12 (R12), RV2-06, RV2-18 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T08 |
| Depends on | T08 (serial order) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3 h, machine 0 min (pure functions; synthetic cases, unlocked) |

## Goal

The admission statistics must be fixed in code before any validation seed runs. This task writes the row-level part
of plan §5.2 as pure functions: which published rows are valid measurements, completion and the capped T10 kept apart
from the deadline, pairing by request identity, matched sets, the pooled clue rule, the faster rule with shared
resampling and its per-cell floor, and the no-regression bound. Missing, invalid, censored or erroneous data is
incomplete evidence and never a pass; an invalid puzzle or pack is a correctness failure. T09b adds the work ledger
and the class verdict, T09c the global verdict and the tool that reads the records.

## Authority and fixed points

Plan §5.2, every bullet named in the header, review R12 (accepted) and review-2's RV2-06 and RV2-18 (accepted), with
these readings fixed here (pack author):

- **Run status (RV2-18).** `runStatus(run, { quantity })` judges one run record (the `RunRecord` of
  `tools/bench/report.js`), first match wins:
  1. `invalid`: `validateRunRecord(run)` (`tools/bench/report.js:166`) returns a problem; `run.probeKind` is not
     `'generation'`; `acceptedCount` is not an integer from 0; `responseMs` is not a finite number from 0; or
     `acceptedCount >= quantity` and `tenthReadyMs` is not a finite number from 0 to `responseMs`.
  2. `incorrect` (a correctness failure, kept apart from missing evidence): an `errors` entry of `phase`
     `validation` (codes `invalid-puzzle`, `invalid-pack`; `tools/bench/runner.js:635-641`) or `certificates`
     (`unexpected-unsatisfiable`, `runner.js:662`), or `partialReason === 'invalid-accepted'` (`runner.js:681-683`).
  3. `censored` (no measurement exists; never a measured failure): `measurementValid === false`,
     `interrupted === true`, or an `errors` entry of `phase` `host` (the harness's `child-timeout` and the other child
     failures of `tools/calibrate.mjs` `childFailure`, and the runner's host error, `runner.js:835`).
  4. `error` (an unexpected error): any other `errors` entry (a typed generation fault of `phase` `set` or `batch`,
     `runner.js:671`, or a `sampling` error).
  5. `valid`: none of these. A normal measured failure is valid: `partialReason` `set:<reason>` (for example
     `set:not-in-band`, `set:no-window-below`, `set:time-limit`) or a batch reason (`time-limit`, `partial`) with
     fewer than ten puzzles.
- **Published rows.** `arm.mjs publish` writes `{ rowKey, caseId, rep, seed, localRep, run }` per row
  (`tools/ig-proto/arm.mjs:263-267`). `ingestRow(row, { quantity })` is `invalid` also when `run.caseId !== row.caseId`
  or `run.seed !== row.seed`; else its status is `runStatus(run, ...)`. Only `valid` rows enter the paired statistics.
- **Completion and the capped time apart (RV2-06; Q-RV2-01 option (a), decision D-V4-16).** A valid row reaches ten
  when `acceptedCount >= quantity`, whatever its time. Its capped T10 is `Math.min(tenthReadyMs, capMs)` when it
  reaches ten, else `capMs` (120,000 ms, the one endpoint of plan §5.2). A deadline violation is `responseMs >
  responseBoundMs` (120,000 ms), reported apart; the deadline is enforced by the live-deadline receipt (N-V4-13), never
  by the completion count. A request with ten puzzles at 125 s therefore completes, enters the ratio statistics at
  120 s and is one deadline violation (plan §5.2's 18x18 example: 20 of 20, p95 134.5 s, completion-passing).
- **The p95 tail observation** (plan §5.2: "A nearest-rank p95 of 20 is the second-largest value; it is reported as a
  tail observation"): over exactly 20 valid rows, the second-largest uncapped T10, a row that did not reach ten being
  larger than every number; `null` when that second-largest is such a row or when the cell lacks 20 valid rows.
  Reported, never gated.
- **Pairing.** Two rows are the same request when `caseId`, `rep` and `seed` are equal; the manifest declares each
  cell's replicate list; a declared replicate without a row, a row outside the list, two rows with one identity, a seed
  that differs between the arms at one rep, or a row whose status is not `valid` is a pairing problem; an `incorrect`
  row is also listed as a correctness failure.
- **The per-set clue value** is the median of `run.details.puzzles[].clues`; the median of an even list is the mean of
  its two middle values; "moves by two clues or more" is `Math.abs(d) >= 2` of `d` = screen less no screen.
- **A matched set (IG-P-Q35)**: a pair of valid rows whose `run.details.igSetKey` (written by the `instr` variant,
  `tools/ig-proto/variants/instr.json`) are strings and equal, both with `acceptedCount >= 1`.
- **Resampling**: `R` resamples of the declared replicate indices with replacement, drawn from `mulberry32(seed)`
  (step 1), the same drawn indices applied to every cell of the class; the lower bound is the value at index
  `Math.ceil(0.1 * R) - 1` of the ascending list.
- The faster ratio of a rep is `cappedT10(noScreen) / cappedT10(screen)`; the no-regression ratio of a rep is
  `cappedT10(today) / cappedT10(after)`.

## Scope

- Create: `tools/ig-proto/verdicts.mjs` (step 1; T09b and T09c add to it); `tools/ig-proto/data/verdict-manifest.schema.md`
  (step 2).
- Change: `tools/ig-proto/self-test.mjs` (cases appended to `--items`), `tools/ig-proto/README.md` (a section).
- Do not change: everything else. Guards: `node tools\ig-proto\firewall.mjs check --task V4-T09a --label frozen`,
  expected `files unchanged`; `git status --short -- core generator tests tools/bench tools/ig-proto/variants`,
  expected no output.

## Steps

0. `node tools\ig-proto\firewall.mjs snapshot --task V4-T09a --label frozen`.
1. **`verdicts.mjs`** (`// @ts-check`, JSDoc types; a header comment naming this task, plan §5.2, R12, RV2-06 and
   RV2-18). Module level: `import { join } from 'node:path'; import { pathToFileURL } from 'node:url'; import {
   sourceRoot } from './lib/paths.mjs';` and `const { validateRunRecord } = await import(pathToFileURL(join(sourceRoot('frozen'),
   'tools', 'bench', 'report.js')).href);` (the frozen record schema, T01a). Exports:
   - `mulberry32(seed)`:

     ```js
     export function mulberry32(seed) {
       let a = seed >>> 0;
       return () => {
         a = (a + 0x6D2B79F5) >>> 0;
         let t = a;
         t = Math.imul(t ^ (t >>> 15), t | 1);
         t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
         return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
       };
     }
     ```

   - `median(values)`; `geoMean(values)` (`Math.exp` of the mean of `Math.log`).
   - `runStatus(run, { quantity })`: `{ status: 'invalid' | 'incorrect' | 'censored' | 'error' | 'valid', problems:
     string[] }` by the reading above (`problems` names each matched condition; empty for `valid`).
   - `ingestRow(row, { quantity })`: `{ rowKey, caseId, rep, seed, run, status, problems }`.
   - `reachedTen(run, { quantity })`, `cappedT10(run, { quantity, capMs })`, `deadlineViolation(run, {
     responseBoundMs })` (the readings above; the callers pass valid rows only).
   - `completion(rows, { quantity, capMs, responseBoundMs })` over ingested rows: `{ requests, statuses: { valid,
     invalid, incorrect, censored, error }, reachedTen, deadlineViolations, p95Ms }` (`reachedTen` and
     `deadlineViolations` count valid rows; `p95Ms` by the reading above).
   - `pairRows(rowsA, rowsB, reps)` over ingested rows of one cell (class use: A the screen arm, B the no-screen arm;
     no-regression use: A the after arm, B today's): `{ pairs: [{ rep, seed, a, b }], problems: string[], incorrect:
     [{ side: 'a' | 'b', rep }] }`; a pair only where both rows exist and are `valid`.
   - `matchedSets(pairs)`: `[{ rep, seed, screen, noScreen, d }]` (the per-set clue values of A and B, `d = screen -
     noScreen`) for the matched pairs.
   - `clueRule(matched)`: `{ n, medianDiff, moved2, pass }`, `pass = n > 0 && medianDiff <= 0.5 && 5 * moved2 <= n`.
   - `ratiosOf(pairs, reps, { quantity, capMs })`: the array, in the order of `reps`, of `cappedT10(b.run) /
     cappedT10(a.run)`; `null` when a rep has no pair.
   - `fasterRule(ratiosByCell, reps, { resamples, resampleSeed })`: `ratiosByCell` maps a cell to `ratiosOf(...)`;
     returns `{ geoMean, lower, cellGeoMeans, pass }`; each resample draws `reps.length` indices `Math.floor(rand() *
     reps.length)` and takes the geometric mean over every (cell, drawn index) pair; `pass = geoMean >= 1.15 && lower
     > 1.0 &&` every cell's geometric mean `>= 1.0`.
   - `noRegression(ratios, reps, { resamples, resampleSeed })`: the same recipe for one cell, `pass = lower >= 0.9`.
2. **`data/verdict-manifest.schema.md`**: the manifest T09c reads, as a document with one example: `task`, `label`
   (`frozen`), `quantity` (10), `capMs` (120,000), `responseBoundMs` (120,000), `resampleSeed`, `resamples` (10,000),
   `validationReps` (the 20 declared reps), `masterReps` (the 5 declared reps), `arms` (`[{ id, task, arm, variant,
   treeId, files: [{ path, sha256 }] }]`: the arm's published runs files with their SHA-256 and the tree id they must
   carry), `classes` (`[{ id, cells,
   screen, noScreen }]`: arm ids), `failingCells`, `controls` (`[{ cell, today }]`), `masters` (`[{ cell, today,
   after }]`), `hell1` (cell ids), `p5` (`[{ cell, bounded, uncapped }]`), `deadlineProjection` (`{ arms, reserves,
   deadlineMs }`), `prerequisites` (`{ stage1, parity: [...], liveDeadline }`, each `{ path, expected }` with
   `expected` the argument of T04d's `proofCheck`: `{ kind, source, arms, coverage, fields }`; the stage-1 receipt
   carries the source block).
3. **Self-test** cases appended to `--items` (Tests table).
4. **README.md**: a section "## Admission statistics (V4-T09a)": the readings of the Authority section, verbatim in
   substance.

## Tests

All in `tools/ig-proto/self-test.mjs --items`, on synthetic rows. `rec(over)` is `newRunRecord({ caseId: 'c', seed:
's', ...over })` imported from the frozen `tools/bench/report.js` (the same import as step 1); `row(rep, seed, {
accepted, tenth, response = 60000, setKey, clues = [], over = {} })` builds `{ rowKey: 'c~' + rep, caseId: 'c', rep,
seed, localRep: 0, run: rec({ seed, rep, acceptedCount: accepted, tenthReadyMs: tenth, responseMs: response, details:
{ igSetKey: setKey, igPuzzleKeys: [], puzzles: clues.map((n) => ({ clues: n })) }, ...over }) }`.

| Case name | Input | Expected |
|---|---|---|
| `verdicts: basic statistics` | `median([3, 1, 2])`, `median([1, 2, 3, 4])`; `cappedT10` (quantity 10, cap 120,000) of 10 accepted at 5,000, 9 accepted with `tenthReadyMs` null, 10 accepted at 130,000 (response 131,000); `mulberry32(7)` twice | 2 and 2.5; 5,000, 120,000, 120,000; `reachedTen` of the third `true`; the first five values of both generators equal and in [0, 1) |
| `verdicts: completion and the deadline apart` | (a) `row(0, 's0', { accepted: 10, tenth: 125000, response: 125000 })`; (b) `row(1, 's1', { accepted: 9, tenth: null, response: 120500 })`; then `completion` of 20 valid rows: 17 with 10 accepted at 30,000, (a), one with 10 accepted at 50,000, and (b) | (a): `reachedTen` true, `cappedT10` 120,000, `deadlineViolation` true; (b): `reachedTen` false, `cappedT10` 120,000, `deadlineViolation` true; `completion`: `reachedTen` 19, `deadlineViolations` 2, `p95Ms` 125,000 |
| `verdicts: run status` | `row(r, ...)` with 10 accepted at 40,000 and: (a) `over: { measurementValid: false }`; (b) `over: { interrupted: true }`; (c) `over: { errors: [{ phase: 'batch', code: 'worker-crashed', message: 'x' }] }`; (d) `over: { measurementValid: false, errors: [{ phase: 'host', code: 'child-timeout', message: 'x' }] }`; (e) `over: { errors: [{ phase: 'validation', code: 'invalid-puzzle', message: 'x' }] }`; (f) `over: { responseMs: 'x' }`; (g) a row built with seed `'s9'` whose `run.seed` is then set to `'s8'`; (h) 3 accepted, `tenth` null, `over: { partialReason: 'time-limit' }`; (i) 0 accepted, `tenth` null, `over: { partialReason: 'set:not-in-band', details: null }` | (a) `censored`; (b) `censored`; (c) `error`; (d) `censored`; (e) `incorrect`; (f) `invalid`; (g) `invalid`; (h) `valid`; (i) `valid` |
| `verdicts: pairing problems` | reps `[0, 1, 2]`; A: rep 0 twice, rep 1, and rep 2 built as case (e) of the previous row; B: reps 0 and 2 (rep 1 missing) | three problems, naming the duplicate (A, rep 0), the missing row (B, rep 1) and the status (A, rep 2, `incorrect`); `incorrect` `[{ side: 'a', rep: 2 }]`; `pairs` empty |
| `verdicts: matched sets` | pairs where (a) both `setKey` `'k'`, clues `[10, 12]` and `[11]`; (b) `setKey` `'k'` and `'m'`; (c) both `'k'` with B's `accepted` 0 | one matched set, (a), with `screen` 11, `noScreen` 11, `d` 0 |
| `verdicts: the clue rule is pooled` | 15 matched sets of `d` 1 (cell a) and 15 of `d` 0 (cell b); then cell a with `d` 2 on 8 of its sets | first: `medianDiff` 0.5, `moved2` 0, `pass` true although cell a alone has median 1; second: `moved2` 8, `pass` false |
| `verdicts: faster rule and its floor` | `fasterRule({ a: [2, 2, 2, 2], b: [2, 2, 2, 2] }, [0, 1, 2, 3], { resamples: 1000, resampleSeed: 7 })`; then `b` all 0.5 | first: `geoMean` 2 and `lower` 2 (within 1e-12), `pass` true; second: `geoMean` 1 (within 1e-12), `cellGeoMeans.b` 0.5, `pass` false |
| `verdicts: failed requests at the common endpoint` | `ratiosOf` of 20 pairs whose A rows all have 9 accepted and whose B rows reach ten at 60,000 | every ratio 0.5; `fasterRule` on one cell of these: `pass` false |
| `verdicts: no regression` | `noRegression` of 20 ratios 1.0, then of 20 ratios 0.8 (reps 0 to 19, 1,000 resamples, seed 7) | `pass` true (`lower` 1.0); `pass` false |

## Documentation

`tools/ig-proto/README.md` (step 4) and `tools/ig-proto/data/verdict-manifest.schema.md`.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task V4-T09a` | root | every `--items` case passes, exit 0 | 3 min |
| `node tools\ig-proto\firewall.mjs check --task V4-T09a --label frozen` | root | `files unchanged` | 1 min |
| `npm run check` | root | exit 0 | 2 min |

## Stop points and questions

- Stop and report before: changing any reading of the Authority section (they are fixed before the validation seeds
  run; a change needs the analysts or the owner, plan §5.2).
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T09a-B01 | The row-level statistics of plan §5.2 exist in code with their readings written down before any validation seed runs | the functions; the README section | diff; README |
| T09a-B02 | Completion and the capped time stay apart from the deadline (D-V4-16): ten puzzles at 125 s complete, enter at 120 s and count one violation | case 2 | self-test output |
| T09a-B03 | An invalid, censored or erroneous row never enters a statistic; an invalid puzzle or pack is a correctness failure | cases 3 and 4 | self-test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T09a-T01 | Pairing, matched sets, the pooled clue rule | cases 4 to 6 | self-test output |
| T09a-T02 | Shared resampling, the per-cell floor, the common endpoint and no regression | cases 7 to 9 | self-test output |
| T09a-T03 | The record schema is the frozen one (`validateRunRecord` imported from `sourceRoot('frozen')`) | diff of the import | diff |
| T09a-T04 | Nothing else changed; formats | guards; `npm run check` | command output |

## Checklist (the developer confirms every item in the final report)

- [ ] Every step done; nothing outside the scope changed (guard command output)
- [ ] Tests added and green; the full gate green
- [ ] Documents updated (each language)
- [ ] File format checks pass
- [ ] Evidence files written
- [ ] Every AC row has its evidence

## Final report (the developer's reply)

The start and end times; the files changed; the gate results with numbers; each AC row with its evidence; the
questions and rulings; the deviations; and the named items for later.

## Execution log (filled by the orchestrator, not by the developer)

| Item | Value |
|---|---|
| Start, end, duration | |
| Waiting for rulings | |
| Agent id, model | |
| Calls; input, output and cache-read tokens | |
| AI credits | |
| Questions and rulings | |
| Fix rounds | |
| Gates re-run by the orchestrator | |
| Commit | |
| Issues and named items | |
