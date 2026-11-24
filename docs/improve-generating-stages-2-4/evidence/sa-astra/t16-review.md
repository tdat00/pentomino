# T16 review: final verdict and owner decision

Reviewer: SA-Astra. Base supplied by the orchestrator: `02ade1e`. Reviewed:
`docs/improve-generating-stages-2-4/stage4-report.md`, dated 2026-11-24.

**Disposition: corrections requested; do not sign yet.** The recorded FAIL, the numerical results and the
provisional recommendation (a) stand. I agree with F2-F7's no-change dispositions, subject to the evidence
qualifications below. No correction requires a new run, a refit or a different owner decision. F1 remains the
owner's decision, with phase 2 blocked.

## What I independently verified

Command, from the repository root:

```
node docs\improve-generating-stages-2-4\evidence\sa-astra\t16-review-checks.mjs --label frozen
```

The script and its `.json` retain the inputs, raw and LF-normalized hashes, computations and assertions. The
validation transcript is `t16-review-validation.txt`. These are unlocked reads and pure arithmetic; no generator,
rating, replay, tree build or measured run was executed.

- 1,500 unique valid publications; 19 comparator cells, 380 matched request pairs. The classes, failing cells,
  controls, Master identities and Hell 1 reports are unchanged from the selection record. All ten control
  lower bounds and the Master timing table recompute correctly.
- The final line is exactly `Phase 0: FAIL (control 26x26-nightmare: fail)`. 26x26's geometric mean and lower
  bound are `1.0006219645915206` and `0.886429539656821`. The information-only uncapped comparison gives
  `1.0151137936276584` and `0.8987118517173951`.
- Every P5 record recomputes exactly: zero false stops, unknown pairs and unexpected rows; the two lost
  completions are 14x14 Hell 1 reps 26 and 38. Their bounded rows end `time-limit`; the twins' tenths occur at
  129,370.2097 and 119,751.0061 ms. Neither has a recorded budget stop.
- The reserve cut is rep 33 on both bounded arms, at about 46,009 ms with zero puzzles. Its twin takes
  52,020.2376 ms for the set and serves five, not ten. Thus it is not a lost completion.
- No published response of the two bounded arms exceeds 120 s. The current live binding passes; its ten
  real rows span 5,586.6039-41,240.8602 ms, set stages at most 18,105.6351 ms, with 25/25 coverage.
- All 12,190 N-V4-17 inputs remain byte-identical. An independent raw-call scan reproduces the no-window,
  bound and budget counts, including the absence of a natural set-bound firing. No recorded primitive begins
  at or above its call budget; no terminated call's completed prefix reaches that budget.
- The largest recorded completed-primitive prefixes are 8,386,091,443 units on Nightmare and
  23,082,265,826 on Hell 1. Both maxima are ended calls; these are not upper bounds on an unfinished primitive.
- The full population recomputes exactly: median clue share rises on nine controls and is equal on one;
  median score position rises/equal/falls on 2/5/3; census-estimated share rises on one and falls on nine.
- All 207 logged invocations pass their recorded task and round caps, with exit 0 and no kill. The account
  is 52,184.597 logged seconds plus the separately ruled 87.4 off-log seconds: 871.19995 of 1,725 minutes.
- The 40-fresh-pair row-time proxy is 27.5847333 minutes, not a fully priced or approved study.

## T16-R1 (P2): keep the observed timing difference separate from causal attribution

Locations: summary 4; section 7.1; option (a)'s re-reading; the 26x26 paragraph and option (a) in the owner's
question.

The uncapped comparison supports the persistence of the slow-seed pattern, not a decomposition of all timing
costs. Its reciprocal mean difference is 1.4483%, but this is not isolated P5 overhead. The uncapped code retains
metering and budget comparisons with an infinite budget (`tools/ig-proto/variants/files/v4/core/engine/ig-select-v4.js`,
lines 404-425). Nor does a point estimate of 1.0006 establish parity or the absence of a possible gain.

