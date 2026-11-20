# Response to SA1's review: Pentomino difficulty v3

SA2, gpt-6-astra; 2026-11-12. Response to
`docs/difficulty-v3/claude-opus-5.5/2-review-of-gpt-6-astra.md`, against unchanged HEAD `77e62cb`.
This supersedes the positions identified below, not the independent observations in either first report.
The plan, clarification file, other analyst's files and application code are unchanged.

No test suite or heavy gate was run. Source checks and one arithmetic probe were read-only. Developer
gate permission is already granted; it does not settle a new model, scope or UX decision.

## 0. Changes in my position

- Accept SA1's move to the actual deduction tier, rather than automatically awarding four rule points
  for a guess. We now recommend the same interpretation.
- Accept `generation.made[puzzleId]` as the provenance wire location. Keep a typed origin on internal
  candidates; an internal field does not require the same field on `PackPuzzle`.
- Now favour summary-only v3 claims in codes, provided the owner approves the coordinated optional-metrics
  claim schema. Generated ratings and exported generated packs retain full, bounded metrics.
- Accept the existing real-valued band centre and the draft P1 stopping thresholds as the baseline.
  My proposed integer-score centre is withdrawn.
- Accept initial fitting before activation and final coefficient locking before P4. A final post-P4
  task verifies compatibility and absence of scoring changes; it is not the first calibration.
- Do not accept the current DFS prefix as a completed v3 difficulty measurement. Cap-before-first-solution
  and interchangeable-piece semantics remain substantive disagreements.
- Accept the free-choice problem. Recommend evaluating the bounded decisive model, but its incomplete
  evidence policy must be explicit before it can replace raw G.

## 1. Point-by-point response

### 1.1 Main disagreements D1-D10

| SA1 item | Response | Change or remaining requirement |
|---|---|---|
| D1: several solutions force a guess; only decisive guesses should count | **Partly.** The theorem for raw distinct solutions is correct. A fully proved free choice should not earn difficulty under the decisive interpretation. The theorem alone does not choose that interpretation or solve bounded census. | Add the theorem, the free-choice score increase and the census contract in section 2. Treat the choice as SA1-Q-P1, not an already adopted correction. |
| D2: prefer SA2's deduction-only rule term | **Accept.** | Keep separate `deductionTier` and overall search tier. `rule` uses only `deductionTier`; actual free/decisive/raw branching remains separately visible. Confirm the plan wording before freezing the model. |
| D3: cap before the first solution publishes current-path G/info with `+` | **Reject as the definitive rating contract; owner can choose a separately defined estimate.** | Keep `first:null`, work counters and an incomplete status. Do not silently give these statistics the type or explanation of final-path difficulty. Section 2.2 explains why the v2 precedent is not equivalent. |
| D4: implement P2.5 automatic derived display re-rating | **Accept; agreement now.** | Preserve the stored claim and code, use fingerprint/model-keyed asynchronous display results, drop stale replies and show an honest note. An included solution must not bypass the re-rating request. |
| D5: provenance belongs in `generation.made` | **Accept; my phase-two response had already changed to this.** | Current `PUZZLE_FIELDS` is closed (`core/engine/pack.js:55, 188-208`). The generation object is extensible (`core/engine/pack.js:978-982`). New app state must preserve the map; old app reconstruction need not do so. |
| D6: raw identical-piece counts because generation rejects twins | **Reject as the preferred final human-rating semantics.** | Generated sets reject twins, but imported packs explicitly accept them with a warning (`core/engine/carve.js:697-707`; `core/engine/pack.js:569-574`). Prefer a multiplicity-aware rating, raw certificates retained. Raw imported ratings with an explicit limitation are an owner alternative, not a fact forced by the generator. |
| D7: omit metrics in codes; keep metrics within 4,096 bytes | **Accept the size bound; accept the summary recommendation conditionally.** | Distinguish a computed rating from a serialized claim. A summary-only current claim must be accepted at both pack-validation boundaries of the code path. Missing metrics are absent evidence, never manufactured zeros. See section 2.3. |
| D8: fit before activation and lock before P4 | **Accept.** | Complete intended deductions and selected G semantics first, fit with P0.3, activate, qualify generation, then lock before provenance/replay fixtures. My original last-task calibration order is withdrawn. |
| D9: some questions are author/implementer matters | **Partly.** | Base 12 and preserving the written P1 centre are author corrections. Optional sampling, new aggregation, hints and changed incomplete-rating behaviour still need the stipulated decision process. Calibration permission is not unlimited permission to alter the human-difficulty contract. |
| D10: engineering hours versus agent hours | **Accept.** | The estimates have different denominators. Do not average them or promise an elapsed delivery time from either. Retain sized tasks and measured gate durations. |

