# SA-Astra: improve-generating-stages-2-4, independent analysis, round 1

Author: SA-Astra, solution architect. Date: 2026-11-23.
Repository: `Q:\git\pentomino`, branch `improve-generating`.
Analysis base: `5807bd1`; observations: `35b401e`; immutable runtime: `3fc65f4`.
Status: **Independent analysis; recommendations are not a freeze, an allowance, an activation or a gate result.**
Authority: plan v4 by claude-fable-5-2 / SA-Fable, FINAL, and the task pack's recorded decisions.
The owner's request remains `docs\improve-generating-stages-2-4\request.md:5-27`.

**Evidence notation.** **Verified** means read from the cited code/record or recomputed from it, not proved for new
seeds or browsers. **Assumed** includes proposals, projections and future acceptance conditions. A paragraph or
table inherits the label immediately introducing it. `E1` to `E15` are the path-and-line references in section 10.
No other architect's folder was read. No rating, search, generation, replay, locked test or timed run was performed.

## 1. Summary

1. **Verified:** V4-S2 has 165 valid rows, 164 reaching ten, 1,642 accepted puzzles and 165 complete work ledgers.
2. **Verified:** all original screen classes have overlapping work intervals; pilot timing alone cannot admit them.
3. **Assumed:** screen only Nightmare 196-215 cells initially; its pilot work bound is decidable; keep other classes canonical.
4. **Verified:** Hell 1 24x24 reaches ten on 5/5 and 14x14 on 4/5: both must activate, despite 14x14's deadline risk.
5. **Assumed:** retain the Nightmare prior, fit the Hell 1 prior, enable its per-set prior, and reject (c4) and bracket-close.
6. **Verified:** 2 G P5 has no lost `any` completion in 15 pairs, but no real bound firing and no `require` replay proof.
7. **Assumed:** test a conservative class/mode budget table and a 60% batch reserve before committing the freeze.
8. **Assumed:** execute the scoped C1/R5/C5 spike before the freeze; do not pursue `fewestColumn` buckets or a wider default pool.
9. **Verified:** 172.335 counted minutes are used of 749; runs pass 747; every new timed scope still needs approval.
10. **Assumed:** retain the full priced validation unless N-V4-18 is separately accepted; no production `gen-v4` before phase 0 passes.

## 2. Understanding of the request

| Label | Item | Reading |
|---|---|---|
| Verified | Goal | Continue the remaining work, not reinterpret plan v4: stage-2 report, P7 spike, stage-3 freeze, live deadline, stage-4 selection/comparators/verdict, then the later gated phases. E1. |
| Verified | Users | Nightmare players and prospective Hell 1 players; the Generator, saved sets/puzzles, replay, packs and command-line consumers share the effective-request contract. E2. |
| Verified | Product limits | Browser T10 median <=60 s, p95 <=115 s, response <=120 s and >=90% reaching ten. Hell 2/3 are closed; Node pilots do not create an offer. E2. |
| Verified | Rating | The canonical score, AR1, centre rule, work-unit meaning, 760 M main cap and 80 M census cap do not change. Selection-call budgets are not rating caps. E2. |
| Verified | Authority | Technical fitting within the plan belongs to the SAs. A changed plan/recorded decision goes to the supervisor; scope, allowances, `require` behaviour, activation, offers and release actions remain with the owner. E1, E3. |
| Verified | Machine | Sequential timed requests at four workers; helper cap 900 s, horizon <=885 s; charge node + min(wait,45). Use 15 s quiet only under a currently valid owner declaration, otherwise 45 s. E3. |
| Verified | Preservation | Historical states, journals, item manifests and bound receipts are immutable. Never rerun `compile` for V4-S2, completed proof steps or their accepted bindings. E3. |
| Assumed | Deliverable boundary | This is the analysis for a subordinate plan and task pack, not permission to implement all future phases without their gates. |
| Assumed | Recommended risk posture | Prefer a defensible no-screen fallback over changing IG-P-Q37 or searching validation seeds for a better fit. |

## 3. Current state: stage-2 report

### 3.1 Source, rows, proof status and commands

**Verified:** the public request rows are seven arms, 33 arm/cell shards, five requests each. All use
`landscape/<caseId>/<rep>`, reps **0-4**, `uniqueness: 'any'`, four workers, cold pools and the same journalled
instrumentation. They are fitting observations, not the held-out reps 20-39. The source receipt remains at
`3fc65f4`, digest `e181df2cc2e784355345c1a43c6a97800fbfa5e6d139d1b465054fa94204284b`; arm-specific copy digests differ
by construction. The parity corpus instead uses `ig-v4/parity/<caseId>` and `ig-v4/replay/12x12-nightmare`,
one worker for its `require` generation. E3, E4, E9.

**Verified:** P-0 passes. Six stage-2 P-1 receipts pass with accepted bindings; `fr-p5` has a passing parity block,
an incomplete replay block and **no binding**. I rechecked the seven existing P-0/P-1 bindings against their
evidence hashes and the stored current tree IDs/parameter hashes; all seven pass. This does not upgrade the
unbound eighth receipt. The two rulings of 2026-11-23 remain in force:

- the killed 2026-11-20 invocation is archived, not silently discarded; its off-log charge is retained;
- continuation after `receipt-fr-p5` permits the stage-2 `any` pilots, not use of that P5 configuration in stage 4.

**Verified:** the following commands reproduce my arithmetic. They write only this analysis's evidence folder.
They import the pure ledger/statistics/price functions, never their command entry points. Independent primitive
sums are asserted equal to `rowLedger`; accepted-key evidence and in-band/AR1 fields are checked; CPU-profile
deltas and width percentiles are recomputed, not copied from the report prose.

```powershell
Set-Location Q:\git\pentomino
node docs\improve-generating-stages-2-4\evidence\sa-astra\analyze-records.mjs
node docs\improve-generating-stages-2-4\evidence\sa-astra\freeze-inputs.mjs
node tools\ig-proto\manifest.mjs approval --plan V4-LIVE --label frozen --source-label 'frozen 3fc65f4'
npm run check
```

**Verified:** the complete per-arm/per-cell report is **E4**, not an omitted appendix:

| Evidence | Contents |
|---|---|
| E4:10-46 | All 33 arm/cell rows: valid/complete counts, accepted puzzles, T1/T10/response medians and ranges, consumed work intervals and deadline violations. |
| E4:48-84 | Matching two-sided population: clue counts/shares, normalized score position and census-estimate share. |
| E4:86-118 | Paired capped-T10, matched-set clue deltas, lower bounds and work rules, both per cell and per original class. |
| E4:120-179 | Every arm/cell's actual W, `close`/`c4` side counts, P5 stops and prior transport. |
| E4:181-288 | Linkage, kernel counters, recomputed profile attribution and width probe. |
| E5 | All 165 row-level values and raw input line anchors; the script's input index hashes every explicitly parsed evidence input. |

### 3.2 Completion, time and accepted population

**Verified:** 164/165 requests reach ten; the exception is `fr-base`, `14x14-hell-1`, rep 3, with two puzzles.
Every row is valid, with no censored/incorrect/error row. There are **zero dead-end entries in 3,410 selection
calls**. The all-arm total of 1,642 puzzles includes repeated measurements of the same requests, not 1,642
independent samples. E4:10-84, E5.

**Verified:** selected paired results below are geometric means of per-seed **reference/changed capped T10**,
not ratios of medians. Five-seed bootstrap limits are descriptive, not admission evidence. The 20-seed p95 is
not defined here; E4 prints ranges instead.

