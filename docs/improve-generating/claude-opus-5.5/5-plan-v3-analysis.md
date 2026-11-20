# Plan version 3 (Pentomino): analysis, phase 1

Analyst: Opus (claude-opus-5.5), 2026-11-15. Independent phase-1 analysis; Astra's new file was not read.

**Basis.**

- `plan.md` at `8d795f8` (version 3, 623 lines) and `clarifications.md` at `8d795f8`: the answers IG-P-Q19 to
  IG-P-Q24, the positions and decisions IG-P-D1 to IG-P-D7, and "Plan version 3".
- `plan-v2-joint-report.md` (the joint report on version 2), the reference for fidelity.
- Evidence: `evidence/provisional/summary.md` (R00 to R33); the IGP-01, IGP-02, IGP-03h and IGP-05 records;
  MP12b1's aggregate and per-cell run records in `docs/difficulty-v3/landscape-v3-full/`.
- Source: the worktree's `core/` is `cd5d17f`. `rating-v3` at `6122dc9` was read with `git show` only; the main
  working tree was not opened.
- Nothing was run except read-only Node scripts over committed JSON (MP12b1 run records, IGP-01 and IGP-03h
  `compare.json`) and a textual check of the prototype's edit anchors against `git show 6122dc9:<file>`.

**Labels.** *Measured*: a committed record. *Derived*: arithmetic on records, or a reading of the source's
control flow. *Analysis*: judgement. Severity: **High** blocks a phase or a decision; **Medium** changes a
number, a stage or a statement that the design or the owner acts on; **Low** is local wording or a pointer.

## Summary

- **Fidelity (A).** Version 3 takes in all 22 corrections of the joint report's (e), its answers, its
  candidate verdicts, its speed table, its frozen-round scope, the six plan-author answers and the seven
  owner decisions. Two items are partly taken in, and one has a changed meaning (the 12x12 population
  baseline). Nothing that binds a gate is missing.
- **New findings (B):** 0 High, 8 Medium, 9 Low. The Medium ones:
  - the per-set prior's factor is applied to the whole of T10 instead of the batch, so the Hell 1 forecasts
    are about 5 % optimistic, and 20x20 misses the browser target even at the optimistic end;
  - the 14x14 Hell 1 "half the pieces or more" premise is wrong: K is 32 to 34 there, and the windows are 0.34
    to 0.44 of K;
  - MP12b3 built no fail-fast, which version 3 still describes as present;
  - the MP13a to MP14b contracts (provenance, skip replay, recorders) are missing, although `gen-v4` and the
    prototype both meet them on the frozen source;
  - the freeze stage omits P5's budget table and the IG-P-D1 reserve;
  - the Hell 1 part of the reduced PM1 runs after the freeze it is meant to feed;
  - phase 0's completion gate is global over five cells, two of which never ran the new search;
  - the 5 to 9 h price indication leaves out about 4 h of today's-arm runs.
- **Speed (C).** Section 4 matches the evidence except its two Hell 1 rows: 17.4 s (11.6 to 27.5) and 21.8 s
  (14.5 to 34.5) after the mix; 75 s and 92 s under the browser sensitivity. No measured number has moved
  since my version 2 speed table.
- **Questions (D):** IG-P-Q25 to IG-P-Q28. There is no new owner decision; Q25's answer changes the
  manifest's price.
- **Pruning (E):**
  - delete `plan-v2-joint-report.md` and the v2-round analyst files after the v3 joint report, with three link
    fixes;
  - keep `report.md`, the v1-round analyst files, `clarifications.md`, `evidence/` and the task pack;
  - cut about 30 lines of version narration from `plan.md`, its section 0 included.

## A. Fidelity

Status: **in** (taken in), **partly**, **missing**, **changed** (taken in with a changed meaning). Lines are
`plan.md` at `8d795f8`.

### A.1 The joint report's corrections (its section (e))