There is stronger direct evidence for the slowest seed than the note currently cites. I read rep 21's set attempt
0 on today's arm, the bounded arm and its twin. Today's two completed rating profiles consume 522,672,460 units;
the bounded arm and twin each have the same 13 profile classifications and work totals, consuming 5,606,363,111
units (10.73 times as much). The v4 prior starts at four clues instead of the legacy five. Their call times are
25,258.130 and 25,443.086 ms against 2,277.016 ms today. This demonstrates extra search work on that seed,
without claiming that every timing difference is free of noise or attributing it to the prior alone.

Exact replacements:

1. Replace summary item 4 with:

```
4. 26x26 Nightmare: point estimates near parity (1.0006), lower bound 0.8864. The uncapped twin repeats the slow-seed
   pattern and has an information-only lower bound of 0.8987, still below 0.9; neither establishes non-inferiority [V].
```

2. Replace section 7.1's **The uncapped twin** bullet with:

```
- **The uncapped twin**, which disables the call-budget threshold, bound and live deadline, is close to the shipped
  arm on these seeds. Its capped T10 divided by the shipped arm's ranges from 0.9475 to 1.0082, with geometric mean
  0.9857. Equivalently, the bounded run is 1.45% longer at the geometric mean, at most 5.54% longer on a seed. This
  is the observed configuration difference, not isolated P5 overhead: timing can vary between runs, and the twin
  retains the metering and budget-check code.
```

3. Replace all four bullets under section 7.1's **Reading [A]** with:

```
- **Removing the thresholds did not establish non-inferiority.** The information-only lower bound remains 0.8987.
  No call-budget stop, set bound, reserve cut or generation stop acted on these 20 bounded requests. The diagnostic
  does not support changing the frozen limits as a remedy, and it does not replace the original control gate.
- **The slow-seed pattern repeats, and rep 21 has direct work evidence.** Its first set attempt has 13 completed
  rating profiles and 5,606,363,111 work units on both the bounded arm and twin, against two profiles and
  522,672,460 units today. This is extra observed search work, not merely a clock difference. It does not exclude
  all timing variation or isolate the cost of each mechanism. Source: SA-Astra's `t16-review-checks.json`,
  `cell26.rep21SetCall` (the raw paths and hashes are indexed there).
- **These data do not establish a speed gain on 26x26 Nightmare.** The point estimates are near parity: median
  15.8 s against 15.5 s today, p95 26.2 s against 26.4 s, with several substantially slower seeds.
- **The point estimates do not prove equivalence.** The FAIL stands, as `s06-reading.md` section 3 explains.
```

4. In option (a)'s table row, replace only the **Re-read with the final record and P5** cell with:

```
still recommended: disabling the thresholds does not establish non-inferiority, and these data establish no speed
gain on this board; the exception would preserve today's behaviour without changing the recorded FAIL
```

5. Replace the owner's 26x26 bullet with:

```
> - **26x26 Nightmare fails the no-regression criterion.** The point estimate is near parity (1.0006; median 15.8 s
>   against 15.5 s today), but the agreed one-sided 90% lower bound is 0.886, below 0.9. The uncapped twin repeats
>   the slow-seed pattern and has an information-only lower bound of 0.899, also below 0.9. It does not change the
>   FAIL or establish non-inferiority, and the comparison does not isolate P5's runtime cost.
```

In the owner's option (a), replace `where the new search showed no gain` with
`where these data establish no speed gain`.

## T16-R2 (P2): do not predict the confirmatory study's answer or approve its unpriced execution

Locations: section 7.2 options (b) and (d), and their counterparts in section 7.3.

The rows contain substantial search-work variation, but cannot determine what a fresh study will conclude.
`At best ... "not worse", with no gain` is not an evidence-supported limit on its possible result. The current
owner choice should commission a separately specified and priced design, not itself authorize a closed-window,
unpriced run. This follows R-P24-19's existing boundary; it is not a new approval requirement.

Replace the complete option (b) row with:

```
| (b) Commission an independent confirmatory-study plan | propose a new task on fresh seed pairs, with its cohort, error control and stopping rules fixed before results are read; do not silently pool the failed 20. The complete plan and price need separate owner approval before any run | for an illustrative 40 fresh pairs, about 28 counted minutes is a linear row-time proxy from `V4-S4` (412.070 and 415.472 s per 20 rows per arm), excluding the new manifest, proofs and guard; the harness window is closed | it could establish non-inferiority, find a regression or remain inconclusive. The present near-parity estimates and wide spread do not determine its result or prove that a gain is impossible | not recommended now: extra scope and cost, with no established gain on this board in the current data |
```

