# Improve generating (Pentomino): a faster generator for Nightmare and the Hell levels

> **Version 2 (2026-11-15), revised after the provisional phase-0 round.** Version 1 is this file at commit
> `555197b`. Version 2 folds in the joint analysis ([report.md](report.md)), the plan-author answers IG-P-Q01 to
> IG-P-Q18 ([clarifications.md](clarifications.md)) and the provisional measurements
> ([evidence/provisional/summary.md](evidence/provisional/summary.md), rows R00 to R33). Section 0 lists what
> changed and why. **Every measured number is provisional (pre-freeze):** the `rating-v3` runtime of MP12b1, Node,
> four workers, two to six seeds per cell, no browser run. The frozen round (post-MP17) repeats them; nothing here
> is a gate result or an offer.
>
> **Addendum, section 9 (2026-11-15):** the plan read against the `rating-v3` source (`13d61fd`), the estimate on
> that source, and five further candidates (C1 to C5) with questions for the analysts.

Plan author: claude-fable-5-2, 2026-11-14; version 2 on 2026-11-15. Written with the answer to **PR-P2**
([clarifications.md](../difficulty-v3/clarifications.md)). Status: **proposal; nothing implemented in `core/` or
`generator/`**; the prototypes are harnesses under `tools/ig-proto/`. It is the input of a later feature
("improve-generating"); architects turn it into a design and a task pack.

Inputs read: [generator-state-2026-11-14.md](../difficulty-v3/generator-state-2026-11-14.md) (pipeline, cost
model, every measured time, MP12b1's aggregate) and the code at `53b2313` (`core/engine/clues.js`, `deduce.js`,
`difficulty.js`, `levels.js`, `policy.js`, `generate.js`, `core/browser/worker-pool.js`).

Labels, as in the state report: **Fact** (measured or read from the code), **Analysis** (derived, derivation
given), **Projection** (expected, not measured), and from version 2 **Measured (provisional)**: a row of
`summary.md`, cited as R<nn>. Version 1 ran nothing; version 2 ran nothing either and only reads the records of
the prototype pack. Each proposal keeps a gate.

## 0. What version 2 changes

### 0.1 Estimate against provisional measurement

T10 median in Node at four workers. "Analysts" is the report's value after P1 to P5. "No screen" is the prototype
without P2 (P1, P3 and P4 on canonical caps): it keeps the accepted clue counts closest to today's (section 0.2).

| Cell | Today (MP12b1; ten of 20) | Plan v1 | Analysts | Measured, P1 to P5 with the screen | Measured, no screen | Against the estimate |
|---|---|---|---|---|---|---|
| 14x14 Nightmare | 113.0 s (11) | "a few tens of seconds" | 16.0 to 17.7 s | 8.9 s (n 3; ten on 3 of 3, today 1 of 3) | 17.7 s (n 2) | better with the screen; as estimated without it (R02) |
| 15x15b10 Nightmare | 86.2 s (11) | the same | 13.7 to 13.8 s | 8.5 s (n 3; 3 of 3, today 2 of 3) | not run | better (R04) |
| 12x12 Nightmare | 62.1 s (17) | the same | 39 to 48 s | 5.7 s (n 3); 9.0 s (n 6) | 16.5 s (n 6) | much better, in both arms (R05, R33) |
| 26x26 Nightmare | 18.6 s (20) | none | 15.5 to 17.8 s | 11.9 s (n 6; paired x2.0, 0.69 to 3.91) | not run | as estimated or slightly better (R06) |
| 14x14 / 26x26 Master | 2.57 / 8.36 s | unchanged | unchanged | paired x1.25 / x0.83 (n 5 each) | not run | no gain; a possible slowdown on 26x26 (R07) |
| Hell 1 26x26 | 108.7 s (9) | 35 to 45 s (v1 section 4, from the 164-cell board) | 28 s; 50 to 60 s | 37.3 s at 380 M (n 3; 3 of 3, today 2 of 3) | 34.2 s (n 2) | as plan v1 projected; between the analysts (R08, R33) |
| Hell 1 20x20 | no set in 115 s | none | unknown | not run | 42.9 s (2 of 2 reached ten) | new: the first Hell 1 batch on a 400-cell board (R33) |

| Item | Plan v1 | Analysts | Measured (provisional) | Against the estimate |
|---|---|---|---|---|
| Dead end after capped profiles | the cause on 100 to 420 cells | 30 to 60 % of the batch time on 196 to 300 cells | 37 to 40 % of the batch time on 14x14 and 15x15b10, 19 % on 12x12, 0 % on 26x26 and Master; 0 dead-end entries in 548 prototype calls (R10, R11) | confirmed; removed by P1 and P3 |
| P2 certificate | (wrong claim, withdrawn) | must hold | 862 of 862 certified screens equal the canonical rating; every named case observed (R14) | holds |
| P2 gain | a capped profile at an eighth of its cost | "about nothing" on 12x12 | no screen over 190 M: x2.6 on 14x14 (n 2, no clue shift), x1.56 on 12x12 (n 6, +0.75 clues); 380 M on Hell 1 26x26: x0.88 (R33) | depends on the cell; negative on Hell |
| P4 | 2 to 6 profiles per candidate | x1.05 to 1.15 | median 2 locate probes per call (4 on Hell 1); 74 to 95 % of calls hit in the locate phase (R19) | as plan v1 said |
| P1's parallel variant | fewer rounds | only with a clear gain | arity 3: T1 bound over main 0.99 to 1.01, wasted probes on Hell 1 (R20) | no gain: dropped |
| P6 | up to 1.67 times on completed ratings | x1.03 to 1.2 Nightmare, x1.15 to 1.6 Master | T10 x1.32 on 26x26 Nightmare, x1.12 to 1.18 on Master; 9.9 to 22.8 % of rating time (R22) | below plan v1; near the analysts |
| P8 | up to 2 times | batch x1.3 to 1.9 | eight workers alone: T10 x1.13 Nightmare, x0.93 Master; one rating runs 9 to 28 % slower at eight (R23) | worse: no default |
| First phase (P6, P7, P8) | none | /1.9 (illustrative) | P6 with eight workers: T10 x0.93 to 1.53; x1.01 on the prototype (R25); P7 unmeasured | worse: about 1.0 to 1.5 without P7 |
| Hell windows | "not shown to be unreachable" | unknown | Hell 1: in-band ratings on all nine boards of 215 to 484 cells; Hell 2: 8 of 404 ratings, none central; Hell 3: 0 of 201, best score 47 to 84 points short (R27, R28) | Hell 1 better than expected; Hell 3 closed; Hell 2 marginal |

**Verdict.** The search-side items (P1, P3, P4, and P2 where it pays) beat the estimates on the failing Nightmare
cells: 8 to 20 times on the response (12x12, 15x15b10, 14x14; n 3 each) with three of three requests complete,
against 1.3 to 6.4 times estimated for P1 to P5.
Even without the screen, 12x12 is 2.9 times faster than today (n 5) and 14x14 9.5 times on the response (n 2). The
rating-side items (P6, P8) fall short: the first phase is worth about 1.0 to 1.5 times, not 1.9. So the feature's
value is the new search; the per-rating cost is still open and rests on P7.

### 0.2 The condition attached to the gains: the accepted puzzles move

The prototype keeps the score band and the centre rule (every accepted rating is canonical), but its Nightmare
and Hell 1 puzzles carry one to three more clues than today's (R32). Two sources, with different remedies
(IG-P-Q17):

- **The choice of set.** Sets today's search gives up on are served at their in-band counts, two to four clues
  above today's start count, with or without the screen. On 14x14 Nightmare PM4 found no in-band rating below +3
  clues on four sets. Keeping today's distribution there means keeping today's failures.
