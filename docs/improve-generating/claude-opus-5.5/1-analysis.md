# Improve generating (Pentomino): independent analysis of the plan (SA1, claude-opus-5.5)

Status: phase-1 analysis, 2026-11-14, of [docs/improve-generating/plan.md](../plan.md) (plan author Fable,
claude-fable-5-2) against the code of the worktree `improve-generating` at `cd5d17f`. Read-only: no code, test, fixture or
record changed; no generation, test, bench, landscape or timing run; no timing lock touched. Every number comes from
committed evidence, recomputed with small `node` scripts that read the JSON reports only (no engine loaded). Paths are
repository-relative. The other analyst's files were not read.

Labels: **Measured** (a recorded number, with its source), **Derived** (computed from measured numbers; the formula is
given), **Projection** (depends on an assumption, which is stated). Ranges read low / likely / high, or `likely [best -
worst]` in the tables.

---

## 0. Summary and verdict

The plan's diagnosis is correct and, unusually, already testable from the committed evidence: MP12b1's bench drew
diagnostic profile samples at seven clue shares on every measured cell, and those samples are coarse count curves. They
confirm the central claim (the search starts in the capped zone and cannot leave it) and locate the windows that P1 and
P4 are meant to find. The proposals are sound in direction; several details need correction before a design.

1. **The count curves exist (Derived from MP12b1).** At Nightmare the in-band share of random clue subsets peaks at a clue
   share of about 0.25 on 100 to 300 cells (40 to 75 % of rateable samples in band, 3 to 16 % capped), while the start
   share 0.14 is 53 to 89 % capped on 144 to 324 cells. On 360 to 676 cells the peak is at 0.14 (10 to 43 % capped), which
   is why those boards are fast today. At Hell 1 the band lies between shares 0.10 (88 to 100 % capped) and 0.25 (0 %
   capped, median score 62 to 63) on 24x24 and 26x26, and near 0.40 on 14x14 (60 % capped even there). `SHARES` is off at
   Nightmare on 100 to 324 cells and at Hell 1; PM1 can be cut to the cells without samples (§2.2, §6).
2. **In-band ratings are not cheap where it matters.** The accepted Nightmare puzzles of MP12b1 have a median total work
   (search plus census) of 107 to 485 M units, 0.3 to 1.5 s; on 10x10 and 12x12 the 90th percentile is the cap plus the
   census (820 to 840 M). Accepted Hell 1 puzzles: 337 M (26x26), 346 M (24x24), 840 M for all five on 14x14 (§2.3).
3. **P2's first screen value is too low for Nightmare.** At `W_screen` = 95 M most in-band Nightmare ratings would be
   screen-capped, many before their first solution, and P3 would then read them as "too few clues": the bracket would
   settle on the cheap side of the band. PM1 must record the work to the first solution, which no current metric holds;
   a Nightmare screen near 190 to 380 M cuts a capped profile to 0.6 to 1.2 s, a saving of 2 to 4 times rather than 8.
4. **P2's second row is not exact.** When the screen stops the solution count after the first solution, fewer
   alternatives are settled by the count (`deduce.js:1635`), so the census (same 80 M budget, `deduce.js:1747`) leaves a
   different set undecided: G and info can differ from the canonical values, not only the penalty. "Within 2 points"
   holds only when both censuses complete; 34 to 100 % of Nightmare and Hell puzzles are census estimates. Acceptance stays
   correct (accepted puzzles are re-rated canonically); siding can be wrong.
5. **P1's pseudo-code has three holes:** the gallop stops without a bracket when `hi - step < 1` (no clamp to count 1);
   there is no branch when the first profile is ABOVE or TOO_FEW; and at Hard and above the cheap-side profile is usually
   refused by AR1 (`Gproved = 0`, `clues.js:273-274`) and returned as `spent`, so it gives no direction. AR1-refused
   ratings know their score and should count as BELOW.
6. **The parallel bisection breaks pool invariance** unless its arity is fixed: a (P + 1)-ary search probes different
   counts for different P.
7. **P4's prior makes every slot depend on an optional input.** `generator/jobs.js:388-390,417` passes the calibration
   only when it is reusable (same level and uniqueness, trusted); with P4 the whole batch, not only slot 1, depends on
   that. The prior must be recorded with the request (and the pack meta) or derived from the set alone.
8. **P6 saves nothing on capped profiles** (the DLX diagnostic runs only after a complete path, `difficulty.js:244-253`);
   it is worth about 1.03 times at Nightmare today, about 1.1 after P1 to P5, and 1.15 to 1.6 at Master. The DLX fields
   are stored in packs (`pack.js:59-63`), so they must still be computed for accepted puzzles, as the plan says.
9. **P8's formula shrinks 4-core devices.** `min(8, hardwareConcurrency - 1)` gives a 4-core phone 3 workers where
   `defaultPoolSize` gives 4 today (`core/browser/worker-pool.js:139-142`), contrary to "phones keep their present width".
10. **Speed (likely, Node, 4 workers):** Nightmare on 196 to 324 cells falls from a T10 median of 37 to 113 s to 12 to 14 s
    after P1 to P5 and 6 to 7 s after P1 to P8; 12x12 from 62 to 39 and 19 s; 10x10 from 24 to 19 and 9 s; the large
    boards (360 to 676) from 12 to 24 s to 11 to 16 and 6 to 8 s. Completion of every Nightmare cell reaches about 95 %
    in Node (55 to 85 % today on five cells). Hell 1 on 24x24 and 26x26 reaches about 48 to 49 s after P1 to P5 (25 to
    115 s) and about 24 s after P1 to P8: D39's 90 % in Node becomes likely; in a browser (5 s + 4 x Node) about 100 s,
    still over 60 s unless the high case holds. 14x14 Hell 1 stays out (about 111 s after P1 to P5). Hell 2 and Hell 3:
    no in-band rating has ever been timed; nothing can be projected (§5).
