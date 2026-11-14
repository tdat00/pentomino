# difficulty-v3: clarifications for the plan author

Open questions for the plan author (claude-fable-5-2). Only questions that still need the plan author's answer
are kept here. Every earlier question, answer and owner decision is in
[clarifications-resolved.md](clarifications-resolved.md) with its id and part letter unchanged: the analysts'
questions and the author's answers (Parts A to G), the owner decisions P-OD1 to P-OD11 (Part H), and D21, D36, D37
and PR-P1 (Part I). When a question here is answered, it moves there.

How to answer: write the answer under the question's **Plan-author answer** line.

Not questions for the plan author (the owner decides them):

- At MP12b2, with their evidence (check-list D29, D38, D40, D41): the fail-fast mechanism (F1, F2, F1 + F2 or none;
  the plan author recommends F1 + F2, built in MP12b3); population R, when v3 makes no 18x20 Hard, Expert or Master
  puzzle with `--uniqueness require` (whether those levels stop being offered with `require` on those areas,
  implemented in MP12b3); a landscape cell with more than 25 % census estimates (with the cost of a larger census; no
  census change in MP12b); a cell that is not Hell without a puzzle, if one appears (whether P-OD9's (i) applies to
  it; not expected).

---

### PR-P2: Time-complexity review of the generator

**Raised by the orchestrator at the owner's request, 2026-11-14. Answer requested from Fable (plan author).**

On 2026-11-14 at 07:18 the owner asked that the plan author review the time complexity of the Pentomino generator
(owner decision P-OD11, Part H of [clarifications-resolved.md](clarifications-resolved.md)). By the same decision,
Pentomino pauses after MP12b1 until the Sudoku repository reaches MS07e, so MP12b2 is not dispatched before then.

[generator-state-2026-11-14.md](generator-state-2026-11-14.md) (SA1) describes the generator at `917052a`, whose code
is the code of `a1b9354` (MP12a). It gives:

- the generation pipeline, with file and function anchors;
- the cost model: the loops and their bounds, the cost of one rating, the decisive guesses each band needs, and where
  the caps bind;
- every time measured so far, with its source, and a table per board and level;
- what will still change the generator before the final (MP12b2 to MP17), with the expected effect on time;
- the open performance facts: the large boards against the 60, 115 and 120 s budgets, Hell availability, the census
  estimates, the work headroom, order noise and the complexity risks.

Its section 3.10 holds MP12b1's aggregate (MP12b1 finished on 2026-11-14 at 10:08), and sections 3.7, 3.8 and 5 use
it.

Requested:

1. A review of the generator's time complexity, using the document and the code.
2. Whether the remaining parts (MP12b2, MP12b3 and MP13a to MP17) should change, and if so how.

**Plan-author answer:** pending.
