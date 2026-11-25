# improve-generating-v4: task-pack cross-review 4

Reviewer: SA-Astra (gpt-6-astra). Pack author: SA-Opus.
Start: 2026-11-16 22:44:00 +07:00.
End: 2026-11-16 23:44:16 +07:00.

## Basis and result

- Reviewed `review-3-response.md`, the current checklist, the new/rewritten tasks and the remaining task changes
  against the frozen round-3 copy. This review covers the 17 findings left for this round; earlier resolved
  findings are not silently reopened.
- Pack-input SHA-256: `31984e93115df655a55a923aa5f9653eba4b7b5fc5e3362bdb4629c7f2539d9a`
  (sorted checklist/T-file names, each followed by LF and its LF-normalized content).
  Plan SHA-256: `ce6170b8f927a5f8681794a2aad714b4637374b04841e55fe2063f20e705b708`.
- Removing only the new work-condition sentence and the new plan-author decision table from the plan reproduces
  its round-3 SHA-256, `f0f289e98ba1f728ae96a1b697651c81db775255ecf21239989fe05cfe159c00`.
  No other plan change is hidden in this revision.
- The production source digest remains
  `e181df2cc2e784355345c1a43c6a97800fbfa5e6d139d1b465054fa94204284b`, matching the stated `3fc65f4`.
  The 39 anchors in the author's current list match once after the inherited `instr`/`log` edits, applied in memory.
- Read the relevant kernel, logger, row runner, plan runner and evidence writer code. Checked the R9 proof term
  with bounded synthetic CSR arithmetic using the frozen rule body; no full solver, rating, generation, replay,
  benchmark or test suite was run. No Git action. Only this review is written.

**Verdict: changes required.** Of the 17 prior findings, **11 are resolved and 6 are not resolved**.
There are **8 new findings: 1 blocking, 6 major, 1 minor**.

The policy disagreement is closed by IG-P-Q37. The pack now uses the intended consumed-work intervals, not the
completed-unit ratio as its acceptance quantity. The remaining work is technical: the bound's supplied derivation,
primitive-log validation, historical evidence persistence, executable plan fields and a few concrete test/approval
contracts. It does not require reopening the supervisor's choice.

Severity follows round 3: blocking/major only for an unsound gate, a false claim needed by the implementation,
an execution failure or an unresolved implementation choice. The minor finding alone would not block acceptance.
The replacement text is for the pack author to incorporate, with dependent scopes, tests, estimates and prices.

## Prior-finding status

### Open RV1 findings

| ID | Status | Verified disposition |
|---|---|---|
| RV1-12 | resolved | The previously missing admission machinery is present: row/evidence validity, pooled class statistics, the ruled work comparison, shipped-arm gates, Master identity and final-purpose P5 coverage. The new bound/parser implementation defects are RV4-01/RV4-02, not a renewed policy disagreement. |
| RV1-14 | resolved | T11a/T11e/T11f separate the priced universe from one activated collection and its comparators; second validation remains a distinct non-executable template. The initial resolver no longer consumes second-cohort groups. |
| RV1-15 | not resolved | Nominal schedules and item cuts are simulated, but the request-row hard ceiling still rests on an unenforced ten-second allowance. See RV4-05. |
| RV1-17 | not resolved | The tools and states are named, but the compiled bounded non-row steps still lack fixed resume/minimum-horizon values and one script path is incomplete. See RV4-04. |

### Open RV2 findings

| ID | Status | Verified disposition |
|---|---|---|
| RV2-07 | resolved by ruling | IG-P-Q37 selects option (c); D-V4-17 and the normal interval comparison are rewritten accordingly. The completed-unit ratio is diagnostic. Technical conformance gaps in the new proof/reader are listed separately in RV4-01/RV4-02. |
| RV2-09 | not resolved | Producer hashes and independent accepted bindings are added, but T04f overwrites an input of the very receipt it must accept, and mutable evidence dependencies are not fully removed. See RV4-03. |
| RV2-11 | resolved | P-0 has a separate manifest/task/step, receipt gates have required-pass mode, and activation/resolution address one collection. The remaining emitted-step and activation execution details are RV4-04/RV4-07. |
| RV2-12 | not resolved | The reserve-as-duration error is fixed for item steps. The row ceiling still is not derived from an enforced bound: RV4-05. |

### RV3 findings

