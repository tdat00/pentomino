# improve-generating-v4: task-pack cross-review 2

Reviewer: SA-Astra (gpt-6-astra). Pack author: SA-Opus.
Start: 2026-11-16 18:05:39 +07:00 (retained review-tracking timestamp).
End: 2026-11-16 19:25:05 +07:00.

## Basis and method

- Reviewed `review-1-response.md`, the revised `check-list.md` and all 23 task files, against the final
  `docs/improve-generating/plan.md` and the stated production base `3fc65f4`.
- Pack-input SHA-256: `96a42739eca74de0501378390bc0ff8b3d389e1ac4e964c7642aab10f03c23bd`
  (sorted checklist/T-file names, each followed by LF and its LF-normalized content).
  Plan SHA-256: `f0f289e98ba1f728ae96a1b697651c81db775255ecf21239989fe05cfe159c00`, unchanged from review 1.
- Inspected the relevant engine, client, worker-pool, benchmark and prototype-harness implementations.
  Used read-only source inspection, in-memory edit-anchor checks and arithmetic/counterexamples, not new
  benchmark observations. No generation, rating, replay, browser run or test suite was executed.
- The task contracts, not only the response's claims, determine the RV1 dispositions below. An accepted
  correction that still cannot satisfy its original criterion is marked **not resolved**.
- Only this review is written. No production/test/task implementation, Git state or other repository is changed.

**Summary: changes required.** RV1: **14 resolved, 11 not resolved**. RV2: **6 blocking, 12 major,
2 minor** findings.

The revised traceability matrix names the plan and drift items, and the split tasks repair many real omissions.
In particular, the live-deadline implementation is now a named prerequisite, seven-key prototype provenance is
scheduled before measurement, the legacy detailed path is restored, and the kernel probes have concrete CLIs.
However, naming a prerequisite is not equivalent to validating its receipt. Several specified runners fail their
own resume contract, and the final admission can still accept incomplete or wrong evidence.

The source-drift verdict remains **no breaking change**. This review concerns the proposed implementation and
measurement contracts. It does not reopen the recorded Generation steps/history decisions.

Severity follows review 1. Replacement text below is for the pack author to incorporate in the named sections,
including their scopes, tests, dependent commands and estimates; it is not permission for a developer to invent
an interface. Recompute prices after changing execution grouping. No measurement allowance is granted here.

## RV1 disposition

