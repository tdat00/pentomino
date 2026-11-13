# Pentomino difficulty-v3: cross-check of the resume revision

SA2 / Astra (gpt-6-astra), 2026-11-13. Review for the orchestrator and SA1 / Opus.

## Scope and method

Reviewed the uncommitted resume pack against Fable's complete PR-P1 answer at `55c0c61` and the implementation
at that HEAD. Scope: checklist P-OD9/D20/D29/D35-D41; MP12b1's Hell population; MP12b2 in full; the new MP12b3 in
full; MP15a1 in full; both clarification files; the MP12a closing addendum and Opus's resume analysis where they
define the handoff.

Read-only Git, source, task and record inspection; file-only comparison of archived PR-P1 and a file-only source
digest calculation. No tests, generation, benchmark, qualification or timing run; no staging, commit or ref action.
Only this report is written. Other working-tree changes, including the concurrent MP12a closing record/design work,
belong to their owners and were not edited.

Line numbers in findings are those of the reviewed task files. Source citations refer to the unchanged implementation
at `55c0c61`. There are **0 Blocking, 4 Major and 1 Minor findings**. These are task-contract repairs, not a request
to reopen P-OD9; the MP12a close and MP12b1 measurement need no new design decision from this review.

## 1. Confirmed contracts

| Area | Result |
|---|---|
| PR-P1 and P-OD9 | The question, Fable's answer and all its bullets/table rows are preserved verbatim in `clarifications-resolved.md`. The only textual difference in the moved block is heading depth: `## PR-P1` became `### PR-P1` under Part I. The ID/title/content are unchanged. Part H's P-OD9 row accurately records (i), reduced Hell work and the stop/review rules. |
| D20 | Still open for the owner. Fable's recommendation is not represented as an owner's answer; the Player sample and v1 goldens stay unchanged. |
| D36/D37 | Decision (i) is applied, not asked again. MP12b1 keeps all 25 three-request prescreens and promotes only a prescreen that accepted a puzzle to 20 requests. No zero-result boundary case is promoted. Prescreens and their 20-request replacements are not counted together. |
| Tuple | `core/engine/policy.js:60-66` is exactly `12 / 3 / [0, 0, 2, 3] / G 5 / info 0.5 / (1, 2)`; census is 80000000, work 760000000, STALL_LIMIT remains 12. The file-only recomputation over all 39 SOURCE_FILES matches `34cea38645e079478ff3463c67c72d2701a0fe84983fc3bda5dd5d3b33377918`. |
| Lock split | MP12b2 locks the measured tuple/settings; MP12b3 is unconditional for availability and completes the lock after the owner's fail-fast/population-R answers. MP13 onward follows the MP12b3 boundary. Replay-only REPLAY remains outside the generation/rating lock. |
| Change-round trigger | The main MP12b2 paragraph correctly says C1/C3 failure in a still-offered cell, or Hard/Expert request-completion loss greater than 10 percentage points against GV2. This is not an additional 10 points below an already reduced bound. RP01 concerns the later contradictory stop gate. |
| Census | The main rule correctly lists shares above 5%, asks the owner only above 25%, and prohibits further census changes in MP12b. P-OD7/P-OD8 exceptions and estimate/censored presentation remain visible. |
| Population R | The three 18x20 require cells, additional two requests when the first made nothing, separate repair denominators and conditional owner choice are present. No require restriction is implemented without the owner's answer/A0. RP05 concerns the repeat-plan counter, not the measurement's intended population. |
| Fail-fast | MP12b2 retains F1/F2/combined counterfactuals, the effective-prefix combined check, completed versus censored baselines and zero-observed-false-stop requirement. MP12b3's main implementation prose correctly distinguishes F1 from F2; RP04 concerns its tests/docs/acceptance wording. |
| D39 | The 20-request, measured, >=0.9 completion test matches design section 7.8 and the existing aggregator's completion criterion. Reduced cases cannot qualify. Per-level intervals are consistent with the areas representation; the extra cross-level contiguity obligation is also an existing test contract (`tests/levels.test.js:115-122`), not merely an inference from the word “interval” in design D35. |
| TP34 | The local-copy instructions now account for the fourth parent step, reset ROUND_DIR/output roots, replace MP12a environment settings and select each case's unique dated report. This matches the actual `tests/artifacts/MP12a/corpus.mjs:13-18,116` and `lib.mjs:15-23`; the originals stay read-only. |
| R7 in design section 7.8 | The closing addendum writes the canonical-order/no-median limitation; MP12b2 retains it and links the final calibration record. The quoted Hard spread 2 guesses/12 points and Master maximum 13 points agree with calibration-slice section 6.4. No multi-order production rating is introduced. |
| MP15a1 | The new unrateable sentence is compatible with the existing replay algorithm: replay calls the single recorded set attempt, not firstSetAttempt/request retry; any `{ok:false}` there becomes mismatch `set`. Version preflight, exact final comparisons, hidden-calibration metering and incomplete/cancellation semantics remain intact. No finding on this revision. |

