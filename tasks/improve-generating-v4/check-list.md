# improve-generating (Pentomino), plan v4 — task pack 1: index and shared rules

| Item | Value |
|---|---|
| Feature, plan | improve-generating; [`docs/improve-generating/plan.md`](../../docs/improve-generating/plan.md) version 4, **Final for break-tasks (2026-11-16)**, with its section 9 (code drift at `3fc65f4`) |
| Repository, branch | `Q:\git\pentomino`, `improve-generating` |
| Base commit | `345d29d` (its code equals `origin/main` `3fc65f4`, the frozen source of this feature, plan §9) |
| Pack author / reviewer | SA-Opus (claude-opus-5.5) / SA-Astra (gpt-6-astra) |
| Executor | Dev-Sonnet (claude-sonnet-5.5), one task at a time in this repository |
| Revision | round 6 after the cross-reviews [`review-1.md`](review-1.md) to [`review-5.md`](review-5.md); dispositions in [`review-1-response.md`](review-1-response.md), [`review-2-response.md`](review-2-response.md), [`review-3-response.md`](review-3-response.md), [`review-4-response.md`](review-4-response.md) and [`review-5-response.md`](review-5-response.md); IG-P-Q37 answered by the plan author (`288669b`) |
| Previous pack | `tasks/improve-generating/` (IGP-00 to IGP-07, the executed provisional round): read-only; its §3 and §7 are the harness conventions this pack keeps |

**Scope of this pack.** Phase 0, stage 1 of the frozen round (plan §5.1: the verified frozen source, the prototype
rebuilt on it with its provenance contract, the bounded measurement items, the identity receipt, the certificate
re-proved, parity and replay on real calls, the PM1 inventory, the compiled plans of the round, the manifest and its
price), the tools every later stage needs (the per-set prior, the journal linkage, P5's budget and bounded attempts,
the frozen-round variants, the statistics and receipts of plan §5.2, the kernel and pool probes), and phase 1 (P6;
progressive presentation). Running stages 2 to 5 of the frozen round, the live request deadline, the freeze, phases 2
to 4 and the browser calibration are named items for later packs (§6), because each depends on a result or an
approval that does not exist yet (D-V4-10); the plans that run them are compiled and priced here and refuse to run
until their prerequisites exist (T11c); the stage-4 plan is generated at the activation of its collection (T11e).

## 1. Index (execution order)

- [x] T01a Verified frozen source snapshot and the frozen label in the harness (depends on none)
- [x] T01b Source receipts: different-source identity, the frozen reference policy and the source receipt (depends on T01a)
- [x] T02a `gen-v4` prototype on the frozen `selectClues`: the fork, the screen and the locate (depends on T01b)
- [x] T02b `gen-v4` prototype: observers, skip replay and legacy dispatch (depends on T02a)
- [x] T02c `gen-v4` prototype provenance: per-arm identity, the seven-key shape and old records (depends on T02b)
- [x] T02d Begin lines and proved bounds of every rating and count (IG-P-Q37) (depends on T02c)
- [x] T03 PM1 data-only inventory, IG-P-Q24 (depends on T02d; serial order)
- [x] T04a Bounded, identity-checked measurement items: the runner (depends on T03)
- [x] T04b Stage-1 item kinds: selection, generation and replay items, with their work ledger (depends on T04a)
- [x] T04c Stage-1 checks: `v4-check run`, the item manifests and the parity and replay verdicts (depends on T04b)
- [x] T04d Stage-1 receipt: typed proof receipts, the summary, the PM4 gate and the stage-1 plan (depends on T04c; **ends with the dry-run forecasts: the orchestrator asks the owner for the stage-1 allowance**)
- [x] T04e Stage-1 runs: source and identity receipt, certificate re-proof, parity and replay on real calls (depends on T04d and **the stage-1 allowance**)
- [x] T04f The accepted stage-1 binding (depends on T04e)
- [x] T05 Per-set prior (P4 part 2) in the prototype: value and transport (depends on T04f)
- [x] T06a Journal linkage of the batch and accept timelines (depends on T05)
- [x] T06b Journal closures for the work ledger: task identities and confirmed worker terminations (depends on T06a)
- [x] T07a P5 in the prototype: the per-call work budget (depends on T06b)
- [x] T07b P5 in the prototype: bounded set attempts, the arm `v4-p5`, pool invariance (depends on T07a)
- [x] T08 Frozen-round variants: the `W_screen` class table, bracket-close re-rating (D-IG7) and the (c4) probe (depends on T07b)
- [ ] T09a Admission statistics of plan §5.2: valid rows, completion apart from the deadline, per-puzzle evidence (depends on T08)
- [ ] T09b Admission statistics: pairing, matched sets and the class rules of rule (c5) (depends on T09a)
- [ ] T09c Admission statistics: the work ledger of a request, its bounds and the class verdict (depends on T09b)
- [ ] T09d Global verdicts: cell gates, Master identity, Hell 1, P5's stops and phase 0 (depends on T09c)
- [ ] T09e The verdict tool: bound prerequisites, the class-selection receipt and the verdict record (depends on T09d)
- [ ] T10a Kernel probe: R4 visit and mutation counters, with the complete deduction compared (depends on T09e)
- [ ] T10b Kernel probe: the `fewestColumn` attribution under a reduced-inlining profile (depends on T10a)
- [ ] T10c Pool probe: one rating's time at 1, 2, 4 and 8 concurrent workers (depends on T10b)
- [ ] T11a Frozen-round matrix: the enumerated requests of stages 2 to 5 and their collections (depends on T10c)
- [ ] T11b Frozen-round pricing: the simulated schedule and the approval fields (depends on T11a)
- [ ] T11c Frozen-round plans: the compiler, the isolated P-0 manifest and the prerequisites gate (depends on T11b)
- [ ] T11d Parity and P-0 receipts with required passes, and their accepted bindings (depends on T11c)
- [ ] T11e Stage-4 collections: the activation, the concrete validation plan and the closure record (depends on T11d)
- [ ] T11f Comparators and verdict inputs: resolution from a final selection, the selection and final manifests (depends on T11e)
- [ ] T11g Frozen-round manifest for the owner: the price, the approval requests and the dry runs (depends on T11f; **stop at the end: the owner approves the price, OD-P10**)
- [ ] T12 P6: the DLX diagnostic only for returned ratings (phase 1, production; no content dependency, D-V4-11; runs after T11g)
- [ ] T13 Progressive presentation: fold order and the history policy (phase 1, production; runs after T12)

| ID | File | Developer (h) | Machine, allocated (min) | Phase / stage |
|---|---|---:|---:|---|
| T01a | [T01a](T01a-frozen-snapshot-and-label.md) | 2.5 | 0 | 0 / 1 |
| T01b | [T01b](T01b-source-receipts.md) | 2 | 0 | 0 / 1 |
| T02a | [T02a](T02a-v4-prototype-fork.md) | 3 | 0 | 0 / 1 |
| T02b | [T02b](T02b-v4-prototype-observers-and-parity.md) | 3 | 0 | 0 / 1 |
| T02c | [T02c](T02c-v4-prototype-provenance.md) | 3 | 0 | 0 / 1 |
| T02d | [T02d](T02d-primitive-bounds.md) | 3 | 0 | 0 / 1 |
| T03 | [T03](T03-pm1-data-inventory.md) | 1.5 | 0 | 0 / 1 |
| T04a | [T04a](T04a-bounded-items.md) | 3 | 0 | 0 / 1 |
| T04b | [T04b](T04b-stage1-item-kinds.md) | 3 | 0 | 0 / 1 |
| T04c | [T04c](T04c-stage1-checks.md) | 3 | 0 | 0 / 1 |
| T04d | [T04d](T04d-stage1-receipt.md) | 3 | 0 | 0 / 1 |
| T04e | [T04e](T04e-stage1-runs.md) | 1.5 | 50 | 0 / 1 |
| T04f | [T04f](T04f-accepted-binding.md) | 3 | 0 | 0 / 1 |
| T05 | [T05](T05-per-set-prior.md) | 2.5 | 6 | 0 / tools |
| T06a | [T06a](T06a-journal-linkage.md) | 2.5 | 4 | 0 / tools |
| T06b | [T06b](T06b-journal-closures.md) | 2.5 | 0 | 0 / tools |
| T07a | [T07a](T07a-p5-call-budget.md) | 3 | 0 | 0 / tools |
| T07b | [T07b](T07b-p5-bounded-set-attempts.md) | 3.5 | 0 | 0 / tools |
| T08 | [T08](T08-frozen-round-variants.md) | 2.5 | 0 | 0 / tools |
| T09a | [T09a](T09a-rows-completion-and-evidence.md) | 2.5 | 0 | 0 / tools |
| T09b | [T09b](T09b-pairing-and-class-statistics.md) | 2.5 | 0 | 0 / tools |
| T09c | [T09c](T09c-work-ledger-and-class-verdict.md) | 3 | 0 | 0 / tools |
| T09d | [T09d](T09d-global-verdicts.md) | 3 | 0 | 0 / tools |
| T09e | [T09e](T09e-verdict-tool-and-receipts.md) | 3 | 0 | 0 / tools |
| T10a | [T10a](T10a-kernel-counters.md) | 3 | 5 | 0 / tools |
| T10b | [T10b](T10b-kernel-profile.md) | 3 | 4 | 0 / tools |
| T10c | [T10c](T10c-pool-probe.md) | 2.5 | 4 | 0 / tools |
| T11a | [T11a](T11a-frozen-round-matrix.md) | 3 | 0 | 0 / 1 (matrix) |
| T11b | [T11b](T11b-frozen-round-pricing.md) | 3 | 0 | 0 / 1 (price) |
| T11c | [T11c](T11c-frozen-round-plans.md) | 3 | 0 | 0 / 1 (plans) |
| T11d | [T11d](T11d-parity-receipts.md) | 3 | 0 | 0 / 1 (receipts) |
| T11e | [T11e](T11e-stage4-collections.md) | 3 | 0 | 0 / 1 (collections) |
| T11f | [T11f](T11f-comparators-and-verdict-inputs.md) | 3 | 0 | 0 / 1 (comparators) |
| T11g | [T11g](T11g-frozen-round-manifest.md) | 3 | 0 | 0 / 1 (manifest) |
| T12 | [T12](T12-p6-diagnostic-for-returned-ratings.md) | 3 | 0 | 1 |
| T13 | [T13](T13-progressive-presentation-history.md) | 1.5 | 0 | 1 |
| | **Total (36 tasks)** | **99** | **73** | |

