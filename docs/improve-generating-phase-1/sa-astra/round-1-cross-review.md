# Phase 1, round 1: SA-Astra's cross-review

Reviewer: **SA-Astra**. Reviewed: `sa-opus/round-1-analysis.md`.
Analysis base: `006ca68`. The subsequent `a90c2d0` records the owner's follow-up only; production, tests,
tools and the Pages workflow are unchanged from the analysis base. Date: 2026-11-25.

[V] means checked against code, Git/GitHub state or records; [A] is a recommendation or interpretation.
This review adds no engine run, benchmark, push, merge, tag, release or deployment. The independently assembled
static site copy was checked and removed; its input/output hashes are retained.

## 1. Owner instruction that supersedes the release proposal

[V] The orchestrator relayed Discord message **1574937911546085528**, 2026-11-25 07:00:59 +07:00:

> Tiếp tục làm các phase 2 đến khi xong, gom trong 1 PR (không merge)

The orchestrator's interpretation is phase 1 and phase 2 together in **one PR, not merged**. It is now recorded
by `a90c2d0` in the feature request.

[A] Consequently:

- The joint phase-1 plan is a qualification/adoption checkpoint and hand-over, **not an immediate release pack**.
- Q-P1-1 is answered: one combined phase-1/phase-2 PR, not a separate eight-file phase-1 PR and not a merge now.
- Q-P1-2 is answered for this stage: no GitHub release or release tag now. This does not decide a future release.
- Reusing existing PR #11 is the natural technical vehicle; I see no remaining owner ambiguity requiring another
  route question. The orchestrator handles publication within the owner's instruction, not the SAs.
- Remove the merge, deployment, release and rollback-as-release steps from this phase-1 pack. Do not manually
  dispatch `pages.yml` to validate an unmerged PR: its `workflow_dispatch` trigger also reaches the deployment job
  (`.github/workflows/pages.yml:2-4,26-31`).
- Finish phase 1's plan first. Phase 2 gets a separate analyze round, per the parent's instruction. I have not
  started phase-2 analysis or implementation.

[A] This supersedes SA-Opus's standalone release options and my earlier later-owner-release stop; it is not an
error in either analysis written before the new instruction. It must not be interpreted as approval to merge later.

## 2. Agreements, independently checked

### 2.1 Existing work and the source pair [V]

We agree that phase 1 must not be rebuilt:

- P6: `fb893c3876e1bc2adaafbe258c7cf857f652d008`.
- Progressive/history tests and text: `373e74a57a7c05de0b92eb03cb6eb7ee4e6f8281`.
- P6 production benchmark: `826ce79dcc4a77daaaea00894a6dcea46bcbd8b7`.
- The measured P6 digest remains
  `a51e8196fd16ef24a785dd9ea39663a454c6ea3574e7011ea074e0cd99c334c4`.

Against verified remote `main` (`b5eb85805f609af7deaa2489eb08675c60b2cc49`), the analysis base has exactly the eight
non-research files SA-Opus lists, **+296/-34**. Across the actual deployed source paths, only P6's three files
differ: `core/engine/clues.js`, `difficulty.js`, `types.js`.

Both deployed-source bridges are empty:

```
git diff 3fc65f4 origin/main -- core generator player assets index.html redirect.js sitemap.xml
git diff 27c6189 006ca68 -- core generator player assets index.html redirect.js sitemap.xml
```

The original T14 source IDs must remain in its reports. An adoption record can bind identical current source;
it must not relabel an old observation as a fresh run.

[V] My first audit independently recomputed the four T14 reports: 70 rows, 35 equal pairs, both memory checks
passing on all 14 side-cells, 2,244.925 seconds of its separate historical allowance.
[A] No fresh P6 timing campaign is justified by a source change, because there is none.

### 2.2 PR and remote state [V]

I independently queried `gh pr view 11` and `git ls-remote`, without fetching or changing refs:

| Item | Observed value |
|---|---|
| PR | `https://github.com/tdat00/pentomino/pull/11`, OPEN, not draft, no merge timestamp |
| Head | `826ce79dcc4a77daaaea00894a6dcea46bcbd8b7`, branch `improve-generating` |
| Base | `b5eb85805f609af7deaa2489eb08675c60b2cc49`, branch `main` |
| Mergeability at the observation | `MERGEABLE`, `CLEAN`; no status checks reported |
| Current remote PR changed files | 479 |
| At local analysis base `006ca68` | 70 commits ahead of the published branch; 197 ahead of remote main |
| Full diff at that base | 1,286 files, +2,173,527/-304; eight non-research files |

