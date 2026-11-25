# Improve generating, phase 1: joint report

Status: **Final joint report, accepted by SA-Astra and SA-Opus, 2026-11-25 (base c63c553).**
Authors: SA-Astra and SA-Opus. Date: 2026-11-25.
Source/test base: `006ca68`; governing follow-up: `c63c553` (documentation only).

## Summary

1. Phase 1 already exists: P6 in T12 (`fb893c3`), the streaming/history checks in T13 (`373e74a`), the bench in T14 (`826ce79`).
2. Its source still matches T14. We adopt that evidence; we do not rebuild P6 or run another timing campaign.
3. One small test change remains: add width 8 to the existing deterministic **fold simulation**, not to the production pool.
4. Production remains limited to four workers. Puzzles, ratings, versions, replay, history and UI behaviour stay unchanged.
5. After that test change, refresh the Node 26/22, fixture, convention and static-site checks, then record readiness.
6. The owner now requires **two unmerged PRs**: phase 1 in PR #11; phase 2 on `gen-v4`, in a new PR into `main`.
7. Close phase 1 and update PR #11 first; then branch `gen-v4` from that close-out and start phase 2's separate analyze feature.

## 1. What the owner asked, and what was already done

The owner first answered "Phase 1 có" (start phase 1). His follow-up, Discord message
1574937911546085528 at 2026-11-25 07:00:59 +07:00, is:

> Tiếp tục làm các phase 2 đến khi xong, gom trong 1 PR (không merge)

That was recorded at `a90c2d0`. The owner superseded its **one-PR** clause at 07:46 +07:00:

> vậy cần tách 2 PR cho 2 phase này. Khi xong phase 1, hãy cập nhật PR hiện tại với chi tiết các thay đổi. Sau đó
> tiếp tục làm phase 2 trong branch khác, PR khác.

The current instruction is recorded in [request.md](request.md), commit `c63c553`: phase 1 stays in PR #11
(`improve-generating` into `main`), updated with the details when phase 1 is done. Phase 2 uses branch `gen-v4`,
created from `improve-generating` after its phase-1 close-out, and a **new PR into `main`**. Neither PR is merged.
The branch origin and the PR base are different on purpose.

The earlier stage-4 hand-over could be read as saying phase 1 still needed implementation. The older v4 pack
actually completed it on 2026-11-18:

| Work | Current branch commit | Result |
|---|---|---|
| T12, P6 | `fb893c3876e1bc2adaafbe258c7cf857f652d008` | Search profiles without observers omit the DLX diagnostic; the returned rating is completed. |
| T13, progressive presentation/history | `373e74a57a7c05de0b92eb03cb6eb7ee4e6f8281` | Tests and documentation pin existing fold-ordered streaming and shown-puzzle history. |
| T14, production bench | `826ce79dcc4a77daaaea00894a6dcea46bcbd8b7` | Four-worker identity, timing and both memory checks; N-V4-12 closed. |

These are committed and unreleased. The historical stage-4 report and task records stay as written; this report
supplies the correction and the current close-out. P7 has no production item: the spike candidates were slower.

## 2. Evidence we checked

### Source and compatibility

- The 40-file measured-source digest is
  `a51e8196fd16ef24a785dd9ea39663a454c6ea3574e7011ea074e0cd99c334c4`, equal to T14's P6 source.
- Production and tracked tests at `006ca68` match T14's new-side commit
  `27c6189e40bfe2000a454f755797c5745d7c2e84`. The later `record-fixtures.mjs` change only normalizes LF/CRLF
  in its replay-case comparison.
- Against remote main `b5eb858`, only `core/engine/clues.js`, `difficulty.js` and `types.js` differ in the
  deployed files. Main's deployed files match T14's old side, frozen `3fc65f4`.
- All three generation/replay fixtures retain their frozen contents after line-ending normalization.
- The entire nine-file runtime dependency closure of `measureDeduction` is unchanged. The corpus equality
  clause therefore rests on unchanged code/inputs, with P6's separate lean/full, observer and replay tests
  checking the diagnostic boundary. The 713-item historical P7 report is context, **not a new P6 corpus run**.

SA-Astra's `evidence/sa-astra/phase1-audit.mjs` recomputed T14's comparison exactly from its four bound reports.
Both SAs independently checked the source bridges and the relevant code.

### T14's historical measurements

Conditions: Node v26.13.0, four workers, cold, a fresh process per request; five seeds per cell,
`landscape/<cell>/0` through `4`.

