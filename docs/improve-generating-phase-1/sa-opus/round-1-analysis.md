# Round-1 analysis: improve-generating phase 1 (SA-Opus)

| Item | Value |
|---|---|
| Feature | `improve-generating-phase-1` ([request](../request.md); plan v4 §6 phase 1 "Same puzzles") |
| Author, round | SA-Opus (claude-opus-5.5), round 1, written independently (SA-Astra's folder not read) |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, `006ca68` (the request) |
| Date | 2026-11-25 |
| Evidence | `docs/improve-generating-phase-1/evidence/sa-opus/` (section 10) |

[V] marks a claim verified here (a command, a record or the code, cited); [A] marks an assumption or a judgement.

## 1. Summary

1. **Phase 1 is already built, tested and benched, but not released** [V]. The v4 pack's T12 (P6, `fb893c3`), T13
   (the history policy, `373e74a`) and T14 (the bench, `826ce79`) did it on 2026-11-18. PR #11 carries it, open and
   unmerged. My stage-4 report's §8 item 2 omitted this; the owner should hear it with his next question.
2. **Re-verified today at `006ca68`** [V]: 1,514 of 1,514 tests on Node 26 and on Node 22 (the CI version); both
   fixture checks OK; the staged site checks OK. The site files differ from `main` only in P6's three files, and are
   exactly the pair T14 measured.
3. **For users** (T14, Node, four workers) [V]: identical puzzles, faster. Master x1.17, Expert x1.14, 26x26 Nightmare
   x1.32 (the board D-S24-35 keeps on today's search), 18x18 Nightmare x1.13; 10x10 and 12x12 Nightmare unchanged.
4. **Recommendation** [A]: a release pack, not a build pack: the release gates, the PR text, one owner stop, then
   merge PR #11 (refreshed), which deploys the site through CI. The alternative is a new 8-file PR.
5. **Main risks** [A]: Option A adds about 47 MB of research objects to `main` (now about 18 MB); P6's speed is
   Node-measured, not browser-measured; a merge deploys at once, but a red CI blocks the deploy.

## 2. Understanding of the request

**The goal.** The owner answered "Phase 1 có" ("Phase 1: yes", Discord 1574929660763049985, 2026-11-25 06:28) to the
question "Phase 1 is a separate small pack. Tell us if you want it started now" (`request.md`). Phase 1 is plan v4 §6's
"Same puzzles" phase: P6 (the DLX diagnostic only for the rating that is kept, OD-P2) and progressive presentation in
fold order with the history policy stated (IG-P-D2, OD-P5 (a)). P7 has no item (S02's spike, N-V4-05 closed). Version:
identical puzzles. Gate: equality of `DeductionResult` on the corpus; fixtures unchanged; `npm test`; gates read at four
workers; both memory checks (`docs/improve-generating/plan.md:665`) [V].

**The users.**
- Players and puzzle makers using the Generator on GitHub Pages. They get the same puzzles faster; nothing else changes.
- The owner. He decides any push, merge or release (agent roles; the v4 pack's hand-over,
  `tasks/improve-generating-v4/check-list.md:726-729`) [V].

**Constraints.**
- Identical puzzles, stored ratings, work units, algorithm ids (`gen-v3`, `mixed-v3`, `difficulty-v3`), fixtures and
  replays (plan §6 phase 1; §9 "P6 and the replay steps") [V].
- Phase 1 is independent of phase 0's gate and of phase 2 (plan v4 §6; D-S24-35) [V].
- The living specification must describe the code; English and Vietnamese guides stay in step (`AGENTS.md`) [V].
- Timed runs go through the lock helper; the machine is shared with Sudoku.

**Assumptions.**
- [A] "Start phase 1 now" means getting phase 1 to production. The code exists; the only step left is the release
  (a merge to `main`, which `test-and-deploy` publishes). The owner gave this answer believing phase 1 still had to be
  built (section 3.6), so his release decision must be asked explicitly.
- [A] No new behaviour is wanted in phase 1 beyond what plan v4 approved. A service level (OD-P5 (b), N-V4-10) stays
  with the owner, later.

## 3. Current state

### 3.1 The code on the branch [V]

`git diff --stat origin/main HEAD`, outside the research folders, lists eight files (+296/-34):
- **Production (3):** `core/engine/clues.js`, `core/engine/difficulty.js`, `core/engine/types.js`.
- **Specification (1):** `docs/design-detail.md`.
- **Tests (4):** `tests/clues.test.js`, `tests/difficulty.test.js`, `tests/generation-client.test.js`,
  `tests/generator-controller.test.js`.

Everything else of the branch's 1,286 files (+2,173,527) is research: `docs/improve-generating*/`, `tasks/` and
`tools/ig-proto/`.

**P6 as built (T12, `fb893c3`):**
- `difficulty.js`:
  - `dlxDiagnostic` (`:280`) is the single DLX traversal.
  - `measureV3Core(..., withDlx = true)` (`:312`) skips it when `withDlx` is false. `B`, `branchTrials` and `rowTrials`
    are then 0 and `dlxStop` is `'skipped'`.
  - `rateLean` (`:450`) is `rate` (`:420`) without the diagnostic.
  - `completeDiagnostic` (`:466`) fills a lean rating's four fields and returns any other rating unchanged.
- `clues.js`:
  - `rateWith` (`:276-280`) rates with `rateLean` only when there is no `rate` seam, no `record` and no `onRate`.
  - `conclude` (`:549`) returns `completeDiagnostic(...)` of the kept rating, so a lean rating never leaves
    `selectClues`.
- `types.js` documents `'skipped'`.
- The strict pack reader already refuses any other `dlxStop` (`pack.js:813-814`).

**Unchanged against `main`** (an empty `git diff`): `deduce.js`, `tiling.js`, `dlx.js`, `generate.js`, `policy.js`,
`version.js`, `replay.js`, `pack.js`, `tasks.js`, `protocol.js`, `core/browser`, `core/workers`, `generator/` and
`player/`. `ALGO_ID` stays `gen-v3` (`version.js:4`), `POLICY_ID` `mixed-v3` (`policy.js:18`) and `APP_VERSION` `1.0.0`.

**Observed generations keep the full diagnostic.** Production generation passes no observer. Replays pass `record`
(`generate.js:112-147`), so the Generation steps keep the full diagnostic (plan §9; `tests/replay.test.js`).

### 3.2 Progressive presentation and the history policy (T13, `373e74a`: tests and text only) [V]

- **Streaming.** The client calls `onAccepted` in the fold's consumption order. The Generator lists each streamed
  puzzle at once and adds its layout and clue keys to the set's history (`generator/jobs.js:427-444`, `addSeenKeys`
  `:436`), then merges the batch's keys at the end (`:507-508`).
- **Design.** `docs/design-detail.md:1507` states the policy: a shown puzzle is in the history however the batch ends,
  including when it is dropped for the pack size.
- **Tests.**
  - `tests/generation-client.test.js:1340` pins the slot order at one and four workers.
  - `tests/generator-controller.test.js:481` pins the history for a short, cancelled, failed or pack-size-dropped batch.
- **One puzzle per press.** The Generator asks for one puzzle per press (`PUZZLES_PER_PRESS = 1`,
  `generator/app.js:32`, used at `:98`; the controller accepts 1 to 10, `generator/state.js:64`). In the app, a
  "batch" is a single puzzle that appears when it is accepted; multi-puzzle streaming applies to the controller's
  other callers and to the tools.
- **The user guide.** It already describes the policy from the player's side: "a cancelled batch keeps the puzzles
  already made" (`USERGUIDE.md:80-81`); "removing a puzzle does not make its arrangement available again"
  (`USERGUIDE.md:113-115`).

### 3.3 The gate's evidence [V]

| Gate item (plan §6 phase 1) | Evidence | Status |
|---|---|---|
| Equality of `DeductionResult` on the corpus | the deduction, tiling and DLX code unchanged (section 3.1); T12's tests: lean against full ratings on the six recipes, the 41-piece strip and the witness, and an unobserved search equal to an observed one | holds by construction and by test |
| Fixtures unchanged | `record-fixtures.mjs --check` "record-fixtures: OK" and `--replay-case --check` "replay case OK", today at `006ca68` | pass |
| `npm test` | 1,514 tests, 1,514 pass, 0 fail, on Node v26.13.0 (119.7 s) and v22.23.5 (144.4 s), today | pass |
| Gates read at four workers; both memory checks | T14 (`docs/improve-generating/evidence/phase1/P6-bench/compare.md`): seven cells x five seeds, four workers, cold; 35 of 35 pairs equal; both memory checks pass on 14 side-cells (process peak at most 562 MiB of 1,536; accounted at most 231 MiB of 1,196; `model-too-large` 0) | pass |
| Release: the staged site | `.github/workflows/pages.yml`'s assembly, `stamp-version` (414 references in 91 of 114 files) and `check-site --expect-version 006ca68f`: OK | pass |

**The measured pair is the release pair** (each `git diff --stat` printed nothing):
- `27c6189` (T14's new side) against `HEAD`, on `core`, `generator`, `player`, `assets`, `index.html` and `redirect.js`;
- `3fc65f4` (T14's old side) against `origin/main`, on the same paths and `sitemap.xml`.

`3fc65f4` and `27c6189` differ only in P6's three files. So T14's numbers are those of this release, and no new bench
is needed.

**T14 per cell** (paired ratio old/new, median [min-max], n; `p1-t14-ratios.md`):

| Cell | T1 (set and calibration) | T10 | Response | Response median, s |
|---|---|---|---|---|
| 14x14 Master | x1.14 [0.95-1.21] 5 | x1.16 [1.12-1.28] 5 | x1.15 [1.12-1.28] 5 | 3.2 -> 2.5 |
| 26x26 Master | x1.05 [0.97-1.28] 5 | x1.20 [1.13-1.23] 5 | x1.21 [1.14-1.22] 5 | 12.4 -> 10.4 |
| 26x26 Expert | x1.01 [0.78-1.12] 5 | x1.14 [0.99-1.24] 5 | x1.14 [1.00-1.24] 5 | 3.9 -> 3.5 |
| 26x26 Nightmare | x1.34 [0.97-1.39] 5 | x1.32 [1.21-1.42] 5 | x1.32 [1.21-1.42] 5 | 24.7 -> 18.7 |
| 18x18 Nightmare | x1.11 [1.05-1.18] 5 | x1.13 [1.07-1.15] 5 | x1.13 [1.07-1.15] 5 | 60.0 -> 52.3 |
| 12x12 Nightmare | x1.04 [0.93-1.08] 5 | x1.02 [1.01-1.07] 5 | x1.02 [1.01-1.07] 5 | 51.9 -> 51.1 |
| 10x10 Nightmare | x1.00 [0.98-1.04] 5 | x1.02 [0.99-1.05] 4 | x1.00 [0.99-1.05] 5 | 17.9 -> 18.2 |

[A] The app makes one puzzle per press, and no per-press time was measured. T1 (the new set and its calibration
puzzle) and the ten-puzzle ratios are the nearest proxies; the release text says so.

### 3.4 The release path [V]

- **PR #11**, "Improve generating, phase 1: faster ratings (P6) with identical puzzles, the history policy, and the
  gen-v4 frozen-round harness":
  - open since 2026-11-18, mergeable (`CLEAN`), no status checks;
  - head `826ce79` (`origin/improve-generating`), 479 files;
  - its body names pre-rewrite commits (`ae00ca0`, links at `cc782eb`), still calls `main` `3fc65f4`, and still
    describes stages 2-4 as "the priced plan" (`gh pr view 11`).
- **The local branch** is 70 commits ahead of `origin/improve-generating` (the stages-2-4 pack, unpushed), and 197
  commits ahead of `origin/main` `b5eb858`, its merge base (fast-forwardable).
- **CI.** `test-and-deploy` (`.github/workflows/pages.yml`) runs on push to `main`:
  - `node --test "tests/**/*.test.js"` on Node 22 (Ubuntu);
  - it stages `index.html`, `redirect.js`, `sitemap.xml`, `assets`, `core`, `generator` and `player`, stamps the version,
    checks the staged site and deploys to Pages;
  - a failure stops the deployment.

  The last runs: `b5eb858` success (2026-11-20); `3fc65f4` failure (2026-11-16, the CRLF replay-case comparison that
  PR #13 fixed).
- **GitHub releases.** v1.0, v1.1, and v1.2 (2026-10-26, generated notes for PRs #7-#9). None since: difficulty-v3
  (PR #13) is live without a release.
- **Size** (`git rev-list --objects`, objects' size on disk):
  - `origin/main` reaches 2,985 objects, about 18.2 MB;
  - `origin/main..HEAD` adds 3,315 objects, about 47.4 MB;
  - the unpushed part alone is 1,519 objects, about 32.2 MB.

  The largest file is 6.4 MB (`t16-reach.json`). `main` already keeps feature records (`docs/difficulty-v3/`,
  `tasks/difficulty-v3/`; PR #13 had 1,066 files, +3,023,622).

### 3.5 Machine time used by this analysis [V]

Four locked invocations through `tools\ig-proto\lock\ig-lock.ps1`:
- each after a 45-s quiet period (no idle declaration);
- 266.0 s of node time: 119.73 s (the full suite on Node 26), 0.665 s (the fixture check), 1.243 s (the replay-case
  check) and 144.391 s (the full suite on Node 22);
- 06:41:38 to 06:49:05 +07:00, all exit 0 (`p1-verify.log`).

These were verification runs, not timed measurements, on no round's account. Node 22 is `npx -y node@22` (v22.23.5,
in the npm cache). The staged-site check was unlocked (file copies and `check-site`).

### 3.6 A correction to the stage-4 report [V]

`stage4-report.md` §8 item 2 presents phase 1 as a small pack still to build. `docs/improve-generating-phase-1/request.md`
quotes it.

The records say otherwise:
- **Built, tested and benched.** The v4 pack's §8 hand-over: "phase 1's two production changes, P6 (T12) and the
  history policy of the progressive presentation (T13), are committed and unreleased. T14 read phase 1's gate at four
  workers ... (N-V4-12 closed)" (`tasks/improve-generating-v4/check-list.md:690-697`).
- **Release left to the owner.** It puts "any push, merge or release of the branch" with the owner (`:726-729`).
- **The sub-plan agrees.** The stages-2-4 plan likewise counts only P7's adoption as phase-1 production work
  (`docs/improve-generating-stages-2-4/plan.md:45`).

The report is a record and stays as written. This analysis, and the joint report after it, carry the correction to
the owner with question Q-P1-1.

## 4. Options

| Option | Design | Cost | Risk | Effect on users |
|---|---|---|---|---|
| **A. Refresh and merge PR #11** (the whole branch) | push the branch (a fast-forward of `origin/improve-generating`); rewrite PR #11's body for the current state; one line in each developer guide (section 5.4); the release gates at the final base; merge with a merge commit, as before | SA 1.5 h, developer 0.3 h, orchestrator 1 h, about 8 min of locked verification; no bench | `main` grows by about 47 MB of objects (x3.6 by this measure); the research becomes part of `main`'s history (the precedent: difficulty-v3) | identical puzzles, faster on Master, Expert and the large Nightmare boards; deployed by CI within minutes |
| **B. A new phase-1 PR** (the eight files only) | a branch from `origin/main` with the eight files of `HEAD` (no task-pack bookkeeping); the same gates; a new PR body; PR #11 stays open as the research record, or is closed | similar, plus 0.5 h for the branch; no developer-guide change | the T12/T13 content then exists twice in history (a clean later merge, identical content); T14's links point to the research branch, which must be pushed for them to resolve | the same |
| **C. Release with phase 2** | nothing now | none now | phase 1's gain waits for a later, larger pack; the owner asked to start now | none now |
| **D. Rebuild or re-bench phase 1** | repeat T12-T14 | 5-10 h and 45 counted minutes | none of value: the site files are byte-identical to T14's measured pair | none |

**Recommended: A** [A]:
- It is the vehicle the owner chose for phase 1 on 2026-11-18 ("create a pull request, not merged ... with the
  generation time of the old and the new version", `tasks/improve-generating-v4/check-list.md:562`).
- It keeps one history; T14's evidence and the task packs stay linked to the commits they describe.
- It follows `main`'s practice of keeping feature records with the code.
- It lets phase 2 (D-S24-35) branch from `main` with the harness and the frozen round's records.

B is sound if the owner wants `main` to stay small. It changes nothing for users.

## 5. Proposed plan

### 5.1 Components

- **No production, test or fixture change.** The release candidate is `HEAD`'s eight files (section 3.1), the code
  T12 and T13 delivered and T14 measured.
- **Option A only:** the two developer-guide lines (section 5.4).
- **Not part of the release:** `tools/ig-proto/`, `docs/improve-generating*/` and `tasks/` are records and a research
  harness. The apps never load them, and CI neither tests nor deploys them (`pages.yml`).

### 5.2 Data, identity and replay of stored records

- **Stored puzzles, packs, links, print codes and saved sets: unchanged** [V].
  - The returned rating equals `rate()` of its clues, key order included (`completeDiagnostic`; T12's test). Every
    stored rating therefore carries the same four DLX fields as before.
  - A lean rating cannot be stored: the pack reader refuses `'skipped'` (`pack.js:813-814`; test "a lean rating is
    refused as a stored claim").
  - T14 found the same production result digests on 35 of 35 old/new pairs.
- **Identity: unchanged** [V]. `ALGO_ID`, `POLICY_ID` and `APP_VERSION` are as before. Old and new puzzles replay the
  same way, because a replay rates with a recorder, hence with the full diagnostic. The replay fixture is unchanged
  (`--replay-case --check` OK).
- **Saved Generation steps: unchanged** [V/A]. The key of the saved steps holds `ALGO_ID` and `APP_VERSION`
  (`generator/ui/replay-cache.js`), and both are unchanged. [A] Steps kept before the release stay valid, since they
  are identical.
- **Migration: none.**
- **Rollback** [A]: reverting the merge commit restores today's site. Nothing written under the new version differs
  from what the old version would write, so no data needs converting either way.

### 5.3 Interfaces and algorithms

- **The engine API** gains `rateLean` and `completeDiagnostic` (already in `docs/design-detail.md:533-534`, §6.10
  `:1611`, §7.10 `:2106`).
- **The worker protocol, tasks, client hooks (`onAccepted`) and storage formats are unchanged.**
- **P6's rule.** A rating that nobody observes (no seam, recorder or `onRate`) skips the DLX diagnostic, which never
  enters a score or a decision. The kept rating is completed with one extra model build and traversal.

### 5.4 Texts, in every language of the product (English and Vietnamese)

- **The apps: no new or changed text** [V]. No key in `generator/locale.en.js`, `generator/locale.vi.js`,
  `player/locale.en.js` or `player/locale.vi.js` changes: `generator/` and `player/` are unchanged against `main`.
  The batch messages stay as they are, for example `notice.N-PARTIAL` (`generator/locale.en.js:218` and
  `generator/locale.vi.js:214`).
- **The user guides (EN, VI): no change** [V]. They describe no generation time beyond the 60-s target and the 120-s
  limit, which are unchanged, and they already state the history behaviour (section 3.2).
- **The developer guides (Option A only), one line in each code-layout block**, after the `tools/` line [A]:
  - `DEVELOPERGUIDE.md`:
    `tools/ig-proto/ the improve-generating research harness (its own README); never loaded by the apps`
  - `DEVELOPERGUIDE.vn.md`:
    `tools/ig-proto/ bộ công cụ thử nghiệm của improve-generating (có README riêng); các ứng dụng không bao giờ nạp`
- **The release text: PR #11's body, rewritten in English as before.**
  - Summary: phase 1 = P6 and the history policy; identical puzzles; faster.
  - T14's table, as it stands.
  - "What changes for users": faster generation; nothing else. Note that the app makes one puzzle per press, and that
    T14 measured ten-puzzle requests, the first T1 being the new set and its calibration.
  - "The production change in detail": `fb893c3` and `373e74a`, with current permalinks.
  - "Verified at the release base": the results of section 3.3 at the final commit.
  - "Not in production: `gen-v4`": the frozen round complete; phase 0 FAIL on the control 26x26 Nightmare; D-S24-35.
  - "The records": `tasks/improve-generating-v4/`, `tasks/improve-generating-stages-2-4/`, `docs/improve-generating*/`,
    `tools/ig-proto/`.
  - "Limitations": Node screening at four workers and five seeds per cell, not a browser measurement.

### 5.5 The history policy for a request that ends short

The policy stated in `docs/design-detail.md:1507` stays as is:
- A puzzle that was shown is in the set's seen-history (layout key and clue key) from the moment it arrives, however
  the request ends: complete, short (any partial reason), cancelled or failed.
- That holds also when the Generator drops it at the end for the pack size.
- Like a removed puzzle, it is not made again for that set until the history is reset.

In the app, with one puzzle per press, a short request is a press that returns no puzzle, so the rule is met
trivially. It binds the controller's multi-puzzle path and the tools.

### 5.6 The release procedure

1. **Release gates at the final base**, after any documentation commit:
   - the full suite on Node 26 and on Node 22;
   - both fixture checks;
   - `npm run check`;
   - the staged-site check;
   - `git diff --stat origin/main HEAD -- core generator player assets index.html redirect.js sitemap.xml`, which must
     list only P6's three files;
   - the identity tie to `27c6189`.
2. **Owner stop** (Q-P1-1).
3. **Push.** For A, a fast-forward push of `improve-generating`.
4. **Update and merge.** Update the PR body (`gh pr edit 11 --body-file`), then merge with a merge commit
   (`gh pr merge 11 --merge`).
5. **Watch `test-and-deploy`** (`gh run watch`). Check that the deployed pages carry `?v=<first 8 of the merge commit>`.
6. **Close out.** Record the decision and the merge commit. If Q-P1-2 is (a), the owner publishes v1.3 with GitHub's
   generated notes.

## 6. Acceptance

### Business

| ID | Criterion | How it is verified |
|---|---|---|
| P1-B01 | The Generator makes the same puzzles as before for the same request | T14's 35 of 35 equal pairs; both fixture checks at the final base; the identity tie of section 3.3 |
| P1-B02 | Generation is faster where P6 applies and slower nowhere beyond noise | T14: Master x1.17 [1.12-1.28] n 10, Expert x1.14, 26x26 Nightmare x1.32, 18x18 Nightmare x1.13; 10x10 and 12x12 Nightmare x1.00 and x1.02 |
| P1-B03 | No visible change other than speed; the history policy holds | no diff in `generator/`, `player/` or the locales; T13's two tests pass |
| P1-B04 | Released only with the owner's approval, and live | the recorded answer to Q-P1-1; `test-and-deploy` green on the merge commit; the deployed version stamp |

### Technical (plan §6's phase-1 gate first)

| ID | Criterion | How it is verified |
|---|---|---|
| P1-T01 | Equality of `DeductionResult` on the corpus | `git diff origin/main HEAD -- core/engine/deduce.js core/engine/tiling.js core/engine/dlx.js` empty; T12's lean/full and observed/unobserved tests pass |
| P1-T02 | Fixtures unchanged | `record-fixtures.mjs --check` and `--replay-case --check` OK, locked, at the final base |
| P1-T03 | `npm test` green on the developers' Node and on CI's | the full suite, 0 failures, on Node 26 and Node 22 (`npx -y node@22`), locked |
| P1-T04 | Gates read at four workers; both memory checks | T14 (`compare.md`), valid because the site files equal its measured pair (section 3.3) |
| P1-T05 | The deployed site is the reviewed one | the staged-site check before the merge; CI's `check-site --expect-version` after it; the site-file diff against `main` lists only the three P6 files |
| P1-T06 | No stored record can hold a lean rating | the pack reader's refusal test |
| P1-T07 | The documents describe the code | `docs/design-detail.md:1507` and `:1611` present; for A, both developer guides name `tools/ig-proto/`; `npm run check` |

## 7. Risks and mitigations; effect on performance, tests and documents

| Risk | Likelihood, effect | Mitigation |
|---|---|---|
| CI's Node 22 on Ubuntu fails where Windows Node 26 passed (as on 2026-11-16) | low: Node 22 passes 1,514 of 1,514 here, and no fixture or line-ending path changed | the Node 22 run is a release gate; a red CI stops the deployment, so the live site stays as it was; fix forward or revert the merge |
| The merge of A makes `main` about 3.6 times larger | certain under A; slower clones, no effect on the site | the owner chooses A or B (Q-P1-1) |
| P6 behaves differently in a browser worker | low: pure engine code, unchanged protocol; Node tests run the same workers' logic | the post-deploy version check. A browser page run is optional (Q-P1-3) |
| The release text overstates the speed for one-per-press use | medium if worded loosely | state the conditions: Node, four workers, ten-puzzle requests, five seeds; T1 as the proxy for a first press (section 3.3) |
| PR #11's body is stale (old commits, `main` as `3fc65f4`, stages 2-4 as a plan) | certain until rewritten | section 5.4's rewrite before the merge |
| The owner believed phase 1 was still to build | certain (section 3.6) | the correction stated in Q-P1-1's text |

**Effects:**
- **Performance:** as P1-B02.
- **Memory:** within ±5 % of the old version (T14).
- **Tests:** none added; 1,514 tests at the base.
- **Documents:** the PR body; under A, two developer-guide lines.

## 8. Effort and phasing (outline for break-tasks)

| ID | Task | Executor | Inputs | Gates | Cost |
|---|---|---|---|---|---|
| P1-01 | The release text: PR #11's new body (or B's PR body) at `docs/improve-generating-phase-1/release-text.md` | SA-Opus, reviewed by SA-Astra | section 5.4; T14's `compare.md`; this analysis | review; `npm run check` | SA 1 h; machine 0 |
| P1-02 | A only: the two developer-guide lines (EN, VI) | Dev-Sonnet | section 5.4's texts | `npm run check`; `git status` lists the two guides only | developer 0.3 h; machine 0 |
| P1-03 | B only: the phase-1 branch from `origin/main` with the eight files of `HEAD` (no `tasks/` change) | orchestrator | section 3.1's list | `git diff --stat origin/main` lists exactly the eight files | 0.5 h; machine 0 |
| P1-04 | The release gates at the final base (section 5.6, step 1), with `p1-verify.ps1`'s method | orchestrator | P1-01 to P1-03 committed | all pass; the identity tie | about 8 min wall (about 4.5 min of node time, 4 x 45 s quiet), locked; no owner allowance |
| STOP | The owner: Q-P1-1 (and Q-P1-2) | owner | P1-04's results; the release text | his recorded answer | - |
| P1-05 | Push, update the PR body, merge, watch `test-and-deploy`, check the deployed version stamp | orchestrator | the owner's approval | CI green; `?v=<sha8>` on the live pages | 0.5 h |
| P1-06 | Close-out: register entries, merge commit, hand-over (phase 2 per D-S24-35; N-V4-10 with the owner; N-V4-20 with the next `self-test.mjs` edit) | orchestrator | P1-05 | `npm run check` | 0.3 h |

**After phase 1** (plan §8.4):
- phase 2 (`gen-v4`, N-V4-07, with the 26x26 legacy route of D-S24-35);
- phase 3 (the offers, N-V4-08, after the blind play comparison N-V4-09);
- phase 4 (N-V4-11);
- N-V4-14 only if the owner wants it.

## 9. Questions

The owner delegated supervisor-level questions to the two SAs jointly (request, 2026-11-23).

**Q-P1-1 (owner): release phase 1 now, and how?**
- **The facts.** Phase 1 was built and measured on 2026-11-18 and is unreleased. Merging to `main` publishes the site
  at once through `test-and-deploy`, whose tests must pass first.
- **(a) Merge PR #11, refreshed** (recommended). Push the branch, rewrite the PR text, add one developer-guide line in
  each language, then merge. This brings phase 1 plus the improve-generating records and harness, about 47 MB of
  objects.
- **(b) A new small PR** with phase 1's eight files only. PR #11 stays as the research record (open or closed).
- **(c) Not now.** Phase 1 waits for phase 2.
- **Evidence.** Sections 3.3, 3.4 and 4: the gates pass today on Node 26 and 22, and the site files are exactly T14's
  measured pair.

**Q-P1-2 (owner): publish a GitHub release after the deploy?**
- **(a) v1.3 with GitHub's generated notes** (recommended). It lists PR #13 (difficulty-v3, live since 2026-11-20
  without a release) and the phase-1 PR, as v1.2 listed PRs #7-#9.
- **(b) No release now.**
- **Evidence.** `gh release list`, `gh release view v1.2`.

**Q-P1-3 (the SAs jointly, for the supervisor): is a new bench or a browser run needed before the release?**
- **(a) No** (recommended). The site files are byte-identical to T14's measured pair. The protocol, workers and UI are
  unchanged. Today's Node 26 and 22 suites, both fixture checks and the staged-site check, plus the post-deploy version
  check, complete the gate.
- **(b) Repeat T14.** It costs 45 counted minutes and needs the owner's allowance.
- **(c) Add the browser pages `generator-flow.html` and `replay.html`.** About 5 minutes, but the repository has no
  runner for them, so it needs a small one.
- **Evidence.** Section 3.3; plan §6's gate names no browser run (D39's browser runs are phase 3's).

## 10. Evidence index

All files are in `docs/improve-generating-phase-1/evidence/sa-opus/`, run from the repository root.

| File | What | Command |
|---|---|---|
| `p1-verify.ps1`, `p1-run.mjs` | the four locked verification runs and their runner | `pwsh -NoProfile -File docs\improve-generating-phase-1\evidence\sa-opus\p1-verify.ps1` |
| `p1-verify.log` | summary: base `006ca68`; Node 26 1,514 of 1,514 (119.73 s); fixtures OK; replay case OK; Node 22.23.5 1,514 of 1,514 (144.391 s); each after a 45-s quiet | (written by the script) |
| `p1-full-node26.log`, `p1-full-node22.log`, `p1-fixtures.log`, `p1-replay-case.log` | the full outputs (TAP); T12's and T13's five tests pass in both suites (`ok 105`, `ok 180`, `ok 181`, `ok 3`, `ok 12`) | (written by the script) |
| `p1-site.log` | the staged site as `pages.yml` builds it, stamped `006ca68f`; `check-site: OK` | the PowerShell steps of section 5.6 (copy, `node tools\stamp-version.mjs`, `node tools\check-site.mjs <dir> --expect-version <v>`) |
| `p1-t14-ratios.mjs`, `p1-t14-ratios.md` | T14 restated per cell from `compare.json` (sha256 of its LF text `7fabb8eb5442e9ab7d23101fd7e36612af4da06ccce2185def652f2a25f19280`); identity 35 of 35 equal | `node docs\improve-generating-phase-1\evidence\sa-opus\p1-t14-ratios.mjs` |

**Read-only commands behind sections 3 and 4:**
- `git diff --stat origin/main HEAD -- . ':(exclude)docs/improve-generating/**' ...` (the eight files);
- `git diff --stat 27c6189 HEAD -- core generator player assets index.html redirect.js` (empty);
- `git diff --stat 3fc65f4 origin/main -- core generator player assets index.html redirect.js sitemap.xml` (empty);
- `git diff --stat 3fc65f4 27c6189 -- core generator player assets index.html redirect.js` (P6's three files);
- `git rev-list --objects <range> | git cat-file --batch-check='%(objectsize:disk)'` (sizes);
- `gh pr view 11 --json ...`, `gh pr list --state all`, `gh run list --branch main`, `gh release list`.

**Records cited:**
- `docs/improve-generating/plan.md` §3 P6 (`:348-354`), §6 (`:660-670`) and §9 (`:809`);
- `tasks/improve-generating-v4/T12-p6-diagnostic-for-returned-ratings.md`, `T13-progressive-presentation-history.md`
  and `T14-p6-phase1-bench.md`, and that pack's check-list §6 N-V4-12 (`:634`) and §8 (`:688-729`);
- `docs/improve-generating/evidence/phase1/P6-bench/compare.md`;
- `docs/improve-generating/evidence/provisional/IGP-04/compare.md` (R22: P6 on today's search, x1.32 on 26x26 Nightmare);
- `docs/improve-generating-stages-2-4/stage4-report.md` §8 and that pack's check-list D-S24-35.
