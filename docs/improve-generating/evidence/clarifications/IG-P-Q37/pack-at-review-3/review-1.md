# improve-generating-v4: task-pack cross-review 1

Reviewer: SA-Astra (gpt-6-astra). Pack author: SA-Opus.
Start: 2026-11-16 15:48:43 +07:00.
End: 2026-11-16 16:57:12 +07:00 (68 min 29 s).

## Basis and method

- Reviewed the uncommitted final-plan edit, `check-list.md` and all 16 task files on
  `improve-generating`, HEAD `345d29d`; production references were checked against `3fc65f4`.
- Pack-input digest: `7449a1a834327ff545d8adb710179820eef69f8b3ece90b1c2d19b8bf722f750`.
  This is SHA-256 of the sorted filenames of `check-list.md` and the T-files, each followed by LF and its
  LF-normalized content. The review file is not an input.
- LF-normalized plan digest: `f0f289e98ba1f728ae96a1b697651c81db775255ecf21239989fe05cfe159c00`.
- Read the named lock helper. Used direct reads, Git inspection, in-memory application/inspection of existing
  variant edits, and arithmetic on stored records. No generation, rating, replay, benchmark, browser run or
  test suite was executed. Only this review is written.

**Summary: changes required.** There are **6 blocking, 17 major and 2 minor findings**.
The traceability index names the plan and drift items, but several linked tasks do not implement the contract
they claim to cover. In particular, a traceability row is not a substitute for the live-deadline validation,
the prototype's provenance contract, or the complete admission rules.
The source-drift verdict remains no breaking change; these findings concern the proposed task contracts,
not a reversal of the recorded owner decisions.

Severity:

- **blocking:** changes a binding plan/gate contract, can admit invalid evidence, breaks pool invariance,
  or makes the measurement/approval boundary unsafe;
- **major:** prevents reliable execution, produces wrong/incomplete evidence, or leaves an essential interface,
  gate or command unspecified;
- **minor:** a local wording/format defect without a separate design consequence.

The replacement text in the last column is proposed text for the author to put in the named section(s), not
permission for a developer to decide a missing design. Numbered replacement blocks below are the continuation
of that column where a complete contract would make the table unreadable. Their text is normative.
After making the changes, update dependent task scopes, estimates, variants, test counts and manifest prices
together; do not dispatch a task while its replacement still refers to an unwritten interface.

## Findings