| Changed versus reference | Cell | Paired factor | 90% lower | Same-set clue-delta median | Reading |
|---|---|---:|---:|---:|---|
| screen / none | 10x10 Nightmare | 0.687 | 0.582 | +1.0 | Slower, higher clues; keep OD-P7. |
| screen / none | 12x12 Nightmare | 1.702 | 1.351 | +1.0 | Faster but outside the 0.5 tolerance; keep OD-P7. |
| screen / none | 14x14 Nightmare | 2.601 | 2.402 | 0 | Strong pilot candidate. |
| screen / none | 15x15b10 Nightmare | 2.474 | 2.248 | 0 | Strong pilot candidate. |
| screen / none | 16x16 Nightmare | 2.239 | 2.200 | +0.5 | Speed, but work unresolved. |
| screen / none | 15x20 Nightmare | 1.651 | 1.363 | 0 | Speed, but work unresolved. |
| screen / none | 26x26 Nightmare | 1.458 | 1.348 | 0 | Speed, but a very wide work interval. |
| screen / none | 26x26 Hell 1 | 1.074 | 0.919 | +0.5 | No persuasive speed admission. |

**Verified:** every pair above has five matched sets; none moves by two clues. Pooling 20 matched sets across
four cells still gives only five independent seeds per cell and does **not** meet the 15-seed minimum.
Nightmare no-screen medians on the five failing headline cells are 24.08, 24.32, 12.91, 17.84 and 19.71 seconds
respectively (14x14, 15x15b10, 12x12, 16x16, 15x20), all 5/5 complete. Thus a screen fallback is not the old
dead-end search. E4:23-30, E4:86-118; plan v4:598-643.

**Verified:** the population moves even without screening. For example, 14x14 Nightmare has pooled clue-count
median 7 with the screen, 6 without it, while the paired per-set median shift is zero: those are different
statistics. Hell 1 14x14 has clue share median **0.382**, range **0.250-0.471**, and census-estimate share **31/42
=0.738**; 26x26 Hell 1 has **50/50 census-estimated accepted puzzles** in each of base, no-screen, per-set and P5.
These are not uniquely proved-puzzle claims; `any` is the measured mode. E4:48-84.

### 3.3 N-V4-14: real work intervals and a useful boundary split

**Verified:** all 165 ledgers reconcile; 843 calls close by confirmed worker termination, 839 with an open
primitive. These are normal speculative cancellations, not the 2026-11-20 runner kill. Complete bookkeeping
does not imply a tight interval. All losing/speculative selection work is included. E5; `verdicts.mjs:696-931`.

| Original pilot class | Screen G/accepted [lo,hi] | No-screen G/accepted [lo,hi] | Widths, screen/none | Work condition |
|---|---:|---:|---:|---|
| n-small: 100,144 | [1.545,1.807] | [1.650,2.209] | 0.262 / 0.559 | unknown |
| n-mid: 196,215,256,300 | [0.949,2.698] | [2.237,4.371] | 1.749 / 2.134 | unknown |
| n-large: 676 only | [1.111,61.646] | [1.584,68.880] | 60.535 / 67.296 | unknown |
| Hell 1: 676 only | [3.856,52.552] | [4.239,64.194] | 48.696 / 59.955 | unknown |

**Verified:** at the original class boundaries, **(c5)'s work condition is undecidable in every class**. In the
small class there is also a clue failure and a per-cell speed failure, so tighter work would not rescue it.
Do not substitute completed units for the upper bound or treat an unmeasured board as zero work. E4:109-118.

**Verified:** a fit-time split already permitted by plan v4 is useful:

- 196-215: screen **[0.968309,1.925159]**, none **[2.634979,3.936347]** G/accepted; work **passes** as a pilot
  diagnostic. Paired time factor **2.536514**, lower **2.406152**; paired clue median zero, 0/10 large moves.
- 216-324: measured 256 and 300 only, screen **[0.930118,3.470303]**, none **[1.838490,4.805319]**; work remains
  unknown. Area 324 is a validation control, not a measured pilot in that comparison. E6:80-185.

**Assumed / recommendation:** freeze that narrower screened candidate class; keep the other classes canonical.
No relaxation, completed-only work rule or extra deterministic re-rating is proposed. N-V4-14 can be discharged
by this report and the fail-closed design; a future request to rescue the unresolved classes by tightening bounds
or changing the rule would go to SA-Fable and, if it runs anything, the owner. Changing boundaries after validation
would not be an alternative.

### 3.4 N-V4-16, N-V4-17 and N-V4-21

**Verified — W:** all **3,410 starts** match their arm's actual class limit; zero mismatches, including base,
screen and none on their measured cells. E4:120-158 enumerates every arm/cell. Screen is 190 M on Nightmare,
380 M on Hell 1; base is 190 M only on its n-mid class; none is 760 M throughout. No null timing effect can be
attributed to a missing W transport.

**Verified — bracket close:** `fr-close` has **8 ended calls** with `locate.close` on 14x14 Nightmare:
**4 `in`, 4 `above`, 0 `below`**, and eight completed `close` profiles. On 12x12 Nightmare and 26x26 Hell 1 it
fires **zero** times: those base classes have no screen-capped bracket endpoint. Their near-unity ratios are
non-exercise, not evidence that the fallback is useless everywhere. On the exercised cell the paired factor is
0.874 (about 14.5% extra T10), without a median same-set clue benefit. E4:97-99, E4:151-153.

**Verified — (c4):** on 14x14 Nightmare, ended-call sides are **15 `in`, 44 `above`, 2 `below`** (61 calls);
on 26x26 Nightmare **29 `in`, 41 `above`, 1 `below`** (71). There are respectively 64 and 75 completed `below`
profiles: three/four additional probes belong to subsequently terminated calls without an `end`, so they cannot
appear in `locate.c4`. Paired factors 0.837 and 0.831 imply **19.5% and 20.4%** extra geometric-mean T10,
above the plan's strict less-than-10% adoption limit. Same-set median clue deltas are zero. E4:100-101,154-155.

**Assumed / recommendation:** freeze `c4:false`, no bracket-close re-rating, retain the original bounded rescue
(`rerateMax:4`). Neither negative result permits dropping the existing rescue.

**Verified — P5 `any`:** all 15 bounded/uncapped pilot pairs are known; zero lost completions, zero false stops.
However:

- **no row** has attempts 0-3 all ending without a window on the same side; no bound firing and no observed glue
  defect. N-V4-16 is therefore **not exercised**, not a positive real-run proof of the reason transport;
- 14x14 Nightmare has no budget stop at all, so its five identical puzzle lists are also non-exercise of the cap;
- Hell 1 20x20 has **59** budget-stopped calls (7 set, 52 batch), 26x26 has **59** (1 set, 58 batch);
- **four** set calls end `not-in-band` by budget exhaustion without a no-window side, on 20x20:
  rep 0 attempts 0 and 3, rep 2 attempt 3, rep 4 attempt 0; spent **2.298471303, 2.339719457,
  2.363961420, 2.421547354 G**. The same-side bound never counts them. E4:160-167; E7.

**Verified — `require`:** in P-1's `ig-v4/replay/12x12-nightmare`, `fr-p5` starts 16 set calls, ends 15 at
2.011141717-2.695981227 G by the budget, with no final/no window side, and leaves the last call to cancellation.
The request ends `no-set/time-limit`; the recorded ruling gives 115,014 ms. The two replay items are `no-record`,
not mismatches. Base makes a pack; its replay work is **5,816,758,806** and **12,646,225,540** units.
The separate base Hell 1 parity selection consumes **20,608,465,971** units. A blanket 2 G budget cannot be
presented as replay-proved. E6 `requireEvidence`; E9:72-132; E3:617.

**Assumed / recommendation:** ask the owner to keep a finite but substantially larger `require` selection budget,
proposed **32 G**, rather than silently removing the cap or pretending budget failures are sided no-window proofs.
The production acceptance rule is unchanged: only an already finished unique final may survive a budget stop.
Every budgeted frozen arm needs a newly accepted P-1 binding with replay `pass`; a pre-stage-4 proof uses a new
task/manifest, never `V4-S2P`. If 32 G does not produce the configured proof, stop for the SA; do not pick a more
convenient seed or waive replay. N-V4-15's large-board `require` scope is still open.

### 3.5 Hell 1 pilots, per-set prior, linkage and reserve

**Verified:** the activation rule is at least three valid pilot requests reaching ten, not three requests below
120 seconds. Both boards qualify automatically; owner authorization of `activate` is still required. E8.

