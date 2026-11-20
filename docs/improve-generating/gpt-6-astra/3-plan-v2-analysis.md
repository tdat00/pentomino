# Improve generating: version 2 and its addendum

Independent analysis by Astra (SA2), 2026-11-15.

Reviewed plan: `240398f`, including the answers to IG-P-Q17/Q18. This is phase 1, before the cross-review.
I have not read the other analyst's phase-1 analysis.

The requested source reference was `rating-v3` at `13d61fd`. The main worktree advanced during this reading:
its branch reference was `5ee9269be8bcd898e1ac789f63d63a1b97848eff` when inspected. In the files checked,
`deduce.js`, `difficulty.js`, `clues.js`, `generate.js`, `generation-client.js` and `worker-pool.js` remain
byte-equal to the provisional source. `levels.js` now withdraws Hell 1-3 and `policy.js` names `mixed-v3`;
the inspected policy difference is availability and explanatory comments, not the scoring or deduction
constants. Do not claim that the entire current source digest is still the provisional digest.

No engine, test, generation, benchmark or qualification run was made. Calculations only read recorded JSON;
no git command was run and no production file was changed.

## 1. Conclusion

Keep P1/P3/P4 as the main feature, with P2 only where the population and speed comparison admits it.
Preserve the old selection path through Master. The provisional improvements are real, but their small
populations and changed clue distributions are not release gates.

Of the new candidates:

- **C1:** prototype R4's incremental counters first; R5 may share their infrastructure. Prove exact charges
  and cap behaviour, and measure upkeep. R4 alone does not justify an expected 1.2x request improvement.
- **C2:** do not implement "more speculative candidates" as a new mechanism yet. The current scheduler
  already does this, including retries. The journals show substantial existing speculation, not idle workers
  waiting for nine jobs.
- **C3:** a narrow ranking experiment is worth considering after the per-set prior. Correlation is real,
  but much weaker near the target band, and the saved data cannot measure prediction of capped profiles.
- **C4:** park implementation; extend diagnostics only if a repeat-count experiment is approved.
- **C5:** a reasonable same-units loop optimisation after C1, with P11 as a separately measured backend.

Before spending heavily on kernels, test **P4's unbuilt per-set prior**, especially on Hell 1. About half the
recorded completed batch-profile time precedes the first locate hit. This is a more direct, smaller
experiment than the proposed new scheduler or an unmeasured refutation memo.

A further correction is necessary: PM1's targeted Hell 3 slice did not find a hit, but other PM1 families
already contain canonical Hell 3 scores, and central Hell 2 scores, on smaller boards/different piece-count
families. Closing their route can be a scope decision; it is not a proof that a rating-cap change is necessary.

## 2. Evidence and notation

| Short name | Repository-relative evidence |
|---|---|
| R | `docs\improve-generating\evidence\provisional\summary.md`, rows R00-R33 |
| Audit | `docs\improve-generating\clarifications.md`, final audit addendum |
| PM2 | `docs\improve-generating\evidence\provisional\IGP-06\pm2.md` |
| PM1 | `docs\improve-generating\evidence\provisional\IGP-05\pm1.md` and the three `families-*.jsonl` files |
| Journals | `docs\improve-generating\evidence\provisional\IGP-01\after\*.calls.jsonl` and their `*.runs.json`; preferred Hell arms in `IGP-03h\w760\` |
| Landscape | `docs\difficulty-v3\landscape-v3-full\*-2026-11-13.json` and `*-2026-11-14.json` |
| Lock | `docs\difficulty-v3\calibration-2026-11-15.md`, especially sections 6, 9-12 |

**Measured** refers to stored observations. **Derived** refers to arithmetic on those observations or the
inspected code. **Projection** refers to assumptions. Projected ranges below are sensitivities, not
confidence intervals or measured percentiles.

The underlying provisional rating/search runtime matches the requested pre-MP12b3 source. Nevertheless,
MP12b3-MP17, the new policy identity, diagnostic-offer overrides and a future frozen source must be handled
explicitly. A hidden Hell cell does not acquire a public offer because a private prototype generates it.

## 3. Answers to section 9.4

### A1. Exact virtual charge for R4 and `fewestColumn`

The proposal is feasible, provided it replaces computation rather than changing the virtual algorithm.
The relevant code is `core\engine\deduce.js`: `kill:432`, `select:444`, `undo:482`, `ruleR4:709`,
`ruleR5:783`, `ladder:1448`, and `fewestColumn:1541`.

For an uncovered piece `p`, define:

- `L_p`: the static length of its column, including dead rows.
- `n_p`: its current live-row count.
- `s_p`: its number of cells; every placement row of this piece has `s_p + 1` columns.
- `r_p`: its first live row in reference column order.
- `H_p`: cells of `r_p` covered by all `n_p` live rows, visited in that row's original order.
- `L_c`: the static length of cell column `c`.
- `K_p`: rows actually killed while visiting `H_p`, in the reference cell/column-row order.

**Derived reference charge for that piece:**

```text
W_R4(p) = L_p
        + 2 * n_p * s_p
        + (n_p > 0 ? s_p : 0)
        + sum over c in H_p of L_c
        + sum over r in K_p of (s_piece(r) + 1).