The machine column is the benchmark allocation of each task's run plan (`allocationMinutes`); its counted time is node
seconds plus at most 45 s of the quiet period per locked invocation (previous pack §7), and each task's runner stops
at 1.25 times its allocation. A 0 means no benchmark allocation, not zero verification work: verification (the locked
self-test groups, the test suites, the fixture checks) runs through the lock helper and is reported apart (§3.2). The
**stage-1 allowance** the orchestrator asks the owner for after T04d (D-V4-02, §3.4) covers T04e, T05, T06a, T10a, T10b
and T10c: 73 minutes allocated, **92 minutes requested, pending the owner stop at the end of T04d** (the sum of the six
tasks' 1.25 guards, 91.25, rounded up). The grant is recorded here only after the owner's answer, with its scope and
the cumulative round cap it sets; every frozen run of those tasks passes that cap as `-ApprovedRoundMinutes`. A
forecast is not a guarantee of completion.

**Granted (2026-11-17, 08:12:57 +07:00, the owner through Discord, option A):** the stage-1 allowance of **92 minutes**,
the cumulative frozen-round cap (D-V4-02) for T04e, T05, T06a, T10a, T10b and T10c; every frozen run of those tasks
passes `-ApprovedRoundMinutes 92`.

## 2. Traceability

### 2.1 Plan v4

| Plan item | Where it goes |
|---|---|
| §1 goal, non-goals, constraints (determinism, work units, `gen-v4` as a new `algo`, replay on the full request) | T02a to T02c (determinism, units, provenance in the prototype); T07a (budget determinism); T12 (identical scores); production: N-V4-07 |
| §2 diagnosis (facts, causes) | no task: the evidence of the decisions; the moved lines are noted in the plan (§2.1 note, §9) |
| §3 P1 count search by bracketing (`locateCount`) | T02a (prototype; ordinal bound for every supported set); production: N-V4-07 |
| §3 P2 screen and certificate, `W_screen` table, rule (c5) | T02a (screen, certificate check, detail of recorded ratings), T04e (certificate re-proved with full coverage), T08 (class table), T09a to T09c (rule (c5); the work rule on IG-P-Q37's intervals, with T02d's bounds); fit and freeze: N-V4-02, N-V4-03; the class limits and the bracket close in real calls: N-V4-17 |
| §3 P3 a capped profile is a sided result | T02a; `tests/clues.test.js:820` stays (T12's guard) |
| §3 P3 population rule (OD-P6), (c4), blind play comparison | T08 ((c4) variant), T09d (population report); runs: N-V4-02; comparison: N-V4-09; whether (c4) fired: N-V4-17 |
| §3 P4 count prior, table and per set; identity (IG-P-Q03) | T02a (table prior), T02c (the prior's table version and `made.igPrior` in the record), T05 (per-set prior); table freeze: N-V4-03; production identity: N-V4-07 |
| §3 P5 per-call budget, bounded set attempts, one deadline (IG-P-D1, IG-P-Q22) | T07a (budget), T07b (bounded attempts, pool invariance, the budget end in `any` mode), T06a and T06b (linkage and closures), T09d (post-hoc projection, labelled; false stops and lost completions over the declared pairs), T09e (the accepted live binding as a prerequisite), T11c and T11e (the live binding before validation); the live deadline and reserve: N-V4-13; budget table and reserve: N-V4-03; the glue's first real use: N-V4-16 |
| §3 P6 DLX diagnostic only for accepted puzzles (OD-P2) | T12; its production timing: N-V4-12 |
| §3 P7 same-units kernel (C1, C5) and its rules | T10a (R4 counters with mutation epochs, complete-result equality), T10b (`fewestColumn`); the spike's implementations: N-V4-05 |
| §3 P8 wider pool (parked; the probe) | T10c (probe tool and one-round run); its full run: N-V4-02 |
| §3 P9, P10, P11, C3, C4 (parked or analysis first) | N-V4-11 (phase 4), N-V4-04 (stage 5: C3's features, C4's counting) |
| §4 times before and after | no task (Projections); validation measures them: N-V4-02, N-V4-03 |
| §5.1 preconditions: freeze, identity receipt, re-derived anchors, "different source", diagnostic offers, no fallback | T01a, T01b, T04d, T04e (D-V4-01) |
| §5.1 the prototype on the frozen source: semantic rebuild, skip replay, one running version, provenance shape, observers, parity passes, timed comparator | T02a to T02d, T04a to T04f; the parity passes of the later arms and the isolated P-0: T11c (plans), T11d (receipts and bindings), T11g (priced), N-V4-02 and N-V4-03 (run) |
| §5.1 stage 1: preparation, browser calibration (IG-P-Q23), PM1 inventory (IG-P-Q24), the price | T01a to T04f, T03, T11a to T11g; browser calibration: N-V4-01 |
| §5.1 stages 2 to 5, PM1 and the frozen prior (IG-P-Q27), seeds (IG-P-Q25), journals, stopping (IG-P-Q32), budget | T11a (enumerated matrix and collections), T11b (pricing), T11c (compiled plans), T11d (receipts), T11e (activation and closure), T11f (comparators and verdict inputs), T11g (manifest and approvals); their runs: N-V4-02 to N-V4-04 |
| §5.2 admission statistics (IG-P-Q19, Q26, Q29, Q30, Q32, Q33, Q35) | T09a (valid rows, completion apart from the deadline, per-puzzle evidence), T09b (pairing, matched sets, the class rules), T09c (the work ledger on IG-P-Q37's intervals, the class verdict), T09d (cell gates, Hell 1, Master identity, P5's stops, phase 0), T09e (the verdict tool, accepted prerequisites, the class-selection receipt); T02d (the begin lines and their bounds) |
| §5.3 the provisional round | no task (history) |
| §6 phase 0 | T01a to T11g; N-V4-02 to N-V4-04, N-V4-06, N-V4-13 |
| §6 phase 1: P6, progressive presentation (OD-P5 (a)), P7's proved items | T12, T13; P7: N-V4-05 |
| §6 phase 2 `gen-v4`, phase 3 offers, phase 4 optional | N-V4-07, N-V4-08, N-V4-11 |
| §6 tests every phase keeps: rating equality, pool invariance, budget determinism, scope, replay, observers, memory limit, AR1 | T12 (rating equality, AR1, fixtures); T13 (the streamed order at one and four workers); T02b (observers, scope), T02c (replay refusal by version and table), T04e (parity and replay on real calls), T07a (budget determinism), T07b (pool invariance at 1, 2, 4 and 8 workers) in the prototype; production tests: N-V4-07 |
| §7 decisions | §5 below; IG-P-Q37 (the work condition on proved bounds): D-V4-17, T02d, T06b, T09c, T09e, T11b, T11g |
| §8 risks | no task; T11g's manifest restates those that bear on the price |
| §9 code drift | §2.2 below |

### 2.2 Code drift (plan §9; the two `7-code-drift-at-3fc65f4.md` files)

| Finding | Where it goes |
|---|---|
| DR-O01, DR-A08: old-version records show no steps | N-V4-07 (release notes, user guides, refusal case); T02c (refusal by version and table inside the harness) |
| DR-O02, DR-A07: Generation steps consume `gen-v4`'s events | T02a (event kinds, phases and reasons the frozen replay builder accepts, D-V4-06); production mapping and texts: N-V4-07 |
| DR-O03, DR-A12: fixture consumers, `record-fixtures --replay-case` | N-V4-07; T12 and T13 keep both fixture checks green |
| DR-O04, DR-A05: provenance beyond the version keys | T02c (per-algo shape, bounds and `made` keys), T05 (the prior's value and transport); production: N-V4-07 |
| DR-O05, DR-A11: `REPLAY` bounds and replay cost | T04c, T04e (replay on real calls, full proofs and findings with work and bytes); production: N-V4-07 |
| DR-O06, DR-A10: prefetch in browser timing | T11g (the bench page without prefetch for the calibration; the Generator page as a separate item); runs: N-V4-01, N-V4-08 |
| DR-O07: P6 and the replay steps | T12 |
| DR-O08: the `p1p5` trees fail on `3fc65f4`; the `log` seam has no detail | T02a (the fork keeps `skips`; the recorded route keeps the detail), T02b, T04e |
| DR-O09, DR-A04: moved references | the plan (§2.1 note, P3, P7, C3, §6, fixed in deliverable 1); T01a (the snapshot names the frozen digest) |
| DR-O10: a Hell 1 offer needs more than `AREAS` | N-V4-08 |
| DR-O11: P5's bounded attempts and P-OD12 | T07b (the mechanism, in the `v4-p5` tree only), T09d (false stops and lost completions against the uncapped arm, over the declared pairs), T11g (stated in the manifest) |
| DR-O12, DR-A01, DR-A02, DR-A03: lock values, freeze point, tiers, Hell withdrawal | T01a (frozen commit `3fc65f4`), T01b, T04e |
| DR-O13: today's search unchanged since MP12b1 | T04e (identity receipt: the same puzzles as MP12b1 on the identity seeds) |
| DR-O14, DR-A06: the §5.1 contract; "the only direct production caller" | T02a, T02b, T02c |
| DR-O15: anchors and the frozen catalogue | T01b (catalogue check from the snapshot), T04e |
| DR-O16: the Generator page's board limits | T11g (browser cells), N-V4-01, N-V4-08 |
| DR-O17, DR-A09: saved-steps cache identity with the table versions | N-V4-07 |

### 2.3 Cross-review round 1 (`review-1.md`)

| Finding | Where it goes |
|---|---|
| RV1-01 (R01) live deadline | D-V4-08, D-V4-18; N-V4-13; T09d (projection labelled, never a deadline gate), T09e (the accepted live binding); T11a (`live` rows), T11c (`V4-LIVE` before the stage-4 activation), T11e, T11g (priced) |
| RV1-02 (R02) prototype provenance | T02c; D-V4-04, D-V4-05; T05 (transport only) |
| RV1-03 Nightmare and Hell 1 only | T02a (`v4Target`, ordinal bound for every supported set); D-V4-03 |
| RV1-04 (R04) recorded detail | T02a (detail from the same measurement; recorded legacy route); T04b, T04c, T04e (real recorded-path checks) |
| RV1-05 (R05) bounded items | T04a; T05, T10a, T10b, T10c (their items); D-V4-14 |
| RV1-06 (R06) receipt inputs and coverage | T04b to T04f; T11c (parity passes of every later arm), T11d (their receipts and bindings) |
| RV1-07 self-test scope and counts | every task that adds a case names `self-test.mjs` in its scope; counts are reported, not oracles |
| RV1-08 stop after a failed plan | T04e and every task that runs a plan (`$LASTEXITCODE` checks) |
| RV1-09 bound before the ordered scan | T07b |
| RV1-10 (R10) budget exhaustion | T07a |
| RV1-11 `fam` declared before `step` | T02a, T08 |
| RV1-12 (R12) admission contract | T09a to T09e; T02a (the `caps` and `count` ledger lines), T02d (the begin lines), T06b (the closures); IG-P-Q37 |
| RV1-13 false stops | T09d |
| RV1-14 (R14) validation matrix | T11a (collections); T11c (the universe), T11e (one activated collection), T11f (comparators from that collection's final selection) |
| RV1-15 (R15) pricing by executable invocations | T11b (simulation with the cut; ceilings from enforced bounds), T11c (one price per emitted step), T11g |
| RV1-16 probe allocations and dry runs | T10a (5 min), T10b (4 min), T10c (4 min), each with a dry run |
| RV1-17 (R17) probe interfaces and worker lifecycle | T10a, T10b, T10c; the compiled namespaces: T11c (isolated P-0), T11e (one collection per plan) |
| RV1-18 mutation epochs | T10a |
| RV1-19 complete `DeductionResult` | T10a |
| RV1-20 (R20) lock and verification commands | §3.2; every task's command table |
| RV1-21 browser calibration | T11g; N-V4-01 |
| RV1-22 linkage tail and timelines | T06a |
| RV1-23 control characters | §4 D-V4-13; the format check of §3.1 |
| RV1-24 frozen metadata from the snapshot | T01a, T01b; D-V4-01 |
| RV1-25 P6 wording and scope | T12 |

### 2.4 Cross-review round 2 (`review-2.md`)

| Finding | Where it goes |
|---|---|
| RV2-01 terminal log lines carry the identity | T04a (line helpers, `item-spawn`, resume rules); T10a, T10b, T10c (the same writers) |
| RV2-02 the pack folder | T04b (`preparePackPath`, `writePackFile`) |
| RV2-03 (R2-03) stable profile identity, rebuilt profile records | T10b |
| RV2-04 durable intent before spawn | T04a (`logStart`, `logSpawn`), T10b (`runProcessItems`), T10c (`runCustomItems`) |
| RV2-05 width-8 test trees | T07b (`v4-p5-w8-test`, `v4-link-w8-test`) |
| RV2-06 completion apart from the deadline | D-V4-16; T09a (readings), T09d (cell gates, Hell 1, P5's stops), T11a (`controlsFrom`) |
| RV2-07 (R2-07) complete work coverage | IG-P-Q37 (the plan author's answer, option (c)), D-V4-17; T02a (`caps`, `count` lines), T02d (`begin` lines and bounds), T06b (`set-complete`, `completion-complete`, confirmed `worker-end`), T09c (the ledger and the interval rule) |
| RV2-08 Master identity binds phase 0 | T09d (`phase0Verdict` with `masters`) |
| RV2-09 (R2-09) typed, bound receipts | D-V4-18; T04d (`lib/proof.mjs` with the producer binding, stored identities), T04f (accepted bindings), T09e (prerequisites, class selection), T11c (prerequisites gate), T11d (receipts and bindings), T11f |
| RV2-10 row limits per group | T11a; T11b, T11c, T11e, T11f (carried into the steps and prices) |
| RV2-11 (R2-11) the executable pipeline | D-V4-19, D-V4-20; T11a (state paths, collections), T11c (plans, order, the isolated P-0, prerequisites), T11d (receipts), T11e (activation), T11f (`resolve-comparators`, `verdict-input`), T09e (class-selection receipt); N-V4-03, N-V4-04, N-V4-13 (the artifacts they provide) |
| RV2-12 (R2-12) price the executed schedule | T11b (simulation with the cut; ceilings from enforced bounds), T11c (one price per emitted step), T11g |
| RV2-13 cumulative approvals | D-V4-02; T11b (`approvalFields`), T11g (`approval`, dry runs) |
| RV2-14 (R2-14) parity evidence | T02a (count ledger before stage 1), T04b (`itemLedger`, the DTO), T04c (`parityVerdict`) |
| RV2-15 the `gen-v4` discriminator | T02c; D-V4-05 |
| RV2-16 snapshot bootstrap order | T01a |
| RV2-17 timelines by outcome | T06a (`timelineProblem(run, linkLines)`) |
| RV2-18 valid measurements only | T09a (`runStatus`, `ingestRow`), T09d (unknown P5 pairs) |
| RV2-19 the rate seam on the screened route | T02a (`rateScreen`), T02b (case 5) |
| RV2-20 "requested, pending" | §1, §3.4 |
| Q-RV2-01 completion versus the deadline | option (a), the plan's contract: D-V4-16; no question |

### 2.5 Cross-review round 3 (`review-3.md`)

| Finding | Where it goes |
|---|---|
| RV3-01 interrupted work (RV2-07 unresolved) | routed to the plan author as IG-P-Q37 (`cfcb735`), answered with option (c) (`288669b`): D-V4-17 rewritten; T02d (begin lines and bounds), T04b (the bounds checked on every stage-1 item), T06b (confirmed terminations), T07a (the budget check before the begin line), T09c (the interval rule and its tests), T09e (the intervals reported), T11b and T11g (no timed run added); plan §5.2 (c5) and §7 |
| RV3-02 P-0 digests and namespaces | T04c (the manifest's task and step enforced; `seedText` in the joined rows), T11c (the isolated manifest `V4-S2P.p0-v4.json`), T11d (`p0-identity`: the semantic join, absent-mode `result.digest`, parameters, `--require-pass`); D-V4-19 |
| RV3-03 phase 0 before the comparators | T09a (`purpose`, the expected P5 pairs), T09d (`phase0Verdict` never passes a selection; `p5Stops` over the declared pairs), T11f (the selection and final inputs) |
| RV3-04 one collection at a time | T11a (collections, comparator tasks, the activation rule), T11c (the universe; no executable stage-4 plan), T11e (activation and closure), T11f (resolution bound to the activation); D-V4-20 |
| RV3-05 reserves are not ceilings | T11b (the cut, censored items, ceilings from enforced bounds), T11g (stage 5 and the browser parts unpriced, with the items that price them) |
| RV3-06 independent expectations | T04d (`harnessHash` in the expectation; `STAGE1_COVERAGE_EXTRA`), T04f (the accepted stage-1 binding), T09e (bound prerequisites; the selection binds all its inputs), T11c (`accepted` prerequisites), T11d (bindings of the parity kinds); D-V4-18 |
| RV3-07 termination and task identity | T06a (`timelineProblem(run, linkLines)`), T06b (confirmed `worker-end`, completion keys), T09c (closure and identity rules) |
| RV3-08 empty evidence | T09a (`puzzleEvidence`), T09b (`matchedSets`), T09c (the evidence condition), T09d (Master identity, population) |
| RV3-09 editorial | T02c and T02d (case counts), T10b (step 3), T04d (the envelope root in case 1), T11c (`compile` prints the files it wrote) |
| RV1-12, RV1-14, RV1-15, RV1-17, RV2-09, RV2-11, RV2-12 (unresolved in round 3) | as RV3-01 to RV3-06 above |

### 2.6 Cross-review round 4 (`review-4.md`)

| Finding | Where it goes |
|---|---|
| RV4-01 the R9 term | T02d (the derivation and `igRatingBound`: `3 NZ + NC^2 / 2 + 3 (NC^2 / 2) K L`; the magnitudes), N-V4-14 (its examples) |
| RV4-02 primitive accounting fails closed | T04b (`pairPrimitives`, shared; `unquantified` on every route; cases (m) to (p)), T09c (rule 6 through `pairPrimitives`; an ended call with an open primitive is incomplete; four new ledger cases); D-V4-17 |
| RV4-03 historical receipt evidence | T04d (the explicit input index `stage1Inputs`, the captured `inputs/`), T04f (`V4-T04f-verify`, `evidence-check`, the reserved self-test ids, the expectation from the captured copies), T11d (captured inputs of the parity kinds), T04e (scope); §3.1; D-V4-18 |
| RV4-04 executable step records | T11c (argv arrays, `repeatUntilDone`, explicit `minHorizonS`, `accept-p0`'s script path, `instr` and `r4c` in `trees`, probe populations written out and priced; three new compiler cases) |
| RV4-05 the row ceiling | T11b (`ceilingS = units x 345` from the helper's 300 s and the progress rule; the 10-s margin an assumption), T11c (no zero-row step) |
| RV4-06 the clue-rule fixture | T09c (`synthClass` with `K: 30`; the clue case asserts complete clue evidence first) |
| RV4-07 activation then approval | T11e (data-only activation, then the timed approval; selected groups required, origins recorded), T11g (the approval order), §3.4, N-V4-03, D-V4-20 |
| RV4-08 wording | T02d and T11b (O(board area + pieces) plus journal I/O), T04f (non-variant harness edits do not move trees), T11c (8 rows, 23 items), T11d (root `blocks`), T09d (zero-accepted rows read as empty lists) |
| RV1-15, RV1-17, RV2-09, RV2-12, RV3-05, RV3-06 (open after round 4) | as RV4-03 to RV4-05 above |

### 2.7 Cross-review round 5 (`review-5.md`)

| Finding | Where it goes |
|---|---|
| RV5-01 the early PM4 gate | T04d step 4 (`pm4GateEvidence`; the expected `instr` identity from `planTree('instr')` after the snapshot and digest checks; no stage-1 capture read or written; case `proof: the early PM4 gate needs no stage-1 capture`); T04e's order unchanged |
| RV5-02 the index of an exceeded bound | T04b (case (i): `bound exceeded c 0`) |
| RV5-03 the parity expectation without the current trees | T11d step 4 (`stepEvidence(..., { historical: true })` in `stepExpectation`) |

## 3. Shared rules

### 3.1 Conventions

- **Files.** CRLF line endings, UTF-8 without BOM, no trailing whitespace, a final newline, and no character from
  U+0000 to U+001F other than CR, LF and a tab. Node tools are `.mjs` with `// @ts-check` first, JSDoc types, 2-space
  indent, single quotes, semicolons; copy-only engine files under `tools/ig-proto/variants/files/` are `.js` with the
  engine's conventions (previous pack §3, "Modules"). `npm run check` passes at the end of every task.
- **Harness conventions** are those of `tasks/improve-generating/check-list.md` §3 (code location, copies never
  edits, tree identity, determinism levels, records with the `meta` block, kinds of numbers, statistics, hand-off
  checks) and §7 (machine and lock protocol), with the changes of this pack: the verified snapshot and the frozen label
  (D-V4-01), the budget of the frozen label (D-V4-02), read-only git for developers (D-V4-12), bounded items
  (D-V4-14) and the verification routing (D-V4-15). Task, plan and evidence names: plan
  `tools/ig-proto/plans/V4-<ID>.json` with `"task": "V4-<ID>"`; records under
  `docs/improve-generating/evidence/frozen/V4-<ID>/`; raw files under `tests/artifacts/ig-proto/frozen/V4-<ID>/`.
- **Historical observation namespaces** (RV4-03, D-V4-18): once a run has written them, the frozen task folders
  `IGP-02`, `V4-T04`, `V4-T04v4`, `V4-T04f` and `V4-T04i` (stage 1, T04e) and `V4-S2P` (the parity passes and P-0 of
  `V4-S2`) are records that an accepted binding hashes: no later run, verification or self-test uses their ids
  (`self-test.mjs` refuses the four stage-1 self-test ids once their state exists, T04f); a later task verifies under
  its own id (for example `V4-T04f-verify`). One exception, before T04f's binding (ruling of 2026-11-17, T04e): the
  replay step of `V4-T04` is observed a second time, with the same harness, after its first observation and receipt are
  archived in place (`V4-T04/replay-a1/`, `stage1-a1.json|md`, `replay-a1.manifest.json`); nothing is deleted.
- **Cited lines.** A line number in a harness file (`tools/ig-proto/**`) is the line at the pack's commit `4ffca52`;
  earlier tasks of this pack that edit the file move it, so the developer finds the cited code by the name or text the
  task gives and reports the new lines in the final report (not a question). Lines in the frozen source (`core/**`,
  `tests/**`, `tools/bench/**` at `3fc65f4`) do not move. A different text at the named place is a `QUESTION:`.
- **Self-test groups**: default (IGP-00's cases; real ratings, locked), `--frozen` (T01a, T01b, T03; carve-only checks
  and records, unlocked), `--v4` (T02a onwards; locked: from T02b on its cases run real uniqueness counts and from T10a
  real deductions), `--items` (T04a onwards; synthetic, unlocked). A task that adds a
  case names `tools/ig-proto/self-test.mjs` in its scope; the number of cases a group prints is reported, never an
  acceptance oracle; `check-edits` must report no error and apply every declared edit once, its counts are reported.
  A gate that re-runs an earlier group under an earlier task's id (for example `--frozen --task V4-T01b`) rewrites that
  id's git-ignored `self-test/state.json`; nothing reads it, and only the historical namespaces above are protected.
- **Production changes** (T12, T13 only) follow `AGENTS.md`: the living specification (`docs/design-brief.md`,
  `docs/design-detail.md`) describes the code after the change; user-visible texts exist in English and Vietnamese;
  `README.md` and the guides (`USERGUIDE.md`, `USERGUIDE.vn.md`, `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md`) stay
  correct and in step.

### 3.2 Commands and the lock

The lock helper is `C:\Users\ledat\.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\ig-lock.ps1`
(checked 2026-11-16): `Invoke-IgNode -Repo pentomino -Task <label> -NodeArgs <args>` runs `node <args>` in the current
directory once both `$env:TEMP\dv3-sudoku.lock` and `$env:TEMP\dv3-timing.lock` have been absent for 45 s, holds
`dv3-timing.lock`, kills the process tree at 300 s (a larger limit is refused), throws on a non-zero exit and prints
`IG <label> exit=<code> seconds=<s>`. Sudoku's difficulty-v3 is still running on this machine and keeps priority.

- **Unlocked** (no rating, search, uniqueness count, generation request or replay; a set carve alone, `carveSet` or
  `firstCarvedSet` without any rating, counts as a pure check): `npm run check`; `firewall.mjs`; `tree.mjs build`
  and `check-edits`; the `--frozen` and `--items` self-test groups; `pm1-inventory.mjs`, `receipt.mjs`, reports,
  summaries, `verdicts.mjs`, `manifest.mjs`; dry runs.
- **Locked verification** (real work that is not a benchmark): the default and `--v4` self-test groups, the test
  suites and the fixture checks, each in its own helper invocation, dot-sourced in the same PowerShell process at the
  repository root:

  ```powershell
  . 'C:\Users\ledat\.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\ig-lock.ps1'
  Invoke-IgNode -Repo pentomino -Task 'T12 quick' -NodeArgs @('--test', '--test-skip-pattern=slow', 'tests/**/*.test.js')
  Invoke-IgNode -Repo pentomino -Task 'T12 full' -NodeArgs @('--test', 'tests/**/*.test.js')
  Invoke-IgNode -Repo pentomino -Task 'T12 fixtures' -NodeArgs @('tools\record-fixtures.mjs', '--check')
  Invoke-IgNode -Repo pentomino -Task 'T12 replay case' -NodeArgs @('tools\record-fixtures.mjs', '--replay-case', '--check')
  ```

  The node arguments are those of `package.json`'s `test:quick` and `test` scripts (the forward slashes of the test
  glob are the package's glob syntax). A gate that needs more than 300 s is sharded, never run unlocked or with a
  larger limit. Verification needs no benchmark allocation; the final report gives its helper seconds and lock waits
  apart from any benchmark number.
- **Locked measurements** (benchmark allocation): the run plans, under the runner, which calls the helper for each
  locked step:

  ```powershell
  $lock = 'C:\Users\ledat\.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\ig-lock.ps1'
  pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-<ID>.json -Label frozen -SourceLabel 'frozen 3fc65f4' -LockHelper $lock -ApprovedRoundMinutes <approved>
  if ($LASTEXITCODE -ne 0) { throw ('STOP: V4-<ID> run-task exited ' + $LASTEXITCODE) }
  ```

  A `throw` ends the task's runs: the output and the state files stay as they are and are reported; a stopped step is
  never re-run and no budget is raised without a ruling. `<approved>` is the number of minutes the orchestrator gives
  (D-V4-02); without it a frozen locked step stops with exit 4 before it runs. Every plan is dry-run first (`-DryRun`)
  and every locked step must be `go`.

| Command | When | Expected | Time limit |
|---|---|---|---|
| `npm run check` | end of every task | `check-conventions: OK`, `check-site: OK`, exit 0 | 2 min |
| `node tools\ig-proto\lib\tree.mjs check-edits --all --label frozen` | harness tasks, after T01a | one `ok <variant>: <n> edits match` line per variant, no error | 2 min |
| `node tools\ig-proto\firewall.mjs snapshot --task V4-<ID> --label frozen` at the start, `check` at the end | harness tasks | `check` prints `firewall: OK, <n> production files unchanged since the snapshot of V4-<ID>` (the tasks' `files unchanged`), exit 0 | 1 min |
| the verification and measurement commands above | as each task says | as each task says | 300 s per helper invocation; 285 s per runner invocation |

### 3.3 Process

- The developer **does not commit**, **never edits `tasks/`** (this pack included), `docs/improve-generating/plan.md`,
  `clarifications.md`, the analysts' folders or the provisional evidence, and runs only read-only git commands
  (`git status`, `git diff`, `git show`, `git archive` into `tests/artifacts/`); the harness code runs no git at all.
- One commit per accepted task, made by the orchestrator: `improve-generating <ID>: <title>` with the session's
  trailers. Nothing is pushed unless the owner asks.
- A record is written once; a correction is a new file with a suffix (`-r2`). Arm rows, item logs, journals and states
  are never rewritten (previous pack §2; D-V4-14).
- **Stops and questions.** The developer stops and reports at every stop point of its task, and sends `QUESTION:` to
  the pack author (through the orchestrator) when the task looks wrong or contradicts the code, an ambiguity changes
  behaviour or a contract, a gate fails for a reason the task does not cover, a change is needed outside the scope, or
  a recorded decision would change. A slow cell, a low completion or a losing variant is a measurement, never a stop.

### 3.4 Stop points that need the owner (relayed by the orchestrator)

| When | What the owner decides | Facts given |
|---|---|---|
| After T04d, before T04e | the stage-1 machine allowance (OD-P10, "source preparation"): 92 minutes requested, pending, for T04e, T05, T06a, T10a, T10b and T10c (73 allocated); the answer sets the frozen round's cumulative cap (D-V4-02) and is recorded in §1 with its scope | §1's machine column; T04d's two dry-run forecasts; the lock protocol (difficulty-v3 keeps priority) |
| End of T11g | the frozen round's price (OD-P10): `V4-S2` now; `V4-LIVE` once N-V4-03 and N-V4-13 have unblocked it; the stage-4 universe per collection as an indication (`V4-S4`'s timed allowance is asked after its data-only activation, `V4-S4C`'s at its resolution); stage 5 (IG-P-D5) and the browser parts of B-1 and B-2 (IG-P-Q23) unpriced, each with the item that prices it (N-V4-04, N-V4-01); each approval with the counted time already spent, the additional guard and the cumulative cap requested (RV2-13); the difference from the plan's indication | `docs/improve-generating/evidence/frozen/V4-T11/manifest.md` sections 1, 2 and 8 |
| At the stage-4 activation (T11e, in the stages 2 to 4 pack), in two steps (R4-07) | first the optional item S4-6 (the paired factor on the failing Nightmare cells) and the authorization of the data-only `activate`, which writes the activation record, the plan `V4-S4` and its price; then `V4-S4`'s timed allowance (`approval --plan V4-S4`), which covers exactly the activated declared rows; the conditional Hell 1 boards follow their pilots' rule (D-V4-20), not a decision; no locked step runs before the second answer | the universe's prices (T11g); then the activation's printout and the approval line |
| When a collection stops at its recorded ceiling (T11e's `close`) | whether the collection is closed with its missing rows listed (its classes then follow the plan's inconclusive or no-screen rules; nothing missing is invented) | the published and the missing rows |
| Before each approved plan runs | its approval re-read with `manifest.mjs approval --plan <id>` at that time (never the original quote) | the approval line |
| Later packs | stage-5 items (IG-P-D5), any offer (OD-P4, IG-P-Q12), any release, merge or push | §6 |
## 4. Decisions of this pack

| ID | Decision | Reason |
|---|---|---|
| D-V4-01 | The frozen source is commit `3fc65f4`. T01a writes it from `git archive` into the absent folder `tests/artifacts/ig-proto/frozen-source/` and records its hash manifest as evidence (text files hashed with LF line ends, a file with a NUL byte raw, `hashRule` `lf-text`, so the manifest does not depend on the line endings of the extraction; ruling of 2026-11-17); with `--label frozen` the harness verifies the snapshot against that manifest, reads every source, version and catalogue reference there, checks the benchmark digest `e181df2cc2e784355345c1a43c6a97800fbfa5e6d139d1b465054fa94204284b` and builds its trees under `tests/artifacts/ig-proto/tree-frozen/` | plan §9 (freeze point); phase-1 commits (T12, T13) must not move the measured source; the harness runs no git |
| D-V4-02 | The `frozen` label has a round cap of 0 minutes: every locked frozen step needs `-ApprovedRoundMinutes`, which the runner records in each invocation line. The cap is cumulative over the frozen round (`lib/budget.mjs:84`): each approval request states the counted seconds already spent, the additional guard and the cumulative cap that covers both, re-read when it is made (T11b, T11g); invocation records are never deleted or reset; a lower cap gives an honest stop. The orchestrator gives first the stage-1 allowance (§3.4), later each plan's approval | OD-P10: the round is priced and approved; nothing runs on an implicit budget; review RV2-13 |
| D-V4-03 | The prototype is rebuilt as `selectCluesV4`, a fork of the frozen `selectClues` in the copy-only file `ig-select-v4.js`; the copy's `selectClues` sends Nightmare and Hell 1 targets (`target.min >= bandEdge(6) && target.min < bandEdge(8)`, 53 to 111) to it; every other target, Hell 2 and Hell 3 included, runs the frozen search, directly when a recorder is set and through the journal otherwise | plan §5.1 ("rebuilt on the frozen `clues.js`"), §6 phase 2 and IG-P-D6 (Hell 2 and Hell 3 closed); review RV1-03, RV1-04 |
| D-V4-04 | One subset-ordinal sequence covers the locate, window, seed and beam probes; a re-rating (rescue, end, bracket close) takes no ordinal; repairs keep the repair sequence. A `gen-v4` record's bounds are 2,192 subset and 64 repair ordinals; for any set of at most 128 pieces (the pack format's `MAX_PIECES`) the locate takes at most 56 ordinals with T08's (c4) probe and the later phases at most the frozen 2,128, so every ordinal is below 2,184; a larger input fails the call by assertion. A `gen-v3` record keeps 2,128 and 64 | plan §5.1 "Skip replay"; drift DR-O04; review RV1-02, RV1-03 |
| D-V4-05 | Each `v4`-family tree has its own experimental algo id `gen-v4-proto:<variant id>` and the table versions `priorTable` and `screenTable` from its parameters (`'none'` when absent); a record whose `versions.algo` is `gen-v4` or matches `gen-v4-proto:<variant id>` has the seven version keys and the candidate field `igPrior` (an integer from 1 to 128 or null), every other record keeps today's five keys and key set; the comparison includes the table versions. A variant whose results change for the same parameters gets a new id; a change that is inert for an arm's parameters keeps the id, and the P-0 pass of T11c's plan `V4-S2` (its own manifest and namespace; T11d's `p0-identity` receipt) re-checks the stage-1 results (T04e) on the final trees. Variant ids of the family have at most 40 characters | plan §5.1 (IG-P-Q34, IG-P-Q36); review RV1-02 (R02), RV2-15 |
| D-V4-06 | `selectCluesV4` records the frozen event kinds only (`rated`, `unrateable`, `rejected`, `skip`, `repair`, `selected`), with the phases `locate`, `window`, `seed`, `beam`, `rescue`, `rerate` (T02a), `close` and `below` (T08), and the `unrateable` reasons `path-capped` (canonical cap) and `screen-capped`; a re-rating event carries the `sequence` of the probe it re-rates; a recorded rating carries the detail of its own measurement, a screened one included (a screen-capped run has no rating). The journal keeps the prototype's phase names (`p2` for the seed phase, which `compare.mjs` reads) | the frozen replay step builder accepts these kinds (`replay.js:828-893`); review RV1-04 (R04) |
| D-V4-07 | P6 in production: search ratings skip the DLX diagnostic only when no seam, recorder or `onRate` observes them; `conclude` completes the returned rating, which then equals `rate()` of its clues | OD-P2; drift DR-O07 (`tests/replay.test.js:1111`) |
| D-V4-08 | The post-hoc reserve table (T09d) is a pilot diagnostic labelled `post-hoc projection; not a live deadline gate`: it estimates accepted prefixes of recorded runs and proves neither dispatch cancellation, final response assembly nor the 120-second bound. Before stage-4 validation the later pack implements and tests the one-request 115-second generation stop, the fitted set-stage reserve and the hard 120-second response backstop in the copy's client and host (N-V4-13); its accepted binding (D-V4-18) is a phase-0 prerequisite and a prerequisite of the stage-4 plan (T11c, T11e); the validation arms run with the frozen P5 policy and that live deadline; the uncapped comparator and its deadline policy are named in the manifest (T11a). The per-call budget (T07a) and the bounded set attempts (T07b) are enforced in the prototype | plan §5.1 ("Validation runs the frozen configuration, with P5 and the one deadline active"); IG-P-D1; review RV1-01 (R01) |
| D-V4-09 | The per-set prior is the calibration's window count `wc`: the `v4-ps` calibration returns `igWindow`, and the batch sends `igPrior: <wc>` (an integer) in every candidate payload when the calibration matches the batch as `calibrationCandidate` (`generate.js:427-433`) matches it (its rating's level is the target level; a unique certificate in `require` mode); otherwise no field is sent and the table prior applies. The record side (`made.igPrior`, its reader and its replay) is T02c's | plan §3 P4 part 2 and IG-P-Q03; review RV1-02 |
| D-V4-10 | This pack ends at the manifest (stage 1) and phase 1. Stages 2 to 5, the live deadline, the freeze, the browser calibration and phases 2 to 4 are later packs (§6): their content depends on the owner's approval of the price, the pilots' results, the frozen tables, the phase-0 verdicts and the offer decisions | the orchestrator's rule: write executable tasks for everything specifiable now, name the rest |
| D-V4-11 | T12 and T13 (production) are independent of the frozen round (D-V4-01) and run after T11g, while the owner decides the price | plan §6: phase 1 does not have to precede phase 2 and needs no phase-0 gate |
| D-V4-12 | Developers may run read-only git commands (`git status`, `git diff`, `git show`, `git archive` into `tests/artifacts/`) for guards and the snapshot; the harness code runs no git | the guard commands of the task template; the harness stays content-identified |
| D-V4-13 | Pilot choices of the pack author, fixed in the tasks: the P5 arm `v4-p5` with a 2,000,000,000-unit call budget for Nightmare and Hell 1 and a bound of 4 set attempts (T07b); bracket close re-rates the screen-capped lower end of a closed bracket (T08); (c4) rates one subset one clue below the first locate hit and offers it first (T08); the stage-2 arms `fr-*` on the instrumented `v4-link` base and the legacy arm `log-link` (T08); pilot reps 0 to 4, validation reps 20 to 39, Master identity reps 20 to 24, second-validation reps 40 to 59, row limits per group (130 s only for the stage-4 groups of the arms with the live deadline, after its receipt; 260 s for every other group, RV2-10), resample seed 20261116, the bench page served from the snapshot for the browser calibration (T11a, T11g); the overhead assumptions of the pricing (2 s per invocation, 3 s per item group, T11b) | the plan leaves these values to the pilots; each is a parameter that stage 2 measures and stage 3 fixes (N-V4-02, N-V4-03) |
| D-V4-14 | Every frozen measurement runs as items of `lib/items.mjs` (T04a): a stable item id; an identity (frozen commit, source digest, tree ids, harness hash, item-manifest hash) checked before resuming; every log line carries the run's `identityHash` and is written by T04a's line helpers: an `item-start` line before dispatch (before a child is spawned), at most one `item-spawn` line with the child's PID, and one terminal `item-end` (`completed`, `censored`, `error`); an identity holds only the experiment's inputs, never an invocation's remaining time; a derived report is rebuilt from the completed items, never appended; a started item without an end needs a ruling; an ended item is never rerun; real work in supervised lane workers or bounded child processes, admitted by a stated reserve per kind (`v4-select` 120 s, `v4-generate` 245 s, `v4-replay` 120 s, `v4-kernel` 90 s, profile and width items 120 s) and cut at `horizonS - 15` | review RV1-05 (R05), RV1-17 (R17), RV2-01, RV2-03 (R2-03), RV2-04 |
| D-V4-15 | Commands that execute real rating, generation, uniqueness work or replay, test suites and fixture checks included, run through the lock helper (§3.2); synthetic tests and pure checks run unlocked; verification time is reported apart and needs no benchmark allocation | review RV1-20 (R20) |
| D-V4-16 | Completion and the deadline are apart (Q-RV2-01 option (a), the plan's contract): a valid request completes when it holds ten puzzles, whatever its time; its capped T10 is the smaller of its T10 and 120 s, and a request that does not complete enters at 120 s; a response after 120 s is a deadline violation, reported apart and enforced by the live-deadline receipt (N-V4-13) | plan §5.2 (one endpoint; completion judged apart; the 18x18 example, 20 of 20 with p95 134.5 s, completion-passing); review RV2-06 |
| D-V4-17 | The work condition of rule (c5) is judged on proved bounds (IG-P-Q37, the plan author's answer, option (c)): before every rating and every uniqueness count of a `gen-v4` call a begin line names the call, the kind and a proved upper bound of the units that primitive can charge (T02d); per call, `lo` is the sum of its completed primitives' reported units; an ended call has `hi = lo`; a call closed by a confirmed worker termination (T06b) has `hi = lo +` the bound of its one open primitive (`hi = lo` when none is open); an overlapping `begin` (at most one primitive is pending; the problem stays even if a completion follows), a rating whose outcome is `unsat` or `error` (zero placeholders, not measured units), a primitive left open at an ordinary end, a non-finite bound, completed units above their bound, or any other unrecorded loss (an open call, a missing `caps` line, an unowned or invalid line, a failed reconciliation, a returned task without its own call) make the ledger incomplete (T04b's `pairPrimitives`, used by T09c; RV4-02). Per arm, `lo` and `hi` per accepted puzzle; the condition passes when the screen arm's `hi` is at most the no-screen arm's `lo`, fails when the screen arm's `lo` exceeds the no-screen arm's `hi`, and is otherwise `unknown` (the class is inconclusive, `work-unknown`); both intervals, the completed-unit ratio (the former quantity) and the terminated calls are reported, not judged (T09c, T09e). The rule adds no timed run (T11b); the width of the intervals is reported from the stage-2 journals before the freeze (N-V4-14) | plan §5.2 rule (c5) "faster" (IG-P-Q37's sentence), §7; `docs/improve-generating/clarifications.md` IG-P-Q37 (question `cfcb735`, answer `288669b`); review RV2-07, RV3-01, RV4-01 (the R9 term of the bound), RV4-02 |
| D-V4-18 | Every prerequisite of a gate is a typed receipt in one envelope (`ig-v4-proof` version 1: kind, verdict, source, harness hash, arms with tree ids and parameter hashes, coverage, evidence with SHA-256), checked by `proofCheck` against an expectation built apart from the receipt: the source, the producer (`harnessHash`), the arms and the declared coverage. A consumer checks it only through its accepted binding (`ig-v4-accepted` version 1, written once at acceptance by `v4-check accept`: the receipt's hash, the expectation and the captured parameters; T04f, T11d), comparing today's trees only for the arms it names (`current`); a historical binding keeps its producer hash and stays valid after unrelated harness work. A receipt's evidence is an explicit index of immutable inputs (the manifests, the observation states and logs, the identity, certificate and self-test records, and copies of the tree and harness metadata captured under `inputs/` before the receipt; T04d, T11d), never a tree folder, variant file or harness file; the historical namespaces are never reused (§3.1, T04f); observations keep their stored identities and are never relabelled; a projection never satisfies the live-deadline prerequisite; a correctness failure is kept apart from missing evidence | review RV2-09 (R2-09), RV1-01 (R01), RV3-06 (R3-06), RV4-03 (R4-03) |
| D-V4-19 | The frozen round is a sequence of plans in the order of R2-11 as amended by review 3: `V4-S2` (stage 2, with the P-1 passes and the isolated P-0 pass `V4-S2P/p0-v4`, a copy of the stage-1 parity corpus under its own task and step) and `V4-LIVE` are compiled now (T11c); `V4-S4` is generated at the activation of its collection (T11e); `V4-S4C` is resolved from that collection's final class selection (T11f); the second validation is a template until N-V4-04. Every step has complete arguments (an argv array whose script exists or is a declared prerequisite), state path, dependencies and expected output; every locked step has `repeatUntilDone: true` and an explicit minimum horizon (rows `rowLimitS + 12`, P-1 parity 270, P-0 and probes 150) and runs exactly the population it is priced on (T11c); a manifest runs only under its own task and step (T04c); every mandatory proof runs with `--require-pass` and is accepted before a consumer uses it; a plan whose variants, files or bindings do not exist refuses at its first step (`check-prerequisites`); each emitted step is priced alone by the runners' rules, with its ceiling from enforced bounds: `units x 345` (the helper's 300 s and 45 quiet seconds per invocation, at most one invocation per unit; T11b) | review RV2-11 (R2-11), RV2-12 (R2-12), RV3-02 (R3-02), RV3-05 (R3-05), RV4-04 (R4-04), RV4-05 |
| D-V4-20 | Stage 4 measures one declared collection at a time. The matrix (T11a) and the universe (T11c) are priced, not run; `activate` (T11e) writes the activation record of the initial collection once (its epoch hashes, the required groups, the conditional boards whose five-seed pilots reached ten on at least three valid requests, the optional items the owner approved, the declared rows and the comparator cells) and from it the plan `V4-S4` (no comparator row) and the comparator template of exactly that collection; the owner first decides the optional items and authorizes that data-only activation, then approves the timed allowance of the plan it wrote (`approval --plan V4-S4`); every selected group is required in that plan (`optional: false`, its origin recorded), so a default run and approval cover exactly the declared rows; `close` writes a closure record once, on the owner's instruction, listing exactly the declared rows not published; a selection is final only by complete publication or that closure, and the comparators are resolved only from that collection's final selection (T11f); the second validation uses its own namespaces (`V4-S4X`, `V4-S4XC`) and its own activation, selection, comparators and verdict (N-V4-04) | review RV3-04 (R3-04), RV1-14 (R14), RV4-07 (R4-07) |

## 5. Decisions register (binding, with sources)

| ID | Decision | Source |
|---|---|---|
| OD-P1 | A new `algo` `gen-v4` after difficulty-v3 closes; seeds give other puzzles; under `gen-v4` a capped profile counts as "too few clues" (D21 amended) | `docs/improve-generating/clarifications.md`, owner decisions 2026-11-14; plan §7 |
| OD-P2 | The DLX diagnostic only for accepted puzzles (P6) | same |
| Phase 0 | Official measurements start once difficulty-v3 freezes; prototypes are harnesses outside every fingerprint | same |
| IG-P-D1 (IG-P-Q02) | One end-to-end request deadline (115 s stop inside a hard 120 s response bound) with a reserved batch share fitted as a pilot parameter; work caps first, the clock as backstop; a cut response returns the puzzles accepted so far; lost completions counted against the uncapped search; two budgets until the pilot has run | owner decisions 2026-11-15; plan §3 P5, §7 |
| IG-P-D2 (OD-P5) | Progressive presentation now, in fold order, with the history policy stated; a service level only later | same |
| IG-P-D3 (OD-P6) | The level is the score band, the centre rule and AR1; population reported two-sided; (c4) measured; a blind play comparison before any phase-3 offer | same |
| IG-P-D4 (OD-P7) | No screen by default on Nightmare boards of up to 144 cells | same |
| IG-P-D5 (OD-P8) | The reduced PM1 in stages after the frozen source receipt: inventory, Hell 1 cells, Hell 2 cells; Hell 3 dropped | same |
| IG-P-D6 (OD-P9) | Hell 2 and Hell 3 closed for this feature; 24x24 and 14x14 Hell 1 get request-level arms as candidate populations | same |
| IG-P-D7 (OD-P10) | A separately priced, staged frozen-round manifest after source preparation; the browser calibration as its optional first stage; nothing of the provisional round carries over | same |
| Still to come | The stage-1 allowance (§3.4); the manifest's price, plan by plan (T11g); OD-P4 (Hell 1 offers), IG-P-Q12 (10x10 and 12x12 in the browser), OD-P5 (b) (a service level), OD-P7 revisit (190 M on 12x12), OD-P3 (packs) | plan §7 |
| IG-P-Q01 to Q36 | The plan author's answers in force (text in `clarifications.md` at `1731c6b`, `f768220`, `854a69d`); IG-P-Q36 resolved by the analysts on the owner's delegation | plan §7 |
| P-OD12 | difficulty-v3: no fail-fast in `gen-v3` ("only "none" meets the rule that a mechanism with an observed false stop is not proposed") | `tasks/difficulty-v3/check-list.md:317`, D40 `:364` |
| P-OD14 | difficulty-v3: Generation steps as a table in step 3; an `unavailable` replay shows the stored puzzle only (Q2 (a), Q3 (a)) | `tasks/difficulty-v3/check-list.md:319` |
| Owner, 2026-11-17 08:12 | The stage-1 allowance granted: 92 minutes, the cumulative frozen-round cap for T04e, T05, T06a, T10a, T10b and T10c (option A) | the owner's answer through Discord to the orchestrator's question after T04d (§3.4) |
| Owner, 2026-11-16 13:45 | Only Pentomino; no Sudoku improve-generating work (out of scope of this pack) | the orchestrator's brief |
| Joint drift result, 2026-11-16 | No breaking change; the corrections of plan §9 | plan §9 |
| Review round 1, 2026-11-16 | The plan's contracts restored where the first draft departed from them: the live deadline before stage 4 (Q-RV1-01 (a)) and the seven-key provenance in the prototype before its receipt (Q-RV1-02 (a)); no question to the supervisor or the owner | `review-1.md`, `review-1-response.md` |
| Review round 2, 2026-11-16 | The plan's contracts kept: completion and the deadline apart (Q-RV2-01 option (a), D-V4-16); no question to the supervisor or the owner | `review-2.md`, `review-2-response.md` |
| IG-P-Q37 (decision of the plan author, 2026-11-16) | The work condition of rule (c5) is judged on proved bounds: interval accounting from the primitives' own limits (option (c)); pass when the screen arm's upper bound per accepted puzzle is at most the no-screen arm's lower bound, failed when the screen arm's lower bound exceeds the no-screen arm's upper bound, otherwise inconclusive (`work-unknown`); the completed-unit ratio and the terminated calls reported, not judged; D-V4-17 | `docs/improve-generating/clarifications.md`, IG-P-Q37 (question at `cfcb735`, answer at `288669b`); plan §5.2 (c5), §7 |
| Review round 3, 2026-11-16 | RV2-07 and RV3-01 routed to the plan author (IG-P-Q37) and applied as answered; every other finding fixed in the pack; no other question to the supervisor or the owner | `review-3.md`, `review-3-response.md` |
| Review round 4, 2026-11-16 | Every finding fixed in the pack (RV4-01 to RV4-08 and the six open RV1, RV2 and RV3 findings); N-V4-14 stays a named item by the reviewer's ruling; no question to the supervisor or the owner | `review-4.md`, `review-4-response.md` |
| Review round 5, 2026-11-17 | The 14 earlier findings resolved; RV5-01 to RV5-03 fixed in the pack; no question to the supervisor or the owner | `review-5.md`, `review-5-response.md` |
| Ruling of the pack author, 2026-11-17 (T01a's report) | The snapshot manifest hashes text files with LF line ends and files with a NUL byte raw (`hashRule` `lf-text`): on this machine `git archive` writes CRLF (`core.autocrlf=true`, `* text=auto`), so raw hashes would verify only where the extraction converts the same way; T01a's fix round re-records the uncommitted manifest from the same verified folder | T01a (Authority, step 2, step 10, the line-ending case, T01a-T05); D-V4-01 |
| Ruling of the pack author, 2026-11-17 (T01b's report) | Five deviations accepted: the receipt's own `meta.rerun`; no receipt written when the snapshot is unverified; the identity summary's `differentSource`, `differentSourceSameResult` and `withoutMp12b1`, with `metricPrefixOnly` excluding them; the `different-source` rule on either name; the README's stale text. The audit search covers any depth (`(\.\./)+`). A stage-1 identity seed without an MP12b1 run makes the identity block `incomplete` (DR-O13 needs the MP12b1 run) | T01b (steps 2, 3 and 4); T04d (`identityVerdict`, case `proof: identity block`, T04d-B03); T04e (the identity gate) |
| Ruling of the pack author, 2026-11-17 (T02a's report) | Five deviations accepted: case 1's extra checks (the dispatch edits' text, the legacy route at `min` 52 and 112); stale harness lines found by name (now a rule, §3.1 "Cited lines"); the off-by-one `clues.js` ends of `bandDistance` (222-227) and `ranked` (234-239); the firewall's full line; the `@typedef` lines. Phases B to E are the prototype's text with only step 4.8's changes (`docs/improve-generating/evidence/drift/claude-opus-5.5/t02a-port-check.mjs`: 14 changed lines, no undeclared name); the ported P1 case runs B, C and E (asserted) and D's phase line; D's loop and the `return conclude(best)` after it run first in T02d's case 1 (the added `S2` call), then in T07a and on real calls in T04e. The ordinal assertion is a guard of step 5's proof, untestable without a larger set. T02d's case 1 needed `v4Call`'s `spec.uniqueness`, which T07a added later: moved to T02d, with `spec.journal` for its case 3, a check that the count lines sum to `locate.countWork` and the `S2` call (T02d: 3 h, total 98 h) | T02a (step 2's line ranges); T02d (estimate, scope, step 4, cases 1 and 3); T07a (step 6); §1; §3.1, §3.2 |
| Ruling of the pack author, 2026-11-17 (T02b's report) | Four deviations accepted: case 1's second pass `parity-ok` (`DOWN` for both seams, `require`: `ok`, at least one `repair` event), because the table's `REBRACKETED` input ends `not-in-band` and never reaches the repair, its counts or the `selected` event (no later task relies on that input); `v4Ctx` is `async`; the `journaled(name, fn)` helper; the extra asserts of cases 3 to 5. Case 2 proves the throw came from the third call (`boomC` is thrown nowhere else); that the throw ends the call at once (no fourth `charge`, no third event) is two asserts added by T02c | T02b (step 1, cases 1 and 2, T02b-T01); T02c (scope, step 3, the Tests row, T02c-T06; "after T02b's five") |
| Ruling of the pack author, 2026-11-17 (T02d's report) | Five deviations accepted: case 1's extra asserts (begin then its completion line, `screen` with the screened phases, the call id); case 3's non-vacuity asserts and its shared name (the rng stream); the shared specs and the layout; the `NOTE` line. Case 2 gains `w` 100,000,000 so that the census overshoot is exercised (3 clues, `c` 1,000: `censusComplete` false, `censusWork >= 1000`); a fix round of T02d. A test seam's begin lines describe the native path; no measured row sets a seam, so no ledger sees them (documented, no code change). The bound's O(area + pieces) cost stays: every measured `v4`-family row journals, so the bound is needed exactly where time is measured, and it is small beside a rating's own setup work | T02d (Authority "Test seams", step 4, case 2, T02d-T02) |
| Ruling of the pack author, 2026-11-17 (T03's report) | Eight readings accepted: the direct `meta.rerun`; the inputs hashed by `sha256File` (`lf-text`, T01a's rule and every other evidence hash of this pack); the Totals row and the Inputs table; the extra asserts (the stub `levels` proves `offeredAtFrozen` is computed, T03-T02); the README and header additions; files written before the exit 1 of a missing fact; the populations built over the `alternate` rows only (the Goal's alternate populations; `hell-3`, `hell-2`, `hell-1` order equals the ids' descending order; no later task reads them otherwise: T11g's stage-5 indications read IGP-05's families directly). The snapshot is identified by `meta.source.equalsFrozenSource` (the source digest covers `core/engine/levels.js`). T11g now cites the inventory, as T03's Goal says | T03 (step 1); T11g (step 1, section 1); N-V4-04 |
| Ruling of the pack author, 2026-11-17 (T04a's report) | Accepted: `admits` exported from `lanes.mjs` and shared by `runAll` and the group check (one rule, no copy); case 3's added parts; the extra asserts; the readings (lines from 1, a non-object line malformed, a state without `identity` refused, whole milliseconds, `step: 'items'`, lanes closed in a `finally`). A fix round of T04a, unlocked: the test kind `test-item` (held like `test-hold`, not a call kind) so that case 3 proves the item admission and the item cut alone; case 3's horizons `+ 6` s (lane creation inside the admission margin); case 7 `items: the run identity` (T04b to T04f rest on it); jobs built as `{ ...payload, kind }` so that a payload key never overrides the kind. A malformed last line after a crash stops the step for a ruling, as designed; two invocations on one log are serialised by the lock helper and the runner | T04a (estimate 3 h, steps 1 to 5, cases 3 and 7, gate, T04a-B01, T04a-T02, T04a-T07); §1 (total 98.5 h) |
| Ruling of the pack author, 2026-11-17 (T04b's report) | Eight readings accepted: the texts of the unspecified problems; `calls` as the number of `start` lines; unknown work `null`, never zero, with known partial sums beside `complete: false` (D-V4-17: no consumer reads an incomplete ledger's sums as evidence; T04c needs `complete`); the `foreign` strictness; `unquantified` only for a paired `p` line (an unpaired one is already `unpaired p line`; both make the ledger incomplete); the worker's fail-fast checks, the `wx` write and the stricter `missing`; the case inputs; the cited `node-worker.mjs` lines (now 47-51 and 19-36). T04c reads `maxSequence` on the `record` row only and gains a failing sub-case; T04c adds `ledger.mjs` and `packs.mjs` to the worker-module audit (no fix round of T04b: both are pure or import only Node built-ins, checked by grep). A real call ending `uniqueness-not-proved` is valid parity evidence (results, work and charges are compared whatever the outcome; the record mode's detail needs scored events, which such a call has); the `selected` event's parity is T02b's `parity-ok` and appears on real calls whenever a case ends `ok` | T04b (Authority, steps 1 and 4); T04c (scope, steps 3 and 7, case 3, gate, T04c-T04); T09c (rule 6) |
| Ruling of the pack author, 2026-11-17 (T04c's report) | Twelve readings accepted (each pinned by an assert): mixed or unknown routes, a non-numeric `record` `maxSequence` and an unexpected replay status or outcome `fail`; only complete ledgers compared; censored, missing or unmatched replay items `incomplete`; findings as `reasons` lines also on `pass`; generation and replay rows told apart by the id suffix; `run`'s argument and format checks and its `ensureTree`; the extra cases and README rows. A matched calibration replay always names an integer `detailStep` on the frozen code (`measuringStep`, `core/engine/replay.js:743-756`; asserted for every fixture puzzle, the calibration puzzle included, `tests/replay.test.js:1095-1117`), so the rule cannot fail a correct calibration replay in T04e. T04d's `stepEvidence` now defines the joined rows (per manifest row, by `expandManifest` of that row) and `stage1.md` lists the findings of a passing replay block | T04c (step 3's ruling note); T04d (step 2 `rows`, step 3 `stage1.md`) |
| Ruling of the pack author, 2026-11-17 (T04d's report) | The three defaults accepted: a failing receipt's reasons are its root `reasons`, else `[line]`, else `['the receipt''s verdict is fail']` (T11d's receipts now carry `reasons`; the stage-1 receipt has its `line`); the capture and missing-input reasons form a seventh block `inputs`, so the line and the verdict agree (T04f's expectation reads `line` only); an identity coverage id needs both the seed's `mp12b1~base` and `base~log` pairs, the seeds in the record's `landscape/` form. The other deviations accepted (case 8, the envelope's reserved keys, the second reason of `not a <kind> receipt`, the replay producer check, three reasons per block, `pm4Verdict`'s missing fields `incomplete`). `summary.mjs` (IGP-07, provisional) reads every `plans/*.json` as a run plan and would throw on the item manifests; this pack never runs it (the provisional records are final), so no change. IGP-02's frozen forecast (1,520 s) passes its allocation (1,500 s) by 20 s inside its guard (1,875 s); the requested stage-1 allowance of 92 minutes is at guard level, so nothing changes before T04e | T04d (step 1 `proofCheck`, step 3 coverage and ruling note); T11d (step 3 `fields.reasons`) |
| Ruling of the pack author, 2026-11-17 (T04e's QUESTION) | Not a prototype defect, not a harness defect: the `26x26-nightmare` replay generation (`require`, one pool worker) found no set within the client's 115-s request deadline because every unique repair of its central candidates was refused (AR1 24, below the band 9) after 63.7 s of attempt 0; ratings ran at their normal 26x26 cost, the journal overhead is negligible and the lock was held; the provisional and identity figures are `any` with four workers. The developer's option (b) in this form: the replay step of `V4-T04` runs again with the same harness after its first observation and receipt are archived in place, its third case now `14x14-nightmare` (9 items, as T04c's test expects); a new task id would need harness changes, which the producer binding of the stage-1 receipt forbids after the observations. The replay gate is unchanged (a full candidate proof per case on both routes), no budget is raised (about 250 s counted of the 3,369 s left), so neither the owner nor the supervisor is needed. N-V4-15 records the `require` finding | T04e (scope, the ruling section, steps 4 to 9); T04c (step 4); §3.1; N-V4-15 |
| Ruling of the pack author, 2026-11-17 (T04e's failing `--items` case after the second observation) | The fix belongs to T04e, now, as a fix round after the passing receipt: `self-test.mjs`'s case `checks: manifest expansion` names `14x14-nightmare` as the third replay case, and README's **Manifests** bullet says so with the archive. It does not touch T04f's acceptance: `stage1.json`'s producer is its stored `harnessHash` (`136d4c6c...`), which T04f binds (D-V4-18), and neither file is among its 20 evidence files (all `same` on 2026-11-17 11:15 by T04f's step-0 check). After any harness edit, `summary --task V4-T04` and the `V4-T04` plans are never run again (the summary would report a changed producer and overwrite the passing receipt), and no self-test group runs under a stage-1 id. Nothing else names the old case: T04c's Tests table states counts only, T05's `14x14-nightmare` uses its own seed, task and variant, and T11's manifests generate on `12x12-nightmare` | T04e (scope, guards, step 10) |
| Ruling of the pack author, 2026-11-17 (T04f's report) | Six readings accepted (the tenth case and the extra asserts, joined step problems, `abs(manifest)` and the missing-producer refusal, the subcommands' refusals and path normalisation, `label === 'frozen' && existsSync(...)`, the README). One fix round of T04f, unlocked: `reservedTaskProblem` and `main` take a `historical` list (default `HISTORICAL_SELFTEST`) and a new `--items` case proves on a scratch id, with `--only 999` so that no case can run, that `main` returns 3 and writes nothing for a reserved id, against a control that writes; a regression there would rewrite a hashed stage-1 state and make the binding's `checkAccepted` incomplete for every later consumer, so the wiring is tested, not only read. Accepted as they are: `checkAccepted` has no default `current` (each consumer passes its ids: T09e, T11c, T11d); `stage1Expectation` is the stage-1 receipt's alone (`V4-T04` ids, `line`), T11d adds its own `stepExpectation`; `check-binding --current <id>` builds a missing tree (consumers name bound arms only); the `V4-T04` plan's self-test steps now exit 3 and its `summary` step must never run again (a rerun would also change the receipt's hash, which `checkAccepted` reports) | T04f (step 3, the case, T04f-B02) |
| Ruling of the pack author, 2026-11-17 (T05's report) | Five readings accepted: `incomplete` when candidates exist but no batch `start` line was journaled (no vacuous pass); a non-integer `w` fails; the extra inputs (the `K - 2` clamp, wrong algo, absent window, no start line, no candidate, a replay mismatch, a censored generation); `detailStep` on the calibration replay row; the `wrote <path>` line. Both named items are correct as specified: the prior's match rule takes `calibrationCandidate`'s level and certificate conditions only, because unseen keys decide the reuse of the calibration puzzle, not the window of the same set at the target level (plan P4 item 2: "the calibration returns the count and the window at which it found the band"); `priorTable` `prior-v1` stays in the `v4-ps` records because the table still starts the calibration, unmatched candidates and the completion pass, while `made.igPrior` records each override, so D-V4-05's refusal (algo `gen-v4-proto:v4-ps`, both table versions) and the parity and P-0 identities (tree ids and parameter hashes) are not misled. The one-case scope is by design: speed is stage 2's pilot (N-V4-02) | T05 (Authority, the match-rule bullet) |
| Ruling of the pack author, 2026-11-17 (T06a's report) | Four readings accepted: `linkSummary` returns the totals over the lines' batches at the top level (the batch's own for a single batch) with `batches` per batch, which T06a's and T06b's cases read and T06b extends at the top level (T09c reads link lines, not `linkSummary`); the stricter report (a link file without a published row, a complete set without a batch `start` line, a `log-link` digest other than T04e's); `incomplete` before `fail`, as T06a's text orders them (a run without the timeline fields is uninstrumented, not failed), exit 0, 2 or 1; the extra asserts and the time problem. The `link` lines in published `calls.jsonl` files stay: they are the committed copy of the linkage evidence (the raw logs are git-ignored). No frozen-round reader reads published calls files (T09c and T09e read the raw logs and `<rowKey>.link.jsonl` apart); the provisional readers `compare.mjs`, `compare-r2.mjs` and `summary.mjs` are not run on frozen-round arms, and their `assembleCalls` would only add one call without an id that no row or stage matches. A later reader of a published calls file keeps the line types it reads. `v4-ps-link` and the `rejected` and `fail` consumptions get their first real runs in stage 2 (N-V4-02); synthetic cases cover them now | T06a (step 4, the shape); T06b (step 3) |
| Ruling of the pack author, 2026-11-17 (T06b's report) | Four readings accepted: T06a's two whole-object cases gain the seven zero counts (`NO_CLOSURE_LINES`, stricter); closure lines are counted over the row and kept out of batch grouping (a `set-complete` carries batch 0 and worker lines none; T09c reads these lines itself, rules 7 and 10, so its ledger and D-V4-17's confirmed terminations by `pid` and `threadId` do not depend on `linkSummary`); the extra checks, the third case, JSDoc and header; the README's corrected sentence (the completion pass is linked). Named items: the closure counts stay in `linkage.json` only (no reader of `linkage.md`); a worker that died before its termination was requested has `threadId` -1 and closes no call, so its calls stay open and the row's ledger is incomplete, the safe side: T09c's rule 7 says so and its termination case gains that input; the first real closure lines come in stage 2 (N-V4-02). T06a's `V4-T06` evidence keeps the tree ids of its own records: no consumer binds it to the current link trees (T09e's example reads the published records' tree ids and runs-file hashes, never a tree folder, and expects `Phase 0: INCOMPLETE`) | T09c (rule 7, case `ledger: a termination request is not an end`) |
| Ruling of the pack author, 2026-11-17 (T07a's report) | The moved `v4`-family tree ids are the intended state (D-V4-05: an edit inert for an arm's parameters keeps the variant id, and the P-0 pass re-checks stage 1 on the final trees): `v4` `006431d6...` to `61729ef5...`, `v4-w095` `eddc3839...` to `65d65342...`, `v4-w380` `3f7d8fd7...` to `8fe5190f...`, `v4-w760` `33073bad...` to `919bc52f...`, `v4-ps` `2fce47b5...` to `aa6facf9...`, `v4-link` `f2d73e8c...` to `ab06a785...`, `v4-ps-link` `2516ed00...` to `c300f0a4...`; no parameter changed. `check-binding --current v4` against the stage-1 binding is `stale arm v4` by design: every consumer declares that binding with `current: []` (T09e, T11c, T11d, T11f), `p0-identity` compares results and parameter hashes, and `current: ['v4']` is used only against the P-0 binding of the final trees (T11c, T11e); T11d now states this. Deviations accepted: one name per scenario (the name feeds the rng stream and the journal's `row`, so T07a's text `'budget' + n` was wrong; corrected), the extra asserts, the comments. Named items: a budget stop that finds no finished final returns `not-in-band` as specified, and readers identify budget stops by `end.locate.budgetStop`, never by the reason (T07b's bound counts only `no-window-*` reasons, T09d compares accepted counts); `end.locate.result` `null` before the window count is fixed is a valid value; `rate:repair` in S2 only is enough for the sweep. The replay of a budget-stopped call and the silent stopped repair get tests in T07b (a new case and one assert in T07a's case 18); a faithful replay meets the same units, so `verifyConsumed` finds every recorded skip before the stop | T07a (case 16 text); T07b (step 4, the case, T07b-T05); T11d (Authority) |
| Ruling of the pack author, 2026-11-17 (T07b's report) | Q1 accepted: the replay case's input becomes `require` with `igCanonical` `synthetic(c <= 4 ? 60 : 56)` and the name `p5-skip-g` (with `DOWN` for both seams and `any` the budget stops before the first in-band candidate, so the stopped call has no skips); the row states it. The named item on `any` is a defect of the pack, not of the code: T07a's text dropped R10's condition ("Do not call the lazy `chooseBest` path if it can perform new work after exhaustion"); in `any` mode `finish` returns the raw subset (no rating, no count, no rng draw), so `chooseBest` does no work, and plan P5 says the call "ends with its best result". As written, every budget stop of an `any` call (the mode the frozen round measures and the Generator's default, `generator/state.js:139`) returned `not-in-band` while in-band candidates waited, so the P5 arm would have counted cut calls as lost completions (T09d, IG-P-D1 condition 4). A fix round of T07b (0.5 h; T07b 3.5 h, the pack 99 h): step 1b (in `any` mode the budget end calls `chooseBest()`; `require` keeps `bestFinished()`), the case `p5: budget end in any mode returns the best waiting candidate`, the `igSetBound` inputs (g) a `fault` and (h) a `skipped` fourth attempt (both `null`), the README's end rule and its `p5-1` sentence (the edit is in `setAttempt`, not `firstSetAttempt`), T07b-B02 and T07b-T06; T07a's Authority and step 4 note the correction. No plan text, recorded decision or later task changes: T09d counts rows, T08 composes the tree, and readers still identify budget stops by `end.locate.budgetStop`. Deviations 2 to 5 accepted (the extra checks, the trees' `--source-label 'frozen 3fc65f4'` metadata, the README rows, `uniqueness` through `extra`). Named items: the glue `p5-1` and the worker's pass-through of the reason are proved by reading (`core/engine/tasks.js:161-169` returns `setAttempt`'s result; neither `protocol.js` nor `tasks.js` reads a result's `reason`; `core/browser/worker-pool.js:425` resolves `message.value`; `core/browser/generation-client.js:633` keeps `String(value.reason)`) and by `check-edits`; their first real use is stage 2 (N-V4-16); false stops stay T09d's. Gap accepted: the width-8 trees run scripted pools only (RV2-05) | T07a (Authority, step 4); T07b (header, Authority, Scope, steps 1b and 5, Tests, Stop points, T07b-B02, T07b-T06); check-list (index, the P5 row, N-V4-16) |
| Ruling of the pack author, 2026-11-17 (T08's report) | Accepted, no fix round. Deviations: `let proof = null;` already stands between the first `bisect();` and the block, which is what step 2's move was for; the fuller JSDoc and header; the extra asserts (stricter); the NOTE lines; the README rows; the partial run under `V4-T08` (not a historical namespace; the full gate rewrote its state); the default, `--proto` and `--p6` groups not run (the change is in the `v4` family's file only, and `check-edits` and `--frozen` case 4 cover every variant's edits). Named items: the guard `call.rerates < rerateMax` holds whenever the block runs (only the rescue and phase E re-rate, both later) and stays as the statement of the shared allowance; (c4) leaves `locate.hit` at the locate hit unless the lower count ends the call, and it fires for an AR1-refused hit too (its condition does not read the kind, so case 3 covers that code; the lower count may give the first acceptable candidate, which is what (c4) probes for); `fr-ps` against `v4-ps-link`, checked by the pack author on the built trees: they differ only in `ig-params.js`, `ig-tree.json` and the order of two blocks appended to `core/browser/generation-client.js` (the `link` imports and the `ps` block with the function declaration `igPriorOf`, all hoisted), so the module is the same; every other `fr-*` tree differs from its base only in `ig-params.js` and `ig-tree.json`; no task binds `fr-ps` to `v4-ps-link`, and its P-1 parity pass (T11c) checks it as its own arm. Correction: no task of this pack reads `locate.close`, `locate.c4` or the phases `close` and `below` (T09 reads rows and ledger lines whatever their phase; T09d's `deadEnds` reads `p2` only), so the stage-2 report reads them (N-V4-17). Gaps accepted: the first real runs are the P-1 parity passes (T11c) and stage 2 (N-V4-02); the ordinal bound is the pack's (T02a step 5 and D-V4-04 count two for (c4)) and the code keeps it ((c4) once per call by `loc.c4 === undefined`, a repeated subset takes no ordinal, `rerate` reuses the probe's ordinal, and `rateSubset` throws at the bound) | check-list (the P2 and P3 rows, N-V4-17) |
| Ruling of the pack author, 2026-11-17 (T09a's report) | Accepted, no fix round. Deviations: `tenth` defaults to `null` (an undefined T10 fails the frozen schema); `rec` and `row` come from `verdictKit()`, loaded on first use, because a static import of `verdicts.mjs` would make every self-test group need the frozen source (T09b to T09e now name it); the guards that throw on a missing `quantity`, `capMs` or `responseBoundMs` and on a ten-puzzle row without a T10, and `puzzleEvidence` on a count that is not an integer (fail closed); `ingestRow` on a non-object row and the run's own problems after a mismatch. Readings: `problems` lists the conditions of the winning status (first match wins); `p95Ms` only over exactly 20 valid rows (the plan's nearest-rank p95 of 20); every `errors` entry of phase `validation` or `certificates` is `incorrect`, which at `3fc65f4` is exactly the listed codes (`tools/bench/runner.js:636`, `:641`, `:662`; `faultPhase` is `set` or `batch`, `:512`); `completion` takes `capMs` without using it; `validationReps` for the class, failing, control and Hell 1 cells and `masterReps` for the Master cells, as T11a's reps and T11f's manifest have them. Named items, fixed in the pack: T11f's `verdictInput` writes each arm's `id` (its name, as T11f step 1 already does for the receipt) and its test checks it; T09c's rule 8 counts with `reachedTen` (its input has no `responseBoundMs`) and returns the two counts; T09b to T09e name `verdictKit()`; T09c's `rowLedger` is its own. The `arm.mjs` citations stand (the file is unchanged since IGP-00: the rows are built at 263-266 and written at 267; `oneRowCase` is cited by name). Gaps accepted: the import refusal without the frozen snapshot is specified; the schema's examples are first read by T09e; the first real rows are those of the frozen round (N-V4-02, N-V4-03) | T09b (step 2); T09c (`workRule`, rule 8 and its return, step 3, the Tests preamble); T09d (step 2); T09e (step 5); T11f (step 3, case `verdict input: selection and final`) |

## 6. Named items for later packs

| ID | Description | Numbers | Routed to |
|---|---|---|---|
| N-V4-01 | Browser calibration (IG-P-Q23): the frozen `base` tree in Node and the bench page served from the snapshot, on 10x10, 12x12 and 26x26 Nightmare and 14x14 Master, same requests and seeds, no observers, journal or prefetch; a bench-page factor. A Generator-page calibration with its prefetch (DR-O06) is a separate item on boards of at most 484 cells (DR-O16) | projected in T11g (B-1, B-2); the Node part of B-1 priced, the browser parts' ceilings unpriced until this item enumerates their runner | later pack, after the owner's approval of T11g's price |
| N-V4-02 | Stage 2, pilots on fitting seeds: the per-set prior on Hell 1 first; the journal linkage; every class's `W_screen` and no-screen arm, 26x26 Nightmare included; 10x10, 16x16 and 15x20 Nightmare; (c4); D-IG7; Hell 1 24x24 and 14x14 five-seed pilots; P5's budget arm and the reserve; the P8 probe; `fewestColumn`; the parity passes of the stage-2 arms | T11c's plan `V4-S2`, priced in T11g's manifest | pack "frozen round, stages 2 to 4", after the approval |
| N-V4-03 | Stage 3, the freeze of the `W_screen` table and its class boundaries, the priors, P5's budget table and bounded-attempt policy, the reserve and deadline configuration; it provides the variants `fr-frozen`, `fr-frozen-none`, `fr-frozen-uncapped`, `fr-frozen-none-uncapped` and `docs/improve-generating/evidence/frozen/V4-S3/freeze.json` (the class table, `{ classes: [{ id, cells, screen, noScreen }] }`) that `V4-LIVE` and the stage-4 activation require (T11c, T11e); their parity passes; then stage 4: the owner's decision on the optional S4-6 and authorization of T11e's data-only `activate`, which writes the plan `V4-S4` and its price; then the owner's approval of that plan's timed allowance; then the plan, T11f's `V4-S4C` and the verdicts (T09a to T09e) | T11g's manifest | same pack; the fit is the analysts' work, its encoding a task |
| N-V4-04 | Stage 5 (separately approved, IG-P-D5): the rest of the reduced PM1 (Hell 1 failing sets feeding P4's Hell 1 table, then Hell 2's central share; its data-only inventory is T03's `docs/improve-generating/evidence/frozen/V4-T03/inventory.md`, cited by T11g), C4's counting, C3's capped-input features, further browser runs | unpriced in T11g (RV3-05): this item enumerates its bounded schedule and prices it; its adoption record `docs/improve-generating/evidence/frozen/V4-S5/adoption.json` unblocks the second-validation template (T11c), which then needs its own activation, selection, comparators and final verdict in the namespaces `V4-S4X` and `V4-S4XC` (D-V4-20) | owner approval per item |
| N-V4-05 | P7's scoped spike: C1 (incremental R4, then R5) after T10a's counters, then C5; equality of `DeductionResult` on PM4's corpus; the memory-limit rule; phase 1 ships the proved-equal items | plan §3 P7 | pack after the counters' run (N-V4-02) |
| N-V4-06 | The phase-0 gate: the certificate on the frozen source (T04e), the completion gate and no dead-end entry, no regression, every screen class's (c5) verdict, the reserve fitted and frozen, the live-deadline receipt (N-V4-13) | plan §6; T09d's `phase0Verdict` on a final-purpose input (T11f) | after N-V4-03 |
| N-V4-07 | Phase 2, `gen-v4` in production: P1 to P5 from the frozen configuration; the seven-key provenance (IG-P-Q36) with `gen-v4`'s skip bounds and the per-set prior in `made`, ported from T02c; one running version and its refusal case; Generation steps' new events with English and Vietnamese sentences, design §6.12, both user guides and the release notes (old-version steps unavailable, DR-O01); the saved-steps key with the running table versions (DR-O17); `REPLAY` re-derived and replays measured (DR-O05); the `gen-v4` replay case and the five fixture consumers (DR-O03); the frozen round's validation repeated on the production code | plan §6 phase 2 | pack after N-V4-06 passes |
| N-V4-08 | Phase 3, offers: the Nightmare and Hell 1 landscape; browser runs (prefetch state named, DR-O06); `AREAS` re-derived by D39's rule with a new `POLICY_ID`; for Hell 1 also `LISTED_LEVEL_IDS`, the notices, the page metadata, the guides and BQ-1's Hell-1 seeds (DR-O10); OD-P4, IG-P-Q12 | plan §6 phase 3 | pack after phase 2; owner decisions |
| N-V4-09 | The blind play comparison of the two populations on one Nightmare and one Hell 1 cell (Hell 1 14x14 as the extreme case) | IG-P-D3 | before any phase-3 offer |
| N-V4-10 | Progressive presentation's service level (OD-P5 (b)) with measured browser first-puzzle times | plan §6 | owner, later |
| N-V4-11 | Phase 4: P11, P8 as an opt-in, P10 as Hell 1's fallback, P9, C3 and C4 if their tests support them | plan §6 phase 4 | per item |
| N-V4-12 | P6 in production (T12): its timing at four workers and the two memory checks of plan §6's phase-1 gate, read with the next bench run; T12 itself runs no timing | R22: T10 x1.12 to 1.32 on today's search (IGP-04) | the first bench run after T12 (phase 2's validation on the production code, N-V4-07, or a release gate) |
| N-V4-13 | Live request deadline and reserve in the prototype: the one-request 115-second generation stop, the fitted set-stage reserve and the hard 120-second response backstop in the copy's client and host of `fr-frozen` and `fr-frozen-none`; tests for a reserve-cut set, a partial accepted prefix at the generation stop, cancellation of outstanding work and response assembly at the hard bound; the tool `tools/ig-proto/live-deadline.mjs receipt --task V4-LIVE`, which writes `docs/improve-generating/evidence/frozen/V4-LIVE/live-deadline.json` (kind `live-deadline`, T04d's `LIVE_DEADLINE_FIELDS`) from the rows of T11c's plan `V4-LIVE`, and the kind `live-deadline` of `v4-check accept` (T04f, T11d), whose binding `docs/improve-generating/evidence/frozen/V4-LIVE/live-deadline.accepted.json` the stage-4 plans require, before any stage-4 validation command | priced in T11g (`V4-LIVE`); the checks are verification | the stages 2 to 4 pack, before stage 4 |
| N-V4-14 | The width of the work intervals (IG-P-Q37 point 4): T02d's proved bounds are large on large boards (with no clue about 1.13 G units on a carved 10x10 Nightmare set, 3.7 G on 14x14, 15.3 G on 18x18 and 242 G on 26x26, with the R9 term corrected in review 4; `bound-cheap.mjs`), so one open rating can widen an arm's interval by more than the 840 M that point 4 states; the stage-2 journals report the real width per class (T09e) before the freeze. If it leaves the work condition undecidable for a class, a tighter proved bound (for example a deterministic re-rating of an open primitive from its recorded inputs, which costs machine time) or a relaxation is a new proposal that needs the plan author's ruling and the owner's approval; review 4 ruled that this item needs no question now | T02d's magnitudes; T09e's width report | the plan author with the stage-2 report, before the stage-3 freeze (N-V4-03) |
| N-V4-15 | `uniqueness: 'require'` on large boards: on `26x26-nightmare` (seed `ig-v4/replay/26x26-nightmare`, K 31, one pool worker) the `v4` set stage's attempt 0 ended `not-in-band` after 63.7 s: 16 central candidates at 4 or 5 clues, every unique repair to 7 to 9 clues refused by AR1 or below the band; attempt 1 was cut by the 115-s request deadline. The frozen search shows the same mode on `14x14-master` (attempt 0 `not-in-band` after 97 ratings). The frozen round measures `any` with four workers, as MP12b1 did, so it says nothing about `require`; the Generator offers `require` up to 484 cells | 101 ratings, 13.9 G units, 24 AR1 refusals and 9 below-band repairs in attempt 0; `V4-T04/replay-a1/` and `stage1-a1.json` | the production pack (N-V4-07): measure `require` on the Generator's largest offered Nightmare and Hell 1 boards before any claim about them; owner for the scope |
| N-V4-16 | P5's glue in real runs: edit `p5-1` (`setAttempt` reports `no-window-<side>` when its calibration result carries `igNoWindow`) and the worker's pass-through of that reason are proved only by reading and by `check-edits` (T07b; its scripted pools feed the reasons in). A zero false-stop count of `fr-p5` reads the same whether the bound never fired or the glue lost the reason, so the stage-2 report reads it with the journals: a `fr-p5` row whose set attempts 0 to 3 each have a calibration call that ended without a window on the same side (their `end` lines) and that did not end `set:no-window-<side>` is a defect of the glue, not a finding about P5 | code read at `3fc65f4`: `core/engine/tasks.js:161-169`, `core/browser/worker-pool.js:425`, `core/browser/generation-client.js:633`; T07b's report | the stage-2 report (N-V4-02, S2-6), before T09d's false stops of `fr-p5` are read |
| N-V4-17 | Whether the stage-2 mechanisms reached the calls: no task of this pack reads the `end` line's `locate.close` (`fr-close`) or `locate.c4` (`fr-c4`), nor the journal phases `close` and `below`, and T08 proved the class table only on synthetic ratings. The stage-2 report states, per arm and cell, the calls with `locate.close` and with `locate.c4`, each by `side`, and the `start` lines' `W` against the arm's class value (`fr-base`, `fr-screen`, `fr-none`), so that a null difference against `fr-base` is told apart from a mechanism that never fired or a limit that did not reach the call | T08's synthetic cases: `fr-close` 5 profiles against `fr-base` 65; the (c4) probe at 2 below a hit at 3; the `start` line `W` 760 M, 190 M and 380 M by arm and level; T08's report | the stage-2 report (N-V4-02), before the readings of `fr-close`, `fr-c4` and the class table |

## 7. Summary (filled by the orchestrator)

| ID | Start | End | Duration | AI credits | Commit |
|---|---|---|---|---|---|
| T01a | 2026-11-17 04:30 | 2026-11-17 04:46 | 16 min | 314.67 | `0ef440e` |
| T01b | 2026-11-17 04:47 | 2026-11-17 05:02 | 15 min | 234.36 | `c7b9d47` |
| T02a | 2026-11-17 05:02 | 2026-11-17 05:35 | 33 min | 275.56 | `4f14450` |
| T02b | 2026-11-17 05:36 | 2026-11-17 06:04 | 28 min | 168.02 | `731338c` |
| T02c | 2026-11-17 06:05 | 2026-11-17 06:15 | 10 min | 152.37 | `f55db42` |
| T02d | 2026-11-17 06:15 | 2026-11-17 06:37 | 22 min | 325.03 | `ca1b9d5` |
| T03 | 2026-11-17 06:37 | 2026-11-17 06:47 | 10 min | 139.64 | `4ba6f70` |
| T04a | 2026-11-17 06:47 | 2026-11-17 07:09 | 22 min | 274.29 | `5158729` |
| T04b | 2026-11-17 07:10 | 2026-11-17 07:32 | 22 min | 245.93 | `4622c22` |
| T04c | 2026-11-17 07:32 | 2026-11-17 07:51 | 19 min | 274.90 | `107957c` |
| T04d | 2026-11-17 07:51 | 2026-11-17 08:16 | 24 min | 421.41 | `a082333` |
| T04e | 2026-11-17 08:16 | 2026-11-17 11:18 | 3 h 2 min | 230.85 | `2f7a0ed` |
| T04f | 2026-11-17 11:19 | 2026-11-17 11:34 | 15 min | 244.43 | `991520a` |
| T05 | 2026-11-17 11:35 | 2026-11-17 12:07 | 33 min | 318.38 | `cc9f571` |
| T06a | 2026-11-17 12:07 | 2026-11-17 12:28 | 21 min | 318.18 | `100bb05` |
| T06b | 2026-11-17 12:29 | 2026-11-17 12:41 | 12 min | 198.99 | `9f5fb57` |
| T07a | 2026-11-17 12:41 | 2026-11-17 13:01 | 19 min | 242.82 | `e2745bd` |
| T07b | 2026-11-17 13:01 | 2026-11-17 13:50 | 49 min | 499.46 | `9caa70f` |
| T08 | 2026-11-17 13:50 | 2026-11-17 14:19 | 28 min | 268.38 | this task's commit |
| T09a | | | | | |
| T09b | | | | | |
| T09c | | | | | |
| T09d | | | | | |
| T09e | | | | | |
| T10a | | | | | |
| T10b | | | | | |
| T10c | | | | | |
| T11a | | | | | |
| T11b | | | | | |
| T11c | | | | | |
| T11d | | | | | |
| T11e | | | | | |
| T11f | | | | | |
| T11g | | | | | |
| T12 | | | | | |
| T13 | | | | | |
