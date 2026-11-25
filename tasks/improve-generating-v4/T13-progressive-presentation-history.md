# T13: Progressive presentation: fold order and the history policy (phase 1, production)

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §6 "Progressive presentation (OD-P5 (a))" ("Puzzles appear in fold order (slot order), so what is shown does not depend on the device; the design states the history policy for a batch that ends short (a shown puzzle is in the history). Today's offer criteria stay."); decision IG-P-D2 (OD-P5); D-V4-11; review RV1-20 (R20) |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T12 |
| Depends on | T12 (serial order in this repository; no content dependency) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 1.5 h, machine 0 min of benchmark allocation (the test suites and fixture checks are verification, run through the lock helper, check-list §3.2) |

## Goal

The client already streams each accepted puzzle as the fold consumes it, and the Generator lists it at once. This
task pins the two properties the owner's decision relies on with tests (the streamed order is the slot order at
any pool width; a shown puzzle stays in the set's history however the batch ends) and writes the history policy
into the design. No behaviour changes; the offer criteria (ten puzzles, the response time) stay.

## Authority and fixed points

- IG-P-D2 (OD-P5 (a)) and plan §6. A service level (OD-P5 (b)) is not part of this task (N-V4-10).
- The code already does what the policy states: `generation-client.js` calls `onAccepted` from `accept()` in the
  fold's consumption order (`generation-client.js:1094-1133`); `generator/jobs.js` adds a streamed puzzle's keys to
  the history at once (`addSeenKeys`, `jobs.js:427-447`; `generator/state.js:1556-1572`) and merges the batch's
  history at the end (`mergeSeenKeys`, `jobs.js:507-508`); removing a puzzle keeps the history
  (`generator/state.js:1606-1615`). If a test of this task fails, the code and the decision disagree: stop with
  `QUESTION:`; do not change production code.

## Scope

- Change: `tests/generation-client.test.js` (the helper `runRecipe` and one test), `tests/generator-controller.test.js`
  (one test), `docs/design-detail.md` (two places).
- Do not change: everything else. Guard: `git status --short` lists only these three files.

## Steps

1. **`tests/generation-client.test.js`**: `runRecipe(size, o = {})` (line 1240) passes `o.hooks ?? {}` as the
   second argument of `client.generateBatch(...)`. New test after `one and four workers reproduce the recorded
   recipe and an importable pack`: `progressive presentation: accepted puzzles stream in slot order, the same at one
   and four workers` (Tests table).
2. **`tests/generator-controller.test.js`**: a new test after `cancel keeps the streamed prefix, the set and its
   calibration; nothing is invented` (line 446): `a shown puzzle stays in the history however the batch ends`
   (Tests table). Import `clueKey` from `../core/engine/keys.js` next to `layoutKey`.
