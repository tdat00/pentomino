# The Pentomino generator: state and time cost (2026-11-14)

Written by SA1 (claude-opus-5.5) for the plan author (claude-fable-5-2), for the open question PR-P2 of
[clarifications.md](clarifications.md): a review of the generator's time complexity, asked for by the owner on
2026-11-14 at 07:18. The document describes the generator as it is, gives every time measured so far with its
source, and lists what will still change before the final release. It decides nothing and proposes nothing.

| Item | Value |
|---|---|
| Code described | `rating-v3` at `917052a`. Its code is the code of `a1b9354` (MP12a): `git diff a1b9354 917052a -- core tools` is empty. Every line number below refers to that tree |
| Versions | `currentVersions()`: algo `gen-v3`, policy `mixed-v2`, rng `xoshiro128ss-v1`, model `difficulty-v3`. Score tuple `12 / 3 / [0, 0, 2, 3] / G 5 / info 0.5 / (1, 2)` |
| Machine of every measurement | one Windows machine: AMD EPYC 7763 (8 cores, 16 threads), 64 GB, Node v26.13.0. It is shared with the Sudoku repository through the lock of check-list §7 |
| Workers | the landscape and the bench run 4 Node workers; the browser app uses `min(4, hardwareConcurrency)` |
| State of MP12b1 | finished on 2026-11-14 at 10:08: all 105 cases are published in `docs/difficulty-v3/landscape-v3-full/` with the aggregate `aggregate-2026-11-14.json` and `.md`. Section 3.10 gives the aggregate; sections 3.7, 3.8 and 5 use it (second phase, after MP12b1) |
| Pause | owner decision P-OD11: Pentomino pauses after MP12b1 until the Sudoku repository reaches MS07e; MP12b2 is not dispatched before then |

Labels used below:

- **Fact**: measured, or read from the code, with its source.
- **Analysis**: derived by SA1 from the code or from measured numbers; the derivation is given.
- **Projection**: an expectation that no measurement backs yet.

MP12b1's numbers come from the reports that its aggregate selected. In the first phase of this document (before the
aggregate) they were marked *interim*; the aggregate confirmed every one of them, and the label is gone.

Time measures are those of the bench (`tools/bench/report.js`):

- **T1**: from the click to the validated piece set with its calibration puzzle (the set stage).
- **T10**: from the click to the tenth accepted puzzle (the set stage, the pool start-up and the batch of ten).
  The T10 median, p95 and max use only the requests that reached ten puzzles; a max T10 also counts the response
  time of a request that never reached ten.
- **Response**: from the click to the final answer of the batch.
- **In band** (request in-band rate): the share of requests that returned ten distinct in-band puzzles.

A "request" below is always the bench's pair: the set request, then the batch request of 10 puzzles.

## 1. The generation pipeline

### 1.1 Requests, jobs and the time budget

- A user request is two jobs of `createGenerationClient` (`core/browser/generation-client.js:431`):
  - `generateSet` (line 572) makes the piece set and its calibration puzzle;
  - `generateBatch` (line 784) makes up to 10 puzzles of that set.

  The bench (`tools/bench/runner.js:535`) and the landscape run the two in sequence.
- Each job calls `begin()` (line 447) and `pool.beginRequest` with its own timer.
  - At `TIME.dispatchStopMs` = 115,000 ms after the job started, `expire` (`core/browser/worker-pool.js:348`) aborts
    every task of the job with `deadline` and terminates the busy workers. `checkDeadline` (line 363) checks the
    clock again at every dispatch.
  - So each job ends about 115 s after it started at the latest, and a request (both jobs) can take about 230 s.
- `TIME` (`core/engine/policy.js:68`) is `targetMs` 60,000, `dispatchStopMs` 115,000 and `responseMs` 120,000.
  - Only `dispatchStopMs` is enforced in code.
  - `targetMs` and `responseMs` are acceptance criteria of the bench (`CRITERIA`, `tools/bench/report.js:24`):
    complete-ten rate at least 0.9, at-least-one rate at least 0.99, T10 median at most 60 s, T10 p95 at most 115 s,
    response at most 120 s, process memory at most 1.5 GiB, at least 20 repetitions.
- Determinism: every random choice comes from a named RNG stream of the seed (`set/<attempt>`,
  `slot/<slot>/<attempt>`, `completion/<layout key>`), and results are consumed in a fixed order. The puzzles
  therefore do not depend on the pool size or the timing, only on whether the 115 s stop came first.

### 1.2 Levels: bands, areas, piece counts and clue shares

Sources: `core/engine/levels.js` and `core/engine/policy.js`.

- **Bands.** e0 = 0 and eL = round(10 * 1.45^(L - 1.5)) (`bandEdge`, levels.js:42). A rating is in band when
  min <= score < max (`inBand`, `core/engine/difficulty.js`). The central half is centre +/- (max - min) / 4.
- **Areas.** `AREAS` (levels.js:22) gives the active-cell range on which a level is offered (`offeredLevels`,
  line 109).
- **Initial clues.** `SHARES` (line 18) is the initial clue share. `initialClueCount` (line 125) is
  round(share * K), clamped to [1, K - 2].
- **Piece count K.** `pieceCountPlan` (policy.js:322):
  - mid = `K60[L]` * (A / 60)^0.28 (`COUNT_EXPONENT`), capped from Hell 1 on by `K_CAP_FROM_HELL_1`
    = [42, 62, 92, 140, 210];
  - the range is mid +/- max(0.75, 6 % of mid), clamped to the board's feasible [kMin(A), kMax(A)] and filtered by
    `histogramFeasible`;
  - `pieceCountRange` (line 348) lists the counts, and a set attempt draws one of them uniformly.
- **Board limits.** `deriveLimits` (policy.js:23): at least 30 active cells, a side of at most 32, release boards up
  to 484 active cells (576 once BQ-1 passes), phones up to 360 (484 once BQ-3 passes), large boards up to 676, batches
  of at most 10. Every qualification status (`core/engine/qualification.js:13`) is `not-run`.

K and the initial clue count below are computed with `pieceCountRange` and `initialClueCount` at HEAD.

| Level | Band | Central half | `AREAS` | Share | K at 60 / 144 / 300 / 484 / 676 cells | Initial clues |
|---|---|---|---|---|---|---|
| Very easy | 0-8 | 2-6 | 30-87 | 0.62 | 6-7 / - / - / - / - (7 at 87) | 4 |
| Easy | 8-12 | 9-11 | 32-215 | 0.54 | 7-8 / 9-10 / - / - / - (11 at 215) | 4-6 |
| Normal | 12-17 | 13.25-15.75 | 36-348 | 0.46 | 8-9 / 10-12 / 13-14 / - / - | 4-6 |
| Hard | 17-25 | 19-23 | 41 and up | 0.38 | 9-11 / 12-14 / 15-17 / 17-19 / 20-21 | 3-8 |
| Expert | 25-37 | 28-34 | 50 and up | 0.30 | 11-12 / 14-16 / 17-19 / 19-22 / 21-24 | 3-7 |
| Master | 37-53 | 41-49 | 59 and up | 0.22 | 12-13 / 16-18 / 19-22 / 22-25 / 24-27 | 3-6 |
| Nightmare | 53-77 | 59-71 | 81 and up | 0.14 | - / 19-22 / 24-27 / 27-30 / 30-33 | 2-5 |
| Hell 1 | 77-112 | 85.75-103.25 | 164 and up | 0.10 | - / - / 35-40 / 39-42 / 39-42 (31-35 at 196) | 3-4 |
| Hell 2 | 112-162 | 124.5-149.5 | 266 and up | 0.06 | - / - / 47-53 / 54-61 / 58-62 | 3-4 |
| Hell 3 | 162-235 | 180.25-216.75 | 450 and up | 0.04 | - / - / - / 73-80 / 80-90 | 3-4 |
| Hell 4 | 235-341 | 261.5-314.5 | 744 and up | 0.04 | not offered on any board of at most 676 cells | - |

### 1.3 Piece sets: the set attempt

`setAttempt` (`core/engine/generate.js:86`), attempt j, stream `set/<j>`:

1. K is drawn from `pieceCountRange`.
2. Carving: `carveMacro` (`core/engine/carve.js:494`) when A / K >= 6.5 (`MACRO_MIN_MEAN`, generate.js:60), else,
   or when it fails, `carveFlatSet` (carve.js:281). Budgets: `carveSteps` 6,000, `carveTries` 24, `macroPartitions`
   30, `macroSteps` 3,000, `sizePlans` 6; the piece sizes come from `planSizes` (policy.js:361) within `sizeWindow`
   (line 198). No carving: reason `carve`.
3. `finalizeSet` (carve.js:578) gives the pieces and the witness layout; `validateSet` failing gives `internal`.
4. The **calibration**: `selectClues` on the witness with the level's band (stream `cal`) and the requested
   uniqueness. Its failure reason (`not-in-band` or `uniqueness-not-proved`) is the attempt's.

`generateSet` runs attempts 0, 1, 2, ... with `pool.size` in flight at a time:

- The app, the bench and the CLI set no attempt limit (`maxSetAttempts` is unbounded by default, line 574).
- The lowest successful attempt wins; attempts above it still in flight are aborted.
- A set job that finds no set ends at the 115 s stop as `time-limit` (the landscape reports `set:time-limit`).
- The serial reference `firstSetAttempt` (generate.js:148) tries 32 attempts by default.

### 1.4 Layouts: the puzzle candidate

`puzzleCandidate` (generate.js:172), candidate (slot s, attempt a), stream `slot/<s>/<a>`:

- Start layout: the set's witness. On boards of at most 150 cells (`restartMaxArea`), attempts 2, 5, 8 and 11 start
  from a fresh `randomTiling` (`core/engine/tiling.js:325`; `tilingTotal` 100,000 row trials, `restartBase` 2,000).
- `lnsWalk` (tiling.js:498): 8 large-neighbourhood steps (`lnsSteps`), with row limits `lnsRowsMacro` 3,000 or
  `lnsRowsFlat` 5,000.
- A layout already in the request's history fails as `layout`. Otherwise `selectClues` runs on it, with the request's
  seen clue keys excluded.

### 1.5 Clue search: `selectClues`

`selectClues` (`core/engine/clues.js:207`) looks for a subset of the layout's pieces, the clues, whose v3 score lies in
the band, as near the band centre as it finds. Each rated subset is a **profile**; a call has at most
`BUDGETS.clueSubsets` = 64 profiles.

- **Phase 1** (line 432): count-guided sampling from `initialClueCount`, at most `COUNT_CHANGES` = 8 clue counts with
  `SAMPLES_PER_COUNT` = 4 random subsets each. The count goes down when samples are only below the band, up when
  they are only above it, and the phase ends otherwise.
- **Phase 2** (line 466): when nothing has been rated, up to 16 more samples at the start count.
- **Beam** (line 521): `BEAM_WIDTH` = 4 members, each with up to `MOVES_PER_MEMBER` = 8 unseen neighbours (add,
  remove or swap one clue, leaning towards the band), until 64 profiles or no new neighbour.
- **Stops** (`afterProfile`, line 387):
  - an in-band candidate in the central half whose final result is central;
  - once some in-band candidate exists, a **stall** (RES-15a): `STALL_LIMIT` = 12 rated candidates without a nearer
    in-band candidate, while nothing central was rated and only one side of the central half was;
  - once some in-band candidate exists, from profile 48 (`limit - CENTRE_RESERVE`, with `CENTRE_RESERVE` = 16), the
    best final result so far.
