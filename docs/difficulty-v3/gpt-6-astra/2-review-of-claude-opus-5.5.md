# Cross-review of SA1's independent Pentomino report

SA2, gpt-6-astra; 2026-11-12. Reviewed
`docs/difficulty-v3/claude-opus-5.5/1-report.md` against unchanged HEAD `77e62cb`.
This is a cross-review, not the joint report. Neither first report, the plan, nor the clarification file
was changed. Question IDs below use the orchestrator's `SA1-` / `SA2-` prefixes.

No Pentomino quick suite was run in this phase. New evidence comes from source reads and bounded
in-memory probes only. Full scope and developer gate pre-approval remain as stated in the first report;
recommendations requiring new behavioural choices are not treated as adopted.

## 0. Summary

There is strong agreement on the diagnosis, model metadata, incomplete metrics, unsound R3/R9 wording,
protocol correction, borrowed-array ownership, and replay provenance gaps. SA1 contributes valuable
prototype measurements, quantifies code-size growth, and explicitly identifies old-reader rejection of
a per-puzzle `made` field. Those should be in the joint report.

I would not sign these conclusions as currently phrased:

1. A multiple-solution puzzle necessarily needs a raw branch under solution-preserving deductions, but
   this does **not** prove that the fixed “multiple solutions lower the score” decision is contradicted.
   The proposed penalty still lowers the same metric vector by 2/4. The real issue is that branching
   ambiguity can dominate that discount, particularly because `tier=4` also adds four “rule” points.
2. “Decisive guesses” are a substantive alternative model, not a cheap correction. The proposed
   `k = number of successful alternatives` is not known after stopping at eight solutions, and a cutoff
   is not a failed alternative. A bounded proof/unknown contract is required before adopting it.
3. I reproduce the partial prototype's Hard/Expert/Master values, but Normal should score **9**, not 7,
   when its R6 deduction is counted as the plan's tier 2. A partial solver is not a proved upper bound
   on the full ladder's G, and these measurements do not establish an exact threefold retuning.
4. The rule bonus should explicitly distinguish deduction tier from “a guess happened”. SA1 retains
   an automatic four-point bonus for every guess; my first report removed it without sufficiently
   highlighting that this resolves an ambiguity in the plan. This needs an explicit answer.
5. I favour automatic legacy re-rating with an honest note, as P2.5 specifies; SA1 favours stored ratings.
   That disagreement belongs to the owner, not to an implicit scope reduction.
6. I now favour `generation.made[puzzleId]` for wire compatibility, but not an unmeasured 32-key overflow
   cutoff. Older readers preserve the free-form object on parse/serialize, not necessarily through the
   old Generator's state/export reconstruction.
7. Imported repeated shapes cannot simply be excluded from a full-scope rating design because generated
   sets reject them. I still favour an explicit interchangeable-piece policy over silently overrating them.

### What SA1 found that my first report did not establish

- The raw-multiple-solution branch theorem and the resulting lower bounds under the plan's **overall**
  tier-4 rule bonus.
- Concrete guess alternatives: recipe paths include 3/5, 7/10/9, and 6/2/7/5/7/6 alternatives.
- Measured code expansion; my first report identified the risk but did not measure payload size.
- Backward-reader rejection of a new puzzle field, and the compatible `generation` extension location.
- Additional pinned assertions in `tests/worker-pool.test.js:815`, `tests/policy.test.js:371` and
  `tests/generate.test.js:50`.

### What my first report adds to SA1's

- Work limits must bound lookahead/DP/incidence work, not only recursive search nodes.
- Missing first-solution metrics must not be manufactured as G=0; count evidence and path evidence need
  separate completion statuses.
- P4 needs set and candidate versions, target/uniqueness per candidate, saved-state round trips, exact
  final-board comparison, completion handling, both execution workspaces, and repair/exclusion tracing.
- The calibration command needs `--output`; the landscape runner does not emit the packs P3 expects
  and currently calls clue count `G`.
- Dropping code metrics conflicts with a strict v3 pack reader unless the claim schema is changed too.
- Old v2 fixture semantics should remain historical evidence rather than all being overwritten to fit v3.

## 1. New checks in this phase

### 1.1 Independent partial deduction probe

I implemented an in-memory measurement over `preparePlacements` / `visitPlacements`, with:

- R1/R2 propagation;
- a sound component-area subset-sum necessary condition;
- R6 tentative placement + propagation + component check, width 4;
- canonical MRV and row order;
- count cap 8 and search cap 20,000;
- first-path counters, without counting speculative propagation as final-path work.

A second run enabled the sound piece/cell R4/R5 column-subset rules. No repository code was changed.
Each puzzle had a 15-second analysis watchdog; actual maximum was 21 ms. Independent DLX counting
confirmed that all six recipe puzzles are unique.

| Recipe | U | G | First-path alternatives | Information | R6 removals, without R4/R5 | Plan-style score with correct rule attribution |
|---|---:|---:|---|---:|---:|---:|
| Very easy | 3 | 0 | none | 0 | 0 | 5 |
| Easy | 4 | 0 | none | 0 | 0 | 6 |
| Normal | 5 | 0 | none | 0 | 1 | **9** |
| Hard | 7 | 2 | 3, 5 | 3.90689 | 4 | 40 |
| Expert | 8 | 3 | 7, 10, 9 | 9.29921 | 4 | 68 |
| Master | 10 | 6 | 6, 2, 7, 5, 7, 6 | 14.10656 | 3 | 106 |

With R4/R5 enabled, G and information remain the same for these six puzzles. Normal uses a tier-2 locked
deduction instead of R6 and still scores 9. The source recipes are
`tests/fixtures/clue-recipes.js:31-38`; canonical row construction is
`core/engine/placements.js:185-230` and `core/engine/workspace.js:322-345`.

This independently confirms the large branching factors and poor initial band fit. It does **not**
validate R7-R9 cost, the complete v3 ladder, larger/Hell boards, or a proposed decisive-choice census.
Different search-node/probe counters from SA1 are expected because the prototype counter definition is
not yet a shared production contract.

### 1.2 Score arithmetic

With base 12, one binary raw branch, and the plan's automatic rule bonus 4:

| U / multiplicity | Score | Same inputs with zero penalty | With deduction-tier-1 bonus 0 instead |
|---|---:|---:|---:|
| U=3, few, penalty 2 | 17 | 19 | 13 |
| U=5, many, penalty 4 | 17 | 21 | 13 |

Thus SA1's thresholds are correct under that interpretation, but the penalty does lower the score.
The relative importance of free choices, rule tier and multiplicity is the open model decision.

Also tested the proposed boundary invariant: base max 12.5, rule max 4, U=128, scale=1 produces exactly
16.5 in JavaScript and rounds to 17. Therefore `base.max + rule.max <= 16.5` is not a robust JavaScript
guarantee. Use a strict bound below 16.5, preferably the simpler safety margin <=16.
The plan's 12+4 satisfies it.

### 1.3 Code length and pack compatibility

Regenerated the specified `probe1` Hard pack and `probe3` Expert pack with `tools/generate.mjs`; each child
had a 120-second limit. Encoded the first puzzle under raw and auto modes. The v3 fields were explicitly
synthetic payloads, not claims that an unimplemented v3 scorer produced those values:

```text
F=3, E=4, G=2, Gt=5, Cmax=4, Dmax=2, nodes=100, S=2, solutions='few'
```

The extended form also included information, tier and R1-R9 counts. Existing title, score, level and
diagnostic fields were held fixed to isolate serialization overhead.

| Payload | 10x6 full code raw / auto | 20x18 full code raw / auto |
|---|---:|---:|
| Existing compact v2 | 46 / 46 | 154 / 154 |
| Synthetic v3 plan metrics | 452 / 394 | 565 / 539 |
| Synthetic v3 extended metrics | 597 / 468 | 711 / 615 |
| v3 summary without metrics | 155 / 155 | 267 / 267 |
| No rating | 54 / 54 | 166 / 166 |

SA1's precise 454/410 etc. cannot be reproduced byte-for-byte without its exact synthetic claim, but the
approximately 9x small-code expansion is independently confirmed. “No rating” can be longer than compact
v2 because title compression uses the rating level (`core/engine/puzzlecode-v1.js:1038-1065`).

On the current reader:

- Adding `puzzles[0].made` fails with `unknown-field`, path `puzzles[0].made`.
- Adding `generation.made[puzzleId]` succeeds without warnings.
- A 5,000-character value in `generation.made` also succeeds: `generation` uses the 512-KiB file bound,
  **not** `meta`'s 4-KiB bound (`core/engine/pack.js:978-982`). It still needs application-level bounds.

