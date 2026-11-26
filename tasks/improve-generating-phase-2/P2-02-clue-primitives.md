# P2-02: Shared clue primitives, the retained `gen-v3` selector and the dispatcher

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-2`; plan §4.1 (`clue-primitives.js`, `clues.js`), §4.4 (P3 row); D-P2-04 |
| Repository, slot, branch, base | `Q:\git\pentomino`; the slot the orchestrator names (`Q:\git\pentomino-p2-w<n>`, check-list §3.7), branch `p2/P2-02` from the `gen-v4` head at the start; G-PROTECTED base `97a6326` |
| Lane; starts when merged | S; P2-01 (its `report.js` line 39 and `design-detail.md` line 169 edits abut this task's) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (`claude-sonnet-5.5`) |
| Estimate | developer 2 h; machine: locked focused run and the full suite (a full-suite point, check-list §3.3) |

## Goal

The primitives both selectors need move to one module, so that `clues.js` and the new `select-v4.js` (P2-04) never
import each other. Today's search stays byte-for-byte the same function, renamed `selectCluesV3`, behind a
`selectClues` dispatcher whose first line is stable for the measurement copies (P2-12d). No result changes.

## Authority and fixed points

- `core/engine/clues.js` at the base: `SkipReplayError` (100-117), `countRowLimit` (121-123, with `SMALL_AREA` at 84),
  `certify` (135-147), `footprint` (153-155), `makeUnique` (174-217), `bandDistance` (223-228), `ranked` (235-240),
  `noProvedGuess` (246-250), `selectClues` (258-787), `sortLike` (789-792).
- Importers at the base: `generate.js:7`, `replay.js:9`, `tasks.js:7`, `core/browser/generation-client.js:7`,
  `tools/record-fixtures.mjs:30` and six test files. They keep importing from `clues.js`.
- `tests/clues.test.js:820` keeps pinning `gen-v3` (plan §4.4 P3 row).

## Scope

- Create `core/engine/clue-primitives.js` and `tests/clue-primitives.test.js`.
- Change `core/engine/clues.js` (steps 2-4), `tools/bench/report.js` (step 5), `docs/design-detail.md` (Documentation).
- Do not change: any other file, any test file other than the new one. Guard: G-PROTECTED, G-WORKTREE with

  ```powershell
  $Allowed = @('core/engine/clue-primitives.js', 'core/engine/clues.js', 'tests/clue-primitives.test.js',
    'tools/bench/report.js', 'docs/design-detail.md',
    'tasks/improve-generating-phase-2/P2-02-clue-primitives.md')
  ```

## Steps

1. Preflight: `git --no-pager diff --exit-code --stat HEAD -- core tests tools` prints nothing.
2. Create `core/engine/clue-primitives.js` (`// @ts-check`, header "Clue-selection primitives shared by the `gen-v3` and
   `gen-v4` selectors (design §6.10, §6.11)"). **Move** into it, with their JSDoc and bodies unchanged character for
   character: `SMALL_AREA`, `SkipReplayError`, `countRowLimit`, `certify`, `footprint`, `makeUnique`, `bandDistance`,
   `ranked`, `noProvedGuess`, `sortLike`, and the typedef `Candidate` (clues.js 69-76). Export every one of them
   (`bandDistance`, `ranked`, `noProvedGuess`, `sortLike` and `footprint` gain `export`). Copy the imports they need
   from `clues.js` lines 12-18 (`activeCount`, `poseCells`, `clueKey`, `BUDGETS`, `buildModel`, `countSolutions`) and
   the typedef imports they use. The line
   `    const c = countSolutions(model, { cap: 2, rowTrialLimit: rowLimit, witnessLimit: 2 });` must stay exactly as it
   is (P2-12d anchors the trace on it).
3. In `core/engine/clues.js`: delete the moved declarations; import what the selector uses from `./clue-primitives.js`;
   add `export { certify, countRowLimit, makeUnique, SkipReplayError } from './clue-primitives.js';` so every importer
   keeps working. Keep `SKIP_BOUNDS`, the selector constants and `SelectContext`/`SelectResult` typedefs in `clues.js`.
   In `SelectContext`, change `target`'s type to `Pick<Level, 'min' | 'max' | 'share'> & { id?: string }`.
4. Rename the search: `export function selectClues(ctx) {` (line 258) becomes `export function selectCluesV3(ctx) {`
   with its body unchanged and its JSDoc first line "Today's search (`gen-v3`, design §6.10): ...". Directly before it,
   add the dispatcher, exactly:

   ```js
   /**
    * Selects a subset of the witness whose measured score lies in the target band: `gen-v4`'s search on its route
    * (`usesGenV4`, design §7.6), today's search everywhere else.
    * @param {SelectContext} ctx
    * @returns {SelectResult}
    */
   export function selectClues(ctx) {
     return selectCluesV3(ctx);
   }
   ```

   P2-04 adds the `gen-v4` branch; the line `export function selectClues(ctx) {` must stay exactly as written.
