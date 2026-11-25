# Plan version 3: independent analysis (Pentomino)

Astra (SA2), 2026-11-15. Phase 1; Opus's new analysis has not been read.
Start of the two-repository analysis: 2026-11-15 19:09:46 +07:00.

Plan/companion snapshot: `8d795f8`. Production-source facts were read only through
`git show 6122dc9:<path>`, not from the mutable rating-v3 working files.
No engine, generation, test, timing or benchmark run was made. Small scripts only read existing JSON or Git
objects and calculate statistics/arithmetic. Only this analysis file is written in this repository.

**Verdict:** the principal direction and all seven owner choices are incorporated. The plan is much better
than v2, but is not yet a complete implementation/gate specification. The retained P1 pseudocode is broken,
P7 needs a memory-equivalence rule, and (c5) needs fail-closed boundary cases. Section 4's arithmetic matches
its written formula, but the prior factor's scope and the Master measurement label need correction.

All `plan.md` line references below are to v3 at `8d795f8`.
**Measured** refers to stored evidence, **Derived** to arithmetic/code implications, and **Analysis** to
design assessment. Projected figures remain conditional estimates.

## A. Fidelity

### A1. All 22 corrections of the v2 joint report

| Joint item (e) | Status | v3 line(s) | Assessment |
|---|---|---|---|
| 1: two measured cells in 196-324, not three | Taken in | 44-46, 443-444 | 196/215 distinguished from unmeasured larger boards |
| 2: useful ratings lost 0/0 and 0/2 | Taken in | 238 | Denominators and unmeasured classes explicit |
| 3: Hell screen not shown to pay at n=2 | Taken in | 151, 237 | Both paired values and population reason retained |
| 4: PM2 is not a prototype request profile | Taken in | 117-119, 320-323 | Complete-window 3.6%/10.2% and unmeasured P6-after-gen-v4 distinguished |
| 5: no universal first-phase factor | Taken in | 451-454 | P6, optional eight workers and unmeasured kernel separated |
| 6: 26x26 gain is conditional on the screen | Taken in | 240, 430 | Default no-screen request arm remains unmeasured |
| 7: dead-end percentages are profile time | Taken in | 102-104 | Measured fractions versus old forecast ranges distinguished |
| 8: Hell request evidence is only two boards/two requests | Taken in | 129, 435-436, 449 | No transferred completion claim |
| 9: window means/tails and whole-call cost | Taken in | 206-209 | Means, p90/max and Hell call costs now present |
| 10: large-board transfer unmeasured | Taken in | 433 | No x1.5-2 search forecast |
| 11: 16x16 and 15x20 are different regimes | Taken in | 432 | Unpriced rather than one 8-12 s prediction |
| 12: 10x10 has no request-level arm | Taken in | 431, 447-448 | Kernel-only sensitivity is labelled; no measured search gain |
| 13: the named small-K examples have K 17-19 | Taken in | 620-622 | Their old K<12 illustration is retired |
| 14: Hell 2/3 closure is scope, not impossibility | Taken in | 33-35, 58-62, 382-383 | Explicit owner closure; alternate witnesses do not open a route |
| 15: 17-53 s was discovery cost, not one rating | Taken in by deletion | 58-62, 374-383 | The misleading cost claim is absent; no need to restore historical detail |
| 16: completion-passing is not every timing gate | Taken in | 473, 515-517 | 18x18's 134.5 s p95 is explicitly retained |
| 17: direct R7/probe/census work checks | Taken in | 88, 339-342 | Code contract now includes them |
| 18: equality at W is certified | Taken in | 222-223 | Exceeding W, not merely reaching it, makes a screen-capped result |
| 19: no general three-to-four-rating or x2-3 ceiling | Taken in | 206-209 | Removed as a request-level bound |
| 20: C2 already exists | Taken in | 29-30, 309-314 | Existing speculation is the P5 control, not a second factor |
| 21: sample p95 exists but is weak; 20 required for the proposed gate | Partly | 473, 512-513; 442 | The gate population is fixed, but "no p95 exist" remains in section 4 |
| 22: no default eight-worker transfer in the forecast | Taken in | 417-437 | One total-kernel sensitivity; no P8 multiplier |