## 2. Claim-by-claim review

### 2.1 SA1's top findings

| SA1 claim | Position | Evidence / qualification |
|---|---|---|
| 1. Several solutions force raw G>=1; given knobs can rate easy ambiguity Hard | **Agree with theorem and arithmetic; disagree with the claimed logical contradiction of decision 3** | Sound solution-preserving forced placements cannot select one distinct full solution from several without a choice. The two arithmetic rows above confirm the threshold. But subtracting 2/4 is still a lowering effect; no fixed decision says every multiple-solution puzzle must rank below every unique puzzle. |
| 1. Decisive G and `log2(c/k)` fix it | **Partly** | A reasonable alternative meaning of challenge, but bounded solution enumeration does not determine k. Unknown branches require explicit proof status; do not count a cutoff as failure. |
| 2. Base maximum 16 breaks forced cap; use 12 | **Agree; tighten the boundary proof** | `docs/difficulty-v3/plan.md:294-310` is internally contradictory. <=16.5 is unsafe under floating-point saturation; <=16 is sufficient. |
| 3. Real alternatives are much larger than two; knobs are about 3x too steep | **Agree on poor initial fit; partly on magnitude/generalisation** | Independent recipe probe confirms choices and scores 40/68/106. Normal is 9 with R6 attribution. Full R1-R9 and accepted-puzzle distributions are not measured yet; no universal factor of three follows. |
| 4. Missing information/tier/rules and conflicting stop names | **Agree** | The formula and P4 table need those inputs; `core/engine/types.js:55-74` only describes v2 today. Path and count stops must remain distinguishable. |
| 5. R3/R9 unsound wording; repeated shapes rejected by generation | **Agree** | R9 needs distinct-piece consumption; generated duplication is rejected at `core/engine/carve.js:707`, imported duplication only warns at `core/engine/pack.js:574`. Imported sets are still supported inputs. |
| 6. P0.1 lacks dimensions/sizes/shape identity | **Agree** | Those values exist in `core/engine/placements.js:28-43, 217-230`, but not the returned model at `core/engine/tiling.js:54-74`. |
| 7. No strict result metric whitelist in protocol | **Agree** | `core/engine/protocol.js:491-516, 827-867`; new replay task payloads still require validation. |
| 8. JSON code payloads grow roughly 9x | **Agree** | New measurements above corroborate the effect. Do not equate fitting QR limits with acceptable manual-entry length. |
| 9. More v2-pinned tests than plan lists | **Agree** | `tests/clues.test.js:86-96, 145-177`, `tests/difficulty.test.js:56-66`, `tests/worker-pool.test.js:815`, `tests/generate.test.js:50`; preserve historical claims where that is their purpose. |
| 10. Set attempt lost, retained-best origin needed, old readers reject `made` | **Agree** | `generator/jobs.js:283-296`, `generator/state.js:1300-1328`, `core/engine/generate.js:528`, `core/engine/pack.js:200`. |

### 2.2 Step reviews and resolutions