[A] Those are snapshot facts, not promises about the PR after later phase-2 work. Being mergeable is not approval.

### 2.3 CI and fresh verification [V]

- The workflow really uses **Node 22 on Ubuntu**, runs the complete test glob, assembles only the public site
  paths, stamps the commit, checks the staged site and deploys only after the build job succeeds
  (`.github/workflows/pages.yml:10-31`). It does not trigger on `pull_request`.
- I checked both full TAP logs, not just the analysis: Node **v26.13.0** and **v22.23.5** each report
  **1,514 tests, 1,514 passed, zero failed/cancelled/skipped**, exit 0. The P6 and progressive/history cases appear
  as passing in both. The two fixture-check logs pass.
- The four helper lines have exit 0 and quiet 45. Node seconds sum to **266.029**; node plus four quiet periods
  is **446.029 seconds**, about 7.43 minutes before other lock contention/overhead.
- These are SA-Opus's actual verification runs on Windows. The Node 22 run covers CI's major Node version,
  **not** Ubuntu execution itself. I did not repeat either full suite.
- I independently reproduced the static assembly/stamp/check pipeline in a fresh owned evidence subdirectory:
  **414 references in 91 of 114 stamp-eligible files**, 120 files total; `check-site: OK` for `006ca68f`.
  The directory was removed. This is not a browser functional test or a deployment.
- GitHub's last main workflow at `b5eb858` succeeded. The older `3fc65f4` run failed. Releases v1.0, v1.1 and
  v1.2 exist; v1.2 is the latest published release in the observed list. Under the new owner instruction these
  facts inform the history only; they do not justify creating v1.3 now.

### 2.4 Behaviour and compatibility [V/A]

I agree with retaining:

- Full diagnostics for returned/stored ratings, `record`, `onRate` and display-rating tasks; no stored `'skipped'`.
- Current generator/model/policy versions, fixtures, stored origins, `made`, skips and matched `gen-v3` replay.
- Fold-ordered acceptance, immediate seen-history, history retained after all endings and capacity trimming.
- One-puzzle-per-press UI, newest-first visual cards, unchanged offers and no new service level.
- No P7 composite and no P1-P5 production port in this phase.

[A] The original stage-4 report remains historical. The new joint report should explain that T12-T14 already
completed the implementation and measurement, rather than edit the older report to conceal its omission.

## 3. Disagreements and corrections needed in the joint text

### CR-P1-01: pool-width coverage needs an explicit ruling, and my proposed direct width-8 test is invalid

[V] Plan v4's "Tests every phase keeps" names 1, 2, 4 and 8 workers. The named progressive production-client test
actually compares 1 and 4 (`tests/generation-client.test.js:1340-1355`); the completion-pass scripted test compares
1, 2, 3 and 4 (`:561-594`).

[V] The production pool has `MAX_POOL_SIZE = 4` and **rejects** a requested size 8
(`core/browser/worker-pool.js:75,194-196`). The `realHarness(size)` used by `runRecipe` passes that size directly
to `createPool` (`tests/generation-client.test.js:1214-1229`).

I verified the counterexample without starting a worker:

```
createPool({ size: 8, workerFactory: ... })
=> RangeError: pool size must be an integer from 1 to 4
workerFactory calls: 0
```

[V] The existing experimental `tools/ig-proto/variants/w8.json` changes the limit **in a copy**. Its description
expressly calls it an unadmitted upper bound, not a production-width policy.

[A] Therefore:

- **My round-1 sections 1, 3.6, 5.5, 6/T5 and task P1-02 must not be implemented as written.**
  Simply adding `runRecipe(8)` fails before generation; widening production `MAX_POOL_SIZE` would improperly
  introduce P8. I withdraw that direct-test prescription.
- SA-Opus's "no test change; all gates complete" also needs the explicit evidence/ruling for the plan's
  eight-worker clause; today's passing tests should not be described as having exercised eight production workers.