5. In `tools/bench/report.js` line 38, insert `'core/engine/clue-primitives.js', ` directly before
   `'core/engine/clues.js', `.
6. Tests below; the locked focused run, then the full suite (a full-suite point).

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tests/clue-primitives.test.js` | `clues.js re-exports the same primitives` | import both modules | `clues.certify === prim.certify`, same for `countRowLimit`, `makeUnique`, `SkipReplayError` |
| same | `the dispatcher returns today's search result` | the recipe board and set of `tests/clues.test.js`'s first `selectClues` case (copy its inputs), seed `'p2-02'` | `selectClues(ctx)` deep-equals `selectCluesV3(ctxCopy)` (same `clues`, `rating`, `certificate`, `skips`) |
| same | `ranked orders by band distance, centre, key` | three candidates with scores below, inside, above a band `{ min: 10, max: 20 }` | inside first, then the nearer of the others |
| every existing test file | unchanged | | all pass unchanged (behaviour identical) |

## Documentation

`docs/design-detail.md`: the module tree (line 169) lists `clue-primitives.js`; the `clues.js` API block (lines
555-590) says that `certify`, `makeUnique`, `countRowLimit` and `SkipReplayError` live in `clue-primitives.js` and are
re-exported by `clues.js`, and that `selectClues` dispatches to `selectCluesV3` (today's search). No behaviour text
changes.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node --check core\engine\clue-primitives.js`; same for `clues.js` | slot root | exit 0 | 30 s |
| locked focused gate: `--test tests/clue-primitives.test.js tests/clues.test.js tests/certificates.test.js tests/replay-recorders.test.js tests/benchmark-report.test.js` | §3.3 | `# fail 0` | 300 s |
| Full suite (full-suite point: the shared-primitives integration) | §3.3 | `# fail 0`, `# cancelled 0` | 600 s |
| `git --no-pager diff --stat HEAD -- tests` | slot root | only `tests/clue-primitives.test.js` is new (untracked); no existing test changed | 30 s |
| G-CHECK, G-PROTECTED, G-WORKTREE, G-FORMAT | §3.4 | OK lines | 2 min |

## Stop points and questions

- `QUESTION:` if a moved function's body would have to change, if an existing test fails, or if another file imports
  a moved private function.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-02-B01 | No change for users: every existing test passes unchanged | full suite | gate output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-02-T01 | One shared primitives module; `clues.js` re-exports; no import cycle | re-export test; `node --check` | test output |
| P2-02-T02 | `selectClues` equals `selectCluesV3` | dispatcher test | test output |
| P2-02-T03 | The anchor lines of step 2 and step 4 exist verbatim | `Select-String -SimpleMatch` on both lines, one hit each | command output |

## Checklist

- [ ] Every step done; nothing outside `$Allowed` changed
- [ ] Tests added and green; the focused gate and the full suite green
- [ ] `docs/design-detail.md` updated
- [ ] G-FORMAT, G-CHECK, G-PROTECTED pass
- [ ] Every AC row has its evidence

## Final report

Start and end times; files changed; helper lines and pass counts; the two anchor-line hits; each AC row with its
evidence; questions and deviations.

## Execution log

| Item | Value |
|---|---|
| Slot, base SHA | w1, fb67ba0aba87ed85c8e85b677b0ef66ededbe2e2 |
| Start, end, duration | dispatched 2026-11-25 22:13 +07:00 (developer 22:13:29 to 22:21:46); accepted and merged 22:24; about 11 min |
| Waiting for rulings | none |
| Agent id, model | fae9082c-6919-4247-98ac-668f781cdc75, claude-sonnet-5.5 |
| Calls; input, output and cache-read tokens | 34; 2,843,134 / 22,358 / 2,762,654 |
| AI credits | 70.10 |
| Questions and rulings | none; six minor deviations accepted by the orchestrator (no behaviour change): clueKey not imported by clue-primitives.js (unused), unused imports dropped from clues.js, two extra ranked-order assertions, dispatcher test on normal/any, a Candidate typedef import, the API-block annotations in design-detail.md |
| Fix rounds | 0 |
| Gates re-run by the orchestrator (merge gate) | slot static guards OK (format OK 6 files); rebased onto 030475d cleanly; merge gate: G-PROTECTED, G-CHECK, G-FORMAT-COMMIT OK; locked full suite `IG P2-02 full exit=0 seconds=120.365 quiet=45`, 1531/1531 pass, 0 fail/cancelled/todo |
| Commit (slot), commit on `gen-v4` | slot ad3244a, rebased df72615; gen-v4 df7261576074fa267aab660b023ad6971b5f61fd |
| Issues and named items | none; P2-04 adds the gen-v4 branch to selectClues; P2-12d anchors on the preserved countSolutions line |
