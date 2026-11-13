# MP14b — Set and layout recorders; recorder identity

| Header | Value |
|---|---|
| ID | MP14b (second part of the report's MP14) |
| Depends on | MP14a (accepted and committed: `SelectContext.record`, `recordSource`, `replaySkips`, the clue-stage events, `rateDetailed`) |
| Estimated size | Medium: about 400–600 changed lines (`generate.js` about 50, `carve.js` about 40, `tiling.js` about 20, `types.js` about 30, tests about 250, documents about 30); about 40–50 minutes |
| Owner role | Engine |
| Milestone | M8 — provenance and recorders |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-28 (recorders: observers separate from control hooks; the `set` and `layout` events; recorder off and on identical); RES-27 (stages); check-list §4.2 D31, D32 |
| Gates owned | none |
| Implementation status | Not started |

## Goal & business context

Generation Steps replays a puzzle from the carving of its piece set to its final clues. MP14a reports the clue and
repair steps; this task reports the earlier steps: how many pieces the set got, how the board was cut into parts and
carved into pieces, where the layout walk started and how each local re-tiling changed it. With these events the
replay engine (MP15a1) can show every stage. As in MP14a, the recorders only observe: generation makes the same sets,
layouts and puzzles with or without them.

## Scope

### In scope

- `core/engine/generate.js`: an optional `observe` parameter on `setAttempt` and `puzzleCandidate`; the `count`
  event; the walk's `start` event (D32); passing the observer to carving, the walk and clue selection (the set
  calibration's call with `recordSource: 'calibration'`), `replaySkips` to clue selection, and the work meter
  `charge` (MP14a) to every clue selection of the attempt.
- `core/engine/carve.js`: an optional `record` parameter on `carveMacro` (beside its control hooks) and
  `carveFlatSet`; the `carve` and `piece` events.
- `core/engine/tiling.js`: an optional `record` parameter on `lnsWalk`; the `retile` events.
- `core/engine/types.js`: the set and layout event typedefs, added to the event union of MP14a (`RecordEvent` =
  set, layout and clue events).
- Tests: `tests/replay-recorders.test.js` (new cases).
- Documents: `docs/design-detail.md` §6.5 and §6.7.

### Out of scope

- Worker tasks and the protocol (MP15b): recorders are never sent across the worker boundary in this task.
- `carveFlat` keeps its signature: its callers report the accepted regions (D32).
- `completionCandidate`: its clue stages are not replayed (RES-33).
- Any change of a set, layout, clue set, rating or RNG draw.

## Repository rules

- Read `AGENTS.md` and `tasks/difficulty-v3/check-list.md` §3 and §7 first.
- Engine purity; `// @ts-check` and JSDoc. Recorder calls sit outside the hot inner loops (no call per search node).
- Run only the commands of the test plan; no gate. Never stage, commit, stash, reset, push or switch branches; never
  edit `tasks/difficulty-v3/`, the reports or `docs/difficulty-v3/`.
- **Amendment L1 (lock; orchestrator decision 2026-11-13).** The Sudoku repository runs on the same machine. Save the
  helper `Invoke-Dv3Timed` of check-list §7 ("Shared-machine lock protocol") verbatim as
  `tests/artifacts/MP14b/dv3-lock.ps1` and dot-source it in every call. Every test run of the test plan goes through
  it, as written there: one bounded command per acquisition of the lock, at most 590 s, at least 15 s between
  releasing the lock and taking it again (the helper waits), never a lock held across a series of commands. Only
  `npm run check` and, while you work, a single test file that ends within 10 seconds run without it. A command that
  the helper stops at its limit has an error: report it, never rerun it outside the helper. The reply gives each
  invocation's label, exit, seconds and lock wait.
- UTF-8 without BOM, CRLF, final newline, no trailing whitespace.

## Inputs & context

Anchors are at HEAD `55c0c61` (resume revision); MP13a edited `puzzleCandidate`, `completionCandidate` and the
reused calibration (`made`, `startKind`): find moved lines by the quoted text.

### Where the steps happen

- `setAttempt(req, attempt)` (`core/engine/generate.js:86`): `const ks = pieceCountRange(req.levelId, area);` then
  `const k = ks[rng.int(ks.length)];`; carving `carveMacro(board, k, rng.derive('macro'), BUDGETS)` when `area / k >=
  MACRO_MIN_MEAN` (6.5), else or on failure `carveFlatSet(board, k, rng.derive('flat'), BUDGETS)`; then
  `finalizeSet(board, carved.regions, carved.regionOf ?? null)` and the calibration's `selectClues({ … rng:
  rng.derive('cal'), … excludeClueKeys: new Set(), … })`.
- `carveMacro(b, k, rng, budgets, hooks)` (`core/engine/carve.js:494`): per partition attempt, `parts =
  macroPartition(b, mu, perPart, rng)` (skipped when null or fewer than 2 parts), `quotas = allocateCounts(…)`
  (skipped when null), then each part is carved with `carveFlat`; a failed part discards the whole partition; on
  success `if (allOk) return { regions, regionOf };` (line 550). Control hooks: `hooks?.partitionStart?.(…)` (514)
  and `hooks?.beforePart?.(…)` (523, may fail the partition).
- `carveFlatSet(board, k, rng, budgets)` (281): up to `sizePlans` plans: `sizes = planSizes(area, k, rng)` (null
  ends it), `result = carveFlat(board, sizes, rng, …)`; the first non-null result is returned.
- Cell indexes are row-major: `cellOf(index, width)` (`carve.js:71`) gives `[x, y]`.
- `puzzleCandidate(ctx, slot, attempt)` (`generate.js:172`): the start (witness or restart, MP13a's `startKind`),
  `const layout = lnsWalk(set, start, rng.derive('walk'), scratch, BUDGETS.lnsSteps);`, the layout-key check
  `if (ctx.seenLayouts.has(key)) { return { fail: 'layout' }; }`, then `selectClues({ … excludeClueKeys:
  ctx.seenClues, … })`.
- `lnsWalk(set, start, rng, ws, steps = BUDGETS.lnsSteps)` (`core/engine/tiling.js:498`): for `s` in 0 … steps-1:
  `const { cluster, rows } = clusterFor(set, current, s, stuck, rng);` then `const next = lnsStep(…)`; `next ===
  null` counts as stuck, else `current = next`.

### Observer parameters (RES-28; observers separate from control hooks)

```js
/**
 * @typedef {object} Observe
 * @property {(event: RecordEvent) => void} [record] Observer (RES-28).
 * @property {(units: number) => void} [charge] Work meter (RES-29, MP14a): passed to every `selectClues` call of
 *   the attempt (the set calibration's included); a throwing `charge` propagates.
 * @property {{ subsets: number[], repairs: number[] }} [replaySkips] Replay control for the candidate's clue
 *   selection (MP14a); puzzleCandidate only.
 */
