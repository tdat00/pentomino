# MP15a2 — Replay steps: the step table, the score data, the final step and the byte bound

| Header | Value |
|---|---|
| ID | MP15a2 (second part of the report's MP15a, split after cross-review SP08-SP10; MP15b adds the worker task, the protocol and the client) |
| Depends on | MP15a1 (accepted and committed: `runReplay`, `ReplayRun`, `utf8Length`, `REPLAY`) |
| Estimated size | Medium: about 450–600 changed lines (`replay.js` about 220, tests about 280, documents about 40); about 45–60 minutes |
| Owner role | Engine |
| Milestone | M9 — Generation Steps |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-29 (`Step`, bounds), RES-30 (score tables: the data the steps carry), RES-28 (events); check-list §4.2 D33; cross-review SP10, SP11, SP12, SP13 (`docs/difficulty-v3/gpt-6-astra/6-review-of-task-pack.md`, second pass) |
| Gates owned | none |
| Implementation status | Not started |

## Goal & business context

This task turns a replay run (MP15a1) into the list of steps the Generator's dialog plays (MP16a): the piece count,
the carving, the pieces, the layout walk, every rated clue set, the repairs and the final puzzle, each with its board
state and score data. The final step always shows the stored puzzle with its clues, and, when the replay confirmed it,
points to the measurement behind its score table. The steps never exceed their byte bound, and a trace cut by that
bound is never presented as verified.

## Scope

### In scope

- `core/engine/replay.js`: `replayPuzzle(input, workspaces, limits = REPLAY, isCancelled)` returning a
  `ReplayResult`; the `Step` and `ReplayResult` typedefs; private step builders.
- Tests: `tests/replay.test.js` (the step cases below, added to MP15a1's).
- Documents: `docs/design-detail.md` §6.12 (the steps part), §4.2 (`replayPuzzle` in the `replay.js` block), §13.2
  (the `replay` row).

### Out of scope

- `runReplay` and its contract (MP15a1; report a defect instead of changing it, except to import from it).
- The worker task, the protocol, the client (MP15b); the dialog and its texts (MP16a, MP16b).

## Repository rules

- Read `AGENTS.md` and `tasks/difficulty-v3/check-list.md` §3 and §7 first.
- Engine purity as in MP15a1 (`// @ts-check`, JSDoc, no DOM, storage, clock or randomness; none of the words
  `LIMITS`, `QUALIFICATION`, `enabledMaxActive`, `deriveLimits`).
- Run only the commands of the test plan; no gate. Never stage, commit, stash, reset, push or switch branches; never
  edit `tasks/difficulty-v3/`, the reports or `docs/difficulty-v3/`.
- **Amendment L1 (lock; orchestrator decision 2026-11-13).** The Sudoku repository runs on the same machine. Save the
  helper `Invoke-Dv3Timed` of check-list §7 ("Shared-machine lock protocol") verbatim as
  `tests/artifacts/MP15a2/dv3-lock.ps1` and dot-source it in every call. Every test run of the test plan goes through
  it, as written there: one bounded command per acquisition of the lock, at most 590 s, at least 15 s between
  releasing the lock and taking it again (the helper waits), never a lock held across a series of commands. Only
  `npm run check` and, while you work, a single test file that ends within 10 seconds run without it. A command that
  the helper stops at its limit has an error: report it, never rerun it outside the helper. The reply gives each
  invocation's label, exit, seconds and lock wait.
- UTF-8 without BOM, CRLF, final newline, no trailing whitespace.

## Inputs & context

### What MP15a1 provides

`runReplay(input, workspaces, limits, isCancelled, reserveBytes)` → `{ status, reason, stages, compared, work,
events, set }` with the events in chronological order, the replayed set (or null), the limits and input checks
(`RangeError`), `ReplayCancelledError`, `utf8Length(text)`; `stages.set` / `stages.candidate` are `'replayed'`,
`'unavailable'`, `'mismatch'`, `'stopped'` (and `'calibration'` for the candidate).

### Contract (RES-29; D33 adds `detail`)

```js
/**
 * @param {{ set: PieceSet, puzzle: PackPuzzle | Puzzle, generation: unknown }} input As runReplay.
 * @param {{ ws: Workspace, scratch: Workspace }} workspaces
 * @param {{ maxSteps: number, maxBytes: number, work: number }} [limits]
 * @param {() => boolean} [isCancelled]
 * @returns {ReplayResult}
 */
export function replayPuzzle(input, workspaces, limits = REPLAY, isCancelled = () => false)
```

```text
ReplayResult = { status, reason, stages, compared, work, steps: Step[] }     // runReplay's fields without events, set
Step         = { stage, kind, board: { placed, lifted, clues }, rating, breakdown, detail, band, note, args }
```

### Algorithm

```text
replayPuzzle(input, ws, limits, isCancelled):
  check input and limits exactly as runReplay does (reuse its checks: RangeError before any work)
  // the bound is utf8Length(JSON.stringify(steps)) <= limits.maxBytes (cross-review TP10)
  finalBytes = max(utf8Length(JSON.stringify(finalStep(input, 'unavailable', null))),
                   limits.maxSteps >= 2 ? utf8Length(JSON.stringify(finalStep(input, 'unavailable', limits.maxSteps - 2))) : 0)
               // the largest final step: the longest status text, with detailStep null (4 bytes) or the largest index
               // a measuring step can have (maxSteps - 2); whichever is longer
  reserve = finalBytes + 2                   // plus the array's two brackets
  if reserve > limits.maxBytes: throw new RangeError('maxBytes cannot hold the final step')   // SP10, before running
  run = runReplay(input, ws, limits, isCancelled, reserve)
  steps = []; bytes = reserve; cut = false
  for each event of run.events, in order:
    s = stepOf(event, context)        // context: the replayed set, the pieces so far, the current candidate layout
    b = utf8Length(JSON.stringify(s)) + 1     // the step and the comma after it (the final step always follows)
    if bytes + b > limits.maxBytes: cut = true; stop adding
    else: steps.push(s); bytes += b
  result = { status, reason, stages, compared, work } of run
  if cut and run.status !== 'incomplete':
    result.status = 'incomplete'; result.reason = 'bytes'; result.compared = []; result.stages.final = 'not-compared'
    // the runs' stage states stay (they are public); the endpoint is not presented as verified (SP10)
  detailStep = result.status === 'matched' ? measuringStep(steps, input.puzzle) : null      // below (SP11)
  steps.push(finalStep(input, result.status, detailStep))
  return { ...result, steps }
```

`utf8Length(JSON.stringify(steps))` is at most `limits.maxBytes` in every case: it equals 2 plus the bytes and one
comma of every non-final step plus the final step's bytes, and the final step is at most `finalBytes` (cross-review
TP10: the earlier reserve took the index `maxSteps - 1` with the status text only; for `maxSteps = 1` that reserved
202 bytes where the final step is 205 and the array 207). `steps.length` is at most `limits.maxSteps` (MP15a1 keeps
one slot).

### Steps

`Step = { stage, kind, board: { placed, lifted, clues }, rating, breakdown, detail, band, note, args }`, plain JSON,
no text:

| Event | `stage` | `board` | `rating`, `breakdown`, `detail`, `band` | `note` | `args` |
|---|---|---|---|---|---|
| `count` | 1 | empty | null | `replay.step.count` | `{ k, min, max }` (min and max of `range`) |
| `carve` | 2 | empty | null | `replay.step.carve` | `{ mode, parts }` (parts = the number of macro parts, 0 for flat) |
| `piece` | 3 | the accepted regions so far (`id` and `pose` = the piece of the replayed set whose witness pose covers exactly these cells and that pose; both null when `run.set` is null) | null | `replay.step.piece` | `{ n }` (1-based) |
| `start` | 4 | `placed` = the start layout | null | `replay.step.start` | `{ start }` |
| `retile` | 4 | `placed` = the layout after the step, `lifted` = `liftedIds` | null | `replay.step.retile` | `{ step, lifted, changed }` (`lifted` = count) |
| `rated` | 5 | `placed` = the candidate layout, `clues` = `clueIds` | the rating, its breakdown, the detail, the band | `replay.step.rated` | `{ sequence, phase, source }` |
| `skip` | 5 | `placed` = the candidate layout | null; band null | `replay.step.skip` | `{ sequence, source }` |
| `unrateable` | 5 | as `rated` | rating null, band | `replay.step.unrateable` | `{ sequence, phase, source, reason }` |
| `rejected` | 5 | as `rated` | as `rated` | `replay.step.rejected` | `{ sequence, phase, source, reason }` |
| `repair` | 6 | `clues` = the ids of the event's `clues` | as the event (null fields stay null) | `replay.step.repair` | `{ repairSequence, added, accepted, reason }` (`added` = `addedId`, null for a zero-add failure; `reason` null when absent) |
| `selected` | 5 | `clues` = the ids of the selected clues | null | `replay.step.selected` | `{ sequence, repairSequence, source }` |
| final | 7 | `placed` = the stored solution, or the stored clue placements when the puzzle has no stored solution; `clues` = the stored clue ids | the stored claim, its breakdown, `detail: null`, band of its level | `replay.step.final` | `{ status, detailStep }` |

- `board.placed` is a list of `{ id: string | null, cells: [x, y][], pose: Pose | null }` (the pose copied field by
  field; the dialog draws items with a pose through the board view); `lifted` and `clues` are lists of piece ids.
  For the clue stages the candidate layout is the layout of the last `retile` (or `start`) event, and for a
  calibration puzzle the replayed set's witness (`run.set`; empty when it is null). Steps are built after the stage
  runs, so every id is known; a bound that stopped a run leaves the events recorded so far, which become steps as far
  as known (ids null where the set run did not finish).
- **Order** (cross-review SP13): steps are the events in their recorded order; nothing is sorted. Stages 5 and 6
  interleave in `require` mode (a repair, then more rated subsets); stage 7 is always last.
- **The final step** (cross-review SP11): with a stored solution, `placed` lists every piece of the solution; without
  one (an `omitSolutions` pack), `placed` lists exactly the stored clues (`{ id, cells, pose }` from `puzzle.clues`),
  and nothing else is invented. `detail` stays null; `args.detailStep` names the step whose `detail` measured the
  final puzzle (`measuringStep`), so the dialog shows the final score table from that measurement without a second
  copy of it in the bytes:

  ```text
  measuringStep(steps, puzzle):              // only for a matched result
    if the claim has no metrics (a summary claim): return null
    sel = the last step with kind 'selected'
    i = sel.args.repairSequence === null
          ? the index of the 'rated' step with the same args.source and args.sequence === sel.args.sequence
          : the index of the last 'repair' step with args.repairSequence === sel.args.repairSequence
    return i exists and steps[i].detail !== null ? i : null
  ```

  For a matched result the rating of that step equals the stored claim (the rating comparison passed), so its
  detail belongs to the final puzzle; for every other status `detailStep` is null.
- **Breakdowns** (RES-30; cross-review SP12): `breakdownOf(rating)`:
  - null for a null rating, a rating without `metrics` (a summary claim), or a `metrics` value that is not a plain
    object;
  - `difficulty-v3`: `breakdownV3(rating.metrics)` when all six fields it returns (`base`, `rule`, `guess`,
    `penalty`, `unrounded`, `score`) are finite numbers, else null (wrap the call: a throw also gives null);
  - `difficulty-v2`: `{ model: 'difficulty-v2', u: 2 * U, b: 8 * Math.log10(1 + B), score: rating.score }` only when
    `U` and `B` are finite numbers at least 0 **and** the computed `u` and `b` are finite too (cross-review TP11: the
    finite `U = Number.MAX_VALUE` gives `2 * U = Infinity`); otherwise null. MP09b admits other, opaque legacy metrics
    such as `{ oldCounter: 7 }`: they give null, and the claim itself is never rejected or rewritten; extra keys beside
    valid `U` and `B` do not matter;
  - any other model: null.
  A null breakdown means "terms not available": the dialog (MP16a) shows the total only, never zero terms.
- `band`: `{ min, max | null }` from the event, or for the final step from `level(claim.level)` (null when the level
  is unknown: catch the `RangeError` of `level`).
- The `replay.step.*` keys are exactly: `count`, `carve`, `piece`, `start`, `retile`, `rated`, `skip`, `unrateable`,
  `rejected`, `repair`, `selected`, `final`.
- `note` is a locale key; the dialog (MP16a) owns the texts. `args` holds only numbers, strings, booleans and null.

## Files to create/modify

| File | Change |
|---|---|
| `core/engine/replay.js` | `replayPuzzle`, `Step`, `ReplayResult`, the step builders, `finalStep`, `measuringStep`, `breakdownOf` |
| `tests/replay.test.js` | the cases below (MP15a1's cases unchanged) |
| `docs/design-detail.md` | §6.12 (the steps part); §4.2; §13.2 |

Exclusive ownership while this task runs: the files above.

### Documentation slot

- §6.12: append the steps: the step shape and the table in short (note keys, no text), the order rule, the final
  step (placements, `detailStep`), the breakdown rule (v3, valid v2 terms, otherwise "not available"), and the byte
  bound with the final step's reserve (a limit that cannot hold the final step is refused before running; a cut trace
  is `incomplete` and not compared).
- §4.2: `replayPuzzle` and `ReplayResult` in the `replay.js` block.
- §13.2: extend the `replay` row with the step cases.

## Implementation steps

1. `breakdownOf`, `finalStep` (with the largest-form reserve), `stepOf` with its context, `measuringStep`.
2. `replayPuzzle`: checks, reserve, `runReplay`, the step loop, the cut rule, the final step.
3. Tests, documents, the test plan; record the measurements of case 9 in the reply.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP15a2-B01 | Every replayed puzzle can be played step by step in the order it was made, ending with the stored puzzle | cases 1, 2 |
| MP15a2-B02 | The final step always shows the stored puzzle's clues (also for a puzzle shared without its solution) and, when the replay confirmed it, its full score table from the same measurement | case 3 |
| MP15a2-B03 | A score table is never fabricated: terms that cannot be computed for an old rating are shown as not available | case 4 |
| MP15a2-B04 | The steps never exceed their size bound, and a cut trace is never presented as verified | cases 5, 6 |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP15a2-T01 | Steps follow the table, in event order, with the stage-5/6 interleave allowed and the final step last | cases 1, 2 |
| MP15a2-T02 | The final step: placements of the solution or exactly the stored clues; `args.detailStep` per `measuringStep` (null unless matched with a full claim) | case 3 |
| MP15a2-T03 | `breakdownOf` as specified for v3, valid and invalid v2 metrics (finite inputs whose terms overflow among them, TP11), summary claims and other models | case 4 |
| MP15a2-T04 | The reserve (2 + the larger final form) is checked before running; `utf8Length(JSON.stringify(steps))` is at most `maxBytes`, with exact fits and one-byte-less cases for `maxSteps = 1`, an unavailable result and a multi-step trace (TP10); a cut sets `incomplete` `'bytes'`, `compared` empty and `final` `'not-compared'` unless already incomplete; `maxSteps` respected | cases 5, 6 |
| MP15a2-T05 | Plain JSON (`structuredClone` and JSON round trip equal) and deterministic | cases 7, 8 |

## Test plan

### Exact commands

```powershell
. tests\artifacts\MP15a2\dv3-lock.ps1
$r = Invoke-Dv3Timed -Task 'MP15a2 targeted tests' -NodeArgs @('--test', '--test-skip-pattern=slow',
  'tests/replay.test.js', 'tests/policy.test.js', 'tests/benchmark-report.test.js', 'tests/bq-limits.test.js')
if ($r.Exit -ne 0) { throw 'targeted tests failed' }
$r = Invoke-Dv3Timed -Task 'MP15a2 quick set' -NodeArgs @('--test', '--test-skip-pattern=slow', 'tests/**/*.test.js')
if ($r.Exit -ne 0) { throw 'quick tests failed' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'check failed' }
```

`tests/replay.test.js` must still finish within 2 minutes; report its duration. Inputs as in MP15a1.

### Required test cases (added to `tests/replay.test.js`, on `replayPuzzle`)

1. Every fixture puzzle: the status and stages equal `runReplay`'s; `steps.length` is the number of run events plus
   one; step i has the kind of event i; the first step is `count`; the last step is the final (stage 7) with
   `board.clues` equal to the puzzle's clue ids and `rating` equal to its claim; the step before it is `selected`;
   every `rated` step whose rating has metrics carries a breakdown whose `score` equals its rating's score.
2. Order (cross-review SP13): mapping stages 5 and 6 to one class, the stages along the steps never decrease for a
   candidate puzzle (1, 2, 3, 4, then 5/6, then 7); the calibration puzzle has 1, 2, 3, then 5/6, then 7 and no stage
   4. In the fixture (uniqueness `require`), report whether a stage-6 step is followed by a stage-5 step; when one
   is, assert it is kept in that order (never sorted).
3. The final step (cross-review SP11): with the solution, `placed` has one item per piece with its pose; for the
   `omitSolutions` pack of MP15a1's case 6, `placed` has exactly one item per stored clue (ids and cells of the
   clues) and `board.clues` the same ids; for every matched puzzle with a full claim, `steps[args.detailStep]` is the
   `rated` or `repair` step named by `measuringStep`, its `detail` is not null and its `rating` deep-equals the claim;
   report which fixture puzzles were won without a repair and which with one (both kinds are asserted when present;
   when the fixture has no repaired winner, say so); a puzzle whose claim was modified (MP15a1's case 4) has
   `detailStep: null`.
4. Breakdowns (cross-review SP12, TP11), through the final step of a puzzle whose stored claim is replaced (the run is
   then `mismatch`, and the final step still shows the stored claim): a `difficulty-v2` claim with `metrics: { U: 5,
   B: 3 }` gives `{ model: 'difficulty-v2', u: 10, b: 8 * Math.log10(4), score }`; with `{ U: 5, B: 3, extra: 1 }` the
   same; with `{ oldCounter: 7 }`, `{ U: 'x', B: 3 }`, `{ U: 5, B: -2 }` and `{ U: Number.MAX_VALUE, B: 0 }` (finite
   inputs, infinite `2 * U`) the breakdown is null and the claim is shown unchanged; a `difficulty-v3` summary claim
   (no `metrics`) gives null; a `difficulty-v1` claim gives null; no step of any result contains `NaN` or `Infinity`
   (a JSON round trip of the result deep-equals it, the `Number.MAX_VALUE` claim included). Every claim of this case
   is valid pack JSON; do not use `Infinity` as an input (it is not JSON, and the stored claim would carry it into
   the final step).
5. The byte bound (cross-review SP10, TP10), always `utf8Length(JSON.stringify(result.steps)) <= maxBytes`:
   - `maxSteps` = 1: with `F = utf8Length(JSON.stringify(finalStep(input, 'unavailable', null)))` (export
     `finalStep` for the tests, or compute it from the result of a large limit), `maxBytes = F + 2` runs and returns
     only the final step (exact fit, `incomplete` `'steps'`); `maxBytes = F + 1` throws `RangeError` before running
     (an `isCancelled` that throws is never reached);
   - an unavailable result (a puzzle without a record, `'no-record'`): its single final step fits exactly at
     `maxBytes` = 2 + the larger of its two final forms, and one byte less throws `RangeError`;
   - a multi-step trace: for one candidate puzzle, take the full result `full` (default limits), `reserve` = 2 + the
     larger of its two final forms (as the algorithm) and `need` = `reserve` + the sum over the non-final steps of
     `full` of (`utf8Length(JSON.stringify(step))` + 1). The run's own event guard must not cut first: assert
     `utf8Length(JSON.stringify(run.events)) + reserve < need` for `run = runReplay(input, ws, REPLAY, () => false,
     reserve)` (steps carry whole layouts and are larger than their events; if this does not hold, report both sizes
     and skip the two exact-fit checks). Then `maxBytes = need` keeps every step with the status of `full`;
     `maxBytes = need - 1` gives `incomplete` `'bytes'` with the last non-final step dropped, the final step last,
     `compared` empty and `stages.final === 'not-compared'` when `stages.set` is `'replayed'`;
   - `maxBytes` = 4,000: `incomplete` `'bytes'` and the final step last.
6. The step-count bound: `maxSteps` = 10 gives exactly 10 steps, the last the final; `maxSteps` = 1 gives only the
   final step with `incomplete` `'steps'`.
7. Plain JSON: `structuredClone(result)` and `JSON.parse(JSON.stringify(result))` deep-equal `result`; no step
   contains a function, a typed array or `undefined`.
8. Determinism: two replays of the same puzzle give deep-equal results.
9. Measurements for the provisional bounds (record in the reply, not asserted): for each fixture puzzle the number of
   steps, the steps' UTF-8 JSON bytes and `work`; the largest of each as a share of `REPLAY`.

## Definition of done & handoff

- Every criterion has its evidence; the reply gives the exports, the measurements of case 9 and the test counts.
- Handoff to MP15b: `replayPuzzle(input, { ws, scratch }, REPLAY)` returns a structured-clone-safe `ReplayResult`
  (with `work`); `RangeError` for malformed input or limits; `ReplayCancelledError`. To MP16a: the step table
  (stages, kinds, note keys, args, `args.detailStep` of the final step, `added: null` of a zero-add failure), the
  breakdown rule (null means "not available"), the statuses and reasons, the stage states including `stopped`.

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