Replace the owner's option (b) with:

```
> - **(b) Commission an independent confirmatory-study plan for 26x26 Nightmare.** It would use fresh seeds, with
>   its rules fixed before results are read. For an illustrative 40 fresh pairs, about 28 counted minutes is a
>   row-time proxy only; the complete plan, proofs and guard must be priced and approved separately before a run.
>   Phase 2 stays blocked pending the study and a recorded decision. The result could establish non-inferiority,
>   find a regression or remain inconclusive. Not recommended now: extra scope and cost, with no established gain
>   on this board in the current data.
```

In option (d)'s table row, replace `accept the failure as noise` with:

```
accept the risk despite non-inferiority not being established; the original FAIL remains recorded
```

Replace the owner's option (d) with:

```
> - **(d) Waive the 0.9 bound for 26x26.** Not recommended: it changes an agreed gate after seeing the result.
>   An explicit exception accepts the risk; it neither proves the failure was noise nor changes the recorded FAIL.
```

## T16-R3 (P2): separate controlled tests, real-request reach and recorded work

Locations: section 3's testing and budget bullets, F2/F4/F7, and section 8's N-V4-16 obligation.

`fr-frozen-nowindow-test.json` explicitly injects synthetic ratings (score 30). It is a real worker transport test,
not an observed natural no-window request. Likewise no real re-rating path was exercised. The measured maximum
work is a completed-primitive prefix: a terminated call may have an unfinished primitive whose consumed work is
not exact. These qualifications do not change any frozen value or the no-change dispositions.

Replace section 3's **What still proves the bound** bullet with:

```
- **Controlled coverage, not a natural firing.** T08c's `fr-frozen-nowindow-test` uses real workers with synthetic
  ratings to exercise the bound's transport; T07b also uses scripted pools. These tests cover the implementation
  under controlled inputs. Stages 2 and 4 provide no observed natural no-window firing.
```

Replace section 3's **No budget stop** bullet with:

```
- **No recorded budget stop.** The largest recorded completed-primitive call-work prefix is 8.39 G against the
  10 G `any` budget on Nightmare (18x18, `fr-frozen-none` and its twin) and 23.08 G against 40 G on Hell 1
  (14x14 Hell 1, all three arms). Both maxima are ended calls. For terminated calls an unfinished primitive's
  consumed work is not known exactly; these maxima are not upper bounds on all consumed work or future calls.
```

Replace the complete F2, F4 and F7 rows with:

```
| F2 | N-V4-16: no observed natural set call ended without a window, so the bound and glue were unexercised in stages 2 and 4 | no change to the frozen values. N-V4-16 stays open for the phase-2 pack: retain the real-worker test with synthetic ratings and report natural bound-condition matches, firings and `set:no-window-*` rows per cell. If none occur, report the path as still unexercised; do not turn zero firings into a real-data pass |
| F4 | No recorded call-budget stop; the largest completed-primitive call-work prefix on Nightmare is 8.39 G, about 84% of its 10 G `any` budget (18x18); unfinished-primitive work is not exact | no change (the values are frozen and no class is refitted on validation seeds). Phase 2's validation reports budget stops per cell; N-V4-15 measures `require` on the largest boards first |
| F7 | N-V4-17 (section 4): every start's `W`, table prior and Hell 1 per-set prior matches the freeze, with 0 mismatches; (c4) and the close never ran; rescue and tail re-rating never ran either | no change. Re-rating has controlled test coverage, but its path on real requests is unobserved here; no real-row correctness or benefit is inferred from zero reach. Phase 2's validation reports re-rating reach per cell, including zero if it remains unexercised |
```

Replace section 8, item 3's `N-V4-16's first real firing read (F2)` bullet with:

```
   - N-V4-16's per-cell bound/glue reach report and a reading of any natural firing observed; if none occurs, keep
     its real-data coverage explicitly open (F2);
   - the per-cell rescue and tail re-rating reach report, including unexercised paths (F7).
