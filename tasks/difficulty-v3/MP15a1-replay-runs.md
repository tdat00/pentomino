# MP15a1 — Replay runs: preflight, the stage runs, the work meter, the bounds and the final comparison

| Header | Value |
|---|---|
| ID | MP15a1 (first part of the report's MP15a, split after cross-review SP08-SP10; MP15a2 turns the run into steps; MP15b adds the worker task, the protocol and the client) |
| Depends on | MP14b (accepted and committed: the recorders, `observe` with `record`, `replaySkips` and `charge` on `setAttempt` and `puzzleCandidate`, `SkipReplayError`, `rateDetailed`); MP13b's fixture `tests/fixtures/replay-case.json` |
| Estimated size | Large: about 700–850 changed lines (`replay.js` about 300, `policy.js` about 10, tests about 400, documents about 50); about 60 minutes |
| Owner role | Engine |
| Milestone | M9 — Generation Steps |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-29 (replay engine, final comparison, bounds), RES-27 (stage availability), RES-28 (events); clarification SA2-Q-P10 (a) (plan author); check-list §4.2 D12, D33; cross-review SP08, SP09, SP10, SP13 (`docs/difficulty-v3/gpt-6-astra/6-review-of-task-pack.md`, second pass) |
| Gates owned | none |
| Implementation status | Not started |

## Goal & business context

Generation Steps (MP16a, MP16b) lets a user watch how a puzzle was made. This task builds the part of the engine
that re-runs the generation of one puzzle from its record, within bounds, and decides honestly what the replay
proves: `matched` only when the whole trace was replayed and the final puzzle equals the stored one exactly;
`unavailable` when the record or the versions do not allow a replay ("steps not available for this puzzle",
SA2-Q-P10 (a)); `mismatch` when the replay disagrees; `incomplete` when a bound stopped it. A partial trace is never
presented as the verified generated puzzle. MP15a2 turns the recorded events of a run into the steps the dialog
plays.

## Scope

### In scope

- `core/engine/replay.js` (new): `ReplayCancelledError`; `runReplay(input, workspaces, limits = REPLAY, isCancelled,
  reserveBytes)` returning a `ReplayRun`; the `ReplayRun` and `StageState` typedefs; private helpers.
- `core/engine/policy.js`: `REPLAY`; `tests/policy.test.js`: its pin.
- `tools/bench/report.js`: the `SOURCE_FILES` entry for `core/engine/replay.js` (D12;
  `tests/benchmark-report.test.js:281-283` requires every engine module there).
- Tests: `tests/replay.test.js` (new): the run cases below.
- Documents: `docs/design-detail.md` new §6.12 "Generation Steps (replay)" (its first part), §4.2 (the `replay.js`
  and `policy.js` blocks), §13.2 (a `replay` row).

### Out of scope

- The steps: `replayPuzzle`, the step table, the final step, breakdowns and the byte bound on steps (MP15a2).
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

- `setAttempt(req, attempt, { record, charge })` → `{ ok: true, set, calibration, attempt }` or `{ ok: false, reason
  }`; events `count`, `carve`, `piece`, then the calibration's clue and repair events with `source: 'calibration'`;
  `charge` meters every rating and uniqueness count of the calibration (MP14a, MP14b).
- `puzzleCandidate(ctx, slot, attempt, { record, replaySkips, charge })` → a `PuzzleCandidate` (`layout`,
  `layoutKey`, `clueKey`, `clues`, `rating`, `certificate`, `made`) or `{ fail }`; events `start`, `retile`, the clue
  events (`rated`, `skip`, `unrateable`, `rejected`), the `repair` events (D31) and `selected`; throws
  `SkipReplayError` (`code 'replay-skips'`) when a recorded skip is unreachable or unused.
- The meter (MP14a, "The work meter"): `charge(units)` is called once per rating attempt (`metrics.work`, census
  included, or `counters.work` of a capped rating) and once per uniqueness count (its row trials), before the event
  of that rating or finish; a throwing `charge` propagates unchanged through `selectClues`, `setAttempt` and
  `puzzleCandidate` (none of them catches it).
- `readProvenance(generation, puzzleIds)` → `{ setOrigin, made, problems }` (`pack.js`, MP13a; problems have `path`
  `generation.setOrigin`, `generation.made` (the whole map) or `generation.made.<id>`); `provenanceVersions()`
  (`generate.js`); `poseCells(piece, pose)` and `canonicalKey(cells)` (`geometry.js`); `boardToRows` (`board.js`).
- Rated, rejected and repair events carry `detail` (`RatingDetail`) when the rating was real; `rating` objects are
  plain JSON.

### Contract

```js
/**
 * Re-runs the generation of one puzzle from its record (RES-29) and compares the result with the stored puzzle.
 * replayPuzzle (MP15a2) wraps it and turns `events` into steps; tests call it directly.
 * @param {{ set: PieceSet, puzzle: PackPuzzle | Puzzle, generation: unknown }} input The set (board, pieces, witness,
 *   carving, macroRegion), the stored puzzle and the pack's whole `generation` object (or `{ setOrigin, made }`).
 * @param {{ ws: Workspace, scratch: Workspace }} workspaces Main and scratch workspaces, as generation uses them.
 * @param {{ maxSteps: number, maxBytes: number, work: number }} [limits]
 * @param {() => boolean} [isCancelled] Checked at every metered unit; true throws ReplayCancelledError.
 * @param {number} [reserveBytes] Bytes kept free for MP15a2's final step and the brackets of its steps array; default 0.
 * @returns {ReplayRun}
 */
export function runReplay(input, workspaces, limits = REPLAY, isCancelled = () => false, reserveBytes = 0)
```

```text
ReplayRun  = { status: 'matched' | 'unavailable' | 'mismatch' | 'incomplete', reason: string | null,
               stages: { set: StageState, candidate: StageState | 'calibration', final: 'compared' | 'not-compared' },
               compared: string[], work: number, events: RecordEvent[], set: PieceSet | null }
StageState = 'replayed' | 'unavailable' | 'mismatch' | 'stopped'
```

- `stopped` (cross-review SP10): a bound stopped the replay while this stage was running or before it could run. No
  other internal state (such as "to run") is ever returned.
- `set` (cross-review TP09): the engine's `PieceSet` of the replayed set (or null), kept as it is for MP15a2. It is not
  plain JSON: its `board.active` is a `Uint8Array` (`core/engine/types.js:22`, `core/engine/board.js:63`). Every other
  field of the run, and every event, is plain JSON. Do not change the board representation; the public
  `ReplayResult` of MP15a2 and MP15b carries no `PieceSet` and is plain JSON as a whole.
- `work`: the metered total (below), including the units that crossed the bound; MP15a2 and the measurements of case
  16 read it.
- `events`: the retained events in order (calibration events of a candidate puzzle are dropped, below); `set`: the
  replayed set (`setAttempt(...).set`), null when the set stage did not run or the attempt failed. MP15a2 needs both
  and does not return them.

`REPLAY` in `core/engine/policy.js` (provisional test defaults, RES-01; MP15a1 and MP15a2 measure them on the
fixture):

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

### Input, limits and the provenance projection

- Input that is not a set, a puzzle and an object for `generation` throws `RangeError` (the worker maps it to
  `invalid-payload` in MP15b).
- Limits (cross-review SP10): `limits` is an object whose `maxSteps` and `maxBytes` are safe integers of at least 1
  and whose `work` is a safe integer of at least 0, and `reserveBytes` is a safe integer from 0 to `limits.maxBytes`;
  otherwise `RangeError('invalid replay limits')`. Both checks come before any other work (no stage runs, `isCancelled`
  is not called).
- The requested puzzle's own record (cross-review SP08). A pack's `generation.made` has one entry per puzzle, and
  MP13a's `readProvenance` treats a map with more keys than `puzzleIds` as invalid as a whole. The replay therefore
  projects the puzzle's own entry before reading, so that the whole pack's `generation` (four records in the fixture)
  and the one-entry form of MP15b's worker payload give the same result:

  ```text
  ownProvenance(generation, id):           // generation: a non-null object (checked above)
    out = {}
    if Object.hasOwn(generation, 'setOrigin'): out.setOrigin = generation.setOrigin
    if Object.hasOwn(generation, 'made'):
      m = generation.made
      if m is a plain object (not null, not an array, prototype Object.prototype or null):
        if Object.hasOwn(m, id): out.made = { [id]: m[id] }       // the entry itself, not a copy: readProvenance copies
      else: out.made = m                                          // not a map: kept, so readProvenance reports it
    return out
  prov = readProvenance(ownProvenance(generation, puzzle.id), new Set([puzzle.id]))
  recordProblem = prov.problems.some((p) => p.path === 'generation.made' || p.path === `generation.made.${puzzle.id}`)
  ```

  This is O(1) in the number of puzzles, keeps `readProvenance`'s checks of this entry and of `setOrigin`, and never
  reads another puzzle's record. Whole-pack validation stays where it is (the pack reader, MP13a).

### Algorithm

```text
runReplay(input, ws, limits, isCancelled, reserveBytes):
  check input and limits (RangeError, above)
  { set, puzzle, generation } = input
  prov, recordProblem as above; origin = prov.setOrigin; made = prov.made[puzzle.id] ?? null
  running = provenanceVersions()

  // preflight, no expensive work
  setState  = origin === null ? unavailable('no-set-origin')
            : !sameVersions(origin.versions, running) ? unavailable('set-versions') : 'to-run'
  candState = made === null ? unavailable(recordProblem ? 'record-invalid' : 'no-record')
            : made.kind === 'completion' ? unavailable('completion')
            : made.kind === 'calibration' ? (setState === 'to-run' ? 'calibration' : unavailable('calibration-needs-set'))
            : made.skips === 'overflow' ? unavailable('overflow')
            : !sameVersions(made.versions, running) ? unavailable('record-versions') : 'to-run'
  ('to-run' is internal only; it never leaves this function)

  events = []; retained = 0; work = 0; stopped = null; STOP = a fresh private object
  tick(units):   if isCancelled(): throw new ReplayCancelledError()
                 work += units
                 if work > limits.work: stopped = 'work'; throw STOP
  charge(units): tick(units)                                  // ratings and uniqueness counts (MP14a)
  record(event): tick(1)                                      // one unit per recorder event, every event (RES-29)
                 if event.source === 'calibration' and made?.kind !== 'calibration': return   // dropped after metering
                 if events.length + 1 >= limits.maxSteps: stopped = 'steps'; throw STOP      // one step stays for the final
                 next = retained + utf8Length(JSON.stringify(event)) + (events.length === 0 ? 2 : 1)
                        // the events as one JSON array: its brackets once, a comma before every event but the first,
                        // so retained === utf8Length(JSON.stringify(events)) (cross-review TP10)
                 if next + reserveBytes > limits.maxBytes: stopped = 'bytes'; throw STOP
                 retained = next; events.push(event)

  replayedSet = null
  try:
    // stages 1-3 (and the calibration's clue stages)
    if setState === 'to-run':
      r = setAttempt({ board: set.board, rotation: 0, levelId: origin.level, seedText: origin.seed,
                       uniqueness: origin.uniqueness, execution: { main: ws.ws, scratch: ws.scratch } },
                     origin.attempt, { record, charge })
      if r.ok: setState = 'replayed'; replayedSet = r.set
      else:    setState = mismatch('set')
    // stages 4-6
    if candState === 'to-run':
      try:
        c = puzzleCandidate({ set: replayedSet ?? set, targetLevelId: made.targetLevel, quantity: 1,
                              batchSeed: made.batchSeed, uniqueness: made.uniqueness, seenLayouts: new Set(),
                              seenClues: new Set(), execution: { main: ws.ws, scratch: ws.scratch } },
                            made.slot, made.attempt, { record, replaySkips: made.skips, charge })
        candState = 'fail' in c ? mismatch('candidate-failed') : 'replayed'
      catch e: if e instanceof SkipReplayError: candState = mismatch('skips') else throw e
  catch e:
    if e !== STOP: throw e                                    // ReplayCancelledError and engine errors propagate
    setState  = setState === 'to-run' ? 'stopped' : setState
    candState = candState === 'to-run' || candState === 'calibration' ? 'stopped' : candState
    return { status: 'incomplete', reason: stopped, stages: { set: setState, candidate: candState,
             final: 'not-compared' }, compared: [], work, events, set: replayedSet }

  // final comparison (exact; RES-29 JC11) of the replayed result with the stored puzzle
  produced = candState === 'replayed' ? c
           : candState === 'calibration' && setState === 'replayed' ? r.calibration : null
  compare the fields below in this order: board, pieces, witness (only when setState === 'replayed'), then clues,
    rating, solution (only when produced !== null)
  status = any mismatch (a stage or a field) ? 'mismatch'
         : setState === 'replayed' && (candState === 'replayed' || candState === 'calibration') ? 'matched'
         : 'unavailable'
  reason = matched: null; mismatch: the first failing item in the order set, board, pieces, witness, skips,
           candidate-failed, clues, rating, solution; unavailable: the set stage's reason when it is unavailable,
           else the candidate stage's
  stages.final = at least one field was compared (passed or failed) ? 'compared' : 'not-compared'
  return { status, reason, stages, compared, work, events, set: replayedSet }
```

- **The calibration's events**: `setAttempt` emits the calibration's clue and repair events after the `piece`
  events. Keep them (labelled by their `source: 'calibration'`) only when the puzzle's record is `calibration`;
  otherwise drop them, **after** metering them (cross-review SP09: the hidden calibration's work and events count
  toward `limits.work`), so a candidate puzzle's trace has no calibration clue stage. A calibration puzzle has no
  layout stage (RES-27).
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
- `utf8Length(text)`: the UTF-8 byte length (`new TextEncoder().encode(text).length`, or an equivalent count); the
  same function MP15a2 uses for steps.

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

Every other engine error (`UnsatisfiableError`, `ModelError`, …) propagates. The private `STOP` object never leaves
`runReplay`.

## Files to create/modify

| File | Change |
|---|---|
| `core/engine/replay.js` | new: `ReplayCancelledError`, `runReplay`, the typedefs, private helpers |
| `core/engine/policy.js` | `REPLAY` |
| `tests/policy.test.js` | the `REPLAY` pin |
| `tools/bench/report.js` | one `SOURCE_FILES` entry |
| `tests/replay.test.js` | new: cases 1–16 |
| `docs/design-detail.md` | new §6.12 (first part); §4.2; §13.2 |

Exclusive ownership while this task runs: the files above.

### Documentation slot

- New §6.12 "Generation Steps (replay)" after §6.11 (line 1425 at HEAD `a80274b`; find "### 6.11"): the record it
  needs (link §5.5) and the projection of the puzzle's own record; the seven stages and their events; stage
  availability (preflight) and the stage states including `stopped`; the statuses and reasons; the exact final
  comparison and `compared`; the bounds `REPLAY` and the work meter (what counts: every rating's work, every
  uniqueness count, one per event, hidden calibration events included); that a partial trace is never `matched`. A
  sentence "Steps: see below (MP15a2)" is not needed: MP15a2 appends its part.
- §4.2: a `replay.js` block (`runReplay`, `ReplayCancelledError`); `REPLAY` in the `policy.js` block.
- §13.2: a `replay` row (the cases below in one line).

## Implementation steps

1. `REPLAY` and its pin; the `SOURCE_FILES` entry.
2. `replay.js`: input and limit checks, the projection, preflight, the meter and the record callback with the bounds,
   the two stage runs, the stop handling, the comparisons, the result.
3. Tests on the fixture; the documents; the test plan. Record the measurements of case 16 in the reply.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP15a1-B01 | A freshly generated puzzle can be replayed from its record, from an ordinary multi-puzzle pack as well as from a one-puzzle payload, and the replay confirms it exactly | cases 1, 11 |
| MP15a1-B02 | When the record or the code versions do not allow a replay, the result says so ("steps not available") without running anything expensive; it never pretends | cases 3, 9, 10 |
| MP15a1-B03 | A replay that disagrees with the stored puzzle is reported as a mismatch, naming what differs | cases 4, 5, 9 |
| MP15a1-B04 | A replay cannot run away: its steps, bytes and total work (hidden work included) are bounded, it says it is incomplete, and it can be cancelled | cases 7, 8 |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP15a1-T01 | Limits and input are checked before any work; preflight before any stage run; statuses and reasons as specified; `matched` only for a full run with passing comparisons | cases 1, 3, 9, 10, 12, 14 |
| MP15a1-T02 | Exact comparisons and `compared` as specified, including packs without solutions | cases 4–6 |
| MP15a1-T03 | The meter counts every charge and every event, hidden calibration events included, and checks the bound at each; `incomplete` with reason `steps`, `bytes` or `work`, only public stage states (`stopped`), no comparison; cancellation throws `ReplayCancelledError` | cases 7, 8 |
| MP15a1-T04 | The puzzle's own record is projected: the whole `generation` and the one-entry form give deep-equal runs; another puzzle's invalid record does not matter; a non-map `made` is `record-invalid` | case 11 |
| MP15a1-T05 | Events are in chronological order with the allowed stage-5/6 interleave; every field of the run except `set` (a `PieceSet`) is plain JSON, the whole run survives `structuredClone`, and the run is deterministic (TP09) | cases 2, 13, 15 |
| MP15a1-T06 | `REPLAY` pinned; `replay.js` in `SOURCE_FILES`; the engine guards pass | `tests/policy.test.js`, `tests/benchmark-report.test.js`, `tests/bq-limits.test.js` |

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

`tests/replay.test.js` must finish within 2 minutes on this machine (it replays the fixture's eight puzzles a few
times and small variants); report its duration, and name a test `slow: …` only if it alone takes more than 15
seconds. Build the inputs from `tests/fixtures/replay-case.json` with `validatePack` (the set from the pack's board,
pieces, witness and its `generation.carving` and `generation.macroRegion`, as the Generator's `setFromPack` does in
`generator/state.js`), the pack's whole `generation` object, and fresh workspaces
(`createWorkspace(MAIN_WORKSPACE_BYTES)` and `createWorkspace(SCRATCH_WORKSPACE_BYTES)`).

### Required test cases (`tests/replay.test.js`, on `runReplay`)

1. Every puzzle of both fixture packs, with the pack's whole `generation`: `matched` with `reason: null`,
   `stages.set === 'replayed'`, `stages.final === 'compared'`, `compared` = `['board', 'pieces', 'witness', 'clues',
   'rating', 'solution']`, `work > 0`, `set` not null; the reused calibration has `stages.candidate ===
   'calibration'`, the others `'replayed'`.
2. Event order (cross-review SP13): the first event is `count`, then one or more `carve`, then exactly K `piece`
   events; a candidate puzzle continues with `start`, `BUDGETS.lnsSteps` `retile` events, then its clue and repair
   events (`stage` `'clues'` and `'unique'` may interleave: a `repair` event can be followed by more `rated`
   events), ending with exactly one `selected`; no event has `source: 'calibration'`. The calibration puzzle has no
   `start` or `retile` event, its clue events all have `source: 'calibration'`, and it ends with `selected`. Do not
   sort events to test them: the order is the contract.
3. Version mismatch: changing `setOrigin.versions.algo` gives `stages.set === 'unavailable'` (reason
   `'set-versions'`); also changing the record's `versions.policy` gives `status: 'unavailable'`, no event and `work`
   0, and no stage run (pass an `isCancelled` that throws when called: it must not be reached).
4. A stored rating claim with `score + 1` gives `mismatch`, reason `'rating'`; a stored clue moved to another valid
   pose of the same piece (from another fixture puzzle's solution) gives `'clues'`. Build these modified inputs
   directly, not through the pack reader (which would refuse a clue that is not in the solution); do not use a
   tampered attempt as a mismatch fixture: it can reproduce the same puzzle.
5. Stored-solution mismatch: the solution replaced by another valid complete layout of the set (another puzzle's
   solution of the same pack) gives `mismatch`, reason `'solution'`.
6. A pack without solutions (`serializePack(pack, { omitSolutions: true })` read back): `matched` with `compared` =
   `['board', 'pieces', 'clues', 'rating']`.
7. Work bound and meter (cross-review SP09):
   - `limits.work` = 1,000 gives `incomplete`, reason `'work'`, fewer events than case 1, `stages.final ===
     'not-compared'`, `compared` empty, and `work > 1000`;
   - the boundary: for one candidate puzzle with full run `full`, `{ ...REPLAY, work: full.work }` is `matched` with
     `work === full.work`, and `{ ...REPLAY, work: full.work - 1 }` is `incomplete` `'work'`;
   - a stop inside the hidden calibration: for a candidate puzzle, `W` = the number of `count`, `carve` and `piece`
     events of `full`; `{ ...REPLAY, work: W }` gives `incomplete` `'work'`, `stages.set === 'stopped'` and
     `stages.candidate === 'stopped'`, only `count`, `carve` and `piece` events, and `work > W` (the first
     calibration rating crossed the bound although none of its events is kept);
   - the total: the test repeats the run's two calls (`setAttempt` and `puzzleCandidate` with the arguments of the
     algorithm, its own `record` counting every event and its own `charge` summing the units) and asserts
     `full.work === events + units`.
8. Step-count, byte and cancellation bounds (cross-review SP10):
   - `maxSteps` = 10 gives `incomplete` `'steps'` with exactly 9 events (one step stays for the final);
   - `maxSteps` = 1 stops at the first event: `incomplete` `'steps'`, no event, `stages.set === 'stopped'` and the
     candidate stage `'stopped'` (an early set-stage stop);
   - `maxBytes` = 4,000 gives `incomplete` `'bytes'` with `utf8Length(JSON.stringify(run.events))` at most 4,000;
     with `reserveBytes` = 3,000 it is at most 1,000 (the array's brackets and commas counted, TP10);
   - `isCancelled` returning true from its 5th call on throws `ReplayCancelledError`.
9. Malformed record: unsorted `skips.subsets` gives `unavailable`, reason `'record-invalid'`; a valid but unused extra
   subset ordinal (strictly above the last one executed, below 2,128) gives `mismatch`, reason `'skips'`.
10. A `completion` record gives `unavailable`, reason `'completion'`, with the stage 1-3 events present; a pack
    without `setOrigin` gives `stages.set === 'unavailable'` (`'no-set-origin'`) while stages 4-6 still run and
    compare (`compared` without board, pieces and witness), and the status is `unavailable`, never `matched`.
11. The projection (cross-review SP08): for every fixture puzzle, the run with the pack's whole `generation` deep-equals
    the run with `{ setOrigin, made: { [id]: made[id] } }`; replacing another puzzle's entry by `{ schema: 2 }` does
    not change this puzzle's run; `made` replaced by an array gives `unavailable` `'record-invalid'`; a `made` map
    without this puzzle's id gives `unavailable` `'no-record'`.
12. Limits: `maxSteps` 0, `maxBytes` 1.5, `work` -1, `work` `NaN`, a missing field, and `reserveBytes` greater than
    `maxBytes` each throw `RangeError` before any stage runs (an `isCancelled` that throws is never reached).
13. Plain JSON (TP09): with `const { set, ...rest } = run`, `JSON.parse(JSON.stringify(rest))` deep-equals `rest`
    (the events included); no event contains a function, a typed array or `undefined`; `set` is null or has
    `set.board.active instanceof Uint8Array`; `structuredClone(run)` deep-equals `run` (the whole run, `set` with its
    typed array included).
14. Input errors: a missing `puzzle` or a `set` without pieces throws `RangeError`.
15. Determinism: two runs of the same puzzle give deep-equal results.
16. Measurements for the provisional bounds (record in the reply, not asserted): for each fixture puzzle the number of
    events, their UTF-8 JSON bytes and `work`; the largest of each as a share of `REPLAY`.

## Definition of done & handoff

- Every criterion has its evidence; the reply gives the exports, the measurements of case 16 and the test counts.
- Handoff to MP15a2: `runReplay(input, workspaces, limits, isCancelled, reserveBytes)` returns `{ status, reason,
  stages, compared, work, events, set }`; `utf8Length`; the bounds and the `stopped` stage state; events in
  chronological order.

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
