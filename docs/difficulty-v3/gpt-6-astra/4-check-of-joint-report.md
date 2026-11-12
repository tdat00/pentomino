# SA2 check of the joint Pentomino draft

SA2, gpt-6-astra; 2026-11-12. Checked `docs/difficulty-v3/report-detailed.md`
(RES-01..RES-33, MP01..MP17 plus MP04b) against HEAD `77e62cb`, both response files and the
current clarification status table. This is a technical co-sign subject to **13 required changes**
JC01-JC13 below, not approval of unresolved owner choices.

The lead author applies changes. I did not edit the joint draft, plan, clarification file or task pack.
The owner's pause is observed: no Sudoku task-pack file was created or reviewed in this phase.
No quick set, heavy gate or browser test was run.

## 0. Verdict

The draft is substantially aligned with the two analysts' agreed positions. I accept its numbered task
structure, the separate dialog and final-evidence tasks, and removal of the compact-codec task now
that summary codes are the agreed choice.

The most important required corrections are:

- The quotient solution identity loses piece boundaries: a map from cell to shape class is not a
  tiling identity when a shape has multiple copies.
- Capped-path and incomplete-census outcomes are still conflated, and published metrics lose some
  of the separate statuses the report promises.
- Rounding information before scoring is a new, unnecessary semantic change, not required for JSON
  round trips.
- GL-P3 has been reduced to the baseline slice, dropping the full landscape required by the plan.
- Provenance skips need exact counter/consumption rules and a real byte bound; the "one skip per
  excluded key" reasoning is false for supported inputs and repairs.
- Replay has no defined route for the per-guess details it promises to display, and the existing
  single-request worker pool cannot simply begin an unrelated replay request without superseding work.

## 1. Evidence from this check

### 1.1 Bounded read-only probes

All probes ran in memory and completed promptly; no repository artifacts were written.

| Probe | Result |
|---|---|
| `level('hell-1899')` | The lower edge is finite; the upper edge is Infinity. `levelAt` checks only the lower edge (`core/engine/levels.js:53-66`). |
| `createRng('seed','order/0')` versus `createRng('seed','order/1')` | Different streams. RES-12's two-argument API is correct (`core/engine/rng.js:142-151`); no correction is requested there. |
| `buildLandscapeMatrix()` | **105 cases on 16 boards**, including `18x20`, `20x20`, `20x21`, `32x15`, `22x22`, `24x24`, `26x26`. This was matrix construction, not a calibration run. |
| Two identical dominoes on `##/##` | Four labelled DLX solutions, **two distinct placement multisets**, but one cell-to-shape-class map and one existing `layoutKey`. |
| Three identical dominoes on `###/###` | Eighteen labelled DLX solutions, **three distinct placement multisets**, but one cell-to-shape-class map. The partitions are `0,1|2,5|3,4`, `0,3|1,2|4,5`, `0,3|1,4|2,5`. |
| Two identical dominoes on `##.##` | Two labelled solutions but one placement multiset. The identity-only choice must not become a quotient guess. |
| The two different one-domino clue subsets of the first examples | Equal `clueKey` despite different raw subset indices. |
| `Math.log2(3)` through JSON stringify/parse | Exactly the same JavaScript number, `1.584962500721156`; six-decimal rounding changes it to `1.584963`. |

The quotient probes used `buildModel`, the existing exact-cover solver and `rowPose`; all tiny searches
exhausted. Their quotient key was a sorted multiset of piece footprints, not the existing
symmetry-aware `layoutKey`. The latter intentionally encodes shape ranks per cell
(`core/engine/keys.js:320-345`) and is not suitable for this new counting contract.

### 1.2 Source/API rechecks

The model fields, workspace map, liveness guard, RNG signature, rating task, current protocol
behaviour, pack claim bounds and principal test filenames are correctly identified. In particular:

- `arena.cellColumn` exists (`core/engine/workspace.js:49,269-283`).
- `assertLive` exists and checks the workspace's current model (`core/engine/tiling.js:77-83`).
- The two rating calls inside clue selection are distinct: subset rating at
  `core/engine/clues.js:216` and repaired rating at `:241`.
- `createGenerationClient.cancel()` invokes `pool.cancelAll()`
  (`core/browser/generation-client.js:1190-1196`).