- **The screen.** On the same set, the screen adds +0.75 clues on 12x12 Nightmare and on Hell 1 26x26, and
  nothing on 14x14 Nightmare.

The plan's position (answer to IG-P-Q17): accept the first as what the level is on those sets, with the owner's
explicit agreement; bound the second by rule (c5) of P2.

### 0.3 Changes to the plan

1. P1 to P5 run at **Nightmare and the Hell levels only**; Very easy to Master keep today's selection (section 3,
   "Scope").
2. P2's contract is the certificate of IG-P-Q01, and `W_screen` is a table per level and area class under rule
   (c5): no screen at the Hell levels.
3. P1's parallel variant is dropped. P8 leaves phase 1's gate and is not a default.
4. P7 moves up: with 96 % of the rating time in the kernel (R24), it is the only item left that lowers the cost
   of a rating, and Hell 1 in the browser depends on it (section 4).
5. Hell 3 is closed in this feature; P10 no longer covers it. Hell 2 has no live route on these observations.
   Hell 1 on 215 to 484 cells joins phase 3's landscape (answer to IG-P-Q18).
6. The measurement phase (section 5) is replaced by what the frozen round must still measure.

## 1. Goal, non-goals and constraints

**Goal.** Within the existing budgets (T10 median at most 60 s, T10 p95 at most 115 s, response at most 120 s, at
least 90 % of requests with ten puzzles), in the browser:

1. Nightmare on every offered board, in particular the boards of 100 to 420 cells that fail today;
2. Hell 1 back on the boards where its band is reachable;
3. Hell 2 and Hell 3 where a measurement shows their band is reachable at all (section 5, PM1), by generation
   when it fits the budget and from prepared packs otherwise. *Version 2:* PM1's first slice found no Hell 3
   rating within the work cap (the best is 47 to 84 points short), so Hell 3 leaves this goal; Hell 2 is reachable
   only at the bottom edge of its band and has no live route yet (P10, OD-P3). Hell 1 extends to the boards of
   215 to 484 cells, where windows exist on every board measured.

**Non-goals.** No change to the rating: `difficulty-v3`, the score tuple locked by MP12b2, the rule ladder, the
caps of `DEDUCE` and the census budget stay as they are. Every accepted puzzle carries the canonical `rate` result,
as today. The feature changes **which clue subsets are rated, in which order and under which provisional
budget**, and how the work is spread.

**Constraints.**

- Determinism: every random choice from a named stream of the seed; results consumed in a fixed order; the
  puzzles do not depend on the pool size.
- Work is counted in deterministic units; a cap is a count, never a clock.
- The clue search changes, so generated puzzles change for a given seed: a new `algo` version (`gen-v4`), new
  fixtures. The feature starts after difficulty-v3 is closed (MP17).

## 2. Diagnosis

### 2.1 The facts that matter

| Fact | Source |
|---|---|
| A profile that reaches a cap costs the whole cap: about 2 to 2.4 s. A complete Master rating has a median deduction of 36 to 78 ms | state report 2.2 |
| A capped profile is "spent": it is on no side of the band. In phase 1 of `selectClues`, a count whose samples are all spent has `below = 0` and `above = 0`, and the phase **ends** | `clues.js:432-464` |
| The clue count moves by **one** per step, at most `COUNT_CHANGES` = 8 steps, 4 samples each, starting at `initialClueCount(share, K)` | `clues.js:429-464` |
| The start shares `SHARES` are 0.14 at Nightmare and 0.10 / 0.06 / 0.04 at Hell 1 to 3: 3 or 4 clues on 31 to 90 pieces | `levels.js:18`; state report 1.2 |
| Hell: a set attempt spends 20 capped profiles in 38 to 48 s and fails; the set job has no attempt limit and runs to 115 s. All 66 requests of the 22 reduced Hell cases ended so | state report 2.4, 3.10 |
| Yet ratings far above the Hell bands complete: the 266-cell board rated Hell 2 candidates **above** the band (best 281) | state report 3.5 |
| Nightmare, diagnostic samples: 22.5 to 33.9 % unrateable on 144 to 324 cells; T1 median 13.9 to 43.2 s there | state report 3.10, 5.1 |
| Ratings are 98.7 to 99.9 % of a puzzle's time (measured under v2; carving 0.33 s, layout walk 18 to 42 ms) | state report 2.5 |
| The DLX diagnostic runs on every completed rating, never enters the score, and makes build plus deduction 1.67 times longer on 18x20 | state report 1.6, 5.6 |
| The pool has at most 4 workers of 224 MiB each; a rating's workspace peak is 20.8 MB on the largest board | state report 1.9, 5.6 |

### 2.2 What they mean (Analysis)

1. **The search starts in the wrong place and cannot leave it.** With 3 or 4 clues on a large set, the first
   solution is behind refutation subtrees that exceed the work cap, so every sample is capped. A capped profile
   gives the count search no direction, so the search ends where it started. The band lies at a **higher** clue
   count, where ratings complete; the 266-cell result (281, above Hell 2) shows that both sides of a Hell band
   exist. The search has no way to get from "capped" to "in band": one step per count, eight steps at most, and no
   step at all after a capped count. The Hell levels are not shown to be unreachable under v3; the search that
   looks for them is.
2. **Failure costs 30 to 60 times more than success.** A profile that will be useful completes in tens or
   hundreds of milliseconds; a profile that will not completes its cap in 2.4 s. The search pays the high price
   for the profiles that tell it least.
3. **What is learnt is thrown away.** The clue count at which a set's ratings fall in the band is found by the
   calibration and then found again, from the same start, by every puzzle candidate of every slot.
4. **`SHARES` was fitted to the v2 rating.** Under v3 the score is carried by decisive guesses, and the count that
   gives a level is different. This is a hypothesis; PM1 measures it.
5. **The expected cost of one accepted puzzle** is (profiles per call) x (mean cost of a profile), with up to 64
   profiles and up to 2.4 s each: a call can take about 150 s, longer than the 115 s stop (state report 5.6,
   risk 3).

The G that a band needs (about 8, 12, 18, 27 decisive guesses from Nightmare to Hell 3) makes an in-band rating
intrinsically dear, about 2 s at Hell 1 on the measured board. That part cannot be removed without changing the
rating. Everything else in the list above can.

### 2.3 What the provisional round confirmed and corrected (Measured, provisional)

- Point 1 holds for Nightmare and Hell 1. On eight failing Hell 1 sets (14x14, 24x24) all 160 start-count
  profiles are capped, and seven of the eight sets have eligible in-band ratings 2 to 11 clues higher (R28). On
  12x12, 14x14 and 15x15b10 Nightmare and Hell 1 26x26, 0 to 7 % of the profiles at the start count are useful
  and 33 to 67 % at the best offset, two to four clues higher (PM4).
- Point 1 does **not** extend to Hell 3: its ratings cap before the score reaches the band. For Hell 2 the two
  sides meet only at the band's bottom edge.
- Point 4 holds: the count that gives Nightmare under v3 lies two to four clues above `SHARES` on 144 to 300
  cells and within one clue of it on 676 cells; for Hell 1 it lies two or more clues above it on every board
  measured; for Master it lies at or below it.
- Point 5's "up to 64 profiles" is not what today's calls do: at Nightmare and Hell 1 a successful call rates 3.8
  to 10.9 profiles on average before the change, and 0.8 to 4.2 beyond the locate probes after it (R12).
- New: the rating kernel (search and census) is 95.7 to 96.3 % of the rating time on 10x10 and 12x12 Nightmare;
  the DLX diagnostic is 3.3 to 4.0 % (R24, R30).

