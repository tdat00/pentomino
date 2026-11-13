# MP14a — Rating detail channel, clue-stage recorders and the replay of skips

| Header | Value |
|---|---|
| ID | MP14a (first part of the report's MP14; MP14b adds the set and layout recorders) |
| Depends on | MP13b (accepted and committed); MP13a's skip ordinals in `selectClues` |
| Estimated size | Medium–Large: about 650–850 changed lines (`difficulty.js` about 70, `clues.js` about 170, `tiling.js` about 3, `types.js` about 80, tests about 330, documents about 40); about 55–60 minutes |
| Owner role | Engine |
| Milestone | M8 — provenance and recorders |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-19 ("Detail channel"), RES-28 (recorders, replay control, events), RES-27 (skip ordinals), RES-35 (the `rejected` event); check-list §4.2 D30, D31 |
| Gates owned | none |
| Implementation status | Not started |

## Goal & business context

Generation Steps (MP15a1 to MP16b) shows, for every clue set the generator rated, its score table: the deduction
rules used, the guesses with their alternatives and the census that proved them. Today `rate` returns only the
aggregate metrics. This task adds the **detail channel** — `rateDetailed`, the same measurement with an owned copy of
the solver's per-node data — and the **clue-stage recorders**: opt-in observers in clue selection and the uniqueness
repair that report every rated, skipped, unrateable and refused clue set, every repair step and the selected result.
It also adds the replay side of the skip ordinals that MP13a records (`ctx.replaySkips`), and the **work meter**
(`ctx.charge`) that lets a replay bound its total computation as RES-29 defines it (cross-review SP09).

The recorders and the meter are observers only (RES-28): with or without them, generation makes the same sets,
puzzles and random draws; claims, packs and codes stay aggregate-only.

## Scope

### In scope

- `core/engine/difficulty.js`: `rateDetailed(board, pieces, clues, ws)`; `rate` unchanged in result.
- `core/engine/clues.js`: `SelectContext.record`, `SelectContext.recordSource`, `SelectContext.replaySkips`,
  `SelectContext.charge`; the events of this task; `makeUnique`'s optional `hooks` (`onAdd`, `onCount`);
  `SkipReplayError`.
- `core/engine/tiling.js`: `countSolutions` also returns `rowTrials` (one field; the work meter needs it).
- `core/engine/types.js`: `RatingDetail` and the clue-stage event typedefs.
- Tests: `tests/replay-recorders.test.js` (new), `tests/difficulty.test.js` (the detail channel) and
  `tests/tiling.test.js` (`rowTrials`).
- Documents: `docs/design-detail.md` §7.9 (the detail channel) and §6.10 (recorders, the skip replay and the work
  meter).

### Out of scope

- The set and layout recorders, `setAttempt` and `puzzleCandidate` parameters, the calibration's recorded call
  (MP14b); the replay engine (MP15a1, MP15a2); any UI.
- Changing what generation does: ratings, clue sets, repairs, RNG draws and results are identical with and without
  `record` and `charge`; no solver counter changes (the meter reads the existing ones).

## Repository rules

- Read `AGENTS.md` and `tasks/difficulty-v3/check-list.md` §3 first.
- Engine purity; `// @ts-check` and JSDoc types. No new engine file.
- Run only the commands of the test plan; no gate. Never stage, commit, stash, reset, push or switch branches; never
  edit `tasks/difficulty-v3/`, the reports or `docs/difficulty-v3/`.
- UTF-8 without BOM, CRLF, final newline, no trailing whitespace.

## Inputs & context

Anchors refer to the code as MP07, MP09c, MP09d1, MP09d2 and MP13a left it; find the places by the quoted names.

### The measurement today (MP09d1, MP09d2)

- `measureDeduction(model, limits = DEDUCE, diagnostics = {})` (`core/engine/deduce.js`) returns the
  `DeductionResult` `{ path, first, search: { Gt, nodes, work, stop }, count: { S, limit, exhausted, solutions },
  census: { complete, undecided, nodes, work } | null }`; `first` = `{ F, E, rules: { R1 … R9 }, deductionTier, G,
  Gproved, info, Cmax, Dmax, choices, rows, census }` with `choices` (c of every final-path guess node, root first),
  `rows` (selected model rows of the first solution, in selection order) and `census` (`CensusNode` `{ c, kLow, f, u
  }`, one per final-path guess node, aligned with `choices`). Its arrays may be views into workspace slots that later
  calls reuse.
- `measureV3(board, pieces, clues, ws, limits?)` (`core/engine/difficulty.js`) runs it on one model (step 3 of its
  definition), then the DLX diagnostic `solveFirst` on the same model and workspace (step 4), and returns `{ metrics,
  saturated: false }`; it throws `UnsatisfiableError` or `IncompleteRatingError` (RES-04). For U = 0 it returns the
  zero metrics without calling the solver.
- `rate(board, pieces, clues, ws)` returns `{ model: 'difficulty-v3', score: scoreV3(metrics), level, saturated:
  false, censored?: true, metrics }` (`censored` exactly when `metrics.censusComplete` is false).

### The detail channel (RES-19; SA2-4 JC09)

```text
rateDetailed(board, pieces, clues, ws) -> { rating, detail }
  rating: deep-equal to rate(board, pieces, clues, ws), with the same errors
  detail: RatingDetail, an owned copy of the DeductionResult of the SAME measurement, copied right after
          measureDeduction returns and before solveFirst reuses the workspace; there is no second solve
rate(board, pieces, clues, ws) = rateDetailed(...).rating without making the copy
```

Implement it by giving `measureV3`'s body an internal flag (for example an internal `measureV3Core(board, pieces,
clues, ws, limits, keepDetail)` that returns `{ metrics, saturated, detail }`, `detail` null unless asked), so `rate`,
`measureV3` and `rateDetailed` share one code path and the result of `rate` is unchanged byte for byte.

```js
/**
 * Owned copy of one rating's deduction data (RES-19): plain JSON, no typed arrays, never shared with the workspace.
 * @typedef {object} RatingDetail
 * @property {'complete'} path
 * @property {{ F: number, E: number, rules: { R1: number, R2: number, R3: number, R4: number, R5: number, R6: number,
 *   R7: number, R8: number, R9: number }, deductionTier: number, G: number, Gproved: number, info: number,
 *   Cmax: number, Dmax: number, choices: number[], rows: number[],
 *   census: { c: number, kLow: number, f: number, u: number }[] }} first
 * @property {{ Gt: number, nodes: number, work: number, stop: string }} search
 * @property {{ S: number, limit: number, exhausted: boolean, solutions: string }} count
 * @property {{ complete: boolean, undecided: number, nodes: number, work: number }} census
 */
