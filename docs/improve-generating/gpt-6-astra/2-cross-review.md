# Improve generating: cross-review of Opus's analysis

SA2, gpt-6-astra. 2026-11-14. Phase 2, against the supplied `cd5d17f` worktree.

Reviewed `docs/improve-generating/claude-opus-5.5/1-analysis.md` and `1-speed-summary.md`, my phase-1
reports, relevant code and committed evidence. No engine, test, generation, benchmark or timing experiment
was run; no timing lock or git operation was used. Arithmetic only reads existing JSON. Phase-1 files
remain unchanged. This report updates my planning judgement, not the historical observations.

**Measured (M)** means existing observations; **Derived (D)** is arithmetic on them; **Projection (P)**
requires assumptions about changed code or a new population. Proposed seconds are not new measurements,
confidence intervals, qualification passes or promises of ten puzzles.

## 0. Reconciled judgement

The disagreement is **not uniformly “Opus is slower”**:

- On14x14 Nightmare, my phase1 P1-P5/P1-P8 medians were22.2/10.1 s; Opus's were14/7 s.
  His count-specific evidence supports a larger search benefit than my pooled model there.
- On12x12, mine were23.3/10.6 s; his39/19 s. His allowance for repeated dear useful profiles is more
  defensible than my broad profile-count multiplier.
- On26x26 Nightmare, mine were6.3/3.0 s; his16/7.7 s. The existing start is already near the band,
  so my model credited too much count-search/prior improvement.

I adopt Opus's **curve-aware, per-call structure** as the better starting model, with qualifications for
useful-profile rerating, set selection, ordered last-wave cost and the difference between medians.
The reconciled illustrative fresh-request medians are approximately **8 s on14x14**, **22 s on12x12**
and **9 s on26x26** after P1-P8, rather than one transferable4-12x multiplier.

I do **not** accept the report's stronger conclusions that Nightmare completion will be approximately95%,
that virtually no response will exceed120 s, or that the large Hell1 boards are likely to meet D39.
Those are unmeasured hypotheses; the predicted T10 p95 is conditional/modelled, not a maximum-response bound.

The most important substantive disagreements remain:

1. A normal screen stop is not, by itself, the required no-cap-effect certificate.
2. The geometric escalation sum bounds main allowances, not all repeated census/build/diagnostic work.
3. A deterministic6 G-unit budget cannot guarantee a115 s wall-clock response.
4. Calibration already changes later candidates through frozen history, not only slot1.
5. Prepared-pack transforms do not create new history identities, and `verifyPack` does not verify
   canonical difficulty, AR1 or requested uniqueness.

## 1. New evidence from Opus: the count curves

### 1.1 The reconstruction is supported by code and saved records

`tools/bench/calibration-reference.js:17,251-265` defines shares0.05,0.10,0.25,0.40,0.55,0.70,0.85,
plus1, K-2 and the initial count, deduplicated after rounding/clamping. `runner.js:421-488` schedules
two subsets per distinct count, records successful samples and separately totals failures/unrateable cases.

I checked every selected Nightmare report and the three full Hell1 reports. For each, the total number of
missing planned `(count,sample)` records equals both `sampleFailures` and `sampleUnrateable`.
Consequently their missing samples can be attributed to `rating-incomplete` in this evidence population.
This attribution would not be safe for an arbitrary report with other failures.

The following are **D from the saved sampler records**, not new generator runs:

| Cell | Initial-count capped/planned | At rounded0.25 share, capped/planned | At0.25, in-band/rateable | Implication |
|---|---:|---:|---:|---|
| 10x10 Nightmare | 4/40 | 1/40 | 25/39 | Better target frequency, but little capped-cost saving compared with the mid boards |
| 12x12 Nightmare | 21/40 | 6/40 | 25/34 | Count guidance promising; useful ratings still expensive |
| 14x14 Nightmare | 34/38 | 6/38 | 24/32 | Strong support for leaving the initial capped zone |
| 15x15b10 Nightmare | 32/38 | 3/38 | 14/35 | Same direction, less uniformly in-band at the proposed window |
| 16x16 Nightmare | 33/40 | 2/40 | 17/38 | Same direction |
| 15x20 Nightmare | 31/40 | 1/40 | 21/39 | Same direction |
| 18x18 Nightmare | 23/40 | 2/40 | 11/38 | Window needs tuning, not simply “always use0.25” |
| 26x26 Nightmare | 4/40 | 0/40 | 2/40 | Current initial count is already useful;0.25 mostly makes it too easy |
| 14x14 Hell1, five sets | 9/10 | 7/10 | 1/3 | At0.40:6/10 capped,3/4 rateable in-band; still a difficult window |
| 24x24 Hell1, seven sets | 14/14 | 0/14 | 1/14 | A finer window lies somewhere between the sampled counts, not a proven robust prior |
| 26x26 Hell1, twenty sets | 35/40 | 0/40 | 13/40 | A useful higher-count region exists on these selected sets |