### A2. Joint answers, items and frozen-round positions

| Joint position/item | Status | v3 line(s) | Assessment |
|---|---|---|---|
| Answer Q1: exact R4 charge, representations and checks | Partly | 331-360 | Correct variable-size formula and diagnostic-first choice; memory-limit equivalence remains unstated (JV3-P02) |
| Q2: waves are a proxy; existing speculation; journal linkage | Taken in | 89, 309-314, 480-482 | No speculative-candidate gain or categorical "no failures" claim |
| Q3: existing v3 correlation data, held-out test before C3 | Taken in | 391-397 | Correct staged, narrow scope; capped-feature gap not filled by inference |
| Q4: count eligible failed-state repeats before a memo | Taken in | 398-401 | No memo built, capped states excluded, engine task requires approval |
| Q5: one composite sensitivity; prior before kernels | Partly | 277-280, 417-437 | Single formula preserved, but batch-only wording and whole-request multiplication differ (JV3-P04) |
| P1 sequential locate | Partly | 173-210 | Mechanism retained, but the old pseudocode is not a total algorithm (JV3-P01) |
| P2 certified screen where admitted | Partly | 213-244, 495-518 | Positive certificate correct; unspecified class/gate boundary cases remain |
| P3 capped guidance only; AR1/stall/centre unchanged | Taken in | 246-269 | No proxy acceptance |
| P4 table then per-set prior, identity stored | Partly | 271-287 | Promoted and versioned; only the forecast scope is in dispute |
| P5 budgets against existing scheduling; loss measured | Taken in | 289-314 | Deadline decision and the provisional coexistence of separate budgets are stated |
| P6 accepted diagnostics only | Taken in | 316-323 | Mechanism and isolated factor retained; the Master time label in section 4 is a new/inherited error |
| P7 via C1/C5 | Partly | 325-360 | Correct first spike and non-multiplication; memory fallback/lock wording need precision |
| P8 | Taken in | 362-372 | Default four-worker gate; opt-in/device conditions and separately priced probe |
| P9 | Taken in | 376-377 | Full effective request and seed reservation |
| P10 | Changed meaning, authorised | 378-383, 580 | Joint report's conditional Hell 2 pack option is superseded by owner IG-P-D6: Hell 2/3 closed |
| P11 | Taken in | 384-387 | JS reference/fallback, identical units and floating-point reduction |
| C1 | Taken in, with JV3-P02 | 331-347 | Visit/dirty/mutation counters before a representation is chosen |
| C2 | Taken in | 29-30, 165, 309-314 | Withdrawn as a new mechanism |
| C3 | Taken in | 391-397 | Data-only held-out prediction first, no forecast credit |
| C4 | Taken in | 398-401 | Park implementation pending counted evidence |
| C5 | Taken in | 349-358 | Includes kill loops, after C1; composite measured once |
| Frozen preconditions / source identity | Taken in | 458-466 | New source, diagnostic offers and no old-runtime fallback |
| Independent fitting versus validation seeds | Taken in | 472-478 | 20 validation seeds; fitting data excluded |
| Frozen arms and controls | Taken in | 471-474 | Missing cells, screen/no-screen, prior, (c4), rescue, P5, Master and Nightmare controls |
| Journals | Taken in | 480-482 | Dispatch through discard, population and census share |
| Spikes/probes and separately approved diagnostics | Taken in | 471, 474 | C1/C5 precede optional memo/predictor engine work |
| Concrete priced manifest, not an old allocation | Taken in | 458-490 | Commands, limits, grace and concurrency; 5-9 h is an indication only |
| Canonical rating / AR1 / uniqueness / replay | Taken in | 64-75, 554-564 | Kept as contracts, not statistical tolerances |
| Progressive UI is not a replacement SLA | Taken in | 546-551 | Owner returns only after browser evidence |

