# Plan version 3 (Pentomino): cross-review of Astra's analysis

Opus (claude-opus-5.5), 2026-11-15, phase 2.

**Reviewed:** `gpt-6-astra/5-plan-v3-analysis.md` (362 lines), against my
`claude-opus-5.5/5-plan-v3-analysis.md`, `plan.md` at `8d795f8`, the provisional records, and `rating-v3` at
`6122dc9` (read with `git show` and `git grep` only). Nothing was run.

## Summary

- **Astra's eight findings.** I agree with six and agree with a change of severity on two (JV3-P01 High to
  Medium; JV3-P05 Medium to Low). I disagree with none. I verified each against the source or the records
  (section 1). JV3-P04 (gamma) and JV3-P07 (14x14 K) are my JV3-P01 and JV3-P02, with the same numbers.
- **Astra's points I missed and accept:**
  - the broken P1 pseudocode;
  - P7's memory-limit equivalence and the wording of line 360;
  - the fail-closed cases of rule (c5);
  - the measured Master P6 pairs;
  - the p95 wording;
  - PM2 does report `fewestColumn`;
  - P10 as a browser route;
  - "the policy offers" Hell 3;
  - the certificate receipt in the manifest;
  - re-validation after any later change of the prior.
- **My findings that Astra did not raise** (section 3) are still proposed for the joint report. I lower my
  JV3-P02 to Low, and merge my JV3-P09 into Astra's JV3-P08.
- **Questions (section 4).** The unified list is IG-P-Q25 to IG-P-Q28. Astra's IG-P-Q25 (gamma) becomes a
  joint correction, not a question. Astra's and my IG-P-Q26 merge.
- **Pruning (section 5).** I change three positions:
  - keep `plan-v2-joint-report.md`;
  - keep the 3-* and 4-* files;
  - delete both `1-speed-summary.md`, with three in-place link pins.

  I withdraw my `report.md` banner, which would shift lines that other files cite by number. I decline Astra's
  trims of `clarifications.md` and of plan section 5.3, and its substantive plan edits. Agreed `plan.md` cuts:
  five passages of pure history.

## 1. Astra's findings