| RV1 | Status | Verified disposition |
|---|---|---|
| RV1-01 | not resolved | The policy correction is present: projections are labelled and N-V4-13 requires a live deadline. T09b still accepts an untyped passing prerequisite, and the emitted execution order does not establish a live receipt before validation. See RV2-09 and RV2-11. |
| RV1-02 | not resolved | T02c restores the seven fields, per-record bounds, `made.igPrior` and table-version refusal. The per-arm `gen-v4-proto:<variant>` alternative is sound for the intended namespace. Its discriminator also captures unrelated algorithms, contrary to the five-key rule for other records. See RV2-15. |
| RV1-03 | resolved | T02a and P5 now restrict the route to minima in `[bandEdge(6), bandEdge(8))`, with boundary tests and the imported-set K bound distinguished from generation offers. |
| RV1-04 | resolved | T02a adds a detailed result from the same limited measurement and avoids installing the logging seam over the legacy recorded path. T02b/T04 require recorded-detail evidence. The remaining proof-data defect is RV2-14. |
| RV1-05 | not resolved | T04a adds bounded workers, durable starts and identity-based resume, but its terminal records fail its own identity rule. T10b also hashes a changing deadline and dispatches before durable intent. See RV2-01, RV2-03 and RV2-04. |
| RV1-06 | not resolved | Manifests, expected items, explicit incomplete replay and a positive candidate proof are added. Absent-mode total work still is not compared with charged total work, and the detail comparator lacks a required field. See RV2-14; generation also has RV2-02. |
| RV1-07 | resolved | Revised scopes include the edited self-test/manifest files; checks use the declared variant set and actual edit counts instead of stale totals. |
| RV1-08 | resolved | T04c checks native exit codes and verifies the certificate before starting the following plan. |
| RV1-09 | not resolved | The bound moves before the ordered winner scan and scripted-client tests are prescribed. The required size-eight integration uses the unchanged four-worker pool and cannot run. See RV2-05. |
| RV1-10 | resolved | T07a checks before rating/count primitives, does not finish new candidates in the budget catch, and selects only already completed results. The require-mode/prefix tests replace the former unlimited repair exemption. |
| RV1-11 | resolved | `fam` is declared in the enclosing search scope and assigned at its original shuffle point; the c4 branch has an executable test. |
| RV1-12 | not resolved | Class pooling, expected rows, shipped-arm resolution and a work rule are specified. The completion definition changes, incomplete journals can pass the work condition, Master is absent from the global predicate, and invalid measurements are admitted. See RV2-06, RV2-07, RV2-08 and RV2-18. |
| RV1-13 | not resolved | A control with one to nine puzzles now disproves a set refusal, independently of lost ten-puzzle completions. A present but censored/unresolved control is still not explicitly unknown; the changed completion definition also changes the loss count. See RV2-06 and RV2-18. |
| RV1-14 | not resolved | Both twins, fresh affected-cell revalidation and one uncapped comparator per cell are enumerated. The alternative comparator selection is acceptable in principle. A 130-second wrapper nevertheless cuts its non-live workload, and the selection has no executable producer/consumer sequence. See RV2-10 and RV2-11. |
| RV1-15 | not resolved | Request-row pricing now models the admission rule and labels estimates as projections. Bounded items still use an incorrect capacity formula, while the emitted steps differ from the priced grouping. See RV2-12 and RV2-13. |
| RV1-16 | resolved | The split T10a/T10b/T10c allocations and minimum horizons admit their stated first invocations; dry-run gates are specified. This is separate from the later whole-round accounting defect in RV2-13. |
| RV1-17 | not resolved | The three tools have explicit case lists, commands and state paths. The process profiler remains non-resumable/non-idempotent, and later emitted plans do not close the execution interfaces. See RV2-03, RV2-04 and RV2-11. |
| RV1-18 | resolved | T10a tracks removal/restoration epochs and tests equal live counts with changed membership. |
| RV1-19 | resolved | T10a compares complete independent `DeductionResult` values and normalizes error outcomes, rather than substituting public ratings. |
| RV1-20 | resolved | Shared rules give the dot-sourced lock-helper route for real checks, native exit handling, explicit verification work and the npm-via-Node wrapper. Pure checks are distinguished from rating/generation. |
| RV1-21 | resolved | B-1 uses the frozen unobserved `base` source on both sides and serves the frozen bench page. It is labelled a bench-page factor; Generator/prefetch calibration is separately named and priced. |
| RV1-22 | not resolved | T06 closes the final tail at batch end and adds failed-set timeline fields. Its unconditional first-acceptance comparison rejects a measured no-set result. See RV2-17. |
| RV1-23 | resolved | D-V4-13 now has literal `v4-p5`, `fr-*` and `v4-link` references; the shared format check explicitly rejects embedded control characters. |
| RV1-24 | resolved | T01a specifies an absent or verified snapshot directory and a copied-file manifest. T01b removes the working-tree policy import and uses the loaded engine's frozen levels/offers; its worker-module check prevents accidental dependence on the parent's label/working-tree import. The bootstrap ordering defect is separate, RV2-16. |
| RV1-25 | resolved | T12 says to retain the canonical diagnostic in recorded ratings while the visible score table remains unchanged, describes a new completed lean rating rather than mutation, and names six guarded files. |

### The three alternative responses

1. **RV1-02:** accept one algorithm ID per arm as the technical isolation mechanism, provided RV2-15 narrows
   the discriminator. A different table version must still fail replay within that arm.
2. **RV1-14:** accept one uncapped twin of the finally selected shipped configuration per cell. It must run
   after a final class-selection receipt, not after an interim summary; it needs the non-live wrapper limit and
   immutable bindings described below.
