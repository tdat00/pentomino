# Improve generating: independent analysis

SA2, gpt-6-astra. 2026-11-14. Worktree `improve-generating`, commit `cd5d17f`.
Plan author: Fable. This is phase 1; I have not read the other analyst's improve-generating files.

Code was read, not executed. No tests, generation, benchmark, qualification or timing-lock operation was run.
Calculations read committed JSON only. The full MP12b1 landscape is available in this worktree. This report
does not change the ongoing difficulty-v3 work or presume the owner's future MP12b2 decisions.

## 0. Verdict

P1-P5 are the right place to investigate: better clue counts and cheaper rejected profiles can matter much
more than an isolated solver micro-optimisation. P6 is comparatively contained. P7 and P8 need stricter
equivalence and memory specifications. P10 is a product fallback, not an algorithmic availability guarantee.

The most important corrections are:

1. **P2's post-first-solution row is false.** `keepPath`, the continued count, `runProbes` and
   `settleCensus` determine G, info and Gproved *after* the first solution. A smaller main budget can alter
   those quantities, not just the 0/1/2 solution penalty. A two-point score interval is unjustified.
2. Even a normal stop needs a positive “no main-cap effect” check: R7 itself examines the work limit.
   The plan's assertion that only `overWork` and `branch` read it is incomplete.
3. **The cheap side can be AR1-spent.** With many clues, Gproved is often zero. The current `rateSubset`
   discards that rating as `spent`. The bracket needs its score as guidance without making it an eligible
   candidate; otherwise a cheap all-forced start can reproduce the same directionless problem.
4. The 22-34% capped shares are diagnostic random samples, not production-search profiles. The 164-cell
   2.2 s number is an average over 104 rated *and capped* profiles, not an isolated in-band Hell 1 rating.
5. A deterministic 6 G-unit cap is not a wall-clock guarantee. It omits unmetered work, may overshoot at
   profile boundaries, and does not resolve the existing two-action 115+115 s budget.
6. **P7 model reuse is not automatically same-units.** The current clue-specific model removes clue cells
   and pieces. A full model with covered clue columns changes column/row counts, loop charges and potentially
   canonical tie order.
7. Workspace caps are not eagerly allocated 224 MiB per worker. They grow lazily. Neither a small accepted
   rating's workspace nor board area alone bounds all carving, search, enumeration and verification tasks.
8. **P10's transformations do not multiply distinct layouts for this app.** `layoutKey` and `clueKey`
   already quotient board symmetries and use shape ranks rather than piece names. `verifyPack` verifies
   existence, not the claimed canonical difficulty or AR1.
9. A near-cap rating does not prove that ten puzzles cannot fit 115 s on *any* device. It is the number of
   unsuccessful ratings and serial waiting, not ten accepted ratings alone, that must be costed.

**Projection, likely scenario:** after P1-P8, the current Nightmare request workload is about 4-12x faster
across the measured boards: for example 12x12 62.1 -> 10.6 s median and 14x14 113.0 -> 10.1 s.
Low benefit is no net gain; the explicitly optimistic model gives about 15x and 33x respectively.
This does not establish a new completion rate. Hell 1 becomes plausible on some boards, but neither Hell 1
re-offering nor any Hell 2/3 offer follows from these estimates alone.

## 1. Evidence, labels and measured baseline

### 1.1 Interpretation

- **Measured (M):** existing recorded observations or identified code constants. No new experiment.
- **Derived (D):** calculations over those observations.
- **Projection (P):** any assumption about a changed algorithm, applying a work rate to another population,
  a future browser, or a completion probability.
- Low/likely/high mean benefit scenarios, not confidence intervals. “Likely” is an engineering planning
  scenario contingent on the corrections and gates, not a statistically estimated future median.
- A request is the bench's set action followed by a ten-puzzle batch. T10 median/p95 are conditional on
  reaching ten. Response includes partial/no-set outcomes. A 115 s failure is **not** a 115 s T10.
- Current reports use four Node workers on the recorded Windows/EPYC machine. No measured v3 browser
  multiplier exists. The design's `5 + 4 * Node` planning rule remains a projection, not a timing fact.

Current code is `gen-v3`, `mixed-v2`, `difficulty-v3`, with the 80 M census. MP12b2/MP12b3 have not yet
frozen/changed the final offering in this snapshot. D39 applied to MP12b1 would hide every Hell level.
The eventual new generator must be based on the post-MP17 source and decisions, not this intermediate offer list.

### 1.2 All requested evidence families

Paths in this section are under `docs/difficulty-v3/`.

| Evidence | Measured/derived observations | Use here |
|---|---|---|
| GV2, `probe-2026-11-12.md`, `baseline-v2/` | M: 20 requests/cell. Master T10 median/p95: 6x10 0.4/0.7, 10x10 0.7/3.4, 12x12 0.8/1.7, 18x20 0.6/0.8 s | Historical v2, not a v3 exact-difficulty baseline |
| MP06b probe corpus, `probe-corpus-2026-11-12/` | M: deduction median 1.7 ms at 6x10 to 58.6 ms at 26x26; overall p95 83.1 ms, max 985.8 ms. Build median 0.9-19.6 ms; rating workspace peak 20.8 MB | Kernel/build scale; cannot treat these v2-made puzzles as Hell generation |
| Probe diagnostic | M/D: on 18x20, build+deduction+DLX is 1.67x build+deduction | Upper potential for P6 in that population, not 1.67x every request |
| MP07, `d21-measurements-2026-11-12.md` | M: 22x22 Hell 3 under v2, 48 ratings/puzzle, rating median/p95 0.499/0.633 s, 98.7-99.9% of time in ratings, carving 0.33 s, walk 18-42 ms. Serial ten 243.2 s; two workers 140.2 s, nine puzzles | Motivation for reducing profiles; wrong rating version for a new Hell latency forecast |
| MP09d2, `d21-v3-2026-11-12.md` | M: 20 capped profiles in 38-48 s; 164-cell Hell 1 two successful sets in three attempts, 104 profiles/232 s; 266-cell Hell 2 candidates above band, best 281 | Search-direction evidence, not proof of an intermediate in-band window |
| MP12a, `calibration-slice-2026-11-13.md`, `landscape-v3/r2/` | M: final-round Master 6x10 1.2/1.7, 10x10 9.0/16.4, 12x12 6.0/18.4, 18x20 3.4/5.3 s. Median deduction of complete Master ratings 36-78 ms except 6x10 46 ms | Current low/medium baseline and evidence that expensive rejection, not every successful rating, is the target |
| Round-2 probe `r2/probe/final.jsonl` | D in state report: 219 deduction records >20 ms give work-rate median 317 M units/s, p5/p95 157/446 M/s | Converts stored work to a unit-normalised cost proxy; not an actual new per-rating time |
| MP12b1, `landscape-v3-full/aggregate-2026-11-14.{json,md}` and selected reports | M: 105 cells, 1,726 requests, 15,933 puzzles, 83 cells with 20 requests, 22 reduced Hell cells with three | Main current source for all board tables and completion |
| Slow tests, calibration slice section 3/8 | M: 15x20 Nightmare calibration 13.7-13.9 s; 22x22 Hell 3 unrateable calibration 42.6-44.8 s; together 56.6 s. Ordering test 100.4-108.5 s; quick 23.0 s, full 122.6 s | Test costs have different bottlenecks; do not divide the full suite by the generation speed-up |

The main work cap is M 760 M units, main node cap 30,000, census 80 M. D at the recorded median work rate:
760/317 = 2.40 s and 80/317 = 0.252 s. At the recorded p5/p95 rates a 760 M charge corresponds to
4.84/1.70 s. This dispersion alone rules out a universal “6 G units means 20 seconds” guarantee.

### 1.3 Landscape findings that constrain availability