| ID | File and section | Severity | Problem | Exact replacement text |
|---|---|---|---|---|
| RV1-01 | `check-list.md` D-V4-08, traceability, N-V4-03; T09 Authority/Steps; T11 S2-6/S4 | blocking | The pack substitutes post-hoc prefix truncation for running the one deadline. Plan 5.1 explicitly requires validation with P5 and the one deadline active. Prefix identity does not prove actual dispatch cancellation, the response/pack-assembly bound, or a reserve implementation. The client releases auxiliary work before pack assembly (`generation-client.js:498-501,1172-1186`). No later named task explicitly restores live enforcement before the phase-0 verdict. | Replace D-V4-08 and its downstream claims with **R01**. Post-hoc results must be labelled projections and must not supply a live-deadline gate. If the author intends to retain that substitution, resolve Q-RV1-01 before finalizing the pack. |
| RV1-02 | `check-list.md` D-V4-04/D-V4-05; T02a variants; T02b provenance case; T05 `ps-3` to `ps-6` | blocking | Every v4 arm has the same five-key `gen-v4-proto` identity. A prior/screen-table change is not refused by replay, contrary to 5.1/Q36, and “refused by every other tree” is false. Raising the global skip bound also admits out-of-range gen-v3 skips. T05 unconditionally requires `igPrior`, so it drops valid old candidate records instead of preserving them. Tree/journal metadata does not repair the pack passed to `runReplay`. | Replace D-V4-05 and the prototype provenance contract with **R02**; implement it before T04b, including record-specific bounds and `made` keys. Remove the statement that seven-key provenance is deferred wholly to phase 2. If that deferral is intentional, resolve Q-RV1-02. |
| RV1-03 | `check-list.md` D-V4-03/D-V4-13; T02a Goal, step 2, variant description and tests; T07 scope wording | major | `target.min >= bandEdge(6)` sends Hell 2, Hell 3 and higher Hell targets into P1-P5. The final plan explicitly limits those changes to Nightmare and Hell 1 and closes Hell 2/3. The bound explanation also treats the Hell-3 K cap as a universal input bound, although imported sets have their own piece-count limit. | “The new selector and P5 apply only when `target.min >= bandEdge(6) && target.min < bandEdge(8)`. Every other target uses the frozen selector. Replace `v4Target` with that expression. Test minima 52 false, 53 true, 55 true (the synthetic band), 77 true, 111 true, 112 false and 162 false. Replace every ‘Nightmare and every Hell’/‘Nightmare and Hell’ scope statement accordingly. Derive and document the ordinal bound over the supported input K range, including imported sets up to the pack limit, not from the Hell-3 generation cap.” |
| RV1-04 | T02a steps 3, 4.1, 4.3, 6 and `v4-2`; T02b/T04a observer checks; D-V4-06 | major | Certified screen ratings always have `detail: null`, even with a recorder. The legacy branch still calls `igDispatch`, which installs a `rate` seam and suppresses `rateDetailed` (`ig-log.js:298-302`, `clues.js:270-276`). Thus both new and legacy routes can pass the result-only parity checks while losing the detail contract and the replay's measuring-step data. | Use **R04**. Keep the detail from the same screened deduction when recording; do not obtain it by an extra canonical solve. Do not install the logging seam over the native detailed path. Add real recorded-path checks to the approved stage-1 runs, not to an unlocked pre-approval command. |
| RV1-05 | T04a step 1 and real-call subcommands; T05 `prior`; T10a/T10b inherited item rules | blocking | Starting an item whenever `elapsed + 100 < horizon` gives no bound on that item. A generation item contains two jobs with separate 115-second timers; a replay has a work bound, not a 100-second time bound. Both can overrun the helper's 300-second kill. Only finished items are recorded and state is written at invocation end, so an interrupted started observation can be rerun silently. There is also no tree/harness/input identity check on resume. | Replace the shared item-runner contract with **R05**, and reforecast the affected plans before requesting the allowance. Keep the helper's 300-second ceiling; do not solve the problem by extending it or by retrying a started measurement. |
| RV1-06 | T04a steps 2-4 and Tests; T04b receipt gates; T05 later arms; T11 manifest | major | Parity is hardcoded to `v4` and one `base` comparison, whereas the plan requires it for each arm. Later prior/budget/c4 arms have no corresponding complete parity receipt. Parity lines lack the common `item` identity the resume rule reads; a hash of the result does not compare absent-mode total work. The summary does not explicitly require all expected items, PM4 coverage/completeness, or any fully matched candidate replay; `incomplete` is accepted as sufficient evidence. Arbitrary generation shortfalls are labelled tool errors. | Replace the item/receipt contract with **R06**. Separate correctness failure, legitimate short generation, bounded incomplete replay and missing proof. Add the required per-arm proof passes to the manifest and its price. A finished runner is not by itself a passed receipt. |
| RV1-07 | T04a Scope and Tests; T11 Scope and Tests; dependent command tables | major | Both tasks prescribe a new `self-test.mjs` case but exclude that file from their allowed changes. The fixes in this review will also change the hardcoded variant/edit/case counts that later tasks require; leaving the old numbers creates mandatory `QUESTION:` stops unrelated to correctness. | “Add `tools/ig-proto/self-test.mjs` to Change in T04a and T11. Each task's command table lists the cases and variants that exist at that task's boundary after the amendments. `check-edits` must report no error for every declared variant and apply every declared edit exactly once; its printed edit counts are reported from the revised manifests. Do not retain obsolete counts from an earlier manifest design as an acceptance oracle.” |
| RV1-08 | T04b step 2 PowerShell block | major | The second `pwsh` invocation runs even when the certificate plan exits nonzero. A native nonzero exit does not obey PowerShell's cmdlet error preference. This contradicts the required stop after a failed certificate/runner gate and can spend the next plan's allowance anyway. | “Immediately after each `pwsh ... run-task.ps1` command insert `if ($LASTEXITCODE -ne 0) { throw ('STOP: previous run-task exited ' + $LASTEXITCODE) }`. Run the V4-T04 plan only after IGP-02 exits 0 and its certificate record passes the stated completeness/coverage gate. Preserve the failing output and state; do not continue to the next plan on exit 1 or 4.” |
| RV1-09 | T07 `p5-2`, `igSetBound` integration and Tests | blocking | The new check is placed after the ordered winner scan (`generation-client.js:674-685`). At width 4, attempt 4 can have been launched speculatively and succeed while attempt 3 is pending. When attempts 0-3 are all no-window failures, the scan returns winner 4 before checking the bound. At width 1 the bound fires before attempt 4 is dispatched. The same request can therefore succeed or fail by pool width. Testing the helper on a Map does not test this race. | “Evaluate `igSetBound(results)` after cancellation/deadline checks but **before** the ordered winner scan. If the first bound-sized prefix is entirely same-side no-window failures, return that failure and discard all later speculative work, even if a later attempt has already succeeded. An `ok` within the prefix prevents the bound from firing. Add scripted-client integration cases at widths 1, 2, 4 and 8: attempts 0-3 same-side failures, attempt 4 success delivered before attempt 3 at wider pools; every width must return the same no-window failure. Also cover an in-prefix success and mixed-side failures.” |
| RV1-10 | T07 step 1, Authority, Tests and T07-T01 | major | Repairs are exempted from the budget check, uniqueness counts have no pre-check, and the budget catch calls `chooseBest`, which can finish further candidates. A stated 2 G call budget can consequently buy many additional canonical repair ratings after exhaustion. This is not the plan's “ends with its best result or not-in-band.” | Replace the budget-end contract with **R10**. Test a `require` call with several pending in-band candidates, not only an all-capped `any` call. If a separate repair reserve is desired instead, it must be explicitly specified, fitted and included in the budget identity/price; it is not an implicit unlimited exemption. |
| RV1-11 | T08 step 3; T02a step 4.7/4.8 | major | `step` is defined outside the `try` block, but phase A declares `const fam` inside that block. Calling `step` from phase A does not give it dynamic access to `fam`. The c4 branch therefore throws `ReferenceError` as specified. | “Declare `let fam;` with its function JSDoc in `searchV4` before defining `step`. In phase A keep the shuffle at its existing execution point, but replace `const fam = ...` with `fam = ...`. The c4 branch may call it only after that assignment. Keep the feature guard `IG.c4 === true` explicit. The c4 synthetic test must execute the lower-count branch, and the disabled arm must retain its prior RNG/output sequence.” |
| RV1-12 | T09 Authority, pure functions, manifest schema, main and Tests | blocking | The required work-per-accepted-puzzle non-worsening condition is absent. `classVerdict` receives per-cell clue/faster results without defining the required class pooling. The schema lacks an explicit expected seed matrix, shipped-arm resolution and global phase-0 decision; missing rows or a failed screen class can therefore be judged on the wrong arm or insufficient data. Boundary/gate tests are mostly absent. | Replace the gate contract with **R12**, including the work condition, exact per-class/per-cell roles, expected rows, shipped-arm selection and global fail-closed verdict. A missing work measurement is not a pass. The implementation and synthetic tests must cover each deciding condition, not only medians and constant ratios. |
| RV1-13 | T09 Authority, `p5Stops`, test case 7; T11 false-stop reporting | major | A same-side early stop is called false only when the uncapped request reaches ten. An uncapped request that later obtains a valid set but returns one to nine puzzles also disproves the early set refusal. Missing/censored controls are not evidence of a correct stop. Lost ten-puzzle completions and false set stops are different quantities. | “Pair by cell and full request/seed identity. `falseStops` counts a bounded `set:no-window-*` refusal whose uncapped control obtained a set (`details.igSetMs` is a finite number), irrespective of its delivered count. `lostCompletions` separately counts control requests reaching ten when the bounded arm does not. A missing or unresolved control is `unknown`, never a correct stop. Add cases with control accepted counts 1 and 10 (both false stops, only the latter a lost completion), a confirmed no-set control, and a missing control.” |
| RV1-14 | T11 Stage 4 matrix, S4-3/S4-5/S4-7, verdict manifest; N-V4-03 | blocking | Completion-passing controls have only `fr-frozen` and today's arm, although every validated cell of a screen class needs both screen/no-screen arms. No uncapped frozen-search comparator is enumerated for lost completions. A failed screen class can thus have no measured shipped fallback. The second-validation line repeats only two Hell cells, not necessarily the cells whose prior changed, and gives no fresh validation-cohort rule. | Replace the validation-matrix expansion rules with **R14**. Price the complete matrix before approval; an omitted arm must not become a reuse assumption or be manufactured from another configuration. |
| RV1-15 | T11 step 2 pricing rule, manifest wording and tests | major | “Today's median bounds the new arms from above” is not a result of plan 4. More importantly, `ceil(totalSeconds / 240)` ignores the actual row-admission rule: a 260-second row needs 270 seconds remaining (`arm.mjs:175`). At 55 seconds per row, 20 rows require 20 invocations, not the priced five: 2,000 counted seconds rather than 1,325, exceeding the purported 1,656.25 guard. | Replace the pricing contract with **R15**. Keep estimates labelled projections and calculate invocation/quiet overhead from executable shards and admission rules, not from filling an imaginary 240-second bin. |
| RV1-16 | T10a/T10b plan allocations, dry-run gates; check-list machine/allowance table | major | T10b's 2-minute allocation gives a 150-second task cap, hence a 95-second horizon, below its 150-second minimum: it cannot start. T10a's second step also fails the dry-run forecast: after 90 + 45 seconds, its remaining horizon is 110, below 150. The global 80-minute approval does not raise either local task cap. | “Use `allocationMinutes: 5` for V4-T10a and `allocationMinutes: 4` for V4-T10b as the revised local allocations, retaining their current 150-second minimum pending R05's final bounded-item design. Add explicit dry runs of both complete plans and require every planned locked invocation to be admissible. These local allocations make the stated pack allocations total 64 minutes and their 1.25 guards total 80; the owner has not yet approved those 80 minutes. Recompute the table and request again from the final executable plans if R05 changes the forecast. A forecast is not a guarantee of completion.” |
| RV1-17 | T10a/T10b Steps/CLI/plans; T11 S2-7/S2-8 | major | The tools hardcode two kernel cells and one width cell, while T11 prices five kernel cells and two width cells. There is no CLI for executing that matrix. The profile-child command is abbreviated; run-plan `node`/`state` entries and width-worker failure/termination behaviour are not fully specified. Without closing/terminating workers, the parent can remain alive after collecting results. | Use **R17** for the CLI, plan entries and worker lifecycle. Update T11 to emit those exact commands, with a source label and case list, and test the parser without running the larger matrix. |
| RV1-18 | T10a `r4c-4`, dirty-fraction definition, report and test | major | Comparing only `nLive` misses a changed live-row membership after undo/backtracking: `{r1,r2}` and `{r2,r3}` have the same count but can have different common cells. The resulting “dirty fraction” is not the cache-invalidating mutation fraction P7 needs. | “Track a per-piece mutation epoch, not only the live-row count. Increment that piece's epoch on every live-row removal and restoration (`kill(r)` and the nonnegative-row branch of `undo`); the piece is `rowCols[rowStart[r + 1] - 1] - NC`. At an R4 visit compare the epoch with that piece's last-visited epoch; the first visit is dirty. Keep count-change visits as a separately named optional statistic, not `dirtyPieces`. Add a pure counter test where one row is restored and another removed so the count is unchanged; the next visit must be dirty.” |
| RV1-19 | T10a Authority, `counters` and self-test | major | The task promises equality of complete `DeductionResult`, but compares public `Rating` or capped error counters. A rating omits first-path rows/choices and per-node census detail, so this does not implement the promised equality proof. | “For every counter input, build the same model independently in `instr` and `r4c`, run `measureDeduction` with identical limits, and compare the complete returned `DeductionResult`, including first-path rows/choices/census, search work/nodes and count/census results. Normalize and compare equivalent error outcomes separately. Public-rating equality may also be reported but does not replace this check. Add the complete-result comparison to the self-test and to `counters: equal`.” |
| RV1-20 | Shared rules 3.2; T10a/T10b/T11 direct self-test gates; T12/T13 command tables | major | The shared rule requires rating/timed commands through the runner/helper, yet after T10a the direct `--v4` suite contains real ratings, and T12/T13 prescribe unlocked `npm test` and fixture regeneration. Their “machine 0” wording also hides these gates. The named helper accepts Node arguments, not an npm executable. | Replace the command-routing rule with **R20**. Distinguish zero benchmark time from nonzero verification work; state how that work is authorized/accounted. Do not execute real rating or generation commands unlocked merely because they are tests. |
| RV1-21 | T11 browser calibration and price; N-V4-01 | major | Node uses `log-link`, with filesystem journaling, while the browser bench has no such instrumentation. The browser URL/root is also not pinned to the frozen snapshot, so after T12 it can run the changed working-tree source. This is not the matching-source/matching-observer calibration specified by the plan. | “For the optional browser-to-Node calibration use the frozen `base` tree for Node, not `log-link`, and serve the bench page from `tests/artifacts/ig-proto/frozen-source/`. Both sides have no generation observers, no prototype journal and no Generation steps prefetch; use the same normalized full requests, seeds, quantities and four-worker width. Record the full served snapshot and source digest. Label the result a bench-page factor, not a measured Generator-page response with prefetch. Any actual Generator-page calibration is a separately enumerated/priced item.” |
| RV1-22 | T06 `linkSummary`, `link-10`, Tests; T09 deadline input | major | An awaited task that ends by deadline/cancellation/discard has no `consume`; the specified await interval never closes, losing precisely the tail P5 investigates. Timeline fields are added only inside the `set !== undefined` branch of `describeRun` (`runner.js:703-733`), so no-set rows have no linked timeline and are confused with missing instrumentation. | “Close an open await interval at its matching consume **or the batch end**, whichever occurs first; discard/abort does not erase the wait. Ignore late completion timestamps beyond that end for interval integration. Add a synthetic dispatch at 0, await at 1, inflight discard/end at 31: await 30 ms, idle-slot 90 ms at pool 4, no missing-completion problem. Write `igSetMs` and `igAcceptedMs` for every generation row outside the successful-set-only block: confirmed no set is `igSetMs: null`, `igAcceptedMs: []`; absence of the fields means uninstrumented, not a measured failure.” |
| RV1-23 | `check-list.md` D-V4-13, line 196 | minor | U+000B and U+000C corrupt three variant references. They are valid UTF-8 but are not the intended Markdown/identifiers and need not be caught by the repository's normal text checker. | “Replace the control-character tokens with the literal backticked names `v4-p5`, `fr-*` and `v4-link`. Check every authored Markdown file for characters U+0000-U+001F other than CR/LF and permitted tabs; the final pack must contain none of these embedded control characters.” |
| RV1-24 | T01 snapshot steps and source-reader scope; `lib/sets.mjs`; frozen-source claim | major | `Expand-Archive -Force` merges with an existing directory; it does not prove a clean snapshot. More importantly, `carveSet.offeredInSource` still calls a statically imported **working-tree** policy (`lib/sets.mjs:6,67-76`). Changing only records/tree readers does not make every frozen source-dependent result independent of later production changes. The worker constructors pass `treeRoot`, not the parent's CLI label, so an argv-only source selector must not be assumed to propagate. | “Before extraction require the named snapshot directory to be absent or verify it against the recorded snapshot manifest; never merge an unverified directory with `-Force`. Create the parent artifact directory explicitly. Record the sorted copied path/hash manifest and verify it before frozen tree construction. Add `lib/sets.mjs` and the required engine/worker context wiring to T01's scope: load the reference `pieceCountRange` from the explicitly selected source root, while the carved tree's own policy still controls diagnostic offers. Carry that source identity through workerData/engine context; do not rely on workers inheriting `--label frozen` in argv. Audit other source-dependent static imports similarly. `--label frozen` is the supported selector; remove the unimplemented `--source frozen` claim from D-V4-01.” |
| RV1-25 | T12 Scope, documentation step 5 and T12-B03 | minor | The UI does not show the DLX diagnostic fields, although recorded rating objects contain them. The task describes that as visible output. Its allowed-file list also contains six files, not seven. | “Replace ‘show the diagnostic on every step’ with ‘retain the canonical DLX diagnostic fields in recorded ratings; the visible score table remains unchanged’. Describe `completeDiagnostic` as returning a new completed rating for a lean input, not mutating the input in place. Replace ‘seven files’ by ‘six files’ in the scope guard, unless the revised explicit scope adds another named file.” |