### 1.2 Responses to the remaining review claims

These rows cover the agreements and qualifications in SA1 sections 1.1, 1.3, 1.4, 2.1, 2.3 and 4.3.

| Claim or proposed resolution | Response and evidence |
|---|---|
| Both reports reproduce the three probes; 10x6 Hard sizes are 4..9 | **Accept.** No new generation run was needed in this phase. Keep the recorded baseline and correct the plan's 5..8 wording. |
| The forced-score guarantee holds iff `base.max + rule.max <= 16.5` | **Reject the stated general floating-point boundary.** The repeated JavaScript probe with U=128, base max=12.5, scale=1, rule=4 gives exactly 16.5 and rounds to 17. Use `<16.5`, preferably the simpler safety margin `<=16`; 12+4 satisfies it. |
| Unsound R3 placement/R9 wording; optional-piece parity DP; actual R8 residual components | **Accept.** Adopt the corrected conditions and tiny all-solutions counterexamples from both reports. Do not weaken the oracle to one planted solution. |
| R4 may silently include cell-to-cell column locking | **Partly.** The generalized deduction is sound, but it extends the written piece/cell catalogue and changes rule counts and scores. Keep SA2-Q-P12 explicit. A reusable kernel does not require enabling every column-type pairing. |
| Connectedness is an input invariant | **Accept with the API precondition documented.** Imported pieces are checked by `core/engine/pack.js:486`; generated pieces by `core/engine/carve.js:697`. Model metadata and debug assertions should retain the assumption. |
| Missing metrics, separate path/count stops, first/search/count structure | **Accept.** A completed path can coexist with an incomplete solution count. Census completion, if selected, is a third independent fact. Raw branch depth is not necessarily decisive G once free choices are excluded. |
| P0.1 needs dimensions, sizes, canonical mapping and liveness | **Accept.** Use `PlacementPlan` metadata in `core/engine/placements.js:28-43` and the existing model-lifetime guard in `core/engine/tiling.js:77-83`. |
| Work and memory accounting beyond a node cap | **Accept.** Correct the minor line drift: `MAX_ROWS`/`MAX_NONZEROS` are at `core/engine/placements.js:47-48`. A transpose can itself contain 5,000,000 integers. Charge row scans, propagation, DP and existence probes; check allocation bounds before allocating. |
| The worker result protocol needs no v3 metric whitelist change | **Accept.** `core/engine/protocol.js:491-516, 827-867` has the previously reported behaviour. Replay still needs a task kind and bounded payload reader. |
| Unique-puzzle first-path G is independent of alternative order | **Accept with its premises stated.** This concerns a completed deterministic no-learning run with the same column ties and deduction policy. It says nothing about cutoff success, total trials, or another MRV policy. Vary column ties in the probe. |
| Partial recipe G is an upper bound on the full ladder, or proves a universal threefold weight correction | **Reject as established conclusions.** Extra pruning can change MRV choices; no monotonicity proof was supplied. The independent partial probe confirms 40/68/106 but Normal is 9 when R6 is attributed as tier 2. These are measurements to fit against, not final coefficients or a theorem about full R1-R9. |
| Pin recipe values rather than claim universal monotonicity | **Accept.** Preserve v2 history and add an attributed v3 characterization. A new named deduction may legitimately change a recipe's ordering; investigate rather than inflate weights solely to preserve the old label. |
| P1 state machine, repair memoization, copied placement counts | **Accept.** Keep the same centre as `ranked()` (`core/engine/clues.js:171-175`), first central-window hit, ranked fallback at the written threshold/exhaustion, and raw-ranked first successful repair. My stronger repaired-score optimization is not required. |
| Profile limit covers every rating including uniqueness repair | **Reject if stated that broadly.** Repair ratings occur at `core/engine/clues.js:239-241` outside the subset-profile counter. Report both counts; do not make a false 64-total-ratings test. |
| Keep uniform sampling rather than reverse the draft bias automatically | **Accept as the joint recommendation.** Neither direction is a monotonic law of interlocking geometry. Optional weighted behaviour remains an owner choice. |
| Keep immutable `SCORE` and old codec maths; add v3 constants/exports | **Accept.** The pack reader needs no v2 recomputation; the frozen codec has its own maths. Add the policy/worker/generation assertions SA1 identified to activation coverage. |
| Keep the v2 DLX B diagnostic only if affordable | **Partly.** Measure its cost, but dropping a promised diagnostic is not an implicit implementation freedom. Any changed diagnostic policy needs an explicit resolution. |
| New calibration records use `clues`, not overloaded G; output path is mandatory | **Accept.** `tools/bench/runner.js:687-690` uses G for clue count, and `tools/calibrate.mjs:121-124` requires output. Retain old records, adapt readers deliberately and make v3 metrics available to the matching probe. |
| Provenance content includes winning set/candidate origin, observed start, level and uniqueness | **Accept.** Keep provenance with the candidate from creation, not the fold's current attempt; `core/engine/generate.js:180-183, 528`. Persist it through saved sets and import/export. |
| At most 32 skipped keys, or bitsets, either is fine | **Partly.** Encoding choice can be technical, but a 32-key unavailable threshold changes replay availability and needs evidence. Prefer compact bitsets plus explicit byte/step bounds and overflow status. Include repair/exclusion decisions, not only raw subset skips. |
| Completion replay shows only available stages | **Accept in principle.** Show stages 1-3 only when the exact original set can be reproduced; stage 7 can describe the known final puzzle. Do not simulate unavailable 4-6 steps or stamp an imported set with the current generator version. |
| The sample fixture cannot simply acquire ordinary provenance | **Accept.** `tools/record-fixtures.mjs:132-165` uses special sample streams. Add an ordinary generated replay fixture or an explicitly supported sample provenance kind. |
| Separate observer/control hooks; two workspaces; exact final-state comparison; sibling UI button | **Accept.** Use the detailed P4 contracts already recorded. A changed attempt can coincidentally produce the same result; compare actual boards/pieces/clues, not an assumed inevitable mismatch. |
| Real locale dictionaries, living docs and serial checkout ownership | **Accept.** Include all four locale files and paired guides. No parallel developer or simultaneous quick suite on this checkout. |