export function setAttempt(req, attempt, observe = {})
export function puzzleCandidate(ctx, slot, attempt, observe = {})
export function carveMacro(b, k, rng, budgets, hooks, record)        // record?: (event) => void
export function carveFlatSet(board, k, rng, budgets, record)
export function lnsWalk(set, start, rng, ws, steps = BUDGETS.lnsSteps, record)
```

Existing callers pass nothing and behave exactly as before. With `observe.replaySkips`, `puzzleCandidate` passes it
to `selectClues` (which then ignores `excludeClueKeys`, MP14a); the caller of a replay passes an empty `seenLayouts`
(MP15a1). `observe.record` is passed to `selectClues` as `record` (source `'candidate'`) in `puzzleCandidate`, and with
`recordSource: 'calibration'` in `setAttempt`. `observe.charge` is passed to `selectClues` as `charge` in both,
whether or not `record` is set (cross-review SP09: a candidate replay drops the calibration's events but must still
meter the calibration's work); carving and the walk are not charged (RES-29: "carving and tiling stay bounded by
their own budgets").

### Events (RES-28; field order as written; every value plain JSON; cells as `[x, y]` pairs)

```text
{ stage: 'set', kind: 'count', range, k }              // range: a copy of ks (the feasible piece counts); k: the chosen count
{ stage: 'set', kind: 'carve', mode, parts }           // mode 'macro': parts = the partition's parts as cell lists;
                                                       // mode 'flat': parts = null; one event per partition attempt that
                                                       // reaches carving / per flat size plan with sizes
{ stage: 'set', kind: 'piece', cells }                 // accepted regions only: emitted after the carve succeeded, in
                                                       // `regions` order, cells ascending by index
{ stage: 'layout', kind: 'start', start, layout }      // D32: start = 'witness' | 'restart'; layout = a copy of the start poses
{ stage: 'layout', kind: 'retile', step, liftedIds, changed, layout }
                                                       // step = s; liftedIds = the cluster's piece ids in cluster order;
                                                       // changed = next !== null; layout = a copy of `current` after the step