The prior's stated training split is correct: `tools\ig-proto\data\prior-v1.json:3` and
`fit-prior.mjs:16,38-40` use MP12b1 reps **10-19**, not the measured reps 0-9.
The new disjoint validation set must also exclude all future pilot/ranker fitting seeds.

### A3. Each author answer and owner decision

| Item | Status | v3 line(s) | Assessment |
|---|---|---|---|
| IG-P-Q19 answer | Taken in, still incomplete at boundary cases | 495-518 | New statistics/thresholds faithfully copied; JV3-P03 is not a claim that the old unspecified rule should return |
| IG-P-Q20 answer | Taken in | 470-490 | Preparation, pilots, freeze, 20-seed validation, separate diagnostics, fail-at-third-miss and costed envelope |
| IG-P-Q21 answer | Taken in | 35, 55-56, 471-473 | 14x14/24x24 pilots, then conditional 20-seed validation; not offers |
| IG-P-Q22 answer | Taken in | 309-314 | P5 against existing scheduling; bounded prefetch only if justified; no new candidate universe |
| IG-P-Q23 answer | Taken in with owner qualification | 422-424, 470, 546-551 | D39 maximum versus median sensitivity; optional first-stage browser calibration follows the owner's final D7 wording |
| IG-P-Q24 answer | Taken in | 58-62, 474, 382-383 | Scope closure and data-only alternate-witness inventory |
| IG-P-D1 / Q02 | Taken in | 299-308, 575 | 115/120, fitted reserve, deterministic caps first, accepted prefix returned, lost completions measured |
| IG-P-D2 / OD-P5 | Taken in | 538, 546-551, 576 | Fold-order UI now; explicit later measured SLA only |
| IG-P-D3 / OD-P6 | Taken in | 259-269, 540, 577 | Population reports, (c4), blind comparison before offers; correct the available K evidence, not the decision |
| IG-P-D4 / OD-P7 | Taken in | 239, 578 | No screen by default <=144; no extrapolation to 10x10 |
| IG-P-D5 / OD-P8 | Taken in | 474, 579 | Separate staged PM1: inventory, Hell 1 including failed sets, then Hell 2 central share; no Hell 3 |
| IG-P-D6 / OD-P9 | Taken in | 58-62, 471-474, 580 | Closed Hell 2/3 release scope; Hell 1 candidate arms only |
| IG-P-D7 / OD-P10 | Taken in | 458-490, 581 | Price after preparation, optional browser first stage, no old balance |

For the priced manifest, name the certificate reproof/reuse receipt as an explicit admission artifact,
including the R7/overshoot/after-first-solution cases, rather than assuming old R14 numbers are a new gate.
The plan's certificate test and phase-0 condition already require it. If later PM1 data changes a prior,
return through table freeze and held-out validation; stage 5 is not permission to retune a passed table.

## B. New or remaining findings

Severity: **High** blocks safe implementation/gating; **Medium** must be fixed before the operative
manifest/contract is used; **Low** is factual/editorial cleanup.
Counts: **1 High, 4 Medium, 3 Low**.

### JV3-P01 — High — Analysis: P1's retained pseudocode does not handle its normal start

`plan.md:179-196` only gallops while the initial result is BELOW. When the prior is ABOVE or TOO_FEW,
`lo` is never assigned, yet the bisection reads it. Even a BELOW start with `hi-step < 1` skips the first
loop and reaches the same uninitialised bracket. A typical prior of four with `U0=8` is such a case.

The measured prototype already handles this:
`tools\ig-proto\variants\files\p1p5\core\engine\ig-select-proto.js:651-664` distinguishes the first result and
calls `marchDown` or `marchUp`; its bracket, endpoint and rescue handling follows. The plan's fragment is a
v1/v2 leftover, not that measured mechanism.

**Fix:** replace it by the prototype's total contract: both directions from the prior, clamped endpoints,
defined bracket state, first in-band/AR1 handling, skipped/unknown outcomes and the canonical rescue.
Do not pass an undefined bracket to the window phase. Alternatively delete this pseudocode and give that
contract plus the named prototype reference for the design task.

### JV3-P02 — Medium — Analysis: P7's memory-equivalence contract and file-lock wording

