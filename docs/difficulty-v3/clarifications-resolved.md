# difficulty-v3: resolved clarifications (archive)

Moved from [clarifications.md](clarifications.md) on 2026-11-13 at the owner's request. Every question in this
file is resolved: answered by the plan author or decided by the owner. Ids and part letters are unchanged, so a
reference such as "clarifications.md Part H" in a task file or a record is found here. The questions that still
need the plan author's answer are in [clarifications.md](clarifications.md); when one is answered, it moves here.
PR-P1, the review of the progress at the pause, was answered by the plan author on 2026-11-13 and moved here
unchanged by SA1 at the resume (the end of Part I); the owner decision it records is P-OD9 (Part H).

---

Status: **answered, 2026-11-12** by the plan author (claude-fable-5-2); the disputed rows were decided by the owner on the command line. Summary of the decisions: part E at the end of this file. Questions raised by the two analysts who reviewed `docs/difficulty-v3/plan.md`
against the code (branch `rating-v3`, commit `77e62cb`), for the plan's author (claude-fable-5-2) to check and
answer. The owner confirms the answers before they become decisions.

- Analyst SA2 (gpt-6-astra): `docs/difficulty-v3/gpt-6-astra/1-report.md` (questions in its section 5.2).
- Analyst SA1 (claude-opus-5.5): `docs/difficulty-v3/claude-opus-5.5/1-report.md` (questions in its section 5.2).

Fixed and not open: the decisions of plan section 1.3 (model change `difficulty-v3`; a fully forced puzzle caps
at Normal; several solutions lower the score, uniqueness default stays `any`; band edges frozen), the full scope
P0-P4, and the APPROVAL GATE runs (pre-approved by the owner; the task that needs a gate runs it).

How to answer: under each question, fill **Answer** with the chosen option (or your own) and a short reason.
If a question rests on a wrong reading of the plan or of the code, say so in the answer. The status table below
says which questions are still disputed between the analysts. Part D lists the analysts' corrections to the plan
itself; mark any you disagree with.

---

## Status after the joint report check (2026-11-12 09:50)

The co-signed joint report is `docs/difficulty-v3/report-detailed.md` (lead SA1, checked by SA2 in
`docs/difficulty-v3/gpt-6-astra/4-check-of-joint-report.md`; all 13 required changes applied). Please review it
together with this file. Each PENDING item of the report names its branches and the question below that decides it.
The responses that led here are `docs/difficulty-v3/claude-opus-5.5/3-response-to-review.md` and
`docs/difficulty-v3/gpt-6-astra/3-response-to-review.md`. Answer the **disputed** rows first. For an **agreed** row a
one-word confirmation is enough. Rows marked "for the plan author" are author or implementer contracts rather than
owner policy. New questions are in part C.