- M: all Master cells complete 20/20, T10 median 1.16-9.00 s. Very easy/Easy on 6x10 have layout-diversity
  failures; faster ratings do not manufacture distinct arrangements.
- M: Nightmare completion is 17/20 on 144 cells, 11/20 on 196 and 215, 15/20 on 256 and 300,
  19/20 on 100 and 400, and 20/20 on the other eight measured boards.
- M: the three Hell 1 prescreens produced 1, 2 and 25 puzzles on 196, 576 and 676 cells. Their later
  twenty-request runs produced 5, 13 and 134 puzzles respectively. They are separate populations.
- M: those full Hell 1 runs completed 0/20, 0/20 and 9/20 requests with ten. Set success was 5/20, 7/20
  and 20/20. Other Hell prescreens: 22 cells x three requests, no puzzle, each ending at approximately 115 s.
- M: all 152 accepted full-run Hell 1 puzzles are census estimates, deduction tier 3, Gproved positive;
  146 have `many` solutions, five `few`, one `unknown`. These are `any`-mode results, not uniquely solved packs.
- M: Nightmare census estimates range 34-97%; Master reaches 28.5% at 576 and 39.5% at 676.
  Thirty-one cells exceed 5%; twenty exceed 25%. Faster clue selection does not improve the strength of the census.
- D, rechecked from every selected report's `runs`: 70/1,726 responses exceed 120 s: 43 Nightmare and
  27 Hell 1. Fifty-four are partial batch timeouts, sixteen reach ten late. Maximum response 229.1 s.
  Each separate action stayed within its own deadline; the set-plus-batch requirement did not.

| Nightmare area/cell (M/D) | Ten | T1 median | T10 median/p95 | Max response | Sum of all response seconds in cell | Diagnostic capped share |
|---|---:|---:|---:|---:|---:|---:|
| 87, 3x29 | 20/20 | 0.88 | 5.31/7.64 | 9.86 | 105.2 | 8/352 |
| 100, 10x10 | 19/20 | 5.09 | 24.04/68.44 | 120.58 | 584.4 | 11/350 |
| 144, 12x12 | 17/20 | 13.93 | 62.14/176.07 | 191.11 | 1,596.8 | 81/360 |
| 196, 14x14 | 11/20 | 43.08 | 112.98/151.64 | 212.64 | 2,684.1 | 116/342 |
| 215, 15x15b10 | 11/20 | 43.21 | 86.23/141.56 | 200.62 | 2,448.2 | 111/342 |
| 256, 16x16 | 15/20 | 20.03 | 79.84/135.44 | 150.49 | 1,797.3 | 114/360 |
| 300, 15x20 | 15/20 | 15.80 | 40.09/111.21 | 155.66 | 1,457.6 | 109/360 |
| 324, 18x18 | 20/20 | 8.64 | 37.25/134.52 | 138.32 | 1,054.3 | 100/360 |
| 360, 18x20 | 20/20 | 3.21 | 16.80/63.12 | 64.00 | 477.4 | 77/360 |
| 400, 20x20 | 19/20 | 5.56 | 20.14/113.97 | 136.66 | 725.6 | 78/360 |
| 420, 20x21 | 20/20 | 4.45 | 24.17/47.92 | 124.88 | 608.0 | 68/360 |
| 480, 32x15 | 20/20 | 3.29 | 11.57/37.87 | 41.34 | 312.4 | 49/366 |
| 484, 22x22 | 20/20 | 3.65 | 17.28/33.93 | 36.08 | 384.6 | 63/370 |
| 576, 24x24 | 20/20 | 4.34 | 18.65/57.29 | 64.16 | 490.4 | 85/394 |
| 676, 26x26 | 20/20 | 5.23 | 18.61/31.38 | 35.96 | 381.2 | 69/400 |

T10 p95 is conditional; in particular 14x14's 151.64 s is not its response p95, which is 205.26 s.
Diagnostic samples were taken *after* the timed request on a fresh pool. Treating their capped fraction as
the production fraction is an explicit modelling assumption below, not a measured cause attribution.

### 1.4 Additional arithmetic from the committed accepted-puzzle counters

Each selected report retains `runs[].details.puzzles[].metrics.work`. These include main and census work.
Define **D unit-normalised seconds** `c = median(work) / 317,000,000`, using the average middle pair for
even counts; p95 is nearest rank. Interpreting `c` as a future latency is **P**, because it transfers the
probe's work rate and omits build/DLX/transport. This is better grounded than calling the 2.2 s mixed
164-cell average an accepted-rating benchmark.

`rho` is D the fraction of these accepted ratings with total work >175 M (95 M proposed screen +80 M
census). It is a useful screen-risk proxy, not a proof of an exact main-work threshold because cap
overshoot exists and the retained summary lacks the main/census split.

| Nightmare cell | `c` seconds, D proxy | `rho`, D | Likely screen-only divisor `s`, P |
|---|---:|---:|---:|
| 3x29 | 0.34 | 0.17 | 1.00 |
| 10x10 | 0.82 | 0.64 | 0.88 |
| 12x12 | 1.53 | 0.81 | 1.20 |
| 14x14 | 0.45 | 0.44 | 2.28 |
| 15x15b10 | 0.36 | 0.37 | 2.45 |
| 16x16 | 0.43 | 0.40 | 2.24 |
| 15x20 | 0.46 | 0.40 | 2.11 |
| 18x18 | 0.40 | 0.32 | 2.15 |
| 18x20 | 0.42 | 0.37 | 1.75 |
| 20x20 | 0.45 | 0.36 | 1.74 |
| 20x21 | 0.43 | 0.32 | 1.66 |
| 32x15 | 0.47 | 0.38 | 1.34 |
| 22x22 | 0.44 | 0.35 | 1.53 |
| 24x24 | 0.49 | 0.41 | 1.65 |
| 26x26 | 0.56 | 0.52 | 1.36 |

For Hell 1, the analogous D median/p95 proxies are 2.650/2.650 s on 196 cells (only five puzzles),
1.091/1.565 on 576 (thirteen), and 1.064/2.523 on 676 (134). They are not observed rating latencies.
All five, twelve of thirteen, and 132/134 respectively exceed 175 M total work. A one-eighth screen
therefore cannot be assumed to complete most useful Hell profiles without escalation.

Accepted clue counts also support investigating the starting prior: on 196-cell Hell 1, the five accepted
counts are 6, 6, 10, 11 and 12 rather than the initial 3/4; at 576, seven use five clues, five use six and one
uses seven; at 676, 34/66/33/1 use four/five/six/seven. This is evidence of a search mismatch, not a universal
monotone relationship or a fitted table.

## 2. Proposal-by-proposal verification

### P1. Bracketing from the cheap side

**Verified:** `core/engine/clues.js:207,429-478` (`selectClues`, `rateSubset`, count loop) starts at
`initialClueCount`, uses four samples per count and at most eight count changes. All-spent leaves both
sides zero and falls into another sixteen samples at the same initial count. Beam/centre/stall handling
is present, not new machinery.

Bracketing is feasible guidance, not binary search on a proved monotone function. Score, census completion,
AR1 and canonical proof order can all change non-monotonically with the removed clue. The 6-13-point
“order noise” was measured by changing tie order on fixed lower-level puzzles; it does not bound noise
between clue subsets or at Hell. Finding above-band ratings and easy below-band ratings does not prove
there is an uncapped in-band subset between them.

Fix the pseudocode boundaries: clamp `K-U0` to [1,K-2], handle a prior already above/capped, probe the
endpoint when a gallop step overshoots one, and initialise/validate both bracket ends. Keep complete
AR1-refused scores for *direction only*; they remain spent for acceptance/stall. Return a window, not the
first in-band puzzle before the unchanged central-half/final-repair rule has run.