On26x26 Nightmare the initial count has20/36 rateable samples in-band; moving all the way to0.25 loses
most hits. On3x29 the initial count has27/39 in-band, with only1/40 capped.

**Small correction to Opus:** using each request's actual initial count gives10x10 Nightmare4/40=10%
capped, not3%. Three of the four missing samples are on K=17 sets whose initial count2 aliases the0.10
share; one is at K=18/count3. Excluding aliased counts can change the denominator, but it no longer
describes the actual initial-count population. The other main mid-board cap percentages reproduce.

### 1.2 What these curves do not establish

Opus is right that I underused this evidence. My pooled capped fraction averaged cheap high-clue samples
with difficult low-clue samples, then applied the average to production. That is a poor basis for a
uniform P1/P2 multiplier. The count-specific curves support **more** benefit at196-300 and **less**
at360-676 than that model suggested.

However:

- These are random subsets of the **witness**, not nested families or walked layouts.
- Sampling requires a successful set. For Hell1 it conditions on5/20,7/20 and20/20 set successes.
  It does not describe the many rejected sets or the22 cells that made no set.
- Seven shares can alias to the same integer count. The columns are not independent samples.
- Conditional in-band share is not central-final-result yield. Completion also needs centre selection,
  canonical AR1, uniqueness mode, novelty, layout distance and history.
- The recorded `ratingMs` is an RPC round trip on the sampling pool, not isolated worker CPU time.
- No sample records the work/nodes at first solution.

**Verdict:** reuse these curves to target PM1 and seed priors; do not cancel the needed final-source,
nested-order, walked-layout, first-solution and held-out measurements. Opus's “PM1 can be cut” is reasonable
only as avoiding redundant coarse scans, not eliminating the unmeasured dimensions.

## 2. Speed disagreements and their causes

### 2.1 Number and cost of useful profiles

My phase1 model multiplied count reductions over the whole request and used a95 M screen with a
restart surcharge. Opus instead prices locate/window work, the prior and the probability that a call
returns a usable candidate. This exposes costs my simple model could hide.

| Cell/type | Assumption causing the difference | Evidence/code check | Disposition |
|---|---|---|---|
| 196/215/256 Nightmare | My pooled cap mixture understated the initial-count dead zone; Opus changes the count region |34/38,32/38,33/40 initial samples cap, versus6/38,3/38,2/40 near0.25 | Opus's direction and larger search gain are better supported |
| 144 Nightmare | I credited broad profile/prior reductions; Opus charges approximately4 window profiles plus locate/prior work at a dear accepted-rating proxy | Accepted-work median approximately485 M;0.25 samples have better yield but do not establish the cost of the new central accepted population | Prefer Opus's higher central cost; keep a cheaper-window outcome as an optimistic case |
| 100 Nightmare | I let P4 improve the whole request; Opus mostly improves the batch and recognises dear useful ratings | Accepted-work median approximately260 M; initial-count cap share is only10%, not the mid-board80-90% | My large gain was too optimistic; P4 cannot repeatedly save calibration work already credited to P1 |
| 360-676 Nightmare | I transferred a roughly1.5x P1 and1.5x P4 profile reduction broadly | Initial count already has substantial in-band yield;26x26 loses yield at0.25 | Prefer Opus's modest P1-P5 benefit; most additional gain must be kernel/pool |
| Hell1,576/676 | My model used4 useful profiles/candidate and assumed successful windows; Opus uses6 window profiles, locate/prior costs and call success0.7 | Only13/134 accepted puzzles, high census-estimate share, and no production per-call success distribution | My approximately10 s all-phase medians are optimistic, not likely. Approximately25-30 s conditional construction is safer |
| Hell1,196 | My43 s P1-P5 scenario assumed easy repeatability once a window existed | All five accepted work values are near840 M;60% of sampled0.40 profiles still cap | No reliable completed-T10 prediction; Opus's higher work estimate is more credible, but P5 can censor it |

