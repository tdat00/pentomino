# T09d: Global verdicts: cell gates, Master identity, Hell 1, P5's stops and phase 0

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §5.2 (IG-P-Q29, Q30, Q32, Q33: which arm is judged, phase 0's completion gate, Hell 1 reported, no regression, Master identity), §3 P5 (IG-P-D1 conditions 1 to 4), §3 P3 (population two-sided), §6 phase 0's gate, §9 (P5 and P-OD12); decisions D-V4-08, D-V4-13, D-V4-16; drift DR-O11; review RV1-12 (R12), RV1-13, RV2-08, RV2-18, RV3-03, RV3-08, RV4-08 (zero-accepted rows) |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T09c |
| Depends on | T09c |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3 h, machine 0 min (pure functions; synthetic cases, unlocked) |

## Goal

With the class verdicts of T09c, phase 0's verdict needs the arm each cell ships, the gates judged on that arm, Master
identity on complete puzzle keys, the Hell 1 report, P5's false stops and lost completions counted over the whole
declared comparison collection, and the prerequisites. This task writes those as pure functions, with the post-hoc
deadline projection as a labelled diagnostic that can never pass a deadline gate, and the phase-0 predicate that can
pass only on a final collection.

## Authority and fixed points

- Plan §5.2 and R12 (accepted): `shippedArm` is the screen arm for an admitted class, else the no-screen arm; each
  failing Nightmare cell and each control is judged on its shipped arm; a shipped arm without its declared valid rows
  is `incomplete`; a failed or inconclusive class does not fail phase 0 when its no-screen arm passes the cell gates;
  Hell 1 is reported and never vetoes; Master identity is exact on the declared five reps.
- Cell gates (readings fixed here; T09a's row status and D-V4-16's completion), first match wins: an `incorrect` row of
  the shipped arm: `fail`; three or more valid rows that do not reach ten: `fail` (plan §5.1 "Stopping": the verdict is
  settled at the third failure); a failing Nightmare cell with a dead-end entry in a valid row (a journal `phase` line
  `p2`, the frozen phase-2 entry, which the prototype journals under the same name): `fail`; a declared rep without a
  valid row, or (failing cell) a valid row without its journal: `incomplete`; a control: `noRegression` (today over
  after, T09b) on the declared reps fails: `fail`, and today's arm lacks a valid row: `incomplete`; else `pass` (at
  least 18 of 20 reach ten). Deadline violations and the p95 are reported beside the gate.
- Master identity (RV2-08, RV3-08), per declared rep: a missing or non-valid row on either side is `incomplete` (an
  `incorrect` row `fail`); a side whose `puzzleEvidence(run).keys` (T09a) is not `null` is `incomplete` (`puzzle keys
  <side> rep <r>: <problem>`): equal empty or short key lists are never equality; then `acceptedCount` equal and the
  two ordered key lists deep-equal, else `fail` with the rep, seed and field. A valid row's key list is `[]` when its
  `acceptedCount` is 0 (T09a: complete evidence whatever `details` holds; `details` is never read then) and
  `run.details.igPuzzleKeys` otherwise (RV4-08); the positive-count checks of T09a stay unchanged. Every declared Master
  cell's result enters phase 0.
- P5's stops (RV1-13, RV2-18, RV3-03), over the declared pairs only: the manifest's `p5` entry `{ cell, bounded,
  uncapped, reps }` declares one pair per rep, its seed `landscape/<cell>/<rep>`. A pair is `unknown` (with its reason)
  when either side's row is missing, duplicated, of another seed, not `valid` (T09a), or not linked (no `igSetMs` field,
  T06a); a pair missing on both sides is `unknown` (`missing`), never an empty success. On a known pair: a false stop is
  a bounded row whose `partialReason` starts with `set:no-window-` while the uncapped row's `igSetMs` is a finite number,
  whatever its count; a lost completion is an uncapped row that reached ten while the bounded row did not. A row of
  either arm outside the declared pairs is listed as `unexpected` and not counted. The loss count is a report, not a
  threshold.
- R01 (accepted, D-V4-08): the post-hoc projection is labelled `post-hoc projection; not a live deadline gate`; every
  row it produces carries `postHoc: true`; it is never a prerequisite.
