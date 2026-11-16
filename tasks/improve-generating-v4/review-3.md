# improve-generating-v4: task-pack cross-review 3

Reviewer: SA-Astra (gpt-6-astra). Pack author: SA-Opus.
Start: 2026-11-16 20:24:23 +07:00.
End: 2026-11-16 21:28:33 +07:00.

## Basis, method and verdict

- Reviewed `review-2-response.md`, the checklist and all 28 tasks, including the rewritten T04, T09 and T11
  sequences. Reviewed the original RV1/RV2 findings against the actual replacement contracts.
- Pack-input SHA-256: `cfdf4a99b096563d6c82b4c6c670ccdb668af860689949f30b979d248cef24a4`
  (sorted checklist/T-file names, each followed by LF and its LF-normalized content).
  Plan SHA-256: `f0f289e98ba1f728ae96a1b697651c81db775255ecf21239989fe05cfe159c00`, unchanged.
- Recomputed the working production source digest:
  `e181df2cc2e784355345c1a43c6a97800fbfa5e6d139d1b465054fa94204284b`, matching the stated `3fc65f4` source.
  Checked the 37 new anchors in the author's list after applying the existing `instr`/`log` edits in memory:
  all match exactly once. Did not run the author's Git-based anchor commands.
- Read the actual worker cancellation, generation/completion, logging, run-record, lane and plan-runner code.
  Re-read the named lock helper. Ran only read-only arithmetic/schema checks, including the author's
  `t09-synthetic-check.mjs`. No generation, rating, replay, browser run, timed run, test suite or Git action.
- Only this review is written. The source-drift verdict remains **no breaking change**; these are task-pack
  integration and acceptance-contract findings.

**Summary: changes required.** RV1: **21 resolved, 4 not resolved**. RV2: **16 resolved, 4 not resolved**.
New findings: **4 blocking, 4 major, 1 minor**.

The mechanical corrections largely hold. The task split, explicit completed/failed/censored records, stable process
identities, full-work parity DTO, corrected completion definition, Master gate inclusion, width-eight test trees,
per-group row limits and cumulative approval arithmetic are real improvements.

The remaining blockers are not requests for additional polish. They concern an unresolved work-accounting decision,
an ineffective P-0 invariant proof, premature final admission, and missing per-puzzle evidence that can satisfy
the proposed gates. The remaining major findings prevent a sound execution/receipt contract. The minor finding
alone would not block acceptance.

Disposition means the **original defect** is repaired; it does not certify every subsequently added integration
around that repair. New defects are identified separately rather than silently reopening unrelated RV1/RV2 items.
Exact replacement blocks below are proposed task text for the pack author, not implementation work delegated to
the developer. Update dependent scopes, tests, estimates, traceability and prices together.

## RV1 disposition

