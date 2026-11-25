# SA-Opus's review of the joint draft (report.md, plan.md) against the owner's second follow-up

| Item | Value |
|---|---|
| Feature | `improve-generating-phase-1` |
| Reviewed | `docs/improve-generating-phase-1/report.md` and `plan.md` as drafted by SA-Astra (files of 2026-11-25 07:45:23) |
| Against | the owner's second follow-up (CLI, 2026-11-25 07:46 +07:00; `request.md`, commit `c63c553`): two PRs. Phase 1 stays in PR #11 (`improve-generating` into `main`), whose description is updated with the details of the changes when phase 1 is done. Phase 2 goes on a new branch `gen-v4` (from `improve-generating` after phase 1's close-out), with a new PR into `main`. Neither PR is merged |
| Reviewer | SA-Opus, 2026-11-25 |

[V] marks a claim re-checked against the repository; [A] marks a judgement.

## 1. Verdict

**The technical content is accepted:**
- the evidence adoption (§4.4) and the width-8 fold simulation (§4.5);
- fail-closed qualification (§4.6) and the static-site method;
- decisions D-P1-03 to D-P1-06, the acceptance rows and the cost arithmetic.

**The PR routing must change.** The draft predates the second follow-up and still routes phases 1 and 2 into one PR.
Changes R1 to R8 below are required for my sign-off; R9 is recommended.

## 2. Required changes for the second follow-up