The phrase “Nightmare5-16x” mixes stages/cells if applied to P1-P5. Opus's196-324 P1-P5 medians imply
approximately2.9-8.1x; approximately5.6-16.1x is the corresponding P1-P8 comparison. Neither range
describes12x12 or every large board.

### 2.2 Accepted work is not work to the first solution

We agree that95 M is risky. `measureDeduction` records total main+census work; first-path work is not
retained in these summaries. Accepted Nightmare medians of107-485 M do **not** show how much of that
was spent before the first solution rather than counting/census.

Therefore Opus's claim that many useful profiles would cap **before** the first solution is not established.
Some can cap after it and still require canonical rerating because of changed census information.
Main-work-to-first, nodes-to-first, count-tail work and census work must be recorded separately.

The190-380 M suggestion is a useful **P experiment range**, not a fitted choice or a proven safe threshold.
At the recorded median317 M units/s it corresponds to approximately0.6-1.2 s of main work. Node caps,
census, model build, DLX and escalations add to it. A fitted screen must also preserve the final candidate
distribution sufficiently; simply making failures cheap is not enough.

### 2.3 Median decomposition and ordered scheduling

Opus's `(median T10 - median T1)*4/9` is a workload proxy, not measured worker-seconds per puzzle.
The medians need not add, and the T1 and T10 populations differ when a request does not complete.

**D from paired successful request records**, in the same selected reports:

| Cell | Completed requests | Median of paired batch `(tenthReadyMs-firstReadyMs)` | Difference of report medians |
|---|---:|---:|---:|
| 10x10 Nightmare | 19 | 16.155 s | 18.952 s |
| 12x12 Nightmare | 17 | 44.580 s | 48.210 s |
| 14x14 Nightmare | 11 | 58.151 s | 69.894 s |
| 26x26 Hell1 | 9 | 65.599 s | 63.878 s |

In addition, four workers need three waves for nine equal-duration candidates, not2.25.
Variable durations/retries/speculation make the actual queue different from either ideal. P8 helps the
batch more than a serial successful calibration; Opus is right to separate its set/batch gains, whereas
my uniform whole-request pool factor was too generous.

The reconciled model uses2.75 four-worker batch waves as a P central compromise, with2.25/3 in its
optimistic/pessimistic cases, and separate P8 set/batch factors. It preserves a fixed startup allowance.
This raises some of Opus's medians modestly. It does not convert the median proxy into an exact
distributional identity.

### 2.4 p95, completion and responses after120 s

Opus projects p95 as approximately2.2 times median, sometimes capped at the old conditional p95.
My phase1 mostly preserved each cell's old p95/median ratio. Neither is measured under the new search.
The old ratios range approximately1.34 on14x14 to5.66 on20x20 Nightmare.

Both assumptions are plausible *sensitivity cases*:

- More regular bounded calls could reduce tail dispersion.
- Residual slow sets, cap binding, unsuccessful screens and ordered waiting could preserve large tails.

It is not justified to cap the new p95 at the old one merely because a feature is an optimisation.
Nor does a p95 below115 prove that no response exceeds120. The reports already contain70 late responses,
including16 that completed ten; the new failure population is unknown. Opus's statement that Nightmare
“p95 stays below45” also contradicts its own12x12 P1-P5 row86 s.

I retain the two tail shapes as an explicit interval in the final table, without claiming either is
the future p95. Completion is **unknown until PM3**. Opus's95% and85-95% Hell forecasts and my earlier
independent-opportunity sensitivities are hypotheses, not offer decisions.

## 3. Correctness and integration disagreements

### 3.1 P2: normal stop and the two-point interval

**Confirmed common finding:** after the first solution, continued counting changes alternative statuses
(`deduce.js:1635`), and `settleCensus:1786` recomputes G/info/Gproved. A screen-capped count can therefore
change more than the solution-count penalty.

Opus correctly notes a conditional exception: if the first path is identical and **both** censuses fully
classify its alternatives, G/info agree and only the solution penalty can remain uncertain by at most2.
That does not establish full canonical metrics, and one observed completed screen census is not a
substitute for the complete equivalence proof.