3. **RV1-17:** accept the split into T10a/T10b/T10c and the new state paths. Splitting does not fix a changing
   manifest identity or duplicate profile output.

## New and remaining findings

Paths in this table are relative to `tasks/improve-generating-v4/`, unless explicitly rooted elsewhere.
Numbered replacement blocks are normative continuations of the last column.

| ID | File and section | Severity | Problem | Exact replacement text |
|---|---|---|---|---|
| RV2-01 | T04a step 1, `resumePlan`, `runItems.onEnd`; inherited T10 runners | major | `resumePlan` requires the current `identityHash` on every log line, but the specified `item-end` contains no hash. The first valid terminal record therefore makes the next invocation fail identity validation, including a verification-only rerun. | "Append every terminal line as `{ type: 'item-end', identityHash: hash, item, status, result, ms, at }`, using the same immutable `hash` as its start. All item-log writers, including process/custom-width writers, use this schema. Test a real writer-produced completed log through `resumePlan` and a second invocation: no redispatch, `pending: []`, and verification progress 1. Do not repair this by accepting unbound terminal records." |
| RV2-02 | T04a `v4-generate`; T04b `expandManifest` generation payload | major | `packPath` is under `<raw>/packs/`, but the contract creates `<raw>` and the log directory, not the pack's parent. `writeFileSync(packPath, ...)` fails with ENOENT on the first successful generation. | "Before starting the generation pool, create `logDir` and `dirname(packPath)` recursively. Preserve existing observation files; refuse an unexpected existing pack for an unstarted item rather than overwriting it. Write and hash the completed pack only after a successful batch, and return the hash actually written. Add a filesystem-only case with a fresh nested `packs` directory and a fixture payload; it must write/read/hash successfully without running generation." |
| RV2-03 | T10b step 2, profile payload/directories/report | major | The manifest hashes an argv value computed from `horizonS - elapsedS() - 20`; resumption changes the identity even when the experiment is unchanged. Recreating an empty profile folder and appending every completed profile again can remove old evidence or duplicate it on inspection. | Replace the profile-resume instructions with **R2-03**. |
| RV2-04 | T10b step 1, process lifecycle | major | `spawn` must run before the specified start line can contain `child.pid`, contradicting durable intent before dispatch. Spawn failure need not emit `exit`; collecting stdout at `exit` need not wait for all stream data. | "Durably append `item-start` with `identityHash` before calling `spawn`. On the child's `spawn` event append a separately typed `item-spawn` line with the same hash/item and PID; extend the reader to allow one such line between start and end. Handle `error` as well as `close`; emit exactly one terminal record. Parse final stdout only after `close`. Timeout kills only the owned child; `finally` kills and awaits any still-live owned child. A crash with start but no end remains an explicit interrupted-observation error. Test log-before-spawn ordering, spawn error without exit, and trailing stdout delivered after exit but before close." |
| RV2-05 | T07b scripted-client integration, widths 1/2/4/8 | major | The selected `p5-proto` tree inherits `MAX_POOL_SIZE = 4`; `core/browser/worker-pool.js:194-196` rejects size 8 before the scripted worker factory runs. The counterexample test cannot reach the client at that width. | "Add a test-only child variant `p5-proto-w8-test`, extending `p5-proto`, whose sole additional edit changes `export const MAX_POOL_SIZE = 4;` to `export const MAX_POOL_SIZE = 8;` in the copied `core/browser/worker-pool.js`, exactly once. Build/load it only for the size-eight scripted-client cases; use `p5-proto` for 1, 2 and 4. Assert identical prefix-bound outcomes and in-prefix-success outcomes at all four widths. Add the variant to this task's scope/edit checks; no production limit or default changes." |
| RV2-06 | T09a Authority/`reachedTen`; T09b completion, Hell and P5 loss reporting | blocking | Completion now means ten puzzles **and** T10 at most 120 seconds. The plan treats completion and capped-time statistics separately: its 18x18 Nightmare control completes 20/20 despite p95 134.5 seconds (plan 5.2). This silently changes the completion denominator, control classification and lost-completion count. | "Define `reachedTen(run, { quantity })` as `run.acceptedCount >= quantity` on a valid row. Define capped T10 independently: a completed request contributes `Math.min(run.tenthReadyMs, capMs)`; an incomplete request contributes `capMs`. Report deadline violations separately and let the positive live-deadline receipt enforce them. Test ten puzzles at 125,000 ms: completion true, capped T10 120,000 ms, deadline violation true; nine puzzles: completion false. Apply this definition consistently to `controlsFrom`, `completion`, `hell1Report` and `lostCompletions`." If the changed definition is intentional, resolve Q-RV2-01 instead of silently adopting this replacement. |
| RV2-07 | T09a work definition and coverage; T06/T07 journals | blocking | Parseable files, numeric rating tuples and absence of `child-timeout` do not establish complete work. An ordinary batch deadline/abort can terminate a worker after its `start` and some `p` lines, without its `end`; the current rule counts this partial prefix as complete. Missing count instrumentation is also indistinguishable from zero counting work. | Replace the work-coverage rule with **R2-07**. |
| RV2-08 | T09b `phase0Verdict`, `main`, Tests | blocking | `masterIdentity` is defined separately, but `phase0Verdict({ classes, cells, controls, prerequisites })` never consumes it. A changed Master identity can coexist with a passing phase-0 result. | "Change the signature to `phase0Verdict({ classes, cells, controls, masters, prerequisites })`. Require every declared Master row/identity result to pass before phase 0 can pass. A Master mismatch is `fail`; a missing, invalid or censored required identity result is `incomplete`. `main` must pass the computed Master results, not an empty substitute. Add one otherwise-green case with a Master mismatch and one with a missing Master result; neither may pass." |
| RV2-09 | T09b prerequisite reader/schema; T04b summary; N-V4-13 linkage | blocking | A file containing a generic passing verdict, and not explicitly marked post-hoc, satisfies the current prerequisite predicate. It need not prove a live clock, the frozen parameters, the expected arms/cases or the relevant source. T04b also needs to check observed input identities rather than simply attach freshly computed metadata. | Replace the prerequisite/receipt boundary with **R2-09**. |
| RV2-10 | T11a uncapped comparator; T11b stage-4 row limits/price/commands | blocking | The selected uncapped twin explicitly disables the live deadline; today's `log-link` also retains separate set/batch timers. Applying the blanket stage-4 130-second wrapper to these controls can kill a legitimate set-plus-batch request before its native observation finishes. It ceases to be the requested uncapped control and can hide false stops/lost completions. | "Assign `rowLimitS: 260` to every today's/log-link and uncapped-comparator group in every stage. Use 130 only for an arm with the required passing live-deadline receipt. Carry `rowLimitS` per group into CLI argv, admission simulation, minimum horizon, forecast, ceiling and receipt. Test a stage-4 uncapped group and a today group: both emit 260; a validated live twin emits 130. A wrapper-censored control is unknown evidence, not proof that the bounded arm lost nothing." |
| RV2-11 | T11b steps 2/4, plans, artifacts, stage ordering | major | The emitted "plans" contain a runtime variant placeholder, omit the publish/verdict/resolution sequence needed to discover it, and do not give complete manifest paths/state bindings. `live` is listed with stage 4, not a proven predecessor. Sharding only by cell also collides when the same arm/cell is reused by pilot, fresh validation or conditional revalidation. | Replace the emitted-plan contract with **R2-11**. |
| RV2-12 | T11b `itemsCost`, emitted steps and price tests | major | `ceil(nodeS / (270 - reserveS))` treats a latest-start threshold as execution capacity. Two sequential 120-second items both fit: starts at approximately 2 and 122 seconds are before 150, but the formula prices two invocations. Conversely, pricing many items together while emitting one locked step per item undercounts quiet periods. It also ignores the two-lane item groups. | Replace bounded-item pricing with **R2-12**. |
| RV2-13 | T11b approval fields and dry-run commands; D-V4-02 | major | `-ApprovedRoundMinutes <stage guard>` is not a fresh stage budget. Frozen accounting already includes T04/T05/T06/T10 and then earlier stages; the shared budget uses a cumulative round cap. The prescribed value can consume the new allowance on past work or make approved later steps inadmissible. | "Record `roundCountedSBeforeApproval`, `requestedAdditionalGuardS` and `requestedCumulativeRoundMinutes = Math.ceil((roundCountedSBeforeApproval + requestedAdditionalGuardS) / 60)`. Ask the owner for the additional work and its explicit cumulative cap. Pass the approved cumulative cap to every plan/dry run, retaining all prior frozen invocation records. Re-read spent time before requesting approval; do not silently reuse the original quote or delete/reset accounting. Test 600 seconds already spent and 1,200 additional guard seconds: requested cumulative cap 30 minutes, not 20. An owner-approved lower cap produces an honest STOP." |
| RV2-14 | T04a `v4-select` result; T04b `parityVerdict` | major | `journalWork` is rating work, not total work including uniqueness counts. Equality among its modes and separate equality of charged modes do not prove absent-versus-observed total-work parity. The expected number of detail rechecks also references a rated-event count absent from the returned DTO. | Replace the parity evidence contract with **R2-14** before the first receipt. |
| RV2-15 | T02c `isV4Versions` and native-family reader rules | minor | `startsWith('gen-v4')` also classifies `gen-v40`/`gen-v4-other` as the new schema, dropping otherwise valid foreign five-key provenance. One running implementation does not authorize changing the reader shape of every similarly prefixed algorithm. | "Define the discriminator as exact production `algo === 'gen-v4'` or the explicit experimental namespace `algo.startsWith('gen-v4-proto:')`; reject an empty/invalid experimental suffix according to the variant-ID rules. Other algorithm strings retain the frozen five-key reader/bounds. Test production gen-v4, a concrete prototype arm, gen-v3 and foreign `gen-v40` five-key records. Only the first two use the new shape." |
| RV2-16 | T01a numbered steps, snapshot bootstrap | major | Step 1 invokes `snapshot.mjs record` before later steps create that tool and its dependencies. Literal execution fails after extraction and leaves an unverified folder that the same step forbids reusing. | "Implement the snapshot helper, source/label selection and their pure tests before executing the extraction/record/verify block. Run that block only after the helper's imports and `--help`/argument validation load successfully without a snapshot. Extraction and first manifest recording form one preparation sequence; interruption leaves an explicitly unverified directory and stops, not an automatic overwrite or merge. Renumber the steps accordingly." |
| RV2-17 | T06 timeline/linkage predicate and Tests | major | The final predicate requires `igSetMs` to be at most the first acceptance on every row. A legitimate measured no-set row has `igSetMs: null` and an empty acceptance list; `null <= undefined` is false. P5's expected early no-set results must not become linkage failures. | "First validate the timeline shape by outcome. With no set: `igSetMs === null`, `igAcceptedMs.length === 0`, `acceptedCount === 0`, finite response time, and no batch are valid. With a set and no acceptance: finite `igSetMs` and an empty acceptance list are valid. Only with at least one acceptance require finite `igSetMs <= igAcceptedMs[0]`; always require the acceptance count/order and response bound. Add no-set, set-with-no-acceptance and ordinary accepted-row cases. A malformed/missing timeline remains incomplete, not a fabricated zero." |
| RV2-18 | T09a `rowProblem`; T09b row readers and `p5Stops` | blocking | Rows with `measurementValid: false`, interruption or unexpected errors can satisfy the stated numeric checks and enter admission. A present but harness-censored P5 control can also be treated like an observed no-set result. Schema-valid timestamps are not valid measurement evidence. | "At ingestion validate the published run-record shape and preserve validity/interruption/error fields. Require a valid, uninterrupted observation without unexpected errors before admitting it to the paired statistics. Keep a normal measured generation failure distinct from infrastructure/harness censorship. A censored or unresolved control is `unknown` in `p5Stops`, even when a row object exists. Invalid-puzzle/pack evidence is a correctness failure; incomplete measurement is not a pass. Add rows with ten accepted puzzles and plausible timestamps but `measurementValid: false`, an interrupted row, an unexpected error and a present `child-timeout` control. None may certify admission or a correct early stop." |
| RV2-19 | T02a step 4.3 `rateScreen`; T02b seam tests | major | For `screened === true`, an explicit `ctx.rate` merely prevents the detailed branch; execution then calls native `measureV3` instead of the seam. This contradicts the task's stated seam priority and the frozen context's testing/observation contract. | "After the explicit `igScreen` override, and before either native screen path, handle a supplied `seam` by returning `{ rating: seam(board, pieces, clues, ws), detail: null }`. Keep the explicitly named `igScreen`/`igCanonical` test overrides documented separately. Add a Nightmare/Hell-1 screened call with only `ctx.rate` supplied: a sentinel exception must propagate by identity, proving the seam was called; a returned seam rating must not trigger an extra native solve. Retain the corresponding legacy-route test." |
| RV2-20 | `check-list.md` 3.4; `review-1-response.md` Consequences | minor | The new 92-minute allowance is called approved even though this pack's stop point asks the owner to approve it. The later stop is correct, but the record should not assert permission that has not been granted. | "Replace descriptions of this allowance as 'approved' with 'requested, pending the owner stop at the end of T04b'. Retain the numeric proposal and its derivation. Record the actual grant, scope and cumulative cap only after the owner's answer." |