`plan.md:325-360` requires identical results but never says how the added lists/counters/buckets preserve
the memory-cap outcome. At the pinned source,
`6122dc9:core/engine/deduce.js:303-309` sums the slot table and throws when it exceeds
`limits.memoryBytes`; the canonical limit is 32 MiB. A model can fit the reference but not a larger
optimised workspace.

**Fix:** account for all real storage, and fall back to the reference before allocation if the new
representation would change the reference memory-limit outcome. Test that boundary as well as work/node
limits and the two external memory gates.

Also replace line 360's "A change of deduce.js reopens only if the rating itself changes".
The locked contract is the rating/units/caps, not a ban on the semantics-preserving source edits that P7
exists to make. Otherwise the proposal contradicts its own implementation.

### JV3-P03 — Medium — Analysis: (c5) is not yet a total, fail-closed admission rule

The new statistics are a substantial improvement, but leave:

1. **Unlisted classes:** `plan.md:235-240` has no explicit default for areas 145-195 or 325-359.
   The production board/policy API is not restricted to the named benchmark rectangles.
2. **Too few matched sets:** at 500-510 the matched-set median can have zero or very few observations even
   when both arms serve enough requests using different sets. No minimum matched population or inconclusive
   disposition is stated.
3. **Censor substitution:** "the request limit" at 507 is not named, while 308 retains two budgets until
   the pilot and P5 compares against an uncapped control. The substituted endpoint must be fixed and common;
   a failed arm must not become artificially faster than a completed control whose observed time exceeds
   that chosen endpoint.
4. **Reproducibility:** the non-regression ratio's aggregation and bootstrap recipe must be fixed in the
   manifest, not selected after validation. The faster rule states a geometric mean; the control rule does
   not repeat that definition.

**Fix / Q26:** default every unvalidated/unlisted class to no screen; return inconclusive/no screen for
insufficient matched data; specify the matched-set minimum, exact censor/deadline convention and the
predeclared aggregate/bound recipe. Keep the separately counted completion criterion.

### JV3-P04 — Medium — Derived: gamma changes meaning between P4 and section 4

`plan.md:277-280` calls gamma a factor on **Hell batch time**, learned only after calibration.
At 417-420, the formula multiplies the entire fresh request T10 by it. A per-set prior cannot save the set
calibration that produced that prior. The formula can remain a legitimate projection only if gamma is
explicitly a **combined whole-request** table-plus-per-set prior effect.

On the literal batch-only reading, use:

```text
T_mix = (T1 + gamma * (T10 - T1)) * (1 - g + g/k).
```

The preferred two-request records give median T1 6.2113 s / T10 34.2440 s on 26x26, and T1 7.1530 s /
T10 42.8880 s on 20x20. Under the same stated g/k/gamma parameters, the corrected central scenarios are
**17.4 s and 21.8 s**, not 16.7 and 20.9. The corrected ranges are **11.6-27.5** and **14.5-34.5**.
The optimistic 20x20 endpoint then also misses 13.75 s.

This is not a new measurement and not an algebra mistake in evaluating the printed formula.
It exposes an assumption already collapsed in the v2 joint sensitivity. Q25 must say which mechanism and
denominator gamma represents; do not silently credit a separate set-stage benefit.

### JV3-P05 — Medium — Measured/Derived: the Master P6 times are labelled as measured

`plan.md:437` labels 2.2/7.5 s after P6 as Measured. They are approximately historical 20-request medians
2.57/8.36 divided by paired factors about 1.18/1.12 from a different four-request cohort: a transfer
projection, not those measured after-arm medians.

`evidence\provisional\IGP-04\compare.md`, A:B, gives the actual matched medians:

- 14x14 Master: **2.37 -> 2.01 s**, four requests each.
- 26x26 Master: **10.86 -> 9.52 s**, four requests each.

**Fix:** either show those measured pairs, or keep 2.2/7.5 with a Projection label, formula and cohort
transfer assumption. The subsequent 1.3/4.6 and browser columns remain projections as well.

