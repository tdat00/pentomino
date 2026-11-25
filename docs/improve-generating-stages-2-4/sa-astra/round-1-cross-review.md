# SA-Astra: round-1 cross-review of SA-Opus

Date: 2026-11-23. Repository: `Q:\git\pentomino`, branch `improve-generating`.
Review base: **`1afce41`**, containing both independent analyses; observations: `35b401e`.
Reviewed: `docs\improve-generating-stages-2-4\sa-opus\round-1-analysis.md`.
Status: **Cross-review, not a joint decision, freeze, allowance or activation.**

**Verified** means inspected in code or recomputed from the original records. **Proposed** means a technical
recommendation or cost assumption, not measured behaviour. Original analyses and evidence remain unchanged.
No other architect's script entry point was executed: its scripts write into its own folder. My new script reads
the original observations and writes only new review artifacts under my permitted evidence folder.

## 1. Agreements

**Verified:** I re-read all 33 public shards and all 165 raw worker/link journals, recomputed their ledgers,
and compared the primary numerical fields with both analyses. All 33 groups agree on completion, accepted count,
T1/T10, maximum response, clue share, score position, census-estimate share and consumed-work intervals.
The new evidence is `..\evidence\sa-astra\review-records.json`, especially `crossChecks`.

| Topic | Agreed position and direct verification |
|---|---|
| Row integrity | 165 valid requests, 164 reaching ten, 1,642 accepted puzzles, 3,410 selection calls, 2,567 ended calls; every ledger and linkage timeline complete. |
| Uncapped calls | Exactly 2,258 ended calls outside `fr-p5`, all `ok`. The bounded arm has 240 `ok` and 69 `not-in-band` ends. These are calls, not independent requests. |
| Mechanisms | W reaches the actual calls; (c4) costs about 20% and is not adopted; bracket-close costs on its exercised cell and is not adopted. Rescue remains. |
| P5 evidence | Four budget-stopped set failures without a side; zero qualifying same-side first-four request. Zero observed false stops is not a real-run proof that the glue worked. |
| Hell activation | 24x24 reaches ten on 5/5, 14x14 on 4/5. Both activate under D-V4-20; the 14x14 deadline risk does not change that rule. |
| Deadline | Reserve means **batch fraction 0.6**, giving a 46 s set allocation; one 115 s stop and 120 s response bound. The current computation is post hoc, not a live receipt. |
| Per-set prior | Its Hell pilot pays modestly; it is not shown to pay over a corrected table. No Nightmare per-set adoption is justified by these pilots. |
| Kernel and width | 30 counter inputs equal; raw profile deltas confirm tiny `fewestColumn`, substantial R4/state handling, and width-eight individual-rating slowdowns of 1.021703/1.085209 versus four. No wider default. |
| Proof chain | P-0 and six arm bindings pass; P5 replay is incomplete. New frozen arms need complete parity/replay, and live proof/acceptance is still unimplemented. |
| Immutable evidence | No recompile/reuse of V4-S2 namespaces; no ancestor-tree change hidden behind a current binding; no producer edits inside D-V4-20's window. |
| Phase 0 | A final selection is not admission. The shipped-arm gates, Master identity, declared uncapped comparisons and bound prerequisites remain necessary. |

**Verified:** Opus's explanation of the short 14x14 Hell request is supported by its link journal. Slot 3 attempt 1
dispatches at **33.991 s into the batch**, remains unfinished at the **115.018 s discard**, while slots 4-10
and slot 3 attempt 3 have finished candidates. This is ordered-fold head-of-line blocking, not idle workers or
authority to skip an earlier attempt. See `review-records.json.headBlocking` and the raw journal
`tests\artifacts\ig-proto\frozen\V4-S2\fr-base\pilot-14x14-hell-1\logs\14x14-hell-1~3.link.jsonl`.

## 2. Disagreements and the positions I now hold

### D1. Screen boundary: I accept 196-256, correcting my narrower recommendation

