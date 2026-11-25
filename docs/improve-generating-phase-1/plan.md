# Improve generating, phase 1: close-out plan

Status: Final (2026-11-25, base c63c553)

| Item | Value |
|---|---|
| Authors | SA-Astra (drafter), SA-Opus (reviewer); joint technical rulings under the owner's delegation |
| Repository, branch | `Q:\git\pentomino`, `improve-generating` |
| Analysis/source base | `006ca68ff447c8e39c33deaf517df82b3dc6d602` |
| Governing instruction base | `c63c553e5b1b07d6a3de8f34660b5f1c6144f4d6` (owner's two-PR follow-up; supersedes the one-PR clause of `a90c2d0`; neither PR is merged) |
| Governing plan | `docs/improve-generating/plan.md`, P6, OD-P2, IG-P-D2 and section 6 phase 1 |
| Request and report | [request.md](request.md), [report.md](report.md) |
| Next workflow | `break-tasks`; both SAs have accepted this plan |

## 1. Goal

Close the already implemented phase 1 with explicit evidence adoption, the missing width-8 **fold-simulation**
case, current verification and a readiness note. Keep the same puzzles, canonical stored ratings, replay and
shown-puzzle history.

Finish phase 1 in existing **PR #11** (`improve-generating` into `main`) and update its description with the
details of the changes. Then phase 2 uses a new branch **`gen-v4` from the phase-1 close-out** and a **new PR
into `main`**. Neither PR is merged; this plan authorizes no release or deployment.

## 2. Scope

### In

- A new adoption record tying the current phase-1 source to T12-T14 and their evidence.
- One existing test's width matrix and name in `tests/generate.test.js`.
- The corresponding `generate` test-table sentence in `docs/design-detail.md`.
- Focused test verification; full suites on Node 26 and Node 22; both fixture checks; convention and static-site
  checks, with immutable attempt logs and a current qualified-source identity.
- A readiness note and PR #11's detailed phase-1 description.
- As phase 1's last task, orchestrator push of `improve-generating` and rewrite of PR #11's description;
  verify its published head and open/unmerged state.

### Out

- Reimplementing P6 or progressive presentation; any production source change.
- Raising `MAX_POOL_SIZE`, a wider-pool opt-in, a new worker protocol, changed scheduling or candidate universe.
- New algorithm/model/policy/provenance/storage versions; changed fixtures, puzzle identities, ratings or replay.
- UI/locale changes, a new batch-size control, early Play while busy, offer changes or a first-puzzle service level.
- P7 adoption, a new P6 timing campaign, browser-page/qualification runs, new packages or a new test framework.
- Phase-2 code, its freeze choices or its production-validation design. That is a separate analyze feature.
- Main-branch writes, merge/rebase/force-push, release tags, GitHub releases or deployment-workflow dispatch.
- Rewriting historical plans, analyses, observations, receipts or the closed stage-4 report.

The research-harness navigation lines are not added by this tests-only close-out. Their absence must be disclosed
in PR #11 and closed by a later documentation task before any merge (N-P1-DOC, section 9); an edit on the other
branch alone must not be assumed to fix PR #11.

## 3. Current state and evidence

### 3.1 Already implemented

| Item | Evidence |
|---|---|
| P6 | T12 `fb893c3`; `difficulty.js` has `rateLean` and `completeDiagnostic`; `clues.js` selects the observer route and completes successful results. |
| Progressive/history policy | T13 `373e74a`; the client emits in fold-consumption order, and the Generator records shown-puzzle keys immediately. |
| Four-worker timing and memory | T14 `826ce79`; N-V4-12 closed; original measured new source is `27c6189e40bfe2000a454f755797c5745d7c2e84`. |
| Current source | Digest `a51e8196fd16ef24a785dd9ea39663a454c6ea3574e7011ea074e0cd99c334c4`, equal to T14; only the three P6 files differ in deployed sources against main `b5eb858`. |
| Compatibility | `generation-case.json`, `generated-sample-pack.json`, `replay-case.json` unchanged from frozen `3fc65f4`, after LF normalization. |
| Current checks | 1,514/1,514 tests on Node v26.13.0 and v22.23.5, both fixtures and static site pass at `006ca68`; these precede the proposed width edit. |

T14's four reports reproduce exactly: 70 rows, 35 equal pairs, both memory checks passing on 14 side-cells;
process peak 561.949 MiB of 1,536, accounted peak 230.803 MiB of 1,196, `model-too-large` zero.
Its historical cost is 2,244.925 seconds of a separate 2,700-second allowance.

These five-seed Node results are descriptive. No universal "slower nowhere beyond noise", ±5% memory guarantee,
browser qualification or per-press speed claim is adopted.

### 3.2 Width gap

`tests/generate.test.js:782-833` already simulates the real candidate/fold at widths 1, 2, 3 and 4, with three
shuffled completion orders on each of `fixture-set-0` and `fixture-set-1`.
It does not call `createPool`, so width 8 can be added there without changing production admission.

`core/browser/worker-pool.js:75,194-196` retains a limit of four. `runRecipe(8)` in the client tests would throw
and is not part of this plan. Existing production-client tests continue to cover their supported widths.

## 4. Design and contracts

### 4.1 Retained P6 and observer contract

No runtime edit is required:

- With no `rate` seam, `record` or `onRate`, the selection's profile and repair ratings use `rateLean`.
- A seam retains priority; `record` uses `rateDetailed`; `onRate` retains canonical `rate`.
  A `charge` observer alone does not require full DLX diagnostics.
- `conclude` completes every successful returned rating with `completeDiagnostic`, without rerunning deduction
  or mutating the lean input. The four fields have their canonical values and key positions.
- `rate`, display-rating tasks and recorded replay ratings remain full. Strict pack reading continues to refuse
  `dlxStop: 'skipped'`.
- Scores, errors, search decisions, caps, work charging and observer exception semantics remain unchanged.

### 4.2 Progressive presentation and history

The existing interfaces stay: `onAccepted` carries revision, index, puzzle, `made`, accepted count and quantity.
Only fold-consumed accepted candidates are published; merely completed speculative workers are not.

| Situation | Required existing behaviour |
|---|---|
| Current-revision acceptance | Add puzzle, seed and `made`, and both seen keys in the same store update. |
| Complete, short, timed out, cancelled or failed request | Retain the admitted prefix and already recorded keys; merge returned/error histories without rollback. |
| Final capacity trim or later card removal | The card may leave the list; its history keys remain. |
| Stale callback | No current-state mutation. |
| Reset history | Explicitly clear history without rewinding the batch counter. |
| Save/reload | Keep current schema, debounce/flush and best-effort failure handling; no new crash-durability guarantee. |

One puzzle per press, newest-first visual cards and Play disabled while busy stay unchanged. A one-puzzle request
can still show a card before a later capacity/finalization outcome, so history remains meaningful.

### 4.3 Identity, replay, UI and documentation

There is no version bump or migration: `gen-v3`, `mixed-v3`, `difficulty-v3`, RNG, `APP_VERSION`, pack/provenance
and Generator storage identities remain unchanged. Preserve `setOrigin`, per-puzzle `made`, seeds and skips.
Current saved replay keys remain valid; the existing `gen-v3` replay fixture must still match in this phase.

No English or Vietnamese UI text changes. Existing `N-PARTIAL`, `M-CANCELLED-BATCH`, `M-FAILED`, `M-HISTORY-FULL`,
`M-PACK-SIZE` and storage-failure messages remain in both locale packs. The living specification already states
P6 and the history rule (`docs/design-detail.md:1507,1611,2120,2560`).

The only living-specification edit is the test coverage sentence specified in section 4.5. No behavioural change
requires a design-brief or guide rewrite. Historical independent analyses and the stage-4 report are not edited;
the joint report/readiness note carry their corrections.

### 4.4 Source-bound adoption record

Create:

- `docs/improve-generating-phase-1/evidence/adoption.json`
- `docs/improve-generating-phase-1/evidence/adoption.md`
- the data-only reader that produces them, in this feature's `evidence/` folder.

The record must identify:

1. The inspected commit and runtime/source digest, the original frozen `3fc65f4` and measured P6 `27c6189` commits,
   and the current main/source bridge.
2. The four T14 publication paths and raw-byte hashes, their ledger bindings, the exact recomputed comparison,
   identity categories, memory checks, counts, limits and measurement conditions.
3. The nine runtime dependency files of `measureDeduction`, with LF-normalized hashes against frozen reference:
   `deduce.js`, `policy.js`, `tiling.js`, `levels.js`, `qualification.js`, `dlx.js`, `geometry.js`,
   `placements.js`, `workspace.js`.
4. The three fixture paths and normalized hashes, and the unchanged version tuple.
5. Which observations are historical and which are current source checks. The 713-item P7 report may be cited
   as context, not labelled as a fresh P6 run or as approval of its slower candidate.
6. The input index, reader identity, exact commands and limitations. Any missing, changed or invalid required input
   blocks adoption rather than silently dropping a row or accepting a missing memory result.

The equality gate is satisfied by unchanged deduction code/dependencies for the same corpus inputs, together
with P6's own canonical returned-rating, observer and replay checks. It is not a claim that the corpus was rerun.

Use the existing pure benchmark comparison functions; execute no generator, solver, rating, replay or bench
while producing this record. Keep every original observation unchanged. The first-round audit scripts are
historical, including their fixed-base assertions; do not rewrite them to manufacture a current record.

The adoption record can precede the test edit because runtime remains unchanged. Final qualification additionally
records the approved test delta and its fresh results; it must not claim tests still have their old hashes.

### 4.5 Exact fold-simulation change

In the `describe('deterministic parallel simulation', ...)` block of `tests/generate.test.js` only:

1. Rename the parameterized test to:

   ```
   pool sizes 1-4 and 8 with shuffled completion orders agree on ${seedText}${tag}
   ```

2. Change that block's width loop from `[1, 2, 3, 4]` to `[1, 2, 3, 4, 8]`.
   Do not change the separate dispatch-priority width loop earlier in the file.
3. Keep both seeds, `fixture-set-0` and `fixture-set-1`, the existing 10x6 Hard `any` setup, quantity 5,
   batch seed `${seedText}#1`, matching calibration, pre-existing history and order seeds `${order}${width}`
   for `order` in `['a', 'b', 'c']`.
4. Retain the serial reference, candidate memo/purity checks and history non-mutation checks. No new candidate
   algorithm or fake substitute is introduced.

The existing `summary` compares status, partial reason, ordered layout keys, ordered clue keys and scores.
There will be **30 simulation comparisons**: two seeds, five widths, three orders. Do not describe that summary
as comparing every provenance or rating field; the existing P6, fixture and replay tests cover those contracts.

In `docs/design-detail.md`'s `generate` test-table row, replace only:

> Fold determinism: identical output for pool sizes 1 and 4 and shuffled completion orders (simulated).

with:

> Fold determinism: identical output for simulated pool widths 1, 2, 3, 4 and 8 and three shuffled completion
> orders, against the serial fold. Width 8 is a test-only simulation; the production pool remains limited to four.

The production width guarantee elsewhere in that document remains 1-4.

### 4.6 Qualification method

After the test edit, run the focused changed test, then the required close-out gates:

- Full suite on the default Node 26 and on an existing Node 22 binary; record exact versions.
- `tools\record-fixtures.mjs --check`.
- `tools\record-fixtures.mjs --replay-case --check`.
- `npm run check`.
- Source/fixture/scope identity checks and static Pages assembly/check.

All engine/test commands use `tools\ig-proto\lock\ig-lock.ps1`, `Invoke-IgNode -Repo pentomino`,
`-LimitSeconds 300 -QuietSeconds 45`; do not request the shortened idle quiet. They are verification, not new
timed benchmark rows. Do not run a redundant quick suite immediately before the full suite.

The helper starts the default Node. For Node 22, an explicit existing executable may be launched by the
child-status-forwarding `evidence/sa-opus/p1-run.mjs` inside the same lock, with fresh output paths.
Do not hard-code a personal npm-cache path as a portable requirement. Check the supplied executable's major
version first; if unavailable or wrong, stop for the pack author's ruling. Do not silently download a runtime.

**Fail closed:**

- Do not use `-AllowExit1` for qualification. Every command must exit 0 before the next starts.
- Full-suite summaries must show zero failures/cancellations and no unintended skipped tests; missing or
  malformed output is not success. A focused name-filtered run may naturally report unselected tests.
- Preserve stdout, stderr, helper status, actual quiet and duration. Use a fresh attempt directory; never
  overwrite a previous attempt or a historical analysis log.
- A timeout, mismatch or nonzero exit stops for `QUESTION:`. No automatic fixture regeneration, version change,
  production patch, benchmark retry or limit increase.

Static site verification is unlocked and uses a fresh owned directory under the repository:
copy exactly `index.html`, `redirect.js`, `sitemap.xml`, `assets`, `core`, `generator`, `player`; run
`stamp-version.mjs` with the qualified commit's first eight characters, then
`check-site.mjs <stage> --expect-version <sha8>`. Record the manifest/result and clean up only that owned copy.
Never stamp the checkout. This is not a browser functional test.

Record a `qualifiedCommit`, runtime digest and tested-file hashes in the final verification index. Later
documentation-only commits may use those results after proving runtime/tests/workflow unchanged and checking
their own static/document changes; do not require endless full-suite repeats merely to commit their logs.

### 4.7 Readiness and phase-1 publication

Create `readiness.md` and `pr-body.md` in this feature. The readiness note links adoption and the final checks,
states exactly what is qualified, and states phase 2 is still separate work.

PR #11's rewritten description must:

- Say phase 1 is complete at its checkpoint, detail P6 and the history/test changes, and say phase 2 will be
  handled on `gen-v4` in a separate PR into `main`.
- List the production files literally: `core/engine/clues.js`, `core/engine/difficulty.js` and
  `core/engine/types.js`; explain `rateLean`, `completeDiagnostic` and the observer rule.
- List the five test files: `tests/clues.test.js`, `tests/difficulty.test.js`,
  `tests/generation-client.test.js`, `tests/generator-controller.test.js` and `tests/generate.test.js`;
  identify the added width-8 fold simulation separately from the already accepted T12/T13 checks.
- Name `docs/design-detail.md`'s affected API/type blocks (sections 4.1-4.2), the history/P6 sections 6.9-6.10,
  rating section 7.10, capacity-history section 10.5 and test-table row in section 13.2.
- Give P1-03's actual verification results: qualified commit, Node versions, both full-suite outcomes,
  both fixture checks, `npm run check` and the static-site check, with their evidence links.
- Report P6's measured conditions and limitations, not "slower nowhere beyond noise", per-press/browser gains,
  a fixed memory percentage or a guaranteed Git pack-size increase.
- Keep phase 0's original FAIL and D-S24-35's phase-2 scope visible.
- State **do not merge** and distinguish research records/harness from deployed site code.
- Known before any merge: the developer guides (EN and VI) do not yet name `tools/ig-proto/`, which this branch
  adds; a later documentation task adds the line before any merge (`AGENTS.md`).

Use existing **PR #11**, base `main`, head `improve-generating`. After successful phase-1 close-out, the
orchestrator pushes its committed work and rewrites that PR's description with the details of the changes.
Do not continue phase-2 commits on `improve-generating`.

Before publication, re-read the remote head/base and ensure the intended push is a fast-forward of this branch.
An unexpected ref, divergence, main/source change, closed/merged PR or changed scope stops for a ruling.
Never force-push or silently rebase. After publication, record the published commit and verify PR head equality,
`state: OPEN`, `mergedAt: null`, correct base/head branches.

PR updates do not trigger this repository's Pages workflow. Its manual trigger would still deploy, so do not
dispatch it for PR validation. Do not claim empty PR status checks are a green CI run.

After P1-05 completes, record the published phase-1 head as the phase-2 fork point. The orchestrator then creates
`gen-v4` from that point, not from `main`, and opens the separate phase-2 analyze feature. Phase 2's new PR has
base `main`; no phase-2 branch or PR is created during this drafting task.

Because PR #11 stays unmerged, the `gen-v4` PR initially includes phase-1 commits in its main-based diff.
Its description must identify that dependency and the phase-2-only range from the recorded fork point.
Do not silently change its base, duplicate phase 1 with cherry-picks, reset an existing branch or rebase to
conceal the overlap. If `gen-v4` already exists or the fork/base cannot match the owner's instruction, stop for
a ruling rather than overwrite work.

## 5. Decisions

For joint-SA rows, the two SAs have accepted the decisions under the owner's delegation. SA-Opus's final
condition RR1 is satisfied by section 4.7's developer-guide disclosure; his review is
`sa-opus/review-report-plan.md`. The commit recording this final plan is still pending. The source-commit
column names the real governing instruction/evidence, not an invented commit for this uncommitted plan.

| ID | Decision | Decided by | Date | Source commit / record |
|---|---|---|---|---|
| D-P1-01 | **Superseded in its one-PR clause by D-P1-07.** The 07:00 instruction initially combined the phases in one unmerged PR. Its no-merge restriction remains in force for both PRs. | Owner | 2026-11-25 | `a90c2d0`; request, Discord 1574937911546085528; superseded by `c63c553` |
| D-P1-02 | **Superseded by D-P1-07/D-P1-08.** The earlier draft routed both phases through PR #11. It is not the active publication route. | Joint SAs' earlier draft routing | 2026-11-25 | `a90c2d0`; both cross-reviews; replaced under `c63c553` |
| D-P1-03 | Adopt T12-T14 with explicit source/report/fixture bindings. The corpus argument uses all nine unchanged deduction dependency files plus P6 tests; the 713-item P7 report is context only. No new P6 bench or mandatory browser-page run. Closes Q-P1-A1 and merged Q-P1-3. | Joint SAs under the owner's supervisor delegation | 2026-11-25 | `fb893c3`, `373e74a`, `826ce79`; request/delegation at `a90c2d0`; both cross-reviews; this plan's commit pending |
| D-P1-04 | Select Q-P1-A2(a): width 8 in the existing fold simulation, both seeds and three orders; production/client pool limit stays four. No `runRecipe(8)` or P8 admission. | Joint SAs under the owner's supervisor delegation | 2026-11-25 | `006ca68` test/pool source; both cross-reviews; this plan's commit pending |
| D-P1-05 | Preserve P6, history, UI, versions, fixtures and matched `gen-v3` replay. Qualification is fail-closed on Node 26/22 with the two fixture checks, conventions and static site. | Joint SAs within plan v4 | 2026-11-25 | Plan v4; T12/T13; `006ca68` workflow/tests; this plan's commit pending |
| D-P1-06 | Preserve the phase-0 FAIL and D-S24-35. Phase 2 follows the phase-1 close-out under D-P1-07; its changed runtime needs its own validation. Phase-1 adoption qualifies only its checkpoint. | Owner for phase-2 scope; SAs for evidence separation | 2026-11-25 | T16 `ec8ec0c`, owner register `ca46067`, current follow-up `c63c553` |
| D-P1-07 | **Current owner route:** two separate PRs. Finish phase 1, push `improve-generating` and update current PR #11 into `main` with the details of the changes. Then phase 2 uses `gen-v4`, branched from the phase-1 close-out, and a new PR into `main`. Neither PR is merged; no release/tag/deployment now. Answers Q-P1-1b. | Owner | 2026-11-25, 07:46 +07:00 | `c63c553`; request, second CLI follow-up and the owner's branch/base choices |
| D-P1-08 | Record the published phase-1 head before phase 2 starts. Branch origin is that close-out; phase-2 PR base is `main`. Disclose the inherited, unmerged phase-1 prefix rather than retargeting or claiming a disjoint main-based diff. P1-05 is phase 1's last task; phase 2 is a separate analyze feature on its new branch. | Joint SAs, operational execution of the owner's route | 2026-11-25 | `c63c553`; this plan's commit pending |

Q-P1-1 and Q-P1-1b are answered by the current D-P1-07, not by an unanswered default. Q-P1-2 is withdrawn
for this stage. No GitHub release is inferred for later. No open owner or supervisor question remains.

## 6. Acceptance criteria

### Business

| ID | Criterion | Verification |
|---|---|---|
| P1-B01 | Phase 1 is closed by adopting its existing implementation, not duplicating it or changing puzzles/ratings. | Source-bound adoption; no production delta; P6/fixture/replay gates. |
| P1-B02 | Fold-ordered presentation and shown-puzzle history remain true for all existing endings, including capacity trimming. | Existing client/controller/history tests in both full suites; unchanged runtime and UI. |
| P1-B03 | Performance/memory evidence is reported with its population, conditions and limits, not as browser or universal guarantees. | Joint review of adoption, readiness and PR text; T14's 35 observed pairs and 14 side-cells retained. |
| P1-B04 | Phase 1 ends with current PR #11 updated in detail and unmerged; phase 2 is routed to its separate branch/PR without changing the live site. | PR #11 head/base/state verification and recorded fork point; D-P1-07 route; no main push, merge, dispatch, tag or release action. |

### Technical

| ID | Criterion | Verification/evidence |
|---|---|---|
| P1-T01 | Adopted measured sources and the nine-file deduction closure match their references; required evidence is complete. | Adoption reader, hashes and exact T14 recomputation; missing/changed input blocks. |
| P1-T02 | The fold simulation covers widths 1, 2, 3, 4, 8, both seeds and three completion orders against the serial result. | Focused test and both full suites; 30 comparisons of the existing summary, with candidate-purity/history checks retained. |
| P1-T03 | Production pool remains 1-4; client tests and runtime are not widened. | Scope guard; `MAX_POOL_SIZE = 4`; no production file edit. |
| P1-T04 | All three fixtures retain their contents and both replay checks pass. | Fixture hashes and the two `record-fixtures` check modes, never create/replace. |
| P1-T05 | Full suites pass on Node 26 and Node 22 after the test edit. | Actual versions, exit 0, zero failed/cancelled/unintentionally skipped tests; logs bound to qualified source. |
| P1-T06 | Canonical returned ratings, observer behaviour, work meter, strict stored-claim refusal and matched replay remain correct. | Existing P6, recorder, state and replay tests in the full suites. |
| P1-T07 | Four-worker memory gates remain established on source-matched T14 data. | Both checks `pass` on all 14 side-cells, process <= 1.5 GiB, accounted <= 1,196 MiB, `model-too-large` zero; no missing result counted as pass. |
| P1-T08 | Convention and static staged-site checks pass; staged files match the qualified source. | `npm run check`; owned-copy stamp/check and manifest; no deployment. |
| P1-T09 | Only the intended test/spec sentence and new feature/task/evidence records change. | Scope/fixture/runtime guards; old observations and independent analyses untouched. |
| P1-T10 | Publication is a verified fast-forward to the existing PR, with no merge. | Published SHA equals PR head; base `main`, head `improve-generating`, OPEN and unmerged; reviewed phase-1 scope only, with no phase-2 commit on `improve-generating`. |

## 7. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Mistaking already completed T12-T14 for work to redo | Adopt by source identity; no production implementation task. |
| Confusing eight simulated lanes with eight admitted workers | Exact isolated test loop; production limit and client tests unchanged; explicit documentation. |
| Treating P7 evidence as a fresh P6 corpus run | Nine-file construction proof and P6-specific tests; label the P7 report context only. |
| Analysis wrapper hides a nonzero command behind `-AllowExit1` | Fail-closed method; preserve the valid historical logs rather than rewrite them. |
| Node 22 Windows passes but eventual Ubuntu CI differs | Record environment honestly; no green-CI claim before its actual run; no deployment workflow used as a PR test. |
| Timing/memory or repository-size wording overstates observations | Keep T14's descriptive limits; report thresholds, not a ±5% rule or guaranteed clone-size multiplier. |
| Later phase-2 code invalidates this source snapshot | Finish/bind this checkpoint first; phase 2 supplies its own production validation and PR status. |
| The new phase-2 PR targets main while inheriting unmerged phase-1 commits | Record its fork point and link the dependency on PR #11; show the phase-2-only range separately, without changing the owner-selected base. |
| Shared-machine contention or an unexpected test failure | Shared lock, 45-second quiet, 300-second limits, preserved attempts and a QUESTION stop. |

## 8. Task outline for break-tasks

All tasks stay below roughly three hours. Developers do not edit the pack or commit; the orchestrator verifies
and commits each accepted task. No production change is expected.

| ID | Task | Executor | Depends on | Inputs, output and gate | Estimate |
|---|---|---|---|---|---|
| P1-01 | Source-bound adoption | SA-Astra; SA-Opus reviews | final plan | Section 4.4 inputs; `evidence/adoption.json/.md` and reader; every source/report/fixture/memory binding passes. | SA about 1 h; no engine run |
| P1-02 | Width-8 fold simulation and test-table sentence | Dev-Sonnet | P1-01 | Exactly section 4.5's two files; focused test and conventions pass; all other source/fixtures unchanged. | Dev about 0.5 h; one bounded verification invocation |
| P1-03 | Current qualification | Orchestrator | P1-02 | Section 4.6; four locked full/fixture invocations, static gates, source index and logs under `evidence/verification/`. A nonzero result stops. | About 0.5 h of operation plus contention; 7.4 min node+quiet baseline before the extra test width |
| P1-04 | Readiness note and PR #11's detailed description | SAs | P1-03 | `readiness.md`, `pr-body.md`; phase-1 changes, evidence/limits, separate phase-2 route and no-merge instruction agree; conventions pass. | SA about 0.5 h; no engine run |
| P1-05 | Push `improve-generating` and rewrite PR #11's description; never merge | Orchestrator | P1-04 | Phase 1's last task: fast-forward intended commits; publish the detailed description; verify PR head/base and open/unmerged state; record published SHA as phase-2 fork point. | About 0.2 h; no engine run |

### Cost and stop rules

There is **zero new benchmark allocation**. Verification is kept visible but charged to neither closed
measurement grant. Four full/fixture invocations previously used 266.029 node seconds plus 180 quiet seconds.
The focused width test adds one bounded invocation. Plan roughly **8-10 minutes of node+quiet**, not a wall-time
guarantee; contention may be longer. Five invocations each capped at 300 seconds plus 45 seconds quiet give a
**1,725-second verification ceiling**, not a forecast or permission for an added timing study.

- A failing gate, unexpected scope/source change, missing runtime or divergent PR ref goes to the pack author
  as `QUESTION:`. No unilateral fix outside the task, altered fixture, auto-retry or force-push.
- A genuinely new measured scope must be designed/priced and approved by the owner separately.
- No further owner stop is needed to push the completed phase-1 work and update PR #11 under `c63c553`.
  The phase-2 branch/PR route is also specified, not a default. Merge, release and deployment remain prohibited.

## 9. Named hand-over items and what follows

No unresolved question blocks this final plan; `clarifications.md` remains "No open questions".
The following are routed work, not new decisions or authorizations:

| Item | State/routing |
|---|---|
| Phase-1 completion | P1-01 to P1-05; not claimed complete until their evidence exists. |
| Phase-2 continuation, N-V4-07 | After phase-1 close-out and PR #11's update, create `gen-v4` from the recorded published phase-1 head, then start the separate analyze feature there. Its new PR targets `main` and stays unmerged. No phase-2 production edits during this close-out. |
| D-S24-35, N-V4-15 and the later production gates | Inputs to that separate phase-2 plan, including the 26x26 Nightmare legacy route and required `require`/replay/production validation. Not implemented here. |
| N-V4-05 | Closed: no P7 composite to adopt. |
| N-V4-12 | Closed by T14; adopted for this identical-source phase-1 checkpoint, not a blanket qualification of future code. |
| N-V4-20 | Closed by the stages-2-4 pack's T01b; retain the strengthened guard. |
| N-P1-DOC | Non-blocking for this unmerged close-out, required before any merge: add the `tools/ig-proto/` code-layout line to both developer guides. Disclose the omission in PR #11 now; a later documentation task must fix the branch to be merged, not merely the other PR. |
| Offers, N-V4-08/N-V4-09; service level N-V4-10; optional N-V4-11/N-V4-14 | Later work and owner decisions as already recorded; no new scope in this plan. |
| Any eventual merge/release | Requires a later explicit owner instruction; not a default after phase 2 finishes. |

## 10. References and sign-off

- `request.md` (`006ca68` initial request; `a90c2d0` first follow-up; `c63c553` superseding two-PR instruction)
  and `report.md`.
- Both `sa-*/round-1-analysis.md` and `sa-*/round-1-cross-review.md`.
- `sa-opus/review-report-plan.md`, including the final RR1 acceptance condition and optional RR2/RR3.
- `docs/improve-generating/plan.md`, P6, section 6, OD-P2 and IG-P-D2.
- T12, T13, T14 and N-V4-12 in `tasks/improve-generating-v4/`.
- `docs/improve-generating/evidence/phase1/P6-bench/compare.json/.md` and their four bound reports.
- `evidence/sa-astra/phase1-audit.*`, `cross-review-audit.*`; `evidence/sa-opus/p1-verify.log`,
  command logs, `p1-site.log`, `p1-xr-checks.*`.
- `tests/generate.test.js:139-145,782-833`; `tests/generation-client.test.js:561-594,1214-1230,1300-1355`;
  `core/browser/worker-pool.js:75,194-196`; `docs/design-detail.md:3076`.
- `.github/workflows/pages.yml`; closed stage-4 report and D-S24-35.

Sign-off:

- SA-Astra (drafter): accepted, 2026-11-25; RR1-RR3 applied; the two-PR/no-merge route and all technical gates accepted.
- SA-Opus (reviewer): accepted, 2026-11-25; his conditional acceptance in `sa-opus/review-report-plan.md` is effective with RR1 applied in section 4.7; RR2/RR3 also applied.