- **Spent profiles** (the D21 counting rule). Two kinds of profile are spent: they take a profile but are no
  candidate, are on no side of the band and do not advance the stall count.
  - An **unrateable** profile: its rating throws `IncompleteRatingError` (the deduction was capped).
  - An **AR1 refusal** (RES-35): at Hard and above (`target.min >= bandEdge(3)` = 17), a rating with `Gproved` = 0.

  A call whose every profile is unrateable spends at most 20 profiles (4 in phase 1, up to 16 in phase 2; a repeated
  sample is skipped without a profile) and returns `not-in-band`. MP09d2 counted 20 in every such attempt.
- **`require` mode**: an in-band candidate is finished by `makeUnique` (line 125) and re-rated when the repair changed
  it; that re-rating is not a profile. `certify` (line 89) uses `countSolutions` with cap 2 and a row limit of 10,000
  up to 200 cells, else 2,000. In `any` mode the certificate is lazy: it settles after acceptance and never delays T10.
- `SelectContext.rate` (MP07) is a seam for tests and diagnostics; production rates with `rate`.
- Not built yet: the fail-fast F1 and F2 (section 1.11).

### 1.6 The v3 rating

`rate` (`core/engine/difficulty.js:325`) is `scoreV3(measureV3(...))`, with `censored: true` when the census did not
finish. `measureV3` (line 214):

1. U = K - number of clues; U = 0 is a trivial rating.
2. `buildModel` (tiling.js:68): the exact-cover model of the free cells and the free pieces; its rows are the legal
   placements of the free pieces.
3. `measureDeduction(model, DEDUCE)` (`core/engine/deduce.js:280`):
   - **Memory precheck**: the deduction buffers must fit `DEDUCE.memoryBytes` = 32 MiB, else
     `ModelError('model-too-large')`.
   - **Rule ladder** (`ladder`, line 1448), restarting at R1 after every application:
     - R1, a free cell with one placement (line 552); R2, a piece with one placement (line 558);
     - R3, the pocket check and the pocket placement (lines 615 and 670);
     - R4 and R5, the claims (lines 709 and 782);
     - R6, a lookahead of width `lookaheadWidth` = 4 under the R1-R3 closure (line 881);
     - R7, the chessboard colouring of a pocket (line 1098); R8, necks (line 1240); R9, pairs (line 1344).

     The deduction tier is 3 when R7-R9 were used on the solution path, 2 for R4-R6, 1 for R1-R3 (line 1493).
   - **Search**: at a fixpoint, a guess on the uncovered column with the fewest live rows (`fewestColumn`, line 1541;
     `branch`, line 1593), depth first. Every alternative tried is a node. After the first solution the search goes
     on to count solutions, up to `solutions` = 8 or until the tree is exhausted.
   - **Caps**: `nodes` = 30,000 nodes in all and `work` = 760,000,000 deterministic work units (counted in the inner
     loops). A cap reached before the first solution makes the path `capped`, and `measureV3` throws
     `IncompleteRatingError`: the profile is unrateable. A cap reached after the first solution leaves the count
     `unknown`.
   - **Census** (`runProbes`, line 1738; `settleCensus`, line 1786). For every guess node on the first solution's
     path it counts the alternatives proved solvable (kLow), proved failing (f) and undecided. Undecided alternatives
     are probed (an existence search) within `census` = 80,000,000 further units (the limit is the work so far plus
     the census budget).
     - A node is **decisive** when kLow < c, where c is the number of its alternatives.
     - G counts the decisive nodes, info = sum of log2(c / kLow) over them, and `Gproved` counts the nodes with
       f >= 1.
     - An undecided alternative counts as failing, so an unfinished census gives an **upper estimate** of G and info
       (deduce.js, header lines 14-16).
4. The DLX diagnostic `solveFirst` (tiling.js:165; `SCORE.caps`: 50,000 row trials and 5,000 branch trials) runs on
   every completed rating and never enters the score. It raises the combined rating time 1.67 times on 18x20, below
   RES-19's threshold ([clarifications-resolved.md](clarifications-resolved.md), the note at the end of Part H).

### 1.7 The score

`breakdownV3` (difficulty.js:107) with `SCORE_V3` (policy.js:60): score = round(base + rule + guess - penalty), and 0
when U = 0, where

- base = 12 * (1 - e^(-U / 3)), at most 12 (11.4 at U = 9);
- rule = [0, 0, 2, 3][deduction tier];
- guess = 5 * G + 0.5 * info;
- penalty = 1 for `few` solutions (2 to 7 found), 2 for `many` (8 or more), 0 for `unique` and `unknown`
  (`countStatus`, deduce.js:261).

The tuple is `12 / 3 / [0, 0, 2, 3] / G 5 / info 0.5 / (1, 2)` (MP12a; MP12b2 locks it). The comment above `SCORE_V3`
(policy.js:58) still says "Defined but not yet the rating"; v3 has been the rating since MP09d2. The comment has no
effect.

### 1.8 The batch: fold, completion pass and history

- `foldStart` (generate.js:385) validates the batch and reuses the calibration puzzle as slot 1 when it is in the
  target level, unseen, and unique in `require` mode.
- Slots are filled in order (`foldAccept`, line 495). A candidate is accepted when:
  - its layout key and its clue key are new; and
  - its layout distance to the accepted layouts is at least the preferred distance, min(10, max(3, ceil(K / 4))).
    The preferred distance drops by 1 every 4 rejections, down to `MIN_DISTANCE` = 2.

  After `slotAttempts` = 12 attempts the best rejected candidate is taken. Without one, the fold ends `partial`
  with its most frequent failure reason.
- **Dispatch** (`dispatchOrder`, line 554) fills the pool's free width in this order:
  1. the awaited (slot, attempt);
  2. attempt 0 of each later slot;
  3. the further attempts of the current slot;
  4. the retries of later slots.

  The fold consumes candidates in (slot, attempt) order (generation-client.js, from line 1045), so the accepted
  puzzles do not depend on the pool. Speculative candidates beyond the consumed ones are discarded.
- **After a `layouts-not-found` stop**:
  - `enumerateLayouts` counts the arrangements (`ENUMERATION`, policy.js:103: 250,000,000 placements, 2,500,000
    nodes, `collect` 32);
  - a completion pass then tries up to 32 unused layouts (`completionCandidate`, generate.js:224), consumed in key
    order.
- **History**: at most 1,000 seen layout keys and 1,000 seen clue keys (`historyKeys`).

### 1.9 Worker pool, budgets and memory

Source: `core/browser/worker-pool.js`.

- **Pool size**: `defaultPoolSize` (line 139) = max(1, min(4, `hardwareConcurrency`, or 4 when unknown));
  `MAX_POOL_SIZE` = 4 (line 75).
- **Memory**:
  - each worker: a main workspace of 160 MiB (`workspaceBytes`), a scratch workspace of 32 MiB and a cache of
    32 MiB, so `WORKER_LIMIT_BYTES` = 224 MiB (line 70);
  - the main thread: a budget of 300 MiB (`MAIN_BUDGET_BYTES`, line 68).
- **Task kinds** (`core/engine/tasks.js:160-205`): `setAttempt`, `puzzleCandidate`, `completionCandidate`, `certify`,
  `rate`, `verifyPack`, `solveFirst`, `enumerateLayouts`, and the puzzle-code encode and decode.
- **The 115 s stop** discards the busy workers of the expired job.

### 1.10 The auxiliary queue

`createAuxiliaryQueue` (`core/browser/auxiliary.js:47`) runs single idle-priority tasks on the same pool:

- the kind `rate` today, for the derived display rating of puzzles with older claims (MP10a, MP10b);
- the replay `replayPuzzle` later (MP15b).

An auxiliary task waits while a main request is active, gives way to every new main request, and never begins or
cancels main work. It is not part of generation time.

### 1.11 Not built yet: the fail-fast

The fail-fast (check-list D40) is an owner question at MP12b2 (the plan author recommends F1 + F2, PR-P1). MP12b3
part B builds what the owner chooses.

- **F2**: `FAIL_FAST_PROFILES` = 4. A selection call ends at its fourth profile when all four were unrateable, with
  the reason `unrateable`.
- **F1**: a set request ends at its lowest attempt whose reason is `unrateable`, with the notice `N-NOSET-UNRATEABLE`.

## 2. The cost model

### 2.1 The loop nest and its bounds (Fact, from the code)

```text
set job           attempts j = 0, 1, 2, ...: no count limit; P = pool size in flight; ends at the lowest success
                  or at 115 s
  set attempt     carve (budgets of 1.3) + finalizeSet + selectClues(witness):
                  at most 64 profiles; at most 20 when every profile is unrateable
batch job         slot 1 = the calibration (when usable); slots 2..10
  slot            attempts 0..11 (slotAttempts 12), dispatched speculatively, consumed in order
    candidate     [randomTiling on boards of at most 150 cells, attempts 2, 5, 8, 11] + lnsWalk (8 steps)
                  + selectClues: at most 64 profiles
  completion      only after layouts-not-found: enumerateLayouts + at most 32 completion candidates
selectClues       at most 64 ratings (profiles); in require mode, per finished candidate one makeUnique and at most one
                  more rating
rating            buildModel + measureDeduction (search and count: at most 760M work units and 30,000 nodes;
                  census: at most 80M more units) + DLX diagnostic (at most 50,000 row trials, 5,000 branch trials)
```

Count bounds (Analysis):

- a set attempt rates at most 64 profiles;
- a batch rates at most 9 slots x 12 attempts x 64 = 6,912 profiles, plus 32 x 64 = 2,048 in a completion pass.

In practice the binding bound is time: 115 s per job, on P workers.

### 2.2 The cost of one rating (Fact)

**The work rate.** One worker does about 0.32 billion work units per second.

- Fact: on the 219 round-2 probe lines with a deduction longer than 20 ms
  (`docs/difficulty-v3/landscape-v3/r2/probe/final.jsonl`), work divided by deduction time has a median of
  317,000 units per ms (p5 157,000, p95 446,000).
- Analysis: the whole work cap (760M) therefore takes about 2.4 s, and the census budget (80M) about 0.25 s.
- Fact, measured directly:
  - a capped profile costs about 2 s (MP09d2: 20 capped profiles in 38-48 s);
  - MP06b's largest work, 377.8M, took 0.89 s, and P-OD2's extrapolation is 1.8 s for a full-cap rating.

**Complete ratings.** Round-2 probe of MP12a: 50 accepted puzzles per cell (48 in two 6x10 cells), rated again by the
probe. Main work and main nodes exclude the census.