| ID | Status | Reason in the revised files |
|---|---|---|
| RV1-01 | resolved | D-V4-08/N-V4-13 retain a live deadline before initial validation; T04d/T09c distinguish the live receipt positively from a projection, and T11c orders `V4-LIVE` before `V4-S4`. Later-cohort wiring still has RV3-04. |
| RV1-02 | resolved | T02c has per-arm identities, seven-key records, record-specific skip bounds, `made.igPrior`, old-record preservation and table-version refusal. The discriminator is now narrow. The new P-0 defect is RV3-02. |
| RV1-03 | resolved | T02a/P5 use Nightmare and Hell 1 only; the boundary tests include both excluded Hell levels and the supported imported-set bound. |
| RV1-04 | resolved | The screen's detail comes from its own measurement; the legacy recorded route bypasses the logging seam. Real detail rechecks remain in stage 1. |
| RV1-05 | resolved | T04a binds all terminal records to the run identity. T10b logs before spawn, uses stable inputs, handles spawn/error/close and cleans up owned children. |
| RV1-06 | resolved | T04b/T04c explicitly compare rating plus count work, observer charge sequences, scored detail and positive candidate replay. Later arms now have declared proof manifests. P-0 and receipt composition have separate findings below. |
| RV1-07 | resolved | The changed self-test files are in scope and the checklist makes named cases/edit success authoritative. A remaining printed-count typo is minor RV3-09. |
| RV1-08 | resolved | T04e checks each native exit and the PM4 gate before the next plan. |
| RV1-09 | resolved | T07b checks the bound before the ordered winner scan and uses the composed width-eight test trees for the scripted race. |
| RV1-10 | resolved | T07a checks every rating/count boundary, meters repairs and returns only already finished results after budget exhaustion. |
| RV1-11 | resolved | `fam` is in the enclosing search scope, assigned at the original RNG point, before c4 can use it. |
| RV1-12 | not resolved | The class/global machinery is substantially specified, but the disputed work quantity, premature finality and incomplete identity/population evidence remain: RV3-01, RV3-03, RV3-08. |
| RV1-13 | resolved | T09c separates false set refusals from lost completions and marks missing/censored/erroneous uncapped controls unknown. Full expected-pair coverage is a separate RV3-03 issue. |
| RV1-14 | not resolved | Both twins and uncapped controls are enumerated, but the resolver mixes initial, optional and second-validation collections. See RV3-04. |
| RV1-15 | not resolved | Row admission, lane grouping and overheads now have simulations; an admission reserve is still incorrectly used as a hard item duration/ceiling. See RV3-05. |
| RV1-16 | resolved | The three probe tasks have admissible local allocations and their own dry-run gates; the old first-invocation budget failure is removed. |
| RV1-17 | not resolved | The probe CLIs/lifecycles are repaired, but compiled measurement namespaces and later-cohort execution remain inconsistent: RV3-02 and RV3-04. |
| RV1-18 | resolved | T10a records mutation epochs on removal/restoration, not only live counts. |
| RV1-19 | resolved | T10a compares complete independent deduction results and corresponding error outcomes. |
| RV1-20 | resolved | Real checks use the dot-sourced helper with its actual Node argument interface and 300-second limit; verification and benchmark accounting are distinguished. |
| RV1-21 | resolved | B-1 is the matching frozen, unobserved base/bench calibration; B-2 remains a separately priced Generator/prefetch item. |
| RV1-22 | resolved | T06 closes await tails at batch end and represents measured no-set rows explicitly. The new linkage API/closure details are RV3-07. |
| RV1-23 | resolved | The literal variant names replace the embedded control characters, with a stated format check. |
| RV1-24 | resolved | T01a verifies a non-merged snapshot; T01b removes the working-tree offer dependency and keeps workers tied to their loaded tree. |
| RV1-25 | resolved | T12 says diagnostic fields are retained in recorded ratings, not displayed as new table columns; completion returns a new lean-rating result and the scope lists six files. |

## RV2 disposition

| ID | Status | Reason in the revised files |
|---|---|---|
| RV2-01 | resolved | T04a's only writers put `identityHash` on start/spawn/end; verification-resume checks the actual writer-produced log. |
| RV2-02 | resolved | T04b prepares the pack parent before starting the pool, refuses an existing unstarted pack and hashes the bytes written. |
| RV2-03 | resolved | T10b removes remaining time from the manifest, validates before touching folders and rebuilds derived profile records without duplication. |
| RV2-04 | resolved | Durable intent precedes spawn; the PID has its own record; spawn errors and stream closure are handled separately, with owned-child cleanup. |
| RV2-05 | resolved | T07b composes the existing `w8` edit only into the two test trees and loads those at width eight. |
| RV2-06 | resolved | D-V4-16/T09a restore completion independent of the 120-second cap. Q-RV2-01 option (a) is applied; that question is closed. |
| RV2-07 | not resolved | D-V4-17 deliberately excludes unreported interrupted-primitive work. I retain the strict rule pending Q-RV3-01. The bookkeeping also needs RV3-07 even if the supervisor selects D-V4-17. |
| RV2-08 | resolved | T09c passes Master results into the global predicate and tests mismatch/missing outcomes. The newly specified Master's evidence predicate has RV3-08. |
| RV2-09 | not resolved | Positive kinds and source/tree bindings are present, but the expected binding omits the harness hash and the historical stage-1 coverage is taken from the receipt being checked. See RV3-06. |
| RV2-10 | resolved | Today/uncapped groups use 260 seconds; only live validation twins use 130, with the live receipt ordered first. |
| RV2-11 | not resolved | The compiler adds producer/consumer structure, but P-0 still reuses its old observation namespace and the comparator template contains other cohorts. See RV3-02 and RV3-04. |
| RV2-12 | not resolved | The previous scalar capacity formula is replaced correctly for nominal durations. Cut handling and the claimed hard ceiling remain wrong: RV3-05. |
| RV2-13 | resolved | Approval requests separate spent time, additional guard and cumulative cap, and are re-read when requested. Prior invocation records are retained. |
| RV2-14 | resolved | T02a meters count work independently of caller observers; T04b/T04c compare complete totals/charge sequences and supply explicit rated/rejected/scored counts. |
| RV2-15 | resolved | T02c distinguishes exact production `gen-v4`, the constrained experimental namespace and foreign five-key algorithms. |
| RV2-16 | resolved | T01a implements/loads the snapshot tool before extraction and explicitly refuses interrupted unverified preparation. |
| RV2-17 | resolved | T06's no-set/set-with-no-acceptance branches remove the invalid comparison with an absent first acceptance. |
| RV2-18 | resolved | T09a's schema/status ingestion distinguishes correctness failure, censorship, unexpected error and ordinary measured failure. Missing per-puzzle detail is a further RV3-08 issue. |
| RV2-19 | resolved | `rateScreen` checks the explicit seam before native paths; T02b tests sentinel propagation and one seam call per rating. |
| RV2-20 | resolved | The checklist now says requested/pending and records the grant only after the owner answers. Keeping the dated older response unchanged is appropriate. |