**Disputed:** “exhausted or solution-limit means no cap effect”. R7 directly reads `workLimit`
(`deduce.js:1098-1131`) and can return `NONE` after exceeding it. `ladder:1448-1484` then tries R8/R9;
it does not immediately convert every such path into `STOPPED`. `branch:1593-1610` handles a solution
before its ordinary node/work checks. A normal final label alone does not prove that no cap-sensitive
branch was taken or that work/rule counts equal the canonical run.

This is a missing proof obligation from control flow, not a claim that I ran a counterexample puzzle.
The safe contract is a positive no-cap-effect certificate or a canonical rerating. PM4 must cover
normal-stop/overshoot boundaries, not only obvious `node-cap`/`work-cap` reports.

**Disputed scope of the2x escalation bound:** `1/8+1/4+1/2+1=1.875` bounds main allowances in a simplified
restart model. Repeated census budgets, model builds, diagnostics and cap overshoot are outside that sum.
For example, four completed-path restarts could spend four80 M censuses as well. A correct escalation
policy might avoid that pattern, but then that policy is part of the proof; the geometric sum alone
does not bound whole-profile time.

### 3.2 P1/P3: AR1 direction

The cheap-side problem is confirmed by `clues.js:254-288`: a complete AR1-refused rating is discarded
as `spent`, losing its score for direction.

Do not, however, translate **every** AR1 refusal into BELOW. Gproved=0 is an eligibility result, not a
numerical band-side theorem when G/info can be census estimates. Retain the canonical score and use its
actual relation to the band for direction; keep the profile ineligible for acceptance/stall.
The selected Nightmare/Hell1 diagnostic samples happen to have no in-band Gproved0 records, but that
does not prove the universal shortcut.

We agree on gallop endpoints, small K, an above/capped initial prior, non-monotone windows and fixed
canonical probe ordering. Fixed arity is necessary for the proposed parallel variant, but RNG/subset
identity and consumption of probes must also be specified independently of pool width.

### 3.3 P4: optional calibration already affects more than slot1

Opus identifies the correct optional input at `generator/jobs.js:388-417`. The new prior must be
stored or deterministically reconstructed, including target/uniqueness/version.

The assertion “today calibration changes only slot1” is incorrect:

- `generate.js:385-429`, `foldStart`, adds calibration keys to `seenLayouts/seenClues`.
- It freezes those augmented sets as `initialSeenLayouts/initialSeenClues`.
- `candidateContext:435` and `generation-client.js:814-823` send that history to later candidates.
- `foldAccept:495` also compares later candidates against accepted layouts and distance.

Calibration can already change later candidates and acceptance. P4 introduces an additional direct
clue-search dependency; it is not the first reason `(set,batchSeed,level)` alone is an incomplete request
identity. The replay/history contract must preserve all effective inputs rather than promise seed-only
equality across different sessions.

### 3.4 P5: deterministic counts do not guarantee wall time

I dispute Opus's approval of “no call can outlast115 s once the budget is in units”.
At the recorded throughput,6 G units is D18.9 s at the median but38.2 s at the p5 work rate, before
uncharged work. A slower device can take arbitrarily longer. Stopping only between canonical profiles
can also overshoot the aggregate count limit.

`generation-client.begin:447` starts a separate timer for set and batch. Bounding selection calls does
not itself replace their115+115 s budget by the bench's120 s end-to-end response. Keep both deterministic
count budgets and a real wall-clock backstop, with the owner deciding the full-request contract.

There is a specific coupling for196-cell Hell1: a near-cap accepted rating costs approximately840 M total
units. Six G units buys only about7.1 such ratings. Opus's likely locate/window pattern can contain about
nine dear profiles before success. That does not fit the proposed initial call budget automatically.
P5 may return an earlier best candidate or fail before that pattern finishes. Thus the111 s construction
estimate is not a valid predicted completed T10 unless the profile pattern/budget succeeds in PM3.

### 3.5 P6/P7/P8: what is and is not equal

- **P6 confirmed:** no diagnostic saving on profiles unrateable before the first solution; accepted
  complete-path metrics must still be filled. A main cap *after* the first solution is different:
  `measureV3` can still run its DLX diagnostic. Ratios such as1.03/1.1 are P transfers, not measured
  current/post-P1 whole-request factors.