| # | Where | Now | Required |
|---|---|---|---|
| R1 | `plan.md` header ("Governing instruction base") and `report.md` status line | `a90c2d0` (one PR, not merged) | `c63c553` (the second follow-up, which supersedes the 07:00 one-PR routing; the 07:00 "không merge" stands) |
| R2 | `plan.md` §1 Goal, 2nd paragraph; `report.md` summary item 6 | "Continue the existing PR #11 for phases 1 and 2 together, not merged" | "Phase 1 stays in PR #11 (`improve-generating` into `main`); when the close-out is done, its description is rewritten with the details of the changes. Phase 2 continues on a new branch `gen-v4`, from `improve-generating`'s published close-out commit, with its own PR into `main`. Neither PR is merged; no release, tag or deployment." |
| R3 | `plan.md` §5, D-P1-01 and D-P1-02; the closing line "Q-P1-1 is answered by D-P1-01" | one PR; reuse PR #11 for both phases | **D-P1-01** (owner, 2026-11-25 07:46, CLI, `c63c553`): "Two PRs, neither merged: phase 1 in PR #11 (`improve-generating` into `main`), its description updated with the details of the changes when phase 1 is done; phase 2 on branch `gen-v4` (from `improve-generating` after phase 1's close-out) with a new PR into `main`. Supersedes the 07:00 one-PR instruction (`a90c2d0`). No release, tag or deployment." **D-P1-02** (joint SAs, routing under D-P1-01): "Publish `improve-generating` only after the phase-1 close-out; no phase-2 commit lands on `improve-generating`; `gen-v4` starts from the published close-out commit." Closing line: "Q-P1-1 and Q-P1-1b are answered by the owner (D-P1-01); Q-P1-2 is withdrawn: no GitHub release while neither PR is merged." |
| R4 | `plan.md` §4.7 (title and the PR text bullets); §2 In ("the combined PR's phase-1/status text") | "one-PR publication"; "phase 2 is pending/in progress until its own gates pass"; "As verified phase-2 tasks later land on that same branch, publish them there" | Title: "Readiness and PR #11's description". The description must give **the details of the changes**: (1) the production change, `core/engine/clues.js`, `difficulty.js`, `types.js` (P6: `rateLean`, `completeDiagnostic`, the observer rule); (2) the tests, the four of T12/T13 plus the width-8 line; (3) `docs/design-detail.md` (§6.9 the history policy, §6.10 P6, the API lines, the test-table row); (4) what the branch also carries, which the site never loads: `tools/ig-proto/`, the v4 and stages-2-4 task packs and their records (the frozen round, phase 0's FAIL, D-S24-35); (5) T14's numbers with their conditions and limits; (6) the close-out's verification; (7) "do not merge"; (8) "phase 2 continues on `gen-v4` in its own PR". Delete the sentence about phase-2 tasks landing on this branch |
| R5 | `plan.md` §6, P1-B04 | "There is one combined PR and it remains unmerged" | "PR #11 holds phase 1 only and remains unmerged; its description has the details of the changes (§4.7); the live site is not changed." Add to P1-T10: "no phase-2 commit on `improve-generating`" |
| R6 | `plan.md` §8, P1-04 and P1-05 | "Readiness note and PR text"; "Publish and refresh PR #11" | P1-04: "Readiness note and PR #11's description with the details of the changes (§4.7)". P1-05: "Push `improve-generating` (fast-forward) and rewrite PR #11's description; verify head, base `main`, OPEN and unmerged; never merge". This is phase 1's last task, as the orchestrator stated |
| R7 | `plan.md` §9 ("Phase-2 continuation ... Keep the same unmerged PR"); `report.md` §6 | one PR | "Phase 2: a new analyze feature after this plan is final. Its branch `gen-v4` starts from `improve-generating`'s published close-out commit, and its PR targets `main`, not merged (D-P1-01)." See section 3 for the stacked diff |
| R8 | `report.md` §1, §3 (the Q-P1-1b row) and §5 (title "The close-out and the one PR", item 5) | the 07:00 routing only | Quote the second follow-up verbatim with its translation (`c63c553`). The Q-P1-1b row becomes "Answered by the owner (07:46): PR #11 for phase 1 only, `gen-v4` with a new PR for phase 2". §5's title becomes "The close-out and PR #11" |

## 3. Notes for the hand-over (no owner question needed) [A]

- **The phase-2 PR shows a stacked diff.** `gen-v4` starts from `improve-generating`, and its PR targets `main`
  (the owner's choice). Until PR #11 is merged, the phase-2 PR's diff therefore also shows PR #11's commits: today
  1,286 files against `main` [V: `git diff --shortstat origin/main HEAD`].
  - **Recommendation for the phase-2 plan:** its PR description says it is stacked on PR #11 and links the compare
    view `improve-generating...gen-v4` for a phase-2-only review.
  - **Recommendation for the phase-2 plan:** a fix to phase 1 found later is committed on `improve-generating` and
    merged into `gen-v4`, never rebased.
- **How "base main" was read.** The record (`c63c553`) takes it as the phase-2 PR's target, with the branch point at
  `improve-generating` after the close-out. That reading is the only one that gives phase 2 P6 and the harness it
  needs: a branch from `main` would lack `tools/ig-proto/` and the freeze records. I accept the record as written.

## 4. Recommended change (R9)

**R9. The two developer-guide lines belong to PR #11.** `plan.md` §2 defers them to phase 2's documentation, but
PR #11 is now the PR that would bring `tools/ig-proto/` to `main` if it is ever merged. `AGENTS.md` asks the
developer guides to stay correct, in both languages.
- **Where:** the code-layout block of each guide, after the `tools/` line.
- **`DEVELOPERGUIDE.md`:**
  `tools/ig-proto/ the improve-generating research harness (its own README); never loaded by the apps`
- **`DEVELOPERGUIDE.vn.md`:**
  `tools/ig-proto/ bộ công cụ thử nghiệm của improve-generating (có README riêng); các ứng dụng không bao giờ nạp`
- **Cost:** a 0.2-h developer step in P1-04, with `npm run check`.
- **If SA-Astra prefers to keep the close-out tests-only:** record the omission as a named item of PR #11's
  description, so that it is not lost.

## 5. Other findings on the draft

| # | Finding | Disposition |
|---|---|---|
| F1 | N-V4-20 is closed by the stages-2-4 pack's T01b (`tasks/improve-generating-stages-2-4/check-list.md:29`) [V] | the draft is right; my round-1 analysis listed it as open (a correction of mine) |
| F2 | §4.5's living-specification line exists as quoted (`docs/design-detail.md:3076`: "pool sizes 1 and 4 and shuffled completion orders (simulated)"), although the test already runs widths 1-4 [V] | accepted; the replacement text also corrects that understatement |
| F3 | §4.6: no `-AllowExit1` in qualification | accepted. My analysis wrapper collected with it, but every logged exit was 0 (`p1-verify.log`), so the current logs stand as evidence |
| F4 | §4.6: no hard-coded npm-cache path; check the Node 22 binary's major version; stop if it is unavailable | accepted. On this machine v22.23.5 is in the npm cache (`p1-verify.log`); the task may name it as the expected binary, with the version check |
| F5 | Cost: 266.029 s of node time plus 180 s of quiet = 7.4 min; ceiling 5 x 345 s = 1,725 s [V] | correct |
| F6 | `report.md` §2: 414 references in 91 of 114 files; `check-site: OK` [V: `p1-site.log`] | correct |
| F7 | The two cross-reviews' corrections are reflected: the nine-file closure; the packed-size correction (no guaranteed size multiplier claimed); width 8 only in the simulation | accepted |

## 6. Sign-off condition

SA-Opus accepts `report.md` and `plan.md` once R1 to R8 are applied (R9 applied, or recorded as a named item).

## 7. Re-review of SA-Astra's update (files of 2026-11-25 07:52:03)

| # | Applied? | Where it stands now |
|---|---|---|
| R1 | yes | `plan.md:10` and the report's status block name `c63c553`, which supersedes `a90c2d0`'s one-PR clause |
| R2 | yes | `plan.md` §1; `report.md` summary items 6 and 7 |
| R3 | yes, in a better form | D-P1-01 and D-P1-02 are kept and marked superseded. The new D-P1-07 (owner, 07:46, `c63c553`, "Answers Q-P1-1b") and D-P1-08 (joint SAs: the recorded fork point, the disclosed inherited prefix, P1-05 as the last task) carry the route. Q-P1-1 and Q-P1-1b are answered; Q-P1-2 is withdrawn |
| R4 | mostly | `plan.md` §4.7 now covers the PR description: what P6 and the history/test changes are, the measured conditions and limits, phase 0's FAIL and D-S24-35, "do not merge", the research kept apart from site code, and phase 2 on `gen-v4` in a separate PR. "Do not continue phase-2 commits on `improve-generating`" is added. Suggestion RR2 below |
| R5 | yes | P1-B04 is rewritten. P1-T10 is unchanged, but §4.7 and D-P1-08 carry the no-phase-2-commit rule (suggestion RR3) |
| R6 | yes | P1-04 and P1-05; P1-05 is phase 1's last task and records the published SHA as the phase-2 fork point |
| R7 | yes | `plan.md` §4.7 (the last two paragraphs) and §9; `report.md` §6. They state the stacked diff and the phase-2-only range from the recorded fork point, and forbid retargeting, cherry-picks, resets and rebases |
| R8 | yes | `report.md` §1 quotes the second follow-up verbatim; the §3 Q-P1-1b row is answered; §5 is titled "The phase-1 close-out and PR #11" |
| R9 | deferred | `plan.md` §2 still defers the developer-guide lines to "the later phase-2 documentation review". Under two PRs that work is in the other PR, so PR #11 alone would not show the gap (RR1) |

**Remaining.** One small change is needed for my sign-off; two are suggestions.
- **RR1 (required, one line, no further review round).** Add a bullet to `plan.md` §4.7's list for PR #11's
  description: "Known before any merge: the developer guides (EN and VI) do not yet name `tools/ig-proto/`, which
  this branch adds; a later documentation task adds the line before any merge (`AGENTS.md`)". Alternatively, add the
  two lines of R9 in P1-04.
- **RR2 (suggestion).** Make "the details of the changes" literal in §4.7's list:
  - the changed files: `core/engine/clues.js`, `difficulty.js` and `types.js`; the five test files; and
    `docs/design-detail.md` §6.9, §6.10, §7.10, the API lines and the test-table row;
  - P1-03's verification results.

  The owner asked for "chi tiết các thay đổi".
- **RR3 (suggestion).** Add "no phase-2 commit on `improve-generating`" to P1-T10's verification.

**Sign-off.** SA-Opus accepts `report.md` and `plan.md` with RR1 applied. RR2 and RR3 are at the drafter's
discretion. Everything else in both files is accepted as written (sections 1, 3 and 5 of this review).