| Cell | Largest main work (of 760M) | Largest main nodes (of 30,000) | Largest census work | Census unfinished | Deduction ms (median / p95 / max) | DLX ms (median / max) | Model bytes (max) |
|---|---|---|---|---|---|---|---|
| 6x10 easy, normal, hard | 0.7M (0.1 %) | 57 | 0.6M | 0 | 0-1 / 4-6 / 5-12 | 1 / 2-3 | 0.19 MB |
| 10x10 easy to hard | 2.9M (0.4 %) | 40 | 5.4M | 0 | 0-2 / 5-12 / 6-20 | 1 / 3-5 | 0.63 MB |
| 12x12 easy to hard | 7.0M (0.9 %) | 51 | 11.6M | 0 | 0-3 / 4-30 / 8-48 | 1-2 / 4-8 | 1.16 MB |
| 18x20 hard | 5.4M (0.7 %) | 49 | 5.9M | 0 | 5 / 20 / 23 | 7 / 19 | 5.69 MB |
| 6x10 expert | 16.8M (2.2 %) | 1,143 | 17.0M | 0 | 6 / 27 / 130 | 2 / 12 | 0.25 MB |
| 10x10 expert | 7.7M (1.0 %) | 530 | 46.5M | 0 | 7 / 36 / 149 | 2 / 20 | 0.79 MB |
| 12x12 expert | 5.3M (0.7 %) | 108 | 15.4M | 0 | 8 / 31 / 50 | 4 / 13 | 1.16 MB |
| 18x20 expert | 24.7M (3.2 %) | 61 | 49.9M | 0 | 33 / 147 / 166 | 14 / 39 | 11.76 MB |
| 6x10 master | 38.6M (5.1 %) | 2,872 | 80.0M | 1 | 46 / 242 / 336 | 4 / 35 | 0.35 MB |
| 10x10 master | 445.6M (58.6 %) | 21,246 (70.8 %) | 80.0M | 2 | 67 / 989 / 1,319 | 17 / 124 | 0.78 MB |
| 12x12 master | 122.7M (16.1 %) | 4,209 | 80.0M | 2 | 36 / 335 / 459 | 13 / 153 | 1.45 MB |
| 18x20 master | 80.6M (10.6 %) | 203 | 80.4M | 8 | 78 / 304 / 362 | 29 / 247 | 16.78 MB |

**Model build and size.** The probe of MP06b (`probe-2026-11-12.md` §4) adds:

- the model build takes a median of 0.9 ms on 6x10 up to 19.6 ms on 26x26;
- the workspace peak after the model build and the deduction reaches 20.8 MB on 26x26 (the deduction buffers alone
  must fit the 32 MiB precheck);
- the deduction median grows from 1.7 ms (6x10) to 58.6 ms (26x26).

### 2.3 Why the cost grows with the level: decisive guesses per band (Analysis)

Base plus rule is at most 15 points, so a score above 15 comes from decisive guesses. Each decisive guess adds 5
points plus 0.5 * log2(c / kLow).

The Hell puzzles made so far have about 2.8 to 3.7 bits per decisive guess (info median / G median: 36.92 / 13 on
14x14, 44.33 / 12 on 24x24 and 44.28 / 12 on 26x26). So one decisive guess is worth about 6.4 to 6.9 points, and the
band centre needs about G = (centre - 14) / 6.75.

| Level | Band centre | G needed at the centre (Analysis) | G median measured (Fact) |
|---|---|---|---|
| Hard | 21 | about 1 | 1 (2 on 3x29) |
| Expert | 31 | about 2-3 | 3 |
| Master | 45 | about 4-5 | 5 |
| Nightmare | 65 | about 7-8 | 8 (9 on 3x29 and 12x12) |
| Hell 1 | 94.5 | about 12 | 12-13 (the three Hell 1 cells with puzzles) |
| Hell 2 | 137 | about 18 | none made |
| Hell 3 | 198.5 | about 27 | none made |

The G medians are those of MP12b1's accepted puzzles (3.10).

**Why G costs.** A decisive node is a guess node with an alternative that is not proved solvable: that alternative
was refuted (the search or a census probe explored its subtree and found no solution), or it stayed undecided within
the census budget. So more decisive nodes on the path mean more refuted subtrees and more census probes. The clue
share also falls with the level, from 0.38 at Hard to 0.04 at Hell 3, so the search starts from fewer clues on more
pieces: at Hell, 3 or 4 clues on 31 to 90 pieces.

**Facts that show the growth:**

- **Largest main work**, of the 760M cap (2.2): Easy to Hard below 1 %; Expert at most 3.2 %; Master 5.1 % to 58.6 %.
- **Nightmare**: capped (unrateable) profiles are common. In MP09d2's 15x20 Nightmare replacement, 22 of 56 profiles
  were capped (`d21-v3-2026-11-12.md` §3.2). In MP12b1's diagnostic profile samples (3.10), the unrateable share at
  Nightmare is 2.3 and 3.1 % on 87 and 100 cells, 22.5 % on 144, 27.8 to 33.9 % on 196 to 324 cells and 13.4 to 21.7 %
  on 360 to 676 cells.
- **Hell** (`d21-v3-2026-11-12.md` §2, §4 and §6): in MP09d2's captures on 300 cells and more almost every profile
  was capped; on the 266-cell board 102 of 128; on the 164-cell board 62 of 104. The 104 profiles of the 164-cell
  board took 232 s, about 2.2 s per profile, rated or capped (Analysis). MP12b1's diagnostic samples of the three
  Hell 1 cells with puzzles are 31.9 to 45.6 % unrateable.
- **Census estimates** (MP12b1 and the slice): Hard at most 3.5 %; Expert at most 11 %; Master at most 39.5 %;
  Nightmare 34 % to 97 %; Hell 1 152 of 152 accepted puzzles.

### 2.4 Where the caps bind (Fact)