The parallel multi-count variant is not serial-equivalent just because results are sorted by count.
It can visit different counts and encounter a different acceptable subset first. Specify one canonical
probe tree, consumed identically at every pool size, or explicitly make it a different `algo` path.

### P2. Screen budget

**Verified seam:** `difficulty.js:214` (`measureV3`) accepts deduction limits; production `rate:325` does
not expose an optional limits argument. `clues.js` has the injectable `ctx.rate` seam, currently receiving
only complete ratings or `IncompleteRatingError`. A production screen profile needs an explicit API.

**Incorrect claim:** `deduce.js:1518` (`keepPath`) initially marks later alternatives undecided.
`branch:1593` updates their status while counting solutions. `runProbes:1738` then spends the census
budget on the remaining undecided alternatives; `settleCensus:1786` replaces G/info/Cmax/Dmax and
Gproved. Reducing main work or nodes changes this starting knowledge and use of the census. The canonical
G/AR1 verdict is not final at the first solution. The score need not be within two points.

The no-cap case is promising but needs a stronger guard than the stop label alone. `ruleR7:1098,1102,1128`
checks `workLimit` inside its loops and can return `NONE` after exceeding it; `ladder:1448` can then try
R8/R9. Record whether any cap-sensitive branch was taken, and retain main/census work separately.
Require identical lookahead, solution limit, census, memory limits and model order. Prove completed
screen results equal the entire canonical rating, not merely score. Re-rate any uncertain case canonically
before acceptance and before relying on a narrow score interval.

A 95 M screen costs about 0.30 s at the median unit rate *before* a possible 80 M census and DLX/build.
If it restarts an accepted canonical rating, that 0.30 s is additional work. Doubling escalation is less
than twice the final main allowance only in the simplified charge model; repeated model builds, censuses,
diagnostics and cap overshoot need counting too. Tune this by level and board, not by a universal eighth.

### P3. Capped means a search direction

**Verified:** `rateSubset:254-288` currently returns the same `spent` marker for incomplete ratings and
AR1 refusals; the count loop deliberately skips both. Introduce a private richer outcome, with a separate
TOO_FEW direction for a cap. Keep AR1 refusal, exclusion and duplicate distinct.

Capped-before-first is not proof of above-band difficulty. Fewer clues can still produce an easy first
solution under a different path, while a useful near-band subset can cap under the provisional limit.
Escalation and independent nested orders are needed to avoid false no-window conclusions. P3 and P1 share
the same benefit; do not multiply a separate “P3 speed-up” into P1.

The final difficulty-v3 F1/F2 choice may differ from this snapshot. Record exactly what is superseded and
preserve the chosen notice/error meanings outside the new generator path.

### P4. Count prior

**Verified:** `generate.js:86` (`setAttempt`) returns the calibration clues, so its successful count is
already derivable, but there is no bracket/window metadata. `puzzleCandidate:172` and
`completionCandidate:224` start fresh `selectClues` calls. `levels.js:18,125` supplies the old shares.

A prior must be keyed by set *and target level, uniqueness mode and algorithm/prior-table version*.
The batch can target a different level from calibration, reuse a saved set without calibration, or begin
after history has excluded many layouts. Do not learn from whichever speculative worker finishes first.
Use immutable request-start information and a versioned fitted fallback.

Integration is wider than `generateBatch`: `generation-client.js:724-816`, `protocol.js:585,638,661-671`
and `tasks.js:160-187` have explicit payload readers/field lists. Persist or deterministically reconstruct
the prior used by later Generation Steps replay; do not let an updated fitted table reinterpret old seeds.

### P5. Deterministic work/attempt budgets

**Verified:** `generateSet:572` in `generation-client.js` defaults `maxSetAttempts` to Infinity;
`firstSetAttempt` has a separate default of 32. Profiles are limited to 64; uniqueness repairs are re-rated
outside that profile count (`clues.js:293-331`). Bounds can be added without changing the rating.

Account for every search and repair rating, including capped ones, census and escalations. Stop between
canonical ratings, or provide a reservation rule; truncating a canonical rating with a new cap changes
its meaning. Keep other budgets for carving, model building, uniqueness, layout walking and completion.
Specify total set attempts and how “same reason” is consumed in attempt order. “No window in this order”
is not “no possible puzzle in this cell”.

D: 6 G units at the measured median rate is 18.9 s, but at the measured p5 rate 38.2 s, before uncharged
work. The browser planning factor would already exceed 115 s on the latter. The per-profile overshoot can
add approximately a whole main+census allowance. Keep the clock guard as protection; deterministic counts
alone cannot guarantee response time on every device.

`generation-client.begin:447` starts a new timer for each of the set and batch actions. P5 does not by
itself fix the bench's 120 s end-to-end response. A shared request deadline, reserved batch budget or
changed UX contract is a separate owner decision, not an incidental budget implementation.

### P6. Deferred DLX diagnostic

**Verified:** `difficulty.js:252-284` runs `solveFirst` after a complete deduction and uses it only for B,
branchTrials, rowTrials and dlxStop. Removing it from discarded profiles preserves the scoring inputs.
It does not help profiles that throw before this call.

Use an internal search-profile type; canonical `RatingV3` must still be completed for accepted/exported
puzzles. `pack.js:765` (`readMetricsV3`) requires the full metrics. Fill diagnostics before acceptance
publication and before recording canonical equality. Rebuilding the accepted model may be necessary:
workspaces own one live model and later profiles overwrite it. Include that build and any uniqueness repair.
RES-19's 1.67x observation is not a blanket gain on mostly-capped Hell searches.

### P7. Faster kernel with unchanged units

**Verified targets:** `deduce.js:1541` (`fewestColumn`) really charges all C columns and uses lowest-column
ties; `labelPockets:947` and R3/R7/R8 scan connectivity; `tiling.js:68` builds each profile's compact model.

MRV buckets must preserve canonical ties and count/update/undo costs without adding new virtual units to
the frozen rating. Updating buckets may cost more than the saved scan on small models. Incremental
connectivity under cell deletion can split a whole region; it is not generally a local-neighbourhood
operation. Restore it correctly under lookahead, search backtracking and census replay.

The “build once, cover clues” suggestion is especially intrusive. Current `preparePlacements`
(`placements.js:180-227`) excludes clue cells/pieces and renumbers free columns and rows. Reusing the
unclued model changes C, loop lengths, virtual charges, H/R and possibly rule order. A compact, canonically
renumbered view with identical virtual operations needs a proof; merely charging the full model's C fails.

A refutation memo can reuse only a complete exact-state refutation, with the original virtual charge and
node effects. When the remaining budget is smaller than that charge, reproducing the original cap boundary
is not equivalent to charging a lump sum and returning failure. PM2 should establish useful recurrence
before that complexity is designed.

### P8. Wider pool

**Verified:** `worker-pool.js:68-75,139,193` caps width at four and worker accounting at 224 MiB.
`tasks.js:307` already accepts configurable main/scratch capacities. `workspace.js:ArenaWorkspace.array`
allocates buffers lazily and reuses them; 224 MiB is a ceiling, not every worker's resident allocation.

Before a set is carved, area does not determine its pieces or full model bytes. `countModel` itself walks
placements and requires concrete pieces/clues. Size for worst admitted tasks or grow safely within a
shared budget; do not admit eight workers based only on an accepted rating's 20.8 MB observation.
D: eight nominal 224 MiB ceilings plus 300 MiB main = 2,092 MiB, above 1.5 GiB. Main/scratch/cache peaks,
old retained arrays, worker runtime overhead and garbage collection matter.

Four to eight yields at most 2x worker throughput, less for serial set selection and the last batch wave.
The ordered fold already supports deterministic consumption (`generate.js:495,554`,
`generation-client.js:1045`), but deadline-sensitive outputs can still differ by pool size. Test uncensored
identity separately from censored completion.
Keeping phones at their current width requires an explicit resource-policy branch; `hardwareConcurrency`
alone can report more than four logical processors on a phone.