**Verified:** Opus is right that the **class** work rule can pass even when 16x16 alone is unknown.
`tools\ig-proto\verdicts.mjs:914-931,967-1069` pools consumed work and accepted puzzles over the class.
There is no separate per-cell work-non-worsening requirement; per-cell completion, matched-seed and speed
requirements still apply.

| Candidate pool | Screen [lo,hi] G/puzzle | None [lo,hi] G/puzzle | None-lo minus screen-hi | Time GM / lower | Clue median |
|---|---:|---:|---:|---:|---:|
| 196-215 | [0.968309,1.925159] | [2.634979,3.936347] | +0.709821 G | 2.536514 /2.406152 | 0 |
| **196-256** | **[0.978925,2.283682]** | **[2.512292,4.234249]** | **+0.228610 G** | **2.433033 /2.348578** | **0** |
| 196-324, measured cells | [0.949214,2.697731] | [2.236735,4.370833] | -0.460996 G | 2.208412 /2.049799 | 0 |
| 16x16 alone | [1.000157,3.000729] | [2.266917,4.830053] | -0.733812 G | 2.238565 /2.200405 | +0.5 |

**Proposed:** use **196-256** as the candidate screened class. My 196-215 fit was defensible but unnecessarily
excluded a beneficial cell that the unchanged pooled rule can accommodate. This is a fit-time choice, not
relaxation of IG-P-Q37. The smaller margin is a risk, not an arithmetic failure.

**Proposed:** I also accept testing 190 M in **separate** 257-324 and >=360 classes, as Opus proposes, while
expecting a fail-closed result unless the actual validation establishes the work condition. Both twins are
already required by the unoptimized plan. Do not mix those cells back into 196-256 or call them admitted now.
Nightmare <=144 and Hell 1 remain fixed no-screen; gaps 145-195 and 325-359 remain unlisted/no-screen.

**Verified:** 196-256 has 15 matched sets **across three cells**, but only **five independent seeds in each**.
The minimum is 15 in every cell, not 15 pooled. No class has passed validation. Its rep-0 pooled work margin
is negative (-0.178253 G/puzzle), although the overall margin is positive. This matters when describing confidence.

**Disposition:** withdraw Opus Q1 **as a request for permission for option (a)'s boundary split**: the plan
already delegates fitting boundaries before validation (`plan.md:630-645`). Keep the N-V4-14 finding in the
report. A later tighter-bound or relaxed-accounting proposal still needs the supervisor and any machine approval.

### D2. P5 budgets: accept generous `any` candidates; disagree on disabling `require`

**Verified:** both my 8 G Nightmare /16-32 G Hell proposal and Opus's 10 G /40 G preserve all the successful
uncapped pilot traces for their intended cells. The largest observed successful call is **6.610 G** on
Nightmare and **26.167 G** on Hell 1. There is no measured head-to-head evidence choosing 8 versus 10, or
32 versus 40. An arbitrary 1.5 safety factor is a stated fitting heuristic, not a plan-mandated threshold.

**Proposed:** accept **10 G Nightmare /40 G Hell 1 for `any`** as the conservative candidate, conditional on
the added controls not revealing a higher affordability requirement. It simplifies the table; equal entries
across area classes are allowed. I withdraw my insistence on the smaller area-specific candidates. This is
not a claim of a speed gain or proof of the new composite.

**Verified:** contrary to Opus sections 4.2/8, there **is** real `require` work evidence:

- `lib\lane-worker.mjs:80-90` makes every P-1 selection `uniqueness: 'require'`.
- Base's 12x12 Nightmare selection succeeds at **10,273,954,138 units**.
- Its generated calibration/candidate replay at **5,816,758,806 /12,646,225,540 units**, both `matched`.
- Its 26x26 Hell selection consumes **20,608,465,971 units but returns `ok:false`**. That is a failed
  trace, not evidence that a 21/32 G budget can certify a Hell final.
- P5's 2 G generation has no pack, which is why the replay block is incomplete.

**Proposed / disagreement remains:** retain **32 G as a finite `require` proof-pilot candidate**, not as a
qualified production service level. The successful Nightmare records supply an evidence-based starting point;
they do not fit all boards or prove the candidate. A real accepted P-1 proof must precede validation, and
N-V4-15 still measures the larger `require` scope before production claims.

