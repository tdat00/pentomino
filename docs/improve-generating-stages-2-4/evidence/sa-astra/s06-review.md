# SA-Astra: review of the S06 reading and R-P24-19

Base: `96f231e`. **Changes requested: three related corrections below.**

I agree that the recorded FAIL stands, recommend seeking approval for the unchanged S07
collection now, and agree to bring the 26x26 decision to T16. Keeping the legacy route on
26x26 is a reasonable **provisional option**, not an accepted production configuration.
The owner's text currently misstates the statistical guarantee, and parts of the retest
and continuation proposals need correction. I have not signed the note.

## Verified evidence

From the records, with no engine run:

- All 1,120 declared rows are present, unique, correctly identified and valid in the
  80 manifest-bound publications; the four current `V4-S4P` bindings pass.
- Recomputed all ten controls, including every complete control-gate result, and
  independently reproduced the bootstrap recipe (10,000 resamples, seed 20261116).
  Exactly one control fails: 26x26 Nightmare.
- Recomputed all five class speed statistics. Checked the recorded work intervals
  against the work-rule predicate: only `n-mid` proves non-worsening. The other
  class decisions and the selected arms are as reported. No new class is admitted.
- The 16 Master identity results reproduce. The five failing Nightmare cells have
  20/20 completions; their stored dead-end counts are zero. Hell 1 14x14 has 10/20,
  while the other three Hell 1 cells have 20/20. Hell 1 remains reported, not gated.
- 26x26: geometric mean **1.0006219646**, lower bound **0.8864295397**,
  log SD **0.4386138495**. All reported slow-seed timings reproduce, including
  rep 21's **set-stage** times 25.418815 s versus 2.439026 s.
- Under the explicitly conditional normal model described below:
  the illustrative 20-pair threshold is **1.0205431817** and the fresh-20-pair
  passing probability at true geometric-mean parity is **0.4178732693**.
  The analogous fresh-40-pair value is **0.5939186933**.
- S06 used 28,043.391 counted seconds; the account is **710.03065 minutes**.
  S07 still declares **19 cells / 380 comparator rows**, guard **732.021379 minutes**,
  minimum cumulative cap **1,443**, within the active **1,725** grant.

The code confirms that completing comparators cannot turn this unchanged control failure
into a pass: `verdicts.mjs:1530-1613` checks failures before pending comparisons, and
`selectionChanges`/`finalPhase0` (`:1813-1841`) forbid a final-purpose record silently
changing the selected arms.

## S06-R1: distinguish a failed aggregate criterion from a per-request guarantee or proof of parity

The owner's text says the test proves the generator is **"never more than 10% slower"**.
That is not its meaning. The gate is a one-sided 90% bootstrap lower bound on the
**geometric mean of paired capped-T10 ratios**, at least 0.9. It is not a worst-case
or per-request guarantee; nor does a point estimate near one establish equivalence.

The ~1.02 and ~42% arithmetic is correct under a normal approximation with a fixed SD.
It is not the exact power or a deterministic mean cutoff of the actual bootstrap test.
The SD is estimated from these same 20 observations, and the full log-ratio shape matters.

### Exact changes to `s06-reading.md`

Replace Summary item 3 with:

> **26x26 Nightmare has point estimates near parity, but has not established the
> required non-inferiority** [V]. The paired capped-T10 geometric-mean ratio is
> 1.0006; median T10 is 15.8 s against 15.5 s today, and p95 is 26.2 s against
> 26.4 s. The recorded one-sided 90% lower bound is 0.8864, below 0.9, so this
> sample fails the predeclared aggregate criterion. These summaries neither prove
> equivalence nor rule out a material regression.

In section 3, name the timing columns `Capped-T10 p95 today / shipped (s)` and
`Approximate mean needed at this SD [A]`. Replace the paragraph defining the latter with:

> **Illustration only [A]:** suppose independent log-ratios are normal and their
> population SD is fixed at the observed sample SD `s`. Approximating the lower
> bound by `GM x exp(-1.2816 s / sqrt(n))` gives an illustrative threshold
> `0.9 x exp(1.2816 s / sqrt(n))`. For 26x26 and `n = 20`, it is 1.02054.
> If the true geometric mean were exactly one, this model gives a passing probability
> of about 41.79% across fresh 20-pair experiments. These are plug-in, model-dependent
> calculations, not measured probabilities, the exact power of the frozen bootstrap
> rule, or a reason to change its threshold.

Replace the first two bullets under `Regression or noise` with:

> - **Point estimates near parity, not established parity.** The geometric mean,
>   median and p95 are descriptive summaries. The required lower-bound criterion
>   failed; the data do not establish non-inferiority.
> - **Uncertainty matters.** The normal-model illustration above helps explain why
>   a near-one point estimate can fail the criterion. It does not show that the
>   failure is merely noise, or that every 20-pair sample with this spread must fail.