## Replacement blocks

### R2-03: stable process identities and idempotent profile evidence

The profile item's identity contains immutable experiment inputs only: case, seed/corpus, source/tree identity,
profiling flags and stable output path. Do not include an invocation's computed remaining seconds. Keep
`reserveS: 120` and the parent's absolute cutoff in the execution envelope, outside the manifest hash.
Remove the unused changing `--horizon-s` from the profile-child argv; the parent owns cancellation.

Read and validate the item log before preparing an output directory. Create a fresh directory only for an
unstarted item. Never empty a completed or interrupted observation's directory. A started item without a terminal
record remains interrupted and is not restarted automatically.

Produce `profile.jsonl` by rebuilding it deterministically from the completed terminal items, one record per
item ID in manifest order, rather than appending all completed items on every inspection. Include `item` and the
profile file's SHA-256 in each derived record. Missing or multiple profile files for a completed item are an
evidence error. A verification-only resume must keep both the raw profile hash and derived report unchanged.

Add pure/fake-child tests for identical experiment identity under different invocation horizons, resume with one
completed item and one pending item, and two report invocations producing exactly one line per completed item.

### R2-07: complete work coverage, not merely parseable prefixes

A row is work-complete only when its journal schema explicitly supports rating and count work; every dispatched
selector call belonging to that request is accounted for; every call has exactly one start and one matching
terminal end; all rating and count records belong to those calls; and all work values are finite and nonnegative.
Reconcile per-call record totals with terminal totals. Include work on losing/speculative attempts, not just
accepted candidates. Record an explicit zero count total when no uniqueness count ran.

