# Phase 1: independent analysis, round 1

Author: **SA-Astra**. Date: 2026-11-25. Repository: `Q:\git\pentomino`; branch `improve-generating`;
analysis base `006ca68ff447c8e39c33deaf517df82b3dc6d602`.

**Evidence convention:** [V] means checked against source, Git objects or existing records; it does not mean a
new engine run. [A] means a recommendation, interpretation or estimate. I have not read SA-Opus's analysis
folder for this feature. Production code, tests, historical records and plans are unchanged.

## 1. Summary

1. [V] Phase 1 is already implemented on this branch: P6 at `fb893c3`, progressive/history checks at `373e74a`.
2. [V] T14 (`826ce79`) already supplied the four-worker timings and both memory gates; N-V4-12 is closed.
3. [V] Today's 40-file measured-source digest exactly matches T14's P6 source; runtime and tracked tests match it.
4. [V] Re-reading the four reports reproduces all 70 rows, 35 equal pairs and 14 passing memory side-cells.
5. [A] Complete a small **verification/adoption close-out**, not a second P6 or streaming implementation.
6. [A] Make the existing progressive-client test explicitly cover 1, 2, 4 and 8 workers; retain default width.
7. [V] Full diagnostics, stored `gen-v3` identity, replay, fold order and shown-puzzle history already have coverage.
8. [A] Jointly ratify adoption of unchanged-kernel corpus evidence; refresh the full suite and both fixture checks.
9. [A] No new timing experiment, offer, service level, deadline, P7 item or phase-2 code belongs here.
10. [V/A] Starting this work is not merge/release approval; the owner retains that separate decision.

## 2. Understanding of the request

### Goal and users

- [V] The owner answered **"Phase 1 có"**, accepting the offer to start phase 1. The governing request defines
  P6, fold-ordered progressive presentation and their own identity/history gates, independently of phase 0's
  outcome (`docs/improve-generating-phase-1/request.md:12-39`).
- [A] The product goal is the already-approved, same-puzzle improvement: avoid unused DLX diagnostics without
  changing results, and show fold-accepted puzzles promptly without losing their novelty history.
- [V] The affected users are Generator users, people reopening saved sets/puzzles or Generation steps, and the
  Player's users of display ratings and shared puzzles. The production client is also used by the CLI and bench
  (`core/browser/generation-client.js:1-5`; `core/browser/display-rating.js:1-9`).

### Binding constraints

| Kind | Constraint and source |
|---|---|
| [V] Authority | Plan v4 P6, OD-P2, IG-P-D2 and phase-1 gate bind this work (`docs/improve-generating/plan.md:348-356,660-708`). |
| [V] Existing implementation | The earlier v4 pack explicitly includes phase 1 and marks T12, T13 and T14 complete; its hand-over calls the production changes committed and unreleased (`tasks/improve-generating-v4/check-list.md:14-20,60-62,689-700`). |
| [V] No phase-2 substitution | D-S24-35 concerns a later `gen-v4` pack. It does not change phase 1's generator version or authorize its production rollout (`request.md:38-39`; `stage4-report.md:389-416`). |
| [V] No P7 adoption | The spike gave no go; no P7 composite belongs to phase 1 (`stage4-report.md:393-395`). |
| [V] Observers/replay | P6 retains the diagnostic whenever `record` or `onRate` observes ratings; replay's measuring step must equal the stored claim (plan v4:809-814; `clues.js:271-280`). |
| [V] Same behaviour | Offer criteria, score/model, uniqueness, AR1, centre rule, budgets, default pool width, puzzle identities and existing fixtures do not change. |
| [V] Shared machine | Real test/engine work uses `Invoke-IgNode`; no idle declaration is in force, so use 45 seconds quiet (`tools/ig-proto/lock/ig-lock.ps1:39-80`). |
| [V] Format/scope | Analysis writes only this SA's folders, CRLF/UTF-8 without BOM. The living specification follows current code; historical task/measurement records stay historical (`AGENTS.md:3-22`). |

### Assumptions made explicit

- [A] "Start phase 1" means finish and verify the approved phase, not redo changes that already exist.
  The new sub-plan should correct the apparent pending-work impression without editing the closed stage-4 report.
- [A] Source-identical historical measurements may be adopted with explicit bindings and limitations; they must
  not be relabelled as fresh runs at `006ca68`. The joint SA ruling in section 9 settles the corpus-gate treatment.