```

Copy every field explicitly in this key order (`Array.from` for arrays, a new object per census node). For U = 0
(no solver call) the detail is the zero detail: `first` with every number 0, `rules` all 0, empty arrays; `search {
Gt: 0, nodes: 0, work: 0, stop: 'exhausted' }`; `count { S: 1, limit: DEDUCE.solutions, exhausted: true, solutions:
'unique' }`; `census { complete: true, undecided: 0, nodes: 0, work: 0 }` (it matches the zero metrics of MP09d1).
Only recorders call `rateDetailed`; claims, packs and codes never contain a detail.

### Recorder and replay control in `selectClues` (RES-28)

New optional `SelectContext` properties (JSDoc in the typedef at the top of `clues.js`):

```js
 * @property {(event: ClueEvent) => void} [record] Observer (RES-28): receives the events below, plain owned JSON,
 *   never mutated after delivery. With it, every rating of the call goes through `rateDetailed`.
 * @property {'calibration' | 'candidate'} [recordSource] `source` of the events; default 'candidate'.
 * @property {{ subsets: number[], repairs: number[] }} [replaySkips] Replay control (RES-27, RES-28): skip exactly
 *   these ordinals instead of consulting `excludeClueKeys`; every entry must be consumed.
```

Ratings with a recorder: `const rateWith = ctx.rate !== undefined ? (b, p, c, w) => ({ rating: ctx.rate(b, p, c, w),
detail: null }) : record !== undefined ? rateDetailed : (b, p, c, w) => ({ rating: rate(b, p, c, w), detail: null });`
— the `rate` seam of MP07 keeps priority (tests), and without a recorder the call path is exactly today's.

Events (RES-28; field order as written; `band` = `{ min: target.min, max: Number.isFinite(target.max) ? target.max :
null }`; `clueIds` = the clue piece ids in layout order; `sequence` = the subset ordinal of MP13a; `repairSequence` =
the repair ordinal of MP13a; `phase` = `'sample'` in phase 1, `'seed'` in phase 2, `'beam'` in the beam):

```text
{ stage: 'clues', kind: 'rated', source, phase, sequence, clueIds, rating, detail, band }
{ stage: 'clues', kind: 'skip', source, sequence }
{ stage: 'clues', kind: 'unrateable', source, phase, sequence, clueIds, reason: 'path-capped', band }
{ stage: 'clues', kind: 'rejected', source, phase, sequence, clueIds, rating, detail, band, reason: 'no-proved-guess' }
{ stage: 'unique', kind: 'repair', source, repairSequence, addedId, clues, rating, detail, accepted, reason? }
{ stage: 'clues', kind: 'selected', source, sequence, repairSequence }
```

Where they are emitted:

- `rateSubset(idx, phase)` (pass the phase from each caller): a skip (by `excludeClueKeys`, or by `replaySkips`)
  emits `skip` right where MP13a records it; a subset whose rating throws `IncompleteRatingError` emits
  `unrateable`; a rated subset that MP09c refuses (`refuseUnproved && noProvedGuess(rating)`) emits `rejected` with
  its rating and detail **instead of** `rated`; every other rated subset emits `rated`. A rated event is an
  observation, not a selection. Store the subset ordinal on the candidate (`Candidate.seq`).
- Repairs (D31; the report leaves a repair that adds several clues open): `makeUnique` gains an optional last
  parameter `hooks = {}` with `onAdd?: (pieceId: string, clues: Pose[]) => void`, called after each added clue with a
  copy of the current clue list, and `onCount?: (rowTrials: number) => void` (the work meter, below); they change
  nothing else. `finish(c)` in `require` mode buffers one step per added clue and,
  when the finish has decided, emits them in order as `repair` events, all with the finish's `repairSequence`,
  `addedId` = the added piece id and `clues` = the clue poses after that addition in layout order (`sortLike`). Only
  the **last** event of a finish carries the outcome: `rating` and `detail` of the repair rating (both null when it
  was unrateable), `accepted` (true when `finish` returns its result) and, when not accepted, `reason` =
  `'not-proved'` (`makeUnique` returned null), `'path-capped'`, `'no-proved-guess'`, `'out-of-band'` or `'excluded'`
  (the repair skip of MP13a); earlier events of the same finish have `rating: null`, `detail: null`, `accepted:
  null` and no `reason`. **Zero-add finishes (D31, cross-review SP14):** a finish whose `makeUnique` fails before
  adding a clue emits exactly one failure event with `addedId: null`, `clues` = the candidate's clues, `rating:
  null`, `detail: null`, `accepted: false`, `reason: 'not-proved'`; a finish that proves uniqueness without adding a
  clue (a successful zero-add finish) emits no `repair` event, but its count is charged (below). Memoised finishes
  (`finishOnce`) emit nothing and charge nothing.
- `selected`: once, right before an `ok: true` result is returned: `sequence` = the chosen candidate's `seq`,
  `repairSequence` = the ordinal of its finish when that finish added clues, else null. A failure result emits no
  `selected` event.
- Every event object is built fresh, contains only JSON values (strings, finite numbers, booleans, null, arrays,
  plain objects; `rating` is the rating object itself, which is plain JSON), and is never touched again after
  `record(event)`; a throwing `record` propagates (it is the caller's observer).

Replay of skips (RES-27, RES-28):

- With `replaySkips`, `excludeClueKeys` is not consulted at all. In `rateSubset`, after `tried.add` and the ordinal,
  the subset is skipped exactly when its ordinal is the next unconsumed entry of `replaySkips.subsets`; in `finish`,
  at the excluded-key check (after the repair rating and the band check), the repair is skipped exactly when
  `changed` and its ordinal is the next unconsumed entry of `replaySkips.repairs`. A consumed skip is recorded in the
  result's `skips` and emits its event exactly as a normal skip.
- A recorded repair ordinal whose finish ends before that check (`makeUnique` null, no clue added, unrateable,
  refused, out of band) is **unreachable**; an entry left unconsumed when `selectClues` returns (success or failure)
  is **unused**. Both throw

  ```js
  export class SkipReplayError extends Error {
    /** @param {'unreachable' | 'unused'} reason @param {'subsets' | 'repairs'} list @param {number} ordinal */
    constructor(reason, list, ordinal) {
      super(`recorded ${list} skip ${ordinal} is ${reason}`);
      this.name = 'SkipReplayError';
      this.code = 'replay-skips';
      this.reason = reason;
      this.list = list;
      this.ordinal = ordinal;
    }
  }
  ```

  MP15a1 maps it to the replay status `mismatch`. An unreachable subset ordinal cannot occur (every subset ordinal is
  a skip point); a subset entry beyond the last executed ordinal is unused.

### The work meter (RES-29; cross-review SP09)

RES-29 bounds one replay by "the sum of the `work` counters of every rating (census included) and the trial counters
of every uniqueness repair, plus one per recorder event; it is checked after every rating and event". Events alone
cannot carry this: a capped rating's `unrateable` event has no detail, a successful zero-add finish emits no event,
and a candidate replay drops the calibration's events. So `selectClues` reports the work itself, separately from the
events:

```js
 * @property {(units: number) => void} [charge] Work meter (RES-29): called once per rating attempt of this call,
 *   right after the rating returns or throws, and once per uniqueness count of a repair, right after the count; always
 *   before the event (if any) of that rating or finish is recorded. A throwing `charge` propagates unchanged.
