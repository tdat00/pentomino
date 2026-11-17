# T09a: Admission statistics of plan §5.2: valid rows, completion apart from the deadline, per-puzzle evidence

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §5.2 (IG-P-Q19, Q26, Q35: one endpoint, completion apart, phase 0's completion gate and its p95 tail observation; "Master and below: identity, the same puzzles on the same seeds"); decisions D-V4-16, D-V4-18; review RV1-12 (R12), RV2-06, RV2-18, RV3-03 (the manifest's purpose), RV3-06 (the manifest's bindings), RV3-08 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T08 |
| Depends on | T08 (serial order) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 2.5 h, machine 0 min (pure functions; synthetic cases, unlocked) |

## Goal

The admission statistics must be fixed in code before any validation seed runs. This task writes their row level:
which published rows are valid measurements, completion and the capped T10 kept apart from the deadline, and the
per-puzzle evidence every later comparison needs before it may compare anything (the puzzle keys of Master identity,
the clue counts of rule (c5)). Missing, invalid, censored or erroneous data is incomplete evidence and never a pass;
an invalid puzzle or pack is a correctness failure. It also fixes the verdict manifest that T09e reads. T09b adds the
pairing and the class statistics, T09c the work ledger and the class verdict, T09d the global verdicts and T09e the
receipts and the tool.

## Authority and fixed points

Plan §5.2, review R12 (accepted) and reviews RV2-06, RV2-18 and RV3-08 (accepted), with these readings fixed here
(pack author):

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
  or `run.seed !== row.seed`; else its status is `runStatus(run, ...)`. Only `valid` rows enter a statistic.
- **Completion and the capped time apart (RV2-06; Q-RV2-01 option (a), decision D-V4-16).** A valid row reaches ten
  when `acceptedCount >= quantity`, whatever its time. Its capped T10 is `Math.min(tenthReadyMs, capMs)` when it
  reaches ten, else `capMs` (120,000 ms, the one endpoint of plan §5.2). A deadline violation is `responseMs >
  responseBoundMs` (120,000 ms), reported apart; the deadline is enforced by the live-deadline receipt (N-V4-13), never
  by the completion count. A request with ten puzzles at 125 s therefore completes, enters the ratio statistics at
  120 s and is one deadline violation.
- **The p95 tail observation** (plan §5.2: "A nearest-rank p95 of 20 is the second-largest value; it is reported as a
  tail observation"): over exactly 20 valid rows, the second-largest uncapped T10, a row that did not reach ten being
  larger than every number; `null` when that second-largest is such a row or when the cell lacks 20 valid rows.
  Reported, never gated.
- **Per-puzzle evidence (RV3-08).** The `instr` variant writes, for the accepted puzzles of a run in order,
  `run.details.igPuzzleKeys` (one SHA-256 hex key per puzzle, `tools/ig-proto/variants/instr.json`), and the runner
  writes `run.details.K` and `run.details.puzzles[].clues` (`tools/bench/runner.js:710-725`). `puzzleEvidence(run)`
  returns `{ keys, clues }`, each `null` when complete or the reason it is not:
  - a valid row with `acceptedCount` 0 has complete evidence (an empty puzzle list), whatever `details` holds;
  - keys, for `acceptedCount > 0`: `run.details?.igPuzzleKeys` is an array (else `missing puzzle keys`) of exactly
    `acceptedCount` entries (else `puzzle keys: <length> of <acceptedCount>`), each matching `/^[0-9a-f]{64}$/` (else
    `malformed puzzle key <index>`) and all distinct (else `duplicate puzzle key <index>`, the later index);
  - clues, for `acceptedCount > 0`: `run.details?.K` is an integer from 1 (else `missing K`); `run.details.puzzles`
    is an array (else `missing clue counts`) of exactly `acceptedCount` entries (else `clues: <length> of
    <acceptedCount>`), each `clues` an integer from 0 to `K` (else `clue out of range at <index>`).
  Missing per-puzzle evidence is never equality and never a zero difference: the consumers (T09b, T09d) make the
  affected statistic or gate incomplete.

## Scope

- Create: `tools/ig-proto/verdicts.mjs` (step 1; T09b to T09e add to it); `tools/ig-proto/data/verdict-manifest.schema.md`
  (step 2).
- Change: `tools/ig-proto/self-test.mjs` (cases and the helpers `rec` and `row`, appended to `--items`),
  `tools/ig-proto/README.md` (a section).
- Do not change: everything else. Guards: `node tools\ig-proto\firewall.mjs check --task V4-T09a --label frozen`,
  expected `files unchanged`; `git status --short -- core generator tests tools/bench tools/ig-proto/variants`,
  expected no output.

## Steps

0. `node tools\ig-proto\firewall.mjs snapshot --task V4-T09a --label frozen`.
1. **`verdicts.mjs`** (`// @ts-check`, JSDoc types; a header comment naming this task, plan §5.2, R12, RV2-06, RV2-18
   and RV3-08). Module level: `import { join } from 'node:path'; import { pathToFileURL } from 'node:url'; import {
   sourceRoot } from './lib/paths.mjs';` and `const { validateRunRecord } = await
   import(pathToFileURL(join(sourceRoot('frozen'), 'tools', 'bench', 'report.js')).href);` (the frozen record schema,
   T01a). Exports, each by the reading above:
   - `runStatus(run, { quantity })`: `{ status: 'invalid' | 'incorrect' | 'censored' | 'error' | 'valid', problems:
     string[] }` (`problems` names each matched condition; empty for `valid`).
   - `ingestRow(row, { quantity })`: `{ rowKey, caseId, rep, seed, run, status, problems }`.
   - `reachedTen(run, { quantity })`, `cappedT10(run, { quantity, capMs })`, `deadlineViolation(run, {
     responseBoundMs })` (the callers pass valid rows only).
   - `completion(rows, { quantity, capMs, responseBoundMs })` over ingested rows: `{ requests, statuses: { valid,
     invalid, incorrect, censored, error }, reachedTen, deadlineViolations, p95Ms }` (`reachedTen` and
     `deadlineViolations` count valid rows).
   - `puzzleEvidence(run)`: `{ keys: string | null, clues: string | null }`.
2. **`data/verdict-manifest.schema.md`**: the manifest T09e reads, as a document with one example of each purpose:
   - `task`, `label` (`frozen`), `purpose` (`'selection'`: the validation collection's class selection, whose phase-0
     line is never `pass`; `'final'`: the final admission after the comparators, RV3-03), `quantity` (10), `capMs`
     and `responseBoundMs` (120,000), `resampleSeed`, `resamples` (10,000), `validationReps` (the declared reps),
     `masterReps`;
   - `collection`: `{ activation: { path, sha256 } | null, closure: { path, sha256 } | null }` (T11e's records);
   - `selection` (`final` only): `{ path, sha256 }` of the class-selection receipt the final verdict is based on;
   - `arms`: `[{ id, task, arm, variant, treeId, files: [{ path, sha256 }] }]` (every published runs file of the arm
     with its SHA-256, and the tree id the files must carry);
   - `classes` (`[{ id, cells, screen, noScreen }]`, arm ids), `failingCells`, `controls` (`[{ cell, today }]`),
     `masters` (`[{ cell, today, after }]`), `hell1` (cell ids);
   - `p5`: for `final`, the expected pairs `[{ cell, bounded, uncapped, reps }]` (every rep of `reps` is one expected
     pair, its seed `landscape/<cell>/<rep>`, `tools/ig-proto/arm.mjs` `oneRowCase`); for `selection`, `[]`;
   - `deadlineProjection` (`{ arms, reserves, deadlineMs }`);
   - `prerequisites`: `{ stage1: { binding, current }, parity: [{ binding, current }], liveDeadline: { binding, current } }`,
     each `binding` the path of an accepted proof binding (T04f) and `current` the arm ids whose tree ids must equal
     today's trees (`[]` for the historical stage-1 binding; the validated arms for the parity and live-deadline
     bindings).
3. **Self-test** helpers and cases appended to `--items` (Tests table).
4. **README.md**: a section "## Admission statistics (V4-T09a)": the readings of the Authority section, verbatim in
   substance.

## Tests

All in `tools/ig-proto/self-test.mjs --items`, on synthetic rows. `rec(over)` is `newRunRecord({ caseId: 'c', seed:
's', ...over })` imported from the frozen `tools/bench/report.js` (the same import as step 1). `row(rep, seed, {
accepted, tenth, response = 60000, setKey = null, clue = 6, clues, K = 12, keys, over = {} })` builds `{ rowKey: 'c~' +
rep, caseId: 'c', rep, seed, localRep: 0, run: rec({ seed, rep, acceptedCount: accepted, tenthReadyMs: tenth,
responseMs: response, details: { igSetKey: setKey, igPuzzleKeys: keys ?? <accepted keys, the i-th
sha256(seed + '/' + i) of lib/records.mjs>, K, puzzles: (clues ?? Array(accepted).fill(clue)).map((n) => ({ clues: n
})) }, ...over }) }`: by default every positive row has complete per-puzzle evidence.

| Case name | Input | Expected |
|---|---|---|
| `verdicts: basic rows` | `cappedT10` (quantity 10, cap 120,000) of 10 accepted at 5,000, 9 accepted with `tenthReadyMs` null, 10 accepted at 130,000 (response 131,000) | 5,000, 120,000, 120,000; `reachedTen` of the third `true` |
| `verdicts: completion and the deadline apart` | (a) `row(0, 's0', { accepted: 10, tenth: 125000, response: 125000 })`; (b) `row(1, 's1', { accepted: 9, tenth: null, response: 120500 })`; then `completion` of 20 valid rows: 17 with 10 accepted at 30,000, (a), one with 10 accepted at 50,000, and (b) | (a): `reachedTen` true, `cappedT10` 120,000, `deadlineViolation` true; (b): `reachedTen` false, `cappedT10` 120,000, `deadlineViolation` true; `completion`: `reachedTen` 19, `deadlineViolations` 2, `p95Ms` 125,000 |
| `verdicts: run status` | `row(r, ...)` with 10 accepted at 40,000 and: (a) `over: { measurementValid: false }`; (b) `over: { interrupted: true }`; (c) `over: { errors: [{ phase: 'batch', code: 'worker-crashed', message: 'x' }] }`; (d) `over: { measurementValid: false, errors: [{ phase: 'host', code: 'child-timeout', message: 'x' }] }`; (e) `over: { errors: [{ phase: 'validation', code: 'invalid-puzzle', message: 'x' }] }`; (f) `over: { responseMs: 'x' }`; (g) a row built with seed `'s9'` whose `run.seed` is then set to `'s8'`; (h) 3 accepted, `tenth` null, `over: { partialReason: 'time-limit' }`; (i) 0 accepted, `tenth` null, `over: { partialReason: 'set:not-in-band', details: null }` | (a) `censored`; (b) `censored`; (c) `error`; (d) `censored`; (e) `incorrect`; (f) `invalid`; (g) `invalid`; (h) `valid`; (i) `valid` |
| `verdicts: per-puzzle evidence` | `puzzleEvidence` of rows with 10 accepted at 40,000: (a) the defaults; (b) `keys: []`; (c) `over: { details: { igSetKey: null, K: 12, puzzles: <10 entries of 6> } }` (no key array); (d) the default keys with entry 3 equal to entry 1; (e) entry 0 `'ABC'`; (f) `clues: []`; (g) `clues` of 9 entries; (h) entry 4 of the clues 13; (i) `K: 0`; then (j) a valid row with 0 accepted and `details: null` | (a) `{ keys: null, clues: null }`; (b) keys `puzzle keys: 0 of 10`; (c) keys `missing puzzle keys`; (d) keys `duplicate puzzle key 3`; (e) keys `malformed puzzle key 0`; (f) clues `clues: 0 of 10`; (g) clues `clues: 9 of 10`; (h) clues `clue out of range at 4`; (i) clues `missing K`; (j) `{ keys: null, clues: null }` |

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
| T09a-B01 | Completion and the capped time stay apart from the deadline (D-V4-16): ten puzzles at 125 s complete, enter at 120 s and count one violation | case 2 | self-test output |
| T09a-B02 | An invalid, censored or erroneous row never enters a statistic; an invalid puzzle or pack is a correctness failure | case 3 | self-test output |
| T09a-B03 | A positive row without complete puzzle keys or clue counts is reported incomplete, never read as an empty or equal list | case 4 | self-test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T09a-T01 | The readings of the Authority section are in `verdicts.mjs` and the README | diff; README | diff |
| T09a-T02 | The record schema is the frozen one (`validateRunRecord` imported from `sourceRoot('frozen')`) | diff of the import | diff |
| T09a-T03 | The manifest schema has the purpose, the collection, the hashed files, the expected P5 pairs and the accepted bindings | `verdict-manifest.schema.md` | file |
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
| Start, end, duration | 2026-11-17 14:20:10 +07:00 (dispatch, base `c8d2724`) to 14:36:17 +07:00 (acceptance): 16 min 7 s; the developer's own times 14:20:15-14:29:20 |
| Waiting for rulings | about 6 min (SA-Opus's review of the deviations, readings and named items, 14:30-14:35; no QUESTION) |
| Agent id, model | `70a3f277-143a-4c91-9bf2-95bb2c0a6ad8`, claude-sonnet-5.5 |
| Calls; input, output and cache-read tokens | 63 calls; 10,170,498 input, 70,778 output, 9,946,156 cache-read |
| AI credits | 226.32 |
| Questions and rulings | none from the developer. SA-Opus ruled "accept T09a": deviations 1-4 and the five readings accepted (`tenth` defaults to `null`; the lazy `verdictKit()`; fail-closed guards; first match wins; `p95Ms` only with 20 valid rows; any `validation` or `certificates` error is `incorrect`). The four contract mismatches the developer found were fixed in the later tasks: T11f writes each arm's `id`; T09c rule 8 counts with `reachedTen`; T09b-T09e name `const { v, row } = await verdictKit()`; `rowLedger` is T09c's own; pack amendment `ce048da` |
| Fix rounds | 0 |
| Gates re-run by the orchestrator | `--items`: 48 passed, 0 failed (12.524 s; the four new `verdicts:` cases 45-48); `--frozen`: 10 passed; `check-edits --all`: 33 `ok`, no other line; firewall `check` (V4-T09a): 289 production files unchanged; `git status --short -- core generator tests tools/bench tools/ig-proto/variants`: empty; stage-1 `evidence-check`: unchanged (20 files); `check-binding`: pass; `npm run check`: OK. No locked command and no machine time (round 2,724 s); `ig-select-v4.js` unchanged |
| Commit | this task's commit, `improve-generating T09a: Admission statistics of plan §5.2: valid rows, completion apart from the deadline, per-puzzle evidence` |
| Issues and named items | none new; the developer's four contract mismatches were fixed in the pack (`ce048da`). The schema examples are first read by T09e; real rows come from the frozen round |
