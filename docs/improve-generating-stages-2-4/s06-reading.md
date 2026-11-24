# S06: the SAs' reading of `V4-S4` (stage 4's validation) and the control failure

Status: **joint note, drafted by SA-Opus; SA-Astra's review** (`evidence/sa-astra/s06-review.md`, S06-R1 to S06-R3)
**applied, her sign-off pending**. Date 2026-11-24. Base `96f231e` (S06 committed). Every reading below is an unlocked
read of records; it used no machine minute. A ruling here is a joint SA decision under the owner's delegation
(2026-11-23 15:29, Discord message 1574341211701907457). [V] marks a figure recomputed from the records; [A] marks an
assumption or a judgement.

## Summary

1. `V4-S4` ran complete: 1,120 declared rows published, the four `V4-S4P` proofs pass, 28,043.391 counted s. The
   round's account is 710.0 of the 1,725 counted minutes granted [V].
2. Phase 0 is **FAIL** on a single item, the control 26x26 Nightmare. Everything else passes:
   - the five failing Nightmare boards reach ten on 20 of 20 requests each, with no dead end;
   - the 16 Master boards give identical puzzles;
   - nine of the ten Nightmare controls pass the no-regression criterion, with measured point ratios of 1.054 to 2.089
     [V].
3. **26x26 Nightmare has point estimates near parity, but has not established the required non-inferiority** [V]. The
   paired capped-T10 geometric-mean ratio is 1.0006; median T10 is 15.8 s against 15.5 s today, and p95 is 26.2 s against
   26.4 s. The recorded one-sided 90% lower bound is 0.8864, below 0.9, so this sample fails the predeclared aggregate
   criterion. These summaries neither prove equivalence nor rule out a material regression.
4. **Phase 2 remains blocked pending a recorded decision.** A provisional recommendation for T16 is a legacy route for
   26x26 Nightmare, with the remaining `gen-v4` scope considered against the complete evidence. This does not change the
   recorded FAIL, approve production, refit a class, or change any offer. A chosen exception needs the owner's
   confirmation and its own implementation, compatibility/replay checks and repeated production validation [A].
5. **Recommend asking approval for S07 now.** It completes the predeclared P5 comparisons on all 19 cells and, on
   successful completion, writes the final-purpose verdict and closes the harness window. The results inform later
   decisions; they do not presume that all 18 other boards will be offered or deployed [A].
6. Pack amendments (ruling R-P24-19):
   - S07 step 2: after a FAIL, the question approves the measurement only;
   - T16: this note as an input, the reading without S07, and the 26x26 decision kept apart from S07's.

## 1. The run [V]

- **The run.** 2026-11-24 11:18 to 19:07 +07:00, exit 0 (`tests/artifacts/ig-proto/frozen/V4-S4/invocations.jsonl`):
  - 94 locked invocations, none killed, all exit 0, `horizonS` at most 885 and `quietS` 45;
  - 28,043.391 counted s;
  - the account is 42,514.439 s logged plus 87.4 s off-log, 710.0 of the 1,725 counted minutes granted at Q-S06 (a).
- **The proofs.** The four `V4-S4P` receipts pass, and their bindings pass.
- **The rows.** 1,120 declared rows, 1,120 published, 0 missing.
- **The verdicts.** `docs/improve-generating/evidence/frozen/V4-S4/verdicts.json`, `.md` and `class-selection.json`
  (purpose `selection`); the selection receipt passes. `resolve-comparators` wrote `tools/ig-proto/plans/V4-S4C.json`:
  19 cells on `fr-frozen-uncapped` and `fr-frozen-none-uncapped`, allocation 586 minutes.

## 2. The class verdicts and what each ships [V]