### JV3-P06 — Low — Derived: empirical p95 has not ceased to exist

`plan.md:442` still says "no p95 exist before the frozen round", while 513 correctly says a 20-value
nearest-rank p95 is the second-largest value. At n=2-6 the observed p95 is the maximum: weak tail evidence,
not nonexistent evidence. The same qualification applies to "no ... tail exists" at 602-603.

**Fix:** "No reliable population-tail/qualification claim follows from these small cohorts; report their
observed maxima/sample p95 with n." Do not discard observed slow outcomes.

### JV3-P07 — Low — Measured/Derived: the 14x14 Hell piece counts are already recorded

`plan.md:605-606` retains the unchecked hypothesis that half the pieces or more may be given, based on the
author's earlier suggestion of Nightmare-like K near 21. The actual four failed Hell sets in
`IGP-05\families-failed-sets.jsonl` have **K 32,34,32,34**, start count three.
Their seven eligible window observations have 11-14 clues: **34.4-43.8%**, not half.

**Fix:** use those observations. The +8 to +11 clue change remains large and still justifies showing this
cell in the blind comparison; the owner decision need not be reopened.

### JV3-P08 — Low — Analysis/Measured: historical statements remain phrased as current facts

- At 346-347, PM2 is said not to report `fewestColumn`. It does list it on 12x12 at 40.3 ms, rounded to
  0.0%; the issue is unreliable isolation under inlining, not absence.
- At 614-615, "no browser route except a service level" omits the expressly retained P10 fallback at
  378-383 and 541. Say live generation may miss, leaving the separately approved content/SLA options.
- At 58-59, the policy "offers" Hell 3 boards. At `6122dc9`, `levels.js:22-33` offers none of Hell 1-3.
  These are the **historical targeted** 480-676-cell boards, not current offers.
- "Gains are on the current source" at 146 should name the measured MP12b1 snapshot. The pinned source has
  moved code/metadata interfaces (`dispatchOrder` is now at `generate.js:638`, and `measureV3`'s capped-path
  check at `difficulty.js:312-326`). No new timing was taken at `6122dc9`.

These are small source/wording repairs, not reasons to rerun anything now.

## C. Before/after speed

The published single-formula arithmetic is correct to its displayed precision:

| Cell | Recorded search-only anchor, s | Central / low / high from the written formula, s (Derived projection) | Standing |
|---|---:|---|---|
| 14x14 Nightmare | 8.9421 | 5.444 / 4.260 / 7.188 | Matches 5.4 [4.3-7.2] |
| 15x15b10 Nightmare | 8.4458 | 5.142 / 4.023 / 6.789 | Matches 5.1 [4.0-6.8] |
| 12x12 Nightmare, no screen | 16.465 | 10.024 / 7.843 / 13.235 | Matches 10.0 [7.8-13.2] |
| 26x26 Nightmare, 190 M | 11.9378 | 7.268 / 5.687 / 9.596 | Matches; not the unmeasured no-screen default |
| 10x10 Nightmare | 24.0432, today's search only | 14.638 / 11.453 / 19.327 | Kernel-only sensitivity, not a measured gen-v4 request |
| Hell 1 26x26 | 34.2440 | 16.679 / 10.603 / 27.527 | Correct only for whole-request gamma; see below |
| Hell 1 20x20 | 42.8880 | 20.889 / 13.280 / 34.475 | Same caveat |

Parameters: central multiplier without gamma is `0.05+0.95/1.7`; fast `0.04+0.96/2.2`;
slow `0.15+0.85/1.3`. Hell uses gamma 0.8/0.65/1.0 respectively.
They remain assumptions, not measurements of C1/P11 or a validated composition.

### Corrections/changes relative to the v2 summaries