An unmatched start, abrupt worker termination, missing call/file, invalid count value, absent count capability or
failed reconciliation makes work coverage incomplete, even without `child-timeout`. Never turn unknown work into
zero. The class's work condition then cannot pass.

Where cancellation can interrupt a primitive before its work is reported, either preserve a trustworthy terminal
counter total or report unknown work. Do not claim completeness from the last completed profile.

Add synthetic cases with a parseable start plus a rating but no end, a missing counting capability, an omitted
losing attempt, and a complete explicit-zero-count call. The first three are incomplete; only the last can pass.
Use these same completeness flags in parity and admission receipts.

### R2-09: positive, typed, configuration-bound proof receipts

Define a receipt envelope shared by the producers and consumers:

`{ format: 'ig-v4-proof', version: 1, kind, verdict, source, harnessHash, arms, coverage, evidence }`.

`source` contains the frozen commit and source digest. `arms` records the actual arm IDs, tree IDs and parameter
hashes. `coverage` lists expected and observed item/case identities and missing or censored evidence. `evidence`
contains the input artifact paths and hashes. The manifest declares the expected values for each prerequisite.

The deadline prerequisite additionally requires `kind: 'live-deadline'`, `live: true`, `postHoc: false`, the
implemented 115-second work cutoff, 120-second response bound and reserve checks, with the expected cells and
active parameter hashes. A projection's `kind: 'deadline-projection'` can never satisfy it.