3. **`docs/design-detail.md`**:
   - §6.9, after the paragraph that starts "Accepted puzzles are always kept." (line 1503), a paragraph:
     "**Progressive presentation (OD-P5 (a)).** The client reports each accepted puzzle (`onAccepted`) when the fold
     consumes it, so puzzles arrive in slot order whatever the pool width, and what is shown does not depend on the
     device. A caller may show them as they arrive; the offer criteria (ten puzzles, the response time) are
     unchanged. **History policy.** A puzzle that was shown is in the set's seen-history (its layout key and clue key)
     from the moment it arrives, however the batch ends: complete, short (any partial reason), cancelled or failed,
     and also when the Generator drops it at the end for the pack size (§10.5). Like a removed puzzle, it is not
     generated again for that set until the history is reset."
   - §10.5, **Limits of the list**, after "...which then replaces the batch's cancel or shortfall message.": "A
     dropped puzzle stays in the seen-history, like every puzzle that was shown (§6.9)."

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tests/generation-client.test.js` | `progressive presentation: accepted puzzles stream in slot order, the same at one and four workers` | `runRecipe(1, { hooks: { onAccepted: (e) => one.push([e.index, e.puzzle.id]) } })` and `runRecipe(4, ...)` into `four` | `one` deep-equals `four`; the indexes are `0, 1, 2, ...` in order; the ids equal `batch.accepted.map((p) => p.id)` of each run |
| `tests/generator-controller.test.js` | `a shown puzzle stays in the history however the batch ends` | `harness({ client, accepted: true, state: { quantity: 3 } })` with a `fakeClient` whose `batch` streams `makePuzzles(2, 80)` through `hooks.onAccepted` and then, per case, returns `{ status: 'partial', reason: 'time-limit', accepted, seenLayouts: [], seenClues: [] }`, returns `{ status: 'cancelled', accepted, seenLayouts: [], seenClues: [] }`, or throws `new GenerationError('internal', 'worker lost', { accepted })` (no keys in the detail); then `await h.controller.addMore()` | in each case, for both streamed puzzles, `layoutKey(SET.board, SET.pieces, p.solution)` is in `state.seenLayouts` and `clueKey(SET.board, SET.pieces, p.clues)` in `state.seenClues`, although the client reported no keys |
| same | (same test, fourth case) | the pack-size case of `the list stops at the pack size limit` (`huge(200)`, `huge(201)` after `huge(300)`), with the client's result `seenLayouts: ['layout-200', 'layout-201']`, `seenClues: ['clue-200', 'clue-201']` | `q201` is not listed and `layout-201` and `clue-201` are in the history |

## Documentation

`docs/design-detail.md` (step 3). `docs/design-brief.md`, `README.md` and the guides do not describe the history of
a batch that ends short (checked by the pack author: no match for "history", "lịch sử" or "stream"); no change
there. No user-visible behaviour changes: no release note.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `Invoke-IgNode -Repo pentomino -Task 'T13 quick' -NodeArgs @('--test', '--test-skip-pattern=slow', 'tests/**/*.test.js')` (check-list §3.2; the same as `npm run test:quick`) | root | exit 0, 0 failures | 5 min (the helper's 300 s) |
| `Invoke-IgNode -Repo pentomino -Task 'T13 full' -NodeArgs @('--test', 'tests/**/*.test.js')` (the same as `npm test`) | root | exit 0, 0 failures | 5 min (the helper's 300 s) |
| `Invoke-IgNode -Repo pentomino -Task 'T13 fixtures' -NodeArgs @('tools\record-fixtures.mjs', '--check')` | root | `record-fixtures: OK` | 5 min |
| `Invoke-IgNode -Repo pentomino -Task 'T13 replay case' -NodeArgs @('tools\record-fixtures.mjs', '--replay-case', '--check')` | root | `record-fixtures: replay case OK` | 5 min |
| `npm run check` | root | exit 0 | 2 min |
| `git status --short` | root | only the three files of the Scope | 1 min |

## Stop points and questions

- Stop and report before: changing production code (none is needed; a failing test means the code and IG-P-D2
  disagree).
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T13-B01 | What is shown during a batch does not depend on the device (slot order at any pool width) | the client test | the full-suite output |
| T13-B02 | A shown puzzle is never generated again for its set, however the batch ends (the stated history policy) | the controller test; design §6.9 | the full-suite output; diff |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T13-T01 | Tests only; no production code changed | `git status --short` | command output |
| T13-T02 | The living specification states the policy | step 3 | diff of `docs/design-detail.md` |

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
| Start, end, duration | 2026-11-18 06:33:10 +07:00 (dispatch, base `ae00ca0`) to 07:26:15 +07:00 (acceptance): 53 min 5 s; the developer's own times 06:33:13-06:46:28; the orchestrator's locked re-run waited about 25 min behind Sudoku's difficulty-v3 |
| Waiting for rulings | about 3 min (SA-Opus's review, 06:47-06:50; no QUESTION) |
| Agent id, model | `da55e5b7-b223-49c8-bf7f-7d22f72f9bda`, claude-sonnet-5.5 |
| Calls; input, output and cache-read tokens | 55 calls; 6,441,096 input, 28,136 output, 6,288,222 cache-read |
| AI credits | 129.23 |
| Questions and rulings | none from the developer, no deviation. SA-Opus ruled "accept T13" (provided the locked gates are green, which they are): the two tests and the two edits of `design-detail.md` match the task, every reading accepted. Pack amendment `b7656f0`: the T13 ruling row and the new check-list §8 "End of the pack and hand-over" |
| Fix rounds | 0 |
| Gates re-run by the orchestrator | Through the repository's lock helper: `T13 quick verify` 1,495 tests, 1,495 pass, 0 fail, 0 skipped (`progressive presentation: accepted puzzles stream in slot order, the same at one and four workers` and `a shown puzzle stays in the history however the batch ends` pass), `IG … exit=0 seconds=34.473`; `T13 fixtures verify` `record-fixtures: OK` (0.595 s, 1,461 s wall behind Sudoku's difficulty-v3); `T13 replay case verify` `record-fixtures: replay case OK` (1.269 s); `T13 full verify` 1,514 tests, 1,514 pass, 0 fail (123.369 s); total wall 2,338 s. `git status --short`: exactly the three files of the Scope, no production file; `npm run check`: OK. The developer's mutation run (a scratch copy of `jobs.js` skipping `addSeenKeys`) failed the new controller test as expected |
| Commit | `a3489f9`, `improve-generating T13: Progressive presentation: fold order and the history policy` |
| Issues and named items | none new; N-V4-10 (the service level, OD-P5 (b)) stays with the owner; the pack's hand-over is check-list §8 |