- `worker-pool.beginRequest` aborts all prior entries as superseded, while a task's AbortSignal
  cancels only that task (`core/browser/worker-pool.js:556-563,575-610`).
- The puzzle card is an `li` with select and remove buttons inside it, not itself a button
  (`generator/ui/puzzle-panel.js:293-296`).

## 2. Every resolution checked

“Agree” includes retaining an explicitly pending owner choice; it does not select that choice.
Required-change references identify the exact correction below.

| Resolution | Position | Comment |
|---|---|---|
| RES-01 | required change — JC12 | Keep purity, deterministic bounds, frozen historical material and serial validation. Make the orchestrator's commit ownership explicit and distinguish signed release policy from provisional fit values. |
| RES-02 | agree | Exposed fields, canonical mapping and liveness are correct. `pieceSizes` is plan-owned rather than an arena view, which is fine; document each field's lifetime. |
| RES-03 | required change — JC03/JC04 | Reversible labelled core and ladder are sound. Quotient semantics cannot be just a post-processing count; provide a testable first-solution witness. |
| RES-04 | required change — JC02/JC04 | Separate path/count/work states are right. A count cutoff after a complete path is not a completed census, and the selected incomplete cases need distinct contracts. |
| RES-05 | required change — JC02 | Raw and upper-estimate census branches are legitimate pending choices. B' cannot simply inherit the before-first-solution policy; branch C needs the S<=1 case. |
| RES-06 | agree, subject to JC03 for quotient state | Correct conservative R3, piece/cell-only R4/R5, no nested R6, and final-path attribution. |
| RES-07 | agree, subject to JC03 for quotient state | Optional-piece parity DP, real residual components and the corrected R9 precondition are sound. |
| RES-08 | agree | Deduction tier drives the rule term; selected-model guesses are separate. Specify zero-valued aggregate cases through JC04. |
| RES-09 | required change — JC03 | Cell-to-shape-class maps collapse genuinely different partitions; the current branch B is not an executable correct quotient contract. |
| RES-10 | required change — JC04/JC12 | Deterministic work/memory limits are necessary. Include construction/census/replay accounting and make provisional values explicitly nonbinding before fit approval. |
| RES-11 | required change — JC03/JC04 | Good tiny-board all-solutions oracle and characterization tests. The first path needs observable owned selected rows; add the quotient partition regressions. |
| RES-12 | agree, subject to JC07 | RNG API and separate tie-order study are correct. Matching regenerated requests need identity verification, not an assumption. |
| RES-13 | agree | One canonical production order; report noise, no automatic median. The completed/no-learning premises remain important. |
| RES-14 | required change — JC07/JC12 | Initial fit before activation and a matched v2 baseline are correct. Initial production constants must not precede their pending range approval. |
| RES-15 | required change — JC06 | Centre, reserve, memoized raw-ranked repairs and repaired-key checks are agreed. The finite-maximum assertion is false; clarify incomplete repair handling. |
| RES-16 | agree | Uniform sampling; no unproved reversed weighting. |
| RES-17 | required change — JC06 | Correct generation-version bump and test list; add nonfinite-maximum and incomplete-repair regressions. |
| RES-18 | required change — JC04/JC05 | Correct formula direction and forced bound, provided G=0 implies info=0. Remove unapproved pre-scoring quantization. |
| RES-19 | required change — JC02/JC04/JC09 | One live model and retained DLX diagnostics are right. Keep declared statuses and provide recorder detail without a second hidden solve. |
| RES-20 | agree | Discriminated types, optional claim metrics and no v3 result-whitelist change are correct. Add fields finalized by JC04. |
| RES-21 | required change — JC04 | Optional metrics with strict present-field validation and old-reader bounds are right. Align schema with the complete status contract and meaningful boundary tests. |
| RES-22 | agree, subject to JC09's available-data wording | Summary codes/full computed pack metrics, retained v2 goldens and no compact codec are agreed. A summary alone cannot supply replay terms or origin. |
| RES-23 | required change — JC10/JC12 | Derived display, unchanged stored claims, notes and stale-result checks are right. JR-P1 remains pending; request isolation needs an actual client contract. |
| RES-24 | agree | Pinned tests and historical fixture treatment are substantially correct; do not overwrite old-code compatibility evidence. |
| RES-25 | required change — JC07/JC12 | Lock before P4 is agreed. The final gate must not silently become only the reduced baseline slice. |
| RES-26 | required change — JC04/JC05 | Test valid metric tuples, not independent G/info combinations; remove the new quantization assertion unless expressly selected. |
| RES-27 | required change — JC08/JC11 | Compatible location and creation-time origins are correct. Skip bounds, import/byte handling and calibration-stage availability need precise contracts. |
| RES-28 | required change — JC08/JC09 | Owned observer events and identical production outcomes are right. Repair rejection timing and diagnostic/selection-event data flow are missing. |
| RES-29 | required change — JC10/JC11 | Two workspaces, preflight and exact comparison are correct. Define work/cancellation bounds, isolated scheduling and comparison of a stored final solution. |
| RES-30 | required change — JC09/JC11 | Breakdown and two views are right, but promised alternatives/census data are not currently present in recorded ratings. Incomplete replay must not imply a verified final match. |
| RES-31 | required change — JC10/JC11/JC13 | Accessibility and playback cleanup are right; correct the button parent, cancellation route and incomplete/mismatch UI tests. |
| RES-32 | required change — JC12 | Living docs must accompany early solver implementation, not first be documented at MP06. Add the source files affected by detail/scheduling corrections. |
| RES-33 | agree | The exclusions match the latest agreed scope. Quotient work remains conditional; no implicit reintroduction of weighted sampling or compact codecs. |