- Keep supported production-width verification at 1, 2 and 4 if extending the existing test. If a new explicit
  eight-worker witness is required, use a separately specified **test-only isolated pool/client harness against
  current source**, not a shipping pool-limit change and not a relabelled provisional P6 benchmark.
- Finalize the precise evidence treatment under merged Q-P1-3 before tasks are written. No timing campaign is
  implied by a functional invariance witness.

Suggested replacement for the joint plan's gate description:

> Production `createPool` supports widths 1-4 and retains that limit. The current progressive test observes
> widths 1 and 4; other current client cases cover width 2. The plan's eight-worker invariance clause is an
> isolated-verification question, not production admission. The SAs name its adopted evidence or its bounded
> test-only witness under Q-P1-3; no test claims eight-worker coverage by invoking an API that rejects it.

### CR-P1-02: the corpus adoption argument should bind the dependency closure, not just three files

[V] SA-Opus's phase-1 gate rows cite unchanged `deduce.js`, `tiling.js`, `dlx.js` plus the P6 tests. That is useful,
but the deduction also depends on policy/limits, levels/qualification, geometry, placements and workspace.
My audit checks all **nine runtime dependency files**, the intact historical **713-item** full reference
evidence and all **12** indexed observation/corpus inputs.

[A] Use that stronger source-bound argument for adoption, while retaining P6-specific tests separately.
The historical P7 report is not a fresh P6 diagnostic-equivalence run and does not approve any P7 candidate.
Suggested gate text:

> The unchanged deduction gate is adopted from the complete reference-corpus evidence and its byte-equal
> nine-file runtime dependency closure, under the joint SA ruling. P6's lean/full returned-rating, observer,
> stored-claim and replay equality are verified by their own tests and unchanged fixtures.

This agrees with SA-Opus's no-new-benchmark recommendation but makes the evidence boundary explicit.

### CR-P1-03: do not reuse the analysis runner as a fail-closed qualification gate

[V] All four existing logs genuinely pass. This finding does **not** invalidate those results.

[V] `evidence/sa-opus/p1-verify.ps1` passes `-AllowExit1` and never tests the resulting status or TAP failure count
before proceeding. The helper deliberately does not throw on exit 1 when that switch is set
(`tools/ig-proto/lock/ig-lock.ps1:115-120`). Thus a test command that exits 1 can be followed by successful commands
and an overall successful PowerShell-script exit.

[A] The task pack cannot use the analysis's proposed "p1-verify.ps1 method" as its sole pass/fail signal unchanged.
Preserve the historical script/logs, but specify a fail-closed qualification invocation. Exact requirement:

> Every qualification command must exit 0. Do not pass `-AllowExit1`; alternatively, retain the status
> immediately and throw on every nonzero exit before the next command. A missing/malformed result, failed or
> cancelled test, or a fixture failure blocks qualification. Logging all outcomes is not a passing gate.

No new full-suite run is needed merely to establish this source-level observation.

### CR-P1-04: performance and memory wording overstates the records

**Performance [V/A].** SA-Opus's P1-B02 says "slower nowhere beyond noise". Five descriptive seeds per cell do
not establish that claim or identify every slowdown as noise. The 10x10 response ratio is 0.99951, and individual
ratios span both sides of one. No new statistical admission rule is needed; remove the unsupported conclusion.

Exact replacement for P1-B02:

> T14's descriptive paired timings and completion counts are reported under their measured conditions. They
> show gains on several measured cells, not a universal non-regression guarantee or a browser/per-press result.

Replace summary/results wording `10x10 and 12x12 Nightmare unchanged` with:

> 10x10 and 12x12 Nightmare are near parity in these five-seed Node samples (paired response medians 1.00 and 1.02).

**Memory [V].** "Within ±5%" is numerically false: process peak changes are **+5.15086%** on 14x14 Master and
**-5.07208%** on 26x26 Nightmare. Across the seven cells the process range is -5.07208% to +5.15086%; the accounted
range is -4.14073% to +3.44395%.

Exact replacement:

> Both predeclared memory checks pass on all 14 side-cells. The largest observed whole-process peak is
> 561.949 MiB against 1,536 MiB, and the accounted peak is 230.803 MiB against 1,196 MiB. The per-cell peak
> differences are descriptive, not a ±5% gate.