| Base Hell 1 cell | Valid / ten | Puzzles | T1 median | Completed T10 median [range] | Response >120 s |
|---|---:|---:|---:|---:|---:|
| 24x24 | 5 / 5 | 50 | 8.15 s | 37.10 [27.40,42.95] s | 0 |
| 14x14 | 5 / 4 | 42 | 18.99 s | 93.57 [84.35,142.81] s | 2 |

**Verified:** 14x14 rep 1 reaches ten at 142.807 s; rep 3 returns two at 150.629 s. Under a projected absolute
115-second stop it has **3/5**, one lost completion relative to uncapped base. No current pilot justifies the
early-PM1 exception of IG-P-Q27: both boards reach ten on most requests. No offer or phase-0 veto follows.
E4:14-18, E5; plan v4:551-564,640-645.

**Verified:** the per-set prior reaches **all 183 batch calls** in its ten Hell 1 requests, always equal to the
chosen calibration's `wc`; no mismatch. On 20x20 the batch mean locate profiles fall **5.537 -> 2.591**, and on
26x26 **3.014 -> 1.744**. Pooled paired time factor is **1.093734**, descriptive lower **1.007512** over the same
five seed indices across the two cells. Both stay 5/5 complete, with zero median same-set clue shift. This does
not pass P2's 1.15 rule, which is **not** P4's adoption rule. E4:102-103,169-179; E6 `perSetPooled/perSetStages`.

**Verified:** the actual delivered table is `prior-v1`, fitted only from MP12b1 reps 10-19:
Hell 1 entries exist at areas 196,576,676 with shares **0.265179,0.141026,0.128205**, but **none at 400**.
Every one of 20x20's 20 base set starts has `priorCount:null` and uses K-8, not the PM1-guided table described in
plan P4. On 14x14 the starts are 8/9 clues, on 24x24 six, on 26x26 five. Thus stage 2 measured functioning
search and prior transport, not the promised fully populated Hell table or its composite with P5. E10.

**Verified:** all 165 linkage timelines pass; every returned task is accounted for, with no unexplained open
call. Await-idle time is only **0.03-0.05 worker-seconds per five-request arm/cell shard**, while total await
periods span tens/hundreds of seconds. The fold is waiting behind occupied workers, not an observed starvation
problem. Do not introduce bounded prefetch or a new candidate universe on these records. E4:181-217;
`linkage.mjs:48-136,217-258`.

**Verified:** post-hoc reserve fractions 0.3,0.4,0.5,0.6 cause **zero set cuts over all 165 rows**. Only 14x14
Hell 1 loses a completion at the absolute stop; a 0.7 reserve cuts two sets. The largest observed set time is
35.562 s. **Assumed:** choose reserve **0.6 for the batch**, so the set cap is **46,000 ms**, generation stop
115,000 and hard response 120,000. This gives a 40% set-stage share, not the reversed interpretation of
`reserve`. It is a proposed pilot fit, not a live receipt. E6 `deadlineProposal`; `verdicts.mjs:1332-1367`.

### 3.6 Kernel, width and unmeasured work

**Verified:** all **30/30** R4-counter items are completed and compare equal over complete deductions. Cases
are 10x10,12x12,14x14,26x26 Nightmare and 26x26 Hell 1, seed `ig-v4/kernel/<caseId>`, six subsets each (offsets
1,2,3; two per offset). Dirty/visited piece fractions are **0.848037,0.860074,0.854239,0.941102,0.887506**;
live/static row fractions on 14x14 and 26x26 Nightmare are approximately **0.333 and 0.584**. The complete
per-case counters, including mutations, are E4:219-227.

**Verified:** raw profile deltas give `fewestColumn` **4.824/10,099.633 ms =0.0478%** of deduction on 14x14
and **0/2,324.655 ms** on 26x26. This agrees with T10b; no buckets. R4 self-time is **16.568% / 18.958%**
of the entire reduced-inlining profiles; `select+undo+kill` totals **24.517% / 21.534%**. These profiles are
diagnostic, not uninstrumented production speed results. E4:229-277; E11.

**Verified:** the width probe has **540/540** timed ratings, two cases x six subsets x three rounds x
(1+2+4+8) workers. Relative to width four, width eight makes the individual-rating median **1.021703** times
on 14x14 and **1.085209** on 26x26; p90s and all widths are E4:279-288. This does not measure whole-request
throughput or a browser device class. Keep the four-worker default.

**Verified — what stage 2 did not establish:**

1. No live single-deadline run, reserve-cut cancellation proof or hard-response proof; N-V4-13 is not built.
2. No completed P5 `require` generation/replay; no real same-side bound firing.
3. No new budget table or combined new-prior/per-set/budget arm; only the 2 G arm on three cells.
4. No PM1-populated Hell start table in the actual pilot parameters.
5. No C1/R5/C5 optimization: the counters/profile are inputs to the spike, not the spike.
6. No screen/no-screen pilot on area 324 or the large controls 360-576, and no screen/per-set/P5 factorial on the
   conditional Hell boards. Validation can measure them; absent pilots are not assumed successes.
7. No 20-seed admission, Master collection, browser factor, offer qualification, blind play comparison or large-board
   `require` guarantee. No fitted ranker or evidence for C3/C4.
8. The 95 M/380 M Nightmare variants have certificate coverage from stage 1/provisional work, not a full stage-2
   request-yield comparison. The freeze below claims a choice among measured usable candidates, not a global W optimum.

## 4. Options

**Assumed:** costs below are counted-machine projections/guards, not authorizations or elapsed-development promises.
E6 `prices` derives them from T11g's per-step rules.

| Option | Design and user effect | Cost/risk | Recommendation |
|---|---|---|---|
| Freeze the existing 2 G configuration immediately | Fastest path to the old validation plan | Retains the demonstrated `require` proof failure and an unfitted Hell prior; cannot satisfy N-V4-21. | Reject. |
| Conservative fit, narrow screen class, no relaxation | Preserve the rating; allow canonical fallback; larger deterministic selection budgets; fit the composite on pilot seeds | Extra fitting pilot: 204.50 projected / 255.63 guard minutes, including two P-1 passes. New prior/composite gains remain unmeasured until it runs. | Recommended. |
| Pursue screen on all 196-324 and large boards | Potentially faster accepted requests | Existing class work intervals cannot justify it. A tighter proved bound or another accounting proposal needs supervisor ruling; new engine work needs a separately priced owner approval. | Not in the recommended pack. |
| Freeze no screen everywhere | Avoid all screen-admission dependence | Gives up the strongest defensible speed gains at 196/215, although their canonical pilots complete. No demonstrated need to abandon that candidate. | Fallback if its validation fails, not the initial fit. |
| N-V4-18 fixed-no-screen de-duplication | Same effective searches, fewer duplicate observations, real identities retained | Saves 340 rows: 390.61 projected / 488.26 guard minutes for this proposal; requires coordinated schema/selection/closure changes and new tests. | Optional reviewed task before activation; no saving assumed in the main price. |

**Assumed:** do not change the same-side stop to count generic budget failures merely to force P-1 to finish.
That would change early-stop behaviour and requires the owner; disabling `require` budgets is another owner
option, not an automatic fallback. The recommendation instead retains a finite cap and proves its reachable final.

## 5. Proposed plan: components, data, interfaces and compatibility

### 5.1 Stage 2 finishes the fit; stage 3 commits it once

**Assumed:** the candidate below is concrete enough to encode and measure, but not to label frozen before its
new fitting run, the P4-premise ruling Q-S01 and owner `require` decision. Retain the current records; use `V4-S2F` and its own parity task
namespace for the extra measurement, with new variant IDs. The five cells are 14x14 Nightmare plus Hell 1
14x14,20x20,24x24,26x26, each on reps 0-4 in the bounded candidate and an otherwise identical uncapped candidate:
**50 request rows +24 P-1 items**. No validation seed is consumed. The no-live-deadline comparator preserves the
two separate timers; report actual budget losses and the proposed reserve's post-hoc losses separately.