| Cap | Value | Where it binds | What happens |
|---|---|---|---|
| `DEDUCE.work` | 760,000,000 units | Nightmare (some profiles) and Hell (almost every profile in MP09d2's captures on 300 cells or more). Complete Master ratings reach 58.6 % of it (10x10) | capped path: unrateable profile, about 2 s spent |
| `DEDUCE.nodes` | 30,000 nodes | complete Master ratings reach 70.8 % of it (10x10); its share of the capped profiles is not recorded | as above |
| `DEDUCE.census` | 80,000,000 more units | Master, Nightmare and Hell (2.3) | censored rating: G and info are upper estimates, no error |
| `DEDUCE.solutions` | 8 | `many`: 146 of the 152 accepted Hell 1 puzzles (few 5, unknown 1) | counting stops; penalty 2 |
| `DEDUCE.memoryBytes` | 32 MiB | never seen binding; the workspace peak of a rating is 20.8 MB on 26x26 (probe) | `model-too-large` |
| `clueSubsets` | 64 profiles | a Hell call with some rated profiles uses all 64 (164-cell board) | best result or `not-in-band` |
| unrateable call | at most 20 profiles | the Hell calibrations of MP09d2's captures on 300 cells or more (20 capped profiles per attempt) | `not-in-band` after about 38-48 s |
| `slotAttempts` | 12 | not recorded per cell | best rejected candidate or `partial` |
| `dispatchStopMs` | 115 s per job | the set job: every request of the 22 reduced Hell cases, 28 of the 60 Hell 1 requests (15 on 14x14, 13 on 24x24) and 2 Nightmare requests (14x14, 15x15b10); the batch: 54 requests, 31 at Nightmare on 100 to 400 cells and 23 at Hell 1 (3.10) | `time-limit`, or `set:time-limit` in the set job |

### 2.5 What dominates a request (Fact and Analysis)

- **Ratings dominate.**
  - Fact: MP07 measured 98.7-99.9 % of a puzzle's time in its ratings (v2 ratings, 22x22 Hell 3), against
    carving 0.33 s and the layout walk 18-42 ms (`d21-measurements-2026-11-12.md`).
  - Projection: v3 has not been split by stage. The share is expected to be at least as high, because v3 ratings
    cost more.
- **Very easy to Expert**, every board: T10 median at most 3.6 s, and T1 median at most 1 s in the MP12b1 cells; a
  rating takes milliseconds (2.2).
- **Master**: T10 median 1.2 to 9.0 s. The slowest are 10x10 (9.0 s), 26x26 (8.4 s), 12x12 and 22x22 (6.0 s). 10x10
  has the longest deduction tail measured (up to 1.3 s per rating, 2.2).
- **Nightmare**: the set stage (T1 median 0.9 to 43.2 s) and the fold. The boards of 144 to 300 cells are the
  slowest and the least complete (3.7, 3.10).
- **Hell**: the set job runs to the 115 s stop without a set: every request of the 22 reduced Hell cases, and 28 of
  the 60 Hell 1 requests (3.10). MP09d2's captures show unrateable calibrations as the cause on 300 cells and more
  (3.5).
- **Board area** (Analysis):
  - the model grows with the area and with K (K grows as A^0.28), and so does the work per ladder pass;
  - the G that a band needs does not depend on the area;
  - measured at a fixed level, T10 grows only mildly with the area from Hard to Master (Master 2.0 s on 87 cells to
    8.4 s on 676 cells, with 10x10 at 9.0 s as the exception);
  - Nightmare is not monotone in the area (3.7).

## 3. Measured times

### 3.1 Sources

| Measurement | Task, commit | Record |
|---|---|---|
| GV2 baseline (v2 generation, 18 cells) | MP06b, `3bd53bc` | `docs/difficulty-v3/probe-2026-11-12.md` §2; `docs/difficulty-v3/baseline-v2/` |
| Probe corpus (v2-made puzzles rated by the deduction) | MP06b, `3bd53bc` | `probe-2026-11-12.md` §4-§6 and §9 |
| Fit of the knobs | MP06c, `7ddb259` | `docs/difficulty-v3/fit-2026-11-12.md` |
| D21: MP07's clue search with v2 ratings (Hell 3) | MP07, `2b4c5b9` | `docs/difficulty-v3/d21-measurements-2026-11-12.md` |
| D21-V3: Hell under v3, the replacements, availability | MP09d2, `eea5fed` | `docs/difficulty-v3/d21-v3-2026-11-12.md` |
| Calibration slice, rounds 0 to 2 (v3, the 18 GV2 cells) | MP12a, `a1b9354` | `docs/difficulty-v3/calibration-slice-2026-11-13.md`; `docs/difficulty-v3/landscape-v3/r0/`, `r1/`, `r2/` |
| Full landscape (v3, 105 cases) | MP12b1, finished 2026-11-14 at 10:08, not yet committed | `docs/difficulty-v3/landscape-v3-full/`: the per-case reports, `shards-2026-11-13.md` and the aggregate `aggregate-2026-11-14.json` and `.md` |

### 3.2 GV2 baseline (v2 generation)

Fact. T10 median / p95 / max in seconds, 20 requests per cell. The request in-band rate is 100 % except 6x10 easy
(85 %) and 6x10 normal (95 %).

| Board | Easy | Normal | Hard | Expert | Master |
|---|---|---|---|---|---|
| 6x10 | 0.3 / 0.4 / 0.6 | 0.3 / 0.5 / 0.6 | 0.7 / 2.7 / 2.9 | 0.5 / 0.7 / 0.9 | 0.4 / 0.7 / 0.7 |
| 10x10 | 0.3 / 0.4 / 0.4 | 0.3 / 0.4 / 0.4 | 0.3 / 0.5 / 0.8 | 0.4 / 0.6 / 0.7 | 0.7 / 3.4 / 5.8 |
| 12x12 | 0.3 / 0.4 / 0.5 | 0.3 / 0.3 / 0.4 | 0.4 / 1.1 / 2.2 | 0.3 / 0.6 / 1.1 | 0.8 / 1.7 / 6.0 |
| 18x20 | - | - | 0.6 / 0.7 / 0.7 | 0.5 / 0.6 / 0.7 | 0.6 / 0.8 / 1.0 |

### 3.3 Probe corpus (MP06b) and fit (MP06c)

- **Probe** (Fact, `probe-2026-11-12.md` §4, §5 and §9). The deduction on v2-made puzzles:
  - median 1.7 ms (6x10) to 58.6 ms (26x26), p95 83.1 ms, max 985.8 ms;
  - the DLX diagnostic is 0.61 to 1.52 times the deduction at the median; on 18x20, running it makes the build plus
    deduction time 1.67 times longer.
- **The caps come from the probe** (rule D19, twice the largest value, rounded up):
  - the largest main work, 377,809,504 (12x12 master), gives `work` 760,000,000;
  - the largest main nodes, 12,594 (10x10 master), gives `nodes` 30,000.
- **Fit** (Fact, `fit-2026-11-12.md`): the grid of 365,400 knob sets runs in about 8.2 to 8.6 s. The fit only
  re-scores stored measures; it does not generate.

### 3.4 MP07's D21 measurements (v2 ratings, Hell 3)

Fact (`d21-measurements-2026-11-12.md`, "Summary for Fable"). The case: 22x22 Hell 3, K = 73, with MP07's
centre-seeking search over v2 ratings.

- **Per puzzle**: 48 ratings; one rating takes a median of 0.499 s (p95 0.633 s, max 1.260 s), so 24 s per puzzle.
  The ratings are 98.7-99.9 % of the puzzle time.
- **Serial**: 243.2 s for 10 puzzles (set 25.3 s, batch 217.8 s), against 5.75 s before MP07.
- **Real 2-worker flow**: 140.2 s with 9 of 10 puzzles; the batch was cut at the 115 s stop.
- **Origin of the stall stop**: the measured stall rule (N = 12) cuts the rating time of that case from 242.6 s to
  93.9 s (P-OD4).

### 3.5 MP09d2's D21-V3 (v3, Hell)

Fact (`d21-v3-2026-11-12.md` §2, §3, §4 and §6).

- **Hell under v3**:
  - a set attempt whose calibration is unrateable spends 20 capped profiles in 38-48 s, about 2 s per profile;
  - a carve failure costs about 8 s;
  - 22x22 Hell 3: 13 serial attempts took 268.8 s and made no set; the real two-worker flow ended at 115.0 s with
    `N-NOSET` and 0 puzzles (13 attempts dispatched).
- **The replacements** (the Nightmare level):
  - 22x22: 10 puzzles in 6.7 s serial (set 1.5 s, fold 5.2 s) and 4.7 s on two workers;
  - 15x20: 10 puzzles in 81.5 s serial (set 13.6 s, fold 68.0 s; 34 rated and 22 capped profiles over 10 calls).
- **Availability** (3 attempts per capture):
  - only Hell 1 on the 164-cell board (13x13 with 5 blocked) made sets: 2 of 3 attempts, 232 s for the three;
  - the 266-cell board rated Hell 2 above the band (best 281);
  - 400 cells and more, and Hell 2 and Hell 3 at their smallest areas: every profile was capped or above the band.

### 3.6 Calibration slice (MP12a, rounds 0 to 2)

Fact (`calibration-slice-2026-11-13.md`; reports in `landscape-v3/r0`, `r1`, `r2`). The tuple changed between round 0
and round 1 (rule[3] from 2 to 3, the penalty from (0, 0) to (1, 2)); `census` changed from 10M to 80M between round
1 and round 2 (P-OD7).

Round 2, the final round, is the evidence MP12b1 reuses for these 18 cells. T10 median / p95 / max in seconds. The
request in-band rate and the yield equal GV2's: 85 % for 6x10 easy, 95 % for 6x10 normal, 100 % elsewhere.

| Board | Easy | Normal | Hard | Expert | Master |
|---|---|---|---|---|---|
| 6x10 | 0.3 / 0.4 / 0.7 | 0.6 / 1.2 / 1.2 | 0.8 / 2.6 / 2.9 | 0.9 / 1.3 / 1.7 | 1.2 / 1.7 / 1.8 |
| 10x10 | 0.3 / 0.4 / 0.5 | 0.6 / 1.3 / 3.6 | 0.6 / 0.9 / 1.5 | 0.9 / 2.7 / 3.0 | 9.0 / 16.4 / 18.3 |
| 12x12 | 0.4 / 0.5 / 0.5 | 0.9 / 1.4 / 1.6 | 0.6 / 1.5 / 2.4 | 0.9 / 2.5 / 2.8 | 6.0 / 18.4 / 19.0 |
| 18x20 | - | - | 0.9 / 1.7 / 2.0 | 1.5 / 3.3 / 4.4 | 3.4 / 5.3 / 9.6 |

- **v3 against v2** (T10 median): Master is 13 times slower on 10x10, 7.5 times on 12x12 and 5.7 times on 18x20;
  the other cells are at most 3 times slower. Rounds 0 and 1 measured similar times (`landscape-v3/r0`, `r1`).
- **Peak process memory**: 177 to 317 MiB.
- **Census estimates**, round 2 (§6.5):
  - 10x10 master 7.0 % and 18x20 master 11.0 %, both accepted by the owner (P-OD7, P-OD8); every other cell at
    most 2.5 %;
  - at 10M (round 1), five cells were between 12.5 % and 67 %;
  - the cost of 80M against 10M, over 250 probe puzzles: deduction median 49.2 against 45.1 ms, p95 361.9 against
    238.6 ms, max unchanged.
- **Work headroom** (§4.2): the largest complete main work is 58.6 % of the cap, and the largest node count 70.8 % of
  its cap, both in 10x10 master. No `prod` line was capped in any round (C5 passed).
- **Order noise** (§6.4): see 5.5.

### 3.7 MP12b1 per case

Fact, from the reports that the aggregate selected, in `docs/difficulty-v3/landscape-v3-full/`: the 62 cases that are
not Hell (20 requests each) and the 25 Hell prescreens (3 requests each). The three 20-request Hell 1 runs are in 3.10.

**Very easy to Master** (65 cells, with the 18 cells reused from round 2; table 3.8):

- The request in-band rate is 100 % except 6x10 very easy (65 %), 6x10 easy (85 %), 6x10 normal (95 %) and 3x29 very
  easy (90 %).
- T10 max is at most 28.4 s and the response at most 28.5 s.
- The census-estimate share is listed by level below.

| Level | Cells above 5 % census estimates | Largest |
|---|---|---|
| Hard | none (largest 3.5 %, 32x15) | 3.5 % |
| Expert | 26x26 (11.0 %), 24x24 (9.5 %), 22x22 (6.0 %); 20x20 is at 5.0 % | 11.0 % |
| Master | 26x26 (39.5 %), 24x24 (28.5 %), 32x15 (19.5 %), 22x22 (14.0 %), 20x21 (11.5 %), 18x20 (11.0 %, r2), 20x20 (9.5 %), 15x20 (8.5 %), 18x18 (8.5 %), 10x10 (7.0 %, r2) | 39.5 % |

**Nightmare** (15 cells, 20 requests each):

| Cell (cells) | Requests with ten in band | T1 median (s) | T10 median / p95 / max (s) | Max response (s) | Census estimates | Score median | G median |
|---|---|---|---|---|---|---|---|
| 3x29 (87) | 20 / 20 | 0.9 | 5.3 / 7.6 / 9.8 | 9.9 | 192 / 200 (96 %) | 66 | 9 |
| 10x10 (100) | 19 / 20 | 5.1 | 24.0 / 68.4 / 120.6 | 120.6 | 193 / 199 (97 %) | 66 | 8 |
| 12x12 (144) | 17 / 20 | 13.9 | 62.1 / 176.1 / 191.1 | 191.1 | 142 / 185 (77 %) | 68 | 9 |
| 14x14 (196) | 11 / 20 | 43.1 | 113.0 / 151.6 / 212.6 | 212.6 | 48 / 126 (38 %) | 66.5 | 8 |
| 15x15b10 (215) | 11 / 20 | 43.2 | 86.2 / 141.6 / 200.6 | 200.6 | 48 / 141 (34 %) | 66 | 8 |
| 16x16 (256) | 15 / 20 | 20.0 | 79.8 / 135.4 / 150.5 | 150.5 | 71 / 181 (39 %) | 66 | 8 |
| 15x20 (300) | 15 / 20 | 15.8 | 40.1 / 111.2 / 155.7 | 155.7 | 89 / 181 (49 %) | 66 | 8 |
| 18x18 (324) | 20 / 20 | 8.6 | 37.3 / 134.5 / 138.2 | 138.3 | 98 / 200 (49 %) | 66 | 8 |
| 18x20 (360) | 20 / 20 | 3.2 | 16.8 / 63.1 / 63.8 | 64.0 | 99 / 200 (50 %) | 65 | 8 |
| 20x20 (400) | 19 / 20 | 5.6 | 20.1 / 114.0 / 136.7 | 136.7 | 110 / 193 (57 %) | 66 | 8 |
| 20x21 (420) | 20 / 20 | 4.5 | 24.2 / 47.9 / 124.7 | 124.9 | 108 / 200 (54 %) | 66 | 8 |
| 32x15 (480) | 20 / 20 | 3.3 | 11.6 / 37.9 / 41.2 | 41.3 | 127 / 200 (64 %) | 65 | 8 |
| 22x22 (484) | 20 / 20 | 3.7 | 17.3 / 33.9 / 35.9 | 36.1 | 127 / 200 (64 %) | 66 | 8 |
| 24x24 (576) | 20 / 20 | 4.3 | 18.7 / 57.3 / 64.0 | 64.2 | 169 / 200 (85 %) | 67 | 8 |
| 26x26 (676) | 20 / 20 | 5.2 | 18.6 / 31.4 / 35.8 | 36.0 | 194 / 200 (97 %) | 65.5 | 8 |

In every cell, Hard and above, `provedZero` is 0: every accepted Hard-or-above puzzle has a proved decisive guess.

**Hell prescreens** (25 cases, 3 requests each; shard table §2b):

| Case (cells) | Accepted puzzles | Requests | Times |
|---|---|---|---|
| 14x14 Hell 1 (196) | 1 (score 99, G 13, info 37.81, census estimate, count `unknown`) | `set:time-limit` x2, `time-limit` x1 | T1 68.7 s; max response 183.7 s |
| 24x24 Hell 1 (576) | 2 (score median 92.5, G 12, both `many` and census estimates) | `set:time-limit` x2, `time-limit` x1 | T1 67.4 s; max response 182.4 s |
| 26x26 Hell 1 (676) | 25 (score median 96, p95 102, G 12, all `many` and all census estimates) | 2 complete, 1 `time-limit` | T1 82.8 s; T10 median 142.6 s, max 168.3 s; max response 168.5 s |
| the other 22 cases (Hell 1 on 215 to 484 cells; every Hell 2 and Hell 3 case) | 0 | `set:time-limit` x3 | every request to the 115 s stop: 5.8 minutes a case |

The peak process memory of the prescreens is 177 to 655 MiB (24x24 Hell 3). The three cases with a puzzle then ran
20 requests each (3.10).

**Machine time** (shard table §4): 38,022 s in all (10.56 hours): 20,475 s for the 62 cases that are not Hell,
8,920 s for the 25 prescreens and 8,627 s for the three 20-request Hell 1 runs, plus 4,132 s of lock waits.

For comparison, the design's reference rows from the v2 prototype (in every per-case report, "Reference rows"; one
historical maximum per row) are:

- Nightmare: 2.5 s (10x10), 29.8 s (12x12), 11.2 s (16x16) and 10.2 s (18x20);
- Hell 1: 8.3 s (14x14) to 48.6 s (26x26).

### 3.8 Compact table: T10 per board and level

T10 median / p95 / max in seconds. The request in-band rate is given when it is below 100 %. "r2": MP12a round 2;
every other value is MP12b1's. "none in 3": no puzzle in the 3 prescreen requests (reduced, P-OD9). The Hell 1 cells
with puzzles show their 20-request runs.