| Question | SA1 final position | SA2 final position | Status |
|---|---|---|---|
| SA1-Q-P1 decisive guesses | B: decisive guesses; an unfinished census publishes a decisive upper estimate | prototype B first (MP05), measure (MP06), then choose B or B' (unfinished census = unrateable) with an explicit policy | **disputed: A / B / B' / C, see the revised question** |
| SA2-Q-P02 cap hit before the first solution | saturated "+" rating; G and information from the current search path at the cap; cap-hit statistics | incomplete and unrateable; the candidate is skipped; any estimate needs its own named contract | **disputed** |
| SA2-Q-P03 / SA1-Q-P6 identical shapes | (c) raw per-piece counts; limitation documented (generated sets never have twins) | (b) interchangeable copies collapsed for difficulty; raw DLX certificates kept | **disputed** |
| SA2-Q-P01 base max | 12 | 12; the forced bound is "≤ 16" (not SA1's "≤ 16.5") | agreed: (a), base + rule ≤ 16 |
| SA2-Q-P13 rule bonus | hardest deduction tier used | the same | agreed: (a) |
| SA2-Q-P12 R4 cell-to-cell | piece / cell R4 and R5 only (changed in response) | the same | agreed: (a) |
| SA2-Q-P04 centre search | real centre, stop in the central half, 48-profile reserve | the same (integer centre withdrawn) | agreed, for the plan author to confirm |
| SA2-Q-P05 / SA1-Q-P5 weighted sampling | skip | uniform | agreed: skip |
| SA2-Q-P06 search orders | one canonical order; probe data decide the plan's median trigger | one canonical order; report the measured column tie spread; no silent median | agreed: (a) |
| SA2-Q-P07 / SA1-Q-P3 codes | summary codes (`model`, `score`, `level`, `saturated`); full metrics in packs | the same, with a coordinated optional-metrics claim schema | agreed: summary codes |
| v3 metrics size | ≤ 4,096 bytes | ≤ 4,096 UTF-8 bytes and depth ≤ 8 (`core/engine/pack.js:40-41, 802-811`) | agreed |
| SA2-Q-P08 / SA1-Q-P2 old v2 ratings | re-rate for display with a note; stored claim untouched | the same, print captions consistent | agreed: (a) |
| SA2-Q-P09 calibration freedoms | knobs, `K60`, `SHARES` and caps may change within the plan's criteria; changes recorded | fit within the stated invariants, ranges recorded; a new estimator, aggregation or carving redesign is not authorised by this | for the plan author |
| PROC-P1 when the knobs are fitted | first fit before activation, locked before P4, final regression after replay | the same | agreed: (a) |
| SA2-Q-P10 / SA1-Q-P4 provenance | `generation.made` map, SA2's record content | the same, with typed internal origin and explicit availability | agreed: `generation.made`; the skip encoding is AUTH-P1 |
| AUTH-P1 (part C) skip encoding | (a) capped integer lists with `'overflow'` | either | **for the plan author** |
| JR-P4 (new, part C) scheduling of display re-rating and replay requests | (a) auxiliary method on the existing client / pool | either, decided before MP10 | **for the plan author** |
| SA2-Q-P11 optional Player hints | leave out | leave out (owner confirms the scope) | agreed: (a) |
| JR-P1 (new, part C) which old claims are re-rated | v2 and v1 | v2 only, as the plan says; adding v1 is a reasonable explicit extension; puzzles without a claim are a separate new branch | **disputed (minor), for the plan author** |
| JR-P2 (new, part C) immutable set origin | new `generation.setOrigin` | the same (existing keys plus immutable set versions could work if specified) | agreed: (a) |
| JR-P3 (new, part C) knob ranges for the fit | ranges in part C | candidate experimental ranges; to be approved before production values are chosen | **for the plan author** |
| Task order | one developer per repository, sequential | the same; timing runs never in parallel on this machine | agreed |

---

## Part A: questions from SA2 (gpt-6-astra)

### SA2-Q-P01: which base formula?

Context: report section 4 "P2.1". The equation in plan P2.1 uses `base(U) = 12 · (1 − e^(−U/6))`, but the
`SCORE_V3` constant proposed in the same step has `base: { max: 16, scale: 6 }`. With max 16, `U = 10`, rule
tier 3, no guess and no penalty score 17 (Hard), which breaks the fixed rule "a fully forced puzzle caps at
Normal".

- (a) Base max 12 plus rule 0 / 2 / 4 (the equation as written; base + rule ≤ 16 < 17).
- (b) Base max 16 plus an explicit clamp of forced (G = 0) scores below the Hard edge.
- (c) Redesign the split between base and rule, keeping forced ≤ 16; needs fresh calibration before coding.

SA2 recommends (a): it carries the proof of P2.1 and needs no special case; (b) compresses the distinctions
between forced puzzles with a high U; (c) needs new calibration first.

**Answer (claude-fable-5-2, 2026-11-12):** (a). Base max 12 and rule 0 / 2 / 4, so base + rule ≤ 16. The constant `base: { max: 16, scale: 6 }` in plan P2.1 is a leftover of the first draft and wrong; the equation is the intended one. The forced bound is "≤ 16" (joint report RES-18).

### SA2-Q-P02: what happens when the deduction search stops before the first solution, and how is its work bounded?

Context: report sections 4 "P0.2" and "P0.2b". A node cap does not bound lookahead or rule work (one node can
run many tentative propagations and region DPs), and a cap hit before the first solution gives no final-path G
at all, so it must not look like a forced puzzle (G = 0).

- (a) Incomplete measurement = unrateable: the candidate consumes clue budget and is skipped.
- (b) Publish a separately labelled conservative estimate.
- (c) Run a second bounded fallback that finds a path before scoring.

SA2 recommends (a), plus deterministic work limits on incidences and probes in addition to `nodes`; the initial
cap numbers come from the P0.3 probe. (a) may lower hit rates but never invents G; (b) needs a new score and
label contract; (c) costs more and can change what "a required guess" means.

**Answer (claude-fable-5-2, 2026-11-12):** Owner decision (asked on the command line, 2026-11-12): **(a), RES-04 branch A.** A path capped before the first solution is unrateable: `rate()` throws `IncompleteRatingError` (`reason: 'path-capped'`), `selectClues` skips the candidate (it costs a profile and is neutral for the count steering), the derived display rating keeps the stored claim with "could not be re-rated". The v3 "+" mark is therefore never produced; `saturated` stays in the claim schema as `false` for v3 and keeps its meaning for stored v2 claims. Work is bounded by deterministic work units as well as nodes (RES-10). MP06 reports the capped share per level and board and sets `DEDUCE.work` so that no path is capped up to master on boards up to 20x18; if hell levels on very large boards become hard to generate, that is reported to the owner with the numbers rather than solved by an estimate. This withdraws the plan's remark that saturation is acceptable at hell levels (plan section 4, P3 step 4).

### SA2-Q-P03: how do interchangeable (identical-shape) pieces affect G and S?

Context: report sections 4 "P0.2" / "P0.2b". Swapping two identical pieces creates "different" solutions and
guess alternatives that a person does not see as different.

- (a) Raw labelled search and count.
- (b) Quotient identical-piece permutations for both difficulty metrics (G and S), keep raw DLX certificates
  for uniqueness.
- (c) Quotient guesses but keep raw S.

SA2 recommends (b), documented: (a) is simplest but identity swaps look hard; (b) needs a multiplicity-aware
solver and separates the rating count from the uniqueness certificate; (c) keeps today's raw count but can
penalise multiplicity that is only identity.

**Answer (claude-fable-5-2, 2026-11-12):** Owner decision (asked on the command line, 2026-11-12): **none of the branches. A piece set must not contain two pieces of the same shape, imported sets included; such a set is an error.** Consequences: (1) `core/engine/pack.js:569-574` turns its warning into an error (issue code such as `duplicate-shape`, with the two piece ids), and every other way in gets the same check: puzzle codes (`core/engine/puzzlecode.js` decode), the Generator import and the Player route; the message exists in English and Vietnamese. Shapes are compared with `canonicalKey` (`core/engine/geometry.js:126`), as `core/engine/carve.js:697-707` does for generated sets. (2) RES-09 is closed without a quotient: `shapeGroup` (RES-02) and task MP04b are dropped; guesses, alternatives and S are counted on labelled pieces, which is exact for every admissible set. (3) The engine functions (`rate`, `measureDeduction`, `selectClues`) stay total on direct inputs with twins and behave as branch A there; tests that build such sets on purpose (for example the 41 I-pentomino strip of `tests/clues.test.js:196-214`) keep working and are not a supported product input. (4) This is a format tightening: a pack or link with twins that opened with a warning before is now refused; document it in design section 5.3, the user guides and the release notes of this change. Put the check in the task that touches the pack reader for v3 (RES-21) and add tests for the pack, the code and both apps.

### SA2-Q-P04: how much search for the band centre (P1)?

Context: report section 4 "P1". Returning the current centre-near candidate is not the same as returning the
best one seen; uniqueness repairs can change scores, fail or produce an excluded clue key.

- (a) Return the best observed final result; stop early once a result is in the central half of the band, or
  after all 64 profiles.
- (b) Stop at profile 48 (`limit − 16`) as drafted.
- (c) Spend all 64 profiles whenever possible.

Also: centre as a real number `(min + max) / 2` or as the integer-score centre?

SA2 recommends (a) with the integer-score centre: it balances cost and quality; (b) leaves budget unused
without a reason; (c) maximises search cost. All three move the deterministic fixtures.

**Answer (claude-fable-5-2, 2026-11-12):** Confirmed as agreed in RES-15: the centre is the real number `(min + max) / 2`; stop early when a final result (after any uniqueness repair) lies in the central half of the band; otherwise return the best final result seen once 48 profiles are spent (`reserve = 16`, kept for repairs and their re-ratings); an unbounded band has no centre and keeps "first in band".

### SA2-Q-P05: placement-weighted clue sampling?

Context: report section 4 "P1" (plan P1 step 2). The direction of the bias (which pieces to clue when ratings
are above or below the band) has no sound argument yet, and the draft mixes canonical free-piece order with
layout order.

- (a) Keep uniform sampling; change acceptance only.
- (b) Adopt the drafted direction.
- (c) Adopt a weighting rule only after a controlled probe validates it.

SA2 recommends (a) first, (c) only with data.

**Answer (claude-fable-5-2, 2026-11-12):** (a). Uniform sampling; only the acceptance changes. The direction I gave in plan P1 step 2 was not validated and, as SA1 shows, argued the wrong way round. A weighting rule may come back only with probe data, as a separate change.

### SA2-Q-P06: one search order or several for the rating?

Context: report sections 4 "P0.3" and "P2.1"; plan section 5 "Order noise". If G turns out to depend on the
MRV tie-break order:

- (a) One canonical order; report the noise.
- (b) Median of three fixed orders (cost about ×3; needs a rule for which run's metrics and trace are kept).
- (c) Report the noise and postpone any aggregation.

SA2 recommends (a), with the noise reported; no automatic switch based on one probe.

**Answer (claude-fable-5-2, 2026-11-12):** (a). One canonical order; the probe reports the spread over the column tie rule. The "median of three orders" of plan section 5 is not triggered automatically; it would need its own decision.

### SA2-Q-P07: what if the largest v3 puzzle code does not fit in a QR code?

Context: report section 4 "P2.4". A v3 claim is written as JSON text in the code (`ratingJsonBytes: 8192`), so
codes grow; the 8 KiB bound alone does not say whether a 676-cell code still fits the Player's URL and QR
limits.

- (a) Keep the existing fallback (no QR when it does not fit).
- (b) Add a compact v3 codec now.
- (c) Omit or reduce claim diagnostics in codes, with an explicit schema.

SA2 recommends (a), unless a QR for every puzzle is a release requirement.

**Answer (claude-fable-5-2, 2026-11-12):** Superseded by the agreed summary claim (see SA1-Q-P3): codes carry `model`, `score`, `level`, `saturated` only, so the largest code stays near today's size class and fits QR version 40. If a code ever does not fit, the existing fallback (no QR) applies; no compact v3 codec in this plan.

### SA2-Q-P08: how is re-rating on load shown (P2.5)?

Context: report section 4 "P2.5". A puzzle that carries a `difficulty-v2` claim is re-rated with v3 on load.

- (a) Show the v3 level with a "re-rated (original: v2 …)" note; the code and export keep the original claim;
  print captions consistent.
- (b) Show v3 silently.
- (c) Re-rate only when the user asks.

SA2 recommends (a): (b) hides a possibly large level change; (c) departs from the automatic re-rating of P2.5.
No option changes the claim stored in the URL.

**Answer (claude-fable-5-2, 2026-11-12):** (a). Show the v3 level with the note "Re-rated with the current scale (original: …)"; the code, the URL, the title and the export keep the stored claim; print captions use the same rating and note.

### SA2-Q-P09: which calibration changes are allowed in P3?

Context: report section 4 "P3"; plan section 5 "Hit rate at Hard on large boards may fall".

- (a) Allow bounded search ranges for `K60` / `SHARES` and the caps, chosen after baseline data.
- (b) Freeze the generation tables and accept more partial batches.
- (c) Redesign large-board carving now.

SA2 recommends (a), keeping the carving architecture out of scope. It also reads "hit rates within ~10 points"
as percentage points of the matched hit rate, not a relative percentage: please confirm.

**Answer (claude-fable-5-2, 2026-11-12):** Owner decision (asked on the command line, 2026-11-12): **branch A.** P3 may change the `SCORE_V3` knobs within the JR-P3 ranges, the `DEDUCE` caps, and `K60` and `SHARES` when that is needed to keep hit rates, each change recorded with its before and after data in the calibration report (a `K60` change bumps `POLICY_ID`). Not allowed without a new decision: a new estimator, multi-order aggregation, dropping a diagnostic, a carving redesign, moving band edges. "Within ~10 points" means percentage points of the matched hit rate: confirmed.

### SA2-Q-P10: replay provenance and fallback contract (P4)?

Context: report section 4 "P4.1". The browser Generator drops the successful set attempt and its export has no
`setAttempt`; the proposed `made` record lacks the candidate's target level and uniqueness setting (they can
differ between batches); a fold can accept an earlier retained candidate, so provenance has to travel with the
candidate from its creation.

- (a) A versioned, compact record of skipped subsets and the exact set / candidate origins; a puzzle from the
  completion pass gets the final-only fallback.
- (b) Also store the completion layout and origin, for a full replay of those puzzles too.
- (c) Store a bounded generation trace instead of recomputing.

SA2 recommends (a), and asks to approve an explicit "steps unavailable" state instead of silently truncating
"every step".

**Answer (claude-fable-5-2, 2026-11-12):** (a). The versioned compact record with typed origins carried by the candidate from its creation; completion-pass puzzles and puzzles without a record get stages 1-3 (when available) and 7, and the dialog states "steps not available for this puzzle" for the missing stages. The explicit unavailable state is approved; a trace is never truncated silently. My draft record lacked the target level and the uniqueness setting: accepted.

### SA2-Q-P11: include the optional explanatory Player hints?

Context: plan P0.2b, last paragraph ("optional, after P3"): the Player's hint would name the rule that places a
piece.

- (a) Exclude from this release.
- (b) Include rule-based hints now.
- (c) Ship them experimentally behind a setting.

SA2 recommends (a): full P0-P4 covers the catalogue and the Generator replay, not this optional extension.

**Answer (claude-fable-5-2, 2026-11-12):** (a). The rule-naming Player hints stay out of this release, as the plan already says ("optional, after P3").

---

## Part B: questions from SA1 (claude-opus-5.5)

Source: `docs/difficulty-v3/claude-opus-5.5/1-report.md` section 5.2 (evidence in sections 2.3 and 4).

How the two sets relate (positions after the cross-review are in the status table at the top):

| SA1 | SA2 | Relation |
|---|---|---|
| SA1-Q-P1 decisive guesses | none | new: only SA1 raises it |
| SA1-Q-P2 old v2 ratings in the apps | SA2-Q-P08 | **conflict**: SA1 recommends showing the stored v2 claim with a note; SA2 recommends re-rating with v3 |
| SA1-Q-P3 code size | SA2-Q-P07 | related: SA1 measured the growth and asks about size; SA2 asks about the QR limit |
| SA1-Q-P4 where provenance lives | SA2-Q-P10 | related: SA1 asks where (format), SA2 asks what is recorded |
| SA1-Q-P5 weighted sampling | SA2-Q-P05 | same question, same recommendation (skip) |
| SA1-Q-P6 identical shapes | SA2-Q-P03 | **conflict**: SA1 recommends raw counts, SA2 recommends collapsing twins |

### SA1-Q-P1: what is a "real choice" when a puzzle has several solutions?

Context: report sections 0 (issue 1) and 4 "P0.2". Sound rules never remove a row of any solution, so a puzzle
with two or more solutions always has at least one guess node (G ≥ 1) on the path to the first solution, and free
choices (every alternative leads to a solution) add guess points although the puzzle gets no harder.

**Corrected 09:45** (`docs/difficulty-v3/report-detailed.md` change log, JC01): with the agreed rule bonus
(SA2-Q-P13 (a), deduction tier only), SA1's re-measured prototype rates the six 10x6 recipes 5, 6, 9, 38, 66, 104,
and today's two-solution 10x6 Easy puzzles rate 15 (Normal) under raw guesses, not 17 (Hard) as first reported.
Guess nodes have 2-28 alternatives. The issue remains (free choices raise the score), but it no longer reaches Hard
in the measured case.

The joint report (RES-05) now states the branches as:

- (A) Raw: every branch node on the path to the first solution counts, free choices included (the plan).
- (B) Decisive: a node counts only when some alternative is proved to fail; information from the proved counts;
  when the census of alternatives cannot finish within its cutoff, the rating publishes a decisive upper estimate
  (from the alternatives proved solvable) (SA1 recommends).
- (B') Decisive, but an unfinished census makes the rating unrateable; the first-path evidence is kept (SA2's
  condition for adopting the decisive model).
- (C) Raw, with the multiple-solution penalty `S ≥ 2 ? weights.info · log2(min(S, 8)) : 0` (cheap, crude).

SA2 recommends prototyping B (task MP05), measuring hit rates, cost and census completeness (MP06), then choosing
between B and B' (or A) with an explicit incomplete-census policy. The answer is needed before MP08 writes the
formula.

**Answer (claude-fable-5-2, 2026-11-12):** Owner decision (asked on the command line, 2026-11-12): **(B), RES-05 branch B.** A guess node counts only when some alternative is proved to fail; `info = Σ log2(c_i / kLow_i)`; when the census cannot finish inside `DEDUCE.census`, the rating is published as a decisive upper estimate (it lies between the true decisive value and the raw value) with `censusComplete: false` and the note "decisive estimate: n alternatives undecided within the work limit". This note is independent of the capped-path policy (SA2-Q-P02 (a)): an incomplete census is rateable, a capped path is not. Author's conditions, taken from SA2: MP05 builds it and MP06 reports hit rate, cost and the share of incomplete censuses per level and board before MP08 writes the formula; if more than a few per cent of accepted puzzles of a level carry an estimate, MP06 raises `DEDUCE.census` or reports to the owner. The fixed few / many penalty of RES-18 stays (branch C's penalty is not used).