## 3. Required changes

### JC01 — Remove obsolete numerical claims from the findings

**Locations:** summary item 4 and section 2.4.

The paragraph saying the Easy examples rate 17 under raw G and 3 under decisive G was produced
with the old guess-dependent rule bonus. It must not be presented as evidence under the now-agreed
deduction-tier formula. SA1's own response corrects that rule attribution; the Normal recipe correction
is already applied elsewhere.

Replace the affected paragraph with:

> The partial probes establish large alternative counts and free-choice inflation, not final v3
> coefficients. Their earlier 17/3 Easy comparison used the superseded guess-dependent rule term
> and is not a prediction under RES-18. Recompute that comparison with final-path deduction-tier
> attribution in MP06. Recipe alternatives include 2, 3 and larger counts; some measured nodes have
> as many as 28 alternatives. The corrected recipe scores are 5, 6, 9, 40, 68, 106 for the stated
> partial solver, not a full-ladder upper bound.

No new full probe is required for this editorial correction.

### JC02 — Separate path failure, count incompleteness and census incompleteness

**Locations:** RES-04/RES-05/RES-19 and their pending tables.

The phrase “a capped count after a complete path is a complete measurement” is true of the raw
first-path statistics only. It is not true of a decisive census. Branch B' currently delegates an
incomplete census to a rule whose definition requires a missing first solution; the resulting `path`,
`saturated` and public note are inconsistent.

Use the following contract:

> Path completion, count exhaustion and census completion are independent. `first` is non-null
> only for a completed solution path. A capped prefix, if the owner selects that estimate, is stored
> separately as `prefix`, never in a falsely completed `FirstPath`.
>
> Raw branch A can be scored from a complete first path while the count remains bounded/unknown.
> Decisive branch B with u>0 is explicitly a **decisive upper estimate** using kLow, not the completed
> decisive measure. It has `path:'complete'`, `censusComplete:false`, and its chosen estimate status
> and UI explanation are part of SA1-Q-P1, independent of the before-first-path `+` policy.
>
> Branch B' requires complete census evidence for an ordinary decisive rating. If incomplete, either
> return unrateable or publish an explicitly selected interval/estimate variant; specify that choice
> under SA1-Q-P1 rather than automatically applying a “current DFS prefix” policy. Do not lose the
> completed first-path evidence when the census is incomplete.
>
> Branch C's logarithmic penalty is zero for S<=1/unknown and otherwise
> `weights.info * log2(min(S,8))`. In particular a capped prefix with S=0 cannot compute log2(0).

RES-18's breakdown must then use the selected penalty branch; it cannot always apply the fixed
few/many table when branch C was selected.

Also qualify “on a unique puzzle the count exhausts”: only a unique puzzle **whose count completed
within the bounds** establishes u=0 without further work. A cap cannot prove uniqueness.