- [V] Progressive *arrival* is not a request for a multi-puzzle UI or early Play while busy: the current page
  requests one puzzle per press, displays newest cards first, and disables Play during a job
  (`generator/app.js:31-32,94-96`; `generator/ui/puzzle-panel.js:358-412,487`).
- [A] Those UI choices remain. Changing them would be new user-visible scope, not implementation of missing P6.

## 3. Current state

### 3.1 The important discovery: T12-T14 are not pending [V]

| Existing task | Current branch commit | What it already did |
|---|---|---|
| T12 | `fb893c3876e1bc2adaafbe258c7cf857f652d008` | Implemented P6 in `difficulty.js`, `clues.js`, `types.js`; added rating/selection checks and updated the living detail. |
| T13 | `373e74a57a7c05de0b92eb03cb6eb7ee4e6f8281` | Pinned existing streaming order and short/cancelled/failed/size-dropped history; documented the policy. No runtime change. |
| T14 | `826ce79dcc4a77daaaea00894a6dcea46bcbd8b7` | Published the paired production benchmark and memory checks, closing N-V4-12. |

[V] The task execution logs report T12's 1,512/1,512 full tests and T13's 1,514/1,514, both fixture checks and
conventions passing. These are historical results, not tests I ran today
(`tasks/improve-generating-v4/T12-p6-diagnostic-for-returned-ratings.md`, Execution log;
`T13-progressive-presentation-history.md`, Execution log).

[V] `phase1-audit.mjs` independently proves:

- The current measured-source digest is
  `a51e8196fd16ef24a785dd9ea39663a454c6ea3574e7011ea074e0cd99c334c4`, exactly T14's new digest.
- Across production and bench paths, only `core/engine/clues.js`, `difficulty.js` and `types.js` differ from
  frozen `3fc65f4`. All production, Generator, Player and tracked test files match T14's measured commit
  `27c6189e40bfe2000a454f755797c5745d7c2e84`.
- The three fixture files still match the frozen source after LF normalization.
- `tools/record-fixtures.mjs` has one later verification-only change: its replay-case comparison normalizes
  LF/CRLF (`:539-542`). It changes neither recipe nor fixture. The fresh fixture checks should use today's tool.

[A] Therefore there is no evidence-based reason to reimplement P6, streaming or the history rule.

### 3.2 P6's actual boundary [V]

`core/engine/difficulty.js:280-295` has one shared `dlxDiagnostic(model, dlx)` which runs `solveFirst` and derives
`B`, `branchTrials`, `rowTrials`, `dlxStop`. None enters `scoreV3` (`:102-142`).

| Entry/route | Current behaviour |
|---|---|
| `measureV3Core(..., keepDetail, withDlx = true)` (`:311-397`) | Same deduction, caps and census. With `withDlx = false`, only the four diagnostic fields become zero/`'skipped'`; U=0 retains its canonical complete-witness result. |
| `rate`, `rateDetailed` (`:423-443`) | Full diagnostic. Detailed measurement copies the owned deduction detail before workspace reuse. |
| `rateLean` (`:453-456`) | Internal search rating, no DLX traversal; never a stored claim. |
| `completeDiagnostic` (`:466-473`) | Completes a skipped diagnostic with one model/traversal, returning a new rating; does not mutate the lean input or rerun deduction. A full rating is returned unchanged. |
| `selectClues` (`core/engine/clues.js:271-280,542-553`) | Seam first; recorder uses `rateDetailed`; `onRate` uses `rate`; otherwise `rateLean`. `conclude` completes every successful returned rating. |
| Display task (`core/engine/tasks.js:194-195`) | Uses full `rate`. Older-model display ratings are derived separately and never overwrite stored claims (`core/browser/display-rating.js:1-42`). |

[V] "Accepted" here is the successful **selection-call result**, not a promise to postpone all diagnostics until
the main-thread fold accepts a worker candidate. A later fold rejection can discard an already completed candidate.
That is T12's explicitly approved boundary; further postponement would change interfaces and is not proposed.

[V] `charge` still meters the original search work, not the DLX diagnostic (`clues.js:341-361`).
Existing observer checks cover same results/skips/RNG draws and unchanged exception propagation
(`tests/replay-recorders.test.js:260,351,729,780,1199,1338`).