### P9. Idle stock

**Verified partial infrastructure:** `core/browser/auxiliary.js:createAuxiliaryQueue` runs idle-priority
tasks and yields to main work. It is not a set-plus-batch pre-generation orchestrator. Calling the ordinary
`generateSet`/`generateBatch` would begin a main job and change that ownership model.

Distinguish “next batch of this set” from “next set and its batch”. Stock keys need board mask/rotation,
set identity, target, uniqueness, seed, quantity, versions and relevant history snapshot/offset.
`puzzleCandidate` sees a frozen request-start history, while the completion pass sees the fold's later
history. Serving a stale stocked batch can violate novelty or choose different puzzles for the same
effective request. Persist provenance, cancel or preempt idle work safely, and define quota/eviction.
This changes perceived time on a hit, not the first uncached request's CPU cost.

### P10. Prepared packs

**Verified constraint, missed by the plan:** `keys.js:79,285,330,345` creates shape-ranked identities
minimised over board symmetries. Rotations/reflections and piece relabelling do not supply new layout/clue
keys for the existing novelty contract. A bank needs genuinely distinct layouts, not transformed copies
counted ten times. Respect `layoutDistance`, history limits, exhausted arrangements and set identity.

`tasks.js:85` (`verifyPack`) accepts a valid stored solution as an existence proof without rating it.
It does not establish in-band difficulty, Gproved, canonical metrics, uniqueness in `require` mode,
or ten distinct acceptable entries. Offline acceptance needs those additional checks under the frozen
rating. Transformed entries must be rated again or have frozen preverified canonical claims.

Packs cannot guarantee a level for which no in-band canonical puzzle exists. They also need exact board
mask/rotation/uniqueness coverage, bank version and exhaustion semantics. Preserve the frozen Player sample
and v1 puzzle-code goldens; new generated recipe fixtures are a different artefact population.

### P11. WebAssembly

The typed-array deduction kernel is a plausible target, but the canonical contract includes full work,
nodes, census, rule/tie order and floating-point info accumulation, not just a score. Keep integer search
order and JS-side floating-point accumulation identical or prove all output equality. Retain the JavaScript
reference/fallback, reproducible module source/build and transport/instantiation accounting.
It is a constant factor after P1-P5, and shares the same bottleneck with P7 rather than an independent
unlimited multiplier.

## 3. Feasibility, ownership and invariants

All line/file estimates below are **P engineering estimates**, changed production lines, excluding content
data, with focused test code additional. They overlap; they are not an additive project quote.

| Proposal | Production lines / files | Focused tests | Owner dependencies |
|---|---|---|---|
| P1 | 250-500 / 2-4 | 200-350 lines: non-monotone bracket, endpoints, small K, AR1 direction, centre rule, seeded order | OD-P1 |
| P2 | 120-280 / 3-5 | 200-400: every stop type, post-first cap/census, full-rating equality, escalation, overshoot | OD-P1; no permission to change rating |
| P3 | 40-100 / 2-3 | 80-150: cap/AR1/exclusion distinctions, no false acceptance, F1/F2 replacement | OD-P1, final MP12b2 fail-fast decision |
| P4 | 120-260 / 5-8 | 120-250: protocol, changed target, saved set, prior version, replay | OD-P1 |
| P5 | 150-350 / 4-7 | 180-350: all charged calls, repair, ordered failure, finite attempts, clock vs units | OD-P1; end-to-end deadline needs a separate decision |
| P6 | 60-150 / 3-5 | 100-220: complete accepted metrics, display/pack equality, deferred build | OD-P2 |
| P7 | 400-1,500 / 3-7 | 300-800: exact result/charges, undo, cap boundaries, model/tie parity | None if exactly equal; rating changes are out of scope |
| P8 | 120-300 / 4-7 | 180-300: 1/2/4/8 lanes, lazy memory, resizing, failures, deadlines | No separate listed decision; resource policy needs sign-off |
| P9 | 350-700 / 6-10 | 200-400: idle preemption, history revision, stock key, persistence | OD-P1 identity; product/energy policy not specified |
| P10 | 300-700 / 5-9 plus offline tooling/data | 200-400: rating/AR1/uniqueness, deduplication, masks, finite exhaustion, versions | OD-P3 and OD-P4 |
| P11 | 600-1,600 / 5-9 plus reproducible build | Equality corpus, integer/float/limit parity and fallback | Gate only if genuinely equal |

Relevant existing tests include `clues`, `deduce`, `difficulty-v3`, `generate`, `generation-client`,
`worker-pool`, `protocol`, `pack`, `generator-controller`, auxiliary/display-rating and puzzle-code tests.
The existing slow clue tests and canonical ordering tests have distinct purposes; replacing their
expected counts with the new algorithm must not erase the old rating/compatibility contracts.

### Compatibility checklist

- **Rating/requiredness:** freeze SCORE_V3, DEDUCE, census and canonical order; preserve AR1
  `Gproved >= 1` at Hard and above. Unlike Sudoku, Pentomino's requirement is a proved decisive guess,
  not a lower-technique floor certificate. Keep centre-seeking and `any`/`require` semantics.
- **Algo versus policy:** P1-P5 belong to `gen-v4`; P4's fitted constants are part of its identity.
  Re-derived areas need their own policy identity. Do not change `difficulty-v3` just because generation
  chooses different clues. Equal P6/P7/P8/P11 must preserve completed puzzle/rating fixtures.
- **Goldens/E analogue:** there is no reason to rewrite historical puzzle-code compatibility goldens
  when the generated sample/recipe fixture changes. In particular P-OD10 preserves
  `player/samples/sample-pack.json` and `tests/fixtures/puzzlecode-v1.json` byte-for-byte.
- **Wire/pack/cache:** strict task payloads need new prior/budget fields explicitly admitted.
  Full v3 metrics remain mandatory where canonical claims are required. Pack schema 1 and puzzle-code
  versions are not generator version numbers. A new search-profile type must not leak incomplete metrics.
- **History/determinism:** same board, set, target, seed, uniqueness, history snapshot and versions, with
  the same count-budget result, must give the same ordered batch. Seed alone without those inputs never
  describes a batch. Faster hardware/width can still avoid a deadline; mark that exception separately.
- **Qualification:** D39 requires twenty requests, measured status and >=90% ten-puzzle completion.
  It does not substitute for median<=60, p95<=115 and response<=120, nor does it enable BQ flags.
  Non-contiguous Hell availability cannot be represented safely by blindly spanning min-to-max area.
- **Generation Steps:** post-difficulty-v3 provenance/skip ordinals and work-meter contracts must include
  the new count search, screen escalation and deterministic stopping. Updating only clues and version.js
  would leave replay describing a different algorithm.

## 4. Per-proposal and cumulative speed estimates

### 4.1 Formula and assumptions for measured Master/Nightmare cells

The following is a reproducible **P scenario model** applied to the measured current request workloads.
It does not turn censored requests into known completed workloads, and it does not assume the new search
has the same conditional latency distribution. Projected p95s are scaled-tail scenarios only.

Let `t` be a current T10 median, conditional p95 or maximum response, in seconds; `q` the recorded diagnostic
capped fraction; `c` the accepted-work proxy in section 1.4; `rho` its screen-risk fraction.

```text
fixed request overhead H = 0.30 s
current profile proxy C0 = q*2.40 + (1-q)*c
screened profile proxy C2 = q*0.30 + (1-q)*(c + 0.30*rho)
s = C0/C2

Nightmare likely:
  F13 = 1.5*s
  F15 = 1.5*F13
  F18 = F15 * 1.1 * 1.35 * 1.5
  projected T(F) = H + (t-H)/F
  request speed-up = t/T(F), not F when overhead is significant

Master likely:
  F13 = F15 = 1  (keep the already-good clue strategy)
  F18 = 1.2 * 1.35 * 1.5 = 2.43
```