| Step / SA1 recommendation | Position and merged correction |
|---|---|
| P0.1 expose views and dimensions, sizes, optional shape keys | Agree. Add a precise borrowed-lifetime guard and canonical mapping; `core/engine/tiling.js:77-83` already guards existing solver access. |
| P0.2 “algorithm correct as written” | Partly. Basic reversible exact cover is sound, but work accounting, selected-row eligibility, speculative counters, missing first solution, count-cap stop and duplicate semantics remain underspecified. They are required before a developer can implement a complete contract. |
| P0.2 unique-puzzle G is independent of alternative order | Agree only for a completed, deterministic, no-learning search with identical deduction/column policy. A cutoff may prevent finding the path; persisted failed-branch learning or changed column ties changes the premise. Seeded DLX randomises column ties too (`core/engine/dlx.js:230-278`). |
| P0.2 partial solver G is an upper bound on full-ladder G | Disagree as a general theorem. More pruning can change MRV column selection, hence the sequence of decision variables. Without a monotonicity proof, call the partial values characterisation, not upper bounds. The measured R4/R5 additions happen to leave these six G values unchanged. |
| P0.2 retain 20,000 nodes, measured cost is small | Partly. Retain as a candidate cap, not evidence that lookahead/DP/rule work is bounded. An imported large model can have up to 600,000 rows and 5,000,000 nonzeros (`core/engine/placements.js:46-47`). |
| P0.2 saturation only before first solution | Reasonable recommendation, but not an implementer-only correction. It changes what “+” means; counting may remain incomplete after path metrics become complete. Return separate statuses and settle the public flag under SA2-Q-P02. |
| P0.2 recipe monotonicity | Measured for the partial solver, not a universal invariant. Pin the measured table with clear solver/version attribution; do not make old v2 labels a requirement the complete ladder must preserve. |
| P0.2b R3 placement using DP and one full-region row | Sound sufficient condition for connected pieces. Excluding all partitions into two or more pieces may be conservative; it does not justify placing a merely size-matched piece. |
| P0.2b R4/R5 as column-subset kernel | Agree for the stated piece/cell cases. Adding cell-to-cell deductions is an extra catalogue capability and affects scores; ask SA2-Q-P12 rather than silently counting them as R4. |
| P0.2b R7 2D size/imbalance DP | Agree with optional-piece allocation, one use per remaining piece, and exclusion of a tentatively selected piece. “Eligible in region” does not mean “must be allocated there”. |
| P0.2b R8 adds value mainly beyond width 4 | Agree for the proposed R6 closure: use a wider-neck positive test so R6 does not subsume it. Recompute the actual residual components after selecting the entire row. |
| P0.2b corrected R9 | Agree. Retain the domino/square counterexample and tests over all solutions of tiny boards, not only a planted witness. |
| P0.2b duplicate limitation and optional Player hint omission | Imported duplicate handling remains an owner decision. Excluding the explicitly optional Player hint extension is reasonable and does not remove R1-R9 or Generator replay. |
| P0.3 `--knobs` and fitting before activation | Agree. Include complete path/count/work status and rule attribution. A diagnostic column-order policy is needed to measure G noise; `--orders` cannot merely vary DLX and infer deduction stability. |
| P1 current central hit versus best observed | SA1's clarified rule is sound in `any`: the first central-window hit is closer than all earlier off-window hits. On budget/exhaustion choose the ranked retained candidate. My earlier wording overstated a central-hit problem. |
| P1 `require`: raw-ranked candidates, first repair that passes | Acceptable as the plan-preserving policy. Memoise repair outcomes and recheck final band/exclusion keys. Optimising across every repaired score is a stronger policy, not mandatory to implement the existing plan. |
| P1 reverse the bias direction | Agree that the written explanations are backwards; disagree with claiming the reversed heuristic is generally monotone. Geometry and scoring paths can reverse it. Prefer uniform sampling initially. |
| P2.1 base/rule table and preserve `SCORE` as v2 | Preserve immutable v2 constants; agreed. The automatic tier-4 rule bonus is unresolved, SA2-Q-P13. Do not call one/two binary-guess examples universally 22/32 without the tier interpretation. |
| P2.1 drop diagnostic DLX if expensive | Not an automatic implementation option: the plan promises B diagnostics. Measure first; an omission/sampling policy needs an explicit scope/format decision. |
| P2.2 no protocol metric change | Agree; still add v3 round-trip coverage and the replay task reader. |
| P2.3 strict v3 / opaque legacy v2 | Agree, but a summary-only v3 code is incompatible with a required-metrics v3 reader unless its claim schema is changed. Coordinate P2.3 and P2.4. |
| P2.4 omit metrics in codes | Plausible owner option, not a one-line writer edit. `core/engine/puzzlecode.js:163-205` validates through the pack boundary; decoded payloads also validate packs. Decide full versus summary claim handling and absent-table behaviour. |
| P2.5 stored older rating instead of re-rating | Disagree with recommendation: retain the plan's automatic derived display rating unless the owner explicitly changes P2.5. Preserve source title/code/claim and label any mismatch honestly. |
| P3 fit before fixture recording | Agree. Do initial fitting after the full intended rule ladder, before activation; finish generation qualification after P1 and v3. Do not tune solely to old v2 recipes. |
| P3 command / output | SA1 misses that `--output` is mandatory, not merely a destination choice (`tools/calibrate.mjs:121-123`). Add benchmark metric retention or exact-recipe regeneration: the runner does not write the proposed packs (`tools/bench/runner.js:682-701`). |
| P4 engine-origin provenance and compatible map | Agree, with set/candidate version separation, actual completion layout/stream handling and persistence. A blanket global-version rejection can unnecessarily disable replay of a new batch made from an older/imported set. |
| P4 fixed 32 skipped keys then unavailable | Not adopted. This is a new availability limit with no measurement. Prefer compact layout-index bitsets and an explicit byte/work bound; include repaired-result exclusions as well as `rateSubset` skips. |
| P4 sample fixture gains ordinary provenance | Partly. `tools/record-fixtures.mjs:132-165` uses special `sample/<level>/<i>` streams. It does not become an ordinary slot/attempt fixture simply by rerunning the recorder. |
| P4 recorder/UI | Agree in principle. Add missing recorder propagation through `setAttempt`/`puzzleCandidate`/`selectClues`/`makeUnique`; separate test files do not remove shared implementation ownership. Use real locale dictionaries, not `generator/strings.js` alone. |