| # | Correction | Status | v3 line | Note |
|---|---|---|---|---|
| e1 | the search is shown on two cells of the 196 to 324 class, not three; no completion or tail gate | in | 44-45, 441-444 | |
| e2 | "no useful rating lost" was 0 of 0 and 0 of 2; 256 to 324 cells unmeasured | in | 239 | worded as a v2 quotation; see E.2 |
| e3 | the screen on Hell is "not shown to pay" (n 2: x0.67 and x1.08) | in | 45, 152, 238 | |
| e4 | DLX 3.3 to 4.0 % profiles today's search; 3.6 % and 10.2 % over windows; P6 after `gen-v4` unmeasured | in | 119-120, 320-321 | |
| e5 | no single "first phase" factor out of P6, eight workers and the unmeasured kernel | in | 452-454 | |
| e6 | 26x26 Nightmare: paired x2.01 (0.69 to 3.91) at 190 M; the default arm unmeasured | in | 241, 431 | |
| e7 | the dead end is inside the broad 30 to 60 % only, below the per-cell ranges; profile time | in | 102-104 | |
| e8 | Hell 1 reached ten on two boards, two requests each | in | 129, 449 | |
| e9 | window profiles: mean 0.84 to 4.15, p90 3 to 13, maximum 27; Hell calls 6.2 and 9.4 | in | 207-208 | |
| e10 | 18x18 to 24x24 Nightmare unmeasured, not x1.5 to 2 | in | 434 | |
| e11 | 16x16 and 15x20 unpriced, in different regimes | in | 433 | |
| e12 | 10x10 has no request-level run; 0 % against 10 % | in | 447-448 | |
| e13 | the small-set cohorts (3x29, 10x10) have K 17 to 19 | in | 620-621 | |
| e14 | the Hell 2 and Hell 3 closure is a scope decision; witnesses outside the policy areas | in | 33-34, 58-62 | |
| e15 | "17 to 53 s of rating per in-band rating" | in | - | the Hell 2 pack text is gone |
| e16 | "pass today" means completion-passing; 18x18 has a p95 of 134.5 s | in | 514-517 | |
| e17 | the work cap is also tested by R7, the probes, the replay and the census | in | 88 | |
| e18 | screen-capped means exceeding `W_screen`, not reaching it | in | 222-223 | |
| e19 | no proven ceiling on the search side; "three to four ratings" withdrawn | in | 207-209 | |
| e20 | C2 already exists in `gen-v3` | in | 29-30, 89, 165 | |
| e21 | ten seeds give only a maximum as p95; OD-P4 uses 20 requests | in | 38, 476-479, 512-513 | |
| e22 | forecasts at four workers; R31 carried an eight-worker factor | in | 27-28, 418-421 | |

### A.2 The joint report's other positions

| Item | Status | v3 line | Note |
|---|---|---|---|
| (b) 1: C1's exact R4 charge, the check sites, `reachable`, three representations, x1.04 to 1.15 | in | 333-347 | |
| (b) 2: the batch waves; the existing scheduler; the missing journal linkage | in | 89, 309-315 | |
| (b) 3: C3 as a data-only test first; no forecast credit | in | 391-397 | |
| (b) 4: C4, counting first; key covers `sameState`; needs approval | in | 398-401 | |
| (b) 5: one sensitivity formula; the frozen-round arms | in | 418-421, 468-474 | the formula carries the error in JV3-P01 |
| (c) the verdicts of P1 to P11, C1 to C5 | in | 148-165, 357 | "never multiply C1, C5 and P11" kept |
| (c) the cost estimates | partly | 345, 386 | C1's test lines and the costs of C3, C4, C5 and the journal linkage are not carried; none binds |
| (d) the speed table and the completion lower bounds | in | 426-442 | the 12x12 190 M row is dropped, consistent with OD-P7 |
| (d) 12x12 population "0.200 to 0.211 (six seeds)" | changed | 430 | the label is dropped; see JV3-P11 |
| (g) preconditions, seeds, arms, controls, journals, spikes, separately approved runs, budget | in | 463-493 | |

### A.3 The plan-author answers

| Answer | Status | v3 line | Note |
|---|---|---|---|
| IG-P-Q19: unit, tolerance, "faster", completion, no regression, order, first values | in | 495-518 | |
| IG-P-Q20: 20 seeds disjoint from fitting seeds, native controls, five stages, stopping, envelope | in | 458-493 | |
| IG-P-Q21: 14x14 and 24x24 as candidates; five-seed pilots; the 14x14 caution | in | 55-56, 266-267, 471, 473, 605-606 | its unchecked K premise is wrong (JV3-P02) |
| IG-P-Q22: C2 withdrawn; P5's budget arm against existing scheduling; prefetch only as a named variant | in | 29-30, 309-315 | |
| IG-P-Q23: D39's rule for offers, the median transform as a sensitivity, calibration as stage 1 | partly | 422-424, 470 | the answer promised the D39 figure beside the browser column; version 3 gives it for today's 26x26 only and says no maximum of the new search is usable yet, which is a fair reason |
| IG-P-Q24: the closure as a scope decision; the data-only inventory first | in | 33-34, 58-62, 382, 474 | |