Basis/assumptions:

- H is P a fixed-overhead allowance informed by the approximately 0.3 s GV2 low-level batches, not a
  measured v3 fixed component. Actual carving can be much larger, notably an approximately 8 s failed
  carve in MP09d2; that tail is not eliminated by this model.
- 2.40/0.30 are D 760/95 M divided by the recorded 317 M units/s. The screen overhead on useful ratings
  explicitly charges one failed screen for fraction `rho`; escalation/census can cost more.
- `q` and `c` describe *different* diagnostic/accepted populations. Using them as the production mixture
  is P and is one of PM3's first falsification targets.
- P1's 1.5x profile-count reduction is P: deliberately below “64 to 14”, since 64 is a cap, not a mean,
  and window/beam/centre work remains. P3 is included, not multiplied again.
- P4's additional 1.5x reduction is P; P5 gets no independent successful-request speed factor.
  P6's 1.1x at Nightmare/1.2x at Master is below the measured 1.67x diagnostic-inclusive ratio.
  P7 1.35x and wider-pool 1.5x are P, below the ideal 2x width gain.
- These products describe one conditional scenario with explicit remaining costs. They are not
  independently measured multiplicative gains. A changed candidate distribution can invalidate them.

**Low benefit:** no useful net improvement; retain the reference strategy/kernel, factor 1, current seconds.
An ungated prototype can be slower than this. **High benefit, P:** P1=2x, P4=1.75x, P6=1.2x,
P7=1.6x, P8=1.7x, screen cost 0.15 s and no useful-profile restart overhead:

```text
sHigh = C0 / (q*0.15 + (1-q)*c)
F13High = 2*sHigh
F15High = 1.75*F13High
F18High = F15High*1.2*1.6*1.7
```

These are optimistic, not an upper bound. Master high uses diagnostic 1.67, kernel 1.8 and width 1.8,
with the same fixed overhead. Every table row's low/likely/high seconds and factor can therefore be
computed from the recorded inputs and the formulas above, without a hidden fitted constant.

### 4.2 What each proposal contributes

For each measured board/level use its `t,q,c,rho` above. The seconds formula applies separately to its
median/p95; the example is 14x14 Nightmare's D 112.98/151.64 s. Conditional effects are not additive.

| Proposal | Low / likely / high effect (P) and seconds rule | Availability consequence |
|---|---|---|
| P1 | Profile-count divisor 1/1.5/2. Example alone `T(1.5)` = 75.42/101.19 s. Master remains 1x | Can discover windows, or miss a non-monotone one |
| P2 | Divisor 1 / `s` / `sHigh`; likely ranges 0.88-2.45 across Nightmare. 14x14 `s=2.28`, about 49.6/66.5 s alone. 10x10 can get slower from rerating useful candidates | No acceptance on a provisional score; poor screens can lower reachability |
| P3 | 1x independent factor: its benefit is already in P1's directed search | Removes a directionless dead end, not a proof of a hit |
| P4 | Additional 1/1.5/1.75x profile reduction; after P1-P3, 14x14 33.18/44.46 -> 22.22/29.74 s | Same correct final acceptance; table/prior may alter hit paths |
| P5 | 1x credited for successful requests; refusal latency depends on count/work ceilings, not 115 s by definition | Earlier honest failures can reduce rather than increase completion; prevents unlimited attempts, not every clock timeout |
| P6 | Residual divisor 1/1.1/1.2 at Nightmare; 1/1.2/1.67 at Master. Only completed discarded profiles benefit | Same accepted ratings once diagnostic completion is restored |
| P7 | Residual divisor 1/1.35/1.6 at Nightmare, high 1.8 for Master; apply `T(F*g)` | Identical canonical result only with exact unit/model/cap parity |
| P8 | Residual wall divisor 1/1.5/1.7; Master high 1.8. No gain on an unchanged four-worker/phone path | Can recover deadline losses; does not change uncensored seed results |
| P9 | Stock miss same `T`; hit `epsilon` storage/validation time, speed-up `T/epsilon` | Only matching set/history/seed benefits; no measured hit latency or user stock-hit ratio exists |
| P10 | Verified untransformed pack: `epsilon`; on-the-fly transforms: `epsilon + nRatings*c/kEffective` plus validation | Only genuinely distinct preverified compatible entries count; no window means no pack |
| P11 | Whole residual factor `1/(1-h+h/k)`. P `h=0.75`, kernel `k=1.5/2/3` gives 1.33/1.6/2; 14x14 after P1-P8 10.14/13.52 -> likely 6.45/8.56 s | No new hits except deadline recovery; must pass >=1.5x whole-request gate |

P9/P10 cannot honestly be assigned measured millisecond lookup times from these repositories. A preverified
stored pack removes generation work, but import/validation/rendering still costs something. For P10 that
re-rates ten transformed Hell 1 entries on four lanes, a transparent P lower-work scenario is
`ceil(10/4)*c`: about 3.2-8.0 Node seconds using the three observed Hell 1 work proxies, before diagnostics,
validation and rejected transforms. It is not “instant” and not ten distinct layouts if they are symmetries.
For unobserved Hell 2/3 there is no measured `c`; keep the formula rather than inventing a rating latency.

### 4.3 Required before/after table: measured cells

All current pairs are **D from M**, after pairs **P likely**, median/conditional p95 seconds per request.
The right column is a *time-only* verdict for the final column:
`N+` means its Node scenario fits 60/115/120, using the scaled **maximum response**, not p95, for 120.
`B+` means the illustrative `5+4*T` projection fits all three; `B-tail` misses browser 115/120.
Neither symbol proves >=90% completion or passes an actual BQ gate.