For the optional low-level rejection/high-level proxy policy, use the **requested target band** in
`selectClues`; a pure `rate()` call has no requested level. Specify whether skipped capped outcomes
are neutral for steering. Catch `IncompleteRatingError` both at subset rating and at the repaired
rating (`core/engine/clues.js:216,241`); a failed repair is memoized and falls through, not a batch
abort. Keep cancellation and unexpected faults distinct. The owner's path/census choices remain open.

### JC03 — Correct the quotient solution and guess semantics

**Locations:** RES-03/RES-06/RES-09/RES-11; MP04b.

Replace “S counts distinct maps from cell to shape class” with:

> S counts distinct **multisets of geometric placements**, each represented by
> `(shapeGroup, sorted occupied board-cell indices)`. Sort these records to form a solution key.
> Piece-copy IDs are omitted; piece boundaries are retained. Whole-board symmetries are not newly
> quotiented unless the owner explicitly adds that separate policy. Do not use the existing
> `layoutKey`, which is not this equivalence relation.

Add:

> Quotient guessing is a multiplicity-aware decision process, not merely deduplication of completed
> labelled solutions. Alternatives differing only by free-copy ID count once. A one-orbit choice is
> not a guess. Shape-group remaining multiplicities/capacity constraints must replace or correctly
> simulate one-copy piece-column semantics; ordinary R4/R5 single-piece reasoning cannot simply be
> asserted to apply unchanged to a capacity greater than one.
>
> Any symmetry-breaking implementation must preserve at least one representative of every placement
> multiset independently of MRV visitation order. Do not require rows to be visited in increasing
> first-cell order, which can discard a valid partition when MRV visits a later footprint first.
> Assign canonical copy labels to the resulting placements for returned poses. Raw DLX certificates
> remain unchanged. Branch C must still obtain raw S separately or by a proved multiplicity formula.

Identity-only symmetry breaking is bookkeeping, not an R1-R9 elimination credited as human work.
Keep the labelled-rule soundness test and the quotient's orbit-preservation test distinct: an intentional
copy-label canonicalization need not preserve every labelled row, but must preserve every geometric partition.

Required tests: 2x2 dominoes give raw S=4/quotient S=2; 3x2 dominoes give 18/3; separated domino pockets
give 2/1 and no identity-only quotient guess. Compare every tiny raw solution mapped to the new key,
including renamed/reordered copies and clues. This does not authorize changing existing layout/clue
keys elsewhere in the applications.

### JC04 — Finish the metric domain, status serialization and witness contract

**Locations:** RES-03/RES-04/RES-10/RES-18/RES-19/RES-21/RES-26.

Add an owned `FirstPath.selectedRows:number[]` (or an equally explicit test-only first-layout result).
The current DTO has no selected rows/layout, so RES-11 cannot verify its first path with `isValidLayout`.
Keep this bounded internal detail out of serialized rating metrics.

Specify the valid score-input domain:

> G=0 implies info=0, Cmax=0 and no counted-guess depth. For G>0, info is the selected model's
> information aggregate and Cmax is defined over its counted nodes. A maximum over no nodes is zero,
> not undefined or negative Infinity. The forced-score theorem applies to these valid tuples, not
> to an arbitrary independent grid containing G=0 and info>0.

Retain in `MetricsV3`, with strict enums/types, at least the search stop, count limit/exhaustion and
census completion information needed to distinguish the declared states. The present table drops
`search.stop` and `count.exhausted` even though RES-04 promises them. Define whether `nodes/work`
include census probes; if separate, add `censusNodes/censusWork` and report the total. Count transpose
construction and other setup scans too, not only recursive nodes.

All temporary deduction/census buffers must be included in the workspace or an explicit accounted
memory ledger; an optional untracked allocation path must not evade the worker's memory accounting.
Check peak live allocations, including growth/replacement, before allocating.

The chosen Dmax placement-depth definition is explicit and can be retained as a diagnostic, but label
it as **placement depth before the deepest counted guess**, not ordinary guess nesting depth.
Do not later assert it equals G under that definition.