[V] The P6 tests exercise canonical completion, key order, input immutability, an unfinished census, a complete
witness, rejected stored `'skipped'`, and unobserved/onRate/recorded selection equivalence, including `require`
(`tests/difficulty.test.js:504-568`; `tests/clues.test.js:981-1034`).

### 3.3 Progressive delivery and history already work [V]

1. `foldStart` admits a matching calibration and freezes request-start histories. `foldAccept` resolves novelty
   against the growing accepted history in slot order; `dispatchOrder` controls only speculative work
   (`core/engine/generate.js:461-510,570-642`).
2. The client may finish workers in another order, but consumes `foldNext(state)` before calling `accept`.
   Only `accept` emits `onAccepted`, including `made`; rejected/speculative outcomes are not shown
   (`core/browser/generation-client.js:915-934,1094-1133`).
3. `generator/jobs.js:427-444` synchronously appends the streamed puzzle, seed and provenance, and calls
   `addSeenKeys`. Finalization merges rather than rolls back history (`:457-511`).
4. Cards update from that store immediately. Arrival/creation order remains the fold order; the visual list is
   deliberately newest-first (`generator/ui/puzzle-panel.js:358-412,645-646`).
5. Cancellation, timeout and worker failure retain the accepted prefix. A puzzle removed for the final pack-size
   check can disappear from the list but keeps its keys; this is already an explicit policy
   (`generator/jobs.js:464-511`; `docs/design-detail.md:1507,2560`).
6. Removing one/all cards keeps history; Reset history clears it without rewinding the batch counter
   (`generator/state.js:1550-1579,1601-1625`).

[V] Existing tests cover prefix visibility while a batch remains pending, each ending, size-drop history,
idempotent finalization, stale replies and persisted origins
(`tests/generator-controller.test.js:446-531,615-650`;
`tests/generator-state.test.js:355,466-497`).

[V] Persistence is debounced by 300 ms, flushed on page hide/navigation, and best effort with a warning on failure
(`generator/state.js:1205-1302`; `generator/app.js:132,307-313`).
[A] Do not recast the logical "shown is seen" policy as a new crash-proof/write-ahead-storage guarantee.

### 3.4 Identity and replay [V]

- Runtime remains `APP_VERSION = '1.0.0'`, `ALGO_ID = 'gen-v3'`; the recorded tuple also remains
  `policy: mixed-v3`, `rng: xoshiro128ss-v1`, `model: difficulty-v3`
  (`core/engine/version.js:3-4`; the unchanged fixtures).
- `setOrigin`, per-puzzle `made`, skips and seeds persist with the puzzle. `replayKeyOf` includes the running
  algorithm/app and the complete replay input (`generator/state.js:198-215`; `generator/ui/replay-cache.js:67-80`).
- Replay supplies `record` and `charge`, so its ratings remain full
  (`core/engine/replay.js:419-443`). The strict reader rejects `'skipped'` (`core/engine/pack.js:813-814`).
- **At phase 1, the existing `gen-v3` replay fixture must still match.** Turning it into the `set-versions`
  refusal case belongs to the later `gen-v4` release, not this work. See the current matching gate
  `tests/replay.test.js:136-155` and the plan's explicitly future version rule.
- `generation-case.json`: 10x6 Hard, `any`, `fixture-set-0`, batch `fixture-set-0#1`, quantity 10.
  `replay-case.json`: 10x6 Hard, `require`, `replay-case-0`, quantity 4 and two recorded packs.
  Both and `generated-sample-pack.json` are unchanged.

### 3.5 Existing four-worker measurements, independently recomputed [V]

The four T14 reports reproduce `compare.json` exactly through the existing pure `compareReports` function,
including ledger hashes, identities, statistics and both memory checks. Inputs: seven cells, reps 0-4,
`landscape/<cell>/<rep>`, Node v26.13.0, four workers, cold, fresh process per request. No new run was made.

| Cell | Reached ten, old / new (each of 5) | Equal pairs | Paired response ratio old/new, median | Paired T10 ratio, median (n) |
|---|---|---:|---:|---|
| 14x14 Master | 5 / 5 | 5 | 1.14669 | 1.15883 (5) |
| 26x26 Master | 5 / 5 | 5 | 1.20652 | 1.20429 (5) |
| 26x26 Expert | 5 / 5 | 5 | 1.14279 | 1.13916 (5) |
| 26x26 Nightmare | 5 / 5 | 5 | 1.32283 | 1.32209 (5) |
| 10x10 Nightmare | 4 / 4 | 5 | 0.99951 | 1.01588 (4) |
| 12x12 Nightmare | 5 / 5 | 5 | 1.02356 | 1.02333 (5) |
| 18x18 Nightmare | 5 / 5 | 5 | 1.13278 | 1.13269 (5) |