### A.4 The owner decisions

| Decision | Status | v3 line | Note |
|---|---|---|---|
| IG-P-D1: one request deadline, four conditions | in | 299-307, 537, 575 | the freeze stage omits the reserve (JV3-P05) |
| IG-P-D2: progressive presentation now, in fold order, with the history policy | in | 538, 543-551, 576 | placed in phase 1 (JV3-P17) |
| IG-P-D3: the population rule with three conditions | in | 258-269, 577 | |
| IG-P-D4: no screen up to 144 cells | in | 240, 578 | |
| IG-P-D5: the reduced PM1 in stages | in | 474, 579 | order against the freeze (JV3-P06) |
| IG-P-D6: Hell 2 and Hell 3 closed; 24x24 and 14x14 Hell 1 arms | in | 55-62, 471, 473, 580 | |
| IG-P-D7: a separately priced, staged manifest | in | 460-461, 488-490, 581 | |

## B. New or remaining issues

| ID | Kind | Severity | v3 line | Finding | Proposed fix |
|---|---|---|---|---|---|
| JV3-P01 | Derived | Medium | 280, 418-421, 435-436, 449-451 | The per-set prior removes profiles of the batch: P4 says "on Hell batch time". Section 4 multiplies the whole T10 by `gamma`. The set stage is 0.18 of T10 on Hell 1 26x26 without the screen (T1 6.14 and 6.28 s against T10 28.12 and 40.37 s; IGP-03h) and 0.17 on 20x20 (7.15 against 42.89 s). The joint report's formula, which I wrote, had the same slip | `T = [T1 + (T10 - T1) * gamma] * (1 - g + g/k)`. Hell 1 26x26: 17.4 s (11.6 to 27.5); 20x20: 21.8 s (14.5 to 34.5). Browser sensitivity 75 and 92 s. Reading 5: 20x20 misses the 13.75 s Node target even at the optimistic end |
| JV3-P02 | Measured | Medium | 266-267, 605-606 | "Hell 1 on 14x14 may give half the pieces or more" rests on "K about 21, as on 14x14 Nightmare". The four failing 14x14 Hell 1 sets have K 32, 34, 32 and 34, start count 3, and in-band windows at 11 to 14 clues (`IGP-05/pm1.md` part 3): 0.34 to 0.44 of K. That is like 20x20 without the screen (0.357) and PM1's windows (0.370). On 24x24: K 39 to 42, windows at 6 to 13 clues, 0.15 to 0.31 | Keep 14x14 as the largest offset (+8 to +11 clues, against a start of 3), but state the clue share. Correct section 8 and the OD-P6 framing the owner sees |
| JV3-P03 | Fact | Medium | 115-117, 253-254, 410, 616 | MP12b3 (`2f2035e`) built no fail-fast (P-OD12): `rating-v3` has no F1 or F2. "MP12b3's F1 and F2 stay as they are for `gen-v3`; the design lists which of their conditions remain under `gen-v4`" describes code that does not exist | Cite MP12b2's false-stop check (11 of 18 at Nightmare) as the reason that no fail-fast exists, and delete the instruction to the design |
| JV3-P04 | Fact | Medium | 68-75, 463-466 | MP13a and MP13b (provenance in the engine, packs, client and CLI), MP14a (the rating detail channel, clue-stage recorders, skip replay RES-27 with `replaySkips`, `SKIP_BOUNDS` and `SkipReplayError`) and MP14b (set and layout recorders, recorder identity) changed `clues.js` by 342 lines, `generate.js` by 104 and `difficulty.js` by 100, and added `tests/fixtures/replay-case.json` pinned to `gen-v3`. Version 3 names none of these contracts. The 16 direct find-anchors of the prototype variants still match exactly once at `6122dc9` (Derived), but `p1p5` replaces the whole `selectClues` by `igSelectProto`, so on the frozen source the prototype would bypass the recorders and the skip ordinals. The precondition list also leaves out `difficulty.js`, where P6's edit `p6-1` sits | Add a constraint: `gen-v4` defines its skip ordinals, recorder events and provenance for P1 to P5, with its own replay fixture. Add to stage 1 a rebase of `ig-select-proto.js` onto the recorder and skip contract, with `difficulty.js` and MP13b in the list (IG-P-Q28) |
| JV3-P05 | Analysis | Medium | 471-473, 537 | Stage 2 fits the P5 budget table and the IG-P-D1 reserve; phase 0's gate requires "the reserve of IG-P-D1 fitted". Stage 3 freezes only "the table, the priors and any ranker", and stage 4 does not say whether P5 and the one deadline are active. Validation would then measure a generator that phase 2 does not ship | Stage 3 freezes the budget table and the reserve too; stage 4 runs with P5 and the one deadline active, and counts lost completions |
| JV3-P06 | Analysis | Medium | 474, 579 | The reduced PM1's Hell 1 part "feeds the per-set prior" (and P4's Hell 1 table), but it is stage 5, after the freeze (3) and the validation (4). Its result would then reach `gen-v4` unvalidated, or require a second validation | Move the Hell 1 part, after the data-only inventory, before stage 3. Or state that validation uses the existing window prior (part 1 and R28), and that the reduced PM1 informs only a later refit with its own validation (IG-P-Q27) |
| JV3-P07 | Analysis | Medium | 512-513, 537 | Phase 0's completion gate needs 18 of 20 "on each failing Nightmare cell". Two of the five, 16x16 and 15x20, have never run the new search and are in other regimes (63 % and 27 % capped). One failing cell stops phase 2 for all, and no per-cell fallback is defined, although `gen-v4` already keeps a legacy path for Master | Decide whether the gate is global or per cell (IG-P-Q26) |
| JV3-P08 | Derived | Medium | 476-479, 488-490 | The indication "about 5 to 9 h" (my v2 median figure) predates version 3's content. From MP12b1's run records (the sum of `responseMs` over 20 requests per cell) and the prototype medians, stage 4 alone takes about 4.2 to 4.9 h without today's arm on the headline cells, and 8.4 to 9.1 h with it. If the 24x24 and 14x14 Hell 1 pilots qualify, add up to 2 h. Today's arm on the five failing Nightmare cells and Hell 1 26x26 and 20x20 is about 4.2 h at 20 seeds, mostly requests that run to the 115 s stop, and no gate of 5.2 needs it. 20x20 alone is 20 x 115 s of "no set" | Run today's arm only where a gate needs it (the completion-passing controls), and take today's population from MP12b1's records or difficulty-v3's final records. Or limit today's arm to five seeds on the failing cells (IG-P-Q25). Price phase 2's repeated validation too |
| JV3-P09 | Fact | Low | 81-91, 252, 564 | The anchors of 2.1 are `cd5d17f` lines. At `6122dc9`: `clues.js:432-464` is 653-685; `generate.js:554` is 638; `policy.js:87` is 88; `generation-client.js:447, 575, 812` are 462, 590, 842 and `1057-1085` is 1098-1126; the capped throw in `difficulty.js` (240-253) is near 316; `tests/clues.test.js:701` is 820. `deduce.js` and `levels.js:18` are unchanged | Pin 2.1 to `cd5d17f`, or re-derive at the freeze with the prototype's anchors |
| JV3-P10 | Analysis | Low | `clarifications.md` 1482-1483 | "It ran nothing and changes no gate": version 3 adds the validated `W_screen` table and the fitted reserve to phase 0's gate, and the blind comparison to phase 3, and it defines the statistics | Say "refines the gates" |
| JV3-P11 | Derived | Low | 416, 430 | "Today" is defined as MP12b1's 20 requests, but 0.200 is the six-seed subset (R33). MP12b1's 185 puzzles give 0.211 (R32), so against today the no-screen arm shows no shift, as Reading 3 says | Restore "(six seeds)" or print 0.211 to 0.211 |
| JV3-P12 | Fact | Low | 238 | "it loses 16 of 47 window ratings on 215 to 484 cells (R33)": the figure is `IGP-05/pm1.md` part 1 (380 M: 16/47), R27's population | Cite IGP-05 (R27) |
| JV3-P13 | Analysis | Low | 63-66, 273 | The non-goals list `SHARES` in the locked tuple, while P4 replaces it as `gen-v4`'s start | Say that the lock binds `gen-v3` and the legacy path |
| JV3-P14 | Analysis | Low | 240, 471, 591 | OD-P7's revisit needs "matched frozen-round evidence", but stage 2 runs only "none" and no screen on cells of up to 144 cells, so no 190 M arm runs on 12x12 | Add a five-seed 190 M pilot arm on 12x12 (under a minute), or drop the revisit |
| JV3-P15 | Measured | Low | 274-275 | "Where today has no accepted puzzle (Hell 1 on the candidate boards)": MP12b1 accepted 5 (14x14), 13 (24x24) and 134 (26x26) Hell 1 puzzles. Only the prescreened boards of 215 to 484 cells have none | "on the prescreened boards" |
| JV3-P16 | Analysis | Low | 473 | All 16 Master cells at 20 seeds in two arms are about 3,564 s of timed runs (MP12b1 sums) for an identity that holds by construction on the legacy path | Check identity by an untimed replay of a few seeds per cell plus the scope test; time only where a timing gate applies |
| JV3-P17 | Analysis | Low | 538, 543-544 | IG-P-D2 says progressive presentation "now"; version 3 places it in phase 1, which follows phase 0 in the table | State that P6 and progressive presentation do not wait for phase 0's gate |

