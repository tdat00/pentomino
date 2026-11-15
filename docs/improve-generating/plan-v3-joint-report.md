# Plan version 3 (Pentomino): joint report of the analysts

Authors: Opus (claude-opus-5.5, writer) and Astra (gpt-6-astra), 2026-11-15.

**Status.** This report is input for Fable's next revision of `plan.md` and for the orchestrator's cleanup. It
authorises no run, and it is neither a gate result nor an owner decision.

- Reviewed: `plan.md` at `8d795f8`. Every line number below is at that commit, before the cleanup; the quoted
  text identifies each place.
- Basis: both analysts' `5-plan-v3-analysis.md` and `6-cross-review-of-plan-v3-analysis.md`.
- Source: facts are from `rating-v3` at `6122dc9`, read with `git show` only. Nothing was run.

Labels: *Measured*, *Derived* (arithmetic on records, or source control flow), *Analysis*. Severity: **High**
blocks a phase or a decision; **Medium** must be fixed before the frozen manifest is used; **Low** is wording or
a pointer.

## 1. Fidelity

Version 3 takes in the joint report on version 2 and the decisions almost completely.

| Input | Taken in | Partly or changed |
|---|---|---|
| The 22 corrections of the v2 joint report (e) | 21 | (e) 21, partly: "no p95 exist" remains (JV3-P12) |
| The v2 joint answers, verdicts, speed table and frozen-round scope | all, in substance | partly: P1's pseudocode (JV3-P01), the scope of gamma (JV3-P02), P7's memory limit (JV3-P03), rule (c5)'s edge cases (JV3-P04). Changed: the 12x12 population baseline (JV3-P14). Changed with authority: P10 (Hell 2 packs closed by IG-P-D6). The cost estimates of C3 to C5 were dropped; none binds |
| The answers IG-P-Q19 to IG-P-Q24 | five | IG-P-Q23, partly: the D39 figure is given for today's 26x26 only, for a fair reason (no usable maximum of the new search yet) |
| The owner decisions IG-P-D1 to IG-P-D7 | all seven | D3's framing carries a wrong premise about 14x14 (JV3-P10); the decision stands |

Nothing binding is missing. Rule (c5)'s fail-closed cases, P7's memory equivalence and the freeze of the
production configuration (JV3-P03, JV3-P04, JV3-P07) must still be settled before the frozen manifest is used.

## 2. Findings