### SA1-Q-P2: how are old (v2) ratings shown by the Player and the Generator (P2.5)?

Context: report section 4 "P2.5". See also SA2-Q-P08 (opposite recommendation).

- (a) As planned: re-rate v2 claims with v3 in a worker on load and show the v3 level with a "re-rated" note; the
  stored claim stays. Costs one rating per opened puzzle (milliseconds to about a second on 26x26); titles such
  as "Hard #3" may sit next to "Normal".
- (b) Show the stored claim with a small "older rating" note: no CPU cost, consistent with the title; levels of
  old links stay v2.
- (c) No change.

SA1 recommends (b).

**Answer (claude-fable-5-2, 2026-11-12):** (a), as both analysts now agree and as the plan says: re-rate for display with a note; the stored claim is untouched.

### SA1-Q-P3: how long may puzzle codes get with v3 claims (P2.4)?

Context: report section 4 "P2.4". Measured: a v3 claim written as JSON text makes a 10x6 code grow from 46 to
410-454 characters and a 20x18 code from 154 to 551-566. It still fits `MAX_CODE_SYMBOLS` (16,000) and QR
version 40. See also SA2-Q-P07.

- (a) As planned: JSON text with all metrics.
- (b) JSON text without metrics, in codes only (10x6: 46 → 170); packs keep the metrics; current Players still
  decode.
- (c) A compact v3 form as a new codec version (about today's size; a frozen copy of the final knobs; current
  Players cannot decode new codes; a Medium task after P3).
- (d) No rating in codes.

SA1 recommends (b) in P2, and (c) only if short codes matter.

**Answer (claude-fable-5-2, 2026-11-12):** (b). Summary claims in codes (`model`, `score`, `level`, `saturated`), full metrics in packs (at most 4,096 UTF-8 bytes and depth 8). Current Players still decode the codes. A compact v3 codec is a later, separate change if short codes matter.

### SA1-Q-P4: where does per-puzzle provenance live (P4.1)?

Context: report section 4 "P4". A new per-puzzle field `made` makes packs unreadable for every current version
(`core/engine/pack.js:200`: an unknown field is an error). See also SA2-Q-P10.

- (a) As planned: a new per-puzzle field `made` (a format change).
- (b) `generation.made`: a map from puzzle id to provenance inside the existing free-form `generation` object;
  no format change, older versions keep it untouched.

SA1 recommends (b).

**Answer (claude-fable-5-2, 2026-11-12):** (b). `generation.made`, a map from puzzle id to provenance inside the free-form `generation` object. My per-puzzle `made` field would have made packs unreadable for every current reader (`core/engine/pack.js:200`); withdrawn.

### SA1-Q-P5: placement-weighted clue sampling (P1 step 2)?

Context: report section 4 "P1": the plan's direction is reasoned the wrong way round. Same question as SA2-Q-P05.

- (a) Skip it; ship the centre-seeking acceptance only.
- (b) Implement with the corrected direction (above the band: clue pieces with many placements; below: few), kept
  only if the probe shows a better hit rate.
- (c) As written.

SA1 recommends (a); revisit in P3 if Hard / Expert hit rates drop.

**Answer (claude-fable-5-2, 2026-11-12):** (a). Skip it; same answer as SA2-Q-P05.

### SA1-Q-P6: sets with identical shapes (imported sets only)?

Context: report section 4 "P0.2b". Generated sets never contain twins (`core/engine/carve.js:707` refuses them);
imported sets may (`core/engine/pack.js:574` only warns). Grouping by shape key in R4 / R5 / R9 is ill-defined.
See also SA2-Q-P03 (opposite recommendation).

- (a) As planned: group by shape key in R4 / R5 / R9.
- (b) Per-piece rules; twins collapsed in the guess alternatives and in S (no fake guesses; solutions counted up to
  twin swaps; differs from the raw `certify` counts).
- (c) Per-piece rules only, raw counts like `certify`; such sets rate higher than they should (limitation
  documented).

SA1 recommends (c).

**Answer (claude-fable-5-2, 2026-11-12):** Owner decision (asked on the command line, 2026-11-12): **none of the branches. A piece set must not contain two pieces of the same shape, imported sets included; such a set is an error.** Consequences: (1) `core/engine/pack.js:569-574` turns its warning into an error (issue code such as `duplicate-shape`, with the two piece ids), and every other way in gets the same check: puzzle codes (`core/engine/puzzlecode.js` decode), the Generator import and the Player route; the message exists in English and Vietnamese. Shapes are compared with `canonicalKey` (`core/engine/geometry.js:126`), as `core/engine/carve.js:697-707` does for generated sets. (2) RES-09 is closed without a quotient: `shapeGroup` (RES-02) and task MP04b are dropped; guesses, alternatives and S are counted on labelled pieces, which is exact for every admissible set. (3) The engine functions (`rate`, `measureDeduction`, `selectClues`) stay total on direct inputs with twins and behave as branch A there; tests that build such sets on purpose (for example the 41 I-pentomino strip of `tests/clues.test.js:196-214`) keep working and are not a supported product input. (4) This is a format tightening: a pack or link with twins that opened with a warning before is now refused; document it in design section 5.3, the user guides and the release notes of this change. Put the check in the task that touches the pack reader for v3 (RES-21) and add tests for the pack, the code and both apps.

---

## Part C: new questions from the cross-review

### SA2-Q-P12: does R4 include cell-to-cell locked-column deductions?

Context: `docs/difficulty-v3/gpt-6-astra/2-review-of-claude-opus-5.5.md` sections 2.2 and 4.3. SA1 proposed
implementing R4 and R5 as one column-subset rule with "cell-to-cell included" (`docs/difficulty-v3/claude-opus-5.5/1-report.md`
section 5.1, R6). A cell-to-cell deduction (every live row that covers cell a also covers cell b, so rows covering b
but not a die) is not in the plan's catalogue and changes scores.

- (a) The plan's R4 (piece claims a cell) and R5 (cell claims a piece) only.
- (b) A general column-subset closure, cell-to-cell included, with the rule description, tests and calibration
  updated.

SA2 recommends (a) until (b) is explicitly approved; a generic kernel does not require enabling every pairing of
column types. SA1 agrees in its response.

**Answer (claude-fable-5-2, 2026-11-12):** (a). R4 (piece claims a cell) and R5 (cell claims a piece) only; no cell-to-cell pairing. A shared kernel is fine as an implementation detail.

### SA2-Q-P13: what feeds the rule bonus of the v3 score?

Context: `docs/difficulty-v3/gpt-6-astra/2-review-of-claude-opus-5.5.md` section 4.3. Plan P2.1 has `rule = tier 1
→ 0, tier 2 → 2, tier ≥ 3 → 4`, and plan P0.2b defines `tier` as 1..3, "or 4 when a guess was needed": it is
ambiguous whether a guess also earns the tier-3 bonus.

- (a) The hardest deduction tier actually used (1..3); guesses are scored only by the guess term.
- (b) The overall tier, so every puzzle with a guess also gets the bonus of 4.
- (c) A separately named first-guess bonus.

SA2 recommends (a); SA1 now agrees. This changes the thresholds for puzzles with several solutions and needs an
explicit answer.

**Answer (claude-fable-5-2, 2026-11-12):** (a). The rule bonus uses the hardest **deduction** tier actually used on the final path (1..3); guesses are scored by the guess term only. The plan's "tier 4 when a guess was needed" is a diagnostic label, not a score input; the wording was ambiguous.

### AUTH-P1: the provenance record (P4.1), for the plan author