## Replacement blocks

### R01 — Deadline contract

> **D-V4-08.** The post-hoc reserve table is a pilot diagnostic, labelled
> `post-hoc projection; not a live deadline gate`. It estimates accepted prefixes of the recorded runs; it
> does not prove dispatch cancellation, final response assembly or the 120-second response bound.
>
> Before stage-4 validation, the later frozen-round pack must implement and test the actual one-request
> 115-second generation stop, the fitted set-stage reserve and the hard 120-second response backstop in the
> copy's client/host. The source receipt identifies that implementation. The shipped screen and no-screen
> validation arms run with the frozen P5 policy and that live deadline active. The uncapped comparator and
> its exact deadline policy are separately named in the manifest.
>
> N-V4-03 therefore has a prerequisite task, `live request deadline and reserve in the prototype`, before
> its validation commands. T11 prices that implementation's required checks and live validation runs;
> T09 may consume post-hoc pilot rows but cannot mark them as satisfying this prerequisite.
>
> Tests distinguish a diagnostic prefix projection from a live result. A manifest/row marked `postHoc`
> cannot produce a passed phase-0 deadline gate. Live tests include a reserve-cut set, a partial accepted
> prefix at the generation stop, cancellation of outstanding work and response assembly at the hard bound.

This restores the existing plan. Treating the projection as the validation instead requires the ruling in
Q-RV1-01; it is not one of D-V4-13's ordinary pilot parameter choices.