## 3. The decisive-choice proposal

### 3.1 What is proved and what is not

For **raw distinct solutions**, sound rules that preserve all solutions cannot finish an entire puzzle
using only forced selections. That supports SA1's raw G>=1 result. It does not establish a total ordering
between puzzles of different solution counts, U, topology and deduction complexity.

The existing fixed decision is compatible with a penalty term that lowers otherwise equal metrics. The
owner may nevertheless intend the stronger, useful notion that “choose anything; all choices work” must
not generate a Hard label. Ask that explicitly; do not present one interpretation as logically forced.
The interaction with identical-piece permutation equivalence must be decided at the same time.

### 3.2 A safe bounded census contract

If the owner chooses decisive guesses, each first-path branch needs:

```text
{ alternatives:c,
  provedSolvable:kLow,
  provedImpossible:f,
  unknown:c-kLow-f }

k lies in [kLow, c-f].
info lies in [log2(c/(c-f)), log2(c/kLow)].
```

The selected solution path proves `kLow>=1`. A proved failure establishes a decisive choice; all
alternatives proved solvable establishes a free choice. With unknown alternatives and no proved failure,
neither conclusion is established.

Stopping ordinary enumeration at S=8 does not establish k for a 28-alternative node. An exhausted
unsatisfiable subtree counts as failure; a node/work cap does not. Reuse exhausted subtrees where possible,
but give any additional existence probes a joint deterministic work budget. “2-4x cost” is a sample-level
expectation, not an algorithmic bound.

Do not silently substitute k=1, k=c, or k=solutions found. Either:

- require complete decisive-path evidence before issuing this model's rating;
- define a separately labelled interval/incomplete estimate; or
- keep raw G as the production model and expose decisive statistics as diagnostic evidence first.

My recommendation is to prototype the bounded census in the measurement phase, compare hit rates/costs,
and ask the owner to select its scoring/incomplete policy. I cannot sign “decisive G” as a drop-in
implementation-only fix.

## 4. Question reconciliation

### 4.1 Position on every SA1 question

| SA1 ID | Maps to | Current position |
|---|---|---|
| SA1-Q-P1, real versus free choices | New issue relative to my first list; interacts with SA2-Q-P02/P03/P13 | Keep as an owner question. Agree ambiguity can be over-rewarded; do not claim a formal contradiction of the existing penalty decision. Prototype decisive census with unknown handling before adoption. |
| SA1-Q-P2, old ratings | SA2-Q-P08 | Disagree with stored-only recommendation. Prefer automatic derived v3 display plus original-model/title note, leaving code and stored claim intact. Stored-only needs an explicit P2.5 change. |
| SA1-Q-P3, code length | Broaden SA2-Q-P07 | Agree this is not only a QR-fit question. Present full JSON, schema-supported summary and new compact codec with measured lengths. Keep full JSON as the safe default until the owner selects otherwise; summary requires coordinated reader changes. |
| SA1-Q-P4, provenance location | Broaden SA2-Q-P10 | Agree: prefer `generation.made[puzzleId]` for current-reader compatibility, plus immutable set origin and typed internal candidate provenance. Bound the structure and preserve it in new app state. |
| SA1-Q-P5, sampling bias | SA2-Q-P05 | Agree on uniform sampling first. Reversed weighting is an experiment, not a proven correction. |
| SA1-Q-P6, duplicate shapes | SA2-Q-P03 | Disagree with raw-count-only default as the final human rating design. Prefer explicitly quotienting interchangeable copies for difficulty, retaining raw certificates and clearly distinguishing them. If cost forces the raw limitation, obtain owner acceptance. |

