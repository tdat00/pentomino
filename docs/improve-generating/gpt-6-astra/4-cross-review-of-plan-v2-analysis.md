# Plan v2 analysis: Astra's cross-review of Opus

2026-11-15. Phase 2, not the joint report.

Reviewed: `docs\improve-generating\claude-opus-5.5\3-plan-v2-analysis.md`, compared with my phase-1 analysis,
the provisional records, the audit addendum and the source. No generation, tests, re-rating, profiling,
benchmarks or git commands were run.

References beginning `claude-opus-5.5\` below are relative to `docs\improve-generating\`.
Derived figures already computed in phase 1 are cited as such, not presented as new measurements.

## 1. Overall position

We agree on the feature's centre: P1/P3/P4, P2 only where admitted, unchanged selection through Master,
C1 inside a bounded P7 spike, C5 afterwards, and no default eight-worker pool. Population, identity,
memory, canonical-rating and browser gates remain.

The source settles several apparent disagreements:

1. **C1 cannot use a five-cell-row formula.** These generated pieces have variable sizes.
2. **C2's ordered speculation already exists.** A new per-call work budget is P5, not a second independent
   benefit from adding spares.
3. **V3 diagnostic/score pairs do exist.** The accepted-puzzle summaries omit them, but the Landscape
   diagnostic samples and PM1 discoveries retain them. No re-rating is needed to obtain those correlations.
4. The journals demonstrate long successful selection calls and substantial speculation; they do not
   prove that fold rejection, failures before selection or all idle time are absent.
5. The low end of the combined Hell timing range should not multiply several unmeasured, overlapping
   mechanisms. Progressive presentation does not itself satisfy the existing T10 contract.

The main unsettled engineering choice is which R4 representation to prototype first: ordered live-row
lists, cached own-piece claims, or incremental counters. The main unsettled product choices are the
deadline/reserve policy, any replacement progressive SLA, and the precise Hell populations funded.

## 2. Answers to Fable and candidate dispositions

| Topic | Assessment of Opus | Proposed joint position |
|---|---|---|
| C1 virtual accounting | **Agree** on preserving the original check sites and on measuring upkeep; **disagree** with fixed five-cell charges | Use the variable-size formula below. Preserve reference order, cap overshoot behaviour, undo and memory-limit fallback |
| C1 implementation | **Partially agree** with live-row lists as a promising alternative | Lists avoid dead-row traversal, not the live-row marking/reset work. Count dead/live visits and dirty-piece reuse before choosing between lists, claims caches and counters |
| `fewestColumn` | **Agree** to measure before building buckets | Preserve all C virtual units and the diagnostic tie rule. Reduced-inlining profiles are diagnostic attribution, not production timing evidence |
| C2 decomposition | **Agree** on long successful calls and missing consumer linkage; **disagree** with ruling out the fold/failures categorically | Report finished selection calls separately from unfinished jobs and fold outcomes. Link dispatch, selection, completion and consumption before causal claims |
| C2 recommendation | **Partially agree** on a P5-budget experiment | Keep existing speculation as the control. A budget/prefetch arm needs a precise difference, yield-loss reporting and a serial reference; do not credit spares twice |
| C3 data | **Disagree** with "cannot be computed" | Use the already-recorded v3 samples. The unknown part is prediction of capped inputs, whose diagnostic features were not saved |
| C3 disposition | **Agree** that correlation is not enough for deployment | Data-only held-out prediction against U/K/area and prior baselines first; then a narrow soft-ranking arm if useful. No broad default or acceptance shortcut |
| C4 | **Agree** to count first and park implementation | Count exact, collision-confirmed states, split phases and distinguish fully failed subtrees from capped ones; measure recoverable work rather than raw repeated hashes |
| C5 | **Agree** to prototype after C1 | Include separately attributed `kill`, not only `select`/`undo`; keep the same reference units and compare the admitted composite |
| Hell forecast / frozen additions | **Partially agree** | Add the necessary diagnostics, but promote the unbuilt per-set prior before C2/C4. Reprice the frozen manifest; no independent C2/C3/C4 factors until they are actually established |

### C1: source settlement

In `core\engine\deduce.js:709-778`, let:

- `L_p` be the static length of piece p's column;
- `n_p` its live-row count;
- `s_p` its actual cell count;
- `H_p` the common cells, visited in its first live row's reference order;
- `K_p` the rows actually killed while scanning those cell columns.

The exact per-piece reference charge is:

```text
L_p + 2*n_p*s_p + (n_p > 0 ? s_p : 0)
    + sum over c in H_p of L_c
    + sum over r in K_p of (s_piece(r) + 1).