| ID | Label | Severity | Finding | Fix |
|---|---|---|---|---|
| JV3-P01 | Analysis | Medium (Astra: High) | P1's pseudocode (179-196) gallops only from a BELOW start. With an ABOVE or TOO_FEW first result, or BELOW with `hi - step < 1` (a prior of 4 with `U0` 8), `lo` is unset before the bisection. The measured prototype marches both ways | C1 |
| JV3-P02 | Derived | Medium | P4 prices the per-set prior on batch time (280); section 4 multiplies all of T10 by `gamma` (418-420). The set stage is 0.18 and 0.17 of T10 on Hell 1 26x26 and 20x20 (IGP-03h T1 6.21 and 7.15 s) | C2; section 4 |
| JV3-P03 | Analysis | Medium | `deduce.js:302-309` throws `model-too-large` above `memoryBytes` (32 MiB). A larger optimised workspace could turn a rating into a model error, and P7 does not keep that outcome. Line 360 reads as forbidding P7's own edit of `deduce.js` | C3 |
| JV3-P04 | Analysis | Medium | Rule (c5) is not fail-closed. Unlisted area classes exist: the board editor builds any size up to `MAX_SIDE` (`generator/state.js:1070-1071`). No minimum of matched sets is set, the censor endpoint is unnamed, and the bounds' recipe is not fixed | IG-P-Q26 |
| JV3-P05 | Measured | Medium | MP12b3 (`2f2035e`) built no fail-fast (P-OD12), yet lines 115-117, 253-254, 410 and 616 describe F1 and F2 as present, and 253-254 asks the design to keep their conditions | C4 |
| JV3-P06 | Derived | Medium | The pinned source carries contracts that version 3 does not name: provenance (MP13a, MP13b); skip replay RES-27; recorders RES-28; the work meter `charge` RES-29 (`clues.js:51-53`, `generate.js:33-35`). `tests/fixtures/replay-case.json` pins `gen-v3`. The prototype's `p1p5` replaces `selectClues` wholesale, and the preconditions omit `difficulty.js`, where P6's edit sits | IG-P-Q28 |
| JV3-P07 | Analysis | Medium | Stage 3 freezes "the table, the priors and any ranker" (472). It does not freeze P5's budget table, the bounded-attempt policy or the IG-P-D1 reserve, which stage 2 fits and phase 0's gate requires | C5 |
| JV3-P08 | Analysis | Medium | The reduced PM1's Hell 1 part "feeds the per-set prior" but runs in stage 5, after the freeze and the validation (474) | IG-P-Q27 |
| JV3-P09 | Derived | Medium | The 5 to 9 h indication omits today's arm on the headline cells: about 4.2 h at 20 seeds (Projection; MP12b1's request sums, with 20x20 scaled from a three-request prescreen) | IG-P-Q25 |
| JV3-P10 | Measured | Low | Hell 1 on 14x14: K 32 to 34, windows at 11 to 14 clues, that is 0.34 to 0.44 of K (`IGP-05/pm1.md`, part 3); not "half the pieces or more" (605-606). Lines 266-267 (+8 to +11) are right. D3 stands | C6 |
| JV3-P11 | Derived | Low (Astra: Medium) | Master "with P6 2.2 / 7.5 s (Measured)" (437) transfers R22's factors onto MP12b1. The matched A:B medians are 2.37 to 2.01 s and 10.86 to 9.52 s, n 4 (`IGP-04/compare.md:27-28`) | C7 |
| JV3-P12 | Derived | Low | "no p95 exist" (442) and "no ... tail exists" (602-603): at n 2 to 6 the sample p95 is the maximum, which is weak, not absent | C8 |
| JV3-P13 | Measured | Low | History written as current fact:<br>- PM2 lists `fewestColumn` (`IGP-06/pm2.md:95, 167`; 346-347);<br>- P10 is also a browser route (614-615);<br>- `rating-v3` offers no Hell level (58-59);<br>- "current source" is MP12b1's runtime, and 2.1's anchors are `cd5d17f` lines (146; 81-91) | C9 to C12 |
| JV3-P14 | Derived | Low | 12x12's "0.200 to 0.211" (430) uses the six-seed subset. MP12b1's 185 puzzles give 0.211, the "today" of 416 | C13 |
| JV3-P15 | Measured | Low | "16 of 47 window ratings ... (R33)" (238): the source is `IGP-05/pm1.md:48`, R27's population | C14 |
| JV3-P16 | Analysis | Low | `SHARES` is in the locked tuple (64), but P4 replaces it as `gen-v4`'s start. The rest of the lock (the rating, the caps, the units) binds `gen-v4` too | C15 |
| JV3-P17 | Measured | Low | "Where today has no accepted puzzle (Hell 1 on the candidate boards)" (274-275): MP12b1 accepted 5, 13 and 134 Hell 1 puzzles on 14x14, 24x24 and 26x26 | C16 |
| JV3-P18 | Analysis | Low | P6 and progressive presentation (IG-P-D2, "now") need not wait for phase 0's completion gate (538, 543-544) | C17 |
| JV3-P19 | Analysis | Low | The manifest should name the certificate's re-proof on the frozen source. R14's 862 runs are pre-freeze | C18 |
| JV3-P20 | Analysis | Low | "It ran nothing and changes no gate" (`clarifications.md:1482-1483`): version 3 refines the gates and none has passed | a note by Fable in the decision log |

**Remaining differences.**