- **P7 confirmed:** a compact clue-specific model must preserve row/column order and virtual charges.
  Refutation reuse must reproduce cap boundaries, not just charge a lump sum and declare failure.
  I retain a wider engineering scope than Opus's300-700 lines if incremental connectivity/model views
  are included; MRV buckets alone are a smaller task.
- **P7 disputed:** “a unit is about the same time everywhere” is too strong. The recorded p5/p95 work
  rates157/446 M units/s differ by2.84x, and build/diagnostic work is separate. Virtual units are
  deterministic accounting, not uniform-duration instructions.
- **P8 newly confirmed detail:** `min(8,hardwareConcurrency-1)` shrinks a4-core device from4 workers
  to3, and needs a lower clamp for a1-core report. This sharpens my phone-resource-policy warning.
- **P8 memory nuance:** `workspace.js:ArenaWorkspace` grows named arrays lazily.224 MiB is a ceiling,
  not an eager allocation per worker. Eight maximum capacities exceed the1.5 GiB criterion, but
  lowering those constants alone does not establish real memory safety or speed. Include all task
  types, scratch/cache/runtime overhead and old retained allocations.
- Keep4-worker gate comparisons and8-worker results side by side. Physical/SMT scheduling and the
  proposed1.3-1.9x batch benefit are assumptions until measured, not consequences of the thread count alone.

### 3.6 P9/P10/P11 and missing product risks

**P9:** a next batch index is predictable, but its seed is not currently derived from that index.
`jobs.js:384` calls `randomNumber`/`randomPuzzleSeed`. Stocking needs an explicit future-seed reservation
or serving policy, plus set/history/version matching. Existing auxiliary tasks are not automatically
a multi-action stock orchestrator. “Near zero next batch” requires a matching stock hit.

**P10:** Opus correctly requires bank-version identity, but overlooks two blockers already in my phase1:

1. `keys.js:285,330,345` minimises over board symmetries and uses shape ranks. Rotations/reflections and
   piece renaming do not create additional distinct layout/clue keys for the existing novelty contract.
   Packs need genuinely different layouts.
2. `tasks.js:85`, `verifyPack`, accepts a valid stored solution as proof of existence. It does not
   canonically re-rate, prove AR1, enforce `require` uniqueness or establish ten distinct acceptable entries.

The estimate must also respect masks, permitted area modes, history exhaustion and finite content.
No observed Hell2/3 window means no guaranteed prepared pack. A near-cap rating does not prove an
intrinsic115 s impossibility: ten accepted cap-scale ratings are about26.5 worker-seconds; finding them
is the unresolved cost. Keep frozen Player sample/puzzle-code goldens distinct from new generation fixtures.

**P11:** same-unit/complete-result equality is confirmed, including census, limit boundaries and floating
info accumulation. No independent multiplier should be credited before measuring what remains after P7.

## 4. Risks and questions: crosswalk