- **70 valid rows, 35/35 equal pairs**, including the nine-puzzle 10x10 pair. Equality here is the production
  digest of ordered layout/clue keys and scores plus matching summaries at equal counts; it is not a complete
  serialization comparison of every rating field. The P6 and fixture tests supply the latter contract.
- Whole-process peak: **589,246,464 bytes = 561.949 MiB**, limit **1,536 MiB**.
- Accounted peak: **242,014,758 bytes = 230.803 MiB**, limit **1,196 MiB** at four workers.
- Both checks pass on all **14 side-cells**, `model-too-large` zero.
- Historical cost: **2,244.925 seconds = 37.4154 counted minutes**, four successful invocations, against a
  separate 45-minute grant. Neither that account nor the closed frozen round funds a new experiment.

[V] Sources: `docs/improve-generating/evidence/phase1/P6-bench/compare.md:1-320`,
`tools/bench/report.js:24-49,315-361`,
`tools/ig-proto/phase1/p6-bench.mjs:608-756`;
recomputation: `evidence/sa-astra/phase1-audit.json`.

[A] Five-seed Node timings are descriptive. Do not call them browser qualification, a first-visible-puzzle
service level, or a repair of phase 0's 26x26 failure. T14's T1 ends at set validation/calibration, not at a
Generator user clicking through the page to a playable puzzle.

### 3.6 Corpus evidence and remaining verification precision

[V] `measureDeduction` and its **nine-file runtime dependency closure** are unchanged from both frozen `3fc65f4`
and the P7 full-corpus reference: `deduce`, `policy`, `tiling`, `levels`, `qualification`, `dlx`, `geometry`,
`placements`, `workspace`. The existing full equality report is **713/713**, including PM4 inputs and 16 memory
observations; all 12 indexed observation/corpus inputs still hash correctly
(`docs/improve-generating/evidence/frozen/V4-P7E-p7-c1-full/p7.json:1-79,196-253`).

[A] This is a strong source-identity basis to adopt the unchanged deduction gate, not a new P6 corpus run and
not permission to ship the slower P7 candidate. The joint ruling should say precisely that.

[V] The named production-client progressive test explicitly compares **1 and 4** workers, not all four widths
named by plan v4's "Tests every phase keeps" (`tests/generation-client.test.js:1340-1355`).
[A] Extend that existing focused test to 1, 2, 4 and 8; do not broaden the production pool or add a new benchmark.

## 4. Options

| Option | Design and user effect | Cost/risk | Disposition |
|---|---|---|---|
| [A] Reimplement P6 and streaming | Duplicate the code and policy already accepted in T12/T13. | Unnecessary regression, identity and replay risk; no identified missing behaviour. | Reject. |
| [A] Evidence-adoption and verification close-out | Keep runtime, bind T14/current-source equivalence, explicitly cover four widths, refresh existing gates, publish a current readiness statement. | Small tests/docs-only work; no new timed matrix. Must separate source proof from fresh measurements. | **Recommend.** |
| [A] Repeat the corpus/bench wholesale | New generation/rating and memory runs of source-identical code. | Needs a newly priced schedule and owner approval; existing closed allowances cannot be reused. Little decision value without a source change or failed gate. | Only if the joint evidence review finds a real gap. |
| [A] Change UI quantity, enable Play mid-job, or invent a first-puzzle SLA | New interaction/scheduling or offer policy. | User-visible scope; replay/prefetch/latency risks, browser evidence and owner decisions needed. | Out of scope. |

[A] The recommended option delivers the requested phase without pretending its implementation is still absent.
It preserves the owner's earlier work and pays only for a small verification gap and current sign-off.

## 5. Proposed plan

### 5.1 Components and interfaces [A]

**Retain these existing contracts, not new APIs:**

- `rateLean(board, pieces, clues, ws)` is private-to-search in use, despite being exported for testing.
  `completeDiagnostic(...)` runs before every successful `selectClues` result leaves it.
