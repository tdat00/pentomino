# T09e: The verdict tool: bound prerequisites, the class-selection receipt and the verdict record

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §5.2 (the class verdicts, the shipped arms, rule (c5) faster with IG-P-Q37's sentence), §6 phase 0's gate, §7 (IG-P-Q37); decisions D-V4-08, D-V4-17, D-V4-18, D-V4-19; review RV1-01 (R01), RV2-09 (R2-09), RV2-11 (R2-11 step 4), RV3-03, RV3-04, RV3-06 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T09d |
| Depends on | T09d; T04d (`lib/proof.mjs`: `proofEnvelope`, `proofCheck`, `LIVE_DEADLINE_FIELDS`); T04f (`checkAccepted`) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3.5 h (3 h and a fix round of 0.5 h, ruling of 2026-11-17), machine 0 min (a reader and pure functions; synthetic cases, unlocked) |

## Goal

The verdict record must be computed only from declared, hash-bound records and prerequisites whose bindings were
fixed when they were accepted. This task writes the tool that reads the verdict manifest (T09a's schema), the
published rows and their journals, applies T09b to T09d, checks the prerequisites through their accepted bindings,
reports the work intervals of IG-P-Q37, and writes the verdict record and, for a selection, the class-selection
receipt that the comparator resolution (T11f) consumes.

## Authority and fixed points

- R2-09 and RV3-06 (accepted), D-V4-18: each declared prerequisite `{ binding, current }` is checked by T04f's
  `checkAccepted(readJson(binding), { readFile, current })`, `current` holding, for each arm id it names, today's tree
  id (`(await ensureTree(id)).treeId`) and the SHA-256 of `JSON.stringify(params)` of that tree's `ig-tree.json`;
  the historical stage-1 binding is declared with `current: []`. The live-deadline binding's `expected.kind` must be
  `'live-deadline'` and its `expected.fields` deep-equal to `LIVE_DEADLINE_FIELDS`, else the manifest is refused (the
  tool exits 1): a projection can never satisfy it (R01, D-V4-08).
- RV3-06 (class selection): the receipt binds every input of the decision: the verdict manifest, the collection's
  activation and closure records (T11e), the freeze record that declares the classes
  (`docs/improve-generating/evidence/frozen/V4-S3/freeze.json`, N-V4-03), every runs file and every journal and link
  file read, each in `evidence` with its SHA-256; its arms carry the tree id and the SHA-256 of
  `JSON.stringify(meta.trees.<variant>.params)` from the published runs files (immutable records, never a tree folder
  that a later build overwrites); its `harnessHash` is today's `harnessInfo().harnessHash` (the producer).
- RV3-04 (closure): a selection is final when every declared validation row of every class arm is published, or when
  the collection's closure record lists exactly the declared rows that are not published; the receipt records
  `collection: { activationSha256, closureSha256, missing }`. A missing row without a matching closure leaves the
  receipt `incomplete`: an interim report is never a selection.
- RV3-03: with `purpose: 'selection'` the phase-0 line is never `pass` (T09d); with `purpose: 'final'` the manifest
  names the selection receipt (`selection: { path, sha256 }`), and the shipped arms recomputed from the records must
  equal its `selection.cells`, else `Phase 0: FAIL (selection changed <cell>)`.
- IG-P-Q37, D-V4-17: per class and arm the record reports `loRatio`, `hiRatio`, the width `hiRatio - loRatio`,
  `completedRatio`, `terminatedCalls` and the open primitives; the judged work verdict is T09c's.
- Reading the records: a runs file whose SHA-256 differs from the manifest's (`changed evidence`), a runs file in the
  arm's evidence folder that `arm.files` does not declare (`undeclared evidence`), or a file whose
  `meta.trees.<arm.variant>.treeId` differs from `arm.treeId` (`stale tree`) makes each of its rows `invalid`.

## Scope

- Create: `tools/ig-proto/data/verdict-manifest.example.json` (step 4).
- Change: `tools/ig-proto/verdicts.mjs` (steps 1 to 3), `tools/ig-proto/self-test.mjs` (cases appended to `--items`),
  `tools/ig-proto/README.md` (T09a's section).
- Do not change: everything else. Guards: `node tools\ig-proto\firewall.mjs check --task V4-T09e --label frozen`,
  expected `files unchanged`; `git status --short -- core generator tests tools/bench tools/ig-proto/variants tools/ig-proto/lib`,
  expected no output.

## Steps

0. `node tools\ig-proto\firewall.mjs snapshot --task V4-T09e --label frozen`.
1. **`prerequisites(declared, { readJson, readFile, currentOf })`** (pure; `currentOf(id)` returns today's `{ treeId,
   paramsHash }`): first the live-deadline refusal of the Authority section (throws `Error('verdicts: the
   live-deadline prerequisite must be a live-deadline binding')`); then, for `stage1`, each `parity` entry and
   `liveDeadline`: `checkAccepted` of the binding with `current` built by `currentOf` for the entry's ids; a missing
   binding file is `incomplete` (`missing binding <path>`). Returns `{ stage1, liveDeadline, ['parity:' + <binding
   path>]: ... }`, one key per `parity` entry, each `{ status, reasons }` (T09d's `phase0Verdict` requires `stage1` and
   `liveDeadline` and reads an absent one as `incomplete`; T09d's report).
2. **`classSelection(manifest, results, inputs)`** (pure; `inputs = { files: [{ path, sha256 }], published:
   [<arm>/<rowKey>], declared: [<arm>/<rowKey>], activation: { path, sha256 }, closure: { path, sha256, missing } |
   null, freeze: { path, sha256 }, arms: [{ id, treeId, paramsHash }], harnessHash }`): `proofEnvelope({ kind:
   'class-selection', verdict, source: { frozenCommit: FROZEN_COMMIT, sourceDigest: FROZEN_DIGEST }, harnessHash,
   arms, coverage: { expected: declared, observed: published, missing: <declared not published>, censored: [] },
   evidence: files, fields: { selection: { classes: [{ id, verdict, decidedBy, shipped }], cells: { <cell>: { class,
   shipped } } }, collection: { activationSha256, closureSha256, missing } } })` with `verdict` `pass` when nothing is
   missing, or when a closure is given and its `missing` equals the missing rows (in any order); else `incomplete`
   (`closure does not match` when a closure is given). When a closure makes the selection final, `coverage.expected`
   is the declared rows less the closed ones, `coverage.missing` is empty and `collection.missing` lists the closed
   rows, so that `proofCheck` of the receipt against the expectation that T11f builds from the same records passes.
3. **`main`**: `node tools\ig-proto\verdicts.mjs --manifest <path> --label frozen --source-label <SL>` reads the
   manifest; for each arm, the rows of each file of `arm.files` through T09a's `ingestRow` (with the three refusals
   of the Authority section); the journal of a row: every file `<rowKey>.*.jsonl` of
   `tests/artifacts/ig-proto/<label>/<arm.task>/<arm.arm>/<shard>/logs/` (every shard folder of the arm) other than
   `<rowKey>.row.jsonl` and `<rowKey>.link.jsonl`, through T09c's `parseLines` (its problems join the row's ledger),
   and the link lines of `<rowKey>.link.jsonl`; `rowLedger` (T09c) runs on the rows of the class arms only (the work
   rule's input): a legacy-route row (`log-link`) has no `caps` or `begin` lines and always reads as incomplete (T09c's
   report); no class of the frozen round has it as an arm (controls judge the time ratio, Master identity the keys),
   so only the example's class (step 4) reads it, as `work-unknown`. It computes the
   class verdicts (T09c, each cell's `screenCellGate` from T09d's `cellGate` on the screen arm), the shipped arms, the
   cell gates, the controls, Master identity, Hell 1, P5's stops over the declared pairs, the projection, the
   population, the prerequisites and phase 0 (T09d), and writes under `evidence/<label>/<manifest.task>/`:
   `verdicts.json` (meta block, the manifest and its SHA-256, every number, the work intervals) and `verdicts.md`: one
   section per class (verdict, deciding condition, the clue, faster and completion numbers, and the work table: per
   arm `loRatio`, `hiRatio`, the width `hiRatio - loRatio`, `completedRatio` (each `null` when the arm accepted no
   puzzle), `terminatedCalls`, and the open primitives, the sum of `ledger.open` over the arm's rows, which T09c's
   `workRule` does not carry), the shipped arm per cell and its gate, controls, Master identity per cell,
   Hell 1 as a report, P5's stops, the prerequisites with their reasons, the phase-0 line (`Phase 0: pass.`, `Phase
   0: INCOMPLETE (...)` or `Phase 0: FAIL (...)`), then, under the heading "Post-hoc projection; not a live deadline
   gate", the projection per reserve. With `purpose: 'selection'` it also writes `class-selection.json` (step 2), its
   `files` being every file it read with its SHA-256, `declared` the `declaredRows` of the activation record named by
   `collection.activation` (T11e; with `activation: null`, the example only, every `<arm>/<cell>~<rep>` of the classes'
   arms, cells and `validationReps`), `published` the `<arm>/<rowKey>` of the rows read, `closure` the record named by
   `collection.closure` (or `null`), and `arms` every arm of the manifest with the tree id and the parameter hash of
   its runs files' `meta.trees.<variant>`. A named record whose SHA-256 differs from the manifest's refuses the
   manifest. Exit 0 when the records are written; exit 1 on a refused manifest.
3b. **The calls of `main`** (T09d's signatures; ruling of 2026-11-17, T09d's report), with `validationReps` as `reps`
   unless stated, and an arm's rows its ingested rows of the cell: per class, `classVerdict` (T09c) over its cells,
   each cell's `screenCellGate` the `verdict` of `cellGate` on the screen arm (`'failing'` for a `failingCells` cell,
   `'control'` for a `controls` cell, with the options below; `'pass'` for any other cell, which no gate judges), and
   `shippedArm(verdict, cls)`; per `failingCells` cell, `cellGate('failing', rows, { reps, quantity, capMs,
   responseBoundMs, journals })` on the shipped arm of the class whose `cells` contain it; per `controls` entry,
   `cellGate('control', rows, { reps, quantity, capMs, responseBoundMs, todayRows, resamples, resampleSeed })` on that
   shipped arm, `todayRows` the rows of the entry's `today` arm; per `masters` entry,
   `masterIdentity(todayRows, afterRows, masterReps)`; per `hell1`
   cell, `hell1Report(rows, { reps, quantity })` on the shipped arm of the class whose `cells` contain it (on every arm
   with rows of the cell when no class contains it); per `p5` entry, `p5Stops(boundedRows, uncappedRows, { quantity,
   cell, reps: <the entry's reps> })`; per arm of `deadlineProjection.arms` and reserve of its `reserves`,
   `deadlineProjection(rows, { reserve, deadlineMs, quantity })`; per arm, `population(rows, { quantity })` (two-sided,
   plan P3); and `phase0Verdict({ purpose, classes: [{ id, verdict }], cells: [{ cell, verdict }], controls: [{ cell,
   verdict }], masters: [{ cell, verdict }], p5: <the p5Stops results>, prerequisites: <step 1's output> })`, whose
   `deciding` list gives the reasons of the phase-0 line.
3c. **Decided records are written once** (check-list §3.3 "A record is written once"; ruling of 2026-11-17, T09e's
   report). Before it writes, `main` reads the task's existing records and refuses (stderr `verdicts: <reason>:
   <path>`, exit 1, nothing written) when (a) the purpose is `selection` and
   `docs/improve-generating/evidence/frozen/<task>/class-selection.json` exists with `verdict` `pass` (reason `a final
   selection exists`), or (b) the purpose is `final` and `docs/improve-generating/evidence/frozen/<task>/verdicts.json`
   exists with `phase0.verdict` `pass` or `fail` (reason `a decided phase 0 exists`). Otherwise the three records are
   replaced: an interim (`incomplete`) selection or phase 0 is superseded once the collection is closed or a
   prerequisite is accepted; a correction of a decided record is a new manifest `task`. The rule is the pure export
   `decidedRecord(purpose, { selection, verdicts })` (the parsed existing files, each `null` when absent), which
   returns the reason or `null`. `verdictRecords` also refuses the manifest (it throws, so `main` exits 1): (c) a
   closure record whose `activation.sha256` is not the SHA-256 of the manifest's `collection.activation` (`the closure
   belongs to another activation`); (d) with purpose `final`, a selection receipt whose `verdict` is not `pass` (`the
   selection is not final`). The README's T09a section states the four refusals.
4. **`data/verdict-manifest.example.json`**: T09a's schema with `task: 'V4-T09-example'`, `purpose: 'selection'`, one
   class `{ id: 'example', cells: ['26x26-nightmare'], screen: 'v4-link', noScreen: 'log-link' }` over T06a's
   published arms (`arms` with `task: 'V4-T06'`, the tree ids of T06a's published records and their runs files with
   SHA-256), `validationReps` `[0, 1]`, `masterReps` `[]`, `collection` with no activation (`null`), `prerequisites`
   with `stage1: { binding: 'docs/improve-generating/evidence/frozen/V4-T04/accepted-binding.json', current: [] }`,
   no parity entry, and `liveDeadline: { binding: 'docs/improve-generating/evidence/frozen/V4-LIVE/live-deadline.accepted.json',
   current: ['fr-frozen'] }` (absent).
5. **Self-test** cases appended to `--items` (Tests table; through `const { v, row } = await verdictKit()`, as in
   T09b); **README.md**: T09a's section gains the tool, the bound
   prerequisites, the class-selection receipt and its closure rule, and the work report.

## Tests

All in `tools/ig-proto/self-test.mjs --items`, on synthetic records with temporary files under
`tests/artifacts/ig-proto/selftest/` (T04d's `proofEnvelope`, T04f's `acceptedBinding`).

| Case name | Input | Expected |
|---|---|---|
| `verdicts: bound prerequisites` | `prerequisites` with: (a) a binding whose receipt file changed after acceptance; (b) a live binding whose `expected.kind` is `deadline-projection`; (c) a live binding whose `fr-frozen` tree id differs from `currentOf('fr-frozen')`; (d) a binding whose receipt's `harnessHash` differs from its expected one; (e) a complete, correctly bound live binding; (f) the stage-1 binding with `current: []` while today's harness hash differs from its expected one | (a) `incomplete`, `receipt changed <path>`; (b) throws `verdicts: the live-deadline prerequisite must be a live-deadline binding`; (c) `incomplete`, `stale arm fr-frozen`; (d) `incomplete`, `producer changed`; (e) `pass`; (f) `pass` |
| `verdicts: class selection` | `classSelection` over two class arms of 2 declared rows each: (a) all four published; (b) one missing, no closure; (c) the same with a closure listing exactly that row; (d) with a closure listing another row | (a) `verdict` `pass`, `kind` `class-selection`, `selection.cells` at the envelope root naming each cell's shipped arm; (b) `incomplete`; (c) `pass` with `collection.missing` naming the row and `collection.closureSha256` set; (d) `incomplete`, `closure does not match` |
| `verdicts: the selection binds its inputs` | the receipt of (a), then one journal file of `files` changed by one byte; then, instead, the verdict manifest changed | `proofCheck` against the receipt's own binding (`kind`, `source`, `harnessHash`, `arms`, `coverage.expected`): `pass`; then `incomplete`, `evidence changed <journal path>`; then `incomplete`, `evidence changed <manifest path>` |
| `verdicts: a final verdict keeps its selection` | a final-purpose input whose recomputed shipped arm of one cell differs from the selection receipt's `selection.cells` | `Phase 0: FAIL (selection changed <cell>)` |
| `verdicts: the work report` | a class whose screen arm has `lo` 800, `hi` 1,100 and the no-screen arm `lo` = `hi` = 1,000 over 10 accepted puzzles each, with 2 and 0 terminated calls | the class's `work` block: screen `loRatio` 80, `hiRatio` 110, width 30, `completedRatio` 80, `terminatedCalls` 2; no-screen width 0; `verdict` `unknown` (T09c) |
| `verdicts: decided records are written once` (ruling of 2026-11-17, T09e's report) | `decidedRecord` with (a) `'selection'` and `{ selection: { verdict: 'pass' }, verdicts: null }`; (b) `'selection'` and `{ selection: { verdict: 'incomplete' }, verdicts: null }`; (c) `'final'` and `{ selection: null, verdicts: { phase0: { verdict: 'fail' } } }`; (d) `'final'` and `{ selection: null, verdicts: { phase0: { verdict: 'incomplete' } } }`; (e) both `null`; then `verdictRecords` with (f) the in-memory repository of `verdicts: the selection binds its inputs` and a closure whose `activation.sha256` is another file's; (g) the final-purpose input of `verdicts: a final verdict keeps its selection` with its selection receipt's `verdict` set to `incomplete` | (a) `a final selection exists`; (b) `null`; (c) `a decided phase 0 exists`; (d) `null`; (e) `null`; (f) throws `the closure belongs to another activation`; (g) throws `the selection is not final` |

## Documentation

`tools/ig-proto/README.md` (step 5).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task V4-T09e` | root | every `--items` case passes, exit 0 | 3 min |
| `node tools\ig-proto\verdicts.mjs --manifest tools\ig-proto\data\verdict-manifest.example.json --label frozen --source-label "frozen 3fc65f4"` | root | `verdicts.json`, `class-selection.json` and `verdicts.md` written under `evidence/frozen/V4-T09-example/` with `Phase 0: INCOMPLETE (uncapped comparator collection pending; ...)` naming the missing live-deadline binding; then delete that folder | 2 min |
| `node tools\ig-proto\firewall.mjs check --task V4-T09e --label frozen` | root | `files unchanged` | 1 min |
| `npm run check` | root | exit 0 | 2 min |

## Stop points and questions

- Stop and report before: changing a reading of the Authority section or of T09a's to T09d's.
- `QUESTION:` when T06a's published records lack the fields the example reads (`igSetMs`, `igAcceptedMs`, the link
  files), or when T04f's stage-1 binding is absent.
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T09e-B01 | Every prerequisite is checked through its accepted binding; a changed receipt, a wrong producer, a stale arm or a projection never passes; a historical binding stays valid after unrelated harness work | case 1 | self-test output |
| T09e-B02 | A class selection is final only over a complete publication or an exact closure, and changing any of its inputs invalidates it | cases 2 and 3 | self-test output |
| T09e-B03 | The work intervals of IG-P-Q37 and the completed-unit ratio are reported per class and arm | case 5; the example's `verdicts.md` | self-test output; command output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T09e-T01 | A final verdict cannot change the selection it is based on | case 4 | self-test output |
| T09e-T02 | The reader writes the records from real published rows | the example run | command output |
| T09e-T03 | Nothing else changed; formats | guards; `npm run check` | command output |
| T09e-T04 | A decided selection or phase 0 is never overwritten; a closure of another activation and an interim selection under a final manifest are refused | case `verdicts: decided records are written once` | self-test output |

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