### 4.2 Disposition of my first questions

| SA2 ID | Disposition |
|---|---|
| SA2-Q-P01, base 12 versus 16 | Can be resolved as an author erratum: use the stated 12-based equation and the fixed forced cap. A new clamping model is an owner choice only if someone still proposes it. Do not delay implementation over the obvious unsafe literal 16+4 combination. |
| SA2-Q-P02, caps/incomplete | Retain. Add decisive-census budget and separate path/count completion; SA1's saturation change is not automatically adopted. |
| SA2-Q-P03, interchangeable pieces | Retain; direct conflict with SA1-Q-P6. |
| SA2-Q-P04, centre search | Retain the 48/64/window/tie policy decision. My stronger repaired-score optimisation is optional; raw-ranked first successful repair is acceptable. |
| SA2-Q-P05, weighted sampling | Merge SA1-Q-P5; recommend uniform. |
| SA2-Q-P06, order aggregation | Retain if a production median is proposed. One canonical order is the default; distinguish row-order and column-order experiments. |
| SA2-Q-P07, code/QR policy | Merge SA1-Q-P3 and broaden to typed/printed code length and strict summary-claim compatibility. |
| SA2-Q-P08, legacy presentation | Merge SA1-Q-P2; disagreement remains. |
| SA2-Q-P09, calibration freedoms | Retain; fitting before activation is agreed, but automatic cap/table/diagnostic changes are not. |
| SA2-Q-P10, provenance/fallback | Merge SA1-Q-P4; recommend compatible wire map, compact skip data and explicit stage availability. |
| SA2-Q-P11, optional Player explanations | Recommend closing as scope clarification: keep the full R1-R9 catalogue and Generator replay, leave the explicitly optional Player hint extension out. If “full” was intended to include that optional extension, the owner can explicitly restore it. |

### 4.3 Questions missing or insufficiently explicit in both first lists

- **SA2-Q-P12 — Does R4 include cell-to-cell locked-column deductions?**
  Options: (a) original piece/cell R4/R5 only; (b) general column-subset closure including cell/cell,
  with updated rule description, tests and calibration. I recommend (a) until (b) is explicitly approved;
  using a generic kernel does not require enabling every column-type pairing.
- **SA2-Q-P13 — What feeds the rule bonus?**
  Options: (a) hardest actual deduction tier, with raw/free/decisive choices separate;
  (b) overall tier, so every guess adds the tier-3 four-point bonus;
  (c) a separately named first-guess bonus. I recommend (a). This materially changes the small
  multiple-solution thresholds and needs an explicit answer.

**Merged active list:** SA1-Q-P1; SA2-Q-P02, P03, P04, P05, P06, P07, P08, P09, P10, P12, P13.
SA2-Q-P01 is an author erratum and P11 a scope clarification, not fresh product policy by default.
No clarification file was edited.

## 5. Merged task breakdown I would sign

### 5.1 Comparison of the two first breakdowns

- Keep SA1's initial fitting **before** v3 activation/fixture rewriting; my final calibration task must not
  be the first time the coefficients are tested.
- Keep my separation of model/state, rule work, formats, app display, provenance, replay and validation.
  SA1 PT1/PT2 become too large if decisive census and interchangeability are included in those two rows.
- Add my missing benchmark-retention task. Keep SA1's measured code-format decision as a separate task,
  but coordinate its claim schema with strict pack reading.
- Do not defer living documentation from P0/P1 to PT5 merely to manufacture file-disjoint parallelism.
  `AGENTS.md` requires the living specification to describe current code.
- PT6/PT7/PT8 are not safely independent if calibration changes the constants whose compact code or UI
  claims they are testing. A codec that freezes the final v3 formula waits for the formula lock.
- Recorder plumbing spans files missing from PT10's ownership list: `core/engine/generate.js` and
  `core/engine/clues.js` need hooks too, including repair ratings and skip decisions.

### 5.2 Execution and ownership

One developer holds the repository write/validation lease. Overlapping files below transfer only after
the predecessor is verified. Every task updates directly affected living design/paired guides in the same
change. The other repository can execute independently; timing qualification should additionally reserve
a quiet-machine measurement slot.