| Issue | Correct statement and basis |
|---|---|
| P6 Master "Measured" 2.2/7.5 | Relabel as Projection, or show actual A:B measured pairs 2.37->2.01 and 10.86->9.52, n=4. No new timing occurred |
| Hell gamma is batch-only as P4 says | 26x26 central **17.435**, range **11.639-27.527**; 20x20 central **21.760**, range **14.472-34.475**, using recorded T1 and T10 per the formula in JV3-P04 |
| Browser illustration under batch-only gamma | Central **74.7 / 92.0 s**, optimistic **51.6 / 62.9 s** for 26x26/20x20. Still not D39 or a browser measurement |
| Whole-request gamma alternative | Keep the old 16.7/20.9 only by explicitly pricing both set/table and batch/per-set effects in gamma; do not attribute both to the per-set mechanism |
| Other rows and unpriced populations | No measured value moved. 16x16, 15x20 and 18x18-24x24 remain unpriced; no screened 26x26 gain is silently transferred to its default |

The two Hell cohorts have n=2, so the median equals the arithmetic mean and the constant-factor
T1/batch decomposition above is exact for this sensitivity. With larger cohorts, transform each paired
request first rather than combine unrelated marginal medians.

## D. Questions and decisions

### IG-P-Q25: Is gamma a batch-only or a whole-request prior effect?

**Context:** JV3-P04; P4 and the time table currently use different denominators.

**Question:** Is the sensitivity meant for only the new per-set calibration prior, or for a separately
assumed combination of a better set-stage table prior and the batch's per-set prior?

**Options:** (a) Per-set/batch only: use `T1 + gamma*(T10-T1)` and the corrected times.
(b) Combined effect: name separate set/batch assumptions, then derive a whole-request gamma; price and
measure the two mechanisms separately.

**Recommendation:** (a) is the conservative reading of the proposed per-set arm. (b) is acceptable only as
an explicit additional projection, never an observed saving.

### IG-P-Q26: What makes an incomplete (c5) comparison inadmissible?

**Context:** JV3-P03; the rule specifies the central statistic but not its insufficient-data/censor cases.

**Question:** What minimum matched-set population is required, which common request limit supplies a
failed T10, and what is the disposition for unlisted/unvalidated classes or too few matched sets?

**Options:** (a) Fail closed to no screen/inconclusive, with a predeclared matched minimum, common censor
endpoint and aggregate/bootstrap recipe in the manifest. (b) A weaker exploratory rule, labelled as a pilot
and never used for default enablement.

**Recommendation:** (a). Keep all unmatched/failed outcomes in the completion record. Do not repair an
empty median or a failed comparison after validation by choosing a convenient convention.

**New owner decisions: none.** D1-D7 already decide the policy. Their future numerical manifest,
reserve/enablement and offer/SLA receipts remain necessary, but are not new choices to reopen here.

## E. Pruning proposal

No file is deleted or companion edited now. Use **`8d795f8:<repository-relative path>`** as the archive
reference for present companion versions; the old plans are at `555197b` (v1) and `240398f` (v2).

### E1. Companion files

