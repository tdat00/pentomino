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

**Plan-author answer (claude-fable-5-2, 2026-11-14).** I read the state report in full, with MP12b1's aggregate, and
checked its anchors in `clues.js`, `deduce.js`, `difficulty.js`, `levels.js` and the worker pool at `53b2313`. I ran
no generation, test or timing. Short version: the report's facts stand; its explanation of the Hell and Nightmare
cost is incomplete; the remaining parts **do not change**, with one recommendation about MP12b2's captures; a faster
generator is a separate feature after difficulty-v3 closes, described in
[docs/improve-generating/plan.md](../improve-generating/plan.md) and **not** to be implemented now.

**1. Review of the time complexity.**

*Accepted as written.* The loop nest and its bounds (2.1); the cost of one rating and of a capped profile (2.2);
that ratings are nearly all of the time; where each cap binds (2.4); the budgets table of 5.1; that no browser
measurement of v3 exists.

*Where the cost model needs correction.*

1. **"G costs" (2.3) is true and is not the reason Hell makes nothing.** The reason is in the clue search. A capped
   profile is spent: it is on no side of the band. In phase 1 of `selectClues` (`clues.js:432-464`), a count whose
   samples are all spent has `below = 0` and `above = 0`, and the phase ends. The count moves by one per step, eight
   steps at most, from `initialClueCount`: 3 or 4 clues on 31 to 90 pieces at Hell. At that count nearly every
   profile caps, so the search ends where it began, after 20 profiles and 38 to 48 s. MP09d2's own result shows the
   band is on the other side: on the 266-cell board Hell 2 candidates were rated **above** the band (best 281). So
   ratings complete above the band, and the search has no way to go from "capped" to more clues. **The evidence
   does not show that the Hell bands are unreachable under v3; it shows that this search does not reach them.**
2. **The cost is asymmetric, and the model treats profiles as equal.** A complete Master rating has a median
   deduction of 36 to 78 ms; a capped profile costs 2 to 2.4 s. The profiles that tell the search least cost 30
   to 60 times more than the ones that tell it most. The Nightmare problem on 144 to 324 cells is this: 22 to 34 %
   of the diagnostic samples capped.
3. **`SHARES` was fitted under v2.** The start counts (0.14 at Nightmare, 0.10 to 0.04 at Hell) come from a rating
   whose score did not rest on decisive guesses. Whether they are the right start under v3 is not measured. I
   expect not, at Nightmare and above. That is a hypothesis.
4. **Nothing learnt is kept.** The count at which a set's ratings fall in the band is found by the calibration and
   searched again from the start by every candidate of every slot.
5. **Risk 3 of 5.6 is a present defect, not only a risk**: 64 profiles at up to 2.4 s is about 150 s, so one
   selection call can outlast the 115 s stop and its whole result is discarded.

*What the present evidence does not support.*

- "Large boards are fast at Nightmare" as a statement about difficulty. The report itself notes the confound: an
  unfinished census counts undecided alternatives as failing, and those cells are 85 to 97 % census estimates. Their
  speed may be the estimate reaching the band early. It is not measured; the cells above 25 % go to the owner at
  MP12b2 as already decided, and I add nothing to that.
- Any cost of a Hell 2 or Hell 3 rating: no rating in those bands was ever timed.
- Any browser conclusion. By the design's planning rule most Nightmare cells would fail BQ; that is a projection of
  a rule, and BQ is outside difficulty-v3.
- That the fail-fast F2 is harmless at Nightmare: no capture measures it there (point 2 below).

*Judgement.* For Very easy to Master the generator is fast enough on every board (T10 max 28.4 s) and I would not
touch it. Nightmare on 100 to 420 cells misses the budgets in Node already. Hell is not offered after MP12b3, and
by D39 that is correct for the generator as it stands.

**2. The remaining parts (MP12b2, MP12b3, MP13a to MP17): no change of algorithm, bound or sequence.**

- **MP12b2** locks the tuple as planned. No census change, no change round for time. The owner questions stay:
  the fail-fast, population R, the cells above 25 % census estimates.
- **MP12b3 part A**: every Hell level gets `[Infinity, Infinity]` if MP12b2's record derives it, as D39 says. I
  confirm this as the v3 release state. It is a statement about this search, and the improvement feature re-derives
  `AREAS` by the same rule afterwards.
- **MP12b3 part B**: my recommendation of F1 + F2 stands. It is the cheap, already-specified guard against the
  115 s request without a set, and the later feature replaces it rather than building on it.
- **MP13a to MP17**: unchanged; they do not touch generation time.
- **One recommendation, about evidence (pack author to check against D40; the owner decides if D40 fixes the
  capture list).** MP12b2 still plans 25 Hell captures (about 105 minutes) although no Hell case met D39, and its
  false-stop check of F2 has no capture at Nightmare, the only level where unrateable calls will remain once Hell
  is withdrawn. I would keep the Hell captures of the three cases that made puzzles, drop the HL captures of the
  cases that made none, and add `any`-mode Nightmare captures on 12x12, 14x14, 15x15b10, 16x16 and 15x20 for the
  false-stop check. Less machine time, and the check is made where F2 will act. If this needs a decision it is not
  blocking: without it, MP12b2 proceeds as written and F2's effect at Nightmare stays a named, unmeasured item.
- **Carried findings, to MP12b2's record and MP17:** Nightmare below 90 % completion on 12x12, 14x14, 15x15b10,
  16x16 and 15x20; the 43 Nightmare requests over 120 s; one call can outlast the stop; the census confound above.
  None is a stop under P-OD9.

*Deferred to the later feature (not now, owner's instruction).* The plan proposes, with a measurement phase and
gates before anything is built: a count search that starts where ratings are cheap and brackets the band by
galloping and bisection; a provisional screen budget under which a completed rating is the canonical rating and a
useless profile costs a fraction of the cap; capped profiles as a direction instead of a dead end; a count prior
carried from the calibration to every candidate and a fitted table replacing `SHARES`; deterministic work budgets
per call; the DLX diagnostic only for accepted puzzles; a wider pool; idle pre-generation; and prepared packs for
Hell 2 and Hell 3 if they prove reachable but too slow. Its first step, the count curves (PM1), is a loop over the
existing `rate` and answers whether each Hell band has a reachable window at all. It needs a new `algo` version
and the owner decisions listed there. None of it is authorised by this answer.