Context: `docs/difficulty-v3/report-detailed.md` RES-27 (revised 09:45 after SA2's check JC08). Both analysts agree
on the location (`generation.made[puzzleId]`, no new per-puzzle field; the set origin in `generation.setOrigin`,
JR-P2) and on the content:

- typed provenance carried inside the candidate from its creation, with the immutable set origin;
- the skipped subsets defined by what actually executed (skipped `rateSubset` calls and repaired-result
  exclusions), all of which must be consumed on replay;
- explicit availability per stage; a puzzle from the completion pass shows stages 1-3 and 7 only;
- documented limitation: an older Generator may drop `generation.made` when it re-exports a pack.

**Correction:** an earlier version of this question said "each skip is a distinct excluded key", "at most 99" and
"no overflow state". That is wrong: two subsets can share a clue key on sets with repeated shapes, and a
`generation` object above 100,000 JSON nodes or 512 KiB makes the whole pack unreadable in every current reader. The
record must therefore be bounded, and the writer drops `generation.made` near that limit. Choose the skip encoding:

- (a) Integer lists capped at 64 subset ordinals and 16 repair ordinals, otherwise the marker `'overflow'`
  (readable; about 80 KB and 10,000 JSON nodes for 100 puzzles) (SA1 recommends).
- (b) Base64 little-endian bitsets (no overflow state; about 65 KB for 100 puzzles).

SA2 accepts either. Please confirm the record and pick the encoding.

**Answer (claude-fable-5-2, 2026-11-12):** Record confirmed as in RES-27 (`generation.made[puzzleId]`, typed `calibration` / `candidate` / `completion`, origin carried by the candidate, skips defined by execution, explicit stage availability, the writer drops `generation.made` near the 512 KiB limit, the older-Generator limitation documented). Encoding: **(a)**, integer lists capped at 64 subset and 16 repair ordinals, otherwise `'overflow'`. It is readable in a pack, trivially validated (strictly increasing integers within bounds) and skips are rare in practice; an overflow only hides stages 4-6 of that one puzzle.

### JR-P4: how are auxiliary worker requests scheduled (P2.5, P4.2)? (for the plan author)

Context: `docs/difficulty-v3/report-detailed.md` RES-29, raised by SA2's check JC10. Today `beginRequest` aborts every
earlier request as superseded (`core/browser/worker-pool.js:575-588`) and the Generator client's `cancel()` cancels the
whole pool (`core/browser/generation-client.js:1190-1194`), so a display re-rating (P2.5) or a replay (P4) submitted
the ordinary way would cancel a running generation.

- (a) An auxiliary method on the existing client and on the Player's pool wrapper: it waits while generation or
  verification is active, runs as an idle task, is cancelled by its own `AbortSignal` and aborted when a new
  generation or verification begins; no extra worker (SA1 recommends: no extra memory on phones, no second worker
  lifecycle).
- (b) A separate one-worker pool for auxiliary requests, with its own memory budget (a main and a scratch
  workspace, 160 and 32 MiB, `core/engine/policy.js:76-77`), creation, disposal and a no-worker fallback.

SA2 accepts either, provided the choice is made before task MP10.

**Answer (claude-fable-5-2, 2026-11-12):** **(a).** An auxiliary method on the existing client and on the Player's pool wrapper: it waits while a generation or verification is active, runs as an idle task, has its own `AbortSignal`, and is aborted when a new generation or verification begins. No second pool: a second worker with its own 160 + 32 MiB workspaces is not acceptable on phones. The choice is made before MP10, as SA2 asks.

### JR-P1: which old claims get the derived display rating (P2.5)? (for the plan author)

Context: `docs/difficulty-v3/report-detailed.md` RES-23. Both analysts agree that old claims are re-rated with v3
for display, with a note, and the stored claim stays untouched (SA2-Q-P08 / SA1-Q-P2). The plan names only
`difficulty-v2` claims.

- (a) Claims of `difficulty-v2` and `difficulty-v1` (SA1 recommends).
- (b) `difficulty-v2` only, as the plan says.
- (c) Also puzzles that carry no claim at all.

SA2 (`docs/difficulty-v3/gpt-6-astra/4-check-of-joint-report.md` section 4) prefers (b) as the plan's default and
calls (a) a reasonable explicit extension; (c) would be a separate new display branch.

**Answer (claude-fable-5-2, 2026-11-12):** **(a).** Claims of `difficulty-v2` and `difficulty-v1` are re-rated for display: both are older scales of the same quantity and the operation is identical, so showing a v1 level next to v3 levels would be the inconsistency the note is meant to remove. Puzzles without any claim are not rated by this change (branch (c) stays out).

### JR-P2: where does the immutable set origin live (P4.1)? (for the plan author)

Context: `docs/difficulty-v3/report-detailed.md` RES-27. A replay needs the set's origin (`setSeed`, `setLevel`,
`setAttempt`) as it was when the set was made, but the existing set keys of `generation` are re-stamped with the
current versions at every export (`generator/state.js:1300-1328`).

- (a) A new key `generation.setOrigin`, written once when the set is made and never re-stamped (SA1 recommends).
- (b) Reuse the existing set keys and stop re-stamping them.

**Answer (claude-fable-5-2, 2026-11-12):** (a). A new `generation.setOrigin`, written once when the set is made and never re-stamped.

### JR-P3: the knob ranges for the P3 fit (for the plan author)

Context: `docs/difficulty-v3/report-detailed.md` RES-18 and RES-25. The fit of `SCORE_V3` searches inside these
ranges (all invariants of the fixed decisions kept):

- `base.max` 8-12, `base.scale` 3-12, with `base.max + rule[3] ≤ 16` (a forced puzzle never reaches Hard);
- `weights.G` 0-8, `weights.info` 0.5-6;
- `0 ≤ penalty.few ≤ penalty.many ≤ 8`.

Confirm these ranges or set others. SA2 treats them as candidate experimental ranges that you approve before
production values are chosen.

**Answer (claude-fable-5-2, 2026-11-12):** (a), as experimental ranges for the fit: `base.max` 8-12 (start 12), `base.scale` 3-12, `rule[2] ≤ rule[3]` with `base.max + rule[3] ≤ 16`, `weights.G` 0-8, `weights.info` 0.5-6, `0 ≤ penalty.few ≤ penalty.many ≤ 8`. The invariants are hard; the ranges bound the search. MP08 writes the production values from the MP06 fit and records them with the evidence; MP12 locks them. A value outside a range needs a new answer.

### PROC-P1: when are the v3 knobs fitted?

Context: SA1's review section "D8" (`docs/difficulty-v3/claude-opus-5.5/2-review-of-gpt-6-astra.md`) and SA2's
task PV3-14 (`docs/difficulty-v3/gpt-6-astra/1-report.md` section 6.1).

- (a) Fit `SCORE_V3` from the P0.3 probe before activating v3 (P2), and lock it before P4; fixtures and recipes are
  recorded once (SA1).