```

F3, F5 and F6 need no different ruling. F3's reserve cut is the same rep on each bounded arm, as section 2 already
states; the two lost completions are the 115-s generation-stop cases, not the reserve cut.

## T16-R4 (P3): qualify the logged invocations and remove the already-fixed log issue

Locations: section 5's first **Every run stayed inside its approval** bullet, off-log bullet and last paragraph.

The existing ruling at `tasks/improve-generating-stages-2-4/check-list.md:527` records an externally killed
`V4-S2` invocation. Thus 207 is the logged population, not every invocation of the entire round.
`S06-run-v4-s4.md:159` already has the corrected eight-step count at the supplied base.

Replace the first bullet with:

```
- All 207 logged invocations have exit 0, `killed` false and a `go` decision, and every task stayed within its
  lock cap (`taskCapS`). This excludes the earlier externally killed `V4-S2` invocation, whose 87.4 s are
  accounted separately off-log under the ruling of 2026-11-23.
```

Replace the off-log bullet with:

```
- V4-S2's externally killed `parity-fr-base` invocation contributes 87.4 s off-log; it was archived and reobserved
  under the ruling of 2026-11-23 (the check-list's register).
```

Replace the final **A note for the orchestrator's log** paragraph with:

```
S06's execution log was corrected at `02ade1e`: eight steps took more than one invocation, six taking two and the
two 14x14 Hell 1 steps taking three. The records and the corrected log agree on 94 invocations for 84 locked steps.
```

## T16-R5 (P3): keep the row denominators and gate/report distinction explicit

Locations: summary 2; section 1's record bullets; sections 1.4 and 2; section 7's opening; the owner's deadline
bullet.

There are 19 comparator cells and 380 request pairs. The 1,120 declared count is the initial collection's field,
not the total declaration after its 380 comparator rows. Of the 840 bounded-arm rows, 760 exercise the new
deadline and 80 are unchanged legacy Master context. B5 is reported, not a pass/fail admission gate.

Exact replacements:

1. Summary item 2:

```
2. Other applicable gates pass (B2: nine controls, all 16 Master identities); B5 is reported. No response exceeds
   120 s (760 new-deadline and 80 legacy rows); account 871.2 of 1,725 counted minutes [V].
```

2. Section 1's two count bullets:

```
- Five arms, 99 runs files, 19 comparator cells and 380 matched request pairs.
- The initial collection declares 1,120 rows (`collection.declared`); `V4-S4C` declares another 380. All 1,500
  are published, with 0 missing.
```

3. Replace section 1.4's final population bullet:

```
- The failing boards and Hell 1 have no today's arm in this round (S4-6 was skipped at S05), so no comparison to a
  legacy baseline is available there. Their measured screen, no-screen and declared uncapped populations are
  listed side by side per cell in `t16-verdicts.md`.
```

4. Immediately after section 2's deadline table, add:

```
Of these 840 rows, 760 use the frozen v4 deadline. The other 80 are `fr-frozen`'s unchanged legacy Master rows,
included as context rather than evidence of the new deadline's implementation.
```

5. Replace section 7's opening paragraph:

```
**Phase 0: FAIL**, on the single item `control 26x26-nightmare`. The other applicable gates pass; B5's outcomes
are reported. Ruling R-P24-19 keeps the original FAIL; it is not recomputed on a reduced control set. Phase 2
stays blocked until the 26x26 decision is recorded and its gates are specified. Phase 1 needs its own checks,
not phase 0's gate (plan v4 section 6).
```

6. Replace the owner's deadline/P5 bullet:

```
> - No response exceeds 120 s: 760 requests exercised the new deadline, and 80 legacy Master requests were also
>   below 120 s. The paired comparison finds no lost completion on 18 of 19 cells. On 14x14 Hell 1, which is not a
>   candidate (10 of 20), the 115-s stop cut two requests whose uncapped twins finished later.
```

The five findings above leave all recorded verdicts, selections, freeze values, the candidate set, the account
and the provisional legacy-route recommendation unchanged. They make the evidence and the owner's approval
boundary precise before the joint signature and relay.