11. **Browser verdict after P1 to P8 (planning rule):** every Nightmare cell except 12x12 meets the BQ medians (15 to 42 s);
    12x12 stays at about 82 s. Without P6 to P8, mid-board Nightmare is at 53 to 61 s in a browser: borderline.

**Headline (likely values; T10 median / p95 in seconds, Node, 4 workers unless stated).**

| Cell | Now (Measured) | Ten / 20 now | After P1-P5 | After P1-P8 (8 workers) | Browser after P1-P8 |
|---|---|---|---|---|---|
| 14x14 Nightmare | 113.0 / 151.6 | 11 | 14 / 31 [8.5 - 33] | 7.0 / 15 [2.4 - 25] | 33 / 67 |
| 15x15b10 Nightmare | 86.2 / 141.6 | 11 | 12 / 27 | 6.1 / 13 | 30 / 59 |
| 12x12 Nightmare | 62.1 / 176.1 | 17 | 39 / 86 [24 - 62] | 19 / 42 [6.8 - 45] | 82 / 175 |
| 26x26 Nightmare | 18.6 / 31.4 | 20 | 16 / 31 | 7.7 / 17 | 36 / 72 |
| 26x26 Hell 1 | 108.7 / 167.6 | 9 | 48 [25 - 113] | 24 [7.1 - 85] | about 100 |
| 14x14 Hell 1 | none with ten (5 puzzles) | 0 | 111 [59 - 261] | 55 [17 - 195] | about 225 |
| Master (16 cells) | 1.2 - 9.0 / 1.7 - 18.4 | 20 | about the same | 0.5 - 3.4 / 0.7 - 6.9 | 7 - 19 / 8 - 33 |

**Verdict.** Proceed. Run a reduced PM1 first (the cells without samples, and fine counts near the band), fix P1's
bracket and AR1 direction, fit `W_screen` on the work to the first solution, settle the prior's place in the request,
and keep the bench at a fixed worker count for comparisons. Nightmare everywhere and Hell 1 on the largest boards are
within reach in Node; the browser verdict for Hell 1 depends on the rating-side items, as the plan says.

---

## 1. Basis

### 1.1 Code identity

`git diff a1b9354 cd5d17f -- core tools/bench generator player` and `git diff 53b2313 cd5d17f -- core tools` are both
empty: the code at `cd5d17f` is the code the state report described (`a1b9354`, MP12a) and the code the plan read
(`53b2313`). Every line number below was checked in this worktree. The plan's anchors (`clues.js:432-464`, `levels.js:18`,
`measureDeduction`, `overWork`, the census budget) are correct.

### 1.2 Evidence read

| Source | Used for |
|---|---|
| `docs/difficulty-v3/generator-state-2026-11-14.md` (SA1) | pipeline, cost model, every measured time |
| `docs/difficulty-v3/clarifications-resolved.md`, PR-P2 with the plan author's answer | Fable's reasoning |
| `docs/difficulty-v3/probe-2026-11-12.md` | probe corpus: deduction and DLX costs, caps |
| `docs/difficulty-v3/baseline-v2/`, `calibration-slice-2026-11-13.md`, `landscape-v3/r2/` | GV2 baseline, MP12a slice |
| `docs/difficulty-v3/d21-v3-2026-11-12.md` | Hell under v3: 20 capped profiles in 38 - 48 s |
| `docs/difficulty-v3/landscape-v3-full/aggregate-2026-11-14.json` and the 105 selected reports | per-request T1, T10, response, accepted puzzles with metrics, diagnostic samples |
| `tools/bench/runner.js:421-470`, `tools/bench/calibration-reference.js:17,251-265` | how the diagnostic samples were drawn |

Machine of every measurement: AMD EPYC 7763 (8 cores, 16 threads), Node v26.13.0, 4 Node workers. No browser timing of
v3 exists.

---

## 2. The measured baseline, decomposed

### 2.1 Where a request's time goes (Derived)

T10 = T1 (set stage: carving plus one calibration call, attempts four at a time) + batch (nine slots, speculative
candidates on four workers). The worker-seconds spent per accepted batch puzzle are about `(T10 - T1) x 4 / 9`:

| Nightmare cell | T1 / T10 median (Measured) | Batch worker-seconds per accepted puzzle |
|---|---|---|
| 3x29, 10x10 | 0.9 / 5.3; 5.1 / 24.0 | 2.0; 8.4 |
| 12x12 | 13.9 / 62.1 | 21.4 |
| 14x14, 15x15b10, 16x16 | 43.1 / 113.0; 43.2 / 86.2; 20.0 / 79.8 | 31.1; 19.1; 26.6 |
| 15x20, 18x18 | 15.8 / 40.1; 8.6 / 37.3 | 10.8; 12.8 |
| 18x20 to 26x26 (360 - 676) | 3.2 - 5.6 / 11.6 - 24.2 | 3.7 - 8.8 |

A capped profile costs the whole cap, about 2 to 2.4 s (MP09d2: 20 capped profiles in 38 to 48 s; 760 M units at the
median rate of 317,000 units per ms). Ratings are 98.7 to 99.9 % of a puzzle's time (MP07, v2).

### 2.2 The count curves already in MP12b1 (Derived)

After each timed request the bench rated two random clue subsets of the set's witness at each of the clue shares 0.05,
0.10, 0.25, 0.40, 0.55, 0.70, 0.85, plus 1, K - 2 and the level's initial count (`calibration-reference.js:17,261-265`;
`runner.js:421-470`). Rateable samples are recorded with their count, score and time; unrateable ones only as a count, so
the missing (count, sample) pairs of each request are the capped ones. Pooled per share (20 requests, about 40 samples
per share; n per cell 342 to 400):

