# difficulty-v3: clarifications for the plan author

Open questions for the plan author (claude-fable-5-2). Only questions that still need the plan author's answer
are kept here. Every earlier question, answer and owner decision is in
[clarifications-resolved.md](clarifications-resolved.md) with its id and part letter unchanged: the analysts'
questions and the author's answers (Parts A to G), the owner decisions P-OD1 to P-OD8 (Part H), and D21, D36 and
D37 (Part I). When a question here is answered, it moves there.

How to answer: write the answer under the question's **Plan-author answer** line.

Not a question for the plan author: the owner's choice of D36, (i) stop offering, (ii) a different contract or
(iii) a separate engine project, is put to the owner at MP12b2 with its evidence
(clarifications-resolved.md Part I, D36).

---

## PR-P1: review of the progress at the pause

**Raised by the orchestrator at the owner's request, 2026-11-13. Answer requested from Fable (plan author).**

The owner paused all work on 2026-11-13 at 17:52 so that the plan author reviews the progress before the work
continues. [working-status.md](working-status.md) gives the state at the pause (22 of 35 tasks committed; MP12a
paused while closing), the issues met and the resolution chosen for each, and the differences from the plan,
the analysts' report and the accepted task pack. The pause state is committed on `rating-v3`.

Requested:

1. The direction to take next: whether the remaining sequence (close MP12a, then MP12b1, MP12b2 and MP13a to
   MP17) continues as planned or changes.
2. Any difference in working-status.md section 5 that you do not accept, and what replaces it.

**Plan-author answer (claude-fable-5-2, 2026-11-13).** I read working-status.md in full. Two owner decisions
were taken on the command line the same day and are recorded here as **P-OD9**: D36 is decided now, option (i);
and a lighter stop and review rule for the remaining parts.

**1. Direction: continue in the planned order, with the Hell work reduced.** This repository is on course: 22 of
35 parts, v3 active since MP09d2, and the slice confirms the original goal on the four measured boards (levels
ordered, every Hard-or-above puzzle with a proved decisive guess, no capped path, completion equal to v2). Close
MP12a, then MP12b1, MP12b2, MP12b3, MP13a to MP17, serial. I accept the orchestrator's choice not to open a side
stream: the saving (3 to 6 hours) is small beside the Sudoku repository's remaining work on the same machine.

- **D36 is decided: (i), stop offering what v3 cannot make (owner, P-OD9).** Consequences:
  - MP12b1 keeps the 3-request prescreen of the 25 Hell cases (it is what locates the boundary) and runs the 20
    requests only for a Hell case whose prescreen made a puzzle. The 20-request "boundary case of each Hell level"
    of D37 (c) is dropped where the prescreen made nothing: a case that makes no puzzle in three requests is not
    offered and needs no further evidence.
  - MP12b3 is no longer conditional. It changes the `AREAS` of `core/engine/levels.js` so that a Hell level is
    offered only on the board areas where MP12b1's 20-request run meets the same completion criterion as the
    other levels; a Hell level that meets it nowhere gets `[Infinity, Infinity]` (never generated), as the table
    already allows. Design §7.5, both user guides and the Generator's level list follow; packs and links made
    earlier still open and are re-rated for display, as decided. Option (iii), a faster first-solution search for
    large boards, stays possible later work outside difficulty-v3.
  - MP12b2 no longer asks the owner the D36 question. It still presents the fail-fast table; my recommendation is
    F1 + F2 (end a selection call after four profiles that are all unrateable, and end a set request after an
    attempt whose calibration was entirely unrateable), built in MP12b3, because irregular boards can still meet
    unrateable sets after the levels are hidden.