**Basis of JV3-P08 (Derived).** MP12b1's request sums at 20 seeds:

- today's arm on the failing Nightmare cells: 12x12 1,597 s, 14x14 2,684 s, 15x15b10 2,448 s, 16x16 1,797 s and
  15x20 1,458 s, 9,984 s in all;
- today's arm on Hell 1: 26x26 2,857 s, 20x20 2,300 s (20 x 115 s), and conditionally 24x24 2,801 s and 14x14
  2,747 s;
- the ten completion-passing Nightmare cells: 5,122 s;
- the 16 Master cells: 1,782 s per arm.

The new-search arms use the prototype medians times 20, with 16x16 and 15x20 assumed like 14x14: 3,984 s, and
1,800 s for the conditional Hell 1 cells. The controls' new arm is taken as 0.5 to 1.0 of today. The pilots are
about 1.5 to 2.5 h; stage 1 is about 0.1 h, or 0.6 to 1.1 h with the browser calibration. Stages 1 to 4 then
come to about 6 to 8.5 h without today's headline arms, and 10 to 12.5 h with them.

## C. Speed before and after

The baseline of section 4 is MP12b1 on `cd5d17f`'s runtime (digest `34cea386…`), and so is every prototype
arm. At `6122dc9`, MP12b3 changed only availability (Hell `AREAS` to `[Infinity, Infinity]`, `POLICY_ID`
`mixed-v3`). MP13a to MP14b added provenance and recorders under D35, which changes no rating or puzzle. Their
cost in time is unmeasured; stage 1's identity receipt and today's arm will show it. No measured number in my
version 2 speed table has moved. The table below checks section 4 against the records.

