# Answered questions: improve-generating phase 2 (Q-P2-1, Q-P2-5)

The record of the two owner questions as they stood when the owner answered them, with the answers filled in. The text
is identical to the reviewed draft of `clarifications.md` preserved in `evidence/sa-astra/joint-review-audit.json`
(`reviewedDrafts`); only this introduction, the relative links and the answer lines differ. Paths in backquotes are
relative to `docs/improve-generating-phase-2/`. The decisions are D-P2-15 and D-P2-16 in [plan.md](../plan.md);
[clarifications.md](../clarifications.md) has no open questions.

After the answers, SA-Astra's review (R6.2) narrowed one phrase of Q-P2-1's context, "equality with the frozen results
on every measured row": the port equality applies to every eligible measured row with a same-cell frozen or legacy
oracle, before any ratio is read; new sentinel and `require` rows have no frozen oracle (plan 4.4 and 7.3).

## Q-P2-1: The production validation and its machine time

- **Addressee:** owner. Raised jointly by SA-Opus and SA-Astra, 2026-11-25.
- **Decision needed:** approve the production validation of [plan.md](../plan.md) section 7 and up to 812 counted
  minutes for it: stage A, 410, first; then stage B, 402, after the SAs' stage-A readout. Also say which account pays.

**Context and current state.**
- D-S24-35 requires phase 2 to return with its plan and price before anything runs or ships. Nothing has run.
- The validation repeats the frozen round on the production code: the shipped search on the 19 frozen Nightmare and
  Hell 1 cells, today's search on the ten controls, 16 Master cells on both arms, and the `n-mid` screen re-check.
- It adds:
  - proof bundles and smoke requests;
  - equality with the frozen results on every measured row;
  - uncapped comparisons for every row where P5 acted;
  - `require` on the largest boards first (50 rows);
  - 140 rows on boards without a prior-table cell, which is what most boards are.
- Total: 1,013 planned rows, four proof bundles, eight resource replays and six browser checks.
- The frozen round's grant was 1,725 counted minutes; it spent 871.2, so 853.8 are left. That round closed with its
  final verdict, and plan v4 prices phase 2 in its own manifest (`docs/improve-generating/plan.md:583-584`).
- **812 is a spend cap, not an assurance of completion.** The 140 rows without a prior cell are priced from neighbouring
  boards' times, a weak proxy. If they ran at their row limits, the cap would be 1,303. Observations beyond the approved
  minutes stop incomplete and come back to you; they are never counted as passes.

**Evidence.**
- [plan.md](../plan.md) section 7 (the design and the stop rules) and section 7.6 (the price).
- `evidence/sa-astra/round1-cross-audit.json` and `.md`: SA-Astra's enumerated schedule
  (`node docs\improve-generating-phase-2\evidence\sa-astra\round1-cross-audit.mjs`).
- `evidence/sa-opus/p2-xr-verify-astra.md`: SA-Opus's independent check. Every row's time was recomputed from the
  published frozen rows (1,013 of 1,013 equal), and both stage schedules were reproduced exactly.
- `evidence/sa-opus/p2-q1-options.md`: the figures of the options below.
- Calibration: the frozen row steps cost 0.99 to 1.08 s beyond their responses; the price assumes 2 s and gives no
  credit for phase 1's speed-up.
- The account: `docs/improve-generating-stages-2-4/stage4-report.md:274`.

**Options.**

| Option | What it means | Consequences |
|---|---|---|
| (a) 812 in a separate phase-2 ledger | stage A, 410, then stage B, 402, after a readout | the validation runs as designed; the closed round's account stays closed; a stage-A failure comes back to you before stage B |
| (b) 812 from the 853.8 minutes left of the closed 1,725-minute grant | the same measurement, charged to the old account by your explicit decision | combined maximum 1,683.2 of 1,725, so the cap needs no increase; no rollover without this decision |
| (c) 1,303 (901, then 402) | the sentinel rows funded even at their row limits | less risk of stopping incomplete; more minutes reserved, though spend follows actual use |
| (d) 729 (327, then 402) | without the 140 rows on boards without a prior cell | cheaper; the path most offered boards take stays unmeasured before shipping |
| (e) Defer | no measurement now | the code can still be built and tested (plan tasks P2-01 to P2-17); nothing is validated, claimed or shipped |

**The SAs' recommendation:** (a), a separate phase-2 ledger of 812 counted minutes, staged 410 then 402.

**What is blocked meanwhile:** the proof bundles, stages A and B, the validation report and PR #14's final
description (P2-18 to P2-22). The developer tasks P2-01 to P2-17 can start when the plan is final, except the
texts of P2-09, which wait for Q-P2-5.