| ID | Status | Verified disposition |
|---|---|---|
| RV3-01 | resolved by ruling | The plan author chose interval accounting; both SAs accepted it. The plan sentence/table and D-V4-17 reflect that choice. No policy question remains; implementation corrections below still prevent acceptance of the pack. |
| RV3-02 | resolved | T04c refuses addressing mismatch; T11c clones the 23-item corpus into `V4-S2P/p0-v4`; T11d compares semantic-input keys and `result.digest`, preserves historical identities and provides `--require-pass` plus accepted bindings. |
| RV3-03 | resolved | Selection-purpose input cannot pass phase 0. Final input declares each comparator cell and its reps; `p5Stops` treats either missing/invalid side, including both missing, as unknown. |
| RV3-04 | resolved | Initial, conditional, optional and second collections are separated. Activation fixes the collection; a matching complete/closed selection resolves only its comparators. Second validation is deferred explicitly rather than emitted with unresolved variants. |
| RV3-05 | not resolved | Item censoring and the item ceiling are corrected; stage 5/browser ceilings are honestly deferred. The claimed row ceiling remains unsupported by the cited code, RV4-05. |
| RV3-06 | not resolved | The accepted-binding structure is substantially correct, but it does not prevent mutation of the receipt's existing evidence paths. The new T04f verification collision makes the first real acceptance fail. See RV4-03. |
| RV3-07 | resolved | T06b captures PID/thread/destination before the request, records confirmed termination on fulfillment, correlates completion calls by layout key, and T06a supplies link lines to the timeline validator. |
| RV3-08 | resolved | T09a validates complete, distinct puzzle keys and complete clue populations; T09b/T09d fail closed on missing evidence. The newly inconsistent clue-rule fixture is RV4-06. |
| RV3-09 | resolved | The old cumulative-case count, glued step, root selection field and compiler file-count wording are corrected. Remaining new wording issues are minor RV4-08. |

## IG-P-Q37 application check

| Requirement | Finding |
|---|---|
| Consumed selection work, not only completed units | Present in the plan, D-V4-17 and T09c. |
| Begin line before every rating/count, repairs included | T02d places it before `rateOnce` work and each repair count; T07a keeps the budget check before the begin. |
| Proved finite bound including overshoot | The intended form is present, but the supplied R9 intermediate inequality is false. RV4-01 must repair the derivation before the formula is called proved. |
| No kernel, cancellation or P5-unit change | The proposed observer-only placement preserves those boundaries. |
| Per-call lower/upper endpoints | The normal ended/confirmed-termination cases are specified. Invalid overlapping/error sequences need RV4-02. |
| Three verdicts | T09c uses screen upper versus no-screen lower for pass, screen lower versus no-screen upper for worse, otherwise unknown; incomplete/zero-denominator arms stay unknown. |
| Counterexample and boundary cases | The 900/1,100 versus 1,000/1,010 example is unknown, not pass. Open primitive, two open primitives, exceeded/invalid bound and between-primitive kill cases are named. Add the missing overlap-then-completion/error cases in RV4-02. |
| Observer parity | T02b links the added observer to T02d and the real stage-1 passes; T04b checks completed primitive bounds. |
| Diagnostic completed-unit ratio and termination counts | Present in T09c/T09e, separate from the judged interval comparison. |
| No feasibility claim; width before freeze | Explicit in T09c, D-V4-17 and N-V4-14. |
| Plan sentence and decision register | Exactly the two requested additions; the historical plan hash is recovered after removing them. |

## N-V4-14 ruling

**N-V4-14 can remain a named item. It need not go to the plan author now and does not itself block the pack.**

Point 3 of the accepted answer requires a proved bound including overshoot; point 4 expressly does not promise
that the resulting intervals will admit any class. Correcting the illustrative 840-M figure with the actual
proved bound therefore does not change the acceptance rule. The stage-2 width report before the freeze remains
mandatory; a tighter mechanism, extra re-ratings or a relaxation remains a new proposal with the required ruling
and approval, not an implicit authorization.

The numerical examples in N-V4-14 must follow the corrected proof/formula after RV4-01. That is a technical
correction to the present derivation, not a reason to reopen IG-P-Q37. No further supervisor/owner question is
raised by this review.

## New findings

Task paths are relative to `tasks/improve-generating-v4/`. Numbered blocks below continue the exact replacement
column where needed.