```

- `count` is emitted in `setAttempt` right after `k` is drawn; `carve` in `carveMacro` after `quotas` is not null
  (before the parts are carved) and in `carveFlatSet` after `sizes` is not null; `piece` events only for the regions
  of the successful carve (a discarded partition or a failed plan emits no `piece` event). With the macro and the
  flat carve both tried, their events follow in that order.
- The `start` event is emitted in `puzzleCandidate` before the walk; the `retile` events by `lnsWalk`, one per step.
  A candidate that fails the layout-key check has emitted only these events.
- The calibration's clue events (MP14a) follow the `piece` events of a successful set attempt, with `source:
  'calibration'`.
- Poses in `layout` are copied field by field (`{ piece, x, y, turn, mirrored }`); `parts` and `cells` are fresh
  arrays. Nothing delivered is mutated afterwards.

### Identity (RES-28 "Must")

Recorder off and on give identical sets, layouts, puzzles and RNG draws. The recorders draw nothing from an RNG,
never touch a workspace and never change a loop's control flow; generation with 1 and 4 workers is unaffected
(workers never receive a recorder).

## Files to create/modify

| File | Change |
|---|---|
| `core/engine/generate.js` | `observe` on `setAttempt` and `puzzleCandidate`; `count` and `start` events; passing the observer |
| `core/engine/carve.js` | `record` on `carveMacro` and `carveFlatSet`; `carve` and `piece` events |
| `core/engine/tiling.js` | `record` on `lnsWalk`; `retile` events |
| `core/engine/types.js` | set and layout event typedefs; `RecordEvent` |
| `tests/replay-recorders.test.js` | cases 1–8 |
| `docs/design-detail.md` | §6.5 and §6.7 |

Exclusive ownership while this task runs: the files above. `core/engine/clues.js` and `difficulty.js` are MP14a's
(report a needed change instead of making it).

### Documentation slot

- §6.5 "Piece-set generation" (line 1105): the `count`, `carve` and `piece` events and the calibration's clue events.
- §6.7 "Local re-tiling (LNS) and random tilings" (line 1266): the `start` and `retile` events.

## Implementation steps

1. `carve.js` and `tiling.js`: the `record` parameters and events.
2. `generate.js`: `observe`; `count`; `start`; passing `record`, `recordSource` and `replaySkips`.
3. Types; tests; documents; the test plan.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP14b-B01 | Every step before the clues is reported: the piece count, each carving attempt, the accepted pieces, the walk's start and each re-tiling | cases 1–4 |
| MP14b-B02 | Watching generation never changes the piece set, the layout or the puzzle | cases 5, 6 |
| MP14b-B03 | A candidate made with a history can be replayed without that history and gives the same puzzle | case 7 |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP14b-T01 | Event shapes and order exactly as listed; `piece` events only for the successful carve; their cells are the set's pieces | cases 1, 2 |
| MP14b-T02 | `start` and `retile` events: one `retile` per step, valid complete layouts, the last equals the candidate's layout | cases 3, 4 |
| MP14b-T03 | `setAttempt`, `puzzleCandidate` and `runFold` results are deep-equal with and without `record` | cases 5, 6 |
| MP14b-T04 | `replaySkips` through `puzzleCandidate` reproduces a candidate made with excluded keys | case 7 |
| MP14b-T05 | Events are plain JSON and not mutated after delivery | case 8 |
| MP14b-T06 | `observe.charge` reaches every `selectClues` call of `setAttempt` (calibration included, with or without `record`) and of `puzzleCandidate`; carving and the walk are not charged; a throwing `charge` propagates; results are unchanged | case 9 |

## Test plan

### Exact commands

```powershell
. tests\artifacts\MP14b\dv3-lock.ps1
$r = Invoke-Dv3Timed -Task 'MP14b targeted tests' -NodeArgs @('--test', '--test-skip-pattern=slow',
  'tests/replay-recorders.test.js', 'tests/generate.test.js', 'tests/carve.test.js', 'tests/tiling.test.js')