Check the envelope and every expected binding before accepting `verdict: 'pass'`. Missing fields, wrong kinds,
stale trees/parameters, coverage gaps or mismatched artifact hashes do not pass. Keep a substantive correctness
failure distinct from missing evidence.

T04b must validate each observed item's stored identity against its declared measurement manifest. It must not
relabel old observations with freshly computed current identities. A deliberate old/new P-0 comparison records
both identities separately.

Tests: reject an arbitrary `{ verdict: 'pass' }`, a passing projection without a `postHoc` field, a wrong-tree
passing receipt and an incomplete live receipt; accept a complete correctly bound live fixture. No new timed
run is needed for these reader tests.

### R2-11: an executable phased measurement pipeline

Distinguish a priced template from a runnable plan. No runnable argv may contain
`<resolved after the class verdicts>` or another unresolved placeholder.

`manifest.mjs price` writes the immutable priced template and the following explicit artifacts under
`tools/ig-proto/plans/`: `V4-S2.json`, `V4-LIVE.json`, `V4-S4-validation.json` and a comparator-plan template.
Write the concrete per-arm item manifests beside them, with full seed/mode/case lists and generation/replay
producer links. Group each such manifest into its actual bounded-runner step; do not price a batch and emit
separate locked steps for its members.

Every step includes its complete Node argv, state path, lock status, dependencies, expected output and exit
conditions. Carry label/source-label through every command. Derive shards from stage, cohort, arm and cell;
the fresh replicate-40-to-59 cohort has different state/output paths from replicate-20-to-39 validation.

