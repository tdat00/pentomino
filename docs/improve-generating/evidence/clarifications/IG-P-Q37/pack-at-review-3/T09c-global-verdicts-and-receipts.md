# T09c: Global verdicts: cell gates, Master identity, Hell 1, P5's stops, the receipts and the verdict tool

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §5.2 (IG-P-Q29, Q30, Q32, Q33: which arm is judged, phase 0's completion gate, Hell 1 reported, no regression, Master identity), §3 P5 (IG-P-D1 conditions 1 to 4), §3 P3 (population two-sided), §6 phase 0's gate, §9 (P5 and P-OD12); decisions D-V4-08, D-V4-13, D-V4-16, D-V4-18; drift DR-O11; review RV1-01 (R01), RV1-12 (R12), RV1-13, RV2-08, RV2-09 (R2-09), RV2-18 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T09b |
| Depends on | T09b; T04d (`lib/proof.mjs`) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3 h, machine 0 min (pure functions and a reader; synthetic cases, unlocked) |

## Goal

With the class verdicts of T09b, phase 0's verdict needs the arm each cell ships, the gates judged on that arm, Master
identity, the Hell 1 report and the prerequisites that no statistic can replace (the stage-1 receipt with its source block,
the parity receipts and the live one-request deadline), each checked as a typed receipt bound to the expected source, arms,
coverage and evidence. This task writes those, the post-hoc deadline projection as a labelled diagnostic that can never
pass a deadline gate, P5's false stops and lost completions, the class-selection receipt and the tool that reads the
published records and writes the verdict record.

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
  after, T09a) on the declared reps fails: `fail`, and today's arm lacks a valid row: `incomplete`; else `pass` (at
  least 18 of 20 reach ten). Deadline violations and the p95 are reported beside the gate.