### R02 — Prototype provenance

> The prototype adopts the complete gen-v4 provenance contract before its measurement receipt. Its own
> experimental algo identities are versioned explicitly per semantic arm/configuration; a configuration
> change cannot silently keep an identity that another configuration's replay accepts.
>
> In the isolated copies, records of the experimental gen-v4 family require the same seven version fields
> as the planned gen-v4 format: `algo`, `policy`, `rng`, `seedScheme`, `ratingModel`, `priorTable`,
> `screenTable`. The author specifies the experimental-id-to-reader-shape mapping and the exact edits
> before dispatch; the developer does not select an identity scheme. Production code remains unchanged.
>
> `versionsProblem`, `copyVersions`, `provenanceVersions` and `sameVersions` all implement that contract.
> A changed prior or screen-table version is unavailable before any skip is applied. Include negative
> tests changing only one table version, with a cancellation callback that fails if execution is reached.
>
> Validation of skips and candidate fields follows the record's own algo. Valid gen-v3 records retain the
> five-key version shape, subset ordinals below 2,128, repair ordinals below 64 and their original candidate
> key set, without `igPrior`. They load and save unchanged, without provenance warnings. A gen-v3 record
> with a new table key, prior field or out-of-range old ordinal is rejected with a provenance warning.
>
> The gen-v4 candidate shape is uniform across the prototype arms: it carries `igPrior` as an integer or
> null once that effective-request field is introduced. T05 changes its value and transport, not a global
> key list that invalidates older records. Budget/rerate/c4 settings that affect the outcome must likewise
> be recoverable from the stored effective request or be distinguished by the experimental algo identity.
> Tree ids in external journals are additional evidence, not a substitute for this replay input contract.
>
> Add the copy-only reader/producer/comparator edits and their tests to T02b's allowed scope; split that
> work into a predecessor task if the revised implementation exceeds the three-hour task bound. T04b
> depends on its acceptance. N-V4-07 ports the proven contract to production rather than first designing it.