I do **not** accept `require:null` merely because no complete request-level cohort exists for that mode.
It is a permissible option to ask about, but it changes the work-first policy and needs **supervisor ruling
plus owner confirmation**; N-V4-21 explicitly reserves the behaviour change to the owner. Opus Q2 alone,
addressed only to the supervisor, is not the complete decision route.

### D3. P4: fix the premise, use direct data, remove accidental fit weights

**Verified:** both reports identify the same implementation gap. Plan P4 says the built table includes PM1
215-484 and R28 14x14/24x24 priors (`plan.md:301-307`); the actual frozen chain loads `prior-v1.json`, with
only three Hell entries and none at area 400. Twenty 20x20 base set calls have `priorCount:null`.
The original S2 observations are still valid observations of their **actual** configuration.

**Proposed:** keep my Q-S01, **narrowed** to the wrong built-state premise and the route for completing that
fit without rewriting S2 or changing its activation rule. Do not ask the supervisor to choose each numeric
prior. That fitting detail belongs to the SAs.

**Verified:** Opus's four reported medians reproduce, but its fit (`s2-prior.mjs:77-95`) pools ended calls
across repeated equivalent arms and a different 380 M screen arm. Seeds with more completed calls get more
weight. A `wc` also need not be an in-band hit. These are real methodological choices, not 68-264 independent
samples. My original accepted-share fit avoided call weighting but fitted a different target from the
calibration window.

**Proposed / corrected fit:** use the canonical `fr-base` ended-call **window share** `wc/K`, median within
each pilot seed and then across the five seeds. This aligns the table's start with P4's runtime window and
avoids repeated-arm weighting. I therefore change my four piloted Hell candidates:

| Area | My original accepted-share fit | Opus pooled-window fit | **My revised seed-balanced window fit** |
|---:|---:|---:|---:|
| 196 | 0.382353 | 0.403125 | **0.400000** |
| 400 | 0.342105 | 0.368421 | **0.368421** |
| 576 | 0.217949 | 0.219512 | **0.219512** |
| 676 | 0.200000 | 0.200000 | **0.200000** |

**Proposed / disagreement remains:** do not interpolate the other eight candidate boards while their own
PM1 windows exist. Their direct, order-then-seed-balanced shares remain:
**215:0.404412; 256:0.358108; 300:0.443429; 324:0.347222; 360:0.331514;
420:0.390244; 480:0.297161; 484:0.287500**.
For example, the 300-cell windows give 0.443429, not the proposed area-interpolated ~0.385. These unvalidated
boards stay diagnostic candidates, not offers. All 15 Nightmare prior entries stay unchanged.

All these values are **candidate fits**. Neither fitting method establishes a runtime improvement without
measuring the changed start/composite. See `review-records.json.priors`, `pm1`, `revisedPriorCandidate`.

### D4. P7 timing: retain the binding order; deferral is a missing supervisor question

**Verified:** plan v4:546-548 places the scoped C1/C5 spike in stage 2, before stage 3; the inherited hand-over
does the same (`check-list.md:717-722`). Opus sections 4.9/5.4/8 move it after phase 0 without a question in
its question list.

**Proposed / disagreement remains:** keep the spike **before the freeze**, with no production edit required.
New isolated harness variants can leave the `v4` ancestor chain/P-0 intact. Same work units do not make timing
irrelevant: wall-clock reserve, deadline losses and measured class speed are timing-dependent. A later production
kernel cannot retroactively supply the missing scoped spike in the frozen round.

I retain the bounded **three-composite /270 paired-input proposal: 15.50 projected, 19.37 guard, request
20 counted minutes**, with its explicit timing assumption. Opus's 5-10 minutes is an indication for a smaller
later probe, not the price of the same enumerated scope. Neither is an allowance.

If Opus maintains deferral, add **M-S03** for SA-Fable; do not make it the default task order. Also keep R7's
`reachable` outside this three-composite scope. The proposed x1.04 spike hurdle may be an SA technical choice
recorded before measurement, but the plan's projection lower endpoint is not itself an existing admission gate.