| Nightmare cell (cells) | Capped at 0.10 / 0.14 (start) / 0.25 | In band at 0.14 / 0.25 (of rateable) | Peak share | Rateable time at the peak (median) |
|---|---|---|---|---|
| 3x29 (87) | 3 / 3 / 0 % | 68 / 38 % | 0.12 - 0.14 | 0.40 s |
| 10x10 (100) | 13 / 3 / 3 % | 45 / 64 % | 0.25 | 0.79 s |
| 12x12 (144) | 70 / 53 / 15 % | 26 / 74 % | 0.25 | 0.72 s |
| 14x14 (196) | 100 / 89 / 16 % | 2 of 4 / 75 % | 0.25 | 0.38 s |
| 15x15b10 (215) | 100 / 84 / 8 % | 3 of 6 / 40 % | 0.25 | 0.14 s |
| 16x16 (256) | 98 / 83 / 5 % | 2 of 7 / 45 % | 0.25 | 0.20 s |
| 15x20 (300) | 93 / 78 / 3 % | 5 of 9 / 54 % | 0.25 | 0.24 s |
| 18x18 (324) | 88 / 58 / 5 % | 47 / 29 % | 0.14 - 0.25 | 0.17 - 1.0 s |
| 18x20 (360) | 60 / 35 / 3 % | 50 / 44 % | 0.14 - 0.25 | 0.20 - 0.73 s |
| 20x20 (400) | 58 / 43 / 5 % | 61 / 32 % | 0.14 | 0.78 s |
| 20x21 (420) | 55 / 25 / 0 % | 30 / 35 % | 0.14 - 0.25 | 0.16 - 1.1 s |
| 32x15 (480) | 23 / 10 / 0 % | 44 / 18 % | 0.14 | 0.69 s |
| 22x22 (484) | 33 / 15 / 0 % | 47 / 18 % | 0.14 | 0.71 s |
| 24x24 (576) | 40 / 20 / 0 % | 44 / 28 % | 0.14 | 0.92 s |
| 26x26 (676) | 28 / 10 / 0 % | 56 / 5 % | 0.14 | 0.88 s |

Every cell shows the capped share falling and the median score falling as the clue share rises (from 77 to 116 at 0.05
to 0.14 down to 8 or 9 at 0.85): the two facts P1 and P3 rest on. The diagnostic subsets are random subsets of the
witness, not of walked layouts and not nested families, so they show where the band is, not how noisy a nested family is.

| Hell 1 cell | Capped at 0.10 / 0.25 / 0.40 | In band (rateable) | Median score at 0.10 / 0.25 / 0.40 |
|---|---|---|---|
| 14x14 (196), 5 requests with a set | 90 / 70 / 60 % | 1 of 3 at 0.25; 3 of 4 at 0.40 | 170 / 117 / 79; rateable ratings at 0.40 take 3.7 s (median) |
| 24x24 (576), 7 requests | 100 / 0 / 0 % | 1 of 14 at 0.25 | none / 63 / 20 |
| 26x26 (676), 20 requests | 88 / 0 / 0 % | 1 of 5 at 0.10; 13 of 40 at 0.25 | 113 / 62 / 20; 0.25 ratings take 0.59 s |

So the Hell 1 window lies between shares 0.10 and 0.25 on the two largest boards (likely 0.15 to 0.20, which the grid
does not sample) and near 0.40 on 14x14, where the band itself is mostly capped. The 22 reduced Hell cases made no set,
so they have no samples.

### 2.3 What an in-band rating costs (Derived)

The accepted puzzles carry `metrics.work` (search and census together; the census adds at most 80 M). Over MP12b1's
accepted puzzles:

| Level, cells | Accepted work median / p90 (M units) | About, at 317 M units per s |
|---|---|---|
| Master, 60 - 676 | 13 - 98 / 50 - 171 | 0.04 - 0.31 s |
| Nightmare, 3x29 | 107 / 198 | 0.34 s |
| Nightmare, 10x10 and 12x12 | 260 and 485 / 820 and 840 | 0.8 and 1.5 s; p90 at the cap plus census |
| Nightmare, 196 - 676 | 116 - 178 / 312 - 626 | 0.37 - 0.56 s |
| Hell 1, 24x24 and 26x26 | 346 and 337 / 487 and 742 | about 1.1 s |
| Hell 1, 14x14 (5 puzzles) | 840 / 840 | the cap after the first solution plus the full census: about 2.7 s |

The plan's projection uses "one in-band rating about 2.2 s" for Hell 1; that figure is MP09d2's average over rated and
capped profiles on the 164-cell board (232 s / 104 profiles), not an in-band rating.

### 2.4 What cannot be derived

No rating in the Hell 2 or Hell 3 band has ever been timed or even observed under v3 (MP09d2's 266-cell board rated
Hell 2 candidates above the band, best 281). The nine reduced Hell 1 cases on 215 to 484 cells, every Hell 2 and every
Hell 3 case made no set in three requests, hence no samples. For those cells only PM1 can say whether a window exists.

---

## 3. The proposals against the code

### P1. Count search by bracketing from the cheap side

**What.** A nested family of clue sets (prefixes of one random order); start at `K - U0` free pieces, gallop towards fewer
clues, bisect, then hand the window to the existing phase 1 and beam.

**Code.** `core/engine/clues.js` (`selectClues` `207`, phase 1 `429-464`, phase 2 `466-475`, beam `521-543`), `levels.js`
(`initialClueCount` `125-127`).

| Plan claim | Verdict | Evidence |
|---|---|---|
| The score falls on average as clues are added; ratings with many clues are cheap | correct | §2.2: median score and capped share fall with the share in all 18 sampled cells; rateable times 1 - 11 ms at shares 0.55 and above |
| At most about `2 log2 K` profiles | correct as a count | 13 for K = 90 |
| Hell bands are wide against the score step per clue | correct where measured | 26x26 Hell 1: about 8.5 points per clue between shares 0.10 and 0.25, band 35 points |
| The parallel (P + 1)-ary bisection gives the serial outcome | **wrong** | different P probe different counts; the arity must be fixed for pool invariance |