- The severities of JV3-P01 and JV3-P11, as marked.
- **The completion gate is global** (5.2, 537): one failing cell stops phase 2 for all, including the two that
  never ran the new search (16x16, 15x20).
  - Opus would ask whether a per-cell fallback (`gen-v4`'s legacy path) was intended.
  - Astra: the gate is unambiguous and conservative; a per-cell route would be a new proposal.
  - Settled: neither a question nor a correction. It is recorded here for Fable.
- Opus withdrew three proposals after the cross-review:
  - a 12x12 190 M pilot for OD-P7's revisit, which needs evidence only when it is proposed;
  - "today's 20x20 arm is never worth running", which three censored failures do not prove;
  - an untimed Master identity check: identity still needs verification, and a saving can only come from
    fewer requests. Folded into IG-P-Q25.

## 3. Corrections for Fable

| # | Line | Replace | With |
|---|---|---|---|
| C1 | 179-196 | the `locateCount` block | the block below |
| C2 | 418 | `` `T = T_search * gamma * (1 - g + g/k)`. `` | `` `T = [T1 + gamma * (T10 - T1)] * (1 - g + g/k)`, from the `gen-v4` arm's T1 and T10. `` |
| C2 | 420 | "`gamma` the per-set prior's factor on Hell only" | "`gamma` the per-set prior's factor on the batch time T10 - T1, Hell only; a set-stage gain, if intended, is a separate stated assumption" |
| C2 | 435, 436 | Hell 1 26x26 "16.7 s (10.6 to 27.5)", "142 / 72 s"; 20x20 "20.9 s (13.3 to 34.5)", "177 / 89 s" | "17.4 s (11.6 to 27.5)", "142 / 75 s"; "21.8 s (14.5 to 34.5)", "177 / 92 s" |
| C2 | 450 | "reached only at the optimistic ends of the mix" | "reached on 26x26 only at the optimistic end of the mix (11.6 s), and on 20x20 not within its range (14.5 s at best)" |
| C3 | after 357 | - | "- The memory-limit outcome is part of equality. `model-too-large` is decided on the reference slot table exactly as today (`deduce.js:302-309`, `limits.memoryBytes` = 32 MiB). A new representation may add storage only while the reference slots plus that storage stay within `limits.memoryBytes` (and the worker budget); otherwise the rating runs on the reference representation. The corpus includes models near the limit." |
| C3 | 360 | "A change of `deduce.js` reopens only if the rating itself changes; it is locked by MP12b2." | "MP12b2 locks `deduce.js` for difficulty-v3, so its anchors do not move before the freeze. P7 changes it only with identical results, work units, caps and memory-limit outcomes." |
| C4 | 115-117 | point 6 | "6. **No fail-fast exists, and none would remove the dead end.** In MP12b2's check of the proposed F1 and F2, F2 fired 18 times at Nightmare and 11 were false stops; only "none" met the zero-false-stop rule, and MP12b3 built none (P-OD12). The dead end goes away by moving the count, not by stopping earlier." |
| C4 | 253-254 | "MP12b3's F1 and F2 stay as they are for `gen-v3`; the design lists which of their conditions remain under `gen-v4`." | delete |
| C4 | 410, 616 | "(MP12b3's F1 and F2)"; "MP12b3's false stops" | "(the F1 and F2 proposals, not built)"; "MP12b2's false stops" |
| C5 | 472, 473 | "the table, the priors and any ranker are fixed" | "the `W_screen` table, the priors, any ranker, P5's budget table and bounded-attempt policy, and the IG-P-D1 reserve and deadline configuration are fixed"; at the end of stage 4's content add: "Validation runs this configuration, with P5 and the one deadline active and the uncapped search as the comparator for lost completions." |
| C6 | 605-606 | "Hell 1 on 14x14 may give half the pieces or more (K for those sets was not checked)" | "Hell 1 on 14x14 gives 11 to 14 of 32 to 34 pieces at its windows (0.34 to 0.44 of K; `IGP-05/pm1.md`, part 3), 8 to 11 more than today's start count of 3" |
| C7 | 437 | "with P6 2.2 / 7.5 s (Measured)" | "with P6 2.2 / 7.5 s (Projection: R22's paired factors on MP12b1's medians; the matched A:B medians were 2.37 to 2.01 s and 10.86 to 9.52 s, n 4)" |
| C8 | 442; 602-603 | "No 90 % claim and no p95 exist before the frozen round."; "No completion claim or tail exists yet." | "No 90 % claim and no reliable tail exist before the frozen round; at n 2 to 6 the sample p95 is the maximum."; "No completion claim or reliable tail exists yet." |
| C9 | 346-347 | "PM2 did not report it." | "PM2 lists it at 40 to 45 ms (0.0 to 0.1 %), a share that inlining can hide." |
| C10 | 614-615 | "Hell 1 has no browser route except a service level" | "Hell 1's browser route is a service level (OD-P5 (b)) or packs (P10)" |
| C11 | 58-59 | "On the boards the policy offers for Hell 3 (480 to 676 cells)" | "On the boards the earlier policy offered for Hell 3 (480 to 676 cells; `rating-v3` offers no Hell level)" |
| C12 | 146; after the 2.1 table | "Gains are on the current source at four workers." | "Gains are on MP12b1's runtime (`cd5d17f`, digest `34cea386…`) at four workers." Under 2.1's table add: "Lines are at `cd5d17f`; at `rating-v3` (`6122dc9`) the anchors of `clues.js`, `generate.js`, `policy.js`, `generation-client.js` and `difficulty.js` have moved (for example `generate.js:554` is now 638), and they are re-derived at the freeze." |
| C13 | 430 | "0.200 to 0.211" | "0.211 to 0.211 (0.200 to 0.211 on the six paired seeds)" |
| C14 | 238 | "(R33)" | "(IGP-05 `pm1.md:48`, R27's population)" |
| C15 | after 66 | - | "`SHARES` stays the start for `gen-v3` and the legacy path; `gen-v4`'s Nightmare and Hell 1 start comes from P4's versioned table. The canonical rating, the 760 M and 80 M caps and the meaning of a work unit bind `gen-v4` as well." |
| C16 | 275 | "(Hell 1 on the candidate boards)" | "(Hell 1 on the prescreened boards of 215 to 484 cells)" |
| C17 | 544 | end of "... as soon as phase 0 passes." | add: "P6 and progressive presentation need the frozen source and their own identity and history checks, not phase 0's completion gate." |
| C18 | 470 | output "the identity receipt;" | "the identity receipt and the certificate re-proved on the frozen source (R14's cases);" |

**C1, the locate contract of the measured prototype**
(`tools/ig-proto/variants/files/p1p5/core/engine/ig-select-proto.js:450-722`). Every state is initialised, a hit
found in a helper ends the locate, and a probe without a usable profile is explicit (SKIP):

```text
locateCount(layout, target, rng, prior):          # P1 on one nested family, started from P4's prior
  order = rng.shuffle(pieces)                      # clues(c) = the first c pieces of `order`
  c0 = clamp(prior ?? K - U0, 1, K - 2); step0 = 1 if prior else U0
  hit = hiBelow = loAbove = noWindow = none; skipped = false
  side(c) = P2's screen rating of clues(c), or of a fresh sample at c if that subset is unusable:
            IN (an AR1 refusal included), BELOW, ABOVE (a capped profile is TOO_FEW, an ABOVE side, P3),
            or SKIP when no profile is usable
  s = side(c0)
  if s == IN: hit = c0
  elif s == BELOW: hiBelow = c0; march(BELOW)
  elif s == ABOVE: loAbove = c0; march(ABOVE)
  else: skipped = true
  bisect()                                         # does nothing once hit or skipped is set
  if noWindow == below-to-one: end the call without a window (canonical proof)
  if noWindow == above-to-max:
    if no locate probe was screen-capped: end the call without a window (canonical proof)
    rescue (P2): re-rate canonically the screen-capped locate probes nearest window(), at most rerateMax:
      some re-rating IN  -> hit = the first one's count; noWindow = none
      else one is BELOW  -> noWindow = none; hiBelow = the least BELOW count of all locate results;
                            loAbove = the greatest ABOVE count below it, or none;
                            march(BELOW) if loAbove is none; then bisect()
                            if noWindow == below-to-one: end the call without a window
      else               -> end the call without a window (confirmed, or heuristic if not all re-rated)
  return window()

march(from):                                       # BELOW: towards fewer clues; ABOVE: towards more
  step = step0
  loop:
    end = hiBelow if from == BELOW else loAbove
    c = max(1, end - step) if from == BELOW else min(K - 2, end + step)
    if c == end: noWindow = below-to-one if from == BELOW else above-to-max; return
    s = side(c)
    if s == IN: hit = c; return                    # the caller sees hit; the bisection does not run
    if s == SKIP: skipped = true; return
    if s == from:
      the end on that side = c                     # hiBelow for BELOW, loAbove for ABOVE
      if c is the last count that way (1, or K - 2): noWindow as above; return
      step = 2 * step
    else: the end on the other side = c; return    # the bracket is closed

bisect():
  while hit == none and not skipped and hiBelow != none and loAbove != none and hiBelow - loAbove > 1:
    mid = floor((loAbove + hiBelow) / 2); s = side(mid)
    if s == IN: hit = mid
    elif s == BELOW: hiBelow = mid
    elif s == ABOVE: loAbove = mid
    else: skipped = true

window():
  hit, if set; else, with both ends set, the end whose score is nearer the band centre
  (hiBelow if loAbove is TOO_FEW); else hiBelow, loAbove or c0. The window phase starts there.
```

## 4. Speed before and after: the section 4 rows that change

No measured number moves. The kernel term is unchanged: 0.6088 at the centre (`g` 0.95, `k` 1.7), 0.4764 at the
optimistic end and 0.8038 at the pessimistic end. `gamma` is 0.8, 0.65 and 1.0 respectively.

| Row | Version 3 | Corrected | Basis |
|---|---|---|---|
| Hell 1 26x26, mix | 16.7 s (10.6 to 27.5) | **17.4 s (11.6 to 27.5)** | `[6.21 + 0.8 x 28.03] x 0.6088`; optimistic `[6.21 + 0.65 x 28.03] x 0.4764`; IGP-03h no-screen T1 and T10 medians (n 2) |
| Hell 1 26x26, browser sensitivity | 142 / 72 s | **142 / 75 s** | `5 + 4 x 17.4`; it is neither a measurement nor D39's rule |
| Hell 1 20x20, mix | 20.9 s (13.3 to 34.5) | **21.8 s (14.5 to 34.5)** | `[7.15 + 0.8 x 35.74] x 0.6088`; T1 7.15 s, T10 42.89 s |
| Hell 1 20x20, browser sensitivity | 177 / 89 s | **177 / 92 s** | `5 + 4 x 21.8` |
| Reading 5 | 13.75 s "reached only at the optimistic ends" | 26x26 at its optimistic end only (11.6 s); 20x20 not within its range (14.5 s) | as above |
| 14x14 / 26x26 Master, with P6 | 2.2 / 7.5 s (Measured) | the same numbers, labelled Projection; matched pairs 2.37 to 2.01 s and 10.86 to 9.52 s (n 4) | `IGP-04/compare.md:27-28` |
| 12x12, clue share | 0.200 to 0.211 | 0.211 to 0.211 (six seeds: 0.200 to 0.211) | R32 (185 puzzles) and R33 (six seeds) |

All other rows match the records (both analyses recomputed them). Completion is unchanged at 37 %, 61 % and 22 % as
one-sided 95 % lower bounds for 3 of 3, 6 of 6 and 2 of 2, so no cell becomes offerable.

## 5. Questions for Fable

**IG-P-Q25. Which today's-arm requests and production repeats belong in the priced manifest?**

- *Question.* 5.1's seed rule ("otherwise today's search runs in the same round on the same seeds") reads as
  a today's arm on every headline cell. Only 5.2's no-regression rule, on the completion-passing controls,
  needs one. Three points follow:
  - Which cells run today's search on the 20 validation seeds?
  - What population verifies the Master identity on the 16 cells?
  - Is phase 2's repeat of the validation on the production code priced separately?
- *Joint recommendation.*
  - Run today's arm where a gate needs it, reusing compatible final difficulty-v3 records where identity and
    the fitting exclusions allow.
  - Price a smaller today's cohort on the failing headline cells only if a paired factor is wanted. On Hell 1
    20x20 the three-request prescreen made no set, so a today's arm there needs a stated purpose.
  - Verify the Master identity with the smallest population that does so.
  - Price phase 2's repeat separately.
- *Effect.* Price only. Today's arm on the five failing Nightmare cells and Hell 1 26x26 and 20x20 is about
  4.2 h at 20 seeds. Stage 4 is about 4.2 to 4.9 h without it and 8.4 to 9.1 h with it. All of these are
  Projections from MP12b1's request sums and the prototype medians.

**IG-P-Q26. How does rule (c5) fail closed on insufficient, unmatched or censored data?**

- *Question.* For the admission of a screen class (5.2):
  - What minimum of matched sets and independent seeds is admissible, and what result is reported below it?
  - Which common endpoint does a request that does not reach ten enter with (the 115 s stop or the 120 s
    response), so that a failed arm cannot gain against a completed control?
  - What do classes outside P2's table (areas of 145 to 195 and 325 to 359 cells are reachable) and classes
    with incomplete validation use?
  - Which aggregation, class weighting and resampling recipe fixes the "faster" and "no regression" bounds?
- *Joint recommendation.* No screen, or "inconclusive", unless every condition can be evaluated and passes.
  Unlisted and unvalidated classes use no screen. Use one stated endpoint for both arms. Fix the recipe in
  the manifest before the validation seeds run, and keep unmatched and failed outcomes in the completion
  record.
- *Effect.* Phase 0's `W_screen` admission. No change of price.

**IG-P-Q27. Which PM1 results may feed the prior frozen for validation?**

- *Question.* Stage 5 runs the Hell 1 failing-set work "that feeds the per-set prior" after the freeze
  (stage 3) and the validation (stage 4). Either that work precedes stage 3, or validation uses the existing
  windows (part 1 and R28), and any later change of the prior goes back through a fit, a freeze and a
  validation. Which?
- *Joint recommendation.*
  - Do the data-only inventory first.
  - Move only the needed, separately priced Hell 1 work before stage 3, if its output is to fit the validated
    prior.
  - Otherwise freeze the existing inputs, and require a new fit, freeze and validation before adopting later
    output.
  - The Hell 2 work stays in stage 5.
- *Effect.* The stage order. PM1 stays separately approved (IG-P-D5). A second validation is possible.

**IG-P-Q28. What is the frozen prototype's replay, provenance and observer contract?**

- *Question.* At `6122dc9`, `selectClues` and the generator carry:
  - skip replay (RES-27);
  - recorders (RES-28);
  - a work meter `charge` (RES-29);
  - provenance (MP13a, MP13b).

  `tests/fixtures/replay-case.json` pins `gen-v3`, and the prototype replaces `selectClues` wholesale.
  - Do `gen-v4` and the frozen prototype adopt these contracts, with `gen-v4`'s own skip ordinals, bounds and
    fixtures, and with `gen-v3` replay unchanged?
  - Which observer modes are correctness checks, and which is the timed comparator?
- *Joint recommendation.* Yes to both contracts.
  - Rebase the prototype semantically on the frozen source: `clues.js`, `generate.js`, `difficulty.js` with
    P6's edit, and the app, pack and CLI consumers.
  - Check parity with observers absent and present, and time like against like.
  - Textual anchors do not show semantic compatibility, even though all 16 still match at `6122dc9`.
- *Effect.* The scope and cost of stage 1's preparation, and the comparability of every timed arm.

**Settled.**

- The scope of `gamma` (Astra's proposed IG-P-Q29) is correction C2, not a question. P4 already defines
  `gamma` on batch time, and the table prior is already inside `T_search`.
- The global completion gate is neither a question nor a correction (section 2).

## 6. Owner decisions

None. The frozen round's price (after stage 1) and the later decisions in plan section 7 keep their
receipts.

## 7. Cleanup: the agreed list

Only deletions and cuts that both analysts support are executed; everything else is kept. The analysts' final
positions on `plan-v2-joint-report.md` and the 3-* and 4-* files crossed over, so those are kept.

**Files.**

- Delete `claude-opus-5.5/1-speed-summary.md` and `gpt-6-astra/1-speed-summary.md`. Both are unchanged since
  `cfcc4dd`.
- Keep the following, editing links only, as listed below:
  - `report.md`;
  - both `1-analysis.md` and both `2-cross-review.md`;
  - `plan-v2-joint-report.md`, and the 3-* and 4-* files of both analysts;
  - `clarifications.md`, with no section trimmed and no edit;
  - `evidence/` and `tasks/improve-generating/`.

**`plan.md` cuts.** Apply them from the bottom up; the line numbers are at `8d795f8`, and each line keeps its
indentation.

| # | Line | Old text | New text |
|---|---|---|---|
| 1 | 620 | `- **The nested family may mislead on small sets**, where one piece changes the score by a level. The cohorts` | `- **The nested family may mislead on small sets**, where one piece changes the score by a level. The measured` |
| 1 | 621 | `  version 2 named for this (3x29, 10x10) have K 17 to 19, so no measured cell shows it; the small Nightmare` | `  3x29 and 10x10 Nightmare cohorts have K 17 to 19, so no measured cell shows it; the small Nightmare` |
| 2 | 209 | `  still give; version 2's "three to four ratings" and "at most 2 to 3 times" are withdrawn.` | `  still give.` |
| 3 | 103 | `     26x26 Nightmare and Master (R10). That is inside the report's broad 30 to 60 % but below its per-cell` | `     26x26 Nightmare and Master (R10). It is profile time, not a critical path.` |
| 3 | 104 | `     ranges, and above its 4 to 10 % for 12x12. It is profile time, not a critical path.` | delete |
| 4 | 25-48 | section 0: from `## 0. What version 3 changes` to the blank line before `## 1. Goal, non-goals and constraints` | delete |
| 5 | 7 | `> IG-P-D7 ([clarifications.md](clarifications.md)). It is written as one current document: the layered` | `> IG-P-D7 ([clarifications.md](clarifications.md)).` |
| 5 | 8 | `> "version 2" notes and the addendum are merged into the sections they belong to.` | delete |

Five cuts remove 26 lines (623 to 597). No line refers to section 0, and `plan.md:5`'s link to
`plan-v2-joint-report.md` stays, because the file is kept.

**Link fixes.**

| File | Line | Old | New |
|---|---|---|---|
| `report.md` | 5 | `[plan.md](plan.md)` | `` `plan.md` at `cfcc4dd` (version 1) `` |
| `report.md` | 8 | `[1-speed-summary](claude-opus-5.5/1-speed-summary.md)` | `` `claude-opus-5.5/1-speed-summary.md` at `cfcc4dd` `` |
| `report.md` | 8 | `[1-speed-summary](gpt-6-astra/1-speed-summary.md)` | `` `gpt-6-astra/1-speed-summary.md` at `cfcc4dd` `` |
| `claude-opus-5.5/2-cross-review.md` | 4 | `` `1-speed-summary.md` (SA2) `` | `` `1-speed-summary.md` at `cfcc4dd` (SA2) `` |
| `claude-opus-5.5/2-cross-review.md` | 4 | `` and `1-speed-summary.md` `` at the end of the line | `` and `1-speed-summary.md` at `cfcc4dd` `` |
| `gpt-6-astra/2-cross-review.md` | 5 | `` `1-speed-summary.md`, my phase-1 `` | `` `1-speed-summary.md` at `cfcc4dd`, my phase-1 `` |

Six replacements on four lines in three files.

- `report.md:5` pins version 1 at `cfcc4dd`, the plan the report reviewed (its plan blob equals `2488f50`'s).
  `555197b` holds version 1 after Fable's answers at `0e1283e`.
- `git grep` finds no other reference to the deleted files outside the evidence. The pentomino evidence holds
  none, and its firewall does not cover `docs/`.