### D5. Add the control pilot and the final-arm pre-activation proofs

**Verified:** Opus's control-pilot price is correct: eight missing controls x five fitting seeds,
**40 rows, 22.594987 projected /28.243734 guard counted minutes**, eight projected invocations. The cells are
3x29,18x18,18x20,20x20,20x21,32x15,22x22,24x24 Nightmare. Current account minimum for that scope alone is
201 minutes; the existing grant is 749, but its scope does not automatically include this new plan.

**Proposed:** accept the pilot before final fitting. It informs both no-regression risk and the generous
Nightmare budget. As an additional warning, I recomputed the five-seed **26x26 no-screen** preview:
GM **1.121879**, one-sided lower **0.881013**. This is not a failed validation gate (different source/time,
fitting seeds), but it strengthens the case for investigating controls rather than treating GM >1 as reassurance.

**Proposed / disagreement remains:** the control pilot does not replace my targeted **50-row composite fit**
on 14x14 Nightmare and the four Hell boards, with its two P-1 passes:
**204.503470 projected /255.629338 guard minutes**. They answer different questions. I still recommend
measuring the material prior/per-set/budget composition before fixing it; Opus proposes carrying that risk into
stage 4. The owner can approve the scopes separately; the SAs must not hide this cost/risk choice.

**Proposed:** accept Opus's **four final-arm P-1 passes before V4-LIVE/activation**. My two candidate-arm fit
proofs are not proofs of all four final IDs/configurations. Formal extra price is **71.2 projected /89.0 guard
minutes**, 48 items. These do not replace the required `V4-S4P` passes; those remain in S4's price.

**Task-order correction for both outlines:** distinguish frozen parameter values from final measured tree
identities. Implement the live composition before a gate builds/tests variants that extend it; make the four
trees final before those P-1 passes and live acceptance. My outline should state this explicitly. Opus F03
currently extends absent `live` and runs `check-edits` before F04 creates it; that order is not executable as
written. Keep parameter fitting/freeze before validation; this is not permission to move a tree after binding.

### D6. N-V4-18: defer by default, with corrected conditional saving

**Proposed:** with D1's evaluated upper/large screen candidates, only three small Nightmare cells and four Hell
cells are fixed no-screen. I now agree with Opus's recommendation **not to implement N-V4-18 by default**.
The coordinated change remains an owner option before activation, not a shortcut in a running collection.

**Verified:** for this revised class proposal, the optional saving is **140 S4 duplicate rows**,
**240.370806 projected /300.463508 guard counted minutes**. It saves **no S4C comparator rows**.
My previous 340-row/390.61-minute saving applied to my former much broader fixed-no-screen proposal; it must
not be carried into this design. Opus Q4's wording “of V4-S4 and V4-S4C” is incorrect.

### D7. V4-LIVE and stage-4 prices: there is no 217-versus-793 factual disagreement

**Verified:** both analyses and a fresh command agree:

| Quantity | Current figure |
|---|---:|
| Logged frozen-round time | 10,252.712 s |
| Off-log charge | 87.4 s |
| Account | **172.3352 min** |
| Grant / runner cap | **749 /747 min** |
| V4-LIVE additional guard | 2,634.330248 s =43.905504 min |
| V4-LIVE minimum account ceiling now | **217 min** (215 logs-only) |
| Historical quote after S2's assumed full guard | **793 min** |

**Proposed:** hold **217 as today's arithmetic**, not as a replacement grant or permission to run. Retain the
749 grant and ask for the new scope after re-reading the then-current account. Pre-proofs/pilots/spike will add
spend first. The same rule applies later: an S4C minimum can be below the already-granted S4 cap if S4 underspends;
that needs scope authorization, not a fictitious fresh increase or account reset.

**Verified:** the formal prices are identical in both reports and reproduce from the immutable universe:
**S4 1,185.486485 projected /1,481.858106 guard**, including both conditional boards and four P-1 passes;
**S4C 585.617104 /732.021379**, 380 comparator rows. These remain the approval basis until a reviewed pricing
change is authorized.