| ID | File and section | Severity | Problem | Exact replacement text |
|---|---|---|---|---|
| RV4-01 | T02d bound derivation and `igRatingBound`; magnitude references/N-V4-14 | major | The R9 term accounts for `coversBoth` but not the repeated two-piece touch scans at `deduce.js:1387-1406`. Those scans can occur for every qualifying pair without a kill; they are not bounded by the fixed `3 NZ` allowance. The stated per-model inequality is false (counterexample below). This is a proof gap, not a claim that a real rating exceeded the much looser final cheap formula. | Use **R4-01**: include those scans in the bound and update the derivation/magnitudes, or supply a valid replacement proof before retaining the old coefficient. Do not rely on the small-rating tests as proof of the inequality. |
| RV4-02 | T09c `rowLedger` rules 6/8; T04b item ledger | blocking | Overlap is diagnosed only if two primitives remain open at EOF. `begin A; begin B; completion B; worker-end` can leave one and be accepted, despite an unrecorded completion/loss. A `p` tuple of outcome `error` or `unsat` can also carry zero placeholders, not measured consumed work (`ig-log.js:145-186`); the reader closes it as exact zero. T09c additionally permits an ended error call with an unreported open primitive, beyond the specified normal-ended case. | Use **R4-02**: reject overlap when it occurs, require quantified completions and fail closed on unreported error work. |
| RV4-03 | T04d evidence paths; T04f verification commands and binding lifecycle | major | Stage 1's frozen self-test uses task `V4-T04f`; T04f later runs its `--items` verification with that same task ID. Both write `tests/artifacts/ig-proto/frozen/V4-T04f/self-test/state.json`, already hashed by the stage-1 receipt, so `accept` sees changed evidence. Also, copying parameters into a binding does not protect receipt evidence still pointing to mutable tree/harness files under the unqualified “every file read” rule. | Use **R4-03**: reserve historical namespaces, use a distinct verification ID and make the receipt's data inputs immutable before it is written. |
| RV4-04 | T11c `parityPass`, P-0/probe steps and emitted argv | major | Only `rowStep` explicitly sets `repeatUntilDone`; bounded parity/P-0/probe steps do not have complete fixed resume/minimum-horizon fields. The real runner treats a missing repeat flag as false and stops on a first invocation whose state is unfinished (`run-task.ps1:161-163`). `accept-p0` also names bare `v4-check.mjs`, whereas the script exists under `tools/ig-proto/`. | Use **R4-04**: fully specify and test every emitted bounded-step record and its executable argv. |
| RV4-05 | T11b row hard ceiling; T11g ceiling claims | major | `arm.mjs:175` checks admission using `limitS + 10`; it does not enforce that as a deadline for the whole row. `calibrate.mjs:327-367` starts a child timer, then waits for close; the parent subsequently reads, validates and publishes records. The quoted ten-second allowance is not a hard postprocessing bound. The item ceiling is repaired, but the row ceiling is still labelled stronger than the code enforces. | "Keep the row projection/admission simulation, explicitly labelling startup/postprocessing values as assumptions. For the hard counted ceiling use the actual helper limit: at most one progress-making or final failed invocation per remaining row, each at most 300 counted node seconds plus 45 counted quiet seconds, so `ceilingInvocations = rows` and `ceilingS = rows * 345`. Do not emit a zero-row locked step. Keep the separately enforced task guard distinct. Update the 20-row example to a 6,900-second helper ceiling; no kernel/row runner changes or automatic budget increase are authorized." |
| RV4-06 | T09c `synthClass` and `class: the clue rule` | major | The default row helper has `K: 12`, but the clue-rule test changes nine rows to `clue: 14` without changing K. T09a correctly marks these rows' clue evidence out of range; the class becomes inconclusive at `evidence`, not failed at `clue`. The mandatory expected outcome is therefore inconsistent with the newly required evidence check. | "Give both arms of `synthClass` an explicit `K: 30` (or another fixed K at least 14; use 30 in this pack), retaining baseline clue 12 and the nine clue-14 rows. Assert that the intended clue-rule input has complete clue evidence before checking the verdict. Expected remains `failed`, `decidedBy: 'clue'`, with 9 of 40 matched sets moving by two; do not weaken the evidence validator or change the expected result to `evidence`." |
| RV4-07 | T11e activation/stop point; T11g approval; checklist §3.4/N-V4-03 | major | The stop point requires approval of `V4-S4`'s concrete price before activation, but activation creates that plan and `approval --plan V4-S4` intentionally refuses before it exists. In addition, activated conditional/approved groups retain the universe's `optional: true`; the default runner and approval exclude them although `activation.declaredRows` includes them. | Use **R4-07**: separate data-only activation authorization from timed-plan approval, and make the already selected collection executable as its declared complete scope. |
| RV4-08 | T02d/T11b overhead wording; T04f tree-identity explanation; T11c/T11d test wording; T09d zero-count comparison | minor | The cheap helper still scans the active mask, so “no measurable time”/O(pieces) is not established; T04f's independence claim is broader than the non-variant files it changes; P-0 has 8 manifest rows expanded to 23 items; an emitted receipt has root `blocks`, not `fields.blocks`; zero-accepted rows need the declared empty-list normalization before accessing nullable details. | "Describe the bound helper as O(board area + pieces), without model enumeration, plus journal I/O included in measured durations. Say that T04f's non-variant harness edits do not move the trees, not that no file under `tools/ig-proto/` can move a tree. Assert equality of the 8 copied manifest rows and 23 expanded items. Assert emitted `blocks` at the envelope root. In Master comparison use `[]` for a valid zero-accepted row before reading keys; keep the positive-count checks unchanged." |

