# Plan version 2 and its addendum (Pentomino): joint report of the analysts

Authors: Opus (claude-opus-5.5, writer) and Astra (gpt-6-astra), 2026-11-15.

**Basis.** Each analyst's phase-1 analysis (`claude-opus-5.5/3-plan-v2-analysis.md`,
`gpt-6-astra/3-plan-v2-analysis.md`) and cross-review (`.../4-cross-review-of-plan-v2-analysis.md`). The
reviewed plan is `plan.md` at `240398f`: version 2 plus the section 9 addendum. Every disputed fact was settled
against the source (`core/engine/*.js`, unchanged from `cd5d17f` through the committed `13d61fd` and
`5ee9269`) or the committed records.

**Labels.**

- *Measured:* a provisional record, from the pre-freeze source, at two to six seeds per cell.
- *Derived:* arithmetic on such records.
- *Projection:* depends on a stated assumption.

No browser figure here is a measurement.

## (a) Verdict

Plan version 2 and its addendum are **a sound basis for version 3, with corrections**.

**Where version 2 is right:**

- The search items (P1, P3, P4, and P2 where admitted) deliver the feature. On the failing Nightmare cells
  they turned 55 to 85 % completion into 3 of 3 or 6 of 6, and 62 to 113 s T10 medians into 6 to 17 s. Hell 1
  became generable in Node on two boards.