In the next bullet, replace `rep 21's first, set-stage call` with
`rep 21's set stage`; these numbers come from `igSetMs`, not a timed individual call.
Throughout the owner-facing summary, say that **nine controls pass the no-regression
criterion, with measured point ratios of 1.054-2.089**, rather than implying all nine
have statistically established speed gains.

## S06-R2: a second look on 20 old plus 20 new seeds is not the unchanged predeclared test

Section 4 option (2) proposes pooling this failed 20-pair sample with another 20 and
applying the same bound, claiming nothing changes if it passes. That changes the
sample-size/stopping decision after seeing the result. Calling the extension
"pre-registered" from now does not make it the original predeclared 20-seed gate.
The failed result must remain, and a confirmatory design must state how the earlier
look and any repeated testing are handled.

The quoted ~60% is for a **fresh 40-pair experiment** under the fixed-SD normal model,
not the stated conditional extension of this observed sample. Even that simplified
model gives about **63.4%**, not 59.4%, when these particular 20 observations are held
fixed and only the next 20 are random. Neither figure validates an adaptive retest.

**Replace section 4's option (2) row with:**

> | (2) Commission an independent confirmatory study | a new, separately approved design using untouched seed pairs; 40 fresh pairs is one possible scope. Before any new result is read, the SAs specify the cohort, acceptance/error-control and stopping rules, and how the existing failed study is treated. Do not silently pool the failed 20 with another 20 and call the result the unchanged original gate | new task/manifest, priced before the owner's approval | a new evidence/admission decision; the original Phase 0 FAIL remains recorded. The ~59.4% fresh-40 normal-model illustration is not a forecast or the probability of the proposed old-plus-new extension | not recommended as an immediate action; no new run is proposed now |

This does not prescribe or approve a new experiment in the present round.

## S06-R3: scope S07 as measurement, preserve the production/offer gates, and correct the deferred path

The recommendation to finish the declared comparisons is reasonable. Its justification
must not assume that the other 18 boards **will ship** or that all production depends
on S07. Four cells are Hell 1 candidates, including 14x14 which just failed its 18/20
candidate count. Offers remain behind phase 3's landscape/browser/play/owner gates.
Phase 1's P6/progressive-presentation path is independent of phase 0's completion gate
(`plan v4` section 6).

The fallback is a proposed change requiring the owner's recorded decision and a later
implementation/validation pack. It is not regression-free merely because a future
implementation intends to call the old generator: routing, timers, versions, replay
and history still need to retain the intended legacy semantics.

Also, postponing S07 does **not necessarily require re-activation and new proofs**.
The compiled plan already exists and names the existing activation and selection as
prerequisites (`plans/V4-S4C.json:1-37`). If their identities remain valid, the same
plan can be run later after approval and cap re-read. Do not imply it must be
recompiled or activated again.

### Exact changes to `s06-reading.md`

Replace Summary items 4-5 with:

> 4. **Phase 2 remains blocked pending a recorded decision.** A provisional recommendation
>    for T16 is a legacy route for 26x26 Nightmare, with the remaining `gen-v4` scope
>    considered against the complete evidence. This does not change the recorded FAIL,
>    approve production, refit a class, or change any offer. A chosen exception needs the
>    owner's confirmation and its own implementation, compatibility/replay checks and
>    repeated production validation [A].
> 5. **Recommend asking approval for S07 now.** It completes the predeclared P5 comparisons
>    on all 19 cells and, on successful completion, writes the final-purpose verdict
>    and closes the harness window. The results inform later decisions; they do not
>    presume that all 18 other boards will be offered or deployed [A].

Replace option (1)'s row with:

> | (1) Propose a legacy route for 26x26 Nightmare | retain the intended legacy behavior for that board while considering the remaining `gen-v4` scope under the unchanged class verdicts; no current record or class is reclassified | no additional experiment proposed in this frozen round; implementation, compatibility/replay checks, N-V4-15 and repeated production validation require their own pack and allowance | an explicit owner-confirmed scope/admission decision before phase 2 may proceed; Hell 1 offers and qualification gates are unchanged | provisional recommendation for T16: conservative retention of existing behavior where the required non-inferiority evidence is absent |

In option (5), replace `nothing goes to production` with
`gen-v4/phase 2 does not proceed; phase 1 remains subject to its separate gates`.

Replace section 5's four `Whether the failure makes it wasteful` bullets with:

> - **Value of completing S07.** The declared comparisons quantify P5's effects and
>   complete the round's final-purpose evidence. They are relevant to any later
>   proposal to continue `gen-v4`, without presuming approval of that proposal.
> - **The scope stays fixed.** All 19 cells remain in the compiled plan, including
>   26x26 Nightmare. S07 does not test or authorize a proposed legacy-routing exception
>   and cannot turn the unchanged 26x26 control result into a pass.
> - **If deferred.** Preserve the plan, activation, selection, proof bindings and run
>   records. If their identities remain valid, S07 can run later after scope approval
>   and a cap re-read. A new approved epoch/scope or invalidated binding may require
>   new work; postponement alone does not require re-activation or new proofs.
> - **If the round is reported without S07.** T16 reports the selection-purpose FAIL
>   and the unmeasured comparisons. It must not invent a final-purpose record, report
>   zero P5 cost, or silently close D-V4-20's window. Any alternative closure needs a
>   separate recorded ruling. Phase 1 remains separate from the blocked phase-2 route.

### Replace section 6's owner question

> **Stage 4's first collection has finished.**
> - All five failing Nightmare boards reached ten on 20/20 requests.
> - All 16 Master boards gave identical puzzles.
> - Nine of ten Nightmare controls pass the no-regression criterion; their measured
>   geometric-mean ratios range from 1.054 to 2.089.
>
> On 26x26 Nightmare the point estimate is near parity (1.0006), but the agreed
> one-sided 90% lower bound for the paired capped-time ratio is 0.8864, below 0.9.
> This is an aggregate comparison, not a guarantee about every request. Phase 0
> therefore remains **FAIL**, and phase 2 remains blocked pending a decision.
> The other recorded results stand.
>
> The SAs will bring the 26x26 options with T16's report. A legacy route on that
> board is their provisional recommendation, not an approved change. No production
> rollout or change to Hell 1 offers is authorized by this question.
>
> **Decision now: approve the remaining frozen-round measurement?**
> S07 measures all 19 declared cells (380 requests) on the selected uncapped twins:
> without the new call budget, same-side attempt bound and shared deadline. The
> other engine limits remain. This quantifies the limits' effects and produces the
> final-purpose record; it cannot erase the existing control failure.
> The timing proxy is 170-183 counted minutes, the formal guard 732.02 minutes,
> and the minimum cumulative cap 1,443, within your active grant of 1,725.
>
> - **(a) Approve S07 now (recommended).** Complete the declared comparisons and,
>   on successful finalization, close the measurement window. This approves the
>   measurement only, not a 26x26 exception or phase-2 deployment.
> - **(b) Do not start S07 now.** Preserve the existing evidence and FAIL.
>   T16 can report the selection-purpose result with P5 comparisons unmeasured.
>   The harness window remains protected until normal finalization or a separately
>   authorized alternative closure;
>   postponement alone does not discard the current plan or bindings.

### Align the S07/T16 amendments and R-P24-19

In S07 step 2, replace the last clause beginning `its recommendation (a) resting` with:

> its recommendation (a) resting on completion of the predeclared comparisons and
> final-purpose evidence, not on assumed deployment of the other boards. Approval
> of S07 is measurement approval only; the recorded FAIL and phase-2 block remain.

In T16's Authority paragraph describing the S06 recommendation, use:

> The legacy route is a provisional option to be reconsidered with the final record
> and P5 results, not an accepted production configuration. Any owner-approved
> exception must state its scope and remaining implementation, compatibility/replay,
> N-V4-15 and production-validation gates. Current class selections, the recorded
> FAIL and Hell 1 offer/qualification rules remain unchanged.

Add to T16 step 1:

> Without S07, the selection record's empty `p5` array means **not measured**, not
> zero false stops or lost completions. List the 19 resolved comparator cells as
> unmeasured/unknown (380 uncapped rows if none ran). Do not claim a `V4-S4F`
> final-purpose record or a closed harness window. N-V4-16/N-V4-17 and the deadline
> reading may still use the existing bounded-arm records, with their limitations.

Add to T16 step 6:

> Approval or deferral of S07 is not the 26x26 scope/admission decision. Keep phase 2
> blocked until that decision is recorded and its required gates are specified;
> preserve the original FAIL rather than recomputing it on a reduced control set.

R-P24-19 should record these measurement-only and no-refit/no-waiver boundaries.
No new measured scope beyond the existing S07 proposal is approved by this review.

## Validation and files

```powershell
node docs\improve-generating-stages-2-4\evidence\sa-astra\s06-review-checks.mjs --label frozen
npm run check
```

The script and `s06-review-checks.json` retain the declared-row/hash checks, independent
bootstrap results, four proof-binding checks, class speed and recorded-interval checks,
normal-model illustrations, account and comparator pricing. `s06-review-validation.txt`
records the commands and format/input-stability checks.

No code, plan, variant or run record was edited; no sign-off was added, no engine or
measured run was started, and no commit was made.