## Exact replacement blocks and evidence

### R4-01: repair the R9 proof term

Let `M = NC * NC / 2`, as in the task. In each pair, the pair-loop charge is at most 1; `coversBoth` charges
at most `K * L`; and the two piece-column scans charge at most `2 * K * (L - 1)` while testing their live rows.
Across the application, the initial support scan and kills have a bound covered by `3 * NZ`.
Use the conservative R9 term:

```js
3 * NZ + (NC * NC) / 2 + 3 * ((NC * NC) / 2) * K * L
```

Replace the old R9 term in both the derivation and `igRatingBound`; retain the other proved terms. Recompute the
documented cheap magnitudes and the named item's examples. The pack author may instead supply a valid proof of
the complete original formula, but the current per-function claim must not be presented as proved.

Counterexample to the **stated per-model R9 term**: the free region is a 2-by-60 rectangle; the two free pieces
are an L of 61 cells and a straight piece of 59 cells, with their four fitting placements each. Both shapes are
connected and distinct. The CSR dimensions are `R = 8`, `C = 122`, `NC = 120`, `NP = 2`, `NZ = 488`, `L = 62`,
`K = 4`. With every row live and no covered column, the frozen `ruleR9(false)` returns `NONE` (no kill).
Its charged arithmetic is **1,829,551**, exceeding the claimed
`3 * 488 + 120² / 2 + (120² / 2) * 4 * 62 = 1,794,264`.
The 2-by-50 case likewise gives **1,053,961 versus 1,046,224**.

These are bounded rule-body checks on artificial CSR arrays, not timed ratings or observations from a pilot.
They refute the intermediate inequality. They do **not** show that the final formula after substituting its very
large placement upper bounds is exceeded. The correction is to make the proof valid, not to assert an observed
performance regression or change the supervisor's acceptance condition.

### R4-02: make primitive accounting fail closed

Maintain at most one pending primitive per call. A new `begin` while one is pending records a permanent ledger
problem immediately; a later completion must not erase that problem. Validate its kind and finite nonnegative
bound. A completion must match the one pending kind, carry trustworthy finite nonnegative units and not exceed
its bound.

The existing logger writes outcomes `unsat` and `error` without a measured unit counter; its initialized zero
fields are not proof of zero consumed work. In particular, `difficulty.js:313-318` can throw for a deduction
with no path after performing deduction work. Treat such unquantified outcomes as incomplete work, not exact
zero. Preserve the normal counted work-cap outcomes, which do carry counters.

At an ordinary `end`, require all announced primitives to have accounted completions. An ended error with an
unreported primitive is incomplete; do not silently extend the ruled completed-call case. Only the valid
confirmed-termination case carries the one open primitive's bound into `hi`. A termination between primitives
still has `hi === lo`. Every malformed/lost sequence remains incomplete even if its numerical interval would
otherwise pass.

Use the same pairing/integrity rules for T04b's completed-item ledger and T09c's request ledger, retaining their
different legitimate closure cases.

Add focused cases:

- `begin(rate,100)`, `begin(rate,10)`, a rate completion of 5 units, then confirmed termination: incomplete,
  regardless of how a reader might otherwise pair that completion.
- A begin followed by an unquantified `error`/`unsat` tuple with zero placeholders: incomplete, not `[0,0]`.
- An ended error with an unreported open primitive: incomplete.
- A reported work-cap outcome and a correctly paired completion remain valid; existing Q37 interval examples
  keep their stated outcomes.

No new supervisor ruling is needed to reject these unrecorded/ambiguous losses.

### R4-03: preserve the evidence a historical binding checks