## 2. Contracts that must survive the merge

### 2.1 Free choices and bounded decisive evidence

SA1's proof establishes S>1 implies a raw branch under solution-preserving deductions. The fixed decision
can mean either a marginal multiplicity discount or the stronger rejection of difficulty from freely
interchangeable solutions. I agree the latter is useful; the owner must select the model, not an analyst's
interpretation by implication.

If decisive guesses are selected, for each first-solution-path branch retain:

```text
c = live alternatives
kLow = alternatives proved to have a solution
f = alternatives proved impossible by exhaustive search
unknown = c - kLow - f

kLow >= 1 on a completed solution path
k is in [kLow, c - f]
information is in [log2(c / (c - f)), log2(c / kLow)]
```

Only a completed failed subtree increments f; hitting a node/work cap does not. Reaching eight total
solutions does not reveal which of 28 alternatives have any solution. All alternatives proved solvable
means a free choice. Any proved failure means the node is decisive, but its information may still be
an interval. No failure and some unknown alternatives does not prove a free choice.

The probe must measure census completion separately from finding a path and counting S. Raw G, decisive
G, total trials and raw depth remain distinguishable. Use one deterministic work budget across search
and supplementary existence probes. The production rating needs either complete selected-model evidence
or the explicit incomplete policy chosen under SA2-Q-P02; it cannot invent k=1 or k=c.