**Assumed:** this targeted run checks the material new Hell prior, per-set/P5 interaction and the altered budget
configuration, rather than buying a new full pilot matrix. Nightmare keeps its original table, and the proposed
8 G cap exceeds every completed no-screen successful trace observed on the seven measured Nightmare cells.
That prefix fact is useful evidence, not proof about interrupted calls, other controls or future seeds. If the
new composite cannot satisfy its proof or shows an important unsupported trade-off, stop for the SA; do not
silently replace it during validation.

### 5.2 W_screen and exact class coverage

**Assumed:** use `screen-s3-v1` as the candidate table ID, distinct from all pilot table IDs. The exact initial
comparator cells, including **both** activated conditional boards, are assigned once:

| Class | Level / active-area boundary | W_screen | Comparator cells |
|---|---|---:|---|
| n-small | Nightmare, 1-144 | none | 3x29, 10x10, 12x12 Nightmare |
| n-mid-low | Nightmare, 196-215 | 190 M, subject to validation | 14x14, 15x15b10 Nightmare |
| n-mid-high | Nightmare, 216-324 | none | 16x16, 15x20, 18x18 Nightmare |
| n-large | Nightmare, >=360 | none | 18x20, 20x20, 20x21, 32x15, 22x22, 24x24, 26x26 Nightmare |
| hell-1 | Hell 1, every active area | none | 14x14, 20x20, 24x24, 26x26 Hell 1 |

**Verified:** this is **19 distinct cells**, exactly the comparator cells returned by the pure activation preview
from the published pilots; there are no Master cells in the class map. E6:1-79. **Assumed:** runtime gaps
145-195 and 325-359, absent classes and invalid table values remain canonical 760 M. This is not permission
to offer a new board. Broader candidate Hell entries in P4 are not inserted into this validation class's cell list.

**Assumed:** `freeze.json` must retain the required shape
`{ classes: [{ id, cells, screen: 'fr-frozen', noScreen: 'fr-frozen-none' }] }`,
and separately carry explicit level/active-area bounds, W values, prior/budget/reserve IDs, selected mechanism
flags, fit input hashes, fitting/excluded seed recipes, kernel choice and the matching parameter hashes.
Use pure schema checks to prove disjoint runtime bounds, exact comparator coverage and equivalence of the
no-screen settings. Do not rely on `activate` to interpret every setting: its coverage check is narrower.

### 5.3 P4 and ranker

**Assumed:** retain all **15 Nightmare `prior-v1` entries** unchanged; their full values are E6
`nightmarePrior` (MP12b1 reps 10-19, not validation). New Hell entries in `prior-s3-v1` are:

| Area | Prior share | Fit source |
|---:|---:|---|
| 196 | 0.382353 | Stage-2 base, median of per-request accepted clue shares |
| 215 | 0.404412 | PM1 eligible in-band windows |
| 256 | 0.358108 | PM1 eligible in-band windows |
| 300 | 0.443429 | PM1 eligible in-band windows |
| 324 | 0.347222 | PM1 eligible in-band windows |
| 360 | 0.331514 | PM1 eligible in-band windows |
| 400 | 0.342105 | Stage-2 base, median of per-request accepted clue shares |
| 420 | 0.390244 | PM1 eligible in-band windows |
| 480 | 0.297161 | PM1 eligible in-band windows |
| 484 | 0.287500 | PM1 eligible in-band windows |
| 576 | 0.217949 | Stage-2 base, median of per-request accepted clue shares |
| 676 | 0.200000 | Stage-2 base, median of per-request accepted clue shares |

**Verified:** these values are recomputed in E6 `hellFit`. The PM1 method first takes each order's median eligible
clue/K share, then each seed's median across its orders, then the median across seeds; stage-2 requests have equal
seed weight, including the accepted prefix of the short 14x14 request. Round to six decimals and use the existing
`clamp(round(share*K),1,K-2)` rule. Failed-set/R28 observations are retained beside the newer pilot fit rather than
mislabelled as new measurements. All source seeds and family line anchors are recorded.

**Assumed:** enable P4's runtime per-set prior for Hell 1, not Nightmare, subject to the composite pilot. Transport
only a matching calibration's integer `wc`, with the existing level and `require` certificate checks; unmatched
saved sets/re-targeted requests rebuild from the versioned table. Freeze **no ranker**. C3's data-only predictor
has not supplied an eligible ranked arm and receives no forecast credit.

### 5.4 P5 and deadline configuration

**Assumed:** candidate budget table, in **selection-call** work units (ratings plus uniqueness counts):

| Mode / level / area | Budget | Evidence and limitation |
|---|---:|---|
| `any`, Nightmare, all classes | 8 G | Largest completed no-screen successful call 6.610 G; avoids fitting all areas to the inert 2 G 14x14 screen pilot. |
| `any`, Hell 1, <=215 cells | 32 G | 14x14 successful batch calls reach 26.17 G; 48/59 exceed 2 G before their last primitive. |
| `any`, Hell 1, >=216 cells | 16 G | Covers observed base maxima 13.76 G on 20x20, 6.51 G on 24x24, 7.70 G including the set on 26x26; per-set 20x20 reaches 13.85 G. |
| `require`, Nightmare/Hell 1 | 32 G, owner decision pending | Covers the observed 12.646 G replay and 20.608 G Hell parity call; not a new-board guarantee. |
| Very easy through Master; closed Hell 2/3 routes | unchanged | Do not activate P1-P5 outside the specified targets. |

**Verified:** E6 `prefixChecks` shows zero already-successful baseline calls whose next primitive would have
been blocked by these proposed `any` budgets. E7 retains the full 1/2/4/6/8/12/16 G prefix-risk tables.
**Assumed:** these are conservative affordability fits, not claims that untried budgets minimize wall time.
IG-P-Q10 at `1731c6b` requires a versioned per-level/area table that affords locate-and-window and is checked in
PM3; the extra pilot is that missing check. W selection uses total consumed work/accepted, the re-rating cost
and population constraints, not just first-solution work (IG-P-Q09).

**Assumed:** retain the bound of **four initial same-side no-window attempts**. A budget failure carries no
invented side. Check it before the ordered winner scan and preserve the fold/universe. Add a real-worker
reason-transport test in addition to the existing scripted-pool test; the pilot's zero false stops is not that proof.

**Assumed:** freeze reserve **0.6 batch /0.4 set**, a 46 s set allocation inside one 115 s generation stop, and
a 120 s hard response bound. The client owns one monotonic origin across set and batch; it cannot start a second
115 s budget. Cancel pending tasks at the stage cut/global stop and assemble only the accepted fold-order prefix.
The clock may shorten the prefix, never substitute a different puzzle for a slot. The host's hard backstop must
return that prefix, not merely kill a child and lose its accepted results.
Apply the new P5 policy to Nightmare/Hell 1 only; preserve the legacy level paths and their identity/timer behaviour.

### 5.5 Encoding, proofs and N-V4-13

**Assumed:** create the four declared frozen variants without changing `v4`, the old `fr-*` variants or their
parameter files:

| Variant | Screen table | P5 budget / same-side bound | Deadline |
|---|---|---|---|
| fr-frozen | fitted table | fitted /4 | live single deadline |
| fr-frozen-none | canonical in every class | identical fitted /4 | same live configuration |
| fr-frozen-uncapped | fitted table | none /none | original two-timer policy |
| fr-frozen-none-uncapped | canonical in every class | none /none | original two-timer policy |

**Assumed:** only `callBudget`, `setAttemptsBound`, `liveDeadline` distinguish an uncapped comparator from its
bounded twin, as the frozen-round matrix requires. All priors, per-set transport, c4/rerate settings, kernel,
rating and puzzle universe match. The existing screen resolver is hard-coded to four classes and the budget
resolver sees only level: additive, frozen-family-only anchored edits must implement the new boundary and
mode/area lookup. Shared ancestor-file edits would invalidate P-0's current-tree prerequisite; avoid them.
The copy builder refuses overwriting an inherited added file, so an unexamined file-copy override is not a solution.
`ig-select-v4.js:82-129,199-205,404-425`; `lib\tree.mjs:227-250`.