```

The mark/reset passes each charge `n_p*s_p`; the clearing pass's outer loop does not add another `L_p`.
Covered pieces are skipped. The function returns after the first piece that **kills a row**, not merely
after a nonempty common-cell set.

The source uses `rowStart[r+1]-rowStart[r]-1` and `pieceSizes`, not a constant five.
For example, the first 14x14 Nightmare prototype set has piece sizes from 5 through 13
(`IGP-01\after\14x14-nightmare.runs.json`, first row, `run.details.sizes`).

Opus's live-list alternative deserves consideration, but its effect must be stated correctly:

- Ordered doubly linked live-row lists can skip physical visits to dead rows while charging their static
  positions/lengths. Unlink and reverse-order restore must preserve the original first-live and row order.
- They still visit live rows to build/reset the common-cell marks. They do not implement Fable's incremental
  counters by themselves.
- A cached **common-cell set** depends only on the piece's own live rows. It can remain valid when another
  piece changes. A cached **kill list/application result** depends on the other pieces too. The distinction
  permits caching nonempty own-piece claims while rescanning their affected columns against current rows.
- Per-piece dirty flags have cheap upkeep but an unknown hit rate. Incremental counters always provide
  current counts, at greater per-kill/undo upkeep. Lists save dead scans even when a piece is dirty.

The joint spike should first record R4 invocation counts, static/live row visits, dirty-piece fractions
and mutation counts, including failed search branches and census work. Final-path `rules` counts alone do
not answer that question. Then choose a small bounded comparison, rather than assume that either data
structure is the winner.

### C2: source settlement

`core\engine\generate.js:553-581`, `dispatchOrder`, already prioritises the awaited candidate, attempt zero
of later slots, retries of the current slot, then later-slot retries. `BUDGETS.slotAttempts=12` is **per
slot**. `generation-client.js:1057-1085` keeps the pool supplied and consumes in fold order.

The preferred no-screen Hell runs already started 14/15 batch selection calls on 26x26, and 21/15 on 20x20,
for nine published batch slots per request. Opus's decomposition agrees with the long-tail evidence, but
there is no missing "start more than nine" mechanism to implement.

**Joint disposition:** a per-call work-budget arm is reasonable after the budget decision, provided the
control keeps existing speculation. Name any additional prefetch limit/order separately. Record the
candidate universe, dispatch/consume/discard reason, canonical-profile completion/overshoot, CPU, population
and lost completions. A wall-time bound does not follow from capping at twice a median work value.

### C3: source settlement

The direct counterexample to the data-absence claim is:

`docs\difficulty-v3\landscape-v3-full\12x12-nightmare-2026-11-13.json:571-607`.

Its v3 diagnostic samples include score 97 with `branchTrials=5000`, `rowTrials=5420`, and score 48 with
803/879. `IGP-05\discoveries.jsonl` additionally contains full v3 rating metrics, including B and rule counts.
The absence of those fields in accepted-puzzle summaries and compact call tuples is real but not global.

My phase-1 section 3 A3 gives the complete selection rule and correlations: 18,956 completed diagnostic
samples, plus 1,087 saved sampling errors for incomplete ratings. For Nightmare:

| Area stratum | Near-band samples | Derived rho(score,B) / rho(score,rowTrials) / rho(score,U) |
|---|---:|---|
| <=144 | 290 | 0.341 / 0.298 / 0.822 |
| 145-324 | 205 | 0.602 / 0.599 / 0.454 |
| 325-484 | 320 | 0.589 / 0.588 / 0.536 |
| 485-676 | 143 | 0.513 / 0.511 / 0.519 |

The near-band interval is `[min-width/2, max+width/2)`. Broad full-curve correlations are much higher and
partly reflect U/clue count; they are not predictive accuracy. Use held-out sets/seeds, not profile-level
random splits, for a model test.

We agree that **the capped-input prediction rate remains unknown**. `difficulty.js:240-253` throws for an
incomplete deduction path before running the DLX diagnostic. Obtaining those missing features is a new,
approved engine task; it is not an unlocked data-processing operation.

## 3. Errors and over-claims in Opus's analysis

| ID | Citation | Finding and correction |
|---|---|---|
| P-CR1 | `claude-opus-5.5\3-plan-v2-analysis.md:43-50,61,68` | Pieces are not all five cells. Replace the 5/10/6 constants by actual piece/row lengths. The R4 proof and bucket-upkeep estimate otherwise fail on the measured generator's own sets |
| P-CR2 | `claude-opus-5.5\3-plan-v2-analysis.md:53-64,231` | Live-row lists do not remove the live-row marking passes; they remove dead-row visits. Nonempty own-piece common-cell sets also do not depend on other pieces' rows, although their resulting kills do. Distinguish the cache contents |
| P-CR3 | `claude-opus-5.5\3-plan-v2-analysis.md:120-143,232` | "Not ... the fold" and "no batch call failed" overstate the journal. No **finished selection call** was non-OK; missing ends, pre-selection failures and fold rejection are not classified. Existing ordered speculation must be the baseline, not a new independent factor |
| P-CR4 | `claude-opus-5.5\3-plan-v2-analysis.md:148-158,233` | V3 diagnostic/score pairs exist in Landscape `samples` and PM1 discoveries. Correct the data inventory and use them before proposing re-rating |
| P-CR5 | `claude-opus-5.5\3-plan-v2-analysis.md:157-158,223` | An "untimed" re-rating/counting engine run still consumes the shared machine. It needs the applicable approval/priority wrapper; lack of timing intent does not make it lock-free. No such run is needed for the existing correlations |
| P-CR6 | `claude-opus-5.5\3-plan-v2-analysis.md:85-89` | R7's `reachable` is an area/colour-imbalance dynamic programme (`deduce.js:1013-1075`), not a cell flood. Pocket labelling and DP charges need separate accounting; an incremental connectivity structure does not reproduce the DP by itself |
| P-CR7 | `claude-opus-5.5\3-plan-v2-analysis.md:66-70,94` | One bitset per live-row count is not simply an array of size R, NP or C: storage also depends on the count range and bitset width. Price the representation and preserve the original memory-limit outcome through fallback |
| P-CR8 | `claude-opus-5.5\3-plan-v2-analysis.md:176-189` | The quoted `sameState` also compares `colCount`, trail length and picked length. A narrower semantic key can be valid if its invariants are proved, but do not describe it as that comparator unchanged. "Repeats are common" and the suggested 20% threshold are hypotheses/policy choices, not recorded evidence |
| P-CR9 | `claude-opus-5.5\3-plan-v2-analysis.md:162-165,198-208,233` | The generic three-to-four-ratings premise is false for the preferred Hell arms. They used 6.17 and 9.41 profiles per completed OK batch call, with additional speculative work. There is no proved universal x2-3 search-side ceiling |
| P-CR10 | `claude-opus-5.5\3-plan-v2-analysis.md:198-208,342-353` | The fast composite ranges stack unmeasured C2/C3, kernel/P11 and transferred P6/P8 effects. R31 is a historical sensitivity including an unadmitted eight-worker transfer, not the default four-worker forecast. Rebase the composite once rather than count overlapping gains |
| P-CR11 | `claude-opus-5.5\3-plan-v2-analysis.md:214-215,298-300,379-383` | Progressive delivery still depends on an unmeasured browser first-puzzle time and a new SLA. A Node pass does not show the browser factor is pessimistic. The actual D39 planning records use the Node maximum; a median transform must be labelled a separate sensitivity |
| P-CR12 | `claude-opus-5.5\3-plan-v2-analysis.md:262,293-295,376` | Ten observations do have an empirical nearest-rank p95: the maximum. Say that the tail estimate is weak, not nonexistent. Twenty matches the operational Hell offer population but does not by itself prove a 90% population completion probability |
| P-CR13 | `claude-opus-5.5\3-plan-v2-analysis.md:321-325,369` | Agreement with Q18 needs a scope qualification: its targeted Hell populations do not prove global canonical unreachability. PM1 already records 165/179 Hell 3 and central Hell 2 scores in other area/K families; see section 6 |
| P-CR14 | `claude-opus-5.5\3-plan-v2-analysis.md:274` | F12's main point is sound, but K is not a fixed 19/18 for those boards. The Landscape's first two 3x29 sets have K=19/17 and 10x10 K=17/19. Cite a cohort/range rather than a constant per board |

For P-CR11, today's 26x26 Nightmare Node maximum is 35.779 s. The maximum-based planning figure is therefore
about 148.1 s, not the 79.4 s obtained from its 18.6 s median. Neither is measured browser latency.

For C4, `covered` and `live` may determine some omitted counters under valid-state invariants; that is why
P-CR8 is a proof obligation, not a claim that every omitted scalar must be stored redundantly. Phase context,
cap eligibility, collision confirmation and complete-failure status are still essential.

## 4. Opus's findings on the plan

I accept several findings that my phase 1 did not make explicit enough, especially the 0/0 useful-rating
denominator, the window-specific DLX share and the 196-cell Hell scope gap.

| Opus finding | Position | Proposed joint wording |
|---|---|---|
| F1: two cells, not three in 196-324 | **Agree** | 196 and 215 were measured; the third principal failing cell was 144. No class-wide "solved" claim or established tail/completion gate |
| F2: useful ratings lost 0/0 and 0/2 | **Agree** | State those denominators. They do not validate the whole screen class; the small direct prototype comparison is separate evidence |
| F3: Hell screen "negative" at n=2 | **Agree** | "Not shown to pay"; the two paired ratios straddle one. No-screen remains the sensible default because of the population shift and useful-rating losses as well |
| F4: P6's profile population | **Agree** | PM2 is not a prototype request profile. Complete-window DLX shares are 3.6% and 10.2%; P6 alone after gen-v4 is unmeasured. Do not isolate it from E:F, which also changes width |
| F5: phase-one x1.0-1.3 versus x1.0-1.5 | **Partially agree** | A single universal number is not the remedy. Separate observed P6, optional eight-worker results, and unmeasured four-worker kernel composition |
| F6: 26x26 Nightmare "as estimated" | **Partially agree** | The after median is below the old point projections but inside R06's widened descriptive band. State paired x2.01 with 0.69-3.91 range and the 190 M arm; the no-screen default is unmeasured |
| F7: dead-end estimates | **Agree** | Broad-range agreement is not per-cell forecast accuracy; 12x12 was underestimated. The denominator is summed profile time, not request critical-path time |
| F8: Hell wherever a window exists | **Agree** | Request-level evidence is 20x20 and 26x26, two requests each. Other windows justify diagnostics, not transferred completion/T10 claims |
| F9: window-profile tails | **Agree** | Give the mean and tail, not "0-4" as a bound; distinguish locate/window/whole-call and call/published-puzzle denominators |
| F10: transferring 26x26 to 18x18-24x24 | **Partially agree** | 324 belongs to the provisional 190 M class, but that does not justify transferring 14x14's gain either. Leave request performance unmeasured until the class is checked |
| F11: 10x10 unchanged because no dead end | **Agree** | No demonstrated dead end does not imply no search/prior benefit. Keep an unmeasured row rather than infer either a gain or no gain |
| F12: small-K examples | **Agree with correction P-CR14** | Remove the illustrative K<12 claim for these measured examples, or identify the actual smaller-K population intended |

The remaining findings from my phase 1 should also enter the joint report:

- The P2 positive certificate permits equality at W; "reached W" is not a complete screen-capped definition.
  R7 has direct work checks, so the code map must not name only `overWork` and `branch`.
- "Ten passing Nightmare cells" means completion-passing if used that way: 18x18's measured p95 is 134.5 s,
  above 115 s despite 20/20 completion.
- Hell 2's 17-53 s is amortised discovery cost per in-band observation. The eight in-band rating durations
  themselves were 1.003-3.148 s.
- P5's proposed caps must be evaluated on unfinished/aborted and failed outcomes too, not only successful
  calls. Repeated same-side failures are not proof that no window exists.
- P11 must preserve `info`'s floating-point reduction as well as integer work; retain canonical JS reduction
  or demonstrate exact equality.

## 5. Gains and the proposed common forecast

We agree on all measured anchors: default no-screen 12x12 is 16.47 s, no-screen Hell 1 is 34.24 s on 26x26
and 42.89 s on 20x20, and 26x26 Nightmare's 11.94 s is conditional on the screen. None is a browser gate.

| Issue | Opus's treatment | Proposed joint treatment |
|---|---|---|
| R4 alone | Likely x1.05-1.15; up to x1.20 | Broadly compatible with my upkeep sensitivity. x1.20 is the zero-cost ceiling under the attributed 16.5% model, not an expected gain |
| C5 | Select/undo x1.1-1.15 | Similar order, but include `kill` where it is optimised. State the affected fraction, speed and upkeep; do not assume hidden inlined work is zero |
| C2/P5 | New T10 factor x1.0-1.35 | No separate spare-candidate credit. A budget/prefetch arm may improve or regress time/yield; compare it to existing scheduling |
| C3 | Likely x1.1-1.4 after new correlation measurement | Existing correlations allow a data-only model test now. Net request gain and capped-input accuracy remain unknown; no positive multiplier in the central delivery forecast |
| C4 | Optional contributor to P7 | Exclude until fully eligible repeated work is counted |
| Prior benefit | 20x20 only, likely x1.4 | Also test the unbuilt **per-set** prior on 26x26. The recorded completed-call pre-hit locate fractions are 50.7% and 55.1% respectively; these are not guaranteed critical-path savings |
| P11 | Another x1.3-2 multiplied onto P7 | Measure total speed against the admitted JS composite. Use one explicit total-kernel sensitivity, not independent optimism on the same loops |

A common, transparent sensitivity can use my phase-1 model:

```text
T_best = T_search * gamma * (1 - g + g/k)
gamma = 0.65 .. 1.0, central 0.8       hypothetical prior benefit on Hell
g     = 0.85 .. 0.96, central 0.95     post-search critical-time kernel share
k     = 1.3 .. 2.2, central 1.7       total admitted kernel/backend gain
```

This is a **Projection**, not an agreed measurement or a claim that every prior avoids that work.
It yields approximately:

| Cell | Opus with P11 | Proposed composite sensitivity |
|---|---|---|
| Hell 1 26x26 | About 16 s, range 5-24 | About 16.7 s, range 10.6-27.5 |
| Hell 1 20x20 | About 14 s, range 4-25 | About 20.9 s, range 13.3-34.5 |

The numerical difference is mostly assumptions, not a measured dispute. Do not average the two forecasts.
The proposed sensitivity excludes positive C2/C3/C4 credit and prices one total kernel effect, while allowing
a prior experiment on both cells. A no-gain outcome remains possible if the prototypes fail their gates.

Under the separate median illustration `5+4*T_Node`, the central figures are about 72 and 89 s, still above
60 s. Only optimistic ends cross the 13.75 s Node target. This does not establish a browser failure or pass;
the actual D39 maximum-based planning and matching browser measurements stay separate.

The 16x16/15x20 "6-9 s after all" row should not become a joint forecast. In the stored 15x20 serial capture
there were already only 2.2 profiles per accepted puzzle. The two cells have different cost regimes and no
request-level prototype measurement.

## 6. Owner decisions, Hell scope and the frozen budget

| Decision | Position on Opus's recommendation | Proposed joint position |
|---|---|---|
| IG-P-Q02: shared deadline | **Agree on principle; partially on numbers** | One end-to-end response bound with dispatch/cleanup reserve, deterministic work caps and measured completion loss. A 115 s generation stop plus 120 s hard response bound is a candidate design; a 40% set cap is an unvalidated pilot parameter, not inferred from median shares |
| OD-P5: progressive delivery | **Partially agree** | Progressive presentation can be approved in principle. Keep existing offer criteria until the owner explicitly approves a measured first-puzzle/total-batch SLA, minimum delivered count, timeout and history policy |
| OD-P6: population rule | **Agree** | Conditional acceptance, two-sided clue/score/census reporting and a stated blind-play protocol before offers. A Nightmare and a Hell cell is a reasonable proposal, not proof of general score validity |
| OD-P7: small-board screen | **Agree** | No screen by default; use matched frozen and browser evidence to decide a necessary trade |
| OD-P8: PM1 continuation | **Agree, staged** | Include the failing-set work that informs the priors. Price retained populations/parts after the source receipt; do not automatically spend the old nine-worker-hour estimate |
| Hell 1 on 196 and 576 | **Agree to clarify** | 196 is outside the stated 215-676 phase-3 range. 576 is already inside that range but lacks a named request-level frozen PM3 arm. Distinguish those two gaps |
| Earlier browser calibration | **Agree on need for evidence before changing promises** | Either approve a bounded earlier prototype calibration or retain strict defaults until phase 3. A Node pass is not evidence that the planning factor is too pessimistic |
| Round size | **Agree it is larger than the provisional round; do not endorse a hard 5-9 h envelope** | Price a concrete manifest with populations, repetitions, stopping limits, validation, grace and concurrency. Median-based totals are not upper bounds. Reuse final baseline records only when source and full request match |

Twenty seeds is a sensible requested minimum for headline confirmation used to support the operational
completion gate. Smaller approved pilots can triage hypotheses, but cannot be relabelled qualification.
Twenty observations still give a coarse tail and a wide completion interval; the operational rule is not a
statistical proof of 90% population success.

### The Hell 2/3 disagreement is about scope, not an automatic new offer

Opus agrees with Q18's closure based on the targeted 201 Hell 3 ratings and 404 Hell 2 ratings.
I agree to keep the **planned release scope** closed unless the owner expands it, but not with the global
impossibility explanation.

`IGP-05\families-windows.jsonl`, record n=3, has a 215-cell, K=34 Hell 1 family with canonical scores
179 and 165 at two/three clues (Hell 3), and 146 at six clues (central Hell 2).
`families-scan.jsonl`, n=7, has score 129 (central Hell 2) on a 144-cell, K=22 Nightmare family.
They have `ar1:false` and incomplete censuses; their `eligible:false` is relative to the original target band.

These are outside the planned Hell 2/3 area/K populations, not qualified content and not a reason to run new
generation now. They do refute a global statement that the frozen canonical rating cannot supply such a
score without changing its cap or scale. The joint report should describe closure as a resource/population
decision and ask whether alternate populations are deliberately excluded.

## 7. Proposed merged questions for Fable

**Status convention:** *Agreed* means I accept the concern also raised by Opus; the exact merged wording is
proposed, not yet jointly signed. *Astra-only* means the concern was absent from Opus's phase-1 question list.
This list replaces the conflicting local Q19+ numberings for the proposed joint report.

### IG-P-Q19 — Agreed: admission statistics and margins

Specify phase 0's non-regression rule, (c5)'s "faster" statistic and its 0.5-clue tolerance: paired per-set
median shifts or pooled puzzle statistics, treatment of unmatched sets/incomplete requests, and CPU versus
wall criteria. Which thresholds are preregistered rather than fitted on the validation cohort?

Recommendation: matched set/seed units, separate completion and population checks, explicit unmatched
outcomes, and a held-out validation population after the table/ranker is fixed.

### IG-P-Q20 — Agreed: frozen population, ordering and budget

Will headline confirmation use at least 20 independent seeds, and which final difficulty-v3 records can
serve as native controls without training/validation leakage? Confirm the staged content: the per-set prior,
needed journal linkage, scoped C1/C5 spike, and only justified later diagnostics. What separately approved
machine envelope and stopping rules apply?

Recommendation: price the manifest after source preparation; keep smaller pilots distinct from gate
evidence. Do not treat the old round's remaining time or a median-based 5-9 h estimate as an allocation.

### IG-P-Q21 — Agreed: the 196/576-cell Hell 1 populations

Should 14x14 join the stated phase-3 range, and should 14x14 and 24x24 both receive named no-screen,
prior-guided request-level frozen arms after the failing-set/window work?

Recommendation: retain them as explicit candidate populations, not inferred offers. 576 is already inside
215-676; its gap is the request-level arm, while 196 needs the range/scope change.

### IG-P-Q22 — Agreed: what is new in the C2/P5 arm?

Given the existing speculative scheduler, is the intended experiment a per-call budget with unchanged
spares, a bounded-prefetch policy, or a new candidate universe? Define the canonical-profile boundary/
overshoot treatment, acceptable lost completion and CPU cost before claiming a separate C2 factor.

Recommendation: existing scheduling as the control, each changed mechanism named separately, fixed-order
serial reference, all discarded work counted, and unchanged canonical acceptance.

### IG-P-Q23 — Agreed: browser calibration and progressive promises

Will version 3 fund a bounded earlier browser calibration before committing a numerical set reserve or a
replacement OD-P5/OD-P7 promise, or retain current defaults until phase 3?

Recommendation: distinguish the actual maximum-based D39 planning record from a median illustration.
Neither establishes the browser factor. Progressive UI can proceed in principle; offer/SLA relaxation waits
for measurements and an explicit owner decision.

### IG-P-Q24 — Astra-only: alternate Hell 2/3 families

Does the feature deliberately exclude the alternate area/K populations represented by the existing
canonical Hell 2/3 witnesses, or should the remaining data inventory consider that route?

Recommendation: correct the global impossibility claim and keep the committed scope closed unless the
owner expands it. A data-only inventory is not permission for new generation, pack claims or offer changes.

### Mapping

| Phase-1 question | Proposed merged question |
|---|---|
| Opus Q19, Hell 1 cells | Q21 |
| Opus Q20, sample sizes/baseline/budget | Q20 |
| Opus Q21, gate thresholds | Q19 |
| Opus Q22, browser factor | Q23, with the Node/median/maximum distinction corrected |
| Opus Q23, C2 arm | Q22, with existing speculation as the baseline |
| Astra Q19, (c5) | Q19 |
| Astra Q20, existing C2 | Q22 |
| Astra Q21, Hell closure | Q24 |

No joint report is written in this step. It follows after both cross-reviews exist.
