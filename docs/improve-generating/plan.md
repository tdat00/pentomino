# Improve generating (Pentomino): a faster generator for Nightmare and Hell 1

> **Version 3 (2026-11-15), after the analysts' review of version 2 and the owner's decisions.** Version 2 with
> its section 9 addendum is this file at commit `240398f`; version 1 is at `555197b`. Version 3 folds in the
> joint report on version 2 ([plan-v2-joint-report.md](plan-v2-joint-report.md): its answers, its 22 corrections
> and its frozen-round scope), the plan-author answers IG-P-Q19 to IG-P-Q24 and the owner decisions IG-P-D1 to
> IG-P-D7 ([clarifications.md](clarifications.md)).
>
> **Every measured number is provisional (pre-freeze):** the `rating-v3` runtime of MP12b1 (source digest
> `34cea386…`), Node, four workers, two to six seeds per cell, no browser run. None is a gate result or an
> offer. The frozen round (section 5) is the first evidence that can carry a gate.

Plan author: claude-fable-5-2; version 1 on 2026-11-14, versions 2 and 3 on 2026-11-15. Analysts: Opus
(claude-opus-5.5) and Astra (gpt-6-astra). Status: **proposal; nothing implemented in `core/` or `generator/`**;
the prototypes are harnesses under `tools/ig-proto/`. This plan is the input of a later feature
("improve-generating"), which starts after difficulty-v3 closes (MP17); architects turn it into a design and a
task pack. Version 3 ran nothing: it reads committed records and the source.

Labels: **Measured** (a provisional record, cited as a row R<nn> of
[evidence/provisional/summary.md](evidence/provisional/summary.md)), **Derived** (arithmetic on such records),
**Projection** (rests on a stated assumption), **Fact** (read from the code). No browser figure in this file is
a measurement.

## 1. Goal, non-goals and constraints

**Goal.** Within the existing budgets (T10 median at most 60 s, T10 p95 at most 115 s, response at most 120 s,
at least 90 % of requests with ten puzzles), in the browser:

1. Nightmare on every offered board, in particular the boards of 100 to 420 cells that fail today.
2. Hell 1 back on the boards where its band is reachable: the candidates are the boards of 196 to 676 cells on
   which PM1 found windows. A candidate is not an offer (OD-P4's gates, section 6).

**Out of scope, by decision (OD-P9).** Hell 2 and Hell 3. On the boards the policy offers for Hell 3 (480 to 676
cells) none of 201 ratings was in band; on the targeted Hell 2 boards 8 of 404 were, all at the bottom edge of
the band. Other board and piece-count families hold a few census-estimated Hell 2 and Hell 3 scores outside the
policy areas. The closure is a scope and resource decision, not a proof that those levels are unreachable.

**Non-goals.** No change to the rating: `difficulty-v3`, the score tuple locked by MP12b2 (`SCORE_V3`, `DEDUCE`
with work 760 M and census 80 M, `STALL_LIMIT`, `K60`, `SHARES`), the rule ladder and the caps stay as they are.
Every accepted puzzle carries the canonical `rate` result. The feature changes **which clue subsets are rated,
in which order and under which provisional budget**, and how the work is spread.

**Constraints.**

- Determinism: every random choice from a named stream of the seed; results consumed in a fixed order; the
  puzzles do not depend on the pool size.
- Work is counted in deterministic units; a cap is a count, never a clock. The wall clock is a backstop only.
- The clue search changes, so the puzzles of a seed change: a new `algo` version `gen-v4` with new fixtures
  (OD-P1, approved). Any change of a cap or of what a work unit counts would need a new model and is excluded.
- Replay is defined on the full effective request, never on the seed alone (IG-P-Q03).

## 2. Diagnosis

### 2.1 Facts from the code and the state report

| Fact | Source |
|---|---|
| A profile that reaches a cap costs the whole cap, about 2 to 2.4 s; a complete Master rating has a median deduction of 36 to 78 ms | state report 2.2 |
| A capped profile is "spent": it is on no side of the band. In phase 1 of `selectClues`, a count whose samples are all spent has `below = 0` and `above = 0`, and the phase ends | `clues.js:432-464` |
| The clue count moves by one per step, at most `COUNT_CHANGES` = 8 steps, 4 samples each, from `initialClueCount(share, K)` | `clues.js:429-464` |
| The start shares `SHARES` are 0.14 at Nightmare and 0.10 / 0.06 / 0.04 at Hell 1 to 3: 3 or 4 clues on 31 to 90 pieces | `levels.js:18` |
| At Hard and above the cheap-side profiles are refused by AR1 and returned as `spent` before their score is kept | `clues.js:273-274` |
| The work cap is tested by `overWork()`, the node and work checks of `branch`, R7's direct checks, the probes, the replay and the census | `deduce.js:1102, 1128` and the search |
| The scheduler already dispatches ordered speculative candidates: attempt 0 of later slots and further attempts of the current slot, 12 attempts per slot, consumed in (slot, attempt) order | `generate.js:554`, `policy.js:87`, `generation-client.js:1057-1085` |
| The set job and the batch each start their own 115 s timer | `generation-client.js:447, 575, 812` |
| The pool has at most 4 workers of 224 MiB each | state report 1.9 |

### 2.2 What is wrong (Analysis, confirmed where a row is cited)

1. **The search starts in the wrong place and cannot leave it.** With 3 or 4 clues on a large set every sample
   reaches the cap. A capped profile gives the count search no direction, so it ends where it started. The band
   lies at a higher clue count, where ratings complete.
   - On eight failing Hell 1 sets (14x14, 24x24) all 160 start-count profiles are capped; seven of the eight
     sets have eligible in-band ratings 2 to 11 clues higher (R28).
   - On 12x12, 14x14 and 15x15b10 Nightmare and Hell 1 26x26, 0 to 7 % of the profiles at the start count are
     useful and 33 to 67 % at the best offset, two to four clues higher (PM4).
   - The dead end takes 37 to 40 % of the batch profile time on 14x14 and 15x15b10, 19 % on 12x12, and 0 % on
     26x26 Nightmare and Master (R10). It is profile time, not a critical path.
2. **Failure costs 30 to 60 times more than success.** A useful profile completes in tens or hundreds of
   milliseconds; a capped one costs 2.1 s at the median. Today 334 of 441 raw Nightmare attempts are capped
   (75.7 %), with 17.6 attempts per accepted puzzle and 52.8 on 14x14 (MP12b2's serial captures).
3. **What is learnt is thrown away.** The count at which a set's ratings fall in the band is found by the
   calibration and found again, from the same start, by every candidate of every slot.
4. **`SHARES` was fitted to the v2 rating.** Under v3 the count that gives Nightmare lies two to four clues
   above it on 144 to 300 cells and within one clue on 676 cells; for Hell 1 two or more above on every board
   measured; for Master at or below it.
5. **A call can outlast the stop.** 136.3 s observed for one selection call (18x18 Hell 2), and 70 of MP12b1's
   1,726 responses exceed 120 s (at most 229.1 s) under the two separate timers.
6. **The fail-fast of MP12b3 does not remove the dead end.** At Nightmare F2 fires 18 times and 11 are false
   stops; only "none" meets the zero-false-stop rule. The dead end goes away by moving the count, not by
   stopping earlier.
7. **The rating kernel is the rest.** On 10x10 and 12x12 Nightmare the search and census are 95.7 to 96.3 % of
   the rating time (R24). This profiles today's search; the DLX diagnostic is 3.3 to 4.0 % there and 3.6 % and
   10.2 % over complete windows (R30).

The G a band needs (about 8 and 12 decisive guesses at Nightmare and Hell 1) makes an in-band rating
intrinsically dear. That part cannot be removed without changing the rating.

### 2.3 What the search fix delivers (Measured, provisional)

The prototype (P1, P3, P4, and P2 where stated) removed the dead end: 0 entries in 548 calls (R11). On the
failing Nightmare cells it turned 55 to 85 % completion into 3 of 3 or 6 of 6 requests, and T10 medians of 62
to 113 s into 6 to 17 s. Hell 1 reached ten puzzles in Node on two boards, two requests each. The times are in
section 4. They come with a condition.

**The accepted puzzles move** (R32). The band and the centre rule are kept and every accepted rating is
canonical, but Nightmare and Hell 1 puzzles carry one to three more clues at the median. Two sources:

- *The choice of set.* Sets today's search gives up on are served at their in-band counts, two to four clues
  above today's start count, with or without the screen. PM4 found no in-band rating below +3 clues on four
  14x14 sets. Keeping today's distribution there means keeping today's failures.
- *The screen.* On the same set it adds +0.75 clues on 12x12 Nightmare (six seeds) and on Hell 1 26x26, and
  nothing on 14x14 Nightmare.

The owner decided the first (OD-P6, section 7): the level is the score band, the centre rule and AR1. Rule (c5)
of P2 bounds the second.

## 3. Proposals

"Identical" means the same puzzles as today for the same request. Gains are on the current source at four
workers. "Pursue", "prototype" and "park" are the joint report's verdicts, which this plan adopts.

| Id | Proposal | Result | Evidence | Verdict |
|---|---|---|---|---|
| P1 | Count search by bracketing, sequential | new `algo` | with P3 and P4: 14x14 Nightmare response x20.3 (n 3); 12x12 x9.3 with the screen, x2.9 without (Measured) | pursue: the core of `gen-v4` |
| P2 | Screen budget with the no-cap certificate; `W_screen` table under rule (c5) | new `algo` | 14x14 x2.6 (n 2, no shift); 12x12 x1.56 for +0.75 clue; Hell 1 26x26 x0.88 (n 2: 0.67 and 1.08), not shown to pay (Measured) | pursue where admitted |
| P3 | A capped profile is a sided result ("too few clues") | new `algo` | 0 dead-end entries in 548 calls (Measured) | pursue (D21 amended, OD-P1) |
| P4 | Count prior: a versioned table, then per set | new `algo` | locate median 2 probes, 4 on Hell (R19); the per-set prior is unbuilt | pursue; the per-set prior promoted |
| P5 | Deterministic work budget per call; bounded set attempts; one request deadline | new `algo` | no speed; completion loss to be measured | pursue, under IG-P-D1 |
| P6 | DLX diagnostic only for accepted puzzles | identical scores | today's search T10 x1.12 to 1.32 (Measured); after `gen-v4` a few per cent (Projection) | pursue (OD-P2); phase 1 |
| P7 | Same-units faster kernel (C1, then C5) | identical | total kernel gain 1.3 to 2.2 (sensitivity, unmeasured) | prototype in a scoped spike |
| P8 | Wider pool | identical | eight workers: x1.13 Nightmare, x0.93 Master; one rating 9 to 28 % slower (Measured, one machine) | park as a default; opt-in after a device measurement |
| P9 | Idle stock of the next batch | identical | the next batch only | park (late, optional) |
| P10 | Prepared packs | product decision | none | park; Hell 1's fallback if the browser gates fail and no service level replaces them |
| P11 | WebAssembly kernel | identical | part of the kernel gain; unmeasured | park until the JavaScript composite is measured |
| C3 | A predictor of the band's side from the DLX diagnostic | new `algo` | model x0.91 to 1.27; no forecast credit | a data-only test first |
| C4 | A memo of failed states inside one rating | identical if proved | unknown | park; count repeats first (needs approval) |

C1 and C5 of version 2 are P7's content. C2 is withdrawn (P5).

**Scope.** P1 to P5 run for Nightmare and Hell 1. Very easy to Master keep today's `selectClues` path inside
`gen-v4`, so their puzzles and times do not change: no Master call enters the dead end (R10), the prototype's
paired T10 there was x1.25 (14x14) and x0.83 (26x26, geometric mean 0.91, n 5), and 26x26 Master moved one
clue down (R07, R32). The frozen round may reopen this for a level only with a non-regression result on all 16
Master cells.

### P1. Count search by bracketing from the cheap side

**Idea.** The score falls, on average, when clues are added, and ratings with many clues are cheap. Start from
the prior (P4), gallop towards fewer clues until the band is reached or passed, then bisect. The dear ratings
are met only near the band.

```text
locateCount(layout, target, rng, prior):
  order = rng.shuffle(pieces)                  # one nested family: clues(k) = first k pieces of `order`
  hi = prior?.count ?? K - U0                  # fallback: U0 free pieces, about 8
  r = screenRate(clues(hi))                    # P2
  if r is in band: return hi
  step = U0
  while r is BELOW and hi - step >= 1:         # gallop: double the number of free pieces
    lo = hi - step; r2 = screenRate(clues(lo))
    if r2 is in band: return lo
    if r2 is ABOVE or TOO_FEW: break           # P3: a capped profile counts as TOO_FEW
    hi = lo; step = 2 * step
  while hi - lo > 1:                           # bisect between BELOW and ABOVE / TOO_FEW
    mid = (lo + hi) >> 1; r = screenRate(clues(mid))
    if r is in band: return mid
    if r is BELOW: hi = mid else: lo = mid
  return window [lo, hi]                       # the band was jumped over on this family
```

- The score is not monotone in the count and depends on which pieces are clues (order noise 6 to 13 points).
  So `locateCount` only finds the **window**; the existing machinery then works inside it: phase 1's samples at
  the window's counts, the beam with its add, remove and swap moves, the stall stop and the centre rule.
- **Direction from AR1-refused profiles (IG-P-Q07).** P1 keeps the canonical score of a refused profile and
  uses its side of the band as the direction. The profile stays ineligible for acceptance and for the stall
  count. Where G and info are census estimates the direction is marked as estimated in the records.
- **Always start from the prior.** Without one (Hell 1 20x20, start at K - 8) the first in-band rating came at
  the 6th or 7th probe, after one to three canonical caps of about 2 s each. With the table prior the locate
  median is 2 probes.
- **What a call costs after the locate.** Window profiles per call: mean 0.84 to 4.15, p90 3 to 13, maximum
  27. Successful Hell calls used 6.2 and 9.4 profiles. There is no proven ceiling on what the search side can
  still give.
- **Sequential only (IG-P-Q08).** The fixed arity-3 variant measured no gain (0.99 to 1.01) and wasted probes
  on Hell 1 (R20). The pool is used across slots and candidates, where the result does not depend on the width.

### P2. Screen budget

**Idea.** During the search, rate with a lower main-phase work limit `W_screen`; no other limit changes
(`N_screen` is not lowered).

**Contract (IG-P-Q01).**

| Outcome of a screen run | Meaning | Use |
|---|---|---|
| the main-phase work at the end is at most `W_screen` | no `work > workLimit` check differed from the canonical run: the result **is** the canonical rating | a normal profile; may be accepted |
| the main-phase work exceeded `W_screen` ("screen-capped") | unknown | steers the search only (`TOO_FEW`, P3); never accepted, never shown |

- Measured: 862 certified screen runs, each deep-equal to its canonical rating; overshoots, caps before and
  after the first solution and R7 cuts all observed, none of the cut runs certified (R14). The equality test
  stays in the suite on a corpus.
- No prototype call needed a canonical re-rating in 942 finished calls (R18). The rescue (re-rate the
  screen-capped profiles nearest the window before a call gives up) stays in the design as the fallback; the
  variant that re-rates when the bracket closes is a frozen-round arm (D-IG7).

**Rule (c5).** The screen is used on a class only where, against the same search without it, it does not move
the accepted clue count on the same set beyond the tolerance and is faster. Section 5.2 gives the statistics.
`W_screen` is a versioned table per level and area class:

| Class | `W_screen` | Basis (provisional) |
|---|---|---|
| Hell 1, every board | none (the canonical 760 M) | at 380 M the screen is not shown to pay (n 2: x0.67 and x1.08) and adds +0.75 clues on the same set; it loses 16 of 47 window ratings on 215 to 484 cells (R33) |
| Nightmare, 196 to 324 cells | 190 M, as the pilot value | 14x14: x2.6 with no same-set shift (n 2). Measured on 196 and 215 cells only; 256 to 324 cells are unmeasured, and the "no useful rating lost" of version 2 was 0 of 0 and 0 of 2 |
| Nightmare, up to 144 cells | none (OD-P7) | 12x12: x1.56 (n 6) for +0.75 clues on the same set. Revisited only with matched frozen-round and browser evidence; not carried to 10x10 |
| Nightmare, 360 cells and more | none until both arms have run | 26x26 was measured with the 190 M arm only (paired x2.01, 0.69 to 3.91); the default arm is unmeasured |

95 M stays a control: it loses 19 of 47 useful ratings (R15). The table is fitted on pilot seeds and frozen
before the validation seeds run; a class that fails validation falls back to no screen.

### P3. A capped profile is a sided result

Treat "unrateable" as `TOO_FEW` in the count logic of P1 and in phase 1: it gives the direction of the count
without entering the stall count or the candidates. The AR1 refusal stays "spent". It is guidance only: nothing
is accepted on that basis.

- The owner approved the amendment of D21 inside OD-P1. `tests/clues.test.js:701` keeps pinning `gen-v3`;
  `gen-v4` gets its own test. MP12b3's F1 and F2 stay as they are for `gen-v3`; the design lists which of their
  conditions remain under `gen-v4`.
- P3 is what moves the population. With the canonical cap the move is towards counts where ratings complete;
  with a screen cap it can pass a count whose rating would have completed, which is why rule (c5) binds P2.

**Population rule (OD-P6, approved).** The level is the score band, the centre rule and AR1; the clue count is
not part of it. `gen-v4` may serve a set at the lowest in-band count its call finds, also above today's
distribution. Conditions:

- The population (clue share, score position, census-estimate share, completion) stands beside every timing,
  per cell and two-sided.
- The refinement (c4), probing one count below the first in-band hit before accepting, is measured in the
  frozen round and adopted only if it costs less than 10 % of T10.
- A blind play comparison of the two populations on one Nightmare and one Hell 1 cell precedes any phase-3
  offer. Hell 1 on 14x14 is the extreme case (windows 8 to 11 clues above today's start count) and the natural
  Hell 1 cell for it. If the shifted population plays easier at the same score, the remedies are (c4) or a
  correction of the score in a difficulty feature, not a return to today's start counts.

### P4. Count prior

1. **Per level and board (built).** A versioned table replaces `SHARES` as the start of the gallop. The
   prototype filled it with MP12b1's accepted median per cell (reps 10 to 19). Where today has no accepted
   puzzle (Hell 1 on the candidate boards) it is filled from PM1's windows: about 0.35 of K given on 215 to 484
   cells. An imperfect fit costs profiles, not correctness.
2. **Per set (promoted, unbuilt).** The calibration returns the count and the window at which it found the
   band; `generateBatch` passes them in every `puzzleCandidate` task, and the candidate's `locateCount` starts
   there. On Hell the profiles before the first in-band hit are 51 to 55 % of the batch profile time, so the
   per-set prior is worth a factor of 0.65 to 1.0 on Hell batch time (Projection). It is the first pilot arm of
   the frozen round.

- The table is the main lever on the accepted clue count, in both directions. It is fitted on the population
  the owner accepted and on seeds that are not validation seeds.
- **Identity (IG-P-Q03).** The prior, its table version, the target and the uniqueness mode are stored with the
  request and in the pack's generation meta. Without a matching calibration (a saved set, a pack, a batch at
  another level) the prior is rebuilt from the table and the set.

### P5. Deterministic budgets, bounded set attempts and one deadline

- **A work budget per selection call**, in units, from a versioned table per level and area class (IG-P-Q10).
  When it is used up the call ends with its best result or `not-in-band`. It makes the outcome independent of
  the clock; it is not a time bound (the work rate spans 157 to 446 M units/s). Inputs (R21): of 413 successful
  prototype calls 15 % pass 1 G units, 5 % pass 2 G, 1 % pass 4 G and none 6 G; without the screen 37 % pass
  1 G and none 4 G.
- **Bounded set attempts.** A set attempt whose `locateCount` ends without a window fails at once with a reason
  that names the side. When the first attempts all fail on the same side, the request ends with a notice
  instead of running to the stop.
- **One request deadline (IG-P-D1, approved).** A 115 s generation stop inside a hard 120 s response bound,
  with a reserved share for the batch. Conditions:
  1. The reserve is a pilot parameter of the frozen round. After the new search the set stage takes 14 to 26 %
     of T10, so a set-stage cap near 40 % should rarely bind; the pilot shows how often it does.
  2. The work caps come first and the wall clock is the backstop. A stop by the clock may change how many
     puzzles a response holds, never which puzzle fills a slot.
  3. A response cut at the deadline returns the puzzles accepted so far.
  4. Lost completions are counted against the uncapped new search, per cell, before the reserve is fixed.

  Until the pilot has run the two separate budgets stay, with the whole-response time reported beside them.
- **What the budget arm is (IG-P-Q22).** P5 against the existing scheduling. The batch's time is set by a few
  long successful calls (the longest spans 59 to 81 % of the batch, at 2.3 to 5.2 times the median call), so a
  budget pays only by cutting such calls, and each cut is a completion at risk. The journals first get the
  dispatch, selection, completion, consumption and discard linkage they lack. A bounded prefetch with the fold
  unchanged is tried only as a named variant, if that linkage shows idle workers behind an awaited call. No new
  candidate universe or selection rule is in this feature.

### P6. DLX diagnostic only where it is shown

`solveFirst` runs on every completed rating and feeds only the diagnostic fields `B`, `branchTrials`,
`rowTrials` and `dlxStop`. Compute them for the accepted puzzle, and on demand for the display rating, not for
the profiles of the search. Scores are identical. Approved (OD-P2). Measured on today's search: T10 x1.32 on
26x26 Nightmare and x1.12 to 1.18 on Master, 9.9 to 22.8 % of the rating time (R22). P6 alone after `gen-v4`
is unmeasured; it is expected to give a few per cent, at most about 10 % on 12x12-like cells. It stays because
it is cheap and changes no puzzle. It interacts with C3, which would need the diagnostic as a separate call.

### P7. Same-units faster kernel

The caps are in work units, and the units are an abstract count. An implementation may compute a step faster
and still **charge the same units**; the rating, the caps and every stored number stay identical. With about
96 % of a rating in the kernel, P7 is the only item left that lowers the cost of a rating.

**C1: incremental R4, then R5.** `ladder` (`deduce.js:1448`) restarts at R1 after every applied rule, and
`ruleR4` (`:709-778`) rescans every uncovered piece and every row of its column: 16.5 % of the rating time
(R30, indicative).

- R4's exact charge per piece, from the joint report: `L_p + 2*n_p*s_p + (n_p > 0 ? s_p : 0)`, plus the sum of
  `L_c` over the common cells c, plus the sum of `(s_piece(r) + 1)` over the killed rows r. `L` is a static
  column length, `n_p` the piece's live rows and `s_p` its size (pieces have 5 to 13 cells on 14x14 Nightmare).
- R1 to R5, R8 and R9 contain no cap check: equality is needed as a sum per call, with the same kills in the
  same order. R6 (`closure`, `:858`), R7's direct checks (`:1102`, `:1128`), the probes and the census need
  equality as prefix sums at each check. R7's `reachable` (`:1013-1075`) is an area and colour-imbalance
  dynamic programme and needs its own accounting.
- Three representations are candidates: ordered live-row lists, a cache of each piece's common-cell set, and
  incremental counters updated in `kill` (`:432`) and `undo` (`:482`). The spike first records R4 invocations,
  static and live visits, dirty fractions and mutation counts, then compares them.
- Expected: x1.04 to 1.15; x1.20 is the zero-cost ceiling (Projection). About 250 to 450 lines plus tests.
- `fewestColumn` buckets only after its share is attributed (a reduced-inlining profile, diagnostic only); PM2
  did not report it.

**C5: `select`, `undo` and the kill loops** (`:444`): 31.2 to 35.3 % of the rating time is state handling.
They are linear in what they touch, so the gain is a constant factor, x1.05 to 1.2 (Projection). After C1,
which changes the same loops. The pocket labelling behind `neighbourCell` (7.9 to 10.5 %) follows.

**Rules.**

- Each item is tested by equality of the complete `DeductionResult`, `work` and `nodes` included, on PM4's
  corpus, with tie order and cap boundaries.
- C1, C5 and P11 are never multiplied. One composite is measured against one reference.
- Full-model reuse and the refutation memo (C4) are separate later items behind their own proofs (IG-P-Q13).
  The model build is 0.1 to 0.2 % of the rating time, so reuse is not a speed item.
- A change of `deduce.js` reopens only if the rating itself changes; it is locked by MP12b2.

### P8. Wider pool (parked as a default)

Measured on one 16-logical-core machine: eight workers alone give T10 x1.13 at Nightmare (batch x1.26, set
stage x0.94) and x0.93 at Master; one rating takes 9 to 28 % longer at eight workers than at four (R23). Memory
is not the obstacle: 450 MiB accounted and 914 MiB per process at eight, inside both bench criteria (R26).

The default width stays today's and every gate is read at four workers. The rules of IG-P-Q05 stand for a later
opt-in: the larger of today's width and `min(8, hardwareConcurrency - 1)`, never below 1; more than four only
where `navigator.deviceMemory` reports at least 8; only for the batch stage at Nightmare and above; enabled for
a device class only after a browser run shows a gain there. A probe in the frozen round (one rating's time at
1, 2, 4 and 8 concurrent workers) decides whether P8 is worth more work.

### P9, P10, P11 (parked)

- **P9, idle stock.** A stocked batch reserves its seed and is stored with the full effective request; it is
  served only on an exact match (IG-P-Q14). It helps the perceived time of the next batch only.
- **P10, packs.** Not needed for Hell 1 where live generation fits; kept as Hell 1's fallback if the browser
  gates fail and no service level replaces them. A pack holds genuinely distinct layouts (`layoutKey` and
  `clueKey` are invariant under symmetries and piece renaming); its build gate is the canonical rating in band,
  AR1, the uniqueness mode and distinct keys; novelty is checked when a puzzle is served; an exhausted pack
  says so; the content id belongs to the generator identity (IG-P-Q15). No pack for Hell 2 or Hell 3 in this
  feature.
- **P11, WebAssembly kernel.** `measureDeduction` is integer code over typed arrays in one workspace. The
  module must charge identical units and pass P7's equality tests, and preserve the floating-point reduction of
  `info`; the JavaScript kernel stays as the reference and the fallback. About 1,000 to 2,000 lines. Parked
  until the JavaScript composite of P7 is measured.

### C3 and C4 (analysis before any build)

- **C3, a predictor.** MP12b1's Landscape samples hold 18,956 completed v3 ratings with `branchTrials` and
  `rowTrials`. The Spearman correlation of the score with the diagnostic is 0.89 to 0.99 over whole curves but
  0.34 to 0.60 near the band on Nightmare, where U alone gives 0.82 on boards of up to 144 cells. Capped inputs
  cannot be predicted from these records: `difficulty.js:240-253` throws before the DLX runs. Next step: a
  data-only prediction test, held out by set and seed, against U, K, the area and P4's prior. A narrow
  soft-ranking arm on 196 to 484-cell Nightmare follows only if that test separates the band's sides. No
  forecast credit.
- **C4, a memo of failed states.** Counting repeats is feasible with a test-side edit of the `instr` tree. The
  key must cover what `sameState` compares (`covered`, `live`, `colCount`, trail and picked lengths), and only
  fully failed subtrees count, never capped ones. It is an engine run and needs its own approval. The memo is
  not designed before the count.

### Considered and not proposed

- **Parallel search inside one rating:** the workers are already saturated by candidates and set attempts, and
  exact cap accounting across subtrees is intricate.
- **A larger work cap or census:** a rating change, and it makes failures dearer.
- **A refutation memo shared between profiles:** the work charged depends on each profile's model.
- **Guiding the first solution with the known layout:** it would change which path the rating measures.
- **Stopping earlier (MP12b3's F1 and F2):** false stops; see 2.2 point 6.

## 4. Times before and after

T10 median in Node at four workers.

- *Today* is MP12b1, 20 requests per cell.
- *After `gen-v4`* is the prototype arm that P2's table selects (Measured, provisional).
- *After the recommended mix* is a Projection from one sensitivity: `T = T_search * gamma * (1 - g + g/k)`.
  `g` is the kernel's share, 0.85 to 0.96 (central 0.95); `k` one total kernel gain, 1.3 to 2.2 (central 1.7);
  `gamma` the per-set prior's factor on Hell only, 0.65 to 1.0 (central 0.8). No credit for P5, P6 after
  `gen-v4`, P8, C3 or C4.
- *Browser* is the sensitivity `5 s + 4 x median`. It is not a measurement and not D39's planning rule, which
  uses the Node maximum: today's 26x26 Nightmare has a maximum of 35.8 s, hence about 148 s. With two to six
  seeds no maximum of the new search is usable yet.

| Cell | Today: T10 (requests with ten, of 20) | After `gen-v4`: T10, completion | Clue-share median, today to after | Recommended mix: central (range) | Browser sensitivity: after `gen-v4` / mix |
|---|---|---|---|---|---|
| 14x14 Nightmare | 113.0 s (11) | 8.9 s, 3 of 3 (190 M) | 0.190 to 0.255 (+1.5 clues) | 5.4 s (4.3 to 7.2) | 41 / 27 s |
| 15x15b10 Nightmare | 86.2 s (11) | 8.5 s, 3 of 3 (190 M) | 0.182 to 0.227 (+1) | 5.1 s (4.0 to 6.8) | 39 / 26 s |
| 12x12 Nightmare, no screen (the default) | 62.1 s (17) | 16.5 s, 6 of 6 | 0.200 to 0.211 | 10.0 s (7.8 to 13.2) | 71 / 45 s |
| 26x26 Nightmare | 18.6 s (20) | 11.9 s, 6 of 6 (190 M; the default arm is unmeasured) | 0.133 to 0.167 (+1) | 7.3 s (5.7 to 9.6) | 53 / 34 s |
| 10x10 Nightmare | 24.0 s (19) | not run | - | 14.6 s (11.5 to 19.3), kernel only | 101 (today) / 64 s |
| 16x16, 15x20 Nightmare | 79.8 s, 40.1 s (15 each) | not run (R09) | - | unpriced: different regimes (63 % and 27 % capped) | - |
| 18x18 to 24x24 Nightmare | 11.6 to 37.3 s | not run | - | unpriced | - |
| Hell 1 26x26 | 108.7 s (9); withdrawn by D39 | 34.2 s, 2 of 2 (no screen) | 0.128 to 0.195 (+3) | 16.7 s (10.6 to 27.5) | 142 / 72 s |
| Hell 1 20x20 | no set in 115 s | 42.9 s, 2 of 2 (no screen) | none today; 0.357 | 20.9 s (13.3 to 34.5) | 177 / 89 s |
| 14x14 / 26x26 Master | 2.57 / 8.36 s (20) | outside `gen-v4`'s scope; with P6 2.2 / 7.5 s (Measured) | unchanged (legacy path) | 1.3 / 4.6 s, if the kernel spike passes | P6: 14 / 35 s; mix: 10 / 23 s |

**Reading.**

1. **Completion is not established.** The one-sided 95 % lower bounds are 37 % for 3 of 3, 61 % for 6 of 6 and
   22 % for 2 of 2. No 90 % claim and no p95 exist before the frozen round.
2. **Nightmare on 196 to 324 cells.** The search alone removes the failure on the two cells measured (196 and
   215 cells), in Node. The boards of 256 to 324 cells, 16x16 and 15x20 are unmeasured.
3. **12x12 Nightmare.** Without the screen it is 2.9 times faster than today (paired, n 5) at today's median
   clue share. It misses the browser median under the sensitivity unless the kernel gain arrives.
4. **10x10 Nightmare** has no request-level run. PM4's sample showed 0 % capped at the start count and the
   first report's correction 10 %; the prior may still help. It is priced on the kernel only.
5. **Hell 1** reached ten puzzles in Node on two boards, two requests each. Under the sensitivity the browser
   median needs a Node T10 of about 13.75 s, reached only at the optimistic ends of the mix. So Hell 1 in the
   browser rests on the per-set prior and the kernel together, or on a later service level (OD-P5 (b)).
6. **The same-puzzle items are small without the kernel.** P6 gives x1.12 to 1.32 on today's search; the
   eight-worker results are optional and device-dependent; the kernel is unmeasured. They are three separate
   things and are not combined into one "first phase" factor.

## 5. The frozen round

### 5.1 Preconditions, stages and content

Approved as a separately priced, staged manifest (OD-P10). Nothing of the provisional round carries over, and
difficulty-v3 keeps machine priority.

**Preconditions.** The freeze after MP17 and an identity receipt; the anchored edits of the prototypes
re-derived where MP12b3, MP13a, MP14a and MP14b moved them (`clues.js`, `generate.js`, `policy.js`,
`tools/calibrate.mjs`); `identity.mjs` and `compare.mjs` reporting "different source" instead of failing;
cells the frozen source hides run as explicit diagnostic offers (D-IG13); no fallback to the old runtime.

| Stage | Content | Output |
|---|---|---|
| 1. Preparation | the preconditions; optionally the browser calibration (IG-P-Q23): today's generator in a browser on a few offered cells (for example 10x10, 12x12 and 26x26 Nightmare, 14x14 Master) with matching Node runs on the same seeds, under its own small budget and approval | the identity receipt; a measured browser-to-Node factor; the manifest's price |
| 2. Pilots, on fitting seeds | the per-set prior on Hell 1 first; the journal linkage; each class's `W_screen` and the no-screen arm on every class, 26x26 Nightmare included; 10x10, 16x16 and 15x20 Nightmare (R09); (c4); the re-rate-at-bracket-close variant (D-IG7); Hell 1 on 24x24 and 14x14 as five-seed pilots with a no-screen, prior-guided arm; the P5 budget arm and the reserve of IG-P-D1; then the scoped C1 spike with visit counters, and C5; the P8 probe; a diagnostic attribution of `fewestColumn` | the fitted `W_screen` table, priors and reserve |
| 3. Freeze | the table, the priors and any ranker are fixed | their version ids |
| 4. Validation | 20 independent seeds per headline cell: 14x14, 15x15b10, 12x12, 16x16 and 15x20 Nightmare; Hell 1 26x26 and 20x20; Hell 1 24x24 and 14x14 only if their pilots reached ten on most requests. Controls: the completion-passing Nightmare cells, and all 16 Master cells on the legacy path | the gate verdicts of 5.2 |
| 5. Separately approved | the reduced PM1 (OD-P8): first a data-only inventory of the existing records (IG-P-Q24), then the Hell 1 cells with the failing-set work that feeds the per-set prior, then the Hell 2 cells for the central share only; C4's counting; C3's capped-input features; any further browser run | per item |

**Seeds.** The validation seeds are disjoint from every seed that fitted something: the provisional reps 0 to 5
and MP12b1's reps 10 to 19, which filled P4's table. A final difficulty-v3 record serves as today's arm only
where the source digest and the full effective request match and its seed fed no table; otherwise today's
search runs in the same round on the same seeds.

**Journals.** Dispatch, selection, completion, consumption and discard per batch call; the census-estimate
share per arm; the population two-sided.

**Stopping.** A cell's gate verdict is settled at its third request that fails to reach ten; the remaining
seeds still run if the cell's budget allows. Each task has a ceiling; a task that reaches it is reported as
incomplete and never extrapolated.

**Budget.** Priced after stage 1 from an enumerated manifest (commands, populations, repetitions, limits,
validation, grace, concurrency). An indication, not an allocation: several times the provisional round's
2.7 h; the analysts' median-based figure is about 5 to 9 h.

**Not in the frozen round:** P9, P10, P11 itself, PM1 tranche 2, a PM3 run for Hell 2, and anything for
Hell 3.

### 5.2 Admission statistics, fixed before the validation seeds run (IG-P-Q19)

The provisional seeds are fitting data: the first tolerance was chosen after 12x12 and 14x14 had been seen.
These are first values; the owner or the analysts may change them before the validation seeds run, not after.

- **Unit.** A matched set: the same seed and set key (`igSetKey`) served by both arms. Seeds are the independent
  units; puzzles inside one request are not.
- **Rule (c5), the clue tolerance.** Over the matched sets of a class, the median of the per-set paired
  difference (median accepted clue count with the screen less without it) is at most 0.5 clues, and at most one
  matched set in five moves by two clues or more. The pooled puzzle statistic is reported and not judged.
- **Rule (c5), faster.** Wall time binds: the geometric mean of the per-seed T10 ratio (no screen over screen)
  is at least 1.15, and its one-sided 90 % lower bound, resampled by seed, is above 1.0. A request that does
  not reach ten enters at the request limit. Work units per accepted puzzle are reported beside it and may not
  be worse with the screen.
- **Completion, apart.** The screen arm may reach ten on at most one request in 20 fewer than the no-screen
  arm. Sets that only one arm serves are listed with their outcome; they count in completion, not in the clue
  statistic.
- **Phase 0's completion gate.** At least 18 of 20 requests reach ten on each failing Nightmare cell, with no
  dead-end entry. A nearest-rank p95 of 20 is the second-largest value; it is reported as a tail observation.
- **No regression.** Master and below: identity, the same puzzles on the same seeds. Completion-passing
  Nightmare cells under the new search: at least 18 of 20 reach ten, and the per-seed T10 ratio (today over
  after) has a one-sided 90 % lower bound of at least 0.9. A cell whose tail already exceeds the limit today
  (18x18: 20 of 20, p95 134.5 s) is reported as completion-passing only.
- **Order.** A class that fails validation falls back to no screen; it is not refitted on the validation seeds.

### 5.3 What the provisional round measured

IGP-00 to IGP-07 and IGP-03h, 9,771.5 s of machine time; harnesses under `tools/ig-proto/`, records under
`evidence/provisional/`, the summary in `summary.md` (R00 to R33).

| Id | What ran | Rows |
|---|---|---|
| PM4 (IGP-02) | screen runs against canonical ratings at 95, 190 and 380 M on seven cells | R14, R15 |
| PM3 (IGP-01, 03, 03h) | P1 to P5 on seven cells, three to six seeds; arms 95, 190, 380 M and no screen on 12x12 and 14x14 Nightmare and Hell 1 26x26; arity 3; Hell 1 20x20 | R02 to R08, R10 to R13, R16 to R21, R32, R33 |
| IGP-04 | P6 alone; eight workers alone; both | R22, R23, R25, R26 |
| PM1 (IGP-05) | a reduced first slice, about 0.8 of 10 worker-hours | R27 to R29 |
| PM2 (IGP-06) | a kernel profile on 10x10 and 12x12 Nightmare | R24, R30 |

## 6. Phases, tests and gates

| Phase | Content | Version | Gate to continue |
|---|---|---|---|
| 0. Frozen round | section 5; no runtime change | none | the certificate holds; the completion gate and no dead-end entry on the failing Nightmare cells; no regression (5.2); the `W_screen` table validated under rule (c5); the reserve of IG-P-D1 fitted |
| 1. Same puzzles | P6; progressive presentation in fold order (OD-P5 (a)); P7's proved-equal items if the spike passes | identical puzzles | equality of `DeductionResult` on the corpus; fixtures unchanged; `npm test`; gates read at four workers; both memory checks |
| 2. `gen-v4` | P1 sequential with the AR1 direction; P3; P2 with the certificate and the validated table; P4's table and, if its pilot paid, the per-set prior, with stored identity; P5 with per-level budgets, bounded set attempts and the one deadline; Nightmare and Hell 1 only | new `algo`, new fixtures | the frozen round's validation repeated on the production code, the controls included; the population reported per cell |
| 3. Offers | the landscape of Nightmare and of Hell 1 on the candidate boards; the browser runs; `AREAS` re-derived by D39's rule; the blind play comparison | policy id | D39 **and** the matching browser runs, 20 requests at 90 % (OD-P4); the comparison done; the owner's decisions on offers and on 10x10 and 12x12 (IG-P-Q12) |
| 4. Optional | P11; P8 as an opt-in; P10 as Hell 1's fallback; P9; C3 and C4 if their tests support them; a service level for named cells (OD-P5 (b)) | per item | per item; for P11 at least 1.5 times on a whole request |

Phase 1 does not have to precede phase 2. P6 and progressive presentation are small and may ship first;
`gen-v4` is designed as soon as phase 0 passes.

**Progressive presentation (OD-P5 (a)).** The client already reports accepted puzzles as they arrive. Puzzles
appear in fold order (slot order), so what is shown does not depend on the device; the design states the
history policy for a batch that ends short (a shown puzzle is in the history). Today's offer criteria stay. A
service level that replaces the ten-puzzle and response criteria for named cells comes back to the owner only
with measured browser first-puzzle times (median and p95), a minimum delivered count, a timeout and the history
policy.

**Tests every phase keeps or adds.**

- **Rating equality** (P2's certificate, P6, P7, P11): the canonical rating of a corpus does not change by one
  value; every certified screen run deep-equals its canonical rating.
- **Pool invariance:** the puzzles of a request are the same for 1, 2, 4 and 8 workers.
- **Determinism of budgets** (P5): the same request ends the same way on a slow and a fast machine, except at
  the wall-clock backstop, which may change only the number of puzzles returned.
- **Scope:** for Very easy to Master, `gen-v4` returns the puzzles of `gen-v3` for the same effective request.
- **Replay** (P4): a stored request reproduces its puzzles from its stored prior, table version, target and
  uniqueness mode.
- AR1 (`Gproved >= 1` at Hard and above), the centre rule and the uniqueness modes are unchanged and keep
  their tests; `tests/clues.test.js:701` keeps pinning `gen-v3`.

## 7. Decisions

**The owner's decisions in force.**

| Id | Decision | Date |
|---|---|---|
| OD-P1 | A new `algo` version `gen-v4` after difficulty-v3 closes; seeds give other puzzles; under `gen-v4` a capped profile counts as "too few clues" (D21 amended) | 2026-11-14 |
| OD-P2 | The DLX diagnostic only for accepted puzzles (P6) | 2026-11-14 |
| Phase 0 | Official measurements start once difficulty-v3 freezes; prototypes are harnesses outside every fingerprint | 2026-11-14 |
| IG-P-D1 (IG-P-Q02) | One end-to-end request deadline with a reserved batch share, under the four conditions of P5 | 2026-11-15 |
| IG-P-D2 (OD-P5) | Progressive presentation now, in fold order, with the history policy stated; a service level only later | 2026-11-15 |
| IG-P-D3 (OD-P6) | The level is the score band, the centre rule and AR1, under the conditions of P3's population rule | 2026-11-15 |
| IG-P-D4 (OD-P7) | No screen by default on Nightmare boards of up to 144 cells | 2026-11-15 |
| IG-P-D5 (OD-P8) | The reduced PM1, in stages after the frozen source receipt; the Hell 3 cells dropped | 2026-11-15 |
| IG-P-D6 (OD-P9) | Hell 2 and Hell 3 closed for this feature as a scope decision; 24x24 and 14x14 Hell 1 get request-level arms as candidate populations | 2026-11-15 |
| IG-P-D7 (OD-P10) | A separately priced, staged frozen-round manifest after source preparation | 2026-11-15 |

**Still to come to the owner.**

| Id | Decision | When |
|---|---|---|
| The manifest | The price and machine envelope of the frozen round, and of the optional browser calibration | after stage 1 of section 5 |
| OD-P4 | Re-offering Hell 1 per cell: D39 on phase 3's landscape and the matching browser runs | phase 3 |
| IG-P-Q12 | 10x10 and 12x12 Nightmare if their browser runs fail: hidden in the browser, or a service level | phase 3 |
| OD-P5 (b) | A first-puzzle service level for named cells | with measured browser first-puzzle times |
| OD-P7, revisit | The 190 M screen on 12x12 | only with matched frozen-round and browser evidence |
| OD-P3 | Packs | only if Hell 1 fails the browser gates and no service level replaces them |

**Plan-author answers in force** (the text is in `clarifications.md`): IG-P-Q01 (the certificate), Q03 (stored
identity), Q05 (width and admission), Q07 (AR1 direction), Q08 (sequential P1), Q09 and Q10 (tables fitted on
the least expected work per accepted puzzle), Q11 (offer gates), Q13 to Q15 (later kernel items, the stock,
packs), Q17 and Q18 (population and the Hell windows), Q19 to Q24 (statistics, the round, Hell 1's range, the
budget arm, the browser rule, the Hell scope).

## 8. Risks

- **Small samples.** Every gain rests on two to six seeds per cell, one machine and a pre-freeze source. No
  completion claim or tail exists yet.
- **The population moved.** The score was validated on today's population; whether it ranks puzzles with more
  given pieces the same way is untested. The blind play comparison is the only direct check, and Hell 1 on
  14x14 may give half the pieces or more (K for those sets was not checked).
- **Hell scores rest on census estimates.** 37 of PM1's 55 in-band window ratings and all of MP12b1's accepted
  Hell 1 puzzles were rated with an incomplete census. A faster search makes more such puzzles, not
  better-proved ones. The share is reported per arm.
- **Browser against Node.** Every number is Node on a server CPU. The factor decides Hell 1, 10x10 and 12x12;
  only the calibration and the browser runs settle it.
- **The baseline moves.** MP12b3 and MP13 to MP17 change the source before the freeze; the prototypes' anchors
  must be re-derived and the cell list may change with the offers.
- **The kernel may not deliver.** If the composite is below about 1.3, Hell 1 has no browser route except a
  service level, and 10x10 stays as it is.
- **A per-call budget can lose completions.** MP12b3's false stops are the warning; the arm counts them
  against the uncapped search before any budget is set.
- **Two selection paths in `gen-v4`** (today's for Very easy to Master, the new one above): more code to keep
  equal. The scope test bounds it.
- **The nested family may mislead on small sets**, where one piece changes the score by a level. The measured
  3x29 and 10x10 Nightmare cohorts have K 17 to 19, so no measured cell shows it; the small Nightmare
  boards stay in the frozen round's pilots.
- **Fixtures and stored recipes** change with `gen-v4`; the puzzle code and packs keep their versions.