**Verified:** Opus's alternate “realistic” S4 model maps `fr-frozen` on 15x20 and 26x26 Nightmare to `fr-none`
even though its freeze tests 190 M there (`s4-cost.mjs:35-51`). Correcting just that mismatch, retaining every
other assumption, changes **468.31-513.81 ->464.28-509.78 counted minutes**; S4C stays **169.83-182.83**.
These are **assumed timing scenarios**, not another formal quote. New priors, budgets, P7 and held-out seeds
remain unmeasured; the prediction must not certify a smaller guard.

## 3. Errors and overstatements in the other analysis

The following are independently checked corrections, not disagreements about preferred style.

### E1. Same puzzles do not imply a mechanism did not execute

**Verified:** Opus:197 says “A mechanism that changes no puzzle on a seed did not act there.” Counterexample:
`fr-close`, 14x14 Nightmare rep 0, has exactly the same ordered puzzle keys as base, **two canonical close
re-ratings**, and T10 **6.824680 s versus 5.270230 s**, +29.4949%.

Raw anchors:

- `tests\artifacts\ig-proto\frozen\V4-S2\fr-close\pilot-14x14-nightmare\logs\14x14-nightmare~0.24768.5.jsonl:14`;
- the adjacent worker `14x14-nightmare~0.24768.6.jsonl:24`;
- `docs\improve-generating\evidence\frozen\V4-S2\fr-close\pilot-14x14-nightmare.runs.json:597`
  and base's corresponding file:596.

Opus's own A.6 correctly describes this case; A.2 must be corrected. N-V4-17 requires journal evidence precisely
to distinguish “did not run” from “ran without changing the returned puzzles”.

### E2. `require` is not unmeasured in every sense

**Verified:** the public 165-row request matrix measures `any`, but the P-1 selections and generation/replay
measure `require`. `lib\lane-worker.mjs:87` and `v4-check.mjs:117-145` make that explicit. The exact work values
are D2 and `review-records.json.requireCases/requireGeneration`.
Replace Opus:413,444,687-688's absolute absence claim with **no adequately representative request-level
`require` pilot / no general affordability qualification**. A small successful corpus supports a finite
proof-pilot candidate; it does not prove a large-board service level.

### E3. Total work above B is not necessarily a call cut

**Verified:** `s2-p5.mjs` describes a successful call whose total exceeds B as “such a call is cut”.
The code checks **before** the next primitive and permits the running primitive's full overshoot
(`ig-select-v4.js:404-425`; budget checks precede its begin lines).

At B=2 G over the 2,258 successful uncapped calls:

| Level | Total >B | A later primitive starts after B | Final-primitive overshoot only |
|---|---:|---:|---:|
| Nightmare | 132 | **106** | **26** |
| Hell 1 | 341 | **279** | **62** |

Example: base 12x12 Nightmare rep 2 reaches its last primitive at **1,451,963,186** units and ends at
**2,252,187,822** units (`...\fr-base\pilot-12x12-nightmare\logs\12x12-nightmare~2.24704.6.jsonl:17`).
The total alone cannot classify it as stopped by a 2 G policy. Even a genuine budget stop may return an earlier
retained candidate in `any`; neither statistic is a request-level lost-completion count. This correction does
not invalidate the 10/40 G candidate: both are above the observed successful maxima.

### E4. Separate a synthetic extrapolation from the fixed validation recipe

**Verified:** Opus's 4,000-draw result reproduces under its code, which draws seed indices independently for
each cell (`s2-boot.mjs:61-67`). The plan's ratio resampler applies a common sampled seed vector across class
cells (`verdicts.mjs:405-414`).

Adapting the diagnostic to a common vector yields **3,999/4,000**, not 4,000/4,000, work passes for 196-256;
196-215 remains 4,000/4,000. Neither is validation or a guarantee about unseen seeds. Its correct label is
“synthetic pilot resampling under a stated model”, not an empirical result “at validation size”.
The statement that **every** class containing a board >=300 is undecidable must be limited to the particular
measured pools/configurations: neither unmeasured controls nor all possible future requests were evaluated.
At 16x16 the clue delta is **+0.5**, within tolerance, not literally “no same-set clue shift”.