- The rating-side items are small without P7.
- The scope rule (Master keeps today's selection), `W_screen` as a table under rule (c5), P8 as an opt-in, the
  closure of the Hell 2 and Hell 3 live routes for this feature, and the frozen round as the only gate
  evidence are all right.

**What version 3 must change:**

1. Rebase every forecast at four workers. Version 2's R31 range includes an unadmitted eight-worker factor.
2. Withdraw the new-mechanism claim of C2. Ordered speculation already exists.
3. Promote the per-set prior (P4 (1)) to a Hell 1 arm, ahead of the kernel spikes. About half of Hell batch
   profile time precedes the first in-band hit.
4. Describe the Hell 2 and Hell 3 closure as a scope decision. It is not proven impossible.
5. Pre-register the admission statistics and thresholds.
6. Price a concrete frozen manifest.
7. Correct the errors listed in (e).

## (b) Answers to section 9.4

| Question | Joint position | Remaining difference |
|---|---|---|
| **1. C1's exact virtual charge; rules it does not extend to** | Pieces have variable sizes (5 to 13 cells on 14x14 Nightmare). R4's exact per-piece charge (`deduce.js:709-778`) is `L_p + 2*n_p*s_p + (n_p > 0 ? s_p : 0) + sum over common cells c of L_c + sum over killed rows r of (s_piece(r) + 1)`, where `L` is a static column length, `n_p` the live rows and `s_p` the piece size. R1 to R5, R8 and R9 contain no cap check, so equality is needed as a sum per call, with the same kills in the same order. R6 (`closure`, `:858`) and R7 (direct checks, `:1102`, `:1128`), the probes and the census need equality as prefix sums at each check. R7's `reachable` is an area and colour-imbalance dynamic programme (`:1013-1075`) needing its own accounting. Three representations are candidates: ordered live-row lists (skip dead rows, still mark live rows), a cache of each piece's own common-cell set (depends only on its own rows), and incremental counters. Record R4 invocations, static and live visits, dirty fractions and mutation counts first, then compare in a bounded spike. `fewestColumn` buckets only after its share is attributed (a reduced-inlining PM2 run, diagnostic only). Gain x1.04 to 1.15; x1.20 is the zero-cost ceiling | none |
| **2. The batch's waves (no new run)** | R13 is a proxy, `(T10 - T1)` / median call. In IGP-01's after arm no finished selection call was non-OK. 42 to 80 batch calls started per cell, about 1 to 6 successful calls beyond nine per request. The longest successful call spans 59 to 81 % of the batch, at 2.3 to 5.2 times the median call. Recorded busy fractions are 0.82 to 0.88 (completed calls clipped to `[T1, T10]`). Ordered speculation already exists (`generate.js:554` `dispatchOrder`, `BUDGETS.slotAttempts` = 12 per slot; `generation-client.js:1057-1085` replenishes to the pool width and consumes through `foldNext` / `foldAccept`). Fold rejections, failures before selection and unfinished calls are not classified: the journal lacks dispatch/consume linkage | none |
| **3. C3: correlation on existing records** | The Landscape `samples` hold 18,956 completed v3 ratings with `branchTrials` and `rowTrials`; PM1's discoveries hold full metrics. Spearman rho of score with the diagnostic is 0.89 to 0.99 over whole curves. Near the band it falls to 0.34 to 0.60 on Nightmare, where U alone gives 0.82 on boards of up to 144 cells. Capped inputs are unidentifiable: `difficulty.js:240-253` throws before the DLX runs. **Verdict:** a data-only, held-out (by set and seed) prediction test against U/K/area and the P4 prior now; a narrow soft-ranking arm on 196 to 484-cell Nightmare only if that test separates the band's sides. No default on small Nightmare or Hell. Model `F = 1/[1 - g*alpha + g*d]`: x0.91 to 1.27; no credit in the forecast | none |
| **4. C4: counting repeats with `instr`** | Feasible with a test-side counting edit. The key must cover what `sameState` compares (`covered`, `live`, `colCount`, trail and picked lengths), or a narrower key must be proved invariant-equivalent. Count exact, collision-confirmed, **fully failed** subtrees (never capped ones), per phase (main, census, probes), with the recoverable work. It is an engine run and needs approval. Park the memo | none |
| **5. Hell 1 after C1 to C5; frozen-round changes** | Common sensitivity: `T = T_search * gamma * (1 - g + g/k)`. `gamma` 0.65 to 1.0 is the per-set prior on Hell; `g` 0.85 to 0.96 the kernel's share; `k` 1.3 to 2.2 one total kernel and backend gain. No C2, C3 or C4 credit. Hell 1 26x26: 16.7 s (10.6 to 27.5); 20x20: 20.9 s (13.3 to 34.5). The browser median target (13.75 s in Node under the median illustration) is reached only at the optimistic ends. **Frozen round:** a per-set-prior Hell 1 arm; dispatch, consume and discard linkage in the journals; a scoped C1/C5 spike with visit counters; a diagnostic PM2 attribution of `fewestColumn`; C4 counting and C3 capped-input features only as separately approved engine tasks | Opus's phase-1 set (P11 multiplied on top: 16 s, 5 to 24; 14 s, 4 to 25) is a more optimistic assumption, not a measured dispute; the joint figure is the single sensitivity above |

## (c) The candidates and the version 2 items

Gains are on the current source (the `rating-v3` runtime of MP12b1) at four workers. Costs are engineering
estimates, not allocations.

| Item | Verdict | Expected gain (kind) | Cost | Dependence on MP12b3 to MP17 |
|---|---|---|---|---|
| P1 bracketing, sequential | **pursue** (core of `gen-v4`) | with P3 and P4: 14x14 Nightmare response x20.3 (n 3); 12x12 x9.3 with the screen, x2.9 without (Measured) | `gen-v4` implementation | the prototype's anchors in `clues.js` / `generate.js` move (MP12b3, MP13a, MP14) |
| P2 screen with the certificate; `W_screen` under (c5) | **pursue where admitted** | 14x14 x2.6 (n 2, no shift); 12x12 x1.56 for +0.75 clue; Hell 1 26x26 x0.88 (n 2): not shown to pay (Measured) | table and certificate tests | none on `deduce.js` (locked by MP12b2) |
| P3 capped = too few | **pursue** (OD-P1 approved) | removes the dead end: 0 entries in 548 calls (Measured) | small | as P1 |
| P4 prior: table, then per set | **pursue; promote the per-set prior** | locate median 2 probes (4 on Hell); Hell pre-hit prefix 51 to 55 % of batch profile time, so `gamma` 0.65 to 1.0 (Projection) | per-set prior unbuilt; identity stored with the request | as P1 |
| P5 budgets and attempt limit | **pursue after IG-P-Q02** | no speed; completion loss to be measured on unfinished and failed calls too | prototype arm | MP12b2's F1/F2 false stops are a warning |
| P6 DLX for accepted puzzles only | **pursue** (approved; phase 1) | today's search T10 x1.12 to 1.32 (Measured); after `gen-v4` a few %, at most about 10 % on 12x12-like cells (Projection) | small | none |
| P7 same-units kernel (via C1, C5) | **prototype** in a scoped spike | total kernel `k` 1.3 to 2.2 (sensitivity) | spike plus equality corpus | `deduce.js` locked; reopens only if the rating changes |
| P8 wider pool | **park as default**; opt-in after a device measurement | x0.93 Master, x1.13 Nightmare at eight workers; one rating 9 to 28 % slower (Measured, one VM) | 1/2/4/8 concurrency probe | none |
| P9 idle stock | **park** (late, optional) | the next batch only | - | none |
| P10 packs | **park**; keep as Hell 1's fallback if the browser gates fail and no new SLA | Hell 2 only if OD-P3 chooses edge-of-band; Hell 2/3 a scope decision (e item 14) | - | OD-P3, OD-P4 |
| P11 WebAssembly | **park** until the JS composite is measured | part of `k`; preserve `info`'s floating-point reduction | about 1,000 to 2,000 lines | none |
| C1 incremental R4 (then R5) | **prototype** | x1.04 to 1.15 (ceiling 1.20) (Projection) | about 250 to 450 lines plus 200 to 350 test lines for R4 | none |
| C2 over-provisioned candidates | **drop as a new mechanism**: it already exists | none credited; a P5 per-call budget or bounded-prefetch arm against existing scheduling may move time and yield either way | 80 to 180 lines of linkage | needs IG-P-Q02 |
| C3 DLX predictor | **data-only test now**; narrow prototype only if it separates the band's sides | x0.91 to 1.27 (model); no forecast credit | ranker 200 to 450 lines | none |
| C4 failed-state memo | **park**; count first (approved run) | unknown | counting 100 to 250 lines; memo 500 to 900 plus tests | none |
| C5 `select` / `undo` / `kill` loops | **prototype after C1** | state 31.2 to 35.3 % of rating time: x1.05 to 1.2 (Projection) | 100 to 250 lines | none |

Never multiply C1, C5 and P11. Measure one composite against one reference.

## (d) Speed before and after on the current source

T10 median in Node at four workers.

- *Today* is MP12b1 (20 requests per cell).
- *After `gen-v4`* is the prototype arm that P2's table selects (Measured, provisional).
- *After the recommended mix* is a Projection: a kernel composite with `g` 0.85 to 0.96 and `k` 1.3 to 2.2
  (central 0.95 and 1.7), times `gamma` 0.65 to 1.0 (central 0.8) on Hell only. P6 is credited on Master only,
  where it was measured; after `gen-v4` its few per cent are not credited. No C2, C3 or C4 credit.
- *Browser* is the illustration `5 s + 4 x median`. It is not a measurement and not D39's planning rule, which
  uses the Node maximum (today's 26x26 Nightmare: maximum 35.8 s, so 148 s).

| Cell | Today: T10 (ten of 20) | After `gen-v4`: T10, completion | Population shift (clue-share median, R32) | Recommended mix: central (range) | Browser illustration: after `gen-v4` / mix |
|---|---|---|---|---|---|
| 14x14 Nightmare | 113.0 s (11) | 8.9 s, 3 of 3 (190 M) | 0.190 to 0.255 (+1.5 clues) | 5.4 s (4.3 to 7.2) | 41 / 27 s |
| 15x15b10 Nightmare | 86.2 s (11) | 8.5 s, 3 of 3 (190 M) | 0.182 to 0.227 (+1) | 5.1 s (4.0 to 6.8) | 39 / 26 s |
| 12x12 Nightmare, no screen (default) | 62.1 s (17) | 16.5 s, 6 of 6 | 0.200 to 0.211 (six seeds) | 10.0 s (7.8 to 13.2) | 71 / 45 s |
| 12x12 Nightmare, 190 M (OD-P7) | as above | 9.0 s, 6 of 6 | 0.200 to 0.286 (+0.75 clue on the same set) | 5.5 s (4.3 to 7.2) | 41 / 27 s |
| 26x26 Nightmare | 18.6 s (20) | 11.9 s, 6 of 6 (190 M; the default arm is unmeasured) | 0.133 to 0.167 (+1) | 7.3 s (5.7 to 9.6) | 53 / 34 s |
| 10x10 Nightmare | 24.0 s (19) | not run | - | 14.6 s (11.5 to 19.3), kernel only | 101 (today) / 64 s |
| 16x16, 15x20 Nightmare | 79.8 s, 40.1 s (15 each) | not run (R09) | - | unpriced (different regimes: 63 % and 27 % capped) | - |
| Hell 1 26x26 | 108.7 s (9); withdrawn by D39 | 34.2 s, 2 of 2 (no screen) | 0.128 to 0.195 (+3) | 16.7 s (10.6 to 27.5) | 142 / 72 s |
| Hell 1 20x20 | no set in 115 s | 42.9 s, 2 of 2 (no screen) | none today; 0.357 (PM1 windows 0.370) | 20.9 s (13.3 to 34.5) | 177 / 89 s |
| 14x14 / 26x26 Master | 2.57 / 8.36 s (20) | out of `gen-v4`'s scope; P6 x1.18 / x1.12 (Measured): 2.2 / 7.5 s | 0 / -1 clue (legacy path keeps today's) | 1.3 / 4.6 s, if the kernel spike passes (Projection) | P6: 14 / 35 s; mix: 10 / 23 s |

**Completion's one-sided 95 % lower bounds:** 3 of 3 is 37 %, 6 of 6 is 61 %, 2 of 2 is 22 %. No 90 % claim is
possible before the frozen round. Hell 1 is not offered today; after `gen-v4` it is generable in Node on two
boards, and an offer needs OD-P4's gates.

## (e) Errors in version 2

All line references are to `plan.md` at `240398f`.

| # | Line | Statement | Correction |
|---|---|---|---|
| 1 | 492 | "solved ... on three cells and three seeds each" | two cells of the 196 to 324 class (196, 215); the third measured cell (144) is outside it; no completion or tail gate |
| 2 | 281 | "no useful rating of today's call profiles lost on 14x14 and 15x15b10" | 0 of 0 and 0 of 2; the boards of 256 to 324 cells are unmeasured |
| 3 | 49, 280 | "negative on Hell", "the screen is slower (x0.88)" | n 2, paired 0.67 and 1.08: "not shown to pay"; no screen stays the default for the population reason |
| 4 | 356 | "On the prototype the DLX share is 3.3 to 4.0 %" | R30 profiles today's search; complete windows show 3.6 % and 10.2 %; P6 alone after `gen-v4` is unmeasured |
| 5 | 550 against 54, 61, 502 | first phase "1.0 to 1.3" against "1.0 to 1.5" | separate observed P6, optional eight-worker results and the unmeasured kernel |
| 6 | 40 | 26x26 Nightmare "as estimated or slightly better" | paired x2.01 (0.69 to 3.91) with the 190 M arm; the default arm for cells of 360 or more is unmeasured |
| 7 | 47 | dead end "confirmed" | inside the broad 30 to 60 % only; below the per-cell ranges; 12x12 underestimated (18.7 % against 4 to 10 %); profile time, not critical path |
| 8 | 444, 493 | Hell 1 "reaches ten ... in about 34 to 43 s" / "generable ... wherever a window exists" | two boards (20x20, 26x26), two requests each |
| 9 | 469 | "then 0 to 4 window profiles" | mean 0.84 to 4.15, p90 3 to 13, maximum 27; Hell calls used 6.2 to 9.4 profiles per successful call |
| 10 | 653 | 18x18 to 24x24 "x1.5 to 2 (Projection from 26x26)" | unmeasured; the 26x26 factor carries the screen; 18x18 belongs to the 196 to 324 class |
| 11 | 652 | 16x16 and 15x20 "8 to 12 s (... the same dead-end regime)" | 15x20 needed 2.2 profiles per accepted puzzle (27 % capped): a different regime; unpriced |
| 12 | 655, 486 | 10x10 "about unchanged (no dead end)", "0 % capped at the start count" | unmeasured; PM4's sample shows 0 %, the report's correction 10 %; the prior may still help |
| 13 | 599 | "K below about 12 ... 3x29, 10x10" | those cohorts have K 17 to 19 |
| 14 | 101, 437 | Hell 3 "leaves this goal"; "needs a change of the rating's cap or scale" | the targeted population (480 to 676 cells) found none in 201; other PM1 families hold census-estimated 165 and 179 (Hell 3) and central 146 and 129 (Hell 2) outside the policy areas. The closure is a scope and resource decision |
| 15 | 440 | "17 to 53 s of rating per in-band rating" | discovery cost per in-band observation; each in-band rating took 1.0 to 3.1 s |
| 16 | 531 | "the ten Nightmare cells that pass today" | completion-passing: 18x18 is 20 of 20 with p95 134.5 s, over 115 s |
| 17 | 251 | the work cap "consulted only by `overWork()` and ... `branch`" | R7 (`deduce.js:1102, 1128`), the probes, the replay and the census also test `work > workLimit` |
| 18 | 265 | screen-capped = "reached `W_screen`" | the certificate admits work equal to W; screen-capped means exceeding it |
| 19 | 662, 664 | "three to four ratings" per puzzle; "at most about 2 to 3 times" | not general: Hell's successful calls used 6.17 and 9.41 profiles; no proven ceiling |
| 20 | 690 | C2: "start more candidates than slots" | `gen-v3` already dispatches ordered speculative candidates (`generate.js:554`, `generation-client.js:1057`) |
| 21 | 530 | ten seeds "so that completion and a p95 exist" | a nearest-rank p95 of ten is the maximum, a weak tail; OD-P4's Hell gate uses 20 requests |
| 22 | 507 | after all phases "R31" as the forecast | R31 includes an unadmitted eight-worker transfer; forecast at four workers (d) |

## (f) Owner decisions

The texts below can be put to the owner as written.

**IG-P-Q02. One response deadline, or separate budgets for the set and the batch? (Due now: PM3 has run.)**

Options:

- (a) Keep two separate 115 s action budgets and only report the response time.
- (b) One end-to-end request deadline (a 115 s generation stop inside a hard 120 s response bound), with a
  reserved share for the batch, deterministic work caps per call and a wall-clock backstop.
- (c) Separate budgets plus progressive delivery under a new service level.

Evidence:

- 70 of MP12b1's 1,726 responses exceeded 120 s (at most 229.1 s) under two separate 115 s action timers.
- One selection call alone ran 136.3 s, past the 115 s stop (difficulty-v3's calibration record, 18x18 Hell 2).
- After the new search, the set stage takes 14 to 26 % of the time to ten puzzles, and the batch's time is set
  by a few long successful calls.

Joint recommendation: **(b)**. Fit the reserve (for example, a set-stage cap of about 40 %) in the frozen
round as a pilot parameter, and measure lost completions against the uncapped new search.

**OD-P5. Progressive delivery.**

Options:

- (a) Approve progressive presentation, showing puzzles as they are accepted, as a user-interface behaviour,
  keeping today's offer criteria.
- (b) Also replace the ten-puzzle and response criteria for named cells by a new first-puzzle and total-batch
  service level: Hell 1, and 10x10 and 12x12 Nightmare if their browser runs fail.
- (c) Neither.

Evidence:

- Hell 1 after the new search needs 34 to 43 s in Node (two requests per board).
- Every browser figure so far is a planning illustration.
- The client already reports accepted puzzles as they arrive.

Joint recommendation: **(a) now. (b) only after measured browser first-puzzle times and an explicit service
level** (first-puzzle median and p95, minimum delivered count, timeout, history policy) that the owner
approves.

**OD-P6. What defines a level for the new search (population rule).**

Options:

- (a) Accept: the level is the score band, the centre rule and AR1. The new search may serve a set at the
  lowest in-band clue count it finds, typically one to three clues above today's on Nightmare and Hell 1.
- (b) Keep today's start counts. This keeps today's failures on 14x14, 15x15b10 and Hell 1, where no in-band
  puzzle exists at today's counts.
- (c) (a), but only after a blind play comparison.

Joint recommendation: **(a), conditionally**:

- report the clue, score-position, census-estimate and completion distributions per cell beside every timing,
  in both directions (26x26 Master moved down);
- measure the "one count below" variant (c4);
- run a stated blind play comparison on one Nightmare and one Hell 1 cell before any phase-3 offer.

**OD-P7. The screen on Nightmare boards of up to 144 cells.**

Options:

- (a) No screen by default.
- (b) The 190 M screen, which made 12x12 1.56 times faster but added 0.75 clue on the same set.

Joint recommendation: **(a)**. Revisit only with matched frozen-round and browser evidence that 12x12 needs the
trade. Do not extrapolate it to 10x10.

**OD-P8. The rest of PM1 tranche 1, reduced to the Hell 1 and Hell 2 cells.**

Options:

- (a) Approve.
- (b) Stop after the first slice.

Joint recommendation: **(a), in stages, after the frozen source receipt**:

- include the failing-set work that feeds the per-set prior;
- do a data-only inventory of the existing records first;
- price the retained parts then. The nine worker-hours is the old full-scope estimate, not an allocation.

**OD-P9 (new). Hell scope for this feature.**

Options:

- (a) Keep Hell 2 and Hell 3 closed for this feature as a scope and resource decision. Their targeted boards
  found no Hell 3 rating in band and only edge-of-band Hell 2 ratings (8 of 404), while other board and
  piece-count families hold a few census-estimated Hell 2 and 3 scores outside the offer areas.
- (b) Open an alternate-population investigation, data-only first.

For Hell 1:

- (i) also name 24x24 (inside the stated range) in the frozen round's request-level arms;
- (ii) bring 14x14 (196 cells, below the stated range) into scope only if IG-P-Q21's answer supports it.

Joint recommendation: **(a), with (i); (ii) after IG-P-Q21.**

**OD-P10 (new). The frozen round's approval.**

Options:

- (a) Approve a separately priced manifest after source preparation, in stages (scope in (g)), with an
  optional bounded early browser calibration.
- (b) Reuse the provisional round's remaining time or the old manifest.

Joint recommendation: **(a)**. The provisional round's unused 1,028.5 s is not carried over.

## (g) The frozen round we recommend

| Element | Content |
|---|---|
| Preconditions | the freeze (after MP17) and an identity receipt; anchors re-derived; "different source" reporting in `identity.mjs` and `compare.mjs`; hidden Hell cells run as explicit diagnostic offers (D-IG13); no fallback to the old runtime |
| Seeds | 20 independent seeds on the headline cells (14x14, 15x15b10, 12x12, 16x16, 15x20 Nightmare; Hell 1 26x26 and 20x20; 24x24 Hell 1 per OD-P9). Kept apart from any fitting of priors, tables or rankers. Smaller pilots stay pilots |
| Arms | each class's `W_screen` and the no-screen arm on every class, 26x26 Nightmare included; the per-set prior on Hell 1; 10x10, 16x16, 15x20 (R09); (c4); the re-rate-at-bracket-close variant (D-IG7); the P5 budget arm once IG-P-Q02 is decided, against existing scheduling |
| Controls | completion-passing Nightmare cells and all 16 Master cells on the legacy path (identity expected); difficulty-v3's final records as native controls only where source and full request match |
| Journals | dispatch, selection, completion, consumption and discard linkage per batch call; census-estimate share per arm; population two-sided |
| Spikes and probes | scoped C1 (R4 representations, with visit counters), then C5; equality on PM4's corpus; a diagnostic PM2 attribution of `fewestColumn`; the P8 probe (one rating at 1, 2, 4, 8 concurrent workers) |
| Separately approved | C4 counting; capped-input DLX features for C3; the reduced PM1 (OD-P8); any browser calibration |
| Budget | a manifest priced after source preparation, with populations, repetitions, stopping limits, validation, grace and concurrency. Indicative only: several times the provisional round's 2.7 h; Opus's median-based figure is about 5 to 9 h. Not an allocation |

The questions for the plan author are IG-P-Q19 to IG-P-Q24 in `clarifications.md`, "Questions after plan
version 2 (analysts, 2026-11-15)".