| Cell | Reached ten, old / new (each of 5) | Equal pairs | Paired response ratio old/new, median |
|---|---|---:|---:|
| 14x14 Master | 5 / 5 | 5 | 1.14669 |
| 26x26 Master | 5 / 5 | 5 | 1.20652 |
| 26x26 Expert | 5 / 5 | 5 | 1.14279 |
| 26x26 Nightmare | 5 / 5 | 5 | 1.32283 |
| 10x10 Nightmare | 4 / 4 | 5 | 0.99951 |
| 12x12 Nightmare | 5 / 5 | 5 | 1.02356 |
| 18x18 Nightmare | 5 / 5 | 5 | 1.13278 |

All **35 pairs** have equal production result digests and summaries at equal accepted counts, including the
nine-puzzle 10x10 pair. Those digests cover ordered layout/clue keys and scores, not every stored rating field;
the P6 and fixture tests cover the full-rating contract.

Both memory checks pass on all **14 side-cells**, with `model-too-large` zero:

- Whole-process peak: **561.949 MiB** against **1,536 MiB**.
- Accounted peak: **230.803 MiB** against **1,196 MiB** at four workers.

T14 used **2,244.925 counted seconds** of its separate historical 2,700-second allowance. That allowance and
the closed frozen round are not reopened.

These are descriptive Node results, not a universal non-regression proof, browser qualification or a first-puzzle
service level. T14's T1 ends at set validation/calibration, not at a user's first playable Generator card.
The 10x10 and 12x12 samples are near parity, not a proof of zero cost. No "within ±5%" memory claim is needed:
the actual memory criteria pass.

### Current verification

At `006ca68`, SA-Opus ran the full suite on Node **v26.13.0** and **v22.23.5**: each **1,514 passed**, no failed,
cancelled or skipped tests. Both fixture checks passed. Node 22 is the workflow's major version; these local
runs were on Windows, not Ubuntu CI.

Both SAs checked the static Pages assembly. SA-Astra independently reproduced the stamp and site check:
414 references in 91 of 114 stamp-eligible files, 120 staged files total; `check-site: OK`. This is not a
functional browser run or a deployment.

Those observations are valid evidence for the unchanged base. Because the planned fold test changes, the
close-out refreshes the required checks after that edit. Documentation-only commits afterwards need source/test
identity and static checks, not repeated full suites.

## 3. Joint technical decisions

The SAs decide these technical points under the owner's delegation to answer supervisor questions jointly
(`request.md`, 2026-11-23 instruction). Their concrete contracts are in [plan.md](plan.md).

| Question | Decision |
|---|---|
| Q-P1-A1, absorbing Q-P1-3 | Adopt T12-T14 with source, fixture and report bindings. Use the complete nine-file deduction closure and P6-specific tests for the equality argument. No new P6 bench or mandatory browser-page run. |
| Q-P1-A2 | Add 8 to the existing fold simulation's `[1, 2, 3, 4]` loop. Keep both seed cases and all three shuffled orders. Do not call `runRecipe(8)` or raise production `MAX_POOL_SIZE`. |
| Q-P1-1b | Answered by the owner's second follow-up (`c63c553`): finish phase 1, push `improve-generating` and rewrite PR #11's description with the details of its changes; then phase 2 uses `gen-v4` and another PR into `main`. Neither is merged. |

The width decision is deliberately narrow. `createPool({ size: 8 })` throws before starting a worker; the
test's `simulate(ctx, memo, width, orderSeed)` has no such production admission limit. It runs the real candidate
function and the same fold with simulated completion order, so width 8 tests the fold property without admitting
eight real production workers (`tests/generate.test.js:782-833`).

## 4. Behaviour that stays fixed

P6 keeps `rate` and `rateDetailed` canonical. A seam, recorder or `onRate` still sees full diagnostics;
`completeDiagnostic` completes successful selection results before they leave the call. A stored
`dlxStop: 'skipped'` remains invalid. The work meter and observer exceptions are unchanged.

The client emits accepted puzzles only as the fold consumes them. The Generator immediately records each
shown puzzle's layout/clue keys, seed and provenance. Those keys survive completion, every shortfall, cancellation,
failure, a final pack-size trim and later card removal. Reset history remains explicit and does not rewind the
batch counter. Persistence retains its existing debounce/flush/best-effort contract, not a new crash guarantee.

No version or schema changes: `gen-v3`, `mixed-v3`, `difficulty-v3`, RNG, `APP_VERSION`, packs and stored provenance
remain as before. The existing `gen-v3` replay fixture still **matches** in phase 1. Its future phase-2 treatment
is not implemented early.