- The priority is `ctx.rate` seam, then `record`, then `onRate`, then lean. A `charge` observer alone does not
  request full diagnostics. Preserve the existing charge order and throwing-observer behaviour.
- `AcceptedEvent` stays `{ revision, index, puzzle, made, accepted, quantity }`
  (`generation-client.js:85-105`). Every emitted puzzle has its canonical stored rating; no later diagnostic
  completion mutates an already shown/stored object.
- Keep the fold, dispatch universe, candidate seeds, novelty keys, calibration reuse, terminal reasons,
  uniqueness and default worker policy unchanged. No P1-P5 prototype configuration is copied into production.
- Keep display ratings on the existing auxiliary queue. Keep replay prefetch deferred behind active generation
  and cancelled/superseded as today (`generator/app.js:145-165`; `generation-client.js:165-178`).

### 5.2 Explicit short-batch/history policy [A, retaining verified behaviour]

| Event | Policy |
|---|---|
| Current-revision fold acceptance | Append the puzzle in creation order, its seed and `made`; insert both novelty keys into that set's history in the same store update before returning from the hook. |
| Worker completion not consumed by the fold | Not shown and not added to seen-history merely because a worker finished. |
| Complete, any shortfall, time limit, cancellation or failure | Keep the admitted prefix and its history; merge authoritative returned/error keys without erasing keys already recorded by streaming. |
| Final pack-size trim or later card removal | The card may leave the list; its seen keys remain. Preserve the current capacity notice. |
| Stale callback or superseded request | No mutation of the current set, list, provenance or history. |
| Reset history | Explicitly clear novelty keys; do not rewind the batch counter. Earlier puzzles may then recur. |
| Save/reload | Persist puzzles, origins, `made`, seeds and history under the existing schema; do not persist active jobs or trusted calibration. Retain the current debounce/flush/storage-failure contract. |

[A] "Play history" must not conflate this seen-history with the Player's move/undo history. No Player history,
progress fingerprint or saved game migration is introduced.

### 5.3 Stored identity, migration and compatibility [A]

- No bump to `ALGO_ID`, `MODEL`, `POLICY_ID`, RNG, pack/provenance or Generator storage version.
- No new table versions, budget IDs or per-set prior fields; those are phase 2.
- Keep all three existing fixtures byte-for-byte, allowing checkout line-ending normalization only.
- Current `gen-v3` replay remains matched, with the same measuring-step rating and origin/skip reconstruction.
  Keep the existing unavailable/mismatch paths for genuinely missing, damaged or differently versioned records.
- Saved replay keys remain stable because the input tuple and running versions do not change. Never invalidate
  old matched steps merely to make a phase-1 test pass.
- No rewrite of old claims or packs; `'skipped'` remains impossible in a valid stored rating.

### 5.4 UI copy in both product languages [A: unchanged]

No new UI key or text is required. Preserve the current English/Vietnamese strings and dynamic parameters;
the existing policy is already stated in `docs/design-detail.md:1507,1611,2120,2560`.

| Key | English | Vietnamese |
|---|---|---|
| `progress.cancel` | Cancel | Hủy |
| `notice.N-PARTIAL` | Found {n} of {q} different {level} puzzles within the time limit. The piece set was not changed. | Chỉ tìm được {n} / {q} đề {level} khác nhau trong thời gian cho phép. Bộ mảnh không thay đổi. |
| `message.M-CANCELLED-BATCH` | Cancelled. Kept {n} of {q} {level} puzzles. The piece set was not changed. | Đã hủy. Giữ lại {n} / {q} đề {level}. Bộ mảnh không thay đổi. |
| `message.M-FAILED` | Generation stopped: {message} | Quá trình tạo đã dừng: {message} |
| `message.M-HISTORY-FULL` | This piece set remembers {used} of {max} arrangements, the most it can keep, so no more puzzles can be generated. Reset the history to continue (earlier puzzles may then appear again). | Bộ mảnh này đã ghi nhớ {used} / {max} cách xếp, mức tối đa có thể lưu, nên không thể tạo thêm đề. Hãy xóa lịch sử để tiếp tục (khi đó các đề trước có thể xuất hiện lại). |
| `message.M-PACK-SIZE` | The list is full: “Play” opens all its puzzles as one pack, which holds at most {kib} KiB. Remove some puzzles to add more. | Danh sách đã đầy: nút “Chơi” mở mọi đề trong danh sách thành một gói, và một gói chỉ chứa tối đa {kib} KiB. Hãy xóa bớt đề để thêm đề mới. |
| `toast.saveFailed` | Your work can't be saved in this browser | Không thể lưu công việc của bạn trong trình duyệt này |