| Board/area | Level | Current D | P1-P3 P | P1-P5 P | P1-P8 P | 60/115/120 verdict |
|---|---|---:|---:|---:|---:|---|
| 6x10 / 60 | Master | 1.16/1.69 | 1.16/1.69 | 1.16/1.69 | 0.65/0.87 | N+, B+ |
| 3x29 / 87 | Master | 1.95/4.22 | 1.95/4.22 | 1.95/4.22 | 0.98/1.91 | N+, B+ |
| 10x10 / 100 | Master | 9.00/16.44 | 9.00/16.44 | 9.00/16.44 | 3.88/6.94 | N+, B+ |
| 12x12 / 144 | Master | 5.96/18.41 | 5.96/18.41 | 5.96/18.41 | 2.63/7.75 | N+, B+ |
| 14x14 / 196 | Master | 2.57/16.28 | 2.57/16.28 | 2.57/16.28 | 1.23/6.88 | N+, B+ |
| 15x15b10 / 215 | Master | 5.15/18.00 | 5.15/18.00 | 5.15/18.00 | 2.30/7.59 | N+, B+ |
| 16x16 / 256 | Master | 4.59/7.68 | 4.59/7.68 | 4.59/7.68 | 2.06/3.34 | N+, B+ |
| 15x20 / 300 | Master | 3.97/9.13 | 3.97/9.13 | 3.97/9.13 | 1.81/3.94 | N+, B+ |
| 18x18 / 324 | Master | 3.53/6.83 | 3.53/6.83 | 3.53/6.83 | 1.63/2.99 | N+, B+ |
| 18x20 / 360 | Master | 3.39/5.26 | 3.39/5.26 | 3.39/5.26 | 1.57/2.34 | N+, B+ |
| 20x20 / 400 | Master | 4.53/7.18 | 4.53/7.18 | 4.53/7.18 | 2.04/3.13 | N+, B+ |
| 20x21 / 420 | Master | 4.02/6.77 | 4.02/6.77 | 4.02/6.77 | 1.83/2.96 | N+, B+ |
| 32x15 / 480 | Master | 4.60/12.37 | 4.60/12.37 | 4.60/12.37 | 2.07/5.27 | N+, B+ |
| 22x22 / 484 | Master | 6.04/13.23 | 6.04/13.23 | 6.04/13.23 | 2.66/5.62 | N+, B+ |
| 24x24 / 576 | Master | 5.91/9.17 | 5.91/9.17 | 5.91/9.17 | 2.61/3.95 | N+, B+ |
| 26x26 / 676 | Master | 8.36/16.64 | 8.36/16.64 | 8.36/16.64 | 3.62/7.03 | N+, B+ |
| 3x29 / 87 | Nightmare | 5.31/7.64 | 3.64/5.20 | 2.53/3.57 | 1.30/1.77 | N+, B+ |
| 10x10 / 100 | Nightmare | 24.04/68.44 | 18.30/51.97 | 12.30/34.74 | 5.69/15.76 | N+, B+ |
| 12x12 / 144 | Nightmare | 62.14/176.07 | 34.74/98.19 | 23.26/65.56 | 10.61/29.60 | N+; B-tail |
| 14x14 / 196 | Nightmare | 112.98/151.64 | 33.18/44.46 | 22.22/29.74 | 10.14/13.52 | N+, B+ |
| 15x15b10 / 215 | Nightmare | 86.23/141.56 | 23.67/38.72 | 15.88/25.92 | 7.30/11.80 | N+, B+ |
| 16x16 / 256 | Nightmare | 79.84/135.44 | 23.94/40.46 | 16.06/27.07 | 7.37/12.32 | N+, B+ |
| 15x20 / 300 | Nightmare | 40.09/111.21 | 12.86/35.32 | 8.67/23.64 | 4.06/10.78 | N+, B+ |
| 18x18 / 324 | Nightmare | 37.25/134.52 | 11.73/41.82 | 7.92/27.98 | 3.72/12.73 | N+, B+ |
| 18x20 / 360 | Nightmare | 16.80/63.12 | 6.60/24.29 | 4.50/16.29 | 2.19/7.48 | N+, B+ |
| 20x20 / 400 | Nightmare | 20.14/113.97 | 7.92/43.97 | 5.38/29.41 | 2.58/13.37 | N+, B+ |
| 20x21 / 420 | Nightmare | 24.17/47.92 | 9.87/19.40 | 6.68/13.03 | 3.17/6.02 | N+, B+ |
| 32x15 / 480 | Nightmare | 11.57/37.87 | 5.92/19.03 | 4.04/12.79 | 1.98/5.91 | N+, B+ |
| 22x22 / 484 | Nightmare | 17.28/33.93 | 7.68/14.91 | 5.22/10.04 | 2.51/4.67 | N+, B+ |
| 24x24 / 576 | Nightmare | 18.65/57.29 | 7.70/23.27 | 5.23/15.62 | 2.51/7.18 | N+, B+ |
| 26x26 / 676 | Nightmare | 18.61/31.38 | 9.25/15.49 | 6.27/10.43 | 2.98/4.85 | N+, B+ |

The 12x12 exception is important: its likely screen-only benefit is modest because useful accepted ratings
already consume substantial work. Its projected maximum response is 32.10 s Node, giving 133.4 s by the
browser planning rule; projected p95 gives 123.4 s. A good median alone does not qualify it.

| Nightmare, after P1-P8 | Low-benefit median/p95 P | Likely median/p95 P | High-benefit median/p95 P | Likely median speed-up D over P |
|---|---:|---:|---:|---:|
| 3x29 | 5.31/7.64 | 1.30/1.77 | 0.68/0.86 | 4.1x |
| 10x10 | 24.04/68.44 | 5.69/15.76 | 2.21/5.78 | 4.2x |
| 12x12 | 62.14/176.07 | 10.61/29.60 | 4.12/11.17 | 5.9x |
| 14x14 | 112.98/151.64 | 10.14/13.52 | 3.40/4.46 | 11.1x |
| 15x15b10 | 86.23/141.56 | 7.30/11.80 | 2.46/3.86 | 11.8x |
| 16x16 | 79.84/135.44 | 7.37/12.32 | 2.54/4.11 | 10.8x |
| 15x20 | 40.09/111.21 | 4.06/10.78 | 1.52/3.69 | 9.9x |
| 18x18 | 37.25/134.52 | 3.72/12.73 | 1.43/4.39 | 10.0x |
| 18x20 | 16.80/63.12 | 2.19/7.48 | 0.92/2.67 | 7.7x |
| 20x20 | 20.14/113.97 | 2.58/13.37 | 1.07/4.69 | 7.8x |
| 20x21 | 24.17/47.92 | 3.17/6.02 | 1.28/2.25 | 7.6x |
| 32x15 | 11.57/37.87 | 1.98/5.91 | 0.88/2.23 | 5.8x |
| 22x22 | 17.28/33.93 | 2.51/4.67 | 1.05/1.79 | 6.9x |
| 24x24 | 18.65/57.29 | 2.51/7.18 | 1.04/2.60 | 7.4x |
| 26x26 | 18.61/31.38 | 2.98/4.85 | 1.19/1.82 | 6.2x |

For every Master row the low scenario is its current pair, likely is the table, and high is
`0.30+(t-0.30)/(1.67*1.8*1.8)`. Hard/Expert and below should retain their current clue search; they were
already at most 3.6 s median T10 in MP12b1. Any kernel benefit there is incidental, with no numerical
completion improvement credited.

### 4.4 Hell cells: conditional construction cost, not division of a timeout

There is no legitimate way to calculate a new Hell 1/2/3 T10 by dividing the 115 s no-set response.
Instead use the accepted Hell 1 work proxies, **conditional on P1 actually finding a useful window**.
The following P construction model includes one calibration and nine more puzzles:

```text
P1-P3, four lanes: 1 + (4 + 3*8)*c = 1 + 28*c seconds
P1-P5, four lanes: 1 + (4 + 3*4)*c = 1 + 16*c seconds
P1-P8, eight lanes: 1 + (4 + 2*4)*c/(1.1*1.35) = 1 + 8.081*c seconds
```

The 1 s allowance is P approximately 0.5 s for ten cheap bracket probes (the measured Master
36-78 ms deduction scale) plus 0.5 s setup/build/walk allowance. Four dear calibration profiles, eight
candidate profiles without a prior, and four with it are **P counts**, not observations. `ceil(9/4)=3`
and `ceil(9/8)=2` are D batch waves. A tail stress surrogate doubles the dear-profile counts and uses
the D accepted-work p95 proxy instead of `c`. It is labelled `tail`, not a statistically inferred p95.

| Area/cell and level | Current M/D completion and time | P1-P3 P median/tail | P1-P5 P median/tail | P1-P8 P median/tail | Budget and Hell offerability |
|---|---|---:|---:|---:|---|
| 196, 14x14 Hell 1 | 0/20 ten; T10 unavailable; response median/p95/max 115.01/221.85/229.10 | 75.2/149.4 | 43.4/85.8 | 22.4/43.8 | P13 misses60/115; P15 Node plausible; P18 browser median about95 and tail180, so not BQ-ready |
| 576, 24x24 Hell 1 | 0/20 ten; T10 unavailable; response 115.02/210.91/211.35 | 31.5/88.6 | 18.5/51.1 | 9.8/26.3 | P18 browser about44/110; timing candidate only, completion/max response still unknown |
| 676, 26x26 Hell 1 | 9/20 ten; conditional T10 108.72/167.59; max response 206.66 | 30.8/142.3 | 18.0/81.7 | 9.6/41.8 | P18 median plausible, browser tail about172; not BQ-ready |
| 215,256,300,324,360,400,420,480,484 Hell 1 | 0/3 each, no puzzle; response approximately115, no T10 | conditional 30.8-75.2 / 88.6-149.4 | conditional 18.0-43.4 / 51.1-85.8 | conditional 9.6-22.4 / 26.3-43.8 | Transfer envelope from observed Hell 1 cells only; no likely window or offer can be assigned |
| 300,324,360,400,420,480,484,576,676 Hell 2 | 0/3 each, no puzzle; response approximately115 | `1+28*c`, c unknown | `1+16*c`, c unknown | `1+8.081*c`, c unknown | No measured in-band cost or window; not offerable on this evidence |
| 480,484,576,676 Hell 3 | 0/3 each, no puzzle; response approximately115 | `1+28*c`, c unknown | `1+16*c`, c unknown | `1+8.081*c`, c unknown | Same; a pack also needs an actual window |