There is no UI or locale change in English or Vietnamese. The page still requests one puzzle per press,
lists cards newest-first and disables Play while busy. The history rule is still meaningful for a shown card
later trimmed or followed by a failure. No offer or service-level criterion changes.

## 5. The phase-1 close-out and PR #11

The short pack will:

1. Write a source-bound adoption record, keeping the original observations intact.
2. Extend the existing fold-simulation test and its living-specification test-table sentence.
3. Run fail-closed verification: full suites on Node 26 and 22, both fixture checks, conventions and static site.
4. Write a readiness note and PR #11's detailed description: what phase 1 changes, its checks and limitations,
   and what remains outside it.
5. Push the verified phase-1 close-out on `improve-generating` and rewrite **PR #11's description**, checking
   that it remains open, unmerged and on the published head. This is phase 1's last task.

The description names the three engine files, five test files, relevant design-detail sections and actual
close-out results. It also discloses a known pre-merge documentation item: the English and Vietnamese developer
guides do not yet name `tools/ig-proto/`; a later documentation task must add that line before any merge.

After that close-out, the orchestrator creates `gen-v4` from the published phase-1 head and starts the separate
phase-2 feature. Its new PR targets `main`; phase-2 commits do not continue on PR #11's head branch.

The verification runner must stop on any nonzero command exit. The analysis wrapper's `-AllowExit1` collection
mode is not a qualification gate. Current passing logs are valid; future checks must fail closed.

The PR's lack of automatic checks is explained by `.github/workflows/pages.yml`: it runs on pushes to main
and manual dispatch, not PR updates. Do not dispatch that deployment workflow for PR validation. No main push,
merge, tag, GitHub release or deployment is part of this phase.

No new timing allocation is requested. Qualification uses the shared lock and full 45-second quiet. Its node
time plus quiet is projected at roughly 8-10 minutes including the focused test; lock contention can add wall
time. Each invocation is bounded at 300 seconds.

## 6. Hand-over and limits

- Phase 1 can close independently of the original
  `Phase 0: FAIL (control 26x26-nightmare: fail)`. That result is not reclassified.
- D-S24-35's later phase-2 scope remains: today's search on 26x26 Nightmare, with `gen-v4` proposed for the other
  boards and its required production/replay/`require` validation. Phase 1's P6 gain does not overturn the failed
  frozen `gen-v4` control.
- Phase 2 opens as a separate analyze feature after this plan is final **and phase 1 is closed out and PR #11
  updated**, on the new `gen-v4` branch. No merge or release is needed or authorized.
- Since phase 2 branches from the unmerged phase-1 head but targets `main`, its PR initially includes the
  phase-1 commit prefix. State that dependency and show phase-2 changes against the recorded fork point;
  do not pretend its main-based diff is disjoint or silently retarget/rebase it.
- The phase-2 runtime needs its own validation; T14 cannot qualify that changed runtime.
- N-V4-20 is already closed by the stages-2-4 pack's T01b. Keep its strengthened guard; do not reopen it as an
  unfinished phase-1 item.

## 7. Evidence and review

- Both independent analyses and cross-reviews under `sa-astra/` and `sa-opus/`.
- `evidence/sa-astra/phase1-audit.mjs`, `.json`, `.md`, `phase1-audit-log.txt`: T14 recomputation and source/fixture
  bindings.
- `evidence/sa-astra/cross-review-audit.mjs`, `.json`, `cross-review-audit-log.txt`: PR/CI/source checks, memory
  arithmetic, pool-limit counterexample and independent static-site check.
- `evidence/sa-opus/p1-verify.log` and the four command logs: current full-suite and fixture results.
- `evidence/sa-opus/p1-xr-checks.md`: deduction closure and the existing fold/client width cases.
- Historical source: `docs/improve-generating/evidence/phase1/P6-bench/compare.json` and its bound reports;
  `tasks/improve-generating-v4/T12-p6-diagnostic-for-returned-ratings.md`,
  `T13-progressive-presentation-history.md`, `T14-p6-phase1-bench.md`.

**Sign-off:**

- SA-Astra (drafter): accepted, 2026-11-25; the final plan and report include RR1-RR3.
- SA-Opus (reviewer): accepted, 2026-11-25; his condition RR1 in `sa-opus/review-report-plan.md` is satisfied
  by the plan's PR-description requirement.

No implementation gate for the new width-8 line is claimed to have run while preparing these documents.