[V] Source: `generator/locale.en.js:171,175,218,241-245`;
`generator/locale.vi.js:168,172,214,237-241`.
[A] Keep the current newest-first card layout and one-puzzle-per-press control. Neither is an inversion of the
fold's acceptance order. Guides need no new behavioural promise for a tests-only close-out.

### 5.5 Evidence adoption and test change [A]

1. Publish a new, data-only adoption record under this feature. It references the historical reports, their raw
   hashes, source commits/digests, unchanged fixtures and kernel dependency closure. Keep their original identities.
2. Extend the existing progressive test, using `runRecipe` and `semantic`, to widths `[1, 2, 4, 8]`. Compare:
   event indices `0..quantity-1`, ordered puzzle IDs and `made`, semantic packs, and both histories against width 1.
   The recipe remains `fixture-set-0`, 10x6 Hard `any`, quantity 10.
3. Retain the existing pending-batch visibility and short/cancel/fault/capacity cases. Do not rebuild an alternative
   streaming implementation or add another test framework.
4. Run the existing full suite and both non-writing fixture checks through the lock; no separate quick suite
   immediately before the same full suite.
5. The SAs sign a current phase-1 readiness report. A failed gate stops for diagnosis; never refresh a fixture,
   change a version or silently reopen a timing collection to remove the failure.

## 6. Acceptance

[A] The proposed acceptance matrix includes every phase-1 gate in plan v4 section 6.

| ID | Measurable criterion | Verification and evidence |
|---|---|---|
| B1 | Same puzzles, complete returned/stored rating objects and provenance for the same effective requests. | Existing P6 observed/unobserved/recorded tests, unchanged fixtures, semantic packs at all four widths; retain T14's 35 equal observed pairs with its stated limits. |
| B2 | Puzzles become visible in fold order before a pending batch finishes; no completion-order publication. | Existing held/pending client/controller cases; expanded four-width test. Newest-first visual sorting does not change event order. |
| B3 | Every shown puzzle remains in seen-history after every terminal outcome or card/size removal. | `generator-controller.test.js:446-531,615-650`; state round-trip checks. No new crash-durability claim. |
| B4 | No changed offers, SLA, UI quantity, default width, phase-2 route or stored-version contract. | Production scope guard empty; fixture hashes/version constants unchanged. |
| T1 | `DeductionResult`/work/cap/memory-limit behaviour remains equal on the corpus. | Jointly approved adoption of the 713-item full reference evidence plus byte-equal nine-file runtime closure; do not call this a fresh P6 corpus run. If that adoption is not accepted, the gate remains open until a separately specified proof is agreed. |
| T2 | All three fixtures unchanged; both fixture checks pass using today's reader. | Hashes against frozen source; `record-fixtures.mjs --check` and `--replay-case --check`, no create/replace mode. |
| T3 | `npm test` passes on the close-out commit. | Locked `node --test` with the package's complete test glob; no failures, within the repository's 10-minute maximum and the proposed 300-second invocation cap. |
| T4 | Full observer/display diagnostics and unchanged exception/meter semantics. | `difficulty.test.js`, `clues.test.js`, `replay-recorders.test.js`, `replay.test.js`; measuring-step equality and refusal of a stored skipped rating. |
| T5 | Pool invariance at 1, 2, 4 and 8; gates still read at four. | Explicit four-width production-client test, fixed recipe; T14's four-worker metadata verified. No P8 opt-in. |
| T6 | Both memory checks pass, not missing/not-measured; no `model-too-large`. | Adopt the source-matched T14 checks: process <= 1.5 GiB, accounted <= 4 x worker budget + main budget = 1,196 MiB, all 14 side-cells pass. Structural P7 memory observations are not a substitute for these process checks. |
| T7 | No unintended runtime, fixture, identity or frozen-record change. | Scope guard; `npm run check`; new adoption record names the exact tested source and keeps all older evidence intact. |
| T8 | Phase 1 has a clear current status and release boundary. | Joint readiness report, original phase-0 FAIL preserved; owner approval required before push/merge/release. |