I support a bounded decisive prototype before fitting. I do not sign a promised 2-4x cost or an automatic
replacement of raw G merely from a six-puzzle partial prototype.

### 2.2 Cap before the first solution

The old saturated B is deliberately pinned to the policy maximum even when a test lowers its actual
search limits (`core/engine/difficulty.js:56-100`). SA1 proposes a different estimator: the current DFS
prefix. That prefix might lead only to a dead end; it is neither the completed solution path nor a
lower bound on that path's G/information. Under decisive scoring its kLow can also be zero.

My preferred contract remains:

- before any completed path: `first:null`, `status:'incomplete'`, complete work/cap diagnostics;
- generation consumes the attempt/profile work and skips this unrateable candidate;
- completed path but unfinished count/census: retain the completed evidence and separate unknown fields;
- an optional fallback estimate must say which estimate it is, not impersonate final-path measurement.

SA1 is right that skipping may lose high-level hit rates. Measure and report that cost. It is not evidence
that a temporary DFS prefix is an accurate substitute. If the owner chooses the `+` proxy, task packs must
specify its metric source, no-proof meaning, acceptance policy, replay explanation and census behaviour.
I would implement that explicit decision, but it is not my recommendation.

### 2.3 Summary codes and the compatibility budget

The current foreign-model reader bounds metrics to **at most 4,096 UTF-8 bytes**, depth 8
(`core/engine/pack.js:40-41, 802-811`). The byte test rejects `>4096`, not equality. This applies to
the whole metrics object; it is not a per-array allowance.

Recommended owner option:

1. `ComputedRatingV3` always has complete declared metrics or the explicitly chosen incomplete variant.
2. `RatingClaimV3` may omit metrics. If supplied, metrics receive strict v3 validation and the
   compatibility byte/depth bound.
3. Newly generated pack exports retain full metrics. The code-writing adapter intentionally emits
   `{model, score, level, saturated}`; source-code round trips retain their original claim where required.
4. The code decoder validates a summary through the same pack boundary without fabricating a score
   breakdown. New current-model claims therefore cannot universally require metrics.
5. Detailed per-node arrays belong in probe/replay data, not an unbounded rating claim. Aggregate
   information and R1-R9 counts suffice for the published formula.

`core/engine/puzzlecode.js:163-205` validates snapshots as packs, and
`core/engine/puzzlecode-v1.js:958-967` already writes non-rebuildable JSON claims. This is a coordinated
schema/adapter change, not a change to frozen v1 maths. Test full and summary claims, legacy-reader
acceptance, missing-table presentation, 4,096/4,097-byte boundaries and the 676-cell size matrix.

## 3. Final position table

All original IDs are retained or explicitly merged below. "Agreed" means analyst agreement, not owner
approval. "For plan author" covers contradictions/contracts; a new behavioural choice still goes to the
owner under the stated process.