**Assumed:** retain the seven-key `gen-v4` provenance contract, not an ad-hoc eighth budget key. Prior and screen
IDs are stored as specified; the experimental algo ID/parameter identity binds the budget/deadline/kernel choice.
Production changes to an effective baked-in budget after release require appropriate versioned identity, never
reinterpretation of an old record. New prior values and all four variants require their own replay/observer proofs.

**Verified:** `V4-LIVE` already prices ten `fr-frozen` rows on 14x14 Nightmare and 26x26 Hell 1, reps 0-4,
row limit **260 s**, intentionally not 130 s so a deadline violation can be observed. Its receipt implementation
does not exist, and current `v4-check accept` handles stage1 or step-manifest receipts, not the compiled live
invocation's new kind. `v4-check.mjs:1598-1601`; `plans\V4-LIVE.json:1-33,208-263`.

**Assumed:** N-V4-13 implements the live receipt producer **and** acceptance path, with an independent expectation
for both bounded twins, captured params/trees, code/test evidence and actual live rows. Required fields are
`live:true`, `postHoc:false`, `workCutoffMs:115000`, `responseBoundMs:120000`, `reserveChecked:true`.
Synthetic clock/pool tests must exercise the otherwise rare reserve cut, partial prefix, cancellation, late
messages, assembly and hard-bound routes on both twins; passing ten fast rows alone cannot set those flags.
The receipt binds those verification records and the ten measured rows; a projection never substitutes.
An incomplete/failed receipt is written then exits 2 under `--require-pass`; no accept/validation follows.
`lib\proof.mjs:27`; check-list N-V4-13.

### 5.6 P7: a bounded spike before the freeze

**Assumed / recommendation:** retain the plan order: finish the report, implement the spike on isolated harness
variants, choose the proved-equal composite, then freeze. Work units and puzzle identity would make a later kernel
possible, but inserting one into already receipted validation would change timed inputs and proofs. No such
reordering is proposed.

1. **C1/R4 first:** compare an ordered live-row representation against the reference, with the original first-live
   row and kill order. Charge the exact reference R4 expression
   `L_p + 2*n_p*s_p + (n_p>0 ? s_p : 0) + sum(L_c) + sum(s_piece(r)+1)`.
   Do not assume a common-cell cache will pay: only about 14.6%/5.9% of piece visits on 14x14/26x26 are clean,
   while maintaining it would touch 32.48 M/6.18 M kills in the six-item counter corpora.
2. **R5 after R4**, only as a distinct composite comparison; its total-profile share is 4.33%/2.45%.
3. **C5 after C1:** optimize select/undo/kill handling with identical charges and tie order. Measure the final
   composite against the original reference; never multiply nominal C1/C5 gains.
4. **Correctness before timing:** full `DeductionResult` equality on frozen PM4's corpus, including work/nodes,
   every cap boundary, branch tie, undo path and near-32-MiB models. R1-R5/R8/R9 sums per call remain equal;
   R6/R7/probes/census keep prefix equality at every check.
5. **Memory:** reference slot table decides `model-too-large` exactly as today. Additional state fits only if
   reference bytes + additional bytes <=32 MiB and the worker limit; otherwise run the reference representation.
   Keep both phase-1 memory checks; no smaller allocation silently changes the reference decision.
6. **Scope stop:** at most three candidate composites, each 30 existing paired deduction inputs repeated three
   times, one lane, reserve 90 s, own namespace. Do not add `fewestColumn` buckets, R7 re-design, memoization or
   WASM. A losing or non-equal candidate is reported and not frozen.

**Verified:** T11g prices only the counters/profile, not these new implementations.
**Assumed:** their bounded schedule has **15.50 projected /19.37 guard counted minutes**, request **20**,
using 1.25 times each V4-S2K paired item duration as the projection. This is a declared timing assumption,
not a speed forecast. The primitive ceiling is 4,252.5 minutes for 270 items; the 20-minute grant/runner guard
is the practical stop, not permission to consume the theoretical ceiling. Equality test runs are separately
reported locked verification, sharded to the repository's verification limits. E6 `prices.spike`.

### 5.7 Validation seeds, activation and the binding window

**Assumed:** reserve reps **20-39** for first validation, Master **20-24**, second validation **40-59**.
Nothing from provisional reps **0-5**, MP12b1 fitting reps **10-19**, stage-2/new-fit reps **0-4**, PM1 seed
families, parity or kernel seed streams becomes validation evidence. E6 lists the Hell/PM1 fit seeds; the
Nightmare table records the MP12b1 recipe. A later stage-5 adopted table needs another fit, freeze and fresh
validation, not a re-use of reps 20-39. No validation record was read for fitting here.

**Assumed:** after the freeze and accepted live binding, the owner decides S4-6 and authorizes `activate`.
Check pilots published 5/5 each, all four variants, exact 19-cell class coverage, accepted live binding, and
unchanged data/universe since `c802fae`. `activate` then writes once; only afterwards ask its timed allowance.
Without S4-6, the preview is **80 groups /1,120 request rows /19 comparators**; the four P-1 passes add
**48 items**. Both twins on the five failing cells, four Hell cells and ten controls; today's ten controls;
all 16 Master cells x5 seeds x2 arms. Comparators are **380 rows**, not part of V4-S4. E6, E8, E12.

**Assumed:** decide (c5) first, then each failing/control cell on its shipped arm, then resolve the exact
uncapped comparator from the final class selection. Freeze the harness producer from V4-S4's `verdicts` through
V4-S4C's final verdict. No implementation, tidy-up, N-V4-20 fix or recompiled input in that window. Only full
publication or owner-authorized closure makes a selection final; selection alone can never pass phase 0.

## 6. Acceptance

**Assumed:** these are measurable acceptance criteria for the subordinate plan/task pack; current observations
do not assert the future gates have passed.

| Criterion | Verification |
|---|---|
| Complete stage-2 accounting | Reproduce 165 valid rows, 1,642 accepted puzzles, 164 reaching ten, all 33 tables, 165 complete ledgers; preserve every original file/hash. |
| Honest mechanism conclusions | Report N-V4-16 non-exercise; enumerate W/close/c4 and four no-side budget failures; keep incomplete P5 replay distinct from correctness failure. |
| Fit before freeze | Newly approved candidate/uncapped fitting rows and P-1 passes; paired losses, population and reserve projections recorded; SA accepts the measured candidate before final IDs are frozen. |
| Exact freeze | 19 comparator cells, once each, no Master/unactivated cell; disjoint runtime bounds, explicit no-screen gaps; four variants differ only as declared. |
| Determinism, observers and replay | Puzzles/fold invariant at pools 1/2/4/8; identical work/ordinals with absent, charge-only and record+charge observers; original thrown observer preserved; same effective request replays, wrong algo/table refused. Only a clock cut may shorten the accepted prefix. |
| P7 safety | Full deduction/work/node/cap/tie/memory equality; a measured composite only; losing candidate leaves reference selected. |
| Live deadline | Required typed fields backed by real rows and cut-path verification, both twins bound; <=115 s generation stop and <=120 s response; accepted prefix retained. |
| Screen admission | >=15 independent matched seeds in every class cell; clue median <=0.5, large shifts <=1/5; time GM >=1.15, bootstrap lower >1, every cell GM >=1; screen upper work/accepted <=none lower; completion loss <=1/20; screen passes each cell's own gate. |
| Failed/incomplete screen class | No screen; no refit or new boundary on validation seeds. Canonical arm still needs its full cell gate. |
| Phase-0 global gate | Each of five failing Nightmare cells >=18/20, no dead end; all ten controls >=18/20 and lower no-regression ratio >=0.9; all 16 Master identities; all prerequisite bindings; every declared P5 comparison known; final-purpose verdict only. |
| Hell report | >=18/20 is a candidate result for that board, not a phase-0 veto or an offer; boards below it leave that landscape; unvalidated P4 candidate boards remain separately priced diagnostics. |
| Sampling discipline | Third non-completion settles a cell's verdict, not early sampling termination; both arms complete all 20 seeds unless a declared ceiling intervenes. |
| Documented completion | Commands, accounts, loss populations, receipts and hashes persist; `npm run check` passes; no unauthorized push/merge/release. |