| Cell | Version 3, section 4: today; after `gen-v4`; mix; browser | Evidence | Status |
|---|---|---|---|
| 14x14 Nightmare | 113.0 s (11); 8.9 s, 3 of 3; 5.4 s (4.3 to 7.2); 41 / 27 s | MP12b1 113.0; R02 8.94 | matches |
| 15x15b10 Nightmare | 86.2 s (11); 8.5 s; 5.1 s (4.0 to 6.8); 39 / 26 s | MP12b1 86.2; R04 8.45 | matches |
| 12x12 Nightmare, no screen | 62.1 s (17); 16.5 s, 6 of 6; 10.0 s (7.8 to 13.2); 71 / 45 s | MP12b1 62.1; the IGP-03h note 16.5 | matches; population label (JV3-P11) |
| 26x26 Nightmare | 18.6 s (20); 11.9 s, 6 of 6; 7.3 s (5.7 to 9.6); 53 / 34 s | MP12b1 18.6; R06 11.94 | matches |
| 10x10 Nightmare | 24.0 s (19); not run; 14.6 s (11.5 to 19.3); 101 / 64 s | MP12b1 24.04 (19 of 20) | matches |
| 16x16, 15x20; 18x18 to 24x24 Nightmare | 79.8 and 40.1 s; 11.6 to 37.3 s; unpriced | MP12b1 (32x15 11.6, 18x18 37.3) | matches |
| Hell 1 26x26 | 108.7 s (9); 34.2 s, 2 of 2; **16.7 s (10.6 to 27.5)**; 142 / **72 s** | IGP-03h 34.24; T1 6.21 | **corrected: 17.4 s (11.6 to 27.5); 142 / 75 s** |
| Hell 1 20x20 | no set; 42.9 s, 2 of 2; **20.9 s (13.3 to 34.5)**; 177 / **89 s** | IGP-03h 42.89; T1 7.15 | **corrected: 21.8 s (14.5 to 34.5); 177 / 92 s** |
| 14x14 / 26x26 Master | 2.57 / 8.36 s; with P6 2.2 / 7.5 s; 1.3 / 4.6 s; P6 14 / 35, mix 10 / 23 s | MP12b1; R22 factors 1.181 and 1.117 | matches; "with P6" is Derived, not Measured |