### CR-P1-05: qualify the Git-size estimate and the publication claim

[V] I reproduce SA-Opus's object counts, but the quoted 18.2/47.4/32.2 units are **MiB**, not decimal MB:

| Reachability at `006ca68` | Objects | Sum of local `objectsize:disk`, bytes | MiB |
|---|---:|---:|---:|
| `origin/main` | 2,985 | 19,051,595 | 18.1690 |
| `origin/main..006ca68` | 3,315 | 49,706,791 | 47.4041 |
| `origin/improve-generating..006ca68` | 1,519 | 33,735,316 | 32.1725 |

The largest added blob is `t16-reach.json`: **6,514,650 uncompressed Git-blob bytes**. Its local disk representation
is 849,305 bytes. These are different measurements.

[A] Summing the local object representations is not a guaranteed increase in GitHub pack/clone/download size:
packing, delta bases, shared reachable objects and repacking affect that. Replace "certain", "main grows x3.6"
and the consequent definite clone-time claim with:

> At `006ca68`, the additional reachable objects sum to 47.404 MiB in this local Git representation. This is
> a repository-footprint indicator, not a measured network transfer or a guaranteed GitHub clone/repack increase.

[V] T14's comparison already exists at published PR head `826ce79` (`git cat-file -e
826ce79:docs/improve-generating/evidence/phase1/P6-bench/compare.md` succeeds; the remote points to that commit).
The older option-B claim that the research branch must be newly pushed for **T14** links to resolve is therefore
too broad. The later stages-2-4 records are unpushed at that snapshot; T14 is not. The new owner instruction
supersedes option B in any case.

### CR-P1-06: avoid claims about the owner's belief and trivial history coverage

[V] The owner's messages approve starting phase 1 and then continuing phase 2 in one unmerged PR. They do not
state his belief about whether T12-T14 already existed.
[A] Replace "the owner believed..." / "certain" with:

> The earlier hand-over could be read as saying phase 1 still needed implementation. The joint report should
> clarify that T12-T14 already delivered and measured it.

[V] A one-puzzle-per-press UI does not make the entire history rule trivial. A puzzle can be shown and then
removed by the final capacity check, or an error can follow its acceptance. `generator/jobs.js:427-444` records
the keys first; `:464-511` can trim the card while retaining history.
[A] Replace section 5.5's final paragraph with:

> The one-puzzle UI has no earlier multi-puzzle prefix waiting behind a later slot. The history rule still
> matters for a shown puzzle followed by finalization failure or capacity trimming, as well as for the
> controller's multi-puzzle callers. Keep the existing history and persistence checks.

### CR-P1-07: N-V4-20 is already closed, not a future hand-over item

[V] SA-Opus's P1-06 hand-over sends N-V4-20 to the next self-test edit. It was implemented by the stages-2-4
pack's **T01b**, marked complete (`tasks/improve-generating-stages-2-4/check-list.md:29,199`).
The widened `GIT_CALL` and the named `phase1/p6-bench.ps1` exception are present
(`tools/ig-proto/self-test.mjs:59-61,173-187`).

[A] Replace that hand-over clause with:

> N-V4-20 is closed by the stages-2-4 pack's T01b; retain the strengthened guard and its named exception.

## 4. Corrections to my own round-1 analysis

1. **[V/A] Withdraw the direct `runRecipe(8)` prescription.** It would throw before starting any worker.
   Do not raise `MAX_POOL_SIZE` to rescue the test. The evidence treatment is now explicitly part of Q-P1-3.
2. **[V/A] Adopt the fresh Node 26/22, fixture and staged-site evidence after checking it.** My round-1 text
   proposed fresh verification without knowing SA-Opus had already completed it on the identical base.
   Do not repeat it solely for this cross-review or a documentation-only change. A later source/test change
   needs its appropriate fresh gates.
3. **[V/A] Add CI's actual major version and platform to the plan.** Windows Node 22 passes, but does not equal
   an Ubuntu CI execution. A future complete four-command refresh projects about 7.4 minutes of node+quiet
   from these observations, not my earlier three-command 4.34 minutes; four 300-second limits plus quiet
   have a 1,380-second planning ceiling. Neither is a new allowance or a predicted lock-contention wait.
4. **[V/A] Add the independently verified PR/deployment facts.** My initial analysis stopped at readiness rather
   than inspecting the existing release vehicle. PR #11 is open with the earlier phase-1 head; deployment is
   a separate workflow action, not an automatic consequence of updating this working branch.
5. **[V/A] Apply the new owner route.** No standalone phase-1 release, no merge and no GitHub release now.
   The next feature is phase-2 analysis only after this plan is final.
6. **[A] Scope all adopted evidence to the phase-1 checkpoint.** Once phase 2 changes production, the final
   combined PR will not still have only the three P6 file changes or T14's source digest. Phase 2 must supply
   its own required production validation; phase-1 adoption cannot qualify the future combined runtime by itself.

The initial analyses remain historical. These corrections and the joint rulings belong in the new joint report
and plan, rather than silently rewriting their independent starting positions.

## 5. Merged question list

| Question | Status after the owner's follow-up | Disposition |
|---|---|---|
| Q-P1-1: release route, owner | **Answered** by 1574937911546085528 / `a90c2d0` | Phase 1 and phase 2 in one PR, not merged. Prefer continuing existing PR #11; no new route question identified. |
| Q-P1-2: GitHub release, owner | **Answered for now** | No release/tag/deployment now. No standing authorization for a later release. |
| Q-P1-A1: source-bound adoption, joint SAs | **Merged into Q-P1-3** | Withdraw the duplicate identifier, not the substantive gate question. |
| Q-P1-3: phase-1 evidence and remaining verification, joint SAs | **Kept, clarified below** | Decide the adoption/corpus/pool-width evidence before the plan is final. No supervisor contact is needed under the delegation. |

### Q-P1-3 — Proposed merged wording

**Decision [A]:** adopt the existing phase-1 implementation and source-matched T14 timing/memory evidence,
the complete reference corpus plus its unchanged dependency closure, and the now-verified current suites/fixtures;
state how the plan's eight-worker clause is evidenced without changing the shipped four-worker limit.

**SA-Astra's proposed joint ruling [A]:**

- **No new P6 timing campaign or mandatory functional browser-page run for this unchanged phase-1 snapshot.**
  There is no runtime delta from the measured P6 pair, and the plan's phase-1 gate adds no browser requirement.
  Static site validation has independently passed, but is not a functional browser test. Browser qualification
  and first-puzzle service-level measurements remain outside this phase; no such claim is made.
- Adopt the current verification only for the unchanged phase-1 source/test snapshot, with fail-closed gates
  for any future verification task.
- Keep production `MAX_POOL_SIZE = 4`. My former direct eight-worker task is withdrawn.
- Before finalizing, the two SAs must name either the sufficient adopted proof of the eight-worker invariance
  clause or the precise bounded **test-only isolated** witness for it. Current `runRecipe(1/4)` tests are not
  eight-worker execution, and an isolated witness is not production P8 admission.
- If a genuinely new measured scope is subsequently required, enumerate and price it for the owner before
  running it; no old allowance is reopened.

**Still open [A]:** the exact pool-width evidence disposition and its task consequence. Source-bound adoption and
the no-new-timing recommendation are supported. This technical point, not a renewed release-route question,
is what the SAs need to settle jointly.

## 6. Evidence and commands

[V] New files, only in SA-Astra's allowed folders:

- `evidence/sa-astra/cross-review-audit.mjs`
- `evidence/sa-astra/cross-review-audit.json`
- `evidence/sa-astra/cross-review-audit-log.txt`
- this cross-review.

[V] The audit retains Git/GitHub snapshots, exact read-only commands, object counts/units, test-log summaries,
memory arithmetic, the zero-worker size-8 counterexample, the static staging manifest and source hashes.
It binds **143 input files**. Its temporary site directory is removed.

```
node docs\improve-generating-phase-1\evidence\sa-astra\cross-review-audit.mjs
npm run check
```

[V] Remote reads: `gh pr view 11`, `gh run list --branch main`, `gh release list`, `gh release view v1.2`,
and `git ls-remote`. No remote state was changed.
[V] Current production, tests, tools, package and workflow remain unchanged from `006ca68`.
[V] **New engine/benchmark time in this cross-review: zero.** Existing test logs were read, not rerun.
