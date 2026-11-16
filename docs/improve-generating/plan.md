# Improve generating (Pentomino): a faster generator for Nightmare and the Hell levels

Plan author: claude-fable-5-2, 2026-11-14. Written with the answer to **PR-P2**
([clarifications.md](../difficulty-v3/clarifications.md)). Status: **proposal, nothing implemented**. It is the
input of a later feature ("improve-generating"); architects turn it into a design and a task pack.

Inputs read: [generator-state-2026-11-14.md](../difficulty-v3/generator-state-2026-11-14.md) (pipeline, cost
model, every measured time, MP12b1's aggregate) and the code at `53b2313` (`core/engine/clues.js`, `deduce.js`,
`difficulty.js`, `levels.js`, `policy.js`, `generate.js`, `core/browser/worker-pool.js`).

Labels, as in the state report: **Fact** (measured or read from the code), **Analysis** (derived, derivation
given), **Projection** (expected, not measured). **No generation, test or timing was run for this plan.** Every
speed-up below is a projection until the measurement phase (section 5) confirms it; each proposal has a gate.

## 1. Goal, non-goals and constraints

**Goal.** Within the existing budgets (T10 median at most 60 s, T10 p95 at most 115 s, response at most 120 s, at
least 90 % of requests with ten puzzles), in the browser:

1. Nightmare on every offered board, in particular the boards of 100 to 420 cells that fail today;
2. Hell 1 back on the boards where its band is reachable;
3. Hell 2 and Hell 3 where a measurement shows their band is reachable at all (section 5, PM1), by generation
   when it fits the budget and from prepared packs otherwise.

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

## 3. Proposals

Summary. "Identical" means: the same puzzles as today for the same request.

| Id | Proposal | Result | Projected effect | Confidence |
|---|---|---|---|---|
| P1 | Count search by bracketing from the cheap side | new `algo` | a band is located in about 2 log2 K profiles, most of them cheap | high for Nightmare; Hell gated by PM1 |
| P2 | Screen budget: a provisional small cap, canonical result when the rating completes | new `algo` | a useless profile costs 0.1 to 0.3 s instead of 2.4 s | high |
| P3 | A capped profile is a sided result ("too few clues") | new `algo` | the search moves instead of ending | high |
| P4 | Count prior: per set (from the calibration) and a fitted table replacing `SHARES` | new `algo` | 2 to 6 profiles per candidate instead of up to 64 | medium-high |
| P5 | Deterministic work budget per call and per set attempt; bounded set attempts | new `algo` | no call outlasts the stop; a hopeless request ends early | high |
| P6 | DLX diagnostic only for accepted puzzles | identical scores | up to 1.67 times less time on completed ratings | high; owner decision |
| P7 | Same-units faster kernel (virtual work accounting) | identical | constant factor inside every rating | medium, gated by PM2 |
| P8 | Wider pool with workspaces sized to the board | identical | up to 2 times on machines with 8 or more cores | high |
| P9 | Idle pre-generation and a stock | identical | the next batch of the same settings is ready | high |
| P10 | Prepared packs for the levels that do not fit the budget | product decision | Hell 2 and Hell 3 available at once | high; owner decision |
| P11 | WebAssembly kernel for `measureDeduction` | identical | 1.5 to 3 times on the kernel | low priority, gated by PM2 |

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

**Parallel variant for the set stage.** When workers are idle, the bisection takes P probe counts per round
instead of one (a (P + 1)-ary search, `log_(P+1) K` rounds), each probe a task. Results are consumed in count
order, so the outcome equals the serial one.

### P2. Screen budget

**Fact.** `measureDeduction(model, limits)` takes its limits as an argument; the work cap is consulted only by
`overWork()` and the node and work checks of `branch`; the census budget is `work + limits.census` and does not
depend on the main cap.

**Idea.** During the search, rate with `limits.work = W_screen` and `limits.nodes = N_screen`, far below the
canonical caps.

| Outcome under the screen budget | Meaning | Use |
|---|---|---|
| `stop` is `exhausted` or `solution-limit` | no cap was touched: the result **is** the canonical rating, value for value | a normal profile; no second rating |
| first solution found, then the cap during the solution count | G, info and the tier are final; only the count status (penalty 0, 1 or 2) is open, so the score is known to within 2 points | sided at once; re-rated canonically only if it is the candidate to accept or within 2 points of a band edge |
| the cap before the first solution | unknown, dear | `TOO_FEW` (P3); escalated only when the bracket needs it |

- `W_screen` per level is fitted in PM1 as a high percentile of the main work of in-band ratings; the first value
  to try is one eighth of the cap (95 M units, about 0.3 s). Escalation doubles it up to the canonical cap, so the
  total spent on one profile is at most twice the canonical cap, and on a useless profile usually one screen.
- The proof obligation is the first row of the table. Test: on a corpus, every rating that completes under the
  screen budget deep-equals the rating under `DEDUCE`.