| Astra | Verdict | Evidence and change |
|---|---|---|
| JV3-P01 High: P1's pseudocode does not handle its start | **agree, with a change: Medium** | Confirmed at `plan.md:179-196`. The gallop runs only while the first result is BELOW. An ABOVE or TOO_FEW first result, or BELOW with `hi - step < 1` (a prior of 4 with `U0` = 8), leaves `lo` unset before the bisection. A BELOW gallop that exhausts its steps returns the degenerate window `[hi, hi]`. The measured prototype handles both directions (`tools/ig-proto/variants/files/p1p5/core/engine/ig-select-proto.js:651-663`: `marchDown`, `marchUp`, a skipped first result, then `bisect`). Medium, not High: the frozen round runs the correct prototype, and nothing is implemented before the design. The fix goes to Fable as a correction: replace the fragment by the prototype's bidirectional contract, or by a reference to it |
| JV3-P02 Medium: P7's memory-limit equivalence; line 360's wording | **agree** | Confirmed: `6122dc9:core/engine/deduce.js:302-309` sums the slot table and throws `model-too-large` above `limits.memoryBytes`, which is 32 MiB (`policy.js:122`). A larger optimised workspace could turn a rating into a model error. Line 360 ("A change of `deduce.js` reopens only if the rating itself changes") contradicts P7, which edits `deduce.js`. The phrase came from my joint report's dependency column, where it meant that MP12b2's lock keeps the anchors still until the freeze |
| JV3-P03 Medium: (c5) is not total and fail-closed | **agree** | Unlisted classes are reachable: the Generator's board editor builds any width and height up to `MAX_SIDE`, with active cells (`6122dc9:generator/state.js:1070-1071`), so areas of 145 to 195 and 325 to 359 cells exist. Also open: the minimum number of matched sets, the censor endpoint (115 s or 120 s), and the recipe of the non-regression bound. Merged into the unified IG-P-Q26 |
| JV3-P04 Medium: gamma is batch-only in P4 and whole-request in section 4 | **agree** | Same finding and numbers as my JV3-P01: 17.4 s (11.6 to 27.5) and 21.8 s (14.5 to 34.5); browser sensitivity 75 and 92 s. It is a correction, not a question (section 4) |
| JV3-P05 Medium: the Master P6 times are labelled Measured | **agree, with a change: Low** | Confirmed: `IGP-04/compare.md:27-28` gives the A:B medians 2.37 to 2.01 s (14x14) and 10.86 to 9.52 s (26x26), n 4. Section 4's 2.2 and 7.5 s are MP12b1's medians divided by those factors, a transfer (my section C said "Derived, not Measured"). Low: Master is outside `gen-v4`'s scope, and no decision depends on the row |
| JV3-P06 Low: an empirical p95 exists, but is weak | **agree** | `plan.md:442` and 602-603. At n 2 to 6 the sample p95 is the maximum; report it with its n |
| JV3-P07 Low: the 14x14 Hell 1 piece counts are recorded | **agree** | Same as my JV3-P02 (K 32 to 34; windows 0.34 to 0.44 of K). I accept Low: the owner's decision D3 stands. The corrected numbers must still reach the owner through the joint report, because section 8 and the D3 answer show "half the pieces or more" |
| JV3-P08 Low: historical statements phrased as current | **agree, all four points** | (1) `IGP-06/pm2.md:95, 167` list `fewestColumn` at 45.2 and 40.3 ms (0.1 % and 0.0 %), so "PM2 did not report it" (346-347) is wrong: the issue is isolation under inlining. (2) 614-615 ignores the P10 fallback of 378-383. (3) At `6122dc9` `levels.js` offers no Hell 1 to 3 (`AREAS` `[Infinity, Infinity]`), so the boards of 58-59 are the earlier policy's. (4) "Current source" (146) should name MP12b1's snapshot; my JV3-P09 (the moved anchors) merges here |

Two notes in Astra's section A, accepted:

- The priced manifest names the certificate's re-proof on the frozen source as an admission artifact. R14's 862
  runs are pre-freeze.
- Any later change of a prior goes back through the freeze and held-out validation; stage 5 is not permission
  to retune a validated table. This is option (b) of IG-P-Q27.

## 2. Fidelity: where our tables differ

| Item | Opus | Astra | Joint position |
|---|---|---|---|
| (e) 21: ten seeds, weak p95 | in | partly ("no p95 exist" remains) | partly; JV3-P06 |
| IG-P-Q23: the D39 figure beside the browser column | partly | in, with the owner's qualification | immaterial; version 3's reason (no usable maximum yet) is fair |
| P10: Hell 2 packs | in | changed meaning, authorised by IG-P-D6 | Astra's wording is more exact |
| (c) cost estimates of C3, C4, C5 and the linkage | partly | not raised | partly; none binds |
| (d) 12x12 population "(six seeds)" | changed | not raised | changed; JV3-P11 below |
| P1, P2, P4, P7 items | in | partly (pseudocode, (c5) edges, gamma scope, memory) | partly, through the findings above |

## 3. My findings that Astra did not raise

Proposed for the joint report. Severities are after this review.