The required order is:

1. Execute/publish stage-2 rows and its per-arm proof receipts, then read the pilot reports.
2. After fitting/freezing and implementing N-V4-13, execute and verify `V4-LIVE.json`.
3. Only with that positive receipt execute/publish the two stage-4 twins and today's controls.
4. Produce a final class-selection receipt from the declared completed validation collection. An interim report
   is not a frozen selection.
5. Add `manifest.mjs resolve-comparators --selection <receipt> --out <plan>`: verify the receipt bindings and
   resolve each cell to `fr-frozen-uncapped` or `fr-frozen-none-uncapped`, according to its finally shipped twin.
   Emit actual variant/arm identities and per-cell state paths, then run/publish that concrete comparator plan.
6. Emit the verdict-input manifest with real report/receipt paths and hashes; run T09b's global verdict only
   after the required publications and receipts exist.

Do not mix different resolved configurations in an arm directory that claims one tree ID. Missing future
variants or receipts make a plan explicitly not runnable, not syntactically valid with fake arguments.
Expose all future implementation dependencies as named items before claiming a complete execution plan.

Add data-only compiler tests: no unresolved argv, every consumed artifact has an earlier producer or a declared
external prerequisite, live proof precedes validation, comparator selection uses final class results, and
pilot/validation/revalidation state paths are disjoint. Dry-run every concrete plan using its approved cumulative
cap; do not treat dry-run admission alone as proof that its commands or inputs exist.

### R2-12: price the same schedule that will execute

Replace the scalar capacity formula with simulation of the emitted step/item manifests and the runner's actual
admission rules. The pricing input includes ordered groups, kind, variant, lane count, reserve, projected duration,
startup allowance and invocation cutoff. Stop admitting at the same condition as the runner, allow admitted work
to finish within its specified envelope, and charge one 45-second quiet period per actual invocation.