| Opus item | Status against my phase1 | Reconciled action |
|---|---|---|
| Q1: reuse coarse count curves/reduce PM1 | **New evidence, confirmed; scope reduction qualified** | Reuse counts, correct aliases/denominators; still measure nested/walked/final-source/failed-set populations |
| Q2: screen second-row census | **Confirmed**, my Q1 | Same first path plus fully resolved alternative sets is the conditional exception; preserve canonical acceptance |
| Q3: fit first-solution work/screen size | **Confirmed risk, disputed “before-first” inference** | Record work and nodes to first solution, count tail and census;190-380 M remains experimental |
| Q4: AR1 BELOW direction | **Confirmed gap with correction**, my Q2 | Use the retained score's actual side, not unconditional BELOW |
| Q5: pool-invariant bisection | **Confirmed**, my Q3 | Fixed canonical probe/subset tree; arity alone is not the full contract |
| Q6: prior persistence | **Confirmed**, my Q5; current-slot-only premise disputed | Preserve full effective request identity; calibration already affects later history/candidates |
| Q7: small-device pool width | **Confirmed, new concrete counterexample** | Do not reduce4 to3 unintentionally; clamp1; memory-aware explicit mobile policy |
| Q8: D39 versus browser Hell offer | **Confirmed question**, my qualification risk | Neither Node D39 nor browser timing is proved; never enable BQ from planning arithmetic |
| Q9: fixed-width bench | **Confirmed** | Keep4-worker comparisons; report8 separately, with resource and uncensored identity checks |
| Q10: D21 direction change | **Confirmed**, my P3/OD-P1 dependency | Make new direction semantics explicit while AR1/stall/acceptance stay protected |
| Q11: expensive100/144 cells | **Confirmed; central estimate revised upward** | Price useful profiles/rerates, not just capped failures;12x12 browser risk is substantial |
| Normal stop proves screen equality | **Disputed**, my P2 control-flow finding | No-cap-effect certificate or canonical rerating; include R7/normal-stop overshoot in PM4 |
| Two-times total screen cost | **Disputed as a whole-cost bound** | Count repeated main/census/build/diagnostic work; state the escalation policy |
| Count budget guarantees115 s | **Disputed**, my Q4 | Separate deterministic work from wall response; settle the two-action contract |
| P7 units uniform in wall time | **Disputed quantitative premise** | Use throughput spread and stage measurements, not one universal units/s conversion |
| Stock “next batch” is predictable | **Partly confirmed; seed/history dependency new detail** | Reserve a seed and bind a history snapshot; otherwise no guaranteed stock hit |
| P10 verification/diversity | **Missing from Opus**, my Q8/Q9 | Add canonical rating/AR1/uniqueness and novelty verification; transformations do not multiply distinct layouts |
| Completion95%, Hell85-95%, no late responses | **Disputed as conclusions** | Keep as P hypotheses only; censored workloads and maximum response need PM3 |
| Sizing estimates | **Mostly scope difference** | Small kernel/clue edits may fit his range; protocol/replay/stock/full-kernel work needs the wider integration range |

The shared gate order remains: freeze difficulty-v3, resolve the screen/identity/deadline contracts,
prototype count search using the saved coarse curves, profile the remaining kernel, then held-out
requests and landscape/browser qualification. Do not spend the full P7 budget before the core P1-P5
feasibility question is answered.

## 5. Reconciled planning model and sources

### 5.1 Fresh Nightmare requests

The final table uses Opus's call model, with an explicit last-wave sensitivity and a startup floor.
It is not a fresh fit to measured generation and does not assert a future probability distribution.

Let `c = median(accepted metrics.work)/317,000,000 +0.05` seconds. The division is D unit-normalised
cost; treating it as a new useful-profile time and adding0.05 s is P. Define:

```text
C_no_prior = [ (nloc/2)*0.03
               +(nloc/2-1+nwin)*c
               +1.5*screen ] / success
C_prior    = [ (nprior+nwin)*c +0.5*screen ] / success

S = min(current T1 median, C_no_prior+0.5)
B = min(current T10 median-current T1 median, waves*C_prior)

First search work, P1-P5 at4 workers = S+B
All fresh work, P1-P8 at8 workers =
  0.30 + [ max(0,S-0.30)/pool_set + B/pool_batch ]/(P6*P7)
```

The `min` terms are an explicit **P incumbent-retention assumption**: use a preselected old component
where a new one is not beneficial. They must be implemented as deterministic per-cell policy and checked
on held-out seeds, not chosen after observing runtime. They do not prove no regression for each seed.
The difference of medians is only a comparison proxy, as section2.3 demonstrates.

| Parameter | Low benefit P | Likely P | High benefit P |
|---|---:|---:|---:|
| nloc | 9 | 6 | 4 |
| nprior | 3 | 1.5 | 1 |
| nwin | 7 | 4 | 3 |
| screen main-cost allowance, seconds | 1.2 | 0.6 | 0.3 |
| call success | 0.6 | 0.8 | 0.9 |
| Four-worker batch waves | 3 | 2.75 | 2.25 |
| P6 /P7 | 1.03 /1.1 | 1.1 /1.3 | 1.2 /1.8 |
| Eight-worker batch/set divisor | 1.3 /1 | 1.6 /1.15 | 1.9 /1.3 |

These are average-cost parameters, not literal deterministic quotas. P2's complete-equality correction
is a precondition. Additional useful-screen rerating, failed-set selection and history rejection can
make the model too optimistic. The ranges vary these parameters together; they are not a worst-case bound.
Keep3x29's current clue search because the saved curve shows little need to relocate its count.