## 3. Proposals

Summary. "Identical" means: the same puzzles as today for the same request. The effect column is version 2's:
Measured (provisional) where a row of `summary.md` exists, otherwise a Projection.

| Id | Proposal | Result | Effect (version 2) | Status |
|---|---|---|---|---|
| P1 | Count search by bracketing from the cheap side, sequential | new `algo` | with P3 and P4: no dead-end entry in 548 calls; a call needs a median of 2 locate probes (R11, R19) | prototyped; keep. The parallel variant is dropped |
| P2 | Screen budget with a no-cap certificate; canonical result when certified | new `algo` | x2.6 on 14x14 Nightmare, x1.56 on 12x12 with +0.75 clues, x0.88 on Hell 1 (R33) | certificate holds (R14); `W_screen` per level under rule (c5) |
| P3 | A capped profile is a sided result ("too few clues") | new `algo` | the search leaves the start count; it also moves the accepted clue count (section 0.2) | prototyped; keep. D21 amendment approved (OD-P1) |
| P4 | Count prior: a versioned table, later per set | new `algo` | the prior hits at once or within a few probes (R19); not isolated from P1 and P3 | prototyped with a table of today's accepted medians; keep |
| P5 | Deterministic work budget per call and per set attempt; bounded set attempts | new `algo` | no speed; no prototype call passed 8 G units (R21) | not enforced in the prototype; needs IG-P-Q02 |
| P6 | DLX diagnostic only for accepted puzzles | identical scores | T10 x1.12 to 1.32 (R22) | approved (OD-P2); phase 1 |
| P7 | Same-units faster kernel (virtual work accounting) | identical | unmeasured; the kernel is 96 % of the rating time, so P7 is worth about its own speed-up (R24) | raised in priority; a spike decides it |
| P8 | Wider pool with workspaces sized to the board | identical | T10 x1.13 at Nightmare, x0.93 at Master on the bench machine (R23) | demoted: opt-in after a device measurement, not a default |
| P9 | Idle pre-generation and a stock | identical | the next batch of the same settings is ready | late, optional (IG-P-Q14) |
| P10 | Prepared packs for the levels that do not fit the budget | product decision | Hell 2 only, and only if the owner accepts edge-of-band puzzles; Hell 3 has nothing to pack | deferred (OD-P3) |
| P11 | WebAssembly kernel for `measureDeduction` | identical | 1.3 to 2 times on the kernel (Projection) | after P7's spike; needed if Hell 1 is to meet the browser median |

**Scope (version 2).** P1 to P5 run for Nightmare and the Hell levels. Very easy to Master keep today's
`selectClues` path inside `gen-v4`, so their puzzles and times do not change. Reason: no Master call enters the
dead end today (R10: 0 %), the prototype's paired T10 there is x1.25 (14x14) and x0.83 (26x26) with one clue
fewer on 26x26 (R07, R32), and both analysts expected no gain. The frozen PM3 may reopen this for a level only
with a non-regression result on at least the 16 Master cells.

### P1. Count search by bracketing from the cheap side

**Idea.** The score falls, on average, when clues are added: fewer free pieces, fewer guesses. Ratings with many
clues are cheap. So start where ratings are cheap and below the band, gallop towards fewer clues until the band is
reached or passed, then bisect. The dear ratings are met only near the band, and never deep in the capped zone.

```text
locateCount(layout, target, rng, prior):
  order = rng.shuffle(pieces)                  # one nested family: clues(k) = first k pieces of `order`
  hi = prior?.count ?? K - U0                  # U0 free pieces, about 8: cheap and below a Hard-or-above band
  r = screenRate(clues(hi))                    # P2
  if r is in band: return hi
  # gallop: double the number of free pieces while the result is below the band
  step = U0
  while r is BELOW and hi - step >= 1:
    lo = hi - step; r2 = screenRate(clues(lo))
    if r2 is in band: return lo
    if r2 is ABOVE or TOO_FEW: break           # P3: a capped profile counts as TOO_FEW
    hi = lo; step = 2 * step
  # now clues(hi) is BELOW and clues(lo) is ABOVE or TOO_FEW: bisect
  while hi - lo > 1:
    mid = (lo + hi) >> 1; r = screenRate(clues(mid))
    if r is in band: return mid
    if r is BELOW: hi = mid else: lo = mid
  return window [lo, hi]                       # the band was jumped over on this family
```

- At most about `2 * log2(K)` profiles: 14 for K = 90. The ones on the BELOW side are cheap by nature; the ones on
  the other side are cut by the screen budget.
- The score is not monotone in the count and depends on which pieces are clues (the order noise of the state
  report 5.5 is 6 to 13 points). So `locateCount` only finds the **window**; the existing machinery then works
  inside it: phase 1's samples at the counts of the window (other subsets of the same size), then the beam with
  its add / remove / swap moves, the stall stop and the centre rule, unchanged.
- With a prior (P4) the gallop starts at the prior's count and usually ends in one to three profiles.
- The Hell bands are wide (35, 50, 73 points against about 6.75 points per decisive guess), so a family rarely
  jumps a Hell band; the narrow lower bands are where the window step matters.

**Version 2.**

- *Direction from AR1-refused profiles (IG-P-Q07).* At Hard and above the cheap-side profiles are refused by AR1
  and returned as `spent` before their score is kept (`clues.js:273-274`). P1 keeps the canonical score and uses
  its side of the band as the direction; the profile stays ineligible for acceptance and for the stall count.
- *The cheap-side start costs a walk.* Without a prior (Hell 1 20x20, start at K - 8) the first in-band rating
  came at the 6th or 7th probe, after one to three canonical caps of about 2 s each. With the table prior the
  median is 2 probes. So P1 always starts from P4's prior, and K - U0 is the fallback only.
- *The parallel variant is dropped.* The fixed arity-3 set stage measured no gain (idealised T1 bound over the
  sequential one 0.99 to 1.01) and wasted probes on Hell 1 (R20, IG-P-Q08). The pool is used across slots and
  candidates, where the result does not depend on the width.

### P2. Screen budget

**Fact.** `measureDeduction(model, limits)` takes its limits as an argument; the work cap is consulted only by
`overWork()` and the node and work checks of `branch`; the census budget is `work + limits.census` and does not
depend on the main cap.

**Idea.** During the search, rate with `limits.work = W_screen` and `limits.nodes = N_screen`, far below the
canonical caps.

**Contract (version 2, IG-P-Q01).** Version 1's table is withdrawn: after the first solution the continued count
and `settleCensus` still change G, info and `Gproved`, and a normal stop is no certificate. A screen run is the
canonical rating with a lower main-phase work limit and **no other limit changed** (`N_screen` is not lowered).

| Outcome of a screen run | Meaning | Use |
|---|---|---|
| the main-phase work at the end is at most `W_screen` | no `work > workLimit` check ever differed from the canonical run: the result **is** the canonical rating | a normal profile; may be accepted |
| the run reached `W_screen` ("screen-capped") | unknown | steers the search only (`TOO_FEW`, P3); never accepted, never shown |

- Measured (provisional): 862 certified screen runs, each deep-equal to its canonical rating; overshoots, caps
  before and after the first solution and R7 cuts all observed, none of the cut runs certified (R14). The test
  stays permanently in the suite on a corpus.
- No prototype call needed a canonical re-rating in 942 finished calls (R18). The rescue of IG-P-Q01 (re-rate
  the screen-capped profiles nearest the window before a call gives up) stays in the design as the fallback, and
  the variant that re-rates when the bracket closes is measured in the frozen round (D-IG7).