### E5. Evidence of modest timing noise is not a general five-seed inference rule

**Verified:** the same-configuration puzzle identities and ratios reproduce: 20/20 equal lists, ratios
0.994393-1.109532. But Opus:25,197's “10-20% is a signal, 5% is not” is not an established threshold.
Repeated-configuration noise and across-seed mechanism heterogeneity are different uncertainties.
Keep the observed ratios, per-seed effects and descriptive lower bounds; label that readability judgement
as an assumption, and apply the prescribed held-out criteria later.

### E6. Executable-order and interface omissions

**Verified/proposed correction:**

- P7 after phase 0 needs the supervisor question identified in D4; the original question list omits it.
- F03 cannot build an extension whose new `live` parent is created only in F04. Resolve the scaffolding/final
  composition ordering before writing executable tasks; do not bind an intermediate tree.
- F05 names `v4-check accept --kind live-deadline`, but current `accept` does not accept `--kind`
  (`v4-check.mjs:1571-1601`) and compiled V4-LIVE supplies none. Extend acceptance by the receipt's typed kind
  with an independently constructed expectation; do not require a flag the frozen compiled plan omits.
- N-V4-18 saves duplicate **S4** observations, not the required single uncapped comparison per cell.
- The realistic-cost mapping error in D7 overstates S4 by about 4.04 minutes under that model; it does not
  alter the formal price.

### Direct source checks with no disagreement

**Verified:** I checked, rather than adopting the prose, the level-only budget lookup and class boundaries
(`ig-select-v4.js:82-129`), prior lookup (`:199-205`), large R9 term in the bound (`:257-279`), the distinct
`any`/`require` budget end (`:1303-1316`), freeze-class shape/coverage (`manifest.mjs:2240-2288`),
and the files hashed by `harnessInfo()` (`lib\records.mjs:112-125`).
The cited claims are correct. Statistical class boundaries and runtime W lookup must nevertheless be made
consistent in the encoding task; currently equal W values on two classes can conceal a missing future split
when production derives the admitted table.

**Verified:** the raw counter/profile and width figures also reproduce. No additional inference that an R4
cache pays, P8 accelerates requests, or the 95/380 M Nightmare controls are fully request-piloted follows.
Unpiloted Nightmare per-set prior and additional W values are coverage limitations, not automatically authorized
extra tasks. Only the owner can fund their scope.

## 4. Corrections to my independent analysis

The committed round-1 analysis remains intact; these corrections supersede its recommendations for joint drafting.

| Original position / omission | Corrected position |
|---|---|
| Recommend 196-215, fixed no-screen above it | **196-256** candidate at 190 M; separate 257-324 and >=360 evaluated candidates at 190 M, all subject to strict fail-closed validation. |
| `any` budgets 8 G /16-32 G | Accept **10 G /40 G candidates**, not proven optima, with the control/composite checks before fixing values. |
| Hell pilot prior from median accepted clue shares | Prefer **seed-balanced canonical window shares**: 0.4,0.368421,0.219512,0.2 at areas 196,400,576,676; retain direct PM1 fits elsewhere, not interpolation. |
| P7 before freeze, 20-minute proposed scope | **Retained**; deferral is a supervisor question, not a disagreement resolvable by comparing two differently sized timing estimates. |
| Extra fitting pilot but no priced control pilot | Add the **40-row control pilot, guard 28.243734 min**. It is an early warning and fit input, never a five-seed formal gate. |
| Candidate P-1 checks before freeze and final checks in S4 | Add **four final-arm pre-activation P-1 passes, guard 89 min**, before V4-LIVE. Candidate IDs do not satisfy them. S4's proofs still run. |
| 340-row N-V4-18 saving; optional implementation attractive | Revised design has **140 duplicate rows**, saving **240.370806 projected /300.463508 guard**, S4 only. Defer by default. |
| 491.24-minute pre-S4 guard scenario | Adding the control pilot and pre-activation proofs gives approximately **608.48 min** if all quoted guards are spent (about 609.11 using the rounded 20-minute P7 scope). Still within 749 numerically, not automatically authorized in scope. |
| About 2,706 cumulative minutes through S4C under that old guard chain | Revised illustrative guard chain is about **2,823 minutes** before optional changes. Not an approval request; re-read actual spend at each gate. |
| Freeze/variant encoding before live implementation not fully distinguished | Freeze values first, but complete live composition and final-tree checks before the first binding; do not promise an executable variant whose parent is absent. |