The reduced-case rows enumerate all 22 prescreen-only cells: nine Hell 1, nine Hell 2 and four Hell 3.
The three full Hell 1 runs add the other three of MP12b1's 25 Hell cases.

**Low/likely/high construction sensitivity for the three observed Hell 1 cells:**
fast work proxy uses the recorded rate ratio `317/446=0.711`, slow uses `317/157=2.019`.
High benefit uses two dear calibration profiles and two per candidate after the prior; low benefit uses
eight and eight. These are P counts. For P1-P5 the resulting median envelopes are:

| Hell 1 area | Low benefit P: `1+32*2.019*c` | Likely P: `1+16*c` | High benefit P: `1+8*0.711*c` | Meaning |
|---|---:|---:|---:|---|
| 196 | 172.2 | 43.4 | 16.1 | Slow case is guard-censored, not an observed completion |
| 576 | 71.5 | 18.5 | 7.2 | Depends on a repeatable window and enough distinct layouts |
| 676 | 69.7 | 18.0 | 7.1 | Likely conditional speed versus completed median about6.0x, not a new complete-ten rate |

For P1-P3 high benefit, use `1+14*0.711*c`: 27.4/11.9/11.6 s on the same areas; low benefit is
at least the no-prior eight-profile case and remains unbounded by this average until P5/clock handling.
For P1-P8 high benefit use `1+6*0.711*c/(1.3*1.8)`: 5.8/3.0/2.9 s; low benefit can keep four lanes
and no kernel gain, hence the preceding P1-P5 slow envelope. The tail surrogate remains uncertain.

For Hell 2/3, a conditional *cap-scale* scenario `c approximately 2.65 s` would give approximately
75/43/22 s under the three median formulas, but no observed in-band rating establishes that scenario's
existence or frequency. There is no defensible low/likely/high *availability* estimate. This is a material
unknown, not zero availability extrapolated from three seeds.

The plan's “ten do not fit 115 s on any device if one rating costs the cap” is too strong.
D arithmetic: ten accepted cap-scale ratings would cost about 26.5 s serial, or four waves approximately
10.6 s on four lanes, before search/setup. Even applying the planning factor gives about47 s for those
four waves. Finding those ten is the hard, unmeasured part. P10 should be chosen from measured total search
cost/diversity, not this claimed intrinsic impossibility.

### 4.5 Completion and offerability estimates

Equal P6/P7/P8/P11 preserve uncensored completed results. They may help timeouts but cannot supply layouts
or a band window that does not exist. P1-P5 change which candidates are found; their probability effect
must be measured, including false stops caused by budgets and screens.

An explicit **P sensitivity**, not a fitted success model, is `Qnew = 1-(1-Qold)^k`: suppose more efficient
work buys `k` independent equivalent *request opportunities*, every failure being cost-related.
Use low benefit k=1; illustrative likely opportunities 1.5 after P1-P3, 2 after P1-P5, 4 after P1-P8.
Real requests share sets, history and scarce layouts, so this independence can fail badly.

| Current M/D Q, Nightmare cells | After P1-P3 P | After P1-P5 P | After P1-P8 P | Low/high interpretation |
|---|---:|---:|---:|---|
| 55%, 196/215 | 69.8% | 79.8% | 95.9% | Low stays55; high could reach100 only if failures were time, not missing windows |
| 75%, 256/300 | 87.5% | 93.8% | 99.6% | Low stays75; no automatic D39/BQ pass |
| 85%, 144 | 94.2% | 97.8% | 99.9% | Time tail still fails the likely browser sensitivity |
| 95%, 100/400 | 98.9% | 99.8% | approximately100% | Preserve already-good cells |
| 100%, other Nightmare/Master | No numerical lift credited | No lift credited | No lift credited | Preserve, rather than infer a perfect population rate |

These probabilities are not generated by the time-scaling model; they state an independent availability
assumption that PM3 must test. A stricter reading without that assumption is simply “new Q unknown”.
For Hell's 0/20 complete-ten cells, the formula is not applicable: it would confuse an observed zero with
a true zero. For 676 Hell 1, Qold=45% gives a sensitivity 59.2%/69.8%/90.8% for the same k values,
not evidence that the final k=4 is attainable. Zero prescreens cannot be assigned a meaningful likely Q.

For another useful conditional calculation, with a successful set and nine remaining independent slots,
each slot must succeed with probability at least `0.9^(1/9)=98.84%` to complete 90% of requests.
A 99% set success and 99% per-slot success give `0.99^10=90.44%`. Rating just one in-band calibration
does not establish this, especially under novelty/history constraints.

**Offer candidates:** all measured Nightmare cells are plausible Node timing candidates after P1-P5;
P1-P8 gives more browser margin, except 12x12's scaled tail remains problematic. Completion must be
re-measured, particularly 196/215/256/300. Master should stay offered unchanged. Of observed Hell 1,
576 is the strongest *timing* candidate in this model; 196 and 676 need tail reduction or content support.
No Hell offer is justified now: all current D39 completion rates fail. A passing Node landscape must not
silently enable the not-run BQ gates or bridge unmeasured/non-contiguous area gaps.
The 576/676-cell candidates also require the permitted large-board mode or separately qualified area
limits: the current default release ceiling is 484, and the unpassed BQ gates must not be bypassed.

### 4.6 Actual phase order and standing costs

Plan section 6 phase 1 is P6/P7/P8, phase 2 then adds P1-P5. Proposal-number columns are not that order.
For every Master/Nightmare row, phase 0 has no effect; phase 1 applies `T(2.43)` / `T(2.2275)` respectively;
phase 2 is the P1-P8 column. Low/high phase-1 factors use the corresponding kernel/pool parameters above.
Phase 3 changes offerings, not successful-request CPU time.

| Example, current D -> cumulative P likely median/p95 | Current | Phase 1 | Phase 2 | Phase 3 |
|---|---:|---:|---:|---:|
| 10x10 Master | 9.00/16.44 | 3.88/6.94 | 3.88/6.94 | unchanged time, retain offer |
| 12x12 Nightmare | 62.14/176.07 | 28.06/79.21 | 10.61/29.60 | remeasure completion/tail |
| 14x14 Nightmare | 112.98/151.64 | 50.89/68.24 | 10.14/13.52 | remeasure completion |
| 26x26 Nightmare | 18.61/31.38 | 8.52/14.25 | 2.98/4.85 | remeasure, no auto BQ flag |
| 26x26 Hell 1 | 108.72/167.59, only9/20 | 48.97/75.40 on that conditional workload | conditional construction 9.6/41.8 | D39 and browser evidence decide |

Phase 4 stock/pack benefits follow P9/P10, not a universal further multiplier. Phase 5 follows P11's
Amdahl model and needs >=1.5x whole-request evidence. The broad phase-2 optimistic range is not a reason
to launch all kernel work before establishing that the screen/window proposal is sound.