| ID | Scope / source tasks | Prerequisite | Exclusive implementation/test files while active | Size / developer gates |
|---|---|---|---|---|
| MP01 | Model metadata, canonical identity and live-view contract; PT1 / PV3-01 | Relevant owner/author contracts | `core/engine/tiling.js`, `core/engine/placements.js`, `core/engine/workspace.js`, model/workspace tests | S-M; quick + check |
| MP02 | Reversible R1/R2, R3 necessary check, R6, bounded search and first-path/count states; PT1 / PV3-02/03 | MP01 | New `core/engine/deduce.js`, `core/engine/policy.js`, `tests/deduce.test.js` | L; quick + check |
| MP02b | Conditional decisive-path census and bounded unknown evidence | MP02, SA1-Q-P1 answer | Deduction module, policy limits, census-specific tests | M-L; quick + check; omitted only if raw-G model selected |
| MP03 | Named R3 placement/R4/R5/R7/R8/R9 and duplicate policy; PT2 / PV3-03/04 | MP02, relevant rule/duplicate decisions | Deduction module, model group metadata if needed, new `tests/deduce-rules.test.js` | Split into <=L packs; quick + check |
| MP04 | Complete-ladder probe, order diagnostics and initial coefficient fit; PT3 / PV3-05 | MP03 and MP02b if selected | New `tools/rate-probe.mjs`, probe tests, new dated probe evidence | M; bounded probes, quick + check |
| MP05 | Centre-seeking selection and deterministic repair/exclusion policy; PT4 / PV3-06 | v2 baseline captured; Q-P04/P05 answer | `core/engine/clues.js`, `core/engine/version.js`, clue/generation tests and approved generation fixtures | M-L; P1 recorder + `npm test` |
| MP06 | v3 breakdown/measurement/types and full/summary claim contract; PT5 / PV3-07/08 | MP04, MP05, selected model/claim decisions | `core/engine/difficulty.js`, `core/engine/policy.js`, `core/engine/types.js`, `core/engine/pack.js`, rating/pack/generation/worker tests | L; P2 generation fixture gate + `npm test` |
| MP07 | Retain v3 metrics in calibration output, add meaningful quick/slow acceptance tests; PT8 / PV3-10 | MP06 | `tools/bench/runner.js`, report/aggregation modules, calibration tests, v3 tests | M-L; quick + check |
| MP08 | Generation calibration and coefficient lock; PT8 / PV3-14 initial part | MP07 | Approved knobs in policy/count-share tables, v3 expectations and new calibration evidence | M; landscape shards + probe, fixture updates as justified, `npm test` |
| MP09 | Code payload policy, old-code compatibility and 676-cell size matrix; PT6 / PV3-08 code portion | MP06; MP08 for any frozen compact codec | `core/engine/puzzlecode*.js` only as needed, code tests and new v3 goldens | S-L by owner choice; planned code/QR acceptance gate |
| MP10 | Legacy display behaviour in Player and Generator; PT7 / PV3-09 | MP08, MP09, Q-P08 answer | `player/state.js`, `player/app.js`, `player/strings.js`, Generator import/state/jobs/rating UI, four real locale files and associated tests | M-L; quick + check; affected share/print browser checks |
| MP11 | Provenance through candidate, fold, Generator persistence and compatible pack map; PT9 / PV3-11 | MP08, Q-P10 answer | `core/engine/generate.js`, `core/engine/types.js`, `core/engine/clues.js`, `core/browser/generation-client.js`, `generator/state.js`, `generator/jobs.js`, pack adapter/tests | L; provenance fixture gate, quick + check |
| MP12 | Engine recorder and replay worker task; PT10 / PV3-12 | MP11 | `core/engine/carve.js`, `core/engine/tiling.js`, `core/engine/clues.js`, `core/engine/generate.js`, new `core/engine/replay.js`, `core/engine/tasks.js`, `core/engine/protocol.js`, recorder/replay/task tests | Split into <=L packs; quick + check |
| MP13 | Replay views, score table, accessible dialog and UI integration; PT11 / PV3-13 | MP10, MP12 | New Generator replay dialog, `generator/app.js`, puzzle panel, SVG overlay/CSS, Generator locale/formatting files, browser replay test | L; replay browser gate, quick + check |
| MP14 | Final post-provenance/replay compatibility and regression evidence | MP13 | Only necessary final fixture/test/doc corrections and new final evidence | M; final full tests/affected browser gates; recalibrate only if scored/generated semantics changed |