| Item | My final position | SA1's position as understood from its review | Status |
|---|---|---|---|
| SA1-Q-P1: free versus decisive choices | Prefer evaluating a bounded decisive model; require proven/unknown alternatives and an explicit production incomplete policy. | Decisive G and log2(c/k), bounded existence searches, treated as the necessary fix. | for owner |
| SA2-Q-P01: base 12/16 | Base 12; robust forced bound <=16, not the broad <=16.5 claim. | Base 12; its stated boundary remains <=16.5. | for plan author |
| SA2-Q-P13: rule bonus | Actual deduction tier; guesses separate. | Now agrees with deduction tier. | agreed |
| SA2-Q-P02 / cap before first solution | Incomplete/unrateable; skip by default. A separate estimate requires its own contract. | Current DFS-prefix G/info, saturated `+`; raise caps if low levels hit them. | disputed |
| SA1-Q-P6 + SA2-Q-P03: identical shapes | Prefer quotienting interchangeable difficulty choices/counts; raw DLX certificates remain. | Raw per-piece G/S, documented imported-set limitation. | disputed |
| SA2-Q-P04: centre/search policy | Withdraw integer centre; retain written real centre, central half and 48-profile baseline. Retuning is explicit, not implicit. | Same centre/stop rule; tune reserve as an implementation matter. | for plan author |
| SA1-Q-P5 + SA2-Q-P05: sampling bias | Uniform initially; no unsupported reversed heuristic. | Uniform initially. | for owner |
| SA2-Q-P06: order aggregation | Canonical order plus measured column-tie spread; do not silently select a median or representative trace. | Canonical order; use probe data for the plan's conditional median trigger. | for owner |
| SA1-Q-P3 + SA2-Q-P07: code size/metrics | Now recommend summary codes with a coordinated optional-metrics claim schema; full bounded pack metrics. | Summary codes, full pack metrics. | for owner |
| SA1-Q-P2 + SA2-Q-P08: old ratings | Automatic derived display, original claim/code retained, explanatory note and consistent print. | Now agrees. | agreed |
| SA2-Q-P09: calibration freedoms | Fit within stated invariants; record numerical ranges and changes. New estimator, aggregation, omitted diagnostics or carving redesign is not automatically authorized. | Knobs/K60/SHARES allowed within plan criteria; implementer records changes. | for plan author |
| SA1-Q-P4 + SA2-Q-P10: provenance location/content | Typed internal origin, `generation.made` wire map, explicit bounded availability and honest completion fallback. | Same wire map and origin content; suggests 32-key cutoff and completion stages 1-3/7. | for owner |
| SA2-Q-P11: optional Player explanations | Recommend exclusion; keep as a one-line owner scope answer rather than assume full scope resolved an explicitly optional extension. | Exclude; owner confirms. | for owner |
| SA2-Q-P12: cell-to-cell R4 extension | Original piece/cell pairings until explicitly approved; generic kernel allowed. | Generalized cell/cell rule attributed to R4. | for owner |
| Calibration order | Initial complete-ladder fit before activation; generation qualification and coefficient lock before P4; final post-P4 regression only. | Same ordering. | agreed |
| Metric compatibility bound | <=4,096 UTF-8 bytes and depth <=8 for old-reader compatibility; no unbounded choice arrays. | <=4,096 bytes. | agreed |
| Task/validation ownership | One developer per checkout; cross-repository coding parallel, timing runs serialized on the shared machine. | Same. | agreed |

## 4. Merged task breakdown I would sign

These provisional IDs replace my earlier PV3/MP schedules. The task packs are dispatched only after
their relevant answers. Conditional rows are selected by those answers, not silently omitted.

Every task owns its code, relevant tests and changed facts in this documentation bundle while active:

```text
docs/design-detail.md
docs/design-brief.md
USERGUIDE.md
USERGUIDE.vn.md
DEVELOPERGUIDE.md
DEVELOPERGUIDE.vn.md
README.md                         // only facts actually changed
```

All tasks run the relevant targeted checks and finish with `npm run test:quick` and `npm run check`.
S = about 100-300 changed lines; M = 300-800; L = 800-1,600 including tests. Split a row before dispatch
if its selected contract exceeds L. File ownership is a serial lease, not parallel edit permission.
In prerequisites, "P02 answer", for example, means SA2-Q-P02, not another task.