- Master identity (RV2-08): for every declared rep, the valid rows of `today` and `after` have equal `acceptedCount`
  and deep-equal `run.details.igPuzzleKeys` (the `instr` variant's keys); a difference is `fail`; an `incorrect` row is
  `fail`; a missing or non-valid row is `incomplete`. Every declared Master cell's result enters phase 0.
- R2-09 (accepted, D-V4-18): a prerequisite is a receipt in T04d's envelope (`lib/proof.mjs`) checked by `proofCheck`
  against the manifest's `expected` binding; an arbitrary `{ verdict: 'pass' }`, a wrong kind, a stale tree or
  parameter, a coverage gap or a changed evidence file never passes; `fail` is kept apart from `incomplete`. The live
  deadline prerequisite must be declared with `expected.kind === 'live-deadline'` and `expected.fields` equal to
  `LIVE_DEADLINE_FIELDS`; a manifest that declares anything else is refused (the tool exits 1), so a
  `deadline-projection` receipt or a `postHoc` row can never satisfy it (R01, D-V4-08).
- RV1-13 and RV2-18 (accepted): a false stop is a valid bounded row whose `partialReason` starts with
  `set:no-window-` while the valid uncapped row of the same identity obtained a set (`run.igSetMs` a finite number),
  whatever its count; a lost completion is a valid uncapped row that reached ten while the valid bounded row did not; a
  missing uncapped row, an uncapped row that is not `valid` (censored, error, invalid, incorrect) or without the
  `igSetMs` field makes the pair `unknown`, never a non-stop and never a correct early stop.
- Phase 0 (plan §6's gate row and RV2-08): `pass` only when every class has a verdict, every failing Nightmare cell
  and control passes on its shipped arm, every declared Master cell passes, P5's stop report has no `unknown` pair
  (IG-P-D1 condition 4 counts lost completions; an unknown pair is not counted) and every prerequisite passes; `fail`
  when one of them is `fail`; else `incomplete`.
- The class-selection receipt (R2-11 step 4) is final only over the declared, completely published validation
  collection: its `verdict` is `pass` when every declared validation row of every class arm is published (whatever its
  status: a censored row makes its class inconclusive, which is a final disposition, plan §5.2), else `incomplete`.

## Scope

- Create: `tools/ig-proto/data/verdict-manifest.example.json` (the schema's example of T09a, step 4's check).
- Change: `tools/ig-proto/verdicts.mjs` (steps 1 to 3), `tools/ig-proto/self-test.mjs` (cases appended to `--items`),
  `tools/ig-proto/README.md` (T09a's section, extended).
- Do not change: everything else. Guards: `node tools\ig-proto\firewall.mjs check --task V4-T09c --label frozen`,
  expected `files unchanged`; `git status --short -- core generator tests tools/bench tools/ig-proto/variants tools/ig-proto/lib`,
  expected no output.

## Steps

0. `node tools\ig-proto\firewall.mjs snapshot --task V4-T09c --label frozen`.
1. **Pure exports** added to `verdicts.mjs` (imports: `import { LIVE_DEADLINE_FIELDS, proofCheck, proofEnvelope } from
   './lib/proof.mjs';`, `import { isDeepStrictEqual } from 'node:util';`, and `FROZEN_COMMIT`, `FROZEN_DIGEST` added to
   T09a's import from `./lib/paths.mjs`):
   - `deadEnds(lines)`: the number of distinct `call` ids with a `phase` line whose `phase` is `p2`.
   - `cellGate(kind, rows, { reps, quantity, capMs, responseBoundMs, todayRows, journals, resamples, resampleSeed })`
     with `kind` `failing` or `control`, `rows` the shipped arm's ingested rows, `todayRows` today's (control only),
     `journals` an object from `rowKey` to the row's journal lines (`null` when absent): `{ verdict: 'pass' | 'fail' |
     'incomplete', reasons, reachedTen, deadEnds, deadlineViolations, p95Ms, noRegression }` by the reading above.
   - `shippedArm(verdict, cls)`: `cls.screen` when `verdict.verdict === 'admitted'`, else `cls.noScreen`.
   - `masterIdentity(todayRows, afterRows, reps)`: `{ verdict, differences: [{ rep, seed, field }] }`.
   - `hell1Report(rows, { reps, quantity })`: `{ requests, valid, reachedTen, candidate: reachedTen >= 18 }` (valid
     rows, D-V4-16's completion), a report only.
   - `deadlineProjection(rows, { reserve, deadlineMs = 115000, quantity })`: per valid row `{ rep, seed, postHoc: true,
     setCut, served, completed, lost }` with `setCut = run.igSetMs > (1 - reserve) * deadlineMs`, `served = setCut ? 0
     : run.igAcceptedMs.filter((t) => t <= deadlineMs).length`, `completed = served >= quantity`, `lost =
     run.acceptedCount >= quantity && !completed`; a row without `igAcceptedMs` is `not-linked`; the result is `{
     kind: 'deadline-projection', label: 'post-hoc projection; not a live deadline gate', rows }`.
   - `p5Stops(boundedRows, uncappedRows, { quantity })`: pairs by `rep` and `seed`; `{ pairs, falseStops,
     lostCompletions, unknown, falseStopReps, lostReps, unknownReps }` by the reading above.
   - `population(rows)`: per cell, over valid rows: the clue share (clues / K) median and range, the score position in
     the band (`(score - min) / (max - min)` with the level's band) median and range, the census-estimate share
     (`ratingCensoredCount / acceptedCount` summed over rows) and completion.
   - `prerequisites(declared, readJson)`: for each of `declared.stage1`, every `declared.parity[]` and
     `declared.liveDeadline` (each `{ path, expected }`): `readJson(path)` (`null` when the file is absent) and
     `proofCheck(receipt, expected)`; an absent file is `incomplete` (`missing receipt <path>`). It first checks
     `declared.liveDeadline.expected.kind === 'live-deadline'` and `isDeepStrictEqual(declared.liveDeadline.expected.fields,
     { ...LIVE_DEADLINE_FIELDS })`, else throws `Error('verdicts: the live-deadline prerequisite must be a live-deadline
     receipt')`. Returns `{ [name]: { status, reasons } }`.
   - `phase0Verdict({ classes, cells, controls, masters, p5, prerequisites })` (RV2-08): the reading above; returns `{
     verdict, deciding: [<item names with their status>] }`.
   - `classSelection(manifest, classResults, published)`: the receipt of the reading above, as `proofEnvelope({ kind:
     'class-selection', verdict, source: { frozenCommit: FROZEN_COMMIT, sourceDigest: FROZEN_DIGEST }, harnessHash:
     <meta.harness.harnessHash>, arms: <each class arm with its published tree id and the SHA-256 of
     JSON.stringify(meta.trees.<variant>.params)>, coverage: { expected: <every declared '<arm>/<rowKey>'>, observed:
     <the published ones>, missing: <the difference>, censored: [] }, evidence: <each runs file with its SHA-256>,
     fields: { selection: { classes: [{ id, verdict, decidedBy, shipped }], cells: { <cell>: { class, shipped } } } }
     })`.
2. **`main`**: `node tools\ig-proto\verdicts.mjs --manifest <path> --label frozen --source-label <SL>` reads the
   manifest (T09a's schema); for each arm, the rows of each file of `arm.files` (the `rows` arrays) through
   `ingestRow`; a file whose SHA-256 differs from the declared one (`changed evidence`), a `*.runs.json` of the arm's
   evidence folder that `arm.files` does not declare (`undeclared evidence`), or a file whose
   `meta.trees.<arm.variant>.treeId` differs from `arm.treeId` (`stale tree`) makes each of its rows `invalid`; the journal of a row: every file `<rowKey>.*.jsonl` of
   `tests/artifacts/ig-proto/<label>/<arm.task>/<arm.arm>/<shard>/logs/` (every shard folder of the arm) other than
   `<rowKey>.row.jsonl` and `<rowKey>.link.jsonl`, through `parseLines` (its problems join the row's ledger), and the
   link lines of `<rowKey>.link.jsonl`. It computes the class verdicts (T09b's `classVerdict`, each cell's
   `screenCellGate` from `cellGate` on the screen arm), the shipped arms, the cell gates, the controls, Master identity,
   Hell 1, P5's stops, the projection, the population, the prerequisites and phase 0, and writes under
   `evidence/<label>/<manifest.task>/`: `verdicts.json` (meta block, the manifest and its SHA-256, every number),
   `class-selection.json` (step 1) and `verdicts.md`: one section per class (verdict, deciding condition, the clue,
   faster, work and completion numbers, the terminated calls), the shipped arm per cell and its gate, controls, Master
   identity per cell, Hell 1 as a report, P5's stops, the prerequisites with their reasons, the phase-0 line
   (`Phase 0: pass.`, `Phase 0: INCOMPLETE (...)` or `Phase 0: FAIL (...)`), then, under the heading "Post-hoc
   projection; not a live deadline gate", the projection per reserve. Exit 0 when the records are written; exit 1 on a
   refused manifest.
3. **`data/verdict-manifest.example.json`**: the schema's example with `task: 'V4-T09-example'`, one class `{ id:
   'example', cells: ['26x26-nightmare'], screen: 'v4-link', noScreen: 'log-link' }` over T06's published arms (`arms`
   with `task: 'V4-T06'`, the tree ids of T06's published records and their runs files with SHA-256), `validationReps`
   `[0, 1]`, `masterReps` `[]`, `prerequisites` pointing at `evidence/frozen/V4-T04/stage1.json` (`expected.kind`
   `stage1`, `arms: []`), no parity receipt, and a missing `evidence/frozen/V4-LIVE/live-deadline.json` with the live-deadline
   binding.
4. **Self-test** cases appended to `--items` (Tests table); **README.md**: T09a's section gains the global procedure,
   the cell gates, the projection label and the rule that only a bound `live-deadline` receipt meets the deadline
   prerequisite, P5's readings and the class-selection receipt.

## Tests

All in `tools/ig-proto/self-test.mjs --items`, on synthetic rows (T09a's `row` helper) and receipts (T04d's
`proofEnvelope`, with temporary evidence files under `tests/artifacts/ig-proto/selftest/`).

| Case name | Input | Expected |
|---|---|---|
| `verdicts: fallback arm` | a failed class whose no-screen arm (a) has 19 of 20 reaching ten and no dead end; (b) 17 of 20; (c) lacks 3 declared rows; (d) has one `incorrect` row | shipped arm `noScreen` each time; the cell gate: (a) `pass`; (b) `fail`; (c) `incomplete`; (d) `fail` |
| `verdicts: one failing global Nightmare cell` | five failing cells pass and one fails on its shipped arm; everything else passes | `phase0Verdict` `fail` naming that cell |
| `verdicts: Master identity binds phase 0` | otherwise green inputs with (a) every Master cell equal; (b) one Master rep whose `igPuzzleKeys` differ; (c) one Master rep missing | (a) `pass`; (b) `fail` naming the cell and rep; (c) `incomplete` |
| `verdicts: Hell 1 is reported, not a veto` | every Nightmare cell and control passes; a Hell 1 cell reaches ten on 12 of 20 | `hell1Report.candidate` false; `phase0Verdict` `pass` |
| `verdicts: receipts are typed and bound` | `prerequisites` with: (a) a file `{ verdict: 'pass' }`; (b) a `deadline-projection` envelope with verdict `pass`; (c) a live-deadline envelope whose arm `treeId` differs from the expected; (d) a live-deadline envelope with `coverage.missing` `['14x14-nightmare~1']`; (e) a complete, correctly bound live-deadline envelope; (f) a manifest whose live-deadline `expected.kind` is `deadline-projection` | (a) to (d): `incomplete` with the reasons `not a live-deadline receipt` (a, b), `stale arm fr-frozen` (c), `coverage gap 14x14-nightmare~1` (d); (e) `pass`; (f) throws `verdicts: the live-deadline prerequisite must be a live-deadline receipt` |
| `verdicts: the projection is never a deadline gate` | `deadlineProjection` of one row `{ acceptedCount: 10, igSetMs: 50000, igAcceptedMs: [60000, 65000, 70000, 75000, 80000, 85000, 90000, 95000, 100000, 110000] }` at reserve 0.5 and 0.6; then `phase0Verdict` with every item `pass` but the live-deadline prerequisite `incomplete` | 0.5: `setCut` false, `served` 10, `lost` false, `postHoc` true; 0.6: `setCut` true, `served` 0, `lost` true; `kind` `deadline-projection` and the label text; phase 0 `incomplete` |
| `verdicts: P5 stops` | a valid bounded row `set:no-window-below` with `accepted` 0 against uncapped rows: (a) valid, `accepted` 10, `igSetMs` 30,000; (b) valid, `accepted` 1, `igSetMs` 30,000; (c) valid, no set (`igSetMs` null, `partialReason` `set:time-limit`); (d) no row; (e) 10 accepted, `igSetMs` 30,000 but `errors` `[{ phase: 'host', code: 'child-timeout', message: 'x' }]` and `measurementValid` false; (f) valid with `measurementValid` true but no `igSetMs` field | (a) false stop and lost completion; (b) false stop, no lost completion; (c) neither; (d), (e), (f) `unknown`; `phase0Verdict` with `p5.unknown` 3 and everything else `pass`: `incomplete` |
| `verdicts: dead ends` | journal lines with `phase` lines `p1`, `p2` (call `x`), `p2` (call `x`), `p2` (call `y`) | `deadEnds` 2 |
| `verdicts: class selection` | `classSelection` over a manifest with two class arms of 2 declared rows each, (a) all four published; (b) one missing | (a) `verdict` `pass`, `kind` `class-selection`, `fields.selection.cells` naming each cell's shipped arm; (b) `incomplete` with the missing `'<arm>/<rowKey>'` in `coverage.missing`; `proofCheck` of (a) against its own binding: `pass` |

## Documentation

`tools/ig-proto/README.md` (step 4).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task V4-T09c` | root | every `--items` case passes, exit 0 | 3 min |
| `node tools\ig-proto\verdicts.mjs --manifest tools\ig-proto\data\verdict-manifest.example.json --label frozen --source-label "frozen 3fc65f4"` | root | `verdicts.json`, `class-selection.json` and `verdicts.md` written under `evidence/frozen/V4-T09-example/` with `Phase 0: INCOMPLETE (...)` naming the missing live-deadline receipt; then delete that folder | 2 min |
| `node tools\ig-proto\firewall.mjs check --task V4-T09c --label frozen` | root | `files unchanged` | 1 min |
| `npm run check` | root | exit 0 | 2 min |

## Stop points and questions

- Stop and report before: changing a reading of the Authority section, of T09a's or of T09b's.
- `QUESTION:` when T06's published records lack the fields the example reads (`igSetMs`, `igAcceptedMs`, the link
  files).
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T09c-B01 | Phase 0 can pass only with every failing Nightmare cell, control and Master cell passing on its shipped arm, P5's stops fully counted and every prerequisite, the live deadline included, met by a bound receipt | cases 1, 2, 3, 5, 6, 7 | self-test output |
| T09c-B02 | P5's false stops and lost completions are counted against the uncapped search; a censored or unresolved control is unknown (P-OD12, IG-P-D1) | case 7 | self-test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T09c-T01 | Hell 1 reported, dead ends counted, the projection labelled and typed | cases 4, 6, 8 | self-test output |
| T09c-T02 | The class-selection receipt is final only over a complete publication | case 9 | self-test output |
| T09c-T03 | The reader writes the records from real published rows | the example run | command output |
| T09c-T04 | Nothing else changed; formats | guards; `npm run check` | command output |

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