**Gaps.** (1) The gallop condition `hi - step >= 1` stops without bracketing when the doubled step overshoots; it must
clamp to count 1. (2) No branch when the first profile is ABOVE or TOO_FEW (possible for small K at high levels). (3) At
Hard and above (`target.min >= bandEdge(3)`, `clues.js:221`) a cheap-side rating has `Gproved = 0` and is returned as
`spent` (`clues.js:273-274`): no direction. Today's phase 1 loses that direction too. (4) The plan's small-K caveat holds:
the curves are steep there (10x10 Nightmare: median score 60 at share 0.25, 35 at 0.40, about 9 points per clue against a
24-point band).

### P2. Screen budget

**What.** Rate search profiles with `limits.work = W_screen`, `limits.nodes = N_screen`; a rating that touched no cap is
the canonical rating; escalate by doubling when the bracket needs it.

**Code.** `difficulty.js` (`measureV3` takes `limits` already, `214`; `rate` does not, `325`), `clues.js` (`rateSubset`
`250-283`; the `SelectContext.rate` seam exists), `deduce.js` (`measureDeduction` `280`).

| Plan claim | Verdict | Evidence |
|---|---|---|
| The work cap is consulted only by `overWork()` and the checks of `branch` | correct | `deduce.js:839-849`, `1617-1626`; R7 returns NONE once `work > workLimit` (`1102`, `1128`), which only happens after the cap is passed |
| The census budget is `work + limits.census`, independent of the main cap | correct | `deduce.js:1747` |
| Row 1: `exhausted` or `solution-limit` means the result is canonical | correct | every comparison with the caps is false in both runs while the screen is not reached |
| Row 2: after the first solution, G, info and the tier are final; only the penalty is open | **not exact** | the counting search settles later alternatives of the final path (`deduce.js:1635`); a shorter count leaves more undecided for the census, whose budget is the same; with an incomplete census G and info are upper estimates of a different set |
| First `W_screen` of 95 M, about 0.3 s | too low at Nightmare | §2.3: accepted Nightmare work medians 107 - 485 M; many in-band ratings would be screen-capped, some before the first solution, and read as TOO_FEW |
| Total per profile at most twice the cap | correct | 1/8 + 1/4 + 1/2 + 1 = 1.875 |