| ID | Severity | Finding (evidence) |
|---|---|---|
| JV3-P03 | Medium | MP12b3 (`2f2035e`) built no fail-fast (P-OD12). `rating-v3` has no F1 or F2 (`git grep` at `6122dc9`), yet `plan.md:115-117, 253-254, 410, 616` describe them as present, and 253-254 tells the design to keep their conditions |
| JV3-P04 | Medium | MP13a to MP14b contracts are absent from version 3: provenance; skip replay RES-27 (`replaySkips`, `SKIP_BOUNDS`, `SkipReplayError`); recorders RES-28; recorder identity; `tests/fixtures/replay-case.json` pinned to `gen-v3`. `p1p5` replaces `selectClues` wholesale, so on the frozen source the prototype would bypass the recorders. The preconditions omit `difficulty.js` (P6's edit) and MP13b. Unified IG-P-Q28 |
| JV3-P05 | Medium | Stage 3 freezes "the table, the priors and any ranker" but not P5's budget table or the IG-P-D1 reserve, both fitted in stage 2. Stage 4 must say that P5 and the one deadline are active (`plan.md:471-473, 537`) |
| JV3-P06 | Medium | The reduced PM1's Hell 1 part "feeds the per-set prior" but runs in stage 5, after the freeze and the validation (`plan.md:474`). Unified IG-P-Q27 |
| JV3-P07 | Medium | Phase 0's completion gate is global over five failing cells. Two of them (16x16, 15x20) never ran the new search, and no per-cell fallback exists (`plan.md:512-513, 537`). Merged into IG-P-Q26 |
| JV3-P08 | Medium | The 5 to 9 h indication omits today's arm on the headline cells: about 4.2 h at 20 seeds, mostly 115 s stops, which no gate of 5.2 needs (MP12b1 request sums). Stage 4 alone is 4.2 to 4.9 h without that arm and 8.4 to 9.1 h with it. Unified IG-P-Q25 |
| JV3-P02 | Low (was Medium) | 14x14 Hell 1 K is 32 to 34; see Astra's JV3-P07 |
| JV3-P10 to JV3-P17 | Low | "Changes no gate" (`clarifications.md:1482-1483`); the 12x12 population baseline is the six-seed subset (430); R33 cited for 16 of 47, whose source is IGP-05 (238); `SHARES` in the locked tuple against P4 (63-66, 273); OD-P7's revisit has no 190 M arm in the pilots (240, 471, 591); "no accepted puzzle" on the candidate boards (274-275); the Master identity can be checked untimed (473); progressive presentation "now" against phase 1 (538, 543-544) |
| JV3-P09 | Low | Merged into Astra's JV3-P08 (4) |

## 4. Questions for Fable: one list

| Proposed ID | Question | From | Status after version 3 |
|---|---|---|---|
| IG-P-Q25 | On which cells does today's search run on the 20 validation seeds, and where does today's population come from? Only the controls need it for a gate. The headline cells' today's arm costs about 4.2 h, and Hell 1 20x20 would be 20 x 115 s of "no set" | Opus Q25 | open; the largest price driver of the manifest |
| IG-P-Q26 | The undefined cases of 5.2: (a) the default for unlisted or unvalidated classes (fail closed: no screen); (b) the minimum number of matched sets, and the inconclusive outcome below it; (c) the common censor endpoint of a request that does not reach ten; (d) the aggregation and bootstrap recipe of the "faster" and "no regression" bounds; (e) whether the completion gate is global or per cell, with `gen-v4`'s legacy path as a failing cell's fallback | Astra Q26 and Opus Q26, merged | open; 5.2 itself requires these to be fixed before the validation seeds run |
| IG-P-Q27 | The reduced PM1's Hell 1 part against the freeze: (a) run it, after the data-only inventory, before stage 3; or (b) validate with the existing windows (part 1 and R28), and send any later change of the prior back through the freeze and the validation | Opus Q27, with Astra's rule as (b) | open; the stage order contradicts "feeds the per-set prior" |
| IG-P-Q28 | `gen-v4` and the MP13a to MP14b contracts: its own skip ordinals, recorder events and provenance for P1 to P5; and a rebase of the prototype, so that its timing compares with today's search on the frozen source | Opus Q28 | open; version 3 is silent, and stage 1 depends on it |

Not questions, and proposed as joint corrections in the joint report:

- gamma batch-only (Astra's IG-P-Q25): P4 defines gamma on batch time, and the measured arms already contain
  the table prior, so section 4's formula is simply inconsistent. If Fable meant a combined effect, his reply
  to the correction says so.
- The P1 pseudocode.
- P7's memory-limit equivalence and line 360.
- The 14x14 K.
- MP12b3's missing fail-fast.
- The Master label.
- The Low wording items.

## 5. Pruning: final positions

The orchestrator executes only the rows marked **agreed**.

| Item | Opus phase 1 | Astra | Opus final | Reason |
|---|---|---|---|---|
| `report.md` | keep, with a banner | keep; pin links | **keep; pin the links in place, no banner (agreed)** | `report.md:5` ("Plan") becomes "`plan.md` at `555197b`". `:8` (the speed-summary links) becomes "at `8d795f8`". No added line: the audit addendum (`clarifications.md:1065-1083`) cites `report.md:28` to `:242` by number, and a banner would shift them |
| `plan-v2-joint-report.md` | delete | keep | **keep (changed)** | It is the analysts' record of the version 2 round. The decision log cites it for content: `clarifications.md:1104` and `:1341`, and the answers at `:1150` ("the report's erratum 16"), `:1179` ("as the joint report's (g) lists them") and `:1265` ("the report's (b) 5"). Deleting it would leave how the decisions were reached reachable only through git. It is not a plan remnant |
| 3-* and 4-* (both analysts) | delete | keep | **keep (changed)** | They are the joint report's cited basis. Astra names derivations that only they hold (the per-level correlations of C3, the scheduling decomposition) |
| `1-speed-summary.md` (both analysts) | keep | delete after link fixes | **delete (agreed)** | Superseded one-page tables, duplicated in the kept `1-analysis.md`; no record cites them. Three in-place pins, each to "at `8d795f8`": `report.md:8`, `claude-opus-5.5/2-cross-review.md:4` and `gpt-6-astra/2-cross-review.md:5` |
| `1-analysis.md`, `2-cross-review.md` | keep | keep | **keep (agreed)** | `summary.md` (R02, R29), `summary.mjs:82` and the check-list cite the 2-* files for substance |
| `clarifications.md` | keep all | trim 982-995 and 1016-1040; reword the 1339 heading | **no edit (declined)** | It is the decision log, and the dated summaries record what was open when. No link needs a pin once the joint report stays. Staleness that the dates already show is not a strong reason |
| `evidence/`, `tasks/improve-generating/*` | keep | keep | **keep (agreed)** | Records, and the executed pack |
| `plan.md` 3-8 | trim to one line | trim to one sentence with links | **trim (agreed)**: delete the sentence "It is written as one current document: the layered ... belong to." (7-8); keep the commit pins and the links | Pure history |
| `plan.md` 25-48 (section 0) | delete | delete or a short overview | **delete (agreed)** | A change log. Every item recurs in the body, no line refers to section 0, and `clarifications.md` keeps "Plan version 3" |
| `plan.md` 102-104 | delete one sentence | trim | **agreed**: delete "That is inside the report's broad 30 to 60 % ... for 12x12." | Compares measurements with superseded v1 ranges; keep "It is profile time, not a critical path" |
| `plan.md` 208-209 | delete the clause | trim | **agreed**: delete "; version 2's 'three to four ratings' and 'at most 2 to 3 times' are withdrawn" | Pure history |
| `plan.md` 620-621 | reword | trim | **agreed**: "The cohorts version 2 named for this (3x29, 10x10) have" becomes "3x29 and 10x10 Nightmare have" | Pure history. Astra's point about what K 17 to 19 proves goes to Fable, not into our edit |
| `plan.md` 520-531 (5.3 table) | keep | trim to a paragraph | **keep (declined)** | It is the only place in version 3 that defines PM1 to PM4 and maps them to the IGP tasks and rows, and the body uses those names throughout (2.2, P4, P7, 5.1) |
| `plan.md` 122-123, 179-196, 614-615 | - | trim or replace | **not our edit (declined)** | Substantive: the dearness in work units against time, the P1 contract, and P10 as a route. They go to Fable as corrections |
| `plan.md` 239, 335, 447-448 | reword | - | **withdrawn** | Attribution wording; not worth an unagreed edit |

Net agreed: delete two files (`1-speed-summary.md`, both analysts). Pin links in place on four lines:
`report.md:5` and `:8`, `claude-opus-5.5/2-cross-review.md:4` and `gpt-6-astra/2-cross-review.md:5`. Cut about
27 lines of `plan.md`.