| Board (cells) | Very easy | Easy | Normal | Hard | Expert |
|---|---|---|---|---|---|
| 6x10 (60) | 0.3 / 0.4 / 0.7 (65 %) | 0.3 / 0.4 / 0.7 (85 %) r2 | 0.6 / 1.2 / 1.2 (95 %) r2 | 0.8 / 2.6 / 2.9 r2 | 0.9 / 1.3 / 1.7 r2 |
| 3x29 (87) | 0.4 / 0.5 / 0.7 (90 %) | 0.3 / 0.4 / 0.4 | 0.7 / 1.3 / 1.5 | 0.5 / 0.8 / 1.0 | 0.7 / 1.5 / 1.6 |
| 10x10 (100) | - | 0.3 / 0.4 / 0.5 r2 | 0.6 / 1.3 / 3.6 r2 | 0.6 / 0.9 / 1.5 r2 | 0.9 / 2.7 / 3.0 r2 |
| 12x12 (144) | - | 0.4 / 0.5 / 0.5 r2 | 0.9 / 1.4 / 1.6 r2 | 0.6 / 1.5 / 2.4 r2 | 0.9 / 2.5 / 2.8 r2 |
| 14x14 (196) | - | 0.4 / 0.5 / 0.6 | 0.8 / 3.9 / 4.6 | 0.7 / 1.2 / 1.3 | 0.9 / 1.6 / 1.8 |
| 15x15b10 (215) | - | 0.4 / 0.5 / 0.6 | 1.4 / 2.6 / 3.4 | 1.2 / 2.1 / 2.9 | 1.6 / 2.8 / 3.3 |
| 16x16 (256) | - | - | 1.4 / 3.9 / 4.9 | 0.8 / 1.3 / 2.0 | 1.2 / 2.1 / 3.4 |
| 15x20 (300) | - | - | 1.1 / 2.1 / 2.7 | 0.7 / 1.2 / 1.4 | 1.3 / 2.3 / 6.4 |
| 18x18 (324) | - | - | 1.0 / 2.8 / 3.7 | 0.8 / 2.0 / 2.6 | 1.5 / 3.9 / 6.3 |
| 18x20 (360) | - | - | - | 0.9 / 1.7 / 2.0 r2 | 1.5 / 3.3 / 4.4 r2 |
| 20x20 (400) | - | - | - | 0.9 / 2.0 / 3.5 | 2.1 / 6.3 / 6.4 |
| 20x21 (420) | - | - | - | 1.0 / 1.7 / 1.9 | 2.4 / 5.7 / 8.4 |
| 32x15 (480) | - | - | - | 1.3 / 2.5 / 4.6 | 2.6 / 5.7 / 6.4 |
| 22x22 (484) | - | - | - | 1.2 / 3.4 / 3.7 | 2.6 / 5.8 / 7.3 |
| 24x24 (576) | - | - | - | 1.7 / 6.1 / 15.8 | 3.4 / 8.9 / 14.8 |
| 26x26 (676) | - | - | - | 1.4 / 4.4 / 4.9 | 3.6 / 6.5 / 23.6 |

| Board (cells) | Master | Nightmare | Hell 1 | Hell 2 | Hell 3 |
|---|---|---|---|---|---|
| 6x10 (60) | 1.2 / 1.7 / 1.8 r2 | - | - | - | - |
| 3x29 (87) | 2.0 / 4.2 / 14.8 | 5.3 / 7.6 / 9.8 | - | - | - |
| 10x10 (100) | 9.0 / 16.4 / 18.3 r2 | 24.0 / 68.4 / 120.6 (95 %) | - | - | - |
| 12x12 (144) | 6.0 / 18.4 / 19.0 r2 | 62.1 / 176.1 / 191.1 (85 %) | - | - | - |
| 14x14 (196) | 2.6 / 16.3 / 17.9 | 113.0 / 151.6 / 212.6 (55 %) | none with ten in 20 (5 puzzles; max 229.1) | - | - |
| 15x15b10 (215) | 5.1 / 18.0 / 28.4 | 86.2 / 141.6 / 200.6 (55 %) | none in 3 | - | - |
| 16x16 (256) | 4.6 / 7.7 / 9.8 | 79.8 / 135.4 / 150.5 (75 %) | none in 3 | - | - |
| 15x20 (300) | 4.0 / 9.1 / 13.6 | 40.1 / 111.2 / 155.7 (75 %) | none in 3 | none in 3 | - |
| 18x18 (324) | 3.5 / 6.8 / 7.0 | 37.3 / 134.5 / 138.2 | none in 3 | none in 3 | - |
| 18x20 (360) | 3.4 / 5.3 / 9.6 r2 | 16.8 / 63.1 / 63.8 | none in 3 | none in 3 | - |
| 20x20 (400) | 4.5 / 7.2 / 10.5 | 20.1 / 114.0 / 136.7 (95 %) | none in 3 | none in 3 | - |
| 20x21 (420) | 4.0 / 6.8 / 7.0 | 24.2 / 47.9 / 124.7 | none in 3 | none in 3 | - |
| 32x15 (480) | 4.6 / 12.4 / 20.5 | 11.6 / 37.9 / 41.2 | none in 3 | none in 3 | none in 3 |
| 22x22 (484) | 6.0 / 13.2 / 16.2 | 17.3 / 33.9 / 35.9 | none in 3 | none in 3 | none in 3 |
| 24x24 (576) | 5.9 / 9.2 / 11.1 | 18.7 / 57.3 / 64.0 | none with ten in 20 (13 puzzles; max 211.4) | none in 3 | none in 3 |
| 26x26 (676) | 8.4 / 16.6 / 23.3 | 18.6 / 31.4 / 35.8 | 108.7 / 167.6 / 206.7 (45 %) | none in 3 | none in 3 |

### 3.9 Slow tests and suites

Fact (`calibration-slice-2026-11-13.md` §3.3, §3.4, §8.8 and §8.9), on the MP12a tree under the lock.

| Test or suite | Seconds |
|---|---|
| 15x20 Nightmare calibration, set attempt 0, K 24 (`tests/clues.test.js:552`; the D36 command A) | 13.7-13.9 |
| unrateable 22x22 Hell 3 calibration, 20 capped profiles (`tests/clues.test.js:564`; the D36 command B) | 42.6-44.8 |
| the two slow clue tests of D36 together | 56.6 |
| slow v3 ordering test on 10x6 and 12x12 (`tests/difficulty-v3.test.js:293`) | 100.4-108.5 |
| UI-flow recipes (`tests/generator-controller.test.js`, 29 tests) | 9.4 |
| quick set (1,340 tests, `slow` skipped) | 23.0 |
| full `npm test` (1,360 tests) | 122.6 (112.3 after round 1) |

### 3.10 Full landscape (MP12b1)

Fact. MP12b1 ended on 2026-11-14 at 10:08. Sources: `docs/difficulty-v3/landscape-v3-full/aggregate-2026-11-14.json`
and `.md`, written by `aggregate.mjs` after its self-test (34 checks), and `shards-2026-11-13.md` (its §4 totals and
§5 named items). The per-cell values below are those of the reports that the aggregate selected; they equal the
numbers of 3.7 and 3.8.

**Identity, coverage and cost.**

