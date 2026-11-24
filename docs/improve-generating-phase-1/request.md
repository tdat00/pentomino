# Request: improve-generating phase 1

| Item | Value |
|---|---|
| Date | 2026-11-25 06:28:11 +07:00 |
| Owner | tdat00 (Discord ai-ws-1, account 1446525290657349733) |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, `ca46067` |
| Feature folder | `docs/improve-generating-phase-1/` |

## The owner's request, verbatim

The stage-4 report's owner question (Q-T16, Discord message 1574846062135353425, 2026-11-25 00:58 +07:00) ended with:

> Phase 1 là một pack nhỏ riêng. Anh cho biết nếu muốn bắt đầu ngay.
> (Phase 1 is a separate small pack. Tell us if you want it started now.)

The owner answered (Discord message 1574929660763049985, 2026-11-25 06:28:11 +07:00):

> Phase 1 có

Translation: "Phase 1: yes" (start phase 1 now).

His earlier instruction for this session (2026-11-23): "tiếp tục làm tất cả các công việc đến khi hoàn thành"
("continue doing all the work until it is finished"), and "2 agent SA tự phối hợp tìm câu trả lời, không cần hỏi
Fable" ("the two SA agents work out the answers together; no need to ask Fable").

## What phase 1 is (the sources the owner approved)

- `docs/improve-generating/plan.md` §6, phase 1 "Same puzzles": P6; progressive presentation in fold order
  (OD-P5 (a)); P7's proved-equal items if the spike passes. Version: identical puzzles. Gate: equality of
  `DeductionResult` on the corpus; fixtures unchanged; `npm test`; gates read at four workers; both memory checks.
  "Phase 1 does not have to precede phase 2 ... P6 and progressive presentation need the frozen source and their own
  identity and history checks, not phase 0's completion gate."
- `docs/improve-generating/plan.md` §3 P6 ("DLX diagnostic only where it is shown"; approved OD-P2) and §6
  "Progressive presentation (OD-P5 (a))"; §7 decisions OD-P2 and IG-P-D2 (OD-P5).
- `docs/improve-generating-stages-2-4/stage4-report.md` §8 item 2: "Phase 1 (plan v4 §6; independent of phase 0's
  gate): P6 (the DLX diagnostic) and progressive presentation in fold order (IG-P-D2). P7 has no item, because S02's
  spike gave no go (N-V4-05 closed). A small pack at the owner's request, with its own identity and history checks."
- The owner's decision of the same morning (D-S24-35, Q-T16 (a)): phase 2 (`gen-v4` in production) is a separate,
  later pack; phase 1 does not depend on it.