Tests: valid/invalid cross-field tuples; G=0/info=0 bound; count cutoff after a complete path;
separate census cutoff; owned first-layout validation and buffer accounting. For the 4,096/4,097-byte
boundary, use an applicable opaque legacy/foreign-claim fixture and test the largest legal strict-v3
metrics separately. Do not add a padding field to the strict v3 schema merely to make a size test.

### JC05 — Do not quantize information before scoring without a decision

**Locations:** RES-18/RES-19/RES-26.

Replace the six-decimal pre-scoring rule with:

> Store and score the full finite JavaScript information aggregate. JSON number stringify/parse
> preserves that Number value. Round only the final score; formatting the displayed information
> to six decimals is presentation, not input to `scoreV3`. Test JSON round-trip reconstruction of
> computed ratings, including values near a score-rounding boundary.

The bounded probe above demonstrates lossless JSON round trip of log2(3). Quantization can move a
score near a half-integer and was not an agreed model decision. If the author wants a quantized model
for another reason, mark its precision/rounding order PENDING and include it in calibration; do not
justify it as necessary for serialization.

### JC06 — Handle nonfinite band maxima explicitly in centre selection

**Locations:** RES-15/RES-17.

Delete “Every generated level has a finite band maximum”. The public level API accepts a finite
minimum with an infinite maximum; the read-only example is `hell-1899`.

Use:

> For a finite maximum use the stated real centre, central-half window and reserve rule. For a
> nonfinite maximum, do not compute centre distance or compare Infinity-Infinity: return the first
> eligible in-band result whose memoized finish succeeds. In require mode continue after a failed
> repair. Preserve that policy in the tests and use an explicit null/omitted upper bound in JSON
> recorder data where necessary.

Add a direct `selectClues` regression with an unbounded target; it need not generate an astronomical
Hell level. Include an incomplete repaired rating under JC02 and ensure it neither aborts the search
nor consumes an ordinary subset profile a second time.

### JC07 — Restore the full final calibration gate and verify regenerated identities

**Locations:** RES-12/RES-14/RES-25; GV2/GL-P3, MP06/MP11/MP12.

The reduced four-board baseline is useful, but GL-P3 currently says only to repeat that slice.
The owner's full-plan scope did not remove the plan's full landscape gate.

Replace the GL-P3 scope with:

> Run the matched reduced GV2 slice first, then the full current landscape matrix as bounded shards.
> At HEAD this is 105 cases on 16 boards and 20 repetitions per case. Record all case IDs, coverage,
> incomplete/capped/partial outcomes and time. The matched Hard/Expert hit comparison uses its actual
> v2 baseline; cells without a v2 comparison are not invented as baseline successes. Preserve the
> full-matrix evidence even if availability is poor.

For “matching requests regenerated exactly”:

> Retain the complete request recipe and verify the regenerated result against the saved digest or
> explicit layout/clue keys before calling it the same measured puzzle. The runner already records
> `resultDigest` (`tools/bench/runner.js:695-701`) and derives seeds with `seedFor` (`:94`).
> Preserve board rows, rotation, quantity 10, calibration candidate, batchIndex 1, uniqueness,
> seed and relevant execution limits. A different outcome near a deadline is a mismatch/partial
> observation, not silently substituted evidence. Persist enough accepted-puzzle data when exact
> regeneration cannot be established.

RES-12's diagnostic RNG call is valid; no change to `createRng(seed,label)` is needed.

### JC08 — Specify replay skips by actual execution and bound their bytes

**Locations:** RES-27/RES-28; AUTH-P1; MP13/MP14.

Remove the general “one skip per excluded key / at most 99” justification. Different subsets can
share a symmetry-aware clue key on supported repeated-shape inputs, and different repairs can
converge on the same excluded final clue key. The probes above demonstrate the first case.

Required replacement contract:

> Define whether each ordinal counts every function entry or only an eligible operation; use that
> exact definition in recording, replay and validation. A subset exclusion is replayed after the
> same tried/budget checks and `tried.add`, before rating. A repaired-result exclusion is replayed
> **after** executing the same repair, rating and RNG draws, not by skipping the repair itself.
> Memoized finishes do not receive a new execution ordinal.
>
> Require sorted unique bounded ordinals and exact consumption of every recorded skip. Unexpected,
> unreachable or unused entries make the provenance invalid/mismatched, not silently ignored.
> Derive bounds from the actual loop/call limits and test them, not from excluded-key cardinality.
>
> Bound total provenance bytes within the existing pack limit, including all puzzles and set origin.
> Bounded integer-list lengths alone do not prove that a 100-puzzle pack fits. Use compact bitsets
> or an explicit supported overflow/unavailable form selected under AUTH-P1; never promise “no
> overflow state” without a complete byte bound. Do not raise the existing pack limit implicitly.