### POLICY_ID: mixed-v3 is authorized

**No new owner or Fable decision is needed for this choice.**

- `docs/design-detail.md:830-839`, section 5.4, assigns size/count/**availability** semantics to
  `generation.policy` and requires a new ID when an availability interval changes.
- `docs/difficulty-v3/report-detailed.md:270-275`, RES-01, explicitly names **mixed-v3** when P3 changes K60
  or another table assigned to the policy.
- HEAD still exports mixed-v2 at `core/engine/policy.js:17`; `levels.js:22-34` still holds the old Hell areas.
  P-OD9 now orders changing that availability before the final lock.
- `generate.js:86-139` uses the request seed/attempt and count policy for generation, not POLICY_ID as an RNG
  tag. `tools/record-fixtures.mjs:70-71,179` stamps the policy in metadata. Thus a policy-only fixture change is
  a justified required check, not a request to change puzzle output.
- Old stored puzzles are not rejected merely for an old generation policy; availability affects generation,
  not the pack/code read path. D20's built-in sample is not a fixture-rewrite target.

If part C is built, the final policy description should also name that require-availability restriction rather
than describing the completed policy as differing only in Hell areas. This does not need another policy ID
inside the same unreleased MP12b3 boundary.

## 2. Findings

### RP01 — The post-change lock gate reinstates the superseded census stop

**Severity: Major.**

**File/line:** `tasks/difficulty-v3/MP12b2-search-evidence-and-lock.md:713-717`
(ordered change round, step 7; also the criteria-script handoff at 697-705).

Step 7 stops before the lock when **any** new C1-C5 criterion fails or is unavailable in a still-offered cell.
That includes C4 above 5%, although PR-P1 expressly makes this a finding, above 25% an owner question, and forbids
another census change. The “earlier disposition is never carried over” clause also makes the already accepted
census cases look like new lock blockers.

This is not only a theoretical wording conflict: the deliberately read-only
`docs/difficulty-v3/landscape-v3/criteria.mjs:137,223-226,239-240,255` still marks >5% C4 as failed and recommends
its original census branch. It must remain valid historical tooling, but its old branch recommendation cannot
override PR-P1 at MP12b2. The current slice's 7% and 11% examples demonstrate why the distinction matters.

**Proposed fix:** replace the blanket C1-C5 stop with an explicit disposition table. Preserve actual raw statuses.
C1/C3 failures in still-offered cells and C2 loss >0.10 are the authorized change-round conditions; correctness,
invalid evidence and applicable C5 correctness failures still stop. C4 >5% is a named item, >25% additionally
gets the owner's question, and neither blocks the tuple lock or authorizes a census change. Distinguish an
availability-caused unavailable statistic from lost/corrupt measurement input. State that the old script's
`census`/`allPass` recommendations are not the resumed control-flow gate. Do not edit the frozen script.

### RP02 — A7 conflates globally retired, locally unavailable and still-offered levels

**Severity: Major.**

**File/line:** `tasks/difficulty-v3/MP12b3-hell-availability-and-fail-fast.md:160-168,210-211`.

Two prescribed fallback assertions do not follow from the new areas:

1. A4 removes a globally retired Hell ID from LISTED_LEVEL_IDS, but the browser fallback in A7 says to assert that
   its Hell row is **disabled**. When the level is retired everywhere, no such row exists:
   `generator/state.js:715-720` maps only LISTED_LEVEL_IDS, and `generator/ui/level-panel.js:218` renders exactly
   that list. A query for that retired radio/row cannot prove it is disabled.
2. The D36 row says that if no remaining candidate is all-capped, the test should assert a RangeError for
   484-cell Hell 3. “No all-capped calibration observed” does not imply “Hell 3 is not offered at 484”.
   If that area still qualifies and the observed calibrations are now rateable, `generate.js:93-96` does not
   throw the specified availability error.

**Proposed fix:** make the migration table branch on the actual derived area/list state:

- globally retired ID: row absent and an actual retired request refused;
- ID still listed but not offered at this board: row present/disabled with the correct reason;
- the D36 request still offered: no invented RangeError assertion. Retire/reassign only the obsolete
  all-capped real-case premise, documenting that outcome and retaining the scripted all-unrateable coverage.

Keep the distinction in both unit and browser expectations. Do not change AREAS merely to make the fallback
test pass, and do not resurrect a globally retired row just to satisfy the browser assertion.

### RP03 — The BQ migration misses a surviving hard-coded seed-plan assertion

**Severity: Major.**

**File/line:** `tasks/difficulty-v3/MP12b3-hell-availability-and-fail-fast.md:206,213,408`.

A6 removes a case that is no longer offered. A7 authorizes the level-list and 60-seed-policy assertions in
`tests/bq0-matrix.test.js`, but omits its separate **“plans one cancel probe per cell and one generation row per
seed”** test. At `tests/bq0-matrix.test.js:122-127`, that test selects `d22x22-hell-1` and unconditionally asserts
60 distinct seeds.

If Hell 1 is hidden at 484 cells, the prescribed A6 edit removes that case. The selected seed set is then empty,
so this remaining test necessarily compares 0 with 60. The task explicitly says other failing tests stop and
T04 limits changes to the listed migrations; the developer has no clean authorized closure as written.

**Proposed fix:** add this exact test to A7's migration ownership. Preserve its substantive checks: one cancel
probe per retained case, exactly one generation row per retained repetition, and distinct/deterministic seeds.
Use a named retained case with its unchanged declared repetitions for the individual seed example, and assert
that a retired case produces no planned rows. Do not silently skip the test or alter a retained matrix case's
seed/repetition protocol.

### RP04 — The F2-only choice is contradicted by unconditional F1 tests and documentation

**Severity: Major.**

**File/line:** `tasks/difficulty-v3/MP12b3-hell-availability-and-fail-fast.md:274-275,285-299,409`.

The implementation prose correctly says F2-only cuts a selection call but continues the set request.
The tests then unconditionally require firstSetAttempt and the pooled client to stop at the first unrateable
attempt; the documents always describe that F1 behavior, and T05 requires both F2 and F1 whenever part B is built.

For the owner's permitted **F2-only** answer, attempt 0 unrateable followed by attempt 1 successful must still
return the later success. The specified firstSetAttempt/client tests instead demand failure at attempt 0.
Implementing F1 just to satisfy those tests would exceed the owner's answer; keeping F2-only would fail the
written acceptance contract.

**Proposed fix:** condition the tests, documentation and T05 on the chosen mechanism:

| Choice | Selection's four-profile early stop | Set-request early stop |
|---|---|---|
| F1 only | No | Yes, ordered unrateable attempt |
| F2 only | Yes | No; later successful attempts remain eligible |
| F1 + F2 | Yes | Yes |
| none | Neither change | Neither change |

Keep the shared all-unrateable reason classification when either mechanism is built, as already specified.
Run the ordered-prefix F1 cases only for F1/both; add the converse later-success case for F2-only.
Document the set-request stop/notice only where F1 is actually implemented. No new owner question is needed.

### RP05 — Population R's repeat decision forgets a reused calibration puzzle

**Severity: Minor.**

**File/line:** `tasks/difficulty-v3/MP12b2-search-evidence-and-lock.md:922-934`, especially 927.

When a capture has no end event, `$made` is `$acc.Count`. A calibration puzzle accepted by foldStart does not emit
an `accepted` event: `docs/difficulty-v3/d21-2026-11-12/flow.mjs:81-84` reports it in
`fold-start.fromCalibration`; later accepted events carry the total accepted slot. Thus a censored capture with
one reused calibration and no later accepted event is incorrectly treated as having made no puzzle, causing
two unnecessary 570-second repeat captures. Counts after later accepted events are also one short, although
their positive/zero branch is unchanged.

**Proposed fix:** reuse the summary/HL accepted-count rule already written in this task:
end.accepted, otherwise last accepted.slot, otherwise fold-start.fromCalibration, otherwise zero, with the
censored marker preserved. Use that same helper for the population-R repeat decision and its report.
Cover the one-calibration/no-end/no-accepted-event trace with a small synthetic record case; no generation is
needed to validate this bookkeeping.

## 3. Decision and dispatch handoff

- **mixed-v3 is verified as an application of an existing decision**, not a new calibration choice.
- Keep P-OD9, the tuple, the two-lock structure and the reduced MP12b1 population. D20 remains open; F1/F2,
  population R and >25% census questions retain their explicit owner routes.
- RP01 and RP05 are MP12b2 pack corrections. RP02-RP04 are MP12b3 branch/migration corrections.
  They can be fixed from the accepted contracts and HEAD code; no new Fable decision is required for them.
- No new issue found in MP15a1's resume change, TP34 or the R7 instruction. The findings do not ask for a
  re-run of calibration or for changes to source, fixtures, thresholds or completed logs in this review.
- Opus owns all pack/clarification edits. The orchestrator owns dispatch addenda, execution, logs and commits.

PENTOMINO CROSS-CHECK DONE: 0 blocking, 4 major, 1 minor

Ids per file:
- `tasks/difficulty-v3/MP12b2-search-evidence-and-lock.md`: RP01, RP05.
- `tasks/difficulty-v3/MP12b3-hell-availability-and-fail-fast.md`: RP02, RP03, RP04.

## Verification of the fixes

2026-11-13, SA2. Checked the uncommitted fixes over `a1b9354`, the requested task/checklist sections and
`docs/difficulty-v3/claude-opus-5.5/9-response-to-cross-check.md`. This section supersedes the outstanding
finding counts and the earlier D20-open status above; the original review remains historical.

| Finding | Verdict |
|---|---|
| RP01 | Closed. MP12b2 steps 5/7 and T05, with checklist D29, preserve raw criteria but apply the explicit disposition table. Census above 5% is a finding, above 25% additionally an owner question; neither blocks the lock. Missing/corrupt evidence is distinguished from availability-caused unavailable statistics. |
| RP02 | Closed. A7 distinguishes offered, listed-but-unavailable and retired levels. The narrowing is accepted: while 484-cell Hell 3 stays offered, A2-A6 leave its deterministic input/output unchanged, so the existing D36 slow test stays; part B's reason change is handled separately. Refusal is asserted only in the genuinely unavailable branch. |
| RP03 | Closed. A7 now owns the BQ-0 planning assertion, uses retained d22x22-hard and its declared repetitions when the Hell case is removed, and checks that no removed-case rows remain. |
| RP04 | Closed. Part B, B03, T05 and checklist D40 consistently follow the owner's mechanism choice. F2-only permits later success in both serial and pooled paths and adds no F1 notice; tests and documentation are conditional. |
| RP05 | Closed. AcceptedOf uses end.accepted, then last accepted.slot, then fromCalibration, then zero, preserving censoring. Both population R and HL use it; T10 and the five synthetic-check definitions match. No check was executed here. |

The RP02 narrowing is supported by `core/engine/policy.js:322-339`: interval ends only gate availability,
not the counts inside an offered interval; POLICY_ID is not a generation RNG input. A3 also now describes
the optional require restriction under the same unreleased mixed-v3 policy.

P-OD10 correctly records **keep**: D20 and checklist section 9 are decided, the open clarification entry is
removed, and the Player sample stays byte-for-byte with no new task.

No remaining RP finding or new decision request. Only this section was written: no pack edits, tests
(including npm run check), generation, timing runs, staging or commits.

PENTOMINO VERIFIED