- The accepted puzzle always carries a rating made with `DEDUCE`: either the screen result that touched no cap, or
  a canonical re-rating. Nothing about the rating changes.

### P3. A capped profile is a sided result

Treat "unrateable" as `TOO_FEW` in the count logic of P1 and in phase 1 (`above` side for the direction of the
count, without entering the stall count or the candidates). The AR1 refusal stays "spent" as today. This removes
the dead end of 2.2 point 1. It is guidance only: a capped profile is not proved to be above the band, and nothing
is accepted on that basis. The fail-fast F2 of MP12b3 is superseded where P1 runs (a call no longer spends four
capped profiles at one count); F1 becomes the bounded set attempts of P5.

### P4. Count prior

1. **Per set.** The calibration returns the count (and the window) at which it found the band. `generateBatch`
   passes it in every `puzzleCandidate` task; the candidate's `locateCount` starts there. The prior is a function
   of the set, hence of the seed: deterministic.
2. **Per level and board.** Replace `SHARES` by a table fitted on PM1's curves: the count at which the median
   score crosses the band centre, as a function of level, K and area class. It is only a starting point for the
   gallop, so an imperfect fit costs profiles, not correctness.

### P5. Deterministic budgets and bounded set attempts

- A selection call has a **work budget** in units (first value: 6 G units, about 20 s of one worker), counted over
  its profiles; when it is used up the call ends with its best result or `not-in-band`. No call can outlast the
  115 s stop, and the outcome does not depend on the clock.
- A set attempt whose `locateCount` ends without a window (everything `TOO_FEW` down to the cheap side, or
  everything BELOW down to one clue) fails at once with a reason that names the side.
- The set job gets an attempt limit; when the first attempts all fail on the same side for the same reason, the
  request ends with a notice instead of running to 115 s (this is F1, generalised).

### P6. DLX diagnostic only where it is shown

`solveFirst` runs on every completed rating and feeds only the diagnostic fields `B`, `branchTrials`, `rowTrials`,
`dlxStop`. Compute them for the accepted puzzle (and on demand for the display rating), not for the profiles of
the search. Scores are identical; the metrics of rejected profiles lose four diagnostic fields. It was left in
under RES-19's threshold; with ratings as the whole cost it is worth the owner's second look (OD-P2).

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

### P8. Wider pool

`MAX_POOL_SIZE` 4 and 224 MiB per worker are sized for the largest board. Size the main workspace from the board
(the model bytes are known before the pool starts: 0.19 MB on 6x10 to 16.8 MB on 18x20) and allow
`min(8, hardwareConcurrency - 1)` workers when the total stays inside the memory budget. The puzzles do not
depend on the pool. Phones keep their present width.

### P9. Idle pre-generation and a stock

After a batch, the auxiliary queue (it already yields to every main request) makes the next set and batch of the
same settings and stores them. A later request with those settings and that seed is answered from the stock. A
stocked batch is exactly what the generator returns for that seed.

### P10. Prepared packs

For a level and area where PM1 shows the band reachable but generation does not fit 115 s in the browser, ship
packs generated offline by the same generator (hours of Node time are acceptable there) and verified by
`verifyPack`. A request takes puzzles of a pack chosen by the seed; board symmetries (rotations and reflections
that map the board to itself) and a relabelling of the pieces multiply each entry, each derived puzzle being
rated once and accepted only if in band. This is the fallback that makes Hell 2 and Hell 3 available whatever the
generation time. Product decision OD-P3.

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

## 4. Cost after the change (Analysis and Projection)

```text
today     one call     <= 64 profiles, each up to the cap (2.4 s); 20 when all are capped (38-48 s, no result)
          set job      unbounded attempts until 115 s
proposed  one call     <= 2 log2 K screen profiles (most below the band, the others <= W_screen)
                       + the profiles inside the window (existing rules), within the call's work budget
          with prior   2 to 6 profiles
          set job      bounded attempts; ends early when no window exists
```

**Projection, Hell 1** (one in-band rating about 2.2 s, the 164-cell measurement): set stage about 14 profiles,
4 of them dear, about 12 to 15 s; each further puzzle 2 to 6 profiles at the prior, 5 to 13 s of one worker; nine
slots on 4 workers about 20 to 30 s. T10 about 35 to 45 s in Node, against no set at all today. By the design's
planning rule (browser = 5 s + 4 x Node) that is 145 to 185 s in a browser: **still over 115 s** unless P6, P7,
P8 or P11 take a factor of 2 from the rating. So Hell 1 in the browser depends on the rating-side items too, and
PM1 and PM2 must be read together before promising it.

**Projection, Nightmare on 144 to 324 cells.** The capped share (22 to 34 %) at 2.4 s per capped profile is most
of the set stage; with P2 it costs an eighth, and with P4 the candidates stop re-searching the count. A T10
median of 62 to 113 s should fall to a few tens of seconds in Node. The browser verdict needs BQ runs.