**Formula of the correction (Derived).**

- `T_mix = [T1 + (T10 - T1) * gamma] * (1 - g + g/k)`, with the central case `gamma` 0.8, `g` 0.95 and `k` 1.7.
  The kernel term is 0.6088 in the central case, 0.4764 at the optimistic end and 0.8038 at the pessimistic end.
- Hell 1 26x26: `[6.21 + 28.03 * 0.8] * 0.6088 = 17.4` s. The optimistic end is `[6.21 + 28.03 * 0.65] * 0.4764 =
  11.6` s.
- Hell 1 20x20: `[7.15 + 35.74 * 0.8] * 0.6088 = 21.8` s. The optimistic end is 14.5 s.
- A median of 60 s under the sensitivity needs a Node T10 of 13.75 s. 26x26 reaches it only at the optimistic
  end; 20x20 does not reach it within the stated ranges.

**Availability.** The completion bounds of Reading 1 stand: 37 % for 3 of 3, 61 % for 6 of 6 and 22 % for 2
of 2, one-sided at 95 %. No cell becomes offerable before the frozen round. Under the sensitivity, Hell 1 on
20x20 needs a service level (OD-P5 (b)) or packs (P10) even if the kernel spike reaches `k` = 2.2.

## D. Questions and decisions

**IG-P-Q25. Today's arm in the validation.**

- *Question.* On which cells does today's search run on the 20 validation seeds? Version 3's "otherwise
  today's search runs in the same round on the same seeds" (lines 477-479) reads as every headline cell.
- *Evidence.* No gate of 5.2 needs today's arm on the failing Nightmare cells or on Hell 1. There it costs
  about 4.2 h, mostly 115 s stops (JV3-P08).
- *Options.* (a) Today's arm only on the completion-passing controls (the no-regression ratio), with today's
  population taken from MP12b1 or difficulty-v3's final records. (b) Today's arm on every headline cell.
  (c) (a), plus five seeds of today's arm on the failing cells for a paired factor.
- *Recommendation.* (c). Today's arm on Hell 1 20x20 is never worth running: MP12b1's prescreen already
  records "no set".

**IG-P-Q26. Phase 0's completion gate: global or per cell?**

- *Question.* If 16x16 or 15x20 misses 18 of 20 while the other failing cells pass, does phase 2 stop for all
  cells?
- *Options.* (a) Global, as written. (b) Per cell: a cell that fails keeps today's search through
  `gen-v4`'s legacy path and stays as offered today, under D39. (c) Per class of P2's table.
- *Recommendation.* (b). A dead-end entry or a failed certificate stays global.

**IG-P-Q27. The reduced PM1's Hell 1 part against the freeze.**

- *Question.* Should the Hell 1 failing-set work of stage 5, which feeds the per-set prior and P4's Hell 1
  table, move before stage 3? Or does validation use the existing windows (part 1 and R28), with the reduced
  PM1 informing only a later refit (JV3-P06)?
- *Recommendation.* Run the data-only inventory and the Hell 1 failing-set work before stage 3. Keep the Hell 2
  part in stage 5.

**IG-P-Q28. `gen-v4` and the MP13a to MP14b contracts.**

- *Question.* `selectClues` now carries skip ordinals for replay (RES-27), a recorder channel (RES-28) and
  provenance, and the replay fixture pins `gen-v3`. Version 3 does not name these contracts.
  - Does `gen-v4` define its own skip ordinals and recorder stages for P1 to P5?
  - Must the frozen prototype run with the recorders, so that its timing compares with today's arm on the
    same source (JV3-P04)?