## 7. Risks, mitigations and effects

| Label | Risk/effect | Mitigation |
|---|---|---|
| Verified | Even small/fast successful requests terminate speculative ratings, so larger sample size does not automatically narrow work/accepted intervals. | Assumed: keep strict bounds; narrow only before validation; use canonical fallback rather than a relaxed test. |
| Verified | 14x14 Hell 1 passes activation but has two deadline violations and one projected lost completion. | Assumed: activate by the recorded rule, report it as high risk, fit its prior/budget, and let validation exclude that board if warranted. |
| Verified | P5 stops changed the Hell population: 20x20 has only three same-set pilot pairs and a higher census-estimate share. | Assumed: full two-sided reporting and exact uncapped comparator; never infer equivalence from 15/15 completion. |
| Assumed | The new Hell table/per-set/budget composite may be worse than its isolated parts. | Price the fitting comparison; no gain credit from synthetic or prefix-only calculations. |
| Verified | The 2 G `require` replay proof is absent; the existing Generator's large `require` route is unqualified here. | Assumed: owner mode decision, new real P-1 proof, retain N-V4-15 for production scope. |
| Assumed | Kernel bookkeeping overhead can erase R4 gains or break cap/memory equality. | Three bounded candidates, complete-result equality, reference fallback, one measured composite. |
| Verified | `arm.mjs publish` throws at the first unfinished shard; later finished shards can stay unpublished. | Assumed: N-V4-19 before any future closure, fit or activation of a stopped collection; enumerate missing shards without inventing rows. |
| Verified | Current `v4-check accept` cannot yet accept the compiled live-deadline kind. | Assumed: make independent expectation/capture/acceptance an explicit N-V4-13 deliverable, not an orchestration workaround. |
| Verified | N-V4-20's git guard misses `git -C` and assignment expressions. | Assumed: fix on the next self-test edit, with the single named phase1 bench exception, before the producer-lock window. |
| Assumed | N-V4-18 touches many evidence/selection interfaces. | Optional atomic task, complete/missing/changed-binding end-to-end synthetic tests; retain full duplicate-row price until accepted. |
| Verified | All timings are Node, on one machine, with small fitting samples. | Assumed: no browser or offer claim; preserve later calibration and phase-3 gates. |

**Assumed:** this pack changes harnesses and evidence only. It must not move production while a frozen plan
has an active firewall snapshot. P7 production adoption, `gen-v4`, fixtures, bilingual generation-step texts,
saved-step keys and guides are later production tasks with the living design documents updated together.
All tests that execute an engine use the lock helper, not the unlocked analysis commands.

## 8. Effort and phasing: outline for break-tasks

### 8.1 Account and prices

**Verified:** the 44 logged V4-S2 invocations all exit zero and none is marked killed; they consume
**7,338.802 counted seconds (122.313 minutes)**. The entire frozen round's logs total **10,252.712 s**;
add **55.4+32=87.4 s off-log** for **10,340.112 s =172.3352 minutes**, leaving **576.6648** of the
**749-minute grant**. The killed earlier invocation is not one of those 44. Runs still pass **747**.
E4:290-317; check-list:400-409,438-455.

**Verified:** T11g's historical sequential quote asks V4-LIVE at **793 on the account**, assuming V4-S2 spends
its full guard. Fresh `approval --plan V4-LIVE` now prints **10,252.712 s spent +2,634.330 s guard =215
logs-only minutes**; with the current 87.4 s off-log the minimal account ceiling is **217**. This does not
reduce the 749 grant or authorize a new scope: ask the owner for V4-LIVE at its turn and reread the then-current
account. Do not add the whole already-completed V4-S2 guard again.

**Verified arithmetic / assumed future consumption:** the following are pre-activation indications. The
implemented plans' current `approval` output, rounding and dry runs govern their actual requests.

| Item | Projected counted min | Guard min | Units | Notes |
|---|---:|---:|---:|---|
| Proposed extra fitting pilot | 204.50 | 255.63 | 50 rows +24 proof items | New scope; two new arms; fitting seeds only. |
| Proposed P7 spike | 15.50 | 19.37; request 20 | <=270 paired items | Up to three composites; timing assumption in E6. |
| V4-LIVE | 35.12 | 43.91 | 10 rows | Existing compiled plan; live tool/binding still needed. |
| V4-S4, both conditional boards, no S4-6 | 1,185.49 | 1,481.86 | 1,120 rows +48 proof items | Full current universe design, 84 locked steps /137 projected invocations. |
| V4-S4C, same collection | 585.62 | 732.02 | 380 rows | 51 projected invocations; selected uncapped arm per cell. |
| Optional S4-6 | 58.00 | 72.50 | 25 today's-arm rows | Indication, not a gate. Recommend omit. |
| Optional N-V4-18 saving | -390.61 | -488.26 | -340 duplicate rows | Conditional on accepted implementation and activation; not subtracted above. |
| Second validation plus comparators | 659.4 | 824.2 | 240 rows in existing template | Only after separately approved stage-5 adoption; fresh activation/namespaces. |

**Verified:** full initial-plus-conditional stage 4 is **1,771.10 projected /2,213.88 guard minutes**, not the
old plan's 3.4-4.2-hour indication. T11g's legacy-based projections deliberately overpredict/censor some new-arm
rows: the S4 preview forecasts 200 censored observations, not 200 measured failures. Their hard row limits still
apply. The S4/S4C primitive ceilings are **18,396 /5,985 minutes**; guard/round caps, not those mathematical
ceilings, limit an approved run. E6 `prices`; E12:10-80.

**Assumed:** if the additional fit, spike and live run each spent their quoted guard, the account would be about
**491.24 minutes** before S4, within 749 but outside S2's already-approved *scope* unless the owner authorizes
them. Full S4/S4C would then need an indicative cumulative cap around **2,706 minutes**. Ask separately at
activation and comparator resolution using actual spend; do not request that entire sum as an automatic grant.

### 8.2 Ordered task outline

**Assumed:** developer effort is a planning estimate, not an AI-credit promise. A 0 machine allocation excludes
separately reported locked verification. Each row is a task or small group of tasks that break-tasks should make
executable; all inputs/gates are explicit.