Change T04f's outer verification command to use `--task V4-T04f-verify` (or reserve another fixed distinct ID;
use this one in the task). The stage-1 auxiliary IDs, including `V4-T04f`, are historical observation namespaces,
not names reusable by later verification. Verify that their state/result hashes do not change during T04f.

Replace T04d's unqualified “every file read” evidence rule with an explicit immutable input index. Keep the
declared measurement manifests, observation logs/states, identity/certificate records and self-test records
immutable. Before writing the receipt, copy any required mutable tree metadata or producer-source metadata into
`docs/improve-generating/evidence/frozen/V4-T04/inputs/` and reference those copies. Do not make a historical
receipt depend on the current contents of `tree-frozen/<variant>/ig-tree.json`, current variant source files,
or later-edited harness files. Their historical identities must be captured, not checked by reopening mutable
working paths.

T04f captures and checks the independent accepted binding against those immutable inputs. It does not rewrite
the stage-1 receipt to repair its dependencies later.

Tests/verification: the actual sequence “stage-1 receipt -> T04f verification -> accept” succeeds without changing
any stage-1 input; after later inert harness/variant development and a current-tree rebuild, checking the historical
binding with `current: []` still passes, while changing one of its immutable observation inputs is refused.

### R4-04: specify every executable bounded step

For every emitted rows, parity, P-0, kernel-counter, profile and width step, set `repeatUntilDone: true`,
the complete state path, and an explicit minimum horizon. Retain `rowLimitS + 12` for row steps; use 270 for a
parity manifest containing a generation item and 150 for P-0/select-only, kernel, profile and width steps.
Every emitted `node` is the actual argv array, with its script path relative to the repository root.
In particular `accept-p0.node[0]` is `tools\ig-proto\v4-check.mjs`.

Materialize each probe's case list in both its argv and its pricing input. If the profile keeps T10b's current
default two cases, state those two explicitly and price those two; do not let an omitted flag silently choose
a different population from the priced one.

The compiler tests must check these required fields, script paths (or a declared future-tool prerequisite),
and the matching item population, not just absence of angle-bracket placeholders.
Add a bounded-step example that needs two invocations under the stated schedule: its emitted repeat flag must
allow both, whereas the real runner stops after an unfinished first invocation without it.

### R4-07: activate data first, approve the concrete timed scope next

The owner first decides the optional item selection and authorizes the data-only activation. `activate` then
writes the immutable activation, concrete plan and price. Only after those exist is
`approval --plan V4-S4` used to request the cumulative timed allowance. No locked step runs before that approval.
Remove the requirement to approve the not-yet-created concrete plan before running this data-only command.

Once selected into the activation, every row group is required for that declared collection. In the concrete
plan set their row steps to `optional: false` and include them in its required allocation; the audit record still
records which groups originated as conditional/optional options. Leave unselected options only in the priced
universe. A default run and default approval of the concrete plan must cover exactly `activation.declaredRows`,
without needing an unstated `-IncludeOptional` flag.

Keep the existing owner authority over optional scope, the actual timed allowance and closure at a ceiling.
Update checklist §3.4, N-V4-03 and T11g to the same order. Test an activated conditional board and approved S4-6:
their declared rows are selected by the real runner's default selection rule and included in the requested plan
guard; without approval, no timed invocation is authorized.

## Other checks

- The new task split retains serial execution and the stated per-task size ceiling. The declared estimate is
  97 developer hours and 73 benchmark-allocation minutes; 92 stage-1 minutes remain requested, not granted.
- Source/provenance, replay/history, scope boundaries and the phase-1 P6 authority are unchanged by this round.
  Public EN/VI Generation steps, offers, browser work and releases remain explicitly assigned to later items.
- T06b's layout-key construction uses the same known layout/set as the engine, and its captured worker identity
  survives `terminate()` changing the live worker object. The timeline signature correction is present.
- The simulated item cut, completed/censored distinction and item helper ceiling now follow the intended
  protocol. The row hard-ceiling correction is a separate remaining issue, not a rejection of those repairs.
- No extra measurement, re-rating or budget increase is authorized by this review. N-V4-14 remains subject to
  the accepted pilot-report/freeze process.

## Completion note

Verified: the 37 checklist/task inputs, the plan and the production source retain the recorded digests. This persisted review has CRLF line endings, UTF-8 without BOM, no trailing whitespace, no embedded control characters and a final newline. Its 17 prior-finding dispositions and 8 new findings match the stated counts.

Verdict: changes required