| File/group | Keep / delete / trim | Reason |
|---|---|---|
| `report.md` | **Keep; trim metadata/active links** | Executed tasks and R00-R33 still cite the original forecast, formulas and errata. It is not the current delivery estimate; pin its Plan link |
| `plan-v2-joint-report.md` | **Keep** | V3 cites all 22 corrections, the R4 proof, forecast assumptions and scope; author/owner answers explicitly depend on it |
| Both `1-analysis.md` files | **Keep for now** | Detailed count-curve, work/census and compatibility derivations remain inputs to the kept report/clarifications |
| Both `1-speed-summary.md` files | **Delete after the link fixes below** | Duplicate superseded tables, no unique binding decision/measurement; their detailed sources remain |
| Both `2-cross-review.md` files | **Keep** | The accepted summary, checklist and `summary.mjs` explicitly cite their derivations, including R29's corrected provenance |
| Both `3-plan-v2-analysis.md` files | **Keep** | In particular Astra's per-level/area correlations, near-band checks and scheduling decomposition are not all reproduced in v3 |
| Both `4-cross-review-of-plan-v2-analysis.md` files | **Keep** | Source settlements and corrected assertions support the joint report |
| `clarifications.md`: all numbered questions/answers, owner choices and conditions | **Keep** | The owner approved the conditions in the author answers, not only the short summary rows |
| `clarifications.md:982-995` (v2 summary) | **Trim to one archive pointer** | Superseded narrative and "open" decisions now answered |
| `clarifications.md:1016-1040` (old open/later-round status lists) | **Trim to a dated historical pointer** | "Unanswered" Q17/Q18 and pending decisions are stale. Keep the closure accounting and actual frozen-precondition record |
| `clarifications.md:1339` heading | **Trim wording only** | Rename "Pending owner decisions" as historical positions before approval; never delete the condition-bearing answers below it |
| `evidence\` | **Keep all recorded packages** | Before/after journals, compare/compare-r2, verifications, PM4 profiles, PM1 families/discoveries, PM2 and the summary are records. No disposable working draft was identified |
| `tasks\improve-generating\*` | **Keep as the executed pack** | The approved populations, guards, gate rules and closure/sign-off explain what ran. They are not v3's new manifest |

Do not edit recorded evidence to make its old references point at a new interpretation.
The task file's original "Not started" header is not a reason to delete it: the execution/acceptance ledger
in the checklist and the evidence determine its historical status.

### E2. Link fixes

| Referrer | Required change |
|---|---|
| `report.md:8` | Replace both live speed-summary links with each full path at `8d795f8` |
| `claude-opus-5.5\2-cross-review.md:3-4` | Qualify both reviewed speed-summary references with their archived revisions |
| `gpt-6-astra\2-cross-review.md:5` | Qualify its speed-summary reference likewise |
| `report.md:5` | Its Plan reference is the historical v1 plan at `555197b`, not current `plan.md` |
| Proposed trimmed clarification summaries | Keep their headings if linked, and replace only the body by the precise section at `8d795f8` plus the current answer/decision pointer |

A committed-tree scan found no speed-summary references inside the evidence tree and no external
Markdown/script references beyond the listed old report/reviews. No harness reader opens these summaries.
In contrast, keep the 2-cross-review files: `evidence\provisional\summary.md:13`,
`tasks\improve-generating\check-list.md:21-22,226-227,269`, `clarifications.md:1086` and
`tools\ig-proto\summary.mjs:82` name them for substance.

### E3. Remnants inside the current plan

| Exact v3 passage | Action | Proposed cut / retained substance |
|---|---|---|
| 3-8 | **Trim** | One revision sentence plus authority links; the old-commit narrative need not occupy the active introduction |
| 25-47, section 0 | **Delete or reduce to a short current overview** | The operative scope, owner choices, protocol and formula are already in sections 1, 3-7. This is a changelog |
| 102-104, old estimate comparison only | **Trim** | Keep the measured percentages and "profile time, not critical path"; remove comparisons to superseded v1 broad/per-cell forecast ranges |
| 122-123 | **Trim** | Replace "intrinsically dear ... cannot be removed" by the current requirement that every accepted puzzle gets canonical rating. P7 can reduce physical cost while preserving virtual units |
| 179-196 | **Delete/replace, not preserve as history** | The broken old pseudocode is JV3-P01. Give the complete bidirectional contract and prototype anchor, or leave detailed pseudocode to design |
| 208-209, withdrawal narrative | **Trim** | Keep actual whole-call counts and no established request-level bound; omit the quoted old "three to four / 2 to 3" slogan |
| 520-531, provisional task-history table | **Trim to one evidence-index paragraph** | All substantive measured rows remain in the cited immutable summary; this is not a current run manifest |
| 58-75, 213-314, 458-518, 566-598 | **Keep, with the findings fixed** | Scope exclusions, certificate, budget/acceptance, priced stages and actual decision status affect what is built and gated |
| 614-615 | **Trim/correct** | Keep the risk that live generation misses; remove the obsolete "only service level" assertion that contradicts P10 |
| 620-622, historical example comparison | **Trim** | Keep the non-monotone/small-step risk and named pilot populations, not the old K<12 argument or a claim that K>=17 proves no large score jump |

Before removing a section anchor, repoint any incoming current link to its operative replacement.
No proposed cut removes a measurement, owner condition, gate, executed-task contract or source proof.