- (b) Run the final calibration last, after P4 (SA2's first report).

Both analysts now agree on (a) plus a final regression run after P4.

**Answer (claude-fable-5-2, 2026-11-12):** (a), confirmed: first fit from the P0.3 probe before v3 is activated, lock before P4, a final regression run after P4. This also answers part D item 8.

---

## Part D: corrections to the plan found by the analysts (for confirmation)

These are not choices; they are places where the analysts found the plan wrong or incomplete. Mark any you
disagree with.

From SA2 (report section 0 and 5.1):

1. R9 (pair exclusion) is unsound as written: one piece can cover both cells (a domino and a square tetromino
   on a 3x2 board are a counterexample). R3 needs stronger placement preconditions; R7 must treat regional
   allocation as optional, not sum every eligible piece as mandatory.
2. The P2 metrics cannot rebuild the score: they lack the alternatives at each guess (or their `Σ log2 c_i`),
   `rules` and `tier`; `stop` would carry both the DLX and the deduction meaning.
3. The protocol warning of plan section 3 rule 6 is wrong: `core/engine/protocol.js:490-516` reads arbitrary
   bounded claim metrics and `824-861` passes worker result values through; new metric names need no protocol
   change (a new replay task kind does).
4. The calibration command `node tools/calibrate.mjs --profile landscape` lacks the mandatory `--output`, and
   the landscape runner does not save the packs P3 wants to re-rate (`tools/calibrate.mjs:121-123`,
   `tools/bench/runner.js:682-701`).
5. Old v2 recipes are not a monotone v3 corpus: the "G and Gt non-decreasing with level" test should become a
   fixed-puzzle characterisation plus independent generation tests.
6. The v2 puzzle-code goldens should stay as historical compatibility tests; add v3 cases instead of
   re-recording them.
7. `placementsPerPiece` is a workspace-backed view in canonical free-piece order; P1 must copy it before the
   next workspace build and must not mix it with layout order (`core/engine/tiling.js:24-34`,
   `core/engine/workspace.js:268-284`).

From SA1 (report sections 0 and 5.1):

8. The knobs are too steep for real data: after propagation and lookahead, guess nodes have 2-28 live
   alternatives, not 2 (SA1's prototype). With `a = 6, b = 4` and the agreed rule bonus the six 10x6 recipes rate
   5, 6, 9, 38, 66, 104 (re-measured 09:45; first reported as 5, 6, 7, 40, 68, 106). Fit the knobs from the P0.3
   probe before P2 re-records the fixtures, otherwise fixtures, recipes and tests are rewritten twice.
9. `saturated = stop === 'node-cap'` also fires when the cap is hit after the first solution (during the solution
   count); it should mean "cap hit before the first solution". A node cap with 2 ≤ S < cap is `few`.
10. The "place" half of R3 is unsound as written. R4 and R5 can share one column-subset kernel, but only the
    piece / cell pairings of the plan are enabled (no cell-to-cell deductions; agreed, SA2-Q-P12 (a)).
11. P0.1 exposes too little: the region and parity rules need `width`, `height` and the piece sizes; "`deduce.js`
    imports only `./policy.js`" contradicts the use of `geometry.js` `canonicalKey`.
12. P2 breaks more tests than it lists: `tests/clues.test.js` (v2 recipe scores, band targets, the nightmare /
    hell-1 "unreachable" test), `tests/fixtures/clue-recipes.js`, `tests/difficulty.test.js:56-66`,
    `tests/worker-pool.test.js:815`, `tests/generate.test.js:50`.
13. P1 should build the empty-board placement counts with `countPlacements(preparePlacements(...))`, not
    `buildModel`; `ALGO_ID` is bumped to `gen-v3` with P1.
14. G of a unique puzzle does not depend on the row order, only on the column tie rule: the "median of three
    tie-break orders" option of plan section 5 is needed only if the probe shows the column rule matters.

---

## Part D: author's response (claude-fable-5-2, 2026-11-12)

All fourteen corrections are accepted; none is disputed. Notes:

- Items 1 and 10: R9 and the "place" half of R3 were unsound as I wrote them; the sound forms of RES-06 and RES-07
  replace them. R7's optional allocation is accepted.
- Item 3: my rule 6 about the protocol was wrong; new metric names need no protocol change, the replay task kind does.
- Item 5: accepted; the old v2 recipes become a characterisation, monotonicity is tested on generated puzzles.
- Item 8: accepted; the knobs `a = 6, b = 4` were never fitted. See JR-P3 and PROC-P1.
- Item 9: with SA2-Q-P02 (a) a capped path is unrateable, so v3 never sets `saturated`; a cap during the count only
  changes `solutions`.
- Items 11 and 13: accepted (`deduce.js` needs the board dimensions and piece sizes; P1 uses
  `countPlacements(preparePlacements(...))`; `ALGO_ID` becomes `gen-v3` with P1). With the owner's decision on
  identical shapes, `deduce.js` no longer needs `canonicalKey`.

## Part E: decisions in one place

| Topic | Decision | By |
|---|---|---|
| Guess measure (SA1-Q-P1) | decisive guesses; an unfinished census publishes a labelled upper estimate (RES-05 branch B) | owner |
| Cap before the first solution (SA2-Q-P02) | unrateable, candidate skipped (RES-04 branch A); v3 has no "+" mark | owner |
| Identical shapes (SA2-Q-P03 / SA1-Q-P6) | forbidden everywhere, imported sets included: an error; RES-09's quotient and MP04b dropped | owner |
| Calibration freedoms (SA2-Q-P09) | knobs, caps, K60 and SHARES may change in P3, every change recorded (RES-25 branch A) | owner |
| Base formula, rule bonus (SA2-Q-P01, SA2-Q-P13) | base max 12, rule 0 / 2 / 4 by deduction tier | author |
| Clue search (SA2-Q-P04, P05) | real centre, central-half stop, reserve 16; uniform sampling | author |
| Codes and packs (SA2-Q-P07, SA1-Q-P3) | summary claims in codes, full metrics in packs | author |
| Old ratings (SA2-Q-P08, SA1-Q-P2, JR-P1) | v2 and v1 claims re-rated for display with a note; stored claim untouched | author |
| Provenance (SA2-Q-P10, SA1-Q-P4, AUTH-P1, JR-P2) | `generation.made` + `generation.setOrigin`; capped integer skip lists | author |
| Auxiliary requests (JR-P4) | a method on the existing client and pool; no second pool | author |
| Knob ranges, fit timing (JR-P3, PROC-P1) | the RES-18 ranges; fit before activation, lock before P4 | author |
| Everything marked "agreed" in the status table | confirmed as agreed | author |

No PENDING item of `docs/difficulty-v3/report-detailed.md` remains open: RES-04 → A; RES-05 → B; RES-09 → closed
by the new constraint; RES-18 ranges → accepted; RES-23 scope → v2 and v1; RES-25 → A; RES-27 → encoding a;
RES-29 → a.

---

## Part F: remaining concerns after the answers were applied (for acceptance)

Raised by the lead analyst while applying the answers to `docs/difficulty-v3/report-detailed.md` (section 8.2). None of
the answers is impossible or contradicts another; C1-C5 need a confirmation or a different choice. The report applies
option (a) of each. C6 is information only.

### C1: the estimate note is lost in puzzle codes (SA1-Q-P1 with SA1-Q-P3)

An unfinished census is published "with `censusComplete: false` and the note", but a code carries the summary claim
`{ model, score, level, saturated }` (RES-22), so a puzzle opened from a code shows the estimated score without the
note. The claim schema already has an optional `censored` boolean, accepted by current readers on non-v2 claims
(`core/engine/pack.js:57, 793-797, 829-833`; written by `ratingClaim`, 1199-1200).

- (a) Accept the gap (applied in the report).
- (b) Write `censored: true` on v3 claims, full and summary, when `censusComplete` is false (cross-field check:
  `censored` if and only if not `censusComplete`), so a code shows "decisive estimate" without n; about 1 hour in
  MP09 and MP10 (SA1 recommends).

**Answer (claude-fable-5-2, 2026-11-12):** Owner decision (asked on the command line, 2026-11-12): **(b).** Write `censored: true` on v3 claims, full and summary, exactly when `censusComplete` is false (cross-field check in the pack reader for full claims: `censored` if and only if not `censusComplete`; a summary claim carries the flag alone). A puzzle opened from a code then shows "decisive estimate" without the count n. Current readers accept the field on non-v2 claims, so no format break.

### C2: centre search wording (SA2-Q-P04)

The answer stops on "a final result (after any uniqueness repair)" in the central half and returns "the best final
result seen"; the joint draft stopped on a central raw rating whose repair stayed in band and ranked raw ratings. RES-15
now follows the answer (lazy best-first over final results; the same as the draft in `any` mode, more repairs possible
in `require` mode). The answer also calls the reserve of 16 "kept for repairs and their re-ratings", but repair ratings
are not search profiles (`core/engine/clues.js:239-241`); RES-15 keeps that accounting and bounds repairs by
memoisation (each in-band candidate is repaired at most once).

- (a) RES-15 as written (applied; SA1 recommends).
- (b) The draft's raw-rating rule.
- (c) Count repair ratings as profiles within the 64 (a budget change).

**Answer (claude-fable-5-2, 2026-11-12):** (a). RES-15 as written. My phrase "kept for repairs and their re-ratings" was inaccurate: repair ratings are not search profiles, and the 64-profile budget is unchanged; repairs are bounded by memoisation (each in-band candidate is repaired at most once). The reserve of 16 is simply the stop point at profile 48.

### C3: where the release notes go

The duplicate-shape refusal is to be documented "in the release notes of this change", but the repository has no
release-notes file (no `CHANGELOG`, `RELEASE` or `NEWS`; `README.md` has no such section).

- (a) A "Release notes" section of `docs/difficulty-v3/final-<date>.md`, written by MP17 (applied; SA1 recommends).
- (b) A new root `CHANGELOG.md`, a new living document written by MP09 and MP17.
- (c) Another place you name.

**Answer (claude-fable-5-2, 2026-11-12):** (a). A "Release notes" section in `docs/difficulty-v3/final-<date>.md`, written by MP17. No new root `CHANGELOG.md`. The user-visible change itself (sets with two pieces of the same shape are refused) is also stated in `USERGUIDE.md` and `USERGUIDE.vn.md`, as RES-34 already requires.

### C4: saved Generator sets with two pieces of the same shape

Such a set could be imported before (a warning only) and saved; after MP09 `readSavedSet` refuses it and the restore
drops it without a word (`generator/state.js:885-899`; callers 404-409, 1022-1027, 1048), as it does today for any
invalid saved set.

- (a) Accept the silent drop (applied).
- (b) MP09 shows a one-time notice in both languages that a saved set with two pieces of the same shape was removed
  (about 1 hour: a restore flag and a message) (SA1 recommends, so that no saved work disappears unexplained).

**Answer (claude-fable-5-2, 2026-11-12):** Owner decision (asked on the command line, 2026-11-12): **(b).** MP09 shows a one-time notice, in English and Vietnamese, that a saved piece set with two pieces of the same shape was removed. No saved work disappears without an explanation.

### C5: "a few per cent" of estimated ratings

The answer to SA1-Q-P1 says: "if more than a few per cent of accepted puzzles of a level carry an estimate, MP06 raises
`DEDUCE.census` or reports to the owner". MP06 needs a number for its acceptance; the report uses **5 %** (RES-05,
RES-10). Confirm or name the number.

**Answer (claude-fable-5-2, 2026-11-12):** Confirmed: 5 % of a level's accepted probe puzzles, per level and board cell of the MP06 corpus.

### C6: information only, tests and format parts retired by the duplicate-shape error

1. `tests/clues.test.js:196-214` keeps its twin input (answer point 3), but its `any` request targets hell-1, a level
   chosen for v2 scores; under decisive guesses a swap of twins is a free choice and adds nothing, so v3 may rate the
   strip lower; MP09 re-evaluates the target and keeps the `require` assertion (RES-24).
2. The frozen code format's repeated-shape grammar (`docs/design-detail.md:1867-1869`) can no longer occur in a valid
   code: the puzzle-code property test loses its twin coverage (`tests/puzzlecode.test.js:2174-2209`) and the round
   trips that used `repeatedShapes` are rebuilt (RES-34).
3. Three pack tests that pass twin sets through the reader are rebuilt (`tests/pack.test.js:683-706`).

No decision is needed unless you object.

**C6 (author):** no objection. The hell-1 target of the 41-strip test is re-evaluated in MP09 as described; the
repeated-shape grammar stays in the frozen code format and is simply unreachable through a valid set.

## Part G: one addition found in the author's review, and acceptance (claude-fable-5-2, 2026-11-12)

### AR1: a generated Hard-or-above puzzle needs one proved decisive guess

Owner decision (asked on the command line, 2026-11-12). RES-05 counts an undecided alternative of an unfinished
census as failing, so a puzzle can score Hard or above with no alternative actually proved to fail. That is fine for a
labelled display estimate, but it does not meet the fixed decision "Hard and above require at least one real choice"
for puzzles the Generator makes. Therefore:

- New metric `Gproved`: the number of final-path guess nodes with `f >= 1` (an alternative proved impossible). With
  a complete census `Gproved = G`; it can be smaller only when `censusComplete` is false. It is stored with the
  other census metrics (RES-19) and shown by the probe and the replay table; it is **not** a score input, and the
  formula of RES-18 is unchanged.
- `selectClues`: for a target of level index 3 (Hard) or higher, a rated candidate with `Gproved === 0` is not
  accepted, whatever its score. It costs its profile and is neutral for the count steering, exactly like an
  unrateable candidate (RES-04); with a recorder it emits an event that names the reason. Below Hard nothing changes.
- Imported puzzles and the derived display rating are not filtered: they show the estimate with its note (and the
  `censored` flag of C1).
- Tests: a unit test of `Gproved` on a census fixture with `u > 0`; a `selectClues` test where an estimated
  in-band Hard candidate with `Gproved = 0` is passed over and a later proved one is returned; the slow generation
  test of RES-26 asserts `Gproved >= 1` for every Hard-or-above puzzle (it replaces "no Hard-or-above puzzle has
  G = 0", which this implies). MP06 reports how many in-band candidates this rule rejects per level and board.
- Owner: MP05 (metric), MP07 or MP09 (the acceptance rule, in the task that makes `selectClues` use v3 ratings).

### Acceptance

I reviewed `docs/difficulty-v3/report-detailed.md` (RES-01 to RES-34, errata E01-E44, MP01-MP17, gates) and
`report-brief.md` at `2721a46` against my answers of parts A-E. Every answer is applied as given, including the
owner's four decisions (decisive guesses with a labelled estimate, the unrateable capped path, duplicate shapes
refused at every entry, calibration freedoms). With C1-C5 answered and AR1 added, **the plan author accepts the
report as the basis of the task pack**, on condition that C1 (b), C4 (b) and AR1 are written into the report or the
task pack before MP05 starts. The owner's acceptance is separate.

## Part H: owner decisions during implementation

Decisions the owner took while the task pack was being executed. Each entry names the evidence, the options
offered and the answer; the tasks that follow apply it.

| ID | Date | Question | Evidence | Options | Owner's answer | Applied by |
|---|---|---|---|---|---|---|
| P-OD1 | 2026-11-12 15:37 | `DEDUCE.census`: the 5 % rule of C5 is not met at 20, 40 or 80 million (at 80M, 10x10-master is still 3/50) | [probe record](probe-2026-11-12.md) sections 6 and 9 (MP06b, `3bd53bc`) | (a) keep 10,000,000 as the rule says and look again at the MP12 calibration; (b) 40,000,000; (c) 80,000,000 | **(a)**: `census` stays 10,000,000; MP12 re-examines it | MP06c onward; MP12a/MP12b |
| P-OD2 | 2026-11-12 15:37 | `DEDUCE.work` = 760,000,000 is above the 500,000,000 reporting threshold of RES-10 | same record, section 9 item 1 (median deduction 2.8 ms, p95 83 ms, maximum 986 ms; about 1.8 s for a full-cap rating, extrapolated) | (a) accept 760,000,000; (b) a lower cap (some large master puzzles become unrateable) | **(a)**: accepted | pinned in `core/engine/policy.js` by MP06b |
| P-OD3 | 2026-11-12 16:02 | The initial fit switches the few/many penalty off, (0, 0), inside the range `0 <= few <= many <= 8` but against the intent of SA1-Q-P1 ("the few/many penalty stays") | [fit record](fit-2026-11-12.md) sections 3 and 8 (MP06c, `7ddb259`) | (a) use the fitted knobs with penalty (0, 0) and look again at the penalty in the MP12 calibration on v3-generated puzzles; (b) the best set with a penalty, `12 / 4 / 4 / 4 / 5 / 0.5 / (1, 2)` (55.5 %, no hit in 18x20-hard); (c) other | **(a)**: MP08 writes the fitted knobs, penalty (0, 0); MP12 re-examines the penalty | MP08; MP12a/MP12b |
| P-OD4 | 2026-11-12 18:09 | D21: RES-15 when the central half is unreachable (Hell 3; MP07 held) | [D21 measurements](d21-measurements-2026-11-12.md); Part I below | (a) recipe quantity 3; (b) first in band when the centre is unreachable; (c) keep the recipe; (d) a measured early-stop rule | **(d)** as answered by the plan author in Part I: RES-15a stall stop, STALL_LIMIT = 12, raw ratings, in MP07 (owner: "kiểm tra và tiếp tục") | MP07; MP09c re-validates N on v3; MP12 reports Hell times |
| P-OD5 | 2026-11-12 19:09 | D36: Hell levels on large boards are unrateable under v3 (capped) | [d36-hell-probe.txt](claude-opus-5.5/d36-hell-probe.txt); Part I, D36 | (a) activate as specified, MP12 proposes; (b) engine investigation first; (c) raise the work cap; (d) reopen SA2-Q-P02 | **(a)**, as answered by the plan author in Part I with four MP09d2 precisions (owner: "fable", the plan author answers); the choice (i) stop offering, (ii) a different contract, (iii) a separate engine project is put to the owner at MP12 | MP09d2; MP12a/MP12b |
| P-OD6 | 2026-11-12 21:55 | D37: the Hell population of the full MP12 landscape (25 Hell cases, up to about 17 hours at 20 requests) | Part I, D37 (SA1, from cross-review TP08) | (a) 20 requests for every Hell case; (b) a 3-request prescreen, 20 only where a puzzle is made; (c) (b) plus 20 requests for the boundary case of each Hell level | **(c)** | MP12b1; MP12b2 (the owner question (i)/(ii)/(iii) states its evidence) |
| P-OD7 | 2026-11-13 14:35 | C4 (P-OD1 revisited at MP12a): census estimates above 5 % in five slice cells with `census` 10,000,000 (round 1: 6x10-master 33 %, 10x10-master 17 %, 12x12-master 12.5 %, 18x20-expert 25.5 %, 18x20-master 67 %); at 80,000,000 four cells are at most 5 % on the probe corpus, 18x20-master stays at 12-14 %; cost of 80M: deduction median +10 ms, p95 +100 ms, maximum unchanged | [calibration slice](calibration-slice-2026-11-13.md) sections 4.1 and 6.2 (MP12a) | keep 10,000,000 (the D19 rule when 80M is not enough) and accept census estimates in those cells; raise to 80,000,000 and accept 18x20-master's remaining estimates; the plan author answers | **Raise `DEDUCE.census` to 80,000,000**; 18x20-master's remaining census estimates (about 12-14 %) are accepted. A `DEDUCE` change, verified by the next MP12a round | MP12a (round 2), then MP12b1/MP12b2 on the new value |
| P-OD8 | 2026-11-13 17:25 | C4 after P-OD7 (MP12a round 2, `census` 80,000,000): 10x10-master has 14 of 200 census estimates (7.0 %; 17.0 % at 10M; the bound of 5 % is 10 puzzles), outside the owner's 18x20-master exception; 18x20-master is 11.0 %, within it; the other sixteen cells are at most 2.5 %; the probe corpus of the same round has 10x10-master at 4 % (2 of 50); C1, C2, C3 and C5 pass; the three-round ceiling is used up; cost of 80M on the probe corpus: deduction median 49.2 against 45.1 ms, p95 361.9 against 238.6 ms | [calibration slice](calibration-slice-2026-11-13.md) sections 6.5, 6.7 and 7.2 (MP12a) | (a) accept 10x10-master's remaining estimates as well (the same kind of acceptance as 18x20-master) and close MP12a at 80,000,000; (b) a fourth round with a larger `census` (for example 160,000,000), outside the task's ceiling, at further deduction cost; (c) the plan author answers | **(a)**: 10x10-master's remaining census estimates (7.0 %) are accepted, the same kind of acceptance as 18x20-master; `census` stays 80,000,000 and MP12a closes (owner, 2026-11-13 17:44) | MP12a (close: GF-P2, GA-P2, final `npm test`), then MP12b1/MP12b2 |
| P-OD9 | 2026-11-13 (on the command line; recorded by the plan author in the answer to PR-P1, commit `55c0c61`, 19:07) | PR-P1, the review of the progress at the pause: decide D36 now, and lighten the stop and review rules of the remaining parts | [working-status.md](working-status.md); Part I, D36 and PR-P1 (the plan author's answer) | D36: (i) stop offering what v3 cannot make, (ii) a different contract, (iii) a separate engine project; stops and reviews: as in the Sudoku repository (its S-OD4) | **D36 (i)**: a Hell level is offered only on the board areas where MP12b1's 20-request run meets the completion criterion of the other levels, else `[Infinity, Infinity]`; MP12b1 keeps the 3-request prescreen of the 25 Hell cases and runs 20 requests only for a case whose prescreen made a puzzle (D37 (c)'s boundary case is dropped where the prescreen made nothing); MP12b3 is no longer conditional. **Stops**: a part stops for the owner only for a correctness failure or when it would have to change a recorded decision; a performance or availability finding is a named item with its numbers, in MP12b2's record or in MP17. **Reviews**: the analysts cross-review only MP12b2's lock, MP12b3 and MP15a1; the orchestrator checks the other parts | MP12b1, MP12b2, MP12b3, MP13a to MP17; check-list D36, D37, D38 |

Information given with these questions, no decision needed: in corpus B (uniqueness required, puzzles made by v2),
every 18x20 Hard, Expert and Master puzzle has `Gproved = 0` (20/20 each), and corpus A has 58-86 % at Hard; MP06c
and MP07 measure whether v3 generation reaches Hard on 18x20 under AR1. The DLX diagnostic raises the combined
rating time by 1.67 times on 18x20, below the "more than doubles" threshold of RES-19.

## Part I: open questions during implementation

Questions raised while the task pack is executed. The plan author answers in the **Answer** line; the owner decides
where the entry says so. The orchestrator applies the answer to the check-list and the tasks.

### D21: RES-15 when the central half of the band is unreachable (MP07, Hell 3)

**Raised.** 2026-11-12 16:37 by the orchestrator (check-list D21). MP07 is implemented and held, uncommitted, until this
is answered. The plan author asked for measurements first (2026-11-12 17:20); they are complete.

**Evidence.** [D21 measurements](d21-measurements-2026-11-12.md) (all 14 questions, Summary for Fable first) and the
raw data and scripts in [d21-2026-11-12/](d21-2026-11-12/). In short:

- Hell 3 on 22x22 (K = 73) has no candidate in the central half: the highest `difficulty-v2` score is 174, the central
  half starts at 180.25. MP07 uses all 48 ratings per puzzle only to move the result from 170 to 174.
- Cost: 243 s serial against 5.75 s before MP07 (42 times); the UI flow `square-22x22-hell-3` ends `N-PARTIAL` with 9 of
  10 puzzles (cut by `dispatchStopMs = 115000`).
- Only the Hell 3 cells exhaust the 48 ratings; every other measured cell needs at most 10.
- Simulated early stop ("at least one in-band candidate, all candidates on one side of the central half, N ratings in
  a row without a closer candidate"): over 2,106 calls, N = 4 misses a central result 42 times, N = 8 twice, N = 12
  never (it fires only in the two Hell 3 cells). At N = 8 no pinned fixture changes. In `require` mode the rule must
  use raw ratings, not repaired scores.
- Estimated cost: 35-55 code lines, 8-10 tests; in MP07 the gates take about 6-8 minutes; in MP09 N must be
  re-validated on v3 ratings.

**Options.**

| Option | Meaning |
|---|---|
| (a) | Keep RES-15 as is; reduce the `square-22x22-hell-3` recipe to quantity 3 (scores [174,174,174]); MP12 reports Hell times |
| (b) | Amend RES-15: when no clue count can reach the central half, stop at the first candidate in the band |
| (c) | Keep the recipe as is (rejected by the analysts: the test would depend on time) |
| (d) | Amend RES-15 with the measured early-stop rule (state N, raw ratings in `require` mode) in MP07 or MP09 |

**Answer (plan author, claude-fable-5-2, 2026-11-12): (d), in MP07, with N = 12 on raw ratings.** (a) is not taken:
it hides a 42-times slowdown and a partial batch (9 of 10) behind a smaller test, for a gain of 4 points that never
reaches the central half. (b) as worded needs a bound of the highest reachable score, which exists for v2
(`2 (K - 1) + 30`) but not for v3, so it would be rebuilt two tasks later. My earlier proposal of N = 8 is withdrawn:
the measurements show two misses at N = 8, both one rating late, because the count steering needs 9-10 ratings to
descend two clue counts.

**Amendment RES-15a (stall stop).** In `selectClues`, for a finite band only, checked after each subset profile and
after the central-result check of RES-15:

```text
STALL_LIMIT = 12                         // core/engine/clues.js constant, next to BEAM_WIDTH
stop when all three hold:
  (1) at least one rated candidate is in band;
  (2) every rated candidate, in band or not, lies on the same side of the central half
      (all scores < centre - window, or all scores > centre + window);
  (3) the last STALL_LIMIT rated profiles gave no in-band candidate strictly nearer to the centre
      than the best in-band candidate before them.
on stop: r = chooseBest(); if r !== null: return r; otherwise continue the search as before.
```

- **Raw ratings only.** Conditions (1) to (3) read the raw subset ratings in every mode; repaired scores never enter
  them (the measurements show a rule on repaired scores misses a central final result 13 times in 191 `require`
  calls, and that the raw rule does not fire there). The result of a stop is still the final result of
  `chooseBest()`, so `require` mode keeps its repair and band check.
- **Counting.** A profile that is skipped, unrateable (RES-04) or rejected by AR1 is not a rated candidate: it does
  not count toward (2) and neither advances nor resets the stall counter. The counter starts at the first in-band
  candidate and resets whenever a strictly nearer in-band candidate is rated. Ties do not reset it.
- **Unchanged:** the central-half stop, the stop at profile 48 (`reserve = 16`), the 64-profile budget, the count
  steering, the beam, `ranked()`, unbounded bands (the rule never applies), determinism (no new RNG draw).
- **Identity.** MP07 is not committed, so the rule is part of `gen-v3`; no further algorithm id.

**Evidence this rests on** (`d21-measurements-2026-11-12.md`, Q8-Q10, Q13): over 2,106 finite-band calls N = 12 fires
15 times, all in the two Hell 3 cells, and misses no central result; at N = 8 and N = 12 no pinned vector or fixture
changes (`generation-case.json`, `generated-sample-pack.json`, `default-10x6-normal`, `heart-n10-master` stay
byte-identical). All sequences are `difficulty-v2`, one seed per cell: the margin of N = 12 is what these data show,
not a proof.

**What MP07 does now.**

1. Implement RES-15a with the tests the developer listed (fires after 12 non-improving one-sided ratings; does not
   fire with a central candidate seen, with candidates on both sides, or at 11; returns the best by `ranked()`;
   `require` mode uses raw ratings; an unbounded band never fires; the two N = 8 miss cases of Q10 as regressions that
   must still return 126 and 48).
2. Keep `square-22x22-hell-3` at quantity 10 and pin its scores from the run (the simulation predicts 172 for all
   ten, at ratings 17-22); it must finish with 10 of 10 puzzles and no `N-PARTIAL`. If it does not, stop and report.
3. Design §6.10 states the rule and the constant; the D21 measurement record stays as written.
4. Re-run GF-P1 (expected: identical fixtures) and GA-P1.

**Later tasks.** MP09c (the task that edits the same `afterProfile` for v3 ratings) re-runs the D21 simulation on
v3 rating sequences for N = 8, 12 and 16 on the same cells and populations: if N = 12 misses a central result there,
it raises `STALL_LIMIT` to the smallest tested value with no miss and records it; lowering it below 12 needs a new
answer. MP12 reports, per Hell cell, the ratings per puzzle and the generation time under v3.

**Residual cost, for the owner to know.** With the rule, Hell 3 on 22x22 needs about 19 ratings per puzzle instead
of 1 before MP07: about 94 s of rating time for ten puzzles in a serial run against 5.75 s (the simulation's figure;
roughly a minute in the two-worker flow, not measured), and returns 172 instead of 170. That is the price of
looking for the centre where it cannot be reached under v2; it applies to the cells of the measurement's reach
table only (22x22, 32x15 and 24x24 Hell 3; 15x20 and 18x18 Hell 2, for some piece counts), and it is measured again
under v3 in MP09c and MP12. If the owner prefers the old speed on those cells, the alternative is option (b) with the
v2 bound, valid only until MP09 replaces the rating.

**Orchestrator note (2026-11-12 18:30):** the owner confirmed (d) (decision P-OD4 in Part H). One placement is corrected after cross-review SP03 (SA2): MP09c cannot run the v3 re-validation, because no v3 rater exists before MP09d1 (`measureV3`) and MP09d2 (`rate` and `MODEL` switch). The re-validation for N = 8, 12 and 16 therefore belongs to MP09d2, after the switch and before GF-P2, with the same rule (only a raise of `STALL_LIMIT`; below 12 needs a new answer). MP09c still makes unrateable and AR1-rejected profiles neutral for the stall counter. MP07 is committed with RES-15a: the Hell 3 flow completes 10 of 10 at score 172 in about 56 s, and `npm test` takes 66 s.

### D36: Hell levels on large boards are unrateable under v3 (MP09d2, MP12)

**Raised.** 2026-11-12 by SA1 while moving the D21 re-validation into MP09d2 (it needs v3 sequences of the Hell cells).
Open. MP09d2 is the first task it affects; the answer is needed before MP09d2's GA-P2.

**Evidence.** [d36-hell-probe.txt](claude-opus-5.5/d36-hell-probe.txt), produced by
[d36-hell-probe.mjs](claude-opus-5.5/d36-hell-probe.mjs) at HEAD `05fa958` (read only). The sets are those the D21
flow builds (set attempt 0, seed `t18-big-a`); each line rates random clue subsets of the set's witness with
`measureDeduction`:

- Pinned `DEDUCE` (work 760,000,000, nodes 30,000): 26 of 27 ratings are capped (`work-cap`, 1.6-2.5 s each): 12 on
  the 22x22 Hell 3 set (K = 73) with 0 to 8 clues, and 3 on each of 22x22 Hell 1 (K = 39), 22x22 Hell 2 (K = 54),
  15x20 Hell 2 (K = 50), 18x18 Hell 2 (K = 51) and 24x24 Hell 3 (K = 77), at the calibration clue count and at 2 and
  6 more clues. The one complete rating (22x22 Hell 1 with 10 clues) scores 65, Nightmare. The controls (20x18 and
  12x12 Master sets) complete in 2-50 ms.
- Ten times the work cap (7,600,000,000, nodes 300,000): 3 of 3 still capped, 32-46 s each.
- `lookaheadWidth: 0`: 3 of 3 capped, about 2 s each.
- At the cap the search has made only 289 to 6,707 nodes: about 0.1 to 2.6 million units of work per node on these
  boards. Under v2 these calibrations reached Hell with scores up to 2 (K - 1) + 30, the value at the DLX branch cap
  (D21 record). RES-04 withdrew "saturation is acceptable at hell levels"; the report's risk table (row "Unrateable
  (capped) candidates make hell levels on large boards hard to generate", medium-high) says the owner is told with
  numbers.

**Consequences if nothing changes.** After MP09c a calibration whose subsets are all unrateable spends 20 profiles
(about 40-50 s here) and ends `not-in-band`, so these set requests fail after up to 32 attempts (in the two-worker UI
flow at `dispatchStopMs`, 115 s, with no puzzle). In MP09d2 the UI-flow recipe `square-22x22-hell-3` (D21: must
complete 10 of 10) and MP07's slow test "15 x 20 Hell 2 calibration" fail, and the D21-V3 capture gets no v3
sequence from the Hell cells, the only cells where the stall stop fired under v2. In MP12 the landscape's Hell cases
on large boards give no puzzles. The offered levels (`offeredLevels`, the `areas` of `levels.js`) do not change, so
the Generator still offers these levels.

**Options.**

| Option | Meaning |
|---|---|
| (a) | Activate v3 as specified. MP09d2 records the Hell failures and replaces the recipe `square-22x22-hell-3` and the 15 x 20 Hell 2 slow test by the highest level the same board completes under v3 (from the D21-V3 captures; quantity unchanged). MP12 measures availability per board and level and puts to the owner whether levels that cannot be made stop being offered (a separate, later change) |
| (b) | Before MP09d2, a bounded engine investigation (a new task) of the first-solution search on these inputs: where the work goes, and a guess order or setup change that keeps the rule semantics. Any change moves the MP02a-MP05 pins, MP06's corpus and MP06c's fit, which are re-run |
| (c) | Raise `DEDUCE.work` (P-OD2 reopened): ten times the cap is not enough and costs 30-45 s per rating |
| (d) | Reopen SA2-Q-P02 for generation (rate a capped candidate another way): contradicts the owner's "never solved by an estimate" |

**Recommendation (SA1).** (a), so that the activation is not held; (b) only if the owner wants Hell levels on large
boards under v3, as a task of its own after MP09d2 with its own fit re-run. Under (a) the Generator offers levels it
cannot make until MP12's proposal is decided: the owner should know this before MP09d2.

**Answer (plan author, claude-fable-5-2, 2026-11-12): (a) now. (c) and (d) are rejected; (b) is not done inside
this plan.** The owner is told below what this means for the Hell levels, because the MP12 proposal will be an
owner decision and it is larger than "some cells are slow".

**Reading of the evidence.** I checked `d36-hell-probe.txt`. The result is not a tuning problem:

- Ten times the work cap changes nothing (3 of 3 still capped at 32-46 s), and switching the lookahead off changes
  nothing. So neither (c) nor a cheaper ladder inside (b) is likely to help by the factor that would be needed.
- The one rating that completes shows why: 22x22 Hell 1 with 10 clues (29 pieces to place) has G = 8,
  `Gproved` = 5 and scores 65, which is Nightmare. A Hell 1 score (77 or more) needs more decisive guesses on more
  free pieces than that, and each added guess with many alternatives multiplies the search. A puzzle that scores in
  a Hell band is, by the model's own definition, close to or beyond what a bounded search can finish.
- Under v2 these puzzles were not solved either: every Hell 3 rating of the D21 record is saturated at the DLX
  branch cap, and the score is `2 (K - 1) + 30`, a function of the clue count alone. The v2 Hell levels on these
  boards were "the solver gave up", published with a "+". The owner's decision on SA2-Q-P02 (a capped path is
  unrateable, never an estimate) removes exactly that label, so losing these levels is the direct consequence of
  that decision, not a defect of the deduction solver. (d) would undo the decision and is not chosen here.

**What MP09d2 does (option (a), with these precisions).**

1. Activate v3 as specified. Record every Hell failure of the recipes and slow tests with its outcome
   (profiles spent, all `path-capped`, time).
2. Replace the UI-flow recipe `square-22x22-hell-3` and the "15 x 20 Hell 2 calibration" slow test by the highest
   level the same board completes under v3 with 10 of 10 puzzles (quantity unchanged), found from the D21-V3
   captures; the D21 requirement "10 of 10, no `N-PARTIAL`" moves to that recipe. Keep one small test that pins the
   present behaviour of an unrateable calibration (ends `not-in-band` after its profiles, no puzzle, no crash), so
   the failure mode stays visible instead of disappearing from the suite.
3. D21-V3 (the stall-stop re-validation of RES-15a): run it on whatever cells complete under v3. If the stall stop
   fires in none of them, `STALL_LIMIT` stays 12, the record says "inert on the v3 corpus", and the rule is
   re-examined by MP12 with the landscape data. No Hell sequence is fabricated from v2 ratings.
4. Add to MP09d2's record one availability probe that costs minutes, not hours: for Hell 1, Hell 2 and Hell 3, the
   smallest board each level is offered on (`AREAS` in `core/engine/levels.js:22-34`: 164, 266 and 450 cells) and
   one mid-size board, 3 set attempts each, reporting rated / capped profiles and the best score seen. This tells
   the owner before MP12 whether Hell is unreachable only on large boards or everywhere.

**What MP12 puts to the owner (with the landscape numbers).** For every (board area, level) that v3 cannot make:

- (i) stop offering it: raise or close the level's `areas` interval so the Generator no longer shows a level it
  cannot produce (a change of `levels.js`, design §7.5, both user guides; packs and links made earlier still open
  and are re-rated for display as decided); or
- (ii) keep the level for those areas under an explicitly different contract, for example "beyond the measured
  range: the search budget was exhausted", shown as such and never as a score. This reopens SA2-Q-P02 for Hell
  levels only and needs the owner's explicit decision; it is not implied by anything in this plan; or
- (iii) a separate engine project (option (b)): a faster first-solution search for boards with 30 or more free
  pieces, with its own corpus, fit and qualification. Not part of difficulty-v3.

MP12 also proposes a fail-fast for unrateable requests, so that a set request whose calibrations are all capped
ends in seconds with a clear notice instead of at `dispatchStopMs` (115 s); the mechanism is specified then, with
the measured numbers, not improvised in MP09d2.

**Interim.** Between MP09d2 and the MP12 decision the branch `rating-v3` offers Hell levels it cannot make on these
boards and a request for one ends after up to 115 s with no puzzle. Nothing is pushed or deployed from this branch
before MP12 and MP17, so no user sees that state; if the branch were to be published earlier, (i) must be decided
first.

**For the owner, now.** Under the decisions already taken, v3 will most likely not be able to generate Hell 1 to
Hell 3 on the large boards where v2 offered them, and possibly not anywhere; step 4 above measures which. This
follows from "a capped search gives no rating". The choice between (i), (ii) and (iii) is yours at MP12; the
plan author's recommendation at this point is (i), with (iii) as later work if Hell levels matter, because (ii)
reintroduces a label the rating cannot back.

**Owner decision (P-OD9, 2026-11-13): (i).** Taken on the command line and recorded by the plan author in the answer
to PR-P1 (the end of this part). Options (ii) and (iii) are not chosen; (iii), a faster first-solution search for
large boards, stays possible later work outside difficulty-v3. What follows: MP12b1 keeps the 3-request prescreen of
the 25 Hell cases and runs 20 requests only for a Hell case whose prescreen made a puzzle (D37 below); MP12b2 asks no
D36 question, still presents the fail-fast table (the plan author recommends F1 + F2, built in MP12b3) and reports
population R; MP12b3, no longer conditional, changes the `AREAS` of `core/engine/levels.js` so that a Hell level is
offered only on the board areas where MP12b1's 20-request run meets the same completion criterion as the other
levels, and a Hell level that meets it nowhere gets `[Infinity, Infinity]`; design §7.5, both user guides and the
Generator's level list follow; packs and links made earlier still open and are re-rated for display. Check-list D36.

### D37: the Hell population of the full MP12 landscape (MP12b1)

**Raised.** 2026-11-12 by SA1, from SA2's cross-review TP08 (`gpt-6-astra/6-review-of-task-pack.md`, third pass).
Open. MP12b1 is the first task it affects; the answer is needed before MP12b1's Hell runs, which come after its 80
other cases (several hours after dispatch).

**Question.** Gate GL-P3 measures every landscape case with 20 requests (RES-25, "kept even where availability is
poor"). 25 of the 105 cases are Hell cases: Hell 1 on 14x14, 15x15b10, 16x16, 15x20, 18x18, 18x20, 20x20, 20x21,
32x15, 22x22, 24x24 and 26x26; Hell 2 on the nine boards from 15x20 to 26x26; Hell 3 on 32x15, 22x22, 24x24 and
26x26. By D36 most of them are expected to make no puzzle, and a request that makes none runs to the dispatch limit,
about 2 minutes. 20 requests then cost about 40 minutes per case, up to about 17 hours for the 25 cases, in announced
batches of at most an hour on the machine the Sudoku work shares. 3 requests cost about 6 minutes per case, 2.5 hours
in all. Three requests without a puzzle do not show that a cell cannot be made: a cell that succeeds once in five
requests shows no puzzle in three requests about half the time (0.8^3 = 0.51), in twenty about once in a hundred
(0.8^20 = 0.012). D36's precision 4 (MP09d2's three-attempt availability probe) was a probe, not this population.

**Options.**

| Option | Meaning |
|---|---|
| (a) | 20 requests for every Hell case, as GL-P3 says: up to about 17 more hours of machine time |
| (b) | A waiver for Hell cases: 3 requests each (a prescreen); a case with a puzzle is run with 20; a case without stays at 3 and is reported as "no puzzle observed in 3 requests", never as "cannot be made"; MP12b2's question (i)/(ii)/(iii) and the lock record say on what evidence they rest |
| (c) | (b), plus 20 requests for the boundary case of each Hell level: the smallest board of the level whose prescreen made no puzzle (at most 3 cases, about 2 more hours); the larger boards of the level stay at 3 requests, and the record says that their result is read from the boundary case and their own 3 requests |

**Recommendation (SA1).** (c). The owner's choice (i) ("stop offering") moves the lower end of a level's `areas`
interval, so the evidence must be strongest at that end. On larger boards the same level places more pieces, and
D36 found every profile capped there; 3 requests plus a 20-request boundary case decide those cells about as well as
20 requests would, at a fraction of the machine time. MP12b1 runs the 25 prescreens first in any case and waits for
the answer before any further Hell run.

**Answer (owner, 2026-11-12 21:55): (c).** Every Hell case gets the 3-request prescreen; a case that makes a puzzle is run with 20 requests; the boundary case of each Hell level (the smallest board of the level whose prescreen made no puzzle) is run with 20 requests; the other cases stay at 3 and are reported as "no puzzle observed in 3 requests", never as "cannot be made". Owner decision P-OD6 in Part H.

**Changed by P-OD9 (owner, 2026-11-13).** The 20-request run of the boundary case of each Hell level is dropped where
the prescreen made nothing: a Hell case that makes no puzzle in three requests is not offered and needs no further
evidence (the plan author's answer to PR-P1). Every Hell case keeps its 3-request prescreen, and a case whose
prescreen made a puzzle is run with 20 requests. Check-list D37.

### PR-P1: review of the progress at the pause

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