**Verified clarification:** my 20.608 G Hell `require` reference is a failed selection, not a successful final.
My report did not claim it succeeded, but the joint report should state this explicitly. Its work supports
an affordability diagnostic only. Both SAs must keep N-V4-15 open.

**Proposed:** the remaining technical disagreements are the `require` policy, P7 timing, the exact prior-fit
method/direct PM1 use, and whether to buy the extra composite fitting run. The first two involve authority
already specified by the plan; prior-fitting details are for the SAs to resolve inside that authority.

## 5. One merged question list

This is my proposed merged list, **not an answer on behalf of Opus, the owner or SA-Fable**.
“Conditional” means do not send a question if the counterpart withdraws that proposed deviation.

### 5.1 Disposition of every original question

| Original ID | Disposition | Merged ID / reason |
|---|---|---|
| Astra Q-S01 | Kept, narrowed | M-S01: the incorrect built-prior premise and completion route, not numeric prior choices. |
| Astra Q-A01 + Opus Q2 | Combined | M-S02 for the no-cap exception; M-O01 for the owner's mode-policy decision/confirmation. |
| Astra Q-A02 | Kept | M-O02, with conditional M-S03 added for Opus's proposed P7 deferral. |
| Astra Q-A03 + Opus Q3 | Combined, scopes explicit | M-O03: controls and new composite are separately selectable/priceable. |
| Astra Q-A04 + Opus Q4 | Combined, recommend defer | M-O05; revised saving applies to S4 only. |
| Astra Q-A05 | Kept, expanded | M-O04 includes the missing final-arm pre-activation proof scope, then V4-LIVE. |
| Astra Q-A06 + Opus Q5 | Combined | M-O06: S4-6 choice and data-only activation, then a different timed approval. |
| Astra Q-A07 | Kept | M-O07: activated S4 allowance. |
| Astra Q-A08 | Kept | M-O08: resolved comparator allowance. |
| Opus Q1 | Withdraw boundary-permission question | 196-256/separate-class fitting uses existing authority; N-V4-14 is reported. Any later bound/rule change is a new supervisor/owner proposal. |

### 5.2 Kept and added questions, addressees and recommendations