[V] Existing data meet the historical timing/memory and source-identity parts. [A] Fresh verification and the
four-width extension are **proposed work**, not results claimed by this analysis.

## 7. Risks, mitigations and effects

| Risk | Mitigation |
|---|---|
| [V/A] Redoing completed work because the stage-4 hand-over speaks prospectively. | Cite T12-T14 and the current source bridge first; do not create duplicate production tasks. |
| [V/A] Treating a P7 equality report as proof of all P6 diagnostics. | Separate unchanged-kernel proof from P6 rating/observer/fixture checks; require the explicit joint adoption ruling. |
| [V/A] Mistaking the two source commits for two different current implementations. | Preserve T14's `27c6189` metadata; bind today's identical digest instead of rewriting history. |
| [V/A] Reporting all phase-1 cases as ten completed. | Retain the 10x10 4/5 completion and 9/9 identity pair; T10 ratios are conditional. |
| [V/A] Conflating Node T1 with visible/playable browser latency. | No browser SLA, no offer qualification and no automatic use of early cards while the job is busy. |
| [V/A] Leaking a lean rating or changing recorded steps. | Complete before return, retain full recorder/onRate paths, strict pack refusal, unchanged replay fixture. |
| [V/A] Losing novelty history on a short batch or a size-trimmed card. | Keep synchronous `addSeenKeys`, final union and existing regression cases; retain best-effort storage semantics. |
| [A] A gate failure tempts an unrelated runtime fix or fixture update. | Stop with `QUESTION:` to the pack author; scope and identity changes require a ruling, not inference. |
| [V/A] Spending old unused allowances or colliding with Sudoku. | No measurements in this analysis; any new measured scope is priced and approved separately. Every engine/test invocation uses the shared lock and full 45-second quiet. |

[A] Performance effect of the close-out itself: none in production. The historical P6 gain remains the
descriptive result of section 3.5; no extra improvement is claimed. The two added test widths increase test time
only. Documentation work is a current adoption/readiness report and task traceability; living product documents
already describe the unchanged behaviour. If a later ruling actually changes behaviour, update both living
specifications and each affected English/Vietnamese guide in that implementation task.

## 8. Effort and phasing for break-tasks

[A] A small verification pack is sufficient; estimates below are not new machine-time grants.

| Task | Inputs and coherent deliverable | Gates/stops | Effort and machine scope |
|---|---|---|---|
| P1-01: Source/evidence adoption | This analysis, T12-T14, current source, 4 bound P6 reports, full reference corpus report and fixtures; publish a source-bound adoption record in the new feature. | Resolve section 9 jointly; all source/hash/identity/memory checks exact. A mismatch blocks adoption; no silent rerun. | SA/data-only task, about 1 h; zero new measured minutes. |
| P1-02: Four-width check and current verification | Existing `runRecipe` progressive test; add widths 2 and 8 and compare complete semantic/provenance/history results, not only arrival IDs. | One existing test file changes; production and fixtures unchanged. Full suite and both fixture checks through the lock; fail => QUESTION. | Dev about 1.5 h; historically about 4.34 counted-equivalent verification minutes before the extra widths, budget planning about 4.5-6; not a benchmark. |
| P1-03: Phase-1 close-out | Adoption and successful current gates; joint readiness note and hand-over. | No P7 adoption, `gen-v3` unchanged, no offer or phase-2 claim; owner release stop explicit. | SAs about 0.5 h; no engine run. |

[A] Order: P1-01 before P1-02 because the evidence treatment is a ruling, not a developer decision; P1-03 after
both. No task exceeds about three hours. No new production-code task is justified by the inspected base.

### Planned verification commands, not run during this analysis

[A] From the repository root, after acceptance of the task pack:

```powershell
. .\tools\ig-proto\lock\ig-lock.ps1
Invoke-IgNode -Repo pentomino -Task 'P1 full verification' -LimitSeconds 300 -QuietSeconds 45 -NodeArgs @('--test', 'tests/**/*.test.js')
Invoke-IgNode -Repo pentomino -Task 'P1 fixtures verification' -LimitSeconds 300 -QuietSeconds 45 -NodeArgs @('tools\record-fixtures.mjs', '--check')
Invoke-IgNode -Repo pentomino -Task 'P1 replay fixture verification' -LimitSeconds 300 -QuietSeconds 45 -NodeArgs @('tools\record-fixtures.mjs', '--replay-case', '--check')
npm run check
```