| Order | Task / inputs | Outputs and acceptance gate | Developer estimate | Machine cost / stop |
|---:|---|---|---:|---|
| 1 | Accept the stage-2 report; E4-E7, immutable V4-S2/P/K/W records | Joint report covers N-V4-14/16/17/21, prior gap, all rows, widths/profile and account; no gate inflation | 2-3 h SA/report | 0; owner questions below |
| 2 | N-V4-19 publish-done-shards; `arm.mjs publish` and stopped-collection rules | Publish every done shard of every requested arm, list unfinished shards, no partial-row invention or overwrite of bound files; synthetic stopped-middle-shard cases | 2-3 h | 0; before any closure or fit from a stopped plan |
| 3 | N-V4-20 with the first self-test edit | Recognize `git -C` and expression calls; explicitly exempt only `phase1\p6-bench.ps1`; synthetic positive/negative cases | 1-2 h | 0; before D-V4-20's window |
| 4 | P7 C1/R4, then R5, then C5; counters/profile, PM4 corpus, reference memory rule | Isolated variants, full result/prefix/memory equality, three candidate composite comparisons at most; retain reference for every failure | 14-22 h, split by candidate/proof | 15.50 projected /19.37 guard; owner Q-A02 before timed spike |
| 5 | Encode the candidate tables and `require` policy; section 5, supervisor Q-S01, owner Q-A01 | Separate candidate variants/parameter IDs; boundary/mode/replay/observer tests; no ancestor variant or historical input changed | 4-6 h | 0 benchmark; no unresolved premise/mode decision |
| 6 | Extra fitting plan and paired pilot; candidate variants, fitting seeds, separate P-1 manifests | 50 request rows +24 P-1 items, both accepted proof bindings, budget/false-stop/lost-completion and population report; SA accepts candidate or stops | 2-3 h plus run | 204.50 /255.63; owner Q-A03 for scope/account; dry-run first |
| 7 | Freeze encoding, N-V4-03; accepted candidate fit and selected P7 | `V4-S3\freeze.json`, exact class/seed provenance, four `fr-frozen*` variants and equivalence checks; write once | 3-5 h | 0 benchmark; stop for any unapproved plan change |
| 8 | Optional N-V4-18, if owner selects it | Fixed-no-screen mapping; schemas, validation, journal loading, ship/selection consistency, expectation/prerequisite, activation/closure/comparators/final inputs together; no fabricated (c5) or cloned rows | 5-8 h | 0 benchmark; Q-A04; re-price before activation |
| 9 | N-V4-13 live mechanism and receipt/acceptance | One origin, set reserve, 115/120 limits, cancellation/prefix assembly; forced-path tests on both twins; independent typed expectation and immutable captured evidence | 5-8 h | 0 benchmark until implementation complete |
| 10 | V4-LIVE execution; frozen config and live tool | Ten rows, required-pass receipt, accepted binding for both twins; otherwise stop, no stage-4 command | 1-2 h plus run | 35.12 /43.91; owner Q-A05, fresh account (historical quote 793) |
| 11 | T11e `activate`; complete pilots, freeze/variants, live binding, unchanged priced data/universe | Owner S4-6 choice then one immutable activation and concrete plan; exact 19-cell cover, no comparator rows in S4 | 1 h | 0; owner Q-A06, then separate timed approval |
| 12 | V4-S4; activated plan and four P-1 proofs | Required passes before request rows; all declared rows published or owner closure; class selection only, not phase 0 | 1-2 h orchestration plus run | 1,185.49 /1,481.86 before optional changes; owner Q-A07 |
| 13 | Resolve T11f comparators from final selection | Accepted selection/producer/evidence checked; V4-S4C exactly 19 cells x20; no second validation or unactivated rows | 0.5-1 h | 0; stop if selection is interim/changed |
| 14 | V4-S4C and final verdict | All declared uncapped pairs, final manifest, classes recomputed consistently, shipped-cell/Master/P5/prerequisite results, phase-0 line | 1-2 h plus run | 585.62 /732.02; owner Q-A08; no harness edits in binding window |
| 15 | N-V4-06 phase-0 sign-off / hand-over | Only final-purpose pass releases phase 2; failure/incomplete is a measured outcome, never a partial rollout decision | 1-2 h SA | 0; any relaxed gate or per-cell fallback is supervisor/owner territory |

**Assumed — operational stops on every run:** use the repository helper and actual valid quiet declaration;
read approval/dry-run immediately before starting; preserve journals; never end the runner with the orchestration
session. A stopped plan needs a ruling and `-Only` with leading prerequisites/firewall/trees plus the remaining
steps, never completed/bound steps. A collection reaching its ceiling publishes finished shards before the owner
decides closure; after closure no more rows of that collection. A failed proof is never converted into a
correctness pass or retried in its historical namespace. Price a new task if a proof cannot arise from its inputs.

### 8.3 What follows this pack

**Assumed, under the existing plan, not newly approved work:**

- **N-V4-07 / phase 2, only after phase-0 pass:** production P1-P5 and whichever P7 composite passed; preserve
  Very easy-Master identity; seven-key records, new skip bounds and replay fixture, old `gen-v3` fixture as
  `set-versions` refusal, saved-step key versioning, re-derived replay limits, bilingual Generation steps and
  guides/living design. Price and repeat validation on production, including controls; prototype gates do not
  replace it. N-V4-15 measures `require` on the Generator's largest offered boards under an owner-approved scope.
- **N-V4-08/N-V4-09 / phase 3:** Nightmare and candidate Hell landscape, D39, matching 20-request/90% browser
  results, explicit prefetch state, blind comparison (14x14 Hell as the extreme case), new policy/level lists,
  notices, metadata, guides/BQ seeds. The owner decides offers and any 10x10/12x12 remedy.
- **N-V4-01:** optional browser calibration, separately enumerated/priced; Node part 15.0 projected minutes in
  T11g, browser ceilings currently unpriced. No adoption of the 4.5 factor as a measured result.
- **N-V4-04:** separate stage-5 PM1/C3/C4/browser items, currently unpriced runner scopes. A later adopted prior
  requires `V4-S4X/V4-S4XC`, reps 40-59, separate activation/selection/comparators. No automatic early PM1 move
  is triggered by these successful conditional pilots. The 26x26 Hell 1 PM1-family gap must be explicitly priced
  if new families are requested; T11g gives it no measured family-based indication.
- **N-V4-10/N-V4-11 / phase 4:** service level only with measured browser T1/count/timeout/history; P8 opt-in only
  after device measurement, P11 only after the JS composite and >=1.5 whole-request gain, packs only as Hell 1
  fallback, idle stock exact-request identity, C3/C4 behind their tests. No Hell 2/3 reopening.
- **Phase 1 already done:** T12/T13 and T14 do not need to be rerun as if absent. Their release/push/merge stays
  with the owner. New P7 production work would have its own equality, fixture, test and memory gates.

## 9. Questions and decision stops

**Assumed:** these are recommendations, not decisions. All accounts use **749 granted /172.335 used /747 passed
to runners** at analysis time and must be reread at the actual approval. The questions below change behaviour,
scope or cost. No supervisor override is needed for the recommended boundary split: plan v4 explicitly delegates
class fitting before validation. No relaxation of IG-P-Q37, new sampling rule or changed activation threshold
is requested.

### Q-S01 — Supervisor: the plan's already-built Hell prior premise

- **Decision:** rule on the discovered difference between plan P4's claimed built PM1/R28-populated prior and the
  table actually used by the frozen pilots, before that difference is carried into a final sub-plan.
- **Options:** (a) correct the table through the versioned fit and targeted new fitting comparison proposed here,
  retaining all original S2 evidence and D-V4-20's activation rule; (b) require a more extensive, newly priced
  replacement pilot round before freezing. Neither option rewrites the historical observations or reuses their IDs.
- **Recommendation:** (a). This is not a request to change the rating or relax a gate. The wrong built-state
  premise affects population, fit confidence and the scope/cost of the remaining checks; it is not merely an API
  detail for a developer to decide.
- **Evidence:** plan v4:311-319; E10; 20x20's base set starts all lack a prior, while 14x14/24x24 retain MP12b1's
  sparse accepted-puzzle shares rather than the stated R28 window fit. The four newly fitted Hell pilot cells
  have different candidate starts; no result for those starts has been measured.
- **Blocked:** final P4 freeze route and acceptance of the additional pilot design. Its proposed price is
  204.50 projected /255.63 guard minutes (E6); authorization of that machine scope remains owner Q-A03.

### Q-A01 — Owner: P5 for `require`

- **Decision:** retain a finite 32 G selection-call budget for Nightmare/Hell 1 `require`, or choose another
  explicit policy from N-V4-21.
- **Options:** (a) proposed larger budget, ordinary four-same-side bound, prove replay; (b) no call budget for
  `require`, with an explicit work-first exception; (c) count budget-stop attempts in a new bound, changing
  early-stop behaviour; retaining 2 G as presently proved is not viable for the mandatory corpus.
- **Recommendation:** (a); no acceptance/canonical-rating relaxation. If an option changes the binding plan's
  work-first contract, it also needs the supervisor's ruling and the owner's confirmation, not an SA assumption.
- **Evidence:** E6 `requireEvidence`, E9, E3:617,643; 15 exhausted attempts, no pack, base replays 5.817/12.646 G.
- **Blocked:** candidate/final P5 configuration and its P-1 proofs. Proposed fitting price includes its proof;
  a separate one-arm P-1 would be 17.80 projected /22.25 guard minutes under a new task ID.

### Q-A02 — Owner: bounded P7 spike allowance

- **Decision:** authorize the <=3 candidate-composite schedule before the freeze.
- **Options:** (a) <=270 paired inputs, 20 counted-minute request; (b) authorize C1 only first, then re-price the
  next candidate from its outcome; (c) defer the planned spike, which needs a supervisor ruling on stage order.