```

- A rating attempt (a subset in `rateSubset`, or a repair rating in `finish`), with or without `record` and also with
  the `rate` seam: on success `charge(work)` with `work = rating.metrics?.work`, or 0 when that is not a finite number
  (v3's `metrics.work` is `search.work`, which already includes the census work: never add `census.work` again); on
  `IncompleteRatingError`, `charge(error.counters.work)` before the error is handled as today. Any other error is not
  charged and propagates as today. Charge after the rating and before MP09c's refusal check, so a refused rating is
  charged too.
- A uniqueness count: `makeUnique` calls `hooks.onCount?.(c.rowTrials)` right after each `countSolutions` call and
  before it returns or adds a clue; `finish` passes `onCount: (n) => charge?.(n)`. Every count is charged, including
  the final count of a successful finish and the single count of a zero-add finish. `certify` is not part of
  `selectClues` and is not charged.
- `tiling.js`: `countSolutions` returns `{ found, exhausted, witnesses, rowTrials }` with `rowTrials` = the row trials
  of its `cover.solve` call (`r.rowTrials`, already returned by `core/engine/dlx.js`); update its JSDoc. Callers that
  read only `found`, `exhausted` or `witnesses` are unchanged.
- One unit per recorder event is the replay's own accounting (MP15a1), not `selectClues`'s.
- `charge` is an observer: with or without it the result, `skips`, ratings and RNG draws are identical. It is called
  whether or not `record` is set (MP15a1 uses both).

Reference logs (the analysts' run at HEAD `a80274b` with the working-tree `clues.js` of MP09c and a load hook that
reported `rowTrials`; `w<n>` = `charge(n)`, `e<kind>` = `record` of that kind, in call order). The doubles carry
`metrics.work = 1000 + clues.length`: for MP07's `scripted` seam, `(b, p, clues) => ({ ...scripted(table)(b, p,
clues), metrics: { U: p.length - clues.length, work: 1000 + clues.length } })`; for MP09c's `byCount`, its entry
`[score, Gproved]` gives `metrics: { U, Gproved, work: 1000 + clues.length }` and `'capped'` throws with `counters: {
nodes: 5, work: 7, stop: 'work-cap' }`:

| Call | Log |
|---|---|
| `req-0` (`S`, `T`, `require`) | `w1003 erated w1003 erated w1003 erated w1003 erated w1003 erated w1002 erated w353 eselected` (the winner `FW` is finished by one count: a successful zero-add finish, no `repair` event) |
| `req-2` (`S`, `T`, `require`) | `w1003 erated w1003 erated w1003 erated w1003 erated w1004 erated w1002 erated w390 w304 w77 w1004 erepair erepair w1004 erated w1002 erated w557 eselected` (`YV` repaired by two added clues to `YPUV`, rated 18: out of band, so the last `repair` event has `accepted: false`, `reason: 'out-of-band'`) |
| S6 of MP09c (`byCount`, H, `require`, `repair-2`) | `w1005 erated w10 w7 w7 erepair w1005 erated w23 eselected` (the repair rating of `IYTZX` is capped: charged 7, its single `repair` event has `reason: 'path-capped'`) |
| S4 of MP09c | `w1005 erated w10 w7 w1006 erepair w1005 erated w23 eselected` (the refused repair rating is charged) |

The row-trial values (353, 390, 304, 77, 557, 10, 7, 23) are those of the DLX counter at HEAD; if they differ, stop
and report (they do not depend on anything this task changes).

### Types (`core/engine/types.js`)

Add `RatingDetail` (above) and `ClueEvent` as a JSDoc union of the six event shapes, with `band: { min: number, max:
number | null }`. `Candidate` (in `clues.js`) gains `@property {number} seq Subset ordinal (RES-27).`

## Files to create/modify

| File | Change |
|---|---|
| `core/engine/difficulty.js` | `rateDetailed`; the shared internal measurement with the copy flag |
| `core/engine/clues.js` | `record`, `recordSource`, `replaySkips`, `charge`, the events, `hooks` (`onAdd`, `onCount`) of `makeUnique`, `SkipReplayError`, `Candidate.seq` |
| `core/engine/tiling.js` | `countSolutions` returns `rowTrials` (and its JSDoc) |
| `core/engine/types.js` | `RatingDetail`, `ClueEvent` |
| `tests/replay-recorders.test.js` | new: cases 3–15 |
| `tests/difficulty.test.js` | cases 1–2 |
| `tests/tiling.test.js` | case 16 |
| `docs/design-detail.md` | §7.9 and §6.10 |

Exclusive ownership while this task runs: the files above. `core/engine/generate.js` and `carve.js` belong to MP14b,
and `tiling.js` passes to MP14b after this task (this task changes only `countSolutions`).

### Documentation slot

- §7.9 "Deduction solver" (line 1647 at HEAD): a paragraph "Detail channel": `rateDetailed`, the owned copy, no second
  solve, only recorders use it.
- §6.10 "Clue selection" (line 1345): the recorder events (the list above, in short), D31's repair steps (with the
  zero-add rule), the skip replay and `SkipReplayError`, the work meter (`charge`: what is charged and when), and the
  rule that recorders and the meter never change the result.

## Implementation steps

1. `difficulty.js`: the internal measurement with the copy flag; `rateDetailed`; keep `rate` and `measureV3`
   outputs unchanged.
2. `tiling.js`: `rowTrials` in the result of `countSolutions`.
3. `clues.js`: `seq`; phases; the event builders; `hooks` of `makeUnique`; the buffered repair events; `selected`;
   `replaySkips` and `SkipReplayError`; `charge` at the rating and count points.
4. Types, tests, documents; run the test plan.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP14a-B01 | Every clue set the generator rates can later be shown with its full score table (rules, guesses with their alternatives and census) from the same measurement | cases 1, 2, 4 |
| MP14a-B02 | Every step of clue selection is reported: rated, skipped, unrateable, refused for lack of a proved guess, each repair step, and the chosen result | cases 4–8 |
| MP14a-B03 | Watching generation never changes what it makes | case 3 |
| MP14a-B04 | A replay skips exactly where the original run skipped, and a record that does not fit the run is detected, never ignored | cases 9–12 |
| MP14a-B05 | A replay can count all the computation it repeats, including what no step shows (capped and refused ratings, repairs that add no clue), so its work bound means what RES-29 says | cases 14, 15 |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP14a-T01 | `rateDetailed(...).rating` deep-equals `rate(...)` (same errors); `detail` is plain JSON equal to the DeductionResult of the same call; `rate` makes no copy | cases 1, 2 |
| MP14a-T02 | With `record` and `charge`, the result, `skips`, ratings and RNG draws equal those of the same call without them | case 3 |
| MP14a-T03 | Events have exactly the fields and order above; they are plain JSON (`structuredClone` and a JSON round trip give deep-equal objects) and are not mutated after delivery | cases 4, 13 |
| MP14a-T04 | `rejected` replaces `rated` for a RES-35 refusal; `unrateable` for a capped path; repair events follow D31, including the zero-add rule (a failed zero-add finish emits one event, a successful one none) | cases 5–7 |
| MP14a-T05 | `selected` names the chosen candidate's `seq` and its repair sequence (null when no clue was added) | case 8 |
| MP14a-T06 | `replaySkips` reproduces a recorded run without `excludeClueKeys`; unreachable and unused entries throw `SkipReplayError` | cases 9–12 |
| MP14a-T07 | `charge` is called once per rating attempt (success, refusal or `IncompleteRatingError`, with `metrics.work` or `counters.work`) and once per uniqueness count (`rowTrials`, zero-add finishes included), before the corresponding event, exactly as the reference logs; a throwing `charge` propagates; `countSolutions` returns `rowTrials` | cases 14–16 |

## Test plan

### Exact commands

```powershell
node --test --test-skip-pattern=slow tests/replay-recorders.test.js tests/difficulty.test.js tests/clues.test.js tests/tiling.test.js tests/certificates.test.js
if ($LASTEXITCODE -ne 0) { throw 'targeted tests failed' }
npm run test:quick
if ($LASTEXITCODE -ne 0) { throw 'quick tests failed' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'check failed' }
```

### Required test cases

`tests/difficulty.test.js`:

1. On the 10 x 6 classic witness with 7 clues (MP09d1's key-order board) and on a puzzle with at least one guess node
   (any recipe puzzle whose `metrics.G >= 1`): `rateDetailed(...).rating` deep-equals `rate(...)` and their JSON texts
   are equal; `detail.first` equals the scalar fields of `rate(...).metrics` (`F`, `E`, `rules`, `deductionTier`, `G`,
   `Gproved`, `info`, `Cmax`, `Dmax`), `detail.first.choices.length === detail.first.census.length`,
   `detail.search.nodes === metrics.nodes`, `detail.count.solutions === metrics.solutions`; `detail` survives
   `structuredClone` and `JSON.parse(JSON.stringify(...))` unchanged; a second `rate` call on the same workspace does
   not change the earlier `detail` (owned copy).
2. U = 0 gives the zero detail; an unsatisfiable clue set throws `UnsatisfiableError` from both functions. (The capped
   path is covered by MP09d1's `measureV3` case: `rate`, `measureV3` and `rateDetailed` share one code path, which
   the test's comment states; do not add a limits parameter to `rate` or `rateDetailed`.)

`tests/replay-recorders.test.js` (new; the clue-recipe boards of `tests/clues.test.js` and MP07's scripted seam):

3. Identity: for each of three calls (an `any` call with real ratings, MP07's `require` case `req-3`, and the same
   with an excluded key that produces a subset skip), the result (including `skips`) and the sequence of RNG draws
   (wrap the context's `rng` and log every method call with its result) are deep-equal with and without `record`
   and `charge` (both set, and each alone).
4. Event shape: in the `any` call, every event is one of the six shapes with exactly its keys in order; `band.max` is
   null for an unbounded target; `rated` events with real ratings carry a non-null `detail` whose `first.G` equals the
   rating's `metrics.G`; with the `rate` seam set, `detail` is null.
5. Refusal (RES-35): MP09c's scripted case S1 (a Hard-or-above target, a rating with `metrics.Gproved === 0`) emits
   `rejected` with `reason: 'no-proved-guess'` and no `rated` event for that subset.
6. Unrateable: MP09c's scripted case with a capped subset emits `unrateable` with `reason: 'path-capped'`; the
   repair cases S4 and S6 of MP09c emit a last `repair` event with `accepted: false` and `reason`
   `'no-proved-guess'` and `'path-capped'` respectively (rating and detail null for the capped one).
7. Repair steps (D31): in `req-3`, the `repair` events of each finish share one `repairSequence`, their `addedId`s
   are the clues added in order (as `onAdd` reported them), only the last has a non-null `accepted`; in `req-0` the
   winner's successful zero-add finish emits no `repair` event (case 14 shows its charged count); in MP13a's case 3
   (`req-3` with the excluded repaired key) the reason `'excluded'` appears exactly once, on the last event of the
   finish at `skips.repairs[0]`. The failed zero-add event (`addedId: null`) needs a first count that stops at the
   row limit with at most one solution found; the analysts found no quick input that reaches it (none in ten seeds
   on the 10 x 6 recipe board, none on the 41-I strip): build it with the same event builder as the failure after an
   add, say so in a code comment, and leave its rendering to MP16a's synthetic test.
8. `selected`: exactly one per `ok` result, last of all events; its `sequence` is the `seq` of the candidate whose
   clues (or, after a repair, whose raw subset) the result came from; `repairSequence` is the ordinal of the repair
   that produced the result's clues, or null; no `selected` event on a failure.
9. Replay of subset skips: record a call with an excluded key (case 3's third call) and take its `skips`; a second call
   with `replaySkips: skips` and an **empty** `excludeClueKeys` gives a deep-equal result and the same events.
10. Replay of a repair skip: the same for MP13a's case 3 (`req-3`, excluded repaired key): the replayed result has
    `skips.repairs` equal to the recorded one and the same result; this pins the exact repair ordinal.
11. Unused: `replaySkips.subsets` with an extra ordinal beyond the last executed one, and `replaySkips.repairs` with an
    extra entry, throw `SkipReplayError` with `reason: 'unused'` and the right `list`.
12. Unreachable: a `replaySkips.repairs` entry at the ordinal of a finish that added no clue (or failed) throws
    `SkipReplayError` with `reason: 'unreachable'`.
13. Not mutated after delivery: keep a JSON snapshot of each event at delivery; after the call every event's JSON
    still equals its snapshot.
14. Work meter: with one log for both observers (``charge: (n) => log.push('w' + n)``, ``record: (e) =>
    log.push('e' + e.kind)``) and the work-carrying doubles of "The work meter", the four calls of its reference table
    give exactly the logs of the table (`req-0`, `req-2`, S6, S4); with only `charge` set, the `w` entries are the
    same. These logs pin: a rating charged before its event, a refused and a capped repair rating charged once each
    (1006 and 7), every uniqueness count charged with its row trials, the zero-add finish of `req-0` and `req-2`'s
    last finish (353, 557) charged without a `repair` event.
15. A throwing `charge`: in `req-2`, a `charge` that throws a fresh `Error('stop')` on its 7th call (the count 390)
    makes `selectClues` throw exactly that error (`assert.throws(..., (e) => e === stop)`), and the events recorded
    before it are the first six `rated` events.

`tests/tiling.test.js`:

16. In the existing cut case ("`countSolutions(cut, { cap: 5, rowTrialLimit: 3 }).found` is 0", where `solveFirst`
    reports `rowTrials` 3), `countSolutions(cut, { cap: 5, rowTrialLimit: 3 }).rowTrials === 3`. (The row trials of
    an exhausted count are pinned through case 14's logs.)

## Definition of done & handoff

- Every criterion has its evidence; the reply lists the new exports, the event examples of case 4 (one of each kind)
  and the test counts.
- Handoff to MP14b: `SelectContext.record`, `recordSource`, `replaySkips`, `charge`; `rateDetailed`; the event list;
  the `hooks` parameter of `makeUnique`; `rowTrials` of `countSolutions`. To MP15a1: `SkipReplayError` (→
  `mismatch`), `RatingDetail`, the event shapes, the meter's contract (what is charged, and that it is charged before
  the event).

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
