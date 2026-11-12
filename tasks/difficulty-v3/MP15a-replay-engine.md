# MP15a — Replay engine

| Header | Value |
|---|---|
| ID | MP15a (first part of the report's MP15; MP15b adds the worker task, the protocol and the client) |
| Depends on | MP14b (accepted and committed: the recorders, `observe` on `setAttempt` and `puzzleCandidate`, `replaySkips`, `SkipReplayError`, `rateDetailed`); MP13b's fixture `tests/fixtures/replay-case.json` |
| Estimated size | Large: about 800–1,000 changed lines (`replay.js` about 400, `policy.js` about 10, tests about 400, documents about 60); about 60 minutes |
| Owner role | Engine |
| Milestone | M9 — Generation Steps |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-29 (replay engine, final comparison, `Step`, bounds), RES-27 (stage availability), RES-30 (score tables: the data the steps carry), RES-28 (events); clarification SA2-Q-P10 (a) (plan author); check-list §4.2 D12, D33 |
| Gates owned | none |
| Implementation status | Not started |

## Goal & business context

This task builds the engine that re-runs the generation of one puzzle and turns the recorded events into a list of
steps the Generator's dialog can play (MP16a): the piece count, the carving, the pieces, the layout walk, every rated
clue set, the repairs and the final puzzle, each with its board state and score data. It also decides honestly what
the replay proves: `matched` only when the whole trace was replayed and the final puzzle equals the stored one
exactly; `unavailable` when the record or the versions do not allow a replay ("steps not available for this
puzzle", SA2-Q-P10 (a)); `mismatch` when the replay disagrees; `incomplete` when a bound stopped it. A partial trace
is never presented as the verified generated puzzle.

## Scope

### In scope

- `core/engine/replay.js` (new): `replayPuzzle(input, workspaces, limits = REPLAY, isCancelled)`,
  `ReplayCancelledError`, the `Step` and `ReplayResult` typedefs.
- `core/engine/policy.js`: `REPLAY`; `tests/policy.test.js`: its pin.
- `tools/bench/report.js`: the `SOURCE_FILES` entry for `core/engine/replay.js` (D12;
  `tests/benchmark-report.test.js:281-283` requires every engine module there).
- Tests: `tests/replay.test.js` (new).
- Documents: `docs/design-detail.md` new §6.12 "Generation Steps (replay)", §4.2 (the `replay.js` and `policy.js`
  blocks), §13.2 (a `replay` row).

### Out of scope

- The worker task, the protocol, the client and the auxiliary path (MP15b); the dialog (MP16a, MP16b).
- Any change to generation, rating or the recorders (report a needed change instead).

## Repository rules

- Read `AGENTS.md` and `tasks/difficulty-v3/check-list.md` §3 first.
- `replay.js` is an engine module: `// @ts-check`, JSDoc, no DOM, storage, clock or randomness; it must not contain
  the words `LIMITS`, `QUALIFICATION`, `enabledMaxActive` or `deriveLimits`, not even in a comment
  (`tests/bq-limits.test.js:116-122`).
- Run only the commands of the test plan; no gate. Never stage, commit, stash, reset, push or switch branches; never
  edit `tasks/difficulty-v3/`, the reports or `docs/difficulty-v3/`.
- UTF-8 without BOM, CRLF, final newline, no trailing whitespace.

## Inputs & context

### What earlier tasks provide

- `setAttempt(req, attempt, { record })` → `{ ok: true, set, calibration, attempt }` or `{ ok: false, reason }`;
  events `count`, `carve`, `piece`, then the calibration's clue and repair events with `source: 'calibration'`.
- `puzzleCandidate(ctx, slot, attempt, { record, replaySkips })` → a `PuzzleCandidate` (`layout`, `layoutKey`,
  `clueKey`, `clues`, `rating`, `certificate`, `made`) or `{ fail }`; events `start`, `retile`, the clue events
  (`rated`, `skip`, `unrateable`, `rejected`), the `repair` events (D31) and `selected`; throws `SkipReplayError`
  (`code 'replay-skips'`) when a recorded skip is unreachable or unused.
- `readProvenance(generation, puzzleIds)` → `{ setOrigin, made, problems }` and `provenanceProblem` (`pack.js`);
  `provenanceVersions()` (`generate.js`); `breakdownV3(m)` → `{ base, rule, guess, penalty, unrounded, score }`
  (`difficulty.js`); `poseCells(piece, pose)` (`geometry.js`); `canonicalKey(cells)` (`geometry.js`);
  `countRowLimit(board)` (`clues.js`); `level(id)` (`levels.js`).
- Rated, rejected and repair events carry `detail` (`RatingDetail`, with `detail.search.work` including the census)
  when the rating was real; `rating` objects are plain JSON.

### Contract (RES-29)

```js
/**
 * @param {{ set: PieceSet, puzzle: PackPuzzle | Puzzle, generation: unknown }} input The set (board, pieces, witness,
 *   carving, macroRegion), the stored puzzle and the pack's `generation` object (or `{ setOrigin, made }`).
 * @param {{ ws: Workspace, scratch: Workspace }} workspaces Main and scratch workspaces, as generation uses them.
 * @param {{ maxSteps: number, maxBytes: number, work: number }} [limits]
 * @param {() => boolean} [isCancelled] Checked at every event; true throws ReplayCancelledError.
 * @returns {ReplayResult}
 */
export function replayPuzzle(input, workspaces, limits = REPLAY, isCancelled = () => false)
```

```text
ReplayResult = { status: 'matched' | 'unavailable' | 'mismatch' | 'incomplete', reason: string | null,
                 stages: { set: StageState, candidate: StageState | 'calibration', final: 'compared' | 'not-compared' },
                 compared: string[], steps: Step[] }
StageState   = 'replayed' | 'unavailable' | 'mismatch'
Step         = { stage, kind, board: { placed, lifted, clues }, rating, breakdown, detail, band, note, args }
```

`REPLAY` in `core/engine/policy.js` (provisional test defaults, RES-01; this task measures them on the fixture):

```js
/** Bounds of one Generation Steps replay (RES-29): steps, serialized bytes of the steps, total work. */
export const REPLAY = Object.freeze({
  maxSteps: 4096,
  maxBytes: 4 * 1048576,
  // At most what generation itself may spend on one puzzle: 64 profile and 64 repair ratings for the set calibration
  // and as many again for the candidate, each within DEDUCE.work plus its census budget.
  work: 256 * (DEDUCE.work + DEDUCE.census),
});
```

`REPLAY` is replay-only: it changes no rating or generated puzzle.

### Algorithm

```text
replayPuzzle(input, ws, limits, isCancelled):
  { set, puzzle, generation } = input
  prov = readProvenance(generation, new Set([puzzle.id]))
  origin = prov.setOrigin; made = prov.made[puzzle.id] ?? null
  running = provenanceVersions()

  // preflight, no expensive work
  setState  = origin === null ? unavailable('no-set-origin')
            : !sameVersions(origin.versions, running) ? unavailable('set-versions') : 'to-run'
  candState = made === null ? unavailable(recordProblem ? 'record-invalid' : 'no-record')
            : made.kind === 'completion' ? unavailable('completion')
            : made.kind === 'calibration' ? (setState === 'to-run' ? 'calibration' : unavailable('calibration-needs-set'))
            : made.skips === 'overflow' ? unavailable('overflow')
            : !sameVersions(made.versions, running) ? unavailable('record-versions') : 'to-run'
      (recordProblem: prov.problems has an entry for generation.made.<puzzle.id>)

  events = []; work = 0; stopped = null
  record(event): if isCancelled(): throw new ReplayCancelledError()
                 if event.source === 'calibration' and made?.kind !== 'calibration': return    // dropped (below)
                 work += 1 + (event.detail?.search.work ?? 0) + (event.kind === 'repair' ? countRowLimit(set.board) : 0)
                 if work > limits.work: stopped = 'work'; throw STOP
                 if events.length + 1 >= limits.maxSteps: stopped = 'steps'; throw STOP       // one step stays for the final
                 events.push(event)
  (STOP is a private sentinel error caught below; it never escapes replayPuzzle)

  // stages 1-3 (and the calibration's clue stages)
  if setState === 'to-run':
     r = setAttempt({ board: set.board, rotation: 0, levelId: origin.level, seedText: origin.seed,
                      uniqueness: origin.uniqueness, execution: { main: ws.ws, scratch: ws.scratch } },
                    origin.attempt, { record })
     setState = r.ok && sameSet(r.set, set) ? 'replayed' : 'mismatch' (reason 'set')
  // stages 4-6
  if candState === 'to-run':
     c = puzzleCandidate({ set: setState === 'replayed' ? r.set : set, targetLevelId: made.targetLevel,
                           quantity: 1, batchSeed: made.batchSeed, uniqueness: made.uniqueness,
                           seenLayouts: new Set(), seenClues: new Set(), execution },
                         made.slot, made.attempt, { record, replaySkips: made.skips })
     SkipReplayError -> candState = 'mismatch' (reason 'skips');  'fail' in c -> 'mismatch' (reason 'candidate-failed')
     else candState = 'replayed'
  catch STOP -> status 'incomplete', reason stopped, no final comparison (stages.final 'not-compared', compared [])
  // final comparison (exact; RES-29 JC11) of the replayed result with the stored puzzle
  produced = candState === 'replayed' ? c : candState === 'calibration' ? r.calibration : null
  compared = []
  if setState === 'replayed': compare board, pieces, witness (witness only when the pack has one)
  if produced !== null: compare clues, rating, solution (solution only when the stored puzzle has one)
  status = stopped ? 'incomplete'
         : any mismatch ? 'mismatch'
         : setState === 'replayed' && (candState === 'replayed' || candState === 'calibration') ? 'matched'
         : 'unavailable'
  reason = stopped ?? the first reason in stage order (null for matched)
  // steps, built after the runs (so that piece ids and layouts are known)
  final = the final step (stage 7, always present): the stored puzzle and its stored claim
  steps = []; bytes = utf8Length(JSON.stringify(final))
  for each event in order: s = stepOf(event); b = utf8Length(JSON.stringify(s))
                           if bytes + b > limits.maxBytes: status 'incomplete', reason 'bytes' (when not already
                                                           incomplete), stop adding
                           steps.push(s); bytes += b
  steps.push(final)
```

- **The calibration's events**: `setAttempt` emits the calibration's clue and repair events after the `piece`
  events. Keep them (labelled by their `source: 'calibration'`) only when the puzzle's record is `calibration`;
  otherwise drop them (the record callback ignores events with `source === 'calibration'`), so a candidate puzzle's
  trace has no calibration clue stage. A calibration puzzle has no layout stage (RES-27).
- **Comparisons** (all exact; the field name is appended to `compared` when the comparison was made and passed; a
  failed comparison makes the status `mismatch` with that field as the reason):
  - `board`: `boardToRows(r.set.board)` equals `boardToRows(set.board)`;
  - `pieces`: same length, and for every index i the same `id` and `canonicalKey(cells)`;
  - `witness`: for every piece id, the cells (`poseCells`) of its witness pose are equal (poses may be written in a
    different but equivalent orientation index, so compare cells, not pose fields);
  - `clues`: the same piece ids and, per id, the same cells (the exact poses, not only the clue key);
  - `rating`: the stored claim and the replayed rating have the same `model`, `score`, `level`, `censored`
    (present or absent alike) and, when the claim has `metrics`, deep-equal metrics;
  - `solution`: per piece id, the same cells as the replayed layout (`c.layout`, or the calibration's `solution`).
  Without a stored witness or solution (an `omitSolutions` pack) those fields are not compared and not listed; such
  a pack can still be `matched` on the fields that were compared.
- `sameVersions(a, b)`: the five fields are equal.

### Steps (RES-29; D33 adds `detail`)

`Step = { stage, kind, board: { placed, lifted, clues }, rating, breakdown, detail, band, note, args }`, plain JSON,
no text:

| Event | `stage` | `board` | `rating`, `breakdown`, `detail`, `band` | `note` | `args` |
|---|---|---|---|---|---|
| `count` | 1 | empty | null | `replay.step.count` | `{ k, min, max }` (min and max of `range`) |
| `carve` | 2 | empty | null | `replay.step.carve` | `{ mode, parts }` (parts = the number of macro parts, 0 for flat) |
| `piece` | 3 | the accepted regions so far (`id` and `pose` = the piece of the replayed set whose witness pose covers exactly these cells and that pose; both null when the set run did not finish) | null | `replay.step.piece` | `{ n }` (1-based) |
| `start` | 4 | `placed` = the start layout | null | `replay.step.start` | `{ start }` |
| `retile` | 4 | `placed` = the layout after the step, `lifted` = `liftedIds` | null | `replay.step.retile` | `{ step, lifted, changed }` (`lifted` = count) |
| `rated` | 5 | `placed` = the candidate layout, `clues` = `clueIds` | the rating, its breakdown, the detail, the band | `replay.step.rated` | `{ sequence, phase, source }` |
| `skip` | 5 | `placed` = the candidate layout | null; band null | `replay.step.skip` | `{ sequence, source }` |
| `unrateable` | 5 | as `rated` | rating null, band | `replay.step.unrateable` | `{ sequence, phase, source, reason }` |
| `rejected` | 5 | as `rated` | as `rated` | `replay.step.rejected` | `{ sequence, phase, source, reason }` |
| `repair` | 6 | `clues` = the ids of the event's `clues` | as the event (null fields stay null) | `replay.step.repair` | `{ repairSequence, added, accepted, reason }` (`added` = `addedId`; `reason` null when absent) |
| `selected` | 5 | `clues` = the ids of the selected clues | null | `replay.step.selected` | `{ sequence, repairSequence, source }` |
| final | 7 | `placed` = the stored solution (or none), `clues` = the stored clue ids | the stored claim, its breakdown, `detail: null`, band of its level | `replay.step.final` | `{ status }` (the result's status) |

- `board.placed` is a list of `{ id: string | null, cells: [x, y][], pose: Pose | null }` (the pose copied field by
  field; the dialog draws items with a pose through the board view); `lifted` and `clues` are lists of piece ids.
  For the clue stages the candidate layout is the layout of the last `retile` (or `start`) event, and for a
  calibration puzzle the replayed set's witness. Steps are built after the stage runs, so every id is known; a
  bound that stopped a run leaves the events recorded so far, which become steps as far as known (ids null where the
  set run did not finish).
- The `replay.step.*` keys are exactly: `count`, `carve`, `piece`, `start`, `retile`, `rated`, `skip`, `unrateable`,
  `rejected`, `repair`, `selected`, `final`.
- `breakdown`: `breakdownV3(rating.metrics)` for a `difficulty-v3` rating with metrics; for a `difficulty-v2` claim
  with metrics, `{ model: 'difficulty-v2', u: 2 * U, b: 8 * Math.log10(1 + B), score }` (the frozen v2 terms, RES-30);
  otherwise null (a summary claim: the dialog shows the total only and labels the rest unavailable, never zero).
- `band`: `{ min, max | null }` from the event, or for the final step from `level(claim.level)` (null when the level
  is unknown).
- `note` is a locale key; the dialog (MP16a) owns the texts. `args` holds only numbers, strings, booleans and null.

### Errors

```js
export class ReplayCancelledError extends Error {
  constructor() {
    super('the replay was cancelled');
    this.name = 'ReplayCancelledError';
    this.code = 'cancelled';
  }
}
```

Input that is not a set, a puzzle and an object for `generation` throws `RangeError` (the worker maps it to
`invalid-payload` in MP15b). Every other engine error (`UnsatisfiableError`, `ModelError`, …) propagates.

## Files to create/modify

| File | Change |
|---|---|
| `core/engine/replay.js` | new |
| `core/engine/policy.js` | `REPLAY` |
| `tests/policy.test.js` | the `REPLAY` pin |
| `tools/bench/report.js` | one `SOURCE_FILES` entry |
| `tests/replay.test.js` | new: cases 1–14 |
| `docs/design-detail.md` | new §6.12; §4.2; §13.2 |

Exclusive ownership while this task runs: the files above.

### Documentation slot

- New §6.12 "Generation Steps (replay)" after §6.11 (line 1425 at HEAD): the record it needs (link §5.5), the seven
  stages and their events, stage availability, the statuses and reasons, the exact final comparison and `compared`,
  the bounds `REPLAY`, the step shape (note keys, no text), and that a partial trace is never `matched`.
- §4.2: a `replay.js` block; `REPLAY` in the `policy.js` block.
- §13.2: a `replay` row (the cases below in one line).

## Implementation steps

1. `REPLAY` and its pin; the `SOURCE_FILES` entry.
2. `replay.js`: input checks, preflight, the record callback with the bounds, the two stage runs, the comparisons,
   the steps, the result.
3. Tests on the fixture; the documents; the test plan. Record the bound measurements of case 13 in the reply.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP15a-B01 | A freshly generated puzzle can be replayed from its record, step by step, and the replay confirms it exactly | cases 1, 2 |
| MP15a-B02 | When the record or the code versions do not allow a replay, the result says so ("steps not available") and shows the stored puzzle; it never pretends | cases 3, 9, 10 |
| MP15a-B03 | A replay that disagrees with the stored puzzle is reported as a mismatch, naming what differs | cases 4, 5, 9 |
| MP15a-B04 | A replay cannot run away: steps, bytes and work are bounded and the result says it is incomplete | cases 7, 8 |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP15a-T01 | Preflight before any stage run; statuses and reasons as specified; `matched` only for a full trace with passing comparisons | cases 1, 3, 9, 10 |
| MP15a-T02 | Exact comparisons and `compared` as specified, including packs without solutions | cases 4–6 |
| MP15a-T03 | Bounds: `incomplete` with reason `steps`, `bytes` or `work` and the steps so far; cancellation throws `ReplayCancelledError` | cases 7, 8 |
| MP15a-T04 | Steps follow the table; plain JSON (`structuredClone` and JSON round trip equal); deterministic | cases 2, 11, 12 |
| MP15a-T05 | `REPLAY` pinned; `replay.js` in `SOURCE_FILES`; the engine guards pass | `tests/policy.test.js`, `tests/benchmark-report.test.js`, `tests/bq-limits.test.js` |

## Test plan

### Exact commands

```powershell
node --test --test-skip-pattern=slow tests/replay.test.js tests/policy.test.js tests/benchmark-report.test.js tests/bq-limits.test.js
if ($LASTEXITCODE -ne 0) { throw 'targeted tests failed' }
npm run test:quick
if ($LASTEXITCODE -ne 0) { throw 'quick tests failed' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'check failed' }
```

`tests/replay.test.js` must finish within 2 minutes on this machine (it replays the fixture's eight puzzles once and
small variants); report its duration. Build the inputs from `tests/fixtures/replay-case.json` with `validatePack`
(the set from the pack's board, pieces, witness and its `generation.carving` and `generation.macroRegion`, as the
Generator's `setFromPack` does in `generator/state.js`), and fresh workspaces (`createWorkspace(MAIN_WORKSPACE_BYTES)`
and `createWorkspace(SCRATCH_WORKSPACE_BYTES)`).

### Required test cases (`tests/replay.test.js`)

1. Every puzzle of both fixture packs replays `matched` with `reason: null`, `stages.set === 'replayed'`,
   `stages.final === 'compared'`, `compared` = `['board', 'pieces', 'witness', 'clues', 'rating', 'solution']`; the
   reused calibration has `stages.candidate === 'calibration'` and no stage-4 step; the others `'replayed'`.
2. Steps: the first step is `count`; stages never decrease along the list except that a calibration puzzle's clue
   steps follow its piece steps; the last step is the final (stage 7) with `board.clues` equal to the puzzle's clue
   ids and `rating` equal to its claim; the step before it is `selected` (candidate) and the `rated` steps carry a
   breakdown whose `score` equals their rating's score.
3. Version mismatch: changing `setOrigin.versions.algo` gives `stages.set === 'unavailable'` (reason
   `'set-versions'`); also changing the record's `versions.policy` gives `status: 'unavailable'` with only the final
   step, and no stage run (assert the call returns within a small fraction of a normal replay's time, or spy that
   `setAttempt` is not reached by passing `isCancelled` that throws when called).
4. A stored rating claim with `score + 1` gives `mismatch`, reason `'rating'`; a stored clue moved to another valid
   pose of the same piece (from another fixture puzzle's solution) gives `'clues'`. Build these modified inputs
   directly, not through the pack reader (which would refuse a clue that is not in the solution); do not use a
   tampered attempt as a mismatch fixture: it can reproduce the same puzzle.
5. Stored-solution mismatch: the solution replaced by another valid complete layout of the set (another puzzle's
   solution of the same pack) gives `mismatch`, reason `'solution'`.
6. A pack without solutions (`serializePack(pack, { omitSolutions: true })` read back): `matched` with `compared` =
   `['board', 'pieces', 'clues', 'rating']`.
7. Work bound: `limits.work` = 1,000 gives `incomplete`, reason `'work'`, fewer steps than case 1 and no final
   comparison (`stages.final === 'not-compared'`, `compared` empty).
8. Step and byte bounds: `maxSteps` = 10 gives `incomplete` `'steps'` with exactly 10 steps, the last being the final
   step; `maxBytes` = 4,000 gives `incomplete` `'bytes'` with steps whose JSON totals at most 4,000 bytes, the last
   being the final step; `isCancelled` returning true from the 5th event on throws `ReplayCancelledError`.
9. Malformed record: unsorted `skips.subsets` gives `unavailable`, reason `'record-invalid'`; a valid but unused extra
   subset ordinal (strictly above the last one executed, below 2,128) gives `mismatch`, reason `'skips'`.
10. A `completion` record gives `unavailable`, reason `'completion'`, with the stage 1-3 steps present; a pack
    without `setOrigin` gives `stages.set === 'unavailable'` (`'no-set-origin'`) while stages 4-6 still replay and
    compare (`compared` without board, pieces and witness), and the status is `unavailable`, never `matched`.
11. Plain JSON: `structuredClone(result)` and `JSON.parse(JSON.stringify(result))` deep-equal `result`; no step
    contains a function, a typed array or `undefined`.
12. Determinism: two replays of the same puzzle give deep-equal results.
13. Measurements for the provisional bounds (record in the reply, not asserted): for each fixture puzzle the number of
    steps, the step bytes and the work of the replay; the largest of each as a share of `REPLAY`.
14. Input errors: a missing `puzzle` or a `set` without pieces throws `RangeError`.

## Definition of done & handoff

- Every criterion has its evidence; the reply gives the exports, the measurements of case 13 and the test counts.
- Handoff to MP15b: `replayPuzzle(input, { ws, scratch }, REPLAY)` returns a structured-clone-safe `ReplayResult`;
  `RangeError` for malformed input; `ReplayCancelledError`. To MP16a: the step table (stages, kinds, note keys,
  args), the statuses and reasons.

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