- **`W_screen` is a versioned table per level and area class, under rule (c5):** the screen is used on a cell
  class only where, against the same search without the screen, it does not move the accepted clue count on the
  same set by more than a stated tolerance (first value: a median of 0.5 clues) and is faster. First table, to
  be refitted by the frozen PM3 with both arms on every class:

| Class | `W_screen` | Basis (provisional) |
|---|---|---|
| Hell 1 and above, every board | none (the canonical 760 M) | at 380 M the screen is slower (x0.88) and adds +0.75 clues on the same set; it loses 16 of 47 window ratings on 215 to 484 cells (R33, IG-P-Q18) |
| Nightmare, 196 to 324 cells | 190 M | x2.6 on 14x14 with no same-set shift (n 2); no useful rating of today's call profiles lost on 14x14 and 15x15b10 (R15, R33) |
| Nightmare, up to 144 cells | none by default | 12x12: x1.56 (n 6) for +0.75 clues on the same set; 7 of 9 useful ratings lost at 190 M. The trade is the owner's, with IG-P-Q12 |
| Nightmare, 360 cells and more | undecided; none until measured | 26x26: the screen saves x1.1 on today's profiles; no arm without it was run |

- 95 M stays a control only: it loses 19 of 47 useful ratings (R15).
- The accepted puzzle always carries a rating made with `DEDUCE`. Nothing about the rating changes.

### P3. A capped profile is a sided result

Treat "unrateable" as `TOO_FEW` in the count logic of P1 and in phase 1 (`above` side for the direction of the
count, without entering the stall count or the candidates). The AR1 refusal stays "spent" as today. This removes
the dead end of 2.2 point 1. It is guidance only: a capped profile is not proved to be above the band, and nothing
is accepted on that basis. The fail-fast F2 of MP12b3 is superseded where P1 runs (a call no longer spends four
capped profiles at one count); F1 becomes the bounded set attempts of P5.

**Version 2.** The owner approved the amendment of D21 inside OD-P1 ("under `gen-v4` a capped profile counts as
'too few clues'"); `tests/clues.test.js:701` keeps pinning `gen-v3`. P3 is also what moves the population: on
14x14 Nightmare the locate phase moved up from its start in 31 of 48 calls, 30 of them after a capped probe. With
the canonical cap that move is towards counts where ratings complete; with a screen cap it can pass a count
whose rating would have completed, which is why P2 is bound by rule (c5).

**Population rule (answer to IG-P-Q17).** The level is defined by the score band, the centre rule and AR1; the
clue count is not part of it. `gen-v4` may serve a set at the lowest in-band count its call finds, also where
that is above today's distribution. PM3 reports the population of every cell beside its times, two-sided (26x26
Master moved down). The refinement (c4), probing one count below the first in-band hit before accepting, is
adopted only if the frozen PM3 shows it costs less than 10 % of T10. This rule needs the owner's explicit
agreement (OD-P6).

### P4. Count prior

1. **Per set.** The calibration returns the count (and the window) at which it found the band. `generateBatch`
   passes it in every `puzzleCandidate` task; the candidate's `locateCount` starts there. The prior is a function
   of the set, hence of the seed: deterministic.
2. **Per level and board.** Replace `SHARES` by a table fitted on PM1's curves: the count at which the median
   score crosses the band centre, as a function of level, K and area class. It is only a starting point for the
   gallop, so an imperfect fit costs profiles, not correctness.

**Version 2.**

- The prototype used only the table (2), filled with MP12b1's accepted median per cell; that gave a median of 2
  locate probes per call (R19). The per-set prior (1) is not prototyped and comes second.
- Where today has no accepted puzzle (Hell 1 on 215 to 484 cells) the table is filled from PM1's windows: about
  0.35 of K given, 6 to 15 clues above `initialClueCount` (IG-P-Q18).
