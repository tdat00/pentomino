# Request: improve-generating phase 2 (`gen-v4` in production)

| Item | Value |
|---|---|
| Date | 2026-11-25 |
| Owner | tdat00 (Discord ai-ws-1, account 1446525290657349733; CLI) |
| Repository, branch, base | `Q:\git\pentomino`, `gen-v4`, `6b94ffb45fd8b887c47805739478eeb872088bfd` |
| Fork point | the published phase-1 head of PR #11 (`improve-generating`, pushed 2026-11-25; PR #11 description footer) |
| Pull request | a new PR from `gen-v4` into `main`, not merged |
| Feature folder | `docs/improve-generating-phase-2/` |

## The owner's instructions, verbatim

Discord message 1574937911546085528, 2026-11-25 07:00:59 +07:00:

> Tiếp tục làm các phase 2 đến khi xong, gom trong 1 PR (không merge)

Translation: "Continue doing phase 2 until it is done; gather [it] in one PR (do not merge)."

CLI, 2026-11-25 07:46 +07:00:

> vậy cần tách 2 PR cho 2 phase này. Khi xong phase 1, hãy cập nhật PR hiện tại với chi tiết các thay đổi. Sau đó
> tiếp tục làm phase 2 trong branch khác, PR khác.

Translation: "Then the two phases need two separate PRs. When phase 1 is done, update the current PR with the details
of the changes. Then continue phase 2 in another branch, another PR." Asked for the branch and base, he chose branch
`gen-v4` and base `main`. Neither PR is merged.

His standing instructions for this session (2026-11-23): "tiếp tục làm tất cả các công việc đến khi hoàn thành"
("continue doing all the work until it is finished"), and "2 agent SA tự phối hợp tìm câu trả lời, không cần hỏi
Fable" ("the two SA agents work out the answers together; no need to ask Fable").

## The decision that scopes phase 2

D-S24-35 (Q-T16 (a), Discord message 1574929061115863041, 2026-11-25 06:25:48 +07:00), recorded in
`tasks/improve-generating-stages-2-4/check-list.md`: today's search is kept on 26x26 Nightmare and `gen-v4` is
proposed for the other boards with the recorded class choices. The phase-0 FAIL stays recorded; this approves only
the scope of the phase-2 pack, which must implement the route, prove compatibility and replay, measure `require` on
the largest boards first (N-V4-15) and repeat the validation on the production code, and returns to the owner with
its plan and price before anything runs or ships. Hell 1's offer rules are unchanged.

## What phase 2 is (the sources)

- `docs/improve-generating/plan.md` §6, phase 2 "`gen-v4`": P1 sequential with the AR1 direction; P3; P2 with the
  certificate and the validated table; P4's table and, if its pilot paid, the per-set prior, with stored identity; P5
  with per-level budgets, bounded set attempts and the one deadline; Nightmare and Hell 1 only. Version: new `algo`,
  new fixtures. Gate: the frozen round's validation repeated on the production code, the controls included; the
  population reported per cell. Also §3 (P1-P5) and §6's "Tests every phase keeps or adds".
- `docs/improve-generating-stages-2-4/stage4-report.md` §8 item 3 (the phase-2 content after the 26x26 decision) and
  §§6-7 (findings F1-F7: N-V4-16's bound/glue reach report, the re-rating reach report, budget-stop reporting per cell).
- The frozen configuration: `docs/improve-generating/evidence/frozen/V4-S3/freeze.json` (classes, bounds, tables,
  values) and the stages-2-4 class selection `docs/improve-generating/evidence/frozen/V4-S4F/verdicts.md`.
- Phase 1 (PR #11) is a separate, unmerged PR; this branch starts from its published head, so the phase-2 PR into
  `main` also shows phase 1's commits until PR #11 is merged, and says so.