| ID | Title / scope | Depends on | Principal files owned, including tests | Gate / size |
|---|---|---|---|---|
| P-01 | Model metadata, canonical identity and liveness | Author contract | `core/engine/tiling.js`, `core/engine/placements.js`, `core/engine/workspace.js`, `tests/tiling.test.js`, `tests/workspace.test.js` | routine; M |
| P-02 | Reversible core, R1/R2, R3 feasibility, R6, bounded search and separate path/count/work states | P-01; P02 answer | New `core/engine/deduce.js`, `core/engine/policy.js`, new `tests/deduce.test.js`, `tests/policy.test.js` | routine; L |
| P-03a | Sound R3 placement and selected R4/R5 closure | P-02; P12 answer | `core/engine/deduce.js`, new `tests/deduce-rules.test.js` | routine; M |
| P-03b | Sound parity, neck and Hall rules R7-R9; all-solutions oracle | P-03a | Same deduction module/rule suite | routine; L |
| P-03c | Conditional interchangeable-piece representation and counts | P-03b; P03 answer | `core/engine/deduce.js`, shape metadata in `core/engine/placements.js`/`core/engine/tiling.js`, deduction/rule tests | routine; L; only if quotient semantics selected |
| P-04 | Conditional decisive-path census with proven/unknown alternatives | P-03b and P-03c if selected; SA1-Q-P1/P02 answers | `core/engine/deduce.js`, `core/engine/policy.js`, new `tests/deduce-census.test.js` | routine; L; raw-G choice replaces this with the smaller raw-metric contract check |
| P-05 | P0.3 probe, column-order study, cap/census completion and initial fit | P-04 or its raw-G replacement | New `tools/rate-probe.mjs`, new `tests/rate-probe.test.js`, diagnostic seam in deduction module, new dated evidence | bounded probes; M |
| P-06 | P1 centre-seeking selection, repairs, exclusions and generation version | P-05; P04/P05 answers | `core/engine/clues.js`, `core/engine/version.js`, `tests/clues.test.js`, `tests/generate.test.js`, generation fixtures | GF-P1 + GA-P1; M-L |
| P-07 | Pure v3 breakdown, score, fitted policy and types; default remains v2 | P-05/P-06; formula answers | `core/engine/difficulty.js`, `core/engine/policy.js`, `core/engine/types.js`, new `tests/difficulty-v3.test.js` | routine; M |
| P-08 | Activate v3; full/summary claims and compact-metric bounds; compatibility pins | P-07; P07 answer | `core/engine/difficulty.js`, `core/engine/pack.js`, `core/engine/puzzlecode.js`, `core/engine/types.js`, `tests/difficulty.test.js`, `tests/pack.test.js`, `tests/puzzlecode.test.js`, `tests/clues.test.js`, `tests/generate.test.js`, `tests/worker-pool.test.js`, new v3 fixtures | GF-P2 + GA-P2 + GC-P2 format part; L |
| P-09 | P2.5 derived legacy display in both apps | P-08 | `player/state.js`, `player/app.js`, `player/strings.js`, `player/locale.en.js`, `player/locale.vi.js`, `generator/state.js`, `generator/jobs.js`, `generator/ui/puzzle-panel.js`, `generator/strings.js`, `generator/locale.en.js`, `generator/locale.vi.js`, `tests/player-load.test.js`, `tests/generator-import.test.js`, `tests/print-details.test.js` | GC-P2 display part; L |
| P-10 | Calibration metric retention, clue-count rename, matching probe inputs and slow test | P-08; serial after P-09 | `tools/bench/runner.js`, `tools/bench/report.js`, `tools/bench/calibration-reference.js`, `tests/calibration.test.js`, `tests/benchmark-report.test.js`, `tests/difficulty-v3.test.js` | routine; M-L |
| P-11 | P3 measured generation calibration and coefficient lock | P-09/P-10 | Approved policy knobs in `core/engine/policy.js`, approved share values in `core/engine/levels.js`, current v3 fixtures, new dated evidence | GL-P3; affected GF/GA again; M plus runs |
| P-11b | Conditional new compact codec, only if selected instead of summary/full JSON | P-11; P07 answer | New codec version, `core/engine/puzzlecode.js`, `tests/puzzlecode.test.js`, new codec goldens | GC-P2 + affected full tests; L; omitted if no new codec |
| P-12 | Typed origins through generation, client, saved state and compatible generation map | P-11 and P-11b if selected; P10 answer | `core/engine/generate.js`, `core/engine/clues.js`, `core/engine/types.js`, `core/browser/generation-client.js`, `generator/state.js`, `generator/jobs.js`, `tests/generation-client.test.js`, `tests/generator-state.test.js`, `tests/pack.test.js`, new ordinary replay fixture | GF-P4; routine; L |
| P-13 | Opt-in observers through all engine stages, repair and exclusion tracing | P-12 | `core/engine/carve.js`, `core/engine/tiling.js`, `core/engine/clues.js`, `core/engine/generate.js`, new recorder tests | routine; L |
| P-14 | Replay engine, version/stage preflight, exact-match check, worker task | P-13 | New `core/engine/replay.js`, `core/engine/tasks.js`, `core/engine/protocol.js`, new `tests/replay.test.js`, `tests/tasks.test.js`, `tests/protocol.test.js` | routine; L |
| P-15 | Generation Steps dialog, score views and final compatibility evidence | P-09/P-14 | New `generator/ui/replay-dialog.js`, `generator/app.js`, `generator/ui/puzzle-panel.js`, `generator/generator.css`, `core/browser/svg-board.js`, `generator/locale.en.js`, `generator/locale.vi.js`, new `tests/browser/replay.html` and `tests/browser/replay.js`, affected UI tests | GB-P4; final `npm test`; L |