- The table is fitted on the population the owner accepts (OD-P6): it is the main lever on the accepted clue
  count, in both directions (it starts one clue above today's start at Nightmare and one below at 26x26 Master).
- Identity (IG-P-Q03): the prior, its table version, the target and the uniqueness mode are stored with the
  request and in the pack's generation meta; without a matching calibration the prior is rebuilt from the table
  and the set. Replay is defined on the full effective request, never on the seed alone.

### P5. Deterministic budgets and bounded set attempts

- A selection call has a **work budget** in units, counted over its profiles; when it is used up the call ends
  with its best result or `not-in-band`. The budget makes the outcome independent of the clock; it is **not** a
  time bound (the work rate spans 157 to 446 M units/s), so a wall-clock backstop stays beside it. *Version 2:*
  the single 6 G figure is withdrawn for a versioned table per level and area class (IG-P-Q10). Inputs
  (provisional, R21): of 413 successful prototype calls 15 % pass 1 G units, 5 % pass 2 G, 1 % pass 4 G and none
  6 G; without the screen 37 % pass 1 G and none 4 G; no call of any arm passed 8 G.
- A set attempt whose `locateCount` ends without a window (everything `TOO_FEW` down to the cheap side, or
  everything BELOW down to one clue) fails at once with a reason that names the side.
- The set job gets an attempt limit; when the first attempts all fail on the same side for the same reason, the
  request ends with a notice instead of running to 115 s (this is F1, generalised).
- *Version 2.* Whether the set and the batch share one deadline is the owner's open decision IG-P-Q02; the plan
  author recommends a shared request deadline with a reserved share for the batch. Its input now exists: after
  P1 to P5 the set stage takes 0.14 to 0.26 of a request (T1 / T10), and the nine batch slots take 3.4 to 6.2
  four-worker waves, more than the 2.25 to 2.75 the analyses assumed (R13).

### P6. DLX diagnostic only where it is shown

`solveFirst` runs on every completed rating and feeds only the diagnostic fields `B`, `branchTrials`, `rowTrials`,
`dlxStop`. Compute them for the accepted puzzle (and on demand for the display rating), not for the profiles of
the search. Scores are identical; the metrics of rejected profiles lose four diagnostic fields. It was left in
under RES-19's threshold; with ratings as the whole cost it is worth the owner's second look (OD-P2).

**Version 2.** Approved by the owner (OD-P2). Measured (provisional, R22): P6 alone on today's search gives T10
x1.32 on 26x26 Nightmare and x1.12 to 1.18 on Master, 9.9 to 22.8 % of the rating time. Version 1's "1.67 times"
was the cost of build plus deduction on one board, not a request factor. On the prototype the DLX share is 3.3
to 4.0 % of the rating time (R30), so after P1 to P5 P6 is worth a few per cent at Nightmare; it stays in phase 1
because it is cheap and changes no puzzle.

### P7. Same-units faster kernel

The caps are in work units, and the units are an abstract count. An implementation may compute a step faster and
still **charge the same units**; the rating, the caps and every stored number stay identical. Candidates, to be
ranked by PM2's profile of where the units and the time go:

- `fewestColumn` scans all C columns at every node; a bucket structure by live-row count finds the column in
  constant time and charges C units.
- The pocket labelling of R3, R7 and R8 floods the board after every placement; an incremental labelling touches
  the neighbourhood of the placement and charges what the flood would have.
- Model reuse: build the model of the layout once and derive each profile's model by covering the clue pieces,
  instead of `buildModel` per profile (0.9 to 19.6 ms each).
- A refutation memo inside one rating (a failed sub-state met again is charged its stored units and nodes and
  returned) is possible only if the same exact state recurs; PM2 counts recurrences before anyone designs it.

Each is tested by equality of the complete `DeductionResult`, `work` and `nodes` included, on a corpus.

**Version 2.**

- PM2 (provisional, R24, R30): on 10x10 and 12x12 Nightmare the kernel is 95.7 to 96.3 % of the rating time
  (search 78.5 and 91.3 %, census 17.8 and 4.4 %); the model build is 0.1 to 0.2 %. A kernel s times faster
  therefore gives nearly s on a request: 1.5 gives x1.47, 2 gives x1.92.
- Indicative function shares (they depend on V8's inlining): `select` 17.5 to 20.0 %, `ruleR4` 16.5 to 16.6 %,
  `neighbourCell` 7.9 to 10.5 %, `undo` 7.9 %. These rank the candidates: R4 first, then `select` and `undo`
  (the row placement and its kill loops, `deduce.js:444`, not the column choice, whose share was not reported),
  then the pocket labelling behind `neighbourCell`; section 9.3 develops them. Model reuse is dropped as a speed
  item (the build is 0.2 % at most).
- Phase 1 holds only the items whose equality of units, tie order and cap boundaries is proved; full-model reuse
  and the refutation memo are later items behind their own proofs (IG-P-Q13). The count of repeated exact states
  was not measured; the memo is not designed before it is.
- P7 is unmeasured, so every "after all phases" number is a Projection. A **P7 spike** (the two top candidates
  on 10x10, 12x12 and one Hell 1 board, equality checked, time per rating before and after) runs with the frozen
  round, before `gen-v4` is designed: it decides what 10x10, 12x12 and Hell 1 can reach (section 4).

### P8. Wider pool

`MAX_POOL_SIZE` 4 and 224 MiB per worker are sized for the largest board. Size the main workspace from the board
(the model bytes are known before the pool starts: 0.19 MB on 6x10 to 16.8 MB on 18x20) and allow
`min(8, hardwareConcurrency - 1)` workers when the total stays inside the memory budget. The puzzles do not
depend on the pool. Phones keep their present width.

**Version 2: demoted to an opt-in, measured per device.**

- Measured (provisional, R23; EPYC 7763, 16 logical cores): eight workers alone give T10 x1.13 at Nightmare
  (batch x1.26, set stage x0.94) and x0.93 at Master (batch x0.95, set stage x0.72). One rating takes 9 to 28 %
  longer at eight workers than at four, so most of the extra width is lost in the rating itself. P6 with eight
  workers: T10 x0.93 to 1.53 on today's search and x1.01 on the prototype (R25).
- Memory is not the obstacle: at eight workers the peaks were 450 MiB accounted and 914 MiB per process, inside
  both bench criteria (R26).
- So the default width stays today's. The width and admission rules of IG-P-Q05 stand for a later opt-in: the
  larger of today's width and `min(8, hardwareConcurrency - 1)`, never below 1, more than four only where
  `navigator.deviceMemory` reports at least 8, and only for the batch stage at Nightmare and above (the set
  stage and Master were slower at eight). It is enabled for a device class only after a browser run shows a gain
  there. Phase gates are read at four workers.
- Why a rating slows down at eight workers (memory bandwidth, cache, SMT pairs) is not measured; a short probe
  in the frozen round (one rating's time at 1, 2, 4, 8 concurrent workers) decides whether P8 is worth more work.

### P9. Idle pre-generation and a stock

After a batch, the auxiliary queue (it already yields to every main request) makes the next set and batch of the
same settings and stores them. A later request with those settings and that seed is answered from the stock. A
stocked batch is exactly what the generator returns for that seed.

### P10. Prepared packs

For a level and area where PM1 shows the band reachable but generation does not fit 115 s in the browser, ship
packs generated offline by the same generator (hours of Node time are acceptable there). Product decision OD-P3.

**Version 2.**

- The symmetric transformations of version 1 are withdrawn: `layoutKey` and `clueKey` are invariant under them,
  so they add no layout. A pack holds genuinely distinct layouts; its build gate goes beyond `verifyPack`
  (canonical rating in band, AR1, the uniqueness mode, distinct keys); novelty is checked when a puzzle is
  served; an exhausted pack says so and never repeats silently; the pack's content id belongs to the generator
  identity (IG-P-Q15).
- **Hell 3: nothing to pack.** A pack can only hold puzzles the canonical rating puts in the band, and PM1 found
  none within the work cap on 480 to 676 cells (0 of 201; the best is 47 to 84 points short). Reaching Hell 3
  needs a change of the rating's cap or scale, which is a difficulty feature, not this one.
- **Hell 2: packs are the only plausible route, and a weak one.** In-band ratings exist on six of nine boards,
  but only 8 of 404, all in the lowest 14 % of the band (112 to 119, Hell 1 ends at 112), none central, each
  with an incomplete census, at 17 to 53 s of rating per in-band rating in the diagnostic. The plan author's
  position: do not offer Hell 2 on these observations and do not spend a PM3 run on it yet; the rest of PM1's
  tranche 1 records the central share of Hell 2 first. If the owner accepts edge-of-band Hell 2 puzzles (OD-P3),
  packs are built offline; live generation is not expected to fit the budgets.
- P10 is not needed for Hell 1: where a window exists, live generation reaches ten puzzles in about 34 to 43 s
  in Node (section 4).

### P11. WebAssembly kernel

`measureDeduction` is integer code over typed arrays in one workspace, which is the favourable case. The module
must charge identical work units and pass the equality tests of P7; the JavaScript kernel stays as the reference
and the fallback. Only after P1 to P5, and only if PM2 shows the kernel dominating what is left.

### Considered and not proposed

- **Parallel search inside one rating** (alternatives of a guess node on different workers, merged in order):
  the workers are already saturated by candidates and set attempts, so it converts no idle time; exact cap
  accounting across subtrees is intricate.
- **A larger work cap or census** to rate more profiles: a rating change, and it makes failures dearer.
- **A refutation memo shared between profiles**: the work charged depends on the model of each profile
  (`fewestColumn` charges the model's column count), so identical accounting cannot be kept.
- **Guiding the first solution with the known layout**: it would change which path the rating measures.

## 4. Cost and times after the change (version 2)

```text
gen-v3   one call     3.8 to 10.9 profiles on average at Nightmare and Hell 1, each up to the cap (2.4 s);
                      20 when all are capped (38-48 s, no result)
         set job      unbounded attempts until 115 s
gen-v4   one call     a median of 2 locate probes from the prior (4 at Hell 1), then 0 to 4 window profiles;
                      a probe on the capped side costs W_screen where the class has a screen, else the cap
         set job      bounded attempts; ends early when no window exists (P5, not yet prototyped)
```

**Measured (provisional), Node, four workers, P1 to P5 only.** The class's `W_screen` of P2's table decides
which arm counts. The browser column is the planning rule (5 s + 4 x Node), **not a measurement**; the budgets
are a T10 median of at most 60 s and a p95 of at most 115 s. No p95 exists yet (two to six seeds per cell).

| Cell | Arm that counts | T10 median, Node | T1, share of T10 | Browser by the planning rule | Reading |
|---|---|---|---|---|---|
| 14x14 Nightmare | 190 M | 8.9 s (n 3) | 0.26 | about 41 s | meets the median budget; p95 unknown |
| 15x15b10 Nightmare | 190 M | 8.5 s (n 3) | 0.21 | about 39 s | the same |
| 12x12 Nightmare | none (default) | 16.5 s (n 6) | not reported | about 71 s | misses 60 s; with the 190 M screen 9.0 s, about 41 s (OD-P7), or with P7 at 1.3 about 56 s |
| 26x26 Nightmare | 190 M in the run; class undecided | 11.9 s (n 6) | 0.24 | about 53 s | meets the median budget; passes today as well |
| Hell 1 26x26 | none | 34.2 s (n 2) | 0.20 at 380 M | about 142 s | misses both budgets |
| Hell 1 20x20 | none | 42.9 s (n 2); T1 7.2 s | 0.17 | about 177 s; first puzzle about 34 s | misses both budgets |
| 10x10 Nightmare | none | not run; today 24.0 s | - | about 101 s today | no dead end to remove (0 % capped at the start count): rests on P7 |
| 16x16, 15x20 Nightmare | - | not run (R09) | - | - | frozen round |

**What this means.**

1. **Nightmare on 196 to 324 cells is solved in Node by the search alone**, and plausibly in the browser. This
   was the plan's first goal and it holds better than estimated, on three cells and three seeds each.
2. **Hell 1 is generable in Node wherever a window exists** (34 to 43 s for ten, where today serves nothing on
   20x20), but not within the browser budgets. To bring the browser median under 60 s the Node T10 must fall
   to about 13.75 s: a further 2.5 times on 26x26 and 3.1 times on 20x20. P6 and P8 give about nothing after P1
   to P5, P7's assumed range is 1.1 to 1.8 and P11's 1.3 to 2 on the kernel. So Hell 1 in the browser needs
   **P7 and P11 together at the upper end of their ranges, or progressive delivery** (OD-P5: the first puzzle
   after about 34 s, the batch continuing). A start near PM1's windows instead of K - 8 saves part of the 6 to 7
   probe walk on boards without a prior; it does not change this conclusion.
3. **10x10 and 12x12 Nightmare are limited by the rating itself**, as IG-P-Q12 said, but 12x12 gains more than
   the 1.1 to 1.8 times assumed there: x2.9 without the screen. 10x10 has no request-level run.
4. **The first phase is small.** After all same-puzzle items except P7 the factor is about 1.0 to 1.5 (R25), and
   about 1.0 on the prototype. The report's "/1.9" is not supported without a kernel about 1.9 to 2.1 times
   faster.
5. **Hell 2 and Hell 3** are not generation problems on these observations (P10).

Projection after all phases (R31; P7 assumed at 1.3, range 1.1 to 1.8, the first-phase factor transferred from
14x14 Nightmare; never a measured value): 14x14 Nightmare 6.8 s (3.2 to 8.8), 15x15b10 6.4 s, 12x12 without the
screen 12.5 s, 26x26 Nightmare 9.1 s, Hell 1 26x26 without the screen 26.0 s (12.4 to 33.6).

## 5. Measurements: done, and what the frozen round must add

**Done in the provisional round** (IGP-00 to IGP-07 and IGP-03h; 9,771.5 s of machine time; the harnesses are
under `tools/ig-proto/`, the records under `evidence/provisional/`):

| Id | What ran | Result |
|---|---|---|
| PM4 (IGP-02) | screen runs against canonical ratings at 95, 190 and 380 M on seven cells | the certificate holds (R14); useful ratings lost per `W` (R15); cost by clue offset |
| PM3 (IGP-01, 03, 03h) | P1 to P5 on seven cells, three to six seeds; arms 95, 190, 380 M and no screen on 12x12 and 14x14 Nightmare and Hell 1 26x26; arity 3; Hell 1 20x20 | rows R02 to R08, R10 to R13, R16 to R21, R32, R33 |
| IGP-04 | P6 alone; eight workers alone; both | R22, R23, R25, R26 |
| PM1 (IGP-05) | a reduced first slice (about 0.8 of 10 worker-hours): 22 cells without curves, fine counts on three Nightmare cells, eight failing Hell 1 sets | R27 to R29 |
| PM2 (IGP-06) | kernel profile on 10x10 and 12x12 Nightmare | R24, R30 |

**The frozen round** (post-MP17 source; preconditions in `clarifications.md`, "Frozen-round preconditions")
repeats those tasks and must add what version 2 rests on. In this order:

| Step | Addition | Decides |
|---|---|---|
| PM4 | unchanged | the certificate on the frozen source |
| PM3 | at least ten seeds on the five failing Nightmare cells and Hell 1 26x26 and 20x20, so that completion and a p95 exist; both arms (class `W_screen` and no screen) on every class of P2's table, 26x26 Nightmare included; 10x10, 16x16 and 15x20 Nightmare (R09); the (c4) arm; the re-rate-at-bracket-close variant (D-IG7); Hell 1 with a prior from PM1's windows | P2's table under rule (c5); OD-P6 and OD-P7; phase 2's go |
| PM3, non-regression | the ten Nightmare cells that pass today; Master cells on the `gen-v3` path inside the prototype (identical puzzles expected) | the scope rule of section 3 |
| PM1 | the rest of tranche 1, **reduced to the Hell 1 and Hell 2 cells** (Hell 3 is closed); needs the owner's approval (OD-P8) | P4's table for Hell 1 on 215 to 484 cells; the central share of Hell 2 |
| P7 spike | section 3, P7 | what 10x10, 12x12 and Hell 1 can reach; whether P11 is needed |
| P8 probe | one rating's time at 1, 2, 4 and 8 concurrent workers | whether P8 is worth more work |
| P5 | enforced budgets and the attempt limit in the prototype, once IG-P-Q02 is decided | the budget table; early ends |

Not in the frozen round: a PM3 run for Hell 2, P9, P10, P11 itself, PM1 tranche 2 (only if tranche 1 leaves P4's
table undecided), browser runs (phase 3).

## 6. Phases, tests and gates (version 2)

| Phase | Content | Version | Gate to continue |
|---|---|---|---|
| 0. Frozen round | section 5; no runtime change | none | the certificate holds; completion at least 90 % and no dead-end entry on the five failing Nightmare cells; no regression on the passing cells; the owner's answers to OD-P6, OD-P7 and IG-P-Q02 |
| 1. Same puzzles | P6. P7's proved-equal items, ranked by PM2 and the spike. P8 only as the opt-in of section 3, outside the gate | identical puzzles | equality of `DeductionResult` on the corpus; fixtures unchanged; `npm test`; gates read at four workers; both memory checks |
| 2. `gen-v4` | P1 sequential with the AR1 direction; P3 (D21 amendment); P2 with the certificate and the `W_screen` table; P4's table with stored identity; P5 with per-level budgets and the wall-clock backstop; Nightmare and Hell only | new `algo`, new fixtures | PM3 repeated on the production code, the passing cells included; the population reported per cell |
| 3. Offers | the landscape of Nightmare and Hell 1 (215 to 676 cells) and the browser runs; `AREAS` re-derived by D39's rule | policy id | D39 **and** the matching browser runs (IG-P-Q11); owner decisions on offers, on 10x10 and 12x12 (IG-P-Q12) and on OD-P5 |
| 4. Optional | P11 if the spike and phase 3 call for it; P7's later items; P10 for Hell 2 if OD-P3 chooses it; P9 | per item | per item; for P11 at least 1.5 times on a whole request |

Phase 1 no longer has to precede phase 2: it is worth about 1.0 to 1.3 times without P7, so `gen-v4` may be
designed as soon as phase 0 passes, with P6 and P7 in parallel.

Tests every phase keeps or adds:

- **Rating equality** (P2's certificate, P6, P7, P11): the canonical rating of a corpus does not change by one
  value; every certified screen run deep-equals its canonical rating.
- **Pool invariance**: the puzzles of a request are the same for 1, 2, 4 and 8 workers.
- **Determinism of budgets** (P5): the same request ends the same way on a slow and a fast machine, except at
  the wall-clock backstop.
- **Scope**: for Very easy to Master, `gen-v4` returns the puzzles of `gen-v3` for the same effective request.
- **Replay** (P4): a stored request reproduces its puzzles from its stored prior, table version, target and
  uniqueness mode.
- AR1 (`Gproved >= 1` at Hard and above), the centre rule and the uniqueness modes are unchanged and keep their
  tests; `tests/clues.test.js:701` keeps pinning `gen-v3`.

## 7. Decisions for the owner

| Id | Decision | State and the plan author's proposal |
|---|---|---|
| OD-P1 | A new `algo` version `gen-v4` after difficulty-v3 closes; seeds give other puzzles; D21 amended for capped profiles | **approved** (2026-11-14) |
| OD-P2 | The DLX diagnostic only for accepted puzzles (P6) | **approved** (2026-11-14) |
| IG-P-Q02 | One request deadline for set and batch, or two | **open, now due** (its trigger, PM3, has run provisionally). Proposal: one shared deadline with a reserved share for the batch |
| OD-P3 | Prepared packs (P10) | narrowed to Hell 2. Proposal: no packs now; decide after the rest of PM1's tranche 1 whether edge-of-band Hell 2 puzzles are acceptable |
| OD-P4 | Re-offering Hell levels | reworded (IG-P-Q11): D39 on phase 3's landscape **and** the matching browser runs. Hell 1 on 215 to 484 cells joins that landscape; Hell 3 is not offered in this feature |
| OD-P5 | Progressive delivery (show the puzzles as they are accepted) | proposal: **yes for Hell 1**, and for 10x10 and 12x12 Nightmare if the browser runs fail; it replaces the T10 criterion for those cells by a first-puzzle criterion, which is the owner's to set |
| OD-P6 (new) | The population rule of P3: the level is the score band, the centre rule and AR1; `gen-v4` may serve a set at the lowest in-band clue count it finds, one to three clues above today's on Nightmare and Hell 1 | proposal: **accept**, ideally after a small blind play comparison of the two populations on one cell; otherwise the fallback is today's start counts, which keeps today's failures on 14x14, 15x15b10 and Hell 1 |
| OD-P7 (new) | The screen on Nightmare boards of up to 144 cells: x1.56 on 12x12 for +0.75 clues on the same set | proposal: decide with IG-P-Q12 after the frozen PM3 and the browser runs; default no screen |
| OD-P8 (new) | The rest of PM1's tranche 1, reduced to the Hell 1 and Hell 2 cells, in the frozen round (under the 9 worker-hours estimated for the full rest) | proposal: approve |

## 8. Risks

- **Small samples.** Every gain rests on two to six seeds per cell, one machine and a pre-freeze source. Three of
  three complete requests is a one-sided 95 % lower bound of 37 % on completion; no p95 exists. The frozen round
  is the first evidence that can carry a gate.
- **The population moved** (section 0.2). The score was validated on today's population; whether it ranks
  puzzles with one to three more given pieces the same way is not tested. OD-P6 is the control; the blind play
  comparison is the only direct check.
- **Hell scores rest on census estimates**: 37 of PM1's 55 in-band window ratings, and all of MP12b1's 152
  accepted Hell 1 puzzles, were rated with an incomplete census. A faster search makes more such puzzles, not
  better-proved ones. The feature does not change that; the frozen round reports the share again.
- **Browser against Node.** Every number is Node on a server CPU and the planning rule's factor of 4 is not a
  measurement. It decides Hell 1, 10x10 and 12x12; only browser runs settle them.
- **The baseline moves.** MP12b3 (F1, F2), MP13 to MP17 change the source before the freeze; the anchored edits
  of the prototypes must be re-derived, and the cell list may change with the offers.
- **P7 may not deliver.** If the spike finds less than about 1.3 times, Hell 1 has no browser route except
  progressive delivery, and 10x10 stays as it is.
- **Two selection paths in `gen-v4`** (today's for Very easy to Master, the new one above): more code to keep
  equal. The scope test of section 6 bounds it; unifying the paths needs the Master non-regression result.
- **The nested family misleads** on small sets (K below about 12), where one piece changes the score by a level.
  With the scope rule this now matters only for small Nightmare boards (3x29, 10x10), which PM3 must include.
- **Fixtures and stored recipes** change with `gen-v4`; the puzzle code and packs keep their versions, as in the
  move to `gen-v3`.

## 9. Addendum (2026-11-15): against the `rating-v3` source, and further candidates for analysis

Written by the plan author after reading the `rating-v3` branch at `13d61fd` (MP12b2). Nothing was run for this
section. 9.1 and 9.2 are a reading of committed records; 9.3 is a list of **hypotheses for the analysts (Opus,
Astra) to examine**, not decisions: no item of 9.3 is in the phases of section 6 until an analysis and a
measurement support it. Line numbers are those of `core/engine/deduce.js`, which is identical on `rating-v3` and
on this branch.

### 9.1 What `rating-v3` changes for this plan

- **The runtime is the one the prototypes measured.** `13d61fd` changes no file of `core/`, `generator/` or
  `tools/` against `cd5d17f`; the source digest is still `34cea386…`. Sections 0 and 4 therefore apply to the
  current code without a transfer assumption. The frozen round is still needed, because MP12b3 and MP13 to MP17
  come before the freeze.
- **The tuple is locked** (`docs/difficulty-v3/calibration-2026-11-15.md` section 12): `SCORE_V3`, `DEDUCE`
  (work 760 M, census 80 M), `gen-v3`, `STALL_LIMIT` 12, `K60` and `SHARES`. Any change of the clue search needs a
  new `algo` id, which is what `gen-v4` is; any change of a cap or of what a work unit counts needs a new model.
  This is the constraint on every item of 9.3.
- **The fail-fast does not replace P1 and P3.** MP12b2's false-stop check: at Nightmare F2 fires 18 times and 11
  are false stops; F1 + F2 4 of 4; over all populations F1 2 of 7, F2 17 of 67, F1 + F2 5 of 21. Only "none"
  meets the zero-false-stop rule, and SA2 recommends none (owner question 1, open). So today's times stay as
  measured, and the dead end is removed only by moving the count (P3), not by stopping earlier. 11 of the 25
  successful Nightmare calls had four or more leading capped attempts, up to 18.
- **Today's Nightmare cost, call by call** (five serial captures, section 6 of the record): 334 of 441 raw
  attempts capped (75.7 %), 17.6 attempts per accepted puzzle (52.8 on 14x14), a capped attempt 2.1 s at the
  median. The prototype's 0.8 to 4.2 window profiles per call (R12) are to be read against that.
- **Hell is withdrawn by D39** (derived areas `[Infinity, Infinity]` for Hell 1, 2 and 3; best completion 45 %
  on 26x26). The record states that this search does not reach the Hell bands, not that they are unreachable.
  For Hell 1 this plan is the only route back; 9.2 gives the estimate. The availability probe agrees with PM1:
  `20x20` Hell 1 is 60 capped profiles of 60 at the start count, and `13x13b5` Hell 1 found in-band puzzles at 7
  and 8 clues.
- **A call can outlast the 115 s stop**: 136.3 s observed (`h-18x18-hell-2`, 64 profiles) and up to 105.1 s on
  14x14 Nightmare; 70 of 1,726 responses exceed 120 s. This is P5's reason and IG-P-Q02's subject.
- **Census estimates.** All 15 Nightmare cells carry more than 25 % estimated ratings (34 to 97 %), the fast
  large boards the most (84.5 % on 24x24, 97.0 % on 26x26): their speed may be the estimate reaching the band
  early (the record's item 8). A population that moves to more clues (section 0.2) may change that share; PM3
  should report it per arm.

### 9.2 Estimate on the current source

T10 median, Node, four workers. "After `gen-v4`" is Measured (provisional) where a count of seeds is given,
otherwise a Projection. "After all" divides by P6 and by a P7 assumed at 1.3 (range 1.1 to 1.8): a Projection.

| Cell | `rating-v3` today (requests with ten) | After `gen-v4` (P1 to P5) | After all (Projection) |
|---|---|---|---|
| 14x14 Nightmare | 113.0 s (55 %) | 8.9 s (n 3, 3 of 3) | about 7 s |
| 15x15b10 Nightmare | 86.2 s (55 %) | 8.5 s (n 3, 3 of 3) | about 6.5 s |
| 12x12 Nightmare | 62.1 s (85 %) | 9.0 s with the screen (n 6); 16.5 s without | about 7 s; 12.5 s |
| 16x16, 15x20 Nightmare | 79.8 s, 40.1 s (75 %) | not measured; 8 to 12 s (Projection: the same dead-end regime, capped share 63 % and 27 % in the serial captures) | 6 to 9 s |
| 18x18 to 24x24 Nightmare | 11.6 to 37.3 s | not measured; x1.5 to 2 (Projection from 26x26) | 6 to 15 s |
| 26x26 Nightmare | 18.6 s | 11.9 s (n 6) | about 9 s |
| 10x10 Nightmare | 24.0 s | about unchanged (no dead end; not measured) | about 18 s |
| Very easy to Master | 1.2 to 9.0 s at Master | unchanged (scope rule) | x1.1 to 1.5 |
| Hell 1 26x26 | 108.7 s (45 %); to be withdrawn | 34.2 s without the screen (n 2) | about 26 s |
| Hell 1 20x20 | no set in 115 s | 42.9 s (n 2, 2 of 2) | about 33 s |

### 9.3 Further candidates (hypotheses, unmeasured)

Where the time is after `gen-v4`: an accepted puzzle costs about three to four ratings (two locate probes and
0.8 to 4.2 window profiles, R12 and R19), and 96 % of a rating is the kernel (R24). The floor of the search
side is one rating per accepted puzzle, so the search can still give at most about 2 to 3 times; everything
beyond that is the kernel or the scheduling. The gains below are the plan author's guesses, to be replaced by
the analysts' estimates.

| Id | Candidate | Same puzzles? | Guess of the gain | First check |
|---|---|---|---|---|
| C1 | Incremental rule state in the ladder, with the scan's units charged exactly | yes, if the charges are proved equal | x1.2 from R4 alone; more if R3, R5 and R6 follow | equality of `DeductionResult` on the PM4 corpus; time per rating |
| C2 | Over-provisioned batch candidates, consumed in the fixed slot order | new `algo` (which candidates exist changes) | x1.3 to 1.6 on the batch, for more CPU | PM3 arm with 12 and 14 candidates for nine slots |
| C3 | A cheap predictor of the score from the DLX diagnostic, to choose the count and the subset before rating | new `algo` | up to x1.5 to 2, if the correlation holds | correlation on the existing records; no machine time |
| C4 | A memo of failed states inside one rating, with a real recomputation when the cap falls inside | yes, if units, nodes and the cap boundary are reproduced | unknown | count of repeated exact states per rating (PM2 did not count it) |
| C5 | A faster `select` and `undo` (the kill loops), then P11 | yes | x1.2 to 1.5 on the kernel | PM2 on a Hell 1 board and after C1 |

**C1. Incremental rule state.** `ladder` (`deduce.js:1448`) restarts at R1 after every applied rule, and each rule
rescans. `ruleR4` (`:709`) walks every uncovered piece and every row of its column, dead rows included, marks
the cells of the live rows, tests the first live row and clears the marks: three passes per piece per call, for
16.5 % of the rating time (R30, indicative). The quantity it computes, "the number of live rows of piece p that
cover cell c", can be kept as a counter updated in `kill` (`:432`) and `undo` (`:482`), which already walk the
row; `colCount[pc]` is already the piece's live-row count. The units the scan would have charged are a function
of static column lengths and those counters, so they can be charged without scanning. Obligations: the exact
charge up to the first piece with a kill, in ascending piece order; the same kills in the same order; `work` at
every `overWork()` check; the memory inside `memoryBytes`. `fewestColumn` (`:1541`) charges C per node and can
be served by buckets of live-row counts in the same way; its share was not reported by PM2 (it may be inlined
into `branch`). Question for the analysts: which of R3, R5 and R6 admit the same treatment, and does the
incremental upkeep cost more than the scans it saves on small boards?

**C2. Over-provisioned candidates.** Nine batch slots take 3.4 to 6.2 four-worker waves against an ideal 2.25
(R13): slots wait for a slow or failing candidate. Start more candidates than slots and consume the results in
the fixed (slot, candidate) order, so the outcome does not depend on the width or on timing. It spends CPU on
candidates that are discarded, and the history fold (`foldStart`, `foldAccept`) must see the same sequence as a
serial run. Question: where do the extra waves come from in the journals (failed calls, long calls, duplicates,
the fold), and how many spare candidates pay?

**C3. A cheap predictor.** Every completed rating records the score and the DLX diagnostic (`B`, `branchTrials`,
`rowTrials`), and the DLX run costs milliseconds. If the diagnostic, with U and the area, predicts the side of
the band, the locate phase and the choice among subsets of one count can run on the predictor, and only the
best candidate is rated canonically. Acceptance stays canonical, so a bad predictor costs time, not
correctness. It interacts with P6, which removes the diagnostic from search profiles: the predictor would be a
separate, cheaper call. Question: the rank correlation between the diagnostic and the v3 score per cell in
MP12b1's records and the prototype journals, and the share of capped profiles it would have predicted.

**C4. A memo of failed states.** Different placement orders can leave the same uncovered cells and the same
free pieces. A failed sub-state met again could be charged its stored units and nodes and skipped. The cap is
the difficulty: when the remaining allowance is smaller than the stored cost, the subtree must be searched for
real so that the cap falls at the same node. With the fewest-rows column choice a repeat needs two different
partial tilings of one region by the same pieces; whether that is common is the first thing to count. The
census and the final-path statuses (`status[...]` in `branch`, `:1634`) must come out the same.

**C5. `select`, `undo` and WebAssembly.** In PM2 `select` (`:444`: the placement of a row and the kills of the
rows that conflict with it) is 17.5 to 20.0 % of the rating time and `undo` 7.9 %. They are already linear in
what they touch, so the gain is constant-factor: tighter loops, no per-kill function call, then P11. Do it after
C1, which changes the same loops.

**Correction to P7's version 2 note.** That note ranked "the column choice and R4 first" from PM2's function
shares. `select` in that profile is the row placement of `deduce.js:444`, not the column choice
(`fewestColumn`), whose share PM2 did not report. The ranking from the evidence is: R4 (C1), then `select` and
`undo` (C5), then the pocket labelling behind `neighbourCell` (7.9 to 10.5 %), which P7 already lists.

**What Hell 1 needs in the browser.** The Node T10 must fall from 34 to 43 s to about 13.75 s (section 4). If
C1, C2 and P11 delivered x1.3, x1.4 and x1.5, their product is x2.7: just enough on 26x26, not on 20x20. That
is a product of guesses. Progressive delivery (OD-P5) stays the recommendation until measurements say otherwise.

### 9.4 Questions for the analysts

1. For C1: a proof sketch of the exact virtual charge for R4 and `fewestColumn`, and the list of rules it does
   not extend to.
2. For C2 and R13: the breakdown of the batch's waves from the existing journals (no new run).
3. For C3: the correlation analysis on the existing records, per level and area class, with a verdict on
   whether a predictor is worth a prototype arm.
4. For C4: whether exact state repeats can be counted with the `instr` variant of the harness, and on which
   cells.
5. An independent estimate of what Hell 1 can reach in Node after C1 to C5, with its envelope, and whether any
   item changes the frozen round's content (section 5).