if ($r.Exit -ne 0) { throw 'targeted tests failed' }
$r = Invoke-Dv3Timed -Task 'MP14b quick set' -NodeArgs @('--test', '--test-skip-pattern=slow', 'tests/**/*.test.js')
if ($r.Exit -ne 0) { throw 'quick tests failed' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'check failed' }
```


### Required test cases (`tests/replay-recorders.test.js`; the recipe of `tests/fixtures/generation-case.json`)

1. `setAttempt` on the recipe request at its winning attempt (`firstSetAttempt(...).result.attempt`) with `record`:
   the first event is `count` with `range` deep-equal to `pieceCountRange('hard', 60)` and `k` equal to the set's
   piece count; then one or more `carve` events (mode `'macro'` with `parts` covering every active cell exactly once,
   or `'flat'` with `parts: null`); then exactly K `piece` events whose cell sets equal, as a multiset of sorted
   cell lists, the cells of the set's witness poses; then the calibration's clue events with `source:
   'calibration'`, the last being `selected` when the calibration succeeded.
2. A macro attempt that discards a partition (use `carveMacro` with a `beforePart` hook that returns false for the first
   partition, as `tests/carve.test.js` does near line 253): the discarded partition has a `carve` event and no `piece`
   event; the `piece` events belong to the accepted partition only.
3. `puzzleCandidate(ctx, 1, 0, { record })`: the events start with `start` (`start: 'witness'`, `layout` deep-equal
   to the set's witness), then `BUDGETS.lnsSteps` `retile` events with `step` 0, 1, …, each `layout` a complete
   valid layout (`isValidLayout`), `liftedIds` non-empty, and the last `layout` deep-equal to the candidate's
   `layout`; then the clue events of MP14a with `source: 'candidate'`, ending with `selected`.
4. `puzzleCandidate(ctx, 1, 2, { record })` on the recipe: the `start` event has `start` equal to the candidate's
   `made.start`.
5. Identity: `setAttempt` and `puzzleCandidate` (attempts 0 and 2 of slots 1 and 2) give deep-equal results with and
   without `record`.
6. Fold identity: `runFold(ctx, (c, s, a) => puzzleCandidate(c, s, a, { record: collect }))` gives a fold state whose
   `accepted` list deep-equals that of `runFold(ctx)`, and `RECIPE.expected` is still reproduced.
7. Skips replayed through `puzzleCandidate`: compute a candidate with `ctx.seenClues` holding the clue key of an
   earlier candidate's rated subset so that its `made.skips.subsets` is not empty (search slots 1-3 and attempts
   0-11 of the recipe for one; if none is found, build the history from MP13a's oracle approach and say so in the
   reply); then `puzzleCandidate({ ...ctx, seenClues: new Set(), seenLayouts: new Set() }, slot, attempt, {
   replaySkips: made.skips })` returns a candidate deep-equal to the original.
8. Plain JSON: every set and layout event survives `structuredClone` and a JSON round trip deep-equal, and its JSON
   at delivery equals its JSON after the call.
9. The work meter passes through (cross-review SP09): `setAttempt` on the recipe request at its winning attempt with
   `{ charge }` only (no `record`) calls `charge` at least once per rating of the calibration (the calibration's
   `selectClues` is metered without a recorder), and with `{ record, charge }` the `charge` calls come before the
   calibration's first clue event and none comes between `count`, `carve` and `piece` events (carving is not
   charged); `puzzleCandidate(ctx, 1, 0, { charge })` calls `charge` and its result deep-equals the call without it;
   a `charge` that throws a fresh error on its first call makes `setAttempt` throw exactly that error.

The existing real-engine client tests at pool widths 1 and 4 must pass unchanged (no task or protocol change).

## Definition of done & handoff

- Every criterion has its evidence; the reply lists the signatures, one example of each event kind and the test
  counts.
- Handoff to MP15a1: `setAttempt(req, attempt, { record, charge })` gives stages 1-3 (`count`, `carve`, `piece`, then
  the calibration's clue events) and meters the calibration; `puzzleCandidate(ctx, slot, attempt, { record,
  replaySkips, charge })` gives stages 4-6 (`start`, `retile`, the clue and repair events, `selected`); MP14a's
  `SkipReplayError` signals a skip mismatch.

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