This is deliberately a pack-author prerequisite, not an invitation for Dev-Sonnet to invent the scheme.
The current five-key-only design is not accepted. Q-RV1-02 is needed only if the author wants the plan to
permit that reduced proof instead.

### R04 — Recorded detail without another solve

> Add a copy-only export in `core/engine/difficulty.js` through the v4 manifest:
>
> ```js
> export function igRateDetailedWithLimits(board, pieces, clues, ws, limits) {
>   const { metrics, detail } = measureV3Core(board, pieces, clues, ws, limits, true);
>   return { rating: ratingOf(metrics), detail };
> }
> ```
>
> Give it the same limits type as `measureV3`. In the real screened path, use this export when `record`
> exists, and the lean `measureV3` path otherwise. Both use the same screen limit and the same deduction.
> Apply the existing certificate test to the resulting rating; a screen-capped observation has no claimed
> rating/detail. Synthetic seams may still return null detail as explicitly documented test seams.
>
> The legacy dispatch is: new target to `selectCluesV4`; otherwise, with a recorder, call
> `selectCluesV3(ctx)` directly; otherwise call `igDispatch(ctx, selectCluesV3)`. An explicit caller `rate`
> seam keeps its existing priority, but the logger must not install one over the real detailed path.
> Recorded legacy diagnostics are a separate untimed pass and need not masquerade as the timed journal.
>
> In T04's approved real passes, assert that recorded completed ratings without a synthetic seam have
> detail, that a certified recorded screen has the canonical detailed result, and that the accepted
> measuring step retains that detail. Retain the three observer-mode result/work/skip comparisons and
> throwing-observer tests. No second solve is allowed merely to fill the detail.

### R05 — Bounded, identity-checked measurement items

> A measurement item has a stable id derived from subcommand, variant, case, seed/rep and observer mode.
> Its state records `frozenCommit`, source digest, tree id, harness hash and a hash of the ordered item
> manifest. Compare these before resuming; a mismatch stops without modifying earlier evidence.
>
> Write an `item-start` record before dispatch. Write one terminal `item-end` record with status
> `completed`, `censored` or `error`, the result/error and elapsed time. A started item without a terminal
> record is interrupted evidence and requires a fix-round ruling; it is never automatically treated as
> unstarted. Completed, censored and error observations are never rerun automatically.
>
> Execute real selection/generation/replay work in supervised workers, not an uninterruptible parent
> loop. Reuse/extend `lib/lanes.mjs` and `lib/lane-worker.mjs` with explicitly named item kinds in T04a's
> scope. Keep the existing rate/call admission and cutoff rules where they apply; generation/replay kinds
> have their own stated admission reserve and are terminated no later than `horizonS - 15`.
> The parent remains responsive to that cutoff, records censorship and writes its state before exit.
> Width workers follow the same parent-side cutoff/cleanup rule.
>
> A two-job generation or a replay is not assigned a 100-second maximum. Publish the exact kind-specific
> reserve/cutoff table with the revised plan. A censored item is incomplete evidence, not a successful
> receipt and not a reason to raise the helper's 300-second limit.
>
> Add synthetic worker tests for normal completion, worker error, parent cutoff, identity mismatch,
> interrupted-start refusal and all-items-already-finished inspection. Include worker startup/cleanup
> in the invocation accounting. Recompute `projectS`, `minHorizonS`, invocation counts and local allocations
> before the stage-1 allowance is requested.

### R06 — Receipt inputs and positive coverage