Named file groups are not ownership grants over arbitrary code. Task packs should enumerate their exact
test and locale filenames before dispatch.

```text
MP01 -> MP02 -> [MP02b] -> MP03 -> MP04 --+
v2 baseline -> MP05 ---------------------+-> MP06 -> MP07 -> MP08 -> MP09 -> MP10 --+
                                                           MP08 -> MP11 -> MP12 --+-> MP13 -> MP14
```

The graph shows semantic prerequisites, not permission for simultaneous writes to shared docs/tests.
MP05's engine code is largely disjoint from early deduction work, as SA1 notes, but the shared test-artifact
directory, live documentation and mutable baseline fixtures make serial execution the safe default.
No intra-repository parallel developer is needed. Cross-repository implementation is genuinely independent.

### 5.3 Gate allocation

- **P1 fixture + full tests:** MP05 runs
  `node tools\record-fixtures.mjs --replace --reason "P1: clue selection aims at the band centre"`
  and `npm test`.
- **P2 fixture + full tests:** MP06 owns activation-related updates and `npm test`; retain frozen v2
  codec/recipe evidence and add v3 expectations rather than overwriting compatibility history wholesale.
- **P2 code/QR measurement:** MP09 owns raw/auto, with/without tail, legacy/current claims, URL/QR and
  676-cell checks. MP10 owns display/printed-caption integration.
- **P3:** MP08 owns the corrected landscape command with output under `docs/difficulty-v3/`, matched
  probe runs, approved coefficient changes and any necessary regenerated fixtures.
- **P4 provenance:** MP11 owns truthful provenance fixture recording; the special sample streams need an
  explicit fixture kind or a separate ordinary-generated replay fixture.
- **P4 browser:** MP13 owns `tests/browser/replay.html` and relevant existing dialog/share checks.
- **Final:** MP14 owns final regression evidence. A bounded benchmark should stay attached/monitored,
  not detached merely because it is slow. Split long probes/measurement batches and record incomplete
  outcomes; do not evade the ten-minute test/probe rule by relabelling a probe a tool.

The permission is already granted. The task that changes behaviour must include the approved updates
necessary to leave its required quick checks green.

## 6. Errata to my first report

The first report is left unchanged as the independent record. These points supersede or qualify it:

1. **Multiplicity interaction:** I did not explicitly prove raw S>1 implies a branch, or calculate the
   resulting small-puzzle Hard threshold under an overall-tier rule bonus. Add that evidence, without
   overstating it as a mathematical contradiction of a subtractive penalty.
2. **Rule bonus:** My recommended `deductionTier` excluded guesses. That is a deliberate resolution of
   ambiguous plan wording, not already an agreed constant definition. It is now SA2-Q-P13.
3. **Provenance wire placement:** I proposed a new puzzle field and noted the whitelist, but did not give
   current-reader compatibility enough weight. Prefer an internal candidate field serialized through
   `generation.made`, pending the owner decision.
4. **Code size:** The risk is now measured, not merely a future QR check. A summary-only claim needs a
   corresponding strict-reader contract; QR fit is not the whole usability requirement.
5. **P1 selection:** A first central-window hit in `any` is necessarily better than earlier off-window
   hits. My wording suggesting otherwise was too broad. Raw-ranked first successful uniqueness repair
   is sufficient for the plan; globally optimising repaired scores is optional.
6. **Calibration order:** Move initial fitting after the complete measurement ladder but before activation
   and fixture rewrite, retaining final generation qualification afterwards.
7. **Additional pins:** Add the policy/worker-pool/generation assertions SA1 identified to the integration
   task, while preserving old v2 tests whose purpose is historical compatibility.

## 7. Sign-off position

I would sign the merged task order and the soundness/format corrections above, conditional on the active
model and UX answers. I would not sign an unqualified decisive-guess formula, a guaranteed 2-4x cost,
an assumed threefold weight reduction, automatic guessed saturation values, or a silent removal of the
P2.5 re-rating feature.

SA1's 31-47 hours is explicitly developer-agent time; my 88-139 hours was engineering effort. They are
not measurements of the same quantity and should not be averaged. Both identify the same critical risk:
complete solver semantics, evidence and integration dominate the arithmetic.