**Tail column:** neither analyst has a measured future p95. For a displayed likely median m, show the
interval between `2.2*m` (Opus's regularised-call hypothesis) and
`m*(current conditional p95/current median)` (my retained-shape hypothesis).
This is a P tail-shape sensitivity, not a confidence interval. Censored requests can lie beyond both.

### 5.2 Other cells, phase order and optional work

Master keeps the old search. Its illustrative whole residual kernel/pool divisor is2.5, range1.3-3.5,
with a0.30 s fixed floor: `0.30+(t-0.30)/divisor`. This reconciles the approximately2.4-2.6x underlying
factors without crediting a free pool startup or replacing already-good clue search.

For Hell1 I retain Opus's dearer six-profile-window/call-success construction assumption rather than
my four-profile/successful-window assumption. Allow approximately10-20% more construction work for
ordered waves:576/676 approximately50-60 s at4 workers,25-30 s after kernels/wider pool;196
approximately110-130/55-65 s. These are **conditional construction costs, not established medians**.
The196 call-budget conflict and all Hell completion/tail probabilities remain unresolved.
The wider scenario ranges come from Opus's published parameter cases, modestly expanded for waves.

“First search work” below means the question's **P1-P5 grouping**, not the chronological first phase
of plan section6. That plan first implements P6/P7/P8; Opus's approximate current-workload projections
113->61 s on14x14 Nightmare and62->32 on12x12 are reasonable low-confidence phase1 planning cases.
Its phase2 then combines P1-P8. Our earlier uniform whole-request pool treatment understated set cost.

“All phases” below is a **cold fresh non-pack request after the feature**. Optional P11 gets no
unconditional credit before its whole-request gate; stock/pack service is a separate final row.
No numeric gain is credited for P5 merely returning failure earlier.

### 5.3 Source keys for the final table

- **L:** `docs/difficulty-v3/landscape-v3-full/aggregate-2026-11-14.json` and the selected per-case
  reports: current conditional T10/response and counts. Master includes the selected MP12a r2 reports.
- **C:** `runs[].samples` plus planned counts/failure checks in section1.
- **W:** `runs[].details.puzzles[].metrics.work`, used only as a unit-normalised cost proxy.
- **RN:** section5.1 formula/parameters; **RM:** section5.2 Master formula.
- **RH:** conditional Hell construction described in section5.2 and Opus sections5.1/5.4.
- Every after/range number is **P**, even where its inputs are M/D. “Tail” is the two-model sensitivity
  above; `NE` means not estimable. Current Hell no-set response is never substituted for T10.

Confidence is low for future seconds and lower for future completion. The table supplies no maximum
response guarantee, and no cell becomes offerable solely because a central/tail scenario is small.
The576/676 boards also need permitted large-board mode or separately qualified area limits.

## 6. Reconciled before/after speed table

| Cell | Today median/p95, seconds (D from M) | First search work P1-P5,4W: median /tail (P) | All phases, fresh P1-P8,8W: median /tail (P) | All-phase median range (P) | Confidence and availability | Source of each number |
|---|---:|---:|---:|---|---|---|
| Master60-100, cell-statistic ranges | 1.16-9.00 /1.69-16.44 | unchanged | 0.64-3.78 /0.86-6.76 | 0.55-6.99 | Low gain estimate; already20/20, protect search | Current L; after/range RM |
| Master144-324, cell-statistic ranges | 2.57-5.96 /6.83-18.41 | unchanged | 1.21-2.56 /2.91-7.54 | 0.95-4.65 | Low gain estimate; already20/20 | L; RM |
| Master360-676, cell-statistic ranges | 3.39-8.36 /5.26-16.64 | unchanged | 1.54-3.52 /2.28-6.84 | 1.18-6.50 | Low gain estimate; census estimates unchanged | L; RM |
| 3x29 Nightmare,87 | 5.31/7.64 | 5.31 /7.64-11.67 | 2.84 /4.10-6.26 | 1.74-4.19 | Low; keep current count strategy,20/20 today | L,C,W; RN with protected search |
| 10x10 Nightmare,100 | 24.04/68.44 | 22.57 /49.66-64.26 | 10.98 /24.16-31.26 | 4.29-17.58 | Low;19/20 today; browser tail still uncertain | L,C,W; RN |
| 12x12 Nightmare,144 | 62.14/176.07 | 44.46 /97.81-125.98 | 21.70 /47.75-61.49 | 7.09-45.39 | Low;17/20 today; likely browser budget failure, not only a completion issue | L,C,W; RN |
| 14x14 Nightmare,196 | 112.98/151.64 | 16.03 /21.51-35.26 | 7.94 /10.66-17.47 | 2.68-29.97 | Low; approximately14x central gain,11/20 completion not yet repaired | L,C,W; RN |
| 15x15b10 Nightmare,215 | 86.23/141.56 | 13.71 /22.51-30.17 | 7.22 /11.85-15.87 | 2.47-26.11 | Low; count-direction evidence strong,11/20 today | L,C,W; RN |
| 16x16 Nightmare,256 | 79.84/135.44 | 15.32 /25.99-33.70 | 7.72 /13.09-16.98 | 2.62-29.06 | Low;15/20 today, new completion unknown | L,C,W; RN |
| 15x20 Nightmare,300 | 40.09/111.21 | 16.24 /35.73-45.06 | 8.01 /17.62-22.22 | 2.70-27.38 | Low;15/20 today | L,C,W; RN |
| 18x18 Nightmare,324 | 37.25/134.52 | 14.78 /32.51-53.36 | 7.55 /16.61-27.26 | 2.57-24.84 | Low;20/20 but current large response tail remains a test target | L,C,W; RN |
| 18x20 Nightmare,360 | 16.80/63.12 | 13.21 /29.06-49.64 | 6.50 /14.29-24.41 | 2.62-12.17 | Low; already20/20, modest search gain | L,C,W; RN |
| 20x20 Nightmare,400 | 20.14/113.97 | 15.97 /35.14-90.37 | 7.92 /17.43-44.83 | 2.68-14.61 | Low;19/20; browser p95 not proved by the central case | L,C,W; RN |
| 20x21 Nightmare,420 | 24.17/47.92 | 14.51 /28.77-31.92 | 7.13 /14.14-15.68 | 2.62-17.22 | Low;20/20, maximum response still needs separate measurement | L,C,W; RN |
| 32x15 Nightmare,480 | 11.57/37.87 | 11.57 /25.44-37.87 | 5.74 /12.63-18.80 | 2.73-8.57 | Low; no first-search gain credited where incumbent wins | L,C,W; RN |
| 22x22 Nightmare,484 | 17.28/33.93 | 14.01 /27.51-30.83 | 6.65 /13.06-14.64 | 2.66-12.20 | Low;20/20, most gain kernel/pool | L,C,W; RN |
| 24x24 Nightmare,576 | 18.65/57.29 | 15.51 /34.12-47.63 | 7.61 /16.75-23.38 | 2.77-13.55 | Low;20/20; large-board permission/BQ remain separate | L,C,W; RN |
| 26x26 Nightmare,676 | 18.61/31.38 | 17.83 /30.05-39.22 | 8.84 /14.91-19.46 | 2.95-13.80 | Low; approximately2.1x central gain, not the earlier6.2x | L,C,W; RN |
| Hell1,196 | No T10;0/20; response115.01/221.85, max229.10 | NE; design work approximately110-130 before censoring | NE; design work approximately55-65 | Approximately17-210 construction only; may fail/count-cap | Very low; budget/window makes successful median/p95 unestablished | L,C,W; RH, not divided timeout |
| Hell1,576 | No T10;0/20; response115.02/210.91, max211.35 | Conditional50-60 /NE | Conditional25-30 /NE | Approximately7-100 construction only | Very low; no D39/BQ offer justified | L,C,W; RH |
| Hell1,676 | 108.72/167.59 conditional on9/20; max response206.66 | Conditional50-60 /NE | Conditional25-30 /NE | Approximately7-100 construction only | Very low;45% current completion, not a measured90% after | L,C,W; RH |
| Other Hell1:215,256,300,324,360,400,420,480,484 | No T10;0/3 each; response approximately115 | NE | NE | Unknown; do not interpolate area or divide115 | None for future availability | L; no unconditioned window evidence |
| Hell2:300-676, nine cells; Hell3:480-676, four cells | No T10;0/3 each; response approximately115 | NE | NE | Unknown; pack existence also unproved | None for future availability | L; no measured in-band cost |
| Matching stock /prepared pack | No common measured latency | Not part of first search phases | Lookup/validation epsilon, or rerating/transform work | Unknown until matching-hit and diversity measurements | Different product distribution; never ten symmetry copies as distinct layouts | Auxiliary/tasks/keys contracts; P9/P10 gates |