Slow-test implications are also conditional:

- P, a still-all-capped twenty-profile call under a one-eighth screen would cost about one eighth of
  M 42.6-44.8 s: about5.3-5.6 s, before changed search/control overhead. P1/P3 may instead find a window
  and perform more useful work; P5 may end with a different honest refusal.
- P1-P5 do not speed the canonical ordering test, M 100.4-108.5 s, which explicitly rates its corpus.
  A same-units 1.35x kernel improvement alone projects about74.4-80.4 s, not the 4-12x generation gain.
- The M 23.0 s quick and 122.6 s full totals cannot be divided by the batch gain: imports, assertions,
  pure functions, canonical-rating checks and browser/client tests remain. Re-measure complete coverage
  once at the final source; retain the current ten-minute per-test-run constraint.

## 5. Measurement phase and gate order

PM1 is the key experiment, but it is not necessarily cheap: fifteen proposed level/area cells times
60 nested families can mean tens of thousands of canonical ratings before the three-cap stop.
For orientation only, **P workload arithmetic** with about34 counts/family is
`15*60*34=30,600` ratings; at the M cap-scale 2.4 s this is about20.4 worker-hours or5.1 ideal four-lane
hours. Cheap counts and early stops reduce that; carving, layout construction and repeated censuses add to it.
Schedule bounded pieces under the shared lock later; none was run here.

| Measurement | What it must record / control | Claim confirmed or refuted |
|---|---|---|
| Final-source baseline | Post-MP17 source, tuple, policy, F1/F2, population-R choices, provenance and offered cells; same seeds and history/uniqueness | Transfer from this intermediate landscape |
| PM1 input sets | Acquire sets independently of successful target calibration; preserve failed/unrateable ones. Include exact board masks, not area alone; support diagnosing hidden Hell cells without enabling them for users | Avoid conditioning the count curves on the old generator's successes |
| PM1 curves | Every visited count, exact subset/order, score, canonical G/info/Gproved, main/census work/nodes, all stop flags, model/DLX time and acceptance eligibility; separate `any` and relevant `require` | Window existence/frequency, old-share mismatch, P2 threshold, P4 prior |
| PM1 scope | Include 215 blocked, 300, 324, 360, 400, 420, 480 elongated and the 196/576/676 Hell successes; the proposed sparse area list omits important failing shapes | Whether gains generalise across MP12b1 cells and non-contiguous areas |
| PM1 stopping | Three consecutive capped counts are a bounded sampling rule, not proof that no lower-count window exists. Use alternate nested orders and an out-of-window audit | False no-window risk from non-monotonicity |
| PM2 | Per-rule time and virtual units; build/compact-model cost; bucket updates/undo; main count versus census; DLX of rejected/accepted profiles; exact-state recurrence and memory high water | Which P7/P11 kernel matters and whether virtual accounting is feasible |
| PM3 | Paired complete requests, old/new count search, production profiles by outcome, count/beam/centre phases, screen rerates/escalation, calibration prior accuracy, layouts rejected, consumed/discarded tasks; T1, conditional T10, response, ten rate and at-least-one rate | Actual q/c mixture, every factor in section 4, missing-work tail of partial requests |
| PM3 budgets | All selection/repair/census/model/uniqueness work, set attempts and total response; distinguish early count refusal from clock cutoff | P5 latency and false-stop tradeoff |
| PM4 | Compare complete canonical metrics, not just score, at/near every screen cap. Explicitly include first solution then main cap, incomplete census, R7 limit branches, AR1 transitions, normal stop after overshoot and all limits unchanged except main screen | Corrected P2 proof; the plan's two-point interval should be rejected unless separately proved |
| Pool/browser | 1/2/4/8 lanes, same uncensored digests, measured IPC/startup, memory including scratch/cache/runtime, physical-core scaling, cold/warm runs, history and cancellation | P8's effective width, realistic BQ budgets |
| Pack/stock | Canonical rerating, novelty under existing keys, independent layouts, option coverage, finite depletion, stored provenance, lookup/validation latency | P9/P10 availability rather than a cosmetic transformation count |

PM3 should retain Master/lower-level non-regression controls. Twenty requests can run the existing
qualification rule, but rare-window and tail conclusions need the recorded uncertainty and failure
reasons, not only a completion percentage. Measure current production profile outcomes: the diagnostic
sample mixture is not an adequate replacement.

**Recommended order:**

1. Freeze difficulty-v3 first. Resolve the P2 contract and version/provenance/deadline decisions.
2. Run an initial bounded PM1/PM4 slice and a small P1-P5 prototype before expensive P7 connectivity/model
   work. Check AR1-cheap-side direction and screen false negatives immediately.
3. P6 and a conservative P8 can proceed independently once their equality/resource gates are defined.
   Rank P7 only from PM2; model reuse and memoisation are separate high-risk options, not prerequisites.
4. Freeze `gen-v4`, fit prior/screen tables on training sets, then PM3 on held-out seeds and the full relevant
   landscape. Re-derive policy with D39, keeping census and uniqueness decisions visible.
5. Browser gate before promising browser offers. Stock/packs remain a separate product/content decision;
   P11 only after measuring the remaining bottleneck.

The plan's strategic phases are sensible, but putting *all* P7 before testing the central search hypothesis
risks spending most effort on an optimisation that cannot rescue availability. Its phase-1 equality gate
also cannot be written solely as `DeductionResult` equality: accepted full ratings, generator digests,
payload/pack compatibility, memory failures and deadline semantics need their own checks.

## 6. Questions for Fable

1. **IG-P-ASTRA-Q1.** Will P2 drop the claim that post-first-solution G/info are final and the score is
   within two points? Should every cap-affected screen be canonically re-rated before any narrow band
   decision, with an explicit cap-effect certificate for the equal-result fast path?
2. **IG-P-ASTRA-Q2.** May complete AR1-refused ratings guide the cheap-side bracket while remaining spent
   for acceptance and the stall counter? Otherwise how does `locateCount` leave a cheap all-forced start?
3. **IG-P-ASTRA-Q3.** Is the parallel P1 variant required to replay one fixed serial probe tree exactly,
   or may a different multi-count probe order have its own generator identity? Count-order consumption
   alone does not make the two search paths equal.
4. **IG-P-ASTRA-Q4.** Does the feature require one shared 120 s set-plus-batch response budget, or retain
   D37's separate action budgets? Which owner decision covers this, and what availability tradeoff is
   permitted when P5 ends a request early?
5. **IG-P-ASTRA-Q5.** Must P4's prior/window be stored in creation provenance, or deterministically
   reconstructed from the frozen calibration and fitted-table version? What is the approved fallback
   for a saved set or a changed target level with no matching calibration?
6. **IG-P-ASTRA-Q6.** May P7's full-model reuse and refutation memo be split into later optional items,
   after a proof of compact-model/cap-boundary equivalence? Neither is currently a small same-units
   implementation change.
7. **IG-P-ASTRA-Q7.** Can PM1/PM3 include the omitted blocked/elongated and mid-area failure cases, with
   target-independent set acquisition and a held-out window audit, rather than treating three consecutive
   capped counts as evidence that the band is unreachable?
8. **IG-P-ASTRA-Q8.** What independent-layout stock and exhaustion behaviour would the owner accept for
   P10, given that symmetries and piece renaming do not create new history keys? May the pack gate explicitly
   add canonical rating, AR1, uniqueness-mode and novelty verification beyond `verifyPack`?
9. **IG-P-ASTRA-Q9.** Will Hell 2/3's route to packs be decided from measured *total* search cost and
   diversity, rather than the stated “near-cap rating cannot fit ten on any device” argument? The latter
   does not follow from the existing 2.4-2.65 s cap-scale evidence.

No new offer, rating change, deadline exception, fixture update or owner decision is asserted here.