```

The first scan charges `L_p + n_p*s_p`; testing the first row charges `s_p` and the scanned cell columns;
`kill` charges each killed row's length; clearing the marks charges another `n_p*s_p`.
**The outer loop of the clearing pass does not charge `L_p` again.**
When `n_p=0`, only `L_p` is charged. Covered pieces charge nothing.

Maintain `coverCount[p,c]` in `kill` and `undo`, alongside the existing column counts. Then a cell is common
exactly when its count equals `n_p`. Preserve the reference first live row, ascending piece order and the
ordered kills, and stop at the first piece that kills anything. The piece's own rows are not killed by its
application, so its scan/reset counts remain valid throughout that application.

There is no work-limit check inside R4. It is therefore possible to reproduce its charge without scanning
every row, but do not add a new early check or alter what the following R5/R6/ladder sees. Counter maintenance
is implementation overhead, not additional reference work units. Undo must restore the counters even inside
lookahead and census probes.

For `fewestColumn`, every invocation charges **exactly `C`**, covered columns included. It returns the
lowest-index uncovered column with the fewest live rows. The diagnostic `tieOrder` selects its ordinal
among tied columns; its second pass adds no work. A bucket/ordered-minimum structure must preserve both,
including `best=-1` and `mrvCount=Infinity` when everything is covered. Charge `C` at the same point and do
not add a work check after it: the reference can reach a solution after that charge overshoots a limit.

The bucket structure is not automatically cheaper. Maintaining ordered ties through every kill and undo may
cost more than scanning at most a few hundred columns. PM2 does not isolate a reliable column-choice cost:
12x12 actually lists `fewestColumn` at 40.3 ms, rounded to 0.0%, with substantial work possibly inlined into
its caller. "Not reported" should become "not reliably isolated".

**Memory:** charge real extra slots through `slotTable` and `memoryBytes`. A dense 90-piece by 676-cell
32-bit counter table is about 243 KB before allocator rounding, not free memory. Keep the 32 MiB deduction
limit and the separate worker/process limits. If the optimised workspace would fail a memory limit that the
reference satisfies, fall back to the reference implementation rather than change the rating's outcome.

#### Which other rules fit?

| Rule | Assessment |
|---|---|
| R5 | Plausible second use of the piece/cell counters, but not just a count lookup. Its first scan stops at the first live row of a different piece; its membership scan stops at the matching cell. Preserve the witness positions and those exact prefix lengths, then the same kills |
| R3 and R3-place | Not the same local-counter optimisation. A placement can split a pocket, remaining pieces change the global knapsack, and the first contradictory component ends the scan. A separate connectivity/reachability and charge proof is needed |
| R6 | Not a static counter rule. A trial calls `select`, the R1/R2/R3 closure and `undo`; the changed state, trial order and cap crossings matter. It belongs with a separately proved trial/memo design |
| R7/R8/R9 | No blanket extension. Colouring, neck/pocket reasoning and pair dependencies have their own early exits, direct work checks and order. Keep native unless individually profiled and proved |

Tests need exact `DeductionResult` equality, main/census work and node limits on both sides of boundaries,
ties, no-live-row cases, contradiction/undo, memory fallback and the reference AR1/centre behaviour.
An equality check of final scores alone is insufficient.

### A2. What R13's extra waves actually mean

R13 is a **proxy**:

```text
waves = (T10 - T1) / median duration of the request's successful batch selection calls.
```

It is not a count of physical scheduling waves. A long successful call increases the numerator while
leaving its denominator small. It does not show that the scheduler only started nine candidates.

I grouped the saved journal starts, profile entries and ends by request and stage. These are **Derived**
counts for IGP-01's after arm, the population of R13:

| Cell | Requests | Batch calls started / finished OK / finished non-OK / without end | OK calls beyond nine per request | Median R13 proxy | Median longest-OK / median-OK duration |
|---|---:|---|---:|---:|---:|
| 12x12 Nightmare | 3 | 42 / 35 / 0 / 7 | 8 | 3.38 | 2.26 |
| 14x14 Nightmare | 3 | 52 / 43 / 0 / 9 | 16 | 6.24 | 4.01 |
| 15x15b10 Nightmare | 3 | 55 / 46 / 0 / 9 | 19 | 4.85 | 2.98 |
| 26x26 Nightmare | 6 | 80 / 61 / 0 / 19 | 7 | 4.12 | 3.28 |
| 14x14 Master | 5 | 78 / 65 / 0 / 13 | 20 | 6.18 | 5.16 |
| 26x26 Master | 5 | 79 / 66 / 0 / 13 | 21 | 4.97 | 3.81 |
| 26x26 Hell 1, 380 M | 3 | 50 / 41 / 0 / 9 | 14 | 3.84 | 2.34 |

The preferred no-screen arms tell the same story. For Hell 1 26x26 the two requests started 14 and 15 batch
calls, finished 11 and 12 OK, and left three without an end each. Hell 1 20x20 started 21 and 15, finished
17 and 12 OK, and left four and three without an end. No finished non-OK selection call was recorded in
these four requests either.

The current source already supplies the proposed mechanism:

- `generate.js:dispatchOrder` prioritises the awaited candidate, attempt zero of later slots, retries of
  the current slot, then retries of later slots.
- `BUDGETS.slotAttempts` is already 12 **per slot**, not 12 candidates for the whole batch.
- `generation-client.js:1057-1085` replenishes up to the pool width and consumes through `foldNext` /
  `foldAccept` in fixed order.
- `foldAccept` can reject a successful clue-selection call for duplicate layout/clue keys or insufficient
  layout distance. The candidate universe and frozen request-start history are already deterministic.

There is useful timing evidence, but not a complete causal partition. Clipping completed selection-call
intervals to `[T1,T10]` and dividing their sum by `4*(T10-T1)` gives median recorded busy fractions
0.818/0.849/0.864/0.884/0.872 on the four Nightmare cells and Hell 1 above. Extending unfinished calls to
T10 gives conditional upper estimates 0.950/0.969/0.955/0.970/0.989. These are selection-call wall intervals,
not CPU utilisation; unfinished work and work outside selection are not fully observed.

Thus long successful calls and existing speculative work are demonstrable. **Failures before selection,
duplicate rejection, distance rejection, unused speculative results and time waiting for an earlier slot
cannot be separated exactly:** the journals lack the slot/attempt and fold-consumption linkage. Do not
invent that partition, and do not call a missing end a failed candidate.

C2 needs a definition before a new arm. Increasing queue depth at the same four workers does not bypass a
slow earlier candidate under deterministic consumption. A sensible small experiment is instead a bounded
prefetch policy, preserving the existing candidate universe, with dispatch/finish/consume/discard reason
records. A "first nine to finish" policy is not acceptable.

### A3. C3 correlations on the saved records

I read the Landscape case files, retained ordinary `generation` runs once per `(caseId,seed)`, and used
their diagnostic `samples`, not the accepted puzzles alone. There are **18,956 completed diagnostic
samples**, plus **1,087 recorded `sampling/rating-incomplete` errors**. Those errors do not retain the DLX
features. The prototype call tuples and run summaries also do not retain those diagnostic features.

For the completed Landscape samples, no diagnostic reaches the 50,000 row-trial limit. Consequently
`B = min(branchTrials,5000)` is recoverable here; the branch-trial cap already has the value 5000.

The table gives **Derived Spearman rank correlations**, using average ranks for ties. A "near-band" sample
has score in `[min - width/2, max + width/2)`, where `width=max-min` for the requested level. Area classes here
are analysis strata, not a proposed P2 enablement table.

| Requested level / area | Completed / capped errors | All completed: rho(score,B) / rho(score,rowTrials) | Near-band n | Near-band rho: B / rowTrials / U |
|---|---:|---|---:|---|
| Very Easy, <=144 | 386 / 0 | 0.899 / 0.946 | 242 | 0.751 / 0.912 / 0.887 |
| Easy, <=144 | 218 / 0 | 0.894 / 0.917 | 147 | 0.833 / 0.921 / 0.910 |
| Easy, 145-324 | 480 / 0 | 0.925 / 0.964 | 299 | 0.781 / 0.966 / 0.954 |
| Normal, <=144 | 262 / 0 | 0.909 / 0.936 | 121 | 0.668 / 0.703 / 0.719 |
| Normal, 145-324 | 1336 / 0 | 0.911 / 0.958 | 672 | 0.820 / 0.732 / 0.601 |
| Hard, <=144 | 240 / 0 | 0.930 / 0.957 | 67 | 0.652 / 0.622 / 0.449 |
| Hard, 145-324 | 1414 / 0 | 0.940 / 0.974 | 439 | 0.637 / 0.665 / 0.525 |
| Hard, 325-484 | 1310 / 0 | 0.924 / 0.976 | 360 | 0.665 / 0.691 / 0.606 |
| Hard, 485-676 | 651 / 3 | 0.923 / 0.980 | 156 | 0.733 / 0.732 / 0.648 |
| Expert, <=144 | 266 / 0 | 0.951 / 0.963 | 76 | 0.650 / 0.649 / 0.590 |
| Expert, 145-324 | 1669 / 25 | 0.949 / 0.978 | 375 | 0.751 / 0.748 / 0.439 |
| Expert, 325-484 | 1417 / 13 | 0.942 / 0.977 | 342 | 0.765 / 0.760 / 0.579 |
| Expert, 485-676 | 715 / 5 | 0.933 / 0.977 | 172 | 0.784 / 0.772 / 0.589 |
| Master, <=144 | 289 / 9 | 0.967 / 0.972 | 100 | 0.794 / 0.778 / 0.726 |
| Master, 145-324 | 1593 / 152 | 0.952 / 0.983 | 361 | 0.637 / 0.635 / 0.483 |
| Master, 325-484 | 1361 / 50 | 0.948 / 0.980 | 240 | 0.663 / 0.662 / 0.652 |
| Master, 485-676 | 674 / 24 | 0.941 / 0.983 | 122 | 0.578 / 0.585 / 0.538 |
| Nightmare, <=144 | 962 / 68 | 0.937 / 0.946 | 290 | 0.341 / 0.298 / 0.822 |
| Nightmare, 145-324 | 1214 / 293 | 0.941 / 0.985 | 205 | 0.602 / 0.599 / 0.454 |
| Nightmare, 325-484 | 1481 / 240 | 0.951 / 0.983 | 320 | 0.589 / 0.588 / 0.536 |
| Nightmare, 485-676 | 640 / 109 | 0.949 / 0.977 | 143 | 0.513 / 0.511 / 0.519 |
| Hell 1, 145-324 | 49 / 15 | 0.944 / 0.974 | 6 | 0.131 / -0.486 / 0.926 |
| Hell 1, 485-676 | 329 / 81 | 0.934 / 0.974 | 36 | 0.715 / 0.708 / 0.569 |

The missing Hell/area combinations, and Hell 2/3, have no useful completed diagnostic sample population
here. That is missing evidence, not zero correlation.

For the headline cells individually, using all their completed diagnostic samples:

| Cell | Samples | rho(score,B) | rho(score,rowTrials) | rho(score,U) |
|---|---:|---:|---:|---:|
| 10x10 Nightmare | 339 | 0.910 | 0.912 | 0.983 |
| 12x12 Nightmare | 279 | 0.957 | 0.973 | 0.981 |
| 14x14 Nightmare | 226 | 0.938 | 0.989 | 0.978 |
| 15x15b10 Nightmare | 231 | 0.944 | 0.982 | 0.966 |
| 16x16 Nightmare | 246 | 0.935 | 0.986 | 0.974 |
| 15x20 Nightmare | 251 | 0.952 | 0.987 | 0.972 |
| 26x26 Nightmare | 331 | 0.947 | 0.973 | 0.971 |
| 26x26 Hell 1 | 245 | 0.937 | 0.972 | 0.950 |

**Interpretation:**

1. The broad correlations are strong but partly explain the same clue-count effect that P4 already uses.
   For Nightmare the corresponding all-sample correlations with `U` are 0.982, 0.964, 0.969 and 0.971.
2. Near the band, the relationship is materially weaker. On Nightmare <=144, `U` alone correlates much
   more strongly than the DLX statistics. This does not support paying for an extra diagnostic there.
3. As another confounding check, ranking within each `(case,seed,U)` group, centring those local ranks and
   correlating their pooled residuals gives row-trial correlations 0.392, 0.578, 0.461 and 0.386 for the four
   Nightmare strata. This is descriptive, not an independently validated predictor.
4. The Hell evidence is thin and selected. Among the PM1 in-band discoveries, for example, Hell 1 at
   145-324 has 23 records with rho(score,B) 0.058, and 325-484 has 31 with 0.329. Different PM1 parts are
   represented; these are not an unbiased evaluation set.
5. **The requested share of capped profiles predicted is unidentifiable from these records.**
   `difficulty.js:240-253` throws for an incomplete deduction path **before** running the DLX diagnostic.
   Do not assign B=5000 to those missing observations or count them as predictor successes.

Recommendation: **a narrow soft-ranking prototype is worth investigating on 196-484-cell Nightmare**,
against the cheaper `U/K/area` and P4-prior baselines. Do not make it an acceptance test, a no-window proof or
a default on small Nightmare/Hell cells. First fit and validate by held-out set/seed, not by random profile
rows from the same set. Record diagnostic-only features on capped inputs in a separately approved future
experiment, plus false exclusions, completed-request yield, clue/score distributions and total CPU.
No such diagnostic was run for this analysis.

### A4. Can `instr` count exact state repeats?

Not as it stands. `tools\ig-proto\variants\instr.json` records first-solution work/nodes and R7 cuts; it has
no state keys, subtree outcomes or recurrence counters. PM2's samples cannot recover them.

A test-side extension can count them without changing work counters. Instrument fixed points before
`branch`/`probe` and distinguish:

- main search before the first solution;
- continued solution counting;
- census replay and probes;
- complete failed subtrees versus capped/unfinished ones.

Key the exact live-row/covered state and relevant phase/limit context for the same model. "Same uncovered
cells and free pieces" alone does not establish equality after rule eliminations. Confirm equal states on
hash matches, account for the instrumentation's own memory and bound its storage. With eviction, report
a lower-bound reuse count and the eviction rate, not a global hit rate.

Suggested cells: the existing 10x10/12x12 Nightmare corpus, then one representative complete and one capped
Hell 1 profile on 20x20 or 26x26. This is a diagnostic addition, not a performance benchmark.

A future memo needs more than `work` and `nodes`: `Gt`, phase-specific node accounting, rule restoration,
the first path and `status`/`finalOpen` effects must match too. Never memoise a capped subtree as failed.
When remaining work or nodes would cut a stored traversal, recompute it. The census already avoids
re-probing alternatives whose status is known, so a large hit rate must not be assumed.

### A5. What can Hell 1 reach, and what changes the frozen round?

Keep the measured search improvement and the unmeasured kernel improvement separate. Section 5 gives the
time envelope. The main changes I recommend for the frozen round are:

1. Restore source/identity checks after MP12b3-MP17 and use explicit diagnostic offers for hidden Hell cells.
2. Promote the **per-set calibration prior** to a small matched Hell 1 arm before expensive new mechanisms.
3. Add a scoped R4/C5 spike, including a Hell 1 profile, exact units and memory fallback. Do not run every
   kernel hypothesis over the full qualification population.
4. Extend candidate/fold journals so C2's actual scheduling question can be measured. No new "more
   candidates" arm until it differs from existing behaviour.
5. For C3, use the data-only correlation result now; any future diagnostic-only ratings of capped inputs
   are a new costed task. C4 needs new instrumentation before a cache is designed.

There is no measured combination of C1-C5, no current-source browser result, and no new offer verdict.

## 4. Mechanism, risk and cost of each candidate

The cost model for an optimisation of fraction `f` of a request is
`F = 1 / (1 - f + f/s + u)`, with speed-up `s` and added overhead `u`.
PM2's fractions are **rating-time** fractions on two Nightmare corpora, not whole Hell request shares.

| Candidate | Expected gain and soundness/identity risk | Build and measure cost (Projection) | Recommendation and dependencies |
|---|---|---|---|
| C1 | R4 is 16.5-16.6% of the profiled rating time. Removing it entirely would give only about x1.20 under that model. With 70-90% removed and upkeep of 3-8% of old time, about x1.04-1.13 is plausible; regressions are possible. R5's 6.6-6.8% offers a second target. Preserve exact charges, ties, early returns, undo and memory-cap fallback | R4 roughly 250-450 engine lines and 200-350 test lines; R5 or a tie-preserving column structure another 150-300 each, only after measurement. Reuse 12-24 saved profiles for a paired parity/timing pilot, then the full PM4 corpus once for the admitted composite | **Prototype R4**, then consider R5. MP12b3-MP17 may move source anchors; final locked limits and all main/census boundary cases are prerequisites |
| C2 | Existing ordered speculation already covers the proposal. No new x1.3-1.6 batch factor is supported. A bounded-prefetch scheduling variant might give x0.9-1.1 wall time and lower CPU, but that is a sensitivity, not a result. Changing which candidates the fold can consume changes algorithm identity | First 80-180 lines of test-side dispatch/fold linkage, then a small 3-policy comparison at the same four workers. A genuinely different selection policy needs a new specification and serial reference | **Drop the duplicate proposal; prototype only a defined scheduling difference**. Preserve frozen history, distance rules, duplicate handling, cancellation and consumed-prefix order |
| C3 | Let `alpha` be the fraction of ratings avoided without losing required yield, `d` the diagnostic cost per old rating, and `g` the rating share. Then `F=1/[1-g*alpha+g*d]`. With assumed `g=0.96`, `alpha=0-0.25`, `d=0.03-0.10`, the range is about x0.91-1.27. x1.5-2 requires avoiding roughly 38-62% of ratings net of that cost, not just a high correlation | Correlations above required no engine run. A fixed, versioned ranker is roughly 200-450 implementation and 100-200 test lines; a capped-input feature collection and held-out request arm are additional work. Reuse a prepared model rather than building it twice where that can be proved identical | **Narrow prototype**, after the per-set prior; park a Hell/default deployment. Depends on the final model/caps, population decision, stored predictor/table identity and canonical acceptance |
| C4 | Complete repeated failed subtrees may be reusable, but occurrence and recoverable work are unmeasured. If recoverable work is 0-15% and hashing/accounting costs 2-8%, about x0.93-1.15 is a reasonable sensitivity; not an expected gain. A partial memo hit must never move a cap or census status | Diagnostic roughly 100-250 lines; a correct bounded memo roughly 500-900 implementation plus 300-600 test lines. Instrument a small named corpus first, separate from timing claims | **Park implementation**. Wait for eligible repeats, final source and a proof of all observable counters/statuses, not only failed-state soundness |
| C5 | `select`, `undo` and separately attributed `kill` together are about 31.2-35.3% of rating time. Speeding that whole part by x1.2-2 gives roughly x1.05-1.21 overall under PM2's model. Removing function-call syntax may do nothing where V8 already inlines it. P11 concerns the broader kernel and must be measured against the optimised JS baseline | JS loops roughly 100-250 implementation lines plus focused equality/undo tests. P11 is a larger backend task, perhaps 1,000-2,000 kernel/glue lines plus parity, packaging and fallback tests; not priced by a small JS spike | **Prototype after C1**. Retain the JS reference, exact virtual units, model layout, counters and capped behaviour. Browser loading, static deployment and JS fallback remain release dependencies |

These are engineering estimates, not authorised budgets. They exclude a new full landscape and the browser
qualification. A 20-request Hell cell at today's preferred-arm medians costs about 11.4-14.3 minutes of
payload at four workers **inside each request**, if requests run sequentially; pairing doubles that before
wrapper grace, validation and tails. A single 32 MiB kernel workspace limit does not replace the worker and
whole-process memory gates.

Do not multiply C1, C5 and P11 as independent factors: C1 adds upkeep to the very loops C5 and P11 optimise.
Measure the composite against one reference. Likewise C3/P4 change the profile mix on which a kernel share
was estimated.

P11 also is not literally an all-integer port: `snapshot` and `settleCensus` reduce floating-point
`Math.log2` terms into `info`. Keep that canonical reduction in JavaScript, or prove its exact equality;
a different transcendental implementation is not licensed by an unchanged rounded final score.

## 5. Speed before and after

### The extra opportunity in the existing P4 proposal

The addendum's "three to four ratings per accepted puzzle" is not a general post-search baseline. In the
preferred Hell arms, completed successful **batch selection calls** used:

| Cell, no screen | Requests | Finished OK batch calls | Profiles in those calls | Profiles per OK call (Derived) |
|---|---:|---:|---:|---:|
| Hell 1 26x26 | 2 | 23 | 142 | 6.17 |
| Hell 1 20x20 | 2 | 29 | 273 | 9.41 |

Those denominators are calls, not the 18 published batch puzzles per two requests. There is also unfinished
speculative work. R12's window-profile mean must not be added to R19's locate median and called a request
mean; Hell's median locate count was four, not two.

Summing completed-call tuple durations before the first locate in-band result gives:

| Cell | Batch-profile time in the pre-hit locate prefix | Of it, time on capped probes |
|---|---:|---:|
| Hell 1 26x26, no screen | 105.9 of 192.2 s, 55.1% | 80.2 s |
| Hell 1 20x20, no screen | 130.5 of 257.4 s, 50.7% | 119.5 s |

These are **Derived sums of worker-call wall time**, including successful calls not necessarily consumed,
not the fraction of the request's critical path. For a locate with no hit, its locate prefix is all its
locate work. Not all this work is avoidable: another subset at the prior count may still cap. But it is a
concrete reason to test a per-set prior rather than assume only two cheap locate probes remain.

### Forecast model

The next table deliberately separates the measured search-only prototype from cumulative projections.

- **Phase 1:** P6 and admitted JS improvements, no search change. A sensitivity of x1.0-1.4 on today's
  Nightmare search; for Master the displayed range credits only x1.0-1.18, anchored to P6. This is not a
  transferred eight-worker result.
- **Phase 2 cumulative:** the measured prototype median divided by a post-search JS factor `J=1.0-1.35`.
  For Hell, also a prior factor `gamma=0.65-1.0`. That prior range assumes eliminating some, not all, of the
  roughly half-profile-time locate prefix; it is not measured. `gamma=0.8`, `J=1.2` are central scenarios.
- **Best mix / optional phase 4:** the final composite kernel, including C1/C5/P11, is assumed x1.3-2.2
  faster, with post-search critical-time share `g=0.85-0.96`. Thus
  `T_best = T_search * gamma * (1-g+g/k)`.
  The central scenario uses `k=1.7`, `g=0.95`, and `gamma=0.8` on Hell only.
  C2, C3 and C4 receive **no bankable additional multiplier**.
- Phase 3 measures offers; it supplies no automatic speed factor. If prototypes fail, retaining the
  unoptimised path remains possible. These scenario ranges do not exclude that outcome.

All times are seconds. Current T10 is conditional on reaching ten. The ranges in the prototype column are
observed minima/maxima, not p95 uncertainty intervals. All other ranges are **Projections of a median**.

| Cell | Current search, Measured T10 median / p95; completion | Phase 1, Projection | Search-only prototype, Measured | Phase 1+2, Projection | Best mix, Projection |
|---|---|---|---|---|---|
| 14x14 Nightmare | 113.0 / 151.6; 11/20 | 81-113 | 8.94 [5.48-12.20], 3/3, 190 M | 6.6-8.9 | 4.3-7.2 |
| 15x15b10 Nightmare | 86.2 / 141.6; 11/20 | 62-86 | 8.45 [5.96-9.01], 3/3, 190 M | 6.3-8.5 | 4.0-6.8 |
| 12x12 Nightmare, default no screen | 62.1 / 176.1; 17/20 | 44-62 | 16.47 [5.22-31.45], 6/6 | 12.2-16.5 | 7.8-13.2 |
| 26x26 Nightmare | 18.6 / 31.4; 20/20 | 13-19 | 11.94 [9.31-15.02], 6/6, 190 M; class not approved | 8.8-11.9, conditional on that arm | 5.7-9.6, same condition |
| 10x10 Nightmare | 24.0 / 68.4; 19/20 | 17-24 | No request-level run | No search gain credited: 17-24 | 11.5-19.3 if search cost stays unchanged |
| 16x16 Nightmare | 79.8 / 135.4; 15/20 | 57-80 | Not run | Unpriced; no justified 8-12 s point forecast | Unpriced |
| 15x20 Nightmare | 40.1 / 111.2; 15/20 | 29-40 | Not run | Unpriced; see below | Unpriced |
| 18x18 Nightmare | 37.3 / 134.5; 20/20 | 27-37 | Not run | No measured search factor | 17.8-29.9 with unchanged-search anchor only |
| 24x24 Nightmare | 18.7 / 57.3; 20/20 | 13-19 | Not run | No measured search factor | 8.9-15.0 with unchanged-search anchor only |
| 14x14 / 26x26 Master | 2.57 / 16.28 and 8.36 / 16.64; 20/20 each | 2.2-2.6 / 7.1-8.4 | New selection is not adopted | Same selection as gen-v3 | No further credit without non-regression evidence |
| Hell 1 26x26 | Hidden now; pre-withdrawal diagnostic 108.7 / 167.6; 9/20 | Diagnostic 78-109, no hit/completion gain claimed | 34.24 [28.12-40.37], 2/2, no screen | 16.5-34.2; central 22.8 | 10.6-27.5; central 16.7 |
| Hell 1 20x20 | No set in the 115 s prescreen | No completed-time forecast | 42.89 [36.86-48.92], 2/2, no screen | 20.7-42.9; central 28.6 | 13.3-34.5; central 20.9 |
| Hell 2 / Hell 3 | No public offer | No live-route gain established | No request-level arm | No live T10 forecast | No offer inferred from individual ratings |

For 16x16 the captured 63.4% capped-attempt share suggests substantial room. For 15x20 the one serial
capture already needed only **2.2 profiles per accepted puzzle**, with 27.3% capped. That does not justify
transferring the same 8-12 s forecast to both. The addendum's x1.5-2 extrapolation over all larger Nightmare
cells is likewise only an analogy: 26x26's six paired factors ranged from 0.69 to 3.91.

**Browser and availability.** Applying `5 + 4*T_Node` to a median is a sensitivity, not a browser measurement;
the existing D39 planning records use the **Node maximum**. Neither is a replacement for the browser gate.
The Node median target corresponding to 60 s under that sensitivity is 13.75 s.

- Preferred Hell medians currently imply about 142 and 177 s.
- The kernel-only best-mix scenarios, without the improved prior, are about 16.3-27.5 and 20.4-34.5 s in
  Node, still outside that 13.75 s target.
- With the speculative prior benefit, optimistic ends can cross it, but the central scenarios still imply
  about 72 and 89 s in the browser. The prior/kernel gains have not been composed or validated.
- No projected completion percentage is justified. Two successes have a one-sided 95% lower bound of
  22.4%; three successes 36.8%. Keep the operational D39 population and the matching browser runs.

Do not multiply a guessed C2 gain into this table. It counts work the scheduler already performs.

## 6. Version 2's evidence, scope and gates

### Numerical and interpretive audit

| Claim | Assessment |
|---|---|
| R02/R04/R05/R06/R08 times, populations and paired ranges | Correctly copied, including the no-screen updates. Distinguish historic 20-request medians from the small matched cohorts; their quotient is not a paired factor |
| Master and the split selection path | Agree. The x0.83 on 26x26 and its downward clue shift are reasons not to adopt the new search there, not proof of a universal slowdown |
| 548 prototype calls with no dead-end entry | Correct. It means no p2 dead-end entry, not no capped rating or no speculative work |
| Dead-end percentages 37-40%, 19%, 0% | Numerically correct for R10's sum of **profile time**, not directly a critical-path share of batch wall time |
| P2 certificate, 862/862 | Agree on the observed corpus. Preserve the positive certificate and every other limit. The "only overWork and branch" sentence misses direct R7 checks; equality at `work == W` is allowed by `<= W`, not screen-capped merely because the limit was reached |
| P2 factors | Agree: x2.6 on 14x14 with n=2; x1.56 on 12x12 with n=6 and +0.75 clues; x0.88 on Hell 1 26x26. No default extrapolation to untested classes |
| P4's two probes / 74-95% locate hits | Descriptive counts of finished calls, not an isolated x1.05-1.15 causal gain. The per-set prior is still unbuilt |
| P6/P8 and the first phase | Direction is right. Eight workers are not a default and the old "/1.9" is unsupported. R31's favourable range includes transfer of an unadmitted eight-worker factor; it is not a four-worker version-3 forecast |
| PM2's 96% and function shares | Correct only for its profiled two-cell rating corpus. It is not a whole-request Hell profile. `undo` is 7.0-7.9%, not uniformly 7.9%; separately attributed `kill` is another 6.7-7.4% |
| "Three to four ratings" / search floor x2-3 | Not a general bound. See the preferred Hell call counts in section 5. Means, medians, OK calls and accepted puzzles were mixed |
| "Nightmare 196-324 solved on three cells" | Overstatement. The principal three failing cells measured were 144, 196 and 215 cells. 256 and 300 remain unmeasured. Three requests do not establish the completion/tail gate |
| "Hell 1 generable wherever a window exists" | PM1 demonstrates windows on nine boards; request-level preferred-arm evidence is on 20x20 and 26x26 only. Do not transfer their T10/completion to every window |
| "Ten passing Nightmare controls" | Say completion-passing if that is intended. For example, 18x18 has 20/20 completion but p95 134.5 s, over 115 s |
| Ten seeds so "a p95 exists" | A sample p95 exists even at smaller n; at n<=10 it is the maximum under nearest-rank reporting. Ten is a pilot, not strong tail evidence or the 20-request Hell offer protocol |
| 17-53 s for a Hell 2 rating | It is amortised discovery cost per in-band observation. The eight in-band rating durations in `families-windows.jsonl` are 1.003-3.148 s, not 17-53 s each |
| Sourced staleness | Section 9 correctly distinguished the unchanged scoring/search source at 13d61fd from Sudoku's changed runtime. The subsequently observed mixed-v3 availability change needs a new identity receipt |

### IG-P-Q17 and IG-P-Q18

**Q17: agree with the population decision, with explicit controls.** A set that today's search fails to serve
has no successful-puzzle distribution to preserve. Serving its canonical in-band, AR1-eligible puzzles is
reasonable under OD-P6. A small blinded play comparison is useful product evidence, not a proof of universal
score validity. Keep the clue, score-position, centre, census-estimate and completion distributions beside
the times.

Use the no-screen arm on small Nightmare and all Hell by default. The 196-324 screen table is a hypothesis
from only a few cells; add an explicit no-screen default for unmeasured/gap classes. Pre-register the
same-set shift statistic and speed criterion before fitting the table. The (c4) probe can remain optional
under its <10% T10 cost rule, measured on the same population.

**Q18: agree with the current release scope, not the impossibility explanation.**

The targeted Hell 3 population contains 201 ratings in 16 families, with no hit. That supports stopping this
feature's expenditure on that population. It does not prove that the fixed canonical rating cannot reach
Hell 3, or that more/different sets cannot do so.

PM1 already contains these counterexamples in **other requested-level families**:

| Stored family | Count | Canonical score / level | Record details |
|---|---:|---|---|
| `families-windows.jsonl`, n=3, `15x15b10-hell-1`, set 1, order 1, area 215, K=34 | 2 | 179 / Hell 3 | AR1 not refused; incomplete census; 2.642 s |
| Same family | 3 | 165 / Hell 3 | AR1 not refused; incomplete census; 2.503 s |
| Same family | 6 | 146 / Hell 2, central | AR1 not refused; incomplete census; 2.596 s |
| `families-scan.jsonl`, n=7, `12x12-nightmare`, set 1, order 1, area 144, K=22 | 1 | 129 / Hell 2, central | AR1 not refused; incomplete census; 2.542 s |

These are **not** release-ready packs, not new offers and not observations in the Hell 2/3 generation-policy
area/K populations. Their target-family `eligible:false` means they are outside that family's requested
band; it is not an AR1 rejection (`ar1:false`). They do show that "nothing canonical to pack" and "must
change the rating cap or scale" are too strong globally. New board/K populations would need a separate
scope/population decision and full verification. I recommend keeping them out of the committed release
scope unless the owner explicitly opens that route.

For the tested Hell 2 population, 8/404 at the lower edge and no central hit justify deferring PM3 pending
the owner's quality policy. The 17-53 s discovery cost is not an irreducible per-rating or future
prior-guided request cost. For Hell 1, adding the nine window boards to a **diagnostic landscape** is sound,
with unchanged D39/browser gates and OD-P6 first.

### Phases, later-round items and risks

| Item | Recommendation |
|---|---|
| Phase 0 before adoption | Keep the certificate, identity and changed-population checks. Fit priors/screens/predictor on training sets, freeze them, then use held-out seeds for the request comparison |
| P7 spike versus gen-v4 design | Do not make a speculative large kernel rewrite a prerequisite to the already-promising search. A failed spike should inform the browser plan, not erase P1/P3's evidence |
| D-IG7, rescue and (c4) | Keep both measured variants. Specify rescue order and reserve/cost within P5's budget; a screen-capped bracket is not a proof that a set has no window |
| D-IG9, omitted cells and non-regression | Add 10x10, 16x16 and 15x20; keep the completion-passing Nightmare controls and all 16 Master cells on the legacy path. Include the small-K case noted in the plan |
| Per-set calibration prior | Promote a bounded Hell 1 arm before C2/C4; the saved prefix costs justify it. Store its complete identity as Q03 requires |
| D-IG10 / OD-P8, PM1 | Approve a staged, reduced Hell 1/Hell 2 continuation, not a blind expenditure of the full old allowance. A data-only cross-achieved-band inventory can precede any new run |
| D-IG13 and source preparation | Hidden cells must be explicit diagnostic offers. Anchor repair, different-source handling and fresh fidelity checks precede timed work; no fallback to the old runtime |
| P5 and fail-fast | A deterministic work/attempt cap is a resource policy, not proof of unreachability. MP12b2's F1/F2 false stops warn against declaring repeated same-side failures safe. Measure lost completions against uncapped gen-v4, including aborted/unfinished calls, not only the 413 successful calls |
| P6 and C3 | Avoid silently reintroducing diagnostics on every profile. Any predictor pays its own DLX/build cost; accepted metrics remain canonical |
| P8 | Keep outside the default gate. Hardware core count alone does not overcome the measured 9-28% per-rating slowdown at eight workers |
| P11 | Compare against the admitted JS composite, preserve integer/counter semantics and JS fallback, and retest browser timing. No double-counting C1/C5 |
| Replay and formats | `algo`, policy, model, prior table, predictor/content identity, target, uniqueness and frozen history remain distinct. Preserve keys and ordered fold semantics; gen-v3 fixtures stay pinned rather than silently rewritten |

The biggest hidden costs are additional mutation bookkeeping, memory fallback, guard/census proof,
training/validation separation and recalibrating the time budget after the source moves. The worst quality
risk is treating a capped/heuristic/predicted side as a proof that a useful candidate cannot exist.

## 7. Owner decisions

| Decision | Options and evidence | Recommendation |
|---|---|---|
| IG-P-Q02 | Separate 115 s actions; shared response deadline with a batch reserve; or a new progressive contract. Seventy historical responses exceeded 120 s | Prefer a shared request deadline with a fitted reserve and cleanup time. Keep deterministic work caps as well; explicitly measure completion loss. Do not claim two action budgets enforce one response bound |
| OD-P5 | Progressive UI only, or replacement of the T10/response criteria by a new first-puzzle/batch contract | Approve progressive presentation separately if desired; the client already exposes accepted-prefix callbacks. Do not replace quality/completion/deadline criteria before browser data and an explicit new SLA, eventual-batch rule and cancellation/history policy |
| OD-P6 | Accept canonical score/centre/AR1 as the level while reporting the population shift, or retain today's failing start-count regime | Accept conditionally with the blinded comparison and two-sided population reporting. More clues is not automatically easier under the frozen score, but perceived difficulty has not been validated on the shifted population |
| OD-P7 | Keep no screen <=144, or pay the +0.75 same-set clue shift for the measured 12x12 x1.56 | Keep no screen until matched frozen and browser evidence makes the trade necessary. Do not extrapolate it to 10x10 |
| OD-P8 | Fund the reduced PM1 continuation, or stop after the small slice | Approve in stages after the frozen receipt; the roughly nine worker-hours is an estimate, not the frozen-round machine budget |
| OD-P3 / fallback route | Live Hell 1, progressive delivery, prepared content, or keeping a cell hidden | Do not close the Hell 1 pack option solely because Node is fast. If unchanged browser gates fail and the owner rejects a new SLA, keep the cell hidden or obtain a separate content decision |
| Further Hell 2/3 populations | Keep the planned area/K scope, or investigate cross-band witnesses and alternate generation populations | Keep scope closed for now, but record that this is a product/budget decision, not a demonstrated canonical impossibility. Any expansion needs its own approval and verification |

## 8. Questions for Fable before version 3

### IG-P-Q19: Specify rule (c5)'s statistic and admission test

Is the 0.5-clue tolerance the median of per-set median paired differences, a pooled puzzle statistic, or
something else? What constitutes "faster", and how do unmatched sets, incomplete batches and a different
completion rate enter the decision?

Recommendation: pre-register matched set/seed units, the paired population statistic, the wall/CPU statistic
and a separate completion/non-regression test. Report unmatched outcomes; do not make a slow or failed arm
disappear by conditioning only on completed pairs.

### IG-P-Q20: What does C2 add to the existing scheduler?

`dispatchOrder` already starts later slots and retries under fixed-order consumption; the preferred Hell arms
already start 14-21 batch calls for nine slots. Is C2 intended to change only prefetch/admission, or to define
a different candidate universe/selection rule?

Recommendation: remove the present gain claim. First consider a bounded-prefetch comparison with unchanged
fold semantics and complete dispatch/consume linkage. A different selection rule needs a serial reference
and explicit generator identity before a new arm can be priced.

### IG-P-Q21: Is the Hell 2/3 closure a scope decision?

How should version 3 describe the existing canonical 165/179 Hell 3 and central Hell 2 observations in
other PM1 families? Does the feature deliberately exclude alternate area/K populations, or should the
remaining PM1 work inventory those routes?

Recommendation: correct the global impossibility claim and retain the current release scope unless the
owner expands it. A data-only inventory is cheap; new generation, offer changes or pack claims are not
authorised by those few censored-census witnesses.