Keep unknown optional provenance ignorable with a clear warning, while the actual puzzle remains
usable. Test duplicate-shape aliases, repaired exclusions, memoization, malformed ordinals, near-limit
packs and reload/export. AUTH-P1 must enumerate these real format branches; switching back to a
per-puzzle wire field is not the only possible alternative to this particular ordinal schema.

### JC09 — Add the missing recorder detail channel and selection-event meaning

**Locations:** RES-19/RES-28/RES-30; MP14 ownership.

`measureV3` currently returns aggregate metrics only; recorder events carry only `rating`. Therefore
the replay cannot display the promised per-node alternatives/census from those events.

Add:

> Provide an optional detail observer or internal `rateDetailed` path that exposes the owned
> `DeductionResult` from the **same measurement** used to build the rating. Pass it through set
> calibration, ordinary clue ratings and uniqueness-repair ratings when recording is enabled.
> Production `rate()` and stored claims remain aggregate-only. No second hidden deduction solve
> is assumed. The recorder owns/copies retained detail before any workspace reuse.

Add `core/engine/difficulty.js` and any required detail typedef to MP14's owned files.
Define a rated event as observed/eligible, not already selected; emit a separate selection event
referring to its sequence (and repaired result) once the winner is known. A later winner must not
require mutating a previously delivered supposedly owned event.

A summary claim can show its total, but it does not contain a breakdown or generation provenance.
Unavailable tables/stages must be labelled unavailable; do not synthesize missing inputs as zero.
Test complete final-path detail, repair detail and recorder-off/on equality.

### JC10 — Implement real request isolation for display rating and replay

**Locations:** RES-23/RES-29/RES-31; MP10/MP15 ownership.

The desired cancellation behaviour is correct, but “runs in the existing pool” is not a sufficient
implementation contract. `beginRequest` supersedes every previous entry, and
`generationClient.cancel()` cancels the entire pool.

Add:

> Auxiliary display/replay work must not call `beginRequest` or `cancelAll` on an actively generating
> request. Use a controller-owned auxiliary dispatcher that either queues until the generation
> request has ended and submits an idle task under its valid token, or uses a separately budgeted
> one-worker pool instance. The chosen implementation is specified before MP10/MP15 dispatch.
> Cancellation uses that task's AbortSignal or the isolated pool, never the generation client's
> global cancel method. New generation may supersede/queue replay; starting or closing replay
> must not cancel generation, verification, hints or unrelated certificates.

If reusing the existing instance, add an explicit generation-client auxiliary method: external UI code
cannot invent its private requestId/revision. If using a separate instance, include its memory budget,
creation/disposal and no-worker fallback. Own the relevant client module in the task table.
Tests must have overlapping work, not only an idle replay closed after generation has finished.

This is a technical scheduling choice needed to satisfy the already agreed behaviour; it must not be
left for a developer to discover through cancellation regressions.

### JC11 — Complete replay bounds, stage availability and final comparison

**Locations:** RES-27/RES-29/RES-30/RES-31.

Step/byte limits bound retained output, not computation before the next event. Add a total replay
work/cancellation guard across set regeneration, all ratings/repairs and any census probes. Numeric
values can be provisional and measured, but a counted work boundary must exist; a cap returns
`incomplete`, never `matched`.

Replace the final-match contract with:

> Compare the actual board, per-piece geometry/mapping and clue poses; compare a stored complete
> puzzle solution when one is present, in addition to the set witness and scoring inputs. When the
> stored solution is omitted, state exactly which observable fields were matched rather than
> claiming verification of unavailable original data. A partial trace has not passed final match.

Clarify calibration availability. “Stages 4-6 iff kind=candidate” and “calibration puzzles replay
from the set origin” do not yet say where the calibration clue/repair trace belongs. Use:

> For kind=calibration, matching set-origin replay may expose its actual calibration clue/repair
> events, labelled calibration; no invented retile stage. A completion record exposes only the
> available set stages and final puzzle as already agreed.

Test total-work exhaustion before many events, byte/step caps, cancellation, stored-solution mismatch,
calibration reuse, missing-solution comparison and partial-result UI. Show explicit incomplete/mismatch
status and never let compact playback imply the partial endpoint is the verified generated result.

### JC12 — Align dispatch dependencies, pending decisions and commit ownership

**Locations:** RES-01/RES-14/RES-18/RES-32; task/gate tables and open-item table.

- Replace developer-commit language with the latest owner's protocol: developers do not stage,
  commit, stash, reset, push or switch branches. The orchestrator rechecks, reviews, records and
  commits each accepted task on `rating-v3`; nothing is pushed.
- MP06 may explore proposed knobs before answers, but writing/activating selected production values
  must wait for JR-P3 and the applicable SA2-Q-P09 ranges. Those answers cannot first become
  prerequisites only at MP12, after earlier tasks activated a fit using them.
- Mark JR-P1/JR-P2/JR-P3 explicitly PENDING at their affected resolutions and include them in the
  unified pending table. The JR-P3 range 8..12 is a proposed relaxation of the default base maximum
  12, not simultaneously an immutable “final 12” rule.
- MP01-MP04 can proceed without the public saturation/model answer only as non-production model/
  labelled measurement implementation. Do not resolve SA2-Q-P02 or the selected guess model inside
  those unblocked tasks. Provisional work/memory values are test/prototype defaults until approved
  fitting, not silently final policy.
- Add living documentation ownership to early model/rule tasks as their APIs/behaviour land, not only
  a first documentation entry at MP06. Include JC09/JC10's additional client/measurement files.
- The task index has 17 numbered rows plus optional MP04b; MP05 itself has a raw-check or census
  branch. Correct the misleading count of “17 plus two” independent additional tasks.
- Use Windows separators in executable commands; qualify shorthand source paths in report citations.

These are dispatch/document corrections, not permission to change unresolved choices.

### JC13 — Put the replay button inside the existing card list item

**Location:** RES-31 and erratum E39.

Replace “sibling of the puzzle card, which is itself a button” with:

> `createCard` builds `li.puzzle-card` containing `button.card-select` and `button.card-remove`.
> Add the replay button as a **third sibling button inside that same li**, not nested inside the
> select button and not inserted as an invalid direct button child of the list. Preserve selection,
> removal, focus return and keyboard ordering.

Evidence: `generator/ui/puzzle-panel.js:293-296`. Add a DOM/a11y assertion of this exact nesting.

## 4. Task structure and remaining choices

I accept MP01-MP17 plus conditional MP04b as the reconciled structure, with JC12's dependency/file
corrections. In particular:

- MP03/MP04 split local and spatial rules; MP05 follows the full selected rule/multiplicity contract.
- Keeping MP16 dialog and MP17 final evidence separate is sensible and I accept it.
- Dropping the optional compact-codec task is correct now that summary-code claims are agreed.
- The initial fit/activation/final calibration lock precede P4; final evidence must not quietly refit.
- Full calibration coverage and exact regeneration checks are required by JC07.
- Public before-first-path policy, decisive estimate policy, duplicate semantics and calibration
  freedoms remain author/owner choices. A co-signature does not choose them.

Positions on the three new author questions:

| Question | SA2 position |
|---|---|
| JR-P1 | Prefer v2-only as the plan's default; v1 inclusion is a reasonable explicit scope extension. No-claim rating is a separate new display branch, not implied by legacy re-rating. |
| JR-P2 | Prefer immutable `generation.setOrigin`; agree with keeping old restamped metadata distinct. The alternative existing-key plus immutable setVersions form can work if precisely specified. |
| JR-P3 | Preserve the forced invariant and approve ranges before selecting production values. The proposed ranges are candidate experimental ranges, not empirical findings or already approved policy. |

## 5. Sign-off

The agreed direction, major decomposition and corrected rule catalogue are sound. The required changes
above remove concrete counterexamples, missing data paths and execution-contract gaps. Policy branches
remain pending their existing clarification process.

**signed subject to the listed changes**