- **Stops and reviews (owner, P-OD9).** As in the Sudoku repository: a part stops for the owner only for a
  correctness failure or when it would have to change a recorded decision; a performance or availability finding
  is recorded as a named item with its numbers and goes to MP12b2's record or to MP17. The analysts cross-review
  only parts that change rating or generation semantics (MP12b2's lock, MP12b3) and the replay comparison
  (MP15a1); the other parts are checked by the orchestrator.
- **No change round for estimates or for Hell.** MP12b2 orders a change round only if C1 (levels ordered) or C3
  (`Gproved >= 1` at Hard and above) fails in a cell that stays offered, or if C2 fails by more than its 10
  points. A cell above 5 % census estimates is a recorded finding (point 2 below), never a reason to rerun the
  complete population.

**2. Section 5: every difference is accepted, with these remarks.**

| Rows | Position |
|---|---|
| K2 to K5, the tuple `12 / 3 / [0, 0, 2, 3] / G 5 / info 0.5 / (1, 2)` | **This is the tuple to lock**, unless MP12b1 breaks C1 or C3. Values on range edges are acceptable: the ranges of JR-P3 bounded the search, they were not predictions, and I do not want them widened for another fit. What the tuple says is simple and is what was asked for: with `base.scale` 3 the piece count stops mattering after about six pieces, and the level is carried by the number of decisive guesses (about 1 for Hard, 2 to 3 for Expert, 5 to 7 for Master, 8 or more for Nightmare); the number of alternatives adds little. The penalty (1, 2) restores what SA1-Q-P1 said; the data do not separate it from (0, 0), so the documented intent wins |
| K6 | Accepted: a puzzle without a decisive guess scores at most 15, below Hard |
| K8, K9 | Accepted (D19, P-OD2) |
| K10, G6, the census and the 5 % rule | Accepted, including the owner's two exceptions. For the full landscape: a cell above 5 % is listed with its share and shipped with the estimate note and the `censored` flag; AR1 already guarantees that a generated Hard-or-above puzzle has a proved decisive guess, so an estimate can overstate a score but cannot invent the level's defining property. Only a cell above 25 % is put to the owner, with the cost of a larger census. No further census change in MP12b |
| R7, order noise | **Confirmed: one canonical order, no median.** The slice's spread (G by up to 2 at Hard in 3 of 50 lines of one cell) is what plan §5 was worried about, and with 5 points per guess it can move a puzzle by one level. It is a property of the label, not an instability: a given puzzle always gets the same rating, and the Generator aims at the band centre. A median of three orders would triple the rating cost, which on Master is already the slow part. It is recorded as a known limitation in design §7.8 and in the final record |
| R9, C5, the Hell rows | Decided above (P-OD9) |
| G2, G8, G9, G10, the calibration structure | Accepted, with the reductions of point 1 |
| G4, C2 by request completion rate | Accepted. The generator only returns in-band puzzles, so completion is the availability the plan's "hit rate" meant; a rescore measures the score model, not the generation |
| G7 (TP21), G11 | Accepted |
| F2 (FP04), F7 (the load retry D1), F8 (`fitDetailLine`) | Accepted. D1 fixes a flake that predates this work; keep MP17's "no re-run allowance" for that page |
| F4, the Player's built-in sample (check-list D20) | My recommendation to the owner: leave the sample file byte-for-byte (it is the source of the frozen v1 code goldens). Its v2 claims are already re-rated for display with the note, so the Player shows v3 levels for it; no task is needed |
| 5.6 to 5.9 | Accepted |

**3. Remaining work to the original goal, in order.**

1. Close MP12a (the four closing steps of working-status §2.2), with P-OD8 and this answer recorded.
2. MP12b1, full landscape, Hell reduced as above.
3. MP12b2: search evidence, the lists, the fail-fast table, design §7.8, the lock on the tuple above.
4. MP12b3: `AREAS` for the Hell levels and the fail-fast (F1 + F2 if the owner agrees at MP12b2).
5. MP13a to MP16b: provenance, recorders, replay and the Generation Steps dialog, on the locked source.
6. MP17: final regression and compatibility evidence, the release notes, and the plan §6 probe on 10x6 and 20x18,
   which must show no Hard-or-above puzzle without a proved decisive guess.

One measurement I want reported by MP12b2, because it decides whether "Hard is really hard" holds on large boards
when a unique solution is required: population R (18x20 Hard, Expert and Master with `--uniqueness require`). In
the v2-made corpus none of those puzzles had a decisive guess. If v3 cannot make them either, the honest outcome
is the same as for Hell: Hard and above are not offered with `require` on those areas, and that is put to the
owner with the numbers at MP12b2, not worked around.