| ID / addressee | Decision, options and recommendation | Evidence / blocked work |
|---|---|---|
| **M-S01 / supervisor** | Does the missing PM1/R28 population of the supposedly built P4 table permit completion through a versioned fit and targeted new fitting evidence, keeping original S2 observations and D-V4-20 intact, or is more replacement evidence required? Recommend the former. | Plan:301-307; actual prior and starts in `review-records.json.priors`. Final P4 route pending; SAs still choose the numerical fit. |
| **M-S02 / supervisor — conditional** | If Opus retains `require:null`, may this mode be exempted from the explicit selection-call work budget/work-first policy? Options: finite candidate first, explicit no-cap exception, or a separately designed stop bound. I recommend finite candidate first; no silent exception. | D2, `lane-worker.mjs:87`, N-V4-21. Any no-cap ruling still needs owner confirmation in M-O01. |
| **M-S03 / supervisor — added, conditional** | If deferral is maintained, may N-V4-05's scoped spike move from stage 2 to after phase 0? I recommend retaining the binding pre-freeze order. | Plan:546-548; hand-over:717-722. Not required if Opus accepts that order. |
| **M-O01 / owner** | Choose P5 behaviour for `require`: finite budget candidate with real proof (32 G starting point), explicitly approved no-cap exception after M-S02, or separately evaluated budget-stop attempt bound. Recommend finite/proved; preserve acceptance rules. | Successful Nightmare work/replay exists, general mode qualification does not. No stage-4 budgeted arm without accepted replay proof. |
| **M-O02 / owner** | Authorize the bounded P7 spike scope, up to 270 paired items, **20 counted minutes requested**, or price a smaller staged scope. Recommend the bounded pre-freeze scope, subject to M-S03 if order remains disputed. | Original enumerated 15.50/19.37 projection; no production edit or speed promise. |
| **M-O03 / owner** | Authorize (a) 40 control rows, **22.595/28.244 projected/guard**, and separately (b) 50 composite rows plus24 proof items, **204.503/255.629**; or accept explicitly reduced pilot coverage. I recommend both; Opus recommends (a) only. | These are new scopes despite unused 749-minute capacity. Report all intervening account spend; candidates remain unfrozen while their required checks are pending. |
| **M-O04 / owner, at the proof/live gate** | Authorize four final-arm pre-activation P-1 passes (**71.2/89.0**) and then V4-LIVE (**35.12/43.91**), each with current account and passing prerequisites. Recommend both. | V4-LIVE alone currently needs minimum account217, historical quote793; neither automatically grants scope. |
| **M-O05 / owner, optional before activation** | Implement N-V4-18's coordinated fixed-no-screen mapping or retain the executable duplicate twins? Recommend retain/defer. | Conditional saving140 S4 rows, **240.371/300.464**, no S4C saving; no saving assumed by other approvals. |
| **M-O06 / owner, activation gate** | Approve S4-6 or omit it, and authorize data-only activation after freeze/live checks. Recommend omit S4-6 and activate both conditional boards by the existing rule. | S4-6 adds25 rows, **58.0/72.5** minutes, indication only. |
| **M-O07 / owner, after activation** | Approve the actual activated S4 plan's timed scope/cap, or a separately decided lower-cap stop. Recommend the full declared collection. | Current formal indication **1,185.49/1,481.86** minutes, both conditionals, no S4-6/N-V4-18. |
| **M-O08 / owner, after selection/resolution** | Approve the resolved uncapped comparator scope with actual account, retaining any higher already-granted cap. Recommend complete declared comparisons. | Current indication **585.62/732.02** minutes;380 rows. No final phase-0 pass with unknown declared pairs. |

**Proposed:** do not turn every conditional future stop into an immediate blocking question. Closure, another
measurement, browser/production-repeat budgets, offers and release actions remain owner stops at their existing
gates. A disagreement remaining between the SAs after this review goes to the supervisor with both positions,
not an averaged compromise or an orchestrator decision.

## 6. Reproduction, source anchors and validation

**Verified:** this review's new computations:

```powershell
Set-Location Q:\git\pentomino
node docs\improve-generating-stages-2-4\evidence\sa-astra\review-records.mjs
node tools\ig-proto\manifest.mjs approval --plan V4-LIVE --label frozen --source-label 'frozen 3fc65f4'
npm run check
```

The script imports pure readers/statistics/pricing only. It parses original rows, journals, P-1 item logs, PM1
families, CPU profiles and width arrays; compares both reports' primary numbers against them; reproduces the
disputed class pools and both resampling schemes; checks the head-of-line event sequence; and re-prices the
control/pre-proof/activated/comparator scopes without writing any executable plan or receipt.

| Evidence | Contents |
|---|---|
| `..\evidence\sa-astra\review-records.mjs` | Complete new read-only computation; outputs only the two review JSON files. |
| `..\evidence\sa-astra\review-records.json` | Full precision, raw path:line counterexamples, corrected fit candidates and price scenarios. |
| `..\evidence\sa-astra\review-input-index.json` | LF-normalized SHA-256 of explicitly parsed evidence/code inputs; imported readers pinned by `1afce41`. |
| `..\evidence\sa-astra\review-validation.txt` | Syntax, reproducibility, format, protected-path and `npm run check` results. |

**Verified:** original report/script claims were checked at the code anchors given in sections 1-3, not against
the other report's prose. All new files are CRLF, UTF-8 without BOM, no trailing whitespace, final newline.
No historical evidence, harness, production code, test, task pack or other architect's file was modified.
No locked/timed/engine run, staging, commit or push was performed.