- **Recommendation:** (a), retain reference if no candidate earns adoption; no open-ended kernel project.
- **Evidence:** E11 and E6 `prices.spike`; dirty fractions, tiny `fewestColumn`, explicit 15.50/19.37 projection.
- **Blocked:** the timing conclusion of N-V4-05, not the existing read-only report. Current cumulative minimum
  with that 20-minute scope is about 193 minutes; no increase of 749 is needed solely for it.

### Q-A03 — Owner: additional fitting-composite scope

- **Decision:** authorize the 50-row/24-proof fitting run, not covered by the completed S2 scope.
- **Options:** (a) the proposed five cells, two arms, reps 0-4, 204.50 projected /255.63 guard; (b) return for a
  separately reduced design/price, without claiming the omitted composite checks; (c) postpone the freeze.
- **Recommendation:** (a), after Q-A01 and candidate correctness. Existing S2 data cannot verify the new
  prior/budget composition or rescue the missing `require` proof.
- **Evidence:** E6 `prices.fittingPilot`, E7, the missing 20x20 prior and the P5 outcomes above.
- **Blocked:** final freeze sign-off. The current isolated minimum account ceiling is 428 minutes, not an
  authorization; include any intervening P7 spend and actual compiled-plan guard when asking.

### Q-A04 — Owner: optional N-V4-18 work

- **Decision:** fund the coordinated fixed-no-screen optimization before activation, or retain duplicate twins.
- **Options:** (a) reviewed 5-8-hour development task, conditionally remove 340 rows; (b) retain the existing
  executable design and full price.
- **Recommendation:** (a) if reducing the priced machine envelope is a priority; otherwise (b) is the simpler
  correct route. Do not drop rows by editing the current universe.
- **Evidence:** E6 `prices.optionalFixedNoScreen`, check-list:640; projected saving 390.61, guard saving 488.26
  counted minutes, no saving to any required cell gate/comparator/Master identity.
- **Blocked:** only the optimization. Its saving is not assumed by any other approval in this report.

### Deferred owner approvals — ask at their gates, not from stale prices

| ID / addressee | Decision / options / recommendation | Evidence and blocked work |
|---|---|---|
| Q-A05 / owner | Authorize V4-LIVE after the freeze and live implementation: approve its current 35.12/43.91-minute scope or stop. Recommend approve when proofs/tests are ready. | Historical quote 793; current arithmetic 217 minimal account minutes before intervening work. E12 and section 8.1; stage 4 blocked without accepted binding. |
| Q-A06 / owner | S4-6 yes/no and authorization of data-only activation. Recommend **no S4-6**, then activate both conditional boards by the rule. | E8; optional 58.0/72.5 minutes for indication only; activated plan cannot exist before this answer. |
| Q-A07 / owner | Timed V4-S4 allowance from the plan just activated: full scope or a separately decided lower cap/stop, never implicit cell deletion. Recommend the complete declared collection. | Current indication 1,185.49/1,481.86 minutes before optional changes, all prior spend included; E6, E12. |
| Q-A08 / owner | Timed V4-S4C allowance after final selection/resolution. Recommend complete declared uncapped comparison. | Current indication 585.62/732.02 minutes plus actual account; no phase-0 pass while declared pairs are unknown. |

**Assumed:** further owner stops are every ceiling closure, added/replacement measurement, idle declaration,
phase-2 repeat, phase-3 browser/offer decision, stage-5 scope and release action. A need to relax work bounds,
waive replay, exclude a qualifying conditional board, change the global completion gate, refit on validation or
alter the recorded stage order is instead an explicit **supervisor question**, followed by owner confirmation
where a recorded owner decision changes. None is silently exercised by this proposal.

## 10. Evidence index

**Verified:** repository-relative paths below are at analysis base `5807bd1` unless a different commit is named.
`A = docs\improve-generating-stages-2-4\evidence\sa-astra`. This abbreviation is only for the table; all produced
JSON evidence stores full repository-relative paths and raw line anchors.

| ID | Path:line / commit | What it establishes |
|---|---|---|
| E1 | `docs\improve-generating-stages-2-4\request.md:5-27` (`5807bd1`); `tasks\improve-generating-v4\check-list.md:688-729` | Owner request, scope and inherited hand-over. |
| E2 | `docs\improve-generating\plan.md:24-50,241-369,371-430,500-661,681-733` | Canonical constraints, P2/P4/P5/P7, stage order, statistics, authority. |
| E3 | `tasks\improve-generating-v4\check-list.md:121-139,306-469,485-514,516-539,616-643` (`d3d50d5`, `0edc636`, `35b401e`) | Grants, quiet/runner rules, immutability, two 2026-11-23 rulings, named items. |
| E4 | `A\stage2-computed.md:1-369` | Complete generated pilot report, all arm/cell tables, recomputed probes/account. |
| E5 | `A\rows-computed.json:1`; `A\calls-computed.json:1`; `A\input-index.json:1` | 165 rows, call-derived inputs, input SHA-256 index and raw path:line anchors. |
| E6 | `A\freeze-inputs.json:1` | Split-class arithmetic, exact 19-cell mapping, prior fits/seeds, require raw evidence, proposals and detailed prices. |
| E7 | `A\stage2-computed.json:1` | Full precision, per-class work, budget threshold risks, projections, P5 exact failures and accepted-binding checks. |
| E8 | `tools\ig-proto\manifest.mjs:419-445,1680-1770,1774-1857,1961-2030,2265-2291` | Conditional activation, immutable declaration, proof ordering and exact class coverage. |
| E9 | `docs\improve-generating\evidence\frozen\V4-S2P\parity-fr-p5.receipt.json:5,72-132`; `docs\improve-generating\evidence\frozen\V4-S2P\parity-fr-base.receipt.json:72-188`; `tools\ig-proto\v4-check.mjs:117-146` | Passing parity versus incomplete replay; base selection work; fixed `require` generation corpus. |
| E10 | `tools\ig-proto\fit-prior.mjs:1-60`; `tools\ig-proto\data\prior-v1.json:283-296,378-451`; `tools\ig-proto\variants\files\v4\core\engine\ig-select-v4.js:199-205` | Actual fitting source, missing intermediate Hell entries and lookup/fallback. |
| E11 | `docs\improve-generating\evidence\frozen\V4-S2K\kernel.md:5-75`; `docs\improve-generating\evidence\frozen\V4-S2W\width.md:5-28`; `core\engine\deduce.js:302-309,709-774` | Counters/equality, reduced-inlining attribution, width corpus, reference charges/memory. |
| E12 | `docs\improve-generating\evidence\frozen\V4-T11\manifest.md:10-80,97-141`; `tools\ig-proto\manifest.mjs:618-794,2774-2802`; `tools\ig-proto\lib\budget.mjs:27-104` (`c802fae`) | Per-step pricing, conservative universe, approval account and runner guard. |
| E13 | `tools\ig-proto\verdicts.mjs:499-608,696-1070,1167-1242,1332-1433,1550-1607,1637-1674,1725-1800` | Matched unit, bootstrap, intervals, cell/global gates, projection, proof and selection semantics. |
| E14 | `tools\ig-proto\README.md:839-918,1370-1462,1464-1519,1781-1869,2363-2523`; `tools\ig-proto\arm.mjs:245-293` | Budgets, prior/linkage transport, mechanism fields, reader/closure semantics and publish gap. |
| E15 | `docs\improve-generating\evidence\provisional\IGP-05\pm1.md:13-72`; `docs\improve-generating\evidence\frozen\V4-T03\inventory.md:5-15`; `docs\improve-generating\clarifications.md` at `1731c6b`, IG-P-Q09/Q10 | Existing PM1 inputs only; prior seeding and original budget/screen fitting directions. |

**Verified:** `analyze-records.mjs` and `freeze-inputs.mjs` are the complete reproducible scratch scripts in A.
Only A and this architect's analysis folder were written. No historical observation, harness, production file,
test or task pack was modified; nothing was staged, committed or pushed.
Both scripts pass syntax checks and produce six byte-identical derived files on consecutive recomputations;
`npm run check` passes (`check-conventions: OK`, `check-site: OK`). Commands and results are in `A\validation.txt:1`.