Process-profile items use one lane. Ordinary item groups use their specified lanes. Custom width items use their
specified concurrency. A change of kind/variant/group follows the same drain/start rule as `runItems`. Separately
emitted locked steps cannot share an invocation or quiet period.

Report projected node time, explicit overhead assumptions, invocation count, counted time and guard separately.
A ceiling uses the relevant hard invocation/item limits and overhead, not the optimistic duration estimate.
Retain the request-row admission examples, but do not reuse their formula for bounded-item groups.

Add tests: two sequential 120-second profile items fit in one 285-second invocation with a 120-second admission
reserve; a two-lane group differs from a sequential group; two separately emitted one-item steps incur two quiet
periods; a group that cannot admit its first item returns an inadmissible result, never a forced minimum of one.
Price the expanded executable grouping, including live receipts and all positive parity passes.

### R2-14: close the parity producer/consumer contract

Return explicit `ratingWork`, `countWork`, `totalWork` and `workComplete` for every instrumented observation;
`totalWork = ratingWork + countWork`. Record count work independently of the caller's optional `charge`
callback before stage 1; do not defer that evidence to T07a. Preserve a genuinely absent caller-observer mode
rather than installing a caller charge hook and calling it absent.

For each new-route mode, require complete work and equal total work. In charge/record modes also require
`units === totalWork`, with equal charge sequences (return `chargeUnits` in call order, `charges` its length
and `units` its sum; absent mode has `chargeUnits: null`). Where the legacy recorded route deliberately bypasses
the logger, compare its complete charged total with the complete absent-mode ledger via the charged mode.
Compare the base recorded total with the v4 legacy recorded total in the legacy identity case.

The detail DTO explicitly contains integer `rated`, `rejected`, `scored`, `missing` and the recheck results;
`scored === rated + rejected`. Recheck the first `Math.min(2, scored)` completed scored events, including refused
ones that carry a rating, against canonical detail on their recorded clue IDs. A genuine lack of any completed
scored event is insufficient proof, not automatically a correctness failure. A missing required detail or unequal
recheck is a failure.

Add synthetic comparer cases with equal rating work but unequal uniqueness-count work, equal charged modes but
an unequal absent total, one rated plus several rejected events, and no completed scored event. Only complete
equal evidence passes. Budget the existing real checks through the locked stage-1 plans.

## Authority and conditional question

The author's seed selections, resampling seed, 2-G pilot budget, four-attempt arm and bench-page calibration
remain technical choices within the experimental plan; they are not production defaults or permission to spend.
The requested stage-1 allowance and the later corrected manifest price still require the existing owner stops.
The remaining findings are contract/implementation corrections within the plan, except the following conditional
question if the author wishes to retain the changed completion criterion.

### Q-RV2-01: completion count versus the 120-second deadline

**Addressee:** plan author / SA supervisor, through the orchestrator; obtain owner confirmation if the answer
changes a recorded acceptance decision. This question is unnecessary if the pack restores the written contract.

**Question:** Should the frozen round keep completion and deadline compliance as separate observations, or change
every completion-based gate to mean "ten puzzles by 120 seconds"?

- **(a) Keep them separate.** A valid request with ten puzzles at 125 seconds completes, contributes 120 seconds to
  capped-time statistics, and separately violates the deadline. This matches the plan's completion-passing
  18x18 Nightmare example with p95 134.5 seconds. The live-deadline receipt still enforces the new response bound.
  Apply RV2-06 without changing the plan.
- **(b) Change the completion contract.** The same request fails completion. This changes completion/control
  classification, the Hell completion report and lost-completion counts, not merely the plotting of a capped
  time. Amend the plan and all control selection, gates, comparator interpretation and affected prices explicitly
  before validation; obtain the required decision rather than recording this as an implementation detail.

No answer or recommendation is adopted for the owner or supervisor.

## Completion note

The file-format and input-stability checks, final end time and persistent-output verification are recorded here
at completion. No timed run is part of this review.

Verdict: changes required