**Answer (owner, 2026-11-25 15:06:53 +07:00):** "Q-P2-1: đồng ý duyệt." ("approved"), Discord message
`1575060196269490259`, relayed by the orchestrator; the owner answered before the questions were formally posted.
Read by the orchestrator and both SAs as the recommended option (a): a separate phase-2 ledger of 812 counted minutes,
stage A (410) first, stage B (402) after the stage-A readout; a spend cap, not an assurance of completion. Recorded as
D-P2-15.

## Q-P2-5: The new English and Vietnamese texts, and the "no early stop" statement

- **Addressee:** owner. Raised jointly by SA-Opus and SA-Astra, 2026-11-25.
- **Decision needed:** approve the new user texts in English and Vietnamese, with the plain-language or the
  technical wording of four strings, and the correction of the design statement "no early stop" for the new search.

**Context and current state.**
- With `gen-v4`, a Nightmare piece-set request ends early when its first four piece sets all fail the same way (P5's
  bound). Today it runs to its time limit.
- So the statement "no fail-fast" in `docs/design-detail.md:1805` and in the earlier release notes becomes false for
  Nightmare and must change.
- The bound never fired in the frozen validation (F2), so its false-stop rate on real requests is not established.
  The texts must not claim more than the search did.
- The Generation steps also gain new kinds of steps: finding the clue count, a quick rating, a re-rating, a work limit,
  and a search that found no clue count.

**Evidence.**
- [plan.md](../plan.md) 4.9 (texts) and 4.11 (the design statement).
- `sa-astra/round-1-cross-review.md` §6 and `sa-opus/round-1-cross-review.md` §3.6 and §8.6.
- The existing texts: `generator/locale.en.js:216-217, 229, 303-326`; `generator/locale.vi.js:212-213, 225, 298-321`.
- Why "every clue count tried" was dropped: `tools/ig-proto/variants/files/v4/core/engine/ig-select-v4.js:1071-1080,
  1119-1174`.
- F2: `docs/improve-generating-stages-2-4/stage4-report.md:286`.

**Texts agreed by both SAs.**

| Key | English | Vietnamese |
|---|---|---|
| `replay.step.locate` | Clue set {sequence} ({count} clues) is rated to find how many clues this level needs: score {score}. | Nhóm mảnh đặt sẵn {sequence} ({count} mảnh) được chấm để tìm số mảnh đặt sẵn mà mức này cần: điểm {score}. |
| `replay.step.screenCapped` | The quick rating of clue set {sequence} reached its work limit. It only guides the search; it has no score. | Lần chấm nhanh nhóm mảnh đặt sẵn {sequence} đã chạm giới hạn phép tính. Kết quả chỉ định hướng việc tìm kiếm; không có điểm. |
| `replay.step.rerate` | Clue set {sequence} is rated again with the full limit: score {score}. | Nhóm mảnh đặt sẵn {sequence} được chấm lại với giới hạn đầy đủ: điểm {score}. |
| `replay.step.rerateCapped` | The full rating of clue set {sequence} also reached its limit, so it has no score. | Lần chấm đầy đủ nhóm mảnh đặt sẵn {sequence} cũng chạm giới hạn nên không có điểm. |
| `replay.step.budget` | This clue search reached its work limit: no further rating or uniqueness check was started. | Lần tìm các mảnh đặt sẵn này đã chạm giới hạn phép tính: không bắt đầu thêm lần chấm điểm hay kiểm tra tính duy nhất nào. |
| User guides (`USERGUIDE.md`, `USERGUIDE.vn.md`), after the piece-set paragraph | For a Nightmare set, if the first four piece sets tried all end the same way without a puzzle of the level, the Generator stops early and says so, instead of running to the time limit. | Với bộ mảnh mức Ác mộng, nếu bốn bộ mảnh thử đầu tiên đều kết thúc theo cùng một cách mà không tìm được đề đạt mức, trình tạo dừng sớm và báo lý do, thay vì chạy đến hết thời gian cho phép. |

A piece set cut by the 46-s reserve keeps the existing notice N-NOSET, and a batch cut by the time limit keeps the
existing notice N-PARTIAL; their texts do not change.

**The four no-window strings, two accurate wordings.**

Wording B, plain language, recommended by both SAs:

| Key | English | Vietnamese |
|---|---|---|
| `notice.N-NOSET.below` | Couldn't create a {level} piece set for this board: on the first four piece sets tried, the search went down to one clue without finding a {level} puzzle. Try again, choose another level, or change the board. | Không tạo được bộ mảnh mức {level} cho bàn này: với bốn bộ mảnh thử đầu tiên, việc tìm kiếm đã giảm tới một mảnh đặt sẵn mà không tìm được đề mức {level}. Hãy thử lại, chọn mức khác, hoặc đổi bàn. |
| `notice.N-NOSET.above` | Couldn't create a {level} piece set for this board: on the first four piece sets tried, the search went up to the largest allowed number of clues without finding a {level} puzzle. Try again, choose another level, or change the board. | Không tạo được bộ mảnh mức {level} cho bàn này: với bốn bộ mảnh thử đầu tiên, việc tìm kiếm đã tăng tới số mảnh đặt sẵn tối đa cho phép mà không tìm được đề mức {level}. Hãy thử lại, chọn mức khác, hoặc đổi bàn. |
| `replay.step.noWindow.below` | The search reduced the number of clues to one without finding a clue set at this level. | Việc tìm kiếm đã giảm số mảnh đặt sẵn tới một mà không tìm được nhóm mảnh đặt sẵn đạt mức này. |
| `replay.step.noWindow.above` | The search increased the number of clues to the allowed maximum without finding a clue set at this level. | Việc tìm kiếm đã tăng số mảnh đặt sẵn tới mức tối đa cho phép mà không tìm được nhóm mảnh đặt sẵn đạt mức này. |

Wording A, technical, SA-Astra's earlier proposal, equally accurate:

| Key | English | Vietnamese |
|---|---|---|
| `notice.N-NOSET.below` | Couldn't create a {level} piece set for this board: the first four attempts reached the lowest clue count without finding a suitable window. Try again, choose another level, or change the board. | Không tạo được bộ mảnh mức {level} cho bàn này: bốn lần thử đầu tiên đã giảm tới số mảnh đặt sẵn thấp nhất mà chưa tìm được khoảng phù hợp. Hãy thử lại, chọn mức khác, hoặc đổi bàn. |
| `notice.N-NOSET.above` | Couldn't create a {level} piece set for this board: the first four attempts reached the highest allowed clue count without finding a suitable window. Try again, choose another level, or change the board. | Không tạo được bộ mảnh mức {level} cho bàn này: bốn lần thử đầu tiên đã tăng tới số mảnh đặt sẵn tối đa cho phép mà chưa tìm được khoảng phù hợp. Hãy thử lại, chọn mức khác, hoặc đổi bàn. |
| `replay.step.noWindow.below` | No target-band window was found as the search reduced the clue count to one. | Chưa tìm được khoảng số mảnh đặt sẵn đạt mức mục tiêu khi giảm tới một mảnh. |
| `replay.step.noWindow.above` | No target-band window was found as the search increased the clue count to the allowed maximum. | Chưa tìm được khoảng số mảnh đặt sẵn đạt mức mục tiêu khi tăng tới số mảnh tối đa cho phép. |

**The design statement that replaces "no fail-fast"** (English, `docs/design-detail.md:1805`; the release notes say
the same):

> **No fail-fast on today's route (owner decision P-OD12); a bounded set stage on `gen-v4`'s route.** On today's route
> no fail-fast is built: a set request whose attempts all end `not-in-band` runs to its time limit. On `gen-v4`'s route
> (Nightmare and Hell 1, except the full 26x26 Nightmare board) a set request ends early with the reason
> `no-window-below` or `no-window-above` when its first four attempts all end without a window on the same side (P5;
> the notices `N-NOSET.below` and `N-NOSET.above`). The frozen validation never saw the bound fire (F2), so its
> false-stop rate on real requests is not established.

**Options.**

| Option | Consequences |
|---|---|
| (a) The agreed texts with wording B | plain words users can follow; same meaning as A |
| (b) The agreed texts with wording A | the search's own terms ("window"); same meaning as B |
| (c) Your own wording | any change must stay accurate: it may say what the search did, not that no clue count could work |

The choice changes only wording, never behaviour. The design statement's correction is needed in every option,
because P5 makes the old statement false.

**The SAs' recommendation:** (a), the agreed texts with wording B, and the design statement as written.

**What is blocked meanwhile:** the texts of task P2-09 and the guide sentence of P2-17. The other tasks are not
blocked.

**Answer (owner, 2026-11-25 15:06:53 +07:00):** "Q-P2-5: đồng ý duyệt, tôi sẽ sửa sau nếu thấy không phù hợp."
("approved; I will change it later if I find it unsuitable"), the same message. Read by the orchestrator and both SAs
as the recommended option (a): the agreed texts with wording B, the guide sentence and the design statement as written.
A later rewording by the owner is an ordinary text task with no behaviour change. Recorded as D-P2-16.