**Gaps.** PM1 has to record the work at the first solution (today's metrics only hold the total), and PM4 must also test
row 2 (score and side of screen-capped-after-first-solution ratings against canonical). With a Nightmare screen near
190 to 380 M a capped profile costs 0.6 to 1.2 s instead of 2.4 s.

### P3. A capped profile is a sided result

**What.** Unrateable counts as TOO_FEW for the count direction (phase 1 and P1), without entering the stall count or the
candidates; AR1 refusals stay spent.

**Code.** `clues.js` (phase 1 direction `454-458`; `afterProfile` `387-423`).

**Claims.** Supported by every sampled cell (§2.2). The fail-fast F2 of MP12b3 is superseded where P1 runs, as the plan
says. **Gaps:** it changes the recorded D21 counting rule ("spent profiles are on no side"), so the owner should see it
as part of OD-P1 or separately; `tests/clues.test.js:701` pins the 20-profile unrateable call; AR1 direction (P1 gap 3).

### P4. Count prior

**What.** (1) The calibration's count starts every candidate's search; (2) a fitted table replaces `SHARES`.

**Code.** `generate.js` (`puzzleCandidate` `172-214`, `BatchContext`), `core/browser/generation-client.js`
(`generateBatch` `784`, `usableCalibration` `410-425`), `generator/jobs.js:388-417`, `levels.js:18`.

**Claims.** The calibration's count is available without a new field (`calibration.clues.length`). The table can be
seeded from §2.2 now: Nightmare about 0.25 on 100 to 300 cells, 0.14 to 0.25 on 324, 0.14 on 360 to 676, 0.12 on 87; Hell 1 0.15 to 0.20 on
576 to 676 and about 0.40 on 196. **Gaps:** the calibration reaches a batch only when reusable (same level and uniqueness,
trusted, `jobs.js:388-390`); a set loaded from a pack or link, or a batch at another level, has none. Today that changes
slot 1 only; with P4 it changes every slot, so the same (set, batch seed, level) gives different puzzles depending on
the session. Record the prior in the request and the pack's generation meta, or derive it from the set alone.

### P5. Deterministic budgets and bounded set attempts

**What.** A work budget per selection call (6 G units, about 19 s); set attempts that end without a window fail at once;
an attempt limit for the set job.

**Code.** `clues.js`, `generate.js` (`setAttempt` `86-139`), `generation-client.js` (`generateSet` `572`, unbounded
`maxSetAttempts` `574`), i18n notices (EN / VI), guides.

**Claims.** Correct: no call can outlast the 115 s stop once the budget is in units; set attempts are unbounded today.
**Gaps:** P5 alone would cut today's 20 to 60 s Nightmare calls and lower completion; it is safe only with P1 to P3, as
the plan's phase 2 bundles it. The 115 s stop stays a clock.

### P6. DLX diagnostic only for accepted puzzles

**Code.** `difficulty.js:244-257` (the DLX runs after a complete path; a capped path throws first), `pack.js:59-63` (the
DLX fields are part of stored `MetricsV3`), `puzzlecode-v1.js` (v1 claims).

**Claims.** Scores identical, correct. **Gaps:** no saving on capped profiles; the probe gives DLX at 0.61 to 1.52 times
the deduction at the median (easy to Master puzzles), at most about 0.25 s at its own caps, so the saving is 15 to 60 %
on cheap ratings and 5 to 20 % on in-band Nightmare and Hell ratings. The DLX's internal consistency check
(`difficulty.js:255-257`) is lost for rejected profiles; that is acceptable. Owner decision OD-P2.

### P7. Same-units faster kernel

**Code.** `deduce.js` (`fewestColumn` `1541-1568` charges one unit per column scanned; pocket labelling for R3, R7, R8),
`tiling.js` (`buildModel`).

**Claims.** Correct in principle. **Gaps:** units are counted in the inner loops, so a unit is about the same time
everywhere (317,000 units per ms); a gain exists only where the real work can be smaller than the charge (incremental
floods, bucketed column choice). `fewestColumn` is at most C units per node, a few per cent of the cap's units; the floods
are the likely prize, unmeasured. Model reuse must produce the same columns and rows in the same order, or the charges
change (the plan's own "not proposed" item says so for memos). PM2 can build on MP14b's optional `charge` meter.

### P8. Wider pool

**Code.** `core/browser/worker-pool.js` (`MAX_POOL_SIZE` `75`, `WORKER_LIMIT_BYTES` `70` = 160 + 32 + 32 MiB, `MAIN_BUDGET_BYTES`
`68`, `defaultPoolSize` `139-142`), `workspace.js`, `policy.js:90-92`.

**Claims.** Puzzles independent of the pool: correct (ordered consumption, `generation-client.js:1045-1057`). **Gaps:**
`min(8, hardwareConcurrency - 1)` lowers 4-core devices from 4 to 3 workers; 8 x 224 MiB exceeds the bench's 1.5 GiB
criterion, so the per-board workspace sizing is required, not optional; on the 16-thread bench machine 8 workers share 8
physical cores (SMT), so the batch gains about 1.3 to 1.9 times, not 2; the bench and landscape run 4 workers today, so
comparisons across phases need a fixed worker count.

### P9. Idle pre-generation and a stock

The auxiliary queue already yields to every main request (`core/browser/auxiliary.js:47`). "Add more" asks for the next
batch index of the same set, which is predictable, so a stocked next batch is a good fit. Storage is new.

### P10. Prepared packs

`verifyPack` exists as a task kind (`core/engine/tasks.js`). Board symmetries change cell order and so the canonical tie
rule of the deduction; "rated once, accepted only if in band" is required, as the plan says. Product decision OD-P3. A
pack chosen by the seed makes the pack's content part of the generator version: editing a pack changes the puzzles of
every seed that maps to it, so requests and stored batches need the pack's version.

### P11. WebAssembly kernel

Same equality obligation as P7 (identical `DeductionResult`, `work` and `nodes`). Late, as the plan says.

---

## 4. Feasibility and risk

### 4.1 Size (rough)

| Proposal | Files | Code lines (rough) | Tests | Results | Owner decision |
|---|---|---|---|---|---|
| P1 | `clues.js`, `levels.js` | 120 - 200 | bracket on synthetic curves; small-K regression; pool invariance of the parallel variant | `gen-v4` | OD-P1 |
| P2 | `clues.js`, `difficulty.js` | 80 - 150 | PM4 equality (row 1) and side agreement (row 2) | `gen-v4` | OD-P1 |
| P3 | `clues.js` | 20 - 50 | rewrite the 20-profile unrateable test | `gen-v4` | OD-P1, D21 |
| P4 | `generate.js`, `generation-client.js`, `protocol.js`, `jobs.js`, `levels.js`, pack meta | 100 - 200 | determinism with and without calibration | `gen-v4` | OD-P1; prior's place (Q6) |
| P5 | `clues.js`, `generation-client.js`, notices EN / VI, guides | 100 - 200 | budget determinism; early end | `gen-v4` | OD-P1 |
| P6 | `difficulty.js`, `clues.js`, `generate.js`, `types.js` | 30 - 80 | rating equality; accepted metrics complete | identical scores | OD-P2 |
| P7 | `deduce.js` (64 KB), `tiling.js` | 300 - 700 | `DeductionResult` equality incl. `work`, `nodes` | identical | none |
| P8 | `worker-pool.js`, `workspace.js` | 80 - 150 | memory per board; invariance 1, 2, 4, 8 | identical | width rule (Q7) |
| P9 | auxiliary queue, storage | 200 - 300 | stock invalidation by version | identical | none |
| P10 | packs, content | content plus 200 | `verifyPack` | product | OD-P3 |
| P11 | wasm module, glue | 300 plus module | as P7 | identical | none |

### 4.2 What could break

- **Small sets at Very easy to Master** under P1 (the plan's own risk); P1 should be off where today's call already ends in
  one to three profiles.
- **Direction errors** from a low `W_screen` (P2 with P3) and from row-2 siding.
- **Determinism across sessions** through the optional calibration (P4).
- **Memory** with eight full-size workers (P8).
- **Fixtures, recipes, slow tests.** `gen-v4` changes the generation fixtures and UI-flow recipes; the two slow clue tests
  of D36 (13.7 and 42.6 to 44.8 s) pin today's behaviour and change; the slow v3 ordering test (100 to 108 s) is a rating
  test and only speeds up with P7.
- **Census estimates.** A faster search finds more Hell puzzles whose scores are census upper estimates (all 152 Hell 1
  puzzles today); the plan names this risk.

### 4.3 Owner decisions

| Id | Decision | Needed by | Remark |
|---|---|---|---|
| OD-P1 | `gen-v4` | P1 - P5 | include P3's change of the D21 counting rule explicitly |
| OD-P2 | DLX only for accepted puzzles | P6 | worth 1.03 - 1.2 at Nightmare, 1.15 - 1.6 at Master |
| OD-P3 | Packs | P10 | Hell 2 and Hell 3 if PM1 finds windows |
| OD-P4 | Re-offering Hell by D39 | phase 3 | D39 is a Node criterion; the browser gate is separate (Q8) |
| OD-P5 | Progressive delivery | browser | |
| new | Where P4's prior lives (request, pack meta) or a set-only prior | P4 | Q6 |
| new | P8's width on 4-core devices | P8 | Q7 |

### 4.4 Phase and gate order (plan §6)

Sound. Amendments:

1. **Phase 0:** cut PM1 to the cells without samples (Hell 1 on 215 to 484, Hell 2, Hell 3) plus fine counts near the band
   on two or three Nightmare cells, and add the work to the first solution to its records. PM2 can reuse MP14b's `charge`
   meter. PM4 must include row 2.
2. **Phase 1:** OD-P2 before P6. Keep the bench at 4 workers for the gate and report 8 separately.
3. **Phase 2:** P1 with the bracket fixes and AR1 direction; the fixed-arity parallel bisection; the prior's place decided.
4. **Phase 3:** state whether D39 alone re-offers Hell 1 or BQ must pass first.

---

## 5. Speed: before and after (estimates only)

### 5.1 Model and assumptions

```text
T10 = T1 + B                      B = (T10 - T1) today, the batch
t_band = accepted work median / 317 M units per s + 0.05 s        (Derived, §2.3)
call without prior = (n_loc / 2) x 0.03 s + (n_loc / 2 - 1) x t_band + t_screen     (locate)
                   + n_win x t_band + 0.5 x t_screen                                 (window)
                   all divided by s_call (share of calls that end with a puzzle)
call with prior    = n_prior x t_band + window, divided by s_call
T1' = min(T1, call + 0.5 s)       B' = min(B, 9 x call / 4)
P6, P7 divide every rating; P8 divides B by p8b and T1 by p8s
browser = 5 s + 4 x Node          (design planning rule, state report §5.1; Projection)
```

| Parameter | Low | Likely | High | Basis |
|---|---|---|---|---|
| n_loc (locate profiles, no prior) | 9 | 6 | 4 | Projection: about `log2 K` gallop and bisect steps on K = 19 - 42 |
| n_prior | 3 | 1.5 | 1 | Projection: plan "one to three" |
| n_win (window profiles to a central final) | 7 | 4 | 3 | Derived: 38 - 75 % in band at the peak share, central half about half of the band |
| t_screen (a screen-capped profile) | 1.2 s | 0.6 s | 0.3 s | Projection: `W_screen` 380 / 190 / 95 M |
| s_call | 0.6 | 0.8 | 0.9 | Projection |
| P6 at Nightmare after P1 - P5 | 1.03 | 1.1 | 1.2 | Derived from the probe's DLX ratio and §2.3 |
| P7 | 1.1 | 1.3 | 1.8 | Projection (PM2 decides) |
| P8 batch / set (8 workers on 16 threads) | 1.3 / 1.0 | 1.6 / 1.15 | 1.9 / 1.3 | Projection: SMT, memory bandwidth |
| Hell 1: t_band, capped share near the band | 26x26 1.11 s, 24x24 1.14 s, 14x14 2.70 s; 30 % (60 % on 14x14) | | | Derived, §2.2 - §2.3 |
| Hell 1: n_loc, n_win, s_call | 10, 9, 0.5 | 8, 6, 0.7 | 6, 4, 0.85 | Projection |

### 5.2 Per proposal

| Proposal | Effect | Low / likely / high | Label |
|---|---|---|---|
| P1 + P2 + P3 | Nightmare T10, 196 - 324 cells | 1.1 - 2.9 / 2.3 - 6.6 / 4 - 12 times | Projection |
| P1 + P2 + P3 | Nightmare T10, 144 / 87 - 100 / 360 - 676 cells | 1.0 / 1.4 / 2.5; 1.0 / 1.0 - 1.05 / 1.6; 1.0 / 1.0 - 1.6 / 1.7 - 1.9 | Projection |
| P1 + P2 + P3 | Hell 1 on 576 - 676 | completion 0 - 45 % to about 90 % (Node); T10 about 55 s | Projection |
| P4 | batch | 1.05 / 1.15 / 1.4 | Projection |
| P5 | tails, hopeless requests | p95 and requests over 120 s; a request with no window ends in about 10 - 30 s instead of 115 s | Projection |
| P6 | completed ratings | Nightmare 1.03 / 1.1 / 1.2; Master 1.15 / 1.35 / 1.6 | Derived (probe) |
| P7 | every rating | 1.1 / 1.3 / 1.8 | Projection |
| P8 | batch on 8 threads or more | 1.3 / 1.6 / 1.9; phones 0.75 - 1.0 with `hardwareConcurrency - 1` | Projection |
| P9 | perceived T10 of the next batch | near zero | Projection |
| P10 | Hell 2, Hell 3 | instant from packs, if PM1 finds windows | Projection |
| P11 | kernel | 1.5 - 3 (plan) | Projection |

### 5.3 Plan phases, cumulative (T10 median, likely; Node)

| Cell | Now | Phase 1: P6, P8, P7 | Phase 2: + P1 - P5 |
|---|---|---|---|
| 14x14 Nightmare | 113.0 | about 61 | 7.0 |
| 12x12 Nightmare | 62.1 | about 32 | 19 |
| 16x16 Nightmare | 79.8 | about 41 | 6.8 |
| 26x26 Nightmare | 18.6 | about 9.7 | 7.7 |
| 26x26 Hell 1 | 108.7 (9 / 20 complete) | about 59, completion up | 24 |
| Master (16 cells) | 1.2 - 9.0 | 0.5 - 3.4 | 0.5 - 3.4 |

Phase 1 alone (identical puzzles) roughly halves Nightmare and Hell 1 times in Node; phase 2 does the rest on the mid
boards.

### 5.4 Area band x level (the required table)

T10 median / p95 in seconds, Node, 4 workers (P1-P8 with 8). Projections likely [best - worst]. Budgets: T10 median at most
60 s, p95 at most 115 s, response at most 120 s, at least 90 % of requests with ten. Browser = 5 s + 4 x Node.

| Cell (cells) | Now: T1 / T10 med / p95, ten of 20 | After P1-P3 | After P1-P5 | After P1-P8 | Node verdict after P1-P5 | Browser after P1-P8 | Hell offerability (D39) |
|---|---|---|---|---|---|---|---|
| Master 60 - 100 (3 cells) | 0.3 - 1.7 / 1.2 - 9.0 / 1.7 - 16.4; 20 | about the same | about the same | 0.5 - 3.4 / 0.7 - 6.3 | meets | 7 - 19 / 8 - 30, meets | |
| Master 144 - 324 (6 cells) | 0.4 - 1.0 / 2.6 - 6.0 / 6.8 - 18.4; 20 | about the same | about the same | 1.0 - 2.2 / 2.7 - 6.9 | meets | 9 - 14 / 16 - 33, meets | |
| Master 360 - 676 (7 cells) | 0.4 - 1.3 / 3.4 - 8.4 / 5.3 - 16.6; 20 | about the same | about the same | 1.3 - 3.2 / 2.0 - 6.3 | meets | 10 - 18 / 13 - 30, meets | |
| Nightmare 3x29 (87) | 0.9 / 5.3 / 7.6; 20 | 5.3 / 7.6 | 5.3 / 7.6 | 2.5 / 5.4 [1.4 - 3.8] | meets | 15 / 27, meets | |
| Nightmare 10x10 (100) | 5.1 / 24.0 / 68.4; 19 | 23 / 50 [15 - 24] | 19 / 43 [14 - 24] | 9.4 / 21 [4.0 - 17] | meets | 42 / 87, meets | |
| Nightmare 12x12 (144) | 13.9 / 62.1 / 176.1; 17 | 43 / 95 [25 - 62] | 39 / 86 [24 - 62] | 19 / 42 [6.8 - 45] | meets (borderline in the worst case) | 82 / 175, fails | |
| Nightmare 14x14 (196) | 43.1 / 113.0 / 151.6; 11 | 17 / 36 [9.4 - 39] | 14 / 31 [8.5 - 33] | 7.0 / 15 [2.4 - 25] | meets | 33 / 67, meets | |
| Nightmare 15x15b10 (215) | 43.2 / 86.2 / 141.6; 11 | 15 / 32 | 12 / 27 | 6.1 / 13 | meets | 30 / 59, meets | |
| Nightmare 16x16 (256) | 20.0 / 79.8 / 135.4; 15 | 16 / 35 | 14 / 30 | 6.8 / 15 | meets | 32 / 65, meets | |
| Nightmare 15x20 (300) | 15.8 / 40.1 / 111.2; 15 | 17 / 37 | 14 / 31 | 7.2 / 16 | meets | 34 / 68, meets | |
| Nightmare 18x18 (324) | 8.6 / 37.3 / 134.5; 20 | 16 / 34 | 13 / 29 | 6.6 / 14 | meets | 31 / 63, meets | |
| Nightmare 18x20 (360) | 3.2 / 16.8 / 63.1; 20 | 14 / 31 | 11 / 25 | 5.5 / 12 | meets | 27 / 53, meets | |
| Nightmare 20x20 (400) | 5.6 / 20.1 / 114.0; 19 | 17 / 37 | 14 / 31 | 7.1 / 16 | meets | 33 / 67, meets | |
| Nightmare 20x21 (420) | 4.5 / 24.2 / 47.9; 20 | 15 / 34 | 13 / 28 | 6.3 / 14 | meets | 30 / 61, meets | |
| Nightmare 32x15 (480) | 3.3 / 11.6 / 37.9; 20 | 12 / 26 | 12 / 26 | 5.6 / 12 | meets | 28 / 55, meets | |
| Nightmare 22x22 (484) | 3.7 / 17.3 / 33.9; 20 | 15 / 33 | 12 / 27 | 6.0 / 13 | meets | 29 / 57, meets | |
| Nightmare 24x24 (576) | 4.3 / 18.7 / 57.3; 20 | 16 / 35 | 13 / 30 | 6.6 / 15 | meets | 31 / 63, meets | |
| Nightmare 26x26 (676) | 5.2 / 18.6 / 31.4; 20 | 18 / 31 | 16 / 31 | 7.7 / 17 | meets | 36 / 72, meets | |
| Hell 1 14x14 (196) | 81.8 / none / max 229; 0 (5 puzzles) | 127 [67 - 280] | 111 [59 - 261] | 55 [17 - 195] | fails (stop at 115 s) | about 225, fails | not offerable (likely) |
| Hell 1 215 - 484 (9 reduced cells) | no set in 3 requests each | unknown | unknown; between the 196 and 576 rows | unknown | PM1 | | PM1 |
| Hell 1 24x24 (576) | 78.8 / none / max 211; 0 (13 puzzles) | 56 [30 - 127] | 49 [25 - 115] | 24 [7.3 - 86] | meets median; p95 near the stop | about 100, fails (meets in the best case) | likely by D39 in Node |
| Hell 1 26x26 (676) | 44.8 / 108.7 / 167.6; 9 | 55 [29 - 124] | 48 [25 - 113] | 24 [7.1 - 85] | meets median; p95 near the stop | about 100, fails (meets in the best case) | likely by D39 in Node |
| Hell 2 (300 - 676, 9 cells), Hell 3 (480 - 676, 4 cells) | no set; every request to the 115 s stop | unknown | a request without a window ends in about 10 - 30 s | unknown | PM1 | | PM1; packs (P10) |

Notes. "About the same" at Master: P1 to P5 are expected to be neutral there (0.8 to 1.2 times; the plan's regression
check). The p95 projections take 2.2 times the median, capped at today's p95 (Projection). On 360 to 676 cells P1 to P3
change little because today's calls already start near the band. For reference, the GV2 baseline (v2 generation) had
Master T10 medians of 0.4 to 0.8 s on the slice boards; v3 is 3 to 13 times slower there (state report §3.6), and P6 to
P8 recover about 2.6 times of it.

### 5.5 Availability

| Cell | Requests with ten now (Measured) | After P1 - P5 (Node, Projection) | Becomes offerable |
|---|---|---|---|
| Nightmare 12x12, 14x14, 15x15b10, 16x16, 15x20 | 85, 55, 55, 75, 75 % | about 95 % or more (T10 p95 27 - 31 s, 86 s on 12x12) | they are offered today; they would meet the bench criteria in Node |
| Nightmare, other 10 cells | 95 - 100 % | 95 - 100 % | |
| Hell 1 24x24, 26x26 | 0, 45 % | about 85 - 95 % | likely by D39 (Node); browser only in the best case |
| Hell 1 14x14 | 0 % | about 30 - 60 % | no (likely) |
| Hell 1 215 - 484, Hell 2, Hell 3 | no set | unknown | PM1; P10 for reachable but slow cells |

Requests over 120 s: 70 of 1,726 today (43 Nightmare, 27 Hell 1). After P1 to P5, Nightmare's projected p95 stays below
45 s in Node, so about none; Hell 1 on the largest boards keeps a few near the stop.

---

## 6. The measurement phase (plan §5)

| Id | Confirms or refutes | What it should measure exactly |
|---|---|---|
| PM1 | the windows of §2.2 at fine resolution; `W_screen`; the P4 table; Hell 2 and Hell 3 reachability | keep the plan's design (nested families, every count from K - 8 down, stop after three capped counts) but only for the cells without samples (Hell 1 on 215 - 484, Hell 2 on 300 - 676, Hell 3 on 480 - 676) and for two or three Nightmare cells near their peak share; add to each record **the work at the first solution**, the census completeness and whether the count was cut. Machine time estimate: about 10 to 60 minutes of one worker per cell, 3 to 15 hours in all (Projection) |
| PM2 | P7's ranking, P11's case | units and time per rule, `fewestColumn`, floods, model build, census, DLX; repeated states; built on MP14b's `charge` meter |
| PM3 | §5.4's projections | T1, T10, completion, profiles and units per call, **siding errors** (profiles read TOO_FEW that complete under `DEDUCE`), at 4 workers |
| PM4 | P2's correctness | row 1 equality (as planned) and **row 2 side agreement** against canonical ratings |

---

## 7. Questions for Fable

- **IG-P-OPUS-Q1 (PM1 scope).** MP12b1's diagnostic samples already give coarse count curves for the 15 Nightmare cells
  and three Hell 1 cells (§2.2): Nightmare peaks near share 0.25 on 100 to 300 cells, Hell 1 lies between 0.10 and 0.25 on
  24x24 and 26x26. May PM1 be cut to the cells without samples and to fine counts near the band?
- **IG-P-OPUS-Q2 (P2, second row).** A screen that stops the solution count changes which alternatives the census must
  settle, so G and info can differ from the canonical values when a census is incomplete (34 to 100 % of Nightmare and
  Hell puzzles). Should a row-2 profile be sided only when its census completed, or always be treated as an estimate?
- **IG-P-OPUS-Q3 (W_screen basis).** Accepted Nightmare puzzles use 107 to 485 M units (median); 95 M would screen-cap many
  in-band ratings before their first solution and read them as TOO_FEW. Should PM1 fit the screen on the work to the first
  solution, and is a Nightmare screen near 190 to 380 M (a saving of 2 to 4 times per capped profile) acceptable?
- **IG-P-OPUS-Q4 (AR1 and direction).** At Hard and above the cheap-side profiles are mostly refused by AR1 and returned as
  `spent`, so P1's first step and today's phase 1 get no direction from them. Should an AR1-refused rating count as BELOW
  for the count logic, since its score is known?
- **IG-P-OPUS-Q5 (parallel bisection).** A (P + 1)-ary search probes different counts on different pools. Fix the arity
  (for example 4) on every device, or drop the parallel variant?
- **IG-P-OPUS-Q6 (where the prior lives).** `jobs.js` passes the calibration only when it is reusable; with P4 every slot
  depends on it. Record the prior with the request and in the pack's generation meta, or derive it from the set alone
  (the fitted table, or a locate on the witness inside the batch)?
- **IG-P-OPUS-Q7 (P8 width).** `min(8, hardwareConcurrency - 1)` gives a 4-core device 3 workers where today it has 4.
  Which formula is intended for devices with 4 cores or fewer?
- **IG-P-OPUS-Q8 (Hell 1 gates).** After P1 to P5 the Node T10 of Hell 1 on 24x24 and 26x26 is projected near 50 s, the
  browser planning rule near 200 s (about 100 s after P1 to P8). Is Hell 1 to be re-offered by D39 (Node) at phase 3, or
  only once the matching BQ runs pass?
- **IG-P-OPUS-Q9 (bench comparability).** P8 changes the worker count of the bench and the landscape. Should every phase
  gate be read at a fixed 4 workers, with the wider pool reported beside it?
- **IG-P-OPUS-Q10 (D21).** P3 changes the recorded D21 counting rule (a spent profile is on no side). Is that covered by
  OD-P1, or a separate owner decision?
- **IG-P-OPUS-Q11 (10x10 and 12x12 Nightmare).** There the in-band ratings themselves are dear (accepted work median 260 and
  485 M, p90 at the cap plus census), so P1 to P5 project only 1.3 to 1.6 times and 12x12 stays near 82 s in a browser
  after P1 to P8. Does the plan accept those cells as browser failures, or is a rating-side item meant for them?