> `v4-check` accepts an explicit variant list and an ordered case/item manifest; both are hashed in state.
> Every row contains `item`, `variant`, `caseId`, `mode`, `status` and either its complete result summary
> or a classified error/censorship reason. The tool refuses duplicate/conflicting item ids.
>
> `parityVerdict` first checks the exact required item set. For each required arm/case it then compares
> absent, charge-only and record-plus-charge results, skips and total charged-work accounting; absence
> of the work evidence is incomplete, not equality. Record checks include the detailed-path conditions
> of R04. The manifest prices the corresponding untimed passes for every arm/configuration that is
> subsequently used for validation, including changes introduced after T04b.
>
> The PM4 block requires the expected manifest/source identity, a complete run, nonzero certified
> evidence, no certificate violation, and no gap in the named R14 coverage cases. It reports exact counts.
> Read self-test success from its `results` array and `done` field, not nonexistent summary counters.
>
> A generated partial response is a generation outcome, not automatically a tool error. Preserve and
> replay every usable produced record. Distinguish “no candidate witness obtained in the approved
> corpus” from a replay mismatch; the former leaves the required proof incomplete.
>
> Bounded incomplete replays remain useful findings, but cannot alone establish the full replay-equality
> prerequisite. State which required candidate replay proofs matched in full; missing/unexecuted proofs
> leave the receipt incomplete. `Stage 1: holds.` requires all mandatory proof blocks to be complete and
> successful. A missing file, empty item array, absent required mode or stale configuration cannot pass.
>
> Add pure tests for missing/duplicate modes, empty replay data, all-incomplete replay data, a changed
> work total, null detail in a real recorded completion, incomplete PM4 and a PM4 coverage gap.

### R10 — Budget exhaustion

> The call budget accounts for every rating/re-rating and every uniqueness-count operation. Check it
> before starting each such operation, repairs included. The already-running atomic operation is allowed
> to finish and its full canonical units are charged; record any resulting overshoot explicitly.
>
> Once that charge exhausts the budget, start no additional repair/count/rating operation. Return the best
> **already completed, eligible final result** from the finals cache, using the existing deterministic
> centre/tie ordering, or `not-in-band` when none exists. Do not call the lazy `chooseBest` path if it can
> perform new work after exhaustion. An unfinished repair cannot be accepted.
>
> Budget termination preserves consumed-skip verification and throws external observer exceptions
> unchanged. Record the budget-end reason separately from a canonical unrateable rating.
>
> Tests cover exhaustion before a search rating, before a rescue re-rating, between uniqueness counts,
> before a repair rating, and with multiple unfinished in-band candidates. Assert no later primitive
> starts, one charge per performed primitive, a valid completed winner or failure, and equal results at
> every observer mode. A separate fitting of a repair reserve would be an explicit budget design change,
> not an exemption hidden in `phase !== 'repair'`.

### R12 — Complete admission contract

> The verdict manifest declares the exact cell-by-replicate matrix, normalized request identities,
> expected arm/configuration receipts, validation reps and Master identity reps. Pair rows within a
> cell by the full request/seed identity; resample the declared replicate indices in the same order across
> cells. Duplicate rows, wrong identities, missing rows and invalid completed-request timing fields are
> incomplete evidence. Never convert a missing timestamp into zero.
>
> For each class:
>
> 1. Require both arms' full validation and at least 15 matched sets from 15 distinct seeds **in each cell**.
> 2. Pool those matched sets for the class clue rule; do not replace the class median/fraction by separate
>    per-cell clue gates.
> 3. Apply the class faster rule with equal cell weights and shared-seed resampling, including each cell's
>    geometric-mean floor.
> 4. Apply the missing work rule: work units per accepted puzzle must not be worse with the screen.
>    Add a documented `chargedWork` total and a `workCoverageComplete` flag to the evidence producer,
>    covering the declared selection/repair-charge scope on the same cell/seed population. Aggregate as
>    the class total charged units divided by its total accepted puzzles for each arm. Report both totals,
>    denominators and the ratio. An unknown/censored work contribution without complete accounting,
>    a zero denominator or a missing field makes this condition inconclusive; it is never silently zero.
> 5. Check the per-cell completion difference and the screen arm's applicable cell gates.
>
> A class is admitted only when all conditions pass. An incomplete/insufficient class is inconclusive,
> and a completed failing class is failed. Both ship no screen. Resolve `shippedArm` from that verdict,
> then judge each failing/control cell on its shipped arm; a missing fallback arm is incomplete.
> A failed or inconclusive class does not itself fail phase 0 when its fully measured no-screen shipped
> arms pass their cell gates; it prevents use of the screen.
> Phase 0 passes only if every required failing Nightmare cell and completion-passing control passes
> its applicable gate, every class has its required disposition, and the independent source/certificate,
> parity and live-deadline prerequisites hold. Hell 1 remains reported rather than a global phase-0 veto.
> Master identity is exact on its declared five-seed matrix, not a timing gate.
>
> Add deciding-condition tests: 14 versus 15 matched seeds, a duplicate seed, missing arm/row,
> class-pooled versus per-cell clue results, work worse/unknown, a faster screen arm failing a cell gate,
> fallback no-screen pass/fail/missing, one failing global Nightmare cell, a failing Hell-only candidate,
> and a Master key mismatch. Test failed requests at the common 120,000 ms endpoint.

The work-accounting producer and its exact unit scope must be specified by the author in the revised tasks
before dispatch. This row restores the missing condition; it does not authorize an estimator to be labelled
complete work accounting.

### R14 — Validation matrix

> Expand the stage-4 matrix only from the frozen class/configuration receipt:
>
> - Every validated cell of every screen class gets both its frozen screen and no-screen twin on the same
>   20 validation replicates, controls included. Price both arms even when a third failure has already
>   settled completion.
> - Completion-passing controls additionally get the matching today's arm required for no regression.
> - Enumerate the uncapped **new-search** comparator needed for P5/lost-completion evaluation. It keeps
>   the same frozen prior, screen, c4/rerate and other search settings; the manifest lists exactly which
>   P5 limits/deadline settings differ. `log-link` is the old search and is not this comparator.
> - Every cell's chosen fallback must have its complete measured cohort. No absent fallback is inferred.
> - Conditional Hell 1 validation includes each qualifying pilot board and follows the same arm rules.
> - S4-7 identifies the cells/configuration affected by a later prior adoption and prices their required
>   new fit/freeze/validation. It cannot be hardcoded to S4-2's two boards when 14x14 or 24x24 changed.
>   Assign a fresh, declared validation cohort disjoint from all fitting/selection data; do not silently
>   reuse the first validation's reps as a new independent validation.
>
> Deduplicate identical requests only after comparing their full effective configurations and identities.
> Emit the complete expanded matrix and its counts, then price that matrix with R15. Add data-only
> tests for a screen class containing both a headline and a control, a failed-class fallback, a P5
> comparator with a different prior (rejected), and a later prior change on 14x14/24x24.