Order: P-01 -> P-02 -> P-03a -> P-03b -> optional P-03c -> P-04 -> P-05 -> P-06 -> P-07 ->
P-08 -> P-09 -> P-10 -> P-11 -> optional P-11b -> P-12 -> P-13 -> P-14 -> P-15.
Some arrows serialize file ownership rather than express algorithmic necessity. No second checkout or
parallel developer is needed. The Sudoku chain can proceed independently.

### 4.1 Gate allocation and lock point

| Gate | Owner | Required run/evidence |
|---|---|---|
| GF-P1 / GA-P1 | P-06 | `node tools\record-fixtures.mjs --replace --reason "P1: clue selection aims at the band centre"`; then `npm test`. |
| GF-P2 / GA-P2 | P-08 | Approved generation fixture recording with a v3 reason; add justified current expectations, retain historical v2 codec evidence; `npm test`. |
| GC-P2 | P-08 format, P-09 UI, P-11b only if selected | 676-cell raw/auto/tail, summary/full claim, URL/QR and planned browser acceptance. Measure code-entry length, not only limit compliance. |
| GL-P3 | P-11 | `node tools\calibrate.mjs --profile landscape --output docs\difficulty-v3\<dated-output>` with supported bounded selectors/shards and matching probe evidence. Record G/info, incomplete/census counts, multiplicity, hit rates, times and memory. |
| Post-fit fixture/full gates | P-11 | Only changes justified by the selected constants/tables; rerun quick and slow/full checks. This is the scoring lock. |
| GF-P4 | P-12 | Truthful generated replay provenance fixture; do not relabel special sample streams as ordinary attempts. |
| GB-P4 / final regression | P-15 | New replay browser checks, affected dialog/share checks and final full unit run. No planned coefficient tuning at this point. |

Every test/probe run remains under ten minutes; individual browser checks under one minute. Qualifying
timings use a quiet machine. Long bounded commands stay attached and monitored. New records are written
under the v3 documentation directory without modifying historical calibration records. If P4 changes a
scored/generated outcome, investigate the regression; do not normalize it by quietly refitting v3.

## 5. Remaining disputes

The two strongest unresolved disagreements are cap-prefix publication and imported identical-piece
semantics. The decisive model still needs a bounded incomplete-evidence decision. Summary codes,
deduction-tier scoring, legacy display, compatible provenance and calibration timing now have aligned
recommendations, subject to the appropriate author/owner answers.

The original reports and cross-review remain as the record of how these positions changed.