- 105 cases on 16 boards, 1,726 requests and 15,933 accepted puzzles.
  - 83 cases are `measured` with 20 requests: the 80 cases that are not Hell (18 of them reused from MP12a's round 2)
    and the three Hell 1 cases whose prescreen made a puzzle.
  - 22 cases are `reduced (P-OD9)`: their 3-request prescreen made no puzzle.
- One source digest (`34cea386…`) and one set of version keys in all 105 reports. Their `meta.sourceCommit` is
  `a1b9354` (9 reports), `917052a` (78) or MP12a's `f33aa71…+uncommitted-changes` (18); only documents and task files
  changed between those commits.
- 229 invocations: 38,022 s of machine time (10.56 hours: 5.69 for the cases that are not Hell, 2.48 for the
  prescreens, 2.40 for the three Hell 1 runs) and 4,132 s of lock wait (the longest 331 s); 12.7 hours of wall clock.
  Every launcher exit was 0 or 3 (the scheduled pause), and the longest invocation took 345.7 s.

**Per cell.**

- "Ten" counts the requests that returned ten in-band puzzles. T1 and T10 are defined at the top of this document.
  The T10 median and p95 use only the requests that reached ten; the max T10 also counts the response of the others.
- "Unrateable samples" are the bench's diagnostic profile samples that were unrateable (capped), over all samples.
  After the timed request, the bench rates random clue subsets of the set's witness, two per clue count around the
  level's initial count, on a fresh pool (`tools/bench/runner.js:421`, `sampleProfiles`). They describe how often a
  rating of that cell caps; they are not the production search and take no part in its times.

| Cell | Area | Ten | T1 median (s) | T10 median / p95 / max (s) | Max response (s) | Peak process (MiB) | Census estimates | Unrateable samples |
|---|---|---|---|---|---|---|---|---|
| 6x10-very-easy | 60 | 13 / 20 | 0.1 | 0.3 / 0.4 / 0.7 | 0.7 | 201 | 0.0 % | 0 of 186 (0.0 %) |
| 6x10-easy | 60 | 17 / 20 | 0.1 | 0.3 / 0.4 / 0.7 | 0.7 | 199 | 0.0 % | 0 of 200 (0.0 %) |
| 6x10-normal | 60 | 19 / 20 | 0.2 | 0.6 / 1.2 / 1.2 | 1.3 | 238 | 0.0 % | 0 of 218 (0.0 %) |
| 6x10-hard | 60 | 20 / 20 | 0.1 | 0.8 / 2.6 / 2.9 | 3.0 | 207 | 0.0 % | 0 of 252 (0.0 %) |
| 6x10-expert | 60 | 20 / 20 | 0.2 | 0.9 / 1.3 / 1.7 | 1.8 | 177 | 0.0 % | 0 of 266 (0.0 %) |
| 6x10-master | 60 | 20 / 20 | 0.3 | 1.2 / 1.7 / 1.8 | 2.0 | 183 | 2.0 % | 0 of 240 (0.0 %) |
| 3x29-very-easy | 87 | 18 / 20 | 0.1 | 0.4 / 0.5 / 0.7 | 0.7 | 218 | 0.0 % | 0 of 200 (0.0 %) |
| 3x29-easy | 87 | 20 / 20 | 0.1 | 0.3 / 0.4 / 0.4 | 0.6 | 218 | 0.0 % | 0 of 218 (0.0 %) |
| 3x29-normal | 87 | 20 / 20 | 0.2 | 0.7 / 1.3 / 1.5 | 1.6 | 243 | 0.0 % | 0 of 262 (0.0 %) |
| 3x29-hard | 87 | 20 / 20 | 0.2 | 0.5 / 0.8 / 1.0 | 1.1 | 216 | 0.0 % | 0 of 240 (0.0 %) |
| 3x29-expert | 87 | 20 / 20 | 0.2 | 0.7 / 1.5 / 1.6 | 1.7 | 216 | 0.0 % | 0 of 266 (0.0 %) |
| 3x29-master | 87 | 20 / 20 | 0.4 | 2.0 / 4.2 / 14.8 | 15.0 | 179 | 2.5 % | 9 of 298 (3.0 %) |
| 3x29-nightmare | 87 | 20 / 20 | 0.9 | 5.3 / 7.6 / 9.8 | 9.9 | 187 | 96.0 % | 8 of 352 (2.3 %) |
| 10x10-easy | 100 | 20 / 20 | 0.1 | 0.3 / 0.4 / 0.5 | 0.6 | 217 | 0.0 % | 0 of 220 (0.0 %) |
| 10x10-normal | 100 | 20 / 20 | 0.2 | 0.6 / 1.3 / 3.6 | 3.8 | 245 | 0.0 % | 0 of 262 (0.0 %) |
| 10x10-hard | 100 | 20 / 20 | 0.2 | 0.6 / 0.9 / 1.5 | 1.6 | 212 | 0.0 % | 0 of 240 (0.0 %) |
| 10x10-expert | 100 | 20 / 20 | 0.2 | 0.9 / 2.7 / 3.0 | 3.1 | 204 | 0.0 % | 10 of 262 (3.8 %) |
| 10x10-master | 100 | 20 / 20 | 1.7 | 9.0 / 16.4 / 18.3 | 18.5 | 185 | 7.0 % | 9 of 290 (3.1 %) |
| 10x10-nightmare | 100 | 19 / 20 | 5.1 | 24.0 / 68.4 / 120.6 | 120.6 | 169 | 97.0 % | 11 of 350 (3.1 %) |
| 12x12-easy | 144 | 20 / 20 | 0.1 | 0.4 / 0.5 / 0.5 | 0.6 | 233 | 0.0 % | 0 of 252 (0.0 %) |
| 12x12-normal | 144 | 20 / 20 | 0.3 | 0.9 / 1.4 / 1.6 | 1.8 | 233 | 0.0 % | 0 of 280 (0.0 %) |
| 12x12-hard | 144 | 20 / 20 | 0.2 | 0.6 / 1.5 / 2.4 | 2.5 | 232 | 0.0 % | 5 of 256 (2.0 %) |
| 12x12-expert | 144 | 20 / 20 | 0.2 | 0.9 / 2.5 / 2.8 | 2.9 | 210 | 0.0 % | 32 of 296 (10.8 %) |
| 12x12-master | 144 | 20 / 20 | 0.8 | 6.0 / 18.4 / 19.0 | 19.1 | 200 | 2.5 % | 64 of 306 (20.9 %) |
| 12x12-nightmare | 144 | 17 / 20 | 13.9 | 62.1 / 176.1 / 191.1 | 191.1 | 175 | 76.8 % | 81 of 360 (22.5 %) |
| 14x14-easy | 196 | 20 / 20 | 0.1 | 0.4 / 0.5 / 0.6 | 0.7 | 236 | 0.0 % | 0 of 240 (0.0 %) |
| 14x14-normal | 196 | 20 / 20 | 0.3 | 0.8 / 3.9 / 4.6 | 4.7 | 241 | 0.0 % | 0 of 280 (0.0 %) |
| 14x14-hard | 196 | 20 / 20 | 0.2 | 0.7 / 1.2 / 1.3 | 1.4 | 259 | 0.0 % | 0 of 264 (0.0 %) |
| 14x14-expert | 196 | 20 / 20 | 0.2 | 0.9 / 1.6 / 1.8 | 2.0 | 243 | 0.0 % | 12 of 338 (3.6 %) |
| 14x14-master | 196 | 20 / 20 | 0.4 | 2.6 / 16.3 / 17.9 | 18.1 | 229 | 2.0 % | 45 of 350 (12.9 %) |
| 14x14-nightmare | 196 | 11 / 20 | 43.1 | 113.0 / 151.6 / 212.6 | 212.6 | 187 | 38.1 % | 116 of 342 (33.9 %) |
| 14x14-hell-1 | 196 | 0 / 20 | 81.8 | - / - / 229.1 | 229.1 | 207 | 100.0 % | 41 of 90 (45.6 %) |
| 15x15b10-easy | 215 | 20 / 20 | 0.2 | 0.4 / 0.5 / 0.6 | 0.7 | 252 | 0.0 % | 0 of 240 (0.0 %) |
| 15x15b10-normal | 215 | 20 / 20 | 0.3 | 1.4 / 2.6 / 3.4 | 3.6 | 282 | 0.0 % | 0 of 280 (0.0 %) |
| 15x15b10-hard | 215 | 20 / 20 | 0.3 | 1.2 / 2.1 / 2.9 | 2.9 | 272 | 0.0 % | 0 of 266 (0.0 %) |
| 15x15b10-expert | 215 | 20 / 20 | 0.3 | 1.6 / 2.8 / 3.3 | 3.4 | 270 | 0.0 % | 6 of 332 (1.8 %) |
| 15x15b10-master | 215 | 20 / 20 | 0.6 | 5.1 / 18.0 / 28.4 | 28.5 | 241 | 3.0 % | 35 of 352 (9.9 %) |
| 15x15b10-nightmare | 215 | 11 / 20 | 43.2 | 86.2 / 141.6 / 200.6 | 200.6 | 202 | 34.0 % | 111 of 342 (32.5 %) |
| 16x16-normal | 256 | 20 / 20 | 0.3 | 1.4 / 3.9 / 4.9 | 5.0 | 285 | 0.0 % | 0 of 274 (0.0 %) |
| 16x16-hard | 256 | 20 / 20 | 0.2 | 0.8 / 1.3 / 2.0 | 2.2 | 263 | 0.0 % | 0 of 280 (0.0 %) |
| 16x16-expert | 256 | 20 / 20 | 0.4 | 1.2 / 2.1 / 3.4 | 3.5 | 269 | 0.5 % | 4 of 326 (1.2 %) |
| 16x16-master | 256 | 20 / 20 | 0.9 | 4.6 / 7.7 / 9.8 | 9.9 | 274 | 3.5 % | 34 of 350 (9.7 %) |
| 16x16-nightmare | 256 | 15 / 20 | 20.0 | 79.8 / 135.4 / 150.5 | 150.5 | 216 | 39.2 % | 114 of 360 (31.7 %) |
| 15x20-normal | 300 | 20 / 20 | 0.4 | 1.1 / 2.1 / 2.7 | 2.9 | 303 | 0.0 % | 0 of 262 (0.0 %) |
| 15x20-hard | 300 | 20 / 20 | 0.2 | 0.7 / 1.2 / 1.4 | 1.6 | 263 | 0.0 % | 0 of 304 (0.0 %) |
| 15x20-expert | 300 | 20 / 20 | 0.3 | 1.3 / 2.3 / 6.4 | 6.6 | 300 | 1.5 % | 1 of 348 (0.3 %) |
| 15x20-master | 300 | 20 / 20 | 0.8 | 4.0 / 9.1 / 13.6 | 13.8 | 272 | 8.5 % | 29 of 352 (8.2 %) |
| 15x20-nightmare | 300 | 15 / 20 | 15.8 | 40.1 / 111.2 / 155.7 | 155.7 | 229 | 49.2 % | 109 of 360 (30.3 %) |
| 18x18-normal | 324 | 20 / 20 | 0.4 | 1.0 / 2.8 / 3.7 | 3.8 | 311 | 0.0 % | 0 of 240 (0.0 %) |
| 18x18-hard | 324 | 20 / 20 | 0.2 | 0.8 / 2.0 / 2.6 | 2.7 | 289 | 0.0 % | 0 of 300 (0.0 %) |
| 18x18-expert | 324 | 20 / 20 | 0.4 | 1.5 / 3.9 / 6.3 | 6.5 | 314 | 1.0 % | 2 of 350 (0.6 %) |
| 18x18-master | 324 | 20 / 20 | 1.0 | 3.5 / 6.8 / 7.0 | 7.1 | 312 | 8.5 % | 18 of 350 (5.1 %) |
| 18x18-nightmare | 324 | 20 / 20 | 8.6 | 37.3 / 134.5 / 138.2 | 138.3 | 278 | 49.0 % | 100 of 360 (27.8 %) |
| 18x20-hard | 360 | 20 / 20 | 0.2 | 0.9 / 1.7 / 2.0 | 2.1 | 299 | 0.0 % | 0 of 334 (0.0 %) |
| 18x20-expert | 360 | 20 / 20 | 0.4 | 1.5 / 3.3 / 4.4 | 4.5 | 285 | 1.0 % | 2 of 354 (0.6 %) |
| 18x20-master | 360 | 20 / 20 | 0.4 | 3.4 / 5.3 / 9.6 | 9.8 | 317 | 11.0 % | 17 of 348 (4.9 %) |
| 18x20-nightmare | 360 | 20 / 20 | 3.2 | 16.8 / 63.1 / 63.8 | 64.0 | 270 | 49.5 % | 77 of 360 (21.4 %) |
| 20x20-hard | 400 | 20 / 20 | 0.3 | 0.9 / 2.0 / 3.5 | 3.7 | 323 | 1.5 % | 0 of 314 (0.0 %) |
| 20x20-expert | 400 | 20 / 20 | 0.5 | 2.1 / 6.3 / 6.4 | 6.5 | 343 | 5.0 % | 6 of 350 (1.7 %) |
| 20x20-master | 400 | 20 / 20 | 0.7 | 4.5 / 7.2 / 10.5 | 10.7 | 335 | 9.5 % | 15 of 356 (4.2 %) |
| 20x20-nightmare | 400 | 19 / 20 | 5.6 | 20.1 / 114.0 / 136.7 | 136.7 | 319 | 57.0 % | 78 of 360 (21.7 %) |
| 20x21-hard | 420 | 20 / 20 | 0.3 | 1.0 / 1.7 / 1.9 | 2.1 | 325 | 1.0 % | 0 of 306 (0.0 %) |
| 20x21-expert | 420 | 20 / 20 | 0.6 | 2.4 / 5.7 / 8.4 | 8.6 | 318 | 4.5 % | 4 of 360 (1.1 %) |
| 20x21-master | 420 | 20 / 20 | 1.1 | 4.0 / 6.8 / 7.0 | 7.1 | 323 | 11.5 % | 14 of 356 (3.9 %) |
| 20x21-nightmare | 420 | 20 / 20 | 4.5 | 24.2 / 47.9 / 124.7 | 124.9 | 338 | 54.0 % | 68 of 360 (18.9 %) |
| 32x15-hard | 480 | 20 / 20 | 0.3 | 1.3 / 2.5 / 4.6 | 4.8 | 343 | 3.5 % | 0 of 342 (0.0 %) |
| 32x15-expert | 480 | 20 / 20 | 0.7 | 2.6 / 5.7 / 6.4 | 6.6 | 327 | 2.5 % | 0 of 360 (0.0 %) |
| 32x15-master | 480 | 20 / 20 | 1.1 | 4.6 / 12.4 / 20.5 | 20.7 | 375 | 19.5 % | 8 of 352 (2.3 %) |
| 32x15-nightmare | 480 | 20 / 20 | 3.3 | 11.6 / 37.9 / 41.2 | 41.3 | 348 | 63.5 % | 49 of 366 (13.4 %) |
| 22x22-hard | 484 | 20 / 20 | 0.3 | 1.2 / 3.4 / 3.7 | 3.8 | 382 | 0.0 % | 0 of 348 (0.0 %) |
| 22x22-expert | 484 | 20 / 20 | 0.6 | 2.6 / 5.8 / 7.3 | 7.4 | 367 | 6.0 % | 3 of 360 (0.8 %) |
| 22x22-master | 484 | 20 / 20 | 1.1 | 6.0 / 13.2 / 16.2 | 16.3 | 368 | 14.0 % | 14 of 348 (4.0 %) |
| 22x22-nightmare | 484 | 20 / 20 | 3.7 | 17.3 / 33.9 / 35.9 | 36.1 | 349 | 63.5 % | 63 of 370 (17.0 %) |
| 24x24-hard | 576 | 20 / 20 | 0.4 | 1.7 / 6.1 / 15.8 | 15.9 | 399 | 1.5 % | 1 of 334 (0.3 %) |
| 24x24-expert | 576 | 20 / 20 | 1.0 | 3.4 / 8.9 / 14.8 | 15.0 | 406 | 9.5 % | 3 of 360 (0.8 %) |
| 24x24-master | 576 | 20 / 20 | 0.9 | 5.9 / 9.2 / 11.1 | 11.2 | 457 | 28.5 % | 11 of 350 (3.1 %) |
| 24x24-nightmare | 576 | 20 / 20 | 4.3 | 18.7 / 57.3 / 64.0 | 64.2 | 431 | 84.5 % | 85 of 394 (21.6 %) |
| 24x24-hell-1 | 576 | 0 / 20 | 78.8 | - / - / 211.4 | 211.4 | 484 | 100.0 % | 42 of 126 (33.3 %) |
| 26x26-hard | 676 | 20 / 20 | 0.5 | 1.4 / 4.4 / 4.9 | 5.0 | 496 | 1.5 % | 2 of 320 (0.6 %) |
| 26x26-expert | 676 | 20 / 20 | 0.6 | 3.6 / 6.5 / 23.6 | 23.7 | 475 | 11.0 % | 2 of 360 (0.6 %) |
| 26x26-master | 676 | 20 / 20 | 1.3 | 8.4 / 16.6 / 23.3 | 23.5 | 517 | 39.5 % | 13 of 348 (3.7 %) |
| 26x26-nightmare | 676 | 20 / 20 | 5.2 | 18.6 / 31.4 / 35.8 | 36.0 | 557 | 97.0 % | 69 of 400 (17.3 %) |
| 26x26-hell-1 | 676 | 9 / 20 | 44.8 | 108.7 / 167.6 / 206.7 | 206.7 | 575 | 100.0 % | 115 of 360 (31.9 %) |
| the 22 reduced Hell cases (list 1) | 215-676 | 0 / 3 each | - | - / - / 115.0 | 115.0 | 194-655 | - | - |

**Hell (the run plan of P-OD9; check-list D39).**

| Case (cells) | Prescreen (3 requests) | 20-request run | Outcomes of the 20 requests | T1 median (s) | T10 median / p95 / max (s) | Score, G, info (medians) | Solutions few / many / unknown |
|---|---|---|---|---|---|---|---|
| 14x14 Hell 1 (196) | 1 puzzle | 5 puzzles, one in each of 5 requests; 0 of 20 with ten | `set:time-limit` x15, `time-limit` x5 | 81.8 | - / - / 229.1 | 97, 13, 36.92 | 3 / 1 / 1 |
| 24x24 Hell 1 (576) | 2 puzzles | 13 puzzles in 7 requests; 0 of 20 with ten | `set:time-limit` x13, `time-limit` x7 | 78.8 | - / - / 211.4 | 97, 12, 44.33 | 0 / 13 / 0 |
| 26x26 Hell 1 (676) | 25 puzzles; 2 of 3 with ten | 134 puzzles, every request some; 9 of 20 with ten (45 %) | ten x9, `time-limit` x11 | 44.8 | 108.7 / 167.6 / 206.7 | 97, 12, 44.28 | 2 / 132 / 0 |
| the other 22 Hell cases | no puzzle | not run (reduced, P-OD9) | `set:time-limit` x3 each, at 115.0 s | - | - | - | - |

- All 152 accepted Hell 1 puzzles are census estimates, of deduction tier 3, with `provedZero` 0.
- D39: a case meets when it has 20 requests, the status `measured` and a request in-band rate of at least 0.9. No case
  meets; the best is 26x26 Hell 1 at 0.45. MP12b2 derives the areas and MP12b3 writes them: by D39, every Hell level
  gets `[Infinity, Infinity]` (Projection until MP12b2's record states it).

**The three lists of the aggregate.**

1. Cells without a puzzle: 22, exactly the reduced Hell cases. They are Hell 1 on 15x15b10, 16x16, 15x20, 18x18,
   18x20, 20x20, 20x21, 32x15 and 22x22, and every Hell 2 and Hell 3 case. Every cell that is not Hell made puzzles.
2. Cells whose scores never reach the central half of their band: none.
3. Cells with more than 5 % census estimates: 31.
   - 20 are above 25 %: the 15 Nightmare cells (34.0 to 97.0 %), Master on 24x24 and 26x26 (28.5 and 39.5 %), and the
     three Hell 1 cells (100 %).
   - 11 lie between 5 and 25 %: Master on 10x10 (7.0 %), 15x20 (8.5), 18x18 (8.5), 18x20 (11.0), 20x20 (9.5), 20x21
     (11.5), 32x15 (19.5) and 22x22 (14.0 %), and Expert on 22x22, 24x24 and 26x26 (6.0, 9.5 and 11.0 %).

**Other named items of the shard table (§5).**

- Completion below 90 % outside Hell: 7 of 80 cells.
  - 6x10 Very easy 13 of 20 (65 %; 7 requests ended `layouts-not-found`) and 6x10 Easy 17 of 20 (85 %, a slice cell).
  - Nightmare on 12x12 (85 %), 14x14 (55 %), 15x15b10 (55 %), 16x16 (75 %) and 15x20 (75 %). Their short requests
    ended `time-limit` with the puzzles they had; one each on 14x14 and 15x15b10 ended `set:time-limit`.
- `provedZero` is 0 in all 83 cells with a v3 block (66 of them Hard or above).
- The tools' outcome line is "blocked". Its 62 blockers are criterion 1 (at least 90 % of 20 requests with ten,
  counted for a reduced case over its 3 requests) in 32 cells, and the reference rows (twice the design table's
  historical Node maxima, pre-v3 prototype values) in 30 rows. The GV2 baseline (v2) already had a "blocked" report by
  the same rule: `baseline-v2/6x10-easy-2026-11-12.md`, 0.61 s against 2 x 0.1 s.

**The slowest cells.**

- By T10 median: 14x14 Nightmare 113.0 s, 26x26 Hell 1 108.7 s, 15x15b10 Nightmare 86.2 s, 16x16 Nightmare 79.8 s,
  12x12 Nightmare 62.1 s, 15x20 Nightmare 40.1 s and 18x18 Nightmare 37.3 s. No Master cell exceeds 9.0 s.
- By maximum response: 14x14 Hell 1 229.1 s, 14x14 Nightmare 212.6 s, 24x24 Hell 1 211.4 s, 26x26 Hell 1 206.7 s,
  15x15b10 Nightmare 200.6 s and 12x12 Nightmare 191.1 s.
- By request time per cell (all its requests): Nightmare 105 s (3x29) to 2,684 s (14x14); a Hell 1 run 2,747 to
  2,857 s; a reduced Hell case 3 x 115 s.

**Requests over 120 s** (the shard table's §5 item 6, checked request by request in the selected reports).

- 70 of the 1,726 requests answered after more than 120 s; the maximum is 229.1 s (14x14 Hell 1).
  - Nightmare 43: 14x14 12, 15x15b10 10, 16x16 7, 15x20 5, 12x12 4, 18x18 2, and 10x10, 20x20 and 20x21 1 each.
  - Hell 1 27: 26x26 15, 24x24 7 and 14x14 5.
- 54 of them ended `time-limit` in the batch with fewer than ten puzzles; 16 reached ten puzzles, but after 120 s.
- Each action stayed inside its own budget (design D37: one budget per action, answer by 120 s):
  - the set stage (T1) took at most 114.1 s;
  - the batch after it took at most 115.2 s;
  - a request without a set answered at 115.0 s at most.

  What these requests exceed is the 120 s of the set request and its immediate batch together: the bench's
  `CRITERIA.responseMs`, which is criterion 1 of the browser qualification BQ-0 to BQ-3 (design §8.7, "no run answers
  later than 120 s").

## 4. What will still change before the final

| Part | What changes in the generator | Expected effect on time |
|---|---|---|
| MP12b2 (lock; dispatched after the pause of P-OD11) | No generation change unless a change round is ordered: only when C1 or C3 fails in a cell that stays offered, or C2 fails by more than 10 points (PR-P1). It locks the tuple, writes design §7.8 (with R7, one canonical order, as a known limitation), puts the owner questions (fail-fast, population R, census cells above 25 %) and derives the Hell areas | Projection: none. MP12b1 shows C2 at 100 % in every Hard and Expert cell, `provedZero` 0 everywhere and score medians ordered on every board, so no change round is expected. No census change is allowed (PR-P1) |
| MP12b3 part A (Hell `AREAS`, `POLICY_ID` `mixed-v3`) | A Hell level is offered only where a 20-request case meets D39 (request in-band rate at least 0.9); a reduced case never meets. Design §7.5, both user guides and the Generator's list follow | Projection from MP12b1's aggregate: no case meets (the best, 26x26 Hell 1, completes 45 %), so every Hell level gets `[Infinity, Infinity]` and no Hell request is made any more. That removes the 115 s requests without a set (all 66 of the reduced cases and 28 of the 60 Hell 1 requests) and the 27 Hell 1 requests that answered after 120 s. No other level changes: the Nightmare cells below 90 % completion stay offered, because D39 covers Hell only |
| MP12b3 part B (fail-fast, if the owner chooses it) | F2: an unrateable call stops after 4 profiles instead of 20. F1: a set request ends at its lowest unrateable attempt, with a notice | Projection. An unrateable call takes about 8-10 s instead of 38-48 s. With F1 + F2, an unrateable set request ends after about 8 to 16 s on 4 workers (about 40-48 s with F1 alone) instead of 115 s. After part A no Hell level is offered, so it acts at Nightmare and below: on 144 cells and more, 13.4 to 33.9 % of MP12b1's Nightmare diagnostic samples were unrateable, and 2 Nightmare requests ended without a set. F2 can change a Nightmare result where a call today recovers after four capped profiles. That is not measured: MP12b2's false-stop check reads its R, A, H and HL captures, none of them at Nightmare. D40 treats a changed fixture puzzle or recipe as a false stop |
| MP12b3 part C (population R, if the owner accepts (R-a)) | Hard and above with `--uniqueness require` stop being offered from the area A0 (proposed 360) | Projection: no effect on the cells that stay offered; it removes requests that end without a puzzle |
| MP13a, MP13b (provenance) | Records in packs, and skip ordinals in `selectClues`' result (at most 64 subset and 16 repair ordinals per call) | Projection: negligible; no extra rating. Generation results do not change |
| MP14a, MP14b (recorders, work meter) | Observers and the optional `charge` meter | Fact from the task files: "ratings, clue sets, repairs, RNG draws and results are identical with and without `record` and `charge`", and without a recorder "the call path is exactly today's". Projection: no time change in generation |
| MP15a1, MP15a2, MP15b (replay) | A replay engine and a worker task, run on demand as an auxiliary request | Outside generation time; it gives way to every new generation. Bounded by `REPLAY` (MP15a1): 4,096 steps, 4 MiB, work 256 x (760M + 80M) = 215.04 billion units. Projection: at most about 8 to 11 minutes of one worker at the measured rate |
| MP16a, MP16b (dialog) | UI only | none |
| MP17 (gate GZ) | Evidence only: fixture checks, `npm test`, the plan §6 probe and level runs on 10x6 and 20x18, release notes. "No re-run allowance" for `puzzle-code-acceptance` (KI-1, D1) | about 70-100 minutes of machine time (its task file); no generation change |

## 5. Open performance facts for the plan author

Facts and projections only.

### 5.1 The budgets of 60, 115 and 120 s

Fact, from MP12b1's aggregate with MP12a's round 2 (3.10):

- **Very easy to Master** (65 cells): every time criterion of the bench holds. T10 max is at most 28.4 s and the
  response at most 28.5 s. Completion is below 90 % only on 6x10 Very easy (65 %) and Easy (85 %), a board with few
  layouts (7 Very easy requests ended `layouts-not-found`).
- **Nightmare** (15 cells), against the bench criteria:

  | Criterion | Cells that fail it |
  |---|---|
  | request in-band rate at least 90 % | 12x12 (85 %), 14x14 (55 %), 15x15b10 (55 %), 15x20 (75 %) and 16x16 (75 %) |
  | T10 median at most 60 s | 12x12 (62.1 s), 14x14 (113.0 s), 15x15b10 (86.2 s) and 16x16 (79.8 s) |
  | T10 p95 at most 115 s | 12x12, 14x14, 15x15b10, 16x16 and 18x18 (134.5 to 176.1 s) |
  | response at most 120 s | 9 cells, 120.6 to 212.6 s: 10x10, 12x12, 14x14, 15x15b10, 16x16, 15x20, 18x18, 20x20 and 20x21 |

  The boards of 360 cells and more have a T10 median of 11.6 to 24.2 s. The bench verdict is `fail` for 9 Nightmare
  cells.
- **The mid boards are the hard ones at Nightmare.** The boards of 144 to 300 cells have the longest set stage (T1
  median 13.9 to 43.2 s) and the lowest completion.
  - They have the highest unrateable share of the diagnostic samples: 27.8 to 33.9 % on 196 to 324 cells (22.5 % on
    144), against 13.4 to 21.7 % on 360 to 676 cells and 2.3 and 3.1 % on 87 and 100 cells. A capped profile costs
    about 2 s.
  - They also have the lowest census-estimate shares at Nightmare: 34 % to 49 % on 196 to 324 cells, against 85 % to
    97 % on 24x24 and 26x26 and 96 % to 97 % on 3x29 and 10x10.
  - Analysis: an unfinished census counts undecided alternatives as failing (an upper estimate of G), which raises
    the score. Whether this explains why the large boards are fast at Nightmare is not measured.
- **Response time.**
  - 70 of the 1,726 requests answered after more than 120 s: 43 at Nightmare (on 100 to 420 cells) and 27 at Hell 1;
    the maximum is 229.1 s (3.10).
  - Each action stayed inside its own budget (design D37: one budget per action, answer by 120 s). The set stage
    took at most 114.1 s and the batch after it at most 115.2 s.
  - What fails is the 120 s of the set request and its immediate batch together: the bench's `CRITERIA.responseMs`,
    which is also criterion 1 of the browser qualification (design §8.7, "no run answers later than 120 s").
- **Hell**: every request of the 22 reduced cases, and 28 of the 60 Hell 1 requests, ended at the 115 s stop without
  a set (3.10).
- **No browser or phone timing of v3 exists.**
  - Every measurement above is Node on a server CPU with 4 workers. The qualification gates BQ-0 to BQ-3 are
    `not-run`, and BQ runs are later work outside difficulty-v3 (MP12b3's out-of-scope list).
  - Projection: a device with fewer cores gets fewer workers (`min(4, hardwareConcurrency)`), and rating-bound cells
    slow down in proportion.
  - Projection by the design's planning rule (§8.7: until reports exist, browser time = 5 s + 4 x Node time). The
    Nightmare T10 medians become about 26 s (3x29), 101 s (10x10), 253 s (12x12), 457 s (14x14), 350 s (15x15b10),
    324 s (16x16), 165 s (15x20), 154 s (18x18) and 51 to 102 s on 360 to 676 cells. Master reaches about 41 s at
    most (10x10). The rule ignores the 115 s stop of each action, which would cut such requests short.
  - Against BQ's criteria (T10 median at most 60 s, at least 90 % of the runs with ten), every Nightmare cell would
    fail by that projection except 3x29 and 32x15. The design's rule for a failing BQ cell is "A level that fails at
    an area is never offered there" (§8.7).

### 5.2 Hell availability

- Fact (3.7, 3.10): 3 of the 25 Hell prescreens made a puzzle, all Hell 1, on 196, 576 and 676 cells; Hell 1 made
  nothing in 3 requests on 215 to 484 cells. The availability is not contiguous in area (a named item of MP12b1's
  shard table §2b).
- Fact (3.10): the 20-request runs of those three cases completed 0 % (14x14, 5 puzzles), 0 % (24x24, 13 puzzles)
  and 45 % (26x26, 134 puzzles). No Hell case meets D39's 90 %.
- Fact (3.5): on the 164-cell board, Hell 1 made sets in 2 of 3 attempts. That board is not in the landscape
  matrix.
- Fact: every accepted Hell puzzle (152) is a census estimate of deduction tier 3; 146 have `many` solutions
  (`any` mode).
- Fact: the design's reference rows (historical measurements of the v2 prototype, one maximum per row; 3.7) give
  Hell 1 at 8.3 to 48.6 s and Hell 3 at 11.5 to 23.6 s on the boards they name.
- Projection (D39, from the aggregate): no Hell level is offered after MP12b3; every one gets `[Infinity, Infinity]`.
  MP12b2's record derives this first.
- Fact (MP12b2's task file, its capture table): MP12b2 still makes 25 Hell captures, H (5 of at most 300 s) and HL
  (17 of at most 180 s and 3 of at most 570 s): at most about 105 minutes of machine time. MP12b1's slot exception
  (MP12b2's dispatch addendum) uses H's and HL's captures of the 16 no-puzzle cases that overlapped Sudoku's unlocked
  cells.
- Analysis (2.3): a Hell band centre needs about 12 (Hell 1), 18 (Hell 2) or 27 (Hell 3) decisive guesses, and a
  complete Nightmare rating already needs about 8.

### 5.3 The census estimates

- Fact: `DEDUCE.census` is 80,000,000 units, about 0.25 s per rating at the measured rate. It was raised from 10M by
  the owner (P-OD7), and the remaining estimates of 10x10 and 18x20 Master were accepted (P-OD7, P-OD8).
- Fact (3.10, list 3): the shares are Hard at most 3.5 %, Expert at most 11.0 %, Master up to 39.5 %, Nightmare
  34.0 % to 97.0 % and Hell 1 100 %.
  - 20 cells are above 25 %: the 15 Nightmare cells, 24x24 Master, 26x26 Master and the three Hell 1 cells.
  - 11 more are above 5 %.
- Fact: the rule of PR-P1 applies to the full landscape.
  - A cell above 5 % is a listed finding, shipped with the estimate note and the `censored` flag.
  - A cell above 25 % goes to the owner at MP12b2, with the cost of a larger census.
  - MP12b has no census change.
- Fact (the cost of a larger budget), 10M to 80M on 250 probe puzzles: deduction median +4.1 ms, p95 +123.3 ms.
  No measurement exists above 80M or at Nightmare.
- Projection: a rating whose census runs out spends the whole budget, so the time per rating of such ratings grows
  linearly with the budget, about 0.25 s per 80M units.

### 5.4 The work headroom

- Fact (round 2, complete ratings): the largest main work is 58.6 % of the cap and the largest node count 70.8 % of
  its cap, both in 10x10 Master. Every other measured cell is at most 16.1 % (work).
- Fact: no measurement of work or nodes exists at Nightmare or Hell. There the cap shows up as unrateable profiles:
  in MP09d2's captures (3.5) and in MP12b1's diagnostic samples (3.10: up to 33.9 % at Nightmare and up to 45.6 % at
  Hell 1). MP12b2's search evidence records the capped outcomes per cell of its captures.
- Fact: a capped profile costs the whole cap: about 2 s measured (MP09d2), 2.4 s at the median work rate.

### 5.5 Order noise

- Fact (`calibration-slice-2026-11-13.md` §6.4, round 2, 18 cells). The tie order of the deduction moves G by at most
  2 and the v3 score by:
  - up to 12 at Hard (12x12);
  - 7 at Expert (11 on 6x10);
  - 6 to 13 at Master.
- Fact: generation and rating use one canonical order, so a stored score is stable. No aggregation over orders was
  adopted (RES-13). MP12b2 writes this as known limitation R7 in design §7.8.
- Fact: no order-noise measurement exists at Nightmare or Hell.
- Analysis: one decisive guess is worth 5 points or more, and the Nightmare central half is +/- 6 points.

### 5.6 Complexity risks

1. **G and the cost.** The G a band needs grows linearly with the band centre, and the band edges grow by a factor of
   1.45 per level (2.3). The measured cost per rating grows faster than linearly with G:
   - Easy to Hard: below 1 % of the work cap;
   - Master: up to 58.6 %;
   - Nightmare: capped profiles;
   - Hell: almost every profile capped in MP09d2's captures on 300 cells and more.
2. **No set means the full 115 s.** Set attempts have no count limit, so a request that makes no set always costs the
   full 115 s on every worker. In MP12b1 that was every request of the 22 reduced Hell cases, 28 of the 60 Hell 1
   requests and 2 Nightmare requests (14x14, 15x15b10).
3. **One task can outlast the stop** (Analysis). A single selection call can take 64 profiles x about 2.4 s, about
   150 s, longer than the 115 s stop. MP07 measured a longest `puzzleCandidate` task of 25.0 s under v2.
4. **Census estimates are upper estimates.** At Nightmare most accepted puzzles of the large boards carry such
   estimates (5.3).
5. **Nightmare on the mid boards** (144 to 300 cells) is slow and incomplete in Node already (5.1). It is the
   largest share of the requests over 120 s once Hell is withdrawn (43 of 70), and the design's planning rule puts its
   browser T10 far above 60 s (5.1).
6. **Memory.**
   - The workspace peak of a rating is at most 20.8 MB (26x26, probe); the deduction buffers alone must fit 32 MiB.
   - The bench's peak process is at most 654.7 MiB (24x24 Hell 3) of the 1.5 GiB criterion.
   - The peak accounted memory is at most 404.2 MiB (26x26 Hell 3).
7. **The DLX diagnostic** runs on every completed rating; on 18x20 it makes the build plus deduction time 1.67 times
   longer (below RES-19's threshold).
8. **Evidence costs machine time.** MP12b1 took 10.56 hours of machine time and 1.15 hours of lock wait, 12.7 hours
   of wall clock (shard table §4).
9. **Facts about the evidence still planned.**
   - MP12b2's fail-fast false-stop check reads its captures R (`require`: 6x10 Easy to Master, 18x20 Hard to Master),
     A (`any`: 6x10, 10x10, 12x12 and 18x20, Hard to Master), H and HL (Hell). None is at Nightmare, where the
     unrateable calls remain once no Hell level is offered (2.3, 4).
   - MP12b2's 25 Hell captures stay in its plan (5.2), although no Hell case met D39 in MP12b1.
   - The calibration tools' outcome is "blocked" (3.10). Its reference rows are the design table's pre-v3 prototype
     maxima, and a GV2 (v2) baseline report already failed them. MP12b3 retires the Hell rows (its A5); no task
     replaces the other rows.