### R15 — Price executable invocations

> `refS` and the source factor provide a **planning projection**, not an upper bound on a new arm or
> an unseen seed. Label `1.25 * factor * refS` accordingly; retain the raw estimate beside any row limit
> rather than interpreting a timeout limit as proof that the request will complete.
>
> Enumerate executable invocation shards before pricing overhead. With `rowLimitS: 260`, the current
> runner requires `elapsedS() + 270 <= horizonS`; a multi-rep `--cases` string does not mean those reps
> share one invocation. For the conservative manifest, enumerate one request row per locked invocation.
> Per item, `invocations` is the number of those commands; `projectedCountedS` is the projected node
> seconds plus 45 seconds per invocation. Give the separately approved task/round guard and the
> applicable row/cutoff ceiling without calling a median a hard ceiling.
>
> Apply the same rule to conditional validation and browser items, and use the actual bounded-item
> plans for probes. Count setup, supervision/grace and verification passes explicitly. No invocation
> overhead is charged twice, and no already-counted reference total is labelled raw node seconds.
>
> Add the regression example: 20 single-row invocations, 55 projected node seconds each, give
> 1,100 node seconds, 900 quiet seconds and 2,000 counted seconds before a guard, not 1,325.
> A dry-run admission check accompanies every emitted plan/shard family.

### R17 — Probe interfaces and worker lifecycle

> `kernel-probe.mjs` supports `counters`, `profile`, `profile-child` and `report`.
> `counters`/`profile` accept `--cases <comma-separated catalogue ids>`, defaulting to
> `14x14-nightmare,26x26-nightmare`; `profile-child` requires `--case <id>`. Pass `--task`,
> `--label frozen`, `--source-label` and the bounded remaining horizon explicitly to each child.
> The case list is part of the state identity and output.
>
> `width-probe.mjs run` accepts `--cases`, defaulting to `26x26-nightmare`, and `--rounds`,
> defaulting to 3. A work item is `(caseId, width)` for widths 1, 2, 4, 8. Its report includes caseId,
> width, rounds and expected/observed rating counts. T11 passes the two named case ids explicitly.
>
> Define width-worker messages as `{ type: 'ready' }`, `{ type: 'go' }`,
> `{ type: 'result', ms }` and `{ type: 'error', message }`, with `workerData` carrying
> `{ treeRoot, items, rounds }`. The parent handles error/early exit and its R05 cutoff; it terminates
> and awaits every worker in `finally`. The child closes its port after one terminal message.
> A partial width measurement is labelled censored/incomplete, not a four-width pass.
> The profile parent also records its own spawned subprocess PID, terminates it at the cutoff and awaits
> its exit before writing terminal state. Terminating a worker thread is not cleanup of a subprocess
> that the thread started; no such process may outlive its locked invocation.
>
> Supply full run-plan entries:
>
> - T10a counters: node `tools\ig-proto\kernel-probe.mjs counters --task V4-T10a`,
>   state `V4-T10a\counters\state.json`;
> - T10a profile: node `tools\ig-proto\kernel-probe.mjs profile --task V4-T10a`,
>   state `V4-T10a\profile\state.json`;
> - T10a report: node `tools\ig-proto\kernel-probe.mjs report --task V4-T10a`, unlocked;
> - T10b run: node `tools\ig-proto\width-probe.mjs run --task V4-T10b`,
>   state `V4-T10b\run\state.json`;
> - T10b report: node `tools\ig-proto\width-probe.mjs report --task V4-T10b`, unlocked.
>
> The runner supplies label, source label and horizon as it does for existing plans. Keep the revised
> allocation/minimum-horizon columns explicit. Test argument validation and worker completion/error/cutoff
> using scripted workers, without running the full stage-2 matrix in these tooling tasks.

### R20 — Lock and verification commands

> A zero in the benchmark-time column means no benchmark allocation, not zero verification work.
> All commands that execute real generation, deduction, uniqueness work or replay, including test
> suites and fixture checks, acquire the same named low-priority helper. Pure text checks, arithmetic
> and synthetic tests that execute no such work may remain unlocked.
>
> For the production gates, dot-source the exact helper named in check-list 3.2 in the same PowerShell
> process as each invocation, at the repository root, and invoke Node directly:
>
> ```powershell
> . 'C:\Users\ledat\.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\ig-lock.ps1'
> Invoke-IgNode -Repo pentomino -Task 'T12 quick' -NodeArgs @('--test', '--test-skip-pattern=slow', 'tests/**/*.test.js')
> ```
>
> Use corresponding separately bounded invocations for `@('--test', 'tests/**/*.test.js')`,
> `@('tools\record-fixtures.mjs', '--check')` and
> `@('tools\record-fixtures.mjs', '--replay-case', '--check')`, changing the task label for T13.
> The forward slashes inside the Node test glob are the package's existing glob syntax, not a shell
> working-directory path. The helper's maximum is 300 seconds; a gate that needs longer must be sharded,
> not run unlocked or assigned a larger helper limit.
>
> After T10a adds real ratings to `--v4`, route that group through the same bounded runner/helper in
> T10a, T10b and T11, or split the real-rating cases into a separately locked group. Specify that group
> and its plan entries in the revised tasks; do not leave the choice to the developer.
> Record verification time and lock waits separately from benchmark observations, and include funded
> measurement/parity invocations in the stage-1 forecast. State the verification authorization/accounting
> in the task before dispatch.