- Phase 0 (plan §6's gate row, RV2-08, RV3-03): `phase0Verdict({ purpose, classes, cells, controls, masters, p5,
  prerequisites })`: `fail` when an item fails; else, with `purpose: 'selection'`, `incomplete` with the first reason
  `uncapped comparator collection pending` (a selection is never a final admission); with `purpose: 'final'`, `pass`
  only when every class has a verdict, every failing Nightmare cell, control and declared Master cell passes on its
  shipped arm, P5's stops cover every declared pair with no `unknown` pair (IG-P-D1 condition 4: lost completions are
  counted, not assumed), and every prerequisite passes; else `incomplete`.

## Scope

- Change: `tools/ig-proto/verdicts.mjs` (step 1), `tools/ig-proto/self-test.mjs` (cases appended to `--items`),
  `tools/ig-proto/README.md` (T09a's section).
- Do not change: everything else. Guards: `node tools\ig-proto\firewall.mjs check --task V4-T09d --label frozen`,
  expected `files unchanged`; `git status --short -- core generator tests tools/bench tools/ig-proto/variants tools/ig-proto/lib`,
  expected no output.

## Steps

0. `node tools\ig-proto\firewall.mjs snapshot --task V4-T09d --label frozen`.
1. **Pure exports** added to `verdicts.mjs`:
   - `deadEnds(lines)`: the number of distinct `call` ids with a `phase` line whose `phase` is `p2`.
   - `cellGate(kind, rows, { reps, quantity, capMs, responseBoundMs, todayRows, journals, resamples, resampleSeed })`
     with `kind` `failing` or `control`, `rows` the shipped arm's ingested rows, `todayRows` today's (control only),
     `journals` an object from `rowKey` to the row's journal lines (`null` when absent): `{ verdict: 'pass' | 'fail' |
     'incomplete', reasons, reachedTen, deadEnds, deadlineViolations, p95Ms, noRegression }` by the reading above.
   - `shippedArm(verdict, cls)`: `cls.screen` when `verdict.verdict === 'admitted'`, else `cls.noScreen`.
   - `masterIdentity(todayRows, afterRows, reps)`: `{ verdict, differences: [{ rep, seed, field }], problems }`.
   - `hell1Report(rows, { reps, quantity })`: `{ requests, valid, reachedTen, candidate: reachedTen >= 18 }` (valid
     rows, D-V4-16's completion), a report only.
   - `deadlineProjection(rows, { reserve, deadlineMs = 115000, quantity })`: per valid row `{ rep, seed, postHoc: true,
     setCut, served, completed, lost }` with `setCut = run.igSetMs > (1 - reserve) * deadlineMs`, `served = setCut ? 0
     : run.igAcceptedMs.filter((t) => t <= deadlineMs).length`, `completed = served >= quantity`, `lost =
     run.acceptedCount >= quantity && !completed`; a row without `igAcceptedMs` is `not-linked`; the result is `{
     kind: 'deadline-projection', label: 'post-hoc projection; not a live deadline gate', rows }`.
   - `p5Stops(boundedRows, uncappedRows, { quantity, cell, reps })`: `{ declared, pairs, falseStops, lostCompletions,
     unknown, falseStopReps, lostReps, unknownReps: [{ rep, reason }], unexpected }` by the reading above (`declared =
     reps.length`; `pairs` the known pairs).
   - `population(rows)`: per cell, over valid rows with complete clue evidence (T09a's `puzzleEvidence`; the others
     listed apart as `evidenceProblems`; a row with `acceptedCount` 0 contributes an empty clue list and no
     `details` read): the clue share (clues / K) median and range, the score position in the band
     (`(score - min) / (max - min)` with the level's band) median and range, the census-estimate share
     (`ratingCensoredCount / acceptedCount` summed over rows) and completion.
   - `phase0Verdict({ purpose, classes, cells, controls, masters, p5, prerequisites })` by the reading above; returns `{
     verdict, deciding: [<item names with their status>] }`.
2. **Self-test** cases appended to `--items` (Tests table), with T09a's `row` helper (`const { v, row } = await
   verdictKit()`, as in T09b).
3. **README.md**: T09a's section gains the global procedure, the cell gates, Master identity, P5's readings, the
   projection label and the two purposes of phase 0.

## Tests

All in `tools/ig-proto/self-test.mjs --items`, pure.

| Case name | Input | Expected |
|---|---|---|
| `verdicts: fallback arm` | a failed class whose no-screen arm (a) has 19 of 20 reaching ten and no dead end; (b) 17 of 20; (c) lacks 3 declared rows; (d) has one `incorrect` row | shipped arm `noScreen` each time; the cell gate: (a) `pass`; (b) `fail`; (c) `incomplete`; (d) `fail` |
| `verdicts: one failing global Nightmare cell` | purpose `final`: five failing cells pass and one fails on its shipped arm; everything else passes | `phase0Verdict` `fail` naming that cell |
| `verdicts: Master identity on complete keys` | five declared reps, both sides 10 accepted with (a) equal default keys; (b) rep 3's after-side keys differing in entry 0; (c) rep 4's after row missing; (d) both sides `keys: []`; (e) rep 2's after side with 9 keys; (f) (a) with rep 1 valid on both sides with 0 accepted, `tenth` null and `over: { details: null }` | (a) `pass`; (b) `fail` with `{ rep: 3, ... }`; (c) `incomplete`; (d) `incomplete` (`puzzle keys today rep 0: puzzle keys: 0 of 10`), never `pass`; (e) `incomplete`; (f) `pass` (two empty lists of zero-accepted rows, `details` not read); and `phase0Verdict` (final, everything else passing) with (b): `fail`; with (c): `incomplete` |
| `verdicts: Hell 1 is reported, not a veto` | purpose `final`: every Nightmare cell and control passes; a Hell 1 cell reaches ten on 12 of 20 | `hell1Report.candidate` false; `phase0Verdict` `pass` |
| `verdicts: the projection is never a deadline gate` | `deadlineProjection` of one row `{ acceptedCount: 10, igSetMs: 50000, igAcceptedMs: [60000, 65000, 70000, 75000, 80000, 85000, 90000, 95000, 100000, 110000] }` at reserve 0.5 and 0.6; then `phase0Verdict` (final) with every item `pass` but the live-deadline prerequisite `incomplete` | 0.5: `setCut` false, `served` 10, `lost` false, `postHoc` true; 0.6: `setCut` true, `served` 0, `lost` true; `kind` `deadline-projection` and the label text; phase 0 `incomplete` |
| `verdicts: P5 stops over the declared pairs` | cell `c`, declared reps 0 to 7; a valid bounded row `set:no-window-below` with 0 accepted on every rep except 5; uncapped rows: rep 0 valid, 10 accepted, `igSetMs` 30,000; rep 1 valid, 1 accepted, `igSetMs` 30,000; rep 2 valid, `igSetMs` null, `set:time-limit`; rep 3 none; rep 4 10 accepted with `measurementValid: false` and `errors` `[{ phase: 'host', code: 'child-timeout', message: 'x' }]`; rep 5 valid against a bounded row with `responseMs: 'x'`; rep 6 valid without an `igSetMs` field; rep 7 no row on either side | `declared` 8; `falseStops` 2 (reps 0 and 1); `lostCompletions` 1 (rep 0); `unknown` 5 with reasons for reps 3, 4, 5, 6 and 7 (`missing`) |
| `verdicts: a selection is not a final admission` | otherwise green inputs with `purpose: 'selection'` and `p5` with no declared pair; then the same with one failing cell | `incomplete`, first deciding reason `uncapped comparator collection pending`; then `fail` |
| `verdicts: final admission needs the whole comparison` | purpose `final`, everything else passing: (a) `p5` declares 20 reps of one cell and one is unknown; (b) all 20 known with 1 lost completion | (a) `incomplete`; (b) `pass` (the loss is reported, not a threshold) |
| `verdicts: dead ends` | journal lines with `phase` lines `p1`, `p2` (call `x`), `p2` (call `x`), `p2` (call `y`) | `deadEnds` 2 |

## Documentation

`tools/ig-proto/README.md` (step 3).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task V4-T09d` | root | every `--items` case passes, exit 0 | 3 min |
| `node tools\ig-proto\firewall.mjs check --task V4-T09d --label frozen` | root | `files unchanged` | 1 min |
| `npm run check` | root | exit 0 | 2 min |

## Stop points and questions

- Stop and report before: changing a reading of the Authority section or of T09a's to T09c's.
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T09d-B01 | Phase 0 can pass only on a final collection with every failing Nightmare cell, control and Master cell passing on its shipped arm, P5's stops counted over every declared pair and every prerequisite met | cases 2, 3, 5, 7, 8 | self-test output |
| T09d-B02 | P5's false stops and lost completions are counted against the uncapped search over the declared pairs; a censored, invalid, unlinked or missing side is unknown (P-OD12, IG-P-D1) | case 6 | self-test output |
| T09d-B03 | Master identity never passes on empty or short key lists | case 3 (d), (e) | self-test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T09d-T01 | Hell 1 reported, dead ends counted, the projection labelled and typed | cases 4, 5, 9 | self-test output |
| T09d-T02 | Nothing else changed; formats | guards; `npm run check` | command output |

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