## Ruling on RV2-07 / D-V4-17

**Keep the strict rule. This is an unresolved disagreement between the two SAs, not a decision for the supervisor.**

I accept the operational facts in SA-Opus's explanation:

- The frozen pool discards/terminates a busy worker when its task is aborted
  (`core/browser/worker-pool.js:293-325`).
- The set, completion and batch controllers abort outstanding speculative tasks on exit
  (`core/browser/generation-client.js:696-699,1080,1172-1175`).
- The current observer/tuple sees a primitive's work after that primitive returns, including a reported
  work-cap outcome; killing the thread can prevent that report
  (`core/engine/clues.js:173-212,322-344`; the prototype's `recordRating`).

Those facts explain why exact accounting is difficult. They do not prove that the omitted units are zero,
equal between arms or conservative for the comparison. Nor does a worker-termination count measure the omitted
amount. The source establishes that termination is routine, not that every call or every class must necessarily
contain an unreported primitive.

The plan's faster rule says: **"Work units per accepted puzzle are reported beside it and may not be worse with
the screen."** It does not say "only the work that happened to be reported before a kill." D-V4-17 makes that
restriction explicit for the first time. P5's completed-operation meter and a request's non-worsening resource
comparison have different purposes; using the same numeric unit does not establish that their observed populations
are interchangeable.

A constructed counterexample, not a benchmark observation: both arms accept ten puzzles. Completed primitives
report 900 units for screen and 1,000 for no screen; their interrupted primitives have already consumed 200 and
10 units respectively. D-V4-17 reports 90 versus 100 units per accepted puzzle and passes. Including those consumed
units gives 110 versus 101 and fails. Reporting one terminated call per arm does not distinguish these cases.

The already approved fail-closed fallback remains available: a class with unknown work is inconclusive and uses
no screen, subject to that arm's other gates. A different observable acceptance quantity or a sound bounding
method may be reasonable, but needs the supervisor's ruling rather than being described as equivalent.

## New findings

Task paths below are under `tasks/improve-generating-v4/`. Replacement blocks are continuations of the last column.

| ID | File and section | Severity | Problem | Exact replacement text |
|---|---|---|---|---|
| RV3-01 | `check-list.md` D-V4-17; T09b Authority, `rowLedger`, `workRule` | blocking | A recorded kill closes a call without measuring its interrupted primitive, yet the resulting completed-prefix sum can satisfy the non-worsening work gate. The counterexample above demonstrates the missing implication. This is the explicitly raised SA disagreement. | "D-V4-17 is proposed, pending Q-RV3-01. Until that ruling, keep completed-primitive units and termination counts as reported diagnostics; do not treat an interrupted call's unreported work as a complete observation for the plan's non-worsening condition. Unknown work makes that condition unknown. Update the plan/decision register and the task's metric/acceptance text consistently after the ruling." |
| RV3-02 | T11c P-0 manifest, `receipt` and plan consumers; T04c manifest addressing | blocking | The P-0 receipt compares absent-mode `eventsDigest`, which T04b deliberately sets to null, rather than the result `digest`. It can miss a changed result. P-0 also reuses `V4-T04.parity.json` with its old `task`/`step`, while executing under `V4-S2P/parity-v4`: T04c derives raw paths from the manifest, so new measurements append into old stage-1 journal folders. Finally the required proof writes a failing receipt with exit 0 and is not an explicit later prerequisite. | Use **R3-02**. The baseline must stay byte-unchanged, comparison must use the result digest and semantic input identity, and a required proof must actually gate continuation. |
| RV3-03 | T09c `phase0Verdict`, `p5Stops`; T11d `verdictInput` | blocking | The validation-stage manifest has `p5: []`. The specified global predicate can therefore print `Phase 0: pass` before any uncapped comparator has run. The P5 function also has no declared expected pair set, and only the uncapped side is explicitly covered by the unknown rule. An empty/partial pair collection or an invalid bounded observation is not a counted loss assessment. | Use **R3-03**: distinguish selection-only from final admission and validate the full expected pair collection on both sides. |
| RV3-04 | T11a expansion; T11c `V4-S4`, `V4-S4X`, comparator template; T11d resolution | major | The template takes every `shipped-uncapped` group, including optional and replicate-40-to-59 groups, but resolves it from the initial selection. Without optional boards, resolution can ask for a cell with no selection; with second-validation groups, it schedules their controls before the adoption/new selection. `V4-S4X` also takes the S4-7 groups containing the unresolved arm and has no subsequent selection/comparator/final-verdict chain. | Use **R3-04**. An executable plan must belong to one explicitly activated collection/configuration epoch, with comparators resolved from that collection only. |
| RV3-05 | T11b simulations/`ceilingS`; T11d stage-5 pricing | major | The 120/245-second values are admission reserves, not per-item timeouts. Actual items may run until `H - 15`; the simulation instead runs an admitted duration past that cut, and its ceiling substitutes the reserve. A single process item with a 200-second projection and reserve 120 yields projected counted time 247 seconds but a claimed ceiling of 167. Stage 5 compounds this by representing potentially long aggregate work as one process item. | Use **R3-05**. Keep the correct new scheduling model, but model cuts and distinguish projection, reserve and hard ceiling. |
| RV3-06 | T04d `proofCheck`/stored evidence; T09c selection receipt; T11d prerequisite bindings | major | `harnessHash` is required in the envelope but absent from `expected` and never compared. Stage 1 is later checked with no arm binding and coverage copied from that same receipt. An older/shorter proof can define its own required coverage. The class-selection evidence lists runs files although its decision also consumes the declared recipe and journals. Historical proof must remain usable without becoming self-attesting or depending on mutable current tree metadata. | Use **R3-06**: bind the producer/recipe and the predeclared coverage, with an explicit immutable historical binding for stage 1. |
| RV3-07 | T06 `link-12`/`link-13`, linkage signature; T09b ledger rules 6/9 | major | `worker-end` is emitted before the asynchronous termination completes, so its timestamp is a request time, not the claimed end. Completion tasks are only count-matched to ended calls, allowing an unrelated speculative ended call to substitute for a missing returned call. `timelineProblem(run)` also requires link information that its signature does not provide. These are producer/consumer gaps independent of the D-V4-17 ruling. | Use **R3-07**. Record confirmed termination, correlate selection work by task identity, and pass the timeline validator its link data explicitly. |
| RV3-08 | T09a matched sets/population inputs; T09c Master identity; synthetic helpers | blocking | A structurally valid run can claim ten accepted puzzles while `igPuzzleKeys` and `puzzles` are empty. T09c's specified equality then accepts equal empty key arrays as Master identity. The matched-set predicate accepts equal set keys and positive counts, with no completeness rule for clue data; using the existing median gives `null - null === 0`, a spurious zero clue difference. The synthetic helper itself supplies empty identity arrays by default. | Use **R3-08**. Validate the evidence needed by each gate before comparing it; missing per-puzzle evidence is not equality or a zero difference. |
| RV3-09 | T02c case counts; T10b step boundary; T04d/T09c test field references; T11c command wording | minor | Some editorial references lag the split: T02b now has five cases, making T02c's cumulative v4 count twelve, not eleven; T10b's step 3 is attached to the preceding sentence; proof fields are spread at the envelope root although tests sometimes say `fields.selection`/`fields.reserveChecked`; the compile command's plan-file count is inconsistent with its list. | "Use five T02b cases/twelve cumulative v4 cases in T02c; put T10b step 3 on its own paragraph; modify/assert `reserveChecked` and `selection.cells` at the emitted envelope root (or explicitly say the factory input is being modified); report the files actually emitted by the corrected compiler rather than retaining the obsolete count. These are wording corrections, not new gates." |

## Exact replacement blocks

### R3-02: isolate and enforce P-0

Create `tools/ig-proto/plans/items/V4-S2P.p0-v4.json` as a new-namespace copy of the stage-1 parity corpus:
`task: 'V4-S2P'`, `step: 'p0-v4'`, preserving its declared cases, variants, seeds and modes. Preserve the existing
23-item corpus unless the author explicitly adjusts the corpus and its price together. Execute it with matching
CLI task/step and state `V4-S2P\p0-v4\state.json`.

`v4-check run` must reject a CLI task/step that differs from its manifest before dispatching or writing anything.
All new logs belong to the new manifest's directory. The old manifest, raw logs, states and receipts are read-only.

Joined observation rows include `seedText`. Compare old/new observations by
`(variant, caseId, seedText, mode)`, not the storage-namespace item ID. For every declared absent-mode comparison,
require a present, completed observation with a string `result.digest` on each side and compare that digest.
Do not compare `eventsDigest`: it is null in absent mode. Check the effective input/parameter binding and record
both historical and new identities without relabelling either.

Give this receipt `kind: 'p0-identity'`; it requires the parity block and the baseline-result comparison, not a new
generation/replay block that its manifest does not contain. Its arm bindings cover all variants actually observed.
Ordinary P-1 receipts continue to require both parity and replay.

Add a `--require-pass` receipt/gate mode that writes the evidence first and exits nonzero for `fail` or
`incomplete`. Use it for every mandatory P-0/P-1 proof in the compiled plans. Make the successful P-0 receipt an
explicit prerequisite of the freeze/validation path; do not rely on the existence of the old stage-1 receipt as
a substitute.

Tests: changing only an absent result digest fails even when both event digests are null; renamed storage IDs
still compare the same semantic inputs; a missing baseline fails closed; old stage-1 files retain their hashes;
CLI/manifest mismatch refuses before any write; a failed required receipt prevents the following plan step.
Price the actual new manifest and gate sequence.

### R3-03: selection is not final phase-0 admission

Add `purpose: 'selection' | 'final'` to the verdict-input schema and pass it to the global verdict.
`verdictInput('validation', ...)` produces selection-purpose input. It may produce a final class-selection
receipt, but its phase-0 line is never `pass`; absent a substantive failure it is
`Phase 0: INCOMPLETE (uncapped comparator collection pending)`.

Final-purpose input declares the expected P5 cells and replicate/seed identities from the active collection.
For each expected pair, require one valid bounded row and one valid uncapped row with matching full request
identity and the linked set outcome. Missing, duplicate, wrong-seed, invalid, censored, erroneous or unlinked
evidence on either side is unknown. A missing pair on both sides is still missing, not an empty success.

Pass the declared reps/identities into `p5Stops`; do not infer the expected population from whatever rows happen
to exist. Final phase 0 can pass only after the expected comparison collection has been accounted for.
The loss count remains a report, not a new zero-loss threshold.

Tests: an otherwise green selection-purpose input with `p5: []` cannot pass phase 0; a final input missing a
declared cell/pair cannot pass; an invalid bounded row against a valid completed control is unknown; a complete
valid collection retains the existing false-stop/lost-completion results.

### R3-04: activate and resolve one collection at a time

Keep the priced universe separate from the activated measurement collection. Before compiling/running a concrete
validation plan, record its configuration/epoch, required cells, approved optional items and conditional cells
whose five-seed pilots reached ten on at least three valid requests. Missing/invalid rows are not counted as
completions. Preserve the conservative price of unactivated options separately.

The initial `V4-S4` plan contains only its activated twins, today's controls and Master rows. It contains no
`shipped-uncapped` row. Its comparator template contains exactly that initial collection's comparator cells and
reps; it contains neither unactivated optional cells nor second-validation reps. Resolve it only against that
collection's bound final selection.

Distinguish a collection still in progress from one explicitly closed at its recorded ceiling. A closed,
incomplete screen collection may receive the plan's inconclusive/no-screen disposition; do not make an interim
report final, and do not invent missing observations. The shipped arm and all final gates still need their own
required evidence. Record the closure and missing observations in the selection receipt.

Keep second validation as a non-executable template until N-V4-04 supplies the adoption, affected cells,
configuration identities and fresh cohort. N-V4-04 must then produce its own concrete validation, final
selection, comparator and final-verdict sequence, including the applicable live/parity bindings and explicit
handling of unchanged-cell evidence. Do not execute second-cohort controls using the first cohort's selection.
No executable argv may name `shipped-uncapped`.

Use disjoint task/state namespaces for initial and second validation and their comparator collections.
Do not change a receipted configuration in place or relabel its observations as the new configuration.

Tests: default initial validation without optional boards resolves without asking for them or for any
replicate-40-to-59 row; an activated conditional board is included in both twins and its own comparator;
an initial selection cannot resolve a second-validation template; a closed ceiling outcome is distinct from an
interim selection; every generated executable plan has only real variant IDs and complete producer dependencies.

### R3-05: simulate the cut, not an imaginary reserve timeout

An item reserve controls admission only. For process, custom and lane items, simulate the actual absolute
`horizonS - cutMarginS` cutoff. An item whose projected finish exceeds it is censored at the cut, not reported as
completed beyond it. Follow the runner's drain/cleanup and stop rules and report predicted completed/censored
items separately. Preserve the valid nominal examples already added.

Compute a hard counted-time ceiling from real enforced bounds. Do not substitute `reserveS` for duration.
A conservative bound may use at most 300 node seconds plus 45 counted quiet seconds per possible invocation;
state the invocation bound and cleanup assumptions. Report the task's separately enforced guard as a budget,
not as a promise that all observations will complete.

Tests: one process item projected at 200 seconds with reserve 120 has a 247-second counted projection, so its
claimed hard ceiling cannot be 167 seconds; two sequential 120-second items still fit; a second item projected
to finish after the cut is censored, not a successful over-horizon observation.

Stage-5 aggregate hours are not one runnable process item. Price them from an enumerated bounded schedule of the
actual measurement units; if that schedule is deferred to N-V4-04, mark its execution/ceiling unpriced and route
its approval to that later manifest. Do not present an unbounded aggregate as a hard-bounded one-invocation item.
Recalculate the manifest's prices and dry-run expectations from the corrected schedules.

### R3-06: bind proofs to independent expectations

Add `harnessHash` to the expected receipt binding and compare it. Bind each proof to the producer/recipe identity
that is expected for its measurement epoch; do not replace a historical producer hash with today's hash.
Missing or mismatched bindings are incomplete evidence.

At acceptance of stage 1, write an immutable accepted binding under
`docs/improve-generating/evidence/frozen/V4-T04/accepted-binding.json`: the accepted receipt path/hash, source,
producer hash, observed arm/tree/parameter identities and the independently declared coverage of the versioned
manifests, identity seeds, certificate and self-test groups. Capture any mutable tree metadata needed later as
immutable evidence there. Later consumers use that binding, not empty arm expectations or the receipt's own
coverage as the definition of what was required.

For class-selection, bind the recipe/manifest, freeze/activation/closure record and all journal inputs that
contribute to the decision, as well as the runs files. An immutable input index containing those paths/hashes
may be used; changing any indexed input invalidates the proof. Keep historical input artifacts immutable, rather
than pointing their proof at a tree metadata file that a later build overwrites.

Tests: a correct kind/source/tree with the wrong producer hash is refused; a self-declared empty/short stage-1
coverage cannot satisfy the accepted binding; a changed journal or recipe invalidates a class selection; an
unchanged historical stage-1 proof still validates after unrelated later harness development.

### R3-07: close the linkage interfaces

In the copied Node worker adapter, capture the worker's PID/thread ID and row/log destination before requesting
termination. Emit the confirmed worker-end event only when its termination promise fulfills, with the confirmed
end timestamp. A request/rejection may be logged separately, but cannot masquerade as confirmed termination.
Match closure with the captured worker identity. This is bookkeeping, not permission to count unreported work
as complete; apply the Q-RV3-01 ruling separately.

Completion calls need an identity, not only a cardinality. Use the layout key, already computed in
`generate.completionCandidate`, as their `igAttempt`; record the same key with the parent completion dispatch
and completion outcome (compute it from the known layout/set in the copied client). Require every returned
selection outcome to match its own ended call. Include owned completed speculative calls in the sum, but do
not let one substitute for another task's missing journal. Preserve explicit exemptions for outcomes that ran
no selection.

Test two returned completion tasks with one missing call plus a different completed speculative call: the
ledger must be incomplete even though the counts are equal. Also test a termination request preceding a late
worker start: it is not an end; a confirmed end after that start can establish the lifecycle outcome.

Change the timeline signature to `timelineProblem(run, linkLines)` and pass the row's actual link lines at
every call site. The no-set/no-batch check must read that input. Add an otherwise valid no-set row with a batch
start: it is not a valid no-set timeline; the same row with no batch start remains valid.

### R3-08: evidence completeness precedes equality

For a Master row with a positive accepted count, require `run.details.igPuzzleKeys` to be an array representing
every accepted puzzle (`length === acceptedCount`), each entry a distinct 64-character lowercase SHA-256 hex
string, as `variants/instr.json` writes it. Missing/malformed/short key evidence is incomplete, not equal.
A valid zero-accepted row represents an empty puzzle list; never apply that normalization to a positive count.
Compare the complete ordered arrays and the counts only after this check. Do not require a timing gate or
change the allowed completion outcomes.

For the matched-set clue statistic, require complete accepted-puzzle clue data on both served rows:
`details.K` is a positive integer and `details.puzzles` is an array of `acceptedCount` entries, each with a
finite integer `clues` from 0 to `details.K`.
Do not subtract null/undefined medians. A population-evidence problem makes the class's statistical proof
inconclusive; retain completion outcomes in their separate record instead of fabricating clue data or quietly
dropping the problematic pair.

Update the positive synthetic helpers to supply complete per-puzzle arrays. Add cases with ten accepted but
empty/missing identity keys, empty clue populations and a short clue population. The identity cases cannot pass
Master; the clue cases cannot admit a screen class. Complete valid arrays retain the intended results.

## Supervisor question

### Q-RV3-01

**Addressee:** SA-Fable, through the orchestrator. Obtain owner confirmation if the ruling changes a recorded
owner acceptance decision. The decision is not made by this review.

**Positions:** SA-Opus proposes D-V4-17; SA-Astra keeps the strict rule for the reasons and counterexample above.
The source facts supporting the proposal are accepted. The disagreement is whether that observable prefix is
sufficient for the plan's work acceptance condition.

**Question (verbatim text to relay):**

Which work acceptance rule should bind plan §5.2 when a worker is killed inside a primitive?

- **(a) Keep the strict rule.** Unaccounted interrupted work makes the work condition unknown; report completed
  units separately. This preserves the non-worsening assurance, but routine cancellation may leave screen classes
  inconclusive, using the existing no-screen fallback.
- **(b) Authorize D-V4-17.** Compare only reported completed-primitive units and report terminated calls. The current
  hooks can supply this metric, but it does not prove that all consumed selection-work units per accepted puzzle
  are non-worsening. State that intended acceptance quantity explicitly in the plan.
- **(c) Preserve the assurance through additional accounting or proven bounds.** Admit only when the accounted
  totals or conservative bounds establish non-worsening. That mechanism is not specified in this pack; it needs
  concrete tasks and any revised measurement price before validation.

**Blocked pending the answer:** D-V4-17 and the affected work-ledger/admission contract; final acceptance of the
task pack. No option is adopted for the supervisor or owner.

## Other checks

- The plan/drift traceability covers the named work, including the later public provenance/Generation steps,
  EN/VI text, cache, offers, browser and release work. The proposed measurements are not new public offers.
- T12's independent phase-1 authority is unchanged; its fixture, observer, stored-rating and history safeguards
  remain. T13 pins existing presentation/history behaviour rather than silently changing it.
- The declared tasks are serial, each at most three developer hours; their estimate sums to 76 hours.
  Re-estimate/split changed compiler/ledger work after these corrections rather than exceeding that per-task size.
- The helper supports the prescribed dot-sourced `Invoke-IgNode`, argument arrays and 300-second ceiling.
  The 92-minute stage-1 allowance remains a request, not approval. Later cumulative approvals remain owner stops.
- The author's pure statistics examples agree with the intended arithmetic (including the 15-matched-set example
  reaching the completion condition after passing faster/work). The four small counterexamples in this review
  are contract checks, not new measured results.

## Completion note

Verified: all 29 reviewed pack inputs retain the recorded digest; the plan and production source digests are unchanged. This persisted review has CRLF line endings, UTF-8 without BOM, no trailing whitespace, no embedded control characters and a final newline. Its 45 prior-finding dispositions and 9 new findings match the stated counts. No timed run was performed.

Verdict: changes required