The helper itself was checked: `Invoke-IgNode -Repo pentomino -Task ... -NodeArgs ...` is the correct API,
with 45 seconds quiet time and a maximum 300-second process-tree lifetime. It is the surrounding command
routing and accounting, not that API, that is wrong in the draft.

## Decision authority and questions

The **2 G-unit pilot, four-attempt pilot, reps 0-4 / 20-39 / 20-24 and resample seed 20261116** are
technical pilot choices within the plan, provided they are not silently promoted to shipped values or new
acceptance thresholds. The seed cohorts are disjoint from the cited prior-fitting reps. The bench page is
also a permissible diagnostic harness when labelled and paired as RV1-21 requires; it is not evidence that
the actual Generator page, with prefetch and its board limits, passed an offer gate.

The existing owner stop points remain mandatory: approve the corrected stage-1 allowance after complete
tooling forecasts, and approve the enumerated later manifest under OD-P10. Neither an allocation in JSON
nor a reviewer correction grants that approval.

T12 has authority under OD-P2 and plan phase 1; it need not wait for phase 0's completion gate. It does
need the pinned source and its own canonical-result/fixture/history checks. N-V4-12's timing and both
memory checks remain **open release gates**: accepting implementation T12 does not mark phase 1 qualified
or authorize a release. T13's existing streaming/history implementation and the cited test helpers were
checked; the principal issue in its commands is the lock routing in RV1-20.

The following questions are needed **only if the author wants to retain the departures**, rather than
restore the existing plan through R01/R02. They are not decisions the developer may make.

### Q-RV1-01 — Supervisor: may post-hoc truncation replace live deadline validation?

**Question:** Plan 5.1 requires validation with P5 and the one request deadline active. D-V4-08 replaces that
with post-hoc truncation of uncapped accept timelines. Which contract should the task pack implement?

- **(a) Keep the existing plan.** Use post-hoc truncation only as a labelled pilot projection; implement
  and run the live reserve, 115-second generation stop and 120-second response backstop before stage-4
  admission. This tests real cancellation/response assembly and needs its implementation/check costs in
  the manifest.
- **(b) Amend the phase-0 gate to permit simulation.** The phase-0 result would no longer demonstrate
  live deadline/cancellation/response-bound behaviour; those proofs move to a separately required
  production gate. State the reduced claim, the later mandatory gate and its price explicitly. Any
  alteration of the owner's IG-P-D1 conditions also needs the owner's confirmation.

**No option is adopted for the supervisor or owner.**

### Q-RV1-02 — Supervisor: may the frozen prototype defer the table-version provenance proof?

**Question:** Plan 5.1 says the frozen prototype adopts provenance/replay, and Q36 specifies record-specific
five/seven-key shapes and table-version refusal. D-V4-05 keeps five keys in prototype records and stores
table versions only in tree/journal metadata. May the frozen measurement receipt omit that proof?

- **(a) Keep the existing plan.** Implement the seven-key analogue, old-record preservation, own-algo
  bounds/fields and table-version refusal in the isolated prototype before its receipt; production later
  ports the proven contract. The author completes and prices that design now.
- **(b) Amend the preparation contract.** Permit a deliberately reduced prototype proof, explicitly
  exclude table-version/provenance compatibility from its receipt, and make the missing proof a
  mandatory later prerequisite before production acceptance. State the deferred scope, risk and price;
  do not call the current five-key result the full Q36 parity proof.

**No option is adopted for the supervisor or owner.**

## Checked items without a separate finding

- The 16 task estimates total 38 developer hours and each is declared at most three hours. Re-estimate
  and split after the substantive fixes; a three-hour label does not price the added identity/runner work.
- The traceability matrix names all DR-O01..DR-O17 and DR-A01..DR-A12. The blocking findings concern
  the actual implementation/acceptance behind those mappings, not missing identifiers in the table.
- The T05, T06, T07 and T10a literal find anchors were located once each in the appropriate inherited
  `log`/`instr` source texts. This was an in-memory text check, not execution of their replacement code.
- The T03 stored-data expectations were independently reproduced: 116 families, 1,362 probes,
  987 rated probes and 113 alternate-level probes; the two 215-cell Hell-3 witnesses are count/score
  2/179 and 3/165. No new rating was made.
- The production P6 design retains canonical returned ratings and keeps recorders on the full path;
  the current replay measuring-step assertion remains relevant. The local wording corrections are RV1-25.
- Existing owner decisions about old-version steps, Hell withdrawal, P-OD12's gen-v3 scope and the
  locked score/work tuple are not reopened by this review.

## Verification and completion

The read-only budget checks produced:

```text
V4-T10a: forecast 0 s   -> task cap 300 s, horizon 245 s, go
V4-T10a: forecast 135 s -> task cap 300 s, horizon 110 s, stop
V4-T10b: forecast 0 s   -> task cap 150 s, horizon 95 s, stop
```

Verification:

- Direct `checkText` and explicit byte/text checks passed: CRLF, valid UTF-8 without BOM, no trailing
  whitespace, no embedded control characters, final newline.
- The table contains 25 distinct finding ids: 6 blocking, 17 major, 2 minor.
- The 17 input pack files and the final-plan edit still have the input digests recorded above.
- No production, test, tool or living-spec file was changed by this review. Branch/HEAD remain
  `improve-generating` / `345d29d`; there was no commit or branch operation.
- The persisted output is `tasks\improve-generating-v4\review-1.md`; no other file was authored.

Verdict: changes required