Rule (c5), as recorded (plan v4 §5.2):
- A class ships the screen arm `fr-frozen` only when "admitted".
- Otherwise it ships `fr-frozen-none`: the new search without a screen, with every other frozen mechanism (the prior, the
  per-set prior on Hell 1, P5's limits, the deadline).

| Class | Cells | Verdict (deciding condition) | Screen against no screen (gm / lower) | Ships | Note |
|---|---|---|---|---|---|
| `n-small` | 3x29, 10x10, 12x12 | failed (faster) | 0.9981 / 0.9953 | `fr-frozen-none` | the freeze gives this class no screen, so both arms run the same search here and "failed" is the expected outcome |
| `n-mid` | 14x14, 15x15b10, 16x16 | **admitted** (work pass) | 2.3007 / 2.168 | `fr-frozen` | the only class that ships the screen (190 M) |
| `n-upper` | 15x20, 18x18 | inconclusive (work unknown) | 1.7905 / 1.6836 | `fr-frozen-none` | faster with the screen, but the work rule cannot be decided (N-V4-14) |
| `n-large` | 18x20, 20x20, 20x21, 32x15, 22x22, 24x24, 26x26 | inconclusive (work unknown) | 1.5867 / 1.5415 | `fr-frozen-none` | the same; the screen's gain is left unused |
| `hell-1` | 14x14, 20x20, 24x24, 26x26 Hell 1 | failed (faster) | 0.9986 / 0.9959 | `fr-frozen-none` | no screen on Hell 1, as for `n-small` |

**Against today's search, on the arm each board ships:**
- **The completion gate passes on all five failing Nightmare boards.** 12x12, 14x14, 15x15b10, 16x16 and 15x20 each reach
  ten on 20 of 20 requests, with no dead end. Their p95 is 12.0 to 37.4 s.
- **Nine of the ten controls pass the no-regression criterion**, with measured point ratios (geometric means) from 1.054 to
  2.089.
- **The 16 Master boards** are identical.
- **Hell 1** (a report, never a gate): 20x20, 24x24 and 26x26 are candidates (20 of 20). 14x14 is not (10 of 20), as the
  pilots and T11's projection foresaw.

## 3. The control failure: 26x26 Nightmare [V]

**The ten controls**, recomputed per seed with the harness's own recipe. `s06-numbers.mjs` reproduces every geometric mean
and lower bound of `verdicts.json` exactly. The ratio is today's capped T10 over the shipped arm's, so above 1 the new
search is faster.

| Control | Shipped | Geometric mean | Lower bound | Log sd | Approximate mean needed at this SD [A] | Capped-T10 p95 today / shipped (s) |
|---|---|---:|---:|---:|---:|---|
| 3x29 | `fr-frozen-none` | 1.0592 | 0.9473 | 0.403 | 1.010 | 8.8 / 6.4 |
| 10x10 | `fr-frozen-none` | 1.5221 | 1.3173 | 0.503 | 1.040 | 55.9 / 29.7 |
| 18x18 | `fr-frozen-none` | 2.0012 | 1.6984 | 0.592 | 1.067 | 120.0 / 29.8 |
| 18x20 | `fr-frozen-none` | 1.6591 | 1.4374 | 0.512 | 1.042 | 85.0 / 34.4 |
| 20x20 | `fr-frozen-none` | 2.0889 | 1.7330 | 0.667 | 1.090 | 73.7 / 24.2 |
| 20x21 | `fr-frozen-none` | 1.5840 | 1.3793 | 0.508 | 1.041 | 96.2 / 25.3 |
| 32x15 | `fr-frozen-none` | 1.0540 | 0.9127 | 0.511 | 1.042 | 40.1 / 25.6 |
| 22x22 | `fr-frozen-none` | 1.1554 | 1.0388 | 0.376 | 1.002 | 31.6 / 19.2 |
| 24x24 | `fr-frozen-none` | 1.2434 | 1.1271 | 0.368 | 1.000 | 43.6 / 23.9 |
| **26x26** | `fr-frozen-none` | **1.0006** | **0.8864** | 0.439 | 1.021 | 26.4 / 26.2 |

**Illustration only [A]:** suppose independent log-ratios are normal and their population SD is fixed at the observed
sample SD `s`. Approximating the lower bound by `GM x exp(-1.2816 s / sqrt(n))` gives an illustrative threshold
`0.9 x exp(1.2816 s / sqrt(n))`. For 26x26 and `n = 20`, it is 1.02054. If the true geometric mean were exactly one,
this model gives a passing probability of about 41.79% across fresh 20-pair experiments. These are plug-in,
model-dependent calculations, not measured probabilities, the exact power of the frozen bootstrap rule, or a reason to
change its threshold.

**What happened on 26x26:**
- **The point estimates are near parity.** The median capped T10 is 15.8 s on the shipped arm against 15.5 s today, and
  the p95 is 26.2 s against 26.4 s.
- **The spread is wide.** Nine of 20 ratios are below 1 (five of them below 0.8) and six are above 1.2. The three slowest
  seeds:
  - rep 21: 38.9 s against 14.0 s; its set stage alone took 25.4 s, against 2.4 s today;
  - rep 28: 16.6 s against 9.1 s;
  - rep 37: 19.0 s against 11.2 s, both slower in the batch.
- **They are offset by fast seeds:** rep 32 is 2.77 times faster and rep 34 1.72 times.

**Regression or noise [A]:**
- **Point estimates near parity, not established parity.** The geometric mean, median and p95 are descriptive summaries.
  The required lower-bound criterion failed; the data do not establish non-inferiority.
- **Uncertainty matters.** The normal-model illustration above helps explain why a near-one point estimate can fail the
  criterion. It does not show that the failure is merely noise, or that every 20-pair sample with this spread must fail.
- **No speed gain on these seeds.** The point estimate shows no gain on this board, and the new search occasionally
  takes much longer: rep 21's set stage took 10 times as long as today's.
- **So the rule did what it is for.** It demands evidence that the new search is not worse; on 26x26 that evidence is
  missing. Calling the failure "noise" would amount to changing a pre-registered gate after the result. The SAs do not do
  that, and the FAIL stands.

**Against S01's warning** (`s01-reading.md` W2):
- The five fitting seeds of stage 2 (`V4-S2`'s `fr-none`) gave a geometric mean of 1.122 and a lower bound of 0.881, with a
  log sd of 0.444; one slow seed then too (0.546).
- The 20 validation seeds give 1.0006 and 0.886, with the same spread.
- The warning was right about the risk: the board's point estimates sit near parity with a wide spread. S01 decided (a)
  no change and carried the risk to stage 4, where it fell as foreseen.
- W1's 32x15, the other named risk, passed at 1.054 with a lower bound of 0.913.

**For information only, never a verdict or an admission:** on the same 20 seeds, the screen arm `fr-frozen` has a
geometric mean of 1.467 and a lower bound of 1.293 against today on 26x26; its median capped T10 is 10.2 s, and rep 21
took 18.3 s. `n-large` does not ship it, because its work rule is undecided (N-V4-14).

## 4. "Phase 2 stops for a decision": what it requires

**The rules:**
- Plan v4 §5.2 and §6: phase 0's gate includes no regression on every completion-passing control, and one failure stops
  phase 2 (`gen-v4` in production).
- This plan §7 named the risk; §8.4 sets the route: "the failing item is decided jointly by the SAs under the owner's
  delegation before any refit, with the owner's confirmation if one of his recorded decisions would change (no class is
  refitted on validation seeds)".
- Q-S06 told the owner that every other verdict of the run stands.

**What is not affected:**
- Phase 1's items need the frozen source and their own checks, not phase 0's gate (plan v4 §6). S02's P7 spike gave no
  go, so phase 1 now has only P6 and progressive presentation.
- Hell 1 is reported, not gated, and its offers stay behind phase 3's gates.

**The options for the failing item, each with what it costs and what it changes [A]:**

| Option | What it means | Cost | What it changes | The SAs' view |
|---|---|---|---|---|
| (1) Propose a legacy route for 26x26 Nightmare | retain the intended legacy behavior for that board while considering the remaining `gen-v4` scope under the unchanged class verdicts; no current record or class is reclassified | no additional experiment proposed in this frozen round; implementation, compatibility/replay checks, N-V4-15 and repeated production validation require their own pack and allowance | an explicit owner-confirmed scope/admission decision before phase 2 may proceed; Hell 1 offers and qualification gates are unchanged | provisional recommendation for T16: conservative retention of existing behavior where the required non-inferiority evidence is absent |
| (2) Commission an independent confirmatory study | a new, separately approved design using untouched seed pairs; 40 fresh pairs is one possible scope. Before any new result is read, the SAs specify the cohort, acceptance/error-control and stopping rules, and how the existing failed study is treated. Do not silently pool the failed 20 with another 20 and call the result the unchanged original gate | new task/manifest, priced before the owner's approval | a new evidence/admission decision; the original Phase 0 FAIL remains recorded. The ~59.4% fresh-40 normal-model illustration is not a forecast or the probability of the proposed old-plus-new extension | not recommended as an immediate action; no new run is proposed now |
| (3) Admit the screen on `n-large` | a new proposal for N-V4-14 (a tighter proved bound or a relaxed work rule), then a new validation of `n-large` | a later round, larger | the work rule (IG-P-Q37), a recorded decision | the later path to a possible gain on 26x26; not now |
| (4) Accept 26x26 as noise | waive the 0.9 bound for this board | none | the pre-registered gate, after the result | not recommended |
| (5) Stop phase 2 | the round's result stays FAIL; `gen-v4`/phase 2 does not proceed; phase 1 remains subject to its separate gates | none | none | not recommended: every failing board passes and nine controls pass with measured point ratios of 1.054 to 2.089 |

**When to decide [A].** The SAs recommend asking the owner with the stage-4 report (T16):
- the report adds what `V4-S4C` measures on the 19 cells (P5's false stops and lost completions);
- it adds the re-readings of N-V4-16 and N-V4-17;
- phase 2 is a later pack in any case, so waiting costs nothing.

Approval or deferral of S07 is not this decision. Until it is recorded, phase 2 stays blocked, nothing is refitted or
waived, and no record changes.

## 5. S07 (`V4-S4C`): ask its approval now

**What `V4-S4C` adds:**
- **P5's effects.** It measures each of the 19 comparator cells on the uncapped twin of the arm it ships: without the new
  call budget, the same-side attempt bound and the shared deadline, the other engine limits remaining. That gives P5's
  false stops and lost completions per cell (plan §6 B5) and real uncapped pairs for N-V4-16.
- **The final verdict.** On successful completion it writes `V4-S4F/verdicts.json`, which plan §6 T7 and T16 read.
- **The harness window.** Its normal finalization closes D-V4-20's window.

**Why now, and what if deferred [A]:**
- **Value of completing S07.** The declared comparisons quantify P5's effects and complete the round's final-purpose
  evidence. They are relevant to any later proposal to continue `gen-v4`, without presuming approval of that proposal.
- **The scope stays fixed.** All 19 cells remain in the compiled plan, including 26x26 Nightmare. S07 does not test or
  authorize a proposed legacy-routing exception and cannot turn the unchanged 26x26 control result into a pass.
- **If deferred.** Preserve the plan, activation, selection, proof bindings and run records. If their identities remain
  valid, S07 can run later after scope approval and a cap re-read. A new approved epoch/scope or invalidated binding may
  require new work; postponement alone does not require re-activation or new proofs.
- **If the round is reported without S07.** T16 reports the selection-purpose FAIL and the unmeasured comparisons. It must
  not invent a final-purpose record, report zero P5 cost, or silently close D-V4-20's window. Any alternative closure needs
  a separate recorded ruling. Phase 1 remains separate from the blocked phase-2 route.
- **Its price:** a timing proxy of 170 to 183 counted minutes; allocation 586, guard 732.02. The cap on the account is
  1,443, within the grant of 1,725 (the approval line of S07 step 1).

The code confirms that completing the comparators cannot turn the control failure into a pass (SA-Astra's review):
`verdicts.mjs:1530-1613` checks failures before pending comparisons, and `selectionChanges` and `finalPhase0`
(`:1813-1841`) forbid a final-purpose record from silently changing the selected arms.

**Recommendation: ask approval for S07 now, (a).** It approves the measurement only, not a 26x26 exception or a phase-2
deployment.

## 6. The owner's question now

One question, S07's, with the result first. The orchestrator translates.

> **Stage 4's first collection has finished.**
> - All five failing Nightmare boards reached ten on 20/20 requests.
> - All 16 Master boards gave identical puzzles.
> - Nine of ten Nightmare controls pass the no-regression criterion; their measured geometric-mean ratios range from
>   1.054 to 2.089.
>
> On 26x26 Nightmare the point estimate is near parity (1.0006), but the agreed one-sided 90% lower bound for the paired
> capped-time ratio is 0.8864, below 0.9. This is an aggregate comparison, not a guarantee about every request. Phase 0
> therefore remains **FAIL**, and phase 2 remains blocked pending a decision. The other recorded results stand.
>
> The SAs will bring the 26x26 options with T16's report. A legacy route on that board is their provisional
> recommendation, not an approved change. No production rollout or change to Hell 1 offers is authorized by this
> question.
>
> **Decision now: approve the remaining frozen-round measurement?** S07 measures all 19 declared cells (380 requests) on
> the selected uncapped twins: without the new call budget, same-side attempt bound and shared deadline. The other engine
> limits remain. This quantifies the limits' effects and produces the final-purpose record; it cannot erase the existing
> control failure. The timing proxy is 170-183 counted minutes, the formal guard 732.02 minutes, and the minimum
> cumulative cap 1,443, within your active grant of 1,725.
>
> - **(a) Approve S07 now (recommended).** Complete the declared comparisons and, on successful finalization, close the
>   measurement window. This approves the measurement only, not a 26x26 exception or phase-2 deployment.
> - **(b) Do not start S07 now.** Preserve the existing evidence and FAIL. T16 can report the selection-purpose result
>   with P5 comparisons unmeasured. The harness window remains protected until normal finalization or a separately
>   authorized alternative closure; postponement alone does not discard the current plan or bindings.

No other owner decision is needed now.

## 7. Pack amendments (ruling R-P24-19)

- **S07 step 2.** After a selection whose phase-0 line is already `FAIL`, the orchestrator relays section 6 of this note.
  Its recommendation (a) rests on completion of the predeclared comparisons and final-purpose evidence, not on assumed
  deployment of the other boards. Approval of S07 is measurement approval only; the recorded FAIL and the phase-2 block
  remain.
- **T16.**
  - Authority: this note is an input. The legacy route is a provisional option to be reconsidered with the final record
    and P5's results, not an accepted production configuration, and the current selections, the FAIL and Hell 1's rules
    stay unchanged.
  - Step 1: without S07, the selection record's empty `p5` means "not measured", never zero, and no final-purpose record
    or closed window is claimed.
  - Step 6: S07's approval or deferral is not the 26x26 decision; phase 2 stays blocked until that decision is recorded
    with its gates, and the original FAIL is kept rather than recomputed on a reduced control set.
- **What does not change:** no verdict, record, plan or code; no class is refitted and no gate is waived; no new measured
  scope beyond the existing S07 proposal is approved.

## 8. Evidence

- **The run:** `tests/artifacts/ig-proto/frozen/V4-S4/invocations.jsonl` (94 rows; 28,043.391 counted s).
- **The records:**
  - `docs/improve-generating/evidence/frozen/V4-S4/verdicts.json` and `.md` (purpose `selection`, phase-0 line
    `Phase 0: FAIL (control 26x26-nightmare: fail)`);
  - `class-selection.json`;
  - the runs files `V4-S4/<arm>/val-<cell>.runs.json`;
  - `tools/ig-proto/plans/verdicts/V4-S4.verdict-manifest.json` (the recipe: quantity 10, cap 120 s, 10,000 resamples,
    seed 20261116, reps 20-39);
  - `tools/ig-proto/plans/V4-S4C.json` (its prerequisites: the two uncapped variants and the selection with its activation).
- **The numbers of this note:** `docs/improve-generating-stages-2-4/evidence/sa-opus/s06-numbers.mjs`, with its outputs
  `s06-numbers.json` and `.md`. It reads the manifest, the verdicts and the 30 runs files of the ten controls on the
  three arms, plus `s01-numbers.json`. It reproduces the ten recorded controls exactly and is unlocked:
  `node docs\improve-generating-stages-2-4\evidence\sa-opus\s06-numbers.mjs`.
- **SA-Astra's review:** `docs/improve-generating-stages-2-4/evidence/sa-astra/s06-review.md`,
  `s06-review-checks.mjs` and `.json`, and `s06-review-validation.txt` (the declared rows, the bootstrap, the four
  bindings, the class statistics and work intervals, the normal-model illustrations, the account and S07's pricing).
- **Rules:** plan v4 §5.2 and §6; this plan §1, §6, §7 and §8.4; `s01-reading.md` W1 and W2; S06's STOP 2 (Q-S06);
  D-S24-18 (N-V4-14).

## 9. Sign-off

- SA-Opus (drafter): the joint reading and the recommendations above, with SA-Astra's corrections applied, 2026-11-24.
- SA-Astra (reviewer): the joint reading and the recommendations above, 2026-11-24.