[V/A] The estimate uses T13's 123.369 + 0.595 + 1.269 node seconds and three 45-second quiet periods =
**260.233 seconds** before the width extension. The hard planning envelope for these three 300-second
invocations is **1,035 seconds = 17.25 counted-equivalent minutes**, excluding an unbounded competing-lock wait;
it is a ceiling, not the forecast or an approval. Keep the verification cost visible in the pack. No quick/full
duplication and no speculative browser or fresh P6 benchmark are proposed.

[A] Owner stops:

- A new measured scope, if the evidence cannot be adopted or the owner wants refreshed/browser timing: present
  its explicit design, price and allowance before any run; neither historical grant is reusable.
- Push/merge/release after qualification: a separate approval. This analysis neither changes a PR nor authorizes
  deploying a branch containing the closed round's tools and evidence.

## 9. Questions

### Q-P1-A1 — Joint SAs, under the owner's supervisor delegation

**Decision needed [A]:** may the new phase-1 sub-plan adopt the source-identical T12-T14 implementation and
historical timing/memory gates, and discharge the unchanged `DeductionResult` corpus clause by the complete
reference evidence plus its byte-equal runtime dependency closure, with fresh existing tests/fixtures and the
explicit four-width check?

**Evidence [V]:**

- Existing phase-1 tasks and N-V4-12 are accepted/closed (`tasks/improve-generating-v4/check-list.md:60-62,634,689-700`).
- The 40-file digest matches T14's measured P6 source. Production and tracked tests match `27c6189`; all
  three fixture contents match frozen `3fc65f4`.
- All four T14 publications still match their ledger hashes and reproduce the stored comparison exactly.
- The full 713-item reference-corpus record and its 12 inputs are intact; all nine runtime dependency files
  of `measureDeduction` match the reference. No new kernel is proposed.
- The P6-specific diagnostic/observer/replay tests are separate, kept, and refreshed in the full suite.

**Options [A]:**

1. **Adopt with those explicit bindings and limitations (recommended).** A tests/docs-only close-out, no duplicate
   implementation or new timing campaign; no changed owner decision.
2. Require a newly executed corpus/production timing study despite unchanged inputs. State exactly what
   existing evidence fails to establish, enumerate the missing observations and price them before asking the
   owner for new measured scope. Do not treat historical P7 candidate equality as a fresh P6 measurement.

**Blocked meanwhile [A]:** the sub-plan's final acceptance of evidence adoption; no production implementation
needs to start. This is the SAs' technical ruling under the delegation recorded in `request.md:27-29`, not a
request to contact SA-Fable.

[A] **No new owner behaviour question is needed now.** History, diagnostic visibility, versions and offers are
already decided. Release approval and any genuinely new measured scope remain later owner stops, not assumed
answers to "Phase 1 có".

## 10. Evidence index

### New independent evidence [V]

| Artifact | Contents |
|---|---|
| `docs/improve-generating-phase-1/evidence/sa-astra/phase1-audit.mjs` | Read-only Git/source bridge, historical P6 comparison recomputation, memory/identity/ledger checks, kernel dependency closure, full-corpus input hashes and fixture hashes. |
| `phase1-audit.json` | Exact outputs, all 110 input paths with raw and LF-normalized hashes, Git commands/results and input-index hash. |
| `phase1-audit.md` | Human-readable cell table, memory and compatibility summary, limitations. |
| `phase1-audit-log.txt` | Command output. No timed engine work. |

### Commands actually used [V]

```powershell
node docs\improve-generating-phase-1\evidence\sa-astra\phase1-audit.mjs
npm run check
```

[V] The scratch also records the exact read-only Git commands, notably:

```powershell
git --no-pager diff --name-only 3fc65f4 006ca68 -- core generator player tools\bench tools\calibrate.mjs tools\node-worker.mjs package.json
git --no-pager diff --name-only 27c6189 006ca68 -- core generator player tests package.json tools\bench tools\calibrate.mjs tools\node-worker.mjs
git --no-pager diff 27c6189 006ca68 -- tools\record-fixtures.mjs
```

[V] The first has exactly the three P6 files; the second is empty; the third is only the LF-normalization
change described above. No `npm test`, fixture regeneration, solver, generation, replay, browser run or
benchmark was executed for this analysis. **New counted measurement time: zero.**