- *Recommendation.* Yes to both. Add the contract to section 1's constraints and the prototype's rebase to
  stage 1.

**Owner decisions.** None new. Q25's answer moves the manifest's price by about 3 to 4 h and reaches the owner
with the manifest (section 7, "Still to come").

## E. Pruning proposal

### E.1 Companion files

| File | Proposal | Reason |
|---|---|---|
| `report.md` (the v1 speed report) | keep; add a one-line banner: "superseded by `plan.md` version 3; errata in `clarifications.md`, Audit addendum" | `summary.md`'s R-rows judge its estimates by section ("report §1" to "§4"), and so do `tasks/improve-generating/check-list.md` §5 and `tools/ig-proto/README.md:5`. The audit addendum cites its lines. A record that cannot be edited depends on it |
| `plan-v2-joint-report.md` | delete once the v3 joint report exists | version 3 takes in its corrections, answers, verdicts, speed table and scope (A.1, A.2), and the decisions are recorded in `clarifications.md`. Its links: `plan.md:5` and `clarifications.md:1104, 1341`, each to become "`plan-v2-joint-report.md` at `ed52013`". Lost if deleted: only the cost estimates of C3, C4 and C5, which bind nothing |
| `claude-opus-5.5/` and `gpt-6-astra/` 1-* and 2-* (the v1 round) | keep | the evidence record (`summary.md` R02 and R29, `summary.json`), `summary.mjs` and the executed check-list cite `2-cross-review.md` as the source of the estimates; `report.md` and the 2-* files cite the 1-* files |
| `claude-opus-5.5/` and `gpt-6-astra/` 3-* and 4-* (the v2 round) | delete with `plan-v2-joint-report.md` | superseded by the joint report and version 3. They are cited only by `plan-v2-joint-report.md` and by each other, so no link remains; pin "at `ed52013`" in the v3 joint report's basis |
| `clarifications.md` | keep every section | it is the decision log. The closing note, the audit addendum and the "Plan version 2" summary are dated records that the answers cite. No trim |
| `evidence/` | keep all | no working draft: IGP-00 to IGP-06, IGP-03h and `summary.md` / `summary.json` are records written by the runner, and the firewall and identity checks use them |
| `tasks/improve-generating/*` | keep | the executed pack and its execution logs say how the evidence was produced; `tools/ig-proto/README.md` and `clarifications.md` cite it; the frozen round's pack starts from its harness |

### E.2 Version 1 and version 2 remnants in `plan.md` (version 3)

| Lines | Text | Proposal |
|---|---|---|
| 3-8 | "Version 2 with its section 9 addendum is this file at ... merged into the sections they belong to" | replace by one line: "Earlier versions: 2 at `240398f`, 1 at `555197b`; the change record is in `clarifications.md`, 'Plan version 3'". Keep lines 9-11 (the provisional status) |
| 25-48 | section 0, "What version 3 changes" | delete. Each item is in the body (1: 418-421; 2: 165, 309-315; 3: 277-281; 4: 58-62; 5: 55-56; 6: 495-518; 7: 473-479; 8: 566-581; 9: 422-424; 10: as A.1) and in `clarifications.md`'s "Plan version 3" |
| 103-104 | "That is inside the report's broad 30 to 60 % but below its per-cell ranges, and above its 4 to 10 % for 12x12." | delete; keep "It is profile time, not a critical path" |
| 208-209 | "version 2's 'three to four ratings' and 'at most 2 to 3 times' are withdrawn" | delete the clause |
| 239 | "the 'no useful rating lost' of version 2 was 0 of 0 and 0 of 2" | "useful ratings lost at 190 M: 0 of 0 and 0 of 2 (R15)" |
| 335 | "from the joint report" | delete |
| 447-448 | "and the first report's correction 10 %" | delete; keep PM4's 0 % (13 profiles) |
| 620-621 | "The cohorts version 2 named for this (3x29, 10x10)" | "3x29 and 10x10 Nightmare have K 17 to 19" |

Kept on purpose: 165 ("C1 and C5 of version 2 are P7's content. C2 is withdrawn"), which explains why the
candidate numbering starts at C3. Also kept: 5.3 (the evidence index), section 7's list of answers in force,
and 452-454 (the guidance against one "first phase" factor).

Net: about 30 of 623 lines. The link fix at line 5 follows the deletion of `plan-v2-joint-report.md`.