**Hell 2 and Hell 3.** Nothing can be projected: no rating in those bands has been timed. PM1 answers whether a
count window exists under the canonical cap and what an in-band rating costs. If one in-band rating costs about
the cap, ten puzzles do not fit 115 s on any device, and P10 is the route.

## 5. Measurement phase (before any design is fixed)

Node, 4 workers, under the machine lock; evidence in `docs/improve-generating/evidence/<id>/`.

| Id | Measurement | Output | Decides |
|---|---|---|---|
| PM1 | **Count curves.** For each cell (Nightmare on 100, 144, 196, 256, 324, 484 cells; Hell 1 on 196, 300, 484, 676; Hell 2 on 300, 484, 676; Hell 3 on 484, 676): 10 sets x 3 layouts x 2 nested orders; for every count from K - 8 down to 1 (stopping after three consecutive capped counts), one canonical rating | per count: score, G, `Gproved`, census complete, main work, nodes, time, outcome (complete, capped) | whether each band has a window; `W_screen` per level; the table of P4; the cost of an in-band rating at each Hell level; whether `SHARES` is off under v3 |
| PM2 | **Kernel profile.** On PM1's in-band and capped ratings: work units and time per rule (R1 to R9), `fewestColumn`, model build, census, DLX diagnostic; count of repeated exact states inside one rating | shares of units and of time | the ranking inside P7; whether P11 is worth a spike |
| PM3 | **Prototype of P1 to P5** behind a diagnostics switch, the bench's cases for the cells of PM1, 20 requests | T1, T10, completion, profiles per call, units per call | go / no-go; the budgets of P5 |
| PM4 | Screen equality: every PM1 rating that completes under `W_screen` against its canonical rating | equal or not | the correctness of P2 |

PM1 is the cheapest and decides the most; it uses only existing code (`rate` in a loop) and should run first.

## 6. Phases, tests and gates

| Phase | Content | Version | Gate to continue |
|---|---|---|---|
| 0 | PM1, PM2, PM4 (measurement only) | none | curves recorded; a window exists for the levels to be pursued |
| 1 | P6, P8, the proved-equal items of P7 | identical puzzles | equality of `DeductionResult` on the corpus; fixtures unchanged; `npm test` |
| 2 | P1 to P5 as `gen-v4`; PM3 | new `algo`, new fixtures | Nightmare cells meet the bench criteria in Node; Hell 1 cells reported |
| 3 | The landscape of the upper levels again; `AREAS` of the Hell levels re-derived by D39's rule | policy id | owner's offer decision |
| 4 | P9; P10 where phase 3 leaves a level reachable but too slow | storage, content | pack verification; BQ where it exists |
| 5 | P11 if PM2 after phase 2 justifies it | identical | equality tests; at least 1.5 times on a whole request |

Tests every phase keeps or adds:

- **Rating equality** (P2, P6, P7, P11): the canonical rating of a corpus does not change by one value.
- **Pool invariance**: the puzzles of a request are the same for 1, 2, 4 and 8 workers.
- **Determinism of budgets** (P5): the same request ends the same way on a slow and a fast machine, except at the
  115 s stop.
- AR1 (`Gproved >= 1` at Hard and above), the centre rule and the uniqueness modes are unchanged and keep their
  tests.

## 7. Decisions for the owner

| Id | Decision | Default proposed |
|---|---|---|
| OD-P1 | A new `algo` version after difficulty-v3 closes; seeds give other puzzles | yes |
| OD-P2 | The DLX diagnostic only for accepted puzzles (P6) | yes |
| OD-P3 | Prepared packs for levels that are reachable but too slow to generate (P10) | for Hell 2 and Hell 3 if PM1 finds windows |
| OD-P4 | Re-offering Hell levels: by D39's rule on the new landscape | yes, no new rule |
| OD-P5 | Progressive delivery (show the puzzles as they are accepted, the batch continuing) as the answer to T10 on slow devices | discuss with the browser numbers |

## 8. Risks

- **No window for a Hell level** on some areas: the first solution caps before G reaches the band. PM1 shows it
  before any build; those cells stay not offered, as today.
- **Hell scores rest on census estimates** (all 152 accepted Hell 1 puzzles): the score counts undecided
  alternatives as decisive. A faster search makes more such puzzles, not better-proved ones. This is a property
  of the rating that the owner sees at MP12b2 (cells above 25 %); the feature does not change it.
- **The nested family misleads** on small sets (K below about 12), where one piece changes the score by a level.
  There the gallop is two or three profiles and the existing sampling does the work; P1 must not be slower than
  today on Very easy to Master. PM3 includes those cells as a regression check.
- **Browser against Node**: every number is Node on a server CPU. The planning rule's factor of 4 is what makes
  Hell 1 uncertain; BQ runs decide.
- **Fixtures and stored recipes** change with `gen-v4`; the puzzle code and packs keep their versions, as in the
  move to `gen-v3`.
